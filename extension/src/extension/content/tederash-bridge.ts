export interface TederashComponentInfo {
  id: string;
  component: string;
  label?: string;
  role?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  value?: string;
  checked?: boolean;
  open?: boolean;
  variant?: string;
}

export function detectTederashInPage(): {
  isTederash: boolean;
  version?: string;
  profile?: string;
  locale?: string;
} {
  if (typeof document === 'undefined') {
    return { isTederash: false };
  }
  const root = document.documentElement;
  const rootEl = root.hasAttribute('data-tederash-root')
    ? root
    : document.querySelector('[data-tederash-root]');
  const hasComponents = Boolean(
    document.querySelector('[data-tederash-component], [data-tederash-id]')
  );

  const isTederash = Boolean(rootEl || hasComponents);

  return {
    isTederash,
    version: rootEl?.getAttribute('data-tederash-version') || '0.1.0',
    profile: rootEl?.getAttribute('data-a11y-profile') || 'standard',
    locale: rootEl?.getAttribute('data-a11y-locale') || 'en',
  };
}

export function queryTederashTree(): TederashComponentInfo[] {
  if (typeof document === 'undefined') return [];
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-tederash-component]'));
  return elements.map((el, index) => {
    const id = el.getAttribute('data-tederash-id') || el.id || `ted_${index}`;
    const component = el.getAttribute('data-tederash-component') || 'unknown';
    const label =
      el.getAttribute('data-tederash-label') ||
      el.getAttribute('aria-label') ||
      el.innerText?.slice(0, 60).trim() ||
      undefined;
    const error = el.getAttribute('data-tederash-error') || undefined;
    const required =
      el.getAttribute('data-tederash-required') === 'true' ||
      el.getAttribute('aria-required') === 'true';
    const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
    const value =
      (el as HTMLInputElement).value || el.getAttribute('data-tederash-value') || undefined;
    const checked = el.getAttribute('data-tederash-checked') === 'true';
    const open = el.getAttribute('data-tederash-open') === 'true';
    const variant = el.getAttribute('data-tederash-variant') || undefined;

    return {
      id,
      component,
      label,
      role: el.getAttribute('role') || el.tagName.toLowerCase(),
      required: required || undefined,
      disabled: disabled || undefined,
      error,
      value,
      checked: component === 'checkbox' ? checked : undefined,
      open: component === 'dialog' ? open : undefined,
      variant,
    };
  });
}

export async function sendBridgeRequest<T = any>(
  type: string,
  payload?: any,
  timeoutMs = 2500
): Promise<{ ok: boolean; data?: T; error?: string }> {
  return new Promise((resolve) => {
    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    let timer: any = null;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ id: string; ok: boolean; data?: T; error?: string }>;
      if (custom.detail?.id === id) {
        clearTimeout(timer);
        window.removeEventListener('tederash:response', handler);
        resolve({
          ok: custom.detail.ok,
          data: custom.detail.data,
          error: custom.detail.error,
        });
      }
    };

    window.addEventListener('tederash:response', handler);

    timer = setTimeout(() => {
      window.removeEventListener('tederash:response', handler);
      resolve({ ok: false, error: `Bridge request timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    try {
      window.dispatchEvent(
        new CustomEvent('tederash:request', {
          detail: { id, type, payload },
        })
      );
    } catch (err) {
      clearTimeout(timer);
      window.removeEventListener('tederash:response', handler);
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}
