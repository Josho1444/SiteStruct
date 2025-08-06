import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

export interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  content: string;
  rawFormatted?: string;
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
    rawFormatted?: boolean;
    maxContentLength?: number;
    timeout?: number;
  } = {}
): Promise<ScrapedContent> {
  const {
    extractMainContent = true,
    includeMetadata = true,
    processImages = false,
    rawFormatted = false,
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

    // Extract main content - focus on useful support content only
    let content = '';
    
    if (extractMainContent) {
      // Remove navigation, sidebar, footer, and other irrelevant elements first
      $('nav, .nav, .navbar, .navigation').remove();
      $('aside, .sidebar, .aside, .side-nav').remove();
      $('footer, .footer, .site-footer').remove();
      $('header, .header, .site-header').remove();
      $('.advertisement, .ads, .ad-banner, .social-share').remove();
      $('.breadcrumb, .breadcrumbs, .pagination').remove();
      $('.menu, .dropdown-menu, .mobile-menu').remove();
      $('.cookie-notice, .banner, .promo-banner').remove();
      $('script, style, noscript').remove();
      
      // Try to find main content areas with priority for support/FAQ content
      const mainSelectors = [
        // Support/FAQ specific selectors
        '.faq, .faqs, .frequently-asked-questions',
        '.support, .help, .help-center, .knowledge-base',
        '.documentation, .docs, .doc-content',
        '.article-content, .support-article',
        '.question, .answer, .qa-content',
        
        // General content selectors
        'main',
        'article', 
        '[role="main"]',
        '.content',
        '.main-content',
        '.post-content',
        '.entry-content',
        '#content',
        '#main',
        '.page-content'
      ];

      let mainContent = '';
      for (const selector of mainSelectors) {
        const element = $(selector).first();
        if (element.length) {
          // Remove any remaining unwanted elements within the main content
          element.find('nav, .nav, aside, .sidebar, footer, .footer').remove();
          element.find('.advertisement, .ads, .social-share, .related-links').remove();
          element.find('.author-bio, .author-info, .meta-info, .post-meta').remove();
          
          const textContent = element.text().trim();
          if (textContent.length > 100) {
            mainContent = textContent;
            break;
          }
        }
      }

      // Enhanced fallback - look for specific content patterns if no main content found
      if (!mainContent) {
        // Look for question/answer patterns
        const qaElements = $('h1, h2, h3, h4, h5, h6').filter(function() {
          const text = $(this).text().toLowerCase();
          return text.includes('?') || 
                 text.includes('how to') || 
                 text.includes('what is') || 
                 text.includes('why') ||
                 text.includes('when') ||
                 text.includes('where');
        });
        
        if (qaElements.length > 0) {
          let qaContent = '';
          qaElements.each(function() {
            const heading = $(this);
            const headingText = heading.text().trim();
            let nextContent = '';
            
            // Get content after the heading
            let next = heading.next();
            while (next.length && !next.is('h1, h2, h3, h4, h5, h6')) {
              if (next.is('p, div, span, li')) {
                nextContent += next.text().trim() + ' ';
              }
              next = next.next();
            }
            
            if (nextContent.trim().length > 20) {
              qaContent += `${headingText}\n${nextContent.trim()}\n\n`;
            }
          });
          
          if (qaContent.trim().length > 200) {
            mainContent = qaContent;
          }
        }
      }

      // Final fallback to body with aggressive filtering
      if (!mainContent) {
        $('nav, aside, footer, header, .nav, .sidebar, .footer, .header').remove();
        $('script, style, noscript, iframe, video, audio').remove();
        mainContent = $('body').text();
      }
      
      content = mainContent;
    } else {
      content = $('body').text();
    }

    // Enhanced content cleanup for better readability
    content = content
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/\n\s*\n/g, '\n')      // Remove excessive line breaks
      .replace(/^\s+|\s+$/gm, '')     // Trim lines
      .replace(/(.)\1{3,}/g, '$1$1')  // Remove repetitive characters
      .trim();

    // Limit content length
    if (content.length > maxContentLength) {
      content = content.substring(0, maxContentLength) + '...';
    }

    // Create raw formatted content if requested
    let rawFormattedContent = '';
    if (rawFormatted) {
      rawFormattedContent = createRawFormattedContent($, content);
    }

    // Extract metadata
    const metadata = {
      scrapedAt: new Date().toISOString(),
      wordCount: content.split(/\s+/).length,
      hasImages: $('img').length > 0,
      links: $('a[href]').length,
    };

    const result: ScrapedContent = {
      url,
      title,
      description,
      content,
      metadata,
    };

    if (rawFormatted) {
      result.rawFormatted = rawFormattedContent;
    }

    return result;

  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape website: ${(error as Error).message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function createRawFormattedContent($: cheerio.CheerioAPI, content: string): string {
  let formatted = '';
  
  // Look for heading-content pairs that look like Q&A
  const headings = $('h1, h2, h3, h4, h5, h6').filter(function() {
    const text = $(this).text().trim();
    return text.length > 5 && text.length < 200; // Reasonable heading length
  });

  headings.each(function() {
    const heading = $(this);
    const headingText = heading.text().trim();
    
    // Get content after this heading until the next heading
    let nextContent = '';
    let next = heading.next();
    let contentLength = 0;
    
    while (next.length && !next.is('h1, h2, h3, h4, h5, h6') && contentLength < 1000) {
      if (next.is('p, div, span, li, ul, ol')) {
        const text = next.text().trim();
        if (text.length > 10) {
          nextContent += text + ' ';
          contentLength += text.length;
        }
      }
      next = next.next();
    }
    
    // Clean up the content
    nextContent = nextContent.trim()
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{3,}/g, '$1$1');
    
    // Only add if we have substantial content
    if (nextContent.length > 20) {
      // Format as clean Q&A
      if (headingText.includes('?') || headingText.toLowerCase().includes('how') || 
          headingText.toLowerCase().includes('what') || headingText.toLowerCase().includes('why') ||
          headingText.toLowerCase().includes('when') || headingText.toLowerCase().includes('where')) {
        formatted += `## ${headingText}\n${nextContent}\n\n`;
      } else {
        // Topic-style heading
        formatted += `## ${headingText}\n${nextContent}\n\n`;
      }
    }
  });
  
  // If no good headings found, try to create sections from content
  if (formatted.length < 100) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    let currentSection = '';
    
    for (let i = 0; i < sentences.length && formatted.length < 2000; i++) {
      const sentence = sentences[i].trim();
      
      // Look for question-like sentences or topic starters
      if (sentence.includes('?') || sentence.toLowerCase().startsWith('how to') || 
          sentence.toLowerCase().startsWith('what is') || sentence.toLowerCase().startsWith('you can')) {
        
        // If we have accumulated content, add it as a section
        if (currentSection.length > 50) {
          formatted += `## Topic\n${currentSection.trim()}\n\n`;
        }
        
        currentSection = sentence + '. ';
      } else if (currentSection.length > 0 && currentSection.length < 500) {
        currentSection += sentence + '. ';
      }
    }
    
    // Add final section if exists
    if (currentSection.length > 50) {
      formatted += `## Additional Information\n${currentSection.trim()}\n\n`;
    }
  }
  
  return formatted || content; // Fallback to original content if formatting fails
}

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}
