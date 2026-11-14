import type { ToolCall, ToolSpec } from '../../../shared/tools';
import type { LlmMessage, LlmProvider, LlmResponse } from './types';

export interface DirectLlmConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class DirectLlmProvider implements LlmProvider {
  id: string;
  name: string;
  private config: DirectLlmConfig;

  constructor(config: DirectLlmConfig) {
    this.config = config;
    this.id = config.provider;
    this.name = `${config.provider.toUpperCase()} (${config.model || 'default'})`;
  }

  async generate(req: {
    systemPrompt: string;
    messages: LlmMessage[];
    tools: ToolSpec[];
    signal?: AbortSignal;
  }): Promise<LlmResponse> {
    const { provider, apiKey, baseUrl, model } = this.config;

    let url = baseUrl;
    let effectiveModel = model;

    if (provider === 'gemini') {
      url =
        baseUrl ||
        `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
      effectiveModel = model || 'gemini-1.5-flash';
    } else if (provider === 'openai') {
      url = baseUrl || 'https://api.openai.com/v1/chat/completions';
      effectiveModel = model || 'gpt-4o-mini';
    } else if (!url) {
      url = 'https://api.openai.com/v1/chat/completions';
      effectiveModel = model || 'gpt-4o-mini';
    }

    // Format tools for OpenAI function calling
    const formattedTools = req.tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    // Format messages
    const apiMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: req.systemPrompt },
    ];

    for (const m of req.messages) {
      if (m.role === 'tool') {
        apiMessages.push({
          role: 'tool',
          content: m.content,
          tool_call_id: m.toolCallId || 'call_0',
        });
      } else if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
        apiMessages.push({
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc, idx) => ({
            id: `call_${idx}`,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            },
          })),
        });
      } else {
        apiMessages.push({
          role: m.role,
          content: m.content,
        });
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages: apiMessages,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        temperature: 0.2,
      }),
      signal: req.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM provider error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    const toolCalls: ToolCall[] = [];
    if (msg?.tool_calls && Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        try {
          const fn = tc.function;
          const args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments;
          toolCalls.push({
            name: fn.name as any,
            args,
          });
        } catch {
          // Ignore unparseable tool call
        }
      }
    }

    return {
      content: msg?.content || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: choice?.finish_reason,
    };
  }
}
