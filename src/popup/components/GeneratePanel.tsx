import { useState } from 'react';
import { useStore } from '../../store';
import { Copy, Check, Sparkles, Palette, FileCode } from 'lucide-react';
import { clsx } from 'clsx';

export const GeneratePanel = () => {
  const { data } = useStore();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  // --- Data Preparation ---
  // Group colors for better context
  const primaryColors = data.colors.filter(c => c.role === 'primary').map(c => c.hex).join(', ');
  const secondaryColors = data.colors.filter(c => c.role === 'secondary').map(c => c.hex).join(', ');
  const bgColors = data.colors.filter(c => c.role === 'background').map(c => c.hex).join(', ');
  const textColors = data.colors.filter(c => c.role === 'text').map(c => c.hex).join(', ');
  const allColorsFormatted = data.colors.slice(0, 15).map(c => `- ${c.hex} (${c.role || 'auto'})`).join('\n');

  // Fonts
  const fontDetails = data.fonts.map(f => `- Family: "${f.family}" (Weights: ${f.variants.join(', ')})`).join('\n');
  
  // Tech Stack
  const techStack = data.technologies.join(', ');

  // Spacing
  const spacingSummary = `Base Unit: ${data.spacing.length > 0 ? 'Detected' : 'Unknown'}. Found ${data.spacing.length} unique spacing tokens.`;

  // --- "Clone" Prompt (The Heavy Hitter) ---
  const clonePrompt = `
You are an expert Senior Frontend Engineer and UI/UX Designer.
Your task is to recreate a website's landing page as a reusable React clone, **pixel-perfectly matching the design system** provided below.

## 1. Project Context
- **Title**: ${data.meta.title}
- **Description**: ${data.meta.description}
- **Tech Stack**: ${techStack}
- **Framework**: React + Tailwind CSS (Use generic CSS variables if Tailwind config is restricted).

## 2. Design Tokens (STRICT ENFORCEMENT)
Use ONLY these tokens. Do not invent new colors or fonts.

### 🎨 Color Palette
**Primary**: ${primaryColors || 'See list'}
**Secondary**: ${secondaryColors || 'See list'}
**Backgrounds**: ${bgColors || 'See list'}
**Text**: ${textColors || 'See list'}

**Full Palette:**
${allColorsFormatted}

### 🔤 Typography
${fontDetails}
*Instruction: Use Google Fonts to load these families.*

### 📐 Spacing & Layout
${spacingSummary}
*Instruction: Use a consistent 4px or 8px grid system for margins and paddings.*

## 3. Implementation Instructions
1.  **Setup**: Create a \`Layout\` component that wraps the page with the main background color and font family.
2.  **Variables**: Define a \`tailwind.config.js\` (or CSS variables) mapping the "Primary" and "Secondary" colors above to semantic names (e.g., \`primary\`, \`secondary\`, \`accent\`).
3.  **Components**: Build the page sections (Hero, Features, Footer) based on standard modern web patterns, BUT applying the *exact* colors and fonts listed above.
4.  **Responsiveness**: Ensure mobile-first responsive design.

**Output**: Provide the full code for the main landing page component and the Tailwind configuration.
`.trim();

  const midjourneyPrompt = `
/imagine prompt: Website UI design for "${data.meta.title}", ${data.meta.description}. Style: Modern, Professional. Colors: ${primaryColors} (Primary), ${bgColors} (Background). Typography: Clean Sans-Serif. High fidelity, Dribbble, Behance --v 6.0
  `.trim();

  const prompts = [
      {
          id: 'clone',
          icon: FileCode,
          title: "Full Website Clone Prompt",
          subtitle: "Detailed System Spec for LLMs (Claude 3.5 Sonnet / GPT-4)",
          content: clonePrompt,
          color: "text-green-500",
          bg: "bg-green-500/10",
          border: "border-green-500/20"
      },
      {
          id: 'visual',
          icon: Palette,
          title: "Visual Design Prompt",
          subtitle: "For Midjourney, DALL-E",
          content: midjourneyPrompt,
          color: "text-purple-500",
          bg: "bg-purple-500/10",
          border: "border-purple-500/20"
      }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black tracking-tight mb-2 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            AI Prompt Generator
        </h2>
        <p className="text-muted-foreground">
            Turn extracted analytics into detailed specifications for AI coding assistants.
        </p>
      </div>

      <div className="grid gap-6">
          {prompts.map((p) => (
              <div key={p.id} className={clsx("bg-card rounded-2xl border p-5 transition-all hover:shadow-lg", p.border)}>
                  <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                          <div className={clsx("p-3 rounded-xl", p.bg)}>
                              <p.icon className={clsx("w-6 h-6", p.color)} />
                          </div>
                          <div>
                              <h3 className="font-bold text-lg">{p.title}</h3>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{p.subtitle}</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => copyToClipboard(p.content, p.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-bold"
                      >
                          {copied === p.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied === p.id ? 'Copied!' : 'Copy'}
                      </button>
                  </div>
                  
                  <div className="bg-secondary/50 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-border/50 relative group max-h-60 overflow-y-auto">
                      <code className="text-foreground/80 block whitespace-pre-wrap leading-relaxed">
                          {p.content}
                      </code>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
