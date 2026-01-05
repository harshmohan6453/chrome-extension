export interface FlowStep {
  id: string;
  timestamp: number;
  type: 'click' | 'navigation' | 'input';
  selector: string;
  label: string;
  url: string;
  description: string;
}

// Smart CSS Selector Generator
function getSelector(el: Element): string {
  // 1. Use ID if available
  if (el.id) {
    return `#${el.id}`;
  }

  // 2. Use data attributes (common in testing/modern apps)
  const dataTestId = el.getAttribute('data-testid') || el.getAttribute('data-test');
  if (dataTestId) {
    return `[data-testid="${dataTestId}"]`;
  }

  // 3. Use classes (simplified)
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(/\s+/).filter(c => !c.startsWith('hover:') && !c.startsWith('focus:')).slice(0, 2);
    if (classes.length > 0) {
      return `${el.tagName.toLowerCase()}.${classes.join('.')}`;
    }
  }

  // 4. Fallback to tag + text (if short)
  const text = el.textContent?.trim().slice(0, 20);
  if (text && text.length > 0) {
    return `${el.tagName.toLowerCase()}[text="${text}"]`;
  }

  // 5. Ultimate fallback: unique path (simplified for performance)
  let path = el.tagName.toLowerCase();
  let parent = el.parentElement;
  while (parent && parent.tagName !== 'BODY') {
    path = `${parent.tagName.toLowerCase()} > ${path}`;
    parent = parent.parentElement;
  }
  return path;
}

function getLabel(el: Element): string {
  return el.textContent?.trim().slice(0, 30) || el.getAttribute('aria-label') || el.tagName.toLowerCase();
}

let isListening = false;
let clickListener: ((e: MouseEvent) => void) | null = null;

export const FlowRecorder = {
  // Initialize: Check storage to see if we should be recording
  init: () => {
    chrome.storage.local.get(['isRecording'], (result) => {
      if (result.isRecording) {
        FlowRecorder.start();
      }
    });

    // Listen for toggle messages from Popup
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'START_RECORDING') {
        FlowRecorder.start();
      } else if (message.type === 'STOP_RECORDING') {
        FlowRecorder.stop();
      }
    });
  },

  start: () => {
    if (isListening) return;
    isListening = true;
    // console.log('🔴 Flow Recorder Started');

    clickListener = (e: MouseEvent) => {
      // Don't record clicks on the extension sidebar (if injected) or similar tools
      if ((e.target as Element).closest('#preflight-overlay')) return;

      const target = e.target as Element;
      // Find closest interactive element
      const interactive = target.closest('button, a, input, select, [role="button"]') || target;

      const step: FlowStep = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'click',
        selector: getSelector(interactive),
        label: getLabel(interactive),
        url: window.location.href,
        description: `Clicked on ${getLabel(interactive)}`
      };

      // console.log('📸 Recorded:', step);

      // Save to storage
      chrome.storage.local.get(['flowSteps'], (result) => {
        const steps = result.flowSteps || [];
        const newSteps = [...steps, step];
        chrome.storage.local.set({ flowSteps: newSteps });
      });
    };

    document.addEventListener('click', clickListener, true); // Capture phase to catch everything
  },

  stop: () => {
    if (!isListening) return;
    isListening = false;
    // console.log('⏹️ Flow Recorder Stopped');
    if (clickListener) {
      document.removeEventListener('click', clickListener, true);
      clickListener = null;
    }
  }
};
