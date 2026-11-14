import { tool } from 'ai';
import { z } from 'zod';
import type { ToolName } from '../../../../shared/tools';
import { toModelToolOutput } from '../page-model';
import type { ToolExecutionContext } from './types';

export * from './types';

/**
 * Model-facing tool set. Deliberately small (every definition costs tokens on each
 * step, and free-tier Groq allows ~8k tokens/minute) and target-based: actions take a
 * handle from PAGE STATE or plain words, so no search step is needed before acting.
 *
 * Optional params are `.nullish()`: gpt-oss sends null for omitted fields and Groq
 * validates arguments against the JSON schema server-side.
 */
export function getAgentTools(ctx: ToolExecutionContext) {
  const run = async (name: ToolName, args: Record<string, unknown>) =>
    toModelToolOutput(name, await ctx.execute(name, args));

  const target = z
    .string()
    .describe('Handle from PAGE STATE (e.g. "fld:email") or the visible label (e.g. "Email Address")');

  return {
    read_page: tool({
      description: 'Read the page text: title, headings, landmarks and main readable content. Use for questions about what the page says.',
      inputSchema: z.object({
        detail: z.enum(['summary', 'full']).nullish().describe('"full" returns more body text'),
      }),
      execute: (args) => run('inspect_page', args),
    }),

    inspect_form: tool({
      description: 'Refresh PAGE STATE (fields, values, errors, buttons). Only needed if PAGE STATE is missing or the page changed.',
      inputSchema: z.object({}),
      execute: () => run('page_state', {}),
    }),

    find: tool({
      description: 'Find a control by description when it is not obvious in PAGE STATE. Returns handles.',
      inputSchema: z.object({
        query: z.string().describe('Words describing the control'),
        kind: z.enum(['field', 'button', 'any']).nullish(),
      }),
      execute: (args) => run('find', args),
    }),

    fill: tool({
      description: 'Type text into a text field or textarea (replaces its current value).',
      inputSchema: z.object({ target, value: z.string().describe('Exact text to enter') }),
      execute: (args) => run('fill', args),
    }),

    choose: tool({
      description: 'Pick an option in a dropdown, select or radio group.',
      inputSchema: z.object({ target, option: z.string().describe('Visible option text') }),
      execute: (args) => run('choose', args),
    }),

    set_checked: tool({
      description: 'Check or uncheck a checkbox or switch.',
      inputSchema: z.object({ target, checked: z.boolean() }),
      execute: (args) => run('set_checked', args),
    }),

    click: tool({
      description: 'Click a button or link. Submitting or destructive actions may ask the user to confirm.',
      inputSchema: z.object({ target }),
      execute: (args) => run('click', args),
    }),

    scroll: tool({
      description: 'Scroll the page.',
      inputSchema: z.object({ direction: z.enum(['up', 'down', 'top', 'bottom']) }),
      execute: (args) => run('scroll', args),
    }),

    set_preferences: tool({
      description: 'Change accessibility preferences on the page (text size, contrast, target size, motion, plain language, instructions).',
      inputSchema: z.object({
        fontScale: z.number().nullish().describe('e.g. 1.25 for 125%'),
        highContrast: z.boolean().nullish(),
        targetSize: z.enum(['normal', 'large', 'extra-large']).nullish(),
        simplifiedLanguage: z.boolean().nullish(),
        showInstructions: z.boolean().nullish(),
        reduceMotion: z.boolean().nullish(),
      }),
      execute: (args) => run('tederash_update_pref', args),
    }),

    set_profile: tool({
      description: 'Switch to a named accessibility profile (e.g. standard, low-vision, motor, cognitive).',
      inputSchema: z.object({ profileId: z.string() }),
      execute: (args) => run('tederash_set_profile', args),
    }),

    announce: tool({
      description: 'Announce a message through the page live region (screen readers and visual alert).',
      inputSchema: z.object({
        message: z.string(),
        priority: z.enum(['polite', 'assertive']).nullish(),
      }),
      execute: (args) => run('tederash_announce', args),
    }),

    say: tool({
      description: 'Speak a short message aloud with text-to-speech.',
      inputSchema: z.object({ text: z.string() }),
      execute: (args) => run('say', args),
    }),
  };
}
