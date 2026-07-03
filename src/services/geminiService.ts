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
      .filter((item) => item && (item.role === "user" || item.role === "model") && typeof item.text === "string")
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
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message, type } }));
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

export const submitLead = async (
  payload: LeadSubmission,
): Promise<LeadSubmissionResult> => {
  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return {
        success: false,
        message: "Lead capture endpoint is unavailable on this host.",
      };
    }

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      message?: string;
      leadId?: string;
    };

    if (!response.ok || !data.ok) {
      return {
        success: false,
        message: data.error || data.message || "Lead capture failed.",
      };
    }

    return {
      success: true,
      message: data.message || "Lead captured successfully.",
      leadId: data.leadId,
    };
  } catch {
    return { success: false, message: "Network connection failed." };
  }
};

export const sendEmailData = async (data: Record<string, unknown>, subject: string): Promise<EmailResult> => {
  const targetEmail = "troyhill@sentientpartners.ai";
  const endpoint = `https://formsubmit.co/ajax/${targetEmail}`;
  const timestamp = new Date();
  const uniqueSubject = `${subject} - ${timestamp.toLocaleString()}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
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

    const isSuccess = responseData.success === "true" || responseData.success === true;
    const message = responseData.message || "";

    if (response.ok && isSuccess) {
      if (String(message).toLowerCase().includes("activate")) {
        return { success: true, message: "Email sent. Activate FormSubmit once via email." };
      }
      return { success: true, message: "Email transmitted successfully." };
    }

    return { success: false, message: message || "Email server rejected the request." };
  } catch {
    return { success: false, message: "Network connection failed." };
  }
};

export const sendTestEmail = async (): Promise<EmailResult> => {
  const timestamp = new Date().toLocaleString();
  return await sendEmailData(
    { Status: "Connection Verified", Timestamp: timestamp, Test_ID: Date.now() },
    "Connection Test Verification",
  );
};

export const sendTranscript = async (chatLog: string, voiceLog: string) => {
  if (!chatLog && !voiceLog) return { success: false, message: "No content" };

  const result = await sendEmailData(
    { chat_history: chatLog || "No chat.", voice_transcript: voiceLog || "No voice." },
    "New Client Transcript",
  );

  if (result.success) return { success: true, message: "Sent" };

  const fullLog =
    `SENTIENT PARTNERS TRANSCRIPT\nDate: ${new Date().toLocaleString()}\n\n--- CHAT ---\n${chatLog}\n\n--- VOICE ---\n${voiceLog}`;
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
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: `audio/pcm;rate=${sampleRate}` };
}

export function encode(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
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

export const sendMessageToGemini = async function* (message: string) {
  try {
    const historyToSend = memory.slice(-6);

    const resp = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: historyToSend, model: "gemini-2.5-flash" }),
    });

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      yield "AI endpoint is unreachable on this host. Deploy with Cloudflare Pages Functions so /api/gemini is live.";
      return;
    }

    const data = await resp.json().catch(() => ({} as { text?: string; error?: string; message?: string }));
    if (!resp.ok) {
      if (resp.status === 429) {
        let cleanMsg = data.message || data.error || "You exceeded your current daily/minute quota.";
        // Clean up internal JSON if present
        try {
          const parsed = JSON.parse(cleanMsg);
          if (parsed?.error?.message) {
            cleanMsg = parsed.error.message;
          }
        } catch {
          // Keep original string if not JSON
        }
        yield `Rate Limit Exceeded (429): ${cleanMsg}`;
      } else {
        yield `API Error (${resp.status}): ${data.message || data.error || "Check Cloudflare API_KEY (Production) and redeploy."}`;
      }
      return;
    }

    const text = String(data?.text || "");
    memory.push({ role: "user", text: String(message || "") });
    memory.push({ role: "model", text });
    persistMemoryToStorage();
    yield text || "Empty response.";
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error || "");
    yield `Connection problem: ${errMsg || "Refresh and try again."}`;
  }
};

export const requestVoiceAudio = async (text: string, voiceId: string): Promise<Blob> => {
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
