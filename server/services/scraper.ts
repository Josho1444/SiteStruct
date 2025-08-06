import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

export interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  content: string;
  metadata: {
    scrapedAt: string;
    wordCount: number;
    hasImages: boolean;
    links: number;
  };
}

export async function scrapeWebsite(
  url: string, 
  options: {
    extractMainContent?: boolean;
    includeMetadata?: boolean;
    processImages?: boolean;
    maxContentLength?: number;
    timeout?: number;
  } = {}
): Promise<ScrapedContent> {
  const {
    extractMainContent = true,
    includeMetadata = true,
    processImages = false,
    maxContentLength = 10000,
    timeout = 60000
  } = options;

  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set timeout
    await page.setDefaultTimeout(timeout);
    
    // Navigate to URL
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout 
    });

    // Get page content
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract title
    const title = $('title').first().text().trim() || 
                 $('h1').first().text().trim() || 
                 'Untitled Page';

    // Extract meta description
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       '';

    // Extract main content
    let content = '';
    
    if (extractMainContent) {
      // Try to find main content areas
      const mainSelectors = [
        'main',
        'article', 
        '[role="main"]',
        '.content',
        '.main-content',
        '.post-content',
        '.entry-content',
        '#content',
        '#main'
      ];

      let mainContent = '';
      for (const selector of mainSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim().length > 100) {
          mainContent = element.text();
          break;
        }
      }

      // Fallback to body if no main content found
      content = mainContent || $('body').text();
    } else {
      content = $('body').text();
    }

    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Limit content length
    if (content.length > maxContentLength) {
      content = content.substring(0, maxContentLength) + '...';
    }

    // Extract metadata
    const metadata = {
      scrapedAt: new Date().toISOString(),
      wordCount: content.split(/\s+/).length,
      hasImages: $('img').length > 0,
      links: $('a[href]').length,
    };

    return {
      url,
      title,
      description,
      content,
      metadata,
    };

  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape website: ${(error as Error).message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}
