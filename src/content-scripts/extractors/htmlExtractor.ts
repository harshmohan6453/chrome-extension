/**
 * HTML Structure Extractor
 * Captures the COMPLETE DOM structure for AI consumption
 */

export interface HTMLStructure {
  cleanHTML: string;
  sectionCount: number;
  depth: number;
  elementCount: number;
}

export const extractHTMLStructure = (): HTMLStructure => {
  // Clone the body to avoid modifying the actual DOM
  const bodyClone = document.body.cloneNode(true) as HTMLElement;
  
  // Remove only truly unwanted elements (keep structure intact)
  const selectorsToRemove = [
    'script',
    'style',
    'noscript',
    // Keep iframes as placeholders
    '[id*="cookie-banner"]',
    '[class*="cookie-banner"]',
  ];
  
  selectorsToRemove.forEach(selector => {
    bodyClone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // Count total elements before cleaning
  let elementCount = bodyClone.querySelectorAll('*').length;
  
  // Clean up attributes - keep semantic and styling info
  const cleanElement = (element: Element) => {
    // Keep these attributes - expanded list for better context
    const keepAttributes = [
      'id', 
      'class', 
      'role', 
      'aria-label', 
      'aria-labelledby',
      'aria-describedby',
      'data-aos', 
      'data-scroll',
      'data-scroll-speed',
      'type', // for inputs, buttons
      'name', // for form elements
      'placeholder',
      'alt', // for images
      'src', // keep src for context
      'href', // keep href for links
    ];
    
    // Remove all other attributes
    Array.from(element.attributes).forEach(attr => {
      if (!keepAttributes.includes(attr.name)) {
        element.removeAttribute(attr.name);
      }
    });
    
    // Keep all meaningful class names (up to 10 instead of 3)
    if (element.hasAttribute('class')) {
      const classes = element.getAttribute('class')
        ?.split(' ')
        .filter(c => c.trim())
        .slice(0, 10) || [];
      if (classes.length > 0) {
        element.setAttribute('class', classes.join(' ')); 
      } else {
        element.removeAttribute('class');
      }
    }
    
    // Simplify src/href to just filename for brevity
    if (element.hasAttribute('src')) {
      const src = element.getAttribute('src') || '';
      const filename = src.split('/').pop() || src;
      element.setAttribute('src', filename.length > 50 ? filename.slice(0, 50) + '...' : filename);
    }
    if (element.hasAttribute('href')) {
      const href = element.getAttribute('href') || '';
      if (href.startsWith('http')) {
        const url = new URL(href);
        element.setAttribute('href', url.pathname);
      }
    }
    
    // Recursively clean children
    Array.from(element.children).forEach(child => cleanElement(child));
  };
  
  cleanElement(bodyClone);
  
  // Format with proper indentation
  const formatHTML = (element: Element, indent = 0): string => {
    const indentStr = '  '.repeat(indent);
    const tagName = element.tagName.toLowerCase();
    
    // Get attributes
    const attrs = Array.from(element.attributes)
      .map(attr => `${attr.name}="${attr.value}"`)
      .join(' ');
    
    const openTag = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
    const closeTag = `</${tagName}>`;
    
    // Self-closing or empty elements
    if (element.children.length === 0) {
      const textContent = element.textContent?.trim();
      if (!textContent) {
        return `${indentStr}${openTag}${closeTag}`;
      }
      // Truncate long text content
      const shortText = textContent.length > 50 
        ? textContent.slice(0, 50) + '...' 
        : textContent;
      return `${indentStr}${openTag}${shortText}${closeTag}`;
    }
    
    // Elements with children
    const childrenHTML = Array.from(element.children)
      .map(child => formatHTML(child, indent + 1))
      .join('\n');
    
    return `${indentStr}${openTag}\n${childrenHTML}\n${indentStr}${closeTag}`;
  };
  
  const html = formatHTML(bodyClone);
  
  // Count sections
  const sectionCount = (html.match(/<(section|article|header|footer|main|nav|aside)/gi) || []).length;
  
  // Calculate maximum depth
  let maxDepth = 0;
  let currentDepth = 0;
  for (const char of html) {
    if (char === '<') {
      const nextChars = html.slice(html.indexOf(char), html.indexOf(char) + 10);
      if (!nextChars.includes('</')) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else {
        currentDepth--;
      }
    }
  }
  
  return {
    cleanHTML: `<body>\n${html}\n</body>`,
    sectionCount,
    depth: maxDepth,
    elementCount
  };
};
