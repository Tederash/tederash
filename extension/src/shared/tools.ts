import { z } from 'zod';

export type ToolRisk = 'none' | 'low' | 'consequential' | 'destructive' | 'blocked';

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  risk: ToolRisk;
}

export const ObservePageArgsSchema = z.object({
  mode: z.enum(['interactive', 'content', 'form']).default('interactive').optional(),
  viewportOnly: z.boolean().default(false).optional(),
});
export type ObservePageArgs = z.infer<typeof ObservePageArgsSchema>;

export const FindElementsArgsSchema = z.object({
  query: z.string().min(1).max(200),
  role: z.string().optional(),
});
export type FindElementsArgs = z.infer<typeof FindElementsArgsSchema>;

export const ClickArgsSchema = z.object({
  ref: z.string().min(1).max(20),
});
export type ClickArgs = z.infer<typeof ClickArgsSchema>;

export const FillFieldArgsSchema = z.object({
  ref: z.string().min(1).max(20),
  value: z.string().max(2000),
});
export type FillFieldArgs = z.infer<typeof FillFieldArgsSchema>;

export const ScrollArgsSchema = z.object({
  direction: z.enum(['up', 'down', 'top', 'bottom']).default('down'),
  amount: z.enum(['small', 'half', 'page']).default('half').optional(),
  ref: z.string().optional(),
});
export type ScrollArgs = z.infer<typeof ScrollArgsSchema>;

export const ReadTextArgsSchema = z.object({
  ref: z.string().optional(),
  scope: z.enum(['page', 'main', 'selection']).default('main').optional(),
  maxChars: z.number().int().positive().max(10000).default(3000).optional(),
});
export type ReadTextArgs = z.infer<typeof ReadTextArgsSchema>;

export const SetAdaptationArgsSchema = z.object({
  textScale: z.number().min(0.8).max(2.5).optional(),
  contrastTheme: z.enum(['default', 'light', 'dark', 'high-contrast']).optional(),
  largeTargets: z.boolean().optional(),
  focusHighlight: z.boolean().optional(),
  readingRuler: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
});
export type SetAdaptationArgs = z.infer<typeof SetAdaptationArgsSchema>;

export const SayArgsSchema = z.object({
  text: z.string().min(1).max(1000),
});
export type SayArgs = z.infer<typeof SayArgsSchema>;

export const FinishArgsSchema = z.object({
  summary: z.string().min(1).max(2000),
  status: z.enum(['success', 'partial', 'failed']).default('success'),
});
export type FinishArgs = z.infer<typeof FinishArgsSchema>;

export const ToolCallSchema = z.discriminatedUnion('name', [
  z.object({ name: z.literal('observe_page'), args: ObservePageArgsSchema }),
  z.object({ name: z.literal('find_elements'), args: FindElementsArgsSchema }),
  z.object({ name: z.literal('click'), args: ClickArgsSchema }),
  z.object({ name: z.literal('fill_field'), args: FillFieldArgsSchema }),
  z.object({ name: z.literal('scroll'), args: ScrollArgsSchema }),
  z.object({ name: z.literal('read_text'), args: ReadTextArgsSchema }),
  z.object({ name: z.literal('set_adaptation'), args: SetAdaptationArgsSchema }),
  z.object({ name: z.literal('say'), args: SayArgsSchema }),
  z.object({ name: z.literal('finish'), args: FinishArgsSchema }),
]);
export type ToolCall = z.infer<typeof ToolCallSchema>;

export interface ActionOutcome {
  ok: boolean;
  errorCode?: string;
  message?: string;
  domChanged?: boolean;
  urlChanged?: boolean;
  data?: unknown;
}

export type ToolResult =
  | { ok: true; data?: unknown; outcome?: ActionOutcome }
  | { ok: false; error: { code: string; message: string; hint?: string } };

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: 'observe_page',
    description: 'Get an accessibility snapshot of elements on the current active web page.',
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['interactive', 'content', 'form'],
          description: 'Type of snapshot: interactive elements (default), readable text, or form fields.',
        },
        viewportOnly: {
          type: 'boolean',
          description: 'If true, only returns elements visible in the current viewport.',
        },
      },
    },
  },
  {
    name: 'find_elements',
    description: 'Search for elements on the page by visible text, label, placeholder, or role.',
    risk: 'none',
    parameters: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'The text, label, or role to search for.' },
        role: { type: 'string', description: 'Optional role filter e.g. button, link, textbox.' },
      },
    },
  },
  {
    name: 'click',
    description: 'Click an interactive element identified by its ref code (e.g. e1, e4).',
    risk: 'low',
    parameters: {
      type: 'object',
      required: ['ref'],
      properties: {
        ref: { type: 'string', description: 'The element ref code, e.g. "e3".' },
      },
    },
  },
  {
    name: 'fill_field',
    description: 'Fill text into an input field or textarea identified by its ref code.',
    risk: 'low',
    parameters: {
      type: 'object',
      required: ['ref', 'value'],
      properties: {
        ref: { type: 'string', description: 'The input element ref code, e.g. "e5".' },
        value: { type: 'string', description: 'The text value to enter.' },
      },
    },
  },
  {
    name: 'scroll',
    description: 'Scroll the active page up, down, to the top, to the bottom, or to a specific element.',
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down', 'top', 'bottom'] },
        amount: { type: 'string', enum: ['small', 'half', 'page'] },
        ref: { type: 'string', description: 'Optional ref code of an element to scroll into view.' },
      },
    },
  },
  {
    name: 'read_text',
    description: 'Extract readable text from the main article, entire page, or a specific element.',
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Optional element ref code to extract text from.' },
        scope: { type: 'string', enum: ['page', 'main', 'selection'] },
        maxChars: { type: 'number', description: 'Maximum characters to extract (default 3000).' },
      },
    },
  },
  {
    name: 'set_adaptation',
    description: 'Adjust the user accessibility adaptations (font size, high contrast, target size, reading ruler).',
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        textScale: { type: 'number', description: 'Font scale multiplier (0.8 to 2.5, e.g. 1.25 for 125%).' },
        contrastTheme: { type: 'string', enum: ['default', 'light', 'dark', 'high-contrast'] },
        largeTargets: { type: 'boolean', description: 'Enlarge click target sizes.' },
        focusHighlight: { type: 'boolean', description: 'Show strong focus indicator.' },
        readingRuler: { type: 'boolean', description: 'Enable reading ruler guide.' },
        reduceMotion: { type: 'boolean', description: 'Reduce animations.' },
      },
    },
  },
  {
    name: 'say',
    description: 'Provide an interim spoken or visual progress update to the user.',
    risk: 'none',
    parameters: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string', description: 'The status message to communicate.' },
      },
    },
  },
  {
    name: 'finish',
    description: 'Conclude the current task and report the outcome to the user.',
    risk: 'none',
    parameters: {
      type: 'object',
      required: ['summary'],
      properties: {
        summary: { type: 'string', description: 'Clear summary of what was accomplished or observed.' },
        status: { type: 'string', enum: ['success', 'partial', 'failed'] },
      },
    },
  },
];
