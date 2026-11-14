import { createEnvelope } from '../../shared/envelope';
import type { PingResponse } from '../../shared/messages';
import { parseBgToContent } from '../../shared/messages-lite';
import { executeTool } from './actions';
import { adaptationEngine } from './adapt/engine';
import { buildPageSnapshot } from './snapshot';
import { detectTederashInPage } from './tederash-bridge';

/** Guards against double bootstrap when injected on demand after page load. */
interface TederashWindow extends Window {
  __tederashContentInjected?: boolean;
}

function notifyReady(): void {
  try {
    const url = window.location.href;
    const origin = window.location.origin;
    void chrome.runtime
      .sendMessage(createEnvelope('page/ready', { url, origin }))
      .catch(() => {
        // Ignore if SW is waking up or context invalidated
      });
  } catch {
    // Ignore restricted/sandboxed origins
  }
}

const TEXT_SELECTOR =
  'h1, h2, h3, h4, h5, h6, p, li, dd, dt, blockquote, figcaption';

/** Extract a reading-order text excerpt for TTS (deterministic, no AI). */
function extractReadingText(): string {
  const parts: string[] = [];
  const title = document.title?.trim();
  if (title) parts.push(title);

  const scope =
    document.querySelector('main, article, [role="main"]') ?? document.body;
  if (scope) {
    const paragraphs = scope.querySelectorAll(TEXT_SELECTOR);
    let chars = 0;
    const MAX_CHARS = 4000;

    for (const node of paragraphs) {
      if (chars >= MAX_CHARS) break;
      const el = node as HTMLElement;
      if (isHidden(el)) continue;
      const text = el.textContent?.replace(/\s+/g, ' ').trim();
      if (!text || text.length < 2) continue;
      const prefix = node.tagName.startsWith('H') ? `${text}. ` : `${text} `;
      parts.push(prefix);
      chars += prefix.length;
    }
  }

  const combined = parts.join(' ').trim();
  if (combined.length > 0) {
    return combined;
  }

  // Fallback for JS-heavy pages with little static text: title + meta description.
  const metaDescription = document
    .querySelector('meta[name="description"]')
    ?.getAttribute('content')
    ?.replace(/\s+/g, ' ')
    .trim();
  return [title, metaDescription].filter(Boolean).join('. ');
}

function isHidden(el: HTMLElement): boolean {
  if (el.hasAttribute('hidden')) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  const style = window.getComputedStyle(el);
  return style.display === 'none' || style.visibility === 'hidden';
}

const tederashWindow = window as TederashWindow;
if (!tederashWindow.__tederashContentInjected) {
  tederashWindow.__tederashContentInjected = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) {
      return false;
    }

    const parsed = parseBgToContent(message);
    if (!parsed.success) {
      return false;
    }

    const msg = parsed.data;
    switch (msg.type) {
      case 'content/ping': {
        const tederash = detectTederashInPage();
        const response: PingResponse = {
          ok: true,
          runtime: 'content',
          ts: Date.now(),
          url: window.location.href,
          isTederash: tederash.isTederash,
          tederashVersion: tederash.version,
          tederashProfile: tederash.profile,
          tederashLocale: tederash.locale,
        };
        sendResponse(response);
        return false;
      }
      case 'adapt/apply': {
        adaptationEngine.apply(msg.payload.effective);
        sendResponse({ ok: true });
        return false;
      }
      case 'adapt/revert': {
        adaptationEngine.revert();
        sendResponse({ ok: true });
        return false;
      }
      case 'reading/extract': {
        try {
          sendResponse({ ok: true, text: extractReadingText() });
        } catch {
          sendResponse({ ok: false, error: 'Unable to read this page.' });
        }
        return false;
      }
      case 'snapshot/request': {
        try {
          const snapshot = buildPageSnapshot(msg.payload);
          sendResponse({ ok: true, snapshot });
        } catch (err) {
          sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
        }
        return false;
      }
      case 'tool/exec': {
        executeTool(msg.payload.call)
          .then((res) => sendResponse(res))
          .catch((err) =>
            sendResponse({
              ok: false,
              error: {
                code: 'EXEC_ERROR',
                message: err instanceof Error ? err.message : String(err),
              },
            })
          );
        return true; // asynchronous response
      }
    }
  });

  notifyReady();
}
