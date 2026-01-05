import { Inspector } from './inspector';
import { extractFonts } from './extractors/fontExtractor';
import { extractColors } from './extractors/colorExtractor';
import { detectSpacingSystem } from './extractors/spacingExtractor';
import { extractAssets } from './extractors/assetExtractor';
import { detectAllScrollAnimations } from './extractors/scrollAnimationDetector';
import { detectRedFlags } from './extractors/redFlagDetector';
import { extractHTMLStructure } from './extractors/htmlExtractor';
import { captureSiteCloneData } from './extractors/siteCloneExtractor';
import { FlowRecorder } from './extractors/flowRecorder';

// Check if already injected
if (!(window as any).di_contentScriptInjected) {
  (window as any).di_contentScriptInjected = true;

  const inspector = new Inspector();

  // Inject page context script to access window variables
  function injectPageContextScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('pageContext.js');
    script.onload = () => {
      // console.log('✅ Page context script injected');
      script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Initialize Flow Recorder (checks for active recording session)
  FlowRecorder.init();

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
      // console.log(`📨 Received ${pageContextAnimations.length} animations from page context`);
    }
  });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    if (request.action === 'TOGGLE_INSPECTOR') {
      if (request.payload) {
        inspector.enable(request.highlightColor);
      } else {
        inspector.disable();
      }
      sendResponse({ status: 'ok' });
    }

    if (request.action === 'UPDATE_HIGHLIGHT_COLOR') {
      inspector.setHighlightColor(request.highlightColor);
      sendResponse({ status: 'ok' });
    }

    // Color Picker using native EyeDropper API
    if (request.action === 'PICK_COLOR') {
      (async () => {
        try {
          // Check if EyeDropper API is available
          if (!('EyeDropper' in window)) {
            sendResponse({ status: 'error', error: 'EyeDropper API not supported in this browser' });
            return;
          }

          const eyeDropper = new (window as any).EyeDropper();
          const result = await eyeDropper.open();
          
          // Convert sRGBHex to different formats
          const hex = result.sRGBHex;
          
          // Extract RGB values
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          const rgb = `rgb(${r}, ${g}, ${b})`;
          
          // Convert to HSL
          const rNorm = r / 255;
          const gNorm = g / 255;
          const bNorm = b / 255;
          const cmax = Math.max(rNorm, gNorm, bNorm);
          const cmin = Math.min(rNorm, gNorm, bNorm);
          const delta = cmax - cmin;
          
          let h = 0;
          if (delta !== 0) {
            if (cmax === rNorm) h = ((gNorm - bNorm) / delta) % 6;
            else if (cmax === gNorm) h = (bNorm - rNorm) / delta + 2;
            else h = (rNorm - gNorm) / delta + 4;
          }
          h = Math.round(h * 60);
          if (h < 0) h += 360;
          
          const l = (cmax + cmin) / 2;
          const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
          const hsl = `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
          
          sendResponse({ 
            status: 'ok', 
            color: { hex, rgb, hsl }
          });
        } catch (err: any) {
          // User cancelled or error occurred
          if (err.name === 'AbortError') {
            sendResponse({ status: 'cancelled' });
          } else {
            sendResponse({ status: 'error', error: err.message });
          }
        }
      })();
      return true; // Keep message channel open for async response
    }


    if (request.action === 'HIGHLIGHT_ELEMENT') {
      // Highlight the element on the page
      try {
        let element: Element | null = null;
        
        // Try multiple strategies to find the element
        try {
          // Strategy 1: Direct querySelector
          element = document.querySelector(request.selector);
        } catch (e) {
          console.warn('Direct querySelector failed, trying alternatives:', e);
        }
        
        // Strategy 2: If selector is an ID, try getElementById
        if (!element && request.selector.startsWith('#')) {
          const id = request.selector.slice(1);
          element = document.getElementById(id);
        }
        
        // Strategy 3: If selector is a class, try getElementsByClassName
        if (!element && request.selector.startsWith('.')) {
          const className = request.selector.slice(1).split('.')[0];
          const elements = document.getElementsByClassName(className);
          if (elements.length > 0) {
            element = elements[0];
          }
        }
        
        // Strategy 4: Try as tag name
        if (!element) {
          const elements = document.getElementsByTagName(request.selector);
          if (elements.length > 0) {
            element = elements[0];
          }
        }
        
        if (element) {
          // Show immediate highlight before scroll for instant feedback
          const rect = element.getBoundingClientRect();
          const instantHighlight = document.createElement('div');
          instantHighlight.style.cssText = `
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
          document.body.appendChild(instantHighlight);
          
          // Scroll element into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Update highlight position after scroll completes (reduced from 800ms to 300ms)
          setTimeout(() => {
            if (!element) return;
            
            // Remove old highlight
            instantHighlight.remove();
            
            // Recalculate position after scroll
            const newRect = element.getBoundingClientRect();
            const highlight = document.createElement('div');
            highlight.style.cssText = `
              position: fixed;
              top: ${newRect.top}px;
              left: ${newRect.left}px;
              width: ${newRect.width}px;
              height: ${newRect.height}px;
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
          }, 300); // Reduced from 800ms to 300ms
          
          sendResponse({ status: 'highlighted', selector: request.selector });
        } else {
          console.warn('Element not found with any strategy:', request.selector);
          sendResponse({ status: 'not_found', selector: request.selector });
        }
      } catch (err) {
        console.error('Error highlighting element:', err);
        sendResponse({ status: 'error', error: String(err) });
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

    if (request.action === 'HIGHLIGHT_FONT') {
      // Highlight all elements using a specific font family
      try {
        const targetFont = request.fontFamily.toLowerCase();
        const elements = document.querySelectorAll('*');
        const matchingElements: HTMLElement[] = [];

        // Find all elements using this font
        elements.forEach((el) => {
          const computed = window.getComputedStyle(el as HTMLElement);
          const fontFamily = computed.fontFamily.toLowerCase();

          // Check if the target font is in the font-family stack
          if (fontFamily.includes(targetFont.toLowerCase())) {
            matchingElements.push(el as HTMLElement);
          }
        });

        // console.log(`Found ${matchingElements.length} elements using font "${request.fontFamily}"`);

        if (matchingElements.length === 0) {
          sendResponse({ status: 'not_found', count: 0 });
          return true;
        }

        // Create highlight overlays for all matching elements
        const highlights: HTMLElement[] = [];

        matchingElements.forEach((el) => {
          const rect = el.getBoundingClientRect();

          // Skip elements that are too small or invisible
          if (rect.width < 5 || rect.height < 5) return;

          const highlight = document.createElement('div');
          highlight.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            border: 2px solid #a855f7;
            background: rgba(168, 85, 247, 0.1);
            pointer-events: none;
            z-index: 999998;
            box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2);
            transition: all 0.3s ease;
            animation: fontHighlightPulse 2s ease-in-out infinite;
          `;

          document.body.appendChild(highlight);
          highlights.push(highlight);
        });

        // Add CSS animation if not already present
        if (!document.getElementById('font-highlight-animation')) {
          const style = document.createElement('style');
          style.id = 'font-highlight-animation';
          style.textContent = `
            @keyframes fontHighlightPulse {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
          `;
          document.head.appendChild(style);
        }

        // Scroll to first element
        if (matchingElements[0]) {
          matchingElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Remove highlights after 5 seconds
        setTimeout(() => {
          highlights.forEach(h => {
            h.style.opacity = '0';
            setTimeout(() => h.remove(), 300);
          });
        }, 5000);

        sendResponse({ status: 'highlighted', count: matchingElements.length });
      } catch (err) {
        console.error('Error highlighting font:', err);
        sendResponse({ status: 'error', error: String(err) });
      }
      return true;
    }

    // Lazy load Red Flags
    if (request.action === 'GET_RED_FLAGS') {
      // console.log('🚩 Loading red flags on demand...');
      const redFlags = detectRedFlags();
      sendResponse({ redFlags });
      return true;
    }

    if (request.action === 'GET_PAGE_DATA') {
      const fonts = extractFonts();
      const colors = extractColors();
      const spacing = detectSpacingSystem();
      const assets = extractAssets();
      const htmlStructure = extractHTMLStructure();
      const siteCloneData = captureSiteCloneData();
      
      // Request scroll animations from page context (can access window.ScrollTrigger)
      window.postMessage({ type: 'DETECT_SCROLL_ANIMATIONS' }, '*');
      
      // Wait for response from page context, with fallback to content script detection
      setTimeout(() => {
        let scrollAnimations = pageContextAnimations.length > 0 
          ? pageContextAnimations 
          : detectAllScrollAnimations();
        
        // If still no animations, retry after delays
        if (scrollAnimations.length === 0) {
          // console.log('⏳ No animations found initially, will retry after 2s and 4s...');
          
          // First retry after 2 seconds
          setTimeout(() => {
            window.postMessage({ type: 'DETECT_SCROLL_ANIMATIONS' }, '*');
            
            setTimeout(() => {
              const retryAnimations = pageContextAnimations.length > 0
                ? pageContextAnimations
                : detectAllScrollAnimations();
                
              if (retryAnimations.length > 0) {
                // console.log('✅ Found animations after 2s delay!');
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
                      // console.log('✅ Found animations after 4s delay!');
                      chrome.runtime.sendMessage({
                        action: 'SCROLL_ANIMATIONS_UPDATED',
                        scrollAnimations: finalRetry
                      }).catch(() => {});
                    } else {
                      // console.log('ℹ️ No scroll animations detected after multiple retries');
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
          assets,
          scrollAnimations,
          redFlags: [], // Lazy loaded
          htmlStructure,
          siteCloneData,
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

  // console.log('Design Inspector Content Script Ready');
}
