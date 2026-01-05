# Design Inspector & Website Analyzer Chrome Extension

A powerful developer tool for inspecting, analyzing, and recreating web components with pixel-perfect accuracy. Built with React, TypeScript, and Vite.

## 🚀 Features

### 1. Visual Inspector ("God-Tier" Mode)
Hover over any element to get an in-depth analysis:
- **Component Recreation**: Generates a "God-Tier" prompt to recreate the component with 99% accuracy.
- **Computed Styles**: View every active CSS property, including pseudo-elements (`::before`, `::after`) and interactive states (`:hover`, `:focus`).
- **Neubrutalism Box Model**: Visual representation of margin, border, padding, and content sizing.
- **Smart Guides**: Visual alignment guides when selecting elements.
- **Export**: One-click export to **Tailwind CSS** or vanilla **CSS**.
- **Hover Mode**: Toggle continuous inspection for rapid exploration.

### 2. Color Studio
- **EyeDropper Tool**: Native system-wide color picker to grab any color from your screen.
- **Palette Extraction**: Automatically detects and lists all colors used on the page.
- **Format Support**: View and copy colors in **HEX**, **RGB**, and **HSL**.
- **Contrast Check**: (Integrated in palette view).

### 3. Motion & Animation Detector
Detects and analyzes scroll-driven interactions:
- **Library Support**: Detects **GSAP ScrollTrigger**, **Framer Motion**, **Locomotive Scroll**, **AOS**, and **CSS Scroll-Timeline**.
- **Playback Control**: Pause, play, and scrub through detected animations.
- **Debug Info**: View trigger points, duration, and easing curves.

### 4. Typography & Assets
- **Font Scanner**: Lists all font families, weights, and sizes used.
- **Asset Extractor**: One-click download/view for images, SVGs, and videos.

### 5. Deep Scan
- **HTML Structure**: Analyzes the semantic structure of the page.
- **Red Flag Detector**: Identifies potential UI/UX issues and accessibility violations.

## 🛠 Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **State Management**: Zustand
- **Icons**: Lucide React

## 🔒 Security
- **Safe Inspection**: All data extraction runs in an isolated content script environment.
- **No Remote Code**: Does not execute remote code; strictly analyzes existing page DOM/styles.
- **Input Sanitization**: All inspected data is escaped to prevent HTML injection.

## 📦 Installation
1. Clone the repository
2. Run `npm install`
3. Run `npm run build`
4. Load the `dist` folder as an "Unpacked extension" in Chrome (`chrome://extensions`)
