"use client";

import React from "react";
import {
  Layers,
  Code2,
  Component,
  Cpu,
  Keyboard,
  HelpCircle,
  Gauge,
} from "lucide-react";

interface LayerItem {
  number: number;
  title: string;
  pkg: string;
  description: string;
  responsibilities: string[];
}

const LAYERS: LayerItem[] = [
  {
    number: 1,
    title: "Developer API",
    pkg: "@tederash/react",
    description: "The primary developer integration surface for React applications.",
    responsibilities: [
      "AccessibilityProvider root context",
      "React hooks: useAccessibility, useAdaptations, useAnnounce",
      "Dynamic component-level overrides",
      "Zero re-render memoized selector system",
    ],
  },
  {
    number: 2,
    title: "Adaptive Component Library",
    pkg: "@tederash/components",
    description: "Production-ready UI primitives that automatically respond to the active profile.",
    responsibilities: [
      "Built on accessible Radix UI primitives",
      "Target size scaling (44px, 56px, 64px)",
      "High-contrast border tokens and visible focus states",
      "Destructive action confirmation safeguards",
    ],
  },
  {
    number: 3,
    title: "Accessibility Runtime",
    pkg: "@tederash/core",
    description: "The central framework-independent state and preference resolution engine.",
    responsibilities: [
      "Deterministic profile inheritance and merging",
      "Adaptation rule evaluation engine",
      "Local browser storage persistence",
      "Decoupled publish-subscribe event bus",
    ],
  },
  {
    number: 4,
    title: "Interaction Engine",
    pkg: "@tederash/core",
    description: "Handles alternative physical input modalities and assistive technologies.",
    responsibilities: [
      "Keyboard focus trap and visible indicators",
      "Forgiving touch and click hit margins",
      "Web Speech API synthesis and recognition adapters",
      "Screen-reader polite and assertive live regions",
    ],
  },
  {
    number: 5,
    title: "Assistance Engine",
    pkg: "@tederash/assistance",
    description: "Contextual assistance that simplifies complex forms and explains errors.",
    responsibilities: [
      "Plain-language validation error translations",
      "Field instruction simplification",
      "Step-by-step guided form workflows",
      "Pluggable, provider-agnostic assistance interface",
    ],
  },
  {
    number: 6,
    title: "Developer Experience & Tooling",
    pkg: "apps/docs & devtools",
    description: "Interactive inspection and auditing tools for development teams.",
    responsibilities: [
      "Real-time profile switching panel",
      "Integrated in-browser axe-core audits",
      "Active adaptation and CSS variable inspector",
      "Live WCAG 2.2 target geometry verification",
    ],
  },
];

export function ArchitectureLayers() {
  return (
    <section
      aria-labelledby="architecture-heading"
      className="py-16 md:py-24 border-b border-border bg-card"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Modular Engineering</span>
          </div>
          <h2
            id="architecture-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground"
          >
            A decoupled 6-layer architecture.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Every responsibility is isolated into independent packages. The core runtime operates without React,
            components build upon semantic Radix primitives, and contextual assistance remains optional and modular.
          </p>
        </div>

        {/* 6 Layers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LAYERS.map((layer) => (
            <div
              key={layer.number}
              className="p-6 rounded-xl border border-border bg-background shadow-sm flex flex-col justify-between hover:border-foreground/30 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-mono">
                    LAYER {layer.number}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {layer.pkg}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-bold text-foreground">
                  {layer.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {layer.description}
                </p>

                <ul className="mt-4 flex flex-col gap-1.5 text-xs text-foreground/90">
                  {layer.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 shrink-0 mt-1.5" aria-hidden="true" />
                      <span className="leading-snug">{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
