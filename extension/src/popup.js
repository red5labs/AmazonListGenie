// Popup script for Amazon Wishlist Scraper
// Handles UI interactions and message passing

let scrapedItems = [];

// DOM elements
const scrapeBtn = document.getElementById('scrapeBtn');
const exportCSVBtn = document.getElementById('exportCSVBtn');
const exportJSONBtn = document.getElementById('exportJSONBtn');
const statusDiv = document.getElementById('status');
const resultsContainer = document.getElementById('resultsContainer');
const resultsBody = document.getElementById('resultsBody');
const itemCountDiv = document.getElementById('itemCount');

/**
 * Updates status message
 * @param {string} message - Status message
 * @param {string} type - Type: 'info', 'success', 'error'
 */
function updateStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status text-center`;
  
  if (type === 'error') {
    statusDiv.style.color = '#ef4444'; // red
  } else if (type === 'success') {
    statusDiv.style.color = '#10b981'; // green
  } else {
    statusDiv.style.color = '#9ca3af'; // gray
  }
}

/**
 * Displays scraped items in table
 * @param {Array} items - Array of item objects
 */
function displayResults(items) {
  scrapedItems = items;
  resultsBody.innerHTML = '';
  
  if (items.length === 0) {
    updateStatus('No items found', 'error');
    return;
  }
  
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    
    // Thumbnail image
    const imageCell = document.createElement('td');
    imageCell.style.width = '60px';
    imageCell.style.padding = '0.25rem';
    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name || 'Product image';
      img.className = 'thumbnail-img';
      img.style.width = '50px';
      img.style.height = '50px';
      img.style.objectFit = 'contain';
      img.style.borderRadius = '4px';
      img.onerror = function() {
        // If image fails to load, show placeholder
        this.style.display = 'none';
        imageCell.textContent = 'No img';
        imageCell.style.fontSize = '0.7rem';
        imageCell.style.color = '#9ca3af';
      };
      imageCell.appendChild(img);
    } else {
      imageCell.textContent = 'No img';
      imageCell.style.fontSize = '0.7rem';
      imageCell.style.color = '#9ca3af';
    }
    
    // Item name (truncated if too long)
    const nameCell = document.createElement('td');
    const nameText = item.name || 'Unknown';
    nameCell.textContent = nameText.length > 50 ? nameText.substring(0, 50) + '...' : nameText;
    nameCell.title = nameText; // Full name on hover
    
    // ASIN
    const asinCell = document.createElement('td');
    asinCell.textContent = item.asin || 'N/A';
    asinCell.style.fontFamily = 'monospace';
    asinCell.style.fontSize = '0.75rem';
    
    // Price
    const priceCell = document.createElement('td');
    priceCell.textContent = item.price || 'N/A';
    
    row.appendChild(imageCell);
    row.appendChild(nameCell);
    row.appendChild(asinCell);
    row.appendChild(priceCell);
    resultsBody.appendChild(row);
  });
  
  itemCountDiv.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} found`;
  resultsContainer.classList.remove('hidden');
  updateStatus(`Successfully scraped ${items.length} item${items.length !== 1 ? 's' : ''}`, 'success');
}

/**
 * Handles scrape button click
 */
async function handleScrape() {
  scrapeBtn.disabled = true;
  scrapeBtn.textContent = 'Scraping...';
  updateStatus('Scraping wishlist...', 'info');
  resultsContainer.classList.add('hidden');
  scrapedItems = [];
  
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    // Check if we're on Amazon
    if (!tab.url || !tab.url.includes('amazon.com')) {
      throw new Error('Please navigate to an Amazon wishlist page');
    }
    
    // Send message to background script
    chrome.runtime.sendMessage(
      { action: 'scrapeWishlist' },
      (response) => {
        scrapeBtn.disabled = false;
        scrapeBtn.textContent = 'Scrape Wishlist';
        
        if (chrome.runtime.lastError) {
          updateStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
          return;
        }
        
        if (response && response.success) {
          displayResults(response.items || []);
        } else {
          updateStatus(
            response?.error || 'Failed to scrape wishlist',
            'error'
          );
        }
      }
    );
  } catch (error) {
    scrapeBtn.disabled = false;
    scrapeBtn.textContent = 'Scrape Wishlist';
    updateStatus(`Error: ${error.message}`, 'error');
  }
}

/**
 * Handles CSV export
 */
function handleExportCSV() {
  if (scrapedItems.length === 0) {
    updateStatus('No items to export', 'error');
    return;
  }
  
  try {
    exportToCSV(scrapedItems);
    updateStatus('CSV exported successfully', 'success');
  } catch (error) {
    updateStatus(`Export error: ${error.message}`, 'error');
  }
}

/**
 * Handles JSON export
 */
function handleExportJSON() {
  if (scrapedItems.length === 0) {
    updateStatus('No items to export', 'error');
    return;
  }
  
  try {
    exportToJSON(scrapedItems);
    updateStatus('JSON exported successfully', 'success');
  } catch (error) {
    updateStatus(`Export error: ${error.message}`, 'error');
  }
}

// Event listeners
scrapeBtn.addEventListener('click', handleScrape);
exportCSVBtn.addEventListener('click', handleExportCSV);
exportJSONBtn.addEventListener('click', handleExportJSON);

// Initialize: Check if we're on a wishlist page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    const url = tabs[0].url;
    if (!url.includes('amazon.com') || !url.includes('wishlist')) {
      updateStatus('Please navigate to an Amazon wishlist page', 'info');
      scrapeBtn.disabled = true;
    }
  }
});

