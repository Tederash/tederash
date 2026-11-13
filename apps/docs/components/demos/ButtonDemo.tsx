"use client";

import * as React from "react";
import { TederashButton } from "@tederash/components";
import { useTederash, PRESET_PROFILES } from "@tederash/react";

export function ButtonDemo() {
  const { profile, setProfile, adaptations } = useTederash();
  const [clickedMsg, setClickedMsg] = React.useState<string | null>(null);

  const handleClick = (variant: string) => {
    setClickedMsg(`Clicked ${variant} button`);
    setTimeout(() => setClickedMsg(null), 2500);
  };

  return (
    <div className="my-6 p-6 rounded-xl border border-border bg-card flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Interactive Specimen
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test target height, focus indicators, and confirmation behavior across profiles.
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

      {/* Button Variants Grid */}
      <div className="flex flex-wrap items-center gap-3">
        <TederashButton variant="primary" onClick={() => handleClick("primary")}>
          Primary Action
        </TederashButton>
        <TederashButton variant="secondary" onClick={() => handleClick("secondary")}>
          Secondary
        </TederashButton>
        <TederashButton variant="outline" onClick={() => handleClick("outline")}>
          Outline
        </TederashButton>
        <TederashButton variant="ghost" onClick={() => handleClick("ghost")}>
          Ghost
        </TederashButton>
        <TederashButton variant="link" onClick={() => handleClick("link")}>
          Link Style
        </TederashButton>
        <TederashButton
          variant="destructive"
          confirmDestructivePrompt="Are you sure you want to delete this resource?"
          onClick={() => handleClick("destructive (confirmed)")}
        >
          Destructive Action
        </TederashButton>
        <TederashButton variant="primary" disabled>
          Disabled
        </TederashButton>
      </div>

      {/* Status Output */}
      <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
        <span>
          Resolved Target Height: <strong className="text-foreground">{adaptations.minTargetHeight}</strong>
        </span>
        {clickedMsg ? (
          <span className="text-primary font-medium">{clickedMsg}</span>
        ) : (
          <span>Click any button or navigate with Tab</span>
        )}
      </div>
    </div>
  );
}
