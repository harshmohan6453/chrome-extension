export class Inspector {
  private overlay: HTMLElement;
  private isActive: boolean = false;
  private hoveredElement: HTMLElement | null = null;
  private selectedElement: HTMLElement | null = null;
  private tooltip: HTMLElement;
  private detailCard: HTMLElement;
  private guides: HTMLElement;

  constructor() {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '999999',
      border: '2px solid #7c3aed',
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      transition: 'all 0.1s ease',
      display: 'none',
    });
    
    this.tooltip = document.createElement('div');
    Object.assign(this.tooltip.style, {
      position: 'fixed',
      zIndex: '9999999',
      backgroundColor: '#1e293b',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'system-ui, sans-serif',
      pointerEvents: 'none',
      display: 'none',
    });

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

    // Persistent Detail Card
    this.detailCard = document.createElement('div');
    Object.assign(this.detailCard.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '10000000',
      backgroundColor: 'white',
      color: '#0f172a',
      borderRadius: '12px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      width: '300px',
      padding: '0',
      fontFamily: 'system-ui, sans-serif',
      display: 'none',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
    });

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.tooltip);
    document.body.appendChild(this.detailCard);
    document.body.appendChild(this.guides);

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  public enable() {
    this.isActive = true;
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
  }

  public disable() {
    this.isActive = false;
    this.overlay.style.display = 'none';
    this.tooltip.style.display = 'none';
    this.detailCard.style.display = 'none';
    this.guides.style.display = 'none';
    this.selectedElement = null;
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
  }

  private handleClick(e: MouseEvent) {
    if (!this.isActive || !this.hoveredElement) return;
    
    // Allow interaction with our detail card
    if (this.detailCard.contains(e.target as Node)) return;

    e.preventDefault();
    e.stopPropagation();
    
    // Set selection
    this.selectedElement = this.hoveredElement;
    
    // Show details
    this.showDetails(this.hoveredElement);
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


  private async captureElementScreenshot(el: HTMLElement): Promise<string> {
      // 1. Get full page screenshot from background
      const response = await chrome.runtime.sendMessage({ action: 'CAPTURE_SCREENSHOT' });
      if (response.error || !response.dataUrl) {
          throw new Error('Screenshot failed: ' + (response.error || 'Unknown error'));
      }

      // 2. Crop to element using Canvas
      return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
              const rect = el.getBoundingClientRect();
              const dpr = window.devicePixelRatio || 1;
              
              const canvas = document.createElement('canvas');
              canvas.width = rect.width * dpr;
              canvas.height = rect.height * dpr;
              
              const ctx = canvas.getContext('2d');
              if (!ctx) return reject('No canvas context');

              // Handle high-DPI cropping
              ctx.drawImage(
                  img,
                  rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr, // Source
                  0, 0, canvas.width, canvas.height // Dest
              );

              resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = reject;
          img.src = response.dataUrl;
      });
  }

  private async sendToBackend(payload: any): Promise<any> {
      // Proxy through background script to avoid Mixed Content (HTTPS -> HTTP) blocks
      return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ action: 'ANALYZE_IMAGE', payload }, (response) => {
              if (chrome.runtime.lastError) {
                  return reject(chrome.runtime.lastError.message);
              }
              if (response && response.error) {
                  return reject(response.error);
              }
              resolve(response);
          });
      });
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
        const [r, g, b] = (rgb.match(/\d+/g) || []).map(Number);
        if (r === undefined) return rgb;
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    };

    const color = rgbToHex(computed.color);
    let bg = rgbToHex(computed.backgroundColor);
    const bgImage = computed.backgroundImage;
    const isGradient = bgImage !== 'none' && bgImage.includes('gradient');
    const bgDisplay = isGradient ? 'Gradient' : (bg === 'rgba(0, 0, 0, 0)' ? 'None' : bg);
    const font = computed.fontFamily.split(',')[0].replace(/['"]/g, '');

    // Dimensions Extraction
    const getVal = (p: string) => parseInt(computed.getPropertyValue(p), 10) || 0;
    const mt = getVal('margin-top'), mr = getVal('margin-right'), mb = getVal('margin-bottom'), ml = getVal('margin-left');
    const pt = getVal('padding-top'), pr = getVal('padding-right'), pb = getVal('padding-bottom'), pl = getVal('padding-left');
    const bt = getVal('border-top-width'), br = getVal('border-right-width'), bb = getVal('border-bottom-width'), bl = getVal('border-left-width');
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    // Box Model HTML
    const boxModelHtml = `
      <div style="font-size: 9px; color: #94a3b8; font-family: monospace; display: flex; flex-direction: column; align-items: center; margin: 12px 0;">
        <!-- MARGIN -->
        <div style="background: #fdf2f8; border: 1px dashed #fbcfe8; border-radius: 4px; padding: 2px; position: relative; width: 100%; box-sizing: border-box;">
           <span style="position: absolute; top: 2px; left: 4px; font-size: 8px; color: #db2777;">margin</span>
           <div style="text-align: center; margin-bottom: 2px;">${mt}</div>
           <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 4px;">
              <span>${ml}</span>
              
              <!-- BORDER -->
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 2px; padding: 2px; flex: 1; margin: 0 4px; position: relative;">
                 <span style="position: absolute; top: 0px; left: 2px; font-size: 8px; color: #d97706;">border</span>
                 <div style="text-align: center; margin-bottom: 2px;">${bt}</div>
                 <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="padding-left: 2px;">${bl}</span>
                    
                    <!-- PADDING -->
                    <div style="background: #f0fdf4; border: 1px dashed #bbf7d0; border-radius: 2px; padding: 2px; flex: 1; margin: 0 4px; position: relative;">
                       <span style="position: absolute; top: 0px; left: 2px; font-size: 8px; color: #16a34a;">padding</span>
                       <div style="text-align: center; margin-bottom: 2px;">${pt}</div>
                       <div style="display: flex; justify-content: space-between; align-items: center;">
                          <span style="padding-left: 2px;">${pl}</span>
                          
                          <!-- CONTENT -->
                          <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; font-weight: bold; padding: 6px 12px; border-radius: 2px; margin: 2px 4px;">
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
    this.detailCard.innerHTML = `
      <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
        <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-weight: 700; font-size: 14px; text-transform: lowercase; color: #64748b;">&lt;${el.tagName.toLowerCase()}&gt;</span>
            <div style="display: flex; gap: 4px;">
                <button id="di-copy-css" style="background: #e2e8f0; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer; color: #475569; display: flex; align-items: center; gap: 4px; transition: all 0.2s;">
                    CSS
                </button>
                <button id="di-gen-prompt" style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer; color: white; display: flex; align-items: center; gap: 4px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(124, 58, 237, 0.2);">
                    ✨ PROMPT
                </button>
                <button id="di-ai-enhance" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer; color: white; display: flex; align-items: center; gap: 4px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">
                    🤖 AI ENHANCE
                </button>
            </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
            <label style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #64748b; cursor: pointer;" title="Toggle continuous inspection on hover">
                 <input type="checkbox" id="di-hover-toggle" style="accent-color: #7c3aed;">
                 Hover
            </label>
            <button id="di-close-btn" style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 18px;">&times;</button>
        </div>
      </div>
      <div style="padding: 16px; font-size: 13px; display: flex; flex-direction: column; gap: 12px; max-height: 500px; overflow-y: auto;">
        
        <!-- Box Model -->
        ${boxModelHtml}

        <!-- Typography -->
         <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                 <div style="font-weight: 600; color: #64748b; margin-bottom: 2px; font-size: 11px; text-transform: uppercase;">Typography</div>
                 <div style="font-weight: 500; color: #0f172a; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${font}">${font}</div>
            </div>
            <div style="text-align: right;">
                 <div style="color: #64748b;">${computed.fontWeight} • ${Math.round(parseFloat(computed.fontSize))}px</div>
                 <div style="color: #94a3b8; font-size: 11px;">${computed.lineHeight}</div>
            </div>
         </div>

        <!-- Colors -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; padding: 8px; border-radius: 6px;">
           <div style="display: flex; flex-direction: column; gap: 4px;">
              <span style="font-size: 10px; font-weight: 600; color: #64748b;">TEXT</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                 <div style="width: 14px; height: 14px; background: ${color}; border-radius: 3px; border: 1px solid #e2e8f0;"></div>
                 <span style="font-family: monospace; font-size: 11px; color: #334155;">${color}</span>
              </div>
           </div>
           <div style="display: flex; flex-direction: column; gap: 4px;">
              <span style="font-size: 10px; font-weight: 600; color: #64748b;">BG</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                 <div style="width: 14px; height: 14px; background: ${isGradient ? bgImage : bg}; border-radius: 3px; border: 1px solid #e2e8f0;"></div>
                 <span style="font-family: monospace; font-size: 11px; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px;">${bgDisplay}</span>
              </div>
           </div>
        </div>

        <!-- Effects (If Present) -->
        ${(border !== 'None' || borderRadius !== '0' || boxShadow !== 'None') ? `
        <div>
            <div style="font-weight: 600; color: #64748b; margin-bottom: 4px; font-size: 11px; text-transform: uppercase;">Effects</div>
            <div style="display: flex; flex-direction: column; gap: 4px; color: #334155; font-size: 11px;">
                ${border !== 'None' ? `<div style="display: flex; justify-content: space-between;"><span>Border</span> <span style="font-family: monospace;">${border}</span></div>` : ''}
                ${borderRadius !== '0' ? `<div style="display: flex; justify-content: space-between;"><span>Radius</span> <span style="font-family: monospace;">${borderRadius}</span></div>` : ''}
                ${boxShadow !== 'None' ? `<div style="display: flex; justify-content: space-between;"><span>Shadow</span> <span style="font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${boxShadow}">${boxShadow}</span></div>` : ''}
            </div>
        </div>
        ` : ''}

      </div>
    `;

    // Listeners for Card Controls
    this.detailCard.querySelector('#di-close-btn')?.addEventListener('click', () => {
        this.detailCard.style.display = 'none';
        this.selectedElement = null; // Deselect on close
        this.guides.innerHTML = '';
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

    // Backend AI Enhance Listener
    this.detailCard.querySelector('#di-ai-enhance')?.addEventListener('click', async (e) => {
        const btn = e.target as HTMLButtonElement;
        const originalText = btn.innerHTML;
        
        try {
            btn.innerHTML = '📸 CAPTURING...';
            // Slight delay to ensure UI updates
            await new Promise(r => setTimeout(r, 50));
            
            const image = await this.captureElementScreenshot(el);
            
            btn.innerHTML = '🤖 ANALYZING...';
            const context = this.generatePrompt(el);
            
            const result = await this.sendToBackend({
                image,
                context,
                timestamp: Date.now()
            });
            
            if (result.prompt) {
                await navigator.clipboard.writeText(result.prompt);
                btn.innerHTML = '✅ COPIED!';
            } else {
                throw new Error('No prompt returned');
            }
        } catch (err: any) {
            console.error(err);
            btn.innerHTML = '❌ ERROR';
            btn.title = err.message || 'Unknown Error';
        }

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.title = '';
        }, 2000);
    });
  }

  private updateOverlay(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    
    this.overlay.style.display = 'block';
    this.overlay.style.top = `${rect.top}px`;
    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;

    const tagName = element.tagName.toLowerCase();
    const className = element.classList.length > 0 ? `.${element.classList[0]}` : '';
    const dimensions = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;

    this.tooltip.style.display = 'block';
    this.tooltip.textContent = `${tagName}${className} | ${dimensions}`;
    
    // Position tooltip
    const tooltipRect = this.tooltip.getBoundingClientRect();
    let top = rect.top - tooltipRect.height - 8;
    let left = rect.left;

    if (top < 0) top = rect.bottom + 8;
    if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 8;

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }
}
