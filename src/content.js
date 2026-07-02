// Content script — floating ✨ button on text selection
(function(){
'use strict';

var btn = null, selectedText = '';

function makeBtn() {
  if (btn) return;
  btn = document.createElement('div');
  btn.innerHTML = '✨';
  Object.assign(btn.style, {
    position:'fixed',zIndex:'2147483647',
    width:'40px',height:'40px',borderRadius:'50%',
    background:'linear-gradient(135deg,#667eea,#764ba2)',
    display:'flex',alignItems:'center',justifyContent:'center',
    cursor:'pointer',fontSize:'20px',boxShadow:'0 4px 15px rgba(102,126,234,0.6)',
    opacity:'0',transform:'scale(0.8)',pointerEvents:'none',
    transition:'opacity 0.15s, transform 0.15s, background 0.3s'
  });
  btn.onclick = function(e) {
    e.preventDefault(); e.stopPropagation();
    // Store + open
    chrome.runtime.sendMessage({ type: 'OPEN_AI', text: selectedText, url: location.href, title: document.title });
    // Checkmark animation
    btn.innerHTML = '✓';
    btn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
    btn.style.transform = 'scale(1.2)';
    setTimeout(function(){
      if (btn) { btn.innerHTML = '✨'; btn.style.background = 'linear-gradient(135deg,#667eea,#764ba2)'; btn.style.transform = 'scale(1)'; }
    }, 1200);
    // Hide
    setTimeout(function(){ hideBtn(); }, 2000);
  };
  if (document.body) document.body.appendChild(btn);
  else setTimeout(function(){ if(document.body) document.body.appendChild(btn); }, 100);
}

function position(r) {
  if (!btn) makeBtn();
  var top = r.top + window.scrollY - 48;
  var left = r.right + window.scrollX + 10;
  if (top < window.scrollY + 8) top = r.bottom + window.scrollY + 8;
  if (left + 48 > window.innerWidth + window.scrollX) left = r.left + window.scrollX - 52;
  btn.style.top = top+'px'; btn.style.left = left+'px';
  btn.style.opacity = '1'; btn.style.transform = 'scale(1)'; btn.style.pointerEvents = 'auto';
}

function hideBtn() { if (!btn) return; btn.style.opacity='0'; btn.style.transform='scale(0.8)'; btn.style.pointerEvents='none'; }

document.addEventListener('mouseup', function(){
  setTimeout(function(){
    var s = window.getSelection();
    var t = s ? s.toString().trim() : '';
    if (t.length < 2) { selectedText=''; hideBtn(); return; }
    if (t === selectedText) return;
    selectedText = t;
    try {
      var r = s.getRangeAt(0).getBoundingClientRect();
      if (r && r.width > 0 && r.height > 0) { makeBtn(); position(r); }
    } catch(e) {}
  }, 50);
});

document.addEventListener('mousedown', function(e){
  if (btn && !btn.contains(e.target)) {
    setTimeout(function(){
      if (!window.getSelection() || !window.getSelection().toString().trim()) { selectedText=''; hideBtn(); }
    }, 100);
  }
});

window.addEventListener('scroll', function(){ hideBtn(); }, {passive:true});
})();
