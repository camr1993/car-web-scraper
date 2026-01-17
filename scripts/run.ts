import { scrape } from "../src/scraper";
import { ScraperConfig } from "../src/types";

/**
 * Entry point for the BaT scraper
 *
 * Environment variables:
 *   HEADLESS=false        - Run browser in headed mode (visible)
 *   AUCTION_COUNT=10      - Number of auctions to scrape
 *   DELAY_MS=2000         - Delay between page visits in ms
 *   DEBUG_SCREENSHOTS=true - Take screenshots on errors for debugging
 */
async function main() {
  // Parse configuration from environment variables
  const config: Partial<ScraperConfig> = {
    headless: process.env.HEADLESS !== "false",
    auctionCount: parseInt(process.env.AUCTION_COUNT || "3", 10),
    delayBetweenPages: parseInt(process.env.DELAY_MS || "1500", 10),
    outputDir: process.env.OUTPUT_DIR || "./output",
    debugScreenshots: process.env.DEBUG_SCREENSHOTS === "true",
  };

  console.log("═══════════════════════════════════════════════════════");
  console.log("           🏎️  Bring a Trailer Scraper  🏎️");
  console.log("═══════════════════════════════════════════════════════");
  console.log("");

  try {
    const result = await scrape(config);
    const { stats, csvPath } = result;

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("                     Summary");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`   ✅ Sold:      ${stats.sold}`);
    console.log(`   ✅ Bid:       ${stats.bid}`);
    console.log(`   ⏭️  Skipped:   ${stats.skipped}`);
    console.log(`   ❌ Errors:    ${stats.errors.length}`);
    console.log("───────────────────────────────────────────────────────");
    console.log(`   📊 Total processed: ${stats.sold + stats.bid}`);

    if (csvPath) {
      console.log(`   📁 Output: ${csvPath}`);
    }

    // Show error details if any
    if (stats.errors.length > 0) {
      console.log("\n───────────────────────────────────────────────────────");
      console.log("   Error Details:");
      stats.errors.forEach((err, i) => {
        // Truncate URL for display
        const shortUrl =
          err.url.length > 60 ? "..." + err.url.slice(-57) : err.url;
        // Get first line of error
        const errorLine = err.error.split("\n")[0].substring(0, 80);
        console.log(`   ${i + 1}. ${shortUrl}`);
        console.log(`      → ${errorLine}`);
      });
    }

    console.log("═══════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
