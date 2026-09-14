import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  capturedTiming,
  latencySummary,
  latencyGate,
} from "../scripts/eval-timing.mjs";
const bytes = Buffer.from('{"D1":[],"D2":[]}');
const valid = () => ({
  hits_sha256: createHash("sha256").update(bytes).digest("hex"),
  captured_at: "2026-09-12T11:07:38Z",
  browser: "Chrome",
  measurement: "Worker request round-trip",
  search_latency_ms: { D1: 22, D2: 38 },
});
test("captured browser timings determine the latency gate, never saved hit lookup time", () => {
  const timing = capturedTiming(valid(), bytes, ["D1", "D2"]);
  assert.equal(latencySummary(Object.values(timing.values)).p95_latency_ms, 38);
  assert.equal(latencyGate(38, 30).pass, false);
  assert.equal(latencyGate(38, 1500).pass, true);
});
test("missing timing is unmeasured and cannot pass a release gate", () => {
  assert.equal(capturedTiming(null, bytes, ["D1"]).values, null);
  const summary = latencySummary([null, null]);
  assert.equal(summary.p95_latency_ms, null);
  assert.equal(
    latencyGate(summary.p95_latency_ms, 1500).status,
    "NOT_MEASURED",
  );
  assert.equal(latencyGate(summary.p95_latency_ms, 1500).pass, false);
});
test("timings must match exact hit bytes and cover every case with finite nonnegative numbers", () => {
  assert.throws(
    () => capturedTiming(valid(), Buffer.from("{}"), ["D1"]),
    /SHA-256/,
  );
  for (const bad of [undefined, null, -1, NaN, Infinity, "22"]) {
    const m = valid();
    m.search_latency_ms.D1 = bad;
    assert.throws(
      () => capturedTiming(m, bytes, ["D1", "D2"]),
      /invalid browser timing/,
    );
  }
  assert.throws(
    () => capturedTiming({ ...valid(), measurement: "" }, bytes, ["D1"]),
    /scope/,
  );
});
