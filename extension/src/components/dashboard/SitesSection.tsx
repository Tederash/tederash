import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import type { DashboardState } from '../../hooks/useDashboardState';

export function SitesSection({ dashboard }: { dashboard: DashboardState }) {
  const [newOrigin, setNewOrigin] = useState('');
  const [addError, setAddError] = useState('');
  const overrides = dashboard.state?.siteOverrides ?? {};
  const origins = Object.keys(overrides).sort();

  function normalizeOrigin(input: string): string | null {
    try {
      const url = new URL(input.trim().includes('://') ? input.trim() : `https://${input.trim()}`);
      return url.origin;
    } catch {
      return null;
    }
  }

  function addSite() {
    const origin = normalizeOrigin(newOrigin);
    if (!origin || !origin.startsWith('http')) {
      setAddError('Enter a valid website address, e.g. example.com');
      return;
    }
    setAddError('');
    setNewOrigin('');
    void dashboard.applyPatch({
      scope: 'site',
      origin,
      patch: { disabledOnSite: true },
      statusMessage: `Tederash will stay off on ${origin}.`,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">
        Any changes you make in the popup are saved per site here. “Reset” removes the override so
        the site follows your active profile again.
      </p>

      {origins.length === 0 ? (
        <div className="rounded-md border border-border bg-surface-elevated p-4 text-sm text-fg-muted">
          No site-specific settings yet. Adjust something in the popup while browsing, or add a
          site below.
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Sites with overrides</caption>
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-fg-muted">
              <th scope="col" className="py-2 pr-3">Site</th>
              <th scope="col" className="py-2 pr-3">Running here?</th>
              <th scope="col" className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {origins.map((origin) => {
              const disabled = overrides[origin]?.disabledOnSite === true;
              return (
                <tr key={origin} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium">{origin}</td>
                  <td className="py-2 pr-3">
                    <Switch
                      id={`site-${origin}`}
                      label={disabled ? 'Off' : 'On'}
                      checked={!disabled}
                      onCheckedChange={(checked) =>
                        void dashboard.applyPatch({
                          scope: 'site',
                          origin,
                          patch: { disabledOnSite: !checked },
                          statusMessage: checked
                            ? `Tederash is on for ${origin}.`
                            : `Tederash is off for ${origin}.`,
                        })
                      }
                    />
                  </td>
                  <td className="py-2">
                    <Button size="compact" variant="ghost" onClick={() => void dashboard.deleteSiteOverride(origin)}>
                      Reset to profile
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addSite();
        }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="new-site-origin" className="text-sm font-medium">
            Keep Tederash off a site
          </label>
          <input
            id="new-site-origin"
            type="text"
            inputMode="url"
            placeholder="example.com"
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            className="min-h-[2.75rem] rounded-md border border-border bg-surface px-3 text-sm"
          />
        </div>
        <Button variant="primary" type="submit">
          Add site
        </Button>
      </form>
      {addError ? (
        <p role="alert" className="text-sm text-danger">
          {addError}
        </p>
      ) : null}
    </div>
  );
}
