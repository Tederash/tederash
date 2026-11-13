"use client";

import React from "react";
import { SignIn } from "@clerk/nextjs";
import { AccessibleButton, AccessibleInput, AccessibleForm } from "@tederash/components";
import { useAccessibility } from "@tederash/react";

function DemoSignInForm() {
  const { announce } = useAccessibility();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password.");
    } else {
      setError("");
      announce({
        message: `Signed in as ${email} (Demo Mode).`,
        priority: "polite",
        category: "success",
      });
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl border bg-card shadow-sm">
      <h1 className="text-2xl font-bold mb-2">Sign In</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Access your adaptive accessibility dashboard.
      </p>

      <AccessibleForm errors={error ? [error] : []} onSubmit={handleSubmit}>
        <AccessibleInput
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AccessibleInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AccessibleButton type="submit" variant="primary" className="mt-2">
          Sign In
        </AccessibleButton>
      </AccessibleForm>
    </div>
  );
}

const SignInPage = () => {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <main className="flex justify-center items-center py-16 px-6">
      {hasClerk ? <SignIn /> : <DemoSignInForm />}
    </main>
  );
};

export default SignInPage;
