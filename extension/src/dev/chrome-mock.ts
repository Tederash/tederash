import { createInitialPersistedState } from '../shared/settings/defaults';
import { resolveSettings } from '../shared/settings/resolve';
import type { PersistedState } from '../shared/settings/schema';
import {
  UiToBgSchema,
  type PingResponse,
  type SettingsGetResponse,
  type TtsResponse,
  type VaultGetResponse,
} from '../shared/messages';

const STORAGE_KEY = 'tederash_dev_state_v1';
const VAULT_KEY = 'tederash_dev_vault_v1';

function loadDevState(): PersistedState {
  if (typeof window === 'undefined') return createInitialPersistedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialPersistedState();
    return JSON.parse(raw) as PersistedState;
  } catch {
    return createInitialPersistedState();
  }
}

function saveDevState(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildResponse(state: PersistedState, origin?: string): SettingsGetResponse {
  const profile = state.profiles.find((p) => p.id === state.activeProfileId);
  const effective = resolveSettings({
    globalPatch: state.globalPatch,
    profilePatch: profile?.patch,
    sitePatch: origin ? state.siteOverrides[origin] : undefined,
  });
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

function devSpeak(text: string, rate: number, pitch: number): TtsResponse {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { ok: false, error: 'Speech synthesis is unavailable in this context.' };
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  window.speechSynthesis.speak(utterance);
  return { ok: true, spoken: true, chars: text.length };
}

export async function handleDevMockMessage(
  raw: unknown
): Promise<any> {
  const parsed = UiToBgSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid UI message envelope' };
  }

  const msg = parsed.data;
  const state = loadDevState();

  switch (msg.type) {
    case 'system/ping':
      return { ok: true, runtime: 'background', ts: Date.now() };
    case 'tab/pingContent':
      return { ok: true, runtime: 'content', ts: Date.now(), url: 'https://example.com' };
    case 'settings/get':
      return buildResponse(state, msg.payload.origin);
    case 'settings/setProfile': {
      state.activeProfileId = msg.payload.profileId;
      saveDevState(state);
      return buildResponse(state, msg.payload.origin);
    }
    case 'settings/update': {
      if (msg.payload.scope === 'global') {
        state.globalPatch = mergePatch(state.globalPatch, msg.payload.patch);
      } else if (msg.payload.scope === 'site' && msg.payload.origin) {
        state.siteOverrides[msg.payload.origin] = mergePatch(
          state.siteOverrides[msg.payload.origin] ?? {},
          msg.payload.patch
        );
      } else if (msg.payload.scope === 'profile') {
        const targetId = msg.payload.profileId ?? state.activeProfileId;
        state.profiles = state.profiles.map((profile) =>
          profile.id === targetId
            ? { ...profile, patch: mergePatch(profile.patch, msg.payload.patch), updatedAt: Date.now() }
            : profile
        );
      }
      saveDevState(state);
      return buildResponse(state, msg.payload.origin);
    }
    case 'onboarding/complete': {
      state.onboardingCompleted = msg.payload.completed;
      saveDevState(state);
      return buildResponse(state);
    }
    case 'sites/delete': {
      delete state.siteOverrides[msg.payload.origin];
      saveDevState(state);
      return buildResponse(state, msg.payload.origin);
    }
    case 'profiles/create': {
      const id = `dev-profile-${Date.now()}`;
      state.profiles = [
        ...state.profiles,
        {
          id,
          name: msg.payload.name,
          presetId: 'custom',
          experiences: msg.payload.experiences,
          patch: msg.payload.patch,
          updatedAt: Date.now(),
        },
      ];
      if (msg.payload.activate) state.activeProfileId = id;
      saveDevState(state);
      return buildResponse(state);
    }
    case 'vault/get': {
      if (typeof window === 'undefined') return { ok: true, entries: {} };
      const raw2 = window.localStorage.getItem(VAULT_KEY);
      return { ok: true, entries: raw2 ? (JSON.parse(raw2) as Record<string, string>) : {} };
    }
    case 'vault/set': {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(VAULT_KEY, JSON.stringify(msg.payload.entries));
      }
      return { ok: true, entries: msg.payload.entries };
    }
    case 'tts/readPage':
      return { ok: false, error: 'Page reading works inside the Chrome extension. Load the extension to try it.' };
    case 'tts/speak': {
      const rate = state.globalPatch.voice?.ttsRate ?? 1;
      const pitch = state.globalPatch.voice?.ttsPitch ?? 1;
      return devSpeak(msg.payload.text, rate, pitch);
    }
    case 'tts/stop': {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return { ok: true };
    }
    case 'agent/chat': {
      return {
        ok: true,
        conversationId: msg.payload.conversationId || 'dev_conv',
        messages: [
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Dev mode preview: received "${msg.payload.text}". In a real browser tab, Tederash observes the page and executes actions.`,
            timestamp: Date.now(),
          },
        ],
        status: 'done',
      };
    }
    case 'agent/getHistory':
      return { ok: true, messages: [] };
    case 'agent/clearHistory':
      return { ok: true };
    case 'agent/stop':
      return { ok: true, stopped: true };
    case 'ai/getConfig':
      return { ok: true, config: { provider: 'heuristic' } };
    case 'ai/setConfig':
      return { ok: true, config: msg.payload };
    default:
      return { ok: false, error: 'Unhandled mock message type' };
  }
}

function mergePatch(
  base: PersistedState['globalPatch'],
  patch: PersistedState['globalPatch']
): PersistedState['globalPatch'] {
  return {
    ...base,
    ...(patch.disabledOnSite !== undefined ? { disabledOnSite: patch.disabledOnSite } : {}),
    adaptation: { ...base.adaptation, ...patch.adaptation },
    voice: { ...base.voice, ...patch.voice },
    ui: { ...base.ui, ...patch.ui },
    privacy: { ...base.privacy, ...patch.privacy },
  };
}
