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
} from 'lucide-react';
import { Message } from '../types';
import {
  sendMessageToGemini,
  sendTranscript,
  dispatchToast,
} from '../services/geminiService';
import { CHAT_WIDGET_CONTENT } from '../content/siteContent';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { CHAT_EVENT, type CtaEventDetail } from '../lib/siteActions';
import { getVisitorMemory, isReturningVisitor } from '../lib/visitorMemory';
import { ConciergeLauncher } from './ConciergeLauncher';

const SUGGESTED_ACTIONS = CHAT_WIDGET_CONTENT.suggestedActions;

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
  const currentOutputTransRef = useRef('');

  // Voice engine refs (browser STT + server-backed TTS playback)
  const connectionActiveRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const isSpeakingOrFetchingRef = useRef<boolean>(false);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioResolveRef = useRef<(() => void) | null>(null);

  // Debounce buffer for STT finals (prevents multiple fast calls + random “server error”)
  const finalBufferRef = useRef<string>('');
  const finalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Visualizer
  const inputContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);

  const stopAudioPlayback = () => {
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

  const playVoiceResponse = async (text: string) => {
    const clean = String(text || '').trim();
    if (!clean || !siteSettings.ai.voiceEnabled) {
      return;
    }

    stopAudioPlayback();

    const response = await fetch('/api/voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: clean,
        voiceId: siteSettings.ai.voiceId,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch voice: ${response.status}`);
    }

    const blob = await response.blob();
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

  // --- Visualizer (mic-based) ---
  useEffect(() => {
    if (!isOpen || activeTab !== 'voice') return;

    let animId: number;
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
      }
    });

    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    const bars = 64;
    const radiusBase = 62;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let rotation = 0;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dataArray = new Uint8Array(bars);

      if (analyzerRef.current && isLiveConnected) {
        const bufferLength = analyzerRef.current.frequencyBinCount;
        const fullData = new Uint8Array(bufferLength);
        analyzerRef.current.getByteFrequencyData(fullData);

        const step = Math.max(1, Math.floor(bufferLength / bars));
        for (let i = 0; i < bars; i++) dataArray[i] = fullData[i * step] || 0;
      }

      if (!reduced.matches) rotation += 0.005;

      for (let i = 0; i < bars; i++) {
        let barHeight = isLiveConnected
          ? Math.max(4, dataArray[i] * 0.07)
          : 4 + Math.sin(i * 0.5 + rotation * 5) * 5;

        if (isVoiceLoading) {
          if (!reduced.matches) rotation += 0.02;
          barHeight = 15 + Math.sin(i * 0.5 + rotation * 15) * 10;
        }

        const rad = (i / bars) * Math.PI * 2 + rotation;
        const x1 = centerX + Math.cos(rad) * radiusBase;
        const y1 = centerY + Math.sin(rad) * radiusBase;
        const x2 = centerX + Math.cos(rad) * (radiusBase + barHeight);
        const y2 = centerY + Math.sin(rad) * (radiusBase + barHeight);

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, '#c8b795');
        gradient.addColorStop(1, '#aab7bf');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      if ((isLiveConnected || isVoiceLoading) && !reduced.matches) animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [isLiveConnected, isVoiceLoading, activeTab, isOpen]);

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
        dispatchToast('Listening…', 'success');
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
          }, 1300);
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

      // Ask Gemini (retry once if first attempt returns error copy)
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

    await acquireMicAndListen();
  };

  const stopLiveSession = (keepError = false) => {
    connectionActiveRef.current = false;
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
    }
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
            <div id="concierge-content" className={`concierge-content is-${activeTab}`} role="tabpanel" aria-labelledby={`concierge-tab-${activeTab}`}>
              {activeTab === 'chat' ? <>
                <div className="concierge-messages" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
                  {messages.map(msg => <div key={msg.id} className={`concierge-message is-${msg.role}`}><span className="concierge-message-author">{msg.role === 'user' ? 'You' : 'Sentient AI'}</span><p>{msg.text}{msg.isTyping && <span className="concierge-typing" aria-label="Responding">…</span>}</p></div>)}
                  <div ref={messagesEndRef} />
                </div>
                <div className="concierge-suggestions" aria-label="Suggested questions">{SUGGESTED_ACTIONS.map(action => <button type="button" key={action.label} disabled={isLoading} onClick={() => void handleSend(action.prompt)}>{action.label}<ArrowRight size={14} /></button>)}</div>
                <form className="concierge-composer" onSubmit={event => { event.preventDefault(); void handleSend(); }}>
                  <input aria-label="Your message" value={inputValue} onChange={event => setInputValue(event.target.value)} placeholder="Ask a question…" disabled={isLoading} />
                  <button type="submit" aria-label={isLoading ? 'Sending message' : 'Send message'} disabled={isLoading || !inputValue.trim()}>{isLoading ? <Loader2 className="concierge-loading" size={20} /> : <Send size={19} />}</button>
                </form>
                <p className="concierge-disclosure">You’re speaking with an AI assistant.</p>
              </> : <>
                <div className="concierge-voice-intro"><h3>A conversation,<br />at your pace.</h3><p>Speak with the Sentient AI assistant<br />about your business.</p></div>
                <div className={`concierge-voice-control${isLiveConnected || isVoiceLoading ? ' is-active' : ''}`}>
                  <canvas ref={visualizerCanvasRef} aria-hidden="true" />
                  <button type="button" className={`concierge-mic${isLiveConnected ? ' is-connected' : ''}`} onClick={isLiveConnected ? () => stopLiveSession() : startLiveSession} disabled={isVoiceLoading} aria-label={isVoiceLoading ? 'Connecting microphone' : isLiveConnected ? 'End voice conversation' : 'Start voice conversation'}>{isVoiceLoading ? <Loader2 size={26} className="concierge-loading" /> : isLiveConnected ? <MicOff size={26} /> : <Mic size={26} />}</button>
                </div>
                <p className="concierge-voice-status" role="status">{isVoiceLoading ? CHAT_WIDGET_CONTENT.voiceLoadingLabel : isThinkingOrSpeaking ? 'Sentient is responding…' : isLiveConnected ? 'Listening. Tap the microphone to end.' : 'Tap the microphone to begin.'}</p>
                {isThinkingOrSpeaking && !isVoiceLoading && <button type="button" className="concierge-interrupt" onClick={handleInterrupt}>Interrupt response</button>}
                {voiceError && <p className="concierge-error" role="alert"><AlertCircle size={16} />{voiceError}</p>}
                <div className="concierge-transcript" role="log" aria-label="Voice transcript" aria-live="polite">
                  {transcriptHistory.length === 0 && !interimInput && <p className="concierge-disclosure">Your microphone starts only when you choose to begin.</p>}
                  {transcriptHistory.slice(-3).map((turn, index) => <p key={index}><strong>{turn.role === 'user' ? 'You' : 'Sentient AI'}:</strong> {turn.text}</p>)}
                  {interimInput && <p><strong>You:</strong> {interimInput}</p>}
                </div>
              </>}
            </div>
          </>
        )}
      </div>
    </>
  );
};
