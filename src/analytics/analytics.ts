/**
 * PostHog Analytics for Chrome Extensions
 * 
 * PostHog provides 1M events/month free forever.
 * Configured specifically for Chrome extension CSP requirements.
 */

import posthog from 'posthog-js';

// =====================================================
// CONFIGURATION - Loaded from .env file
// =====================================================
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let isInitialized = false;

/**
 * Initialize PostHog with Chrome extension-safe settings
 */
function initPostHog(): void {
  if (isInitialized) return;
  
  if (!POSTHOG_API_KEY || POSTHOG_API_KEY.length < 10) {
    console.warn('[Analytics] PostHog API key not configured');
    return;
  }

  try {
    posthog.init(POSTHOG_API_KEY, {
      api_host: POSTHOG_HOST,
      
      // Chrome extension specific settings - disable all external script loading
      persistence: 'localStorage',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true, // Prevents external survey script loading
      disable_scroll_properties: true,
      enable_heatmaps: false,
      
      // Disable features that load external scripts
      advanced_disable_decide: true, // Prevents /decide API call that loads scripts
      advanced_disable_feature_flags: true,
      advanced_disable_feature_flags_on_first_load: true,
      advanced_disable_toolbar_metrics: true,
      
      // Privacy
      respect_dnt: true,
      
      // Don't bootstrap - we handle everything manually
      bootstrap: {},
      
      loaded: () => {
        console.debug('[Analytics] PostHog initialized successfully');
      }
    });

    isInitialized = true;
    console.debug('[Analytics] PostHog setup complete');
  } catch (error) {
    console.error('[Analytics] Failed to initialize PostHog:', error);
  }
}

// Initialize on module load
initPostHog();

// ============================================
// Public Analytics API
// ============================================

export const analytics = {
  /**
   * Track extension popup opened
   */
  trackPopupOpened: () => {
    if (!isInitialized) return;
    posthog.capture('extension_opened');
  },

  /**
   * Track tab/panel navigation
   */
  trackTabViewed: (tabId: string, tabLabel: string) => {
    if (!isInitialized) return;
    posthog.capture('tab_viewed', {
      tab_id: tabId,
      tab_label: tabLabel
    });
  },

  /**
   * Track feature usage
   */
  trackFeatureUsed: (featureName: string, details?: Record<string, any>) => {
    if (!isInitialized) return;
    posthog.capture('feature_used', {
      feature_name: featureName,
      ...details
    });
  },

  /**
   * Track when user copies content
   */
  trackCopy: (contentType: string) => {
    if (!isInitialized) return;
    posthog.capture('content_copied', {
      content_type: contentType
    });
  },

  /**
   * Track export actions
   */
  trackExport: (exportType: string, itemCount?: number) => {
    if (!isInitialized) return;
    posthog.capture('content_exported', {
      export_type: exportType,
      item_count: itemCount
    });
  },

  /**
   * Track visual inspector usage
   */
  trackInspectorToggled: (enabled: boolean) => {
    if (!isInitialized) return;
    posthog.capture('inspector_toggled', {
      inspector_enabled: enabled
    });
  },

  /**
   * Track AI generation requests
   */
  trackAIGeneration: (generationType: string) => {
    if (!isInitialized) return;
    posthog.capture('ai_generation', {
      generation_type: generationType
    });
  },

  /**
   * Track errors
   */
  trackError: (errorType: string, errorMessage?: string) => {
    if (!isInitialized) return;
    posthog.capture('extension_error', {
      error_type: errorType,
      error_message: errorMessage?.substring(0, 100)
    });
  },

  /**
   * Track website analyzed (domain only for privacy)
   */
  trackWebsiteAnalyzed: (domain: string) => {
    if (!isInitialized) return;
    posthog.capture('website_analyzed', {
      domain: domain
    });
  },

  /**
   * Track settings changes
   */
  trackSettingChanged: (settingName: string, value: any) => {
    if (!isInitialized) return;
    posthog.capture('setting_changed', {
      setting_name: settingName,
      setting_value: String(value)
    });
  }
};

export default analytics;
