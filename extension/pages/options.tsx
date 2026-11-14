import Head from 'next/head';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/Tabs';
import { ProfilesSection } from '../src/components/dashboard/ProfilesSection';
import { SitesSection } from '../src/components/dashboard/SitesSection';
import { VoiceSection } from '../src/components/dashboard/VoiceSection';
import { VaultSection } from '../src/components/dashboard/VaultSection';
import { PrivacySection } from '../src/components/dashboard/PrivacySection';
import { ShortcutsSection } from '../src/components/dashboard/ShortcutsSection';
import { GlobalSection } from '../src/components/dashboard/GlobalSection';
import { AboutSection } from '../src/components/dashboard/AboutSection';
import { useDashboardState } from '../src/hooks/useDashboardState';

const SECTIONS = [
  { id: 'profiles', label: 'Profiles' },
  { id: 'global', label: 'Global preferences' },
  { id: 'sites', label: 'Sites' },
  { id: 'voice', label: 'Voice & speech' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
  { id: 'vault', label: 'Vault' },
  { id: 'privacy', label: 'AI & privacy' },
  { id: 'about', label: 'About' },
] as const;

export default function OptionsDashboardPage() {
  const [activeTab, setActiveTab] = React.useState<string>('profiles');
  const dashboard = useDashboardState();

  return (
    <>
      <Head>
        <title>Tederash Dashboard</title>
      </Head>
      <div className="min-h-screen bg-bg text-fg p-6 md:p-10">
        <header className="mx-auto max-w-5xl border-b border-border pb-4 mb-6">
          <h1 className="text-2xl font-bold">Tederash Dashboard</h1>
          <p className="text-sm text-fg-muted mt-1">
            Personalize your accessibility profiles, voice settings, vault, and privacy controls.
          </p>
        </header>

        <main className="mx-auto max-w-5xl">
          {dashboard.loading ? (
            <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label="Loading dashboard">
              <span className="sr-only">Loading your settings…</span>
              <div className="h-10 w-full max-w-xl animate-pulse rounded-md bg-surface-elevated" />
              <div className="h-40 w-full animate-pulse rounded-lg bg-surface-elevated" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-6">
              <nav aria-label="Dashboard sections">
                <TabsList>
                  {SECTIONS.map((s) => (
                    <TabsTrigger key={s.id} value={s.id}>
                      {s.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </nav>

              {dashboard.error ? (
                <div role="alert" className="rounded-md border border-danger bg-surface p-3 text-sm text-danger">
                  {dashboard.error}{' '}
                  <button type="button" className="underline" onClick={() => void dashboard.refresh()}>
                    Retry
                  </button>
                </div>
              ) : null}

              <TabsContent value="profiles" className="rounded-lg border border-border bg-surface p-6">
                <h2 className="text-xl font-semibold">Profiles</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  A profile is a coherent set of adaptations that follows you across every site.
                </p>
                <div className="mt-4">
                  <ProfilesSection dashboard={dashboard} />
                </div>
              </TabsContent>

              <TabsContent value="global" className="rounded-lg border border-border bg-surface p-6">
                <h2 className="text-xl font-semibold">Global preferences</h2>
                <div className="mt-4">
                  <GlobalSection dashboard={dashboard} />
                </div>
              </TabsContent>

              <TabsContent value="sites" className="rounded-lg border border-border bg-surface p-6">
                <h2 className="text-xl font-semibold">Sites</h2>
                <div className="mt-4">
                  <SitesSection dashboard={dashboard} />
                </div>
              </TabsContent>

              <TabsContent value="voice" className="rounded-lg border border-border bg-surface p-6">
                <h2 className="text-xl font-semibold">Voice &amp; speech</h2>
                <div className="mt-4">
                  <VoiceSection dashboard={dashboard} />
                </div>
              </TabsContent>

              <TabsContent value="shortcuts" className="rounded-lg border border-border bg-surface p-6">
                <h2 className="text-xl font-semibold">Keyboard shortcuts</h2>
                <div className="mt-4">
                  <ShortcutsSection />
                </div>
              </TabsContent>

              <TabsContent value="vault" className="rounded-lg border border-border bg-surface p-6">
                <h2 className="text-xl font-semibold">Vault</h2>
                <div className="mt-4">
                  <VaultSection dashboard={dashboard} />
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="rounded-lg border border-border bg-surface p-6">
                <h2 className="text-xl font-semibold">AI &amp; privacy</h2>
                <div className="mt-4">
                  <PrivacySection dashboard={dashboard} />
                </div>
              </TabsContent>

              <TabsContent value="about" className="rounded-lg border border-border bg-surface p-6">
                <h2 className="text-xl font-semibold">About</h2>
                <div className="mt-4">
                  <AboutSection dashboard={dashboard} />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </main>

        <div className="sr-only" aria-live="polite">
          {dashboard.status}
        </div>
      </div>
    </>
  );
}
