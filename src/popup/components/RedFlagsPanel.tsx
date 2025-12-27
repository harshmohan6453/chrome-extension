import { AlertTriangle, XCircle, Info, AlertCircle } from 'lucide-react';
import { useStore } from '../../store';
import type { RedFlag } from '../../store';

export default function RedFlagsPanel() {
  const { redFlags } = useStore((state) => state.data);

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
        return 'border-l-red-600 bg-red-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'info':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-400 bg-gray-50';
    }
  };

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'seo':
        return { emoji: '🔍', name: 'SEO', color: 'bg-green-100 text-green-800' };
      case 'ux':
        return { emoji: '🎨', name: 'UX', color: 'bg-purple-100 text-purple-800' };
      case 'accessibility':
        return { emoji: '♿', name: 'Accessibility', color: 'bg-blue-100 text-blue-800' };
      case 'mobile':
        return { emoji: '📱', name: 'Mobile', color: 'bg-pink-100 text-pink-800' };
      case 'performance':
        return { emoji: '⚡', name: 'Performance', color: 'bg-orange-100 text-orange-800' };
      default:
        return { emoji: '🚩', name: 'Other', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const renderFlag = (flag: RedFlag) => {
    const categoryInfo = getCategoryInfo(flag.category);
    
    return (
      <div
        key={flag.id}
        className={`border-l-4 ${getSeverityColor(flag.severity)} p-4 rounded-r-lg mb-3`}
      >
        <div className="flex items-start gap-3">
          {getSeverityIcon(flag.severity)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{flag.title}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryInfo.color}`}>
                {categoryInfo.emoji} {categoryInfo.name}
              </span>
              {flag.count && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                  {flag.count}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 mb-2">{flag.description}</p>
            <div className="bg-white border border-gray-200 rounded p-2 text-xs text-gray-600">
              <strong>💡 Fix:</strong> {flag.recommendation}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
      {/* Header with score */}
      <div className="bg-gradient-to-r from-red-50 to-yellow-50 rounded-lg p-6 border border-red-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🚩 Red Flags Detected</h2>
        <p className="text-gray-700 mb-4">
          Found {redFlags.length} issue{redFlags.length !== 1 ? 's' : ''} that need attention
        </p>
        
        {/* Severity breakdown */}
        <div className="flex gap-4 text-sm">
          {criticalCount > 0 && (
            <div className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="font-semibold text-red-700">{criticalCount} Critical</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold text-yellow-700">{warningCount} Warnings</span>
            </div>
          )}
          {infoCount > 0 && (
            <div className="flex items-center gap-1">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-700">{infoCount} Info</span>
            </div>
          )}
        </div>
      </div>

      {/* Critical issues first */}
      {criticalCount > 0 && (
        <div>
          <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Critical Issues
          </h3>
          {redFlags.filter((f) => f.severity === 'critical').map(renderFlag)}
        </div>
      )}

      {/* Warnings */}
      {warningCount > 0 && (
        <div>
          <h3 className="text-lg font-bold text-yellow-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Warnings
          </h3>
          {redFlags.filter((f) => f.severity === 'warning').map(renderFlag)}
        </div>
      )}

      {/* Info */}
      {infoCount > 0 && (
        <div>
          <h3 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Recommendations
          </h3>
          {redFlags.filter((f) => f.severity === 'info').map(renderFlag)}
        </div>
      )}

      {/* Category summary */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Issues by Category</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(flagsByCategory).map(([category, flags]) => {
            if (flags.length === 0) return null;
            const info = getCategoryInfo(category);
            return (
              <div key={category} className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${info.color}`}>
                  {info.emoji} {info.name}
                </span>
                <span className="text-gray-600">{flags.length}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
