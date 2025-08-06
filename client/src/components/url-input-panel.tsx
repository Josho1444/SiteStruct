import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Play, History, Download } from "lucide-react";
import { RecentJob } from "@/types";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  outputFormat: z.enum(["markdown", "txt"]),
});

type FormData = z.infer<typeof formSchema>;

interface UrlInputPanelProps {
  onSubmit: (data: any) => void;
  isProcessing: boolean;
  recentJobs: RecentJob[];
  onSelectRecentJob: (job: RecentJob) => void;
}

export function UrlInputPanel({ onSubmit, isProcessing, recentJobs, onSelectRecentJob }: UrlInputPanelProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      outputFormat: "markdown" as const,
    },
  });

  const handleSubmit = (data: FormData) => {
    // Add default processing options for simplified interface
    const submissionData = {
      ...data,
      processingOptions: {
        extractMainContent: true,
        includeMetadata: false,
        processImages: false,
        aiOrganization: true,
        rawFormatted: false,
        maxContentLength: 30000,
        timeout: 300000,
      },
    };
    onSubmit(submissionData);
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
          Extract and organize website content into clean Q&A format perfect for knowledge bases.
        </p>
      </CardHeader>

      <CardContent className="flex-1 p-6 space-y-6">
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
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-text-primary">
              Download Format
            </Label>
            <Select
              value={form.watch("outputFormat")}
              onValueChange={(value: "markdown" | "txt") => form.setValue("outputFormat", value)}
            >
              <SelectTrigger data-testid="select-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown (.md)</SelectItem>
                <SelectItem value="txt">Text (.txt)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isProcessing || !form.watch("url")}
            className="w-full flex items-center gap-2 bg-primary text-white hover:bg-primary/90"
            data-testid="button-extract"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Extract & Download
              </>
            )}
          </Button>
        </form>

        {/* Recent Jobs */}
        {recentJobs.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-border-light">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-text-secondary" />
              <Label className="text-sm font-medium text-text-primary">Recent Extractions</Label>
            </div>
            <div className="space-y-2">
              {recentJobs.slice(0, 3).map((job) => (
                <Button
                  key={job.id}
                  variant="ghost"
                  onClick={() => onSelectRecentJob(job)}
                  className="w-full justify-start text-left h-auto p-3 hover:bg-muted/50"
                  data-testid={`recent-job-${job.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {job.title || "Untitled"}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {job.url}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`ml-2 w-2 h-2 rounded-full flex-shrink-0 ${
                    job.status === "completed" ? "bg-success" :
                    job.status === "failed" ? "bg-destructive" :
                    "bg-warning animate-pulse"
                  }`} />
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}