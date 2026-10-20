import { runTool, TOOL_DECLARATIONS, type AssistantEnv, type ToolContext, type ToolUi } from "./assistantTools";

/**
 * Text chat with tools. One model call may ask for actions (check the
 * calendar, book, follow up); we run them and feed the results back until the
 * model answers in words. `generate` is injected so the loop can be tested
 * without Google.
 */

export interface ModelCall {
  name: string;
  args?: Record<string, unknown>;
}

export interface ModelTurn {
  text: string;
  calls: ModelCall[];
  /** The raw model content to replay in the conversation when it asked for tools. */
  content: unknown;
}

export type Generate = (contents: unknown[]) => Promise<ModelTurn>;

export const MAX_TOOL_ROUNDS = 4;
const FALLBACK_TEXT =
  "Sorry, I got tangled up on that one. You can pick a time at the booking link, or leave a note for Troy and he will get back to you.";

export async function runChat(
  generate: Generate,
  contents: unknown[],
  env: AssistantEnv,
  ctx: ToolContext,
): Promise<{ text: string; ui: ToolUi[] }> {
  const convo = [...contents];
  const ui: ToolUi[] = [];
  // What booking or follow-up already happened. If the model fails after that,
  // we report it ourselves rather than let another model redo it.
  const done: string[] = [];
  const doneText = () => done.join(" ");
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    let turn: ModelTurn;
    try {
      turn = await generate(convo);
    } catch (err) {
      if (done.length) return { text: doneText(), ui };
      throw err;
    }
    if (!turn.calls.length) return { text: turn.text.trim() || doneText() || FALLBACK_TEXT, ui };
    if (round === MAX_TOOL_ROUNDS) break;
    convo.push(turn.content);
    const parts: unknown[] = [];
    for (const call of turn.calls.slice(0, 4)) {
      const outcome = await runTool(call.name, call.args, env, ctx);
      if (outcome.ui) ui.push(outcome.ui);
      if (outcome.response.booked === true || outcome.response.delivered === true) {
        done.push(String(outcome.response.message ?? ""));
      }
      parts.push({ functionResponse: { name: call.name, response: outcome.response } });
    }
    convo.push({ role: "user", parts });
  }
  return { text: doneText() || FALLBACK_TEXT, ui };
}

export const chatToolConfig = () => ({ tools: [{ functionDeclarations: TOOL_DECLARATIONS }] });
