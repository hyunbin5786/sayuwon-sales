// ===== 메모 칸 크기 기억 (단체 · 개인고객 공통) =====
// 메모 칸(textarea)을 위아래로 늘리거나 줄이면 그 크기를 이 브라우저에 기억하고,
// 저장 · 다시 그리기로 칸이 새로 만들어져도 같은 크기로 (2026-11-17)
//  - 칸 구분: id 가 있으면 id, 추후 과업 메모는 과업마다(data-tm), 전산 비고 문구는 과업마다(data-tnote)
(function(){
  const LS='sy_ta_size';
  let sizes={}; try{ sizes=JSON.parse(localStorage.getItem(LS)||'{}')||{}; }catch(_){}
  const keyOf = el => el.id && !/^tpre_/.test(el.id) ? '#'+el.id
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
