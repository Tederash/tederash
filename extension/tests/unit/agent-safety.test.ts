import { beforeEach, describe, expect, it, vi } from 'vitest';
import { awaitConfirmation, resolveConfirmation } from '../../src/extension/background/agent/confirm';
import { executeContentTool } from '../../src/extension/background/agent/executor';
import type { CallModel } from '../../src/extension/background/agent/loop';
import { runAgentTaskStream } from '../../src/extension/background/agent/orchestrator';
import {
  INTERRUPTED_MESSAGE,
  ensureSessionsLoaded,
  getOrCreateSession,
  getSessionHistory,
  persistSessions,
  resetSessionsForTests,
} from '../../src/extension/background/agent/session';
import { resetAiConfigCache, setAiConfig } from '../../src/extension/background/llm';
import { evaluatePolicy } from '../../src/extension/background/policy';
import type { AgentStreamEvent } from '../../src/shared/messages';

type Described = { text: string; submit?: boolean; role?: string };

function installChrome(opts: { describe?: Described; storage?: Record<string, unknown> } = {}) {
  const storage = opts.storage ?? {};
  const area = (store: Record<string, unknown>) => ({
    get: vi.fn(async (key: string) => ({ [key]: store[key] })),
    set: vi.fn(async (items: Record<string, unknown>) => Object.assign(store, items)),
  });
  const sendMessage = vi.fn(async (_tab: number, msg: any) => {
    if (msg.type === 'content/ping') return { ok: true, runtime: 'content', isTederash: true };
    const call = msg.payload?.call;
    if (call?.name === 'describe_target') return { ok: true, data: opts.describe ?? { text: 'Next', submit: false } };
    if (call?.name === 'page_state') return { ok: true, data: { url: 'u', title: 't', pageVersion: 1, headings: [], fields: [], buttons: [] } };
    return { ok: true, outcome: { ok: true, message: `ran ${call?.name}` } };
  });
  (globalThis as any).chrome = { tabs: { sendMessage }, storage: { local: area({}), session: area(storage) } };
  return { sendMessage, storage };
}

const toolCallsSent = (sendMessage: ReturnType<typeof vi.fn>) =>
  sendMessage.mock.calls.map(([, msg]) => msg.payload?.call?.name).filter(Boolean);

describe('policy', () => {
  it('requires confirmation for submit buttons and destructive words (en + am)', () => {
    expect(evaluatePolicy({ name: 'click', args: { target: 'x' } }, { text: 'Continue', submit: true })).toMatchObject({
      risk: 'consequential',
      requiresConfirmation: true,
    });
    expect(evaluatePolicy({ name: 'click', args: { target: 'x' } }, { text: 'Delete draft' }).risk).toBe('destructive');
    expect(evaluatePolicy({ name: 'click', args: { target: 'x' } }, { text: 'ሰርዝ' }).risk).toBe('destructive');
    expect(evaluatePolicy({ name: 'click', args: { target: 'x' } }, { text: 'ላክ' }).requiresConfirmation).toBe(true);
  });

  it('matches English words on word boundaries', () => {
    expect(evaluatePolicy({ name: 'click', args: { target: 'x' } }, { text: 'Show sender details' }).requiresConfirmation).toBe(false);
    expect(evaluatePolicy({ name: 'fill', args: { target: 'x', value: 'y' } }).risk).toBe('low');
  });
});

describe('confirmation registry', () => {
  it('resolves with the user answer, and declines on timeout or abort', async () => {
    const p = awaitConfirmation('a');
    expect(resolveConfirmation('a', true)).toBe(true);
    await expect(p).resolves.toBe(true);
    expect(resolveConfirmation('a', true)).toBe(false);

    vi.useFakeTimers();
    const timed = awaitConfirmation('b', undefined, 1000);
    await vi.advanceTimersByTimeAsync(1001);
    await expect(timed).resolves.toBe(false);
    vi.useRealTimers();

    const ctrl = new AbortController();
    const aborted = awaitConfirmation('c', ctrl.signal);
    ctrl.abort();
    await expect(aborted).resolves.toBe(false);
  });
});

describe('executor policy gate', () => {
  beforeEach(() => resetSessionsForTests());

  it('describes the click target, asks for confirmation, and does not click when declined', async () => {
    const { sendMessage } = installChrome({ describe: { text: 'Submit application', submit: true } });
    const confirm = vi.fn(async () => false);
    const res = await executeContentTool(1, getOrCreateSession(1), 'click', { target: 'Submit application' }, undefined, undefined, { confirm });
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Click “Submit application”?', risk: 'consequential' }));
    expect(res).toMatchObject({ ok: false, error: { code: 'DECLINED_BY_USER' } });
    expect(toolCallsSent(sendMessage)).toEqual(['describe_target']);
  });

  it('clicks after approval, and declines when nobody can be asked', async () => {
    const { sendMessage } = installChrome({ describe: { text: 'Submit application', submit: true } });
    const res = await executeContentTool(1, getOrCreateSession(1), 'click', { target: 'Submit application' }, undefined, undefined, {
      confirm: async () => true,
    });
    expect(res.ok).toBe(true);
    expect(toolCallsSent(sendMessage)).toEqual(['describe_target', 'click']);

    const noConfirm = await executeContentTool(1, getOrCreateSession(1), 'click', { target: 'Submit application' });
    expect(noConfirm).toMatchObject({ ok: false, error: { code: 'DECLINED_BY_USER' } });
  });

  it('does not ask for ordinary clicks or fills', async () => {
    const { sendMessage } = installChrome({ describe: { text: 'Next' } });
    const confirm = vi.fn(async () => true);
    await executeContentTool(1, getOrCreateSession(1), 'click', { target: 'Next' }, undefined, undefined, { confirm });
    await executeContentTool(1, getOrCreateSession(1), 'fill', { target: 'Name', value: 'A' }, undefined, undefined, { confirm });
    expect(confirm).not.toHaveBeenCalled();
    expect(toolCallsSent(sendMessage)).toEqual(['describe_target', 'click', 'fill']);
  });
});

describe('end-to-end confirmation through the orchestrator', () => {
  beforeEach(() => {
    resetSessionsForTests();
    resetAiConfigCache();
  });

  it('emits confirm_request, waits, and clicks only after the user approves', async () => {
    const { sendMessage } = installChrome({ describe: { text: 'Submit application', submit: true } });
    await setAiConfig({ provider: 'groq', apiKey: 'gsk_test' });
    let step = 0;
    const callModel: CallModel = async (req) => {
      if (step++ === 0) return { text: '', toolCalls: [{ toolCallId: 'c1', toolName: 'click', input: { target: 'Submit application' } }] };
      req.onText('Submitted.');
      return { text: 'Submitted.', toolCalls: [] };
    };
    const events: AgentStreamEvent[] = [];
    const turn = runAgentTaskStream(
      3,
      'submit my application',
      undefined,
      (e) => {
        events.push(e);
        if (e.type === 'confirm_request') setTimeout(() => resolveConfirmation(e.id, true), 0);
      },
      undefined,
      { callModel }
    );
    const res = await turn;
    expect(events.find((e) => e.type === 'confirm_request')).toMatchObject({ title: 'Click “Submit application”?' });
    expect(toolCallsSent(sendMessage)).toContain('click');
    expect(res.status).toBe('done');
  });
});

describe('session persistence', () => {
  beforeEach(() => resetSessionsForTests());

  it('restores history after a service-worker restart and marks an in-flight turn interrupted', async () => {
    const { storage } = installChrome();
    await ensureSessionsLoaded();
    const s = getOrCreateSession(9, 'conv_keep');
    s.messages.push({ id: 'u', role: 'user', content: 'what does this form ask?', timestamp: 1 });
    s.messages.push({ id: 'a', role: 'assistant', content: '', timestamp: 2, status: 'running' });
    s.status = 'running';
    await persistSessions();

    resetSessionsForTests(); // worker restart: memory gone, storage.session remains
    installChrome({ storage });
    await ensureSessionsLoaded();
    const history = getSessionHistory('conv_keep');
    expect(history[0]?.content).toBe('what does this form ask?');
    expect(history[1]).toMatchObject({ status: 'error', content: INTERRUPTED_MESSAGE });
    // The tab keeps its conversation.
    expect(getOrCreateSession(9).id).toBe('conv_keep');
  });
});
