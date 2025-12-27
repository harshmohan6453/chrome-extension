import { useState, useEffect } from 'react';
import { Type, Palette, Layout, MousePointer2, Code2, Settings, Sparkles, RefreshCw, Layers, Image as ImageIcon, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store';
import { TypographyPanel } from './components/TypographyPanel';
import { ColorPanel } from './components/ColorPanel';
import { SpacingPanel } from './components/SpacingPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { TechPanel } from './components/TechPanel';
import { AssetsPanel } from './components/AssetsPanel';
import { GeneratePanel } from './components/GeneratePanel';
import ScrollInspectorPanel from './components/ScrollInspectorPanel';

type Tab = 'overview' | 'typography' | 'colors' | 'assets' | 'spacing' | 'scroll' | 'technologies' | 'prompt' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data, setData, isInspecting, setInspecting } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (tab?.id) {
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_DATA' });
            if (response) {
                setData({
                fonts: response.fonts.map((f: any) => ({ family: f.family, variants: [f.weight], sizes: [f.size], count: 1 })), 
                colors: response.colors.map((c: any) => ({ hex: c.hex, rgb: c.rgba, hsl: '', type: c.type || 'auto', role: c.role, count: c.usageCount })),
                spacing: response.spacing || [],
                technologies: response.technologies || [],
                assets: response.assets || [],
                scrollAnimations: response.scrollAnimations || [],
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
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    // Listen for delayed scroll animation updates
    const messageListener = (message: any) => {
      if (message.action === 'SCROLL_ANIMATIONS_UPDATED') {
        console.log('📨 Received delayed scroll animations update');
        setData({ scrollAnimations: message.scrollAnimations });
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const toggleInspector = async () => {
    const newState = !isInspecting;
    setInspecting(newState);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
       try {
           await chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_INSPECTOR', payload: newState });
       } catch (e) {
           await injectContentScript(tab.id);
           try {
             await chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_INSPECTOR', payload: newState });
           } catch (retryError) {
             console.error('Failed to toggle inspector', retryError);
             setError("Please refresh the page to use the inspector.");
           }
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
    { id: 'technologies', icon: Code2, label: 'Tech Stack' },
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
      case 'technologies': return <TechPanel />;
      case 'prompt': return <GeneratePanel />;
      case 'settings': return <SettingsPanel />;
      case 'overview': return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500 pb-20">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-primary text-primary-foreground rounded-3xl p-8 card-hover">
                <div className="relative z-10">
                    <h2 className="text-3xl font-extrabold mb-2">Design Inspector</h2>
                    <p className="text-primary-foreground/80 mb-6 max-w-[200px]">Unlock the secrets of any website's design system.</p>
                    <button 
                        onClick={() => setActiveTab('prompt')}
                        className="bg-white text-primary px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-white/90 transition-colors inline-flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Generate AI Prompt
                    </button>
                </div>
                
                {/* Abstract Illustration */}
                <div className="absolute top-0 right-0 w-64 h-64 translate-x-12 -translate-y-12 pointer-events-none">
                     <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                     <div className="absolute top-24 right-24 w-16 h-16 bg-accent rounded-2xl rotate-12 opacity-80 animate-float"></div>
                     <div className="absolute top-4 right-32 w-12 h-12 bg-white/20 rounded-full"></div>
                     <Layout className="absolute bottom-10 right-20 w-24 h-24 text-white/10 rotate-[-12deg]" />
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setActiveTab('typography')} className="bg-card p-5 rounded-2xl border border-border group hover:border-primary/50 transition-all text-left card-hover">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-500/10 p-3 rounded-xl">
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

                <button onClick={() => setActiveTab('colors')} className="bg-card p-5 rounded-2xl border border-border group hover:border-primary/50 transition-all text-left card-hover">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-purple-500/10 p-3 rounded-xl">
                            <Palette className="w-6 h-6 text-purple-500" />
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

                <button onClick={() => setActiveTab('technologies')} className="bg-card p-5 rounded-2xl border border-border group hover:border-primary/50 transition-all text-left card-hover col-span-2">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-green-500/10 p-3 rounded-xl">
                            <Code2 className="w-6 h-6 text-green-500" />
                        </div>
                         <span className="bg-secondary text-foreground text-xs font-bold px-2 py-1 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            View
                        </span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-4xl font-black text-foreground">{data.technologies?.length || 0}</span>
                        <p className="text-sm font-medium text-muted-foreground">Technologies Detected</p>
                    </div>
                </button>
            </div>
            
            {/* Inspector Toggle */}
            <div className="bg-card rounded-2xl border border-border p-1">
                <button 
                  onClick={toggleInspector} 
                  className={clsx(
                    "w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300",
                    isInspecting ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-secondary"
                  )}
                >
                    <div className="flex items-center gap-4">
                        <div className={clsx("p-2 rounded-lg", isInspecting ? "bg-white/20" : "bg-primary/10")}>
                            <MousePointer2 className={clsx("w-5 h-5", isInspecting ? "text-white" : "text-primary")} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold">Visual Inspector</h3>
                            <p className={clsx("text-xs", isInspecting ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                {isInspecting ? 'Active - Click elements to inspect' : 'Hover over elements to see details'}
                            </p>
                        </div>
                    </div>
                    <div className={clsx("w-10 h-6 rounded-full relative transition-colors", isInspecting ? "bg-white/30" : "bg-border")}>
                         <div className={clsx("absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300", isInspecting ? "left-5" : "left-1")}></div>
                    </div>
                </button>
            </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-secondary/30 text-foreground font-sans antialiased overflow-hidden">
      {/* Playful Floating Sidebar */}
      <div className="w-20 py-6 pl-4 flex flex-col gap-4 z-20">
        <div className="w-14 h-14 bg-gradient-to-br from-primary to-purple-600 rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center mb-2 transform hover:rotate-6 transition-transform cursor-pointer">
             <Code2 className="w-8 h-8 text-white" />
        </div>

        <nav className="flex-1 flex flex-col gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={clsx(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative group",
                activeTab === tab.id 
                  ? "bg-white text-primary shadow-xl shadow-primary/10 translate-x-2" 
                  : "bg-white/50 text-muted-foreground hover:bg-white hover:text-foreground hover:translate-x-1"
              )}
            >
              <tab.icon className={clsx("w-6 h-6 transition-transform duration-300", activeTab === tab.id && "scale-110", "group-hover:scale-110")} />
              <span className="absolute left-16 bg-foreground text-background text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-xl translate-x-[-10px] group-hover:translate-x-0">
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden">
         <header className="h-20 flex items-center justify-between px-8 pt-6 pb-2 shrink-0">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                    {tabs.find(t => t.id === activeTab)?.label}
                </h1>
            </div>
            {activeTab === 'overview' && (
                <button 
                  onClick={() => fetchData(false)} 
                  className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm hover:shadow-md"
                  title="Refresh Data"
                >
                  <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
                </button>
            )}
         </header>

         <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 pt-4">
             <div className="max-w-4xl mx-auto h-full pb-10">
                 {renderContent()}
             </div>
         </div>
         
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
      </main>
    </div>
  );
}
