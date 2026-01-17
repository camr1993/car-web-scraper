# Bring a Trailer Scraper

A web scraper built with Playwright to collect completed auction data from [Bring a Trailer](https://bringatrailer.com/), one of the largest online collector car auction platforms.

By default, the scraper targets US-located vehicles sold within the last year with a final bid up to $100,000.

## Features

- Scrapes completed auction listings from Bring a Trailer
- Extracts detailed vehicle and sale information
- Exports data to timestamped CSV files
- Configurable auction count and rate limiting
- Supports headless and headed browser modes
- Built-in error handling and progress tracking

## Data Collected

Each auction record includes:

| Field | Description |
|-------|-------------|
| `title` | Full auction listing title |
| `make` | Vehicle manufacturer |
| `model` | Vehicle model |
| `era` | Decade (e.g., "1980s") |
| `origin` | Country of origin (e.g., "German", "Japanese") |
| `vehicleLocation` | Where the vehicle is located |
| `seller` | Seller username |
| `sellerLocation` | Seller's city, state, and ZIP |
| `sellerType` | "Private Party" or "Dealer" |
| `listingDetail1-5` | First 5 listing highlights |
| `views` | Total auction page views |
| `watchers` | Number of users watching |
| `status` | "sold" (reserve met) or "bid" (reserve not met) |
| `dateSold` | Auction end date |
| `saleAmount` | Final sale price in USD |
| `auctionUrl` | Link to the auction page |
| `scrapedAt` | Timestamp when data was collected |

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/car-web-scraper.git
cd car-web-scraper

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Usage

### Basic Usage

```bash
# Scrape 3 auctions (default)
npm run scrape

# Run with visible browser window
npm run scrape:headed

# Scrape a large number of auctions
npm run scrape:many
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HEADLESS` | `true` | Set to `false` to see the browser |
| `AUCTION_COUNT` | `3` | Number of auctions to scrape |
| `DELAY_MS` | `1500` | Delay between page visits (ms) |
| `OUTPUT_DIR` | `./output` | Directory for CSV output |

### Custom Configuration

```bash
# Scrape 50 auctions with 2 second delay
AUCTION_COUNT=50 DELAY_MS=2000 npm run scrape

# Scrape 10 auctions in headed mode
HEADLESS=false AUCTION_COUNT=10 npm run scrape
```

## Output

CSV files are saved to the `output/` directory with timestamps:

```
output/
├── bat_auctions_2026-01-15_09-40-07.csv
├── bat_auctions_2026-01-15_09-43-15.csv
└── ...
```

### Sample Output

```
═══════════════════════════════════════════════════════
           🏎️  Bring a Trailer Scraper  🏎️
═══════════════════════════════════════════════════════

🚀 Starting BaT Scraper...
   Headless: true
   Target auctions: 3

📄 Processing auction 1/3
   ✅ [BID] 1963 Porsche 356B Coupe

📄 Processing auction 2/3
   ✅ [SOLD] 1982 Toyota Land Cruiser FJ43 by FJ Company

📄 Processing auction 3/3
   ✅ [BID] 1980 Porsche 911SC Targa

═══════════════════════════════════════════════════════
                     Summary
═══════════════════════════════════════════════════════
   ✅ Sold:      1
   ✅ Bid:       2
   ⏭️  Skipped:   0
   ❌ Errors:    0
───────────────────────────────────────────────────────
   📊 Total processed: 3
   📁 Output: ./output/bat_auctions_2026-01-15_09-43-15.csv
═══════════════════════════════════════════════════════
```

## Project Structure

```
car-web-scraper/
├── scripts/
│   └── run.ts              # CLI entry point
├── src/
│   ├── scraper.ts          # Main scraper orchestration
│   ├── types.ts            # TypeScript interfaces
│   ├── transformers.ts     # Data cleaning/transformation
│   ├── csv-exporter.ts     # CSV file generation
│   └── page-handlers/
│       ├── results-page.ts # Collects auction URLs
│       └── auction-page.ts # Extracts auction details
├── output/                 # Generated CSV files
├── package.json
└── tsconfig.json
```

## How It Works

1. **URL Collection**: Navigates to BaT's completed auctions page and collects auction URLs
2. **Data Extraction**: Visits each auction page and extracts structured data from the DOM
3. **Transformation**: Cleans and normalizes the raw data (parses prices, dates, etc.)
4. **Filtering**: Skips withdrawn auctions and incomplete records
5. **Export**: Writes valid auction data to a timestamped CSV file

## Rate Limiting

The scraper includes a configurable delay between page visits (default: 1.5 seconds) to avoid overwhelming the server. Adjust `DELAY_MS` as needed.

## Requirements

- Node.js 18+
- npm or yarn

## License

ISC
