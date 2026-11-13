"use client";

import * as React from "react";
import { AccessibleCheckbox } from "@tederash/components";
import { useAccessibility, PRESET_PROFILES } from "@tederash/react";

export function CheckboxDemo() {
  const { profile, setProfile, adaptations } = useAccessibility();
  const [checked1, setChecked1] = React.useState(true);
  const [checked2, setChecked2] = React.useState(false);
  const [indeterminate, setIndeterminate] = React.useState(true);

  return (
    <div className="my-6 p-6 rounded-xl border border-border bg-card flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Interactive Specimen
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test keyboard space toggle, touch target bounds, and high-contrast outlines.
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

      <div className="flex flex-col gap-4">
        <AccessibleCheckbox
          id="cb-terms"
          label="I accept the terms and conditions"
          description="Required to create an active account and use developer APIs."
          simplifiedDescription="Check this box to agree to the rules."
          checked={checked1}
          onCheckedChange={setChecked1}
          required
        />

        <AccessibleCheckbox
          id="cb-marketing"
          label="Email notifications for accessibility release notes"
          description="We send updates at most once a month."
          checked={checked2}
          onCheckedChange={setChecked2}
        />

        <AccessibleCheckbox
          id="cb-tri"
          label="Select all sub-workspace permissions (Indeterminate)"
          indeterminate={indeterminate}
          checked={indeterminate ? false : true}
          onCheckedChange={() => setIndeterminate(!indeterminate)}
          description="Click to toggle indeterminate state."
        />

        <AccessibleCheckbox
          id="cb-disabled"
          label="Disabled administrative privilege option"
          disabled
          defaultChecked
          description="Managed by your organization administrator."
        />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
        <span>Target Minimum Size: <strong className="text-foreground">{adaptations.minTargetHeight}</strong></span>
        <span>Keyboard: Focus with <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono">Tab</kbd>, toggle with <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono">Space</kbd></span>
      </div>
    </div>
  );
}
