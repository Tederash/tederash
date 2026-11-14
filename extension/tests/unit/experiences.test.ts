import { describe, expect, it } from 'vitest';
import { patchFromExperiences } from '../../src/shared/profiles/experiences';

describe('patchFromExperiences', () => {
  it('returns an empty patch when no experiences are selected', () => {
    expect(patchFromExperiences([])).toEqual({});
  });

  it('maps read_see to text scale and focus highlight', () => {
    const patch = patchFromExperiences(['read_see']);
    expect(patch.adaptation).toMatchObject({ textScale: 1.15, focusHighlight: true });
  });

  it('maps reading_support to dyslexia typography', () => {
    const patch = patchFromExperiences(['reading_support']);
    expect(patch.adaptation).toMatchObject({
      fontFamily: 'dyslexic',
      lineHeight: 1.75,
      letterSpacingEm: 0.06,
      wordSpacingEm: 0.12,
    });
  });

  it('maps sound_aware to visual-only feedback', () => {
    const patch = patchFromExperiences(['sound_aware']);
    expect(patch.voice).toMatchObject({ feedbackMode: 'visual_only' });
    expect(patch.adaptation).toBeUndefined();
  });

  it('combines multiple experiences without dropping settings', () => {
    const patch = patchFromExperiences(['hands_free', 'calm_clear']);
    expect(patch.adaptation).toMatchObject({
      largeTargets: true,
      reduceMotion: true,
      hideDistractions: true,
    });
    expect(patch.voice).toMatchObject({ enabled: true });
  });
});
