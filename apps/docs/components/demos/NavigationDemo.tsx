"use client";

import * as React from "react";
import { TederashNavigation } from "@tederash/components";
import { useTederash, PRESET_PROFILES } from "@tederash/react";

export function NavigationDemo() {
  const { profile, setProfile } = useTederash();
  const [active, setActive] = React.useState("/docs/components");

  const sampleLinks = [
    { href: "/", label: "Home" },
    { href: "/docs", label: "Documentation" },
    { href: "/docs/components", label: "Components", badge: "9" },
    { href: "/test", label: "Demo" },
  ];

  return (
    <div className="my-6 p-6 rounded-xl border border-border bg-card flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Interactive Specimen
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test skip-link affordance, aria-current page signalling, and responsive keyboard navigation.
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

      <div className="border border-border rounded-lg overflow-hidden bg-background">
        <TederashNavigation
          links={sampleLinks}
          activeRoute={active}
          brandName="Tederash UI"
          brandHref="#"
          showSkipLink={false}
          actions={
            <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground">
              Actions Slot
            </span>
          }
        />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
        <span>Active Link: <strong className="text-foreground">{active}</strong> (marked with aria-current=&quot;page&quot;)</span>
        <div className="flex gap-2">
          {sampleLinks.map((l) => (
            <button
              key={l.href}
              type="button"
              onClick={() => setActive(l.href)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Set {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
