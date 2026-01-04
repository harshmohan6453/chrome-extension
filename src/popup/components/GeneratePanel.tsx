import { useState } from 'react';
import { useStore } from '../../store';
import { Copy, Check, Sparkles, FileCode, Zap, Palette } from 'lucide-react';
import { clsx } from 'clsx';

export const GeneratePanel = () => {
  const { data } = useStore();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const c = data.siteCloneData; // Clone data shorthand
  const h = data.htmlStructure; // HTML structure shorthand

  // === GOD-TIER SITE CLONE PROMPT - 99% ACCURACY ===
  const clonePrompt = `# 🎯 GOD-TIER Website Clone - 99% Pixel-Perfect Accuracy

You are a world-class frontend developer. Your mission: recreate this ENTIRE website with ABSOLUTE precision.

## 📊 Page Metadata
- **Title**: ${c?.metadata?.title || data.meta.title}
- **URL**: ${c?.metadata?.url || data.meta.url}
- **Viewport**: ${c?.metadata?.viewport || 'responsive'}
- **Favicon**: ${c?.metadata?.favicon || 'none'}
- **Charset**: ${c?.metadata?.charset || 'UTF-8'}

## 🎨 Design System

### Colors (${c?.colors?.length || data.colors.length} Detected with Frequency)
${c?.colors?.map(col => `- ${col.color} (used ${col.count}x)`).join('\n') || data.colors.slice(0, 20).map(col => `- ${col.hex}`).join('\n')}

### Typography
${c?.fonts?.map(f => `- ${f.family} (weights: ${f.weights.join(', ')})`).join('\n') || data.fonts.map(f => `- ${f.family}`).join('\n')}

### Spacing Scale
${c?.spacing?.join(', ') || data.spacing.slice(0, 20).map(s => `${s}px`).join(', ')}

## 📐 Layout Architecture
- **Type**: ${c?.layoutType || 'Modern CSS'}
- **Container Width**: ${c?.containerWidth || 'fluid'}
- **Grid System**: ${c?.gridSystem || 'custom'}

## 🏗️ Page Structure
${c?.structure || h?.sectionCount + ' semantic sections detected'}

## 🧩 Components Detected
${c?.components || 'Standard web components'}

## 🎭 Animations & Transitions
${c?.animations || (data.scrollAnimations.length > 0 ? data.scrollAnimations.slice(0, 15).map(a => `- ${a.library}: ${a.element} (${a.animation.properties.join(', ')})`).join('\n') : 'No animations detected')}

## 🖼️ Images & Media

### Images (${c?.images?.length || data.assets.filter(a => a.type === 'image').length})
${c?.images?.slice(0, 30).map(img => `- ${img.alt} (${img.width}x${img.height}): ${img.src}`).join('\n') || data.assets.filter(a => a.type === 'image').slice(0, 20).map(a => `- Image: ${a.url}`).join('\n')}

${c?.backgroundImages && c.backgroundImages.length > 0 ? `### Background Images (${c.backgroundImages.length})
${c.backgroundImages.join('\n')}
` : ''}

${c?.videos && c.videos.length > 0 ? `### Videos (${c.videos.length})
${c.videos.join('\n')}
` : ''}

${c?.svgs && c.svgs.length > 0 ? `### SVG Graphics (${c.svgs.length})
${c.svgs.map(s => `- ${s.desc}`).join('\n')}
` : ''}

## 🔗 External Resources

### Font URLs
${c?.externalFonts?.join('\n') || 'System fonts or Google Fonts'}

### Stylesheets
${c?.externalCSS?.slice(0, 8).join('\n') || 'Inline CSS'}

### Scripts
${c?.scripts?.slice(0, 8).join('\n') || 'Minimal JavaScript'}

## 📱 Responsive Breakpoints
\`\`\`css
${c?.breakpoints || 'Standard: 640px (sm), 768px (md), 1024px (lg), 1280px (xl), 1536px (2xl)'}
\`\`\`

## 🎯 Interactive Elements
${c?.interactive || 'Buttons, links, forms - standard interactions'}

## 📝 Form Elements
${c?.forms || 'No forms detected'}

## ⚡ JavaScript Features Required
${c?.jsFeatures || 'Static HTML/CSS - minimal JS'}

## 🎪 Special Effects & Advanced CSS

- **Shadows**: ${c?.shadows?.slice(0, 5).join(', ') || 'none'}
- **Blurs**: ${c?.blurs?.join(', ') || 'none'}
- **Transforms**: ${c?.transforms || 'none'}
- **Filters**: ${c?.filters || 'none'}

## 💅 Critical CSS (Key Elements)
\`\`\`css
${c?.criticalCSS || '/* Capture from page load */'}
\`\`\`

## 🔍 Computed Styles (Major Elements)
\`\`\`css
${c?.computedStyles || '/* Extract from browser DevTools */'}
\`\`\`

## 📦 Complete HTML Structure
${h ? `**Stats**: ${h.elementCount} elements, ${h.sectionCount} sections, ${h.depth} levels deep
` : ''}
\`\`\`html
${h?.cleanHTML || c?.html || '<!-- DOM structure goes here -->'}
\`\`\`

## 🎨 Full Extracted CSS
\`\`\`css
${c?.css || '/* All stylesheet rules */'}
\`\`\`

## 🔧 Implementation Notes
${c?.implementationNotes || '• Standard modern web implementation\n• Responsive design required\n• Cross-browser compatibility'}

---

## ✅ RECREATION REQUIREMENTS (99% Accuracy)

### CRITICAL - MUST MATCH EXACTLY:

1. ✅ **Exact Color Palette** - All ${c?.colors?.length || data.colors.length} colors with exact hex/rgb values
2. ✅ **Precise Typography** - All fonts (${c?.fonts?.length || data.fonts.length}), exact sizes, weights, line-heights, letter-spacing
3. ✅ **Accurate Spacing** - Exact spacing scale: ${c?.spacing?.slice(0, 10).join(', ') || data.spacing.slice(0, 10).map(s => `${s}px`).join(', ')}
4. ✅ **Layout Structure** - ${c?.layoutType || 'Flexbox/Grid'} patterns matching computed styles
5. ✅ **Pseudo-elements** - Include all ::before and ::after decorative elements
6. ✅ **Interactive States** - Exact :hover, :focus, :active, :disabled styles
7. ✅ **Responsive Breakpoints** - All media queries with exact behavior
8. ✅ **Animations** - ${data.scrollAnimations.length} scroll animations, ${c?.animations ? 'keyframes,' : ''} transitions
9. ✅ **Images & Assets** - ${c?.images?.length || data.assets.length} images, ${c?.svgs?.length || 0} SVGs, ${c?.backgroundImages?.length || 0} backgrounds
10. ✅ **Shadow & Blur Effects** - Exact box-shadow, text-shadow, filter values
11. ✅ **Transform Effects** - All translate, rotate, scale, skew values
12. ✅ **Component Hierarchy** - ${c?.components || 'Navigation, Hero, Sections, Footer'} relationships
13. ✅ **Form Styling** - Input states, validation, custom controls
14. ✅ **Z-index & Stacking** - Proper layering and stacking contexts
15. ✅ **CSS Variables** - Detect and use all custom properties (--variable-name)
16. ✅ **Modern CSS Features** - clamp(), calc(), min(), max(), aspect-ratio, container queries
17. ✅ **Accessibility** - ARIA labels, keyboard navigation, focus states
18. ✅ **Performance** - Lazy loading (${c?.implementationNotes?.includes('lazy') ? 'detected' : 'implement if needed'})

### ADVANCED REQUIREMENTS:

**Pseudo-elements**: Scan CSS for all \`::before\` and \`::after\` rules - these are CRITICAL for icons, decorative elements, and separators.

**Interactive States**: Extract all \`:hover\`, \`:focus\`, \`:active\` rules from stylesheets. Match exact transition durations and easing functions.

**CSS Variables**: Detect usage of \`var(--custom-property)\` and create matching CSS custom properties in your implementation.

**Grid & Flexbox**: Match exact \`grid-template-columns\`, \`grid-gap\`, \`justify-content\`, \`align-items\` values from computed styles.

**Responsive Behavior**: Test at ALL breakpoints. Elements must reflow/resize/hide/show exactly as original.

**Scroll Animations**: 
${data.scrollAnimations.length > 0 ? data.scrollAnimations.slice(0, 10).map((a, i) => `${i + 1}. ${a.library} on \`${a.element}\`: ${a.animation.properties.join(', ')} (${a.trigger.start} → ${a.trigger.end})`).join('\n') : 'No scroll animations'}

## 🎯 IMPLEMENTATION INSTRUCTIONS:

1. **Start with exact HTML structure** - Copy the semantic markup preserving all IDs, classes, ARIA attributes
2. **Apply CSS methodically**:
   - Start with CSS reset/normalize
   - Add all CSS variables
   - Import exact fonts
   - Apply global styles (body, html)
   - Style each component matching all properties
   - Add pseudo-elements (::before, ::after)
   - Implement interactive states (:hover, :focus, :active)
   - Add animations and transitions
   - Implement media queries for responsiveness
3. **Handle Assets**:
   - ${c?.images?.length || 0} images: Use exact dimensions, object-fit, aspect ratios
   - ${c?.backgroundImages?.length || 0} backgrounds: Match position, size, repeat
   - ${c?.svgs?.length || 0} SVGs: Inline or external, match viewBox and paths
4. **Test Thoroughly**:
   - Side-by-side comparison with original
   - All hover/focus states working
   - Responsive at 320px, 375px, 768px, 1024px, 1920px
   - Scroll animations triggering correctly
   - Form validation and interactions
   - Cross-browser (Chrome, Firefox, Safari, Edge)

## 🚀 EXPECTED OUTPUT:

Production-ready code using:
- **Semantic HTML5** with proper structure
- **Modern CSS** (Flexbox, Grid, Custom Properties)
- **Tailwind CSS** (optional, or vanilla CSS)
- **Vanilla JavaScript** or framework of choice (React, Vue, Svelte)
- **Accessibility best practices** (WCAG 2.1 AA minimum)
- **Performance optimizations** (lazy loading, code splitting, minification)

**Target**: 99% visual fidelity when compared side-by-side with the original.

---

*This extraction captures ${h?.elementCount || 'thousands of'} HTML elements, ${c?.colors?.length || data.colors.length} colors, ${c?.fonts?.length || data.fonts.length} fonts, ${data.scrollAnimations.length} animations, ${c?.images?.length || data.assets.length} assets, and all computed styles for pixel-perfect recreation.*
`.trim();

  // Quick copy options
  const htmlOnly = `## HTML from ${data.meta.title}\n\`\`\`html\n${h?.cleanHTML || c?.html?.slice(0, 100000) || '<!-- Not available -->'}\n\`\`\``;
  const cssOnly = `## CSS from ${data.meta.title}\n\`\`\`css\n${c?.css || '/* Not available */'}\n\`\`\``;
  const designTokens = `## Design Tokens from ${data.meta.title}

### Colors
${c?.colors?.map(col => `${col.color}`).join('\n') || data.colors.slice(0, 20).map(col => col.hex).join('\n')}

### Fonts
${c?.fonts?.map(f => `${f.family}: ${f.weights.join(', ')}`).join('\n') || data.fonts.map(f => f.family).join('\n')}

### Spacing
${c?.spacing?.join(', ') || data.spacing.map(s => `${s}px`).join(', ')}
`;

  const prompts = [
    {
      id: 'clone',
      icon: FileCode,
      title: "Full Site Clone Prompt",
      subtitle: "Complete 90%+ accuracy spec (Claude/GPT-4/Gemini)",
      content: clonePrompt,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20"
    },
    {
      id: 'html',
      icon: Zap,
      title: "HTML Structure Only",
      subtitle: "Complete semantic HTML skeleton",
      content: htmlOnly,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      id: 'css',
      icon: Palette,
      title: "Full CSS Only",
      subtitle: "All extracted stylesheets",
      content: cssOnly,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      id: 'tokens',
      icon: Sparkles,
      title: "Design Tokens",
      subtitle: "Colors, fonts, spacing quick copy",
      content: designTokens,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20"
    }
  ];

  return (
    <div className="space-y-5 pb-20">
      <div>
        <h2 className="text-xl font-black tracking-tight mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          Site Cloner Pro
        </h2>
        <p className="text-muted-foreground text-xs">
          Comprehensive extraction for 90%+ accuracy cloning
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-5 gap-1.5 mt-3">
          <div className="bg-card border-2 border-foreground/20 rounded-lg p-1.5 text-center neo-shadow">
            <div className="text-sm font-bold text-foreground">{h?.elementCount || '?'}</div>
            <div className="text-[10px] text-muted-foreground">Elements</div>
          </div>
          <div className="bg-card border-2 border-foreground/20 rounded-lg p-1.5 text-center neo-shadow">
            <div className="text-sm font-bold text-foreground">{c?.colors?.length || data.colors.length}</div>
            <div className="text-[10px] text-muted-foreground">Colors</div>
          </div>
          <div className="bg-card border-2 border-foreground/20 rounded-lg p-1.5 text-center neo-shadow">
            <div className="text-sm font-bold text-foreground">{c?.fonts?.length || data.fonts.length}</div>
            <div className="text-[10px] text-muted-foreground">Fonts</div>
          </div>
          <div className="bg-card border-2 border-foreground/20 rounded-lg p-1.5 text-center neo-shadow">
            <div className="text-sm font-bold text-foreground">{data.scrollAnimations.length}</div>
            <div className="text-[10px] text-muted-foreground">Anims</div>
          </div>
          <div className="bg-card border-2 border-foreground/20 rounded-lg p-1.5 text-center neo-shadow">
            <div className="text-sm font-bold text-foreground">{c?.images?.length || data.assets.length}</div>
            <div className="text-[10px] text-muted-foreground">Assets</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {prompts.map((p) => (
          <div key={p.id} className={clsx("bg-card rounded-lg border-2 border-foreground/20 p-3 transition-all hover:border-primary neo-shadow")}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={clsx("p-2 rounded-lg", p.bg)}>
                  <p.icon className={clsx("w-4 h-4", p.color)} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{p.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{p.subtitle}</p>
                </div>
              </div>
              <button 
                onClick={() => copyToClipboard(p.content, p.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors text-xs font-bold"
              >
                {copied === p.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === p.id ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="bg-secondary/50 rounded-lg p-2 font-mono text-[10px] overflow-x-auto border border-border/50 max-h-32 overflow-y-auto">
              <code className="text-foreground/80 block whitespace-pre-wrap leading-relaxed">
                {p.content.slice(0, 800)}{p.content.length > 800 ? '\n... [Copy for full prompt]' : ''}
              </code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
