/**
 * Comprehensive Site Cloner Data Extractor
 * Captures EVERYTHING needed for 90%+ accurate site recreation
 */

export interface SiteCloneData {
  // Metadata
  metadata: {
    title: string;
    viewport: string;
    url: string;
    favicon: string;
    charset: string;
  };
  
  // Structure
  html: string;
  structure: string;
  components: string;
  
  // Styling
  css: string;
  criticalCSS: string;
  computedStyles: string;
  colors: { color: string; count: number }[];
  fonts: { family: string; weights: string[] }[];
  spacing: string[];
  layoutType: string;
  containerWidth: string;
  gridSystem: string;
  
  // Effects
  shadows: string[];
  blurs: string[];
  transforms: string;
  filters: string;
  animations: string;
  
  // Assets
  images: { src: string; alt: string; width: number; height: number }[];
  backgroundImages: string[];
  videos: string[];
  svgs: { desc: string; code: string }[];
  
  // External Resources
  externalFonts: string[];
  externalCSS: string[];
  scripts: string[];
  
  // Interactive
  interactive: string;
  forms: string;
  jsFeatures: string;
  
  // Responsive
  breakpoints: string;
  
  // Implementation
  implementationNotes: string;
}

/**
 * Get page metadata
 */
export const getMetadata = () => ({
  title: document.title,
  viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || 'not set',
  url: window.location.href,
  favicon: document.querySelector('link[rel*="icon"]')?.getAttribute('href') || 'none',
  charset: document.characterSet
});

/**
 * Extract all CSS from stylesheets
 */
export const extractCSS = (): string => {
  let cssText = '';
  for (const sheet of document.styleSheets) {
    try {
      if (sheet.cssRules) {
        for (const rule of sheet.cssRules) {
          cssText += rule.cssText + '\n';
        }
      }
    } catch (e) {
      // Cross-origin stylesheet - skip
    }
  }
  // Return all CSS without truncation
  return cssText;
};

/**
 * Extract colors with frequency count
 */
export const extractColorsWithFrequency = (): { color: string; count: number }[] => {
  const colorMap: Record<string, number> = {};
  
  document.querySelectorAll('*').forEach(el => {
    const computed = window.getComputedStyle(el);
    [computed.color, computed.backgroundColor, computed.borderColor].forEach(color => {
      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        colorMap[color] = (colorMap[color] || 0) + 1;
      }
    });
  });
  
  return Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([color, count]) => ({ color, count }));
};

/**
 * Extract fonts with weights
 */
export const extractFontsWithWeights = (): { family: string; weights: string[] }[] => {
  const fontMap: Record<string, Set<string>> = {};
  
  document.querySelectorAll('*').forEach(el => {
    const computed = window.getComputedStyle(el);
    const family = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    const weight = computed.fontWeight;
    if (!fontMap[family]) fontMap[family] = new Set();
    fontMap[family].add(weight);
  });
  
  return Object.entries(fontMap).map(([family, weights]) => ({
    family,
    weights: Array.from(weights).sort()
  }));
};

/**
 * Detect spacing scale
 */
export const detectSpacingScale = (): string[] => {
  const spacings = new Set<number>();
  
  document.querySelectorAll('*').forEach(el => {
    const computed = window.getComputedStyle(el);
    [computed.margin, computed.padding, computed.gap].forEach(val => {
      if (val) {
        val.split(' ').forEach(v => {
          const num = parseInt(v);
          if (num > 0 && num < 200) spacings.add(num);
        });
      }
    });
  });
  
  return Array.from(spacings).sort((a, b) => a - b).map(s => `${s}px`);
};

/**
 * Analyze page structure with hierarchy
 */
export const analyzeStructure = (): string => {
  const sections = document.querySelectorAll('header, nav, main, section, aside, footer, article');
  let structure = '';
  
  sections.forEach((section, i) => {
    const tag = section.tagName.toLowerCase();
    const id = section.id ? `#${section.id}` : '';
    const classes = section.className ? `.${section.className.split(' ').slice(0, 3).join('.')}` : '';
    const children = section.children.length;
    structure += `${i + 1}. <${tag}${id}${classes}> - ${children} children\n`;
  });
  
  return structure || 'No semantic structure detected';
};

/**
 * Detect layout type, container, and grid system
 */
export const detectLayoutSystem = () => {
  const main = document.querySelector('main') || document.body;
  const computed = window.getComputedStyle(main);
  
  let type = 'Traditional Box Model';
  if (computed.display.includes('grid')) type = 'CSS Grid';
  else if (computed.display.includes('flex')) type = 'Flexbox';
  
  // Container width
  const containers = document.querySelectorAll('[class*="container"]');
  const containerWidth = containers.length > 0 ? window.getComputedStyle(containers[0]).maxWidth : 'none';
  
  // Grid system
  let gridSystem = 'Custom';
  const gridEls = document.querySelectorAll('[class*="col"], [class*="grid"]');
  if (gridEls.length > 0) {
    const grid = window.getComputedStyle(gridEls[0]);
    if (grid.gridTemplateColumns) gridSystem = grid.gridTemplateColumns;
  }
  
  return { type, containerWidth, gridSystem };
};

/**
 * Extract animations and transitions
 */
export const extractAnimations = (): string => {
  const animations = new Set<string>();
  
  // Get keyframes from stylesheets
  for (const sheet of document.styleSheets) {
    try {
      if (sheet.cssRules) {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSKeyframesRule) {
            animations.add(`@keyframes ${rule.name}`);
          }
        }
      }
    } catch (e) {}
  }
  
  // Get transitions and animations from elements
  document.querySelectorAll('*').forEach(el => {
    const computed = window.getComputedStyle(el);
    if (computed.transition !== 'all 0s ease 0s' && computed.transition !== 'none') {
      animations.add(`transition: ${computed.transition.slice(0, 100)}`);
    }
    if (computed.animationName && computed.animationName !== 'none') {
      animations.add(`animation: ${computed.animationName} ${computed.animationDuration}`);
    }
  });
  
  return Array.from(animations).slice(0, 15).join('\n') || 'No animations detected';
};

/**
 * Extract images with dimensions
 */
export const extractImagesDetailed = () => {
  const images: { src: string; alt: string; width: number; height: number }[] = [];
  
  document.querySelectorAll('img').forEach(img => {
    images.push({
      src: img.src.length > 100 ? img.src.slice(0, 100) + '...' : img.src,
      alt: img.alt || 'No alt',
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height
    });
  });
  
  return images.slice(0, 30);
};

/**
 * Extract background images
 */
export const extractBackgroundImages = (): string[] => {
  const bgImages: string[] = [];
  
  document.querySelectorAll('*').forEach(el => {
    const bg = window.getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none' && bg.includes('url')) {
      const match = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (match && match[1] && !bgImages.includes(match[1])) {
        bgImages.push(match[1].slice(0, 100));
      }
    }
  });
  
  return bgImages.slice(0, 20);
};

/**
 * Extract videos
 */
export const extractVideos = (): string[] => {
  const videos: string[] = [];
  document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').forEach(v => {
    videos.push((v as HTMLVideoElement | HTMLIFrameElement).src || 'embedded video');
  });
  return videos;
};

/**
 * Extract SVGs
 */
export const extractSVGs = (): { desc: string; code: string }[] => {
  const svgs: { desc: string; code: string }[] = [];
  document.querySelectorAll('svg').forEach((svg, i) => {
    svgs.push({
      desc: svg.getAttribute('aria-label') || `SVG ${i + 1}`,
      code: svg.outerHTML.slice(0, 200)
    });
  });
  return svgs.slice(0, 10);
};

/**
 * Get external resources
 */
export const getExternalResources = () => {
  const fonts: string[] = [];
  const css: string[] = [];
  const scripts: string[] = [];
  
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    css.push((link as HTMLLinkElement).href);
  });
  
  document.querySelectorAll('link[href*="fonts.googleapis"], link[href*="fonts.google"]').forEach(link => {
    fonts.push((link as HTMLLinkElement).href);
  });
  
  document.querySelectorAll('script[src]').forEach(script => {
    scripts.push((script as HTMLScriptElement).src);
  });
  
  return { fonts, css: css.slice(0, 10), scripts: scripts.slice(0, 10) };
};

/**
 * Detect responsive breakpoints
 */
export const detectBreakpoints = (): string => {
  const breakpoints = new Set<string>();
  
  for (const sheet of document.styleSheets) {
    try {
      if (sheet.cssRules) {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSMediaRule) {
            breakpoints.add(rule.media.mediaText);
          }
        }
      }
    } catch (e) {}
  }
  
  return Array.from(breakpoints).slice(0, 10).join('\n') || 'No media queries detected';
};

/**
 * Identify interactive elements
 */
export const identifyInteractive = (): string => {
  const interactive: string[] = [];
  
  document.querySelectorAll('button').forEach(btn => {
    interactive.push(`BUTTON: "${btn.textContent?.trim().slice(0, 30)}"`);
  });
  
  document.querySelectorAll('a[href]').forEach(link => {
    const text = (link as HTMLAnchorElement).textContent?.trim().slice(0, 30);
    if (text) interactive.push(`LINK: "${text}"`);
  });
  
  document.querySelectorAll('input, select, textarea').forEach(input => {
    const inp = input as HTMLInputElement;
    interactive.push(`INPUT: ${inp.type || 'text'} - ${inp.placeholder || inp.name || 'field'}`);
  });
  
  return interactive.slice(0, 25).join('\n') || 'No interactive elements';
};

/**
 * Identify components
 */
export const identifyComponents = (): string => {
  const components: string[] = [];
  const patterns = [
    { selector: 'nav', name: 'Navigation' },
    { selector: '[class*="hero"]', name: 'Hero Section' },
    { selector: '[class*="card"]', name: 'Card' },
    { selector: '[class*="modal"]', name: 'Modal' },
    { selector: '[class*="carousel"], [class*="slider"]', name: 'Carousel' },
    { selector: 'form', name: 'Form' },
    { selector: '[class*="footer"]', name: 'Footer' },
    { selector: '[class*="sidebar"]', name: 'Sidebar' }
  ];
  
  patterns.forEach(({ selector, name }) => {
    const count = document.querySelectorAll(selector).length;
    if (count > 0) components.push(`${name}: ${count}x`);
  });
  
  return components.join(', ') || 'No standard components';
};

/**
 * Get critical CSS for key elements
 */
export const getCriticalCSS = (): string => {
  const selectors = ['body', 'header', 'nav', 'main', 'footer', 'h1', 'h2', 'p', 'a', 'button'];
  let css = '';
  
  selectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) {
      const c = window.getComputedStyle(el);
      css += `${sel} { display: ${c.display}; background: ${c.background.slice(0, 50)}; color: ${c.color}; font: ${c.fontSize} ${c.fontFamily.split(',')[0]}; padding: ${c.padding}; margin: ${c.margin}; }\n`;
    }
  });
  
  return css;
};

/**
 * Get computed styles for key elements - ALL properties
 */
export const getComputedStylesDetailed = (): string => {
  const selectors = ['body', 'header', 'nav', 'main', 'section:first-of-type', 'section:nth-of-type(2)', 'footer', '[class*="hero"]', '[class*="container"]:first-of-type'];
  let styles = '';
  
  const allProps = [
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'margin', 'padding', 'gap',
    'flex', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap',
    'grid-template-columns', 'grid-template-rows',
    'background', 'background-color', 'background-image',
    'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
    'border', 'border-radius', 'box-shadow',
    'transform', 'transition', 'animation', 'opacity', 'z-index', 'overflow'
  ];
  
  selectors.forEach(sel => {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const c = window.getComputedStyle(el);
        styles += `${sel} {\n`;
        allProps.forEach(prop => {
          const val = c.getPropertyValue(prop);
          if (val && val !== 'none' && val !== 'auto' && val !== 'normal' && 
              val !== '0px' && val !== 'rgba(0, 0, 0, 0)' && val !== 'static' && val !== 'visible') {
            styles += `  ${prop}: ${val.slice(0, 80)};\n`;
          }
        });
        styles += `}\n\n`;
      }
    } catch (e) {}
  });
  
  return styles;
};

/**
 * Extract special effects
 */
export const extractEffects = () => {
  const shadows = new Set<string>();
  const blurs = new Set<string>();
  const transforms = new Set<string>();
  const filters = new Set<string>();
  
  document.querySelectorAll('*').forEach(el => {
    const c = window.getComputedStyle(el);
    if (c.boxShadow !== 'none') shadows.add(c.boxShadow.slice(0, 60));
    if (c.filter !== 'none') {
      if (c.filter.includes('blur')) blurs.add(c.filter);
      filters.add(c.filter);
    }
    if (c.transform !== 'none') transforms.add(c.transform.slice(0, 40));
  });
  
  return {
    shadows: Array.from(shadows).slice(0, 5),
    blurs: Array.from(blurs).slice(0, 3),
    transforms: Array.from(transforms).slice(0, 5).join(', ') || 'none',
    filters: Array.from(filters).slice(0, 3).join(', ') || 'none'
  };
};

/**
 * Analyze forms
 */
export const analyzeForms = (): string => {
  const forms: string[] = [];
  document.querySelectorAll('form').forEach((form, i) => {
    const inputs = form.querySelectorAll('input, select, textarea').length;
    forms.push(`Form ${i + 1}: ${inputs} fields`);
  });
  return forms.join('\n') || 'No forms';
};

/**
 * Detect JS features
 */
export const detectJSFeatures = (): string => {
  const features: string[] = [];
  
  if (document.querySelectorAll('[data-toggle], [data-bs-toggle]').length > 0) features.push('Bootstrap interactions');
  if (document.querySelectorAll('[onclick]').length > 0) features.push('Inline handlers');
  if (document.querySelectorAll('[class*="carousel"], [class*="slider"]').length > 0) features.push('Carousel/slider');
  if (document.querySelector('form')) features.push('Form validation needed');
  if (document.querySelectorAll('[class*="dropdown"]').length > 0) features.push('Dropdowns');
  if (document.querySelectorAll('[class*="modal"]').length > 0) features.push('Modals');
  
  return features.join(', ') || 'Static page';
};

/**
 * Get implementation notes
 */
export const getImplementationNotes = (): string => {
  const notes: string[] = [];
  
  if (document.querySelectorAll('img[loading="lazy"]').length > 0) notes.push('• Lazy loading images');
  if (document.querySelector('nav')) notes.push('• Mobile nav needed');
  if (document.querySelectorAll('[class*="sticky"]').length > 0) notes.push('• Sticky elements');
  
  const layout = detectLayoutSystem();
  if (layout.type === 'CSS Grid') notes.push('• Uses CSS Grid');
  if (layout.type === 'Flexbox') notes.push('• Uses Flexbox');
  
  return notes.join('\n') || '• Standard implementation';
};

/**
 * Master function to capture everything
 */
export const captureSiteCloneData = (): SiteCloneData => {
  const layout = detectLayoutSystem();
  const external = getExternalResources();
  const effects = extractEffects();
  
  return {
    metadata: getMetadata(),
    html: document.documentElement.outerHTML,
    structure: analyzeStructure(),
    components: identifyComponents(),
    css: extractCSS(),
    criticalCSS: getCriticalCSS(),
    computedStyles: getComputedStylesDetailed(),
    colors: extractColorsWithFrequency(),
    fonts: extractFontsWithWeights(),
    spacing: detectSpacingScale(),
    layoutType: layout.type,
    containerWidth: layout.containerWidth,
    gridSystem: layout.gridSystem,
    shadows: effects.shadows,
    blurs: effects.blurs,
    transforms: effects.transforms,
    filters: effects.filters,
    animations: extractAnimations(),
    images: extractImagesDetailed(),
    backgroundImages: extractBackgroundImages(),
    videos: extractVideos(),
    svgs: extractSVGs(),
    externalFonts: external.fonts,
    externalCSS: external.css,
    scripts: external.scripts,
    interactive: identifyInteractive(),
    forms: analyzeForms(),
    jsFeatures: detectJSFeatures(),
    breakpoints: detectBreakpoints(),
    implementationNotes: getImplementationNotes()
  };
};
