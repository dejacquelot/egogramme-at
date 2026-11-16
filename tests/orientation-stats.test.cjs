const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const ts = require("typescript");
const allowed = new Set(["orientation-stats.ts", "track-orientation.ts"]);
const transpile = (filename) => ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
require.extensions[".ts"] = (module, filename) => {
  assert.ok(allowed.has(path.basename(filename)), `Unexpected module: ${filename}`);
  module._compile(transpile(filename), filename);
};
const {
  orientationEventSchema, aggregateOrientation, orientationPlanReady,
} = require("../src/lib/orientation-stats.ts");
const { createOrientationEvent, sendOrientationEvent } = require("../src/lib/track-orientation.ts");
const since = new Date("2026-11-15T00:00:00Z");
const until = new Date("2026-11-15T12:00:00Z");
const journey = crypto.randomUUID();
const other = crypto.randomUUID();
function event(kind, journeyId = journey, metadata = {}, date = "2026-11-15T10:00:00Z") {
  return { ...createOrientationEvent(journeyId, kind, metadata), block: null, attempt_id: null, duration_ms: null, ...metadata, created_at: date };
}
function route(filename, admin) {
  const module = { exports: {} };
  const context = {
    module, exports: module.exports, Response, Request, URL,
    console: { error() {} },
    require: (id) => {
      if (id === "@tanstack/react-router") return { createFileRoute: () => (config) => config };
      if (id === "@/lib/admin-config") return { isAdminEmail: (email) => email === "admin@example.test" };
      if (id === "@/integrations/supabase/client.server") return { supabaseAdmin: admin };
      if (id === "@/lib/orientation-stats") return require("../src/lib/orientation-stats.ts");
      if (id === "zod") return require("zod");
      throw new Error(`Unexpected route dependency: ${id}`);
    },
  };
  vm.runInNewContext(transpile(path.join(__dirname, "..", "src", "routes", "api", filename)), context);
  return module.exports.Route.server.handlers;
}

test("event validation refuses content, spoofed dates and incompatible metadata", () => {
  const plain = createOrientationEvent(journey, "pdf_downloaded");
  assert.ok(orientationEventSchema.safeParse(plain).success);
  for (const extra of [
    { answers: Array(60).fill(false) }, { notes: "Private" }, { scores: { A: 10 } },
    { career: "Designer" }, { created_at: "2020-01-01" }, { block: 1 }, { duration_ms: 4 },
  ]) assert.equal(orientationEventSchema.safeParse({ ...plain, ...extra }).success, false);
  assert.equal(orientationEventSchema.safeParse(createOrientationEvent(journey, "block_completed", { block: 7 })).success, false);
  assert.equal(orientationEventSchema.safeParse(createOrientationEvent(journey, "ai_completed")).success, false);
  assert.equal(orientationEventSchema.safeParse(createOrientationEvent(journey, "ai_completed", {
    attempt_id: crypto.randomUUID(), duration_ms: -1,
  })).success, false);
});

test("two PDF downloads count twice; an HTTP resend counts once; windows exclude earlier and future events", () => {
  const first = event("pdf_downloaded");
  const second = event("pdf_downloaded");
  const data = aggregateOrientation([
    first, { ...first }, second,
    event("pdf_downloaded", journey, {}, "2026-11-14T23:59:59Z"),
    event("pdf_downloaded", journey, {}, "2026-11-15T12:00:01Z"),
  ], since, until);
  assert.notEqual(first.id, second.id);
  assert.equal(data.pdfDownloads, 2);
});

test("completion and action rates use the start cohort, not unrelated completions or reopened parent panels", () => {
  const data = aggregateOrientation([
    event("started"), event("started"),
    event("test_completed"), event("test_completed", other),
    event("plan_ready"), event("plan_ready", other),
    event("parent_opened"), event("parent_opened"),
    event("started", other, {}, "2026-11-14T12:00:00Z"),
  ], since, until);
  assert.equal(data.started, 1);
  assert.equal(data.completed, 2);
  assert.equal(data.completionRate, 1);
  assert.equal(data.planRate, 1);
  assert.equal(data.parentsOpened, 1);
  assert.deepEqual(data.blocks.map((block) => block.count), [1, 1, 1, 1, 1, 1]);
  const empty = aggregateOrientation([], since, until);
  assert.equal(empty.completionRate, null);
  assert.equal(empty.planRate, null);
});

test("an action must include both a real experiment and a nonblank deadline", () => {
  assert.equal(orientationPlanReady({ experiment: "Fabriquer un objet", when: "Samedi" }), true);
  for (const plan of [
    { experiment: " ", when: "Samedi" }, { experiment: "Visiter un atelier", when: "\n " },
  ]) assert.equal(orientationPlanReady(plan), false);
});

test("AI failures exclude pending requests and optional non-use; median uses matched successful attempts", () => {
  const ids = Array.from({ length: 4 }, () => crypto.randomUUID());
  const rows = ids.map((id) => event("ai_requested", journey, { attempt_id: id }));
  rows.push(
    event("ai_completed", journey, { attempt_id: ids[0], duration_ms: 1200 }),
    event("ai_completed", journey, { attempt_id: ids[1], duration_ms: 3200 }),
    event("ai_failed", journey, { attempt_id: ids[2], duration_ms: 9000 }),
    event("ai_completed", other, { attempt_id: crypto.randomUUID(), duration_ms: 99 }),
  );
  const data = aggregateOrientation(rows, since, until);
  assert.equal(data.aiRequested, 4);
  assert.equal(data.aiCompleted, 3);
  assert.equal(data.aiPending, 1);
  assert.equal(data.aiFailureRate, 1 / 3);
  assert.equal(data.medianMs, 2200);
  assert.equal(aggregateOrientation([], since, until).aiFailureRate, null);
});

test("public endpoint validates and inserts idempotently without changing the original timestamp", async () => {
  const rows = new Map();
  const handler = route("public\\track-orientation.ts", {
    from: (name) => {
      assert.equal(name, "orientation_events");
      return { upsert: async (row, options) => {
        assert.equal(options.ignoreDuplicates, true);
        if (!rows.has(row.id)) rows.set(row.id, row);
        return { error: null };
      } };
    },
  }).POST;
  const body = createOrientationEvent(journey, "pdf_downloaded");
  const post = (value) => handler({ request: new Request("https://example.test/api/public/track-orientation", {
    method: "POST", body: JSON.stringify(value),
  }) });
  assert.equal((await post({ ...body, notes: "Do not store" })).status, 400);
  assert.equal(rows.size, 0);
  assert.equal((await post(body)).status, 200);
  assert.equal((await post(body)).status, 200);
  assert.equal(rows.size, 1);
  assert.equal((await post(createOrientationEvent(journey, "pdf_downloaded"))).status, 200);
  assert.equal(rows.size, 2);
  assert.equal([...rows.values()].some((row) => "created_at" in row), false);
});

test("admin endpoint denies unauthenticated and non-admin access before reading events", async () => {
  let reads = 0;
  let email = "visitor@example.test";
  const handler = route("admin\\orientation-stats.ts", {
    auth: { getUser: async () => ({ data: { user: { email } }, error: null }) },
    from: () => {
      reads++;
      return { select: () => ({ eq: () => ({ lte: async () => ({ count: null, error: { code: "PGRST205" } }) }) }) };
    },
  }).GET;
  const get = (token) => handler({ request: new Request(`https://example.test/api/admin/orientation-stats?since=${encodeURIComponent(new Date(Date.now() - 3600_000).toISOString())}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }) });
  assert.equal((await get()).status, 401);
  assert.equal((await get("token")).status, 403);
  assert.equal(reads, 0);
  email = "admin@example.test";
  // A missing table must not produce success-shaped zero counters.
  const response = await get("token");
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /migration/);
});

test("a retry sends the exact same event ID and reports a terminal failure", async () => {
  const originalFetch = global.fetch;
  const bodies = [];
  let calls = 0;
  global.fetch = async (_url, init) => {
    bodies.push(init.body);
    return new Response("", { status: ++calls === 1 ? 503 : 200 });
  };
  try {
    await sendOrientationEvent(createOrientationEvent(journey, "pdf_downloaded"));
    assert.equal(bodies.length, 2);
    assert.equal(bodies[0], bodies[1]);
    global.fetch = async () => new Response("", { status: 400 });
    await assert.rejects(sendOrientationEvent(createOrientationEvent(journey, "pdf_downloaded")), /HTTP 400/);
  } finally {
    global.fetch = originalFetch;
  }
});
