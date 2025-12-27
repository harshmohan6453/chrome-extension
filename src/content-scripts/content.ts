import { Inspector } from './inspector';
import { extractFonts } from './extractors/fontExtractor';
import { extractColors } from './extractors/colorExtractor';
import { detectSpacingSystem } from './extractors/spacingExtractor';
import { extractTechnologies } from './extractors/techExtractor';
import { extractAssets } from './extractors/assetExtractor';
import { detectAllScrollAnimations } from './extractors/scrollAnimationDetector';

const inspector = new Inspector();

// Inject page context script to access window variables
function injectPageContextScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('pageContext.js');
  script.onload = () => {
    console.log('✅ Page context script injected');
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Try to inject the script
try {
  injectPageContextScript();
} catch (err) {
  console.warn('Could not inject page context script:', err);
}

// Store for scroll animations detected from page context
let pageContextAnimations: any[] = [];

// Listen for messages from page context
window.addEventListener('message', (event) => {
  if (event.data.type === 'SCROLL_ANIMATIONS_DETECTED') {
    pageContextAnimations = event.data.animations || [];
    console.log(`📨 Received ${pageContextAnimations.length} animations from page context`);
  }
});

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

  if (request.action === 'HIGHLIGHT_ELEMENT') {
    // Highlight the element on the page
    try {
      const element = document.querySelector(request.selector);
      if (element) {
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait for scroll to complete before highlighting
        setTimeout(() => {
          // Recalculate position after scroll
          const rect = element.getBoundingClientRect();
          const highlight = document.createElement('div');
          highlight.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            border: 3px solid #3b82f6;
            background: rgba(59, 130, 246, 0.1);
            pointer-events: none;
            z-index: 999999;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
            transition: all 0.3s ease;
          `;
          document.body.appendChild(highlight);
          
          // Pulse effect
          setTimeout(() => {
            highlight.style.transform = 'scale(1.05)';
          }, 100);
          
          // Remove after 3 seconds
          setTimeout(() => {
            highlight.style.opacity = '0';
            setTimeout(() => highlight.remove(), 300);
          }, 3000);
        }, 800); // Wait 800ms for smooth scroll to complete
        
        sendResponse({ status: 'highlighted' });
      } else {
        sendResponse({ status: 'not_found' });
      }
    } catch (err) {
      console.error('Error highlighting element:', err);
      sendResponse({ status: 'error' });
    }
    return true;
  }

  if (request.action === 'CONTROL_ANIMATION') {
    // Relay animation control to page context
    window.postMessage({
      type: 'CONTROL_ANIMATION',
      animationId: request.animationId,
      action: request.animationAction,
      value: request.value
    }, '*');
    sendResponse({ status: 'ok' });
  }

  if (request.action === 'GET_PAGE_DATA') {
    const fonts = extractFonts();
    const colors = extractColors();
    const spacing = detectSpacingSystem();
    const technologies = extractTechnologies();
    const assets = extractAssets();
    
    // Request scroll animations from page context (can access window.ScrollTrigger)
    window.postMessage({ type: 'DETECT_SCROLL_ANIMATIONS' }, '*');
    
    // Wait for response from page context, with fallback to content script detection
    setTimeout(() => {
      let scrollAnimations = pageContextAnimations.length > 0 
        ? pageContextAnimations 
        : detectAllScrollAnimations();
      
      // If still no animations, retry after delays
      if (scrollAnimations.length === 0) {
        console.log('⏳ No animations found initially, will retry after 2s and 4s...');
        
        // First retry after 2 seconds
        setTimeout(() => {
          window.postMessage({ type: 'DETECT_SCROLL_ANIMATIONS' }, '*');
          
          setTimeout(() => {
            const retryAnimations = pageContextAnimations.length > 0
              ? pageContextAnimations
              : detectAllScrollAnimations();
              
            if (retryAnimations.length > 0) {
              console.log('✅ Found animations after 2s delay!');
              chrome.runtime.sendMessage({
                action: 'SCROLL_ANIMATIONS_UPDATED',
                scrollAnimations: retryAnimations
              }).catch(() => {});
            } else {
              // Second retry after 4 seconds total
              setTimeout(() => {
                window.postMessage({ type: 'DETECT_SCROLL_ANIMATIONS' }, '*');
                
                setTimeout(() => {
                  const finalRetry = pageContextAnimations.length > 0
                    ? pageContextAnimations
                    : detectAllScrollAnimations();
                    
                  if (finalRetry.length > 0) {
                    console.log('✅ Found animations after 4s delay!');
                    chrome.runtime.sendMessage({
                      action: 'SCROLL_ANIMATIONS_UPDATED',
                      scrollAnimations: finalRetry
                    }).catch(() => {});
                  } else {
                    console.log('ℹ️ No scroll animations detected after multiple retries');
                  }
                }, 200);
              }, 2000);
            }
          }, 200);
        }, 2000);
      }
      
      sendResponse({
        fonts,
        colors,
        spacing,
        technologies,
        assets,
        scrollAnimations,
        meta: {
          title: document.title,
          url: window.location.href,
          description: document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
        }
      });
    }, 500); // Initial wait for page context to respond
    
    return true; // Keep channel open for async response
  }
  
  return true; // Keep message channel open for async response
});

console.log('Design Inspector Content Script Ready');
