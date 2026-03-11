import {
  ColorOccurrenceSummary,
  ColorVariableMetadata,
  SemanticCandidate,
  ThemeColorSource,
  ThemeProperty,
  normalizeHex,
} from '../../utils/themeStudio';

interface ColorInfo extends ThemeColorSource {
  rgba: string;
  usageCount: number;
}

interface ColorAccumulator {
  hex: string;
  rgba: string;
  usageCount: number;
  typeCounts: Record<'background' | 'text' | 'border', number>;
  propertyCounts: Record<ThemeProperty, number>;
  sampleSelectors: Record<ThemeProperty, Set<string>>;
  variableMap: Map<string, ColorVariableMetadata>;
}

const COLOR_PROPERTIES: Array<{ styleName: keyof CSSStyleDeclaration; property: ThemeProperty }> = [
  { styleName: 'color', property: 'color' },
  { styleName: 'backgroundColor', property: 'background-color' },
  { styleName: 'borderTopColor', property: 'border-color' },
];

const normalizeCssColor = (color: string): string | null => {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || color === 'inherit') return null;

  const values = color.match(/\d+(\.\d+)?/g);
  if (!values || values.length < 3) return color.startsWith('#') ? normalizeHex(color) : null;

  const [r, g, b] = values.slice(0, 3).map((value) => Number(value));
  return normalizeHex(
    `#${[r, g, b]
      .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
      .join('')}`
  );
};

const selectorForElement = (element: Element): string => {
  if (element.id) return `#${CSS.escape(element.id)}`;

  const classNames = Array.from(element.classList)
    .filter((className) => !className.startsWith('di-'))
    .slice(0, 2);

  if (classNames.length > 0) {
    return `${element.tagName.toLowerCase()}.${classNames.map((name) => CSS.escape(name)).join('.')}`;
  }

  const parent = element.parentElement;
  if (!parent) return element.tagName.toLowerCase();

  const index = Array.from(parent.children).indexOf(element) + 1;
  return `${parent.tagName.toLowerCase()} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
};

const collectScopeVariables = (computed: CSSStyleDeclaration, source: 'root' | 'body') => {
  const map = new Map<string, ColorVariableMetadata[]>();

  for (let i = 0; i < computed.length; i++) {
    const property = computed.item(i);
    if (!property.startsWith('--')) continue;

    const value = normalizeCssColor(computed.getPropertyValue(property).trim());
    if (!value) continue;

    const current = map.get(value) || [];
    current.push({ name: property, source });
    map.set(value, current);
  }

  return map;
};

const mergeVariableMatches = (
  target: Map<string, ColorVariableMetadata>,
  matches: ColorVariableMetadata[] | undefined,
  limit = 6
) => {
  if (!matches) return;
  matches.slice(0, limit).forEach((match) => {
    target.set(`${match.source}:${match.name}`, match);
  });
};

const getInlineVariableMatches = (element: Element, computedValue: string) => {
  const style = (element as HTMLElement).style;
  const matches: ColorVariableMetadata[] = [];

  for (let i = 0; i < style.length; i++) {
    const property = style.item(i);
    if (!property.startsWith('--')) continue;

    const value = normalizeCssColor(style.getPropertyValue(property).trim());
    if (!value || value !== computedValue) continue;
    matches.push({ name: property, source: 'inline' });
  }

  return matches;
};

const buildSemanticCandidates = (
  hex: string,
  type: 'text' | 'background' | 'border' | 'auto',
  role: string | undefined,
  allColors: ColorAccumulator[]
): SemanticCandidate[] => {
  const entry = allColors.find((color) => color.hex === hex);
  const counts = entry?.propertyCounts || { color: 0, 'background-color': 0, 'border-color': 0 };
  const backgroundRank = allColors.filter((color) => color.propertyCounts['background-color'] > 0).findIndex((color) => color.hex === hex);
  const textRank = allColors.filter((color) => color.propertyCounts.color > 0).findIndex((color) => color.hex === hex);
  const borderRank = allColors.filter((color) => color.propertyCounts['border-color'] > 0).findIndex((color) => color.hex === hex);
  const normalizedRole = role || '';

  const candidates: SemanticCandidate[] = [];
  const isColorful = (() => {
    const values = hex.replace('#', '').match(/.{2}/g)?.map((part) => parseInt(part, 16) / 255) || [0, 0, 0];
    const max = Math.max(...values);
    const min = Math.min(...values);
    return (max - min) * 100 > 10;
  })();

  if (normalizedRole === 'background' || (type === 'background' && backgroundRank === 0)) {
    candidates.push({ slot: 'background', confidence: normalizedRole === 'background' ? 0.95 : 0.88 });
  } else if (type === 'background' && backgroundRank === 1) {
    candidates.push({ slot: 'background', confidence: 0.58 });
  }

  if (type === 'background' && backgroundRank >= 0 && backgroundRank <= 2) {
    candidates.push({ slot: 'surface', confidence: backgroundRank === 1 ? 0.86 : 0.55 });
  }

  if (normalizedRole === 'text' || (type === 'text' && textRank === 0)) {
    candidates.push({ slot: 'text', confidence: normalizedRole === 'text' ? 0.95 : 0.9 });
  } else if (type === 'text' && textRank === 1) {
    candidates.push({ slot: 'mutedText', confidence: 0.82 });
  } else if (type === 'text' && counts.color > 0) {
    candidates.push({ slot: 'mutedText', confidence: 0.38 });
  }

  if (type === 'border' && borderRank === 0) {
    candidates.push({ slot: 'border', confidence: 0.9 });
  } else if (type === 'border' && counts['border-color'] > 0) {
    candidates.push({ slot: 'border', confidence: 0.42 });
  }

  if ((normalizedRole === 'primary' || (isColorful && counts['background-color'] + counts.color > 0)) && type !== 'border') {
    candidates.push({ slot: 'primary', confidence: normalizedRole === 'primary' ? 0.94 : 0.62 });
  }

  if (normalizedRole === 'secondary' || (isColorful && textRank > 0 && backgroundRank > 0)) {
    candidates.push({ slot: 'accent', confidence: normalizedRole === 'secondary' ? 0.86 : 0.46 });
  }

  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .filter((candidate, index, array) => array.findIndex((entry) => entry.slot === candidate.slot) === index)
    .map((candidate) => ({ ...candidate, confidence: Number(candidate.confidence.toFixed(2)) }));
};

export const extractColors = (): ColorInfo[] => {
  const elements = document.querySelectorAll('*');
  const colorStats = new Map<string, ColorAccumulator>();
  const rootVariables = collectScopeVariables(getComputedStyle(document.documentElement), 'root');
  const bodyVariables = collectScopeVariables(getComputedStyle(document.body || document.documentElement), 'body');

  const processColor = (
    element: Element,
    cssColor: string,
    property: ThemeProperty,
    semanticType: 'background' | 'text' | 'border'
  ) => {
    const normalized = normalizeCssColor(cssColor);
    if (!normalized) return;

    const current =
      colorStats.get(normalized) ||
      {
        hex: normalized,
        rgba: cssColor,
        usageCount: 0,
        typeCounts: { background: 0, text: 0, border: 0 },
        propertyCounts: { color: 0, 'background-color': 0, 'border-color': 0 },
        sampleSelectors: {
          color: new Set<string>(),
          'background-color': new Set<string>(),
          'border-color': new Set<string>(),
        },
        variableMap: new Map<string, ColorVariableMetadata>(),
      };

    current.usageCount += 1;
    current.typeCounts[semanticType] += 1;
    current.propertyCounts[property] += 1;

    if (current.sampleSelectors[property].size < 5) {
      current.sampleSelectors[property].add(selectorForElement(element));
    }

    mergeVariableMatches(current.variableMap, rootVariables.get(normalized));
    mergeVariableMatches(current.variableMap, bodyVariables.get(normalized));
    mergeVariableMatches(current.variableMap, getInlineVariableMatches(element, normalized), 3);

    colorStats.set(normalized, current);
  };

  elements.forEach((element) => {
    const computed = window.getComputedStyle(element);

    COLOR_PROPERTIES.forEach(({ styleName, property }) => {
      const value = String(computed[styleName] || '');
      if (!value) return;

      if (property === 'color') processColor(element, value, property, 'text');
      else if (property === 'background-color') processColor(element, value, property, 'background');
      else processColor(element, value, property, 'border');
    });
  });

  const parsedColors = Array.from(colorStats.values())
    .map((stats) => {
      let primaryType: 'text' | 'background' | 'border' | 'auto' = 'text';
      if (stats.typeCounts.background > stats.typeCounts.text && stats.typeCounts.background >= stats.typeCounts.border) {
        primaryType = 'background';
      } else if (stats.typeCounts.border > stats.typeCounts.text && stats.typeCounts.border >= stats.typeCounts.background) {
        primaryType = 'border';
      }

      return {
        hex: stats.hex,
        rgba: stats.rgba,
        usageCount: stats.usageCount,
        type: primaryType,
        role: undefined as string | undefined,
        count: stats.usageCount,
        occurrences: (
          [
            { property: 'color', count: stats.propertyCounts.color, sampleSelectors: Array.from(stats.sampleSelectors.color) },
            {
              property: 'background-color',
              count: stats.propertyCounts['background-color'],
              sampleSelectors: Array.from(stats.sampleSelectors['background-color']),
            },
            {
              property: 'border-color',
              count: stats.propertyCounts['border-color'],
              sampleSelectors: Array.from(stats.sampleSelectors['border-color']),
            },
          ] as ColorOccurrenceSummary[]
        ).filter((occurrence) => occurrence.count > 0),
        cssVariables: Array.from(stats.variableMap.values()),
        semanticCandidates: [] as SemanticCandidate[],
      };
    })
    .sort((a, b) => b.usageCount - a.usageCount);

  const backgroundCandidate = parsedColors.find((color) => color.type === 'background');
  if (backgroundCandidate) backgroundCandidate.role = 'background';

  const textCandidate = parsedColors.find((color) => color.type === 'text');
  if (textCandidate) textCandidate.role = 'text';

  const colorfulColors = parsedColors.filter((color) => {
    const values = color.hex.replace('#', '').match(/.{2}/g)?.map((part) => parseInt(part, 16) / 255) || [0, 0, 0];
    const max = Math.max(...values);
    const min = Math.min(...values);
    return (max - min) * 100 > 10;
  });

  const primaryCandidate = colorfulColors.find((color) => color !== backgroundCandidate && color !== textCandidate);
  if (primaryCandidate) {
    primaryCandidate.role = 'primary';
    const secondaryCandidate = colorfulColors.find(
      (color) =>
        color !== backgroundCandidate &&
        color !== textCandidate &&
        color !== primaryCandidate &&
        Math.abs(parseInt(color.hex.slice(1, 3), 16) - parseInt(primaryCandidate.hex.slice(1, 3), 16)) > 20
    );
    if (secondaryCandidate) secondaryCandidate.role = 'secondary';
  }

  const accumulators = Array.from(colorStats.values()).sort((a, b) => b.usageCount - a.usageCount);

  parsedColors.forEach((color) => {
    color.semanticCandidates = buildSemanticCandidates(color.hex, color.type, color.role, accumulators);
  });

  return parsedColors;
};
