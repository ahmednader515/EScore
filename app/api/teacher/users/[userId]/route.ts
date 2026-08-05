import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { userId } = await params;

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const {
            fullName,
            phoneNumber,
            parentPhoneNumber,
            role,
            grade,
            studyType,
            governorate,
        } = await req.json();

        const existingUser = await db.user.findUnique({
            where: {
                id: userId,
                role: {
                    in: ["USER", "TEACHER", "ADMIN"],
                },
            },
        });

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
            const phoneExists = await db.user.findUnique({
                where: { phoneNumber },
            });

            if (phoneExists) {
                return new NextResponse("Phone number already exists", { status: 400 });
            }
        }

        if (role && !["USER", "TEACHER", "ADMIN"].includes(role)) {
            return new NextResponse("Invalid role", { status: 400 });
        }

        if (
            phoneNumber &&
            parentPhoneNumber &&
            phoneNumber === parentPhoneNumber
        ) {
            return new NextResponse(
                "Phone number cannot be the same as parent phone number",
                { status: 400 }
            );
        }

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: {
                ...(fullName !== undefined && { fullName }),
                ...(phoneNumber !== undefined && { phoneNumber }),
                ...(parentPhoneNumber !== undefined && { parentPhoneNumber }),
                ...(role !== undefined && { role }),
                ...(grade !== undefined && { grade: grade || null }),
                ...(studyType !== undefined && { studyType: studyType || null }),
                ...(governorate !== undefined && {
                    governorate: governorate || null,
                }),
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[TEACHER_USER_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { userId } = await params;

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const existingUser = await db.user.findUnique({
            where: {
                id: userId,
                role: {
                    in: ["USER", "TEACHER", "ADMIN"],
                },
            },
        });

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        await db.user.delete({
            where: { id: userId },
        });

        return new NextResponse("User deleted successfully", { status: 200 });
    } catch (error) {
        console.error("[TEACHER_USER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
