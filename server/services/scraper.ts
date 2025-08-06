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
