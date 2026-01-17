import { Page } from "@playwright/test";

const RESULTS_URL =
  "https://bringatrailer.com/auctions/results/?location=US&timeFrame=1Y&result=sold&bidTo=100000";
const AUCTION_CARD_SELECTOR = ".auctions-container a.listing-card";
const SHOW_MORE_BUTTON_SELECTOR = "button.auctions-footer-button";

interface CollectOptions {
  debugScreenshots?: boolean;
  outputDir?: string;
}

/**
 * Navigate to the BaT results page and collect auction URLs
 */
export async function collectAuctionUrls(
  page: Page,
  count: number,
  options: CollectOptions = {}
): Promise<string[]> {
  const { debugScreenshots = false, outputDir = "./output" } = options;
  console.log(`📋 Navigating to BaT auction results...`);
  await page.goto(RESULTS_URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Wait for auction cards to load before proceeding
  await page.waitForSelector(AUCTION_CARD_SELECTOR, {
    timeout: 30000,
    state: "attached",
  });
  console.log("Navigated to results page");

  // Scroll down to the "All Completed Auctions" section
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(1000);
  console.log("Scrolled down to the 'All Completed Auctions' section");

  const urls: string[] = [];

  while (urls.length < count) {
    // Wait for auction cards to be present in the DOM
    await page.waitForSelector(AUCTION_CARD_SELECTOR, {
      timeout: 10000,
      state: "attached",
    });
    // Collect visible auction URLs
    const visibleUrls = await page.evaluate((selector) => {
      const cards = document.querySelectorAll(selector);
      return Array.from(cards).map((card) => (card as HTMLAnchorElement).href);
    }, AUCTION_CARD_SELECTOR);

    // Add new URLs that we haven't collected yet
    for (const url of visibleUrls) {
      console.log("Adding new URL: ", url);
      if (!urls.includes(url) && urls.length < count) {
        urls.push(url);
      }
    }

    if (urls.length >= count) {
      break;
    }

    // Try to load more auctions
    const hasMore = await loadMoreAuctions(page, {
      debugScreenshots,
      outputDir,
    });
    if (!hasMore) {
      console.log(
        `⚠️ No more auctions to load. Collected ${urls.length} URLs.`
      );
      break;
    }
  }

  console.log(`✅ Collected ${urls.length} auction URLs`);
  return urls.slice(0, count);
}

/**
 * Scroll and click "Show More" to load additional auctions
 * Returns true if more auctions were loaded, false otherwise
 */
async function loadMoreAuctions(
  page: Page,
  options: CollectOptions = {}
): Promise<boolean> {
  const { debugScreenshots = false, outputDir = "./output" } = options;

  // First try scrolling to trigger lazy loading
  const previousHeight = await page.evaluate(() => document.body.scrollHeight);

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1000);

  const newHeight = await page.evaluate(() => document.body.scrollHeight);

  // If scrolling loaded more content, we're done
  if (newHeight > previousHeight) {
    return true;
  }

  // Try clicking the "Show More" button
  try {
    const showMoreButton = page.locator(SHOW_MORE_BUTTON_SELECTOR);
    if (await showMoreButton.isVisible({ timeout: 2000 })) {
      await showMoreButton.click();
      await page.waitForTimeout(1500);
      return true;
    } else if (debugScreenshots) {
      // Button not visible - take screenshot for debugging
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const screenshotPath = `${outputDir}/debug-no-show-more-${timestamp}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   📸 Screenshot saved: ${screenshotPath}`);
    }
  } catch (error) {
    if (debugScreenshots) {
      // Button not found or not clickable - take screenshot for debugging
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const screenshotPath = `${outputDir}/debug-show-more-error-${timestamp}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   📸 Screenshot saved: ${screenshotPath}`);
    }
    console.log(
      `   ⚠️ Show more button error: ${
        error instanceof Error ? error.message : error
      }`
    );
  }

  return false;
}
