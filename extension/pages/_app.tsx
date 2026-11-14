import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import { isExtensionContext, sendToBackground } from '../src/lib/runtime';
import { createEnvelope, type SettingsGetResponse } from '../src/shared/messages';

type ThemeSetting = 'system' | 'light' | 'dark' | 'high-contrast';

function resolveTheme(setting: ThemeSetting): 'light' | 'dark' | 'high-contrast' {
  if (setting !== 'system') return setting;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/** Applies the extension's own accessibility theme to extension pages (dogfooding). */
function ExtensionThemeProvider() {
  useEffect(() => {
    const root = document.documentElement;
    let cleanupMedia: (() => void) | undefined;

    async function apply() {
      let setting: ThemeSetting = 'system';
      if (isExtensionContext()) {
        try {
          const res = await sendToBackground<SettingsGetResponse>(
            createEnvelope('settings/get', {})
          );
          if (res.ok) setting = res.effective.ui.extensionTheme;
        } catch {
          // Fall back to system theme.
        }
      }
      root.dataset.theme = resolveTheme(setting);
      if (setting === 'system' && typeof window.matchMedia === 'function') {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = () => {
          root.dataset.theme = media.matches ? 'dark' : 'light';
        };
        media.addEventListener('change', listener);
        cleanupMedia = () => media.removeEventListener('change', listener);
      }
    }

    void apply();

    let storageChanged: ((changes: Record<string, unknown>, area: string) => void) | undefined;
    if (isExtensionContext() && chrome.storage?.onChanged?.addListener) {
      storageChanged = (_changes, area) => {
        if (area === 'local') void apply();
      };
      chrome.storage.onChanged.addListener(storageChanged);
    }

    return () => {
      cleanupMedia?.();
      if (storageChanged && isExtensionContext()) {
        chrome.storage.onChanged.removeListener(storageChanged);
      }
    };
  }, []);

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  const ActiveComponent = Component as React.ComponentType<any>;
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Tederash</title>
      </Head>
      <ExtensionThemeProvider />
      <ActiveComponent {...pageProps} />
    </>
  );
}
