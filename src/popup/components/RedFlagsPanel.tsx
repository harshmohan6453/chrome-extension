import { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  Info, 
  AlertCircle, 
  Download, 
  CheckCircle2, 
  ChevronDown,
  ShieldAlert,
  Search,
  Layout,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { useStore } from '../../store';
import type { RedFlag } from '../../store';
import { clsx } from 'clsx';

export default function RedFlagsPanel() {
  const { redFlags } = useStore((state) => state.data);
  const { redFlagsLoaded, setRedFlagsLoaded, setData } = useStore();
  const [loading, setLoading] = useState(false);
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'priority' | 'category'>('priority');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch red flags on first mount if not loaded
  useEffect(() => {
    if (!redFlagsLoaded && !loading) {
      fetchRedFlags();
    }
  }, [redFlagsLoaded, loading]);

  const fetchRedFlags = async () => {
    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_RED_FLAGS' });
        if (response?.redFlags) {
          setData({ redFlags: response.redFlags });
          setRedFlagsLoaded(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch red flags:', error);
    } finally {
      setLoading(false);
    }
  };

  // Count by severity
  const criticalCount = redFlags.filter((f) => f.severity === 'critical').length;
  const warningCount = redFlags.filter((f) => f.severity === 'warning').length;
  const infoCount = redFlags.filter((f) => f.severity === 'info').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'info': return <Info className="w-5 h-5 text-blue-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'seo': return { name: 'SEO', color: 'bg-green-500/10 text-green-600 border-green-500/20' };
      case 'ux': return { name: 'UX', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
      case 'accessibility': return { name: 'A11y', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
      case 'mobile': return { name: 'Mobile', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' };
      case 'performance': return { name: 'Perf', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
      default: return { name: 'Other', color: 'bg-foreground/10 text-muted-foreground border-foreground/20' };
    }
  };

  // Calculate Global Health Score (0-100)
  const healthScore = useMemo(() => {
    let score = 100;
    score -= criticalCount * 15; 
    score -= warningCount * 5;   
    score -= infoCount * 1;      
    return Math.max(0, score);
  }, [criticalCount, warningCount, infoCount]);
  
  const getScoreStyle = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-500/10 border-green-500/20';
    if (score >= 50) return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    return 'text-red-600 bg-red-500/10 border-red-500/20';
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedFlags);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedFlags(newExpanded);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const downloadReport = () => {
    let content = `# WebSnatch - Page Health Report\n\n`;
    content += `Health Score: ${healthScore}/100\n`;
    content += `Total Issues: ${redFlags.length}\n`;
    content += `Critical: ${criticalCount} | Warnings: ${warningCount} | Info: ${infoCount}\n\n`;
    
    redFlags.forEach(flag => {
      content += `## [${flag.severity.toUpperCase()}] ${flag.title}\n`;
      content += `**Category:** ${flag.category.toUpperCase()}\n`;
      content += `**Description:** ${flag.description}\n`;
      content += `**Recommendation:** ${flag.recommendation}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `websnatch-report-${Date.now()}.md`;
    a.click();
  };

  const filteredFlags = useMemo(() => {
    return redFlags.filter(f => 
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [redFlags, searchQuery]);

  const renderFlag = (flag: RedFlag) => {
    const categoryInfo = getCategoryInfo(flag.category);
    const isExpanded = expandedFlags.has(flag.id);
    
    return (
      <div
        key={flag.id}
        className={clsx(
            "bg-card rounded-xl border-2 transition-all neo-shadow-sm mb-3",
            isExpanded ? "border-primary" : "border-foreground/10 hover:border-primary/40"
        )}
      >
        {/* Header */}
        <div 
          onClick={() => toggleExpand(flag.id)}
          className="p-4 cursor-pointer flex items-start gap-3"
        >
          <div className="mt-0.5">{getSeverityIcon(flag.severity)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-black text-sm text-foreground truncate">{flag.title}</h3>
              <span className={clsx("px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider border", categoryInfo.color)}>
                {categoryInfo.name}
              </span>
              {flag.count && flag.count > 1 && (
                <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold bg-secondary text-muted-foreground border border-border">
                  {flag.count}x
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{flag.description}</p>
          </div>
          <div className={clsx(
              "p-1.5 rounded-lg transition-transform duration-300",
              isExpanded ? "rotate-180 bg-primary/10 text-primary" : "text-muted-foreground"
          )}>
             <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {/* Expanded */}
        {isExpanded && (
          <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="h-px bg-border/50 mb-4" />
            
            <div className="space-y-4">
                {/* Recommendation */}
                <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg">
                    <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> Recommendation
                    </div>
                    <p className="text-xs font-bold text-foreground leading-relaxed">
                        {flag.recommendation}
                    </p>
                </div>

                {/* Score & Impact */}
                {flag.impactScore && (
                    <div className="flex gap-2">
                        <div className="flex-1 bg-secondary/30 p-2 rounded-lg border border-border">
                            <div className="text-[10px] font-black text-muted-foreground uppercase mb-0.5">Impact</div>
                            <div className="text-sm font-black text-foreground">{flag.impactScore}/10</div>
                        </div>
                        {flag.estimatedImpact && (
                            <div className="flex-[2] bg-secondary/30 p-2 rounded-lg border border-border">
                                <div className="text-[10px] font-black text-muted-foreground uppercase mb-0.5">Estimate</div>
                                <div className="text-xs font-bold text-foreground">{flag.estimatedImpact}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Fix Code */}
                {flag.fixCode && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Example Fix</div>
                        <div className="relative group">
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded-xl text-[10px] overflow-x-auto font-mono border-2 border-foreground/10">
                                {flag.fixCode}
                            </pre>
                            <button 
                                onClick={(e) => { e.stopPropagation(); copyCode(flag.fixCode!, flag.id); }}
                                className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all backdrop-blur-sm"
                            >
                                {copiedCode === flag.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* Affected Elements */}
                {flag.affectedElements && flag.affectedElements.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Affected Elements</div>
                        <div className="flex flex-wrap gap-1.5">
                            {flag.affectedElements.slice(0, 5).map((el, i) => (
                                <code key={i} className="px-1.5 py-0.5 bg-secondary text-[10px] font-mono rounded border border-border text-red-500">
                                    {el}
                                </code>
                            ))}
                        </div>
                    </div>
                )}

                {/* Link */}
                {flag.learnMoreUrl && (
                    <button 
                        onClick={() => window.open(flag.learnMoreUrl, '_blank')}
                        className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg transition-all"
                    >
                        Learn more <ExternalLink className="w-3 h-3" />
                    </button>
                )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
          <div className="relative bg-card p-4 rounded-2xl neo-shadow-lg flex items-center justify-center border-2 border-foreground/20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        <h3 className="text-lg font-black tracking-tight mb-1">Auditing Page...</h3>
        <p className="text-xs text-muted-foreground">Identifying SEO & UX issues</p>
      </div>
    );
  }

  if (redFlags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border/50">
        <div className="p-4 bg-green-500/10 text-green-600 rounded-full mb-4 border border-green-500/20">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="font-bold text-lg mb-1 text-foreground">Clean Bill of Health!</p>
        <p className="text-sm opacity-70">No major red flags detected on this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header & Score */}
      <div className="bg-card rounded-xl border-2 border-foreground/10 neo-shadow overflow-hidden">
        <div className="p-5 flex items-center gap-6">
            {/* Score Ring */}
            <div className={clsx(
                "relative flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 shadow-inner shrink-0",
                getScoreStyle(healthScore)
            )}>
                <span className="text-3xl font-black">{healthScore}</span>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Score</span>
            </div>

            <div className="flex-1 space-y-3">
                <div>
                    <h2 className="text-xl font-black tracking-tight">Audit Summary</h2>
                    <p className="text-xs text-muted-foreground">{redFlags.length} total observations</p>
                </div>
                <div className="flex gap-2">
                    <div className="px-2 py-1 bg-red-500/10 text-red-600 rounded-md border border-red-500/20 text-[10px] font-black">
                        {criticalCount} CRITICAL
                    </div>
                    <div className="px-2 py-1 bg-amber-500/10 text-amber-600 rounded-md border border-amber-500/20 text-[10px] font-black">
                        {warningCount} WARNINGS
                    </div>
                </div>
            </div>
        </div>
        <div className="p-3 bg-secondary/30 border-t border-border/50 flex justify-between items-center">
            <div className="flex gap-1">
                <button 
                    onClick={() => setViewMode('priority')}
                    className={clsx(
                        "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                        viewMode === 'priority' ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Priority
                </button>
                <button 
                    onClick={() => setViewMode('category')}
                    className={clsx(
                        "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                        viewMode === 'category' ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Categories
                </button>
            </div>
            <button 
                onClick={downloadReport}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-wider neo-button shadow-sm"
            >
                <Download className="w-3 h-3" /> Report
            </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search issues or categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border-2 border-foreground/10 focus:border-primary/50 rounded-xl pl-10 pr-4 py-3 text-sm font-medium transition-all neo-shadow-sm"
        />
      </div>

      {/* List */}
      <div className="space-y-6">
        {viewMode === 'priority' ? (
            <>
                {criticalCount > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Critical Fixes</h3>
                        </div>
                        {filteredFlags.filter(f => f.severity === 'critical').map(renderFlag)}
                    </div>
                )}
                {warningCount > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Warnings</h3>
                        </div>
                        {filteredFlags.filter(f => f.severity === 'warning').map(renderFlag)}
                    </div>
                )}
                {infoCount > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <Info className="w-4 h-4 text-blue-500" />
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Recommendations</h3>
                        </div>
                        {filteredFlags.filter(f => f.severity === 'info').map(renderFlag)}
                    </div>
                )}
            </>
        ) : (
            ['seo', 'accessibility', 'ux', 'performance', 'mobile'].map(cat => {
                const flags = filteredFlags.filter(f => f.category === cat);
                if (flags.length === 0) return null;
                const info = getCategoryInfo(cat);
                return (
                    <div key={cat} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <Layout className="w-4 h-4 text-muted-foreground" />
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">{info.name} Issues</h3>
                        </div>
                        {flags.map(renderFlag)}
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
}