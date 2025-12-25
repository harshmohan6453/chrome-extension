import { useStore } from '../../store';
import { Layout, Ruler } from 'lucide-react';


export const SpacingPanel = () => {
  const { data } = useStore();
  const spacing = data.spacing || [];

  // Determine Base Unit (naive mode) or Common Multiples
  const isBase4 = spacing.every(s => s % 4 === 0);
  const isBase8 = spacing.every(s => s % 8 === 0);
  const baseUnit = isBase8 ? 8 : (isBase4 ? 4 : null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Spacing System</h2>
          <p className="text-muted-foreground text-sm mt-1">
             Detected padding & margin values used across the page.
          </p>
        </div>
        {baseUnit && (
             <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg flex flex-col items-center">
                 <span className="text-xs font-bold uppercase tracking-wider">Base Unit</span>
                 <span className="font-black text-xl">{baseUnit}px</span>
             </div>
        )}
      </div>

      {spacing.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-secondary/30 rounded-xl border border-dashed border-border text-center p-6">
          <Layout className="h-10 w-10 mb-3 opacity-50" />
          <h3 className="font-bold text-foreground">No Spacing Detected</h3>
          <p className="text-sm">Could not identify consistent spacing tokens.</p>
        </div>
      ) : (
        <div className="space-y-6">
            
            {/* Context Stats */}
            <div className="bg-card border border-border rounded-xl p-4 flex gap-6 shadow-sm">
                <div className="flex-1">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Smallest</div>
                    <div className="font-mono font-bold text-xl">{spacing[0]}px</div>
                </div>
                <div className="w-px bg-border"></div>
                <div className="flex-1">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Largest</div>
                    <div className="font-mono font-bold text-xl">{spacing[spacing.length - 1]}px</div>
                </div>
                <div className="w-px bg-border"></div>
                <div className="flex-1">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Tokens</div>
                    <div className="font-mono font-bold text-xl">{spacing.length}</div>
                </div>
            </div>

            {/* List View */}
            <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                    <Ruler className="w-4 h-4" /> DEFINED TOKENS
                </h3>
                <div className="grid gap-2">
                    {spacing.map((space, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors group">
                             {/* Label */}
                             <div className="w-16 shrink-0">
                                 <div className="font-black font-mono text-lg">{space}px</div>
                                 <div className="text-xs text-muted-foreground font-mono">{space / 16}rem</div>
                             </div>

                             {/* Visual Bar */}
                             <div className="flex-1 h-8 bg-secondary/50 rounded overflow-hidden relative">
                                 <div style={{ width: `${Math.min(space, 300)}px` }} className="h-full bg-primary/20 border-r-2 border-primary flex items-center justify-end px-2">
                                     <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                         {space}px
                                     </span>
                                 </div>
                                 {/* Grid Pattern BG */}
                                 <div className="absolute inset-0 pointer-events-none opacity-10" 
                                      style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '4px 4px' }}>
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
