/**
 * Import ReelVideo rows from a CSV file (same columns as Prisma ReelVideo export).
 *
 * Usage:
 *   npm run import:reel-videos
 *   npm run import:reel-videos -- path/to/custom.csv
 *
 * Uses DIRECT_DATABASE_URL or DATABASE_URL from .env / .env.local
 */
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import {
  loadImportEnvFiles,
  getPrismaDatasourceUrl,
  parseCsvFile,
} from "./csv-import-utils";

loadImportEnvFiles();
const datasourceUrl = getPrismaDatasourceUrl();

const EXPECTED = [
  "id",
  "createdAt",
  "createdById",
  "createdByName",
  "isPublished",
  "thumbnailUrl",
  "title",
  "updatedAt",
  "youtubeUrl",
  "youtubeVideoId",
] as const;

async function main(): Promise<void> {
  const csvPath = path.resolve(
    process.cwd(),
    process.argv[2] || "scripts/data/reel-videos.csv"
  );
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const records = parseCsvFile(csvPath);
  if (records.length === 0) {
    console.log("No data rows in CSV.");
    return;
  }

  for (const key of EXPECTED) {
    if (!(key in records[0])) {
      throw new Error(
        `CSV header must include "${key}". Found: ${Object.keys(records[0]).join(", ")}`
      );
    }
  }

  const prisma = new PrismaClient({ datasourceUrl });

  let ok = 0;
  for (const r of records) {
    const thumbnailUrl = r.thumbnailUrl?.trim() || null;
    const isPublished = String(r.isPublished).toLowerCase() === "true";

    await prisma.reelVideo.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        title: r.title,
        youtubeUrl: r.youtubeUrl,
        youtubeVideoId: r.youtubeVideoId,
        thumbnailUrl,
        createdById: r.createdById,
        createdByName: r.createdByName?.trim() || null,
        isPublished,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
      update: {
        title: r.title,
        youtubeUrl: r.youtubeUrl,
        youtubeVideoId: r.youtubeVideoId,
        thumbnailUrl,
        createdById: r.createdById,
        createdByName: r.createdByName?.trim() || null,
        isPublished,
        updatedAt: new Date(r.updatedAt),
      },
    });
    ok++;
  }

  await prisma.$disconnect();
  console.log(`Imported ${ok} ReelVideo row(s) from ${csvPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
