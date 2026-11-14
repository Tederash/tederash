"use client";

import React, { useState } from "react";
import {
  useAccessibility,
  useSpeechSynthesis,
} from "@tederash/react";
import {
  Volume2,
  VolumeX,
  Eye,
  Ear,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Keyboard,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowDown,
} from "lucide-react";

interface StepData {
  number: number;
  title: string;
  blindNotes: string;
  deafNotes: string;
  actionHint: string;
  spokenText: string;
}

export function AccessibilityOnboarding() {
  const { profile, updatePreferences, announce } = useAccessibility();
  const { speak, cancel, isSpeaking, isSupported: isTtsSupported } = useSpeechSynthesis();

  const [isOpen, setIsOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeSpeechText, setActiveSpeechText] = useState<string | null>(null);

  const isAmharic = profile.locale === "am";

  const STEPS: StepData[] = [
    {
      number: 1,
      title: isAmharic
        ? "ደረጃ 1: የገጹ አቀማመጥ እና የኪቦርድ አጠቃቀም"
        : "Step 1: Page Landmarks & Keyboard Navigation",
      blindNotes: isAmharic
        ? "ይህ ገጽ በዋና ዋና የመሬት ምልክቶች (Landmarks) የተደራጀ ነው። በTab እና Shift+Tab ቁልፎች ወደ ፊት እና ወደኋላ መሄድ ይችላሉ። ወደ ማመልከቻው ቅጽ በቀጥታ ለመዝለል ከታች ያለውን ሊንክ ይጫኑ።"
        : "This page is structured with standard semantic landmarks (header, main, form, fieldset). Navigate sequentially using Tab and Shift+Tab. Use Space to toggle checkboxes and Enter to open select dropdowns.",
      deafNotes: isAmharic
        ? "ሁሉም የድምፅ ማሳወቂያዎች በግልጽ በሚታዩ ባለቀለም ባነሮች ተተክተዋል። ማንኛውም ስህተት ወይም ማረጋገጫ በስክሪኑ ላይ በግልጽ ይታያል።"
        : "All system feedback is entirely visual. Error summaries, validation banners, and submission receipts render on-screen with prominent contrast without relying on sound alerts.",
      actionHint: isAmharic
        ? "ምክር: የኪቦርድ አሰሳን ለማንቃት 'ለስክሪን አንባቢ ተጠቃሚዎች' የሚለውን ቁልፍ ይጫኑ።"
        : "Hint: Click 'Optimize for Screen Reader' below to engage high-contrast focus rings and keyboard-first mode.",
      spokenText: isAmharic
        ? "ደረጃ አንድ: የገጹ አቀማመጥ እና የኪቦርድ አጠቃቀም። በTab እና Shift+Tab ቁልፎች በቅጹ ውስጥ መዘዋወር ይችላሉ። ሁሉም ማሳወቂያዎች በድምፅና በጽሑፍ ይቀርባሉ።"
        : "Step 1: Page landmarks and keyboard navigation. You can navigate through the application using Tab and Shift+Tab. All feedback is announced to screen readers and displayed visually.",
    },
    {
      number: 2,
      title: isAmharic
        ? "ደረጃ 2: የቅጹ አወቃቀር እና መመሪያዎች"
        : "Step 2: Form Structure & Field Descriptions",
      blindNotes: isAmharic
        ? "እያንዳንዱ የመግቢያ ሳጥን (Input) የተያያዘ ግልጽ ስም እና መግለጫ አለው። መግለጫዎቹ በስክሪን አንባቢ በኩል በቀጥታ ይነበባሉ።"
        : "Every field has a linked accessible label and helper description via aria-describedby. Required fields are explicitly tagged, and live character counts update in the status tree.",
      deafNotes: isAmharic
        ? "የመግቢያ ሳጥኖች ግልጽ የጽሑፍ መመሪያዎች እና ቀላል ማብራሪያዎች አሏቸው። ስህተቶች ሲከሰቱ በደማቅ ቀይ ጽሑፍ በግልጽ ይቀመጣሉ።"
        : "Each field provides persistent helper text and validation rules directly below the input. When an error occurs, an explicit red visual summary appears above the form.",
      actionHint: isAmharic
        ? "የጽሑፍ መጠኑን እና ንፅፅሩን ለማሳደግ የላይኛውን ፕሮፋይል መቀየሪያ መጠቀም ይችላሉ።"
        : "You can adjust text scale, contrast borders, and simplified descriptions anytime using the toolbar above.",
      spokenText: isAmharic
        ? "ደረጃ ሁለት: የቅጹ አወቃቀር እና መመሪያዎች። እያንዳንዱ የመግቢያ ሳጥን የተሟላ ማብራሪያ አለው። ስህተቶች ካሉ በግልጽ ይነገሩዎታል።"
        : "Step 2: Form structure and field descriptions. Each input provides clear contextual helper text and announces character limits.",
    },
    {
      number: 3,
      title: isAmharic
        ? "ደ阶段 3: የመስማት እና የማየት ልዩ ድጋፎች"
        : "Step 3: Interview Accommodations for Deaf & Blind Applicants",
      blindNotes: isAmharic
        ? "በክፍል 3 ስር 'የስክሪን አንባቢ ተጠቃሚ' የሚለውን በመምረጥ ለስክሪን አንባቢ ምቹ የሆኑ የፈተና ቁሳቁሶችን እና ተጨማሪ ጊዜን መጠየቅ ይችላሉ።"
        : "Under Section 3 in the form, select 'Screen Reader user' to request text-only take-home materials, accessible interview links, and extended exercise time.",
      deafNotes: isAmharic
        ? "በክፍል 3 ስር 'የጽሑፍ ንዑስ ርዕሶች' (Live Captions) ወይም የምልክት ቋንቋ አስተርጓሚ (Sign Language) ድጋፍን መምረጥ ይችላሉ።"
        : "Under Section 3, select 'Live Video Captions or Written Interview Flow' to request CART captioning, ASL/Ethiopian Sign Language interpreters, or an asynchronous text interview.",
      actionHint: isAmharic
        ? "እኛ ሁሉንም አመልካቾች በእኩልነት እናስተናግዳለን፤ ድጋፍ መጠየቅ በእጩነትዎ ላይ ምንም ተፅዕኖ አይፈጥርም።"
        : "Requesting accommodations is confidential and guarantees you a tailored, fully accessible interview process.",
      spokenText: isAmharic
        ? "ደረጃ ሦስት: የመስማት እና የማየት ልዩ ድጋፎች። ለቃለ መጠይቅዎ የስክሪን አንባቢ፣ የጽሑፍ ወይም የምልክት ቋንቋ ድጋፍ በቅጹ ላይ መምረጥ ይችላሉ።"
        : "Step 3: Interview accommodations. You can select screen reader materials, live captions, or sign language interpreters directly on the form.",
    },
    {
      number: 4,
      title: isAmharic
        ? "ደረጃ 4: ደህንነቱ የተጠበቀ ማስረከብ"
        : "Step 4: Safe Submission & Verification Receipt",
      blindNotes: isAmharic
        ? "ቅጹን ሲያስገቡ ማመልከቻው በትክክል መድረሱን የሚያረጋግጥ የፖላይት (Polite) ስክሪን አንባቢ መልእክት እና ልዩ የማመልከቻ ቁጥር ይደርስዎታል።"
        : "Upon submitting, a polite aria-live announcement will broadcast confirmation along with your generated reference tracking identifier.",
      deafNotes: isAmharic
        ? "ማመልከቻዎ በተሳካ ሁኔታ ሲገባ አረንጓዴ የተረጋገጠ ባነር እና የማመልከቻ ቁጥርዎን የያዘ ደረሰኝ በስክሪኑ ላይ ይታያል።"
        : "A high-visibility teal confirmation card will replace the form upon submission, displaying your reference code and next steps in high-contrast text.",
      actionHint: isAmharic
        ? "የተሳሳተ መረጃ እንዳይጠፋ 'ቅጹን አጽዳ' የሚለው ቁልፍ ከመሰረዙ በፊት የማረጋገጫ ጥያቄ ያቀርባል።"
        : "The Reset button includes an accessible confirmation dialog to prevent accidental deletion of your entered data.",
      spokenText: isAmharic
        ? "ደረጃ አራት: ደህንነቱ የተጠበቀ ማስረከብ። ማመልከቻዎን ሲያስገቡ የማረጋገጫ ቁጥር ይሰጥዎታል። አሁን ቅጹን ለመሙላት ዝግጁ ነዎት።"
        : "Step 4: Safe submission and verification receipt. Submitting generates an accessible reference tracking code. You are now ready to complete the form.",
    },
  ];

  const step = STEPS[currentStep];

  const handleSpeakStep = () => {
    if (isSpeaking) {
      cancel();
      setActiveSpeechText(null);
    } else {
      setActiveSpeechText(step.spokenText);
      speak(step.spokenText, {
        lang: isAmharic ? "am-ET" : "en-US",
        rate: 0.95,
      });
      announce({
        message: `Playing audio narration for ${step.title}.`,
        priority: "polite",
        category: "info",
      });
    }
  };

  const handleNextStep = () => {
    cancel();
    setActiveSpeechText(null);
    if (currentStep < STEPS.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      announce({
        message: `Navigated to ${STEPS[nextIdx].title}.`,
        priority: "polite",
        category: "info",
      });
    }
  };

  const handlePrevStep = () => {
    cancel();
    setActiveSpeechText(null);
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      announce({
        message: `Navigated to ${STEPS[prevIdx].title}.`,
        priority: "polite",
        category: "info",
      });
    }
  };

  const handleOptimizeForBlind = () => {
    updatePreferences({
      visual: {
        highContrast: true,
        fontScale: 1.25,
        underlineLinks: true,
      },
      motor: {
        keyboardNavigation: true,
        targetSize: "large",
      },
      speech: {
        speechOutput: true,
        language: isAmharic ? "am-ET" : "en-US",
        speechRate: 0.95,
      },
      cognitive: {
        showInstructions: true,
        readingFocusGuide: true,
      },
      interaction: {
        preferredInput: "keyboard",
        formAssistance: true,
        confirmationBeforeDestructiveActions: true,
      },
    });

    const msg = isAmharic
      ? "የስክሪን አንባቢ እና የኪቦርድ አሰሳ ፕሮፋይል ነቅቷል።"
      : "Activated Screen Reader & Keyboard Navigation accessibility profile.";

    announce({
      message: msg,
      priority: "assertive",
      category: "success",
    });

    // Also immediately trigger audio speech narration of the active step instructions
    const fullAudio = `${msg}. ${step.spokenText}`;
    setActiveSpeechText(fullAudio);
    speak(fullAudio, {
      lang: isAmharic ? "am-ET" : "en-US",
      rate: 0.95,
    });
  };

  const handleOptimizeForDeaf = () => {
    updatePreferences({
      auditory: {
        visualNotifications: true,
        captionsEnabled: true,
      },
      cognitive: {
        showInstructions: true,
        simplifiedLanguage: true,
      },
      visual: {
        highContrast: true,
      },
    });
    announce({
      message: "Activated Deaf & Visual Notifications accessibility profile.",
      priority: "assertive",
      category: "success",
    });
  };

  if (!isOpen) {
    return (
      <div className="w-full">
        <button
          onClick={() => {
            setIsOpen(true);
            announce({
              message: "Accessibility orientation guide reopened.",
              priority: "polite",
              category: "info",
            });
          }}
          aria-expanded={false}
          className="w-full p-3 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-foreground flex items-center justify-between transition-colors focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <span className="p-1 rounded bg-teal-600 dark:bg-teal-500 text-white text-xs">
              ♿
            </span>
            <span>
              {isAmharic
                ? "የተደራሽነት መመሪያ: ለማየት እና ለመስማት ድጋፍ የሚሰጠውን መመሪያ ክፈት"
                : "Accessibility Orientation Guide: Open assistance for Blind and Deaf applicants"}
            </span>
          </div>
          <span className="text-xs text-teal-800 dark:text-teal-300 font-bold underline">
            {isAmharic ? "መመሪያውን ክፈት" : "Open Guide"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <section
      role="region"
      aria-label={
        isAmharic
          ? "የተደራሽነት መመሪያ እና አጋዥ ማብራሪያ"
          : "Accessibility Orientation & Assistance Guide"
      }
      className="p-6 rounded-xl border-2 border-teal-600/40 dark:border-teal-400/40 bg-card shadow-md flex flex-col gap-6"
    >
      {/* Header and Quick Setup Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 shrink-0">
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {isAmharic
                  ? "የተደራሽነት መመሪያ: ለማየት እና ለመስማት ልዩ ድጋፍ"
                  : "Accessibility Orientation Guide"}
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                {isAmharic ? "አጋዥ" : "Assisted"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAmharic
                ? "የማየት ወይም የመስማት ልዩ ፍላጎት ላላቸው አመልካቾች የተዘጋጀ ደረጃ-በደረጃ መመሪያ"
                : "Tailored navigation, audio readouts, and visual cues for blind and deaf applicants."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Read Aloud Button */}
          {isTtsSupported && (
            <button
              onClick={handleSpeakStep}
              aria-label={
                isSpeaking
                  ? "Stop reading step aloud"
                  : `Read aloud: ${step.title}`
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                isSpeaking
                  ? "bg-amber-500 text-white animate-pulse"
                  : "bg-muted text-foreground hover:bg-muted/80 border border-border"
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isAmharic ? "ማንበብ አቁም" : "Stop Reading"}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <span>{isAmharic ? "ደረጃውን አድምጥ" : "Read Aloud"}</span>
                </>
              )}
            </button>
          )}

          {/* Dismiss Button */}
          <button
            onClick={() => {
              cancel();
              setIsOpen(false);
              announce({
                message: "Orientation guide minimized.",
                priority: "polite",
                category: "info",
              });
            }}
            aria-label={isAmharic ? "መመሪያውን ዝጋ" : "Minimize orientation guide"}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* One-Click Quick Optimization Profiles */}
      <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs font-semibold text-foreground">
          {isAmharic ? "ፈጣን የተደራሽነት ምርጫዎች:" : "Quick Profile Optimization:"}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOptimizeForBlind}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>{isAmharic ? "ለማየት/ስክሪን አንባቢ አመቻች" : "Optimize for Blind & Screen Reader"}</span>
          </button>

          <button
            onClick={handleOptimizeForDeaf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Ear className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>{isAmharic ? "ለመስማት/የእይታ አመቻች" : "Optimize for Deaf & Visual Alerts"}</span>
          </button>
        </div>
      </div>

      {/* Live Synchronized Caption Bar (for Deaf users when TTS is active) */}
      {isSpeaking && activeSpeechText && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 rounded-lg bg-teal-500/15 border border-teal-500/30 text-xs text-foreground flex items-start gap-2.5 animate-in fade-in duration-200"
        >
          <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-teal-700 text-white shrink-0 mt-0.5">
            {isAmharic ? "ንዑስ ርዕስ (CC)" : "Live Captions (CC)"}
          </span>
          <p className="font-medium leading-relaxed">{activeSpeechText}</p>
        </div>
      )}

      {/* Main Step Content: Dual Perspective (Blind & Deaf) */}
      <div className="flex flex-col gap-4">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-mono text-xs font-bold flex items-center justify-center">
              {step.number}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {step.title}
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {currentStep + 1} / {STEPS.length}
          </span>
        </div>

        {/* Dual Cards: Screen Reader / Blind Guidance + Deaf / Visual Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: For Blind / Screen Reader / Braille Users */}
          <div className="p-4 rounded-lg border border-border bg-background flex flex-col gap-2">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isAmharic ? "ለስክሪን አንባቢ እና ማየት ለተሳናቸው" : "For Blind & Screen-Reader Users"}</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {step.blindNotes}
            </p>
          </div>

          {/* Card 2: For Deaf / Hard of Hearing / Visual Notification Users */}
          <div className="p-4 rounded-lg border border-border bg-background flex flex-col gap-2">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Ear className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isAmharic ? "ለመስማት ለተሳናቸው እና የእይታ ማሳወቂያዎች" : "For Deaf & Hard-of-Hearing Users"}</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {step.deafNotes}
            </p>
          </div>
        </div>

        {/* Action Hint Callout */}
        <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-foreground shrink-0" aria-hidden="true" />
          <span>{step.actionHint}</span>
        </div>
      </div>

      {/* Footer Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <a
          href="#application-form"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded py-0.5"
        >
          <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isAmharic ? "ወደ ማመልከቻው ቅጽ በቀጥታ ዝለል" : "Skip Directly to Application Form"}</span>
        </a>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isAmharic ? "ወደ ኋላ" : "Previous"}</span>
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNextStep}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <span>{isAmharic ? "ቀጣይ" : "Next Step"}</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : (
            <a
              href="#application-form"
              onClick={() => {
                announce({
                  message: "Onboarding completed. Ready to fill application form.",
                  priority: "polite",
                  category: "success",
                });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAmharic ? "ቅጹን መሙላት ጀምር" : "Start Application"}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
