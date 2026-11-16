import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

export type SharedAssessment = {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  isFree: boolean;
  sharedUnitPosition: number | null;
  sharedAfterPosition: number | null;
  quizResults?: { percentage: number }[];
};

export const sharedAssessmentItemId = (quizId: string, unitId: string) => `shared:${quizId}:${unitId}`;

export async function getSharedAssessments(courseId: string, userId: string, includeDrafts = false) {
  return (db as PrismaClient).quiz.findMany({
    where: { courseId, isGlobalShared: true, ...(includeDrafts ? {} : { isPublished: true }) },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: {
      id: true, title: true, description: true, isPublished: true, isFree: true,
      sharedUnitPosition: true, sharedAfterPosition: true,
      quizResults: { where: { studentId: userId }, select: { percentage: true }, orderBy: { percentage: "desc" }, take: 1 },
    },
  });
}

/** Keep existing course-wide quizzes accessible until a milestone is assigned. */
export async function getUnplacedSharedAssessments(courseId: string, userId: string) {
  return (db as PrismaClient).quiz.findMany({
    where: { courseId, unitId: null, isGlobalShared: false, isPublished: true, contentItems: { none: {} } },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: {
      id: true, title: true, description: true, isPublished: true, isFree: true,
      sharedUnitPosition: true, sharedAfterPosition: true,
      quizResults: { where: { studentId: userId }, select: { percentage: true }, orderBy: { percentage: "desc" }, take: 1 },
    },
  });
}

/** Virtual placements always reference the original quiz; no questions or scores are copied. */
export function embedSharedAssessments<T extends { id: string; position: number }>(
  items: T[], unit: { id: string; position: number }, quizzes: SharedAssessment[],
) {
  const sharedItems = quizzes.filter((quiz) => quiz.sharedUnitPosition === unit.position).map((quiz) => ({
    id: sharedAssessmentItemId(quiz.id, unit.id),
    unitId: unit.id,
    type: "ASSIGNMENT" as const,
    title: quiz.title,
    description: quiz.description,
    position: quiz.sharedAfterPosition ?? 0,
    isPublished: quiz.isPublished,
    isFree: quiz.isFree,
    isGlobalShared: true as const,
    quizId: quiz.id,
    quiz,
    contentProgress: [] as { isCompleted: boolean }[],
    attachments: [],
    videoUrl: null, youtubeVideoId: null, videoType: null,
    imageUrl: null, fileUrl: null, fileName: null,
    centerAvailableAt: null, onlineAvailableAt: null,
  }));
  return [...items.map((item) => ({ item, shared: false })), ...sharedItems.map((item) => ({ item, shared: true }))]
    .sort((a, b) => a.item.position - b.item.position || Number(a.shared) - Number(b.shared))
    .map(({ item }) => item);
}
