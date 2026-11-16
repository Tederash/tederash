import React, { useState } from 'react';
import type { DashboardState } from '../../hooks/useDashboardState';
import { ProfileForm } from '../profile/ProfileForm';
import { Button } from '../ui/Button';

export function VaultSection({ dashboard }: { dashboard: DashboardState }) {
  const [saving, setSaving] = useState(false);

  const save = async (values: Record<string, string>) => {
    setSaving(true);
    try {
      await dashboard.saveVault(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ProfileForm
        idPrefix="vault"
        values={dashboard.vault}
        saving={saving}
        onSave={save}
      />

      <div>
        <Button variant="danger" onClick={() => void save({})}>
          Clear everything
        </Button>
      </div>
    </div>
  );
}
