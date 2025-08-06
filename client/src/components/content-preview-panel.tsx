import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Copy, 
  Download, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  FileText,
  FileCode,
  Share,
  Lightbulb,
  Clock,
  AlertCircle
} from "lucide-react";
import { ScrapeJob, StructuredContent, ContentSection } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ContentPreviewPanelProps {
  job: ScrapeJob | null;
  isProcessing: boolean;
  onDownload: (jobId: string, format: string, type?: string, rawFormat?: string) => void;
}

export function ContentPreviewPanel({ job, isProcessing, onDownload }: ContentPreviewPanelProps) {
  const [activeTab, setActiveTab] = useState("structured");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const { toast } = useToast();

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied successfully.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "primary":
        return "bg-primary text-primary-foreground";
      case "secondary":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-accent text-accent-foreground";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "primary":
        return "Primary";
      case "secondary":
        return "Secondary";
      default:
        return "Supporting";
    }
  };

  const getStatusDisplay = () => {
    if (!job) {
      return {
        icon: <AlertCircle className="w-6 h-6 text-muted-foreground" />,
        title: "No Content",
        description: "Enter a URL and start processing to see results",
        bgColor: "bg-muted",
      };
    }

    switch (job.status) {
      case "processing":
        return {
          icon: <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />,
          title: "Processing",
          description: `Extracting and organizing content from ${new URL(job.url).hostname}`,
          bgColor: "bg-blue-50 dark:bg-blue-950/50",
        };
      case "completed":
        return {
          icon: <Check className="w-6 h-6 text-success" />,
          title: "Processing Complete",
          description: `Extracted and organized ${job.wordCount || 0} words from ${new URL(job.url).hostname}`,
          bgColor: "bg-success/10",
          time: job.processingTime ? `${(job.processingTime / 1000).toFixed(1)}s` : undefined,
        };
      case "failed":
        return {
          icon: <AlertCircle className="w-6 h-6 text-destructive" />,
          title: "Processing Failed",
          description: "Unable to process the content. Please try again.",
          bgColor: "bg-destructive/10",
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
              AI-organized content ready for your knowledge base
            </p>
          </div>
          {job?.status === "completed" && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (structuredContent) {
                    const content = structuredContent.sections
                      .map(section => `# ${section.title}\n\n${section.content}`)
                      .join('\n\n---\n\n');
                    copyToClipboard(content);
                  }
                }}
                className="h-8 w-8 p-0"
                title="Copy to clipboard"
                data-testid="button-copy"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => job && onDownload(job.id, job.outputFormat)}
                className="h-8 w-8 p-0 text-success hover:text-success"
                title="Download"
                data-testid="button-download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
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

        {job?.status === "completed" && structuredContent ? (
          <>
            {/* Content Tabs */}
            <div className="px-6 pt-4 border-b border-border-light">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className={`grid ${job.metadata?.rawFormatted ? 'grid-cols-4' : 'grid-cols-3'} w-full`}>
                  <TabsTrigger value="structured" data-testid="tab-structured">
                    Structured Content
                  </TabsTrigger>
                  <TabsTrigger value="raw" data-testid="tab-raw">
                    Raw Content
                  </TabsTrigger>
                  {job.metadata?.rawFormatted && (
                    <TabsTrigger value="rawFormatted" data-testid="tab-raw-formatted">
                      Raw Formatted
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="metadata" data-testid="tab-metadata">
                    Metadata
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Content Display */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <Tabs value={activeTab} className="h-full">
                <TabsContent value="structured" className="p-6 space-y-6 h-full m-0">
                  {/* Content Summary Card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                    <h3 className="text-sm font-semibold text-text-primary mb-2">Content Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-text-secondary">Words:</span>
                        <span className="font-medium ml-2" data-testid="summary-word-count">
                          {structuredContent.metadata.wordCount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Sections:</span>
                        <span className="font-medium ml-2" data-testid="summary-section-count">
                          {structuredContent.metadata.sectionCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Topics:</span>
                        <span className="font-medium ml-2" data-testid="summary-topic-count">
                          {structuredContent.metadata.topicCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Confidence:</span>
                        <span className="font-medium ml-2 text-success" data-testid="summary-confidence">
                          {Math.round(structuredContent.metadata.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Structured Content Sections */}
                  <div className="space-y-4">
                    {structuredContent.sections.map((section, index) => (
                      <div key={index} className="border border-border-light rounded-lg overflow-hidden">
                        <Collapsible 
                          open={expandedSections.has(index)}
                          onOpenChange={() => toggleSection(index)}
                        >
                          <CollapsibleTrigger asChild>
                            <div className="bg-muted/50 px-4 py-3 border-b border-border-light cursor-pointer hover:bg-muted/70 transition-colors">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-text-primary" data-testid={`section-title-${index}`}>
                                  {section.title}
                                </h3>
                                <div className="flex items-center space-x-2">
                                  <Badge 
                                    className={`text-xs ${getPriorityColor(section.priority)}`}
                                    data-testid={`section-priority-${index}`}
                                  >
                                    {getPriorityLabel(section.priority)}
                                  </Badge>
                                  {expandedSections.has(index) ? (
                                    <ChevronDown className="w-4 h-4 text-text-secondary" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-text-secondary" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-4">
                              <div className="prose prose-sm max-w-none text-text-primary">
                                <p className="mb-3 whitespace-pre-wrap" data-testid={`section-content-${index}`}>
                                  {section.content}
                                </p>
                                {section.topics.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center">
                                      <Lightbulb className="w-4 h-4 mr-1 text-accent" />
                                      Key Topics:
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {section.topics.map((topic, topicIndex) => (
                                        <Badge 
                                          key={topicIndex} 
                                          variant="secondary" 
                                          className="text-xs"
                                          data-testid={`topic-${index}-${topicIndex}`}
                                        >
                                          {topic}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </div>

                  {/* Export Options */}
                  <div className="border-t border-border-light pt-6">
                    <h3 className="font-semibold text-text-primary mb-4">Export Options</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        onClick={() => onDownload(job.id, "markdown")}
                        className="bg-primary text-white hover:bg-primary/90"
                        data-testid="button-download-markdown"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Download Markdown
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onDownload(job.id, "json")}
                        data-testid="button-export-json"
                      >
                        <FileCode className="w-4 h-4 mr-2" />
                        Export JSON
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (structuredContent) {
                            const content = structuredContent.sections
                              .map(section => `${section.title}\n\n${section.content}`)
                              .join('\n\n---\n\n');
                            copyToClipboard(content);
                          }
                        }}
                        data-testid="button-copy-clipboard"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Clipboard
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (navigator.share && job) {
                            navigator.share({
                              title: structuredContent.title,
                              text: structuredContent.summary,
                              url: job.url,
                            });
                          }
                        }}
                        data-testid="button-share"
                      >
                        <Share className="w-4 h-4 mr-2" />
                        Share Link
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="p-6 m-0 h-full">
                  <div className="bg-muted/50 rounded-lg p-4 h-full overflow-y-auto scrollbar-thin">
                    <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono" data-testid="raw-content">
                      {job.originalContent || "No raw content available"}
                    </pre>
                  </div>
                </TabsContent>

                {job.metadata?.rawFormatted && (
                  <TabsContent value="rawFormatted" className="p-6 m-0 h-full">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-text-primary">Raw Formatted Q&A</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDownload(job.id, 'raw', 'md', 'raw')}
                            className="flex items-center gap-2 text-xs"
                            data-testid="button-download-raw-formatted-md"
                          >
                            <Download className="h-3 w-3" />
                            .MD
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDownload(job.id, 'raw', 'txt', 'raw')}
                            className="flex items-center gap-2 text-xs"
                            data-testid="button-download-raw-formatted-txt"
                          >
                            <Download className="h-3 w-3" />
                            .TXT
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(job.metadata?.rawFormatted || '')}
                            className="flex items-center gap-2 text-xs"
                            data-testid="button-copy-raw-formatted"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed overflow-auto max-h-96" data-testid="raw-formatted-content">
                        <div className="whitespace-pre-wrap font-mono">
                          {job.metadata.rawFormatted}
                        </div>
                      </div>
                      <div className="text-xs text-text-secondary bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                        <p><strong>Raw Formatted:</strong> Clean Q&A format extracted directly from webpage structure without AI processing. Perfect for simple knowledge bases.</p>
                      </div>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="metadata" className="p-6 m-0 h-full">
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium text-text-primary mb-3">Processing Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-text-secondary">URL:</span>
                          <p className="font-mono text-xs break-all mt-1" data-testid="metadata-url">
                            {job.url}
                          </p>
                        </div>
                        <div>
                          <span className="text-text-secondary">Processing Time:</span>
                          <p className="font-medium mt-1" data-testid="metadata-processing-time">
                            {job.processingTime ? `${(job.processingTime / 1000).toFixed(2)}s` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-text-secondary">Started:</span>
                          <p className="font-medium mt-1" data-testid="metadata-started">
                            {new Date(job.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-text-secondary">Completed:</span>
                          <p className="font-medium mt-1" data-testid="metadata-completed">
                            {job.completedAt ? new Date(job.completedAt).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium text-text-primary mb-3">Processing Options</h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(job.processingOptions).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-text-secondary capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="font-medium" data-testid={`metadata-option-${key}`}>
                              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
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
