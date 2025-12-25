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

export interface InspectionData {
  fonts: FontData[];
  colors: ColorData[];
  spacing: number[];
  technologies: string[];
  assets: AssetData[];
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
