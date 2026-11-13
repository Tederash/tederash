"use client";

import * as React from "react";
import { AccessibleDialog, AccessibleButton } from "@tederash/components";
import { useAccessibility, PRESET_PROFILES } from "@tederash/react";

export function DialogDemo() {
  const { profile, setProfile } = useAccessibility();
  const [openStandard, setOpenStandard] = React.useState(false);
  const [openDestructive, setOpenDestructive] = React.useState(false);

  return (
    <div className="my-6 p-6 rounded-xl border border-border bg-card flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Interactive Specimen
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test focus trap, background scroll lock, Escape key dismiss, and alertdialog semantics.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Profile:</span>
          <select
            value={profile.id}
            onChange={(e) => {
              const selected = PRESET_PROFILES.find((p) => p.id === e.target.value);
              if (selected) setProfile(selected);
            }}
            className="px-2 py-1 rounded bg-background border border-border text-foreground font-medium text-xs"
          >
            {PRESET_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <AccessibleButton variant="primary" onClick={() => setOpenStandard(true)}>
          Open Standard Dialog
        </AccessibleButton>

        <AccessibleButton variant="destructive" onClick={() => setOpenDestructive(true)}>
          Open Destructive Alert Dialog
        </AccessibleButton>
      </div>

      {/* Standard Dialog */}
      <AccessibleDialog
        open={openStandard}
        onOpenChange={setOpenStandard}
        title="Workspace Accessibility Settings"
        description="Configure runtime preferences that apply to your entire development team."
      >
        <div className="flex flex-col gap-4 text-xs text-foreground">
          <p className="leading-relaxed">
            This dialog implements full focus trapping: pressing <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">Tab</kbd> cycles
            only within the dialog, and pressing <kbd className="px-1 py-0.5 rounded bg-muted border font-mono">Escape</kbd> restores focus back to the trigger button.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <AccessibleButton variant="outline" onClick={() => setOpenStandard(false)}>
              Cancel
            </AccessibleButton>
            <AccessibleButton variant="primary" onClick={() => setOpenStandard(false)}>
              Save changes
            </AccessibleButton>
          </div>
        </div>
      </AccessibleDialog>

      {/* Destructive Alert Dialog */}
      <AccessibleDialog
        open={openDestructive}
        onOpenChange={setOpenDestructive}
        role="alertdialog"
        destructive
        title="Confirm Project Deletion"
        description="This action cannot be undone. All project preferences and profile overrides will be permanently removed."
      >
        <div className="flex flex-col gap-4 text-xs text-foreground">
          <p className="leading-relaxed text-destructive font-medium">
            Warning: Screen readers announce this alert dialog with high priority. Focus is trapped immediately on confirmation controls.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <AccessibleButton variant="outline" onClick={() => setOpenDestructive(false)}>
              Keep project
            </AccessibleButton>
            <AccessibleButton variant="destructive" onClick={() => setOpenDestructive(false)}>
              Confirm deletion
            </AccessibleButton>
          </div>
        </div>
      </AccessibleDialog>

      <div className="pt-3 border-t border-border text-xs text-muted-foreground">
        <span>Accessibility: Implements WAI-ARIA 1.2 modal dialog pattern with automatic focus restoration.</span>
      </div>
    </div>
  );
}
