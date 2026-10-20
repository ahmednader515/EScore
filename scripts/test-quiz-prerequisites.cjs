const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const source = ts.transpileModule(fs.readFileSync("lib/quiz-prerequisites.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

async function check(overrides = {}) {
  let queriedLessons;
  const state = {
    course: { courseType: "HIERARCHICAL", isPublished: true },
    user: { role: "USER" }, teacher: { id: "teacher-a" },
    selected: "teacher-a", linked: null, lessons: [], ...overrides,
  };
  const db = {
    course: { findUnique: async () => state.course },
    user: { findUnique: async () => state.user },
    courseTeacher: { findFirst: async () => state.teacher },
    contentItem: {
      findFirst: async () => state.linked,
      findMany: async (query) => { queriedLessons = query; return state.lessons; },
    },
  };
  const exports = {};
  new Function("require", "exports", source)((name) => {
    if (name === "@/lib/db") return { db };
    if (name === "next/headers") return { cookies: async () => ({ get: () => state.selected ? { value: state.selected } : undefined }) };
    if (name === "@/lib/course-availability") return {
      isEffectivelyReleased: (layers) => !layers.some((layer) => layer.future),
    };
    throw new Error(name);
  }, exports);
  return { error: await exports.getQuizPrerequisiteError("student", "course", "quiz"), queriedLessons };
}

(async () => {
  assert.equal((await check({ course: { courseType: "STANDARD" } })).error, null);
  assert.equal((await check({ user: { role: "TEACHER" }, selected: null })).error, null);
  assert.ok((await check({ selected: null })).error);
  assert.ok((await check({ teacher: null })).error);
  assert.ok((await check({ lessons: [{ contentProgress: [], unit: {} }] })).error);
  assert.equal((await check({ lessons: [{ contentProgress: [{ id: "done" }], unit: {} }] })).error, null);
  assert.ok((await check({ lessons: [{ contentProgress: [{ id: "done" }], unit: {}, future: true }] })).error);
  const linked = { unitId: "unit-2", position: 3, isPublished: true, unit: { teacherId: "teacher-b", position: 2, isPublished: true } };
  const unitQuiz = await check({ linked, selected: "teacher-a" });
  assert.equal(unitQuiz.queriedLessons.where.unit.teacherId, "teacher-b");
  assert.deepEqual(unitQuiz.queriedLessons.where.OR, [
    { unit: { position: { lt: 2 } } }, { unitId: "unit-2", position: { lt: 3 } },
  ]);
  assert.equal(unitQuiz.error, null);
  assert.ok((await check({ linked: { ...linked, isPublished: false } })).error);
  assert.ok((await check({ course: { courseType: "HIERARCHICAL", isPublished: true, future: true } })).error);
  console.log("Quiz prerequisites: 11 checks passed");
})().catch((error) => { console.error(error); process.exitCode = 1; });
