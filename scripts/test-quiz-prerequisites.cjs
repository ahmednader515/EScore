const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const source = ts.transpileModule(fs.readFileSync("lib/quiz-prerequisites.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function setup(overrides = {}) {
  const state = { role: "USER", items: [], scores: [], target: null, ...overrides };
  const calls = [];
  const course = { courseType: "HIERARCHICAL", isPublished: true };
  const db = {
    course: { findUnique: async () => course },
    user: { findUnique: async () => ({ role: state.role }) },
    contentItem: {
      findFirst: async () => state.target,
      findMany: async (query) => {
        calls.push(query);
        return state.items.filter((item) => item.unit.teacherId === query.where.unit.teacherId);
      },
    },
    quizResult: { findMany: async (query) => {
      assert.equal(query.where.percentage.gte, 50);
      assert.equal(query.where.studentId, "student");
      return state.scores.filter((result) => query.where.quizId.in.includes(result.quizId) && result.percentage >= query.where.percentage.gte);
    } },
  };
  const exports = {};
  new Function("require", "exports", source)((name) => {
    if (name === "@/lib/db") return { db };
    if (name === "@/lib/course-availability") return {
      isEffectivelyReleased: (layers) => !layers.some((layer) => layer.future),
    };
    throw new Error(name);
  }, exports);
  return { ...exports, calls, state, course };
}
function lesson(id, complete = false, extra = {}) {
  return { id, title: id, type: "VIDEO", quizId: null, quiz: null,
    unit: { teacherId: "teacher-a", isPublished: true },
    isPublished: true, contentProgress: [{ isCompleted: complete }], ...extra };
}
const quiz = lesson("exam", false, { type: "ASSIGNMENT", quizId: "quiz", quiz: { isPublished: true } });

(async () => {
  const { buildTeacherProgression } = setup();
  const evaluate = (items, passed = []) => buildTeacherProgression(items, new Set(passed), {});
  let errors = evaluate([lesson("first"), lesson("second"), quiz, lesson("after")]);
  assert.equal(errors.get("first"), null);
  assert.ok(errors.get("second"));
  assert.ok(errors.get("exam"));
  assert.ok(errors.get("after"));
  errors = evaluate([lesson("first", true), lesson("second"), quiz]);
  assert.equal(errors.get("second"), null);
  assert.ok(errors.get("exam"));
  errors = evaluate([lesson("first", true), quiz, lesson("after")]);
  assert.equal(errors.get("exam"), null);
  assert.match(errors.get("after"), /50/);
  errors = evaluate([lesson("first", true), quiz, lesson("after")], ["quiz"]);
  assert.equal(errors.get("after"), null);
  assert.ok(evaluate([quiz, lesson("after")]).get("after"));
  assert.ok(evaluate([{ ...quiz, contentProgress: [{ isCompleted: true }] }, lesson("after")]).get("after"));
  assert.equal(evaluate([lesson("first", true), { ...quiz, quiz: { isPublished: false } }, lesson("after")]).get("after"), null);
  assert.ok(evaluate([lesson("future", true, { future: true }), lesson("after")]).get("after"));
  const items = [lesson("first", true), quiz, lesson("after"), lesson("other", false, { unit: { teacherId: "teacher-b" } })];
  for (const score of [0, 49.99, 50, 100]) {
    const env = setup({ items, scores: [{ quizId: "quiz", percentage: score }] });
    const result = await env.getTeacherProgressionErrors("student", "course", "teacher-a");
    assert.equal(result.get("after") === null, score >= 50);
    assert.equal(result.has("other"), false);
    assert.equal(env.calls[0].where.unit.courseId, "course");
  }
  const env = setup({ items, scores: [{ quizId: "quiz", percentage: 80 }, { quizId: "quiz", percentage: 10 }] });
  assert.equal((await env.getTeacherProgressionErrors("student", "course", "teacher-a")).get("after"), null);
  const other = await env.getTeacherProgressionErrors("student", "course", "teacher-b");
  assert.equal(other.get("other"), null);
  assert.equal(other.has("exam"), false);
  assert.equal(await setup().getQuizPrerequisiteError("student", "course", "shared-quiz"), null);
  assert.equal((await setup({ role: "TEACHER" }).getTeacherProgressionErrors("student", "course", "teacher-a")).size, 0);
  const target = lesson("after", false, { unit: { teacherId: "teacher-a", isPublished: true, course: { isPublished: true } } });
  assert.ok(await setup({ items, target }).getContentPrerequisiteError("student", "course", "after"));
  assert.ok(await setup({ items, target }).getQuizPrerequisiteError("student", "course", "quiz"));
  assert.equal(await setup({ items, target, scores: [{ quizId: "quiz", percentage: 50 }] }).getContentPrerequisiteError("student", "course", "after"), null);
  assert.ok(await setup({ target: { ...target, isPublished: false } }).getContentPrerequisiteError("student", "course", "after"));
  console.log("Teacher progression checks passed: sequence, quiz pass threshold, teacher isolation, releases, direct access, and staff preview.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
