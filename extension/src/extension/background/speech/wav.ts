/**
 * The VAD hands us raw 16 kHz mono samples, so we package them ourselves rather
 * than relying on whatever container MediaRecorder picked. 16-bit PCM WAV is
 * accepted by every speech provider we use and needs no codec support.
 */

export const VAD_SAMPLE_RATE = 16_000;

export function encodeWav(samples: Float32Array, sampleRate = VAD_SAMPLE_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // format: PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]!));
    // Asymmetric, because signed 16-bit holds -32768..32767.
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function durationSeconds(samples: Float32Array, sampleRate = VAD_SAMPLE_RATE): number {
  return samples.length / sampleRate;
}
