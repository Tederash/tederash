import type { AgentStreamEvent, ToolCallItem } from '../../../shared/messages';
import type { ToolCall, ToolResult } from '../../../shared/tools';

export type AgentStreamListener = (event: AgentStreamEvent) => void;

export function formatStepRationale(call: ToolCall): string {
  switch (call.name) {
    case 'inspect_form':
      return 'Inspecting form layout, required input fields, and validation requirements.';
    case 'inspect_page':
      return 'Reading page structure, landmark sections, headings, and readable content.';
    case 'tederash_get_tree':
      return 'Inspecting Tederash accessible component tree to discover required form fields, controls, and states.';
    case 'tederash_detect':
      return 'Checking page for Tederash accessibility runtime and active profile.';
    case 'tederash_explain_field':
      return `Inspecting instructions and validation constraints for field [${(call.args as any).componentId}].`;
    case 'tederash_set_profile':
      return `Switching accessibility profile to "${(call.args as any).profileId}".`;
    case 'tederash_update_pref':
      return 'Updating accessibility preferences on page.';
    case 'tederash_announce':
      return `Broadcasting accessible live region announcement: "${(call.args as any).message}".`;
    case 'tederash_interact':
      return `Interacting with Tederash component [${(call.args as any).componentId}] (${(call.args as any).action}).`;
    case 'observe_page':
      return 'Observing web page layout, interactive elements, and accessibility landmarks.';
    case 'find_elements':
      return `Searching for interactive elements matching "${(call.args as any).query}".`;
    case 'click':
      return `Clicking interactive element [${(call.args as any).ref}].`;
    case 'fill_field':
      return `Entering text into input field [${(call.args as any).ref}].`;
    case 'scroll':
      return `Scrolling page ${(call.args as any).direction}.`;
    case 'read_text':
      return 'Extracting readable article text from the page.';
    case 'say':
      return `Speaking aloud: "${(call.args as any).text}".`;
    case 'finish':
      return `Task completed: ${(call.args as any).summary}.`;
    default:
      return `Executing ${(call as any).name}`;
  }
}

export function getActiveVerb(toolName?: string): string {
  switch (toolName) {
    case 'inspect_form':
      return 'Inspecting form fields...';
    case 'inspect_page':
      return 'Reading page content...';
    case 'tederash_get_tree':
      return 'Inspecting accessible components...';
    case 'tederash_explain_field':
      return 'Analyzing form field constraints...';
    case 'observe_page':
      return 'Observing page layout...';
    case 'find_elements':
      return 'Searching elements...';
    case 'click':
    case 'tederash_interact':
      return 'Clicking control...';
    case 'fill_field':
      return 'Entering field value...';
    case 'read_text':
      return 'Reading page content...';
    case 'tederash_update_pref':
    case 'tederash_set_profile':
      return 'Applying accessibility settings...';
    case 'tederash_announce':
    case 'say':
      return 'Speaking announcement...';
    default:
      return 'Thinking...';
  }
}

export function formatStepSummary(call: ToolCall, result: ToolResult): string {
  if (!result.ok) {
    return result.error?.message || `Failed to execute ${call.name}`;
  }
  switch (call.name) {
    case 'inspect_form': {
      const data = result.data as any;
      return `Discovered ${data?.totalFields || 0} form field(s).`;
    }
    case 'inspect_page': {
      const data = result.data as any;
      return `Read page "${data?.title || 'page'}" with ${data?.headings?.length || 0} headings.`;
    }
    case 'tederash_get_tree': {
      const data = result.data as any;
      return `Retrieved ${Array.isArray(data) ? data.length : 0} accessible components.`;
    }
    case 'observe_page':
      return 'Captured page layout snapshot.';
    case 'click':
      return `Clicked element [${(call.args as any).ref}].`;
    case 'fill_field':
      return `Filled [${(call.args as any).ref}].`;
    default:
      return result.outcome?.message || `Completed ${call.name}`;
  }
}
