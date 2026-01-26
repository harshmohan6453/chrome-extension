import { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { 
  Layout, 
  Ruler, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle, 
  ChevronDown,
  ChevronUp,
  TrendingUp
} from 'lucide-react';
import { clsx } from 'clsx';

export const SpacingPanel = () => {
  const { data } = useStore();
  const spacing = data.spacing || [];
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [showOutliers, setShowOutliers] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Spacing Scale Analysis
  const scaleAnalysis = useMemo(() => {
    if (spacing.length < 3) return null;

    const sorted = [...spacing].sort((a, b) => a - b);

    // Check for common base units
    const base4Count = sorted.filter(s => s % 4 === 0).length;
    const base8Count = sorted.filter(s => s % 8 === 0).length;
    const base4Percentage = (base4Count / sorted.length) * 100;
    const base8Percentage = (base8Count / sorted.length) * 100;

    // Detect outliers (values that don't fit the detected base)
    const detectedBase = base8Percentage >= 80 ? 8 : (base4Percentage >= 80 ? 4 : null);
    const outliers = detectedBase 
      ? sorted.filter(s => s % detectedBase !== 0)
      : [];

    // Check for linear scale patterns
    const differences: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      differences.push(sorted[i] - sorted[i - 1]);
    }
    const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
    const isLinear = differences.every(d => Math.abs(d - avgDiff) < avgDiff * 0.3);

    // Determine consistency verdict
    let verdict: 'excellent' | 'good' | 'mixed' = 'mixed';
    let verdictMessage = '';

    if (detectedBase && outliers.length === 0) {
      verdict = 'excellent';
      verdictMessage = `Perfect ${detectedBase}px grid system detected.`;
    } else if (detectedBase && outliers.length <= 2) {
      verdict = 'good';
      verdictMessage = `${detectedBase}px grid with minimal outliers.`;
    } else if (base4Percentage >= 60 || base8Percentage >= 60) {
      verdict = 'good';
      verdictMessage = `Mostly aligned to ${base8Percentage >= 60 ? '8' : '4'}px grid.`;
    } else {
      verdictMessage = 'No consistent grid pattern detected.';
    }

    return {
      detectedBase,
      outliers,
      base4Percentage,
      base8Percentage,
      isLinear,
      verdict,
      verdictMessage,
      smallest: sorted[0],
      largest: sorted[sorted.length - 1],
      uniqueValues: sorted
    };
  }, [spacing]);

  // Categorize spacing values
  const categories = useMemo(() => {
    const cats = [
      { name: 'XS', label: 'Extra Small', range: [0, 4], values: [] as number[] },
      { name: 'S', label: 'Small', range: [5, 12], values: [] as number[] },
      { name: 'M', label: 'Medium', range: [13, 24], values: [] as number[] },
      { name: 'L', label: 'Large', range: [25, 48], values: [] as number[] },
      { name: 'XL', label: 'Extra Large', range: [49, Infinity], values: [] as number[] },
    ];

    spacing.forEach(s => {
      const cat = cats.find(c => s >= c.range[0] && s <= c.range[1]);
      if (cat) cat.values.push(s);
    });

    return cats.filter(c => c.values.length > 0);
  }, [spacing]);

  // Copy to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedValue(id);
      setTimeout(() => setCopiedValue(null), 2000);
    });
  };

  // Export CSS Variables
  const exportCSSVariables = () => {
    const sorted = [...spacing].sort((a, b) => a - b);
    let css = '/* Spacing System - Extracted by WebSnatch */\n:root {\n';
    sorted.forEach((s, i) => {
      css += `  --space-${i + 1}: ${s}px; /* ${(s / 16).toFixed(3).replace(/\.?0+$/, '')}rem */\n`;
    });
    css += '}\n';

    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spacing-tokens.css';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight">Spacing</h2>
          <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
            {spacing.length} Tokens
          </span>
        </div>
        {spacing.length > 0 && (
          <button
            onClick={exportCSSVariables}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold neo-shadow neo-button transition-all active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSS</span>
          </button>
        )}
      </div>

      {spacing.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border/50 animate-in fade-in zoom-in-95 duration-500">
          <div className="p-4 bg-secondary rounded-full mb-4">
            <Layout className="h-8 w-8 opacity-50" />
          </div>
          <p className="font-bold text-lg mb-1">No Spacing Detected</p>
          <p className="text-sm opacity-70">Could not identify consistent spacing tokens.</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* Scale Analysis Card */}
          {scaleAnalysis && (
            <div className="bg-card rounded-xl border-2 border-foreground/10 neo-shadow overflow-hidden">
              {/* Header & Status */}
              <div className="p-4 border-b border-border/50 bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className={clsx("w-5 h-5", scaleAnalysis.verdict === 'excellent' ? "text-green-500" : "text-amber-500")} />
                    <h3 className="font-bold text-sm">System Consistency</h3>
                </div>
                <span className={clsx(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                    scaleAnalysis.verdict === 'excellent' ? "bg-green-500/10 text-green-600" : scaleAnalysis.verdict === 'good' ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"
                )}>
                    {scaleAnalysis.verdict === 'excellent' ? 'Pixel Perfect' : scaleAnalysis.verdict === 'good' ? 'Consistent' : 'Mixed Grid'}
                </span>
              </div>

              <div className="p-5 space-y-6">
                {/* Main Stats */}
                <div className="flex items-baseline justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Detected Base</div>
                        <div className="text-3xl font-black tracking-tight text-foreground">
                        {scaleAnalysis.detectedBase ? `${scaleAnalysis.detectedBase}px Grid` : "Custom"}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Smallest Unit</div>
                        <div className="text-3xl font-black tracking-tight text-primary">
                        {scaleAnalysis.smallest}px
                        </div>
                    </div>
                </div>

                {/* Visualization Scale */}
                <div className="h-32 flex items-end gap-1 pt-4 border-b border-border/50 pb-10 px-2 overflow-x-auto no-scrollbar">
                    {scaleAnalysis.uniqueValues.map((size, idx) => {
                        const maxSize = scaleAnalysis.largest;
                        const heightPercent = Math.max((size / maxSize) * 100, 10);
                        
                        return (
                            <div key={idx} className="flex-1 flex flex-col justify-end group items-center gap-2 relative min-w-[24px] h-full">
                                <div 
                                    className={clsx("w-full rounded-t-sm transition-all duration-500 hover:opacity-100", 
                                        scaleAnalysis.verdict === 'excellent' ? "bg-primary/60 group-hover:bg-primary" : "bg-foreground/20 group-hover:bg-foreground/40"
                                    )}
                                    style={{ height: `${heightPercent}%` }}
                                    title={`${size}px`}
                                />
                                <div className="text-[10px] font-mono text-muted-foreground -rotate-45 origin-left translate-x-1 absolute -bottom-8 opacity-60 group-hover:opacity-100 whitespace-nowrap">
                                    {size}px
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-secondary/50 p-2 rounded-lg border border-border/50">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Largest</div>
                        <div className="font-mono font-bold text-sm">{scaleAnalysis.largest}px</div>
                    </div>
                    <div className="bg-secondary/50 p-2 rounded-lg border border-border/50">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Tokens</div>
                        <div className="font-mono font-bold text-sm">{spacing.length}</div>
                    </div>
                    <div className="bg-secondary/50 p-2 rounded-lg border border-border/50">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Grid Alignment</div>
                        <div className="font-mono font-bold text-sm">
                            {Math.round(scaleAnalysis.detectedBase === 8 ? scaleAnalysis.base8Percentage : scaleAnalysis.base4Percentage)}%
                        </div>
                    </div>
                </div>
              </div>
            </div>
          )}

          {/* Outliers Warning */}
          {scaleAnalysis && scaleAnalysis.outliers.length > 0 && (
            <div className="bg-amber-500/5 border-2 border-amber-500/20 rounded-xl overflow-hidden neo-shadow">
              <button 
                onClick={() => setShowOutliers(!showOutliers)}
                className="w-full p-4 flex items-center justify-between hover:bg-amber-500/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-amber-900 dark:text-amber-100">Grid Deviations</h3>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                      {scaleAnalysis.outliers.length} values found outside the detected scale
                    </p>
                  </div>
                </div>
                {showOutliers ? <ChevronUp className="w-5 h-5 text-amber-600" /> : <ChevronDown className="w-5 h-5 text-amber-600" />}
              </button>

              {showOutliers && (
                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1">
                  <div className="flex flex-wrap gap-2 pt-2">
                    {scaleAnalysis.outliers.map((value, i) => (
                      <button
                        key={i}
                        onClick={() => copyToClipboard(`${value}px`, `outlier-${value}`)}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-background hover:border-amber-500/50 border border-border rounded-lg text-amber-700 dark:text-amber-400 font-mono font-bold text-xs transition-all"
                      >
                        {value}px
                        {copiedValue === `outlier-${value}` ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Categorized View */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
                <Ruler className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Spacing Categories
                </h3>
            </div>

            {categories.map((cat) => (
              <div key={cat.name} className="bg-card border-2 border-foreground/10 rounded-xl overflow-hidden transition-all hover:border-primary/30">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                  className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center font-black text-primary text-sm shadow-inner">
                      {cat.name}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-foreground">{cat.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {cat.values.length} token{cat.values.length > 1 ? 's' : ''} 
                        <span className="mx-1.5 opacity-30">|</span>
                        {cat.range[1] !== Infinity ? `${cat.range[0]}-${cat.range[1]}px` : `${cat.range[0]}px+`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex -space-x-2">
                      {Array.from(new Set(cat.values)).slice(0, 3).map((v, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-mono font-bold">
                            {v}
                        </div>
                      ))}
                    </div>
                    {expandedCategory === cat.name ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {expandedCategory === cat.name && (
                  <div className="p-4 pt-0 border-t border-border/50 bg-secondary/10">
                    <div className="grid gap-2 mt-4">
                      {Array.from(new Set(cat.values)).sort((a, b) => a - b).map((space, i) => {
                        const isOutlier = scaleAnalysis?.outliers.includes(space);
                        return (
                          <div 
                            key={i} 
                            className={clsx(
                                "flex items-center gap-4 p-3 rounded-lg border-2 transition-all group bg-card",
                                isOutlier ? "border-amber-500/20 hover:border-amber-500/40" : "border-transparent hover:border-primary/40"
                            )}
                          >
                            {/* Value */}
                            <div className="w-20 shrink-0">
                                <div className="font-black font-mono text-xl text-foreground">{space}px</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                    {(space / 16).toFixed(3).replace(/\.?0+$/, '')}rem
                                </div>
                            </div>

                            {/* Visualization Column */}
                            <div className="flex-1 flex items-center gap-4 px-4 min-w-0">
                                {/* The Ruler Bar */}
                                <div className="flex-1 h-8 bg-secondary/30 rounded-lg border-2 border-border/50 relative overflow-hidden group-hover:bg-secondary/50 transition-colors">
                                    {/* Grid lines every 8px (Small Ticks) */}
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px)', backgroundSize: '8px 100%' }}></div>
                                    {/* Grid lines every 32px (Large Ticks) */}
                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px)', backgroundSize: '32px 100%' }}></div>
                                    
                                    {/* The Value Bar */}
                                    <div 
                                        style={{ width: `${Math.min((space / (scaleAnalysis?.largest || 100)) * 100, 100)}%` }} 
                                        className={clsx(
                                            "h-full transition-all duration-700 relative z-10 flex items-center justify-end px-2",
                                            isOutlier ? "bg-amber-500/30 border-r-2 border-amber-500" : "bg-primary/20 border-r-2 border-primary"
                                        )} 
                                    >
                                        <span className="text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {Math.round((space / (scaleAnalysis?.largest || 1)) * 100)}%
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Physical Gap Preview (Only for smaller values to avoid overflow) */}
                                <div className="hidden md:flex w-12 items-center justify-center shrink-0">
                                    <div 
                                        style={{ width: `${Math.min(space, 40)}px`, height: '16px' }} 
                                        className={clsx(
                                            "border-x-2 rounded-sm shadow-sm transition-all",
                                            isOutlier ? "bg-amber-500/20 border-amber-500" : "bg-primary/20 border-primary"
                                        )}
                                        title={`Visual scale of ${space}px`}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => copyToClipboard(`${space}px`, `space-${space}`)}
                                    className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                                    title="Copy PX"
                                >
                                    {copiedValue === `space-${space}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
