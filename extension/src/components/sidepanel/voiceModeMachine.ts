/**
 * The hands-free voice mode state machine.
 *
 * Pure and framework-free so its transitions — including barge-in and misfires —
 * are unit-testable with a scripted VAD. `useVoiceMode` owns the side effects
 * (the VAD itself, transcription, turns); this module decides what state the
 * panel is in after each event.
 *
 * One deliberate simplification from the drawn plan: "thinking" and "speaking"
 * are one state here. The panel cannot observe exactly when text-to-speech
 * finishes (it happens in the service worker), and the behaviour it drives is
 * the same either way: speech that starts during a turn is barge-in — captured,
 * transcribed, and then either answers the assistant's pending question or
 * replaces the turn.
 */

export type VoiceModeStatus =
  | 'off'
  | 'starting'
  | 'listening'
  | 'capturing'
  | 'transcribing'
  | 'busy';

export type VoiceModeEvent =
  | { type: 'toggle'; enabled?: boolean }
  | { type: 'engineStarted' }
  | { type: 'engineError'; message: string }
  | { type: 'speechStart' }
  | { type: 'speechEnd' }
  | { type: 'misfire' }
  | { type: 'transcribed'; ok: boolean; hasText?: boolean }
  | { type: 'listenPending'; pending: boolean }
  | { type: 'turnEnded' };

export interface VoiceModeState {
  status: VoiceModeStatus;
  /** The last engine error, cleared when the machine leaves that state. */
  error?: string;
  /**
   * Speech was captured while a turn was running: barge-in. The hook stops the
   * audio and either answers the pending question or replaces the turn.
   */
  bargeIn?: boolean;
  /** The assistant asked out loud; the next utterance is an answer, not a request. */
  answeringListen?: boolean;
}

export const initialVoiceModeState: VoiceModeState = { status: 'off' };

export function transition(state: VoiceModeState, event: VoiceModeEvent): VoiceModeState {
  const clearError = (): VoiceModeState => (state.error ? { ...state, error: undefined } : state);

  switch (event.type) {
    case 'toggle': {
      const enabled = event.enabled ?? state.status === 'off';
      if (!enabled) return { status: 'off' };
      return state.status === 'off' ? { status: 'starting' } : { ...state, error: undefined };
    }

    case 'engineStarted':
      // Toggling off while the engine was still starting must not resurrect the mic.
      return state.status === 'starting' ? { status: 'listening' } : state;

    case 'engineError':
      return { status: 'off', error: event.message };

    case 'speechStart':
      if (state.status === 'listening') return { ...clearError(), status: 'capturing' };
      if (state.status === 'busy') return { ...clearError(), status: 'capturing', bargeIn: true };
      // Already capturing (the user kept talking): no change.
      return state;

    case 'speechEnd':
      if (state.status !== 'capturing') return state;
      return { ...state, status: 'transcribing' };

    case 'misfire':
      // Not enough real speech: go back to waiting without wasting a request.
      if (state.status !== 'capturing') return state;
      return { ...state, status: state.bargeIn || state.answeringListen ? 'busy' : 'listening' };

    case 'transcribed': {
      if (state.status !== 'transcribing') return state;
      if (!event.ok || !event.hasText) {
        // Nothing usable was said: keep waiting, or keep the interrupted turn.
        return { ...state, status: state.bargeIn || state.answeringListen ? 'busy' : 'listening' };
      }
      // A usable utterance is dispatched (new turn, or an answer into the current
      // one); the turn-running state that follows ends with `turnEnded`.
      return { ...state, status: 'busy' };
    }

    case 'listenPending':
      // The assistant asked something out loud: the next utterance is an answer,
      // not a new request.
      if (state.status !== 'busy') return state;
      return { ...state, answeringListen: event.pending };

    case 'turnEnded':
      if (state.status === 'busy') return { ...state, status: 'listening', bargeIn: undefined };
      return state;

    default: {
      const exhaustive: never = event;
      void exhaustive;
      return state;
    }
  }
}
