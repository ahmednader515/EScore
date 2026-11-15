const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const { NextResponse } = require("next/server");

const source = ts.transpileModule(
  fs.readFileSync("app/api/teacher/quizzes/[quizId]/route.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;

async function run({ session, exists = true, failDelete = false }) {
  const calls = [];
  const db = {
    quiz: {
      findUnique: async (query) => {
        calls.push(["find", query]);
        return exists ? { id: "shared-quiz" } : null;
      },
      delete: async (query) => {
        calls.push(["delete", query]);
        if (failDelete) throw new Error("Database unavailable");
        return { id: "shared-quiz" };
      },
    },
  };
  const exports = {};
  new Function("require", "exports", "console", source)((name) => {
    if (name === "@/lib/db") return { db };
    if (name === "@/lib/auth") return { auth: async () => session };
    if (name === "next/server") return { NextResponse };
    if (name === "@/lib/utils") return {};
    throw new Error(`Unexpected import: ${name}`);
  }, exports, { error: () => {} });

  const response = await exports.DELETE(
    new Request("http://localhost/api/teacher/quizzes/shared-quiz", { method: "DELETE" }),
    { params: Promise.resolve({ quizId: "shared-quiz" }) }
  );
  return { response, calls };
}

(async () => {
  for (const [session, status] of [
    [{ userId: null, user: null }, 401],
    [{ userId: "student", user: { role: "USER" } }, 403],
    [{ userId: "unknown", user: null }, 403],
  ]) {
    const result = await run({ session });
    assert.equal(result.response.status, status);
    assert.deepEqual(result.calls, [], "Unauthorized requests must not access quizzes");
  }

  for (const role of ["TEACHER", "ADMIN"]) {
    const session = { userId: "staff", user: { role } };
    const success = await run({ session });
    assert.equal(success.response.status, 204);
    assert.equal(await success.response.text(), "");
    assert.deepEqual(success.calls, [
      ["find", { where: { id: "shared-quiz" }, select: { id: true } }],
      ["delete", { where: { id: "shared-quiz" } }],
    ]);

    const missing = await run({ session, exists: false });
    assert.equal(missing.response.status, 404);
    assert.equal(missing.calls.length, 1, "Missing quizzes must not be deleted");

    const failure = await run({ session, failDelete: true });
    assert.equal(failure.response.status, 500);
    assert.deepEqual(await failure.response.json(), { error: "Internal Error" });
  }

  console.log("Teacher quiz deletion: authorization, success, missing quiz, and database failure checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
