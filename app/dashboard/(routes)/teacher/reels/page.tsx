"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ExternalLink, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { UploadButton } from "@/lib/uploadthing";

type ReelVideo = {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

const TeacherReelsPage = () => {
  const [reels, setReels] = useState<ReelVideo[]>([]);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pendingThumbnailUrl, setPendingThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [patchingThumbId, setPatchingThumbId] = useState<string | null>(null);

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
          thumbnailUrl: pendingThumbnailUrl,
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
      setPendingThumbnailUrl(null);
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

  const patchReelThumbnail = async (reelId: string, thumbnailUrl: string | null) => {
    setPatchingThumbId(reelId);
    try {
      const response = await fetch(`/api/teacher/reels/${reelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.error || "تعذر تحديث الصورة المصغرة");
        return;
      }
      toast.success(thumbnailUrl ? "تم تحديث الصورة المصغرة" : "تمت إزالة الصورة المصغرة");
      fetchReels();
    } catch (error) {
      console.error("Error patching reel thumbnail:", error);
      toast.error("حدث خطأ أثناء تحديث الصورة");
    } finally {
      setPatchingThumbId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إدارة ريلز يوتيوب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddReel} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
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
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4 shrink-0" />
                <span>صورة مصغرة (اختياري) — تُعرض قبل تشغيل الفيديو في صفحة الريلز</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <UploadButton
                  endpoint="reelThumbnail"
                  disabled={submitting}
                  onClientUploadComplete={(res) => {
                    const url = res?.[0]?.url;
                    if (url) {
                      setPendingThumbnailUrl(url);
                      toast.success("تم رفع الصورة المصغرة");
                    }
                  }}
                  onUploadError={(error: Error) => {
                    toast.error(error.message || "فشل الرفع");
                  }}
                  appearance={{
                    button:
                      "ut-ready:bg-[#361e01] ut-uploading:cursor-not-allowed ut-ready:text-white ut-uploading:bg-[#361e01]/70 rounded-md px-3 py-2 text-sm font-medium",
                    allowedContent: "hidden",
                  }}
                  content={{
                    button: "رفع صورة",
                  }}
                />
                {pendingThumbnailUrl && (
                  <div className="relative h-14 w-24 overflow-hidden rounded-md border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pendingThumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute left-0 top-0 h-6 w-6 rounded-br-md rounded-tl-none p-0"
                      onClick={() => setPendingThumbnailUrl(null)}
                      disabled={submitting}
                      aria-label="إزالة الصورة"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
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
                  <TableHead className="text-right w-[120px]">المعاينة</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">الفيديو</TableHead>
                  <TableHead className="text-right">الصورة المصغرة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reels.map((reel) => (
                  <TableRow key={reel.id}>
                    <TableCell>
                      <div className="relative h-14 w-24 overflow-hidden rounded-md border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            reel.thumbnailUrl ||
                            `https://i.ytimg.com/vi/${reel.youtubeVideoId}/hqdefault.jpg`
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </TableCell>
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
                      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                        <UploadButton
                          endpoint="reelThumbnail"
                          disabled={patchingThumbId === reel.id}
                          onClientUploadComplete={async (res) => {
                            const url = res?.[0]?.url;
                            if (url) await patchReelThumbnail(reel.id, url);
                          }}
                          onUploadError={(error: Error) => {
                            toast.error(error.message || "فشل الرفع");
                          }}
                          appearance={{
                            button:
                              "ut-ready:bg-[#361e01] ut-uploading:cursor-not-allowed ut-ready:text-white ut-uploading:bg-[#361e01]/70 rounded-md px-2 py-1.5 text-xs font-medium",
                            allowedContent: "hidden",
                          }}
                          content={{
                            button: patchingThumbId === reel.id ? "جاري الحفظ…" : "رفع / استبدال",
                          }}
                        />
                        {reel.thumbnailUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            disabled={patchingThumbId === reel.id}
                            onClick={() => patchReelThumbnail(reel.id, null)}
                          >
                            إزالة المخصصة
                          </Button>
                        )}
                      </div>
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
