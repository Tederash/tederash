import { createEnvelope } from '../../../shared/envelope';
import type { AiConfig, ChatMessage, PingResponse } from '../../../shared/messages';
import type { PageState, ToolResult } from '../../../shared/tools';
import { FALLBACK_GROQ_MODEL, isLlmConfigured, loadAiConfig } from '../llm';
import { createChatModel, resolveModelId } from '../llm/model';
import { describeProviderError } from './errors';
import { executeContentTool } from './executor';
import { toModelHistory } from './history';
import { formatPageState } from './page-model';
import { buildSystemPrompt } from './prompt';
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

  const toolExecutor = (name: any, args: Record<string, unknown>) =>
    executeContentTool(tabId, session, name, args, assistantMsg, onEvent, { confirm });

  const emitText = (text: string) => {
    assistantMsg.content += text;
    onEvent?.({ type: 'token', token: text });
  };

  const pageState = await readPageState(tabId);
  session.pageState = pageState;

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
    system: buildSystemPrompt(pageState ? formatPageState(pageState) : undefined),
    history,
    userGoal,
    callModel,
    execTool: (name, args) => toolExecutor(name, args),
    onText: emitText,
    readPageState: async () => {
      const next = await readPageState(tabId);
      if (next) session.pageState = next;
      return next;
    },
    initialPageVersion: pageState?.pageVersion,
    signal: session.abortController?.signal,
  });
  const streamError = loop.error;

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
