const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const { NextResponse } = require("next/server");
const source = ts.transpileModule(fs.readFileSync("app/api/teacher/quizzes/[quizId]/placement/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

async function run(overrides = {}) {
  const state = {
    session: { userId: "staff", user: { role: "TEACHER" } },
    quiz: { id: "global", courseId: "course", unitId: null, course: { courseType: "HIERARCHICAL" } },
    teachers: Array.from({ length: 3 }, () => ({ units: [{ contentItems: [{ position: 1 }, { position: 2 }] }] })),
    existingPlacements: 0,
    body: { isGlobalShared: true, sharedUnitPosition: 1, sharedAfterPosition: 2 },
    ...overrides,
  };
  const writes = [];
  const tx = {
    quiz: {
      findUnique: async () => state.quiz,
      update: async (query) => { writes.push(query); return query.data; },
    },
    courseTeacher: { findMany: async (query) => { assert.equal(query.where.courseId, "course"); return state.teachers; } },
    contentItem: { count: async () => state.existingPlacements },
  };
  const exports = {};
  new Function("require", "exports", source)((name) => {
    if (name === "next/server") return { NextResponse };
    if (name === "@/lib/db") return { db: { $transaction: async (callback) => callback(tx) } };
    if (name === "@/lib/auth") return { auth: async () => state.session };
    if (name === "@/lib/course-staff") return { isStaff: (role) => ["ADMIN", "TEACHER"].includes(role) };
    throw new Error(name);
  }, exports);
  const response = await exports.PATCH(new Request("http://localhost/placement", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state.body),
  }), { params: Promise.resolve({ quizId: "global" }) });
  return { response, writes };
}

(async () => {
  const success = await run();
  assert.equal(success.response.status, 200);
  assert.deepEqual(success.writes, [{ where: { id: "global" }, data: { isGlobalShared: true, sharedUnitPosition: 1, sharedAfterPosition: 2 } }]);
  assert.equal((await run({ session: { userId: "admin", user: { role: "ADMIN" } } })).response.status, 200);
  for (const [overrides, status] of [
    [{ session: { userId: null } }, 401],
    [{ session: { userId: "student", user: { role: "USER" } } }, 403],
    [{ quiz: null }, 404],
    [{ body: { isGlobalShared: "true" } }, 400],
    [{ body: { isGlobalShared: true, sharedUnitPosition: 1, sharedAfterPosition: -1 } }, 400],
    [{ body: { isGlobalShared: true, sharedUnitPosition: 1.5, sharedAfterPosition: 1 } }, 400],
    [{ teachers: [] }, 400],
    [{ teachers: [{ units: [] }] }, 400],
    [{ teachers: [{ units: [{ contentItems: [{ position: 1 }] }] }] }, 400],
    [{ existingPlacements: 1 }, 400],
    [{ quiz: { unitId: "unit", course: { courseType: "HIERARCHICAL" } } }, 400],
    [{ quiz: { unitId: null, course: { courseType: "FLAT" } } }, 400],
  ]) {
    const result = await run(overrides);
    assert.equal(result.response.status, status);
    assert.equal(result.writes.length, 0, "Invalid or unauthorized placement must not change the exam");
  }
  const disabled = await run({ body: { isGlobalShared: false } });
  assert.deepEqual(disabled.writes[0].data, { isGlobalShared: false, sharedUnitPosition: null, sharedAfterPosition: null });
  console.log("Shared placement checks passed: staff permissions, all-teacher node validation, invalid input, central update, and disabling embedding.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
