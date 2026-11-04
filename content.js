(() => {
  "use strict";

  // ---------- Tweet data store (from inject.js) ----------
  const store = new Map();
  const MAX_STORE = 4000;

  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || !e.data.__bilbilak) return;
    for (const t of e.data.tweets) {
      const prev = store.get(t.id);
      if (!prev || t.media.length >= prev.media.length) store.set(t.id, t);
    }
    while (store.size > MAX_STORE) store.delete(store.keys().next().value);
  });

  // ---------- Shovel icon ----------
  const SHOVEL = `
<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
     stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M15.5 3.5l5 5"/>
  <path d="M18 6L11.5 12.5"/>
  <path d="M9.5 11.5L12.5 14.5L10.5 19.5L5 19L4.5 13.5Z"/>
</svg>`;

  // ---------- Utilities ----------
  function isDark() {
    const c = (
      getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [
        255, 255, 255,
      ]
    ).map(Number);
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] < 128;
  }

  function getTweetId(article) {
    const a = article.querySelector('a[href*="/status/"] time');
    const link = a && a.closest("a");
    const m = link && link.getAttribute("href").match(/\/status\/(\d+)/);
    return m ? m[1] : null;
  }

  function getUsername(article) {
    const a = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
    return a ? a.getAttribute("href").replace(/^\//, "").split("/")[0] : "";
  }

  function toOrig(src) {
    try {
      const u = new URL(src);
      if (u.hostname !== "pbs.twimg.com") return src;
      u.searchParams.set("name", "orig");
      return u.toString();
    } catch (e) {
      return src;
    }
  }

  function domData(article) {
    const textEl = article.querySelector('[data-testid="tweetText"]');
    const photos = [
      ...article.querySelectorAll('[data-testid="tweetPhoto"] img'),
    ]
      .filter((i) => /pbs\.twimg\.com\/media/.test(i.src))
      .map((i) => ({ type: "photo", url: toOrig(i.src) }));
    const hasVideo = !!article.querySelector(
      '[data-testid="videoPlayer"], [data-testid="videoComponent"]',
    );
    return { text: textEl ? textEl.innerText.trim() : "", photos, hasVideo };
  }

  function extOf(m) {
    if (m.type !== "photo") return "mp4";
    try {
      return new URL(m.url).searchParams.get("format") || "jpg";
    } catch (e) {
      return "jpg";
    }
  }

  // ---------- Toast message ----------
  let toastEl;
  function toast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement("div");
    toastEl.className = "bil-toast";
    toastEl.dir = "ltr";
    toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl && toastEl.remove(), 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast("Text copied ✓");
  }

  async function download(items, username, id) {
    try {
      let i = 0;
      for (const m of items) {
        i++;
        const name = `bilbilak/${username || "x"}_${id || Date.now()}_${i}.${extOf(m)}`;
        const res = await chrome.runtime.sendMessage({
          type: "download",
          url: m.url,
          filename: name,
        });
        if (res && !res.ok) throw new Error(res.error);
      }
      toast(
        items.length > 1
          ? `Downloading ${items.length} files…`
          : "Download started ✓",
      );
    } catch (e) {
      toast("Download failed. Refresh the page.");
    }
  }

  // ---------- Menu ----------
  let menuEl = null;

  function closeMenu() {
    if (menuEl) {
      menuEl.remove();
      menuEl = null;
    }
  }

  function makeItem(label, enabled, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "bil-item";
    b.disabled = !enabled;
    b.textContent = label;
    b.addEventListener("click", (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      closeMenu();
      onClick();
    });
    return b;
  }

  function openMenu(btn, article) {
    closeMenu();

    const id = getTweetId(article);
    const data = id ? store.get(id) : null;
    const dom = domData(article);

    const text = (data && data.text) || dom.text;
    const username = (data && data.username) || getUsername(article);
    const media = data ? data.media : dom.photos;

    const photos = media.filter((m) => m.type === "photo");
    const videos = media.filter((m) => m.type === "video");
    const gifs = media.filter((m) => m.type === "gif");

    const videoMissing = !data && dom.hasVideo;
    const hasGifBadge = !!article.querySelector(
      '[data-testid="videoPlayer"] [aria-label*="GIF"], [aria-label="GIF"]',
    );

    menuEl = document.createElement("div");
    menuEl.className = "bil-menu";
    menuEl.dir = "ltr";
    menuEl.dataset.theme = isDark() ? "dark" : "light";

    const gifMissing = !data && hasGifBadge;
    let count = 0;
    const add = (label, enabled, onClick) => {
      menuEl.appendChild(makeItem(label, enabled, onClick));
      count++;
    };

    if (text) add("📋  Copy text", true, () => copyText(text));

    if (photos.length > 0) {
      add(
        photos.length > 1
          ? `🖼️  Download all images (${photos.length})`
          : "🖼️  Download image",
        true,
        () => download(photos, username, id),
      );
    }

    if (videos.length > 0) {
      add("🎬  Download video", true, () => download(videos, username, id));
    } else if (videoMissing) {
      add("🎬  Download video (refresh the page)", false, () => {});
    }

    if (gifs.length > 0) {
      add("🎞️  Download GIF", true, () => download(gifs, username, id));
    } else if (gifMissing) {
      add("🎞️  Download GIF (refresh the page)", false, () => {});
    }

    if (count === 0) add("Nothing to copy or download", false, () => {});

    menuEl.style.visibility = "hidden";
    document.body.appendChild(menuEl);

    const r = btn.getBoundingClientRect();
    const mw = menuEl.offsetWidth;
    const mh = menuEl.offsetHeight;
    const left = Math.min(
      Math.max(8, r.left + r.width / 2 - mw / 2),
      window.innerWidth - mw - 8,
    );
    let top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    menuEl.style.left = left + "px";
    menuEl.style.top = top + "px";
    menuEl.style.visibility = "visible";
  }

  document.addEventListener(
    "click",
    (e) => {
      if (menuEl && !menuEl.contains(e.target)) closeMenu();
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  window.addEventListener("scroll", closeMenu, {
    capture: true,
    passive: true,
  });
  window.addEventListener("resize", closeMenu);

  // ---------- add button to all tweets ----------
  function inject() {
    document
      .querySelectorAll('article[data-testid="tweet"]')
      .forEach((article) => {
        if (article.querySelector(".bil-wrap")) return;

        const group = [...article.querySelectorAll('[role="group"]')].find(
          (g) => g.querySelector('[data-testid="reply"]'),
        );
        if (!group) return;

        const ref = group.querySelector(
          '[data-testid="bookmark"] svg, [data-testid="reply"] svg',
        );
        const color = ref ? getComputedStyle(ref).color : "";

        const wrap = document.createElement("div");
        wrap.className = "bil-wrap";
        if (color) wrap.style.setProperty("--bil-color", color);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "bil-btn";
        btn.title = "Bil Bilak";
        btn.setAttribute("aria-label", "Bil Bilak");
        btn.innerHTML = SHOVEL;

        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (menuEl) closeMenu();
          else openMenu(btn, article);
        });
        wrap.addEventListener("click", (e) => e.stopPropagation());

        wrap.appendChild(btn);
        group.appendChild(wrap);
      });
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      inject();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  schedule();
})();
