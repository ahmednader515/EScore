"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GOVERNORATES, STUDENT_GRADES, STUDY_TYPES } from "@/lib/registration-options";

export default function EditProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    parentPhoneNumber: "",
    grade: "",
    studyType: "",
    governorate: "",
  });

  // Fetch current user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsFetching(true);
        const response = await axios.get("/api/profile");
        const user = response.data;
        setFormData({
          fullName: user.fullName || "",
          phoneNumber: user.phoneNumber || "",
          parentPhoneNumber: user.parentPhoneNumber || "",
          grade: user.grade || "",
          studyType: user.studyType || "",
          governorate: user.governorate || "",
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("فشل تحميل الملف الشخصي");
        router.push("/");
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.phoneNumber === formData.parentPhoneNumber) {
      toast.error("رقم الهاتف لا يمكن أن يكون نفس رقم هاتف الوالد");
      return;
    }

    setIsLoading(true);

    try {
      await axios.patch("/api/profile", {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        parentPhoneNumber: formData.parentPhoneNumber,
        grade: formData.grade || null,
        studyType: formData.studyType || null,
        governorate: formData.governorate || null,
      });

      toast.success("تم تحديث الملف الشخصي بنجاح");

      // Refresh the router to update server components with new data
      router.refresh();

      // Redirect to dashboard/search to see updated courses
      // Use a small delay to ensure the refresh happens first
      setTimeout(() => {
        router.push("/dashboard/search");
      }, 300);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        const rawMessage =
          axiosError.response?.data?.message ||
          (typeof axiosError.response?.data === "string" ? axiosError.response.data : "") ||
          axiosError.message ||
          "فشل تحديث الملف الشخصي";

        if (rawMessage.includes("Phone number already exists")) {
          toast.error("رقم الهاتف مسجل مسبقاً. يرجى استخدام رقم آخر");
        } else if (rawMessage.includes("cannot be the same as parent")) {
          toast.error("رقم الهاتف لا يمكن أن يكون نفس رقم هاتف الوالد");
        } else {
          toast.error(rawMessage);
        }
      } else {
        toast.error("فشل تحديث الملف الشخصي");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="h-4 w-4 rtl:ml-1 ltr:mr-1" />
            العودة
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">تعديل الملف الشخصي</h1>
          <p className="text-sm text-muted-foreground mt-2">
            قم بتحديث بياناتك الشخصية
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الرباعي (باللغة العربية)</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="مثال: أحمد محمد علي حسن"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">رقم الطالب (مدعوم WhatsApp)</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+20XXXXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentPhoneNumber">رقم هاتف ولي الأمر</Label>
              <Input
                id="parentPhoneNumber"
                name="parentPhoneNumber"
                type="tel"
                autoComplete="tel"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.parentPhoneNumber}
                onChange={handleInputChange}
                placeholder="+20XXXXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">الصف الدراسي</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => handleSelectChange("grade", value)}
                disabled={isLoading}
                required
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="اختر الصف" />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_GRADES.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studyType">نوع الدراسة</Label>
              <Select
                value={formData.studyType}
                onValueChange={(value) => handleSelectChange("studyType", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="اختر نوع الدراسة" />
                </SelectTrigger>
                <SelectContent>
                  {STUDY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="governorate">المحافظة</Label>
              <Select
                value={formData.governorate}
                onValueChange={(value) => handleSelectChange("governorate", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="اختر المحافظة" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {GOVERNORATES.map((gov) => (
                    <SelectItem key={gov} value={gov}>
                      {gov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  "حفظ التغييرات"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
