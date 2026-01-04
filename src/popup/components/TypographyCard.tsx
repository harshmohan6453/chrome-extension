import { useState } from 'react';
import { FontData } from '../../store';
import { Copy, Check, ExternalLink, ChevronDown, ChevronUp, Grid } from 'lucide-react';

interface TypographyCardProps {
  font: FontData;
  index: number;
}

export const TypographyCard = ({ font, index }: TypographyCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const getSourceBadge = (source: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      google: { label: 'Google Fonts', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      adobe: { label: 'Adobe Fonts', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      system: { label: 'System', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      custom: { label: 'Custom', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      unknown: { label: 'Unknown', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
    };
    return badges[source] || badges.unknown;
  };

  const getGoogleFontsImport = (font: FontData) => {
    if (font.source !== 'google') return null;
    const family = font.family.replace(/\s/g, '+');
    const weights = font.variants.map(v => v.weight).join(',');
    return `@import url('https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap');`;
  };

  const getFontFamilyCSS = (font: FontData) => {
    return `font-family: '${font.family}', ${font.source === 'system' ? 'system-ui, ' : ''}-apple-system, BlinkMacSystemFont, sans-serif;`;
  };

  const badge = getSourceBadge(font.source);
  const googleImport = getGoogleFontsImport(font);
  const fontFamilyCSS = getFontFamilyCSS(font);

  return (
    <div className="rounded-lg border-2 border-foreground/20 bg-card overflow-hidden transition-all duration-200 hover:border-primary neo-shadow">
      {/* Collapsible Header - Click to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between gap-4 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          {/* Font name with preview */}
          <h3 
            className="text-xl font-bold text-foreground truncate leading-tight mb-2"
            style={{ fontFamily: font.family }}
          >
            {font.family}
          </h3>
          
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${badge.className}`}>
              {badge.label}
            </span>
            <span className="text-xs font-bold bg-secondary text-secondary-foreground px-2 py-0.5 rounded border border-border">
              {font.variants.length} {font.variants.length === 1 ? 'Style' : 'Styles'}
            </span>
            <span className="text-xs text-muted-foreground">
              Used {font.elementCount}×
            </span>
          </div>
        </div>

        <div className="p-2 rounded-xl text-muted-foreground shrink-0">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t-2 border-foreground/10 p-5 bg-background space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Font Preview */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Preview
            </div>
            <div className="space-y-2">
              {font.variants.slice(0, 3).map((variant, vIdx) => (
                <p 
                  key={vIdx}
                  className="text-xl text-foreground break-words leading-relaxed"
                  style={{ 
                    fontFamily: font.family, 
                    fontWeight: variant.weight,
                    fontStyle: variant.style 
                  }}
                >
                  The quick brown fox jumps over the lazy dog
                </p>
              ))}
              {font.variants.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{font.variants.length - 3} more styles
                </p>
              )}
            </div>
          </div>

          {/* Available Styles */}
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <Grid className="w-3 h-3" />
              Available Styles
            </div>
            <div className="flex flex-wrap gap-1.5">
              {font.variants.map((variant, vIdx) => (
                <span
                  key={vIdx}
                  className="bg-secondary border-2 border-foreground/10 px-2 py-1 rounded-md text-xs font-bold text-foreground"
                >
                  {variant.weight}
                  {variant.style !== 'normal' && <span className="text-muted-foreground italic ml-1">{variant.style}</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Detected Sizes */}
          {font.variants.some(v => v.sizes.length > 0) && (
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Detected Sizes
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(new Set(font.variants.flatMap(v => v.sizes.map(s => s.value)))).map((size, sIdx) => (
                  <span key={sIdx} className="bg-secondary/50 border-2 border-foreground/10 px-2 py-1 rounded-md text-xs font-mono font-bold text-foreground">
                    {size}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Copy Actions */}
          <div className="pt-3 border-t-2 border-foreground/10 flex flex-wrap gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); copyToClipboard(fontFamilyCSS, `${index}-family`); }}
              className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-xs font-bold transition-all border-2 border-foreground/10 hover:border-foreground/30"
            >
              {copiedId === `${index}-family` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              Copy CSS
            </button>

            {googleImport && (
              <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(googleImport, `${index}-import`); }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg text-xs font-bold transition-all border-2 border-blue-500/20 hover:border-blue-500/40"
              >
                {copiedId === `${index}-import` ? <Check className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                Copy Import
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
