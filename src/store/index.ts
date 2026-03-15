import { create } from 'zustand';
import {
  ThemeApplyMode,
  ThemeGradientRule,
  ThemeHistoryEntry,
  ThemeReplacementRule,
  ThemeSemanticSlot,
  ThemeSession,
  createHistorySnapshot,
} from '../utils/themeStudio';

export interface FontSizeData {
  value: string;
  lineHeight: string;
}

export interface FontVariant {
  weight: string;
  style: 'normal' | 'italic';
  sizes: FontSizeData[];
}

export interface FontData {
  family: string;
  variants: FontVariant[];
  source: 'google' | 'adobe' | 'system' | 'custom' | 'unknown';
  elementCount: number;
}

export interface ColorData {
  hex: string;
  rgb: string;
  hsl: string;
  type: 'text' | 'background' | 'border' | 'auto';
  role?: string;
  count: number;
  occurrences?: {
    property: 'color' | 'background-color' | 'border-color';
    count: number;
    sampleSelectors: string[];
  }[];
  cssVariables?: {
    name: string;
    source: 'root' | 'body' | 'inline';
  }[];
  semanticCandidates?: {
    slot: 'background' | 'surface' | 'text' | 'mutedText' | 'border' | 'primary' | 'accent';
    confidence: number;
  }[];
}

export interface AssetData {
  type: 'image' | 'svg' | 'video' | 'background';
  url: string;
  dimensions?: string;
  count: number;
}

export interface ScrollAnimationData {
  id: string;
  library: 'gsap-scrolltrigger' | 'framer-motion' | 'locomotive' | 'aos' | 'scrollmagic' | 'intersection-observer' | 'css-scroll-timeline' | 'custom';
  element: string;
  trigger: {
    element: string;
    start: string | number;
    end: string | number;
    scrub?: boolean | number;
    pin?: boolean;
    toggleActions?: string;
    once?: boolean;
    repeat?: boolean;
    threshold?: number;
  };
  animation: {
    type: 'css' | 'js' | 'transform' | 'opacity' | 'mix';
    properties: string[];
    duration?: number | null;
    easing?: string;
    delay?: number;
    speed?: number;
  };
  markers?: boolean;
  animationName?: string;
  className?: string;
}

export interface RedFlag {
  id: string;
  category: 'seo' | 'ux' | 'accessibility' | 'mobile' | 'performance';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  element?: string;
  count?: number;
  recommendation: string;
  // New detailed fields
  affectedElements?: string[];  // List of element selectors
  fixCode?: string;              // Code snippet to fix the issue
  learnMoreUrl?: string;         // Documentation URL
  impactScore?: number;          // 1-10 impact score
  estimatedImpact?: string;      // e.g., "Could improve LCP by ~500ms"
  pageSection?: 'head' | 'header' | 'main' | 'footer' | 'unknown';
}

export interface FlowStep {
  id: string;
  timestamp: number;
  type: 'click' | 'navigation' | 'input';
  selector: string;
  label: string;
  url: string;
  description: string;
}

export interface InspectionData {
  fonts: FontData[];
  colors: ColorData[];
  spacing: number[];
  assets: AssetData[];
  scrollAnimations: ScrollAnimationData[];
  redFlags: RedFlag[];
  htmlStructure?: {
    cleanHTML: string;
    sectionCount: number;
    depth: number;
    elementCount: number;
  };
  siteCloneData?: {
    metadata: { title: string; viewport: string; url: string; favicon: string; charset: string };
    html: string;
    structure: string;
    components: string;
    css: string;
    criticalCSS: string;
    computedStyles: string;
    colors: { color: string; count: number }[];
    fonts: { family: string; weights: string[] }[];
    spacing: string[];
    layoutType: string;
    containerWidth: string;
    gridSystem: string;
    shadows: string[];
    blurs: string[];
    transforms: string;
    filters: string;
    animations: string;
    images: { src: string; alt: string; width: number; height: number }[];
    backgroundImages: string[];
    videos: string[];
    svgs: { desc: string; code: string }[];
    externalFonts: string[];
    externalCSS: string[];
    scripts: string[];
    interactive: string;
    forms: string;
    jsFeatures: string;
    breakpoints: string;
    implementationNotes: string;
  };
  meta: {
    title: string;
    description: string;
    url: string;
  };
}

export interface UserPreferences {
  colorFormat: 'hex' | 'rgb' | 'hsl';
  unitFormat: 'px' | 'rem';
  autoRefresh: boolean;
}

interface AppState {
  isInspecting: boolean;
  data: InspectionData;
  preferences: UserPreferences;
  themeSession: ThemeSession | null;
  redFlagsLoaded: boolean;
  scrollAnimationsLoaded: boolean;
  setInspecting: (isInspecting: boolean) => void;
  setData: (data: Partial<InspectionData>) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setThemeSession: (session: ThemeSession | null) => void;
  updateThemeSession: (updates: Partial<ThemeSession>) => void;
  pushThemeHistory: (
    semanticSlots: ThemeSemanticSlot[],
    exactReplacements: ThemeReplacementRule[],
    gradientReplacements: ThemeGradientRule[],
    applyMode: ThemeApplyMode,
    fontPresetId: string,
    fontFamily: string,
    fontStylesheetUrl: string
  ) => void;
  restoreThemeHistory: (historyEntry: ThemeHistoryEntry, historyIndex: number) => void;
  setRedFlagsLoaded: (loaded: boolean) => void;
  setScrollAnimationsLoaded: (loaded: boolean) => void;
  reset: () => void;
  resetPreferences: () => void;
}

const normalizeThemeSession = (themeSession: ThemeSession | null): ThemeSession | null => {
  if (!themeSession) return null;

  return {
    ...themeSession,
    fontPresetId: themeSession.fontPresetId || 'original',
    fontFamily: themeSession.fontFamily || '',
    fontStylesheetUrl: themeSession.fontStylesheetUrl || '',
    gradientReplacements: themeSession.gradientReplacements || [],
    history: (themeSession.history || []).map((entry) => ({
      ...entry,
      gradientReplacements: entry.gradientReplacements || [],
      fontPresetId: entry.fontPresetId || 'original',
      fontFamily: entry.fontFamily || '',
      fontStylesheetUrl: entry.fontStylesheetUrl || '',
    })),
  };
};

const initialData: InspectionData = {
  fonts: [],
  colors: [],
  spacing: [],
  assets: [],
  scrollAnimations: [],
  redFlags: [],
  meta: {
    title: '',
    description: '',
    url: '',
  },
};

const initialPreferences: UserPreferences = {
  colorFormat: 'hex',
  unitFormat: 'px',
  autoRefresh: true,
};

export const useStore = create<AppState>((set) => ({
  isInspecting: false,
  data: initialData,
  preferences: initialPreferences,
  themeSession: null,
  redFlagsLoaded: false,
  scrollAnimationsLoaded: false,
  setInspecting: (isInspecting) => set({ isInspecting }),
  setData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
  setPreferences: (newPrefs) => set((state) => ({ preferences: { ...state.preferences, ...newPrefs } })),
  setThemeSession: (themeSession) => set({ themeSession: normalizeThemeSession(themeSession) }),
  updateThemeSession: (updates) =>
    set((state) => ({
      themeSession: state.themeSession
        ? normalizeThemeSession({
            ...state.themeSession,
            ...updates,
            lastUpdatedAt: Date.now(),
          })
        : null,
    })),
  pushThemeHistory: (semanticSlots, exactReplacements, gradientReplacements, applyMode, fontPresetId, fontFamily, fontStylesheetUrl) =>
    set((state) => {
      if (!state.themeSession) return {};

      const nextHistory = state.themeSession.history.slice(0, state.themeSession.historyIndex + 1);
      nextHistory.push(
        createHistorySnapshot(
          semanticSlots,
          exactReplacements,
          gradientReplacements,
          applyMode,
          fontPresetId,
          fontFamily,
          fontStylesheetUrl
        )
      );

      return {
        themeSession: {
          ...state.themeSession,
          semanticSlots,
          exactReplacements,
          gradientReplacements,
          applyMode,
          fontPresetId,
          fontFamily,
          fontStylesheetUrl,
          history: nextHistory,
          historyIndex: nextHistory.length - 1,
          isPreviewActive: true,
          lowConfidence: semanticSlots.some((slot) => slot.uncertain),
          lastUpdatedAt: Date.now(),
        },
      };
    }),
  restoreThemeHistory: (historyEntry, historyIndex) =>
    set((state) => ({
      themeSession: state.themeSession
        ? {
            ...state.themeSession,
            semanticSlots: historyEntry.semanticSlots,
            exactReplacements: historyEntry.exactReplacements,
            gradientReplacements: historyEntry.gradientReplacements || [],
            applyMode: historyEntry.applyMode,
            fontPresetId: historyEntry.fontPresetId || 'original',
            fontFamily: historyEntry.fontFamily || '',
            fontStylesheetUrl: historyEntry.fontStylesheetUrl || '',
            historyIndex,
            isPreviewActive: true,
            lowConfidence: historyEntry.semanticSlots.some((slot) => slot.uncertain),
            lastUpdatedAt: Date.now(),
          }
        : null,
    })),
  setRedFlagsLoaded: (loaded) => set({ redFlagsLoaded: loaded }),
  setScrollAnimationsLoaded: (loaded) => set({ scrollAnimationsLoaded: loaded }),
  reset: () => {
    // Only reset data and session flags, preserve preferences and localStorage
    set({ 
        data: initialData, 
        themeSession: null,
        isInspecting: false, 
        redFlagsLoaded: false, 
        scrollAnimationsLoaded: false 
    });
  },
  resetPreferences: () => {
    localStorage.removeItem('di-highlightColor');
    localStorage.removeItem('di-theme');
    localStorage.removeItem('di-autoRefresh');
    set({ preferences: initialPreferences });
  }
}));
