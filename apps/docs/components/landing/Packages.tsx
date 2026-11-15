import React from "react";
import Link from "next/link";

const PACKAGES = [
  {
    name: "@tederash/core",
    text: "The profile model, the runtime that holds and saves it, and the rules that turn a profile into CSS variables. No React.",
  },
  {
    name: "@tederash/react",
    text: "The provider and hooks. Also the bridge that lets the Tederash browser extension talk to your page.",
  },
  {
    name: "@tederash/components",
    text: "Button, input, textarea, select, checkbox, form, dialog and navigation. Built on Radix and shadcn/ui.",
  },
  {
    name: "@tederash/assistance",
    text: "Plain-language explanations for fields and errors. Works offline, and an AI provider can be plugged in.",
  },
];

const FACTS = [
  "Works offline. Preferences stay in the browser.",
  "English, Amharic, and Afaan Oromoo out of the box, with Ge'ez-aware typography.",
  "Speech input and read-aloud where the browser supports it.",
  "Confirmation before destructive actions when the profile asks for it.",
];

export function Packages() {
  return (
    <section aria-labelledby="packages-heading" className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-14 md:py-20 grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-8 md:gap-12">
        <div>
          <h2 id="packages-heading" className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            What you get
          </h2>
          <ul className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground leading-relaxed">
            {FACTS.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>

        <dl className="divide-y divide-border">
          {PACKAGES.map((pkg) => (
            <div key={pkg.name} className="py-4 first:pt-0 last:pb-0">
              <dt className="font-mono text-sm text-foreground">{pkg.name}</dt>
              <dd className="mt-1 text-sm text-muted-foreground leading-relaxed">{pkg.text}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-14 md:pb-20">
        <p className="text-sm text-muted-foreground">
          Open source.{" "}
          <a
            href="https://github.com/tederash/tederash-ui-library"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 text-foreground hover:text-primary"
          >
            Source on GitHub
          </a>
          {" · "}
          <Link href="/docs" className="underline underline-offset-4 text-foreground hover:text-primary">
            Documentation
          </Link>
          {" · "}
          <Link href="/jobs" className="underline underline-offset-4 text-foreground hover:text-primary">
            Job application demo
          </Link>
        </p>
      </div>
    </section>
  );
}
