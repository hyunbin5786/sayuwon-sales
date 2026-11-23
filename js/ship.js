// ===== 스마트스토어 발송 보고 (ship.html) — 이 페이지의 칸 · 목록 열만. 동작은 js/opsboard.js (운영보조 공통 엔진) =====
// 칸: {k 저장 이름, l 화면 이름, type, req 꼭 넣기, def 처음 값, show 보일 조건, w:2 두 칸 너비, ph 안내 글씨} · cols: 목록 열 [k, 이름, 보이는 모양]
// open: 「진행 중」으로 치는 상태들 · summary: 공유 기록 요약 칸에 넣을 한 줄
const OPS_PAGE =
  // 스마트스토어 발송 보고 (2026-11-18): 엑셀(★ 스마트스토어 발송내역.xlsx, 달마다 시트) 열 그대로 · 상품명 = 품목관리 굿즈
{ key:'ship', title:'스마트스토어 발송 보고', add:'발송 추가', hint:'주문 · 발송 · 수령 · 달마다 보고',
    fields:[ {k:'orderDate', l:'주문일', type:'date', def:()=>opsToday()}, {k:'shipDate', l:'발송일', type:'date'}, {k:'recvDate', l:'수령일', type:'date'},
      {k:'item', l:'상품명 (굿즈)', type:'goods', req:1, w:2}, {k:'qty', l:'수량', type:'num', def:()=>'1'}, {k:'amount', l:'총 주문금액', type:'num'}, {k:'shipFee', l:'배송비', type:'num'},
      {k:'buyer', l:'구매자명', type:'text'}, {k:'recv', l:'수취인명', type:'text'}, {k:'phone', l:'수취인연락처', type:'tel'}, {k:'phone2', l:'수취인연락처2', type:'tel'},
      {k:'addr', l:'기본배송지', type:'text', w:2}, {k:'addr2', l:'상세배송지', type:'text'}, {k:'zip', l:'우편번호', type:'text'}, {k:'msg', l:'배송메세지', type:'textarea', w:2} ],
    summary:d=>`${d.orderDate||''} ${d.item||''} ${d.qty||''}개 · ${d.recv||d.buyer||''}` };
