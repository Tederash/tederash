import { describe, expect, it, vi } from 'vitest';
import {
  formatStepRationale,
  getActiveVerb,
  runAgentTaskStream,
} from '../../src/extension/background/agent/runner';
import type { AgentStreamEvent } from '../../src/shared/messages';

describe('Live Streaming & Rationales Engine', () => {
  it('generates human-readable step rationales for tools', () => {
    const treeRationale = formatStepRationale({
      name: 'tederash_get_tree',
      args: {},
    });
    expect(treeRationale).toContain('Inspecting Tederash accessible component tree');

    const observeRationale = formatStepRationale({
      name: 'observe_page',
      args: { mode: 'interactive' },
    });
    expect(observeRationale).toContain('Observing web page layout');

    const explainRationale = formatStepRationale({
      name: 'tederash_explain_field',
      args: { componentId: 'fullName' },
    });
    expect(explainRationale).toContain('fullName');
  });

  it('provides dynamic active verbs matching RepoMind pattern', () => {
    expect(getActiveVerb('observe_page')).toBe('Observing page layout...');
    expect(getActiveVerb('tederash_get_tree')).toBe('Inspecting accessible components...');
    expect(getActiveVerb('tederash_explain_field')).toBe('Analyzing form field constraints...');
    expect(getActiveVerb('click')).toBe('Clicking control...');
    expect(getActiveVerb('read_text')).toBe('Reading page content...');
    expect(getActiveVerb('unknown' as any)).toBe('Thinking...');
  });

  const PAGE = {
    url: 'http://localhost:3000/jobs',
    title: 'Jobs',
    pageVersion: 1,
    headings: ['Role Application'],
    fields: [
      { handle: 'fld:full-legal-name', label: 'Full Legal Name', kind: 'text', required: true },
      { handle: 'fld:email-address', label: 'Email Address', kind: 'email', required: true },
      { handle: 'fld:password', label: 'Password', kind: 'password', required: true, sensitive: true, filled: false },
    ],
    buttons: [],
  };

  function installOfflineChrome() {
    const sendMessage = vi.fn().mockImplementation((_tabId: number, msg: any) => {
      if (msg.type === 'content/ping') return Promise.resolve({ ok: true, runtime: 'content', isTederash: true });
      const call = msg.payload?.call;
      if (call?.name === 'page_state') return Promise.resolve({ ok: true, data: PAGE });
      if (call?.name === 'fill') {
        return Promise.resolve({ ok: true, outcome: { ok: true, message: `Full Legal Name = "${call.args.value}"` } });
      }
      return Promise.resolve({ ok: true });
    });
    (globalThis as any).chrome = { tabs: { sendMessage } };
    return sendMessage;
  }

  it('offline mode (no API key) answers form questions from the Page Model', async () => {
    installOfflineChrome();
    const events: AgentStreamEvent[] = [];
    const result = await runAgentTaskStream(42, 'what fields does this form need?', 'conv_offline_q', (e) => events.push(e));
    expect(result.status).toBe('done');
    const answer = result.messages.filter((m) => m.role === 'assistant').at(-1)?.content ?? '';
    expect(answer).toContain('Full Legal Name');
    expect(answer).toContain('Email Address');
    expect(answer).toContain('you fill this one yourself');
    expect(events.some((e) => e.type === 'token')).toBe(true);
    expect(events.at(-1)?.type).toBe('done');
  });

  it('offline mode acts on "insert X in the Full Name field" instead of listing fields again', async () => {
    const sendMessage = installOfflineChrome();
    const events: AgentStreamEvent[] = [];
    const result = await runAgentTaskStream(
      42,
      "insert 'Tsegaye Shewamare' in the Full Name field.",
      'conv_offline_act',
      (e) => events.push(e)
    );
    const fillCall = sendMessage.mock.calls.find(([, msg]) => msg.payload?.call?.name === 'fill');
    expect(fillCall?.[1].payload.call.args).toEqual({ target: 'Full Name', value: 'Tsegaye Shewamare' });
    const toolCallEvent = events.find((e) => e.type === 'tool_call') as any;
    expect(toolCallEvent.toolCall.rationale).toBe('Filling “Full Name”.');
    const answer = result.messages.filter((m) => m.role === 'assistant').at(-1)?.content ?? '';
    expect(answer).toContain('Full Legal Name = "Tsegaye Shewamare"');
    expect(answer).not.toContain('|');
  });
});
