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
          .nullish()
          .describe('Level of detail: "summary" for overview or "full" for full readable body text'),
      }),
      execute: async (args) =>
        ctx.execute('inspect_page', args),
    }),

    observe_page: tool({
      description:
        'Capture layout snapshot of active page layout, interactive elements, headings, and accessibility landmarks.',
      inputSchema: z.object({
        mode: z
          .enum(['interactive', 'content', 'form'])
          .nullish()
          .describe('Observation mode: interactive elements, textual content, or form controls'),
        viewportOnly: z
          .boolean()
          .nullish()
          .describe('Limit observation to elements currently inside the visible viewport'),
      }),
      execute: async (args) =>
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
          .nullish()
          .describe('Optional ARIA role filter, e.g. button, input, link, checkbox'),
      }),
      execute: async (args) =>
        ctx.execute('find_elements', args),
    }),

    read_text: tool({
      description:
        'Extract clean readable article or main text content from the page or a target selector container.',
      inputSchema: z.object({
        ref: z
          .string()
          .nullish()
          .describe('Optional element ref code from observe_page'),
        scope: z
          .enum(['page', 'main', 'selection'])
          .nullish()
          .describe('Text extraction scope'),
        maxChars: z
          .number()
          .nullish()
          .describe('Maximum number of characters to read (up to 10000)'),
      }),
      execute: async (args) =>
        ctx.execute('read_text', args),
    }),
  };
}
