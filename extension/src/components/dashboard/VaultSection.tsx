import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import type { DashboardState } from '../../hooks/useDashboardState';

const FIELDS = [
  { key: 'fullName', label: 'Full name', autoComplete: 'name' },
  { key: 'email', label: 'Email address', autoComplete: 'email' },
  { key: 'phone', label: 'Phone number', autoComplete: 'tel' },
  { key: 'address', label: 'Address', autoComplete: 'street-address' },
] as const;

export function VaultSection({ dashboard }: { dashboard: DashboardState }) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft({ ...dashboard.vault });
  }, [dashboard.vault]);

  function save() {
    void dashboard.saveVault(draft);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-surface-elevated p-3 text-sm text-fg-muted">
        These values help Tederash fill forms for you. They are <strong>encrypted and stored only
        on this device</strong>, and the assistant never sends them to an AI service: it asks for
        them by name and the value is inserted here, on your machine. Once a value is typed into a
        page it becomes part of that page, like anything you type yourself. Encryption protects the
        saved values at rest, not against software that can already run inside this extension, so
        avoid storing passwords or card numbers here.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <label htmlFor={`vault-${field.key}`} className="text-sm font-medium">
              {field.label}
            </label>
            <input
              id={`vault-${field.key}`}
              type="text"
              autoComplete="off"
              value={draft[field.key] ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
              className="min-h-[2.75rem] rounded-md border border-border bg-surface px-3 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="primary" onClick={save}>
          Save vault
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            setDraft({});
            void dashboard.saveVault({});
          }}
        >
          Clear vault
        </Button>
      </div>
    </div>
  );
}
