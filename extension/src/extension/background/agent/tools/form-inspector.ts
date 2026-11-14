import { tool } from 'ai';
import { z } from 'zod';
import type { ToolExecutionContext } from './types';

export function createFormInspectorTools(ctx: ToolExecutionContext) {
  return {
    inspect_form: tool({
      description:
        'Inspect forms on the active page to discover all interactive fields, their labels, input types, required status, validation rules, current errors, and submit buttons.',
      inputSchema: z.object({
        formSelector: z
          .string()
          .optional()
          .describe('Optional CSS selector targeting a specific form container'),
      }),
      execute: async (args: { formSelector?: string }) =>
        ctx.execute('inspect_form', args),
    }),

    tederash_explain_field: tool({
      description:
        'Retrieve semantic instructions, requirements, validation constraints, and error details of a specific Tederash form field to guide the user.',
      inputSchema: z.object({
        componentId: z
          .string()
          .describe('The data-tederash-id of the target form field (e.g. email, password)'),
      }),
      execute: async (args: { componentId: string }) =>
        ctx.execute('tederash_explain_field', args),
    }),
  };
}
