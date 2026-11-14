import Head from 'next/head';
import React, { useEffect, useState } from 'react';
import { Button } from '../src/components/ui/Button';
import { Slider } from '../src/components/ui/Slider';
import { sendToBackground } from '../src/lib/runtime';
import {
  createEnvelope,
  type SettingsGetResponse,
  type TtsResponse,
} from '../src/shared/messages';
import type { ExperienceId, SettingsPatch } from '../src/shared/settings/schema';
import { EXPERIENCE_OPTIONS, patchFromExperiences } from '../src/shared/profiles/experiences';

const DRAFT_KEY = 'tederash_onboarding_draft_v1';
const SAMPLE_TEXT =
  'Hello. This is Tederash, your web accessibility assistant. If this sounds comfortable, you are all set.';

interface Draft {
  step: number;
  selected: ExperienceId[];
  ttsRate: number;
}

function loadDraft(): Draft {
  if (typeof window === 'undefined') return { step: 1, selected: [], ttsRate: 1.0 };
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Draft>;
      return {
        step: parsed.step ?? 1,
        selected: parsed.selected ?? [],
        ttsRate: parsed.ttsRate ?? 1.0,
      };
    }
  } catch {
    // Ignore malformed drafts.
  }
  return { step: 1, selected: [], ttsRate: 1.0 };
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<ExperienceId[]>([]);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [status, setStatus] = useState('');
  const [finishing, setFinishing] = useState(false);

  // Persist partial progress so closing the tab does not lose it (AGENTS.MD §4.3).
  useEffect(() => {
    const draft = loadDraft();
    setStep(draft.step);
    setSelected(draft.selected);
    setTtsRate(draft.ttsRate);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, selected, ttsRate }));
    }
  }, [step, selected, ttsRate]);

  function toggleOption(id: ExperienceId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function testVoice() {
    const res = await sendToBackground<TtsResponse>(
      createEnvelope('tts/speak', { text: SAMPLE_TEXT })
    );
    if (!res.ok) {
      setStatus(res.error ?? 'Voice test is unavailable right now.');
    }
  }

  async function finishOnboarding() {
    setFinishing(true);
    try {
      // 1. Create (or record) the user's profile from their selections.
      const patch: SettingsPatch = patchFromExperiences(selected);
      if (ttsRate !== 1.0) {
        patch.voice = { ...patch.voice, ttsRate };
      }
      await sendToBackground<SettingsGetResponse>(
        createEnvelope('profiles/create', {
          name: selected.length > 0 ? 'My profile' : 'Custom',
          experiences: selected,
          patch,
          activate: true,
        })
      );
      // 2. Mark onboarding complete.
      await sendToBackground<SettingsGetResponse>(
        createEnvelope('onboarding/complete', { completed: true })
      );
      // 3. Clear the draft.
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_KEY);
      }
      setStatus('Setup saved. You can open Tederash from your toolbar anytime.');
    } catch {
      setStatus('Setup could not be saved. You can retry anytime from the popup.');
    } finally {
      setFinishing(false);
    }
  }

  return (
    <>
      <Head>
        <title>Welcome to Tederash</title>
      </Head>
      <main className="mx-auto min-h-screen max-w-2xl bg-bg text-fg px-6 py-10 flex flex-col gap-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Step {step} of 4
            </p>
            <h1 className="text-2xl font-bold mt-1">Welcome to Tederash</h1>
          </div>
          <Button variant="ghost" onClick={() => void finishOnboarding()} disabled={finishing}>
            Skip and use defaults
          </Button>
        </header>

        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={step}
          className="flex gap-1"
        >
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              aria-hidden="true"
              className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-accent' : 'bg-surface-elevated'}`}
            />
          ))}
        </div>

        {step === 1 ? (
          <section aria-labelledby="step-1-heading" className="rounded-lg border border-border bg-surface p-6 flex flex-col gap-4">
            <h2 id="step-1-heading" className="text-xl font-semibold">
              One extension, personalized to how you browse.
            </h2>
            <p className="text-fg-muted">
              Tederash adapts any website, reads pages aloud, guides you through forms, and lets you
              control pages with your voice. Takes about 2 minutes.
            </p>
          </section>
        ) : null}

        {step === 2 ? (
          <section aria-labelledby="step-2-heading" className="rounded-lg border border-border bg-surface p-6 flex flex-col gap-4">
            <h2 id="step-2-heading" className="text-xl font-semibold">
              What helps you most?
            </h2>
            <p className="text-sm text-fg-muted">Choose as many as you like — you can change this anytime.</p>
            <div className="flex flex-col gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-md border border-border px-4 py-2 hover:bg-surface-elevated"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.id)}
                    onChange={() => toggleOption(opt.id)}
                    className="h-5 w-5 accent-accent"
                  />
                  <span className="text-base">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section aria-labelledby="step-3-heading" className="rounded-lg border border-border bg-surface p-6 flex flex-col gap-4">
            <h2 id="step-3-heading" className="text-xl font-semibold">
              Hear how Tederash speaks
            </h2>
            <p className="text-fg-muted">
              Adjust the speaking rate, then test it. You can change this later in Voice &amp;
              speech settings.
            </p>
            <Slider
              id="onboarding-tts-rate"
              label="Speaking rate"
              min={0.5}
              max={2.5}
              step={0.05}
              value={ttsRate}
              valueText={`${ttsRate.toFixed(2)}×`}
              onValueChange={setTtsRate}
            />
            <div>
              <Button variant="secondary" onClick={() => void testVoice()}>
                Test voice
              </Button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section aria-labelledby="step-4-heading" className="rounded-lg border border-border bg-surface p-6 flex flex-col gap-4">
            <h2 id="step-4-heading" className="text-xl font-semibold">
              You are ready to try Tederash
            </h2>
            <p className="text-fg-muted">
              Your preferences stay local on your device. Finish below to save them as your
              profile, then try the practice page.
            </p>
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
                    void chrome.tabs.create({ url: chrome.runtime.getURL('onboarding/sandbox.html') });
                  } else {
                    window.open('/onboarding/sandbox', '_blank', 'noopener');
                  }
                }}
              >
                Open practice sandbox
              </Button>
            </div>
          </section>
        ) : null}

        <footer className="flex items-center justify-between pt-2">
          <Button
            variant="secondary"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </Button>
          {step < 4 ? (
            <Button variant="primary" onClick={() => setStep((s) => Math.min(4, s + 1))}>
              Next
            </Button>
          ) : (
            <Button variant="primary" onClick={() => void finishOnboarding()} disabled={finishing}>
              {finishing ? 'Saving…' : 'Finish setup'}
            </Button>
          )}
        </footer>

        <div role="status" aria-live="polite" className="text-sm text-success">
          {status}
        </div>
      </main>
    </>
  );
}
