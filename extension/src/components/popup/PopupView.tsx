import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { Switch } from '../ui/Switch';
import { ProfileMenu } from './ProfileMenu';
import { getActiveTabInfo, sendToBackground } from '../../lib/runtime';
import {
  createEnvelope,
  type PingResponse,
  type SettingsGetResponse,
  type TtsResponse,
} from '../../shared/messages';
import type { SettingsPatch } from '../../shared/settings/schema';
import type { ThemeMode } from '../../shared/types';

export function PopupView() {
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [reading, setReading] = useState(false);
  const [tabId, setTabId] = useState<number | undefined>();
  const [origin, setOrigin] = useState<string | undefined>();
  const [restricted, setRestricted] = useState(false);

  const [profiles, setProfiles] = useState<SettingsGetResponse['profiles']>([]);
  const [activeProfileId, setActiveProfileId] = useState('custom');
  const [disabledOnSite, setDisabledOnSite] = useState(false);
  const [textScale, setTextScale] = useState(1.0);
  const [contrastTheme, setContrastTheme] = useState<ThemeMode>('default');
  const [readingRuler, setReadingRuler] = useState(false);
  const [connectionState, setConnectionState] = useState<'checking' | 'connected' | 'offline'>(
    'checking'
  );

  const hydrateFromResponse = useCallback((res: SettingsGetResponse) => {
    setProfiles(res.profiles);
    setActiveProfileId(res.activeProfileId);
    setDisabledOnSite(res.effective.disabledOnSite);
    setTextScale(res.effective.adaptation.textScale);
    setContrastTheme(res.effective.adaptation.contrastTheme);
    setReadingRuler(res.effective.adaptation.readingRuler);
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const tab = await getActiveTabInfo();
        if (!active) return;
        setTabId(tab.tabId);
        setOrigin(tab.origin);
        setRestricted(tab.restricted);

        const settingsRes = await sendToBackground<SettingsGetResponse>(
          createEnvelope('settings/get', { origin: tab.origin, tabId: tab.tabId })
        );
        if (!active) return;
        if (settingsRes.ok) {
          hydrateFromResponse(settingsRes);
        }

        const bgPing = await sendToBackground<PingResponse>(createEnvelope('system/ping', {}));
        if (!active) return;
        if (bgPing.ok && !tab.restricted && tab.tabId !== undefined) {
          try {
            const contentPing = await sendToBackground<PingResponse>(
              createEnvelope('tab/pingContent', { tabId: tab.tabId })
            );
            if (active) {
              setConnectionState(contentPing.ok ? 'connected' : 'offline');
            }
          } catch {
            if (active) setConnectionState('offline');
          }
        } else {
          setConnectionState(bgPing.ok ? 'connected' : 'offline');
        }
      } catch (err) {
        if (active) {
          setErrorMessage(err instanceof Error ? err.message : 'Unable to load settings.');
          setConnectionState('offline');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [hydrateFromResponse]);

  async function handleProfileChange(nextId: string) {
    setActiveProfileId(nextId);
    const res = await sendToBackground<SettingsGetResponse>(
      createEnvelope('settings/setProfile', { profileId: nextId, origin, tabId })
    );
    if (res.ok) {
      hydrateFromResponse(res);
      const name = res.profiles.find((p) => p.id === nextId)?.name ?? 'Profile';
      setStatusMessage(`Profile set to ${name}`);
    }
  }

  async function sendSiteOrGlobalPatch(patch: SettingsPatch, statusMessage?: string) {
    const scope: 'site' | 'global' = origin ? 'site' : 'global';
    const res = await sendToBackground<SettingsGetResponse>(
      createEnvelope('settings/update', {
        scope,
        origin,
        tabId,
        patch,
      })
    );
    if (res.ok) {
      hydrateFromResponse(res);
      if (statusMessage) setStatusMessage(statusMessage);
    }
  }

  async function handleToggleSite(enabled: boolean) {
    const nextDisabled = !enabled;
    setDisabledOnSite(nextDisabled);
    if (!origin) return;
    await sendSiteOrGlobalPatch(
      { disabledOnSite: nextDisabled },
      nextDisabled ? 'Paused on this site' : 'Active on this site'
    );
  }

  async function handleTextScale(nextScale: number) {
    setTextScale(nextScale);
    if (tabId === undefined) return;
    await sendSiteOrGlobalPatch({ adaptation: { textScale: nextScale } });
  }

  async function handleContrastChange(nextTheme: ThemeMode) {
    setContrastTheme(nextTheme);
    await sendSiteOrGlobalPatch(
      { adaptation: { contrastTheme: nextTheme } },
      `Contrast set to ${nextTheme}`
    );
  }

  async function handleRulerToggle(nextRuler: boolean) {
    setReadingRuler(nextRuler);
    await sendSiteOrGlobalPatch(
      { adaptation: { readingRuler: nextRuler } },
      nextRuler ? 'Reading ruler on — it follows your pointer' : 'Reading ruler off'
    );
  }

  async function handleReadPage() {
    if (tabId === undefined) return;
    setReading(true);
    setStatusMessage('Reading this page…');
    try {
      const res = await sendToBackground<TtsResponse>(
        createEnvelope('tts/readPage', { tabId })
      );
      if (res.ok) {
        setStatusMessage('Reading aloud. Press Stop to stop.');
      } else {
        setErrorMessage(res.error ?? 'Nothing to read on this page.');
      }
    } catch {
      setErrorMessage('Reading is unavailable right now.');
    } finally {
      setReading(false);
    }
  }

  async function handleStop() {
    const res = await sendToBackground<TtsResponse>(createEnvelope('tts/stop', {}));
    setStatusMessage(res.ok ? 'Stopped.' : 'Nothing was playing.');
  }

  if (loading) {
    return (
      <main className="w-[360px] min-h-[320px] bg-bg p-4" aria-busy="true">
        <span className="sr-only">Loading Tederash…</span>
        <div className="flex flex-col gap-3">
          <div className="h-10 animate-pulse rounded-md bg-surface-elevated" />
          <div className="h-16 animate-pulse rounded-md bg-surface-elevated" />
          <div className="h-40 animate-pulse rounded-md bg-surface-elevated" />
        </div>
      </main>
    );
  }

  return (
    <main
      className="w-[360px] max-h-[560px] overflow-y-auto bg-bg text-fg p-4 flex flex-col gap-4"
      aria-busy={loading}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
            aria-hidden="true"
          />
          <h1 className="text-base font-bold tracking-tight">Tederash</h1>
        </div>
        <ProfileMenu profiles={profiles} activeId={activeProfileId} onChange={(id) => void handleProfileChange(id)} />
      </header>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-danger bg-surface p-3 text-sm text-danger"
        >
          {errorMessage}
        </div>
      ) : null}

      {restricted ? (
        <section
          aria-label="Restricted page notice"
          className="rounded-md border border-border bg-surface p-3 text-sm"
        >
          <p className="font-medium">Tederash cannot modify this browser page.</p>
          <p className="mt-1 text-xs text-fg-muted">
            Chrome restricts extensions on internal pages like chrome:// or the Web Store.
          </p>
        </section>
      ) : (
        <>
          <section aria-label="Site activation" className="rounded-md border border-border bg-surface px-3 py-2">
            <Switch
              id="site-master-switch"
              label="Active on this site"
              description={origin ?? 'Current page'}
              checked={!disabledOnSite}
              onCheckedChange={(checked) => void handleToggleSite(checked)}
            />
          </section>

          <section aria-label="Primary actions" className="grid grid-cols-3 gap-2">
            <Button
              variant="primary"
              size="compact"
              disabled
              title="Voice control arrives in Phase P4 of the roadmap"
            >
              Talk
            </Button>
            <Button
              variant="secondary"
              size="compact"
              onClick={() => void handleReadPage()}
              disabled={reading}
            >
              {reading ? 'Reading…' : 'Read page'}
            </Button>
            <Button
              variant="secondary"
              size="compact"
              onClick={() => void handleStop()}
            >
              Stop
            </Button>
          </section>
          <p className="text-xs text-fg-muted -mt-2">
            Voice commands are coming soon. Reading aloud works now.
          </p>

          <section
            aria-label="Quick controls"
            className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3"
          >
            <Slider
              id="quick-text-scale"
              label="Text size"
              value={textScale}
              min={0.9}
              max={2.0}
              step={0.05}
              valueText={`${Math.round(textScale * 100)}%`}
              onValueChange={(val) => void handleTextScale(val)}
            />

            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-sm font-medium text-fg">Contrast</legend>
              <div className="grid grid-cols-3 gap-1.5">
                {(['default', 'dark', 'high-contrast'] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="compact"
                    variant={contrastTheme === mode ? 'primary' : 'secondary'}
                    aria-pressed={contrastTheme === mode}
                    onClick={() => void handleContrastChange(mode)}
                  >
                    {mode === 'default' ? 'Default' : mode === 'dark' ? 'Dark' : 'High'}
                  </Button>
                ))}
              </div>
            </fieldset>

            <Switch
              id="quick-reading-ruler"
              label="Reading ruler"
              checked={readingRuler}
              onCheckedChange={(checked) => void handleRulerToggle(checked)}
            />
          </section>
        </>
      )}

      <footer className="flex items-center justify-between border-t border-border pt-3 text-xs text-fg-muted">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openDashboard()}
            className="min-h-[2.75rem] px-1 underline hover:text-fg"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => openSidePanel(tabId)}
            className="min-h-[2.75rem] px-1 font-semibold text-accent underline hover:text-fg"
          >
            Assistant
          </button>
          <button
            type="button"
            onClick={() => openOnboarding()}
            className="min-h-[2.75rem] px-1 underline hover:text-fg"
          >
            Setup
          </button>
        </div>
        <span data-testid="connection-status">
          {connectionState === 'checking'
            ? 'Checking…'
            : connectionState === 'connected'
              ? 'Connected'
              : 'Standby'}
        </span>
      </footer>

      <div className="sr-only" aria-live="polite">
        {statusMessage}
      </div>
    </main>
  );
}

function openDashboard(): void {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL && chrome.tabs?.create) {
    void chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  } else if (typeof window !== 'undefined') {
    window.open('/options', '_blank', 'noopener');
  }
}

function openSidePanel(tabId?: number): void {
  if (
    typeof chrome !== 'undefined' &&
    chrome.sidePanel &&
    typeof chrome.sidePanel.open === 'function' &&
    tabId !== undefined
  ) {
    void chrome.sidePanel.open({ tabId });
  } else if (typeof chrome !== 'undefined' && chrome.runtime?.getURL && chrome.tabs?.create) {
    void chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
  } else if (typeof window !== 'undefined') {
    window.open('/sidepanel', '_blank', 'noopener');
  }
}

function openOnboarding(): void {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL && chrome.tabs?.create) {
    void chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  } else if (typeof window !== 'undefined') {
    window.open('/onboarding', '_blank', 'noopener');
  }
}
