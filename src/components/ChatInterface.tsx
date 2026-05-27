import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  Loader2,
  Sparkles,
  Mic,
  MicOff,
  Radio,
  Maximize2,
  Minimize2,
  AlertCircle,
  X,
  MessageSquare,
} from 'lucide-react';
import { Message } from '../types';
import {
  sendMessageToGemini,
  requestVoiceAudio,
  sendTranscript,
  dispatchToast,
} from '../services/geminiService';
import { CHAT_WIDGET_CONTENT } from '../content/siteContent';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { CHAT_EVENT } from '../lib/siteActions';

const SUGGESTED_ACTIONS = CHAT_WIDGET_CONTENT.suggestedActions;

export const ChatInterface: React.FC = () => {
  const { settings: siteSettings } = useSiteSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'voice'>('chat');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // Voice state
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Transcript capture
  const [transcriptHistory, setTranscriptHistory] = useState<
    { role: 'user' | 'model'; text: string }[]
  >([]);
  const currentInputTransRef = useRef('');
  const currentOutputTransRef = useRef('');

  // Voice engine refs (browser STT + server-backed TTS playback)
  const connectionActiveRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const isSpeakingOrFetchingRef = useRef<boolean>(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);

  // Debounce buffer for STT finals (prevents multiple fast calls + random “server error”)
  const finalBufferRef = useRef<string>('');
  const finalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Visualizer
  const inputContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);

  const stopAudioPlayback = () => {
    try {
      audioElementRef.current?.pause();
    } catch {
      void 0;
    }

    audioElementRef.current = null;

    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
  };

  const playVoiceResponse = async (text: string) => {
    const clean = String(text || '').trim();
    if (!clean || !siteSettings.ai.voiceEnabled) {
      return;
    }

    const audioBlob = await requestVoiceAudio(clean, siteSettings.ai.voiceId);
    const objectUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(objectUrl);

    stopAudioPlayback();
    audioElementRef.current = audio;
    audioObjectUrlRef.current = objectUrl;

    return new Promise<void>((resolve) => {
      audio.onended = () => {
        stopAudioPlayback();
        resolve();
      };
      audio.onerror = () => {
        stopAudioPlayback();
        resolve();
      };

      void audio.play().catch(() => {
        stopAudioPlayback();
        resolve();
      });
    });
  };

  // --- Boot/open listeners ---
  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
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
    const radiusBase = 80;
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

      rotation += 0.005;

      for (let i = 0; i < bars; i++) {
        let barHeight = isLiveConnected
          ? Math.max(4, dataArray[i] * 0.8)
          : 4 + Math.sin(i * 0.5 + rotation * 5) * 5;

        if (isVoiceLoading) {
          rotation += 0.02;
          barHeight = 15 + Math.sin(i * 0.5 + rotation * 15) * 10;
        }

        const rad = (i / bars) * Math.PI * 2 + rotation;
        const x1 = centerX + Math.cos(rad) * radiusBase;
        const y1 = centerY + Math.sin(rad) * radiusBase;
        const x2 = centerX + Math.cos(rad) * (radiusBase + barHeight);
        const y2 = centerY + Math.sin(rad) * (radiusBase + barHeight);

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, '#0ea5e9');
        gradient.addColorStop(1, '#a855f7');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [isLiveConnected, isVoiceLoading, activeTab, isOpen]);

  // --- Transcript helpers ---
  const prepareTranscriptData = () => {
    const pendingUser = currentInputTransRef.current.trim();
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
      const stream = sendMessageToGemini(userMsg.text);
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

  const respondToVoice = async (userText: string) => {
    const clean = String(userText || '').trim();
    if (!clean) return;

    // Ignore tiny/noise
    if (clean.length < 3) return;

    isSpeakingOrFetchingRef.current = true;

    try {
      // Log user voice transcript
      setTranscriptHistory((prev) => [...prev, { role: 'user', text: clean }]);

      // Stop recognition while we speak back (prevents feedback loop)
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // Ignore stop errors
      }

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
        return;
      }

      if (!reply) {
        setVoiceError('Voice server returned an empty response.');
        return;
      }

      // Save transcript
      setTranscriptHistory((prev) => [...prev, { role: 'model', text: reply }]);

      // Speak reply through the server-backed voice proxy
      try {
        await playVoiceResponse(reply);
      } catch {
        setVoiceError('Voice playback failed.');
      }
    } catch (err) {
      console.error('Voice response error:', err);
      setVoiceError('An error occurred during voice communication.');
    } finally {
      isSpeakingOrFetchingRef.current = false;

      // Restart recognition if session still active
      if (connectionActiveRef.current) {
        try {
          recognitionRef.current?.start?.();
        } catch {
          // Some browsers require a fresh user gesture to restart
        }
      }
    }
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

    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      setVoiceError('Voice not supported in this browser. Use Chrome/Edge on desktop.');
      return;
    }

    connectionActiveRef.current = true;
    setIsVoiceLoading(true);
    setVoiceError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser does not support microphone input.');
      }

      // Force a mic permission request (if not already granted)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // AudioContext + analyser for visuals
      const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error('Browser does not support AudioContext.');
      const ctx = new AudioContextClass();
      await ctx.resume();
      inputContextRef.current = ctx;

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
        setVoiceError(null);
        dispatchToast('Listening…', 'success');
      };

      recognition.onerror = (e: Event & { error?: string }) => {
        const msg =
          e?.error === 'not-allowed'
            ? 'Microphone permission denied.'
            : e?.error === 'service-not-allowed'
            ? 'Speech service not available in this browser.'
            : `Voice error: ${e?.error || 'unknown'}`;
        setVoiceError(msg);
        setIsVoiceLoading(false);
        setIsLiveConnected(false);
        connectionActiveRef.current = false;
      };

      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        if (!connectionActiveRef.current) return;

        let finalText = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const t = res?.[0]?.transcript || '';
          if (res.isFinal) finalText += t;
          else interimText += t;
        }

        if (interimText.trim()) currentInputTransRef.current = interimText.trim();

        if (finalText.trim()) {
          currentInputTransRef.current = '';

          // Debounce: buffer multiple finals into one request
          finalBufferRef.current = `${finalBufferRef.current} ${finalText}`.trim();

          if (finalTimerRef.current) clearTimeout(finalTimerRef.current);
          finalTimerRef.current = setTimeout(async () => {
            const combined = finalBufferRef.current.trim();
            finalBufferRef.current = '';
            finalTimerRef.current = null;
            if (combined) await respondToVoice(combined);
          }, 650);
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

  const stopLiveSession = () => {
    connectionActiveRef.current = false;
    isSpeakingOrFetchingRef.current = false;

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

    if (currentInputTransRef.current.trim()) {
      setTranscriptHistory((prev) => [
        ...prev,
        { role: 'user', text: currentInputTransRef.current.trim() },
      ]);
    }
    if (currentOutputTransRef.current.trim()) {
      setTranscriptHistory((prev) => [
        ...prev,
        { role: 'model', text: currentOutputTransRef.current.trim() },
      ]);
    }
    currentInputTransRef.current = '';
    currentOutputTransRef.current = '';

    setIsLiveConnected(false);
    setIsVoiceLoading(false);
    setVoiceError(null);
  };

  // --- UI ---
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900/40 border border-brand-400/60 px-4 py-3 text-sm font-medium text-slate-50 shadow-xl shadow-black/40 backdrop-blur-md hover:bg-slate-900/60 hover:border-brand-300/70 transition"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Bot size={20} className="text-white" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-slate-900"></span>
          </span>
        </div>
        <div className="text-left">
          <p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest leading-none mb-1">
            {CHAT_WIDGET_CONTENT.launcherEyebrow}
          </p>
          <p className="text-sm font-semibold text-white/90 leading-none">
            {CHAT_WIDGET_CONTENT.launcherLabel}
          </p>
        </div>
      </button>
    );
  }

  const containerClasses = isFullScreen
    ? 'fixed inset-0 z-[60] h-full w-full rounded-none'
    : 'fixed bottom-6 right-6 z-[60] w-[400px] h-[600px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-48px)] rounded-3xl';

  return (
    <>
      {!isFullScreen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] transition-opacity"
          onClick={handleClose}
        />
      )}

      <div
        className={`${containerClasses} flex flex-col bg-white/95 dark:bg-dark-card/95 backdrop-blur-2xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden ring-1 ring-black/10 transition-all duration-300 animate-slide-up`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 p-4 shrink-0 bg-white/50 dark:bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                {CHAT_WIDGET_CONTENT.title}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                {CHAT_WIDGET_CONTENT.status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-wait"
              title="Close & Save"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex p-1.5 mx-4 mt-4 mb-2 bg-slate-100 dark:bg-black/40 rounded-xl shrink-0 border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare size={16} /> Chat
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'voice'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Radio size={16} className={isLiveConnected ? 'animate-pulse' : ''} /> Voice
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-5 relative scrollbar-hide">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-100 to-purple-100 dark:from-brand-900/40 dark:to-purple-900/40 border border-brand-200 dark:border-brand-800 flex items-center justify-center shrink-0 mb-1">
                      <Sparkles size={14} className="text-brand-600 dark:text-brand-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm backdrop-blur-sm ${
                      msg.role === 'user'
                        ? 'bg-brand-600 text-white rounded-br-none shadow-brand-500/20'
                        : 'bg-white/80 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-white/5 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                    {msg.isTyping && <span className="inline-block w-1 h-3 ml-1 bg-current animate-pulse" />}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide shrink-0 mask-gradient-right">
              {SUGGESTED_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(action.prompt)}
                  disabled={isLoading}
                  className="whitespace-nowrap px-3 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-600 dark:hover:bg-white/10 dark:hover:text-white transition-all shadow-sm"
                >
                  {action.label}
                </button>
              ))}
            </div>

            <div className="p-4 bg-white dark:bg-black/20 border-t border-slate-100 dark:border-white/5 shrink-0">
              <div className="flex gap-2 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={CHAT_WIDGET_CONTENT.chatPlaceholder}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 focus:border-brand-500 rounded-xl outline-none text-sm text-slate-900 dark:text-white transition-all shadow-inner"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !inputValue.trim()}
                  className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-500 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 to-black dark:from-black dark:to-[#050505]">
            <canvas
              ref={visualizerCanvasRef}
              className="absolute inset-0 w-full h-full opacity-60 pointer-events-none mix-blend-screen"
            />

            <div className="absolute top-6 right-6 z-30">
              <button
                onClick={isLiveConnected ? stopLiveSession : startLiveSession}
                disabled={isVoiceLoading}
                className={`p-4 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl backdrop-blur-md border ${
                  isVoiceLoading
                    ? 'bg-slate-800 border-slate-700'
                    : isLiveConnected
                    ? 'bg-red-500 hover:bg-red-600 border-red-400 text-white shadow-red-500/30'
                    : 'bg-brand-600 hover:bg-brand-500 border-brand-400 text-white shadow-brand-500/30'
                }`}
                title={isLiveConnected ? 'End Session' : 'Start Voice Chat'}
              >
                {isVoiceLoading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : isLiveConnected ? (
                  <MicOff size={24} />
                ) : (
                  <Mic size={24} />
                )}
              </button>
            </div>

            {voiceError && (
              <div className="relative z-10 px-6 py-2 bg-red-500/10 border border-red-500/20 rounded-full backdrop-blur-sm">
                <span className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle size={14} /> {voiceError}
                </span>
              </div>
            )}

            {isVoiceLoading && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-20">
                <p className="text-brand-400 text-sm font-medium animate-pulse">
                  {CHAT_WIDGET_CONTENT.voiceLoadingLabel}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
