import { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { 
  Layout, 
  Ruler, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

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
    let verdict: 'excellent' | 'good' | 'inconsistent' = 'inconsistent';
    let verdictMessage = '';

    if (detectedBase && outliers.length === 0) {
      verdict = 'excellent';
      verdictMessage = `Perfect ${detectedBase}px grid system`;
    } else if (detectedBase && outliers.length <= 2) {
      verdict = 'good';
      verdictMessage = `${detectedBase}px grid with ${outliers.length} outlier${outliers.length > 1 ? 's' : ''}`;
    } else if (base4Percentage >= 60 || base8Percentage >= 60) {
      verdict = 'good';
      verdictMessage = `Mostly aligned to ${base8Percentage >= 60 ? '8' : '4'}px grid`;
    } else {
      verdictMessage = 'No consistent grid pattern detected';
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
    let css = '/* Spacing System - Extracted by Design Inspector */\n:root {\n';
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

  // Verdict badge styling
  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'excellent':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'good':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return 'bg-red-500/10 text-red-600 border-red-500/20';
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'excellent':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'good':
        return <Info className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Spacing System</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Detected padding & margin values used across the page.
          </p>
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
        <div className="space-y-6">
          
          {/* Scale Analysis Card */}
          {scaleAnalysis && (
            <div className="bg-card border-2 border-foreground/20 rounded-lg overflow-hidden neo-shadow">
              <div className="p-5 border-b border-border/50 bg-gradient-to-r from-transparent to-primary/5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Scale Analysis</h3>
                      <p className="text-xs text-muted-foreground">Automatic grid detection</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold ${getVerdictStyle(scaleAnalysis.verdict)}`}>
                    {getVerdictIcon(scaleAnalysis.verdict)}
                    <span className="capitalize">{scaleAnalysis.verdict}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">{scaleAnalysis.verdictMessage}</p>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-secondary/30 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black font-mono">{scaleAnalysis.smallest}px</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Smallest</div>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black font-mono">{scaleAnalysis.largest}px</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Largest</div>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black font-mono">{spacing.length}</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Tokens</div>
                  </div>
                </div>

                {/* Base Unit */}
                {scaleAnalysis.detectedBase && (
                  <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="font-black text-primary">{scaleAnalysis.detectedBase}</span>
                    </div>
                    <div>
                      <div className="font-bold text-sm">Base Unit: {scaleAnalysis.detectedBase}px</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(scaleAnalysis.detectedBase === 8 ? scaleAnalysis.base8Percentage : scaleAnalysis.base4Percentage)}% of values align to this grid
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Outliers Warning */}
          {scaleAnalysis && scaleAnalysis.outliers.length > 0 && (
            <div className="bg-yellow-500/5 border-2 border-yellow-500/30 rounded-lg overflow-hidden">
              <button 
                onClick={() => setShowOutliers(!showOutliers)}
                className="w-full p-4 flex items-center justify-between hover:bg-yellow-500/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-yellow-700">Outliers Detected</h3>
                    <p className="text-xs text-yellow-600/80">
                      {scaleAnalysis.outliers.length} value{scaleAnalysis.outliers.length > 1 ? 's' : ''} don't fit the {scaleAnalysis.detectedBase}px grid
                    </p>
                  </div>
                </div>
                {showOutliers ? <ChevronUp className="w-5 h-5 text-yellow-600" /> : <ChevronDown className="w-5 h-5 text-yellow-600" />}
              </button>

              {showOutliers && (
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {scaleAnalysis.outliers.map((value, i) => (
                      <button
                        key={i}
                        onClick={() => copyToClipboard(`${value}px`, `outlier-${value}`)}
                        className="group flex items-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-700 font-mono font-bold text-sm transition-all"
                      >
                        {value}px
                        {copiedValue === `outlier-${value}` ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
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
            <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <Ruler className="w-4 h-4" /> SPACING TOKENS BY SIZE
            </h3>

            {categories.map((cat) => (
              <div key={cat.name} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                  className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center font-black text-primary text-sm">
                      {cat.name}
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{cat.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {cat.values.length} token{cat.values.length > 1 ? 's' : ''} 
                        {cat.range[1] !== Infinity ? ` (${cat.range[0]}-${cat.range[1]}px)` : ` (${cat.range[0]}px+)`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex gap-1">
                      {cat.values.slice(0, 5).map((v, i) => (
                        <span key={i} className="text-xs font-mono bg-secondary px-2 py-1 rounded">{v}</span>
                      ))}
                      {cat.values.length > 5 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">+{cat.values.length - 5}</span>
                      )}
                    </div>
                    {expandedCategory === cat.name ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {expandedCategory === cat.name && (
                  <div className="p-4 pt-0 border-t border-border/50">
                    <div className="grid gap-2 mt-4">
                      {cat.values.sort((a, b) => a - b).map((space, i) => {
                        const isOutlier = scaleAnalysis?.outliers.includes(space);
                        return (
                          <div 
                            key={i} 
                            className={`flex items-center gap-4 p-3 rounded-lg border transition-all group ${
                              isOutlier 
                                ? 'border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50' 
                                : 'border-border bg-background hover:border-primary/50'
                            }`}
                          >
                            {/* Value & Copy Button */}
                            <button
                              onClick={() => copyToClipboard(`${space}px`, `space-${space}`)}
                              className="w-20 shrink-0 flex items-center gap-2 group/copy"
                            >
                              <div className="font-black font-mono text-lg">{space}px</div>
                              {copiedValue === `space-${space}` ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4 opacity-0 group-hover/copy:opacity-50 transition-opacity" />
                              )}
                            </button>
                            
                            {/* REM Value */}
                            <div className="text-xs text-muted-foreground font-mono w-16">
                              {(space / 16).toFixed(3).replace(/\.?0+$/, '')}rem
                            </div>

                            {/* Visual Bar */}
                            <div className="flex-1 h-6 bg-secondary/50 rounded overflow-hidden relative">
                              <div 
                                style={{ width: `${Math.min((space / (scaleAnalysis?.largest || 100)) * 100, 100)}%` }} 
                                className={`h-full ${isOutlier ? 'bg-yellow-500/30 border-r-2 border-yellow-500' : 'bg-primary/20 border-r-2 border-primary'}`} 
                              />
                            </div>

                            {/* Outlier Badge */}
                            {isOutlier && (
                              <span className="text-[10px] font-bold text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded">
                                Outlier
                              </span>
                            )}
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
