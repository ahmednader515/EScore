import { getServerSession } from "next-auth";
import { auth, authOptions } from "@/lib/auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

const handleAuth = async () => {
    const { userId } = await auth();
    if (!userId) throw new UploadThingError("Unauthorized");
    return { userId };
}

export const ourFileRouter = {
    courseImage: f({ image: {maxFileSize: "4MB", maxFileCount: 1} })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),

    courseAttachment: f(["text", "image", "video", "audio", "pdf"])
    .middleware(() => handleAuth())
    .onUploadComplete(async ({ file }) => {
        return { url: file.url, name: file.name };
    }),

    chapterVideo: f({ video: {maxFileCount: 1, maxFileSize: "512GB"} })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),

    reelThumbnail: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        throw new UploadThingError("Unauthorized");
      }
      const role = session.user.role;
      if (role !== "TEACHER" && role !== "ADMIN") {
        throw new UploadThingError("Forbidden");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(() => {}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
