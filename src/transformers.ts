import { BaTAuction, RawAuctionData } from "./types";

/**
 * Transform raw auction data into a clean BaTAuction object
 */
export function transformAuctionData(raw: RawAuctionData): BaTAuction {
  return {
    // Column groups
    make: cleanText(raw.columnGroups.make) || "Unknown",
    model: cleanText(raw.columnGroups.model) || "Unknown",
    era: cleanText(raw.columnGroups.era) || "Unknown",
    origin: cleanText(raw.columnGroups.origin) || "Unknown",
    vehicleLocation:
      cleanVehicleLocation(raw.columnGroups.location) || "Unknown",

    // Essentials
    seller: cleanText(raw.essentials.seller) || "Unknown",
    sellerLocation: cleanText(raw.essentials.location) || "Unknown",
    listingDetails: raw.essentials.listingDetails
      .map(cleanText)
      .filter(Boolean),
    sellerType: cleanText(raw.essentials.sellerType) || "Unknown",

    // Stats
    views: parseNumber(raw.stats.views),
    watchers: parseNumber(raw.stats.watchers),

    // Sale info
    status: raw.saleInfo.status as "sold" | "bid",
    dateSold: raw.saleInfo.dateSold || "Unknown",
    saleAmount: parseNumber(raw.saleInfo.amount),

    // Metadata
    title: cleanText(raw.title) || "Unknown",
    auctionUrl: raw.url,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Clean and normalize text
 */
function cleanText(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[\n\r\t]/g, " ") // Remove newlines and tabs
    .trim();
}

/**
 * Clean vehicle location (remove "Located in" prefix)
 */
function cleanVehicleLocation(location: string | undefined): string {
  if (!location) return "";
  return location.replace(/^Located in\s*/i, "").trim();
}

/**
 * Parse a number string (with commas) to a number
 * e.g., "7,227" -> 7227
 */
function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Validate that an auction has the minimum required data
 */
export function isValidAuction(auction: BaTAuction): boolean {
  return (
    auction.make !== "Unknown" &&
    auction.model !== "Unknown" &&
    auction.auctionUrl.length > 0
  );
}

/**
 * Check if the auction should be included (sold or bid)
 * Returns false for withdrawn auctions
 */
export function shouldIncludeAuction(raw: RawAuctionData): boolean {
  return raw.saleInfo.status === "sold" || raw.saleInfo.status === "bid";
}
