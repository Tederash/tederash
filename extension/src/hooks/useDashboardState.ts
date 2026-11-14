import { useCallback, useEffect, useState } from 'react';
import { sendToBackground } from '../lib/runtime';
import {
  createEnvelope,
  type SettingsGetResponse,
  type TtsResponse,
  type VaultGetResponse,
} from '../shared/messages';
import type { PersistedState, Profile, SettingsPatch } from '../shared/settings/schema';

export interface DashboardState {
  loading: boolean;
  error: string;
  status: string;
  activeProfileId: string;
  profiles: Profile[];
  onboardingCompleted: boolean;
  state: PersistedState | null;
  vault: Record<string, string>;
  refresh: () => Promise<void>;
  setStatus: (message: string) => void;
  applyPatch: (params: {
    scope: 'global' | 'profile' | 'site';
    patch: SettingsPatch;
    origin?: string;
    profileId?: string;
    statusMessage?: string;
  }) => Promise<void>;
  setActiveProfile: (profileId: string) => Promise<void>;
  createProfile: (params: {
    name: string;
    experiences: Profile['experiences'];
    patch: SettingsPatch;
    activate?: boolean;
    statusMessage?: string;
  }) => Promise<void>;
  deleteSiteOverride: (origin: string) => Promise<void>;
  saveVault: (entries: Record<string, string>) => Promise<void>;
  testVoice: (text: string) => Promise<void>;
  stopSpeaking: () => Promise<void>;
}

export function useDashboardState(): DashboardState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatusMessage] = useState('');
  const [response, setResponse] = useState<SettingsGetResponse | null>(null);
  const [vault, setVaultEntries] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      const [settingsRes, vaultRes] = await Promise.all([
        sendToBackground<SettingsGetResponse>(createEnvelope('settings/get', {})),
        sendToBackground<VaultGetResponse>(createEnvelope('vault/get', {})),
      ]);
      if (settingsRes.ok) setResponse(settingsRes);
      if (vaultRes.ok) setVaultEntries(vaultRes.entries);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyPatch = useCallback<DashboardState['applyPatch']>(async (params) => {
    try {
      const res = await sendToBackground<SettingsGetResponse>(
        createEnvelope('settings/update', {
          scope: params.scope,
          patch: params.patch,
          origin: params.origin,
          profileId: params.profileId,
        })
      );
      if (res.ok) {
        setResponse(res);
        if (params.statusMessage) setStatusMessage(params.statusMessage);
      } else {
        setError('The change could not be saved. Try again.');
      }
    } catch {
      setError('The change could not be saved. Try again.');
    }
  }, []);

  const setActiveProfile = useCallback<DashboardState['setActiveProfile']>(async (profileId) => {
    try {
      const res = await sendToBackground<SettingsGetResponse>(
        createEnvelope('settings/setProfile', { profileId })
      );
      if (res.ok) {
        setResponse(res);
        const name = res.profiles.find((p) => p.id === profileId)?.name ?? 'profile';
        setStatusMessage(`Active profile is now “${name}”.`);
      }
    } catch {
      setError('Could not switch profile. Try again.');
    }
  }, []);

  const createProfile = useCallback<DashboardState['createProfile']>(async (params) => {
    try {
      const res = await sendToBackground<SettingsGetResponse>(
        createEnvelope('profiles/create', {
          name: params.name,
          experiences: params.experiences,
          patch: params.patch,
          activate: params.activate ?? false,
        })
      );
      if (res.ok) {
        setResponse(res);
        if (params.statusMessage) setStatusMessage(params.statusMessage);
      }
    } catch {
      setError('Could not create the profile. Try again.');
    }
  }, []);

  const deleteSiteOverride = useCallback<DashboardState['deleteSiteOverride']>(async (origin) => {
    try {
      const res = await sendToBackground<SettingsGetResponse>(
        createEnvelope('sites/delete', { origin })
      );
      if (res.ok) {
        setResponse(res);
        setStatusMessage(`Reset ${origin} to follow your profile.`);
      }
    } catch {
      setError('Could not reset this site. Try again.');
    }
  }, []);

  const saveVault = useCallback<DashboardState['saveVault']>(async (entries) => {
    try {
      const res = await sendToBackground<VaultGetResponse>(
        createEnvelope('vault/set', { entries })
      );
      if (res.ok) {
        setVaultEntries(res.entries);
        setStatusMessage('Vault saved on this device.');
      }
    } catch {
      setError('Could not save the vault. Try again.');
    }
  }, []);

  const testVoice = useCallback<DashboardState['testVoice']>(async (text) => {
    const res = await sendToBackground<TtsResponse>(createEnvelope('tts/speak', { text }));
    if (!res.ok) {
      setStatusMessage(res.error ?? 'Speech is unavailable right now.');
    } else {
      setStatusMessage('Speaking…');
    }
  }, []);

  const stopSpeaking = useCallback<DashboardState['stopSpeaking']>(async () => {
    await sendToBackground<TtsResponse>(createEnvelope('tts/stop', {}));
    setStatusMessage('Stopped.');
  }, []);

  return {
    loading,
    error,
    status,
    activeProfileId: response?.activeProfileId ?? 'custom',
    profiles: response?.profiles ?? [],
    onboardingCompleted: response?.onboardingCompleted ?? false,
    state: response
      ? {
          schemaVersion: 1,
          onboardingCompleted: response.onboardingCompleted,
          activeProfileId: response.activeProfileId,
          profiles: response.profiles,
          globalPatch: response.globalPatch ?? {},
          siteOverrides: response.siteOverrides ?? {},
        }
      : null,
    vault,
    refresh,
    setStatus: setStatusMessage,
    applyPatch,
    setActiveProfile,
    createProfile,
    deleteSiteOverride,
    saveVault,
    testVoice,
    stopSpeaking,
  };
}
