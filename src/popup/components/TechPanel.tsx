import { useStore } from '../../store';
import { Code2, Cpu, Globe, Layers, Server } from 'lucide-react';

export const TechPanel = () => {
  const { data } = useStore();
  const techs = data.technologies || [];

  // Helper to categorize techs (simple mapping for visual flair)
  const getCategoryIcon = (tech: string) => {
    const t = tech.toLowerCase();
    if (t.includes('react') || t.includes('vue') || t.includes('angular') || t.includes('svelte')) return Layers;
    if (t.includes('tailwind') || t.includes('bootstrap') || t.includes('css')) return Palette;
    if (t.includes('wordpress') || t.includes('shopify')) return Globe;
    return Code2;
  };
  
  // Dummy import for Palette since I used it above
  const Palette = Layers; 

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-black tracking-tight">Technologies</h2>
         <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">{techs.length} Detected</span>
      </div>

      {techs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-white/50 rounded-3xl border border-dashed border-border/50 text-center p-8">
          <Cpu className="h-12 w-12 mb-4 opacity-30" />
          <p className="font-medium text-lg text-foreground">No specific framework detected.</p>
          <p className="text-sm mt-2 max-w-xs">This page might be using custom code or technologies hidden from the DOM.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {techs.map((tech: string, i: number) => {
            const Icon = getCategoryIcon(tech);
            return (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card card-hover group">
                    <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                        <Icon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{tech}</h3>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Detected via DOM/Scripts</p>
                    </div>
                </div>
            )
          })}
        </div>
      )}
      
      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mt-8">
          <div className="flex gap-3">
              <Server className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900/80">
                  <p className="font-bold mb-1">How detection works</p>
                  <p>We analyze the page's HTML structure, global variables, and checking for specific script signatures. Some server-side technologies cannot be detected from the browser.</p>
              </div>
          </div>
      </div>
    </div>
  );
};
