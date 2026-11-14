"use client";

import * as React from "react";
import { useTederash } from "@tederash/react";
import { TederashButton } from "@tederash/components";
import { AccessibilitySettings } from "./AccessibilitySettings";

interface AuditViolation {
  id: string;
  impact?: string | null;
  help: string;
  description: string;
}

/** Dispatch on `window` to open the settings drawer from anywhere on the page. */
export const OPEN_ACCESSIBILITY_SETTINGS_EVENT = "tederash:open-accessibility-settings";

export function AccessibilityControlPanel() {
  const { profile, adaptations, resetProfile, announce } = useTederash();
  const [isOpen, setIsOpen] = React.useState(false);
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(OPEN_ACCESSIBILITY_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_ACCESSIBILITY_SETTINGS_EVENT, open);
  }, []);

  // Move focus into the drawer when it opens; return it to the trigger on close.
  React.useEffect(() => {
    if (isOpen) drawerRef.current?.focus();
    else if (wasOpenRef.current) triggerRef.current?.focus();
    wasOpenRef.current = isOpen;
  }, [isOpen]);
  const [auditResults, setAuditResults] = React.useState<AuditViolation[] | null>(null);
  const [isAuditing, setIsAuditing] = React.useState(false);

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
          ref={triggerRef}
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
          ref={drawerRef}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
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

          <AccessibilitySettings idPrefix="drawer" />

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
