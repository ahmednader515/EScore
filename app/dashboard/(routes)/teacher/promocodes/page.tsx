"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Search, Ticket, Copy, ChevronUp, ChevronDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportPromocodesToExcel } from "@/lib/export-promocodes";

interface Course {
    id: string;
    title: string;
}

interface PromoCode {
    id: string;
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    usageLimit: number | null;
    usedCount: number;
    isActive: boolean;
    courseId: string | null;
    course: {
        id: string;
        title: string;
    } | null;
    createdAt: string;
    updatedAt: string;
    copiedAt: string | null;
    copiedById: string | null;
}

const TeacherPromoCodesPage = () => {
    const [promocodes, setPromocodes] = useState<PromoCode[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"available" | "copied" | "used" | "all">("available");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isCopyPopoverOpen, setIsCopyPopoverOpen] = useState(false);
    const [editingPromocode, setEditingPromocode] = useState<PromoCode | null>(null);
    
    // Create form state
    const [selectedCourse, setSelectedCourse] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [isCreating, setIsCreating] = useState(false);

    // Edit form state
    const [editCourseId, setEditCourseId] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete form state
    const [deleteCourseId, setDeleteCourseId] = useState("all");
    const [isDeleting, setIsDeleting] = useState(false);

    // Copy form state
    const [copyCourseId, setCopyCourseId] = useState("all");
    const [copyCount, setCopyCount] = useState("");
    const [copyAvailability, setCopyAvailability] = useState("available");
    const [copyDate, setCopyDate] = useState("");

    useEffect(() => {
        fetchPromocodes();
        fetchCourses();
    }, []);

    const fetchPromocodes = async () => {
        try {
            const response = await fetch("/api/promocodes");
            if (response.ok) {
                const data = await response.json();
                setPromocodes(data);
            } else {
                toast.error("حدث خطأ أثناء جلب الأكواد");
            }
        } catch (error) {
            console.error("Error fetching promocodes:", error);
            toast.error("حدث خطأ أثناء جلب الأكواد");
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                const publishedCourses = data.filter((course: Course) => course.isPublished);
                setCourses(publishedCourses);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const handleCreateCodes = async () => {
        if (!selectedCourse) {
            toast.error("يرجى اختيار الكورس");
            return;
        }

        const qty = parseInt(quantity);
        if (!Number.isInteger(qty) || qty < 1) {
            toast.error("الكمية يجب أن تكون رقمًا صحيحًا أكبر من أو يساوي 1");
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch("/api/promocodes/bulk", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    courseId: selectedCourse,
                    quantity: qty,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`تم إنشاء ${data.count} كود بنجاح`);
                setIsCreateDialogOpen(false);
                setSelectedCourse("");
                setQuantity("1");
                fetchPromocodes();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "حدث خطأ أثناء إنشاء الأكواد");
            }
        } catch (error) {
            console.error("Error creating codes:", error);
            toast.error("حدث خطأ أثناء إنشاء الأكواد");
        } finally {
            setIsCreating(false);
        }
    };

    const handleEdit = (promocode: PromoCode) => {
        setEditingPromocode(promocode);
        setEditCourseId(promocode.courseId || "none");
        setIsEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingPromocode) return;

        setIsUpdating(true);
        try {
            const response = await fetch(`/api/promocodes/${editingPromocode.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    courseId: editCourseId === "none" ? null : editCourseId,
                }),
            });

            if (response.ok) {
                toast.success("تم تحديث الكود بنجاح");
                setIsEditDialogOpen(false);
                setEditingPromocode(null);
                fetchPromocodes();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "حدث خطأ أثناء التحديث");
            }
        } catch (error) {
            console.error("Error updating code:", error);
            toast.error("حدث خطأ أثناء التحديث");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الكود؟")) {
            return;
        }

        try {
            const response = await fetch(`/api/promocodes/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("تم حذف الكود بنجاح");
                fetchPromocodes();
            } else {
                toast.error("حدث خطأ أثناء حذف الكود");
            }
        } catch (error) {
            console.error("Error deleting code:", error);
            toast.error("حدث خطأ أثناء حذف الكود");
        }
    };

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch("/api/promocodes/bulk-delete", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    courseId: deleteCourseId === "all" ? null : deleteCourseId,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message || "تم الحذف بنجاح");
                setIsDeleteDialogOpen(false);
                setDeleteCourseId("all");
                fetchPromocodes();
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "حدث خطأ أثناء الحذف");
            }
        } catch (error) {
            console.error("Error deleting codes:", error);
            toast.error("حدث خطأ أثناء الحذف");
        } finally {
            setIsDeleting(false);
        }
    };

    const getCodesToCopy = () => {
        let codes = [...promocodes];

        if (copyCourseId !== "all") {
            codes = codes.filter((code) => code.courseId === copyCourseId);
        }

        if (copyAvailability === "available") {
            codes = codes.filter((code) => code.isActive && code.usedCount === 0 && !code.copiedAt);
        } else if (copyAvailability === "used") {
            codes = codes.filter((code) => code.usedCount > 0);
        }

        if (copyDate) {
            const dayStart = new Date(copyDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(copyDate);
            dayEnd.setHours(23, 59, 59, 999);
            codes = codes.filter((code) => {
                const created = new Date(code.createdAt);
                return created >= dayStart && created <= dayEnd;
            });
        }

        const count = parseInt(copyCount, 10);
        if (!Number.isNaN(count) && count > 0) {
            codes = codes.slice(0, count);
        }

        return codes;
    };

    const handleCopyCodes = async () => {
        try {
            const codesToCopy = getCodesToCopy();
            const codesText = codesToCopy.map((code) => code.code).join("\n");

            if (codesText) {
                await navigator.clipboard.writeText(codesText);

                const markResponse = await fetch("/api/promocodes/mark-copied", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: codesToCopy.map((c) => c.id) }),
                });

                if (!markResponse.ok) {
                    toast.error("تم النسخ لكن فشل تعليم الأكواد كمنسوخة");
                } else {
                    toast.success(`تم نسخ ${codesToCopy.length} كود إلى الحافظة`);
                }

                setIsCopyPopoverOpen(false);
                fetchPromocodes();
            } else {
                toast.error("لا توجد أكواد مطابقة للنسخ");
            }
        } catch (error) {
            console.error("Error copying codes:", error);
            toast.error("حدث خطأ أثناء النسخ");
        }
    };

    const handleExportExcel = () => {
        try {
            const codes = getCodesToCopy();
            if (codes.length === 0) {
                toast.error("لا توجد أكواد مطابقة للتصدير");
                return;
            }
            exportPromocodesToExcel(codes);
            toast.success(`تم تصدير ${codes.length} كود إلى Excel`);
            setIsCopyPopoverOpen(false);
        } catch (error) {
            console.error("Error exporting codes:", error);
            toast.error("حدث خطأ أثناء التصدير");
        }
    };

    const incrementQuantity = () => {
        const qty = parseInt(quantity) || 1;
        setQuantity((qty + 1).toString());
    };

    const decrementQuantity = () => {
        const qty = parseInt(quantity) || 1;
        if (qty > 1) {
            setQuantity((qty - 1).toString());
        }
    };

    const tabFilteredPromocodes = promocodes.filter((promo) => {
        if (activeTab === "available") {
            return promo.usedCount === 0 && !promo.copiedAt;
        }
        if (activeTab === "copied") {
            return promo.usedCount === 0 && !!promo.copiedAt;
        }
        if (activeTab === "used") {
            return promo.usedCount > 0;
        }
        return true;
    });

    const filteredPromocodes = tabFilteredPromocodes.filter((promo) =>
        promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (promo.course?.title && promo.course.title.toLowerCase().includes(searchTerm.toLowerCase()))
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
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    الأكواد
                </h1>
                <div className="flex flex-col gap-4 items-end">
                    <Button 
                        onClick={() => setIsCreateDialogOpen(true)} 
                        className="bg-[#005bd3] hover:bg-[#005bd3]/90"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        إنشاء كود جديد
                    </Button>
                    <div className="flex items-center gap-2">
                        <Popover open={isCopyPopoverOpen} onOpenChange={setIsCopyPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline">
                                    <Copy className="h-4 w-4 mr-2" />
                                    نسخ الأكواد المتاحة
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>الكورس</Label>
                                        <Select value={copyCourseId} onValueChange={setCopyCourseId}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">جميع الكورسات</SelectItem>
                                                {courses.map((course) => (
                                                    <SelectItem key={course.id} value={course.id}>
                                                        {course.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>حالة الاستخدام</Label>
                                        <Select value={copyAvailability} onValueChange={setCopyAvailability}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="available">متاح</SelectItem>
                                                <SelectItem value="used">مستخدم</SelectItem>
                                                <SelectItem value="all">الكل</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>العدد</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            placeholder="الكل"
                                            value={copyCount}
                                            onChange={(e) => setCopyCount(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>تاريخ الإنشاء</Label>
                                        <Input
                                            type="date"
                                            value={copyDate}
                                            onChange={(e) => setCopyDate(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                        سيتم تصدير / نسخ {getCodesToCopy().length} كود
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <Button onClick={handleCopyCodes} className="w-full bg-[#005bd3] hover:bg-[#005bd3]/90">
                                            <Copy className="h-4 w-4 mr-2" />
                                            نسخ
                                        </Button>
                                        <Button onClick={handleExportExcel} variant="outline" className="w-full">
                                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                                            تصدير Excel
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button 
                            variant="destructive" 
                            onClick={() => setIsDeleteDialogOpen(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            حذف الأكواد
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                    <TabsList>
                        <TabsTrigger value="available">متاح</TabsTrigger>
                        <TabsTrigger value="copied">تم نسخه</TabsTrigger>
                        <TabsTrigger value="used">مستخدم</TabsTrigger>
                        <TabsTrigger value="all">الكل</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-4 justify-start">
                    <div className="flex items-center space-x-2 max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="البحث..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {filteredPromocodes.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">الكود</TableHead>
                                    <TableHead className="text-right">الكورس</TableHead>
                                    <TableHead className="text-right">حالة الاستخدام</TableHead>
                                    {activeTab === "copied" && (
                                        <TableHead className="text-right">تاريخ النسخ</TableHead>
                                    )}
                                    <TableHead className="text-right">الحالة</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPromocodes.map((promo) => (
                                    <TableRow key={promo.id}>
                                        <TableCell>
                                            <Badge variant="outline" className="gap-1">
                                                <Ticket className="h-3 w-3" />
                                                {promo.code}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {promo.course?.title || "-"}
                                        </TableCell>
                                        <TableCell>
                                            {promo.usedCount > 0 ? (
                                                <Badge variant="secondary">مستخدم</Badge>
                                            ) : promo.copiedAt ? (
                                                <Badge variant="outline">تم نسخه</Badge>
                                            ) : (
                                                <Badge variant="default" className="bg-green-500">متاح</Badge>
                                            )}
                                        </TableCell>
                                        {activeTab === "copied" && (
                                            <TableCell>
                                                {promo.copiedAt
                                                    ? new Date(promo.copiedAt).toLocaleString("ar-EG")
                                                    : "-"}
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <Badge variant={promo.isActive ? "default" : "secondary"}>
                                                {promo.isActive ? "نشط" : "غير نشط"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEdit(promo)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(promo.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            {searchTerm ? "لا توجد نتائج" : "لا توجد أكواد"}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Code Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>إنشاء أكواد جديدة</DialogTitle>
                        <DialogDescription>
                            قم بإنشاء أكواد خصم للكورس المحدد
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="course">الكورس *</Label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الكورس" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity">الكمية *</Label>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={decrementQuantity}
                                    disabled={parseInt(quantity) <= 1}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                                <Input
                                    id="quantity"
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "" || parseInt(val) >= 1) {
                                            setQuantity(val);
                                        }
                                    }}
                                    className="text-center"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={incrementQuantity}
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                إلغاء
                            </Button>
                            <Button 
                                onClick={handleCreateCodes} 
                                disabled={isCreating || !selectedCourse}
                                className="bg-[#005bd3] hover:bg-[#005bd3]/90"
                            >
                                {isCreating ? "جاري الإنشاء..." : "إنشاء الأكواد"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Code Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تعديل الكود</DialogTitle>
                        <DialogDescription>
                            قم بتعديل الكورس المرتبط بهذا الكود
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>الكود</Label>
                            <Input
                                value={editingPromocode?.code || ""}
                                readOnly
                                className="font-mono font-bold text-center bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editCourse">الكورس</Label>
                            <Select value={editCourseId} onValueChange={setEditCourseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الكورس" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">لا يوجد</SelectItem>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                إلغاء
                            </Button>
                            <Button 
                                onClick={handleUpdate} 
                                disabled={isUpdating}
                                className="bg-[#005bd3] hover:bg-[#005bd3]/90"
                            >
                                {isUpdating ? "جاري التحديث..." : "تحديث"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>حذف الأكواد</DialogTitle>
                        <DialogDescription>
                            اختر الكورس لحذف جميع أكواده
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="deleteCourse">الكورس</Label>
                            <Select value={deleteCourseId} onValueChange={setDeleteCourseId}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">جميع الكورسات</SelectItem>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                إلغاء
                            </Button>
                            <Button 
                                onClick={handleBulkDelete} 
                                disabled={isDeleting}
                                variant="destructive"
                            >
                                {isDeleting ? "جاري الحذف..." : "حذف"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherPromoCodesPage;
