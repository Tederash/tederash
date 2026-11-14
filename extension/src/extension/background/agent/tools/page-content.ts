import { tool } from 'ai';
import { z } from 'zod';
import type { ToolExecutionContext } from './types';

export function createPageContentTools(ctx: ToolExecutionContext) {
  return {
    inspect_page: tool({
      description:
        'Read structured page content including page title, heading hierarchy (H1-H6), navigation landmarks, and clean body text to understand the page without guessing element counts.',
      inputSchema: z.object({
        detail: z
          .enum(['summary', 'full'])
          .optional()
          .describe('Level of detail: "summary" for overview or "full" for full readable body text'),
      }),
      execute: async (args: { detail?: 'summary' | 'full' }) =>
        ctx.execute('inspect_page', args),
    }),

    observe_page: tool({
      description:
        'Capture layout snapshot of active page layout, interactive elements, headings, and accessibility landmarks.',
      inputSchema: z.object({
        mode: z
          .enum(['interactive', 'content', 'form'])
          .optional()
          .describe('Observation mode: interactive elements, textual content, or form controls'),
        viewportOnly: z
          .boolean()
          .optional()
          .describe('Limit observation to elements currently inside the visible viewport'),
      }),
      execute: async (args: { mode?: 'interactive' | 'content' | 'form'; viewportOnly?: boolean }) =>
        ctx.execute('observe_page', args),
    }),

    find_elements: tool({
      description:
        'Search for specific interactive elements by visible text query, aria-label, or placeholder, with an optional role filter.',
      inputSchema: z.object({
        query: z
          .string()
          .describe('Search query matching element text, aria-label, or placeholder'),
        role: z
          .string()
          .optional()
          .describe('Optional ARIA role filter, e.g. button, input, link, checkbox'),
      }),
      execute: async (args: { query: string; role?: string }) =>
        ctx.execute('find_elements', args),
    }),

    read_text: tool({
      description:
        'Extract clean readable article or main text content from the page or a target selector container.',
      inputSchema: z.object({
        ref: z
          .string()
          .optional()
          .describe('Optional element ref code from observe_page'),
        scope: z
          .enum(['page', 'main', 'selection'])
          .optional()
          .describe('Text extraction scope'),
        maxChars: z
          .number()
          .optional()
          .describe('Maximum number of characters to read (up to 10000)'),
      }),
      execute: async (args: { ref?: string; scope?: 'page' | 'main' | 'selection'; maxChars?: number }) =>
        ctx.execute('read_text', args),
    }),
  };
}
