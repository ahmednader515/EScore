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
  /^(?:س(?:ؤال)?\s*)?(\d+)[\.\)\-\:]|^Q(?:uestion)?\s*(\d+)[\.\)\-\:]|^السؤال\s*(\d+)/i;

/** A) text | A. text | A - text | A text | (a) text | 1) text */
const OPTION_LINE =
  /^(?:[(\[]\s*)?([أابجدهوA-Fa-f0-9])(?:\s*[)\].:\-–—]|\s+)(?:\s*)(.+)$/u;

const BULLET_OPTION_LINE = /^[\-–—•●○]\s+(.+)$/u;

/** Split inline options: "... decade. a) x b) y c) z d) w*" */
const INLINE_OPTION_SPLIT =
  /(?=(?:^|\s)(?:[(\[]\s*)?[أابجدهوA-Fa-f]\s*[)\].:\-–—]\s*)/u;

const ANSWER_LINE =
  /^(?:الإجابة|الاجابة|الإجابه|الاجابه|Ans(?:wer)?(?:\s*Key)?|Correct(?:\s*Answer)?)\s*[:：\-]\s*(.+)$/i;

const POINTS_LINE =
  /^(?:النقاط|الدرجة|Points?|Score)\s*[:：\-]\s*(\d+(?:\.\d+)?)$/i;

const TYPE_HINT =
  /\[(اختيار من متعدد|متعدد|MCQ|MULTIPLE[\s_\-]?CHOICE|صح\s*و?\s*خطأ|صح\s*\/\s*خطأ|TRUE\s*[\/_\-]?\s*FALSE|T\s*\/\s*F|TF|إجابة قصيرة|قصير|SHORT[\s_\-]?ANSWER)\]/i;

type ParsedOption = { letter?: string; text: string; starred: boolean };

type QuestionDraft = {
  number: number;
  text: string;
  typeHint?: ImportedQuestionType;
  options: ParsedOption[];
  answerRaw?: string;
  points: number;
};

function normalizeWhitespace(value: string): string {
  return value
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "") // bidi marks
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "") // zero-width / soft hyphen
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Normalize look-alike asterisks / footnote markers used in Word */
function normalizeAsterisks(value: string): string {
  return value
    .replace(/[∗＊✱⁎﹡★☆]/g, "*")
    .replace(/(?:\[\d+\]|\(\d+\))\s*$/g, "*"); // footnote/endnote refs
}

function stripTypeHint(text: string): {
  text: string;
  typeHint?: ImportedQuestionType;
} {
  const match = text.match(TYPE_HINT);
  if (!match) return { text: normalizeWhitespace(text) };

  const raw = match[1].toLowerCase();
  let typeHint: ImportedQuestionType | undefined;
  if (/متعدد|mcq|multiple/.test(raw)) typeHint = "MULTIPLE_CHOICE";
  else if (/صح|true|tf|t\s*\/\s*f/.test(raw)) typeHint = "TRUE_FALSE";
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

  if (letter === "أ" || letter === "ا") return 0;
  const arabic = ARABIC_OPTION_LETTERS.indexOf(letter);
  if (arabic >= 0) {
    if (arabic === 0 || arabic === 1) return 0;
    return arabic - 1;
  }

  if (/^\d$/.test(letter)) {
    const n = Number(letter);
    return n >= 1 ? n - 1 : n;
  }

  return -1;
}

function extractQuestionNumber(line: string): number | null {
  const match = line.match(QUESTION_START);
  if (!match) return null;
  const num = match[1] || match[2] || match[3];
  return num ? Number(num) : null;
}

function looksLikeQuestionStart(line: string): boolean {
  return QUESTION_START.test(line);
}

function parseOptionLine(line: string): ParsedOption | null {
  const cleaned = normalizeWhitespace(normalizeAsterisks(line));
  if (!cleaned) return null;

  const starred = cleaned.includes("*");
  const withoutStar = normalizeWhitespace(cleaned.replace(/\*/g, ""));

  if (isTrueToken(withoutStar) || isFalseToken(withoutStar)) {
    return { text: withoutStar, starred };
  }

  const match = withoutStar.match(OPTION_LINE);
  if (match) {
    const letter = match[1];
    const text = normalizeWhitespace(match[2] || "");
    if (!text) return null;
    return { letter, text, starred };
  }

  const bullet = withoutStar.match(BULLET_OPTION_LINE);
  if (bullet) {
    const text = normalizeWhitespace(bullet[1] || "");
    if (!text) return null;
    return { text, starred };
  }

  return null;
}

function parsePlainOptionLine(line: string): ParsedOption | null {
  const cleaned = normalizeWhitespace(normalizeAsterisks(line));
  if (!cleaned) return null;
  if (looksLikeQuestionStart(cleaned)) return null;
  if (ANSWER_LINE.test(cleaned) || POINTS_LINE.test(cleaned)) return null;

  const starred = cleaned.includes("*");
  const text = normalizeWhitespace(cleaned.replace(/\*/g, ""));
  if (!text) return null;
  return { text, starred };
}

/**
 * Expand a line that contains the question plus inline a) b) c) d) options.
 */
function expandInlineOptions(line: string): string[] {
  const cleaned = normalizeAsterisks(normalizeWhitespace(line));
  if (!cleaned) return [];

  // Need at least two option markers to treat as inline options
  const optionMarkers = cleaned.match(
    /(?:^|\s)(?:[(\[]\s*)?[أابجدهوA-Fa-f]\s*[)\].:\-–—]\s+\S/gu
  );
  if (!optionMarkers || optionMarkers.length < 2) {
    return [cleaned];
  }

  const parts = cleaned
    .split(INLINE_OPTION_SPLIT)
    .map((p) => normalizeWhitespace(p))
    .filter(Boolean);

  if (parts.length < 2) return [cleaned];
  return parts;
}

function flattenLines(rawText: string): string[] {
  const rawLines = rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => normalizeWhitespace(normalizeAsterisks(l.replace(/\u00a0/g, " "))))
    .filter(Boolean);

  const out: string[] = [];
  for (const line of rawLines) {
    const expanded = expandInlineOptions(line);
    out.push(...expanded);
  }
  return out;
}

function resolveMcqCorrectIndex(
  parsedOptions: ParsedOption[],
  options: string[],
  answerRaw?: string
): number {
  let correctIndex = parsedOptions.findIndex((o) => o.starred);

  if (correctIndex < 0 && answerRaw) {
    const trimmed = answerRaw.trim();
    const letterToken = trimmed.replace(/[)\].:\-–—]/g, "").trim();
    const letterIdx = letterToIndex(letterToken.charAt(0));
    if (
      letterToken.length <= 2 &&
      letterIdx >= 0 &&
      letterIdx < options.length
    ) {
      correctIndex = letterIdx;
    } else {
      correctIndex = options.findIndex(
        (o) =>
          normalizeWhitespace(o).toLowerCase() ===
          normalizeWhitespace(trimmed).toLowerCase()
      );
    }
  }

  return correctIndex;
}

function finalizeQuestion(
  draft: QuestionDraft,
  indexLabel: number,
  warnings: string[]
): ImportedQuizQuestion | null {
  let options = draft.options;

  // Fallback: if options were stored as plain text elsewhere — already on draft
  if (options.length < 2 && draft.answerRaw) {
    // keep as potentially short answer
  }

  const looksLikeTrueFalse =
    draft.typeHint === "TRUE_FALSE" ||
    (options.length >= 1 &&
      options.every((o) => isTrueToken(o.text) || isFalseToken(o.text)));

  const looksLikeMcq =
    draft.typeHint === "MULTIPLE_CHOICE" ||
    (!looksLikeTrueFalse && options.length >= 2);

  const looksLikeShort =
    draft.typeHint === "SHORT_ANSWER" ||
    (!looksLikeTrueFalse && !looksLikeMcq && Boolean(draft.answerRaw));

  if (looksLikeTrueFalse) {
    let correct: "true" | "false" | undefined;
    const starred = options.find((o) => o.starred);
    if (starred) correct = isTrueToken(starred.text) ? "true" : "false";
    else if (draft.answerRaw) {
      if (isTrueToken(draft.answerRaw)) correct = "true";
      else if (isFalseToken(draft.answerRaw)) correct = "false";
    }
    if (!correct) {
      warnings.push(`السؤال ${indexLabel}: لم يتم تحديد إجابة صح/خطأ`);
      return null;
    }
    if (!draft.text) {
      warnings.push(`السؤال ${indexLabel}: نص السؤال فارغ`);
      return null;
    }
    return {
      id: `imported-${Date.now()}-${indexLabel}`,
      text: draft.text,
      type: "TRUE_FALSE",
      correctAnswer: correct,
      points: draft.points,
    };
  }

  if (looksLikeMcq) {
    const optionTexts = options.map((o) => o.text);
    const correctIndex = resolveMcqCorrectIndex(
      options,
      optionTexts,
      draft.answerRaw
    );
    if (correctIndex < 0 || correctIndex >= optionTexts.length) {
      warnings.push(`السؤال ${indexLabel}: لم يتم تحديد الإجابة الصحيحة`);
      return null;
    }
    if (!draft.text) {
      warnings.push(`السؤال ${indexLabel}: نص السؤال فارغ`);
      return null;
    }
    return {
      id: `imported-${Date.now()}-${indexLabel}`,
      text: draft.text,
      type: "MULTIPLE_CHOICE",
      options: optionTexts,
      correctAnswer: correctIndex,
      points: draft.points,
    };
  }

  if (looksLikeShort || draft.answerRaw) {
    if (!draft.text) {
      warnings.push(`السؤال ${indexLabel}: نص السؤال فارغ`);
      return null;
    }
    if (!draft.answerRaw) {
      warnings.push(`السؤال ${indexLabel}: أضف سطر Answer: أو الإجابة: ...`);
      return null;
    }
    return {
      id: `imported-${Date.now()}-${indexLabel}`,
      text: draft.text,
      type: "SHORT_ANSWER",
      correctAnswer: draft.answerRaw,
      points: draft.points,
    };
  }

  warnings.push(
    `السؤال ${indexLabel}: تعذر التعرف على النوع. استخدم * على الخيار الصحيح أو سطر Answer: / الإجابة:`
  );
  return null;
}

/**
 * Build drafts from lines, handling:
 * - normal sequential questions
 * - two-column / table interleaving (Q1, Q6, a, a, b, b, ...)
 */
function buildDrafts(lines: string[]): QuestionDraft[] {
  type Token =
    | { kind: "question"; number: number; text: string; typeHint?: ImportedQuestionType }
    | { kind: "option"; option: ParsedOption }
    | { kind: "answer"; value: string }
    | { kind: "points"; value: number }
    | { kind: "text"; value: string };

  const tokens: Token[] = [];
  let started = false;

  for (const line of lines) {
    const qNum = extractQuestionNumber(line);
    if (qNum !== null) {
      started = true;
      let rest = line.replace(QUESTION_START, "").trim().replace(/^[\-\–—]\s*/, "");
      const { text, typeHint } = stripTypeHint(rest);
      tokens.push({ kind: "question", number: qNum, text, typeHint });
      continue;
    }

    if (!started) continue;

    const pointsMatch = line.match(POINTS_LINE);
    if (pointsMatch) {
      tokens.push({
        kind: "points",
        value: Math.max(1, Math.round(Number(pointsMatch[1]))),
      });
      continue;
    }

    const answerMatch = line.match(ANSWER_LINE);
    if (answerMatch) {
      tokens.push({
        kind: "answer",
        value: normalizeWhitespace(
          normalizeAsterisks(answerMatch[1]).replace(/\*/g, "")
        ),
      });
      continue;
    }

    const opt = parseOptionLine(line);
    if (opt) {
      tokens.push({ kind: "option", option: opt });
      continue;
    }

    tokens.push({ kind: "text", value: line });
  }

  const draftsByNumber = new Map<number, QuestionDraft>();
  const order: number[] = [];

  const ensureDraft = (
    number: number,
    text = "",
    typeHint?: ImportedQuestionType
  ): QuestionDraft => {
    let draft = draftsByNumber.get(number);
    if (!draft) {
      draft = { number, text, typeHint, options: [], points: 1 };
      draftsByNumber.set(number, draft);
      order.push(number);
    } else {
      if (text && !draft.text) draft.text = text;
      if (typeHint && !draft.typeHint) draft.typeHint = typeHint;
    }
    return draft;
  };

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token.kind === "question") {
      // Collect consecutive questions (two-column / table row)
      const group: Array<{
        number: number;
        text: string;
        typeHint?: ImportedQuestionType;
      }> = [];
      while (i < tokens.length && tokens[i].kind === "question") {
        const q = tokens[i] as Extract<Token, { kind: "question" }>;
        group.push({
          number: q.number,
          text: q.text,
          typeHint: q.typeHint,
        });
        i++;
      }

      for (const q of group) {
        ensureDraft(q.number, q.text, q.typeHint);
      }

      // Collect following options / meta until next question
      const trailingOptions: ParsedOption[] = [];
      const trailingText: string[] = [];
      let sharedAnswer: string | undefined;
      let sharedPoints: number | undefined;

      while (i < tokens.length && tokens[i].kind !== "question") {
        const t = tokens[i];
        if (t.kind === "option") trailingOptions.push(t.option);
        else if (t.kind === "answer") sharedAnswer = t.value;
        else if (t.kind === "points") sharedPoints = t.value;
        else if (t.kind === "text") trailingText.push(t.value);
        i++;
      }

      const plainFromText = trailingText
        .map(parsePlainOptionLine)
        .filter((o): o is ParsedOption => Boolean(o));

      // Prefer letter/bullet options; else plain lines as options
      const opts =
        trailingOptions.length >= 2
          ? trailingOptions
          : plainFromText.length >= 2
            ? plainFromText
            : trailingOptions.length > 0
              ? trailingOptions
              : plainFromText;

      const usedTextAsOptions =
        opts === plainFromText && plainFromText.length >= 2;

      // Question continuation only when text was not consumed as options
      if (group.length === 1 && trailingText.length && !usedTextAsOptions) {
        if (trailingOptions.length < 2) {
          const draft = ensureDraft(group[0].number);
          for (const line of trailingText) {
            const { text: cont, typeHint } = stripTypeHint(line);
            if (cont) {
              draft.text = normalizeWhitespace(`${draft.text} ${cont}`);
              if (typeHint) draft.typeHint = typeHint;
            }
          }
        }
      }

      if (group.length === 1) {
        const draft = ensureDraft(group[0].number);
        draft.options.push(...opts);
        if (sharedAnswer) draft.answerRaw = sharedAnswer;
        if (sharedPoints) draft.points = sharedPoints;
      } else {
        // Round-robin distribute options across the question group
        opts.forEach((opt, idx) => {
          const target = group[idx % group.length];
          const draft = ensureDraft(target.number);
          draft.options.push(opt);
        });
        if (sharedAnswer || sharedPoints) {
          for (const q of group) {
            const draft = ensureDraft(q.number);
            if (sharedAnswer && !draft.answerRaw) draft.answerRaw = sharedAnswer;
            if (sharedPoints) draft.points = sharedPoints;
          }
        }
      }
      continue;
    }

    // Orphan tokens before any handled question — skip
    i++;
  }

  return order.map((n) => draftsByNumber.get(n)!).filter(Boolean);
}

export function parseQuizQuestionsFromText(rawText: string): QuizDocxImportResult {
  const warnings: string[] = [];
  const lines = flattenLines(rawText);
  const drafts = buildDrafts(lines);

  if (!drafts.length) {
    return { questions: [], warnings: ["الملف فارغ أو لا يحتوي على أسئلة"] };
  }

  const questions: ImportedQuizQuestion[] = [];
  drafts.forEach((draft, index) => {
    const parsed = finalizeQuestion(draft, draft.number || index + 1, warnings);
    if (parsed) questions.push(parsed);
  });

  // Keep quiz order by question number when available
  questions.sort((a, b) => {
    const na = drafts.find((d) => d.text === a.text)?.number ?? 0;
    const nb = drafts.find((d) => d.text === b.text)?.number ?? 0;
    return na - nb;
  });

  if (!questions.length && !warnings.length) {
    warnings.push("لم يتم العثور على أسئلة صالحة في الملف");
  }

  return { questions, warnings };
}

const LATIN_LIST_LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h"];

/**
 * Convert mammoth HTML into plain lines, preserving Word auto-list markers
 * that extractRawText often drops.
 *
 * Word lettered option lists (a b c d) become <ol>/<ul> without the letters
 * in the text — we re-attach a) b) c) so the quiz parser can see options.
 */
function htmlToQuizLines(html: string): string {
  const withBreaks = html
    .replace(/<\/(p|div|h[1-6]|tr|table|section)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n");

  let listCounter = 0;
  const listAware = withBreaks.replace(
    /<\/?ol\b[^>]*>|<\/?ul\b[^>]*>|<li\b[^>]*>/gi,
    (tag) => {
      const lower = tag.toLowerCase();
      if (lower.startsWith("<ol") || lower.startsWith("<ul")) {
        listCounter = 0;
        return "\n";
      }
      if (lower.startsWith("</ol") || lower.startsWith("</ul")) {
        listCounter = 0;
        return "\n";
      }
      if (lower.startsWith("<li")) {
        const letter = LATIN_LIST_LETTERS[listCounter] || "a";
        listCounter += 1;
        // Always letter-prefix list items — Word MCQ options are lists;
        // numbered questions are usually plain paragraphs ("1. ...").
        return `\n${letter}) `;
      }
      return "\n";
    }
  );

  return listAware
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export async function parseQuizQuestionsFromDocx(
  file: ArrayBuffer | Uint8Array
): Promise<QuizDocxImportResult & { debugText?: string }> {
  const mammoth = await import("mammoth");
  const input =
    file instanceof ArrayBuffer
      ? { arrayBuffer: file }
      : {
          arrayBuffer: file.buffer.slice(
            file.byteOffset,
            file.byteOffset + file.byteLength
          ),
        };

  const arrayBuffer = (input as { arrayBuffer: ArrayBuffer }).arrayBuffer;

  // Prefer HTML — preserves list structure that raw text drops
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  const fromHtml = htmlToQuizLines(htmlResult.value || "");
  const htmlParsed = parseQuizQuestionsFromText(fromHtml);

  if (htmlParsed.questions.length > 0) {
    return { ...htmlParsed, debugText: fromHtml };
  }

  // Fallback to raw text extraction
  const textResult = await mammoth.extractRawText({ arrayBuffer });
  const raw = textResult.value || "";
  const textParsed = parseQuizQuestionsFromText(raw);

  if (textParsed.questions.length > 0) {
    return { ...textParsed, debugText: raw };
  }

  // Merge warnings and include a short preview to help diagnose format issues
  const preview = (fromHtml || raw).slice(0, 240).replace(/\s+/g, " ");
  return {
    questions: [],
    warnings: [
      ...(htmlParsed.warnings.length ? htmlParsed.warnings : textParsed.warnings),
      preview
        ? `معاينة الملف: ${preview}${preview.length >= 240 ? "…" : ""}`
        : "الملف فارغ أو لا يمكن قراءة النص",
    ],
    debugText: fromHtml || raw,
  };
}
