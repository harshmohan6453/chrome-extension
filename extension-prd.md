# Product Requirements Document (PRD)
## Design Inspector Chrome Extension

**Version:** 1.0  
**Date:** December 2024  
**Document Owner:** Product Team  
**Status:** Draft for Development

---

## Executive Summary

Design Inspector is a Chrome extension that allows developers and designers to analyze any website's design system, extract visual properties, detect technologies, and generate AI-ready prompts to recreate the design in tools like v0, Lovable, Cursor, and Bolt.

### Problem Statement
Developers and designers spend hours manually inspecting websites to understand their design systems, copying CSS values, identifying fonts and colors, and manually documenting specifications for replication. Current tools are fragmented, requiring multiple extensions for different tasks.

### Solution
A comprehensive, all-in-one Chrome extension that automatically extracts, analyzes, and documents all design properties from any website, with the unique capability to generate AI prompts for instant recreation.

### Success Metrics
- 10,000+ active users within 3 months of launch
- 4.5+ star rating on Chrome Web Store
- 70%+ user retention after first week
- 1,000+ generated AI prompts per week

---

## Target Users

### Primary Users
1. **Frontend Developers** (60%)
   - Need to replicate designs quickly
   - Want to understand how sites are built
   - Building similar features/components

2. **UI/UX Designers** (25%)
   - Researching design patterns
   - Creating design systems
   - Competitive analysis

3. **Product Managers** (10%)
   - Analyzing competitor products
   - Creating feature specifications
   - Documenting requirements

4. **Students/Learners** (5%)
   - Learning web development
   - Understanding design principles
   - Building portfolio projects

---

## Core Features

### 1. Visual Design Extraction

#### 1.1 Typography Analyzer
**Priority:** P0 (Must Have)

**Functionality:**
- Detect all fonts used on the page
- Extract font families (including fallback stacks)
- Identify font sizes (px, rem, em)
- Capture font weights (100-900, normal, bold)
- Detect line heights
- Extract letter spacing
- Identify text transforms (uppercase, lowercase, capitalize)
- Show font loading method (web fonts, Google Fonts, local fonts)

**User Experience:**
- Click any text element to inspect its typography
- View all unique fonts used across the entire page
- See font hierarchy (headings, body, captions)
- One-click copy font CSS declarations

**Technical Requirements:**
- Use `getComputedStyle()` API
- Parse `font-family` values correctly
- Detect `@font-face` declarations
- Identify font service providers (Google Fonts, Adobe Fonts, etc.)

---

#### 1.2 Color Palette Extractor
**Priority:** P0 (Must Have)

**Functionality:**
- Extract all colors from the page
- Categorize colors (primary, secondary, neutral, accent)
- Show color usage frequency
- Display colors in multiple formats (HEX, RGB, HSL)
- Generate color palette with shades
- Identify background colors, text colors, border colors
- Extract gradient definitions
- Detect shadow colors

**User Experience:**
- Visual color palette display
- Click any color to copy HEX code
- Filter colors by type (backgrounds, text, borders)
- Export palette as JSON, CSS variables, or design tokens
- Color accessibility checker (contrast ratios)

**Technical Requirements:**
- Parse computed styles for all color properties
- Convert between color formats
- Cluster similar colors (color grouping algorithm)
- Calculate color frequency
- WCAG contrast ratio calculations

---

#### 1.3 Spacing & Layout Analyzer
**Priority:** P0 (Must Have)

**Functionality:**
- Extract margins, paddings for all elements
- Detect gap values (flexbox, grid)
- Identify spacing patterns (8px grid, 4px base)
- Show layout system (flexbox, grid, float, position)
- Extract grid properties (columns, rows, gaps)
- Capture flexbox properties (direction, wrap, align, justify)
- Detect positioning (absolute, relative, fixed, sticky)
- Measure element dimensions (width, height)

**User Experience:**
- Hover over elements to see spacing overlay
- Visual spacing indicators (boxes showing margins/padding)
- Spacing scale detection (find the design system pattern)
- Click element to see detailed box model

**Technical Requirements:**
- Access computed margin, padding values
- Parse CSS Grid and Flexbox properties
- Calculate spacing scale using GCD algorithm
- Create visual overlay for spacing

---

#### 1.4 Shadows & Effects
**Priority:** P1 (Should Have)

**Functionality:**
- Extract box shadows
- Capture text shadows
- Detect opacity values
- Identify CSS filters (blur, brightness, contrast, etc.)
- Extract backdrop filters
- Capture blend modes

**User Experience:**
- List all unique shadow definitions
- Preview shadows visually
- Copy shadow CSS
- See which elements use each shadow

**Technical Requirements:**
- Parse complex shadow strings
- Handle multiple shadows on one element
- Extract filter function values

---

#### 1.5 Borders & Shapes
**Priority:** P1 (Should Have)

**Functionality:**
- Extract border widths, styles, colors
- Capture border-radius values
- Detect outline properties
- Identify clip-path shapes
- Extract transform properties

**User Experience:**
- Show all unique border radius values
- Visual preview of shapes
- Copy border CSS

---

### 2. Animation & Interaction Detection

#### 2.1 CSS Animation Inspector
**Priority:** P1 (Should Have)

**Functionality:**
- Detect CSS animations
- Extract keyframe definitions
- Capture animation properties (duration, timing, delay, iteration)
- Identify transition properties
- Detect transform animations
- Extract scroll-triggered animations (intersection observer)

**User Experience:**
- List all animations on the page
- Play/pause animations
- Show animation timeline
- Export animation CSS

**Technical Requirements:**
- Parse `@keyframes` rules from stylesheets
- Access animation computed styles
- Detect JavaScript-based animations (GSAP, Anime.js patterns)
- Extract transition properties

---

#### 2.2 Hover & Interactive States
**Priority:** P2 (Nice to Have)

**Functionality:**
- Capture hover state styles
- Detect focus states
- Identify active states
- Extract disabled state styles

**User Experience:**
- Toggle between states visually
- See style differences between states
- Copy state-specific CSS

**Technical Requirements:**
- Force pseudo-states via DevTools Protocol
- Compare computed styles between states

---

#### 2.3 Scroll & Animation Inspector ⭐ **NEW KILLER FEATURE**
**Priority:** P0 (Must Have - Market Differentiator)

**Market Gap:**
No extension currently provides comprehensive scroll animation analysis. Developers spend hours reverse-engineering scroll effects manually. This feature positions the extension as the first true "Scroll Behavior Inspector" and could drive 30-40% of total installs.

**Functionality:**
- Detect all scroll-triggered animations automatically
- Identify animation libraries:
  - GSAP ScrollTrigger (industry standard)
  - Framer Motion (viewport animations)
  - Locomotive Scroll (smooth scrolling & parallax)
  - AOS (Animate On Scroll)
  - ScrollMagic (scene-based interactions)
  - Intersection Observer API (native patterns)
  - CSS Scroll Timeline (experimental spec)
- Extract complete trigger configurations:
  - Trigger element selector
  - Start/end positions or thresholds
  - Scrub settings (boolean or numeric)
  - Pin configurations
  - Toggle actions (GSAP-specific)
  - Once/repeat flags
- Show animated properties and timings:
  - CSS properties being animated
  - Animation type (CSS, JS, transform, opacity)
  - Duration in milliseconds
  - Easing functions
  - Delays and speeds
- Visual timeline with all scroll animations mapped
- Interactive scrubber to preview animations at different scroll positions
- Highlight trigger elements directly on the page
- Export working code for each animation in library-specific format

**User Experience:**
- Dedicated "Scroll Animations" tab in popup
- Visual timeline showing all animations across page scroll
- Click animation card to expand and see full details
- Filter animations by library type (GSAP, Framer, Locomotive, etc.)
- Color-coded library badges for quick identification
- One-click code export with clipboard confirmation
- Highlight button to visually locate elements on page
- Statistics dashboard (total animations, libraries used, scrubbed count)
- Empty state with supported libraries list
- Expandable animation cards with trigger and property details

**Technical Requirements:**
- Access GSAP ScrollTrigger instances: `ScrollTrigger.getAll()`
- Detect Framer Motion via `[data-framer-appear-id]` and component internals
- Parse Locomotive Scroll `[data-scroll]` attributes
- Identify AOS animations via `[data-aos]` attributes
- Monitor Intersection Observer pattern usage
- Detect experimental CSS `animation-timeline` property
- Generate element selectors (ID, class, or nth-of-type)
- Build visual timeline mapping scroll position to animation triggers
- Implement message passing for element highlighting
- Create library-specific code export templates

**Success Metrics:**
- This feature alone could be a primary driver of extension adoption
- High engagement (users exploring scroll animations on popular sites)
- Social sharing potential (developers showcasing scroll breakdowns)
- Premium feature candidate for future monetization
- Positions extension as essential tool for learning modern animation techniques

---


### 3. Technology Detection

#### 3.1 Framework & Library Detection
**Priority:** P0 (Must Have)

**Functionality:**
- Detect frontend frameworks (React, Vue, Angular, Svelte, Next.js)
- Identify CSS frameworks (Tailwind, Bootstrap, Material UI, Chakra UI)
- Detect animation libraries (GSAP, Framer Motion, Anime.js)
- Identify utility libraries (Lodash, jQuery)
- Detect state management (Redux, Zustand, MobX)
- Identify build tools (Webpack, Vite, Parcel)

**Detection Methods:**
- DOM structure patterns (React's `__reactFiber$`, Vue's `__vue__`)
- Global variables (`React`, `Vue`, `angular`)
- Script tag analysis (CDN URLs)
- CSS class naming patterns (`tw-`, `MuiButton-`)
- Meta tag analysis (`next.js`, `gatsby`)

**User Experience:**
- Technology stack visualization
- Confidence scores for each detection
- Version numbers where available
- Links to official documentation

**Technical Requirements:**
- Pattern matching algorithms
- Script tag parsing
- DOM structure analysis
- Wappalyzer-style fingerprinting

---

#### 3.2 Asset Detection
**Priority:** P1 (Should Have)

**Functionality:**
- List all images with dimensions and formats
- Detect icon libraries (Font Awesome, Material Icons, Lucide)
- Identify SVG usage
- Extract video sources
- Detect web fonts and font files
- Identify CDN usage

**User Experience:**
- Asset gallery view
- Filter by type (images, icons, fonts, videos)
- Show file sizes and formats
- Export asset URLs

**Technical Requirements:**
- DOM traversal for asset elements
- Detect icon font classes
- Parse SVG elements
- Extract resource URLs from Network tab (optional)

---

### 4. AI Prompt Generation (★ KILLER FEATURE)

#### 4.1 Comprehensive Prompt Generator
**Priority:** P0 (Must Have)

**Functionality:**
- Generate detailed prompts from extracted design data
- Customize for target tools (v0, Lovable, Cursor, Bolt, Claude)
- Select framework preference (React, Vue, HTML, Svelte)
- Choose styling approach (Tailwind, CSS, styled-components)
- Adjust detail level (Basic, Detailed, Comprehensive)
- Include/exclude sections (animations, responsive design, accessibility)

**Prompt Sections:**
1. **Design System**
   - Color palette with categorization
   - Typography scale
   - Spacing system
   - Shadows and effects
   - Border styles

2. **Layout Structure**
   - Section breakdown
   - Layout system (Grid/Flexbox)
   - Responsive breakpoints

3. **Component Specifications**
   - Key components list
   - Component descriptions
   - Interaction patterns

4. **Animations**
   - Animation definitions
   - Timing functions
   - Trigger conditions

5. **Technical Requirements**
   - Framework and libraries
   - Accessibility requirements
   - Performance considerations

**User Experience:**
- One-click prompt generation
- Live preview with syntax highlighting
- Manual editing capability
- Copy to clipboard
- Export as text/markdown
- Direct "Open in [Tool]" buttons
- Save prompt history
- Share prompts via URL

**Technical Requirements:**
- Template system for different AI tools
- Smart summarization algorithms
- Color categorization logic
- Animation grouping
- Markdown formatting

---

#### 4.2 Component-Specific Prompts
**Priority:** P2 (Nice to Have)

**Functionality:**
- Select individual components to generate isolated prompts
- Multi-component selection
- Component relationship detection

**User Experience:**
- Click to select components on page
- Generate prompt for selected components only
- Compare multiple component prompts

---

#### 4.3 Screenshot Integration
**Priority:** P2 (Nice to Have)

**Functionality:**
- Capture page/component screenshots
- Attach screenshots to prompts
- Annotate screenshots
- Generate image descriptions for prompts

**User Experience:**
- "Include Screenshot" toggle
- Screenshot preview
- Annotation tools (arrows, boxes, text)

---

### 5. Export & Sharing

#### 5.1 Export Formats
**Priority:** P1 (Should Have)

**Functionality:**
- Export as CSS file
- Export as JSON (design tokens)
- Export as SCSS/SASS variables
- Export as JavaScript object
- Export as Figma tokens (community plugin format)
- Export as Tailwind config

**User Experience:**
- Export menu with format selection
- Preview before export
- Batch export (all sections at once)

---

#### 5.2 Code Copying
**Priority:** P0 (Must Have)

**Functionality:**
- Copy individual values (colors, fonts, spacing)
- Copy entire sections as CSS
- Copy design tokens
- Copy AI prompts

**User Experience:**
- One-click copy buttons everywhere
- "Copied!" feedback
- Copy history (last 10 copied items)

---

### 6. User Interface

#### 6.1 Extension Popup
**Priority:** P0 (Must Have)

**Design Requirements:**
- Modern, clean interface
- Tab-based navigation (Fonts, Colors, Spacing, Animations, Tech, Prompt, Export)
- Responsive layout (works at different popup sizes)
- Dark mode support
- Smooth transitions
- Loading states
- Error handling

**Tabs:**
1. **Overview** - Quick summary of page
2. **Typography** - Font analysis
3. **Colors** - Color palette
4. **Spacing** - Layout and spacing
5. **Effects** - Shadows, borders, animations
6. **Tech Stack** - Framework and library detection
7. **AI Prompt** - Prompt generation and customization
8. **Export** - Export and sharing options
9. **Settings** - User preferences

---

#### 6.2 On-Page Inspector
**Priority:** P0 (Must Have)

**Functionality:**
- Element selector (click to inspect)
- Visual overlay showing spacing
- Hover tooltips with quick info
- Inspector panel (slide-out or modal)

**User Experience:**
- Toggle inspector mode on/off
- Visual feedback when hovering (highlight element)
- Click element to see detailed properties
- Escape key to exit inspector mode

---

#### 6.3 Settings Panel
**Priority:** P1 (Should Have)

**Functionality:**
- Default AI tool preference
- Default framework/styling
- Theme selection (light/dark/auto)
- Export format preferences
- Toggle features on/off
- Keyboard shortcuts
- Data privacy settings

---

### 7. Additional Features

#### 7.1 Accessibility Checker
**Priority:** P1 (Should Have)

**Functionality:**
- Color contrast checking (WCAG AA/AAA)
- Font size recommendations
- ARIA attribute detection
- Semantic HTML analysis
- Alt text validation
- Keyboard navigation check

**User Experience:**
- Accessibility score
- Issue highlighting
- Suggestions for improvement
- Export accessibility report

---

#### 7.2 Responsive Design Analysis
**Priority:** P1 (Should Have)

**Functionality:**
- Detect media queries
- Extract breakpoint values
- Show responsive behavior
- Identify mobile-first vs desktop-first approach

**User Experience:**
- Breakpoint list
- Test at different screen sizes (within extension)
- Copy media queries

---

#### 7.3 Performance Metrics
**Priority:** P2 (Nice to Have)

**Functionality:**
- Page load time
- Bundle size analysis
- Image optimization suggestions
- Render-blocking resources
- Core Web Vitals

**User Experience:**
- Performance score
- Optimization recommendations

---

#### 7.4 History & Favorites
**Priority:** P2 (Nice to Have)

**Functionality:**
- Save analyzed websites
- Bookmark favorite designs
- History of inspected sites
- Compare saved designs

**User Experience:**
- History tab
- Search through history
- Export saved data
- Clear history option

---

## Technical Architecture

### Technology Stack
- **Extension**: Manifest V3
- **UI Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand or Context API
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Code Highlighting**: Prism.js or Shiki

### Extension Structure
```
chrome-extension/
├── manifest.json
├── public/
│   ├── icons/
│   └── popup.html
├── src/
│   ├── popup/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── TypographyPanel.tsx
│   │   │   ├── ColorPanel.tsx
│   │   │   ├── SpacingPanel.tsx
│   │   │   ├── AnimationPanel.tsx
│   │   │   ├── TechPanel.tsx
│   │   │   ├── PromptPanel.tsx
│   │   │   └── ExportPanel.tsx
│   │   └── store/
│   ├── content-scripts/
│   │   ├── inspector.ts
│   │   ├── overlay.ts
│   │   └── extractors/
│   │       ├── fontExtractor.ts
│   │       ├── colorExtractor.ts
│   │       ├── spacingExtractor.ts
│   │       ├── animationExtractor.ts
│   │       ├── techDetector.ts
│   │       └── assetExtractor.ts
│   ├── background/
│   │   └── service-worker.ts
│   ├── utils/
│   │   ├── promptGenerator.ts
│   │   ├── colorUtils.ts
│   │   ├── cssParser.ts
│   │   └── storage.ts
│   └── types/
└── package.json
```

### Data Flow
1. User activates extension on a webpage
2. Content script injects into page
3. Extraction modules scan DOM and styles
4. Data sent to popup via message passing
5. Popup displays analyzed data
6. User generates prompt or exports data
7. Results copied to clipboard or downloaded

---

## User Stories

### Developer Stories
1. As a developer, I want to **quickly identify the fonts** used on a website, so that I can replicate the typography in my project.

2. As a developer, I want to **extract the color palette** from a website, so that I can maintain consistent branding.

3. As a developer, I want to **generate an AI prompt** that describes a website's design, so that I can recreate it quickly using v0 or Cursor.

4. As a developer, I want to **detect the technologies** used on a website, so that I can learn what tools power successful products.

5. As a developer, I want to **copy CSS for specific elements**, so that I can quickly implement similar designs.

### Designer Stories
1. As a designer, I want to **analyze competitor designs**, so that I can understand design trends and patterns.

2. As a designer, I want to **export design tokens**, so that I can maintain consistency across design and development.

3. As a designer, I want to **check color contrast**, so that I can ensure my designs are accessible.

### Student Stories
1. As a student, I want to **understand how professional websites are built**, so that I can improve my skills.

2. As a student, I want to **see animation implementations**, so that I can learn modern web animation techniques.

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2) - MVP Core
**Goal:** Basic extension with core detection

**Deliverables:**
- Extension manifest and structure
- Basic popup UI with tabs
- Content script injection
- Font detection
- Color extraction (basic)
- Element selector

**Success Criteria:**
- Extension installs successfully
- Can detect fonts and colors on any website
- UI is functional and responsive

---

### Phase 2: Core Features (Weeks 3-4)
**Goal:** Complete visual design extraction

**Deliverables:**
- Advanced color palette with categorization
- Spacing analyzer with pattern detection
- Layout system detection
- Shadow and border extraction
- Export functionality (CSS, JSON)

**Success Criteria:**
- Accurately extracts all visual properties
- Export works for all formats
- No major bugs on popular websites

---

### Phase 3: Technology Detection (Weeks 5-6)
**Goal:** Framework and library detection

**Deliverables:**
- Framework detection (React, Vue, Angular, Svelte)
- CSS framework detection
- Library detection
- Asset detection
- Tech stack visualization in UI

**Success Criteria:**
- 90%+ accuracy on framework detection
- Detects at least 50 popular libraries
- Works on static and SPA sites

---

### Phase 4: AI Prompt Generation (Weeks 7-8) - KILLER FEATURE
**Goal:** Comprehensive prompt generation

**Deliverables:**
- Prompt generation engine
- Tool-specific templates (v0, Lovable, Cursor, Bolt, Claude)
- Customization options (framework, styling, detail)
- Prompt preview and editing
- Copy and export functionality

**Success Criteria:**
- Generated prompts work in target AI tools
- Users can customize prompts effectively
- Prompt quality is high (manual testing)

---

### Phase 5: Animation & Polish (Weeks 9-10)
**Goal:** Animation detection and UI polish

**Deliverables:**
- CSS animation detection
- Keyframe extraction
- Transition detection
- Responsive design analysis
- UI animations and micro-interactions
- Dark mode
- Error handling and edge cases

**Success Criteria:**
- Detects 80%+ of CSS animations
- UI feels smooth and professional
- Handles errors gracefully

---

### Phase 6: Testing & Launch (Weeks 11-12)
**Goal:** Quality assurance and Chrome Web Store launch

**Deliverables:**
- Comprehensive testing on 100+ websites
- Bug fixes
- Performance optimization
- Documentation (README, user guide)
- Chrome Web Store listing (screenshots, description, video)
- Landing page
- Launch!

**Success Criteria:**
- Zero critical bugs
- Passes Chrome Web Store review
- 4.5+ star rating goal
- Positive user feedback

---

## Non-Functional Requirements

### Performance
- Extension should not slow down page load
- Analysis should complete in < 3 seconds for typical pages
- Popup should open in < 500ms
- Memory usage < 100MB

### Compatibility
- Chrome 100+
- Works on all websites (including SPAs)
- Handles obfuscated/minified code
- Graceful degradation for unsupported features

### Security & Privacy
- No data collection without consent
- No external API calls (except for exports)
- Secure storage of user preferences
- No tracking or analytics (or opt-in only)

### Accessibility
- Extension UI is keyboard navigable
- Proper ARIA labels
- Screen reader compatible
- High contrast mode support

---

## Success Metrics

### Acquisition
- Chrome Web Store installs
- Weekly active users (WAU)
- Daily active users (DAU)
- User growth rate

### Engagement
- Average session duration
- Features used per session
- AI prompts generated per week
- Export frequency

### Retention
- Day 1, Day 7, Day 30 retention
- Weekly return rate
- Feature adoption rate

### Quality
- Chrome Web Store rating (target: 4.5+)
- Bug reports per 1000 users
- Crash rate
- User feedback sentiment

---

## Monetization Strategy (Future)

### Free Tier
- All core features (fonts, colors, spacing, basic tech detection)
- Basic AI prompt generation
- Limited exports (10 per day)
- Limited prompt history (last 5)

### Pro Tier ($9.99/month or $79/year)
- Advanced AI prompts with full customization
- Unlimited exports in all formats
- Animation detection
- Performance metrics
- Accessibility checker
- Unlimited prompt history
- Priority support
- Early access to new features

### Team Tier ($29.99/month)
- All Pro features
- Shared collections
- Team collaboration
- Custom export templates
- API access (future)

---

## Risks & Mitigations

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Some websites block inspection | High | Medium | Provide manual input option, improve detection methods |
| Framework detection accuracy | Medium | Medium | Use multiple detection methods, confidence scores |
| Browser updates break extension | High | Low | Follow Chrome extension best practices, monitor updates |
| Performance issues on large sites | Medium | Medium | Implement throttling, progressive scanning |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Similar tools already exist | Medium | High | Focus on AI prompt generation as differentiator |
| Low user adoption | High | Medium | Strong marketing, free tier, show clear value |
| Chrome Web Store rejection | High | Low | Follow all guidelines, thorough testing |

---

## Open Questions

1. Should we support Firefox/Safari/Edge from day one?
2. Do we need a backend for prompt storage/sharing?
3. Should we integrate with Figma/Sketch APIs?
4. Do we collect analytics (privacy-respecting)?
5. Should we have an API for developers?
6. Do we want social features (share/like prompts)?
7. Should we support team collaboration in v1?

---

## Appendix

### Competitor Analysis
- **WhatFont**: Font detection only, no comprehensive features
- **ColorZilla**: Color picking, limited palette extraction
- **Wappalyzer**: Technology detection, no design analysis
- **CSS Peeper**: Design inspection, no AI prompts
- **VisBug**: Visual editing, not focused on extraction

**Our Advantage**: All-in-one tool + AI prompt generation

### Reference Materials
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Web Design Trends 2024](https://www.awwwards.com/trends/)
- [CSS-Tricks Articles](https://css-tricks.com)

---

## Approval & Sign-off

**Product Manager:** _____________________ Date: _____  
**Engineering Lead:** _____________________ Date: _____  
**Design Lead:** _____________________ Date: _____  

---

*Document Version: 1.0*  
*Last Updated: December 25, 2024*