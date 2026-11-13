"use client";

import * as React from "react";
import {
  PRESET_PROFILES,
  TargetSize,
  useTederash,
} from "@tederash/react";
import { TederashButton } from "@tederash/components";

interface AuditViolation {
  id: string;
  impact?: string | null;
  help: string;
  description: string;
}

export function AccessibilityControlPanel() {
  const { profile, adaptations, setProfile, updatePreferences, resetProfile, announce } =
    useTederash();
  const [isOpen, setIsOpen] = React.useState(false);
  const [auditResults, setAuditResults] = React.useState<AuditViolation[] | null>(null);
  const [isAuditing, setIsAuditing] = React.useState(false);

  const handleSelectPreset = (presetId: string) => {
    const selected = PRESET_PROFILES.find((p) => p.id === presetId);
    if (selected) {
      setProfile(selected);
      announce({
        message: `Activated ${selected.name} accessibility profile.`,
        priority: "polite",
        category: "info",
      });
    }
  };

  const runAxeAudit = async () => {
    setIsAuditing(true);
    try {
      const axe = (await import("axe-core")).default;
      const results = await axe.run(document.body, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      });
      setAuditResults(results.violations);
      announce({
        message: `Accessibility audit complete. Found ${results.violations.length} violations.`,
        priority: "polite",
        category: results.violations.length === 0 ? "success" : "warning",
      });
    } catch (err) {
      console.error("Axe audit error:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <>
      {/* Floating Accessibility Trigger Pill */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="accessibility-drawer"
          className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs tracking-wide shadow-xl transition-all border border-primary/30 bg-primary text-primary-foreground hover:scale-105 hover:shadow-2xl focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <span aria-hidden="true" className="text-base">♿</span>
          <span>A11y: <strong>{profile.name}</strong></span>
        </button>
      </div>

      {/* Slide-out Accessibility Drawer */}
      {isOpen && (
        <div
          id="accessibility-drawer"
          role="dialog"
          aria-label="Adaptive Accessibility Settings"
          className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l border-border shadow-2xl z-50 overflow-y-auto p-6 flex flex-col gap-6"
        >
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold">Adaptive Accessibility Runtime</h2>
              <p className="text-xs text-muted-foreground">
                Runtime preference & profile control panel
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close accessibility controls"
              className="p-2 rounded-md hover:bg-muted text-lg font-bold"
            >
              ✕
            </button>
          </div>

          {/* Quick Preset Selector */}
          <section className="flex flex-col gap-2">
            <label className="text-sm font-semibold">Accessibility Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_PROFILES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  aria-pressed={profile.id === p.id}
                  className={`p-2.5 rounded-lg text-left text-xs font-medium border transition-all ${
                    profile.id === p.id
                      ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary"
                      : "border-border bg-card hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Fine-Tuning Controls */}
          <section className="flex flex-col gap-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Fine-Tune Preferences</h3>

            {/* Font Scale */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span>Font Scale</span>
                <span>{(profile.visual?.fontScale ?? 1.0).toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.0"
                step="0.05"
                value={profile.visual?.fontScale ?? 1.0}
                onChange={(e) =>
                  updatePreferences({
                    visual: { fontScale: parseFloat(e.target.value) },
                  })
                }
                className="w-full cursor-pointer accent-primary"
              />
            </div>

            {/* Target Size */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Target Size (Touch/Click)</label>
              <div className="grid grid-cols-3 gap-2">
                {(["normal", "large", "extra-large"] as TargetSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() =>
                      updatePreferences({ motor: { targetSize: size } })
                    }
                    className={`py-1.5 text-xs rounded border capitalize ${
                      (profile.motor?.targetSize ?? "normal") === size
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-background"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Boolean Toggles */}
            <div className="grid grid-cols-1 gap-2 text-xs">
              <label className="flex items-center justify-between p-2 rounded border bg-card cursor-pointer">
                <span>High Contrast Mode</span>
                <input
                  type="checkbox"
                  checked={Boolean(profile.visual?.highContrast)}
                  onChange={(e) =>
                    updatePreferences({
                      visual: { highContrast: e.target.checked },
                    })
                  }
                  className="rounded accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded border bg-card cursor-pointer">
                <span>Underline Links</span>
                <input
                  type="checkbox"
                  checked={Boolean(profile.visual?.underlineLinks)}
                  onChange={(e) =>
                    updatePreferences({
                      visual: { underlineLinks: e.target.checked },
                    })
                  }
                  className="rounded accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded border bg-card cursor-pointer">
                <span>Reduce Motion & Animations</span>
                <input
                  type="checkbox"
                  checked={Boolean(profile.visual?.reduceMotion)}
                  onChange={(e) =>
                    updatePreferences({
                      visual: { reduceMotion: e.target.checked },
                    })
                  }
                  className="rounded accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded border bg-card cursor-pointer">
                <span>Simplified Plain Language</span>
                <input
                  type="checkbox"
                  checked={Boolean(profile.cognitive?.simplifiedLanguage)}
                  onChange={(e) =>
                    updatePreferences({
                      cognitive: { simplifiedLanguage: e.target.checked },
                    })
                  }
                  className="rounded accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded border bg-card cursor-pointer">
                <span>Show Extended Instructions</span>
                <input
                  type="checkbox"
                  checked={Boolean(profile.cognitive?.showInstructions)}
                  onChange={(e) =>
                    updatePreferences({
                      cognitive: { showInstructions: e.target.checked },
                    })
                  }
                  className="rounded accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded border bg-card cursor-pointer">
                <span>Guided Step-by-Step Form Flow</span>
                <input
                  type="checkbox"
                  checked={Boolean(profile.cognitive?.guidedInteraction)}
                  onChange={(e) =>
                    updatePreferences({
                      cognitive: { guidedInteraction: e.target.checked },
                    })
                  }
                  className="rounded accent-primary"
                />
              </label>
            </div>
          </section>

          {/* Active Adaptations Inspector */}
          <section className="border-t pt-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Active Resolved Adaptations</h3>
            <div className="bg-muted/50 p-3 rounded-lg text-[11px] font-mono space-y-1">
              <div>fontScale: {adaptations.fontScale}</div>
              <div>minTargetHeight: {adaptations.minTargetHeight}</div>
              <div>targetPadding: {adaptations.targetPadding}</div>
              <div>highContrast: {String(adaptations.highContrast)}</div>
              <div>focusIndicator: {adaptations.focusIndicator}</div>
              <div>reduceMotion: {String(adaptations.reduceMotion)}</div>
              <div>simplifiedLanguage: {String(adaptations.simplifiedLanguage)}</div>
            </div>
          </section>

          {/* Automated Accessibility Audit (axe-core) */}
          <section className="border-t pt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Automated A11y Audit</h3>
              <TederashButton
                variant="outline"
                onClick={runAxeAudit}
                disabled={isAuditing}
                className="text-xs py-1 px-3 min-h-[32px]"
              >
                {isAuditing ? "Auditing..." : "Run axe-core"}
              </TederashButton>
            </div>

            {auditResults !== null && (
              <div className="mt-2 text-xs">
                {auditResults.length === 0 ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 rounded-md font-medium border border-emerald-300">
                    ✅ 0 WCAG violations detected on current view.
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100 rounded-md border border-red-300 space-y-2">
                    <div className="font-bold">⚠️ {auditResults.length} violation(s) detected:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {auditResults.map((v, i) => (
                        <li key={i}>
                          <strong>{v.id}</strong>: {v.help} ({v.impact})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Reset Action */}
          <div className="border-t pt-4 mt-auto">
            <TederashButton
              variant="outline"
              onClick={() => {
                resetProfile();
                announce({
                  message: "Reset accessibility preferences to default.",
                  priority: "polite",
                });
              }}
              className="w-full text-xs"
            >
              Reset to Standard Defaults
            </TederashButton>
          </div>
        </div>
      )}
    </>
  );
}
