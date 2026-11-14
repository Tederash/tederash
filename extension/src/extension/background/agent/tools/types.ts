import type { ChatMessage } from '../../../../shared/messages';
import type { ToolName, ToolResult } from '../../../../shared/tools';
import type { AgentSession } from '../session';
import type { AgentStreamListener } from '../stream';

export type ToolExecutor = (
  name: ToolName,
  args: Record<string, unknown>
) => Promise<ToolResult>;

export interface ToolExecutionContext {
  tabId: number;
  session: AgentSession;
  activeAssistantMsg?: ChatMessage;
  onEvent?: AgentStreamListener;
  execute: ToolExecutor;
}
