import test from "node:test";
import assert from "node:assert/strict";
import {
  answerQuestion,
  classifyAspects,
  stats,
  searchEvidence,
} from "../work/intelligence.mjs";
import { parseFile, normalizeImport, guessMapping } from "../work/ingest.mjs";
const texts = [
  ["Checkout works well, but login fails.", 2, "EU", "1.0"],
  ["Login is fast and reliable.", 5, "NA", "1.0"],
  ["My password is rejected.", 1, "EU", "2.0"],
  ["Battery drains too quickly.", 2, "NA", "2.0"],
  ["No login problems.", null, "EU", "2.0"],
];
const rows = texts.map(([text, rating, region, version], i) => ({
  id: String(i),
  text,
  rating,
  region,
  version,
  product: "Tool",
  source: "Store",
  date: "2026-08-01",
  aspects: classifyAspects(text),
}));
test("rating questions preserve negation and explicit alternatives", () => {
  const fixture = [5, 1, 5].map((rating, i) => ({
    ...rows[0],
    id: String(i),
    rating,
  }));
  for (const [question, expected] of [
    ["How many reviews are five-star?", 2],
    ["How many reviews are not five-star?", 1],
    ["How many reviews are three-star or five-star?", 2],
    ["What percentage are not five-star?", 33.3],
    ["What percentage are three-star or five-star?", 66.7],
  ]) {
    const a = answerQuestion(fixture, question);
    assert.equal(a.status, "supported", question);
    assert.equal(a.metric.value, expected, question);
  }
  assert.equal(
    answerQuestion(
      [...fixture, { ...fixture[0], id: "unrated", rating: null }],
      "How many reviews are not five-star?",
    ).metric.value,
    1,
  );
  assert.equal(
    answerQuestion(fixture, "How many reviews are not five-star?", {
      rating: "5",
    }).metric.value,
    0,
  );
});
test("ambiguous rating expressions clarify instead of silently calculating", () => {
  for (const q of [
    "How many reviews are not three-star or five-star?",
    "How many reviews are three-star and five-star?",
    "How many reviews are below five-star?",
    "How many reviews are at least three-star?",
    "How many reviews are not only five-star?",
    "What is the average rating of not five-star reviews?",
  ]) {
    const a = answerQuestion(rows, q);
    assert.equal(a.status, "clarify", q);
    assert.equal(a.metric, undefined, q);
  }
});
test("prevalence counts all relevant reviews regardless of retrieved example count", () => {
  const a = answerQuestion(rows, "What negative do most people point to?");
  assert.equal(a.count, 5);
  assert.match(a.summary, /2 of 5/);
  assert.equal(a.intent, "Complaint ranking");
});
test("sentiment is separate from star rating and feature polarity", () => {
  assert.equal(
    rows[0].aspects.find((a) => a.key === "billing").sentiment,
    "positive",
  );
  assert.equal(
    rows[0].aspects.find((a) => a.key === "login").sentiment,
    "negative",
  );
  assert.equal(
    rows[4].aspects.find((a) => a.key === "login").sentiment,
    "positive",
  );
});
test("low rated share and average handle unrated records", () => {
  assert.equal(
    answerQuestion(rows, "What percentage are two-star?").metric.value,
    40,
  );
  assert.equal(
    answerQuestion(rows, "What is the average rating?").metric.value,
    2.5,
  );
  assert.equal(stats(rows).unrated, 1);
});
test("scoped topic average uses the matching subset", () => {
  const a = answerQuestion(rows, "What is the average rating for login?");
  assert.equal(a.metric.denominator, 3);
  assert.equal(a.metric.value, 2.67);
});
test("two explicit comparison groups respect the written direction", () => {
  assert.equal(
    answerQuestion(rows, "Compare version 2.0 vs 1.0").comparison.left,
    "2.0",
  );
  assert.equal(
    answerQuestion(rows, "Compare version 2.0 vs 1.0").comparison.right,
    "1.0",
  );
});
test("unrecognised topic complaint does not return a general ranking", () => {
  const a = answerQuestion(
    rows,
    "What are complaints about Alexa integration?",
  );
  assert.notEqual(a.intent, "Complaint ranking");
  assert.equal(a.citations.length, 0);
});
test("unknown or conflicting scope requests clarify", () => {
  assert.equal(
    answerQuestion(rows, "What do EU customers say?", { region: "NA" }).status,
    "clarify",
  );
  assert.equal(
    answerQuestion(rows, "What changed last month?").status,
    "clarify",
  );
  assert.equal(
    answerQuestion(rows, "What do UK customers say?").status,
    "clarify",
  );
});
test("explicit date ranges constrain results and invalid dates clarify", () => {
  assert.equal(
    answerQuestion(rows, "How many reviews from 2026-09-01 to 2026-09-30?")
      .count,
    0,
  );
  assert.equal(
    answerQuestion(rows, "How many reviews from 2026-02-30 to 2026-03-10?")
      .status,
    "clarify",
  );
});
test("requests to count people are not passed off as review counts", () => {
  assert.equal(
    answerQuestion(rows, "How many customers mention login?").status,
    "clarify",
  );
});
test("nested percentages use the named topic as their denominator", () => {
  const fixture = Array.from({ length: 20 }, (_, i) => ({
    ...rows[0],
    id: `nested-${i}`,
    rating: i < 5 ? 1 : 5,
    text:
      i < 10
        ? i < 8
          ? "Login fails."
          : "Login works well."
        : "Billing works well.",
    aspects: classifyAspects(
      i < 10
        ? i < 8
          ? "Login fails."
          : "Login works well."
        : "Billing works well.",
    ),
  }));
  assert.equal(
    answerQuestion(
      fixture,
      "What percentage of reviews mentioning login are one-star?",
    ).metric.value,
    50,
  );
  assert.equal(
    answerQuestion(fixture, "What percentage of login reviews are negative?")
      .metric.value,
    80,
  );
});
test("topic boolean operators, topic negation and sentiment negation are honoured", () => {
  const fixture = [
    ["Login fails and billing is expensive.", 1],
    ["Login works and billing is easy.", 5],
    ["Login fails.", 1],
    ["Billing is expensive.", 1],
    ["Battery is good.", 5],
  ].map(([text, rating], i) => ({
    ...rows[0],
    id: `bool-${i}`,
    text,
    rating,
    aspects: classifyAspects(text),
  }));
  assert.equal(
    answerQuestion(fixture, "How many reviews mention login and billing?")
      .metric.value,
    2,
  );
  assert.equal(
    answerQuestion(fixture, "How many reviews are not about login?").metric
      .value,
    2,
  );
  assert.equal(
    answerQuestion(
      fixture,
      "What percentage of login reviews are not positive?",
    ).metric.value,
    66.7,
  );
  assert.equal(
    answerQuestion(fixture, "How many bad reviews?").status,
    "clarify",
  );
});
test("negated contractions reverse nearby feature sentiment", () => {
  for (const text of [
    "Login isn't slow.",
    "Battery doesn't drain.",
    "Support isn't unhelpful.",
  ]) {
    const aspects = classifyAspects(text);
    assert.ok(aspects.length, text);
    assert.notEqual(aspects[0].sentiment, "negative", text);
  }
});
test("ordinary pronouns and star ratings do not become hidden metadata filters", () => {
  const fixture = ["IN", "IT", "US", "EU"].map((region, i) => ({
    ...rows[0],
    id: `scope-${i}`,
    region,
    version: String(i + 3),
    rating: i === 2 ? 5 : 1,
    text: "Login fails.",
    aspects: classifyAspects("Login fails."),
  }));
  assert.equal(
    answerQuestion(fixture, "Can you tell us the most common complaints?")
      .count,
    4,
  );
  assert.equal(
    answerQuestion(fixture, "What do people like about it in general?").filters
      .region,
    undefined,
  );
  assert.equal(
    answerQuestion(fixture, "How many 5-star reviews are there?").metric.value,
    1,
  );
});
test("rating aliases, fractional conditions and rating-subset averages are explicit", () => {
  const fixture = [1, 5, 5, 4.5].map((rating, i) => ({
    ...rows[0],
    id: `rating-${i}`,
    rating,
  }));
  assert.equal(
    answerQuestion(fixture, "How many reviews are rated 5?").metric.value,
    2,
  );
  assert.equal(
    answerQuestion(fixture, "How many 4.5-star reviews are there?").status,
    "clarify",
  );
  assert.equal(
    answerQuestion(fixture, "What is the average rating of 5-star reviews?")
      .metric.value,
    5,
  );
  assert.equal(
    answerQuestion(fixture, "What proportion of reviews are five-star?").metric
      .value,
    50,
  );
  assert.equal(
    answerQuestion(fixture, "What is the average score?").metric.value,
    3.88,
  );
});
test("comparison scope, complaint phrasing and Europe alias are respected", () => {
  const fixture = ["EU", "NA"].flatMap((region) =>
    ["1.0", "2.0"].flatMap((version) =>
      [0, 1].map((_, i) => ({
        ...rows[0],
        id: `${region}-${version}-${i}`,
        region,
        version,
        rating: i ? 5 : 1,
        text: i ? "Login is fast." : "Login fails.",
        aspects: classifyAspects(i ? "Login is fast." : "Login fails."),
      })),
    ),
  );
  const compared = answerQuestion(fixture, "Compare EU vs NA in version 2.0");
  assert.equal(compared.comparison.leftCount, 2);
  assert.equal(compared.comparison.rightCount, 2);
  assert.equal(compared.filters.version, "2.0");
  assert.equal(
    answerQuestion(fixture, "What percentage of reviews complain about login?")
      .metric.value,
    50,
  );
  assert.equal(
    answerQuestion(fixture, "What do customers in Europe say about login?")
      .filters.region,
    "EU",
  );
  assert.notEqual(
    answerQuestion(fixture, "Why does login fail after the update?").intent,
    "Segment comparison",
  );
  assert.notEqual(
    answerQuestion(fixture, "Do customers complain about the dropdown menu?")
      .intent,
    "Segment comparison",
  );
});
test("theme matching avoids prefix collisions and handles typographic negation", () => {
  assert.equal(
    classifyAspects("The app supports dark mode.").some(
      (a) => a.key === "support",
    ),
    false,
  );
  assert.equal(
    classifyAspects("Sounds good, login is great.").some(
      (a) => a.key === "sound",
    ),
    false,
  );
  assert.equal(
    classifyAspects("The UI is clean and modern.").some(
      (a) => a.key === "cleanliness",
    ),
    false,
  );
  assert.equal(
    classifyAspects("Login is broken.").some((a) => a.key === "quality"),
    false,
  );
  assert.equal(
    classifyAspects("The app isn’t fast.").find((a) => a.key === "performance")
      .sentiment,
    "negative",
  );
  assert.equal(
    classifyAspects("Login doesn’t work.").find((a) => a.key === "login")
      .sentiment,
    "negative",
  );
  assert.equal(
    classifyAspects("Login no longer works.").find((a) => a.key === "login")
      .sentiment,
    "negative",
  );
  assert.equal(
    classifyAspects("The price is too high.").find((a) => a.key === "price")
      .sentiment,
    "negative",
  );
});
test("complaint evidence excludes positive mentions and negative reviews use low ratings", () => {
  const fixture = [
    "Support was helpful.",
    "Support was rude.",
    "Support was slow.",
  ].map((text, i) => ({
    ...rows[0],
    id: `support-${i}`,
    text,
    rating: [5, 1, 2][i],
    aspects: classifyAspects(text),
  }));
  assert.deepEqual(
    searchEvidence(fixture, "Find complaints about customer support").map(
      (r) => r.id,
    ),
    ["support-1", "support-2"],
  );
  const answer = answerQuestion(
    fixture,
    "How many negative reviews are there?",
  );
  assert.equal(answer.metric.value, 2);
  assert.match(answer.notes.join(" "), /one or two stars/);
});
test("legitimate execution wording is not mistaken for prompt injection", () => {
  const fixture = [
    {
      ...rows[0],
      id: "export-fail",
      text: "Scheduled exports fail to execute.",
      aspects: classifyAspects("Scheduled exports fail to execute."),
    },
  ];
  const a = answerQuestion(
    fixture,
    "Do customers say scheduled exports fail to execute?",
  );
  assert.notEqual(a.status, "unsupported");
  assert.equal(a.citations[0]?.id, "export-fail");
});
test("quoted multiline commas and escaped quotes parse correctly", () => {
  const p = parseFile(
    'review_text,rating\r\n"A line, with comma\nand a ""quote""",4\r\nGood,5',
    "reviews.csv",
  );
  assert.equal(p.rows.length, 2);
  assert.equal(p.rows[0].review_text, 'A line, with comma\nand a "quote"');
});
test("CSV validation preserves physical row numbers after blank and malformed rows", () => {
  const p = parseFile(
    "review_text,rating\nGood,5\n\nmalformed,row,extra\nBad,NaN",
    "reviews.csv",
  );
  const r = normalizeImport(p, guessMapping(p.headers));
  assert.deepEqual(
    r.issues.map((x) => x.row),
    [4, 5],
  );
});
test("JSON rows, common headers, inch marks, dates and numeric syntax import safely", () => {
  const json = parseFile(
    JSON.stringify([
      { Review_Text: "ok", rating: "5" },
      { Review_Text: "", rating: "4" },
    ]),
    "reviews.json",
  );
  const jr = normalizeImport(json, {
    ...guessMapping(json.headers),
    text: "Review_Text",
  });
  assert.equal(jr.issues[0].row, 2);
  const mapped = guessMapping(["Review Text", "Star Rating"]);
  assert.equal(mapped.text, "Review Text");
  assert.equal(mapped.rating, "Star Rating");
  const csv = parseFile(
    'Review Text,Star Rating,Date\nGreat 10" tablet,5,8/1/2026\nOkay,0x5,2026-8-1\nFine,5e0,2026-8-1',
    "reviews.csv",
  );
  const normalized = normalizeImport(csv, guessMapping(csv.headers));
  assert.equal(normalized.reviews.length, 1);
  assert.equal(normalized.reviews[0].date, "2026-08-01");
  assert.equal(normalized.issues.length, 2);
  assert.throws(
    () =>
      normalizeImport(csv, {
        ...guessMapping(csv.headers),
        rating: "__proto__",
      }),
    /valid header/,
  );
});
test("metadata, invalid dates, non-finite ratings, and duplicates are validated", () => {
  const p = parseFile(
    "review_id,review_text,rating,review_date\na,Works,5,2026-08-01\na,Works,5,2026-08-01\nb,Oops,NaN,2026-08-01\nc,Oops,2,2026-02-30",
    "r.csv",
  );
  const r = normalizeImport(p, guessMapping(p.headers));
  assert.equal(r.reviews.length, 2);
  assert.equal(r.duplicates, 1);
  assert.equal(r.issues.length, 2);
  assert.equal(r.issues.find((x) => x.row === 5)?.level, "warning");
  assert.equal(r.reviews.find((x) => x.rating === 2)?.date, "");
});
test("invalid CSV headers and oversized row counts are rejected", () => {
  assert.throws(() => parseFile("x,x\na,b", "r.csv"));
  assert.throws(() =>
    parseFile("review_text\n" + Array(2001).fill("hello").join("\n"), "r.csv"),
  );
});
