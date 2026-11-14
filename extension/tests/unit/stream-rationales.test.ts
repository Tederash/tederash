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

  it('runs multi-step streaming and emits thought, tool_call, tool_result, token, and done events', async () => {
    // Setup chrome.tabs.sendMessage mock
    const treeMock = [
      { component: 'input', id: 'fullName', label: 'Full Name', required: true },
      { component: 'input', id: 'email', label: 'Email Address', required: true },
      { component: 'input', id: 'password', label: 'Password', required: true },
    ];

    (globalThis as any).chrome = {
      tabs: {
        sendMessage: vi.fn().mockImplementation((tabId, msg) => {
          if (msg.type === 'content/ping') {
            return Promise.resolve({ ok: true, runtime: 'content', isTederash: true });
          }
          if (msg.type === 'tool/exec') {
            if (msg.payload.call.name === 'tederash_get_tree') {
              return Promise.resolve({
                ok: true,
                data: treeMock,
                outcome: { ok: true, message: 'Found 3 components' },
              });
            }
          }
          return Promise.resolve({ ok: true });
        }),
      },
    };

    const emittedEvents: AgentStreamEvent[] = [];
    const listener = (event: AgentStreamEvent) => {
      emittedEvents.push(event);
    };

    const result = await runAgentTaskStream(
      42,
      'what fields does this form need?',
      'conv_stream_test',
      listener
    );

    // Verify final result
    expect(result.status).toBe('done');
    const assistantMsg = result.messages.find((m) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg?.content).toContain('Full Name');
    expect(assistantMsg?.content).toContain('Email Address');
    expect(assistantMsg?.content).toContain('Password');
    expect(assistantMsg?.toolCalls?.length).toBeGreaterThan(0);

    // Verify emitted streaming events
    expect(emittedEvents.some((e) => e.type === 'start')).toBe(true);
    expect(emittedEvents.some((e) => e.type === 'thought')).toBe(true);
    expect(emittedEvents.some((e) => e.type === 'tool_call')).toBe(true);
    expect(emittedEvents.some((e) => e.type === 'tool_result')).toBe(true);
    expect(emittedEvents.some((e) => e.type === 'token')).toBe(true);
    expect(emittedEvents.some((e) => e.type === 'done')).toBe(true);

    const toolCallEvent = emittedEvents.find((e) => e.type === 'tool_call') as any;
    expect(toolCallEvent.toolCall.rationale).toContain('Inspecting Tederash accessible component tree');
  });
});
