const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const { NextResponse } = require("next/server");

const source = ts.transpileModule(fs.readFileSync("app/api/courses/[courseId]/content/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

async function run(session) {
  const studentId = session?.user?.id;
  const queries = [];
  const db = {
    course: { findUnique: async () => ({ centerAvailableAt: null, onlineAvailableAt: null }) },
    user: { findUnique: async () => ({ studyType: "ONLINE" }) },
    chapter: { findMany: async () => [{ id: "chapter", title: "Lesson", position: 1 }] },
    quiz: { findMany: async (query) => {
      queries.push(query);
      if (studentId) {
        assert.deepEqual(query.include.quizResults.where, { studentId });
      } else {
        assert.equal(query.include.quizResults, false, "Guests must not receive other students' quiz results");
      }
      return [{ id: "quiz", title: "Exam", position: 2,
        ...(studentId ? { quizResults: [{ id: "result", percentage: 75 }] } : {}),
      }];
    } },
  };
  const exports = {};
  new Function("require", "exports", source)((name) => {
    if (name === "@/lib/db") return { db };
    if (name === "next/server") return { NextResponse };
    if (name === "next-auth") return { getServerSession: async () => session };
    if (name === "@/lib/auth") return { authOptions: {} };
    if (name === "@/lib/course-availability") return {
      isEffectivelyReleased: () => true, getEffectiveReleaseAt: () => null,
    };
    throw new Error(name);
  }, exports);
  const response = await exports.GET(new Request("http://localhost/api/courses/course/content"), {
    params: Promise.resolve({ courseId: "course" }),
  });
  assert.equal(response.status, 200);
  assert.equal(queries[0].where.courseId, "course");
  const content = await response.json();
  assert.deepEqual(content.map(({ id, type }) => ({ id, type })), [
    { id: "chapter", type: "chapter" }, { id: "quiz", type: "quiz" },
  ]);
  if (!studentId) assert.equal(content[1].quizResults, undefined);
}

(async () => {
  await run({ user: { id: "student-a", role: "USER" } });
  await run({ user: { id: "student-b", role: "USER" } });
  await run(null);
  console.log("Course content checks passed: student-scoped quiz results, guest privacy, and sidebar content ordering.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
