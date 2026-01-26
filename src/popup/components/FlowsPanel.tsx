import { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  Square, 
  Trash2, 
  Share2, 
  Copy, 
  MousePointer2, 
  CheckCircle2, 
  ArrowDown, 
  Globe, 
  Code,
  ChevronDown 
} from 'lucide-react';
import { FlowStep } from '../../store';
import { clsx } from 'clsx';

export default function FlowsPanel() {
  const [isRecording, setIsRecording] = useState(false);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [mermaidCode, setMermaidCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    // Load initial state
    chrome.storage.local.get(['isRecording', 'flowSteps', 'recordingStartTime'], (result) => {
      setIsRecording(!!result.isRecording);
      if (result.flowSteps) {
        setSteps(result.flowSteps);
      }
      // Resume timer if recording
      if (result.isRecording && result.recordingStartTime) {
        const elapsed = Math.floor((Date.now() - result.recordingStartTime) / 1000);
        setRecordingTime(elapsed);
      }
    });

    // Listen for changes
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.isRecording) {
        setIsRecording(changes.isRecording.newValue);
        if (changes.isRecording.newValue) {
            setRecordingTime(0);
        }
      }
      if (changes.flowSteps) {
        setSteps(changes.flowSteps.newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Generate Mermaid Code Effect
  useEffect(() => {
    if (steps.length === 0) {
        setMermaidCode('');
        return;
    }

    let code = 'flowchart TD\n';
    code += '  Start([Start]) --> ';
    
    steps.forEach((step, index) => {
        const safeDesc = step.description.replace(/'/g, "'").replace(/\n/g, ' ');
        // Shorten URL for display
        let urlDisplay = '';
        try {
            urlDisplay = new URL(step.url).pathname;
            if (urlDisplay.length > 20) urlDisplay = '...' + urlDisplay.slice(-20);
        } catch (e) { urlDisplay = 'Page'; }

        code += `Node${index}["<b>${safeDesc}</b><br/><i>${urlDisplay}</i>"]\n`;
        
        if (index < steps.length - 1) {
            code += `  Node${index} --> Node${index + 1}\n`;
        }
    });

    setMermaidCode(code);
  }, [steps]);

  const toggleRecording = () => {
    const newState = !isRecording;
    if (newState) {
        chrome.storage.local.set({ 
            isRecording: true, 
            recordingStartTime: Date.now() 
        });
    } else {
        chrome.storage.local.set({ isRecording: false });
        chrome.storage.local.remove('recordingStartTime');
    }
    
    // Notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: newState ? 'START_RECORDING' : 'STOP_RECORDING' 
        });
      }
    });
  };

  const clearFlow = () => {
    chrome.storage.local.set({ flowSteps: [] });
    setSteps([]);
    setRecordingTime(0);
  };

  const copyMermaid = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Group steps by Page URL to create "Flow Blocks"
  const flowBlocks = useMemo(() => {
    if (steps.length === 0) return [];
    
    const blocks: { url: string; steps: FlowStep[] }[] = [];
    let currentBlock: { url: string; steps: FlowStep[] } | null = null;

    steps.forEach((step) => {
        // Create new block if URL changes or first step
        if (!currentBlock || currentBlock.url !== step.url) {
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = { url: step.url, steps: [] };
        }
        currentBlock.steps.push(step);
    });
    if (currentBlock) blocks.push(currentBlock);

    return blocks;
  }, [steps]);

  return (
    <div className="space-y-6 pb-6">
      {/* Control Center */}
      <div className="bg-card rounded-xl border-2 border-foreground/10 p-5 neo-shadow text-center relative overflow-hidden">
        {isRecording && (
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20">
                <div className="h-full bg-red-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
            </div>
        )}
        
        <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight flex items-center justify-center gap-2">
                User Flow <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs border border-primary/20">BETA</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
                Map your journey across the web.
            </p>
        </div>

        <div className="flex flex-col items-center gap-4">
            <div className="font-mono text-4xl font-black tracking-widest text-foreground tabular-nums">
                {formatTime(recordingTime)}
            </div>

            <div className="flex gap-3 w-full justify-center">
                <button
                    onClick={toggleRecording}
                    className={clsx(
                        "flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg",
                        isRecording 
                            ? 'bg-red-500 text-white hover:bg-red-600' 
                            : 'bg-primary text-white hover:bg-primary/90'
                    )}
                >
                    {isRecording ? (
                        <>
                            <Square className="w-5 h-5 fill-current" /> Stop
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5 fill-current" /> Record
                        </>
                    )}
                </button>

                {steps.length > 0 && !isRecording && (
                    <button
                        onClick={clearFlow}
                        className="p-3 rounded-xl bg-secondary text-muted-foreground border-2 border-foreground/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                        title="Clear Flow"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Visual Flow Representation */}
      {steps.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Share2 className="w-4 h-4" /> Journey Map
                </h3>
                <span className="text-[10px] font-bold bg-secondary px-2 py-1 rounded text-muted-foreground">
                    {steps.length} Actions • {flowBlocks.length} Pages
                </span>
            </div>

            {/* Blocks */}
            <div className="space-y-4">
                {flowBlocks.map((block, i) => (
                    <div key={i} className="relative">
                        {/* Connecting Line (if not last) */}
                        {i < flowBlocks.length - 1 && (
                            <div className="absolute left-6 top-full h-4 w-0.5 bg-border/50 z-0"></div>
                        )}

                        <div className="bg-card border-2 border-foreground/10 rounded-xl overflow-hidden neo-shadow-sm">
                            {/* Page Header */}
                            <div className="bg-secondary/30 p-3 border-b border-foreground/5 flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center border border-blue-500/20 shrink-0">
                                    <Globe className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Page {i + 1}</div>
                                    <div className="font-bold text-sm truncate" title={block.url}>
                                        {new URL(block.url).pathname === '/' ? 'Home' : new URL(block.url).pathname}
                                    </div>
                                </div>
                            </div>

                            {/* Steps List */}
                            <div className="p-2 space-y-2">
                                {block.steps.map((step, j) => (
                                    <div key={j} className="flex items-center gap-3 p-2 hover:bg-secondary/20 rounded-lg transition-colors group">
                                        <div className="w-6 text-center text-xs font-mono text-muted-foreground opacity-50">{j + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate">{step.description}</div>
                                            <div className="text-[10px] text-muted-foreground font-mono truncate opacity-60 group-hover:opacity-100 transition-opacity">
                                                {step.selector}
                                            </div>
                                        </div>
                                        <div className="text-muted-foreground opacity-30">
                                            <MousePointer2 className="w-3 h-3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Transition Arrow (if not last) */}
                        {i < flowBlocks.length - 1 && (
                            <div className="flex justify-center py-1">
                                <ArrowDown className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Export Actions */}
            <div className="pt-4 border-t border-border/50">
                <button 
                    onClick={() => setShowCode(!showCode)}
                    className="w-full flex items-center justify-between p-4 bg-slate-900 text-slate-200 rounded-xl hover:bg-slate-800 transition-all neo-shadow"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Code className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-sm">Export Diagram</div>
                            <div className="text-xs text-slate-400">Get Mermaid.js code for Notion/GitHub</div>
                        </div>
                    </div>
                    <ChevronDown className={clsx("w-5 h-5 transition-transform", showCode && "rotate-180")} />
                </button>

                {showCode && (
                    <div className="mt-2 bg-slate-950 rounded-xl border-2 border-slate-800 p-4 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Mermaid Code</span>
                            <button 
                                onClick={copyMermaid}
                                className="text-xs bg-primary/20 text-primary hover:bg-primary/30 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                            >
                                {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto p-2 rounded bg-slate-900/50">
                            {mermaidCode}
                        </pre>
                    </div>
                )}
            </div>
        </div>
      )}

      {steps.length === 0 && !isRecording && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-secondary/20 rounded-xl border-2 border-dashed border-foreground/10">
          <MousePointer2 className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">No recording yet</p>
          <p className="text-xs opacity-70">Click Record to start mapping your journey</p>
        </div>
      )}
    </div>
  );
}