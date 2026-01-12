import { GradientData, GradientColor } from '../../store';

const rgbToHex = (rgb: string): string => {
  if (rgb.startsWith('#')) return rgb;

  const values = rgb.match(/\d+/g);
  if (!values) return rgb;

  const r = parseInt(values[0]);
  const g = parseInt(values[1]);
  const b = parseInt(values[2]);

  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const parseGradientString = (gradient: string): { type: 'linear' | 'radial' | 'conical'; colors: GradientColor[] } | null => {
  try {
    if (gradient.includes('linear-gradient')) {
      const type: 'linear' | 'radial' | 'conical' = 'linear';

      const content = gradient.match(/linear-gradient\((.*)\)/)?.[1];
      if (!content) return null;

      const colorStops: GradientColor[] = [];

      const colorRegex = /([a-zA-Z]+|#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\))(?:\s+(\d+%|from|to|\d+deg|\d+(?:px|em|rem|vh|vw|cm|mm|in|pt|pc|ex|ch|vmin|vmax)))?/g;
      let match;
      let index = 0;

      while ((match = colorRegex.exec(content)) !== null) {
        const color = match[1];
        const position = match[2];

        const hex = rgbToHex(color);

        let pos: number | undefined;
        if (position && position.includes('%')) {
          pos = parseFloat(position);
        } else if (position === 'from') {
          pos = 0;
        } else if (position === 'to') {
          pos = 100;
        }

        colorStops.push({
          index,
          color,
          hex,
          position: pos,
        });

        index++;
      }

      return { type, colors: colorStops };
    }

    if (gradient.includes('radial-gradient')) {
      const type: 'linear' | 'radial' | 'conical' = 'radial';

      const content = gradient.match(/radial-gradient\((.*)\)/)?.[1];
      if (!content) return null;

      const colorStops: GradientColor[] = [];

      const colorRegex = /([a-zA-Z]+|#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\))(?:\s+(\d+%|from|to|\d+deg|\d+(?:px|em|rem|vh|vw|cm|mm|in|pt|pc|ex|ch|vmin|vmax)))?/g;
      let match;
      let index = 0;

      while ((match = colorRegex.exec(content)) !== null) {
        const color = match[1];
        const position = match[2];

        const hex = rgbToHex(color);

        let pos: number | undefined;
        if (position && position.includes('%')) {
          pos = parseFloat(position);
        } else if (position === 'from') {
          pos = 0;
        } else if (position === 'to') {
          pos = 100;
        }

        colorStops.push({
          index,
          color,
          hex,
          position: pos,
        });

        index++;
      }

      return { type, colors: colorStops };
    }

    if (gradient.includes('conic-gradient')) {
      const type: 'linear' | 'radial' | 'conical' = 'conical';

      const content = gradient.match(/conic-gradient\((.*)\)/)?.[1];
      if (!content) return null;

      const colorStops: GradientColor[] = [];

      const colorRegex = /([a-zA-Z]+|#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\))(?:\s+(\d+%|from|to|\d+deg|\d+(?:px|em|rem|vh|vw|cm|mm|in|pt|pc|ex|ch|vmin|vmax)))?/g;
      let match;
      let index = 0;

      while ((match = colorRegex.exec(content)) !== null) {
        const color = match[1];
        const position = match[2];

        const hex = rgbToHex(color);

        let pos: number | undefined;
        if (position && (position.includes('%') || position.includes('deg'))) {
          pos = parseFloat(position);
        } else if (position === 'from') {
          pos = 0;
        } else if (position === 'to') {
          pos = 100;
        }

        colorStops.push({
          index,
          color,
          hex,
          position: pos,
        });

        index++;
      }

      return { type, colors: colorStops };
    }

    return null;
  } catch (e) {
    return null;
  }
};

const normalizeGradient = (gradient: string): string => {
  let normalized = gradient
    .replace(/\s+/g, ' ')
    .replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, (_, r, g, b) => {
      const toHex = (n: string) => parseInt(n).toString(16).padStart(2, '0').toUpperCase();
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    })
    .replace(/rgba?\(([^)]+)\)/g, 'rgb($1)')
    .replace(/,?\s*(\d+)deg/g, ' $1deg')
    .replace(/,?\s*(\d+)%/g, ' $1%')
    .toLowerCase();

  return normalized;
};

export const extractGradients = (): GradientData[] => {
  const gradients = new Map<string, GradientData>();
  const gradientCounts = new Map<string, number>();

  const elements = document.querySelectorAll('*');

  elements.forEach((el) => {
    try {
      const computed = window.getComputedStyle(el);
      const bgImage = computed.backgroundImage;

      if (!bgImage || bgImage === 'none') return;

      const gradientMatches = bgImage.matchAll(/(?:linear|radial|conic)-gradient\([^)]+\)/gi);

      for (const match of gradientMatches) {
        const gradientString = match[0];
        const normalized = normalizeGradient(gradientString);

        if (!gradients.has(normalized)) {
          const parsed = parseGradientString(gradientString);
          if (!parsed) continue;

          const id = `gradient-${gradients.size}`;
          gradients.set(normalized, {
            id,
            type: parsed.type,
            original: gradientString,
            elementCount: 1,
            colors: parsed.colors,
          });
          gradientCounts.set(normalized, 1);
        } else {
          gradientCounts.set(normalized, (gradientCounts.get(normalized) || 0) + 1);
        }

        const gradient = gradients.get(normalized);
        if (gradient) {
          gradient.elementCount = gradientCounts.get(normalized) || 1;
        }
      }
    } catch (e) {
      console.error('Error processing element for gradients:', e);
    }
  });

  return Array.from(gradients.values()).sort((a, b) => b.elementCount - a.elementCount);
};
