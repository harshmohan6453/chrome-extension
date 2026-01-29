# 🚀 Upcoming Features Roadmap

## 1. 🎨 Real-time Color Playground
**Goal:** Allow users to "play" with the website's colors in real-time.
-   **Functionality:**
    -   Click on a color in the "Color Palette" panel.
    -   Open a color picker.
    -   **Live Preview:** Instantly replace that color *everywhere* it appears on the live website (changing CSS variables or computed styles).
    -   "Reset" button to revert changes.
-   **Why:** Great for designers to quickly test "What if this brand color was slightly bluer?" without dev tools.

## 2. ⌨️ Keyboard Shortcuts
**Goal:** Improve accessibility and speed.
-   **Shortcuts:**
    -   `Alt + S`: Toggle Side Panel.
    -   `Alt + P`: Open Popup (if possible/applicable).
    -   `Esc`: Constant "Exit Inspector Mode".
-   **Implementation:** Add listeners in `background` script or content script.

## 3. 💾 Smart Persistence (Auto-Save)
**Goal:** Never lose context.
-   **Current:** Manual save or loose `localStorage` calls.
-   **New:** Middleware for Zustand store that automatically syncs specific slices (like `inspectedTabId`, `expandedAccordions`, `theme`) to storage.
-   **Benefit:** If the popup closes unexpectedly, you pick up exactly where you left off.

## 4. 📤 Export Design System
**Goal:** Make the data usable outside the extension.
-   **Features:**
    -   **Download JSON:** Get a full `.json` dump of fonts, colors, and assets.
    -   **Copy CSS:** One-click copy for Tailwind config or CSS variables.
    -   **Export Assets:** (Ambitious) Zip download of extracted SVGs/Images.
