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
  // Helper to serialize element with computed styles
      const serializeWithStyles = (node: Element, depth: number = 0): string => {
          if (depth > 10) return '<!-- depth limit -->'; // Safety break
          
          if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent?.trim();
              return text ? text : '';
          }

          if (node.nodeType !== Node.ELEMENT_NODE) return '';
          
          const element = node as HTMLElement;
          const tagName = element.tagName.toLowerCase();
          
          // Skip sensitive/invisible or clutter
          const comp = window.getComputedStyle(element);
          if (comp.display === 'none' || comp.opacity === '0' || comp.visibility === 'hidden') return '';
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript' || tagName === 'iframe') return '';

          // Special Handling for Icons/Images
          if (tagName === 'svg') {
             return `<svg width="${comp.width}" height="${comp.height}" fill="${comp.fill}"><!-- icon path --></svg>`;
          }
          if (tagName === 'img') {
             return `<img src="${element.getAttribute('src')}" alt="${element.getAttribute('alt') || ''}" style="width:${comp.width}; height:${comp.height}; object-fit:${comp.objectFit}; border-radius:${comp.borderRadius}" />`; 
          }

          // Extract Critical Styles
          const props = [
              // Layout
              'display', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'gap',
              'grid-template-columns', 'grid-template-rows',
              'position', 'width', 'height', 'max-width',
              // Spacing
              'padding', 'margin',
              // Typography
              'font-family', 'font-size', 'font-weight', 'line-height', 'text-align', 'color',
              // Decor
              'background-color', 'background-image', 'border', 'border-radius', 'box-shadow', 'opacity', 'z-index'
          ];
          
          const stylePairs: string[] = [];
          
          // Check for flex/grid specifics to avoid noise
          const isFlex = comp.display.includes('flex');
          const isGrid = comp.display.includes('grid');

          props.forEach(p => {
              const val = comp.getPropertyValue(p);
              
              // Filter defaults/empty
              if (!val || val === 'none' || val === '0px' || val === 'auto' || val === 'normal' || val === 'rgba(0, 0, 0, 0)') return;
              
              // Context-sensitive filtering
              if (!isFlex && (p.startsWith('flex') || p === 'justify-content' || p === 'align-items')) return;
              if (!isGrid && p.startsWith('grid')) return;
              if (p === 'width' || p === 'height') {
                  if (val === '0px') return; 
              }
              if (p === 'position' && val === 'static') return;
              if (p === 'z-index' && val === 'auto') return;
              if (p === 'font-weight' && val === '400') return;
              if (p === 'opacity' && val === '1') return;

              stylePairs.push(`${p}: ${val}`);
          });

          // Serialize Children
          let childrenHtml = '';
          Array.from(element.childNodes).forEach(child => {
              childrenHtml += serializeWithStyles(child as Element, depth + 1);
          });
          
          // Clean up children whitespace if only one text node
          if (childrenHtml.length < 50 && !childrenHtml.includes('<')) {
              // likely just text
          } else {
             childrenHtml = `\n${childrenHtml}\n`;
          }

          return `<${tagName} style="${stylePairs.join('; ')}">${childrenHtml}</${tagName}>`;
      };

      const richHtml = serializeWithStyles(el);

      // Construct Prompt
      return `
You are an expert Frontend Developer. Recreate this specific UI component using React and Tailwind CSS.
I have explicitly inlined the **Computed Styles** for every element in the HTML below.

## Source HTML (with Computed Styles)
\`\`\`html
${richHtml}
\`\`\`

## Instruction
1. **Analyze the Inline Styles**: Look at the \`style\` attributes for every node. They contain the *exact* computed layout (flex/grid), spacing (padding/margin), colors, and typography you must match.
2. **Map to Tailwind**: Convert these raw CSS values into the closest Tailwind utility classes.
   - e.g., \`display: flex; gap: 16px\` -> \`flex gap-4\`
   - e.g., \`background-color: rgb(30, 41, 59)\` -> \`bg-slate-800\` (or custom hex)
   - e.g., \`font-size: 14px; font-weight: 600\` -> \`text-sm font-semibold\`
3. **Structure**: Maintain the exact hierarchy shown in the HTML.
4. **Icons/Images**: Use placeholders where you see \`<img>\` or \`<svg>\` tags.

**Output**: Provide the full, responsive React component code.
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
