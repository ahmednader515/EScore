import * as fs from "fs";
import * as path from "path";

export function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function loadImportEnvFiles(): void {
  const load = (filePath: string): void => {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const raw = trimmed.slice(eq + 1);
      if (!key || process.env[key] !== undefined) continue;
      process.env[key] = stripWrappingQuotes(raw);
    }
  };
  load(path.resolve(process.cwd(), ".env"));
  load(path.resolve(process.cwd(), ".env.local"));
}

export function getPrismaDatasourceUrl(): string {
  const url =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Missing DIRECT_DATABASE_URL or DATABASE_URL. Set one in .env or .env.local."
    );
  }
  return url;
}

/** Split one CSV line (no embedded newlines) into fields. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

/**
 * Parse full CSV document; supports `"`...`"` fields with commas and newlines,
 * and `""` escaped quotes inside quoted fields.
 */
export function parseCsvDocument(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const len = text.length;
  for (let i = 0; i < len; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && i + 1 < len && text[i + 1] === '"') {
        field += '"';
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        continue;
      }
      field += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && i + 1 < len && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += c;
  }
  row.push(field);
  rows.push(row);
  return rows.filter(
    (r) => r.some((cell) => String(cell).trim().length > 0)
  );
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Drop repeated CSV header rows and other lines without a valid id. */
export function filterRowsWithValidId(
  rows: Record<string, string>[],
  idKey = "id"
): Record<string, string>[] {
  return rows.filter((r) => UUID_RE.test((r[idKey] ?? "").trim()));
}

export function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ""));
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const obj: Record<string, string> = {};
    header.forEach((h, j) => {
      obj[h] = cells[j] ?? "";
    });
    out.push(obj);
  }
  return out;
}

export function parseCsvFile(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsvDocument(raw);
  return filterRowsWithValidId(csvRowsToObjects(rows));
}

/** Legacy: line-based parse (breaks on multiline quoted fields). */
export function parseCsvSimple(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    header.forEach((h, j) => {
      obj[h] = cells[j] ?? "";
    });
    out.push(obj);
  }
  return out;
}
