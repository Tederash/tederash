"use client";

import React from "react";
import Link from "next/link";
import { Download, Bot } from "lucide-react";
import { DitheringShader } from "../ui/dithering-shader";
import { useLandingTranslation } from "./translations";

export function HeroContent({ codeBlock }: { codeBlock: React.ReactNode }) {
  const { t } = useLandingTranslation();

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b border-border">
      {/* Decorative dithered wave background (theme-matched, aria-hidden). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <DitheringShader className="h-full w-full" />
        {/* Fade the pattern so headline text stays legible. */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/30 to-background" />
      </div>

      <div className="relative z-10 max-w-3xl lg:max-w-5xl mx-auto px-6 pt-16 pb-14 md:pt-24 md:pb-20">
        <h1
          id="hero-heading"
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] lg:max-w-4xl"
        >
          {t.hero.headline}
        </h1>

        <p className="mt-6 text-lg text-foreground/80 leading-relaxed max-w-2xl lg:max-w-3xl">
          {t.hero.description}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/test"
            className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          >
            {t.hero.tryDemo}
          </Link>
          <Link
            href="/docs/quick-start"
            className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-medium border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          >
            {t.hero.readDocs}
          </Link>
        </div>

        {/* AI Coding Agent Skill & Prompt Downloads */}
        <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-border/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-primary" aria-hidden="true" />
            {t.hero.aiAgentsTitle}
          </span>
          <a
            href="/skills/tederash-skill.md"
            download="SKILL.md"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card/60 hover:bg-muted text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Download the Tederash Agent Skill (SKILL.md) for Antigravity, Claude Code, and Codex"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            {t.hero.downloadSkill}
          </a>
          <a
            href="/skills/tederash-prompt.md"
            download="tederash-prompt.md"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card/60 hover:bg-muted text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Download the Tederash Agent Prompt markdown file for system instructions"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            {t.hero.downloadPrompt}
          </a>
        </div>

        <div className="mt-10 max-w-xl">
          {codeBlock}
        </div>
      </div>
    </section>
  );
}
