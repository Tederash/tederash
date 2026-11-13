"use client";

import * as React from "react";
import { AccessibleForm, AccessibleInput, AccessibleButton } from "@tederash/components";
import { useAccessibility, PRESET_PROFILES } from "@tederash/react";

export function FormDemo() {
  const { profile, setProfile, adaptations } = useAccessibility();
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: string[] = [];
    if (!name.trim()) newErrors.push("Full name is required.");
    if (!email.trim() || !email.includes("@")) newErrors.push("A valid email address is required.");

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setSuccess(false);
    } else {
      setErrors([]);
      setSuccess(true);
    }
  };

  return (
    <div className="my-6 p-6 rounded-xl border border-border bg-card flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Interactive Specimen
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test accessible error summaries, role=&quot;alert&quot;, and screen-reader announcements.
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

      {success ? (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-foreground flex flex-col gap-2">
          <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
            ✓ Form successfully validated and submitted
          </span>
          <p className="text-xs text-muted-foreground">
            An accessible polite announcement was dispatched to assistive technologies.
          </p>
          <AccessibleButton
            variant="outline"
            className="w-fit text-xs mt-1"
            onClick={() => {
              setSuccess(false);
              setName("");
              setEmail("");
            }}
          >
            Reset Sample Form
          </AccessibleButton>
        </div>
      ) : (
        <AccessibleForm
          errors={errors}
          onSubmit={handleSubmit}
          successAnnouncement="Form submitted successfully."
          className="flex flex-col gap-4"
        >
          <AccessibleInput
            label="Contact Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.length > 0) setErrors([]);
            }}
            required
            description="Enter the primary contact name."
          />

          <AccessibleInput
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.length > 0) setErrors([]);
            }}
            required
            description="We never share your email with third parties."
          />

          <div className="flex items-center gap-3 pt-2">
            <AccessibleButton type="submit" variant="primary">
              Submit Form
            </AccessibleButton>
            <AccessibleButton
              type="button"
              variant="outline"
              onClick={() => {
                setName("");
                setEmail("");
                setErrors([]);
              }}
            >
              Clear
            </AccessibleButton>
          </div>
        </AccessibleForm>
      )}

      <div className="pt-3 border-t border-border text-xs text-muted-foreground">
        <span>Guided Mode: <strong className="text-foreground">{adaptations.guidedInteraction ? "Enabled (data-guided=&quot;true&quot;)" : "Standard"}</strong></span>
      </div>
    </div>
  );
}
