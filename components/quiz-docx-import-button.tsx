"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  parseQuizQuestionsFromDocx,
  type ImportedQuizQuestion,
} from "@/lib/quiz-docx-import";

interface QuizDocxImportButtonProps {
  onImport: (questions: ImportedQuizQuestion[]) => void;
  disabled?: boolean;
}

export function QuizDocxImportButton({
  onImport,
  disabled,
}: QuizDocxImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    const isDocx =
      file.name.toLowerCase().endsWith(".docx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isDocx) {
      toast.error("يرجى اختيار ملف Word بصيغة .docx");
      return;
    }

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const { questions, warnings } = await parseQuizQuestionsFromDocx(buffer);

      if (!questions.length) {
        toast.error(
          warnings[0] ||
            "لم يتم العثور على أسئلة صالحة. تحقق من تنسيق الملف."
        );
        return;
      }

      onImport(questions);

      if (warnings.length) {
        toast.success(`تم استيراد ${questions.length} سؤال`);
        toast.warning(warnings.slice(0, 3).join(" — "));
      } else {
        toast.success(`تم استيراد ${questions.length} سؤال بنجاح`);
      }
    } catch (error) {
      console.error("DOCX import failed:", error);
      toast.error("فشل قراءة ملف Word. تأكد أن الملف بصيغة .docx وليس .doc");
    } finally {
      setIsImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || isImporting}
        onClick={() => inputRef.current?.click()}
      >
        {isImporting ? (
          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
        ) : (
          <FileUp className="h-4 w-4 ml-2" />
        )}
        استيراد من Word
      </Button>
    </>
  );
}
