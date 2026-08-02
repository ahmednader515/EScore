/**
 * Import table exports from ./data/*.txt (CSV) into Neon PostgreSQL via Prisma.
 *
 * Skips empty .txt files. Shows a spinner and per-table row counts.
 *
 * Usage:
 *   npm run import:data
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

const DATA_DIR = path.resolve(process.cwd(), "data");

loadImportEnvFiles();
const prisma = new PrismaClient({ datasourceUrl: getPrismaDatasourceUrl() });

type Row = Record<string, string>;

interface ImportResult {
  table: string;
  file: string;
  imported: number;
  skipped: boolean;
}

function strOrNull(v: string | undefined): string | null {
  const t = v?.trim();
  return t === undefined || t === "" ? null : t;
}

function numOrNull(v: string | undefined): number | null {
  const t = v?.trim();
  if (t === undefined || t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function intOr(v: string | undefined, fallback: number): number {
  const n = numOrNull(v);
  return n === null ? fallback : Math.trunc(n);
}

function floatOr(v: string | undefined, fallback = 0): number {
  const n = numOrNull(v);
  return n === null ? fallback : n;
}

function boolField(v: string | undefined, defaultVal = false): boolean {
  if (v === undefined || v.trim() === "") return defaultVal;
  return String(v).toLowerCase() === "true";
}

function dateOrNull(v: string | undefined): Date | null {
  const t = v?.trim();
  if (t === undefined || t === "") return null;
  return new Date(t);
}

function parseStringArray(raw: string | undefined): string[] {
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

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function isFileEmpty(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return true;
  return fs.readFileSync(filePath, "utf8").trim().length === 0;
}

function loadRows(fileName: string): Row[] | null {
  const filePath = path.join(DATA_DIR, fileName);
  if (isFileEmpty(filePath)) return null;
  return parseCsvFile(filePath);
}

class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private i = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private label = "";

  start(label: string): void {
    this.label = label;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      const frame = this.frames[this.i % this.frames.length];
      this.i++;
      process.stdout.write(`\r  ${frame} ${this.label}`);
    }, 80);
  }

  update(label: string): void {
    this.label = label;
  }

  stop(finalLine: string): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    process.stdout.write(`\r${" ".repeat(Math.max(60, finalLine.length + 4))}\r`);
    console.log(finalLine);
  }
}

function progressLabel(table: string, done: number, total: number): string {
  const pct = total > 0 ? Math.round((done / total) * 100) : 100;
  return `${table}: ${done}/${total} (${pct}%)`;
}

async function importUsers(rows: Row[], spinner: Spinner): Promise<number> {
  const total = rows.length;
  let done = 0;
  spinner.start(progressLabel("User", done, total));

  for (const batch of chunkArray(rows, 50)) {
    await Promise.all(
      batch.map((r) =>
        prisma.user.upsert({
          where: { id: r.id },
          create: {
            id: r.id,
            fullName: r.fullName,
            phoneNumber: r.phoneNumber,
            parentPhoneNumber: r.parentPhoneNumber,
            hashedPassword: strOrNull(r.hashedPassword),
            image: strOrNull(r.image),
            role: r.role || "USER",
            balance: floatOr(r.balance, 0),
            grade: strOrNull(r.grade),
            studyType: strOrNull(r.studyType),
            governorate: strOrNull(r.governorate),
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          },
          update: {
            fullName: r.fullName,
            phoneNumber: r.phoneNumber,
            parentPhoneNumber: r.parentPhoneNumber,
            hashedPassword: strOrNull(r.hashedPassword),
            image: strOrNull(r.image),
            role: r.role || "USER",
            balance: floatOr(r.balance, 0),
            grade: strOrNull(r.grade),
            studyType: strOrNull(r.studyType),
            governorate: strOrNull(r.governorate),
            updatedAt: new Date(r.updatedAt),
          },
        })
      )
    );
    done += batch.length;
    spinner.update(progressLabel("User", done, total));
  }
  return done;
}

async function importHomepageSettings(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await prisma.homepageSetting.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        isActive: boolField(r.isActive, true),
        heroMainText: r.heroMainText,
        heroSubText: r.heroSubText,
        primaryCtaText: r.primaryCtaText,
        reelsCtaText: r.reelsCtaText,
        coursesTitle: r.coursesTitle,
        coursesSubtitle: r.coursesSubtitle,
        teacherName1: r.teacherName1,
        teacherName2: r.teacherName2,
        teacherName3: r.teacherName3,
        heroImage1: r.heroImage1,
        heroImage2: r.heroImage2,
        heroImage3: r.heroImage3,
        brandPrimary: r.brandPrimary,
        brandAccent: r.brandAccent,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        isActive: boolField(r.isActive, true),
        heroMainText: r.heroMainText,
        heroSubText: r.heroSubText,
        primaryCtaText: r.primaryCtaText,
        reelsCtaText: r.reelsCtaText,
        coursesTitle: r.coursesTitle,
        coursesSubtitle: r.coursesSubtitle,
        teacherName1: r.teacherName1,
        teacherName2: r.teacherName2,
        teacherName3: r.teacherName3,
        heroImage1: r.heroImage1,
        heroImage2: r.heroImage2,
        heroImage3: r.heroImage3,
        brandPrimary: r.brandPrimary,
        brandAccent: r.brandAccent,
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importCourses(rows: Row[], spinner: Spinner): Promise<number> {
  const total = rows.length;
  let done = 0;
  spinner.start(progressLabel("Course", done, total));

  for (const r of rows) {
    const price = numOrNull(r.price);
    await prisma.course.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        userId: r.userId,
        title: r.title,
        description: strOrNull(r.description),
        imageUrl: strOrNull(r.imageUrl),
        price,
        isPublished: boolField(r.isPublished, false),
        grade: strOrNull(r.grade),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        userId: r.userId,
        title: r.title,
        description: strOrNull(r.description),
        imageUrl: strOrNull(r.imageUrl),
        price,
        isPublished: boolField(r.isPublished, false),
        grade: strOrNull(r.grade),
        updatedAt: new Date(r.updatedAt),
      },
    });
    done++;
    if (done % 5 === 0 || done === total) {
      spinner.update(progressLabel("Course", done, total));
    }
  }
  return done;
}

async function importAttachments(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await prisma.attachment.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        name: r.name,
        url: r.url,
        courseId: r.courseId,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        name: r.name,
        url: r.url,
        courseId: r.courseId,
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importChapters(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await prisma.chapter.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        title: r.title,
        description: strOrNull(r.description),
        videoUrl: strOrNull(r.videoUrl),
        videoType: strOrNull(r.videoType) ?? "UPLOAD",
        youtubeVideoId: strOrNull(r.youtubeVideoId),
        documentUrl: strOrNull(r.documentUrl),
        documentName: strOrNull(r.documentName),
        position: intOr(r.position, 0),
        isPublished: boolField(r.isPublished, false),
        isFree: boolField(r.isFree, false),
        courseId: r.courseId,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        title: r.title,
        description: strOrNull(r.description),
        videoUrl: strOrNull(r.videoUrl),
        videoType: strOrNull(r.videoType) ?? "UPLOAD",
        youtubeVideoId: strOrNull(r.youtubeVideoId),
        documentUrl: strOrNull(r.documentUrl),
        documentName: strOrNull(r.documentName),
        position: intOr(r.position, 0),
        isPublished: boolField(r.isPublished, false),
        isFree: boolField(r.isFree, false),
        courseId: r.courseId,
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importChapterAttachments(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await prisma.chapterAttachment.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        name: r.name,
        url: r.url,
        position: intOr(r.position, 0),
        chapterId: r.chapterId,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        name: r.name,
        url: r.url,
        position: intOr(r.position, 0),
        chapterId: r.chapterId,
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importQuizzes(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await prisma.quiz.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        title: r.title,
        description: strOrNull(r.description),
        position: intOr(r.position, 0),
        isPublished: boolField(r.isPublished, false),
        isFree: boolField(r.isFree, false),
        timer: numOrNull(r.timer),
        maxAttempts: intOr(r.maxAttempts, 1),
        courseId: r.courseId,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        title: r.title,
        description: strOrNull(r.description),
        position: intOr(r.position, 0),
        isPublished: boolField(r.isPublished, false),
        isFree: boolField(r.isFree, false),
        timer: numOrNull(r.timer),
        maxAttempts: intOr(r.maxAttempts, 1),
        courseId: r.courseId,
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importQuestions(rows: Row[], spinner: Spinner): Promise<number> {
  const total = rows.length;
  let done = 0;
  spinner.start(progressLabel("Question", done, total));

  for (const r of rows) {
    await prisma.question.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        text: r.text,
        type: r.type,
        options: strOrNull(r.options),
        correctAnswer: r.correctAnswer,
        points: intOr(r.points, 1),
        imageUrl: strOrNull(r.imageUrl),
        position: intOr(r.position, 1),
        quizId: r.quizId,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        text: r.text,
        type: r.type,
        options: strOrNull(r.options),
        correctAnswer: r.correctAnswer,
        points: intOr(r.points, 1),
        imageUrl: strOrNull(r.imageUrl),
        position: intOr(r.position, 1),
        quizId: r.quizId,
        updatedAt: new Date(r.updatedAt),
      },
    });
    done++;
    if (done % 10 === 0 || done === total) {
      spinner.update(progressLabel("Question", done, total));
    }
  }
  return done;
}

async function importPurchases(rows: Row[], spinner: Spinner): Promise<number> {
  const total = rows.length;
  let done = 0;
  spinner.start(progressLabel("Purchase", done, total));

  for (const batch of chunkArray(rows, 100)) {
    await Promise.all(
      batch.map((r) =>
        prisma.purchase.upsert({
          where: {
            userId_courseId: {
              userId: r.userId,
              courseId: r.courseId,
            },
          },
          create: {
            id: r.id,
            userId: r.userId,
            courseId: r.courseId,
            status: r.status || "ACTIVE",
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          },
          update: {
            status: r.status || "ACTIVE",
            updatedAt: new Date(r.updatedAt),
          },
        })
      )
    );
    done += batch.length;
    spinner.update(progressLabel("Purchase", done, total));
  }
  return done;
}

async function importBalanceTransactions(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await prisma.balanceTransaction.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        userId: r.userId,
        amount: floatOr(r.amount, 0),
        type: r.type,
        description: r.description,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        userId: r.userId,
        amount: floatOr(r.amount, 0),
        type: r.type,
        description: r.description,
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importUserProgress(rows: Row[], spinner: Spinner): Promise<number> {
  const total = rows.length;
  let done = 0;
  spinner.start(progressLabel("UserProgress", done, total));

  for (const batch of chunkArray(rows, 100)) {
    await Promise.all(
      batch.map((r) =>
        prisma.userProgress.upsert({
          where: {
            userId_chapterId: {
              userId: r.userId,
              chapterId: r.chapterId,
            },
          },
          create: {
            id: r.id,
            userId: r.userId,
            chapterId: r.chapterId,
            isCompleted: boolField(r.isCompleted, false),
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          },
          update: {
            isCompleted: boolField(r.isCompleted, false),
            updatedAt: new Date(r.updatedAt),
          },
        })
      )
    );
    done += batch.length;
    spinner.update(progressLabel("UserProgress", done, total));
  }
  return done;
}

async function importQuizResults(rows: Row[], spinner: Spinner): Promise<number> {
  const total = rows.length;
  let done = 0;
  spinner.start(progressLabel("QuizResult", done, total));

  for (const batch of chunkArray(rows, 50)) {
    await Promise.all(
      batch.map((r) =>
        prisma.quizResult.upsert({
          where: { id: r.id },
          create: {
            id: r.id,
            studentId: r.studentId,
            quizId: r.quizId,
            score: intOr(r.score, 0),
            totalPoints: intOr(r.totalPoints, 0),
            percentage: floatOr(r.percentage, 0),
            attemptNumber: intOr(r.attemptNumber, 1),
            submittedAt: new Date(r.submittedAt),
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          },
          update: {
            studentId: r.studentId,
            quizId: r.quizId,
            score: intOr(r.score, 0),
            totalPoints: intOr(r.totalPoints, 0),
            percentage: floatOr(r.percentage, 0),
            attemptNumber: intOr(r.attemptNumber, 1),
            submittedAt: new Date(r.submittedAt),
            updatedAt: new Date(r.updatedAt),
          },
        })
      )
    );
    done += batch.length;
    spinner.update(progressLabel("QuizResult", done, total));
  }
  return done;
}

async function importQuizAttempts(rows: Row[], spinner: Spinner): Promise<number> {
  const total = rows.length;
  let done = 0;
  let inserted = 0;
  spinner.start(progressLabel("QuizAttempt", done, total));

  for (const r of rows) {
    try {
      await prisma.quizAttempt.upsert({
        where: { id: r.id },
        create: {
          id: r.id,
          studentId: r.studentId,
          quizId: r.quizId,
          startedAt: new Date(r.startedAt),
          completedAt: dateOrNull(r.completedAt),
        },
        update: {
          studentId: r.studentId,
          quizId: r.quizId,
          startedAt: new Date(r.startedAt),
          completedAt: dateOrNull(r.completedAt),
        },
      });
      inserted++;
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code !== "P2002") throw e;
    }
    done++;
    if (done % 25 === 0 || done === total) {
      spinner.update(progressLabel("QuizAttempt", done, total));
    }
  }
  return inserted;
}

async function importQuizAnswers(rows: Row[], spinner: Spinner): Promise<number> {
  const total = rows.length;
  let done = 0;
  spinner.start(progressLabel("QuizAnswer", done, total));

  for (const batch of chunkArray(rows, 100)) {
    await Promise.all(
      batch.map((r) =>
        prisma.quizAnswer.upsert({
          where: { id: r.id },
          create: {
            id: r.id,
            questionId: r.questionId,
            quizResultId: r.quizResultId,
            studentAnswer: r.studentAnswer ?? "",
            correctAnswer: r.correctAnswer,
            isCorrect: boolField(r.isCorrect, false),
            pointsEarned: intOr(r.pointsEarned, 0),
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          },
          update: {
            questionId: r.questionId,
            quizResultId: r.quizResultId,
            studentAnswer: r.studentAnswer ?? "",
            correctAnswer: r.correctAnswer,
            isCorrect: boolField(r.isCorrect, false),
            pointsEarned: intOr(r.pointsEarned, 0),
            updatedAt: new Date(r.updatedAt),
          },
        })
      )
    );
    done += batch.length;
    spinner.update(progressLabel("QuizAnswer", done, total));
  }
  return done;
}

async function importPromoCodes(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    const usedCount =
      r.usedCount?.trim() === "" ? 0 : parseInt(r.usedCount, 10) || 0;
    await prisma.promoCode.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        code: r.code,
        courseId: strOrNull(r.courseId),
        description: strOrNull(r.description),
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
        courseId: strOrNull(r.courseId),
        description: strOrNull(r.description),
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

async function importReelVideos(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await prisma.reelVideo.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        title: r.title,
        youtubeUrl: r.youtubeUrl,
        youtubeVideoId: r.youtubeVideoId,
        thumbnailUrl: strOrNull(r.thumbnailUrl),
        createdById: r.createdById,
        createdByName: strOrNull(r.createdByName),
        isPublished: boolField(r.isPublished, true),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        title: r.title,
        youtubeUrl: r.youtubeUrl,
        youtubeVideoId: r.youtubeVideoId,
        thumbnailUrl: strOrNull(r.thumbnailUrl),
        createdById: r.createdById,
        createdByName: strOrNull(r.createdByName),
        isPublished: boolField(r.isPublished, true),
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importLiveSessions(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await prisma.liveSession.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        title: r.title,
        description: strOrNull(r.description),
        linkUrl: r.linkUrl,
        linkType: r.linkType,
        startDate: new Date(r.startDate),
        endDate: dateOrNull(r.endDate),
        isPublished: boolField(r.isPublished, false),
        isFree: boolField(r.isFree, false),
        chapterId: strOrNull(r.chapterId),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        title: r.title,
        description: strOrNull(r.description),
        linkUrl: r.linkUrl,
        linkType: r.linkType,
        startDate: new Date(r.startDate),
        endDate: dateOrNull(r.endDate),
        isPublished: boolField(r.isPublished, false),
        isFree: boolField(r.isFree, false),
        chapterId: strOrNull(r.chapterId),
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

async function importLiveSessionCourses(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await prisma.liveSessionCourse.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        liveSessionId: r.liveSessionId,
        courseId: r.courseId,
        createdAt: new Date(r.createdAt),
      },
      update: {
        liveSessionId: r.liveSessionId,
        courseId: r.courseId,
      },
    });
    n++;
  }
  return n;
}

async function importChatThreads(rows: Row[]): Promise<number> {
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

async function importChatMessages(rows: Row[]): Promise<number> {
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

async function importGlobalNotifications(rows: Row[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await prisma.globalNotification.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        title: r.title,
        message: r.message,
        targetGrades: parseStringArray(r.targetGrades),
        isActive: boolField(r.isActive, true),
        startsAt: dateOrNull(r.startsAt),
        endsAt: dateOrNull(r.endsAt),
        createdById: strOrNull(r.createdById),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        title: r.title,
        message: r.message,
        targetGrades: parseStringArray(r.targetGrades),
        isActive: boolField(r.isActive, true),
        startsAt: dateOrNull(r.startsAt),
        endsAt: dateOrNull(r.endsAt),
        createdById: strOrNull(r.createdById),
        updatedAt: new Date(r.updatedAt),
      },
    });
    n++;
  }
  return n;
}

type TableJob = {
  table: string;
  file: string;
  run: (rows: Row[], spinner: Spinner) => Promise<number>;
};

const TABLE_JOBS: TableJob[] = [
  { table: "User", file: "user.txt", run: importUsers },
  {
    table: "HomepageSetting",
    file: "homepage setting.txt",
    run: async (rows) => importHomepageSettings(rows),
  },
  { table: "Course", file: "course.txt", run: importCourses },
  { table: "Attachment", file: "attachment.txt", run: async (rows) => importAttachments(rows) },
  { table: "Chapter", file: "chapter.txt", run: async (rows) => importChapters(rows) },
  {
    table: "ChapterAttachment",
    file: "chapter attachment.txt",
    run: async (rows) => importChapterAttachments(rows),
  },
  { table: "Quiz", file: "quiz.txt", run: async (rows) => importQuizzes(rows) },
  { table: "Question", file: "question.txt", run: importQuestions },
  { table: "Purchase", file: "purchase.txt", run: importPurchases },
  {
    table: "BalanceTransaction",
    file: "balance transaction.txt",
    run: async (rows) => importBalanceTransactions(rows),
  },
  { table: "UserProgress", file: "user progress.txt", run: importUserProgress },
  { table: "QuizResult", file: "quiz result.txt", run: importQuizResults },
  { table: "QuizAttempt", file: "quiz attempt.txt", run: importQuizAttempts },
  { table: "QuizAnswer", file: "quiz answer.txt", run: importQuizAnswers },
  { table: "PromoCode", file: "promocode.txt", run: async (rows) => importPromoCodes(rows) },
  { table: "ReelVideo", file: "reel video.txt", run: async (rows) => importReelVideos(rows) },
  { table: "LiveSession", file: "live session.txt", run: async (rows) => importLiveSessions(rows) },
  {
    table: "LiveSessionCourse",
    file: "live session course.txt",
    run: async (rows) => importLiveSessionCourses(rows),
  },
  { table: "ChatThread", file: "chat thread.txt", run: async (rows) => importChatThreads(rows) },
  { table: "ChatMessage", file: "chat message.txt", run: async (rows) => importChatMessages(rows) },
  {
    table: "GlobalNotification",
    file: "global notification.txt",
    run: async (rows) => importGlobalNotifications(rows),
  },
];

async function main(): Promise<void> {
  const dbUrl = getPrismaDatasourceUrl().replace(/:[^:@]+@/, ":****@");
  console.log("Importing data from ./data into Neon PostgreSQL");
  console.log(`Database: ${dbUrl}\n`);

  const spinner = new Spinner();
  const results: ImportResult[] = [];
  let totalImported = 0;

  spinner.start("Connecting to database…");
  await prisma.$connect();
  spinner.stop("  Connected.\n");

  for (const job of TABLE_JOBS) {
    const filePath = path.join(DATA_DIR, job.file);

    if (isFileEmpty(filePath)) {
      results.push({
        table: job.table,
        file: job.file,
        imported: 0,
        skipped: true,
      });
      console.log(`  ⊘ ${job.table.padEnd(22)} skipped (empty file: ${job.file})`);
      continue;
    }

    const rows = loadRows(job.file)!;
    const count = rows.length;

    if (count === 0) {
      results.push({
        table: job.table,
        file: job.file,
        imported: 0,
        skipped: true,
      });
      console.log(
        `  ⊘ ${job.table.padEnd(22)} skipped (no valid rows after filtering ${job.file})`
      );
      continue;
    }

    spinner.start(`Importing ${job.table} (0/${count})…`);
    const imported = await job.run(rows, spinner);
    spinner.stop(
      `  ✓ ${job.table.padEnd(22)} ${String(imported).padStart(6)} row(s)  ← ${job.file}`
    );

    results.push({
      table: job.table,
      file: job.file,
      imported,
      skipped: false,
    });
    totalImported += imported;
  }

  console.log("\n── Summary ──────────────────────────────────────");
  console.log(
    `${"Table".padEnd(22)} ${"Rows".padStart(8)}  ${"Source".padEnd(28)} Status`
  );
  console.log("─".repeat(72));

  for (const r of results) {
    const status = r.skipped ? "skipped (empty)" : "imported";
    console.log(
      `${r.table.padEnd(22)} ${String(r.imported).padStart(8)}  ${r.file.padEnd(28)} ${status}`
    );
  }

  console.log("─".repeat(72));
  console.log(`${"TOTAL".padEnd(22)} ${String(totalImported).padStart(8)}`);
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("\nImport failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
