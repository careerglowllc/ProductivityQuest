import test from "node:test";
import assert from "node:assert/strict";
import { createJsonCompletion, resetModelChoice, DEFAULT_OPENAI_MODEL, FALLBACK_OPENAI_MODEL } from "./openai-model";

const request = { messages: [{ role: "user" as const, content: "hi" }], maxTokens: 100, temperature: 0.2 };
const reply = { choices: [{ message: { content: "{}" } }] } as any;
const apiError = (status: number, code?: string) => Object.assign(new Error(`status ${status}`), { status, code });
function fake(...outcomes: Array<"ok" | Error>) {
  const calls: any[] = [];
  const create = async (params: any) => {
    calls.push(params);
    const outcome = outcomes[calls.length - 1] ?? "ok";
    if (outcome === "ok") return reply;
    throw outcome;
  };
  return { create, calls };
}
const reset = () => { delete process.env.OPENAI_MODEL; resetModelChoice(); };

test("defaults to Luna with no hidden reasoning, JSON output and no storage", async () => {
  reset();
  const { create, calls } = fake("ok");
  await createJsonCompletion(create, request);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, DEFAULT_OPENAI_MODEL);
  assert.equal(calls[0].reasoning_effort, "none");
  assert.equal(calls[0].temperature, 0.2);
  assert.equal(calls[0].max_completion_tokens, 100);
  assert.equal(calls[0].max_tokens, undefined);
  assert.equal(calls[0].store, false);
  assert.deepEqual(calls[0].response_format, { type: "json_object" });
});

test("drops temperature when the model rejects it", async () => {
  reset();
  const { create, calls } = fake(apiError(400, "unsupported_parameter"), "ok");
  await createJsonCompletion(create, request);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].model, DEFAULT_OPENAI_MODEL);
  assert.equal(calls[1].temperature, undefined);
});

test("falls back to the older model when Luna is unavailable", async () => {
  reset();
  const { create, calls } = fake(apiError(404, "model_not_found"), apiError(404, "model_not_found"), "ok");
  await createJsonCompletion(create, request);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].model, FALLBACK_OPENAI_MODEL);
  assert.equal(calls[2].max_tokens, 100);
  assert.equal(calls[2].reasoning_effort, undefined);
});

test("remembers the attempt that worked", async () => {
  reset();
  const first = fake(apiError(400), apiError(400), "ok");
  await createJsonCompletion(first.create, request);
  const second = fake("ok");
  await createJsonCompletion(second.create, request);
  assert.equal(second.calls.length, 1);
  assert.equal(second.calls[0].model, FALLBACK_OPENAI_MODEL);
});

test("billing, rate limit and outage errors are not retried", async () => {
  for (const error of [apiError(429, "credit_balance_exhausted"), apiError(429, "rate_limit_exceeded"), apiError(401), apiError(500)]) {
    reset();
    const { create, calls } = fake(error);
    await assert.rejects(createJsonCompletion(create, request), error);
    assert.equal(calls.length, 1);
  }
});

test("a 400 that is really a billing code is not retried", async () => {
  reset();
  const { create, calls } = fake(apiError(400, "insufficient_quota"));
  await assert.rejects(createJsonCompletion(create, request));
  assert.equal(calls.length, 1);
});

test("OPENAI_MODEL overrides the model, and the old model is not tried twice", async () => {
  reset();
  process.env.OPENAI_MODEL = FALLBACK_OPENAI_MODEL;
  const { create, calls } = fake(apiError(400), apiError(400));
  await assert.rejects(createJsonCompletion(create, request));
  assert.equal(calls.length, 2);
  assert.ok(calls.every(c => c.model === FALLBACK_OPENAI_MODEL));
  reset();
});

test("rethrows the last rejection when every attempt is refused", async () => {
  reset();
  const { create, calls } = fake(apiError(400), apiError(400), apiError(404));
  await assert.rejects(createJsonCompletion(create, request), (e: any) => e.status === 404);
  assert.equal(calls.length, 3);
});
