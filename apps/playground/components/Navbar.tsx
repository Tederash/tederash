"use client";

import Link from "next/link";
import React from "react";
import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/nextjs";
import { AccessibleButton } from "@tederash/components";
import { useAccessibility } from "@tederash/react";
import { Github, Sparkles, BookOpen } from "lucide-react";

const Navbar = () => {
  const { announce, adaptations } = useAccessibility();
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const linkClass = `transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded px-2 py-1 ${
    adaptations.underlineLinks ? "underline font-medium" : "font-medium"
  }`;

  return (
    <>
      {/* Skip to Main Content Link for Keyboard and Screen Reader Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-xl focus:outline-none focus:ring-4 focus:ring-amber-400 font-semibold text-sm"
      >
        Skip to main content
      </a>

      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
        <div className="flex justify-between items-center px-6 py-3.5 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded"
            >
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="font-extrabold bg-gradient-to-r from-primary to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">
                  Tederash
                </span>
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">
                  Adaptive SDK
                </span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Main Navigation">
              <Link href="#demo" className={linkClass}>
                Live Demo
              </Link>
              <Link href="#features" className={linkClass}>
                Architecture
              </Link>
              <Link href="#comparison" className={linkClass}>
                Why Adaptive?
              </Link>
              <Link href="/subscription" className={linkClass}>
                Pricing
              </Link>
              <a
                href="http://localhost:3001/docs"
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClass} inline-flex items-center gap-1.5`}
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Docs</span>
              </a>
            </nav>
          </div>

          <div className="flex gap-3 items-center">
            <a
              href="https://github.com/adrianhajdin/saas-template"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Tederash framework source on GitHub"
              className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Github className="w-4 h-4" aria-hidden="true" />
            </a>

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
                    message: "Demo Mode Active. All accessibility adaptations and components run locally with zero network dependencies.",
                    priority: "polite",
                    category: "info",
                  });
                }}
                className="text-xs hidden sm:inline-flex"
              >
                Demo Mode
              </AccessibleButton>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
