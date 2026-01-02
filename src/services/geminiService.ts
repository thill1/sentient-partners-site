// @ts-nocheck
// Server-backed Gemini service for Cloudflare Pages.
// ✅ No client API key. Calls /api/gemini.

let memory: { role: "user" | "model"; text: string }[] = [];

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

export const sendEmailData = async (data: any, subject: string): Promise<EmailResult> => {
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

    let responseData: any = {};
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
    let s = Math.max(-1, Math.min(1, data[i]));
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
    const historyToSend = memory.slice(-12);

    const resp = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: historyToSend, model: "gemini-2.5-flash" }),
    });

    const data = await resp.json().catch(() => ({} as any));
    if (!resp.ok) {
      yield "Server error. Check Cloudflare API_KEY (Production) and redeploy.";
      return;
    }

    const text = String(data?.text || "");
    memory.push({ role: "user", text: String(message || "") });
    memory.push({ role: "model", text });
    yield text || "Empty response.";
  } catch {
    yield "Connection problem. Refresh and try again.";
  }
};

// Voice will be wired next after chat is confirmed.
export const connectLiveSession = async () => {
  throw new Error("Voice not wired yet. Chat first.");
};
