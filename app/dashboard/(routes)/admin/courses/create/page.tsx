import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminCreateCourseForm } from "./admin-create-course-form";

const AdminCreateCoursePage = async () => {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  return <AdminCreateCourseForm />;
};

export default AdminCreateCoursePage;
