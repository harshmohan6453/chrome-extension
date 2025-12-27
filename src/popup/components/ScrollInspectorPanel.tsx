import { useState } from 'react';
import { useStore, ScrollAnimationData } from '../../store';
import { ChevronDown, ChevronUp, Eye, Code } from 'lucide-react';

const ScrollInspectorPanel = () => {
  const scrollAnimations = useStore(state => state.data.scrollAnimations);
  const [selectedLibrary, setSelectedLibrary] = useState<string>('all');
  const [expandedAnimations, setExpandedAnimations] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Get unique libraries
  const libraries = Array.from(new Set(scrollAnimations.map(anim => anim.library)));
  
  // Filter animations by library
  const filteredAnimations = selectedLibrary === 'all' 
    ? scrollAnimations 
    : scrollAnimations.filter(anim => anim.library === selectedLibrary);

  // Library display names and icons
  const getLibraryInfo = (library: string) => {
    const info: { [key: string]: { name: string; color: string; emoji: string } } = {
      'gsap-scrolltrigger': { name: 'GSAP ScrollTrigger', color: 'bg-green-100 text-green-800', emoji: '⚡' },
      'framer-motion': { name: 'Framer Motion', color: 'bg-purple-100 text-purple-800', emoji: '🎬' },
      'locomotive': { name: 'Locomotive Scroll', color: 'bg-blue-100 text-blue-800', emoji: '🚂' },
      'aos': { name: 'AOS', color: 'bg-orange-100 text-orange-800', emoji: '✨' },
      'scrollmagic': { name: 'ScrollMagic', color: 'bg-pink-100 text-pink-800', emoji: '🎪' },
      'intersection-observer': { name: 'Intersection Observer', color: 'bg-indigo-100 text-indigo-800', emoji: '👁️' },
      'css-scroll-timeline': { name: 'CSS Scroll Timeline', color: 'bg-teal-100 text-teal-800', emoji: '🎨' },
      'custom': { name: 'Custom', color: 'bg-gray-100 text-gray-800', emoji: '🔧' },
    };
    return info[library] || { name: library, color: 'bg-gray-100 text-gray-800', emoji: '📜' };
  };

  // Toggle animation expansion
  const toggleAnimation = (id: string) => {
    const newExpanded = new Set(expandedAnimations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAnimations(newExpanded);
  };

  // Copy animation code
  const copyAnimationCode = (animation: ScrollAnimationData) => {
    let code = '';
    
    switch (animation.library) {
      case 'gsap-scrolltrigger':
        code = `gsap.to("${animation.element}", {
  scrollTrigger: {
    trigger: "${animation.trigger.element}",
    start: "${animation.trigger.start}",
    end: "${animation.trigger.end}",
    scrub: ${animation.trigger.scrub},
    pin: ${animation.trigger.pin || false},
    markers: ${animation.markers || false}
  },
  ${animation.animation.properties.map(p => `${p}: /* value */`).join(',\n  ')},
  duration: ${animation.animation.duration || 1},
  ease: "${animation.animation.easing}"
});`;
        break;
        
      case 'framer-motion':
        code = `<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ 
    once: ${animation.trigger.once || false},
    margin: "${animation.trigger.start}"
  }}
  transition={{
    duration: ${animation.animation.duration || 0.5},
    ease: "${animation.animation.easing}"
  }}
/>`;
        break;
        
      case 'locomotive':
        code = `<div 
  data-scroll
  data-scroll-speed="${animation.animation.speed || 0}"
  ${animation.animation.delay ? `data-scroll-delay="${animation.animation.delay}"` : ''}
  ${animation.className ? `data-scroll-class="${animation.className}"` : ''}
  ${animation.trigger.repeat ? 'data-scroll-repeat="true"' : ''}
>
  <!-- Content -->
</div>`;
        break;
        
      case 'aos':
        code = `<div 
  data-aos="${animation.animationName || 'fade'}"
  data-aos-duration="${animation.animation.duration || 400}"
  data-aos-easing="${animation.animation.easing}"
  data-aos-delay="${animation.animation.delay || 0}"
  ${animation.trigger.once ? 'data-aos-once="true"' : ''}
>
  <!-- Content -->
</div>`;
        break;
        
      case 'intersection-observer':
        code = `const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('${animation.animation.properties.join("', '")}');
    }
  });
}, {
  threshold: ${animation.trigger.threshold || 0.1}
});

observer.observe(document.querySelector('${animation.element}'));`;
        break;
        
      default:
        code = `// ${animation.library} animation
// Element: ${animation.element}
// Properties: ${animation.animation.properties.join(', ')}`;
    }
    
    navigator.clipboard.writeText(code);
    setCopiedId(animation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Highlight element on page
  const highlightElement = (selector: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'HIGHLIGHT_ELEMENT',
          selector
        });
      }
    });
  };

  // Control animation (restart, play, setProgress)
  const controlAnimation = (animationId: string, action: string, value?: number) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'CONTROL_ANIMATION',
          animationId,
          animationAction: action,
          value
        });
      }
    });
  };

  if (scrollAnimations.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">📜</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Scroll Animations Detected
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          This page doesn't appear to use any scroll-based animations, or they may not be detectable.
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p className="font-semibold mb-2">Supported Libraries:</p>
          <ul className="space-y-1">
            <li>⚡ GSAP ScrollTrigger</li>
            <li>🎬 Framer Motion</li>
            <li>🚂 Locomotive Scroll</li>
            <li>✨ AOS (Animate On Scroll)</li>
            <li>👁️ Intersection Observer</li>
            <li>🎨 CSS Scroll Timeline</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Scroll Animations</h2>
          <p className="text-sm text-gray-600">
            {scrollAnimations.length} animation{scrollAnimations.length !== 1 ? 's' : ''} detected
          </p>
        </div>
      </div>

      {/* Badge Glossary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
        <p className="font-semibold text-blue-900 mb-1.5">Badge Meanings:</p>
        <div className="space-y-1 text-blue-800">
          <div className="flex items-start gap-2">
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium whitespace-nowrap">Scrubbed</span>
            <span>Animation is linked to scroll position - scrub through it by scrolling</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-medium whitespace-nowrap">Pinned</span>
            <span>Element stays fixed in place during the animation</span>
          </div>
        </div>
      </div>

      {/* Library Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLibrary('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedLibrary === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({scrollAnimations.length})
        </button>
        {libraries.map((lib) => {
          const info = getLibraryInfo(lib);
          const count = scrollAnimations.filter(a => a.library === lib).length;
          return (
            <button
              key={lib}
              onClick={() => setSelectedLibrary(lib)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedLibrary === lib
                  ? info.color
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {info.emoji} {info.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Timeline Visualization */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">Scroll Timeline</span>
          <span className="text-xs text-gray-500">{filteredAnimations.length} triggers</span>
        </div>
        <div className="relative h-8 bg-white rounded-lg overflow-hidden border border-gray-200">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
          </div>
          {/* Color-coded timeline markers - show all animations */}
          {filteredAnimations.map((anim, idx) => {
            const libraryInfo = getLibraryInfo(anim.library);
            // Distribute evenly across timeline
            const position = filteredAnimations.length > 1 
              ? (idx / (filteredAnimations.length - 1)) * 100 
              : 50;
            
            // Library-specific colors
            const colorMap: { [key: string]: string } = {
              'gsap-scrolltrigger': '#10b981', // green
              'framer-motion': '#a855f7',      // purple
              'locomotive': '#3b82f6',         // blue
              'aos': '#f97316',                // orange
              'scrollmagic': '#ec4899',        // pink
              'intersection-observer': '#6366f1', // indigo
              'css-scroll-timeline': '#14b8a6', // teal
            };
            
            return (
              <div
                key={anim.id}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-150 cursor-pointer"
                style={{ 
                  left: `${position}%`,
                  backgroundColor: colorMap[anim.library] || '#6b7280'
                }}
                title={`${libraryInfo.emoji} ${libraryInfo.name} - ${anim.element}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>Top of page</span>
          <span>Bottom of page</span>
        </div>
      </div>

      {/* Animation List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAnimations.map((animation) => {
          const isExpanded = expandedAnimations.has(animation.id);
          const libraryInfo = getLibraryInfo(animation.library);
          
          return (
            <div
              key={animation.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
            >
              {/* Animation Header */}
              <div
                className="p-3 cursor-pointer flex items-center justify-between"
                onClick={() => toggleAnimation(animation.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${libraryInfo.color}`}>
                      {libraryInfo.emoji} {libraryInfo.name}
                    </span>
                    {animation.trigger.scrub && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        Scrubbed
                      </span>
                    )}
                    {animation.trigger.pin && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-700">
                        Pinned
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-gray-700 font-semibold">{animation.element}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Animates: {animation.animation.properties.join(', ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Trigger: {animation.trigger.start} → {animation.trigger.end}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-100 bg-gray-50">
                  {/* Trigger Info */}
                  <div className="pt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Trigger Configuration</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start:</span>
                        <span className="font-mono text-gray-900">{animation.trigger.start}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">End:</span>
                        <span className="font-mono text-gray-900">{animation.trigger.end}</span>
                      </div>
                      {animation.trigger.scrub !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Scrub:</span>
                          <span className="font-mono text-gray-900">{String(animation.trigger.scrub)}</span>
                        </div>
                      )}
                      {animation.trigger.pin && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pin:</span>
                          <span className="font-mono text-green-600">true</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Animation Info */}
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Animation Properties</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-mono text-gray-900">{animation.animation.type}</span>
                      </div>
                      {animation.animation.duration !== null && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-mono text-gray-900">{animation.animation.duration}ms</span>
                        </div>
                      )}
                      {animation.animation.easing && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Easing:</span>
                          <span className="font-mono text-gray-900">{animation.animation.easing}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Slider */}
                  <div className="pt-3 pb-2 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">Animation Progress</span>
                      <span className="text-xs text-gray-500">Drag to scrub</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="0"
                      onChange={(e) => {
                        const progress = parseInt(e.target.value) / 100;
                        controlAnimation(animation.id, 'setProgress', progress);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        accentColor: '#9333ea'
                      }}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-400">0%</span>
                      <span className="text-xs text-gray-400">100%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        controlAnimation(animation.id, 'restart');
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-medium transition-colors"
                      title="Restart animation from beginning"
                    >
                      � Replay
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        highlightElement(animation.element);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-medium transition-colors"
                      title="Scroll to and highlight element on page"
                    >
                      <Eye className="w-3 h-3" />
                      Show
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAnimationCode(animation);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-medium transition-colors"
                      title="Copy code to clipboard"
                    >
                      {copiedId === animation.id ? (
                        <>✓ Copied</>
                      ) : (
                        <>
                          <Code className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="pt-3 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-lg font-bold text-blue-700">{scrollAnimations.length}</div>
            <div className="text-xs text-blue-600">Total</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-2">
            <div className="text-lg font-bold text-purple-700">{libraries.length}</div>
            <div className="text-xs text-purple-600">Libraries</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-lg font-bold text-green-700">
              {scrollAnimations.filter(a => a.trigger.scrub).length}
            </div>
            <div className="text-xs text-green-600">Scrubbed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollInspectorPanel;
