import type { ElementSnapshot, PageSnapshot } from '../../shared/messages';

// In-memory mapping from ref code ('e1', 'e2', ...) to DOM elements for the active page
const elementRegistry = new Map<string, Element>();

export function getElementByRef(ref: string): Element | undefined {
  return elementRegistry.get(ref);
}

export function clearRegistry(): void {
  elementRegistry.clear();
}

export function getAccessibleName(el: Element): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

  const ariaLabelledBy = el.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const text = ariaLabelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() || '')
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  if (el instanceof HTMLInputElement) {
    if (el.labels && el.labels.length > 0) {
      const labelText = Array.from(el.labels)
        .map((l) => l.textContent?.trim() || '')
        .join(' ');
      if (labelText) return labelText;
    }
    if (el.placeholder) return el.placeholder;
    if (el.type === 'submit' || el.type === 'button') {
      if (el.value) return el.value;
    }
  }

  if (el instanceof HTMLImageElement && el.alt) {
    return el.alt.trim();
  }

  const title = el.getAttribute('title');
  if (title && title.trim()) return title.trim();

  // Text content fallback (trimmed, max 120 chars)
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (text.length > 120) {
    return text.slice(0, 120) + '…';
  }
  return text;
}

export function isElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;
  if (el.hidden || el.style.display === 'none' || el.style.visibility === 'hidden') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}

export function buildPageSnapshot(opts?: {
  mode?: 'interactive' | 'content' | 'form';
  viewportOnly?: boolean;
}): PageSnapshot {
  elementRegistry.clear();

  const mode = opts?.mode || 'interactive';
  const viewportOnly = Boolean(opts?.viewportOnly);

  const landmarks: string[] = [];
  const headings: string[] = [];
  const elements: ElementSnapshot[] = [];

  // Extract landmarks
  document.querySelectorAll('nav, main, header, footer, aside, [role="navigation"], [role="main"]').forEach((el) => {
    const role = el.getAttribute('role') || el.tagName.toLowerCase();
    const name = el.getAttribute('aria-label') || el.getAttribute('id') || '';
    landmarks.push(name ? `${role}(${name})` : role);
  });

  // Extract headings
  document.querySelectorAll('h1, h2, h3, [role="heading"]').forEach((el) => {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text) {
      headings.push(`${el.tagName.toLowerCase()}: ${text}`);
    }
  });

  // Determine selector based on mode
  let selector = 'button, a[href], input, textarea, select, [role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [role="tab"], [tabindex]:not([tabindex="-1"])';
  if (mode === 'form') {
    selector = 'form, input, textarea, select, button[type="submit"], [role="textbox"], [role="combobox"]';
  } else if (mode === 'content') {
    selector = 'article, main, section, p, h1, h2, h3, h4';
  }

  let counter = 1;
  const nodes = document.querySelectorAll(selector);

  for (const node of nodes) {
    if (!isElementVisible(node)) continue;
    if (viewportOnly && !isInViewport(node)) continue;

    const ref = `e${counter++}`;
    elementRegistry.set(ref, node);

    const tag = node.tagName.toLowerCase();
    const role = node.getAttribute('role') || undefined;
    const name = getAccessibleName(node);
    const inVp = isInViewport(node);

    let type: string | undefined;
    let value: string | undefined;
    let placeholder: string | undefined;
    let checked: boolean | undefined;
    let disabled: boolean | undefined;

    if (node instanceof HTMLInputElement) {
      type = node.type;
      placeholder = node.placeholder || undefined;
      checked = node.checked;
      disabled = node.disabled;
      // Do not expose sensitive values in snapshot
      if (type === 'password') {
        value = '••••••••';
      } else {
        value = node.value ? node.value.slice(0, 50) : undefined;
      }
    } else if (node instanceof HTMLTextAreaElement) {
      placeholder = node.placeholder || undefined;
      disabled = node.disabled;
      value = node.value ? node.value.slice(0, 50) : undefined;
    } else if (node instanceof HTMLButtonElement) {
      disabled = node.disabled;
    } else if (node instanceof HTMLSelectElement) {
      disabled = node.disabled;
      value = node.value || undefined;
    }

    elements.push({
      ref,
      tag,
      role,
      name: name || undefined,
      type,
      value,
      placeholder,
      checked,
      disabled,
      inViewport: inVp,
    });

    if (elements.length >= 80) break; // Token/performance budget
  }

  // Extract clean text sample (up to 600 chars)
  const mainEl = document.querySelector('main, article, [role="main"]') || document.body;
  const rawText = (mainEl?.textContent || '').replace(/\s+/g, ' ').trim();
  const textSample = rawText.slice(0, 600);

  return {
    url: window.location.href,
    title: document.title || 'Untitled',
    lang: document.documentElement.lang || 'en',
    landmarks: Array.from(new Set(landmarks)).slice(0, 10),
    elements,
    headings: headings.slice(0, 15),
    textSample,
  };
}
