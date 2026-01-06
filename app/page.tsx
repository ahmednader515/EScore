"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Star, Users, BookOpen, Award, ChevronDown, Facebook, Lightbulb, Heart, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { ScrollProgress } from "@/components/scroll-progress";
import { useEffect, useState } from "react";

// Define types based on Prisma schema
type Course = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CourseWithProgress = Course & {
  chapters: { id: string }[];
  quizzes: { id: string }[];
  enrollmentCount: number;
  progress: number;
};

export default function HomePage() {
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        // Fetch courses from public API endpoint
        const response = await fetch("/api/courses/public");
        
        if (!response.ok) {
          console.error("Failed to fetch courses:", response.status, response.statusText);
          return;
        }
        
        const data = await response.json();
        setCourses(data);

      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollIndicator(entry.isIntersecting);
      },
      {
        threshold: 0.5, // Trigger when 50% of the hero section is visible
      }
    );

    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      observer.observe(heroSection);
    }

    return () => {
      if (heroSection) {
        observer.unobserve(heroSection);
      }
    };
  }, []);

  const scrollToCourses = () => {
    const coursesSection = document.getElementById('courses-section');
    if (coursesSection) {
      const offset = coursesSection.offsetTop - 80; // Adjust for navbar height
      window.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="h-full w-full bg-background">
      <Navbar />
      <ScrollProgress />
      {/* Hero Section */}
      <section id="hero-section" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 md:pt-24 bg-white">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8 items-center">
          {/* Image Section - Second on mobile */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative flex justify-center items-center order-2 md:order-2"
          >
            {/* Background Image */}
            <div className="absolute top-[380px] md:top-0 left-1/2 -translate-x-1/2 md:-translate-y-[55px] -translate-y-1/2 md:translate-y-0 flex items-center justify-center z-0 w-[120%] h-[120%] md:w-[110%] md:h-[110%]">
              <Image
                src="/background.png"
                alt="background"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 120vw, 55vw"
                priority={false}
              />
            </div>
            
            {/* Mobile: All items in one vertical column */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-6 md:flex-wrap py-8 md:py-12">
              {/* Teacher 1 - Medium size */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-48 h-48 md:w-56 md:h-56 mb-3">
                  <Image
                    src="/teacher-image.png"
                    alt="علاء الجبيلي"
                    fill
                    priority
                    className="object-cover rounded-full border-4 border-[#361e01]/20 shadow-lg"
                    sizes="(max-width: 768px) 192px, 224px"
                  />
                </div>
                <p className="text-xl md:text-2xl font-bold font-playpen-sans-arabic" style={{ color: '#361e01', fontFamily: 'var(--font-playpen-sans-arabic)' }}>
                  علاء الجبيلي
                </p>
              </motion.div>

              {/* Teacher 2 - Largest size */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-56 h-56 md:w-72 md:h-72 mb-3">
                  <Image
                    src="/teacher-image2.png"
                    alt="عبد الكريم الزيات"
                    fill
                    className="object-cover rounded-full border-4 border-[#361e01]/20 shadow-lg"
                    sizes="(max-width: 768px) 224px, 288px"
                  />
                </div>
                <p className="text-xl md:text-2xl font-bold font-playpen-sans-arabic" style={{ color: '#361e01', fontFamily: 'var(--font-playpen-sans-arabic)' }}>
                  عبد الكريم الزيات
                </p>
              </motion.div>

              {/* Teacher 3 - Same size as first */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-col items-center -mt-8 md:mt-0"
              >
                <div className="relative w-48 h-48 md:w-56 md:h-56 mb-3">
                  <Image
                    src="/teacher-image3.png"
                    alt="رضا المطراوي"
                    fill
                    className="object-cover rounded-full border-4 border-[#361e01]/20 shadow-lg"
                    sizes="(max-width: 768px) 192px, 224px"
                  />
                </div>
                <p className="text-xl md:text-2xl font-bold font-playpen-sans-arabic" style={{ color: '#361e01', fontFamily: 'var(--font-playpen-sans-arabic)' }}>
                  رضا المطراوي
                </p>
              </motion.div>

              {/* Mobile: Static Cards Below Teacher Circles */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="md:hidden w-full max-w-sm"
              >
                <div className="bg-[#fcfaed] rounded-lg border border-[#ab8302] px-4 py-3 flex items-center gap-3 shadow-md">
                  <div className="w-10 h-10 bg-[#361e01] rounded-full flex items-center justify-center flex-shrink-0">
                    <Image
                      src="/pi.png"
                      alt="pi"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold" style={{ color: '#361e01' }}>لغتك قوتك</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="md:hidden w-full max-w-sm"
              >
                <div className="bg-[#fcfaed] rounded-lg border border-[#ab8302] px-4 py-3 flex items-center gap-3 shadow-md">
                  <div className="w-10 h-10 bg-[#361e01] rounded-full flex items-center justify-center flex-shrink-0">
                    <Image
                      src="/calculator.png"
                      alt="calculator"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold" style={{ color: '#361e01' }}>مستقبلك يبدأ هنا</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
                className="md:hidden w-full max-w-sm"
              >
                <div className="bg-[#fcfaed] rounded-lg border border-[#ab8302] px-4 py-3 flex items-center gap-3 shadow-md">
                  <div className="w-10 h-10 bg-[#361e01] rounded-full flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold" style={{ color: '#361e01' }}>لغة للنجاح</span>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Desktop: Floating Stationery Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: [0, -15, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.5,
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                rotate: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="hidden md:block absolute top-1 -right-2"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <div className="bg-[#fcfaed] rounded-lg border border-[#ab8302] px-4 py-3 flex items-center gap-3 shadow-md">
                <div className="w-10 h-10 bg-[#361e01] rounded-full flex items-center justify-center flex-shrink-0">
              <Image
                src="/pi.png"
                alt="pi"
                    width={24}
                    height={24}
                className="object-contain"
              />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold" style={{ color: '#361e01' }}>لغتك قوتك</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: [0, -12, 0],
                rotate: [0, -5, 0]
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.7,
                y: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                rotate: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="hidden md:block absolute bottom-1/3 left-6"
              whileHover={{ scale: 1.1, rotate: -5 }}
            >
              <div className="bg-[#fcfaed] rounded-lg border border-[#ab8302] px-4 py-3 flex items-center gap-3 shadow-md">
                <div className="w-10 h-10 bg-[#361e01] rounded-full flex items-center justify-center flex-shrink-0">
              <Image
                src="/calculator.png"
                alt="calculator"
                    width={24}
                    height={24}
                className="object-contain"
              />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold" style={{ color: '#361e01' }}>مستقبلك يبدأ هنا</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: [0, -18, 0],
                rotate: [0, 10, 0]
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.9,
                y: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                rotate: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="hidden md:block absolute top-1/2 -right-6"
              whileHover={{ scale: 1.1, rotate: 10 }}
            >
              <div className="bg-[#fcfaed] rounded-lg border border-[#ab8302] px-4 py-3 flex items-center gap-3 shadow-md">
                <div className="w-10 h-10 bg-[#361e01] rounded-full flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold" style={{ color: '#361e01' }}>لغة للنجاح</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Text Section - First on mobile */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center order-1 md:order-1"
          >
            <div className="mb-4 flex justify-center">
              <Image
                src="/logo.png"
                alt="منصة E Score"
                width={700}
                height={700}
                className="w-auto h-[360px] md:h-[542px]"
                unoptimized
              />
            </div>
            <p className="text-xl md:text-2xl mb-4 font-bold" style={{ color: '#ab8302' }}>
              طور_لغتك_طور_مستقبلك#
            </p>
            
            {/* Text Bubbles */}
            <div className="flex flex-col gap-2 mb-6 max-w-sm mx-auto">
              {/* First Bubble */}
              <div className="bg-[#fcfaed] rounded-lg px-4 py-3 flex items-center gap-2 border border-[#361e01]/10">
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm md:text-base font-medium text-right" style={{ color: '#361e01' }}>
                  مدرسين لغة إنجليزية معتمدين دوليا
                </p>
              </div>
              
              {/* Second Bubble */}
              <div className="bg-[#fcfaed] rounded-lg px-4 py-3 flex items-center gap-2 border border-[#361e01]/10">
                <div className="w-7 h-7 bg-[#ab8302] rounded-full flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-white fill-white" />
                </div>
                <p className="text-sm md:text-base font-medium text-right" style={{ color: '#361e01' }}>
                  أكثر من25 سنين خبرة في تدريس مناهج اللغة الإنجليزية
                </p>
              </div>
            </div>
            
            {/* Navigation Items */}
            <div className="flex items-center justify-center gap-4 md:gap-6 mb-8 flex-wrap">
              <div className="flex items-center gap-2 cursor-pointer">
                <span className="text-base md:text-lg font-bold" style={{ color: '#361e01' }}>لغات</span>
                <ChevronRight className="w-4 h-4" style={{ color: '#8b0000' }} />
              </div>
              <div className="flex items-center gap-2 cursor-pointer">
                <span className="text-base md:text-lg font-bold" style={{ color: '#361e01' }}>مدارس عربي</span>
                <ChevronRight className="w-4 h-4" style={{ color: '#006400' }} />
              </div>
              <div className="flex items-center gap-2 cursor-pointer">
                <span className="text-base md:text-lg font-bold" style={{ color: '#361e01' }}>كورسات</span>
                <ChevronRight className="w-4 h-4" style={{ color: '#006400' }} />
              </div>
            </div>
            
            <p className="text-lg md:text-xl mb-8" style={{ color: '#361e01' }}>
              انضم إلينا في رحلتنا في <span style={{ color: '#ab8302' }}>2026</span>
            </p>
            <Button size="lg" asChild className="bg-[#361e01] hover:bg-[#361e01]/90 text-white mb-8">
              <Link href="/sign-up">
                تسجيل الدخول <ArrowRight className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        {showScrollIndicator && (
          <motion.div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex-col items-center gap-2 cursor-pointer hidden md:flex"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 1, duration: 0.5 }}
            onClick={scrollToCourses}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
          </motion.div>
        )}
      </section>

      {/* Social Media Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#361e01' }}>
              متابعينا على السوشيال ميديا
            </h2>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex justify-center mb-8"
            >
              <svg
                width="50"
                height="30"
                viewBox="0 0 50 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ color: '#ab8302' }}
              >
                <path
                  d="M25 5 L25 25 M15 15 L25 25 L35 15"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          </motion.div>
          
          <div className="flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-[#fcfaed] rounded-xl p-6 shadow-lg hover:shadow-xl transition-all w-full max-w-sm border border-[#361e01]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <Facebook className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold" style={{ color: '#361e01' }}>1.5k</h3>
                    <p className="text-lg font-semibold" style={{ color: '#361e01' }}>فيسبوك</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6" dir="ltr">
                <Link
                  href="https://www.facebook.com/share/g/17eVUPDmLb/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-[#361e01] hover:bg-[#361e01]/90 rounded-full flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </Link>
                <p className="text-lg font-semibold flex-1 text-right" style={{ color: '#361e01' }}>
                  تابعنا من هنا
                </p>
              </div>
            </motion.div>
          </div>

          {/* Support Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-20 max-w-4xl mx-auto">
            {/* Scientific Support Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="relative bg-[#fcfaed] rounded-xl p-6 border border-[#361e01] shadow-lg hover:shadow-xl transition-all"
            >
              <div className="absolute -top-6 right-6 w-16 h-16 bg-[#fcfaed] rounded-full border-2 border-[#361e01] flex items-center justify-center">
                <Lightbulb className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-bold mb-2" style={{ color: '#361e01' }}>
                  الدعم العلمي
                </h3>
                <p className="text-base" style={{ color: '#361e01' }}>
                  مستعدين نجاوب على أسئلتك طول اليوم
                </p>
              </div>
            </motion.div>

            {/* Psychological Support Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
              className="relative bg-[#fcfaed] rounded-xl p-6 border border-[#361e01] shadow-lg hover:shadow-xl transition-all"
            >
              <div className="absolute -top-6 right-6 w-16 h-16 bg-[#fcfaed] rounded-full border-2 border-[#361e01] flex items-center justify-center">
                <Heart className="h-8 w-8 text-red-600 fill-red-600" />
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-bold mb-2" style={{ color: '#361e01' }}>
                  الدعم النفسي
                </h3>
                <p className="text-base" style={{ color: '#361e01' }}>
                  متفهمين حاجتك و معاك بشكل مستمر
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses-section" className="py-20 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#361e01' }}>الكورسات المتاحة</h2>
            <p className="text-muted-foreground">اكتشف مجموعة متنوعة من الكورسات التعليمية المميزة</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6"
          >
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="w-full sm:w-80 md:w-72 lg:w-80 bg-card rounded-xl overflow-hidden border border-[#361e01] shadow-sm animate-pulse"
                >
                  <div className="w-full aspect-video bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              courses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">لا توجد كورسات متاحة حالياً</h3>
                    <p className="text-muted-foreground mb-4">
                      سيتم إضافة الكورسات قريباً. تحقق من هذه الصفحة لاحقاً للاطلاع على أحدث الكورسات التعليمية.
                    </p>
                    <Button 
                      variant="outline" 
                      asChild
                      className="bg-[#361e01] hover:bg-[#361e01]/90 text-white border-[#361e01]"
                    >
                      <Link href="/sign-up">
                        سجل الآن للوصول المبكر
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                courses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group w-full sm:w-80 md:w-72 lg:w-80 bg-card rounded-xl overflow-hidden border border-[#361e01] shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="relative w-full aspect-video">
                      <Image
                        src={course.imageUrl || "/placeholder.png"}
                        alt={course.title}
                        fill
                        className="object-cover rounded-t-xl"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>
                            {course.chapters?.length || 0} {course.chapters?.length === 1 ? "فصل" : "فصول"}
                            {course.quizzes && course.quizzes.length > 0 && (
                              <span className="mr-2">، {course.quizzes.length} {course.quizzes.length === 1 ? "اختبار" : "اختبارات"}</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{course.enrollmentCount ?? 0} طالب مسجل</span>
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-[#361e01] hover:bg-[#361e01]/90 text-white" 
                        variant="default"
                        asChild
                      >
                        <Link href={course.chapters && course.chapters.length > 0 ? `/courses/${course.id}/chapters/${course.chapters[0].id}` : `/courses/${course.id}`}>
                          {course.progress === 100 ? "عرض الكورس" : "عرض الكورس"}
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                ))
              )
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#361e01' }}>آراء الطلاب</h2>
            <p className="text-muted-foreground">ماذا يقول طلابنا عن تجربتهم معنا</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "عصام اسامة",
                grade: "الصف الأول الثانوي",
                testimonial: "تجربة رائعة مع المنصة شرح مميز وطريقة سهلة في توصيل المعلومة"
              },
              {
                name: "سيف طارق",
                grade: "الصف الثاني الثانوي",
                testimonial: "المنهج منظم جداً والشرح واضح، ساعدوني في فهم الانجليزي بشكل أفضل"
              },
              {
                name: "عمر جمال",
                grade: "الصف الأول الثانوي",
                testimonial: "أفضل منصة متخصصة لكورسات الانجليزي"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-[#fcfaed] rounded-lg p-6 shadow-lg border border-[#361e01]"
              >
                <div className="flex items-center mb-4">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden">
                    <Image
                      src="/male.png"
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="mr-4">
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.grade}</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  &ldquo;{testimonial.testimonial}&rdquo;
                </p>
                <div className="flex mt-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">مميزات المنصة</h2>
            <p className="text-muted-foreground">اكتشف ما يجعل منصتنا مميزة</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6 rounded-xl bg-[#fcfaed] border border-[#361e01] shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-[#361e01]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-[#361e01]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">جودة عالية</h3>
              <p className="text-muted-foreground">أفضل منصة متخصصة لكورسات الانجليزي</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-6 rounded-xl bg-[#fcfaed] border border-[#361e01] shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-[#361e01]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-[#361e01]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">مجتمع نشط</h3>
              <p className="text-muted-foreground">انضم إلى مجتمع من الطلاب النشطين والمتفوقين والأوائل</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center p-6 rounded-xl bg-[#fcfaed] border border-[#361e01] shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-[#361e01]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-6 w-6 text-[#361e01]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">شهادات تقدير</h3>
              <p className="text-muted-foreground">احصل على شهادات تقدير عند إكمال الكورسات</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#361e01' }}>ابدأ رحلة التعلم معنا</h2>
            <p className="text-muted-foreground mb-8">
              انضم إلينا اليوم وابدأ رحلة النجاح
            </p>
            <Button size="lg" asChild className="bg-[#361e01] hover:bg-[#361e01]/90 text-white">
              <Link href="/sign-up">
                سجل الآن <ArrowRight className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
} 