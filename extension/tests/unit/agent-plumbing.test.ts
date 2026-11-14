import { beforeEach, describe, expect, it, vi } from 'vitest';

// streamText is replaced so tests can script what the "model" streams back.
const streamTextMock = vi.fn();
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return { ...actual, streamText: (opts: unknown) => streamTextMock(opts) };
});

import { normalizeToolArgs } from '../../src/extension/background/agent/args';
import { describeProviderError } from '../../src/extension/background/agent/errors';
import { toModelHistory } from '../../src/extension/background/agent/history';
import { clearSessionHistory } from '../../src/extension/background/agent/session';
import { runAgentTaskStream } from '../../src/extension/background/agent/orchestrator';
import { getAgentTools } from '../../src/extension/background/agent/tools';
import {
  getPublicAiConfig,
  loadAiConfig,
  resetAiConfigCache,
  setAiConfig,
} from '../../src/extension/background/llm';
import { createRateLimitAwareFetch, parseRetryAfterMs } from '../../src/extension/background/llm/model';
import type { AgentStreamEvent, ChatMessage } from '../../src/shared/messages';

function installChrome(storage: Record<string, unknown> = {}) {
  const sendMessage = vi.fn().mockImplementation((_tabId: number, msg: any) => {
    if (msg.type === 'content/ping') {
      return Promise.resolve({ ok: true, runtime: 'content', isTederash: true });
    }
    if (msg.type === 'tool/exec') {
      return Promise.resolve({ ok: true, outcome: { ok: true, message: 'ok' } });
    }
    return Promise.resolve({ ok: true });
  });
  (globalThis as any).chrome = {
    tabs: { sendMessage },
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: storage[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => Object.assign(storage, items)),
      },
    },
  };
  return { sendMessage, storage };
}

/** A fake streamText result whose fullStream yields the given parts. */
function fakeStream(parts: Array<Record<string, unknown>>) {
  return {
    fullStream: (async function* () {
      for (const p of parts) yield p;
    })(),
  };
}

describe('normalizeToolArgs', () => {
  it('drops nulls (gpt-oss sends null for omitted optional params) and trims strings', () => {
    expect(normalizeToolArgs({ formSelector: null, detail: ' summary ', n: 2, nested: { a: null, b: 1 } })).toEqual({
      detail: 'summary',
      n: 2,
      nested: { b: 1 },
    });
    expect(normalizeToolArgs(null)).toEqual({});
  });
});

describe('agent tool schemas', () => {
  it('accept null for optional parameters (Groq validates against the JSON schema)', () => {
    const tools = getAgentTools() as unknown as Record<
      string,
      { inputSchema: { safeParse: (v: unknown) => { success: boolean } } }
    >;
    expect(tools.read_page!.inputSchema.safeParse({ detail: null }).success).toBe(true);
    expect(tools.find!.inputSchema.safeParse({ query: 'email', kind: null }).success).toBe(true);
    expect(tools.set_preferences!.inputSchema.safeParse({ fontScale: null, highContrast: true }).success).toBe(true);
  });
});

describe('toModelHistory', () => {
  it('replays user and finished assistant text, with step summaries, and skips steps', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'what does this form ask?', timestamp: 1 },
      { id: '2', role: 'step', content: 'Discovered 9 fields', timestamp: 2 },
      {
        id: '3',
        role: 'assistant',
        content: 'It asks for your name and email.',
        timestamp: 3,
        status: 'success',
        toolCalls: [
          { id: 't', step: 1, tool: 'inspect_form', arguments: {}, rationale: '', status: 'SUCCESS', timestamp: 3, summary: 'Discovered 9 form field(s).' },
        ],
      },
      { id: '4', role: 'assistant', content: 'partial…', timestamp: 4, status: 'running' },
    ];
    const history = toModelHistory(messages);
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ role: 'user', content: 'what does this form ask?' });
    expect(history[1]!.role).toBe('assistant');
    expect(history[1]!.content).toContain('It asks for your name and email.');
    expect(history[1]!.content).toContain('Discovered 9 form field(s).');
  });
});

describe('describeProviderError', () => {
  it('classifies the Groq tool-validation rejection, rate limits and bad keys', () => {
    expect(
      describeProviderError(
        new Error('Tool call validation failed: parameters for tool inspect_form did not match schema')
      ).code
    ).toBe('TOOL_VALIDATION');
    expect(describeProviderError({ statusCode: 429, message: 'Rate limit reached', responseHeaders: { 'retry-after': '3' } })).toMatchObject({
      code: 'RATE_LIMIT',
      retryAfter: 3,
    });
    expect(describeProviderError({ statusCode: 401, message: 'Invalid API Key' }).code).toBe('AUTH');
    expect(describeProviderError(new Error('The model `x` does not exist')).code).toBe('MODEL_UNAVAILABLE');
  });
});

describe('AI config persistence', () => {
  beforeEach(() => resetAiConfigCache());

  it('persists saved settings, survives a worker restart, and never exposes the key to UI', async () => {
    const { storage } = installChrome();
    expect((await loadAiConfig()).apiKeySource).toBe('none');

    await setAiConfig({ provider: 'groq', apiKey: 'gsk_test', model: 'openai/gpt-oss-120b' });
    expect(getPublicAiConfig()).toMatchObject({ provider: 'groq', hasApiKey: true, apiKeySource: 'saved' });
    expect(getPublicAiConfig().apiKey).toBeUndefined();

    // Simulated service-worker restart: memory is gone, storage remains.
    resetAiConfigCache();
    installChrome(storage);
    const reloaded = await loadAiConfig();
    expect(reloaded.apiKey).toBe('gsk_test');

    // Saving the form with an empty key field keeps the saved key.
    await setAiConfig({ provider: 'groq', model: 'openai/gpt-oss-20b' });
    expect((await loadAiConfig()).apiKey).toBe('gsk_test');
    expect((await loadAiConfig()).model).toBe('openai/gpt-oss-20b');
  });
});

describe('LLM orchestration plumbing', () => {
  beforeEach(async () => {
    resetAiConfigCache();
    clearSessionHistory();
    streamTextMock.mockReset();
  });

  async function configureKey() {
    installChrome();
    await setAiConfig({ provider: 'groq', apiKey: 'gsk_test' });
  }

  it('sends earlier turns to the model on the next turn', async () => {
    await configureKey();
    streamTextMock.mockReturnValueOnce(fakeStream([{ type: 'text-delta', text: 'It asks for your full name.' }]));
    const t1 = await runAgentTaskStream(7, 'what does this form ask?');

    streamTextMock.mockReturnValueOnce(fakeStream([{ type: 'text-delta', text: 'Done.' }]));
    await runAgentTaskStream(7, "insert 'Tsegaye Shewamare' in the Full Name field.", t1.conversationId);

    const secondCall = streamTextMock.mock.calls[1]![0];
    expect(secondCall.system).toContain('PAGE STATE');
    expect(secondCall.prompt).toBeUndefined();
    expect(secondCall.messages).toEqual([
      { role: 'user', content: 'what does this form ask?' },
      { role: 'assistant', content: 'It asks for your full name.' },
      { role: 'user', content: "insert 'Tsegaye Shewamare' in the Full Name field." },
    ]);
  });

  it('surfaces a stream error instead of finishing with an empty "success"', async () => {
    await configureKey();
    streamTextMock.mockReturnValueOnce(
      fakeStream([
        {
          type: 'error',
          error: new Error('Tool call validation failed: parameters for tool inspect_form did not match schema'),
        },
      ])
    );
    const events: AgentStreamEvent[] = [];
    const res = await runAgentTaskStream(7, 'what does this form ask?', undefined, (e) => events.push(e));

    expect(res.status).toBe('error');
    const assistant = res.messages.filter((m) => m.role === 'assistant').at(-1);
    expect(assistant?.status).toBe('error');
    expect(assistant?.content).toBe('The AI model sent an invalid action request.');
    expect(events.some((e) => e.type === 'error')).toBe(true);
  });

  it('keeps partial text and notes the error when the stream fails midway', async () => {
    await configureKey();
    streamTextMock.mockReturnValueOnce(
      fakeStream([
        { type: 'text-delta', text: 'The form has 9 fields.' },
        { type: 'error', error: { statusCode: 429, message: 'Rate limit reached' } },
      ])
    );
    const res = await runAgentTaskStream(7, 'what does this form ask?');
    const assistant = res.messages.filter((m) => m.role === 'assistant').at(-1);
    expect(assistant?.content).toContain('The form has 9 fields.');
    expect(assistant?.content).toContain('rate limit');
  });

  it('runs tools in the top frame only, with null arguments removed', async () => {
    await configureKey();
    const { sendMessage } = installChrome();
    await setAiConfig({ provider: 'groq', apiKey: 'gsk_test' });
    streamTextMock
      .mockReturnValueOnce(
        fakeStream([{ type: 'tool-call', toolCallId: 'c1', toolName: 'read_page', input: { detail: null } }])
      )
      .mockReturnValueOnce(fakeStream([{ type: 'text-delta', text: 'ok' }]));
    await runAgentTaskStream(7, 'what does this form ask?');

    const execCall = sendMessage.mock.calls.find(
      ([, msg]) => msg.type === 'tool/exec' && msg.payload.call.name === 'inspect_page'
    );
    expect(execCall?.[1].payload.call).toEqual({ name: 'inspect_page', args: {} });
    expect(execCall?.[2]).toEqual({ frameId: 0 });
    for (const [, , opts] of sendMessage.mock.calls) expect(opts).toEqual({ frameId: 0 });
  });
});

describe('rate-limit aware fetch', () => {
  it('waits out a short 429 (Groq "try again in 1.2s") and retries', async () => {
    vi.useFakeTimers();
    const responses = [
      new Response('{"error":{"message":"Rate limit reached ... Please try again in 1.2s."}}', { status: 429 }),
      new Response('{"ok":true}', { status: 200 }),
    ];
    const base = vi.fn(async () => responses.shift()!);
    const wrapped = createRateLimitAwareFetch(base as unknown as typeof fetch);
    const pending = wrapped('https://api.groq.com/openai/v1/chat/completions', {});
    await vi.advanceTimersByTimeAsync(1500);
    const res = await pending;
    expect(res.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('returns long rate limits immediately so the user is told', async () => {
    const base = vi.fn(async () => new Response('x', { status: 429, headers: { 'retry-after': '60' } }));
    const res = await createRateLimitAwareFetch(base as unknown as typeof fetch)('u', {});
    expect(res.status).toBe(429);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('parses retry-after headers and Groq millisecond hints', () => {
    expect(parseRetryAfterMs(new Headers({ 'retry-after': '2' }), '')).toBe(2000);
    expect(parseRetryAfterMs(new Headers(), 'Please try again in 450ms.')).toBe(450);
    expect(parseRetryAfterMs(new Headers(), 'nothing')).toBeUndefined();
  });
});
