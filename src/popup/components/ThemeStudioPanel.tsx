import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, ExternalLink, History, Redo2, RotateCcw, Undo2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../../store';
import {
  buildPresetExactReplacements,
  ThemeGradientRule,
  ThemeReplacementRule,
  ThemeSemanticSlot,
  ThemeSession,
  ThemeSessionExport,
  buildThemePreset,
  createHistorySnapshot,
  exportThemeSession,
  getContrastBadge,
} from '../../utils/themeStudio';

interface ThemeStudioPanelProps {
  isSidePanel: boolean;
  openSidePanel: (targetTab?: 'overview' | 'themeStudio') => Promise<void>;
}

const PRESET_IDS = ['original', 'dark', 'warm', 'ocean', 'forest', 'high-contrast'] as const;

const badgeToneClasses = {
  good: 'bg-green-500/10 text-green-700 border-green-500/30',
  warn: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  bad: 'bg-red-500/10 text-red-700 border-red-500/30',
};

const GRADIENT_COLOR_TOKEN_REGEX =
  /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|\btransparent\b/g;

interface GradientColorStop {
  raw: string;
  hex: string;
  alpha: number;
  start: number;
  end: number;
}

const parseResolvedRgb = (value: string) => {
  const channels = value.match(/\d+(\.\d+)?/g);
  if (!channels || channels.length < 3) return null;

  const [r, g, b] = channels.slice(0, 3).map((channel) => Math.max(0, Math.min(255, Math.round(Number(channel)))));
  const alpha = channels[3] ? Math.max(0, Math.min(1, Number(channels[3]))) : 1;

  return {
    r,
    g,
    b,
    alpha,
    hex: `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`,
  };
};

const cssColorToHex = (value: string) => {
  if (value.trim().toLowerCase() === 'transparent') {
    return {
      hex: '#000000',
      alpha: 0,
    };
  }
  if (!CSS.supports('color', value)) return null;

  const probe = document.createElement('span');
  probe.style.color = value;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();

  const parsed = parseResolvedRgb(resolved);
  if (!parsed) return null;

  return {
    hex: parsed.hex,
    alpha: parsed.alpha,
  };
};

const extractGradientColorStops = (gradient: string): GradientColorStop[] => {
  const matches = Array.from(gradient.matchAll(GRADIENT_COLOR_TOKEN_REGEX));
  return matches
    .map((match) => {
      const raw = match[0];
      const start = match.index ?? 0;
      const end = start + raw.length;
      const resolved = cssColorToHex(raw);
      if (!resolved) return null;
      return { raw, hex: resolved.hex, alpha: resolved.alpha, start, end };
    })
    .filter((stop): stop is GradientColorStop => Boolean(stop));
};

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
  backgroundImage: `${gradient}, repeating-conic-gradient(rgba(148, 163, 184, 0.28) 0% 25%, rgba(15, 23, 42, 0.52) 0% 50%)`,
  backgroundSize: 'cover, 14px 14px',
  backgroundPosition: 'center, center',
});

const transparencyBackdropStyle = {
  backgroundImage: 'repeating-conic-gradient(rgba(148, 163, 184, 0.28) 0% 25%, rgba(15, 23, 42, 0.52) 0% 50%)',
  backgroundSize: '14px 14px',
};

export const ThemeStudioPanel = ({ isSidePanel, openSidePanel }: ThemeStudioPanelProps) => {
  const { themeSession, setThemeSession, updateThemeSession, pushThemeHistory, restoreThemeHistory } = useStore();
  const [initializing, setInitializing] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [gradientDrafts, setGradientDrafts] = useState<Record<string, string>>({});

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
    setAdvancedOpen(Boolean(themeSession?.lowConfidence));
  }, [themeSession?.lowConfidence, themeSession?.pageUrl]);

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
          isPreviewActive?: boolean;
        }
      | { action: 'APPLY_THEME_PRESET'; semanticSlots: ThemeSemanticSlot[] }
      | {
          action: 'UNDO_THEME_PATCH';
          semanticSlots: ThemeSemanticSlot[];
          exactReplacements: ThemeReplacementRule[];
          gradientReplacements: ThemeGradientRule[];
          applyMode: ThemeSession['applyMode'];
        }
      | {
          action: 'REDO_THEME_PATCH';
          semanticSlots: ThemeSemanticSlot[];
          exactReplacements: ThemeReplacementRule[];
          gradientReplacements: ThemeGradientRule[];
          applyMode: ThemeSession['applyMode'];
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

  const applySemanticSlots = async (nextSlots: ThemeSemanticSlot[]) => {
    if (!themeSession) return;
    const nextRules = themeSession.exactReplacements.map((rule) => ({ ...rule }));
    const nextGradientRules = themeSession.gradientReplacements.map((rule) => ({ ...rule }));
    pushThemeHistory(nextSlots, nextRules, nextGradientRules, themeSession.applyMode);
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
    pushThemeHistory(nextSlots, nextRules, nextGradientRules, themeSession.applyMode);
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
    pushThemeHistory(nextSlots, nextRules, nextGradientRules, themeSession.applyMode);
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

  const handlePreset = async (presetId: (typeof PRESET_IDS)[number]) => {
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

    pushThemeHistory(nextSlots, nextRules, nextGradientRules, themeSession.applyMode);
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

  const handleUndo = async () => {
    if (!themeSession || themeSession.historyIndex <= 0) return;
    const targetIndex = themeSession.historyIndex - 1;
    const snapshot = themeSession.history[targetIndex];
    restoreThemeHistory(snapshot, targetIndex);
    const response = await sendThemePatch({
      action: 'UNDO_THEME_PATCH',
      semanticSlots: snapshot.semanticSlots,
      exactReplacements: snapshot.exactReplacements,
      gradientReplacements: snapshot.gradientReplacements,
      applyMode: snapshot.applyMode,
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
    const targetIndex = themeSession.historyIndex + 1;
    const snapshot = themeSession.history[targetIndex];
    restoreThemeHistory(snapshot, targetIndex);
    const response = await sendThemePatch({
      action: 'REDO_THEME_PATCH',
      semanticSlots: snapshot.semanticSlots,
      exactReplacements: snapshot.exactReplacements,
      gradientReplacements: snapshot.gradientReplacements,
      applyMode: snapshot.applyMode,
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
    const snapshot = createHistorySnapshot(resetSlots, resetRules, resetGradientRules, themeSession.applyMode);
    restoreThemeHistory(snapshot, themeSession.history.length);
    useStore.setState((state) => ({
      themeSession: state.themeSession
        ? {
            ...state.themeSession,
            semanticSlots: snapshot.semanticSlots,
            exactReplacements: snapshot.exactReplacements,
            gradientReplacements: snapshot.gradientReplacements,
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

  const handleGradientDraftChange = (ruleId: string, value: string) => {
    setGradientDrafts((current) => ({ ...current, [ruleId]: value }));
  };

  const handleGradientApply = async (ruleId: string) => {
    if (!themeSession) return;
    const draft = (gradientDrafts[ruleId] || '').trim();
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
    const currentGradient = gradientDrafts[ruleId] || themeSession?.gradientReplacements.find((rule) => rule.id === ruleId)?.replacementValue || '';
    const nextGradient = replaceGradientColorStop(currentGradient, stopIndex, nextHex.toUpperCase());
    handleGradientDraftChange(ruleId, nextGradient);
  };

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

  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-2xl border-2 border-foreground/20 bg-card p-4 neo-shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preview active</div>
            <h2 className="text-xl font-black tracking-tight">{themeSession.pageTitle || 'Current page'}</h2>
            <p className="text-xs text-muted-foreground truncate max-w-[380px]">{themeSession.pageUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isSidePanel && (
              <button
                onClick={() => openSidePanel('themeStudio')}
                className="px-3 py-2 rounded-lg border-2 border-foreground/20 bg-background font-bold text-sm hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Sidebar
              </button>
            )}
            <button
              onClick={handleUndo}
              disabled={themeSession.historyIndex <= 0}
              className="p-2 rounded-lg border-2 border-foreground/20 bg-background disabled:opacity-40 hover:border-primary transition-colors"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={themeSession.historyIndex >= themeSession.history.length - 1}
              className="p-2 rounded-lg border-2 border-foreground/20 bg-background disabled:opacity-40 hover:border-primary transition-colors"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-lg border-2 border-foreground/20 bg-background font-bold text-sm hover:border-destructive hover:text-destructive transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <History className="w-3.5 h-3.5" />
            {themeSession.history.length - 1} edits
          </span>
          <span
            className={clsx(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold',
              themeSession.applyMode === 'variables-only'
                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700'
                : 'border-green-500/30 bg-green-500/10 text-green-700'
            )}
          >
            {themeSession.applyMode === 'variables-only' ? 'Variables-only mode' : 'Hybrid mode'}
          </span>
          {themeSession.applyMode === 'variables-only' && (
            <span className="text-xs text-muted-foreground">
              Tracked node limit hit. Exact replacement fallback is disabled on this page.
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Presets</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {PRESET_IDS.map((presetId) => {
            const preset = buildThemePreset(presetId, themeSession.semanticSlots);
            return (
              <button
                key={presetId}
                onClick={() => handlePreset(presetId)}
                className="rounded-xl border-2 border-foreground/20 bg-card px-3 py-3 text-left hover:border-primary transition-colors neo-shadow"
              >
                <div className="font-bold text-sm">{preset.label}</div>
                <div className="mt-2 flex gap-1.5">
                  {Object.values(preset.colors)
                    .slice(0, 5)
                    .map((color, index) => (
                      <span
                        key={`${presetId}-${index}`}
                        className="w-5 h-5 rounded-md border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Semantic Slots</div>
          <div className="flex gap-2">
            <div className={clsx('rounded-full border px-3 py-1 text-xs font-bold', badgeToneClasses[textContrast.tone])}>
              Text vs Background {textContrast.label} {textContrast.ratio}
            </div>
            <div className={clsx('rounded-full border px-3 py-1 text-xs font-bold', badgeToneClasses[primaryContrast.tone])}>
              Primary vs Surface {primaryContrast.label} {primaryContrast.ratio}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {themeSession.semanticSlots.map((slot) => (
            <div key={slot.id} className="rounded-2xl border-2 border-foreground/20 bg-card p-4 space-y-3 neo-shadow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold">{slot.label}</div>
                  <div className="text-xs text-muted-foreground">Confidence {Math.round(slot.confidence * 100)}%</div>
                </div>
                {slot.uncertain && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[11px] font-bold text-yellow-700">
                    <AlertTriangle className="w-3 h-3" />
                    Uncertain
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={slot.currentColor}
                  onChange={(event) =>
                    applySemanticSlots(
                      themeSession.semanticSlots.map((currentSlot) =>
                        currentSlot.id === slot.id ? { ...currentSlot, currentColor: event.target.value.toUpperCase() } : currentSlot
                      )
                    )
                  }
                  className="h-12 w-16 rounded-lg border border-border bg-transparent"
                />
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current</div>
                  <div className="font-mono text-sm">{slot.currentColor}</div>
                  <div className="text-xs text-muted-foreground">Original {slot.originalColor}</div>
                </div>
              </div>

              {slot.candidateVariables.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Variable overrides: {slot.candidateVariables.slice(0, 3).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {themeSession.gradientReplacements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gradients</div>
              <div className="text-sm text-muted-foreground">
                Detects gradient backgrounds and gradient text. Edit the CSS gradient string to preview changes live.
              </div>
            </div>
            <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {themeSession.gradientReplacements.length} detected
            </div>
          </div>

          <div className="space-y-3">
            {themeSession.gradientReplacements.map((rule) => {
              const replacementValue = gradientDrafts[rule.id] ?? rule.replacementValue;
              const isTextGradient = rule.kind === 'text';
              const replacementStops = extractGradientColorStops(replacementValue);

              return (
                <div key={rule.id} className="rounded-2xl border-2 border-foreground/20 bg-card p-4 space-y-4 neo-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-3 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-bold">{isTextGradient ? 'Text Gradient' : 'Background Gradient'}</div>
                        <span className="rounded-full border border-border bg-secondary/40 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {rule.kind}
                        </span>
                        <span className="text-xs text-muted-foreground">{rule.count} matches</span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Original</div>
                          <div
                            className={clsx(
                              'rounded-xl border border-border p-4 min-h-[84px] overflow-hidden',
                              isTextGradient && 'flex items-center justify-center'
                            )}
                            style={
                              isTextGradient
                                ? {
                                    ...transparencyBackdropStyle,
                                  }
                                : getGradientPreviewStyle(rule.originalValue)
                            }
                          >
                            {isTextGradient ? (
                              <span
                                className="text-2xl font-black inline-block"
                                style={{
                                  ...getGradientPreviewStyle(rule.originalValue),
                                  backgroundClip: 'text',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                }}
                              >
                                Gradient
                              </span>
                            ) : null}
                          </div>
                          <div className="font-mono text-xs break-all text-muted-foreground">{rule.originalValue}</div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Replacement</div>
                          <div
                            className={clsx(
                              'rounded-xl border border-border p-4 min-h-[84px] overflow-hidden',
                              isTextGradient && 'flex items-center justify-center'
                            )}
                            style={
                              isTextGradient
                                ? {
                                    ...transparencyBackdropStyle,
                                  }
                                : getGradientPreviewStyle(replacementValue)
                            }
                          >
                            {isTextGradient ? (
                              <span
                                className="text-2xl font-black inline-block"
                                style={{
                                  ...getGradientPreviewStyle(replacementValue),
                                  backgroundClip: 'text',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                }}
                              >
                                Gradient
                              </span>
                            ) : null}
                          </div>
                          <textarea
                            value={replacementValue}
                            onChange={(event) => handleGradientDraftChange(rule.id, event.target.value)}
                            className="w-full min-h-[84px] rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
                            spellCheck={false}
                          />
                          {replacementStops.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detected Colors</div>
                                <div className="text-[11px] text-muted-foreground">
                                  Transparent stops are shown as labels. Color pickers preserve opacity for alpha stops.
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {replacementStops.map((stop, stopIndex) => (
                                  <div
                                    key={`${rule.id}-stop-${stopIndex}`}
                                    className="flex items-center gap-3 rounded-xl border border-border bg-background/80 px-3 py-2"
                                  >
                                    <div
                                      className="h-10 w-10 shrink-0 rounded-lg border border-border"
                                      style={
                                        stop.alpha > 0
                                          ? {
                                              ...transparencyBackdropStyle,
                                              backgroundImage: `linear-gradient(${stop.hex}, ${stop.hex}), ${transparencyBackdropStyle.backgroundImage}`,
                                            }
                                          : transparencyBackdropStyle
                                      }
                                    />
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="font-mono text-[11px] text-foreground">
                                        {stop.alpha <= 0 ? 'transparent' : stop.hex}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {stop.alpha >= 1 ? 'Solid stop' : stop.alpha <= 0 ? 'Transparent stop' : `Alpha ${Math.round(stop.alpha * 100)}%`}
                                      </div>
                                    </div>
                                    {stop.alpha > 0 ? (
                                      <input
                                        type="color"
                                        value={stop.hex}
                                        onChange={(event) => handleGradientColorStopChange(rule.id, stopIndex, event.target.value)}
                                        className="h-9 w-9 shrink-0 rounded border border-border bg-transparent"
                                      />
                                    ) : (
                                      <span className="rounded-full border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Locked
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Source</div>
                        <div className="space-y-1">
                          {rule.sampleSelectors.slice(0, 3).map((selector) => (
                            <div
                              key={`${rule.id}-${selector}`}
                              className="rounded-md border border-border bg-secondary/30 px-2 py-1 font-mono text-[11px] text-muted-foreground break-all"
                              title={selector}
                            >
                              {selector}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground shrink-0">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(event) =>
                          applyGradientRules(
                            themeSession.gradientReplacements.map((currentRule) =>
                              currentRule.id === rule.id
                                ? {
                                    ...currentRule,
                                    enabled: event.target.checked,
                                    replacementValue: event.target.checked
                                      ? (gradientDrafts[currentRule.id] || currentRule.replacementValue).trim() || currentRule.originalValue
                                      : currentRule.originalValue,
                                  }
                                : currentRule
                            )
                          )
                        }
                      />
                      Enabled
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleGradientApply(rule.id)}
                      className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:bg-primary/90 transition-colors"
                    >
                      Apply Gradient
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border-2 border-foreground/20 bg-card p-4 neo-shadow space-y-4">
        <button
          onClick={() => setAdvancedOpen((value) => !value)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Advanced</div>
            <div className="font-bold">Exact Replacement Rules</div>
          </div>
          <div className="text-sm font-bold text-primary">{advancedOpen ? 'Hide' : 'Show'}</div>
        </button>

        {advancedOpen && (
          <>
            {themeSession.applyMode === 'variables-only' ? (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-800">
                Exact replacement rules are disabled on this page because the tracked node count exceeded 4000.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {themeSession.exactReplacements.length} detected rules. Presets now auto-fill these replacements so more of the page updates at once.
                </div>
                {themeSession.exactReplacements.map((rule) => (
                  <div key={rule.id} className="rounded-xl border border-border/70 p-3 bg-background/70">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="h-10 w-10 shrink-0 rounded-lg border border-border" style={{ backgroundColor: rule.originalColor }} />
                          <span className="h-10 w-10 shrink-0 rounded-lg border border-border" style={{ backgroundColor: rule.replacementColor }} />
                          <div className="min-w-0">
                            <div className="font-mono text-sm font-bold break-all">{rule.originalColor}</div>
                            <div className="text-xs text-muted-foreground">{rule.count} matches</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-[auto,1fr] items-start gap-x-3 gap-y-2 text-xs">
                          <div className="font-bold uppercase tracking-wider text-muted-foreground">Replace</div>
                          <div className="font-mono break-all text-foreground">{rule.replacementColor}</div>
                          <div className="font-bold uppercase tracking-wider text-muted-foreground">Source</div>
                          <div className="min-w-0 space-y-1">
                            {rule.variableNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {rule.variableNames.slice(0, 4).map((variableName) => (
                                  <span
                                    key={`${rule.id}-${variableName}`}
                                    className="rounded-md border border-border bg-secondary/40 px-2 py-1 font-mono text-[11px] text-foreground break-all"
                                    title={variableName}
                                  >
                                    {variableName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {rule.sampleSelectors.slice(0, 3).map((selector) => (
                                  <div
                                    key={`${rule.id}-${selector}`}
                                    className="rounded-md border border-border bg-secondary/30 px-2 py-1 font-mono text-[11px] text-muted-foreground break-all"
                                    title={selector}
                                  >
                                    {selector}
                                  </div>
                                ))}
                                {rule.sampleSelectors.length === 0 && <div className="text-muted-foreground">No selector samples</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(event) =>
                            applyExactRules(
                              themeSession.exactReplacements.map((currentRule) =>
                                currentRule.id === rule.id
                                  ? { ...currentRule, enabled: event.target.checked, replacementColor: event.target.checked ? currentRule.replacementColor : currentRule.originalColor }
                                  : currentRule
                              )
                            )
                          }
                        />
                        Enabled
                      </label>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="color"
                        value={rule.replacementColor}
                        onChange={(event) =>
                          applyExactRules(
                            themeSession.exactReplacements.map((currentRule) =>
                              currentRule.id === rule.id
                                ? {
                                    ...currentRule,
                                    enabled: true,
                                    replacementColor: event.target.value.toUpperCase(),
                                  }
                                : currentRule
                            )
                          )
                        }
                        className="h-10 w-14 rounded-lg border border-border bg-transparent"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm break-all">{rule.replacementColor}</div>
                        <div className="text-xs text-muted-foreground">
                          {rule.variableNames.length > 0
                            ? `${rule.variableNames.length} linked variable${rule.variableNames.length === 1 ? '' : 's'}`
                            : `${rule.sampleSelectors.length} selector sample${rule.sampleSelectors.length === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="sticky bottom-0 z-20 rounded-2xl border-2 border-foreground/20 bg-card/95 backdrop-blur p-4 neo-shadow flex items-center justify-between gap-3">
        <button
          onClick={handleReset}
          className="rounded-xl border-2 border-foreground/20 px-4 py-3 font-bold hover:border-destructive hover:text-destructive transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={handleCopyExport}
          className="rounded-xl bg-primary text-primary-foreground px-4 py-3 font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          {copyState === 'copied' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copyState === 'copied' ? 'Copied Theme JSON' : 'Copy Theme JSON'}
        </button>
      </div>
    </div>
  );
};
