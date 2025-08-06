import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLink, Play, History, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { ProcessingOptions, RecentJob } from "@/types";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  processingOptions: z.object({
    extractMainContent: z.boolean(),
    includeMetadata: z.boolean(), 
    processImages: z.boolean(),
    aiOrganization: z.boolean(),
    rawFormatted: z.boolean(),
    maxContentLength: z.number().min(1000).max(50000),
    timeout: z.number().min(30000).max(300000),
  }),
  outputFormat: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface UrlInputPanelProps {
  onSubmit: (data: FormData) => void;
  isProcessing: boolean;
  recentJobs: RecentJob[];
  onSelectRecentJob: (job: RecentJob) => void;
}

export function UrlInputPanel({ onSubmit, isProcessing, recentJobs, onSelectRecentJob }: UrlInputPanelProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [contentLength, setContentLength] = useState([10000]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      processingOptions: {
        extractMainContent: true,
        includeMetadata: true,
        processImages: false,
        aiOrganization: true,
        rawFormatted: false,
        maxContentLength: 10000,
        timeout: 60000,
      },
      outputFormat: "markdown",
    },
  });

  const handleSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      processingOptions: {
        ...data.processingOptions,
        maxContentLength: contentLength[0],
      },
    });
  };

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Card className="h-full flex flex-col" data-testid="url-input-panel">
      <CardHeader className="pb-6 border-b border-border-light">
        <CardTitle className="text-lg font-semibold text-text-primary mb-2">
          Smart Content Extractor
        </CardTitle>
        <p className="text-text-secondary text-sm">
          Extract only useful support content from websites and organize it into clean, structured formats perfect for chatbot knowledge bases. Automatically filters out navigation, sidebars, and irrelevant elements.
        </p>
      </CardHeader>

      <CardContent className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* URL Input Section */}
          <div className="space-y-3">
            <Label htmlFor="url" className="text-sm font-medium text-text-primary">
              Website URL
            </Label>
            <div className="relative">
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                {...form.register("url")}
                className="pr-10"
                data-testid="input-url"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-text-secondary hover:text-primary"
                onClick={() => {
                  const url = form.getValues("url");
                  if (validateUrl(url)) {
                    window.open(url, "_blank");
                  }
                }}
                data-testid="button-external-link"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            {form.formState.errors.url && (
              <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
            )}
            <p className="text-xs text-text-secondary">
              Content will be extracted cleanly - navigation, sidebars, and ads automatically removed
            </p>
          </div>

          {/* Processing Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-primary">Processing Options</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="extractMainContent"
                  {...form.register("processingOptions.extractMainContent")}
                  defaultChecked={true}
                  data-testid="checkbox-extract-main"
                />
                <Label htmlFor="extractMainContent" className="text-sm text-text-primary">
                  Smart content extraction (removes menus, footers, ads)
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="includeMetadata"
                  {...form.register("processingOptions.includeMetadata")}
                  defaultChecked={true}
                  data-testid="checkbox-include-metadata"
                />
                <Label htmlFor="includeMetadata" className="text-sm text-text-primary">
                  Include metadata (title, description)
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="processImages"
                  {...form.register("processingOptions.processImages")}
                  data-testid="checkbox-process-images"
                />
                <Label htmlFor="processImages" className="text-sm text-text-primary">
                  Process images and media
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="aiOrganization"
                  {...form.register("processingOptions.aiOrganization")}
                  defaultChecked={true}
                  data-testid="checkbox-ai-organization"
                />
                <Label htmlFor="aiOrganization" className="text-sm text-text-primary">
                  AI organization (creates clean Q&A format)
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="rawFormatted"
                  {...form.register("processingOptions.rawFormatted")}
                  data-testid="checkbox-raw-formatted"
                />
                <Label htmlFor="rawFormatted" className="text-sm text-text-primary">
                  Generate raw formatted version (simple Q&A without AI)
                </Label>
              </div>
            </div>
          </div>

          {/* Output Format */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-text-primary">Output Format</Label>
            <Select
              value={form.watch("outputFormat")}
              onValueChange={(value) => form.setValue("outputFormat", value)}
            >
              <SelectTrigger data-testid="select-output-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown (.md)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
                <SelectItem value="txt">Plain Text (.txt)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Settings */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between text-sm font-medium text-text-primary hover:text-primary p-0"
                data-testid="button-advanced-settings"
              >
                <span>Advanced Settings</span>
                {isAdvancedOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4 pl-4 border-l-2 border-border-light">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-text-secondary">
                  Max Content Length
                </Label>
                <Slider
                  value={contentLength}
                  onValueChange={setContentLength}
                  min={1000}
                  max={50000}
                  step={1000}
                  className="w-full"
                  data-testid="slider-content-length"
                />
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>1K words</span>
                  <span data-testid="text-content-length">
                    {Math.round(contentLength[0] / 1000)}K words
                  </span>
                  <span>50K words</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-text-secondary">
                  Processing Timeout
                </Label>
                <Select
                  value={form.watch("processingOptions.timeout").toString()}
                  onValueChange={(value) => 
                    form.setValue("processingOptions.timeout", parseInt(value))
                  }
                >
                  <SelectTrigger className="text-sm" data-testid="select-timeout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30000">30 seconds</SelectItem>
                    <SelectItem value="60000">60 seconds</SelectItem>
                    <SelectItem value="120000">120 seconds</SelectItem>
                    <SelectItem value="300000">300 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <Button
              type="submit"
              className="w-full bg-primary text-white hover:bg-primary/90 font-medium"
              disabled={isProcessing}
              data-testid="button-start-processing"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Processing
                </>
              )}
            </Button>
          </div>

          {/* Recent URLs */}
          {recentJobs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-text-primary">Recent URLs</h3>
              <div className="space-y-2">
                {recentJobs.map((job) => (
                  <Button
                    key={job.id}
                    variant="ghost"
                    className="w-full justify-between text-left p-3 bg-muted/50 hover:bg-muted h-auto"
                    onClick={() => onSelectRecentJob(job)}
                    data-testid={`button-recent-job-${job.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {job.title || "Untitled"}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {job.url}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-secondary flex-shrink-0 ml-2" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
