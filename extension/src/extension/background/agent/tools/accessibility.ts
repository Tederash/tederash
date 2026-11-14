import { tool } from 'ai';
import { z } from 'zod';
import type { ToolExecutionContext } from './types';

export function createAccessibilityTools(ctx: ToolExecutionContext) {
  return {
    tederash_set_profile: tool({
      description:
        'Switch the active accessibility profile dynamically (e.g. standard, low-vision, motor-assist, cognitive-assist, keyboard-only).',
      inputSchema: z.object({
        profileId: z
          .string()
          .describe('ID of accessibility profile to set (e.g. low-vision, motor-assist, cognitive-assist, standard)'),
      }),
      execute: async (args: { profileId: string }) =>
        ctx.execute('tederash_set_profile', args),
    }),

    tederash_update_pref: tool({
      description:
        'Update specific accessibility preferences on the page (fontScale, highContrast, targetSize, simplifiedLanguage, showInstructions, reduceMotion).',
      inputSchema: z.object({
        fontScale: z.number().optional().describe('Font scale factor (e.g. 1.25, 1.5)'),
        highContrast: z.boolean().optional().describe('Enable high-contrast borders and text'),
        targetSize: z.enum(['normal', 'large', 'extra-large']).optional().describe('Touch target sizing'),
        simplifiedLanguage: z.boolean().optional().describe('Enable simplified plain language'),
        showInstructions: z.boolean().optional().describe('Display persistent instructional helpers'),
        reduceMotion: z.boolean().optional().describe('Disable motion and animations'),
      }),
      execute: async (args: {
        fontScale?: number;
        highContrast?: boolean;
        targetSize?: 'normal' | 'large' | 'extra-large';
        simplifiedLanguage?: boolean;
        showInstructions?: boolean;
        reduceMotion?: boolean;
      }) => ctx.execute('tederash_update_pref', args),
    }),

    tederash_announce: tool({
      description:
        'Broadcast an accessible announcement via the Tederash LiveRegion for screen readers and visible alerts.',
      inputSchema: z.object({
        message: z.string().describe('Message text to announce'),
        priority: z.enum(['polite', 'assertive']).optional().describe('Announcement priority'),
      }),
      execute: async (args: { message: string; priority?: 'polite' | 'assertive' }) =>
        ctx.execute('tederash_announce', args),
    }),

    say: tool({
      description:
        'Speak a concise announcement aloud to the user using text-to-speech.',
      inputSchema: z.object({
        text: z.string().describe('Spoken text announcement'),
      }),
      execute: async (args: { text: string }) =>
        ctx.execute('say', args),
    }),

    finish: tool({
      description:
        'Indicate that the user goal or task has been completed and provide a summary of the outcome.',
      inputSchema: z.object({
        summary: z.string().describe('Final summary of actions taken and outcome'),
        status: z.enum(['success', 'partial', 'failed']).optional().describe('Completion status'),
      }),
      execute: async (args: { summary: string; status?: 'success' | 'partial' | 'failed' }) =>
        ctx.execute('finish', args),
    }),
  };
}
