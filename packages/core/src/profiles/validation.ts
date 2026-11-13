import { AccessibilityProfile } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProfile(profile: unknown): ValidationResult {
  const errors: string[] = [];

  if (!profile || typeof profile !== "object") {
    return { valid: false, errors: ["Profile must be an object."] };
  }

  const p = profile as Partial<AccessibilityProfile>;

  if (!p.id || typeof p.id !== "string" || p.id.trim().length === 0) {
    errors.push("Profile 'id' must be a non-empty string.");
  }

  if (!p.name || typeof p.name !== "string" || p.name.trim().length === 0) {
    errors.push("Profile 'name' must be a non-empty string.");
  }

  if (p.locale !== undefined && (typeof p.locale !== "string" || p.locale.trim().length === 0)) {
    errors.push("'locale' must be a valid non-empty string tag.");
  }

  if (p.visual) {
    if (typeof p.visual !== "object") {
      errors.push("'visual' preferences must be an object.");
    } else {
      if (p.visual.fontScale !== undefined) {
        if (typeof p.visual.fontScale !== "number" || isNaN(p.visual.fontScale)) {
          errors.push("'visual.fontScale' must be a valid number.");
        } else if (p.visual.fontScale < 0.5 || p.visual.fontScale > 3.0) {
          errors.push("'visual.fontScale' must be between 0.5 and 3.0.");
        }
      }

      if (p.visual.colorScheme !== undefined) {
        const validColorSchemes = ["light", "dark", "system"];
        if (!validColorSchemes.includes(p.visual.colorScheme)) {
          errors.push(`'visual.colorScheme' must be one of: ${validColorSchemes.join(", ")}`);
        }
      }

      for (const key of ["highContrast", "reduceVisualClutter", "underlineLinks", "reduceMotion"] as const) {
        if (p.visual[key] !== undefined && typeof p.visual[key] !== "boolean") {
          errors.push(`'visual.${key}' must be a boolean.`);
        }
      }
    }
  }

  if (p.motor) {
    if (typeof p.motor !== "object") {
      errors.push("'motor' preferences must be an object.");
    } else {
      if (p.motor.targetSize !== undefined) {
        const validSizes = ["normal", "large", "extra-large"];
        if (!validSizes.includes(p.motor.targetSize)) {
          errors.push(`'motor.targetSize' must be one of: ${validSizes.join(", ")}`);
        }
      }

      for (const key of ["keyboardNavigation", "reducePrecisionRequired", "extendedHoverDelay"] as const) {
        if (p.motor[key] !== undefined && typeof p.motor[key] !== "boolean") {
          errors.push(`'motor.${key}' must be a boolean.`);
        }
      }
    }
  }

  if (p.cognitive) {
    if (typeof p.cognitive !== "object") {
      errors.push("'cognitive' preferences must be an object.");
    } else {
      for (const key of ["simplifiedLanguage", "guidedInteraction", "reduceDistractions", "showInstructions", "readingFocusGuide"] as const) {
        if (p.cognitive[key] !== undefined && typeof p.cognitive[key] !== "boolean") {
          errors.push(`'cognitive.${key}' must be a boolean.`);
        }
      }
    }
  }

  if (p.speech) {
    if (typeof p.speech !== "object") {
      errors.push("'speech' preferences must be an object.");
    } else {
      if (p.speech.speechRate !== undefined) {
        if (typeof p.speech.speechRate !== "number" || isNaN(p.speech.speechRate)) {
          errors.push("'speech.speechRate' must be a valid number.");
        } else if (p.speech.speechRate < 0.25 || p.speech.speechRate > 3.0) {
          errors.push("'speech.speechRate' must be between 0.25 and 3.0.");
        }
      }
      if (p.speech.language !== undefined && (typeof p.speech.language !== "string" || p.speech.language.trim().length === 0)) {
        errors.push("'speech.language' must be a valid non-empty string tag.");
      }
    }
  }

  if (p.interaction) {
    if (typeof p.interaction !== "object") {
      errors.push("'interaction' preferences must be an object.");
    } else {
      if (p.interaction.preferredInput !== undefined) {
        const validInputs = ["pointer", "keyboard", "voice"];
        if (!validInputs.includes(p.interaction.preferredInput)) {
          errors.push(`'interaction.preferredInput' must be one of: ${validInputs.join(", ")}`);
        }
      }
      if (p.interaction.confirmationBeforeDestructiveActions !== undefined && typeof p.interaction.confirmationBeforeDestructiveActions !== "boolean") {
        errors.push("'interaction.confirmationBeforeDestructiveActions' must be a boolean.");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function sanitizeProfile(profile: Partial<AccessibilityProfile>): AccessibilityProfile {
  const result: AccessibilityProfile = {
    id: profile.id || "custom",
    name: profile.name || "Custom Profile",
    description: profile.description,
    version: profile.version ?? 1,
    locale: profile.locale,
    visual: profile.visual ? { ...profile.visual } : undefined,
    motor: profile.motor ? { ...profile.motor } : undefined,
    cognitive: profile.cognitive ? { ...profile.cognitive } : undefined,
    auditory: profile.auditory ? { ...profile.auditory } : undefined,
    speech: profile.speech ? { ...profile.speech } : undefined,
    interaction: profile.interaction ? { ...profile.interaction } : undefined,
    custom: profile.custom ? { ...profile.custom } : undefined,
  };

  if (result.visual?.fontScale !== undefined) {
    result.visual.fontScale = Math.min(3.0, Math.max(0.5, result.visual.fontScale));
  }

  if (result.speech?.speechRate !== undefined) {
    result.speech.speechRate = Math.min(3.0, Math.max(0.25, result.speech.speechRate));
  }

  return result;
}
