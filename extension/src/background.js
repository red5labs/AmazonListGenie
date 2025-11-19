// Background service worker for Amazon Wishlist Scraper
// Handles message passing between popup and content script

/**
 * Injects content script and sends message with retry logic
 */
function injectAndScrape(tabId, retries = 3) {
  return new Promise((resolve) => {
    // Try to send message first (content script might already be loaded)
    chrome.tabs.sendMessage(tabId, { action: 'scrapeWishlist' }, (response) => {
      if (!chrome.runtime.lastError) {
        // Content script is loaded and responded
        resolve(response || { success: false, error: 'No response from content script' });
        return;
      }
      
      // Content script not loaded, inject it
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['src/contentScript.js']
      }, (injectionResults) => {
        if (chrome.runtime.lastError) {
          resolve({ 
            success: false, 
            error: `Failed to inject content script: ${chrome.runtime.lastError.message}` 
          });
          return;
        }
        
        // Wait for script to initialize, then send message with retry
        const attemptMessage = (attempt = 0) => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'scrapeWishlist' }, (response) => {
              if (chrome.runtime.lastError && attempt < retries) {
                // Retry if failed
                attemptMessage(attempt + 1);
              } else if (chrome.runtime.lastError) {
                resolve({ 
                  success: false, 
                  error: `Failed to communicate with content script: ${chrome.runtime.lastError.message}` 
                });
              } else {
                resolve(response || { success: false, error: 'No response from content script' });
              }
            });
          }, attempt === 0 ? 200 : 100); // Longer initial wait, then shorter retries
        };
        
        attemptMessage();
      });
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Relay messages between popup and content script
  if (message.action === 'scrapeWishlist') {
    // Forward scrape request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }
      
      const tab = tabs[0];
      
      // Check if we're on Amazon
      if (!tab.url || !tab.url.includes('amazon.com')) {
        sendResponse({ success: false, error: 'Please navigate to an Amazon wishlist page' });
        return;
      }
      
      try {
        const response = await injectAndScrape(tab.id);
        sendResponse(response);
      } catch (error) {
        sendResponse({ success: false, error: error.message || 'Unknown error occurred' });
      }
    });
    return true; // Keep channel open for async response
  }
  
  // Handle other future actions here
  return false;
});

