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

export const TederashDetectArgsSchema = z.object({});
export type TederashDetectArgs = z.infer<typeof TederashDetectArgsSchema>;

export const TederashGetTreeArgsSchema = z.object({});
export type TederashGetTreeArgs = z.infer<typeof TederashGetTreeArgsSchema>;

export const TederashSetProfileArgsSchema = z.object({
  profileId: z.string().min(1).max(50),
});
export type TederashSetProfileArgs = z.infer<typeof TederashSetProfileArgsSchema>;

export const TederashUpdatePrefArgsSchema = z.object({
  fontScale: z.number().min(0.8).max(2.5).optional(),
  highContrast: z.boolean().optional(),
  targetSize: z.enum(['normal', 'large', 'extra-large']).optional(),
  simplifiedLanguage: z.boolean().optional(),
  showInstructions: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
});
export type TederashUpdatePrefArgs = z.infer<typeof TederashUpdatePrefArgsSchema>;

export const TederashAnnounceArgsSchema = z.object({
  message: z.string().min(1).max(1000),
  priority: z.enum(['polite', 'assertive']).default('polite').optional(),
});
export type TederashAnnounceArgs = z.infer<typeof TederashAnnounceArgsSchema>;

export const TederashInteractArgsSchema = z.object({
  componentId: z.string().min(1).max(100),
  action: z.enum(['click', 'focus', 'fill', 'toggle', 'select']),
  value: z.string().max(2000).optional(),
});
export type TederashInteractArgs = z.infer<typeof TederashInteractArgsSchema>;

export const TederashExplainFieldArgsSchema = z.object({
  componentId: z.string().min(1).max(100),
});
export type TederashExplainFieldArgs = z.infer<typeof TederashExplainFieldArgsSchema>;

export const InspectFormArgsSchema = z.object({
  formSelector: z.string().optional(),
});
export type InspectFormArgs = z.infer<typeof InspectFormArgsSchema>;

export const InspectPageArgsSchema = z.object({
  detail: z.enum(['summary', 'full']).default('summary').optional(),
});
export type InspectPageArgs = z.infer<typeof InspectPageArgsSchema>;

export const ToolCallSchema = z.discriminatedUnion('name', [
  z.object({ name: z.literal('observe_page'), args: ObservePageArgsSchema }),
  z.object({ name: z.literal('inspect_page'), args: InspectPageArgsSchema }),
  z.object({ name: z.literal('inspect_form'), args: InspectFormArgsSchema }),
  z.object({ name: z.literal('find_elements'), args: FindElementsArgsSchema }),
  z.object({ name: z.literal('click'), args: ClickArgsSchema }),
  z.object({ name: z.literal('fill_field'), args: FillFieldArgsSchema }),
  z.object({ name: z.literal('scroll'), args: ScrollArgsSchema }),
  z.object({ name: z.literal('read_text'), args: ReadTextArgsSchema }),
  z.object({ name: z.literal('set_adaptation'), args: SetAdaptationArgsSchema }),
  z.object({ name: z.literal('say'), args: SayArgsSchema }),
  z.object({ name: z.literal('finish'), args: FinishArgsSchema }),
  z.object({ name: z.literal('tederash_detect'), args: TederashDetectArgsSchema }),
  z.object({ name: z.literal('tederash_get_tree'), args: TederashGetTreeArgsSchema }),
  z.object({ name: z.literal('tederash_set_profile'), args: TederashSetProfileArgsSchema }),
  z.object({ name: z.literal('tederash_update_pref'), args: TederashUpdatePrefArgsSchema }),
  z.object({ name: z.literal('tederash_announce'), args: TederashAnnounceArgsSchema }),
  z.object({ name: z.literal('tederash_interact'), args: TederashInteractArgsSchema }),
  z.object({ name: z.literal('tederash_explain_field'), args: TederashExplainFieldArgsSchema }),
]);
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type ToolName = ToolCall['name'];

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
  {
    name: 'tederash_detect',
    description: 'Check if the active page runs Tederash runtime and inspect its version and active profile.',
    risk: 'none',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'tederash_get_tree',
    description: 'Get all semantic Tederash UI components on the page (buttons, inputs, select, dialogs, checkboxes, textareas) with their current state, errors, and IDs.',
    risk: 'none',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'tederash_set_profile',
    description: 'Switch the accessibility profile dynamically (e.g., standard, low-vision, motor-assist, cognitive-assist, keyboard-only).',
    risk: 'low',
    parameters: {
      type: 'object',
      required: ['profileId'],
      properties: {
        profileId: { type: 'string', description: 'ID of the profile to activate (e.g. low-vision, motor-assist, cognitive-assist, standard).' },
      },
    },
  },
  {
    name: 'tederash_update_pref',
    description: 'Update specific accessibility preferences on the active page (font scale, contrast, target sizes, simplified language).',
    risk: 'low',
    parameters: {
      type: 'object',
      properties: {
        fontScale: { type: 'number', description: 'Font scale multiplier (0.8 to 2.5).' },
        highContrast: { type: 'boolean', description: 'Enable high-contrast borders and text.' },
        targetSize: { type: 'string', enum: ['normal', 'large', 'extra-large'] },
        simplifiedLanguage: { type: 'boolean', description: 'Simplify instructions and descriptions.' },
        showInstructions: { type: 'boolean', description: 'Display guided instructional helpers.' },
        reduceMotion: { type: 'boolean', description: 'Disable motion and transitions.' },
      },
    },
  },
  {
    name: 'tederash_announce',
    description: 'Trigger an accessible announcement on the page via the Tederash LiveRegion.',
    risk: 'none',
    parameters: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', description: 'The text message to announce to screen readers and visual alerts.' },
        priority: { type: 'string', enum: ['polite', 'assertive'] },
      },
    },
  },
  {
    name: 'tederash_interact',
    description: 'Directly click, focus, fill, toggle, or select a Tederash component using its ID.',
    risk: 'low',
    parameters: {
      type: 'object',
      required: ['componentId', 'action'],
      properties: {
        componentId: { type: 'string', description: 'The data-tederash-id of the target component.' },
        action: { type: 'string', enum: ['click', 'focus', 'fill', 'toggle', 'select'] },
        value: { type: 'string', description: 'Value to fill or select (for fill or select actions).' },
      },
    },
  },
  {
    name: 'tederash_explain_field',
    description: 'Retrieve semantic description, requirements, and error details of a Tederash form field to assist the user.',
    risk: 'none',
    parameters: {
      type: 'object',
      required: ['componentId'],
      properties: {
        componentId: { type: 'string', description: 'The data-tederash-id of the field.' },
      },
    },
  },
  {
    name: 'inspect_form',
    description: 'Perform deep inspection of forms on the page, extracting all input fields, labels, required attributes, types, placeholders, errors, and submit buttons.',
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        formSelector: { type: 'string', description: 'Optional selector to target a specific form container.' },
      },
    },
  },
  {
    name: 'inspect_page',
    description: 'Read the comprehensive textual and semantic structure of the page, including title, main headings, readable body text, landmarks, and summary.',
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        detail: { type: 'string', enum: ['summary', 'full'], description: 'Level of page detail to inspect.' },
      },
    },
  },
];
