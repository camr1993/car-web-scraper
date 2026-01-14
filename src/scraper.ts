import { chromium, Browser, Page } from 'playwright';
import { BaTAuction, ScraperConfig, DEFAULT_CONFIG } from './types';
import { collectAuctionUrls } from './page-handlers/results-page';
import { extractAuctionData } from './page-handlers/auction-page';
import { transformAuctionData, isValidAuction } from './transformers';
import { exportToCsv } from './csv-exporter';

/**
 * Main scraper class for Bring a Trailer auctions
 */
export class BaTScraper {
  private config: ScraperConfig;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the browser
   */
  async init(): Promise<void> {
    console.log('🚀 Starting BaT Scraper...');
    console.log(`   Headless: ${this.config.headless}`);
    console.log(`   Target auctions: ${this.config.auctionCount}`);

    this.browser = await chromium.launch({
      headless: this.config.headless,
    });

    const context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    this.page = await context.newPage();
  }

  /**
   * Run the scraper
   */
  async run(): Promise<BaTAuction[]> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call init() first.');
    }

    const auctions: BaTAuction[] = [];

    try {
      // Step 1: Collect auction URLs from results page
      const urls = await collectAuctionUrls(this.page, this.config.auctionCount);

      // Step 2: Visit each auction page and extract data
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`\n📄 Processing auction ${i + 1}/${urls.length}`);

        try {
          // Extract raw data
          const rawData = await extractAuctionData(this.page, url);

          // Transform to clean data
          const auction = transformAuctionData(rawData);

          // Validate and add
          if (isValidAuction(auction)) {
            auctions.push(auction);
            console.log(`   ✅ ${auction.title}`);
          } else {
            console.log(`   ⚠️ Skipped (incomplete data): ${url}`);
          }

          // Rate limiting - be nice to the server
          if (i < urls.length - 1) {
            await this.delay(this.config.delayBetweenPages);
          }
        } catch (error) {
          console.error(`   ❌ Error processing ${url}:`, error);
        }
      }

      // Step 3: Export to CSV
      if (auctions.length > 0) {
        const csvPath = exportToCsv(auctions, this.config.outputDir);
        console.log(`\n🎉 Successfully scraped ${auctions.length} auctions!`);
        console.log(`   Output: ${csvPath}`);
      } else {
        console.log('\n⚠️ No auctions were scraped successfully.');
      }

      return auctions;
    } finally {
      await this.close();
    }
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('\n👋 Browser closed.');
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Convenience function to run the scraper with config
 */
export async function scrape(
  config: Partial<ScraperConfig> = {}
): Promise<BaTAuction[]> {
  const scraper = new BaTScraper(config);
  await scraper.init();
  return scraper.run();
}
