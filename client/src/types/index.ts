export interface ProcessingOptions {
  extractMainContent: boolean;
  includeMetadata: boolean;
  processImages: boolean;
  aiOrganization: boolean;
  rawFormatted: boolean;
  maxContentLength: number;
  timeout: number;
}

export interface StructuredContent {
  title: string;
  summary: string;
  sections: ContentSection[];
  metadata: {
    wordCount: number;
    sectionCount: number;
    topicCount: number;
    confidence: number;
    extractedAt: string;
  };
}

export interface ContentSection {
  title: string;
  content: string;
  priority: "primary" | "secondary" | "supporting";
  topics: string[];
}

export interface ScrapeJob {
  id: string;
  url: string;
  status: "pending" | "processing" | "completed" | "failed";
  originalContent: string | null;
  structuredContent: StructuredContent | null;
  metadata: any;
  processingOptions: ProcessingOptions;
  outputFormat: string;
  wordCount: number | null;
  processingTime: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RecentJob {
  id: string;
  url: string;
  title: string;
  status: string;
  createdAt: string;
}
