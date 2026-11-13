"use client";

import * as React from "react";
import { AccessibleTextarea } from "@tederash/components";
import { useAccessibility, PRESET_PROFILES } from "@tederash/react";

export function TextareaDemo() {
  const { profile, setProfile, adaptations } = useAccessibility();
  const [msg1, setMsg1] = React.useState("Tederash enables seamless accessibility adaptation.");
  const [msg2, setMsg2] = React.useState("");

  return (
    <div className="my-6 p-6 rounded-xl border border-border bg-card flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Interactive Specimen
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test live character counter announcement, multi-line auto-expand, and high-contrast rings.
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
        <AccessibleTextarea
          id="ta-feedback"
          label="Accessibility Feedback & Suggestions"
          value={msg1}
          onChange={(e) => setMsg1(e.target.value)}
          maxLength={140}
          showCharacterCount
          description="Share detailed suggestions for improving component adaptation."
          simplifiedDescription="Tell us what you like or want changed."
          rows={4}
          required
        />

        <AccessibleTextarea
          id="ta-issue"
          label="Validation Report"
          value={msg2}
          onChange={(e) => setMsg2(e.target.value)}
          description="Detailed stack trace or error log."
          error={!msg2 ? "Issue report cannot be left blank." : undefined}
          rows={4}
          placeholder="Paste error logs here..."
        />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
        <span>Character Count Accessibility: <strong className="text-foreground">Connected via aria-describedby with live counter updates</strong></span>
      </div>
    </div>
  );
}
