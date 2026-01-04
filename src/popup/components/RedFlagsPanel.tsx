import { useState, useEffect } from 'react';
import { AlertTriangle, XCircle, Info, AlertCircle, Download, CheckCircle2, ChevronDown } from 'lucide-react';
import { useStore } from '../../store';
import type { RedFlag } from '../../store';

export default function RedFlagsPanel() {
  const { redFlags } = useStore((state) => state.data);
  const { redFlagsLoaded, setRedFlagsLoaded, setData } = useStore();
  const [loading, setLoading] = useState(false);

  // Fetch red flags on first mount if not loaded
  useEffect(() => {
    if (!redFlagsLoaded && !loading) {
      fetchRedFlags();
    }
  }, [redFlagsLoaded, loading]);

  const fetchRedFlags = async () => {
    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_RED_FLAGS' });
        if (response?.redFlags) {
          setData({ redFlags: response.redFlags });
          setRedFlagsLoaded(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch red flags:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group flags by category
  const flagsByCategory = {
    seo: redFlags.filter((f) => f.category === 'seo'),
    ux: redFlags.filter((f) => f.category === 'ux'),
    accessibility: redFlags.filter((f) => f.category === 'accessibility'),
    mobile: redFlags.filter((f) => f.category === 'mobile'),
    performance: redFlags.filter((f) => f.category === 'performance'),
  };

  // Count by severity
  const criticalCount = redFlags.filter((f) => f.severity === 'critical').length;
  const warningCount = redFlags.filter((f) => f.severity === 'warning').length;
  const infoCount = redFlags.filter((f) => f.severity === 'info').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-600 bg-red-500/10';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-500/10';
      case 'info':
        return 'border-l-blue-500 bg-blue-500/10';
      default:
        return 'border-l-gray-400 bg-foreground/5';
    }
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'seo':
        return { emoji: '🔍', name: 'SEO', color: 'bg-green-500/10 text-green-600 border-green-500/20' };
      case 'ux':
        return { emoji: '🎨', name: 'UX', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
      case 'accessibility':
        return { emoji: '♿', name: 'Accessibility', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
      case 'mobile':
        return { emoji: '📱', name: 'Mobile', color: 'bg-pink-500/10 text-pink-600 border-pink-500/20' };
      case 'performance':
        return { emoji: '⚡', name: 'Performance', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
      default:
        return { emoji: '🚩', name: 'Other', color: 'bg-foreground/10 text-muted-foreground border-foreground/20' };
    }
  };

  const downloadReport = () => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    let content = `# Website Red Flag Report\n`;
    content += `Generated on: ${date} at ${time}\n`;
    content += `Total Issues Found: ${redFlags.length}\n`;
    content += `Critical: ${criticalCount} | Warning: ${warningCount} | Info: ${infoCount}\n\n`;
    
    content += `## Summary by Category\n`;
    Object.entries(flagsByCategory).forEach(([category, flags]) => {
      if (flags.length > 0) {
        content += `- ${category.toUpperCase()}: ${flags.length} issues\n`;
      }
    });
    content += `\n---\n\n`;
    
    // Function to write flags for a severity level
    const writeFlags = (severity: string, title: string) => {
      const flags = redFlags.filter(f => f.severity === severity);
      if (flags.length === 0) return;
      
      content += `## ${title}\n\n`;
      flags.forEach(flag => {
        content += `### [${flag.category.toUpperCase()}] ${flag.title}\n`;
        content += `**Description:** ${flag.description}\n`;
        content += `**Recommendation:** ${flag.recommendation}\n`;
        
        if (flag.impactScore) content += `**Impact Score:** ${flag.impactScore}/10\n`;
        if (flag.estimatedImpact) content += `**Estimated Impact:** ${flag.estimatedImpact}\n`;
        if (flag.fixCode) content += `**Fix Example:**\n\`\`\`html\n${flag.fixCode}\n\`\`\`\n`;
        if (flag.learnMoreUrl) content += `**Learn More:** ${flag.learnMoreUrl}\n`;
        if (flag.affectedElements && flag.affectedElements.length > 0) {
          content += `**Affected Elements:** ${flag.affectedElements.join(', ')}\n`;
        }
        content += `\n`;
      });
    };
    
    writeFlags('critical', '🔴 Critical Issues');
    writeFlags('warning', '🟡 Warnings');
    writeFlags('info', '🔵 Recommendations');
    
    // Create blob and download link
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `red-flags-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // State for expanded flags
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'category' | 'section'>('category');

  // Calculate Global Health Score (0-100)
  // Start at 100, deduct points for issues
  const calculateHealthScore = () => {
    let score = 100;
    score -= criticalCount * 15; // Critical hits hard
    score -= warningCount * 5;   // Warnings moderate
    score -= infoCount * 1;      // Info light
    return Math.max(0, score);
  };
  
  const healthScore = calculateHealthScore();
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-500/10 border-2 border-green-500/20';
    if (score >= 50) return 'text-yellow-600 bg-yellow-500/10 border-2 border-yellow-500/20';
    return 'text-red-600 bg-red-500/10 border-2 border-red-500/20';
  };

  // Grouping Logic
  const getSection = (flag: RedFlag) => {
    if (flag.pageSection) return flag.pageSection;
    // Fallback based on category
    if (flag.category === 'seo' || flag.category === 'mobile') return 'head';
    if (flag.category === 'performance') return 'system';
    return 'body';
  };

  const groupedFlags = groupBy === 'category' ? flagsByCategory : {
    head: redFlags.filter(f => getSection(f) === 'head'),
    body: redFlags.filter(f => getSection(f) === 'body' || getSection(f) === 'main' || getSection(f) === 'header' || getSection(f) === 'footer'),
    system: redFlags.filter(f => getSection(f) === 'system' || getSection(f) === 'unknown'),
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedFlags);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFlags(newExpanded);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderFlag = (flag: RedFlag) => {
    const categoryInfo = getCategoryInfo(flag.category);
    const isExpanded = expandedFlags.has(flag.id);
    
    return (
      <div
        key={flag.id}
        className={`border-l-4 ${getSeverityColor(flag.severity)} rounded-r-lg mb-3 bg-card border-y-2 border-r-2 border-foreground/10 neo-shadow-sm transition-all duration-200`}
      >
        {/* Card Header - Clickable */}
        <div 
          onClick={() => toggleExpand(flag.id)}
          className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors flex items-start gap-3"
        >
          {getSeverityIcon(flag.severity)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-foreground">{flag.title}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${categoryInfo.color}`}>
                {categoryInfo.emoji} {categoryInfo.name}
              </span>
              {flag.count && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-secondary text-muted-foreground border border-foreground/10">
                  {flag.count} found
                </span>
              )}
              {flag.impactScore && (
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ml-auto ${
                  flag.impactScore >= 8 ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                  flag.impactScore >= 5 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                  'bg-blue-500/10 text-blue-600 border-blue-500/20'
                }`}>
                  Impact: {flag.impactScore}/10
                </span>
              )}
            </div>
            
            <p className="text-sm text-foreground/80">{flag.description}</p>
            
            {/* Quick recommendation preview */}
            {!isExpanded && (
               <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                 Click to see fix and details
               </div>
            )}
          </div>
          <div className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
             <ChevronDown className="w-5 h-5" />
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t-2 border-foreground/5 bg-secondary/20">
            {/* Impact Estimate */}
            {flag.estimatedImpact && (
              <div className="mt-3 text-xs bg-card border-2 border-foreground/10 p-2 rounded-lg text-muted-foreground flex items-start gap-2 neo-shadow-sm">
                 <span className="text-lg">⚡</span>
                 <div>
                   <span className="font-bold text-foreground">Impact:</span> {flag.estimatedImpact}
                 </div>
              </div>
            )}

            {/* Recommendation */}
            <div className="mt-3 bg-blue-50 border border-blue-100 p-3 rounded text-sm text-blue-800">
              <strong>💡 Recommendation:</strong> {flag.recommendation}
            </div>

            {/* Fix Code Snippet */}
            {flag.fixCode && (
              <div className="mt-3 relative group">
                <div className="text-xs font-semibold text-gray-500 mb-1">Example Fix:</div>
                <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono">
                  {flag.fixCode}
                </pre>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    copyCode(flag.fixCode!, flag.id);
                  }}
                  className="absolute top-6 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs backdrop-blur-sm transition-colors"
                  title="Copy Code"
                >
                  {copiedCode === flag.id ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            )}

            {/* Affected Elements List */}
            {flag.affectedElements && flag.affectedElements.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-500 mb-1">Affected Elements (Top 5):</div>
                <div className="flex flex-wrap gap-1">
                  {flag.affectedElements.map((el, i) => (
                    <code key={i} className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs text-red-600 font-mono">
                      {el}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Learn More Link */}
            {flag.learnMoreUrl && (
              <div className="mt-3 pt-2 text-right">
                <a 
                  href={flag.learnMoreUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  📚 Learn more about this issue →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
          <div className="relative bg-card p-3 rounded-lg neo-shadow-lg flex items-center justify-center border-2 border-foreground/20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Analyzing Page...</h3>
        <p className="text-sm text-gray-600">
          Detecting SEO, UX, and accessibility issues.
        </p>
      </div>
    );
  }

  if (redFlags.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">✨</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Critical Issues!</h3>
        <p className="text-gray-600">
          This page looks great! No major SEO, UX, or accessibility red flags detected.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-card rounded-lg p-6 border-2 border-foreground/20 neo-shadow">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Page Health</h2>
            <p className="text-sm text-muted-foreground">
              Found {redFlags.length} issue{redFlags.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button 
            onClick={downloadReport}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground neo-shadow neo-button hover:bg-primary/90 rounded-lg text-xs font-bold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>

        <div className="flex items-center gap-6">
          {/* Circular Score */}
          <div className={`relative flex items-center justify-center w-24 h-24 rounded-full ${getScoreColor(healthScore)} neo-shadow-sm`}>
            <div className="text-center">
              <span className={`text-3xl font-black block`}>
                {healthScore}
              </span>
              <span className="text-[10px] opacity-70 uppercase tracking-wider font-bold">Score</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="bg-red-500/10 rounded-lg p-2 text-center border-2 border-red-500/20 neo-shadow-sm">
              <div className="text-xl font-bold text-red-600">{criticalCount}</div>
              <div className="text-xs text-red-600 font-bold">Critical</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-2 text-center border-2 border-yellow-500/20 neo-shadow-sm">
              <div className="text-xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-xs text-yellow-600 font-bold">Warnings</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-2 text-center border-2 border-blue-500/20 neo-shadow-sm">
              <div className="text-xl font-bold text-blue-600">{infoCount}</div>
              <div className="text-xs text-blue-600 font-bold">Hints</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex bg-secondary p-1 rounded-lg border-2 border-foreground/10">
        <button
          onClick={() => setGroupBy('category')}
          className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${
            groupBy === 'category' ? 'bg-background text-foreground shadow-sm border border-foreground/10' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Priority View
        </button>
        <button
          onClick={() => setGroupBy('section')}
          className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${
            groupBy === 'section' ? 'bg-background text-foreground shadow-sm border border-foreground/10' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Page Structure
        </button>
      </div>

      {/* Content Area */}
      {groupBy === 'category' ? (
        // Priority View (Severity)
        <div className="space-y-6">
          {criticalCount > 0 && (
            <div>
              <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <XCircle className="w-4 h-4" /> Critical Issues
              </h3>
              {redFlags.filter((f) => f.severity === 'critical').map(renderFlag)}
            </div>
          )}
          {warningCount > 0 && (
            <div>
              <h3 className="text-sm font-bold text-yellow-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4" /> Warnings
              </h3>
              {redFlags.filter((f) => f.severity === 'warning').map(renderFlag)}
            </div>
          )}
          {infoCount > 0 && (
            <div>
              <h3 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <Info className="w-4 h-4" /> Recommendations
              </h3>
              {redFlags.filter((f) => f.severity === 'info').map(renderFlag)}
            </div>
          )}
        </div>
      ) : (
        // Section View
        <div className="space-y-6">
          {/* Head */}
          {(groupedFlags as any).head.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-foreground/10 pb-2">
                👾 Head & Metadata
                <span className="ml-auto bg-secondary text-muted-foreground px-2 rounded-full text-xs">{(groupedFlags as any).head.length}</span>
              </h3>
              {(groupedFlags as any).head.map(renderFlag)}
            </div>
          )}
          {/* Body */}
          {(groupedFlags as any).body.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-foreground/10 pb-2">
                🎨 Body & Content
                <span className="ml-auto bg-secondary text-muted-foreground px-2 rounded-full text-xs">{(groupedFlags as any).body.length}</span>
              </h3>
              {(groupedFlags as any).body.map(renderFlag)}
            </div>
          )}
          {/* System */}
          {(groupedFlags as any).system.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-foreground/10 pb-2">
                ⚡ System & Performance
                <span className="ml-auto bg-secondary text-muted-foreground px-2 rounded-full text-xs">{(groupedFlags as any).system.length}</span>
              </h3>
              {(groupedFlags as any).system.map(renderFlag)}
            </div>
          )}
        </div>
      )}

      {redFlags.length === 0 && (
        <div className="bg-card rounded-lg p-6 border-2 border-foreground/20 text-center neo-shadow">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/20">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Red Flags Found!</h2>
          <p className="text-sm text-muted-foreground">
            This page looks great! No major SEO, UX, or accessibility red flags detected.
          </p>
        </div>
      )}
    </div>
  );
}
