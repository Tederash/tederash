"use client";

import React from "react";
import { PricingTable } from "@clerk/nextjs";
import { AccessibleButton } from "@tederash/components";
import { useAccessibility } from "@tederash/react";

const SubscriptionPage = () => {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const { announce, adaptations } = useAccessibility();

  if (hasClerk) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <PricingTable />
      </main>
    );
  }

  const tiers = [
    {
      name: "Community",
      price: "$0",
      period: "forever free",
      description: "Essential accessibility features for personal projects and open source.",
      features: [
        "Core Accessibility Runtime",
        "Preset profiles (Low Vision, Motor, Cognitive)",
        "Standard live region announcements",
        "Community support",
      ],
      buttonVariant: "outline" as const,
      buttonText: "Current Plan",
    },
    {
      name: "Pro Developer",
      price: "$29",
      period: "/ month",
      description: "Advanced adaptive UI library components and live developer tooling.",
      features: [
        "Everything in Community",
        "Full Adaptive Component SDK",
        "Real-time axe-core automated audits",
        "Cloud preference persistence & sync",
        "Priority developer support",
      ],
      buttonVariant: "primary" as const,
      buttonText: "Upgrade to Pro",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/ month",
      description: "Custom compliance SLAs, Ethiopian & localized Ge'ez assistance, dedicated support.",
      features: [
        "Everything in Pro",
        "Amharic & multi-lingual speech assistance",
        "Custom organization profile schemas",
        "WCAG 2.2 AA audit certificates",
        "Dedicated accessibility engineer",
      ],
      buttonVariant: "outline" as const,
      buttonText: "Contact Sales",
    },
  ];

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 flex flex-col gap-8">
      <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Adaptive Subscription Plans</h1>
        <p className="text-sm text-muted-foreground">
          Choose the right accessibility tier for your team. Every component on this page responds to your active accessibility profile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${
              tier.highlighted
                ? "border-primary bg-card shadow-lg ring-2 ring-primary"
                : "border-border bg-card shadow-sm"
            } ${adaptations.highContrast ? "border-2 border-foreground" : ""}`}
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold">{tier.name}</h2>
                {tier.highlighted && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">{tier.description}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-extrabold">{tier.price}</span>
                <span className="text-xs text-muted-foreground">{tier.period}</span>
              </div>

              <ul className="space-y-2 text-xs mb-6" aria-label={`${tier.name} features`}>
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold" aria-hidden="true">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <AccessibleButton
              variant={tier.buttonVariant}
              onClick={() => {
                announce({
                  message: `Selected ${tier.name} subscription plan.`,
                  priority: "polite",
                  category: "info",
                });
              }}
              className="w-full text-xs"
            >
              {tier.buttonText}
            </AccessibleButton>
          </div>
        ))}
      </div>
    </main>
  );
};

export default SubscriptionPage;
