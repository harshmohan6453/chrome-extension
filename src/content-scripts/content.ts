import { Inspector } from './inspector';
import { extractFonts } from './extractors/fontExtractor';
import { extractColors } from './extractors/colorExtractor';
import { detectSpacingSystem } from './extractors/spacingExtractor';
import { extractTechnologies } from './extractors/techExtractor';
import { extractAssets } from './extractors/assetExtractor';

const inspector = new Inspector();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.action === 'TOGGLE_INSPECTOR') {
    if (request.payload) {
      inspector.enable();
    } else {
      inspector.disable();
    }
    sendResponse({ status: 'ok' });
  }

  if (request.action === 'GET_PAGE_DATA') {
    const fonts = extractFonts();
    const colors = extractColors();
    const spacing = detectSpacingSystem();
    const technologies = extractTechnologies();
    const assets = extractAssets();
    
    sendResponse({
      fonts,
      colors,
      spacing,
      technologies,
      assets,
      meta: {
        title: document.title,
        url: window.location.href,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
      }
    });
  }
  
  return true; // Keep message channel open for async response
});

console.log('Design Inspector Content Script Ready');
