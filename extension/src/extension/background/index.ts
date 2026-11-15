import {
  ContentToBgSchema,
  UiToBgSchema,
  createEnvelope,
  type PingResponse,
  type SettingsGetResponse,
  type TtsResponse,
  type VaultGetResponse,
} from '../../shared/messages';
import { resolveConfirmation } from './agent/confirm';
import { parseVoiceReplyMessage, resolveVoiceReply } from './agent/voice-reply';
import { createBatchedListener } from './agent/stream';
import { ensureSessionsLoaded } from './agent/session';
import {
  clearSessionHistory,
  getSessionHistory,
  runAgentTask,
  runAgentTaskStream,
  stopSession,
} from './agent/runner';
import { getPublicAiConfig, loadAiConfig, setAiConfig } from './llm';
import { speakText, stopSpeaking } from './speech/output';
import { transcribeAudio } from './speech/transcribe';
import { storageService } from './storage/service';

function base64ToBlob(value: string, mimeType: string): Blob {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function isAllowedOrigin(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'file:') {
      return parsed.origin;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function buildSettingsResponse(origin?: string, tabId?: number): Promise<SettingsGetResponse> {
  const { state, effective } = await storageService.getEffectiveSettings(origin, tabId);
  return {
    ok: true,
    effective,
    activeProfileId: state.activeProfileId,
    profiles: state.profiles,
    onboardingCompleted: state.onboardingCompleted,
    siteOverrides: state.siteOverrides,
    globalPatch: state.globalPatch,
  };
}

/** Ask the content script for page text; inject it first if the tab predates the extension. */
async function extractReadingTextFromTab(tabId: number): Promise<string> {
  const extractEnvelope = createEnvelope('reading/extract', {});
  try {
    const res = (await chrome.tabs.sendMessage(tabId, extractEnvelope)) as {
      ok: boolean;
      text?: string;
      error?: string;
    };
    if (!res?.ok) {
      throw new Error(res?.error ?? 'extraction failed');
    }
    return res.text ?? '';
  } catch {
    // The content script may be missing on tabs opened before the extension
    // was installed or reloaded. Inject it on demand, then retry once.
    if (typeof chrome.scripting?.executeScript !== 'function') {
      throw new Error('RELOAD_PAGE');
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
      const res = (await chrome.tabs.sendMessage(tabId, extractEnvelope)) as {
        ok: boolean;
        text?: string;
        error?: string;
      };
      if (!res?.ok) {
        throw new Error(res?.error ?? 'extraction failed');
      }
      return res.text ?? '';
    } catch {
      throw new Error('RELOAD_PAGE');
    }
  }
}

async function sendAdaptToTab(tabId: number, origin?: string): Promise<void> {
  try {
    const { effective } = await storageService.getEffectiveSettings(origin, tabId);
    const msg = effective.disabledOnSite
      ? createEnvelope('adapt/revert', {})
      : createEnvelope('adapt/apply', { effective });
    await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    // Tab may be restricted (chrome://, Web Store) or not yet ready.
  }
}

async function handleUiMessage(
  raw: unknown
): Promise<any> {
  const parsed = UiToBgSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid UI message envelope' };
  }

  const msg = parsed.data;
  switch (msg.type) {
    case 'system/ping':
      return { ok: true, runtime: 'background', ts: Date.now() };

    case 'tab/pingContent': {
      const res = (await chrome.tabs.sendMessage(
        msg.payload.tabId,
        createEnvelope('content/ping', {})
      )) as PingResponse;
      return res;
    }

    case 'tab/checkTederash': {
      let targetTabId = msg.payload.tabId;
      if (targetTabId === undefined && typeof chrome.tabs?.query === 'function') {
        let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0 || !tabs[0]?.id) {
          tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        }
        targetTabId = tabs[0]?.id;
      }

      if (targetTabId === undefined) {
        return { ok: false, isTederash: false, error: 'No active tab found' };
      }

      try {
        let ping: PingResponse | undefined;
        try {
          ping = (await chrome.tabs.sendMessage(
            targetTabId,
            createEnvelope('content/ping', {})
          )) as PingResponse;
        } catch {
          // If content script is not yet injected into tab, inject it on-the-fly
          if (typeof chrome.scripting?.executeScript === 'function') {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                files: ['content.js'],
              });
              ping = (await chrome.tabs.sendMessage(
                targetTabId,
                createEnvelope('content/ping', {})
              )) as PingResponse;
            } catch {
              // Could not inject content script (e.g. chrome:// or restricted page)
            }
          }
        }

        if (ping?.ok && ping.isTederash) {
          return {
            ok: true,
            isTederash: true,
            tederashVersion: ping.tederashVersion,
            tederashProfile: ping.tederashProfile,
            tederashLocale: ping.tederashLocale,
            url: ping.url,
            tabId: targetTabId,
          };
        }
        return {
          ok: true,
          isTederash: false,
          tabId: targetTabId,
          url: ping?.url,
        };
      } catch (err) {
        return {
          ok: true,
          isTederash: false,
          tabId: targetTabId,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    case 'settings/get':
      return buildSettingsResponse(msg.payload.origin, msg.payload.tabId);

    case 'settings/update': {
      await storageService.updatePatch({
        scope: msg.payload.scope,
        patch: msg.payload.patch,
        origin: msg.payload.origin,
        tabId: msg.payload.tabId,
        profileId: msg.payload.profileId,
      });
      if (msg.payload.tabId !== undefined) {
        await sendAdaptToTab(msg.payload.tabId, msg.payload.origin);
      }
      return buildSettingsResponse(msg.payload.origin, msg.payload.tabId);
    }

    case 'settings/setProfile': {
      const state = await storageService.getState();
      if (state.profiles.some((p) => p.id === msg.payload.profileId)) {
        state.activeProfileId = msg.payload.profileId;
        await storageService.saveState(state);
      }
      if (msg.payload.tabId !== undefined) {
        await sendAdaptToTab(msg.payload.tabId, msg.payload.origin);
      }
      return buildSettingsResponse(msg.payload.origin, msg.payload.tabId);
    }

    case 'onboarding/complete': {
      const state = await storageService.getState();
      state.onboardingCompleted = msg.payload.completed;
      await storageService.saveState(state);
      return buildSettingsResponse();
    }

    case 'sites/delete': {
      await storageService.deleteSiteOverride(msg.payload.origin);
      if (msg.payload.origin) {
        // Re-send fresh settings so the page reverts immediately.
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        if (tabId !== undefined) {
          await sendAdaptToTab(tabId, msg.payload.origin);
        }
      }
      return buildSettingsResponse(msg.payload.origin);
    }

    case 'profiles/create': {
      await storageService.createProfile({
        name: msg.payload.name,
        experiences: msg.payload.experiences,
        patch: msg.payload.patch,
        activate: msg.payload.activate,
      });
      return buildSettingsResponse();
    }

    case 'vault/get': {
      const entries = await storageService.getVault();
      return { ok: true, entries };
    }

    case 'vault/set': {
      const entries = await storageService.setVault(msg.payload.entries);
      return { ok: true, entries };
    }

    case 'tts/readPage': {
      try {
        const text = await extractReadingTextFromTab(msg.payload.tabId);
        if (!text) {
          return {
            ok: false,
            error: 'Could not find readable text on this page. Its content may be rendered in a way Tederash cannot read yet.',
          };
        }
        return await speakText(text);
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error && err.message === 'RELOAD_PAGE'
              ? 'Tederash could not attach to this page. Reload the page once, then try again.'
              : 'This page does not support reading aloud.',
        };
      }
    }

    case 'tts/speak':
      return speakText(msg.payload.text);

    case 'tts/stop': {
      await stopSpeaking();
      return { ok: true };
    }

    case 'speech/transcribe': {
      const config = await loadAiConfig();
      const result = await transcribeAudio({
        audio: base64ToBlob(msg.payload.audioBase64, msg.payload.mimeType ?? 'audio/webm'),
        config,
        language: msg.payload.language ?? config.speechLanguage,
        model: config.sttModel,
      });
      return result.ok ? { ok: true, text: result.text } : { ok: false, error: result.error };
    }

    case 'agent/chat': {
      const res = await runAgentTask(
        msg.payload.tabId,
        msg.payload.text,
        msg.payload.conversationId
      );
      return { ok: true, ...res };
    }

    case 'agent/getHistory': {
      await ensureSessionsLoaded();
      const messages = getSessionHistory(msg.payload.conversationId);
      return { ok: true, messages };
    }

    case 'agent/clearHistory': {
      clearSessionHistory(msg.payload.conversationId);
      return { ok: true };
    }

    case 'agent/stop': {
      const stopped = stopSession(msg.payload.runId);
      return { ok: true, stopped };
    }

    case 'ai/getConfig': {
      await loadAiConfig();
      return { ok: true, config: getPublicAiConfig() };
    }

    case 'ai/setConfig': {
      await setAiConfig(msg.payload);
      return { ok: true, config: getPublicAiConfig() };
    }
  }
}

async function handleContentMessage(
  raw: unknown,
  sender: chrome.runtime.MessageSender
): Promise<{ ok: boolean; error?: string }> {
  const parsed = ContentToBgSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid content message envelope' };
  }

  const msg = parsed.data;
  if (msg.type === 'page/ready') {
    return { ok: true };
  }

  return { ok: true };
}

// Register all MV3 listeners synchronously at the top level
chrome.runtime.onInstalled.addListener(() => {
  void storageService.getState();
  // Enable opening side panel directly when extension toolbar action is clicked
  if (typeof chrome.sidePanel?.setPanelBehavior === 'function') {
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

if (typeof chrome.action?.onClicked?.addListener === 'function') {
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id !== undefined && typeof chrome.sidePanel?.open === 'function') {
      void chrome.sidePanel.open({ tabId: tab.id });
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, error: 'Unauthorized sender' });
    return false;
  }

  const isFromTab = Boolean(sender.tab);
  const promise = isFromTab
    ? handleContentMessage(message, sender)
    : handleUiMessage(message);

  promise
    .then((result) => sendResponse(result))
    .catch((err: unknown) => {
      const text = err instanceof Error ? err.message : 'Unknown service worker error';
      sendResponse({ ok: false, error: text });
    });

  return true; // keep message channel open for async response
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'stop-all') {
    await stopSpeaking();
    return;
  }

  if (command === 'start-listening') {
    // A command counts as a user gesture, so the panel may be opened here.
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId !== undefined && typeof chrome.sidePanel?.open === 'function') {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
    } catch {
      // The panel may already be open, or opening may not be permitted here.
    }
    try {
      // Only the side panel listens for this: Alt+Shift+V toggles hands-free
      // voice mode, so a blind user never has to find the panel's controls.
      await chrome.runtime.sendMessage({ type: 'panel/toggleVoiceMode' });
      await chrome.storage.local.remove('pendingVoiceModeToggle');
    } catch {
      // The panel was closed when the shortcut fired, and Next's pages take a
      // moment to hydrate, so the message would be lost. Remember it for a
      // minute: a panel that opens right after picks it up on mount.
      try {
        await chrome.storage.local.set({ pendingVoiceModeToggle: { ts: Date.now() } });
      } catch {
        // Storage unavailable; the shortcut just does nothing this once.
      }
    }
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug('[Tederash SW] Command received:', command);
  }
});

// Live Event Streaming Port for Sidepanel Assistant
if (typeof chrome.runtime?.onConnect?.addListener === 'function') {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'agent-stream') {
      const abortController = new AbortController();
      port.onDisconnect.addListener(() => {
        abortController.abort();
      });

      port.onMessage.addListener(async (msg: any) => {
        if (msg?.type === 'agent/confirm' && typeof msg.id === 'string') {
          resolveConfirmation(msg.id, msg.approved === true);
          return;
        }
        if (msg?.type === 'agent/voiceReply' && typeof msg.id === 'string') {
          resolveVoiceReply(msg.id, parseVoiceReplyMessage(msg));
          return;
        }
        if (msg?.type === 'agent/stream/start') {
          const { tabId, text, conversationId } = msg;
          await runAgentTaskStream(
            tabId,
            text,
            conversationId,
            createBatchedListener((event) => {
              try {
                port.postMessage(event);
              } catch {
                // Port may have disconnected
              }
            }),
            abortController.signal,
            { isVoiceTurn: msg.isVoiceTurn === true }
          );
        }
      });
    }
  });
}
