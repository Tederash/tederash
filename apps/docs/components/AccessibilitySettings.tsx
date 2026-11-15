"use client";

import * as React from "react";
import {
  PRESET_PROFILES,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  useSpeechSynthesis,
  useTederash,
  type TargetSize,
  type TederashProfile,
} from "@tederash/react";
import { TederashCheckbox } from "@tederash/components";

/**
 * End-user accessibility settings, shared by the floating ♿ drawer and any
 * page that embeds them (e.g. /jobs). Every control maps to a profile
 * preference that the runtime or the components actually act on; options
 * without an implemented effect are deliberately not offered.
 */
export function AccessibilitySettings({ idPrefix = "a11y" }: { idPrefix?: string }) {
  const { profile, setProfile, updatePreferences, announce } = useTederash();

  // Detected after mount so server and client markup match during hydration.
  const [speechSupport, setSpeechSupport] = React.useState<{ input: boolean; output: boolean } | null>(null);
  React.useEffect(() => {
    setSpeechSupport({ input: isSpeechRecognitionSupported(), output: isSpeechSynthesisSupported() });
  }, []);

  const selectPreset = (preset: TederashProfile) => {
    setProfile(preset);
    announce({ message: `Activated ${preset.name} accessibility profile.`, priority: "polite", category: "info" });
  };

  const fontScale = profile.visual?.fontScale ?? 1;
  const targetSize = profile.motor?.targetSize ?? "normal";
  const locale = profile.locale ?? "en";
  const speechRate = profile.speech?.speechRate ?? 1;
  const speechLanguage = profile.speech?.language ?? (locale === "am" ? "am-ET" : "en-US");
  const synthesis = useSpeechSynthesis();
  const voiceMissing = Boolean(profile.speech?.speechOutput) && synthesis.isVoiceMissing(speechLanguage);
  const languageName = locale === "am" ? "Amharic" : "English";
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="flex flex-col gap-6" data-slot="accessibility-settings">
      {/* Presets */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold mb-2">Start from a preset</legend>
        <p className="text-xs text-muted-foreground -mt-1 mb-1">
          Presets are starting points. Every option below can be changed on top of them.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESET_PROFILES.map((preset) => {
            const active = profile.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectPreset(preset)}
                aria-pressed={active}
                className={`p-2.5 rounded-lg text-left text-xs font-medium border transition-colors min-h-[44px] focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none ${
                  active
                    ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary"
                    : "border-border bg-card hover:bg-muted text-foreground"
                }`}
              >
                <span className="block font-semibold">{preset.name}</span>
                <span
                  className={`block text-[11px] line-clamp-2 mt-0.5 font-normal ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Language */}
      <fieldset className="flex flex-col gap-2 border-t border-border pt-4">
        <legend className="text-sm font-semibold mb-2">Language</legend>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Interface language">
          {[
            { value: "en", label: "English", lang: "en", speech: "en-US" },
            { value: "am", label: "አማርኛ (Amharic)", lang: "am", speech: "am-ET" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              lang={option.lang}
              aria-pressed={locale === option.value}
              onClick={() => updatePreferences({ locale: option.value, speech: { language: option.speech } })}
              className={`py-2 text-sm rounded-lg border min-h-[44px] focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none ${
                locale === option.value
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Also sets the language used for voice input and read-aloud.
        </p>
      </fieldset>

      {/* Vision */}
      <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
        <legend className="text-sm font-semibold mb-2">Seeing</legend>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm font-medium">
            <label htmlFor={id("font-scale")}>Text size</label>
            <output htmlFor={id("font-scale")}>{Math.round(fontScale * 100)}%</output>
          </div>
          <input
            id={id("font-scale")}
            type="range"
            min="0.8"
            max="2"
            step="0.05"
            value={fontScale}
            aria-valuetext={`${Math.round(fontScale * 100)}%`}
            onChange={(e) => updatePreferences({ visual: { fontScale: parseFloat(e.target.value) } })}
            className="w-full cursor-pointer accent-primary min-h-[44px]"
          />
        </div>
        <TederashCheckbox
          id={id("high-contrast")}
          label="High contrast"
          description="Stronger borders, bolder text and more visible focus rings."
          checked={Boolean(profile.visual?.highContrast)}
          onCheckedChange={(v) => updatePreferences({ visual: { highContrast: v } })}
        />
        <TederashCheckbox
          id={id("underline-links")}
          label="Underline links"
          description="Show links with an underline, not just colour."
          checked={Boolean(profile.visual?.underlineLinks)}
          onCheckedChange={(v) => updatePreferences({ visual: { underlineLinks: v } })}
        />
      </fieldset>

      {/* Motor & keyboard */}
      <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
        <legend className="text-sm font-semibold mb-2">Clicking, touch and keyboard</legend>
        <div className="flex flex-col gap-1.5">
          <span id={id("target-size-label")} className="text-sm font-medium">
            Button and field size
          </span>
          <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby={id("target-size-label")}>
            {(
              [
                ["normal", "Normal"],
                ["large", "Large"],
                ["extra-large", "Extra large"],
              ] as Array<[TargetSize, string]>
            ).map(([size, label]) => (
              <button
                key={size}
                type="button"
                aria-pressed={targetSize === size}
                onClick={() => updatePreferences({ motor: { targetSize: size } })}
                className={`py-2 text-xs rounded-lg border min-h-[44px] focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none ${
                  targetSize === size
                    ? "border-primary bg-primary text-primary-foreground font-semibold"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <TederashCheckbox
          id={id("keyboard")}
          label="Keyboard navigation"
          description="Extra-visible focus outlines for moving around with Tab."
          checked={Boolean(profile.motor?.keyboardNavigation)}
          onCheckedChange={(v) => updatePreferences({ motor: { keyboardNavigation: v } })}
        />
      </fieldset>

      {/* Reading & understanding */}
      <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
        <legend className="text-sm font-semibold mb-2">Reading and understanding</legend>
        <TederashCheckbox
          id={id("simplified")}
          label="Simpler wording"
          description="Use short, plain instructions where the page provides them."
          checked={Boolean(profile.cognitive?.simplifiedLanguage)}
          onCheckedChange={(v) => updatePreferences({ cognitive: { simplifiedLanguage: v } })}
        />
        <TederashCheckbox
          id={id("instructions")}
          label="Always show instructions"
          description="Make field instructions more prominent."
          checked={Boolean(profile.cognitive?.showInstructions)}
          onCheckedChange={(v) => updatePreferences({ cognitive: { showInstructions: v } })}
        />
        <TederashCheckbox
          id={id("guided")}
          label="Step-by-step forms"
          description="Split supported forms into one step at a time."
          checked={Boolean(profile.cognitive?.guidedInteraction)}
          onCheckedChange={(v) => updatePreferences({ cognitive: { guidedInteraction: v } })}
        />
      </fieldset>

      {/* Voice */}
      <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
        <legend className="text-sm font-semibold mb-2">Voice</legend>
        <TederashCheckbox
          id={id("speech-input")}
          label="Voice input"
          description={
            speechSupport && !speechSupport.input
              ? "Not supported in this browser. Try Chrome or Edge."
              : "Adds a microphone to fields that support dictation. You review the text before it is used."
          }
          disabled={Boolean(speechSupport && !speechSupport.input)}
          checked={Boolean(profile.speech?.speechInput)}
          onCheckedChange={(v) => updatePreferences({ speech: { speechInput: v } })}
        />
        <TederashCheckbox
          id={id("speech-output")}
          label="Read aloud"
          description={
            speechSupport && !speechSupport.output
              ? "Not supported in this browser."
              : "Speaks status messages and adds a speaker button to fields that support it."
          }
          disabled={Boolean(speechSupport && !speechSupport.output)}
          checked={Boolean(profile.speech?.speechOutput)}
          onCheckedChange={(v) => updatePreferences({ speech: { speechOutput: v } })}
        />
        {voiceMissing && (
          <p role="status" className="pl-6 text-sm text-muted-foreground">
            No {languageName} voice is installed on this device. Messages still appear on screen and
            reach screen readers, but nothing will be spoken until a {languageName} voice is added to
            the system.
          </p>
        )}
        {profile.speech?.speechOutput && (
          <div className="flex flex-col gap-1.5 pl-6">
            <div className="flex justify-between text-sm font-medium">
              <label htmlFor={id("speech-rate")}>Reading speed</label>
              <output htmlFor={id("speech-rate")}>{speechRate.toFixed(2)}×</output>
            </div>
            <input
              id={id("speech-rate")}
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={speechRate}
              aria-valuetext={`${speechRate.toFixed(2)} times normal speed`}
              onChange={(e) => updatePreferences({ speech: { speechRate: parseFloat(e.target.value) } })}
              className="w-full cursor-pointer accent-primary min-h-[44px]"
            />
          </div>
        )}
      </fieldset>

      {/* Motion & safety */}
      <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
        <legend className="text-sm font-semibold mb-2">Motion and safety</legend>
        <TederashCheckbox
          id={id("reduce-motion")}
          label="Reduce motion"
          description="Turn off animations and transitions."
          checked={Boolean(profile.visual?.reduceMotion)}
          onCheckedChange={(v) => updatePreferences({ visual: { reduceMotion: v } })}
        />
        <TederashCheckbox
          id={id("confirm-destructive")}
          label="Confirm before destructive actions"
          description="Ask before deleting, cancelling or other actions that can't be undone."
          checked={profile.interaction?.confirmationBeforeDestructiveActions !== false}
          onCheckedChange={(v) =>
            updatePreferences({ interaction: { confirmationBeforeDestructiveActions: v } })
          }
        />
      </fieldset>
    </div>
  );
}
