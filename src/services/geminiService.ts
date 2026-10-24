import { track } from "../lib/track";
// Server-backed Gemini service for Cloudflare Pages.
// ✅ No client API key. Calls /api/gemini.
import { createVoiceRequestBody } from "../lib/voicePlayback";

const MEMORY_STORAGE_KEY = "sentient_chat_memory_v1";
const memory: { role: "user" | "model"; text: string }[] = [];

function restoreMemoryFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const safe = parsed
      .filter(
        (item) =>
          item &&
          (item.role === "user" || item.role === "model") &&
          typeof item.text === "string",
      )
      .slice(-20);
    if (safe.length) memory.push(...safe);
  } catch {
    // Ignore storage parse errors
  }
}

function persistMemoryToStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory.slice(-20)));
  } catch {
    // Ignore quota/privacy-mode errors
  }
}

restoreMemoryFromStorage();

// --- Helpers kept for your existing UI ---

export const dispatchToast = (
  message: string,
  type: "success" | "error" | "info" = "info",
) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("show-toast", { detail: { message, type } }),
    );
  }
};

export const downloadAsFile = (filename: string, content: string) => {
  const element = document.createElement("a");
  const file = new Blob([content], { type: "text/plain" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

interface EmailResult {
  success: boolean;
  message: string;
}

export interface LeadSubmission {
  name: string;
  email: string;
  inquiry: string;
  intent: "contact" | "blueprint";
  source: string;
  ctaLabel?: string;
}

interface LeadSubmissionResult {
  success: boolean;
  message: string;
  leadId?: string;
}

export const LEAD_EMAIL = "hello@sentientpartners.ai";
export const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${LEAD_EMAIL}`;

/** The exact JSON body the browser posts to FormSubmit for a lead. */
export const buildFormSubmitLead = (
  payload: LeadSubmission,
  leadId: string,
  honey = "",
) => ({
  _subject:
    payload.intent === "blueprint"
      ? `New Business Inquiry - ${payload.name}`
      : `New Website Inquiry - ${payload.name}`,
  _template: "table",
  _captcha: "false",
  _replyto: payload.email,
  _honey: honey,
  name: payload.name,
  email: payload.email,
  inquiry: payload.inquiry,
  source: payload.source,
  intent: payload.intent,
  cta_label: payload.ctaLabel || "",
  lead_id: leadId,
});

const newLeadId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Sends a lead straight from the browser to FormSubmit (activated for
 * sentientpartners.ai). Success only when FormSubmit says success "true".
 * /api/leads is pinged for the optional webhook but never decides success.
 */
/**
 * After hello@ has the message, ask our server to email the visitor a short,
 * fixed thank-you. Fire and forget: it never changes what the visitor sees.
 */
export const requestVisitorConfirmation = (payload: Pick<LeadSubmission, "name" | "email">, honey = "") => {
  try {
    fetch("/api/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: payload.email, name: payload.name, company: honey }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let the confirmation affect the lead.
  }
};

export const submitLead = async (
  payload: LeadSubmission,
  honey = "",
  options: { timeoutMs?: number; confirmVisitor?: boolean } = {},
): Promise<LeadSubmissionResult> => {
  const leadId = newLeadId();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);

  fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, leadId }),
    keepalive: true,
  }).catch(() => {});

  try {
    const response = await fetch(FORMSUBMIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildFormSubmitLead(payload, leadId, honey)),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as {
      success?: unknown;
      message?: unknown;
    };
    if (response.ok && String(data.success) === "true") {
      if (options.confirmVisitor) requestVisitorConfirmation(payload, honey);
      return {
        success: true,
        message: "Thanks. We received your note and will follow up soon.",
        leadId,
      };
    }
    return { success: false, message: "We couldn't send your message." };
  } catch {
    return { success: false, message: "We couldn't send your message." };
  } finally {
    clearTimeout(timer);
  }
};

export const sendEmailData = async (
  data: Record<string, unknown>,
  subject: string,
): Promise<EmailResult> => {
  const targetEmail = "hello@sentientpartners.ai";
  const endpoint = `https://formsubmit.co/ajax/${targetEmail}`;
  const timestamp = new Date();
  const uniqueSubject = `${subject} - ${timestamp.toLocaleString()}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: uniqueSubject,
        _template: "table",
        _captcha: "false",
        source: "Sentient AI Web Agent",
        sent_at: timestamp.toLocaleString(),
        ...data,
      }),
    });

    const responseText = await response.text();

    let responseData: { success?: string | boolean; message?: string } = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      return { success: false, message: "Invalid response from email server." };
    }

    const isSuccess =
      responseData.success === "true" || responseData.success === true;
    const message = responseData.message || "";

    if (response.ok && isSuccess) {
      if (String(message).toLowerCase().includes("activate")) {
        return {
          success: true,
          message: "Email sent. Activate FormSubmit once via email.",
        };
      }
      return { success: true, message: "Email transmitted successfully." };
    }

    return {
      success: false,
      message: message || "Email server rejected the request.",
    };
  } catch {
    return { success: false, message: "Network connection failed." };
  }
};

export const sendTestEmail = async (): Promise<EmailResult> => {
  const timestamp = new Date().toLocaleString();
  return await sendEmailData(
    {
      Status: "Connection Verified",
      Timestamp: timestamp,
      Test_ID: Date.now(),
    },
    "Connection Test Verification",
  );
};

export const sendTranscript = async (chatLog: string, voiceLog: string) => {
  if (!chatLog && !voiceLog) return { success: false, message: "No content" };

  const result = await sendEmailData(
    {
      chat_history: chatLog || "No chat.",
      voice_transcript: voiceLog || "No voice.",
    },
    "New Client Transcript",
  );

  if (result.success) return { success: true, message: "Sent" };

  const fullLog = `SENTIENT PARTNERS TRANSCRIPT\nDate: ${new Date().toLocaleString()}\n\n--- CHAT ---\n${chatLog}\n\n--- VOICE ---\n${voiceLog}`;
  downloadAsFile(`transcript-${Date.now()}.txt`, fullLog);
  return { success: true, message: "Saved locally" };
};

// --- Audio helpers (kept because your ChatInterface imports them) ---

export function createPcmBlob(data: Float32Array, sampleRate: number = 16000) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: `audio/pcm;rate=${sampleRate}`,
  };
}

export function encode(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++)
    bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
) {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Chat (server-backed) ---

export const initializeChat = () => null;

export type AssistantUi =
  | { type: "booked"; start: string; timeZone: string; label: string }
  | { type: "note"; note: string };

let assistantUiHandler: ((ui: AssistantUi) => void) | null = null;

/** The screen registers here to show what the assistant did (a booking, a note form). */
export const setAssistantUiHandler = (handler: ((ui: AssistantUi) => void) | null) => {
  assistantUiHandler = handler;
};

const visitorTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

/** Shown instead of browser errors like Safari's "Load failed". */
export const CHAT_UNAVAILABLE_TEXT =
  "Sorry, I couldn't answer just now. You can pick a time for the 20-minute introductory call at https://cal.com/sentient-partners-strategy/introductory-call, or email hello@sentientpartners.ai.";
/** A little over the server's 20 s budget, so the server's own fallback normally wins. */
export const CHAT_CLIENT_TIMEOUT_MS = 24_000;

export const sendMessageToGemini = async function* (message: string) {
  try {
    const historyToSend = memory.slice(-6);

    track("chat_send", "chat");
    const resp = await fetch("/api/gemini", {
      method: "POST",
      signal: AbortSignal.timeout(CHAT_CLIENT_TIMEOUT_MS),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: historyToSend,
        timeZone: visitorTimeZone(),
      }),
    });

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      yield "AI endpoint is unreachable on this host. Deploy with Cloudflare Pages Functions so /api/gemini is live.";
      return;
    }

    const data = await resp
      .json()
      .catch(() => ({}) as { text?: string; error?: string; message?: string });
    if (!resp.ok) {
      if (resp.status === 429) {
        let cleanMsg =
          data.message ||
          data.error ||
          "You exceeded your current daily/minute quota.";
        // Clean up internal JSON if present
        try {
          const parsed = JSON.parse(cleanMsg);
          if (parsed?.error?.message) {
            cleanMsg = parsed.error.message;
          }
        } catch {
          // Keep original string if not JSON
        }
        console.warn("chat 429", cleanMsg);
      } else {
        console.warn(`chat ${resp.status}`, data.message || data.error);
      }
      yield CHAT_UNAVAILABLE_TEXT;
      return;
    }

    const text = String(data?.text || "");
    const uiHints = (data as { ui?: AssistantUi[] })?.ui;
    if (Array.isArray(uiHints)) uiHints.forEach((hint) => assistantUiHandler?.(hint));
    memory.push({ role: "user", text: String(message || "") });
    memory.push({ role: "model", text });
    persistMemoryToStorage();
    yield text || "Empty response.";
  } catch (error: unknown) {
    console.warn("chat request failed", error);
    yield CHAT_UNAVAILABLE_TEXT;
  }
};

export const requestVoiceAudio = async (
  text: string,
  voiceId: string,
): Promise<Blob> => {
  const response = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createVoiceRequestBody(text, { voiceId })),
  });

  if (!response.ok) {
    throw new Error(`Voice request failed with status ${response.status}`);
  }

  return response.blob();
};

// Voice will be wired next after chat is confirmed.
export const connectLiveSession = async () => {
  throw new Error("Voice not wired yet. Chat first.");
};
