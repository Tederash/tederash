import type { PageState, ToolResult } from '../../../shared/tools';

const MAX_VALUE_CHARS = 60;

function quote(v: string): string {
  const t = v.replace(/\s+/g, ' ');
  return `"${t.length > MAX_VALUE_CHARS ? `${t.slice(0, MAX_VALUE_CHARS)}…` : t}"`;
}

/** Compact, line-per-control rendering of the Page Model (token-budget friendly). */
export function formatPageState(state: PageState): string {
  const lines: string[] = [`Page: "${state.title}" (${state.url})`];
  if (state.dialog) {
    lines.push(`OPEN DIALOG: "${state.dialog.title}"${state.dialog.text ? ` — ${state.dialog.text}` : ''}`);
  }
  if (state.headings.length) lines.push(`Headings: ${state.headings.join(' / ')}`);
  if (state.fields.length) {
    lines.push('Fields (handle | label | type | state):');
    for (const f of state.fields) {
      const parts = [f.handle, f.label, f.kind];
      if (f.required) parts.push('required');
      if (f.disabled) parts.push('disabled');
      if (f.sensitive) parts.push(f.filled ? 'filled (private)' : 'empty (private — user must fill)');
      else if (f.kind === 'checkbox' || f.kind === 'switch') parts.push(f.checked ? 'checked' : 'unchecked');
      else parts.push(f.value ? `value ${quote(f.value)}` : 'empty');
      if (f.options?.length) parts.push(`options: ${f.options.join(', ')}`);
      if (f.error) parts.push(`ERROR: ${f.error}`);
      lines.push(`- ${parts.join(' | ')}`);
    }
  } else {
    lines.push('Fields: none');
  }
  if (state.buttons.length) {
    lines.push('Buttons:');
    for (const b of state.buttons) {
      lines.push(`- ${b.handle} | ${b.label}${b.submit ? ' | submits form' : ''}${b.disabled ? ' | disabled' : ''}`);
    }
  }
  return lines.join('\n');
}

/** What the model sees for a tool result: short summary, plus data only where it is the point. */
export function toModelToolOutput(tool: string, result: ToolResult): unknown {
  if (!result.ok) {
    const { code, message, hint, candidates } = result.error;
    return { ok: false, code, message, ...(hint ? { hint } : {}), ...(candidates?.length ? { candidates } : {}) };
  }
  const summary = result.outcome?.message ?? 'Done.';
  if (tool === 'page_state' && result.data) return formatPageState(result.data as PageState);
  if (tool === 'inspect_page' || tool === 'find' || tool === 'tederash_detect') {
    return { ok: true, summary, data: result.data };
  }
  return { ok: true, summary };
}
