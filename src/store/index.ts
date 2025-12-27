import { create } from 'zustand';

export interface FontData {
  family: string;
  variants: string[];
  sizes: string[];
  count: number;
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

export interface InspectionData {
  fonts: FontData[];
  colors: ColorData[];
  spacing: number[];
  technologies: string[];
  assets: AssetData[];
  scrollAnimations: ScrollAnimationData[];
  meta: {
    title: string;
    description: string;
    url: string;
  };
}

export interface UserPreferences {
  colorFormat: 'hex' | 'rgb' | 'hsl';
  unitFormat: 'px' | 'rem';
}

interface AppState {
  isInspecting: boolean;
  data: InspectionData;
  preferences: UserPreferences;
  setInspecting: (isInspecting: boolean) => void;
  setData: (data: Partial<InspectionData>) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  reset: () => void;
}

const initialData: InspectionData = {
  fonts: [],
  colors: [],
  spacing: [],
  technologies: [],
  assets: [],
  scrollAnimations: [],
  meta: {
    title: '',
    description: '',
    url: '',
  },
};

const initialPreferences: UserPreferences = {
  colorFormat: 'hex',
  unitFormat: 'px',
};

export const useStore = create<AppState>((set) => ({
  isInspecting: false,
  data: initialData,
  preferences: initialPreferences,
  setInspecting: (isInspecting) => set({ isInspecting }),
  setData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
  setPreferences: (newPrefs) => set((state) => ({ preferences: { ...state.preferences, ...newPrefs } })),
  reset: () => set({ data: initialData, isInspecting: false }),
}));
