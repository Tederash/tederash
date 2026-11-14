"use client";

import React, { useState } from "react";
import { ShieldCheck, Play, CheckCircle2, AlertTriangle, Terminal } from "lucide-react";
import { useTederash } from "@tederash/react";

export function AuditToolingSection() {
  const { announce } = useTederash();
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditStats, setAuditStats] = useState<{
    passes: number;
    violations: number;
    timestamp: string;
  } | null>(null);

  const runLiveAudit = async () => {
    setIsRunningAudit(true);
    try {
      const axe = (await import("axe-core")).default;
      const results = await axe.run(document.body, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      });

      setAuditStats({
        passes: results.passes.length,
        violations: results.violations.length,
        timestamp: new Date().toLocaleTimeString(),
      });

      announce({
        message: `Accessibility audit finished: ${results.passes.length} rules passed with ${results.violations.length} violations.`,
        priority: "polite",
        category: results.violations.length === 0 ? "success" : "warning",
      });
    } catch (err) {
      console.error("Axe audit error:", err);
    } finally {
      setIsRunningAudit(false);
    }
  };

  return (
    <section
      aria-labelledby="audit-heading"
      className="py-16 md:py-24 border-b border-border bg-muted/20"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Automated Verification</span>
            </div>

            <h2
              id="audit-heading"
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground"
            >
              Verify WCAG 2.2 AA conformance in your browser.
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Tederash embeds axe-core directly into its development tooling. Run real-time accessibility
              audits on your application under any active profile to catch contrast failures, missing label
              associations, and invalid role structures before shipping to production.
            </p>

            <div className="mt-2 flex flex-col gap-2.5 text-xs sm:text-sm text-foreground/90">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 shrink-0 mt-2" aria-hidden="true" />
                <span>
                  <strong>Full Standard Coverage:</strong> Validates against WCAG 2.0, 2.1, and 2.2 Level A and AA rulesets.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 shrink-0 mt-2" aria-hidden="true" />
                <span>
                  <strong>Profile-Aware Auditing:</strong> Inspect how contrast and touch target scores change when users activate Low Vision or Motor Assist profiles.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 shrink-0 mt-2" aria-hidden="true" />
                <span>
                  <strong>Drawer Integration:</strong> Access the audit tool anytime using the floating accessibility pill in the bottom-right corner.
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={runLiveAudit}
                disabled={isRunningAudit}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isRunningAudit ? "Analyzing DOM Tree..." : "Run Live axe-core Audit"}</span>
              </button>
            </div>
          </div>

          {/* Audit Results Specimen */}
          <div className="lg:col-span-5 p-6 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  axe-core Runtime Scanner
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                v4.10.2
              </span>
            </div>

            {auditStats ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs">
                  <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Passed Rule Checks</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-teal-700 dark:text-teal-300">
                    {auditStats.passes}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border text-xs">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
                    <span>Detected Violations</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {auditStats.violations}
                  </span>
                </div>

                <span className="text-[11px] text-muted-foreground font-mono">
                  Scan completed at {auditStats.timestamp} on {document?.querySelectorAll("*").length ?? 0} elements.
                </span>
              </div>
            ) : (
              <div className="p-6 rounded-lg border border-dashed border-border bg-background text-center flex flex-col items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-muted-foreground opacity-50" aria-hidden="true" />
                <span className="text-xs font-semibold text-foreground">
                  No scan executed yet
                </span>
                <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                  Click the button to scan this entire page against WCAG 2.2 AA accessibility rules in real time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
