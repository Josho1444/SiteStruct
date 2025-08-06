import { GoogleGenAI } from "@google/genai";

// Note that the newest Gemini model series is "gemini-2.5-flash" or "gemini-2.5-pro"
// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

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
    // First detect if this is FAQ/Q&A content or general informational content
    const detectionPrompt = `Analyze this content and determine its primary type:

${rawContent.substring(0, 2000)}...

Respond with only "FAQ" if this content is primarily FAQ/Q&A format with questions and answers, or "GENERAL" if it's general informational content like articles, about pages, or documentation.`;

    let isQandA = false;
    try {
      const detectionResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: detectionPrompt }] }]
      });
      const detectionText = detectionResponse.candidates[0].content.parts[0].text.trim();
      isQandA = detectionText.includes("FAQ");
    } catch (error) {
      console.log('Content type detection failed, defaulting to general format');
    }

    // Create appropriate prompt based on content type
    const prompt = isQandA ? `You are organizing FAQ/Q&A content for a chatbot knowledge base.

CONTENT TO ORGANIZE:
${rawContent}

SOURCE: ${url}

INSTRUCTIONS FOR FAQ CONTENT:
- Extract ALL questions and their complete answers
- Use "Question: [exact question]" format for section titles
- Preserve all important details from answers
- Group related Q&A pairs logically
- Ensure comprehensive coverage - don't lose any information
- Maximum 30,000 words total content

FORMATTING:
- Each section should be a complete Q&A pair
- Keep answers detailed and informative
- Use paragraph format for answers
- Maintain all factual information from source

Respond with JSON in this exact format:
{
  "title": "string",
  "summary": "string", 
  "sections": [
    {
      "title": "Question: [clear question text]",
      "content": "Complete detailed answer with all important information",
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
}` : `You are organizing general informational content for a chatbot knowledge base.

CONTENT TO ORGANIZE:
${rawContent}

SOURCE: ${url}

INSTRUCTIONS FOR GENERAL CONTENT:
- Break into logical, comprehensive sections with clear topic headings
- Use descriptive section titles (NOT questions) like "Company History", "Services Offered", etc.
- Preserve ALL important information - comprehensive coverage is critical
- Create detailed sections that maintain full context
- Extract maximum information up to 30,000 words
- Focus on informational value for knowledge base

FORMATTING:
- Each section should cover a complete topic thoroughly  
- Use natural paragraph format
- Maintain factual accuracy and completeness
- Organize from most to least important information

Respond with JSON in this exact format:
{
  "title": "string",
  "summary": "string", 
  "sections": [
    {
      "title": "Clear topic heading (not a question)",
      "content": "Comprehensive information covering this topic completely",
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
      contents: [{ parts: [{ text: prompt }] }],
    });

    const result = JSON.parse(response.candidates[0].content.parts[0].text || "{}");
    
    // Validate and ensure proper structure
    return {
      title: result.title || "Untitled Content",
      summary: result.summary || "Content summary not available",
      sections: result.sections || [],
      metadata: {
        wordCount: result.metadata?.wordCount || 0,
        sectionCount: result.metadata?.sectionCount || 0,
        topicCount: result.metadata?.topicCount || 0,
        confidence: result.metadata?.confidence || 0.5,
        extractedAt: new Date().toISOString(),
      }
    };

  } catch (error) {
    console.error('Gemini content organization error:', error);
    throw new Error(`Failed to organize content with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function generateMarkdown(structuredContent: ContentStructure): string {
  let content = `# ${structuredContent.title}\n\n`;
  content += `${structuredContent.summary}\n\n`;
  
  structuredContent.sections.forEach((section, index) => {
    content += `## ${section.title}\n\n`;
    content += `${section.content}\n\n`;
    if (index < structuredContent.sections.length - 1) {
      content += "---\n\n";
    }
  });
  
  return content;
}

export function generatePlainText(structuredContent: ContentStructure): string {
  let content = `${structuredContent.title}\n`;
  content += "=".repeat(structuredContent.title.length) + "\n\n";
  content += `${structuredContent.summary}\n\n`;
  
  structuredContent.sections.forEach((section, index) => {
    content += `${section.title}\n`;
    content += "-".repeat(section.title.length) + "\n\n";
    content += `${section.content}\n\n`;
    if (index < structuredContent.sections.length - 1) {
      content += "\n";
    }
  });
  
  return content;
}