export type VoiceSpeaker = "assistant" | "visitor";

export type VoiceLine = {
  who: VoiceSpeaker;
  text: string;
};

/**
 * A scripted example of the assistant already on this site.
 * Lines stay inside published positioning: the intro, the suggested
 * questions, and the 20-minute introductory call. Nothing here is sent.
 */
export const VOICE_EXAMPLE: {
  label: string;
  disclosure: string;
  lines: readonly VoiceLine[];
} = {
  label: "Example conversation",
  disclosure:
    "A scripted example of the assistant on this site. It does not place a call, send a message, or contact the live assistant.",
  lines: [
    {
      who: "assistant",
      text: "Hello. I'm the Sentient Partners assistant (an AI). Ask me how we help growing businesses, or about booking a 20-minute introductory call.",
    },
    {
      who: "visitor",
      text: "We're a small local business. Where would you suggest we start?",
    },
    {
      who: "assistant",
      text: "We start by learning the business: where it sticks, and what is worth fixing first. Sentient Partners is a strategy and advisory firm that builds the systems to match. The way in is a 20-minute introductory call.",
    },
    {
      who: "visitor",
      text: "How could you help a business that misses calls and messages?",
    },
    {
      who: "assistant",
      text: "Chat and phone assistants can answer routine questions and route the rest to a person. The assistant always says it is an AI. What belongs in it depends on how the business already works. That is what the introductory call is for.",
    },
    {
      who: "visitor",
      text: "I'd like to book a 20-minute introductory call.",
    },
    {
      who: "assistant",
      text: "You can pick a time on this page, or email hello@sentientpartners.ai. The live assistant is here as well, if you would rather talk. Your microphone starts only when you choose to begin.",
    },
  ],
};

/** How long a line stays before the next one. Local timing only. */
export function voiceStepMs(text: string): number {
  return Math.min(4800, Math.max(1200, Math.round(text.length * 32)));
}
