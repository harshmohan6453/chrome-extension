import { useStore } from '../../store';
import { Type } from 'lucide-react';

export const TypographyPanel = () => {
  const { data } = useStore();
  const fonts = data.fonts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-black tracking-tight">Typography</h2>
         <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">{fonts.length} Found</span>
      </div>

      {fonts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-white/50 rounded-3xl border border-dashed border-border/50">
          <Type className="h-12 w-12 mb-4 opacity-30" />
          <p className="font-medium">No fonts detected yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
            {fonts.map((font: any, i: number) => (
            <div key={i} className="p-5 rounded-2xl border border-border bg-card card-hover group relative overflow-hidden">
                {/* Decorative background letter */}
                <div className="absolute -right-4 -bottom-4 text-9xl font-black text-secondary opacity-50 pointer-events-none select-none transition-transform group-hover:scale-110 duration-500" style={{ fontFamily: font.family }}>
                    Aa
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: font.family }}>{font.family}</h3>
                        <span className="text-secondary-foreground text-xs font-bold bg-secondary px-2 py-1 rounded-lg">
                            Used x{font.count}
                        </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-4">
                        {font.variants.map((v: string) => (
                            <span key={v} className="bg-background border border-border px-2 py-1 rounded-md text-xs font-medium">
                                {v}
                            </span>
                        ))}
                    </div>

                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-60">
                        {font.sizes.join(' • ')}
                    </div>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
};
