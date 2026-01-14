import { scrape } from '../src/scraper';
import { ScraperConfig } from '../src/types';

/**
 * Entry point for the BaT scraper
 *
 * Environment variables:
 *   HEADLESS=false     - Run browser in headed mode (visible)
 *   AUCTION_COUNT=10   - Number of auctions to scrape
 *   DELAY_MS=2000      - Delay between page visits in ms
 */
async function main() {
  // Parse configuration from environment variables
  const config: Partial<ScraperConfig> = {
    headless: process.env.HEADLESS !== 'false',
    auctionCount: parseInt(process.env.AUCTION_COUNT || '3', 10),
    delayBetweenPages: parseInt(process.env.DELAY_MS || '1500', 10),
    outputDir: process.env.OUTPUT_DIR || './output',
  };

  console.log('═══════════════════════════════════════════════════════');
  console.log('           🏎️  Bring a Trailer Scraper  🏎️');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  try {
    const auctions = await scrape(config);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                     Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Total auctions scraped: ${auctions.length}`);

    if (auctions.length > 0) {
      console.log('\n   Scraped vehicles:');
      auctions.forEach((a, i) => {
        console.log(`   ${i + 1}. ${a.title} (${a.views} views)`);
      });
    }

    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
