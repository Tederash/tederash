"use client";

import * as React from "react";
import Link from "next/link";
import {
  PRESET_PROFILES,
  useAccessibility,
  useLocale,
  useSpeechSynthesis,
} from "@tederash/react";
import {
  AccessibleButton,
  AccessibleInput,
} from "@tederash/components";
import {
  Terminal,
  Check,
  Copy,
  ArrowRight,
  BookOpen,
  Volume2,
  Bot,
  Sliders,
  CheckCircle2,
  Keyboard,
  ShieldCheck,
} from "lucide-react";

export function HeroIsometricShowcase() {
  const { profile, adaptations, setProfile, announce } = useAccessibility();
  const { t } = useLocale();
  const { speak, isSpeaking, isSupported: speechSupported } = useSpeechSynthesis();
  const [copiedCommand, setCopiedCommand] = React.useState(false);
  const [demoInput, setDemoInput] = React.useState("developer@tederash.dev");

  const installCommand = "pnpm add @tederash/core @tederash/react @tederash/components";

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopiedCommand(true);
      announce({
        message: "Installation command copied to clipboard.",
        priority: "polite",
      });
      setTimeout(() => setCopiedCommand(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleReadAloud = () => {
    if (!speechSupported) return;
    speak(
      "Adaptive Accessibility Runtime is active. Form controls, geometry, and focus states adjust automatically to match user preferences."
    );
  };

  return (
    <section
      aria-labelledby="hero-title"
      className="relative w-full pt-4 pb-12 lg:pt-8 lg:pb-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
        {/* =====================================================================
            LEFT COLUMN: Direct, clear value proposition
            ===================================================================== */}
        <div className="lg:col-span-6 flex flex-col items-start text-left gap-6">
          {/* Category / Context Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-border bg-muted/60 text-foreground text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
            <span>Open Source Accessibility Runtime for React</span>
          </div>

          {/* Solid H1 (No gradient text) */}
          <h1
            id="hero-title"
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.12]"
          >
            Interfaces that adapt to every user at runtime.
          </h1>

          {/* Clear, concrete description (No slop vocabulary, no em dashes) */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
            Accessibility is not a cosmetic toolbar or an isolated settings panel.
            Tederash provides a centralized runtime engine that dynamically adjusts
            component geometry, high contrast tokens, keyboard focus, and multimodal
            assistance across your application without modifying business logic.
          </p>

          {/* Interactive Profile Switcher: Direct affordance */}
          <div className="flex flex-col gap-2.5 w-full max-w-lg pt-1">
            <label
              id="hero-profile-label"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>Select an accessibility profile to test runtime adaptation:</span>
            </label>
            <div
              role="group"
              aria-labelledby="hero-profile-label"
              className="flex flex-wrap gap-2"
            >
              {PRESET_PROFILES.slice(0, 5).map((p) => {
                const isActive = profile.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProfile(p);
                      announce({
                        message: `Switched to ${p.name} profile.`,
                        priority: "polite",
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
            <AccessibleButton
              variant="primary"
              onClick={() => {
                const demoElement = document.getElementById("demo");
                demoElement?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span>Try Interactive Form</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </AccessibleButton>

            <AccessibleButton
              asChild
              variant="outline"
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Link href="/docs">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>Read Documentation</span>
              </Link>
            </AccessibleButton>
          </div>

          {/* Quick Install Snippet */}
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 pl-2 overflow-x-auto font-mono text-xs text-foreground">
              <Terminal className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span className="select-all">{installCommand}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyCommand}
              aria-label="Copy installation command"
              className="p-1.5 rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {copiedCommand ? (
                <Check className="w-4 h-4 text-primary" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Verified technical facts */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>WCAG 2.2 AA target</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>282 passing unit tests</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-primary" />
              <span>Full keyboard and screen reader support</span>
            </span>
          </div>
        </div>

        {/* =====================================================================
            RIGHT COLUMN: Functional Layered Live Specimen (Clean Craft)
            ===================================================================== */}
        <div className="lg:col-span-6 relative w-full flex flex-col gap-4">
          {/* Main Inspection Card */}
          <div className="w-full rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-5">
            {/* Header with active profile metadata */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  Active Specimen Canvas
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-muted text-muted-foreground">
                  {profile.id}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>Runtime active</span>
              </div>
            </div>

            {/* Live Component Under Active Profile */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="specimen-input"
                  className="text-xs font-semibold text-foreground flex items-center justify-between"
                >
                  <span>Email address</span>
                  {adaptations.showInstructions && (
                    <span className="text-xs font-normal text-muted-foreground">
                      Required for account access
                    </span>
                  )}
                </label>
                <AccessibleInput
                  id="specimen-input"
                  type="email"
                  value={demoInput}
                  onChange={(e) => setDemoInput(e.target.value)}
                  description={
                    adaptations.showInstructions
                      ? "Enter the email associated with your organization."
                      : undefined
                  }
                />
              </div>

              {/* Action Buttons with Profile Adaptations */}
              <div className="flex items-center gap-2.5">
                <AccessibleButton
                  variant="primary"
                  onClick={() => {
                    announce({
                      message: "Submitted sample with current profile preferences.",
                      priority: "polite",
                    });
                  }}
                >
                  Save preferences
                </AccessibleButton>

                <AccessibleButton
                  variant="outline"
                  onClick={handleReadAloud}
                  className="flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{isSpeaking ? "Speaking..." : "Read aloud"}</span>
                </AccessibleButton>
              </div>
            </div>

            {/* Resolved Runtime Signals Table */}
            <div className="pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-md bg-muted/50 flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">Target size</span>
                <span className="font-mono font-semibold text-foreground">
                  {adaptations.targetSize}
                </span>
              </div>
              <div className="p-2 rounded-md bg-muted/50 flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">Font scale</span>
                <span className="font-mono font-semibold text-foreground">
                  {adaptations.fontScale}x
                </span>
              </div>
              <div className="p-2 rounded-md bg-muted/50 flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">High contrast</span>
                <span className="font-mono font-semibold text-foreground">
                  {adaptations.highContrast ? "Enabled" : "Default"}
                </span>
              </div>
              <div className="p-2 rounded-md bg-muted/50 flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">Reduced motion</span>
                <span className="font-mono font-semibold text-foreground">
                  {adaptations.reduceMotion ? "Enabled" : "Off"}
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Assistive Information Card (Meaningful, not decorative) */}
          <div className="w-full rounded-xl border border-border bg-muted/40 p-4 flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-card border border-border text-primary shrink-0">
              <Bot className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <span>AI assistance adapter</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono text-muted-foreground">
                  Pluggable
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                When cognitive assistance is enabled, field instructions are simplified
                into plain language and validation errors are explained deterministically
                before any optional LLM calls.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
