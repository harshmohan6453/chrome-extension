chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ path: 'sidepanel.html', enabled: true }).catch(() => null);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'OPEN_THEME_STUDIO') return;

  (async () => {
    try {
      const windowId = sender.tab?.windowId;
      const tabId = sender.tab?.id;
      if (!windowId) {
        sendResponse({ status: 'error', error: 'No window available for side panel.' });
        return;
      }

      const path = 'sidepanel.html?tab=themeStudio';
      if (typeof tabId === 'number') {
        await chrome.sidePanel.setOptions({ tabId, path, enabled: true });
      } else {
        await chrome.sidePanel.setOptions({ path, enabled: true });
      }

      await chrome.sidePanel.open({ windowId });
      sendResponse({ status: 'ok' });
    } catch (error) {
      sendResponse({ status: 'error', error: String(error) });
    }
  })();

  return true;
});
