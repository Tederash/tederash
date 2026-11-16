"use client";

import React from "react";
import Link from "next/link";
import { useLandingTranslation } from "./translations";

export function GettingStartedContent({
  stepCodeBlocks,
}: {
  stepCodeBlocks: React.ReactNode[];
}) {
  const { t } = useLandingTranslation();

  return (
    <section aria-labelledby="start-heading" className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
        <h2 id="start-heading" className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {t.gettingStarted.heading}
        </h2>

        <ol className="mt-8 flex flex-col gap-10">
          {t.gettingStarted.steps.map((step, i) => (
            <li key={i} className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-4 md:gap-12">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  <span className="text-muted-foreground font-mono mr-2">{i + 1}.</span>
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.text}</p>
              </div>
              {stepCodeBlocks[i]}
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm text-muted-foreground">
          {t.gettingStarted.notePrefix}
          <Link href="/docs/quick-start" className="underline underline-offset-4 text-foreground hover:text-primary">
            {t.gettingStarted.noteLink}
          </Link>
          {t.gettingStarted.noteSuffix}
        </p>
      </div>
    </section>
  );
}
