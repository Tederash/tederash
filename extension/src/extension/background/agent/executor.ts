import { createEnvelope } from '../../../shared/envelope';
import type { ChatMessage, ToolCallItem } from '../../../shared/messages';
import type { ToolCall, ToolName, ToolResult } from '../../../shared/tools';
import { type ElementContext, type PolicyEvaluation, evaluatePolicy } from '../policy';
import { normalizeToolArgs } from './args';
import { type AgentSession, persistSessions } from './session';
import {
  type AgentStreamListener,
  formatStepRationale,
  formatStepSummary,
  getActiveVerb,
} from './stream';

export interface ConfirmationRequest {
  title: string;
  detail: string;
  risk: 'consequential' | 'destructive';
}

/** Asks the user; resolves true only on explicit approval. */
export type ConfirmFn = (req: ConfirmationRequest) => Promise<boolean>;

export interface ExecuteOptions {
  confirm?: ConfirmFn;
}

async function sendToTab(tabId: number, call: ToolCall): Promise<ToolResult> {
  try {
    // Top frame only: the content script runs in every frame, and the first frame to
    // answer would otherwise win.
    return (await chrome.tabs.sendMessage(tabId, createEnvelope('tool/exec', { call }), {
      frameId: 0,
    })) as ToolResult;
  } catch {
    return {
      ok: false,
      error: {
        code: 'TAB_UNREACHABLE',
        message: 'Could not communicate with the page. Reload the page and try again.',
      },
    };
  }
}

export async function executeContentTool(
  tabId: number,
  session: AgentSession,
  name: ToolName,
  rawArgs: Record<string, unknown>,
  activeAssistantMsg?: ChatMessage,
  onEvent?: AgentStreamListener,
  options: ExecuteOptions = {}
): Promise<ToolResult> {
  const args = normalizeToolArgs(rawArgs);
  const call: ToolCall = { name: name as any, args: args as any };
  const rationale = formatStepRationale(call);
  const activeVerb = getActiveVerb(name);

  const toolItem: ToolCallItem = {
    id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    step: (activeAssistantMsg?.toolCalls?.length || 0) + 1,
    tool: name,
    arguments: args,
    rationale,
    status: 'PENDING',
    timestamp: Date.now(),
  };

  if (activeAssistantMsg) {
    if (!activeAssistantMsg.toolCalls) activeAssistantMsg.toolCalls = [];
    activeAssistantMsg.toolCalls.push(toolItem);
    activeAssistantMsg.activeVerb = activeVerb;
  }

  onEvent?.({ type: 'tool_call', toolCall: toolItem });
  onEvent?.({ type: 'thought', rationale, activeVerb });

  const settle = (result: ToolResult, summary: string): ToolResult => {
    toolItem.status = result.ok ? 'SUCCESS' : 'ERROR';
    toolItem.summary = summary;
    onEvent?.({ type: 'tool_result', id: toolItem.id, tool: name, status: toolItem.status, summary });
    session.messages.push({
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'step',
      content: summary,
      timestamp: Date.now(),
      toolCall: call,
      toolResult: result.ok ? { ok: true } : { ok: false, error: { message: result.error.message } },
      status: result.ok ? 'success' : 'error',
    });
    // Checkpoint after every step so a restarted service worker keeps the transcript.
    void persistSessions();
    return result;
  };

  // Clicks are resolved first so the policy sees what would actually be clicked.
  let element: ElementContext | undefined;
  if (call.name === 'click' && typeof args.target === 'string') {
    const described = await sendToTab(tabId, { name: 'describe_target', args: { target: args.target } });
    if (!described.ok) return settle(described, described.error.message);
    element = described.data as ElementContext;
  }

  const policy: PolicyEvaluation = evaluatePolicy(call, element);
  if (!policy.allowed) {
    const reason = policy.reason || 'Restricted action';
    return settle({ ok: false, error: { code: 'POLICY_BLOCKED', message: reason } }, `Blocked: ${reason}`);
  }

  if (policy.requiresConfirmation) {
    const label = element?.text ?? 'this control';
    onEvent?.({ type: 'thought', rationale: `Waiting for you to confirm “${label}”.`, activeVerb: 'Waiting for confirmation...' });
    const approved = options.confirm
      ? await options.confirm({
          title: `Click “${label}”?`,
          detail: policy.reason ?? 'This action may not be reversible.',
          risk: policy.risk === 'destructive' ? 'destructive' : 'consequential',
        })
      : false;
    if (!approved) {
      return settle(
        {
          ok: false,
          error: {
            code: 'DECLINED_BY_USER',
            message: `The user did not confirm clicking “${label}”, so nothing was clicked.`,
            hint: 'Tell the user it was not done; do not try again unless they ask.',
          },
        },
        `Not clicked: “${label}” needs your confirmation.`
      );
    }
  }

  const result = await sendToTab(tabId, call);
  return settle(result, formatStepSummary(call, result));
}
