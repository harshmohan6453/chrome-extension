import { useState, useEffect } from 'react';
import { Play, Trash2, Share2, Copy, MousePointer2, CheckCircle2 } from 'lucide-react';
import { FlowStep } from '../../store';

export default function FlowsPanel() {
  const [isRecording, setIsRecording] = useState(false);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [mermaidCode, setMermaidCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load initial state
    chrome.storage.local.get(['isRecording', 'flowSteps'], (result) => {
      setIsRecording(!!result.isRecording);
      if (result.flowSteps) {
        setSteps(result.flowSteps);
        generateMermaid(result.flowSteps);
      }
    });

    // Listen for changes
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.isRecording) {
        setIsRecording(changes.isRecording.newValue);
      }
      if (changes.flowSteps) {
        setSteps(changes.flowSteps.newValue || []);
        generateMermaid(changes.flowSteps.newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const toggleRecording = () => {
    const newState = !isRecording;
    // Update storage (source of truth)
    chrome.storage.local.set({ isRecording: newState });
    
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
    setMermaidCode('');
  };

  const generateMermaid = (flowSteps: FlowStep[]) => {
    if (flowSteps.length === 0) {
      setMermaidCode('');
      return;
    }

    let code = 'flowchart TD\n';
    code += '  Start((Start))\n';
    code += '  End((End))\n\n';

    // 1. Define Nodes
    flowSteps.forEach((step, index) => {
      const safeDesc = step.description.replace(/"/g, "'");
      const path = new URL(step.url).pathname;
      // Using <br/> for line break in node label, supported in flowchart
      code += `  Step${index}["<b>${safeDesc}</b><br/>${path}"]\n`;
    });
    
    code += '\n  Start --> Step0\n';

    // 2. Define Edges
    flowSteps.forEach((step, index) => {
      const nodeId = `Step${index}`;
      const nextNodeId = `Step${index + 1}`;
      
      if (index < flowSteps.length - 1) {
        code += `  ${nodeId} -->|${step.type}| ${nextNodeId}\n`;
      } else {
        code += `  ${nodeId} --> End\n`;
      }
    });

    setMermaidCode(code);
  };

  const copyMermaid = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header & Controls */}
      <div className="bg-card rounded-lg p-6 border-2 border-foreground/20 text-center neo-shadow">
        <h2 className="text-xl font-bold text-foreground mb-2">User Flow Recorder</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Record your clicks and generate instant flowcharts.
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all transform hover:scale-105 ${
              isRecording 
                ? 'bg-destructive/10 text-destructive border-2 border-destructive/20 hover:bg-destructive/20 neo-shadow-sm' 
                : 'bg-primary text-white neo-shadow neo-button hover:bg-primary/90'
            }`}
          >
            {isRecording ? (
              <>
                <div className="w-3 h-3 bg-red-600 rounded-sm animate-pulse" />
                Stop Recording
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Start Recording
              </>
            )}
          </button>

          {steps.length > 0 && (
            <button
              onClick={clearFlow}
              className="p-3 rounded-full bg-secondary text-muted-foreground border-2 border-foreground/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              title="Clear Flow"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Steps Timeline */}
      {steps.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Recorded Steps ({steps.length})</h3>
          <div className="relative pl-8 space-y-8">
            {/* Continuous Vertical Line */}
            <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-foreground/10 mx-auto" />

            {steps.map((step) => (
              <div key={step.id} className="relative">
                {/* Timeline Dot */}
                <div className="absolute left-[-26px] top-1.5 w-3.5 h-3.5 rounded-full bg-background border-[3px] border-primary z-10 neo-shadow-sm transition-transform hover:scale-125" />
                
                <div className="bg-card p-3.5 rounded-lg border-2 border-foreground/20 hover:border-primary transition-all group neo-shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-primary/5 text-primary rounded-lg group-hover:bg-primary/10 transition-colors">
                      <MousePointer2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm leading-tight">{step.description}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                         <div className="text-[10px] text-muted-foreground font-mono bg-secondary px-2 py-1 rounded border border-foreground/5">
                           {step.selector}
                         </div>
                         <div className="text-[10px] text-primary/70 font-medium bg-primary/5 px-2 py-1 rounded">
                           {new URL(step.url).pathname}
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Export Section */}
          <div className="bg-slate-900 rounded-lg p-4 text-slate-300 overflow-hidden border-2 border-slate-800 neo-shadow">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-medium">Mermaid Diagram</span>
              </div>
              <button 
                onClick={copyMermaid}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs font-mono bg-slate-950 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {mermaidCode}
            </pre>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              Paste into Mermaid.live, Notion, or GitHub to visualize
            </p>
          </div>
        </div>
      )}

      {steps.length === 0 && !isRecording && (
        <div className="text-center py-12 text-muted-foreground">
          <MousePointer2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Click "Start Recording" and interact with the page.</p>
        </div>
      )}
    </div>
  );
}
