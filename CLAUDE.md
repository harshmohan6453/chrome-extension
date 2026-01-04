# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Design Inspector** is a Chrome extension that extracts design systems, analyzes visual properties, detects technologies, and generates AI-ready prompts from any website. It helps developers and designers reverse-engineer design systems and recreate components using AI tools.

## Common Commands

### Development
```bash
# Start development server with hot reload
npm run dev

# Build extension for production
npm run build

# Preview production build
npm run preview
```

### Backend (Optional - for AI prompt enhancement)
```bash
cd backend
node server.cjs
```

The backend is optional and provides AI-powered prompt refinement using Gemini. The extension works without it.

## Architecture Overview

### Extension Structure

This is a **Chrome Manifest V3 extension** with three main execution contexts:

1. **Background Service Worker** (`src/background/service-worker.ts`)
   - Handles screenshot capture via `chrome.tabs.captureVisibleTab`
   - Proxies requests to optional backend API for AI prompt enhancement
   - Minimal logic - primarily message relay

2. **Content Scripts** (`src/content-scripts/`)
   - **content.ts**: Main orchestrator that injects page context script and coordinates extractors
   - **inspector.ts**: Visual inspection UI with hover overlays, tooltips, measurement guides, and detail cards
   - **pageContext.js**: Injected into page context to access `window` variables (e.g., `window.ScrollTrigger`)
   - **extractors/**: Individual modules for extracting specific data types

3. **Popup UI** (`src/popup/`)
   - React app with Zustand state management
   - Tab-based interface for viewing extracted data
   - Components mirror data categories (Typography, Colors, Assets, etc.)

### Data Flow

```
Page Load
  ↓
Content Script Injected
  ↓
Popup Opens → Sends GET_PAGE_DATA message
  ↓
Content Script:
  - Injects pageContext.js
  - Runs extractors in parallel
  - Waits for page context responses (scroll animations)
  - Returns aggregated data
  ↓
Popup stores data in Zustand → Renders UI
```

### Key Communication Patterns

- **Popup ↔ Content Script**: `chrome.tabs.sendMessage` / `chrome.runtime.onMessage`
- **Content Script ↔ Page Context**: `window.postMessage` / `window.addEventListener('message')`
- **Background ↔ Backend**: `fetch()` to localhost:3000

### Extractors

Each extractor in `src/content-scripts/extractors/` is a standalone module:

- **fontExtractor.ts**: Parses `getComputedStyle()` for font families, sizes, weights
- **colorExtractor.ts**: Extracts colors from text, backgrounds, borders, categorizes by role
- **spacingExtractor.ts**: Detects spacing patterns (margin/padding values)
- **assetExtractor.ts**: Extracts images, SVGs, videos, background images
- **scrollAnimationDetector.ts**: Detects GSAP ScrollTrigger, Framer Motion, Locomotive, AOS, etc.
- **redFlagDetector.ts**: SEO/UX/accessibility audit (missing alt text, excessive nesting, etc.)
- **htmlExtractor.ts**: Cleans and structures HTML for AI prompt generation
- **siteCloneExtractor.ts**: Comprehensive extraction for full site recreation
- **flowRecorder.ts**: Records user interaction flows (clicks, navigation, inputs)

Extractors are **lazy-loaded** where possible (e.g., red flags only load when tab is opened).

### State Management (Zustand)

Store: `src/store/index.ts`

Key state slices:
- `data`: InspectionData (fonts, colors, spacing, assets, scrollAnimations, redFlags, etc.)
- `isInspecting`: Boolean for visual inspector mode
- `preferences`: User settings (color format, unit format)
- `redFlagsLoaded`, `scrollAnimationsLoaded`: Lazy loading flags

### Inspector Visual Tools

The `Inspector` class (`inspector.ts`) provides:
- **Overlay**: Highlights hovered elements
- **Tooltip**: Shows tag name, class, dimensions
- **Detail Card**: Persistent card with box model, typography, colors, effects
- **Measurement Guides**: Red lines showing pixel distances between selected and hovered elements (Figma-style)
- **Hover Mode Toggle**: Auto-select on hover vs. click-to-select
- **Prompt Generation**: "GOD-TIER" prompts extracting 100+ CSS properties, pseudo-elements, interactive states

### Build System (Vite)

- **Multi-entry setup**: popup.html, content.ts, service-worker.ts
- **Custom plugin**: Copies `pageContext.js` to dist root (required for `web_accessible_resources`)
- **Output naming**: content.js, service-worker.js (matches manifest.json)

## Key Implementation Details

### Content Script Injection Strategy

The popup attempts to send messages to the content script. If it fails (not injected yet), it:
1. Calls `chrome.scripting.executeScript` to inject content.js
2. Waits 100ms for initialization
3. Retries the message

### Scroll Animation Detection Multi-Strategy

Content script requests animations from page context via `postMessage`, then:
1. Waits 500ms for page context response
2. Falls back to content script detection if no response
3. Retries at 2s and 4s delays (some sites load ScrollTrigger late)
4. Sends updates to popup via `chrome.runtime.sendMessage`

### Element Highlighting Strategy

When user clicks an element in the UI to highlight it on the page:
1. Tries `document.querySelector(selector)`
2. Falls back to `getElementById` (for escaped IDs)
3. Falls back to `getElementsByClassName` (for complex classes)
4. Falls back to `getElementsByTagName`
5. Shows instant highlight at current position
6. Scrolls element into view (smooth)
7. Updates highlight after 300ms to final position
8. Pulses and fades out after 3 seconds

### AI Prompt Generation

Two levels:
1. **Inspector prompt** (`generatePrompt()` in inspector.ts): Extracts every CSS property for a single element
2. **Site Clone prompt** (GeneratePanel.tsx): Uses screenshot + HTML structure + design tokens for full-page recreation

Backend (optional) refines prompts using Gemini vision model.

## Common Patterns

### Adding a New Extractor

1. Create `src/content-scripts/extractors/myExtractor.ts`
2. Export function that returns data (no side effects)
3. Import in `content.ts` and call in `GET_PAGE_DATA` handler
4. Add data to `InspectionData` interface in `src/store/index.ts`
5. Create UI panel component in `src/popup/components/`
6. Add tab to `App.tsx`

### Adding a New Panel Tab

1. Create component in `src/popup/components/MyPanel.tsx`
2. Import in `App.tsx`
3. Add to `tabs` array with icon and label
4. Add case to `renderContent()` switch

### Working with Zustand Store

```typescript
import { useStore } from '../store';

const { data, setData } = useStore();
// Update partial data
setData({ fonts: newFonts });
```

## Special Considerations

### Content Security Policy (CSP)

Some sites block content script injection. The extension handles this gracefully with error messages. Users must refresh the page.

### Cross-Origin Resources

Background images, fonts, and scripts from different origins may not be fully accessible. Extractors handle exceptions.

### Performance

- Extractors run in parallel where possible
- Lazy loading for expensive operations (red flags, scroll animations)
- Debounced/throttled DOM queries in inspector
- Limit extracted data (e.g., max 100 colors)

### Manifest V3 Constraints

- Service worker is ephemeral (doesn't persist)
- No inline scripts (all JS bundled)
- `web_accessible_resources` required for pageContext.js

## Tech Stack

- **TypeScript** - All source files
- **React 18** - Popup UI
- **Zustand** - State management
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations in UI
- **Lucide React** - Icons
- **Chrome Extension APIs** - Manifest V3

## Backend (Optional)

- **Express.js** - API server
- **Google Gemini** - AI prompt refinement
- **CORS enabled** - For extension access
- Port 3000 by default

## Important Files

- **public/manifest.json**: Extension manifest (permissions, content scripts, background)
- **vite.config.ts**: Build configuration with custom plugin
- **src/content-scripts/content.ts**: Main content script entry point
- **src/popup/App.tsx**: Popup UI entry point
- **src/store/index.ts**: Global state definitions
