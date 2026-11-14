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
});
