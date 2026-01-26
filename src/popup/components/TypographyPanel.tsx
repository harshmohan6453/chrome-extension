import { useState, useMemo } from 'react';
import { useStore, FontData } from '../../store';
import { Download, Type, Search, Ruler } from 'lucide-react';
import { TypographyCard } from './TypographyCard';
import { clsx } from 'clsx';

export const TypographyPanel = () => {
  const { data } = useStore();
  const fonts = data.fonts || [];
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate Google Fonts import URL
  const getGoogleFontsImport = (font: FontData) => {
    if (font.source !== 'google') return null;
    const family = font.family.replace(/\s/g, '+');
    const weights = font.variants.map(v => v.weight).join(',');
    return `@import url('https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap');`;
  };

  // Generate font-family CSS declaration
  const getFontFamilyCSS = (font: FontData) => {
    return `font-family: '${font.family}', ${font.source === 'system' ? 'system-ui, ' : ''}-apple-system, BlinkMacSystemFont, sans-serif;`;
  };

  // Export all fonts as CSS
  const exportFontsCSS = () => {
    let css = '/* Typography Extracted by WebSnatch */\n\n';

    // Add Google Fonts imports
    const googleFonts = fonts.filter(f => f.source === 'google');
    if (googleFonts.length > 0) {
      css += '/* Google Fonts Imports */\n';
      googleFonts.forEach(font => {
        const importUrl = getGoogleFontsImport(font);
        if (importUrl) css += `${importUrl}\n`;
      });
      css += '\n';
    }

    // Add font-family declarations
    css += '/* Font Family Declarations */\n';
    fonts.forEach((font) => {
      css += `/* ${font.family} */\n`;
      css += `${getFontFamilyCSS(font)}\n\n`;

      // Add size examples
      font.variants.forEach(variant => {
        variant.sizes.forEach(size => {
          css += `/* Example: ${font.family} ${variant.weight} ${variant.style} */\n`;
          css += `font-family: '${font.family}', sans-serif;\n`;
          css += `font-weight: ${variant.weight};\n`;
          css += `font-style: ${variant.style};\n`;
          css += `font-size: ${size.value};\n`;
          css += `line-height: ${size.lineHeight};\n\n`;
        });
      });
    });

    // Download as file
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'typography.css';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Typography Scale Analysis
  const scaleAnalysis = useMemo(() => {
    if (fonts.length === 0) return null;

    // Extract all unique font sizes (convert to numbers)
    const allSizes = fonts
      .flatMap(f => f.variants.flatMap(v => v.sizes.map(s => s.value)))
      .map(size => parseFloat(size))
      .filter(size => !isNaN(size))
      .sort((a, b) => a - b);

    const uniqueSizes = Array.from(new Set(allSizes));

    if (uniqueSizes.length < 3) return null;

    // Common typographic scales
    const scales = [
      { name: 'Minor Second', ratio: 1.067 },
      { name: 'Major Second', ratio: 1.125 },
      { name: 'Minor Third', ratio: 1.2 },
      { name: 'Major Third', ratio: 1.25 },
      { name: 'Perfect Fourth', ratio: 1.333 },
      { name: 'Augmented Fourth', ratio: 1.414 },
      { name: 'Perfect Fifth', ratio: 1.5 },
      { name: 'Golden Ratio', ratio: 1.618 },
    ];

    // Calculate ratios between consecutive sizes
    const ratios: number[] = [];
    for (let i = 1; i < uniqueSizes.length; i++) {
      ratios.push(uniqueSizes[i] / uniqueSizes[i - 1]);
    }

    // Find best matching scale
    let bestMatch = { scale: scales[0], avgDiff: Infinity };

    scales.forEach(scale => {
      const differences = ratios.map(ratio => Math.abs(ratio - scale.ratio));
      const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;

      if (avgDiff < bestMatch.avgDiff) {
        bestMatch = { scale, avgDiff };
      }
    });

    // Determine if scale is consistent (average difference < 0.1 is good)
    const isConsistent = bestMatch.avgDiff < 0.1;
    const isLooselyConsistent = bestMatch.avgDiff < 0.2;

    const averageRatio = ratios.length > 0 
        ? ratios.reduce((a, b) => a + b, 0) / ratios.length 
        : 0;

    return {
      uniqueSizes,
      detectedScale: isConsistent || isLooselyConsistent ? bestMatch.scale : null,
      isConsistent,
      isLooselyConsistent,
      avgDifference: bestMatch.avgDiff,
      totalSizes: allSizes.length,
      baseSize: uniqueSizes[0],
      averageRatio,
    };
  }, [fonts]);

  // Filter fonts
  const filteredFonts = fonts.filter(font => {
    const matchesSource = filterSource === 'all' || font.source === filterSource;
    const matchesSearch = font.family.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesSearch;
  });

  const sources = ['all', ...Array.from(new Set(fonts.map(f => f.source)))];

  return (
    <div className="space-y-6 pb-6">
      {/* Header Area */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight">Typography</h2>
            <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
              {fonts.length} {fonts.length === 1 ? 'Family' : 'Families'}
            </span>
          </div>

          {fonts.length > 0 && (
            <button
              onClick={exportFontsCSS}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold neo-shadow neo-button transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSS</span>
            </button>
          )}
        </div>

        {/* Improved Search & Filter */}
        {fonts.length > 0 && (
          <div className="bg-card p-4 rounded-xl border-2 border-foreground/10 neo-shadow space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                type="text"
                placeholder="Search font families..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary border-transparent focus:border-primary/50 focus:ring-0 rounded-xl pl-10 pr-4 py-3 text-sm font-medium placeholder:text-muted-foreground/70 transition-all"
                />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Source:</span>
                {sources.map(source => (
                <button
                    key={source}
                    onClick={() => setFilterSource(source)}
                    className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border-2",
                    filterSource === source
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground"
                    )}
                >
                    {source}
                </button>
                ))}
            </div>
          </div>
        )}

        {/* Improved Typography Scale Analysis */}
        {scaleAnalysis && (
          <div className="bg-card rounded-xl border-2 border-foreground/10 neo-shadow overflow-hidden">
            {/* Header & Status */}
            <div className="p-4 border-b border-border/50 bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Ruler className={clsx("w-5 h-5", scaleAnalysis.isConsistent ? "text-green-500" : "text-amber-500")} />
                <h3 className="font-bold text-sm">Typography Scale</h3>
            </div>
            <span className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                scaleAnalysis.isConsistent ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"
            )}>
                {scaleAnalysis.isConsistent ? 'Consistent' : scaleAnalysis.isLooselyConsistent ? 'Loosely Consistent' : 'Mixed Scale'}
            </span>
            </div>

            <div className="p-5 space-y-5">
            {/* Main Scale Info */}
            <div className="flex items-baseline justify-between">
                <div>
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Detected Scale</div>
                    <div className="text-2xl font-black tracking-tight text-foreground">
                    {scaleAnalysis.detectedScale?.name || "Custom / Mixed"}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Ratio</div>
                    <div className="text-2xl font-black tracking-tight text-primary">
                    {scaleAnalysis.detectedScale?.ratio || scaleAnalysis.averageRatio.toFixed(3)}
                    </div>
                </div>
            </div>

            {/* Visualization */}
            <div className="h-40 flex items-end gap-1 pt-4 border-b border-border/50 pb-12 px-2 overflow-x-auto no-scrollbar">
                {scaleAnalysis.uniqueSizes.map((size, idx) => {
                    const maxSize = scaleAnalysis.uniqueSizes[scaleAnalysis.uniqueSizes.length - 1];
                    const heightPercent = Math.max((size / maxSize) * 100, 10);
                    
                    return (
                        <div key={idx} className="flex-1 flex flex-col justify-end group items-center gap-2 relative min-w-[24px] h-full">
                            {/* Bar */}
                            <div 
                                className={clsx("w-full rounded-t-sm transition-all duration-500 hover:opacity-100", 
                                    scaleAnalysis.isConsistent ? "bg-primary/60 group-hover:bg-primary" : "bg-foreground/20 group-hover:bg-foreground/40"
                                )}
                                style={{ height: `${heightPercent}%` }}
                            />
                            {/* Label */}
                            <div className="text-[10px] font-mono text-muted-foreground -rotate-45 origin-left translate-x-1 absolute -bottom-8 opacity-60 group-hover:opacity-100 whitespace-nowrap">
                                {Math.round(size)}px
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Stats */}
            <div className="grid grid-cols-3 gap-3 text-center pt-2">
                <div className="bg-secondary/50 p-2 rounded-lg border border-border/50">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Base Size</div>
                    <div className="font-mono font-bold text-sm">{Math.round(scaleAnalysis.baseSize)}px</div>
                </div>
                <div className="bg-secondary/50 p-2 rounded-lg border border-border/50">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Steps</div>
                    <div className="font-mono font-bold text-sm">{scaleAnalysis.uniqueSizes.length}</div>
                </div>
                <div className="bg-secondary/50 p-2 rounded-lg border border-border/50">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Max Size</div>
                    <div className="font-mono font-bold text-sm">{Math.round(scaleAnalysis.uniqueSizes[scaleAnalysis.uniqueSizes.length - 1])}px</div>
                </div>
            </div>
            </div>
          </div>
        )}
      </div>

      {fonts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border/50 animate-in fade-in zoom-in-95 duration-500">
          <div className="p-4 bg-secondary rounded-full mb-4">
            <Type className="h-8 w-8 opacity-50" />
          </div>
          <p className="font-bold text-lg mb-1">No fonts detected</p>
          <p className="text-sm opacity-70">Try refreshing the page or scrolling down</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredFonts.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">
               <p>No fonts match your filters</p>
               <button 
                 onClick={() => {setFilterSource('all'); setSearchQuery('');}}
                 className="text-primary hover:underline text-sm font-bold mt-2"
               >
                 Clear filters
               </button>
             </div>
          ) : (
            filteredFonts.map((font, i) => (
              <TypographyCard key={`${font.family}-${i}`} font={font} index={i} />
            ))
          )}
        </div>
      )}
    </div>
  );
};
