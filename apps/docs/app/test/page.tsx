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
import {
  CheckCircle2,
  RotateCcw,
  Send,
  ArrowRight,
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  ShieldCheck,
} from "lucide-react";

type DemoTab = "signup" | "details" | "apply";

export default function TestPage() {
  const { profile, announce } = useAccessibility();
  const [activeTab, setActiveTab] = useState<DemoTab>("signup");

  const isAmharic = profile.locale === "am";
  const isOromo = profile.locale === "om";

  const t = (en: string, am: string, om: string = en) =>
    isAmharic ? am : isOromo ? om : en;

  // ==========================================
  // Tab 1: Account Registration State
  // ==========================================
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountRole, setAccountRole] = useState("developer");
  const [accountBio, setAccountBio] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const [showAccountSuccess, setShowAccountSuccess] = useState(false);

  const accountRoleOptions = [
    { value: "developer", label: t("Software Engineer", "ሶፍትዌር መሃንዲስ", "Injinara Saamudaa") },
    { value: "designer", label: t("Product Designer", "የምርት ዲዛይነር", "Dizaayinara Oomishaa") },
    { value: "accessibility", label: t("Accessibility Specialist", "የተደራሽነት ባለሙያ", "Ogeessa Qaqqabamummaa") },
    { value: "manager", label: t("Product Manager", "የምርት ስራ አስኪያጅ", "Gareessa Oomishaa") },
  ];

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!accountName.trim()) {
      newErrors.name = t("Full name is required.", "እባክዎ ሙሉ ስምዎን ያስገቡ።", "Maqaa guutuu galchuun dirqama.");
    }
    if (!accountEmail.trim() || !accountEmail.includes("@")) {
      newErrors.email = t("Valid email address is required.", "ትክክለኛ የኢሜይል አድራሻ ያስገቡ።", "Teessoo imeelii sirrii galchaa.");
    }
    if (!accountPassword || accountPassword.length < 8) {
      newErrors.password = t("Password must be at least 8 characters.", "የይለፍ ቃል ቢያንስ 8 ፊደላት ሊኖረው ይገባል።", "Jechi icciitii yoo xiqqaate qubee 8 ta'uu qaba.");
    }
    if (!acceptTerms) {
      newErrors.terms = t("You must accept the terms of service.", "የአገልግሎት ውሉን መቀበል አለብዎት።", "Waliigaltee tajaajilaa fudhachuu qabdu.");
    }

    if (Object.keys(newErrors).length > 0) {
      setAccountErrors(newErrors);
      announce({
        message: t(
          `Registration has ${Object.keys(newErrors).length} errors. Please review the highlighted fields.`,
          `በምዝገባው ውስጥ ${Object.keys(newErrors).length} ስህተቶች አሉ። እባክዎ ያርሙ።`,
          `Dogoggoroonni ${Object.keys(newErrors).length} jiru. Mee sirreessaa.`
        ),
        priority: "assertive",
        category: "error",
      });
      return;
    }

    setAccountErrors({});
    setShowAccountSuccess(true);
    announce({
      message: t("Account registration submitted successfully!", "መለያዎ በተሳካ ሁኔታ ተመዝግቧል!", "Galmeen herregaa milkaa'eera!"),
      priority: "polite",
      category: "success",
    });
  };

  const handleAccountReset = () => {
    setAccountName("");
    setAccountEmail("");
    setAccountPassword("");
    setAccountRole("developer");
    setAccountBio("");
    setAcceptTerms(false);
    setAccountErrors({});
    announce({
      message: t("Account form has been reset.", "የምዝገባ ቅጹ ጸድቷል።", "Foormiin galmee qulqullaa'eera."),
      priority: "polite",
      category: "info",
    });
  };

  // ==========================================
  // Tab 3: Job Application Form State
  // ==========================================
  const [jobPosition, setJobPosition] = useState("Staff Accessibility & Front-End Systems Engineer");
  const [jobFullName, setJobFullName] = useState("");
  const [jobEmail, setJobEmail] = useState("");
  const [jobPhone, setJobPhone] = useState("");
  const [jobPortfolio, setJobPortfolio] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("senior");
  const [locationPref, setLocationPref] = useState("remote");
  const [accommodationPref, setAccommodationPref] = useState("none");
  const [coverNote, setCoverNote] = useState("");
  const [jobConsent, setJobConsent] = useState(false);
  const [jobErrors, setJobErrors] = useState<Record<string, string>>({});
  const [showJobSuccess, setShowJobSuccess] = useState(false);
  const [jobReferenceId, setJobReferenceId] = useState("");

  const experienceOptions = [
    { value: "entry", label: t("Junior / Entry-Level (0-2 years)", "ጀማሪ (0-2 ዓመት)", "Sadarkaa Jalqabaa (0-2)") },
    { value: "mid", label: t("Mid-Level Engineer (3-5 years)", "መካከለኛ መሃንዲስ (3-5 ዓመት)", "Giddu-galeessa (3-5)") },
    { value: "senior", label: t("Senior / Staff Engineer (5+ years)", "ከፍተኛ መሃንዲስ (5+ ዓመት)", "Ol'aanaa (5+)") },
    { value: "lead", label: t("Principal / Architectural Lead", "ዋና አርክቴክት / መሪ", "Hoggansa Teeknikaa") },
  ];

  const locationOptions = [
    { value: "remote", label: t("Remote", "የርቀት ሥራ", "Fagoo irraa") },
    { value: "addis", label: t("Addis Ababa (Hybrid)", "አዲስ አበባ (ድብልቅ)", "Finfinnee (Makaa)") },
    { value: "onsite", label: t("On-site", "በቢሮ ውስጥ", "Waajjira keessa") },
  ];

  const accommodationOptions = [
    { value: "none", label: t("No special accommodation needed", "ምንም ልዩ ድጋፍ አያስፈልገኝም", "Deeggarsi addaa hin barbaachisu") },
    { value: "screen-reader", label: t("Screen reader & semantic markup accommodation", "የስክሪን አንባቢ እና የድምጽ ድጋፍ", "Dubbisaa iskiriinii fi deeggarsa sagalee") },
    { value: "sign-interpreter", label: t("Sign language interpretation (EthSL / ASL)", "የምልክት ቋንቋ አስተርጓሚ", "Hiikaa afaan mallattoo") },
    { value: "extended-time", label: t("Extended time for technical evaluations", "ተጨማሪ ጊዜ ለቴክኒካል ምዘናዎች", "Qormaataaf yeroo dabalataa") },
    { value: "captions", label: t("Live captioning during interviews", "በቃለ-መጠይቅ ወቅት የቀጥታ ጽሑፍ", "Barreeffama kallattii") },
  ];

  const handleJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!jobFullName.trim()) {
      newErrors.fullName = t("Full legal name is required.", "እባክዎ ሙሉ ስምዎን ያስገቡ።", "Maqaa guutuu galchuun dirqama.");
    }
    if (!jobEmail.trim() || !jobEmail.includes("@")) {
      newErrors.email = t("Valid contact email is required.", "ትክክለኛ የኢሜይል አድራሻ ያስገቡ።", "Imeelii sirrii galchaa.");
    }
    if (!jobPhone.trim()) {
      newErrors.phone = t("Contact phone number is required.", "የስልክ ቁጥርዎን ያስገቡ።", "Lakkoofsa bilbilaa galchaa.");
    }
    if (!coverNote.trim() || coverNote.length < 15) {
      newErrors.coverNote = t(
        "Please provide a brief background or note (at least 15 characters).",
        "እባክዎ አጭር ማብራሪያ ይጻፉ (ቢያንስ 15 ፊደላት)።",
        "Ibsa gabaabaa barreessaa (yoo xiqqaate qubee 15)."
      );
    }
    if (!jobConsent) {
      newErrors.consent = t("You must confirm this application.", "ማመልከቻውን ማረጋገጥ አለብዎት።", "Waliigaltee mirkaneessuu qabdu.");
    }

    if (Object.keys(newErrors).length > 0) {
      setJobErrors(newErrors);
      announce({
        message: t(
          `Job application has ${Object.keys(newErrors).length} errors.`,
          `በማመልከቻው ውስጥ ${Object.keys(newErrors).length} ስህተቶች አሉ።`,
          `Dogoggoroonni ${Object.keys(newErrors).length} jiru.`
        ),
        priority: "assertive",
        category: "error",
      });
      return;
    }

    const refId = "TED-" + Math.floor(100000 + Math.random() * 900000);
    setJobReferenceId(refId);
    setJobErrors({});
    setShowJobSuccess(true);
    announce({
      message: t(
        `Job application submitted successfully! Reference ID: ${refId}.`,
        `ማመልከቻዎ በተሳካ ሁኔታ ገብቷል! መለያ ቁጥርዎ: ${refId}።`,
        `Iyyannoon milkaa'inaan ergameera! Lakkoofsi: ${refId}.`
      ),
      priority: "polite",
      category: "success",
    });
  };

  const handleJobReset = () => {
    setJobFullName("");
    setJobEmail("");
    setJobPhone("");
    setJobPortfolio("");
    setExperienceLevel("senior");
    setLocationPref("remote");
    setAccommodationPref("none");
    setCoverNote("");
    setJobConsent(false);
    setJobErrors({});
    announce({
      message: t("Job application form has been reset.", "የሥራ ማመልከቻ ቅጹ ጸድቷል።", "Foormiin hojii qulqullaa'eera."),
      priority: "polite",
      category: "info",
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      {/* Page Header */}
      <header className="mb-8 pb-6 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("Interactive Component Demo", "የክፍሎች ማሳያ ገጽ", "Agarsiisa Kutaalee")}
        </h1>
        <p className="text-base sm:text-lg text-foreground/80 mt-3 leading-relaxed">
          {t(
            "Open the Tederash Assistant extension from your Chrome side panel (or DevTools) and ask it to explain the job details, answer questions, or interact with and fill the forms.",
            "የተደራሽነት አጋዥ ኤክስቴንሽንን (Tederash Assistant) ከChrome side panel ወይም DevTools በመክፈት የሥራውን ዝርዝር እንዲያብራራ፣ ጥያቄዎችን እንዲመልስ ወይም ቅጾቹን እንዲሞላ ይጠይቁት።",
            "Gargaaraa Tederaash (Tederash Assistant) banuun waa'ee hojichaa akka isinii ibsu, gaaffii keessan akka deebisu ykn foormii akka guutu gaafadhaa."
          )}
        </p>
      </header>

      {/* Full-Width 3-Tab Bar */}
      <div
        role="tablist"
        aria-label="Demo sections"
        className="grid grid-cols-3 w-full border-b border-border mb-8 text-center"
      >
        <button
          type="button"
          role="tab"
          id="tab-signup"
          aria-selected={activeTab === "signup"}
          aria-controls="panel-signup"
          onClick={() => setActiveTab("signup")}
          className={`py-3.5 text-sm sm:text-base font-semibold transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === "signup"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          {t("Sign Up", "መለያ መፍጠሪያ", "Galmee")}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-details"
          aria-selected={activeTab === "details"}
          aria-controls="panel-details"
          onClick={() => setActiveTab("details")}
          className={`py-3.5 text-sm sm:text-base font-semibold transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === "details"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          {t("See Details", "የስራ ዝርዝር መረጃ", "Bal'ina Hojii")}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-apply"
          aria-selected={activeTab === "apply"}
          aria-controls="panel-apply"
          onClick={() => setActiveTab("apply")}
          className={`py-3.5 text-sm sm:text-base font-semibold transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === "apply"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          {t("Apply", "ማመልከቻ", "Iyyannoo")}
        </button>
      </div>

      {/* ========================================================= */}
      {/* Tab Panel 1: Sign Up Form                                */}
      {/* ========================================================= */}
      {activeTab === "signup" && (
        <section
          role="tabpanel"
          id="panel-signup"
          aria-labelledby="tab-signup"
          className="space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {t("Create an Account", "መለያ ይፍጠሩ", "Herrega Uumaa")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                "User registration with input labels, helper descriptions, and validation states.",
                "መሰረታዊ የተጠቃሚ ምዝገባ መረጃ።",
                "Odeeffannoo galmee fayyadamaa."
              )}
            </p>
          </div>

          <form onSubmit={handleAccountSubmit} noValidate className="space-y-5">
            <AccessibleInput
              id="test-full-name"
              label={t("Full Name", "ሙሉ ስም", "Maqaa Guutuu")}
              description={t("Enter your legal name as it appears on documents.", "በመታወቂያ ላይ ያለዎትን ስም ያስገቡ።", "Maqaa heeraa galchaa.")}
              simplifiedDescription={t("Your first and last name.", "የመጀመሪያ እና የአባት ስምዎ።", "Maqaa keessanii fi kan abbaa keessanii.")}
              placeholder="Jane Doe"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              error={accountErrors.name}
            />

            <AccessibleInput
              id="test-email"
              type="email"
              label={t("Email Address", "የኢሜይል አድራሻ", "Teessoo Imeelii")}
              description={t("We will send your verification code to this address.", "የማረጋገጫ ኮድ የምንልክበት ኢሜይል አድራሻ።", "Bakka koodiin itti ergamu.")}
              simplifiedDescription={t("Where we can email you.", "ኢሜይል የሚደርስዎት አድራሻ።", "Bakka imeelii keessanii.")}
              placeholder="jane@example.com"
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              required
              error={accountErrors.email}
            />

            <AccessibleInput
              id="test-password"
              type="password"
              label={t("Password", "የይለፍ ቃል", "Jecha Icciitii")}
              description={t("Must contain at least 8 characters.", "ቢያንስ 8 ፊደላት ሊኖሩት ይገባል።", "Yoo xiqqaate qubee 8 qabaachuu qaba.")}
              simplifiedDescription={t("A secret password with 8 or more characters.", "ሚስጥራዊ የይለፍ ቃል ከ8 ፊደላት በላይ።", "Jecha icciitii qubee 8 fi isaa ol.")}
              placeholder="••••••••"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              required
              error={accountErrors.password}
            />

            <AccessibleSelect
              id="test-role"
              label={t("Account Role", "የመለያ አይነት", "Gahee Herregaa")}
              description={t("Select the primary role you will use this platform for.", "የሚፈልጉትን የስራ ዘርፍ ይምረጡ።", "Gahee hojii filadhaa.")}
              value={accountRole}
              onChange={setAccountRole}
              options={accountRoleOptions}
            />

            <AccessibleTextarea
              id="test-bio"
              label={t("Bio / Notes", "ስለ እርስዎ አጭር መግለጫ", "Waa'ee Keessan")}
              description={t("Share any details about your accessibility preferences or goals.", "ስለ ተደራሽነት ፍላጎቶችዎ ወይም ግቦችዎ መግለጽ ይችላሉ።", "Odeeffannoo dabalataa.")}
              placeholder={t("Optional notes or background...", "አማራጭ ማስታወሻ...", "Yaada dabalataa...")}
              value={accountBio}
              onChange={(e) => setAccountBio(e.target.value)}
            />

            <AccessibleCheckbox
              id="test-terms"
              label={t("I agree to the Terms of Service and Privacy Policy", "የአገልግሎት እና የግላዊነት ደንቦችን ተስማምቻለሁ", "Waliigaltee tajaajilaa fi dhuunfaa nan fudhadha")}
              checked={acceptTerms}
              onCheckedChange={setAcceptTerms}
              required
              error={accountErrors.terms}
            />

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <AccessibleButton type="submit" variant="primary">
                <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                <span>{t("Register Account", "መለያ ፍጠር", "Herrega Uumi")}</span>
              </AccessibleButton>
              <AccessibleButton type="button" variant="outline" onClick={handleAccountReset}>
                <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                <span>{t("Reset", "አጽዳ", "Qulqulleessi")}</span>
              </AccessibleButton>
            </div>
          </form>
        </section>
      )}

      {/* Account Success Dialog */}
      <AccessibleDialog
        open={showAccountSuccess}
        onOpenChange={setShowAccountSuccess}
        title={t("Account Registered", "ምዝገባው ተጠናቋል", "Galmeen Milkaa'eera")}
        description={t("Your account details have been captured successfully.", "መለያዎ በተሳካ ሁኔታ ተመዝግቧል።", "Odeeffannoon galmee qabameera.")}
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm">
            {t("Welcome,", "እንኳን ደህና መጡ፣", "Baga nagaan dhuftan,")} <strong>{accountName}</strong>!{" "}
            {t("Your account registration is active.", "መለያዎ ተዘጋጅቷል።", "Herregni keessan qophaa'eera.")}
          </p>
          <div className="flex justify-end">
            <AccessibleButton variant="primary" onClick={() => setShowAccountSuccess(false)}>
              {t("Done", "እሺ", "Tole")}
            </AccessibleButton>
          </div>
        </div>
      </AccessibleDialog>

      {/* ========================================================= */}
      {/* Tab Panel 2: See Details (Job Description for Assistant)  */}
      {/* ========================================================= */}
      {activeTab === "details" && (
        <section
          role="tabpanel"
          id="panel-details"
          aria-labelledby="tab-details"
          className="space-y-6 text-foreground leading-relaxed"
        >
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t(
                "Staff Accessibility & Front-End Systems Engineer",
                "ከፍተኛ የተደራሽነት እና የፊት ለፊት ሶፍትዌር መሃንዲስ",
                "Ogeessa Ol'aanaa Qaqqabamummaa fi Sirna Fuulduraa"
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "Engineering Labs | Core Framework & Accessible Component Team",
                "የተደራሽነት ቤተ-ሙከራዎች | የኮር ፍሬምወርክ ቡድን",
                "Laabii Injinarummaa | Garee Firiimwoorkii & Kutaalee"
              )}
            </p>
          </div>

          {/* Quick summary metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 pb-3 border-b border-border">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t("Remote / Addis Ababa", "የርቀት / አዲስ አበባ", "Fagoo irraa / Finfinnee")}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t("Full-Time", "ሙሉ ጊዜ", "Yeroo Guutuu")}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
              <span>$125,000 - $165,000 USD + Equity</span>
            </span>
          </div>

          {/* Role Overview */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              {t("Role Overview", "የስራው አጠቃላይ መግለጫ", "Ibsa Gahee Hojii")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "We are building adaptive accessibility infrastructure for the web. Rather than superficial overlay widgets, our framework enables applications to understand user accessibility needs and automatically adjust component sizing, contrast, keyboard navigation, and cognitive descriptions in real time.",
                "ማንኛውም ተጠቃሚ በራሱ ፍላጎት መሰረት የሚስማሙ ተደራሽ የሆኑ የሶፍትዌር ክፍሎችን የሚያዘጋጅ መሃንዲስ እንፈልጋለን። ኮምፖነንቶች የንክኪ መጠናቸውን፣ ቀለማቸውን እና መግለጫዎቻቸውን በቅጽበት ያስተካክላሉ።",
                "Kutaaleen weebii akka fayyadamaa madaqan gochuuf sirna qaqqabamummaa haaraa ijaaraa jirra. Kutaaleen akkaataan isaanii, bal'inni qabduu fi xiyyeeffannoon isaanii yeruma sana jijjiirama."
              )}
            </p>
          </div>

          {/* Key Responsibilities */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              {t("Key Responsibilities", "ዋና ዋና ኃላፊነቶች", "Itti Gaafatamummaa Ijoo")}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                {t(
                  "Design and implement adaptive UI primitives on top of Radix UI and semantic HTML.",
                  "የተደራሽነት ኮር ፍሬምወርክን ማሳደግ እና አዳዲስ ክፍሎችን መገንባት።",
                  "Firiimwoorkii qaqqabamummaa guddisuu fi kutaalee haaraa ijaaruu."
                )}
              </li>
              <li>
                {t(
                  "Ensure zero-latency profile updates and WCAG 2.2 AA conformance across all components.",
                  "በሁሉም ክፍሎች ላይ የWCAG 2.2 ደረጃዎችን እና ፈጣን ምላሽን ማረጋገጥ።",
                  "Sadarkaa WCAG 2.2 mirkaneessuu fi sirna ariifataa uumuu."
                )}
              </li>
              <li>
                {t(
                  "Support Ge'ez script typography, Amharic localization, and Ethiopian calendar formatting.",
                  "የአማርኛ ጊዕዝ ፊደላት ተደራሽነት እና የኢትዮጵያ ዘመን አቆጣጠር ድጋፍን ማሻሻል።",
                  "Sirna barreeffama Ge'ez fi qubee madaqsuu."
                )}
              </li>
              <li>
                {t(
                  "Integrate browser speech synthesis, voice dictation, and assistant bridge APIs.",
                  "የድምጽ ግብዓት እና የአጋዥ ኤክስቴንሽን መገናኛዎችን መገንባት።",
                  "Sirna sagalee fi gargaaraa teeknooloojii walqunnamsiisuu."
                )}
              </li>
            </ul>
          </div>

          {/* Requirements */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              {t("Qualifications & Experience", "ተፈላጊ ችሎታዎች", "Ulaagaalee Barbaachisoo")}
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                {t(
                  "Strong proficiency in modern React, TypeScript, and WAI-ARIA 1.2 authoring practices.",
                  "በReact፣ TypeScript እና በተደራሽነት ደረጃዎች ላይ የጠለቀ ልምድ።",
                  "React fi TypeScript irratti muuxannoo gadi fagoo qabaachuu."
                )}
              </li>
              <li>
                {t(
                  "Hands-on experience testing interfaces with screen readers (NVDA, VoiceOver, or TalkBack).",
                  "የተለያዩ ስክሪን አንባቢዎችን (NVDA፣ VoiceOver፣ TalkBack) ተጠቅሞ የመፈተሽ ችሎታ።",
                  "Dubbistoota iskiriiniitiin qorachuu danda'uu."
                )}
              </li>
              <li>
                {t(
                  "Commitment to inclusive engineering, high-contrast usability, and keyboard-first navigation.",
                  "ለሁሉም ተጠቃሚዎች ምቹ የሆኑ ግልጽ እና ተደራሽ ኮዶችን የመጻፍ ፍላጎት።",
                  "Dizaayinii hunda hirmaachiseef fedhii qabaachuu."
                )}
              </li>
            </ul>
          </div>

          {/* Accommodations */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              {t("Accommodations & Inclusion", "የተደራሽነት እና ልዩ ድጋፍ ዋስትና", "Wabii Deeggarsaa")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "We actively welcome neurodivergent candidates and applicants who use assistive technology. We provide comprehensive accommodations (live captions, sign language interpreters, extended evaluation time, screen reader compatibility) throughout all hiring and interview stages.",
                "የተለያየ የአካል ጉዳት ወይም ልዩ ድጋፍ የሚያስፈልጋቸውን አመልካቾች በሙሉ ልብ እናበረታታለን። በቃለ-መጠይቁ ሂደት የሚፈልጉትን ድጋፍ በቅጹ ላይ መግለጽ ይችላሉ።",
                "Iyyattoota teeknooloojii gargaarsaa fayyadaman garaa guutuun jajjabeessina. Adeemsa hunda keessatti deeggarsa addaa ni kennina."
              )}
            </p>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {t("Ready to apply? Submit your application directly in the next tab.", "ለማመልከት ዝግጁ ነዎት? ቀጣዩን ታብ ይጫኑ።", "Iyyachuuf qophiidhaa? Tab itti aanu cuqqaalaa.")}
            </p>
            <AccessibleButton
              variant="primary"
              onClick={() => setActiveTab("apply")}
            >
              <span>{t("Apply for this Role", "ለዚህ ስራ አመልክት", "Hojii Kanaaf Iyyadhu")}</span>
              <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
            </AccessibleButton>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* Tab Panel 3: Job Application Form                         */}
      {/* ========================================================= */}
      {activeTab === "apply" && (
        <section
          role="tabpanel"
          id="panel-apply"
          aria-labelledby="tab-apply"
          className="space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {t("Job Application Form", "የሥራ ማመልከቻ ቅጽ", "Foormii Iyyannoo Hojii")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                "Submit your candidate details. All inputs adapt to your active accessibility profile.",
                "የማመልከቻ መረጃዎን ይሙሉ እና ያስገቡ።",
                "Odeeffannoo iyyannoo keessanii guutaa."
              )}
            </p>
          </div>

          <form onSubmit={handleJobSubmit} noValidate className="space-y-5">
            <AccessibleInput
              id="job-position"
              label={t("Position Applied For", "የሚያመለክቱበት የስራ መደብ", "Gahee Hojii")}
              value={jobPosition}
              onChange={(e) => setJobPosition(e.target.value)}
              description={t("The role you are submitting this application for.", "የሚያመለክቱበት የስራ ርዕስ።", "Gahee hojii iyyattan.")}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AccessibleInput
                id="job-applicant-name"
                label={t("Full Legal Name", "ሙሉ ህጋዊ ስም", "Maqaa Guutuu")}
                placeholder="Jane Doe"
                value={jobFullName}
                onChange={(e) => setJobFullName(e.target.value)}
                required
                error={jobErrors.fullName}
                speechInput
                speechOutput
              />

              <AccessibleInput
                id="job-applicant-phone"
                type="tel"
                label={t("Phone Number", "የስልክ ቁጥር", "Lakkoofsa Bilbilaa")}
                placeholder="+251 91 123 4567"
                value={jobPhone}
                onChange={(e) => setJobPhone(e.target.value)}
                required
                error={jobErrors.phone}
                speechInput
                speechOutput
              />
            </div>

            <AccessibleInput
              id="job-applicant-email"
              type="email"
              label={t("Contact Email", "የመገናኛ ኢሜይል", "Imeelii")}
              placeholder="jane@example.com"
              value={jobEmail}
              onChange={(e) => setJobEmail(e.target.value)}
              required
              error={jobErrors.email}
              speechInput
              speechOutput
            />

            <AccessibleInput
              id="job-applicant-portfolio"
              type="url"
              label={t("Portfolio or GitHub URL", "የፖርትፎሊዮ ወይም የGitHub አድራሻ", "Teessoo Poortifooliyoo / GitHub")}
              placeholder="https://github.com/username"
              value={jobPortfolio}
              onChange={(e) => setJobPortfolio(e.target.value)}
              description={t("Link to public repositories, projects, or case studies.", "የሰሯቸው ፕሮጀክቶች መረጃ።", "Hojiiwwan kanaan dura hojjattan.")}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AccessibleSelect
                id="job-experience-level"
                label={t("Experience Level", "የስራ ልምድ ደረጃ", "Sadarkaa Muuxannoo")}
                value={experienceLevel}
                onChange={setExperienceLevel}
                options={experienceOptions}
              />

              <AccessibleSelect
                id="job-location-preference"
                label={t("Location Preference", "የስራ ቦታ ምርጫ", "Filannoo Bakka Hojii")}
                value={locationPref}
                onChange={setLocationPref}
                options={locationOptions}
              />
            </div>

            <AccessibleSelect
              id="job-accommodation"
              label={t("Workplace Accommodation Request", "የተደራሽነት ድጋፍ ምርጫ", "Deeggarsa Qaqqabamummaa")}
              description={t("Optional. We provide accommodations throughout technical evaluations.", "አማራጭ። በቃለ-መጠይቁ ሂደት የሚፈልጉትን ድጋፍ መምረጥ ይችላሉ።", "Filannoo dabalataa.")}
              value={accommodationPref}
              onChange={setAccommodationPref}
              options={accommodationOptions}
            />

            <AccessibleTextarea
              id="job-cover-note"
              label={t("Cover Note & Experience Summary", "የልምድ እና የፍላጎት ማብራሪያ", "Ibsa Muuxannoo fi Fedhii")}
              description={t("Briefly describe your experience building accessible front-end interfaces.", "በተደራሽነት እና በሶፍትዌር ግንባታ ላይ ያለዎትን ልምድ በአጭሩ ያብራሩ።", "Muuxannoo keessan gabaabsanii ibsaa.")}
              simplifiedDescription={t("Tell us why you want this role.", "ይህን ስራ ለምን እንደፈለጉ ይንገሩን።", "Hojii kana maaliif akka barbaaddan nutti himaa.")}
              placeholder={t("Tell us about your background and recent projects...", "ስለ እርስዎ ልምድ ይጻፉ...", "Waa'ee muuxannoo keessanii barreessaa...")}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              required
              error={jobErrors.coverNote}
              speechInput
              speechOutput
            />

            <AccessibleCheckbox
              id="job-consent"
              label={t(
                "I confirm the accuracy of this application information",
                "የሞላሁት መረጃ ትክክለኛ መሆኑን አረጋግጣለሁ",
                "Odeeffannoon kenne sirrii ta'uu nan mirkaneessa"
              )}
              checked={jobConsent}
              onCheckedChange={setJobConsent}
              required
              error={jobErrors.consent}
            />

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <AccessibleButton type="submit" variant="primary">
                <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                <span>{t("Submit Application", "ማመልከቻ አስገባ", "Iyyannoo Galchi")}</span>
              </AccessibleButton>
              <AccessibleButton type="button" variant="outline" onClick={handleJobReset}>
                <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                <span>{t("Reset Form", "ቅጹን አጽዳ", "Qulqulleessi")}</span>
              </AccessibleButton>
            </div>
          </form>
        </section>
      )}

      {/* Job Application Success Dialog */}
      <AccessibleDialog
        open={showJobSuccess}
        onOpenChange={setShowJobSuccess}
        title={t("Application Submitted", "ማመልከቻዎ ገብቷል", "Iyyannoon Ergameera")}
        description={t("Your application has been received successfully.", "ማመልከቻዎ በተሳካ ሁኔታ ደርሶናል።", "Iyyannoon keessan nu gaheera.")}
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-sm">
              {t("Reference Tracking ID:", "የማመልከቻ መለያ ቁጥር:", "Lakkoofsa Iyyannoo:")}{" "}
              <code className="font-mono text-foreground">{jobReferenceId}</code>
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(
              "Thank you for applying. All adaptive fields and accommodations have been registered.",
              "ስላመለከቱ እናመሰግናለን። ያቀረቧቸው የተደራሽነት ድጋፍ ጥያቄዎች ተመዝግበዋል።",
              "Galatoomaa. Deeggarsi qaqqabamummaa keessan galmaa'eera."
            )}
          </p>
          <div className="flex justify-end">
            <AccessibleButton variant="primary" onClick={() => setShowJobSuccess(false)}>
              {t("Close", "ዝጋ", "Cufi")}
            </AccessibleButton>
          </div>
        </div>
      </AccessibleDialog>
    </div>
  );
}
