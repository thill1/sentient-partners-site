import type { LiveServerMessage, Session } from '@google/genai';
import { base64ToPcm16, downsampleTo16k, floatToPcm16, pcm16ToBase64, pcm16ToFloat32 } from '../lib/pcm';

export type ToolUi =
  | { type: 'booked'; start: string; timeZone: string; label: string }
  | { type: 'note'; note: string };

/**
 * Real-time, two-way voice with Gemini Live. The visitor can talk over the
 * assistant, and the assistant stops when they do. The Google key stays on the
 * server: this file only ever holds a single-use token that expires with the
 * five-minute cap.
 */

const OUTPUT_SAMPLE_RATE = 24000;
/** Fixed playback level. */
const OUTPUT_GAIN = 0.9;
/** Buffer before the first chunk of each reply plays. */
const PLAYBACK_LEAD_SECONDS = 0.12;
/** Room echo keeps arriving briefly after playback stops. */
const ECHO_TAIL_SECONDS = 0.25;
/** Seamless reconnects allowed in one conversation (the token allows one more use). */
const MAX_RESUMES = 3;

/**
 * Where the next chunk should start. Chunks play back to back; only when the
 * queue has run dry (first chunk, or a network gap) do we wait a short lead
 * again, so one late packet does not turn into a run of tiny gaps.
 */
export const nextChunkStart = (queuedUntil: number, now: number, lead: number): number =>
  queuedUntil > now ? queuedUntil : now + lead;

export const rms = (samples: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return samples.length ? Math.sqrt(sum / samples.length) : 0;
};

/**
 * While the assistant is speaking, is this microphone frame the visitor talking
 * over it (pass it on) or the assistant's own voice leaking back (send silence)?
 */
export const isBargeIn = (micLevel: number, speakerLevel: number): boolean =>
  micLevel > Math.max(0.03, speakerLevel * 0.6);

export type LiveEndReason = 'user' | 'time' | 'error' | 'server';

export interface LiveVoiceEvents {
  /** Whole seconds left in this conversation, once a second. */
  onSecondsLeft?: (seconds: number) => void;
  /** True while the assistant's voice is playing. */
  onSpeaking?: (speaking: boolean) => void;
  /** A finished piece of what the visitor said. */
  onUserText?: (text: string) => void;
  /** A finished piece of what the assistant said. */
  onModelText?: (text: string) => void;
  /** The assistant asked to show the note form. */
  onNote?: (note: string) => void;
  /** The assistant booked the introductory call. */
  onBooked?: (info: { start: string; timeZone: string; label: string }) => void;
  onEnded?: (info: { reason: LiveEndReason; heardAssistant: boolean }) => void;
}

export interface LiveVoiceHandle {
  stop: (reason?: LiveEndReason) => void;
  /** Level meter for the on-screen visualizer: the microphone and the assistant's voice. */
  analyser: AnalyserNode;
}

export type LiveStartFailure = 'unavailable' | 'busy' | 'failed' | 'mic';

export class LiveStartError extends Error {
  constructor(
    public kind: LiveStartFailure,
    message: string,
  ) {
    super(message);
    this.name = 'LiveStartError';
  }
}

interface TokenResponse {
  token: string;
  model: string;
  apiVersion: string;
  config: Record<string, unknown>;
  maxSeconds: number;
}

type AudioContextCtor = typeof AudioContext;

const getAudioContextCtor = (): AudioContextCtor | null =>
  window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ?? null;

const visitorTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

async function fetchToken(): Promise<TokenResponse & { issuedAt: number }> {
  let response: Response;
  try {
    response = await fetch('/api/live-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeZone: visitorTimeZone() }),
    });
  } catch {
    throw new LiveStartError('failed', 'Could not reach the voice service.');
  }
  if (response.status === 501) throw new LiveStartError('unavailable', 'Live voice is not set up.');
  if (response.status === 429) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new LiveStartError('busy', body.error || 'Voice is busy right now. Please try again a little later.');
  }
  if (!response.ok) throw new LiveStartError('failed', 'Could not start live voice.');
  const body = (await response.json().catch(() => null)) as TokenResponse | null;
  if (!body?.token || !body.model || !body.config) throw new LiveStartError('failed', 'Could not start live voice.');
  return { ...body, issuedAt: Date.now() };
}

/**
 * Call this directly from the tap on the microphone button: the audio context
 * has to be created and resumed inside that gesture, or iPhones keep it silent.
 */
export async function startLiveVoice(events: LiveVoiceEvents = {}): Promise<LiveVoiceHandle> {
  const Ctor = getAudioContextCtor();
  if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
    throw new LiveStartError('unavailable', 'This browser cannot do live voice.');
  }

  const ctx = new Ctor();
  void ctx.resume().catch(() => undefined);

  let stream: MediaStream | null = null;
  let session: Session | null = null;
  let stopped = false;
  let heardAssistant = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let captureNode: AudioNode | null = null;
  const cleanups: Array<() => void> = [];

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;

  const abortStart = () => {
    stopped = true;
    stream?.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => undefined);
  };

  const micRequest = navigator.mediaDevices
    .getUserMedia({
      // Echo cancellation and noise suppression stay on. Automatic gain control is
      // off: it keeps re-levelling the microphone around the assistant's voice,
      // which pumps the level up and down and lets the echo through as "speech".
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    })
    .catch((error: unknown) => {
      const denied = error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');
      throw new LiveStartError('mic', denied ? 'Microphone permission denied.' : 'Could not use the microphone.');
    });
  const [tokenResult, micResult] = await Promise.allSettled([fetchToken(), micRequest]);
  // Whatever happened, never leave a granted microphone open after a failed start.
  if (micResult.status === 'fulfilled') stream = micResult.value;
  if (tokenResult.status === 'rejected' || micResult.status === 'rejected') {
    abortStart();
    throw micResult.status === 'rejected'
      ? micResult.reason
      : (tokenResult as PromiseRejectedResult).reason;
  }
  const tokenInfo = tokenResult.value;
  const micStream = micResult.value;

  // ---- Playing the assistant's voice -------------------------------------------------
  // One fixed gain and nothing that reacts to the signal. The old compressor
  // (-18 dB threshold, 0.25 s release) sat right in the voice's normal range, so
  // it kept pulling the level down on louder words and letting it swell back up
  // in between: the audible up-and-down. A brick-wall limiter only at -1 dBFS
  // remains as a clip guard; normal speech never reaches it.
  const outputGain = ctx.createGain();
  outputGain.gain.value = OUTPUT_GAIN;
  const leveller = ctx.createDynamicsCompressor();
  leveller.threshold.value = -1;
  leveller.knee.value = 0;
  leveller.ratio.value = 20;
  leveller.attack.value = 0.001;
  leveller.release.value = 0.05;
  outputGain.connect(leveller);
  leveller.connect(ctx.destination);
  leveller.connect(analyser);
  // Measures what the assistant is playing, for the echo gate below.
  const outputMeter = ctx.createAnalyser();
  outputMeter.fftSize = 1024;
  leveller.connect(outputMeter);
  const playing = new Set<AudioBufferSourceNode>();
  let lastPlaybackEnd = 0;
  let nextStart = 0;
  let speaking = false;
  const setSpeaking = (value: boolean) => {
    if (speaking === value) return;
    speaking = value;
    events.onSpeaking?.(value);
  };

  const playChunk = (base64: string) => {
    const samples = base64ToPcm16(base64);
    if (!samples.length) return;
    const buffer = ctx.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(pcm16ToFloat32(samples) as Float32Array<ArrayBuffer>, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(outputGain);
    // A small buffer at the start of each reply absorbs network jitter, so the
    // voice does not stutter or dip between chunks.
    nextStart = nextChunkStart(nextStart, ctx.currentTime, PLAYBACK_LEAD_SECONDS);
    source.start(nextStart);
    nextStart += buffer.duration;
    lastPlaybackEnd = nextStart;
    playing.add(source);
    setSpeaking(true);
    source.onended = () => {
      playing.delete(source);
      source.disconnect();
      if (playing.size === 0) setSpeaking(false);
    };
  };

  const silenceAssistant = () => {
    playing.forEach((source) => {
      source.onended = null;
      try {
        source.stop();
      } catch {
        void 0;
      }
    });
    playing.clear();
    nextStart = 0;
    setSpeaking(false);
  };

  // ---- Transcripts -------------------------------------------------------------------
  let userBuffer = '';
  let modelBuffer = '';
  const flushUser = () => {
    const text = userBuffer.trim();
    userBuffer = '';
    if (text) events.onUserText?.(text);
  };
  const flushModel = () => {
    const text = modelBuffer.trim();
    modelBuffer = '';
    if (text) events.onModelText?.(text);
  };

  // ---- Ending ------------------------------------------------------------------------
  const stop = (reason: LiveEndReason = 'user') => {
    if (stopped) return;
    stopped = true;
    if (timer) clearInterval(timer);
    flushUser();
    flushModel();
    silenceAssistant();
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        void 0;
      }
    });
    try {
      captureNode?.disconnect();
    } catch {
      void 0;
    }
    stream?.getTracks().forEach((t) => t.stop());
    try {
      session?.close();
    } catch {
      void 0;
    }
    void ctx.close().catch(() => undefined);
    events.onEnded?.({ reason, heardAssistant });
  };

  // ---- Actions the assistant asks for -------------------------------------------------
  // Booking and follow-up run on the server, which holds the calendar key.
  const runToolCalls = async (calls: NonNullable<LiveServerMessage['toolCall']>['functionCalls']) => {
    const responses = await Promise.all(
      (calls ?? []).map(async (call) => {
        let response: Record<string, unknown> = { ok: false, error: 'That did not work. Offer the booking link instead.' };
        try {
          const reply = await fetch('/api/assistant-tool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: call.name, args: call.args ?? {}, timeZone: visitorTimeZone() }),
          });
          const outcome = (await reply.json()) as { response?: Record<string, unknown>; ui?: ToolUi };
          if (outcome.response) response = outcome.response;
          if (!stopped && outcome.ui?.type === 'note') events.onNote?.(outcome.ui.note);
          if (!stopped && outcome.ui?.type === 'booked') events.onBooked?.(outcome.ui);
        } catch {
          void 0;
        }
        return { id: call.id, name: call.name, response };
      }),
    );
    if (stopped || !session) return;
    try {
      session.sendToolResponse({ functionResponses: responses });
    } catch {
      void 0;
    }
  };

  // ---- Messages from the assistant ---------------------------------------------------
  const handleMessage = (message: LiveServerMessage) => {
    if (stopped) return;
    const content = message.serverContent;
    if (content) {
      if (content.interrupted) {
        // The visitor spoke over the assistant: stop talking right away.
        silenceAssistant();
        flushModel();
      }
      if (content.inputTranscription?.text) userBuffer += content.inputTranscription.text;
      if (content.outputTranscription?.text) {
        flushUser();
        modelBuffer += content.outputTranscription.text;
      }
      for (const part of content.modelTurn?.parts ?? []) {
        if (part.inlineData?.data) {
          flushUser();
          heardAssistant = true;
          playChunk(part.inlineData.data);
        }
      }
      if (content.turnComplete) {
        flushUser();
        flushModel();
      }
    }

    const calls = message.toolCall?.functionCalls;
    if (calls?.length) void runToolCalls(calls);

    const update = message.sessionResumptionUpdate;
    if (update?.resumable && update.newHandle) resumeHandle = update.newHandle;

    // Google is about to recycle this connection: move to a fresh one now,
    // carrying the conversation over, while the current one still works.
    if (message.goAway) void resume();
  };

  // ---- Connect, and reconnect without the visitor noticing ----------------------------
  // Before, any close or goAway ended the conversation ("disconnected, tap again").
  // Now the session is resumed on a new socket with the last resumption handle;
  // audio already queued keeps playing and the microphone stays open.
  let resumeHandle: string | undefined;
  let resumes = 0;
  let reconnecting = false;
  let generation = 0;
  const { GoogleGenAI } = await import('@google/genai').catch(() => {
    abortStart();
    throw new LiveStartError('failed', 'Could not connect to live voice.');
  });
  const ai = new GoogleGenAI({ apiKey: tokenInfo.token, httpOptions: { apiVersion: tokenInfo.apiVersion } });

  const connect = async (): Promise<Session> => {
    const mine = ++generation;
    const isCurrent = () => mine === generation && !stopped;
    return ai.live.connect({
      model: tokenInfo.model,
      config: { ...tokenInfo.config, sessionResumption: resumeHandle ? { handle: resumeHandle } : {} },
      callbacks: {
        onmessage: (message) => {
          if (isCurrent()) handleMessage(message);
        },
        onerror: () => {
          if (isCurrent()) void resume();
        },
        onclose: () => {
          if (isCurrent()) void resume();
        },
      },
    });
  };

  const resume = async () => {
    if (stopped || reconnecting) return;
    if (!resumeHandle || resumes >= MAX_RESUMES) {
      stop('server');
      return;
    }
    reconnecting = true;
    resumes += 1;
    const old = session;
    generation += 1; // ignore anything more from the old socket
    try {
      old?.close();
    } catch {
      void 0;
    }
    try {
      const next = await connect();
      if (stopped) {
        next.close();
        return;
      }
      session = next;
    } catch {
      stop('server');
    } finally {
      reconnecting = false;
    }
  };

  try {
    session = await connect();
  } catch {
    abortStart();
    throw new LiveStartError('failed', 'Could not connect to live voice.');
  }
  if (stopped) {
    // The socket closed while we were still connecting.
    throw new LiveStartError('failed', 'Live voice disconnected.');
  }
  const first = session;

  // ---- Sending the visitor's voice ----------------------------------------------------
  // Echo gate: while the assistant is talking (and just after), the speaker can
  // leak back into the microphone. Browser echo cancellation does not always see
  // Web Audio output, so quiet frames are sent as silence; a visitor speaking up
  // is far louder than the leak and still interrupts.
  const meterBuffer = new Float32Array(outputMeter.fftSize);
  const outputLevel = () => {
    outputMeter.getFloatTimeDomainData(meterBuffer);
    return rms(meterBuffer);
  };
  const send = (frame: Float32Array) => {
    if (stopped) return;
    let floats = frame;
    if (playing.size > 0 || ctx.currentTime < lastPlaybackEnd + ECHO_TAIL_SECONDS) {
      if (!isBargeIn(rms(frame), outputLevel())) floats = new Float32Array(frame.length);
    }
    if (reconnecting || !session) return;
    const pcm = floatToPcm16(downsampleTo16k(floats, ctx.sampleRate));
    try {
      session.sendRealtimeInput({ audio: { data: pcm16ToBase64(pcm), mimeType: 'audio/pcm;rate=16000' } });
    } catch {
      void 0;
    }
  };

  const micSource = ctx.createMediaStreamSource(micStream);
  micSource.connect(analyser);
  cleanups.push(() => micSource.disconnect());
  const mute = ctx.createGain();
  mute.gain.value = 0;
  mute.connect(ctx.destination);
  cleanups.push(() => mute.disconnect());

  let workletReady = false;
  if (ctx.audioWorklet) {
    try {
      await ctx.audioWorklet.addModule('/live-capture-worklet.js');
      const node = new AudioWorkletNode(ctx, 'live-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
      node.port.onmessage = (event: MessageEvent<Float32Array>) => send(event.data);
      micSource.connect(node);
      node.connect(mute);
      captureNode = node;
      workletReady = true;
    } catch {
      workletReady = false;
    }
  }
  if (!workletReady) {
    // Older browsers: a script processor does the same job on the main thread.
    const processor = ctx.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = (event) => send(new Float32Array(event.inputBuffer.getChannelData(0)));
    micSource.connect(processor);
    processor.connect(mute);
    captureNode = processor;
  }

  // A short nudge so the assistant greets the visitor instead of waiting in silence.
  try {
    first.sendRealtimeInput({ text: 'The visitor just tapped the microphone. Greet them in one short sentence.' });
  } catch {
    void 0;
  }

  // ---- Keep the speaker running ------------------------------------------------------
  // iPhones suspend ("interrupt") the audio context on a call, a Siri prompt or an
  // audio route change; Chrome can suspend it when the tab is backgrounded. Wake it
  // straight back up instead of going silent.
  const wake = () => {
    if (stopped) return;
    if ((ctx.state as string) !== 'running' && (ctx.state as string) !== 'closed') void ctx.resume().catch(() => undefined);
  };
  ctx.addEventListener('statechange', wake);
  document.addEventListener('visibilitychange', wake);
  cleanups.push(() => {
    ctx.removeEventListener('statechange', wake);
    document.removeEventListener('visibilitychange', wake);
  });

  // ---- Time cap -----------------------------------------------------------------------
  // The clock runs from when the pass was issued, the same moment the server
  // starts its own expiry, so a slow microphone prompt cannot push the two apart.
  const limitMs = Math.max(30, tokenInfo.maxSeconds || 300) * 1000;
  const secondsLeft = () => Math.max(0, Math.ceil((limitMs - (Date.now() - tokenInfo.issuedAt)) / 1000));
  events.onSecondsLeft?.(secondsLeft());
  timer = setInterval(() => {
    const left = secondsLeft();
    events.onSecondsLeft?.(left);
    if (left <= 0) stop('time');
  }, 1000);

  return { stop, analyser };
}
