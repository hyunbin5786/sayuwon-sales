// ===== 사고현황 접수 (accident.html) — 이 페이지의 칸 · 목록 열만. 동작은 js/opsboard.js (운영보조 공통 엔진) =====
// 칸: {k 저장 이름, l 화면 이름, type, req 꼭 넣기, def 처음 값, show 보일 조건, w:2 두 칸 너비, ph 안내 글씨} · cols: 목록 열 [k, 이름, 보이는 모양]
// open: 「진행 중」으로 치는 상태들 · summary: 공유 기록 요약 칸에 넣을 한 줄
const ACC_ST = ['접수','처리 중','완료'];
const OPS_PAGE =
{ key:'accident', title:'사고현황 접수', add:'사고 접수', hint:'부상 · 시설 파손 등 · 조치와 처리 상태',
    fields:[ {k:'date', l:'날짜', type:'date', def:()=>opsToday()}, {k:'time', l:'시각', type:'time'},
      {k:'type', l:'유형', type:'select', opts:['부상','시설 파손','분실 · 도난','민원','기타'], def:()=>'부상'}, {k:'place', l:'장소', type:'text'},
      {k:'person', l:'관련자', type:'text', ph:'방문객 이름 · 단체명'}, {k:'phone', l:'연락처', type:'tel'},
      {k:'what', l:'내용', type:'textarea', req:1, w:2}, {k:'action', l:'조치', type:'textarea', w:2},
      {k:'status', l:'상태', type:'select', opts:ACC_ST, def:()=>'접수'}, {k:'staff', l:'담당', type:'text', def:()=>user.name||''}, {k:'memo', l:'메모', type:'textarea', w:2} ],
    cols:[['date','날짜',(v,d)=>`${opsDateLabel(v)}${d.time?' '+d.time:''}`],['type','유형'],['place','장소'],['what','내용',v=>String(v||'').split('\n')[0].slice(0,40)],['status','상태'],['staff','담당']],
    status:'status', open:['접수','처리 중'], summary:d=>`${d.type||''} ${d.place||''} · ${d.status||''}` };
