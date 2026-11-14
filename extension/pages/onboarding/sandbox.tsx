import Head from 'next/head';
import React, { useState } from 'react';
import { Button } from '../../src/components/ui/Button';

export default function OnboardingSandboxPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <Head>
        <title>Tederash Practice Page</title>
      </Head>
      <main className="mx-auto max-w-2xl bg-bg text-fg p-8 flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold">Tederash Practice Sandbox</h1>
          <p className="text-fg-muted mt-1">
            Try adjusting text size, contrast, or testing guided forms on this local page.
          </p>
        </header>

        <article className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold">Sample Reading Article</h2>
          <p className="mt-2">
            Web accessibility ensures everyone can perceive, understand, navigate, and interact
            with websites comfortably regardless of device or ability.
          </p>
        </article>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="rounded-lg border border-border bg-surface p-6 flex flex-col gap-4"
        >
          <h2 className="text-xl font-semibold">Sample Form</h2>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="min-h-[2.75rem] rounded-md border border-border bg-bg px-3 text-fg"
            />
          </label>
          <Button type="submit" variant="primary">
            Submit practice form
          </Button>
          {submitted ? (
            <p role="status" className="text-sm text-success">
              Practice form submitted locally.
            </p>
          ) : null}
        </form>
      </main>
    </>
  );
}
