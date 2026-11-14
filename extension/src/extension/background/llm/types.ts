import type { ToolCall, ToolSpec } from '../../../shared/tools';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface LlmResponse {
  content?: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}

export interface LlmProvider {
  id: string;
  name: string;
  generate(req: {
    systemPrompt: string;
    messages: LlmMessage[];
    tools: ToolSpec[];
    signal?: AbortSignal;
  }): Promise<LlmResponse>;
}
