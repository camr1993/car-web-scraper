import { chromium, Browser, BrowserContext, Page } from "playwright";
import {
  BaTAuction,
  ScraperConfig,
  ScraperResult,
  ScraperStats,
  DEFAULT_CONFIG,
} from "./types";
import { collectAuctionUrls } from "./page-handlers/results-page";
import { extractAuctionData } from "./page-handlers/auction-page";
import {
  transformAuctionData,
  isValidAuction,
  shouldIncludeAuction,
} from "./transformers";
import { exportToCsv } from "./csv-exporter";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Main scraper class for Bring a Trailer auctions
 */
export class BaTScraper {
  private config: ScraperConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private pageCount: number = 0;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the browser
   */
  async init(): Promise<void> {
    console.log("🚀 Starting BaT Scraper...");
    console.log(`   Headless: ${this.config.headless}`);
    console.log(`   Target auctions: ${this.config.auctionCount}`);

    this.browser = await chromium.launch({
      headless: this.config.headless,
    });

    await this.createNewContext();
  }

  /**
   * Create a fresh browser context and page
   */
  private async createNewContext(): Promise<void> {
    // Close existing context if any
    if (this.context) {
      await this.context.close().catch(() => {});
    }

    this.context = await this.browser!.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 800 },
    });

    this.page = await this.context.newPage();
    this.pageCount = 0;
  }

  /**
   * Recover from a crashed page by creating a new context
   */
  private async recoverFromCrash(): Promise<void> {
    console.log("   🔄 Recovering from crash...");
    await this.createNewContext();
  }

  /**
   * Run the scraper
   */
  async run(): Promise<ScraperResult> {
    if (!this.page) {
      throw new Error("Scraper not initialized. Call init() first.");
    }

    const auctions: BaTAuction[] = [];
    const stats: ScraperStats = {
      sold: 0,
      bid: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Step 1: Collect auction URLs from results page
      const urls = await collectAuctionUrls(
        this.page,
        this.config.auctionCount,
        {
          debugScreenshots: this.config.debugScreenshots,
          outputDir: this.config.outputDir,
        }
      );

      // Step 2: Visit each auction page and extract data
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`\n📄 Processing auction ${i + 1}/${urls.length}`);

        // Periodically refresh the context to prevent memory issues (every 50 pages)
        if (this.pageCount > 0 && this.pageCount % 50 === 0) {
          console.log("   🔄 Refreshing browser context...");
          await this.createNewContext();
        }

        try {
          // Extract raw data
          const rawData = await extractAuctionData(this.page!, url);
          this.pageCount++;

          // Skip withdrawn auctions
          if (!shouldIncludeAuction(rawData)) {
            const status = rawData.saleInfo.status || "unknown";
            console.log(`   ⏭️ Skipped (${status}): ${rawData.title || url}`);
            stats.skipped++;
            continue;
          }

          // Transform to clean data
          const auction = transformAuctionData(rawData);

          // Validate and add
          if (isValidAuction(auction)) {
            auctions.push(auction);

            // Track by status
            if (auction.status === "sold") {
              stats.sold++;
              console.log(`   ✅ [SOLD] ${auction.title}`);
            } else {
              stats.bid++;
              console.log(`   ✅ [BID] ${auction.title}`);
            }
          } else {
            console.log(`   ⚠️ Skipped (incomplete data): ${url}`);
            stats.skipped++;
          }

          // Rate limiting - be nice to the server
          if (i < urls.length - 1) {
            await this.delay(this.config.delayBetweenPages);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Check if this is a crash - if so, recover and retry once
          if (
            errorMessage.includes("crashed") ||
            errorMessage.includes("page.goto")
          ) {
            console.error(`   ❌ Page crashed, attempting recovery...`);
            await this.recoverFromCrash();

            // Retry this URL once after recovery
            try {
              const rawData = await extractAuctionData(this.page!, url);
              this.pageCount++;

              if (!shouldIncludeAuction(rawData)) {
                const status = rawData.saleInfo.status || "unknown";
                console.log(
                  `   ⏭️ Skipped (${status}): ${rawData.title || url}`
                );
                stats.skipped++;
                continue;
              }

              const auction = transformAuctionData(rawData);
              if (isValidAuction(auction)) {
                auctions.push(auction);
                if (auction.status === "sold") {
                  stats.sold++;
                  console.log(`   ✅ [SOLD] ${auction.title}`);
                } else {
                  stats.bid++;
                  console.log(`   ✅ [BID] ${auction.title}`);
                }
              } else {
                console.log(`   ⚠️ Skipped (incomplete data): ${url}`);
                stats.skipped++;
              }

              if (i < urls.length - 1) {
                await this.delay(this.config.delayBetweenPages);
              }
              continue;
            } catch (retryError) {
              const retryMessage =
                retryError instanceof Error
                  ? retryError.message
                  : String(retryError);
              console.error(
                `   ❌ Retry failed: ${retryMessage.substring(0, 80)}...`
              );
              stats.errors.push({ url, error: retryMessage });
              continue;
            }
          }

          // Truncate long error messages
          const shortError =
            errorMessage.length > 100
              ? errorMessage.substring(0, 100) + "..."
              : errorMessage;
          console.error(`   ❌ Error: ${shortError}`);
          stats.errors.push({ url, error: errorMessage });
        }
      }

      // Step 3: Export to CSV
      let csvPath: string | null = null;
      if (auctions.length > 0) {
        csvPath = exportToCsv(auctions, this.config.outputDir);
      }

      return { auctions, stats, csvPath };
    } finally {
      await this.close();
    }
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("\n👋 Browser closed.");
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
): Promise<ScraperResult> {
  const scraper = new BaTScraper(config);
  await scraper.init();
  return scraper.run();
}
