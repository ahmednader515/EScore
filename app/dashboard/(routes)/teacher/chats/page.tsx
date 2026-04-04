"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

type ThreadSummary = {
  id: string;
  updatedAt: string;
  student: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
  course: {
    id: string;
    title: string;
  };
  messagesCount: number;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      fullName: string;
      role: string;
    };
  } | null;
};

type ThreadDetails = {
  thread: {
    id: string;
    student: {
      id: string;
      fullName: string;
      phoneNumber: string;
    };
    course: {
      id: string;
      title: string;
    };
    updatedAt: string;
  };
  messages: {
    id: string;
    content: string;
    createdAt: string;
    sender: {
      id: string;
      fullName: string;
      role: string;
    };
  }[];
};

export default function TeacherChatsPage() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadDetails, setThreadDetails] = useState<ThreadDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchThreads = async () => {
    try {
      const res = await fetch("/api/teacher/chats", { cache: "no-store" });
      if (!res.ok) {
        toast.error("فشل تحميل المحادثات");
        return;
      }
      const data = await res.json();
      setThreads(data);
      if (!selectedThreadId && data.length > 0) {
        setSelectedThreadId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تحميل المحادثات");
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadDetails = async (threadId: string) => {
    try {
      const res = await fetch(`/api/teacher/chats/${threadId}`, { cache: "no-store" });
      if (!res.ok) {
        toast.error("فشل تحميل الرسائل");
        return;
      }
      const data = await res.json();
      setThreadDetails(data);
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تحميل الرسائل");
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (!selectedThreadId) {
      setThreadDetails(null);
      return;
    }

    fetchThreadDetails(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchThreads();
      if (selectedThreadId) {
        fetchThreadDetails(selectedThreadId);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedThreadId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [selectedThreadId, threadDetails?.messages]);

  const filteredThreads = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (thread) =>
        thread.student.fullName.toLowerCase().includes(q) ||
        thread.student.phoneNumber.includes(q) ||
        thread.course.title.toLowerCase().includes(q)
    );
  }, [threads, searchTerm]);

  const sendReply = async () => {
    if (!selectedThreadId) return;
    const content = replyText.trim();
    if (!content) return;

    setSending(true);
    try {
      const res = await fetch(`/api/teacher/chats/${selectedThreadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        toast.error("تعذر إرسال الرسالة");
        return;
      }

      setReplyText("");
      await fetchThreadDetails(selectedThreadId);
      await fetchThreads();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">جاري تحميل المحادثات...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">محادثات الطلاب</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              جميع المحادثات
            </CardTitle>
            <Input
              placeholder="بحث باسم الطالب أو رقمه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد محادثات حالياً</p>
            ) : (
              filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  className={`w-full text-right p-3 rounded-lg border transition ${
                    selectedThreadId === thread.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/60"
                  }`}
                  onClick={() => setSelectedThreadId(thread.id)}
                >
                  <p className="font-semibold">{thread.student.fullName}</p>
                  <p className="text-xs text-muted-foreground">{thread.course.title}</p>
                  {thread.lastMessage && (
                    <p className="text-xs mt-1 truncate text-muted-foreground">
                      {thread.lastMessage.content}
                    </p>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>
                {threadDetails
                  ? `${threadDetails.thread.student.fullName} - ${threadDetails.thread.course.title}`
                  : "اختر محادثة"}
              </CardTitle>
              {threadDetails && (
                <p className="text-xs text-muted-foreground">
                  الطالب: {threadDetails.thread.student.fullName} - {threadDetails.thread.student.phoneNumber}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!threadDetails ? (
              <div className="text-center text-muted-foreground py-10">
                اختر محادثة من القائمة لعرض الرسائل
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  ref={messagesContainerRef}
                  className="h-[50vh] overflow-y-auto border rounded-lg p-3 space-y-2 bg-[#ece5dd]"
                >
                  {threadDetails.messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">لا توجد رسائل بعد</p>
                  ) : (
                    threadDetails.messages.map((message) => {
                      const isTeacher =
                        message.sender.role === "TEACHER" || message.sender.role === "ADMIN";
                      return (
                        <div key={message.id} className={`flex ${isTeacher ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[85%] px-3 py-2 rounded-2xl shadow-sm text-sm ${
                              isTeacher
                                ? "bg-white rounded-tl-md border"
                                : "bg-[#dcf8c6] rounded-tr-md"
                            }`}
                          >
                            <div className="text-[11px] font-semibold mb-1 text-muted-foreground">
                              {isTeacher ? (message.sender.fullName || "المعلم") : threadDetails.thread.student.fullName}
                            </div>
                            <p className="leading-relaxed">{message.content}</p>
                            <p className="text-[10px] mt-1 opacity-70 text-left">
                              {new Date(message.createdAt).toLocaleString("ar-EG")}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="اكتب ردك..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <Button onClick={sendReply} disabled={sending}>
                    <Send className="h-4 w-4 mr-2" />
                    إرسال
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

