import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const datasets = sqliteTable(
  "datasets",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    filename: text("filename").notNull(),
    createdAt: text("created_at").notNull(),
    count: integer("count").notNull(),
    rejected: integer("rejected").notNull(),
    duplicates: integer("duplicates").notNull(),
    method: text("method").notNull(),
    status: text("status").notNull().default("ready"),
  },
  (t) => [index("datasets_owner").on(t.owner)],
);
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    datasetId: text("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    payload: text("payload").notNull(),
    embedding: text("embedding"),
    embeddingModel: text("embedding_model"),
  },
  (t) => [index("reviews_dataset").on(t.datasetId)],
);
export const answers = sqliteTable(
  "answers",
  {
    id: text("id").primaryKey(),
    datasetId: text("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    owner: text("owner").notNull(),
    createdAt: text("created_at").notNull(),
    payload: text("payload").notNull(),
    feedback: text("feedback"),
  },
  (t) => [index("answers_dataset").on(t.datasetId)],
);
export const evaluations = sqliteTable(
  "evaluations",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    createdAt: text("created_at").notNull(),
    payload: text("payload").notNull(),
  },
  (t) => [index("evaluations_owner").on(t.owner)],
);
export const usage = sqliteTable("usage", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  day: text("day").notNull(),
  requests: integer("requests").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
});
export const settings = sqliteTable("settings", {
  owner: text("owner").primaryKey(),
  encryptedKey: text("encrypted_key"),
  model: text("model").notNull().default("gpt-4.1-mini"),
  embeddingModel: text("embedding_model")
    .notNull()
    .default("text-embedding-3-small"),
});
