import { createEnvelope } from '../../../shared/envelope';
import type { AiConfig, ChatMessage, PingResponse } from '../../../shared/messages';
import type { PageState, ToolResult } from '../../../shared/tools';
import { FALLBACK_GROQ_MODEL, isLlmConfigured, loadAiConfig } from '../llm';
import { createChatModel, resolveModelId } from '../llm/model';
import { speakText } from '../speech/output';
import { transcribeAudio } from '../speech/transcribe';
import { storageService } from '../storage/service';
import { awaitVoiceReply } from './voice-reply';
import { describeProviderError } from './errors';
import { type LocalToolFn, executeContentTool } from './executor';
import { toModelHistory } from './history';
import { formatPageState } from './page-model';
import { buildSystemPrompt } from './prompt';
import { classifySavedDetail, formatSavedDetails } from './saved-details';
import { createRouterCallModel } from './router';
import { awaitConfirmation } from './confirm';
import { type ConfirmFn } from './executor';
import { type AgentSession, ensureSessionsLoaded, getOrCreateSession, persistSessions } from './session';
import type { AgentStreamListener } from './stream';
import { type CallModel, createStreamingCallModel, runModelLoop } from './loop';

type TurnResult = { conversationId: string; messages: ChatMessage[]; status: AgentSession['status'] };

export interface ChainLink {
  kind: 'model' | 'router';
  label: string;
  callModel: CallModel;
}

function buildModelChain(
  config: AiConfig,
  userGoal: string,
  pageState: PageState | undefined,
  deps: AgentDeps
): ChainLink[] {
  const router: ChainLink = {
    kind: 'router',
    label: 'offline mode',
    callModel: createRouterCallModel(userGoal, pageState),
  };
  if (deps.callModel) return [{ kind: 'model', label: 'the AI model', callModel: deps.callModel }, router];
  if (!isLlmConfigured(config)) return [router];
  const primaryId = resolveModelId(config);
  const chain: ChainLink[] = [
    { kind: 'model', label: primaryId, callModel: createStreamingCallModel(createChatModel(config)) },
  ];
  if (config.provider === 'groq' && primaryId !== FALLBACK_GROQ_MODEL) {
    chain.push({
      kind: 'model',
      label: 'a smaller model',
      callModel: createStreamingCallModel(createChatModel(config, FALLBACK_GROQ_MODEL)),
    });
  }
  chain.push(router);
  return chain;
}

/**
 * Tries each link in order. A step that failed before producing any output moves to
 * the next link (and stays there for the rest of the turn). Errors the user must fix
 * (bad key) still fall through to the offline router, which never fails.
 */
export function withFallback(
  chain: ChainLink[],
  onSwitch: (next: ChainLink, reason: string) => void
): CallModel {
  let index = 0;
  return async (req) => {
    for (;;) {
      const res = await chain[index]!.callModel(req);
      if (!res.error || res.text || res.toolCalls.length > 0 || index >= chain.length - 1) return res;
      const described = describeProviderError(res.error);
      if (req.abortSignal?.aborted || described.code === 'ABORTED') return res;
      // Another model with the same key cannot fix an auth error: go straight to offline mode.
      index = described.code === 'AUTH' ? chain.length - 1 : index + 1;
      onSwitch(chain[index]!, described.message);
    }
  };
}

export interface AgentDeps {
  /** Override the model step (tests, or alternative providers). */
  callModel?: CallModel;
  /** The user dictated this turn: answer aloud and ask follow-ups with `listen`. */
  isVoiceTurn?: boolean;
}

async function pingTab(tabId: number): Promise<PingResponse | undefined> {
  try {
    return (await chrome.tabs.sendMessage(tabId, createEnvelope('content/ping', {}), {
      frameId: 0,
    })) as PingResponse;
  } catch {
    return undefined;
  }
}

/** Pings the top frame, injecting the content script once if it is missing. */
async function preflight(tabId: number): Promise<{ reachable: boolean; isTederash: boolean }> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) {
    return { reachable: false, isTederash: false };
  }
  let ping = await pingTab(tabId);
  if (!ping && typeof chrome.scripting?.executeScript === 'function') {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
      ping = await pingTab(tabId);
    } catch {
      // Restricted page: cannot inject.
    }
  }
  const reachable = Boolean(ping?.ok && ping.runtime === 'content');
  return { reachable, isTederash: reachable && Boolean(ping?.isTederash) };
}

/** Reads the Page Model silently (no timeline step, no model tokens spent on a tool call). */
async function readPageState(tabId: number): Promise<PageState | undefined> {
  try {
    const res = (await chrome.tabs.sendMessage(
      tabId,
      createEnvelope('tool/exec', { call: { name: 'page_state', args: {} } }),
      { frameId: 0 }
    )) as ToolResult;
    return res?.ok ? (res.data as PageState) : undefined;
  } catch {
    return undefined;
  }
}

/** Speaks a line for the agent; a device with no voice is reported, never faked. */
async function speakForAgent(text: string, config: AiConfig): Promise<ToolResult> {
  const spoken = await speakText(text, undefined, { lang: config.speechLanguage });
  if (spoken.ok) return { ok: true, outcome: { ok: true, message: `Said: “${text}”` } };
  return {
    ok: false,
    error: {
      code: 'NO_SPEECH_ENGINE',
      message: spoken.error ?? 'This device cannot speak.',
      hint: 'Carry on in text; the user can still read your reply.',
    },
  };
}

/**
 * Asks the user out loud and waits for the spoken answer. The side panel records;
 * the audio is transcribed here with the configured key, or the panel sends text it
 * transcribed locally when there is no key.
 */
async function listenForAgent(
  args: { prompt: string; language?: string | null },
  config: AiConfig,
  onEvent: AgentStreamListener,
  signal?: AbortSignal
): Promise<ToolResult> {
  const language = args.language ?? config.speechLanguage;
  // Speak the question first so a user who is not reading the panel hears it.
  // Wait for the question to finish: opening the mic mid-sentence records the assistant itself.
  await speakText(args.prompt, undefined, { lang: language ?? undefined, wait: true });

  const id = `listen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  onEvent({
    type: 'listen_request',
    id,
    prompt: args.prompt,
    language: language ?? undefined,
    canUploadAudio: Boolean(config.apiKey),
  });

  const reply = await awaitVoiceReply(id, signal);

  if (reply.kind === 'cancelled') {
    return {
      ok: false,
      error: {
        code: 'NO_ANSWER',
        message:
          reply.reason === 'timeout'
            ? 'The user did not answer out loud.'
            : 'Listening was stopped.',
        hint: 'Ask them to type the answer instead.',
      },
    };
  }

  if (reply.kind === 'text') {
    return {
      ok: true,
      data: { text: reply.text, source: 'web-speech', language: reply.language },
      outcome: { ok: true, message: `The user said: “${reply.text}”` },
    };
  }

  const transcript = await transcribeAudio({
    audio: new Blob([reply.audio], { type: reply.mimeType }),
    config,
    language: reply.language ?? language ?? undefined,
    model: config.sttModel,
    signal,
  });

  if (!transcript.ok) {
    return {
      ok: false,
      error: {
        code: transcript.code,
        message: transcript.error,
        hint: 'Ask the user to type the answer instead.',
      },
    };
  }

  return {
    ok: true,
    data: { text: transcript.text, source: transcript.source, language },
    outcome: { ok: true, message: `The user said: “${transcript.text}”` },
  };
}

async function loadSavedDetails(): Promise<Record<string, string>> {
  try {
    return await storageService.getVault();
  } catch {
    // An unreadable vault must not stop the turn: the assistant just asks instead.
    return {};
  }
}

/**
 * Remembers the personal details the assistant just filled, so the next form does
 * not ask for them again. Only the identity fields the vault models are kept —
 * one-off answers (cover notes, per-application choices) are deliberately not.
 */
async function rememberFilledDetails(
  entries: Array<{ target: string; value: string }>,
  fields: PageState['fields']
): Promise<void> {
  if (entries.length === 0) return;
  const additions: Record<string, string> = {};

  for (const entry of entries) {
    const value = entry.value.trim();
    if (!value) continue;
    const target = entry.target.toLowerCase();
    const field = fields.find(
      (f) => f.handle.toLowerCase() === target || f.label.toLowerCase() === target
    );
    if (field?.sensitive) continue;
    const key = classifySavedDetail(field?.label ?? entry.target, field?.kind);
    if (key) additions[key] = value;
  }

  if (Object.keys(additions).length === 0) return;

  try {
    const current = await storageService.getVault();
    const changed = Object.fromEntries(
      Object.entries(additions).filter(([key, value]) => current[key] !== value)
    );
    if (Object.keys(changed).length) await storageService.mergeVaultEntries(changed);
  } catch {
    // Remembering is a convenience; a storage failure must not fail the turn.
  }
}

/** Short closing line built from what the steps did, used when the model wrote nothing. */
function fallbackAnswer(msg: ChatMessage): string {
  const steps = (msg.toolCalls ?? []).filter((tc) => tc.summary);
  if (steps.length === 0) return '';
  return `Here is what I did:\n\n${steps.map((s) => `- ${s.summary}`).join('\n')}`;
}

export async function runAgentTaskStream(
  tabId: number,
  userGoal: string,
  conversationId?: string,
  onEvent?: AgentStreamListener,
  externalSignal?: AbortSignal,
  deps: AgentDeps = {}
): Promise<TurnResult> {
  await ensureSessionsLoaded();
  const session = getOrCreateSession(tabId, conversationId);
  session.status = 'running';
  session.abortController = new AbortController();

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => {
      session.abortController?.abort();
      session.status = 'stopped';
    });
  }

  // History is everything before this turn.
  const history = toModelHistory(session.messages);

  session.messages.push({
    id: `usr_${Date.now()}`,
    role: 'user',
    content: userGoal,
    timestamp: Date.now(),
  });
  onEvent?.({ type: 'start', conversationId: session.id });

  const finish = (): TurnResult => {
    void persistSessions();
    onEvent?.({
      type: 'done',
      conversationId: session.id,
      messages: session.messages,
      status: session.status,
    });
    return { conversationId: session.id, messages: session.messages, status: session.status };
  };

  const { reachable, isTederash } = await preflight(tabId);
  if (!reachable || !isTederash) {
    session.status = 'done';
    const errContent = !reachable
      ? '⚠️ **Cannot communicate with this tab.**\n\n- Extensions cannot interact with internal browser pages like `chrome://extensions` or the Chrome Web Store.\n- If you are on a normal website, please **refresh the page (F5)** to allow the assistant to connect.'
      : '⚠️ **Tederash Runtime Not Detected.**\n\nThe Tederash Assistant only operates on web applications built using the **Tederash Component Library** (`@tederash/components`).\n\nPlease navigate to a web application that implements Tederash to use the assistant.';
    session.messages.push({
      id: `asst_${Date.now()}`,
      role: 'assistant',
      content: errContent,
      timestamp: Date.now(),
      status: 'error',
    });
    onEvent?.({ type: 'error', error: errContent });
    return finish();
  }

  const aiConfig = await loadAiConfig();

  const assistantMsg: ChatMessage = {
    id: `asst_${Date.now()}`,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    status: 'running',
    toolCalls: [],
    activeVerb: 'Analyzing request...',
  };
  session.messages.push(assistantMsg);

  onEvent?.({
    type: 'thought',
    rationale: 'Analyzing user request and identifying required actions...',
    activeVerb: 'Analyzing request...',
  });

  // Consequential actions pause the loop until the user answers in the side panel.
  const confirm: ConfirmFn = async (req) => {
    if (!onEvent) return false;
    const id = `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    onEvent({ type: 'confirm_request', id, ...req });
    return awaitConfirmation(id, session.abortController?.signal);
  };

  // Speaking and listening belong to the assistant, not the page, so they bypass the
  // content script while keeping the same timeline, policy and transcript handling.
  const runLocal: LocalToolFn = async (call) => {
    if (call.name === 'say') return speakForAgent(call.args.text, aiConfig);
    if (call.name === 'listen') {
      if (!onEvent) {
        return {
          ok: false,
          error: {
            code: 'NO_VOICE_CHANNEL',
            message: 'Voice is only available while the side panel is open. Ask in text instead.',
          },
        };
      }
      return listenForAgent(call.args, aiConfig, onEvent, session.abortController?.signal);
    }
    return undefined;
  };

  const toolExecutor = (name: any, args: Record<string, unknown>) =>
    executeContentTool(tabId, session, name, args, assistantMsg, onEvent, { confirm, runLocal });

  const emitText = (text: string) => {
    assistantMsg.content += text;
    onEvent?.({ type: 'token', token: text });
  };

  const pageState = await readPageState(tabId);
  session.pageState = pageState;

  // Saved details: only the names reach the model (see buildSystemPrompt); values are
  // substituted into {{saved:…}} placeholders inside the loop, on this device.
  const savedDetails = await loadSavedDetails();
  const filledThisTurn: Array<{ target: string; value: string }> = [];

  // Model chain: configured model → smaller Groq model → deterministic router (offline).
  const chain = buildModelChain(aiConfig, userGoal, pageState, deps);
  const callModel = withFallback(chain, (next, reason) => {
    const rationale =
      next.kind === 'router'
        ? `${reason} Using offline mode for this request.`
        : `${reason} Switching to ${next.label}.`;
    if (next.kind === 'router') emitText(`_${reason} Using offline mode._\n\n`);
    assistantMsg.activeVerb = 'Switching to a backup...';
    onEvent?.({ type: 'thought', rationale, activeVerb: 'Switching to a backup...' });
  });

  const loop = await runModelLoop({
    system: buildSystemPrompt({
      pageState: pageState ? formatPageState(pageState) : undefined,
      savedDetails: formatSavedDetails(savedDetails),
      isVoiceTurn: deps.isVoiceTurn,
    }),
    history,
    userGoal,
    callModel,
    voiceTurn: deps.isVoiceTurn === true,
    execTool: (name, args) => toolExecutor(name, args),
    onText: emitText,
    savedDetails,
    onFilled: (entries) => filledThisTurn.push(...entries),
    readPageState: async () => {
      const next = await readPageState(tabId);
      if (next) session.pageState = next;
      return next;
    },
    initialPageVersion: pageState?.pageVersion,
    signal: session.abortController?.signal,
  });
  const streamError = loop.error;

  // Awaited before the turn ends, so a detail is never lost to a worker shutdown.
  await rememberFilledDetails(filledThisTurn, session.pageState?.fields ?? []);

  if (session.abortController?.signal.aborted) {
    session.status = 'stopped';
    assistantMsg.status = 'error';
    return finish();
  }

  if (!assistantMsg.content.trim()) {
    const fallback = fallbackAnswer(assistantMsg);
    if (fallback) emitText(fallback);
  }

  if (streamError) {
    const described = describeProviderError(streamError);
    if (assistantMsg.content.trim()) {
      emitText(`\n\n_${described.message} The answer above may be incomplete._`);
      assistantMsg.status = 'success';
      session.status = 'done';
    } else {
      assistantMsg.content = described.message;
      assistantMsg.status = 'error';
      session.status = 'error';
      onEvent?.({ type: 'error', error: described.message });
    }
  } else if (!assistantMsg.content.trim()) {
    assistantMsg.content = 'I could not produce an answer for that. Please try rephrasing.';
    assistantMsg.status = 'error';
    session.status = 'error';
    onEvent?.({ type: 'error', error: assistantMsg.content });
  } else {
    assistantMsg.status = 'success';
    session.status = 'done';
  }

  return finish();
}

export async function runAgentTask(
  tabId: number,
  userGoal: string,
  conversationId?: string
): Promise<TurnResult> {
  return runAgentTaskStream(tabId, userGoal, conversationId);
}
