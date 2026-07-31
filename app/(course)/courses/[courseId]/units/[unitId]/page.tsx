"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { CourseBreadcrumbs } from "@/components/course-breadcrumbs";
import { PlyrVideoPlayer } from "@/components/plyr-video-player";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Lock,
  FileText,
  Download,
  ClipboardList,
  Video,
} from "lucide-react";
import { toast } from "sonner";

type Attachment = {
  id: string;
  name: string;
  url: string;
  position: number;
};

type ContentItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  isFree: boolean;
  videoUrl: string | null;
  videoType: string | null;
  youtubeVideoId: string | null;
  imageUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  quizId: string | null;
  locked?: boolean;
  attachments?: Attachment[];
  contentProgress?: { isCompleted: boolean }[];
  quiz?: { id: string; title: string; isFree: boolean } | null;
};

type UnitData = {
  id: string;
  title: string;
  hasAccess: boolean;
  course: { id: string; title: string; price: number | null };
  teacher: { id: string; name: string } | null;
  contentItems: ContentItem[];
};

export default function UnitContentPage() {
  const params = useParams() as { courseId: string; unitId: string };
  const [unit, setUnit] = useState<UnitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState(0);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

  const loadUnit = async () => {
    try {
      const res = await axios.get(
        `/api/courses/${params.courseId}/units/${params.unitId}`
      );
      setUnit(res.data);
    } catch {
      toast.error("حدث خطأ في تحميل الوحدة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnit();
    axios
      .get(`/api/courses/${params.courseId}/progress`)
      .then((res) => setCourseProgress(res.data.progress))
      .catch(() => {});
  }, [params.courseId, params.unitId]);

  const toggleComplete = async (item: ContentItem) => {
    const isCompleted = item.contentProgress?.[0]?.isCompleted;
    try {
      if (isCompleted) {
        await axios.delete(
          `/api/courses/${params.courseId}/units/${params.unitId}/content/${item.id}/progress`
        );
      } else {
        await axios.put(
          `/api/courses/${params.courseId}/units/${params.unitId}/content/${item.id}/progress`
        );
      }
      loadUnit();
      const prog = await axios.get(`/api/courses/${params.courseId}/progress`);
      setCourseProgress(prog.data.progress);
    } catch {
      toast.error("حدث خطأ");
    }
  };

  const grouped = useMemo(() => {
    if (!unit) return { VIDEO: [], PDF: [], ASSIGNMENT: [] };
    return {
      VIDEO: unit.contentItems.filter((i) => i.type === "VIDEO"),
      PDF: unit.contentItems.filter((i) => i.type === "PDF"),
      ASSIGNMENT: unit.contentItems.filter((i) => i.type === "ASSIGNMENT"),
    };
  }, [unit]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        الوحدة غير موجودة
      </div>
    );
  }

  const renderLock = (item: ContentItem) =>
    item.locked && !item.isFree ? (
      <Button asChild size="sm" variant="outline">
        <Link href={`/courses/${params.courseId}/purchase`}>
          <Lock className="h-4 w-4 mr-1" />
          شراء للوصول
        </Link>
      </Button>
    ) : null;

  const getVideoPlayerKey = (item: ContentItem) => {
    if (item.videoType === "YOUTUBE" && item.youtubeVideoId) {
      return `youtube-${item.id}-${item.youtubeVideoId}`;
    }
    if (item.videoUrl) {
      return `upload-${item.id}-${item.videoUrl}`;
    }
    return null;
  };

  return (
    <div className="py-6">
      <CourseBreadcrumbs
        items={[
          { label: "الكورسات", href: "/dashboard" },
          { label: unit.course.title, href: `/courses/${params.courseId}/teachers` },
          ...(unit.teacher
            ? [
                {
                  label: unit.teacher.name,
                  href: `/courses/${params.courseId}/teachers/${unit.teacher.id}/units`,
                },
              ]
            : []),
          { label: unit.title },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{unit.title}</h1>
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span>تقدم الكورس</span>
            <span>{courseProgress}%</span>
          </div>
          <Progress value={courseProgress} className="h-2" />
        </div>
      </div>

      {!unit.hasAccess && (
        <div className="mb-6 p-4 border rounded-md bg-muted/30 flex items-center justify-between">
          <span className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4" />
            بعض المحتويات مقفلة — اشترِ الكورس للوصول الكامل
          </span>
          <Button asChild size="sm">
            <Link href={`/courses/${params.courseId}/purchase`}>شراء الكورس</Link>
          </Button>
        </div>
      )}

      {grouped.VIDEO.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Video className="h-5 w-5" />
            الدروس
          </h2>
          <ul className="space-y-3">
            {grouped.VIDEO.map((item) => {
              const videoKey = getVideoPlayerKey(item);
              const isExpanded = expandedVideo === item.id;

              return (
              <li key={item.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between gap-2">
                  <button
                    className="flex items-center gap-2 flex-1 text-right"
                    onClick={() =>
                      !item.locked &&
                      setExpandedVideo(isExpanded ? null : item.id)
                    }
                    disabled={!!item.locked}
                  >
                    {item.contentProgress?.[0]?.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-10 w-16 object-cover rounded shrink-0"
                      />
                    )}
                    <span className="font-medium">{item.title}</span>
                    {item.isFree && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        مجاني
                      </span>
                    )}
                  </button>
                  <div className="flex gap-2">
                    {!item.locked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleComplete(item)}
                      >
                        {item.contentProgress?.[0]?.isCompleted
                          ? "إلغاء الإكمال"
                          : "تم الإكمال"}
                      </Button>
                    )}
                    {renderLock(item)}
                  </div>
                </div>
                {isExpanded && !item.locked && (
                  <div className="mt-4 space-y-4">
                    <div className="aspect-video relative bg-black rounded-lg overflow-hidden">
                      {videoKey ? (
                        <PlyrVideoPlayer
                          key={videoKey}
                          videoUrl={
                            item.videoType === "UPLOAD"
                              ? item.videoUrl ?? undefined
                              : undefined
                          }
                          youtubeVideoId={
                            item.videoType === "YOUTUBE"
                              ? item.youtubeVideoId ?? undefined
                              : undefined
                          }
                          videoType={
                            (item.videoType as "UPLOAD" | "YOUTUBE") || "UPLOAD"
                          }
                          className="w-full h-full"
                          onEnded={() => toggleComplete(item)}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                          لا يوجد فيديو متاح
                        </div>
                      )}
                    </div>

                    {item.description && (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}

                    {item.attachments && item.attachments.length > 0 && (
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <h3 className="text-base font-semibold">مستندات الدرس</h3>
                        </div>
                        <div className="space-y-2">
                          {item.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center p-3 w-full bg-secondary/50 border rounded-md gap-2"
                            >
                              <FileText className="h-4 w-4 shrink-0" />
                              <span className="text-sm font-medium truncate flex-1">
                                {attachment.name}
                              </span>
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  عرض
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <a href={attachment.url} download>
                                  <Download className="h-3 w-3" />
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
            })}
          </ul>
        </section>
      )}

      {grouped.PDF.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ملفات PDF
          </h2>
          <ul className="space-y-2">
            {grouped.PDF.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border rounded-lg p-3 bg-card"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{item.title}</span>
                </div>
                {item.locked ? (
                  renderLock(item)
                ) : item.fileUrl ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1" />
                        تحميل
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleComplete(item)}>
                      {item.contentProgress?.[0]?.isCompleted ? "✓" : "تم"}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {grouped.ASSIGNMENT.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            الواجبات والاختبارات
          </h2>
          <ul className="space-y-2">
            {grouped.ASSIGNMENT.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border rounded-lg p-3 bg-card"
              >
                <span>{item.title}</span>
                {item.locked ? (
                  renderLock(item)
                ) : item.quizId ? (
                  <Button size="sm" asChild>
                    <Link href={`/courses/${params.courseId}/quizzes/${item.quizId}`}>
                      بدء الاختبار
                    </Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {unit.contentItems.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          لا يوجد محتوى في هذه الوحدة.
        </p>
      )}
    </div>
  );
}
