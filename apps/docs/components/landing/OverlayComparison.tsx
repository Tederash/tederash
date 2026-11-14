"use client";

import React from "react";
import { Check, X, ShieldAlert, ShieldCheck } from "lucide-react";

interface ComparisonRow {
  aspect: string;
  overlay: {
    text: string;
    verdict: "bad" | "warning";
  };
  tederash: {
    text: string;
    verdict: "good";
  };
}

const COMPARISON_DATA: ComparisonRow[] = [
  {
    aspect: "DOM Architecture",
    overlay: {
      text: "Injects external scripts that apply CSS zoom or filters over an unchanged, inaccessible DOM tree.",
      verdict: "bad",
    },
    tederash: {
      text: "Native React components built directly on semantic HTML and Radix UI accessible primitives.",
      verdict: "good",
    },
  },
  {
    aspect: "Screen Reader Support",
    overlay: {
      text: "Often interferes with screen-reader focus orders and fails to remediate missing ARIA relationships.",
      verdict: "bad",
    },
    tederash: {
      text: "Dedicated event bus managing polite and assertive aria-live announcements without screen-reader collision.",
      verdict: "good",
    },
  },
  {
    aspect: "Layout & Target Geometry",
    overlay: {
      text: "CSS zooms break responsive breakpoints, clipping interactive buttons and modals off-screen.",
      verdict: "bad",
    },
    tederash: {
      text: "Calibrated touch target tokens (44px, 56px, 64px) that preserve flexbox and grid layouts cleanly.",
      verdict: "good",
    },
  },
  {
    aspect: "Cognitive Adaptation",
    overlay: {
      text: "Limited to font swapping or contrast overlays without understanding context or validation errors.",
      verdict: "bad",
    },
    tederash: {
      text: "Dynamic plain-language field guidance, error explanation, and automated distraction reduction.",
      verdict: "good",
    },
  },
  {
    aspect: "Data Privacy & Telemetry",
    overlay: {
      text: "Third-party vendors track user browsing sessions and infer assistive disability categories.",
      verdict: "bad",
    },
    tederash: {
      text: "100% client-side execution. Preferences stay in local browser storage; zero external tracking.",
      verdict: "good",
    },
  },
  {
    aspect: "WCAG 2.2 AA Conformance",
    overlay: {
      text: "Explicitly rejected by accessibility advocates and legal precedents as insufficient compliance.",
      verdict: "bad",
    },
    tederash: {
      text: "Engineered to satisfy WCAG 2.2 Success Criteria for Target Size, Contrast, and Error Identification.",
      verdict: "good",
    },
  },
];

export function OverlayComparison() {
  return (
    <section
      aria-labelledby="comparison-heading"
      className="py-16 md:py-24 border-b border-border bg-card"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Architectural Integrity</span>
          </div>
          <h2
            id="comparison-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground"
          >
            Why runtime adaptation replaces overlay widgets.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Accessibility overlays attempt to patch broken web applications from the outside with superficial CSS.
            Tederash integrates directly into the component runtime, giving developers predictable, testable,
            and truly accessible interfaces.
          </p>
        </div>

        {/* Structured Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="py-4 px-4 sm:px-6 font-semibold text-foreground w-1/4">
                  Evaluation Criteria
                </th>
                <th className="py-4 px-4 sm:px-6 font-semibold text-destructive w-3/8">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Traditional Overlay Toolbars</span>
                  </div>
                </th>
                <th className="py-4 px-4 sm:px-6 font-semibold text-teal-700 dark:text-teal-400 w-3/8">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Tederash Runtime Framework</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARISON_DATA.map((row) => (
                <tr key={row.aspect} className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-4 sm:px-6 font-semibold text-foreground align-top">
                    {row.aspect}
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-muted-foreground align-top">
                    <div className="flex items-start gap-2.5">
                      <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="leading-relaxed">{row.overlay.text}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-foreground align-top">
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="leading-relaxed font-medium">{row.tederash.text}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
