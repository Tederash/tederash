import { createAccessibilityTools } from './accessibility';
import { createComponentTreeTools } from './component-tree';
import { createFormInspectorTools } from './form-inspector';
import { createInteractionTools } from './interaction';
import { createPageContentTools } from './page-content';
import type { ToolExecutionContext } from './types';

export * from './accessibility';
export * from './component-tree';
export * from './form-inspector';
export * from './interaction';
export * from './page-content';
export * from './types';

export function getAgentTools(ctx: ToolExecutionContext) {
  return {
    ...createFormInspectorTools(ctx),
    ...createPageContentTools(ctx),
    ...createComponentTreeTools(ctx),
    ...createInteractionTools(ctx),
    ...createAccessibilityTools(ctx),
  };
}
