import { createOpenAI } from '@ai-sdk/openai';
import { isStepCount, streamText } from 'ai';
import { createEnvelope } from '../../../shared/envelope';
import type { ChatMessage, PingResponse } from '../../../shared/messages';
import { getAiConfig } from '../llm';
import { HeuristicLlmProvider } from '../llm/heuristic';
import { executeContentTool } from './executor';
import { SYSTEM_PROMPT } from './prompt';
import { type AgentSession, getOrCreateSession } from './session';
import type { AgentStreamListener } from './stream';
import { getAgentTools } from './tools';

export async function runAgentTaskStream(
  tabId: number,
  userGoal: string,
  conversationId?: string,
  onEvent?: AgentStreamListener,
  externalSignal?: AbortSignal
): Promise<{ conversationId: string; messages: ChatMessage[]; status: AgentSession['status'] }> {
  const session = getOrCreateSession(tabId, conversationId);
  session.status = 'running';
  session.abortController = new AbortController();

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => {
      session.abortController?.abort();
      session.status = 'stopped';
    });
  }

  // Record user message
  session.messages.push({
    id: `usr_${Date.now()}`,
    role: 'user',
    content: userGoal,
    timestamp: Date.now(),
  });
  onEvent?.({ type: 'start', conversationId: session.id });

  // Pre-flight check: verify tab reachability and Tederash runtime support
  let isTabReachable = false;
  let isTederashSupported = false;
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.sendMessage) {
      let ping: PingResponse | undefined;
      try {
        ping = (await chrome.tabs.sendMessage(
          tabId,
          createEnvelope('content/ping', {})
        )) as PingResponse;
      } catch {
        if (typeof chrome.scripting?.executeScript === 'function') {
          try {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ['content.js'],
            });
            ping = (await chrome.tabs.sendMessage(
              tabId,
              createEnvelope('content/ping', {})
            )) as PingResponse;
          } catch {
            // Cannot inject content script
          }
        }
      }

      if (ping?.ok && ping.runtime === 'content') {
        isTabReachable = true;
        isTederashSupported = Boolean(ping.isTederash);
      }
    }
  } catch {
    isTabReachable = false;
  }

  if (!isTabReachable || !isTederashSupported) {
    session.status = 'done';
    const errContent = !isTabReachable
      ? '⚠️ **Cannot communicate with this tab.**\n\n- Extensions cannot interact with internal browser pages like `chrome://extensions` or the Chrome Web Store.\n- If you are on a normal website, please **refresh the page (F5)** to allow the assistant to connect.'
      : '⚠️ **Tederash Runtime Not Detected.**\n\nThe Tederash Assistant only operates on web applications built using the **Tederash Component Library** (`@tederash/components`).\n\nPlease navigate to a web application that implements Tederash to use the assistant.';

    const asstMsg: ChatMessage = {
      id: `asst_${Date.now()}`,
      role: 'assistant',
      content: errContent,
      timestamp: Date.now(),
      status: 'error',
    };
    session.messages.push(asstMsg);
    onEvent?.({ type: 'error', error: errContent });
    onEvent?.({
      type: 'done',
      conversationId: session.id,
      messages: session.messages,
      status: session.status,
    });
    return {
      conversationId: session.id,
      messages: session.messages,
      status: session.status,
    };
  }

  const aiConfig = getAiConfig();
  const effectiveKey =
    aiConfig.apiKey ||
    (typeof process !== 'undefined' && process.env?.GROQ_API_KEY ? process.env.GROQ_API_KEY : '');

  // Assistant placeholder message for streaming
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

  // Heuristic provider fallback (when offline or no API key)
  if (aiConfig.provider === 'heuristic' || (!effectiveKey && aiConfig.provider !== 'custom')) {
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

          // Stream tokens smoothly
          const textToStream = resp.content.trim();
          const chunkSize = 16;
          for (let i = 0; i < textToStream.length; i += chunkSize) {
            if (session.abortController?.signal.aborted) break;
            const slice = textToStream.slice(i, i + chunkSize);
            assistantMsg.content += slice;
            onEvent?.({ type: 'token', token: slice });
            await new Promise((r) => setTimeout(r, 12));
          }
          break;
        }

        if (!resp.toolCalls || resp.toolCalls.length === 0) {
          break;
        }
      }

      assistantMsg.status = 'success';
      session.status = 'done';
    } catch (err) {
      session.status = 'error';
      assistantMsg.status = 'error';
      assistantMsg.content = `Error: ${err instanceof Error ? err.message : String(err)}`;
      onEvent?.({ type: 'error', error: assistantMsg.content });
    }

    onEvent?.({
      type: 'done',
      conversationId: session.id,
      messages: session.messages,
      status: session.status,
    });

    return {
      conversationId: session.id,
      messages: session.messages,
      status: session.status,
    };
  }

  // Vercel AI SDK Orchestration with Groq / OpenAI / Gemini
  try {
    const defaultGroqModel =
      typeof process !== 'undefined' && process.env?.GROQ_MODEL
        ? process.env.GROQ_MODEL
        : 'openai/gpt-oss-120b';

    const providerClient = createOpenAI({
      baseURL:
        aiConfig.baseUrl ||
        (aiConfig.provider === 'groq'
          ? 'https://api.groq.com/openai/v1'
          : aiConfig.provider === 'gemini'
            ? 'https://generativelanguage.googleapis.com/v1beta/openai'
            : 'https://api.openai.com/v1'),
      apiKey: effectiveKey,
    });

    const modelName = aiConfig.model || defaultGroqModel;
    const model = providerClient.chat(modelName);

    const tools = getAgentTools({
      tabId,
      session,
      activeAssistantMsg: assistantMsg,
      onEvent,
      execute: toolExecutor,
    });

    const stream = streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userGoal,
      tools,
      stopWhen: isStepCount(6),
      abortSignal: session.abortController?.signal,
    });

    assistantMsg.activeVerb = 'Cooking answer...';
    onEvent?.({
      type: 'thought',
      rationale: 'Synthesizing response for user...',
      activeVerb: 'Cooking answer...',
    });

    for await (const chunk of stream.textStream) {
      assistantMsg.content += chunk;
      onEvent?.({ type: 'token', token: chunk });
    }

    if (!assistantMsg.content.trim()) {
      const finishStep = assistantMsg.toolCalls?.find((tc) => tc.tool === 'finish');
      const summaryText = finishStep?.arguments?.summary;
      if (typeof summaryText === 'string' && summaryText.trim().length > 0) {
        assistantMsg.content = summaryText.trim();
      }
    }

    assistantMsg.status = 'success';
    session.status = 'done';
  } catch (err) {
    if (session.status === 'running') {
      session.status = 'error';
      assistantMsg.status = 'error';
      assistantMsg.content = `Encountered an issue: ${err instanceof Error ? err.message : String(err)}`;
      onEvent?.({ type: 'error', error: assistantMsg.content });
    }
  }

  onEvent?.({
    type: 'done',
    conversationId: session.id,
    messages: session.messages,
    status: session.status,
  });

  return {
    conversationId: session.id,
    messages: session.messages,
    status: session.status,
  };
}

export async function runAgentTask(
  tabId: number,
  userGoal: string,
  conversationId?: string
): Promise<{ conversationId: string; messages: ChatMessage[]; status: AgentSession['status'] }> {
  return runAgentTaskStream(tabId, userGoal, conversationId);
}
