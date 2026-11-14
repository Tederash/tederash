import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { RadioGroup } from '../ui/RadioGroup';
import { Slider } from '../ui/Slider';
import type { DashboardState } from '../../hooks/useDashboardState';
import type { SettingsPatch } from '../../shared/settings/schema';

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'am-ET', label: 'አማርኛ (Amharic)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'hi-IN', label: 'हिन्दी' },
  { value: 'ar-SA', label: 'العربية' },
];

const SAMPLE_TEXT =
  'Hello. This is Tederash, your web accessibility assistant. Reading works on any page.';

export function VoiceSection({ dashboard }: { dashboard: DashboardState }) {
  const voice = dashboard.state?.globalPatch?.voice ?? {};
  const [draft, setDraft] = useState<SettingsPatch['voice']>(voice);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setDraft(dashboard.state?.globalPatch?.voice ?? {});
  }, [dashboard.state?.globalPatch]);

  function save(message: string) {
    void dashboard.applyPatch({
      scope: 'global',
      patch: { voice: draft },
      statusMessage: message,
    });
  }

  async function handleTest() {
    setTesting(true);
    save('Voice test started.');
    await dashboard.testVoice(SAMPLE_TEXT);
    setTesting(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <Slider
        id="voice-rate"
        label="Speaking rate"
        min={0.5}
        max={2.5}
        step={0.05}
        value={draft?.ttsRate ?? 1.0}
        valueText={`${(draft?.ttsRate ?? 1.0).toFixed(2)}×`}
        onValueChange={(val) => setDraft((d) => ({ ...d, ttsRate: val }))}
      />
      <Slider
        id="voice-pitch"
        label="Voice pitch"
        min={0.5}
        max={2.0}
        step={0.05}
        value={draft?.ttsPitch ?? 1.0}
        valueText={(draft?.ttsPitch ?? 1.0).toFixed(2)}
        onValueChange={(val) => setDraft((d) => ({ ...d, ttsPitch: val }))}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="voice-language" className="text-sm font-medium">
          Language
        </label>
        <select
          id="voice-language"
          value={draft?.language ?? 'en-US'}
          onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))}
          className="min-h-[2.75rem] rounded-md border border-border bg-surface px-3 text-sm"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-fg-muted">
          Available voices depend on what is installed on your device.
        </p>
      </div>

      <RadioGroup
        label="Feedback style"
        value={draft?.feedbackMode ?? 'spoken_visual'}
        onValueChange={(val) =>
          setDraft((d) => ({ ...d, feedbackMode: val as 'spoken_visual' | 'visual_earcon' | 'visual_only' }))
        }
        options={[
          { value: 'spoken_visual', label: 'Spoken and visual', description: 'Hear and see feedback.' },
          { value: 'visual_earcon', label: 'Sounds and visual', description: 'Short tones plus on-screen messages.' },
          { value: 'visual_only', label: 'Visual only', description: 'Best if you use your own screen reader.' },
        ]}
      />

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button variant="primary" onClick={() => save('Voice settings saved.')}>
          Save voice settings
        </Button>
        <Button onClick={() => void handleTest()} disabled={testing}>
          Test voice
        </Button>
        <Button variant="ghost" onClick={() => void dashboard.stopSpeaking()}>
          Stop speaking
        </Button>
      </div>
    </div>
  );
}
