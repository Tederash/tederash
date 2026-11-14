import React, { useState } from 'react';
import { Button } from '../ui/Button';
import type { DashboardState } from '../../hooks/useDashboardState';

export function AboutSection({ dashboard }: { dashboard: DashboardState }) {
  const [copied, setCopied] = useState(false);

  async function copyDebugInfo() {
    const info = [
      `Tederash 0.1.0 (schema v1)`,
      `User agent: ${navigator.userAgent}`,
      `Language: ${navigator.language}`,
      `Onboarding completed: ${dashboard.onboardingCompleted}`,
      `Profiles: ${dashboard.profiles.length}`,
      `Site overrides: ${Object.keys(dashboard.state?.siteOverrides ?? {}).length}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(info);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      dashboard.setStatus('Copying failed. Your browser blocked clipboard access.');
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <dl className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        <dt className="font-medium">Version</dt>
        <dd>0.1.0</dd>
        <dt className="font-medium">Storage schema</dt>
        <dd>v1</dd>
        <dt className="font-medium">Product spec</dt>
        <dd>
          See <code>AGENTS.MD</code> in the repository — the single source of truth for product
          design and architecture.
        </dd>
      </dl>
      <div>
        <Button onClick={() => void copyDebugInfo()}>
          {copied ? 'Copied!' : 'Copy debug info'}
        </Button>
      </div>
      <p className="text-xs text-fg-muted">
        Debug info contains only version data and counts — never page content, vault values, or
        keys.
      </p>
    </div>
  );
}
