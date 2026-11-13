"use client";

import Link from "next/link";
import React from "react";
import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs";
import { AccessibleButton } from "@tederash/components";
import { useAccessibility } from "@tederash/react";

const Navbar = () => {
  const { announce, adaptations } = useAccessibility();
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const linkClass = `transition-colors hover:text-primary ${
    adaptations.underlineLinks ? "underline font-medium" : ""
  }`;

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span>✨</span>
            <span>Tederash <span className="text-primary text-sm font-normal">A11y SDK</span></span>
          </Link>
          <nav className="hidden md:flex gap-5 text-sm" aria-label="Main Navigation">
            <Link href="/" className={linkClass}>
              Adaptive Registration
            </Link>
            <Link href="/recipes" className={linkClass}>
              Recipes Demo
            </Link>
            <Link href="/subscription" className={linkClass}>
              Subscription
            </Link>
          </nav>
        </div>

        <div className="flex gap-4 items-center">
          {hasClerk ? (
            <>
              <SignedOut>
                <SignInButton>
                  <AccessibleButton variant="primary">Sign In</AccessibleButton>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </>
          ) : (
            <AccessibleButton
              variant="outline"
              onClick={() => {
                announce({
                  message: "Demo Mode active. Authentication and database APIs will connect with your Clerk & Supabase keys in .env.local",
                  priority: "polite",
                  category: "info",
                });
              }}
              className="text-xs"
            >
              Demo Mode Active
            </AccessibleButton>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
