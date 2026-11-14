"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Github, Briefcase } from "lucide-react";

export function CtaSection() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="py-16 md:py-24 bg-card border-b border-border"
    >
      <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        <h2
          id="cta-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground"
        >
          Build applications that adapt to human needs.
        </h2>

        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Start integrating the Tederash runtime and adaptive components today. Free and open source for the community.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold border border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-300 hover:bg-teal-500/20 transition-colors focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <Briefcase className="w-4 h-4" aria-hidden="true" />
            <span>Job Application Demo</span>
          </Link>

          <Link
            href="/docs/quick-start"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <span>Read Quick Start Guide</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>

          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold border border-border bg-background text-foreground hover:bg-muted transition-colors focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <BookOpen className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <span>API Reference</span>
          </Link>

          <a
            href="https://github.com/tederash/tederash-ui-library"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold border border-border bg-background text-foreground hover:bg-muted transition-colors focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <Github className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <span>GitHub Repository</span>
          </a>
        </div>
      </div>
    </section>
  );
}
