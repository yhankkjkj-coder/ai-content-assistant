// Embedded activation codes (safe: only hashes, not real codes)
var ACTIVATION_CODES = {
  "aae4de1cb85209fe": {
    "tier": "pro_monthly",
    "used": false
  },
  "0149dd977a015957": {
    "tier": "pro_monthly",
    "used": false
  },
  "350421b4ba6b6a29": {
    "tier": "pro_monthly",
    "used": false
  },
  "8e8b8129742343ce": {
    "tier": "pro_monthly",
    "used": false
  },
  "7a0eed804e3a7618": {
    "tier": "pro_monthly",
    "used": false
  },
  "9c0641f661d02923": {
    "tier": "pro_monthly",
    "used": false
  },
  "f09979733bb6fc38": {
    "tier": "pro_monthly",
    "used": false
  },
  "889c84377774a632": {
    "tier": "pro_monthly",
    "used": false
  },
  "0ed1ea30cac0ccbb": {
    "tier": "pro_monthly",
    "used": false
  },
  "76052651abe4ba31": {
    "tier": "pro_monthly",
    "used": false
  },
  "8a84a613da1b568c": {
    "tier": "pro_lifetime",
    "used": false
  },
  "0a1ad30b6f7411ec": {
    "tier": "pro_lifetime",
    "used": false
  },
  "f9d08e62a10db2ee": {
    "tier": "pro_lifetime",
    "used": false
  },
  "52d236b8647edf54": {
    "tier": "pro_lifetime",
    "used": false
  },
  "18099ee59cb93c71": {
    "tier": "pro_lifetime",
    "used": false
  }
};

// AI Content Assistant — Background Service Worker
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DAILY_LIMIT = 5;
const STORE_KEY = 'ai_data';

function uid() { return crypto.randomUUID(); }

function defaultState() {
  return {
    userId: uid(), apiKey: '', pro: false, proTier: null, proEmail: null,
    usage: { count: 0, date: new Date().toDateString() }, activatedAt: null,
  };
}

async function getState() {
  const d = await chrome.storage.local.get(STORE_KEY);
  if (!d[STORE_KEY]) { const s = defaultState(); await chrome.storage.local.set({ [STORE_KEY]: s }); return s; }
  const s = d[STORE_KEY];
  const today = new Date().toDateString();
  if (s.usage.date !== today) { s.usage = { count: 0, date: today }; await saveState(s); }
  return s;
}

async function saveState(s) { await chrome.storage.local.set({ [STORE_KEY]: s }); }

// ═══ Message Router ═══
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Content script: store text + open tab
  if (msg.type === 'OPEN_AI') {
    chrome.storage.local.set({
      ai_ctx: { text: msg.text, url: msg.url, title: msg.title }
    }).then(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/assistant.html') });
      sendResponse({ ok: true });
    });
    return true;
  }

  // Assistant page: AI query (bypasses CORS)
  if (msg.type === 'AI_QUERY') {
    (async () => {
      const state = await getState();
      // Check limit
      if (!state.pro) {
        const today = new Date().toDateString();
        if (state.usage.date !== today) { state.usage = { count: 0, date: today }; }
        if (state.usage.count >= DAILY_LIMIT) {
          sendResponse({ error: 'DAILY_LIMIT', message: 'Free limit reached (5/day). Upgrade to Pro!' });
          return;
        }
      }
      // Call API
      try {
        const resp = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + msg.apiKey },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: msg.systemPrompt }, { role: 'user', content: msg.text }],
            max_tokens: 2000, temperature: 0.7,
          }),
        });
        if (!resp.ok) { const e = await resp.json().catch(() => ({})); sendResponse({ error: e.error?.message || 'HTTP ' + resp.status }); return; }
        const data = await resp.json();
        // Update usage
        if (!state.pro) {
          const today = new Date().toDateString();
          if (state.usage.date !== today) state.usage = { count: 1, date: today };
          else state.usage.count++;
        }
        await saveState(state);
        sendResponse({ result: data.choices[0].message.content, usage: state.usage, pro: state.pro });
      } catch (e) { sendResponse({ error: e.message }); }
    })();
    return true;
  }

  // State management
  if (msg.type === 'GET_STATE') { getState().then(s => sendResponse(s)); return true; }
  if (msg.type === 'SAVE_KEY') {
    getState().then(s => { s.apiKey = msg.key; return saveState(s); }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'ACTIVATE_PRO') {
    getState().then(s => {
      s.pro = true; s.proTier = msg.tier; s.proEmail = msg.email; s.activatedAt = new Date().toISOString();
      return saveState(s);
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  // Activation code verification — no Stripe, no server, no registration
  if (msg.type === 'ACTIVATE_CODE') {
    (async () => {
      try {
        // Hash the input code with SHA-256
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg.code));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

        // Check activation codes (embedded at top of this file)
        const entry = ACTIVATION_CODES[hashHex];
        if (!entry) {
          sendResponse({ error: 'Invalid activation code' });
          return;
        }

        // Check if code was already used (persisted in storage)
        const usedData = await chrome.storage.local.get('ai_used_codes');
        const usedCodes = usedData.ai_used_codes || {};
        if (usedCodes[hashHex]) {
          sendResponse({ error: 'Code already used' });
          return;
        }

        // Valid code! Mark as used and activate Pro
        usedCodes[hashHex] = { tier: entry.tier, usedAt: new Date().toISOString() };
        await chrome.storage.local.set({ ai_used_codes: usedCodes });

        const state = await getState();
        state.pro = true;
        state.proTier = entry.tier;
        state.proEmail = msg.code.substring(0, 8) + '...';
        state.activatedAt = new Date().toISOString();
        state.activationHash = hashHex;
        await saveState(state);

        sendResponse({ ok: true, tier: entry.tier });
      } catch (e) {
        sendResponse({ error: 'Verification failed: ' + e.message });
      }
    })();
    return true;
  }
});

// ═══ Toolbar icon → open tab ═══
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/assistant.html') });
});

// ═══ Context menu ═══
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    ['summarize','translate','explain','rewrite'].forEach(a => {
      chrome.contextMenus.create({
        id: 'ai-' + a, title: 'AI ' + a.charAt(0).toUpperCase() + a.slice(1), contexts: ['selection']
      }, () => { if (chrome.runtime.lastError) console.debug(chrome.runtime.lastError.message); });
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const a = info.menuItemId.replace('ai-', '');
  if (info.selectionText && a) {
    chrome.storage.local.set({ ai_ctx: { text: info.selectionText, url: tab.url, title: tab.title, action: a } });
    chrome.tabs.create({ url: chrome.runtime.getURL('src/assistant.html') });
  }
});
