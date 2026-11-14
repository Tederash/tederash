import React from 'react';
import * as RadixRadioGroup from '@radix-ui/react-radio-group';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export function RadioGroup({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (val: string) => void;
  options: RadioOption[];
}) {
  return (
    <RadixRadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={onValueChange}
      className="flex flex-col gap-2"
    >
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex min-h-[2.75rem] cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3 hover:bg-surface-elevated"
        >
          <RadixRadioGroup.Item
            value={opt.value}
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-accent"
          >
            <RadixRadioGroup.Indicator className="h-2.5 w-2.5 rounded-full bg-accent" />
          </RadixRadioGroup.Item>
          <span className="flex flex-col">
            <span className="text-sm font-medium text-fg">{opt.label}</span>
            {opt.description ? (
              <span className="text-xs text-fg-muted">{opt.description}</span>
            ) : null}
          </span>
        </label>
      ))}
    </RadixRadioGroup.Root>
  );
}
