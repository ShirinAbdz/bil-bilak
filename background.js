chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'download') {
    let host = '';
    try { host = new URL(msg.url).hostname; } catch (e) { /* ignore */ }
    if (!/(^|\.)twimg\.com$/.test(host)) {
      sendResponse({ ok: false, error: 'invalid host' });
      return;
    }

    chrome.downloads.download(
      { url: msg.url, filename: msg.filename, conflictAction: 'uniquify' },
      () => {
        const err = chrome.runtime.lastError;
        sendResponse({ ok: !err, error: err && err.message });
      }
    );
    return true; // پاسخ async
  }
});
