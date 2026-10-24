import { ActivityHandling, EndSensitivity, Modality, StartSensitivity } from "@google/genai";
import { TOOL_DECLARATIONS } from "./assistantTools";
import { buildAiSystemInstruction } from "../../src/content/siteContent";

/** Hard cap on one conversation. The client stops at this mark too. */
export const LIVE_MAX_SECONDS = 300;
/** Extra seconds the token stays valid after the cap, so the client closes first. */
export const LIVE_TOKEN_GRACE_SECONDS = 20;
/** How long a visitor has to open the connection after the token is minted. */
export const LIVE_START_WINDOW_SECONDS = 60;
/**
 * Connections one token allows: the first, plus seamless reconnects when Google
 * recycles the socket (goAway) or the network blips. All stay inside the same
 * five-minute cap because the token expiry does not move.
 */
export const LIVE_TOKEN_USES = 4;

export const DEFAULT_LIVE_MODEL = "gemini-3.8-live";
export const DEFAULT_LIVE_API_VERSION = "v1alpha";
export const LIVE_VOICE_NAME = "Kore";

const VOICE_ADDENDUM = `

Live voice conversation:
- You are speaking out loud, in real time. Use one to three short sentences per turn, and stop so the visitor can answer.
- Start by greeting the visitor in one short sentence and asking what they would like to know.
- Never say a link, web address or email address out loud. Say "I've put the link in the chat": the booking link and email are always shown under the microphone.
- Spell nothing out loud that is on screen; when you need an email address, ask the visitor to say it slowly, then read it back letter by letter and wait for a yes before booking.
- If the visitor goes quiet or says goodbye, say a brief goodbye.`;

export interface LiveContext {
  now?: Date;
  timeZone?: string;
}

/** The model, prompt, voice and tools for one live session. Fixed on the server. */
export function buildLiveSessionConfig(siteMemory = "", context: LiveContext = {}) {
  return {
    responseModalities: [Modality.AUDIO],
    systemInstruction: {
      parts: [{ text: buildAiSystemInstruction(siteMemory, { tools: true, ...context }) + VOICE_ADDENDUM }],
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_VOICE_NAME } } },
    // Turn-taking: hard to trigger by background noise or the assistant's own
    // echo, and patient enough not to cut in when the visitor pauses mid-thought.
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
        endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
        prefixPaddingMs: 200,
        silenceDurationMs: 800,
      },
      activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
    },
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    // Long conversations keep going instead of hitting the context limit.
    contextWindowCompression: { slidingWindow: {} },
  };
}

/**
 * What the browser may see. The system prompt stays out: it can carry private
 * site memory, and the token already locks it in on Google's side.
 */
export function toBrowserConfig(config: ReturnType<typeof buildLiveSessionConfig>) {
  return {
    responseModalities: config.responseModalities,
    inputAudioTranscription: config.inputAudioTranscription,
    outputAudioTranscription: config.outputAudioTranscription,
    speechConfig: config.speechConfig,
    realtimeInputConfig: config.realtimeInputConfig,
    tools: config.tools,
    contextWindowCompression: config.contextWindowCompression,
  };
}
