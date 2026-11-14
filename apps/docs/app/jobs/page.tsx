"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AccessibleButton,
  AccessibleInput,
  AccessibleTextarea,
  AccessibleSelect,
  AccessibleCheckbox,
} from "@tederash/components";
import { useAccessibility } from "@tederash/react";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Send,
  RotateCcw,
} from "lucide-react";
import { ApplicationAssistChooser } from "../../components/jobs/ApplicationAssistChooser";

export default function JobApplicationPage() {
  const { profile, announce } = useAccessibility();

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("senior");
  const [locationPref, setLocationPref] = useState("remote");
  const [coverNote, setCoverNote] = useState("");
  const [accommodationPref, setAccommodationPref] = useState("none");
  const [consentAgreed, setConsentAgreed] = useState(false);

  // Validation & Submission State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState("");

  const isAmharic = profile.locale === "am";

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = isAmharic
        ? "እባክዎ ሙሉ ስምዎን ያስገቡ።"
        : "Full legal name is required.";
    }

    if (!email.trim() || !email.includes("@")) {
      newErrors.email = isAmharic
        ? "ትክክለኛ የኢሜይል አድራሻ ማስገባት ያስፈልጋል።"
        : "A valid email address containing an '@' symbol is required.";
    }

    if (!phone.trim()) {
      newErrors.phone = isAmharic
        ? "የስልክ ቁጥርዎን ያስገቡ።"
        : "Contact telephone number is required.";
    }

    if (!coverNote.trim() || coverNote.length < 20) {
      newErrors.coverNote = isAmharic
        ? "እባክዎ ቢያንስ 20 ቁምፊዎችን የያዘ አጭር ማብራሪያ ይጻፉ።"
        : "Please provide at least 20 characters explaining your interest and experience.";
    }

    if (!consentAgreed) {
      newErrors.consent = isAmharic
        ? "ለማመልከት የስምምነት ሳጥኑን ምልክት ማድረግ አለብዎት።"
        : "You must confirm agreement with the application terms.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      announce({
        message: isAmharic
          ? `የማመልከቻ ስህተት: ${firstError}`
          : `Form validation error: ${firstError}`,
        priority: "assertive",
        category: "error",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const generatedId = "TED-" + Math.floor(100000 + Math.random() * 900000);
    setSubmissionId(generatedId);
    setIsSubmitted(true);

    announce({
      message: isAmharic
        ? `ማመልከቻዎ በተሳካ ሁኔታ ገብቷል። የማመልከቻ ቁጥርዎ ${generatedId} ነው።`
        : `Job application submitted successfully. Reference ID: ${generatedId}.`,
      priority: "polite",
      category: "success",
    });
  };

  const handleResetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setGithubUrl("");
    setExperienceLevel("senior");
    setLocationPref("remote");
    setCoverNote("");
    setAccommodationPref("none");
    setConsentAgreed(false);
    setErrors({});
    setIsSubmitted(false);

    announce({
      message: isAmharic
        ? "የማመልከቻ ቅጹ ሙሉ በሙሉ ጸድቷል።"
        : "Job application form has been reset.",
      priority: "polite",
      category: "info",
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-10">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Careers</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span>Active Profile:</span>
          <span className="font-semibold text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
            {profile.name}
          </span>
        </div>
      </div>

      {/* One question that adapts the application; other settings live in the ♿ panel */}
      <ApplicationAssistChooser />

      {/* The Single Job Listing Header & Details Card */}
      <section
        aria-labelledby="job-title-heading"
        className="p-6 sm:p-8 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-6"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300 text-xs font-semibold w-fit border border-teal-500/20">
              <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {isAmharic ? "ክፍት የሥራ ቦታ" : "Featured Role: Open Application"}
              </span>
            </div>

            <h1
              id="job-title-heading"
              className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight"
            >
              {isAmharic
                ? "ከፍተኛ የተደራሽነት እና የፊት ለፊት ሶፍትዌር መሃንዲስ"
                : "Staff Accessibility & Front-End Systems Engineer"}
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground">
              {isAmharic
                ? "የተደራሽነት ቤተ-ሙከራዎች | የኮር ፍሬምወርክ ቡድን"
                : "Tederash Engineering Labs | Core Framework & Component SDK Team"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-medium">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{isAmharic ? "የርቀት / አዲስ አበባ" : "Remote / Addis Ababa"}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-medium">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{isAmharic ? "ሙሉ ጊዜ" : "Full-time"}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-medium">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <span>$125,000 - $165,000 USD + Equity</span>
            </div>
          </div>
        </div>

        {/* Job Description Text */}
        <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex flex-col gap-4 border-t border-border pt-6">
          <p>
            {isAmharic
              ? "በተደራሽ የቴክኖሎጂ ቡድን ውስጥ በመቀላቀል ማንኛውም ተጠቃሚ በራሱ ፍላጎት መሰረት የሚስማሙ ተደራሽ የሆኑ የሶፍትዌር ክፍሎችን የሚያዘጋጅ መሃንዲስ እንፈልጋለን።"
              : "We are building the next generation of adaptive accessibility infrastructure for the open web. Instead of superficial overlay toolbars, our runtime enables React components to adapt their visual contrast, touch target geometry, keyboard focus, and assistive technology queues dynamically from typed user profiles."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                {isAmharic ? "ዋና ዋና ኃላፊነቶች" : "What You Will Own"}
              </h2>
              <ul className="flex flex-col gap-2 list-disc list-inside text-foreground/90">
                <li>
                  {isAmharic
                    ? "የተደራሽነት ኮር ፍሬምወርክን ማሳደግ እና አዳዲስ ክፍሎችን መገንባት"
                    : "Architect adaptive component primitives on top of Radix UI and semantic HTML"}
                </li>
                <li>
                  {isAmharic
                    ? "ከስክሪን አንባቢዎች እና ከአማርኛ ጊዕዝ ፊደላት ጋር የተያያዙ ማስተካከያዎችን መስራት"
                    : "Ensure zero-latency adaptation and WCAG 2.2 AA conformance under all profiles"}
                </li>
                <li>
                  {isAmharic
                    ? "በአሳሽ ውስጥ የሚሰሩ አውቶሜትድ የተደራሽነት መፈተሻ መሳሪያዎችን ማሻሻል"
                    : "Expand in-browser axe-core auditing tools and developer inspector integrations"}
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                {isAmharic ? "ተፈላጊ ችሎታዎች" : "Core Qualifications"}
              </h2>
              <ul className="flex flex-col gap-2 list-disc list-inside text-foreground/90">
                <li>
                  {isAmharic
                    ? "በReact፣ TypeScript እና በተደራሽነት ደረጃዎች (WCAG 2.2) ላይ የጠለቀ ልምድ"
                    : "Deep expertise with modern React, TypeScript, and WAI-ARIA authoring practices"}
                </li>
                <li>
                  {isAmharic
                    ? "የተለያዩ ስክሪን አንባቢዎችን (NVDA፣ VoiceOver፣ TalkBack) ተጠቅሞ የመፈተሽ ብቃት"
                    : "Hands-on experience testing interfaces with NVDA, VoiceOver, or Orca screen readers"}
                </li>
                <li>
                  {isAmharic
                    ? "ለተጠቃሚዎች ምቹ የሆኑ ግልጽ ኮዶችን የመጻፍ ፍላጎት"
                    : "Passion for inclusive design and resilient engineering on low-bandwidth networks"}
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted border border-border flex items-start gap-3 mt-2">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs">
              <span className="font-bold text-foreground block">
                {isAmharic ? "ለሁሉም እኩል ዕድል እና ሙሉ የተደራሽነት ድጋፍ" : "Equal Opportunity & Accessibility Accommodation Guarantee"}
              </span>
              <span className="text-muted-foreground mt-0.5 block">
                {isAmharic
                  ? "የተለያየ የአካል ጉዳት ወይም ልዩ ድጋፍ የሚያስፈልጋቸውን አመልካቾች በሙሉ ልብ እናበረታታለን። በቃለ-መጠይቁ ሂደት የሚፈልጉትን ድጋፍ በቅጹ ላይ መግለጽ ይችላሉ።"
                  : "We actively encourage neurodivergent engineers and candidates who use assistive technologies to apply. We provide custom accommodation in all interview and take-home phases."}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Success Receipt State or Form Section */}
      {isSubmitted ? (
        <section
          role="status"
          aria-labelledby="success-heading"
          className="p-8 rounded-xl border border-teal-500/40 bg-teal-500/10 text-foreground flex flex-col gap-6"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="success-heading" className="text-xl sm:text-2xl font-bold text-teal-800 dark:text-teal-300">
                {isAmharic ? "ማመልከቻዎ በተሳካ ሁኔታ ደርሶናል!" : "Application Submitted Successfully!"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isAmharic
                  ? `የእርስዎ የማመልከቻ መለያ ቁጥር: ${submissionId}`
                  : `Your candidate reference tracking identifier is ${submissionId}.`}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-background/80 border border-border text-xs flex flex-col gap-2">
            <span className="font-bold text-foreground">
              {isAmharic ? "ቀጣይ እርምጃዎች" : "What Happens Next?"}
            </span>
            <p className="text-muted-foreground leading-relaxed">
              {isAmharic
                ? "የእኛ የምልመላ ቡድን ማመልከቻዎን በጥንቃቄ ይመረምራል። በ2 የሥራ ቀናት ውስጥ በኢሜይል በኩል ምላሽ እንሰጥዎታለን።"
                : "Our engineering leads review all submissions directly. You will receive an automated confirmation email and a personal update within 2 business days."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <AccessibleButton
              variant="outline"
              onClick={handleResetForm}
            >
              {isAmharic ? "አዲስ ማመልከቻ አስገባ" : "Submit Another Application"}
            </AccessibleButton>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              <span>Back to Homepage</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        /* The Actual Job Application Form */
        <section
          id="application-form"
          aria-labelledby="form-heading"
          className="p-6 sm:p-8 rounded-xl border border-border bg-card shadow-sm flex flex-col gap-8 scroll-mt-12"
        >
          <div className="flex flex-col gap-1 pb-4 border-b border-border">
            <h2
              id="form-heading"
              className="text-xl sm:text-2xl font-bold text-foreground tracking-tight"
            >
              {isAmharic ? "የሥራ ማመልከቻ ቅጽ" : "Role Application Form"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isAmharic
                ? "እባክዎ የሚከተሉትን መረጃዎች በትክክል ይሙሉ እና ማመልከቻዎን ያስገቡ።"
                : "Please complete the required fields below. All inputs adapt to your active accessibility profile."}
            </p>
          </div>

          {/* Form Error Summary */}
          {Object.keys(errors).length > 0 && (
            <div
              role="alert"
              className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-foreground flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-bold text-destructive">
                  {isAmharic ? "እባክዎ የሚከተሉትን ስህተቶች ያርሙ:" : "Please correct the following errors before submitting:"}
                </span>
                <ul className="list-disc list-inside text-muted-foreground flex flex-col gap-0.5">
                  {Object.values(errors).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {/* Step 1: Candidate Identification */}
            <fieldset className="flex flex-col gap-5 border border-border p-5 rounded-lg bg-background/50">
              <legend className="text-xs font-bold uppercase tracking-wider text-foreground px-2">
                {isAmharic ? "ክፍል 1: የግል መረጃ" : "1. Candidate Information"}
              </legend>

              <AccessibleInput
                label={isAmharic ? "ሙሉ ህጋዊ ስም" : "Full Legal Name"}
                speechInput
                speechOutput
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                description={
                  isAmharic
                    ? "የመጀመሪያ እና የአያት ስምዎን ያስገቡ።"
                    : "Enter your first and family name as shown on legal identification."
                }
                simplifiedDescription={
                  isAmharic ? "ትክክለኛ ስምዎን እዚህ ይጻፉ።" : "Type your full name here."
                }
                error={errors.fullName}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AccessibleInput
                  label={isAmharic ? "የኢሜይል አድራሻ" : "Email Address"}
                  speechInput
                  speechOutput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  description={
                    isAmharic
                      ? "የመቀበያ የኢሜይል አድራሻዎን ያስገቡ።"
                      : "We use this address to schedule calls and deliver feedback."
                  }
                  simplifiedDescription={
                    isAmharic ? "የኢሜይል አድራሻዎን ያስገቡ።" : "Your contact email."
                  }
                  error={errors.email}
                  required
                />

                <AccessibleInput
                  label={isAmharic ? "የስልክ ቁጥር" : "Telephone Number"}
                  speechInput
                  speechOutput
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  description={
                    isAmharic
                      ? "የአገር መለያ ቁጥር ጨምረው ያስገቡ።"
                      : "Include international country and area code (e.g. +251 or +1)."
                  }
                  simplifiedDescription={
                    isAmharic ? "የስልክ ቁጥርዎን ያስገቡ።" : "Your phone number."
                  }
                  error={errors.phone}
                  required
                />
              </div>

              <AccessibleInput
                label={isAmharic ? "የGitHub ወይም የፖርትፎሊዮ ሊንክ" : "GitHub or Portfolio URL"}
                speechOutput
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                description={
                  isAmharic
                    ? "የሠሩዋቸውን ክፍት የኮድ ሥራዎች ወይም ድረ-ገጽዎን ያጋሩን።"
                    : "Link to your public code repositories, projects, or technical blog."
                }
                simplifiedDescription={
                  isAmharic ? "የስራዎትን ሊንክ እዚህ ይለጥፉ።" : "Link to your code or website."
                }
              />
            </fieldset>

            {/* Step 2: Experience & Preferences */}
            <fieldset className="flex flex-col gap-5 border border-border p-5 rounded-lg bg-background/50">
              <legend className="text-xs font-bold uppercase tracking-wider text-foreground px-2">
                {isAmharic ? "ክፍል 2: የሥራ ልምድ እና ምርጫዎች" : "2. Experience & Role Fit"}
              </legend>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AccessibleSelect
                  label={isAmharic ? "የሥራ ልምድ ደረጃ" : "Engineering Seniority"}
                  value={experienceLevel}
                  onChange={(val) => setExperienceLevel(val)}
                  description={
                    isAmharic ? "ያለዎትን የልምድ ደረጃ ይምረጡ።" : "Select your matching experience bracket."
                  }
                  options={[
                    { value: "mid", label: isAmharic ? "መካከለኛ ደረጃ (3-5 ዓመት)" : "Mid-Level Engineer (3-5 years)" },
                    { value: "senior", label: isAmharic ? "ከፍተኛ ደረጃ (5+ ዓመት)" : "Senior Systems Engineer (5+ years)" },
                    { value: "staff", label: isAmharic ? "ስፔሻሊስት / መሪ (8+ ዓመት)" : "Staff / Principal Engineer (8+ years)" },
                  ]}
                />

                <AccessibleSelect
                  label={isAmharic ? "የሥራ ቦታ ምርጫ" : "Work Location Preference"}
                  value={locationPref}
                  onChange={(val) => setLocationPref(val)}
                  description={
                    isAmharic ? "የት ሆነው መሥራት እንደሚመርጡ ይምረጡ።" : "Choose your preferred working arrangement."
                  }
                  options={[
                    { value: "remote", label: isAmharic ? "ሙሉ የርቀት ሥራ (Remote)" : "100% Remote (Global)" },
                    { value: "addis", label: isAmharic ? "አዲስ አበባ ቢሮ (Addis Ababa)" : "Addis Ababa Engineering Hub" },
                    { value: "hybrid", label: isAmharic ? "ድብልቅ (Hybrid)" : "Hybrid (Remote + Hub)" },
                  ]}
                />
              </div>

              <AccessibleTextarea
                label={isAmharic ? "ስለራስዎ እና ስለ ተደራሽነት ፍላጎትዎ አጭር መግለጫ" : "Statement of Interest & Accessibility Experience"}
                speechInput
                speechOutput
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                maxLength={500}
                showCharacterCount={true}
                description={
                  isAmharic
                    ? "በተደራሽነት እና በሶፍትዌር ሥራዎ ላይ ያጋጠሙዎትን ተሞክሮዎች ያካፍሉን (ቢያንስ 20 ፊደላት)።"
                    : "Tell us about a technical accessibility challenge you solved or why adaptive UI matters to you (minimum 20 characters)."
                }
                simplifiedDescription={
                  isAmharic
                    ? "ስለ እርስዎ እና ስለሚወዱት ስራ በጥቂት ቃላት ይንገሩን።"
                    : "Tell us why you want to work on accessibility."
                }
                error={errors.coverNote}
                required
              />
            </fieldset>

            {/* Step 3: Accommodations */}
            <fieldset className="flex flex-col gap-5 border border-border p-5 rounded-lg bg-background/50">
              <legend className="text-xs font-bold uppercase tracking-wider text-foreground px-2">
                {isAmharic ? "ክፍል 3: የቃለ-መጠይቅ ድጋፍ" : "3. Interview Accommodations"}
              </legend>

              <AccessibleSelect
                label={isAmharic ? "የቃለ-መጠይቅ ተደራሽነት ድጋፍ" : "Accessibility & Interview Accommodations"}
                value={accommodationPref}
                onChange={(val) => setAccommodationPref(val)}
                description={
                  isAmharic
                    ? "በቃለ መጠይቁ ወቅት የሚፈልጉትን ልዩ ድጋፍ እዚህ ይምረጡ።"
                    : "Let us know in advance how we can make the interview process seamless for you."
                }
                simplifiedDescription={
                  isAmharic ? "ልዩ ድጋፍ የሚያስፈልግዎት ከሆነ ይምረጡ።" : "Choose any accommodation you need."
                }
                options={[
                  { value: "none", label: isAmharic ? "ምንም ልዩ ድጋፍ አያስፈልገኝም" : "No specific accommodations required" },
                  { value: "screen-reader", label: isAmharic ? "የስክሪን አንባቢ ተጠቃሚ (Screen Reader / Text-Only Takehome)" : "Screen Reader user (accessible materials only)" },
                  { value: "captions", label: isAmharic ? "የጽሑፍ ንዑስ ርዕሶች (Live Captions / ASL / Written interview)" : "Live Video Captions or Written Interview Flow" },
                  { value: "extra-time", label: isAmharic ? "ተጨማሪ የፈተና ጊዜ (Extended time for technical exercises)" : "Extended time for technical review exercises" },
                  { value: "other", label: isAmharic ? "ሌላ (የሰው ኃይል ቡድናችን በግል ያነጋግርዎታል)" : "Other (our team will contact you directly)" },
                ]}
              />
            </fieldset>

            {/* Step 4: Terms and Submission */}
            <div className="flex flex-col gap-4">
              <AccessibleCheckbox
                id="job-application-consent"
                label={
                  isAmharic
                    ? "ያስገባሁት መረጃ በሙሉ ትክክለኛ መሆኑን እና የምልመላ ቡድኑ እንዲያየው እስማማለሁ"
                    : "I confirm all submitted information is accurate and agree to candidate processing terms"
                }
                description={
                  isAmharic
                    ? "ማመልከቻውን ለማስገባት በዚህ ሳጥን ላይ መስማማት ግዴታ ነው።"
                    : "Required to evaluate your candidacy in accordance with privacy laws."
                }
                simplifiedDescription={
                  isAmharic ? "ለማስገባት እዚህ ምልክት ያድርጉ።" : "Check here to confirm."
                }
                checked={consentAgreed}
                onCheckedChange={setConsentAgreed}
              />
              {errors.consent && (
                <span className="text-xs text-destructive font-medium pl-6">
                  {errors.consent}
                </span>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
              <AccessibleButton
                variant="primary"
                type="submit"
                className="gap-2"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{isAmharic ? "ማመልከቻውን አስገባ" : "Submit Application"}</span>
              </AccessibleButton>

              <AccessibleButton
                variant="destructive"
                type="button"
                confirmDestructivePrompt={
                  isAmharic
                    ? "የሞሉትን መረጃ በሙሉ አጽድተው ቅጹን እንደገና መጀመር ይፈልጋሉ?"
                    : "Are you sure you want to discard your input and reset the entire job application?"
                }
                onClick={handleResetForm}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{isAmharic ? "ቅጹን አጽዳ" : "Reset Form"}</span>
              </AccessibleButton>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
