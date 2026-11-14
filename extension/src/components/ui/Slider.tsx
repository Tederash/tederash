import React from 'react';
import * as RadixSlider from '@radix-ui/react-slider';

export interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueText: string;
  onValueChange: (val: number) => void;
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  valueText,
  onValueChange,
}: SliderProps) {
  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex items-center justify-between text-sm">
        <label htmlFor={id} className="font-medium text-fg">
          {label}
        </label>
        <span className="text-fg-muted tabular-nums" aria-live="polite">
          {valueText}
        </span>
      </div>
      <RadixSlider.Root
        id={id}
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(vals) => {
          const next = vals[0];
          if (next !== undefined) onValueChange(next);
        }}
        className="relative flex h-11 w-full touch-none select-none items-center"
      >
        <RadixSlider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-surface-elevated border border-border">
          <RadixSlider.Range className="absolute h-full bg-accent" />
        </RadixSlider.Track>
        <RadixSlider.Thumb className="block h-6 w-6 rounded-full border-2 border-accent bg-surface shadow cursor-pointer" />
      </RadixSlider.Root>
    </div>
  );
}
