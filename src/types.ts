/**
 * Represents a completed auction from Bring a Trailer
 */
export interface BaTAuction {
  // From column-groups section
  make: string;
  model: string;
  era: string;
  origin: string;
  vehicleLocation: string;

  // From BaT Essentials section
  seller: string;
  sellerLocation: string;
  listingDetails: string[]; // First 5 bullets only
  sellerType: string; // "Private Party" or "Dealer"

  // Stats
  views: number;
  watchers: number;

  // Metadata
  title: string;
  auctionUrl: string;
  scrapedAt: string;
}

/**
 * Raw extracted data before transformation
 */
export interface RawAuctionData {
  columnGroups: {
    make?: string;
    model?: string;
    era?: string;
    origin?: string;
    location?: string;
  };
  essentials: {
    seller?: string;
    location?: string;
    listingDetails: string[];
    sellerType?: string;
  };
  stats: {
    views?: string;
    watchers?: string;
  };
  title?: string;
  url: string;
}

/**
 * Configuration for the scraper
 */
export interface ScraperConfig {
  /** Number of auctions to scrape */
  auctionCount: number;
  /** Run browser in headless mode */
  headless: boolean;
  /** Delay between page visits in milliseconds */
  delayBetweenPages: number;
  /** Output directory for CSV files */
  outputDir: string;
}

/**
 * Default scraper configuration
 */
export const DEFAULT_CONFIG: ScraperConfig = {
  auctionCount: 3,
  headless: true,
  delayBetweenPages: 1500,
  outputDir: './output',
};
