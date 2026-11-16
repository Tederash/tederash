import React, { useState } from 'react';
import { createEnvelope } from '../../shared/envelope';
import type { AiConfig } from '../../shared/messages';
import { Button } from '../ui/Button';

/**
 * Model and voice settings.
 *
 * Owns its own form state: the panel does not need it, and the drawer only mounts
 * when open, so it reads the current config at mount. Saves are merged in the
 * background, so sending only these fields leaves the rest alone.
 */

const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_PAUSE_MS = 1400;

const FIELD_CLASS =
  'px-3 py-1.5 rounded-md border border-border bg-surface text-fg text-xs focus:outline-none focus:ring-1 focus:ring-accent';

export interface SettingsDrawerProps {
  config: AiConfig;
  onConfigChange: (next: AiConfig) => void;
  onClose: () => void;
  /** Whether the panel can hear anything at all, for the voice guidance text. */
  voiceSupported: boolean;
  /** 'upload' when speech is transcribed by a service, 'local' when in-browser. */
  voiceMode: 'upload' | 'local';
}

export function SettingsDrawer({
  config,
  onConfigChange,
  onClose,
  voiceSupported,
  voiceMode,
}: SettingsDrawerProps) {
  const [provider, setProvider] = useState<AiConfig['provider']>(config.provider);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(config.model || DEFAULT_MODEL);
  const [sttProvider, setSttProvider] = useState<AiConfig['sttProvider'] | ''>(
    config.sttProvider ?? ''
  );
  const [sttApiKey, setSttApiKey] = useState('');
  const [speechLanguage, setSpeechLanguage] = useState(config.speechLanguage || '');
  const [pauseMs, setPauseMs] = useState(config.speechPauseMs ?? DEFAULT_PAUSE_MS);

  const save = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const res = (await chrome.runtime.sendMessage(
          createEnvelope('ai/setConfig', {
            provider,
            // Empty means "keep the saved one": neither key is ever sent back here.
            apiKey: apiKey.trim() || undefined,
            model: model.trim() || undefined,
            sttProvider: sttProvider || undefined,
            sttApiKey: sttApiKey.trim() || undefined,
            speechLanguage: speechLanguage.trim() || undefined,
            speechPauseMs: pauseMs,
          })
        )) as { ok: boolean; config?: AiConfig };
        if (res?.ok && res.config) onConfigChange(res.config);
      }
    } finally {
      onClose();
    }
  };

  return (
    <section
      aria-label="Model and voice settings"
      className="p-4 border-b border-border bg-surface-elevated text-sm flex flex-col gap-3 shrink-0"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-xs text-fg">AI configuration</span>
        {config.apiKeySource === 'dev' && (
          <span className="text-[11px] text-success font-mono">.env key detected</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ai-provider" className="text-xs font-medium text-fg-muted">
          Provider
        </label>
        <select
          id="ai-provider"
          value={provider}
          onChange={(e) => {
            const next = e.target.value as AiConfig['provider'];
            setProvider(next);
            if (next === 'groq') setModel(DEFAULT_MODEL);
          }}
          className={FIELD_CLASS}
        >
          <option value="groq">Groq (gpt-oss-120b)</option>
          <option value="heuristic">Offline mode (no key needed)</option>
          <option value="gemini">Google Gemini (OpenAI-compatible)</option>
          <option value="openai">OpenAI (GPT-4o)</option>
          <option value="custom">Custom endpoint / local LLM</option>
        </select>
      </div>

      {provider !== 'heuristic' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ai-apikey" className="text-xs font-medium text-fg-muted">
              API key
            </label>
            <input
              id="ai-apikey"
              type="password"
              placeholder={
                config.apiKeySource === 'saved'
                  ? '•••••••• (saved — leave empty to keep)'
                  : config.apiKeySource === 'dev'
                    ? '•••••••• (dev key from .env)'
                    : provider === 'groq'
                      ? 'gsk_...'
                      : 'API key'
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ai-model" className="text-xs font-medium text-fg-muted">
              Model override (optional)
            </label>
            <input
              id="ai-model"
              type="text"
              placeholder={DEFAULT_MODEL}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-3">
        <span className="font-medium text-xs text-fg">Voice</span>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="stt-provider" className="text-xs font-medium text-fg-muted">
            Speech recognition
          </label>
          <select
            id="stt-provider"
            value={sttProvider}
            onChange={(e) => setSttProvider(e.target.value as AiConfig['sttProvider'] | '')}
            className={FIELD_CLASS}
          >
            <option value="">Automatic (best available key)</option>
            <option value="elevenlabs">ElevenLabs Scribe — most accurate</option>
            <option value="groq">Groq Whisper — free, English only</option>
          </select>
          <p className="text-[11px] text-fg-muted">
            Whisper cannot transcribe Amharic, Tigrinya or Afaan Oromoo usably, so those
            languages need a Scribe key. Without any key, speech is recognised in this
            browser and no audio leaves the device.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="stt-apikey" className="text-xs font-medium text-fg-muted">
            ElevenLabs key (optional)
          </label>
          <input
            id="stt-apikey"
            type="password"
            placeholder={
              config.hasSttApiKey ? '•••••••• (saved — leave empty to keep)' : 'For Scribe'
            }
            value={sttApiKey}
            onChange={(e) => setSttApiKey(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="speech-language" className="text-xs font-medium text-fg-muted">
            Voice language
          </label>
          <input
            id="speech-language"
            type="text"
            placeholder="Browser default (e.g. en-US, am-ET, om-ET)"
            value={speechLanguage}
            onChange={(e) => setSpeechLanguage(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="speech-pause" className="text-xs font-medium text-fg-muted">
            Pause before I answer: {(pauseMs / 1000).toFixed(1)}s
          </label>
          <input
            id="speech-pause"
            type="range"
            min={600}
            max={4000}
            step={200}
            value={pauseMs}
            onChange={(e) => setPauseMs(Number(e.target.value))}
            aria-describedby="speech-pause-hint"
          />
          <p id="speech-pause-hint" className="text-[11px] text-fg-muted">
            How long a silence ends your turn. Raise it if you are cut off mid-sentence.
          </p>
        </div>

        <p className="text-[11px] text-fg-muted">
          {!voiceSupported
            ? 'This browser has no microphone support available to the panel.'
            : voiceMode === 'upload'
              ? 'Spoken replies use the voices installed on this device, and stay silent for a language with no voice rather than reading it in the wrong one.'
              : 'Dictation runs in this browser, so no audio leaves the device. Add a key above for more accurate transcription.'}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button size="compact" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button size="compact" variant="primary" onClick={() => void save()}>
          Save
        </Button>
      </div>
    </section>
  );
}
