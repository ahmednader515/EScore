"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    GOVERNORATES,
    STUDENT_GRADES,
    STUDY_TYPES,
} from "@/lib/registration-options";

const GRADE_ORDER = STUDENT_GRADES;
const UNSPECIFIED_GRADE = "__unspecified_grade__";
const UNSPECIFIED_STUDY_TYPE = "__unspecified_study_type__";

const getGradeBucket = (user: { grade?: string | null }) => {
    const grade = (user.grade || "").trim();
    return grade && (STUDENT_GRADES as readonly string[]).includes(grade) ? grade : UNSPECIFIED_GRADE;
};

const getStudyTypeBucket = (user: { studyType?: string | null }) => {
    const studyType = (user.studyType || "").trim();
    return studyType && (STUDY_TYPES as readonly string[]).includes(studyType) ? studyType : UNSPECIFIED_STUDY_TYPE;
};

const gradeLabel = (g: string) => (g === UNSPECIFIED_GRADE ? "غير محدد" : g);
const studyTypeLabel = (s: string) => (s === UNSPECIFIED_STUDY_TYPE ? "غير محدد" : s);

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    role: string;
    balance: number;
    grade?: string | null;
    studyType?: string | null;
    governorate?: string | null;
    createdAt: string;
    updatedAt: string;
    _count: {
        courses: number;
        purchases: number;
        userProgress: number;
    };
}

interface EditUserData {
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    role: string;
    grade: string;
    studyType: string;
    governorate: string;
}

const UsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingSearchTerm, setPendingSearchTerm] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGrade, setSelectedGrade] = useState<string>("all");
    const [selectedStudyType, setSelectedStudyType] = useState<string>("all");
    const [visibleStudentCount, setVisibleStudentCount] = useState(25);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editData, setEditData] = useState<EditUserData>({
        fullName: "",
        phoneNumber: "",
        parentPhoneNumber: "",
        role: "",
        grade: "",
        studyType: "",
        governorate: "",
    });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/teacher/users?limit=5000");
            if (response.ok) {
                const data = await response.json();
                // Handle paginated response
                setUsers(data.users || data);
            } else {
                console.error("Error fetching users:", response.status, response.statusText);
                if (response.status === 403) {
                    toast.error("ليس لديك صلاحية للوصول إلى هذه الصفحة");
                } else {
                    toast.error("حدث خطأ في تحميل الطلاب");
                }
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("حدث خطأ في تحميل الطلاب");
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditData({
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            parentPhoneNumber: user.parentPhoneNumber,
            role: user.role,
            grade: user.grade || "",
            studyType: user.studyType || "",
            governorate: user.governorate || "",
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        try {
            const response = await fetch(`/api/teacher/users/${editingUser.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editData),
            });

            if (response.ok) {
                const userType = editingUser.role === "TEACHER" ? "المعلم" : editingUser.role === "ADMIN" ? "المشرف" : "الطالب";
                toast.success(`تم تحديث بيانات ${userType} بنجاح`);
                setIsEditDialogOpen(false);
                setEditingUser(null);
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                console.error("Error updating user:", response.status, error);
                if (response.status === 403) {
                    toast.error("ليس لديك صلاحية لتعديل البيانات");
                } else if (response.status === 404) {
                    toast.error("المستخدم غير موجود");
                } else if (response.status === 400) {
                    toast.error(error || "بيانات غير صحيحة");
                } else {
                    toast.error("حدث خطأ في تحديث البيانات");
                }
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("حدث خطأ في تحديث بيانات الطالب");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/teacher/users/${userId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("تم حذف المستخدم بنجاح");
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                console.error("Error deleting user:", response.status, error);
                if (response.status === 403) {
                    toast.error("ليس لديك صلاحية لحذف المستخدم");
                } else if (response.status === 404) {
                    toast.error("المستخدم غير موجود");
                } else {
                    toast.error(error || "حدث خطأ في حذف المستخدم");
                }
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("حدث خطأ في حذف الطالب");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSearchTerm(pendingSearchTerm.trim());
        setVisibleStudentCount(25);
    };

    const gradeOptionsSet = new Set(
        users.filter(u => u.role === "USER").map(getGradeBucket)
    );
    const gradeOptions = [
        ...GRADE_ORDER.filter(g => gradeOptionsSet.has(g)),
        ...(gradeOptionsSet.has(UNSPECIFIED_GRADE) ? [UNSPECIFIED_GRADE] : []),
    ];

    const studyTypeOptionsSet = new Set(
        users.filter(u => u.role === "USER").map(getStudyTypeBucket)
    );
    const studyTypeOptions = [
        ...STUDY_TYPES.filter(s => studyTypeOptionsSet.has(s)),
        ...(studyTypeOptionsSet.has(UNSPECIFIED_STUDY_TYPE) ? [UNSPECIFIED_STUDY_TYPE] : []),
    ];

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );
    const totalStudents = users
        .filter(user => user.role === "USER")
        .filter(user => selectedGrade === "all" ? true : getGradeBucket(user) === selectedGrade)
        .filter(user => selectedStudyType === "all" ? true : getStudyTypeBucket(user) === selectedStudyType)
        .length;

    // Separate users by role
    const studentUsers = filteredUsers
        .filter(user => user.role === "USER")
        .filter(user => selectedGrade === "all" ? true : getGradeBucket(user) === selectedGrade)
        .filter(user => selectedStudyType === "all" ? true : getStudyTypeBucket(user) === selectedStudyType);
    const staffUsers = filteredUsers.filter(user => user.role === "TEACHER" || user.role === "ADMIN");
    const visibleStudentUsers = studentUsers.slice(0, visibleStudentCount);
    const hasMoreStudents = visibleStudentUsers.length < studentUsers.length;

    const renderSignupDetails = (user: User) => (
        <div className="space-y-1 text-sm text-muted-foreground text-right">
            <div>
                <span className="text-foreground font-medium">الصف: </span>
                {user.grade || "غير محدد"}
            </div>
            <div>
                <span className="text-foreground font-medium">نوع الدراسة: </span>
                {user.studyType || "غير محدد"}
            </div>
            <div>
                <span className="text-foreground font-medium">المحافظة: </span>
                {user.governorate || "غير محدد"}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">جاري التحميل...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:shrink-0">
                    إدارة المستخدمين
                </h1>
                <Card className="w-full border-2 border-[#361e01] bg-[#fcfaed] shadow-sm sm:w-auto sm:min-w-56">
                    <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                        <Users className="h-9 w-9 shrink-0 text-[#361e01] sm:h-10 sm:w-10" aria-hidden />
                        <div className="min-w-0 flex-1 text-right">
                            <p className="text-sm font-semibold text-[#361e01] sm:text-base">
                                إجمالي عدد الطلاب
                            </p>
                            <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#361e01] sm:text-3xl">
                                {totalStudents}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="البحث بالاسم أو رقم الهاتف..."
                            value={pendingSearchTerm}
                            onChange={(e) => setPendingSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Button type="submit">بحث</Button>
                    </form>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                            <span className="text-sm text-muted-foreground">تصفية حسب الصف:</span>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant={selectedGrade === "all" ? "default" : "outline"}
                                    className={selectedGrade === "all" ? "bg-[#361e01] hover:bg-[#361e01]/90 text-white" : ""}
                                    onClick={() => {
                                        setSelectedGrade("all");
                                        setVisibleStudentCount(25);
                                    }}
                                >
                                    كل الصفوف
                                </Button>
                                {gradeOptions.map((g) => (
                                    <Button
                                        key={g}
                                        type="button"
                                        variant={selectedGrade === g ? "default" : "outline"}
                                        className={selectedGrade === g ? "bg-[#361e01] hover:bg-[#361e01]/90 text-white" : ""}
                                        onClick={() => {
                                            setSelectedGrade(g);
                                            setVisibleStudentCount(25);
                                        }}
                                    >
                                        {gradeLabel(g)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-sm text-muted-foreground">تصفية حسب نوع الدراسة:</span>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant={selectedStudyType === "all" ? "default" : "outline"}
                                    className={selectedStudyType === "all" ? "bg-[#361e01] hover:bg-[#361e01]/90 text-white" : ""}
                                    onClick={() => {
                                        setSelectedStudyType("all");
                                        setVisibleStudentCount(25);
                                    }}
                                >
                                    الكل
                                </Button>
                                {studyTypeOptions.map((s) => (
                                    <Button
                                        key={s}
                                        type="button"
                                        variant={selectedStudyType === s ? "default" : "outline"}
                                        className={selectedStudyType === s ? "bg-[#361e01] hover:bg-[#361e01]/90 text-white" : ""}
                                        onClick={() => {
                                            setSelectedStudyType(s);
                                            setVisibleStudentCount(25);
                                        }}
                                    >
                                        {studyTypeLabel(s)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Staff Table (Admins and Teachers) */}
            {staffUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>المشرفين والمعلمين</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">الاسم</TableHead>
                                    <TableHead className="text-right">رقم الهاتف</TableHead>
                                    <TableHead className="text-right">رقم هاتف الوالد</TableHead>
                                    <TableHead className="text-right">الدور</TableHead>
                                    <TableHead className="text-right">بيانات التسجيل</TableHead>
                                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell>{user.phoneNumber}</TableCell>
                                        <TableCell>{user.parentPhoneNumber}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className={
                                                    user.role === "TEACHER" ? "bg-blue-600 text-white hover:bg-blue-700" : 
                                                    user.role === "ADMIN" ? "bg-orange-600 text-white hover:bg-orange-700" : 
                                                    ""
                                                }
                                            >
                                                {user.role === "TEACHER" ? "معلم" : 
                                                 user.role === "ADMIN" ? "مشرف" : user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{renderSignupDetails(user)}</TableCell>
                                        <TableCell>
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsEditDialogOpen(false);
                                                        setEditingUser(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>تعديل بيانات {user.role === "TEACHER" ? "المعلم" : "المشرف"}</DialogTitle>
                                                            <DialogDescription>
                                                                قم بتعديل معلومات {user.role === "TEACHER" ? "المعلم" : "المشرف"}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    الاسم
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    رقم الهاتف
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="parentPhoneNumber" className="text-right">
                                                                    رقم هاتف الوالد
                                                                </Label>
                                                                <Input
                                                                    id="parentPhoneNumber"
                                                                    value={editData.parentPhoneNumber}
                                                                    onChange={(e) => setEditData({...editData, parentPhoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="role" className="text-right">
                                                                    الدور
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder="اختر الدور" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">طالب</SelectItem>
                                                                        <SelectItem value="TEACHER">معلم</SelectItem>
                                                                        <SelectItem value="ADMIN">مشرف</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsEditDialogOpen(false);
                                                                setEditingUser(null);
                                                            }}>
                                                                إلغاء
                                                            </Button>
                                                            <Button onClick={handleSaveUser}>
                                                                حفظ التغييرات
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                هذا الإجراء لا يمكن التراجع عنه. سيتم حذف {user.role === "TEACHER" ? "المعلم" : "المشرف"} وجميع البيانات المرتبطة به نهائياً.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                حذف
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Students Table */}
            {studentUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>قائمة الطلاب</CardTitle>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="البحث بالاسم أو رقم الهاتف..."
                                    value={pendingSearchTerm}
                                    onChange={(e) => setPendingSearchTerm(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button type="submit">بحث</Button>
                            </form>
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm text-muted-foreground">تصفية حسب الصف:</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            type="button"
                                            variant={selectedGrade === "all" ? "default" : "outline"}
                                            className={selectedGrade === "all" ? "bg-[#361e01] hover:bg-[#361e01]/90 text-white" : ""}
                                            onClick={() => {
                                                setSelectedGrade("all");
                                                setVisibleStudentCount(25);
                                            }}
                                        >
                                            كل الصفوف
                                        </Button>
                                        {gradeOptions.map((g) => (
                                            <Button
                                                key={g}
                                                type="button"
                                                variant={selectedGrade === g ? "default" : "outline"}
                                                className={selectedGrade === g ? "bg-[#361e01] hover:bg-[#361e01]/90 text-white" : ""}
                                                onClick={() => {
                                                    setSelectedGrade(g);
                                                    setVisibleStudentCount(25);
                                                }}
                                            >
                                                {gradeLabel(g)}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm text-muted-foreground">تصفية حسب نوع الدراسة:</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            type="button"
                                            variant={selectedStudyType === "all" ? "default" : "outline"}
                                            className={selectedStudyType === "all" ? "bg-[#361e01] hover:bg-[#361e01]/90 text-white" : ""}
                                            onClick={() => {
                                                setSelectedStudyType("all");
                                                setVisibleStudentCount(25);
                                            }}
                                        >
                                            الكل
                                        </Button>
                                        {studyTypeOptions.map((s) => (
                                            <Button
                                                key={s}
                                                type="button"
                                                variant={selectedStudyType === s ? "default" : "outline"}
                                                className={selectedStudyType === s ? "bg-[#361e01] hover:bg-[#361e01]/90 text-white" : ""}
                                                onClick={() => {
                                                    setSelectedStudyType(s);
                                                    setVisibleStudentCount(25);
                                                }}
                                            >
                                                {studyTypeLabel(s)}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">الاسم</TableHead>
                                    <TableHead className="text-right">رقم الهاتف</TableHead>
                                    <TableHead className="text-right">رقم هاتف الوالد</TableHead>
                                    <TableHead className="text-right">الدور</TableHead>
                                    <TableHead className="text-right">بيانات التسجيل</TableHead>
                                    <TableHead className="text-right">الرصيد</TableHead>
                                    <TableHead className="text-right">الكورسات المشتراة</TableHead>
                                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleStudentUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell>{user.phoneNumber}</TableCell>
                                        <TableCell>{user.parentPhoneNumber}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className="bg-green-600 text-white hover:bg-green-700"
                                            >
                                                طالب
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{renderSignupDetails(user)}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {user.balance} جنيه
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {user._count.purchases}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsEditDialogOpen(false);
                                                        setEditingUser(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                                                        <DialogHeader>
                                                            <DialogTitle>تعديل بيانات الطالب</DialogTitle>
                                                            <DialogDescription>
                                                                قم بتعديل بيانات التسجيل للطالب
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    الاسم
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    رقم الهاتف
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="parentPhoneNumber" className="text-right">
                                                                    رقم هاتف الوالد
                                                                </Label>
                                                                <Input
                                                                    id="parentPhoneNumber"
                                                                    value={editData.parentPhoneNumber}
                                                                    onChange={(e) => setEditData({...editData, parentPhoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label className="text-right">الصف الدراسي</Label>
                                                                <Select
                                                                    value={editData.grade || "__none__"}
                                                                    onValueChange={(value) =>
                                                                        setEditData({
                                                                            ...editData,
                                                                            grade: value === "__none__" ? "" : value,
                                                                        })
                                                                    }
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder="اختر الصف" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="__none__">غير محدد</SelectItem>
                                                                        {STUDENT_GRADES.map((grade) => (
                                                                            <SelectItem key={grade} value={grade}>
                                                                                {grade}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label className="text-right">نوع الدراسة</Label>
                                                                <Select
                                                                    value={editData.studyType || "__none__"}
                                                                    onValueChange={(value) =>
                                                                        setEditData({
                                                                            ...editData,
                                                                            studyType: value === "__none__" ? "" : value,
                                                                        })
                                                                    }
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder="اختر نوع الدراسة" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="__none__">غير محدد</SelectItem>
                                                                        {STUDY_TYPES.map((type) => (
                                                                            <SelectItem key={type} value={type}>
                                                                                {type}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label className="text-right">المحافظة</Label>
                                                                <Select
                                                                    value={editData.governorate || "__none__"}
                                                                    onValueChange={(value) =>
                                                                        setEditData({
                                                                            ...editData,
                                                                            governorate: value === "__none__" ? "" : value,
                                                                        })
                                                                    }
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder="اختر المحافظة" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="__none__">غير محدد</SelectItem>
                                                                        {GOVERNORATES.map((gov) => (
                                                                            <SelectItem key={gov} value={gov}>
                                                                                {gov}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="role" className="text-right">
                                                                    الدور
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder="اختر الدور" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">طالب</SelectItem>
                                                                        <SelectItem value="TEACHER">معلم</SelectItem>
                                                                        <SelectItem value="ADMIN">مشرف</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsEditDialogOpen(false);
                                                                setEditingUser(null);
                                                            }}>
                                                                إلغاء
                                                            </Button>
                                                            <Button onClick={handleSaveUser}>
                                                                حفظ التغييرات
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الطالب وجميع البيانات المرتبطة به نهائياً.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                حذف
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                عرض {visibleStudentUsers.length} من {studentUsers.length} طالب
                            </p>
                            {hasMoreStudents && (
                                <Button
                                    variant="outline"
                                    onClick={() => setVisibleStudentCount((prev) => prev + 25)}
                                >
                                    عرض المزيد
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {staffUsers.length === 0 && studentUsers.length === 0 && !loading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                            لا يوجد مستخدمين مسجلين حالياً
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default UsersPage;
