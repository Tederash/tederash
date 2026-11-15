import type {
  ChooseArgs,
  FillArgs,
  FillFormArgs,
  FindArgs,
  PageButton,
  PageField,
  SetCheckedArgs,
  ToolResult,
} from '../../shared/tools';
import {
  type Candidate,
  buildPageState,
  cleanLabel,
  getPageVersion,
  isSensitiveField,
  normalizeTarget,
  resolveTarget,
} from './resolver';
import { getAccessibleName } from './snapshot';
import { sendBridgeRequest } from './tederash-bridge';

/**
 * Target-based interactions with React/controlled-component guarantees:
 * native value setters + input events, pointer sequences for Radix-style widgets,
 * and a read-back postcondition after every change.
 */

const TEXT_KINDS = new Set(['text', 'email', 'tel', 'url', 'number', 'search', 'textarea', 'editable', 'date', 'time', 'datetime-local', 'month', 'week']);

const nextFrames = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== 'function') return setTimeout(resolve, 16);
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fail(code: string, message: string, extra: { hint?: string; candidates?: Candidate[] } = {}): ToolResult {
  return { ok: false, error: { code, message, ...extra } };
}

function ok(message: string, data?: unknown): ToolResult {
  return { ok: true, data, outcome: { ok: true, message, domChanged: true, data: { pageVersion: getPageVersion() } } };
}

function unresolved(target: string, res: { status: string; candidates: Candidate[] }): ToolResult {
  const list = res.candidates.map((c) => `"${c.label}" (${c.handle})`).join(', ');
  if (res.status === 'AMBIGUOUS') {
    return fail('AMBIGUOUS', `"${target}" matches more than one control: ${list}.`, {
      candidates: res.candidates,
      hint: 'Use one of the handles, or ask the user which one they meant.',
    });
  }
  return fail('NOT_FOUND', `No control matching "${target}" was found${list ? `. Closest: ${list}` : ''}.`, {
    candidates: res.candidates,
    hint: 'Check PAGE STATE for the exact label or handle.',
  });
}

function revealAndFocus(el: HTMLElement): void {
  el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
  el.focus({ preventScroll: true });
}

/** Pointer + mouse sequence (Radix opens on pointerdown), then a single click. */
export function pointerActivate(el: HTMLElement): void {
  const opts = { bubbles: true, cancelable: true, button: 0, buttons: 1 };
  const PointerCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  el.dispatchEvent(new PointerCtor('pointerdown', { ...opts, pointerType: 'mouse' } as PointerEventInit));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerCtor('pointerup', { ...opts, buttons: 0, pointerType: 'mouse' } as PointerEventInit));
  el.dispatchEvent(new MouseEvent('mouseup', { ...opts, buttons: 0 }));
  el.click();
}

/** Sets a value the way React's onChange expects (native setter, then input/change). */
export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  if (el instanceof HTMLSelectElement) {
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  const InputCtor = typeof InputEvent === 'function' ? InputEvent : Event;
  el.dispatchEvent(new InputCtor('input', { bubbles: true, inputType: 'insertReplacementText', data: value } as InputEventInit));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

const BRIDGE_TIMEOUT_MS = 800;

/**
 * Tederash path: ask the page's own React components to change state
 * (`tederash:interact`). Returns false when the page has no Tederash runtime, the
 * component is not registered, or it refused; callers then use the DOM path.
 */
async function viaBridge(el: HTMLElement, action: 'fill' | 'choose' | 'setChecked', value: string | boolean): Promise<boolean> {
  const id = el.getAttribute('data-tederash-id');
  if (!id || !document.documentElement.hasAttribute('data-tederash-root')) return false;
  const res = await sendBridgeRequest('tederash:interact', { id, action, value }, BRIDGE_TIMEOUT_MS);
  if (!res.ok) return false;
  await nextFrames();
  return true;
}

function describeField(el: HTMLElement): string {
  return cleanLabel(el.getAttribute('data-tederash-label') || getAccessibleName(el)) || 'field';
}

function currentError(el: HTMLElement): string | undefined {
  const ted = el.getAttribute('data-tederash-error');
  if (ted) return ted;
  if (el.getAttribute('aria-invalid') !== 'true') return undefined;
  const ids = (el.getAttribute('aria-errormessage') || el.getAttribute('aria-describedby') || '').split(/\s+/);
  return ids.map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ') || 'Invalid value';
}

function blockedState(el: HTMLElement, label: string): ToolResult | undefined {
  if ((el as HTMLInputElement).disabled || el.getAttribute('aria-disabled') === 'true') {
    return fail('DISABLED', `"${label}" is disabled.`);
  }
  if ((el as HTMLInputElement).readOnly || el.getAttribute('aria-readonly') === 'true') {
    return fail('READ_ONLY', `"${label}" is read-only.`);
  }
  return undefined;
}

// ---------------------------------------------------------------------------

export function pageState(): ToolResult {
  const state = buildPageState();
  return { ok: true, data: state, outcome: { ok: true, message: `Read ${state.fields.length} fields on "${state.title}".` } };
}

export function find(args: FindArgs): ToolResult {
  const res = resolveTarget(args.query, args.kind ?? 'any');
  if (res.status === 'RESOLVED') {
    return { ok: true, data: [res.entry.info], outcome: { ok: true, message: `Found "${res.entry.info.label}" (${res.entry.info.handle}).` } };
  }
  return {
    ok: true,
    data: res.candidates,
    outcome: { ok: true, message: res.candidates.length ? `Found ${res.candidates.length} possible matches for "${args.query}".` : `Nothing matches "${args.query}".` },
  };
}

export async function fill(args: FillArgs): Promise<ToolResult> {
  const res = resolveTarget(args.target, 'field', (i) => TEXT_KINDS.has((i as PageField).kind) || (i as PageField).kind === 'password');
  if (res.status !== 'RESOLVED') return unresolved(args.target, res);
  const el = res.entry.el;
  const label = res.entry.info.label;
  if (isSensitiveField(el)) {
    return fail('POLICY_BLOCKED', `For your security I don't type into "${label}". Please fill it in yourself.`);
  }
  const blocked = blockedState(el, label);
  if (blocked) return blocked;

  revealAndFocus(el);
  const input = el as HTMLInputElement | HTMLTextAreaElement;
  const bridged = !el.isContentEditable && (await viaBridge(el, 'fill', args.value));
  if (bridged && input.value === args.value.trim()) {
    // Done through the component itself.
  } else if (el.isContentEditable) {
    document.getSelection()?.selectAllChildren(el);
    document.execCommand('insertText', false, args.value);
  } else {
    setNativeValue(input, args.value);
    await nextFrames();
    if (input.value !== args.value) {
      // Some controlled inputs reset programmatic values; typing via execCommand goes through them.
      input.select();
      document.execCommand('insertText', false, args.value);
      await nextFrames();
    }
    if (input.value !== args.value) {
      const max = input.maxLength > 0 ? ` (it accepts at most ${input.maxLength} characters)` : '';
      return fail('VALUE_REJECTED', `"${label}" did not accept the value${max}. It now contains "${input.value}".`);
    }
  }
  el.dispatchEvent(new FocusEvent('blur'));
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  await nextFrames();
  const error = currentError(el);
  if (error) {
    return fail('VALIDATION_ERROR', `"${label}" was set to "${args.value}" but shows an error: ${error}`);
  }
  const finalValue = el.isContentEditable ? args.value : input.value;
  return ok(`${label} = "${finalValue}"`, { handle: res.entry.info.handle, label, value: finalValue });
}

function matchOption<T>(items: T[], text: (t: T) => string, wanted: string): T | undefined {
  const w = normalizeTarget(wanted);
  return (
    items.find((i) => normalizeTarget(text(i)) === w) ??
    items.find((i) => normalizeTarget(text(i)).startsWith(w)) ??
    items.find((i) => normalizeTarget(text(i)).includes(w))
  );
}

async function waitFor<T>(fn: () => T | null | undefined, timeoutMs: number): Promise<T | undefined> {
  const start = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - start > timeoutMs) return undefined;
    await wait(50);
  }
}

export async function choose(args: ChooseArgs): Promise<ToolResult> {
  const res = resolveTarget(args.target, 'field', (i) => ['select', 'combobox', 'radio'].includes((i as PageField).kind));
  if (res.status !== 'RESOLVED') return unresolved(args.target, res);
  const { el, info, members } = res.entry;
  const label = info.label;
  const blocked = blockedState(el, label);
  if (blocked) return blocked;

  if (info.kind === 'combobox' && (await viaBridge(el, 'choose', args.option))) {
    const shown = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    return ok(`${label} = "${shown || args.option}"`);
  }

  if (el instanceof HTMLSelectElement) {
    const option = matchOption(Array.from(el.options), (o) => o.textContent ?? o.value, args.option);
    if (!option) return fail('NOT_FOUND', `"${label}" has no option "${args.option}". Options: ${Array.from(el.options).map((o) => o.textContent?.trim()).join(', ')}.`);
    revealAndFocus(el);
    setNativeValue(el, option.value);
    await nextFrames();
    return el.value === option.value
      ? ok(`${label} = "${option.textContent?.trim()}"`)
      : fail('VALUE_REJECTED', `"${label}" did not keep "${option.textContent?.trim()}".`);
  }

  if (info.kind === 'radio' && members) {
    const radio = matchOption(members, (r) => describeField(r), args.option);
    if (!radio) return fail('NOT_FOUND', `"${label}" has no option "${args.option}". Options: ${(info as PageField).options?.join(', ')}.`);
    revealAndFocus(radio);
    pointerActivate(radio);
    await nextFrames();
    return radio.checked ? ok(`${label} = "${describeField(radio)}"`) : fail('VALUE_REJECTED', `Could not select "${args.option}" in "${label}".`);
  }

  // ARIA / Radix combobox: open, pick the option from the (portalled) listbox, verify.
  revealAndFocus(el);
  if (el.getAttribute('aria-expanded') !== 'true') pointerActivate(el);
  const listbox = await waitFor(() => {
    const id = el.getAttribute('aria-controls');
    return (id && document.getElementById(id)) || document.querySelector<HTMLElement>('[role="listbox"]');
  }, 1500);
  if (!listbox) return fail('NOT_EDITABLE', `"${label}" did not open its list of options.`);
  const options = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
  const option = matchOption(options, (o) => o.textContent ?? '', args.option);
  if (!option) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return fail('NOT_FOUND', `"${label}" has no option "${args.option}". Options: ${options.map((o) => o.textContent?.trim()).join(', ')}.`);
  }
  const optionText = option.textContent?.trim() ?? args.option;
  pointerActivate(option);
  await waitFor(() => (el.getAttribute('aria-expanded') !== 'true' ? true : null), 1000);
  await nextFrames();
  const shown = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return shown.includes(optionText)
    ? ok(`${label} = "${optionText}"`)
    : fail('VALUE_REJECTED', `"${label}" did not keep "${optionText}".`);
}

export async function setChecked(args: SetCheckedArgs): Promise<ToolResult> {
  const res = resolveTarget(args.target, 'field', (i) => ['checkbox', 'switch'].includes((i as PageField).kind));
  if (res.status !== 'RESOLVED') return unresolved(args.target, res);
  const { el, info } = res.entry;
  const blocked = blockedState(el, info.label);
  if (blocked) return blocked;
  const read = () =>
    el instanceof HTMLInputElement ? el.checked : el.getAttribute('aria-checked') === 'true' || el.getAttribute('data-state') === 'checked';
  if (read() === args.checked) return ok(`"${info.label}" was already ${args.checked ? 'checked' : 'unchecked'}.`);
  revealAndFocus(el);
  if (!(await viaBridge(el, 'setChecked', args.checked)) || read() !== args.checked) {
    pointerActivate(el);
    await nextFrames();
  }
  return read() === args.checked
    ? ok(`"${info.label}" ${args.checked ? 'checked' : 'unchecked'}.`)
    : fail('VALUE_REJECTED', `"${info.label}" did not change.`);
}

export interface FillFormEntryResult {
  target: string;
  ok: boolean;
  message: string;
  code?: string;
}

/**
 * Fills several controls in one round-trip, so a whole form costs one model step
 * instead of one per field. Every entry is attempted: a failure is reported with
 * the others rather than hiding the rest of the work.
 */
export async function fillForm(args: FillFormArgs): Promise<ToolResult> {
  const results: FillFormEntryResult[] = [];

  for (const entry of args.entries) {
    const result =
      entry.kind === 'checked'
        ? await setChecked({ target: entry.target, checked: entry.value.trim().toLowerCase() === 'true' })
        : entry.kind === 'choice'
          ? await choose({ target: entry.target, option: entry.value })
          : await fill({ target: entry.target, value: entry.value });

    results.push(
      result.ok
        ? { target: entry.target, ok: true, message: result.outcome?.message ?? 'Done.' }
        : { target: entry.target, ok: false, message: result.error.message, code: result.error.code }
    );
  }

  const done = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const summary = [
    `Filled ${done.length} of ${results.length}: ${done.map((r) => r.message).join('; ') || 'none'}.`,
    failed.length ? `Not filled: ${failed.map((r) => `${r.target} — ${r.message}`).join('; ')}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    ok: true,
    data: { results, filled: done.length, failed: failed.length, pageVersion: getPageVersion() },
    outcome: {
      ok: failed.length === 0,
      message: summary,
      domChanged: done.length > 0,
      data: { pageVersion: getPageVersion() },
    },
  };
}

export interface ClickTarget {
  el: HTMLElement;
  info: PageButton | PageField;
}

/** Resolves a click target without acting (also used by the policy pre-check). */
export function resolveClick(target: string): ClickTarget | ToolResult {
  const res = resolveTarget(target, 'button');
  if (res.status === 'RESOLVED') return { el: res.entry.el, info: res.entry.info };
  // Fall back to any control (e.g. "click the Terms checkbox").
  const any = resolveTarget(target, 'any');
  if (any.status === 'RESOLVED') return { el: any.entry.el, info: any.entry.info };
  return unresolved(target, res.candidates.length ? res : any);
}

/** Policy pre-check: what would `click` act on? */
export function describeTarget(target: string): ToolResult {
  const resolved = resolveClick(target);
  if ('ok' in resolved) return resolved;
  const { el, info } = resolved;
  const submit = 'submit' in info ? Boolean(info.submit) : false;
  return {
    ok: true,
    data: { text: info.label, role: el.getAttribute('role') || el.tagName.toLowerCase(), submit, kind: info.kind },
  };
}

export async function clickTarget(target: string): Promise<ToolResult> {
  const resolved = resolveClick(target);
  if ('ok' in resolved) return resolved;
  const { el, info } = resolved;
  if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') {
    return fail('DISABLED', `"${info.label}" is disabled.`);
  }
  const before = { url: location.href, version: getPageVersion() };
  revealAndFocus(el);
  pointerActivate(el);
  await wait(150);
  const navigated = location.href !== before.url;
  const result = ok(`Clicked "${info.label}"${navigated ? ' (the page changed)' : ''}.`);
  if (result.ok && result.outcome) result.outcome.urlChanged = navigated;
  return result;
}
