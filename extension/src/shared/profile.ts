/**
 * The user's personal profile: what they tell Tederash about themselves once, so the
 * assistant can fill forms without ever interrogating them.
 *
 * This list is the single source of truth for three things — the profile form, the
 * names offered to the model, and the label matching that recognises a page field as
 * one of these details. The values themselves live only in the encrypted vault and
 * are substituted on this device; the model sees names, never values.
 *
 * Only `recommended` fields are worth nudging about. Everything else is optional:
 * filling thirty boxes is nobody's idea of accessible.
 */

export type ProfileSection =
  | 'identity'
  | 'contact'
  | 'address'
  | 'links'
  | 'work'
  | 'education'
  | 'accessibility';

export interface ProfileFieldDef {
  key: string;
  label: string;
  section: ProfileSection;
  /** Worth filling in: everything else is explicitly optional. */
  recommended?: boolean;
  /** Browser autofill hint for the form input. */
  autoComplete?: string;
  inputType?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'textarea';
  /** Shown under the input when the purpose is not obvious from the label. */
  hint?: string;
  /**
   * Page-field labels that mean this detail. Checked in list order across all
   * fields, so put the more specific entries first ("email address" before "address").
   */
  match?: RegExp;
  /** Page field kinds that imply this detail regardless of its label. */
  matchKinds?: string[];
}

export const PROFILE_SECTIONS: Array<{ id: ProfileSection; label: string; description: string }> = [
  { id: 'identity', label: 'About you', description: 'Your name and basic details.' },
  { id: 'contact', label: 'Contact', description: 'How forms can reach you.' },
  { id: 'address', label: 'Address', description: 'Where you live.' },
  { id: 'links', label: 'Links', description: 'Profiles you are often asked for.' },
  { id: 'work', label: 'Work', description: 'For job and application forms.' },
  { id: 'education', label: 'Education', description: 'For job and application forms.' },
  {
    id: 'accessibility',
    label: 'Access needs',
    description: 'What you want forms to know about how you work best.',
  },
];

/**
 * Order matters for matching: the first field whose `match` hits wins, so
 * "Email Address" is read as an email rather than an address.
 */
export const PROFILE_FIELDS: ProfileFieldDef[] = [
  // Contact first, so email beats address and phone beats everything numeric.
  {
    key: 'email',
    label: 'Email address',
    section: 'contact',
    recommended: true,
    autoComplete: 'email',
    inputType: 'email',
    match: /\be-?mails?\b/,
    matchKinds: ['email'],
  },
  {
    key: 'phone',
    label: 'Phone number',
    section: 'contact',
    recommended: true,
    autoComplete: 'tel',
    inputType: 'tel',
    match: /\b(phone|telephone|mobile|cell)\b/,
    matchKinds: ['tel'],
  },

  // Identity
  {
    key: 'fullName',
    label: 'Full name',
    section: 'identity',
    recommended: true,
    autoComplete: 'name',
    hint: 'As it appears on official documents.',
    match: /^name\b|\b(full|legal|your)\s+name\b/,
  },
  { key: 'firstName', label: 'First name', section: 'identity', autoComplete: 'given-name', match: /\b(first|given)[\s-]*name\b/ },
  { key: 'lastName', label: 'Last name', section: 'identity', autoComplete: 'family-name', match: /\b(last|family|sur)[\s-]*name\b/ },
  { key: 'pronouns', label: 'Pronouns', section: 'identity', match: /\bpronouns?\b/ },
  { key: 'dateOfBirth', label: 'Date of birth', section: 'identity', autoComplete: 'bday', inputType: 'date', match: /\b(date of birth|birth\s*date|dob)\b/ },
  { key: 'nationality', label: 'Nationality', section: 'identity', match: /\b(nationality|citizenship)\b/ },

  // Address — the generic "address" match comes last of these so the specific parts win.
  { key: 'addressStreet', label: 'Street address', section: 'address', autoComplete: 'street-address', match: /\b(street|address line|home address|mailing address|postal address)\b/ },
  { key: 'addressCity', label: 'City', section: 'address', autoComplete: 'address-level2', match: /\b(city|town)\b/ },
  { key: 'addressRegion', label: 'Region or state', section: 'address', autoComplete: 'address-level1', match: /\b(state|province|region|county)\b/ },
  { key: 'addressPostcode', label: 'Postal code', section: 'address', autoComplete: 'postal-code', match: /\b(post(al)?\s*code|postcode|zip)\b/ },
  { key: 'addressCountry', label: 'Country', section: 'address', autoComplete: 'country-name', match: /\bcountry\b/ },

  // Links
  { key: 'linkedin', label: 'LinkedIn', section: 'links', inputType: 'url', match: /\blinked\s*in\b/ },
  { key: 'github', label: 'GitHub', section: 'links', inputType: 'url', match: /\bgit\s*hub\b/ },
  { key: 'portfolio', label: 'Portfolio or website', section: 'links', inputType: 'url', match: /\b(portfolio|personal (web)?site|website|home\s*page)\b/ },

  // Work
  { key: 'jobTitle', label: 'Current job title', section: 'work', autoComplete: 'organization-title', match: /\b(job title|current (job|role|title)|occupation|position)\b/ },
  { key: 'employer', label: 'Current employer', section: 'work', autoComplete: 'organization', match: /\b(employer|company|organisation|organization)\b/ },
  { key: 'yearsExperience', label: 'Years of experience', section: 'work', match: /\byears? of experience\b/ },
  { key: 'workAuthorisation', label: 'Work authorisation', section: 'work', hint: 'For example "citizen", "work permit", "needs sponsorship".', match: /\b(work (authori[sz]ation|permit|eligibility)|right to work|visa|sponsorship)\b/ },
  { key: 'noticePeriod', label: 'Notice period', section: 'work', match: /\b(notice period|availability|start date|available from)\b/ },
  { key: 'salaryExpectation', label: 'Salary expectation', section: 'work', match: /\b(salary|compensation|expected pay|rate)\b/ },

  // Education
  { key: 'degree', label: 'Highest degree', section: 'education', match: /\b(degree|qualification|education level)\b/ },
  { key: 'fieldOfStudy', label: 'Field of study', section: 'education', match: /\b(field of study|major|discipline|subject)\b/ },
  { key: 'school', label: 'School or university', section: 'education', match: /\b(school|university|college|institution)\b/ },
  { key: 'graduationYear', label: 'Graduation year', section: 'education', match: /\b(graduation|graduated)\b/ },

  // Accessibility
  {
    key: 'accommodations',
    label: 'Accommodations you need',
    section: 'accessibility',
    inputType: 'textarea',
    hint: 'Forms often ask this. Written once here, it can be filled for you.',
    match: /\b(accommodations?|adjustments?|accessibility needs?|disability)\b/,
  },
  { key: 'languages', label: 'Languages you speak', section: 'accessibility', match: /\blanguages?\b/ },
];

export const PROFILE_KEYS = PROFILE_FIELDS.map((f) => f.key);

export function profileFieldByKey(key: string): ProfileFieldDef | undefined {
  return PROFILE_FIELDS.find((f) => f.key === key);
}

export function isProfileKey(key: string): boolean {
  return PROFILE_FIELDS.some((f) => f.key === key);
}

export function profileFieldsInSection(section: ProfileSection): ProfileFieldDef[] {
  return PROFILE_FIELDS.filter((f) => f.section === section);
}

/**
 * Labels that look like a name field but are not the user's own name, so a saved
 * full name is never written into "Company name" or "Username".
 */
const NOT_A_PERSON_ENTITY =
  /\b(user|company|employer|organisation|organization|school|university|college|file|product|role|job|project|account|business|pet|brand|team|event|device)\b/;

/**
 * Which profile detail a page field is asking for, if any. Used both to fill from the
 * profile and to decide whether an answer is worth remembering.
 */
export function matchProfileField(label: string, kind?: string): ProfileFieldDef | undefined {
  const text = label.toLowerCase().trim();
  if (!text) return undefined;

  for (const field of PROFILE_FIELDS) {
    if (field.matchKinds?.includes(kind ?? '')) return field;
  }
  for (const field of PROFILE_FIELDS) {
    if (!field.match?.test(text)) continue;
    // "Company name" is a name, but not this user's.
    if (field.section === 'identity' && NOT_A_PERSON_ENTITY.test(text)) continue;
    return field;
  }
  return undefined;
}
