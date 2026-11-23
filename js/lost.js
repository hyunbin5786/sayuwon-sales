// ===== 분실물 찾기 (lost.html) — 이 페이지의 칸 · 목록 열만. 동작은 js/opsboard.js (운영보조 공통 엔진 · 분실물은 renderLost) =====
// 칸: {k 저장 이름, l 화면 이름, type, req 꼭 넣기, def 처음 값, show 보일 조건, w:2 두 칸 너비, ph 안내 글씨, opts 고르는 값(함수면 그때의 칸 값으로)}
// 2026-11-24: 「분실 신고」와 「습득」을 두 대시보드(2열)로 나눔 — 상태도 따로
//   분실 신고: 찾는 중 · 처리완료        습득: 보관중 · 반환 완료 · 폐기 (습득은 사진 꼭)
//   예전 기록의 상태는 lostStatus() 로 그 구분에 맞게 읽음 (분실 신고의 보관중 → 찾는 중 · 반환 완료/폐기 → 처리완료, 습득의 찾는 중 → 보관중)
const LOST_ST = { '습득':['보관중','반환 완료','폐기'], '분실 신고':['찾는 중','처리완료'] };
const lostKind = d => d.kind==='분실 신고' ? '분실 신고' : '습득';
function lostStatus(d){
  const k=lostKind(d), s=d.status||'';
  if(LOST_ST[k].includes(s)) return s;
  if(k==='분실 신고') return /반환|폐기|완료/.test(s) ? '처리완료' : '찾는 중';
  return s==='찾는 중' || !s ? '보관중' : s;
}
const OPS_PAGE =
{ key:'lost', title:'분실물 찾기', add:'분실물 접수', hint:'분실 신고 · 습득물 보관 · 반환까지',
    fields:[ {k:'kind', l:'구분', type:'select', opts:['습득','분실 신고'], def:()=>'습득'}, {k:'date', l:'접수일', type:'date', def:()=>opsToday()},
      {k:'item', l:'물품', type:'text', req:1}, {k:'feature', l:'특징', type:'text', ph:'색 · 브랜드 · 안에 든 것'},
      {k:'photos', l:'습득물 사진', type:'photos', w:2, req:1, show:d=>lostKind(d)==='습득'},   // 습득이면 사진 꼭 (찍기 · 고르기 · png / jpeg) — js/opsboard.js 의 photos 칸
      {k:'place', l:'발견 · 분실 장소', type:'text'}, {k:'storage', l:'보관 위치', type:'text', show:d=>lostKind(d)==='습득'},
      {k:'person', l:'습득자 / 신고자', type:'text'}, {k:'phone', l:'연락처', type:'tel'},
      {k:'status', l:'상태', type:'select', opts:d=>LOST_ST[lostKind(d)], def:()=>'보관중'}, {k:'returnDate', l:'반환일', type:'date', show:d=>d.status==='반환 완료'},
      {k:'returnTo', l:'반환 받은 분', type:'text', show:d=>d.status==='반환 완료'},
      {k:'memo', l:'메모', type:'textarea', w:2} ],
    // 구분을 바꾸면 상태를 그 구분의 첫 상태로 (opsboard.js 가 칸을 바꿀 때 부름)
    onField:(k, d)=>{ if(k==='kind') d.status = LOST_ST[lostKind(d)][0]; },
    normalize:d=>{ d.status = lostStatus(d); },
    // 두 대시보드 (opsboard.js renderLost)
    boards:[
      { kind:'분실 신고', title:'분실 신고', add:'분실 신고 접수', open:['찾는 중'],
        cols:[['date','접수일',v=>opsDateLabel(v)],['item','물품',(v,d)=>(v||'')+(d.feature?` · ${d.feature}`:'')],['place','분실 장소'],['person','신고자'],['phone','연락처']] },
      { kind:'습득', title:'습득', add:'습득물 접수', open:['보관중'], photo:true,
        cols:[['date','접수일',v=>opsDateLabel(v)],['item','물품',(v,d)=>(v||'')+(d.feature?` · ${d.feature}`:'')],['place','발견 장소'],['storage','보관 위치']] } ],
    cols:[['date','접수일',v=>opsDateLabel(v)],['kind','구분'],['item','물품'],['status','상태']],
    status:'status', open:['보관중','찾는 중'], summary:d=>`${lostKind(d)} ${d.item||''} · ${lostStatus(d)}` };
