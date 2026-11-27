// ===== 분실물 찾기 · 휴대폰 화면 (lost.html · 2026-11-24 · 2026-11-26 다시 만듦) =====
// 너비 700px 아래에서는 두 대시보드 대신 이 화면 (css/ops.css 「휴대폰」): 위 = 접수 버튼 둘 (「＋ 분실물 신고」 · 「＋ 분실물 습득」 — data-ladd 는 js/opsboard.js 가 받아 openEdit)
//  아래 = 내역이 늘 보임: 구분(분실물 신고 · 분실물 습득 · 전체 — 건수와 함께) · 찾기 · 목록 (카드: 사진 · 구분 이름표 · 물품 · 설명 · 날짜 · 장소 · 이름)
//  휴대폰에는 진행 중인 것만 (운영팀 2026-11-26): 신고 = 찾는 중 · 습득 = 보관중 (OPS_PAGE.boards 의 open). 끝난 것(처리완료 · 반환 완료 · 폐기)은 PC 에서 봄
//  상태 이름표는 없음 (모두 진행 중이라) — 대신 신고 / 습득 이름표를 색으로 구분 (신고 = 주황 · 습득 = 파랑), 「전체」에서는 신고 묶음 · 습득 묶음으로 나눠 보임
//  로그인했으면 카드를 눌러 고치기 (openEdit) · 로그인하지 않았으면 보기만 (이름 · 연락처는 서버가 가려서 줌)
// opsboard.js 의 rows · render · openEdit · phLoad · phOpen · GUEST 를 그대로 씀 (이 파일은 opsboard.js 다음에 읽음)
(function(){
  const box=$('#mHome'); if(!box) return;
  const NAME={'분실 신고':'분실물 신고', '습득':'분실물 습득'}, SHORT={'분실 신고':'신고', '습득':'습득'}, CLS={'분실 신고':'k-rep', '습득':'k-fnd'};
  const TABS=[['분실 신고',NAME['분실 신고']],['습득',NAME['습득']],['','전체']];
  const OPEN={}; (OPS_PAGE.boards||[]).forEach(b=>{ OPEN[b.kind]=b.open||[]; });
  const isOpen = x => (OPEN[lostKind(x.d)]||[]).includes(lostStatus(x.d));   // 진행 중 = 신고의 찾는 중 · 습득의 보관중
  let kind='분실 신고';
  // 2026-11-27: 신고 카드 = 「신고자 (고객 이름 · 전화번호)」 줄 + 「담당 (사유원 담당자 · 연락처)」 줄 · 습득 카드는 예전대로 「습득자」. 고객 이름 · 번호는 로그인한 사람에게만 (서버가 로그인 없는 사람에게는 보내지 않음)
  const card = x => { const d=x.d, k=lostKind(d), ps=Array.isArray(d.photos) ? d.photos : [], who=[d.person, d.phone].filter(Boolean).join(' · '), rep=GUEST ? '' : [d.reporter, d.reporterPhone].filter(Boolean).join(' · ');
    return `<div class="m-card ${CLS[k]}" data-mid="${esc(x.r.id)}">`
      + (ps.length ? `<img data-phimg="${esc(ps[0].id)}" data-phview="${esc(ps[0].id)}" alt="${esc(d.item||'사진')}">` : `<span class="m-noph">사진 없음</span>`)
      + `<div class="m-c"><div class="m-t"><small class="m-k">${SHORT[k]}</small><b>${esc(d.item||'')}</b></div>`
      + (d.feature && k!=='습득' ? `<span>${esc(d.feature)}</span>` : '')
      + `<small>${esc(opsDateLabel(d.date))}${d.place?` · ${esc(d.place)}`:''}${k==='습득' && d.storage?` · 보관 ${esc(d.storage)}`:''}</small>`
      + (k!=='습득' && rep ? `<small>신고자 ${esc(rep)}</small>` : '')
      + (who ? `<small>${k==='습득'?'습득자':'담당'} ${esc(who)}</small>` : '') + `</div></div>`; };
  function paint(){
    const live=rows.filter(isOpen), cnt=k=>live.filter(x=>!k || lostKind(x.d)===k).length;
    $('#mTabs').innerHTML = TABS.map(([k,l])=>`<button type="button" role="tab" data-mk="${esc(k)}" class="${k===kind?'on ':''}${CLS[k]||''}" aria-selected="${k===kind}">${esc(l)} <small>${cnt(k)}</small></button>`).join('');
    if(opsWait){ $('#mResults').innerHTML=SY.skel('cards', 4, {h:'5.6em', label:'분실물을 불러오는 중'}); return; }   // 처음 받는 중 (js/opsboard.js opsWait · 2026-11-27)
    const q=$('#mQ').value.trim().toLowerCase().replace(/\s/g,'');
    const hit=x=>{ const d=x.d; return [d.item, d.feature, d.place, d.storage, d.person, d.phone, d.reporter, d.reporterPhone, d.kind].join(' ').toLowerCase().replace(/\s/g,'').includes(q); };
    const of=k=>live.filter(x=>lostKind(x.d)===k && (!q || hit(x))).sort(lostSort);
    const none=`<p class="empty">${q ? '찾은 것이 없습니다.' : '진행 중인 것이 없습니다.'}</p>`;
    const sec=(k, head)=>{ const all=of(k), list=all.slice(0, 100);
      return (head ? `<h3 class="m-h ${CLS[k]}">${NAME[k]} <small>${all.length}건</small></h3>` : '') + (list.length ? list.map(card).join('') : none)
        + (all.length>list.length ? `<p class="hint m-more">최근 ${list.length}건만 보입니다 (모두 ${all.length}건) · 위에서 찾아 보세요</p>` : ''); };
    $('#mResults').innerHTML = kind ? sec(kind, false) : sec('분실 신고', true) + sec('습득', true);   // 전체 = 신고 묶음 · 습득 묶음
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
