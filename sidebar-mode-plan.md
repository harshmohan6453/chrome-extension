# Sidebar Mode Implementation Plan

Add a sidebar mode to the extension so users can keep the inspector panel open while browsing.

---

## Architecture Options

### Option A: Chrome Side Panel API (Recommended)
Chrome 114+ has a native **Side Panel API** that opens your UI in a persistent sidebar.

```
┌──────────────────────────────────────────────────┐
│  Browser Tab                      │  Side Panel  │
│                                   │              │
│  ┌─────────────────────────────┐  │  ┌────────┐  │
│  │                             │  │  │ Design │  │
│  │      Website Content        │  │  │Inspector│  │
│  │                             │  │  │   UI    │  │
│  │                             │  │  │         │  │
│  └─────────────────────────────┘  │  └────────┘  │
└──────────────────────────────────────────────────┘
```

**Pros:**
- Native Chrome feature
- Persists while navigating
- Clean, professional look
- Same codebase as popup

**Cons:**
- Chrome 114+ only (released June 2023)
- Not supported in Firefox

---

### Option B: Injected Sidebar (Content Script)
Inject a sidebar directly into the page DOM via content script.

**Pros:**
- Works on all browsers
- Full control over styling

**Cons:**
- CSS conflicts with page styles
- Lost on navigation (needs re-inject)
- More complex to maintain

---

## Recommended: Side Panel API (Option A)

### Changes Required

#### 1. Update Manifest
```json
{
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": ["sidePanel", ...existing]
}
```

#### 2. Create Side Panel HTML
Same as popup.html but loads the same React app:
```html
<!-- sidepanel.html -->
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="popup.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="popup.js"></script>
  </body>
</html>
```

#### 3. Add Toggle Button
Add button in popup to open side panel:
```typescript
// Open side panel
await chrome.sidePanel.open({ windowId: window.id });
// Close popup
window.close();
```

#### 4. Detect Context
Adjust UI width/layout based on context:
```typescript
const isSidePanel = window.location.pathname.includes('sidepanel');
```

---

## Diagram

```mermaid
graph TD
    A[User clicks extension icon] --> B{Current mode?}
    B -->|Popup| C[Show popup with "Open Sidebar" button]
    B -->|Side Panel| D[Show full sidebar UI]
    C --> E[User clicks "Open Sidebar"]
    E --> F[chrome.sidePanel.open]
    F --> D
```

---

## Files to Change

| File | Change |
|------|--------|
| `public/manifest.json` | Add `side_panel` config |
| `sidepanel.html` | New HTML entry for side panel |
| `vite.config.ts` | Add sidepanel to build entries |
| `src/popup/App.tsx` | Add context detection + toggle button |
| `src/popup/index.css` | Responsive styles for wider sidebar |

---

## Implementation Steps

1. **Update manifest.json** - Add side panel permission and config
2. **Create sidepanel.html** - Entry point for side panel
3. **Update Vite config** - Build side panel as separate entry
4. **Add toggle button** - "Open as Sidebar" in popup
5. **Responsive styles** - Adjust layout for wider sidebar
6. **Test** - Verify both popup and side panel work

---

## User Choice Options

**Simple Toggle:**
- Button in popup: "📌 Pin as Sidebar"
- Opens side panel, closes popup

**Settings Option:**
- Add to Settings panel: "Default to Sidebar Mode"
- Remembers preference

---

## Browser Support

| Browser | Side Panel Support |
|---------|-------------------|
| Chrome 114+ | ✅ Native |
| Edge 114+ | ✅ Native |
| Firefox | ❌ Use injected sidebar |
| Safari | ❌ Not supported |
