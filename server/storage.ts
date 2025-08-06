import { type ScrapeJob, type InsertScrapeJob } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getScrapeJob(id: string): Promise<ScrapeJob | undefined>;
  createScrapeJob(job: InsertScrapeJob): Promise<ScrapeJob>;
  updateScrapeJob(id: string, updates: Partial<ScrapeJob>): Promise<ScrapeJob | undefined>;
  getRecentScrapeJobs(limit: number): Promise<ScrapeJob[]>;
}

export class MemStorage implements IStorage {
  private scrapeJobs: Map<string, ScrapeJob>;

  constructor() {
    this.scrapeJobs = new Map();
  }

  async getScrapeJob(id: string): Promise<ScrapeJob | undefined> {
    return this.scrapeJobs.get(id);
  }

  async createScrapeJob(insertJob: InsertScrapeJob): Promise<ScrapeJob> {
    const id = randomUUID();
    const job: ScrapeJob = {
      ...insertJob,
      id,
      status: "pending",
      originalContent: null,
      structuredContent: null,
      metadata: null,
      wordCount: null,
      processingTime: null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.scrapeJobs.set(id, job);
    return job;
  }

  async updateScrapeJob(id: string, updates: Partial<ScrapeJob>): Promise<ScrapeJob | undefined> {
    const existingJob = this.scrapeJobs.get(id);
    if (!existingJob) return undefined;

    const updatedJob = { ...existingJob, ...updates };
    this.scrapeJobs.set(id, updatedJob);
    return updatedJob;
  }

  async getRecentScrapeJobs(limit: number): Promise<ScrapeJob[]> {
    const jobs = Array.from(this.scrapeJobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    return jobs;
  }
}

export const storage = new MemStorage();
