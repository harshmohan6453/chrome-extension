import { useState, useMemo } from 'react';
import { Copy, Check, Download, Palette, AlertTriangle, CheckCircle2, Pipette, X, Grid, List as ListIcon, SplitSquareHorizontal } from 'lucide-react';
import { useStore } from '../../store';
import { clsx } from 'clsx';

// --- Helper Functions ---

// Calculate relative luminance for WCAG contrast
const getLuminance = (hex: string): number => {
  const rgb = hex.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16) / 255) || [0, 0, 0];
  const [r, g, b] = rgb.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Calculate contrast ratio between two colors
const getContrastRatio = (hex1: string, hex2: string): number => {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

// Get WCAG compliance level
const getWCAGLevel = (ratio: number): { level: string; color: string } => {
  if (ratio >= 7) return { level: 'AAA', color: 'text-green-600' };
  if (ratio >= 4.5) return { level: 'AA', color: 'text-green-600' };
  if (ratio >= 3) return { level: 'AA Large', color: 'text-yellow-600' };
  return { level: 'Fail', color: 'text-red-600' };
};

// Convert Hex to HSL
const hexToHSL = (hex: string): string => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  
  r /= 255; g /= 255; b /= 255;
  const cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
  let h = 0, s = 0, l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return `hsl(${h}, ${Math.round(s)}%, ${Math.round(l)}%)`;
};

// Convert Hex to RGB
const hexToRGB = (hex: string): string => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  return `rgb(${r}, ${g}, ${b})`;
};

// --- Components ---

const ColorSwatchLarge = ({ color, displayValue, count, totalCount, onCopy, copied }: { color: string; displayValue: string; count: number; totalCount: number; onCopy: (c: string) => void; copied: string | null }) => {
  return (
    <button 
      onClick={() => onCopy(displayValue)}
      className="group relative flex flex-col items-start text-left w-full bg-card rounded-xl border-2 border-foreground/10 overflow-hidden hover:border-primary transition-all neo-shadow active:scale-95"
    >
      <div 
        className="w-full h-24 transition-transform group-hover:scale-105"
        style={{ backgroundColor: color }}
      />
      <div className="p-3 w-full">
        <div className="flex justify-between items-center mb-1">
          <span className="font-mono font-bold text-sm truncate w-full">{displayValue}</span>
          {copied === displayValue && <Check className="w-3 h-3 text-green-500 shrink-0 ml-1" />}
        </div>
        <div className="w-full bg-secondary/50 h-1.5 rounded-full overflow-hidden">
          <div className="bg-primary h-full rounded-full" style={{ width: `${(count / totalCount) * 100}%` }} />
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground font-medium">
          {Math.round((count / totalCount) * 100)}% usage
        </div>
      </div>
      {/* Copy Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
        <div className="bg-background/90 backdrop-blur text-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
          Copy
        </div>
      </div>
    </button>
  );
};

const ColorSwatchSmall = ({ color, displayValue, onCopy, copied }: { color: string; displayValue: string; onCopy: (c: string) => void; copied: string | null }) => {
  return (
    <button 
      onClick={() => onCopy(displayValue)}
      className="group relative w-full aspect-square rounded-xl border-2 border-foreground/10 overflow-hidden hover:border-primary transition-all active:scale-95"
      style={{ backgroundColor: color }}
      title={displayValue}
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
        {copied === displayValue ? (
          <Check className="w-6 h-6 text-white drop-shadow-md" />
        ) : (
          <Copy className="w-6 h-6 text-white drop-shadow-md" />
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur px-1 py-1 text-[10px] font-mono text-center font-bold opacity-0 group-hover:opacity-100 transition-opacity truncate">
        {displayValue}
      </div>
    </button>
  );
};

// --- Main Panel ---

interface ColorPanelProps {
  isSidePanel: boolean;
  onOpenThemeStudio: () => void;
}

export const ColorPanel = ({ isSidePanel, onOpenThemeStudio }: ColorPanelProps) => {
  const { data, preferences } = useStore();
  const [activeTab, setActiveTab] = useState<'palette' | 'list' | 'contrast'>('palette');
  const [copied, setCopied] = useState<string | null>(null);
  
  // Contrast State
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  
  // Picker State
  const [pickedColor, setPickedColor] = useState<{ hex: string; rgb: string; hsl: string } | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const getDisplayValue = (hex: string) => {
    switch (preferences?.colorFormat) {
      case 'rgb': return hexToRGB(hex);
      case 'hsl': return hexToHSL(hex);
      default: return hex;
    }
  };

  const handleExport = (format: 'css' | 'tailwind') => {
    let content = '';
    if (format === 'css') {
      content = `:root {\n${data.colors.map((c, i) => `  --color-${i + 1}: ${c.hex}; /* ${c.type} - used ${c.count}x */`).join('\n')}\n}`;
    } else {
      content = `// Tailwind Colors\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${data.colors.map((c, i) => `        'color-${i + 1}': '${c.hex}',`).join('\n')}\n      }\n    }\n  }\n}`;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'css' ? 'palette.css' : 'tailwind-colors.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pickColor = async () => {
    setIsPicking(true);
    setPickerError(null);
    try {
      if (!('EyeDropper' in window)) {
        setPickerError('EyeDropper not supported');
        setIsPicking(false);
        return;
      }
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      const hex = result.sRGBHex;
      
      setPickedColor({
        hex,
        rgb: hexToRGB(hex),
        hsl: hexToHSL(hex)
      }); 
    } catch (err: any) {
      if (err.name !== 'AbortError') setPickerError(err.message);
    } finally {
      setIsPicking(false);
    }
  };

  // Analysis
  const analysis = useMemo(() => {
    if (data.colors.length === 0) return null;
    const sorted = [...data.colors].sort((a, b) => b.count - a.count);
    const dominant = sorted.slice(0, 6);
    const others = sorted.slice(6);
    const totalCount = sorted.reduce((acc, c) => acc + c.count, 0);
    
    // Grouping for List View
    const byType = {
        background: sorted.filter(c => c.type === 'background'),
        text: sorted.filter(c => c.type === 'text'),
        other: sorted.filter(c => c.type !== 'background' && c.type !== 'text')
    };

    return { dominant, others, sorted, totalCount, byType };
  }, [data.colors]);

  const contrastPreview = useMemo(() => {
    if (!selectedBg || !selectedText) return null;
    const ratio = getContrastRatio(selectedBg, selectedText);
    const wcag = getWCAGLevel(ratio);
    return { ratio: ratio.toFixed(2), ...wcag };
  }, [selectedBg, selectedText]);

  if (data.colors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border/50">
        <div className="p-4 bg-secondary rounded-full mb-4">
          <Palette className="h-8 w-8 opacity-50" />
        </div>
        <p className="font-bold text-lg mb-1">No colors detected</p>
        <p className="text-sm opacity-70">Try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight">Colors</h2>
            <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
              {data.colors.length} Detected
            </span>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={pickColor}
                className={clsx(
                  "p-2 rounded-lg transition-all border-2",
                  isPicking ? "bg-primary border-primary text-white" : "bg-card border-foreground/10 hover:border-primary text-foreground"
                )}
                title="Pick Color"
             >
                <Pipette className={clsx("w-4 h-4", isPicking && "animate-pulse")} />
             </button>
             <button onClick={() => handleExport('css')} className="p-2 bg-card border-2 border-foreground/10 rounded-lg hover:border-primary transition-all text-foreground" title="Export CSS">
                <Download className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-foreground/20 bg-card p-4 neo-shadow flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Theme Studio</div>
            <div className="font-bold">{isSidePanel ? 'Open live color controls' : 'Launch in side panel'}</div>
            <div className="text-sm text-muted-foreground">
              Preview semantic theme changes, presets, and exact color replacements directly on the page.
            </div>
          </div>
          <button
            onClick={onOpenThemeStudio}
            className="shrink-0 rounded-xl bg-primary text-primary-foreground font-bold px-4 py-3 hover:bg-primary/90 transition-colors"
          >
            {isSidePanel ? 'Open Studio' : 'Open Side Panel'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1 bg-secondary rounded-xl border border-border">
            <button
                onClick={() => setActiveTab('palette')}
                className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                    activeTab === 'palette' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Grid className="w-4 h-4" /> Palette
            </button>
            <button
                onClick={() => setActiveTab('list')}
                className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                    activeTab === 'list' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <ListIcon className="w-4 h-4" /> List
            </button>
            <button
                onClick={() => setActiveTab('contrast')}
                className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                    activeTab === 'contrast' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <SplitSquareHorizontal className="w-4 h-4" /> Contrast
            </button>
        </div>
      </div>

      {/* Picker Error Message */}
      {pickerError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 rounded-lg p-3 text-sm flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{pickerError}</span>
          <button 
            onClick={() => setPickerError(null)}
            className="ml-auto p-1 hover:bg-red-500/10 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Picker Modal (Contextual) */}
      {pickedColor && (
        <div className="bg-card rounded-xl border-2 border-primary p-4 space-y-3 neo-shadow animate-in slide-in-from-top-2">
            <div className="flex justify-between items-start">
                <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl border-2 border-border shadow-sm" style={{ backgroundColor: pickedColor.hex }} />
                    <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase">Picked</div>
                        <div className="font-mono text-xl font-bold">{getDisplayValue(pickedColor.hex)}</div>
                        <div className="text-xs text-muted-foreground">
                            {preferences?.colorFormat === 'hsl' ? pickedColor.rgb : pickedColor.hsl}
                        </div>
                    </div>
                </div>
                <button onClick={() => setPickedColor(null)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => copyToClipboard(pickedColor.hex)} className="bg-secondary p-2 rounded-lg text-sm font-bold hover:bg-secondary/80">Copy Hex</button>
                <button onClick={() => copyToClipboard(pickedColor.hsl)} className="bg-secondary p-2 rounded-lg text-sm font-bold hover:bg-secondary/80">Copy HSL</button>
            </div>
        </div>
      )}

      {/* --- PALETTE TAB --- */}
      {activeTab === 'palette' && analysis && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Dominant Colors */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    Dominant Colors
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {analysis.dominant.map((color, i) => (
                        <ColorSwatchLarge 
                            key={i} 
                            color={color.hex} 
                            displayValue={getDisplayValue(color.hex)}
                            count={color.count} 
                            totalCount={analysis.totalCount} 
                            onCopy={copyToClipboard} 
                            copied={copied} 
                        />
                    ))}
                </div>
            </div>

            {/* Accent / Other Colors */}
            {analysis.others.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        Accent & Other Colors
                    </h3>
                    <div className="grid grid-cols-5 md:grid-cols-6 gap-2">
                        {analysis.others.map((color, i) => (
                            <ColorSwatchSmall 
                                key={i} 
                                color={color.hex}
                                displayValue={getDisplayValue(color.hex)}
                                onCopy={copyToClipboard} 
                                copied={copied} 
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* --- LIST TAB --- */}
      {activeTab === 'list' && analysis && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {['Background', 'Text', 'Other'].map(type => {
                const groupKey = type.toLowerCase() as keyof typeof analysis.byType;
                const colors = analysis.byType[groupKey];
                if (colors.length === 0) return null;

                return (
                    <div key={type} className="space-y-2">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background py-2 z-10">
                            {type} Colors
                        </h3>
                        <div className="bg-card rounded-xl border-2 border-foreground/10 overflow-hidden divide-y divide-border/50">
                            {colors.map((color, i) => {
                                const displayValue = getDisplayValue(color.hex);
                                return (
                                <div key={i} className="flex items-center gap-4 p-3 hover:bg-secondary/30 transition-colors group">
                                    <div 
                                        className="w-10 h-10 rounded-lg border border-border shadow-sm shrink-0 cursor-pointer" 
                                        style={{ backgroundColor: color.hex }}
                                        onClick={() => copyToClipboard(displayValue)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-sm">{displayValue}</span>
                                            {copied === displayValue && <Check className="w-3 h-3 text-green-500" />}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {color.hex !== displayValue ? color.hex + ' • ' : ''} {color.count} uses
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => copyToClipboard(displayValue)}
                                        className="p-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {/* --- CONTRAST TAB --- */}
      {activeTab === 'contrast' && analysis && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Checker Card */}
            <div className="bg-card rounded-xl border-2 border-foreground/10 overflow-hidden neo-shadow">
                {/* Preview Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 h-48 md:h-64">
                    <div 
                        className="flex flex-col items-center justify-center p-6 text-center transition-colors duration-300"
                        style={{ backgroundColor: selectedBg || '#ffffff', color: selectedText || '#000000' }}
                    >
                        <p className="text-3xl font-black mb-2">Aa</p>
                        <p className="font-bold text-lg">Large Text</p>
                        <p className="text-sm opacity-80">Normal Text</p>
                    </div>
                    <div className="bg-secondary/20 p-6 flex flex-col justify-center gap-4 border-t md:border-t-0 md:border-l border-border/50">
                        {contrastPreview ? (
                            <>
                                <div>
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Contrast Ratio</div>
                                    <div className="text-4xl font-black">{contrastPreview.ratio}</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-2 bg-background rounded-lg border border-border">
                                        <span className="text-sm font-bold">WCAG AA</span>
                                        {parseFloat(contrastPreview.ratio) >= 4.5 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-500" />}
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-background rounded-lg border border-border">
                                        <span className="text-sm font-bold">WCAG AAA</span>
                                        {parseFloat(contrastPreview.ratio) >= 7 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-500" />}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <SplitSquareHorizontal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm font-bold">Select colors below to check contrast</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Background</div>
                    <div className="flex flex-wrap gap-2">
                        {analysis.sorted.slice(0, 12).map((c, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedBg(c.hex)}
                                className={clsx(
                                    "w-8 h-8 rounded-lg border-2 transition-all",
                                    selectedBg === c.hex ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105"
                                )}
                                style={{ backgroundColor: c.hex }}
                                title={getDisplayValue(c.hex)}
                            />
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Text</div>
                    <div className="flex flex-wrap gap-2">
                        {analysis.sorted.slice(0, 12).map((c, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedText(c.hex)}
                                className={clsx(
                                    "w-8 h-8 rounded-lg border-2 transition-all",
                                    selectedText === c.hex ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105"
                                )}
                                style={{ backgroundColor: c.hex }}
                                title={getDisplayValue(c.hex)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
