// Background service worker
console.log('Service worker loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CAPTURE_SCREENSHOT') {
    // If windowId is undefined, the API restricts capturing current window, which works.
    // We cast to any to bypass strict overload checks for 'number | undefined' if the simpler call signature isn't matched.
    const windowId = sender.tab?.windowId;
    
    // @ts-ignore - API accepts undefined to mean 'current window'
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
      .then(dataUrl => sendResponse({ dataUrl }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'ANALYZE_IMAGE') {
      fetch('http://localhost:3000/api/generate-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.payload)
      })
      .then(res => res.json())
      .then(data => sendResponse(data))
      .catch(error => sendResponse({ error: error.message }));
      return true;
  }
});
