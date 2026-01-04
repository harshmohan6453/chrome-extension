import { useState, useMemo } from 'react';
import { useStore, FontData } from '../../store';
import { Download, Type, Filter, Search, TrendingUp, AlertCircle } from 'lucide-react';
import { TypographyCard } from './TypographyCard';

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
    let css = '/* Typography Extracted from Design Inspector */\n\n';

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

    return {
      uniqueSizes,
      detectedScale: isConsistent || isLooselyConsistent ? bestMatch.scale : null,
      isConsistent,
      isLooselyConsistent,
      avgDifference: bestMatch.avgDiff,
      totalSizes: allSizes.length,
      baseSize: uniqueSizes[0],
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
    <div className="space-y-6 pb-20">
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
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSS</span>
            </button>
          )}
        </div>

        {/* Filters & Search */}
        {fonts.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-card p-2 rounded-2xl border border-border shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search fonts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/50 border-none rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 border-l border-border pl-3 overflow-x-auto no-scrollbar max-w-full">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              {sources.map(source => (
                <button
                  key={source}
                  onClick={() => setFilterSource(source)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${
                    filterSource === source
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typography Scale Analysis */}
        {scaleAnalysis && (
          <div className={`rounded-2xl border overflow-hidden ${
            scaleAnalysis.isConsistent
              ? 'border-green-500/20'
              : scaleAnalysis.isLooselyConsistent
              ? 'border-yellow-500/20'
              : 'border-orange-500/20'
          }`}>
            {/* Header */}
            <div className={`p-4 flex items-center justify-between ${
              scaleAnalysis.isConsistent
                ? 'bg-green-500/5'
                : scaleAnalysis.isLooselyConsistent
                ? 'bg-yellow-500/5'
                : 'bg-orange-500/5'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  scaleAnalysis.isConsistent
                    ? 'bg-green-500/10'
                    : scaleAnalysis.isLooselyConsistent
                    ? 'bg-yellow-500/10'
                    : 'bg-orange-500/10'
                }`}>
                  {scaleAnalysis.isConsistent || scaleAnalysis.isLooselyConsistent ? (
                    <TrendingUp className={`w-5 h-5 ${
                      scaleAnalysis.isConsistent ? 'text-green-600' : 'text-yellow-600'
                    }`} />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Typography Scale</h3>
                  <p className="text-xs text-muted-foreground">
                    {scaleAnalysis.uniqueSizes.length} unique sizes detected
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                scaleAnalysis.isConsistent
                  ? 'bg-green-500/10 text-green-600'
                  : scaleAnalysis.isLooselyConsistent
                  ? 'bg-yellow-500/10 text-yellow-600'
                  : 'bg-orange-500/10 text-orange-600'
              }`}>
                {scaleAnalysis.isConsistent ? 'Consistent' : scaleAnalysis.isLooselyConsistent ? 'Loosely Consistent' : 'Inconsistent'}
              </span>
            </div>

            {/* Visual Scale - Simplified */}
            <div className="p-4 bg-card space-y-3">
              {scaleAnalysis.detectedScale && (
                <p className="text-xs text-muted-foreground">
                  Likely scale: <span className="font-bold text-foreground">{scaleAnalysis.detectedScale.name}</span> (ratio {scaleAnalysis.detectedScale.ratio})
                </p>
              )}
              
              {/* Visual scale ladder - show only rounded/key sizes */}
              <div className="flex items-end gap-1 h-16 overflow-x-auto pb-2">
                {scaleAnalysis.uniqueSizes
                  .filter((_, i) => i < 12) // Limit to 12 sizes
                  .map((size, idx) => {
                    const roundedSize = Math.round(size);
                    const height = Math.min(Math.max((size / scaleAnalysis.uniqueSizes[scaleAnalysis.uniqueSizes.length - 1]) * 100, 15), 100);
                    return (
                      <div 
                        key={idx} 
                        className="flex flex-col items-center gap-1 min-w-[32px]"
                        title={`${size}px`}
                      >
                        <div 
                          className={`w-6 rounded-t transition-all ${
                            scaleAnalysis.isConsistent
                              ? 'bg-green-500/30'
                              : scaleAnalysis.isLooselyConsistent
                              ? 'bg-yellow-500/30'
                              : 'bg-orange-500/30'
                          }`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] font-mono text-muted-foreground">{roundedSize}</span>
                      </div>
                    );
                  })}
                {scaleAnalysis.uniqueSizes.length > 12 && (
                  <div className="flex items-center px-2 text-xs text-muted-foreground">
                    +{scaleAnalysis.uniqueSizes.length - 12}
                  </div>
                )}
              </div>

              {/* Key stats */}
              <div className="flex gap-4 text-xs pt-2 border-t border-border/50">
                <div>
                  <span className="text-muted-foreground">Smallest: </span>
                  <span className="font-bold font-mono">{Math.round(scaleAnalysis.baseSize)}px</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Largest: </span>
                  <span className="font-bold font-mono">{Math.round(scaleAnalysis.uniqueSizes[scaleAnalysis.uniqueSizes.length - 1])}px</span>
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
