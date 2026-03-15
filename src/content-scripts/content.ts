import { Inspector } from './inspector';
import { extractFonts } from './extractors/fontExtractor';
import { extractColors } from './extractors/colorExtractor';
import { extractGradients } from './extractors/gradientExtractor';
import { detectSpacingSystem } from './extractors/spacingExtractor';
import { extractAssets } from './extractors/assetExtractor';
import { detectAllScrollAnimations } from './extractors/scrollAnimationDetector';
import { detectRedFlags } from './extractors/redFlagDetector';
import { extractHTMLStructure } from './extractors/htmlExtractor';
import { captureSiteCloneData } from './extractors/siteCloneExtractor';
import { FlowRecorder } from './extractors/flowRecorder';
import { ThemeRuntime } from './themeRuntime';
import { ThemeElementUpdateTarget, ThemeLocateRequest, normalizeHex } from '../utils/themeStudio';
import { claimRuntimeOwnership, isCurrentRuntimeOwner, safeRuntimeGetURL, safeRuntimeSendMessage } from './runtime';

if (!isCurrentRuntimeOwner()) {
  claimRuntimeOwnership();

  const inspector = new Inspector();
  const themeRuntime = new ThemeRuntime();
  let lastExtractedColors: ReturnType<typeof extractColors> = [];
  let lastExtractedGradients: ReturnType<typeof extractGradients> = [];
  const THEME_SAMPLE_LIMIT = 4;
  const EXACT_TARGET_ATTR = 'data-di-theme-exact-target';
  const themeResolvedSelectorCache = new Map<string, string[]>();
  let themeHighlightOverlays: HTMLElement[] = [];
  let themeHighlightTimers: number[] = [];
  let themeExactTargetSequence = 0;

  const getThemeHighlightColor = () => localStorage.getItem('di-highlightColor') || '#f97316';
  const selectorForElement = (element: Element) => {
    const htmlElement = element as HTMLElement;
    const classes = Array.from(htmlElement.classList || []).slice(0, 3);
    return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${classes.length ? `.${classes.join('.')}` : ''}`;
  };
  const normalizeComputedColor = (value: string): string | null => {
    if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || value === 'inherit') return null;
    if (value.startsWith('#')) return normalizeHex(value);

    const channels = value.match(/\d+(\.\d+)?/g);
    if (!channels || channels.length < 3) return null;

    const [r, g, b] = channels.slice(0, 3).map((part) => Math.max(0, Math.min(255, Math.round(Number(part)))));
    return normalizeHex(
      `#${[r, g, b]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')}`
    );
  };
  const isVisibleElement = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;
    const computed = window.getComputedStyle(element);
    return computed.display !== 'none' && computed.visibility !== 'hidden' && computed.opacity !== '0';
  };
  const scoreElement = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const visibleX = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
    const visibleY = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
    const visibleArea = visibleX * visibleY;
    const area = rect.width * rect.height;
    const centerDistance = Math.abs(rect.top + rect.height / 2 - viewportHeight / 2);
    return visibleArea * 2 + area - centerDistance;
  };
  const clearThemeHighlights = () => {
    themeHighlightTimers.forEach((timer) => window.clearTimeout(timer));
    themeHighlightTimers = [];
    themeHighlightOverlays.forEach((overlay) => overlay.remove());
    themeHighlightOverlays = [];
  };
  const queryElementsForSelector = (selector: string) => {
    const matches: HTMLElement[] = [];

    try {
      document.querySelectorAll(selector).forEach((node) => {
        if (node instanceof HTMLElement) matches.push(node);
      });
    } catch {
      if (selector.startsWith('#')) {
        const element = document.getElementById(selector.slice(1));
        if (element instanceof HTMLElement) matches.push(element);
      } else if (selector.startsWith('.')) {
        Array.from(document.getElementsByClassName(selector.slice(1).split('.')[0])).forEach((node) => {
          if (node instanceof HTMLElement) matches.push(node);
        });
      } else {
        Array.from(document.getElementsByTagName(selector)).forEach((node) => {
          if (node instanceof HTMLElement) matches.push(node);
        });
      }
    }

    return matches;
  };
  const ensureThemeExactTargetId = (element: HTMLElement) => {
    const existing = element.getAttribute(EXACT_TARGET_ATTR);
    if (existing) return existing;
    const nextId = `exact-${++themeExactTargetSequence}`;
    element.setAttribute(EXACT_TARGET_ATTR, nextId);
    return nextId;
  };
  const getElementMatchColor = (element: HTMLElement, property: ThemeLocateRequest['matchProperty']) => {
    const computed = window.getComputedStyle(element);
    if (property === 'color') return normalizeComputedColor(computed.color);
    if (property === 'background-color') return normalizeComputedColor(computed.backgroundColor);
    if (property === 'border-color') return normalizeComputedColor(computed.borderTopColor);

    return (
      normalizeComputedColor(computed.color) ||
      normalizeComputedColor(computed.backgroundColor) ||
      normalizeComputedColor(computed.borderTopColor)
    );
  };
  const findElementsByThemeColor = (matchColor: string, property: ThemeLocateRequest['matchProperty']) => {
    const normalizedMatch = normalizeHex(matchColor);
    const elements: HTMLElement[] = [];

    document.querySelectorAll<HTMLElement>('body *').forEach((element) => {
      if (!isVisibleElement(element)) return;

      if (property === 'all') {
        const computed = window.getComputedStyle(element);
        const candidateColors = [
          normalizeComputedColor(computed.color),
          normalizeComputedColor(computed.backgroundColor),
          normalizeComputedColor(computed.borderTopColor),
        ];
        if (candidateColors.some((candidate) => candidate && normalizeHex(candidate) === normalizedMatch)) {
          elements.push(element);
        }
        return;
      }

      const candidate = getElementMatchColor(element, property);
      if (candidate && normalizeHex(candidate) === normalizedMatch) {
        elements.push(element);
      }
    });

    return elements.sort((left, right) => scoreElement(right) - scoreElement(left));
  };
  const resolveThemeLocateElements = (request: ThemeLocateRequest) => {
    const cacheKey = `${request.itemType}:${request.itemId}:${request.scope}:${request.matchColor || ''}:${request.matchProperty || ''}:${request.selectors.join('|')}`;
    const selectorCandidates = [
      ...(themeResolvedSelectorCache.get(cacheKey) || []),
      ...request.selectors,
    ].filter(Boolean);
    const uniqueSelectors = Array.from(new Set(selectorCandidates));
    const limit =
      request.scope === 'all'
        ? Number.MAX_SAFE_INTEGER
        : request.scope === 'samples'
          ? THEME_SAMPLE_LIMIT
          : 1;

    const seen = new Set<HTMLElement>();
    const elements: HTMLElement[] = [];

    const selectorsToQuery = request.scope === 'all' ? uniqueSelectors : uniqueSelectors.slice(0, 18);
    for (const selector of selectorsToQuery) {
      const candidates = queryElementsForSelector(selector)
        .filter(isVisibleElement)
        .sort((left, right) => scoreElement(right) - scoreElement(left));
      const takeCount =
        request.scope === 'representative' ? 1 : request.scope === 'samples' ? 2 : candidates.length;

      for (const element of candidates.slice(0, takeCount)) {
        if (seen.has(element)) continue;
        seen.add(element);
        elements.push(element);
        if (elements.length >= limit) break;
      }

      if (elements.length >= limit) break;
    }

    if (request.matchColor) {
      const fallbackLimit = request.scope === 'representative' ? 1 : limit - elements.length;
      for (const element of findElementsByThemeColor(request.matchColor, request.matchProperty || 'all')) {
        if (fallbackLimit <= 0 || elements.length >= limit) break;
        if (seen.has(element)) continue;
        seen.add(element);
        elements.push(element);
      }
    }

    themeResolvedSelectorCache.set(
      cacheKey,
      elements.map((element) => selectorForElement(element)).slice(0, 24)
    );

    return {
      cacheKey,
      elements,
      selectors: elements.map((element) => selectorForElement(element)),
    };
  };
  const createThemeHighlightOverlay = (element: HTMLElement, primary: boolean) => {
    const rect = element.getBoundingClientRect();
    const color = getThemeHighlightColor();
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: ${primary ? 3 : 2}px solid ${color};
      background: rgba(249, 115, 22, ${primary ? '0.12' : '0.07'});
      pointer-events: none;
      z-index: ${primary ? 999999 : 999998};
      box-shadow: 0 0 0 ${primary ? 4 : 2}px rgba(249, 115, 22, ${primary ? '0.24' : '0.14'});
      border-radius: 10px;
      transition: all 0.2s ease;
    `;
    document.body.appendChild(overlay);
    themeHighlightOverlays.push(overlay);
    return overlay;
  };
  const highlightThemeElements = (elements: HTMLElement[], scrollIntoView = false) => {
    clearThemeHighlights();
    if (!elements.length) return;

    const render = () => {
      clearThemeHighlights();
      elements.forEach((element, index) => {
        const overlay = createThemeHighlightOverlay(element, index === 0);
        if (index === 0) {
          const pulseTimer = window.setTimeout(() => {
            overlay.style.transform = 'scale(1.02)';
          }, 80);
          themeHighlightTimers.push(pulseTimer);
        }
      });

      const cleanupTimer = window.setTimeout(() => {
        themeHighlightOverlays.forEach((overlay) => {
          overlay.style.opacity = '0';
        });
        const removalTimer = window.setTimeout(() => clearThemeHighlights(), 220);
        themeHighlightTimers.push(removalTimer);
      }, scrollIntoView ? 3400 : 1800);

      themeHighlightTimers.push(cleanupTimer);
    };

    if (scrollIntoView && elements[0]) {
      elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      const delayedRender = window.setTimeout(render, 520);
      themeHighlightTimers.push(delayedRender);
      return;
    }

    render();
  };
  const summarizeThemeElement = (element: HTMLElement): ThemeElementUpdateTarget => {
    const computed = window.getComputedStyle(element);
    return {
      selector: selectorForElement(element),
      nodeId: ensureThemeExactTargetId(element),
      colors: {
        color: normalizeComputedColor(computed.color),
        backgroundColor: normalizeComputedColor(computed.backgroundColor),
        borderColor: normalizeComputedColor(computed.borderTopColor),
      },
      backgroundImage: computed.backgroundImage !== 'none' ? computed.backgroundImage : null,
    };
  };

  // Inject page context script to access window variables
  function injectPageContextScript() {
    const scriptUrl = safeRuntimeGetURL('pageContext.js');
    if (!scriptUrl) return;

    const script = document.createElement('script');
    script.src = scriptUrl;
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
    if (!isCurrentRuntimeOwner()) {
      sendResponse({ status: 'stale-context' });
      return true;
    }

    if (request.action === 'TOGGLE_INSPECTOR') {
      if (request.payload) {
        inspector.enable(request.highlightColor, request.sidebarMode);
      } else {
        inspector.disable();
      }
      sendResponse({ status: 'ok' });
    }

    if (request.action === 'UPDATE_HIGHLIGHT_COLOR') {
      inspector.setHighlightColor(request.highlightColor);
      sendResponse({ status: 'ok' });
    }

    if (request.action === 'INIT_THEME_SESSION') {
      if (!lastExtractedColors.length) {
        lastExtractedColors = extractColors();
      }
      if (!lastExtractedGradients.length) {
        lastExtractedGradients = extractGradients();
      }

      const session = themeRuntime.initSession(lastExtractedColors, lastExtractedGradients, document.title, window.location.href);
      sendResponse({ status: 'ok', session });
      return true;
    }

    if (request.action === 'APPLY_THEME_PRESET') {
      const session = themeRuntime.applyPreset(request.semanticSlots || []);
      sendResponse({ status: 'ok', session });
      return true;
    }

    if (request.action === 'APPLY_THEME_PATCH') {
      const session = themeRuntime.applyPatch({
        semanticSlots: request.semanticSlots,
        exactReplacements: request.exactReplacements,
        gradientReplacements: request.gradientReplacements,
        applyMode: request.applyMode,
        fontPresetId: request.fontPresetId,
        fontFamily: request.fontFamily,
        fontStylesheetUrl: request.fontStylesheetUrl,
        isPreviewActive: request.isPreviewActive,
      });
      sendResponse({ status: 'ok', session });
      return true;
    }

    if (request.action === 'UNDO_THEME_PATCH') {
      const session = themeRuntime.undoPatch({
        semanticSlots: request.semanticSlots || [],
        exactReplacements: request.exactReplacements || [],
        gradientReplacements: request.gradientReplacements || [],
        applyMode: request.applyMode || 'hybrid',
        fontPresetId: request.fontPresetId || 'original',
        fontFamily: request.fontFamily || '',
        fontStylesheetUrl: request.fontStylesheetUrl || '',
      });
      sendResponse({ status: 'ok', session });
      return true;
    }

    if (request.action === 'REDO_THEME_PATCH') {
      const session = themeRuntime.redoPatch({
        semanticSlots: request.semanticSlots || [],
        exactReplacements: request.exactReplacements || [],
        gradientReplacements: request.gradientReplacements || [],
        applyMode: request.applyMode || 'hybrid',
        fontPresetId: request.fontPresetId || 'original',
        fontFamily: request.fontFamily || '',
        fontStylesheetUrl: request.fontStylesheetUrl || '',
      });
      sendResponse({ status: 'ok', session });
      return true;
    }

    if (request.action === 'RESET_THEME_SESSION') {
      const session = themeRuntime.resetSession();
      sendResponse({ status: 'ok', session });
      return true;
    }

    if (request.action === 'EXPORT_THEME_SESSION') {
      const payload = themeRuntime.exportSession();
      sendResponse({ status: 'ok', payload });
      return true;
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


    if (request.action === 'THEME_CLEAR_HIGHLIGHTS') {
      clearThemeHighlights();
      sendResponse({ status: 'ok' });
      return true;
    }

    if (request.action === 'THEME_HIGHLIGHT_MATCHES' || request.action === 'THEME_LOCATE_MATCH') {
      try {
        const locateRequest = request.payload as ThemeLocateRequest;
        const { elements, selectors } = resolveThemeLocateElements(locateRequest);
        if (!elements.length) {
          sendResponse({ status: 'not_found', count: 0, selectors: [] });
          return true;
        }

        highlightThemeElements(elements, request.action === 'THEME_LOCATE_MATCH' || locateRequest.scrollIntoView === true);
        sendResponse({
          status: 'ok',
          count: elements.length,
          selectors,
          primarySelector: selectors[0] || null,
        });
      } catch (error) {
        console.error('Error highlighting theme matches:', error);
        sendResponse({ status: 'error', error: String(error) });
      }
      return true;
    }

    if (request.action === 'THEME_START_ELEMENT_UPDATE') {
      try {
        const locateRequest = request.payload as ThemeLocateRequest;
        const requestWithRepresentativeScope: ThemeLocateRequest = {
          ...locateRequest,
          scope: 'representative',
          scrollIntoView: true,
        };
        const { elements, selectors } = resolveThemeLocateElements(requestWithRepresentativeScope);
        if (!elements.length) {
          sendResponse({ status: 'not_found', count: 0, selectors: [] });
          return true;
        }

        highlightThemeElements(elements.slice(0, 1), true);
        sendResponse({
          status: 'ok',
          count: 1,
          selectors,
          primarySelector: selectors[0] || null,
          target: summarizeThemeElement(elements[0]),
        });
      } catch (error) {
        console.error('Error starting theme element update:', error);
        sendResponse({ status: 'error', error: String(error) });
      }
      return true;
    }

    if (request.action === 'HIGHLIGHT_ELEMENT') {
      // Highlight the element on the page
      try {
        const element = queryElementsForSelector(request.selector).find(isVisibleElement) || null;

        if (element) {
          highlightThemeElements([element], true);
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
      const gradients = extractGradients();
      lastExtractedColors = colors;
      lastExtractedGradients = gradients;
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
                safeRuntimeSendMessage({
                  action: 'SCROLL_ANIMATIONS_UPDATED',
                  scrollAnimations: retryAnimations
                });
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
                      safeRuntimeSendMessage({
                        action: 'SCROLL_ANIMATIONS_UPDATED',
                        scrollAnimations: finalRetry
                      });
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
