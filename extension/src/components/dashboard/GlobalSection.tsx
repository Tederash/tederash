import React, { useState } from 'react';
import { RadioGroup } from '../ui/RadioGroup';
import type { DashboardState } from '../../hooks/useDashboardState';
import type { SettingsPatch } from '../../shared/settings/schema';

export function GlobalSection({ dashboard }: { dashboard: DashboardState }) {
  const ui = dashboard.state?.globalPatch?.ui ?? {};
  const [draft, setDraft] = useState<SettingsPatch['ui']>(ui);

  function update(next: SettingsPatch['ui'], message: string) {
    setDraft(next);
    void dashboard.applyPatch({
      scope: 'global',
      patch: { ui: next },
      statusMessage: message,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <RadioGroup
        label="Appearance of the extension itself"
        value={draft?.extensionTheme ?? 'system'}
        onValueChange={(val) =>
          update(
            { ...draft, extensionTheme: val as 'system' | 'light' | 'dark' | 'high-contrast' },
            'Theme updated.'
          )
        }
        options={[
          { value: 'system', label: 'Match my system' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'high-contrast', label: 'High contrast' },
        ]}
      />

      <RadioGroup
        label="On-page assistant button"
        value={draft?.showFloatingButton ? 'show' : 'hide'}
        onValueChange={(val) =>
          update(
            { ...draft, showFloatingButton: val === 'show' },
            val === 'show' ? 'Assistant button will show.' : 'Assistant button will stay hidden.'
          )
        }
        options={[
          { value: 'show', label: 'Show on pages' },
          { value: 'hide', label: 'Hide completely' },
        ]}
      />

      <p className="text-sm text-fg-muted">
        Language and AI defaults live in the Voice &amp; speech and AI &amp; privacy sections.
      </p>
    </div>
  );
}
