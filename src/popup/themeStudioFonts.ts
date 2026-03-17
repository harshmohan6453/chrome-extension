import rawThemeStudioFonts from './themeStudioFonts.json';

export type FontPresetSource = 'system' | 'google';

export interface ThemeStudioFontPreset {
  id: string;
  label: string;
  source: FontPresetSource;
  stack: string;
  stylesheetUrl: string;
  sample: string;
  subtitle: string;
}

const FALLBACK_FONT_PRESET: ThemeStudioFontPreset = {
  id: 'original',
  label: 'Original',
  source: 'system',
  stack: '',
  stylesheetUrl: '',
  sample: 'Aa',
  subtitle: 'Keep the detected page typography.',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFontPresetSource = (value: unknown): value is FontPresetSource =>
  value === 'system' || value === 'google';

const parseThemeStudioFonts = (input: unknown): ThemeStudioFontPreset[] => {
  if (!Array.isArray(input)) {
    throw new Error('Theme Studio font catalog must be an array.');
  }

  const seenIds = new Set<string>();
  const parsed = input.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Theme Studio font preset at index ${index} must be an object.`);
    }

    const { id, label, source, stack, stylesheetUrl, sample, subtitle } = entry;
    if (
      typeof id !== 'string' ||
      typeof label !== 'string' ||
      !isFontPresetSource(source) ||
      typeof stack !== 'string' ||
      typeof stylesheetUrl !== 'string' ||
      typeof sample !== 'string' ||
      typeof subtitle !== 'string'
    ) {
      throw new Error(`Theme Studio font preset "${String(id ?? index)}" is invalid.`);
    }

    if (seenIds.has(id)) {
      throw new Error(`Theme Studio font preset id "${id}" is duplicated.`);
    }
    seenIds.add(id);

    return {
      id,
      label,
      source,
      stack,
      stylesheetUrl,
      sample,
      subtitle,
    };
  });

  if (!parsed.some((preset) => preset.id === FALLBACK_FONT_PRESET.id)) {
    throw new Error('Theme Studio font catalog must include the "original" preset.');
  }

  return parsed;
};

const loadThemeStudioFonts = (): ThemeStudioFontPreset[] => {
  try {
    return parseThemeStudioFonts(rawThemeStudioFonts);
  } catch (error) {
    console.error(
      'Failed to load Theme Studio font catalog. Falling back to the default preset.',
      error
    );
    return [FALLBACK_FONT_PRESET];
  }
};

const parsedThemeStudioFonts = loadThemeStudioFonts();

export const FONT_PRESET_IDS = parsedThemeStudioFonts.map((preset) => preset.id);

export const FONT_PRESETS = Object.fromEntries(
  parsedThemeStudioFonts.map((preset) => [preset.id, preset])
) as Record<string, ThemeStudioFontPreset>;

export const getFontPresetById = (id: string): ThemeStudioFontPreset =>
  FONT_PRESETS[id] || FONT_PRESETS[FALLBACK_FONT_PRESET.id] || FALLBACK_FONT_PRESET;
