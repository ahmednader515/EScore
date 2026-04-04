import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { HOMEPAGE_SETTINGS_DEFAULTS } from "@/lib/homepage-settings";

const editableKeys = [
  "heroMainText",
  "heroSubText",
  "primaryCtaText",
  "reelsCtaText",
  "coursesTitle",
  "coursesSubtitle",
  "teacherName1",
  "teacherName2",
  "teacherName3",
  "heroImage1",
  "heroImage2",
  "heroImage3",
  "brandPrimary",
  "brandAccent",
] as const;

type EditableKey = (typeof editableKeys)[number];

function sanitizeString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function sanitizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const color = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : fallback;
}

async function ensureTeacherOrAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { error: new NextResponse("Unauthorized", { status: 401 }) };
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    return { error: new NextResponse("Forbidden", { status: 403 }) };
  }

  return { session };
}

export async function GET() {
  try {
    const auth = await ensureTeacherOrAdmin();
    if (auth.error) return auth.error;

    const settings = await db.homepageSetting.upsert({
      where: { isActive: true },
      update: {},
      create: {
        isActive: true,
        ...HOMEPAGE_SETTINGS_DEFAULTS,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[TEACHER_HOMEPAGE_SETTINGS_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await ensureTeacherOrAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();

    const current = await db.homepageSetting.upsert({
      where: { isActive: true },
      update: {},
      create: {
        isActive: true,
        ...HOMEPAGE_SETTINGS_DEFAULTS,
      },
    });

    const updateData: Partial<Record<EditableKey, string>> = {};

    for (const key of editableKeys) {
      const fallback = current[key] ?? HOMEPAGE_SETTINGS_DEFAULTS[key];
      if (key === "brandPrimary" || key === "brandAccent") {
        updateData[key] = sanitizeColor(body?.[key], fallback);
      } else {
        updateData[key] = sanitizeString(body?.[key], fallback);
      }
    }

    const updated = await db.homepageSetting.update({
      where: { isActive: true },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[TEACHER_HOMEPAGE_SETTINGS_PATCH]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

