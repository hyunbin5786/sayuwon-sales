// ===== 분실물 찾기 (lost.html) — 이 페이지의 칸 · 목록 열만. 동작은 js/opsboard.js (운영보조 공통 엔진) =====
// 칸: {k 저장 이름, l 화면 이름, type, req 꼭 넣기, def 처음 값, show 보일 조건, w:2 두 칸 너비, ph 안내 글씨} · cols: 목록 열 [k, 이름, 보이는 모양]
// open: 「진행 중」으로 치는 상태들 · summary: 공유 기록 요약 칸에 넣을 한 줄
const LOST_ST = ['보관중','찾는 중','반환 완료','폐기'];
const OPS_PAGE =
{ key:'lost', title:'분실물 찾기', add:'분실물 접수', hint:'습득물 보관 · 분실 신고 · 반환까지',
    fields:[ {k:'kind', l:'구분', type:'select', opts:['습득','분실 신고'], def:()=>'습득'}, {k:'date', l:'접수일', type:'date', def:()=>opsToday()},
      {k:'item', l:'물품', type:'text', req:1}, {k:'feature', l:'특징', type:'text', ph:'색 · 브랜드 · 안에 든 것'},
      {k:'photos', l:'습득물 사진', type:'photos', w:2, show:d=>d.kind==='습득'},   // 2026-11-23: 습득이면 사진 (찍기 · 고르기 · png / jpeg) — js/opsboard.js 의 photos 칸
      {k:'place', l:'발견 · 분실 장소', type:'text'}, {k:'storage', l:'보관 위치', type:'text'},
      {k:'person', l:'습득자 / 신고자', type:'text'}, {k:'phone', l:'연락처', type:'tel'},
      {k:'status', l:'상태', type:'select', opts:LOST_ST, def:()=>'보관중'}, {k:'returnDate', l:'반환일', type:'date', show:d=>d.status==='반환 완료'},
      {k:'returnTo', l:'반환 받은 분', type:'text', show:d=>d.status==='반환 완료'},
      {k:'memo', l:'메모', type:'textarea', w:2} ],
    cols:[['date','접수일',v=>opsDateLabel(v)],['kind','구분'],['item','물품',(v,d)=>(v||'')+((d.photos||[]).length ? ` 📷${d.photos.length}` : '')],['place','장소'],['storage','보관 위치'],['status','상태'],['phone','연락처']],
    status:'status', open:['보관중','찾는 중'], summary:d=>`${d.kind||''} ${d.item||''} · ${d.status||''}` };
