import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROFILE_FIELDS,
  PROFILE_KEYS,
  PROFILE_SECTIONS,
  isProfileKey,
  matchProfileField,
  profileFieldByKey,
  profileFieldsInSection,
} from '../../src/shared/profile';
import {
  SAVED_DETAIL_KEYS,
  classifySavedDetail,
  formatSavedDetails,
  substituteSavedDetails,
} from '../../src/extension/background/agent/saved-details';
import { storageService } from '../../src/extension/background/storage/service';
import { isEncryptedPayload } from '../../src/extension/background/storage/crypto';

const VAULT_KEY = 'tederash_vault_v1';

function installChromeStorage(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: store[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => Object.assign(store, items)),
      },
    },
  };
  return store;
}

describe('the profile definition', () => {
  it('has unique keys, and every field belongs to a real section', () => {
    expect(new Set(PROFILE_KEYS).size).toBe(PROFILE_KEYS.length);
    const sections = new Set(PROFILE_SECTIONS.map((s) => s.id));
    for (const field of PROFILE_FIELDS) {
      expect(sections.has(field.section)).toBe(true);
    }
  });

  it('every section has at least one field, so none renders empty', () => {
    for (const section of PROFILE_SECTIONS) {
      expect(profileFieldsInSection(section.id).length).toBeGreaterThan(0);
    }
  });

  it('asks for only a handful of things, leaving the rest optional', () => {
    const recommended = PROFILE_FIELDS.filter((f) => f.recommended).map((f) => f.key);
    expect(recommended).toEqual(['email', 'phone', 'fullName']);
    expect(PROFILE_FIELDS.length).toBeGreaterThan(20);
  });

  it('is the single source of truth the agent reads from', () => {
    expect(SAVED_DETAIL_KEYS).toBe(PROFILE_KEYS);
    expect(isProfileKey('workAuthorisation')).toBe(true);
    expect(isProfileKey('nothingLikeThis')).toBe(false);
    expect(profileFieldByKey('github')?.label).toBe('GitHub');
  });
});

describe('matching a page field to a profile detail', () => {
  const key = (label: string, kind?: string) => matchProfileField(label, kind)?.key;

  it('reads "Email Address" as an email, not an address', () => {
    expect(key('Email Address')).toBe('email');
    expect(key('E-mail')).toBe('email');
  });

  it('matches on field kind when the label is unhelpful', () => {
    expect(key('Contact', 'email')).toBe('email');
    expect(key('Contact', 'tel')).toBe('phone');
  });

  it('tells the address parts apart', () => {
    expect(key('Street address')).toBe('addressStreet');
    expect(key('City')).toBe('addressCity');
    expect(key('State / Province')).toBe('addressRegion');
    expect(key('ZIP code')).toBe('addressPostcode');
    expect(key('Country')).toBe('addressCountry');
  });

  it('handles the job-application fields', () => {
    expect(key('LinkedIn profile')).toBe('linkedin');
    expect(key('GitHub username')).toBe('github');
    expect(key('Years of experience')).toBe('yearsExperience');
    expect(key('Do you require visa sponsorship?')).toBe('workAuthorisation');
    expect(key('Salary expectation')).toBe('salaryExpectation');
    expect(key('Highest degree')).toBe('degree');
    expect(key('Accommodations you need')).toBe('accommodations');
  });

  it('separates first and last name, which is safe now the user types them', () => {
    expect(key('First name')).toBe('firstName');
    expect(key('Given name')).toBe('firstName');
    expect(key('Last name')).toBe('lastName');
    expect(key('Surname')).toBe('lastName');
    expect(key('Full legal name')).toBe('fullName');
    expect(key('Name')).toBe('fullName');
  });

  it('never writes the user’s own name into a field about something else', () => {
    expect(key('Username')).toBeUndefined();
    expect(key('Project name')).toBeUndefined();
    expect(key('Product name')).toBeUndefined();
  });

  it('leaves free text alone', () => {
    expect(key('Cover letter')).toBeUndefined();
    expect(key('Why do you want this role?')).toBeUndefined();
    expect(key('')).toBeUndefined();
  });
});

describe('the agent view of the profile', () => {
  it('offers names and labels, never values', () => {
    const summary = formatSavedDetails({
      fullName: 'Zenebech Tufa',
      workAuthorisation: 'Citizen',
      github: 'https://github.com/zen',
    });
    expect(summary).toContain('fullName (full name)');
    expect(summary).toContain('workAuthorisation (work authorisation)');
    expect(summary).not.toContain('Zenebech');
    expect(summary).not.toContain('Citizen');
    expect(summary).not.toContain('github.com/zen');
  });

  it('ignores stored keys that are not profile fields', () => {
    expect(formatSavedDetails({ somethingElse: 'x' })).toBeUndefined();
  });

  it('substitutes any profile key, not just the original four', () => {
    const out = substituteSavedDetails('{{saved:workAuthorisation}}', {
      workAuthorisation: 'Needs sponsorship',
    });
    expect(out).toEqual({ value: 'Needs sponsorship', usedSaved: true, unknown: [] });
  });

  it('classifySavedDetail stays in step with the definition', () => {
    expect(classifySavedDetail('Notice period')).toBe('noticePeriod');
    expect(classifySavedDetail('Pronouns')).toBe('pronouns');
  });
});

describe('storing a profile', () => {
  beforeEach(() => installChromeStorage());

  it('round-trips a partial profile, encrypted', async () => {
    const store = installChromeStorage();
    await storageService.setVault({
      fullName: 'Zenebech Tufa',
      email: 'zenebech@example.com',
      accommodations: 'Screen reader user; please send documents as plain text.',
    });

    expect(isEncryptedPayload(store[VAULT_KEY])).toBe(true);
    expect(JSON.stringify(store[VAULT_KEY])).not.toContain('Zenebech');
    expect(await storageService.getVault()).toEqual({
      fullName: 'Zenebech Tufa',
      email: 'zenebech@example.com',
      accommodations: 'Screen reader user; please send documents as plain text.',
    });
  });

  it('a mostly-empty profile is normal, not an error', async () => {
    await storageService.setVault({ email: 'zenebech@example.com', phone: '', github: '   ' });
    expect(await storageService.getVault()).toEqual({ email: 'zenebech@example.com' });
  });

  it('clearing really clears', async () => {
    await storageService.setVault({ fullName: 'Zenebech Tufa' });
    await storageService.setVault({});
    expect(await storageService.getVault()).toEqual({});
  });
});
