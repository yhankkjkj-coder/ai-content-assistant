// AI Content Assistant — Full logic
(function(){
'use strict';

var $ = function(id){ return document.getElementById(id); };
var input = $('inputText'), out = $('resultContent'), rlabel = $('resultLabel');
var loading = $('loadingArea'), resultArea = $('resultArea'), errorArea = $('errorArea');
var errorMsg = $('errorMsg'), badge = $('usageBadge'), settings = $('settingsPanel');
var upgrade = $('upgradeSection'), proDiv = $('proStatus'), proLabel = $('proTierLabel');
var apiKeyInput = $('apiKey'), charCount = $('charCount');

var currentAction = '', lastResult = '', state = {};

var prompts = {
  summarize: 'You are a professional content summarizer. Summarize the given text concisely in 2-4 sentences. Keep the key points and main ideas. Reply in the same language as the input text.',
  translate: 'You are a professional translator. Translate the given text to Chinese if it is in another language, or to English if it is already in Chinese. Provide ONLY the translation, no explanations.',
  explain: 'You are a knowledgeable teacher. Explain the given text in simple, easy-to-understand terms. Provide context, background, and break down complex concepts. Reply in the same language as the input text.',
  rewrite: 'You are a professional writer. Rewrite the given text to be more clear, engaging, and polished. Fix grammar, improve word choice, and enhance readability while preserving the original meaning. Reply in the same language as the input text.',
};

var labels = { summarize:'Summarize', translate:'Translate', explain:'Explain', rewrite:'Rewrite' };

// ═══ Init ═══
async function init() {
  try {
    var d = await chrome.storage.local.get('ai_data');
    state = d.ai_data || {};
  } catch(e) { state = {}; }

  // Load selected text
  try {
    var ctx = await chrome.storage.local.get('ai_ctx');
    if (ctx.ai_ctx && ctx.ai_ctx.text) {
      input.value = ctx.ai_ctx.text;
      updateChars();
      // Auto-execute if from context menu
      if (ctx.ai_ctx.action) execute(ctx.ai_ctx.action);
      await chrome.storage.local.remove('ai_ctx');
    }
  } catch(e) {}

  updateUI();
  if (state.apiKey) apiKeyInput.value = state.apiKey;
  if (!state.apiKey) settings.classList.remove('hidden');

  // Poll for new selections
  setInterval(async function() {
    try {
      var c = await chrome.storage.local.get('ai_ctx');
      if (c.ai_ctx && c.ai_ctx.text && c.ai_ctx.text !== input.value) {
        input.value = c.ai_ctx.text;
        updateChars();
        if (c.ai_ctx.action) execute(c.ai_ctx.action);
        await chrome.storage.local.remove('ai_ctx');
      }
    } catch(e) {}
  }, 2000);
}

function updateChars() { charCount.textContent = input.value.length + ' chars'; }
function updateUI() {
  badge.classList.remove('pro','warn');
  if (state.pro) {
    badge.textContent = '✨ PRO'; badge.classList.add('pro');
    upgrade.classList.add('hidden'); proDiv.classList.remove('hidden');
    proLabel.textContent = (state.proTier === 'pro_lifetime' ? 'Lifetime' : 'Pro Monthly') + (state.proEmail ? ' · ' + state.proEmail : '');
  } else {
    var u = (state.usage && state.usage.date === new Date().toDateString()) ? state.usage.count : 0;
    badge.textContent = u + '/5';
    if (u >= 5) badge.classList.add('warn');
    upgrade.classList.remove('hidden'); proDiv.classList.add('hidden');
  }
}

// ═══ Execute AI action ═══
function execute(action) {
  var text = input.value.trim();
  if (!text) return showError('Please select or paste some text first.');
  currentAction = action;
  rlabel.textContent = labels[action];

  loading.classList.remove('hidden'); resultArea.classList.add('hidden'); errorArea.classList.add('hidden');

  var key = apiKeyInput.value.trim() || state.apiKey;
  if (!key) { loading.classList.add('hidden'); showError('Please enter your DeepSeek API key in Settings ⚙️'); settings.classList.remove('hidden'); return; }

  chrome.runtime.sendMessage({
    type: 'AI_QUERY', apiKey: key, systemPrompt: prompts[action], text: text
  }, function(resp) {
    loading.classList.add('hidden');
    if (chrome.runtime.lastError) { showError(chrome.runtime.lastError.message); return; }
    if (!resp) { showError('No response. Try again.'); return; }
    if (resp.error) {
      if (resp.error === 'DAILY_LIMIT') { showError(resp.message); settings.classList.remove('hidden'); }
      else showError(resp.error);
      return;
    }
    lastResult = resp.result;
    out.textContent = resp.result;
    resultArea.classList.remove('hidden');
    // Update state from response
    if (resp.usage) { if (!state.usage) state.usage = {}; state.usage = resp.usage; }
    if (resp.pro !== undefined) state.pro = resp.pro;
    updateUI();
  });
}

function showError(msg) { errorMsg.textContent = msg; errorArea.classList.remove('hidden'); resultArea.classList.add('hidden'); }

function copyResult() { if (lastResult) navigator.clipboard.writeText(lastResult).then(function(){ flash('copyBtn','📋 Copied!'); setTimeout(function(){ $('copyBtn').textContent='📋 Copy'; },1500); }); }

function flash(id, text) { var b = $(id); if (b) b.textContent = text; }

// ═══ Activation Code ═══
function activatePro() {
  var code = $('activationCode').value.trim().toUpperCase();
  if (!code) { $('activateMsg').textContent = 'Enter your activation code.'; return; }

  $('activateMsg').textContent = 'Verifying...';

  // Hash the code and check against ACTIVATION_CODES
  chrome.runtime.sendMessage({ type: 'ACTIVATE_CODE', code: code }, async function(resp) {
    if (resp && resp.ok) {
      state.pro = true;
      state.proTier = resp.tier;
      state.proEmail = code.substring(0, 8) + '...';
      await chrome.storage.local.set({ ai_data: state });
      updateUI();
      $('activationCode').value = '';
      $('activateMsg').textContent = '🎉 Pro activated!';
    } else {
      $('activateMsg').textContent = '❌ ' + ((resp && resp.error) || 'Invalid code');
    }
  });
}

// ═══ Event Listeners ═══
document.querySelectorAll('.ai-btn').forEach(function(b){ b.addEventListener('click', function(){ execute(this.dataset.action); }); });
$('inputText').addEventListener('input', updateChars);
$('clearBtn').addEventListener('click', function(){ input.value=''; updateChars(); resultArea.classList.add('hidden'); errorArea.classList.add('hidden'); });
$('settingsBtn').addEventListener('click', function(){ settings.classList.toggle('hidden'); });
$('saveKeyBtn').addEventListener('click', function(){
  var k = apiKeyInput.value.trim(); if (!k) return;
  state.apiKey = k; chrome.runtime.sendMessage({ type: 'SAVE_KEY', key: k });
  settings.classList.add('hidden'); alert('API key saved!');
});
$('copyBtn').addEventListener('click', copyResult);
$('retryBtn').addEventListener('click', function(){ if (currentAction) execute(currentAction); });
$('dismissErr').addEventListener('click', function(){ errorArea.classList.add('hidden'); });
$('activateBtn').addEventListener('click', activatePro);

document.addEventListener('keydown', function(e) {
  if ((e.metaKey||e.ctrlKey) && e.key>='1' && e.key<='4') { e.preventDefault(); execute(['summarize','translate','explain','rewrite'][parseInt(e.key)-1]); }
  if ((e.metaKey||e.ctrlKey) && e.key==='Enter') { e.preventDefault(); execute(currentAction||'summarize'); }
});

init();
})();
