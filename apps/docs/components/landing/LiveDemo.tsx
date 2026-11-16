"use client";

import React, { useState } from "react";
import {
  TederashButton,
  TederashCheckbox,
  TederashInput,
  TederashSelect,
} from "@tederash/components";
import { PRESET_PROFILES, useTederash } from "@tederash/react";
import type { Locale } from "@tederash/core";
import { useLandingTranslation } from "./translations";

// Presets shown in the live demo: includes English (standard), low-vision, motor, cognitive, Amharic, and Oromo.
const DEMO_PRESET_IDS = [
  "standard",
  "low-vision",
  "motor-assist",
  "cognitive-assist",
  "amharic",
  "oromo",
];

export function LiveDemo() {
  const { profile, adaptations, setProfile, announce } = useTederash();
  const { locale, t, setLocale } = useLandingTranslation();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [updates, setUpdates] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const presets = DEMO_PRESET_IDS
    .map((id) => PRESET_PROFILES.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const roleOptions = [
    { value: "engineer", label: t.liveDemo.form.roleEngineer },
    { value: "designer", label: t.liveDemo.form.roleDesigner },
    { value: "teacher", label: t.liveDemo.form.roleTeacher },
  ];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    announce({
      message: t.liveDemo.form.announcedSuccess,
      priority: "polite",
      category: "success",
    });
  };

  const handleSelectPreset = (preset: (typeof presets)[0]) => {
    setProfile(preset);
    const localizedName = t.liveDemo.presetNames[preset.id] ?? preset.name;
    announce({
      message: t.liveDemo.form.announcedProfile.replace("{name}", localizedName),
      priority: "polite",
      category: "info",
    });
  };

  const languageDisplay =
    locale === "am"
      ? "አማርኛ (Amharic)"
      : locale === "om"
        ? "Afaan Oromoo"
        : "English";

  return (
    <section aria-labelledby="demo-heading" className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
        <h2 id="demo-heading" className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {t.liveDemo.heading}
        </h2>
        <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
          {t.liveDemo.description}
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-8 md:gap-12">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">{t.liveDemo.profileTitle}</p>
            <div className="flex flex-col gap-1.5" role="group" aria-label="Accessibility profile">
              {presets.map((preset) => {
                const active = profile.id === preset.id;
                const displayName = t.liveDemo.presetNames[preset.id] ?? preset.name;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-left px-3 py-2 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>

            {/* Quick Language Switcher */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t.liveDemo.languageTitle}
              </p>
              <div className="flex items-center gap-1.5">
                {[
                  { id: "en", label: "EN" },
                  { id: "am", label: "አማ" },
                  { id: "om", label: "OM" },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setLocale(lang.id as Locale)}
                    aria-pressed={locale === lang.id}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      locale === lang.id
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <dl className="mt-6 text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-muted-foreground">{t.liveDemo.stats.textSize}</dt>
              <dd className="font-mono text-foreground">{adaptations.fontScale.toFixed(2)}×</dd>
              <dt className="text-muted-foreground">{t.liveDemo.stats.targetHeight}</dt>
              <dd className="font-mono text-foreground">{adaptations.minTargetHeight}px</dd>
              <dt className="text-muted-foreground">{t.liveDemo.stats.contrast}</dt>
              <dd className="text-foreground">
                {adaptations.highContrast ? t.liveDemo.stats.high : t.liveDemo.stats.normal}
              </dd>
              <dt className="text-muted-foreground">{t.liveDemo.stats.language}</dt>
              <dd className="text-foreground font-medium">{languageDisplay}</dd>
            </dl>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-lg border border-border p-6 md:p-8 flex flex-col gap-5"
            aria-label={t.liveDemo.form.ariaLabel}
          >
            <TederashInput
              id="demo-name"
              label={t.liveDemo.form.nameLabel}
              value={name}
              onChange={(e) => setName(e.target.value)}
              description={t.liveDemo.form.nameDescription}
              simplifiedDescription={t.liveDemo.form.nameSimplified}
              required
            />
            <TederashSelect
              id="demo-role"
              label={t.liveDemo.form.roleLabel}
              options={roleOptions}
              value={role}
              onChange={setRole}
              placeholder={t.liveDemo.form.rolePlaceholder}
              simplifiedDescription={t.liveDemo.form.roleSimplified}
            />
            <TederashCheckbox
              id="demo-updates"
              label={t.liveDemo.form.updatesLabel}
              checked={updates}
              onCheckedChange={setUpdates}
            />
            <div className="flex items-center gap-4 pt-1">
              <TederashButton type="submit" variant="primary">
                {t.liveDemo.form.submitButton}
              </TederashButton>
              {submitted && (
                <p role="status" className="text-sm text-muted-foreground">
                  {t.liveDemo.form.submittedStatus}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
