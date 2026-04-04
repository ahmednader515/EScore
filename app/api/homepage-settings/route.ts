import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HOMEPAGE_SETTINGS_DEFAULTS } from "@/lib/homepage-settings";

export async function GET() {
  try {
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
    console.error("[HOMEPAGE_SETTINGS_GET]", error);
    return NextResponse.json(
      { error: "Failed to load homepage settings" },
      { status: 500 }
    );
  }
}

