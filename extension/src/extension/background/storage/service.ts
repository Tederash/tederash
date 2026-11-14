import { BUILTIN_DEFAULTS, createInitialPersistedState } from '../../../shared/settings/defaults';
import { migratePersistedState } from '../../../shared/settings/migrations';
import { applyPatch, resolveSettings } from '../../../shared/settings/resolve';
import type {
  EffectiveSettings,
  PersistedState,
  Profile,
  SettingsPatch,
} from '../../../shared/settings/schema';

const LOCAL_STATE_KEY = 'tederash_state_v1';
const SESSION_OVERRIDES_KEY = 'tederash_session_overrides_v1';
const VAULT_KEY = 'tederash_vault_v1';

export class StorageService {
  async getState(): Promise<PersistedState> {
    const res = await chrome.storage.local.get(LOCAL_STATE_KEY);
    const raw = res[LOCAL_STATE_KEY];
    if (!raw) {
      const initial = createInitialPersistedState();
      await chrome.storage.local.set({ [LOCAL_STATE_KEY]: initial });
      return initial;
    }
    return migratePersistedState(raw);
  }

  async saveState(state: PersistedState): Promise<void> {
    await chrome.storage.local.set({ [LOCAL_STATE_KEY]: state });
  }

  async getSessionOverrides(): Promise<Record<number, SettingsPatch>> {
    const res = await chrome.storage.session.get(SESSION_OVERRIDES_KEY);
    const raw = res[SESSION_OVERRIDES_KEY];
    if (!raw || typeof raw !== 'object') return {};
    return raw as Record<number, SettingsPatch>;
  }

  async setSessionOverride(tabId: number, patch: SettingsPatch): Promise<void> {
    const current = await this.getSessionOverrides();
    const prev = current[tabId] ?? {};
    current[tabId] = {
      disabledOnSite: patch.disabledOnSite ?? prev.disabledOnSite,
      adaptation: { ...prev.adaptation, ...patch.adaptation },
      voice: { ...prev.voice, ...patch.voice },
      ui: { ...prev.ui, ...patch.ui },
      privacy: { ...prev.privacy, ...patch.privacy },
    };
    await chrome.storage.session.set({ [SESSION_OVERRIDES_KEY]: current });
  }

  async getEffectiveSettings(origin?: string, tabId?: number): Promise<{
    state: PersistedState;
    effective: EffectiveSettings;
  }> {
    const state = await this.getState();
    const profile = state.profiles.find((p) => p.id === state.activeProfileId);
    const sitePatch = origin ? state.siteOverrides[origin] : undefined;
    const sessionOverrides =
      tabId !== undefined ? await this.getSessionOverrides() : undefined;
    const sessionPatch =
      tabId !== undefined && sessionOverrides ? sessionOverrides[tabId] : undefined;

    const effective = resolveSettings({
      globalPatch: state.globalPatch,
      profilePatch: profile?.patch,
      sitePatch,
      sessionPatch,
    });

    return { state, effective };
  }

  async updatePatch(params: {
    scope: 'global' | 'profile' | 'site' | 'session';
    patch: SettingsPatch;
    origin?: string;
    tabId?: number;
    profileId?: string;
  }): Promise<PersistedState> {
    if (params.scope === 'session') {
      if (params.tabId === undefined) {
        throw new Error('tabId is required for session scope updates');
      }
      await this.setSessionOverride(params.tabId, params.patch);
      return this.getState();
    }

    const state = await this.getState();

    if (params.scope === 'global') {
      state.globalPatch = mergeSettingsPatches(state.globalPatch, params.patch);
    } else if (params.scope === 'site') {
      if (!params.origin) {
        throw new Error('origin is required for site scope updates');
      }
      const prev = state.siteOverrides[params.origin] ?? {};
      state.siteOverrides[params.origin] = mergeSettingsPatches(prev, params.patch);
    } else if (params.scope === 'profile') {
      const targetId = params.profileId ?? state.activeProfileId;
      state.profiles = state.profiles.map((profile) => {
        if (profile.id !== targetId) return profile;
        return {
          ...profile,
          patch: mergeSettingsPatches(profile.patch, params.patch),
          updatedAt: Date.now(),
        };
      });
    }

    await this.saveState(state);
    return state;
  }

  async deleteSiteOverride(origin: string): Promise<PersistedState> {
    const state = await this.getState();
    if (origin in state.siteOverrides) {
      delete state.siteOverrides[origin];
      await this.saveState(state);
    }
    return state;
  }

  async createProfile(params: {
    name: string;
    experiences: Profile['experiences'];
    patch: SettingsPatch;
    activate: boolean;
  }): Promise<PersistedState> {
    const state = await this.getState();
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `profile-${Date.now()}`;
    const profile: Profile = {
      id,
      name: params.name,
      presetId: 'custom',
      experiences: params.experiences,
      patch: params.patch,
      updatedAt: Date.now(),
    };
    state.profiles = [...state.profiles, profile];
    if (params.activate) {
      state.activeProfileId = id;
    }
    await this.saveState(state);
    return state;
  }

  async getVault(): Promise<Record<string, string>> {
    const res = await chrome.storage.local.get(VAULT_KEY);
    const raw = res[VAULT_KEY];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw as Record<string, string>;
  }

  async setVault(entries: Record<string, string>): Promise<Record<string, string>> {
    // Replace-all semantics: the dashboard always sends the complete vault.
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(entries)) {
      if (typeof value === 'string' && value.trim() !== '') {
        sanitized[key] = value;
      }
    }
    await chrome.storage.local.set({ [VAULT_KEY]: sanitized });
    return sanitized;
  }
}

function mergeSettingsPatches(base: SettingsPatch, next: SettingsPatch): SettingsPatch {
  const withBase = applyPatch(BUILTIN_DEFAULTS, base);
  const merged = applyPatch(withBase, next);

  return {
    disabledOnSite: next.disabledOnSite ?? base.disabledOnSite,
    adaptation: next.adaptation ? { ...base.adaptation, ...merged.adaptation } : base.adaptation,
    voice: next.voice ? { ...base.voice, ...merged.voice } : base.voice,
    ui: next.ui ? { ...base.ui, ...merged.ui } : base.ui,
    privacy: next.privacy ? { ...base.privacy, ...merged.privacy } : base.privacy,
  };
}

export const storageService = new StorageService();
