"use client";

import React from "react";
import Link from "next/link";
import { useLandingTranslation } from "./translations";

const PACKAGE_NAMES = [
  "@tederash/core",
  "@tederash/react",
  "@tederash/components",
  "@tederash/assistance",
];

export function Packages() {
  const { t } = useLandingTranslation();

  return (
    <section aria-labelledby="packages-heading" className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-14 md:py-20 grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-8 md:gap-12">
        <div>
          <h2 id="packages-heading" className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {t.packages.heading}
          </h2>
          <ul className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground leading-relaxed">
            {t.packages.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>

        <dl className="divide-y divide-border">
          {PACKAGE_NAMES.map((name) => (
            <div key={name} className="py-4 first:pt-0 last:pb-0">
              <dt className="font-mono text-sm text-foreground">{name}</dt>
              <dd className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {t.packages.descriptions[name] ?? ""}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-14 md:pb-20">
        <p className="text-sm text-muted-foreground">
          {t.packages.openSource}{" "}
          <a
            href="https://github.com/tederash/tederash-ui-library"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 text-foreground hover:text-primary"
          >
            {t.packages.sourceOnGithub}
          </a>
          {" · "}
          <Link href="/docs" className="underline underline-offset-4 text-foreground hover:text-primary">
            {t.packages.docsLink}
          </Link>
          {" · "}
          <Link href="/test" className="underline underline-offset-4 text-foreground hover:text-primary">
            {t.packages.demoLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
