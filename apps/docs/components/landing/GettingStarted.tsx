import React from "react";
import Link from "next/link";
import { CodeBlock } from "./CodeBlock";

const STEPS = [
  {
    title: "Wrap your app once",
    text: "The provider holds the active profile and saves it in the browser.",
    code: `import { AccessibilityProvider } from "@tederash/react";

export default function App({ children }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}`,
  },
  {
    title: "Use the components",
    text: "They take the usual props. Size, contrast and help text come from the profile.",
    code: `import { TederashInput, TederashButton } from "@tederash/components";

<TederashInput
  label="Email"
  type="email"
  description="We only use this to reach you about your application."
  simplifiedDescription="Type your email address."
  required
/>
<TederashButton type="submit">Send</TederashButton>`,
  },
  {
    title: "Let the user pick a profile",
    text: "Switch at any time. Every component updates without a reload.",
    code: `import { useTederash, PRESET_PROFILES } from "@tederash/react";

const { setProfile } = useTederash();
setProfile(PRESET_PROFILES.find((p) => p.id === "low-vision"));`,
  },
];

export function GettingStarted() {
  return (
    <section aria-labelledby="start-heading" className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
        <h2 id="start-heading" className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Three steps
        </h2>

        <ol className="mt-8 flex flex-col gap-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-4 md:gap-12">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  <span className="text-muted-foreground font-mono mr-2">{i + 1}.</span>
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.text}</p>
              </div>
              <CodeBlock code={step.code} lang="tsx" label={`Copy code for step ${i + 1}`} />
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm text-muted-foreground">
          Full setup, including custom profiles and per-component overrides, is in the{" "}
          <Link href="/docs/quick-start" className="underline underline-offset-4 text-foreground hover:text-primary">
            quick start
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
