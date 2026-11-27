// ===== 분실물 찾기 (lost.html) — 이 페이지의 칸 · 목록 열만. 동작은 js/opsboard.js (운영보조 공통 엔진 · 분실물은 renderLost) =====
// 칸: {k 저장 이름, l 화면 이름, type, req 꼭 넣기, def 처음 값, show 보일 조건, w:2 두 칸 너비, ph 안내 글씨, opts 고르는 값(함수면 그때의 칸 값으로)}
// 2026-11-24: 「분실 신고」와 「습득」을 두 대시보드(2열)로 나눔 — 상태도 따로
//   분실 신고: 찾는 중 · 처리완료        습득: 보관중 · 반환 완료 · 폐기 (습득은 사진 꼭)
//   예전 기록의 상태는 lostStatus() 로 그 구분에 맞게 읽음 (분실 신고의 보관중 → 찾는 중 · 반환 완료/폐기 → 처리완료, 습득의 찾는 중 → 보관중)
const LOST_ST = { '습득':['보관중','반환 완료','폐기'], '분실 신고':['찾는 중','처리완료'] };
const lostKind = d => d.kind==='분실 신고' ? '분실 신고' : '습득';
// 2026-11-27: 분실 신고의 person · phone 칸 이름을 「사유원 담당자」 · 「사유원 담당자 연락처」로 (접수한 직원이 들어가는 칸이라 · 저장 이름은 그대로 — 예전 신고도 그대로 보임).
//   물건을 잃어버린 고객은 새 칸 reporter(분실물 신고자) · reporterPhone(분실물 신고자 전화번호)
const lostWho = d => lostKind(d)==='습득' ? '습득자' : '사유원 담당자';
// 새 칸을 보일지: 서버가 13 번부터 고객 이름 · 번호를 로그인 없는 목록에 보내지 않고(lostList) 로그인 없는 접수에서도 받음(lostAdd) — 그 전 서버면 새 칸을 보이지 않음 (로그인 없는 사람에게 새어 나가지 않게 · opsboard.js LOST_RP).
//   이미 값이 있는 신고를 고칠 때는 늘 보임 (칸이 안 보이는 채로 저장하면 값이 빠지므로)
const lostRp = d => lostKind(d)==='분실 신고' && (!!window.LOST_RP || !!d.reporter || !!d.reporterPhone);
const lostNew = () => typeof editRow==='undefined' || !editRow;   // 새로 접수하는 중 (고치는 중이 아님 · opsboard.js editRow)
const lostGuest = () => typeof GUEST!=='undefined' && GUEST;      // 로그인하지 않음
// 표의 「이름 + 아래 줄에 연락처」 칸
const lostNameTel = (n, t) => ({html:`${esc(n||'')}${t ? `${n?'<br>':''}<span class="hint">${esc(t)}</span>` : ''}`});
// 정렬 = 날짜(접수일) 내림차순 · 같은 날은 나중에 넣은 것 먼저 (2026-11-24 · 표 · 휴대폰 검색 모두). 날짜 모양이 달라도(2026.11.20 등) 숫자만 비교
const lostDateKey = x => String(x.d.date||'').replace(/\D/g,'').slice(0,8).padEnd(8,'0') + String(x.r.saved||'');
const lostSort = (a, b) => lostDateKey(b).localeCompare(lostDateKey(a));
function lostStatus(d){
  const k=lostKind(d), s=d.status||'';
  if(LOST_ST[k].includes(s)) return s;
  if(k==='분실 신고') return /반환|폐기|완료/.test(s) ? '처리완료' : '찾는 중';
  return s==='찾는 중' || !s ? '보관중' : s;
}
const OPS_PAGE =
{ key:'lost', title:'분실물 찾기', add:'분실물 접수', hint:'분실 신고 · 습득물 보관 · 반환까지', guest:true,   // guest: 로그인 없이 보기 · 접수 (2026-11-24 · opsboard.js GUEST)
    fields:[ {k:'kind', l:'구분', type:'select', opts:['습득','분실 신고'], def:()=>'습득'}, {k:'date', l:'접수일', type:'date', def:()=>opsToday()},
      {k:'item', l:'물품', type:'text', req:1}, {k:'feature', l:'설명', type:'text', ph:'색 · 브랜드 · 안에 든 것', show:d=>lostKind(d)!=='습득'},   // 설명은 분실물 신고만 (습득은 사진으로 · 2026-11-24)
      {k:'photos', l:d=>lostKind(d)==='습득' ? '습득물 사진' : '분실물 사진 (고객이 보내 준 사진 · 없어도 됨)', type:'photos', w:2, req:d=>lostKind(d)==='습득',   // 습득이면 사진 꼭 (찍기 · 고르기 · 붙여넣기 · png / jpeg) — js/opsboard.js 의 photos 칸
        show:d=>lostKind(d)==='습득' || !(typeof GUEST!=='undefined' && GUEST) || !!window.LOST_GUEST_PH},   // 신고에도 사진 (2026-11-26 · 꼭은 아님). 로그인 없이 넣는 신고는 서버가 api 11 부터 사진을 받음 — 예전 서버면 칸을 보이지 않음 (opsboard.js LOST_GUEST_PH)
      {k:'place', l:d=>lostKind(d)==='습득' ? '발견 장소' : '분실 추정 장소', type:'text', w:d=>lostRp(d) ? 2 : 1},   // 신고는 한 줄을 통째로 (아래 신고자 두 칸 · 담당자 두 칸이 나란히 놓이게) {k:'storage', l:'보관 위치', type:'text', show:d=>lostKind(d)==='습득'},
      // 2026-11-27: 분실물 신고자(고객) — 신고만 · 이름은 새로 접수할 때 꼭 (예전 신고를 고칠 때는 비어 있어도 저장됨) · 전화번호는 없어도 됨 (연락처를 남기지 않는 고객도 있어서)
      {k:'reporter', l:'분실물 신고자', type:'text', ph:'물건을 잃어버린 분', show:lostRp, req:()=>lostNew()}, {k:'reporterPhone', l:'분실물 신고자 전화번호', type:'tel', show:lostRp},
      // 2026-11-24: 구분에 따라 이름이 바뀜 (분실물 신고 = 사유원 담당자(2026-11-27 · 예전 이름 신고자) · 분실물 습득 = 습득자)
      //   꼭 넣기: 습득자 이름 · 신고의 사유원 담당자(로그인했을 때 — 저절로 채워짐 · 로그인 없이 접수하면 비워도 됨). 담당자 연락처는 꼭이 아님 (예전 「신고자 연락처 꼭」은 고객에게 연락하려던 것 — 이제 고객 번호는 위 칸)
      {k:'person', l:d=>lostWho(d), type:'text', req:d=>lostKind(d)==='습득' || !lostGuest()}, {k:'phone', l:d=>lostWho(d)+' 연락처', type:'tel'},
      // 상태 칸은 접수 · 수정 창에 없음 (2026-11-24): 처음은 신고 = 찾는 중 · 습득 = 보관중 (onField) · 바꾸기는 표의 드롭다운에서만
      {k:'returnDate', l:'반환일', type:'date', show:d=>d.status==='반환 완료'},
      {k:'returnTo', l:'반환 받은 분', type:'text', show:d=>d.status==='반환 완료'},
      {k:'memo', l:'메모', type:'textarea', w:2} ],
    // 구분을 바꾸면 상태를 그 구분의 첫 상태로 (opsboard.js 가 칸을 바꿀 때 부름)
    //  습득이면 습득자 · 연락처 = 로그인한 사람 (멤버관리에 적은 연락처 · 두 칸이 비어 있을 때만 · 2026-11-24 · opsboard.js 의 opsMe)
    onField:(k, d)=>{ if(k!=='kind') return; d.status = LOST_ST[lostKind(d)][0];
      if(!window.opsMe) return;
      // 2026-11-26: 신고도 습득과 같이 — 신고자(2026-11-27 부터 이름 「사유원 담당자」) · 연락처 = 로그인한 사람 (예전에는 신고로 바꾸면 자동으로 넣은 내 이름을 뺐음). 로그인하지 않았으면 빈칸 그대로 · 넣은 뒤 고칠 수 있음
      if(!d.person && !d.phone && opsMe.name){ d.person = opsMe.name; d.phone = opsMe.phone || ''; } },
    normalize:d=>{ d.status = lostStatus(d); },
    // 두 대시보드 (opsboard.js renderLost)
    boards:[
      { kind:'분실 신고', title:'분실물 신고', add:'분실 신고 접수', open:['찾는 중'], photo:true, noPhoto:'',   // 사진 칸 (2026-11-26): 고객이 보내 준 사진이 있으면 작게 · 없으면 빈칸
        cols:[['date','접수일',v=>opsDateLabel(v)],['item','물품',(v,d)=>({html:`<b>${esc(v||'')}</b>${d.feature?`<br><span class="hint">${esc(d.feature)}</span>`:''}`})],['place','분실 추정 장소'],
          ['reporter','분실물 신고자',(v,d)=>lostNameTel(v, d.reporterPhone), 'in'],   // 넷째 값 'in' = 로그인한 사람에게만 보이는 열 (opsboard.js renderLost · 고객 이름 · 번호)
          ['person','사유원 담당자',(v,d)=>lostNameTel(v, d.phone)]] },
      { kind:'습득', title:'분실물 습득', add:'습득물 접수', open:['보관중'], photo:true,
        cols:[['date','접수일',v=>opsDateLabel(v)],['item','물품'],['place','발견 장소'],['storage','보관 위치'],['person','습득자'],['phone','습득자 연락처']] } ],
    cols:[['date','접수일',v=>opsDateLabel(v)],['kind','구분'],['item','물품'],['status','상태']],
    status:'status', open:['보관중','찾는 중'], summary:d=>`${lostKind(d)} ${d.item||''} · ${lostStatus(d)}` };
