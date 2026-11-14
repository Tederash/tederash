import React from 'react';
import { Button } from '../ui/Button';

const COMMANDS = [
  { key: 'Alt+Shift+A', label: 'Toggle the on-page assistant' },
  { key: 'Alt+Shift+V', label: 'Start a voice command' },
  { key: 'Alt+Shift+R', label: 'Read the page aloud' },
  { key: 'Alt+Shift+S', label: 'Stop speaking or the running task' },
];

export function ShortcutsSection() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">
        Chrome owns the final shortcut assignments. If a key conflicts with another extension,
        change it on Chrome’s extension shortcuts page.
      </p>
      <ul className="flex flex-col gap-2">
        {COMMANDS.map((cmd) => (
          <li
            key={cmd.key}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-2"
          >
            <span className="text-sm">{cmd.label}</span>
            <kbd className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs font-semibold">
              {cmd.key}
            </kbd>
          </li>
        ))}
      </ul>
      <div>
        <Button
          onClick={() => {
            if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
              void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
            } else {
              window.alert('Open chrome://extensions/shortcuts in your browser.');
            }
          }}
        >
          Open Chrome shortcut settings
        </Button>
      </div>
      <p className="text-xs text-fg-muted">
        Note: command triggers (reading aloud, the assistant) activate fully as those features
        ship — see the roadmap in AGENTS.MD.
      </p>
    </div>
  );
}
