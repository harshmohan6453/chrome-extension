export type ThemeSemanticSlotId =
  | 'background'
  | 'surface'
  | 'text'
  | 'mutedText'
  | 'border'
  | 'primary'
  | 'accent';

export type ThemeProperty = 'color' | 'background-color' | 'border-color';
export type ThemeApplyMode = 'hybrid' | 'variables-only';
export type ThemeGradientKind = 'background' | 'text';

export interface SemanticCandidate {
  slot: ThemeSemanticSlotId;
  confidence: number;
}

export interface ColorOccurrenceSummary {
  property: ThemeProperty;
  count: number;
  sampleSelectors: string[];
}

export interface ColorVariableMetadata {
  name: string;
  source: 'root' | 'body' | 'inline';
}

export interface ThemeGradientSource {
  value: string;
  kind: ThemeGradientKind;
  count: number;
  sampleSelectors: string[];
}

export interface ThemeSemanticSlot {
  id: ThemeSemanticSlotId;
  label: string;
  originalColor: string;
  currentColor: string;
  confidence: number;
  sourceColor: string;
  candidateVariables: string[];
  uncertain: boolean;
}

export interface ThemeReplacementRule {
  id: string;
  originalColor: string;
  replacementColor: string;
  property: ThemeProperty | 'all';
  count: number;
  variableNames: string[];
  sampleSelectors: string[];
  enabled: boolean;
}

export interface ThemeGradientRule {
  id: string;
  originalValue: string;
  replacementValue: string;
  kind: ThemeGradientKind;
  count: number;
  sampleSelectors: string[];
  enabled: boolean;
}

export interface ThemeHistoryEntry {
  semanticSlots: ThemeSemanticSlot[];
  exactReplacements: ThemeReplacementRule[];
  gradientReplacements: ThemeGradientRule[];
  applyMode: ThemeApplyMode;
}

export interface ThemeSession {
  semanticSlots: ThemeSemanticSlot[];
  exactReplacements: ThemeReplacementRule[];
  gradientReplacements: ThemeGradientRule[];
  history: ThemeHistoryEntry[];
  historyIndex: number;
  isPreviewActive: boolean;
  applyMode: ThemeApplyMode;
  trackedNodeCount: number;
  pageTitle: string;
  pageUrl: string;
  lowConfidence: boolean;
  lastUpdatedAt: number;
}

export interface ThemePreset {
  id: string;
  label: string;
  colors: Partial<Record<ThemeSemanticSlotId, string>>;
}

export interface ThemeSessionExport {
  pageUrl: string;
  pageTitle: string;
  exportedAt: string;
  semanticSlots: ThemeSemanticSlot[];
  exactReplacements: ThemeReplacementRule[];
  gradientReplacements: ThemeGradientRule[];
}

export const THEME_SLOT_LABELS: Record<ThemeSemanticSlotId, string> = {
  background: 'Background',
  surface: 'Surface',
  text: 'Text',
  mutedText: 'Muted Text',
  border: 'Border',
  primary: 'Primary',
  accent: 'Accent',
};

export const THEME_SLOT_ORDER: ThemeSemanticSlotId[] = [
  'background',
  'surface',
  'text',
  'mutedText',
  'border',
  'primary',
  'accent',
];

export interface ThemeColorSource {
  hex: string;
  type: 'text' | 'background' | 'border' | 'auto';
  role?: string;
  count: number;
  semanticCandidates?: SemanticCandidate[];
  cssVariables?: ColorVariableMetadata[];
  occurrences?: ColorOccurrenceSummary[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const dedupe = (values: string[]) => Array.from(new Set(values.filter(Boolean)));
const getWrappedHueDelta = (from: number, to: number) => {
  const delta = to - from;
  if (delta > 180) return delta - 360;
  if (delta < -180) return delta + 360;
  return delta;
};

export const normalizeHex = (value: string): string => {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return value.trim().toUpperCase();
  const hex = match[1];
  if (hex.length === 3) {
    return `#${hex
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
      .toUpperCase()}`;
  }
  return `#${hex.toUpperCase()}`;
};

export const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex).replace('#', '');
  const intValue = parseInt(normalized, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

export const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

export const hexToHsl = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: Math.round(h * 60 < 0 ? h * 60 + 360 : h * 60),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

export const hslToHex = (h: number, s: number, l: number) => {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = h / 60;
  const second = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = lightness - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (segment >= 0 && segment < 1) [r, g, b] = [chroma, second, 0];
  else if (segment < 2) [r, g, b] = [second, chroma, 0];
  else if (segment < 3) [r, g, b] = [0, chroma, second];
  else if (segment < 4) [r, g, b] = [0, second, chroma];
  else if (segment < 5) [r, g, b] = [second, 0, chroma];
  else [r, g, b] = [chroma, 0, second];

  return rgbToHex((r + match) * 255, (g + match) * 255, (b + match) * 255);
};

export const adjustLightness = (hex: string, delta: number) => {
  const hsl = hexToHsl(hex);
  return hslToHex(hsl.h, hsl.s, clamp(hsl.l + delta, 0, 100));
};

export const shiftHue = (hex: string, delta: number, saturationDelta = 0, lightnessDelta = 0) => {
  const hsl = hexToHsl(hex);
  return hslToHex(
    (hsl.h + delta + 360) % 360,
    clamp(hsl.s + saturationDelta, 0, 100),
    clamp(hsl.l + lightnessDelta, 0, 100)
  );
};

export const getLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

export const getContrastRatio = (foreground: string, background: string) => {
  const l1 = getLuminance(normalizeHex(foreground));
  const l2 = getLuminance(normalizeHex(background));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
};

export const getContrastBadge = (foreground: string, background: string) => {
  const ratio = getContrastRatio(foreground, background);
  if (ratio >= 7) return { ratio, label: 'AAA', tone: 'good' as const };
  if (ratio >= 4.5) return { ratio, label: 'AA', tone: 'good' as const };
  if (ratio >= 3) return { ratio, label: 'AA Large', tone: 'warn' as const };
  return { ratio, label: 'Fail', tone: 'bad' as const };
};

const sortByCount = (colors: ThemeColorSource[]) => [...colors].sort((a, b) => b.count - a.count);

const chooseBestCandidate = (
  colors: ThemeColorSource[],
  slot: ThemeSemanticSlotId,
  exclude: Set<string>,
  fallbackPredicate?: (color: ThemeColorSource) => boolean
) => {
  const sorted = sortByCount(colors)
    .filter((color) => !exclude.has(color.hex))
    .map((color) => ({
      color,
      confidence:
        color.semanticCandidates?.find((candidate) => candidate.slot === slot)?.confidence ??
        (fallbackPredicate?.(color) ? 0.35 : 0),
    }))
    .filter((entry) => entry.confidence > 0);

  return sorted[0] ?? null;
};

export const deriveThemeSemanticSlots = (colors: ThemeColorSource[]): ThemeSemanticSlot[] => {
  if (colors.length === 0) return [];

  const picked = new Set<string>();
  const slots: ThemeSemanticSlot[] = [];

  THEME_SLOT_ORDER.forEach((slotId) => {
    const entry = chooseBestCandidate(colors, slotId, picked, (color) => {
      if (slotId === 'surface') return color.type === 'background';
      if (slotId === 'mutedText') return color.type === 'text';
      if (slotId === 'border') return color.type === 'border';
      return false;
    });

    if (!entry) return;

    picked.add(entry.color.hex);
    slots.push({
      id: slotId,
      label: THEME_SLOT_LABELS[slotId],
      originalColor: normalizeHex(entry.color.hex),
      currentColor: normalizeHex(entry.color.hex),
      confidence: Number(entry.confidence.toFixed(2)),
      sourceColor: normalizeHex(entry.color.hex),
      candidateVariables: dedupe((entry.color.cssVariables || []).map((variable) => variable.name)),
      uncertain: entry.confidence < 0.55,
    });
  });

  return slots;
};

export const deriveThemeReplacementRules = (colors: ThemeColorSource[]): ThemeReplacementRule[] =>
  sortByCount(colors).map((color) => ({
    id: `${normalizeHex(color.hex)}-all`,
    originalColor: normalizeHex(color.hex),
    replacementColor: normalizeHex(color.hex),
    property: 'all',
    count: color.count,
    variableNames: dedupe((color.cssVariables || []).map((variable) => variable.name)),
    sampleSelectors: dedupe(
      (color.occurrences || []).flatMap((occurrence) => occurrence.sampleSelectors).slice(0, 8)
    ),
    enabled: false,
  }));

export const deriveThemeGradientRules = (gradients: ThemeGradientSource[]): ThemeGradientRule[] =>
  [...gradients]
    .sort((a, b) => b.count - a.count)
    .map((gradient) => ({
      id: `${gradient.kind}:${gradient.value}`,
      originalValue: gradient.value,
      replacementValue: gradient.value,
      kind: gradient.kind,
      count: gradient.count,
      sampleSelectors: dedupe(gradient.sampleSelectors).slice(0, 8),
      enabled: false,
    }));

export const buildInitialThemeSession = (
  colors: ThemeColorSource[],
  gradients: ThemeGradientSource[],
  pageTitle: string,
  pageUrl: string,
  applyMode: ThemeApplyMode = 'hybrid',
  trackedNodeCount = 0
): ThemeSession => {
  const semanticSlots = deriveThemeSemanticSlots(colors);
  const exactReplacements = deriveThemeReplacementRules(colors);
  const gradientReplacements = deriveThemeGradientRules(gradients);

  return {
    semanticSlots,
    exactReplacements,
    gradientReplacements,
    history: [
      {
        semanticSlots,
        exactReplacements,
        gradientReplacements,
        applyMode,
      },
    ],
    historyIndex: 0,
    isPreviewActive: true,
    applyMode,
    trackedNodeCount,
    pageTitle,
    pageUrl,
    lowConfidence: semanticSlots.some((slot) => slot.uncertain),
    lastUpdatedAt: Date.now(),
  };
};

export const cloneThemeSessionState = (session: ThemeSession): ThemeHistoryEntry => ({
  semanticSlots: session.semanticSlots.map((slot) => ({ ...slot, candidateVariables: [...slot.candidateVariables] })),
  exactReplacements: session.exactReplacements.map((rule) => ({
    ...rule,
    variableNames: [...rule.variableNames],
    sampleSelectors: [...rule.sampleSelectors],
  })),
  gradientReplacements: session.gradientReplacements.map((rule) => ({
    ...rule,
    sampleSelectors: [...rule.sampleSelectors],
  })),
  applyMode: session.applyMode,
});

export const createHistorySnapshot = (
  semanticSlots: ThemeSemanticSlot[],
  exactReplacements: ThemeReplacementRule[],
  gradientReplacements: ThemeGradientRule[],
  applyMode: ThemeApplyMode
): ThemeHistoryEntry => ({
  semanticSlots: semanticSlots.map((slot) => ({ ...slot, candidateVariables: [...slot.candidateVariables] })),
  exactReplacements: exactReplacements.map((rule) => ({
    ...rule,
    variableNames: [...rule.variableNames],
    sampleSelectors: [...rule.sampleSelectors],
  })),
  gradientReplacements: gradientReplacements.map((rule) => ({
    ...rule,
    sampleSelectors: [...rule.sampleSelectors],
  })),
  applyMode,
});

const getColorDistance = (left: string, right: string) => {
  const a = hexToHsl(left);
  const b = hexToHsl(right);
  const hueDistance = Math.abs(getWrappedHueDelta(a.h, b.h)) / 180;
  const saturationDistance = Math.abs(a.s - b.s) / 100;
  const lightnessDistance = Math.abs(a.l - b.l) / 100;
  return hueDistance * 0.45 + saturationDistance * 0.2 + lightnessDistance * 0.35;
};

const transformColorBySlotDelta = (sourceHex: string, referenceHex: string, targetHex: string) => {
  const source = hexToHsl(sourceHex);
  const reference = hexToHsl(referenceHex);
  const target = hexToHsl(targetHex);

  const hueDelta = getWrappedHueDelta(reference.h, target.h);
  const saturationDelta = target.s - reference.s;
  const lightnessDelta = target.l - reference.l;

  const nextSaturation =
    source.s < 8 && target.s > reference.s
      ? clamp(source.s + saturationDelta * 0.35, 0, 100)
      : clamp(source.s + saturationDelta, 0, 100);

  return hslToHex(
    (source.h + hueDelta + 360) % 360,
    nextSaturation,
    clamp(source.l + lightnessDelta, 0, 100)
  );
};

const getRuleSlotOrder = (property: ThemeReplacementRule['property']): ThemeSemanticSlotId[] => {
  if (property === 'color') return ['text', 'mutedText', 'primary', 'accent', 'border'];
  if (property === 'background-color') return ['background', 'surface', 'primary', 'accent', 'border'];
  if (property === 'border-color') return ['border', 'surface', 'background', 'primary', 'accent'];
  return ['background', 'surface', 'text', 'mutedText', 'border', 'primary', 'accent'];
};

const pickReferenceSlot = (
  rule: ThemeReplacementRule,
  originalSlots: ThemeSemanticSlot[],
  nextSlotsById: Partial<Record<ThemeSemanticSlotId, ThemeSemanticSlot>>
) => {
  const preferred = getRuleSlotOrder(rule.property);
  const candidates = originalSlots
    .filter((slot) => preferred.includes(slot.id) && nextSlotsById[slot.id])
    .map((slot) => ({
      slot,
      priority: preferred.indexOf(slot.id),
      distance: getColorDistance(rule.originalColor, slot.originalColor),
    }))
    .sort((left, right) => left.priority - right.priority || left.distance - right.distance);

  return candidates[0]?.slot || null;
};

export const buildPresetExactReplacements = (
  rules: ThemeReplacementRule[],
  originalSlots: ThemeSemanticSlot[],
  nextSlots: ThemeSemanticSlot[]
): ThemeReplacementRule[] => {
  const nextSlotsById = Object.fromEntries(nextSlots.map((slot) => [slot.id, slot])) as Partial<
    Record<ThemeSemanticSlotId, ThemeSemanticSlot>
  >;

  return rules.map((rule) => {
    const referenceSlot = pickReferenceSlot(rule, originalSlots, nextSlotsById);
    if (!referenceSlot) {
      return {
        ...rule,
        enabled: false,
        replacementColor: rule.originalColor,
      };
    }

    const targetSlot = nextSlotsById[referenceSlot.id];
    if (!targetSlot) {
      return {
        ...rule,
        enabled: false,
        replacementColor: rule.originalColor,
      };
    }

    const replacementColor = transformColorBySlotDelta(
      rule.originalColor,
      referenceSlot.originalColor,
      targetSlot.currentColor
    );

    return {
      ...rule,
      replacementColor,
      enabled: normalizeHex(replacementColor) !== normalizeHex(rule.originalColor),
    };
  });
};

export const buildThemePreset = (presetId: string, slots: ThemeSemanticSlot[]): ThemePreset => {
  const presets: Record<string, ThemePreset> = {
    original: {
      id: 'original',
      label: 'Original',
      colors: Object.fromEntries(slots.map((slot) => [slot.id, slot.originalColor])),
    },
    dark: {
      id: 'dark',
      label: 'Midnight',
      colors: {
        background: '#08111F',
        surface: '#0F1B2D',
        text: '#F5F7FA',
        mutedText: '#A8B5C7',
        border: '#22344B',
        primary: '#5EA2FF',
        accent: '#7CE7FF',
      },
    },
    warm: {
      id: 'warm',
      label: 'Sand',
      colors: {
        background: '#F8EFE3',
        surface: '#EFDCC6',
        text: '#4A3422',
        mutedText: '#7A5A43',
        border: '#CDAF8A',
        primary: '#C96B3B',
        accent: '#E2A458',
      },
    },
    ocean: {
      id: 'ocean',
      label: 'Lagoon',
      colors: {
        background: '#E6F4F4',
        surface: '#C9E6E4',
        text: '#143B44',
        mutedText: '#2E6770',
        border: '#7FB8B3',
        primary: '#147D8A',
        accent: '#35B6A5',
      },
    },
    forest: {
      id: 'forest',
      label: 'Forest',
      colors: {
        background: '#EEF3EA',
        surface: '#DDE8D4',
        text: '#203126',
        mutedText: '#516652',
        border: '#9CB48B',
        primary: '#3D7A52',
        accent: '#8E6C3F',
      },
    },
    'high-contrast': {
      id: 'high-contrast',
      label: 'Mono',
      colors: {
        background: '#FFFFFF',
        surface: '#F3F4F6',
        text: '#000000',
        mutedText: '#374151',
        border: '#111827',
        primary: '#111827',
        accent: '#6B7280',
      },
    },
  };

  return presets[presetId] || presets.original;
};

export const exportThemeSession = (session: ThemeSession): ThemeSessionExport => ({
  pageUrl: session.pageUrl,
  pageTitle: session.pageTitle,
  exportedAt: new Date().toISOString(),
  semanticSlots: session.semanticSlots.map((slot) => ({ ...slot, candidateVariables: [...slot.candidateVariables] })),
  exactReplacements: session.exactReplacements
    .filter((rule) => rule.enabled || normalizeHex(rule.originalColor) !== normalizeHex(rule.replacementColor))
    .map((rule) => ({
      ...rule,
      variableNames: [...rule.variableNames],
      sampleSelectors: [...rule.sampleSelectors],
    })),
  gradientReplacements: session.gradientReplacements
    .filter((rule) => rule.enabled || rule.originalValue !== rule.replacementValue)
    .map((rule) => ({
      ...rule,
      sampleSelectors: [...rule.sampleSelectors],
    })),
});
