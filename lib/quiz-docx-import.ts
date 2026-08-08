export type ImportedQuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER";

export interface ImportedQuizQuestion {
  id: string;
  text: string;
  type: ImportedQuestionType;
  options?: string[];
  correctAnswer: string | number;
  points: number;
}

export interface QuizDocxImportResult {
  questions: ImportedQuizQuestion[];
  warnings: string[];
}

const ARABIC_OPTION_LETTERS = ["أ", "ا", "ب", "ج", "د", "ه", "و"];
const LATIN_OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

const QUESTION_START =
  /^(?:س(?:ؤال)?\s*)?(\d+)[\.\)\-\:]|^Q\s*(\d+)[\.\)\-\:]|^السؤال\s*(\d+)/i;

const OPTION_LINE =
  /^(?:[(\[]?\s*([أابجدهوA-Fa-f0-9])\s*[)\].:-]|\*?\s*([أابجدهوA-Fa-f])\s*[)\].:-])\s*(.+)$/u;

const ANSWER_LINE =
  /^(?:الإجابة|الاجابة|الإجابه|الاجابه|Answer|Correct)\s*[:：\-]\s*(.+)$/i;

const POINTS_LINE = /^(?:النقاط|الدرجة|Points?|Score)\s*[:：\-]\s*(\d+(?:\.\d+)?)$/i;

const TYPE_HINT =
  /\[(اختيار من متعدد|متعدد|MCQ|MULTIPLE[\s_]?CHOICE|صح وخطأ|صح\/خطأ|TRUE[\s_]?FALSE|TF|إجابة قصيرة|قصير|SHORT[\s_]?ANSWER)\]/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function stripTypeHint(text: string): { text: string; typeHint?: ImportedQuestionType } {
  const match = text.match(TYPE_HINT);
  if (!match) return { text: normalizeWhitespace(text) };

  const raw = match[1].toLowerCase();
  let typeHint: ImportedQuestionType | undefined;
  if (/متعدد|mcq|multiple/.test(raw)) typeHint = "MULTIPLE_CHOICE";
  else if (/صح|true|tf/.test(raw)) typeHint = "TRUE_FALSE";
  else if (/قصير|short/.test(raw)) typeHint = "SHORT_ANSWER";

  return {
    text: normalizeWhitespace(text.replace(TYPE_HINT, "")),
    typeHint,
  };
}

function isTrueToken(value: string): boolean {
  const v = normalizeWhitespace(value).toLowerCase();
  return ["صح", "صحيح", "true", "t", "نعم", "yes"].includes(v);
}

function isFalseToken(value: string): boolean {
  const v = normalizeWhitespace(value).toLowerCase();
  return ["خطأ", "خطا", "خاطئ", "false", "f", "لا", "no"].includes(v);
}

function letterToIndex(letter: string): number {
  const upper = letter.toUpperCase();
  const latin = LATIN_OPTION_LETTERS.indexOf(upper);
  if (latin >= 0) return latin;

  // Treat أ and ا as the first option
  if (letter === "أ" || letter === "ا") return 0;
  const arabic = ARABIC_OPTION_LETTERS.indexOf(letter);
  if (arabic >= 0) {
    // ARABIC_OPTION_LETTERS: أ(0), ا(1), ب(2)... → map ا to 0, then shift
    if (arabic === 0 || arabic === 1) return 0;
    return arabic - 1;
  }

  if (/^\d$/.test(letter)) {
    const n = Number(letter);
    return n >= 1 ? n - 1 : n;
  }

  return -1;
}

function parseOptionLine(line: string): { letter?: string; text: string; starred: boolean } | null {
  const cleaned = normalizeWhitespace(line);
  if (!cleaned) return null;

  const starred = cleaned.includes("*");
  const withoutStar = normalizeWhitespace(cleaned.replace(/\*/g, ""));

  // Plain صح / خطأ lines (true/false options)
  if (isTrueToken(withoutStar) || isFalseToken(withoutStar)) {
    return { text: withoutStar, starred };
  }

  const match = withoutStar.match(OPTION_LINE);
  if (!match) return null;

  const letter = match[1] || match[2];
  const text = normalizeWhitespace(match[3] || "");
  if (!text) return null;

  return { letter, text, starred };
}

function looksLikeQuestionStart(line: string): boolean {
  return QUESTION_START.test(line);
}

function splitBlocks(rawText: string): string[] {
  // Word/mammoth often inserts blank lines between every paragraph.
  // Split only when a new numbered question begins — not on blank lines.
  const lines = rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => normalizeWhitespace(l.replace(/\u00a0/g, " ")))
    .filter(Boolean);

  const blocks: string[] = [];
  let current: string[] = [];
  let startedQuestions = false;

  const flush = () => {
    const joined = current.join("\n").trim();
    if (joined) blocks.push(joined);
    current = [];
  };

  for (const trimmed of lines) {
    if (looksLikeQuestionStart(trimmed)) {
      startedQuestions = true;
      if (current.length) flush();
      current.push(trimmed);
      continue;
    }

    // Skip preamble text before the first numbered question
    if (!startedQuestions) continue;

    current.push(trimmed);
  }

  flush();
  return blocks;
}

function parseBlock(
  block: string,
  index: number,
  warnings: string[]
): ImportedQuizQuestion | null {
  const lines = block
    .split("\n")
    .map(normalizeWhitespace)
    .filter(Boolean);

  if (!lines.length) return null;

  let points = 1;
  let answerRaw: string | undefined;
  const contentLines: string[] = [];

  for (const line of lines) {
    const pointsMatch = line.match(POINTS_LINE);
    if (pointsMatch) {
      points = Math.max(1, Math.round(Number(pointsMatch[1])));
      continue;
    }

    const answerMatch = line.match(ANSWER_LINE);
    if (answerMatch) {
      answerRaw = normalizeWhitespace(answerMatch[1].replace(/\*/g, ""));
      continue;
    }

    contentLines.push(line);
  }

  if (!contentLines.length) {
    warnings.push(`تم تخطي كتلة فارغة بالقرب من السؤال ${index + 1}`);
    return null;
  }

  // First line is the question (may include number prefix)
  let first = contentLines[0].replace(QUESTION_START, "").trim();
  first = first.replace(/^[\-\–—]\s*/, "");
  const { text: questionTextSeed, typeHint } = stripTypeHint(first);

  const optionLines = contentLines.slice(1);
  const parsedOptions = optionLines
    .map(parseOptionLine)
    .filter((o): o is NonNullable<typeof o> => Boolean(o));

  const looksLikeTrueFalse =
    typeHint === "TRUE_FALSE" ||
    (parsedOptions.length >= 1 &&
      parsedOptions.every((o) => isTrueToken(o.text) || isFalseToken(o.text)));

  const looksLikeMcq =
    typeHint === "MULTIPLE_CHOICE" ||
    (!looksLikeTrueFalse && parsedOptions.length >= 2);

  const looksLikeShort =
    typeHint === "SHORT_ANSWER" ||
    (!looksLikeTrueFalse && !looksLikeMcq && Boolean(answerRaw));

  if (looksLikeTrueFalse) {
    let correct: "true" | "false" | undefined;

    const starred = parsedOptions.find((o) => o.starred);
    if (starred) {
      correct = isTrueToken(starred.text) ? "true" : "false";
    } else if (answerRaw) {
      if (isTrueToken(answerRaw)) correct = "true";
      else if (isFalseToken(answerRaw)) correct = "false";
    }

    if (!correct) {
      warnings.push(`السؤال ${index + 1}: لم يتم تحديد إجابة صح/خطأ`);
      return null;
    }

    const text =
      questionTextSeed ||
      contentLines
        .filter((l) => {
          const p = parseOptionLine(l);
          return !(p && (isTrueToken(p.text) || isFalseToken(p.text)));
        })
        .join(" ")
        .replace(QUESTION_START, "")
        .trim();

    if (!text) {
      warnings.push(`السؤال ${index + 1}: نص السؤال فارغ`);
      return null;
    }

    return {
      id: `imported-${Date.now()}-${index}`,
      text,
      type: "TRUE_FALSE",
      correctAnswer: correct,
      points,
    };
  }

  if (looksLikeMcq) {
    const options = parsedOptions.map((o) => o.text);
    if (options.length < 2) {
      warnings.push(`السؤال ${index + 1}: يحتاج خيارين على الأقل`);
      return null;
    }

    let correctIndex = parsedOptions.findIndex((o) => o.starred);

    if (correctIndex < 0 && answerRaw) {
      // الإجابة: أ  / الإجابة: كتب  / الإجابة: 1
      const letterIdx = letterToIndex(answerRaw.charAt(0));
      if (answerRaw.length <= 2 && letterIdx >= 0 && letterIdx < options.length) {
        correctIndex = letterIdx;
      } else {
        const byText = options.findIndex(
          (o) => normalizeWhitespace(o).toLowerCase() === answerRaw.toLowerCase()
        );
        correctIndex = byText;
      }
    }

    if (correctIndex < 0 || correctIndex >= options.length) {
      warnings.push(`السؤال ${index + 1}: لم يتم تحديد الإجابة الصحيحة`);
      return null;
    }

    if (!questionTextSeed) {
      warnings.push(`السؤال ${index + 1}: نص السؤال فارغ`);
      return null;
    }

    return {
      id: `imported-${Date.now()}-${index}`,
      text: questionTextSeed,
      type: "MULTIPLE_CHOICE",
      options,
      correctAnswer: correctIndex,
      points,
    };
  }

  if (looksLikeShort || answerRaw) {
    if (!questionTextSeed) {
      warnings.push(`السؤال ${index + 1}: نص السؤال فارغ`);
      return null;
    }
    if (!answerRaw) {
      warnings.push(`السؤال ${index + 1}: أضف سطر الإجابة: ...`);
      return null;
    }

    return {
      id: `imported-${Date.now()}-${index}`,
      text: questionTextSeed,
      type: "SHORT_ANSWER",
      correctAnswer: answerRaw,
      points,
    };
  }

  warnings.push(
    `السؤال ${index + 1}: تعذر التعرف على النوع. استخدم * على الخيار الصحيح أو سطر "الإجابة:"`
  );
  return null;
}

export function parseQuizQuestionsFromText(rawText: string): QuizDocxImportResult {
  const warnings: string[] = [];
  const blocks = splitBlocks(rawText);

  if (!blocks.length) {
    return { questions: [], warnings: ["الملف فارغ أو لا يحتوي على أسئلة"] };
  }

  const questions: ImportedQuizQuestion[] = [];
  blocks.forEach((block, index) => {
    const parsed = parseBlock(block, index, warnings);
    if (parsed) questions.push(parsed);
  });

  if (!questions.length && !warnings.length) {
    warnings.push("لم يتم العثور على أسئلة صالحة في الملف");
  }

  return { questions, warnings };
}

export async function parseQuizQuestionsFromDocx(
  file: ArrayBuffer | Uint8Array
): Promise<QuizDocxImportResult> {
  const mammoth = await import("mammoth");
  const input =
    file instanceof ArrayBuffer
      ? { arrayBuffer: file }
      : { arrayBuffer: file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) };

  const result = await mammoth.extractRawText(input as { arrayBuffer: ArrayBuffer });
  return parseQuizQuestionsFromText(result.value || "");
}
