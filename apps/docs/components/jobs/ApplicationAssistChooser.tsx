"use client";

import * as React from "react";
import {
  DEFAULT_PROFILE,
  READ_ALOUD_PRESET,
  SCREEN_READER_PRESET,
  VISUAL_ALERTS_PRESET,
  useAccessibility,
  type TederashProfile,
} from "@tederash/react";
import { Ear, EarOff, Settings2, Sparkles, Volume2 } from "lucide-react";
import { OPEN_ACCESSIBILITY_SETTINGS_EVENT } from "../AccessibilityControlPanel";

type Text = { en: string; am: string; om: string };

interface AssistOption {
  preset: TederashProfile;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;
  title: Text;
  description: Text;
  /** Confirmation announced after choosing (read aloud when the option enables speech) */
  confirmation: Text;
}

const OPTIONS: AssistOption[] = [
  {
    preset: DEFAULT_PROFILE,
    icon: Sparkles,
    title: { en: "No changes", am: "ምንም ለውጥ የለም", om: "Jijjiirama malee" },
    description: {
      en: "Use the application as it is.",
      am: "ማመልከቻውን እንዳለ ይጠቀሙ።",
      om: "Akka jiruun iyyannicha fayyadamaa.",
    },
    confirmation: {
      en: "Standard settings restored.",
      am: "መደበኛ ቅንብሮች ተመልሰዋል።",
      om: "Qindaa'inni idilee deebi'eera.",
    },
  },
  {
    preset: SCREEN_READER_PRESET,
    icon: Ear,
    title: { en: "I use a screen reader", am: "ስክሪን አንባቢ እጠቀማለሁ", om: "Dubbisaa iskiriinii nan fayyadama" },
    description: {
      en: "Works with NVDA, JAWS, VoiceOver or TalkBack: clear instructions, strong keyboard focus, confirmations and voice input. The page stays silent so nothing is read twice.",
      am: "ከNVDA፣ JAWS፣ VoiceOver ወይም TalkBack ጋር ይሰራል፦ ግልጽ መመሪያዎች፣ ጠንካራ የኪቦርድ ትኩረት፣ ማረጋገጫዎች እና የድምፅ ግቤት። ምንም ነገር ሁለት ጊዜ እንዳይነበብ ገጹ ዝም ይላል።",
      om: "NVDA, JAWS, VoiceOver ykn TalkBack wajjin hojjata: qajeelfama ifa ta'e, xiyyeeffannoo kiiboordii cimaa, mirkaneessaa fi galtee sagalee. Fuulli akka wanti tokko illee irra deebi'amee hin dubbifamne callisa.",
    },
    confirmation: {
      en: "Screen reader mode on. Field instructions are always shown, and you can answer any text field by voice.",
      am: "የስክሪን አንባቢ ሁኔታ በርቷል። የመስክ መመሪያዎች ሁልጊዜ ይታያሉ፣ እና ማንኛውንም የጽሑፍ መስክ በድምፅ መመለስ ይችላሉ።",
      om: "Haalli dubbisaa iskiriinii baneera. Qajeelfamoonni dirree yeroo hunda ni mul'atu, dirree barruu kamiyyuu sagaleedhaan deebisuu dandeessu.",
    },
  },
  {
    preset: READ_ALOUD_PRESET,
    icon: Volume2,
    title: { en: "I'm blind, read the page to me", am: "ማየት አልችልም፣ ገጹን አንብብልኝ", om: "ArgUU hin danda'u, fuula naaf dubbisi" },
    description: {
      en: "For use without a screen reader. Messages and field instructions are read aloud, you can answer by voice, and text and buttons are larger for any remaining sight.",
      am: "ያለ ስክሪን አንባቢ ለመጠቀም። መልዕክቶች እና የመስክ መመሪያዎች በድምፅ ይነበባሉ፣ በድምፅ መመለስ ይችላሉ፣ እንዲሁም ለቀሪ እይታ ጽሑፍ እና ቁልፎች ትልቅ ይሆናሉ።",
      om: "Dubbisaa iskiriinii malee fayyadamuuf. Ergaawwanii fi qajeelfamoonni dirree sagaleedhaan dubbifamu, sagaleedhaan deebisuu dandeessu, barruunii fi qabduun immoo ija hafeef guddaa ta'u.",
    },
    confirmation: {
      en: "Read aloud mode on. Use Tab to move between fields. Each field has a button to hear its instructions and a microphone to answer by voice.",
      am: "በድምፅ የማንበብ ሁኔታ በርቷል። በመስኮች መካከል ለመንቀሳቀስ Tab ይጠቀሙ። እያንዳንዱ መስክ መመሪያውን ለማዳመጥ ቁልፍ እና በድምፅ ለመመለስ ማይክሮፎን አለው።",
      om: "Haalli sagaleedhaan dubbisuu baneera. Dirreewwan gidduu deemuf Tab fayyadamaa. Qajeelfama dhaggeeffachuuf qabduu, sagaleedhaan deebisuuf maaykiroofoonii qaba.",
    },
  },
  {
    preset: VISUAL_ALERTS_PRESET,
    icon: EarOff,
    title: { en: "I'm deaf or hard of hearing", am: "መስማት የተሳነኝ ወይም የመስማት ችግር አለብኝ", om: "Dhaga'uu hin danda'u yookiin rakkoo dhageettii qaba" },
    description: {
      en: "Nothing depends on sound. Every message appears on screen and stays longer, and instructions are always shown.",
      am: "ምንም ነገር በድምፅ ላይ አይመሰረትም። እያንዳንዱ መልዕክት በስክሪኑ ላይ ይታያል እና ረዘም ላለ ጊዜ ይቆያል፣ መመሪያዎችም ሁልጊዜ ይታያሉ።",
      om: "Wanti sagalee irratti hundaa'e hin jiru. Ergaan hundi iskiriinii irratti mul'ata, yeroo dheeraaf tura, qajeelfamoonnis yeroo hunda ni mul'atu.",
    },
    confirmation: {
      en: "Visual alerts on. All messages will appear on screen.",
      am: "የሚታዩ ማሳወቂያዎች በርተዋል። ሁሉም መልዕክቶች በስክሪኑ ላይ ይታያሉ።",
      om: "Akeekkachiisni mul'atu baneera. Ergaawwan hundi iskiriinii irratti ni mul'atu.",
    },
  },
];

/**
 * One question instead of a settings page: the candidate says how they would
 * like to apply and the matching optimisations are applied. Everything else
 * (text size, contrast, motion, language…) stays in the ♿ settings panel.
 */
export function ApplicationAssistChooser() {
  const { profile, setProfile, announce } = useAccessibility();
  const locale = profile.locale ?? "en";
  const isAmharic = locale === "am";
  const isOromo = locale === "om";
  const t = (text: Text) => (isAmharic ? text.am : isOromo ? text.om : text.en);
  const selectedId = OPTIONS.some((o) => o.preset.id === profile.id) ? profile.id : null;

  const choose = (option: AssistOption) => {
    // Keep the candidate's language when switching modes.
    const speechLanguage = profile.speech?.language ?? option.preset.speech?.language;
    setProfile({
      ...option.preset,
      locale: profile.locale ?? option.preset.locale,
      speech: { ...option.preset.speech, ...(speechLanguage ? { language: speechLanguage } : {}) },
    });
    announce({ message: t(option.confirmation), priority: "polite", category: "success" });
  };

  return (
    <section
      aria-labelledby="apply-assist-heading"
      className="p-5 sm:p-6 rounded-xl border border-border bg-card flex flex-col gap-4"
    >
      <fieldset className="flex flex-col gap-3">
        <legend id="apply-assist-heading" className="text-base sm:text-lg font-bold text-foreground">
          {isAmharic
            ? "እንዴት ማመልከት ይፈልጋሉ?"
            : isOromo
            ? "Akkamitti iyyachuu barbaaddu?"
            : "How would you like to apply?"}
        </legend>
        <p className="text-sm text-muted-foreground -mt-1">
          {isAmharic
            ? "አንዱን ይምረጡ፣ ማመልከቻው ወዲያውኑ ይስተካከላል። በማንኛውም ጊዜ መቀየር ይችላሉ።"
            : isOromo
            ? "Tokko filadhaa, iyyannichi yeruma san madaqfama. Yeroo kamiyyuu jijjiiruu dandeessu."
            : "Choose one and the application adapts straight away. You can change it at any time."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const id = `apply-assist-${option.preset.id}`;
            return (
              <label
                key={option.preset.id}
                htmlFor={id}
                className="relative flex items-start gap-3 p-4 rounded-lg border border-border bg-background cursor-pointer transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-amber-500"
              >
                <input
                  id={id}
                  type="radio"
                  name="apply-assist"
                  value={option.preset.id}
                  checked={selectedId === option.preset.id}
                  onChange={() => choose(option)}
                  aria-describedby={`${id}-desc`}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 font-semibold text-foreground">
                    <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    {t(option.title)}
                  </span>
                  <span id={`${id}-desc`} className="text-sm text-foreground/80 leading-relaxed">
                    {t(option.description)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {selectedId === null
            ? isAmharic
              ? "የራስዎን ቅንብሮች እየተጠቀሙ ነው።"
              : isOromo
              ? "Qindaa'ina mataa keessanii fayyadamaa jirtu."
              : "You're using your own custom settings."
            : isAmharic
            ? "የጽሑፍ መጠን፣ ንፅፅር፣ እንቅስቃሴ ወይም ቋንቋ መቀየር ይፈልጋሉ?"
            : isOromo
            ? "Guddina barruu, walsimannaa, sochii yookiin afaan jijjiiruu barbaadduu?"
            : "Need larger text, more contrast, less motion or another language?"}
        </p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_ACCESSIBILITY_SETTINGS_EVENT))}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-2 min-h-[44px] rounded-lg border border-border text-sm font-medium hover:bg-muted focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <Settings2 className="w-4 h-4" aria-hidden="true" />
          {isAmharic ? "ሌሎች ቅንብሮች" : isOromo ? "Qindaa'ina dabalataa" : "More settings"}
        </button>
      </div>
    </section>
  );
}
