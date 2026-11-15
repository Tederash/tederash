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

  const locale = profile.locale ?? "en";
  const isAmharic = locale === "am";
  const isOromo = locale === "om";

  const t = (en: string, am: string, om: string) =>
    isAmharic ? am : isOromo ? om : en;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = t(
        "Full legal name is required.",
        "እባክዎ ሙሉ ስምዎን ያስገቡ።",
        "Maqaa guutuu seeraa galchuun dirqama."
      );
    }

    if (!email.trim() || !email.includes("@")) {
      newErrors.email = t(
        "A valid email address containing an '@' symbol is required.",
        "ትክክለኛ የኢሜይል አድራሻ ማስገባት ያስፈልጋል።",
        "Teessoo imeelii sirrii '@' of keessaa qabu galchuun dirqama."
      );
    }

    if (!phone.trim()) {
      newErrors.phone = t(
        "Contact telephone number is required.",
        "የስልክ ቁጥርዎን ያስገቡ።",
        "Lakkoofsa bilbilaa galchuun dirqama."
      );
    }

    if (!coverNote.trim() || coverNote.length < 20) {
      newErrors.coverNote = t(
        "Please provide at least 20 characters explaining your interest and experience.",
        "እባክዎ ቢያንስ 20 ቁምፊዎችን የያዘ አጭር ማብራሪያ ይጻፉ።",
        "Fedhii fi muuxannoo keessan ibsuuf yoo xiqqaate qubee 20 barreessaa."
      );
    }

    if (!consentAgreed) {
      newErrors.consent = t(
        "You must confirm agreement with the application terms.",
        "ለማመልከት የስምምነት ሳጥኑን ምልክት ማድረግ አለብዎት።",
        "Waliigaltee iyyannoo mirkaneessuuf qabduu mallatteessuu qabdu."
      );
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      announce({
        message: t(
          `Form validation error: ${firstError}`,
          `የማመልከቻ ስህተት: ${firstError}`,
          `Dogoggora foormii: ${firstError}`
        ),
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
      message: t(
        `Job application submitted successfully. Reference ID: ${generatedId}.`,
        `ማመልከቻዎ በተሳካ ሁኔታ ገብቷል። የማመልከቻ ቁጥርዎ ${generatedId} ነው።`,
        `Iyyannoon hojii milkaa'inaan ergameera. Lakkoofsi iyyannoo keessanii: ${generatedId}.`
      ),
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
      message: t(
        "Job application form has been reset.",
        "የማመልከቻ ቅጹ ሙሉ በሙሉ ጸድቷል።",
        "Foormiin iyyannoo hojii guutummaatti qulqullaa'eera."
      ),
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
            {t("Home", "መነሻ", "Jalqaba")}
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">
            {t("Careers", "የሥራ ዕድሎች", "Carraa Hojii")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span>{t("Active Profile:", "ንቁ ፕሮፋይል:", "Proofaayilii Hojjatu:")}</span>
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
                {t(
                  "Featured Role: Open Application",
                  "ክፍት የሥራ ቦታ",
                  "Gahee Hojii Banaa"
                )}
              </span>
            </div>

            <h1
              id="job-title-heading"
              className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight"
            >
              {t(
                "Staff Accessibility & Front-End Systems Engineer",
                "ከፍተኛ የተደራሽነት እና የፊት ለፊት ሶፍትዌር መሃንዲስ",
                "Ogeessa Ol'aanaa Qaqqabamummaa fi Sirna Fuulduraa"
              )}
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground">
              {t(
                "Tederash Engineering Labs | Core Framework & Component SDK Team",
                "የተደራሽነት ቤተ-ሙከራዎች | የኮር ፍሬምወርክ ቡድን",
                "Laabii Injinarummaa Tederaash | Garee Wiirtuu Firiimwoorkii & SDK"
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-medium">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <span>
                {t("Remote / Addis Ababa", "የርቀት / አዲስ አበባ", "Fagoo irraa / Finfinnee")}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-medium">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{t("Full-time", "ሙሉ ጊዜ", "Yeroo guutuu")}</span>
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
            {t(
              "We are building the next generation of adaptive accessibility infrastructure for the open web. Instead of superficial overlay toolbars, our runtime enables React components to adapt their visual contrast, touch target geometry, keyboard focus, and assistive technology queues dynamically from typed user profiles.",
              "በተደራሽ የቴክኖሎጂ ቡድን ውስጥ በመቀላቀል ማንኛውም ተጠቃሚ በራሱ ፍላጎት መሰረት የሚስማሙ ተደራሽ የሆኑ የሶፍትዌር ክፍሎችን የሚያዘጋጅ መሃንዲስ እንፈልጋለን።",
              "Nuti bu'uura qaqqabamummaa madaquu dhaloota haaraa weebii banaadhaaf ijaaraa jirra. Meeshaalee toolbaarii irra keessaa dhiisuun, sirni keenya kutaaleen React walsimannaa mul'ataa, bal'ina qabduu, xiyyeeffannoo kiiboordii fi teeknooloojii gargaarsaa proofaayilii fayyadamaa irraa madaqsuu dandeessisa."
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                {t("What You Will Own", "ዋና ዋና ኃላፊነቶች", "Itti Gaafatamummaa Ijoo")}
              </h2>
              <ul className="flex flex-col gap-2 list-disc list-inside text-foreground/90">
                <li>
                  {t(
                    "Architect adaptive component primitives on top of Radix UI and semantic HTML",
                    "የተደራሽነት ኮር ፍሬምወርክን ማሳደግ እና አዳዲስ ክፍሎችን መገንባት",
                    "Firiimwoorkii qaqqabamummaa guddisuu fi kutaalee haaraa ijaaruu"
                  )}
                </li>
                <li>
                  {t(
                    "Ensure zero-latency adaptation and WCAG 2.2 AA conformance under all profiles",
                    "ከስክሪን አንባቢዎች እና ከአማርኛ ጊዕዝ ፊደላት ጋር የተያያዙ ማስተካከያዎችን መስራት",
                    "Dubbistoota iskiriinii fi sirna barreeffama Afaan Oromoo (Qubee) wajjin madaqsuu"
                  )}
                </li>
                <li>
                  {t(
                    "Expand in-browser axe-core auditing tools and developer inspector integrations",
                    "በአሳሽ ውስጥ የሚሰሩ አውቶሜትድ የተደራሽነት መፈተሻ መሳሪያዎችን ማሻሻል",
                    "Meeshaalee qorannoo qaqqabamummaa braawzara keessatti hojjatan fooyyessuu"
                  )}
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                {t("Core Qualifications", "ተፈላጊ ችሎታዎች", "Ulaagaalee Barbaachisoo")}
              </h2>
              <ul className="flex flex-col gap-2 list-disc list-inside text-foreground/90">
                <li>
                  {t(
                    "Deep expertise with modern React, TypeScript, and WAI-ARIA authoring practices",
                    "በReact፣ TypeScript እና በተደራሽነት ደረጃዎች (WCAG 2.2) ላይ የጠለቀ ልምድ",
                    "React, TypeScript fi sadarkaa qaqqabamummaa (WCAG 2.2) irratti muuxannoo gadi fagoo"
                  )}
                </li>
                <li>
                  {t(
                    "Hands-on experience testing interfaces with NVDA, VoiceOver, or Orca screen readers",
                    "የተለያዩ ስክሪን አንባቢዎችን (NVDA፣ VoiceOver፣ TalkBack) ተጠቅሞ የመፈተሽ ብቃት",
                    "Dubbistoota iskiriinii (NVDA, VoiceOver, TalkBack) fayyadamuun qorachuu danda'uu"
                  )}
                </li>
                <li>
                  {t(
                    "Passion for inclusive design and resilient engineering on low-bandwidth networks",
                    "ለተጠቃሚዎች ምቹ የሆኑ ግልጽ ኮዶችን የመጻፍ ፍላጎት",
                    "Dizaayinii hunda hirmaachiseef fedhii fi koodii qulqulluu barreessuu"
                  )}
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted border border-border flex items-start gap-3 mt-2">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs">
              <span className="font-bold text-foreground block">
                {t(
                  "Equal Opportunity & Accessibility Accommodation Guarantee",
                  "ለሁሉም እኩል ዕድል እና ሙሉ የተደራሽነት ድጋፍ",
                  "Carraa Wal-qixxee fi Wabii Deeggarsa Qaqqabamummaa"
                )}
              </span>
              <span className="text-muted-foreground mt-0.5 block">
                {t(
                  "We actively encourage neurodivergent engineers and candidates who use assistive technologies to apply. We provide custom accommodation in all interview and take-home phases.",
                  "የተለያየ የአካል ጉዳት ወይም ልዩ ድጋፍ የሚያስፈልጋቸውን አመልካቾች በሙሉ ልብ እናበረታታለን። በቃለ-መጠይቁ ሂደት የሚፈልጉትን ድጋፍ በቅጹ ላይ መግለጽ ይችላሉ።",
                  "Injinaroota fi iyyattoota teeknooloojii gargaarsaa fayyadaman garaa guutuun jajjabeessina. Adeemsa gaaffiifi deebii hunda keessatti deeggarsa addaa ni kennina."
                )}
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
                {t(
                  "Application Submitted Successfully!",
                  "ማመልከቻዎ በተሳካ ሁኔታ ደርሶናል!",
                  "Iyyannoon Keessan Milkaa'inaan Ergameera!"
                )}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isAmharic
                  ? `የእርስዎ የማመልከቻ መለያ ቁጥር: ${submissionId}`
                  : isOromo
                  ? `Lakkoofsi eeggumsa iyyannoo keessanii: ${submissionId}`
                  : `Your candidate reference tracking identifier is ${submissionId}.`}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-background/80 border border-border text-xs flex flex-col gap-2">
            <span className="font-bold text-foreground">
              {t("What Happens Next?", "ቀጣይ እርምጃዎች", "Tarkaanfii Itti Aanu Maaltu Ta'a?")}
            </span>
            <p className="text-muted-foreground leading-relaxed">
              {t(
                "Our engineering leads review all submissions directly. You will receive an automated confirmation email and a personal update within 2 business days.",
                "የእኛ የምልመላ ቡድን ማመልከቻዎን በጥንቃቄ ይመረምራል። በ2 የሥራ ቀናት ውስጥ በኢሜይል በኩል ምላሽ እንሰጥዎታለን።",
                "Gareen injinarummaa keenya iyyannoo keessan sirriitti qorata. Guyyoota hojii 2 keessatti imeelii mirkaneessaa isiniif ergina."
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <AccessibleButton
              variant="outline"
              onClick={handleResetForm}
            >
              {t("Submit Another Application", "አዲስ ማመልከቻ አስገባ", "Iyyannoo Haaraa Galchi")}
            </AccessibleButton>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              <span>{t("Back to Homepage", "ወደ መነሻ ገጽ ተመለስ", "Gara Fuula Jalqabaatti Deebi'i")}</span>
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
              {t("Role Application Form", "የሥራ ማመልከቻ ቅጽ", "Foormii Iyyannoo Hojii")}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t(
                "Please complete the required fields below. All inputs adapt to your active accessibility profile.",
                "እባክዎ የሚከተሉትን መረጃዎች በትክክል ይሙሉ እና ማመልከቻዎን ያስገቡ።",
                "Mee odeeffannoowwan barbaachisan armaan gadii guutaa. Galteewwan hundi proofaayilii qaqqabamummaa keessaniin madaqu."
              )}
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
                  {t(
                    "Please correct the following errors before submitting:",
                    "እባክዎ የሚከተሉትን ስህተቶች ያርሙ:",
                    "Mee erguu keessaniin dura dogoggoroota armaan gadii sirreessaa:"
                  )}
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
                {t("1. Candidate Information", "ክፍል 1: የግል መረጃ", "Kutaa 1: Odeeffannoo Dhuunfaa")}
              </legend>

              <AccessibleInput
                label={t("Full Legal Name", "ሙሉ ህጋዊ ስም", "Maqaa Guutuu Seeraa")}
                speechInput
                speechOutput
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                description={t(
                  "Enter your first and family name as shown on legal identification.",
                  "የመጀመሪያ እና የአያት ስምዎን ያስገቡ።",
                  "Akkuma waraqaa eenyummaa irratti jiru maqaa fi maqaa abbaa galchaa."
                )}
                simplifiedDescription={t(
                  "Type your full name here.",
                  "ትክክለኛ ስምዎን እዚህ ይጻፉ።",
                  "Maqaa keessan guutuu asitti barreessaa."
                )}
                error={errors.fullName}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AccessibleInput
                  label={t("Email Address", "የኢሜይል አድራሻ", "Teessoo Imeelii")}
                  speechInput
                  speechOutput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  description={t(
                    "We use this address to schedule calls and deliver feedback.",
                    "የመቀበያ የኢሜይል አድራሻዎን ያስገቡ።",
                    "Qophii bilbilaa fi yaada deebii kennuuf itti fayyadamna."
                  )}
                  simplifiedDescription={t(
                    "Your contact email.",
                    "የኢሜይል አድራሻዎን ያስገቡ።",
                    "Imeelii qunnamtii keessan."
                  )}
                  error={errors.email}
                  required
                />

                <AccessibleInput
                  label={t("Telephone Number", "የስልክ ቁጥር", "Lakkoofsa Bilbilaa")}
                  speechInput
                  speechOutput
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  description={t(
                    "Include international country and area code (e.g. +251 or +1).",
                    "የአገር መለያ ቁጥር ጨምረው ያስገቡ።",
                    "Koodii biyyaa dabalatee galchaa (fkn, +251 yookiin +1)."
                  )}
                  simplifiedDescription={t(
                    "Your phone number.",
                    "የስልክ ቁጥርዎን ያስገቡ።",
                    "Lakkoofsa bilbila keessan."
                  )}
                  error={errors.phone}
                  required
                />
              </div>

              <AccessibleInput
                label={t("GitHub or Portfolio URL", "የGitHub ወይም የፖርትፎሊዮ ሊንክ", "Geessituu GitHub yookiin Poortifooliyoo")}
                speechOutput
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                description={t(
                  "Link to your public code repositories, projects, or technical blog.",
                  "የሠሩዋቸውን ክፍት የኮድ ሥራዎች ወይም ድረ-ገጽዎን ያጋሩን።",
                  "Koodii fi piroojektiiwwan banaa hojjattan asitti nuuf qoodaa."
                )}
                simplifiedDescription={t(
                  "Link to your code or website.",
                  "የስራዎትን ሊንክ እዚህ ይለጥፉ።",
                  "Geessituu koodii ykn weebsaayitii keessan as kaa'aa."
                )}
              />
            </fieldset>

            {/* Step 2: Experience & Preferences */}
            <fieldset className="flex flex-col gap-5 border border-border p-5 rounded-lg bg-background/50">
              <legend className="text-xs font-bold uppercase tracking-wider text-foreground px-2">
                {t("2. Experience & Role Fit", "ክፍል 2: የሥራ ልምድ እና ምርጫዎች", "Kutaa 2: Muuxannoo Hojii fi Filannoowwan")}
              </legend>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AccessibleSelect
                  label={t("Engineering Seniority", "የሥራ ልምድ ደረጃ", "Sadarkaa Muuxannoo Hojii")}
                  value={experienceLevel}
                  onChange={(val) => setExperienceLevel(val)}
                  description={t(
                    "Select your matching experience bracket.",
                    "ያለዎትን የልምድ ደረጃ ይምረጡ።",
                    "Sadarkaa muuxannoo keessanii filadhaa."
                  )}
                  options={[
                    {
                      value: "mid",
                      label: t("Mid-Level Engineer (3-5 years)", "መካከለኛ ደረጃ (3-5 ዓመት)", "Sadarkaa Giddu-galeessaa (Waggaa 3-5)"),
                    },
                    {
                      value: "senior",
                      label: t("Senior Systems Engineer (5+ years)", "ከፍተኛ ደረጃ (5+ ዓመት)", "Injinarummaa Ol'aanaa (Waggaa 5+)"),
                    },
                    {
                      value: "staff",
                      label: t("Staff / Principal Engineer (8+ years)", "ስፔሻሊስት / መሪ (8+ ዓመት)", "Injinarummaa Dura Bu'aa / Ogeessa (Waggaa 8+)"),
                    },
                  ]}
                />

                <AccessibleSelect
                  label={t("Work Location Preference", "የሥራ ቦታ ምርጫ", "Filannoo Bakka Hojii")}
                  value={locationPref}
                  onChange={(val) => setLocationPref(val)}
                  description={t(
                    "Choose your preferred working arrangement.",
                    "የት ሆነው መሥራት እንደሚመርጡ ይምረጡ።",
                    "Haala hojii barbaaddan filadhaa."
                  )}
                  options={[
                    {
                      value: "remote",
                      label: t("100% Remote (Global)", "ሙሉ የርቀት ሥራ (Remote)", "100% Fagoo irraa (Addunyaa)"),
                    },
                    {
                      value: "addis",
                      label: t("Addis Ababa Engineering Hub", "አዲስ አበባ ቢሮ (Addis Ababa)", "Finfinnee Wiirtuu Injinarummaa"),
                    },
                    {
                      value: "hybrid",
                      label: t("Hybrid (Remote + Hub)", "ድብልቅ (Hybrid)", "Makaa (Fagoo + Wiirtuu)"),
                    },
                  ]}
                />
              </div>

              <AccessibleTextarea
                label={t(
                  "Statement of Interest & Accessibility Experience",
                  "ስለራስዎ እና ስለ ተደራሽነት ፍላጎትዎ አጭር መግለጫ",
                  "Ibsa Fedhii fi Muuxannoo Qaqqabamummaa"
                )}
                speechInput
                speechOutput
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                maxLength={500}
                showCharacterCount={true}
                description={t(
                  "Tell us about a technical accessibility challenge you solved or why adaptive UI matters to you (minimum 20 characters).",
                  "በተደራሽነት እና በሶፍትዌር ሥራዎ ላይ ያጋጠሙዎትን ተሞክሮዎች ያካፍሉን (ቢያንስ 20 ፊደላት)።",
                  "Qormaata qaqqabamummaa teeknikaa furatan ykn UI madaquun maaliif akka isinitti tolu nuuf himaa (yoo xiqqaate qubee 20)."
                )}
                simplifiedDescription={t(
                  "Tell us why you want to work on accessibility.",
                  "ስለ እርስዎ እና ስለሚወዱት ስራ በጥቂት ቃላት ይንገሩን።",
                  "Maaliif qaqqabamummaa irratti hojjachuu akka barbaaddan nuuf himaa."
                )}
                error={errors.coverNote}
                required
              />
            </fieldset>

            {/* Step 3: Accommodations */}
            <fieldset className="flex flex-col gap-5 border border-border p-5 rounded-lg bg-background/50">
              <legend className="text-xs font-bold uppercase tracking-wider text-foreground px-2">
                {t("3. Interview Accommodations", "ክፍል 3: የቃለ-መጠይቅ ድጋፍ", "Kutaa 3: Deeggarsa Gaaffiifi Deebii")}
              </legend>

              <AccessibleSelect
                label={t(
                  "Accessibility & Interview Accommodations",
                  "የቃለ-መጠይቅ ተደራሽነት ድጋፍ",
                  "Deeggarsa Qaqqabamummaa Gaaffiifi Deebii"
                )}
                value={accommodationPref}
                onChange={(val) => setAccommodationPref(val)}
                description={t(
                  "Let us know in advance how we can make the interview process seamless for you.",
                  "በቃለ መጠይቁ ወቅት የሚፈልጉትን ልዩ ድጋፍ እዚህ ይምረጡ።",
                  "Adeemsa gaaffiifi deebii akka isiniif mijatu duraan dursitanii nu beeksisaa."
                )}
                simplifiedDescription={t(
                  "Choose any accommodation you need.",
                  "ልዩ ድጋፍ የሚያስፈልግዎት ከሆነ ይምረጡ።",
                  "Deeggarsa barbaaddan kamiyyuu filadhaa."
                )}
                options={[
                  {
                    value: "none",
                    label: t(
                      "No specific accommodations required",
                      "ምንም ልዩ ድጋፍ አያስፈልገኝም",
                      "Deeggarsi addaa na hin barbaachisu"
                    ),
                  },
                  {
                    value: "screen-reader",
                    label: t(
                      "Screen Reader user (accessible materials only)",
                      "የስክሪን አንባቢ ተጠቃሚ (Screen Reader / Text-Only Takehome)",
                      "Fayyadamaa dubbisaa iskiriinii (Qaqqabamaa qofa)"
                    ),
                  },
                  {
                    value: "captions",
                    label: t(
                      "Live Video Captions or Written Interview Flow",
                      "የጽሑፍ ንዑስ ርዕሶች (Live Captions / ASL / Written interview)",
                      "Mata-duree viidiyoo yeroo qabatamaa yookiin barreeffama"
                    ),
                  },
                  {
                    value: "extra-time",
                    label: t(
                      "Extended time for technical review exercises",
                      "ተጨማሪ የፈተና ጊዜ (Extended time for technical exercises)",
                      "Yeroo dabalataa shaakala teeknikaatiif"
                    ),
                  },
                  {
                    value: "other",
                    label: t(
                      "Other (our team will contact you directly)",
                      "ሌላ (የሰው ኃይል ቡድናችን በግል ያነጋግርዎታል)",
                      "Kan biraa (gareen keenya kallattiin isin qunnama)"
                    ),
                  },
                ]}
              />
            </fieldset>

            {/* Step 4: Terms and Submission */}
            <div className="flex flex-col gap-4">
              <AccessibleCheckbox
                id="job-application-consent"
                label={t(
                  "I confirm all submitted information is accurate and agree to candidate processing terms",
                  "ያስገባሁት መረጃ በሙሉ ትክክለኛ መሆኑን እና የምልመላ ቡድኑ እንዲያየው እስማማለሁ",
                  "Odeeffannoon koo hundi sirrii ta'uu mirkaneessa, ulaagaalee adeemsa iyyannoottis nan waliigala"
                )}
                description={t(
                  "Required to evaluate your candidacy in accordance with privacy laws.",
                  "ማመልከቻውን ለማስገባት በዚህ ሳጥን ላይ መስማማት ግዴታ ነው።",
                  "Iyyannoo keessan seera eegumsa odeeffannootiin madaaluuf barbaachisaadha."
                )}
                simplifiedDescription={t(
                  "Check here to confirm.",
                  "ለማስገባት እዚህ ምልክት ያድርጉ።",
                  "Mirkaneessuuf asitti mallatteessaa."
                )}
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
                <span>{t("Submit Application", "ማመልከቻውን አስገባ", "Iyyannoo Galchi")}</span>
              </AccessibleButton>

              <AccessibleButton
                variant="destructive"
                type="button"
                confirmDestructivePrompt={t(
                  "Are you sure you want to discard your input and reset the entire job application?",
                  "የሞሉትን መረጃ በሙሉ አጽድተው ቅጹን እንደገና መጀመር ይፈልጋሉ?",
                  "Odeeffannoo guuttan hunda haqanii foormicha haaromsuu akka barbaaddan mirkanaa'aadhaa?"
                )}
                onClick={handleResetForm}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{t("Reset Form", "ቅጹን አጽዳ", "Foormii Qulqulleessi")}</span>
              </AccessibleButton>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
