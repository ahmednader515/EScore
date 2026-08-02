import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET current user profile
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await db.user.findUnique({
            where: {
                id: session.user.id,
            },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                parentPhoneNumber: true,
                image: true,
                grade: true,
                studyType: true,
                governorate: true,
                role: true,
            },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("[PROFILE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PATCH update current user profile (grade only)
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { grade } = await req.json();

        // Validate that only grade is being updated
        const updateData: { grade?: string | null } = {};

        if (grade !== undefined) {
            // Validate grade value
            const validGrades = [
                "الاول الاعدادي",
                "الثاني الاعدادي",
                "الثالث الاعدادي",
                "الأول الثانوي",
                "الثاني الثانوي",
                "الثالث الثانوي",
            ];

            if (grade && !validGrades.includes(grade)) {
                return new NextResponse("Invalid grade value", { status: 400 });
            }

            updateData.grade = grade || null;
        }

        // Update user
        const updatedUser = await db.user.update({
            where: {
                id: session.user.id,
            },
            data: updateData,
            select: {
                id: true,
                fullName: true,
                grade: true,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[PROFILE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
