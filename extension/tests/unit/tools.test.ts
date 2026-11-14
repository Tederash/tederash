import { describe, expect, it } from 'vitest';
import { TOOL_SPECS, ToolCallSchema } from '../../src/shared/tools';

describe('Tool Definitions and Schemas', () => {
  it('defines the required tool specifications', () => {
    const names = TOOL_SPECS.map((t) => t.name);
    expect(names).toContain('observe_page');
    expect(names).toContain('find_elements');
    expect(names).toContain('click');
    expect(names).toContain('fill_field');
    expect(names).toContain('scroll');
    expect(names).toContain('read_text');
    expect(names).toContain('set_adaptation');
    expect(names).toContain('say');
    expect(names).toContain('finish');
  });

  it('validates observe_page tool call', () => {
    const valid = { name: 'observe_page', args: { mode: 'interactive', viewportOnly: false } };
    const parsed = ToolCallSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('validates click tool call', () => {
    const valid = { name: 'click', args: { ref: 'e4' } };
    const parsed = ToolCallSchema.safeParse(valid);
    expect(parsed.success).toBe(true);

    const invalid = { name: 'click', args: {} };
    expect(ToolCallSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates fill_field tool call', () => {
    const valid = { name: 'fill_field', args: { ref: 'e12', value: 'hello world' } };
    const parsed = ToolCallSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('validates set_adaptation tool call', () => {
    const valid = {
      name: 'set_adaptation',
      args: { textScale: 1.4, contrastTheme: 'high-contrast', largeTargets: true },
    };
    const parsed = ToolCallSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});
