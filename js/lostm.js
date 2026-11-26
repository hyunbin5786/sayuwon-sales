// ===== 분실물 찾기 · 휴대폰 화면 (lost.html · 2026-11-24 · 2026-11-26 다시 만듦) =====
// 너비 700px 아래에서는 두 대시보드 대신 이 화면 (css/ops.css 「휴대폰」): 위 = 접수 버튼 둘 (「＋ 분실 신고 접수」 · 「＋ 습득물 접수」 — data-ladd 는 js/opsboard.js 가 받아 openEdit)
//  아래 = 내역이 늘 보임: 구분(분실 신고 · 습득 · 전체 — 건수와 함께) · 찾기 · 목록 (카드: 사진 · 물품 · 설명 · 날짜 · 장소 · 이름 · 상태). 예전에는 「검색」을 눌러야 목록이 나와 접수만 되는 것처럼 보였음
//  로그인했으면 카드를 눌러 고치기 (상태 바꾸기 등 · openEdit) · 로그인하지 않았으면 보기만 (이름 · 연락처는 서버가 가려서 줌)
// opsboard.js 의 rows · render · openEdit · phLoad · phOpen · GUEST 를 그대로 씀 (이 파일은 opsboard.js 다음에 읽음)
(function(){
  const box=$('#mHome'); if(!box) return;
  const TABS=[['분실 신고','분실 신고'],['습득','습득'],['','전체']];
  let kind='분실 신고';
  const card = x => { const d=x.d, k=lostKind(d), s=lostStatus(d), ps=Array.isArray(d.photos) ? d.photos : [], who=[d.person, d.phone].filter(Boolean).join(' · ');
    return `<div class="m-card" data-mid="${esc(x.r.id)}">`
      + (ps.length ? `<img data-phimg="${esc(ps[0].id)}" data-phview="${esc(ps[0].id)}" alt="${esc(d.item||'사진')}">` : `<span class="m-noph">사진 없음</span>`)
      + `<div class="m-c"><div class="m-t"><b>${esc(d.item||'')}</b><small class="st st-${esc(s)}">${esc(s)}</small></div>`
      + (d.feature && k!=='습득' ? `<span>${esc(d.feature)}</span>` : '')
      + `<small>${kind ? '' : (k==='습득'?'습득 · ':'신고 · ')}${esc(opsDateLabel(d.date))}${d.place?` · ${esc(d.place)}`:''}${k==='습득' && d.storage?` · 보관 ${esc(d.storage)}`:''}</small>`
      + (who ? `<small>${k==='습득'?'습득자':'신고자'} ${esc(who)}</small>` : '') + `</div></div>`; };
  function paint(){
    const cnt=k=>rows.filter(x=>!k || lostKind(x.d)===k).length;
    $('#mTabs').innerHTML = TABS.map(([k,l])=>`<button type="button" role="tab" data-mk="${esc(k)}" class="${k===kind?'on':''}" aria-selected="${k===kind}">${esc(l)} <small>${cnt(k)}</small></button>`).join('');
    const q=$('#mQ').value.trim().toLowerCase().replace(/\s/g,'');
    const hit=x=>{ const d=x.d; return [d.item, d.feature, d.place, d.storage, d.person, d.phone, d.kind].join(' ').toLowerCase().replace(/\s/g,'').includes(q); };
    const all=rows.filter(x=>(!kind || lostKind(x.d)===kind) && (!q || hit(x))).sort(lostSort), list=all.slice(0, 100);
    $('#mResults').innerHTML = (list.length ? list.map(card).join('') : `<p class="empty">${q ? '찾은 것이 없습니다.' : '아직 접수된 것이 없습니다.'}</p>`)
      + (all.length>list.length ? `<p class="hint m-more">최근 ${list.length}건만 보입니다 (모두 ${all.length}건) · 위에서 찾아 보세요</p>` : '');
    $('#mResults').querySelectorAll('img[data-phimg]').forEach(im=>{ phLoad(im.dataset.phimg).then(u=>{ im.src=u; }).catch(()=>{ im.classList.add('bad'); }); });
  }
  $('#mQ').addEventListener('input', paint);
  $('#mTabs').addEventListener('click', e=>{ const b=e.target.closest('[data-mk]'); if(!b) return; kind=b.dataset.mk; paint(); });
  $('#mResults').addEventListener('click', e=>{
    const im=e.target.closest('img[data-phview]'); if(im){ if(im.src) phOpen(im.src); return; }
    const c=e.target.closest('[data-mid]'); if(c && !GUEST){ const x=rows.find(y=>y.r.id===c.dataset.mid); if(x) openEdit(x); } });   // 로그인했으면 눌러서 고치기
  const base=render; render=function(){ base.apply(this, arguments); paint(); };   // 목록을 새로 받으면 여기도
  paint();
})();
