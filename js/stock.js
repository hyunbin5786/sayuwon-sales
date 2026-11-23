// ===== 재고확인 (stock.html) — 이 페이지의 칸 · 목록 열만. 동작은 js/opsboard.js (운영보조 공통 엔진) =====
// 칸: {k 저장 이름, l 화면 이름, type, req 꼭 넣기, def 처음 값, show 보일 조건, w:2 두 칸 너비, ph 안내 글씨} · cols: 목록 열 [k, 이름, 보이는 모양]
// open: 「진행 중」으로 치는 상태들 · summary: 공유 기록 요약 칸에 넣을 한 줄
const OPS_PAGE =
{ key:'stock', title:'재고확인', add:'품목 추가', hint:'품목별 수량 · 최소 수량 아래면 빨강',
    fields:[ {k:'name', l:'품목', type:'text', req:1}, {k:'cat', l:'분류', type:'text'}, {k:'place', l:'위치', type:'text'},
      {k:'qty', l:'수량', type:'num', def:()=>'0'}, {k:'unit', l:'단위', type:'text', def:()=>'개'}, {k:'min', l:'최소 수량', type:'num', ph:'이 아래면 부족'}, {k:'memo', l:'메모', type:'textarea', w:2} ],
    summary:d=>`${d.name||''} ${d.qty||0}${d.unit||''}` };
