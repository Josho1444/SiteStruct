import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Copy,
} from "lucide-react";
import { ScrapeJob, StructuredContent } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ContentPreviewPanelProps {
  job: ScrapeJob | null;
  isProcessing: boolean;
  onDownload: (jobId: string, format: string, type?: string, rawFormat?: string) => void;
}

export function ContentPreviewPanel({ job, isProcessing, onDownload }: ContentPreviewPanelProps) {
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getStatusDisplay = () => {
    if (!job) {
      return {
        icon: <Clock className="w-6 h-6 text-muted-foreground" />,
        title: "Ready",
        description: "Enter a URL to start extracting content",
        bgColor: "bg-muted/30",
      };
    }

    switch (job.status) {
      case "completed":
        return {
          icon: <CheckCircle className="w-6 h-6 text-success" />,
          title: "Extraction Complete",
          description: "Content successfully organized and ready for download",
          bgColor: "bg-success/10",
          time: job.processingTime ? `${(job.processingTime / 1000).toFixed(1)}s` : null,
        };
      case "failed":
        return {
          icon: <XCircle className="w-6 h-6 text-destructive" />,
          title: "Extraction Failed",
          description: job.metadata?.error || "Processing failed. Please try again.",
          bgColor: "bg-destructive/10",
        };
      case "processing":
        return {
          icon: <AlertCircle className="w-6 h-6 text-warning animate-pulse" />,
          title: "Processing Content",
          description: "Extracting and organizing website content...",
          bgColor: "bg-warning/10",
        };
      default:
        return {
          icon: <Clock className="w-6 h-6 text-muted-foreground" />,
          title: "Pending",
          description: "Waiting to start processing",
          bgColor: "bg-muted",
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const structuredContent = job?.structuredContent as StructuredContent | null;

  return (
    <Card className="h-full flex flex-col" data-testid="content-preview-panel">
      <CardHeader className="pb-6 border-b border-border-light">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-text-primary mb-2">
              Content Preview
            </CardTitle>
            <p className="text-text-secondary text-sm">
              Structured Q&A content ready for download
            </p>
          </div>
          {job?.status === "completed" && (
            <Button
              onClick={() => job && onDownload(job.id, job.outputFormat)}
              className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90"
              data-testid="button-download"
            >
              <Download className="h-4 w-4" />
              Download {job.outputFormat === "markdown" ? ".MD" : ".TXT"}
            </Button>
          )}
        </div>
      </CardHeader>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Processing Status */}
        <div className={`px-6 py-4 ${statusDisplay.bgColor} border-b border-border-light`} data-testid="processing-status">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {statusDisplay.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary" data-testid="status-title">
                {statusDisplay.title}
              </p>
              <p className="text-xs text-text-secondary truncate" data-testid="status-description">
                {statusDisplay.description}
              </p>
            </div>
            {statusDisplay.time && (
              <span className="text-xs text-success font-medium flex-shrink-0" data-testid="processing-time">
                {statusDisplay.time}
              </span>
            )}
          </div>
        </div>

        {/* Content Display */}
        {job?.status === "completed" && structuredContent ? (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            {/* Content Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-4 rounded-lg border border-blue-100 dark:border-blue-900 mb-6">
              <h3 className="text-sm font-semibold text-text-primary mb-2">{structuredContent.title}</h3>
              <p className="text-text-secondary text-sm" data-testid="content-summary">
                {structuredContent.summary}
              </p>
              <div className="mt-3 text-xs text-text-tertiary">
                {structuredContent.sections.length} sections • {structuredContent.metadata?.wordCount || 0} words
              </div>
            </div>

            {/* Structured Content */}
            <div className="space-y-6">
              {structuredContent.sections.map((section, index) => (
                <div
                  key={index}
                  className="bg-card border border-border-light rounded-lg p-6"
                  data-testid={`content-section-${index}`}
                >
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    {section.title}
                  </h3>
                  <div className="prose prose-sm max-w-none text-text-primary leading-relaxed" data-testid={`section-content-${index}`}>
                    {section.content.split('\n').map((paragraph, pIndex) => (
                      paragraph.trim() && (
                        <p key={pIndex} className="mb-3 last:mb-0">
                          {paragraph.trim()}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Copy Button */}
            <div className="pt-6 border-t border-border-light mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  if (structuredContent) {
                    const content = structuredContent.sections
                      .map(section => `# ${section.title}\n\n${section.content}`)
                      .join('\n\n---\n\n');
                    copyToClipboard(content);
                  }
                }}
                className="flex items-center gap-2"
                data-testid="button-copy"
              >
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 text-muted-foreground">
                {statusDisplay.icon}
              </div>
              <p className="text-text-secondary text-sm" data-testid="empty-state-message">
                {isProcessing 
                  ? "Processing content..." 
                  : "Enter a URL and start processing to see results"
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}