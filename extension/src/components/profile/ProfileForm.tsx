import React, { useEffect, useMemo, useState } from 'react';
import {
  PROFILE_FIELDS,
  PROFILE_SECTIONS,
  profileFieldsInSection,
  type ProfileFieldDef,
} from '../../shared/profile';
import { Button } from '../ui/Button';

/**
 * The profile the assistant fills forms from.
 *
 * Everything except name, email and phone is optional, and the sections start
 * collapsed apart from the first two — thirty inputs at once is not an accessible
 * way to ask anyone for anything. Partial profiles are the normal case: blank
 * fields are simply fields the assistant will tell you it could not fill.
 */

export interface ProfileFormProps {
  values: Record<string, string>;
  onSave: (values: Record<string, string>) => void | Promise<void>;
  saving?: boolean;
  /** Shown on the first run, where skipping must be possible. */
  onSkip?: () => void;
  /** "Skip for now" on first run; "Close" when reopened from the header. */
  skipLabel?: string;
  /** Heading level to fit the surrounding page. */
  idPrefix?: string;
}

const OPEN_BY_DEFAULT = new Set(['identity', 'contact']);

function FieldInput({
  field,
  id,
  value,
  onChange,
}: {
  field: ProfileFieldDef;
  id: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const shared = {
    id,
    value,
    autoComplete: field.autoComplete ?? 'off',
    'aria-describedby': field.hint ? `${id}-hint` : undefined,
    className:
      'w-full px-3 py-2 rounded-md border border-border bg-surface text-fg text-sm focus:outline-none focus:ring-2 focus:ring-accent',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {field.label}
        {!field.recommended && <span className="ml-1.5 text-xs font-normal text-fg-muted">optional</span>}
      </label>
      {field.inputType === 'textarea' ? (
        <textarea rows={3} {...shared} className={`${shared.className} resize-y`} />
      ) : (
        <input type={field.inputType ?? 'text'} {...shared} />
      )}
      {field.hint && (
        <p id={`${id}-hint`} className="text-xs text-fg-muted">
          {field.hint}
        </p>
      )}
    </div>
  );
}

export function ProfileForm({
  values,
  onSave,
  saving = false,
  onSkip,
  skipLabel = 'Skip for now',
  idPrefix = 'profile',
}: ProfileFormProps) {
  const [draft, setDraft] = useState<Record<string, string>>(values);
  const [open, setOpen] = useState<Set<string>>(() => new Set(OPEN_BY_DEFAULT));

  useEffect(() => setDraft(values), [values]);

  const filledCount = useMemo(
    () => PROFILE_FIELDS.filter((f) => draft[f.key]?.trim()).length,
    [draft]
  );

  const set = (key: string, next: string) => setDraft((prev) => ({ ...prev, [key]: next }));
  const toggle = (section: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(draft);
      }}
    >
      <div className="rounded-md border border-border bg-surface-elevated p-3 text-sm text-fg-muted">
        These details are <strong>encrypted and stored only on this device</strong>, and the
        assistant never sends them to an AI service: it asks for them by name and the value is
        inserted here, on your machine. Fill in as much or as little as you like — anything you
        leave blank, the assistant will simply tell you it could not fill. Do not store passwords
        or card numbers.
      </div>

      {PROFILE_SECTIONS.map((section) => {
        const fields = profileFieldsInSection(section.id);
        const isOpen = open.has(section.id);
        const filledHere = fields.filter((f) => draft[f.key]?.trim()).length;
        const panelId = `${idPrefix}-${section.id}`;

        return (
          <section key={section.id} className="rounded-md border border-border">
            <h3>
              <button
                type="button"
                onClick={() => toggle(section.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-elevated rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-fg">{section.label}</span>
                  <span className="text-xs text-fg-muted">{section.description}</span>
                </span>
                <span className="text-xs text-fg-muted shrink-0">
                  {filledHere > 0 ? `${filledHere} of ${fields.length}` : `${fields.length} fields`}
                  <span aria-hidden="true" className="ml-2">
                    {isOpen ? '−' : '+'}
                  </span>
                </span>
              </button>
            </h3>
            {isOpen && (
              <div id={panelId} className="grid gap-3 sm:grid-cols-2 px-3 pb-3 pt-1">
                {fields.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    id={`${idPrefix}-${field.key}`}
                    value={draft[field.key] ?? ''}
                    onChange={(next) => set(field.key, next)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-fg-muted" role="status">
          {filledCount === 0
            ? 'Nothing saved yet.'
            : `${filledCount} of ${PROFILE_FIELDS.length} details saved.`}
        </p>
        <div className="flex gap-2">
          {onSkip && (
            <Button type="button" variant="ghost" size="compact" onClick={onSkip}>
              {skipLabel}
            </Button>
          )}
          <Button type="submit" variant="primary" size="compact" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  );
}
