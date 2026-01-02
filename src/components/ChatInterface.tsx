// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX, Send, Trash2 } from "lucide-react";
import { sendMessageToGemini, sendTranscript } from "../services/geminiService";

type Msg = { role: "user" | "assistant"; text: string; ts: number };

const supportsSpeechRecognition = () => {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
};

const supportsSpeechSynthesis = () => {
  if (typeof window === "undefined") return false;
  return Boolean(window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== "undefined");
};

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi — I’m the Sentient AI. How can I help you today?",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Voice controls
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);

  const recognitionRef = useRef<any>(null);
  const lastUserSpokenRef = useRef<string>("");

  // Logs (for transcript export/email)
  const chatLog = useMemo(
    () =>
      messages
        .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.text}`)
        .join("\n\n"),
    [messages],
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Build a speech recognition instance once (if supported)
  useEffect(() => {
    if (!supportsSpeechRecognition()) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const t = res[0]?.transcript || "";
        if (res.isFinal) finalText += t;
        else interimText += t;
      }

      const combined = (finalText || interimText).trim();
      if (combined) lastUserSpokenRef.current = combined;

      // Auto-send only on final
      if (finalText && finalText.trim()) {
        const spoken = finalText.trim();
        stopListening(); // stop so it doesn't re-trigger on speaker audio
        void handleSend(spoken);
      }
    };

    rec.onerror = () => {
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {}
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = (text: string) => {
    if (!speakReplies) return;
    if (!supportsSpeechSynthesis()) return;
    if (typeof window === "undefined") return;

    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1;
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const startListening = () => {
    if (!supportsSpeechRecognition()) {
      alert("Voice input is not supported in this browser. Try Chrome/Edge on desktop.");
      return;
    }
    if (busy) return;

    // If TTS is speaking, stop it so it doesn't get re-captured
    if (supportsSpeechSynthesis()) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch {
      // If already started, ignore
      setListening(true);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  };

  const addMessage = (role: Msg["role"], text: string) => {
    setMessages((prev) => [...prev, { role, text, ts: Date.now() }]);
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;

    setInput("");
    setBusy(true);
    addMessage("user", text);

    // Stream generator (even if it yields once)
    let full = "";
    try {
      for await (const chunk of sendMessageToGemini(text)) {
        full += chunk;
      }
    } catch {
      full = "I hit a connection problem. Please try again.";
    }

    addMessage("assistant", full || "Empty response.");
    speak(full || "Empty response.");
    setBusy(false);
  };

  const clearChat = () => {
    if (supportsSpeechSynthesis()) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    stopListening();
    setMessages([
      {
        role: "assistant",
        text: "Chat cleared. How can I help you?",
        ts: Date.now(),
      },
    ]);
  };

  const sendTranscriptNow = async () => {
    const voiceLog = lastUserSpokenRef.current ? `Last voice input: ${lastUserSpokenRef.current}` : "";
    await sendTranscript(chatLog, voiceLog);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-3xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200/70 dark:border-white/10">
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Sentient AI</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Chat + Voice (browser mic)
              {!supportsSpeechRecognition() && " · Mic unsupported in this browser"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speak replies toggle */}
            <button
              type="button"
              onClick={() => setSpeakReplies((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-900 hover:bg-slate-100 transition dark:border-white/15 dark:bg-black/30 dark:text-slate-100 dark:hover:bg-white/10"
              aria-label="Toggle speak replies"
              title="Toggle speak replies"
            >
              {speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-900 hover:bg-slate-100 transition dark:border-white/15 dark:bg-black/30 dark:text-slate-100 dark:hover:bg-white/10"
              aria-label="Clear chat"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="px-4 sm:px-6 py-4 max-h-[52vh] overflow-y-auto">
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-slate-900 text-white dark:bg-white/10 dark:text-white"
                      : "bg-slate-100 text-slate-900 dark:bg-slate-900/60 dark:text-slate-100"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200/70 dark:border-white/10">
          <div className="flex items-center gap-2">
            {/* Mic */}
            <button
              type="button"
              disabled={busy}
              onClick={listening ? stopListening : startListening}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                listening
                  ? "border-rose-400 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                  : "border-slate-200 bg-white/80 text-slate-900 hover:bg-slate-100 dark:border-white/15 dark:bg-black/30 dark:text-slate-100 dark:hover:bg-white/10"
              }`}
              aria-label="Toggle microphone"
              title={listening ? "Stop listening" : "Start listening"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSend();
              }}
              placeholder={busy ? "Thinking…" : listening ? "Listening… (speak now)" : "Type a message…"}
              className="flex-1 h-10 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/70"
            />

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={busy || !input.trim()}
              className="inline-flex h-10 px-4 items-center justify-center rounded-2xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/10 dark:hover:bg-white/15 dark:text-white"
              aria-label="Send"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              {listening ? "Mic active. Speak clearly." : "Tip: click the mic to talk."}
            </span>
            <button
              type="button"
              onClick={() => void sendTranscriptNow()}
              className="underline hover:text-slate-700 dark:hover:text-slate-200"
            >
              Send transcript
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
