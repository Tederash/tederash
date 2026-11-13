"use client";

import * as React from "react";
import { LiveRegion } from "@tederash/components";
import { useAccessibility, PRESET_PROFILES } from "@tederash/react";
import { AccessibleButton } from "@tederash/components";

export function LiveRegionDemo() {
  const { profile, setProfile, announce } = useAccessibility();
  const [history, setHistory] = React.useState<string[]>([]);

  const handleAnnounce = (priority: "polite" | "assertive", msg: string) => {
    announce({ message: msg, priority });
    setHistory((prev) => [
      `[${new Date().toLocaleTimeString()}] (${priority}) ${msg}`,
      ...prev.slice(0, 4),
    ]);
  };

  return (
    <div className="my-6 p-6 rounded-xl border border-border bg-card flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Interactive Specimen
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test screen-reader live region updates with optional visual banner fallback.
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

      <div className="flex flex-wrap items-center gap-3">
        <AccessibleButton
          variant="primary"
          onClick={() => handleAnnounce("polite", "Preferences saved successfully.")}
        >
          Announce Polite Status
        </AccessibleButton>

        <AccessibleButton
          variant="destructive"
          onClick={() => handleAnnounce("assertive", "Critical validation error detected.")}
        >
          Announce Assertive Alert
        </AccessibleButton>

        <AccessibleButton
          variant="outline"
          onClick={() => handleAnnounce("polite", "File upload 100% complete.")}
        >
          Announce Progress Update
        </AccessibleButton>
      </div>

      {/* Visual LiveRegion */}
      <div className="p-4 rounded-lg bg-muted/40 border border-border flex flex-col gap-2">
        <span className="text-xs font-semibold text-foreground">Recent Announcements Log:</span>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No announcements triggered yet.</p>
        ) : (
          <ul className="space-y-1.5 text-xs font-mono text-foreground">
            {history.map((h, i) => (
              <li key={i} className="p-1.5 rounded bg-background border border-border">
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>

      <LiveRegion showVisualBanner />

      <div className="pt-3 border-t border-border text-xs text-muted-foreground">
        <span>Dual Live Region: Maintains aria-live=&quot;polite&quot; and aria-live=&quot;assertive&quot; nodes simultaneously.</span>
      </div>
    </div>
  );
}
