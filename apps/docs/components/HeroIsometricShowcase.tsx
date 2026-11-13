"use client";

import * as React from "react";
import Link from "next/link";
import {
  PRESET_PROFILES,
  useAccessibility,
  useLocale,
  useSpeechSynthesis,
} from "@tederash/react";
import { AccessibleButton } from "@tederash/components";
import {
  Sparkles,
  Check,
  Copy,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Brain,
  Mic,
  Volume2,
  Bot,
  Sliders,
  CheckCircle2,
  BookOpen,
  Keyboard,
  Layers,
} from "lucide-react";

export function HeroIsometricShowcase() {
  const { profile, adaptations, setProfile, announce } = useAccessibility();
  const { t } = useLocale();
  const { speak, isSpeaking, isSupported: speechSupported } = useSpeechSynthesis();
  const [copiedCommand, setCopiedCommand] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"components" | "agents" | "runtime">("components");

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
      // clipboard fallback
    }
  };

  const handleSpeechDemo = () => {
    if (!speechSupported) return;
    speak(
      "Tederash Adaptive Accessibility Runtime is active. Every form field and component adapts dynamically to user preferences."
    );
  };

  return (
    <section
      aria-labelledby="hero-title"
      className="relative w-full pt-4 pb-16 lg:pt-10 lg:pb-24 overflow-hidden"
    >
      {/* Background ambient mesh gradient glows inspired by DesignCode */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] opacity-40 dark:opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.45) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(20, 184, 166, 0.4) 0%, transparent 45%), radial-gradient(circle at 50% 60%, rgba(236, 72, 153, 0.25) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* =====================================================================
            LEFT COLUMN: Copy, Values, Quick CTAs
            ===================================================================== */}
        <div className="lg:col-span-6 flex flex-col items-start text-left gap-6 z-10">
          {/* Announcement Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold backdrop-blur-md shadow-xs">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" aria-hidden="true" />
            <span>Tederash SDK v1.0 • Adaptive Accessibility</span>
          </div>

          {/* Hero Main Headline (Bold DesignCode style) */}
          <h1
            id="hero-title"
            className="text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-[1.08]"
          >
            Design &amp; Ship{" "}
            <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Adaptive
            </span>{" "}
            Web Apps &amp; Agents
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl font-normal">
            Accessibility is not a cosmetic toolbar or an afterthought. Tederash gives web applications and autonomous AI agents a shared runtime engine to adapt UI geometry, contrast, speech, and cognitive assistance in real time.
          </p>

          {/* Interactive Preset Switcher Pills inside the Hero */}
          <div className="flex flex-col gap-2 w-full max-w-lg">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Switch active profile to preview instant adaptation:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_PROFILES.slice(0, 5).map((p) => {
                const isActive = profile.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProfile(p);
                      announce({
                        message: `Activated ${p.name} profile.`,
                        priority: "polite",
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                        : "bg-card/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
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
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold shadow-lg flex items-center justify-center gap-2"
            >
              <span>Explore Interactive Demo</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </AccessibleButton>

            <AccessibleButton
              asChild
              variant="outline"
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Link href="/docs">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>Documentation</span>
              </Link>
            </AccessibleButton>
          </div>

          {/* Quick Install Snippet */}
          <div className="w-full max-w-lg rounded-xl border border-border bg-card/80 p-2.5 shadow-sm backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 pl-2 overflow-x-auto font-mono text-xs text-foreground">
              <Terminal className="w-4 h-4 text-teal-500 shrink-0" aria-hidden="true" />
              <span className="select-all">{installCommand}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyCommand}
              aria-label="Copy installation command"
              className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {copiedCommand ? (
                <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> WCAG 2.2 AA
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> 282 Automated Tests
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1">
              <Keyboard className="w-3.5 h-3.5 text-amber-500" /> Keyboard &amp; Voice Native
            </span>
          </div>
        </div>

        {/* =====================================================================
            RIGHT COLUMN: Layered 3D Isometric / Angled Mockups (DesignCode Style)
            ===================================================================== */}
        <div className="lg:col-span-6 relative w-full flex items-center justify-center py-6 lg:py-10">
          <div
            className="relative w-full max-w-[560px] select-none transition-transform duration-700 ease-out"
            style={{
              perspective: "1200px",
            }}
          >
            {/* =================================================================
                LAYER 1 (BACK / BASE): The Studio Dashboard Window
                ================================================================= */}
            <div
              className="relative w-full rounded-2xl border border-white/15 dark:border-white/10 bg-slate-900/95 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden transition-all duration-500"
              style={{
                transform: "rotateY(-10deg) rotateX(6deg) rotateZ(-1deg)",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Window Title Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-950/70">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-[11px] font-mono text-slate-400 pl-2">
                    tederash-studio.tsx
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>RUNTIME LIVE</span>
                  </span>
                </div>
              </div>

              {/* Window Interior Grid */}
              <div className="grid grid-cols-12 min-h-[360px] text-xs">
                {/* Mini Sidebar */}
                <div className="col-span-4 border-r border-white/10 bg-slate-950/40 p-3 flex flex-col justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 px-2">
                      Explorer
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("components")}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors font-medium ${
                        activeTab === "components"
                          ? "bg-teal-500/20 text-teal-300 font-semibold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-400" />
                      <span>Components</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("agents")}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors font-medium ${
                        activeTab === "agents"
                          ? "bg-indigo-500/20 text-indigo-300 font-semibold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5 text-indigo-400" />
                      <span>AI Agent Layer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("runtime")}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors font-medium ${
                        activeTab === "runtime"
                          ? "bg-amber-500/20 text-amber-300 font-semibold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5 text-amber-400" />
                      <span>Profile State</span>
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-[10px] text-slate-400">Target Size:</p>
                    <p className="text-xs font-mono font-bold text-teal-400">
                      {adaptations.targetSize} (48px)
                    </p>
                  </div>
                </div>

                {/* Main Code / Interactive Preview Canvas */}
                <div className="col-span-8 p-4 flex flex-col justify-between bg-slate-900/60">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Active Component Canvas
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Profile: {profile.name}
                      </span>
                    </div>

                    {/* Interactive Adaptive Input Demo Inside the Window */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                        <span>Accessible Email Input</span>
                        {adaptations.showInstructions && (
                          <span className="text-[9px] text-teal-400">Guided Hint Active</span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value="developer@tederash.dev"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/20 text-slate-200 font-mono text-xs focus:outline-none ring-2 ring-teal-500/50"
                        />
                      </div>
                      {adaptations.showInstructions && (
                        <p className="text-[10px] text-slate-400">
                          Field receives high contrast ring and simplified assistance instructions.
                        </p>
                      )}
                    </div>

                    {/* Component Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg bg-teal-500 text-slate-950 font-bold text-xs shadow-md hover:bg-teal-400 transition-colors"
                      >
                        Submit with Profile
                      </button>
                      <button
                        type="button"
                        onClick={handleSpeechDemo}
                        className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 transition-colors flex items-center gap-1.5 border border-white/10"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>{isSpeaking ? "Speaking..." : "Read Aloud"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Window Bottom Status Bar */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>wcag22aa: PASS</span>
                    <span>fontScale: {adaptations.fontScale}x</span>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================
                LAYER 2 (FLOATING TOP-LEFT): Agent Status Pill
                ================================================================= */}
            <div
              className="absolute -top-6 -left-6 sm:-left-8 z-20 rounded-xl border border-white/20 bg-gradient-to-br from-indigo-600/90 via-purple-600/90 to-slate-900/90 p-3 text-white shadow-2xl backdrop-blur-xl transition-transform duration-500 hover:scale-105"
              style={{
                transform: "translateZ(40px) rotateY(-10deg) rotateX(6deg)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/20">
                  <Bot className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold">Assistance Agent</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-[10px] text-slate-200">
                    Auto-simplifies complex forms &amp; errors
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================================
                LAYER 3 (FLOATING FRONT-CENTER): Multimodal Speech & Voice Card
                ================================================================= */}
            <div
              className="absolute -bottom-8 -left-4 sm:-left-6 z-30 w-72 sm:w-80 rounded-2xl border border-white/25 bg-gradient-to-br from-blue-600/95 via-indigo-700/95 to-slate-950/95 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-transform duration-500 hover:scale-105"
              style={{
                transform: "translateZ(65px) rotateY(-10deg) rotateX(6deg)",
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-cyan-300 animate-pulse" />
                  <span className="text-xs font-bold tracking-wide">
                    Multimodal Speech Runtime
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/20">
                  ACTIVE
                </span>
              </div>

              {/* Soundwave Simulation Bars */}
              <div className="flex items-center gap-1 my-3 h-6 px-1">
                {[40, 75, 100, 60, 90, 45, 80, 95, 50, 70, 85, 40].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-cyan-300/80 transition-all duration-300"
                    style={{
                      height: `${height}%`,
                      animation: `pulse 1.2s infinite ease-in-out ${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>

              {/* Dictation Simulation / Value */}
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/10 text-[11px] leading-snug font-sans text-slate-200">
                <span className="text-cyan-300 font-semibold">Voice Dictation: </span>
                &ldquo;Adaptive accessibility enables every user and AI agent to collaborate effortlessly.&rdquo;
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[10px] text-cyan-200/80">
                <span>Web Speech API Detection: OK</span>
                <span>Language: en-US / am-ET</span>
              </div>
            </div>

            {/* =================================================================
                LAYER 4 (FLOATING FRONT-RIGHT): WCAG & Ge'ez Readiness Badge
                ================================================================= */}
            <div
              className="absolute -bottom-6 -right-4 sm:-right-8 z-30 rounded-xl border border-teal-400/30 bg-slate-950/95 text-slate-100 p-3.5 shadow-2xl backdrop-blur-xl flex flex-col gap-1.5 transition-transform duration-500 hover:scale-105"
              style={{
                transform: "translateZ(50px) rotateY(-10deg) rotateX(6deg)",
              }}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-teal-300">100% WCAG 2.2 AA</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Axe-core zero-violation architecture
              </p>
              <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-slate-300 border-t border-white/10">
                <span className="text-teal-400">አማርኛ</span>
                <span>Ge&apos;ez typography enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
