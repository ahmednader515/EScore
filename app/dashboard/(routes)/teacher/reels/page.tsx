"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type ReelVideo = {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  createdAt: string;
};

const TeacherReelsPage = () => {
  const [reels, setReels] = useState<ReelVideo[]>([]);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReels = async () => {
    try {
      const response = await fetch("/api/teacher/reels");
      if (!response.ok) {
        toast.error("فشل تحميل الريلز");
        return;
      }
      const data = await response.json();
      setReels(data);
    } catch (error) {
      console.error("Error loading reels:", error);
      toast.error("حدث خطأ أثناء تحميل الريلز");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  const handleAddReel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim() || !youtubeUrl.trim()) {
      toast.error("يرجى إدخال العنوان والرابط");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/teacher/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          youtubeUrl,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.error || "تعذر إضافة الريل");
        return;
      }

      toast.success("تمت إضافة الريل بنجاح");
      setTitle("");
      setYoutubeUrl("");
      fetchReels();
    } catch (error) {
      console.error("Error adding reel:", error);
      toast.error("حدث خطأ أثناء إضافة الريل");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    setDeletingId(reelId);
    try {
      const response = await fetch(`/api/teacher/reels/${reelId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        toast.error("تعذر حذف الريل");
        return;
      }

      toast.success("تم حذف الريل");
      fetchReels();
    } catch (error) {
      console.error("Error deleting reel:", error);
      toast.error("حدث خطأ أثناء حذف الريل");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إدارة ريلز يوتيوب</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddReel} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Input
              placeholder="عنوان الريل"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
            <Input
              placeholder="رابط يوتيوب (Shorts أو فيديو)"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={submitting}
            />
            <Button type="submit" disabled={submitting} className="bg-[#361e01] hover:bg-[#361e01]/90">
              <Plus className="h-4 w-4 mr-2" />
              إضافة
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الريلز المضافة</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">جاري التحميل...</p>
          ) : reels.length === 0 ? (
            <p className="text-center text-muted-foreground">لا توجد ريلز حالياً</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">الفيديو</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reels.map((reel) => (
                  <TableRow key={reel.id}>
                    <TableCell className="font-medium">{reel.title}</TableCell>
                    <TableCell>
                      <a
                        href={reel.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#361e01] hover:underline"
                      >
                        مشاهدة
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-600 text-white hover:bg-green-700">منشور</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === reel.id}
                        onClick={() => handleDeleteReel(reel.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherReelsPage;

