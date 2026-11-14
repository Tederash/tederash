import { describe, expect, it } from 'vitest';
import {
  TabCheckTederashSchema,
  UiToBgSchema,
  createEnvelope,
} from '../../src/shared/messages';
import {
  TOOL_SPECS,
  ToolCallSchema,
} from '../../src/shared/tools';

describe('Tederash Tab Gating & Ecosystem Tools', () => {
  describe('Tab Check & Gating Schema', () => {
    it('validates tab/checkTederash message envelope', () => {
      const msg = createEnvelope('tab/checkTederash', { tabId: 42 });
      const parsed = UiToBgSchema.safeParse(msg);
      expect(parsed.success).toBe(true);
      if (parsed.success && parsed.data.type === 'tab/checkTederash') {
        expect(parsed.data.payload.tabId).toBe(42);
      }
    });

    it('accepts tab/checkTederash without tabId (current tab)', () => {
      const msg = createEnvelope('tab/checkTederash', {});
      const parsed = UiToBgSchema.safeParse(msg);
      expect(parsed.success).toBe(true);
    });
  });

  describe('Tederash Ecosystem Tools', () => {
    it('registers all tederash_* tools in TOOL_SPECS', () => {
      const toolNames = TOOL_SPECS.map((t) => t.name);
      expect(toolNames).toContain('tederash_detect');
      expect(toolNames).toContain('tederash_get_tree');
      expect(toolNames).toContain('tederash_set_profile');
      expect(toolNames).toContain('tederash_update_pref');
      expect(toolNames).toContain('tederash_announce');
      expect(toolNames).toContain('tederash_interact');
      expect(toolNames).toContain('tederash_explain_field');
    });

    it('validates tederash_detect tool call', () => {
      const parsed = ToolCallSchema.safeParse({
        name: 'tederash_detect',
        args: {},
      });
      expect(parsed.success).toBe(true);
    });

    it('validates tederash_get_tree tool call', () => {
      const parsed = ToolCallSchema.safeParse({
        name: 'tederash_get_tree',
        args: {},
      });
      expect(parsed.success).toBe(true);
    });

    it('validates tederash_set_profile tool call', () => {
      const valid = ToolCallSchema.safeParse({
        name: 'tederash_set_profile',
        args: { profileId: 'low-vision' },
      });
      expect(valid.success).toBe(true);

      const invalid = ToolCallSchema.safeParse({
        name: 'tederash_set_profile',
        args: {},
      });
      expect(invalid.success).toBe(false);
    });

    it('validates tederash_update_pref tool call', () => {
      const parsed = ToolCallSchema.safeParse({
        name: 'tederash_update_pref',
        args: {
          fontScale: 1.5,
          highContrast: true,
          targetSize: 'large',
          simplifiedLanguage: true,
        },
      });
      expect(parsed.success).toBe(true);
    });

    it('validates tederash_announce tool call', () => {
      const parsed = ToolCallSchema.safeParse({
        name: 'tederash_announce',
        args: {
          message: 'Profile updated successfully',
          priority: 'polite',
        },
      });
      expect(parsed.success).toBe(true);
    });

    it('validates tederash_interact tool call', () => {
      const validClick = ToolCallSchema.safeParse({
        name: 'tederash_interact',
        args: { componentId: 'submit-btn', action: 'click' },
      });
      expect(validClick.success).toBe(true);

      const validFill = ToolCallSchema.safeParse({
        name: 'tederash_interact',
        args: { componentId: 'email-input', action: 'fill', value: 'user@example.com' },
      });
      expect(validFill.success).toBe(true);
    });

    it('validates tederash_explain_field tool call', () => {
      const parsed = ToolCallSchema.safeParse({
        name: 'tederash_explain_field',
        args: { componentId: 'username-field' },
      });
      expect(parsed.success).toBe(true);
    });
  });
});
