// @ts-nocheck
// Server-backed Gemini service (Cloudflare Pages Function).
// ✅ No browser API keys. Calls /api/gemini.
// ✅ Keeps exports used by ChatInterface (decodeAudioData, etc).

let memory: { role: "user" | "model"; text: string }[] = [];

// --- Toast + File helpers (keep as-is for your UI) ---

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

export const sendEmailData = async (data: any, subject: string): Promise<EmailResult> => {
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    return {
      success: false,
      message:
        "RESTRICTED: You are running this file locally without a server. Use a hosted environment to enable Email & Mic features.",
    };
  }

  const targetEmail = "troyhill@sentientpartners.ai";
  const endpoint = `https://formsubmit.co/ajax/${targetEmail}`;
  const timestamp = new Date();
  const uniqueSubject = `${subject} - ${timestamp.toLocaleString()}`;

  console.log(`[Email Service] Preparing to send to ${targetEmail}...`);

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
    console.log("[Email Service] Raw Response:", responseText);

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
        return {
          success: true,
          message:
            "Email Sent! Please check your inbox to ACTIVATE this endpoint (first time only).",
        };
      }
      console.log("[Email Service] Email sent successfully.");
      return { success: true, message: "Email transmitted successfully." };
    }

    const errorMsg = message || "Email server rejected the request.";
    console.warn(`[Email Service] API Error: ${errorMsg}`);
    return { success: false, message: errorMsg };
  } catch (error: any) {
    console.error("[Email Service] Network Error:", error);
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
      Note: "If you received this email, your transcript system is functional. If this is the first email, click Activate in the FormSubmit email.",
      System: "Sentient Partners AI Web Agent",
    },
    "Connection Test Verification",
  );
};

export const sendTranscript = async (chatLog: string, voiceLog: string) => {
  if (!chatLog && !voiceLog) return { success: false, message: "No content" };

  const result = await sendEmailData(
    {
      chat_history: chatLog || "No text chat recorded.",
      voice_transcript: voiceLog || "No voice interaction recorded.",
    },
    "New Client Transcript",
  );

  if (result.success) {
    dispatchToast("Transcript sent successfully.", "success");
    return { success: true, message: "Sent" };
  }

  console.warn("Transcript email failed, initiating fallback download.");
  const fullLog =
    `SENTIENT PARTNERS TRANSCRIPT\nDate: ${new Date().toLocaleString()}\n\n--- CHAT LOG ---\n${chatLog}\n\n--- VOICE LOG ---\n${voiceLog}`;
  downloadAsFile(`transcript-${Date.now()}.txt`, fullLog);
  dispatchToast("Transcript saved to your device.", "info");
  return { success: true, message: "Saved locally" };
};

// --- Audio helpers (ChatInterface imports these) ---

export function createPcmBlob(
  data: Float32Array,
  sampleRate: number = 16000,
): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    let s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: `audio/pcm;rate=${sampleRate}`,
  };
}

export function encode(bytes: Uint8Array) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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

// --- Chat API (server-backed) ---

export const initializeChat = () => null;

// Generator to match your existing UI pattern
export const sendMessageToGemini = async function* (
  message: string,
): AsyncGenerator<string, void, unknown> {
  try {
    const historyToSend = memory.slice(-12);

    const resp = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: historyToSend,
        model: "gemini-2.5-flash",
      }),
    });

    const data = await resp.json().catch(() => ({} as any));

    if (!resp.ok) {
      console.error("[GeminiService] /api/gemini failed:", data);
      yield "Server is online but Gemini is not configured yet. Check Cloudflare Pages Production API_KEY and redeploy.";
      return;
    }

    const text = String(data?.text || "");
    if (!text) {
      yield "I received an empty response. Try again.";
      return;
    }

    memory.push({ role: "user", text: String(message || "") });
    memory.push({ role: "model", text });

    // yield once (simple)
    yield text;
  } catch (err) {
    console.error("[GeminiService] Exception:", err);
    yield "I hit a connection problem. Please refresh and try again.";
  }
};

// Voice mode is NOT wired server-side yet (prevents confusing client-key failures)
export const connectLiveSession = async () => {
  throw new Error(
    "Voice is not configured on the server yet. Chat is fixed first, then we enable voice via a server endpoint.",
  );
};
