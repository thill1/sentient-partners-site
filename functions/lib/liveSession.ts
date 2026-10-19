import { Modality, Type } from "@google/genai";
import { buildAiSystemInstruction } from "../../src/content/siteContent";

/** Hard cap on one conversation. The client stops at this mark too. */
export const LIVE_MAX_SECONDS = 300;
/** Extra seconds the token stays valid after the cap, so the client closes first. */
export const LIVE_TOKEN_GRACE_SECONDS = 20;
/** How long a visitor has to open the connection after the token is minted. */
export const LIVE_START_WINDOW_SECONDS = 60;

export const DEFAULT_LIVE_MODEL = "gemini-3.8-live";
export const DEFAULT_LIVE_API_VERSION = "v1alpha";
export const LIVE_VOICE_NAME = "Kore";

export const NOTE_TOOL_NAME = "show_note_form";

const VOICE_ADDENDUM = `

Live voice conversation:
- You are speaking out loud, in real time. Use one to three short sentences per turn, and stop so the visitor can answer.
- Start by greeting the visitor in one short sentence and asking what they would like to know.
- If the visitor wants to leave a message for Troy, send him a note, or set a time to talk, call ${NOTE_TOOL_NAME} with their request in the visitor's own words. Then tell them you have put a short note on their screen: they add their name and email and tap Send. Never say you sent anything yourself.
- If the visitor goes quiet or says goodbye, say a brief goodbye.`;

/** The model, prompt, voice and tools for one live session. Fixed on the server. */
export function buildLiveSessionConfig(siteMemory = "") {
  return {
    responseModalities: [Modality.AUDIO],
    systemInstruction: { parts: [{ text: buildAiSystemInstruction(siteMemory) + VOICE_ADDENDUM }] },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_VOICE_NAME } } },
    tools: [
      {
        functionDeclarations: [
          {
            name: NOTE_TOOL_NAME,
            description:
              "Show an on-screen form so the visitor can leave a note for Troy or ask for a time to talk. The visitor still has to add their name and email and tap Send.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                note: {
                  type: Type.STRING,
                  description: "What the visitor wants to tell Troy or ask him, in their own words.",
                },
              },
              required: ["note"],
            },
          },
        ],
      },
    ],
  };
}
