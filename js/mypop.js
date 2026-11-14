// ===== 마이페이지 팝업 (첫 화면 · 개인고객 · 다음날 준비 공통) =====

(function(){
  const pop=document.getElementById('myPop'), fr=document.getElementById('myPopFrame');
  // 마이페이지 팝업 (개인고객 · 다음날 준비 화면 공통). <body data-my-tab="personal"> 이면 그 탭부터
  const tab=document.body.dataset.myTab||'';
  window.openMyPop = () => { fr.src='group.html?my=1&embed=1'+(tab?'&tab='+tab:'')+'&t='+Date.now(); pop.hidden=false; };
  const close = () => { pop.hidden=true; fr.src='about:blank'; };
  window.addEventListener('message', e=>{ if(!e.data || e.data.type!=='sy-my' || e.source!==fr.contentWindow) return;
    if(e.data.ev==='close') close();
    if(e.data.ev==='go' && /^(group|personal)\.html\?open=/.test(e.data.url||'')){ close(); location.href=e.data.url; } });   // 과업 줄 → 그 화면으로
  pop.addEventListener('click', e=>{ if(e.target===pop) close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !pop.hidden){ e.preventDefault(); close(); } });
  document.addEventListener('click', e=>{ const b=e.target.closest('[data-mypop]'); if(b){ e.preventDefault(); window.openMyPop(); } });
})();
