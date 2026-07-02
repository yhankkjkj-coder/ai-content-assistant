# AI Content Assistant — Chrome Extension

Select text on any webpage → AI summarizes, translates, explains, or rewrites instantly.

## Quick Start

1. Chrome → `chrome://extensions` → Developer mode → Load unpacked → select this folder
2. Click toolbar icon → ⚙️ Settings → enter DeepSeek API key
3. Select text on any webpage → click floating ✨ button → AI Assistant opens

## Features

- **Select & Analyze** — highlight text → ✨ button → instant AI
- **4 AI Actions** — Summarize, Translate (EN↔中文), Explain, Rewrite
- **DeepSeek API** — ~¥1 per 1M tokens, extremely cheap
- **Free Tier** — 5 requests/day
- **Pro Activation** — activation code system, zero third-party platforms needed

## How to Make Money 💰

### Generate activation codes
```bash
node scripts/gen-codes.js 20
```

### Sell the codes
1. Post on social media / forums / 朋友圈
2. Buyer pays via WeChat / Alipay / 红包
3. Send one code from `scripts/codes.txt`
4. Buyer enters code in Settings → Activate Pro

### Suggested pricing
- Monthly: ¥9.9
- Lifetime: ¥49

### To generate more codes
```bash
node scripts/gen-codes.js 10 pro_monthly   # 10 monthly codes
node scripts/gen-codes.js 5 pro_lifetime   # 5 lifetime codes
```

### Publish to Chrome Web Store
1. Zip: `zip -r package.zip src/ icons/ manifest.json`
2. Upload at https://chrome.google.com/webstore/devconsole
3. Pay $5 one-time registration fee
4. Get organic traffic → users upgrade to Pro

## Tech Stack

- Chrome Extension Manifest V3
- DeepSeek API (deepseek-chat model)
- Vanilla JavaScript (zero dependencies)
- SHA-256 activation codes

## File Structure

```
├── manifest.json              # Extension config
├── src/
│   ├── background.js          # AI API · free limit · activation codes
│   ├── content.js             # Floating ✨ button · text selection
│   ├── content.css            # Button animation
│   ├── assistant.html         # AI Assistant tab (zero inline scripts)
│   ├── assistant.css          # UI styles
│   ├── assistant.js           # Full logic · settings · upgrade
│   └── stripe-config.js       # Activation codes (hashes only, safe)
├── scripts/
│   ├── gen-codes.js           # Activation code generator
│   └── codes.txt              # 🔒 Real codes — KEEP SECRET
└── icons/                     # Extension icons
```
