# 🪏 Bil Bilak

**A tiny shovel for digging treasure out of tweets.**

*Bil* (بیل) is Persian for "shovel". Bil Bilak adds a little shovel button to every tweet on X / Twitter. Click it, and dig out whatever is buried inside: the text, the full-quality images, the video, the GIF.

No accounts, no servers, no tracking. Just a shovel.

---

## ✨ What it digs up

| Tool | What you get |
|------|--------------|
| 📋 **Copy text** | The full tweet text, with links expanded and long tweets intact |
| 🖼️ **Download images** | Every photo in the tweet, in original quality |
| 🎬 **Download video** | The highest-quality MP4 available |
| 🎞️ **Download GIF** | The GIF, saved as an MP4 file |

The menu is smart: it only shows what the tweet actually contains. A tweet with only a GIF shows only the GIF option. A tweet with nothing to grab says so politely.

Everything lands in a tidy `bilbilak/` folder inside your Downloads, named like `username_tweetid_1.jpg`, so you always know where it came from.

## 🧠 How it works

The extension has three small parts that cooperate:

- **`inject.js`** runs inside the page itself and quietly listens to the data X already loads for your timeline. It finds the real media URLs and the full text, and it **never sends any extra requests**.
- **`content.js`** draws the shovel button next to each tweet's actions, builds the menu, and matches the button's color and the menu's theme to X (light or dark).
- **`background.js`** does the actual downloading, and only for files hosted on `twimg.com`. Anything else is refused.

## 🔒 Privacy and permissions

Only one permission is requested: **`downloads`**. Nothing is collected, stored, or sent anywhere. The extension only works on `x.com` and `twitter.com`.

## 🚀 Installation

1. Download or clone this folder.
2. Open `chrome://extensions` in Chrome (or any Chromium-based browser).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the project folder.
5. Open X, find a tweet, and look for the shovel. 🪏

## 📁 Project layout

```
bil-bilak/
├── manifest.json     # Extension config (Manifest V3)
├── background.js     # Service worker: handles downloads
├── content.js        # Button, menu, and page UI
├── content.css       # Styles for the button, menu, and toast
├── inject.js         # Reads tweet data from the page (MAIN world)
└── icons/            # 16, 48, and 128 px icons
```

## 💡 Good to know

- If the video or GIF option says **"refresh the page"**, the tweet was loaded before the extension had a chance to see its data. Reload the page and it will work.
- X changes its internals from time to time, so a future update might need a small fix here and there.
- Please be kind to creators: download for personal use, and respect copyright and the people who made the content.

---

Made with a shovel and a little patience. 🪏
