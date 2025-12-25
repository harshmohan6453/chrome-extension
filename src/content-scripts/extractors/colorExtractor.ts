interface ColorInfo {
  hex: string;
  rgba: string;
  usageCount: number;
  type: string;
  role?: string;
}

export const extractColors = (): ColorInfo[] => {
  const elements = document.querySelectorAll('*');
  const colorStats = new Map<string, { total: number, background: number, text: number, border: number }>();

  const processColor = (color: string, type: 'background' | 'text' | 'border') => {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return;
    
    // Normalize color (basic)
    const stats = colorStats.get(color) || { total: 0, background: 0, text: 0, border: 0 };
    stats.total++;
    stats[type]++;
    colorStats.set(color, stats);
  };

  elements.forEach((el) => {
    const computed = window.getComputedStyle(el);
    processColor(computed.color, 'text');
    processColor(computed.backgroundColor, 'background');
    processColor(computed.borderColor, 'border');
  });

  const parsedColors = Array.from(colorStats.entries())
    .map(([color, stats]) => {
        // Determine primary type
        let primaryType = 'text';
        if (stats.background > stats.text && stats.background > stats.border) primaryType = 'background';
        else if (stats.border > stats.text && stats.border > stats.background) primaryType = 'border';
        
        const hex = rgbToHex(color);
        const { h, s, l } = rgbToHsl(color);

        return {
            hex,
            rgba: color,
            usageCount: stats.total,
            type: primaryType,
            hsl: { h, s, l },
            role: undefined as string | undefined
        };
    })
    .sort((a, b) => b.usageCount - a.usageCount);

  // Heuristics for Role Assignment
  // 1. Background: Most used 'background' type
  const bgCandidate = parsedColors.find(c => c.type === 'background');
  if (bgCandidate) bgCandidate.role = 'background';

  // 2. Text: Most used 'text' type
  const textCandidate = parsedColors.find(c => c.type === 'text');
  if (textCandidate) textCandidate.role = 'text';

  // 3. Primary: Most used color that is NOT grayscale (s > 10%) and NOT the bg/text (unless they are colored)
  const colorfulColors = parsedColors.filter(c => c.hsl.s > 10 && c.hsl.l > 10 && c.hsl.l < 90);
  
  const primaryCandidate = colorfulColors.find(c => c !== bgCandidate && c !== textCandidate);
  if (primaryCandidate) {
      primaryCandidate.role = 'primary';
      
      // 4. Secondary: Next colorful distinct color
      const secondaryCandidate = colorfulColors.find(c => c !== bgCandidate && c !== textCandidate && c !== primaryCandidate && Math.abs(c.hsl.h - primaryCandidate.hsl.h) > 30);
      if (secondaryCandidate) secondaryCandidate.role = 'secondary';
  }

  return parsedColors;
};

const rgbToHsl = (rgb: string) => {
    const values = rgb.match(/\d+/g);
    if (!values) return { h: 0, s: 0, l: 0 };
    let r = parseInt(values[0]) / 255;
    let g = parseInt(values[1]) / 255;
    let b = parseInt(values[2]) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
};

const rgbToHex = (rgb: string): string => {
  if (rgb.startsWith('#')) return rgb;
  
  const values = rgb.match(/\d+/g);
  if (!values) return rgb;

  const r = parseInt(values[0]);
  const g = parseInt(values[1]);
  const b = parseInt(values[2]);

  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};
