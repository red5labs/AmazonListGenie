// Content script for Amazon Wishlist Scraper
// Scrapes wishlist items from the DOM

/**
 * Main function to scrape wishlist items from Amazon page
 * Handles lazy loading by scrolling to bottom and waiting for new items
 * @returns {Promise<Array>} - Array of wishlist item objects
 */
async function scrapeWishlist() {
  try {
    // Check if we're on a wishlist page
    if (!isWishlistPage()) {
      throw new Error('Not on an Amazon wishlist page');
    }
    
    // Check for private wishlist
    if (isPrivateWishlist()) {
      throw new Error('This wishlist is private and cannot be scraped');
    }
    
    const items = [];
    const seenIds = new Set();
    let previousItemCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;
    
    // Function to extract items from current DOM state
    const extractItems = () => {
      const itemElements = findWishlistItems();
      const newItems = [];
      
      itemElements.forEach((element) => {
        try {
          const item = extractItemData(element);
          if (item && item.asin && !seenIds.has(item.asin)) {
            seenIds.add(item.asin);
            newItems.push(item);
          }
        } catch (err) {
          console.warn('Error extracting item:', err);
        }
      });
      
      return newItems;
    };
    
    // Initial extraction
    items.push(...extractItems());
    
    // Handle lazy loading by scrolling
    while (scrollAttempts < maxScrollAttempts) {
      previousItemCount = items.length;
      
      // Scroll to bottom
      window.scrollTo(0, document.body.scrollHeight);
      
      // Wait for new content to load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Extract new items
      const newItems = extractItems();
      items.push(...newItems);
      
      // If no new items found, we're done
      if (items.length === previousItemCount) {
        break;
      }
      
      scrollAttempts++;
    }
    
    if (items.length === 0) {
      throw new Error('No wishlist items found. The page structure may have changed.');
    }
    
    return items;
  } catch (error) {
    console.error('Error scraping wishlist:', error);
    throw error;
  }
}

/**
 * Checks if current page is an Amazon wishlist page
 * @returns {boolean}
 */
function isWishlistPage() {
  const url = window.location.href;
  const hasWishlistInUrl = /wishlist/i.test(url);
  const hasWishlistElements = document.querySelector('#g-items, [data-wishlist], .a-unordered-list.a-nostyle.a-vertical');
  return hasWishlistInUrl || !!hasWishlistElements;
}

/**
 * Checks if wishlist is private or inaccessible
 * @returns {boolean}
 */
function isPrivateWishlist() {
  // First, check if we can actually find wishlist items
  // If we can find items, the wishlist is accessible (not private)
  const testItems = findWishlistItems();
  if (testItems.length > 0) {
    return false; // We found items, so it's not private
  }
  
  // Check for specific private wishlist error messages
  const bodyText = document.body.textContent || '';
  const pageHTML = document.body.innerHTML || '';
  
  // Very specific indicators that a wishlist is private/inaccessible
  const privateIndicators = [
    'This list is private',
    'This list is not available',
    'You don\'t have permission',
    'This list doesn\'t exist',
    'We\'re sorry. The Web address you entered is not a functioning page',
    'Sorry, we couldn\'t find that list'
  ];
  
  // Check if any private indicator is present
  for (const indicator of privateIndicators) {
    if (bodyText.includes(indicator) || pageHTML.includes(indicator)) {
      // Double-check: make sure we're not just on a loading page
      // If the page has wishlist structure elements, it might just be loading
      const hasWishlistStructure = document.querySelector('#g-items, [data-wishlist], .a-unordered-list.a-nostyle.a-vertical');
      if (!hasWishlistStructure) {
        return true; // No wishlist structure + error message = private
      }
    }
  }
  
  // Check for sign-in prompts that are specifically about viewing the list
  const signInPrompts = document.querySelectorAll('[data-action="sign-in"], .a-alert-error');
  for (const prompt of signInPrompts) {
    const promptText = prompt.textContent || '';
    if (promptText.includes('view this list') || 
        promptText.includes('access this list') ||
        promptText.includes('private list')) {
      return true;
    }
  }
  
  return false; // Default to not private - let scraping attempt proceed
}

/**
 * Finds all wishlist item elements using multiple selector strategies
 * @returns {NodeList|Array} - Collection of item elements
 */
function findWishlistItems() {
  // Strategy 1: Main wishlist container (#g-items)
  let items = document.querySelectorAll('#g-items li[data-item-id], #g-items [data-item-id]');
  if (items.length > 0) return items;
  
  // Strategy 2: Alternative container structure
  items = document.querySelectorAll('[id*="item"] [data-item-id], [id*="item"] [data-asin]');
  if (items.length > 0) return items;
  
  // Strategy 3: Grid items
  items = document.querySelectorAll('.a-unordered-list.a-nostyle.a-vertical li, .g-item-sortable');
  if (items.length > 0) return items;
  
  // Strategy 4: Generic product cards
  items = document.querySelectorAll('[data-asin]:not([data-asin=""])');
  if (items.length > 0) return items;
  
  return [];
}

/**
 * Extracts data from a single wishlist item element
 * @param {HTMLElement} element - DOM element containing item data
 * @returns {Object|null} - Item data object or null
 */
function extractItemData(element) {
  // Extract ASIN
  let asin = extractASINFromElement(element);
  if (!asin) {
    // Try to find ASIN in child elements
    const asinElement = element.querySelector('[data-asin], [href*="/dp/"], [href*="/gp/product/"]');
    if (asinElement) {
      asin = extractASINFromElement(asinElement);
    }
    if (!asin) {
      return null; // Can't extract without ASIN
    }
  }
  
  // Extract title/name
  const name = extractItemName(element);
  
  // Extract price
  const price = extractItemPrice(element);
  
  // Extract URL
  const url = extractItemUrl(element);
  
  // Extract image/thumbnail
  const image = extractItemImage(element);
  
  return {
    name: name || 'Unknown Item',
    asin: asin,
    price: price || 'N/A',
    url: url || `https://www.amazon.com/dp/${asin}`,
    image: image || ''
  };
}

/**
 * Extracts ASIN from an element
 * @param {HTMLElement} element - DOM element
 * @returns {string} - ASIN or empty string
 */
function extractASINFromElement(element) {
  // Try data-asin attribute
  let asin = element.getAttribute('data-asin') || 
             element.getAttribute('data-item-id') ||
             element.closest('[data-asin]')?.getAttribute('data-asin');
  
  if (asin && /^[A-Z0-9]{10}$/i.test(asin)) {
    return asin.toUpperCase();
  }
  
  // Try extracting from href
  const link = element.querySelector('a[href*="/dp/"], a[href*="/gp/product/"]') || 
               (element.tagName === 'A' ? element : null);
  
  if (link) {
    const href = link.href || link.getAttribute('href');
    if (href) {
      const match = href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?#]|$)/i);
      if (match) return match[1].toUpperCase();
    }
  }
  
  return '';
}

/**
 * Extracts item name/title from element
 * @param {HTMLElement} element - DOM element
 * @returns {string} - Item name or empty string
 */
function extractItemName(element) {
  // Try multiple selectors for title
  const titleSelectors = [
    'h2 a span',
    'h3 a span',
    '[id*="itemName"]',
    '.a-text-normal',
    'a[id*="itemName"]',
    '.a-link-normal',
    'h2',
    'h3'
  ];
  
  for (const selector of titleSelectors) {
    const titleEl = element.querySelector(selector);
    if (titleEl) {
      const text = titleEl.textContent?.trim();
      if (text && text.length > 0) {
        return text;
      }
    }
  }
  
  // Fallback: get first significant text
  const allText = element.textContent?.trim();
  if (allText && allText.length > 50) {
    return allText.substring(0, 200).trim();
  }
  
  return '';
}

/**
 * Extracts price from element
 * @param {HTMLElement} element - DOM element
 * @returns {string} - Price string or empty string
 */
function extractItemPrice(element) {
  // Try multiple price selectors
  const priceSelectors = [
    '.a-price .a-offscreen',
    '.a-price-whole',
    '[class*="price"]',
    '.a-color-price',
    '[data-price]'
  ];
  
  for (const selector of priceSelectors) {
    const priceEl = element.querySelector(selector);
    if (priceEl) {
      // Try data-price attribute first
      const dataPrice = priceEl.getAttribute('data-price');
      if (dataPrice) {
        return formatPrice(dataPrice);
      }
      
      // Try text content
      let priceText = priceEl.textContent?.trim();
      if (priceText) {
        // Extract price pattern ($XX.XX or XX.XX)
        const priceMatch = priceText.match(/[\$]?([\d,]+\.?\d*)/);
        if (priceMatch) {
          return formatPrice(priceMatch[1]);
        }
        return priceText;
      }
    }
  }
  
  // Fallback: search entire element text for price pattern
  const elementText = element.textContent || '';
  const priceMatch = elementText.match(/[\$]?([\d,]+\.?\d{2})/);
  if (priceMatch) {
    return formatPrice(priceMatch[1]);
  }
  
  return '';
}

/**
 * Formats price string
 * @param {string} price - Raw price string
 * @returns {string} - Formatted price
 */
function formatPrice(price) {
  if (!price) return '';
  // Remove commas and ensure proper format
  const cleaned = String(price).replace(/,/g, '');
  if (cleaned.includes('$')) return cleaned;
  return `$${cleaned}`;
}

/**
 * Extracts item URL from element
 * @param {HTMLElement} element - DOM element
 * @returns {string} - Full URL or empty string
 */
function extractItemUrl(element) {
  // Find link element
  const link = element.querySelector('a[href*="/dp/"], a[href*="/gp/product/"]') || 
               (element.tagName === 'A' ? element : null);
  
  if (link) {
    let href = link.href || link.getAttribute('href');
    if (href) {
      // Convert relative URLs to absolute
      if (href.startsWith('/')) {
        href = `https://www.amazon.com${href}`;
      }
      // Clean up URL (remove tracking parameters)
      try {
        const url = new URL(href);
        // Keep only essential parameters
        const cleanUrl = `${url.origin}${url.pathname}`;
        return cleanUrl;
      } catch (e) {
        return href;
      }
    }
  }
  
  return '';
}

/**
 * Extracts item image/thumbnail URL from element
 * @param {HTMLElement} element - DOM element
 * @returns {string} - Image URL or empty string
 */
function extractItemImage(element) {
  // Try multiple image selectors used by Amazon
  const imageSelectors = [
    'img[data-a-dynamic-image]', // Amazon's dynamic image (JSON object)
    'img[data-src]',              // Lazy-loaded images
    'img.a-dynamic-image',        // Amazon's dynamic image class
    '.a-dynamic-image img',       // Nested dynamic image
    '[data-image-latency] img',   // Image with latency attribute
    'img[src]'                    // Regular images
  ];
  
  for (const selector of imageSelectors) {
    const img = element.querySelector(selector);
    if (img) {
      // Check for data-a-dynamic-image first (Amazon's JSON image object)
      const dynamicImageAttr = img.getAttribute('data-a-dynamic-image');
      if (dynamicImageAttr) {
        try {
          // Parse JSON object that contains multiple image sizes
          const imageData = JSON.parse(dynamicImageAttr);
          // Get the largest/highest quality image (usually the last or largest key)
          const imageUrls = Object.keys(imageData);
          if (imageUrls.length > 0) {
            // Sort by size (larger numbers in URL usually mean larger images)
            // Or just get the last one which is often the largest
            let imageUrl = imageUrls[imageUrls.length - 1];
            
            // Convert to absolute URL if needed
            if (imageUrl.startsWith('//')) {
              imageUrl = `https:${imageUrl}`;
            } else if (imageUrl.startsWith('/')) {
              imageUrl = `https://www.amazon.com${imageUrl}`;
            }
            
            return imageUrl;
          }
        } catch (e) {
          // Not valid JSON, continue to other methods
        }
      }
      
      // Try data-src (lazy loading)
      let imageUrl = img.getAttribute('data-src');
      if (imageUrl) {
        if (imageUrl.startsWith('//')) {
          imageUrl = `https:${imageUrl}`;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = `https://www.amazon.com${imageUrl}`;
        }
        return imageUrl;
      }
      
      // Try src attribute
      imageUrl = img.getAttribute('src') || img.src;
      if (imageUrl) {
        // Skip placeholder images
        if (imageUrl.includes('pixel') || imageUrl.includes('placeholder') || imageUrl.includes('data:image')) {
          continue;
        }
        
        if (imageUrl.startsWith('//')) {
          imageUrl = `https:${imageUrl}`;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = `https://www.amazon.com${imageUrl}`;
        }
        return imageUrl;
      }
    }
  }
  
  // Fallback: look for any img tag
  const anyImg = element.querySelector('img');
  if (anyImg) {
    let imageUrl = anyImg.src || anyImg.getAttribute('src');
    if (imageUrl && !imageUrl.includes('pixel') && !imageUrl.includes('placeholder')) {
      if (imageUrl.startsWith('//')) {
        imageUrl = `https:${imageUrl}`;
      } else if (imageUrl.startsWith('/')) {
        imageUrl = `https://www.amazon.com${imageUrl}`;
      }
      return imageUrl;
    }
  }
  
  return '';
}

// Listen for messages from background script
// Use a flag to prevent duplicate listeners if script is injected multiple times
if (!window.__amazonWishlistScraperLoaded) {
  window.__amazonWishlistScraperLoaded = true;
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scrapeWishlist') {
      scrapeWishlist()
        .then(items => {
          sendResponse({ success: true, items: items });
        })
        .catch(error => {
          sendResponse({ 
            success: false, 
            error: error.message || 'Unknown error occurred' 
          });
        });
      
      return true; // Keep channel open for async response
    }
    
    return false;
  });
}

