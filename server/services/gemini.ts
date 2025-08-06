import { GoogleGenAI } from "@google/genai";

// Note that the newest Gemini model series is "gemini-2.5-flash" or "gemini-2.5-pro"
// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ContentStructure {
  title: string;
  summary: string;
  sections: {
    title: string;
    content: string;
    priority: "primary" | "secondary" | "supporting";
    topics: string[];
  }[];
  metadata: {
    wordCount: number;
    sectionCount: number;
    topicCount: number;
    confidence: number;
    extractedAt: string;
  };
}

export async function organizeContent(rawContent: string, url: string): Promise<ContentStructure> {
  try {
    const prompt = `You are an AI content organizer specializing in preparing web content for chatbot knowledge bases. 

Analyze and organize the following web content from ${url}:

${rawContent}

Please organize this content into a structured format optimized for AI chatbot knowledge bases. Follow these guidelines:

1. Create a clear title and comprehensive summary
2. Break content into logical sections with descriptive titles
3. Categorize each section by priority: "primary" (core concepts), "secondary" (detailed explanations), or "supporting" (examples/references)
4. Extract key topics for each section
5. Ensure content is well-structured and easy for AI systems to understand

Respond with JSON in this exact format:
{
  "title": "string",
  "summary": "string", 
  "sections": [
    {
      "title": "string",
      "content": "string",
      "priority": "primary|secondary|supporting",
      "topics": ["string"]
    }
  ],
  "metadata": {
    "wordCount": number,
    "sectionCount": number,
    "topicCount": number,
    "confidence": number (0-1),
    "extractedAt": "ISO string"
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  priority: { type: "string" },
                  topics: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["title", "content", "priority", "topics"]
              }
            },
            metadata: {
              type: "object",
              properties: {
                wordCount: { type: "number" },
                sectionCount: { type: "number" },
                topicCount: { type: "number" },
                confidence: { type: "number" },
                extractedAt: { type: "string" }
              },
              required: ["wordCount", "sectionCount", "topicCount", "confidence", "extractedAt"]
            }
          },
          required: ["title", "summary", "sections", "metadata"]
        },
        temperature: 0.3,
      },
      contents: prompt,
    });

    const result = JSON.parse(response.text || "{}");
    
    // Validate and ensure proper structure
    return {
      title: result.title || "Untitled Content",
      summary: result.summary || "No summary available",
      sections: Array.isArray(result.sections) ? result.sections : [],
      metadata: {
        wordCount: result.metadata?.wordCount || rawContent.split(/\s+/).length,
        sectionCount: result.sections?.length || 0,
        topicCount: result.sections?.reduce((acc: number, section: any) => acc + (section.topics?.length || 0), 0) || 0,
        confidence: result.metadata?.confidence || 0.8,
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Gemini content organization error:", error);
    throw new Error("Failed to organize content with AI: " + (error as Error).message);
  }
}

export async function generateMarkdown(structuredContent: ContentStructure): Promise<string> {
  const { title, summary, sections, metadata } = structuredContent;
  
  let markdown = `# ${title}\n\n`;
  markdown += `## Summary\n${summary}\n\n`;
  
  markdown += `## Content Statistics\n`;
  markdown += `- **Word Count:** ${metadata.wordCount}\n`;
  markdown += `- **Sections:** ${metadata.sectionCount}\n`;
  markdown += `- **Topics:** ${metadata.topicCount}\n`;
  markdown += `- **Confidence:** ${Math.round(metadata.confidence * 100)}%\n`;
  markdown += `- **Extracted:** ${new Date(metadata.extractedAt).toLocaleString()}\n\n`;

  sections.forEach((section, index) => {
    markdown += `## ${section.title}\n\n`;
    markdown += `${section.content}\n\n`;
    
    if (section.topics && section.topics.length > 0) {
      markdown += `**Key Topics:** ${section.topics.join(", ")}\n\n`;
    }
    
    markdown += `---\n\n`;
  });

  return markdown;
}