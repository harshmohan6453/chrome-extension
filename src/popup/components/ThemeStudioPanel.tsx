import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Paintbrush2,
  Palette,
  Redo2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Type,
  Undo2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../../store';
import {
  buildPresetExactReplacements,
  ThemeGradientRule,
  ThemeLocateRequest,
  ThemeLocateScope,
  ThemeReplacementRule,
  ThemeSemanticSlot,
  ThemeSession,
  ThemeSessionExport,
  ThemeElementUpdateTarget,
  buildThemePreset,
  createHistorySnapshot,
  exportThemeSession,
  getContrastBadge,
  normalizeHex,
} from '../../utils/themeStudio';

interface ThemeStudioPanelProps {
  isSidePanel: boolean;
  openSidePanel: (targetTab?: 'overview' | 'themeStudio') => Promise<void>;
}

type WorkbenchSection = 'presets' | 'fonts' | 'slots' | 'gradients' | 'rules';
type StudioFilter = 'all' | 'changed' | 'enabled' | 'uncertain' | 'variables';
type PresetId = (typeof PRESET_IDS)[number];
type FontPresetId = (typeof FONT_PRESET_IDS)[number];
type FontPresetSource = 'system' | 'google';

interface GradientColorStop {
  raw: string;
  hex: string;
  alpha: number;
  start: number;
  end: number;
}

interface RailItem {
  id: string;
  title: string;
  subtitle: string;
  badges: string[];
  searchText: string;
  changed?: boolean;
  enabled?: boolean;
  uncertain?: boolean;
  hasVariables?: boolean;
}

interface ThemeLocateMeta {
  itemType: ThemeLocateRequest['itemType'];
  itemId: string;
  selectors: string[];
  scope: ThemeLocateScope;
  canLocate: boolean;
  canCreateExactRule: boolean;
  matchColor?: string;
  matchProperty?: ThemeReplacementRule['property'];
}

interface ThemeLocateState {
  status: 'idle' | 'previewing' | 'located' | 'not_found' | 'element-update' | 'error';
  count?: number;
  selector?: string | null;
}

interface ElementUpdateSession {
  itemId: string;
  target: ThemeElementUpdateTarget;
  selectedProperty: 'color' | 'backgroundColor' | 'borderColor';
}

const PRESET_IDS = ['original', 'dark', 'warm', 'ocean', 'forest', 'high-contrast'] as const;
const FONT_PRESET_IDS = [
  'original',
  'system-sans',
  'editorial-serif',
  'humanist',
  'rounded',
  'mono',
  'inter',
  'manrope',
  'space-grotesk',
  'dm-sans',
  'plus-jakarta-sans',
  'playfair-display',
  'merriweather',
  'source-serif-4',
  'jetbrains-mono',
] as const;
const SHOW_LOCATE_ACTIONS = false;
const SHOW_HOVER_LOCATE_PREVIEW = false;

const FONT_PRESETS = {
  original: {
    id: 'original',
    label: 'Original',
    source: 'system' as FontPresetSource,
    stack: '',
    stylesheetUrl: '',
    sample: 'Aa',
    subtitle: 'Keep the detected page typography.',
  },
  'system-sans': {
    id: 'system-sans',
    label: 'System Sans',
    source: 'system' as FontPresetSource,
    stack: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    stylesheetUrl: '',
    sample: 'Aa',
    subtitle: 'Clean modern UI stack.',
  },
  'editorial-serif': {
    id: 'editorial-serif',
    label: 'Editorial Serif',
    source: 'system' as FontPresetSource,
    stack: `Georgia, "Times New Roman", serif`,
    stylesheetUrl: '',
    sample: 'Ag',
    subtitle: 'Readable serif for content-heavy pages.',
  },
  humanist: {
    id: 'humanist',
    label: 'Humanist',
    source: 'system' as FontPresetSource,
    stack: `"Trebuchet MS", "Segoe UI", sans-serif`,
    stylesheetUrl: '',
    sample: 'Aa',
    subtitle: 'Softer sans with more character.',
  },
  rounded: {
    id: 'rounded',
    label: 'Rounded',
    source: 'system' as FontPresetSource,
    stack: `"Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", sans-serif`,
    stylesheetUrl: '',
    sample: 'Aa',
    subtitle: 'Friendlier rounded fallback stack.',
  },
  mono: {
    id: 'mono',
    label: 'Mono',
    source: 'system' as FontPresetSource,
    stack: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`,
    stylesheetUrl: '',
    sample: '0x',
    subtitle: 'Technical mono treatment.',
  },
  inter: {
    id: 'inter',
    label: 'Inter',
    source: 'google' as FontPresetSource,
    stack: `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    sample: 'Aa',
    subtitle: 'Neutral UI sans from Google Fonts.',
  },
  manrope: {
    id: 'manrope',
    label: 'Manrope',
    source: 'google' as FontPresetSource,
    stack: `"Manrope", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
    sample: 'Aa',
    subtitle: 'Modern sans with a little more personality.',
  },
  'space-grotesk': {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    source: 'google' as FontPresetSource,
    stack: `"Space Grotesk", "Segoe UI", sans-serif`,
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap',
    sample: 'Aa',
    subtitle: 'Sharper display-oriented grotesk.',
  },
  'dm-sans': {
    id: 'dm-sans',
    label: 'DM Sans',
    source: 'google' as FontPresetSource,
    stack: `"DM Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
    sample: 'Aa',
    subtitle: 'Friendly geometric sans for product pages.',
  },
  'plus-jakarta-sans': {
    id: 'plus-jakarta-sans',
    label: 'Plus Jakarta Sans',
    source: 'google' as FontPresetSource,
    stack: `"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    sample: 'Aa',
    subtitle: 'Balanced sans that reads well in UI and content.',
  },
  'playfair-display': {
    id: 'playfair-display',
    label: 'Playfair Display',
    source: 'google' as FontPresetSource,
    stack: `"Playfair Display", Georgia, serif`,
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
    sample: 'Ag',
    subtitle: 'Elegant serif for editorial or luxury pages.',
  },
  merriweather: {
    id: 'merriweather',
    label: 'Merriweather',
    source: 'google' as FontPresetSource,
    stack: `"Merriweather", Georgia, serif`,
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
    sample: 'Ag',
    subtitle: 'Readable serif built for long-form copy.',
  },
  'source-serif-4': {
    id: 'source-serif-4',
    label: 'Source Serif 4',
    source: 'google' as FontPresetSource,
    stack: `"Source Serif 4", Georgia, serif`,
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&display=swap',
    sample: 'Ag',
    subtitle: 'Clean contemporary serif with broad language support.',
  },
  'jetbrains-mono': {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    source: 'google' as FontPresetSource,
    stack: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap',
    sample: '0x',
    subtitle: 'Developer-focused monospace with a cleaner rhythm.',
  },
} as const;

const badgeToneClasses = {
  good: 'bg-green-500/10 text-green-700 border-green-500/30',
  warn: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  bad: 'bg-red-500/10 text-red-700 border-red-500/30',
};

const SECTION_META: Record<
  WorkbenchSection,
  { label: string; icon: typeof Sparkles; accent: string; description: string }
> = {
  presets: {
    label: 'Presets',
    icon: Sparkles,
    accent: 'text-amber-600',
    description: 'Quickly restyle the page with curated palettes.',
  },
  fonts: {
    label: 'Fonts',
    icon: Type,
    accent: 'text-violet-600',
    description: 'Swap page typography with built-in stacks and curated free fonts.',
  },
  slots: {
    label: 'Semantic Slots',
    icon: Palette,
    accent: 'text-blue-600',
    description: 'Edit core theme tokens like background, text, and primary.',
  },
  gradients: {
    label: 'Gradients',
    icon: Paintbrush2,
    accent: 'text-orange-600',
    description: 'Adjust text and background gradients with guided controls.',
  },
  rules: {
    label: 'Exact Rules',
    icon: SlidersHorizontal,
    accent: 'text-emerald-600',
    description: 'Fine-tune detected exact color replacements.',
  },
};

const FILTER_LABELS: Record<StudioFilter, string> = {
  all: 'All',
  changed: 'Changed',
  enabled: 'Enabled',
  uncertain: 'Uncertain',
  variables: 'Has Variables',
};

const FILTERS_BY_SECTION: Record<WorkbenchSection, StudioFilter[]> = {
  presets: ['all'],
  fonts: ['all'],
  slots: ['all', 'changed', 'uncertain', 'variables'],
  gradients: ['all', 'changed'],
  rules: ['all', 'changed', 'enabled', 'variables'],
};

const GRADIENT_COLOR_TOKEN_REGEX =
  /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|\btransparent\b/g;

const transparencyBackdropStyle = {
  backgroundImage: 'repeating-conic-gradient(rgba(148, 163, 184, 0.28) 0% 25%, rgba(15, 23, 42, 0.52) 0% 50%)',
  backgroundSize: '14px 14px',
};

const parseResolvedRgb = (value: string) => {
  const channels = value.match(/\d+(\.\d+)?/g);
  if (!channels || channels.length < 3) return null;

  const [r, g, b] = channels.slice(0, 3).map((channel) => Math.max(0, Math.min(255, Math.round(Number(channel)))));
  const alpha = channels[3] ? Math.max(0, Math.min(1, Number(channels[3]))) : 1;

  return {
    alpha,
    hex: `#${[r, g, b]
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`,
  };
};

const resolveCssColor = (value: string) => {
  if (value.trim().toLowerCase() === 'transparent') {
    return { hex: '#000000', alpha: 0 };
  }
  if (!CSS.supports('color', value)) return null;

  const probe = document.createElement('span');
  probe.style.color = value;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return parseResolvedRgb(resolved);
};

const extractGradientColorStops = (gradient: string): GradientColorStop[] =>
  Array.from(gradient.matchAll(GRADIENT_COLOR_TOKEN_REGEX))
    .map((match) => {
      const raw = match[0];
      const start = match.index ?? 0;
      const end = start + raw.length;
      const resolved = resolveCssColor(raw);
      if (!resolved) return null;
      return { raw, hex: resolved.hex, alpha: resolved.alpha, start, end };
    })
    .filter((stop): stop is GradientColorStop => Boolean(stop));

const formatGradientStopReplacement = (stop: GradientColorStop, nextHex: string) => {
  if (stop.alpha <= 0) return 'transparent';
  if (stop.alpha >= 1) return nextHex.toUpperCase();

  const normalized = nextHex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const alphaLabel = Number(stop.alpha.toFixed(3)).toString();
  return `rgba(${r}, ${g}, ${b}, ${alphaLabel})`;
};

const replaceGradientColorStop = (gradient: string, stopIndex: number, nextHex: string) => {
  const stops = extractGradientColorStops(gradient);
  const target = stops[stopIndex];
  if (!target) return gradient;
  const replacement = formatGradientStopReplacement(target, nextHex);
  return `${gradient.slice(0, target.start)}${replacement}${gradient.slice(target.end)}`;
};

const getGradientPreviewStyle = (gradient: string) => ({
  backgroundImage: `${gradient}, ${transparencyBackdropStyle.backgroundImage}`,
  backgroundSize: 'cover, 14px 14px',
  backgroundPosition: 'center, center',
});

const getRulePropertyLabel = (property: ThemeReplacementRule['property']) => {
  if (property === 'color') return 'Text Color';
  if (property === 'background-color') return 'Background Color';
  if (property === 'border-color') return 'Border Color';
  return 'Universal Color';
};

const gradientHasAlpha = (rule: ThemeGradientRule) =>
  extractGradientColorStops(rule.replacementValue).some((stop) => stop.alpha > 0 && stop.alpha < 1);

const gradientHasTransparentStop = (rule: ThemeGradientRule) =>
  extractGradientColorStops(rule.replacementValue).some((stop) => stop.alpha <= 0);

const matchesFilter = (item: RailItem, filter: StudioFilter) => {
  if (filter === 'all') return true;
  if (filter === 'changed') return Boolean(item.changed);
  if (filter === 'enabled') return Boolean(item.enabled);
  if (filter === 'uncertain') return Boolean(item.uncertain);
  if (filter === 'variables') return Boolean(item.hasVariables);
  return true;
};

const matchesSearch = (item: RailItem, searchQuery: string) => {
  if (!searchQuery.trim()) return true;
  return item.searchText.toLowerCase().includes(searchQuery.trim().toLowerCase());
};

const SectionButton = ({
  active,
  count,
  section,
  onClick,
}: {
  active: boolean;
  count: number;
  section: WorkbenchSection;
  onClick: () => void;
}) => {
  const meta = SECTION_META[section];

  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-2xl border px-3 py-3 text-left transition-all',
        active
          ? 'border-primary bg-card text-foreground shadow-[4px_4px_0_rgba(16,24,40,0.14)]'
          : 'border-border/70 bg-background/80 text-muted-foreground hover:border-primary/40 hover:bg-card'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={clsx(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background/80',
              meta.accent
            )}
          >
            <meta.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{meta.label}</div>
            <div className="text-[11px] text-muted-foreground">
              {count} {count === 1 ? 'item' : 'items'}
            </div>
          </div>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
          {count}
        </span>
      </div>
    </button>
  );
};

const FilterChip = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={clsx(
      'rounded-full border px-3 py-1 text-xs font-bold transition-colors',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-background text-muted-foreground hover:text-foreground'
    )}
  >
    {label}
  </button>
);

const RailRow = ({
  active,
  item,
  onClick,
  onMouseEnter,
  onMouseLeave,
  preview,
  footer,
  expandedContent,
}: {
  active: boolean;
  item: RailItem;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  preview?: ReactNode;
  footer?: ReactNode;
  expandedContent?: ReactNode;
}) => (
  <div
    className={clsx(
      'overflow-hidden rounded-2xl border-2 transition-all',
      active
        ? 'border-primary bg-card shadow-[4px_4px_0_rgba(16,24,40,0.16)]'
        : 'border-border/70 bg-background/80 hover:border-primary/40 hover:bg-card'
    )}
  >
    <button onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className="w-full p-3 text-left">
      <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate font-bold text-foreground">{item.title}</div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{item.subtitle}</div>
      </div>
        {preview && <div className="shrink-0">{preview}</div>}
      </div>
      {item.badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.badges.slice(0, 3).map((badge) => (
            <span
              key={`${item.id}-${badge}`}
              className="rounded-full border border-border bg-secondary/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </button>
    {footer && <div className="border-t border-border/70 bg-background/30 px-3 py-2">{footer}</div>}
    {expandedContent && <div className="border-t border-border/80 bg-background/50 p-4 md:hidden">{expandedContent}</div>}
  </div>
);

const AccordionSection = ({
  title,
  eyebrow,
  summary,
  expanded,
  onToggle,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <section className="rounded-2xl border border-border bg-background/70">
    <div className="flex items-start justify-between gap-3 px-4 py-4">
      <button onClick={onToggle} className="min-w-0 flex-1 text-left">
        {eyebrow && <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{eyebrow}</div>}
        <div className="mt-1 flex items-center gap-2">
          <div className="font-bold text-foreground">{title}</div>
          <ChevronDown className={clsx('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        </div>
        {summary && <div className="mt-1 text-sm text-muted-foreground">{summary}</div>}
      </button>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
    {expanded && <div className="border-t border-border/80 px-4 py-4">{children}</div>}
  </section>
);

const EditorShell = ({
  eyebrow,
  title,
  summary,
  badges,
  actions,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  badges?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) => (
  <section className="rounded-[28px] border-2 border-foreground/20 bg-card neo-shadow overflow-hidden min-h-[620px] flex flex-col">
    <div className="border-b border-border/80 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{eyebrow}</div>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-foreground">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{summary}</p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {badges && <div className="mt-4 flex flex-wrap gap-2">{badges}</div>}
    </div>
    <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>
    {footer && <div className="sticky bottom-0 z-10 border-t border-border/80 bg-background/90 px-5 py-4 backdrop-blur">{footer}</div>}
  </section>
);

export const ThemeStudioPanel = ({ isSidePanel, openSidePanel }: ThemeStudioPanelProps) => {
  const { data, themeSession, setThemeSession, updateThemeSession, pushThemeHistory, restoreThemeHistory } = useStore();
  const [initializing, setInitializing] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [gradientDrafts, setGradientDrafts] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<WorkbenchSection>('slots');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StudioFilter>('all');
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({});
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [locateStates, setLocateStates] = useState<Record<string, ThemeLocateState>>({});
  const [elementUpdateSession, setElementUpdateSession] = useState<ElementUpdateSession | null>(null);
  const [elementUpdateDraftColor, setElementUpdateDraftColor] = useState<string | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const activeHoverItemRef = useRef<string | null>(null);

  const initializeThemeSession = async (tabId?: number) => {
    const resolvedTabId =
      typeof tabId === 'number'
        ? tabId
        : (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;

    if (!resolvedTabId) return null;

    let response: any;
    try {
      response = await chrome.tabs.sendMessage(resolvedTabId, { action: 'INIT_THEME_SESSION' });
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: resolvedTabId },
        files: ['content.js'],
      });
      response = await chrome.tabs.sendMessage(resolvedTabId, { action: 'INIT_THEME_SESSION' });
    }

    if (response?.session) {
      setThemeSession(response.session as ThemeSession);
      return response.session as ThemeSession;
    }

    return null;
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setInitializing(true);
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        if (themeSession && themeSession.pageUrl === tab.url && themeSession.semanticSlots.length > 0) {
          setInitializing(false);
          return;
        }

        const session = await initializeThemeSession(tab.id);
        if (!cancelled && session) {
          setThemeSession(session);
        }
      } catch (error) {
        console.error('Failed to initialize theme session', error);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [isSidePanel, themeSession?.pageUrl, themeSession?.semanticSlots.length, setThemeSession]);

  useEffect(() => {
    if (!themeSession) {
      setGradientDrafts({});
      return;
    }

    setGradientDrafts(
      Object.fromEntries(themeSession.gradientReplacements.map((rule) => [rule.id, rule.replacementValue]))
    );
  }, [themeSession]);

  const sendThemePatch = async (
    payload:
        | {
            action: 'APPLY_THEME_PATCH';
            semanticSlots?: ThemeSemanticSlot[];
            exactReplacements?: ThemeReplacementRule[];
            gradientReplacements?: ThemeGradientRule[];
            applyMode?: ThemeSession['applyMode'];
            fontPresetId?: string;
            fontFamily?: string;
            fontStylesheetUrl?: string;
            isPreviewActive?: boolean;
          }
      | { action: 'APPLY_THEME_PRESET'; semanticSlots: ThemeSemanticSlot[] }
        | {
            action: 'UNDO_THEME_PATCH';
            semanticSlots: ThemeSemanticSlot[];
            exactReplacements: ThemeReplacementRule[];
            gradientReplacements: ThemeGradientRule[];
            applyMode: ThemeSession['applyMode'];
            fontPresetId: string;
            fontFamily: string;
            fontStylesheetUrl: string;
          }
        | {
            action: 'REDO_THEME_PATCH';
            semanticSlots: ThemeSemanticSlot[];
            exactReplacements: ThemeReplacementRule[];
            gradientReplacements: ThemeGradientRule[];
            applyMode: ThemeSession['applyMode'];
            fontPresetId: string;
            fontFamily: string;
            fontStylesheetUrl: string;
          }
      | { action: 'RESET_THEME_SESSION' }
      | { action: 'EXPORT_THEME_SESSION' }
  ) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;

    const send = () => chrome.tabs.sendMessage(tab.id!, payload);

    try {
      const response: any = await send();
      if (response?.status === 'stale-context') {
        await initializeThemeSession(tab.id);
        return await send();
      }

      const requiresThemeSession = payload.action !== 'EXPORT_THEME_SESSION';
      if (requiresThemeSession && !response?.session && payload.action !== 'RESET_THEME_SESSION') {
        await initializeThemeSession(tab.id);
        return await send();
      }

      return response;
    } catch {
      await initializeThemeSession(tab.id);
      return send();
    }
  };

  const sendThemeStudioAction = async (
    payload:
      | { action: 'THEME_CLEAR_HIGHLIGHTS' }
      | { action: 'THEME_HIGHLIGHT_MATCHES'; payload: ThemeLocateRequest }
      | { action: 'THEME_LOCATE_MATCH'; payload: ThemeLocateRequest }
      | { action: 'THEME_START_ELEMENT_UPDATE'; payload: ThemeLocateRequest }
  ) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;

    const send = () => chrome.tabs.sendMessage(tab.id!, payload);

    try {
      const response: any = await send();
      if (response?.status === 'stale-context') {
        await initializeThemeSession(tab.id);
        return await send();
      }
      return response;
    } catch {
      await initializeThemeSession(tab.id);
      return send();
    }
  };

  const applySemanticSlots = async (nextSlots: ThemeSemanticSlot[]) => {
    if (!themeSession) return;
    const nextRules = themeSession.exactReplacements.map((rule) => ({ ...rule }));
    const nextGradientRules = themeSession.gradientReplacements.map((rule) => ({ ...rule }));
    pushThemeHistory(
      nextSlots,
      nextRules,
      nextGradientRules,
      themeSession.applyMode,
      themeSession.fontPresetId,
      themeSession.fontFamily,
      themeSession.fontStylesheetUrl
    );
    const response = await sendThemePatch({
      action: 'APPLY_THEME_PATCH',
      semanticSlots: nextSlots,
      exactReplacements: nextRules,
      gradientReplacements: nextGradientRules,
      applyMode: themeSession.applyMode,
      isPreviewActive: true,
    });
    if (response?.session) {
      const session = response.session as ThemeSession;
      updateThemeSession({
        gradientReplacements: session.gradientReplacements,
        trackedNodeCount: session.trackedNodeCount,
        applyMode: session.applyMode,
        isPreviewActive: session.isPreviewActive,
      });
    }
  };

  const applyExactRules = async (nextRules: ThemeReplacementRule[]) => {
    if (!themeSession) return;
    const nextSlots = themeSession.semanticSlots.map((slot) => ({ ...slot }));
    const nextGradientRules = themeSession.gradientReplacements.map((rule) => ({ ...rule }));
    pushThemeHistory(
      nextSlots,
      nextRules,
      nextGradientRules,
      themeSession.applyMode,
      themeSession.fontPresetId,
      themeSession.fontFamily,
      themeSession.fontStylesheetUrl
    );
    const response = await sendThemePatch({
      action: 'APPLY_THEME_PATCH',
      semanticSlots: nextSlots,
      exactReplacements: nextRules,
      gradientReplacements: nextGradientRules,
      applyMode: themeSession.applyMode,
      isPreviewActive: true,
    });
    if (response?.session) {
      const session = response.session as ThemeSession;
      updateThemeSession({
        gradientReplacements: session.gradientReplacements,
        trackedNodeCount: session.trackedNodeCount,
        applyMode: session.applyMode,
        isPreviewActive: session.isPreviewActive,
      });
    }
  };

  const applyGradientRules = async (nextGradientRules: ThemeGradientRule[]) => {
    if (!themeSession) return;
    const nextSlots = themeSession.semanticSlots.map((slot) => ({ ...slot }));
    const nextRules = themeSession.exactReplacements.map((rule) => ({ ...rule }));
    pushThemeHistory(
      nextSlots,
      nextRules,
      nextGradientRules,
      themeSession.applyMode,
      themeSession.fontPresetId,
      themeSession.fontFamily,
      themeSession.fontStylesheetUrl
    );
    const response = await sendThemePatch({
      action: 'APPLY_THEME_PATCH',
      semanticSlots: nextSlots,
      exactReplacements: nextRules,
      gradientReplacements: nextGradientRules,
      applyMode: themeSession.applyMode,
      isPreviewActive: true,
    });
    if (response?.session) {
      const session = response.session as ThemeSession;
      updateThemeSession({
        gradientReplacements: session.gradientReplacements,
        trackedNodeCount: session.trackedNodeCount,
        applyMode: session.applyMode,
        isPreviewActive: session.isPreviewActive,
      });
    }
  };

  const handlePreset = async (presetId: PresetId) => {
    if (!themeSession) return;
    const preset = buildThemePreset(presetId, themeSession.semanticSlots);
    const nextSlots = themeSession.semanticSlots.map((slot) => ({
      ...slot,
      currentColor: preset.colors[slot.id] || slot.originalColor,
    }));
    const nextRules =
      presetId === 'original'
        ? themeSession.exactReplacements.map((rule) => ({
            ...rule,
            enabled: false,
            replacementColor: rule.originalColor,
          }))
        : buildPresetExactReplacements(themeSession.exactReplacements, themeSession.semanticSlots, nextSlots);
    const nextGradientRules = themeSession.gradientReplacements.map((rule) => ({
      ...rule,
      replacementValue: rule.originalValue,
      enabled: false,
    }));

    pushThemeHistory(
      nextSlots,
      nextRules,
      nextGradientRules,
      themeSession.applyMode,
      themeSession.fontPresetId,
      themeSession.fontFamily,
      themeSession.fontStylesheetUrl
    );
    const response = await sendThemePatch({
      action: 'APPLY_THEME_PATCH',
      semanticSlots: nextSlots,
      exactReplacements: nextRules,
      gradientReplacements: nextGradientRules,
      applyMode: themeSession.applyMode,
      isPreviewActive: true,
    });
    if (response?.session) {
      const session = response.session as ThemeSession;
      updateThemeSession({
        gradientReplacements: session.gradientReplacements,
        trackedNodeCount: session.trackedNodeCount,
        applyMode: session.applyMode,
        isPreviewActive: session.isPreviewActive,
      });
    }
  };

  const handleFontPreset = async (fontPresetId: FontPresetId) => {
    if (!themeSession) return;
    const preset = FONT_PRESETS[fontPresetId];
    const nextSlots = themeSession.semanticSlots.map((slot) => ({ ...slot }));
    const nextRules = themeSession.exactReplacements.map((rule) => ({ ...rule }));
    const nextGradientRules = themeSession.gradientReplacements.map((rule) => ({ ...rule }));

    pushThemeHistory(
      nextSlots,
      nextRules,
      nextGradientRules,
      themeSession.applyMode,
      preset.id,
      preset.stack,
      preset.stylesheetUrl
    );
    const response = await sendThemePatch({
      action: 'APPLY_THEME_PATCH',
      semanticSlots: nextSlots,
      exactReplacements: nextRules,
      gradientReplacements: nextGradientRules,
      applyMode: themeSession.applyMode,
      fontPresetId: preset.id,
      fontFamily: preset.stack,
      fontStylesheetUrl: preset.stylesheetUrl,
      isPreviewActive: true,
    });
    if (response?.session) {
      const session = response.session as ThemeSession;
      updateThemeSession({
        gradientReplacements: session.gradientReplacements,
        trackedNodeCount: session.trackedNodeCount,
        applyMode: session.applyMode,
        fontPresetId: session.fontPresetId,
        fontFamily: session.fontFamily,
        fontStylesheetUrl: session.fontStylesheetUrl,
        isPreviewActive: session.isPreviewActive,
      });
    }
  };

  const handleUndo = async () => {
    if (!themeSession || themeSession.historyIndex <= 0) return;
    await clearHoverPreview();
    setElementUpdateSession(null);
    const targetIndex = themeSession.historyIndex - 1;
    const snapshot = themeSession.history[targetIndex];
    restoreThemeHistory(snapshot, targetIndex);
    const response = await sendThemePatch({
      action: 'UNDO_THEME_PATCH',
      semanticSlots: snapshot.semanticSlots,
      exactReplacements: snapshot.exactReplacements,
      gradientReplacements: snapshot.gradientReplacements,
      applyMode: snapshot.applyMode,
      fontPresetId: snapshot.fontPresetId,
      fontFamily: snapshot.fontFamily,
      fontStylesheetUrl: snapshot.fontStylesheetUrl,
    });
    if (response?.session) {
      const session = response.session as ThemeSession;
      updateThemeSession({
        gradientReplacements: session.gradientReplacements,
        trackedNodeCount: session.trackedNodeCount,
        applyMode: session.applyMode,
        isPreviewActive: session.isPreviewActive,
      });
    }
  };

  const handleRedo = async () => {
    if (!themeSession || themeSession.historyIndex >= themeSession.history.length - 1) return;
    await clearHoverPreview();
    setElementUpdateSession(null);
    const targetIndex = themeSession.historyIndex + 1;
    const snapshot = themeSession.history[targetIndex];
    restoreThemeHistory(snapshot, targetIndex);
    const response = await sendThemePatch({
      action: 'REDO_THEME_PATCH',
      semanticSlots: snapshot.semanticSlots,
      exactReplacements: snapshot.exactReplacements,
      gradientReplacements: snapshot.gradientReplacements,
      applyMode: snapshot.applyMode,
      fontPresetId: snapshot.fontPresetId,
      fontFamily: snapshot.fontFamily,
      fontStylesheetUrl: snapshot.fontStylesheetUrl,
    });
    if (response?.session) {
      const session = response.session as ThemeSession;
      updateThemeSession({
        gradientReplacements: session.gradientReplacements,
        trackedNodeCount: session.trackedNodeCount,
        applyMode: session.applyMode,
        isPreviewActive: session.isPreviewActive,
      });
    }
  };

  const handleReset = async () => {
    if (!themeSession) return;
    await clearHoverPreview();
    setElementUpdateSession(null);
    const resetSlots = themeSession.semanticSlots.map((slot) => ({ ...slot, currentColor: slot.originalColor }));
    const resetRules = themeSession.exactReplacements.map((rule) => ({
      ...rule,
      replacementColor: rule.originalColor,
      enabled: false,
    }));
    const resetGradientRules = themeSession.gradientReplacements.map((rule) => ({
      ...rule,
      replacementValue: rule.originalValue,
      enabled: false,
    }));
    const snapshot = createHistorySnapshot(
      resetSlots,
      resetRules,
      resetGradientRules,
      themeSession.applyMode,
      'original',
      '',
      ''
    );
    restoreThemeHistory(snapshot, themeSession.history.length);
    useStore.setState((state) => ({
      themeSession: state.themeSession
        ? {
            ...state.themeSession,
            semanticSlots: snapshot.semanticSlots,
            exactReplacements: snapshot.exactReplacements,
            gradientReplacements: snapshot.gradientReplacements,
            fontPresetId: snapshot.fontPresetId,
            fontFamily: snapshot.fontFamily,
            fontStylesheetUrl: snapshot.fontStylesheetUrl,
            history: [...state.themeSession.history, snapshot],
            historyIndex: state.themeSession.history.length,
            isPreviewActive: false,
            lastUpdatedAt: Date.now(),
          }
        : null,
    }));
    const response = await sendThemePatch({ action: 'RESET_THEME_SESSION' });
    if (response?.session) {
      const session = response.session as ThemeSession;
      updateThemeSession({
        gradientReplacements: session.gradientReplacements,
        trackedNodeCount: session.trackedNodeCount,
        applyMode: session.applyMode,
        fontPresetId: session.fontPresetId,
        fontFamily: session.fontFamily,
        fontStylesheetUrl: session.fontStylesheetUrl,
        isPreviewActive: session.isPreviewActive,
      });
    }
  };

  const handleCopyExport = async () => {
    const response = await sendThemePatch({ action: 'EXPORT_THEME_SESSION' });
    const payload = (response?.payload as ThemeSessionExport | undefined) || (themeSession ? exportThemeSession(themeSession) : null);
    if (!payload) return;
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 1400);
  };

  const toggleExpandedPanel = (key: string, defaultValue = false) => {
    setExpandedPanels((current) => ({ ...current, [key]: !(current[key] ?? defaultValue) }));
  };

  const isPanelExpanded = (key: string, defaultValue = false) => expandedPanels[key] ?? defaultValue;

  const toggleExpandedSources = (key: string) => {
    setExpandedSources((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleGradientDraftChange = async (ruleId: string, value: string) => {
    setGradientDrafts((current) => ({ ...current, [ruleId]: value }));
    if (!themeSession) return;
    const draft = value.trim();
    if (!draft) return;

    await applyGradientRules(
      themeSession.gradientReplacements.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              enabled: true,
              replacementValue: draft,
            }
          : rule
      )
    );
  };

  const handleGradientColorStopChange = (ruleId: string, stopIndex: number, nextHex: string) => {
    const currentGradient =
      gradientDrafts[ruleId] ||
      themeSession?.gradientReplacements.find((rule) => rule.id === ruleId)?.replacementValue ||
      '';
    const nextGradient = replaceGradientColorStop(currentGradient, stopIndex, nextHex.toUpperCase());
    void handleGradientDraftChange(ruleId, nextGradient);
  };

  const clearHoverPreview = async () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    activeHoverItemRef.current = null;
    await sendThemeStudioAction({ action: 'THEME_CLEAR_HIGHLIGHTS' });
    setLocateStates((current) =>
      Object.fromEntries(
        Object.entries(current).map(([itemId, state]) => [
          itemId,
          state.status === 'previewing' ? { ...state, status: 'idle' } : state,
        ])
      )
    );
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
      }
      void sendThemeStudioAction({ action: 'THEME_CLEAR_HIGHLIGHTS' });
    };
  }, []);

  useEffect(() => {
    void clearHoverPreview();
    setElementUpdateSession(null);
    setElementUpdateDraftColor(null);
  }, [activeSection]);

  useEffect(() => {
    if (elementUpdateSession && selectedItemId !== elementUpdateSession.itemId) {
      setElementUpdateSession(null);
      setElementUpdateDraftColor(null);
    }
  }, [elementUpdateSession, selectedItemId]);

  const availableFilters = FILTERS_BY_SECTION[activeSection];
  useEffect(() => {
    if (!availableFilters.includes(activeFilter)) {
      setActiveFilter('all');
    }
  }, [activeFilter, availableFilters]);

  const semanticSlots = themeSession?.semanticSlots || [];
  const gradientRules = themeSession?.gradientReplacements || [];
  const exactRules = themeSession?.exactReplacements || [];

  const presetItems: RailItem[] = PRESET_IDS.map((presetId) => {
    const preset = buildThemePreset(presetId, semanticSlots);
    return {
      id: presetId,
      title: preset.label,
      subtitle: presetId === 'original' ? 'Restore the detected page palette.' : 'Apply a curated palette instantly.',
      badges: presetId === 'original' ? ['Baseline'] : ['Preset'],
      searchText: `${preset.label} ${presetId}`,
    };
  });

  const activeFontPresetId = themeSession?.fontPresetId || 'original';
  const fontItems: RailItem[] = FONT_PRESET_IDS.map((fontPresetId) => {
    const preset = FONT_PRESETS[fontPresetId];
    return {
      id: preset.id,
      title: preset.label,
      subtitle: preset.subtitle,
      badges: [
        activeFontPresetId === preset.id ? 'Active' : '',
        preset.id === 'original' ? 'Detected' : 'Preset',
        preset.source === 'google' ? 'Google' : 'Built-in',
      ].filter(Boolean),
      searchText: `${preset.label} ${preset.subtitle} ${preset.stack} ${preset.source}`,
      changed: activeFontPresetId === preset.id && preset.id !== 'original',
    };
  });

  const slotItems: RailItem[] = semanticSlots.map((slot) => ({
    id: slot.id,
    title: slot.label,
    subtitle: slot.currentColor,
    badges: [
      slot.uncertain ? 'Uncertain' : `${Math.round(slot.confidence * 100)}%`,
      slot.currentColor !== slot.originalColor ? 'Changed' : 'Original',
      slot.candidateVariables.length > 0 ? `${slot.candidateVariables.length} vars` : '',
    ].filter(Boolean),
    searchText: `${slot.label} ${slot.currentColor} ${slot.originalColor} ${slot.candidateVariables.join(' ')}`,
    changed: slot.currentColor !== slot.originalColor,
    uncertain: slot.uncertain,
    hasVariables: slot.candidateVariables.length > 0,
  }));

const gradientItems: RailItem[] = gradientRules.map((rule) => ({
  id: rule.id,
  title: rule.kind === 'text' ? 'Text Gradient' : 'Background Gradient',
  subtitle: rule.sampleSelectors[0] || rule.originalValue,
  badges: [
    rule.kind,
    rule.replacementValue !== rule.originalValue ? 'Changed' : 'Original',
    gradientHasTransparentStop(rule) ? 'Transparent' : gradientHasAlpha(rule) ? 'Alpha' : '',
  ].filter(Boolean),
    searchText: `${rule.kind} ${rule.originalValue} ${rule.replacementValue} ${rule.sampleSelectors.join(' ')}`,
    changed: rule.replacementValue !== rule.originalValue,
    enabled: rule.enabled,
  }));

  const ruleItems: RailItem[] = exactRules.map((rule) => ({
    id: rule.id,
    title: rule.originalColor,
    subtitle: `${rule.count} matches`,
    badges: [
      rule.enabled ? 'Enabled' : 'Disabled',
      rule.replacementColor !== rule.originalColor ? 'Changed' : 'Original',
      rule.variableNames.length > 0 ? `${rule.variableNames.length} vars` : '',
    ].filter(Boolean),
    searchText: `${rule.originalColor} ${rule.replacementColor} ${rule.variableNames.join(' ')} ${rule.sampleSelectors.join(' ')}`,
    changed: rule.replacementColor !== rule.originalColor,
    enabled: rule.enabled,
    hasVariables: rule.variableNames.length > 0,
  }));

  const sectionItems: Record<WorkbenchSection, RailItem[]> = {
    presets: presetItems,
    fonts: fontItems,
    slots: slotItems,
    gradients: gradientItems,
    rules: ruleItems,
  };

  const getSlotPropertyPriority = (slotId: ThemeSemanticSlot['id']) => {
    if (slotId === 'background' || slotId === 'surface') return ['background-color', 'border-color', 'color'] as const;
    if (slotId === 'border') return ['border-color', 'background-color', 'color'] as const;
    return ['color', 'background-color', 'border-color'] as const;
  };

  const slotLocateMeta = semanticSlots.reduce<Record<string, ThemeLocateMeta>>((accumulator, slot) => {
    const matchingColor = data.colors.find((entry) => normalizeHex(entry.hex) === normalizeHex(slot.sourceColor));
    const occurrences = matchingColor?.occurrences || [];
    const prioritizedSelectors = getSlotPropertyPriority(slot.id)
      .flatMap((property) =>
        occurrences
          .filter((occurrence) => occurrence.property === property)
          .flatMap((occurrence) => occurrence.sampleSelectors)
      )
      .concat(occurrences.flatMap((occurrence) => occurrence.sampleSelectors))
      .filter(Boolean);
    const selectors = Array.from(new Set(prioritizedSelectors)).slice(0, 6);

    accumulator[slot.id] = {
      itemType: 'slot',
      itemId: slot.id,
      selectors,
      scope: 'samples',
      canLocate: selectors.length > 0 || Boolean(slot.sourceColor),
      canCreateExactRule: selectors.length > 0 || Boolean(slot.sourceColor),
      matchColor: slot.sourceColor,
      matchProperty: getSlotPropertyPriority(slot.id)[0],
    };
    return accumulator;
  }, {});

  const gradientLocateMeta = gradientRules.reduce<Record<string, ThemeLocateMeta>>((accumulator, rule) => {
    accumulator[rule.id] = {
      itemType: 'gradient',
      itemId: rule.id,
      selectors: rule.sampleSelectors.slice(0, 10),
      scope: 'all',
      canLocate: rule.sampleSelectors.length > 0,
      canCreateExactRule: false,
    };
    return accumulator;
  }, {});

  const ruleLocateMeta = exactRules.reduce<Record<string, ThemeLocateMeta>>((accumulator, rule) => {
    accumulator[rule.id] = {
      itemType: 'rule',
      itemId: rule.id,
      selectors: rule.sampleSelectors.slice(0, 10),
      scope: 'all',
      canLocate: rule.sampleSelectors.length > 0 || Boolean(rule.originalColor),
      canCreateExactRule: rule.sampleSelectors.length > 0 || Boolean(rule.originalColor),
      matchColor: rule.originalColor,
      matchProperty: rule.property,
    };
    return accumulator;
  }, {});

  const getLocateMeta = (section: WorkbenchSection, itemId: string): ThemeLocateMeta | null => {
    if (section === 'slots') return slotLocateMeta[itemId] || null;
    if (section === 'gradients') return gradientLocateMeta[itemId] || null;
    if (section === 'rules') return ruleLocateMeta[itemId] || null;
    return null;
  };

  const visibleItems = sectionItems[activeSection].filter(
    (item) => matchesFilter(item, activeFilter) && matchesSearch(item, searchQuery)
  );
  const visibleItemKey = visibleItems.map((item) => item.id).join('|');

  useEffect(() => {
    if (!themeSession) {
      setSelectedItemId(null);
      return;
    }
    if (!visibleItems.length) {
      setSelectedItemId(null);
      return;
    }
    if (activeSection === 'presets' || activeSection === 'fonts') {
      if (selectedItemId && !visibleItems.some((item) => item.id === selectedItemId)) {
        setSelectedItemId(null);
      }
      return;
    }
    if (!selectedItemId || !visibleItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(visibleItems[0].id);
    }
  }, [activeSection, selectedItemId, themeSession, visibleItemKey, visibleItems]);

  if (initializing || !themeSession) {
    return (
      <div className="rounded-2xl border-2 border-foreground/20 bg-card p-8 neo-shadow space-y-4 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
        <div>
          <h3 className="text-lg font-black tracking-tight">Initializing Theme Studio</h3>
          <p className="text-sm text-muted-foreground">Scanning semantic color slots and building preview rules.</p>
        </div>
      </div>
    );
  }

  const selectedSlot = activeSection === 'slots' ? themeSession.semanticSlots.find((slot) => slot.id === selectedItemId) || null : null;
  const selectedGradient =
    activeSection === 'gradients'
      ? themeSession.gradientReplacements.find((rule) => rule.id === selectedItemId) || null
      : null;
  const selectedRule =
    activeSection === 'rules'
      ? themeSession.exactReplacements.find((rule) => rule.id === selectedItemId) || null
      : null;

  const upsertExactRuleFromElement = async (
    originalColor: string,
    replacementColor: string,
    selector: string,
    property: ThemeReplacementRule['property'],
    targetNodeId: string
  ) => {
    const normalizedOriginal = normalizeHex(originalColor);
    const normalizedReplacement = normalizeHex(replacementColor);
    const existingRule = themeSession.exactReplacements.find(
      (rule) => rule.targetNodeId === targetNodeId && rule.property === property
    );

    const nextRules = existingRule
      ? themeSession.exactReplacements.map((rule) =>
          rule.targetNodeId === targetNodeId && rule.property === property
            ? {
                ...rule,
                enabled: true,
                originalColor: normalizedOriginal,
                replacementColor: normalizedReplacement,
                sampleSelectors: Array.from(new Set([selector, ...rule.sampleSelectors])).slice(0, 8),
                targetNodeId,
              }
            : rule
        )
      : [
          ...themeSession.exactReplacements,
          {
            id: `${targetNodeId}:${property}`,
            originalColor: normalizedOriginal,
            replacementColor: normalizedReplacement,
            property,
            count: 1,
            variableNames: [],
            sampleSelectors: [selector],
            enabled: true,
            targetNodeId,
          },
        ];

    await applyExactRules(nextRules);
  };

  const updateLocateState = (itemId: string, nextState: ThemeLocateState) => {
    setLocateStates((current) => ({ ...current, [itemId]: nextState }));
  };

  const previewLocateItem = (itemId: string) => {
    const locateMeta = getLocateMeta(activeSection, itemId);
    if (!locateMeta?.canLocate) return;

    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    activeHoverItemRef.current = itemId;
    updateLocateState(itemId, { status: 'previewing' });

    hoverTimerRef.current = window.setTimeout(async () => {
      const response = await sendThemeStudioAction({
        action: 'THEME_HIGHLIGHT_MATCHES',
        payload: {
          itemType: locateMeta.itemType,
          itemId: locateMeta.itemId,
          selectors: locateMeta.selectors,
          scope: locateMeta.scope,
          matchColor: locateMeta.matchColor,
          matchProperty: locateMeta.matchProperty,
        },
      });

      if (activeHoverItemRef.current !== itemId) return;
      if (response?.status === 'ok') {
        updateLocateState(itemId, {
          status: 'located',
          count: response.count,
          selector: response.primarySelector || null,
        });
      } else if (response?.status === 'not_found') {
        updateLocateState(itemId, { status: 'not_found' });
      } else {
        updateLocateState(itemId, { status: 'error' });
      }
    }, 180);
  };

  const locateItem = async (itemId: string) => {
    const locateMeta = getLocateMeta(activeSection, itemId);
    if (!locateMeta?.canLocate) return;

    activeHoverItemRef.current = itemId;
    updateLocateState(itemId, { status: 'previewing' });
    const response = await sendThemeStudioAction({
      action: 'THEME_LOCATE_MATCH',
      payload: {
        itemType: locateMeta.itemType,
        itemId: locateMeta.itemId,
        selectors: locateMeta.selectors,
        scope: 'all',
        scrollIntoView: true,
        matchColor: locateMeta.matchColor,
        matchProperty: locateMeta.matchProperty,
      },
    });

    if (response?.status === 'ok') {
      updateLocateState(itemId, {
        status: 'located',
        count: response.count,
        selector: response.primarySelector || null,
      });
      return;
    }

    updateLocateState(itemId, { status: response?.status === 'not_found' ? 'not_found' : 'error' });
  };

  const startElementUpdate = async (itemId: string) => {
    const locateMeta = getLocateMeta(activeSection, itemId);
    if (!locateMeta?.canLocate) return;

    const response = await sendThemeStudioAction({
      action: 'THEME_START_ELEMENT_UPDATE',
      payload: {
        itemType: locateMeta.itemType,
        itemId: locateMeta.itemId,
        selectors: locateMeta.selectors,
        scope: 'representative',
        scrollIntoView: true,
        matchColor: locateMeta.matchColor,
        matchProperty: locateMeta.matchProperty,
      },
    });

    if (response?.status !== 'ok' || !response.target) {
      updateLocateState(itemId, { status: response?.status === 'not_found' ? 'not_found' : 'error' });
      return;
    }

    const target = response.target as ThemeElementUpdateTarget;
    const preferredProperty =
      target.colors.color
        ? 'color'
        : target.colors.backgroundColor
          ? 'backgroundColor'
          : 'borderColor';
    const initialReplacementColor =
      activeSection === 'slots'
        ? themeSession.semanticSlots.find((slot) => slot.id === itemId)?.currentColor
        : activeSection === 'rules'
          ? themeSession.exactReplacements.find((rule) => rule.id === itemId)?.replacementColor
          : null;

    setElementUpdateSession({
      itemId,
      target,
      selectedProperty: preferredProperty,
    });
    setElementUpdateDraftColor((initialReplacementColor || '#000000').toUpperCase());
    updateLocateState(itemId, {
      status: 'element-update',
      count: 1,
      selector: target.selector,
    });
  };

  const renderLocateStatus = (itemId: string) => {
    const state = locateStates[itemId];
    if (!state || state.status === 'idle') return 'Preview on hover';
    if (state.status === 'previewing') return 'Finding matches';
    if (state.status === 'located') return state.count && state.count > 1 ? `${state.count} found` : '1 found';
    if (state.status === 'element-update') return 'Element selected';
    if (state.status === 'not_found') return 'No elements found';
    return 'Preview failed';
  };

  const renderElementUpdatePanel = (itemId: string, replacementColor: string) => {
    if (!elementUpdateSession || elementUpdateSession.itemId !== itemId) return null;
    const draftColor = (elementUpdateDraftColor || replacementColor).toUpperCase();

    const availableProperties = (
      [
        ['color', elementUpdateSession.target.colors.color, 'Text'],
        ['backgroundColor', elementUpdateSession.target.colors.backgroundColor, 'Background'],
        ['borderColor', elementUpdateSession.target.colors.borderColor, 'Border'],
      ] as const
    ).filter((entry) => Boolean(entry[1]));

    if (!availableProperties.length) {
      return (
        <div className="rounded-2xl border border-border bg-background/70 p-3 text-xs text-muted-foreground">
          The selected element is pinned to <span className="font-mono text-foreground">{elementUpdateSession.target.selector}</span>,
          but no solid colors were found to edit directly.
        </div>
      );
    }

    const selectedColor =
      elementUpdateSession.target.colors[elementUpdateSession.selectedProperty] ||
      availableProperties[0][1] ||
      null;

    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary">Single Element</div>
            <div className="mt-1 font-mono text-[11px] text-foreground break-all">{elementUpdateSession.target.selector}</div>
          </div>
          <button
            onClick={() => {
              setElementUpdateSession(null);
              setElementUpdateDraftColor(null);
            }}
            className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableProperties.map(([property, value, label]) => (
            <button
              key={`${itemId}-${property}`}
              onClick={() =>
                setElementUpdateSession((current) =>
                  current ? { ...current, selectedProperty: property } : current
                )
              }
              className={clsx(
                'rounded-full border px-3 py-1 text-[11px] font-bold transition-colors',
                elementUpdateSession.selectedProperty === property
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              )}
            >
              {label} {value}
            </button>
          ))}
        </div>
        {selectedColor && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background/70 px-3 py-2.5">
              <input
                type="color"
                value={draftColor}
                onChange={(event) => setElementUpdateDraftColor(event.target.value.toUpperCase())}
                className="color-input-solid h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent"
              />
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Element color</div>
                <div className="font-mono text-sm text-foreground">{draftColor}</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: selectedColor }} />
              <span className="font-mono">{selectedColor}</span>
              <span>→</span>
              <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: draftColor }} />
              <span className="font-mono text-foreground">{draftColor}</span>
            </div>
            <button
              onClick={() =>
                upsertExactRuleFromElement(
                  selectedColor,
                  draftColor,
                  elementUpdateSession.target.selector,
                  elementUpdateSession.selectedProperty === 'backgroundColor'
                    ? 'background-color'
                    : elementUpdateSession.selectedProperty === 'borderColor'
                      ? 'border-color'
                      : 'color',
                  elementUpdateSession.target.nodeId
                )
              }
              className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Apply To This Element
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRowFooter = (itemId: string) => {
    if (activeSection === 'presets') {
      const preset = buildThemePreset(itemId as PresetId, themeSession.semanticSlots);
      return (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            {Object.values(preset.colors)
              .slice(0, 6)
              .map((color, index) => (
                <span
                  key={`${itemId}-footer-preset-${index}`}
                  className="h-6 w-6 rounded-md border border-border"
                  style={{ backgroundColor: color }}
                />
              ))}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Click to apply</span>
        </div>
      );
    }

    if (activeSection === 'fonts') {
      const preset = FONT_PRESETS[itemId as FontPresetId];
      return (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-black text-foreground" style={preset.stack ? { fontFamily: preset.stack } : undefined}>
              {preset.sample}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {preset.id === 'original' ? 'Use page fonts' : preset.source === 'google' ? 'Click to load' : 'Click to apply'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {preset.source === 'google' ? 'Google' : 'Built-in'}
            </span>
            {themeSession.fontPresetId === preset.id && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Active</span>
            )}
          </div>
        </div>
      );
    }

    if (!SHOW_HOVER_LOCATE_PREVIEW && !SHOW_LOCATE_ACTIONS) return null;

    const locateMeta = getLocateMeta(activeSection, itemId);
    if (!locateMeta) return null;

    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{renderLocateStatus(itemId)}</span>
        {SHOW_LOCATE_ACTIONS && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => void locateItem(itemId)}
              disabled={!locateMeta.canLocate}
              className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              Show All
            </button>
            <button
              onClick={() => void startElementUpdate(itemId)}
              disabled={!locateMeta.canCreateExactRule}
              className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              Pick Element
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderRailPreview = (itemId: string) => {
    if (activeSection === 'slots') {
      const slot = themeSession.semanticSlots.find((entry) => entry.id === itemId);
      if (!slot) return null;
      const slotChanged = normalizeHex(slot.currentColor) !== normalizeHex(slot.originalColor);
      if (!slotChanged) {
        return <span className="h-8 w-8 cursor-default rounded-lg border border-border" style={{ backgroundColor: slot.currentColor }} />;
      }
      return (
        <div className="flex cursor-default items-center gap-2">
          <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: slot.originalColor }} />
          <span className="text-xs font-bold text-muted-foreground">→</span>
          <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: slot.currentColor }} />
        </div>
      );
    }

    if (activeSection === 'rules') {
      const rule = themeSession.exactReplacements.find((entry) => entry.id === itemId);
      if (!rule) return null;
      return (
        <div className="flex cursor-default items-center gap-2">
          <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: rule.originalColor }} />
          <span className="text-xs font-bold text-muted-foreground">→</span>
          <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: rule.replacementColor }} />
        </div>
      );
    }

    if (activeSection === 'gradients') {
      const rule = themeSession.gradientReplacements.find((entry) => entry.id === itemId);
      if (!rule) return null;
      const replacementValue = gradientDrafts[rule.id] ?? rule.replacementValue;
      return (
        <div className="flex cursor-default items-center gap-2">
          <span className="h-8 w-12 rounded-lg border border-border" style={getGradientPreviewStyle(rule.originalValue)} />
          <span className="text-xs font-bold text-muted-foreground">→</span>
          <span className="h-8 w-12 rounded-lg border border-border" style={getGradientPreviewStyle(replacementValue)} />
        </div>
      );
    }

    if (activeSection === 'fonts') {
      const preset = FONT_PRESETS[itemId as FontPresetId];
      return (
        <span
          className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-background px-2 text-sm font-black text-foreground"
          style={preset.stack ? { fontFamily: preset.stack } : undefined}
        >
          {preset.sample}
        </span>
      );
    }

    return null;
  };

  const renderInlineEditor = (itemId: string) => {
    if (activeSection === 'slots') {
      const slot = themeSession.semanticSlots.find((entry) => entry.id === itemId);
      if (!slot) return null;
      const slotChanged = normalizeHex(slot.currentColor) !== normalizeHex(slot.originalColor);
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/70 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <input
                type="color"
                value={slot.currentColor}
                onChange={(event) =>
                  applySemanticSlots(
                    themeSession.semanticSlots.map((entry) =>
                      entry.id === slot.id ? { ...entry, currentColor: event.target.value.toUpperCase() } : entry
                    )
                  )
                }
                className="color-input-solid h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent"
              />
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {slotChanged ? 'Current color' : 'Detected color'}
                </div>
                <div className="font-mono text-sm text-foreground">{slot.currentColor}</div>
                <div className="text-[11px] text-muted-foreground">
                  {slotChanged ? `Originally ${slot.originalColor}` : 'No manual changes yet'}
                </div>
              </div>
            </div>
            {slotChanged ? (
              <button
                onClick={() =>
                  applySemanticSlots(
                    themeSession.semanticSlots.map((entry) =>
                      entry.id === slot.id ? { ...entry, currentColor: entry.originalColor } : entry
                    )
                  )
                }
                className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
              >
                Revert
              </button>
            ) : (
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                Original
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              {Math.round(slot.confidence * 100)}% confidence
            </span>
            {slot.candidateVariables.length > 0 && (
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                {slot.candidateVariables.length} vars
              </span>
            )}
            {slotChanged && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                Changed
              </span>
            )}
            {slot.uncertain && (
              <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-bold text-yellow-700">
                Review suggested
              </span>
            )}
          </div>

          {slotChanged && (
            <div className="rounded-xl border border-border bg-background/70 px-3 py-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Change Preview</div>
              <div className="mt-2 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: slot.originalColor }} />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Before</div>
                  <div className="font-mono text-xs text-muted-foreground break-all">{slot.originalColor}</div>
                </div>
                <span className="text-xs font-bold text-muted-foreground">{'->'}</span>
                <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: slot.currentColor }} />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">After</div>
                  <div className="font-mono text-xs text-foreground break-all">{slot.currentColor}</div>
                </div>
              </div>
            </div>
          )}

          {renderElementUpdatePanel(slot.id, slot.currentColor)}
        </div>
      );
    }

    if (activeSection === 'rules') {
      const rule = themeSession.exactReplacements.find((entry) => entry.id === itemId);
      if (!rule) return null;
      const ruleChanged = normalizeHex(rule.replacementColor) !== normalizeHex(rule.originalColor);
      const rulePropertyLabel = getRulePropertyLabel(rule.property);
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/70 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <input
                type="color"
                value={rule.replacementColor}
                onChange={(event) =>
                  applyExactRules(
                    themeSession.exactReplacements.map((entry) =>
                      entry.id === rule.id
                        ? { ...entry, enabled: true, replacementColor: event.target.value.toUpperCase() }
                        : entry
                    )
                  )
                }
                className="color-input-solid h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent"
              />
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {ruleChanged ? 'Replacement color' : 'Detected color'}
                </div>
                <div className="font-mono text-sm text-foreground">{rule.replacementColor}</div>
                <div className="text-[11px] text-muted-foreground">
                  {ruleChanged ? `Originally ${rule.originalColor}` : 'No manual changes yet'}
                </div>
              </div>
            </div>
            {ruleChanged || rule.enabled ? (
              <button
                onClick={() =>
                  applyExactRules(
                    themeSession.exactReplacements.map((entry) =>
                      entry.id === rule.id ? { ...entry, replacementColor: entry.originalColor, enabled: false } : entry
                    )
                  )
                }
                className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
              >
                Revert
              </button>
            ) : (
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                Original
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              {rulePropertyLabel}
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              {rule.count} matches
            </span>
            {rule.variableNames.length > 0 && (
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                {rule.variableNames.length} vars
              </span>
            )}
            {ruleChanged && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                Changed
              </span>
            )}
          </div>

          {ruleChanged && (
            <div className="rounded-xl border border-border bg-background/70 px-3 py-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Change Preview</div>
              <div className="mt-2 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: rule.originalColor }} />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Before</div>
                  <div className="font-mono text-xs text-muted-foreground break-all">{rule.originalColor}</div>
                </div>
                <span className="text-xs font-bold text-muted-foreground">{'->'}</span>
                <span className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: rule.replacementColor }} />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">After</div>
                  <div className="font-mono text-xs text-foreground break-all">{rule.replacementColor}</div>
                </div>
              </div>
            </div>
          )}
          {renderElementUpdatePanel(rule.id, rule.replacementColor)}
        </div>
      );
    }

    if (activeSection === 'gradients') {
      const rule = themeSession.gradientReplacements.find((entry) => entry.id === itemId);
      if (!rule) return null;
      const replacementValue = gradientDrafts[rule.id] ?? rule.replacementValue;
      const replacementStops = extractGradientColorStops(replacementValue);
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live preview</div>
            <button
              onClick={() => {
                void handleGradientDraftChange(rule.id, rule.originalValue);
                void applyGradientRules(
                  themeSession.gradientReplacements.map((entry) =>
                    entry.id === rule.id ? { ...entry, replacementValue: entry.originalValue, enabled: false } : entry
                  )
                );
              }}
              className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              Revert
            </button>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <div className="h-16 rounded-2xl border border-border" style={getGradientPreviewStyle(rule.originalValue)} />
              <div className="mt-2 text-[11px] text-muted-foreground">{rule.count} matches</div>
            </div>
            <div className="text-xs font-bold text-muted-foreground">→</div>
            <div>
              <div className="h-16 rounded-2xl border border-border" style={getGradientPreviewStyle(replacementValue)} />
              <div className="mt-2 text-[11px] text-foreground">Updates live as you edit</div>
            </div>
          </div>
          {replacementStops.length > 0 && (
            <div className="grid gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detected Colors</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {replacementStops.map((stop, stopIndex) => (
                  <div key={`${rule.id}-inline-stop-${stopIndex}`} className="flex items-center gap-3 rounded-xl border border-border bg-background/80 p-2">
                    <div
                      className="h-10 w-10 rounded-lg border border-border"
                      style={
                        stop.alpha > 0
                          ? {
                              ...transparencyBackdropStyle,
                              backgroundImage: `linear-gradient(${stop.hex}, ${stop.hex}), ${transparencyBackdropStyle.backgroundImage}`,
                            }
                          : transparencyBackdropStyle
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[11px] text-foreground">{stop.alpha <= 0 ? 'transparent' : stop.hex}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {stop.alpha >= 1 ? 'Solid' : stop.alpha <= 0 ? 'Locked' : `Alpha ${Math.round(stop.alpha * 100)}%`}
                      </div>
                    </div>
                    {stop.alpha > 0 ? (
                      <input
                        type="color"
                        value={stop.hex}
                onChange={(event) => void handleGradientColorStopChange(rule.id, stopIndex, event.target.value)}
                        className="color-input-solid h-9 w-9 cursor-pointer rounded border border-border bg-transparent"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const textContrast = getContrastBadge(
    themeSession.semanticSlots.find((slot) => slot.id === 'text')?.currentColor || '#111827',
    themeSession.semanticSlots.find((slot) => slot.id === 'background')?.currentColor || '#FFFFFF'
  );
  const primaryContrast = getContrastBadge(
    themeSession.semanticSlots.find((slot) => slot.id === 'primary')?.currentColor || '#2563EB',
    themeSession.semanticSlots.find((slot) => slot.id === 'surface')?.currentColor ||
      themeSession.semanticSlots.find((slot) => slot.id === 'background')?.currentColor ||
      '#FFFFFF'
  );

  const renderDetailPane = () => {
    if (!selectedItemId) {
      return (
        <EditorShell
          eyebrow={SECTION_META[activeSection].label}
          title="No matching items"
          summary="Adjust the search or filter to bring items back into view."
        >
          <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center text-muted-foreground">
            No items match the current search and filter.
          </div>
        </EditorShell>
      );
    }

    if (activeSection === 'presets') {
      return (
        <EditorShell
          eyebrow="Presets"
          title="Apply From The List"
          summary="Choose a preset from the left. It applies immediately and updates the page without opening another editor."
        >
          <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center text-muted-foreground">
            Presets no longer expand. Click any preset card to apply it directly.
          </div>
        </EditorShell>
      );
    }

    if (activeSection === 'fonts') {
      return (
        <EditorShell
          eyebrow="Fonts"
          title="Typography Presets"
          summary="Choose a built-in stack or a curated Google Font from the left. It applies across the page and participates in undo, redo, reset, and export."
        >
          <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center text-muted-foreground">
            Search the list and click any font to apply it. Original restores the site typography.
          </div>
        </EditorShell>
      );
    }

    if (selectedSlot && activeSection === 'slots') {
      const liveColorPanelKey = `slot-live:${selectedSlot.id}`;
      const slotContextPanelKey = `slot-context:${selectedSlot.id}`;
      return (
        <EditorShell
          eyebrow="Semantic Slot"
          title={selectedSlot.label}
          summary="Live preview applies as soon as you change the picker. Use semantic slots to steer the overall palette before touching exact rules."
          badges={
            <>
              <span className={clsx('rounded-full border px-3 py-1 text-xs font-bold', badgeToneClasses[textContrast.tone])}>
                Text contrast {textContrast.label} {textContrast.ratio}
              </span>
              <span className={clsx('rounded-full border px-3 py-1 text-xs font-bold', badgeToneClasses[primaryContrast.tone])}>
                Primary contrast {primaryContrast.label} {primaryContrast.ratio}
              </span>
              {selectedSlot.uncertain && (
                <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-700">
                  Uncertain mapping
                </span>
              )}
            </>
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Current: <span className="font-mono text-foreground">{selectedSlot.currentColor}</span>
              </p>
              <button
                onClick={() =>
                  applySemanticSlots(
                    themeSession.semanticSlots.map((slot) =>
                      slot.id === selectedSlot.id ? { ...slot, currentColor: slot.originalColor } : slot
                    )
                  )
                }
                className="rounded-xl border-2 border-foreground/20 px-4 py-3 font-bold hover:border-destructive hover:text-destructive transition-colors"
              >
                Revert Slot
              </button>
            </div>
          }
        >
          <AccordionSection
            title="Live Color"
            eyebrow="Primary control"
            summary="Change the slot color here. Updates preview immediately."
            expanded={isPanelExpanded(liveColorPanelKey, true)}
            onToggle={() => toggleExpandedPanel(liveColorPanelKey, true)}
          >
            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="h-40 rounded-2xl border border-border" style={{ backgroundColor: selectedSlot.currentColor }} />
                <input
                  type="color"
                  value={selectedSlot.currentColor}
                  onChange={(event) =>
                    applySemanticSlots(
                      themeSession.semanticSlots.map((slot) =>
                        slot.id === selectedSlot.id ? { ...slot, currentColor: event.target.value.toUpperCase() } : slot
                      )
                    )
                  }
                  className="color-input-solid mt-4 h-14 w-full cursor-pointer rounded-xl border border-border bg-transparent"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current</div>
                  <div className="mt-2 font-mono text-lg font-bold">{selectedSlot.currentColor}</div>
                  <div className="mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Original</div>
                  <div className="mt-2 font-mono text-sm text-muted-foreground">{selectedSlot.originalColor}</div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confidence</div>
                  <div className="mt-2 text-3xl font-black">{Math.round(selectedSlot.confidence * 100)}%</div>
                  <div className="mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Variables</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedSlot.candidateVariables.length > 0 ? (
                      selectedSlot.candidateVariables.map((variable) => (
                        <span
                          key={`${selectedSlot.id}-${variable}`}
                          className="rounded-lg border border-border bg-secondary/50 px-2 py-1 font-mono text-[11px] text-foreground"
                        >
                          {variable}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No linked variables detected.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AccordionSection>
          <AccordionSection
            title="Slot Context"
            eyebrow="Reference"
            summary="Use this for confidence checks before you start fine-tuning exact rules."
            expanded={isPanelExpanded(slotContextPanelKey, false)}
            onToggle={() => toggleExpandedPanel(slotContextPanelKey)}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Slot ID</div>
                <div className="mt-2 font-mono text-sm text-foreground">{selectedSlot.id}</div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mapping status</div>
                <div className="mt-2 text-sm font-bold text-foreground">
                  {selectedSlot.uncertain ? 'Needs review' : 'Confidently mapped'}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Linked variables</div>
                <div className="mt-2 text-sm font-bold text-foreground">{selectedSlot.candidateVariables.length}</div>
              </div>
            </div>
          </AccordionSection>
        </EditorShell>
      );
    }

    if (selectedGradient && activeSection === 'gradients') {
      const replacementValue = gradientDrafts[selectedGradient.id] ?? selectedGradient.replacementValue;
      const replacementStops = extractGradientColorStops(replacementValue);
      const showAllSources = Boolean(expandedSources[selectedGradient.id]);
      const previewPanelKey = `gradient-preview:${selectedGradient.id}`;
      const stopsPanelKey = `gradient-stops:${selectedGradient.id}`;
      const advancedCssPanelKey = `gradient-css:${selectedGradient.id}`;
      const sourcesPanelKey = `gradient-sources:${selectedGradient.id}`;
      const showAdvancedCss = isPanelExpanded(advancedCssPanelKey, false);

      return (
        <EditorShell
          eyebrow="Gradient"
          title={selectedGradient.kind === 'text' ? 'Text Gradient' : 'Background Gradient'}
          summary="Use the stop controls for fast edits, then open advanced CSS only if you need to tweak the raw gradient string."
          badges={
            <>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {selectedGradient.kind}
              </span>
              <span className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-bold text-muted-foreground">
                {selectedGradient.count} matches
              </span>
              {gradientHasTransparentStop(selectedGradient) && (
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
                  Transparent stops
                </span>
              )}
              {gradientHasAlpha(selectedGradient) && (
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
                  Alpha stops
                </span>
              )}
            </>
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Gradient updates apply immediately as you edit stops or CSS.</p>
              <button
                onClick={() => {
                  void handleGradientDraftChange(selectedGradient.id, selectedGradient.originalValue);
                  void applyGradientRules(
                    themeSession.gradientReplacements.map((rule) =>
                      rule.id === selectedGradient.id
                        ? { ...rule, replacementValue: rule.originalValue, enabled: false }
                        : rule
                    )
                  );
                }}
                className="rounded-xl border-2 border-foreground/20 px-4 py-3 font-bold hover:border-destructive hover:text-destructive transition-colors"
              >
                Revert Gradient
              </button>
            </div>
          }
        >
          <AccordionSection
            title="Preview"
            eyebrow="Primary control"
            summary="Compare the original gradient against the replacement while you edit."
            expanded={isPanelExpanded(previewPanelKey, true)}
            onToggle={() => toggleExpandedPanel(previewPanelKey, true)}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Original</div>
                <div className="mt-3 rounded-2xl border border-border p-4 min-h-[132px]" style={getGradientPreviewStyle(selectedGradient.originalValue)} />
                <div className="mt-3 font-mono text-xs break-all text-muted-foreground">{selectedGradient.originalValue}</div>
              </div>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Replacement</div>
                <div className="mt-3 rounded-2xl border border-border p-4 min-h-[132px]" style={getGradientPreviewStyle(replacementValue)} />
                <div className="mt-3 font-mono text-xs break-all text-muted-foreground">{replacementValue}</div>
              </div>
            </div>
          </AccordionSection>

          {replacementStops.length > 0 && (
            <AccordionSection
              title="Detected Stops"
              eyebrow="Guided editing"
              summary="Use these first. Alpha is preserved automatically and transparent stops stay locked."
              expanded={isPanelExpanded(stopsPanelKey, true)}
              onToggle={() => toggleExpandedPanel(stopsPanelKey, true)}
            >
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {replacementStops.map((stop, stopIndex) => (
                  <div key={`${selectedGradient.id}-stop-${stopIndex}`} className="rounded-2xl border border-border bg-background/80 p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-12 w-12 shrink-0 rounded-xl border border-border"
                        style={
                          stop.alpha > 0
                            ? {
                                ...transparencyBackdropStyle,
                                backgroundImage: `linear-gradient(${stop.hex}, ${stop.hex}), ${transparencyBackdropStyle.backgroundImage}`,
                              }
                            : transparencyBackdropStyle
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm font-bold text-foreground">
                          {stop.alpha <= 0 ? 'transparent' : stop.hex}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {stop.alpha >= 1 ? 'Solid stop' : stop.alpha <= 0 ? 'Transparent stop' : `Alpha ${Math.round(stop.alpha * 100)}%`}
                        </div>
                      </div>
                      {stop.alpha > 0 ? (
                        <input
                          type="color"
                          value={stop.hex}
                          onChange={(event) => void handleGradientColorStopChange(selectedGradient.id, stopIndex, event.target.value)}
                          className="color-input-solid h-10 w-10 cursor-pointer rounded border border-border bg-transparent"
                        />
                      ) : (
                        <span className="rounded-full border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionSection>
          )}

          <AccordionSection
            title="Advanced CSS"
            eyebrow="Advanced"
            summary="Open this only when the stop controls are not enough."
            expanded={showAdvancedCss}
            onToggle={() => toggleExpandedPanel(advancedCssPanelKey)}
          >
              <textarea
                value={replacementValue}
                onChange={(event) => void handleGradientDraftChange(selectedGradient.id, event.target.value)}
                className="min-h-[150px] w-full rounded-2xl border border-border bg-background px-4 py-3 font-mono text-xs"
                spellCheck={false}
              />
          </AccordionSection>

          <AccordionSection
            title="Sources"
            eyebrow="Reference"
            summary="Where this gradient was detected on the page."
            expanded={isPanelExpanded(sourcesPanelKey, false)}
            onToggle={() => toggleExpandedPanel(sourcesPanelKey)}
            actions={
              selectedGradient.sampleSelectors.length > 3 ? (
                <button
                  onClick={() => toggleExpandedSources(selectedGradient.id)}
                  className="text-sm font-bold text-primary"
                >
                  {showAllSources ? 'Show less' : 'Show more'}
                </button>
              ) : undefined
            }
          >
            <div className="space-y-2">
              {(showAllSources ? selectedGradient.sampleSelectors : selectedGradient.sampleSelectors.slice(0, 3)).map((selector) => (
                <div
                  key={`${selectedGradient.id}-${selector}`}
                  className="rounded-xl border border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground break-all"
                >
                  {selector}
                </div>
              ))}
            </div>
          </AccordionSection>
        </EditorShell>
      );
    }

    if (selectedRule && activeSection === 'rules') {
      const liveColorPanelKey = `rule-live:${selectedRule.id}`;
      const ruleContextPanelKey = `rule-context:${selectedRule.id}`;
      const ruleChanged = normalizeHex(selectedRule.replacementColor) !== normalizeHex(selectedRule.originalColor);
      const rulePropertyLabel = getRulePropertyLabel(selectedRule.property);
      return (
        <EditorShell
          eyebrow="Exact Rule"
          title={`${rulePropertyLabel} Rule`}
          summary="Exact rules are best for high-precision cleanup after semantic slots and gradients are in the right place."
          badges={
            <>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
                {rulePropertyLabel}
              </span>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {selectedRule.count} matches
              </span>
              {selectedRule.variableNames.length > 0 && (
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
                  {selectedRule.variableNames.length} linked vars
                </span>
              )}
              {ruleChanged && (
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
                  Changed
                </span>
              )}
            </>
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Current: <span className="font-mono text-foreground">{selectedRule.replacementColor}</span>
              </p>
              <button
                onClick={() =>
                  applyExactRules(
                    themeSession.exactReplacements.map((rule) =>
                      rule.id === selectedRule.id
                        ? { ...rule, replacementColor: rule.originalColor, enabled: false }
                        : rule
                    )
                  )
                }
                className="rounded-xl border-2 border-foreground/20 px-4 py-3 font-bold hover:border-destructive hover:text-destructive transition-colors"
              >
                Revert Rule
              </button>
            </div>
          }
        >
          <AccordionSection
            title="Live Color"
            eyebrow="Primary control"
            summary="Change the exact replacement color here. Preview applies instantly when enabled."
            expanded={isPanelExpanded(liveColorPanelKey, true)}
            onToggle={() => toggleExpandedPanel(liveColorPanelKey, true)}
          >
            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="h-40 rounded-2xl border border-border" style={{ backgroundColor: selectedRule.replacementColor }} />
                <input
                  type="color"
                  value={selectedRule.replacementColor}
                  onChange={(event) =>
                    applyExactRules(
                      themeSession.exactReplacements.map((rule) =>
                        rule.id === selectedRule.id
                          ? {
                              ...rule,
                              enabled: true,
                              replacementColor: event.target.value.toUpperCase(),
                            }
                          : rule
                      )
                    )
                  }
                  className="color-input-solid mt-4 h-14 w-full cursor-pointer rounded-xl border border-border bg-transparent"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current</div>
                  <div className="mt-2 font-mono text-lg font-bold">{selectedRule.replacementColor}</div>
                  <div className="mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Original</div>
                  <div className="mt-2 font-mono text-sm text-muted-foreground">{selectedRule.originalColor}</div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Matches</div>
                  <div className="mt-2 text-3xl font-black">{selectedRule.count}</div>
                  <div className="mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Linked variables</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedRule.variableNames.length > 0 ? (
                      selectedRule.variableNames.map((variableName) => (
                        <span
                          key={`${selectedRule.id}-${variableName}`}
                          className="rounded-lg border border-border bg-secondary/50 px-2 py-1 font-mono text-[11px] text-foreground"
                        >
                          {variableName}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No linked variables detected.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            title="Rule Context"
            eyebrow="Reference"
            summary="Use this for rule details and selector samples before making more targeted cleanup edits."
            expanded={isPanelExpanded(ruleContextPanelKey, false)}
            onToggle={() => toggleExpandedPanel(ruleContextPanelKey)}
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Matching property</div>
                  <div className="mt-2 text-sm font-bold text-foreground">{rulePropertyLabel}</div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rule status</div>
                  <div className="mt-2 text-sm font-bold text-foreground">
                    {selectedRule.enabled ? 'Enabled for preview' : 'Disabled'}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Change status</div>
                  <div className="mt-2 text-sm font-bold text-foreground">{ruleChanged ? 'Replacement updated' : 'Using original color'}</div>
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Selectors</div>
                <div className="space-y-2">
                  {selectedRule.sampleSelectors.slice(0, 5).map((selector) => (
                    <div
                      key={`${selectedRule.id}-${selector}`}
                      className="rounded-xl border border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground break-all"
                    >
                      {selector}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AccordionSection>
        </EditorShell>
      );
    }

    return (
      <EditorShell
        eyebrow={SECTION_META[activeSection].label}
        title="Pick an item"
        summary="Choose something from the left rail to begin editing."
      >
        <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center text-muted-foreground">
          No item is selected.
        </div>
      </EditorShell>
    );
  };

  return (
    <div className="space-y-4 pb-20">
      <section className="rounded-[24px] border-2 border-foreground/20 bg-card px-4 py-3 neo-shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black tracking-tight text-foreground">Theme Studio</h2>
          <div className="flex flex-wrap items-center gap-2">
            {!isSidePanel && (
              <button
                onClick={() => openSidePanel('themeStudio')}
                className="rounded-xl border-2 border-foreground/20 bg-background px-3 py-2 font-bold text-sm text-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Sidebar
              </button>
            )}
            <button
              onClick={handleUndo}
              disabled={themeSession.historyIndex <= 0}
              className="rounded-xl border-2 border-foreground/20 bg-background p-2 text-foreground disabled:opacity-40 hover:border-primary transition-colors"
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={themeSession.historyIndex >= themeSession.history.length - 1}
              className="rounded-xl border-2 border-foreground/20 bg-background p-2 text-foreground disabled:opacity-40 hover:border-primary transition-colors"
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleReset}
              className="rounded-xl border-2 border-foreground/20 bg-background px-3 py-2 font-bold text-sm text-foreground hover:border-destructive hover:text-destructive transition-colors flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={handleCopyExport}
              title="Copy the current semantic slot colors plus changed exact and gradient rules as JSON."
              className="rounded-xl bg-primary px-3 py-2 font-bold text-sm text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              {copyState === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copyState === 'copied' ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border-2 border-foreground/20 bg-card p-4 neo-shadow md:max-h-[calc(100vh-16rem)] md:overflow-hidden">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SECTION_META) as WorkbenchSection[]).map((section) => (
              <SectionButton
                key={section}
                section={section}
                count={sectionItems[section].length}
                active={activeSection === section}
                onClick={() => setActiveSection(section)}
              />
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-border bg-background/60 px-3 py-2.5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {SECTION_META[activeSection].label}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{SECTION_META[activeSection].description}</p>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-background/70 px-3 py-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search ${SECTION_META[activeSection].label.toLowerCase()}...`}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {availableFilters.map((filter) => (
              <FilterChip
                key={filter}
                label={FILTER_LABELS[filter]}
                active={activeFilter === filter}
                onClick={() => setActiveFilter(filter)}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span>{SECTION_META[activeSection].label}</span>
            <span>{visibleItems.length} visible</span>
          </div>

          <div className="mt-3 space-y-2 md:max-h-[calc(100vh-31rem)] md:overflow-y-auto md:pr-1">
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => (
                <RailRow
                  key={item.id}
                  item={item}
                  active={item.id === selectedItemId}
                  onMouseEnter={SHOW_HOVER_LOCATE_PREVIEW ? () => previewLocateItem(item.id) : undefined}
                  onMouseLeave={
                    SHOW_HOVER_LOCATE_PREVIEW
                      ? () => {
                          if (activeHoverItemRef.current === item.id) {
                            void clearHoverPreview();
                          }
                        }
                      : undefined
                  }
                  preview={renderRailPreview(item.id)}
                  footer={renderRowFooter(item.id)}
                  expandedContent={activeSection === 'presets' || activeSection === 'fonts' ? null : item.id === selectedItemId ? renderInlineEditor(item.id) : null}
                  onClick={() => {
                    setSelectedItemId(item.id);
                    if (activeSection === 'presets') {
                      void handlePreset(item.id as PresetId);
                    }
                    if (activeSection === 'fonts') {
                      void handleFontPreset(item.id as FontPresetId);
                    }
                  }}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/60 p-5 text-center text-sm text-muted-foreground">
                No {SECTION_META[activeSection].label.toLowerCase()} match this search/filter.
              </div>
            )}
          </div>
        </aside>

        <div className="hidden min-w-0 md:block">{renderDetailPane()}</div>
      </div>
    </div>
  );
};
