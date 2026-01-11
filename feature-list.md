# WebSnatch - Chrome Extension
## Complete Feature List & Specifications

**Version:** 1.0.0  
**Product Name:** WebSnatch  
**Tagline:** Extract design systems and generate AI prompts from any website.  
**Publisher:** [Divtechnosoft](https://www.divtechnosoft.com/)

---

## 🎯 Product Overview

WebSnatch is a powerful developer tool for designers, developers, and product teams to extract, analyze, and recreate web components with pixel-perfect accuracy. Built with React, TypeScript, and Tailwind CSS, it offers a neubrutalist, PostHog-inspired UI with dark/light mode support.

---

## 🚀 Core Features

### 📊 Overview Dashboard
**Status:** ✅ IMPLEMENTED

The main landing screen provides a quick summary of the analyzed page with interactive stats cards.

**Features:**
- Visual Inspector toggle with on/off switch
- Quick stats grid showing:
  - Font Families count
  - Color Palette count  
  - Spacing Tokens count
  - Assets count
- Current page info card (title, URL, description)
- Generate AI Prompt CTA button
- Sidebar mode support (pin as side panel)

---

### 🔤 Typography Panel
**Status:** ✅ IMPLEMENTED

Comprehensive font detection and analysis system.

**Features:**
- ✅ Detect all font families used on page
- ✅ Extract font fallback stacks
- ✅ Identify font sizes (px, rem) with conversion
- ✅ Capture font weights (100-900)
- ✅ Extract line-heights
- ✅ Detect font sources (Google, Adobe, System, Custom)
- ✅ Group fonts by family with variant breakdown
- ✅ Show usage count per font family
- ✅ One-click copy individual font CSS
- ✅ Export all typography as CSS with font-face rules

**UI Elements:**
- Font family cards with live preview
- Weight/style variant pills
- Size breakdown list
- "Copy CSS" button per font
- "Export All" button for CSS export

---

### 🎨 Color Studio
**Status:** ✅ IMPLEMENTED

Advanced color extraction and accessibility analysis.

**Features:**
- ✅ **EyeDropper Tool** - Native system-wide color picker
- ✅ Extract all colors from page (text, background, border)
- ✅ Display multiple formats (HEX, RGB, HSL)
- ✅ Show color usage frequency
- ✅ Categorize colors by type (text, background, border)
- ✅ **Palette Overview** - Visual color strip of top 20 colors
- ✅ **Contrast Checker** - WCAG AA/AAA compliance testing
- ✅ Select background + text color to check contrast ratio
- ✅ Live contrast preview with sample text
- ✅ Expandable color details with all formats
- ✅ One-click copy any color format

**Export:**
- ✅ Export as CSS custom properties (`:root` variables)
- ✅ Export as Tailwind config

**UI Elements:**
- Pipette button for color picking
- Picked color modal with all formats
- Color palette strip overview
- Contrast checker with background/text selectors
- Expandable color cards sorted by usage

---

### 📐 Spacing Panel
**Status:** ✅ IMPLEMENTED

Spacing token extraction and scale analysis.

**Features:**
- ✅ Extract unique spacing values from margins and paddings
- ✅ Detect spacing patterns (8px grid, 4px base)
- ✅ Calculate greatest common divisor for base unit
- ✅ Generate spacing scale recommendations
- ✅ Visual grid overlay for spacing
- ✅ Export spacing tokens as CSS variables

**UI Elements:**
- Spacing scale visualization
- Unique spacing values list
- Base unit detection
- Export as CSS button

---

### 🖼️ Assets Panel
**Status:** ✅ IMPLEMENTED

Asset detection and extraction.

**Features:**
- ✅ List all images with:
  - URL
  - Format (JPEG, PNG, WebP, SVG, GIF)
  - Dimensions
  - Alt text (if available)
- ✅ Detect SVGs (inline and referenced)
- ✅ Extract video sources
- ✅ Background image detection
- ✅ One-click download/view assets
- ✅ Filter assets by type

**UI Elements:**
- Asset cards with thumbnail preview
- Type filter buttons
- Download buttons
- View in new tab option

---

### 🎬 Scroll Animation Inspector
**Status:** ✅ IMPLEMENTED

**Market Differentiator:** First-to-market comprehensive scroll animation analysis.

**Supported Libraries:**
- ✅ **GSAP ScrollTrigger**
- ✅ **Framer Motion** (whileInView)
- ✅ **Locomotive Scroll**
- ✅ **AOS** (Animate On Scroll)
- ✅ **Intersection Observer API**
- ✅ **CSS Scroll Timeline**
- ✅ **ScrollMagic** (partial)

**Features:**
- ✅ Detect all scroll-based animations
- ✅ Identify which library is being used
- ✅ Extract trigger configuration:
  - Trigger element selector
  - Start/end positions
  - Scrub settings
  - Pin settings
  - Toggle actions
  - Threshold values
- ✅ Extract animation properties:
  - Animated CSS properties
  - Duration
  - Easing function
  - Delay
- ✅ Library filtering with color-coded badges
- ✅ Statistics dashboard:
  - Total animations count
  - Libraries detected count
  - Scrubbed animations count
- ✅ Highlight animated elements on page
- ✅ Code export for each library format

**Export Code Examples:**
- GSAP ScrollTrigger config
- Framer Motion JSX
- Locomotive Scroll markup
- AOS data attributes
- Vanilla Intersection Observer

**UI Elements:**
- Animation list with library badges
- Expandable animation details
- Element highlight button
- Copy code button
- Filter by library buttons
- Statistics cards
- Empty state with supported libraries list

---

### ⚠️ Red Flags Detector (SEO + UX Audit)
**Status:** ✅ IMPLEMENTED

Comprehensive analyzer for SEO, UX, accessibility, mobile, and performance issues.

**Features:**
- 📊 **Global Health Score** - 0-100 rating based on weighted severity
- 📥 **Export Reports** - Download analysis as Markdown
- 👁️ **View Modes** - Group by Priority or Page Section

**Detection Categories:**

**SEO (25+ Checks):**
- ✅ H1 tag validation (missing, multiple)
- ✅ Heading hierarchy (H1 → H2 → H3 sequence)
- ✅ Title tag (missing, too long >60, too short <30)
- ✅ Meta description (missing, too long >160, too short <50)
- ✅ Canonical URL presence
- ✅ Open Graph tags
- ✅ Twitter Card meta tags
- ✅ Robots meta (noindex, nofollow detection)
- ✅ Structured data (JSON-LD)
- ✅ Language attribute on `<html>`
- ✅ Images without alt text
- ✅ Images without dimensions (CLS issue)
- ✅ Generic link text ("click here", "read more")
- ✅ Empty links (href="#")
- ✅ External links missing rel="noopener"
- ✅ Missing favicon
- ✅ Duplicate meta descriptions
- ✅ Empty headings
- ✅ Too many H2 tags (>15)

**UX Anti-Patterns:**
- ✅ Form fields without labels
- ✅ Buttons styled as links

**Accessibility:**
- ✅ Interactive elements without ARIA labels
- ✅ Low contrast text detection

**Mobile Issues:**
- ✅ Missing viewport meta tag
- ✅ Text too small (<12px)
- ✅ Touch targets too small (<44x44px)

**Performance Hints:**
- ✅ Large inline images (data URLs)
- ✅ Large DOM size (>1500 nodes)
- ✅ Render-blocking scripts in `<head>`

**Severity Levels:**
- 🔴 **Critical** - Must fix (noindex, missing H1, missing viewport)
- 🟡 **Warning** - Should fix (heading hierarchy, missing alt)
- 🔵 **Info** - Nice to have (structured data, Twitter Card)

**UI Elements:**
- Global health score badge
- Severity-grouped issue cards
- Category badges (SEO, UX, A11y, Mobile, Performance)
- Issue count indicators
- Actionable recommendations
- Export to Markdown button

---

### 📹 User Flow Recorder
**Status:** ✅ IMPLEMENTED

A "flight recorder" for UX research that auto-generates flowcharts.

**Features:**
- 🔴 **One-Click Recording** - Start/stop recording button
- ✅ Capture clicks, navigation, and form inputs
- 🔗 **Cross-Page Persistence** - Records across multiple pages
- 🎨 **Auto-Diagrams** - Generates Mermaid.js flowchart code
- 🧩 **Smart Selectors** - Auto-generates CSS selectors
- 📋 **Export** - Copy diagram code for Notion, GitHub, Obsidian

**UI Elements:**
- Record/Stop button with timer
- Flow steps list
- Mermaid preview
- Copy diagram code button
- Clear recording button

---

### 🔍 Visual Inspector ("God-Tier" Mode)
**Status:** ✅ IMPLEMENTED

Holistic element inspection with AI prompt generation.

**Features:**
- ✅ **Toggle On/Off** from Overview dashboard
- ✅ Hover highlight with customizable color
- ✅ Click to inspect any element
- ✅ **Component Recreation Prompt** - One-click "God-Tier" prompt
- ✅ **Complete Computed Styles** - All active CSS properties
- ✅ **Box Model Visualization** - Margin, border, padding, content
- ✅ Pseudo-element detection (::before, ::after)
- ✅ Interactive state analysis (:hover, :focus)
- ✅ Asset extraction from component
- ✅ Smart guides and distance measurement

**Sidebar Mode:**
- ✅ Pin inspector as sidebar panel
- ✅ Element data syncs to sidebar
- ✅ Persistent inspection across interactions

**UI Elements:**
- Floating element detail card (on-page)
- Inspector panel (in sidebar mode)
- "✨ PROMPT" button for God-Tier prompt
- "📋 CSS" button for copying styles
- Box model visualization
- Close/disable toggle

---

### ✨ Generate Panel (AI Prompt Generator)
**Status:** ✅ IMPLEMENTED

**Killer Feature:** Comprehensive AI prompt generation for design recreation.

**Features:**
- ✅ Generate detailed prompts from all extracted data
- ✅ **Target AI Tools:**
  - v0.dev (Vercel)
  - Lovable.dev
  - Cursor AI
  - Bolt.new
  - Claude
  - ChatGPT
- ✅ **Framework Selection:**
  - React
  - Vue
  - Svelte
  - Next.js
  - Plain HTML/CSS
- ✅ **Styling Selection:**
  - Tailwind CSS
  - Regular CSS
  - SCSS
- ✅ **Detail Levels:**
  - Basic (colors, fonts, layout)
  - Detailed (+ spacing, shadows)
  - Comprehensive (+ animations, assets)
- ✅ Toggle sections to include/exclude
- ✅ Live prompt preview
- ✅ Character count
- ✅ Copy to clipboard

**Prompt Structure:**
```markdown
# Design System
- Color palette
- Typography scale
- Spacing system
- Shadow definitions

# Layout
- Page structure
- Layout system (Grid/Flexbox)
- Container widths

# Components
- Component specifications
- Key styles
- Interactions

# Animations
- Animation types
- Timing and duration
- Easing functions

# Technical Requirements
- Framework
- Required libraries
- Accessibility
```

---

### ⚙️ Settings Panel
**Status:** ✅ IMPLEMENTED

User preferences and configuration.

**Settings:**
- ✅ **Theme** - Light / Dark / System
- ✅ **Highlight Color** - Customizable inspector highlight color
- ✅ **Color Format** - HEX / RGB / HSL preference
- ✅ **Unit Format** - px / rem preference
- ✅ **Reset Preferences** button

**Footer:**
- Version display
- Report Issue link (mailto: sales@divtechnosoft.com)
- "Powered by Divtechnosoft" branding

---

## 🎨 Design System

### Neubrutalism Theme
The extension uses a PostHog-inspired neubrutalist design language:

**Light Mode:**
- Background: Warm beige `hsl(40, 20%, 92%)` - #EEEAE3
- Foreground: Dark charcoal `hsl(220, 25%, 12%)`
- Primary: Vibrant orange `hsl(18, 100%, 48%)` - #F54E00
- Accent: Yellow `hsl(48, 96%, 53%)` - #FDC931
- Cards: Pure white with hard shadows

**Dark Mode:**
- Background: Deep charcoal `hsl(220, 25%, 10%)`
- Foreground: Warm beige `hsl(40, 22%, 91%)`
- Primary: Brighter orange `hsl(18, 100%, 55%)`
- Cards: Dark slate with subtle borders

**Visual Effects:**
- `neo-shadow` - Hard offset shadows (no blur)
- `card-hover` - Translate + shadow on hover
- `neo-button` - 3D button effect
- `grain-bg` - Subtle texture overlay
- Custom scrollbars

---

## 🛠️ Technical Stack

**Architecture:**
```
Manifest V3 Chrome Extension
├── popup.html / sidepanel.html
├── src/
│   ├── popup/
│   │   ├── App.tsx (Main app)
│   │   └── components/ (12 panel components)
│   ├── content-scripts/
│   │   ├── content.ts (Injected script)
│   │   ├── inspector.ts (Visual inspector)
│   │   └── extractors/ (10 extraction modules)
│   ├── store/ (Zustand state)
│   └── analytics/ (PostHog integration)
└── public/manifest.json
```

**Tech Stack:**
- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS with custom design tokens
- **State:** Zustand
- **Build:** Vite
- **Icons:** Lucide React
- **Analytics:** PostHog (opt-in)

**Permissions:**
- `activeTab` - Access current tab
- `scripting` - Inject content scripts
- `storage` - Store preferences
- `sidePanel` - Sidebar mode

---

## 📁 File Structure

### Popup Components
| File | Purpose |
|------|---------|
| `App.tsx` | Main application shell, tab navigation |
| `TypographyPanel.tsx` | Font extraction UI |
| `ColorPanel.tsx` | Color palette + contrast checker |
| `SpacingPanel.tsx` | Spacing tokens UI |
| `AssetsPanel.tsx` | Image/video/SVG gallery |
| `ScrollInspectorPanel.tsx` | Scroll animation analysis |
| `RedFlagsPanel.tsx` | SEO/UX audit UI |
| `FlowsPanel.tsx` | User flow recorder |
| `InspectorPanel.tsx` | Element inspector (sidebar) |
| `GeneratePanel.tsx` | AI prompt generator |
| `SettingsPanel.tsx` | Preferences UI |
| `TypographyCard.tsx` | Font family card component |
| `UpdateRequiredScreen.tsx` | Force update screen |

### Content Script Extractors
| File | Purpose |
|------|---------|
| `content.ts` | Main content script, message handling |
| `inspector.ts` | Visual inspector overlay |
| `colorExtractor.ts` | Color extraction |
| `fontExtractor.ts` | Typography extraction |
| `spacingExtractor.ts` | Spacing value extraction |
| `assetExtractor.ts` | Image/video/SVG detection |
| `scrollAnimationDetector.ts` | Scroll animation detection |
| `redFlagDetector.ts` | SEO/UX issue detection |
| `flowRecorder.ts` | User interaction recording |
| `godTierExtractor.ts` | Component prompt generation |
| `siteCloneExtractor.ts` | Full page data extraction |
| `htmlExtractor.ts` | HTML structure analysis |
| `pageContext.js` | Page context script (injected) |

---

## 🔒 Security

- ✅ **Safe Inspection** - All extraction runs in isolated content script
- ✅ **No Remote Code** - No external script execution
- ✅ **Input Sanitization** - HTML escaping via `escapeHtml()` utility
- ✅ **Restricted URL Handling** - Graceful handling of chrome://, edge://, etc.
- ✅ **Console Cleanup** - No console.log in production content scripts

---

## 📊 Analytics (Opt-in)

PostHog integration for anonymous usage analytics:

**Tracked Events:**
- Popup opened
- Tab viewed
- Website domain analyzed
- Inspector toggled
- Prompt generated
- Export performed
- Errors encountered

---

## 🚀 Installation

1. Clone the repository
2. Run `npm install`
3. Run `npm run build`
4. Load `dist` folder as unpacked extension in Chrome (`chrome://extensions`)

---

## 📞 Support

- **Publisher:** [Divtechnosoft](https://www.divtechnosoft.com/)
- **Report Issues:** sales@divtechnosoft.com
- **Version:** 1.0.0

---

## 🗺️ Future Roadmap

### Planned Features (Not Yet Implemented)
- [ ] Screenshot & annotation tool
- [ ] Comparison mode (compare two sites)
- [ ] History & favorites
- [ ] Team workspace (Pro)
- [ ] Performance metrics (Core Web Vitals)
- [ ] Responsive design simulator
- [ ] Figma tokens export
- [ ] Chrome Web Store listing

---

*Last Updated: January 2026*