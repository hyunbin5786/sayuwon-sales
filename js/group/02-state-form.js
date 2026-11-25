// ▣ js/group/02-state-form.js — 상태: rec(지금 예약의 칸 값) · tasks · hist · editingId · 새 예약으로 비우기 · 비고 칸에 모아 저장하는 값 쓰기/읽기(packExtra · unpackExtra) · 미정 · 몽몽마방 메뉴
// ===================== 상태 =====================
let rec, touched, startedAt, editingId, nContacts;
let cache=[];
const PPL_TITLE='전날 확인 변경 → 예약내역&전산 확인';   // 「관람 인원이 바뀌면」 과업 이름 (2026-11-21 · 예전 「예약 내역&전산 내역 확인」 · 직접 고친 이름은 그대로)
let memoOpened='';   // 예약을 열 때의 통화 메모 (다른 곳에서 바뀌어 다시 열 때 적던 글을 지키는 데 씀 · 2026-11-24)
let hist=[], baseSnap=null, tasks=[], erpList=[], openDone=new Set(), memos=[], lockOwner='';   // memos: 이 예약에 남긴 메모 · lockOwner: 남이 담당인 예약을 열었을 때 그 담당 이름 (잠금)
const FRESH_KEYS = ['org','people','date','tin','phone','vehicle','pay','sadam1','sadam2','sadamD','mabangL','memo','contact'];   // 견적서 · 거래명세서 · 사전답사 전에 공유 기록이 다른 곳에서 바뀌었는지 (freshRec)
const rawPick = r => JSON.stringify(FRESH_KEYS.map(k=>String((r||{})[k]??'').trim()));
let openedRaw = '';   // 이 화면이 마지막으로 불러오거나 저장한 공유 기록
let openedObj = null;   // 그때의 칸 값 (liveVals) — 다른 곳에서 바뀐 칸만 골라 받기 (liveSync)
   // openDone: 펼쳐 본 끝난 과업   // erpList: 붙여넣은 전산 예약 내역   // 수정 기록 · 추후 과업
function savedOwner(){ try{ return localStorage.getItem('sayuwon_owner')||''; }catch(_){ return ''; } }
function blank(){ const o={}; KEYS.forEach(k=>o[k]=''); o.owner=savedOwner(); o.pay='미정'; o.gate='미정'; o.vehicle='미정'; o.tbd='차량 대수, 결제 방법'; return o; }   // 결제 · 입장문 · 차량은 기본 미정 (차량 2026-11-18)   // 결제는 기본 미정
let peopleAuto=false;   // 관람 인원을 예약 내역 관람 줄 인원 합으로 채운 중 (syncPeopleFromArea)
let discBand=null;   // 품목(줄)마다 인원 구간 {key: 1 = 19명까지 · 2 = 20명부터}, followDiscBand
function resetState(){ discBand=null; vehAutoN=0; peopleAuto=false; itemRows=[]; itemPend=new Set(); rec=blank(); touched=new Set(['owner']); startedAt=null; editingId=null; nContacts=1; optOpen=new Set(); }
function contactsOf(r){
  const out=[]; for(let i=0;i<nContactsOf(r);i++){ const c={name:r[`c${i}_name`]||'',phone:r[`c${i}_phone`]||'',email:r[`c${i}_email`]||''}; if(c.name||c.phone||c.email) out.push(c); } return out;
}
function nContactsOf(r){ let n=0; Object.keys(r).forEach(k=>{ const m=k.match(/^c(\d+)_/); if(m && r[k]) n=Math.max(n,+m[1]+1); }); return n; }
function joinContacts(r){ const cs=contactsOf(r); return { contact:cs.map(c=>c.name).join(' / '), phone:cs.map(c=>c.phone).join(' / '), email:cs.map(c=>c.email).join(' / ') }; }
function splitContacts(r){   // 시트에서 읽은 "가 / 나" 를 담당자 줄로
  const sp=v=>String(v||'').split(/\s*\/\s*/);
  const a=sp(r.contact), b=sp(r.phone), c=sp(r.email); const n=Math.max(a.length,b.length,c.length);
  const o={}; for(let i=0;i<n;i++){ o[`c${i}_name`]=(a[i]||'').trim(); o[`c${i}_phone`]=(b[i]||'').trim(); o[`c${i}_email`]=(c[i]||'').trim(); } return o;
}
const allKeys = () => { const ks=[...KEYS]; for(let i=0;i<nContacts;i++) CFIELDS.forEach(([f])=>ks.push(`c${i}_${f}`)); return ks; };
const MISS_LABEL = { phone:'연락처(010)' };   // 물어볼 것에 보이는 이름
MISS_LABEL.payContact='결제 연락일';
// 결제 연락 예정일은 결제가 '미정'일 때만 필수
const REQUIRED = () => [...FIELDS.filter(f=>f[5] && (f[1]!=='payContact' || rec?.pay==='미정')).map(f=>[f[1],MISS_LABEL[f[1]]||f[2],f[5]]), ...CFIELDS.filter(([f])=>f!=='memo' && f!=='email').map(([f,l,q])=>[`c0_${f}`,MISS_LABEL[f]||l,q])];   // 담당자 이메일 · 메모는 필수 아님 (빨간 칸 아님, 2026-11-18)
const PAYS = ['미정','세금계산서','결제링크','현장 결제','기타'];   // 기타 = 통화 메모에 결제 방법을 남김 (고르면 팝업)   // 기본 미정 ('선택' 없음)
const DATE_KEYS = new Set(['date','payContact','tbdDate']);
// 시트에는 열을 늘리지 않고 기존 칸에 함께 적는다: 결제 칸 "미정 (연락 2026-11-20)", 비고 칸 "미정 항목 입력 기한 2026-11-25"
// 비고 칸에 " / " 로 이어 적는 선택 항목 (시트 열을 늘리지 않음)
const MEAL_KEYS = ['sadam1','sadam2','sadamD','mabangL'];   // 누르면 방문 인원이 먼저 들어가는 식사 칸
const MEMO_PARTS = [['tbd','미정 체크'],['tbdDate','미정 항목 답변일'],['erp','전산 등록'],['gate','입장문'],['pchg','인원 변경'],['onsite','현장 재결제'],['wantQuote','견적서 요청'],['wantStmt','거래명세서 요청'],['tbdLate','입력 기한 늦춘 사유'],['mabangTime','마방 시간'],['mabangPrice','마방 단가'],['mabangPay','마방 결제'],['mabangNote','마방 비고'],['tour','사전 답사'],['goods','굿즈'],['etcDisc','기타할인 금액'],['etcDiscTo','기타할인 대상'],['etcDiscWhy','기타할인 사유'],['etcDiscTx','기타할인 과세'],['etcDiscTf','기타할인 비과세'],['readDone','확인 멘트 말씀드림'],['inotes','항목 비고'],['idisc','항목 할인'],['idamt','항목 할인액'],['isp','항목 특별 할인'],['linkSent','결제링크 전송'],['paidAt','입금 확인'],['viewSrc','관람 종류'],['views','관람 품목'],['viewN','관람권 인원'],['cancelWhy','취소 사유'],['istu','항목 학생'],['erpSame','전산 같은 품목']];   // 항목 학생 · 전산 같은 품목: 빠져 있어 저장 뒤 다시 열면 사라지던 것 (2026-11-21)
const GATES = ['치허문','곡신문','미정'];
const CHECKS = { pchg:'가능성 있음', onsite:'재결제 있음', wantQuote:'요청함', wantStmt:'요청함' };   // 칸 이름(인원 변경 · 현장 재결제 · 견적서 · 거래명세서) 아래 체크 글자
// 아직 안 정해진 항목 체크 (rec.tbd = "업체, 방문일" 처럼 이름으로 저장)
const TBD_KEYS = [['org','업체'],['date','방문일'],['people','관람 인원'],['tin','입장시각'],['vehicle','차량 대수'],['pay','결제 방법'],['mabangPay','몽몽마방 결제']];   // 결제 미정 = 미정 항목 '결제 방법' · 몽몽마방 결제 미정 = '몽몽마방 결제' (입장문은 전날 전화로 안내하므로 미정 항목 아님)
const tbdSet = r => { const names=String(r?.tbd||'').split(/\s*,\s*/); return new Set(TBD_KEYS.filter(([k,l])=>names.includes(l) || (k==='tin' && names.includes('입장'))).map(([k])=>k)); };   // 예전 기록의 '입장'도 입장시각으로
function syncPayTbd(r){ const s=tbdSet(r); r.pay==='미정' ? s.add('pay') : s.delete('pay'); r.mabangPay==='미정' ? s.add('mabangPay') : s.delete('mabangPay'); if(r.vehicle==='미정') s.add('vehicle'); else if(r.vehicle) s.delete('vehicle');   /* 차량: 미정이면 미정 항목, 차종 · 대수를 정했으면 뺌 (2026-11-18) */ r.tbd=TBD_KEYS.filter(([tk])=>s.has(tk)).map(([,tl])=>tl).join(', '); if(!s.size){ r.tbdDate=''; r.tbdLate=''; if(r===rec) tbdAuto=false; } }
function packExtra(r){
  const o={};
  o.pay = r.pay;   // 결제 미정의 답변일은 미정 항목 답변일로
  o.memo = MEMO_PARTS.filter(([k])=>r[k] && (!['tbdDate','tbdLate'].includes(k) || r.tbd)).map(([k,l])=>`${l} ${String(r[k]).replace(/\s+\/\s+/g,', ')}`).join(' / ');   // 칸 구분은 " / " (띄어쓰기 있는 것만). 품목 이름의 '주말/공휴일' 같은 / 는 그대로 (2026-11-16 전에는 ", " 로 바뀌어 새로고침하면 관람 줄이 「항목 고르기」가 됐음)
  if(typeof SPECIAL!=='undefined'){ const sp=specialCounts(r); if(sp.length) o.memo=[o.memo, '특별 할인 '+sp.map(s=>s.short+' '+s.n).join(', ')].filter(Boolean).join(' / '); }
  { const cm=Object.keys(r).map(k=>k.match(/^c(\d+)_memo$/)).filter(m=>m && String(r[m[0]]||'').trim()).map(m=>`${m[1]}=${String(r[m[0]]).replace(/\s+/g,' ').replace(/\s*[/¦]\s*/g,', ').trim()}`);   // 담당자 메모: "담당자 메모 0=…¦ 1=…" (담당자 순서)
    if(cm.length) o.memo=[o.memo, '담당자 메모 '+cm.join(' ¦ ')].filter(Boolean).join(' / '); }
  const xp = Object.keys(r).filter(k=>r[k] && (isXProg(k) || /^px:/.test(k))).map(k=>`${LABEL[k]||k.slice(3)} ${String(r[k]).replace(/[,/]/g,' ').trim()}`);
  if(xp.length) o.memo=[o.memo, '추가 프로그램 '+xp.join(', ')].filter(Boolean).join(' / ');
  // 프로그램 담당 · 시간대 · 코스: "프로그램 담당 동행 도슨트:사공유빈, 요가:김사유 / 프로그램 시간대 동행 도슨트:13:00~15:00 / 프로그램 코스 동행 도슨트:정원 코스"
  Object.entries(SUB_NAME).forEach(([p,nm])=>{
    const st = Object.keys(r).filter(k=>k.startsWith(p+'_') && r[k] && (r[baseOf(k)] || (baseOf(k)==='seminar2' && sem2On(r)))).map(k=>`${LABEL[baseOf(k)]||baseOf(k).replace(/^px:/,'')}:${String(r[k]).replace(p==='tm'?/[,/]/g:/[,/:]/g,' ').trim()}`);
    if(st.length) o.memo=[o.memo, `프로그램 ${nm} `+st.join(', ')].filter(Boolean).join(' / ');
  });
  return o;
}
function unpackExtra(r){ const o={}; let m;
  if((m=String(r.pay||'').match(/^미정\s*\(연락\s*(\d{4}-\d{2}-\d{2})\)/))){ o.pay='미정'; o.payContact=m[1]; }
  String(r.memo||'').replace(/미정 항목 입력 기한 /g,'미정 항목 답변일 ').split(/\s+\/\s+/).forEach(part=>{ MEMO_PARTS.forEach(([k,l])=>{ if(part.startsWith(l+' ')) o[k]=part.slice(l.length+1).trim(); }); });   // 칸 구분 " / " 로만 나눔 (품목 이름의 '주말/공휴일' 은 그대로) · 예전 이름 '입력 기한'도 읽음
  ['views','viewSrc','inotes'].forEach(k=>{ if(o[k]) o[k]=o[k].replace(/주말,\s*공휴일/g,'주말/공휴일'); });   // 예전에 '주말/공휴일' 이 '주말, 공휴일' 로 저장된 관람 품목 되살리기
  if(o.payContact && !o.tbdDate) o.tbdDate=o.payContact;   // 예전 '결제 연락 예정일' → 미정 항목 답변일
  { const cm=String(r.memo||'').split(/\s+\/\s+/).find(p=>p.startsWith('담당자 메모 ')); if(cm) cm.slice(7).split(/\s*¦\s*/).forEach(t=>{ const x=t.match(/^(\d+)=(.*)$/); if(x) o[`c${x[1]}_memo`]=x[2].trim(); }); }   // 담당자 메모
  const mx=String(r.memo||'').match(/추가 프로그램\s+([^/]+)/); if(mx) mx[1].split(/\s*,\s*/).forEach(t=>{ const x=t.trim().match(/^(.+?)\s+(\S+)$/); if(!x) return;
    const f=FIELDS.find(f=>f[2]===x[1] && isXProg(f[1])), k=f ? f[1] : 'px:'+x[1].replace(/\s/g,''); if(!f) LABEL[k]=x[1]; o[k]=x[2]; });
  Object.entries(SUB_NAME).forEach(([p,nm])=>{
    const mst=String(r.memo||'').match(new RegExp(`프로그램 ${nm}\\s+([^/]+)`)); if(mst) mst[1].split(/\s*,\s*/).forEach(t=>{ const x=t.trim().match(/^(.+?):(.+)$/); if(!x) return;
      const f=FIELDS.find(f=>f[2]===x[1].trim() && /^프로그램/.test(f[0]) && !isSub(f[1])), k=f ? f[1] : 'px:'+x[1].replace(/\s/g,''); o[`${p}_${k}`]=x[2].trim(); });
  });
  const ms=String(r.memo||'').match(/(?:^|\s\/\s)특별 할인\s+([^/]+)/); if(ms) ms[1].split(/\s*,\s*/).forEach(t=>{ const x=t.trim().match(/^(.+?)\s+(\d+)$/); if(!x) return; const nm=x[1].trim(), s=SPECIAL.find(s=>s.short===nm) || SPECIAL.find(s=>(s.olds||[]).includes(nm)); if(s) o[s.k]=x[2]; });
  return o; }

// ===================== 칸 렌더 =====================
// 칸별 입력 방식: 한글 우선(한/영 키로 영어) · 영어 고정 · 숫자 고정
const KO_FIRST = k => k==='org' || /^c\d+_(name|memo)$/.test(k) || k==='owner';
const EN_ONLY  = k => /^c\d+_email$/.test(k);
// 몽몽마방: 메뉴는 견적서 품목 리스트에서 구분이 식사이고 기본 메뉴(사유의 밥상(단체) · 몽몽마방 런치 · 단품) 또는 예약상품명이 '몽몽마방 '으로 시작하는 품목 (1인 고정가, 품목 관리에서 추가 · 이름 · 가격 수정) · 결제는 사무실 / 마방
const MB_PAYS = ['미정','사무실','마방','기타'];   // 몽몽마방 결제방식: 새로 넣으면 '미정' (미정 항목 '몽몽마방 결제' → 고객님께 꼭 여쭤 보기)
const MB_INFO_SKIP = new Set(['goods','mabangTime','mabangPrice','mabangPay','mabangMenu','mabangNote']);   // 그날 현황에서 인원으로 세지 않는 칸
const MB_DEF = [['사유의 밥상(단체)','사유의 밥상',38000],['몽몽마방 런치','비빔밥+녹두전+매실차',22000],['몽몽마방 단품','더덕비빔밥',17000]];   // 품목을 아직 못 불러왔을 때
function mbMenus(){
  const items = quoteCat ? catalogItems().filter(it=>it.kind==='mabang' && it.price!=null) : [];
  if(!items.length) return MB_DEF.map(([src,name,price])=>({src,name,price}));
  const defName = Object.fromEntries(MB_DEF.map(([s,n])=>[s,n]));
  return items.map(it=>({ src:it.src, name: String(it.name||'').trim() || (quoteCat.mbName||{})[it.src] || defName[it.src] || it.src, price:it.price })).sort((a,b)=>b.price-a.price);   // 비싼 것부터
}
// 고른 메뉴 (예전 기록의 자유 메뉴는 null → 메뉴 선택 과업)
const mbMenuOf = r => { const v=String(r.mabangMenu||'').trim(); return v ? mbMenus().find(m=>m.name===v || normSrc(m.src)===normSrc(v)) || null : null; };
const mbUnit = r => (mbMenuOf(r)||{}).price || Number(r.mabangPrice) || 0;   // 1인 가격 (예전 기록은 적어 둔 단가)
const mbNeedsMenu = r => !!(r.mabangL || r.mabangTime) && !mbMenuOf(r);
const wonTxt = n => Number(n||0).toLocaleString('ko-KR');
// 굿즈 구매: 견적서 품목 리스트에서 구분이 '굿즈'인 품목. 값은 "고추장 x2 · 모과청(new) x1" (예약 상품명 기준)
const goodsItems = () => { try{ return quoteCat ? catalogItems().filter(it=>it.kind==='goods' && it.price!=null).sort((a,b)=>String(a.src).localeCompare(String(b.src),'ko')) : []; }catch(_){ return []; } };
const goodsParse = v => String(v||'').split(/\s*·\s*/).map(s=>s.match(/^(.+) x(\d+)$/)).filter(Boolean).map(m=>({src:m[1].trim(), qty:+m[2]}));
const goodsJoin = arr => arr.filter(g=>g.qty>0).map(g=>`${g.src} x${g.qty}`).join(' · ');
const goodsName = src => { const it=goodsItems().find(x=>normSrc(x.src)===normSrc(src)); return (it && String(it.name||'').trim()) || src; };
const goodsText = r => goodsParse(r.goods).map(g=>`${goodsName(g.src)} ${g.qty}개`).join(', ');
function goodsHTML(v){
  const list=goodsParse(v), items=goodsItems();
  const rows=list.map((g,i)=>{ const p=priceOf(g.src); return `<div class="g-row"><span class="g-name" title="${esc(goodsName(g.src))}"><b>${esc(goodsName(g.src))}</b><small>${p!=null?wonTxt(p)+'원':'가격 없음'}</small></span>`
    + `<input type="number" min="1" step="1" data-gq="${i}" value="${g.qty}" aria-label="수량"><span class="g-unit">개</span><button type="button" class="g-del" data-gdel="${i}" title="빼기">×</button></div>`; }).join('');
  const opts=items.filter(it=>!list.some(g=>normSrc(g.src)===normSrc(it.src))).map(it=>`<option value="${esc(it.src)}">${esc(String(it.name||'').trim()||it.src)} · ${wonTxt(it.price)}원</option>`).join('');
  return rows + `<select class="g-add" data-gadd><option value="">＋ 굿즈 추가${items.length?'':' (품목을 불러오는 중)'}</option>${opts}</select>`;
}
function setGoods(list){ rec.goods=goodsJoin(list); touched.add('goods'); staffDefaults(); startTimer(); const el=$('#f_goods'); if(el){ el.dataset.h=''; el.innerHTML=goodsHTML(rec.goods); el.dataset.h=el.innerHTML; } paintFields(); renderSide(); }
$('#form').addEventListener('change', e=>{
  const el=e.target;
  if(el.dataset.gadd!==undefined){ if(!el.value) return; const list=goodsParse(rec.goods); list.push({src:el.value, qty:1}); setGoods(list); $('#f_goods [data-gq]:last-of-type')?.focus(); return; }   // 고르면 1개로 추가
  if(el.dataset.gq!==undefined){ const list=goodsParse(rec.goods), i=+el.dataset.gq, q=Math.max(0, parseInt(el.value)||0); if(list[i]){ list[i].qty=q; setGoods(list); } }   // 0 이면 빠짐
});
$('#form').addEventListener('click', e=>{ const b=e.target.closest('[data-gdel]'); if(!b) return; const list=goodsParse(rec.goods); list.splice(+b.dataset.gdel,1); setGoods(list); });
// 몽몽마방 한 줄: "12:00~13:00 · 30명 · 더덕비빔밥 · 1인 17,000원 (금액 510,000원) · 사무실 결제"
const mabangText = r => { const u=mbUnit(r), n=numOf(r.mabangL);
  return [r.mabangTime, r.mabangL && `${r.mabangL}명`, r.mabangMenu, u && `1인 ${wonTxt(u)}원${n?` (금액 ${wonTxt(u*n)}원)`:''}`, r.mabangPay && `결제 ${r.mabangPay}`, r.mabangNote, r.mabangD && `(예전 디너 ${r.mabangD}명)`].filter(Boolean).join(' · '); };
// 메뉴 고르는 칸 (하나만, 다시 누르면 해제)
function mbMenuHTML(v){
  const ms=mbMenus(), hit=mbMenuOf({mabangMenu:v});
  const chip=(name,price,on)=>`<label class="mb-ck"><input type="radio" name="mbmenu" data-menu="${esc(name)}"${on?' checked':''}> ${esc(name)}${price?` <small>${wonTxt(price)}원</small>`:''}</label>`;
  return ms.map(m=>chip(m.name, m.price, hit && hit.name===m.name)).join('')
    + (v && !hit ? chip(v, 0, true).replace('class="mb-ck"','class="mb-ck old" title="예전 메뉴 · 위 메뉴 중에서 다시 골라 주세요"') : '')
    + `<button type="button" class="mb-cat" data-open-cat>메뉴 · 가격 수정</button>`;
}
// ===================== 예약 항목 줄: [항목 드롭다운] [수량] [담당] [×] =====================
// 사담 식사 · 몽몽마방 · 개별 프로그램 · 시간 프로그램 · 굿즈를 한 줄씩. 값은 예전 칸(sadam1 · mabangL/mabangMenu · 프로그램 키 · stf_ · goods)에 그대로 저장
// 줄 key: 'sadam1' 'sadam2' 'sadamD' · 'mb'(몽몽마방, 하나) · 프로그램 키 · 'g:품목'(굿즈) · 'new:…'(아직 안 고른 줄)
let itemRows = [], itemPend = new Set();   // itemPend: 수량을 아직 안 넣은 줄 (값이 없어도 보이게)
const SADAM_ITEMS = [['sadam1','사담 런치 1부'],['sadam2','사담 런치 2부'],['sadamD','사담 디너']];
const itemKind = k => k==='view' ? 'view' : /^v:/.test(k) ? 'varea' : /^sadam/.test(k) ? 'sadam' : k==='mb' ? 'mb' : /^g:/.test(k) ? 'goods' : /^new:/.test(k) ? 'new' : 'prog';   // view: 관람 인원 (첫 줄, 관람 인원 칸과 같은 값)
// 항목 비고: rec.inotes = "sadam1=창가 자리; g:모과청(new)=선물 포장"
const inotesMap = () => Object.fromEntries(String(rec.inotes||'').split(/\s*;\s*/).map(s=>{ const i=s.indexOf('='); return i>0 ? [s.slice(0,i).trim(), s.slice(i+1).trim()] : null; }).filter(Boolean));
const itemNote = k => inotesMap()[k] || '';
// 항목 할인 (줄마다 할인 버튼): rec.idisc = "sadam1=grp; v:(관람, 사담 윈터 스페셜 다이닝 런치)=none" (none 할인 없음 · pre 사전예약 5% · grp 단체예약 10%)
// 자동으로 정해지는 것과 같으면 적지 않음 → 인원이 바뀌면 자동을 따라감. 관람 품목은 평일 · 주말 앞머리를 떼고 (방문일이 바뀌어도 같은 줄)
const DISC_OPTS = [['none','할인 없음'],['pre','사전예약 5%'],['grp','단체예약 10%']];
const DISC_OF = p => p===10 ? 'grp' : p===5 ? 'pre' : 'none';
const dkey = k => /^v:/.test(k) ? 'v:'+k.slice(2).replace(/^(평일|주말\/공휴일)/,'').replace(/\//g,'·') : String(k);
const idiscMap = r => Object.fromEntries(String((r&&r.idisc)||'').split(/\s*;\s*/).map(s=>{ const i=s.lastIndexOf('='); return i>0 ? [s.slice(0,i).trim(), s.slice(i+1).trim()] : null; }).filter(Boolean));
function setItemDisc(k, v, auto){ const m=idiscMap(rec), kk=dkey(k); if(v===auto) delete m[kk]; else m[kk]=v; rec.idisc=Object.entries(m).map(([a,b])=>`${a}=${b}`).join('; '); touched.add('idisc'); setItemDamt(k, null); }   // 할인 버튼을 바꾸면 직접 고친 할인액은 지움
// 할인액 직접 고치기: rec.idamt = "sadam1=200000:125000" (줄마다 과세(신라) 할인액:비과세(사유원) 할인액). 없으면 할인 버튼(%)으로 계산한 값
const idamtMap = r => Object.fromEntries(String((r&&r.idamt)||'').split(/\s*;\s*/).map(s=>{ const i=s.lastIndexOf('='); if(i<=0) return null; const [tx,tf]=s.slice(i+1).split(':').map(v=>Math.max(0,parseInt(v)||0)); return [s.slice(0,i).trim(), {tx, tf}]; }).filter(Boolean));
function setItemDamt(k, val){ const m=idamtMap(rec), kk=dkey(k); if(!val && !m[kk]) return; if(val) m[kk]=val; else delete m[kk]; rec.idamt=Object.entries(m).map(([a,b])=>`${a}=${b.tx}:${b.tf}`).join('; '); touched.add('idamt'); }
