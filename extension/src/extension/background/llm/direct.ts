import type { ToolCall, ToolSpec } from '../../../shared/tools';
import type { LlmMessage, LlmProvider, LlmResponse } from './types';

export interface DirectLlmConfig {
  provider: 'groq' | 'gemini' | 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

const defaultGroqModel =
  typeof process !== 'undefined' && process.env?.GROQ_MODEL ? process.env.GROQ_MODEL : 'openai/gpt-oss-120b';

export class DirectLlmProvider implements LlmProvider {
  id: string;
  name: string;
  private config: DirectLlmConfig;

  constructor(config: DirectLlmConfig) {
    this.config = config;
    this.id = config.provider;
    this.name = `${config.provider.toUpperCase()} (${config.model || (config.provider === 'groq' ? defaultGroqModel : 'default')})`;
  }

  private async discoverGroqModel(apiKey: string): Promise<string | null> {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const ids: string[] = (data.data || []).map((m: { id: string }) => m.id);
      const preferred = [
        'openai/gpt-oss-120b',
        'qwen/qwen3.8-27b',
        'llama-3.3-70b-versatile',
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'openai/gpt-oss-20b',
      ];
      for (const p of preferred) {
        if (ids.includes(p)) return p;
      }
      const candidate = ids.find(
        (id) => !id.includes('whisper') && !id.includes('guard') && !id.includes('orpheus')
      );
      return candidate || null;
    } catch {
      return null;
    }
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

    if (provider === 'groq') {
      url = baseUrl || 'https://api.groq.com/openai/v1/chat/completions';
      effectiveModel = model || defaultGroqModel;
    } else if (provider === 'gemini') {
      url =
        baseUrl ||
        `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
      effectiveModel = model || 'gemini-1.5-flash';
    } else if (provider === 'openai') {
      url = baseUrl || 'https://api.openai.com/v1/chat/completions';
      effectiveModel = model || 'gpt-4o-mini';
    } else if (!url) {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      effectiveModel = model || defaultGroqModel;
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
      // Auto-fallback if the specified model is not found or deprecated
      if (res.status === 404 && provider === 'groq' && errText.includes('model_not_found')) {
        const fallback = await this.discoverGroqModel(apiKey);
        if (fallback && fallback !== effectiveModel) {
          this.config.model = fallback;
          return this.generate({ ...req });
        }
      }
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
