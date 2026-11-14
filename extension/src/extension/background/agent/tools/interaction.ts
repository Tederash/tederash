import { tool } from 'ai';
import { z } from 'zod';
import type { ToolExecutionContext } from './types';

export function createInteractionTools(ctx: ToolExecutionContext) {
  return {
    click: tool({
      description:
        'Click an interactive element identified by its ref code from observe_page (e.g. e1, e2).',
      inputSchema: z.object({
        ref: z.string().describe('Element ref code from observe_page'),
      }),
      execute: async (args: { ref: string }) =>
        ctx.execute('click', args),
    }),

    fill_field: tool({
      description:
        'Fill an input field or textarea with text value using its ref code.',
      inputSchema: z.object({
        ref: z.string().describe('Input element ref code from observe_page'),
        value: z.string().describe('Text string to enter into the field'),
      }),
      execute: async (args: { ref: string; value: string }) =>
        ctx.execute('fill_field', args),
    }),

    scroll: tool({
      description:
        'Scroll the active web page up, down, to top, or to bottom.',
      inputSchema: z.object({
        direction: z
          .enum(['up', 'down', 'top', 'bottom'])
          .describe('Direction to scroll'),
        amount: z
          .enum(['small', 'half', 'page'])
          .optional()
          .describe('Distance to scroll'),
        ref: z
          .string()
          .optional()
          .describe('Optional element ref code to scroll into view'),
      }),
      execute: async (args: {
        direction: 'up' | 'down' | 'top' | 'bottom';
        amount?: 'small' | 'half' | 'page';
        ref?: string;
      }) => ctx.execute('scroll', args),
    }),

    tederash_interact: tool({
      description:
        'Interact directly with an accessible Tederash component (click, focus, fill text, toggle checkbox, or select option).',
      inputSchema: z.object({
        componentId: z
          .string()
          .describe('The data-tederash-id of the target component (e.g. submit-btn, email-input)'),
        action: z
          .enum(['click', 'focus', 'fill', 'toggle', 'select'])
          .describe('Interaction action to perform'),
        value: z
          .string()
          .optional()
          .describe('Value to fill into input or select'),
      }),
      execute: async (args: {
        componentId: string;
        action: 'click' | 'focus' | 'fill' | 'toggle' | 'select';
        value?: string;
      }) => ctx.execute('tederash_interact', args),
    }),
  };
}
