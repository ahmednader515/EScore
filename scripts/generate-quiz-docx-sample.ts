/**
 * Generates a sample .docx quiz import template.
 * Run: npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/generate-quiz-docx-sample.ts
 */
import * as fs from "fs";
import * as path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

const lines: Array<{ text: string; bold?: boolean; heading?: boolean }> = [
  { text: "نموذج استيراد أسئلة الاختبار", bold: true, heading: true },
  {
    text: "ضع كل سؤال في فقرة منفصلة (سطر فارغ بين الأسئلة). ضع علامة * بجانب الإجابة الصحيحة، أو استخدم سطر الإجابة:",
  },
  { text: "" },
  { text: "1. ما هو جمع كلمة «كتاب»؟ [اختيار من متعدد]", bold: true },
  { text: "أ) كتب *" },
  { text: "ب) كاتب" },
  { text: "ج) مكتوب" },
  { text: "د) كتابة" },
  { text: "النقاط: 1" },
  { text: "" },
  {
    text: "2. الماضي التام يُستخدم للتعبير عن حدث وقع قبل حدث آخر في الماضي. [صح وخطأ]",
    bold: true,
  },
  { text: "صح *" },
  { text: "خطأ" },
  { text: "" },
  { text: "3. أكمل: The past perfect of go is ______. [إجابة قصيرة]", bold: true },
  { text: "الإجابة: had gone" },
  { text: "النقاط: 2" },
  { text: "" },
  { text: "4. أي مما يلي فعل في زمن المضارع التام؟", bold: true },
  { text: "أ) I went" },
  { text: "ب) I have gone" },
  { text: "ج) I go" },
  { text: "د) I was going" },
  { text: "الإجابة: ب" },
  { text: "" },
  { text: "5. الجملة التالية صحيحة نحوياً: She don't like tea.", bold: true },
  { text: "صح" },
  { text: "خطأ *" },
];

async function main() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: lines.map((line) => {
          if (line.heading) {
            return new Paragraph({
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              children: [
                new TextRun({
                  text: line.text,
                  bold: true,
                  size: 32,
                  font: "Arial",
                  rightToLeft: true,
                }),
              ],
            });
          }

          if (!line.text) {
            return new Paragraph({ children: [] });
          }

          return new Paragraph({
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: line.text,
                bold: line.bold,
                size: 24,
                font: "Arial",
                rightToLeft: true,
              }),
            ],
          });
        }),
      },
    ],
  });

  const outDir = path.join(process.cwd(), "public", "samples");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "quiz-questions-sample.docx");
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
