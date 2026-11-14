"use client";

import React, { useState } from "react";
import {
  AccessibleButton,
  AccessibleInput,
  AccessibleSelect,
  AccessibleCheckbox,
  AccessibleTextarea,
  AccessibleDialog,
} from "@tederash/components";
import { useAccessibility } from "@tederash/react";

export default function TestRegistrationPage() {
  const { announce } = useAccessibility();

  // Form fields state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("developer");
  const [bio, setBio] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const roleOptions = [
    { value: "developer", label: "Software Engineer" },
    { value: "designer", label: "Product Designer" },
    { value: "accessibility", label: "Accessibility Specialist" },
    { value: "manager", label: "Product Manager" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required to create an account.";
    }

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!email.includes("@")) {
      newErrors.email = "Please enter a valid email address with an @ symbol.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long.";
    }

    if (!acceptTerms) {
      newErrors.terms = "You must accept the terms of service to proceed.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      announce({
        message: `Registration form has ${Object.keys(newErrors).length} errors. Please review the highlighted fields.`,
        priority: "assertive",
      });
      return;
    }

    setErrors({});
    setShowSuccessDialog(true);
    announce({
      message: "Account registration submitted successfully!",
      priority: "polite",
    });
  };

  const handleReset = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("developer");
    setBio("");
    setAcceptTerms(false);
    setErrors({});
    announce({
      message: "Form has been reset to defaults.",
      priority: "polite",
    });
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Create an Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Temporary test route using Tederash library components.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <AccessibleInput
          id="test-full-name"
          label="Full Name"
          description="Enter your full legal name as it appears on documents."
          simplifiedDescription="Your first and last name."
          placeholder="Jane Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          error={errors.fullName}
        />

        <AccessibleInput
          id="test-email"
          type="email"
          label="Email Address"
          description="We will send your verification code to this address."
          simplifiedDescription="Where we can email you."
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          error={errors.email}
        />

        <AccessibleInput
          id="test-password"
          type="password"
          label="Password"
          description="Must contain at least 8 characters."
          simplifiedDescription="A secret password with 8 or more letters."
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          error={errors.password}
        />

        <AccessibleSelect
          id="test-role"
          label="Account Role"
          description="Select the primary role you will use this platform for."
          value={role}
          onChange={setRole}
          options={roleOptions}
        />

        <AccessibleTextarea
          id="test-bio"
          label="Bio / Notes"
          description="Share any details about your accessibility preferences or goals."
          placeholder="Optional notes or background..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        <AccessibleCheckbox
          id="test-terms"
          label="I agree to the Terms of Service and Privacy Policy"
          checked={acceptTerms}
          onCheckedChange={setAcceptTerms}
          required
          error={errors.terms}
        />

        <div className="flex items-center gap-3 pt-2">
          <AccessibleButton type="submit" variant="primary">
            Register Account
          </AccessibleButton>
          <AccessibleButton
            type="button"
            variant="outline"
            onClick={handleReset}
          >
            Reset
          </AccessibleButton>
        </div>
      </form>

      <AccessibleDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        title="Registration Submitted"
        description="Your account details have been captured by the Tederash test form."
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm">
            Welcome, <strong>{fullName}</strong>! Your registration is complete.
          </p>
          <div className="flex justify-end">
            <AccessibleButton
              variant="primary"
              onClick={() => setShowSuccessDialog(false)}
            >
              Close
            </AccessibleButton>
          </div>
        </div>
      </AccessibleDialog>
    </div>
  );
}
