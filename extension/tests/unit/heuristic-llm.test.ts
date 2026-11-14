import { describe, expect, it } from 'vitest';
import { HeuristicLlmProvider } from '../../src/extension/background/llm/heuristic';
import { TOOL_SPECS } from '../../src/shared/tools';

describe('HeuristicLlmProvider', () => {
  const provider = new HeuristicLlmProvider();

  it('maps text scale requests to tederash_update_pref tool call', async () => {
    const res = await provider.generate({
      systemPrompt: 'test',
      messages: [{ role: 'user', content: 'Please increase text size' }],
      tools: TOOL_SPECS,
    });

    expect(res.toolCalls).toBeDefined();
    expect(res.toolCalls?.some((tc) => tc.name === 'tederash_update_pref')).toBe(true);
    const adaptCall = res.toolCalls?.find((tc) => tc.name === 'tederash_update_pref');
    expect(adaptCall?.args.fontScale).toBeGreaterThan(1.0);
  });

  it('maps contrast mode requests to tederash_update_pref', async () => {
    const res = await provider.generate({
      systemPrompt: 'test',
      messages: [{ role: 'user', content: 'Turn on high contrast mode' }],
      tools: TOOL_SPECS,
    });

    const adaptCall = res.toolCalls?.find((tc) => tc.name === 'tederash_update_pref');
    expect(adaptCall?.args.highContrast).toBe(true);
  });

  it('maps scroll requests to scroll tool call', async () => {
    const res = await provider.generate({
      systemPrompt: 'test',
      messages: [{ role: 'user', content: 'scroll down' }],
      tools: TOOL_SPECS,
    });

    const scrollCall = res.toolCalls?.find((tc) => tc.name === 'scroll');
    expect(scrollCall?.args.direction).toBe('down');
  });

  it('maps reading requests to read_text tool call', async () => {
    const res = await provider.generate({
      systemPrompt: 'test',
      messages: [{ role: 'user', content: 'read this article' }],
      tools: TOOL_SPECS,
    });

    const readCall = res.toolCalls?.find((tc) => tc.name === 'read_text');
    expect(readCall).toBeDefined();
  });

  it('maps form field queries to tederash_get_tree on turn 1', async () => {
    const res = await provider.generate({
      systemPrompt: 'test',
      messages: [{ role: 'user', content: 'what fields does this form need?' }],
      tools: TOOL_SPECS,
    });

    expect(res.toolCalls).toBeDefined();
    expect(res.toolCalls?.[0]?.name).toBe('tederash_get_tree');
  });

  it('synthesizes markdown table answering required fields when tree data is returned on turn 2', async () => {
    const tree = [
      { component: 'input', id: 'fullName', label: 'Full Name', required: true },
      { component: 'input', id: 'email', label: 'Email Address', required: true },
      { component: 'input', id: 'password', label: 'Password', required: true },
      { component: 'select', id: 'role', label: 'Role / Profession', required: false },
    ];

    const res = await provider.generate({
      systemPrompt: 'test',
      messages: [
        { role: 'user', content: 'what fields does this form need?' },
        { role: 'tool', content: JSON.stringify(tree) },
      ],
      tools: TOOL_SPECS,
    });

    expect(res.content).toBeDefined();
    expect(res.content).toContain('Full Name');
    expect(res.content).toContain('Email Address');
    expect(res.content).toContain('Password');
    expect(res.content).toContain('Required');
  });
});
