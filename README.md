# Amazon Wishlist Scraper - Chrome Extension

A Chrome Extension (Manifest V3) that scrapes Amazon wishlist pages and allows you to export items to CSV or JSON format.

## Features

- ✅ Scrapes Amazon wishlist items (name, ASIN, price, URL)
- ✅ Handles lazy loading and infinite scroll
- ✅ Export to CSV or JSON
- ✅ Clean, minimalist UI
- ✅ Error handling for edge cases

## Installation

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension` folder from this repository
5. The extension icon should appear in your Chrome toolbar

## Usage

1. **Navigate to an Amazon Wishlist**
   - Go to any Amazon wishlist page (e.g., `https://www.amazon.com/hz/wishlist/ls/...`)
   - Make sure you're logged into Amazon (the extension doesn't handle login)

2. **Open the Extension Popup**
   - Click the extension icon in your Chrome toolbar
   - The popup will open

3. **Scrape the Wishlist**
   - Click the **"Scrape Wishlist"** button
   - The extension will:
     - Scroll to the bottom to load all items (handles lazy loading)
     - Extract item data from the page
     - Display results in a table

4. **Export Data**
   - Click **"Export CSV"** to download as CSV file
   - Click **"Export JSON"** to download as JSON file
   - Files are named: `amazon-wishlist-YYYY-MM-DD.csv` or `.json`

## Testing

### Test Against Multiple Wishlist URLs

The extension works with various Amazon wishlist URL formats:

- `https://www.amazon.com/hz/wishlist/ls/...`
- `https://www.amazon.com/wishlist/...`
- `https://www.amazon.com/gp/registry/wishlist/...`

**To test:**
1. Create or access different wishlist types:
   - Public wishlists
   - Private wishlists (will show error message)
   - Wishlists with many items (tests lazy loading)
   - Wishlists with few items

2. Test edge cases:
   - Empty wishlists
   - Items without prices
   - Items with special characters in names

## How It Works

### Scraping Strategy

The content script uses multiple fallback selectors to find wishlist items:

1. **Primary selectors:**
   - `#g-items li[data-item-id]`
   - `#g-items [data-item-id]`

2. **Fallback selectors:**
   - `[id*="item"] [data-item-id]`
   - `.a-unordered-list.a-nostyle.a-vertical li`
   - `.g-item-sortable`
   - `[data-asin]:not([data-asin=""])`

### ASIN Extraction

The extension extracts ASINs from multiple sources:

- `data-asin` attribute
- URL patterns: `/dp/ASIN/` or `/gp/product/ASIN/`
- Query parameters: `?asin=ASIN`

### Lazy Loading Handling

The scraper automatically:
1. Scrolls to the bottom of the page
2. Waits 1.5 seconds for new content to load
3. Extracts newly loaded items
4. Repeats until no new items are found (max 10 attempts)

## File Structure

```
extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── assets/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── background.js      # Service worker (message routing)
│   ├── contentScript.js   # Wishlist scraping logic
│   ├── popup.html         # Popup UI structure
│   ├── popup.js           # Popup event handlers
│   ├── popup.css          # Styling (Tailwind-compiled utilities)
│   └── utils.js           # Utility functions (ASIN extraction, export)
└── README.md              # This file
```

## Troubleshooting

### "Not on an Amazon wishlist page"

- **Solution:** Make sure you're on a page with `wishlist` in the URL
- The extension only works on Amazon wishlist pages

### "This wishlist is private"

- **Solution:** The extension cannot scrape private wishlists
- Make sure you're logged in and have access to the wishlist

### "No wishlist items found"

- **Possible causes:**
  - Amazon changed their page structure
  - The wishlist is empty
  - The page hasn't fully loaded

- **Solutions:**
  1. Refresh the page and try again
  2. Check if items are visible on the page
  3. Wait a few seconds after page load before scraping

### Extension icon is grayed out

- **Solution:** Make sure you're on an Amazon.com page
- The extension only activates on Amazon wishlist pages

### Items missing ASIN or price

- **Note:** Some items may not have prices displayed (out of stock, unavailable)
- ASINs should always be found if the item has a product link
- If many items are missing data, Amazon may have changed their structure

### Scraping stops early

- The extension stops scrolling after 10 attempts or when no new items load
- For very long wishlists, you may need to scroll manually first
- Try scrolling to the bottom manually, then click "Scrape Wishlist"

## Amazon Selector Fallbacks

Amazon uses different DOM structures for wishlists. The extension tries these selectors in order:

**Item Containers:**
- `#g-items li[data-item-id]`
- `[id*="item"] [data-item-id]`
- `.a-unordered-list.a-nostyle.a-vertical li`
- `.g-item-sortable`
- `[data-asin]`

**Title Selectors:**
- `h2 a span`
- `h3 a span`
- `[id*="itemName"]`
- `.a-text-normal`
- `a[id*="itemName"]`

**Price Selectors:**
- `.a-price .a-offscreen`
- `.a-price-whole`
- `[class*="price"]`
- `.a-color-price`
- `[data-price]`

## Development

### Making Changes

1. Edit files in `extension/src/`
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Rebuilding Tailwind CSS

The `popup.css` file contains a minimal, pre-compiled subset of Tailwind utilities. If you need to modify styles:

1. Edit `popup.css` directly (it's already compiled)
2. Or use Tailwind CLI if you have it installed:
   ```bash
   npx tailwindcss -i src/popup.css -o src/popup.css --minify
   ```

## Permissions

The extension requires:

- **activeTab**: Access to the current tab when you click the extension
- **scripting**: Inject content scripts into Amazon pages
- **storage**: (Future use) Store user preferences
- **host_permissions**: Access to `https://www.amazon.com/*`

## Limitations

- Does not handle Amazon login (user must be logged in manually)
- Cannot scrape private wishlists
- May break if Amazon significantly changes their page structure
- Price extraction may fail for items without displayed prices

## License

This extension is provided as-is for educational and personal use.

## Support

If you encounter issues:

1. Check the browser console for errors (`F12` → Console tab)
2. Verify you're on a valid Amazon wishlist page
3. Try refreshing the page and scraping again
4. Check that the extension is enabled in `chrome://extensions/`

