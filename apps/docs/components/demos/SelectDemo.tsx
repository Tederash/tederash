"use client";

import * as React from "react";
import { TederashSelect } from "@tederash/components";
import { useTederash, PRESET_PROFILES } from "@tederash/react";

export function SelectDemo() {
  const { profile, setProfile, adaptations } = useTederash();
  const [val1, setVal1] = React.useState("am");
  const [val2, setVal2] = React.useState("");

  const languageOptions = [
    { value: "en", label: "English (US)", description: "Default interface language" },
    { value: "am", label: "አማርኛ (Amharic)", description: "First-class Ge'ez localization" },
    { value: "om", label: "Afaan Oromoo", description: "Oromo translation dictionary" },
    { value: "ti", label: "ትግርኛ (Tigrinya)", description: "Tigrinya localization" },
  ];

  const roleOptions = [
    { value: "dev", label: "Software Engineer" },
    { value: "a11y", label: "Accessibility Specialist" },
    { value: "qa", label: "Quality Assurance Analyst" },
    { value: "lead", label: "Engineering Lead", disabled: true },
  ];

  return (
    <div className="my-6 p-6 rounded-xl border border-border bg-card flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Interactive Specimen
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test combobox / listbox pattern, arrow key navigation, and high-contrast items.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Profile:</span>
          <select
            value={profile.id}
            onChange={(e) => {
              const selected = PRESET_PROFILES.find((p) => p.id === e.target.value);
              if (selected) setProfile(selected);
            }}
            className="px-2 py-1 rounded bg-background border border-border text-foreground font-medium text-xs"
          >
            {PRESET_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TederashSelect
          id="select-lang"
          label="Interface Language"
          options={languageOptions}
          value={val1}
          onChange={setVal1}
          description="Select the preferred language for labels and speech output."
          simplifiedDescription="Choose the language you want to read and hear."
          required
        />

        <TederashSelect
          id="select-role"
          label="Professional Role"
          options={roleOptions}
          value={val2}
          onChange={setVal2}
          placeholder="Choose a role..."
          description="Used to configure workspace defaults."
          error={!val2 ? "Please select a role to continue." : undefined}
        />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
        <span>Selected Language: <strong className="text-foreground">{val1}</strong></span>
        <span>Keyboard: Open with <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono">Enter</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono">↓</kbd>, navigate with Arrow keys</span>
      </div>
    </div>
  );
}
