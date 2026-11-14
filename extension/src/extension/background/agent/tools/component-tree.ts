import { tool } from 'ai';
import { z } from 'zod';
import type { ToolExecutionContext } from './types';

export function createComponentTreeTools(ctx: ToolExecutionContext) {
  return {
    tederash_detect: tool({
      description:
        'Check if the page runs the Tederash accessibility runtime and view its version, active profile, and locale.',
      inputSchema: z.object({}),
      execute: async () =>
        ctx.execute('tederash_detect', {}),
    }),

    tederash_get_tree: tool({
      description:
        'Retrieve semantic hierarchy of all Tederash components on page (buttons, inputs, selects, dialogs, checkboxes) with their IDs, labels, values, required status, and errors.',
      inputSchema: z.object({}),
      execute: async () =>
        ctx.execute('tederash_get_tree', {}),
    }),
  };
}
