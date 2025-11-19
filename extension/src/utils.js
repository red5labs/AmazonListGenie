// Utility functions for Amazon Wishlist Scraper

/**
 * Extracts ASIN from URL or element
 * @param {string|HTMLElement} input - URL string or DOM element
 * @returns {string} - ASIN or empty string
 */
function extractASIN(input) {
  let url = '';
  
  // If input is an element, try to get URL from href or data attributes
  if (typeof input === 'object' && input !== null) {
    // Try href attribute first
    url = input.href || input.getAttribute('href') || '';
    
    // Try data-asin attribute
    if (!url) {
      const asin = input.getAttribute('data-asin') || 
                   input.getAttribute('data-item-id') ||
                   input.closest('[data-asin]')?.getAttribute('data-asin');
      if (asin) return asin;
    }
    
    // Try finding ASIN in parent elements
    const parentWithAsin = input.closest('[data-asin]');
    if (parentWithAsin) {
      const asin = parentWithAsin.getAttribute('data-asin');
      if (asin) return asin;
    }
  } else {
    url = String(input);
  }
  
  if (!url) return '';
  
  // Pattern 1: /dp/ASIN/ or /gp/product/ASIN/
  const dpMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  if (dpMatch) return dpMatch[1].toUpperCase();
  
  // Pattern 2: ?asin=ASIN or &asin=ASIN
  const asinParamMatch = url.match(/[?&]asin=([A-Z0-9]{10})(?:&|$)/i);
  if (asinParamMatch) return asinParamMatch[1].toUpperCase();
  
  // Pattern 3: ASIN in URL path
  const pathMatch = url.match(/\b([A-Z0-9]{10})\b/);
  if (pathMatch && pathMatch[1].length === 10) {
    // Validate it looks like an ASIN (starts with B, 0-9, or A)
    if (/^[B0-9A]/.test(pathMatch[1])) {
      return pathMatch[1].toUpperCase();
    }
  }
  
  return '';
}

/**
 * Exports items array to CSV format and triggers download
 * @param {Array} items - Array of wishlist item objects
 */
function exportToCSV(items) {
  if (!items || items.length === 0) {
    alert('No items to export');
    return;
  }
  
  // CSV headers
  const headers = ['Item Name', 'ASIN', 'Price', 'URL', 'Image URL'];
  
  // Build CSV rows
  const rows = items.map(item => {
    const name = escapeCSVField(item.name || '');
    const asin = escapeCSVField(item.asin || '');
    const price = escapeCSVField(item.price || '');
    const url = escapeCSVField(item.url || '');
    const image = escapeCSVField(item.image || '');
    return `${name},${asin},${price},${url},${image}`;
  });
  
  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `amazon-wishlist-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapes CSV field values (handles commas, quotes, newlines)
 * @param {string} field - Field value to escape
 * @returns {string} - Escaped field value
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports items array to JSON format and triggers download
 * @param {Array} items - Array of wishlist item objects
 */
function exportToJSON(items) {
  if (!items || items.length === 0) {
    alert('No items to export');
    return;
  }
  
  // Create JSON with pretty printing
  const jsonContent = JSON.stringify(items, null, 2);
  
  // Create blob and download
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `amazon-wishlist-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export functions for use in popup.js
if (typeof window !== 'undefined') {
  window.extractASIN = extractASIN;
  window.exportToCSV = exportToCSV;
  window.exportToJSON = exportToJSON;
}

