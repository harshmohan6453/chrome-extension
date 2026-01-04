export interface FontInfo {
  family: string;
  source: string; // 'google', 'local', 'adobe', etc.
  weight: string;
  style: string;
  size: string;
  lineHeight: string;
}

// Detect font source based on loaded fonts and page resources
const detectFontSource = (family: string): string => {
  const lowerFamily = family.toLowerCase();

  // Check for Google Fonts
  const googleFontsLink = document.querySelector('link[href*="fonts.googleapis.com"]');
  if (googleFontsLink) {
    const href = googleFontsLink.getAttribute('href') || '';
    if (href.toLowerCase().includes(lowerFamily.replace(/\s/g, '+'))) {
      return 'google';
    }
  }

  // Check for Adobe Fonts (Typekit)
  const adobeFontsLink = document.querySelector('link[href*="use.typekit.net"], script[src*="use.typekit.net"]');
  if (adobeFontsLink) {
    return 'adobe';
  }

  // Check for system fonts
  const systemFonts = [
    'arial', 'helvetica', 'times new roman', 'times', 'courier new', 'courier',
    'verdana', 'georgia', 'palatino', 'garamond', 'bookman', 'comic sans ms',
    'trebuchet ms', 'impact', 'lucida console', 'tahoma', 'geneva', 'monaco',
    'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto',
    'oxygen', 'ubuntu', 'cantarell', 'fira sans', 'droid sans', 'helvetica neue'
  ];

  if (systemFonts.includes(lowerFamily)) {
    return 'system';
  }

  // Check for custom @font-face declarations
  try {
    const sheets = document.styleSheets;
    for (let i = 0; i < sheets.length; i++) {
      try {
        const rules = sheets[i].cssRules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            if (rules[j] instanceof CSSFontFaceRule) {
              const fontFaceRule = rules[j] as CSSFontFaceRule;
              const fontFamilyMatch = fontFaceRule.style.getPropertyValue('font-family');
              if (fontFamilyMatch && fontFamilyMatch.toLowerCase().includes(lowerFamily)) {
                return 'custom';
              }
            }
          }
        }
      } catch (e) {
        // Cross-origin stylesheet, skip
      }
    }
  } catch (e) {
    // Error accessing stylesheets
  }

  return 'unknown';
};

export const extractFonts = (): FontInfo[] => {
  const elements = document.querySelectorAll('*');
  const fontMap = new Map<string, FontInfo>();

  elements.forEach((el) => {
    const computed = window.getComputedStyle(el);
    const family = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim();

    if (!family) return;

    const key = `${family}-${computed.fontWeight}-${computed.fontStyle}-${computed.fontSize}`;

    if (!fontMap.has(key)) {
      fontMap.set(key, {
        family,
        source: detectFontSource(family),
        weight: computed.fontWeight,
        style: computed.fontStyle,
        size: computed.fontSize,
        lineHeight: computed.lineHeight,
      });
    }
  });

  return Array.from(fontMap.values());
};

export const groupFontsByFamily = (fonts: FontInfo[]) => {
  const groups: Record<string, FontInfo[]> = {};
  fonts.forEach((font) => {
    if (!groups[font.family]) {
      groups[font.family] = [];
    }
    groups[font.family].push(font);
  });
  return groups;
};
