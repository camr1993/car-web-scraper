import { Page } from "@playwright/test";
import { RawAuctionData } from "../types";

/**
 * Extract raw auction data from an individual auction page
 */
export async function extractAuctionData(
  page: Page,
  url: string
): Promise<RawAuctionData> {
  console.log(`🔍 Extracting data from: ${url}`);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  // Wait for the essential content to load
  await page
    .waitForSelector(".column-groups", { timeout: 10000 })
    .catch(() => {});

  const rawData = await page.evaluate(() => {
    // Extract title
    const titleEl = document.querySelector("h1");
    const title = titleEl?.textContent?.trim();

    // Extract column groups data (Make, Model, Era, Origin, Location)
    const columnGroups: Record<string, string> = {};
    const groupItems = document.querySelectorAll(".column-groups .group-item");

    groupItems.forEach((item) => {
      const labelEl = item.querySelector(".group-title-label");
      const titleEl = item.querySelector(".group-title");

      if (labelEl && titleEl) {
        const label = labelEl.textContent?.trim().toLowerCase() || "";
        const fullText = titleEl.textContent?.trim() || "";
        const labelText = labelEl.textContent?.trim() || "";
        // Remove the label from the full text to get just the value
        const value = fullText.replace(labelText, "").trim();
        columnGroups[label] = value;
      }
    });

    // Extract BaT Essentials data
    const essentialsEl = document.querySelector(".essentials");

    // Seller
    const sellerEl = essentialsEl?.querySelector(".item-seller a");
    const seller = sellerEl?.textContent?.trim();

    // Location (from Google Maps link)
    const allLinks = Array.from(essentialsEl?.querySelectorAll("a") || []);
    const locationLink = allLinks.find((a) =>
      (a as HTMLAnchorElement).href.includes("google.com/maps")
    );
    const location = locationLink?.textContent?.trim();

    // Listing Details (first 5 bullets)
    const listingDetailsEls = Array.from(
      essentialsEl?.querySelectorAll(".item ul li") || []
    );
    const listingDetails = listingDetailsEls
      .slice(0, 5)
      .map((li) => li.textContent?.trim() || "");

    // Private Party or Dealer
    const additionalItems = Array.from(
      essentialsEl?.querySelectorAll(".item.additional") || []
    );
    let sellerType: string | undefined;

    for (const item of additionalItems) {
      const text = item.textContent || "";
      if (text.includes("Private Party or Dealer")) {
        const match = text.match(/Private Party or Dealer[:\s]+(\w+)/i);
        sellerType = match?.[1];
        break;
      }
    }

    // Extract views and watchers from page text
    const pageText = document.body.innerText;
    const viewsMatch = pageText.match(/(\d{1,3}(?:,\d{3})*)\s*views/i);
    const watchersMatch = pageText.match(/(\d{1,3}(?:,\d{3})*)\s*watchers/i);

    // Extract sale info and determine auction status
    let saleStatus: "sold" | "bid" | "withdrawn" | "unknown" = "unknown";
    let saleAmount: string | undefined;
    let dateSold: string | undefined;

    // Check for "Sold for USD $X on MM/DD/YY"
    const soldMatch = pageText.match(
      /Sold for\s+USD\s+\$([\d,]+)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    );
    if (soldMatch) {
      saleStatus = "sold";
      saleAmount = soldMatch[1];
      dateSold = soldMatch[2];
    }

    // Check for "Bid to USD $X on MM/DD/YY" (active auction)
    if (!dateSold) {
      const bidMatch = pageText.match(
        /Bid to\s+USD\s+\$([\d,]+)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
      );
      if (bidMatch) {
        saleStatus = "bid";
        saleAmount = bidMatch[1];
        dateSold = bidMatch[2];
      }
    }

    // Check for "Withdrawn on MM/DD/YY"
    if (!dateSold) {
      const withdrawnMatch = pageText.match(
        /Withdrawn\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
      );
      if (withdrawnMatch) {
        saleStatus = "withdrawn";
        dateSold = withdrawnMatch[1];
        saleAmount = "0";
      }
    }

    return {
      title,
      columnGroups: {
        make: columnGroups["make"],
        model: columnGroups["model"],
        era: columnGroups["era"],
        origin: columnGroups["origin"],
        location: columnGroups["location"],
      },
      essentials: {
        seller,
        location,
        listingDetails,
        sellerType,
      },
      stats: {
        views: viewsMatch?.[1],
        watchers: watchersMatch?.[1],
      },
      saleInfo: {
        status: saleStatus,
        dateSold,
        amount: saleAmount,
      },
    };
  });

  return {
    ...rawData,
    url,
  };
}
