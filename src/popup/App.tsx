import { useState, useEffect, useRef } from 'react';
import { Type, Palette, Layout, MousePointer2, Code2, Settings, Sparkles, RefreshCw, Layers, Image as ImageIcon, Play, AlertTriangle, Workflow, PanelRightOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store';
import { TypographyPanel } from './components/TypographyPanel';
import { ColorPanel } from './components/ColorPanel';
import { SpacingPanel } from './components/SpacingPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { AssetsPanel } from './components/AssetsPanel';
import { GeneratePanel } from './components/GeneratePanel';
import ScrollInspectorPanel from './components/ScrollInspectorPanel';
import RedFlagsPanel from './components/RedFlagsPanel';
import FlowsPanel from './components/FlowsPanel';
import { UpdateRequiredScreen } from './components/UpdateRequiredScreen';
import { InspectorPanel, InspectorData } from './components/InspectorPanel';
import { analytics } from '../analytics/analytics';
import { VERSION_API_URL } from '../config';

type Tab = 'overview' | 'typography' | 'colors' | 'assets' | 'spacing' | 'scroll' | 'redflags' | 'flows' | 'prompt' | 'settings' | 'inspector';

// Helper to check if a URL is analyzable (not a restricted browser page)
const isAnalyzableUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  
  // List of restricted URL prefixes where content scripts cannot run
  const restrictedPrefixes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'moz-extension://',
    'file://',
    'view-source:',
    'data:',
    'javascript:',
  ];
  
  return !restrictedPrefixes.some(prefix => url.startsWith(prefix));
};

// Helper function to aggregate fonts by family
const aggregateFonts = (rawFonts: any[]): import('../store').FontData[] => {
  const fontFamilies = new Map<string, any>();

  rawFonts.forEach((font: any) => {
    if (!fontFamilies.has(font.family)) {
      fontFamilies.set(font.family, {
        family: font.family,
        source: font.source || 'unknown',
        variants: new Map<string, any>(),
        elementCount: 0,
      });
    }

    const familyData = fontFamilies.get(font.family);
    const variantKey = `${font.weight}-${font.style}`;

    if (!familyData.variants.has(variantKey)) {
      familyData.variants.set(variantKey, {
        weight: font.weight,
        style: font.style || 'normal',
        sizes: [],
      });
    }

    const variantData = familyData.variants.get(variantKey);
    const sizeKey = `${font.size}-${font.lineHeight}`;

    // Avoid duplicate sizes
    if (!variantData.sizes.some((s: any) => `${s.value}-${s.lineHeight}` === sizeKey)) {
      variantData.sizes.push({
        value: font.size,
        lineHeight: font.lineHeight,
      });
    }

    familyData.elementCount++;
  });

  return Array.from(fontFamilies.values()).map(family => ({
    family: family.family,
    source: family.source as 'google' | 'adobe' | 'system' | 'custom' | 'unknown',
    variants: Array.from(family.variants.values()) as import('../store').FontVariant[],
    elementCount: family.elementCount,
  }));
};

// Helper to compare semver versions (e.g., "1.0" vs "1.1")
const compareVersions = (current: string, minimum: string): boolean => {
  const currentParts = current.split('.').map(Number);
  const minimumParts = minimum.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, minimumParts.length); i++) {
    const curr = currentParts[i] || 0;
    const min = minimumParts[i] || 0;
    if (curr > min) return true;
    if (curr < min) return false;
  }
  return true; // versions are equal
};

// Version info type
interface VersionInfo {
  minVersion: string;
  latestVersion: string;
  updateMessage: string;
  forceUpdate: boolean;
  storeUrl: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data, setData, isInspecting, setInspecting } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasTrackedOpen = useRef(false);
  
  // Version check state
  const [updateRequired, setUpdateRequired] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [currentVersion, setCurrentVersion] = useState('1.0');
  const [checkingVersion, setCheckingVersion] = useState(true);
  
  // Inspector data for sidebar mode
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(null);
  
  // Detect if we're in sidebar mode
  const isSidePanel = window.location.pathname.includes('sidepanel');
  
  // Open sidebar panel
  const openSidePanel = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        // Close popup after opening sidebar
        window.close();
      }
    } catch (e) {
      console.error('Failed to open side panel:', e);
    }
  };

  const injectContentScript = async (tabId: number) => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      return true;
    } catch (e) {
      console.error('Failed to inject content script', e);
      return false;
    }
  };

  const fetchData = async (retry = false) => {
    setLoading(true);
    setError(null);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if URL is analyzable before attempting to communicate
      if (!isAnalyzableUrl(tab?.url)) {
        setLoading(false);
        setError("Cannot analyze this page. WebSnatch works on regular web pages only.");
        return;
      }
      
      if (tab?.id) {
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_DATA' });
            if (response) {
                setData({
                fonts: aggregateFonts(response.fonts || []),
                colors: response.colors.map((c: any) => ({ hex: c.hex, rgb: c.rgba, hsl: '', type: c.type || 'auto', role: c.role, count: c.usageCount })),
                spacing: response.spacing || [],
                assets: response.assets || [],
                scrollAnimations: response.scrollAnimations || [],
                redFlags: [], // Only red flags are lazy loaded
                htmlStructure: response.htmlStructure,
                siteCloneData: response.siteCloneData,
                meta: response.meta
                });
            } else {
                setError("Could not analyze page. Try reloading.");
            }
        } catch (msgError) {
            // If message fails, try injecting script if we haven't already retried
            if (!retry) {
                console.log('Message failed, attempting to inject content script...');
                const injected = await injectContentScript(tab.id);
                if (injected) {
                    // Small delay to ensure script initializes
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return fetchData(true);
                }
            }
            throw msgError;
        }
      }
    } catch (e) {
      console.error('Failed to fetch data', e);
      setError("Please refresh the page you want to analyze.");
      analytics.trackError('data_fetch_failed', (e as Error).message);
    }
    setLoading(false);
  };

  // Check version on mount
  const checkVersion = async () => {
    setCheckingVersion(true);
    try {
      // Get current extension version from manifest
      const manifest = chrome.runtime.getManifest();
      const extVersion = manifest.version;
      setCurrentVersion(extVersion);
      
      // Fetch version requirements from server
      const response = await fetch(VERSION_API_URL);
      if (!response.ok) throw new Error('Failed to fetch version info');
      
      const info: VersionInfo = await response.json();
      setVersionInfo(info);
      
      // Check if update is required
      if (info.forceUpdate && !compareVersions(extVersion, info.minVersion)) {
        setUpdateRequired(true);
      } else {
        setUpdateRequired(false);
      }
    } catch (e) {
      // If version check fails, allow the app to work (fail open)
      console.warn('Version check failed:', e);
      setUpdateRequired(false);
    } finally {
      setCheckingVersion(false);
    }
  };

  useEffect(() => {
    checkVersion();
  }, []);

  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('di-theme') as 'light' | 'dark' | 'system' | null;
    
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  useEffect(() => {
    // Track popup opened (only once per session)
    if (!hasTrackedOpen.current) {
      hasTrackedOpen.current = true;
      analytics.trackPopupOpened();
      
      // Track the domain being analyzed
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.url) {
          try {
            const domain = new URL(tab.url).hostname;
            analytics.trackWebsiteAnalyzed(domain);
          } catch (e) {
            // Ignore invalid URLs
          }
        }
      });
    }
    
    fetchData();
    
    // Listen for delayed scroll animation updates
    const messageListener = (message: any) => {
      if (message.action === 'SCROLL_ANIMATIONS_UPDATED') {
        console.log('📨 Received delayed scroll animations update');
        setData({ scrollAnimations: message.scrollAnimations });
      } else if (message.action === 'INSPECTOR_DISABLED') {
        setInspecting(false);

      } else if (message.action === 'INSPECTOR_ELEMENT_SELECTED') {
        // Received element data from content script in sidebar mode
        setInspectorData(message.data);
        setActiveTab('inspector');
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const toggleInspector = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if URL is analyzable before attempting to toggle inspector
    if (!isAnalyzableUrl(tab?.url)) {
      setError("Cannot use inspector on this page. WebSnatch works on regular web pages only.");
      return;
    }
    
    const newState = !isInspecting;
    setInspecting(newState);
    analytics.trackInspectorToggled(newState);
    
    // Get the saved highlight color
    const highlightColor = localStorage.getItem('di-highlightColor') || '#3b82f6';
    
     if (tab?.id) {
       try {
           await chrome.tabs.sendMessage(tab.id, { 
             action: 'TOGGLE_INSPECTOR', 
             payload: newState,
             highlightColor,
             sidebarMode: isSidePanel
           });
       } catch (e) {
           await injectContentScript(tab.id);
           try {
             await chrome.tabs.sendMessage(tab.id, { 
               action: 'TOGGLE_INSPECTOR', 
               payload: newState,
               highlightColor,
               sidebarMode: isSidePanel
             });
           } catch (retryError) {
             console.error('Failed to toggle inspector', retryError);
             setError("Please refresh the page to use the inspector.");
           }
       }
       
       // Clear inspector data when disabling
       if (!newState) {
         setInspectorData(null);
         if (activeTab === 'inspector') setActiveTab('overview');
       }
    }
  };

  const tabs = [
    { id: 'overview', icon: Layers, label: 'Overview' },
    { id: 'typography', icon: Type, label: 'Typography' },
    { id: 'colors', icon: Palette, label: 'Colors' },
    { id: 'assets', icon: ImageIcon, label: 'Assets' },
    { id: 'spacing', icon: Layout, label: 'Spacing' },
    { id: 'scroll', icon: Play, label: 'Scroll Animations' },
    { id: 'redflags', icon: AlertTriangle, label: 'Red Flags' },
    { id: 'flows', icon: Workflow, label: 'User Flows' },
    { id: 'prompt', icon: Sparkles, label: 'Generate' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  const renderContent = () => {
    // 1. Loading State
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in duration-500">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                    <div className="relative bg-card p-4 rounded-3xl shadow-xl flex items-center justify-center border border-border/50">
                       <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold">Analyzing Design...</h3>
                    <p className="text-muted-foreground text-sm">Extracting style tokens from the page.</p>
                </div>
            </div>
        );
    }

    // 2. Error State
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-8">
                <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-foreground">Connection Lost</h3>
                    <p className="text-muted-foreground">{error}</p>
                </div>
                <button onClick={() => fetchData(false)} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all">
                    Retry Analysis
                </button>
            </div>
        );
    }

    // 3. Tab Content
    switch (activeTab) {
      case 'typography': return <TypographyPanel />;
      case 'colors': return <ColorPanel />;
      case 'assets': return <AssetsPanel />;
      case 'spacing': return <SpacingPanel />;
      case 'scroll': return <ScrollInspectorPanel />;
      case 'redflags': return <RedFlagsPanel />;
      case 'flows': return <FlowsPanel />;
      case 'prompt': return <GeneratePanel />;
      case 'settings': return <SettingsPanel />;
      case 'inspector': return <InspectorPanel data={inspectorData} onClear={() => { setInspectorData(null); setActiveTab('overview'); }} />;
      case 'overview': return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500 pb-6">
            {/* Visual Inspector Toggle - with switch button */}
            <div className={clsx(
              "rounded-lg border-2 overflow-hidden transition-all duration-200 neo-shadow",
              isInspecting 
                ? "border-primary bg-primary" 
                : "border-foreground/20 bg-card hover:border-primary"
            )}>
              <button 
                onClick={toggleInspector} 
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2.5 rounded-lg transition-colors",
                    isInspecting ? "bg-white/20" : "bg-primary/10"
                  )}>
                    <MousePointer2 className={clsx("w-5 h-5", isInspecting ? "text-white" : "text-primary")} />
                  </div>
                  <div>
                    <h3 className={clsx("font-bold", isInspecting ? "text-white" : "text-foreground")}>
                      Visual Inspector
                    </h3>
                    <p className={clsx("text-xs", isInspecting ? "text-white/70" : "text-muted-foreground")}>
                      {isInspecting ? 'Click any element to inspect' : 'Click to enable'}
                    </p>
                  </div>
                </div>
                {/* Toggle Switch */}
                <div className={clsx(
                  "w-12 h-7 rounded-full p-1 transition-colors",
                  isInspecting ? "bg-white/30" : "bg-foreground/10"
                )}>
                  <div className={clsx(
                    "w-5 h-5 rounded-full transition-all shadow-sm",
                    isInspecting 
                      ? "bg-white translate-x-5" 
                      : "bg-muted-foreground/60 translate-x-0"
                  )} />
                </div>
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setActiveTab('typography')} className="bg-card p-5 rounded-lg border-2 border-foreground/20 group hover:border-primary transition-all text-left card-hover neo-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-500/10 p-3 rounded-lg">
                            <Type className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="bg-secondary text-foreground text-xs font-bold px-2 py-1 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            View
                        </span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-4xl font-black text-foreground">{data.fonts.length}</span>
                        <p className="text-sm font-medium text-muted-foreground">Font Families</p>
                    </div>
                </button>

                <button onClick={() => setActiveTab('colors')} className="bg-card p-5 rounded-lg border-2 border-foreground/20 group hover:border-primary transition-all text-left card-hover neo-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary/10 p-3 rounded-lg">
                            <Palette className="w-6 h-6 text-primary" />
                        </div>
                         <span className="bg-secondary text-foreground text-xs font-bold px-2 py-1 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            View
                        </span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-4xl font-black text-foreground">{data.colors.length}</span>
                        <p className="text-sm font-medium text-muted-foreground">Color Palette</p>
                    </div>
                </button>

                <button onClick={() => setActiveTab('spacing')} className="bg-card p-5 rounded-lg border-2 border-foreground/20 group hover:border-primary transition-all text-left card-hover neo-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-green-500/10 p-3 rounded-lg">
                            <Layout className="w-6 h-6 text-green-500" />
                        </div>
                        <span className="bg-secondary text-foreground text-xs font-bold px-2 py-1 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            View
                        </span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-4xl font-black text-foreground">{data.spacing.length}</span>
                        <p className="text-sm font-medium text-muted-foreground">Spacing Tokens</p>
                    </div>
                </button>

                <button onClick={() => setActiveTab('assets')} className="bg-card p-5 rounded-lg border-2 border-foreground/20 group hover:border-primary transition-all text-left card-hover neo-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-orange-500/10 p-3 rounded-lg">
                            <ImageIcon className="w-6 h-6 text-orange-500" />
                        </div>
                        <span className="bg-secondary text-foreground text-xs font-bold px-2 py-1 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            View
                        </span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-4xl font-black text-foreground">{data.assets.length}</span>
                        <p className="text-sm font-medium text-muted-foreground">Assets</p>
                    </div>
                </button>
            </div>

            {/* Current Page Info */}
            {data.meta?.title && (
              <div className="bg-card rounded-lg border-2 border-foreground/20 p-5 space-y-4 neo-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center shrink-0">
                    <Layers className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{data.meta.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{data.meta.url}</p>
                  </div>
                </div>
                {data.meta.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 border-t border-border/50 pt-3">
                    {data.meta.description}
                  </p>
                )}
              </div>
            )}
            
            {/* Generate AI Prompt CTA */}
            <button 
              onClick={() => setActiveTab('prompt')}
              className="w-full bg-primary text-white p-5 rounded-lg border-2 border-foreground/20 flex items-center justify-between group neo-shadow-lg neo-button transition-all hover:bg-primary/90"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Generate AI Prompt</h3>
                  <p className="text-sm text-white/80">Create a prompt to replicate this design</p>
                </div>
              </div>
              <span className="bg-white/20 px-4 py-2 rounded-xl font-bold text-sm group-hover:bg-white group-hover:text-primary transition-colors">
                Go →
              </span>
            </button>
        </div>
      );
      default: return null;
    }
  };

  // State for tooltip
  const [hoveredTab, setHoveredTab] = useState<{ id: string, label: string, rect: DOMRect } | null>(null);

  // Handle tooltip calculation
  const handleMouseEnter = (e: React.MouseEvent, tab: { id: string, label: string }) => {
    setHoveredTab({
      id: tab.id,
      label: tab.label,
      rect: e.currentTarget.getBoundingClientRect()
    });
  };

  // Show update required screen if version is outdated
  if (updateRequired && versionInfo) {
    return (
      <UpdateRequiredScreen
        updateMessage={versionInfo.updateMessage}
        storeUrl={versionInfo.storeUrl}
        currentVersion={currentVersion}
        minVersion={versionInfo.minVersion}
        onRetry={checkVersion}
        isChecking={checkingVersion}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground font-sans antialiased overflow-hidden grain-bg">
      {/* Playful Floating Sidebar */}
      <div className="w-20 py-6 pl-4 flex flex-col gap-4 z-20">
        <div className="w-14 h-14 bg-primary rounded-lg border-2 border-foreground/20 neo-shadow-lg flex items-center justify-center mb-2 transform hover:rotate-3 transition-transform cursor-pointer">
             <Code2 className="w-8 h-8 text-white" />
        </div>

        <nav className="flex-1 flex flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as Tab);
                analytics.trackTabViewed(tab.id, tab.label);
              }}
              onMouseEnter={(e) => handleMouseEnter(e, tab)}
              onMouseLeave={() => setHoveredTab(null)}
              className={clsx(
                "w-14 h-14 rounded-lg flex items-center justify-center transition-all duration-200 relative group border-2",
                activeTab === tab.id 
                  ? "bg-card text-primary border-primary neo-shadow translate-x-2" 
                  : "bg-card/50 border-transparent text-muted-foreground hover:bg-card hover:border-foreground/20 hover:text-foreground hover:translate-x-1"
              )}
            >
              <tab.icon className={clsx("w-6 h-6 transition-transform duration-300", activeTab === tab.id && "scale-110", "group-hover:scale-110")} />
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden">
         <header className="h-20 flex items-center justify-between px-8 pt-6 pb-2 shrink-0">
            <div>
                <h1 
                    className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => chrome.tabs.create({ url: 'https://www.websnatch.dev/' })}
                    title="Visit WebSnatch Website"
                >
                    WebSnatch
                </h1>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'overview' && (
                  <button 
                    onClick={() => fetchData(false)} 
                    className="w-10 h-10 rounded-lg bg-card border-2 border-foreground/20 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all neo-shadow"
                    title="Refresh Data"
                  >
                    <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
                  </button>
              )}
              {isSidePanel ? (
                <button
                  onClick={() => window.close()}
                  className="h-10 px-2 rounded-lg bg-primary/10 border-2 border-primary/30 flex items-center justify-center gap-2 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  title="Click to close sidebar"
                >
                  <PanelRightOpen className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={openSidePanel}
                  className="w-10 h-10 rounded-lg bg-card border-2 border-foreground/20 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all neo-shadow"
                  title="Pin as Sidebar"
                >
                  <PanelRightOpen className="w-5 h-5" />
                </button>
              )}
            </div>
         </header>

         <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 pt-4">
             <div className="max-w-4xl mx-auto h-full pb-10">
                 {renderContent()}
             </div>
         </div>
         
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
      </main>

      {/* Floating Tooltip Portal */}
      {hoveredTab && (
        <div 
          className="fixed bg-foreground text-background text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl z-50 pointer-events-none transition-opacity animate-in fade-in zoom-in-95 duration-200"
          style={{
            left: `${hoveredTab.rect.right + 10}px`,
            top: `${hoveredTab.rect.top + (hoveredTab.rect.height / 2)}px`,
            transform: 'translateY(-50%)'
          }}
        >
          {hoveredTab.label}
        </div>
      )}
    </div>
  );
}
