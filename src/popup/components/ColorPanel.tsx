import { useState, useMemo } from 'react';
import { Copy, Check, Download, ChevronDown, ChevronUp, Palette, AlertTriangle, CheckCircle2, Pipette, X } from 'lucide-react';
import { useStore } from '../../store';
import { clsx } from 'clsx';

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

export const ColorPanel = () => {
  const { data, preferences } = useStore();
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedColor, setExpandedColor] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [pickedColor, setPickedColor] = useState<{ hex: string; rgb: string; hsl: string } | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // Color picker function using EyeDropper API directly from popup
  const pickColor = async () => {
    setIsPicking(true);
    setPickerError(null);
    
    try {
      // Check if EyeDropper API is available
      if (!('EyeDropper' in window)) {
        setPickerError('EyeDropper not supported in this browser');
        setIsPicking(false);
        return;
      }

      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      
      // Convert sRGBHex to different formats
      const hex = result.sRGBHex;
      
      // Extract RGB values
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const rgb = `rgb(${r}, ${g}, ${b})`;
      
      // Convert to HSL
      const rNorm = r / 255;
      const gNorm = g / 255;
      const bNorm = b / 255;
      const cmax = Math.max(rNorm, gNorm, bNorm);
      const cmin = Math.min(rNorm, gNorm, bNorm);
      const delta = cmax - cmin;
      
      let h = 0;
      if (delta !== 0) {
        if (cmax === rNorm) h = ((gNorm - bNorm) / delta) % 6;
        else if (cmax === gNorm) h = (bNorm - rNorm) / delta + 2;
        else h = (rNorm - gNorm) / delta + 4;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
      
      const l = (cmax + cmin) / 2;
      const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
      const hsl = `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
      
      setPickedColor({ hex, rgb, hsl });
    } catch (err: any) {
      // User cancelled the picker
      if (err.name !== 'AbortError') {
        console.error('Color picker error:', err);
        setPickerError(err.message);
      }
    } finally {
      setIsPicking(false);
    }
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const getDisplayColor = (color: typeof data.colors[0]) => {
    if (preferences?.colorFormat === 'rgb') return color.rgb;
    if (preferences?.colorFormat === 'hsl') return color.hsl || hexToHSL(color.hex);
    return color.hex;
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

  // Analyze colors
  const analysis = useMemo(() => {
    if (data.colors.length === 0) return null;

    const sorted = [...data.colors].sort((a, b) => b.count - a.count);
    const dominant = sorted[0];
    const backgrounds = data.colors.filter(c => c.type === 'background');
    const texts = data.colors.filter(c => c.type === 'text');

    return { dominant, backgrounds, texts, sorted };
  }, [data.colors]);

  // Contrast preview
  const contrastPreview = useMemo(() => {
    if (!selectedBg || !selectedText) return null;
    const ratio = getContrastRatio(selectedBg, selectedText);
    const wcag = getWCAGLevel(ratio);
    return { ratio: ratio.toFixed(2), ...wcag };
  }, [selectedBg, selectedText]);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight">Colors</h2>
          <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
            {data.colors.length} Colors
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={pickColor}
            disabled={isPicking}
            className={clsx(
              "p-2 rounded-lg transition-all flex items-center justify-center",
              isPicking 
                ? "bg-primary text-white" 
                : "text-primary hover:bg-primary/10"
            )}
            title={isPicking ? "Picking color..." : "Pick color from screen"}
          >
            <Pipette className={clsx("w-4 h-4", isPicking && "animate-pulse")} />
          </button>
          <button 
            onClick={() => handleExport('css')} 
            className="text-sm font-bold text-muted-foreground hover:bg-secondary px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> CSS
          </button>
          <button 
            onClick={() => handleExport('tailwind')} 
            className="text-sm font-bold text-muted-foreground hover:bg-secondary px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Tailwind
          </button>
        </div>
      </div>


      {/* Picker Error Message */}
      {pickerError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 rounded-lg p-3 text-sm flex items-center gap-2">
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

      {/* Picker Active Tip */}
      {isPicking && (
        <div className="bg-primary/10 border border-primary/30 text-primary rounded-lg p-3 text-sm flex items-center gap-2 animate-pulse">
          <Pipette className="w-4 h-4 shrink-0" />
          <span>Click anywhere on your screen to pick a color...</span>
        </div>
      )}

      {/* Picked Color Modal */}
      {pickedColor && (
        <div className="bg-card rounded-lg border-2 border-primary p-4 space-y-3 neo-shadow animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl border-2 border-border shadow-lg" 
                style={{ backgroundColor: pickedColor.hex }}
              />
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Picked Color</div>
                <div className="font-mono font-bold text-lg">{pickedColor.hex}</div>
              </div>
            </div>
            <button 
              onClick={() => setPickedColor(null)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => copyToClipboard(pickedColor.hex)}
              className="relative p-3 bg-secondary/50 rounded-lg text-center hover:bg-secondary transition-colors group"
            >
              <div className="absolute top-2 right-2">
                {copied === pickedColor.hex ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
              <div className="text-xs text-muted-foreground mb-1">HEX</div>
              <div className="font-mono font-bold text-sm">{pickedColor.hex}</div>
            </button>
            <button 
              onClick={() => copyToClipboard(pickedColor.rgb)}
              className="relative p-3 bg-secondary/50 rounded-lg text-center hover:bg-secondary transition-colors group"
            >
              <div className="absolute top-2 right-2">
                {copied === pickedColor.rgb ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
              <div className="text-xs text-muted-foreground mb-1">RGB</div>
              <div className="font-mono font-bold text-sm truncate">{pickedColor.rgb}</div>
            </button>
            <button 
              onClick={() => copyToClipboard(pickedColor.hsl)}
              className="relative p-3 bg-secondary/50 rounded-lg text-center hover:bg-secondary transition-colors group"
            >
              <div className="absolute top-2 right-2">
                {copied === pickedColor.hsl ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
              <div className="text-xs text-muted-foreground mb-1">HSL</div>
              <div className="font-mono font-bold text-sm truncate">{pickedColor.hsl}</div>
            </button>
          </div>
        </div>
      )}

      {data.colors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card/50 rounded-3xl border border-dashed border-border/50">
          <div className="p-4 bg-secondary rounded-full mb-4">
            <Palette className="h-8 w-8 opacity-50" />
          </div>
          <p className="font-bold text-lg mb-1">No colors detected</p>
          <p className="text-sm opacity-70">Try refreshing the page</p>
        </div>
      ) : (
        <>
          {/* Color Strip - All Colors at a Glance */}
          <div className="bg-card rounded-lg border-2 border-foreground/20 p-4 space-y-3 neo-shadow">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Palette Overview
            </div>
            <div className="flex h-10 rounded-xl overflow-hidden shadow-inner">
              {data.colors.slice(0, 20).map((color, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-[20px] cursor-pointer hover:scale-y-110 transition-transform"
                  style={{ backgroundColor: color.hex }}
                  title={`${color.hex} (${color.count}x)`}
                  onClick={() => copyToClipboard(color.hex)}
                />
              ))}
            </div>
            {data.colors.length > 20 && (
              <p className="text-xs text-muted-foreground text-center">
                +{data.colors.length - 20} more colors
              </p>
            )}
          </div>

          {/* Contrast Checker */}
          <div className="bg-card rounded-lg border-2 border-foreground/20 overflow-hidden neo-shadow">
            <div className="p-4 border-b border-border/50 bg-secondary/30">
              <h3 className="font-bold text-sm">Contrast Checker</h3>
              <p className="text-xs text-muted-foreground">Select a background and text color to check accessibility</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Background Selector */}
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Background</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis?.backgrounds.slice(0, 8).map((c, i) => (
                      <button
                        key={i}
                        className={clsx(
                          "w-8 h-8 rounded-lg border-2 transition-all relative group",
                          selectedBg === c.hex ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => { setSelectedBg(c.hex); copyToClipboard(c.hex); }}
                        title={`${c.hex} - Click to select & copy`}
                      >
                        {copied === c.hex && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Text Selector */}
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Text</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis?.texts.slice(0, 8).map((c, i) => (
                      <button
                        key={i}
                        className={clsx(
                          "w-8 h-8 rounded-lg border-2 transition-all relative group",
                          selectedText === c.hex ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => { setSelectedText(c.hex); copyToClipboard(c.hex); }}
                        title={`${c.hex} - Click to select & copy`}
                      >
                        {copied === c.hex && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              {selectedBg && selectedText && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <div 
                    className="p-6 text-center"
                    style={{ backgroundColor: selectedBg, color: selectedText }}
                  >
                    <p className="text-2xl font-bold">Sample Text</p>
                    <p className="text-sm mt-1">The quick brown fox jumps over the lazy dog</p>
                  </div>
                  <div className="p-3 bg-secondary/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {contrastPreview?.level === 'Fail' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-sm font-bold">Contrast: {contrastPreview?.ratio}:1</span>
                    </div>
                    <span className={clsx("text-sm font-bold", contrastPreview?.color)}>
                      WCAG {contrastPreview?.level}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Color List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              All Colors (sorted by usage)
            </h3>
            {analysis?.sorted.map((color) => (
              <div 
                key={color.hex} 
                className="bg-card rounded-lg border-2 border-foreground/20 overflow-hidden transition-all hover:border-primary neo-shadow"
              >
                {/* Collapsed Header */}
                <button
                  onClick={() => setExpandedColor(expandedColor === color.hex ? null : color.hex)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  <div 
                    className="w-12 h-12 rounded-xl border border-border/50 shadow-sm shrink-0" 
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold font-mono text-lg">{getDisplayColor(color)}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="bg-secondary px-2 py-0.5 rounded capitalize">{color.type}</span>
                      {color.role && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">{color.role}</span>}
                      <span>{color.count}×</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(getDisplayColor(color)); }}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                    >
                      {copied === getDisplayColor(color) ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {expandedColor === color.hex ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedColor === color.hex && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-3 gap-2 pt-3">
                      <button 
                        onClick={() => copyToClipboard(color.hex)}
                        className="relative p-3 bg-secondary/50 rounded-lg text-center hover:bg-secondary transition-colors group"
                      >
                        <div className="absolute top-2 right-2">
                          {copied === color.hex ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">HEX</div>
                        <div className="font-mono font-bold text-sm">{color.hex}</div>
                      </button>
                      <button 
                        onClick={() => copyToClipboard(color.rgb)}
                        className="relative p-3 bg-secondary/50 rounded-lg text-center hover:bg-secondary transition-colors group"
                      >
                        <div className="absolute top-2 right-2">
                          {copied === color.rgb ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">RGB</div>
                        <div className="font-mono font-bold text-sm truncate">{color.rgb}</div>
                      </button>
                      <button 
                        onClick={() => {
                          const hslValue = color.hsl || hexToHSL(color.hex);
                          copyToClipboard(hslValue);
                        }}
                        className="relative p-3 bg-secondary/50 rounded-lg text-center hover:bg-secondary transition-colors group"
                      >
                        <div className="absolute top-2 right-2">
                          {copied === (color.hsl || hexToHSL(color.hex)) ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">HSL</div>
                        <div className="font-mono font-bold text-sm truncate">{color.hsl || hexToHSL(color.hex)}</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
