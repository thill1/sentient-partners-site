/**
 * Splits a spoken reply so the first sentence or two can be voiced and played
 * while the rest is still being generated. The voice service returns one
 * finished clip per request, so a short first request means audio starts sooner.
 */

const SENTENCE_BREAK = /(?<=[.!?])\s+(?=[A-Z0-9"'“])/;

export interface SplitOptions {
  /** Aim for the first chunk to be at least this long. */
  firstMin?: number;
  /** Replies at or under this length are spoken in one piece. */
  singleMax?: number;
  /** Upper bound for each later chunk. */
  restMax?: number;
  /** Never return more than this many chunks. */
  maxChunks?: number;
}

export function splitForSpeech(text: string, options: SplitOptions = {}): string[] {
  const { firstMin = 60, singleMax = 170, restMax = 450, maxChunks = 3 } = options;
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= singleMax) return [clean];

  const sentences = clean.split(SENTENCE_BREAK).filter(Boolean);
  if (sentences.length < 2) return [clean];

  // First chunk: just enough sentences to be worth a request of its own.
  let first = sentences[0];
  let index = 1;
  while (first.length < firstMin && index < sentences.length - 1) {
    first = `${first} ${sentences[index]}`;
    index += 1;
  }
  // A very long opening sentence gains nothing from splitting.
  if (first.length > 220 || index >= sentences.length) return [clean];

  const chunks = [first];
  let current = "";
  for (const sentence of sentences.slice(index)) {
    if (current && `${current} ${sentence}`.length > restMax) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);

  // Cap the number of requests: fold any overflow into the last allowed chunk.
  while (chunks.length > maxChunks) {
    const tail = chunks.pop() as string;
    chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${tail}`;
  }
  return chunks;
}
