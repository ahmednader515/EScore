/**
 * Import exported CSV/TSV data into ChatThread, ChatMessage, GlobalNotification,
 * PromoCode, and QuizAttempt (from scripts/data/quiz-w*.txt parts).
 *
 * Order: ChatThread → ChatMessage → GlobalNotification → PromoCode → QuizAttempt
 *
 * QuizAttempt: skips a row if the same id already exists, or if (studentId, quizId)
 * already exists (@@unique([studentId, quizId])).
 *
 * Usage:
 *   npm run import:exported-tables
 *
 * Requires DIRECT_DATABASE_URL or DATABASE_URL in .env / .env.local
 */
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import {
  loadImportEnvFiles,
  getPrismaDatasourceUrl,
  parseCsvFile,
} from "./csv-import-utils";

const DATA_DIR = path.resolve(process.cwd(), "scripts/data");

loadImportEnvFiles();
const datasourceUrl = getPrismaDatasourceUrl();
const prisma = new PrismaClient({ datasourceUrl });

function numOrNull(v: string | undefined): number | null {
  const t = v?.trim();
  if (t === undefined || t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function dateOrNull(v: string | undefined): Date | null {
  const t = v?.trim();
  if (t === undefined || t === "") return null;
  return new Date(t);
}

function boolField(v: string | undefined, defaultVal = false): boolean {
  if (v === undefined || v.trim() === "") return defaultVal;
  return String(v).toLowerCase() === "true";
}

function parseTargetGrades(raw: string | undefined): string[] {
  const t = raw?.trim();
  if (!t) return [];
  try {
    const parsed = JSON.parse(t) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

/** Quiz row: id,completedAt?,quizId,startedAt,studentId (no commas in ISO dates). */
function parseQuizLine(line: string): {
  id: string;
  completedAt: Date | null;
  quizId: string;
  startedAt: Date;
  studentId: string;
} {
  const parts = line.split(",");
  if (parts.length < 5) {
    throw new Error(`Expected ≥5 comma-separated fields: ${line}`);
  }
  const studentId = parts[parts.length - 1]!.trim();
  const startedAt = parts[parts.length - 2]!.trim();
  const quizId = parts[parts.length - 3]!.trim();
  const id = parts[0]!.trim();
  const completedAtRaw = parts.slice(1, parts.length - 3).join(",").trim();
  const completedAt =
    completedAtRaw === "" ? null : new Date(completedAtRaw);
  return {
    id,
    completedAt,
    quizId,
    startedAt: new Date(startedAt),
    studentId,
  };
}

function readQuizAttemptLines(): string[] {
  const names = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^quiz-w\d+\.txt$/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10);
      const nb = parseInt(b.replace(/\D/g, ""), 10);
      return na - nb;
    });
  const lines: string[] = [];
  for (const name of names) {
    const text = fs.readFileSync(path.join(DATA_DIR, name), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (t) lines.push(t);
    }
  }
  return lines;
}

async function importChatThreads(): Promise<number> {
  const rows = parseCsvFile(path.join(DATA_DIR, "chat-threads.csv"));
  let n = 0;
  for (const r of rows) {
    await prisma.chatThread.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        courseId: r.courseId,
        studentId: r.studentId,
        teacherId: r.teacherId,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        courseId: r.courseId,
        studentId: r.studentId,
        teacherId: r.teacherId,
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importChatMessages(): Promise<number> {
  const rows = parseCsvFile(path.join(DATA_DIR, "chat-messages.csv"));
  let n = 0;
  for (const r of rows) {
    await prisma.chatMessage.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        threadId: r.threadId,
        senderId: r.senderId,
        content: r.content,
        createdAt: new Date(r.createdAt),
      },
      update: {
        threadId: r.threadId,
        senderId: r.senderId,
        content: r.content,
        createdAt: new Date(r.createdAt),
      },
    });
    n++;
  }
  return n;
}

async function importGlobalNotifications(): Promise<number> {
  const rows = parseCsvFile(path.join(DATA_DIR, "global-notifications.csv"));
  let n = 0;
  for (const r of rows) {
    await prisma.globalNotification.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        title: r.title,
        message: r.message,
        targetGrades: parseTargetGrades(r.targetGrades),
        isActive: boolField(r.isActive, true),
        startsAt: dateOrNull(r.startsAt),
        endsAt: dateOrNull(r.endsAt),
        createdById: r.createdById?.trim() || null,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        title: r.title,
        message: r.message,
        targetGrades: parseTargetGrades(r.targetGrades),
        isActive: boolField(r.isActive, true),
        startsAt: dateOrNull(r.startsAt),
        endsAt: dateOrNull(r.endsAt),
        createdById: r.createdById?.trim() || null,
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importPromoCodes(): Promise<number> {
  const rows = parseCsvFile(path.join(DATA_DIR, "promo-codes.csv"));
  let n = 0;
  for (const r of rows) {
    const usedCount = r.usedCount?.trim() === "" ? 0 : parseInt(r.usedCount, 10) || 0;
    await prisma.promoCode.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        code: r.code,
        courseId: r.courseId?.trim() || null,
        description: r.description?.trim() || null,
        discountType: r.discountType,
        discountValue: parseFloat(r.discountValue),
        isActive: usedCount > 0 ? false : boolField(r.isActive, true),
        minPurchase: numOrNull(r.minPurchase),
        maxDiscount: numOrNull(r.maxDiscount),
        usageLimit: 1,
        usedCount,
        validFrom: dateOrNull(r.validFrom),
        validUntil: dateOrNull(r.validUntil),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        code: r.code,
        courseId: r.courseId?.trim() || null,
        description: r.description?.trim() || null,
        discountType: r.discountType,
        discountValue: parseFloat(r.discountValue),
        isActive: usedCount > 0 ? false : boolField(r.isActive, true),
        minPurchase: numOrNull(r.minPurchase),
        maxDiscount: numOrNull(r.maxDiscount),
        usageLimit: 1,
        usedCount,
        validFrom: dateOrNull(r.validFrom),
        validUntil: dateOrNull(r.validUntil),
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importQuizAttempts(): Promise<{ inserted: number; skipped: number }> {
  const lines = readQuizAttemptLines();
  let inserted = 0;
  let skipped = 0;
  for (const line of lines) {
    const row = parseQuizLine(line);
    const existing = await prisma.quizAttempt.findFirst({
      where: {
        OR: [
          { id: row.id },
          {
            studentId: row.studentId,
            quizId: row.quizId,
          },
        ],
      },
    });
    if (existing) {
      skipped++;
      continue;
    }
    try {
      await prisma.quizAttempt.create({
        data: {
          id: row.id,
          studentId: row.studentId,
          quizId: row.quizId,
          startedAt: row.startedAt,
          completedAt: row.completedAt,
        },
      });
      inserted++;
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === "P2002") skipped++;
      else throw e;
    }
  }
  return { inserted, skipped };
}

async function main(): Promise<void> {
  console.log("Importing exported tables from scripts/data …\n");

  const threads = await importChatThreads();
  console.log(`  ChatThread: ${threads} row(s)`);

  const messages = await importChatMessages();
  console.log(`  ChatMessage: ${messages} row(s)`);

  const globals = await importGlobalNotifications();
  console.log(`  GlobalNotification: ${globals} row(s)`);

  const promos = await importPromoCodes();
  console.log(`  PromoCode: ${promos} row(s)`);

  const quiz = await importQuizAttempts();
  console.log(
    `  QuizAttempt: ${quiz.inserted} inserted, ${quiz.skipped} skipped (duplicate id or studentId+quizId)`
  );

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
