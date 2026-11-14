import { handleDevMockMessage } from '../dev/chrome-mock';
import type { UiToBgMessage } from '../shared/messages';

export function isExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.runtime !== 'undefined' &&
    typeof chrome.runtime.sendMessage === 'function' &&
    Boolean(chrome.runtime.id)
  );
}

export async function sendToBackground<TResponse>(msg: UiToBgMessage): Promise<TResponse> {
  if (isExtensionContext()) {
    return (await chrome.runtime.sendMessage(msg)) as TResponse;
  }
  return (await handleDevMockMessage(msg)) as TResponse;
}

export async function getActiveTabInfo(): Promise<{
  tabId?: number;
  url?: string;
  origin?: string;
  restricted: boolean;
}> {
  if (!isExtensionContext() || !chrome.tabs?.query) {
    return { tabId: 1, url: 'https://example.com', origin: 'https://example.com', restricted: false };
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    return { restricted: true };
  }
  try {
    const parsed = new URL(tab.url);
    const restricted =
      parsed.protocol !== 'http:' &&
      parsed.protocol !== 'https:' &&
      parsed.protocol !== 'file:';
    return {
      tabId: tab.id,
      url: tab.url,
      origin: restricted ? undefined : parsed.origin,
      restricted,
    };
  } catch {
    return { tabId: tab.id, url: tab.url, restricted: true };
  }
}

export function openExtensionRoute(path: string): void {
  if (isExtensionContext() && chrome.tabs?.create) {
    void chrome.tabs.create({ url: chrome.runtime.getURL(path) });
  } else if (typeof window !== 'undefined') {
    window.open(`/${path.replace(/\.html$/, '')}`, '_blank', 'noopener');
  }
}
