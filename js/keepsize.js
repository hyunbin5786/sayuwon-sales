// ===== 메모 칸 크기 기억 (단체 · 개인고객 공통) =====
// 메모 칸(textarea)을 위아래로 늘리거나 줄이면 그 크기를 이 브라우저에 기억하고,
// 저장 · 다시 그리기로 칸이 새로 만들어져도 같은 크기로 (2026-11-17)
//  - 칸 구분: id 가 있으면 id, 추후 과업 메모는 과업마다(data-tm), 전산 비고 문구는 과업마다(data-tnote)
(function(){
  const LS='sy_ta_size';
  let sizes={}; try{ sizes=JSON.parse(localStorage.getItem(LS)||'{}')||{}; }catch(_){}
  const keyOf = el => el.closest && el.closest('.memo-stack') ? ''   // 단체 화면 통화 메모의 적는 자리(#memoBox)는 빼고 (2026-11-27): 예전 큰 글 상자 때 기억해 둔 높이가 한 줄짜리 입력란에 그대로 입혀져 입력란이 칸을 다 차지했음 — 높이는 js/group 의 noteGrow 가 맡음
    : el.id && !/^tpre_/.test(el.id) ? '#'+el.id
    : el.dataset.tm ? 'tm:'+el.dataset.tm : el.dataset.tnote ? 'tnote:'+el.dataset.tnote : '';
  const apply = el => { const k=keyOf(el), h=k && sizes[k]; if(h && el.style.height!==h+'px') el.style.height=h+'px'; };
  const applyAll = root => { (root.matches && root.matches('textarea') ? [root] : []).concat([...(root.querySelectorAll ? root.querySelectorAll('textarea') : [])]).forEach(apply); };
  // 손으로 크기를 바꿨는지: 누르기 시작할 때의 높이와 놓을 때의 높이가 다르면 기억
  let down=null;
  document.addEventListener('pointerdown', e=>{ const t=e.target; down = t && t.tagName==='TEXTAREA' ? {t, h:t.offsetHeight} : null; }, true);
  document.addEventListener('pointerup', ()=>{ if(!down) return; const {t, h}=down; down=null;
    const nh=t.offsetHeight, k=keyOf(t); if(!k || Math.abs(nh-h)<2) return;
    sizes[k]=nh; try{ localStorage.setItem(LS, JSON.stringify(sizes)); }catch(_){}
    t.style.height=nh+'px'; }, true);
  // 새로 그려진 칸에도 기억한 크기
  const start = () => { applyAll(document.body);
    new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType===1) applyAll(n); }))).observe(document.body, {childList:true, subtree:true}); };
  if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

// ===== 메모 칸 자동 높이 (2026-11-18): 스크롤 없이 줄이 늘면 칸이 아래로 늘어남 · 지금 크기(또는 손으로 맞춰 둔 크기)보다 작아지지는 않음 =====
//  - 붙여넣기 칸(전산 내역 · 단체상담 입력 · 사전답사 붙여넣기)은 빼고 (NO_GROW)
//  - 글자를 칠 때 · 프로그램이 값을 넣을 때(예약 열기 등) · 칸이 새로 그려질 때 · 칸에 들어갈 때 맞춤
(function(){
  const NO_GROW = new Set(['erpIn','consultBox','baImp']);
  const ok = el => el && el.tagName==='TEXTAREA' && !NO_GROW.has(el.id) && !el.hasAttribute('data-nogrow');
  function grow(el){
    if(!ok(el) || !el.isConnected || !el.offsetParent) return;
    if(!el.dataset.minh){ const h=el.offsetHeight; if(!h) return; el.dataset.minh=String(h); }   // 처음 크기 = 가장 작은 크기
    const min=+el.dataset.minh, cs=getComputedStyle(el), border=(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0);
    el.style.overflowY='hidden';
    const keep=el.style.height; el.style.height=min+'px';   // 줄었을 때도 맞추려고 잠깐 가장 작은 크기로
    const need=el.scrollHeight+border, h=Math.max(min, need);
    el.style.height=h+'px'; if(keep!==el.style.height){ /* 높이 바뀜 */ }
  }
  window.syGrow = grow;
  const growAll = root => (root.matches && root.matches('textarea') ? [root] : []).concat([...(root.querySelectorAll ? root.querySelectorAll('textarea') : [])]).forEach(el=>requestAnimationFrame(()=>grow(el)));
  document.addEventListener('input', e=>{ if(e.target.tagName==='TEXTAREA') grow(e.target); }, true);
  document.addEventListener('focusin', e=>{ if(e.target.tagName==='TEXTAREA') grow(e.target); }, true);
  // 손으로 크기를 바꾸면 그 크기가 새 가장 작은 크기 (위 크기 기억과 같이)
  document.addEventListener('pointerup', e=>{ setTimeout(()=>{ const t=document.activeElement; if(t && t.tagName==='TEXTAREA' && ok(t) && t.style.height){ const h=t.offsetHeight; if(h && h!==+t.dataset.minh && h>t.scrollHeight){ t.dataset.minh=String(h); } } }, 0); }, true);
  // 프로그램이 값을 넣을 때도 (예약 열기 · 새 통화 · 되살리기)
  const d=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
  if(d && d.set) Object.defineProperty(HTMLTextAreaElement.prototype, 'value', { configurable:true, enumerable:d.enumerable, get(){ return d.get.call(this); }, set(v){ d.set.call(this, v); if(ok(this)) requestAnimationFrame(()=>grow(this)); } });
  const start = () => { growAll(document.body);
    new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType===1) growAll(n); }))).observe(document.body, {childList:true, subtree:true});
    // 숨어 있다가 보이는 칸(팝업 · 접힌 칸): 화면 크기가 바뀌거나 팝업이 열리면 다시
    window.addEventListener('resize', ()=>soon());
    let pend=false; const soon=()=>{ if(pend) return; pend=true; requestAnimationFrame(()=>{ pend=false; growAll(document.body); }); };   // 한 장면에 한 번만
    new MutationObserver(soon).observe(document.body, {attributes:true, subtree:true, attributeFilter:['hidden','open']}); };
  if(document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
