import { useState } from 'react';
import { Copy, Check, Download, Layers, Grid } from 'lucide-react';
import { useStore } from '../../store';
import { clsx } from 'clsx';

export const ColorPanel = () => {
  const { data, preferences } = useStore();
  const [copied, setCopied] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'palette' | 'categories'>('palette');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const getDisplayColor = (color: typeof data.colors[0]) => {
      if (preferences?.colorFormat === 'rgb') return color.rgb;
      if (preferences?.colorFormat === 'hsl') {
          // Construct HSL string if available, else derive? 
          // Since we might not have HSL string in DB, let's construct it from the HSL object if we added it, or stick to hex/rgb fallback
          // For now, if HSL object exists:
          if (color.hsl && typeof color.hsl === 'object') {
             const { h, s, l } = color.hsl as any;
             return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
          }
           return color.rgb; // Fallback
      }
      return color.hex;
  };

  const handleExport = () => {
     // Create a CSS text
     const css = `:root {\n${data.colors.map((c, i) => `  --color-${i + 1}: ${getDisplayColor(c)}; /* ${c.type} */`).join('\n')}\n}`;
     const blob = new Blob([css], { type: 'text/css' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = 'palette.css';
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
  };

  // Grouping Logic
  const groupedColors = {
    background: data.colors.filter(c => c.type === 'background'),
    text: data.colors.filter(c => c.type === 'text'),
    border: data.colors.filter(c => c.type === 'border'),
    other: data.colors.filter(c => c.type === 'auto' || !c.type) // fallback
  };

  const renderColorCard = (color: any, minimal = false) => {
    const displayValue = getDisplayColor(color);
    
    return (
    <div key={color.hex} className={clsx("group relative bg-card rounded-xl border border-border overflow-hidden transition-all hover:shadow-md", minimal ? "p-3 flex items-center gap-3" : "p-0")}>
        {!minimal && (
             <div className="h-24 w-full relative" style={{ backgroundColor: color.hex }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
        )}
        
        {minimal && (
            <div className="w-12 h-12 rounded-lg border border-border/50 shadow-sm" style={{ backgroundColor: color.hex }}></div>
        )}

        <div className={clsx("flex justify-between items-center", minimal ? "flex-1" : "p-4")}>
             <div>
                <p className="font-bold font-mono text-lg tracking-tight">{displayValue}</p>
                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                    <span className="bg-secondary px-2 py-0.5 rounded capitalize">{color.type || 'Auto'}</span>
                    <span>{color.count} instances</span>
                </div>
            </div>
            
            <button 
                onClick={() => copyToClipboard(displayValue)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title={`Copy ${preferences?.colorFormat?.toUpperCase() || 'HEX'}`}
            >
                {copied === displayValue ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
        </div>
    </div>
  )};

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight">Color Palette</h2>
            <button onClick={handleExport} className="text-sm font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" /> Export
            </button>
        </div>

        {/* View Switcher */}
        <div className="bg-secondary/50 p-1 rounded-xl flex gap-1">
            <button 
                onClick={() => setViewMode('palette')}
                className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                    viewMode === 'palette' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Grid className="w-4 h-4" /> Palette
            </button>
            <button 
                onClick={() => setViewMode('categories')}
                className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all",
                    viewMode === 'categories' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Layers className="w-4 h-4" /> Categories
            </button>
        </div>
      </div>

      {viewMode === 'palette' && (
           <div className="space-y-3">
               {data.colors.map(c => renderColorCard(c, true))}
           </div>
      )}

      {viewMode === 'categories' && (
          <div className="space-y-8">
              {/* Theme Colors Section */}
              {(() => {
                  const themeColors = data.colors.filter(c => c.role);
                  if (themeColors.length === 0) return null;
                  return (
                      <div>
                          <div className="flex items-center gap-2 mb-3">
                              <h3 className="font-black text-lg uppercase tracking-wide text-primary">Theme</h3>
                              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded">{themeColors.length}</span>
                          </div>
                          <div className="grid gap-3">
                              {themeColors.map(c => (
                                <div key={c.hex} className="flex items-center gap-4 bg-card p-3 rounded-xl border border-primary/20 shadow-sm">
                                    <div className="w-14 h-14 rounded-lg shadow-sm border border-border/50 shrink-0" style={{ backgroundColor: c.hex }}></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px] tracking-wider">{c.role}</span>
                                            <span className="text-xs text-muted-foreground capitalize">{c.type}</span>
                                        </div>
                                        <p className="font-mono font-bold text-lg truncate">{c.hex}</p>
                                    </div>
                                    <button onClick={() => copyToClipboard(c.hex)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground">
                                        {copied === c.hex ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                              ))}
                          </div>
                      </div>
                  );
              })()}

              {Object.entries(groupedColors).map(([category, colors]) => {
                  if (colors.length === 0) return null;
                  return (
                      <div key={category}>
                          <div className="flex items-center gap-2 mb-3">
                              <h3 className="font-bold text-lg capitalize">{category} Colors</h3>
                              <span className="bg-secondary text-xs font-bold px-2 py-0.5 rounded text-muted-foreground">{colors.length}</span>
                          </div>
                          <div className="grid gap-3">
                              {colors.map(c => renderColorCard(c, true))}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

       {data.colors.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
                <p>No colors extracted.</p>
            </div>
       )}
    </div>
  );
};
