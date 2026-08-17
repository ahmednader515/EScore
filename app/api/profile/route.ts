import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { GOVERNORATES, STUDENT_GRADES, STUDY_TYPES } from "@/lib/registration-options";

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

// PATCH update current user profile
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { fullName, phoneNumber, parentPhoneNumber, grade, studyType, governorate } = await req.json();

        const trimmedFullName = (fullName || "").trim();
        const trimmedPhoneNumber = (phoneNumber || "").trim();
        const trimmedParentPhoneNumber = (parentPhoneNumber || "").trim();

        if (!trimmedFullName) {
            return new NextResponse("Full name is required", { status: 400 });
        }
        if (!trimmedPhoneNumber) {
            return new NextResponse("Phone number is required", { status: 400 });
        }
        if (!trimmedParentPhoneNumber) {
            return new NextResponse("Parent phone number is required", { status: 400 });
        }
        if (trimmedPhoneNumber === trimmedParentPhoneNumber) {
            return new NextResponse("Phone number cannot be the same as parent phone number", { status: 400 });
        }
        if (grade && !(STUDENT_GRADES as readonly string[]).includes(grade)) {
            return new NextResponse("Invalid grade value", { status: 400 });
        }
        if (studyType && !(STUDY_TYPES as readonly string[]).includes(studyType)) {
            return new NextResponse("Invalid study type value", { status: 400 });
        }
        if (governorate && !(GOVERNORATES as readonly string[]).includes(governorate)) {
            return new NextResponse("Invalid governorate value", { status: 400 });
        }

        const existingUser = await db.user.findFirst({
            where: {
                phoneNumber: trimmedPhoneNumber,
                NOT: { id: session.user.id },
            },
        });

        if (existingUser) {
            return new NextResponse("Phone number already exists", { status: 400 });
        }

        const updatedUser = await db.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                fullName: trimmedFullName,
                phoneNumber: trimmedPhoneNumber,
                parentPhoneNumber: trimmedParentPhoneNumber,
                grade: grade || null,
                studyType: studyType || null,
                governorate: governorate || null,
            },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                parentPhoneNumber: true,
                grade: true,
                studyType: true,
                governorate: true,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[PROFILE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
