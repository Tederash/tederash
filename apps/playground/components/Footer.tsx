"use client";

import Link from "next/link";
import React from "react";
import { Sparkles, Github, BookOpen, ExternalLink, Heart, Globe, ShieldCheck } from "lucide-react";
import { useAccessibility } from "@tederash/react";

export function Footer() {
  const { adaptations } = useAccessibility();

  const linkClass = `text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded py-0.5 inline-flex items-center gap-1 ${
    adaptations.underlineLinks ? "underline font-medium" : ""
  }`;

  return (
    <footer
      role="contentinfo"
      aria-label="Site Footer"
      className="mt-20 border-t border-border bg-card/60 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto px-6 py-14">
        {/* Top Tier: Brand description and multi-column navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & Mission */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-lg font-bold tracking-tight w-fit focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
            >
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </span>
              <span className="bg-gradient-to-r from-primary to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent font-extrabold">
                Tederash
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">
                Adaptive Framework
              </span>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              An open-source, runtime-adaptive accessibility framework and component SDK for React and TypeScript.
              Web applications dynamically adapt their touch targets, typography, contrast, assistive announcements,
              and cognitive instructions to individual human preferences.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://github.com/adrianhajdin/saas-template"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Tederash repository on GitHub"
                className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Github className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href="http://localhost:3001/docs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Tederash documentation"
                className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href="https://github.com/sponsors"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sponsor open-source accessibility"
                className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-rose-500 hover:text-rose-600 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Heart className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Column 1: Framework Packages */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Framework SDK
            </h3>
            <ul className="flex flex-col gap-2" role="list">
              <li>
                <a
                  href="http://localhost:3001/docs/runtime"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <span>@tederash/core</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3001/docs/hooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <span>@tederash/react</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3001/docs/components"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <span>@tederash/components</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3001/docs/assistance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <span>@tederash/assistance</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Documentation */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Documentation
            </h3>
            <ul className="flex flex-col gap-2" role="list">
              <li>
                <a
                  href="http://localhost:3001/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <span>Quick Start Guide</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3001/docs/profiles"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <span>Profile Schema</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3001/docs/runtime"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <span>Precedence Resolution</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3001/docs/localization"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <span>Ge&apos;ez / Amharic Support</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3001/docs/adrs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <span>Architecture Decisions (ADRs)</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Standards & Quality */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Standards &amp; Quality
            </h3>
            <ul className="flex flex-col gap-2" role="list">
              <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                <span>WCAG 2.2 AA Target</span>
              </li>
              <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                <span>WAI-ARIA 1.2 Compliant</span>
              </li>
              <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
                <span>100% Offline Capable</span>
              </li>
              <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                <span>282 Automated Tests Passing</span>
              </li>
              <li className="pt-1">
                <Link href="/subscription" className={linkClass}>
                  Developer Pricing &amp; Plans →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-border" />

        {/* Bottom Tier: Copyright, badges, and tech stack */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Tederash Adaptive Accessibility Framework. Open source under the MIT License.
          </p>

          <div className="flex items-center gap-4 text-[11px]">
            <span>React 19</span>
            <span aria-hidden="true">•</span>
            <span>Next.js 15</span>
            <span aria-hidden="true">•</span>
            <span>Tailwind CSS v4</span>
            <span aria-hidden="true">•</span>
            <span>axe-core</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
