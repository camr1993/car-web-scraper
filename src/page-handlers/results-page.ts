import { Page } from '@playwright/test';

const RESULTS_URL = 'https://bringatrailer.com/auctions/results/';
const AUCTION_CARD_SELECTOR = '.auctions-container a.listing-card';
const SHOW_MORE_BUTTON_SELECTOR = 'button.auctions-footer-button';

/**
 * Navigate to the BaT results page and collect auction URLs
 */
export async function collectAuctionUrls(
  page: Page,
  count: number
): Promise<string[]> {
  console.log(`📋 Navigating to BaT auction results...`);
  await page.goto(RESULTS_URL, { waitUntil: 'networkidle' });

  // Scroll down to the "All Completed Auctions" section
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(500);

  const urls: string[] = [];

  while (urls.length < count) {
    // Wait for auction cards to be present
    await page.waitForSelector(AUCTION_CARD_SELECTOR, { timeout: 10000 });

    // Collect visible auction URLs
    const visibleUrls = await page.evaluate((selector) => {
      const cards = document.querySelectorAll(selector);
      return Array.from(cards).map((card) => (card as HTMLAnchorElement).href);
    }, AUCTION_CARD_SELECTOR);

    // Add new URLs that we haven't collected yet
    for (const url of visibleUrls) {
      if (!urls.includes(url) && urls.length < count) {
        urls.push(url);
      }
    }

    if (urls.length >= count) {
      break;
    }

    // Try to load more auctions
    const hasMore = await loadMoreAuctions(page);
    if (!hasMore) {
      console.log(`⚠️ No more auctions to load. Collected ${urls.length} URLs.`);
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
async function loadMoreAuctions(page: Page): Promise<boolean> {
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
    }
  } catch {
    // Button not found or not clickable
  }

  return false;
}
