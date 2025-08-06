import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapeWebsite, validateUrl } from "./services/scraper";
import { organizeContent, generateMarkdown, generatePlainText } from "./services/gemini";
import { 
  insertScrapeJobSchema, 
  processingOptionsSchema,
  type ProcessingOptions 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Scrape and process website content
  app.post("/api/scrape", async (req, res) => {
    try {
      const { url, processingOptions, outputFormat } = insertScrapeJobSchema.parse(req.body);
      
      // Validate URL
      if (!validateUrl(url)) {
        return res.status(400).json({ 
          message: "Invalid URL. Please provide a valid HTTP or HTTPS URL." 
        });
      }

      // Parse processing options
      const options: ProcessingOptions = processingOptionsSchema.parse(
        processingOptions || {}
      );

      // Create scrape job
      const job = await storage.createScrapeJob({
        url,
        processingOptions: options,
        outputFormat: outputFormat || "markdown",
      });

      // Start processing in background
      processWebsite(job.id, url, options, outputFormat || "markdown");

      res.json({ 
        jobId: job.id,
        status: "processing",
        message: "Website scraping started. Content will be processed shortly."
      });

    } catch (error) {
      console.error("Scrape request error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Failed to start scraping: " + (error as Error).message 
      });
    }
  });

  // Get job status and results
  app.get("/api/scrape/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getScrapeJob(jobId);

      if (!job) {
        return res.status(404).json({ message: "Scrape job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error("Get job error:", error);
      res.status(500).json({ 
        message: "Failed to fetch job: " + (error as Error).message 
      });
    }
  });

  // Download processed content
  app.get("/api/scrape/:jobId/download", async (req, res) => {
    try {
      const { jobId } = req.params;
      const { format, type } = req.query; // format: 'structured' | 'raw', type: 'md' | 'txt' | 'json'
      const job = await storage.getScrapeJob(jobId);

      if (!job) {
        return res.status(404).json({ message: "Scrape job not found" });
      }

      if (job.status !== "completed") {
        return res.status(400).json({ message: "Content not ready for download" });
      }

      const structuredContent = job.structuredContent as any;
      const metadata = job.metadata as any;
      const urlSlug = job.url.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const timestamp = Date.now();
      
      // Handle raw formatted content download
      if (format === 'raw' && metadata?.rawFormatted) {
        if (type === 'md') {
          res.setHeader('Content-Type', 'text/markdown');
          res.setHeader('Content-Disposition', `attachment; filename="raw-formatted-${urlSlug}-${timestamp}.md"`);
          res.send(metadata.rawFormatted);
        } else {
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Content-Disposition', `attachment; filename="raw-formatted-${urlSlug}-${timestamp}.txt"`);
          res.send(metadata.rawFormatted);
        }
        return;
      }

      // Handle structured content download (original behavior)
      if (!structuredContent) {
        return res.status(400).json({ message: "Structured content not available" });
      }
      
      if (job.outputFormat === "markdown" || type === 'md') {
        const markdown = await generateMarkdown(structuredContent);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="chatbot-knowledge-${urlSlug}-${timestamp}.md"`);
        res.send(markdown);
      } else if (job.outputFormat === "json" || type === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="chatbot-knowledge-${urlSlug}-${timestamp}.json"`);
        res.json(structuredContent);
      } else {
        // Clean plain text format
        const textContent = await generatePlainText(structuredContent);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="chatbot-knowledge-${urlSlug}-${timestamp}.txt"`);
        res.send(textContent);
      }

    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ 
        message: "Failed to download content: " + (error as Error).message 
      });
    }
  });

  // Get recent scrape jobs
  app.get("/api/scrape", async (req, res) => {
    try {
      const jobs = await storage.getRecentScrapeJobs(10);
      res.json(jobs);
    } catch (error) {
      console.error("Get recent jobs error:", error);
      res.status(500).json({ 
        message: "Failed to fetch recent jobs: " + (error as Error).message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Background processing function
async function processWebsite(
  jobId: string, 
  url: string, 
  options: ProcessingOptions,
  outputFormat: string
) {
  try {
    // Update job status to processing
    await storage.updateScrapeJob(jobId, { status: "processing" });

    const startTime = Date.now();

    // Step 1: Scrape website content
    const scrapedContent = await scrapeWebsite(url, {
      extractMainContent: options.extractMainContent,
      includeMetadata: options.includeMetadata,
      processImages: options.processImages,
      rawFormatted: options.rawFormatted,
      maxContentLength: options.maxContentLength,
      timeout: options.timeout,
    });

    // Step 2: Organize content with AI if enabled
    let structuredContent;
    if (options.aiOrganization) {
      structuredContent = await organizeContent(scrapedContent.content, url);
    } else {
      // Basic structure without AI
      structuredContent = {
        title: scrapedContent.title,
        summary: scrapedContent.description || "No summary available",
        sections: [{
          title: "Main Content",
          content: scrapedContent.content,
          priority: "primary" as const,
          topics: [],
        }],
        metadata: {
          wordCount: scrapedContent.metadata.wordCount,
          sectionCount: 1,
          topicCount: 0,
          confidence: 1.0,
          extractedAt: new Date().toISOString(),
        },
      };
    }

    const processingTime = Date.now() - startTime;

    // Step 3: Update job with results
    await storage.updateScrapeJob(jobId, {
      status: "completed",
      originalContent: scrapedContent.content,
      structuredContent,
      metadata: {
        ...scrapedContent.metadata,
        processingOptions: options,
        rawFormatted: scrapedContent.rawFormatted,
      },
      wordCount: structuredContent.metadata.wordCount,
      processingTime,
      completedAt: new Date(),
    });

  } catch (error) {
    console.error("Processing error:", error);
    await storage.updateScrapeJob(jobId, { 
      status: "failed",
      metadata: {
        error: (error as Error).message,
        failedAt: new Date().toISOString(),
      }
    });
  }
}
