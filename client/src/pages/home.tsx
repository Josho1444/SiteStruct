import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UrlInputPanel } from "@/components/url-input-panel";
import { ContentPreviewPanel } from "@/components/content-preview-panel";
import { Bot } from "lucide-react";
import { ScrapeJob, RecentJob, ProcessingOptions } from "@/types";

interface FormData {
  url: string;
  processingOptions: ProcessingOptions;
  outputFormat: string;
}

interface ScrapeResponse {
  jobId: string;
  status: string;
  message: string;
}

export default function Home() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState("");
  const { toast } = useToast();

  // Fetch recent jobs
  const { data: recentJobs = [] } = useQuery<ScrapeJob[]>({
    queryKey: ["/api/scrape"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch current job status
  const { data: currentJob, isLoading: isJobLoading } = useQuery<ScrapeJob>({
    queryKey: ["/api/scrape", currentJobId],
    enabled: !!currentJobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      return job?.status === "processing" || job?.status === "pending" ? 2000 : false;
    },
  });

  // Start scraping mutation
  const startScrapingMutation = useMutation({
    mutationFn: async (data: FormData): Promise<ScrapeResponse> => {
      const response = await apiRequest("POST", "/api/scrape", data);
      return response.json();
    },
    onSuccess: (result) => {
      setCurrentJobId(result.jobId);
      toast({
        title: "Processing started",
        description: "Website content is being extracted and organized.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scrape"] });
    },
    onError: (error) => {
      toast({
        title: "Processing failed",
        description: error.message || "Unable to start processing. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Download content
  const downloadContent = async (jobId: string, format: string, type?: string, rawFormat?: string) => {
    try {
      let url = `/api/scrape/${jobId}/download`;
      const params = new URLSearchParams();
      
      if (rawFormat === 'raw') {
        params.set('format', 'raw');
        params.set('type', type || 'md');
      } else if (type) {
        params.set('type', type);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Failed to download content");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      
      // Get filename from response headers or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `content-${jobId}.${format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt'}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      const downloadType = rawFormat === 'raw' ? `Raw ${type?.toUpperCase()}` : format.toUpperCase();
      toast({
        title: "Download complete",
        description: `Content downloaded as ${downloadType} file.`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Unable to download content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = (data: FormData) => {
    setSelectedUrl(data.url);
    startScrapingMutation.mutate(data);
  };

  const handleSelectRecentJob = (job: RecentJob) => {
    setCurrentJobId(job.id);
    setSelectedUrl(job.url);
  };

  // Convert recent jobs to the format expected by UrlInputPanel
  const formattedRecentJobs: RecentJob[] = recentJobs.slice(0, 5).map(job => ({
    id: job.id,
    url: job.url,
    title: job.structuredContent ? (job.structuredContent as any).title : "Untitled",
    status: job.status,
    createdAt: job.createdAt,
  }));

  const isProcessing = startScrapingMutation.isPending || 
    (currentJob?.status === "processing" || currentJob?.status === "pending");

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-border-light sticky top-0 z-50" data-testid="header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-text-primary" data-testid="app-title">
                AI Content Processor
              </h1>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a 
                href="#" 
                className="text-text-secondary hover:text-primary transition-colors"
                data-testid="nav-documentation"
              >
                Documentation
              </a>
              <a 
                href="#" 
                className="text-text-secondary hover:text-primary transition-colors"
                data-testid="nav-api"
              >
                API
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="main-content">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-120px)]">
          <UrlInputPanel
            onSubmit={handleFormSubmit}
            isProcessing={isProcessing}
            recentJobs={formattedRecentJobs}
            onSelectRecentJob={handleSelectRecentJob}
          />
          
          <ContentPreviewPanel
            job={currentJob || null}
            isProcessing={isProcessing}
            onDownload={downloadContent}
          />
        </div>
      </main>
    </div>
  );
}
