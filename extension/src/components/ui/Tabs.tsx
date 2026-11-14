import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';

export const Tabs = RadixTabs.Root;
export const TabsList = React.forwardRef<
  React.ElementRef<typeof RadixTabs.List>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className = '', ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={`inline-flex flex-wrap gap-1 rounded-md border border-border bg-surface-elevated p-1 ${className}`}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className = '', ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={`min-h-[2.75rem] rounded-sm px-3 py-2 text-sm font-medium text-fg-muted data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-sm ${className}`}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = RadixTabs.Content;
