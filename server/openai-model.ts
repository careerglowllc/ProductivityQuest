import type OpenAI from "openai";

// One place to choose the OpenAI model. Set OPENAI_MODEL to override without a code change.
export const DEFAULT_OPENAI_MODEL = "gpt-6-luna";
export const FALLBACK_OPENAI_MODEL = "gpt-4o-mini";
export const openAiModel = () => process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;

type Params = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
type Create = (params: Params) => Promise<OpenAI.Chat.Completions.ChatCompletion>;
export type JsonRequest = { messages: Params["messages"]; maxTokens: number; temperature: number };

// A request the model refuses because of its parameters or name, as opposed to billing, rate limits or outages.
function rejectedRequest(error: unknown): boolean {
  const { status, code } = (error ?? {}) as { status?: number; code?: string };
  if (code === "credit_balance_exhausted" || code === "insufficient_quota" || code === "rate_limit_exceeded") return false;
  return status === 400 || status === 404;
}

let working = { index: 0, at: 0 }; // the attempt that last succeeded, so later calls skip ones the API refused
const REPROBE_MS = 6 * 60 * 60 * 1000;

// Asks for a JSON reply. Newer models want no hidden reasoning for a quick structured task and may reject
// `temperature`/`max_tokens`, so try that shape first, then relax it, then the older fallback model.
export async function createJsonCompletion(create: Create, request: JsonRequest) {
  const model = openAiModel();
  const base = { messages: request.messages, response_format: { type: "json_object" as const }, store: false };
  const attempts: Params[] = [
    { ...base, model, reasoning_effort: "none", temperature: request.temperature, max_completion_tokens: request.maxTokens } as Params,
    { ...base, model, reasoning_effort: "none", max_completion_tokens: request.maxTokens } as Params,
    ...(model === FALLBACK_OPENAI_MODEL ? [] : [{ ...base, model: FALLBACK_OPENAI_MODEL, temperature: request.temperature, max_tokens: request.maxTokens } as Params]),
  ];
  const fresh = Date.now() - working.at < REPROBE_MS;
  let lastError: unknown;
  for (let i = fresh ? Math.min(working.index, attempts.length - 1) : 0; i < attempts.length; i++) {
    try {
      const result = await create(attempts[i]);
      working = { index: i, at: Date.now() };
      return result;
    } catch (error) {
      if (!rejectedRequest(error)) throw error;
      lastError = error;
    }
  }
  working = { index: 0, at: 0 };
  throw lastError;
}

export const resetModelChoice = () => { working = { index: 0, at: 0 }; };
