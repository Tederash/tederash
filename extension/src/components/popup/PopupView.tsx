import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { getActiveTabInfo, isExtensionContext, openExtensionRoute, sendToBackground } from '../../lib/runtime';
import { createEnvelope } from '../../shared/messages';

function openDashboard(): void {
  openExtensionRoute('options.html');
}

function openSidePanel(tabId?: number): void {
  if (isExtensionContext() && typeof chrome.sidePanel?.open === 'function' && tabId !== undefined) {
    void chrome.sidePanel.open({ tabId });
    if (typeof window !== 'undefined') window.close();
  } else {
    openExtensionRoute('sidepanel.html');
  }
}

export function PopupView() {
  const [loading, setLoading] = useState(true);
  const [tabId, setTabId] = useState<number | undefined>();
  const [origin, setOrigin] = useState<string | undefined>();
  const [tabTitle, setTabTitle] = useState<string>('');
  const [restricted, setRestricted] = useState(false);
  const [isTederash, setIsTederash] = useState(false);
  const [tederashProfile, setTederashProfile] = useState<string | undefined>();
  const [tederashVersion, setTederashVersion] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const tab = await getActiveTabInfo();
        if (!active) return;
        setTabId(tab.tabId);
        setOrigin(tab.origin);
        setTabTitle(tab.origin || tab.url || '');
        setRestricted(tab.restricted);

        if (!tab.restricted && tab.tabId !== undefined) {
          try {
            const check = (await sendToBackground(
              createEnvelope('tab/checkTederash', { tabId: tab.tabId })
            )) as {
              ok: boolean;
              isTederash: boolean;
              tederashVersion?: string;
              tederashProfile?: string;
            };

            if (active && check?.ok) {
              setIsTederash(check.isTederash);
              setTederashVersion(check.tederashVersion);
              setTederashProfile(check.tederashProfile);
            }
          } catch {
            if (active) setIsTederash(false);
          }
        }
      } catch {
        // Fallback for mock/dev environment
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="w-[340px] min-h-[220px] bg-bg p-4 flex flex-col gap-3 justify-center items-center" aria-busy="true">
        <span className="sr-only">Loading Tederash…</span>
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin" />
        <span className="text-xs text-fg-muted font-mono">Checking active tab…</span>
      </main>
    );
  }

  return (
    <main className="w-[340px] bg-bg text-fg p-4 flex flex-col gap-4 font-sans select-none">
      <header className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
          <h1 className="text-sm font-semibold tracking-tight">Tederash Assistant</h1>
        </div>
        {isTederash ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 font-medium">
            Active v{tederashVersion || '0.1.0'}
          </span>
        ) : (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-elevated text-fg-muted border border-border">
            Inactive
          </span>
        )}
      </header>

      {restricted ? (
        <section className="rounded-lg border border-border bg-surface p-3 text-xs text-fg-muted flex flex-col gap-1">
          <p className="font-medium text-fg">Restricted browser page</p>
          <p>The assistant cannot attach to internal chrome:// or Web Store tabs.</p>
        </section>
      ) : isTederash ? (
        <section className="rounded-lg border border-border bg-surface-elevated p-3.5 flex flex-col gap-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fg truncate max-w-[200px]" title={origin}>
              {origin || tabTitle || 'Tederash Application'}
            </span>
            {tederashProfile && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-fg-muted">
                {tederashProfile}
              </span>
            )}
          </div>
          <p className="text-xs text-fg-muted leading-relaxed">
            The Tederash Accessibility Runtime is active on this tab. Open the sidebar assistant to navigate, inspect, and interact with accessible components.
          </p>
          <Button
            variant="primary"
            size="compact"
            onClick={() => openSidePanel(tabId)}
            className="w-full mt-1"
          >
            Open Assistant Sidebar
          </Button>
        </section>
      ) : (
        <section className="rounded-lg border border-border bg-surface p-3.5 flex flex-col gap-2 text-xs text-fg-muted">
          <p className="font-semibold text-fg">Tederash not detected</p>
          <p className="leading-relaxed">
            The assistant only runs on web applications built with the <strong>Tederash Component Library</strong>.
          </p>
          <p className="text-[11px] font-mono truncate text-fg-muted" title={origin}>
            {origin || 'Current Tab'}
          </p>
          <Button
            variant="secondary"
            size="compact"
            onClick={() => openSidePanel(tabId)}
            className="w-full mt-1"
          >
            View Assistant
          </Button>
        </section>
      )}

      <footer className="flex items-center justify-between border-t border-border pt-2 text-[11px] text-fg-muted font-mono">
        <button
          type="button"
          onClick={() => openDashboard()}
          className="hover:text-fg underline transition-colors"
        >
          Settings
        </button>
        <span>Tederash v0.1.0</span>
      </footer>
    </main>
  );
}
