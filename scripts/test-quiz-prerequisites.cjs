const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const source = ts.transpileModule(fs.readFileSync("lib/quiz-prerequisites.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(overrides = {}) {
  const state = { role: "USER", items: [], scores: [], target: null, sharedQuizzes: [], ...overrides };
  const calls = [];
  const course = { courseType: "HIERARCHICAL", isPublished: true };
  const unitFor = (item) => ({ ...item.unit, id: item.unitId ?? item.unit.id ?? `unit-${item.unit.teacherId}-${item.unit.position ?? 1}`, position: item.unit.position ?? 1 });
  const units = () => state.units ?? [...new Map(state.items.map((item) => { const unit = unitFor(item); return [unit.id, unit]; })).values()];
  const db = {
    course: { findUnique: async () => course },
    user: { findUnique: async () => ({ role: state.role }) },
    unit: { findMany: async ({ where }) => units().filter((unit) =>
      (where.position === undefined || unit.position === where.position) && (!where.isPublished || unit.isPublished)) },
    quiz: {
      findFirst: async ({ where }) => state.sharedQuizzes.find((quiz) => quiz.id === where.id) ?? null,
      findMany: async () => state.sharedQuizzes.filter((quiz) => quiz.isPublished),
    },
    contentItem: {
      findFirst: async () => state.target,
      findMany: async (query) => {
        calls.push(query);
        return state.items.filter((item) => typeof query.where.unit.teacherId === "object"
          ? item.unit.teacherId != null
          : item.unit.teacherId === query.where.unit.teacherId).map((item, index) => ({ ...item, position: item.position ?? index + 1, unitId: unitFor(item).id, unit: unitFor(item) }));
      },
    },
    quizResult: { findMany: async (query) => {
      assert.equal(query.where.percentage.gte, 50);
      assert.equal(query.where.studentId, "student");
      return state.scores.filter((result) => query.where.quizId.in.includes(result.quizId) && result.percentage >= query.where.percentage.gte);
    } },
  };
  const exports = {};
  const sharedExports = {};
  new Function("require", "exports", ts.transpileModule(fs.readFileSync("lib/shared-assessments.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText)((name) => {
    if (name === "@/lib/db") return { db };
    throw new Error(name);
  }, sharedExports);
  new Function("require", "exports", source)((name) => {
    if (name === "@/lib/db") return { db };
    if (name === "@/lib/shared-assessments") return sharedExports;
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
  const teacherPath = (teacherId) => {
    const unit = { teacherId, isPublished: true, course: { isPublished: true } };
    return [
      lesson(`${teacherId}-first`, teacherId === "a", { unit }),
      lesson(`${teacherId}-exam1`, false, { unit, type: "ASSIGNMENT", quizId: `${teacherId}-quiz1`, quiz: { isPublished: true } }),
      lesson(`${teacherId}-second`, teacherId === "b", { unit }),
      lesson(`${teacherId}-exam2`, false, { unit, type: "ASSIGNMENT", quizId: `${teacherId}-quiz2`, quiz: { isPublished: true } }),
      lesson(`${teacherId}-third`, false, { unit }),
    ];
  };
  const unifiedItems = ["a", "b", "c"].flatMap(teacherPath);
  const unified = setup({ items: unifiedItems, scores: [{ quizId: "a-quiz1", percentage: 50 }] });
  for (const teacherId of ["a", "b", "c"]) {
    const path = await unified.getTeacherProgressionState("student", "course", teacherId);
    assert.equal(path.errors.get(`${teacherId}-second`), null);
    assert.equal(path.errors.get(`${teacherId}-exam2`), null);
    assert.ok(path.errors.get(`${teacherId}-third`));
    assert.equal(path.completedIds.has(`${teacherId}-first`), true);
    assert.equal(path.completedIds.has(`${teacherId}-exam1`), true);
    assert.equal(path.completedIds.has(`${teacherId}-second`), true);
  }
  unified.state.scores.push({ quizId: "c-quiz2", percentage: 49.99 });
  assert.ok((await unified.getTeacherProgressionErrors("student", "course", "b")).get("b-third"));
  unified.state.scores.push({ quizId: "c-quiz2", percentage: 50 });
  for (const teacherId of ["a", "b", "c"]) {
    assert.equal((await unified.getTeacherProgressionErrors("student", "course", teacherId)).get(`${teacherId}-third`), null);
  }
  unified.state.target = unifiedItems.find((item) => item.id === "b-third");
  assert.equal(await unified.getContentPrerequisiteError("student", "course", "b-third"), null);
  unified.state.target = { ...unified.state.target, future: true };
  assert.ok(await unified.getContentPrerequisiteError("student", "course", "b-third"));
  assert.equal(unifiedItems.find((item) => item.id === "c-first").contentProgress[0].isCompleted, false);
  assert.equal(unified.state.scores.some((result) => result.quizId === "b-quiz1"), false);
  assert.equal(unified.calls[0].where.unit.courseId, "course");
  const noPass = setup({ items: unifiedItems });
  assert.ok((await noPass.getTeacherProgressionErrors("student", "course", "c")).get("c-second"));
  // A PDF inserted in one path does not change which videos or quizzes correspond.
  const withPdf = [lesson("a-pdf", false, { type: "PDF", unit: { teacherId: "a" } }), ...unifiedItems];
  const credit = unified.getUnifiedCompletedIds(withPdf, new Set(["a-quiz1"]), {});
  assert.equal(credit.has("c-first"), true);
  assert.equal(credit.has("c-exam1"), true);
  assert.equal(credit.has("a-pdf"), false);
  const globalQuiz = { id: "global", title: "Grammar", description: null, isGlobalShared: true, isPublished: true, isFree: false, sharedUnitPosition: 1, sharedAfterPosition: 2 };
  const globalItems = ["a", "b", "c"].flatMap((teacherId) => [1, 2, 3].map((position) =>
    lesson(`${teacherId}-${position}`, (teacherId === "a" && position === 1) || (teacherId === "b" && position === 2), {
      position, unit: { teacherId, position: 1, isPublished: true, course: { isPublished: true } },
    })));
  const global = setup({ items: globalItems, sharedQuizzes: [globalQuiz] });
  for (const teacherId of ["a", "b", "c"]) {
    const path = await global.getTeacherProgressionState("student", "course", teacherId);
    assert.equal(path.errors.get(`shared:global:unit-${teacherId}-1`), null, "Lessons completed across two teachers unlock the exam everywhere");
    assert.ok(path.errors.get(`${teacherId}-3`), "Next lesson is locked until the exact global quiz is passed");
  }
  assert.equal(await global.getQuizPrerequisiteError("student", "course", "global"), null);
  global.state.scores.push({ quizId: "global", percentage: 49.99 });
  assert.ok((await global.getTeacherProgressionErrors("student", "course", "c")).get("c-3"));
  global.state.scores.push({ quizId: "global", percentage: 50 });
  for (const teacherId of ["a", "b", "c"]) {
    const path = await global.getTeacherProgressionState("student", "course", teacherId);
    assert.equal(path.errors.get(`${teacherId}-3`), null);
    assert.ok(path.completedIds.has(`shared:global:unit-${teacherId}-1`));
  }
  const globalState = await global.getCourseProgressionState("student", "course");
  const keys = global.getLearningMilestoneKeys(globalState.items);
  assert.equal(new Set(keys.values()).size, 4, "Three teacher paths count as three lessons and one exam");
  const blockedExam = setup({ items: globalItems.map((item) => ({ ...item, contentProgress: [] })), sharedQuizzes: [globalQuiz], scores: [{ quizId: "global", percentage: 100 }] });
  assert.ok(await blockedExam.getQuizPrerequisiteError("student", "course", "global"), "A historical passing score cannot bypass incomplete lessons");
  assert.ok((await blockedExam.getTeacherProgressionErrors("student", "course", "a")).get("a-3"));
  const unitMismatch = [
    lesson("a-unit1", true, { unit: { teacherId: "a", position: 1 } }),
    lesson("b-unit2", false, { unit: { teacherId: "b", position: 2 } }),
  ];
  assert.ok(!global.getUnifiedCompletedIds(unitMismatch, new Set(), {}).has("b-unit2"), "Different units must never exchange lesson credit");
  const missingUnit = setup({ items: [lesson("later-unit", false, { position: 1, unit: { teacherId: "c", position: 2, isPublished: true } })], sharedQuizzes: [globalQuiz] });
  assert.ok((await missingUnit.getTeacherProgressionErrors("student", "course", "c")).get("later-unit"), "Deleting the milestone unit cannot bypass its gate");
  assert.ok(await missingUnit.getQuizPrerequisiteError("student", "course", "global"));
  const extraGlobal = { ...globalQuiz, id: "global-2", sharedAfterPosition: 2 };
  const twoExams = setup({ items: globalItems, sharedQuizzes: [globalQuiz, extraGlobal], scores: [{ quizId: "global", percentage: 100 }] });
  assert.ok((await twoExams.getTeacherProgressionErrors("student", "course", "a")).get("a-3"), "Passing another shared exam never substitutes for the required exam");
  console.log("Global assessment checks passed: inline placement across three paths, mixed-teacher lessons, exact quiz identity, central 50% pass, unit isolation, missing-unit locks, and unique progress milestones.");
  console.log("Progression checks passed: shared lesson/quiz credit across three teachers, 50% threshold, release locks, direct access, and original records preserved.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
