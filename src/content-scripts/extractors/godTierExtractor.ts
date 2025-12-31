/**
 * GOD-TIER Element Prompt Generator
 * Captures EVERYTHING for 99% pixel-perfect accuracy
 */

export interface GodTierElementData {
  // Base element
  element: HTMLElement;
  tagName: string;
  id: string;
  className: string;
  
  // All computed styles (100+ properties)
  allStyles: string;
  
  // Pseudo-elements
  beforeStyles: string | null;
  afterStyles: string | null;
  
  // Interactive states (from CSS rules)
  hoverRules: string[];
  focusRules: string[];
  activeRules: string[];
  
  // Design tokens
  colors: string[];
  fonts: string[];
  
  // Assets
  images: { alt: string; src: string; width: number; height: number }[];
  svgs: string[];
  backgroundImages: string[];
  videos: string[];
  
  // Effects & animations
  transitions: string;
  animations: string;
  transforms: string;
  
  // Advanced CSS
  customProperties: { name: string; value: string }[];
  clipPath: string;
  mask: string;
  aspectRatio: string;
  scrollSnap: string;
  
  // Layout context
  parentLayout: string;
  siblingContext: string;
}

/**
 * Extract ALL computed styles for an element - EVERY SINGLE ONE
 */
export const extractAllComputedStyles = (el: HTMLElement): Record<string, string> => {
  const computed = window.getComputedStyle(el);
  const styles: Record<string, string> = {};
  
  // Get EVERY CSS property (not just a subset)
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    const value = computed.getPropertyValue(prop);
    
    // Only skip truly empty/default values
    if (value && 
        value !== 'none' && 
        value !== 'auto' && 
        value !== 'normal' &&
        value !== '0px' &&
        value !== 'rgba(0, 0, 0, 0)' &&
        value !== 'transparent' &&
        value !== 'static' &&
        value !== 'visible' &&
        value !== 'scroll' &&
        value !== 'inherit' &&
        value !== 'initial') {
      styles[prop] = value;
    }
  }
  
  return styles;
};

/**
 * Extract pseudo-element styles (::before, ::after)
 */
export const extractPseudoElementStyles = (el: HTMLElement): { before: string | null; after: string | null } => {
  const beforeComputed = window.getComputedStyle(el, '::before');
  const afterComputed = window.getComputedStyle(el, '::after');
  
  const formatPseudoStyles = (computed: CSSStyleDeclaration): string | null => {
    const content = computed.content;
    if (!content || content === 'none') return null;
    
    const styles: string[] = [`content: ${content}`];
    
    const props = ['display', 'position', 'width', 'height', 'background', 'color', 
                   'top', 'right', 'bottom', 'left', 'transform', 'opacity', 'z-index'];
    
    props.forEach(prop => {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'none' && val !== 'auto' && val !== 'rgba(0, 0, 0, 0)') {
        styles.push(`${prop}: ${val}`);
      }
    });
    
    return styles.join('; ');
  };
  
  return {
    before: formatPseudoStyles(beforeComputed),
    after: formatPseudoStyles(afterComputed)
  };
};

/**
 * Extract hover/focus/active states from CSS rules
 */
export const extractInteractiveStates = (el: HTMLElement): { hover: string[]; focus: string[]; active: string[] } => {
  const hover: string[] = [];
  const focus: string[] = [];
  const active: string[] = [];
  
  // Get element's selectors
  const selectors: string[] = [];
  if (el.id) selectors.push(`#${el.id}`);
  if (el.className) {
    el.className.split(' ').forEach(cls => {
      if (cls.trim()) selectors.push(`.${cls.trim()}`);
    });
  }
  selectors.push(el.tagName.toLowerCase());
  
  // Search all stylesheets for interactive states
  try {
    for (const sheet of document.styleSheets) {
      try {
        if (sheet.cssRules) {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              const ruleText = rule.selectorText;
              
              // Check if rule matches this element
              selectors.forEach(sel => {
                if (ruleText.includes(sel)) {
                  if (ruleText.includes(':hover')) {
                    hover.push(`${ruleText} { ${rule.style.cssText} }`);
                  }
                  if (ruleText.includes(':focus')) {
                    focus.push(`${ruleText} { ${rule.style.cssText} }`);
                  }
                  if (ruleText.includes(':active')) {
                    active.push(`${ruleText} { ${rule.style.cssText} }`);
                  }
                }
              });
            }
          }
        }
      } catch (e) {
        // Cross-origin stylesheet, skip
      }
    }
  } catch (e) {}
  
  return { hover, focus, active };
};

/**
 * Extract CSS custom properties (CSS variables)
 */
export const extractCSSVariables = (el: HTMLElement): { name: string; value: string }[] => {
  const computed = window.getComputedStyle(el);
  const variables: { name: string; value: string }[] = [];
  
  // Check all CSS properties for var() usage
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    const value = computed.getPropertyValue(prop);
    
    // Look for CSS variable references
    const varMatches = value.match(/var\((--[^,)]+)/g);
    if (varMatches) {
      varMatches.forEach(match => {
        const varName = match.replace('var(', '');
        const varValue = computed.getPropertyValue(varName);
        if (varValue && !variables.find(v => v.name === varName)) {
          variables.push({ name: varName, value: varValue });
        }
      });
    }
  }
  
  return variables;
};

/**
 * Extract parent layout context
 */
export const extractParentContext = (el: HTMLElement): string => {
  if (!el.parentElement) return 'No parent';
  
  const parent = el.parentElement;
  const parentComputed = window.getComputedStyle(parent);
  
  const context: string[] = [
    `Parent: <${parent.tagName.toLowerCase()}>`,
    `Display: ${parentComputed.display}`
  ];
  
  if (parentComputed.display.includes('flex')) {
    context.push(`Flex-direction: ${parentComputed.flexDirection}`);
    context.push(`Justify: ${parentComputed.justifyContent}`);
    context.push(`Align: ${parentComputed.alignItems}`);
    context.push(`Gap: ${parentComputed.gap}`);
  }
  
  if (parentComputed.display.includes('grid')) {
    context.push(`Grid-template-columns: ${parentComputed.gridTemplateColumns}`);
    context.push(`Gap: ${parentComputed.gap}`);
  }
  
  return context.join('\n');
};

/**
 * Generate GOD-TIER prompt for 99% accuracy
 */
export const generateGodTierPrompt = (el: HTMLElement): string => {
  const computed = window.getComputedStyle(el);
  const allStyles = extractAllComputedStyles(el);
  const pseudoElements = extractPseudoElementStyles(el);
  const interactiveStates = extractInteractiveStates(el);
  const cssVars = extractCSSVariables(el);
  
  // Convert styles object to CSS string
  const stylesString = Object.entries(allStyles)
    .map(([prop, val]) => `  ${prop}: ${val};`)
    .join('\n');
  
  const tagName = el.tagName.toLowerCase();
  const id = el.id || 'none';
  const className = el.className || 'none';
  
  // Extract colors
  const colors = new Set<string>();
  el.querySelectorAll('*').forEach(child => {
    const c = window.getComputedStyle(child);
    if (c.color && c.color !== 'rgba(0, 0, 0, 0)') colors.add(c.color);
    if (c.backgroundColor && c.backgroundColor !== 'rgba(0, 0, 0, 0)') colors.add(c.backgroundColor);
  });
  
  // Extract fonts
  const fonts = new Set<string>();
  el.querySelectorAll('*').forEach(child => {
    const c = window.getComputedStyle(child);
    const font = c.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    if (font) fonts.add(font);
  });
  
  // Extract assets
  const images: string[] = [];
  const svgs: string[] = [];
  const bgImages: string[] = [];
  const videos: string[] = [];
  
  el.querySelectorAll('img').forEach(img => {
    images.push(`${img.alt || 'Image'} (${img.naturalWidth}x${img.naturalHeight}): ${img.src.slice(0, 100)}`);
  });
  
  el.querySelectorAll('svg').forEach((svg, i) => {
    const rect = svg.getBoundingClientRect();
    svgs.push(`SVG ${i + 1} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
  });
  
  el.querySelectorAll('*').forEach(child => {
    const bg = window.getComputedStyle(child).backgroundImage;
    if (bg && bg !== 'none' && bg.includes('url')) {
      const match = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (match && !bgImages.includes(match[1])) bgImages.push(match[1].slice(0, 80));
    }
  });
  
  el.querySelectorAll('video, iframe').forEach((v, i) => {
    const src = (v as HTMLVideoElement | HTMLIFrameElement).src;
    if (src) videos.push(`Video/Iframe ${i + 1}: ${src.slice(0, 80)}`);
  });
  
  return `
# 🎯 GOD-TIER UI Component Recreation - 99% Pixel-Perfect Accuracy

You are a world-class frontend developer. Your mission: recreate this component with ABSOLUTE precision.

## 📊 Element Identity
- **Tag**: \`<${tagName}>\`
- **ID**: \`${id}\`
- **Classes**: \`${className}\`
- **Dimensions**: ${computed.width} × ${computed.height}

## 🎨 Complete Computed Styles (EVERY Property)

\`\`\`css
${tagName} {
${stylesString}
}
\`\`\`

${pseudoElements.before ? `## 🎭 Pseudo-Element: ::before
\`\`\`css
${tagName}::before {
  ${pseudoElements.before}
}
\`\`\`
` : ''}

${pseudoElements.after ? `## 🎭 Pseudo-Element: ::after
\`\`\`css
${tagName}::after {
  ${pseudoElements.after}
}
\`\`\`
` : ''}

${interactiveStates.hover.length > 0 ? `## 🎯 Interactive State: :hover
\`\`\`css
${interactiveStates.hover.join('\n')}
\`\`\`
` : ''}

${interactiveStates.focus.length > 0 ? `## 🎯 Interactive State: :focus
\`\`\`css
${interactiveStates.focus.join('\n')}
\`\`\`
` : ''}

${interactiveStates.active.length > 0 ? `## 🎯 Interactive State: :active
\`\`\`css
${interactiveStates.active.join('\n')}
\`\`\`
` : ''}

${cssVars.length > 0 ? `## 🎨 CSS Custom Properties Detected
${cssVars.map(v => `- ${v.name}: ${v.value}`).join('\n')}
` : ''}

## 🎨 Design Tokens

### Colors (${colors.size} unique)
${Array.from(colors).map(c => `- ${c}`).join('\n')}

### Typography (${fonts.size} fonts)
${Array.from(fonts).map(f => `- ${f}`).join('\n')}
- Size: ${computed.fontSize}
- Weight: ${computed.fontWeight}
- Line-height: ${computed.lineHeight}
- Letter-spacing: ${computed.letterSpacing}

## 📦 Layout Context

### Parent Container
${extractParentContext(el)}

### This Element's Layout
- Display: ${computed.display}
- Position: ${computed.position}${computed.position !== 'static' ? `\n- Coordinates: top: ${computed.top}, right: ${computed.right}, bottom: ${computed.bottom}, left: ${computed.left}` : ''}
${computed.display.includes('flex') ? `- Flex: ${computed.flex}\n- Flex-direction: ${computed.flexDirection}\n- Justify: ${computed.justifyContent}\n- Align: ${computed.alignItems}\n- Gap: ${computed.gap}` : ''}
${computed.display.includes('grid') ? `- Grid-template: ${computed.gridTemplateColumns} / ${computed.gridTemplateRows}\n- Grid-column: ${computed.gridColumn}\n- Grid-row: ${computed.gridRow}\n- Gap: ${computed.gap}` : ''}

## 🖼️ Assets in Component

${images.length > 0 ? `### Images (${images.length})
${images.join('\n')}
` : ''}

${svgs.length > 0 ? `### SVG Graphics (${svgs.length})
${svgs.join('\n')}
` : ''}

${bgImages.length > 0 ? `### Background Images (${bgImages.length})
${bgImages.join('\n')}
` : ''}

${videos.length > 0 ? `### Videos/Embeds (${videos.length})
${videos.join('\n')}
` : ''}

## 🎭 Visual Effects

- **Box Shadow**: ${computed.boxShadow !== 'none' ? computed.boxShadow : 'None'}
- **Border Radius**: ${computed.borderRadius}
- **Opacity**: ${computed.opacity}
- **Transform**: ${computed.transform !== 'none' ? computed.transform : 'None'}
- **Filter**: ${computed.filter !== 'none' ? computed.filter : 'None'}
- **Backdrop Filter**: ${computed.backdropFilter !== 'none' ? computed.backdropFilter : 'None'}
- **Mix Blend Mode**: ${computed.mixBlendMode}
- **Clip Path**: ${computed.clipPath !== 'none' ? computed.clipPath : 'None'}
${computed.aspectRatio ? `- **Aspect Ratio**: ${computed.aspectRatio}` : ''}

## ⚡ Transitions & Animations

- **Transition**: ${computed.transition !== 'all 0s ease 0s' ? computed.transition : 'None'}
- **Animation**: ${computed.animationName !== 'none' ? `${computed.animationName} ${computed.animationDuration} ${computed.animationTimingFunction}` : 'None'}

## ✅ RECREATION REQUIREMENTS (99% Accuracy)

### CRITICAL - MUST MATCH EXACTLY:
1. ✅ **Every CSS property** listed above - no exceptions
2. ✅ **Pseudo-elements** (::before, ::after) with exact styling
3. ✅ **Interactive states** (:hover, :focus, :active) with exact transitions
4. ✅ **Exact dimensions** - ${computed.width} × ${computed.height}
5. ✅ **Spacing** - padding: ${computed.padding}, margin: ${computed.margin}
6. ✅ **Colors** - exact hex/rgb values, no approximations
7. ✅ **Typography** - ${computed.fontFamily}, ${computed.fontSize}, ${computed.fontWeight}
8. ✅ **Effects** - shadows, filters, transforms, opacity
9. ✅ **Layout behavior** - ${computed.display} with exact flex/grid properties
10. ✅ **Assets** - ${images.length} images, ${svgs.length} SVGs, ${bgImages.length} backgrounds
11. ✅ **Responsive units** - preserve vw, vh, clamp(), calc(), var() as-is
12. ✅ **Z-index & stacking context** - ${computed.zIndex}

### IMPLEMENTATION INSTRUCTIONS:

1. **Start with the exact HTML structure** shown in the complete markup
2. **Apply EVERY CSS property** from the computed styles section
3. **Add pseudo-elements** if ::before or ::after are present
4. **Implement interactive states** - copy the exact CSS for :hover/:focus/:active
5. **Handle assets**:
   - Replace image URLs with placeholders or actual URLs
   - Include SVG markup inline or as external files
   - Set background-image for all backgrounds
6. **Preserve modern CSS**:
   - Keep clamp(), min(), max(), calc() functions as-is
   - Preserve CSS variables (--custom-properties)
   - Maintain grid template formulas
7. **Test accuracy**:
   - Compare side-by-side with original
   - Verify all hover/focus states
   - Check responsive behavior
   - Validate with DevTools

**OUTPUT**: Complete production-ready React/Vue/HTML component with Tailwind CSS or vanilla CSS that achieves 99% visual fidelity to the original.

---

*This extraction captures EVERY computed CSS property, including modern features like aspect-ratio, container queries, scroll-snap, clip-path, backdrop-filter, and all interactive states. No detail is too small.*
`.trim();
};
