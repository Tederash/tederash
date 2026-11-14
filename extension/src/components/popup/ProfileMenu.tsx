import React, { useEffect, useRef, useState } from 'react';
import type { Profile } from '../../shared/settings/schema';

export function ProfileMenu({
  profiles,
  activeId,
  onChange,
}: {
  profiles: Profile[];
  activeId: string;
  onChange: (profileId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeProfile = profiles.find((p) => p.id === activeId);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function handleOptionKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next =
        event.key === 'ArrowDown'
          ? (index + 1) % profiles.length
          : (index - 1 + profiles.length) % profiles.length;
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
      buttons?.[next]?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const profile = profiles[index];
      if (profile) {
        onChange(profile.id);
        setOpen(false);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[2.75rem] items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-sm text-fg hover:bg-surface-elevated"
      >
        <span className="sr-only">Active profile: </span>
        <span className="max-w-[9rem] truncate font-medium">{activeProfile?.name ?? 'Profile'}</span>
        <span aria-hidden="true" className="text-fg-muted">
          ▾
        </span>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Choose active profile"
          className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-border bg-surface p-1 shadow-lg"
        >
          {profiles.map((profile, index) => (
            <li key={profile.id} role="none">
              <button
                type="button"
                role="option"
                aria-selected={profile.id === activeId}
                tabIndex={index === 0 ? 0 : -1}
                onClick={() => {
                  onChange(profile.id);
                  setOpen(false);
                }}
                onKeyDown={(e) => handleOptionKeyDown(e, index)}
                className="flex min-h-[2.75rem] w-full items-center justify-between gap-2 rounded-sm px-2.5 text-left text-sm hover:bg-surface-elevated data-[selected=true]:bg-surface-elevated"
                data-selected={profile.id === activeId}
              >
                <span className="truncate">{profile.name}</span>
                {profile.id === activeId ? (
                  <span aria-hidden="true" className="text-accent">
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
