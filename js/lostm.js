// ===== 분실물 찾기 · 휴대폰 화면 (lost.html · 2026-11-24) =====
// 너비 700px 아래에서는 두 대시보드 대신 이 화면 (css/ops.css 「휴대폰」): 처음에 「분실물 신고」 / 「분실물 습득」 중 하나를 고르면 그 구분으로 접수 창이 열림
//  (버튼의 data-ladd 는 js/opsboard.js 가 받아 openEdit) · 「🔍 검색」 하나로 신고 · 습득을 같이 찾음 (카드: 사진 · 구분 · 물품 · 날짜 · 장소 · 상태)
// opsboard.js 의 rows · render · openEdit · phLoad · phOpen · GUEST 를 그대로 씀 (이 파일은 opsboard.js 다음에 읽음)
(function(){
  const box=$('#mHome'); if(!box) return;
  const card = x => { const d=x.d, k=lostKind(d), s=lostStatus(d), ps=Array.isArray(d.photos) ? d.photos : [];
    return `<div class="m-card" data-mid="${esc(x.r.id)}">`
      + (ps.length ? `<img data-phimg="${esc(ps[0].id)}" data-phview="${esc(ps[0].id)}" alt="${esc(d.item||'사진')}">` : `<span class="m-noph">${k==='습득'?'사진 없음':'신고'}</span>`)
      + `<div class="m-c"><b>${esc(d.item||'')}</b>${d.feature?`<span>${esc(d.feature)}</span>`:''}`
      + `<small>${k==='습득'?'분실물 습득':'분실물 신고'} · ${esc(opsDateLabel(d.date))}${d.place?` · ${esc(d.place)}`:''}${k==='습득' && d.storage?` · 보관 ${esc(d.storage)}`:''}</small>`
      + `<small class="st st-${esc(s)}">${esc(s)}</small></div></div>`; };
  function paint(){
    if($('#mSearch').hidden) return;
    const q=$('#mQ').value.trim().toLowerCase().replace(/\s/g,'');
    const hit=x=>{ const d=x.d; return [d.item, d.feature, d.place, d.storage, d.person, d.phone, d.kind].join(' ').toLowerCase().replace(/\s/g,'').includes(q); };
    const list=rows.filter(x=>!q || hit(x)).sort((a,b)=>String(b.d.date||'').localeCompare(String(a.d.date||'')) || String(b.r.saved).localeCompare(String(a.r.saved))).slice(0, 60);
    $('#mResults').innerHTML = list.length ? list.map(card).join('') : `<p class="empty">${q ? '찾은 것이 없습니다.' : '아직 접수된 분실물이 없습니다.'}</p>`;
    $('#mResults').querySelectorAll('img[data-phimg]').forEach(im=>{ phLoad(im.dataset.phimg).then(u=>{ im.src=u; }).catch(()=>{ im.classList.add('bad'); }); });
  }
  $('#mSearchBtn').addEventListener('click', ()=>{ const s=$('#mSearch'); s.hidden=!s.hidden; $('#mSearchBtn').classList.toggle('on', !s.hidden); if(!s.hidden){ paint(); $('#mQ').focus(); } });
  $('#mQ').addEventListener('input', paint);
  $('#mResults').addEventListener('click', e=>{
    const im=e.target.closest('img[data-phview]'); if(im){ if(im.src) phOpen(im.src); return; }
    const c=e.target.closest('[data-mid]'); if(c && !GUEST){ const x=rows.find(y=>y.r.id===c.dataset.mid); if(x) openEdit(x); } });   // 로그인했으면 눌러서 고치기
  const base=render; render=function(){ base.apply(this, arguments); paint(); };   // 목록을 새로 받으면 검색 결과도
})();
