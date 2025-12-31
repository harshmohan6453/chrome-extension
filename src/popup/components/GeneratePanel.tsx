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

  // === HIGHLY ENGINEERED 90%+ ACCURACY PROMPT ===
  const clonePrompt = `Create a pixel-perfect clone of this website with 90%+ accuracy:

## 📊 Page Metadata
- Title: ${c?.metadata?.title || data.meta.title}
- URL: ${c?.metadata?.url || data.meta.url}
- Viewport: ${c?.metadata?.viewport || 'responsive'}
- Favicon: ${c?.metadata?.favicon || 'none'}

## 🎨 Design System

### Colors (Top ${c?.colors?.length || data.colors.length})
${c?.colors?.map(col => `- ${col.color} (used ${col.count}x)`).join('\n') || data.colors.slice(0, 15).map(col => `- ${col.hex}`).join('\n')}

### Typography
${c?.fonts?.map(f => `- ${f.family} (weights: ${f.weights.join(', ')})`).join('\n') || data.fonts.map(f => `- ${f.family}`).join('\n')}

### Spacing Scale
${c?.spacing?.join(', ') || data.spacing.slice(0, 15).map(s => `${s}px`).join(', ')}

## 📐 Layout Architecture
- Type: ${c?.layoutType || 'Unknown'}
- Container Width: ${c?.containerWidth || 'auto'}
- Grid System: ${c?.gridSystem || 'custom'}

## 🏗️ Page Structure
${c?.structure || h?.sectionCount + ' sections detected'}

## 🧩 Components Detected
${c?.components || 'Standard web components'}

## 🎭 Animations & Transitions
${c?.animations || (data.scrollAnimations.length > 0 ? data.scrollAnimations.slice(0, 10).map(a => `- ${a.library}: ${a.element} (${a.animation.properties.join(', ')})`).join('\n') : 'No animations detected')}

## 🖼️ Images & Media
${c?.images?.slice(0, 20).map(img => `- ${img.alt} (${img.width}x${img.height}): ${img.src}`).join('\n') || data.assets.filter(a => a.type === 'image').slice(0, 15).map(a => `- Image: ${a.url}`).join('\n')}

${c?.backgroundImages && c.backgroundImages.length > 0 ? `### Background Images (${c.backgroundImages.length})\n${c.backgroundImages.join('\n')}` : ''}

${c?.videos && c.videos.length > 0 ? `### Videos\n${c.videos.join('\n')}` : ''}

${c?.svgs && c.svgs.length > 0 ? `### SVGs\n${c.svgs.map(s => `- ${s.desc}`).join('\n')}` : ''}

## 🔗 External Resources
### Font URLs
${c?.externalFonts?.join('\n') || 'Detect from page'}

### Stylesheets
${c?.externalCSS?.slice(0, 5).join('\n') || 'Inline or linked CSS'}

### Scripts
${c?.scripts?.slice(0, 5).join('\n') || 'Minimal JS'}

## 📱 Responsive Breakpoints
${c?.breakpoints || 'Standard mobile/tablet/desktop'}

## 🎯 Interactive Elements
${c?.interactive || 'Buttons, links, forms'}

## 📝 Form Elements
${c?.forms || 'No forms detected'}

## ⚡ JavaScript Features Needed
${c?.jsFeatures || 'Static page'}

## 🎪 Special Effects
- Shadows: ${c?.shadows?.slice(0, 3).join(', ') || 'none'}
- Blurs: ${c?.blurs?.join(', ') || 'none'}
- Transforms: ${c?.transforms || 'none'}
- Filters: ${c?.filters || 'none'}

## 💅 Critical CSS (Key Elements)
\`\`\`css
${c?.criticalCSS || '/* Run extraction to generate */'}
\`\`\`

## 🔍 Computed Styles (Key Elements)
\`\`\`css
${c?.computedStyles || '/* Run extraction to generate */'}
\`\`\`

## 📦 Complete HTML Structure
${h ? `**Stats**: ${h.elementCount} elements, ${h.sectionCount} sections, ${h.depth} levels deep` : ''}

\`\`\`html
${h?.cleanHTML || c?.html || '<!-- Run extraction to generate -->'}
\`\`\`

## 🎨 Full Extracted CSS
\`\`\`css
${c?.css || '/* Run extraction to generate */'}
\`\`\`

## 🔧 Implementation Notes
${c?.implementationNotes || '• Standard implementation'}

---

## ✅ Recreation Checklist:
1. ✅ Exact color palette and gradients
2. ✅ Precise typography (fonts, sizes, weights, line-heights)
3. ✅ Accurate spacing system (margins, paddings)
4. ✅ Layout structure (${c?.layoutType || 'Flexbox/Grid'} patterns)
5. ✅ All hover states and transitions
6. ✅ Responsive breakpoints and behavior
7. ✅ Image aspect ratios and positioning
8. ✅ Shadow and blur effects
9. ✅ Animations and transforms
10. ✅ Component hierarchy and relationships
11. ✅ Form styling and validation states
12. ✅ Interactive element feedback
13. ✅ Icon system (SVGs or icon fonts)
14. ✅ Loading states and micro-interactions

**Create production-ready code with semantic HTML, modern CSS, and accessible markup. Match the visual design to 90%+ accuracy.**
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
          <div className="bg-green-50 border border-green-200 rounded p-1.5 text-center">
            <div className="text-sm font-bold text-green-700">{h?.elementCount || '?'}</div>
            <div className="text-[10px] text-green-600">Elements</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-1.5 text-center">
            <div className="text-sm font-bold text-blue-700">{c?.colors?.length || data.colors.length}</div>
            <div className="text-[10px] text-blue-600">Colors</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded p-1.5 text-center">
            <div className="text-sm font-bold text-purple-700">{c?.fonts?.length || data.fonts.length}</div>
            <div className="text-[10px] text-purple-600">Fonts</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-1.5 text-center">
            <div className="text-sm font-bold text-orange-700">{data.scrollAnimations.length}</div>
            <div className="text-[10px] text-orange-600">Anims</div>
          </div>
          <div className="bg-pink-50 border border-pink-200 rounded p-1.5 text-center">
            <div className="text-sm font-bold text-pink-700">{c?.images?.length || data.assets.length}</div>
            <div className="text-[10px] text-pink-600">Assets</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {prompts.map((p) => (
          <div key={p.id} className={clsx("bg-card rounded-xl border p-3 transition-all hover:shadow-md", p.border)}>
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
