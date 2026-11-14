import React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';

export interface SwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
}

export function Switch({
  id,
  label,
  checked,
  onCheckedChange,
  disabled = false,
  description,
}: SwitchProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-medium text-fg cursor-pointer">
          {label}
        </label>
        {description ? <span className="text-xs text-fg-muted">{description}</span> : null}
      </div>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative inline-flex h-7 w-12 min-h-[2.75rem] min-w-[3rem] shrink-0 cursor-pointer items-center rounded-full border border-border bg-surface-elevated p-1 transition-colors data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RadixSwitch.Thumb className="block h-5 w-5 rounded-full bg-fg transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-accent-fg" />
      </RadixSwitch.Root>
    </div>
  );
}
