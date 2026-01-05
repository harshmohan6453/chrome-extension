import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Trash2, Download, FileJson, Check, Moon, Sun, Palette, Ruler, Eye, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

export const SettingsPanel = () => {
    const { reset, resetPreferences, preferences, setPreferences, data } = useStore();
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [highlightColor, setHighlightColor] = useState('#8b5cf6');
    const [exportSuccess, setExportSuccess] = useState(false);
    const [version, setVersion] = useState('1.0.0');

    // Load settings from localStorage and version from manifest
    useEffect(() => {
        const savedTheme = localStorage.getItem('di-theme') as 'light' | 'dark' | 'system' | null;
        const savedHighlightColor = localStorage.getItem('di-highlightColor');
        
        if (savedTheme) setTheme(savedTheme);
        if (savedHighlightColor) setHighlightColor(savedHighlightColor);
        
        // Get version from manifest
        const manifest = chrome.runtime.getManifest();
        setVersion(manifest.version);
    }, []);

    // Save theme preference
    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        localStorage.setItem('di-theme', newTheme);
        
        // Apply theme to document
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (newTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // System preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    };

    // Save highlight color and update in real-time
    const handleHighlightColorChange = async (color: string) => {
        setHighlightColor(color);
        localStorage.setItem('di-highlightColor', color);
        
        // Send real-time update to content script
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                await chrome.tabs.sendMessage(tab.id, { 
                    action: 'UPDATE_HIGHLIGHT_COLOR', 
                    highlightColor: color 
                });
            }
        } catch (e) {
            // Content script may not be injected yet, that's okay
        }
    };

    // Export all data as JSON
    const handleExport = () => {
        const exportData = {
            version: version,
            exportedAt: new Date().toISOString(),
            preferences,
            data: {
                fonts: data.fonts,
                colors: data.colors,
                spacing: data.spacing,
                assets: data.assets.length,
                meta: data.meta
            }
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `design-inspector-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2000);
    };

    const highlightColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

    return (
        <div className="space-y-6 pb-6">
            <h2 className="text-2xl font-black tracking-tight">Settings</h2>
            
            {/* Display Preferences */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-4 h-4" /> Display
                </h3>
                
                {/* Theme */}
                <div className="p-4 rounded-lg border-2 border-foreground/20 bg-card space-y-3 neo-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-bold">Theme</label>
                            <p className="text-xs text-muted-foreground">Choose your preferred appearance</p>
                        </div>
                    </div>
                    <div className="flex bg-secondary p-1 rounded-lg border-2 border-foreground/10">
                        <button
                            onClick={() => handleThemeChange('light')}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all",
                                theme === 'light' ? 'bg-background shadow-sm text-foreground border border-foreground/10' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Sun className="w-4 h-4" /> Light
                        </button>
                        <button
                            onClick={() => handleThemeChange('dark')}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all",
                                theme === 'dark' ? 'bg-background shadow-sm text-foreground border border-foreground/10' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Moon className="w-4 h-4" /> Dark
                        </button>
                        <button
                            onClick={() => handleThemeChange('system')}
                            className={clsx(
                                "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                                theme === 'system' ? 'bg-background shadow-sm text-foreground border border-foreground/10' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            System
                        </button>
                    </div>
                </div>

                {/* Color Format */}
                <div className="p-4 rounded-lg border-2 border-foreground/20 bg-card space-y-3 neo-shadow">
                    <label className="text-sm font-bold block">Color Format</label>
                    <div className="flex bg-secondary p-1 rounded-lg border-2 border-foreground/10">
                        {(['hex', 'rgb', 'hsl'] as const).map((fmt) => (
                            <button
                                key={fmt}
                                onClick={() => setPreferences({ colorFormat: fmt })}
                                className={clsx(
                                    "flex-1 py-2 text-xs font-bold rounded-md transition-all uppercase",
                                    preferences.colorFormat === fmt 
                                        ? 'bg-background shadow-sm text-foreground border border-foreground/10' 
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Unit Format */}
                <div className="p-4 rounded-lg border-2 border-foreground/20 bg-card space-y-3 neo-shadow">
                    <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        <label className="text-sm font-bold">Size Units</label>
                    </div>
                    <div className="flex bg-secondary p-1 rounded-lg border-2 border-foreground/10">
                        {(['px', 'rem'] as const).map((fmt) => (
                            <button
                                key={fmt}
                                onClick={() => setPreferences({ unitFormat: fmt })}
                                className={clsx(
                                    "flex-1 py-2 text-xs font-bold rounded-md transition-all uppercase",
                                    preferences.unitFormat === fmt 
                                        ? 'bg-background shadow-sm text-foreground border border-foreground/10' 
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Inspector Settings */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Inspector
                </h3>

                {/* Highlight Color */}
                <div className="p-4 rounded-lg border-2 border-foreground/20 bg-card space-y-3 neo-shadow">
                    <label className="text-sm font-bold block">Highlight Color</label>
                    <p className="text-xs text-muted-foreground">Color used when inspecting elements</p>
                    <div className="flex gap-2">
                        {highlightColors.map((color) => (
                            <button
                                key={color}
                                onClick={() => handleHighlightColorChange(color)}
                                className={clsx(
                                    "w-8 h-8 rounded-lg border-2 transition-all",
                                    highlightColor === color ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"
                                )}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Data Management */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <FileJson className="w-4 h-4" /> Data
                </h3>
                
                <button 
                    onClick={handleExport}
                    className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-foreground/20 bg-card hover:border-primary hover:bg-accent/50 transition-all group neo-shadow"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            <Download className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-medium">Export Data</div>
                            <div className="text-xs text-muted-foreground">Download analysis as JSON</div>
                        </div>
                    </div>
                    {exportSuccess ? (
                        <Check className="w-5 h-5 text-green-500" />
                    ) : (
                        <FileJson className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                </button>

                <button 
                    onClick={reset} 
                    className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-foreground/20 bg-card hover:border-destructive hover:bg-destructive/5 transition-all neo-shadow"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                            <Trash2 className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-destructive">Reset Data Only</div>
                            <div className="text-xs text-muted-foreground">Clear only analysis data</div>
                        </div>
                    </div>
                </button>

                <button 
                    onClick={() => {
                        resetPreferences();
                        window.location.reload(); // Reload to apply theme reset
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-foreground/20 bg-card hover:border-orange-500 hover:bg-orange-500/5 transition-all neo-shadow"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            <RotateCcw className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-orange-600">Reset Settings</div>
                            <div className="text-xs text-muted-foreground">Reset theme & colors</div>
                        </div>
                    </div>
                </button>
            </div>

            {/* About */}
            <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Snatch v{version}</span>
                    <a 
                        href="mailto:harshmohan6453@gmail.com?subject=Snatch - Issue Report" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                    >
                        Report Issue
                    </a>
                </div>
            </div>
        </div>
    );
};

