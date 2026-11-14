import { isStepCount, streamText } from 'ai';
import { createEnvelope } from '../../../shared/envelope';
import type { ChatMessage, PingResponse } from '../../../shared/messages';
import { isLlmConfigured, loadAiConfig } from '../llm';
import { HeuristicLlmProvider } from '../llm/heuristic';
import { createChatModel } from '../llm/model';
import { describeProviderError } from './errors';
import { executeContentTool } from './executor';
import { toModelHistory } from './history';
import { SYSTEM_PROMPT } from './prompt';
import { type AgentSession, getOrCreateSession } from './session';
import type { AgentStreamListener } from './stream';
import { getAgentTools } from './tools';

type TurnResult = { conversationId: string; messages: ChatMessage[]; status: AgentSession['status'] };

const MAX_MODEL_STEPS = 6;

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
  externalSignal?: AbortSignal
): Promise<TurnResult> {
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

  const toolExecutor = (name: any, args: Record<string, unknown>) =>
    executeContentTool(tabId, session, name, args, assistantMsg, onEvent);

  const emitText = (text: string) => {
    assistantMsg.content += text;
    onEvent?.({ type: 'token', token: text });
  };

  // Offline / no key: deterministic provider.
  if (!isLlmConfigured(aiConfig)) {
    try {
      const heuristic = new HeuristicLlmProvider();
      const heuristicMessages: any[] = [{ role: 'user', content: userGoal }];

      for (let step = 0; step < 4; step++) {
        const resp = await heuristic.generate({
          systemPrompt: SYSTEM_PROMPT,
          messages: heuristicMessages,
          signal: session.abortController?.signal,
        });

        if (resp.toolCalls && resp.toolCalls.length > 0) {
          for (const tc of resp.toolCalls) {
            const toolRes = await toolExecutor(tc.name, tc.args);
            heuristicMessages.push({
              role: 'tool',
              name: tc.name,
              content: JSON.stringify(
                toolRes.ok
                  ? (toolRes as any).data || (toolRes as any).outcome || toolRes
                  : toolRes.error
              ),
            });
          }
        }

        if (resp.content && resp.content.trim().length > 0) {
          assistantMsg.activeVerb = 'Synthesizing answer...';
          onEvent?.({
            type: 'thought',
            rationale: 'Synthesizing response for user...',
            activeVerb: 'Synthesizing answer...',
          });
          emitText(resp.content.trim());
          break;
        }

        if (!resp.toolCalls || resp.toolCalls.length === 0) break;
      }

      assistantMsg.status = 'success';
      session.status = 'done';
    } catch (err) {
      session.status = 'error';
      assistantMsg.status = 'error';
      assistantMsg.content = `Error: ${err instanceof Error ? err.message : String(err)}`;
      onEvent?.({ type: 'error', error: assistantMsg.content });
    }
    return finish();
  }

  // LLM orchestration (Groq / OpenAI / Gemini via Chat Completions).
  let streamError: unknown;
  try {
    const tools = getAgentTools({
      tabId,
      session,
      activeAssistantMsg: assistantMsg,
      onEvent,
      execute: toolExecutor,
    });

    const result = streamText({
      model: createChatModel(aiConfig),
      system: SYSTEM_PROMPT,
      messages: [...history, { role: 'user', content: userGoal }],
      tools,
      stopWhen: isStepCount(MAX_MODEL_STEPS),
      maxRetries: 1,
      abortSignal: session.abortController?.signal,
    });

    // fullStream (not textStream): textStream silently drops provider errors.
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') emitText(part.text);
      else if (part.type === 'error') streamError = part.error;
    }
  } catch (err) {
    streamError = err;
  }

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
