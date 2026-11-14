"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PRESET_PROFILES,
  TederashProfile,
  useTederash,
} from "@tederash/react";
import {
  Check,
  Copy,
  Terminal,
  ArrowRight,
  BookOpen,
  Sliders,
  Eye,
  MousePointerClick,
  Brain,
  Languages,
} from "lucide-react";

const INSTALL_COMMAND = "pnpm add @tederash/core @tederash/react @tederash/components";

export function HeroSection() {
  const { profile, adaptations, setProfile, announce } = useTederash();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      announce({
        message: "Install command copied to clipboard.",
        priority: "polite",
        category: "info",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSelectPreset = (preset: TederashProfile) => {
    setProfile(preset);
    announce({
      message: `Activated ${preset.name} accessibility profile.`,
      priority: "polite",
      category: "info",
    });
  };

  const getPresetIcon = (presetId: string) => {
    switch (presetId) {
      case "low-vision":
        return <Eye className="w-3.5 h-3.5" aria-hidden="true" />;
      case "motor-assist":
        return <MousePointerClick className="w-3.5 h-3.5" aria-hidden="true" />;
      case "cognitive-assist":
        return <Brain className="w-3.5 h-3.5" aria-hidden="true" />;
      case "amharic":
        return <Languages className="w-3.5 h-3.5" aria-hidden="true" />;
      default:
        return <Sliders className="w-3.5 h-3.5" aria-hidden="true" />;
    }
  };

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative pt-12 pb-16 md:pt-16 md:pb-24 border-b border-border"
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center text-center">
        {/* Descriptive Category Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border mb-6">
          <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400" aria-hidden="true" />
          <span>Runtime-adaptive accessibility framework for React</span>
        </div>

        {/* Solid Impact Headline (No gradient text tell) */}
        <h1
          id="hero-heading"
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl leading-tight"
        >
          Accessibility that adapts at runtime, not an overlay toolbar.
        </h1>

        {/* Direct, Concrete Value Proposition (No slop adjectives) */}
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed">
          Traditional overlays inject CSS filters on top of a broken DOM. Tederash equips React applications
          with typed accessibility profiles: components adapt geometry, touch target boundaries, contrast,
          and screen-reader announcements dynamically at runtime without altering application logic.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs/quick-start"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>

          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted transition-colors focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <BookOpen className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <span>Read Documentation</span>
          </Link>

          <a
            href="https://github.com/tederash/tederash-ui-library"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted transition-colors focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <span>View Source on GitHub</span>
          </a>
        </div>

        {/* Quick Install Snippet */}
        <div className="mt-8 w-full max-w-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border bg-card font-mono text-xs text-foreground shadow-sm">
            <div className="flex items-center gap-2 truncate">
              <Terminal className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="truncate">{INSTALL_COMMAND}</span>
            </div>
            <button
              onClick={handleCopy}
              aria-label={copied ? "Copied command to clipboard" : "Copy install command to clipboard"}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-sans font-medium text-xs transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Preset Switcher Ribbon */}
        <div className="mt-12 w-full max-w-4xl p-4 sm:p-5 rounded-xl border border-border bg-card text-left shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Framework Runtime Controller
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a profile to observe the entire page adapt its typography, contrast, and touch targets in real time.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Active:</span>
              <span className="font-semibold text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                {profile.name}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESET_PROFILES.map((preset) => {
              const isActive = profile.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border"
                  }`}
                >
                  {getPresetIcon(preset.id)}
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Adaptation Telemetry Row */}
          <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Font Scale</span>
              <span className="font-semibold font-mono text-foreground">
                {adaptations.fontScale.toFixed(2)}x
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Min Target Height</span>
              <span className="font-semibold font-mono text-foreground">
                {adaptations.minTargetHeight}px
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Contrast Mode</span>
              <span className="font-semibold text-foreground">
                {adaptations.highContrast ? "High Contrast (2px)" : "Normal"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Interface Locale</span>
              <span className="font-semibold font-mono text-foreground">
                {profile.locale === "am" ? "am (አማርኛ)" : "en (English)"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
