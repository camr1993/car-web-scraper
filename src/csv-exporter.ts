import * as fs from "fs";
import * as path from "path";
import { BaTAuction } from "./types";

/**
 * Export auctions to a CSV file
 */
export function exportToCsv(auctions: BaTAuction[], outputDir: string): string {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = formatTimestamp(new Date());
  const filename = `bat_auctions_${timestamp}.csv`;
  const filepath = path.join(outputDir, filename);

  // Define CSV headers
  const headers = [
    "title",
    "make",
    "model",
    "era",
    "origin",
    "vehicleLocation",
    "seller",
    "sellerLocation",
    "sellerType",
    "listingDetail1",
    "listingDetail2",
    "listingDetail3",
    "listingDetail4",
    "listingDetail5",
    "views",
    "watchers",
    "dateSold",
    "saleAmount",
    "auctionUrl",
    "scrapedAt",
  ];

  // Build CSV content
  const rows: string[] = [headers.join(",")];

  for (const auction of auctions) {
    const row = [
      escapeCSV(auction.title),
      escapeCSV(auction.make),
      escapeCSV(auction.model),
      escapeCSV(auction.era),
      escapeCSV(auction.origin),
      escapeCSV(auction.vehicleLocation),
      escapeCSV(auction.seller),
      escapeCSV(auction.sellerLocation),
      escapeCSV(auction.sellerType),
      escapeCSV(auction.listingDetails[0] || ""),
      escapeCSV(auction.listingDetails[1] || ""),
      escapeCSV(auction.listingDetails[2] || ""),
      escapeCSV(auction.listingDetails[3] || ""),
      escapeCSV(auction.listingDetails[4] || ""),
      auction.views.toString(),
      auction.watchers.toString(),
      escapeCSV(auction.dateSold),
      auction.saleAmount.toString(),
      escapeCSV(auction.auctionUrl),
      escapeCSV(auction.scrapedAt),
    ];
    rows.push(row.join(","));
  }

  const csvContent = rows.join("\n");
  fs.writeFileSync(filepath, csvContent, "utf-8");

  console.log(`📁 CSV exported to: ${filepath}`);
  return filepath;
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (!value) return '""';

  // If the value contains comma, quote, or newline, wrap in quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    // Escape existing quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return value;
}

/**
 * Format a date as YYYY-MM-DD_HH-mm-ss
 */
function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
