import { createEnvelope } from '../../../shared/envelope';
import type { ChatMessage, ToolCallItem } from '../../../shared/messages';
import type { ToolCall, ToolName, ToolResult } from '../../../shared/tools';
import { evaluatePolicy } from '../policy';
import { normalizeToolArgs } from './args';
import type { AgentSession } from './session';
import {
  type AgentStreamListener,
  formatStepRationale,
  formatStepSummary,
  getActiveVerb,
} from './stream';

export async function executeContentTool(
  tabId: number,
  session: AgentSession,
  name: ToolName,
  rawArgs: Record<string, unknown>,
  activeAssistantMsg?: ChatMessage,
  onEvent?: AgentStreamListener
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

  const policy = evaluatePolicy(call);
  if (!policy.allowed) {
    const errorResult: ToolResult = {
      ok: false,
      error: { code: 'POLICY_VIOLATION', message: policy.reason || 'Restricted action' },
    };
    toolItem.status = 'ERROR';
    toolItem.summary = `Action blocked by policy: ${policy.reason || 'Restricted action'}`;
    onEvent?.({
      type: 'tool_result',
      id: toolItem.id,
      tool: name,
      status: 'ERROR',
      summary: toolItem.summary,
    });
    session.messages.push({
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'step',
      content: toolItem.summary,
      timestamp: Date.now(),
      toolCall: call,
      toolResult: errorResult,
      status: 'error',
    });
    return errorResult;
  }

  let result: ToolResult;
  try {
    const envelope = createEnvelope('tool/exec', { call });
    // Top frame only: the content script runs in every frame, and the first frame to
    // answer would otherwise win.
    result = (await chrome.tabs.sendMessage(tabId, envelope, { frameId: 0 })) as ToolResult;
  } catch (err) {
    result = {
      ok: false,
      error: {
        code: 'COMMUNICATION_ERROR',
        message: 'Could not communicate with tab. Make sure the page is loaded and allows extension scripts.',
      },
    };
  }

  toolItem.status = result.ok ? 'SUCCESS' : 'ERROR';
  toolItem.summary = formatStepSummary(call, result);
  onEvent?.({
    type: 'tool_result',
    id: toolItem.id,
    tool: name,
    status: toolItem.status,
    summary: toolItem.summary,
  });

  session.messages.push({
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    role: 'step',
    content: toolItem.summary,
    timestamp: Date.now(),
    toolCall: call,
    toolResult: result,
    status: result.ok ? 'success' : 'error',
  });

  return result;
}
