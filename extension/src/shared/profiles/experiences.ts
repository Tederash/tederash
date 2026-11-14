import type { ExperienceId, SettingsPatch } from '../settings/schema';

/**
 * Maps onboarding experience selections to a concrete profile patch
 * (deterministic; AGENTS.MD §2.2). Pure function — unit-testable.
 */
export function patchFromExperiences(experiences: readonly ExperienceId[]): SettingsPatch {
  const patch: SettingsPatch = { adaptation: {}, voice: {} };

  for (const experience of experiences) {
    switch (experience) {
      case 'read_see':
        patch.adaptation = {
          ...patch.adaptation,
          textScale: 1.15,
          focusHighlight: true,
        };
        break;
      case 'hands_free':
        patch.adaptation = { ...patch.adaptation, largeTargets: true, focusHighlight: true };
        patch.voice = { ...patch.voice, enabled: true, wakeMode: 'toggle' };
        break;
      case 'calm_clear':
        patch.adaptation = {
          ...patch.adaptation,
          reduceMotion: true,
          hideDistractions: true,
          paragraphFocus: true,
        };
        break;
      case 'reading_support':
        patch.adaptation = {
          ...patch.adaptation,
          fontFamily: 'dyslexic',
          lineHeight: 1.75,
          letterSpacingEm: 0.06,
          wordSpacingEm: 0.12,
        };
        break;
      case 'sound_aware':
        patch.voice = { ...patch.voice, feedbackMode: 'visual_only' };
        break;
      case 'guided_forms':
        // Form assistance arrives with the form engine; no adaptation defaults yet.
        break;
    }
  }

  if (Object.keys(patch.adaptation ?? {}).length === 0) delete patch.adaptation;
  if (Object.keys(patch.voice ?? {}).length === 0) delete patch.voice;
  return patch;
}

export const EXPERIENCE_OPTIONS = [
  { id: 'read_see', label: 'Seeing text more easily' },
  { id: 'hands_free', label: 'Using my voice instead of mouse or keyboard' },
  { id: 'sound_aware', label: 'Hearing alerts visually' },
  { id: 'calm_clear', label: 'Focus and plain-language understanding' },
  { id: 'reading_support', label: 'Reading with dyslexia support' },
  { id: 'guided_forms', label: 'Help filling in forms' },
] as const satisfies ReadonlyArray<{ id: ExperienceId; label: string }>;
