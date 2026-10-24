import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Mic,
  MicOff,
  ArrowRight,
  Maximize2,
  Minimize2,
  AlertCircle,
  X,
  MessageSquare,
  PhoneOff,
} from 'lucide-react';
import { Message } from '../types';
import {
  sendMessageToGemini,
  setAssistantUiHandler,
  sendTranscript,
  dispatchToast,
} from '../services/geminiService';
import { BRAND, CHAT_WIDGET_CONTENT } from '../content/siteContent';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { RichText } from './RichText';
import { toSpeakable } from '../lib/speakable';
import { CHAT_EVENT, openBookingModal, type CtaEventDetail } from '../lib/siteActions';
import { submitLead } from '../services/geminiService';
import { getVisitorMemory, isReturningVisitor } from '../lib/visitorMemory';
import { ConciergeLauncher } from './ConciergeLauncher';
import { NoteForTroy } from './NoteForTroy';
import { splitForSpeech } from '../lib/speechChunks';
import { startLiveVoice, LiveStartError, type LiveVoiceHandle } from '../services/liveVoice';

const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Wait this long after the visitor stops talking before answering (merges quick back-to-back finals). */
const VOICE_FINAL_DEBOUNCE_MS = 750;

const SUGGESTED_ACTIONS = CHAT_WIDGET_CONTENT.suggestedActions;

const BOOKING_INTENT = /\b(book|booking|schedule|appointment|call|meet|meeting|talk|chat with|consult|quote|estimate)\b/i;

/** After the first question: one tap to book, or hand the conversation to Troy. */
function ConciergeNextSteps({ messages, onBook }: { messages: Message[]; onBook: () => void }) {
  const [handoff, setHandoff] = useState<'closed' | 'open' | 'sending' | 'sent' | 'failed'>('closed');
  const [email, setEmail] = useState('');
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.text ?? '';
  const wantsCall = BOOKING_INTENT.test(lastUser);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return;
    setHandoff('sending');
    const transcript = messages
      .filter(m => !m.isTyping && m.text.trim())
      .map(m => `${m.role === 'user' ? 'Visitor' : 'Sentient AI'}: ${m.text}`)
      .join('\n\n');
    const result = await submitLead({
      name: email.trim(),
      email: email.trim(),
      inquiry: `Concierge conversation handed off by the visitor.\n\n${transcript}`.slice(0, 6000),
      intent: 'contact',
      source: 'Concierge handoff',
      ctaLabel: 'Send this conversation to Troy',
    }, '', { confirmVisitor: true });
    setHandoff(result.success ? 'sent' : 'failed');
  };
  return (
    <div className={`concierge-next${wantsCall ? ' is-highlighted' : ''}`} aria-label="Next steps">
      <button type="button" className="concierge-next-book" onClick={onBook}>
        Book a 20-minute intro call <ArrowRight size={14} aria-hidden="true" />
      </button>
      {handoff === 'sent' ? (
        <p className="concierge-next-note" role="status">Sent. Troy has your message and will reply by email to {email.trim()}.</p>
      ) : handoff === 'closed' ? (
        <button type="button" className="concierge-next-handoff" onClick={() => setHandoff('open')}>
          Send this conversation to Troy
        </button>
      ) : (
        <form className="concierge-next-form" onSubmit={send}>
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="Your email, so Troy can reply"
            aria-label="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button type="submit" disabled={handoff === 'sending'}>{handoff === 'sending' ? 'Sending…' : 'Send'}</button>
          {handoff === 'failed' && <p className="concierge-next-note" role="alert">That didn't send. Email hello@sentientpartners.ai.</p>}
        </form>
      )}
    </div>
  );
}

export const ChatInterface: React.FC<{ showLauncher?: boolean }> = ({ showLauncher = true }) => {
  const { settings: siteSettings } = useSiteSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'choice' | 'chat' | 'voice'>('choice');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const closeCurrent = useRef<() => void>(() => {});

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'model',
      text: CHAT_WIDGET_CONTENT.introMessage,
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const demoContextRef = useRef<string | null>(null);

  // Voice state
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Transcript capture
  const [transcriptHistory, setTranscriptHistory] = useState<
    { role: 'user' | 'model'; text: string }[]
  >([]);
  const [interimInput, setInterimInput] = useState('');
  const [isThinkingOrSpeaking, setIsThinkingOrSpeaking] = useState(false);
  // Set when the visitor asks to message Troy or set a time; shows the note form.
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  // Bumped per request so a new ask remounts the form with fresh text and state.
  const [noteRequestId, setNoteRequestId] = useState(0);
  const openNote = (text: string) => {
    setNoteDraft(text);
    setNoteRequestId((n) => n + 1);
  };
  // Set when the assistant books the introductory call.
  const [bookedLabel, setBookedLabel] = useState<string | null>(null);
  useEffect(() => {
    setAssistantUiHandler((ui) => {
      if (ui.type === 'note') openNote(ui.note);
      else setBookedLabel(ui.label);
    });
    return () => setAssistantUiHandler(null);
  }, []);
  const currentOutputTransRef = useRef('');

  // Real-time voice (Gemini Live). If it is unavailable the turn-based voice below takes over.
  const liveHandleRef = useRef<LiveVoiceHandle | null>(null);
  const realtimeUnavailableRef = useRef(false);
  const [liveSecondsLeft, setLiveSecondsLeft] = useState<number | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const voiceLogEndRef = useRef<HTMLDivElement | null>(null);

  // Voice engine refs (browser STT + server-backed TTS playback)
  const connectionActiveRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const isSpeakingOrFetchingRef = useRef<boolean>(false);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioResolveRef = useRef<(() => void) | null>(null);
  // Bumped whenever playback is stopped so a multi-part reply stops between parts.
  const playbackTokenRef = useRef<number>(0);
  const announcedListeningRef = useRef<boolean>(false);

  // Debounce buffer for STT finals (prevents multiple fast calls + random “server error”)
  const finalBufferRef = useRef<string>('');
  const finalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Visualizer
  const inputContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);

  const stopAudioPlayback = () => {
    playbackTokenRef.current += 1;
    if (activeAudioResolveRef.current) {
      try {
        activeAudioResolveRef.current();
      } catch {
        void 0;
      }
      activeAudioResolveRef.current = null;
    }
    try {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    } catch {
      void 0;
    }
    try {
      if (activeSourceNodeRef.current) {
        activeSourceNodeRef.current.stop();
        activeSourceNodeRef.current = null;
      }
    } catch {
      void 0;
    }
  };

  const fetchVoiceBytes = async (text: string) => {
    const response = await fetch('/api/voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId: siteSettings.ai.voiceId,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch voice: ${response.status}`);
    }
    return {
      bytes: await response.arrayBuffer(),
      contentType: response.headers.get('content-type') || 'audio/mpeg',
    };
  };

  const playVoiceBytes = async (bytes: ArrayBuffer, contentType: string) => {
    // Play through the AudioContext the mic tap already unlocked. iOS Safari
    // refuses audio.play() on an element created after an await (no user
    // gesture), which surfaced as "Voice playback failed." on iPhone.
    const ctx = inputContextRef.current;
    if (ctx) {
      try {
        if (ctx.state !== 'running') await ctx.resume();
        const buffer = await ctx.decodeAudioData(bytes.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        activeSourceNodeRef.current = source;
        await new Promise<void>((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            // Stop here too: an interrupt resolves through this function and
            // must silence the reply before the mic reopens.
            source.onended = null;
            try {
              source.stop();
            } catch {
              void 0;
            }
            if (activeSourceNodeRef.current === source) activeSourceNodeRef.current = null;
            activeAudioResolveRef.current = null;
            resolve();
          };
          activeAudioResolveRef.current = done;
          source.onended = done;
          source.start(0);
        });
        return;
      } catch (err) {
        console.warn('AudioContext playback failed, trying an audio element:', err);
      }
    }

    const blob = new Blob([bytes], { type: contentType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    return new Promise<void>((resolve, reject) => {
      let isSettled = false;

      const cleanupAndResolve = () => {
        if (isSettled) return;
        isSettled = true;
        try {
          audio.pause();
        } catch {
          void 0;
        }
        try {
          URL.revokeObjectURL(url);
        } catch {
          void 0;
        }
        activeAudioResolveRef.current = null;
        resolve();
      };

      activeAudioResolveRef.current = cleanupAndResolve;

      audio.onended = () => {
        if (isSettled) return;
        isSettled = true;
        try {
          URL.revokeObjectURL(url);
        } catch {
          void 0;
        }
        activeAudioResolveRef.current = null;
        resolve();
      };
      
      audio.onerror = (e) => {
        if (isSettled) return;
        isSettled = true;
        try {
          URL.revokeObjectURL(url);
        } catch {
          void 0;
        }
        activeAudioResolveRef.current = null;
        reject(e);
      };

      activeAudioRef.current = audio;

      audio.play().catch((err: unknown) => {
        if (isSettled) return;
        isSettled = true;
        try {
          URL.revokeObjectURL(url);
        } catch {
          void 0;
        }
        activeAudioResolveRef.current = null;
        reject(err);
      });
    });
  };

  // Speaks a reply in a few parts. All parts are requested at once; the first is
  // short, so audio starts as soon as it is ready instead of after the whole reply.
  const playVoiceResponse = async (text: string) => {
    const clean = String(text || '').trim();
    if (!clean || !siteSettings.ai.voiceEnabled) {
      return;
    }

    stopAudioPlayback();
    const token = playbackTokenRef.current;

    const spoken = toSpeakable(clean);
    if (!spoken) return;
    const pending = splitForSpeech(spoken).map((part) => fetchVoiceBytes(part));
    // A later part may fail after we stop early; don't leave that unhandled.
    pending.forEach((request) => request.catch(() => undefined));

    for (const request of pending) {
      const audio = await request;
      if (token !== playbackTokenRef.current) return; // interrupted or ended
      await playVoiceBytes(audio.bytes, audio.contentType);
      if (token !== playbackTokenRef.current) return;
    }
  };

  // --- Boot/open listeners ---
  useEffect(() => {
    const handleOpenEvent = (event: Event) => {
      const detail = (event as CustomEvent<CtaEventDetail>).detail;
      if (!detail?.context && isReturningVisitor()) {
        const remembered = getVisitorMemory().industryLabel;
        if (remembered && demoContextRef.current !== remembered) {
          demoContextRef.current = remembered;
          setMessages((prev) => [
            ...prev,
            {
              id: `ctx-${Date.now()}`,
              role: 'model',
              text: `Welcome back. Last time you were exploring how our AI front desk works for a ${remembered.toLowerCase()} — happy to pick that back up, or take any new question.`,
              timestamp: new Date(),
            },
          ]);
        }
      }
      if (detail?.context && demoContextRef.current !== detail.context) {
        demoContextRef.current = detail.context;
        const industry = detail.context.toLowerCase();
        setMessages((prev) => [
          ...prev,
          {
            id: `ctx-${Date.now()}`,
            role: 'model',
            text: `You just heard our AI handle an after-hours call for a ${industry}. Now it's your turn — ask me how that would work for your business: setup time, pricing, or how the agent learns your services and calendar.`,
            timestamp: new Date(),
          },
        ]);
      }
      if (detail?.context) setActiveTab('chat');
      if (detail?.prefill) {
        setActiveTab('chat');
        setInputValue(detail.prefill);
      }
      setIsOpen(true);
    };
    window.addEventListener(CHAT_EVENT, handleOpenEvent);

    if (window.location.protocol === 'file:') {
      setTimeout(() => {
        dispatchToast(
          'Running in local file mode. Email & Voice features require a local server.',
          'error',
        );
      }, 1500);
    }

    return () => window.removeEventListener(CHAT_EVENT, handleOpenEvent);
  }, []);

  // Scroll
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (isOpen && activeTab === 'chat') setTimeout(scrollToBottom, 100);
  }, [messages, activeTab, isLoading, isOpen]);

  // Stop voice when leaving voice tab / closing
  useEffect(() => {
    if (!isOpen || activeTab !== 'voice') {
      if (isLiveConnected || isVoiceLoading) stopLiveSession();
    }
  }, [activeTab, isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLiveSession();
  }, []);

  // --- Orb: a small level-driven glow in the voice header. Read-only: it never touches the audio. ---
  useEffect(() => {
    if (!isOpen || activeTab !== 'voice') return;
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    let animId = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = canvas.clientWidth || 44;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    let level = 0;
    let t = 0;
    const data = new Uint8Array(128);
    const render = () => {
      const g = canvas.getContext('2d');
      if (!g) return;
      let target = 0;
      if (analyzerRef.current && isLiveConnected) {
        analyzerRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < 48; i++) sum += data[i];
        target = Math.min(1, sum / 48 / 140);
      } else if (isVoiceLoading) {
        target = 0.25 + Math.sin(t * 4) * 0.15;
      }
      level += (target - level) * 0.18;
      t += 0.016;
      const c = canvas.width / 2;
      const base = c * 0.52;
      const r = base * (1 + level * 0.55);
      g.clearRect(0, 0, canvas.width, canvas.height);
      const halo = g.createRadialGradient(c, c, base * 0.4, c, c, c);
      halo.addColorStop(0, `rgba(200,183,149,${0.25 + level * 0.35})`);
      halo.addColorStop(1, 'rgba(200,183,149,0)');
      g.fillStyle = halo;
      g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
      const core = g.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.1, c, c, r);
      core.addColorStop(0, '#f1e6cf');
      core.addColorStop(1, '#c8b795');
      g.fillStyle = core;
      g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.fill();
      if ((isLiveConnected || isVoiceLoading) && !reduced.matches) animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [isLiveConnected, isVoiceLoading, activeTab, isOpen]);

  // Keep the newest words in view.
  useEffect(() => {
    voiceLogEndRef.current?.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [transcriptHistory, interimInput, activeTab]);

  // Fit the sheet to the visible area when the iPhone toolbar or keyboard moves.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!isOpen || !vv) return;
    const apply = () => document.documentElement.style.setProperty('--concierge-vvh', `${vv.height}px`);
    apply();
    vv.addEventListener('resize', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      document.documentElement.style.removeProperty('--concierge-vvh');
    };
  }, [isOpen]);

  // Dev-only mock state for layout screenshots: ?voiceDemo=pre|live. Stripped from production builds.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const demo = new URLSearchParams(window.location.search).get('voiceDemo');
    if (!demo) return;
    setIsOpen(true);
    setActiveTab('voice');
    if (demo === 'live') {
      setIsLiveConnected(true);
      setLiveSecondsLeft(252);
      setIsThinkingOrSpeaking(true);
      setTranscriptHistory([
        { role: 'model', text: 'Hi, I’m the Sentient assistant. What would you like to know?' },
        { role: 'user', text: 'What are your capabilities?' },
        { role: 'model', text: 'We help leadership teams turn strategy into working systems: AI agents for field and office operations, custom software, and the measurement to prove it pays off.' },
        { role: 'user', text: 'Could I book a call with Troy next week?' },
        { role: 'model', text: 'Of course. Which day works best for a 20-minute introductory call?' },
      ]);
    }
  }, []);

  // --- Transcript helpers ---
  const prepareTranscriptData = () => {
    const pendingUser = interimInput.trim();
    const pendingModel = currentOutputTransRef.current.trim();

    const chatLog =
      messages.length > 1
        ? messages.map((m) => `[${m.role.toUpperCase()}]: ${m.text}`).join('\n')
        : '';

    let voiceLog = transcriptHistory
      .map((t) => `[VOICE ${t.role.toUpperCase()}]: ${t.text}`)
      .join('\n');
    if (pendingUser) voiceLog += `\n[VOICE USER (Partial)]: ${pendingUser}`;
    if (pendingModel) voiceLog += `\n[VOICE MODEL (Partial)]: ${pendingModel}`;

    return { chatLog, voiceLog };
  };

  const handleClose = async () => {
    if (isSaving) return;

    const { chatLog, voiceLog } = prepareTranscriptData();
    const hasChat = messages.length > 1;
    const hasVoice = voiceLog.trim().length > 0;

    if (hasChat || hasVoice) {
      setIsSaving(true);
      dispatchToast('Archiving session...', 'info');
      sendTranscript(chatLog, voiceLog).catch(console.error);
      setIsSaving(false);
    }

    stopLiveSession();
    setIsOpen(false);
  };

  useEffect(() => { closeCurrent.current = () => { void handleClose(); }; });
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = document.getElementById('top');
    const previousInert = background?.inert ?? false;
    if (background) background.inert = true;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLButtonElement>('[data-dialog-close]')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeCurrent.current(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? []).filter(el => el.getClientRects().length > 0 && el.tabIndex >= 0);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (background) background.inert = previousInert;
      document.removeEventListener('keydown', keydown);
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // --- Chat ---
  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    setIsLoading(true);

    const responseId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: responseId, role: 'model', text: '', isTyping: true, timestamp: new Date() },
    ]);

    try {
      const contextNote = demoContextRef.current;
      const outboundText = contextNote
        ? `[Visitor context: they just watched the ${contextNote} AI front-desk demo on our website] ${userMsg.text}`
        : userMsg.text;
      demoContextRef.current = null;

      const stream = sendMessageToGemini(outboundText);
      let fullText = '';
      let hasReceivedText = false;

      for await (const chunk of stream) {
        hasReceivedText = true;
        fullText += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === responseId ? { ...msg, text: fullText.trim(), isTyping: false } : msg,
          ),
        );
      }

      if (!hasReceivedText) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === responseId
              ? { ...msg, text: 'I received your message.', isTyping: false }
              : msg,
          ),
        );
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === responseId ? { ...msg, text: 'Connection error.', isTyping: false } : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --- Voice (Cloudflare-safe): STT -> /api/gemini -> TTS ---
  const getSpeechRecognition = (): (new () => SpeechRecognition) | null => {
    const w = window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  };

  const askGeminiOnce = async (userText: string) => {
    let fullText = '';
    try {
      const stream = sendMessageToGemini(userText);
      for await (const chunk of stream) fullText += chunk;
    } catch {
      fullText = '';
    }
    return String(fullText || '').trim();
  };

  const acquireMicAndListen = async () => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      setVoiceError('Voice not supported in this browser. Use Chrome/Edge on desktop.');
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser does not support microphone input.');
      }

      // Force a mic permission request (if not already granted)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // AudioContext + analyser for visuals - reuse our warmed up context
      const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('Browser does not support AudioContext.');
      
      let ctx = inputContextRef.current;
      if (!ctx) {
        ctx = new AudioContextClass();
        inputContextRef.current = ctx;
      }
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      source.connect(analyzer);
      analyzer.connect(gain);
      gain.connect(ctx.destination);

      // Speech Recognition
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;

      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onstart = () => {
        if (!connectionActiveRef.current) return;
        setIsLiveConnected(true);
        setIsVoiceLoading(false);
        // The mic reopens after every reply; only announce it the first time.
        if (!announcedListeningRef.current) {
          announcedListeningRef.current = true;
          dispatchToast('Listening…', 'success');
        }
      };

      recognition.onerror = (e: Event & { error?: string }) => {
        const errType = String(e?.error || '');

        // Silently ignore 'no-speech' (triggered naturally by silence)
        // and 'aborted' (triggered when we programmatically pause to speak back)
        if (errType === 'no-speech' || errType === 'aborted') {
          return;
        }

        const msg =
          errType === 'not-allowed'
            ? 'Microphone permission denied.'
            : errType === 'service-not-allowed'
            ? 'Speech service not available in this browser.'
            : `Voice error: ${errType || 'unknown'}`;

        setVoiceError(msg);
        setIsVoiceLoading(false);
        setIsLiveConnected(false);
        connectionActiveRef.current = false;
      };

      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        if (!connectionActiveRef.current) return;
        if (isSpeakingOrFetchingRef.current) return;

        let finalText = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const t = res?.[0]?.transcript || '';
          if (res.isFinal) finalText += t;
          else interimText += t;
        }

        if (interimText.trim()) setInterimInput(interimText.trim());

        if (finalText.trim()) {
          setInterimInput('');

          // Debounce: buffer multiple finals into one request
          finalBufferRef.current = `${finalBufferRef.current} ${finalText}`.trim();

          if (finalTimerRef.current) clearTimeout(finalTimerRef.current);
          finalTimerRef.current = setTimeout(async () => {
            const combined = finalBufferRef.current.trim();
            finalBufferRef.current = '';
            finalTimerRef.current = null;
            if (combined) await respondToVoice(combined);
          }, VOICE_FINAL_DEBOUNCE_MS);
        }
      };

      recognition.onend = () => {
        if (connectionActiveRef.current && !isSpeakingOrFetchingRef.current) {
          try {
            recognition.start();
          } catch {
            // Some browsers require a fresh user gesture to restart
          }
        }
      };

      recognition.start();
    } catch (error: unknown) {
      console.error('Voice Connection Error:', error);

      const msg =
        (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'))
          ? 'Microphone permission denied.'
          : (error instanceof Error ? error.message : 'Connection failed.');

      setIsVoiceLoading(false);
      setIsLiveConnected(false);
      setVoiceError(msg);
      connectionActiveRef.current = false;

      try {
        micStreamRef.current?.getTracks?.().forEach((t) => t.stop());
      } catch {
        void 0;
      }
      micStreamRef.current = null;

      try {
        inputContextRef.current?.close?.();
      } catch {
        void 0;
      }
      inputContextRef.current = null;
    }
  };

  const respondToVoice = async (userText: string) => {
    const clean = String(userText || '').trim();
    if (!clean) return;

    // Ignore tiny/noise
    if (clean.length < 3) return;

    isSpeakingOrFetchingRef.current = true;
    setIsThinkingOrSpeaking(true);

    try {
      // Log user voice transcript
      setTranscriptHistory((prev) => [...prev, { role: 'user', text: clean }]);

      // 1. COMPLETELY release the microphone capture before playing the audio (crucial for iOS Safari speaker routing!)
      try {
        const rec = recognitionRef.current as unknown as { abort?: () => void };
        rec?.abort?.();
      } catch {
        void 0;
      }
      recognitionRef.current = null;

      try {
        micStreamRef.current?.getTracks?.().forEach((t) => t.stop());
      } catch {
        void 0;
      }
      micStreamRef.current = null;

      try {
        sourceNodeRef.current?.disconnect?.();
      } catch {
        void 0;
      }
      sourceNodeRef.current = null;

      try {
        analyzerRef.current?.disconnect?.();
      } catch {
        void 0;
      }
      analyzerRef.current = null;

      const reply = await askGeminiOnce(clean);

      const isErrorString =
        reply.toLowerCase().includes('rate limit exceeded') ||
        reply.toLowerCase().includes('api error') ||
        reply.toLowerCase().includes('connection problem') ||
        reply.toLowerCase().includes('server error') ||
        reply.toLowerCase().includes('redeploy');

      if (isErrorString) {
        setVoiceError(reply);
        stopLiveSession(true);
        return;
      }

      if (!reply) {
        setVoiceError('Voice server returned an empty response.');
        stopLiveSession(true);
        return;
      }

      // Save transcript
      setTranscriptHistory((prev) => [...prev, { role: 'model', text: reply }]);

      // Speak reply through the server-backed voice proxy
      try {
        await playVoiceResponse(reply);
      } catch {
        setVoiceError('Voice playback failed.');
        stopLiveSession(true);
      }
    } catch (err) {
      console.error('Voice response error:', err);
      setVoiceError('An error occurred during voice communication.');
      stopLiveSession(true);
    } finally {
      isSpeakingOrFetchingRef.current = false;
      setIsThinkingOrSpeaking(false);

      // 2. Re-acquire the microphone and restart listening if the session is still active
      if (connectionActiveRef.current) {
        await acquireMicAndListen();
      }
    }
  };

  const handleInterrupt = () => {
    stopAudioPlayback();
  };

  const startLiveSession = async () => {
    if (window.location.protocol === 'file:') {
      dispatchToast(
        'Microphone access blocked by browser on file:// protocol. Please use a local server.',
        'error',
      );
      return;
    }

    if (connectionActiveRef.current || isLiveConnected) return;

    // Real-time voice goes first. It starts here, inside the tap, so the browser lets it make sound.
    const realtime = realtimeUnavailableRef.current
      ? null
      : startLiveVoice({
          onSecondsLeft: setLiveSecondsLeft,
          onSpeaking: setIsThinkingOrSpeaking,
          onUserText: (text) => {
            setTranscriptHistory((prev) => [...prev, { role: 'user', text }]);
          },
          onModelText: (text) => {
            setTranscriptHistory((prev) => [...prev, { role: 'model', text }]);
          },
          onNote: openNote,
          onBooked: (info) => setBookedLabel(info.label),
          onEnded: ({ reason, heardAssistant }) => {
            liveHandleRef.current = null;
            analyzerRef.current = null;
            connectionActiveRef.current = false;
            setIsLiveConnected(false);
            setIsVoiceLoading(false);
            setIsThinkingOrSpeaking(false);
            setLiveSecondsLeft(null);
            if (reason === 'time') {
              setVoiceNotice('That’s the five-minute limit for one conversation. Tap the microphone to start another.');
            } else if (reason === 'error' || reason === 'server') {
              if (!heardAssistant) realtimeUnavailableRef.current = true;
              setVoiceError(
                heardAssistant
                  ? 'Live voice disconnected. Tap the microphone to start again.'
                  : 'Live voice could not start. Tap the microphone to try again.',
              );
            }
          },
        });
    realtime?.catch(() => undefined);

    // 1. Warm up / unlock browser Web Audio API context directly in this click gesture thread (BEFORE any awaits!)
    let ctxInstance = inputContextRef.current;
    try {
      const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        if (!ctxInstance) {
          ctxInstance = new AudioContextClass();
          inputContextRef.current = ctxInstance;
        }
        if (ctxInstance.state === 'suspended') {
          await ctxInstance.resume().catch(() => {});
        }
        // Force Safari hardware activation using a 10ms silent oscillator tone inside the click thread
        const osc = ctxInstance.createOscillator();
        const silenceGain = ctxInstance.createGain();
        silenceGain.gain.setValueAtTime(0.0001, ctxInstance.currentTime);
        osc.connect(silenceGain);
        silenceGain.connect(ctxInstance.destination);
        osc.start(0);
        osc.stop(ctxInstance.currentTime + 0.01);
      }
    } catch (e) {
      console.warn('Silent oscillator warm-up failed:', e);
    }

    connectionActiveRef.current = true;
    setIsVoiceLoading(true);
    setVoiceError(null);
    setVoiceNotice(null);

    if (realtime) {
      const releaseWarmUp = () => {
        try {
          inputContextRef.current?.close?.();
        } catch {
          void 0;
        }
        inputContextRef.current = null;
      };
      try {
        const handle = await realtime;
        if (!connectionActiveRef.current) {
          // The visitor closed the panel while it was connecting.
          handle.stop('user');
          return;
        }
        liveHandleRef.current = handle;
        analyzerRef.current = handle.analyser;
        setIsMuted(false);
        releaseWarmUp();
        setIsLiveConnected(true);
        setIsVoiceLoading(false);
        return;
      } catch (error) {
        if (error instanceof LiveStartError && (error.kind === 'busy' || error.kind === 'mic')) {
          // A limit or a denied microphone is shown as it is, not worked around.
          releaseWarmUp();
          connectionActiveRef.current = false;
          setIsVoiceLoading(false);
          setVoiceError(error.message);
          return;
        }
        if (error instanceof LiveStartError && error.kind === 'unavailable') realtimeUnavailableRef.current = true;
        // Anything else: carry on with the turn-based voice below.
      }
    }

    await acquireMicAndListen();
  };

  const stopLiveSession = (keepError = false) => {
    const liveHandle = liveHandleRef.current;
    if (liveHandle) {
      liveHandleRef.current = null;
      liveHandle.stop('user');
    }
    setLiveSecondsLeft(null);
    connectionActiveRef.current = false;
    announcedListeningRef.current = false;
    isSpeakingOrFetchingRef.current = false;
    setIsThinkingOrSpeaking(false);

    if (finalTimerRef.current) {
      clearTimeout(finalTimerRef.current);
      finalTimerRef.current = null;
    }
    finalBufferRef.current = '';

    try {
      recognitionRef.current?.stop?.();
    } catch {
      void 0;
    }
    recognitionRef.current = null;

    stopAudioPlayback();

    try {
      micStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {
      void 0;
    }
    micStreamRef.current = null;

    try {
      sourceNodeRef.current?.disconnect?.();
    } catch {
      void 0;
    }
    sourceNodeRef.current = null;

    try {
      analyzerRef.current?.disconnect?.();
    } catch {
      void 0;
    }
    analyzerRef.current = null;

    try {
      inputContextRef.current?.close?.();
    } catch {
      void 0;
    }
    inputContextRef.current = null;

    if (interimInput.trim()) {
      setTranscriptHistory((prev) => [
        ...prev,
        { role: 'user', text: interimInput.trim() },
      ]);
    }
    if (currentOutputTransRef.current.trim()) {
      setTranscriptHistory((prev) => [
        ...prev,
        { role: 'model', text: currentOutputTransRef.current.trim() },
      ]);
    }
    setInterimInput('');
    currentOutputTransRef.current = '';

    setIsLiveConnected(false);
    setIsVoiceLoading(false);
    if (!keepError) {
      setVoiceError(null);
      setVoiceNotice(null);
    }
  };

  const bookInstead = () => {
    setIsOpen(false);
    openBookingModal({ source: 'Concierge note', ctaLabel: 'Pick a time instead' });
  };

  // --- UI ---
  if (!isOpen) return showLauncher ? <ConciergeLauncher floating onClick={() => setIsOpen(true)} /> : null;

  return (
    <>
      <div className="concierge-backdrop" onClick={() => void handleClose()} aria-hidden="true" />
      <div ref={dialog} className={`concierge-panel${isFullScreen ? ' is-fullscreen' : ''}`} role="dialog" aria-modal="true" aria-labelledby="concierge-title">
        <header className="concierge-panel-header">
          <div><h2 id="concierge-title">Ask Sentient</h2><p>Sentient Partners · AI assistant</p></div>
          <div className="concierge-window-actions">
            <button type="button" onClick={() => setIsFullScreen(!isFullScreen)} aria-label={isFullScreen ? 'Restore conversation size' : 'Expand conversation'}>{isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
            <button type="button" data-dialog-close onClick={() => void handleClose()} disabled={isSaving} aria-label="Close conversation">{isSaving ? <Loader2 size={18} /> : <X size={20} />}</button>
          </div>
        </header>
        {activeTab === 'choice' ? (
          <div className="concierge-choice">
            <h3>How would you<br />like to talk?</h3>
            <button type="button" onClick={() => { setActiveTab('chat'); requestAnimationFrame(() => document.getElementById('concierge-tab-chat')?.focus()); }}><MessageSquare size={25} /><span><strong>Write a message</strong><small>Ask a question in your own words.</small></span><ArrowRight size={18} /></button>
            <button type="button" onClick={() => { setActiveTab('voice'); requestAnimationFrame(() => document.getElementById('concierge-tab-voice')?.focus()); }}><Mic size={25} /><span><strong>Start with voice</strong><small>Speak with the AI assistant.</small></span><ArrowRight size={18} /></button>
          </div>
        ) : (
          <>
            <div className="concierge-tabs" role="tablist" aria-label="Conversation mode">
              {(['chat', 'voice'] as const).map(tab => <button key={tab} type="button" role="tab" id={`concierge-tab-${tab}`} aria-selected={activeTab === tab} aria-controls="concierge-content" tabIndex={activeTab === tab ? 0 : -1} onClick={() => setActiveTab(tab)} onKeyDown={event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === 'Home' ? 'chat' : event.key === 'End' ? 'voice' : tab === 'chat' ? 'voice' : 'chat';
                setActiveTab(next);
                document.getElementById(`concierge-tab-${next}`)?.focus();
              }}>{tab === 'chat' ? <MessageSquare size={17} /> : <Mic size={17} />}{tab === 'chat' ? 'Chat' : 'Voice'}</button>)}
            </div>
            <div id="concierge-content" className={`concierge-content is-${activeTab}${noteDraft !== null ? ' has-note' : ''}`} role="tabpanel" aria-labelledby={`concierge-tab-${activeTab}`}>
              {activeTab === 'chat' ? <>
                <div className="concierge-messages" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
                  {messages.map(msg => <div key={msg.id} className={`concierge-message is-${msg.role}`}><span className="concierge-message-author">{msg.role === 'user' ? 'You' : 'Sentient AI'}</span><p><RichText text={msg.text} />{msg.isTyping && <span className="concierge-typing" aria-label="Responding">…</span>}</p></div>)}
                  {bookedLabel && <p className="concierge-disclosure" role="status">Booked: {bookedLabel}. A calendar invitation is on its way to your inbox.</p>}
                {noteDraft !== null && <NoteForTroy key={`note-chat-${noteRequestId}`} initialNote={noteDraft} source="Concierge chat note" onBook={bookInstead} onClose={() => setNoteDraft(null)} />}
                  <div ref={messagesEndRef} />
                </div>
                {messages.some(m => m.role === 'user') && <ConciergeNextSteps
                  messages={messages}
                  onBook={() => { setIsOpen(false); openBookingModal({ source: 'Concierge chat', ctaLabel: 'Book a 20-minute intro call' }); }}
                />}
                {/* Starters only until the visitor asks something; then the room goes to the conversation. */}
                {!messages.some(m => m.role === 'user') && <div className="concierge-suggestions" aria-label="Suggested questions">{SUGGESTED_ACTIONS.map(action => <button type="button" key={action.label} disabled={isLoading} onClick={() => void handleSend(action.prompt)}>{action.label}<ArrowRight size={14} /></button>)}</div>}
                <form className="concierge-composer" onSubmit={event => { event.preventDefault(); void handleSend(); }}>
                  <input aria-label="Your message" value={inputValue} onChange={event => setInputValue(event.target.value)} placeholder="Ask a question…" maxLength={1500} disabled={isLoading} />
                  <button type="submit" aria-label={isLoading ? 'Sending message' : 'Send message'} disabled={isLoading || !inputValue.trim()}>{isLoading ? <Loader2 className="concierge-loading" size={20} /> : <Send size={19} />}</button>
                </form>
                <p className="concierge-disclosure">You’re speaking with an AI assistant.</p>
              </> : <>
                {(() => {
                  const inSession = isLiveConnected || isVoiceLoading;
                  const hasTalk = transcriptHistory.length > 0 || !!interimInput;
                  const status = isVoiceLoading ? 'Connecting…' : isMuted && isLiveConnected ? 'Muted' : isThinkingOrSpeaking ? 'Speaking' : isLiveConnected ? 'Listening' : hasTalk ? 'Ended' : 'Ready';
                  const statusHint = isVoiceLoading ? CHAT_WIDGET_CONTENT.voiceLoadingLabel : isThinkingOrSpeaking ? 'Sentient is speaking. Talk any time to jump in.' : isLiveConnected ? (isMuted ? 'Your microphone is muted.' : 'Listening. Just talk.') : '';
                  return <div className={`cv${inSession ? ' is-live' : ''}${hasTalk ? ' has-talk' : ''}`}>
                    {!inSession && !hasTalk && <div className="cv-hero">
                      <h3>Talk it through.</h3>
                      <p>A real-time conversation with the Sentient AI assistant. Interrupt any time.</p>
                    </div>}
                    <div className="cv-bar">
                      <canvas ref={visualizerCanvasRef} className="cv-orb" aria-hidden="true" />
                      <span className={`cv-pill is-${status.toLowerCase().replace('…', '')}`}><span className="cv-dot" aria-hidden="true" />{status}</span>
                      <span className="cv-sr" role="status">{statusHint}</span>
                      {liveSecondsLeft !== null && !isVoiceLoading && <span className="cv-timer" aria-label={`${formatClock(liveSecondsLeft)} left`}>{formatClock(liveSecondsLeft)}</span>}
                    </div>
                    <div className="cv-log concierge-messages" role="log" aria-label="Voice transcript" aria-live="polite">
                      {!hasTalk && <p className="cv-empty">{inSession ? 'Say hello. Your words and the replies appear here.' : 'Your microphone starts only when you choose to begin.'}</p>}
                      {transcriptHistory.map((turn, index) => <div key={index} className={`concierge-message is-${turn.role === 'user' ? 'user' : 'model'}`}><span className="concierge-message-author">{turn.role === 'user' ? 'You' : 'Sentient AI'}</span><p><RichText text={turn.text} /></p></div>)}
                      {interimInput && <div className="concierge-message is-user is-interim"><span className="concierge-message-author">You</span><p>{interimInput}</p></div>}
                      {bookedLabel && <p className="concierge-disclosure" role="status">Booked: {bookedLabel}. A calendar invitation is on its way to your inbox.</p>}
                      {noteDraft !== null && <NoteForTroy key={`note-voice-${noteRequestId}`} initialNote={noteDraft} source="Concierge voice note" onBook={bookInstead} onClose={() => setNoteDraft(null)} />}
                      <div ref={voiceLogEndRef} />
                    </div>
                    {voiceNotice && <p className="concierge-disclosure" role="status">{voiceNotice}</p>}
                    {voiceError && <p className="concierge-error" role="alert"><AlertCircle size={16} />{voiceError}</p>}
                    {isThinkingOrSpeaking && !isVoiceLoading && liveSecondsLeft === null && <button type="button" className="concierge-interrupt" onClick={handleInterrupt}>Interrupt response</button>}
                    <div className="cv-controls">
                      {inSession ? <>
                        <button type="button" className={`cv-btn${isMuted ? ' is-on' : ''}`} aria-pressed={isMuted} disabled={!isLiveConnected || !liveHandleRef.current} onClick={() => { const next = !isMuted; liveHandleRef.current?.setMuted(next); setIsMuted(next); }}>{isMuted ? <MicOff size={20} /> : <Mic size={20} />}<span>{isMuted ? 'Unmute' : 'Mute'}</span></button>
                        <button type="button" className="cv-btn cv-end" onClick={() => stopLiveSession()} aria-label="End voice conversation"><PhoneOff size={22} /><span>End</span></button>
                        <button type="button" className="cv-btn" onClick={() => setActiveTab('chat')}><MessageSquare size={20} /><span>Chat</span></button>
                      </> : <>
                        <button type="button" className="cv-start" onClick={startLiveSession}><Mic size={20} />{hasTalk ? 'Talk again' : 'Start talking'}</button>
                        <button type="button" className="cv-btn" onClick={() => setActiveTab('chat')}><MessageSquare size={20} /><span>Chat</span></button>
                      </>}
                    </div>
                    <p className="cv-foot">
                      <button type="button" className="concierge-link" onClick={() => { setIsOpen(false); openBookingModal({ source: 'Concierge voice', ctaLabel: 'Book a 20-minute intro call' }); }}>Book a 20-minute introductory call</button>
                      <span aria-hidden="true"> · </span>
                      <a className="concierge-link" href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
                    </p>
                  </div>;
                })()}
              </>}
            </div>
          </>
        )}
      </div>
    </>
  );
};
