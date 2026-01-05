// HTML escape function to prevent XSS/injection
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export var Inspector = class {
  private overlay: HTMLElement;
  private selectionOverlay: HTMLElement; // New: separate overlay for selected element
  private isActive: boolean = false;
  private hoveredElement: HTMLElement | null = null;
  private selectedElement: HTMLElement | null = null;
  private tooltip: HTMLElement;
  private detailCard: HTMLElement;
  private guides: HTMLElement;
  private highlightColor: string = '#3b82f6'; // Default blue for hover
  private selectionColor: string = '#10b981'; // Computed complementary color
  private sidebarMode: boolean = false; // When true, send data to sidebar instead of showing card

  constructor() {
    // Get the saved highlight color
    this.highlightColor = localStorage.getItem('di-highlightColor') || '#3b82f6';

    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: '999999',
      border: `2px solid ${this.highlightColor}`,
      backgroundColor: this.hexToRgba(this.highlightColor, 0.1),
      transition: 'all 0.1s ease',
      display: 'none',
    });
    this.overlay.id = 'di-overlay';
    this.cleanupOldElement('di-overlay');

    // Selection overlay - auto-contrast color, visible on any background
    this.selectionOverlay = document.createElement('div');
    this.updateSelectionColor(); // Compute initial selection color
    Object.assign(this.selectionOverlay.style, {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: '999998',
      transition: 'all 0.15s ease',
      display: 'none',
    });
    this.selectionOverlay.id = 'di-selection-overlay';
    this.cleanupOldElement('di-selection-overlay');
    this.applySelectionOverlayStyles();
    
    this.tooltip = document.createElement('div');
    this.tooltip = document.createElement('div');
    Object.assign(this.tooltip.style, {
      position: 'absolute',
      zIndex: '9999999',
      backgroundColor: this.highlightColor, // Dynamic background
      color: 'white',
      padding: '3px 8px 4px 8px', // Adjusted padding for pill shape
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 'bold',
      fontFamily: 'system-ui, sans-serif',
      pointerEvents: 'none',
      display: 'none',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Nicer shadow
      transform: 'translateY(6px)', // Slight offset from element
      backdropFilter: 'saturate(180%) blur(2px)', // Subtle glass effect if color has opacity
    });
    this.tooltip.id = 'di-tooltip';
    this.cleanupOldElement('di-tooltip');

    // Measurement Guides Layer
    this.guides = document.createElement('div');
    Object.assign(this.guides.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '999998',
        display: 'none' 
    });
    this.guides.id = 'di-guides';
    this.cleanupOldElement('di-guides');

    // Persistent Detail Card
    this.detailCard = document.createElement('div');
    Object.assign(this.detailCard.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '10000000',
      backgroundColor: '#EEEAE3',
      color: '#171d26',
      borderRadius: '8px',
      boxShadow: '4px 4px 0px 0px #171d26',
      width: '360px',
      padding: '0',
      fontFamily: 'system-ui, sans-serif',
      display: 'none',
      border: '2px solid #171d26',
      overflow: 'hidden',
    });
    this.detailCard.id = 'di-detail-card';
    this.cleanupOldElement('di-detail-card');

    // Inject Custom Scrollbar Styles
    const style = document.createElement('style');
    style.textContent = `
      .di-custom-scrollbar ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .di-custom-scrollbar ::-webkit-scrollbar-track {
        background: transparent;
      }
      .di-custom-scrollbar ::-webkit-scrollbar-thumb {
        background: #9ca3af;
        border-radius: 3px;
      }
      .di-custom-scrollbar ::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
      }
      .di-custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #9ca3af transparent;
      }
    `;
    document.head.appendChild(style);

    this.detailCard.classList.add('di-custom-scrollbar');
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.selectionOverlay);
    document.body.appendChild(this.tooltip);
    document.body.appendChild(this.detailCard);
    document.body.appendChild(this.guides);

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  // Helper to remove orphaned elements from previous injections
  private cleanupOldElement(id: string) {
    const old = document.getElementById(id);
    if (old) old.remove();
  }

  // Convert hex to rgba
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Generate complementary color (opposite on color wheel)
  private getComplementaryColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Convert to HSL
    const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
        case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
        case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
      }
    }
    
    // Shift hue by 180 degrees for complementary, boost saturation
    h = (h + 0.5) % 1;
    s = Math.min(1, s + 0.2); // Boost saturation for visibility
    
    // Convert back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const newR = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const newG = Math.round(hue2rgb(p, q, h) * 255);
    const newB = Math.round(hue2rgb(p, q, h - 1/3) * 255);
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  // Update selection color based on highlight color
  private updateSelectionColor() {
    this.selectionColor = this.getComplementaryColor(this.highlightColor);
  }

  // Apply selection overlay styles without glow
  private applySelectionOverlayStyles() {
    Object.assign(this.selectionOverlay.style, {
      border: `2px solid ${this.selectionColor}`,
      backgroundColor: this.hexToRgba(this.selectionColor, 0.15),
      boxShadow: 'none',
    });
  }

  public enable(highlightColor?: string, sidebarMode?: boolean) {
    // Use provided color or fallback to default
    if (highlightColor) {
      this.highlightColor = highlightColor;
    }
    this.sidebarMode = sidebarMode || false;
    this.overlay.style.border = `2px solid ${this.highlightColor}`;
    this.overlay.style.backgroundColor = this.hexToRgba(this.highlightColor, 0.1);

    this.isActive = true;
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
  }

  public disable() {
    this.isActive = false;
    this.overlay.style.display = 'none';
    this.selectionOverlay.style.display = 'none';
    this.tooltip.style.display = 'none';
    this.detailCard.style.display = 'none';
    this.guides.style.display = 'none';
    this.selectedElement = null;
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
  }

  // Update highlight color in real-time
  public setHighlightColor(color: string) {
    this.highlightColor = color;
    this.overlay.style.border = `2px solid ${this.highlightColor}`;
    this.overlay.style.backgroundColor = this.hexToRgba(this.highlightColor, 0.1);
    // Update selection color to stay complementary
    this.updateSelectionColor();
    this.applySelectionOverlayStyles();
  }

  private handleClick(e: MouseEvent) {
    if (!this.isActive || !this.hoveredElement) return;
    
    // Allow interaction with our detail card
    if (this.detailCard.contains(e.target as Node)) return;

    e.preventDefault();
    e.stopPropagation();
    
    // Set selection
    this.selectedElement = this.hoveredElement;
    
    // Update selection overlay position
    this.updateSelectionOverlay(this.hoveredElement);
    
    // Show details
    this.showDetails(this.hoveredElement);
  }

  // Update selection overlay position
  private updateSelectionOverlay(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    Object.assign(this.selectionOverlay.style, {
      display: 'block',
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  // Add property to track hover mode
  private hoverMode: boolean = false;
  
  // Update handleMouseMove to respect hoverMode
  private handleMouseMove(e: MouseEvent) {
    if (!this.isActive) return;

    const target = e.target as HTMLElement;
    if (this.overlay.contains(target) || this.tooltip.contains(target) || this.detailCard.contains(target) || this.guides.contains(target)) return;
    
    this.hoveredElement = target;
    
    // If we have a selection, we want to show measurements relative to IT, not just highlight the new one
    // But we still update overlay to show what we are hovering 'against'
    this.updateOverlay(target);

    // If Hover Mode is ON, update details immediately (auto-select)
    if (this.hoverMode) {
        this.selectedElement = target;
        this.showDetails(target);
    } 
    
    // Draw guides if we have a selection and we are hovering something else
    if (this.selectedElement && this.selectedElement !== target) {
        this.drawGuides(this.selectedElement, target);
    } else {
        this.guides.innerHTML = ''; // Clear if not measuring
    }
  }

  private drawGuides(selected: HTMLElement, target: HTMLElement) {
      this.guides.style.display = 'block';
      this.guides.innerHTML = '';
      
      const r1 = selected.getBoundingClientRect(); // Selected (Red)
      const r2 = target.getBoundingClientRect();   // Hover (Blue)

      // Styles
      const lineColor = '#ef4444'; // Red-500
      const labelBg = '#ef4444';
      const labelColor = '#ffffff';

      const createLine = (x: number, y: number, w: number, h: number, text?: string) => {
          const el = document.createElement('div');
          Object.assign(el.style, {
              position: 'absolute',
              backgroundColor: lineColor,
              left: `${x}px`,
              top: `${y}px`,
              width: `${w}px`,
              height: `${h}px`
          });
          
          if (text) {
              const label = document.createElement('div');
              label.textContent = text;
              Object.assign(label.style, {
                  position: 'absolute',
                  backgroundColor: labelBg,
                  color: labelColor,
                  borderRadius: '2px',
                  padding: '1px 3px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: '1',
                  transform: 'translate(-50%, -50%)',
                  left: '50%',
                  top: '50%'
              });
              el.appendChild(label);
          }
          this.guides.appendChild(el);
      };

      // Calculate gaps (simplified Figma-like logic)
      // Vertical Gap
      if (r1.bottom < r2.top) { // Selected is above Target
          // Draw line from bottom of R1 to top of R2
          const dist = Math.round(r2.top - r1.bottom);
          const x = r1.left + (r1.width / 2); // Center x
          createLine(x, r1.bottom, 1, dist, `${dist}px`);
      } else if (r1.top > r2.bottom) { // Selected is below Target
          const dist = Math.round(r1.top - r2.bottom);
          const x = r1.left + (r1.width / 2);
          createLine(x, r2.bottom, 1, dist, `${dist}px`);
      }

      // Check right
      if (r2.right > r1.right && r2.left < r1.right) {
           const dist = Math.round(r2.right - r1.right);
           if (dist > 0) createLine(r1.right, r1.top + r1.height/2, dist, 1, `${dist}`);
      }
  }

  private generatePrompt(el: HTMLElement): string {
    const computed = window.getComputedStyle(el);
    
    // Extract ALL computed styles - EVERY SINGLE ONE
    const allStyles: Record<string, string> = {};
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
        allStyles[prop] = value;
      }
    }
    
    // Convert styles to CSS string
    const stylesString = Object.entries(allStyles)
      .map(([prop, val]) => `  ${prop}: ${val.slice(0, 150)};`)
      .join('\n');
    
    // Extract pseudo-elements (::before, ::after)
    const extractPseudoStyles = (pseudo: string): string | null => {
      const pseudoComputed = window.getComputedStyle(el, pseudo);
      const content = pseudoComputed.content;
      if (!content || content === 'none') return null;
      
      const styles: string[] = [`content: ${content}`];
      const props = ['display', 'position', 'width', 'height', 'background', 'color', 
                     'top', 'right', 'bottom', 'left', 'transform', 'opacity', 'z-index'];
      
      props.forEach(prop => {
        const val = pseudoComputed.getPropertyValue(prop);
        if (val && val !== 'none' && val !== 'auto' && val !== 'rgba(0, 0, 0, 0)') {
          styles.push(`${prop}: ${val}`);
        }
      });
      
      return styles.join('; ');
    };
    
    const beforeStyles = extractPseudoStyles('::before');
    const afterStyles = extractPseudoStyles('::after');
    
    // Extract hover/focus/active states from CSS rules
    const hoverRules: string[] = [];
    const focusRules: string[] = [];
    const activeRules: string[] = [];
    
    const selectors: string[] = [];
    if (el.id) selectors.push(`#${el.id}`);
    if (el.className) {
      el.className.split(' ').forEach(cls => {
        if (cls.trim()) selectors.push(`.${cls.trim()}`);
      });
    }
    selectors.push(el.tagName.toLowerCase());
    
    try {
      for (const sheet of document.styleSheets) {
        try {
          if (sheet.cssRules) {
            for (const rule of sheet.cssRules) {
              if (rule instanceof CSSStyleRule) {
                const ruleText = rule.selectorText;
                selectors.forEach(sel => {
                  if (ruleText.includes(sel)) {
                    if (ruleText.includes(':hover')) hoverRules.push(`${ruleText} { ${rule.style.cssText} }`);
                    if (ruleText.includes(':focus')) focusRules.push(`${ruleText} { ${rule.style.cssText} }`);
                    if (ruleText.includes(':active')) activeRules.push(`${ruleText} { ${rule.style.cssText} }`);
                  }
                });
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
    
    // Extract CSS variables
    const cssVars: { name: string; value: string }[] = [];
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      const value = computed.getPropertyValue(prop);
      const varMatches = value.match(/var\((--[^,)]+)/g);
      if (varMatches) {
        varMatches.forEach(match => {
          const varName = match.replace('var(', '');
          const varValue = computed.getPropertyValue(varName);
          if (varValue && !cssVars.find(v => v.name === varName)) {
            cssVars.push({ name: varName, value: varValue });
          }
        });
      }
    }
    
    // Extract parent context
    let parentContext = 'No parent';
    if (el.parentElement) {
      const parent = el.parentElement;
      const parentComputed = window.getComputedStyle(parent);
      const ctx: string[] = [
        `Parent: <${parent.tagName.toLowerCase()}>`,
        `Display: ${parentComputed.display}`
      ];
      if (parentComputed.display.includes('flex')) {
        ctx.push(`Flex-direction: ${parentComputed.flexDirection}`);
        ctx.push(`Justify: ${parentComputed.justifyContent}, Align: ${parentComputed.alignItems}, Gap: ${parentComputed.gap}`);
      }
      if (parentComputed.display.includes('grid')) {
        ctx.push(`Grid-template-columns: ${parentComputed.gridTemplateColumns}`);
        ctx.push(`Gap: ${parentComputed.gap}`);
      }
      parentContext = ctx.join('\n');
    }
    
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

## 🎨 Complete Computed Styles (${Object.keys(allStyles).length} Properties)

\`\`\`css
${tagName} {
${stylesString}
}
\`\`\`

${beforeStyles ? `## 🎭 Pseudo-Element: ::before
\`\`\`css
${tagName}::before {
  ${beforeStyles}
}
\`\`\`
` : ''}

${afterStyles ? `## 🎭 Pseudo-Element: ::after
\`\`\`css
${tagName}::after {
  ${afterStyles}
}
\`\`\`
` : ''}

${hoverRules.length > 0 ? `## 🎯 Interactive State: :hover
\`\`\`css
${hoverRules.join('\n')}
\`\`\`
` : ''}

${focusRules.length > 0 ? `## 🎯 Interactive State: :focus
\`\`\`css
${focusRules.join('\n')}
\`\`\`
` : ''}

${activeRules.length > 0 ? `## 🎯 Interactive State: :active
\`\`\`css
${activeRules.join('\n')}
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
${parentContext}

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

## ⚡ Transitions & Animations

- **Transition**: ${computed.transition !== 'all 0s ease 0s' ? computed.transition : 'None'}
- **Animation**: ${computed.animationName !== 'none' ? `${computed.animationName} ${computed.animationDuration} ${computed.animationTimingFunction}` : 'None'}

## ✅ RECREATION REQUIREMENTS (99% Accuracy)

### CRITICAL - MUST MATCH EXACTLY:
1. ✅ **Every CSS property** - All ${Object.keys(allStyles).length} properties listed above
2. ✅ **Pseudo-elements** - ::before and ::after with exact styling
3. ✅ **Interactive states** - :hover, :focus, :active with exact transitions
4. ✅ **Exact dimensions** - ${computed.width} × ${computed.height}
5. ✅ **Spacing** - padding: ${computed.padding}, margin: ${computed.margin}
6. ✅ **Colors** - Exact hex/rgb values, no approximations
7. ✅ **Typography** - ${Array.from(fonts)[0] || 'system font'}, ${computed.fontSize}, ${computed.fontWeight}
8. ✅ **Effects** - Shadows, filters, transforms, opacity, clip-path
9. ✅ **Layout behavior** - ${computed.display} with exact flex/grid properties
10. ✅ **Assets** - ${images.length} images, ${svgs.length} SVGs, ${bgImages.length} backgrounds
11. ✅ **Responsive units** - Preserve vw, vh, clamp(), calc(), var() as-is
12. ✅ **Z-index & stacking** - ${computed.zIndex}

### IMPLEMENTATION INSTRUCTIONS:

1. **Copy EVERY CSS property** from the computed styles section - no exceptions
2. **Add pseudo-elements** if ::before or ::after are present with exact styles  
3. **Implement interactive states** - copy the exact :hover/:focus/:active CSS
4. **Handle assets**: Replace URLs with placeholders or use actual sources
5. **Preserve modern CSS**: Keep clamp(), min(), max(), calc(), var() functions as-is
6. **Match parent context**: Ensure this element fits its parent's layout system
7. **Test side-by-side**: Compare with original to verify 99% accuracy

**OUTPUT**: Complete production-ready React/Vue/HTML component with Tailwind CSS or vanilla CSS that achieves 99% visual fidelity.

---


*This extraction captures ${Object.keys(allStyles).length} computed CSS properties including pseudo-elements, interactive states, CSS variables, and parent context. Every detail captured for maximum accuracy.*
`.trim();
  }

  private showDetails(el: HTMLElement) {
    const computed = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    const rgbToHex = (rgb: string) => {
        if (rgb.startsWith('#')) return rgb;
        if (rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return 'transparent';
        
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) return rgb;
        
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
        
        if (a === 0) return 'transparent';
        
        const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
        if (a === 1) return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        
        return rgb; // Return rgba for semi-transparent
    };

    const color = rgbToHex(computed.color);
    let bg = rgbToHex(computed.backgroundColor);
    const bgImage = computed.backgroundImage;
    const isGradient = bgImage !== 'none' && bgImage.includes('gradient');
    const bgDisplay = isGradient ? 'Gradient' : (bg === 'transparent' ? 'None' : bg);
    const font = computed.fontFamily.split(',')[0].replace(/['"]/g, '');

    // Dimensions Extraction
    const getVal = (p: string) => parseInt(computed.getPropertyValue(p), 10) || 0;
    const mt = getVal('margin-top'), mr = getVal('margin-right'), mb = getVal('margin-bottom'), ml = getVal('margin-left');
    const pt = getVal('padding-top'), pr = getVal('padding-right'), pb = getVal('padding-bottom'), pl = getVal('padding-left');
    const bt = getVal('border-top-width'), br = getVal('border-right-width'), bb = getVal('border-bottom-width'), blVal = getVal('border-left-width');
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    // If in sidebar mode, send data to sidebar instead of showing floating card
    if (this.sidebarMode) {
      const tagName = el.tagName.toLowerCase();
      const selector = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + Array.from(el.classList).join('.') : '');
      
      // Determine element type label
      let label = el.tagName.charAt(0).toUpperCase() + el.tagName.slice(1).toLowerCase();
      if (/^h[1-6]$/.test(tagName) || ['p', 'span', 'a', 'b', 'i', 'strong', 'em', 'label', 'small'].includes(tagName)) label = 'Text';

      const border = computed.border !== '0px none rgb(0, 0, 0)' && computed.borderWidth !== '0px' ? computed.border : 'None';
      const borderRadius = computed.borderRadius !== '0px' ? computed.borderRadius : '0';
      const boxShadow = computed.boxShadow !== 'none' ? computed.boxShadow : 'None';

      // Generate CSS string
      const cssString = `/* ${tagName} styles */
font-family: ${computed.fontFamily};
font-size: ${computed.fontSize};
font-weight: ${computed.fontWeight};
line-height: ${computed.lineHeight};
color: ${computed.color};
background: ${isGradient ? bgImage : computed.backgroundColor};
border: ${border};
border-radius: ${borderRadius};
box-shadow: ${boxShadow};
padding: ${computed.padding};
margin: ${computed.margin};
width: ${rect.width}px;
height: ${rect.height}px;
`;

      // Send to sidebar
      chrome.runtime.sendMessage({
        action: 'INSPECTOR_ELEMENT_SELECTED',
        data: {
          tagName,
          selector,
          label,
          dimensions: { width: w, height: h },
          margin: { top: mt, right: mr, bottom: mb, left: ml },
          padding: { top: pt, right: pr, bottom: pb, left: pl },
          border: { top: bt, right: br, bottom: bb, left: blVal },
          typography: {
            fontFamily: font,
            fontSize: Math.round(parseFloat(computed.fontSize)),
            lineHeight: computed.lineHeight,
            fontWeight: computed.fontWeight,
            letterSpacing: computed.letterSpacing,
            textAlign: computed.textAlign,
            color: color
          },
          colors: {
            background: bgDisplay,
            backgroundRaw: bg,
            isGradient,
            gradientValue: isGradient ? bgImage : null
          },
          element: {
            display: computed.display,
            position: computed.position,
            zIndex: computed.zIndex === 'auto' ? '-' : computed.zIndex,
            borderRadius,
            border: border !== 'None' ? border : null,
            boxShadow: boxShadow !== 'None' ? boxShadow : null
          },
          cssString,
          prompt: this.generatePrompt(el)
        }
      }).catch(() => {});
      
      return; // Don't show floating card
    }

    // Box Model HTML
    // Box Model HTML (Neubrutalism)
    const boxModelHtml = `
      <div style="font-size: 9px; color: #171d26; font-family: monospace; display: flex; flex-direction: column; align-items: center; margin: 12px 0;">
        <!-- MARGIN -->
        <div style="background: #fdf2f8; border: 1px dashed #171d26; border-radius: 4px; padding: 2px; position: relative; width: 100%; box-sizing: border-box;">
           <span style="position: absolute; top: 2px; left: 4px; font-size: 8px; color: #db2777; font-weight: bold;">margin</span>
           <div style="text-align: center; margin-bottom: 2px;">${mt}</div>
           <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 4px;">
              <span>${ml}</span>
              
              <!-- BORDER -->
              <div style="background: #fffbeb; border: 1px solid #171d26; border-radius: 2px; padding: 2px; flex: 1; margin: 0 4px; position: relative;">
                 <span style="position: absolute; top: 0px; left: 2px; font-size: 8px; color: #d97706; font-weight: bold;">border</span>
                 <div style="text-align: center; margin-bottom: 2px;">${bt}</div>
                 <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="padding-left: 2px;">${blVal}</span>
                    
                    <!-- PADDING -->
                    <div style="background: #f0fdf4; border: 1px dashed #171d26; border-radius: 2px; padding: 2px; flex: 1; margin: 0 4px; position: relative;">
                       <span style="position: absolute; top: 0px; left: 2px; font-size: 8px; color: #16a34a; font-weight: bold;">padding</span>
                       <div style="text-align: center; margin-bottom: 2px;">${pt}</div>
                       <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="padding-left: 2px;">${pl}</span>
                          
                          <!-- CONTENT -->
                          <div style="background: #eff6ff; border: 1px solid #171d26; color: #1e3a8a; font-weight: bold; padding: 6px 12px; border-radius: 2px; margin: 2px 4px;">
                             ${w} × ${h}
                          </div>
                          
                          <span style="padding-right: 2px;">${pr}</span>
                       </div>
                       <div style="text-align: center; margin-top: 2px;">${pb}</div>
                    </div>

                    <span style="padding-right: 2px;">${br}</span>
                 </div>
                 <div style="text-align: center; margin-top: 2px;">${bb}</div>
              </div>

              <span>${mr}</span>
           </div>
           <div style="text-align: center; margin-top: 2px;">${mb}</div>
        </div>
      </div>
    `;

    // Effects Extraction
    const border = computed.border !== '0px none rgb(0, 0, 0)' && computed.borderWidth !== '0px' ? computed.border : 'None';
    const borderRadius = computed.borderRadius !== '0px' ? computed.borderRadius : '0';
    const boxShadow = computed.boxShadow !== 'none' ? computed.boxShadow : 'None';
    
    // Generate CSS String for Copy
    const cssString = `/* ${el.tagName.toLowerCase()} styles */
font-family: ${computed.fontFamily};
font-size: ${computed.fontSize};
font-weight: ${computed.fontWeight};
line-height: ${computed.lineHeight};
color: ${computed.color};
background: ${isGradient ? bgImage : computed.backgroundColor};
border: ${border};
border-radius: ${borderRadius};
box-shadow: ${boxShadow};
padding: ${computed.padding};
margin: ${computed.margin};
width: ${rect.width}px;
height: ${rect.height}px;
`;

    this.detailCard.style.display = 'block';
    const rawSelector = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + Array.from(el.classList).join('.') : '');
    const fullSelector = escapeHtml(rawSelector);
    
    let label = el.tagName.charAt(0).toUpperCase() + el.tagName.slice(1).toLowerCase();
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag) || ['p', 'span', 'a', 'b', 'i', 'strong', 'em', 'label', 'small'].includes(tag)) label = 'Text';

    this.detailCard.innerHTML = `
      <div style="padding: 12px 16px; border-bottom: 2px solid #171d26; display: flex; justify-content: space-between; align-items: center; background: #EEEAE3;">
        <div style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;">
            <span style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase;">${label}</span>
            <span style="font-weight: 800; font-size: 14px; text-transform: lowercase; color: #171d26; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${fullSelector}">${fullSelector}</span>
        </div>
        <div style="display: flex; gap: 12px; align-items: center; padding-left: 12px;">
            <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #171d26; cursor: pointer; font-weight: 700;" title="Toggle continuous inspection on hover">
                 <input type="checkbox" id="di-hover-toggle" style="accent-color: #171d26; width: 14px; height: 14px; border: 2px solid #171d26; border-radius: 2px; cursor: pointer;">
                 Hover
            </label>
            <button id="di-close-btn" style="background: none; border: none; cursor: pointer; color: #171d26; font-size: 18px; font-weight: bold; line-height: 1;">&times;</button>
        </div>
      </div>
      
      <!-- Actions Toolbar -->
      <div style="padding: 8px 16px; border-bottom: 2px solid #171d26; background: #FFFBF0; display: flex; gap: 8px;">
        <button id="di-copy-css" style="background: #3b82f6; border: 2px solid #171d26; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; color: white; display: flex; align-items: center; gap: 6px; box-shadow: 2px 2px 0px 0px #171d26; transition: all 0.1s; flex: 1; justify-content: center;">
            <span style="font-size: 14px;">📋</span> CSS
        </button>
        <button id="di-gen-prompt" style="background: #8b5cf6; border: 2px solid #171d26; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; color: white; display: flex; align-items: center; gap: 6px; box-shadow: 2px 2px 0px 0px #171d26; transition: all 0.1s; flex: 1; justify-content: center;">
            <span style="font-size: 13px;">✨</span> PROMPT
        </button>
      </div>

      <div style="padding: 16px; font-size: 13px; display: flex; flex-direction: column; gap: 20px; max-height: 450px; overflow-y: auto; background: #FDFBF7;">
        
        <!-- Spacing (Box Model) -->
        <div>
            <div style="font-weight: 800; color: #171d26; margin-bottom: 4px; font-size: 11px; text-transform: uppercase;">Spacing</div>
            ${boxModelHtml}
        </div>

        <!-- Text Properties -->
        <div>
           <div style="font-weight: 800; color: #171d26; margin-bottom: 8px; font-size: 11px; text-transform: uppercase;">Text properties</div>
           <div style="display: flex; flex-direction: column; gap: 6px;">
               ${[
                 ['Font Family', escapeHtml(font)],
                 ['Font Size', `${Math.round(parseFloat(computed.fontSize))}px`],
                 ['Line Height', escapeHtml(computed.lineHeight)],
                 ['Font Weight', computed.fontWeight],
                 ['Letter Spacing', escapeHtml(computed.letterSpacing)],
                 ['Text Align', computed.textAlign]
               ].map(([label, value]) => `
                 <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                    <span style="color: #64748b;">${label}</span>
                    <span style="color: #171d26; font-weight: 500; text-align: right; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${value}">${value}</span>
                 </div>
               `).join('')}
               <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                    <span style="color: #64748b;">Text Color</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 14px; height: 14px; background: ${escapeHtml(color)}; border: 1px solid #171d26; border-radius: 2px;"></div>
                        <span style="color: #171d26; font-weight: 500;">${escapeHtml(color)}</span>
                    </div>
               </div>
           </div>
        </div>

        <!-- Colors -->
        <div>
            <div style="font-weight: 800; color: #171d26; margin-bottom: 8px; font-size: 11px; text-transform: uppercase;">Colors</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <!-- Background Card -->
                <div style="background: ${isGradient ? escapeHtml(bgImage) : (bg === 'transparent' ? 'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 10px 10px' : escapeHtml(bg))}; padding: 12px; border-radius: 6px; border: 2px solid #171d26; box-shadow: 2px 2px 0px 0px #171d26; color: ${bg === 'transparent' || bg === '#FFFFFF' || bg.startsWith('rgba(255') ? '#171d26' : (bg.startsWith('#0') || bg.startsWith('#1') ? '#FFFFFF' : '#171d26')}; position: relative; overflow: hidden; min-height: 40px;">
                     <div style="position: relative; z-index: 1; background: rgba(255,255,255,0.9); display: inline-block; padding: 2px 6px; border-radius: 4px; border: 1px solid #171d26;">
                        <span style="font-size: 10px; font-weight: 700; color: #171d26;">Background</span>
                        <div style="font-family: monospace; font-size: 12px; font-weight: 600; color: #171d26;">${bgDisplay}</div>
                     </div>
                </div>
            </div>
        </div>

        <!-- Element Properties -->
        <div>
           <div style="font-weight: 800; color: #171d26; margin-bottom: 8px; font-size: 11px; text-transform: uppercase;">Element properties</div>
           <div style="display: flex; flex-direction: column; gap: 6px;">
               ${[
                 ['Width', `${w}px`],
                 ['Height', `${h}px`],
                 ['Border Radius', borderRadius],
                 ['Display', computed.display],
                 ['Position', computed.position],
                 ['Z-Index', computed.zIndex === 'auto' ? '-' : computed.zIndex]
               ].map(([label, value]) => `
                 <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                    <span style="color: #64748b;">${label}</span>
                    <span style="color: #171d26; font-weight: 500; font-family: monospace;">${value}</span>
                 </div>
               `).join('')}
           </div>
        </div>

        <!-- Effects (If any) -->
         ${(border !== 'None' || boxShadow !== 'None') ? `
        <div>
           <div style="font-weight: 800; color: #171d26; margin-bottom: 8px; font-size: 11px; text-transform: uppercase;">Effects</div>
           <div style="display: flex; flex-direction: column; gap: 6px;">
               ${border !== 'None' ? `
                 <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                    <span style="color: #64748b;">Border</span>
                    <span style="color: #171d26; font-weight: 500; font-family: monospace; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(border)}</span>
                 </div>` : ''}
               ${boxShadow !== 'None' ? `
                 <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                    <span style="color: #64748b;">Shadow</span>
                    <span style="color: #171d26; font-weight: 500; font-family: monospace; max-width: 150px; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(boxShadow)}">${escapeHtml(boxShadow)}</span>
                 </div>` : ''}
           </div>
        </div>
        ` : ''}

      </div>
    `;

    // Listeners for Card Controls
    this.detailCard.querySelector('#di-close-btn')?.addEventListener('click', () => {
        this.disable();
        chrome.runtime.sendMessage({ action: 'INSPECTOR_DISABLED' });
    });

    const hoverToggle = this.detailCard.querySelector('#di-hover-toggle') as HTMLInputElement;
    if (this.hoverMode) hoverToggle.checked = true;
    
    hoverToggle?.addEventListener('change', (e) => {
        this.hoverMode = (e.target as HTMLInputElement).checked;
        if (this.hoverMode && this.hoveredElement) {
            this.selectedElement = this.hoveredElement;
            this.showDetails(this.hoveredElement);
        }
    });

    this.detailCard.querySelector('#di-copy-css')?.addEventListener('click', (e) => {
        const btn = e.target as HTMLButtonElement;
        navigator.clipboard.writeText(cssString).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = 'COPIED';
            btn.style.color = '#16a34a';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.color = '#475569';
            }, 1000);
        });
    });

    // Prompt Gen Listener
    this.detailCard.querySelector('#di-gen-prompt')?.addEventListener('click', (e) => {
        const btn = e.target as HTMLButtonElement;
        const prompt = this.generatePrompt(el);
        navigator.clipboard.writeText(prompt).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = 'COPIED';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 1000);
        });
    });


  }

  private updateOverlay(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    
    this.overlay.style.display = 'block';
    this.overlay.style.top = `${rect.top + window.scrollY}px`;
    this.overlay.style.left = `${rect.left + window.scrollX}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;

    const tagName = element.tagName.toLowerCase();
    
    // Determine type label/icon
    const iconStyle = 'width: 11px; height: 11px; fill: currentColor; opacity: 1; display: block;';
    const icons = {
        text: `<svg style="${iconStyle}" viewBox="0 0 24 24"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>`,
        image: `<svg style="${iconStyle}" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`, 
        box: `<svg style="${iconStyle}" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>`,
        action: `<svg style="${iconStyle}" viewBox="0 0 24 24"><path d="M3.5 3.5L9 20.5 12.5 13.5 19.5 10 3.5 3.5z"/></svg>`,
    };

    let typeIcon = icons.box; // Box (default)
    const tag = tagName;
    if (/^h[1-6]$/.test(tag) || ['p', 'span', 'strong', 'em', 'label', 'small', 'li', 'blockquote', 'i', 'b', 'u'].includes(tag)) typeIcon = icons.text;
    if (tag === 'img' || tag === 'svg' || tag === 'video' || tag === 'canvas') typeIcon = icons.image;
    if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || tag === 'textarea') typeIcon = icons.action;
    
    this.tooltip.style.display = 'flex';
    this.tooltip.style.alignItems = 'center';
    this.tooltip.style.gap = '6px';
    
    this.tooltip.style.backgroundColor = this.highlightColor; // Use active highlight color
    
    this.tooltip.innerHTML = `
      <span style="opacity: 1; display: flex; align-items: center;">${typeIcon}</span>
      <span style="font-family: system-ui, sans-serif; font-weight: 600; letter-spacing: 0.2px;">${tagName}</span>
    `;
    
    // Position tooltip at bottom-left of element
    const tooltipRect = this.tooltip.getBoundingClientRect();
    let top = rect.bottom + window.scrollY; // Default: below bottom-left
    let left = rect.left + window.scrollX;

    // Flip to top if close to bottom edge
    if (rect.bottom > window.innerHeight - 30) {
       top = rect.top + window.scrollY - tooltipRect.height - 4;
    }
    
    // Clamp horizontally
    if (left + tooltipRect.width > window.innerWidth) {
       left = window.innerWidth - tooltipRect.width - 8;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }
}
