// ===== 단체고객 전화응대 (group.html) =====
// 예약 칸 · 예약 내역(가격 · 할인) · 추후 과업 · 전산 내역 · 예약 현황 · 단체예약 목록 · 마이페이지 · 잠금 · 메모 · 알림

// ===================== 필드 정의 (엑셀 메인 시트 열 기준) =====================
// grp, key, label, 엑셀열, 너비, 물어볼 질문(필수)
const FIELDS = [
  ['기본','org','업체(단체명)','D','w2','단체명(기관명)이 어떻게 되실까요?'],
  ['기본','date','방문일','B','w2',  '방문 날짜가 언제로 생각하고 계실까요?'],
  ['기본','people','관람 인원','I','',  '방문 인원은 총 몇 분이세요? (인솔자·기사님 포함 여부도)'],
  ['기본','pchg','인원 변경','','',  null],   // 인원이 바뀔 수 있으면 체크
  ['방문','tin','입장','H','',  '몇 시쯤 도착 예정이세요?'],
  ['방문','gate','입장문','','',  null],   // 치허문 · 곡신문 · 미정
  ['방문','tout','퇴장 (선택)','H','',  null],
  ['방문','vehicle','차량','G','w2',  '버스로 오세요, 승용차로 오세요? 몇 대인가요?'],
  ['방문','owner','영업 담당','E','',  null],
  ['방문','pay','결제','F','',  '결제는 세금계산서, 결제링크, 현장 결제 중 어떻게 하실까요?'],
  ['방문','onsite','현장 재결제','','',  null],   // 다른 방식이어도 현장에서 카드로 다시 결제하는 경우
  ['방문','tbdDate','미정 항목 답변일','','',  null],   // 미정 항목(인원 · 결제 방법 등)을 언제까지 알려주기로 했는지
  ['사담','sadam1','1부','J','',null],
  ['사담','sadam2','2부','K','',null],
  ['사담','sadamD','디너','L','',null],
  // 몽몽마방: NAS 엑셀 '몽몽마방 예약' 탭과 같은 항목 (시간 · 인원 · 메뉴 · 단가 · 결제 · 비고)
  ['몽몽마방','mabangTime','시간','','',null],
  ['몽몽마방','mabangL','인원','M','',null],
  ['몽몽마방','mabangPay','결제','','',null],
  ['몽몽마방','mabangMenu','메뉴','','w4',null],
  // 프로그램(개별): 인원 단위 · 프로그램(시간): 1시간 단위. 견적서 품목 리스트에 단체(개별)·단체(시간) 품목이 새로 생기면 아래에 자동으로 붙음
  ['프로그램(개별)','yoga','요가','R','',null],
  ['프로그램(개별)','gaga','가가 바우처','S','',null],
  ['프로그램(개별)','sound','사운드워킹','','',null],   // 시트 열 없음 → 비고 칸 '추가 프로그램'에
  ['프로그램(개별)','scent','사유의 향','','',null],   // 시트 열 없음 → 비고 칸 '추가 프로그램'에
  ['프로그램(개별)','haeorum','새벽 해오름 산책','','',null],   // 시트 열 없음 → 비고 칸 '추가 프로그램'에. 금 120,000 · 토/일(공휴일) 139,000, 관람료 포함(관람권 따로 없음) · 할인 없음
  ['프로그램(시간)','chabang','차방 대관','O','',null],
  ['프로그램(시간)','dangdu','당두봉갈 대관','Q','',null],
  ['프로그램(시간)','donghaeng','동행 도슨트','P','',null],
  ['프로그램(시간)','seminar','세미나 도슨트','','',null],   // 시트 열 없음 → 비고 칸 '추가 프로그램'에
  ['굿즈','goods','굿즈 품목','','w4',null],   // 굿즈 구매: 견적서 품목 리스트의 굿즈 품목에서 골라 수량 (값: "고추장 x2 · 모과청(new) x1")
  ['굿즈','stf_goods','굿즈 담당','','',null],   // 굿즈도 담당 필수 (기본 = 영업 담당)
  ['굿즈','viewSrc','관람 종류','','',null],
  ['굿즈','views','관람 · 관람+식사 추가 품목','','',null],   // 관람 영역의 다른 품목 "평일 관람(학생) x5 · 평일(관람, 사담 윈터 스페셜 다이닝 런치) x10" (사담 1부 · 2부 · 디너 · 해오름은 각자 칸)
  ['굿즈','viewN','관람권 인원','','',null],   // 기본 관람 줄 인원을 직접 줄였을 때만 (비면 = 관람 인원 − 다른 관람 영역 인원)   // 예약 내역 관람 줄에서 고른 관람 품목 (평일 · 주말은 방문일에 맞춰 바뀜, 비면 입장 시각으로)
  ['굿즈','inotes','항목 비고','','',null],   // 예약 내역 줄마다 비고 "sadam1=창가 자리; g:모과청(new)=선물 포장" (시트 비고 칸 '항목 비고')
  ['굿즈','idisc','항목 할인','','',null],   // 예약 내역 줄마다 할인 버튼 "sadam1=grp; v:(관람, …)=none" (시트 비고 칸 '항목 할인')
  ['굿즈','idamt','항목 할인액','','',null],   // 할인액을 직접 고친 줄 "sadam1=200000:125000" (과세(신라):비과세(사유원), 시트 비고 칸 '항목 할인액')
];
// 프로그램 · 굿즈 담당: 프로그램마다 'stf_키' 칸을 바로 뒤에. 모두 필수, 기본은 영업 담당 (바꿀 수 있음)
const STAFF_FREE = new Set();   // 예전엔 차방 · 당두봉갈 대관 제외 → 이제 모두 담당 필수
// 프로그램에 딸린 칸: 담당(stf_) · 도슨트는 시간대(tm_) · 코스(crs_)도. 프로그램을 넣었을 때만 보임
const SUB_NAME = { stf:'담당', tm:'시간대', crs:'코스' };
const isSub = k => /^(stf|tm|crs)_/.test(k);
const baseOf = k => String(k).replace(/^(stf|tm|crs)_/,'');
const isStf = k => /^stf_/.test(k);
const needsStaff = k => !isSub(k) && !STAFF_FREE.has(k);
const isDocent = label => /도슨트/.test(label||'');
const subRows = f => [...(isDocent(f[2]) ? ['tm','crs'] : []), ...(needsStaff(f[1]) ? ['stf'] : [])].map(p=>[f[0], `${p}_${f[1]}`, `${f[2]} ${SUB_NAME[p]}`, '', '', null]);

for(let i=FIELDS.length-1;i>=0;i--){ const f=FIELDS[i]; if(/^프로그램/.test(f[0]) && !isSub(f[1])) FIELDS.splice(i+1,0,...subRows(f)); }
// 프로그램 품목 ↔ 견적서 품목 (견적서·금액 계산용)
const PROG_SRC = { yoga:'요가프로그램(단체)', gaga:'음료쿠폰(가가빈빈)', chabang:'대관', dangdu:'대관', donghaeng:'해설사도슨트(수정)', seminar:'세미나', sound:'사운드워킹', scent:'사유의 향', haeorum:'사유원 새벽 해오름 산책(평일)' };
const HAEORUM_WE = '사유원 새벽 해오름 산책(주말)';
const progSrc = (k, r) => k==='haeorum' && r && r.date && isRedDay(r.date) ? HAEORUM_WE : PROG_SRC[k];   // 해오름 산책: 토/일 · 공휴일은 주말 품목
// 지금 견적서 품목 리스트에 있는 단체 품목 (이것 말고 새로 추가된 것만 프로그램 칸으로 붙임)
const PROG_KNOWN = ['사유원 새벽 해오름 산책(주말)','대관','세미나','해설사도슨트(수정)','임원도슨트(수정)','사운드워킹','사유의 향','요가프로그램(단체)','음료쿠폰(가가빈빈)','음료쿠폰(몽몽차방)','사유의 밥상(단체)','당두봉갈 대관'];
const PROG_GRP = { geach:'프로그램(개별)', gtime:'프로그램(시간)' };
const UNIT = k => (FIELDS.find(f=>f[1]===k)||[])[0]==='프로그램(시간)' ? '시간' : '명';
const PROG_KEYS = () => FIELDS.filter(f=>/^프로그램/.test(f[0]) && !isSub(f[1])).map(f=>f[1]);
const STF_KEYS = () => FIELDS.filter(f=>isSub(f[1])).map(f=>f[1]);   // 담당 · 시간대 · 코스
// 프로그램은 들어갔는데 담당이 빈 것 (차방 · 당두봉갈 제외)
const STAFF_BASES = () => [...PROG_KEYS(), 'goods'];   // 담당이 있어야 하는 칸 (개별 · 시간 프로그램 · 굿즈)
// 프로그램 칸 배치: 넣은 프로그램은 위로, 한 줄에 [프로그램 · 담당 · 시간대 · 코스]. 안 넣은 프로그램은 그 아래 4칸씩
function layoutProg(){
  FIELDS.forEach((f,i)=>{ const k=f[1]; if(!/^프로그램/.test(f[0])) return; const w=document.getElementById('w_'+k); if(!w) return;
    if(isSub(k)){ const bi=FIELDS.findIndex(x=>x[1]===baseOf(k)); w.style.order = String(bi*10 + (isStf(k)?1:/^tm_/.test(k)?2:3)); }
    else w.style.order = String(rec[k] ? i*10 : 100000+i); });
}
// 들어간 프로그램 · 굿즈의 담당이 비어 있으면 영업 담당 이름으로 (바뀐 게 있으면 true)
function staffDefaults(){
  const me=(rec.owner||savedOwner()||'').trim(); if(!me) return false;
  return syncGoodsStaff();   // 2026-11-14: 프로그램 담당은 자동으로 넣지 않음 (직접 입력 · 비면 과업 「프로그램 · 굿즈 담당 입력」). 굿즈 담당만 늘 영업 담당
}
// 굿즈 담당은 항상 영업 담당 (헤더의 영업 담당 이름을 따라감)
function syncGoodsStaff(){
  const me=(rec.owner||savedOwner()||'').trim(), want = rec.goods ? me : '';
  if(!want && !rec.goods && !rec.stf_goods) return false;
  if(rec.goods && !me) return false;   // 영업 담당 이름이 없으면 그대로 (담당 입력 과업이 알려 줌)
  if(String(rec.stf_goods||'')===want) return false;
  rec.stf_goods=want; touched.add('stf_goods'); return true;
}
const missingStaff = r =>STAFF_BASES().filter(k=>r[k] && needsStaff(k) && !String(r['stf_'+k]||'').trim());
const LEGACY_KEYS = ['teaMed','gayageum','cabin'];   // 예전 프로그램 칸 (입력 칸은 없앴지만 저장된 값은 그대로 둠)
const SHEET_PROG = new Set(['yoga','gaga','chabang','dangdu','donghaeng']);   // 시트에 열이 있는 프로그램
const isXProg = k => /^(프로그램)/.test(GROUP_OF[k]||'') && !SHEET_PROG.has(k) && !isSub(k);   // 비고 칸에 적는 프로그램
// 견적서 품목에 새로 생긴 단체(개별)·단체(시간) 품목을 프로그램 칸으로 (key: px:품목)
function addCatalogProgs(cat){
  const out=[];
  if(!cat || !Array.isArray(cat.raw)) return out;
  const nm = s => String(s||'').replace(/\s/g,'');
  const known = new Set([...PROG_KNOWN, ...Object.values(PROG_SRC)].map(nm));
  const items = [];
  cat.raw.forEach(line=>{ const src=line.split('|')[0], e=(cat.edits||{})[src]||{}; if(e.hidden) return;
    const kind = e.kind || ((cat.gtime||[]).some(x=>nm(x)===nm(src)) ? 'gtime' : (cat.geach||[]).some(x=>nm(x)===nm(src)) ? 'geach' : ''); if(PROG_GRP[kind]) items.push([src,kind]); });
  (cat.added||[]).forEach(a=>{ if(!a.hidden && PROG_GRP[a.kind]) items.push([a.src||a.name, a.kind]); });
  items.forEach(([src,kind])=>{
    const label=String(src).replace(/\((수정|변경|단체)\)/g,'').trim() || src, k='px:'+nm(label);
    if(known.has(nm(src)) || FIELDS.some(f=>f[1]===k)) return;
    const grp=PROG_GRP[kind], last=FIELDS.map(f=>f[0]).lastIndexOf(grp);
    const f=[grp,k,label,'','',null], ss=subRows(f); FIELDS.splice(last+1,0,f,...ss); LABEL[k]=label; PROG_SRC[k]=src;
    [f,...ss].forEach(x=>{ KEYS.push(x[1]); GROUP_OF[x[1]]=grp; LABEL[x[1]]=x[2]; out.push(x); });
  });
  return out;
}
// 담당자(여러 명): c0_name, c0_phone, c0_email, c1_name …
const CFIELDS = [['name','담당자 성함','담당자분 성함이 어떻게 되세요?'],['phone','연락처','연락 가능한 번호 하나 남겨주시겠어요?'],['email','이메일','견적서 받으실 이메일 주소 알려주시겠어요?']];
const KEYS = FIELDS.map(f=>f[1]);
// 처음엔 접어 두고 버튼으로 펼치는 묶음 (각 묶음 아래에 그날 예약 현황)
const OPT = { '사담':{id:'sadam', title:'사담 식사'}, '몽몽마방':{id:'mabang', title:'몽몽마방 식사', short:'몽몽마방'}, '프로그램(개별)':{id:'progE', title:'프로그램(개별)', short:'개별 프로그램'}, '프로그램(시간)':{id:'progT', title:'프로그램(시간)', short:'시간 프로그램'}, '굿즈':{id:'goods', title:'굿즈 구매', short:'굿즈'} };
let optOpen = new Set();
const GROUP_OF = Object.fromEntries(FIELDS.map(f=>[f[1], f[0]]));
const LABEL = Object.fromEntries(FIELDS.map(f=>[f[1], ['사담','몽몽마방'].includes(f[0]) ? `${f[0]} ${f[2]}` : f[2]]));
CFIELDS.forEach(([f,l])=>{ for(let i=0;i<10;i++) LABEL[`c${i}_${f}`]= i? `${l}(${i+1})` : l; });
const SPECIAL_LABEL = { dKansong:'간송 할인', dMerit:'국가유공자 할인', dGunwi:'군위 주민 할인', dClergy:'대구대교구' }; Object.assign(LABEL, SPECIAL_LABEL);
Object.assign(LABEL, { teaMed:'티하우스 명상', gayageum:'가야금', cabin:'유루 캐빈' });
try{ addCatalogProgs(JSON.parse(localStorage.getItem('sayuwon_quote_cat'))); }catch(_){}   // 마지막으로 받은 견적서 품목으로 (새로 받으면 그때 다시)
const DOW = '일월화수목금토';
const $ = s => document.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const isCKey = k => /^c\d+_(name|phone|email)$/.test(k);

// ===================== 상태 =====================
let rec, touched, startedAt, editingId, nContacts;
let cache=[];
let hist=[], baseSnap=null, tasks=[], erpList=[], openDone=new Set(), memos=[], lockOwner='';   // memos: 이 예약에 남긴 메모 · lockOwner: 남이 담당인 예약을 열었을 때 그 담당 이름 (잠금)
   // openDone: 펼쳐 본 끝난 과업   // erpList: 붙여넣은 전산 예약 내역   // 수정 기록 · 추후 과업
function savedOwner(){ try{ return localStorage.getItem('sayuwon_owner')||''; }catch(_){ return ''; } }
function blank(){ const o={}; KEYS.forEach(k=>o[k]=''); o.owner=savedOwner(); o.pay='미정'; o.gate='미정'; o.tbd='결제 방법'; return o; }   // 결제 · 입장문은 기본 미정   // 결제는 기본 미정
function resetState(){ itemRows=[]; itemPend=new Set(); rec=blank(); touched=new Set(['owner']); startedAt=null; editingId=null; nContacts=1; optOpen=new Set(); }
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
const REQUIRED = () => [...FIELDS.filter(f=>f[5] && (f[1]!=='payContact' || rec?.pay==='미정')).map(f=>[f[1],MISS_LABEL[f[1]]||f[2],f[5]]), ...CFIELDS.map(([f,l,q])=>[`c0_${f}`,MISS_LABEL[f]||l,q])];
const PAYS = ['미정','세금계산서','결제링크','현장 결제'];   // 기본 미정 ('선택' 없음)
const DATE_KEYS = new Set(['date','payContact','tbdDate']);
// 시트에는 열을 늘리지 않고 기존 칸에 함께 적는다: 결제 칸 "미정 (연락 2026-11-20)", 비고 칸 "미정 항목 입력 기한 2026-11-25"
// 비고 칸에 " / " 로 이어 적는 선택 항목 (시트 열을 늘리지 않음)
const MEAL_KEYS = ['sadam1','sadam2','sadamD','mabangL'];   // 누르면 방문 인원이 먼저 들어가는 식사 칸
const MEMO_PARTS = [['tbd','미정 체크'],['tbdDate','미정 항목 답변일'],['erp','전산 등록'],['gate','입장문'],['pchg','인원 변경'],['onsite','현장 재결제'],['wantQuote','견적서 요청'],['wantStmt','거래명세서 요청'],['tbdLate','입력 기한 늦춘 사유'],['mabangTime','마방 시간'],['mabangPrice','마방 단가'],['mabangPay','마방 결제'],['mabangNote','마방 비고'],['tour','사전 답사'],['goods','굿즈'],['etcDisc','기타할인 금액'],['etcDiscTo','기타할인 대상'],['etcDiscWhy','기타할인 사유'],['etcDiscTx','기타할인 과세'],['etcDiscTf','기타할인 비과세'],['readDone','확인 멘트 말씀드림'],['inotes','항목 비고'],['idisc','항목 할인'],['idamt','항목 할인액'],['viewSrc','관람 종류'],['views','관람 품목'],['viewN','관람권 인원']];
const GATES = ['치허문','곡신문','미정'];
const CHECKS = { pchg:'가능성 있음', onsite:'재결제 있음', wantQuote:'요청함', wantStmt:'요청함' };   // 칸 이름(인원 변경 · 현장 재결제 · 견적서 · 거래명세서) 아래 체크 글자
// 아직 안 정해진 항목 체크 (rec.tbd = "업체, 방문일" 처럼 이름으로 저장)
const TBD_KEYS = [['org','업체'],['date','방문일'],['people','관람 인원'],['tin','입장'],['vehicle','차량 대수'],['pay','결제 방법']];   // 결제 미정 = 미정 항목 '결제 방법' (입장문은 전날 전화로 안내하므로 미정 항목 아님)
const tbdSet = r => { const names=String(r?.tbd||'').split(/\s*,\s*/); return new Set(TBD_KEYS.filter(([,l])=>names.includes(l)).map(([k])=>k)); };
function syncPayTbd(r){ const s=tbdSet(r); r.pay==='미정' ? s.add('pay') : s.delete('pay'); r.tbd=TBD_KEYS.filter(([tk])=>s.has(tk)).map(([,tl])=>tl).join(', '); if(!s.size){ r.tbdDate=''; r.tbdLate=''; if(r===rec) tbdAuto=false; } }
function packExtra(r){
  const o={};
  o.pay = r.pay;   // 결제 미정의 답변일은 미정 항목 답변일로
  o.memo = MEMO_PARTS.filter(([k])=>r[k] && (!['tbdDate','tbdLate'].includes(k) || r.tbd)).map(([k,l])=>`${l} ${String(r[k]).replace(/\s*\/\s*/g,', ')}`).join(' / ');
  if(typeof SPECIAL!=='undefined'){ const sp=specialCounts(r); if(sp.length) o.memo=[o.memo, '특별 할인 '+sp.map(s=>s.short+' '+s.n).join(', ')].filter(Boolean).join(' / '); }
  const xp = Object.keys(r).filter(k=>r[k] && (isXProg(k) || /^px:/.test(k))).map(k=>`${LABEL[k]||k.slice(3)} ${String(r[k]).replace(/[,/]/g,' ').trim()}`);
  if(xp.length) o.memo=[o.memo, '추가 프로그램 '+xp.join(', ')].filter(Boolean).join(' / ');
  // 프로그램 담당 · 시간대 · 코스: "프로그램 담당 동행 도슨트:사공유빈, 요가:김사유 / 프로그램 시간대 동행 도슨트:13:00~15:00 / 프로그램 코스 동행 도슨트:정원 코스"
  Object.entries(SUB_NAME).forEach(([p,nm])=>{
    const st = Object.keys(r).filter(k=>k.startsWith(p+'_') && r[k] && r[baseOf(k)]).map(k=>`${LABEL[baseOf(k)]||baseOf(k).replace(/^px:/,'')}:${String(r[k]).replace(p==='tm'?/[,/]/g:/[,/:]/g,' ').trim()}`);
    if(st.length) o.memo=[o.memo, `프로그램 ${nm} `+st.join(', ')].filter(Boolean).join(' / ');
  });
  return o;
}
function unpackExtra(r){ const o={}; let m;
  if((m=String(r.pay||'').match(/^미정\s*\(연락\s*(\d{4}-\d{2}-\d{2})\)/))){ o.pay='미정'; o.payContact=m[1]; }
  String(r.memo||'').replace(/미정 항목 입력 기한 /g,'미정 항목 답변일 ').split(/\s*\/\s*/).forEach(part=>{ MEMO_PARTS.forEach(([k,l])=>{ if(part.startsWith(l+' ')) o[k]=part.slice(l.length+1).trim(); }); });   // 예전 이름 '입력 기한'도 읽음
  if(o.payContact && !o.tbdDate) o.tbdDate=o.payContact;   // 예전 '결제 연락 예정일' → 미정 항목 답변일
  const mx=String(r.memo||'').match(/추가 프로그램\s+([^/]+)/); if(mx) mx[1].split(/\s*,\s*/).forEach(t=>{ const x=t.trim().match(/^(.+?)\s+(\S+)$/); if(!x) return;
    const f=FIELDS.find(f=>f[2]===x[1] && isXProg(f[1])), k=f ? f[1] : 'px:'+x[1].replace(/\s/g,''); if(!f) LABEL[k]=x[1]; o[k]=x[2]; });
  Object.entries(SUB_NAME).forEach(([p,nm])=>{
    const mst=String(r.memo||'').match(new RegExp(`프로그램 ${nm}\\s+([^/]+)`)); if(mst) mst[1].split(/\s*,\s*/).forEach(t=>{ const x=t.trim().match(/^(.+?):(.+)$/); if(!x) return;
      const f=FIELDS.find(f=>f[2]===x[1].trim() && /^프로그램/.test(f[0]) && !isSub(f[1])), k=f ? f[1] : 'px:'+x[1].replace(/\s/g,''); o[`${p}_${k}`]=x[2].trim(); });
  });
  const ms=String(r.memo||'').match(/특별 할인\s+([^/]+)/); if(ms) ms[1].split(/\s*,\s*/).forEach(t=>{ const x=t.trim().match(/^(.+?)\s+(\d+)$/); if(!x) return; const s=SPECIAL.find(s=>s.short===x[1].trim()); if(s) o[s.k]=x[2]; });
  return o; }

// ===================== 칸 렌더 =====================
// 칸별 입력 방식: 한글 우선(한/영 키로 영어) · 영어 고정 · 숫자 고정
const KO_FIRST = k => k==='org' || /^c\d+_name$/.test(k) || k==='owner';
const EN_ONLY  = k => /^c\d+_email$/.test(k);
// 몽몽마방: 메뉴는 견적서 품목 리스트에서 구분이 식사이고 기본 메뉴(사유의 밥상(단체) · 몽몽마방 런치 · 단품) 또는 예약상품명이 '몽몽마방 '으로 시작하는 품목 (1인 고정가, 품목 관리에서 추가 · 이름 · 가격 수정) · 결제는 사무실 / 마방
const MB_PAYS = ['사무실','마방'];
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
  return [r.mabangTime, r.mabangL && `${r.mabangL}명`, r.mabangMenu, u && `1인 ${wonTxt(u)}원${n?` (금액 ${wonTxt(u*n)}원)`:''}`, r.mabangPay && `${r.mabangPay} 결제`, r.mabangNote, r.mabangD && `(예전 디너 ${r.mabangD}명)`].filter(Boolean).join(' · '); };
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
function setItemNote(k, v){ const m=inotesMap(); v=String(v||'').replace(/[;=]/g,',').trim(); if(v) m[k]=v; else delete m[k]; rec.inotes=Object.entries(m).map(([a,b])=>`${a}=${b}`).join('; '); touched.add('inotes'); }
const itemName = k => k==='view' ? '관람' : /^v:/.test(k) ? itemLabel(daySrc(k.slice(2), rec)) : k==='mb' ? '몽몽마방 '+(rec.mabangMenu||'') : /^g:/.test(k) ? goodsName(k.slice(2)) : (SADAM_ITEMS.find(x=>x[0]===k)||[])[1] || LABEL[k] || k;
const itemNotesText = () => Object.entries(inotesMap()).filter(([k])=>itemKeysFromRec().includes(k)).map(([k,v])=>`${itemName(k)}: ${v}`);   // 비고가 있는 항목만
const itemUnit = k => itemKind(k)==='goods' ? '개' : itemKind(k)==='prog' ? UNIT(k) : '명';
const itemHasStaff = k => ['prog','goods'].includes(itemKind(k));
const itemStfKey = k => itemKind(k)==='goods' ? 'stf_goods' : 'stf_'+k;   // 굿즈 담당은 굿즈 전체 하나
function itemKeysFromRec(){
  return [   /* 관람 자동 줄 없음: 관람권도 「항목 추가」로 직접 */ ...viewsParse(rec.views).map(v=>'v:'+v.src), ...SADAM_ITEMS.map(x=>x[0]).filter(k=>rec[k]), ...(rec.mabangL||rec.mabangMenu||rec.mabangTime ? ['mb'] : []),
    ...PROG_KEYS().filter(k=>rec[k]), ...goodsParse(rec.goods).map(g=>'g:'+g.src)];
}
function itemQty(k){ const t=itemKind(k);
  if(t==='view') return String(effViewN(rec));   // 기본 관람 줄 = 관람 인원 − 다른 관람 영역 (직접 줄였으면 그 수)
  if(t==='varea'){ const v=viewsParse(rec.views).find(x=>x.src===k.slice(2)); return v ? String(v.qty) : ''; }
  if(t==='mb') return rec.mabangL||'';
  if(t==='goods'){ const g=goodsParse(rec.goods).find(x=>x.src===k.slice(2)); return g ? String(g.qty) : ''; }
  return t==='new' ? '' : (rec[k]||''); }
function setItemQty(k, v){ const t=itemKind(k); v=String(v||'').trim();
  if(t==='view'){   // 기본 관람 줄: 관람 인원이 비었으면 관람 인원으로, 남은 인원과 같으면 자동, 줄이면 그 수
    if(!numOf(rec.people)){ rec.people=v; touched.add('people'); if(rec.viewN){ rec.viewN=''; touched.add('viewN'); } return; }
    const nv = numOf(v)===viewAuto(rec) ? '' : v; if(String(rec.viewN||'')!==nv){ rec.viewN=nv; touched.add('viewN'); } return; }
  if(t==='varea'){ const list=viewsParse(rec.views), src=k.slice(2), q=Math.max(0, parseInt(v)||0), x=list.find(y=>y.src===src); if(x) x.qty=q; else if(q) list.push({src, qty:q}); rec.views=goodsJoin(list); touched.add('views'); if(q) itemPend.delete(k); else itemPend.add(k); return; }
  if(t==='mb'){ rec.mabangL=v; touched.add('mabangL');
    if(v && !rec.mabangTime){ const tt=fmtTime(rec.tin); if(tt){ rec.mabangTime=`${tt}~${String(Math.min(+tt.slice(0,2)+1,23)).padStart(2,'0')}${tt.slice(2)}`; touched.add('mabangTime'); } } }   // 몽몽마방 시간 기본 = 입장부터 1시간
  else if(t==='goods'){ const list=goodsParse(rec.goods), src=k.slice(2), q=Math.max(0, parseInt(v)||0), g=list.find(x=>x.src===src); if(g) g.qty=q; else if(q) list.push({src, qty:q}); rec.goods=goodsJoin(list); touched.add('goods'); }
  else if(t!=='new'){ rec[k]=v; touched.add(k); }
  if(v && v!=='0') itemPend.delete(k); else itemPend.add(k);
}
function clearItem(k){ const t=itemKind(k);
  if(itemNote(k)) setItemNote(k, '');
  if(t==='view') return;   // 관람 줄은 관람 인원 칸으로만
  if(t==='varea'){ rec.views=goodsJoin(viewsParse(rec.views).filter(x=>x.src!==k.slice(2))); touched.add('views'); itemPend.delete(k); return; }
  if(t==='mb'){ ['mabangL','mabangMenu','mabangTime','mabangPay'].forEach(x=>{ if(rec[x]){ rec[x]=''; touched.add(x); } }); }
  else if(t==='goods'){ rec.goods=goodsJoin(goodsParse(rec.goods).filter(x=>x.src!==k.slice(2))); touched.add('goods'); if(!rec.goods && rec.stf_goods){ rec.stf_goods=''; touched.add('stf_goods'); } }
  else if(t!=='new'){ [k, 'stf_'+k, 'tm_'+k, 'crs_'+k].forEach(x=>{ if(rec[x]){ rec[x]=''; touched.add(x); } }); }
  itemPend.delete(k);
}
// 드롭다운: 묶음(optgroup)별 항목. 다른 줄에서 이미 고른 항목은 못 고름
function itemSelectHTML(k, rows){
  const used=new Set(rows.filter(x=>x!==k)), mbUsed=used.has('mb');
  const opt=(v,l,dis,sel)=>`<option value="${esc(v)}"${dis?' disabled':''}${sel?' selected':''}>${esc(l)}</option>`;
  const pr=()=>'';   // 드롭다운에는 품목 이름만 (가격은 옆 칸에)
  const cur=mbMenuOf(rec);
  let h=`<option value="">항목 고르기</option>`;
  // 관람 · 관람+식사: 관람권(기본 관람 줄과 다른 것) · 관람 포함 패키지 전부 · 새벽 해오름 산책. 사담 1부 · 2부 · 디너는 예전 칸(sadam1 · 2 · D)
  const day=rec.date && isRedDay(rec.date) ? '주말/공휴일' : '평일', base=normSrc(viewSrcOf(rec));
  const SADAM_OF = {'사담런치1부':'sadam1','사담런치2부':'sadam2','사담디너':'sadamD'};
  const area = catalogItems().filter(it=>(it.kind==='view' || it.kind==='package') && !/네이버/.test(it.src) && String(it.src).startsWith(day) && it.price!=null);   // 관람권(9~18 · 13~18 · 학생 등)도 모두 여기서 고름
  h+=`<optgroup label="관람 · 관람+식사">${area.map(it=>{ const pm=String(it.src).match(/\(관람,\s*(.+)\)$/), sk=pm ? SADAM_OF[normSrc(pm[1])] : null, v=sk || 'v:'+it.src;
      return opt(v, (pm ? '관람 + '+pm[1] : viewLabel(it.src)), used.has(v), k===v || (itemKind(k)==='varea' && normSrc(daySrc(k.slice(2), rec))===normSrc(it.src))); }).join('')}`
    + `${FIELDS.some(f=>f[1]==='haeorum') ? opt('haeorum', '새벽 해오름 산책 (관람료 포함)'+pr(progSrc('haeorum', rec)), used.has('haeorum'), k==='haeorum') : ''}</optgroup>`;
  h+=`<optgroup label="몽몽마방">${mbMenus().map(m=>opt('mb:'+m.name, `몽몽마방 ${m.name}`, mbUsed, k==='mb' && cur && cur.name===m.name)).join('')}${k==='mb' && !cur ? opt('mb:', rec.mabangMenu ? `몽몽마방 ${rec.mabangMenu} (예전 메뉴 · 다시 고르기)` : '몽몽마방 (메뉴 고르기)', false, true) : ''}</optgroup>`;
  [['프로그램(개별)','개별 프로그램'],['프로그램(시간)','시간 프로그램']].forEach(([g,l])=>{
    h+=`<optgroup label="${l}">${FIELDS.filter(f=>f[0]===g && !isSub(f[1]) && f[1]!=='haeorum').map(f=>opt(f[1], f[2]+pr(progSrc(f[1], rec)), used.has(f[1]), k===f[1])).join('')}</optgroup>`; });
  const gi=goodsItems();
  h+=`<optgroup label="굿즈">${gi.map(it=>opt('g:'+it.src, (String(it.name||'').trim()||it.src), used.has('g:'+it.src), k==='g:'+it.src)).join('')}${itemKind(k)==='goods' && !gi.some(it=>'g:'+it.src===k) ? opt(k, k.slice(2), false, true) : ''}</optgroup>`;
  return `<select class="it-sel" data-isel="${esc(k)}" aria-label="항목">${h}</select>`;
}
function itemRowHTML(k, rows){
  const t=itemKind(k), stf=itemHasStaff(k), sv=stf ? String(rec[itemStfKey(k)]||'') : '';
  const note = t==='new' ? '' : `<input class="it-x it-note" data-inote="${esc(k)}" data-ime="ko" placeholder="비고 (예: ${t==='view'?'인솔자 2명 포함':t==='goods'?'선물 포장':t==='sadam'||t==='mb'?'창가 자리 · 알레르기':'준비물 · 장소'})" value="${esc(itemNote(k))}">`;
  if(t==='view'){ const vs=viewSrcOf(rec), vi=viewItems(rec).filter(it=>!/\(\d\d:00~18:00\)/.test(it.src) || normSrc(it.src)===normSrc(vs));   // 시간대 관람권은 입장 시각으로 정해진 것만
    const opts = vi.length ? vi.map(it=>`<option value="${esc(it.src)}"${normSrc(it.src)===normSrc(vs)?' selected':''}>${esc(viewLabel(it.src))}</option>`).join('') : `<option>관람 (관람 인원)</option>`;
    return `<div class="it-row it-view" data-irow="view"><select class="it-sel" data-iview aria-label="관람 품목" title="관람 품목 (관람 인원 = 수량)">${opts}</select><span class="it-p" data-iup="view"></span>`
      + `<span class="it-q"><input data-iq="view" inputmode="numeric" data-ime="num" placeholder="인원" value="${esc(itemQty('view'))}" title="관람 인원 − 다른 관람 품목(관람+식사 · 해오름 등). 직접 줄이면 그 수로 (관람하지 않는 인원)"><i>명</i></span>`
      + `<span class="it-s none"><input disabled placeholder="담당 없음"></span><span></span><div class="it-money" data-ip="view"></div><div class="it-extra">${note}<span class="it-amt" data-iamt="view"></span></div></div>`; }
  const extra = note + (t==='mb' ? `<input class="it-x" data-ix="mabangTime" inputmode="numeric" data-ime="num" placeholder="시간 12:00~13:00" title="몽몽마방 시간 (24시간)" value="${esc(rec.mabangTime||'')}"><select class="it-x" data-ix="mabangPay" title="몽몽마방 결제"><option value="">결제 (선택)</option>${MB_PAYS.map(x=>`<option${rec.mabangPay===x?' selected':''}>${x}</option>`).join('')}</select>`
    : t==='prog' && FIELDS.some(f=>f[1]==='tm_'+k) ? `<input class="it-x" data-ix="tm_${esc(k)}" inputmode="numeric" data-ime="num" placeholder="시간대 13:00~15:00" value="${esc(rec['tm_'+k]||'')}"><input class="it-x" data-ix="crs_${esc(k)}" data-ime="ko" placeholder="코스 (예: 정원 코스)" value="${esc(rec['crs_'+k]||'')}">` : '');
  return `<div class="it-row${t==='new'?' it-new':''}" data-irow="${esc(k)}">${itemSelectHTML(k, rows)}<span class="it-p" data-iup="${esc(k)}"></span>`
    + `<span class="it-q"><input data-iq="${esc(k)}" inputmode="numeric" data-ime="num" placeholder="수량" value="${esc(itemQty(k))}"${t==='new'?' disabled':''}><i>${itemUnit(k)}</i></span>`
    + (t==='goods' ? `<span class="it-s${sv.trim()?'':' missing'}"><input data-is="${esc(k)}" readonly placeholder="헤더에 영업 담당 이름을 넣으세요" value="${esc(sv)}" title="굿즈 담당 = 영업 담당 (헤더의 영업 담당 이름을 따라감)"></span>`
      : stf ? `<span class="it-s${sv.trim()?'':' missing'}"><input data-is="${esc(k)}" data-ime="ko" placeholder="담당자 이름 (필수)" value="${esc(sv)}" title="프로그램 담당"></span>` : `<span class="it-s none"><input disabled placeholder="${t==='new'?'항목을 먼저 고르세요':'담당 없음'}"></span>`)
    + `<button type="button" class="it-del" data-idel="${esc(k)}" title="이 항목 빼기">×</button>`
    + (t==='new' ? '' : `<div class="it-money" data-ip="${esc(k)}"></div><div class="it-extra">${extra}<span class="it-amt" data-iamt="${esc(k)}"></span></div>`) + `</div>`;   // 둘째 줄: 할인(할인 대상만) · 셋째 줄: 비고 (할인이 없으면 바로 비고, 금액은 그 줄 끝)
}
function renderItems(force){
  const box=$('#itemsBox'); if(!box) return;
  const recKeys=itemKeysFromRec();
  itemRows = itemRows.filter(k=>recKeys.includes(k) || itemPend.has(k));
  recKeys.forEach(k=>{ if(!itemRows.includes(k)) itemRows.push(k); });
  if(itemRows.includes('view')) itemRows=['view', ...itemRows.filter(k=>k!=='view')];   // 관람 인원은 항상 첫 줄
  const sig=itemRows.join('|');
  if(!force && box.dataset.sig===sig && box.contains(document.activeElement)){   // 쓰는 중: 줄은 그대로 두고 값만 맞춤
    box.querySelectorAll('[data-iq],[data-is],[data-ix],[data-inote]').forEach(el=>{ if(el===document.activeElement) return;
      const v = el.dataset.iq!=null ? itemQty(el.dataset.iq) : el.dataset.is!=null ? String(rec[itemStfKey(el.dataset.is)]||'') : el.dataset.inote!=null ? itemNote(el.dataset.inote) : String(rec[el.dataset.ix]||''); if(el.value!==v) el.value=v; });
    paintItemState(); paintItemPrices(); return;
  }
  box.dataset.sig=sig;
  box.innerHTML = (itemRows.length ? `<div class="it-head"><span>품목</span><span>가격 (1인 · 회당)</span><span>인원 · 수량</span><span>담당</span><span></span></div>` : '')
    + itemRows.map(k=>itemRowHTML(k, itemRows)).join('') + `<div id="erpExtra"></div>`
    + `<div class="it-foot"><button type="button" class="btn it-add" data-iadd>＋ 항목 추가</button><span class="hint" style="margin:0">${itemRows.length?'':'사담 식사 · 몽몽마방 · 개별 프로그램 · 시간 프로그램 · 굿즈 중에서 고르세요'}</span><button type="button" class="mb-cat" data-open-cat>품목 · 가격 수정</button></div>`;
  paintItemState(); paintItemPrices();
}
// 가격표를 예약 내역 아래로 합치고(할인 · 합계 · 전산 내역), 두 번째 열의 가격표 자리는 '그날 예약 현황'으로
function mergePriceLayout(){
  const dp=$('#dayPanel'), box=$('#itemsBox'); if(!dp || !box || $('#priceWrap')) return;
  const w=document.createElement('div'); w.id='priceWrap'; w.className='price-panel price-wrap';
  ['.disc-box','#selTitle','#priceBox','#erpBox','#priceAll','#priceSrc'].forEach(s=>{ const el=dp.querySelector(s); if(el) w.appendChild(el); });
  const btns=$('#priceAllBtn')?.parentElement; if(btns) w.insertBefore(btns, $('#erpBox'));
  box.after(w);
  $('#selTitle').textContent='할인 · 합계';
  const ph=$('#priceHint'); if(ph) box.closest('.grp')?.querySelector('.grp-t')?.appendChild(ph);   // "11/27(금) → 평일 가격"
  dp.querySelector('h2').innerHTML='예약 현황 <small>누르면 구분별 예약 목록</small>';
  dp.querySelector('h2').insertAdjacentHTML('afterend','<div class="dayinfo day-all" id="dayAll"></div>');
  const info=$('#itemsInfo'); if(info) dp.appendChild(info);
  dp.insertAdjacentHTML('beforeend','<p class="hint" id="dayNone" style="margin:0">방문일과 예약 내역(사담 · 몽몽마방 · 프로그램)을 넣으면 그날 다른 예약 현황이 여기에 보입니다. 예약 내역의 수량 칸에 커서를 두면 업체별로 보입니다.</p>');
}
// 줄마다 금액 (가격표 계산과 같은 것): 금액 굵게, 아래에 단가 · 할인
let priceInfo = null;   // { 품목: {qty, p, a} } (renderPrice가 채움, 전산 내역이 있으면 null)
function itemSrc(k){ const t=itemKind(k), DAY=rec.date && isRedDay(rec.date) ? '주말/공휴일' : '평일';
  if(t==='view') return viewSrcOf(rec);
  if(t==='varea') return daySrc(k.slice(2), rec);
  if(t==='sadam') return `${DAY}(관람, ${{sadam1:'사담 런치1부', sadam2:'사담 런치2부', sadamD:'사담 디너'}[k]})`;
  if(t==='mb') return (mbMenuOf(rec)||{}).src || (Number(rec.mabangPrice) ? '몽몽마방 단품' : '');
  if(t==='prog') return progSrc(k, rec) || '';
  if(t==='goods') return k.slice(2);
  return ''; }
// 전산 상품 → 예약 내역 줄 key (erpFields와 같은 기준)
function erpKeyOf(p){ const ns=normSrc(p);
  if(/\(관람,\s*사담\s*런치\s*1부\)/.test(p)) return 'sadam1';
  if(/\(관람,\s*사담\s*런치\s*2부\)/.test(p)) return 'sadam2';
  if(/\(관람,\s*사담\s*디너\)/.test(p)) return 'sadamD';
  if(/해오름/.test(p)) return 'haeorum';
  const vrow = viewsParse(rec.views).find(v=>normSrc(daySrc(v.src, rec))===ns || normSrc(v.src)===ns); if(vrow) return 'v:'+vrow.src;   // 관람 영역의 다른 품목 줄
  if(/\(관람,/.test(p)) return 'v:'+p;
  if(/관람/.test(p) && !/관람권|관람식사권/.test(p)) return 'v:'+p;
  const pk=PROG_KEYS().find(k=>normSrc(PROG_SRC[k]||'')===ns || normSrc(progSrc(k, rec)||'')===ns); if(pk) return /당두봉갈/.test(p) ? 'dangdu' : pk;
  if(mbMenus().some(m=>normSrc(m.src)===ns)) return 'mb';
  if(goodsItems().some(g=>normSrc(g.src)===ns)) return 'g:'+goodsItems().find(g=>normSrc(g.src)===ns).src;
  return null; }
// 전산 내역을 줄 key별로 합침 (같은 상품이 순번 여러 개면 더함)
function erpByKey(){ const m={}, other=[];
  erpList.forEach(x=>{ const k=erpKeyOf(x.product); if(!k){ other.push(x); return; }
    const o = m[k] ||= {people:0, base:0, disc:0, amount:0, notes:[], seqs:[]};
    o.people+=x.people; o.base+=x.base; o.disc+=x.disc; o.amount+=x.amount; o.notes.push(...x.notes); if(x.seq) o.seqs.push(x.seq); });
  return {m, other}; }
const cleanErpNote = n => String(n).replace(/\s*-\s*[\d,]+\(.*$/,'').replace(/\s*-\s*([\d,]+)\s*$/,' $1원');
// 관람+식사 패키지 "평일(관람, 사담 런치1부)" → 1인 관람 · 식사 가격. 품목 관리의 비과세(관람) · 과세(식사)가 있으면 그것, 없으면 그날 기본 관람권 가격만큼 관람
// 그 밖의 품목도 품목 관리에 과세 · 비과세가 나뉘어 있으면(예: 새벽 해오름 산책) 같은 모양으로. v = 비과세(사유원 · 입장료), m = 과세(신라)
function pkgSplit(src){
  if(!src) return null;
  const p=priceOf(src); if(p==null) return null;
  const tx=taxOf(src); if(tx && tx.tx>0 && tx.tf>0 && tx.tx+tx.tf===p) return {v:tx.tf, m:tx.tx};
  if(!/\(관람,/.test(src)) return null;
  const v=priceOf(viewSrcOf(rec)); return v!=null && v<p ? {v, m:p-v} : null;
}
document.addEventListener('click', e=>{ const b=e.target.closest?.('#itemsBox [data-idisc]'); if(!b) return;
  setItemDisc(b.dataset.idisc, b.dataset.dv, b.dataset.da); startTimer(); renderSide(); });   // 할인 버튼
let openDisc=new Set();   // 할인 대상이 아닌 품목에서 「할인 넣기」를 눌러 연 할인 줄
document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('#itemsBox [data-dopen]'); if(!b) return; openDisc.add(b.dataset.dopen); paintItemPrices(); const i=document.querySelector(`#itemsBox [data-idamt="${CSS.escape(b.dataset.dopen)}"]`); if(i){ i.focus(); i.select(); } });
// 할인액 칸 (예약 칸 계산 · 전산 내역 공통)
const damIn = (k, side, v, max) => `<label class="dam"><i>${side==='tx'?'과세(신라)':'비과세(사유원)'}</i>-<input data-idamt="${esc(k)}" data-side="${side}" inputmode="numeric" data-ime="num" value="${won(v)}" title="할인액 (최대 ${won(max)}원)">원</label>`;
// 전산 내역 줄 금액: 전산 상품금액 · 할인을 과세(신라) · 비과세(사유원)로 (자동 = 전산 사유원/신라 나누기와 같은 계산), 할인액을 고쳤으면 그 값
function erpRowMoney(k, x){
  const src=itemSrc(k), p=src ? priceOf(src) : null, u = p ? splitOf(src, p, rec) : {tx:1, tf:0}, rt=(u.tx+u.tf) ? u.tf/(u.tx+u.tf) : 0;
  const fTf=Math.round(x.base*rt), fTx=x.base-fTf;
  const lines=erpList.filter(y=>erpKeyOf(y.product)===k), autoSaw=lines.reduce((s,y)=>s+erpSplit(y).saw,0);
  const aTf=Math.max(0, Math.min(x.disc, fTf-autoSaw)), aTx=x.disc-aTf;
  const ov=idamtMap(rec)[dkey(k)], dTx = ov ? Math.min(ov.tx, fTx) : aTx, dTf = ov ? Math.min(ov.tf, fTf) : aTf;
  return { fTx, fTf, aTx, aTf, dTx, dTf, ov:!!ov, tx:fTx-dTx, tf:fTf-dTf, amount:x.base-dTx-dTf };
}
function rowMoneyOf(k){ if(erpList.length){ const E=erpByKey(); return E.m[k] ? erpRowMoney(k, E.m[k]) : null; } const x=priceInfo && priceInfo[normSrc(itemSrc(k))]; return x && x.m; }
// 할인액 칸: 고치면 그 줄만 직접 고친 할인액으로 (할인 버튼 계산과 같으면 다시 자동), ↺ = 자동으로
document.addEventListener('change', e=>{ const el=e.target.closest?.('#itemsBox [data-idamt]'); if(!el) return;
  const k=el.dataset.idamt, m=rowMoneyOf(k); if(!m) return;
  const get = side => { const i=document.querySelector(`#itemsBox [data-idamt="${CSS.escape(k)}"][data-side="${side}"]`); return i ? Math.max(0, parseInt(String(i.value).replace(/\D/g,''))||0) : (side==='tx'?m.dTx:m.dTf); };
  const tx=Math.min(get('tx'), m.fTx), tf=Math.min(get('tf'), m.fTf);
  setItemDamt(k, tx===m.aTx && tf===m.aTf ? null : {tx, tf}); startTimer(); renderSide(); });
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.closest?.('#itemsBox [data-idamt]')){ e.preventDefault(); e.target.blur(); } });
document.addEventListener('click', e=>{ const b=e.target.closest?.('#itemsBox [data-idamtreset]'); if(!b) return; setItemDamt(b.dataset.idamtreset, null); startTimer(); renderSide(); });
// 줄마다 [단가 · 할인 · 금액] (전산 내역이 있으면 인원 · 상품금액 · 할인 · 금액, 인원이 다르면 빨갛게)
function paintItemPrices(){
  // 줄 구성 (2026-11-14): ① [품목 · 가격(관람+식사는 관람 · 식사 따로) · 인원 · 담당 · ×] ② 할인(할인 대상 품목만: 버튼 · 할인 금액 · 할인 단가 · 금액) ③ 비고 (할인 줄이 없으면 금액은 비고 줄 끝)
  const seen=new Set(), E = erpList.length ? erpByKey() : null;
  const cell=(l,v,cls='')=>`<span class="im ${cls}"><i>${l}</i>${v}</span>`;
  const upHTML = src => { const sp=pkgSplit(src); if(sp) return `<span><i>비과세(사유원)</i>${won(sp.v)}원</span><span><i>과세(신라)</i>${won(sp.m)}원</span>`; const p=src?priceOf(src):null; return p==null ? '' : `<span><i>${/대관|도슨트|세미나/.test(src)?'회당':'1인'}</i>${won(p)}</span>`; };
  document.querySelectorAll('#itemsBox [data-ip]').forEach(el=>{ const k=el.dataset.ip, src=itemSrc(k), up=document.querySelector(`#itemsBox [data-iup="${CSS.escape(k)}"]`), am=document.querySelector(`#itemsBox [data-iamt="${CSS.escape(k)}"]`);
    let h='', amt='';
    // 가격 칸: 할인까지 빼고 실제로 결제하는 금액을 과세(신라) · 비과세(사유원)로 (전산 내역 모드 · 금액을 모르면 1인 가격)
    // 전산 내역이 있으면 전산 금액 · 할인을 그 품목의 과세 · 비과세 비율로 나눔
    const ex = E && E.m[k] ? erpRowMoney(k, E.m[k]) : null;
    const pm = ex || (!E && priceInfo && src ? (priceInfo[normSrc(src)]||{}).m : null);
    if(up) up.innerHTML = !quoteCat && !ex ? '' : pm && !seen.has(src) ? [pm.fTf>0 && `<span title="정상가 ${won(pm.fTf)}원 − 할인 ${won(pm.dTf)}원"><i>비과세(사유원)</i>${won(pm.tf)}원</span>`, pm.fTx>0 && `<span title="정상가 ${won(pm.fTx)}원 − 할인 ${won(pm.dTx)}원"><i>과세(신라)</i>${won(pm.tx)}원</span>`].filter(Boolean).join('') : upHTML(src);
    if(E){ const x=E.m[k];
      if(!x) h = k==='view' && !effViewN(rec) ? cell('전산', '관람권 따로 없음 (모두 관람 포함 품목)') : cell('전산', '<b class="bad">전산 내역에 없음</b>', 'warn');
      else if(x.disc || ex.ov || openDisc.has(k)) h = `<span class="im dams"><i>할인</i>${ex.fTf>0?damIn(k,'tf', ex.dTf, ex.fTf):''}${ex.fTx>0?damIn(k,'tx', ex.dTx, ex.fTx):''}${ex.ov?`<small class="dman">직접 고침</small><button type="button" class="dreset" data-idamtreset="${esc(k)}" title="전산 할인으로 되돌리기">↺</button>`:''}${x.notes.length?` <small>${esc(x.notes.map(cleanErpNote).join(' · '))}</small>`:''}</span>`;   // 전산 내역 줄: 할인만 (과세 · 비과세 할인액은 고칠 수 있음)
      else amt = `<button type="button" class="dopen" data-dopen="${esc(k)}" title="이 품목에 할인 넣기 (과세 · 비과세 할인액)">할인 넣기</button>`; }
    else if(!priceInfo) h='';
    else { const x=src ? priceInfo[normSrc(src)] : null;
      if(k==='view' && !x) h=cell('관람권', numOf(rec.people)?'0명 (모두 관람 포함 품목으로 계산)':'인원 입력');
      else if(!x) amt=cell('금액', '가격 없음', 'warn');
      else if(seen.has(src)) amt=cell('금액', '위 줄과 합산');   // 같은 견적서 품목(예: 대관)은 한 줄로 계산
      else { seen.add(src); const m=x.m;
        const money = cell('금액', `<b>${m?won(m.amount):'가격 없음'}</b>`, 'amt');
        const eligible = x.b && (x.b.disc || x.b.dsel!=='none');   // 할인 대상 품목 (할인 버튼)
        const discRow = m && x.b && (eligible || m.ov || openDisc.has(k));   // 할인 대상이 아니어도 「할인 넣기」를 눌렀거나 할인액을 넣은 줄은 할인 줄
        // 할인액: 과세(신라) · 비과세(사유원) 따로, 칸에서 바로 고칠 수 있음 (고치면 「직접 고침」, ↺ = 할인 버튼 계산으로 되돌리기)
        const dIn = (side, v, max) => `<label class="dam"><i>${side==='tx'?'과세(신라)':'비과세(사유원)'}</i>-<input data-idamt="${esc(k)}" data-side="${side}" inputmode="numeric" data-ime="num" value="${won(v)}" title="할인액 (최대 ${won(max)}원)">원</label>`;
        if(discRow) h = `<span class="im dsel${eligible?'':' off'}" title="할인 (자동: ${esc(DISC_OPTS.find(o=>o[0]===x.b.dauto)[1])}) · 잘못 들어갔으면 눌러서 바꾸기">${DISC_OPTS.map(([v,l])=>`<button type="button" class="dbtn${x.b.dsel===v?' on':''}" data-idisc="${esc(k)}" data-dv="${v}" data-da="${x.b.dauto}">${l}</button>`).join('')}${x.b.dsel!==x.b.dauto?'<small class="dman">직접 바꿈</small>':''}</span>`
            + `<span class="im dams"><i>할인</i>${m.fTf>0?dIn('tf', m.dTf, m.fTf):''}${m.fTx>0?dIn('tx', m.dTx, m.fTx):''}${m.ov?`<small class="dman">직접 고침</small><button type="button" class="dreset" data-idamtreset="${esc(k)}" title="할인 버튼(%)으로 계산한 할인액으로 되돌리기">↺</button>`:(m.disc?` <small>${esc(m.disc)}</small>`:'')}</span>`
            + money;
        else amt = money + (m && x.b ? `<button type="button" class="dopen" data-dopen="${esc(k)}" title="이 품목에 할인 넣기 (과세 · 비과세 할인액)">할인 넣기</button>` : ''); } }
    el.innerHTML=h; if(am) am.innerHTML=amt; });
  // 전산에만 있는 상품 (예약 내역 줄로 못 옮긴 것)
  if(E) erpList.forEach(x=>{ const k=erpKeyOf(x.product); if(k && !itemRows.includes(k) && !E.other.includes(x)) E.other.push(x); });   // 품목은 알지만 예약 내역에 줄이 없는 것도
  const ex=$('#erpExtra'); if(ex){ ex.innerHTML = E && E.other.length ? `<div class="it-row it-erponly"><b>전산에만 있는 상품</b>${E.other.map(x=>`<div class="it-money">${`<span class="im"><i>상품</i>${esc(x.product)}</span><span class="im"><i>인원</i>${x.people}</span><span class="im"><i>할인</i>${x.disc?'-'+won(x.disc):'없음'}</span><span class="im amt"><i>금액</i><b>${won(x.amount)}</b></span>`}${erpKeyOf(x.product) ? `<button type="button" class="btn it-erpadd" data-erpadd="${erpList.indexOf(x)}" title="이 상품을 예약 내역 줄로 추가 (인원 · 수량은 전산 그대로)">＋ 항목으로 추가</button>` : `<span class="im warn">품목 관리에 없는 상품 · 품목을 먼저 추가</span>`}</div>`).join('')}</div>` : ''; }
}
// 전산에만 있는 상품 → 예약 내역 줄로 (인원 · 수량은 전산 그대로)
document.addEventListener('click', e=>{ const b=e.target.closest('#itemsBox [data-erpadd]'); if(!b) return; const x=erpList[+b.dataset.erpadd]; if(!x) return;
  const k=erpKeyOf(x.product); if(!k){ toast('품목 관리에 없는 상품이라 줄로 넣을 수 없습니다.'); return; }
  if(k==='mb'){ const m=mbMenus().find(m=>normSrc(m.src)===normSrc(x.product)); if(m){ rec.mabangMenu=m.name; touched.add('mabangMenu'); } }   // 몽몽마방은 그 메뉴로
  setItemQty(k, String(numOf(itemQty(k)) + (x.people||0))); if(!itemRows.includes(k)) itemRows.push(k);
  itemChanged(true); toast(`${itemLabel(x.product)} ${x.people}${erpUnit(x)}을(를) 예약 내역에 추가했습니다. 담당 · 비고를 확인하세요.`);
});
function paintItemState(){   // 담당이 빈 줄은 빨갛게, 그날 현황은 넣은 묶음만
  document.querySelectorAll('#itemsBox [data-is]').forEach(el=>el.closest('.it-s').classList.toggle('missing', !el.value.trim()));
  const kinds=new Set(itemRows.map(k=>{ const t=itemKind(k); return t==='sadam'?'sadam':t==='mb'?'mabang':t==='prog'?(OPT[GROUP_OF[k]]||{}).id:''; }));
  document.querySelectorAll('#itemsInfo .dayinfo').forEach(el=>{ el.hidden = !kinds.has(el.id.replace('info_','')); });
  const dn=$('#dayNone'); if(dn) dn.hidden = [...document.querySelectorAll('#itemsInfo .dayinfo')].some(el=>!el.hidden);
}
function itemChanged(structural, keepStaff){ if(!keepStaff) staffDefaults(); startTimer();   // 담당을 직접 지울 때는 다시 채우지 않음
  paintFields(); renderSide(); if(structural) renderItems(true); }
document.addEventListener('change', e=>{ const v=e.target.closest?.('#itemsBox [data-iview]'); if(!v) return; rec.viewSrc=v.value; touched.add('viewSrc'); itemChanged(false, true); });   // 관람 품목 고르기
document.addEventListener('change', e=>{
  const s=e.target.closest?.('#itemsBox [data-isel]'); if(!s) return;
  const old=s.dataset.isel, val=s.value; if(!val) return;
  const nk = val.startsWith('mb:') ? 'mb' : val;
  const q=itemQty(old), st=itemHasStaff(old) ? String(rec[itemStfKey(old)]||'') : '';
  if(nk!==old) clearItem(old);
  if(val.startsWith('mb:') && val.length>3){ rec.mabangMenu=val.slice(3); touched.add('mabangMenu'); }
  const i=itemRows.indexOf(old); if(i>=0) itemRows[i]=nk; else itemRows.push(nk);
  if(nk!==old){ setItemQty(nk, q || (itemKind(nk)==='goods' ? '1' : '')); if(itemHasStaff(nk) && st && !String(rec[itemStfKey(nk)]||'').trim()){ rec[itemStfKey(nk)]=st; touched.add(itemStfKey(nk)); } }
  itemChanged(true);
  const qi=document.querySelector(`#itemsBox [data-iq="${CSS.escape(nk)}"]`); if(qi && !qi.value) qi.focus();
});
document.addEventListener('input', e=>{
  const el=e.target; if(!el.closest?.('#itemsBox')) return;
  if(el.dataset.iq!=null){ const k=el.dataset.iq, c=el.value.replace(/[^\d+]/g,''), was=itemQty(k); if(c!==el.value) el.value=c; setItemQty(k, el.value); itemChanged(false, !!was); }   // 담당 기본값은 수량을 처음 넣을 때만
  else if(el.dataset.inote!=null){ setItemNote(el.dataset.inote, el.value); itemChanged(false, true); }   // 항목 비고
  else if(el.dataset.is!=null){ const sk=itemStfKey(el.dataset.is); rec[sk]=el.value; touched.add(sk); itemChanged(false, true); }
  else if(el.dataset.ix!=null && el.tagName==='INPUT'){ rec[el.dataset.ix]=el.value; touched.add(el.dataset.ix); itemChanged(false, true); }
});
document.addEventListener('change', e=>{ const el=e.target; if(!el.closest?.('#itemsBox') || el.dataset.ix==null || el.tagName!=='SELECT') return; rec[el.dataset.ix]=el.value; touched.add(el.dataset.ix); itemChanged(false); });
document.addEventListener('focusout', e=>{ const el=e.target; if(!el.closest?.('#itemsBox') || el.dataset.ix==null || el.tagName!=='INPUT' || !el.value) return;
  if(/^(mabangTime|tm_)/.test(el.dataset.ix)){ const f=fmtRange(el.value); if(f && f!==el.value){ el.value=f; rec[el.dataset.ix]=f; touched.add(el.dataset.ix); itemChanged(false); } } });   // 12001300 → 12:00~13:00
document.addEventListener('focusin', e=>{ const el=e.target; if(!el.closest?.('#itemsBox') || el.dataset.iq==null) return; const k=el.dataset.iq, t=itemKind(k); renderInfo(t==='mb' ? 'mabangL' : ['sadam','prog'].includes(t) ? k : null); });   // 그날 같은 항목 예약 현황
document.addEventListener('click', e=>{
  if(e.target.closest?.('#itemsBox [data-iadd]')){ const k='new:'+Date.now().toString(36); itemRows.push(k); itemPend.add(k); renderItems(true); document.querySelector(`#itemsBox [data-isel="${k}"]`)?.focus(); return; }
  const d=e.target.closest?.('#itemsBox [data-idel]'); if(d){ const k=d.dataset.idel; clearItem(k); itemRows=itemRows.filter(x=>x!==k); itemChanged(true); }
});
// "12001300" · "12-13" · "12:00~13:00" → "12:00~13:00"
function fmtRange(v){ const s=String(v||'').trim(); if(!s) return ''; let a, b; const p=s.split(/\s*[~\-–]\s*/);
  if(p.length===2){ a=fmtTime(p[0]); b=fmtTime(p[1]); } else { const d=s.replace(/\D/g,''); if(d.length===8){ a=fmtTime(d.slice(0,4)); b=fmtTime(d.slice(4)); } else if(d.length===4 && !/:/.test(s)){ a=fmtTime(d.slice(0,2)); b=fmtTime(d.slice(2)); } }
  return a && b ? `${a}~${b}` : ''; }
const TIME_KEYS = { tin:'12:00', tout:'18:00' };   // 입장 · 퇴장: 24시간 표시 시각 (값은 자리 표시)
// "930" · "9:30" · "13" · "오후 2시" → "09:30" · "13:00" · "14:00". 시각이 아니면 ''
function fmtTime(v){ v=String(v||'').trim(); let m=v.match(/^(\d{1,2}):?(\d{2})$/) || v.match(/^(\d{1,2})$/); let h, mi;
  if(m){ h=+m[1]; mi=+(m[2]||0); } else { m=v.match(/(\d{1,2})\s*(?:시|:)\s*(\d{1,2})?/); if(!m) return ''; h=+m[1]; mi=+(m[2]||0); if(/오후|저녁|pm/i.test(v) && h<12) h+=12; }
  return h<=23 && mi<=59 ? `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}` : ''; }
// 방문일: 칸에는 "2026-12-05 (토)"처럼 요일까지. 직접 칠 때는 2026-12-05 · 2026.12.5 · 20261205 · 12/5 · 1205 · 12월 5일 (연도 없으면 올해, 지났으면 내년)
const dateDisp = v => { if(!v) return ''; const t=new Date(v+'T00:00'); return isNaN(t) ? v : `${v} (${'일월화수목금토'[t.getDay()]})`; };
// 날짜 칸 (마감일 · 미정 항목 답변일): 방문일처럼 칸 안에 "2026-11-14 (금)". 누르면 달력, 고르는 즉시 요일도 바뀜
const dboxHTML = (attrs, v) => `<span class="dbox"><input class="dtxt" readonly value="${esc(dateDisp(v))}" placeholder="날짜 고르기"><input type="date" class="dpick" ${attrs} value="${esc(v||'')}" tabindex="-1" aria-hidden="true"></span>`;
const dboxOpen = t => { const p=t.parentElement.querySelector('.dpick'); if(!p) return; try{ p.showPicker(); }catch(_){ p.focus(); p.click(); } };
document.addEventListener('click', e=>{ const t=e.target.closest?.('.dtxt'); if(t){ e.preventDefault(); dboxOpen(t); } });
document.addEventListener('keydown', e=>{ const t=e.target.closest?.('.dtxt'); if(t && (e.key==='Enter' || e.key===' ' || e.key==='ArrowDown')){ e.preventDefault(); dboxOpen(t); } });
['input','change'].forEach(ev=>document.addEventListener(ev, e=>{ const p=e.target; if(!p.classList?.contains('dpick')) return; const t=p.parentElement.querySelector('.dtxt'); if(t) t.value=dateDisp(p.value); }, true));
function parseDateText(s){
  s=String(s||'').replace(/\([^)]*\)\s*$/,'').trim(); if(!s) return '';
  let y, m, d, x;
  if((x=s.match(/^(\d{4})\s*[-./년 ]?\s*(\d{1,2})\s*[-./월 ]?\s*(\d{1,2})\s*일?$/))){ y=+x[1]; m=+x[2]; d=+x[3]; }
  else if((x=s.match(/^(\d{1,2})\s*[-./월 ]\s*(\d{1,2})\s*일?$/)) || (x=s.match(/^(\d{2})(\d{2})$/))){
    m=+x[1]; d=+x[2]; const now=new Date(); y=now.getFullYear(); const t=new Date(y,m-1,d); now.setHours(0,0,0,0); if(t<now) y++; }
  else return null;
  const t=new Date(y,m-1,d); if(t.getFullYear()!==y || t.getMonth()!==m-1 || t.getDate()!==d) return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
const NUM_ONLY = { people:/[^\d+]/g, vehicle:/[^\d]/g, mabangPrice:/[^\d]/g, mabangTime:/[^\d:~]/g };   // 관람 인원은 42+2 처럼 + 허용
FIELDS.forEach(f=>{ if(/^tm_/.test(f[1])) NUM_ONLY[f[1]]=/[^\d:~]/g; });   // 도슨트 시간대도 숫자 · : · ~ 만
// 연락처: 빈 칸을 누르면 010- 이 들어가고, 숫자를 치면 - 가 자동. 내선 번호면 010- 을 지우고 쓰면 됨
const PHONE = k => /^c\d+_phone$/.test(k);
function fmtPhone(v){
  const d=String(v||'').replace(/\D/g,'').slice(0,12);
  if(!d) return '';
  if(/^01[016789]/.test(d)) return d.length<=3 ? d : d.length<=7 ? `${d.slice(0,3)}-${d.slice(3)}` : `${d.slice(0,3)}-${d.slice(3,d.length-4)}-${d.slice(-4)}`;
  if(/^02/.test(d))         return d.length<=2 ? d : d.length<=5 ? `02-${d.slice(2)}` : `02-${d.slice(2,d.length-4)}-${d.slice(-4)}`;
  if(/^0\d\d/.test(d))      return d.length<=3 ? d : d.length<=6 ? `${d.slice(0,3)}-${d.slice(3)}` : `${d.slice(0,3)}-${d.slice(3,d.length-4)}-${d.slice(-4)}`;
  return d.length<=4 ? d : `${d.slice(0,d.length-4)}-${d.slice(-4)}`;   // 내선·대표번호 (1234, 123-4567)
}
const VTYPES = ['버스','승용','혼합','미정'];
// 차량 값: "버스 2대" · "승용 3대" · "혼합 (버스 1대 + 승용 2대)" · "미정"
function vehParts(v){ v=String(v||'');
  if(/^미정/.test(v)) return {t:'미정',n:'',bus:'',car:''};
  const bus=(v.match(/버스\s*(\d+)/)||[,''])[1], car=(v.match(/승용\s*(\d+)/)||[,''])[1];
  if(/혼합/.test(v) || (bus && car)) return {t:'혼합',n:'',bus,car};
  const t=VTYPES.find(x=>v.includes(x)) || (/(대형|중형|소형|미니)/.test(v)?'버스':''); const n=(v.match(/\d+/)||[''])[0]; return {t,n,bus:'',car:''}; }
function vehJoin(t,n,bus,car){
  if(t==='미정') return '미정';
  if(t==='혼합'){ const p=[bus&&`버스 ${bus}대`, car&&`승용 ${car}대`].filter(Boolean); return p.length ? `혼합 (${p.join(' + ')})` : '혼합'; }
  return n ? `${t||'버스'} ${n}대` : (t && t!=='버스' ? t : ''); }
const vehRead = () => vehJoin($('#f_vtype').value, $('#f_vehicle').value, $('#f_vbus').value, $('#f_vcar').value);
function fieldHTML(k,label,col,cls,req){
  let extra = DATE_KEYS.has(k) && k!=='date' ? ' type="date"' : '';
  if(k==='date') extra+=' readonly inputmode="numeric" data-ime="num" placeholder="누르면 달력" title="누르면 달력 · 한 번 더 누르면 직접 입력 (예: 2026-12-05, 12/5)"';
  if(k==='owner') extra+=' list="owners"';
  if(KO_FIRST(k)) extra+=' data-ime="ko"';
  if(EN_ONLY(k))  extra+=' data-ime="en" inputmode="email" lang="en" autocapitalize="off" spellcheck="false"';
  if(PHONE(k))    extra+=' data-ime="num" inputmode="tel" placeholder="010-0000-0000"';
  if(NUM_ONLY[k]) extra+=' inputmode="numeric" data-ime="num"';
  if(TIME_KEYS[k]) extra+=` inputmode="numeric" data-ime="num" maxlength="5" placeholder="${TIME_KEYS[k]}" title="24시간 표시 (예: 13:30)"`;
  if(k==='mabangTime') extra+=' placeholder="12:00~13:00" title="24시간 · 숫자만 쳐도 됨 (12001300)"';
  if(k==='mabangPrice') extra+=' placeholder="1인 단가"';
  if(k==='mabangNote') extra+=' data-ime="ko" placeholder="예) 20% 할인, 2인 이상 주문"';
  const input = k==='goods'
    ? `<div class="goods-box" id="f_goods"></div>`   /* 굿즈 구매: 품목 + 수량 */
    : k==='mabangMenu'
    ? `<div class="mb-menu" id="f_mabangMenu"></div>`
    : k==='mabangPay'
    ? `<select id="f_${k}" data-k="${k}"><option value="">선택</option>${MB_PAYS.map(p=>`<option>${p}</option>`).join('')}</select>`
    : k==='vehicle'
    ? `<div class="vrow"><select id="f_vtype" data-k="vehicle" aria-label="차종">${VTYPES.map(t=>`<option>${t}</option>`).join('')}</select><input id="f_${k}" data-k="${k}"${extra} placeholder="대수"><span class="vmix" id="f_vmix" hidden><i>버스</i><input id="f_vbus" data-k="vehicle"${extra} placeholder="대" aria-label="버스 대수"><i>승용</i><input id="f_vcar" data-k="vehicle"${extra} placeholder="대" aria-label="승용 대수"></span></div>`
    : CHECKS[k]
    ? `<label class="ckf"><input type="checkbox" id="f_${k}" data-k="${k}"> ${CHECKS[k]}</label>`
    : k==='gate'
    ? `<select id="f_${k}" data-k="${k}">${GATES.map(g=>`<option>${g}</option>`).join('')}</select>`   /* 입장문: 선택 없음, 기본 미정 */
    : k==='pay'
    ? `<select id="f_${k}" data-k="${k}">${PAYS.map(p=>`<option>${p}</option>`).join('')}</select>`
    : k==='date'   // 보이는 칸은 "2026-12-05 (토)" 글자, 달력은 밑에 숨긴 날짜 칸으로
    ? `<input id="f_date" data-k="date" class="date-text"${extra}><input type="date" id="f_datePick" class="date-pick" tabindex="-1" aria-hidden="true">`
    : isStf(k)
    ? `<input id="f_${k}" data-k="${k}" data-ime="ko" placeholder="담당자 이름 (필수)" autocomplete="off">`
    : /^tm_/.test(k)
    ? `<input id="f_${k}" data-k="${k}" inputmode="numeric" data-ime="num" placeholder="13:00~15:00" title="24시간 · 숫자만 쳐도 됨 (13001500)" autocomplete="off">`
    : /^crs_/.test(k)
    ? `<input id="f_${k}" data-k="${k}" data-ime="ko" placeholder="예) 정원 코스" autocomplete="off">`
    : `<input id="f_${k}" data-k="${k}"${extra}${/^프로그램/.test(GROUP_OF[k]||'') ? ` placeholder="${UNIT(k)}"` : ''}>`;
  const tbdBox = k!=='vehicle' && k!=='pay' && TBD_KEYS.some(([tk])=>tk===k) ? `<label class="tbdck" title="아직 안 정해졌으면 체크"><input type="checkbox" data-tbd="${k}">미정</label>` : "";
  return `<div class="f ${cls}${req?' req':''}${tbdBox?' has-tbd':''}" id="w_${k}"><label for="f_${k}"><span>${label}</span></label><div class="inbox">${input}${tbdBox}</div></div>`;
}
function buildForm(){
  const req=new Set(REQUIRED().map(r=>r[0]));
  let html='', g='';
  const close=()=>{ if(!g) return; html+='</div>'; if(OPT[g] && OPT[g].id!=='goods') html+=`<div class="dayinfo" id="info_${OPT[g].id}"></div>`; html+='</div>'; };
  FIELDS.forEach(([grp,k,label,col,cls])=>{
    if(grp!==g){
      close();
      if(OPT[grp] && !Object.keys(OPT).some(x=>x===g)){   // 첫 접는 묶음 앞에 버튼 3개
        html+=`<div class="grp items-grp"><div class="grp-t"><span>예약 내역</span></div><div class="items-box" id="itemsBox"></div><div id="itemsInfo"></div></div>`;
        html+=`<div class="opt-bar">${Object.values(OPT).map(o=>`<button type="button" class="opt-btn" data-opt="${o.id}" aria-expanded="false"><span>${o.short||o.title}</span><small id="optsum_${o.id}"></small></button>`).join('')}</div>`;
      }
      html+= OPT[grp]
        ? `<div class="grp opt" id="opt_${OPT[grp].id}" hidden><div class="grp-t"><span>${OPT[grp].title}</span></div><div class="fields">`
        : `<div class="grp" data-grp="${grp}"><div class="grp-t"><span>${grp}</span></div><div class="fields">`;
      g=grp;
    }
    if(k==='tbdDate' || k==='owner' || k==='payContact') return;   // 입력 기한 · 결제 연락 예정일은 예약 내용 제목 줄, 영업 담당은 맨 위 초록 헤더
    if(isSub(k)) html += fieldHTML(k, isStf(k) ? '담당' : SUB_NAME[k.split('_')[0]], col, 'sub'+(isStf(k)?' sub-stf':''), isStf(k));   // 프로그램 · 굿즈 바로 옆 '담당 *' (필수)
    else html += fieldHTML(k,label,col,(cls||'')+(STAFF_BASES().includes(k) && k!=='goods' ? ' pbase' : ''),req.has(k)||k==='payContact');
    if(k==='pchg') html += `</div></div><div class="grp" data-grp="담당자"><div class="grp-t"><span>담당자</span><span class="hint" style="margin:0">여러 명이면 추가</span></div><div class="contacts" id="contacts"></div><button type="button" class="btn addc" id="addContact">+ 담당자 추가</button>` + `<div class="fields" hidden>`;
  });
  close();
  $('#form').innerHTML = html;
  document.querySelectorAll('#form .dayinfo').forEach(el=>$('#itemsInfo')?.appendChild(el));   // 그날 예약 현황은 항목 줄 아래로
  // 사담 줄은 4칸 중 3칸만 쓰므로 빈 칸 하나
  document.querySelectorAll('.opt-btn').forEach(b=>b.onclick=()=>{
    const id=b.dataset.opt; optOpen.has(id) ? optOpen.delete(id) : optOpen.add(id); paintOpt();
    if(optOpen.has(id)) document.querySelector(`#opt_${id} input`)?.focus();
  });
  document.querySelectorAll('[data-tbd]').forEach(b=>b.onclick=()=>{
    const s=tbdSet(rec), k=b.dataset.tbd; s.has(k) ? s.delete(k) : s.add(k);
    rec.tbd = TBD_KEYS.filter(([tk])=>s.has(tk)).map(([,tl])=>tl).join(', ');
    if(!s.size){ rec.tbdDate=''; rec.tbdLate=''; tbdAuto=false; }   // 미정 항목이 없으면 입력 기한 · 늦춘 사유도 없음
    touched.add('tbd'); startTimer(); paintFields(); renderSide();
  });
  $('#addContact').onclick=()=>{ nContacts++; renderContacts(); document.getElementById(`f_c${nContacts-1}_name`).focus(); };
  $('#form').addEventListener('input', e=>{
    const k=e.target.dataset.k; if(!k) return;
    if(PHONE(k) && !e.isComposing){
      const el=e.target, atEnd=el.selectionStart===el.value.length;
      const del = e.inputType && e.inputType.startsWith('delete');
      let f=fmtPhone(el.value);
      if(del && el.value.endsWith('-') && f===el.value.replace(/-$/,'')) f=el.value.replace(/-$/,'');   // 지우는 중에는 끝 - 를 다시 붙이지 않음
      if(f!==el.value){ el.value=f; if(atEnd) el.setSelectionRange(f.length,f.length); }
    }
    if(TIME_KEYS[k] && !e.isComposing){   // 숫자만 치면 : 자동 (1330 → 13:30)
      const el=e.target, del=e.inputType && e.inputType.startsWith('delete');
      const d=el.value.replace(/\D/g,'').slice(0,4), f = del ? el.value.replace(/[^\d:]/g,'') : d.length>=3 ? `${d.slice(0,d.length-2)}:${d.slice(-2)}` : d;
      if(f!==el.value){ el.value=f; el.setSelectionRange(f.length,f.length); }
    }
    if(NUM_ONLY[k] && e.target.tagName==='INPUT' && !e.isComposing){ const c=e.target.value.replace(NUM_ONLY[k],''); if(c!==e.target.value){ const p=e.target.selectionStart-(e.target.value.length-c.length); e.target.value=c; try{ e.target.setSelectionRange(p,p); }catch(_){} } }
    if(k==='date'){ const d=parseDateText(e.target.value); if(d===null) return; }   // 방문일을 치는 중 (날짜가 되기 전엔 그대로)
    rec[k]= e.target.type==='checkbox' ? (e.target.checked?'있음':'') : k==='vehicle' ? vehRead() : k==='date' ? parseDateText(e.target.value) : e.target.value;
    touched.add(k);
    if(k==='pay'){ syncPayTbd(rec); touched.add('tbd'); }   // 결제 미정 ↔ 미정 항목 '결제 방법'
    if(k==='pay' && PAY_GUIDE[rec.pay]) openPayGuide(rec.pay);   // 결제 방식을 고르면 그 안내를 바로 팝업으로
    if(k==='vehicle' && e.target.id==='f_vtype'){ const s=tbdSet(rec); rec.vehicle==='미정' ? s.add('vehicle') : s.delete('vehicle'); rec.tbd=TBD_KEYS.filter(([tk])=>s.has(tk)).map(([,tl])=>tl).join(', '); if(!s.size){ rec.tbdDate=''; rec.tbdLate=''; tbdAuto=false; } touched.add('tbd'); }   // 차종 '미정' = 차량 미정 체크
    if(k==='date') renderInfo();
    startTimer(); paintFields(); renderSide();
  });
  // 식사 칸을 누르면 비어 있을 때 방문 인원을 먼저 넣고 전체 선택 (그대로 두거나 바로 고쳐 쓰기)
  $('#form').addEventListener('click', e=>{ const el=e.target, k=el.dataset?.k;
    if(!MEAL_KEYS.includes(k) || el.value || !numOf(rec.people)) return;
    el.value=String(numOf(rec.people)); el.dispatchEvent(new Event('input',{bubbles:true})); el.select(); });
  // 담당자 순서: ▲ 를 누르면 바로 위 담당자와 자리를 바꿈 (맨 위가 견적서 수신 · 연락처 · 목록에 쓰이는 대표 담당자)
  $('#form').addEventListener('click', e=>{ const u=e.target.closest('.up'); if(!u) return; const i=+u.dataset.up; if(i<1) return;
    CFIELDS.forEach(([f])=>{ const a=`c${i-1}_${f}`, b=`c${i}_${f}`, t=rec[a]||''; rec[a]=rec[b]||''; rec[b]=t; touched.add(a); touched.add(b); });
    startTimer(); renderContacts(); renderForm(); toast('담당자 순서를 바꿨습니다.'); });
  $('#form').addEventListener('click', e=>{
    const x=e.target.closest('.x'); if(!x) return;
    const i=+x.dataset.i;
    for(let j=i;j<nContacts-1;j++) CFIELDS.forEach(([f])=>{ rec[`c${j}_${f}`]=rec[`c${j+1}_${f}`]||''; if(touched.has(`c${j+1}_${f}`)) touched.add(`c${j}_${f}`); });
    CFIELDS.forEach(([f])=>{ delete rec[`c${nContacts-1}_${f}`]; });
    nContacts=Math.max(1,nContacts-1); renderContacts(); renderForm();
  });
  // Enter로 다음 칸
  $('#form').addEventListener('keydown', e=>{
    if(e.key!=='Enter' || e.isComposing || e.target.tagName!=='INPUT') return; e.preventDefault();
    const ins=[...document.querySelectorAll('#form input:not([type=checkbox])')]; const i=ins.indexOf(e.target); if(ins[i+1]) ins[i+1].focus();
  });
  // 식사·프로그램 칸에 커서(마우스·입력)를 두면 그날 그 칸의 예약 현황
  const hot = e=>{ const w=e.target.closest('.f'); const k=w?.querySelector('input')?.dataset.k; if(k && INFO_OF(k)) renderInfo(k); };
  $('#form').addEventListener('mouseover', hot);
  $('#form').addEventListener('focusin', hot);
  // 연락처: 빈 칸을 누르면 010- 부터. 아무것도 안 치고 나가면 다시 비움
  $('#form').addEventListener('focusin', e=>{ const el=e.target; if(PHONE(el.dataset?.k||'') && !el.value){ el.value='010-'; setTimeout(()=>{ try{ el.setSelectionRange(4,4); }catch(_){} },0); } });
  $('#form').addEventListener('focusout', e=>{ const el=e.target; if(PHONE(el.dataset?.k||'') && /^010-?$/.test(el.value) && !rec[el.dataset.k]) el.value=''; });
  // 방문일: 누르면 달력부터. 달력을 연 뒤 칸을 한 번 더 누르면 글자로 직접 고치기. 숫자를 치기 시작해도 직접 입력
  { const dt=$('#f_date'), dp=$('#f_datePick');
    const openPick=()=>{ try{ dp.showPicker(); }catch(_){ dp.focus(); } };
    const startEdit=(blank)=>{ dt.dataset.editing='1'; dt.readOnly=false; dt.value = blank ? '' : (rec.date||''); dt.focus(); if(!blank) dt.select(); };
    dt.addEventListener('mousedown', e=>{
      if(dt.dataset.editing) return;
      if(Date.now()-(+dt.dataset.pickAt||0) < 20000){ e.preventDefault(); dt.dataset.pickAt=''; startEdit(false); return; }   // 두 번째 누름
      dt.dataset.pickAt=String(Date.now()); setTimeout(openPick,0);
    });
    dt.addEventListener('keydown', e=>{ if(!dt.dataset.editing && /^\d$/.test(e.key)) startEdit(true); });
    dt.addEventListener('blur', ()=>{ if(!dt.dataset.editing) return;
      const d=parseDateText(dt.value); if(d===null){ toast('날짜를 알아볼 수 없습니다. 예) 2026-12-05, 12/5'); }
      delete dt.dataset.editing; dt.readOnly=true; paintFields(); });
    dp.addEventListener('change', ()=>{ dt.value=dp.value; dt.dispatchEvent(new Event('input',{bubbles:true})); });
  }
  // 입장: 빈 칸을 누르면 기본 12:00 (선택된 상태라 바로 고쳐 쓰기). 나갈 때 24시간 HH:MM 으로 맞춤 (9:30 → 09:30, 13 → 13:00)
  $('#form').addEventListener('focusin', e=>{ const el=e.target; if(el.dataset?.k==='tin' && !el.value){ el.value='12:00'; el.dispatchEvent(new Event('input',{bubbles:true})); setTimeout(()=>{ try{ el.select(); }catch(_){} },0); } });
  // 몽몽마방 시간: 빈 칸을 누르면 고객님 입장 시각부터 1시간 (예: 입장 13:00 → 13:00~14:00), 고쳐 쓰기 쉽게 선택된 상태
  $('#form').addEventListener('focusin', e=>{ const el=e.target; if(el.dataset?.k!=='mabangTime' || el.value) return; const t=fmtTime(rec.tin); if(!t) return; const h=+t.slice(0,2)+1; el.value=`${t}~${String(Math.min(h,23)).padStart(2,'0')}${t.slice(2)}`; el.dispatchEvent(new Event('input',{bubbles:true})); setTimeout(()=>{ try{ el.select(); }catch(_){} },0); });
  const mbDefTime = () => { const t=fmtTime(rec.tin); if(!t) return ''; const h=Math.min(+t.slice(0,2)+1,23); return `${t}~${String(h).padStart(2,'0')}${t.slice(2)}`; };
  $('#form').addEventListener('input', e=>{ if(e.target.dataset?.k!=='mabangL' || !rec.mabangL || rec.mabangTime) return; const v=mbDefTime(); if(!v) return; rec.mabangTime=v; touched.add('mabangTime'); paintFields(); renderSide(); });   // 몽몽마방 인원을 넣으면 시간도 입장 시각으로
  $('#form').addEventListener('input', e=>{ const k=e.target.dataset?.k; if(k && STAFF_BASES().includes(k) && staffDefaults()) { paintFields(); renderSide(); } });   // 프로그램을 넣으면 담당 = 영업 담당 (바꿀 수 있음)
  $('#form').addEventListener('focusout', e=>{ const el=e.target, k=el.dataset?.k; if(!TIME_KEYS[k] || !el.value) return; const f=fmtTime(el.value); if(f && f!==el.value){ el.value=f; el.dispatchEvent(new Event('input',{bubbles:true})); } });
  // 몽몽마방: 시간은 나갈 때 12:00~13:00 으로, 메뉴는 체크한 것을 ", " 로, 단가 칸이 비어 있을 때 누르면 메뉴로 계산한 제안 단가
  $('#form').addEventListener('focusout', e=>{ const el=e.target; const kk=el.dataset?.k||''; if((kk!=='mabangTime' && !/^tm_/.test(kk)) || !el.value) return; const f=fmtRange(el.value); if(f && f!==el.value){ el.value=f; el.dispatchEvent(new Event('input',{bubbles:true})); } });   // 몽몽마방 시간 · 도슨트 시간대
  // 몽몽마방 메뉴: 하나 고르기, 고른 것을 다시 누르면 해제
  $('#form').addEventListener('click', e=>{ const el=e.target; if(el.dataset?.menu===undefined) return;
    const was = rec.mabangMenu===el.dataset.menu;
    rec.mabangMenu = was ? '' : el.dataset.menu; if(was) el.checked=false;
    touched.add('mabangMenu'); startTimer(); paintFields(); renderSide(); });
  $('#form').addEventListener('mouseleave', ()=>{ const a=document.activeElement?.dataset?.k; renderInfo(a && INFO_OF(a) ? a : null); });
  renderContacts();
}
function renderContacts(){
  const req=new Set(REQUIRED().map(r=>r[0]));
  let h='';
  for(let i=0;i<nContacts;i++){
    h+=`<div class="crow">${CFIELDS.map(([f,l])=>fieldHTML(`c${i}_${f}`, l, '', '', req.has(`c${i}_${f}`))).join('')}<span class="cacts">${i?`<button type="button" class="up" data-up="${i}" title="위로 올리기 (맨 위 = 주로 연락하는 대표 담당자)">▲</button><button type="button" class="x" data-i="${i}" title="이 담당자 빼기">×</button>`:''}</span></div>`;   // 버튼 자리는 모든 줄에 같은 폭 (첫 줄은 비움) → 칸 열이 맞음
  }
  $('#contacts').innerHTML=h;
  for(let i=0;i<nContacts;i++) CFIELDS.forEach(([f])=>{ const k=`c${i}_${f}`; document.getElementById('f_'+k).value=rec[k]||''; });
  paintFields();
}
function paintFields(changed=[]){
  syncGoodsStaff();   // 굿즈 담당 = 영업 담당
  const req=new Set(REQUIRED().map(r=>r[0]));
  allKeys().forEach(k=>{
    if(k==='owner') return;   // 헤더의 영업 담당은 이 컴퓨터 사용자 (기록마다 바뀌지 않음)
    const el=document.getElementById('f_'+k); if(!el) return;
    const v=rec[k]||'';
    if(k==='vehicle'){ const p=vehParts(v), a=document.activeElement;
      if(p.t && a!==$('#f_vtype')) $('#f_vtype').value=p.t;
      if(!v && a!==$('#f_vtype')) $('#f_vtype').value = tbdSet(rec).has('vehicle') ? '미정' : '버스';   // 예전 '차량 대수 미정' 체크
      [[el,p.n],[$('#f_vbus'),p.bus],[$('#f_vcar'),p.car]].forEach(([x,val])=>{ if(a!==x && x.value!==val) x.value=val; });
      const t=$('#f_vtype').value; el.hidden = t==='혼합' || t==='미정'; $('#f_vmix').hidden = t!=='혼합'; }
    else if(el.type==='checkbox') el.checked=!!v;
    else if(k==='date'){ if(!el.dataset.editing){ const d=dateDisp(v); if(el.value!==d) el.value=d; } const p=$('#f_datePick'); if(p && p.value!==v) p.value=v; }
    else if(k==='mabangMenu'){ const h=mbMenuHTML(v); if(el.dataset.h!==h){ el.innerHTML=h; el.dataset.h=h; } }
    else if(k==='goods'){ const h=goodsHTML(v); if(el.dataset.h!==h && !el.contains(document.activeElement)){ el.innerHTML=h; el.dataset.h=h; } }
    else { if(el.tagName==='SELECT' && v && ![...el.options].some(o=>o.value===v)) el.add(new Option(v,v)); if(el.value!==v && document.activeElement!==el) el.value=v; }
    const w=document.getElementById('w_'+k);
    w.classList.toggle('unsure', fieldWarnings(rec).some(u=>u.field===k));
    const isTbd = tbdSet(rec).has(k) || (k==='pay' && v==='미정');   // 결제 미정도 노란색
    w.classList.toggle('tbd', isTbd);
    w.classList.toggle('missing', (req.has(k) && !v && !isTbd) || (isStf(k) && !v && needsStaff(k.slice(4))));
    if(isSub(k)) w.hidden = !rec[baseOf(k)] && !v;   // 프로그램을 넣었을 때만 담당 · 시간대 · 코스 칸
    if(w.classList.contains('pbase')) w.classList.toggle('on', !!v);
    if(OPT[GROUP_OF[k]]) el.classList.toggle('has', !!v);
  });
  layoutProg(); renderItems();
  const ts=tbdSet(rec); document.querySelectorAll('[data-tbd]').forEach(b=>{ const on=ts.has(b.dataset.tbd); b.checked=on; });
  // 현장 재결제는 결제링크일 때만 (현장 결제는 원래 현장에서 하므로 해당 없음)
  const os=document.getElementById('f_onsite');
  if(os){ const ok=rec.pay==='결제링크'; os.disabled=!ok; os.closest('.ckf').title = ok ? '' : '결제 방식이 결제링크일 때만 체크할 수 있습니다';
    if(!ok && rec.onsite){ rec.onsite=''; os.checked=false; } }
  const pc=document.getElementById('w_payContact'); if(pc) pc.hidden = rec.pay!=='미정';
  paintOpt();
}
// 접는 묶음: 값이 있으면 버튼·묶음을 초록으로, 버튼에 입력 내용 요약
function paintOpt(){
  if(window.__autoReady) saveViewSoon();   // 펼친 묶음도 기억
  Object.entries(OPT).forEach(([grp,o])=>{
    const keys=FIELDS.filter(f=>f[0]===grp && !isSub(f[1])).map(f=>f[1]);
    const filled=keys.filter(k=>rec[k]);
    const sum = o.id==='goods' ? goodsText(rec) : o.id==='mabang' ? mabangText(rec) : /^프로그램/.test(grp) ? progList(rec, grp, true).join(' · ') : filled.map(k=>{ const v=rec[k]; return `${FIELDS.find(f=>f[1]===k)[2]} ${/^\d+(\+\d+)*$/.test(v)?v+UNIT(k):v}`; }).join(' · ');
    const b=document.querySelector(`.opt-btn[data-opt="${o.id}"]`), box=document.getElementById('opt_'+o.id);
    if(!b||!box) return;
    b.classList.toggle('filled', filled.length>0);
    b.setAttribute('aria-expanded', optOpen.has(o.id)?'true':'false');
    document.getElementById('optsum_'+o.id).textContent = sum || '없음';
    b.title = sum || `${o.title} 입력 없음 · 누르면 펼침`;
    box.hidden = !optOpen.has(o.id);
    box.classList.toggle('filled', filled.length>0);
  });
}
function renderForm(changed=[]){
  const need=Math.max(1, nContactsOf(rec));
  if(need>nContacts){ nContacts=need; renderContacts(); }
  paintFields(changed);
  renderSide();
}
function dateLabel(d){ if(!d) return ''; const t=new Date(d+'T00:00'); return isNaN(t)?d:`${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]})`; }
const mdLabel = d => { const t=new Date(d+'T00:00'); return isNaN(t)?d:`${t.getMonth()+1}월 ${t.getDate()}일 (${DOW[t.getDay()]})`; };   // 날짜는 항상 끝에 (요일)
const dowTag = d => { const t=new Date(String(d||'')+'T00:00'); return isNaN(t) ? '' : `(${DOW[t.getDay()]})`; };
const dtLabel = s => { const d=new Date(s); if(!s||isNaN(d)) return ''; return `${d.getMonth()+1}/${d.getDate()}(${DOW[d.getDay()]}) ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };   // 시각: 11/12(목) 09:35
// 미정 항목 입력 기한: 미정 체크가 있을 때만 보이고, 기본값은 방문일 전주 목요일 (직접 바꾸면 그대로 둠)
let tbdAuto=false;
function prevWeekThu(d){ const t=new Date(d+'T00:00'); if(isNaN(t)) return ''; t.setDate(t.getDate()-((t.getDay()+6)%7)-4); return ymd(t); }
// 미정 항목 답변일 기본값 · 한도: 방문일 전주 목요일. 그 목요일이 이미 지났으면 방문일 전날 (그것도 지났으면 오늘)
function tbdLimit(d){ const thu=prevWeekThu(d), today=ymd(new Date()); if(!thu) return ''; if(thu>=today) return thu; const p=new Date(d+'T00:00'); p.setDate(p.getDate()-1); const pd=ymd(p); return pd>=today ? pd : today; }
const tbdLimitName = d => tbdLimit(d)===prevWeekThu(d) ? '방문일 전주 목요일' : '방문일 전날';
function applyTbdDefault(){
  const has=tbdSet(rec).size>0, w=document.getElementById('w_tbdDate');
  if(w) w.hidden=!has;
  if(!has || !rec.date || (rec.tbdDate && !tbdAuto)) return;
  const v=tbdLimit(rec.date);   // 전주 목요일, 이미 지났으면 방문일 전날
  if(v && rec.tbdDate!==v){ rec.tbdDate=v; tbdAuto=true; const el=document.getElementById('f_tbdDate'); if(el) el.value=v; }
}
function renderSide(){
  applyTbdDefault();
  if(typeof renderStage==='function') renderStage();
  const ts = tbdSet(rec), req = REQUIRED(), miss = req.filter(([k])=>!rec[k] && !ts.has(k));
  // 물어볼 것: 전부 보여 주고, 받은 항목은 초록색, 미정으로 체크한 항목은 노란색
  $('#missBox').innerHTML = `<ul class="chk miss">${req.map(([k,l,q])=>`<li class="${ts.has(k)||(k==='pay'&&rec.pay==='미정')?'tbd':rec[k]?'got':''}" title="${q}"><b>${l}</b></li>`).join('')}</ul>`
    + (miss.length ? '' : `<div class="done-all" style="margin-top:6px">필수 정보를 모두 받았습니다. 저장하세요.</div>`);
  if(window.__autoReady) scheduleWarn();   // 이상한 값이 새로 생기면 바로 팝업
  { const tt=$('#tbdTxt'); if(tt) tt.value = dateDisp(rec.tbdDate); }   // 답변일: 칸 안에 날짜 (요일)
  paintReadback();   // 고객님께 확인 멘트 (자동 · 직접 고침 · 말씀드림)
  renderInfo(curInfoKey);
  if(typeof renderPrice==='function' && window.__priceReady) renderPrice();
  if(window.__tasksReady) renderTasks();
  if(window.__autoReady) scheduleAuto();   // 고칠 때마다 자동 저장 타이머
  if(window.__autoReady) saveViewSoon();   // 새로고침해도 이 화면 그대로
}
// 결제 방식별로 끊기 전에 추가로 받거나 안내할 것
const PAY_GUIDE = {
  '세금계산서': ['세금계산서 발행을 위해 사업자등록증을 보내주시겠어요?', '세금계산서 받으실 이메일 주소가 어떻게 되실까요?', '세금계산서 발행일은 언제로 해 드릴까요?'],
  '결제링크':   ['결제링크 보내드리면 언제쯤 결제하실 수 있을까요?', '현장에서 법인카드로 다시 결제하실 계획도 있으실까요?'],
  '현장 결제':  ['현장 결제로 하시면 당일 인원 변경이 어려운 점 양해 부탁드립니다.', '인원은 언제까지 확정해 주실 수 있을까요?'],
};
function openPayGuide(pay){
  $('#pgTitle').textContent = `[${pay} 안내] 고객님께 말씀드리세요`;
  $('#pgBody').innerHTML = PAY_GUIDE[pay].map(g=>`<li>${esc(g)}</li>`).join('');
  $('#pgModal').hidden = false; setTimeout(()=>$('#pgOk').focus(), 0);
}
$('#pgOk').onclick = () => { $('#pgModal').hidden = true; };
$('#pgModal').addEventListener('click', e=>{ if(e.target.id==='pgModal') $('#pgModal').hidden = true; });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#pgModal').hidden){ e.preventDefault(); $('#pgModal').hidden = true; } });
// 프로그램 입력 내용: "요가 20명", "차방 대관 2시간" (grp 를 주면 그 묶음만)
// staff 를 주면 "동행 도슨트 2시간 (담당:사공유빈)" (차방 · 당두봉갈은 담당을 적었을 때만)
// staff 이면 도슨트 시간대 · 코스도: "동행 도슨트 2시간 13:00~15:00 (코스:정원 코스) (담당:사공유빈)"
const progList = (r, grp, staff) => FIELDS.filter(f=>(grp ? f[0]===grp : /^프로그램/.test(f[0])) && !isSub(f[1]) && r[f[1]]).map(f=>{ const v=String(r[f[1]]), sub=p=>String(r[`${p}_${f[1]}`]||'').trim(), who=sub('stf');
  const tag = !staff ? '' : (sub('tm') ? ` ${sub('tm')}` : '') + (sub('crs') ? ` (코스:${sub('crs')})` : '') + (who ? ` (담당:${who})` : needsStaff(f[1]) ? ' (담당:미정)' : '');
  return `${f[2]} ${/^\d+(\+\d+)*$/.test(v) ? v+UNIT(f[1]) : v}${tag}`; });
// 조사: 받침에 따라 (으)로 · 은/는 · 이고/고
const lastJong = s => { const c=String(s).trim().slice(-1).charCodeAt(0)-0xAC00; return c>=0 && c<11172 ? c%28 : (/[0-9]$/.test(s) ? ({0:1,1:8,3:1,6:1,7:8,8:8}[String(s).slice(-1)]||0) : 0); };   // 0 = 받침 없음, 8 = ㄹ
const ro  = s => { const j=lastJong(s); return !j || j===8 ? '로' : '으로'; };
const eun = s => lastJong(s) ? '은' : '는';
function readback(r){
  // 고객님께 읽어 드릴 확인 문장. 업체명은 <업체명>
  // 한 줄에 하나씩 "~ 맞으신가요?" 로 묻는다
  const S=[];
  const day = r.date ? (()=>{ const d=new Date(r.date+'T00:00'); return isNaN(d)?r.date:`${d.getMonth()+1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일`; })() : '';
  const org = r.org ? `<${r.org}>` : '';
  if(org && day) S.push(`${org} 단체로 ${day}에 방문하시는 거 맞으신가요?`); else if(org) S.push(`${org} 단체 예약 맞으신가요?`); else if(day) S.push(`${day}에 방문하시는 거 맞으신가요?`);
  if(r.tin){ const gate = r.gate && r.gate!=='미정' ? `${r.gate}${ro(r.gate)} ` : '';
    S.push(r.tout ? `${r.tin}에 ${gate}도착하셔서 ${r.tout}에 퇴장하실 예정 맞으신가요?` : `${r.tin}에 ${gate}도착하실 예정 맞으신가요?`); }
  const veh = !r.vehicle || r.vehicle==='미정' ? '' : (()=>{ const v=r.vehicle.replace(/^혼합 \((.+)\)$/,'$1').replace(/ \+ /g,', ').replace(/^승용$/,'승용차').replace(/승용 (\d)/g,'승용차 $1'); return `${v}${ro(v)} 오시는`; })();
  if(r.people) S.push(veh ? `인원은 총 ${r.people}명이고, ${veh} 거 맞으신가요?` : `인원은 총 ${r.people}명 맞으신가요?`);
  else if(veh) S.push(`${veh} 거 맞으신가요?`);
  if(r.pay==='현장 결제') S.push('결제는 현장 결제로 진행되며, 그러기에 인원 변경 어려우신 점 이해되셨을까요?');
  else if(r.pay==='미정') S.push(`결제 방법은 ${r.tbdDate?mdLabel(r.tbdDate)+'까지':'나중에'} 알려주시기로 하신 거 맞으신가요?`);
  else if(r.pay) S.push(`결제는 ${r.pay}${ro(r.pay)} 진행하시는 거 맞으신가요?`);
  // 미정 항목 답변일: 그때까지 말씀해 주신 인원(내용)으로 고정 (결제 방법은 위 줄에서)
  const tn = String(r.tbd||'').split(/\s*,\s*/).filter(x=>x && x!=='결제 방법');
  if(tn.length && r.tbdDate){ const t=tn.join(' · '); S.push(`아직 정해지지 않은 ${t}${eun(t)} ${mdLabel(r.tbdDate)}까지 말씀해 주시면, 말씀해 주신 ${tn.includes('관람 인원')?'인원':'내용'}으로 고정됩니다.`); }
  // 입장문은 미정 항목이 아님: 전날 전화로 안내
  if(!r.gate || r.gate==='미정') S.push('입장하실 문은 입장 전날 전화드리면서 안내드리겠습니다.');
  const cs=contactsOf(r), mails=cs.map(c=>c.email).filter(Boolean);
  const docs = [r.wantQuote&&'견적서', r.wantStmt&&'거래명세서'].filter(Boolean).join('와 ');
  if(docs) S.push(mails.length ? `${docs}는 ${mails.join(', ')}로 보내드리면 될까요?` : `${docs} 받으실 이메일 주소를 알려주시겠어요?`);
  if(!S.length || (!r.org && !r.date && !r.people)) return '내용이 채워지면 고객에게 읽어줄 확인 문구가 만들어집니다.';
  let s = `마지막으로 예약 확인하겠습니다.\n${S.join('\n')}\n\n저희가 입장 전날에 전화드리면서 다시 안내드리겠습니다. 감사합니다.`;   // 마지막 멘트는 항상 이것으로
  // 결제 방식 안내(PAY_GUIDE)는 결제를 고를 때 팝업
  // 특별 할인: 인원 · 할인율 · 지참할 증빙
  const sp = typeof SPECIAL!=='undefined' ? specialCounts(r) : [];
  if(sp.length) s += `\n\n[특별 할인 안내]\n` + sp.map(x=>`· ${x.name} ${x.n}명은 ${x.rate===1?'무료':Math.round(x.rate*100)+'% 할인'}입니다. 방문 당일 꼭 지참해 주세요: ${x.proof}`).join('\n')
    + `\n· 다른 할인과 겹치면 가장 큰 할인 하나만 적용되고, 증빙이 없으면 할인이 어렵습니다.`;
  return s;
}

// ===================== 그날 예약 현황 (식사·프로그램) =====================
const INFO_OF = k => isSub(k) ? null : OPT[GROUP_OF[k]]?.id || null;   // sadam · mabang · prog
let curInfoKey = null;
const numOf = v => { const s=String(v||'').trim(); return /^\d+(\s*\+\s*\d+)*\s*명?$/.test(s) ? s.match(/\d+/g).reduce((a,x)=>a+(+x),0) : 0; };   // 인원만 더함 (10:30 같은 시간은 제외)
function sameDay(){ return cache.filter(r=>r.date===rec.date && r.id!==editingId && r.callType!=="개인고객" && r.id!==MBDB_ID); }
// 관리자 사이트(admin.sayuwon.com) 사담·마방 현황: Apps Script 가 15분마다 가져와 둔 것
const ADMIN_SLOT = { sadam1:['L1','사담 런치1부'], sadam2:['L2','사담 런치2부'], sadamD:['D','사담 디너'], mabangL:['MB','마방 사유의 밥상'] };
const fmtAgo = s => { if(!s) return ''; const m=Math.round((Date.now()-new Date(s))/60000); return m<1?'방금':m<60?`${m}분 전`:`${Math.round(m/60)}시간 전`; };
function renderInfo(k){
  curInfoKey = k || null;
  document.querySelectorAll('#form .f.hot').forEach(w=>w.classList.remove('hot'));
  if(k) document.getElementById('w_'+k)?.classList.add('hot');
  Object.values(OPT).map(o=>o.id).forEach(box=>{
    const el=document.getElementById('info_'+box); if(!el) return;
    if(!rec.date){ el.innerHTML='<span class="none">방문일을 넣으면 그날 예약 현황이 여기에 보입니다.</span>'; return; }
    const day=sameDay(); const keys=FIELDS.filter(f=>INFO_OF(f[1])===box && !MB_INFO_SKIP.has(f[1])).map(f=>f[1]);
    if(k && INFO_OF(k)===box && !MB_INFO_SKIP.has(k)){
      const hits=day.filter(r=>r[k]);
      const tot=hits.reduce((s,r)=>s+numOf(r[k]),0);
      el.innerHTML = `<b>${dateLabel(rec.date)} ${LABEL[k]}</b> · ${hits.length? `이미 ${hits.length}건${tot?`, ${tot}${UNIT(k)}`:''}` : '<span class="none">다른 예약 없음</span>'}`
        + (hits.length? `<ul>${hits.map(r=>`<li>${esc(r.org||r.contact||'(업체 미정)')} · ${esc(r[k])}${/^\d+$/.test(r[k])?UNIT(k):''}${r.owner?` · ${esc(r.owner)}`:''}</li>`).join('')}</ul>` : '')
        ;
    } else {
      const parts=keys.map(key=>{ const hits=day.filter(r=>r[key]); if(!hits.length) return ''; const tot=hits.reduce((s,r)=>s+numOf(r[key]),0); return `${LABEL[key]} ${hits.length}건${tot?`(${tot}${UNIT(key)})`:''}`; }).filter(Boolean);
      el.innerHTML = `<b>${dateLabel(rec.date)} ${Object.values(OPT).find(o=>o.id===box).title} 예약 현황</b> · ` + (parts.length? esc(parts.join(' · ')) : '<span class="none">다른 예약 없음</span>') + ' <span class="none">(칸에 커서를 두면 업체별로 보입니다)</span>';
    }
  });
  renderDayAll();
}

// ===================== 예약 현황 (방문일 하루): 단체 · 몽몽마방 · 사담 =====================
// 단체 = 이 시스템의 다른 단체 예약 · 몽몽마방 = '몽몽마방 예약 목록'(NAS 엑셀 몽몽마방 예약 탭을 붙여 넣은 것) · 사담 = 예약 전산에서 확인
// 몽몽마방 예약 목록은 공유 기록(구글 시트)에 한 줄(id mabangdb, 통화 구분 '몽몽마방예약')로 저장: 수정 기록 칸에 {rows:[{d,t,n,p,m}], at, by}
var MBDB_ID='mabangdb', MBDB_TYPE='몽몽마방예약';   // var: sameDay가 먼저 불려도 되게
function mbDb(){ const r=cache.find(x=>x.id===MBDB_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return { rows:Array.isArray(j.rows)?j.rows:[], at:j.at||'', by:j.by||'' }; }
const mbDbOn = d => mbDb().rows.filter(x=>x.d===d).sort((a,b)=>String(a.t).localeCompare(String(b.t)));
// 대관 · 도슨트 · 프로그램 현황: 예약접수가 된 단체 예약에서 자동으로 (저장된 예약 + 지금 화면의 예약)
//  대관 = 차방 대관(몽몽차방) · 당두봉갈 대관 / 도슨트 = 동행 도슨트(동행) · 세미나 도슨트(PPT) · 이름에 도슨트가 들어간 추가 프로그램 / 프로그램 = 그 밖의 개별 · 시간 프로그램
const RENT_PLACE = { chabang:'몽몽차방', dangdu:'당두봉갈' }, DOCENT_KIND = { donghaeng:'동행', seminar:'PPT' };
const bookCat = k => RENT_PLACE[k] ? 'rent' : (DOCENT_KIND[k] || isDocent(LABEL[k])) ? 'docent' : 'prog';
const BOOK_CATS = { rent:'대관', docent:'도슨트', prog:'프로그램' };
function bookRows(){ try{ return bookRows0(); }catch(_){ return []; } }   // 초기화 중(아래 정의 전)에 불려도 되게
function bookRows0(){
  const out=[];   // 지금 화면의 예약(내 단체)은 빼고 다른 단체 예약만
  const recs = (cache||[]).filter(r=>isGroupRec(r) && r.id!==editingId && r.date && stageOfRec(r)==='예약접수').map(r=>({r, x:xOf(r)}));
  recs.forEach(({r,x,me})=>{
    const notes = Object.fromEntries(String(x.inotes||'').split(/\s*;\s*/).map(s=>{ const i=s.indexOf('='); return i>0 ? [s.slice(0,i).trim(), s.slice(i+1).trim()] : null; }).filter(Boolean));
    PROG_KEYS().forEach(k=>{ const v=x[k]; if(!v) return; const cat=bookCat(k), unit=UNIT(k);
      out.push({ cat, id:r.id, me:!!me, d:x.date, org:x.org||x.contact||'(업체 미정)',
        ppl: cat==='prog' && unit!=='시간' ? (numOf(v)||numOf(x.people)) : numOf(x.people),
        hrs: unit==='시간' ? (numOf(v)||1) : 0, place:RENT_PLACE[k]||'', kind:DOCENT_KIND[k]||(cat==='docent'?LABEL[k]:''), item:LABEL[k]||k,
        tm:x['tm_'+k]||'', staff:String(x['stf_'+k]||'').trim()||x.owner||'', note:[notes[k], x['crs_'+k]&&`코스 ${x['crs_'+k]}`].filter(Boolean).join(' · ') }); });
  });
  return out.sort((a,b)=>(a.d+(a.tm||'99')).localeCompare(b.d+(b.tm||'99')));
}
function renderDayAll(){
  const el=$('#dayAll'); if(!el) return;
  // 예약 현황 = 버튼 4개 (몽몽마방 · 대관 · 도슨트 · 프로그램). 누르면 예약 목록 창이 그 구분 탭으로. 방문일이 있으면 그날 건수
  const d=rec.date, rows = d ? [...bookRows(), ...manualRows()].filter(x=>x.d===d) : [], n = c => !d ? 0 : c==='mb' ? mbDbOn(d).length : rows.filter(x=>x.cat===c).length;
  el.innerHTML = `<div class="da-btns">${[['mb','몽몽마방'], ...Object.entries(BOOK_CATS)].map(([c,t])=>`<button type="button" class="da-btn" data-book="${c}" title="${t} 예약 목록${d?` (${dateLabel(d)} ${n(c)}건)`:''}">${t}${n(c)?` <b>${n(c)}</b>`:''}</button>`).join('')}</div>`
    + `<div class="none da-note">${d ? `숫자 = ${dateLabel(d)} 예약 건수 · ` : ''}사담은 예약 전산에서 확인하세요.</div>`;
}
// ===================== 삭제된 단체 예약 (Apps Script 'deleted', 보기 전용) =====================
let trashItems=null, trashErr='';
const delInfo = r => { const h=parseHist(r).h, e=[...h].reverse().find(x=>/^\[삭제\]/.test(x.what||'')); return { by:e?e.by:'', why:e?String(e.what).replace(/^\[삭제\]\s*/,''):'(사유 기록 없음)' }; };
function paintTrash(){
  const q=$('#trashSearch').value.trim().replace(/\s/g,'').toLowerCase(), qd=q.replace(/\D/g,'');
  if(trashItems==null){ $('#trashBody').innerHTML=`<tr><td colspan="8" class="empty">${trashErr ? esc(trashErr) : '불러오는 중…'}</td></tr>`; $('#trashSum').textContent=''; return; }
  const all=trashItems.filter(r=>isGroupRec(r) && r.id!==MBDB_ID).map(r=>({r, ...delInfo(r)})).sort((a,b)=>String(b.r.deleted).localeCompare(String(a.r.deleted)));
  const list=all.filter(o=>!q || [o.r.org, contactCell(o.r).replace(/<[^>]+>/g,''), o.why, o.by, ownerOf(o.r)].join(' ').replace(/\s/g,'').toLowerCase().includes(q) || (qd.length>=3 && JSON.stringify(o.r).replace(/\D/g,'').includes(qd)));
  $('#trashSum').textContent = `${all.length}건${q?` · 찾은 ${list.length}건`:''}`;
  $('#trashBody').innerHTML = list.map(o=>`<tr><td>${esc(fmt(o.r.deleted))}</td><td>${esc(o.by)}</td><td class="note">${esc(o.why)}</td><td>${esc(dateLabel(o.r.date)||'')}</td><td><b>${esc(o.r.org||'(업체 미정)')}</b></td><td>${contactCell(o.r)}</td><td class="num">${esc(o.r.people||'')}</td><td class="owner">${esc(ownerOf(o.r)||'')}</td></tr>`).join('')
    || `<tr><td colspan="8" class="empty">${q?'찾은 예약이 없습니다.':'삭제된 단체 예약이 없습니다.'}</td></tr>`;
}
async function openTrash(){ $('#trashModal').hidden=false; $('#trashSearch').value=''; trashItems=null; trashErr=''; paintTrash();
  try{ const j=await callApi({action:'deleted'}); trashItems=j.items||[]; }
  catch(e){ trashErr = e.code==='bad_action' ? 'Apps Script를 새 버전으로 배포해야 삭제된 예약이 보입니다 (apps-script/group-intake.gs 의 deleted).' : '불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.'; }
  paintTrash(); }
$('#trashBtn').onclick=openTrash;
$('#trashClose').onclick=()=>{ $('#trashModal').hidden=true; };
$('#trashSearch').addEventListener('input', paintTrash);
$('#trashModal').addEventListener('mousedown', e=>{ if(e.target.id==='trashModal') $('#trashModal').hidden=true; });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#trashModal').hidden){ e.preventDefault(); e.stopImmediatePropagation(); $('#trashModal').hidden=true; } }, true);
// ===================== 예약 목록 창: 몽몽마방 · 대관 · 도슨트 · 프로그램 =====================
// 대관 · 도슨트 · 프로그램 = 예약접수된 단체 예약에서 자동 + 직접 넣은 예약 / 몽몽마방 = 직접 넣은 예약 (엑셀 붙여넣기는 없앰 · 2026-11-14)
// 직접 넣은 대관 · 도슨트 · 프로그램은 공유 기록 한 줄(id bookdb, 통화 구분 '예약현황추가') 수정 기록 칸에 {rows:[{id,cat,d,org,ppl,tm,place,kind,item,staff,note}], at, by}
var BKDB_ID='bookdb', BKDB_TYPE='예약현황추가';
function bkDb(){ const r=cache.find(x=>x.id===BKDB_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return { rows:Array.isArray(j.rows)?j.rows:[], at:j.at||'', by:j.by||'' }; }
async function bkDbSave(rows, msg){
  const old=cache.find(x=>x.id===BKDB_ID), now=new Date().toISOString(), keep=ymd(new Date(Date.now()-180*864e5));
  rows=rows.filter(x=>x.d>=keep);   // 180일 지난 것은 정리
  const item={...(old||{}), id:BKDB_ID, callType:BKDB_TYPE, saved:now, takenBy:savedOwner()||'', summary:`예약 현황 직접 추가 ${rows.length}건`, history:JSON.stringify({rows, at:now, by:savedOwner()||''})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===BKDB_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
  if(!$('#bookModal').hidden) paintBook(); renderDayAll(); toast(msg);
}
let bookCatNow='rent', bookEdit=null;   // bookEdit: 고치는 줄 (몽몽마방은 {mb:번호}, 그 밖은 {id})
const BOOK_COLS = { rent:['일자','업체','인원','장소 · 시간','담당자 이름','비고사항',''], docent:['일자','업체','인원','시간','종류','담당자 이름','비고사항',''], prog:['일자','업체','인원','프로그램 항목','담당자 이름','비고사항',''] };
function manualRows(){ try{ return bkDb().rows.map(x=>({...x, manual:true, ppl:+x.ppl||0})); }catch(_){ return []; } }   // 직접 넣은 대관 · 도슨트 · 프로그램
function paintBook(){
  document.querySelectorAll('#bookTabs [data-bt]').forEach(b=>b.classList.toggle('on', b.dataset.bt===bookCatNow));
  const isMb = bookCatNow==='mb'; $('#bookMb').hidden=!isMb; $('#bookGen').hidden=isMb;
  paintBookAdd();
  if(isMb){ paintMbDb(); $('#bookTitle').textContent='몽몽마방 예약 목록'; $('#bookSum').textContent = $('#mbdbSum').textContent; return; }
  const c=bookCatNow, today=todayYmd(), past=$('#bookPast').checked;
  const all=[...bookRows(), ...manualRows()].filter(x=>x.cat===c).sort((a,b)=>(a.d+(a.tm||'99')).localeCompare(b.d+(b.tm||'99'))), list=all.filter(x=>past || x.d>=today);
  $('#bookTitle').textContent = `${BOOK_CATS[c]} 예약 목록`; $('#bookSum').textContent = `${list.length}건 · 단체 예약(예약접수)에서 자동 + 직접 추가`;
  $('#bookHead').innerHTML = `<tr>${BOOK_COLS[c].map(h=>`<th>${h}</th>`).join('')}</tr>`;
  const cell = x => c==='rent' ? [[x.place||'(장소 미정)', x.tm].filter(Boolean).join(' · ')+(x.hrs?` (${x.hrs}시간)`:'')] : c==='docent' ? [x.tm||'(미정)', (x.kind||'')+(x.hrs?` · ${x.hrs}시간`:'')] : [[x.item, x.tm].filter(Boolean).join(' · ')];
  $('#bookBody').innerHTML = list.map(x=>`<tr class="r${x.d<today?' past':''}${rec.date && x.d===rec.date?' same':''}"${x.manual?'':` data-bopen="${esc(x.id)}"`}><td>${esc(dateLabel(x.d))}</td><td><b>${esc(x.org)}</b></td><td class="num">${x.ppl?x.ppl+'명':''}</td>${cell(x).map(v=>`<td>${esc(v)}</td>`).join('')}<td style="white-space:pre-line">${esc(x.staff)}</td><td class="note">${esc(x.note)}</td>`
    + `<td class="acts">${x.manual ? `<button type="button" class="btn sm" data-bkedit="${esc(x.id)}">수정</button><button type="button" class="del" data-bkdel="${esc(x.id)}" title="빼기">×</button>` : '<span class="tag" title="단체 예약에서 자동 · 줄을 누르면 그 예약">단체예약</span>'}</td></tr>`).join('')
    || `<tr><td colspan="${BOOK_COLS[c].length}" class="empty">${all.length?'앞으로 있을 예약이 없습니다.':BOOK_CATS[c]+' 예약이 없습니다. 아래에서 직접 추가하세요.'}</td></tr>`;
}
// 직접 추가 · 수정 칸 (탭마다 칸이 다름)
const PLACE_OPTS=['몽몽차방','당두봉갈'], KIND_OPTS=['동행','PPT'];
function paintBookAdd(){
  const c=bookCatNow, box=$('#bookAdd'); if(!box) return;
  let x = {};
  if(bookEdit && bookEdit.mb!=null){ const r=mbDb().rows[bookEdit.mb]; if(r) x={d:r.d, tm:r.t, org:r.n, ppl:r.p, item:r.m}; }
  else if(bookEdit && bookEdit.id) x = bkDb().rows.find(r=>r.id===bookEdit.id) || {};
  const inp=(id,ph,v,cls='')=>`<input id="${id}" class="${cls}" placeholder="${ph}" value="${esc(v==null?'':v)}" autocomplete="off"${/Org|Staff|Note|Item/.test(id)?' data-ime="ko"':''}>`;
  const sel=(id,opts,v)=>`<select id="${id}">${opts.map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('')}${v && !opts.includes(v)?`<option selected>${esc(v)}</option>`:''}</select>`;
  const f = c==='mb'
    ? [`<label>시간 ${inp('baTm','12:00~13:00',x.tm,'t')}</label>`, `<label>예약자 · 업체 ${inp('baOrg','예) 도레이첨단소재',x.org)}</label>`, `<label>인원 ${inp('baPpl','명',x.ppl,'n')}</label>`, `<label>메뉴 ${sel('baItem', mbMenus().map(m=>m.name), x.item||'')}</label>`]
    : [`<label>업체 ${inp('baOrg','예) 도레이첨단소재',x.org)}</label>`, `<label>인원 ${inp('baPpl','명',x.ppl,'n')}</label>`, `<label>시간 ${inp('baTm','13:00~14:00',x.tm,'t')}</label>`,
       c==='rent' ? `<label>장소 ${sel('baPlace', PLACE_OPTS, x.place||'')}</label>` : c==='docent' ? `<label>종류 ${sel('baKind', KIND_OPTS, x.kind||'')}</label>` : `<label>프로그램 항목 ${inp('baItem','예) 요가',x.item)}</label>`,
       `<label>담당자 이름 ${inp('baStaff','예) 김선영 팀장',x.staff)}</label>`, `<label class="wide">비고사항 ${inp('baNote','예) 앵당삼거리 시작',x.note)}</label>`];
  box.innerHTML = `<div class="ba-h"><b>${bookEdit?'예약 고치기':'＋ 직접 추가'}</b> <span class="hint" style="margin:0">${c==='mb'?'몽몽마방':BOOK_CATS[c]} 예약 한 건</span></div>`
    + `<div class="ba-row"><label>날짜 ${dboxHTML('id="baDate"', x.d||rec.date||'')}</label>${f.join('')}`
    + `<span class="ba-btns">${bookEdit?'<button type="button" class="btn" id="baCancel">취소</button>':''}<button type="button" class="btn primary" id="baSave">${bookEdit?'고치기':'추가'}</button></span></div>`
    + (c!=='mb' && !bookEdit ? `<details class="ba-imp"><summary class="hint">엑셀 표를 한 번에 넣기 (대관 · 도슨트 · 프로그램 표)</summary><p class="hint" style="margin:4px 0">엑셀에서 줄을 복사해 붙여 넣으세요. 열 순서: 일자 · 업체 · 인원 · 동행 도슨트 시간 · PPT 도슨트 시간 · 대관 시간 · … · 담당 · 비고. 시간이 있는 칸마다 한 건씩 들어갑니다 (대관 장소는 넣은 뒤 「수정」에서).</p><textarea id="baImp" placeholder="여기에 붙여 넣기"></textarea><div id="baImpPrev" class="mb-prev"></div><div class="row-btns" style="justify-content:flex-end"><button type="button" class="btn primary" id="baImpSave" disabled>모두 넣기</button></div></details>` : '');
}
async function bookAddSave(){
  const c=bookCatNow, v=id=>(($('#'+id)||{}).value||'').trim(), d=v('baDate'), org=v('baOrg'), ppl=parseInt(v('baPpl'))||0;
  if(!d){ toast('날짜를 고르세요.'); return false; } if(!org){ toast(c==='mb'?'예약자 · 업체를 적어 주세요.':'업체를 적어 주세요.'); $('#baOrg').focus(); return false; }
  const tm=(()=>{ const s=v('baTm'); const f=typeof fmtRange==='function' ? fmtRange(s) : ''; return f || s; })();
  if(c==='mb'){ if(!ppl){ toast('인원을 적어 주세요.'); $('#baPpl').focus(); return false; }
    const row={d, t:tm, n:org, p:ppl, m:v('baItem')}, rows=[...mbDb().rows];
    if(bookEdit && bookEdit.mb!=null) rows[bookEdit.mb]=row; else rows.push(row);
    const ed=!!bookEdit; bookEdit=null; await mbDbSave(rows, ed?'몽몽마방 예약을 고쳤습니다.':'몽몽마방 예약을 추가했습니다.'); return true; }
  const row={ id: (bookEdit&&bookEdit.id) || 'b'+Date.now().toString(36), cat:c, d, org, ppl, tm, place:c==='rent'?v('baPlace'):'', kind:c==='docent'?v('baKind'):'', item:c==='prog'?v('baItem'):'', staff:v('baStaff'), note:v('baNote'), by:savedOwner()||'' };
  const rows=bkDb().rows.filter(r=>r.id!==row.id); rows.push(row);
  const ed=!!bookEdit; bookEdit=null; await bkDbSave(rows, ed?'예약을 고쳤습니다.':`${BOOK_CATS[c]} 예약을 추가했습니다.`); return true;
}
// 엑셀 표 한 번에 넣기: 일자 · 업체 · 인원 · 동행 시간 · PPT 시간 · 대관 시간 · … · 담당 · 비고 (따옴표로 묶인 칸 안 줄바꿈도)
function tsvRows(text){ const rows=[]; let row=[], cell='', q=false; const s=String(text||'').replace(/\r/g,'');
  for(let i=0;i<s.length;i++){ const ch=s[i];
    if(q){ if(ch==='"'){ if(s[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=ch; continue; }
    if(ch==='"' && cell.trim()===''){ q=true; cell=''; continue; }
    if(ch==='\t'){ row.push(cell); cell=''; } else if(ch==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; } else cell+=ch; }
  row.push(cell); rows.push(row); return rows.map(r=>r.map(c=>c.trim())).filter(r=>r.some(Boolean)); }
let bookImp=null;
function bookImpParse(text){ const out=[], skipped=[]; const p2=n=>String(n).padStart(2,'0');
  tsvRows(text).forEach(cells0=>{ const cells = cells0[0]==='' ? cells0.slice(1) : cells0;
    const dm=String(cells[0]||'').match(/(\d{1,2})\s*[\/.월]\s*(\d{1,2})/); if(!dm){ skipped.push(cells.join(' ')); return; }
    const d=`${mbYear(+dm[1],+dm[2])}-${p2(dm[1])}-${p2(dm[2])}`, org=cells[1]||'', ppl=parseInt(cells[2])||0;
    const tail=cells.slice(3), note=tail.length ? tail[tail.length-1] : '', staff=tail.length>1 ? tail[tail.length-2].replace(/\s*\n\s*/g,'\n') : '';
    const t=i=>{ const s=tail[i]||''; return /\d{1,2}\s*:\s*\d{2}/.test(s) ? ((typeof fmtRange==='function' && fmtRange(s)) || s.replace(/\s/g,'')) : ''; };
    const base={d, org, ppl, staff, note, by:savedOwner()||''}, n0=out.length;
    if(t(0)) out.push({...base, cat:'docent', kind:'동행', tm:t(0)});
    if(t(1)) out.push({...base, cat:'docent', kind:'PPT', tm:t(1)});
    if(t(2)) out.push({...base, cat:'rent', place:'', tm:t(2)});
    if(out.length===n0) out.push({...base, cat:'prog', item:note, tm:''});
  });
  out.forEach((x,i)=>{ x.id='b'+Date.now().toString(36)+i; });
  return {rows:out, skipped};
}
document.addEventListener('input', e=>{ if(e.target.id!=='baImp') return; bookImp = e.target.value.trim() ? bookImpParse(e.target.value) : null;
  $('#baImpPrev').innerHTML = !bookImp ? '' : bookImp.rows.length ? `<b>${bookImp.rows.length}건</b><ul>${bookImp.rows.map(x=>`<li>${esc(dateLabel(x.d))} · ${esc(BOOK_CATS[x.cat])}${x.kind?' '+esc(x.kind):''} ${esc(x.tm||'')} · <b>${esc(x.org)}</b> · ${x.ppl}명${x.staff?' · '+esc(x.staff.replace(/\n/g,', ')):''}${x.note?' · '+esc(x.note):''}</li>`).join('')}</ul>${bookImp.skipped.length?`<div class="hint">읽지 못한 줄 ${bookImp.skipped.length}개</div>`:''}` : '<b class="late">읽은 줄이 없습니다.</b>';
  $('#baImpSave').disabled = !(bookImp && bookImp.rows.length); });
document.addEventListener('click', async e=>{ const t=e.target;
  if(t.id==='baSave'){ t.disabled=true; const ok=await bookAddSave(); if(!ok) t.disabled=false; return; }
  if(t.id==='baCancel'){ bookEdit=null; paintBookAdd(); return; }
  if(t.id==='baImpSave' && bookImp){ const key=x=>[x.cat,x.d,x.org,x.tm,x.kind].join('|'), have=new Set(bkDb().rows.map(key)), add=bookImp.rows.filter(x=>!have.has(key(x)));
    bookImp=null; await bkDbSave([...bkDb().rows, ...add], `${add.length}건을 넣었습니다.${add.length?'':' (이미 있는 예약)'}`); return; }
  if(t.dataset.bkedit){ bookEdit={id:t.dataset.bkedit}; paintBookAdd(); $('#bookAdd').scrollIntoView({block:'nearest'}); return; }
  if(t.dataset.bkdel){ const r=bkDb().rows.find(x=>x.id===t.dataset.bkdel); if(!r || !confirm(`${dateLabel(r.d)} ${r.org} ${BOOK_CATS[r.cat]} 예약을 목록에서 뺄까요?`)) return; await bkDbSave(bkDb().rows.filter(x=>x.id!==r.id), '예약을 목록에서 뺐습니다.'); return; }
  if(t.dataset.mbedit!=null){ bookEdit={mb:+t.dataset.mbedit}; paintBookAdd(); $('#bookAdd').scrollIntoView({block:'nearest'}); return; }
});
function openBook(c){ bookCatNow=c; bookEdit=null; bookImp=null; $('#bookModal').hidden=false; paintBook(); }
document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('[data-book]'); if(b) openBook(b.dataset.book); const t=e.target.closest && e.target.closest('#bookTabs [data-bt]'); if(t){ bookCatNow=t.dataset.bt; bookEdit=null; paintBook(); } });
$('#bookClose').onclick=()=>{ $('#bookModal').hidden=true; };
$('#bookPast').onchange=paintBook;
$('#bookModal').addEventListener('mousedown', e=>{ if(e.target.id==='bookModal') $('#bookModal').hidden=true; });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#bookModal').hidden){ e.preventDefault(); $('#bookModal').hidden=true; } });
$('#bookBody').addEventListener('click', e=>{ if(e.target.closest('button')) return; const tr=e.target.closest('tr[data-bopen]'); if(!tr || !tr.dataset.bopen) return; const r=cache.find(x=>x.id===tr.dataset.bopen); if(!r) return; $('#bookModal').hidden=true; openRecordG(r); });

// 몽몽마방 예약 목록 (직접 추가 · 수정 · 빼기)
function mbYear(m,d){ const t=new Date(); t.setHours(0,0,0,0); let y=t.getFullYear(); const c=new Date(y,m-1,d); if(c-t < -120*864e5) y++; else if(c-t > 245*864e5) y--; return y; }   // 연도가 없으면 오늘에 가까운 쪽
function paintMbDb(){
  const db=mbDb(), today=todayYmd(), past=$('#bookPast').checked;   // 지난 예약도 보기 (예약 목록 창 공통)
  const list=db.rows.map((x,i)=>({...x, i})).filter(x=>past || x.d>=today).sort((a,b)=>(a.d+a.t).localeCompare(b.d+b.t));
  $('#mbdbSum').textContent = db.rows.length ? `${db.rows.length}건${db.at?` · 마지막 저장 ${dtLabel(db.at)}${db.by?` (${db.by})`:''}`:''}` : '아직 없음';
  $('#mbdbBody').innerHTML = list.map(x=>`<tr class="${x.d<today?'past':''}${rec.date && x.d===rec.date?' same':''}"><td>${esc(dateLabel(x.d))}</td><td>${esc(x.t||'')}</td><td><b>${esc(x.n)}</b></td><td class="num">${esc(x.p)}명</td><td>${esc(x.m||'')}</td><td class="acts"><button type="button" class="btn sm" data-mbedit="${x.i}">수정</button><button type="button" class="del" data-mbdel="${x.i}" title="이 예약 빼기">×</button></td></tr>`).join('')
    || `<tr><td colspan="6" class="empty">${db.rows.length?'앞으로 있을 몽몽마방 예약이 없습니다.':'아래에서 몽몽마방 예약을 추가하세요.'}</td></tr>`;
}
async function mbDbSave(rows, msg){
  const old=cache.find(x=>x.id===MBDB_ID), now=new Date().toISOString(), keep=ymd(new Date(Date.now()-90*864e5));
  rows=rows.filter(x=>x.d>=keep).sort((a,b)=>(a.d+a.t).localeCompare(b.d+b.t));   // 90일 지난 것은 정리
  const item={...(old||{}), id:MBDB_ID, callType:MBDB_TYPE, saved:now, takenBy:savedOwner()||'', summary:`몽몽마방 예약 목록 ${rows.length}건`, history:JSON.stringify({rows, at:now, by:savedOwner()||''})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===MBDB_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
  if(!$('#bookModal').hidden) paintBook(); renderDayAll(); toast(msg);
}
function openMbDb(){ openBook('mb'); }   // 몽몽마방 예약 목록 = 예약 목록 창의 '몽몽마방' 탭
$('#mbdbBody').addEventListener('click', e=>{ const i=e.target.dataset.mbdel; if(i==null) return; const r=mbDb().rows[+i]; if(!r) return;
  if(!confirm(`${dateLabel(r.d)} ${r.t} ${r.n} 몽몽마방 예약을 목록에서 뺄까요?`)) return;
  mbDbSave(mbDb().rows.filter((_,k)=>k!==+i), '몽몽마방 예약을 목록에서 뺐습니다.'); });

// 확인할 것(팝업): 입력된 값끼리 맞지 않거나, 관리자 사이트 기준 자리가 모자랄 때
function fieldWarnings(r){
  const w=[];
  if(r.date){ const d=new Date(r.date+'T00:00'), t=new Date(); t.setHours(0,0,0,0); if(d<t) w.push({field:'date', reason:'지난 날짜입니다. 방문일을 다시 확인하세요.'}); }
  if(r.tin && !fmtTime(r.tin)) w.push({field:'tin', reason:'입장 시각을 24시간으로 적어 주세요 (예: 13:30).'});
  if(r.tout && !fmtTime(r.tout)) w.push({field:'tout', reason:'퇴장 시각을 24시간으로 적어 주세요 (예: 17:00).'});
  if(r.tin && r.tout && fmtTime(r.tin) && fmtTime(r.tout) && fmtTime(r.tout)<=fmtTime(r.tin)) w.push({field:'tout', reason:'퇴장 시각이 입장보다 빠릅니다. 24시간 표시인지 확인하세요 (오후 3시 = 15:00).'});
  if(r.date && r.tbdDate && r.tbdDate>r.date) w.push({field:'tbdDate', reason:'미정 항목 답변일이 방문일보다 늦습니다.'});
  else if(r.tbd && r.date && r.tbdDate && r.tbdDate>tbdLimit(r.date)) w.push({field:'tbdDate', reason: r.tbdLate ? `${tbdLimitName(r.date)}보다 늦음 · 사유: ${r.tbdLate}` : `미정 항목 답변일은 ${tbdLimitName(r.date)}(${mdLabel(tbdLimit(r.date))})까지입니다. 늦추려면 사유를 적어야 합니다.`});
  if(typeof SPECIAL!=='undefined') specialCounts(r).forEach(s=>w.push({field:s.k, reason:`${s.n}명 ${s.name} 할인 → 방문 때 ${s.proof} 지참을 안내하세요.`}));
  const day = adminData && adminData.days && adminData.days[r.date];
  if(day) Object.entries(ADMIN_SLOT).forEach(([k,[slot,name]])=>{
    const s=day[slot], want=numOf(r[k]); if(!s || !want) return;
    const left = s.max!=null && s.cur!=null ? s.max-s.cur : null;
    if(s.close) w.push({field:k, reason:`관리자 사이트에서 ${name}이(가) 마감입니다. 다른 시간을 안내하세요.`});
    else if(left!=null && want>left) w.push({field:k, reason:`${name} 남은 자리는 ${left}명인데 ${want}명입니다.`});
  });
  return w;
}

// 이상한 값이 새로 생기면 (입력을 멈추고 1.2초 뒤) 바로 팝업. 한 번 보여 준 것은 이 예약을 여는 동안 다시 띄우지 않음
let warnSeen=new Set(), warnT=null;
const warnKey = w => w.field+'|'+w.reason;
function scheduleWarn(){ clearTimeout(warnT); warnT=setTimeout(checkWarn, 1200); }
function checkWarn(){
  if(!window.__autoReady || restoring) return;
  const fresh=fieldWarnings(rec).filter(w=>!warnSeen.has(warnKey(w)));
  if(!fresh.length) return;
  if([...document.querySelectorAll('.modal')].some(m=>!m.hidden)){ scheduleWarn(); return; }   // 다른 팝업이 떠 있으면 닫힌 뒤에
  fresh.forEach(w=>warnSeen.add(warnKey(w)));
  $('#warnList').innerHTML = fresh.map(w=>`<li><b>${esc(LABEL[w.field]||w.field)}</b>${rec[w.field]?` ${esc(rec[w.field])}`:''} · ${esc(w.reason)}</li>`).join('');
  $('#warnModal').hidden=false; setTimeout(()=>$('#warnOk').focus(),0);
}
const resetWarn = (seed) => { warnSeen=new Set(seed ? fieldWarnings(rec).map(warnKey) : []); clearTimeout(warnT); };   // 저장된 예약을 열 때는 원래 있던 것은 띄우지 않음
$('#warnOk').onclick=()=>{ $('#warnModal').hidden=true; };
$('#warnModal').addEventListener('click', e=>{ if(e.target.id==='warnModal') $('#warnModal').hidden=true; });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#warnModal').hidden){ e.preventDefault(); $('#warnModal').hidden=true; } });

function autoSummary(){ return ['단체', rec.org, rec.people&&`${rec.people}명`, rec.date&&dateLabel(rec.date), rec.meal&&rec.meal!=='없음'&&`식사 ${rec.meal}`].filter(Boolean).join(' · '); }

// ===================== 통화 메모 (특이사항만 적어 두는 칸 · 예약 칸을 채우지 않음) =====================
$('#memoBox').addEventListener('input', ()=>startTimer());
function status(s){ $('#status').textContent=s; }

// 통화 시간
let timerInt=null;
function startTimer(){ if(startedAt) return; startedAt=new Date(); }   // 통화 시작 시각만 기억 (화면에 통화 시간은 보이지 않음)
function tick(){ $('#timer').textContent=''; }   // 통화 시간 표시는 없앰 (칸은 헤더 간격용으로 비워 둠)

// ===================== 복사 =====================
function toast(s){ const t=$('#toast'); t.textContent=s; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),1800); }
async function copy(text,msg){ try{ await navigator.clipboard.writeText(text); }catch(_){ const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } toast(msg); }
// 카카오톡 보고용: 기록된 예약 정보를 모두
function reportText(r){
  const cnt = v => /^\d+(\+\d+)*$/.test(String(v)) ? `${v}명` : v;
  const grpLine = g => FIELDS.filter(f=>f[0]===g && r[f[1]]).map(f=>`${f[2]} ${cnt(r[f[1]])}`).join(', ');
  const L=[`[단체예약 보고] ${r.org||'(단체명 미정)'}`, ''];
  const add=(k,v)=>{ if(v) L.push(`- ${k}: ${v}`); };
  const st=effStage(r), erpT=tasks.find(t=>t.id==='erp');
  add('예약 단계', st + (st!=='예약상담' ? (r.erp ? ' (전산 등록 완료)' : ' (전산 미등록)') : ''));
  add('방문일', r.date ? `${dateLabel(r.date)}` : '');
  add('인원', [r.people && cnt(r.people), r.pchg && '인원 변경 가능성 있음'].filter(Boolean).join(' · '));
  add('입장', [r.tin, r.gate].filter(Boolean).join(' ') + (r.tout ? ` ~ 퇴장 ${r.tout}` : ''));
  add('차량', r.vehicle);
  contactsOf(r).forEach((c,i)=>add(`담당자${i?i+1:''}`, [c.name,c.phone,c.email].filter(Boolean).join(' / ')));
  add('사담 식사', grpLine('사담'));
  add('몽몽마방 식사', mabangText(r));
  add('굿즈 구매', goodsText(r));
  add('프로그램(개별)', progList(r,'프로그램(개별)',true).join(', '));
  add('프로그램(시간)', progList(r,'프로그램(시간)',true).join(', '));
  add('기타 프로그램', LEGACY_KEYS.filter(k=>r[k]).map(k=>`${LABEL[k]} ${r[k]}`).join(', '));
  add('결제', r.pay ? r.pay + (r.pay==='미정' && r.tbdDate ? ` (${mdLabel(r.tbdDate)}까지 답변)` : '') + (r.onsite ? ' · 현장 카드 재결제' : '') : '');
  const sp = typeof SPECIAL!=='undefined' ? specialCounts(r) : [];
  add('특별 할인', sp.map(s=>`${s.short} ${s.n}명(${s.rate===1?'무료':Math.round(s.rate*100)+'%'})`).join(', '));
  const m = moneySplit(r);
  if(m) add('예상 금액', `${won(m.saw+m.shilla)}원 (사유원 ${won(m.saw)}원 · 신라 ${won(m.shilla)}원)${m.missing?' · 견적서 품목에 없는 항목 제외':''}`);
  add('서류 요청', [r.wantQuote&&'견적서', r.wantStmt&&'거래명세서'].filter(Boolean).join(', '));
  add('미정 항목', r.tbd ? r.tbd + (r.tbdDate ? ` (${mdLabel(r.tbdDate)}까지)` : '') : '');
  const ml = memoLines(); if(ml.length){ L.push('- 통화 메모:'); ml.forEach(x=>L.push(`  · ${x}`)); }
  const open = tasks.filter(t=>!t.done).map(t=>t.title);
  add('남은 과업', open.join(', '));
  add('영업 담당', r.owner || savedOwner());
  return L.join('\n');
}
$('#copyTextBtn').onclick=()=>{
  if(!rec.org && !rec.date){ toast('업체나 방문일을 먼저 입력하세요.'); return; }
  copy(reportText(rec),'보고용 내용을 복사했습니다. 카카오톡에 붙여넣으세요.');
};
$('#copyReadBtn').onclick=()=>{ const v=$('#readback').value.trim(); if(!v){ toast('복사할 멘트가 없습니다.'); return; } copy(v,'확인 문구를 복사했습니다.'); };
// 고객님께 확인 멘트: 예약 내용으로 자동으로 만들고(readback), 직접 고치면 그 글을 그대로(rec.readEdit). '고객님께 말씀드림'을 체크하면 멘트를 지우고 시각만 남김(rec.readDone)
function paintReadback(){
  const ta=$('#readback'), done=$('#readDone'), st=$('#readState'); if(!ta) return;
  done.checked=!!rec.readDone;
  if(rec.readDone){
    if(ta.value) ta.value=''; ta.readOnly=true; ta.placeholder=`${dtLabel(rec.readDone)}에 고객님께 말씀드렸습니다. 체크를 풀면 멘트가 다시 나옵니다.`;
    st.textContent='말씀드림'; ta.classList.add('said'); return;
  }
  ta.readOnly=false; ta.classList.remove('said');
  const auto=readback(rec), empty=/^내용이 채워지면/.test(auto); ta.placeholder = empty ? auto : '';   // 아직 내용이 없으면 안내만
  if(document.activeElement!==ta){ const v=rec.readEdit || (empty ? '' : auto); if(ta.value!==v) ta.value=v; }
  st.textContent = rec.readEdit ? '직접 고친 멘트 · 다시 만들기로 되돌림' : '자동으로 만든 멘트 · 직접 고칠 수 있음';
}
$('#readback').addEventListener('input', e=>{ if(rec.readDone) return; rec.readEdit = e.target.value; startTimer(); $('#readState').textContent='직접 고친 멘트 · 다시 만들기로 되돌림'; });
$('#readback').addEventListener('blur', ()=>{ if(!rec.readDone && $('#readback').value.trim()===readback(rec).trim()) rec.readEdit=''; paintReadback(); });   // 자동 멘트와 같으면 자동으로
$('#readRegen').onclick=()=>{ rec.readEdit=''; rec.readDone=''; touched.add('readDone'); renderSide(); toast('예약 내용으로 멘트를 다시 만들었습니다.'); };
$('#readDone').addEventListener('change', e=>{ rec.readDone = e.target.checked ? new Date().toISOString() : ''; if(e.target.checked) rec.readEdit=''; touched.add('readDone'); startTimer(); renderSide(); });

// ===================== 저장: 구글 시트(Apps Script) → 주소가 비어 있으면 이 브라우저 =====================
// SHARED_URL: group-intake.gs 를 웹 앱으로 배포한 주소 (README 참고). 비밀번호는 코드에 넣지 않고 각자 브라우저에 기억
const SHARED_URL = "https://script.google.com/macros/s/AKfycbwVW9NxrEhRDNRS-wmuXkgB1fOpt473vxCJpdksCfCmqV91eWnPhNmNgklmXaPc2GHi/exec";
const LKEY='sayuwon_intake_v1', KEY_LS='sayuwon_intake_key', PEND_LS='sayuwon_intake_pending', CACHE_LS='sayuwon_intake_cache';
const readJSON=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)); return v==null?d:v; }catch(_){ return d; } };
const writeJSON=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_){} };
let pending = readJSON(PEND_LS,[]);        // 아직 시트에 못 올린 저장·삭제 [{action:'put',item}|{action:'del',id}]
let serverItems = readJSON(CACHE_LS,[]);   // 마지막으로 받은 시트 내용 (바로 띄우기용)
const ADMIN_LS='sayuwon_intake_admin';
let adminData = readJSON(ADMIN_LS,null);   // 관리자 사이트 사담·마방 현황 {updated, days:{날짜:{L1,L2,D,MB}}}
let syncState = SHARED_URL ? 'loading' : 'off', flushing=false, retryTimer=null;
const getKey=()=>{ try{ return localStorage.getItem(KEY_LS)||''; }catch(_){ return ''; } };

async function callApi(body){
  // Content-Type 을 붙이지 않아야 Apps Script 로 사전 확인 요청 없이 바로 간다
  const r=await fetch(SHARED_URL,{method:'POST',body:JSON.stringify({...body,key:getKey()})});
  const j=await r.json();
  if(!j.ok){ const e=new Error(j.error||'error'); e.code=j.error; throw e; }
  return j;
}
function merged(){
  const m=new Map(serverItems.map(x=>[x.id,x]));
  pending.forEach(p=>{ if(p.action==='put') m.set(p.item.id,{...p.item,_pending:true}); else m.delete(p.id); });
  return [...m.values()];
}
function paintSync(){
  const chip=$('#syncChip'), n=pending.length;
  // 연결돼 있으면 아무것도 안 보임. 문제가 있을 때만 헤더에 표시 (비밀번호 문제는 팝업)
  const txt={ off:'이 브라우저에만 저장', loading:'', ok: n?`올리는 중 ${n}건`:'', error: n?`연결 끊김 · ${n}건 대기 · 다시 시도 중`:'연결 끊김 · 다시 시도 중', needkey:'' }[syncState];
  chip.textContent=txt; chip.hidden=!txt; chip.className='sync '+(syncState==='error'||syncState==='off'?'warn':'');
  const km=$('#keyModal'), wasHidden=km.hidden; km.hidden = syncState!=='needkey';
  if(!km.hidden && wasHidden) setTimeout(()=>$('#keyInput').focus(), 0);
  paintDbTime();
  $('#storeHint').textContent = !SHARED_URL ? '이 브라우저에만 저장됩니다 (공유 주소 연결 전)' : syncState==='ok' ? '구글 시트에 저장 · 모두가 같은 목록을 봅니다' : syncState==='needkey' ? '팀 비밀번호를 넣으면 공유 목록이 보입니다' : syncState==='error' ? '연결이 안 돼 이 브라우저에 모아 두었다가 다시 올립니다' : '불러오는 중…';
}
// 구글 시트(Apps Script) DB에 마지막으로 저장된 시각 (이 브라우저에서 올린 것) · 마지막으로 받아 온 시각
var DBT_LS = 'sayuwon_db_time';   // var: paintSync가 먼저 불려도 되게
var dbTime = readJSON(DBT_LS, {});
const markDb = k => { dbTime[k]=new Date().toISOString(); writeJSON(DBT_LS, dbTime); paintDbTime(); };
function paintDbTime(){
  const el=$('#dbTime'); if(!el || !dbTime) return;
  if(!SHARED_URL){ el.hidden=true; return; }
  const n=pending.length, last=[dbTime.saved, dbTime.cat].filter(Boolean).sort().pop(), t=last || dbTime.pulled;   // 예약 저장 · 품목 관리 저장 중 최근 것
  el.hidden = !t && !n;
  el.textContent = (last ? `DB 저장 ${dtLabel(last)}` : t ? `DB 동기화 ${dtLabel(t)}` : '') + (n ? ` · 저장 대기 ${n}건` : '');
  el.title = `구글 시트(Apps Script) DB · 이 브라우저 기준\n· 예약 마지막 저장: ${dbTime.saved?dtLabel(dbTime.saved):'아직 없음'} (고치고 30초 뒤 자동 저장)\n· 품목 관리 마지막 저장: ${dbTime.cat?dtLabel(dbTime.cat):'아직 없음'} (고치고 2초 뒤 자동 저장)\n· 마지막으로 목록을 받아 옴: ${dbTime.pulled?dtLabel(dbTime.pulled):'아직 없음'}`;
}
function handleErr(e){
  if(e.code==='bad_key'){ syncState='needkey'; if(getKey()) $('#keyMsg').textContent='비밀번호가 맞지 않습니다.'; }
  else { syncState='error'; clearTimeout(retryTimer); retryTimer=setTimeout(()=>{ flush(); }, 15000); }
  paintSync();
}
async function flush(){
  if(!SHARED_URL || flushing) return;
  if(!getKey()){ syncState='needkey'; paintSync(); return; }
  flushing=true;
  try{
    do {   // 보내는 사이 새로 쌓인 것(예: 삭제 사유 저장 뒤 삭제)까지 이어서 보냄
    while(pending.length){
      await callApi(pending[0]);
      pending.shift(); writeJSON(PEND_LS,pending); dbTime.saved=new Date().toISOString(); writeJSON(DBT_LS, dbTime); paintSync();
    }
    await pull(true);
    } while(pending.length);
  }catch(e){ handleErr(e); }
  finally{ flushing=false; }
}
async function pull(inFlush){
  if(!SHARED_URL) return;
  if(!getKey()){ syncState='needkey'; paintSync(); return; }
  if(flushing && !inFlush) return;
  try{
    const j=await callApi({action:'list'});
    serverItems=j.items||[]; writeJSON(CACHE_LS,serverItems.slice(-1000));
    if(j.admin!==undefined){ adminData=j.admin; writeJSON(ADMIN_LS,adminData); }
    dbTime.pulled=new Date().toISOString(); writeJSON(DBT_LS, dbTime);
    syncState='ok'; $('#keyMsg').textContent=''; paintSync(); renderList(); tryOpenG(); if(window.__tasksReady){ checkPayPopup(); takeDocs(); paintMyCount(); checkTbdPopup(); checkMemoPopup(); if(editingId){ const cr=cache.find(x=>x.id===editingId); if(cr){ memos=mergeMemos(memos, parseHist(cr).memos); paintLock(); } } if(!$("#myModal").hidden) renderMy(); }
  }catch(e){ if(inFlush) throw e; handleErr(e); }
}
const store={
  async list(){ cache = SHARED_URL ? merged() : readJSON(LKEY,[]); return cache; },
  async put(item){
    if(!SHARED_URL){ const l=readJSON(LKEY,[]); const i=l.findIndex(x=>x.id===item.id); if(i>=0) l[i]=item; else l.push(item); writeJSON(LKEY,l); return; }
    pending=pending.filter(p=>!(p.action==='put'&&p.item.id===item.id)); pending.push({action:'put',item}); writeJSON(PEND_LS,pending); paintSync(); flush();
  },
  async del(id, keepPut){   // keepPut: 바로 앞에 넣은 저장(삭제 사유 기록)을 먼저 보내고 삭제
    if(!SHARED_URL){ writeJSON(LKEY,readJSON(LKEY,[]).filter(x=>x.id!==id)); return; }
    const local=pending.some(p=>p.action==='put'&&p.item.id===id) && !serverItems.some(x=>x.id===id);
    if(!(keepPut && !local)) pending=pending.filter(p=>!(p.action==='put'&&p.item.id===id));
    if(!local) pending.push({action:'del',id});
    writeJSON(PEND_LS,pending); paintSync(); flush();
  }
};
$('#keyForm').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#keyInput').value.trim(); if(!v) return; try{ localStorage.setItem(KEY_LS,v); }catch(_){} $('#keyInput').value=''; $('#keyMsg').textContent=''; syncState='loading'; paintSync(); flush(); });
window.addEventListener('focus', ()=>{ if(pending.length) flush(); else pull(); });   // 다른 창에서 돌아오면 최신 목록
setInterval(()=>{ if(!document.hidden){ if(pending.length) flush(); else pull(); } }, 60000);
// ===================== 수정 기록 =====================
// 저장할 때마다 바뀐 항목을 시각·영업 담당과 함께 남긴다 (시트 '수정 기록' 칸에 JSON)
const mealSum = r => [r.sadam1&&`사담1부 ${r.sadam1}`, r.sadam2&&`사담2부 ${r.sadam2}`, r.sadamD&&`사담디너 ${r.sadamD}`, r.mabangL&&`마방 ${r.mabangTime?r.mabangTime+' ':''}${r.mabangL}`, r.mabangD&&`마방디너 ${r.mabangD}`].filter(Boolean).join(" · ") || r.meal || "";
Object.assign(LABEL, { etcDisc:'기타 할인', etcDiscTo:'기타 할인 대상', etcDiscWhy:'기타 할인 사유', etcDiscTx:'기타 할인 과세(신라)', etcDiscTf:'기타 할인 비과세(사유원)', erpList:'전산 내역', tour:'사전 답사', tbd:'미정 체크', tbdLate:'답변일 늦춘 사유', stage:'예약 단계', erp:'전산 등록', note:'통화 메모' });
function snap(){
  const o={}; allKeys().forEach(k=>{ if(k!=='owner') o[k]=rec[k]||''; });
  o.tbd=rec.tbd||''; o.tbdLate=rec.tbdLate||''; if(typeof SPECIAL!=='undefined') SPECIAL.forEach(s=>o[s.k]=rec[s.k]||'');
  o.stage=effStage(rec); o.erp=rec.erp||''; o.note=$('#memoBox').value.trim();
  { const es=etcSplit(rec); if(es.tx) o.etcDiscTx=String(es.tx); if(es.tf) o.etcDiscTf=String(es.tf); } ['etcDiscWhy','readDone'].forEach(k=>{ if(rec[k]) o[k]=rec[k]; }); if(erpList.length) o.erpList=erpList.map(x=>`${x.product} ${x.people}명 ${x.amount}`).join(', ');   // 기타 할인 · 전산 내역도 변경으로
  tasks.forEach(t=>{ o['task:'+t.id]=t.done?'완료':''; o['tmemo:'+t.id]=t.memo||''; o['tfile:'+t.id]=(t.files||[]).map(f=>f.name).join(', '); if(t.custom) o['tadd:'+t.id]=t.title; });
  tasks.forEach(t=>{ if(t.noteEdit) o['tnote:'+t.id]=t.noteEdit; });   // 직접 고친 문구
  tasks.forEach(t=>{ const s=[...Object.entries(t.subs||{}).map(([k,v])=>k+(v?'✓':'')), ...(t.xsubs||[]).map(x=>x.title+(x.done?'✓':''))].join(', '); if(s) o['tsub:'+t.id]=s; });   // 하위 과업 · 세부 과제
  o.taskOrder = tasks.filter(t=>t.ordSet).sort((a,b)=>a.ord-b.ord).map(t=>t.id).join(',');   // 직접 바꾼 순서만 (새 과업이 맨 아래 붙는 것은 변경 아님)   // ▲▼로 바꾼 과업 순서
  return o;
}
function diffSnap(a,b){
  const out=[];
  new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>{
    const x=a[k]||'', y=b[k]||''; if(x===y) return;
    if(k==='note'){ out.push('통화 메모 수정'); return; }
    if(k==='taskOrder'){ out.push('과업 순서 바꿈'); return; }
    if(k==='readDone'){ out.push(y ? '고객님께 확인 멘트 말씀드림' : '고객님께 확인 멘트 말씀드림 취소'); return; }
    const tm=k.match(/^(task|tmemo|tadd|tfile|tsub|tnote):(.+)$/);
    if(tm){ const title=(tasks.find(t=>t.id===tm[2])||{}).title||x||y;
      out.push(tm[1]==='task' ? `[과업] ${title} ${y?'완료':'완료 취소'}` : tm[1]==='tnote' ? `[과업] ${title} 문구 직접 수정` : tm[1]==='tsub' ? `[과업] ${title} 세부 과제: ${y}` : tm[1]==='tfile' ? `[과업] ${title} 파일 올림` : tm[1]==='tadd' ? (y?`[과업] ${title} 추가`:`[과업] ${x} 삭제`) : `[과업] ${title} 메모 수정`); return; }
    const lab=LABEL[k]||k;
    out.push(!x ? `${lab} ${y} 입력` : !y ? `${lab} ${x} 지움` : `${lab} ${x} → ${y}`);
  });
  return out;
}
// 시트 '수정 기록' 칸: {h:[수정 기록], tasks:[추후 과업]} (예전 기록은 배열만)
function parseHist(r){ try{ const j=JSON.parse(r.history||'[]'); return Array.isArray(j) ? {h:j, tasks:[], erp:[], memos:[]} : {h:j.h||[], tasks:j.tasks||[], erp:j.erp||[], memos:j.memos||[]}; }catch(_){ return {h:[], tasks:[], erp:[], memos:[]}; } }   // memos: 담당이 아닌 사람이 남긴 메모 [{id,t,by,text,seen,seenAt}]
const histOf = r => parseHist(r).h;
// ---- 바뀐 값의 흐름 (ch): {칸: [처음 값, 다음 값, …]} → "관람 인원 20 → 22 → 25". 자동 저장이 여러 번이어도 한 줄에 모든 변경이 남고, 되돌리기에도 씀
const fmtTime_ = t => dtLabel(t);
function chText(k, c){
  const x=c[0]||'', y=c[c.length-1]||'';
  if(k==='note') return '통화 메모 수정';
  if(k==='taskOrder') return '과업 순서 바꿈';
  if(k==='erpList') return '전산 내역 붙여넣음';
  if(k==='readDone') return y ? '고객님께 확인 멘트 말씀드림' : '고객님께 확인 멘트 말씀드림 취소';
  const tm=k.match(/^(task|tmemo|tadd|tfile|tsub|tnote):(.+)$/);
  if(tm){ const title=(tasks.find(t=>t.id===tm[2])||{}).title||x||y;
    return tm[1]==='task' ? `[과업] ${title} ${y?'완료':'완료 취소'}` : tm[1]==='tnote' ? `[과업] ${title} 문구 직접 수정` : tm[1]==='tsub' ? `[과업] ${title} 세부 과제: ${y||'없음'}` : tm[1]==='tfile' ? `[과업] ${title} 파일 올림` : tm[1]==='tadd' ? (y?`[과업] ${title} 추가`:`[과업] ${x} 삭제`) : `[과업] ${title} 메모 수정`; }
  const lab=LABEL[k]||k;
  if(c.length===2) return !x ? `${lab} ${y} 입력` : !y ? `${lab} ${x} 지움` : `${lab} ${x} → ${y}`;
  return `${lab} ${c.map(v=>v||'(빈칸)').join(' → ')}`;   // 여러 번 바뀐 것은 거쳐 간 값을 모두
}
const chWhat = ch => Object.entries(ch).map(([k,c])=>chText(k,c)).join(', ');
function addCh(ch, a, b){   // a(마지막 저장) → b(지금) 사이 바뀐 칸을 흐름에 이어 붙임
  new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>{ const x=a[k]||'', y=b[k]||''; if(x===y) return;
    if(!ch[k]) ch[k]=[x]; if(ch[k][ch[k].length-1]!==y) ch[k].push(y); if(ch[k].length>20) ch[k].splice(1, ch[k].length-20); });
  return ch;
}
// 되돌리기: 기록 i 를 저장한 직후의 상태 = 지금 상태에서 i 보다 뒤 기록들의 흐름을 거꾸로 첫 값으로
const REVERT_SKIP = /^(task|tmemo|tadd|tfile|tsub|tnote):|^(taskOrder|erpList)$/;   // 과업 체크 · 메모 · 파일은 되돌리지 않음
function canRevertTo(i){ return i < hist.length-1 && hist.slice(i+1).every(h=>h.ch); }
function stateAt(i){
  const s={...(baseSnap||snap())};   // 마지막으로 저장한 상태에서 거꾸로
  for(let j=hist.length-1;j>i;j--) Object.entries(hist[j].ch||{}).forEach(([k,c])=>{ if(!REVERT_SKIP.test(k)) s[k]=c[0]||''; });
  return s;
}
function renderHist(){
  $('#histWrap').hidden = !hist.length; $('#histCount').textContent = hist.length ? hist.length+'건' : '';
  const n=hist.length;
  $('#histBox').innerHTML = hist.map((h,i)=>({h,i})).reverse().map(({h,i})=>`<li><time>${esc(fmtTime_(h.t))}</time><b>${esc(h.by||'담당 미입력')}</b>${esc(h.what)}`
    + (h.o && h.s===SID ? ' <span class="hist-open">자동 저장 중 · 저장 버튼을 누르면 확정</span>' : '')
    + (i===n-1 ? ' <span class="hist-now">지금 버전</span>' : canRevertTo(i) ? ` <button type="button" class="hist-rev" data-rev="${i}">이 버전으로 돌아가기</button>` : '')
    + `</li>`).join('');
  $('#autoSt').textContent = lastAuto ? `자동 저장 ${new Date(lastAuto).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}` : '';
}
// ---- 자동 저장: 마지막으로 고친 뒤 AUTO_SAVE_MS 가 지나면 저장. 한 번 열어 고치는 동안(세션)의 변경은 수정 기록 한 줄에 모임
// 저장 버튼을 누르면 그 줄을 확정하고, 다음 변경은 새 줄로
const AUTO_SAVE_MS = 30000;
let autoT=null, lastAuto=null, saving=false, emptySnap=null, SID=Math.random().toString(36).slice(2);
const canSave = () => !!(rec.org || rec.date);
const refSnap = () => baseSnap || emptySnap || {};
const isDirty = () => diffSnap(refSnap(), snap()).length>0;
function paintDirty(){ $('#saveBtn').classList.toggle('dirty', isDirty()); }
function scheduleAuto(){
  paintDirty(); clearTimeout(autoT);
  if(isDirty() && canSave()) autoT=setTimeout(()=>save({auto:true}), AUTO_SAVE_MS);
}
async function save(opt){
  const auto = !!(opt && opt.auto), quiet = opt===true || auto;
  if(saving){ if(auto){ clearTimeout(autoT); autoT=setTimeout(()=>save(opt), 3000); return; }   // 자동 저장 중이면: 자동은 잠시 뒤, 저장 버튼은 끝나기를 기다렸다가
    await new Promise(ok=>{ const iv=setInterval(()=>{ if(!saving){ clearInterval(iv); ok(); } }, 50); }); return save(opt); }
  if(lockOwner){ if(!auto) toast(`${lockOwner}님 담당 예약이라 고칠 수 없습니다. 바꿀 내용은 위쪽 메모로 남겨 주세요.`); return; }   // 남이 담당인 예약은 저장 안 함 (메모만)
  if(!canSave()){ if(!auto) toast('업체나 방문일을 먼저 입력하세요.'); return; }
  if(typeof tbdIsLate==='function' && tbdIsLate(rec) && !rec.tbdLate){ if(!auto) openLate(()=>save(opt)); return; }   // 입력 기한을 전주 목요일보다 늦게 잡았으면 사유부터 (자동 저장은 기다림)
  if(auto && !isDirty()) return;
  clearTimeout(autoT);
  if(!rec.owner) rec.owner=savedOwner();
  const wasSaved=!!editingId, now=new Date().toISOString(), cur=snap(), me=savedOwner()||rec.owner||'';
  // 이 세션의 줄(열려 있는 줄)에 이어 적기
  const last=hist[hist.length-1], open = last && last.o && last.s===SID ? last : null;
  let row = open ? {...open, ch:{...(open.ch||{})}} : null;
  if(!baseSnap){ row = row || {t:now, by:me, what:'처음 저장', s:SID, first:1}; }   // 새 예약: 첫 줄은 '처음 저장'
  else { const ch=addCh(row?row.ch:{}, baseSnap, cur); if(Object.keys(ch).length){ row = {...(row||{s:SID}), t:now, by:me, ch, what:(row&&row.first?'처음 저장 · ':'')+chWhat(ch)}; } }
  if(row){ row.t=now; if(auto) row.o=1; else delete row.o; }
  if(row && opt && opt.revert) row.what = `[되돌리기] ${opt.revert} 버전으로 · ${row.what}`;
  const changes = row && row.ch ? Object.keys(row.ch) : row ? ['처음 저장'] : [];
  const newHist = row ? [...(open ? hist.slice(0,-1) : hist), row].slice(-200) : hist;
  const j=joinContacts(rec);
  const item={...rec, ...j, ...packExtra(rec), callType:effStage(rec), summary:autoSummary(), note:$('#memoBox').value, takenBy:rec.owner,
    callStart:startedAt?startedAt.toISOString():'', id:editingId||(Date.now().toString(36)+Math.random().toString(36).slice(2,5)), saved:now, history:JSON.stringify({h:newHist, tasks, erp:erpList, memos:mergeMemos(memos, parseHist(cache.find(x=>x.id===editingId)||{}).memos)})};   // 메모: 그사이 남이 남긴 것까지 합침
  Object.keys(item).forEach(k=>{ if(isCKey(k)) delete item[k]; });
  delete item.tbd; delete item.stage; delete item.erp; delete item.tbdDate; delete item.tbdLate; delete item.payContact;
  saving=true;
  try{ await store.put(item); editingId=item.id; hist=newHist; baseSnap=cur;
    if(auto) lastAuto=now; renderHist(); paintDirty(); await renderList();
    if(!auto) toast(quiet ? `저장했습니다.` : `${item.callType}으로 저장했습니다.${changes.length?' 수정 기록에 반영했습니다.':' (바뀐 내용 없음)'}${needsErp(rec)&&!rec.erp?' 전산 등록을 잊지 마세요.':''}`);
    if(!auto) SID=Math.random().toString(36).slice(2);   // 저장 버튼 = 이 줄 확정, 다음 변경은 새 줄
  }
  catch(e){ toast('저장하지 못했습니다: '+e.message); }
  finally{ saving=false; }
}
$('#saveBtn').onclick=()=>save();
// ---- 저장하지 않은 변경이 있으면: 창을 닫을 때 브라우저가 묻고, 새 통화 · 다른 예약으로 넘어갈 때 팝업
window.addEventListener('beforeunload', e=>{ if(isDirty()){ e.preventDefault(); e.returnValue=''; } });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden && isDirty() && canSave()) save({auto:true}); });   // 다른 창으로 가면 바로 자동 저장
let leaveNext=null;
function guardLeave(fn){
  if(!isDirty()){ fn(); return; }
  leaveNext=fn;
  $('#leaveList').innerHTML = diffSnap(refSnap(), snap()).slice(0,12).map(s=>`<li>${esc(s)}</li>`).join('');
  $('#leaveMsg').textContent = canSave() ? '아래 내용을 아직 저장하지 않았습니다. 저장하지 않고 나가시겠어요?' : '업체나 방문일이 없어 저장할 수 없습니다. 저장하지 않고 나가면 입력한 내용이 사라집니다.';
  $('#leaveSave').hidden = !canSave();
  $('#leaveModal').hidden=false; setTimeout(()=>($('#leaveSave').hidden?$('#leaveCancel'):$('#leaveSave')).focus(),0);
}
const closeLeave = () => { $('#leaveModal').hidden=true; };
$('#leaveCancel').onclick=()=>{ leaveNext=null; closeLeave(); };
$('#leaveDiscard').onclick=()=>{ const f=leaveNext; leaveNext=null; closeLeave(); clearTimeout(autoT); baseSnap=snap(); emptySnap=baseSnap; f&&f(); };   // 버리고 이동
$('#leaveSave').onclick=async()=>{ const f=leaveNext; leaveNext=null; closeLeave(); await save(); if(!isDirty()) f&&f(); };
$('#leaveModal').addEventListener('click', e=>{ if(e.target.id==='leaveModal') $('#leaveCancel').click(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#leaveModal').hidden){ e.preventDefault(); $('#leaveCancel').click(); } });
const openRecordG = r => guardLeave(()=>openRecord(r));
// ---- 수정 기록: 이 버전으로 돌아가기 → 미리보기(지금 / 돌아갈 버전) → 선택
let revTarget=null;
const revVal = (k,v) => k==='note' ? (v ? (v.length>40 ? v.slice(0,40)+'…' : v) : '') : v;
$('#histBox').addEventListener('click', e=>{
  const b=e.target.closest('[data-rev]'); if(!b) return;
  const i=+b.dataset.rev; if(!canRevertTo(i)) return;
  const target=stateAt(i), cur=snap();
  const keys=[...new Set([...Object.keys(target),...Object.keys(cur)])].filter(k=>!REVERT_SKIP.test(k) && (target[k]||'')!==(cur[k]||''));
  revTarget={i, target, label:fmtTime_(hist[i].t)};
  $('#revMsg').textContent = `${fmtTime_(hist[i].t)} 버전 (${hist[i].by||'담당 미입력'}) · 지금과 다른 항목 ${keys.length}개`;
  $('#revBody').innerHTML = keys.length ? keys.map(k=>`<tr><td>${esc(LABEL[k]||k)}</td><td>${esc(revVal(k,cur[k]||''))||'<span class="hint" style="margin:0">(빈칸)</span>'}</td><td><b>${esc(revVal(k,target[k]||''))||'<span class="hint" style="margin:0">(빈칸)</span>'}</b></td></tr>`).join('')
    : '<tr><td colspan="3" class="hint">지금과 같은 내용입니다.</td></tr>';
  $('#revOk').disabled = !keys.length;
  $('#revModal').hidden=false;
});
const closeRev = () => { $('#revModal').hidden=true; revTarget=null; };
$('#revCancel').onclick=closeRev;
$('#revModal').addEventListener('click', e=>{ if(e.target.id==='revModal') closeRev(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#revModal').hidden){ e.preventDefault(); closeRev(); } });
$('#revOk').onclick=async()=>{
  if(!revTarget) return; const {target, label}=revTarget; closeRev();
  const lr=hist[hist.length-1]; if(isDirty() || (lr && lr.o && lr.s===SID)) await save();   // 지금까지 고친 것은 먼저 한 줄로 확정
  Object.entries(target).forEach(([k,v])=>{ if(REVERT_SKIP.test(k) || k==='stage') return;
    if(k==='note'){ $('#memoBox').value=v; return; } rec[k]=v; if(v) touched.add(k); });
  rec.stage = target.stage && target.stage!==stageAuto(rec) ? target.stage : '';   // 결제로 정해지는 단계와 다를 때만 직접 고른 단계
  nContacts=Math.max(1,nContactsOf(rec)); renderContacts(); renderForm();
  await save({revert:label});
};
// 헤더의 영업 담당: 이 컴퓨터에 기억, 새 예약의 담당이 됨, 수정 기록에 이 이름이 남음
(()=>{ const el=$('#f_owner'), wrap=el.closest('.me');
  const paint=()=>wrap.classList.toggle('empty', !el.value.trim());
  el.value=savedOwner(); paint(); const mn=$('#meName'); if(mn) mn.textContent=savedOwner()||'(로그인 필요)';   // 영업 담당 = 로그인한 이름 (첫 화면에서 로그인)
  el.addEventListener('input', ()=>{ try{ localStorage.setItem('sayuwon_owner', el.value.trim()); }catch(_){} if(!editingId) rec.owner=el.value.trim(); paint(); renderSide(); });
})();
// 맨 위 예약 단계 줄의 미정 항목 입력 기한
$('#f_tbdDate').addEventListener('input', e=>{ rec.tbdDate=e.target.value; tbdAuto=false; touched.add('tbdDate'); startTimer(); paintFields(); renderSide(); });

// ===================== 추후 과업 =====================
// 예약 단계·결제 방식에 따라 자동으로 생기는 과업 + 직접 추가한 과업. 과업마다 체크 · 메모
const AUTO_TASKS = { erpcheck:'전산 내역 대조 (총 금액 · 할인)', tour:'사전답사 전산 예약', tbdcall:'미정 항목 확인 연락', onsitecall:'현장 결제 인원 확인 연락', mbcall:'몽몽마방 식당에 시간 확인', mbmenu:'몽몽마방 메뉴 선택', progstaff:'프로그램 · 굿즈 담당 입력', staffbrief:'담당자에게 일정 전달', goodsprep:'굿즈 준비', erp:'전산 예약', erpfix:'전산 예약 수정', quote:'견적서 발급', stmt:'거래명세서 발급', tax:'세금계산서 발행', paycheck:'결제 확인' };
// 금액을 사유원(관람)과 신라(관람 외 전부)로 나눔. 관람+식사 패키지는 관람 가격만큼 사유원
function moneySplit(r){
  if(r===rec && erpList.length){ const t=erpTotals(); return {saw:t.saw, shilla:t.shilla, etc:0, missing:false, erp:true}; }   // 전산 내역이 있으면 전산 금액 (세금계산서 문구 등)
  if(!quoteCat || !r.date || !numOf(r.people)) return null;
  const d=new Date(r.date+'T00:00'), viewSrc=viewSrcOf(r), vp=priceOf(viewSrc);
  let saw=0, shilla=0, missing=false;
  const {blocks, skipped} = quoteBlocks(r);
  blocks.forEach(b=>{ const m=blockMoney(b, r); if(!m){ missing=true; return; } saw+=m.tf; shilla+=m.tx; });   // 줄마다 비과세 = 사유원, 과세 = 신라 (할인 · 직접 고친 할인액 반영)
  void d; void viewSrc; void vp;
  const es=etcSplit(r), etc=es.tx+es.tf; saw=Math.max(0,saw-es.tf); shilla=Math.max(0,shilla-es.tx);   // 기타 할인: 비과세는 사유원, 과세는 신라에서
  return {saw, shilla, etc, missing: missing || skipped.length>0};
}
// 기타 할인: 금액 · 어느 쪽(사유원 / 신라, 기본 신라) · 사유
// 기타 할인: 과세(신라) · 비과세(사유원) 금액을 직접 (예전 기록: 금액 + 대상 신라/사유원 → 그쪽으로)
const numW = v => Math.max(0, parseInt(String(v||'').replace(/\D/g,''))||0);
function etcSplit(r){ let tx=numW(r.etcDiscTx), tf=numW(r.etcDiscTf); if(!tx && !tf && numW(r.etcDisc)){ if(r.etcDiscTo==='사유원') tf=numW(r.etcDisc); else tx=numW(r.etcDisc); } return {tx, tf}; }
const etcAmt = r => { const s=etcSplit(r); return s.tx+s.tf; };
document.querySelectorAll('[data-etc]').forEach(el=>{
  const take=()=>{ const k=el.dataset.etc; let v=el.value;
    if(/^etcDisc(Tx|Tf)$/.test(k)){ v=v.replace(/\D/g,''); if(v!==el.value) el.value=v;
      if(rec.etcDisc){ const o=etcSplit(rec); rec.etcDiscTx=String(o.tx||''); rec.etcDiscTf=String(o.tf||''); rec.etcDisc=''; rec.etcDiscTo=''; touched.add('etcDisc'); } }   // 예전 한 칸 금액은 두 칸으로 옮기고 지움
    rec[k]=v; touched.add(k); startTimer(); renderSide(); };
  el.addEventListener(el.tagName==='SELECT'?'change':'input', take);
});
const memoLines = () => $('#memoBox').value.split('\n').map(s=>s.trim()).filter(Boolean);
// 전산 내역 대조: 예약 내용으로 계산한 총 금액 · 할인 합계 = 전산 내역의 금액 · 할인 합계인지 (할인 버튼 % + 기타 할인 기준, 줄에서 고친 할인액은 넣지 않음)
function erpCheck(){
  if(!erpList.length) return {ok:false, pasted:false};
  const eTot=erpList.reduce((s,x)=>s+(+x.amount||0),0), eDisc=erpList.reduce((s,x)=>s+(+x.disc||0),0);
  if(!quoteCat || !rec.date) return {ok:false, pasted:true, eTot, eDisc, why:'방문일 · 품목 가격이 있어야 대조할 수 있습니다'};
  const plain={...rec, idamt:''}, {blocks, skipped}=quoteBlocks(rec); let tot=0, disc=0, missing=[...skipped];
  blocks.forEach(b=>{ const m=blockMoney(b, plain); if(!m){ missing.push(itemLabel(b.product)); return; } tot+=m.amount; disc+=m.full-m.amount; });
  const etc=etcAmt(rec); tot-=etc; disc+=etc;
  const okTot=Math.abs(tot-eTot)<1, okDisc=Math.abs(disc-eDisc)<1;
  return {ok: okTot && okDisc && !missing.length, pasted:true, tot, disc, eTot, eDisc, okTot, okDisc, missing};
}
const erpCheckHTML = c => !c.pasted ? '' : c.why ? `<span class="ck bad">대조 못 함: ${esc(c.why)}</span>`
  : `<span class="ck ${c.okDisc?'ok':'bad'}">${c.okDisc?'✓':'✗'} 할인 합계 · 예약 ${won(c.disc)}원 / 전산 ${won(c.eDisc)}원</span><span class="ck ${c.okTot?'ok':'bad'}">${c.okTot?'✓':'✗'} 총 금액 · 예약 ${won(c.tot)}원 / 전산 ${won(c.eTot)}원</span>${c.missing&&c.missing.length?`<span class="ck bad">가격 없는 품목: ${esc(c.missing.join(', '))}</span>`:''}`;
// 전산 비고에 붙여넣을 문구
function erpNote(r){
  const gate = r.gate && r.gate!=='미정' ? r.gate : '';   // 출입구가 미정이면 '출입구 미정'을 따로
  const p=[`입장 ${r.tin||'미정'}${gate?' '+gate:''}`, ...(gate?[]:['출입구 미정']), ...(r.pchg ? ['인원 변경 가능성 있음'] : [])];   // 인원 변경은 가능성이 있을 때만
  const pg=progList(r, null, true); if(pg.length) p.push(pg.join(', '));   // 프로그램 (담당:이름)
  if(r.mabangL || r.mabangTime || r.mabangMenu) p.push(['몽몽마방', r.mabangTime, r.mabangMenu].filter(Boolean).join(' '));   // 몽몽마방 <시간> <메뉴>
  if(r.mabangPay==='마방') p.push('몽몽마방 식사 마방에서 결제');
  if(r===rec){ const nt=itemNotesText(); if(nt.length) p.push('항목 비고 '+nt.join(', ')); }   // 예약 내역 줄마다 적은 비고
  if(r.goods) p.push('굿즈 '+goodsText(r)+(String(r.stf_goods||'').trim() ? ` (담당:${String(r.stf_goods).trim()})` : ' (담당:미정)'));   // 굿즈 구매   // 몽몽마방 결제를 마방으로 고르면
  // 금액: 지금 적용된 사유원 · 신라 금액 (할인 · 기타 할인 · 줄에서 고친 할인액 · 전산 내역 반영)
  { const m=moneySplit(r), onsite = r.pay==='현장 결제' || r.onsite;
    if(m) p.push(`${won(m.saw)}원(사유원) ${won(m.shilla)}원(신라)${onsite ? ' 현장결제 필요' : r.pay && r.pay!=='미정' ? ' '+r.pay : ''}`);
    else if(onsite) p.push('현장결제 필요 (금액은 방문일·인원을 넣으면 계산)'); }
  // 할인 사항(기타 할인 · 줄에서 고친 할인액)은 전산 비고에 넣지 않음 (2026-11-14) — 금액만 위 사유원 · 신라에 반영
  const who=(r.owner||savedOwner()||'').trim();   // 끝에 항상 (영업 담당 이름)
  return [...p, ...memoLines()].join(' / ') + (who ? ` (${who})` : '');
}
// 세금계산서 발행 요청 문구
function taxMsg(r){
  const m=moneySplit(r), email=(contactsOf(r).find(c=>c.email)||{}).email;
  return `[세금계산서] ${r.org||'(단체명)'}\n1. 금액\n- 사유원 : ${m?won(m.saw):'      '}원\n- 신라 : ${m?won(m.shilla):'      '}원\n2. 사업자 등록증 : 파일 첨부\n3. 이메일 : ${email||'(담당자 이메일)'}\n4. 발행일 : ${r.date?r.date.replace(/-/g,'.')+' '+dowTag(r.date):'(방문일자)'}\n감사합니다~`;
}
// 현장 결제 인원 확인 연락: 전주 목요일에 읽을 문구
const onsiteMsg = r => `안녕하세요, 사유원입니다. ${r.org?`<${r.org}> `:''}${r.date?mdLabel(r.date)+' ':''}방문 건으로 연락드렸습니다.\n최종 인원이 ${r.people?`총 ${r.people}명`:'몇 분'} 맞으신가요?\n현장 결제로 진행되기 때문에 당일에는 인원 변경이 어려운 점 다시 한번 안내드립니다.\n변경이 있으시면 지금 말씀해 주세요. 감사합니다.`;
// 담당자에게 일정 전달 (방문 전날): 담당자별로 맡은 프로그램 · 굿즈
function staffMsg(r){
  const by={}, add=(who,s)=>{ who=String(who||'').trim()||'(담당 미정)'; (by[who] ||= []).push(s); };
  FIELDS.filter(f=>/^프로그램/.test(f[0]) && !isSub(f[1]) && r[f[1]]).forEach(f=>{ const k=f[1], v=String(r[k]), sub=p=>String(r[`${p}_${k}`]||'').trim();
    add(sub('stf'), `${f[2]} ${/^\d+(\+\d+)*$/.test(v) ? v+UNIT(k) : v}${sub('tm')?' '+sub('tm'):''}${sub('crs')?` (코스:${sub('crs')})`:''}${r===rec && itemNote(k)?` (비고:${itemNote(k)})`:''}`); });
  if(r.goods) add(r.stf_goods, '굿즈 '+goodsText(r)+(r===rec ? goodsParse(r.goods).map(g=>itemNote('g:'+g.src)?` (${goodsName(g.src)} 비고:${itemNote('g:'+g.src)})`:'').join('') : ''));
  const head=[r.org&&`<${r.org}>`, r.date&&dateLabel(r.date), r.people&&`${r.people}명`, r.tin&&`입장 ${r.tin}${r.gate&&r.gate!=='미정'?' '+r.gate:''}`].filter(Boolean).join(' · ');
  const c=contactsOf(r)[0]||{};
  return `[단체 일정 전달] ${head}\n` + Object.entries(by).map(([w,l])=>`- ${w}: ${l.join(', ')}`).join('\n') + (c.name||c.phone ? `\n고객 담당: ${[c.name,c.phone].filter(Boolean).join(' ')}` : '') + `\n영업 담당: ${(r.owner||savedOwner()||'').trim()||'-'}`;
}
const taskAuto = t =>(t.id==='erp'||t.id==='erpfix') ? erpNote(rec) : t.id==='staffbrief' ? staffMsg(rec) : t.id==='tax' ? taxMsg(rec) : t.id==='onsitecall' ? onsiteMsg(rec) : '';   // 자동으로 만든 문구
const taskText = t => taskAuto(t) ? (t.noteEdit || taskAuto(t)) : '';   // 직접 고쳤으면 그 글 (전산 비고 등)
// 과업 기한(due): 생기면 그날이 기본, 각자 바꿀 수 있음(dueSet). 미정 항목 연락 = 답변일, 현장 결제 인원 확인 = 전주 목요일(지났으면 전날), 결제 확인 = 다음날
const todayYmd = () => ymd(new Date());
function autoDue(id, r){
  if(id==='tbdcall') return r.tbdDate || todayYmd();
  if(id==='onsitecall') return r.date ? tbdLimit(r.date) : todayYmd();
  if(id==='paycheck') return ymd(nextDay(new Date().toISOString()));
  if(id==='staffbrief' || id==='goodsprep'){ if(!r.date) return todayYmd(); const d=new Date(r.date+'T00:00'); d.setDate(d.getDate()-1); return ymd(d); }   // 방문 전날
  return todayYmd();
}
const taskDue = t => t.due || (t.at ? ymd(new Date(t.at)) : todayYmd());   // 예전 과업은 생긴 날
const DOC_SUBS = { quote:[['make','견적서 생성'],['send','견적서 전송'],['nas','견적서 NAS에 업로드']], stmt:[['make','거래명세서 생성'],['send','거래명세서 전송'],['nas','거래명세서 NAS에 업로드']] };
const FOLLOW_DUE = new Set(['tbdcall','onsitecall','staffbrief','goodsprep']);   // 답변일 · 방문일이 바뀌면 기한도 따라감 (직접 바꾸기 전까지)
function syncAutoTasks(){
  const want = [], consult = effStage(rec)==='예약상담';   // 예약상담은 기록용: 추후 과업 없음
  if(rec.tbd) want.push('tbdcall');   // 미정 항목(결제 방법 포함)이 있으면 답변일에 연락
  if(rec.pay==='현장 결제' && rec.date) want.push('onsitecall');   // 현장 결제: 전주 목요일에 인원 확인 + 인원 변경 어려움 안내
  if(needsErp(rec)) want.push('erp', 'erpcheck');   // 전산 예약 + 전산 내역을 붙여 넣어 예약 내용과 총 금액 · 할인이 같은지 대조 (같으면 자동 완료)
  if(rec.pay==='세금계산서') want.push('tax');
  if(rec.pay==='결제링크') want.push('paycheck');
  if(rec.wantQuote) want.push('quote');
  if(rec.wantStmt) want.push('stmt');
  const ms=missingStaff(rec); if(ms.length) want.push('progstaff');   // 프로그램 담당이 비면 입력하라고
  const mbNeed=mbNeedsMenu(rec); if(mbNeed) want.push('mbmenu');   // 몽몽마방 예약인데 메뉴를 안 고름
  if(rec.goods) want.push('goodsprep');   // 굿즈가 들어가면 방문 전날까지 굿즈 준비 (그날 13시 · 17시 알림)
  if(rec.date && STAFF_BASES().some(k=>rec[k])) want.push('staffbrief');   // 프로그램 · 굿즈가 있으면 방문 전날 담당자에게 일정 전달 (영업 담당이 직접 체크)
  if(rec.mabangL || rec.mabangTime) want.push('mbcall');   // 몽몽마방이 들어가면 식당에 전화로 시간 확인 (직접 체크)
  // 전산 예약 수정: 전산 등록을 마친 뒤 인원 · 날짜 · 식사 등이 바뀌면 생김
  const e0=tasks.find(t=>t.id==='erp');
  if(e0){ e0.done=!!rec.erp; if(e0.done && !e0.base) e0.base=erpSnap(); if(!e0.done) delete e0.base; }
  const fixes = e0 && e0.base ? erpDiff(e0.base, erpSnap()) : [];
  if(fixes.length) want.push('erpfix');
  if(rec.tour) want.push('tour');   // 사전 답사가 잡히면 답사도 전산에 예약
  if(consult){ const keep=want.filter(id=>id==='tour'); want.length=0; want.push(...keep); }   // 예약상담이면 자동 과업은 사전답사 전산 예약만 (손대지 않은 것은 아래에서 빠짐)
  want.forEach(id=>{ if(!tasks.some(t=>t.id===id)) tasks.push({id, title:AUTO_TASKS[id], done:false, memo: id==='tour' ? String(rec.tour||'').split(/\s*,\s*/).join('\n') : '', at:new Date().toISOString(), due:autoDue(id, rec)}); });   // 사전 답사 과업 메모 = 답사 정보
  tasks.forEach(t=>{ if(FOLLOW_DUE.has(t.id) && !t.dueSet && !t.done){ const d=autoDue(t.id, rec); if(t.due!==d) t.due=d; } if(!t.due) t.due=taskDue(t); });
  const fx=tasks.find(t=>t.id==='erpfix');
  if(fx){ if(fixes.length){ if(fx.done){ fx.done=false; fx.at=new Date().toISOString(); fx.due=todayYmd(); delete fx.dueSet; } fx.changes=fixes; } else if(!fx.done) fx.changes=[]; }
  // 하위 과업: 견적서 · 거래명세서는 기본 3개(생성 · 전송 · NAS 업로드) + 누구나 직접 추가한 세부 과제(xsubs). 하위 과업이 있으면 모두 체크될 때 완료
  // (전산 예약 · 프로그램 담당 · 몽몽마방 메뉴처럼 칸을 채우면 끝나는 과업은 하위 과업과 상관없이 그 조건으로)
  tasks.forEach(t=>{ const ds=DOC_SUBS[t.id]; if(ds && !t.subs) t.subs=Object.fromEntries(ds.map(([k])=>[k, !!t.done]));
    if(['erp','erpcheck','progstaff','mbmenu'].includes(t.id)) return;
    const st=[...(ds ? ds.map(([k])=>!!t.subs[k]) : []), ...(t.xsubs||[]).map(x=>!!x.done)]; if(!st.length) return;
    const all=st.every(Boolean); if(all && !t.done){ t.done=true; t.doneAt=new Date().toISOString(); } if(!all && t.done){ t.done=false; t.doneAt=''; } });
  tasks = tasks.filter(t=> t.custom || want.includes(t.id) || t.done || t.memo || (t.files||[]).length || (t.subs && Object.values(t.subs).some(Boolean)) || (t.xsubs||[]).length);   // 조건이 사라진 자동 과업은 (손대지 않았으면) 뺌
  const ps=tasks.find(t=>t.id==='progstaff'); if(ps){ ps.done=!ms.length; ps.missing=ms.map(k=>LABEL[k]||k); }
  const mt=tasks.find(t=>t.id==='mbmenu'); if(mt) mt.done=!mbNeed;
  const ec=tasks.find(t=>t.id==='erpcheck'); if(ec){ const c=erpCheck(); const was=ec.done; ec.done=c.ok; ec.check=c; if(c.ok && !was) ec.doneAt=new Date().toISOString(); if(!c.ok) ec.doneAt=''; }   // 전산 내역 대조: 맞으면 자동 완료, 다르면 다시 열림
  const ORDER=['tour','tbdcall','onsitecall','mbcall','mbmenu','progstaff','staffbrief','goodsprep','erp','erpcheck','erpfix','quote','stmt','tax','paycheck'];
  // 순서: 마감일이 빠른 순, 마감일이 같으면 최근에 추가된 것이 위. 직접 옮긴 과업(ordSet)은 그 순서 그대로 두고,
  // 옮기지 않은 과업은 그 사이에 마감일에 맞게 끼워 넣음 (같은 마감일이면 직접 옮긴 것보다 위). 끝난 과업은 맨 아래
  const byNew=(a,b)=>taskDue(a).localeCompare(taskDue(b)) || String(b.at||'').localeCompare(String(a.at||''));
  const openT=tasks.filter(t=>!t.done), doneT=tasks.filter(t=>t.done).sort(byNew);
  const list=openT.filter(t=>t.ordSet).sort((a,b)=>a.ord-b.ord);
  openT.filter(t=>!t.ordSet).sort(byNew).forEach(t=>{ const d=taskDue(t); let i=list.findIndex(x=>x.ordSet && taskDue(x)>=d); if(i<0) i=list.length; list.splice(i,0,t); });
  tasks=[...list, ...doneT];
}
// 전산에 들어가는 내용 (이게 바뀌면 전산 예약 수정)
const ERP_BASE = ['goods','org','date','people','tin','tout','gate','pchg','pay','onsite','sadam1','sadam2','sadamD','mabangTime','mabangL','mabangD','mabangMenu','teaMed','gayageum','cabin','c0_name','c0_phone'];
const ERP_KEYS_ = () => [...ERP_BASE, ...PROG_KEYS(), ...STF_KEYS()];   // 프로그램은 견적서 품목에 따라 늘어남
const erpSnap = () => Object.fromEntries(ERP_KEYS_().map(k=>[k, rec[k]||'']));
const erpDiff = (a,b) => [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>(a[k]||'')!==(b[k]||'')).map(k=>{ const x=a[k]||'', y=b[k]||'', l=LABEL[k]||k; return !x?`${l} ${y} 추가`:!y?`${l} ${x} 삭제`:`${l} ${x} → ${y}`; });
const nextDay = iso => { const d=new Date(iso); d.setDate(d.getDate()+1); return d; };
// 하위 과업 칸: 기본 하위 과업(견적서 · 거래명세서) + 직접 추가한 세부 과제(× 로 빼기) + 추가 입력칸
function subsHTML(t){
  const ds=DOC_SUBS[t.id]||[];
  const rows=[...ds.map(([k,l])=>`<label class="tsub${t.subs&&t.subs[k]?' on':''}"><input type="checkbox" data-tsub="${esc(t.id)}|${k}"${t.subs&&t.subs[k]?' checked':''}> ${l}</label>`),
    ...(t.xsubs||[]).map(x=>`<div class="tsub-row"><label class="tsub${x.done?' on':''}"><input type="checkbox" data-xsub="${esc(t.id)}|${esc(x.id)}"${x.done?' checked':''}> ${esc(x.title)}</label><button type="button" class="tsub-del" data-xdel="${esc(t.id)}|${esc(x.id)}" title="세부 과제 빼기">×</button></div>`)];
  return `<div class="tsubs">${rows.join('')}<div class="tsub-add"><input data-ime="ko" data-xadd="${esc(t.id)}" placeholder="+ 세부 과제 추가 (적고 Enter)" autocomplete="off"><button type="button" class="btn" data-xaddbtn="${esc(t.id)}">추가</button></div></div>`;
}
function addXsub(tid){
  const inp=document.querySelector(`#taskList [data-xadd="${CSS.escape(tid)}"]`), v=inp ? inp.value.trim() : ''; const t=tasks.find(x=>x.id===tid);
  if(!v || !t) return;
  (t.xsubs ||= []).push({id:'x'+Date.now().toString(36), title:v, done:false});
  inp.blur(); renderTasks(); renderSide(); autoSave();
  document.querySelector(`#taskList [data-xadd="${CSS.escape(tid)}"]`)?.focus();   // 이어서 또 적을 수 있게
}
const consultTask = t => t.id==='tour' || t.custom;   // 예약상담에서 보이는 과업: 사전답사 전산 예약 + 직접 추가한 과업
function renderTasks(){
  syncAutoTasks();
  const consultOnly = effStage(rec)==='예약상담';   // 예약상담: 자동 과업은 없고(사전답사 전산 예약만) 직접 추가한 과업은 그대로
  $('#taskAdd').hidden = false;
  const shownTasks = consultOnly ? tasks.filter(consultTask) : tasks;
  if(consultOnly && !shownTasks.length){ paintDocBtns(); $('#taskList').innerHTML='<li class="hint" style="list-style:none;margin:0">예약상담은 자동으로 생기는 과업이 없습니다. 필요한 일은 위 칸에 직접 추가해 주세요.</li>'; $('#taskHint').textContent=''; return; }
  paintDocBtns();
  const box=$('#taskList'), ae=document.activeElement, focus=box.contains(ae) && (ae.tagName==='TEXTAREA' || (ae.tagName==='INPUT' && ae.type!=='checkbox' && !ae.readOnly && !ae.classList.contains('dpick')));   // 메모 · 글자 칸에 쓰는 중일 때만 다시 그리지 않음
  const changeTag = t => { const txt=taskText(t); return !t.copied ? '' : t.copied===txt ? '<span class="hint" style="margin:0">붙여넣은 내용과 같음</span>' : '<span class="chg">예약 내용이 바뀜 · 다시 복사해서 붙여넣기</span>'; };
  if(focus){   // 메모를 쓰는 중이면 문구만 새로
    tasks.forEach(t=>{ const pre=document.getElementById('tpre_'+t.id); if(pre && document.activeElement!==pre) pre.value=taskText(t); const c=document.getElementById('tchg_'+t.id); if(c) c.innerHTML=changeTag(t); });
    return;
  }
  const SUB = { erp:'전산에 예약을 등록하고, 아래 문구를 전산 비고에 붙여넣은 뒤 체크하세요.', tax:'고객 안내 후, 아래 내용으로 세금계산서 발행을 요청하세요.',
    quote:'아래 세 가지를 모두 체크하면 완료됩니다. 버튼을 누르면 견적서 사이트에 예약 내용이 채워집니다. 출력하면 PDF · 엑셀이 드라이브에도 저장되고 여기에 링크가 붙습니다.',
    stmt:'아래 세 가지를 모두 체크하면 완료됩니다. 버튼을 누르면 거래명세서로 채워집니다. 출력하면 PDF · 엑셀이 드라이브에도 저장되고 여기에 링크가 붙습니다.' };
  box.innerHTML = shownTasks.map(t=>{
    const txt=taskText(t);
    const sub = t.id==='paycheck' ? `결제링크 보낸 다음날(${mdLabel(ymd(nextDay(t.at)))}) 아침에 이 창을 열면 확인 알림이 뜹니다.`
      : t.id==='tour' ? `사전 답사를 사유원 전산에 예약하고 체크하세요. 답사 정보는 아래 메모에 있습니다.`
      : t.id==='tbdcall' ? (rec.tbd ? `미정: <b>${esc(rec.tbd)}</b><br>답변일(${esc(mdLabel(taskDue(t)))})에 고객님께 연락해 확인하고, 정해진 내용을 칸에 채운 뒤 체크하세요.` : '미정 항목이 모두 정해졌습니다.')
      : t.id==='onsitecall' ? `현장 결제 예약입니다. 기한(${esc(mdLabel(taskDue(t)))} · 방문일 전주 목요일)에 고객님께 연락해 <b>최종 인원</b>을 확인하고, <b>당일 인원 변경이 어렵다는 점</b>을 다시 한번 안내하세요.`
      : t.id==='mbcall' ? `몽몽마방 식당에 전화해서 확인하고 체크하세요. (${esc([rec.date&&dateLabel(rec.date), rec.mabangL&&rec.mabangL+'명'].filter(Boolean).join(' · ')||'방문일 · 인원 미정')})<br>① 고객님이 말씀하신 시각 <b>${esc(rec.mabangTime||'(시간 미입력)')}</b> 가능한지<br>② 그날 예약 가능한 시간이 모두 언제인지 → 아래 메모에 적어 두기`
      : t.id==='mbmenu' ? (t.done ? '몽몽마방 메뉴를 골랐습니다.' : `몽몽마방 식사에서 메뉴(${esc(mbMenus().map(m=>m.name).join(' · '))}) 중 하나를 고르세요. 고르면 자동으로 완료됩니다.`)
      : t.id==='goodsprep' ? `굿즈: <b>${esc(goodsText(rec)||'없음')}</b>${goodsParse(rec.goods).map(g=>itemNote('g:'+g.src)?` · ${esc(goodsName(g.src))} 비고: ${esc(itemNote('g:'+g.src))}`:'').join('')}<br>방문 전날(${esc(rec.date?mdLabel(taskDue(t)):'방문일 미정')})까지 준비하고 체크하세요. 그날 13시 · 17시에 알림이 뜹니다.`
      : t.id==='staffbrief' ? `방문 전날(${esc(rec.date?mdLabel(taskDue(t)):'방문일 미정')}) 각 담당자에게 아래 일정을 전달하고 체크하세요. 영업 담당이 이 예약의 프로그램 · 굿즈를 모두 챙깁니다.`
      : t.id==='progstaff' ? ((t.missing||[]).length ? `담당이 비어 있는 칸: <b>${esc(t.missing.join(' · '))}</b><br>프로그램 · 굿즈 옆 <b>담당</b>에 이름을 넣으면 자동으로 완료됩니다. (개별 · 시간 프로그램 · 굿즈 모두 담당 필수)` : '프로그램 · 굿즈 담당을 모두 넣었습니다.')
      : t.id==='erpcheck' ? (!erpList.length ? '전산에 예약을 넣은 뒤 <b>전산 내역을 붙여 넣어</b> 실제 예약이 이 예약 내용과 같은지 확인하세요. <b>할인 합계</b>와 <b>총 금액</b>이 같으면 저절로 완료됩니다.'
          : `<span class="erp-ck">${erpCheckHTML(erpCheck())}</span><br>${t.done ? '전산 내역과 예약 내용이 같습니다.' : '다른 곳을 전산이나 예약 내용에서 고친 뒤 전산 내역을 다시 붙여 넣으세요 (예약 내역 줄의 할인 · 기타 할인 · 인원 확인).'}`)
      : t.id==='erpfix' ? ((t.changes||[]).length ? `전산 등록 후 바뀐 내용: <b>${esc(t.changes.join(' · '))}</b><br>전산 예약을 고치고 비고도 새 문구로 바꾼 뒤 체크하세요.` : '전산에 반영했습니다.')
      : SUB[t.id] || '';
    const docBtn = (t.id==='quote'||t.id==='stmt') ? `<div class="tbtn"><button type="button" class="btn" data-tquote="${t.id==='stmt'?'statement':'quote'}">${t.id==='stmt'?'거래명세서 만들기':'견적서 만들기'}</button></div>` : '';
    const files = t.id!=='tax' && (t.files||[]).length ? `<div class="tfiles">${t.files.map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener">📄 ${esc(f.name)}</a>`).join('')}</div>` : '';
    const due=taskDue(t), late=!t.done && due<todayYmd(); const fold=t.done && !openDone.has(t.id);   // 끝난 과업은 첫 줄만 (누르면 펼침)
    return `<li class="task${t.done?' done':late?' late':''}${fold?' collapsed':''}" data-id="${esc(t.id)}">
      <div class="task-h">${t.done?'':`<span class="tdrag" title="끌어서 순서 바꾸기">⠿</span>`}<label class="task-c"><input type="checkbox" data-tk="${esc(t.id)}"${t.done?' checked':''}><span>${esc(t.title)}</span></label>${t.done?`<button type="button" class="texp" data-texp="${esc(t.id)}">${fold?'자세히 ▾':'접기 ▴'}</button>`:''}
        ${t.done?'':`<span class="tmove"><button type="button" data-tmv="${esc(t.id)}|-1" title="위로">▲</button><button type="button" data-tmv="${esc(t.id)}|1" title="아래로">▼</button></span>`}<label class="tdue" title="마감일 · 바꿀 수 있음">${late?'기한 지남 ':'마감 '}${dboxHTML(`data-tdue="${esc(t.id)}"`, due)}</label>${t.custom?`<button type="button" class="del" data-tdel="${esc(t.id)}" title="과업 삭제">×</button>`:''}</div>
      ${sub?`<div class="sub">${sub}</div>`:''}${subsHTML(t)}${docBtn}${files}
      ${txt?`<textarea class="tnote${t.noteEdit?' edited':''}" id="tpre_${esc(t.id)}" data-tnote="${esc(t.id)}" spellcheck="false" title="자동으로 만든 문구 · 직접 고칠 수 있음">${esc(txt)}</textarea><div class="tbtn"><button type="button" class="btn" data-tcopy="${esc(t.id)}">${t.id.startsWith('erp')?'비고 문구 복사':'문구 복사'}</button>${t.noteEdit?`<button type="button" class="btn" data-tregen="${esc(t.id)}" title="고친 내용을 버리고 예약 내용으로 다시 만들기">다시 만들기</button><span class="hint" style="margin:0">직접 고친 문구</span>`:''}<span id="tchg_${esc(t.id)}">${changeTag(t)}</span></div>`:''}
      ${t.id==='tax' ? `<div class="tfiles">${(t.files||[]).map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener">📄 ${esc(f.name)}</a>`).join('')}
        <label class="btn up${upBusy?' busy':''}">${upBusy?'올리는 중…':(t.files||[]).length?'사업자등록증 추가로 올리기':'사업자등록증 올리기'}<input type="file" data-tup="${esc(t.id)}" accept="image/*,application/pdf" hidden${upBusy?' disabled':''}></label>
        <span class="hint" style="margin:0">사진 · PDF, 10MB 이하 · 구글 드라이브 '사유원 단체예약 서류' 폴더에 저장</span></div>` : ''}
      <textarea data-tm="${esc(t.id)}" placeholder="메모">${esc(t.memo||'')}</textarea>
    </li>`; }).join('');
  $('#taskHint').textContent = tasks.length ? (editingId ? '체크와 복사는 바로 저장됩니다. 메모는 칸을 벗어나면 저장됩니다.' : '저장하면 과업도 함께 저장됩니다.') : '';
}
const autoSave = () => { if(editingId) save({auto:true}); };   // 과업 체크 · 메모 등은 바로 자동 저장 (수정 기록은 이 세션 줄에 모임)
// 사업자등록증 올리기 → Apps Script 가 구글 드라이브에 저장하고 링크를 돌려줌 → 과업에 링크 보관
let upBusy=false;
async function uploadFile(t, file){
  if(!SHARED_URL || !getKey()){ toast('공유 기록에 연결된 뒤에 올릴 수 있습니다.'); return; }
  if(!/^(image\/|application\/pdf$)/.test(file.type)){ toast('사진이나 PDF만 올릴 수 있습니다.'); return; }
  if(file.size > 10*1024*1024){ toast('10MB 이하 파일만 올릴 수 있습니다.'); return; }
  upBusy=true; renderTasks();
  try{
    const data = await new Promise((ok,no)=>{ const fr=new FileReader(); fr.onload=()=>ok(String(fr.result).split(',')[1]); fr.onerror=()=>no(fr.error); fr.readAsDataURL(file); });
    const j = await callApi({action:'upload', name:file.name, mime:file.type, data, org:rec.org||'', date:rec.date||'', kind:'사업자등록증'});
    (t.files ||= []).push({name:j.file.name, url:j.file.url, at:j.file.at});
    toast(editingId ? '올렸습니다.' : '올렸습니다. 예약을 저장하면 링크가 함께 저장됩니다.');
    upBusy=false; renderTasks(); autoSave();
  }catch(e){
    upBusy=false; renderTasks();
    toast(e.code==='bad_action' ? 'Apps Script를 새 버전으로 배포해야 올릴 수 있습니다.' : '올리지 못했습니다: '+e.message);
  }
}
$('#taskList').addEventListener('change', e=>{
  const xs=e.target.dataset.xsub; if(xs){ const [tid,xid]=xs.split('|'), t=tasks.find(x=>x.id===tid), x=t && (t.xsubs||[]).find(s=>s.id===xid); if(x){ x.done=e.target.checked; renderTasks(); renderSide(); autoSave(); } return; }   // 직접 추가한 세부 과제 체크
  const ts=e.target.dataset.tsub; if(ts){ const [tid,k]=ts.split('|'), t=tasks.find(x=>x.id===tid); if(t){ t.subs=t.subs||{}; t.subs[k]=e.target.checked; renderTasks(); renderSide(); autoSave(); } return; }   // 하위 과업 체크
  const du=e.target.dataset.tdue; if(du){ const t=tasks.find(x=>x.id===du); if(t && e.target.value){ t.due=e.target.value; t.dueSet=1; t.dueSetAt=new Date().toISOString(); e.target.blur(); renderTasks(); renderSide(); autoSave(); } return; }   // 마감일 바꾸기
  const up=e.target.dataset.tup;
  if(up){ const t=tasks.find(x=>x.id===up), f=e.target.files[0]; if(t && f) uploadFile(t, f); return; }
  const id=e.target.dataset.tk; if(!id) return; const t=tasks.find(x=>x.id===id); if(!t) return;
  if(id==='erpcheck'){ e.target.checked=!!t.done; toast('전산 내역을 붙여 넣어 예약 내용과 총 금액 · 할인이 같으면 저절로 완료됩니다.'); if(!erpList.length) $('#erpPasteBtn')?.click(); return; }   // 직접 체크하지 않음
  if((id==='erp'||id==='erpfix') && e.target.checked){ e.target.checked=false; askErpForTask(id); return; }   // 전산 예약 완료 = 전산 내역을 붙여넣어 예약 내용과 맞는지 확인한 뒤
  t.done=e.target.checked; t.doneAt=t.done?new Date().toISOString():'';
  if(t.subs) Object.keys(t.subs).forEach(k=>t.subs[k]=t.done); (t.xsubs||[]).forEach(x=>x.done=t.done);   // 위 체크 = 하위 과업 모두 해결 (끄면 모두 해제)
  if(id==='erp'){ rec.erp = t.done ? ymd(new Date()) : ''; touched.add('erp'); }
  if(id==='erpfix' && t.done){ const e=tasks.find(x=>x.id==='erp'); if(e) e.base=erpSnap(); t.changes=[]; }   // 전산에 고친 지금 내용을 기준으로
  renderSide(); autoSave();
});
$('#taskList').addEventListener('click', e=>{
  const rg=e.target.closest('[data-tregen]'); if(rg){ const t=tasks.find(x=>x.id===rg.dataset.tregen); if(t){ t.noteEdit=''; renderTasks(); renderSide(); autoSave(); toast('예약 내용으로 문구를 다시 만들었습니다.'); } return; }
  const tx=e.target.closest('[data-texp]'); if(tx){ const id=tx.dataset.texp; openDone.has(id) ? openDone.delete(id) : openDone.add(id); tx.blur(); renderTasks(); return; }   // 끝난 과업 펼치기 / 접기
  const xd=e.target.closest('[data-xdel]'); if(xd){ const [tid,xid]=xd.dataset.xdel.split('|'), t=tasks.find(x=>x.id===tid); if(t){ t.xsubs=(t.xsubs||[]).filter(s=>s.id!==xid); renderTasks(); renderSide(); autoSave(); } return; }   // 세부 과제 빼기
  const xb=e.target.closest('[data-xaddbtn]'); if(xb){ addXsub(xb.dataset.xaddbtn); return; }
  const mv=e.target.closest('[data-tmv]'); if(mv){ const [id,dir]=mv.dataset.tmv.split('|'), consult=effStage(rec)==='예약상담';   // 과업 순서 바꾸기 (안 끝난 과업끼리)
    const open=tasks.filter(t=>!t.done && (!consult || consultTask(t))), i=open.findIndex(t=>t.id===id), j=i+(+dir);
    if(i<0 || j<0 || j>=open.length) return; [open[i],open[j]]=[open[j],open[i]]; open.forEach((t,k)=>{ t.ord=k*10; t.ordSet=1; });
    renderTasks(); autoSave(); return; }
  const c=e.target.dataset.tcopy, d=e.target.dataset.tdel, q=e.target.dataset.tquote;
  if(q){ openQuote(q); return; }
  if(c){ const t=tasks.find(x=>x.id===c); const txt=taskText(t); copy(txt, '복사했습니다. 붙여넣으세요.'); t.copied=txt; renderTasks(); autoSave(); }
  if(d){ e.preventDefault(); document.activeElement.blur(); tasks=tasks.filter(x=>x.id!==d); renderTasks(); autoSave(); toast('과업을 지웠습니다.'); }   // × 에 포커스가 남으면 목록이 다시 안 그려져서 blur
});
// 과업 순서: 왼쪽 ⠿ 를 잡고 끌어서 놓기 (안 끝난 과업끼리, ▲▼ 와 같은 순서 값)
let dragId=null;
const dragOpen = () => { const consult=effStage(rec)==='예약상담'; return tasks.filter(t=>!t.done && (!consult || consultTask(t))); };
$('#taskList').addEventListener('mousedown', e=>{ const h=e.target.closest('.tdrag'); if(h) h.closest('li.task').draggable=true; });
$('#taskList').addEventListener('dragstart', e=>{ const li=e.target.closest('li.task'); if(!li || !li.draggable) return; dragId=li.dataset.id; li.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain', dragId); }catch(_){} });
$('#taskList').addEventListener('dragover', e=>{ if(!dragId) return; const li=e.target.closest('li.task'); if(!li || li.classList.contains('done')) return; e.preventDefault();
  document.querySelectorAll('#taskList li.task').forEach(x=>x.classList.remove('drop-before','drop-after'));
  if(li.dataset.id!==dragId){ const r=li.getBoundingClientRect(); li.classList.add(e.clientY < r.top+r.height/2 ? 'drop-before' : 'drop-after'); } });
$('#taskList').addEventListener('drop', e=>{ if(!dragId) return; e.preventDefault(); const li=e.target.closest('li.task'); if(!li || li.dataset.id===dragId) return;
  const before=li.classList.contains('drop-before'), open=dragOpen(), from=open.findIndex(t=>t.id===dragId); if(from<0) return;
  const [moved]=open.splice(from,1); let to=open.findIndex(t=>t.id===li.dataset.id); if(to<0) return; if(!before) to++;
  open.splice(to,0,moved); open.forEach((t,k)=>{ t.ord=k*10; t.ordSet=1; }); dragId=null; renderTasks(); autoSave(); });
document.addEventListener('mouseup', ()=>{ if(!dragId) document.querySelectorAll('#taskList li.task[draggable="true"]').forEach(x=>x.draggable=false); });   // 끌지 않고 놓으면 원래대로 (메모 글자 선택 등)
// 끌다가 화면 위 · 아래 끝에 가까이 가면 저절로 스크롤 (창과 과업 칸을 감싼 스크롤 영역 모두)
const scrollParents = el => { const out=[]; for(let p=el.parentElement; p; p=p.parentElement){ const s=getComputedStyle(p); if(/(auto|scroll)/.test(s.overflowY) && p.scrollHeight>p.clientHeight) out.push(p); } return out; };
document.addEventListener('dragover', e=>{ if(!dragId) return; const EDGE=70, H=window.innerHeight, sp=e.clientY<EDGE ? -Math.ceil((EDGE-e.clientY)/3) : e.clientY>H-EDGE ? Math.ceil((e.clientY-(H-EDGE))/3) : 0; if(!sp) return;
  window.scrollBy(0, sp); scrollParents($('#taskList')).forEach(p=>{ const r=p.getBoundingClientRect(); if(e.clientY<r.top+EDGE || e.clientY>r.bottom-EDGE) p.scrollTop+=sp; }); });
$('#taskList').addEventListener('dragend', ()=>{ dragId=null; document.querySelectorAll('#taskList li.task').forEach(x=>{ x.draggable=false; x.classList.remove('dragging','drop-before','drop-after'); }); });
$('#taskList').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.isComposing && e.target.dataset.xadd!==undefined){ e.preventDefault(); addXsub(e.target.dataset.xadd); } });   // 세부 과제: 적고 Enter
$('#taskList').addEventListener('input', e=>{ const id=e.target.dataset.tnote; if(!id) return; const t=tasks.find(x=>x.id===id); if(!t) return; t.noteEdit=e.target.value; e.target.classList.add('edited'); startTimer(); });   // 문구 직접 고치기
$('#taskList').addEventListener('focusout', e=>{ const id=e.target.dataset.tnote; if(!id) return; const t=tasks.find(x=>x.id===id); if(!t) return; if(e.target.value.trim()===taskAuto(t).trim()) t.noteEdit=''; setTimeout(()=>{ renderTasks(); autoSave(); },0); });   // 자동 문구와 같아지면 자동으로
$('#taskList').addEventListener('input', e=>{ const id=e.target.dataset.tm; if(!id) return; const t=tasks.find(x=>x.id===id); if(t) t.memo=e.target.value; });
$('#taskList').addEventListener('focusout', e=>{ if(e.target.dataset.tm!==undefined) autoSave(); });
$('#taskAdd').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#taskAddIn').value.trim(); if(!v) return;
  tasks.push({id:'c'+Date.now().toString(36), title:v, custom:true, done:false, memo:'', at:new Date().toISOString(), due:todayYmd()}); $('#taskAddIn').value=''; renderTasks(); autoSave(); });   // 마감은 오늘 (바꿀 수 있음)
$('#memoBox').addEventListener('input', ()=>{ renderTasks(); if(window.__autoReady){ scheduleAuto(); saveViewSoon(); } });

// 견적서 사이트가 출력 후 드라이브에 올린 파일 링크를 같은 사이트 저장소(sy_intake_docs)로 돌려줌 → 그 예약의 견적서/거래명세서 과업에 붙이고 완료
const DOCS_LS='sy_intake_docs';
let takingDocs=false;
async function takeDocs(){
  if(takingDocs) return; takingDocs=true;
  try{
    let list=[]; try{ list=JSON.parse(localStorage.getItem(DOCS_LS)||'[]'); }catch(_){}
    if(!list.length) return;
    const left=[];
    for(const d of list){
      const id = d.doc==='statement' ? 'stmt' : 'quote', title = AUTO_TASKS[id], now=new Date().toISOString();
      const attach = ts => { let t=ts.find(x=>x.id===id); if(!t){ t={id, title, done:false, memo:'', at:now, due:todayYmd()}; ts.push(t); } t.files=[...(t.files||[]), ...d.files];
        const ds=DOC_SUBS[id]; t.subs={...Object.fromEntries(ds.map(([k])=>[k, !!t.done])), ...(t.subs||{}), make:true}; t.done=ds.every(([k])=>t.subs[k]); t.doneAt=t.done?now:''; };   // 출력해서 파일이 오면 하위 과업 '생성' 체크
      if(d.recId && d.recId===editingId){ attach(tasks); renderTasks(); await save(true); continue; }
      const r=(cache||[]).find(x=>x.id===d.recId);
      if(!r){ if(Date.now()-new Date(d.at)<7*864e5) left.push(d); continue; }   // 목록을 아직 못 받았으면 다음에
      const ph=parseHist(r); attach(ph.tasks); ph.h.push({t:now, by:savedOwner()||'', what:`[과업] ${title} 출력 · 드라이브 저장`});
      await store.put({...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now});
    }
    try{ left.length ? localStorage.setItem(DOCS_LS, JSON.stringify(left)) : localStorage.removeItem(DOCS_LS); }catch(_){}
    if(list.length>left.length){ await store.list(); toast('견적서 사이트에서 만든 파일을 과업에 붙였습니다.'); }
  } finally { takingDocs=false; }
}
window.addEventListener('storage', e=>{ if(e.key===DOCS_LS && e.newValue) takeDocs(); });
window.addEventListener('focus', ()=>{ if(window.__tasksReady) takeDocs(); });

// 결제 확인 알림:결제링크를 보낸 다음날부터, 이 창을 열면 아직 확인 안 한 예약을 띄움 (하루 한 번)
function duePayChecks(){
  const today=ymd(new Date());
  return (cache||[]).map(r=>{ const t=parseHist(r).tasks.find(t=>t.id==='paycheck' && !t.done); return t && ymd(new Date(t.at))<today ? {r,t} : null; }).filter(Boolean);
}
function checkPayPopup(force){
  const today=ymd(new Date()); let seen=''; try{ seen=sessionStorage.getItem('sayuwon_paycheck_seen')||''; }catch(_){}
  if(!force && seen===today) return;
  const due=duePayChecks();
  if(!due.length){ $('#payModal').hidden=true; return; }
  try{ sessionStorage.setItem('sayuwon_paycheck_seen', today); }catch(_){}
  $('#payList').innerHTML = due.map(({r,t})=>`<li><span class="who"><b>${esc(r.org||r.contact||'(업체 미정)')}</b> · 방문 ${esc(dateLabel(r.date))}${r.owner?` · ${esc(r.owner)}`:''}<br><small class="hint" style="margin:0">결제링크 ${esc(mdLabel(ymd(new Date(t.at))))} 전송${t.memo?` · ${esc(t.memo)}`:''}</small></span><button class="btn primary" data-pcdone="${esc(r.id)}">입금 확인함</button><button class="btn" data-pcopen="${esc(r.id)}">열기</button></li>`).join('');
  $('#payModal').hidden=false;
}
$('#payLater').onclick=()=>{ $('#payModal').hidden=true; };
$('#payList').addEventListener('click', async e=>{
  const done=e.target.dataset.pcdone, open=e.target.dataset.pcopen;
  if(open){ const r=cache.find(x=>x.id===open); $('#payModal').hidden=true; if(r) openRecordG(r); }
  if(done){
    const r=cache.find(x=>x.id===done); if(!r) return;
    if(editingId===done){ const t=tasks.find(x=>x.id==='paycheck'); if(t){ t.done=true; t.doneAt=new Date().toISOString(); } await save(true); }
    else {
      const ph=parseHist(r), now=new Date().toISOString(), t=ph.tasks.find(x=>x.id==='paycheck'); if(t){ t.done=true; t.doneAt=now; }
      ph.h.push({t:now, by:savedOwner()||'', what:'[과업] 결제 확인 완료'});
      await store.put({...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now});
    }
    await store.list(); toast('결제 확인으로 표시했습니다.'); checkPayPopup(true);
  }
});
const fmt=s=>dtLabel(s);
let listStage='예약접수';   // 목록은 예약접수 탭부터
let listSort = (()=>{ try{ return localStorage.getItem('sayuwon_list_sort')||'date'; }catch(_){ return 'date'; } })();   // 기본 방문일 순
document.addEventListener('click', e=>{ const b=e.target.closest('#sortSeg button'); if(b){ listSort=b.dataset.o; try{ localStorage.setItem('sayuwon_list_sort', listSort); }catch(_){} renderList(); } });
// 정렬: 방문일 순(가까운 날부터, 날짜 없으면 뒤) · 접수 순(최근 접수부터)
const listOrder = (a,b) => listSort==='saved' ? String(b.saved||'').localeCompare(String(a.saved||'')) : ((a.date||'9999')).localeCompare(b.date||'9999') || String(a.saved||'').localeCompare(String(b.saved||''));
// 담당자: 이름(전화번호), 여러 명이면 쉼표로
function contactCell(r){ const sp=v=>String(v||'').split(/\s*\/\s*/); const n=sp(r.contact), p=sp(r.phone);
  return n.map((x,i)=>[x.trim(), (p[i]||'').trim()]).filter(([x,y])=>x||y).map(([x,y])=>y ? `${esc(x)}(${esc(y)})` : esc(x)).join(', '); }
document.addEventListener('click', e=>{ const b=e.target.closest('#stageFilter button'); if(b){ listStage=b.dataset.f; const s=$('#listSearch'); if(s) s.value=''; renderList(); } });   // 탭을 누르면 검색어는 지움
let listSearchT=null; document.addEventListener('input', e=>{ if(e.target.id!=='listSearch') return; clearTimeout(listSearchT); listSearchT=setTimeout(renderList, 150); });
async function renderList(){
  // 예전 기록의 '단체예약'도 함께 (일반 문의·기타는 제외)
  const all=(await store.list()).filter(r=>['단체예약',...STAGES,...Object.keys(OLD_STAGE)].includes(r.callType||'단체예약'));
  const del=id=>`<span class="row-acts"><button class="btn act-fix" data-fix="${id}" title="목록에 보이는 단계 · 전산 · 견적서 · 거래명세서 상태 고치기">수정</button><button class="btn act-del" data-del="${id}" title="이 예약 삭제 (사유를 고른 뒤)">삭제</button></span>`;
  const needCall = r => /^자동 등록/.test(r.summary||'');
  const nCall = all.filter(needCall).length;
  // 단계: 시트 '통화 구분' 칸. 예전 '단체예약'은 결제로 판단. 관리자 사이트에서 온 예약은 이미 전산에 있음
  const stageOf = r => /^adm/.test(r.id) && !STAGES.includes(normStage(r.callType)) ? '예약접수' : STAGES.includes(normStage(r.callType)) ? normStage(r.callType) : stageAuto(unpackExtra(r).pay ? {...r, ...unpackExtra(r)} : r);
  const erpOf = r => /^adm/.test(r.id) || !!unpackExtra(r).erp;
  // 지난 예약: 방문일이 오늘보다 앞. 예약상담 · 예약접수 · 전산 미등록 탭에서는 빠지고 '지난 예약' 탭으로 (전체에는 모두)
  const today=todayYmd(), isPast = r => !!r.date && r.date < today, cur=all.filter(r=>!isPast(r)), past=all.filter(isPast);
  const counts = Object.fromEntries(STAGES.map(s=>[s, cur.filter(r=>stageOf(r)===s).length]));
  const noErp = cur.filter(r=>stageOf(r)!=='예약상담' && !erpOf(r)).length;
  $('#callCount').hidden = !nCall; $('#callCount').textContent = `전화 필요 ${nCall}`; $('#listCount').textContent = all.length;
  $('#adminHint').textContent = adminData?.updated ? `관리자 사이트 ${fmtAgo(adminData.updated)} 갱신 · ` : '';
  document.querySelectorAll('#stageFilter button').forEach(b=>{ const s=b.dataset.f; b.classList.toggle('on', s===listStage); b.textContent = s==='all' ? `전체 ${all.length}` : s==='noerp' ? `전산 미등록 ${noErp}` : s==='past' ? `지난 예약 ${past.length}` : `${s} ${counts[s]}`; });
  // 검색어가 있으면 탭과 상관없이 전체(지난 예약 포함)에서 업체명 · 담당자 이름 · 전화번호(숫자만 비교) · 영업 담당으로 찾음
  const q=String($('#listSearch')?.value||'').trim(), qd=q.replace(/\D/g,''), qs=q.replace(/\s/g,'').toLowerCase();
  const hit = r => { const t=[r.org, r.contact, r.owner, r.takenBy, r.email].join(' ').replace(/\s/g,'').toLowerCase(); return (qs && t.includes(qs)) || (qd.length>=3 && String(r.phone||'').replace(/\D/g,'').includes(qd)); };
  const shown = q ? all.filter(hit)
    : all.filter(r=> listStage==='all' ? true : listStage==='past' ? isPast(r) : isPast(r) ? false : listStage==='noerp' ? (stageOf(r)!=='예약상담' && !erpOf(r)) : stageOf(r)===listStage);
  document.querySelectorAll('#stageFilter button').forEach(b=>b.classList.toggle('dim', !!q));   // 검색 중에는 탭이 적용 안 됨
  document.querySelectorAll('#sortSeg button').forEach(b=>b.classList.toggle('on', b.dataset.o===listSort));
  listView = { shown, stageOf, erpOf };   // 엑셀로 내려받기에 씀
  const stageTag = r => { const s=stageOf(r); return `<span class="tag st-${s}">${s}</span>${s!=='예약상담' && !erpOf(r) ? ' <span class="tag call">전산 미등록</span>' : ''}`; };
  const order = (!q && listStage==='past' && listSort==='date') ? (a,b)=>String(b.date||'').localeCompare(String(a.date||'')) : listOrder;   // 지난 예약은 최근 방문부터
  $('#listBody').innerHTML=shown.slice().sort(order).map(r=>`<tr class="r" data-id="${r.id}"><td class="num">${dateLabel(r.date)}</td><td>${stageTag(r)}</td><td>${needCall(r)?'<span class="tag call">전화 필요</span> ':''}${esc(r.org||(needCall(r)?`예약자 ${r.contact||''}`:''))}${needCall(r)?`<br><small class="hint">${esc((r.summary||'').replace(/^자동 등록 · 전화 필요 · /,''))}</small>`:''}</td><td class="contacts-cell">${contactCell(r)}</td><td class="num">${esc(r.people)}</td><td class="num">${esc((r.tin||'')+(r.tout?'~'+r.tout:''))}</td><td>${esc(mealSum(r))}</td><td>${docTag(r,"quote")}</td><td>${docTag(r,"stmt")}</td><td class="owner">${esc(r.owner||r.takenBy)}</td><td class="num">${fmt(r.saved)}</td><td class="acts">${del(r.id)}</td></tr>`).join('')
    || `<tr><td colspan="12" class="hint">${q ? `'${esc(q)}'(으)로 찾은 예약이 없습니다.` : all.length?'이 구분에 해당하는 예약이 없습니다.':'저장한 단체예약이 없습니다.'}</td></tr>`;
  document.querySelectorAll('#listBody tr.r').forEach(tr=>tr.onclick=async e=>{
    if(e.target.dataset.del){ e.stopPropagation(); openDel(e.target.dataset.del); return; }
    if(e.target.dataset.fix){ e.stopPropagation(); openFix(e.target.dataset.fix); return; }
    const r=cache.find(x=>x.id===tr.dataset.id); if(!r) return;
    openRecordG(r);
  });
  renderInfo(curInfoKey);
}
// 저장된 예약 하나를 칸에 불러오기
function openRecord(r){
    newCall(false);
    KEYS.forEach(k=>{ rec[k]=r[k]||''; if(rec[k]) touched.add(k); });
    LEGACY_KEYS.forEach(k=>{ if(r[k]) rec[k]=r[k]; });   // 예전 프로그램 값은 그대로 들고 있다가 다시 저장
    if(r.mabangD) rec.mabangD=r.mabangD;   // 예전 '마방 디너' 값도 그대로
    if(!rec.owner) rec.owner=savedOwner();   // 자동 등록된 예약 등 담당이 비어 있으면 이 컴퓨터의 영업 담당
    const ex=unpackExtra(r); Object.assign(rec,ex); Object.keys(ex).forEach(k=>touched.add(k));
    if(!rec.pay) rec.pay='미정';   // 결제를 안 고른 예전 기록은 미정으로
    if(!rec.gate) rec.gate='미정';   // 입장문을 안 고른 예전 기록도 미정으로
    syncPayTbd(rec);   // 결제가 미정이면 미정 항목 '결제 방법'
    if(/^adm/.test(r.id) && !rec.erp) rec.erp='관리자 예약';   // 관리자 사이트에서 온 예약은 이미 전산에 있음
    rec.stage = STAGES.includes(normStage(r.callType)) && normStage(r.callType)!==stageAuto(rec) ? normStage(r.callType) : '';   // 결제로 정해지는 단계와 다를 때만 직접 고른 것으로
    const cs=splitContacts(r); Object.assign(rec,cs); Object.keys(cs).forEach(k=>{ if(cs[k]) touched.add(k); });
    nContacts=Math.max(1,nContactsOf(rec)); editingId=r.id; $('#memoBox').value=r.note||'';
    const ph=parseHist(r); hist=ph.h; tasks=ph.tasks; erpList=ph.erp||[]; memos=ph.memos||[];
    { const o=(r.owner||r.takenBy||'').trim(), me=savedOwner(); lockOwner = o && me && o!==me ? o : ''; } paintLock();   // 남이 담당인 예약: 잠금 (메모만)
    renderContacts(); renderForm(); resetWarn(true); baseSnap=snap(); SID=Math.random().toString(36).slice(2); lastAuto=null; clearTimeout(autoT); renderHist(); paintDirty(); closeList(); window.scrollTo({top:0,behavior:"smooth"});
}

// 관리자 사이트에서 지금 가져오기 (평소에는 Apps Script 가 15분마다 자동으로)
$('#adminSyncBtn').onclick=async()=>{
  if(!SHARED_URL){ toast('공유 저장소가 연결돼 있어야 합니다.'); return; }
  const b=$('#adminSyncBtn'); b.disabled=true; b.textContent='가져오는 중…';
  try{
    const j=await callApi({action:'syncAdmin'});
    if(j.admin) { adminData=j.admin; writeJSON(ADMIN_LS,adminData); }
    toast(`가져왔습니다 · 15명 이상 ${j.result.big}건 중 새로 ${j.result.added}건 등록`);
    await pull();
  }catch(e){
    toast(e.code==='bad_action' ? 'Apps Script를 새 버전으로 다시 배포해야 합니다.' : '가져오지 못했습니다: '+e.message);
  }finally{ b.disabled=false; b.textContent='관리자 사이트에서 지금 가져오기'; }
};

// ===================== 새 통화·단축키 =====================
function newCall(withToast=true){
  resetState(); clearInterval(timerInt); tick(); $('#memoBox').value=''; status('');
  hist=[]; baseSnap=null; tasks=[]; erpList=[]; tbdAuto=false; memos=[]; lockOwner=''; { const hd=document.getElementById('histDet'); if(hd) hd.open=false; }   // 수정 기록은 예약을 열 때마다 접어 둠
  renderHist(); if(typeof paintLock==='function') paintLock();
  renderContacts(); renderForm(); resetWarn(false); emptySnap=snap(); SID=Math.random().toString(36).slice(2); lastAuto=null; clearTimeout(autoT); renderHist(); paintDirty();
  if(withToast){ toast('새 통화를 시작합니다.'); $('#memoBox').focus(); }
}
$('#newBtn').onclick=()=>guardLeave(()=>newCall());
// ===================== 가격표 =====================
// 가격은 견적서&거래명세서 사이트에서 그때그때 읽어 온다 → 그 사이트의 품목·가격이 바뀌면 여기도 바뀜
//  · 기본 품목: 그 사이트 페이지의 CATALOG_RAW (품목 | 가격 | 할인 대상)와 굿즈·단체 프로그램 목록
//  · 품목 관리에서 바꾼 것: 공유 시트(QUOTE_SHARED_URL)의 가격·숨김·추가 품목
// 불러오기 전이나 실패하면 마지막으로 받은 것을 쓴다
const QUOTE_PAGE = /github\.io$/.test(location.hostname) ? 'https://hyunbin5786.github.io/sayuwon-sales/document/' : 'document/index.html';   // 견적서 사이트 (이 사이트 안 document/ · 예전 주소 sayuwon-invoice-quotation 도 그대로)
const QUOTE_DATA = (/github\.io$/.test(location.hostname) ? 'https://hyunbin5786.github.io/sayuwon-sales/document/' : 'document/') + 'js/document.js';   // 품목 목록(CATALOG_RAW · 굿즈 · 단체 프로그램 · TAX_SPLIT)이 들어 있는 견적서 코드
const QUOTE_SHARED_URL = "https://script.google.com/macros/s/AKfycbyFMeWFtokUB9FW44ZRrOMssIA_2jJzKC9dhjDR7c4WgdPxsaqzT1aLbLWmpIwvVMmY/exec";
const PRICE_EXCLUDE = /쉐프\s*특선|^음료쿠폰\(몽몽차방\)$|^네이버/;   // 가격표에서 뺀 품목
let quoteCat = readJSON('sayuwon_quote_cat', null), priceLoaded = null;
const normSrc = s => String(s||'').replace(/\s/g,'');
function parseQuotePage(html){
  const m = html.match(/var CATALOG_RAW = \[([\s\S]*?)\];/); if(!m) throw new Error('품목 목록을 찾지 못함');
  const raw = [...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
  const list = name => { const mm = html.match(new RegExp('\\[([^\\]]*)\\]\\.forEach\\(function\\(n\\)\\{\\s*' + name + '\\[n\\]')); return mm ? [...mm[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]) : []; };
  let mbName={}; try{ mbName=JSON.parse((html.match(/var MABANG_NAME = (\{[^}]*\});/)||[])[1]||'{}'); }catch(_){}
  let tax={}; try{ tax=JSON.parse((html.match(/var TAX_SPLIT = (\{[\s\S]*?\});/)||[])[1]||'{}'); }catch(_){}   // 기본 과세 · 비과세 [과세, 비과세]
  return { raw, gtime:list('GROUP_TIME'), geach:list('GROUP_EACH'), goods:list('GOODS'), mabang:list('MABANG'), mbName, tax };
}
async function loadQuotePrices(){
  try{
    const [html, shared] = await Promise.all([
      fetch(QUOTE_DATA + '?t=' + Date.now()).then(r=>r.text()),
      fetch(QUOTE_SHARED_URL).then(r=>r.json()).catch(()=>null)
    ]);
    const p = parseQuotePage(html);
    const data = (shared && shared.data) || (quoteCat && {edits:quoteCat.edits, added:quoteCat.added}) || {};
    quoteCat = { ...p, edits: data.edits||{}, added: data.added||[], at: new Date().toISOString() };
    writeJSON('sayuwon_quote_cat', quoteCat); priceLoaded = true;
    addCatalogProgs(quoteCat).forEach(f=>{ document.querySelector('#opt_'+OPT[f[0]].id+' .fields')?.insertAdjacentHTML('beforeend', isSub(f[1]) ? fieldHTML(f[1], isStf(f[1]) ? '담당' : SUB_NAME[f[1].split('_')[0]], '', 'sub'+(isStf(f[1])?' sub-stf':''), isStf(f[1])) : fieldHTML(f[1],f[2],'','pbase',false)); paintFields(); });   // 견적서 품목에 새 단체 품목이 생기면 칸 추가
  }catch(_){ priceLoaded = false; }
  paintFields(); renderPrice(); if(window.__tasksReady) renderTasks();   // 몽몽마방 메뉴 · 가격도 새로
}
// 품목 관리: 견적서 사이트를 ?catalog=1 로 띄우면 품목 관리 창만 나옴. 저장 · 닫기를 알려 주면 가격 · 메뉴를 다시 불러옴
const QUOTE_CAT_URL = /github\.io$/.test(location.hostname) ? 'https://hyunbin5786.github.io/sayuwon-sales/#catalog' : './#catalog';   // 품목관리 = 시스템의 #catalog (팝업 안에서는 품목 관리 창으로 바뀜)
function openCatalog(){ const [u,h]=QUOTE_CAT_URL.split('#'); $('#catFrame').src = u + '?t=' + Date.now() + '#' + h; $('#catModal').hidden = false; }
function closeCatalogModal(){ $('#catModal').hidden = true; $('#catFrame').src = 'about:blank'; loadQuotePrices(); }
document.addEventListener('click', e=>{ if(e.target.closest('[data-open-cat]')){ e.preventDefault(); openCatalog(); } });
window.addEventListener('message', e=>{
  if(!e.data || e.data.type!=='sy-catalog' || e.source!==$('#catFrame').contentWindow) return;
  if(e.data.ev==='close') closeCatalogModal();
  if(e.data.ev==='saved'){ loadQuotePrices(); markDb('cat'); }   // 품목 관리 저장도 DB 저장 시각에
});
// 바깥을 누르거나 Esc: 품목 관리 창에 닫기를 부탁 (저장 안 한 변경이 있으면 거기서 물음)
const askCatClose = () => $('#catFrame').contentWindow?.postMessage({type:'sy-catalog', ev:'close-request'}, '*');
$('#catModal').addEventListener('click', e=>{ if(e.target.id==='catModal') askCatClose(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#catModal').hidden){ e.preventDefault(); askCatClose(); } });
// 견적서 사이트와 같은 방식으로 품목 목록을 만든다 (숨긴 품목 제외, 바꾼 가격 반영, 추가 품목 포함)
// 품목 관리에서 '몽몽마방 메뉴' 구분을 없애고 식사로 (2026-11-14): 식사 중 품목명이 '몽몽마방 '으로 시작하는 것(예: 몽몽마방 런치)도 몽몽마방 메뉴로
const mbKind = (k, src) => k==='food' && /^몽몽마방\s/.test(String(src||'')) ? 'mabang' : k;
function catalogItems(){
  if(!quoteCat) return [];
  const has = (arr, s) => (arr||[]).some(x=>normSrc(x)===normSrc(s));
  const kindOf = src => /\(관람,/.test(src) ? 'package' : has(quoteCat.mabang?.length ? quoteCat.mabang : MB_DEF.map(m=>m[0]), src) ? 'mabang' : has(quoteCat.gtime,src) ? 'gtime' : has(quoteCat.geach,src) ? 'geach' : has(quoteCat.goods,src) ? 'goods'
    : (/관람/.test(src) && !/관람권|관람식사권/.test(src)) ? 'view' : 'food';
  const out=[], seen={};
  quoteCat.raw.forEach(line=>{
    const [src, price, disc] = line.split('|'); if(seen[normSrc(src)]) return; seen[normSrc(src)]=1;
    const e = (quoteCat.edits||{})[src] || {};
    if(e.hidden) return;
    out.push({ src, name: e.name, price: e.price!=null ? Number(e.price) : (price ? Number(price) : null), disc: e.disc!=null ? !!e.disc : disc==='1', kind: mbKind((e.kind==='food' && MB_DEF.some(m=>normSrc(m[0])===normSrc(src))) ? 'mabang' : (e.kind || kindOf(src)), src),
      taxable: e.taxable!=null ? Number(e.taxable) : ((quoteCat.tax||{})[src]||[])[0], taxfree: e.taxfree!=null ? Number(e.taxfree) : ((quoteCat.tax||{})[src]||[])[1] });   // 과세 · 비과세 (품목 관리 값 우선)   // 예전에 '식사'로 바꿔 둔 기본 몽몽마방 메뉴도 메뉴로
  });
  (quoteCat.added||[]).forEach(a=>{ if(a.hidden) return; out.push({ src: a.src || a.name, name: a.name, price: a.price!=null ? Number(a.price) : null, disc: !!a.disc, kind: mbKind(a.kind || 'food', a.src || a.name), taxable: a.taxable!=null ? Number(a.taxable) : undefined, taxfree: a.taxfree!=null ? Number(a.taxfree) : undefined }); });
  return out;
}
// 과세 · 비과세 1인 금액 (품목 관리): 비과세 = 사유원(입장료), 과세 = 신라. 둘 다 없으면 null
const taxOf = src => { const it = catalogItems().find(x=>normSrc(x.src)===normSrc(src)); if(!it) return null; const tx=Number(it.taxable)||0, tf=Number(it.taxfree)||0; return (it.taxable==null && it.taxfree==null) || tx+tf<=0 ? null : {tx, tf}; };
const priceOf = src => { const it = catalogItems().find(x=>normSrc(x.src)===normSrc(src)); return it ? it.price : null; };
const won = n => n==null ? '-' : Number(n).toLocaleString('ko-KR');
// 품목 이름을 보기 좋게: "주말/공휴일(관람, 사담 런치1부)" → "관람 + 사담 런치1부", "해설사도슨트(수정)" → "해설사 도슨트"
function itemLabel(src){
  const mb = quoteCat && mbMenus().find(m=>normSrc(m.src)===normSrc(src)); if(mb) return '몽몽마방 '+mb.name;   // 몽몽마방 메뉴는 품목 관리의 품명
  let s = String(src||'').replace(/\((수정|변경)\)/g,'').replace(/\(\d{1,2}:\d{2}~\d{1,2}:\d{2}\)/,'').replace(/^(평일|주말\/공휴일|공휴일)\s*/,'').trim();
  const pk = s.match(/^\(관람,\s*(.+)\)$/); if(pk) s = '관람 + ' + pk[1];
  s = s.replace(/^관람\(학생\)$/,'관람 (학생)').replace(/^해설사도슨트$/,'해설사 도슨트').replace(/^임원도슨트$/,'임원 도슨트').replace(/^요가프로그램\(단체\)$/,'요가 프로그램').replace(/^\(관람\)$/,'관람');
  const sm = s.match(/^\((.+)\)$/); if(sm) s = sm[1];   // "(사담 다이닝 썸머 스페셜 런치)" → 괄호 벗기기
  return s || src;
}
// 전체 가격표: 묶음별로, 평일·주말 짝은 한 줄로
function priceSections(){
  const SEC = { view:'관람', package:'관람 + 식사', food:'식사', gtime:'단체 프로그램 (회당)', geach:'단체 프로그램 (1인)' };   // 품목 관리와 같은 순서, 몽몽마방 메뉴도 식사로
  const groups = {};
  catalogItems().forEach(it=>{
    if(!SEC[it.kind] || PRICE_EXCLUDE.test(it.src) || it.price==null) return;
    const label = it.kind==='mabang' ? ((mbMenus().find(m=>m.src===it.src)||{}).name || itemLabel(it.src)) : itemLabel(it.src), key = it.kind + '|' + label;
    const g = groups[key] || (groups[key] = { kind:it.kind, name:label, src:it.src, perTime: it.kind==='gtime' });
    if(/^평일/.test(it.src)){ if(g.wd==null) g.wd=it.price; }
    else if(/^(주말|공휴일)/.test(it.src)){ if(g.we==null) g.we=it.price; }
    else if(g.one==null) g.one=it.price;
  });
  return Object.keys(SEC).map(k=>[SEC[k], Object.values(groups).filter(g=>(g.kind==='mabang'?'food':g.kind)===k).map(g=>{
    if(g.one==null && (g.wd==null || g.we==null)) g.one = g.wd ?? g.we;   // 한쪽만 있으면 한 가격으로
    if(g.one!=null && g.wd!=null && g.we!=null) delete g.one;
    return g; })]).filter(([,rows])=>rows.length);
}
// ---------- 할인 ----------
// 단체 할인: 20명 미만 사전예약 5%, 20명 초과 단체예약 10% (20명은 5%로 봄) → 관람·사담 런치 상품에만
// 특별 할인(사람마다): 그 사람은 단체 할인과 비교해 큰 쪽 하나만
const SPECIAL = [
  {k:'dKansong', name:'간송미술관 제휴', short:'간송', rate:.15, proof:'간송미술관 방문 티켓 (방문일 기준 6개월 이내 것)'},
  {k:'dMerit',   name:'국가유공자',       short:'국가유공자', rate:.30, proof:'국가유공자 증서'},
  {k:'dGunwi',   name:'군위 주민',        short:'군위 주민', rate:.50, proof:'주민등록증 또는 등본 (거주지 확인)'},
  {k:'dClergy',  name:'대구대교구 신부·수녀·신학생', short:'대구대교구', rate:1, proof:'소속 증명서 또는 신분증'},
];
function groupRate(n){ return !n ? 0 : n>20 ? .10 : .05; }
function groupLabel(n){ return !n ? '' : n>20 ? '단체예약 10%' : '사전예약 5%'; }
function specialCounts(r){ return SPECIAL.map(s=>({...s, n: Math.max(0, parseInt(r[s.k])||0)})).filter(s=>s.n>0); }
// 할인 대상 품목의 합계: 특별 할인 인원은 각자 큰 할인, 나머지는 단체 할인
function discTotal(price, n, r){
  const g=groupRate(n), sp=specialCounts(r); let left=n, sum=0;
  sp.forEach(s=>{ const c=Math.min(s.n,left); left-=c; sum += c*price*(1-Math.max(s.rate,g)); });
  return Math.round(sum + left*price*(1-g));
}
// 선택한 항목 예상 금액 (견적서 발급과 같은 계산) + 전체 가격표(버튼으로)
const discPct = name => (/관람/.test(name) && !/\(관람,/.test(name)) || /사담\s*런치/.test(name);
function blockAmount(b, price){
  if(price==null) return null;
  let left=b.qty, sum=0; const parts=[];
  (b.notes||[]).forEach(nt=>{ const m=nt.match(/(\d+)\s*명\s+(\d+)%/); if(!m) return; const c=Math.min(+m[1],left), p=+m[2]; left-=c; sum+=c*price*(1-p/100); parts.push(`${p}% ${c}명`); });
  sum+=left*price;
  return { amount: Math.round(sum), disc: parts.join(' · ') };
}
// 1인 가격을 과세(신라) · 비과세(사유원)로: 품목 관리의 과세 · 비과세(비율) → 관람+식사는 그날 관람권 가격만큼 비과세 → 관람권은 모두 비과세 → 그 밖은 모두 과세
function splitOf(src, price, r){
  const tax=taxOf(src); if(tax){ const tf=Math.round(price*tax.tf/(tax.tx+tax.tf)); return {tx:price-tf, tf}; }
  if(/\(관람,/.test(src)){ const vp=priceOf(viewSrcOf(r||rec)); if(vp!=null && vp<price) return {tx:price-vp, tf:vp}; }
  const it=catalogItems().find(x=>normSrc(x.src)===normSrc(src)); if(it && it.kind==='view') return {tx:0, tf:price};
  return {tx:price, tf:0};
}
// 줄 금액 (실제 결제 금액): 정상가 · 할인(과세 · 비과세 따로, 할인액을 직접 고쳤으면 그 값) · 결제 금액(과세 · 비과세)
function blockMoney(b, r){
  const p = b.price ?? priceOf(b.product), a = blockAmount(b, p); if(!a) return null;
  const u = b.price!=null ? {tx:p, tf:0} : splitOf(b.product, p, r), full=p*b.qty, fTx=u.tx*b.qty, fTf=u.tf*b.qty;
  const d=full-a.amount, aTf = full ? Math.round(d*fTf/full) : 0, aTx=d-aTf;   // 할인 버튼(%)으로 계산한 할인을 과세 · 비과세 비율로
  const ov=idamtMap(r||rec)[dkey(b.key||'')];
  const dTx = ov ? Math.min(ov.tx, fTx) : aTx, dTf = ov ? Math.min(ov.tf, fTf) : aTf;
  return { p, full, fTx, fTf, aTx, aTf, dTx, dTf, ov:!!ov, tx:fTx-dTx, tf:fTf-dTf, amount:full-dTx-dTf, disc:a.disc };
}
function renderPrice(){
  const box=$('#priceBox'); if(!box) return;
  let day=null; if(rec.date){ const d=new Date(rec.date+'T00:00'); if(!isNaN(d)) day = isRedDay(rec.date) ? 'we' : 'wd'; }
  const n = numOf(rec.people), g = groupRate(n), sp = specialCounts(rec);
  $('#priceHint').textContent = day ? `${dateLabel(rec.date)} → ${day==='we'?(HOLIDAYS.has(rec.date)?'공휴일(주말)':'주말'):'평일'} 가격` : '';
  $('#discGroup').innerHTML = n
    ? (sp.length ? `특별 할인 ${sp.map(s=>`${s.short} ${s.n}명 ${s.rate===1?'무료':Math.round(s.rate*100)+'%'}`).join(' · ')} <span class="hint" style="margin:0">(단체 할인과 비교해 큰 쪽)</span>` : '')
    : '<span class="hint" style="margin:0">관람 인원을 넣으면 할인(20명 미만 5% · 20명 초과 10%)이 계산됩니다</span>';
  SPECIAL.forEach(s=>{ const el=$('#'+s.k); if(el && document.activeElement!==el) el.value = rec[s.k]||''; el?.classList.toggle('has', !!rec[s.k]); });
  { const es=etcSplit(rec); [['etcDiscTx',es.tx],['etcDiscTf',es.tf],['etcDiscWhy',null]].forEach(([k,v])=>{ const el=$('#'+k); if(el && document.activeElement!==el) el.value = v==null ? (rec[k]||'') : (v?String(v):''); }); }   // 기타 할인 칸
  // 전산 내역을 붙여넣었으면 예약 칸으로 계산한 예상 금액 · 할인 칸은 숨기고 전산 내역이 가격표
  const useErp = erpList.length>0;
  $('.disc-box').style.display = useErp ? 'none' : '';
  $('#selTitle').hidden = useErp; box.hidden = useErp;
  $('#erpPasteBtn').textContent = useErp ? '전산 내역 다시 붙여넣기' : '전산 내역 붙여넣기';
  priceInfo = null;
  if(useErp){ box.innerHTML=''; $('#priceHint').textContent = '전산 내역 기준'; }
  // 1) 선택한 항목
  else if(!rec.date || !n){   // 방문일 · 관람 인원이 둘 다 있어야 계산. 하나만 있으면 나머지를 넣어 달라고
    box.innerHTML = rec.date && !n ? '<p class="price-need"><b>관람 인원</b>을 입력해 주세요. 방문일과 관람 인원이 있어야 금액이 나옵니다.</p>'
      : n && !rec.date ? '<p class="price-need"><b>방문일</b>을 입력해 주세요. 평일 · 주말 가격이 달라 방문일이 있어야 금액이 나옵니다.</p>'
      : '<p class="hint" style="margin:0">방문일과 관람 인원을 넣으면, 예약 칸에서 고른 관람 · 식사 · 프로그램의 금액이 여기에 나옵니다.</p>';
  } else if(!quoteCat){
    box.innerHTML = '<p class="hint" style="margin:0">견적서 사이트에서 가격을 불러오는 중입니다.</p>';
  } else {
    const {blocks, skipped} = quoteBlocks(rec);
    let total=0; const missing=[]; priceInfo={};
    const rows = blocks.map(b=>{
      const p = b.price ?? priceOf(b.product), a = blockAmount(b, p), m = blockMoney(b, rec);
      priceInfo[normSrc(b.product)] = {qty:b.qty, p, a, b, m};   // 예약 내역 줄마다 금액 (b: 할인 버튼, m: 과세 · 비과세 · 할인액)
      if(m) total += m.amount; else missing.push(itemLabel(b.product));
      const unit = PROG_KEYS().some(k=>rec[k] && progSrc(k, rec)===b.product && UNIT(k)==='시간') ? '시간' : goodsParse(rec.goods).some(g=>normSrc(g.src)===normSrc(b.product)) ? '개' : '명';   // 굿즈는 개
      const tm = b.product.match(/^(평일|주말\/공휴일) 관람\((\d\d):00~(\d\d):00\)$/) || [];
      const lab = itemLabel(b.product) + (tm[2] ? ` (${+tm[2]}~${+tm[3]}시)` : '');   // 관람권 시간대 표시
      return `<tr><td>${esc(lab)}</td><td>${b.qty}${unit}</td><td>${p==null?'-':won(p)}</td><td>${a&&a.disc?`<span class="dtag">${esc(a.disc)}</span>`:''}</td><td class="tot">${a?won(a.amount):'가격 없음'}</td></tr>`;
    }).join('');
    const etc=etcAmt(rec); total=Math.max(0,total-etc);   // 기타 할인
    const etcRow = etc ? `<tr class="etc-row"><td>기타 할인${rec.etcDiscWhy?` (${esc(rec.etcDiscWhy)})`:''}</td><td></td><td></td><td><span class="dtag">${(es=>[es.tf&&`비과세(사유원) -${won(es.tf)}`, es.tx&&`과세(신라) -${won(es.tx)}`].filter(Boolean).join(' · '))(etcSplit(rec))}</span></td><td class="tot">-${won(etc)}</td></tr>` : '';
    const ms=moneySplit(rec);
    void rows;   // 품목별 금액은 예약 내역 줄에 (가격표와 예약 내역을 합침)
    box.innerHTML = `<table class="ptable sel"><tbody>${etcRow}</tbody>`
      + `<tfoot><tr><td colspan="4">예상 합계 (부가세 포함)</td><td class="tot">${won(total)}</td></tr>`
      + (ms ? `<tr class="split-row"><td colspan="4">└ 사유원 (비과세 · 입장료)</td><td class="tot">${won(ms.saw)}</td></tr><tr class="split-row"><td colspan="4">└ 신라 (과세)</td><td class="tot">${won(ms.shilla)}</td></tr>` : '')
      + `</tfoot></table>`
      + (skipped.length||missing.length ? `<p class="hint">${[...skipped,...missing].join(', ')}은(는) 견적서 품목에 없어 합계에서 빠졌습니다.</p>` : '');
  }
  // 2) 전체 가격표 (버튼으로 펼침)
  const all=$('#priceAll'); if(all && !all.hidden) all.innerHTML = fullPriceHTML(day, g);
  renderErp();   // 붙여넣은 전산 내역
  paintItemPrices();   // 예약 내역 줄마다 금액
  $('#priceSrc').textContent = '견적서&거래명세서 사이트 품목 기준' + (quoteCat&&quoteCat.at ? ` (${fmtAgo(quoteCat.at)} 불러옴)` : '') + ' · 부가세 포함 · 공휴일은 주말 가격' + (priceLoaded===false ? ' · 견적서 사이트를 불러오지 못해 마지막으로 받은 가격으로 표시' : '');
}
function fullPriceHTML(day, g){
  let html='';
  priceSections().forEach(([title, rows])=>{
    html += `<div class="psec"><div class="psec-t">${title}</div><table class="ptable"><thead><tr><th>항목</th><th>평일</th><th>주말</th></tr></thead><tbody>`;
    rows.forEach(r=>{
      const one = r.one!=null, disc = discPct(r.src||'') && g>0;
      const cell=(p,side)=>{ const active = one ? !!day : day===side; const cls = one ? (day?'on':'') : !day ? '' : active ? 'on' : 'off';
        return `<td class="${cls}"${one?' colspan="2"':''}>${active&&disc?`<s>${won(p)}</s>${won(Math.round(p*(1-g)))}`:won(p)}${r.perTime?' (회)':''}</td>`; };
      html += `<tr><td>${esc(r.name)}${disc?`<span class="dtag">-${Math.round(g*100)}%</span>`:''}</td>${one?cell(r.one):cell(r.wd,'wd')+cell(r.we,'we')}</tr>`;
    });
    html += '</tbody></table></div>';
  });
  return html || '<p class="hint">견적서 사이트 품목을 불러오는 중입니다.</p>';
}
// 전체 가격표 보기 / 접기
$('#priceAllBtn').onclick=()=>{ const a=$('#priceAll'), open=a.hidden; a.hidden=!open; $('#priceAllBtn').textContent = open ? '전체 가격표 접기' : '전체 가격표 보기'; $('#priceAllBtn').setAttribute('aria-expanded', open); renderPrice(); };
// ===================== 전산 내역 붙여넣기 =====================
// 사유원 전산의 상품 정보를 통째로 붙여넣으면 상품마다 방문일 · 상품 · 인원 · 상품금액 · 할인 · 금액으로 읽어 표로 보여 줌 (예약에 함께 저장)
const wonNum = s => parseInt(String(s||'').replace(/[^\d]/g,''))||0;
const isErpText = s => /방문일자\s*\(순번\)/.test(s||'');
function parseErp(text){
  const out=[], pay={}; let cur=null, sect='item', pend='';   // sect: 'pay' 이면 결제 정보 (상품마다의 칸을 덮지 않음)
  String(text||'').split(/\r?\n/).forEach(line=>{
    const t=line.trim(); if(!t) return;
    if(/^(결제\s*정보|결제\s*\/\s*취소\s*이력|과세금액표시)$/.test(t)){ if(cur){ out.push(cur); cur=null; } sect='pay'; return; }
    const m=t.match(/^([^\t:：]+?)\s*(?:\t+|[:：]\s*|\s{2,})(.*)$/) || (line.match(/\t\s*$/) ? [t, t, ''] : null);
    const key=m ? m[1].replace(/\s/g,'') : '', val=m ? m[2].trim() : '';
    if(sect==='pay'){   // 결제 정보: "면세금액(입장료)<탭>" 다음 줄에 금액이 오기도 함
      const take=(k,v)=>{ if(/^결제금액$/.test(k)) pay.total=wonNum(v); else if(/^과세금액$/.test(k)) pay.taxable=wonNum(v); else if(/^면세금액/.test(k)) pay.free=wonNum(v); else if(/^결제수단$/.test(k)) pay.method=v; else if(/^결제상태$/.test(k)) pay.state=v; };
      if(key==='방문일자(순번)') sect='item';
      else { if(m && val){ take(key,val); pend=''; } else if(m) pend=key; else if(pend && /^[\d,]+$/.test(t)){ take(pend,t); pend=''; } else pend=t.replace(/\s/g,''); return; }
    }
    if(key==='방문일자(순번)'){ if(cur) out.push(cur); const d=val.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/), sq=val.match(/\((\d+)\)/); cur={date:d?`${d[1]}-${d[2].padStart(2,'0')}-${d[3].padStart(2,'0')}`:'', seq:sq?sq[1]:'', product:'', people:0, base:0, disc:0, amount:0, notes:[]}; return; }
    if(!cur) return;
    if(/^\*/.test(t)){ cur.notes.push(t.replace(/^\*\s*/,'').replace(/\(\)\s*$/,'')); return; }
    if(key==='상품정보') cur.product=val;
    else if(key==='방문자정보') cur.visitor=val;
    else if(key==='예약인원') cur.people=wonNum((val.match(/\d+/)||[''])[0]);
    else if(key==='상품금액') cur.base=wonNum(val);
    else if(key==='할인금액'){ cur.disc=wonNum(val.replace(/\(.*$/,'')); const p=val.match(/\(([\d,]+)\)/); if(p) cur.discShilla=wonNum(p[1]); }   // 156,000(96,000): 괄호 = 할인 중 신라 몫
    else if(key==='금액') cur.amount=wonNum(val);
    else if(/^등록/.test(t)) cur.reg=t.replace(/^등록\s*[:：]?\s*/,'');
  });
  if(cur) out.push(cur);
  const list=out.filter(x=>x.product).map(x=>({...x, amount: x.amount || Math.max(0, x.base-x.disc)}));
  if(list.length && (pay.total || pay.free!=null || pay.taxable!=null)) list[0].payInfo=pay;   // 결제 정보(결제 금액 · 과세 · 면세)는 첫 줄에 붙여 함께 저장
  return list;
}
// 사유원 / 신라 나누기: 관람 = 사유원, 관람+식사 패키지 = 관람료만큼 사유원 나머지 신라, 그 밖 = 신라
function erpSplit(x){
  const t=taxOf(x.product);   // 품목 관리의 과세 · 비과세가 있으면 그것으로 (할인 괄호 = 신라 몫이면 그대로 반영)
  if(t){ let saw = x.discShilla!=null && x.people ? t.tf*x.people - Math.max(0, x.disc-x.discShilla) : Math.round(x.amount*t.tf/(t.tx+t.tf));
    saw=Math.max(0, Math.min(x.amount, saw)); return {saw, shilla:x.amount-saw}; }
  const isView = /관람/.test(x.product) && !/\(관람,/.test(x.product) && !/관람권|관람식사권/.test(x.product);
  if(isView) return {saw:x.amount, shilla:0};
  if(/\(관람,/.test(x.product) && x.people){
    const vp=priceOf(viewSrcOf({date:x.date, tin:''})) || priceOf(`${x.date && isRedDay(x.date)?'주말/공휴일':'평일'}(관람)`) || 0;
    const sawDisc = x.discShilla!=null ? Math.max(0, x.disc-x.discShilla) : Math.round(vp*x.people*(x.base ? x.disc/x.base : 0));   // 할인 중 사유원 몫
    const saw=Math.max(0, Math.min(x.amount, vp*x.people - sawDisc)); return {saw, shilla:x.amount-saw}; }
  return {saw:0, shilla:x.amount};
}
// 전산 내역 합계 · 사유원 / 신라 (결제 정보가 있으면 면세 = 사유원, 과세 = 신라)
const erpUnit = x => goodsItems().some(g=>normSrc(g.src)===normSrc(x.product)) ? '개' : '명';   // 굿즈는 개
function erpTotals(list=erpList){
  let tot=0, saw=0, shilla=0; list.forEach(x=>{ const s=erpSplit(x); tot+=x.amount; saw+=s.saw; shilla+=s.shilla; });
  const pi=(list[0]||{}).payInfo;
  // 예약 내역 줄에서 할인액을 직접 고친 상품이 있으면: 그 줄은 고친 금액으로 다시 더함 (전산 결제 정보보다 우선)
  const ov=idamtMap(rec), E = list===erpList && Object.keys(ov).length ? erpByKey() : null, keys = E ? Object.keys(E.m).filter(k=>ov[dkey(k)]) : [];
  if(keys.length){ tot=0; saw=0; shilla=0;
    list.forEach(x=>{ const k=erpKeyOf(x.product); if(k && keys.includes(k)) return; const s=erpSplit(x); tot+=x.amount; saw+=s.saw; shilla+=s.shilla; });
    keys.forEach(k=>{ const m=erpRowMoney(k, E.m[k]); tot+=m.amount; saw+=m.tf; shilla+=m.tx; });
    return {tot, saw, shilla, pi:null}; }
  if(pi && pi.free!=null && pi.taxable!=null){ saw=pi.free; shilla=pi.taxable; }
  return {tot, saw, shilla, pi};
}
function renderErp(){
  const box=$('#erpBox'); if(!box) return;
  if(!erpList.length){ box.hidden=true; box.innerHTML=''; return; }
  const {tot, saw, shilla, pi}=erpTotals();
  box.hidden=false;
  box.innerHTML = `<div class="psec-t">전산 내역 합계 (${erpList.length}건 · 상품별은 위 예약 내역 줄에) <button type="button" class="btn" id="erpClear" style="padding:1px 8px;font-size:11.5px;margin-left:6px" title="전산 내역을 지우면 예약 칸으로 계산한 금액으로 돌아갑니다">지우기</button></div>`
    + `<table class="ptable sel">`
    + `<tfoot><tr><td colspan="4">전산 합계</td><td class="tot">${won(tot)}</td></tr><tr class="split-row"><td colspan="4">└ 사유원 (비과세${pi&&pi.free!=null?' · 전산 면세금액':''})</td><td class="tot">${won(saw)}</td></tr><tr class="split-row"><td colspan="4">└ 신라 (과세${pi&&pi.taxable!=null?' · 전산 과세금액':''})</td><td class="tot">${won(shilla)}</td></tr>${pi&&pi.total?`<tr class="split-row"><td colspan="4">결제 ${esc([pi.state, pi.method].filter(Boolean).join(' · '))}</td><td class="tot">${won(pi.total)}</td></tr>`:''}</tfoot></table>`;
  box.insertAdjacentHTML('beforeend', `<div class="erp-ck" title="예약 내용(할인 버튼 % · 기타 할인)으로 계산한 값과 전산 내역 비교">${erpCheckHTML(erpCheck())}</div>`);   // 대조: 할인 합계 · 총 금액
}
// 전산 내역 → 예약 내용 칸: 관람 · 관람+사담 · 몽몽마방 메뉴 · 프로그램 · 굿즈 · 방문일 · 인원 · 기타 할인 · 특별 할인
function erpFields(list){
  const o={}, goods=[], views=[], unknown=[], sp={}; let view=0, etc=0, etcTo='';
  const add=(k,n)=>{ o[k]=String((numOf(o[k])||0)+(n||0)); };
  const progBy={}; Object.entries(PROG_SRC).forEach(([k,s])=>{ if(!progBy[normSrc(s)]) progBy[normSrc(s)]=k; }); progBy[normSrc('당두봉갈 대관')]='dangdu';
  const mbs=mbMenus(), gds=goodsItems();
  list.forEach(x=>{
    const p=x.product, ns=normSrc(p), n=x.people||0;
    x.notes.forEach(t=>{
      const m=t.match(/^기타\s*할인\s*-?\s*([\d,]+)/); if(m){ etc+=wonNum(m[1]); if(!etcTo){ const s=erpSplit(x); etcTo = s.saw && !s.shilla ? '사유원' : '신라'; } return; }
      const s=SPECIAL.find(s=>t.includes(s.short)), c=t.match(/(\d+)\s*명/); if(s && c) sp[s.k]=(sp[s.k]||0)+(+c[1]);   // 특별 할인 인원
    });
    if(/\(관람,\s*사담\s*런치\s*1부\)/.test(p)) add('sadam1',n);
    else if(/\(관람,\s*사담\s*런치\s*2부\)/.test(p)) add('sadam2',n);
    else if(/\(관람,\s*사담\s*디너\)/.test(p)) add('sadamD',n);
    else if(/해오름/.test(p)) add('haeorum',n);   // 평일 · 주말 품목 모두
    else if(/\(관람,/.test(p) || (/관람/.test(p) && !/관람권|관람식사권/.test(p))){   // 관람권 · 관람+식사 패키지
      const isBase = false;   // 관람 자동 줄 없음: 전산의 관람권도 모두 항목 줄(관람 · 관람+식사)로
      if(isBase) view+=n; else { const v=views.find(y=>normSrc(y.src)===ns); if(v) v.qty+=n; else views.push({src:p, qty:n}); } }
    else if(progBy[ns]) add(progBy[ns], n);
    else { const mb=mbs.find(m=>normSrc(m.src)===ns);
      if(mb){ add('mabangL',n); if(o.mabangMenu && o.mabangMenu!==mb.name) unknown.push(p+' (몽몽마방 메뉴가 여러 개)'); else o.mabangMenu=mb.name; }
      else { const gi=gds.find(g=>normSrc(g.src)===ns); if(gi){ const g=goods.find(g=>g.src===gi.src); if(g) g.qty+=n; else goods.push({src:gi.src, qty:n}); } else unknown.push(p); } }
  });
  o.goods=goodsJoin(goods); o.views=goodsJoin(views);
  const vsum=views.reduce((s,y)=>s+y.qty,0), pkg=numOf(o.sadam1)+numOf(o.sadam2)+numOf(o.sadamD)+vsum, ppl=Math.max(view+pkg, numOf(o.haeorum)) || Math.max(0, ...['mabangL',...PROG_KEYS()].filter(k=>UNIT(k)!=='시간').map(k=>numOf(o[k])));
  if(ppl) o.people=String(ppl);
  o.viewN = '';   // 관람 자동 줄을 없애 기본 관람권 인원은 쓰지 않음
  const d=list.find(x=>x.date); if(d) o.date=d.date;
  const v=(list.find(x=>x.visitor)||{}).visitor||'', vm=v.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return { o, sp, etc, etcTo, unknown, org:(vm?vm[1]:v).trim(), phone: vm && /\d{2,}/.test(vm[2]) ? vm[2] : '' };
}
const ERP_FILL_KEYS = () => ['sadam1','sadam2','sadamD','views','viewN','mabangL','mabangMenu',...PROG_KEYS(),'goods'];   // 전산 내역대로 맞추는 칸 (없으면 비움)
function fillFromErp(list){
  const {o, sp, etc, etcTo, unknown, org, phone} = erpFields(list), ch=[];
  const set=(k,v)=>{ v=v||''; if(String(rec[k]||'')===v) return; rec[k]=v; touched.add(k); ch.push(k); };
  ERP_FILL_KEYS().forEach(k=>set(k, o[k]));
  if(o.people) set('people', o.people); if(o.date) set('date', o.date);
  if(org && !rec.org) set('org', org);
  if(phone && !rec.c0_phone) set('c0_phone', fmtPhone(phone));
  SPECIAL.forEach(s=>{ if(sp[s.k]) set(s.k, String(sp[s.k])); });
  if(etc){ set('etcDisc',''); set('etcDiscTo',''); set('etcDiscTx', etcTo==='사유원' ? '' : String(etc)); set('etcDiscTf', etcTo==='사유원' ? String(etc) : ''); if(!rec.etcDiscWhy) set('etcDiscWhy', '전산 기타할인'); }   // 전산 기타할인: 전산이 알려 준 쪽(기본 신라 = 과세)으로
  else if(rec.etcDiscWhy==='전산 기타할인'){ ['etcDisc','etcDiscTx','etcDiscTf','etcDiscWhy'].forEach(k=>set(k,'')); }   // 전산에서 읽었던 기타 할인이 이번 내역에 없으면 뺌 (직접 넣은 할인은 그대로)
  ERP_FILL_KEYS().forEach(k=>{ const g=OPT[GROUP_OF[k]]; if(g && rec[k]) optOpen.add(g.id); });
  staffDefaults();   // 채운 프로그램 · 굿즈 담당 = 영업 담당   // 채워진 식사 · 프로그램 · 굿즈 묶음은 펼침
  return { n: ch.length, unknown };
}
// 전산 내역 ↔ 예약 내용 다른 점 (식사 · 몽몽마방 · 프로그램 · 굿즈 · 방문일 · 관람 인원 + 알아보지 못한 상품)
function erpCompare(list){
  const {o, unknown}=erpFields(list), show=(k,v)=>!v?(k==='viewN'?'자동':'없음'):k==='goods'?goodsText({goods:v}):k==='views'?viewsParse(v).map(x=>`${itemLabel(x.src)} ${x.qty}명`).join(', '):k==='date'?dateLabel(v):/^\d+$/.test(String(v))&&UNIT(k)?v+(k==='people'||/^sadam|mabangL/.test(k)?'명':UNIT(k)):v;
  const d=[...ERP_FILL_KEYS(),'people','date'].filter(k=>String(o[k]||'')!==String(rec[k]||'') && !((k==='people'||k==='date') && !o[k]))
    .map(k=>({k, label:k==='goods'?'굿즈':k==='views'?'관람 · 관람+식사':k==='viewN'?'기본 관람권 인원':LABEL[k]||k, mine:show(k,rec[k]), erp:show(k,o[k])}));
  unknown.forEach(p=>d.push({k:'?', label:'알아보지 못한 전산 상품', mine:'-', erp:p}));
  return d;
}
// 전산 내역 적용: how = 'fill'(예약 칸을 전산대로) · 'keep'(예약 칸 그대로, 전산 수정 과업) · 'same'(같음)
let erpPendingTask=null, erpDiffList=null;   // erpPendingTask: 붙여넣으면 완료할 과업 (전산 예약 · 전산 예약 수정)
function applyErpList(list, how, diff){
  erpList=list; touched.add('erpList');
  if(how==='fill'){ fillFromErp(list); nContacts=Math.max(nContacts, nContactsOf(rec)); renderContacts(); renderForm(); }
  if(how==='keep' && diff && diff.length) tasks.push({id:'c'+Date.now().toString(36), title:'전산 예약을 예약 내용대로 수정', custom:true, done:false,
    memo:diff.map(x=>`${x.label}: 예약 ${x.mine} / 전산 ${x.erp}`).join('\n'), at:new Date().toISOString(), due:todayYmd()});
  if(erpPendingTask){ const t=tasks.find(x=>x.id===erpPendingTask);
    if(t){ t.done=true; t.doneAt=new Date().toISOString();
      if(t.id==='erp'){ rec.erp=ymd(new Date()); touched.add('erp'); }
      if(t.id==='erpfix'){ const e=tasks.find(x=>x.id==='erp'); if(e) e.base=erpSnap(); t.changes=[]; } }
    erpPendingTask=null; }
  if(how!=='keep'){ const e=tasks.find(x=>x.id==='erp'); if(e && e.done){ e.base=erpSnap(); const fx=tasks.find(x=>x.id==='erpfix'); if(fx && !fx.done) fx.changes=[]; } }   // 예약 내용 = 전산 → 전산 예약 수정 기준도 지금 내용
  startTimer(); renderTasks(); renderSide(); autoSave();
  toast(how==='fill' ? `전산 내역 ${list.length}건 · 예약 내용을 전산 내역대로 맞췄습니다.` : how==='keep' ? `전산 내역 ${list.length}건 · 예약 내용은 그대로 두고 추후 과업 '전산 예약을 예약 내용대로 수정'을 만들었습니다.` : `전산 내역 ${list.length}건 · 예약 내용과 일치합니다.`);
}
function takeErpText(text){
  const list=parseErp(text);
  if(!list.length) return 0;
  const empty = !itemKeysFromRec().length && !numOf(rec.people);   // 예약 칸이 비어 있으면 그냥 채움
  const diff = empty ? [] : erpCompare(list);
  if(empty) applyErpList(list, 'fill');
  else if(!diff.length) applyErpList(list, 'same');
  else openErpDiff(list, diff);
  return {count:list.length};
}
function openErpDiff(list, diff){
  erpDiffList={list, diff};
  $('#erpDiffBody').innerHTML = `<table class="ptable"><thead><tr><th>항목</th><th>예약 내용</th><th>전산 내역</th></tr></thead><tbody>${diff.map(x=>`<tr><td>${esc(x.label)}</td><td>${esc(x.mine)}</td><td><b>${esc(x.erp)}</b></td></tr>`).join('')}</tbody></table>`;
  $('#erpDiffModal').hidden=false; $('#erpDiffFill').focus();
}
const closeErpDiff = () => { $('#erpDiffModal').hidden=true; erpDiffList=null; };
$('#erpDiffFill').onclick=()=>{ const d=erpDiffList; closeErpDiff(); if(d) applyErpList(d.list, 'fill', d.diff); };
$('#erpDiffKeep').onclick=()=>{ const d=erpDiffList; closeErpDiff(); if(d) applyErpList(d.list, 'keep', d.diff); };
$('#erpDiffCancel').onclick=()=>{ closeErpDiff(); if(erpPendingTask){ toast('전산 내역을 적용하지 않아 전산 예약은 아직 완료되지 않았습니다.'); erpPendingTask=null; } };
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#erpDiffModal').hidden){ e.preventDefault(); $('#erpDiffCancel').click(); } });
// 전산 예약 · 전산 예약 수정을 완료하려면 전산 내역을 꼭 붙여넣어 예약 내용과 맞는지 확인
function askErpForTask(id){
  erpPendingTask=id;
  $('#erpIn').value=''; $('#erpMsg').textContent='';
  $('#erpNeed').hidden=false; $('#erpNeed').textContent=`${id==='erp'?'전산 예약':'전산 예약 수정'}을 완료하려면 전산에 등록한 상품 정보를 붙여넣어 주세요. 예약 내용과 맞는지 확인한 뒤 완료됩니다.`;
  $('#erpModal').hidden=false; setTimeout(()=>$('#erpIn').focus(),0);
}
$('#erpPasteBtn').onclick=()=>{ erpPendingTask=null; $('#erpNeed').hidden=true; $('#erpIn').value=''; $('#erpMsg').textContent=''; $('#erpModal').hidden=false; setTimeout(()=>$('#erpIn').focus(),0); };
const cancelErpIn = () => { $('#erpModal').hidden=true; if(erpPendingTask){ erpPendingTask=null; toast('전산 내역을 붙여넣지 않아 전산 예약은 아직 완료되지 않았습니다.'); } };
$('#erpCancel').onclick=cancelErpIn;
$('#erpModal').addEventListener('mousedown', e=>{ if(e.target.id==='erpModal') cancelErpIn(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#erpModal').hidden){ e.preventDefault(); cancelErpIn(); } });
$('#erpOk').onclick=()=>{ if(!parseErp($('#erpIn').value).length){ $('#erpMsg').textContent='"방문일자(순번)"으로 시작하는 전산 상품 정보를 찾지 못했습니다.'; return; } $('#erpModal').hidden=true; takeErpText($('#erpIn').value); };   // 예약 내용과 다르면 어떻게 맞출지 묻는 창
document.addEventListener('click', e=>{ if(e.target.id==='erpClear'){ erpList=[]; touched.add('erpList'); renderSide(); toast('전산 내역을 지웠습니다.'); } });
// 특별 할인 인원 입력 (숫자만)
document.querySelectorAll('[data-dk]').forEach(el=>{
  const take=()=>{ const c=el.value.replace(/\D/g,''); if(c!==el.value) el.value=c; rec[el.dataset.dk]=el.value; touched.add(el.dataset.dk); startTimer(); renderSide(); };
  el.addEventListener('beforeinput', e=>{ if(e.data && /\D/.test(e.data) && !e.isComposing) e.preventDefault(); });   // 글자는 아예 안 들어가게
  el.addEventListener('input', take);
  el.addEventListener('compositionend', ()=>setTimeout(take,0));   // 한글 자판으로 친 글자도 지움
  el.addEventListener('blur', take);
});

// ===================== 견적서 발급: 견적서&거래명세서 사이트로 넘기기 =====================
// 그 사이트의 '예약 정보 붙여넣기'가 읽는 형식(방문일자 · 상품정보 · 방문자정보 · 예약인원 · * 할인)으로 만들어
// 같은 사이트(hyunbin5786.github.io) 저장소에 두고 연다. 그쪽이 자동 채우기를 한다.
const QUOTE_URL = QUOTE_PAGE + '?from=intake';
// 관람권: 방문일 요일로 평일 / 주말·공휴일, 입장 시각이 13:00 이후면 13-18 관람권 (그 전이거나 모르면 9-18)
function tinHour(t){ t=String(t||''); const m=t.match(/(\d{1,2})\s*(?::|시)/) || t.match(/^\s*(\d{1,2})\s*$/); if(!m) return null; let h=+m[1]; if(/오후|저녁|pm/i.test(t) && h<12) h+=12; return h; }
// 공휴일 (대체공휴일 · 선거일 포함). 토·일이 아닌데 주말/공휴일 가격을 받는 날. 해마다 인사혁신처 고시를 보고 추가
const HOLIDAYS = new Set([
  // 2026
  '2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-02','2026-05-01','2026-05-05','2026-05-25','2026-06-03',
  '2026-07-17','2026-08-17','2026-09-24','2026-09-25','2026-10-05','2026-10-09','2026-12-25',
  // 2027
  '2027-01-01','2027-02-08','2027-02-09','2027-03-01','2027-05-03','2027-05-05','2027-05-13','2027-07-19',
  '2027-08-16','2027-09-14','2027-09-15','2027-09-16','2027-10-04','2027-10-11','2027-12-27',
]);
const isRedDay = date => { const d=new Date(date+'T00:00'); return !isNaN(d) && (d.getDay()===0 || d.getDay()===6 || HOLIDAYS.has(date)); };
function viewSrcOf(r){ const we=isRedDay(r.date), h=tinHour(r.tin), day=we?'주말/공휴일':'평일';
  if(r.viewSrc && !/\(\d\d:00~18:00\)/.test(r.viewSrc)){ const s=String(r.viewSrc).replace(/^(평일|주말\/공휴일)/, day); if(priceOf(s)!=null) return s; }   // 시간대 관람권(9~18 · 13~18)은 입장 시각으로 자동, 그 밖(학생 등)은 고른 것
  return `${day} 관람(${h!=null && h>=13 ? '13:00~18:00' : '09:00~18:00'})`; }
// 관람 영역: 기본 관람권 + 관람 포함 품목(관람+식사 패키지 · 다른 관람권 · 새벽 해오름 산책). 품목 이름의 평일 · 주말은 방문일에 맞춤
const daySrc = (src, r) => { const day=r.date && isRedDay(r.date) ? '주말/공휴일' : '평일', s=String(src).replace(/^(평일|주말\/공휴일)/, day); return priceOf(s)!=null ? s : src; };
const viewsParse = v => goodsParse(v);   // "품목 x5 · 품목 x10"
const areaOthers = r => { const n=numOf(r.people), cnt=v=>v?(numOf(v)||n):0; return cnt(r.sadam1)+cnt(r.sadam2)+cnt(r.sadamD)+cnt(r.haeorum)+viewsParse(r.views).reduce((s,x)=>s+x.qty,0); };
const viewAuto = r => Math.max(0, numOf(r.people) - areaOthers(r));   // 기본 관람 줄 = 관람 인원 − 다른 관람 영역
const effViewN = r => String(r.viewN||'').trim()!=='' ? numOf(r.viewN) : viewAuto(r);   // 직접 줄였으면 그 수
const viewLabel = src => { const m=String(src).match(/\((\d\d):00~(\d\d):00\)/); return itemLabel(src) + (m ? ` (${+m[1]}~${+m[2]}시)` : ''); };   // "관람 (9~18시)" · "관람 (학생)"
// 예약 내역 관람 줄 드롭다운: 품목 관리의 관람 품목 중 방문일(평일 · 주말)에 맞는 것 (네이버 제외)
const viewItems = r => { const day=r.date && isRedDay(r.date) ? '주말/공휴일' : '평일'; return catalogItems().filter(it=>it.kind==='view' && !/네이버/.test(it.src) && String(it.src).startsWith(day) && it.price!=null); };
function quoteBlocks(r){
  const n = numOf(r.people), we = isRedDay(r.date);
  const DAY = we ? '주말/공휴일' : '평일';
  const cnt = v => v ? (numOf(v) || n) : 0;   // 'O' 처럼 숫자가 없으면 전체 인원
  const mbM = mbMenuOf(r);   // 몽몽마방은 단체도 관람과 따로: 관람권 + 고른 메뉴 품목 (사유의 밥상이면 사유의 밥상(단체))
  const blocks=[], skipped=[];
  const add=(product, qty, disc, key)=>{ if(qty>0) blocks.push({product, qty, disc, key}); };   // key = 예약 내역 줄 (할인 버튼)
  // 관람 자동 줄 없음 (2026-11-14): 관람권도 예약 내역에서 직접 고른 것만 계산
  add(`${DAY}(관람, 사담 런치1부)`, cnt(r.sadam1), true, 'sadam1');
  add(`${DAY}(관람, 사담 런치2부)`, cnt(r.sadam2), true, 'sadam2');
  add(`${DAY}(관람, 사담 디너)`, cnt(r.sadamD), false, 'sadamD');
  viewsParse(r.views).forEach(v=>{ const s=daySrc(v.src, r), it=catalogItems().find(x=>normSrc(x.src)===normSrc(s)); add(s, v.qty, it ? !!it.disc : /관람\(/.test(s), 'v:'+v.src); });   // 관람 영역의 다른 품목 (할인 대상은 품목 관리 기준)
  if(r.mabangL && mbM) add(mbM.src, cnt(r.mabangL), false, 'mb');   // 고른 메뉴 품목 (품목 리스트 가격)
  else if(r.mabangL && Number(r.mabangPrice)){ add('몽몽마방 단품', cnt(r.mabangL), false); blocks[blocks.length-1].price=Number(r.mabangPrice); }   // 예전 기록: 적어 둔 단가
  else if(r.mabangL) skipped.push('몽몽마방 (메뉴를 고르면 계산)');
  if(r.mabangD) skipped.push('몽몽마방 디너');
  goodsParse(r.goods).forEach(g=>add(g.src, g.qty, false, 'g:'+g.src));   // 굿즈: 품목 리스트 가격 그대로
  // 프로그램: 개별은 인원(숫자가 없으면 전체 인원), 시간은 시간 수(숫자가 없으면 1시간). 같은 견적서 품목이면 합침
  PROG_KEYS().forEach(k=>{ if(!r[k]) return; const src=progSrc(k, r); const q = UNIT(k)==='시간' ? (numOf(r[k])||1) : cnt(r[k]);
    if(!src){ skipped.push(LABEL[k]); return; } const b=blocks.find(b=>b.product===src); if(b) b.qty+=q; else add(src, q, false, k); });
  if(r.teaMed) skipped.push('티하우스 명상'); if(r.gayageum) skipped.push('가야금'); if(r.cabin) skipped.push('유루 캐빈');
  // 할인 줄: 특별 할인 인원을 할인 대상 블록에 앞에서부터 나눠 넣고, 나머지는 단체 할인
  const g = Math.round(groupRate(n)*100), gName = n>20 ? '단체예약' : '사전예약';
  const sp = specialCounts(r).map(s=>({...s, left:s.n})), ov = idiscMap(r);
  blocks.forEach(b=>{
    b.notes=[];
    // 할인 버튼: 자동 = 할인 대상 품목이면 인원으로(20명 이하 사전예약 5% · 초과 단체예약 10%), 줄마다 버튼으로 바꾼 것(항목 할인)이 있으면 그것
    const autoP = b.disc ? g : 0, o = ov[dkey(b.key||'')], pct = o==='none' ? 0 : o==='pre' ? 5 : o==='grp' ? 10 : autoP, nm = pct===10 ? '단체예약' : '사전예약';
    b.dauto = DISC_OF(autoP); b.dsel = o && DISC_OPTS.some(x=>x[0]===o) ? o : b.dauto;
    if(o==='none' || (!b.disc && !pct)) return;
    let left=b.qty;
    if(b.disc) sp.forEach(s=>{ const c=Math.min(s.left,left); if(c<=0) return; s.left-=c; left-=c;
      const sp2=Math.max(Math.round(s.rate*100), pct); b.notes.push(`* ${sp2===pct?nm:s.short} ${c}명 ${sp2}%`); });
    if(left>0 && pct) b.notes.push(`* ${nm} ${left}명 ${pct}%`);
  });
  return {blocks, skipped};
}
function quoteRaw(r, blocks){
  const d = r.date.replace(/-/g,'.');
  return blocks.map(b=>[`방문일자(순번)\t${d} (0)`, `상품정보\t${b.product}`, `방문자정보\t${r.org||''}`, `예약인원\t${b.qty}명`, ...b.notes].join('\n')).join('\n\n');
}
// doc: 'quote'(견적서) | 'statement'(거래명세서). 저장된 예약이면 예약 ID도 넘겨, 견적서 사이트가 출력한 파일을 드라이브에 올리고 이 예약 과업에 링크를 돌려준다
async function openQuote(doc){
  if(!rec.date || !numOf(rec.people)){ toast('방문일과 관람 인원을 먼저 넣어 주세요.'); return; }
  // 버튼을 누르면 요청 체크가 켜지고(추후 과업 '견적서 발급' · '거래명세서 발급') 저장. 출력해서 파일이 돌아오면 하위 과업 '생성'이 체크됨
  const tid = doc==='statement' ? 'stmt' : 'quote';
  rec[tid==='stmt' ? 'wantStmt' : 'wantQuote'] = '있음'; touched.add(tid==='stmt' ? 'wantStmt' : 'wantQuote');
  renderSide();
  await save(true);   // 파일을 이 예약에 붙이려면 저장돼 있어야 함
  const {blocks, skipped} = quoteBlocks(rec);
  const c = contactsOf(rec)[0] || {};
  const h = { at:Date.now(), raw:quoteRaw(rec, blocks), client:rec.org||'', clientMgr:c.name||'', sender:savedOwner()||rec.owner||'', doc: doc||'quote', recId: editingId||'', org: rec.org||'', date: rec.date||'' };
  try{ localStorage.setItem('sy_intake_handoff', JSON.stringify(h)); }catch(_){ toast('이 브라우저에서는 넘길 수 없습니다.'); return; }
  window.open(QUOTE_URL, '_blank');
  toast(`${doc==='statement'?'거래명세서':'견적서'} 사이트를 열었습니다 · ${blocks.length}개 상품${skipped.length?` · ${skipped.join(', ')}은(는) 직접 추가`:''} · 출력하면 드라이브에도 저장됩니다`);
}
$('#quoteBtn').onclick=()=>openQuote('quote');
$('#stmtBtn').onclick=()=>openQuote('statement');
// 버튼 앞 체크: 켜면 추후 과업에 발급 과업(하위 과업 3개)이 생기고, 끄면 (손대지 않은) 과업이 빠짐
document.querySelectorAll('[data-want]').forEach(c=>c.addEventListener('change', ()=>{ const wk=c.dataset.want; rec[wk]=c.checked?'있음':''; touched.add(wk); startTimer(); renderSide(); }));

// ===================== 예약 단계: 예약상담 · 예약접수 =====================
// 자동: 결제가 비어 있으면 예약상담, 결제를 고르면(미정 포함) 예약접수(전산 등록 필요). 버튼으로 직접 바꿀 수 있음
const STAGES = ['예약상담','예약접수'];
const OLD_STAGE = { '상담':'예약상담', '가예약':'예약접수', '공식예약':'예약접수' };   // 예전에 저장한 단계는 예약접수로
const normStage = s => OLD_STAGE[s] || s;
const stageAuto = r => r.pay && r.pay!=='미정' ? '예약접수' : '예약상담';   // 결제가 미정(기본)이면 예약상담, 방식을 고르면 예약접수
const effStage = r => (STAGES.includes(r.stage) ? r.stage : '') || stageAuto(r);
const needsErp = r => effStage(r)!=='예약상담';
function renderStage(){
  const s=effStage(rec), manual=STAGES.includes(rec.stage);
  document.querySelectorAll('#stageSeg button').forEach(b=>{ b.classList.toggle('on', b.dataset.s===s && manual); b.classList.toggle('guess', b.dataset.s===s && !manual); });
  const lbl = $('#saveBtn').firstChild; if(lbl) lbl.textContent = '저장'; $('#saveBtn').title = `${s}으로 저장 (Ctrl+S)`;   // 단계는 왼쪽 버튼에 보이므로 글자는 짧게
}
document.querySelectorAll('#stageSeg button').forEach(b=>b.onclick=()=>{ rec.stage = rec.stage===b.dataset.s ? '' : b.dataset.s; touched.add('stage'); renderSide(); });
LABEL.stage='예약 단계'; LABEL.erp='전산 등록';

// ===================== 단체상담 입력: "항목<탭>값" 줄을 칸으로 =====================
// 머리말이 달라도 알아듣도록 비슷한 이름을 같이 둔다. 모르는 항목은 통화 메모에 "항목: 값" 으로 남김
const CONSULT_KEYS = [
  [/^(신청\s*번호|상담\s*번호|접수\s*번호)$/, 'consultNo'],
  [/^(상품|상품명|프로그램)$/, 'product'],
  [/^(기관명|단체명|업체명|회사명|학교명)$/, 'org'],
  [/^(소속|직책|직위|부서)$/, 'title'],
  [/^(성명|이름|담당자|담당자\s*성함|신청자)$/, 'name'],
  [/^(연락처|전화|전화번호|휴대폰|핸드폰|휴대전화)$/, 'phone'],
  [/^(이메일|메일|e-?mail)$/i, 'email'],
  [/^(일자|방문일|방문\s*일자|날짜|이용일)$/, 'date'],
  [/^(인원|인원수|방문\s*인원|총\s*인원)$/, 'people'],
  [/^(시간|방문\s*시간|이용\s*시간)$/, 'time'],
  [/^(교통수단|차량|차종)$/, 'vtype'],
  [/^(주차\s*대수|차량\s*대수|대수)$/, 'vcount'],
  [/^(출발지|출발\s*지역)$/, 'origin'],
];
function parseConsult(text){
  const got={}, extra=[]; let sect='';   // sect: '답사' 이면 '답사 요청 정보' 아래 줄 (예약 칸을 덮지 않고 통화 메모로)
  String(text||'').split(/\r?\n/).forEach(line=>{
    const bare=line.replace(/[\t:：]+\s*$/,'').trim();   // 표에서 복사하면 제목 줄 끝에 탭이 붙기도 함
    if(/(요청\s*정보|상담\s*정보|답사\s*정보)$/.test(bare) && !/\t/.test(bare)){ sect = /답사/.test(bare) ? '답사' : ''; return; }   // 구역 제목 줄
    if(sect==='답사' && bare && !/\t/.test(line) && !/\s{2,}|[:：]/.test(bare)){ const s=bare.match(/^(\S+)\s+(.+)$/); if(s) extra.push(`[답사] ${s[1]}: ${s[2]}`); return; }   // 답사 줄은 띄어쓰기 한 칸이어도 메모로
    let m=null;
    if(!/\t/.test(line)){ const s=line.match(/^\s*(\S+)\s*[:：]?\s+(.+?)\s*$/); if(s && CONSULT_KEYS.some(([re])=>re.test(s[1].replace(/[:：]$/,'')))) m=[s[0],s[1].replace(/[:：]$/,''),s[2]]; }   // 띄어쓰기로 복사된 경우 (아는 항목 먼저)
    if(!m) m=line.match(/^\s*([^\t:：]+?)\s*(?:\t+|[:：]\s*|\s{2,})(.+?)\s*$/);
    if(!m) return;
    const key=m[1].trim(), val=m[2].trim(); if(!val) return;
    if(sect==='답사'){ extra.push(`[답사] ${key}: ${val}`); return; }   // 사전 답사 일정은 메모로 (방문일 · 인원을 덮지 않음)
    const hit=CONSULT_KEYS.find(([re])=>re.test(key));
    if(hit && !(hit[1] in got)) got[hit[1]]=val; else extra.push(`${key}: ${val}`);   // 같은 항목이 또 나오면 처음 것을 씀
  });
  const o={};
  if(got.org) o.org=got.org;   // 신청번호는 쓰지 않음
  // 상품: "관람+런치1부,도슨트프로그램" → 사담 1부 · 동행 도슨트 등 (인원 단위는 관람 인원, 시간 단위는 1시간)
  if(got.product){
    const p=got.product.replace(/\s/g,''), ppl=(String(got.people||'').match(/\d+/)||[''])[0]||'O';
    if(/런치\s*1부|1부/.test(p)) o.sadam1=ppl;
    if(/런치\s*2부|2부/.test(p)) o.sadam2=ppl;
    if(/디너/.test(p) && !/몽몽마방/.test(p)) o.sadamD=ppl;
    if(/몽몽마방|마방|사유의밥상/.test(p)){ o.mabangL=ppl; if(/사유의밥상/.test(p)) o.mabangMenu='사유의 밥상'; }
    if(/도슨트/.test(p)) o.donghaeng='1';
    if(/세미나/.test(p)) o.seminar='1';
    if(/차방/.test(p)) o.chabang='1';
    if(/당두|봉갈/.test(p)) o.dangdu='1';
    if(/요가/.test(p)) o.yoga=ppl;
    if(/사운드/.test(p)) o.sound=ppl;
    if(/사유의향/.test(p)) o.scent=ppl;
    if(/해오름/.test(p)) o.haeorum=ppl;
    extra.unshift(`상품: ${got.product}`);   // 원래 상품명도 메모에
  }
  if(got.origin) extra.unshift(`출발지: ${got.origin}`);   // 출발지는 통화 메모에
  if(got.name) o.c0_name = got.title ? `${got.name} ${got.title}` : got.name;
  if(got.phone) o.c0_phone = fmtPhone(got.phone);
  if(got.email) o.c0_email = got.email.toLowerCase();
  if(got.date){ const d=got.date.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); if(d) o.date=`${d[1]}-${d[2].padStart(2,'0')}-${d[3].padStart(2,'0')}`; }
  if(got.people){ const n=got.people.match(/\d+(\s*\+\s*\d+)*/); if(n) o.people=n[0].replace(/\s/g,''); }
  if(got.time){ const t=[...got.time.matchAll(/(\d{1,2})\s*[:시]\s*(\d{2})?/g)].map(x=>`${x[1].padStart(2,'0')}:${x[2]||'00'}`); if(t[0]) o.tin=t[0]; if(t[1]) o.tout=t[1]; }
  if(got.vtype || got.vcount){ const t=VTYPES.find(x=>(got.vtype||'').includes(x)) || (/(승용|자가|자차)/.test(got.vtype||'')?'승용':'버스'); const n=(String(got.vcount||'').match(/\d+/)||[''])[0]; o.vehicle = vehJoin(t,n) || t; }
  // 사전 답사 정보 → 예약에 보관 (추후 과업 '사전답사 전산 예약'과 그 메모)
  const tour=extra.filter(x=>x.startsWith('[답사] ')).map(x=>x.slice(5).replace(/[\/]/g,' ').trim());
  if(tour.length) o.tour=tour.join(', ');
  return { fields:o, extra };
}
function openConsult(){ $('#consultModal').hidden=false; $('#consultMsg').textContent=''; $('#consultBox').focus(); }
function closeConsult(){ $('#consultModal').hidden=true; }
$('#consultOpenBtn').onclick=openConsult;
$('#consultCloseBtn').onclick=closeConsult;
$('#consultModal').addEventListener('mousedown', e=>{ if(e.target.id==='consultModal') closeConsult(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#consultModal').hidden){ e.preventDefault(); closeConsult(); } });
$('#consultApplyBtn').onclick=()=>{
  if(isErpText($('#consultBox').value) && parseErp($('#consultBox').value).length){ const v=$('#consultBox').value; closeConsult(); $('#consultBox').value=''; erpPendingTask=null; takeErpText(v); return; }   // 전산 상품 정보를 여기에 붙여넣어도 전산 내역으로 (예약 칸도 채움)
  const {fields, extra} = parseConsult($('#consultBox').value);
  const n=Object.keys(fields).length;
  if(!n){ $('#consultMsg').textContent='알아볼 수 있는 항목이 없습니다. "항목 [탭] 값" 형식인지 확인해 주세요.'; return; }
  if($('#consultNew').checked) newCall(false);
  Object.entries(fields).forEach(([k,v])=>{ rec[k]=v; touched.add(k); });
  staffDefaults();   // 단체상담 상품으로 채운 프로그램 담당 = 영업 담당
  Object.keys(fields).forEach(k=>{ const g=OPT[GROUP_OF[k]]; if(g) optOpen.add(g.id); });   // 식사 · 프로그램이 채워졌으면 그 묶음을 펼침
  if(extra.length){ const box=$('#memoBox'); box.value = (box.value ? box.value.replace(/\s*$/,'\n') : '') + extra.join('\n'); }
  nContacts=Math.max(nContacts, nContactsOf(rec)); renderContacts(); startTimer(); renderForm();
  closeConsult(); $('#consultBox').value='';
  toast(`${n}개 항목을 채웠습니다${extra.length?` · ${extra.length}줄은 통화 메모에`:''}`);
};

// ===================== 단체예약 현황 엑셀로 내려받기 (목록 창에서 고른 구분 그대로, 방문일 순) =====================
let listView = null;
function loadExcelJS(){
  if(window.ExcelJS) return Promise.resolve(window.ExcelJS);
  return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'; s.onload=()=>window.ExcelJS?ok(window.ExcelJS):no(new Error('엑셀 모듈')); s.onerror=()=>no(new Error('엑셀 모듈을 불러오지 못했습니다')); document.head.appendChild(s); });
}
async function downloadXlsx(){
  if(!listView || !listView.shown.length){ toast('내려받을 예약이 없습니다.'); return; }
  const btn=$('#xlsxBtn'); btn.disabled=true; btn.textContent='만드는 중…';
  try{
    const ExcelJS = await loadExcelJS();
    const rows = listView.shown.slice().sort(listOrder);   // 목록과 같은 정렬
    const COLS = [['방문일',12],['단계',9],['전산',8],['업체',22],['영업 담당',9],['결제',16],['차량',10],['입장',7],['입장문',8],['퇴장',7],['관람',8],
      ['사담 1부',8],['사담 2부',8],['사담 디너',9],['마방 시간',12],['마방 인원',9],['마방 메뉴',22],['마방 단가',10],['마방 결제',9],['마방 비고',16],...PROG_KEYS().map(k=>[LABEL[k]+(UNIT(k)==='시간'?' (시간)':''),11]),['기타 프로그램',14],
      ['견적서',10],['거래명세서',10],['담당자',14],['연락처',16],['이메일',24],['인원 변경',9],['현장 재결제',10],['미정 항목',16],['특별 할인',16],['통화 메모',40],['접수',16]];
    const wb = new ExcelJS.Workbook(); wb.creator='사유원 단체 예약 도우미'; wb.created=new Date();
    const ws = wb.addWorksheet('단체예약 현황', { views:[{ state:'frozen', ySplit:1 }] });
    ws.columns = COLS.map(([h,w])=>({ header:h, width:w }));
    rows.forEach(r=>{
      const x={...r, ...unpackExtra(r)}, sp=(String(r.memo||'').match(/특별 할인\s+([^/]+)/)||[])[1]||'';
      ws.addRow([r.date||'', listView.stageOf(r), listView.erpOf(r)?'등록':(listView.stageOf(r)==='예약상담'?'':'미등록'), r.org||'', r.owner||r.takenBy||'', r.pay||'', r.vehicle||'', r.tin||'', x.gate||'', r.tout||'', r.people||'',
        r.sadam1||'', r.sadam2||'', r.sadamD||'', x.mabangTime||'', (r.mabangL||'')+(r.mabangD?` (예전 디너 ${r.mabangD})`:''), r.mabangMenu||'', (mbUnit({...r,...x})||''), x.mabangPay||'', x.mabangNote||'', ...PROG_KEYS().map(k=>x[k]||''), Object.keys(x).filter(k=>x[k] && (LEGACY_KEYS.includes(k) || (/^px:/.test(k) && !PROG_KEYS().includes(k)))).map(k=>`${LABEL[k]||k.slice(3)} ${x[k]}`).join(', '),
        docState(r,'quote'), docState(r,'stmt'),         r.contact||'', r.phone||'', r.email||'', x.pchg?'있음':'', x.onsite?'있음':'', x.tbd?(x.tbd+(x.tbdDate?` (${x.tbdDate}까지)`:'')):'', sp.trim(), r.note||'', r.saved?fmt(r.saved):'']);
    });
    const head = ws.getRow(1); head.font={ bold:true, color:{argb:'FFFFFFFF'} }; head.alignment={ vertical:'middle', horizontal:'center' }; head.height=22;
    head.eachCell(c=>{ c.fill={ type:'pattern', pattern:'solid', fgColor:{argb:'FF3F5236'} }; });
    ws.eachRow((row,i)=>{ if(i>1) row.alignment={ vertical:'top', wrapText:true }; row.eachCell(c=>{ c.border={ bottom:{ style:'thin', color:{argb:'FFDDDDDD'} } }; }); });
    ws.autoFilter = { from:{row:1,column:1}, to:{row:1,column:COLS.length} };
    const buf = await wb.xlsx.writeBuffer();
    const tag = $('#listSearch')?.value.trim() ? '_검색' : listStage==='all' ? '' : '_' + (listStage==='noerp' ? '전산미등록' : listStage==='past' ? '지난예약' : listStage);
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    a.download=`사유원_단체예약현황${tag}_${ymd(new Date()).replace(/-/g,'')}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000);
    toast(`${rows.length}건을 엑셀로 내려받았습니다.`);
  }catch(e){ toast('엑셀을 만들지 못했습니다: '+e.message); }
  btn.disabled=false; btn.textContent='엑셀로 내려받기';
}
// 견적서 · 거래명세서 버튼: 발급했으면 체크 표시
function paintDocBtns(){
  [['ckQuote','wantQuote'],['ckStmt','wantStmt']].forEach(([c,wk])=>{ const el=document.getElementById(c); if(el) el.checked=!!rec[wk]; });   // 버튼 앞 체크 = 과업 요청
  [['quoteBtn','quote','견적서'],['stmtBtn','stmt','거래명세서']].forEach(([b,id,name])=>{ const el=document.getElementById(b); if(!el) return;
    const t=tasks.find(x=>x.id===id && x.done); el.classList.toggle('issued', !!t); el.textContent = name;
    el.title = t ? `${name} 발급함 ${t.doneAt?dtLabel(t.doneAt):''} · 누르면 다시 발급` : `${name} 발급 (누르면 발급으로 체크)`; });
}
$('#xlsxBtn').onclick=downloadXlsx;

// 목록 · 엑셀: 견적서 / 거래명세서 발행 여부 (추후 과업 기준)
function docState(r, id){
  const t = parseHist(r).tasks.find(x=>x.id===id), x = unpackExtra(r);
  const asked = id==='quote' ? x.wantQuote : x.wantStmt;
  return t && t.done ? '발행' : (t || asked) ? '요청' : '';
}
const docTag = (r,id) => { const s=docState(r,id); return s==='발행' ? '<span class="tag st-공식예약">발행</span>' : s==='요청' ? '<span class="tag st-가예약">요청 · 미발행</span>' : ''; };

// ===================== 예약 삭제: 사유 고르기 =====================
// 사유 목록 (피드백 받아 고칠 것)
const DEL_REASONS = ['고객 취소 (방문 취소)','일정 연기 · 날짜 다시 잡기로','다른 예약과 중복 등록','잘못 입력 · 테스트','인원이 줄어 단체 예약 아님 (개인 예약으로)','다른 곳으로 결정 · 견적 후 진행 안 함','연락 두절','기타 (직접 입력)'];
// ===================== 단체예약 목록 '수정': 상태가 실제와 다를 때 사유를 받고 고침 =====================
// 사유 기본 목록 (피드백 받아 고칠 것)
const FIX_REASONS = ['잘못 눌러 발행으로 표시됨 (실제로는 발행 안 함)','다른 경로로 이미 발행함 (메일 · 수기 등)','고객이 서류 요청을 취소함','전산 등록 상태가 실제와 다름','예약 단계가 실제와 다름 (결제 · 확정 여부 변경)','기타 (직접 입력)'];
let fixId=null, fixBase=null;
const DOC_LABEL = { '발행':'발행', '요청':'요청 · 미발행', '':'없음' };
function fixStateOf(r){ return { stage: stageOfRec(r), erp: (/^adm/.test(r.id) || !!unpackExtra(r).erp) ? '1' : '', quote: docState(r,'quote'), stmt: docState(r,'stmt') }; }
function fixDiffList(a,b){ const out=[];
  if(a.stage!==b.stage) out.push(`예약 단계 ${a.stage} → ${b.stage}`);
  if(a.erp!==b.erp) out.push(`전산 ${a.erp?'등록':'미등록'} → ${b.erp?'등록':'미등록'}`);
  if(a.quote!==b.quote) out.push(`견적서 ${DOC_LABEL[a.quote]} → ${DOC_LABEL[b.quote]}`);
  if(a.stmt!==b.stmt) out.push(`거래명세서 ${DOC_LABEL[a.stmt]} → ${DOC_LABEL[b.stmt]}`);
  return out; }
const fixCur = () => ({ stage:$('#fixStage').value, erp:$('#fixErp').value, quote:$('#fixQuote').value, stmt:$('#fixStmt').value });
function paintFixDiff(){ const d=fixDiffList(fixBase, fixCur()); $('#fixDiff').textContent = d.length ? '바뀌는 것: '+d.join(', ') : '바꿀 상태를 고르세요.'; $('#fixOk').disabled=!d.length; }
function openFix(id){
  const r=cache.find(x=>x.id===id); if(!r) return; if(notMineMsg(r)) return;   // 남이 담당인 예약은 고칠 수 없음
  fixId=id; fixBase=fixStateOf(r);
  $('#fixWho').textContent = [r.org||r.contact||'(업체 미정)', r.date&&dateLabel(r.date)].filter(Boolean).join(' · ');
  $('#fixStage').value=fixBase.stage; $('#fixErp').value=fixBase.erp; $('#fixQuote').value=fixBase.quote; $('#fixStmt').value=fixBase.stmt;
  $('#fixReason').innerHTML = '<option value="">사유를 고르세요</option>' + FIX_REASONS.map(x=>`<option>${esc(x)}</option>`).join('');
  $('#fixNote').value=''; paintFixDiff(); $('#fixModal').hidden=false; $('#fixStage').focus();
}
const closeFix = () => { $('#fixModal').hidden=true; fixId=null; };
['#fixStage','#fixErp','#fixQuote','#fixStmt'].forEach(s=>$(s).addEventListener('change', paintFixDiff));
$('#fixCancel').onclick=closeFix;
$('#fixModal').addEventListener('mousedown', e=>{ if(e.target.id==='fixModal') closeFix(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#fixModal').hidden){ e.preventDefault(); closeFix(); } });
$('#fixOk').onclick=async ()=>{
  const cur=fixCur(), diff=fixDiffList(fixBase, cur); if(!diff.length) return;
  const reason=$('#fixReason').value, note=$('#fixNote').value.trim();
  if(!reason){ toast('수정 사유를 골라 주세요.'); $('#fixReason').focus(); return; }
  if(/^기타/.test(reason) && !note){ toast('기타 사유를 적어 주세요.'); $('#fixNote').focus(); return; }
  const r=cache.find(x=>x.id===fixId); if(!r){ closeFix(); return; }
  if(editingId===r.id && baseSnap && diffSnap(baseSnap, snap()).length){ toast('이 예약을 지금 고치는 중입니다. 먼저 저장한 뒤 수정해 주세요.'); return; }
  const now=new Date().toISOString(), ph=parseHist(r), x=unpackExtra(r), why = /^기타/.test(reason) ? note : reason + (note ? ` · ${note}` : '');
  // 전산 등록
  const ex={...r, ...x};
  if(cur.erp!==fixBase.erp){ ex.erp = cur.erp ? (x.erp || '목록에서 수정') : ''; const t=ph.tasks.find(t=>t.id==='erp'); if(t){ t.done=!!cur.erp; t.doneAt=cur.erp?now:''; } }
  // 견적서 · 거래명세서: 발행 = 과업 완료, 요청 = 과업 미완료, 없음 = 과업 · 요청 없앰
  [['quote','wantQuote'],['stmt','wantStmt']].forEach(([id,wk])=>{ if(cur[id]===fixBase[id]) return;
    let t=ph.tasks.find(t=>t.id===id);
    if(!cur[id]){ ph.tasks=ph.tasks.filter(t=>t.id!==id); ex[wk]=''; return; }
    if(!t){ t={id, title:AUTO_TASKS[id], done:false, memo:'', at:now}; ph.tasks.push(t); }
    t.done = cur[id]==='발행'; t.doneAt = t.done ? now : ''; t.subs=Object.fromEntries(DOC_SUBS[id].map(([k])=>[k, t.done])); ex[wk]='있음'; });
  ph.h.push({t:now, by:savedOwner()||'', what:`[목록 수정] ${diff.join(', ')} · 사유: ${why}`});
  const pk=packExtra(ex);
  const item={...r, pay:pk.pay, memo:pk.memo, callType:cur.stage, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now};
  await store.put(item); closeFix(); await renderList();
  if(editingId===r.id){ openRecord(cache.find(x=>x.id===r.id)||item); $('#listModal').hidden=false; }   // 열어 둔 예약이면 고친 상태로 다시 불러옴
  toast('목록 상태를 고쳤습니다. 사유는 수정 기록에 남았습니다.');
};

let delId=null;
function openDel(id){
  const r=cache.find(x=>x.id===id); if(!r) return; if(notMineMsg(r)) return;   // 남이 담당인 예약은 지울 수 없음
  delId=id;
  $('#delWho').textContent = [r.org||r.contact||'(업체 미정)', r.date&&dateLabel(r.date), r.people&&`${r.people}명`].filter(Boolean).join(' · ');
  $('#delReason').innerHTML = '<option value="">사유를 고르세요</option>' + DEL_REASONS.map(x=>`<option>${esc(x)}</option>`).join('');
  $('#delNote').value=''; $('#delModal').hidden=false; $('#delReason').focus();
}
const closeDel = () => { $('#delModal').hidden=true; delId=null; };
$('#delCancel').onclick=closeDel;
$('#delModal').addEventListener('mousedown', e=>{ if(e.target.id==='delModal') closeDel(); });
$('#delOk').onclick=async ()=>{
  const reason=$('#delReason').value, note=$('#delNote').value.trim();
  if(!reason){ toast('삭제 사유를 골라 주세요.'); $('#delReason').focus(); return; }
  if(/^기타/.test(reason) && !note){ toast('기타 사유를 적어 주세요.'); $('#delNote').focus(); return; }
  const r=cache.find(x=>x.id===delId); if(!r){ closeDel(); return; }
  const now=new Date().toISOString(), ph=parseHist(r), why = /^기타/.test(reason) ? note : reason + (note ? ` · ${note}` : '');
  ph.h.push({t:now, by:savedOwner()||'', what:`[삭제] ${why}`});
  // 사유를 수정 기록에 남긴 뒤 삭제 (시트에서는 줄을 지우지 않고 '삭제' 칸에 일시를 적으므로 사유도 남음)
  await store.put({...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now});
  await store.del(r.id, true);
  if(editingId===r.id) newCall(false);
  closeDel(); renderList(); toast(`삭제했습니다 · ${why}`);
};

// ===================== 단체예약 목록 창 =====================
function openList(){ $('#listModal').hidden=false; renderList(); if(pending.length) flush(); else pull(); $('#listCloseBtn').focus(); }
function closeList(){ $('#listModal').hidden=true; }
$('#listOpenBtn').onclick=openList;
$('#listCloseBtn').onclick=closeList;
$('#listModal').addEventListener('mousedown', e=>{ if(e.target.id==='listModal') closeList(); });   // 바깥 누르면 닫힘
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#delModal').hidden){ e.preventDefault(); closeDel(); return; } if(e.key==='Escape' && !$('#listModal').hidden){ e.preventDefault(); closeList(); } });

document.addEventListener('keydown', e=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); save(); }
  if(e.altKey && e.key.toLowerCase()==='n'){ e.preventDefault(); guardLeave(()=>newCall()); }
});

// ===================== 시작 =====================
resetState(); buildForm(); mergePriceLayout(); renderForm();
paintSync(); renderList();
if(SHARED_URL) flush();
window.__priceReady=true; renderPrice(); loadQuotePrices();
// ===================== 공통: 저장된 예약 하나 읽기 =====================
const xOf = r => ({...r, ...unpackExtra(r)});   // 비고 칸에 모아 둔 값(미정 · 입력 기한 등)까지 펼침
const stageOfRec = r => /^adm/.test(r.id) && !STAGES.includes(normStage(r.callType)) ? '예약접수' : STAGES.includes(normStage(r.callType)) ? normStage(r.callType) : stageAuto(xOf(r));
const isGroupRec = r => ['단체예약',...STAGES,...Object.keys(OLD_STAGE)].includes(r.callType||'단체예약');
const ownerOf = r => (r.owner||r.takenBy||'').trim();
const daysFrom = (a,b) => Math.round((new Date(b+'T00:00')-new Date(a+'T00:00'))/864e5);   // a → b 며칠
const firstContact = r => { const n=String(r.contact||'').split(/\s*\/\s*/)[0]||'', p=String(r.phone||'').split(/\s*\/\s*/)[0]||''; return n||p ? `${n}${p?`(${p})`:''}` : ''; };

// ===================== 마이페이지: 내가 영업 담당인 예약 =====================
// 헤더 '영업 담당' 이름과 같은 예약만. 연락할 미정 항목 · 남은 과업 · 방문 예정 순서로
function myRecords(){ const me=savedOwner(); return me ? (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)===me) : []; }
// 저장된 예약의 추후 과업 (열지 않은 예약도): 저장된 과업 + 아직 저장 안 된 미정 항목 연락 · 현장 결제 인원 확인
function tasksOf(r){
  if(stageOfRec(r)==='예약상담' && editingId!==r.id){ const x=xOf(r), all=parseHist(r).tasks, st=all.find(t=>t.id==='tour'), own=all.filter(t=>t.custom).map(t=>({...t, due:taskDue(t)})); return [...(x.tour ? [st ? {...st, due:taskDue(st)} : {id:'tour', title:AUTO_TASKS.tour, done:false, due:ymd(new Date(r.saved||Date.now())), at:r.saved}] : []), ...own]; }   // 예약상담: 사전답사 전산 예약 + 직접 추가한 과업
  if(editingId===r.id && effStage(rec)==='예약상담') return tasks.filter(consultTask).map(t=>({...t, due:taskDue(t)}));
  if(editingId===r.id) return tasks.map(t=>({...t, due:taskDue(t)}));   // 지금 열어 둔 예약은 화면의 과업
  const x=xOf(r), ts=parseHist(r).tasks.map(t=>({...t}));
  const has = id => ts.some(t=>t.id===id);
  if(x.tbd && !has('tbdcall')) ts.push({id:'tbdcall', title:AUTO_TASKS.tbdcall, done:false, due:x.tbdDate||ymd(new Date(r.saved||Date.now()))});
  if(x.pay==='현장 결제' && r.date && !has('onsitecall')) ts.push({id:'onsitecall', title:AUTO_TASKS.onsitecall, done:false, due:tbdLimit(r.date)});
  return ts.filter(t=> !(t.id==='tbdcall' && !x.tbd) && !(t.id==='onsitecall' && x.pay!=='현장 결제'))   // 조건이 사라진 것은 뺌
    .map(t=>({...t, due: t.id==='tbdcall' && !t.dueSet && !t.done && x.tbdDate ? x.tbdDate : taskDue(t)}));
}
const openTasksOf = r => tasksOf(r).filter(t=>!t.done).sort((a,b)=>a.due.localeCompare(b.due));
const taskRecActive = r => !r.date || daysFrom(r.date, ymd(new Date())) <= 30;   // 방문 뒤 30일 지난 예약의 과업은 빼고
function dueTasks(){   // 마감이 오늘이거나 지난 해결 안 된 과업 (영업 담당이 있으면 내 예약만)
  const today=ymd(new Date()), me=savedOwner();
  const out=[]; (cache||[]).filter(r=>isGroupRec(r) && (!me || ownerOf(r)===me) && taskRecActive(r))
    .forEach(r=>openTasksOf(r).forEach(t=>{ if(t.due<=today) out.push({r, t}); }));
  return out.sort((a,b)=>a.t.due.localeCompare(b.t.due));
}
// 개인고객 통화 (personal.html, 통화 구분 '개인고객')의 추후 과업: 내가 받은(저장한) 통화의 안 끝난 과업
const isPersonalRec = r => r && r.callType==='개인고객';
let myTab = (()=>{ const q=new URLSearchParams(location.search).get('tab'); if(['all','personal','group'].includes(q)) return q; try{ return localStorage.getItem('sayuwon_my_tab')||'all'; }catch(_){ return 'all'; } })();   // 마이페이지 탭: all · personal · group (개인고객 화면에서 열면 ?tab=personal → 개인부터)
const MY_ONLY = new URLSearchParams(location.search).get('my')==='1';   // 마이페이지 단독 페이지 (mypage.html → group.html?my=1)
function myPersonalOpen(){
  const me=savedOwner(); if(!me) return [];
  return (cache||[]).filter(r=>isPersonalRec(r) && (r.owner||r.takenBy)===me).map(r=>{ let ts=[]; try{ ts=(JSON.parse(r.history||'{}').tasks)||[]; }catch(_){}
    return {r, left: ts.filter(t=>!t.done).map(t=>({...t, due: t.due || ymd(new Date(r.saved||Date.now()))})).sort((a,b)=>a.due.localeCompare(b.due))}; }).filter(o=>o.left.length);
}
const personalDueCount = () => { const today=ymd(new Date()); return myPersonalOpen().reduce((s,o)=>s+o.left.filter(t=>t.due<=today).length, 0); };
function renderMy(){
  const me=savedOwner(), today=ymd(new Date()), past=$('#myPast').checked;
  $('#myTitle').textContent = me ? `마이페이지 · ${me}` : '마이페이지';
  if(!me){ $('#mySum').textContent=''; $('#myBody').innerHTML='<p class="hint">맨 위 초록 헤더의 <b>영업 담당</b>에 이름을 넣으면, 그 이름이 영업 담당인 예약을 모아 보여 줍니다.</p>'; return; }
  const mine = myRecords().map(r=>({r, x:xOf(r), tasks:openTasksOf(r)}));
  const ahead = mine.filter(o=>!o.r.date || o.r.date>=today);
  const tbdAll = ahead.filter(o=>o.x.tbd);
  const open = mine.filter(o=>o.tasks.length && taskRecActive(o.r)).map(o=>({...o, left:o.tasks})).sort((a,b)=>a.left[0].due.localeCompare(b.left[0].due));
  const booked = o => stageOfRec(o.r)==='예약접수';   // 방문 예정은 예약접수만 (예약상담은 뺌)
  const shown = (past ? mine : ahead).filter(booked).slice().sort((a,b)=>(a.r.date||'9999').localeCompare(b.r.date||'9999'));
  $('#mySum').textContent = `담당 단체 예약 ${mine.length}건 · 방문 예정 ${ahead.length}건 · 미정 ${tbdAll.length}건 · 남은 과업 단체 ${open.reduce((s,o)=>s+o.left.length,0)}개 · 개인 ${myPersonalOpen().reduce((s,o)=>s+o.left.length,0)}개`;
  const org = r => esc(r.org || r.contact || '(업체 미정)');
  const dueTxt = d => { const n=daysFrom(today,d); return n<0 ? `<b class="late">${-n}일 지남</b>` : n===0 ? '<b class="late">오늘</b>' : `${n}일 남음`; };
  // 단체 탭 2열: ① 방문 예정 (예약접수만) ② 단체 추후 과업
  const none = t => `<p class="hint">${t}</p>`;
  let c1 = `<h3 class="my-h">${past?'전체 담당 예약':'방문 예정'} <small>${shown.length}건 · 방문일 순</small></h3>` + (shown.length
    ? `<ul class="pc-list">${shown.map(o=>{ const st=stageOfRec(o.r), left=o.tasks.filter(t=>!t.done).length, dq=docTag(o.r,'quote'), ds=docTag(o.r,'stmt');
        return `<li class="r" data-myopen="${esc(o.r.id)}"><span class="who"><b>${esc(dateLabel(o.r.date)||'방문일 미정')}</b> <span class="tag st-${st}">${st}</span> <b>${org(o.r)}</b>${o.r.people?` · ${esc(o.r.people)}명`:''}<br>`
          + `<small class="hint" style="margin:0">${contactCell(o.r)||'담당자 미입력'}</small>`
          + `${o.x.tbd?`<br><span class="tag st-가예약">미정: ${esc(o.x.tbd)}</span>${o.x.tbdDate?` <small class="hint" style="margin:0">${esc(mdLabel(o.x.tbdDate))}까지</small>`:''}`:''}`
          + `${dq||ds||left?`<br>${dq?`견적서 ${dq} `:''}${ds?`거래명세서 ${ds} `:''}${left?`<small class="hint" style="margin:0">남은 과업 ${left}개</small>`:''}`:''}</span></li>`; }).join('')}</ul>`
    : none(past?'담당한 예약이 없습니다.':'방문 예정인 담당 예약이 없습니다.'));
  // ② 추후 과업: 단체 예약 + 개인고객 통화의 해결 안 된 과업을 한 목록으로, 마감이 이른 것부터. 기한 지남 = 빨강
  const pers = myPersonalOpen().map(o=>({...o, personal:true}));
  const all2 = [...open, ...pers].sort((a,b)=>a.left[0].due.localeCompare(b.left[0].due));
  const nLeft = all2.reduce((s,o)=>s+o.left.length,0), nLate = all2.reduce((s,o)=>s+o.left.filter(t=>t.due<today).length,0);
  const c2 = `<h3 class="my-h">추후 과업 <small>단체 ${open.reduce((s,o)=>s+o.left.length,0)} · 개인 ${pers.reduce((s,o)=>s+o.left.length,0)} · 해결 안 된 ${nLeft}개${nLate?` · <b class="late">기한 지남 ${nLate}개</b>`:''}</small></h3>` + (all2.length
    ? `<ul class="pc-list">${all2.map(o=>`<li class="r my-tg" ${o.personal?`data-popen="${esc(o.r.id)}"`:`data-myopen="${esc(o.r.id)}"`}><span class="who">`
        + (o.personal ? `<span class="tag">개인</span> <b>${esc(o.r.contact||'(이름 없음)')}</b>${o.r.phone?` · ${esc(o.r.phone)}`:''}${o.r.date?` · ${esc(dateLabel(String(o.r.date).slice(0,10)))}`:''}<br>`
                      : `<span class="tag st-${stageOfRec(o.r)}">단체</span> <b>${org(o.r)}</b> · 방문 ${esc(dateLabel(o.r.date)||'미정')}<br>`)
        + o.left.map(t=>`<span class="my-task${t.due<today?' late':t.due===today?' today':''}">· ${esc(t.title)} <small>마감 ${esc(mdLabel(t.due))} (${dueTxt(t.due)})</small></span>`).join('<br>')
        + `</span></li>`).join('')}</ul>`
    : none('해결 안 된 과업이 없습니다.'));
  // 탭: 전체(단체 + 개인) · 개인 · 단체
  document.querySelectorAll('#myTabs [data-mt]').forEach(b=>b.classList.toggle('on', b.dataset.mt===myTab));
  $('#myPast').closest('label').hidden = myTab==='personal';
  const nG = open.reduce((s,o)=>s+o.left.length,0), persAll = myPersonalOpen(), nP = persAll.reduce((s,o)=>s+o.left.length,0);
  const taskList = (list, emptyMsg) => list.length ? `<ul class="pc-list">${list.map(o=>`<li class="r my-tg" ${o.personal?`data-popen="${esc(o.r.id)}"`:`data-myopen="${esc(o.r.id)}"`}><span class="who">`
      + (o.personal ? `<span class="tag">개인</span> <b>${esc(o.r.contact||'(이름 없음)')}</b>${o.r.phone?` · ${esc(o.r.phone)}`:''}${o.r.date?` · ${esc(dateLabel(String(o.r.date).slice(0,10)))}`:''}<br>`
                    : `<span class="tag st-${stageOfRec(o.r)}">단체</span> <b>${org(o.r)}</b> · 방문 ${esc(dateLabel(o.r.date)||'미정')}<br>`)
      + o.left.map(t=>`<span class="my-task${t.due<today?' late':t.due===today?' today':''}">· ${esc(t.title)} <small>마감 ${esc(mdLabel(t.due))} (${dueTxt(t.due)})</small></span>`).join('<br>')
      + `</span></li>`).join('')}</ul>` : none(emptyMsg);
  const lateOf = list => list.reduce((s,o)=>s+o.left.filter(t=>t.due<today).length,0);
  if(myTab==='personal'){
    // 개인: ① 추후 과업 ② 내가 받은 개인고객 통화 (최근)
    const calls = (cache||[]).filter(r=>isPersonalRec(r) && (r.owner||r.takenBy)===me).sort((a,b)=>String(b.saved).localeCompare(String(a.saved))).slice(0,50);
    $('#mySum').textContent = `개인고객 통화 ${calls.length}건 · 남은 과업 ${nP}개`;
    const p1 = `<h3 class="my-h">추후 과업 (개인) <small>${nP}개${lateOf(persAll)?` · <b class="late">기한 지남 ${lateOf(persAll)}개</b>`:''}</small></h3>` + taskList(persAll.map(o=>({...o, personal:true})), '해결 안 된 개인고객 과업이 없습니다.');
    const p2 = `<h3 class="my-h">내가 받은 개인고객 통화 <small>최근 ${calls.length}건</small></h3>` + (calls.length ? `<ul class="pc-list">${calls.map(r=>{ let ts=[]; try{ ts=JSON.parse(r.history||'{}').tasks||[]; }catch(_){} const left=ts.filter(t=>!t.done).length;
        return `<li class="r" data-popen="${esc(r.id)}"><span class="who"><b>${esc(r.contact||'(이름 없음)')}</b>${r.phone?` · ${esc(r.phone)}`:''}${r.date?` · ${esc(dateLabel(String(r.date).slice(0,10)))}`:''}<br><small class="hint" style="margin:0">${esc(fmt(r.saved))}${r.note?` · ${esc(String(r.note).split(/\n/)[0].slice(0,50))}`:''}${left?` · 남은 과업 ${left}개`:''}</small></span></li>`; }).join('')}</ul>` : none('내가 받은 개인고객 통화가 없습니다.'));
    $('#myBody').innerHTML = `<div class="my-cols two"><div class="my-col">${p1}</div><div class="my-col">${p2}</div></div>`; return;
  }
  if(myTab==='group'){
    $('#mySum').textContent = `담당 단체 예약 ${mine.length}건 · 방문 예정(예약접수) ${ahead.filter(booked).length}건 · 미정 ${tbdAll.length}건 · 남은 과업 ${nG}개`;
    const g2 = `<h3 class="my-h">추후 과업 (단체) <small>${nG}개${lateOf(open)?` · <b class="late">기한 지남 ${lateOf(open)}개</b>`:''}</small></h3>` + taskList(open, '해결 안 된 단체 과업이 없습니다.');
    $('#myBody').innerHTML = `<div class="my-cols two"><div class="my-col">${c1}</div><div class="my-col">${g2}</div></div>`; return;
  }
  // 전체: ① 개인 추후 과업 ② 단체 추후 과업 (다른 사람이 수정한 내 예약 칸은 2026-11-14에 없앰)
  const a1 = `<h3 class="my-h">추후 과업 (개인) <small>${nP}개${lateOf(persAll)?` · <b class="late">기한 지남 ${lateOf(persAll)}개</b>`:''}</small></h3>` + taskList(persAll.map(o=>({...o, personal:true})), '해결 안 된 개인고객 과업이 없습니다.');
  const a2 = `<h3 class="my-h">추후 과업 (단체) <small>${nG}개${lateOf(open)?` · <b class="late">기한 지남 ${lateOf(open)}개</b>`:''}</small></h3>` + taskList(open, '해결 안 된 단체 과업이 없습니다.');
  $('#myBody').innerHTML = `<div class="my-cols two"><div class="my-col">${a1}</div><div class="my-col">${a2}</div></div>`;
}
function paintMyCount(){ const n=savedOwner() ? dueTasks().length + personalDueCount() : 0;   // 마감이 오늘이거나 지난 과업 수 (단체 + 개인고객)
  const mm=myNewMemos().length, t=[n&&`과업 ${n}`, mm&&`메모 ${mm}`].filter(Boolean).join(' · ');   // 수정 표시는 없앰 · 내 예약에 확인 안 한 메모 수
  $('#myCount').hidden=!t; $('#myCount').textContent=t; }
function openMy(fromGroup){ if(fromGroup===true) myTab='group'; $('#myModal').hidden=false; renderMy();   // 단체 화면의 마이페이지 버튼 = '단체' 탭부터
  if(pending.length) flush(); else pull(); $('#myCloseBtn').focus(); }
// group.html?open=예약ID → 그 예약을 엶 (팝업 마이페이지에서 단체 줄을 누른 경우 · 목록을 받은 뒤)
let openGId = new URLSearchParams(location.search).get('open');
async function tryOpenG(){ if(!openGId) return; const list = await store.list(); const r=(list||[]).find(x=>x.id===openGId); if(!r) return; openGId=null; history.replaceState(null,'','group.html'); openRecordG(r); }
setTimeout(tryOpenG, 400);
const MY_EMBED = MY_ONLY && window.parent!==window;   // 다른 화면이 팝업으로 띄운 마이페이지
function closeMy(){ if(MY_EMBED){ window.parent.postMessage({type:'sy-my', ev:'close'}, '*'); return; } if(MY_ONLY && document.documentElement.classList.contains('my-only')){ location.href='./'; return; } $('#myModal').hidden=true; }   // 팝업 = 바깥 화면이 닫음, 단독 페이지 = 메뉴로
// 단체 화면의 「마이페이지」 = 이 화면 위 팝업 (메뉴 6번은 한 페이지)
$('#myOpenBtn').onclick=()=>openMy(true);
if(location.hash==='#my' && !MY_ONLY) setTimeout(openMy, 300);   // 예전 주소 group.html#my
if(MY_ONLY){ document.title='마이페이지 · 사유원 예약 관리 시스템'; $('#crumb').textContent='마이페이지'; setTimeout(openMy, 50); }
document.addEventListener('click', e=>{ const b=e.target.closest('#myTabs [data-mt]'); if(!b) return; myTab=b.dataset.mt; try{ localStorage.setItem('sayuwon_my_tab', myTab); }catch(_){} renderMy(); });
$('#myCloseBtn').onclick=closeMy;
$('#myPast').onchange=renderMy;
$('#myModal').addEventListener('mousedown', e=>{ if(e.target.id==='myModal' && !MY_ONLY) closeMy(); });
$('#myBody').addEventListener('click', e=>{ const pe=e.target.closest('[data-popen]');
  if(MY_EMBED){ const ge=e.target.closest('[data-myopen]'); if(pe||ge) window.parent.postMessage({type:'sy-my', ev:'go', url: pe ? 'personal.html?open='+encodeURIComponent(pe.dataset.popen) : 'group.html?open='+encodeURIComponent(ge.dataset.myopen)}, '*'); return; }   // 팝업 안: 바깥 화면이 그 화면으로 이동
  if(pe){ guardLeave(()=>{ location.href='personal.html?open='+encodeURIComponent(pe.dataset.popen); }); return; } const el=e.target.closest('[data-myopen]'); if(!el) return; const r=cache.find(x=>x.id===el.dataset.myopen); if(!r) return;
  if(MY_ONLY){ document.documentElement.classList.remove('my-only'); history.replaceState(null,'','group.html'); document.title='단체고객 전화응대 · 사유원 예약 관리 시스템'; $('#crumb').textContent='단체고객 전화응대'; $('#myModal').hidden=true; openRecordG(r); return; }   // 단체 줄 → 단체 화면으로 바뀌며 그 예약을 엶
  closeMy(); openRecordG(r); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#myModal').hidden){ e.preventDefault(); closeMy(); } });

// ===================== 남이 담당인 예약: 잠금 + 담당자에게 메모 =====================
// 영업 담당이 다른 사람인 예약을 열면 아무것도 고칠 수 없음(저장 · 과업 · 수정 · 삭제 모두). 바꿀 내용은 위쪽 메모로 → 담당자 화면에 '메모를 확인하세요' 팝업
const mergeMemos = (a, b) => { const m=new Map(); [...(b||[]), ...(a||[])].forEach(x=>{ if(!x||!x.id) return; const o=m.get(x.id); m.set(x.id, o ? {...x, ...o, seen: !!(o.seen||x.seen), seenAt:o.seenAt||x.seenAt||''} : x); }); return [...m.values()].sort((x,y)=>String(x.t).localeCompare(String(y.t))); };
function notMineMsg(r){ const o=ownerOf(r), me=savedOwner(); if(o && me && o!==me){ toast(`${o}님 담당 예약이라 고치거나 지울 수 없습니다. 예약을 열어 메모로 남겨 주세요.`); return true; } return false; }
const memoLi = (m, own) => `<li class="${own && !m.seen ? 'new' : ''}"><small>${esc(fmt(m.t))} · <b>${esc(m.by||'')}</b>${own ? (m.seen ? ' · 확인함' : ' · <b style="color:var(--red)">새 메모</b>') : ''}</small><br>${esc(m.text).replace(/\n/g,'<br>')}</li>`;
function paintLock(){
  document.body.classList.toggle('locked', !!lockOwner);
  const box=$('#ownerMemo'); if(!box) return;
  const me=savedOwner(), list=[...memos].reverse();
  if(lockOwner){
    box.className='owner-memo lock-ok'; box.hidden=false;
    box.innerHTML = `<div class="om-h">🔒 ${esc(lockOwner)}님 담당 예약입니다 · 고칠 수 없습니다</div><div class="hint" style="margin:0">바꿀 내용이나 전할 말은 아래에 메모로 남겨 주세요. ${esc(lockOwner)}님 화면에 「메모를 확인하세요」 알림이 뜹니다.</div>`
      + (list.length ? `<ul>${list.map(m=>memoLi(m,false)).join('')}</ul>` : '')
      + `<div class="om-add"><textarea id="omText" data-ime="ko" placeholder="예) 고객님이 인원 30 → 35명으로 바꾸고 싶다고 전화 주셨어요"></textarea><button type="button" class="btn primary" id="omSend">메모 남기기</button></div>`;
  } else if(editingId && memos.length){
    const unseen=memos.filter(m=>!m.seen && m.by!==me).length;
    box.className='owner-memo mine lock-ok'; box.hidden=false;
    box.innerHTML = `<div class="om-h">다른 사람이 남긴 메모 ${memos.length}개${unseen?` · <b style="color:var(--red)">새 메모 ${unseen}개</b> <button type="button" class="btn" id="omSeen" style="padding:2px 8px;font-size:12px">확인함</button>`:''}</div><ul>${list.map(m=>memoLi(m,true)).join('')}</ul>`;
  } else { box.hidden=true; box.innerHTML=''; }
}
async function saveMemos(id, fn){   // 공유 기록의 최신 예약에 메모를 바꿔 저장 (다른 칸은 건드리지 않음)
  const r=cache.find(x=>x.id===id); if(!r) return null;
  const ph=parseHist(r); ph.memos=fn(ph.memos||[]);
  const item={...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;
  if(editingId===id) memos=ph.memos;
  return item;
}
document.addEventListener('click', async e=>{
  if(e.target.id==='omSend'){ const ta=$('#omText'), text=ta.value.trim(); if(!text){ toast('메모를 적어 주세요.'); ta.focus(); return; }
    e.target.disabled=true;
    await saveMemos(editingId, ms=>[...ms, {id:'m'+Date.now().toString(36), t:new Date().toISOString(), by:savedOwner()||'', text, seen:false}]);
    paintLock(); toast(`메모를 남겼습니다. ${lockOwner}님께 알림이 갑니다.`); return; }
  if(e.target.id==='omSeen'){ const me=savedOwner(), now=new Date().toISOString(); await saveMemos(editingId, ms=>ms.map(m=>m.by!==me && !m.seen ? {...m, seen:true, seenAt:now} : m)); paintLock(); paintMemoCount(); }
});
// 잠긴 예약: 화면의 칸 · 버튼을 누르거나 쳐도 아무 일이 없게 (위쪽 메모 · 예약 현황 목록 · 텍스트 복사는 됨)
const lockBlocked = t => !!lockOwner && t && t.closest && t.closest('.layout') && !t.closest('.lock-ok, [data-mbdb], [data-book], #copyTextBtn, #histDet > summary');
let lockNudgeT=0;
['mousedown','click','dblclick','beforeinput','paste','drop','dragstart','change','input'].forEach(ev=>document.addEventListener(ev, e=>{
  if(!lockBlocked(e.target)) return; e.preventDefault(); e.stopImmediatePropagation();
  if(ev==='mousedown' && Date.now()-lockNudgeT>2500){ lockNudgeT=Date.now(); toast(`${lockOwner}님 담당 예약이라 고칠 수 없습니다. 위쪽 메모로 남겨 주세요.`); }
}, true));
document.addEventListener('keydown', e=>{ if(!lockBlocked(e.target)) return; if(['Tab','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) || ((e.ctrlKey||e.metaKey) && /^[ca]$/i.test(e.key))) return; e.preventDefault(); e.stopImmediatePropagation(); }, true);
// 내 예약에 새 메모가 있으면: '메모를 확인하세요' 팝업 (확인할 때까지, 이 화면에서는 새 메모가 생길 때마다)
let memoShown=new Set();
function myNewMemos(){ const me=savedOwner(); if(!me) return []; const out=[]; (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)===me).forEach(r=>parseHist(r).memos.forEach(m=>{ if(!m.seen && m.by!==me) out.push({r, m}); })); return out.sort((a,b)=>String(b.m.t).localeCompare(String(a.m.t))); }
function paintMemoCount(){ if(typeof paintMyCount==='function') paintMyCount(); }
function checkMemoPopup(){
  if(MY_EMBED) return;
  const list=myNewMemos(); if(!list.length || list.every(o=>memoShown.has(o.m.id))) return;
  if([...document.querySelectorAll('.modal')].some(m=>!m.hidden)) return;   // 다른 팝업이 닫힌 뒤에 (1분마다 다시 봄)
  list.forEach(o=>memoShown.add(o.m.id));
  $('#memoList').innerHTML = list.map(({r,m})=>`<li><span class="who"><b>${esc(r.org||r.contact||'(업체 미정)')}</b> · 방문 ${esc(dateLabel(r.date)||'미정')}<br><small class="hint" style="margin:0">${esc(fmt(m.t))} · <b>${esc(m.by||'')}</b>님 메모</small><br>${esc(m.text).replace(/\n/g,'<br>')}</span><button class="btn primary" data-mseen="${esc(r.id)}|${esc(m.id)}">확인</button><button class="btn" data-mopen="${esc(r.id)}|${esc(m.id)}">열기</button></li>`).join('');
  $('#memoTitle').innerHTML = `메모를 확인하세요 <small>내 예약에 다른 사람이 남긴 메모 ${list.length}개</small>`;
  $('#memoModal').hidden=false;
}
$('#memoLater').onclick=()=>{ $('#memoModal').hidden=true; };
$('#memoList').addEventListener('click', async e=>{ const d=e.target.dataset, v=d.mseen||d.mopen; if(!v) return; const [rid,mid]=v.split('|'), now=new Date().toISOString();
  e.target.disabled=true; await saveMemos(rid, ms=>ms.map(m=>m.id===mid ? {...m, seen:true, seenAt:now} : m));
  e.target.closest('li').remove(); if(!$('#memoList').children.length) $('#memoModal').hidden=true;
  if(editingId===rid) paintLock(); paintMemoCount();
  if(d.mopen){ $('#memoModal').hidden=true; const r=cache.find(x=>x.id===rid); if(r) openRecordG(r); } else toast('메모를 확인했습니다.'); });
setInterval(()=>{ if(window.__tasksReady) checkMemoPopup(); }, 60000);

// ===================== 마감이 된 추후 과업 팝업 =====================
// 마감이 오늘이거나 지난, 해결 안 된 과업(영업 담당이 있으면 내 예약만)을 해결될 때까지 계속 띄움: 열 때 · 9시 · '나중에'를 누르면 2시간 뒤 다시
const TASK_SNOOZE_LS='sayuwon_task_snooze', SNOOZE_MS=2*3600e3, TASK_SLOT_LS='sayuwon_task_slot', QUIET_MS=30*60e3;
const ALERT_HOURS=[8,11,13,17];   // 추후 과업 마감 알림 시각 (개인고객 화면과 같음)
const SELF_DONE = new Set(['erp','erpcheck','erpfix','progstaff','mbmenu']);   // erp · erpfix: 전산 내역을 붙여넣어야 완료   // 칸을 채우면 저절로 완료되는 과업은 '열기'만
function checkTbdPopup(force){
  // 마감 지난 과업: 열 때 · 1분마다 (나중에 = 2시간 뒤). 오늘 마감 과업: 오후 1시, 아직 안 끝났으면 오후 5시에 (시간마다 한 번)
  // 단, 입력(과업이 생기거나 마감을 바꾼 것)한 지 30분이 안 된 과업은 알리지 않음
  // 2026-11-14부터: 오전 8시 · 11시 · 오후 1시 · 5시에 (그 시각이 지나고 처음 화면을 볼 때, 시각마다 한 번) 마감이 오늘이거나 지난 과업을 단체 + 개인고객 함께
  // 개인고객 화면과 같은 기록(TASK_SLOT_LS)을 써서, 한 시각에 두 화면에서 두 번 뜨지 않음
  const nowD=new Date(), now=+nowD, today=ymd(nowD); let slots=''; try{ slots=localStorage.getItem(TASK_SLOT_LS)||''; }catch(_){}
  if(!force && [...document.querySelectorAll('.modal')].some(m=>!m.hidden)) return;   // 다른 팝업이 떠 있으면 나중에 (1분마다 다시 봄)
  const h=nowD.getHours(), slotH=ALERT_HOURS.filter(x=>h>=x).pop(), slotKey=`${today}|${slotH}`;
  if(!force && (slotH==null || slots.split(',').includes(slotKey))) return;
  const fresh = ({r,t}) => now - Math.max(+new Date(t.dueSetAt||0)||0, +new Date(t.at||r.saved||0)||0) < QUIET_MS;
  const pers = myPersonalOpen().flatMap(o=>o.left.filter(t=>t.due<=today).map(t=>({r:o.r, t, personal:true})));
  const due=[...dueTasks(), ...pers].filter(o=>!fresh(o)).sort((a,b)=>a.t.due.localeCompare(b.t.due));
  if(!due.length) return;
  if(slotH!=null){ try{ localStorage.setItem(TASK_SLOT_LS, [...slots.split(',').filter(s=>s.startsWith(today)), slotKey].join(',')); }catch(_){} }
  $('#tbdList').innerHTML = due.map(({r,t,personal})=>{ const n=daysFrom(today,t.due);
    if(personal) return `<li class="${n<0?'late':''}"><span class="who"><span class="tag">개인</span> <b>${esc(r.contact||'(이름 없음)')}</b>${r.phone?` · ${esc(r.phone)}`:''}<br>`
      + `<b class="${n<0?'late':''}">${esc(t.title)}</b> <small class="hint" style="margin:0">마감 ${esc(mdLabel(t.due))} ${n<0?`(${-n}일 지남)`:'(오늘)'}</small></span>`
      + `<button class="btn primary" data-pdone="${esc(r.id)}|${esc(t.id)}">완료</button><button class="btn" data-popen2="${esc(r.id)}">열기</button></li>`;
    return `<li class="${n<0?'late':''}"><span class="who"><b>${esc(r.org||r.contact||'(업체 미정)')}</b> · 방문 ${esc(dateLabel(r.date)||'미정')}${r.owner?` · ${esc(r.owner)}`:''}<br>`
      + `<b class="${n<0?'late':''}">${esc(t.title)}</b> <small class="hint" style="margin:0">마감 ${esc(mdLabel(t.due))} ${n<0?`(${-n}일 지남)`:'(오늘)'}${t.id==='tbdcall'||t.id==='onsitecall'?` · ${esc(firstContact(r)||'담당자 연락처 없음')}`:''}</small></span>`
      + (SELF_DONE.has(t.id) ? '' : `<button class="btn primary" data-tdone="${esc(r.id)}|${esc(t.id)}">완료</button>`) + `<button class="btn" data-tbdopen="${esc(r.id)}">열기</button></li>`; }).join('');
  $('#tbdTitle').innerHTML = `마감이 된 추후 과업 <small>${due.length}개 · 단체 + 개인 · 알림은 오전 8시 · 11시 · 오후 1시 · 5시</small>`;
  $('#tbdModal').hidden=false;
}
$('#tbdLater').onclick=()=>{ $('#tbdModal').hidden=true; };   // 다음 알림 시각에 다시
// 과업 하나 완료 (열어 둔 예약이면 화면의 과업, 아니면 저장된 기록을 고쳐 저장)
async function doneTask(id, tid){
  const r=cache.find(x=>x.id===id); if(!r) return;
  const now=new Date().toISOString(), base=tasksOf(r).find(t=>t.id===tid); if(!base) return;
  if(editingId===id){ let t=tasks.find(x=>x.id===tid); if(!t){ t={...base}; tasks.push(t); } t.done=true; t.doneAt=now; if(t.subs) Object.keys(t.subs).forEach(k=>t.subs[k]=true); (t.xsubs||[]).forEach(x=>x.done=true); renderTasks(); await save({auto:true}); return; }
  const ph=parseHist(r); let t=ph.tasks.find(x=>x.id===tid); if(!t){ t={...base, memo:'', at:now}; ph.tasks.push(t); }
  t.done=true; t.doneAt=now; if(DOC_SUBS[t.id]) t.subs=Object.fromEntries(DOC_SUBS[t.id].map(([k])=>[k,true])); (t.xsubs||[]).forEach(x=>x.done=true); ph.h.push({t:now, by:savedOwner()||'', what:`[과업] ${t.title} 완료`});
  const item={...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now}; await store.put(item);
  const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;   // 공유 기록에서 다시 받기 전에도 바로 반영
}
$('#tbdList').addEventListener('click', async e=>{
  // 개인고객 과업: 열기 = 개인고객 화면에서 그 통화, 완료 = 그 통화 기록에 완료로 저장
  if(e.target.dataset.popen2){ const id=e.target.dataset.popen2; $('#tbdModal').hidden=true; guardLeave(()=>{ location.href='personal.html?open='+encodeURIComponent(id); }); return; }
  if(e.target.dataset.pdone){ const [id,tid]=e.target.dataset.pdone.split('|'), r=cache.find(x=>x.id===id); if(!r) return; e.target.disabled=true;
    let h={}; try{ h=JSON.parse(r.history||'{}')||{}; }catch(_){} const t=(h.tasks||[]).find(x=>x.id===tid); if(t){ t.done=true; t.doneAt=new Date().toISOString(); t.doneBy=savedOwner()||''; (t.xsubs||[]).forEach(x=>x.done=true); }
    const item={...r, history:JSON.stringify(h)}; await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;
    e.target.closest('li').remove(); if(!$('#tbdList').children.length) $('#tbdModal').hidden=true; toast('과업을 완료로 표시했습니다.'); paintMyCount(); if(!$('#myModal').hidden) renderMy(); return; }
  const dn=e.target.dataset.tdone, open=e.target.dataset.tbdopen;
  if(open){ const r=cache.find(x=>x.id===open); $('#tbdModal').hidden=true; if(r) openRecordG(r); }
  if(dn){ const [id,tid]=dn.split('|'); e.target.disabled=true; await doneTask(id, tid);
    e.target.closest('li').remove(); if(!$('#tbdList').children.length) $('#tbdModal').hidden=true;
    toast('과업을 완료로 표시했습니다.'); paintMyCount(); if(!$('#myModal').hidden) renderMy(); }
});
setInterval(()=>{ if(window.__tasksReady) checkTbdPopup(); }, 60000);   // 1분마다 확인 (나중에 = 2시간 뒤 다시)

// ===================== 미정 항목 입력 기한: 방문일 전주 목요일까지 =====================
// 그보다 늦게 잡으면 사유를 받는다 (비고 칸 '입력 기한 늦춘 사유', 수정 기록에도 남음)
const tbdMax = r => r.date ? tbdLimit(r.date) : '';
const tbdIsLate = r => !!(r.tbd && r.tbdDate && tbdMax(r) && r.tbdDate > tbdMax(r));
let lateThen=null;   // 사유를 받은 뒤 이어서 할 일 (저장)
function openLate(then){
  lateThen=then||null;
  $('#lateMsg').textContent = `미정 항목 답변일은 ${tbdLimitName(rec.date)}(${mdLabel(tbdMax(rec))})까지입니다. ${mdLabel(rec.tbdDate)}로 늦추는 사유를 적어 주세요.`;
  $('#lateReason').value = rec.tbdLate||''; $('#lateModal').hidden=false; setTimeout(()=>$('#lateReason').focus(),0);
}
function closeLate(){ $('#lateModal').hidden=true; lateThen=null; }
$('#lateOk').onclick=()=>{ const v=$('#lateReason').value.trim().replace(/\s*\/\s*/g,', '); if(!v){ $('#lateReason').focus(); toast('사유를 적어 주세요.'); return; }
  rec.tbdLate=v; touched.add('tbdLate'); const then=lateThen; closeLate(); renderSide(); if(then) then(); };
$('#lateFix').onclick=()=>{ rec.tbdDate=tbdMax(rec); rec.tbdLate=''; tbdAuto=true; $('#f_tbdDate').value=rec.tbdDate; const then=lateThen; closeLate(); paintFields(); renderSide(); if(then) then(); };
$('#lateReason').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); $('#lateOk').click(); } });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#lateModal').hidden){ e.preventDefault(); closeLate(); } });
// 기한 칸을 바꿔서 늦어지면 바로 사유 팝업. 기한 안으로 돌아오면 사유는 지움
$('#f_tbdDate').addEventListener('change', ()=>{ if(tbdIsLate(rec)){ if(!rec.tbdLate) openLate(); } else if(rec.tbdLate){ rec.tbdLate=''; renderSide(); } });

// ===================== 새로고침해도 마지막으로 보던 화면 =====================
// 열어 둔 예약 · 저장 안 한 입력 · 펼친 묶음 · 열어 둔 목록/마이페이지 · 스크롤을 이 브라우저에 기억했다가 다시 열 때 그대로
const VIEW_LS='sayuwon_view';
let viewT=null, restoring=false;
function saveView(){
  if(!window.__autoReady || restoring || MY_ONLY) return;   // 마이페이지 단독 화면(메뉴 6)은 기억하지 않음 → 단체 화면을 열 때 마이페이지가 먼저 뜨지 않게
  try{
    const dirty=isDirty();
    const v={ id:editingId||'', dirty, opt:[...optOpen], y:Math.round(window.scrollY),
      modal: !$('#listModal').hidden ? 'list' : '', at:Date.now() };   // 마이페이지 팝업은 기억하지 않음 (단체 화면은 늘 입력 화면부터)
    if(dirty){ v.rec=rec; v.memo=$('#memoBox').value; v.tasks=tasks; v.nc=nContacts; v.tbdAuto=tbdAuto; }   // 저장 안 한 입력은 통째로
    localStorage.setItem(VIEW_LS, JSON.stringify(v));
  }catch(_){}
}
const saveViewSoon = () => { clearTimeout(viewT); viewT=setTimeout(saveView, 300); };
window.addEventListener('scroll', saveViewSoon, {passive:true});
window.addEventListener('pagehide', saveView);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) saveView(); });
['listModal','myModal'].forEach(id=>new MutationObserver(saveViewSoon).observe($('#'+id), {attributes:true, attributeFilter:['hidden']}));
async function restoreView(){
  let v=null; try{ v=JSON.parse(localStorage.getItem(VIEW_LS)||'null'); }catch(_){}
  if(!v) return;
  restoring=true;
  try{
    await store.list();
    const r = v.id ? cache.find(x=>x.id===v.id) : null;
    if(r) openRecord(r);
    if(v.dirty && v.rec && (r || !v.id)){   // 저장 안 한 입력 되살리기 (저장된 예약이면 그 위에)
      Object.assign(rec, v.rec); Object.keys(v.rec).forEach(k=>{ if(v.rec[k]) touched.add(k); });
      $('#memoBox').value = v.memo||''; if(Array.isArray(v.tasks)) tasks=v.tasks; tbdAuto=!!v.tbdAuto;
      nContacts=Math.max(1, v.nc||nContactsOf(rec)); renderContacts(); renderForm(); renderTasks();
      if(isDirty()) toast('저장하지 않았던 입력을 되살렸습니다.');
    }
    optOpen=new Set(v.opt||[]); paintOpt();
    if(v.modal==='list') openList();
    setTimeout(()=>window.scrollTo(0, v.y||0), 450);   // 예약을 열 때 맨 위로 가는 스크롤이 끝난 뒤
  }catch(_){}
  finally{ setTimeout(()=>{ restoring=false; saveView(); }, 600); }
}
emptySnap=snap(); window.__autoReady=true; paintDirty();   // 자동 저장 시작 (빈 화면 기준)
restoreView();   // 새로고침 전에 보던 화면
window.__tasksReady=true; renderTasks(); checkPayPopup(); takeDocs(); checkTbdPopup(); checkMemoPopup();   // 추후 과업 · 결제 확인 알림 · 미정 항목 알림
window.addEventListener('focus', ()=>{ if(priceLoaded && Date.now()-priceLoaded>10*60000) loadQuotePrices(); });
$('#memoBox').focus();

