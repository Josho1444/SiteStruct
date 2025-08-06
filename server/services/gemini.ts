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
    const prompt = `You are an expert content organizer specializing in creating clean, structured knowledge base content for chatbot systems.

CONTENT TO ORGANIZE:
${rawContent}

SOURCE: ${url}

REQUIREMENTS:
Transform this content into a clean, well-structured format following these strict guidelines:

FORMAT REQUIREMENTS:
- Create clear, descriptive headings for each section (questions/topics)
- Write concise, paragraph-style answers under each heading
- NO bullet points or lists unless the source content specifically requires them for clarity
- Each section should be focused and under 1000 tokens for optimal embedding retrieval
- Organize logically from most important to least important

CONTENT FILTERING:
- Extract ONLY useful support content
- Skip navigation, menu items, footers, advertisements
- Focus on actionable information, answers, and helpful content
- Remove redundant or promotional text

STRUCTURE:
- Use question-style headings when appropriate (e.g., "How do I reset my password?")
- Use topic-style headings for informational content (e.g., "Payment Methods")
- Ensure each section can stand alone as a complete answer
- Keep content clear and conversational for chatbot responses

OUTPUT FORMAT:
Each section should follow this pattern:
## [Clear Question or Topic Heading]
[Concise, well-formatted paragraph response that directly answers or explains the topic]

CHUNKING:
- Split long sections into smaller, focused chunks
- Each chunk should be complete and self-contained
- Maximum ~800 words per section for optimal embedding performance

Respond with JSON in this exact format:
{
  "title": "string",
  "summary": "string", 
  "sections": [
    {
      "title": "string (should be a clear question or topic)",
      "content": "string (paragraph format, no bullets unless necessary)",
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
  
  // Clean, minimal header optimized for chatbot knowledge bases
  let markdown = `# ${title}\n\n`;
  
  if (summary && summary !== "No summary available") {
    markdown += `${summary}\n\n`;
  }

  // Generate clean sections without extra formatting
  sections.forEach((section, index) => {
    // Use ## for main headings to create proper structure
    markdown += `## ${section.title}\n\n`;
    markdown += `${section.content}\n\n`;
    
    // Only add separator between sections, not after the last one
    if (index < sections.length - 1) {
      markdown += `---\n\n`;
    }
  });

  // Add metadata as a comment at the end for reference (hidden from main content)
  markdown += `\n\n<!-- Content Statistics: ${metadata.wordCount} words, ${metadata.sectionCount} sections, extracted ${new Date(metadata.extractedAt).toLocaleDateString()} -->`;

  return markdown;
}

export async function generatePlainText(structuredContent: ContentStructure): Promise<string> {
  const { title, summary, sections } = structuredContent;
  
  let text = `${title}\n\n`;
  
  if (summary && summary !== "No summary available") {
    text += `${summary}\n\n`;
  }

  sections.forEach((section, index) => {
    text += `${section.title}\n\n`;
    text += `${section.content}\n\n`;
    
    if (index < sections.length - 1) {
      text += `---\n\n`;
    }
  });

  return text;
}