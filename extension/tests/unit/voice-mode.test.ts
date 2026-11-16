import { describe, expect, it } from 'vitest';
import {
  initialVoiceModeState,
  transition,
  type VoiceModeEvent,
  type VoiceModeState,
} from '../../src/components/sidepanel/voiceModeMachine';
import { getAgentTools } from '../../src/extension/background/agent/tools';

/**
 * The hands-free voice mode machine, driven with a scripted VAD: the exact
 * sequence a real session produces, including the barge-in case that used to
 * make voice mode useless for anyone who cannot see the panel.
 */

function drive(events: VoiceModeEvent[]): VoiceModeState {
  return events.reduce((state, event) => transition(state, event), initialVoiceModeState);
}

describe('voice mode state machine', () => {
  it('goes off → starting → listening when the engine starts', () => {
    expect(drive([{ type: 'toggle' }, { type: 'engineStarted' }]).status).toBe('listening');
  });

  it('an utterance flows capturing → transcribing → busy, then the mic is handed back', () => {
    const state = drive([
      { type: 'toggle' },
      { type: 'engineStarted' },
      { type: 'speechStart' },
      { type: 'speechEnd' },
      { type: 'transcribed', ok: true, hasText: true },
      { type: 'turnEnded' },
    ]);
    expect(state.status).toBe('listening');
  });

  it('a failed transcription keeps listening instead of dispatching nothing', () => {
    expect(
      drive([
        { type: 'toggle' },
        { type: 'engineStarted' },
        { type: 'speechStart' },
        { type: 'speechEnd' },
        { type: 'transcribed', ok: false },
      ]).status
    ).toBe('listening');
  });

  it('a misfire goes back to listening without wasting a request', () => {
    expect(
      drive([
        { type: 'toggle' },
        { type: 'engineStarted' },
        { type: 'speechStart' },
        { type: 'misfire' },
      ]).status
    ).toBe('listening');
  });

  it('barge-in: speech during a turn is captured and marked as barge-in', () => {
    const state = drive([
      { type: 'toggle' },
      { type: 'engineStarted' },
      { type: 'speechStart' },
      { type: 'speechEnd' },
      { type: 'transcribed', ok: true, hasText: true },
      // The assistant is answering aloud; the user talks over it.
      { type: 'speechStart' },
    ]);
    expect(state.status).toBe('capturing');
    expect(state.bargeIn).toBe(true);
    expect(state.error).toBeUndefined();
  });

  it('barge-in speech that transcribes keeps the turn running until it is replaced', () => {
    const state = drive([
      { type: 'toggle' },
      { type: 'engineStarted' },
      { type: 'transcribed', ok: true, hasText: true },
      { type: 'speechStart' },
      { type: 'speechEnd' },
      { type: 'transcribed', ok: true, hasText: true },
    ]);
    expect(state.status).toBe('busy');
  });

  it('barge-in that misfires returns to the turn instead of dropping it', () => {
    expect(
      drive([
        { type: 'toggle' },
        { type: 'engineStarted' },
        { type: 'speechStart' },
        { type: 'speechEnd' },
        { type: 'transcribed', ok: true, hasText: true },
        { type: 'speechStart' },
        { type: 'misfire' },
      ]).status
    ).toBe('busy');
  });

  it('every utterance is simply a new turn: the assistant never has a pending question', () => {
    const state = drive([
      { type: 'toggle' },
      { type: 'engineStarted' },
      { type: 'speechStart' },
      { type: 'speechEnd' },
      { type: 'transcribed', ok: true, hasText: true },
      { type: 'turnEnded' },
      { type: 'speechStart' },
      { type: 'speechEnd' },
      { type: 'transcribed', ok: true, hasText: true },
    ]);
    expect(state.status).toBe('busy');
    expect(state.bargeIn).toBeUndefined();
  });

  it('an unusable utterance outside a turn goes back to listening', () => {
    expect(
      drive([
        { type: 'toggle' },
        { type: 'engineStarted' },
        { type: 'speechStart' },
        { type: 'speechEnd' },
        { type: 'transcribed', ok: false },
      ]).status
    ).toBe('listening');
  });

  it('toggling off always wins, even while speech is being captured', () => {
    expect(
      drive([
        { type: 'toggle' },
        { type: 'engineStarted' },
        { type: 'speechStart' },
        { type: 'toggle' },
      ]).status
    ).toBe('off');
  });

  it('toggling off while the engine is starting does not resurrect the mic', () => {
    expect(
      drive([{ type: 'toggle' }, { type: 'toggle' }, { type: 'engineStarted' }]).status
    ).toBe('off');
  });

  it('an engine error leaves voice mode off and carries the message for the panel', () => {
    const state = drive([
      { type: 'toggle' },
      { type: 'engineError', message: 'Microphone access is blocked.' },
    ]);
    expect(state.status).toBe('off');
    expect(state.error).toBe('Microphone access is blocked.');
  });

  it('events are ignored in states they do not belong to', () => {
    expect(transition(initialVoiceModeState, { type: 'speechEnd' }).status).toBe('off');
    expect(transition(initialVoiceModeState, { type: 'turnEnded' }).status).toBe('off');
    expect(
      transition({ ...initialVoiceModeState, status: 'listening' }, { type: 'misfire' }).status
    ).toBe('listening');
  });
});

describe('voice-gated tool set', () => {
  it('offers say on a spoken turn, so the reply can be heard', () => {
    expect(Object.keys(getAgentTools({ voiceTurn: true }))).toContain('say');
  });

  it('hides it from a typed turn, where there is nobody listening', () => {
    const names = Object.keys(getAgentTools({ voiceTurn: false }));
    expect(names).not.toContain('say');
    // The page tools are untouched either way.
    expect(names).toContain('find');
    expect(names).toContain('fill');
  });
});
