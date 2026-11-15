import Head from 'next/head';
import { useState } from 'react';

type Status = 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable';

/**
 * Microphone permission request, opened in a normal tab.
 *
 * Chrome anchors its microphone prompt to a tab, so a side panel cannot raise it:
 * asking from there fails without ever showing the dialog. Asking here grants the
 * permission to the whole extension origin, after which the panel and the offscreen
 * document can record without prompting again.
 */
export default function MicrophonePage() {
  const [status, setStatus] = useState<Status>('idle');

  const report = (granted: boolean) => {
    try {
      void chrome.runtime.sendMessage({ type: 'mic/permissionResult', granted });
    } catch {
      // The panel may have closed; the permission is still saved.
    }
  };

  const ask = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // The permission is what matters, not this stream: release the mic at once.
      stream.getTracks().forEach((track) => track.stop());
      setStatus('granted');
      report(true);
      setTimeout(() => window.close(), 1200);
    } catch {
      setStatus('denied');
      report(false);
    }
  };

  return (
    <>
      <Head>
        <title>Allow the microphone — Tederash</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main
        style={{
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '34rem',
          margin: '0 auto',
          padding: '3rem 1.5rem',
          lineHeight: 1.6,
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Allow the microphone</h1>
        <p style={{ color: '#555' }}>
          Tederash needs the microphone so you can talk to the assistant instead of typing.
          Chrome can only ask for this on a normal tab, which is why this page opened.
        </p>

        {status === 'granted' ? (
          <p role="status" style={{ color: '#13743b', fontWeight: 600 }}>
            Microphone allowed. You can close this tab and go back to the assistant.
          </p>
        ) : status === 'denied' ? (
          <div role="alert">
            <p style={{ color: '#9b1c1c', fontWeight: 600 }}>Microphone access was blocked.</p>
            <p style={{ color: '#555' }}>
              Open <code>chrome://settings/content/microphone</code>, remove Tederash from the
              blocked list, then come back to this page and try again.
            </p>
            <button type="button" onClick={() => void ask()} style={buttonStyle}>
              Try again
            </button>
          </div>
        ) : status === 'unavailable' ? (
          <p role="alert" style={{ color: '#9b1c1c' }}>
            This browser does not expose a microphone to extensions. You can still type to the
            assistant.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void ask()}
            disabled={status === 'asking'}
            style={buttonStyle}
          >
            {status === 'asking' ? 'Waiting for your answer…' : 'Allow microphone'}
          </button>
        )}

        <p style={{ color: '#777', fontSize: '0.85rem', marginTop: '2rem' }}>
          Recordings are only made while you are holding a conversation. With an API key
          configured, audio is sent to the speech service to be turned into text; without one,
          speech is recognised in this browser and no audio leaves your device.
        </p>
      </main>
    </>
  );
}

const buttonStyle: React.CSSProperties = {
  marginTop: '1.5rem',
  padding: '0.7rem 1.4rem',
  fontSize: '1rem',
  fontWeight: 600,
  borderRadius: '0.5rem',
  border: '1px solid #1b1b1b',
  background: '#1b1b1b',
  color: '#fff',
  cursor: 'pointer',
};
