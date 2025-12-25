import { useStore } from '../../store';
import { Trash2, Download, FileJson } from 'lucide-react';

export const SettingsPanel = () => {
    const { reset, preferences, setPreferences } = useStore();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight mb-4">Settings</h2>
                
                <div className="space-y-6">
                    {/* Preferences */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Preferences</h3>
                        <div className="space-y-4">
                            
                            {/* Color Format */}
                            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                                <label className="text-sm font-bold block">Color Format</label>
                                <div className="flex bg-secondary p-1 rounded-lg">
                                    {(['hex', 'rgb', 'hsl'] as const).map((fmt) => (
                                        <button
                                            key={fmt}
                                            onClick={() => setPreferences({ colorFormat: fmt })}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all uppercase ${
                                                preferences.colorFormat === fmt 
                                                ? 'bg-background shadow-sm text-foreground' 
                                                : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Unit Format */}
                            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                                <label className="text-sm font-bold block">Font & Spacing Units</label>
                                <div className="flex bg-secondary p-1 rounded-lg">
                                    {(['px', 'rem'] as const).map((fmt) => (
                                        <button
                                            key={fmt}
                                            onClick={() => setPreferences({ unitFormat: fmt })}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all uppercase ${
                                                preferences.unitFormat === fmt 
                                                ? 'bg-background shadow-sm text-foreground' 
                                                : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Management */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Data</h3>
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                        <Download className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium">Export Data</div>
                                        <div className="text-xs text-muted-foreground">Download as JSON</div>
                                    </div>
                                </div>
                                <FileJson className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </button>

                            <button onClick={reset} className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-destructive/50 hover:bg-destructive/5 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                                        <Trash2 className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium text-destructive">Reset Cache</div>
                                        <div className="text-xs text-muted-foreground">Clear all analyzed data</div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* About */}
                    <div className="pt-6 border-t border-border">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Version 1.0.0</span>
                            <a href="#" className="hover:text-primary transition-colors">Report an issue</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
