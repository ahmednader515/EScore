"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    GOVERNORATES,
    STUDENT_GRADES,
    STUDY_TYPES,
} from "@/lib/registration-options";

const GRADE_ORDER = STUDENT_GRADES;

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
            const response = await fetch("/api/admin/users?limit=5000");
            if (response.ok) {
                const data = await response.json();
                // Handle paginated response
                setUsers(data.users || data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("حدث خطأ في تحميل المستخدمين");
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
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editData),
            });

            if (response.ok) {
                toast.success("تم تحديث المستخدم بنجاح");
                setIsEditDialogOpen(false);
                setEditingUser(null);
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                toast.error(error || "حدث خطأ في تحديث المستخدم");
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("حدث خطأ في تحديث المستخدم");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("تم حذف المستخدم بنجاح");
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                toast.error(error || "حدث خطأ في حذف المستخدم");
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("حدث خطأ في حذف المستخدم");
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
        users
            .filter(u => u.role === "USER")
            .map(u => (u.grade || "").trim())
            .filter(Boolean)
    );
    const gradeOptions = GRADE_ORDER.filter(g => gradeOptionsSet.has(g));

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

    const staffUsers = filteredUsers.filter(user => user.role === "ADMIN" || user.role === "TEACHER");
    const studentUsers = filteredUsers
        .filter(user => user.role === "USER")
        .filter(user => selectedGrade === "all" ? true : (user.grade || "").trim() === selectedGrade);
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
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        إدارة المستخدمين
                    </h1>
                    <div className="rounded-lg border px-4 py-2 bg-[#fcfaed] border-[#361e01]/30">
                        <div className="text-sm font-semibold text-[#361e01]">إجمالي الطلاب (حسب التصفية)</div>
                        <div className="text-2xl font-bold tabular-nums text-[#361e01]">{studentUsers.length}</div>
                    </div>
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
                                    {g}
                                </Button>
                            ))}
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
                                                    user.role === "ADMIN" ? "bg-orange-600 text-white hover:bg-orange-700" : 
                                                    user.role === "TEACHER" ? "bg-blue-600 text-white hover:bg-blue-700" : 
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
                                                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                                                        <DialogHeader>
                                                            <DialogTitle>تعديل المستخدم</DialogTitle>
                                                            <DialogDescription>
                                                                قم بتعديل بيانات التسجيل للمستخدم
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
                                                                <Input
                                                                    id="role"
                                                                    value={editData.role === "USER" ? "طالب" : editData.role === "TEACHER" ? "معلم" : "مشرف"}
                                                                    disabled
                                                                    className="col-span-3 bg-muted"
                                                                />
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
                                                                هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المستخدم وجميع البيانات المرتبطة به نهائياً.
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
                                            {g}
                                        </Button>
                                    ))}
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
                                            <Badge variant="secondary">
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
                                                            <DialogTitle>تعديل المستخدم</DialogTitle>
                                                            <DialogDescription>
                                                                قم بتعديل بيانات التسجيل للمستخدم
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
                                                                <Input
                                                                    id="role"
                                                                    value={editData.role === "USER" ? "طالب" : editData.role === "TEACHER" ? "معلم" : "مشرف"}
                                                                    disabled
                                                                    className="col-span-3 bg-muted"
                                                                />
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
                                                                هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المستخدم وجميع البيانات المرتبطة به نهائياً.
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
        </div>
    );
};

export default UsersPage; 