import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateCourseForm } from "@/app/dashboard/_components/create-course-form";

const CreatePage = async () => {
  const { userId, user } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const isStaff = user?.role === "ADMIN" || user?.role === "TEACHER";
  if (!isStaff) {
    return redirect("/dashboard");
  }

  return <CreateCourseForm editorBasePath="/dashboard/teacher" />;
};

export default CreatePage;
