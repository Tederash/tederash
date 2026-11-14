import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { RadioGroup } from '../ui/RadioGroup';
import { Switch } from '../ui/Switch';
import type { DashboardState } from '../../hooks/useDashboardState';
import type { SettingsPatch } from '../../shared/settings/schema';

export function PrivacySection({ dashboard }: { dashboard: DashboardState }) {
  const privacy = dashboard.state?.globalPatch?.privacy ?? {};
  const [draft, setDraft] = useState<SettingsPatch['privacy']>(privacy);
  const [newOrigin, setNewOrigin] = useState('');

  useEffect(() => {
    setDraft(dashboard.state?.globalPatch?.privacy ?? {});
  }, [dashboard.state?.globalPatch]);

  function save(message: string, next: SettingsPatch['privacy'] = draft) {
    setDraft(next);
    void dashboard.applyPatch({
      scope: 'global',
      patch: { privacy: next },
      statusMessage: message,
    });
  }

  const excluded = draft?.excludedOrigins ?? [];

  return (
    <div className="flex flex-col gap-5">
      <RadioGroup
        label="AI mode"
        value={draft?.aiMode ?? 'off'}
        onValueChange={(val) => {
          const next = { ...draft, aiMode: val as 'off' | 'on_device' | 'cloud' };
          save('AI mode updated.', next);
        }}
        options={[
          {
            value: 'off',
            label: 'Off',
            description: 'Everything works without AI. Nothing is ever sent anywhere.',
          },
          {
            value: 'on_device',
            label: 'On-device only',
            description: 'Uses built-in browser AI when available. Data stays on your device.',
          },
          {
            value: 'cloud',
            label: 'Cloud (bring your own key)',
            description: 'Page summaries and agent help run on a language model you configure.',
          },
        ]}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="privacy-provider" className="text-sm font-medium">
          Cloud provider
        </label>
        <select
          id="privacy-provider"
          value={draft?.provider ?? 'groq'}
          disabled={draft?.aiMode !== 'cloud'}
          onChange={(e) => {
            const next = {
              ...draft,
              provider: e.target.value as NonNullable<SettingsPatch['privacy']>['provider'],
            };
            save('Provider updated.', next);
          }}
          className="min-h-[2.75rem] rounded-md border border-border bg-surface px-3 text-sm disabled:opacity-50"
        >
          <option value="groq">Groq</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="proxy">Custom proxy</option>
          <option value="chrome-builtin">Chrome built-in AI</option>
        </select>
      </div>

      <Switch
        id="privacy-redact"
        label="Redact emails and phone numbers"
        description="Strip personal contact details before anything is sent to an AI service."
        checked={draft?.redactEmailsAndPhones ?? true}
        onCheckedChange={(checked) => {
          const next = { ...draft, redactEmailsAndPhones: checked };
          save(checked ? 'Redaction is on.' : 'Redaction is off.', next);
        }}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Sites where AI never runs</legend>
        <ul className="flex flex-col gap-1.5">
          {excluded.length === 0 ? (
            <li className="text-sm text-fg-muted">No excluded sites yet.</li>
          ) : (
            excluded.map((origin) => (
              <li
                key={origin}
                className="flex items-center justify-between gap-2 rounded border border-border px-3 py-1.5 text-sm"
              >
                <span>{origin}</span>
                <Button
                  size="compact"
                  variant="ghost"
                  aria-label={`Remove ${origin} from excluded sites`}
                  onClick={() => {
                    const next = {
                      ...draft,
                      excludedOrigins: excluded.filter((o) => o !== origin),
                    };
                    save(`AI is allowed again on ${origin}.`, next);
                  }}
                >
                  Remove
                </Button>
              </li>
            ))
          )}
        </ul>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const origin = new URL(
                newOrigin.includes('://') ? newOrigin : `https://${newOrigin}`
              ).origin;
              if (!excluded.includes(origin)) {
                const next = { ...draft, excludedOrigins: [...excluded, origin] };
                save(`AI will never run on ${origin}.`, next);
              }
              setNewOrigin('');
            } catch {
              dashboard.setStatus('Enter a valid address, e.g. bank.com');
            }
          }}
        >
          <input
            type="text"
            inputMode="url"
            placeholder="bank.com"
            aria-label="Add an AI-excluded site"
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            className="min-h-[2.75rem] rounded-md border border-border bg-surface px-3 text-sm"
          />
          <Button type="submit">Add excluded site</Button>
        </form>
      </fieldset>

      <div className="rounded-md border border-border bg-surface-elevated p-4 text-sm text-fg-muted">
        <h3 className="font-medium text-fg">Agent activity log</h3>
        <p className="mt-1">
          {draft?.aiMode === 'off'
            ? 'AI is off, so there is nothing to log. When AI is enabled, every request will be listed here with a delete button.'
            : 'Every AI request will be logged here, showing what kinds of data were sent. Logging ships with the agent feature.'}
        </p>
      </div>
    </div>
  );
}
