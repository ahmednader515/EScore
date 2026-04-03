"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type ReelVideo = {
  id: string;
  title: string;
  youtubeVideoId: string;
  createdByName?: string | null;
};

export default function ReelsPage() {
  const [reels, setReels] = useState<ReelVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReels = async () => {
      try {
        const response = await fetch("/api/reels");
        if (!response.ok) return;
        const data = await response.json();
        setReels(data);
      } catch (error) {
        console.error("Error loading reels:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReels();
  }, []);

  return (
    <div className="h-screen bg-black text-white">
      <div className="fixed top-4 left-4 z-20">
        <Button asChild variant="secondary" className="bg-white/90 text-black hover:bg-white">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            الرجوع للرئيسية
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="h-full flex items-center justify-center text-lg">جاري تحميل الريلز...</div>
      ) : reels.length === 0 ? (
        <div className="h-full flex items-center justify-center text-lg">لا توجد ريلز متاحة حالياً</div>
      ) : (
        <div className="h-full overflow-y-auto snap-y snap-mandatory">
          {reels.map((reel) => (
            <section
              key={reel.id}
              className="relative h-screen w-full snap-start flex items-center justify-center px-3 py-10"
            >
              <div className="relative h-full w-full max-w-md rounded-xl overflow-hidden border border-white/20 bg-black">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${reel.youtubeVideoId}?playsinline=1&rel=0&modestbranding=1`}
                  title={reel.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
                {/* Visual mask for YouTube Shorts top header (channel/title strip). */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-black" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4">
                  <p className="font-semibold text-base">{reel.title}</p>
                  {reel.createdByName && (
                    <p className="text-xs text-white/80 mt-1">بواسطة: {reel.createdByName}</p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

