import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scrapeJobs = pgTable("scrape_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  originalContent: text("original_content"),
  structuredContent: jsonb("structured_content"),
  metadata: jsonb("metadata"),
  processingOptions: jsonb("processing_options"),
  outputFormat: text("output_format").notNull().default("markdown"),
  wordCount: integer("word_count"),
  processingTime: integer("processing_time"), // in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertScrapeJobSchema = createInsertSchema(scrapeJobs).pick({
  url: true,
  processingOptions: true,
  outputFormat: true,
});

export const processingOptionsSchema = z.object({
  extractMainContent: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
  processImages: z.boolean().default(false),
  aiOrganization: z.boolean().default(true),
  maxContentLength: z.number().default(10000),
  timeout: z.number().default(60000),
});

export const structuredContentSchema = z.object({
  title: z.string(),
  summary: z.string(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    priority: z.enum(["primary", "secondary", "supporting"]),
    topics: z.array(z.string()),
  })),
  metadata: z.object({
    wordCount: z.number(),
    sectionCount: z.number(),
    topicCount: z.number(),
    confidence: z.number(),
    extractedAt: z.string(),
  }),
});

export type InsertScrapeJob = z.infer<typeof insertScrapeJobSchema>;
export type ScrapeJob = typeof scrapeJobs.$inferSelect;
export type ProcessingOptions = z.infer<typeof processingOptionsSchema>;
export type StructuredContent = z.infer<typeof structuredContentSchema>;
