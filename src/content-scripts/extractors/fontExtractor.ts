export interface FontInfo {
  family: string;
  source: string; // 'google', 'local', 'adobe', etc.
  weight: string;
  style: string;
  size: string;
  lineHeight: string;
}

export const extractFonts = (): FontInfo[] => {
  const elements = document.querySelectorAll('*');
  const fontMap = new Map<string, FontInfo>();

  elements.forEach((el) => {
    const computed = window.getComputedStyle(el);
    const family = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    
    if (!family) return;

    const key = `${family}-${computed.fontWeight}-${computed.fontStyle}`;
    
    if (!fontMap.has(key)) {
      fontMap.set(key, {
        family,
        source: 'unknown', // TODO: Implement source detection
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
