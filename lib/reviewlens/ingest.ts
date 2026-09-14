import type { Mapping, ParsedFile, Review, ImportIssue } from "./types";
import { classifyAspects } from "./intelligence";
export const LIMITS = {
  bytes: 2 * 1024 * 1024,
  rows: 2000,
  text: 6000,
  datasets: 20,
};
export function parseFile(content: string, filename: string): ParsedFile {
  if (new TextEncoder().encode(content).length > LIMITS.bytes)
    throw Error("Choose a file smaller than 2 MB.");
  content = content.replace(/^\uFEFF/, "");
  const issues: ImportIssue[] = [];
  if (filename.toLowerCase().endsWith(".json")) {
    let value;
    try {
      value = JSON.parse(content);
    } catch {
      throw Error(
        "This JSON file is not valid. Check brackets and quotation marks.",
      );
    }
    const list = Array.isArray(value) ? value : value?.reviews;
    if (
      !Array.isArray(list) ||
      !list.length ||
      list.some((x) => !x || typeof x !== "object" || Array.isArray(x))
    )
      throw Error(
        "Use a JSON array of review objects, or an object containing a reviews array.",
      );
    if (list.length > LIMITS.rows)
      throw Error("A dataset can contain up to 2,000 reviews.");
    const headers = [...new Set<string>(list.flatMap((x) => Object.keys(x)))];
    return {
      headers,
      rows: list.map((x) =>
        Object.fromEntries(
          headers.map((k) => [k, x[k] == null ? "" : String(x[k])]),
        ),
      ),
      rowNumbers: list.map((_, i) => i + 1),
      issues,
    };
  }
  if (!filename.toLowerCase().endsWith(".csv"))
    throw Error("Choose a CSV or JSON file.");
  const matrix: { cells: string[]; line: number }[] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    afterQuote = false,
    line = 1,
    rowLine = 1;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (quoted) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        cell += c;
        if (c === "\n") line++;
        else if (c === "\r") {
          if (content[i + 1] === "\n") {
            cell += "\n";
            i++;
          }
          line++;
        }
      }
      continue;
    }
    if (c === '"') {
      if (cell.trim() || afterQuote) {
        cell += c;
        afterQuote = false;
        continue;
      }
      quoted = true;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      afterQuote = false;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && content[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) matrix.push({ cells: row, line: rowLine });
      row = [];
      cell = "";
      afterQuote = false;
      line++;
      rowLine = line;
      continue;
    }
    if (afterQuote && c.trim())
      throw Error("Unexpected text after a quoted CSV field.");
    cell += c;
  }
  if (quoted) throw Error("A quoted CSV field is unfinished.");
  row.push(cell);
  if (row.some((x) => x.trim())) matrix.push({ cells: row, line: rowLine });
  if (matrix.length < 2)
    throw Error("Include a header and at least one review row.");
  const headers = matrix.shift()!.cells.map((x) => x.trim());
  if (headers.some((x) => !x) || new Set(headers).size !== headers.length)
    throw Error("Every column needs a unique, non-empty header.");
  if (matrix.length > LIMITS.rows)
    throw Error("A dataset can contain up to 2,000 reviews.");
  const rows: Record<string, string>[] = [],
    rowNumbers: number[] = [];
  matrix.forEach(({ cells: r, line }) => {
    if (r.length !== headers.length) {
      issues.push({
        row: line,
        message: `Expected ${headers.length} columns, found ${r.length}. Put quotation marks around text containing commas.`,
      });
      return;
    }
    rows.push(Object.fromEntries(headers.map((h, j) => [h, r[j]])));
    rowNumbers.push(line);
  });
  return { headers, rows, rowNumbers, issues };
}
export function guessMapping(headers: string[]): Mapping {
  const aliases: Record<keyof Mapping, string[]> = {
    text: ["review_text", "text", "comment", "content", "review", "body"],
    rating: ["rating", "star_rating", "stars", "score"],
    date: ["review_date", "date", "created_at"],
    product: ["product", "product_name", "item"],
    version: ["product_version", "version"],
    region: ["region", "country", "location"],
    source: ["source", "platform", "channel"],
    id: ["review_id", "id"],
  };
  const normalized = (header: string) =>
    header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  return Object.fromEntries(
    Object.entries(aliases).map(([k, v]) => [
      k,
      headers.find((h) => v.includes(normalized(h))) || "",
    ]),
  ) as Mapping;
}
export function normalizeImport(
  parsed: ParsedFile,
  mapping: Mapping,
): { reviews: Review[]; issues: ImportIssue[]; duplicates: number } {
  if (
    !mapping ||
    typeof mapping.text !== "string" ||
    !parsed.headers.includes(mapping.text)
  )
    throw Error("Map the column containing review text.");
  const issues = [...parsed.issues],
    reviews: Review[] = [],
    seen = new Set<string>();
  let duplicates = 0;
  parsed.rows.forEach((r, i) => {
    const get = (k: keyof Mapping) => {
      const column = mapping[k];
      if (!column) return "";
      if (!parsed.headers.includes(column))
        throw Error(`Map the ${k} column to a valid header.`);
      const value = r[column];
      return typeof value === "string" ? value.trim() : "";
    };
    const text = get("text"),
      rowNumber = parsed.rowNumbers?.[i] ?? i + 2;
    if (!text || text.length > LIMITS.text) {
      issues.push({
        row: rowNumber,
        message: !text
          ? "Review text is missing."
          : "Review exceeds 6,000 characters.",
      });
      return;
    }
    const raw = get("rating"),
      rating = raw ? Number(raw) : null;
    if (
      rating !== null &&
      (!/^(?:[1-4](?:\.\d+)?|5(?:\.0+)?)$/.test(raw) ||
        !Number.isFinite(rating) ||
        rating < 1 ||
        rating > 5)
    ) {
      issues.push({
        row: rowNumber,
        message: "Rating must be a decimal number between 1 and 5, or empty.",
      });
      return;
    }
    const rawDate = get("date");
    let date = rawDate.slice(0, 10);
    const slash = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/),
      dash = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (slash)
      date = `${slash[3]}-${slash[1].padStart(2, "0")}-${slash[2].padStart(2, "0")}`;
    else if (dash)
      date = `${dash[1]}-${dash[2].padStart(2, "0")}-${dash[3].padStart(2, "0")}`;
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    ) {
      issues.push({
        row: rowNumber,
        message: "Invalid date was omitted; use YYYY-MM-DD.",
        level: "warning",
      });
      date = "";
    }
    const normalized = text
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const key = get("id")
      ? `${get("source")}|${get("product")}|${get("id")}`
      : [
          normalized,
          rating,
          date,
          get("source"),
          get("product"),
          get("version"),
          get("region"),
        ].join("|");
    if (seen.has(key)) {
      duplicates++;
      return;
    }
    seen.add(key);
    reviews.push({
      id: crypto.randomUUID(),
      text,
      rating,
      date,
      product: get("product"),
      version: get("version"),
      region: get("region"),
      source: get("source"),
      aspects: classifyAspects(text),
    });
  });
  return { reviews, issues, duplicates };
}
