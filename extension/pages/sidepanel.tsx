import Head from 'next/head';

export default function SidePanelPage() {
  return (
    <>
      <Head>
        <title>Tederash Assistant</title>
      </Head>
      <main className="min-h-screen bg-bg text-fg p-4 flex flex-col gap-4">
        <header className="border-b border-border pb-3">
          <h1 className="text-lg font-bold">Tederash Assistant</h1>
          <p className="text-xs text-fg-muted">
            Persistent side panel for agent transcripts and guided forms.
          </p>
        </header>
        <section className="rounded-md border border-border bg-surface p-4 text-sm text-fg-muted">
          No active task running. Open the popup or press Alt+Shift+A on any page to begin.
        </section>
      </main>
    </>
  );
}
