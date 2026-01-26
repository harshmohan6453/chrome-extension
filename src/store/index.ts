import { create } from 'zustand';

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
  redFlagsLoaded: boolean;
  scrollAnimationsLoaded: boolean;
  setInspecting: (isInspecting: boolean) => void;
  setData: (data: Partial<InspectionData>) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setRedFlagsLoaded: (loaded: boolean) => void;
  setScrollAnimationsLoaded: (loaded: boolean) => void;
  reset: () => void;
  resetPreferences: () => void;
}

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
  autoRefresh: false,
};

export const useStore = create<AppState>((set) => ({
  isInspecting: false,
  data: initialData,
  preferences: initialPreferences,
  redFlagsLoaded: false,
  scrollAnimationsLoaded: false,
  setInspecting: (isInspecting) => set({ isInspecting }),
  setData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
  setPreferences: (newPrefs) => set((state) => ({ preferences: { ...state.preferences, ...newPrefs } })),
  setRedFlagsLoaded: (loaded) => set({ redFlagsLoaded: loaded }),
  setScrollAnimationsLoaded: (loaded) => set({ scrollAnimationsLoaded: loaded }),
  reset: () => {
    // Only reset data and session flags, preserve preferences and localStorage
    set({ 
        data: initialData, 
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