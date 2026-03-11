import {
  ThemeApplyMode,
  ThemeColorSource,
  ThemeProperty,
  ThemeReplacementRule,
  ThemeSemanticSlot,
  ThemeSession,
  buildInitialThemeSession,
  exportThemeSession,
  normalizeHex,
} from '../utils/themeStudio';

const STYLE_TAG_ID = 'di-theme-runtime-style';
const TOAST_ID = 'di-theme-runtime-toast';
const NODE_ATTR = 'data-di-theme-node';
const TRACK_LIMIT = 4000;

interface TrackedNode {
  id: string;
  original: Partial<Record<ThemeProperty, string>>;
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

export class ThemeRuntime {
  private styleTag: HTMLStyleElement | null = null;
  private observer: MutationObserver | null = null;
  private trackedNodes = new Map<string, TrackedNode>();
  private session: ThemeSession | null = null;
  private nodeSequence = 0;
  private pageElementCount = 0;
  private trackedColorKey = '';
  private downgradedDuringTracking = false;

  initSession(colors: ThemeColorSource[], pageTitle: string, pageUrl: string) {
    this.ensureStyleTag();
    this.pageElementCount = document.getElementsByTagName('*').length;

    const applyMode: ThemeApplyMode = this.pageElementCount > TRACK_LIMIT ? 'variables-only' : 'hybrid';
    this.session = buildInitialThemeSession(colors, pageTitle, pageUrl, applyMode, this.pageElementCount);
    this.syncTrackingForExactRules();
    this.startObserver();
    this.showToast();
    this.render();
    this.emitSessionUpdate();
    return this.session;
  }

  applyPatch(payload: {
    semanticSlots?: ThemeSemanticSlot[];
    exactReplacements?: ThemeReplacementRule[];
    applyMode?: ThemeApplyMode;
    isPreviewActive?: boolean;
  }) {
    if (!this.session) return null;

    this.session = {
      ...this.session,
      semanticSlots: payload.semanticSlots || this.session.semanticSlots,
      exactReplacements: payload.exactReplacements || this.session.exactReplacements,
      applyMode: payload.applyMode || this.session.applyMode,
      isPreviewActive: payload.isPreviewActive ?? true,
      lastUpdatedAt: Date.now(),
    };

    this.syncTrackingForExactRules();
    this.render();
    this.emitSessionUpdate();
    return this.session;
  }

  undoPatch(payload: { semanticSlots: ThemeSemanticSlot[]; exactReplacements: ThemeReplacementRule[]; applyMode: ThemeApplyMode }) {
    return this.applyPatch({ ...payload, isPreviewActive: true });
  }

  redoPatch(payload: { semanticSlots: ThemeSemanticSlot[]; exactReplacements: ThemeReplacementRule[]; applyMode: ThemeApplyMode }) {
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
      isPreviewActive: false,
      lastUpdatedAt: Date.now(),
    };

    this.clearTrackedNodes();
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
      if (!this.session || this.session.applyMode !== 'hybrid') return;
      const activeColors = this.getTrackedColors();
      if (activeColors.size === 0) return;

      let changed = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          changed = this.trackNodeTree(node, activeColors) || changed;
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

  private trackNodeTree(root: HTMLElement, activeColors: Set<string>) {
    let changed = this.trackNode(root, activeColors);
    root.querySelectorAll<HTMLElement>('*').forEach((element) => {
      changed = this.trackNode(element, activeColors) || changed;
    });
    return changed;
  }

  private trackNode(element: HTMLElement, activeColors: Set<string>) {
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

  private clearTrackedNodes() {
    document.querySelectorAll(`[${NODE_ATTR}]`).forEach((element) => {
      element.removeAttribute(NODE_ATTR);
    });
    this.trackedNodes.clear();
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

    this.styleTag.textContent = cssChunks.join('\n');
  }

  private emitSessionUpdate() {
    if (!this.session) return;
    chrome.runtime
      .sendMessage({
        action: 'THEME_SESSION_UPDATED',
        session: this.session,
      })
      .catch(() => null);
  }

  private showToast() {
    if (document.getElementById(TOAST_ID)) return;

    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div>
          <div style="font-size:12px;font-weight:700;letter-spacing:0.02em;">Preview active</div>
          <div style="font-size:11px;opacity:0.78;">Theme Studio is controlling this page.</div>
        </div>
        <button data-action="reset" style="border:none;border-radius:10px;padding:8px 10px;background:#111827;color:#fff;font-weight:700;cursor:pointer;">Reset</button>
        <button data-action="open" style="border:none;border-radius:10px;padding:8px 10px;background:#2563EB;color:#fff;font-weight:700;cursor:pointer;">Back to Studio</button>
      </div>
    `;

    toast.style.cssText = `
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      background: rgba(255,255,255,0.96);
      color: #111827;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.18);
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 16px;
      padding: 12px 14px;
      font-family: Inter, Arial, sans-serif;
      min-width: 320px;
      backdrop-filter: blur(10px);
    `;

    toast.addEventListener('click', async (event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.dataset.action) return;

      if (target.dataset.action === 'reset') {
        this.resetSession();
      }

      if (target.dataset.action === 'open') {
        await chrome.runtime.sendMessage({ action: 'OPEN_THEME_STUDIO' }).catch(() => null);
      }
    });

    (document.body || document.documentElement).appendChild(toast);
  }
}
