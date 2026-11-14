import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { Switch } from '../ui/Switch';
import type { DashboardState } from '../../hooks/useDashboardState';
import type { Profile, SettingsPatch } from '../../shared/settings/schema';
import type { ThemeMode } from '../../shared/types';

const EXPERIENCE_LABELS: Record<string, string> = {
  read_see: 'Read & See',
  hands_free: 'Hands-free',
  calm_clear: 'Calm & Clear',
  reading_support: 'Reading Support',
  sound_aware: 'Sound Aware',
  guided_forms: 'Guided Forms',
};

export function ProfilesSection({ dashboard }: { dashboard: DashboardState }) {
  const [editingId, setEditingId] = useState<string>(dashboard.activeProfileId);
  const [draft, setDraft] = useState<SettingsPatch>({});

  useEffect(() => {
    const profile = dashboard.profiles.find((p) => p.id === editingId);
    setDraft(profile?.patch ?? {});
  }, [editingId, dashboard.profiles]);

  const editing = dashboard.profiles.find((p) => p.id === editingId);
  const a = draft.adaptation ?? {};

  function saveDraft() {
    if (!editing) return;
    void dashboard.applyPatch({
      scope: 'profile',
      profileId: editing.id,
      patch: draft,
      statusMessage: `Saved changes to “${editing.name}”.`,
    });
  }

  function duplicateProfile(profile: Profile) {
    void dashboard.createProfile({
      name: `${profile.name} (copy)`,
      experiences: profile.experiences,
      patch: profile.patch,
      activate: false,
      statusMessage: `Created “${profile.name} (copy)”.`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dashboard.profiles.map((profile) => {
          const isActive = profile.id === dashboard.activeProfileId;
          return (
            <article
              key={profile.id}
              aria-label={`Profile ${profile.name}`}
              className={`flex flex-col gap-2 rounded-lg border p-4 ${
                isActive ? 'border-accent bg-surface-elevated' : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{profile.name}</h3>
                {isActive ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-fg">
                    Active
                  </span>
                ) : null}
              </div>
              <ul className="flex flex-wrap gap-1" aria-label="Included experiences">
                {profile.experiences.length > 0 ? (
                  profile.experiences.map((exp) => (
                    <li
                      key={exp}
                      className="rounded border border-border px-1.5 py-0.5 text-xs text-fg-muted"
                    >
                      {EXPERIENCE_LABELS[exp] ?? exp}
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-fg-muted">No experiences selected</li>
                )}
              </ul>
              <div className="mt-auto flex gap-2 pt-2">
                {!isActive ? (
                  <Button size="compact" variant="primary" onClick={() => void dashboard.setActiveProfile(profile.id)}>
                    Activate
                  </Button>
                ) : null}
                <Button size="compact" onClick={() => setEditingId(profile.id)}>
                  Edit
                </Button>
                <Button size="compact" variant="ghost" onClick={() => duplicateProfile(profile)}>
                  Duplicate
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {editing ? (
        <section
          aria-label={`Editing ${editing.name}`}
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
        >
          <h3 className="text-lg font-semibold">Edit “{editing.name}”</h3>

          <Slider
            id="profile-text-scale"
            label="Text size"
            min={0.8}
            max={2.5}
            step={0.05}
            value={a.textScale ?? 1.0}
            valueText={`${Math.round((a.textScale ?? 1.0) * 100)}%`}
            onValueChange={(val) =>
              setDraft((d) => ({ ...d, adaptation: { ...d.adaptation, textScale: val } }))
            }
          />

          <Slider
            id="profile-line-height"
            label="Line height"
            min={1.0}
            max={2.5}
            step={0.05}
            value={a.lineHeight ?? 1.5}
            valueText={`${(a.lineHeight ?? 1.5).toFixed(2)}`}
            onValueChange={(val) =>
              setDraft((d) => ({ ...d, adaptation: { ...d.adaptation, lineHeight: val } }))
            }
          />

          <Slider
            id="profile-letter-spacing"
            label="Letter spacing"
            min={0}
            max={0.25}
            step={0.01}
            value={a.letterSpacingEm ?? 0}
            valueText={`${(a.letterSpacingEm ?? 0).toFixed(2)}em`}
            onValueChange={(val) =>
              setDraft((d) => ({ ...d, adaptation: { ...d.adaptation, letterSpacingEm: val } }))
            }
          />

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium">Contrast theme</legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(['default', 'light', 'dark', 'high-contrast'] as const).map((mode) => (
                <Button
                  key={mode}
                  size="compact"
                  variant={(a.contrastTheme ?? 'default') === mode ? 'primary' : 'secondary'}
                  aria-pressed={(a.contrastTheme ?? 'default') === mode}
                  onClick={() =>
                    setDraft((d) => ({ ...d, adaptation: { ...d.adaptation, contrastTheme: mode as ThemeMode } }))
                  }
                >
                  {mode === 'high-contrast' ? 'High' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1">
            <label htmlFor="profile-font" className="text-sm font-medium">
              Reading font
            </label>
            <select
              id="profile-font"
              value={a.fontFamily ?? 'site'}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  adaptation: {
                    ...d.adaptation,
                    fontFamily: e.target.value as 'site' | 'sans' | 'dyslexic',
                  },
                }))
              }
              className="min-h-[2.75rem] rounded-md border border-border bg-surface px-3 text-sm"
            >
              <option value="site">Keep the site’s own font</option>
              <option value="sans">Clean sans-serif</option>
              <option value="dyslexic">Dyslexia-friendly</option>
            </select>
          </div>

          <Switch
            id="profile-large-targets"
            label="Larger click targets"
            checked={a.largeTargets ?? false}
            onCheckedChange={(checked) =>
              setDraft((d) => ({ ...d, adaptation: { ...d.adaptation, largeTargets: checked } }))
            }
          />
          <Switch
            id="profile-ruler"
            label="Reading ruler"
            checked={a.readingRuler ?? false}
            onCheckedChange={(checked) =>
              setDraft((d) => ({ ...d, adaptation: { ...d.adaptation, readingRuler: checked } }))
            }
          />
          <Switch
            id="profile-focus"
            label="Focus highlight"
            checked={a.focusHighlight ?? true}
            onCheckedChange={(checked) =>
              setDraft((d) => ({ ...d, adaptation: { ...d.adaptation, focusHighlight: checked } }))
            }
          />

          <div className="flex gap-2 border-t border-border pt-3">
            <Button variant="primary" onClick={saveDraft}>
              Save changes
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(editing.patch);
                dashboard.setStatus('Edits discarded.');
              }}
            >
              Discard
            </Button>
          </div>
        </section>
      ) : null}

      <div>
        <Button
          onClick={() =>
            void dashboard.createProfile({
              name: `My profile ${dashboard.profiles.length + 1}`,
              experiences: [],
              patch: {},
              activate: false,
              statusMessage: 'New blank profile created. Activate and edit it below.',
            })
          }
        >
          + New blank profile
        </Button>
      </div>
    </div>
  );
}
