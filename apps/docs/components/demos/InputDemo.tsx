"use client";

import * as React from "react";
import { TederashInput } from "@tederash/components";
import { useTederash, PRESET_PROFILES } from "@tederash/react";

export function InputDemo() {
  const { profile, setProfile, adaptations } = useTederash();
  const [val1, setVal1] = React.useState("Abebe Bikila");
  const [val2, setVal2] = React.useState("invalid-email");
  const [showError, setShowError] = React.useState(true);

  return (
    <div className="my-6 p-6 rounded-xl border border-border bg-card flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Interactive Specimen
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test label association, error states, and cognitive plain-language instructions.
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
        <TederashInput
          label="Full Legal Name"
          value={val1}
          onChange={(e) => setVal1(e.target.value)}
          description="Enter your given and family name as shown on legal identity documents."
          simplifiedDescription="Type your real first and last name."
          required
        />

        <TederashInput
          label="Corporate Email Address"
          type="email"
          value={val2}
          onChange={(e) => {
            setVal2(e.target.value);
            setShowError(!e.target.value.includes("@"));
          }}
          error={showError ? "Please enter a valid email address containing an @ symbol." : undefined}
          description="We will send your verification token to this address."
          required
        />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
        <span>
          Cognitive Mode: <strong className="text-foreground">{adaptations.simplifiedLanguage ? "Active (simplifiedDescription)" : "Standard (description)"}</strong>
        </span>
        <button
          type="button"
          onClick={() => setShowError(!showError)}
          className="text-primary hover:underline font-medium"
        >
          {showError ? "Clear Error State" : "Simulate Validation Error"}
        </button>
      </div>
    </div>
  );
}
