"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { CourseBreadcrumbs } from "@/components/course-breadcrumbs";
import { PlyrVideoPlayer } from "@/components/plyr-video-player";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Play,
  ChevronDown,
  Lock,
  FileText,
  Download,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatCourseReleaseAt } from "@/lib/course-availability";
import { QuizRunner } from "@/components/quiz-runner";
import { cn } from "@/lib/utils";

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
  isGlobalShared?: boolean;
  locked?: boolean;
  releaseLocked?: boolean;
  prerequisiteError?: string | null;
  availableAt?: string | null;
  attachments?: Attachment[];
  contentProgress?: { isCompleted: boolean }[];
  unifiedCompleted?: boolean;
  quiz?: { id: string; title: string; isFree: boolean; quizResults?: { percentage: number }[] } | null;
};

type UnitData = {
  id: string;
  title: string;
  hasAccess: boolean;
  locked?: boolean;
  availableAt?: string | null;
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
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);

  const loadUnit = useCallback(async () => {
    try {
      const res = await axios.get(
        `/api/courses/${params.courseId}/units/${params.unitId}`,
        { validateStatus: (s) => (s >= 200 && s < 300) || s === 403 }
      );
      setUnit(res.data);
    } catch {
      toast.error("حدث خطأ في تحميل الوحدة");
    } finally {
      setLoading(false);
    }
  }, [params.courseId, params.unitId]);

  useEffect(() => {
    loadUnit();
    axios
      .get(`/api/courses/${params.courseId}/progress`)
      .then((res) => setCourseProgress(res.data.progress))
      .catch(() => {});
  }, [params.courseId, params.unitId, loadUnit]);

  useEffect(() => {
    const refresh = () => { void loadUnit(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [loadUnit]);

  const toggleComplete = async (item: ContentItem) => {
    if (item.locked || item.releaseLocked) return;
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

  if (unit.locked) {
    return (
      <div className="py-6">
        <CourseBreadcrumbs
          items={[
            { label: "الكورسات", href: "/dashboard" },
            {
              label: unit.course.title,
              href: `/courses/${params.courseId}/teachers`,
            },
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
        <div className="mt-10 max-w-lg mx-auto text-center border rounded-lg p-8 bg-muted/20">
          <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-xl font-bold mb-2">{unit.title}</h1>
          <p className="text-muted-foreground mb-1">الوحدة غير متاحة بعد</p>
          {unit.availableAt && (
            <p className="text-sm font-medium">
              متاح في {formatCourseReleaseAt(unit.availableAt)}
            </p>
          )}
          {unit.teacher && (
            <Button asChild variant="outline" className="mt-6">
              <Link
                href={`/courses/${params.courseId}/teachers/${unit.teacher.id}/units`}
              >
                العودة للوحدات
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const renderLock = (item: ContentItem) => {
    if (item.prerequisiteError) {
      return <p className="flex items-center gap-2 max-w-[16rem] text-xs text-muted-foreground"><Lock className="h-4 w-4 shrink-0" />{item.prerequisiteError} — يمكنك إكمال المطلوب عند أي مدرس.</p>;
    }
    if (item.releaseLocked) {
      return (
        <div className="text-xs text-muted-foreground flex items-center gap-1 max-w-[14rem] text-left">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {item.availableAt
              ? `متاح في ${formatCourseReleaseAt(item.availableAt)}`
              : "غير متاح بعد"}
          </span>
        </div>
      );
    }
    if (item.locked && !item.isFree) {
      return (
        <Button asChild size="sm" variant="outline">
          <Link href={`/courses/${params.courseId}/purchase`}>
            <Lock className="h-4 w-4 mr-1" />
            شراء للوصول
          </Link>
        </Button>
      );
    }
    return null;
  };

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

      <h2 className="mb-4 text-lg font-semibold">محتوى الوحدة بالترتيب</h2>
      <p className="mb-4 text-sm text-muted-foreground">أكمل الدروس بالترتيب واجتز الاختبارات بنسبة 50% أو أكثر. يتوحد تقدمك في الدروس والاختبارات المقابلة بين جميع المدرسين.</p>
      {unit.contentItems.map((contentItem) => (
        <div key={contentItem.id} id={`content-${contentItem.id}`}>
      {contentItem.type === "VIDEO" && (
        <section className="mb-3">
          <ul className="space-y-3">
            {[contentItem].map((item) => {
              const videoKey = getVideoPlayerKey(item);
              const isExpanded = expandedVideo === item.id;

              return (
              <li key={item.id} className={cn(
                "border rounded-xl p-4 bg-card transition-colors",
                !item.locked && "hover:border-primary/40",
                isExpanded && !item.locked && "border-primary/40 bg-primary/[0.02]"
              )}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg text-right outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 disabled:cursor-not-allowed"
                    aria-expanded={isExpanded && !item.locked}
                    aria-controls={`lesson-player-${item.id}`}
                    aria-label={`${isExpanded ? "إخفاء" : "مشاهدة"} الدرس: ${item.title}`}
                    onClick={() =>
                      !item.locked &&
                      setExpandedVideo(isExpanded ? null : item.id)
                    }
                    disabled={!!item.locked}
                  >
                    {item.locked ? (
                      <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Play className="h-5 w-5 fill-current" />
                      </span>
                    )}
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-10 w-16 object-cover rounded shrink-0"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        {item.title}
                        {(item.unifiedCompleted || item.contentProgress?.[0]?.isCompleted) && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                      </span>
                      {!item.locked && <span className="mt-1 block text-xs text-primary/80">{isExpanded ? "الدرس مفتوح — اضغط لإخفاء الفيديو" : "اضغط لمشاهدة الدرس"}</span>}
                    </span>
                    {item.isFree && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        مجاني
                      </span>
                    )}
                    {!item.locked && <ChevronDown className={cn("h-5 w-5 shrink-0 text-primary transition-transform motion-reduce:transition-none", isExpanded && "rotate-180")} />}
                  </button>
                  <div className="flex gap-2 items-center sm:shrink-0">
                    {!item.locked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleComplete(item)}
                        disabled={!item.contentProgress?.[0]?.isCompleted}
                      >
                        {item.unifiedCompleted && !item.contentProgress?.[0]?.isCompleted
                          ? "مكتمل مع مدرس آخر"
                          : item.contentProgress?.[0]?.isCompleted
                          ? "إلغاء الإكمال"
                          : "يكتمل بعد الاستماع للفيديو"}
                      </Button>
                    )}
                    {renderLock(item)}
                  </div>
                </div>
                {isExpanded && !item.locked && (
                  <div id={`lesson-player-${item.id}`} className="mt-4 space-y-4">
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
                          onEnded={() => { if (!item.contentProgress?.[0]?.isCompleted) void toggleComplete(item); }}
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

      {contentItem.type === "PDF" && (
        <section className="mb-3">
          <ul className="space-y-2">
            {[contentItem].map((item) => (
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
                    <Button variant="ghost" size="sm" onClick={() => toggleComplete(item)} disabled={item.unifiedCompleted && !item.contentProgress?.[0]?.isCompleted}>
                      {item.unifiedCompleted || item.contentProgress?.[0]?.isCompleted ? "✓" : "تم"}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {contentItem.type === "ASSIGNMENT" && (
        <section className="mb-3">
          <ul className="space-y-2">
            {[contentItem].map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border rounded-lg p-3 bg-card"
              >
                <div>
                  <span>{item.title}</span>
                  {item.isGlobalShared && <p className="mt-1 text-xs text-primary">اختبار موحد لجميع المدرسين — الأسئلة والدرجات والمحاولات مشتركة</p>}
                  {item.unifiedCompleted && <p className="mt-1 text-xs text-green-600">{item.isGlobalShared ? "تم اجتياز الاختبار الموحد — تم فتح المحتوى التالي في جميع المسارات" : "تم اجتياز الاختبار المقابل في أحد مسارات المدرسين"}</p>}
                  {!!item.quiz?.quizResults?.length && <p className="mt-1 text-xs text-muted-foreground">{item.quiz.quizResults[0].percentage >= 50 ? "تم الاجتياز" : "لم يتم الاجتياز — المطلوب 50% أو أكثر"}</p>}
                </div>
                {item.locked ? (
                  renderLock(item)
                ) : item.quizId ? (
                  item.isGlobalShared ? <Button size="sm" onClick={() => setActiveQuiz(activeQuiz === item.quizId ? null : item.quizId)}>
                    {activeQuiz === item.quizId ? "إخفاء الاختبار" : item.unifiedCompleted ? "محاولة أخرى" : "بدء الاختبار هنا"}
                  </Button> : <Button size="sm" asChild>
                    <Link href={`/courses/${params.courseId}/quizzes/${item.quizId}`}>
                      بدء الاختبار
                    </Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {contentItem.isGlobalShared && activeQuiz === contentItem.quizId && !contentItem.locked && contentItem.quizId && (
            <QuizRunner key={contentItem.quizId} courseId={params.courseId} quizId={contentItem.quizId} embedded
              onComplete={() => {
                void loadUnit();
                void axios.get(`/api/courses/${params.courseId}/progress`).then((res) => setCourseProgress(res.data.progress));
              }}
              onClose={() => { setActiveQuiz(null); void loadUnit(); }}
            />
          )}
        </section>
      )}

        </div>
      ))}

      {unit.contentItems.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          لا يوجد محتوى في هذه الوحدة.
        </p>
      )}
    </div>
  );
}
