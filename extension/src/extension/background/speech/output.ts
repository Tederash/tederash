import { createEnvelope, type TtsResponse } from '../../../shared/messages';
import { storageService } from '../storage/service';

/**
 * Speech output. chrome.tts first, then Web Speech inside the offscreen document
 * (common on Linux, where chrome.tts often has no voice installed).
 *
 * Nothing here ever reads text aloud with a voice for the wrong language: if the
 * engine has no voice for the requested language it reports that instead, the same
 * honest behaviour as packages/core's synthesis controller.
 */

export async function ensureOffscreenDocument(): Promise<boolean> {
  if (typeof chrome.offscreen !== 'object' || chrome.offscreen === null) {
    return false;
  }
  try {
    if (typeof chrome.runtime.getContexts === 'function') {
      const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
      if (Array.isArray(contexts) && contexts.length > 0) {
        return true;
      }
    }
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Speak page text when chrome.tts has no available voice.',
    });
    return true;
  } catch {
    return false;
  }
}

export async function offscreenDocumentExists(): Promise<boolean> {
  if (typeof chrome.offscreen !== 'object' || chrome.offscreen === null) {
    return false;
  }
  if (typeof chrome.runtime.getContexts !== 'function') {
    return true; // Cannot check; assume it may exist and let the message fail silently.
  }
  try {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    return Array.isArray(contexts) && contexts.length > 0;
  } catch {
    return false;
  }
}

/** Rough upper bound for how long an utterance can take, so a lost end event cannot hang a caller. */
export function speechTimeoutMs(text: string, rate = 1): number {
  return Math.round((text.length * 120) / Math.max(0.5, rate)) + 3000;
}

/**
 * chrome.tts with proper error detection (lastError), resolving false on failure.
 * The speak() callback fires when the utterance is *queued*, not when it ends; with
 * `wait`, resolve on the end/interrupted/cancelled/error event instead.
 */
function speakViaChromeTts(
  text: string,
  opts: { rate: number; pitch: number; lang: string },
  wait = false
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => done(true), wait ? speechTimeoutMs(text, opts.rate) : 0x7fffffff);
    try {
      chrome.tts.speak(
        text,
        {
          ...opts,
          ...(wait
            ? {
                onEvent: (event: chrome.tts.TtsEvent) => {
                  if (event.type === 'end' || event.type === 'interrupted' || event.type === 'cancelled') done(true);
                  else if (event.type === 'error') done(false);
                },
              }
            : {}),
        },
        () => {
          const err = chrome.runtime.lastError;
          if (err) done(false);
          else if (!wait) done(true);
        }
      );
    } catch {
      done(false);
    }
  });
}

export async function speakText(
  text: string,
  origin?: string,
  overrides: { lang?: string; wait?: boolean } = {}
): Promise<TtsResponse> {
  const { effective } = await storageService.getEffectiveSettings(origin);
  const opts = {
    rate: effective.voice.ttsRate,
    pitch: effective.voice.ttsPitch,
    lang: overrides.lang ?? effective.voice.language,
  };

  // Primary: chrome.tts (only trust it if the callback reports no error).
  if (typeof chrome.tts === 'object' && typeof chrome.tts.speak === 'function') {
    chrome.tts.stop();
    const spoke = await speakViaChromeTts(text, opts, overrides.wait);
    if (spoke) {
      return { ok: true, spoken: true, chars: text.length };
    }
  }

  // Fallback: Web Speech synthesis in the offscreen document.
  const ready = await ensureOffscreenDocument();
  if (ready) {
    try {
      const sent = chrome.runtime.sendMessage(
        createEnvelope('offscreen/speak', { text, ...opts, ...(overrides.wait ? { wait: true } : {}) })
      );
      // Never let a lost end event hang a caller that is waiting to open the mic.
      await (overrides.wait
        ? Promise.race([sent, new Promise((resolve) => setTimeout(resolve, speechTimeoutMs(text, opts.rate)))])
        : sent);
      return { ok: true, spoken: true, chars: text.length };
    } catch {
      // Fall through to the failure message.
    }
  }

  return {
    ok: false,
    error:
      'No speech engine is available on this device. Install a system voice or try Chrome with built-in voices.',
  };
}

export async function stopSpeaking(): Promise<void> {
  if (typeof chrome.tts === 'object' && typeof chrome.tts.stop === 'function') {
    chrome.tts.stop();
  }
  if (await offscreenDocumentExists()) {
    try {
      await chrome.runtime.sendMessage(createEnvelope('offscreen/stop', {}));
    } catch {
      // The document may have been torn down already.
    }
  }
}
