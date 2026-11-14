import Fuse from 'fuse.js';
import type { PageButton, PageField, PageFieldKind, PageState } from '../../shared/tools';
import { getAccessibleName, isElementVisible } from './snapshot';

/**
 * Page Model + target resolution.
 *
 * Handles (`fld:full-legal-name`, `btn:submit-application`) are derived
 * deterministically from labels and document order, so the same control gets the
 * same handle across snapshots and turns without storing DOM pointers.
 * Targets may be a handle or plain words ("Full Name", "the email field").
 */

interface Entry<T> {
  info: T;
  el: HTMLElement;
  /** For radio groups: the individual radios, in order. */
  members?: HTMLInputElement[];
}

const FIELD_SELECTOR =
  'input, textarea, select, [role="combobox"], [role="checkbox"], [role="switch"], [contenteditable="true"]';
const BUTTON_SELECTOR = 'button, input[type="submit"], input[type="button"], [role="button"], a[href]';
const SKIPPED_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'file']);
const SENSITIVE_AUTOCOMPLETE = /^(cc-|one-time-code|current-password|new-password)/;

// ---------------------------------------------------------------------------
// pageVersion: bumps whenever the DOM structure or relevant state changes.

let pageVersion = 0;
let observer: MutationObserver | undefined;

export function getPageVersion(): number {
  if (!observer && typeof MutationObserver !== 'undefined' && document.documentElement) {
    observer = new MutationObserver(() => {
      pageVersion++;
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-invalid', 'disabled', 'aria-expanded', 'data-tederash-error', 'hidden'],
    });
  }
  return pageVersion;
}

// ---------------------------------------------------------------------------
// Labels and handles

export function cleanLabel(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\s*\*\s*/g, ' ')
    .replace(/\((required|optional)\)/gi, '')
    .trim();
}

export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'item'
  );
}

function isHiddenFromUser(el: HTMLElement): boolean {
  return Boolean(el.closest('[aria-hidden="true"], [hidden], [inert]')) || !isElementVisible(el);
}

function labelFor(el: HTMLElement): string {
  const explicit =
    el.getAttribute('data-tederash-label') ||
    el.getAttribute('aria-label') ||
    textOfIds(el.getAttribute('aria-labelledby'));
  if (explicit) return cleanLabel(explicit);
  // <label> association works for select/textarea too (getAccessibleName only checks inputs).
  const labels = (el as HTMLInputElement).labels;
  if (labels && labels.length) {
    return cleanLabel(Array.from(labels).map((l) => l.textContent ?? '').join(' '));
  }
  return cleanLabel(getAccessibleName(el) || '');
}

function textOfIds(ids: string | null): string {
  if (!ids) return '';
  return ids
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)
    .join(' ');
}

function errorFor(el: HTMLElement): string | undefined {
  const tederash = el.getAttribute('data-tederash-error');
  if (tederash) return tederash;
  if (el.getAttribute('aria-invalid') !== 'true') return undefined;
  return textOfIds(el.getAttribute('aria-errormessage')) || textOfIds(el.getAttribute('aria-describedby')) || 'Invalid value';
}

function kindOf(el: HTMLElement): PageFieldKind | undefined {
  const role = el.getAttribute('role');
  if (el instanceof HTMLInputElement) {
    if (SKIPPED_INPUT_TYPES.has(el.type)) return undefined;
    if (el.type === 'checkbox') return 'checkbox';
    if (el.type === 'radio') return 'radio';
    return (el.type || 'text') as PageFieldKind;
  }
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  if (el instanceof HTMLSelectElement) return 'select';
  if (role === 'combobox') return 'combobox';
  if (role === 'checkbox') return 'checkbox';
  if (role === 'switch') return 'switch';
  if (el.isContentEditable) return 'editable';
  return undefined;
}

export function isSensitiveField(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement && el.type === 'password') return true;
  return SENSITIVE_AUTOCOMPLETE.test(el.getAttribute('autocomplete') ?? '');
}

function isChecked(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement) return el.checked;
  return el.getAttribute('aria-checked') === 'true' || el.getAttribute('data-state') === 'checked';
}

function valueOf(el: HTMLElement, kind: PageFieldKind): string | undefined {
  if (isSensitiveField(el)) return undefined;
  if (el instanceof HTMLSelectElement) return el.selectedOptions[0]?.textContent?.trim() || undefined;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value || undefined;
  if (kind === 'combobox') {
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    // Radix shows the placeholder when nothing is chosen.
    return el.hasAttribute('data-placeholder') || el.querySelector('[data-placeholder]') ? undefined : text || undefined;
  }
  if (el.isContentEditable) return el.textContent?.trim() || undefined;
  return undefined;
}

function uniqueHandle(prefix: string, label: string, used: Set<string>): string {
  const base = `${prefix}:${slugify(label)}`;
  let handle = base;
  for (let n = 2; used.has(handle); n++) handle = `${base}-${n}`;
  used.add(handle);
  return handle;
}

// ---------------------------------------------------------------------------
// Collection

export function collectFields(root: ParentNode = document): Entry<PageField>[] {
  const used = new Set<string>();
  const entries: Entry<PageField>[] = [];
  const radioGroups = new Map<string, Entry<PageField>>();

  root.querySelectorAll<HTMLElement>(FIELD_SELECTOR).forEach((el, index) => {
    if (isHiddenFromUser(el)) return;
    const kind = kindOf(el);
    if (!kind) return;

    if (kind === 'radio' && el instanceof HTMLInputElement) {
      const groupKey = el.name || `radio-${index}`;
      const optionLabel = labelFor(el);
      const existing = radioGroups.get(groupKey);
      if (existing) {
        existing.members!.push(el);
        existing.info.options!.push(optionLabel);
        if (el.checked) existing.info.value = optionLabel;
        return;
      }
      const legend = el.closest('fieldset')?.querySelector('legend')?.textContent;
      const groupLabel = cleanLabel(legend || el.closest('[role="radiogroup"]')?.getAttribute('aria-label') || el.name || optionLabel);
      const entry: Entry<PageField> = {
        el,
        members: [el],
        info: {
          handle: uniqueHandle('fld', groupLabel, used),
          label: groupLabel,
          kind: 'radio',
          options: [optionLabel],
          value: el.checked ? optionLabel : undefined,
          required: el.required || undefined,
        },
      };
      radioGroups.set(groupKey, entry);
      entries.push(entry);
      return;
    }

    const label = labelFor(el) || (el as HTMLInputElement).placeholder || (el as HTMLInputElement).name || `Field ${index + 1}`;
    const info: PageField = {
      handle: uniqueHandle('fld', label, used),
      label,
      kind,
      required:
        el.hasAttribute('required') ||
        el.getAttribute('aria-required') === 'true' ||
        el.getAttribute('data-tederash-required') === 'true' ||
        undefined,
      value: valueOf(el, kind),
      error: errorFor(el),
      disabled:
        (el as HTMLInputElement).disabled || el.getAttribute('aria-disabled') === 'true' || undefined,
    };
    if (kind === 'checkbox' || kind === 'switch') info.checked = isChecked(el);
    if (isSensitiveField(el)) {
      info.sensitive = true;
      info.filled = Boolean((el as HTMLInputElement).value);
    }
    if (el instanceof HTMLSelectElement) {
      info.options = Array.from(el.options)
        .map((o) => o.textContent?.trim() ?? '')
        .filter(Boolean)
        .slice(0, 15);
    }
    entries.push({ el, info });
  });
  return entries;
}

export function collectButtons(root: ParentNode = document): Entry<PageButton>[] {
  const used = new Set<string>();
  const entries: Entry<PageButton>[] = [];
  root.querySelectorAll<HTMLElement>(BUTTON_SELECTOR).forEach((el) => {
    if (isHiddenFromUser(el)) return;
    // Comboboxes/checkboxes rendered as <button> are fields, not buttons.
    const role = el.getAttribute('role');
    if (role === 'combobox' || role === 'checkbox' || role === 'switch') return;
    const label = labelFor(el);
    if (!label) return;
    const isLink = el instanceof HTMLAnchorElement;
    const submit =
      (el instanceof HTMLButtonElement && el.type === 'submit' && Boolean(el.form)) ||
      (el instanceof HTMLInputElement && el.type === 'submit');
    entries.push({
      el,
      info: {
        handle: uniqueHandle(isLink ? 'lnk' : 'btn', label, used),
        label: label.slice(0, 80),
        kind: isLink ? 'link' : 'button',
        submit: submit || undefined,
        inForm: Boolean(el.closest('form')) || undefined,
        disabled: (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true' || undefined,
      },
    });
  });
  return entries;
}

/** Compact picture of the page for the model's working memory. */
export function buildPageState(): PageState {
  const fields = collectFields().map((e) => e.info);
  // Buttons that matter for tasks: inside forms or main content, capped for token budget.
  const buttons = collectButtons()
    .filter((e) => e.info.kind === 'button' && (e.info.inForm || e.el.closest('main, [role="main"], dialog, [role="dialog"]')))
    .slice(0, 15)
    .map((e) => e.info);
  const headings = Array.from(document.querySelectorAll('h1, h2'))
    .map((h) => h.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)
    .slice(0, 8);
  return {
    url: location.href,
    title: document.title || 'Untitled',
    pageVersion: getPageVersion(),
    headings,
    fields: fields.slice(0, 40),
    buttons,
  };
}

// ---------------------------------------------------------------------------
// Resolution

export type ResolveScope = 'field' | 'button' | 'any';

export interface Candidate {
  handle: string;
  label: string;
  score: number;
}

export type Resolution<T> =
  | { status: 'RESOLVED'; entry: Entry<T> }
  | { status: 'AMBIGUOUS' | 'NOT_FOUND'; candidates: Candidate[] };

const FILLER = /\b(the|a|an|field|box|input|button|link|textbox|dropdown|menu|checkbox|option)\b/g;

export function normalizeTarget(target: string): string {
  return target
    .toLowerCase()
    .replace(/["'“”‘’]/g, '')
    .replace(FILLER, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type AnyInfo = PageField | PageButton;

export function resolveTarget(
  target: string,
  scope: ResolveScope,
  accept?: (info: AnyInfo) => boolean
): Resolution<AnyInfo> {
  const pool: Entry<AnyInfo>[] = [
    ...(scope !== 'button' ? collectFields() : []),
    ...(scope !== 'field' ? collectButtons() : []),
  ].filter((e) => !accept || accept(e.info));

  const raw = target.trim();
  const byHandle = pool.find((e) => e.info.handle === raw || e.info.handle.split(':')[1] === raw);
  if (byHandle) return { status: 'RESOLVED', entry: byHandle };

  const wanted = normalizeTarget(raw);
  if (!wanted) return { status: 'NOT_FOUND', candidates: [] };

  const exact = pool.filter((e) => normalizeTarget(e.info.label) === wanted);
  if (exact.length === 1) return { status: 'RESOLVED', entry: exact[0]! };

  const contains = pool.filter((e) => {
    const label = normalizeTarget(e.info.label);
    return label.includes(wanted) || (wanted.length >= 4 && wanted.includes(label) && label.length >= 4);
  });
  if (contains.length === 1) return { status: 'RESOLVED', entry: contains[0]! };

  // Every word the user said appears in the label ("full name" → "Full Legal Name").
  const words = wanted.split(' ').filter(Boolean);
  const allWords = pool.filter((e) => {
    const labelWords = new Set(normalizeTarget(e.info.label).split(' '));
    return words.every((w) => labelWords.has(w));
  });
  if (allWords.length === 1) return { status: 'RESOLVED', entry: allWords[0]! };

  const fuse = new Fuse(pool, {
    keys: ['info.label', 'info.handle'],
    includeScore: true,
    threshold: 0.45,
    ignoreLocation: true,
  });
  const results = fuse.search(wanted).slice(0, 5);
  const candidates = results.map((r) => ({
    handle: r.item.info.handle,
    label: r.item.info.label,
    score: Number((1 - (r.score ?? 1)).toFixed(2)),
  }));
  const [best, second] = results;
  if (best && (best.score ?? 1) <= 0.25 && (!second || (second.score ?? 1) - (best.score ?? 1) >= 0.15)) {
    return { status: 'RESOLVED', entry: best.item };
  }
  return { status: candidates.length ? 'AMBIGUOUS' : 'NOT_FOUND', candidates };
}
