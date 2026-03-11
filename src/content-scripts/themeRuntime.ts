import {
  ThemeApplyMode,
  ThemeColorSource,
  ThemeGradientKind,
  ThemeGradientRule,
  ThemeGradientSource,
  ThemeProperty,
  ThemeReplacementRule,
  ThemeSemanticSlot,
  ThemeSession,
  buildInitialThemeSession,
  exportThemeSession,
  normalizeHex,
} from '../utils/themeStudio';
import { isCurrentRuntimeOwner, safeRuntimeSendMessage } from './runtime';

const STYLE_TAG_ID = 'di-theme-runtime-style';
const TOAST_ID = 'di-theme-runtime-toast';
const NODE_ATTR = 'data-di-theme-node';
const GRADIENT_NODE_ATTR = 'data-di-theme-gradient-node';
const TRACK_LIMIT = 4000;

interface TrackedNode {
  id: string;
  original: Partial<Record<ThemeProperty, string>>;
}

interface TrackedGradientNode {
  id: string;
  originalValue: string;
  kind: ThemeGradientKind;
}

const normalizeCssColor = (value: string): string | null => {
  if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || value === 'inherit') return null;
  if (value.startsWith('#')) return normalizeHex(value);

  const values = value.match(/\d+(\.\d+)?/g);
  if (!values || values.length < 3) return null;

  const [r, g, b] = values.slice(0, 3).map((part) => Number(part));
  return normalizeHex(
    `#${[r, g, b]
      .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
      .join('')}`
  );
};

const sanitizeForCss = (value: string) => value.replace(/"/g, '\\"');
const isGradientValue = (value: string) => /(?:linear|radial|conic)-gradient\(/i.test(value);
const getGradientKind = (computed: CSSStyleDeclaration): ThemeGradientKind => {
  const backgroundClip = `${computed.backgroundClip} ${computed.getPropertyValue('-webkit-background-clip')}`.toLowerCase();
  const textFillColor = computed.getPropertyValue('-webkit-text-fill-color').trim().toLowerCase();
  const transparentText =
    computed.color === 'rgba(0, 0, 0, 0)' ||
    computed.color === 'transparent' ||
    textFillColor === 'rgba(0, 0, 0, 0)' ||
    textFillColor === 'transparent';

  return backgroundClip.includes('text') || transparentText ? 'text' : 'background';
};

export class ThemeRuntime {
  private styleTag: HTMLStyleElement | null = null;
  private observer: MutationObserver | null = null;
  private trackedNodes = new Map<string, TrackedNode>();
  private trackedGradientNodes = new Map<string, TrackedGradientNode>();
  private session: ThemeSession | null = null;
  private nodeSequence = 0;
  private gradientNodeSequence = 0;
  private pageElementCount = 0;
  private trackedColorKey = '';
  private trackedGradientKey = '';
  private downgradedDuringTracking = false;

  initSession(colors: ThemeColorSource[], gradients: ThemeGradientSource[], pageTitle: string, pageUrl: string) {
    this.ensureStyleTag();
    this.pageElementCount = document.getElementsByTagName('*').length;

    const applyMode: ThemeApplyMode = this.pageElementCount > TRACK_LIMIT ? 'variables-only' : 'hybrid';
    this.session = buildInitialThemeSession(colors, gradients, pageTitle, pageUrl, applyMode, this.pageElementCount);
    this.removeToast();
    this.syncTrackingForExactRules();
    this.syncGradientTracking();
    this.startObserver();
    this.render();
    this.emitSessionUpdate();
    return this.session;
  }

  applyPatch(payload: {
    semanticSlots?: ThemeSemanticSlot[];
    exactReplacements?: ThemeReplacementRule[];
    gradientReplacements?: ThemeGradientRule[];
    applyMode?: ThemeApplyMode;
    isPreviewActive?: boolean;
  }) {
    if (!this.session) return null;

    this.session = {
      ...this.session,
      semanticSlots: payload.semanticSlots || this.session.semanticSlots,
      exactReplacements: payload.exactReplacements || this.session.exactReplacements,
      gradientReplacements: payload.gradientReplacements || this.session.gradientReplacements,
      applyMode: payload.applyMode || this.session.applyMode,
      isPreviewActive: payload.isPreviewActive ?? true,
      lastUpdatedAt: Date.now(),
    };

    this.syncTrackingForExactRules();
    this.syncGradientTracking();
    this.render();
    this.emitSessionUpdate();
    return this.session;
  }

  undoPatch(payload: {
    semanticSlots: ThemeSemanticSlot[];
    exactReplacements: ThemeReplacementRule[];
    gradientReplacements: ThemeGradientRule[];
    applyMode: ThemeApplyMode;
  }) {
    return this.applyPatch({ ...payload, isPreviewActive: true });
  }

  redoPatch(payload: {
    semanticSlots: ThemeSemanticSlot[];
    exactReplacements: ThemeReplacementRule[];
    gradientReplacements: ThemeGradientRule[];
    applyMode: ThemeApplyMode;
  }) {
    return this.applyPatch({ ...payload, isPreviewActive: true });
  }

  applyPreset(semanticSlots: ThemeSemanticSlot[]) {
    return this.applyPatch({ semanticSlots, isPreviewActive: true });
  }

  resetSession() {
    if (!this.session) return null;

    this.session = {
      ...this.session,
      semanticSlots: this.session.semanticSlots.map((slot) => ({
        ...slot,
        currentColor: slot.originalColor,
      })),
      exactReplacements: this.session.exactReplacements.map((rule) => ({
        ...rule,
        replacementColor: rule.originalColor,
        enabled: false,
      })),
      gradientReplacements: this.session.gradientReplacements.map((rule) => ({
        ...rule,
        replacementValue: rule.originalValue,
        enabled: false,
      })),
      isPreviewActive: false,
      lastUpdatedAt: Date.now(),
    };

    this.clearTrackedNodes();
    this.clearTrackedGradientNodes();
    this.removeToast();
    this.render();
    this.emitSessionUpdate();
    return this.session;
  }

  exportSession() {
    if (!this.session) return null;
    return exportThemeSession(this.session);
  }

  private ensureStyleTag() {
    if (this.styleTag) return;
    const existing = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (existing) {
      this.styleTag = existing;
      return;
    }

    this.styleTag = document.createElement('style');
    this.styleTag.id = STYLE_TAG_ID;
    document.documentElement.appendChild(this.styleTag);
  }

  private startObserver() {
    if (this.observer) return;

    this.observer = new MutationObserver((mutations) => {
      if (!isCurrentRuntimeOwner()) {
        this.observer?.disconnect();
        return;
      }
      if (!this.session) return;
      const activeColors = this.getTrackedColors();
      const activeGradients = this.getTrackedGradients();
      if (activeColors.size === 0 && activeGradients.size === 0) return;

      let changed = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          changed = this.trackNodeTree(node, activeColors) || changed;
          changed = this.trackGradientNodeTree(node, activeGradients) || changed;
        });
      });

      if (changed) {
        this.session.trackedNodeCount = this.trackedNodes.size;
        this.render();
        this.emitSessionUpdate();
      }
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  private getTrackedColors() {
    if (!this.session || this.session.applyMode !== 'hybrid') return new Set<string>();

    const colors = new Set(
      this.session.exactReplacements
        .filter((rule) => rule.enabled && normalizeHex(rule.replacementColor) !== normalizeHex(rule.originalColor))
        .map((rule) => normalizeHex(rule.originalColor))
    );

    this.session.semanticSlots
      .filter((slot) => normalizeHex(slot.currentColor) !== normalizeHex(slot.originalColor))
      .forEach((slot) => colors.add(normalizeHex(slot.originalColor)));

    return colors;
  }

  private getTrackingKey(colors: Set<string>) {
    return Array.from(colors).sort().join('|');
  }

  private getTrackedGradients() {
    if (!this.session) return new Set<string>();

    return new Set(
      this.session.gradientReplacements
        .filter((rule) => rule.enabled && rule.replacementValue !== rule.originalValue)
        .map((rule) => `${rule.kind}:${rule.originalValue}`)
    );
  }

  private syncTrackingForExactRules() {
    if (!this.session) return;

    if (this.session.applyMode !== 'hybrid') {
      this.clearTrackedNodes();
      this.trackedColorKey = '';
      this.session.trackedNodeCount = this.pageElementCount;
      return;
    }

    const activeColors = this.getTrackedColors();
    if (activeColors.size === 0) {
      this.clearTrackedNodes();
      this.trackedColorKey = '';
      this.session.trackedNodeCount = 0;
      return;
    }

    const nextTrackingKey = this.getTrackingKey(activeColors);
    if (nextTrackingKey === this.trackedColorKey && this.trackedNodes.size > 0) {
      this.session.trackedNodeCount = this.trackedNodes.size;
      return;
    }

    this.clearTrackedNodes();
    this.trackedColorKey = nextTrackingKey;
    this.downgradedDuringTracking = false;
    document.querySelectorAll<HTMLElement>('body *').forEach((element) => {
      this.trackNode(element, activeColors);
    });

    if (this.downgradedDuringTracking) {
      this.clearTrackedNodes();
      this.trackedColorKey = '';
      this.session.trackedNodeCount = this.pageElementCount;
      return;
    }

    this.session.trackedNodeCount = this.trackedNodes.size;
  }

  private syncGradientTracking() {
    if (!this.session) return;

    const activeGradients = this.getTrackedGradients();
    if (activeGradients.size === 0) {
      this.clearTrackedGradientNodes();
      this.trackedGradientKey = '';
      return;
    }

    const nextTrackingKey = Array.from(activeGradients).sort().join('|');
    if (nextTrackingKey === this.trackedGradientKey && this.trackedGradientNodes.size > 0) return;

    this.clearTrackedGradientNodes();
    this.trackedGradientKey = nextTrackingKey;
    document.querySelectorAll<HTMLElement>('body *').forEach((element) => {
      this.trackGradientNode(element, activeGradients);
    });
  }

  private trackNodeTree(root: HTMLElement, activeColors: Set<string>) {
    if (!this.session || this.session.applyMode !== 'hybrid' || activeColors.size === 0) return false;
    let changed = this.trackNode(root, activeColors);
    root.querySelectorAll<HTMLElement>('*').forEach((element) => {
      changed = this.trackNode(element, activeColors) || changed;
    });
    return changed;
  }

  private trackNode(element: HTMLElement, activeColors: Set<string>) {
    if (!this.session || this.session.applyMode !== 'hybrid' || activeColors.size === 0) return false;
    if (element.closest(`#${TOAST_ID}`)) return false;
    if (this.trackedNodes.size > TRACK_LIMIT) {
      if (this.session) {
        this.session.applyMode = 'variables-only';
        this.session.trackedNodeCount = this.pageElementCount;
      }
      this.downgradedDuringTracking = true;
      return false;
    }

    const computed = getComputedStyle(element);
    const original: Partial<Record<ThemeProperty, string>> = {};

    ([
      { property: 'color' as ThemeProperty, value: computed.color },
      { property: 'background-color' as ThemeProperty, value: computed.backgroundColor },
      { property: 'border-color' as ThemeProperty, value: computed.borderTopColor },
    ]).forEach(({ property, value }) => {
      const normalized = normalizeCssColor(value);
      if (!normalized || !activeColors.has(normalized)) return;
      original[property] = normalized;
    });

    if (Object.keys(original).length === 0) return false;

    const existingId = element.getAttribute(NODE_ATTR);
    const id = existingId || `${++this.nodeSequence}`;
    element.setAttribute(NODE_ATTR, id);
    this.trackedNodes.set(id, { id, original });
    return true;
  }

  private trackGradientNodeTree(root: HTMLElement, activeGradients: Set<string>) {
    if (activeGradients.size === 0) return false;
    let changed = this.trackGradientNode(root, activeGradients);
    root.querySelectorAll<HTMLElement>('*').forEach((element) => {
      changed = this.trackGradientNode(element, activeGradients) || changed;
    });
    return changed;
  }

  private trackGradientNode(element: HTMLElement, activeGradients: Set<string>) {
    if (element.closest(`#${TOAST_ID}`)) return false;
    const computed = getComputedStyle(element);
    const backgroundImage = computed.backgroundImage;
    if (!backgroundImage || backgroundImage === 'none' || !isGradientValue(backgroundImage)) return false;

    const kind = getGradientKind(computed);
    const key = `${kind}:${backgroundImage}`;
    if (!activeGradients.has(key)) return false;

    const existingId = element.getAttribute(GRADIENT_NODE_ATTR);
    const id = existingId || `${++this.gradientNodeSequence}`;
    element.setAttribute(GRADIENT_NODE_ATTR, id);
    this.trackedGradientNodes.set(id, { id, originalValue: backgroundImage, kind });
    return true;
  }

  private clearTrackedNodes() {
    document.querySelectorAll(`[${NODE_ATTR}]`).forEach((element) => {
      element.removeAttribute(NODE_ATTR);
    });
    this.trackedNodes.clear();
  }

  private clearTrackedGradientNodes() {
    document.querySelectorAll(`[${GRADIENT_NODE_ATTR}]`).forEach((element) => {
      element.removeAttribute(GRADIENT_NODE_ATTR);
    });
    this.trackedGradientNodes.clear();
  }

  private render() {
    if (!this.styleTag || !this.session) return;

    const variableOverrides = new Map<string, string>();
    this.session.semanticSlots.forEach((slot) => {
      if (normalizeHex(slot.currentColor) === normalizeHex(slot.originalColor)) return;
      slot.candidateVariables.forEach((variable) => variableOverrides.set(variable, slot.currentColor));
    });

    this.session.exactReplacements
      .filter((rule) => rule.enabled && normalizeHex(rule.replacementColor) !== normalizeHex(rule.originalColor))
      .forEach((rule) => {
        rule.variableNames.forEach((variable) => variableOverrides.set(variable, rule.replacementColor));
      });

    const cssChunks: string[] = [];

    if (variableOverrides.size > 0) {
      cssChunks.push(
        `:root, html, body { ${Array.from(variableOverrides.entries())
          .map(([name, value]) => `${name}: ${value} !important;`)
          .join(' ')} }`
      );
    }

    if (this.session.applyMode === 'hybrid' && this.trackedNodes.size > 0) {
      this.trackedNodes.forEach((trackedNode) => {
        const declarations: string[] = [];

        (Object.entries(trackedNode.original) as Array<[ThemeProperty, string]>).forEach(([property, originalColor]) => {
          const exactRule = this.session?.exactReplacements.find(
            (candidate) =>
              candidate.enabled &&
              normalizeHex(candidate.originalColor) === normalizeHex(originalColor) &&
              (candidate.property === 'all' || candidate.property === property)
          );

          if (exactRule && normalizeHex(exactRule.replacementColor) !== normalizeHex(exactRule.originalColor)) {
            declarations.push(`${property}: ${exactRule.replacementColor} !important;`);
            return;
          }

          const slot = this.session?.semanticSlots.find(
            (candidate) =>
              normalizeHex(candidate.originalColor) === normalizeHex(originalColor) &&
              normalizeHex(candidate.currentColor) !== normalizeHex(candidate.originalColor)
          );

          if (slot) {
            declarations.push(`${property}: ${slot.currentColor} !important;`);
          }
        });

        if (declarations.length === 0) return;
        cssChunks.push(`[${NODE_ATTR}="${sanitizeForCss(trackedNode.id)}"] { ${declarations.join(' ')} }`);
      });
    }

    if (this.trackedGradientNodes.size > 0) {
      this.trackedGradientNodes.forEach((trackedNode) => {
        const rule = this.session?.gradientReplacements.find(
          (candidate) =>
            candidate.enabled &&
            candidate.kind === trackedNode.kind &&
            candidate.originalValue === trackedNode.originalValue &&
            candidate.replacementValue !== candidate.originalValue
        );
        if (!rule) return;

        const declarations = [`background-image: ${rule.replacementValue} !important;`];
        if (trackedNode.kind === 'text') {
          declarations.push(
            'background-clip: text !important;',
            '-webkit-background-clip: text !important;',
            '-webkit-text-fill-color: transparent !important;'
          );
        }

        cssChunks.push(`[${GRADIENT_NODE_ATTR}="${sanitizeForCss(trackedNode.id)}"] { ${declarations.join(' ')} }`);
      });
    }

    this.styleTag.textContent = cssChunks.join('\n');
  }

  private emitSessionUpdate() {
    if (!this.session) return;
    safeRuntimeSendMessage({
      action: 'THEME_SESSION_UPDATED',
      session: this.session,
    });
  }

  private removeToast() {
    document.getElementById(TOAST_ID)?.remove();
  }
}
