import React from "react";
import Link from "next/link";
import { DitheringShader } from "../ui/dithering-shader";
import { CodeBlock } from "./CodeBlock";

const INSTALL_COMMAND = "pnpm add @tederash/core @tederash/react @tederash/components";

export function Hero() {
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
          Let people choose how your app should look and behave.
        </h1>

        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl lg:max-w-3xl">
          Tederash is a React library for accessibility. A user picks a profile, such as larger text,
          bigger buttons or plain-language help, and every component follows it. You write normal React.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/test"
            className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          >
            Try the demo
          </Link>
          <Link
            href="/docs/quick-start"
            className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-medium border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          >
            Read the docs
          </Link>
        </div>

        <div className="mt-10 max-w-xl">
          <CodeBlock code={INSTALL_COMMAND} lang="bash" label="Copy install command" />
        </div>
      </div>
    </section>
  );
}
