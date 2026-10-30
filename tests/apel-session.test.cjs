const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const ts = require("typescript");

// Only these pure domain modules are transpiled; no browser or server code runs.
const allowed = new Set(["apel-session.ts", "question-mapping.ts"]);
require.extensions[".ts"] = (module, filename) => {
  assert.ok(allowed.has(path.basename(filename)), `Unexpected module: ${filename}`);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const {
  newApelSession,
  apelSessionSchema,
  apelAnalysisSchema,
  apelScores,
  apelAverage,
  nextApelQuestion,
  continueApelPause,
} = require("../src/lib/apel-session.ts");
const { QUESTION_MAPPING } = require("../src/lib/question-mapping.ts");

function started() {
  const s = newApelSession();
  s.step = "test";
  s.consent = true;
  s.members[0].present = s.members[1].present = true;
  s.members[0].name = "Sophie";
  s.members[1].name = "Marc";
  return s;
}

test("six roles, no invented participants, isolated 60-answer arrays", () => {
  const s = newApelSession();
  assert.equal(s.members.length, 6);
  assert.ok(s.members.every((m) => !m.present && m.answers.length === 60));
  s.members[0].answers[0] = true;
  assert.equal(s.members[1].answers[0], null);
  assert.ok(apelSessionSchema.safeParse(s).success);
});

test("mapping covers every question once and preserves existing categories", () => {
  const questions = Object.values(QUESTION_MAPPING)
    .flat()
    .sort((a, b) => a - b);
  assert.deepEqual(
    questions,
    Array.from({ length: 60 }, (_, i) => i + 1),
  );
  assert.deepEqual(apelScores(Array(60).fill(true)), {
    PNr: 10,
    PNf: 10,
    A: 10,
    EL: 10,
    EAS: 10,
    EAR: 10,
  });
  assert.deepEqual(apelScores(Array(60).fill(false)), {
    PNr: 0,
    PNf: 0,
    A: 0,
    EL: 0,
    EAS: 0,
    EAR: 0,
  });
  const answers = Array(60).fill(false);
  answers[3] = true;
  assert.equal(apelScores(answers).PNr, 1);
});

test("cannot advance while a selected member has not answered", () => {
  const s = started();
  s.members[0].answers[0] = true;
  assert.throws(() => nextApelQuestion(s), /Chaque participant/);
});

test("60 questions produce six pauses including the final block, ignoring absentees", () => {
  let s = started();
  let pauses = 0;
  for (let i = 0; i < 60; i++) {
    assert.equal(s.cur, i);
    s.members[0].answers[i] = true;
    s.members[1].answers[i] = false;
    s = nextApelQuestion(s);
    assert.ok(apelSessionSchema.safeParse(s).success);
    if ((i + 1) % 10 === 0) {
      assert.equal(s.step, "pause");
      pauses++;
      s = continueApelPause(s);
    } else assert.equal(s.step, "test");
  }
  assert.equal(pauses, 6);
  assert.equal(s.step, "reports");
  assert.ok(s.completedAt);
  assert.ok(apelSessionSchema.safeParse(s).success);
  assert.ok(s.members[2].answers.every((v) => v === null));
});

test("collective average keeps fractional scores without rounding", () => {
  const s = started();
  s.members[0].answers = Array(60).fill(false);
  s.members[1].answers = Array(60).fill(false);
  s.members[0].answers[3] = true;
  assert.equal(apelAverage(s.members.slice(0, 2)).PNr, 0.5);
  assert.throws(() => apelAverage([]), /Aucun participant/);
});

test("saved state rejects gaps, duplicate ids, missing consent and invalid pauses", () => {
  const s = started();
  s.cur = 1;
  assert.equal(apelSessionSchema.safeParse(s).success, false);
  s.cur = 0;
  s.consent = false;
  assert.equal(apelSessionSchema.safeParse(s).success, false);
  s.consent = true;
  s.members[1].id = s.members[0].id;
  assert.equal(apelSessionSchema.safeParse(s).success, false);
  const invalid = started();
  invalid.step = "pause";
  invalid.members[0].answers[0] = invalid.members[1].answers[0] = false;
  assert.equal(apelSessionSchema.safeParse(invalid).success, false);
});

test("API requires complete real answers, consent, and appropriate group size", () => {
  const member = { name: "Sophie", role: "Président", answers: Array(60).fill(true) };
  assert.ok(
    apelAnalysisSchema.safeParse({ mode: "individual", consent: true, members: [member] }).success,
  );
  assert.ok(
    apelAnalysisSchema.safeParse({
      mode: "collective",
      consent: true,
      members: [member, { ...member, name: "Marc" }],
    }).success,
  );
  for (const body of [
    { mode: "collective", consent: true, members: [member] },
    { mode: "individual", consent: false, members: [member] },
    { mode: "individual", consent: true, members: [{ ...member, answers: Array(59).fill(true) }] },
    { mode: "individual", consent: true, members: [{ ...member, answers: Array(60).fill(null) }] },
    { mode: "individual", consent: true, members: [{ ...member, name: " " }] },
    { mode: "individual", consent: true, members: [{ ...member, role: "" }] },
  ])
    assert.equal(apelAnalysisSchema.safeParse(body).success, false);
});

test("interrupted reports and agreements survive JSON serialization", () => {
  let s = started();
  s.members.slice(0, 2).forEach((m) => {
    m.answers = Array(60).fill(false);
  });
  s.cur = 59;
  s.step = "pause";
  s = continueApelPause(s);
  s.members[0].report = "Rapport déjà terminé";
  s.agreements[0].accepted = true;
  const recovered = apelSessionSchema.parse(JSON.parse(JSON.stringify(s)));
  assert.equal(recovered.members[0].report, "Rapport déjà terminé");
  assert.equal(recovered.members[1].report, undefined);
  assert.equal(recovered.agreements[0].accepted, true);
});
