// @ts-nocheck
import { SYSTEM_INSTRUCTION, BOOKING_URL } from "../constants";

let initialized = false;
let chatContents: any[] = [];

/* =========================
   Helpers
========================= */

export const dispatchToast = (
  message: string,
  type: "success" | "error" | "info" = "info"
) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("show-toast", { detail: { message, type } })
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
  // FAST FAIL: local file protocol
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    return {
      success: false,
      message:
        "RESTRICTED: You are running locally without a server. Use a hosted site/dev server for email features.",
    };
  }

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
      if (
        message.toLowerCase().includes("activate") ||
        message.toLowerCase().includes("check your email")
      ) {
        return {
          success: true,
          message:
            "Email Sent! Please check your inbox to ACTIVATE this endpoint (first time only).",
        };
      }
      return { success: true, message: "Email transmitted successfully." };
    }

    return { success: false, message: message || "Email server rejected the request." };
  } catch (error: any) {
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
      Note:
        "If you received this email, your transcript system is functional. If first time, click Activate in FormSubmit confirmation if needed.",
      System: "Sentient Partners AI Web Agent",
    },
    "Connection Test Verification"
  );
};

/* =========================
   Tools (local actions)
========================= */

const scheduleMeeting = (name?: string, email?: string, date?: string) => {
  const params = new URLSearchParams();
  if (name && name !== "null" && name !== "undefined") params.append("name", name);
  if (email && email !== "null" && email !== "undefined") params.append("email", email);
  if (date && date !== "null" && date !== "undefined") params.append("date", date);

  const fullUrl = `${BOOKING_URL}?${params.toString()}`;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-booking-modal", { detail: { url: fullUrl } }));
    document.dispatchEvent(new CustomEvent("open-booking-modal", { detail: { url: fullUrl } }));
    dispatchToast("Opening Calendar...", "success");
  }

  return { success: true, message: "Calendar interface opened successfully." };
};

const captureLead = async (name: string, email: string, phone?: string, inquiry?: string) => {
  dispatchToast("Sending information...", "info");

  const result = await sendEmailData(
    {
      Lead_Name: name,
      Lead_Email: email,
      Lead_Phone: phone || "Not provided",
      Lead_Inquiry: inquiry || "General Inquiry",
    },
    "New Lead Capture"
  );

  if (result.success) {
    dispatchToast("Information sent to team.", "success");
    return { success: true, message: "Lead info transmitted to the team." };
  }

  const leadData = `LEAD CAPTURE\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nInquiry: ${inquiry}\nDate: ${new Date().toLocaleString()}`;
  downloadAsFile(`lead-${name.replace(/\s+/g, "-")}.txt`, leadData);
  dispatchToast("Saved to your device.", "info");
  return { success: false, message: "Network issue. Saved locally." };
};

/* =========================
   Context helper
========================= */

export const getSystemInstructionWithContext = () => {
  let timeZone = "UTC";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {}

  const now = new Date();
  const localTime = now.toLocaleTimeString("en-US", { timeZone });
  const localDate = now.toLocaleDateString("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `${SYSTEM_INSTRUCTION}

[REAL-TIME USER CONTEXT]
- User Timezone: ${timeZone}
- Current Date: ${localDate}
- Current Time: ${localTime}

[EVENT HANDLING INSTRUCTIONS]
- START UP: Always introduce yourself immediately when the session starts.
- BOOKING: If user wants to book, call scheduleMeeting immediately.
- RE-OPENING CALENDAR: If user closed it and wants it, call scheduleMeeting again.
`;
};

/* =========================
   Cloudflare proxy call
========================= */

async function callGemini(payload: any) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}

  if (!res.ok) {
    const msg = json?.error || `Gemini error (${res.status})`;
    throw new Error(msg);
  }

  return json;
}

function extractTextFromGeminiResponse(resp: any): string {
  const parts = resp?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p: any) => p?.text).filter(Boolean).join("");
}

function extractFunctionCalls(resp: any) {
  const parts = resp?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return [];
  return parts.filter((p: any) => p?.functionCall).map((p: any) => p.functionCall);
}

/* =========================
   Public API
========================= */

export const initializeChat = () => {
  initialized = true;
  chatContents = [];
  return null;
};

export const sendTranscript = async (chatLog: string, voiceLog: string) => {
  if (!chatLog && !voiceLog) return { success: false, message: "No content" };

  const result = await sendEmailData(
    {
      chat_history: chatLog || "No text chat recorded.",
      voice_transcript: voiceLog || "No voice interaction recorded.",
    },
    "New Client Transcript"
  );

  if (result.success) {
    dispatchToast("Transcript sent successfully.", "success");
    return { success: true, message: "Sent" };
  }

  const fullLog = `SENTIENT PARTNERS TRANSCRIPT\nDate: ${new Date().toLocaleString()}\n\n--- CHAT LOG ---\n${chatLog}\n\n--- VOICE LOG ---\n${voiceLog}`;
  downloadAsFile(`transcript-${Date.now()}.txt`, fullLog);
  dispatchToast("Transcript saved to your device.", "info");
  return { success: true, message: "Saved locally" };
};

// Main chat generator
export const sendMessageToGemini = async function* (
  message: string
): AsyncGenerator<string, void, unknown> {
  try {
    if (!initialized) initializeChat();

    // Push user message
    chatContents.push({ role: "user", parts: [{ text: message }] });

    // Simple tool schema (REST format)
    const tools = [
      {
        functionDeclarations: [
          {
            name: "scheduleMeeting",
            description:
              "Opens the booking calendar modal. Use when user wants to book. Can re-open with no params.",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                email: { type: "STRING" },
                date: { type: "STRING" },
              },
              required: [],
            },
          },
          {
            name: "captureLead",
            description:
              "Captures user contact info + inquiry and sends to team via email.",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                email: { type: "STRING" },
                phone: { type: "STRING" },
                inquiry: { type: "STRING" },
              },
              required: ["name", "email"],
            },
          },
        ],
      },
    ];

    const toolConfig = { functionCallingConfig: { mode: "AUTO" } };

    while (true) {
      const systemText = getSystemInstructionWithContext();

      const resp = await callGemini({
        model: "gemini-2.5-flash",
        systemInstruction: { parts: [{ text: systemText }] },
        tools,
        toolConfig,
        contents: chatContents,
      });

      // Store model message
      const modelContent = resp?.candidates?.[0]?.content;
      if (modelContent) chatContents.push(modelContent);

      // Yield text
      const textOut = extractTextFromGeminiResponse(resp);
      if (textOut) yield textOut;

      // Tool calls?
      const calls = extractFunctionCalls(resp);
      if (!calls.length) break;

      const functionResponses: any[] = [];

      for (const call of calls) {
        const args = call.args || {};
        if (call.name === "scheduleMeeting") {
          functionResponses.push({
            functionResponse: {
              name: "scheduleMeeting",
              response: { result: scheduleMeeting(args.name, args.email, args.date) },
            },
          });
        } else if (call.name === "captureLead") {
          functionResponses.push({
            functionResponse: {
              name: "captureLead",
              response: {
                result: await captureLead(args.name, args.email, args.phone, args.inquiry),
              },
            },
          });
        } else {
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: { error: "Function not found" } },
            },
          });
        }
      }

      // Send tool results back
      chatContents.push({ role: "user", parts: functionResponses });
    }
  } catch (err) {
    console.error("[GeminiService] Error:", err);
    yield "I’m hitting a temporary connection issue. Please try again.";
  }
};

// Voice: disabled for launch, but won't crash build
export const connectLiveSession = async () => {
  return Promise.reject(
    new Error("Voice mode disabled for launch until moved fully server-side.")
  );
};

/* =========================
   Audio helpers (kept)
========================= */

export function createPcmBlob(
  data: Float32Array,
  sampleRate: number = 16000
): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    let s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? (s * 0x8000) : (s * 0x7fff);
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
