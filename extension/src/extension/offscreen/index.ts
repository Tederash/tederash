import { parseBgToOffscreen } from '../../shared/messages-lite';

/**
 * Offscreen document: hosts Web Speech synthesis as the fallback TTS engine
 * for when chrome.tts has no usable voice (common on Linux and some devices).
 * Listens for 'offscreen/speak' and 'offscreen/stop' from the service worker.
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;

function reportError(message: string): void {
  try {
    void chrome.runtime.sendMessage({ kind: 'offscreen/error', message }).catch(() => {});
  } catch {
    // Channel may be gone; nothing to do.
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    return false;
  }

  const parsed = parseBgToOffscreen(message);
  if (!parsed.success) {
    return false;
  }

  const msg = parsed.data;
  if (!('speechSynthesis' in window)) {
    sendResponse({ ok: false, error: 'Speech synthesis is unavailable.' });
    return false;
  }

  switch (msg.type) {
    case 'offscreen/speak': {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(msg.payload.text);
      if (msg.payload.rate !== undefined) utterance.rate = msg.payload.rate;
      if (msg.payload.pitch !== undefined) utterance.pitch = msg.payload.pitch;
      if (msg.payload.lang !== undefined) utterance.lang = msg.payload.lang;
      utterance.onerror = (event) => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          reportError(`Speech failed: ${event.error}`);
        }
      };
      utterance.onend = () => {
        currentUtterance = null;
      };
      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      sendResponse({ ok: true });
      return false;
    }

    case 'offscreen/stop': {
      window.speechSynthesis.cancel();
      currentUtterance = null;
      sendResponse({ ok: true });
      return false;
    }
  }
});
