"use client";

import Link from "next/link";
import React from "react";
import Image from "next/image";
import { Sparkles, Github, BookOpen, Heart, Globe, ShieldCheck } from "lucide-react";
import { useAccessibility } from "@tederash/react";
import brandIcon from "../app/icon.png";

export function Footer() {
  const { adaptations } = useAccessibility();

  const linkClass = `text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded py-0.5 inline-flex items-center gap-1 ${
    adaptations.underlineLinks ? "underline font-medium" : ""
  }`;

  return (
    <footer
      role="contentinfo"
      aria-label="Site Footer"
      className="w-full mt-20 border-t border-border bg-card/60 backdrop-blur-sm"
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
              <Image
                src={brandIcon}
                alt="Tederash"
                width={26}
                height={26}
                className="w-6 h-6 rounded-md object-contain shrink-0"
              />
              <span className="tederash-brand">Tederash</span>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              An open-source, runtime-adaptive accessibility framework and component SDK for React and TypeScript.
              Web applications dynamically adapt their touch targets, typography, contrast, assistive announcements,
              and cognitive instructions to individual human preferences.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://github.com/tederash/tederash-ui-library"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Tederash repository on GitHub"
                className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Github className="w-4 h-4" aria-hidden="true" />
              </a>
              <Link
                href="/docs"
                aria-label="Tederash documentation"
                className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Column 1: Framework Packages */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Framework SDK
            </h3>
            <ul className="flex flex-col gap-2" role="list">
              <li>
                <Link href="/docs/runtime" className={linkClass}>
                  @tederash/core
                </Link>
              </li>
              <li>
                <Link href="/docs/hooks" className={linkClass}>
                  @tederash/react
                </Link>
              </li>
              <li>
                <Link href="/docs/components" className={linkClass}>
                  @tederash/components
                </Link>
              </li>
              <li>
                <Link href="/docs/components" className={linkClass}>
                  @tederash/assistance
                </Link>
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
                <Link href="/docs/quick-start" className={linkClass}>
                  Quick Start Guide
                </Link>
              </li>
              <li>
                <Link href="/docs/profiles" className={linkClass}>
                  Profile Schema
                </Link>
              </li>
              <li>
                <Link href="/docs/runtime" className={linkClass}>
                  Precedence Resolution
                </Link>
              </li>
              <li>
                <Link href="/docs/decisions/0001-framework-independent-core-runtime" className={linkClass}>
                  ADRs &amp; Decisions
                </Link>
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
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-border" />

        {/* Built with Tederash — the docs demo the product */}
        <p className="mb-6 text-center text-xs text-muted-foreground">
          This documentation is built with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">@tederash/components</code>{" "}
          and adapts to your accessibility profile in real time — open the{" "}
          <span aria-hidden="true">♿</span>
          <span className="sr-only">accessibility</span> control panel to try it.
        </p>

        {/* Bottom Tier: Copyright, badges, and tech stack */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Tederash. Open source under the MIT License.
          </p>

          <div className="flex items-center gap-4 text-[11px]">
            <span>React 19</span>
            <span aria-hidden="true">•</span>
            <span>Next.js 15</span>
            <span aria-hidden="true">•</span>
            <span>Nextra</span>
            <span aria-hidden="true">•</span>
            <span>axe-core</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
