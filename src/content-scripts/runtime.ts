const RUNTIME_OWNER_ATTR = 'data-di-runtime-owner';
const CURRENT_RUNTIME_ID = (() => {
  try {
    return chrome.runtime?.id || '';
  } catch {
    return '';
  }
})();

export const isRuntimeAvailable = () => {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
};

export const isContextInvalidatedError = (error: unknown) =>
  String(error || '').includes('Extension context invalidated');

export const safeRuntimeGetURL = (path: string) => {
  if (!isRuntimeAvailable()) return null;
  try {
    return chrome.runtime.getURL(path);
  } catch (error) {
    if (!isContextInvalidatedError(error)) {
      console.warn('Failed to resolve runtime URL:', error);
    }
    return null;
  }
};

export const safeRuntimeSendMessage = async <T = unknown>(message: unknown): Promise<T | null> => {
  if (!isRuntimeAvailable()) return null;
  try {
    return (await chrome.runtime.sendMessage(message)) as T;
  } catch (error) {
    if (!isContextInvalidatedError(error)) {
      console.warn('Runtime message failed:', error);
    }
    return null;
  }
};

export const claimRuntimeOwnership = () => {
  document.documentElement.setAttribute(RUNTIME_OWNER_ATTR, CURRENT_RUNTIME_ID);
};

export const isCurrentRuntimeOwner = () =>
  document.documentElement.getAttribute(RUNTIME_OWNER_ATTR) === CURRENT_RUNTIME_ID;

