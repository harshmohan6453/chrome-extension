import { useState, useMemo } from 'react';
import { useStore, ScrollAnimationData } from '../../store';
import { 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Code, 
  MousePointer2, 
  Play, 
  Zap, 
  Check,
  Layers,
  Sparkles,
  Activity,
  History,
  RotateCcw
} from 'lucide-react';
import { clsx } from 'clsx';

const ScrollInspectorPanel = () => {
  const scrollAnimations = useStore(state => state.data.scrollAnimations);
  const [selectedLibrary, setSelectedLibrary] = useState<string>('all');
  const [expandedAnimations, setExpandedAnimations] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Get unique libraries
  const libraries = Array.from(new Set(scrollAnimations.map(anim => anim.library)));
  
  // Filter animations by library
  const filteredAnimations = selectedLibrary === 'all' 
    ? scrollAnimations 
    : scrollAnimations.filter(anim => anim.library === selectedLibrary);

  // Library display names and icons
  const getLibraryInfo = (library: string) => {
    const info: { [key: string]: { name: string; color: string; icon: any } } = {
      'gsap-scrolltrigger': { name: 'GSAP', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: Zap },
      'framer-motion': { name: 'Framer', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Play },
      'locomotive': { name: 'Locomotive', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Activity },
      'aos': { name: 'AOS', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: Sparkles },
      'scrollmagic': { name: 'ScrollMagic', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20', icon: MousePointer2 },
      'intersection-observer': { name: 'Observer', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: Eye },
      'css-scroll-timeline': { name: 'Timeline', color: 'bg-teal-500/10 text-teal-600 border-teal-500/20', icon: History },
      'custom': { name: 'Custom', color: 'bg-secondary text-muted-foreground border-foreground/10', icon: Code },
    };
    return info[library] || { name: library, color: 'bg-secondary text-muted-foreground border-foreground/10', icon: Layers };
  };

  // Toggle animation expansion
  const toggleAnimation = (id: string) => {
    const newExpanded = new Set(expandedAnimations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAnimations(newExpanded);
  };

  // Copy animation code
  const copyAnimationCode = (animation: ScrollAnimationData) => {
    let code = '';
    
    switch (animation.library) {
      case 'gsap-scrolltrigger':
        code = `gsap.to("${animation.element}", {
  scrollTrigger: {
    trigger: "${animation.trigger.element}",
    start: "${animation.trigger.start}",
    end: "${animation.trigger.end}",
    scrub: ${animation.trigger.scrub},
    pin: ${animation.trigger.pin || false}
  },
  ${animation.animation.properties.map(p => `${p}: /* value */`).join(',\n  ')},
  duration: ${animation.animation.duration || 1},
  ease: "${animation.animation.easing}"
});`;
        break;
        
      case 'framer-motion':
        code = `<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ 
    once: ${animation.trigger.once || false},
    margin: "${animation.trigger.start}"
  }}
  transition={{
    duration: ${animation.animation.duration || 0.5},
    ease: "${animation.animation.easing}"
  }}
/>`;
        break;
        
      default:
        code = `// ${animation.library} animation\n// Element: ${animation.element}\n// Properties: ${animation.animation.properties.join(', ')}`;
    }
    
    navigator.clipboard.writeText(code);
    setCopiedId(animation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Highlight element on page
  const highlightElement = (selector: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'HIGHLIGHT_ELEMENT',
          selector
        });
      }
    });
  };

  // Control animation
  const controlAnimation = (animationId: string, action: string, value?: number) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'CONTROL_ANIMATION',
          animationId,
          animationAction: action,
          value
        });
      }
    });
  };

  // Analysis Stats
  const stats = useMemo(() => {
    return {
        total: scrollAnimations.length,
        libraries: libraries.length,
        scrubbed: scrollAnimations.filter(a => a.trigger.scrub).length,
        pinned: scrollAnimations.filter(a => a.trigger.pin).length
    };
  }, [scrollAnimations, libraries]);

  if (scrollAnimations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground animate-in fade-in zoom-in-95 duration-500">
        <div className="p-6 bg-card/50 rounded-full mb-6 border-2 border-dashed border-border/50 neo-shadow">
          <Activity className="h-12 w-12 opacity-30" />
        </div>
        
        <h3 className="text-xl font-black text-foreground mb-2">No Scroll Animations Detected</h3>
        <p className="text-sm opacity-70 max-w-[280px] text-center mb-8">
          This page might not be using scroll libraries we detect, or animations haven't triggered yet.
        </p>

        {/* Supported Libraries */}
        <div className="w-full max-w-sm bg-card/50 rounded-xl border border-foreground/10 p-4 mb-6">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 text-center">
            Supported Libraries
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'GSAP ScrollTrigger', icon: Zap, color: 'text-green-500' },
              { name: 'Framer Motion', icon: Play, color: 'text-purple-500' },
              { name: 'Locomotive', icon: Activity, color: 'text-blue-500' },
              { name: 'AOS', icon: Sparkles, color: 'text-orange-500' },
              { name: 'Intersection Observer', icon: Eye, color: 'text-indigo-500' },
              { name: 'CSS Scroll Timeline', icon: History, color: 'text-teal-500' },
            ].map(lib => (
              <div key={lib.name} className="flex items-center gap-2 px-3 py-2 bg-background/50 rounded-lg border border-border/50">
                <lib.icon className={clsx("w-3.5 h-3.5", lib.color)} />
                <span className="text-xs font-medium">{lib.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight">Scroll Interactions</h2>
          <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
            {stats.total} Detected
          </span>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-card rounded-xl border-2 border-foreground/10 neo-shadow overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-border/50">
            <div className="p-4 flex flex-col items-center">
                <div className="text-3xl font-black text-foreground">{stats.libraries}</div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Libraries</div>
            </div>
            <div className="p-4 flex flex-col items-center">
                <div className="text-3xl font-black text-primary">{stats.scrubbed}</div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Scrubbed</div>
            </div>
            <div className="p-4 flex flex-col items-center">
                <div className="text-3xl font-black text-foreground">{stats.pinned}</div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pinned</div>
            </div>
            <div className="p-4 flex flex-col items-center">
                <div className="text-3xl font-black text-blue-500">{stats.total}</div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Triggers</div>
            </div>
        </div>
      </div>

      {/* Library Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setSelectedLibrary('all')}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border-2 shrink-0",
            selectedLibrary === 'all'
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {libraries.map((lib) => {
          const info = getLibraryInfo(lib);
          return (
            <button
              key={lib}
              onClick={() => setSelectedLibrary(lib)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border-2 shrink-0 flex items-center gap-1.5",
                selectedLibrary === lib
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-background border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground"
              )}
            >
              <info.icon className="w-3.5 h-3.5" />
              {info.name}
            </button>
          );
        })}
      </div>

      {/* Animation List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                Animation Triggers
            </h3>
        </div>

        {filteredAnimations.map((animation) => {
          const isExpanded = expandedAnimations.has(animation.id);
          const libraryInfo = getLibraryInfo(animation.library);
          
          return (
            <div
              key={animation.id}
              className={clsx(
                "bg-card border-2 rounded-xl overflow-hidden transition-all neo-shadow",
                isExpanded ? "border-primary" : "border-foreground/10 hover:border-primary/40"
              )}
            >
              {/* Card Header */}
              <div
                className="p-4 cursor-pointer flex items-center justify-between"
                onClick={() => toggleAnimation(animation.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border", libraryInfo.color)}>
                      {libraryInfo.name}
                    </span>
                    {animation.trigger.scrub && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        Scrub
                      </span>
                    )}
                    {animation.trigger.pin && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-pink-500/10 text-pink-600 border border-pink-500/20">
                        Pin
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-foreground truncate flex items-center gap-2">
                    <Code className="w-3.5 h-3.5 text-muted-foreground" />
                    {animation.element}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">
                    Triggers at: {animation.trigger.start}
                  </p>
                </div>
                <div className={clsx(
                    "p-2 rounded-lg transition-colors",
                    isExpanded ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="h-px bg-border/50" />
                  
                  {/* Grid Details */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: Trigger */}
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <MousePointer2 className="w-3 h-3" /> Trigger
                        </div>
                        <div className="bg-secondary/30 p-2.5 rounded-lg space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground">Start</span>
                                <span className="text-xs font-bold font-mono">{animation.trigger.start}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground">End</span>
                                <span className="text-xs font-bold font-mono">{animation.trigger.end}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Properties */}
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Zap className="w-3 h-3" /> Properties
                        </div>
                        <div className="bg-secondary/30 p-2.5 rounded-lg space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground">Type</span>
                                <span className="text-xs font-bold capitalize">{animation.animation.type}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground">Duration</span>
                                <span className="text-xs font-bold font-mono">{animation.animation.duration || '-'}</span>
                            </div>
                        </div>
                    </div>
                  </div>

                  {/* Animated Props */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Animated Styles
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {animation.animation.properties.map(p => (
                            <span key={p} className="px-2 py-1 bg-secondary text-foreground text-[10px] font-bold rounded border border-border">
                                {p}
                            </span>
                        ))}
                    </div>
                  </div>

                  {/* Progress Slider (Contextual) */}
                  {(animation.library === 'gsap-scrolltrigger' || animation.library === 'css-scroll-timeline') && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live Scrub</span>
                        <span className="text-[10px] font-bold text-primary">Slide to preview</span>
                      </div>
                      <div className="bg-secondary/30 p-3 rounded-xl border border-border/50">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue="0"
                            onChange={(e) => {
                            const progress = parseInt(e.target.value) / 100;
                            controlAnimation(animation.id, 'setProgress', progress);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-muted-foreground font-mono">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        controlAnimation(animation.id, 'restart');
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 rounded-lg text-xs font-black transition-all border-2 border-orange-500/20"
                    >
                      <RotateCcw className="w-4 h-4" /> REPLAY
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        highlightElement(animation.element);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg text-xs font-black transition-all border-2 border-blue-500/20"
                    >
                      <Eye className="w-4 h-4" /> SHOW
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAnimationCode(animation);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 rounded-lg text-xs font-black transition-all border-2 border-green-500/20 col-span-2"
                    >
                      {copiedId === animation.id ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                      {copiedId === animation.id ? "COPIED" : "GET CODE"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScrollInspectorPanel;