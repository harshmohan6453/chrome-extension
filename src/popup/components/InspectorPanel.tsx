import { useState } from 'react';
import { Copy, Sparkles, X } from 'lucide-react';
import { clsx } from 'clsx';

interface InspectorData {
  tagName: string;
  selector: string;
  label: string;
  dimensions: { width: number; height: number };
  margin: { top: number; right: number; bottom: number; left: number };
  padding: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
  typography: {
    fontFamily: string;
    fontSize: number;
    lineHeight: string;
    fontWeight: string;
    letterSpacing: string;
    textAlign: string;
    color: string;
  };
  colors: {
    background: string;
    backgroundRaw: string;
    isGradient: boolean;
    gradientValue: string | null;
  };
  element: {
    display: string;
    position: string;
    zIndex: string;
    borderRadius: string;
    border: string | null;
    boxShadow: string | null;
  };
  cssString: string;
  prompt: string;
}

interface InspectorPanelProps {
  data: InspectorData | null;
  onClear: () => void;
}

export function InspectorPanel({ data, onClear }: InspectorPanelProps) {
  const [copied, setCopied] = useState<'css' | 'prompt' | null>(null);

  const copyToClipboard = async (text: string, type: 'css' | 'prompt') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-dashed rounded-full animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Waiting for Selection</h3>
          <p className="text-muted-foreground text-sm mt-1">Click any element on the page to inspect it</p>
        </div>
      </div>
    );
  }

  const { dimensions: dim, margin: m, padding: p, border: b } = data;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-muted-foreground uppercase">{data.label}</span>
          <h3 className="text-lg font-black text-foreground lowercase truncate" title={data.selector}>
            {data.selector.length > 30 ? data.selector.slice(0, 30) + '...' : data.selector}
          </h3>
        </div>
        <button 
          onClick={onClear}
          className="p-2 rounded-lg bg-card border-2 border-foreground/20 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => copyToClipboard(data.cssString, 'css')}
          className={clsx(
            "flex-1 py-3 px-4 rounded-lg border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all",
            copied === 'css' 
              ? "bg-green-500 border-green-600 text-white"
              : "bg-blue-500 border-foreground/20 text-white hover:bg-blue-600"
          )}
        >
          <Copy className="w-4 h-4" />
          {copied === 'css' ? 'Copied!' : 'Copy CSS'}
        </button>
        <button
          onClick={() => copyToClipboard(data.prompt, 'prompt')}
          className={clsx(
            "flex-1 py-3 px-4 rounded-lg border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all",
            copied === 'prompt'
              ? "bg-green-500 border-green-600 text-white"
              : "bg-purple-500 border-foreground/20 text-white hover:bg-purple-600"
          )}
        >
          <Sparkles className="w-4 h-4" />
          {copied === 'prompt' ? 'Copied!' : 'Copy Prompt'}
        </button>
      </div>

      {/* Box Model */}
      <div className="bg-card rounded-lg border-2 border-foreground/20 p-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Box Model</h4>
        <div className="font-mono text-xs flex flex-col items-center">
          {/* Margin */}
          <div className="bg-pink-100 dark:bg-pink-900/30 border border-dashed border-pink-400 rounded p-1 w-full relative">
            <span className="absolute top-0.5 left-1 text-[8px] text-pink-600 font-bold">margin</span>
            <div className="text-center text-pink-700">{m.top}</div>
            <div className="flex justify-between items-center px-1">
              <span className="text-pink-700">{m.left}</span>
              {/* Border */}
              <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-400 rounded p-1 flex-1 mx-2 relative">
                <span className="absolute top-0 left-1 text-[8px] text-amber-600 font-bold">border</span>
                <div className="text-center text-amber-700">{b.top}</div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-700">{b.left}</span>
                  {/* Padding */}
                  <div className="bg-green-100 dark:bg-green-900/30 border border-dashed border-green-400 rounded p-1 flex-1 mx-1 relative">
                    <span className="absolute top-0 left-1 text-[8px] text-green-600 font-bold">padding</span>
                    <div className="text-center text-green-700">{p.top}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">{p.left}</span>
                      {/* Content */}
                      <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-400 rounded px-3 py-2 mx-1">
                        <span className="text-blue-700 font-bold">{dim.width} × {dim.height}</span>
                      </div>
                      <span className="text-green-700">{p.right}</span>
                    </div>
                    <div className="text-center text-green-700">{p.bottom}</div>
                  </div>
                  <span className="text-amber-700">{b.right}</span>
                </div>
                <div className="text-center text-amber-700">{b.bottom}</div>
              </div>
              <span className="text-pink-700">{m.right}</span>
            </div>
            <div className="text-center text-pink-700">{m.bottom}</div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="bg-card rounded-lg border-2 border-foreground/20 p-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Typography</h4>
        <div className="space-y-2 text-sm">
          {[
            ['Font', data.typography.fontFamily],
            ['Size', `${data.typography.fontSize}px`],
            ['Weight', data.typography.fontWeight],
            ['Line Height', data.typography.lineHeight],
            ['Color', data.typography.color],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground truncate max-w-[150px]" title={value as string}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="bg-card rounded-lg border-2 border-foreground/20 p-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Colors</h4>
        <div 
          className="h-12 rounded-lg border-2 border-foreground/20 flex items-end p-2"
          style={{ 
            background: data.colors.isGradient 
              ? data.colors.gradientValue || '#fff' 
              : (data.colors.backgroundRaw === 'transparent' 
                  ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 10px 10px' 
                  : data.colors.backgroundRaw)
          }}
        >
          <span className="bg-white/90 dark:bg-black/70 text-xs px-2 py-1 rounded font-mono">
            {data.colors.background}
          </span>
        </div>
      </div>

      {/* Element Properties */}
      <div className="bg-card rounded-lg border-2 border-foreground/20 p-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Element</h4>
        <div className="space-y-2 text-sm">
          {[
            ['Display', data.element.display],
            ['Position', data.element.position],
            ['Z-Index', data.element.zIndex],
            ['Border Radius', data.element.borderRadius],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-mono text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Effects */}
      {(data.element.border || data.element.boxShadow) && (
        <div className="bg-card rounded-lg border-2 border-foreground/20 p-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Effects</h4>
          <div className="space-y-2 text-sm">
            {data.element.border && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Border</span>
                <span className="font-mono text-foreground truncate max-w-[150px]" title={data.element.border}>{data.element.border}</span>
              </div>
            )}
            {data.element.boxShadow && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shadow</span>
                <span className="font-mono text-foreground truncate max-w-[150px]" title={data.element.boxShadow}>{data.element.boxShadow}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type { InspectorData };
