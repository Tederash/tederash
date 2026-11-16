import { type Tool, tool } from 'ai';
import { z } from 'zod';
import type { ToolName } from '../../../../shared/tools';


export type ToolKind = 'perceive' | 'act' | 'adapt';

export interface AgentToolDef {
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  /** Content-script tool that implements it. */
  contentTool: ToolName;
  kind: ToolKind;
}

const target = z
  .string()
  .describe('Handle from PAGE STATE (e.g. "fld:email") or the visible label (e.g. "Email Address")');

/**
 * Model-facing tool set. Deliberately small (every definition costs tokens on each
 * step; free-tier Groq allows ~8k tokens/minute) and target-based: actions take a
 * handle from PAGE STATE or plain words, so no search step is needed before acting.
 *
 * Optional params are `.nullish()`: gpt-oss sends null for omitted fields and Groq
 * validates arguments against the JSON schema server-side.
 */
export const AGENT_TOOL_DEFS = {
  read_page: {
    description: 'Read the page text: title, headings, landmarks and main readable content. Use for questions about what the page says.',
    inputSchema: z.object({ detail: z.enum(['summary', 'full']).nullish().describe('"full" returns more body text') }),
    contentTool: 'inspect_page',
    kind: 'perceive',
  },
  inspect_form: {
    description: 'Refresh PAGE STATE (fields, values, errors, buttons). Only needed if PAGE STATE is missing or the page changed.',
    inputSchema: z.object({}),
    contentTool: 'page_state',
    kind: 'perceive',
  },
  find: {
    description: 'Find a control by description when it is not obvious in PAGE STATE. Returns handles.',
    inputSchema: z.object({
      query: z.string().describe('Words describing the control'),
      kind: z.enum(['field', 'button', 'any']).nullish(),
    }),
    contentTool: 'find',
    kind: 'perceive',
  },
  fill: {
    description: 'Type text into a text field or textarea (replaces its current value).',
    inputSchema: z.object({ target, value: z.string().describe('Exact text to enter') }),
    contentTool: 'fill',
    kind: 'act',
  },
  fill_form: {
    description:
      'Fill several controls in ONE step. Use this whenever more than one field needs a value — never repeat fill/choose/set_checked field by field.',
    inputSchema: z.object({
      entries: z
        .array(
          z.object({
            target,
            kind: z
              .enum(['text', 'choice', 'checked'])
              .describe('"text" for text fields, "choice" for dropdowns/radios, "checked" for checkboxes'),
            value: z.string().describe('Text to enter, the visible option text, or "true"/"false" for a checkbox'),
          })
        )
        .describe('One entry per control, in the order they appear on the page'),
    }),
    contentTool: 'fill_form',
    kind: 'act',
  },
  choose: {
    description: 'Pick an option in a dropdown, select or radio group.',
    inputSchema: z.object({ target, option: z.string().describe('Visible option text') }),
    contentTool: 'choose',
    kind: 'act',
  },
  set_checked: {
    description: 'Check or uncheck a checkbox or switch.',
    inputSchema: z.object({ target, checked: z.boolean() }),
    contentTool: 'set_checked',
    kind: 'act',
  },
  click: {
    description: 'Click a button or link. Submitting or destructive actions ask the user to confirm first.',
    inputSchema: z.object({ target }),
    contentTool: 'click',
    kind: 'act',
  },
  scroll: {
    description: 'Scroll the page.',
    inputSchema: z.object({ direction: z.enum(['up', 'down', 'top', 'bottom']) }),
    contentTool: 'scroll',
    kind: 'act',
  },
  set_preferences: {
    description: 'Change accessibility preferences on the page (text size, contrast, target size, motion, plain language, instructions).',
    inputSchema: z.object({
      fontScale: z.number().nullish().describe('e.g. 1.25 for 125%'),
      highContrast: z.boolean().nullish(),
      targetSize: z.enum(['normal', 'large', 'extra-large']).nullish(),
      simplifiedLanguage: z.boolean().nullish(),
      showInstructions: z.boolean().nullish(),
      reduceMotion: z.boolean().nullish(),
    }),
    contentTool: 'tederash_update_pref',
    kind: 'adapt',
  },
  set_profile: {
    description: 'Switch to a named accessibility profile (e.g. standard, low-vision, motor, cognitive).',
    inputSchema: z.object({ profileId: z.string() }),
    contentTool: 'tederash_set_profile',
    kind: 'adapt',
  },
  announce: {
    description: 'Announce a message through the page live region (screen readers and visual alert).',
    inputSchema: z.object({ message: z.string(), priority: z.enum(['polite', 'assertive']).nullish() }),
    contentTool: 'tederash_announce',
    kind: 'adapt',
  },
  say: {
    description: 'Speak a short message aloud with text-to-speech.',
    inputSchema: z.object({ text: z.string() }),
    contentTool: 'say',
    kind: 'adapt',
  },
} satisfies Record<string, AgentToolDef>;

export type AgentToolName = keyof typeof AGENT_TOOL_DEFS;

export function getToolDef(name: string): AgentToolDef | undefined {
  return (AGENT_TOOL_DEFS as Record<string, AgentToolDef>)[name];
}

/**
 * Tool definitions for the model, without `execute`: the orchestrator loop runs tools
 * itself so it can apply guards, policy and confirmation between steps.
 *
 * `say` is offered only on spoken turns, where there is someone listening for it.
 */
export function getAgentTools(options: { voiceTurn?: boolean } = {}): Record<string, Tool> {
  const voiceTurn = options.voiceTurn === true;
  const tools: Record<string, Tool> = {};
  for (const [name, def] of Object.entries(AGENT_TOOL_DEFS as Record<string, AgentToolDef>)) {
    if (!voiceTurn && name === 'say') continue;
    tools[name] = tool({ description: def.description, inputSchema: def.inputSchema });
  }
  return tools;
}
