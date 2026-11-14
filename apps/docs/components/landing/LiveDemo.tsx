"use client";

import React, { useState } from "react";
import {
  TederashButton,
  TederashCheckbox,
  TederashInput,
  TederashSelect,
} from "@tederash/components";
import { PRESET_PROFILES, useTederash } from "@tederash/react";

// A short, varied subset of the presets. The full list is in the control panel.
const DEMO_PRESET_IDS = ["standard", "low-vision", "motor-assist", "cognitive-assist", "amharic"];

const ROLE_OPTIONS = [
  { value: "engineer", label: "Software engineer" },
  { value: "designer", label: "Designer" },
  { value: "teacher", label: "Teacher" },
];

export function LiveDemo() {
  const { profile, adaptations, setProfile, announce } = useTederash();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [updates, setUpdates] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const presets = DEMO_PRESET_IDS
    .map((id) => PRESET_PROFILES.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const isAmharic = profile.locale === "am";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    announce({
      message: isAmharic ? "ቅጹ ተልኳል።" : "Form submitted.",
      priority: "polite",
      category: "success",
    });
  };

  return (
    <section aria-labelledby="demo-heading" className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
        <h2 id="demo-heading" className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Try it
        </h2>
        <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
          Pick a profile. The form below, and the rest of this site, change with it. Nothing reloads.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-8 md:gap-12">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Profile</p>
            <div className="flex flex-col gap-1.5" role="group" aria-label="Accessibility profile">
              {presets.map((preset) => {
                const active = profile.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setProfile(preset);
                      announce({ message: `${preset.name} profile on.`, priority: "polite", category: "info" });
                    }}
                    className={`text-left px-3 py-2 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>

            <dl className="mt-6 text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-muted-foreground">Text size</dt>
              <dd className="font-mono text-foreground">{adaptations.fontScale.toFixed(2)}×</dd>
              <dt className="text-muted-foreground">Target height</dt>
              <dd className="font-mono text-foreground">{adaptations.minTargetHeight}px</dd>
              <dt className="text-muted-foreground">Contrast</dt>
              <dd className="text-foreground">{adaptations.highContrast ? "High" : "Normal"}</dd>
              <dt className="text-muted-foreground">Language</dt>
              <dd className="text-foreground">{isAmharic ? "አማርኛ" : "English"}</dd>
            </dl>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-lg border border-border p-6 md:p-8 flex flex-col gap-5"
            aria-label={isAmharic ? "የናሙና ቅጽ" : "Sample form"}
          >
            <TederashInput
              id="demo-name"
              label={isAmharic ? "ሙሉ ስም" : "Full name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              description={isAmharic ? "በመታወቂያዎ ላይ እንደሚታየው።" : "As it appears on your ID."}
              simplifiedDescription={isAmharic ? "ስምዎን እዚህ ይጻፉ።" : "Type your first and last name."}
              required
            />
            <TederashSelect
              id="demo-role"
              label={isAmharic ? "ሙያ" : "Role"}
              options={ROLE_OPTIONS}
              value={role}
              onChange={setRole}
              placeholder={isAmharic ? "ይምረጡ" : "Choose one"}
              simplifiedDescription={isAmharic ? "ከዝርዝሩ አንዱን ይምረጡ።" : "Pick the one that fits you best."}
            />
            <TederashCheckbox
              id="demo-updates"
              label={isAmharic ? "ዝማኔዎችን ላኩልኝ" : "Send me updates"}
              checked={updates}
              onCheckedChange={setUpdates}
            />
            <div className="flex items-center gap-4 pt-1">
              <TederashButton type="submit" variant="primary">
                {isAmharic ? "ላክ" : "Submit"}
              </TederashButton>
              {submitted && (
                <p role="status" className="text-sm text-muted-foreground">
                  {isAmharic ? "ተልኳል። ይህ ናሙና ብቻ ነው።" : "Submitted. This is only a demo."}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
