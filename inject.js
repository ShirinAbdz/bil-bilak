// Runs in the page's own context (MAIN world).
// Only reads responses that Twitter itself fetched to render the timeline;
// it does not send any extra requests.
(() => {
  if (window.__bilbilakHooked) return;
  window.__bilbilakHooked = true;

  const API_RE = /\/i\/api\/(graphql|2)\//;

  const unescapeHtml = (s) =>
    s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

  function photoOrig(url) {
    const m = url.match(/^(.*)\.(\w+)$/);
    return m ? `${m[1]}?format=${m[2]}&name=orig` : url;
  }

  function extract(t) {
    const l = t.legacy;
    const note = t.note_tweet && t.note_tweet.note_tweet_results &&
      t.note_tweet.note_tweet_results.result && t.note_tweet.note_tweet_results.result.text;

    let text;
    if (note) {
      text = note;
    } else {
      text = l.full_text;
      ((l.entities && l.entities.urls) || []).forEach((u) => {
        text = text.split(u.url).join(u.expanded_url);
      });
      ((l.entities && l.entities.media) || []).forEach((m) => {
        text = text.split(m.url).join('');
      });
      text = unescapeHtml(text).trim();
    }

    const rawMedia = (l.extended_entities && l.extended_entities.media) ||
      (l.entities && l.entities.media) || [];

    const media = rawMedia
      .map((m) => {
        if (m.type === 'photo') {
          return { type: 'photo', url: photoOrig(m.media_url_https) };
        }
        const variants = ((m.video_info && m.video_info.variants) || [])
          .filter((v) => v.content_type === 'video/mp4')
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        return {
          type: m.type === 'animated_gif' ? 'gif' : 'video',
          url: variants[0] && variants[0].url,
        };
      })
      .filter((m) => m.url);

    const u = t.core && t.core.user_results && t.core.user_results.result;
    const username = (u && ((u.core && u.core.screen_name) || (u.legacy && u.legacy.screen_name))) || '';

    return { id: t.rest_id, text, username, media };
  }

  function walk(node, out, depth) {
    if (!node || typeof node !== 'object' || depth > 60) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n, out, depth + 1);
      return;
    }
    if (node.rest_id && node.legacy && typeof node.legacy.full_text === 'string') {
      try { out.push(extract(node)); } catch (e) { /* ignore */ }
    }
    for (const k in node) {
      const v = node[k];
      if (v && typeof v === 'object') walk(v, out, depth + 1);
    }
  }

  function handle(json) {
    try {
      const out = [];
      walk(json, out, 0);
      if (out.length) window.postMessage({ __bilbilak: true, tweets: out }, '*');
    } catch (e) { /* ignore */ }
  }

  // hook fetch
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
      if (url && API_RE.test(url)) {
        res.clone().json().then(handle).catch(() => {});
      }
    } catch (e) { /* ignore */ }
    return res;
  };

  // hook XHR
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    try {
      if (typeof url === 'string' && API_RE.test(url)) {
        this.addEventListener('load', () => {
          try {
            if (this.responseType === '' || this.responseType === 'text') {
              handle(JSON.parse(this.responseText));
            } else if (this.responseType === 'json') {
              handle(this.response);
            }
          } catch (e) { /* ignore */ }
        });
      }
    } catch (e) { /* ignore */ }
    return origOpen.call(this, method, url, ...rest);
  };
})();
