// !! 자동으로 합친 파일 — 직접 고치지 마세요. 소스는 js/group/*.js, 고친 뒤 tools/build.ps1 실행 (어느 조각에 무엇이 있는지: docs/코드-지도.md 3절) !!
// ▣ js/group/01-fields.js — 칸 정의: FIELDS(묶음 · 키 · 이름 · 칸 모양 · 물어볼 말) · 담당자 칸 · 프로그램에 딸린 칸(담당 · 시간대 · 코스 · 장소) · 프로그램 → 견적서 품목
// ===== 단체고객 응대 (group.html) =====
// 구역 지도 · 데이터 모양 · 자주 하는 수정은 docs 14절. 공통 도구(SY: 주소 · 날짜 · 전화 · esc)는 js/common.js
// 예약 칸 · 예약 내역(가격 · 할인) · 추후 과업 · 전산 내역 · 예약 현황 · 단체예약 목록 · 나의 할일 · 잠금 · 메모 · 알림

// ===================== 필드 정의 (엑셀 메인 시트 열 기준) =====================
// grp, key, label, 엑셀열, 너비, 물어볼 질문(필수)
const FIELDS = [
  ['기본','org','업체(단체명)','D','w2','단체명(기관명)이 어떻게 되실까요?'],
  ['기본','date','방문일','B','w2',  '방문 날짜가 언제로 생각하고 계실까요?'],
  ['기본','people','관람 인원','I','',  '방문 인원은 총 몇 분이세요? (인솔자·기사님 포함 여부도)'],
  ['기본','pchg','인원 변경','','',  null],   // 인원이 바뀔 수 있으면 체크
  ['방문','tin','입장시각','H','',  '몇 시쯤 도착 예정이세요?'],
  ['방문','gate','입장문','','',  null],   // 치허문 · 곡신문 · 미정
  ['방문','tout','퇴장시각 (선택)','H','',  null],   // 2026-11-16 화면에서 숨김 (그 자리에 차량). 예전 기록 값은 확인 멘트 · 요약에 그대로
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
  ['프로그램(개별)','gaga','음료쿠폰(가가빈빈)','S','',null],
  ['프로그램(개별)','sound','사운드워킹','','',null],   // 시트 열 없음 → 비고 칸 '추가 프로그램'에
  ['프로그램(개별)','scent','사유의 향','','',null],   // 시트 열 없음 → 비고 칸 '추가 프로그램'에
  ['프로그램(개별)','haeorum','새벽 해오름 산책','','',null],   // 시트 열 없음 → 비고 칸 '추가 프로그램'에. 금 120,000 · 토/일(공휴일) 139,000, 관람료 포함(관람권 따로 없음) · 할인 없음
  ['프로그램(시간)','chabang','차방 대관','O','',null],
  ['프로그램(시간)','dangdu','당두봉갈 대관','Q','',null],
  ['프로그램(시간)','donghaeng','동행 도슨트','P','',null],
  ['프로그램(시간)','seminar','세미나 도슨트','','',null],   // 시트 열 없음 → 비고 칸 '추가 프로그램'에
  ['프로그램(시간)','seminar2','세미나 도슨트(2)','','',null],   // 두 장소에서 함께 할 때 두 번째 세미나 도슨트 (견적서 · 전산은 세미나 한 품목으로 합침)
  ['굿즈','goods','굿즈 품목','','w4',null],   // 굿즈 구매: 견적서 품목 리스트의 굿즈 품목에서 골라 수량 (값: "고추장 x2 · 모과청(new) x1")
  ['굿즈','stf_goods','굿즈 담당','','',null],   // 굿즈도 담당 필수 (기본 = 영업 담당)
  ['굿즈','viewSrc','관람 종류','','',null],
  ['굿즈','views','관람 · 관람+식사 추가 품목','','',null],   // 관람 영역의 다른 품목 "평일 관람(학생) x5 · 평일(관람, 사담 윈터 스페셜 다이닝 런치) x10" (사담 1부 · 2부 · 디너 · 해오름은 각자 칸)
  ['굿즈','viewN','관람권 인원','','',null],   // 기본 관람 줄 인원을 직접 줄였을 때만 (비면 = 관람 인원 − 다른 관람 영역 인원)   // 예약 내역 관람 줄에서 고른 관람 품목 (평일 · 주말은 방문일에 맞춰 바뀜, 비면 입장 시각으로)
  ['굿즈','inotes','항목 비고','','',null],   // 예약 내역 줄마다 비고 "sadam1=창가 자리; g:모과청(new)=선물 포장" (시트 비고 칸 '항목 비고')
  ['굿즈','idisc','항목 할인','','',null],   // 예약 내역 줄마다 할인 버튼 "sadam1=grp; v:(관람, …)=none" (시트 비고 칸 '항목 할인')
  ['굿즈','linkSent','결제링크 전송','','',null],   // 결제링크를 보낸 일시 (예약 내용의 「결제링크 전송」 버튼, 시트 비고 칸)
  ['굿즈','paidAt','입금 확인','','',null],   // 입금을 확인한 일시 (「입금 확인」 버튼)
  ['굿즈','istu','항목 학생','','',null],   // 관람 · 관람+식사 줄마다 학생 인원 "sadam1=5; v:관람(09:00~18:00)=3" (나머지는 성인, 2026-11-20 · 시트 비고 칸 '항목 학생')
  ['굿즈','islots','항목 시간 더하기','','',null],   // 차방 · 당두봉갈 대관에 더한 시작 · 끝 "chabang=15:00~16:00,17:00~18:00; dangdu=10:00~11:00" (첫 시간대는 예전처럼 tm_키 · 2026-11-27 · 시트 비고 칸 '항목 시간 더하기')
  ['굿즈','erpSame','전산 같은 품목','','',null],   // 전산 품목 이름은 다르지만 같은 것 "seminar>dangdu" (전산 세미나 도슨트 = 예약 당두봉갈 대관, 2026-11-21 · 시트 비고 칸)
  ['굿즈','isp','항목 특별 할인','','',null],   // 줄마다 특별 할인 인원 · 기타 할인 "v:…=dKansong:2|0:10000|재방문 감사" (시트 비고 칸 '항목 특별 할인')
  ['굿즈','idamt','항목 할인액','','',null],   // 할인액을 직접 고친 줄 "sadam1=200000:125000" (과세(신라):비과세(사유원), 시트 비고 칸 '항목 할인액')
];
// 프로그램 · 굿즈 담당: 프로그램마다 'stf_키' 칸을 바로 뒤에. 모두 필수, 기본은 영업 담당 (바꿀 수 있음)
const STAFF_FREE = new Set();   // 예전엔 차방 · 당두봉갈 대관 제외 → 이제 모두 담당 필수
// 프로그램에 딸린 칸: 담당(stf_) · 도슨트는 시간대(tm_) · 코스(crs_)도. 프로그램을 넣었을 때만 보임
const SUB_NAME = { stf:'담당', tm:'시간대', crs:'출발지', plc:'장소' };   // 장소(plc_) = 세미나 도슨트만 (몽몽차방 · 당두봉갈 · 기타)
const PLC_OPTS = ['몽몽차방','당두봉갈','기타'];
const CRS_DEFAULT = '앵당삼거리';   // 도슨트 출발지 기본 (2026-11-19 · 예전 값 「앵당삼거리 시작」도 앵당삼거리로)
const CRS_OPTS = ['앵당삼거리','치허문','곡신문','사담'];   // 도슨트 출발지 드롭다운
const crsNorm = v => { const s=String(v||'').trim(); return /^앵당/.test(s) ? '앵당삼거리' : s.replace(/\s*(에서\s*)?시작$/,''); };
const isSub = k => /^(stf|tm|crs|plc)_/.test(k);
const baseOf = k => String(k).replace(/^(stf|tm|crs|plc)_/,'');
const isStf = k => /^stf_/.test(k);
const needsStaff = k => !isSub(k) && !STAFF_FREE.has(k);
const isDocent = label => /도슨트/.test(label||'');
const subRows = f => [...(/^seminar2?$/.test(f[1]) ? ['tm','plc'] : isDocent(f[2]) ? ['tm','crs'] : ['tm']), ...(needsStaff(f[1]) ? ['stf'] : [])].map(p=>[f[0], `${p}_${f[1]}`, `${f[2]} ${SUB_NAME[p]}`, '', '', null]);

for(let i=FIELDS.length-1;i>=0;i--){ const f=FIELDS[i]; if(/^프로그램/.test(f[0]) && !isSub(f[1])) FIELDS.splice(i+1,0,...subRows(f)); }
// 세미나 도슨트 3회차부터 (2026-11-27): 회차마다 시작 · 끝(tm_seminarN) · 장소(plc_seminarN) · 담당(stf_seminarN) 칸만 둠 — 품목 칸(seminarN)은 없음 (수량은 세미나 도슨트 한 칸). 2회차는 예전 「세미나 도슨트(2)」 칸 그대로
const SEM_MAX = 6;   // 회차 줄은 여기까지 (그보다 많은 횟수는 수량만)
for(let n=3;n<=SEM_MAX;n++){ const at=FIELDS.findIndex(f=>f[1]==='stf_seminar'+(n-1)); FIELDS.splice(at+1,0,...['tm','plc','stf'].map(p=>['프로그램(시간)', `${p}_seminar${n}`, `세미나 도슨트(${n}) ${SUB_NAME[p]}`, '', '', null])); }
// 프로그램 품목 ↔ 견적서 품목 (견적서·금액 계산용)
const PROG_SRC = { yoga:'요가프로그램(단체)', gaga:'음료쿠폰(가가빈빈)', chabang:'대관', dangdu:'대관', donghaeng:'해설사도슨트(수정)', seminar:'세미나', seminar2:'세미나', sound:'사운드워킹', scent:'사유의 향', haeorum:'사유원 새벽 해오름 산책(평일)' };
const HAEORUM_WE = '사유원 새벽 해오름 산책(주말)';
const progSrc = (k, r) => k==='haeorum' && r && r.date && isRedDay(r.date) ? HAEORUM_WE : PROG_SRC[k];   // 해오름 산책: 토/일 · 공휴일은 주말 품목
// 지금 견적서 품목 리스트에 있는 단체 품목 (이것 말고 새로 추가된 것만 프로그램 칸으로 붙임)
const PROG_KNOWN = ['사유원 새벽 해오름 산책(주말)','대관','세미나','해설사도슨트(수정)','임원도슨트(수정)','사운드워킹','사유의 향','요가프로그램(단체)','음료쿠폰(가가빈빈)','음료쿠폰(몽몽차방)','사유의 밥상(단체)','당두봉갈 대관'];
const PROG_GRP = { geach:'프로그램(개별)', gtime:'프로그램(시간)' };
const UNIT = k => /^seminar\d?$/.test(k) ? '회' : COUPON_IN_GOODS.includes(k) ? '개' : (FIELDS.find(f=>f[1]===k)||[])[0]==='프로그램(시간)' ? '시간' : '명';   // 세미나 도슨트는 회 (2026-11-18)
// 세미나 도슨트 수량 2 = 두 번(두 장소): 두 번째의 시작 · 끝 · 장소 · 비고는 예전 「세미나 도슨트(2)」 칸(tm_seminar2 · plc_seminar2 · 비고 seminar2)에 둠 (2026-11-18)
const sem2On = r => numOf(r.seminar)>=2 || !!r.seminar2;
const SEM2_IX = Array.from({length:SEM_MAX-1}, (_,i)=>i+2).flatMap(n=>['tm_seminar'+n,'plc_seminar'+n,'stf_seminar'+n]);   // 2회차부터의 시작 · 끝 · 장소 · 담당 칸 (담당 2026-11-21 · 3회차부터 2026-11-27)
// 세미나 도슨트 횟수만큼 회차 줄 (2026-11-27): 2회차부터의 칸 이름 ['seminar2','seminar3', …] — 1회차는 세미나 도슨트 줄 자체. 예전 「세미나 도슨트(2)」 줄이 따로 남은 기록은 그 줄이 2회차라 여기서는 빈 목록
const semXKeys = r => !r || !r.seminar || r.seminar2 ? [] : Array.from({length:Math.max(0, Math.min(SEM_MAX, numOf(r.seminar))-1)}, (_,i)=>'seminar'+(i+2));
const isSemX = k => /^seminar[2-9]$/.test(String(k));
const semNo = k => +String(k).replace(/\D/g,'') || 1;   // 'seminar3' → 3 · 'seminar' → 1
const semXName = (k, r) => isSemX(k) ? `세미나 도슨트 ${semNo(k)}회차` : k==='seminar' && r && semXKeys(r).length ? '세미나 도슨트 1회차' : '';   // 과업 · 안내 글에 쓰는 이름
// 대관(차방 · 당두봉갈)에 더한 시작 · 끝 (2026-11-27): rec.islots = "chabang=15:00~16:00,17:00~18:00" — 첫 시간대는 예전처럼 tm_키, 여기는 둘째부터. 금액 · 수량(시간)은 건드리지 않음
const SLOT_KEYS = ['chabang','dangdu'], SLOT_MAX = 5;
const slotsMap = r => Object.fromEntries(String((r && r.islots)||'').split(/\s*;\s*/).map(s=>{ const i=s.indexOf('='); return i>0 ? [s.slice(0,i).trim(), s.slice(i+1).split(',').map(x=>x.trim())] : null; }).filter(Boolean));
const itemSlots = (r, k) => r && r[k] && SLOT_KEYS.includes(k) ? (slotsMap(r)[k]||[]) : [];   // 빈 줄('')도 그대로 (화면에 빈 칸으로)
const itemSlotTimes = (r, k) => itemSlots(r, k).filter(v=>String(v).replace('~','').trim());   // 시각이 들어간 것만 (전산 비고 · 예약 현황 등)
const COUPON_IN_GOODS = ['gaga'];   // 음료쿠폰: 품목 고르기에서 굿즈 묶음에 · 줄에는 시작 · 끝 없이 비고만 (저장은 예전 칸 gaga 그대로, 2026-11-18)
const isDrinkSrc = src => /음료쿠폰|\((몽몽차방|가가빈빈)\)/.test(String(src||''));   // 음료쿠폰 굿즈 (굿즈 묶음 맨 위 · 예약 현황 「음료쿠폰」). 예전 기록의 몽몽차방 · 가가빈빈 음료도 음료쿠폰으로 셈 (2026-11-21)
const goodsKeyOf = src => COUPON_IN_GOODS.find(c=>normSrc(PROG_SRC[c])===normSrc(src)) || '';   // 품목 관리 굿즈 품목 → 예전 전용 칸 (음료쿠폰(가가빈빈) → gaga)
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
// 굿즈 담당: 비어 있으면 영업 담당으로 채움 (고칠 수 있음). 굿즈가 없으면 비움
function syncGoodsStaff(){
  const me=(rec.owner||savedOwner()||'').trim(), want = rec.goods ? me : '';
  if(!want && !rec.goods && !rec.stf_goods) return false;
  if(rec.goods && !me) return false;   // 영업 담당 이름이 없으면 그대로 (담당 입력 과업이 알려 줌)
  if(rec.goods && String(rec.stf_goods||'').trim()) return false;   // 직접 고친(또는 이미 들어간) 굿즈 담당은 그대로 (2026-11-16: 고칠 수 있게)
  rec.stf_goods=want; touched.add('stf_goods'); return true;
}
const missingStaff = r => [...STAFF_BASES().filter(k=>r[k] && needsStaff(k) && !String(r['stf_'+k]||'').trim()),
  ...semXKeys(r).filter(k=>!String(r['stf_'+k]||'').trim())];   // 세미나 도슨트 2회 이상: 회차마다 담당 필수 (2회차 2026-11-21 · 3회차부터 2026-11-27)
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
const CFIELDS = [['name','담당자 성함','담당자분 성함이 어떻게 되세요?'],['phone','연락처','연락 가능한 번호 하나 남겨주시겠어요?'],['email','이메일','견적서 받으실 이메일 주소 알려주시겠어요?'],['memo','메모','']];   // 메모 = 담당자마다 (필수 아님, 시트 비고 칸 '담당자 메모', 2026-11-18)
const KEYS = FIELDS.map(f=>f[1]);
// 처음엔 접어 두고 버튼으로 펼치는 묶음 (각 묶음 아래에 그날 예약 현황)
const OPT = { '사담':{id:'sadam', title:'사담 식사'}, '몽몽마방':{id:'mabang', title:'몽몽마방 식사', short:'몽몽마방'}, '프로그램(개별)':{id:'progE', title:'프로그램(개별)', short:'개별 프로그램'}, '프로그램(시간)':{id:'progT', title:'프로그램(시간)', short:'시간 프로그램'}, '굿즈':{id:'goods', title:'굿즈 구매', short:'굿즈'} };
let optOpen = new Set();
const GROUP_OF = Object.fromEntries(FIELDS.map(f=>[f[1], f[0]]));
const LABEL = Object.fromEntries(FIELDS.map(f=>[f[1], ['사담','몽몽마방'].includes(f[0]) ? `${f[0]} ${f[2]}` : f[2]]));
for(let n=3;n<=SEM_MAX;n++) LABEL['seminar'+n]=`세미나 도슨트(${n})`;   // 3회차부터는 품목 칸이 없어 이름만 (비고 칸에 「프로그램 시간대 세미나 도슨트(3):14:00~14:30」로 저장 · js/group/02 packExtra)
CFIELDS.forEach(([f,l])=>{ for(let i=0;i<10;i++) LABEL[`c${i}_${f}`]= i? `${l}(${i+1})` : l; });
const SPECIAL_LABEL = { dKansong:'간송 할인', dMerit:'국가유공자 할인', dGunwi:'군위 주민 할인', dClergy:'대구대교구', dStaff:'직원 할인', dGuide:'가이드 무료' }; Object.assign(LABEL, SPECIAL_LABEL);
Object.assign(LABEL, { teaMed:'티하우스 명상', gayageum:'가야금', cabin:'유루 캐빈' });
try{ addCatalogProgs(JSON.parse(localStorage.getItem('sayuwon_quote_cat'))); }catch(_){}   // 마지막으로 받은 견적서 품목으로 (새로 받으면 그때 다시)
const DOW = SY.DOW;   // 공통 도구 (js/common.js)
const $ = s => document.querySelector(s);
const esc = SY.esc;
const ymd = SY.ymd;
const isCKey = k => /^c\d+_(name|phone|email|memo)$/.test(k);   // 담당자 칸 (시트에는 담당자 · 연락처 · 이메일 열에 " / "로 모아서, 메모는 비고 칸에)

// ▣ js/group/02-state-form.js — 상태: rec(지금 예약의 칸 값) · tasks · hist · editingId · 새 예약으로 비우기 · 비고 칸에 모아 저장하는 값 쓰기/읽기(packExtra · unpackExtra) · 미정 · 몽몽마방 메뉴
// ===================== 상태 =====================
let rec, touched, startedAt, editingId, nContacts;
let cache=[];
const PPL_TITLE='전날 확인 변경 → 예약내역&전산 확인';   // 「관람 인원이 바뀌면」 과업 이름 (2026-11-21 · 예전 「예약 내역&전산 내역 확인」 · 직접 고친 이름은 그대로)
let notes=[], noteDraftId='', noteDraftT='', noteOwn=new Set(), noteEditId='', noteShown=new Set();   // 통화 메모 기록 목록 · 적는 중인 기록의 id · 시각 · 이번에 내가 손댄 기록 · 고치는 중인 기록 · 내용을 펼친 지운 기록 (2026-11-27 · js/group/08-history-save.js 맨 위)
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
const MEMO_PARTS = [['tbd','미정 체크'],['tbdDate','미정 항목 답변일'],['erp','전산 등록'],['gate','입장문'],['pchg','인원 변경'],['onsite','현장 재결제'],['wantQuote','견적서 요청'],['wantStmt','거래명세서 요청'],['tbdLate','입력 기한 늦춘 사유'],['mabangTime','마방 시간'],['mabangPrice','마방 단가'],['mabangPay','마방 결제'],['mabangNote','마방 비고'],['tour','사전 답사'],['goods','굿즈'],['etcDisc','기타할인 금액'],['etcDiscTo','기타할인 대상'],['etcDiscWhy','기타할인 사유'],['etcDiscTx','기타할인 과세'],['etcDiscTf','기타할인 비과세'],['readDone','확인 멘트 말씀드림'],['inotes','항목 비고'],['idisc','항목 할인'],['idamt','항목 할인액'],['isp','항목 특별 할인'],['linkSent','결제링크 전송'],['paidAt','입금 확인'],['viewSrc','관람 종류'],['views','관람 품목'],['viewN','관람권 인원'],['cancelWhy','취소 사유'],['istu','항목 학생'],['erpSame','전산 같은 품목'],['islots','항목 시간 더하기']];   // 항목 시간 더하기 = 대관에 더한 시작 · 끝 (2026-11-27)   // 항목 학생 · 전산 같은 품목: 빠져 있어 저장 뒤 다시 열면 사라지던 것 (2026-11-21)
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
    const st = Object.keys(r).filter(k=>k.startsWith(p+'_') && r[k] && (r[baseOf(k)] || (baseOf(k)==='seminar2' && sem2On(r)) || semXKeys(r).includes(baseOf(k)))).map(k=>`${LABEL[baseOf(k)]||baseOf(k).replace(/^px:/,'')}:${String(r[k]).replace(p==='tm'?/[,/]/g:/[,/:]/g,' ').trim()}`);
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
      const f=FIELDS.find(f=>f[2]===x[1].trim() && /^프로그램/.test(f[0]) && !isSub(f[1])), sx=x[1].trim().match(/^세미나 도슨트\(([3-9])\)$/), k=f ? f[1] : sx ? 'seminar'+sx[1] : 'px:'+x[1].replace(/\s/g,''); o[`${p}_${k}`]=x[2].trim(); });   // 세미나 도슨트(3) … = 3회차부터의 칸 (품목 칸이 없어 이름으로 되찾음 · 2026-11-27)
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
// ▣ js/group/03-special-discount.js — 품목마다 특별 할인(팝업) · 예약 내역 줄(itemRows): 수량 · 관람 인원 자동 · 품목 고르기 · 줄 그리기
// ===== 품목마다 특별 할인 (2026-11-16): 예약 내역 줄의 「특별할인」 버튼 → 팝업(특별 할인 인원 · 기타 할인) =====
// rec.isp = "줄=dKansong:2,dMerit:1|비과세(사유원):과세(신라)|사유; …" (시트 비고 칸 '항목 특별 할인')
// 예약 전체 칸(간송 · 국가유공자 · 군위 주민 · 대구대교구 인원, 기타 할인 비과세 · 과세 · 사유)은 줄마다 넣은 것의 합 → 안내 문구 · 전산 대조 · 합계가 그대로 씀
const SP_KEYS = Object.keys(SPECIAL_LABEL);
const ispMap = r => { const o={}; String((r&&r.isp)||'').split(/\s*;\s*/).forEach(s=>{ const i=s.indexOf('='); if(i<=0) return; const [cnt, money, why] = s.slice(i+1).split('|'), [tf, tx]=String(money||'').split(':'); const sp={};
  String(cnt||'').split(',').forEach(p=>{ const [a,n]=p.split(':'); if(SP_KEYS.includes(a) && +n>0) sp[a]=+n; });
  o[s.slice(0,i).trim()]={sp, tf:Math.max(0,parseInt(tf)||0), tx:Math.max(0,parseInt(tx)||0), why:String(why||'').trim()}; }); return o; };
const ispEmpty = v => !v || (!Object.keys(v.sp||{}).length && !v.tf && !v.tx);
const ispStr = m => Object.entries(m).filter(([,v])=>!ispEmpty(v)).map(([k,v])=>`${k}=${Object.entries(v.sp).map(([a,n])=>`${a}:${n}`).join(',')}|${v.tf||0}:${v.tx||0}|${String(v.why||'').replace(/[;|=\/]/g,' ').trim()}`).join('; ');
function ispSumUp(){   // 줄마다 넣은 것 → 예약 전체 칸
  const m=Object.values(ispMap(rec)), set=(k,v)=>{ v=v?String(v):''; if(String(rec[k]||'')!==v){ rec[k]=v; touched.add(k); } };
  SP_KEYS.forEach(k=>set(k, Math.max(0, ...m.map(v=>v.sp[k]||0))));   // 같은 분이 여러 품목(관람 · 식사 등)에서 할인받으면 품목마다 넣으므로, 인원은 품목 중 가장 큰 수 (합치면 2배로 셈)
  set('etcDiscTf', m.reduce((s,v)=>s+v.tf,0)); set('etcDiscTx', m.reduce((s,v)=>s+v.tx,0));
  set('etcDiscWhy', [...new Set(m.filter(v=>v.tf||v.tx).map(v=>v.why).filter(Boolean))].join(', '));
  if(rec.etcDisc){ set('etcDisc',''); set('etcDiscTo',''); }
}
function ispMigrate(k){   // 예약 전체로 들어 있던 특별 할인 · 기타 할인(예전 기록 · 전산 내역에서 읽은 것) → 지금 연 줄로 옮김 (팝업에 바로 보여서 같은 인원을 또 넣지 않게)
  if(String(rec.isp||'').trim()) return;
  const sp={}; SP_KEYS.forEach(x=>{ const n=parseInt(rec[x])||0; if(n>0) sp[x]=n; }); const es=etcSplit(rec);
  if(!Object.keys(sp).length && !es.tx && !es.tf) return;
  rec.isp=ispStr({[dkey(k)]:{sp, tf:es.tf, tx:es.tx, why:rec.etcDiscWhy||''}}); touched.add('isp');
}
function setItemSp(k, val){   // val = {sp, tf, tx, why} · null = 이 줄 특별 할인 없앰
  ispMigrate(k); const m=ispMap(rec);
  if(val && !ispEmpty(val)) m[dkey(k)]=val; else delete m[dkey(k)];
  const s=ispStr(m); if(s!==String(rec.isp||'')){ rec.isp=s; touched.add('isp'); }
  ispSumUp();
}
const ispOf = k => ispMap(rec)[dkey(k)];
function spBtnHTML(k){ const v=ispOf(k), on=!ispEmpty(v);
  const t = on ? [...Object.entries(v.sp).map(([a,n])=>`${SPECIAL_LABEL[a].replace(/ 할인$/,'')} ${n}명`), (v.tf||v.tx) && `기타 -${wonTxt(v.tf+v.tx)}원`].filter(Boolean).join(' · ') : '';
  return `<span class="spwrap" data-spwrap="${esc(k)}"><button type="button" class="spbtn${on?' on':''}" data-spopen="${esc(k)}" title="이 품목에 특별 할인(간송 · 국가유공자 · 군위 주민 · 대구대교구 · 직원) · 기타 할인 넣기">특별할인${t?` <b>${esc(t)}</b>`:''}</button></span>`; }
let spKey=null;
function openSp(k){ spKey=k; ispMigrate(k); $('#spEdit').hidden=true; $('#spMain').hidden=false; $('#spEditBtn').hidden=false; document.querySelectorAll('#itemsBox [data-spwrap]').forEach(b=>{ b.outerHTML=spBtnHTML(b.dataset.spwrap); });   // 예전 기록이면 그 할인이 들어간 줄에 먼저 표시
  const v=ispOf(k) || {sp:{}, tf:0, tx:0, why:''};
  $('#spTitle').textContent = `특별 할인 · ${itemName(k)}`;
  $('#spPeople').innerHTML = SPECIAL.filter(s=>!s.off || v.sp[s.k]).map(s=>`<label title="${esc(s.name)} · ${s.rate===1?'무료':Math.round(s.rate*100)+'%'}${s.proof?" · 지참: "+esc(s.proof):""}">${esc(s.short)} <small>${s.rate===1?'무료':Math.round(s.rate*100)+'%'}</small><input data-spk="${s.k}" inputmode="numeric" data-ime="num" maxlength="3" autocomplete="off" value="${v.sp[s.k]||''}">명</label>`).join('');
  $('#spTf').value = v.tf ? wonTxt(v.tf) : ''; $('#spTx').value = v.tx ? wonTxt(v.tx) : ''; $('#spWhy').value = v.why||'';
  const n=numOf(itemQty(k)); $('#spHint').textContent = n ? `이 품목 ${n}${itemUnit(k)} 중 특별 할인 인원은 단체 할인과 비교해 큰 쪽 하나만 적용됩니다. 같은 분이 다른 품목에서도 할인받으면 그 품목에도 넣으세요 (증빙 안내 인원은 품목 중 가장 큰 수).` : '';
  $('#spModal').hidden=false; setTimeout(()=>$('#spPeople input')?.focus(), 0); }
function spApply(){ if(spKey==null) return;
  const sp={}; document.querySelectorAll('#spPeople [data-spk]').forEach(el=>{ const n=parseInt(el.value.replace(/\D/g,''))||0; if(n>0) sp[el.dataset.spk]=n; });
  const tot=Object.values(sp).reduce((a,b)=>a+b,0), q=numOf(itemQty(spKey));
  if(q && tot>q){ toast(`특별 할인 인원(${tot}명)이 이 품목 수량(${q})보다 많습니다.`); return; }
  const num=id=>Math.max(0, parseInt($(id).value.replace(/\D/g,''))||0), tf=num('#spTf'), tx=num('#spTx'), why=$('#spWhy').value.trim();
  if((tf||tx) && !why){ toast('기타 할인 사유를 적어 주세요.'); $('#spWhy').focus(); return; }
  setItemSp(spKey, {sp, tf, tx, why}); $('#spModal').hidden=true; spKey=null; itemChanged(false, true); renderSide(); startTimer(); }
document.addEventListener('click', e=>{ const b=e.target.closest?.('#itemsBox [data-spopen]'); if(b){ openSp(b.dataset.spopen); return; }
  if(e.target.id==='spOk') spApply(); else if(e.target.id==='spCancel' || e.target.id==='spModal') { $('#spModal').hidden=true; spKey=null; }
  else if(e.target.id==='spClear' && spKey!=null){ setItemSp(spKey, null); $('#spModal').hidden=true; spKey=null; itemChanged(false, true); renderSide(); startTimer(); } });
document.addEventListener('input', e=>{ const el=e.target; if(!el.closest?.('#spMain') || el.id==='spWhy') return; const c=el.value.replace(/[^\d,]/g,''); if(c!==el.value) el.value=c; });
document.addEventListener('focusout', e=>{ const el=e.target; if(el.id==='spTf' || el.id==='spTx'){ const n=parseInt(el.value.replace(/\D/g,''))||0; el.value = n ? wonTxt(n) : ''; } });
document.addEventListener('keydown', e=>{ if($('#spModal').hidden) return; if(!$('#spEdit').hidden){ if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); closeSpd(); } else if(e.key==='Enter' && !e.isComposing && e.target.tagName==='INPUT'){ e.preventDefault(); } return; } if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); $('#spModal').hidden=true; spKey=null; } else if(e.key==='Enter' && e.target.closest?.('#spModal')){ e.preventDefault(); spApply(); } }, true);
function setItemNote(k, v){ const m=inotesMap(); v=String(v||'').replace(/[;=]/g,',').trim(); if(v) m[k]=v; else delete m[k]; rec.inotes=Object.entries(m).map(([a,b])=>`${a}=${b}`).join('; '); touched.add('inotes'); }
const itemName = k => k==='view' ? '관람' : /^v:/.test(k) ? itemLabel(daySrc(k.slice(2), rec)) : k==='mb' ? '몽몽마방 '+(rec.mabangMenu||'') : /^g:/.test(k) ? goodsName(k.slice(2)) : (SADAM_ITEMS.find(x=>x[0]===k)||[])[1] || LABEL[k] || k;
const itemNotesText = () => Object.entries(inotesMap()).filter(([k])=>itemKeysFromRec().includes(k) || (k==='seminar2' && rec.seminar && sem2On(rec)) || semXKeys(rec).includes(k)).map(([k,v])=>`${isSemX(k) ? '세미나 도슨트' : itemName(k)}: ${v}`);   // 비고가 있는 항목만
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
  if(t==='varea'){ const list=viewsParse(rec.views), src=k.slice(2), q=Math.max(0, parseInt(v)||0), x=list.find(y=>y.src===src); if(x) x.qty=q; else if(q) list.push({src, qty:q}); rec.views=goodsJoin(list); touched.add('views'); if(q) itemPend.delete(k); else itemPend.add(k); syncPeopleFromArea(); return; }
  if(t==='mb'){ rec.mabangL=v; touched.add('mabangL');
    if(v && !rec.mabangTime){ const tt=fmtTime(rec.tin); if(tt){ rec.mabangTime=`${tt}~${String(Math.min(+tt.slice(0,2)+1,23)).padStart(2,'0')}${tt.slice(2)}`; touched.add('mabangTime'); } }
    if(v) mbPayDefault(); }   // 몽몽마방 시간 기본 = 입장부터 1시간 · 결제방식 기본 = 미정
  else if(t==='goods'){ const list=goodsParse(rec.goods), src=k.slice(2), q=Math.max(0, parseInt(v)||0), g=list.find(x=>x.src===src); if(g) g.qty=q; else if(q) list.push({src, qty:q}); rec.goods=goodsJoin(list); touched.add('goods'); }
  else if(t!=='new'){ rec[k]=v; touched.add(k); if(t==='sadam' || k==='haeorum') syncPeopleFromArea(); }
  if(v && v!=='0') itemPend.delete(k); else itemPend.add(k);
}
// 관람 인원이 비어 있으면 예약 내역의 관람 · 관람+식사 줄 인원 합으로 채움 (이렇게 채운 동안은 줄 인원을 바꾸면 따라감 · 직접 고치면 그만) → 할인(19명까지 사전예약 · 20명부터 단체예약)이 바로

function syncPeopleFromArea(){ const s=viewsParse(rec.views).reduce((a,x)=>a+(+x.qty||0),0)+numOf(rec.sadam1)+numOf(rec.sadam2)+numOf(rec.sadamD)+numOf(rec.haeorum);
  if(numOf(rec.people) && !peopleAuto) return; if(!s && !peopleAuto) return; rec.people = s ? String(s) : ''; peopleAuto=!!s; touched.add('people'); const el=document.getElementById('f_people'); if(el && document.activeElement!==el) el.value=rec.people; }
document.addEventListener('input', e=>{ if(e.target && e.target.id==='f_people') peopleAuto=false; }, true);   // 관람 인원을 직접 고치면 자동으로 따라가지 않음
function mbPayDefault(){ if(rec.mabangPay) return; rec.mabangPay='미정'; touched.add('mabangPay'); syncPayTbd(rec); touched.add('tbd'); }   // 몽몽마방을 새로 넣으면 결제방식 = 미정 → 미정 항목 '몽몽마방 결제' (고객님께 여쭤 볼 것)
const mbTimes = () => { const p=String(rec.mabangTime||'').split('~'); return [p[0]||'', p[1]||'']; };   // 몽몽마방 시간 "12:00~13:00" → [시작, 끝]
const plus1h = t => { const f=fmtTime(t); return f ? `${String(Math.min(+f.slice(0,2)+1,23)).padStart(2,'0')}${f.slice(2)}` : ''; };
const plusH = (t, h) => { const f=fmtTime(t); if(!f) return ''; const m=+f.slice(0,2)*60 + +f.slice(3,5) + Math.round((h||1)*60), e=Math.min(m, 23*60+59); return `${String(Math.floor(e/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`; };   // 시작 + h시간
const tmTimes = k => { const p=String(rec['tm_'+k]||'').split('~'); return [p[0]||'', p[1]||'']; };   // 프로그램 시간대 "13:00~15:00" → [시작, 끝]
const progHours = k => /^seminar\d?$/.test(k) ? 0.5 : itemUnit(k)==='시간' ? Math.max(1, numOf(itemQty(k))||1) : 1;   // 끝 = 시작 + 1시간 (시간 프로그램은 예약한 시간만큼 · 세미나 도슨트는 30분, 2026-11-18)
function clearItem(k){ const t=itemKind(k);
  if(ispOf(k)) setItemSp(k, null);   // 그 줄의 특별 할인 · 기타 할인도
  if(itemStu(k)) setItemStu(k, 0);   // 그 줄의 학생 인원도
  if(itemNote(k)) setItemNote(k, '');
  if(k==='seminar') Object.keys(inotesMap()).filter(isSemX).forEach(x=>setItemNote(x, ''));   // 2회차부터의 세미나 비고도
  if(SLOT_KEYS.includes(k) && slotsMap(rec)[k]) setItemSlots(k, []);   // 대관에 더한 시작 · 끝도 (2026-11-27)
  if(t==='view') return;   // 관람 줄은 관람 인원 칸으로만
  if(t==='varea'){ rec.views=goodsJoin(viewsParse(rec.views).filter(x=>x.src!==k.slice(2))); touched.add('views'); itemPend.delete(k); return; }
  if(t==='mb'){ ['mabangL','mabangMenu','mabangTime','mabangPay'].forEach(x=>{ if(rec[x]){ rec[x]=''; touched.add(x); } }); syncPayTbd(rec); touched.add('tbd'); }   // 몽몽마방을 빼면 미정 항목 '몽몽마방 결제'도
  else if(t==='goods'){ rec.goods=goodsJoin(goodsParse(rec.goods).filter(x=>x.src!==k.slice(2))); touched.add('goods'); if(!rec.goods && rec.stf_goods){ rec.stf_goods=''; touched.add('stf_goods'); } }
  else if(t!=='new'){ [k, 'stf_'+k, 'tm_'+k, 'crs_'+k, 'plc_'+k, ...(k==='seminar' ? SEM2_IX : [])].forEach(x=>{ if(rec[x]){ rec[x]=''; touched.add(x); } }); }
  itemPend.delete(k);
}
// 담당 고르기 (2026-11-24): 이름을 치지 않고 멤버 목록(멤버관리)에서 고름 → 그 사람에게 「단체 준비」 과업이 감 (이름이 정확히 같아야 해서)
//  목록에 없는 사람은 맨 아래 「＋ 새 멤버 추가…」 → 이름만 넣으면 멤버로 바로 만듦 (임시 사번 NEW-… · 사번 · 연락처는 멤버관리에서)
//  예전에 쳐 둔 이름이 멤버가 아니면 「(멤버 아님)」으로 그대로 보임
let MEMBER_NAMES = (()=>{ try{ return JSON.parse(localStorage.getItem('sy_member_names')||'[]')||[]; }catch(_){ return []; } })();
async function loadMemberNames(again){ try{ const j=await SY.callRaw({action:'members'}); if(!j || !j.ok) return;
    const L=[...new Set((j.members||[]).map(m=>String(m.name||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
    const changed=L.join('|')!==MEMBER_NAMES.join('|'); MEMBER_NAMES=L; try{ localStorage.setItem('sy_member_names', JSON.stringify(L)); }catch(_){}
    if((changed || again) && typeof renderItems==='function' && document.getElementById('itemsBox')) renderItems(true); }catch(_){} }
const staffSelHTML = (k, v, title) => { const cur=String(v||'').trim(), has=MEMBER_NAMES.includes(cur);
  return `<select class="it-stfsel" data-is="${esc(k)}" title="${esc(title||'담당')}"><option value="">담당 고르기 (필수)</option>${MEMBER_NAMES.map(n=>`<option value="${esc(n)}"${n===cur?' selected':''}>${esc(n)}</option>`).join('')}`
    + (cur && !has ? `<option value="${esc(cur)}" selected>${esc(cur)} (멤버 아님)</option>` : '') + `<option value="__new">＋ 새 멤버 추가…</option></select>`; };
// 대관에 더한 시작 · 끝 (2026-11-27): rec.islots 에 줄마다 "시작~끝" (js/group/01-fields.js slotsMap) — 첫 시간대는 예전처럼 tm_키
function setItemSlots(k, arr){ const m=slotsMap(rec); if(arr.length) m[k]=arr.map(v=>String(v||'').replace(/[;=,]/g,'').trim()); else delete m[k]; const s=Object.entries(m).map(([a,b])=>`${a}=${b.join(',')}`).join('; '); if(s!==String(rec.islots||'')){ rec.islots=s; touched.add('islots'); } }
const rawSlots = k => SLOT_KEYS.includes(k) ? (slotsMap(rec)[k]||[]) : [];   // 화면용: 시간 수 칸을 잠깐 비워도 더한 줄은 그대로 (전산 비고 등은 itemSlotTimes — 품목이 있을 때만)
const slotIxVal = ix => { const m=String(ix).match(/^sl([SE]):(.+):(\d+)$/); if(!m) return ''; const p=String(rawSlots(m[2])[+m[3]]||'').split('~'); return (m[1]==='S' ? p[0] : p[1])||''; };
const slotsHTML = k => { const L=rawSlots(k);
  return L.map((v,i)=>{ const p=String(v||'').split('~');
      return `<div class="it-sem2 it-slot"><span class="it-semn">시간 ${i+2}</span><label class="it-xl">시작 <input class="it-x" data-ix="slS:${esc(k)}:${i}" data-tp="1" readonly title="더한 시작 시각. 넣으면 끝나는 시각이 1시간 뒤로 (고칠 수 있음)" value="${esc(p[0]||'')}"></label>`
        + `<label class="it-xl">끝 <input class="it-x" data-ix="slE:${esc(k)}:${i}" data-tp="1" readonly title="더한 끝나는 시각" value="${esc(p[1]||'')}"></label>`
        + `<button type="button" class="it-slotdel" data-slotdel="${esc(k)}:${i}" title="이 시작 · 끝 빼기" aria-label="이 시작 · 끝 빼기">×</button></div>`; }).join('')
    + (L.length<SLOT_MAX ? `<div class="it-sem2 it-slot it-slotadd"${numOf(rec[k])>=1?'':' hidden'}><button type="button" class="btn primary" data-slotadd="${esc(k)}" title="대관을 여러 번에 나눠 쓸 때 시작 · 끝을 한 줄 더 넣습니다 (금액 · 시간 수는 그대로)">＋ 시작 · 끝 더하기</button></div>` : ''); };
// 세미나 도슨트 2회 이상: 회차마다 담당 칸 (1회차 = stf_seminar · 2회차 = stf_seminar2 · 3회차 = stf_seminar3 …, 2026-11-21 · 3회차부터 2026-11-27)
const semStfHTML = (k, tt) => { const v=String(rec['stf_'+k]||''); return `<label class="it-xl it-stf${v.trim()?'':' missing'}">담당 ${staffSelHTML(k, v, tt)}</label>`; };
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
  const area = catalogItems().filter(it=>(it.kind==='view' || it.kind==='package') && (!it.merged || (itemKind(k)==='varea' && normSrc(daySrc(k.slice(2), rec))===normSrc(it.src))) && !/네이버/.test(it.src) && String(it.src).startsWith(day) && it.price!=null);   // 관람권(9~18 · 13~18 · 학생 등)도 모두 여기서 고름
  h+=`<optgroup label="관람 · 관람+식사">${area.map(it=>{ const pm=String(it.src).match(/\(관람,\s*(.+)\)$/), sk=pm ? SADAM_OF[normSrc(pm[1])] : null, v=sk || 'v:'+it.src;
      return opt(v, (pm ? '관람 + '+pm[1] : viewLabel(it.src)), used.has(v), k===v || (itemKind(k)==='varea' && normSrc(daySrc(k.slice(2), rec))===normSrc(it.src))); }).join('')}`
    + `${FIELDS.some(f=>f[1]==='haeorum') ? opt('haeorum', '새벽 해오름 산책 (관람료 포함)'+pr(progSrc('haeorum', rec)), used.has('haeorum'), k==='haeorum') : ''}</optgroup>`;
  h+=`<optgroup label="몽몽마방">${mbMenus().map(m=>opt('mb:'+m.name, `몽몽마방 ${m.name}`, mbUsed, k==='mb' && cur && cur.name===m.name)).join('')}${k==='mb' && !cur ? opt('mb:', rec.mabangMenu ? `몽몽마방 ${rec.mabangMenu} (예전 메뉴 · 다시 고르기)` : '몽몽마방 (메뉴 고르기)', false, true) : ''}</optgroup>`;
  [['프로그램(개별)','개별 프로그램'],['프로그램(시간)','시간 프로그램']].forEach(([g,l])=>{
    h+=`<optgroup label="${l}">${FIELDS.filter(f=>f[0]===g && !isSub(f[1]) && f[1]!=='haeorum' && !COUPON_IN_GOODS.includes(f[1]) && (f[1]!=='seminar2' || k==='seminar2')).map(f=>opt(f[1], f[2]+pr(progSrc(f[1], rec)), used.has(f[1]), k===f[1])).join('')}</optgroup>`; });
  const gi=goodsItems();
  // 굿즈 = 품목 관리에서 구분이 굿즈인 품목 (품목 관리 품명 그대로). 예전 전용 칸이 있는 품목(음료쿠폰(가가빈빈) = gaga)은 그 칸으로 한 번만 (2026-11-18)
  // 음료쿠폰 (2026-11-21): 몽몽차방 · 가가빈빈 음료(아메리카노 · 모과차 등)는 품목에서 지우고 음료쿠폰으로 통합 → 음료쿠폰(가가빈빈 · 몽몽차방)은 굿즈 묶음 맨 위. 저장은 그대로 (gaga 칸 · 굿즈 g:품목)
  const gk = it => goodsKeyOf(it.src), gv = it => gk(it) || 'g:'+it.src, gl = it => String(it.name||'').trim()||it.src;
  const cpFix = COUPON_IN_GOODS.filter(c=>FIELDS.some(f=>f[1]===c) && !gi.some(it=>gk(it)===c));   // 품목 관리에서 아직 굿즈가 아니어도(예전 목록) 음료쿠폰(가가빈빈)은 늘 보이게
  const gs = [...gi].sort((a,b)=>(isDrinkSrc(b.src)?1:0)-(isDrinkSrc(a.src)?1:0));   // 음료쿠폰이 맨 위, 나머지는 가나다
  const stray = itemKind(k)==='goods' && !gi.some(it=>'g:'+it.src===k) ? k : '';   // 품목 관리에서 지운(이름을 바꾼) 굿즈가 예전 기록에 남아 있으면 그 줄에서만 보임 (예: 예전 아메리카노(몽몽차방))
  h+=`<optgroup label="굿즈">${cpFix.map(c=>opt(c, LABEL[c]||c, used.has(c), k===c)).join('')}${gs.map(it=>opt(gv(it), gl(it), used.has(gv(it)), k===gv(it))).join('')}${stray ? opt(stray, stray.slice(2), false, true) : ''}</optgroup>`;
  return `<select class="it-sel" data-isel="${esc(k)}" aria-label="항목">${h}</select>`;
}
function itemRowHTML(k, rows){
  const t=itemKind(k), stf=itemHasStaff(k), sv=stf ? String(rec[itemStfKey(k)]||'') : '';
  const note = t==='new' ? '' : `<input class="it-x it-note" data-inote="${esc(k)}" data-ime="ko" placeholder="비고" value="${esc(itemNote(k))}">`;
  if(t==='view'){ const vs=viewSrcOf(rec), vi=viewItems(rec).filter(it=>!/\(\d\d:00~18:00\)/.test(it.src) || normSrc(it.src)===normSrc(vs));   // 시간대 관람권은 입장 시각으로 정해진 것만
    const opts = vi.length ? vi.map(it=>`<option value="${esc(it.src)}"${normSrc(it.src)===normSrc(vs)?' selected':''}>${esc(viewLabel(it.src))}</option>`).join('') : `<option>관람 (관람 인원)</option>`;
    return `<div class="it-row it-view" data-irow="view"><select class="it-sel" data-iview aria-label="관람 품목" title="관람 품목 (관람 인원 = 수량)">${opts}</select><span class="it-p" data-iup="view"></span>`
      + `<span class="it-q"><input data-iq="view" inputmode="numeric" data-ime="num" placeholder="인원" value="${esc(itemQty('view'))}" title="관람 인원 − 다른 관람 품목(관람+식사 · 해오름 등). 직접 줄이면 그 수로 (관람하지 않는 인원)"><i>명</i></span>`
      + `<span class="it-s none"><input disabled placeholder="담당 없음"></span><span></span><div class="it-money" data-ip="view"></div><div class="it-extra">${note}<span class="it-amt" data-iamt="view"></span></div></div>`; }
  // 몽몽마방: 시작 시각 → 끝나는 시각(시작을 넣으면 1시간 뒤로 자동) → 결제방식(새로 넣으면 미정) → 비고. 저장은 예전처럼 mabangTime "12:00~13:00"
  const mbt = t==='mb' ? mbTimes() : null;
  const extra = t==='mb' ? `<label class="it-xl">시작 <input class="it-x" data-ix="mbS" data-tp="1" readonly title="몽몽마방 시작 시각 (24시간 · 1200 처럼 숫자만 쳐도 됨). 넣으면 끝나는 시각이 1시간 뒤로" value="${esc(mbt[0])}"></label>`
      + `<label class="it-xl">끝 <input class="it-x" data-ix="mbE" data-tp="1" readonly title="몽몽마방 끝나는 시각 (시작 시각을 넣으면 1시간 뒤로 자동)" value="${esc(mbt[1])}"></label>`
      + `<label class="it-xl${rec.mabangPay==='미정'?' tbd':''}">결제 <select class="it-x" data-ix="mabangPay" title="몽몽마방 결제방식 · 미정이면 미정 항목 '몽몽마방 결제'로 (고객님께 여쭤 보기)">${rec.mabangPay?'':'<option value="" selected>선택</option>'}${MB_PAYS.map(x=>`<option${rec.mabangPay===x?' selected':''}>${x}</option>`).join('')}</select></label>` + note
    : t==='prog' && !COUPON_IN_GOODS.includes(k) ? (()=>{ const [s,en]=tmTimes(k), SX = k==='seminar' && sem2On(rec) ? (semXKeys(rec).length ? semXKeys(rec) : ['seminar2']) : [];   // SX = 세미나 도슨트 2회차부터의 줄 (횟수만큼 · 2026-11-27)   // 개별 · 시간 프로그램: 시작 → 끝(시작을 넣으면 1시간 · 시간 프로그램은 예약 시간만큼 뒤) → 비고 (도슨트는 코스도). 저장은 예전처럼 tm_키 "13:00~14:00"
        return (SX.length ? `<span class="it-semn">1회차</span>` : '') + `<label class="it-xl">시작 <input class="it-x" data-ix="tmS:${esc(k)}" data-tp="1" readonly title="프로그램 시작 시각 (24시간 · 1300 처럼 숫자만 쳐도 됨). 넣으면 끝나는 시각이 자동" value="${esc(s)}"></label>`
          + `<label class="it-xl">끝 <input class="it-x" data-ix="tmE:${esc(k)}" data-tp="1" readonly title="프로그램 끝나는 시각 (시작을 넣으면 1시간 · 시간 프로그램은 예약 시간만큼 뒤로 자동)" value="${esc(en)}"></label>`
          + (FIELDS.some(f=>f[1]==='plc_'+k) ? (()=>{ const pv=rec['plc_'+k]||''; return `<label class="it-xl">장소 <select class="it-x" data-ix="plc_${esc(k)}" title="세미나 도슨트 장소">${pv?'':'<option value="" selected>선택</option>'}${[...PLC_OPTS, ...(pv && !PLC_OPTS.includes(pv) ? [pv] : [])].map(x=>`<option${pv===x?' selected':''}>${esc(x)}</option>`).join('')}</select></label>`; })() : '')   // 세미나 도슨트: 장소 (몽몽차방 · 당두봉갈 · 기타) → 비고
          + (SX.length ? semStfHTML('seminar', '1회차 세미나 도슨트 담당') : '')
          + (FIELDS.some(f=>f[1]==='crs_'+k) ? (()=>{ const cv=crsNorm(rec['crs_'+k]), opts=[...CRS_OPTS, ...(cv && !CRS_OPTS.includes(cv) ? [cv] : [])];   // 도슨트: 출발지 드롭다운 (앵당삼거리 · 치허문 · 곡신문 · 사담, 2026-11-19 · 예전 코스 칸) → 비고 「동행도슨트(앵당~)」
              return `<label class="it-xl it-crs">출발지 <select class="it-x" data-ix="crs_${esc(k)}" title="도슨트 출발지"><option value="">선택</option>${opts.map(o=>`<option${o===cv?' selected':''}>${esc(o)}</option>`).join('')}</select></label>`; })() : '')
          + note
          + SX.map(sk=>{ const [s2,e2]=tmTimes(sk), pv=rec['plc_'+sk]||'', no=semNo(sk);   // 세미나 도슨트 횟수만큼: 2회차부터 회차마다 시작 · 끝 · 장소 · 담당 · 비고 한 줄 (2회차 2026-11-18 · 3회차부터 2026-11-27)
              return `<div class="it-sem2"><span class="it-semn">${no}회차</span><label class="it-xl">시작 <input class="it-x" data-ix="tmS:${sk}" data-tp="1" readonly title="${no}회차 세미나 도슨트 시작 시각. 넣으면 끝나는 시각이 30분 뒤로" value="${esc(s2)}"></label>`
                + `<label class="it-xl">끝 <input class="it-x" data-ix="tmE:${sk}" data-tp="1" readonly title="${no}회차 세미나 도슨트 끝나는 시각" value="${esc(e2)}"></label>`
                + `<label class="it-xl">장소 <select class="it-x" data-ix="plc_${sk}" title="${no}회차 세미나 도슨트 장소">${pv?'':'<option value="" selected>선택</option>'}${[...PLC_OPTS, ...(pv && !PLC_OPTS.includes(pv) ? [pv] : [])].map(x=>`<option${pv===x?' selected':''}>${esc(x)}</option>`).join('')}</select></label>`
                + semStfHTML(sk, `${no}회차 세미나 도슨트 담당`)
                + `<input class="it-x it-note" data-inote="${sk}" data-ime="ko" placeholder="비고" value="${esc(itemNote(sk))}"></div>`; }).join('')
          + (SLOT_KEYS.includes(k) ? slotsHTML(k) : ''); })()
    : note;
  // 관람 · 관람+식사 줄: 인원 칸을 성인 · 학생 두 칸으로 (2026-11-20). 기본은 모두 성인, 학생을 넣으면 그만큼 성인에서 빠짐 (합 = 그 줄 인원)
  const qtyHTML = canStu(k) ? (()=>{ const tot=numOf(itemQty(k)), s=Math.min(itemStu(k), tot);
      return `<span class="it-q it-q2"><label title="성인 인원"><b>성인</b><input data-iqa="${esc(k)}" inputmode="numeric" data-ime="num" placeholder="인원" value="${tot ? tot-s : esc(itemQty(k))}"></label>`
        + `<label title="학생 인원 (넣으면 그만큼 성인에서 빠짐) · 학생은 품목 관리의 학생 관람 가격 (관람+식사는 관람 부분만)"><b>학생</b><input data-istu="${esc(k)}" inputmode="numeric" data-ime="num" placeholder="0" value="${s||''}"></label></span>`; })()
    : `<span class="it-q"><input data-iq="${esc(k)}" inputmode="numeric" data-ime="num" placeholder="수량" value="${esc(itemQty(k))}"${t==='new'?' disabled':''}><i>${itemUnit(k)}</i></span>`;
  return `<div class="it-row${t==='new'?' it-new':''}" data-irow="${esc(k)}">${itemSelectHTML(k, rows)}<span class="it-p" data-iup="${esc(k)}"></span>`
    + qtyHTML
    + (t==='goods' ? `<span class="it-s${sv.trim()?'':' missing'}">${staffSelHTML(k, sv, '굿즈 담당 (기본 = 영업 담당 · 굿즈 모두 같은 담당)')}</span>`
      : k==='seminar' && sem2On(rec) ? `<span class="it-s none"><input disabled placeholder="회차마다 담당 ↓" title="세미나 도슨트 2회 이상: 아래 회차마다 담당을 넣습니다"></span>`   // 2026-11-21
      : stf ? `<span class="it-s${sv.trim()?'':' missing'}">${staffSelHTML(k, sv, '프로그램 담당')}</span>` : `<span class="it-s none"><input disabled placeholder="${t==='new'?'항목을 먼저 고르세요':'담당 없음'}"></span>`)
    + `<button type="button" class="it-del" data-idel="${esc(k)}" title="이 항목 빼기">×</button>`
    + (t==='new' ? '' : `<div class="it-money" data-ip="${esc(k)}"></div><div class="it-extra">${extra}<span class="it-amt" data-iamt="${esc(k)}"></span></div>`) + `</div>`;   // 둘째 줄: 할인(할인 대상만) · 셋째 줄: 비고 (할인이 없으면 바로 비고, 금액은 그 줄 끝)
}
function renderItems(force){
  const box=$('#itemsBox'); if(!box) return;
  const recKeys=itemKeysFromRec();
  itemRows = itemRows.filter(k=>recKeys.includes(k) || itemPend.has(k));
  recKeys.forEach(k=>{ if(!itemRows.includes(k)) itemRows.push(k); });
  if(itemRows.includes('view')) itemRows=['view', ...itemRows.filter(k=>k!=='view')];   // 관람 인원은 항상 첫 줄
  const sig=itemRows.join('|') + (rec.seminar && sem2On(rec) ? '|sem'+(semXKeys(rec).length||1) : '') + '|sl'+SLOT_KEYS.map(k=>rawSlots(k).length).join(',');   // 세미나 도슨트 두 번째 줄이 생기고 없어질 때도 다시 그림
  if(!force && box.dataset.sig===sig && box.contains(document.activeElement)){   // 쓰는 중: 줄은 그대로 두고 값만 맞춤
    box.querySelectorAll('[data-iq],[data-iqa],[data-istu],[data-is],[data-ix],[data-inote]').forEach(el=>{ if(el===document.activeElement) return;
      const stuT = k => Math.min(itemStu(k), numOf(itemQty(k)));   // 성인 · 학생 칸 (2026-11-20)
      const v = el.dataset.iqa!=null ? (numOf(itemQty(el.dataset.iqa)) ? String(numOf(itemQty(el.dataset.iqa))-stuT(el.dataset.iqa)) : itemQty(el.dataset.iqa)) : el.dataset.istu!=null ? (stuT(el.dataset.istu) ? String(stuT(el.dataset.istu)) : '') : el.dataset.iq!=null ? itemQty(el.dataset.iq) : el.dataset.is!=null ? String(rec[itemStfKey(el.dataset.is)]||'') : el.dataset.inote!=null ? itemNote(el.dataset.inote) : el.dataset.ix==='mbS' ? mbTimes()[0] : el.dataset.ix==='mbE' ? mbTimes()[1] : /^tm[SE]:/.test(el.dataset.ix) ? tmTimes(el.dataset.ix.slice(4))[el.dataset.ix[2]==='S'?0:1] : /^sl[SE]:/.test(el.dataset.ix) ? slotIxVal(el.dataset.ix) : /^crs_/.test(el.dataset.ix) ? crsNorm(rec[el.dataset.ix]) : String(rec[el.dataset.ix]||''); if(el.value!==v) el.value=v; });
    paintItemState(); paintItemPrices(); return;
  }
  box.dataset.sig=sig;
  box.innerHTML = (itemRows.length ? `<div class="it-head"><span>품목</span><span>가격 (1인 · 회당)</span><span>인원 · 수량</span><span>담당</span><span></span></div>` : '')
    + itemRows.map(k=>itemRowHTML(k, itemRows)).join('') + `<div id="erpExtra"></div>`
    + `<div class="it-foot"><button type="button" class="btn it-add" data-iadd>＋ 항목 추가</button><span class="hint" style="margin:0">${itemRows.length?'':'사담 식사 · 몽몽마방 · 개별 프로그램 · 시간 프로그램 · 굿즈 중에서 고르세요'}</span></div>`;
  paintItemState(); paintItemPrices();
}
// 가격표를 예약 내역 아래로 합치고(할인 · 합계 · 전산 내역), 두 번째 열의 가격표 자리는 '그날 예약 현황'으로
function mergePriceLayout(){
  const dp=$('#dayPanel'), box=$('#itemsBox'); if(!dp || !box || $('#priceWrap')) return;
  const w=document.createElement('div'); w.id='priceWrap'; w.className='price-panel price-wrap';
  ['.disc-box','#selTitle','#priceBox','#erpBox','#priceAll','#priceSrc'].forEach(s=>{ const el=dp.querySelector(s); if(el) w.appendChild(el); });
  const btns=$('#erpPasteBtn')?.parentElement; if(btns) w.insertBefore(btns, $('#erpBox'));
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
const PRICE_RETRIED = new Map();   // 금액 계산이 늦은 줄을 다시 계산한 시각 (같은 품목 · 수량 · 날짜 · 인원은 2초에 한 번만 → 끝없이 돌지 않게)
function itemSrc(k){ const t=itemKind(k), DAY=rec.date && isRedDay(rec.date) ? '주말/공휴일' : '평일';
  if(t==='view') return viewSrcOf(rec);
  if(t==='varea') return daySrc(k.slice(2), rec);
  if(t==='sadam') return `${DAY}(관람, ${{sadam1:'사담 런치1부', sadam2:'사담 런치2부', sadamD:'사담 디너'}[k]})`;
  if(t==='mb') return (mbMenuOf(rec)||{}).src || (Number(rec.mabangPrice) ? '몽몽마방 단품' : '');
  if(t==='prog') return progSrc(k, rec) || '';
  if(t==='goods') return k.slice(2);
  return ''; }
// ▣ js/group/04-erp-match.js — 전산 내역 ↔ 예약 내역 맞추기: 같은 품목 찾기 · 전산 할인 버튼 · 줄 금액 · 할인 표시 그리기(paintItemPrices)
// 전산 상품 → 예약 내역 줄 key (erpFields와 같은 기준)
// 전산 같은 품목 (2026-11-21): 「전산 내역과 예약 내용이 다릅니다」의 「같은 품목 (이름만 다름)」 → {전산 쪽 칸: 예약 쪽 칸}
const erpSameMap = (r=rec) => Object.fromEntries(String((r&&r.erpSame)||'').split(/\s*;\s*/).map(s=>s.split('>')).filter(p=>p.length===2 && p[0] && p[1]));
function erpSameApply(o){ Object.entries(erpSameMap()).forEach(([ek, rk])=>{ if(o[ek]){ if(!o[rk]) o[rk]=rec[rk]||o[ek]; o[ek]=''; } }); return o; }   // 전산 쪽 수량은 예약 쪽 칸으로 (단위가 달라도 같은 것으로 봄)
function erpKeyOf(p){ const k=erpKeyOf0(p), al=erpSameMap(); return (k && al[k]) || k; }
function erpKeyOf0(p){ const ns=normSrc(p);
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
    const o = m[k] ||= {product:x.product, date:x.date, people:0, students:0, base:0, disc:0, amount:0, notes:[], seqs:[]};
    o.people+=x.people; o.students+=x.students||0; o.base+=x.base; o.disc+=x.disc; o.amount+=x.amount; o.notes.push(...x.notes); if(x.seq) o.seqs.push(x.seq); });
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
  const k=b.dataset.idisc, v=b.dataset.dv;
  if(b.dataset.erp){   // 전산 내역 줄: 고른 %로 계산한 할인액을 그 줄 할인액으로 (전산 할인과 같으면 전산 그대로) → 대조에서 전산과 다르면 ✗ (전산 수정 필요)
    const E=erpByKey(), x=E.m[k], info=x && erpDiscInfo(k, x), ex=x && erpRowMoney(k, x); if(!info) return;
    setItemDisc(k, v, info.auto); const c=info.cand[v]; if(v===info.guess){ setItemDamt(k, null); startTimer(); renderSide(); return; }   // 전산과 같은 할인 → 전산 할인액 그대로
    setItemDamt(k, (c.tx===ex.aTx && c.tf===ex.aTf) ? null : {tx:Math.min(c.tx, ex.fTx), tf:Math.min(c.tf, ex.fTf)}); startTimer(); renderSide(); return; }
  setItemDisc(k, v, b.dataset.da); startTimer(); renderSide(); });   // 할인 버튼
// 전산 내역 줄의 할인 버튼: 할인 대상 품목이면 할인 없음 · 사전예약 5% · 단체예약 10%로 계산한 할인액(과세 · 비과세)과, 전산 할인이 어느 것과 같은지(guess)
function erpDiscInfo(k, x){
  const b0=quoteBlocks(rec).blocks.find(b=>b.key===k); if(!b0) return null;   // 모든 품목 (할인 대상이 아니면 인원 기준 = 할인 없음)
  const cand={none:{tx:0, tf:0}};
  ['pre','grp'].forEach(v=>{ const m=idiscMap(rec); m[dkey(k)]=v; const r2={...rec, idamt:'', idisc:Object.entries(m).map(([a,c])=>`${a}=${c}`).join('; ')};
    const b=quoteBlocks(r2).blocks.find(y=>y.key===k), mm=b && blockMoney(b, r2); cand[v] = mm ? {tx:mm.aTx, tf:mm.aTf} : {tx:0, tf:0}; });
  const tot=c=>c.tx+c.tf, pc=[...new Set((x.notes||[]).flatMap(s=>[...String(s).matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m=>+m[1])))];   // 전산 할인 줄의 % (사전예약자 성인 19명 5% → 사전예약)
  const guess = !(+x.disc) ? 'none' : pc.length===1 && pc[0]===5 ? 'pre' : pc.length===1 && pc[0]===10 ? 'grp' : (['pre','grp'].find(v=>Math.abs(tot(cand[v])-(+x.disc||0))<1) || '');
  return { cand, guess, auto:b0.dauto, n:b0.qty, gN:b0.gN||0 };   // n = 그 품목 인원 (2026-11-21)
}
function erpDiscBtns(k, x, ex){
  const info=erpDiscInfo(k, x); if(!info) return '';
  const cur=ex.dTx+ex.dTf, on = !ex.ov ? info.guess : (['none','pre','grp'].find(v=>Math.abs(info.cand[v].tx+info.cand[v].tf-cur)<1) || '');   // 고치지 않았으면 전산 할인 그대로
  const L=v=>(DISC_OPTS.find(o=>o[0]===v)||[])[1]||'';
  const cntOf = v => !ex.ov ? (x.notes||[]).reduce((a,s)=>{ const m=String(s).match(/(\d+)\s*명\s*(\d+(?:\.\d+)?)\s*%/); return a + (m && +m[2]===(v==='pre'?5:10) ? +m[1] : 0); }, 0) : info.gN;   // 그 할인을 받는 인원 (전산 할인 줄 · 버튼으로 고쳤으면 계산)
  const diff = info.guess && info.guess!==info.auto && !ex.ov;   // 전산 할인이 인원 기준과 다르면: 인원 기준 버튼에 빨간 테두리 (설명은 툴팁)
  const tip = diff ? `인원 ${info.n}명 → ${L(info.auto)} 대상인데 전산은 ${L(info.guess)}` : `인원 기준: ${L(info.auto)}`;
  return `<span class="im dsel" title="${esc(tip)} · 누르면 그 %로 할인액을 다시 계산">${DISC_OPTS.map(([v,l])=>`<button type="button" class="dbtn${on===v?' on':''}${diff&&v===info.auto?' should':''}" data-idisc="${esc(k)}" data-dv="${v}" data-erp="1" title="${v===info.auto?esc(tip):''}">${l}${on===v && v!=='none' && cntOf(v) ? ` ${cntOf(v)}명` : ''}</button>`).join('')}${spBtnHTML(k)}</span>`;
}
let openDisc=new Set();   // 할인 대상이 아닌 품목에서 「할인 넣기」를 눌러 연 할인 줄
document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('#itemsBox [data-dopen]'); if(!b) return; openDisc.add(b.dataset.dopen); paintItemPrices(); const i=document.querySelector(`#itemsBox [data-idamt="${CSS.escape(b.dataset.dopen)}"]`); if(i){ i.focus(); i.select(); } });
// 할인액 칸 (예약 칸 계산 · 전산 내역 공통)
const damIn = (k, side, v, max) => `<span class="dam"><i>${side==='tx'?'과세(신라)':'비과세(사유원)'}</i>-${won(v)}원</span>`;   // 할인액은 버튼 · 특별할인으로만 (직접 고치지 않음, 2026-11-17)
// 전산 내역 줄 금액: 전산 상품금액 · 할인을 과세(신라) · 비과세(사유원)로 (자동 = 전산 사유원/신라 나누기와 같은 계산), 할인액을 고쳤으면 그 값
function erpRowMoney(k, x){
  const src=itemSrc(k), p=src ? priceOf(src) : null, u = p ? splitOf(src, p, rec) : {tx:1, tf:0}, rt=(u.tx+u.tf) ? u.tf/(u.tx+u.tf) : 0;
  const sTf = x.students ? erpFullTf(x) : null;   // 학생이 있으면 어른 · 학생 비과세를 따로 더함
  const fTf = sTf!=null ? Math.min(x.base, sTf) : Math.round(x.base*rt), fTx=x.base-fTf;
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
// 예약 내역 할인 줄 하나 (모든 품목 같은 모양): [할인 없음 · 사전예약 5% · 단체예약 10% · 특별할인] … [할인액 비과세 · 과세 · 금액]
function discRowHTML(k, b, m, money){
  return `<span class="im dsel" title="할인 (자동: ${esc((DISC_OPTS.find(o=>o[0]===b.dauto)||[])[1]||'')}) · 잘못 들어갔으면 눌러서 바꾸기">${DISC_OPTS.map(([v,l])=>`<button type="button" class="dbtn${b.dsel===v && (v==='none' || b.gN>0)?' on':''}" data-idisc="${esc(k)}" data-dv="${v}" data-da="${b.dauto}">${l}${b.dsel===v && v!=='none' && b.gN>0 ? ` ${b.gN}명` : ''}</button>`).join('')}${spBtnHTML(k)}</span>`
    + `<span class="im-r"><span class="im dams" title="${esc(m.disc||'할인액')}">${m.fTf>0?damIn(k,'tf', m.dTf, m.fTf):''}${m.fTx>0?damIn(k,'tx', m.dTx, m.fTx):''}</span>${money}</span>`;
}
// 줄마다 [단가 · 할인 · 금액] (전산 내역이 있으면 인원 · 상품금액 · 할인 · 금액, 인원이 다르면 빨갛게)
function paintItemPrices(){
  // 줄 구성 (2026-11-14): ① [품목 · 가격(관람+식사는 관람 · 식사 따로) · 인원 · 담당 · ×] ② 할인(할인 대상 품목만: 버튼 · 할인 금액 · 할인 단가 · 금액) ③ 비고 (할인 줄이 없으면 금액은 비고 줄 끝)
  const seen=new Set(), E = erpList.length ? erpByKey() : null, MISS = E ? erpMissing() : [];   // MISS: 전산에 없는 품목 (품목 관리 가격으로 계산)
  const cell=(l,v,cls='')=>`<span class="im ${cls}"><i>${l}</i>${v}</span>`;
  const upHTML = src => { const sp=pkgSplit(src); if(sp) return `<span><i>비과세(사유원)</i>${won(sp.v)}원</span><span><i>과세(신라)</i>${won(sp.m)}원</span>`; const p=src?priceOf(src):null; return p==null ? '' : `<span><i>${/대관|도슨트|세미나/.test(src)?'회당':'1인'}</i>${won(p)}</span>`; };
  document.querySelectorAll('#itemsBox [data-ip]').forEach(el=>{ const k=el.dataset.ip, src=itemSrc(k), up=document.querySelector(`#itemsBox [data-iup="${CSS.escape(k)}"]`), am=document.querySelector(`#itemsBox [data-iamt="${CSS.escape(k)}"]`);
    let h='', amt='';
    // 가격 칸: 할인까지 빼고 실제로 결제하는 금액을 과세(신라) · 비과세(사유원)로 (전산 내역 모드 · 금액을 모르면 1인 가격)
    // 전산 내역이 있으면 전산 금액 · 할인을 그 품목의 과세 · 비과세 비율로 나눔
    const ex = E && E.m[k] ? erpRowMoney(k, E.m[k]) : null;
    const mi = E && !ex ? MISS.find(x=>x.key===k) : null;   // 전산에 없는 품목: 품목 관리 가격 (과세(신라) · 비과세(사유원))
    const pm = ex || (mi && mi.m) || (!E && priceInfo && src ? (priceInfo[normSrc(src)]||{}).m : null);
    if(up) up.innerHTML = !quoteCat && !ex && !mi ? '' : pm && !seen.has(src) ? [pm.fTf>0 && `<span title="할인 전 금액 (할인 ${won(pm.dTf)}원 · 할인 뒤 ${won(pm.tf)}원)"><i>비과세(사유원)</i>${won(pm.fTf)}원</span>`, pm.fTx>0 && `<span title="할인 전 금액 (할인 ${won(pm.dTx)}원 · 할인 뒤 ${won(pm.tx)}원)"><i>과세(신라)</i>${won(pm.fTx)}원</span>`].filter(Boolean).join('') : upHTML(src);
    if(E){ const x=E.m[k];
      if(!x){ const inView = /^v:/.test(k) && /\(학생\)/.test(k) && E.m[k.replace(/\(학생\)/,'')];   // 관람(학생): 전산은 관람 한 줄에 어른 · 학생 함께
        h = k==='seminar2' && E.m.seminar ? cell('전산', '세미나 도슨트 줄에 함께 (전산은 세미나 한 품목 · 금액은 첫 세미나 도슨트 줄)') : inView ? cell('전산', '관람 줄에 함께 (어른 · 학생이 한 줄 · 금액은 관람 줄)') : k==='view' && !effViewN(rec) ? cell('전산', '관람권 따로 없음 (모두 관람 포함 품목)') : cell('전산', `<b class="bad">전산 내역에 없음</b>${mi?' <small>· 품목 관리 가격으로 합계에 넣음</small>':''}`, 'warn');
        if(mi){   // 전산에 없는 품목도 예약 내역과 같은 할인 줄 (할인 버튼 · 특별할인 · 할인액 · 금액, 2026-11-21 · 예전엔 「전산 내역에 없음」 + 비고 옆 특별할인 버튼)
          const money = cell('금액', mi.atMabang ? `<s>${won(mi.m.amount)}</s> <small>마방에서 결제</small>` : `<b>${won(mi.m.amount)}</b>`, 'amt');
          h = discRowHTML(k, mi.b, mi.m, money) + cell('전산', `<b class="bad">전산 내역에 없음</b> <small>· 품목 관리 가격으로 합계에 넣음</small>`, 'warn erp-none'); } }
      else h = erpDiscBtns(k, x, ex) + `<span class="im dams" title="${esc(x.notes.map(cleanErpNote).join(' · ')||'전산 할인')}">${ex.fTf>0?damIn(k,'tf', ex.dTf, ex.fTf):''}${ex.fTx>0?damIn(k,'tx', ex.dTx, ex.fTx):''}</span>`;   // 전산 내역 줄: 할인만 (과세 · 비과세 할인액은 고칠 수 있음)
      }
    // 금액을 아직 계산할 수 없을 때도 할인 줄은 늘 같은 모양 (할인 버튼 · 특별할인 · 오른쪽 금액 자리) — 처음 추가할 때 예전 모양이 잠깐 보이지 않게 (2026-11-18)
    else if(!priceInfo || !(src && priceInfo[normSrc(src)]) && !(k==='view')){
      const unitW=itemUnit(k)==='명'?'인원':'수량', known = src && priceOf(src)!=null, q=numOf(itemQty(k));
      const tryKey = k+'|'+q+'|'+rec.date+'|'+rec.people, retry = known && q && priceInfo && Date.now()-(PRICE_RETRIED.get(tryKey)||0) > 2000;
      const msg = !rec.date || !numOf(rec.people) && !effViewN(rec) ? `<small>방문일 · 관람 인원을 넣으면 계산</small>` : !known ? '가격 없음' : !q ? `<small>${unitW}을 넣으면 계산</small>` : retry ? '<small>계산 중…</small>' : '가격 없음';
      if(retry){ PRICE_RETRIED.set(tryKey, Date.now()); setTimeout(()=>{ renderSide(); paintItemPrices(); }, 0); }   // 가격 · 수량은 있는데 계산이 한 박자 늦은 것 → 한 번만 바로 다시 계산 (그래도 없으면 가격 없음)
      h = `<span class="im dsel" title="${unitW}을 넣으면 할인을 고를 수 있습니다">${DISC_OPTS.map(([v,l])=>`<button type="button" class="dbtn${v==='none'?' on':''}" disabled>${l}</button>`).join('')}${spBtnHTML(k)}</span>` + `<span class="im amt${known?'':' warn'}"><i>금액</i>${msg}</span>`; }
    else { const x=src ? priceInfo[normSrc(src)] : null;
      if(k==='view' && !x) h=cell('관람권', numOf(rec.people)?'0명 (모두 관람 포함 품목으로 계산)':'인원 입력');
      else if(!x){ amt = cell('금액', '가격 없음', 'warn'); }
      else if(seen.has(src)) amt=cell('금액', '위 줄과 합산');   // 같은 견적서 품목(예: 대관)은 한 줄로 계산
      else { seen.add(src); const m=x.m;
        const money = cell('금액', `<b>${m?won(m.amount):'가격 없음'}</b>`, 'amt');
        const eligible = x.b && (x.b.disc || x.b.dsel!=='none');   // 할인 대상 품목 (할인 버튼)
        const discRow = m && x.b;   // 모든 품목에 같은 할인 줄 (버튼 · 할인액) — 할인 대상이 아닌 품목도 할인을 넣을 수 있게 (2026-11-17)   // 할인 대상이 아니어도 「할인 넣기」를 눌렀거나 할인액을 넣은 줄은 할인 줄
        // 할인액: 과세(신라) · 비과세(사유원) 따로, 칸에서 바로 고칠 수 있음 (고치면 「직접 고침」, ↺ = 할인 버튼 계산으로 되돌리기)
        const dIn = (side, v, max) => damIn(k, side, v, max);
        if(discRow) h = discRowHTML(k, x.b, m, money);   // 할인액 · 금액은 오른쪽 묶음 (2026-11-18)
        else amt = money + (m && x.b ? `<button type="button" class="dopen" data-dopen="${esc(k)}" title="이 품목에 할인 넣기 (과세 · 비과세 할인액)">할인 넣기</button>` : ''); } }
    el.innerHTML=h; if(am) am.innerHTML=amt; });
  // 전산에만 있는 상품 (예약 내역 줄로 못 옮긴 것)
  if(E) erpList.forEach(x=>{ const k=erpKeyOf(x.product); if(k && !itemRows.includes(k) && !E.other.includes(x)) E.other.push(x); });   // 품목은 알지만 예약 내역에 줄이 없는 것도
  const ex=$('#erpExtra'); if(ex){ ex.innerHTML = E && E.other.length ? `<div class="it-row it-erponly"><b>전산에만 있는 상품</b>${E.other.map(x=>`<div class="it-money">${`<span class="im"><i>상품</i>${esc(x.product)}</span><span class="im"><i>인원</i>${x.people}</span><span class="im"><i>할인</i>${x.disc?'-'+won(x.disc):'없음'}</span><span class="im amt"><i>금액</i><b>${won(x.amount)}</b></span>`}<span class="erp-acts">${erpKeyOf(x.product) ? `<button type="button" class="btn it-erpadd" data-erpadd="${erpList.indexOf(x)}" title="이 상품을 예약 내역 줄로 추가 (인원 · 수량은 전산 그대로)">＋ 항목으로 추가</button>` : `<span class="im warn">품목 관리에 없는 상품</span><button type="button" class="btn it-erpadd" data-erpcat="${erpList.indexOf(x)}" title="이 상품을 품목 관리에 추가하고(가격 = 전산 상품금액 ÷ 인원) 예약 내역 줄로도 넣습니다">＋ 품목 관리에 추가</button>`}<button type="button" class="btn it-erpadd it-erpdrop" data-erpdrop="${erpList.indexOf(x)}" title="필요 없는 상품: 붙여 넣은 전산 내역에서 뺌 (전산 합계 · 대조에서도 빠짐 · 전산 내역을 다시 붙여 넣으면 돌아옴)">빼기</button></span></div>`).join('')}</div>` : ''; }
}
// 전산에만 있는 상품 「빼기」 (2026-11-21): 필요 없는 상품은 붙여 넣은 전산 내역에서 뺌 → 합계 · 대조에서도 빠짐 (다시 붙여 넣으면 돌아옴)
document.addEventListener('click', e=>{ const b=e.target.closest('#itemsBox [data-erpdrop]'); if(!b) return; const x=erpList[+b.dataset.erpdrop]; if(!x) return;
  erpList=erpList.filter(y=>y!==x); touched.add('erpList'); startTimer(); renderTasks(); renderSide(); autoSave();
  toast(`전산 내역에서 「${x.product}」을(를) 뺐습니다. 전산 내역을 다시 붙여 넣으면 돌아옵니다.`, 3600); });
// 전산에만 있는 상품 → 예약 내역 줄로 (인원 · 수량은 전산 그대로)
document.addEventListener('click', e=>{ const b=e.target.closest('#itemsBox [data-erpadd]'); if(!b) return; const x=erpList[+b.dataset.erpadd]; if(!x) return;
  const k=erpKeyOf(x.product); if(!k){ toast('품목 관리에 없는 상품이라 줄로 넣을 수 없습니다.'); return; }
  if(k==='mb'){ const m=mbMenus().find(m=>normSrc(m.src)===normSrc(x.product)); if(m){ rec.mabangMenu=m.name; touched.add('mabangMenu'); } }   // 몽몽마방은 그 메뉴로
  setItemQty(k, String(numOf(itemQty(k)) + (x.people||0))); if(!itemRows.includes(k)) itemRows.push(k);
  itemChanged(true); toast(`${itemLabel(x.product)} ${x.people}${erpUnit(x)}을(를) 예약 내역에 추가했습니다. 담당 · 비고를 확인하세요.`);
});
// 품목 관리에 없는 전산 상품 → 품목 관리(공유 품목 목록)에 자동 추가 → 바로 예약 내역 줄로 (2026-11-16)
//  가격 = 전산 상품금액(할인 전) ÷ 인원 · 구분: 이름에 관람 → 관람(비과세 · 사유원, 할인 대상) / 식사 · 런치 등 → 식사 / 그 밖 → 굿즈 (과세 · 신라). 품목 관리에서 고칠 수 있음
document.addEventListener('click', async e=>{ const b=e.target.closest('#itemsBox [data-erpcat]'); if(!b) return; const x=erpList[+b.dataset.erpcat]; if(!x) return;
  const name=String(x.product||'').trim(), n=Math.max(1, x.people||1), unit=Math.round((x.base||x.amount||0)/n);
  if(!name){ toast('상품 이름이 없습니다.'); return; }
  if(catalogItems().some(it=>normSrc(it.src)===normSrc(name))){ toast('이미 품목 관리에 있는 상품입니다. 화면을 새로고침해 주세요.'); return; }
  const kind = /관람/.test(name) && !/관람권|관람식사권/.test(name) ? 'view' : /식사|정식|런치|디너|밥상|도시락|비빔밥/.test(name) ? 'food' : 'goods', KL={view:'관람', food:'식사', goods:'굿즈'};
  if(!confirm(`품목 관리에 추가할까요? (모두가 쓰는 품목 목록)\n\n상품: ${name}\n가격: ${won(unit)}원 (${kind==='goods'?'1개':'1인'} · 전산 상품금액 ${won(x.base||x.amount)}원 ÷ ${n})\n구분: ${KL[kind]} · ${kind==='view'?'비과세(사유원)':'과세(신라)'}\n\n추가한 뒤 이 예약 내역에도 줄로 넣습니다. 가격 · 구분은 품목 관리에서 고칠 수 있습니다.`)) return;
  b.disabled=true; b.textContent='추가하는 중…';
  const item={uid:Date.now(), src:name, name, kind, form: kind==='view'?'sayuwon':'shilla', price:unit, disc: kind==='view'};
  try{
    const r=await SY.quote.post({ops:[{op:'add', item}]});
    if(!r || r.ok===false) throw new Error((r && r.error) || '저장 실패');
    if(r.data && quoteCat){ quoteCat.added=r.data.added||quoteCat.added; quoteCat.edits=r.data.edits||quoteCat.edits; writeJSON('sayuwon_quote_cat', quoteCat); }
    else if(quoteCat){ (quoteCat.added ||= []).unshift(item); writeJSON('sayuwon_quote_cat', quoteCat); }
    markDb('cat');
  }catch(err){ b.disabled=false; b.textContent='＋ 품목 관리에 추가'; toast('품목 관리에 추가하지 못했습니다: '+err.message); return; }
  toast(`「${name}」을(를) 품목 관리에 추가했습니다 (${KL[kind]} · ${won(unit)}원).`);
  renderSide(); paintItemPrices();
  const k=erpKeyOf(x.product); if(k){ setItemQty(k, String(numOf(itemQty(k)) + (x.people||0))); if(!itemRows.includes(k)) itemRows.push(k); itemChanged(true); }   // 그대로 예약 내역 줄로
});
// ▣ js/group/05-item-rows.js — 칸 그리기: 양식 만들기(buildForm · renderForm) · 값과 빨강/노랑/초록 색(paintFields) · 날짜 · 시각 · 전화 · 차량 입력 · 미정 기한
// 예약 내역: 품목을 고르면 비고를 뺀 모든 칸(인원 · 수량 · 시작 · 끝 · 장소 · 코스 · 결제 등)이 비었을 때 빨간 칸 — 고객님께 여쭤볼 정보 (2026-11-18)
// (담당은 paintItemState 에서 · 결제 미정은 노란 칸 · 코스 「앵당삼거리 시작」을 켜면 채운 것)
function paintTmMissing(){
  document.querySelectorAll('#itemsBox .it-row:not(.it-new) .it-q input[data-iq]').forEach(q=>q.closest('.it-q').classList.toggle('missing', !q.value.trim()));
  document.querySelectorAll('#itemsBox .it-row:not(.it-new) .it-q2 input[data-iqa]').forEach(q=>q.closest('label').classList.toggle('missing', !numOf(itemQty(q.dataset.iqa))));   // 성인 · 학생: 줄 인원이 비었을 때 성인 칸만 빨갛게 (학생 0명은 그대로, 2026-11-20)
  document.querySelectorAll('#itemsBox .it-slotadd').forEach(d=>{ const b=d.querySelector('[data-slotadd]'); if(b) d.hidden = !(numOf(itemQty(b.dataset.slotadd))>=1); });   // 대관 「＋ 시작 · 끝 더하기」: 시간 수가 1 이상일 때만 (2026-11-27)
  document.querySelectorAll('#itemsBox .it-row:not(.it-new) .it-xl').forEach(l=>{ const x=l.querySelector('.it-x, [data-is]'); l.classList.toggle('missing', !!x && !String(x.value||'').trim()); });   // [data-is] = 세미나 도슨트 2회의 장소마다 담당 칸 (2026-11-27: 이 칸을 못 찾아 비어 있어도 늘 초록이던 것 고침)
}
const paintStaffCell = el => el.closest('.it-s, .it-xl')?.classList.toggle('missing', !String(el.value||'').trim());   // 담당 칸 하나: 비면 빨강 · 고르면 바로 초록
function paintItemState(){   // 담당이 빈 줄은 빨갛게, 그날 현황은 넣은 묶음만
  document.querySelectorAll('#itemsBox [data-is]').forEach(paintStaffCell);   // 세미나 도슨트 2회: 장소마다 담당 칸(.it-xl)도
  paintTmMissing();
  const kinds=new Set(itemRows.map(k=>{ const t=itemKind(k); return t==='sadam'?'sadam':t==='mb'?'mabang':t==='prog'?(OPT[GROUP_OF[k]]||{}).id:''; }));
  document.querySelectorAll('#itemsInfo .dayinfo').forEach(el=>{ el.hidden = !kinds.has(el.id.replace('info_','')); });
  const dn=$('#dayNone'); if(dn) dn.hidden = [...document.querySelectorAll('#itemsInfo .dayinfo')].some(el=>!el.hidden);
}
// 글자를 치는 칸(메모 · 이름 · 이메일 · 비고 · 담당 등): 칠 때마다 화면 전체를 다시 그리면 느려서, 값은 바로 넣고 다시 그리기는 멈추고 0.35초 뒤 한 번 (칸을 나가면 바로)
const isTypingEl = el => !!el && (el.tagName==='TEXTAREA' || (el.tagName==='INPUT' && /^(text|email|tel|search|)$/.test(el.getAttribute('type')||'')));
let repaintT=0;
function repaintSoon(){ clearTimeout(repaintT); repaintT=setTimeout(()=>{ repaintT=0; paintFields(); renderSide(); }, 350); }
function repaintNow(){ if(!repaintT) return; clearTimeout(repaintT); repaintT=0; paintFields(); renderSide(); }
document.addEventListener('focusout', e=>{ if(e.target.closest?.('#form, #itemsBox')) setTimeout(repaintNow, 0); });
function itemChanged(structural, keepStaff){ if(!keepStaff) staffDefaults(); startTimer();   // 담당을 직접 지울 때는 다시 채우지 않음
  paintFields(); renderSide(); if(structural) renderItems(true); else paintTmMissing(); }
document.addEventListener('change', e=>{ const v=e.target.closest?.('#itemsBox [data-iview]'); if(!v) return; rec.viewSrc=v.value; touched.add('viewSrc'); itemChanged(false, true); });   // 관람 품목 고르기
document.addEventListener('change', e=>{
  const s=e.target.closest?.('#itemsBox [data-isel]'); if(!s) return;
  const old=s.dataset.isel, val=s.value; if(!val) return;
  const nk = val.startsWith('mb:') ? 'mb' : val;
  let q=itemQty(old); const st=itemHasStaff(old) ? String(rec[itemStfKey(old)]||'') : '', so=canStu(old) ? itemStu(old) : 0;
  if(nk!==old) clearItem(old);
  if(nk!==old && !numOf(q) && (itemKind(nk)==='sadam' || (itemKind(nk)==='varea' && !/학생|해오름/.test(nk)))){ const n0=numOf(rec.people), rest=n0-areaOthers(rec); q = rest>0 ? String(rest) : n0 ? String(n0) : ''; }   // 관람 · 관람+식사: 기본 = 관람 인원(다른 줄에 넣은 만큼 빼고) 모두 성인 (2026-11-20)
  if(val.startsWith('mb:') && val.length>3){ rec.mabangMenu=val.slice(3); touched.add('mabangMenu'); mbPayDefault(); }
  const i=itemRows.indexOf(old); if(i>=0) itemRows[i]=nk; else itemRows.push(nk);
  if(nk!==old){ setItemQty(nk, q || (itemKind(nk)==='goods' ? '1' : '')); if(itemHasStaff(nk) && st && !String(rec[itemStfKey(nk)]||'').trim()){ rec[itemStfKey(nk)]=st; touched.add(itemStfKey(nk)); } if(so && canStu(nk)) setItemStu(nk, Math.min(so, numOf(itemQty(nk)))); }
  itemChanged(true);
  const qi=document.querySelector(`#itemsBox [data-iq="${CSS.escape(nk)}"], #itemsBox [data-iqa="${CSS.escape(nk)}"]`); if(qi && !qi.value) qi.focus();
});
document.addEventListener('input', e=>{
  const el=e.target; if(!el.closest?.('#itemsBox')) return;
  if(el.dataset.iq!=null){ const k=el.dataset.iq, c=el.value.replace(/[^\d+]/g,''), was=itemQty(k); if(c!==el.value) el.value=c; setItemQty(k, el.value);
    if(k==='seminar' && semLines(was)!==semLines(el.value)){ itemChanged(true, !!was); const q=document.querySelector('#itemsBox [data-iq="seminar"]'); if(q){ q.focus(); const n=q.value.length; try{ q.setSelectionRange(n,n); }catch(_){} } if(semLines(el.value)>=2 && semLines(was)<2) openSemGuide(semLines(el.value)); return; }   // 세미나 도슨트 횟수가 바뀌면 회차 줄(시작 · 끝 · 장소 · 담당 · 비고)을 그 수만큼 (2026-11-27 · 줄어든 회차의 값은 화면에 있는 동안은 남고, 저장할 때 빠짐 — 예전 2 → 1 과 같음)
    if(itemKind(k)==='prog' && itemUnit(k)==='시간' && numOf(el.value) && numOf(el.value)!==numOf(was)){ const [s]=tmTimes(k); if(s && fmtTime(s)){ const en=plusH(s, progHours(k)); rec['tm_'+k]=`${s}~${en}`; touched.add('tm_'+k); const b=el.closest('.it-row')?.querySelector(`[data-ix="tmE:${CSS.escape(k)}"]`); if(b) b.value=en; paintTmMissing(); } }   // 시간 프로그램(대관 등): 수량(시간)을 바꾸면 끝 = 시작 + 그 시간 (2026-11-18)
    itemChanged(false, !!was); }   // 담당 기본값은 수량을 처음 넣을 때만
  else if(el.dataset.iqa!=null){ const k=el.dataset.iqa, c=el.value.replace(/\D/g,''), was=itemQty(k); if(c!==el.value) el.value=c;   // 성인 인원 → 그 줄 인원 = 성인 + 학생 (2026-11-20)
    const a=parseInt(c)||0, s=itemStu(k); setItemQty(k, a+s ? String(a+s) : ''); itemChanged(false, !!was); }
  else if(el.dataset.istu!=null){ const k=el.dataset.istu, c=el.value.replace(/\D/g,''); if(c!==el.value) el.value=c;   // 학생 인원: 친 그대로 (성인 칸은 건드리지 않음) · 그 줄 인원 = 성인 + 학생 (2026-11-20 · 맞지 않으면 칸을 나갈 때 팝업)
    const n=parseInt(c)||0, ai=el.closest('.it-q2')?.querySelector('[data-iqa]'), a=parseInt((ai?.value||'').replace(/\D/g,''))||0;
    setItemStu(k, n); setItemQty(k, a+n ? String(a+n) : ''); itemChanged(false, true); }
  else if(el.dataset.inote!=null){ setItemNote(el.dataset.inote, el.value); startTimer(); repaintSoon(); }   // 항목 비고 (치는 동안은 다시 그리지 않음)
  else if(el.dataset.is!=null){ if(el.value==='__new'){ const k=el.dataset.is; el.value=String(rec[itemStfKey(k)]||''); newMemberAsk(k); return; }   // 「＋ 새 멤버 추가…」 (2026-11-24)
    const sk=itemStfKey(el.dataset.is); rec[sk]=el.value; touched.add(sk); startTimer(); document.querySelectorAll('#itemsBox [data-is]').forEach(o=>{ if(o!==el && itemStfKey(o.dataset.is)===sk) o.value=el.value; paintStaffCell(o); }); repaintSoon(); }   // 담당 (멤버 목록에서 고름) · 색은 그 자리에서 바로 (2026-11-27 · 굿즈는 모든 줄이 같은 담당)
  else if(el.dataset.ix==='mbS' || el.dataset.ix==='mbE' || /^(tm|sl)[SE]:/.test(el.dataset.ix||'')){ el.value=el.value.replace(/[^\d:]/g,''); }   // 몽몽마방 · 프로그램 시작 · 끝: 칸을 나갈 때 맞춰 저장 (아래)
  else if(el.dataset.ix!=null && el.tagName==='INPUT'){ rec[el.dataset.ix]=el.value; touched.add(el.dataset.ix); itemChanged(false, true); }
});
document.addEventListener('change', e=>{ const el=e.target; if(!el.closest?.('#itemsBox') || el.dataset.ix==null || el.tagName!=='SELECT') return; rec[el.dataset.ix]=el.value; touched.add(el.dataset.ix);
  if(el.dataset.ix==='mabangPay'){ syncPayTbd(rec); touched.add('tbd'); el.parentNode.classList.toggle('tbd', el.value==='미정'); paintFields(); renderSide(); paintTmMissing(); if(el.value==='기타') openPayGuide('기타', '몽몽마방'); }   // 몽몽마방 결제 미정 ↔ 미정 항목
  itemChanged(false); });
// 몽몽마방 시작 · 끝나는 시각: 칸을 나갈 때 24시간으로 맞추고, 시작을 넣으면 끝 = 1시간 뒤
document.addEventListener('focusout', e=>{ const el=e.target, ix=el.dataset?.ix; if(!el.closest?.('#itemsBox') || (ix!=='mbS' && ix!=='mbE')) return;
  let [s, en]=mbTimes(); const v=el.value.trim() ? (fmtTime(el.value)||el.value.trim()) : '';
  if(ix==='mbS'){ if(v===s) { el.value=v; return; } s=v; if(v && fmtTime(v)) en=plus1h(v); } else { if(v===en){ el.value=v; return; } en=v; }
  rec.mabangTime = s||en ? `${s}~${en}` : ''; touched.add('mabangTime');
  const row=el.closest('.it-row'); if(row){ const a=row.querySelector('[data-ix="mbS"]'), b=row.querySelector('[data-ix="mbE"]'); if(a) a.value=s; if(b) b.value=en; }
  itemChanged(false, true); });
// 개별 · 시간 프로그램 시작 · 끝나는 시각 (몽몽마방과 같은 방식): 시작을 넣으면 끝 = 1시간 뒤 (시간 프로그램은 예약한 시간만큼). 저장은 tm_키 "13:00~14:00"
document.addEventListener('focusout', e=>{ const el=e.target, ix=el.dataset?.ix||''; if(!el.closest?.('#itemsBox') || !/^tm[SE]:/.test(ix)) return;
  const k=ix.slice(4), isS=ix[2]==='S'; let [s, en]=tmTimes(k); const v=el.value.trim() ? (fmtTime(el.value)||el.value.trim()) : '';
  if(isS){ if(v===s){ el.value=v; return; } s=v; if(v && fmtTime(v)) en=plusH(v, progHours(k)); } else { if(v===en){ el.value=v; return; } en=v; }
  rec['tm_'+k] = s||en ? `${s}~${en}` : ''; touched.add('tm_'+k);
  const row=el.closest('.it-row'); if(row){ const a=row.querySelector(`[data-ix="tmS:${CSS.escape(k)}"]`), b=row.querySelector(`[data-ix="tmE:${CSS.escape(k)}"]`); if(a) a.value=s; if(b) b.value=en; }
  if(!isS) tmOrderWarn(s, en);
  itemChanged(false, true); paintTmMissing(); });
// 끝이 시작보다 이르면(같아도) 글로 알림 (2026-11-27 · 값은 그대로 둠 — 고치는 것은 사람이)
const semLines = v => Math.max(1, Math.min(SEM_MAX, numOf(v)||1));   // 세미나 도슨트 횟수 → 회차 줄 수
function tmOrderWarn(s, en){ const a=fmtTime(s), b=fmtTime(en); if(a && b && b<=a) toast(`끝 시각(${b})이 시작 시각(${a})보다 이릅니다. 다시 확인해 주세요.`); }
// 대관에 더한 시작 · 끝 (2026-11-27 · 프로그램 시작 · 끝과 같은 방식): 시작을 넣으면 끝 = 1시간 뒤 (고칠 수 있음). 저장은 rec.islots
document.addEventListener('focusout', e=>{ const el=e.target, m=String(el.dataset?.ix||'').match(/^sl([SE]):(.+):(\d+)$/); if(!m || !el.closest?.('#itemsBox')) return;
  const k=m[2], i=+m[3], isS=m[1]==='S', L=rawSlots(k).slice(); if(i>=L.length) return;
  const p=String(L[i]||'').split('~'); let s=p[0]||'', en=p[1]||''; const v=el.value.trim() ? (fmtTime(el.value)||el.value.trim()) : '';
  if(isS){ if(v===s){ el.value=v; return; } s=v; if(v && fmtTime(v)) en=plusH(v, 1); } else { if(v===en){ el.value=v; return; } en=v; }
  L[i] = s||en ? `${s}~${en}` : ''; setItemSlots(k, L);
  const row=el.closest('.it-slot'); if(row){ const a=row.querySelector('[data-ix^="slS:"]'), b=row.querySelector('[data-ix^="slE:"]'); if(a) a.value=s; if(b) b.value=en; }
  if(!isS) tmOrderWarn(s, en);
  itemChanged(false, true); paintTmMissing(); });
document.addEventListener('click', e=>{ const ad=e.target.closest?.('#itemsBox [data-slotadd]'), dl=e.target.closest?.('#itemsBox [data-slotdel]'); if(!ad && !dl) return;
  if(ad){ const k=ad.dataset.slotadd, L=rawSlots(k); if(L.length>=SLOT_MAX) return; setItemSlots(k, [...L, '']); }
  else { const [k, i]=dl.dataset.slotdel.split(':'), L=rawSlots(k).slice(); L.splice(+i, 1); setItemSlots(k, L); }
  itemChanged(true, true); });
document.addEventListener('focusout', e=>{ const el=e.target; if(!el.closest?.('#itemsBox') || el.dataset.ix==null || el.tagName!=='INPUT' || !el.value) return;
  if(/^(mabangTime|tm_)/.test(el.dataset.ix)){ const f=fmtRange(el.value); if(f && f!==el.value){ el.value=f; rec[el.dataset.ix]=f; touched.add(el.dataset.ix); itemChanged(false); } } });   // 12001300 → 12:00~13:00
document.addEventListener('focusin', e=>{ const el=e.target; if(!el.closest?.('#itemsBox') || el.dataset.iq==null) return; const k=el.dataset.iq, t=itemKind(k); renderInfo(t==='mb' ? 'mabangL' : ['sadam','prog'].includes(t) ? k : null); });   // 그날 같은 항목 예약 현황
document.addEventListener('click', e=>{
  if(e.target.closest?.('#itemsBox [data-iadd]')){
    // 관람권이 아직 없으면 먼저 관람권 줄을 자동으로: 입장시각 13시 이후면 13~18시, 아니면 9~18시 · 인원 = 관람 인원 − 관람 포함 품목(사담 등) 인원
    if(!viewsParse(rec.views).some(x=>/관람\(\d\d:00~18:00\)/.test(x.src)) && numOf(rec.people)){ const src=timedViewSrc(rec), q=Math.max(0, numOf(rec.people)-areaOthers(rec));
      if(q){ setItemQty('v:'+src, String(q)); if(!itemRows.includes('v:'+src)) itemRows.unshift('v:'+src); toast(`관람권(${/13:00/.test(src)?'13~18시':'9~18시'}) ${q}명을 넣었습니다.`); } }
    const k='new:'+Date.now().toString(36); itemRows.push(k); itemPend.add(k); itemChanged(true); document.querySelector(`#itemsBox [data-isel="${k}"]`)?.focus(); return; }   // 금액도 바로 다시 계산 (자동으로 넣은 관람권 줄이 처음부터 할인 · 금액으로 보이게, 2026-11-18)
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
const dateDisp = SY.dateDisp;   // 공통 (js/common.js)
// 날짜 칸 (마감일 · 미정 항목 답변일): 방문일처럼 칸 안에 "2026-11-14 (금)". 누르면 달력, 고르는 즉시 요일도 바뀜
const dboxHTML = (attrs, v) => `<span class="dbox"><input class="dtxt" readonly value="${esc(dateDisp(v))}" placeholder="날짜 고르기"><input type="date" class="dpick" ${attrs} value="${esc(v||'')}" tabindex="-1" aria-hidden="true"></span>`;
const dboxOpen = t => { const p=t.parentElement.querySelector('.dpick'); if(!p) return; try{ p.showPicker(); }catch(_){ p.focus(); p.click(); } };
document.addEventListener('click', e=>{ const t=e.target.closest?.('.dtxt'); if(t){ e.preventDefault(); dboxOpen(t); } });
document.addEventListener('keydown', e=>{ const t=e.target.closest?.('.dtxt'); if(t && (e.key==='Enter' || e.key===' ' || e.key==='ArrowDown')){ e.preventDefault(); dboxOpen(t); } });
['input','change'].forEach(ev=>document.addEventListener(ev, e=>{ const p=e.target; if(!p.classList?.contains('dpick')) return; const t=p.parentElement.querySelector('.dtxt'); if(t) t.value=dateDisp(p.value); }, true));
function parseDateText(s){ return SY.parseDateText(s); }   // 공통 (js/common.js)
const NUM_ONLY = { people:/[^\d+]/g, vehicle:/[^\d]/g, mabangPrice:/[^\d]/g, mabangTime:/[^\d:~]/g };   // 관람 인원은 42+2 처럼 + 허용
FIELDS.forEach(f=>{ if(/^tm_/.test(f[1])) NUM_ONLY[f[1]]=/[^\d:~]/g; });   // 도슨트 시간대도 숫자 · : · ~ 만
// 연락처: 빈 칸을 누르면 010- 이 들어가고, 숫자를 치면 - 가 자동 (어떤 번호든 자릿수에 맞춰, 2026-11-18)
//  휴대폰 010-1234-5678 · 010-123-4567(예전 10자리) · 서울 02-123-4567 / 02-1234-5678 · 지역 · 070 031-123-4567 / 031-1234-5678
//  0505 등 050X-123-4567 · 대표번호 1588-1234 · 그 밖 1234-5678. 010- 이 자동으로 들어간 칸에 0 으로 시작하는 번호(02 · 031 …)를 치면 010 은 뗌
const PHONE = k => /^c\d+_phone$/.test(k);
function fmtPhone(v){ return SY.fmtPhone(v); }   // 공통 (js/common.js)
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
const busCount = people => { const n=numOf(people); return !n ? 0 : n<45 ? 1 : Math.floor(n/45); };   // 버스 대수: 45명 미만 1대, 그 이상 인원 ÷ 45 버림 (2026-11-18)
var vehAutoN=0;   // 자동으로 넣은 버스 대수 (관람 인원을 바꾸면 따라감 · 직접 고치면 0)
function fieldHTML(k,label,col,cls,req){
  let extra = DATE_KEYS.has(k) && k!=='date' ? ' type="date"' : '';
  if(k==='date') extra+=' readonly inputmode="numeric" data-ime="num" placeholder="누르면 달력" title="누르면 달력 · 한 번 더 누르면 직접 입력"';
  if(k==='owner') extra+=' list="owners"';
  if(KO_FIRST(k)) extra+=' data-ime="ko"';
  if(EN_ONLY(k))  extra+=' data-ime="en" inputmode="email" lang="en" autocapitalize="off" spellcheck="false"';
  if(PHONE(k))    extra+=' data-ime="num" inputmode="tel" placeholder="010-0000-0000"';
  if(NUM_ONLY[k]) extra+=' inputmode="numeric" data-ime="num"';
  if(TIME_KEYS[k]) extra+=` data-tp="1" readonly title="누르면 시각 고르기 (24시간)"`;   // 입장 · 퇴장: 스크롤로 고르기 (js/timepick.js)
  if(k==='mabangTime') extra+=' placeholder="12:00~13:00" title="24시간 · 숫자만 쳐도 됨 (12001300)"';
  if(k==='mabangPrice') extra+=' placeholder="1인 단가"';
  if(k==='mabangNote') extra+=' data-ime="ko"';
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
    : /^plc_/.test(k)
    ? `<select id="f_${k}" data-k="${k}"><option value="">선택</option>${PLC_OPTS.map(p=>`<option>${p}</option>`).join('')}</select>`
    : /^tm_/.test(k)
    ? `<input id="f_${k}" data-k="${k}" inputmode="numeric" data-ime="num" placeholder="13:00~15:00" title="24시간 · 숫자만 쳐도 됨 (13001500)" autocomplete="off">`
    : /^crs_/.test(k)
    ? `<input id="f_${k}" data-k="${k}" data-ime="ko" autocomplete="off">`
    : `<input id="f_${k}" data-k="${k}"${extra}${/^프로그램/.test(GROUP_OF[k]||'') ? ` placeholder="${UNIT(k)}"` : ''}>`;
  const tbdBox = k!=='vehicle' && k!=='pay' && k!=='mabangPay' && TBD_KEYS.some(([tk])=>tk===k) ? `<label class="tbdck" title="아직 안 정해졌으면 체크"><input type="checkbox" data-tbd="${k}">미정</label>` : "";
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
      const f=SY.phoneTyping(el, e.inputType);   // 자릿수에 맞춰 - · 자동 010- 뒤 02 · 031 … 이면 010 뗌 · 지우는 중엔 끝 - 안 붙임 (js/common.js)
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
    if(k==='pay' || k==='mabangPay' || k==='vehicle'){ syncPayTbd(rec); touched.add('tbd'); }   // 결제 미정 ↔ 미정 항목 '결제 방법' · '몽몽마방 결제'
    if(k==='pay' && PAY_GUIDE[rec.pay]) openPayGuide(rec.pay);
    if(k==='mabangPay' && rec.mabangPay==='기타') openPayGuide('기타', '몽몽마방');   // 결제 방식을 고르면 그 안내를 바로 팝업으로
    if(k==='vehicle' && e.target.id==='f_vtype'){ const s=tbdSet(rec); rec.vehicle==='미정' ? s.add('vehicle') : s.delete('vehicle'); rec.tbd=TBD_KEYS.filter(([tk])=>s.has(tk)).map(([,tl])=>tl).join(', '); if(!s.size){ rec.tbdDate=''; rec.tbdLate=''; tbdAuto=false; } touched.add('tbd'); }   // 차종 '미정' = 차량 미정 체크
    // 버스: 고르는 순간 대수 자동 = 관람 인원 45명 미만 1대, 그 이상은 인원 ÷ 45 (버림). 관람 인원을 바꾸면 자동으로 넣은 대수도 따라감 (직접 고친 대수는 그대로, 2026-11-18)
    if(k==='vehicle' && e.target.id==='f_vtype' && $('#f_vtype').value==='버스' && !vehParts(rec.vehicle).n){ const n=busCount(rec.people); if(n){ rec.vehicle=`버스 ${n}대`; vehAutoN=n; $('#f_vehicle').value=String(n); } }
    if(k==='vehicle' && e.target.id==='f_vehicle') vehAutoN=0;
    if(k==='people'){ const p=vehParts(rec.vehicle); if(p.t==='버스' && vehAutoN && +p.n===vehAutoN){ const n=busCount(rec.people); if(n && n!==vehAutoN){ rec.vehicle=`버스 ${n}대`; vehAutoN=n; touched.add('vehicle'); } } }
    if(k==='date') renderInfo();
    startTimer(); if(isTypingEl(e.target)) repaintSoon(); else { paintFields(); renderSide(); }   // 글자를 치는 칸은 멈춘 뒤 한 번만 다시 그림 (빠르게, 2026-11-18)
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
  $('#form').addEventListener('focusin', e=>{ const el=e.target; if(PHONE(el.dataset?.k||'') && !el.value){ el.value='010-'; el.dataset.autop='1'; setTimeout(()=>{ try{ el.setSelectionRange(4,4); }catch(_){} },0); } });
  $('#form').addEventListener('focusout', e=>{ const el=e.target; if(!PHONE(el.dataset?.k||'')) return; delete el.dataset.autop; if(/^010-?$/.test(el.value) && !rec[el.dataset.k]) el.value=''; });
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
  // 입장시각: 빈 칸을 눌러도 아무것도 넣지 않음 (2026-11-16). 나갈 때 24시간 HH:MM 으로 맞춤 (9:30 → 09:30, 13 → 13:00)
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
  for(let i=0;i<nContacts;i++) CFIELDS.forEach(([f])=>{ const k=`c${i}_${f}`, el=document.getElementById('f_'+k); el.value=rec[k]||''; });
  paintFields();
}
function paintFields(changed=[]){
  syncGoodsStaff();   // 굿즈 담당 = 영업 담당
  const req=new Set(REQUIRED().map(r=>r[0]));
  const warnF=new Set(fieldWarnings(rec).map(u=>u.field)), tbdS=tbdSet(rec);   // 칸마다 다시 계산하지 않고 한 번만 (2026-11-23 · 칸 69개 × 경고 계산 = 입력이 늦던 원인)
  allKeys().forEach(k=>{
    if(k==='owner') return;   // 헤더의 영업 담당은 이 컴퓨터 사용자 (기록마다 바뀌지 않음)
    const el=document.getElementById('f_'+k); if(!el) return;
    const v=rec[k]||'';
    if(k==='vehicle'){ const p=vehParts(v), a=document.activeElement;
      if(p.t && a!==$('#f_vtype')) $('#f_vtype').value=p.t;
      if(!v && a!==$('#f_vtype')) $('#f_vtype').value = '미정';   // 비어 있으면 미정 (2026-11-18 · 예전엔 버스)
      [[el,p.n],[$('#f_vbus'),p.bus],[$('#f_vcar'),p.car]].forEach(([x,val])=>{ if(a!==x && x.value!==val) x.value=val; });
      const t=$('#f_vtype').value; el.hidden = t==='혼합' || t==='미정'; $('#f_vmix').hidden = t!=='혼합'; }
    else if(el.type==='checkbox') el.checked=!!v;
    else if(k==='date'){ if(!el.dataset.editing){ const d=dateDisp(v); if(el.value!==d) el.value=d; } const p=$('#f_datePick'); if(p && p.value!==v) p.value=v; }
    else if(k==='mabangMenu'){ const h=mbMenuHTML(v); if(el.dataset.h!==h){ el.innerHTML=h; el.dataset.h=h; } }
    else if(k==='goods'){ const h=goodsHTML(v); if(el.dataset.h!==h && !el.contains(document.activeElement)){ el.innerHTML=h; el.dataset.h=h; } }
    else { if(el.tagName==='SELECT' && v && ![...el.options].some(o=>o.value===v)) el.add(new Option(v,v)); if(el.value!==v && document.activeElement!==el) el.value=v; }
    const w=document.getElementById('w_'+k);
    w.classList.toggle('unsure', warnF.has(k));
    // 차량은 처음에 받아야 하는 정보 → 미정이어도 빨간색 (2026-11-21)
    const vehRed = k==='vehicle' && (!v || /^미정/.test(v));
    const isTbd = !vehRed && (tbdS.has(k) || v==='미정');   // 미정 체크 · 값이 미정이면 노란색
    w.classList.toggle('tbd', isTbd);
    w.classList.toggle('missing', vehRed || (req.has(k) && !v && !isTbd) || (isStf(k) && !v && needsStaff(k.slice(4))));
    w.classList.toggle('got', req.has(k) && !!v && !isTbd && !vehRed);   // 예약 내용 칸 색: 빨강 = 미입력 · 노랑 = 미정 · 초록 = 완료 (2026-11-18)
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
  paintPayLink();
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
  if(typeof paintMobHead==='function') paintMobHead();   // 휴대폰 제목 줄 (업체 · 방문일 · 인원 · 단계 · js/group/15-lock-popups.js)
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
// 인원이 19명 ↔ 20명을 넘나들면 할인 버튼을 직접 고른 것(사전예약 · 단체예약)과 고친 할인액은 지우고 인원 기준(자동)으로 다시 (할인 없음은 그대로)

// 2026-11-21: 품목(줄)마다 그 줄 인원으로 — 관람 · 관람+식사 줄이 20명 이상이면 단체예약 10%, 19명까지 사전예약 5%. 그 줄이 넘나들 때 그 줄만 다시
function followDiscBand(){
  const bl=quoteBlocks(rec).blocks.filter(x=>x.key && x.disc), now={}; bl.forEach(x=>{ now[x.key] = x.qty>=20 ? 2 : x.qty>0 ? 1 : 0; });
  if(discBand && typeof discBand==='object'){
    const m=idiscMap(rec), am=idamtMap(rec), up=[], down=[]; let mchg=false;
    bl.forEach(x=>{ const was=discBand[x.key], b=now[x.key]; if(!was || !b || was===b) return; const kk=dkey(x.key);
      if(m[kk]==='pre' || m[kk]==='grp'){ delete m[kk]; mchg=true; } if(x.dsel!=='none' && am[kk]) setItemDamt(x.key, null);
      (b===2 ? up : down).push(itemName(x.key)); });
    if(mchg){ rec.idisc=Object.entries(m).map(([a,c])=>`${a}=${c}`).join('; '); touched.add('idisc'); }
    if(up.length) toast(`${up.join(' · ')} 인원이 20명 이상이 되어 할인을 단체예약 10%로 바꿨습니다.`);
    if(down.length) toast(`${down.join(' · ')} 인원이 20명 미만이 되어 할인을 사전예약 5%로 바꿨습니다.`);
  }
  discBand=now;
}
function renderSide(){
  followDiscBand();
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
// 결제링크: 결제 · 현장 재결제 옆에 「결제링크 전송」 · 「입금 확인」 체크 칸 (현장 재결제와 같은 모양, 결제링크일 때만 체크 가능)
// 체크하면 그 일시를 기록(칸에 일시가 보임), 끄면 지울지 물음. 추후 과업(결제링크 전송 · 입금 확인)과 서로 맞춤
const PAYLINK = [['linkSent','결제링크 전송','linksend','보냄'],['paidAt','입금 확인','paycheck','입금됨']];
function paintPayLink(){
  const anchor=document.getElementById('w_onsite') || document.getElementById('w_pay'); if(!anchor) return;
  const on=rec.pay==='결제링크';
  let prev=anchor;
  PAYLINK.forEach(([k,l,,txt])=>{
    let w=document.getElementById('pl_'+k);   // w_linkSent 는 숨은 칸이 따로 있어서 pl_
    if(!w){ w=document.createElement('div'); w.className='f'; w.id='pl_'+k; w.innerHTML=`<label for="plck_${k}"><span>${l}</span></label><div class="inbox"><label class="ckf"><input type="checkbox" id="plck_${k}" data-pl="${k}"> <span class="pl-txt"></span></label></div>`; prev.after(w); }
    prev=w;
    const ck=w.querySelector('input'), lb=w.querySelector('.ckf'), sp=w.querySelector('.pl-txt');
    ck.disabled=!on; ck.checked=!!rec[k]; sp.textContent = rec[k] ? (d=>`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`)(new Date(rec[k])) : txt;   // 칸이 좁아 11/16 15:09 (요일은 마우스를 올리면)
    lb.title = !on ? '결제 방식이 결제링크일 때만 체크할 수 있습니다' : rec[k] ? `${l} ${dtLabel(rec[k])} · 끄면 기록을 지울지 물어봅니다` : `체크하면 ${l} 일시가 기록되고 추후 과업도 완료됩니다`;
  });
}
document.addEventListener('change', e=>{ const ck=e.target; if(!ck.matches?.('input[data-pl]')) return;
  const [k,l,tid]=PAYLINK.find(p=>p[0]===ck.dataset.pl);
  // 결제링크 전송 전에는 입금 확인 불가 · 결제링크 전송을 풀면(다시 보낼 때) 입금 확인도 함께 해제 (2026-11-18)
  if(!ck.checked){ const alsoPaid = k==='linkSent' && rec.paidAt;
    if(rec[k] && !confirm(`${l} 기록(${dtLabel(rec[k])})을 지울까요?${alsoPaid?'\n입금 확인 기록도 함께 지워집니다.':''}`)){ ck.checked=true; return; } rec[k]='';
    if(alsoPaid){ rec.paidAt=''; touched.add('paidAt'); const pc=tasks.find(x=>x.id==='paycheck'); if(pc){ pc.done=false; pc.doneAt=''; delete pc.manualDone; } } }
  else { if(k==='paidAt' && !rec.linkSent){ ck.checked=false; toast('결제링크 전송을 먼저 체크해 주세요. (결제링크를 보내기 전에는 입금 확인을 할 수 없습니다)'); return; } rec[k]=new Date().toISOString(); }
  touched.add(k); const t=tasks.find(x=>x.id===tid); if(t){ t.done=!!rec[k]; t.doneAt=rec[k]||''; }
  startTimer(); paintPayLink(); renderSide(); renderTasks(); if(window.__autoReady) scheduleAuto();
  if(rec[k]) toast(`${l} ${dtLabel(rec[k])} 기록했습니다.`);
});
// 결제 방식별로 끊기 전에 추가로 받거나 안내할 것
const PAY_GUIDE = {
  '세금계산서': ['세금계산서 발행을 위해 사업자등록증을 보내주시겠어요?', '세금계산서 받으실 이메일 주소가 어떻게 되실까요?', '세금계산서 발행일은 언제로 해 드릴까요?'],
  '결제링크':   ['결제링크 보내드리면 언제쯤 결제하실 수 있을까요?', '현장에서 법인카드로 다시 결제하실 계획도 있으실까요?'],
  '현장 결제':  ['현장 결제로 하시면 당일 인원 변경이 어려운 점 양해 부탁드립니다.', '인원은 언제까지 확정해 주실 수 있을까요?'],
  '기타':       ['고객님께 어떻게 결제하실지 여쭤 보세요.', '정한 결제 방법을 「통화 메모」에 꼭 남겨 주세요.'],
};
let pgMemo=false, pgStf=false;   // 기타 결제 안내를 닫으면 통화 메모 칸으로 · 세미나 2회 안내를 닫으면 담당 칸으로
// 세미나 도슨트를 2회로 바꾼 순간 안내 (결제 안내 팝업을 같이 씀, 2026-11-18)
function openSemGuide(n){ pgMemo=false; pgStf=true; $('#pgModal .hint').hidden=true;
  $('#pgTitle').textContent = `세미나 도슨트 ${n||2}회`;
  $('#pgBody').innerHTML = ['회차마다 시작 · 끝 · 장소 · 담당을 모두 넣어 주세요.', '회차마다 담당 칸이 따로 있습니다 (담당이 비면 추후 과업으로 알려 줍니다).'].map(g=>`<li>${esc(g)}</li>`).join('');
  $('#pgModal').hidden = false; setTimeout(()=>$('#pgOk').focus(), 0); }
function openPayGuide(pay, what){ pgMemo = pay==='기타'; pgStf=false; $('#pgModal .hint').hidden=false;
  $('#pgTitle').textContent = pay==='기타' ? `[${what?what+' ':''}기타 결제] 통화 메모에 결제 방법을 남겨 주세요` : `[${pay} 안내] 고객님께 말씀드리세요`;
  $('#pgBody').innerHTML = PAY_GUIDE[pay].map(g=>`<li>${esc(g)}</li>`).join('');
  $('#pgModal').hidden = false; setTimeout(()=>$('#pgOk').focus(), 0);
}
$('#pgOk').onclick = () => { $('#pgModal').hidden = true; if(pgStf){ pgStf=false; const s=document.querySelector('#itemsBox [data-is="seminar"]'); if(s){ s.focus(); const n=s.value.length; try{ s.setSelectionRange(n,n); }catch(_){} } return; } if(pgMemo){ pgMemo=false; const m=$('#memoBox'); if(m){ m.scrollIntoView({block:'center'}); m.focus(); } } };
$('#pgModal').addEventListener('click', e=>{ if(e.target.id==='pgModal') $('#pgModal').hidden = true; });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#pgModal').hidden){ e.preventDefault(); $('#pgModal').hidden = true; } });
// 프로그램 입력 내용: "요가 20명", "차방 대관 2시간" (grp 를 주면 그 묶음만)
// staff 를 주면 "동행 도슨트 2시간 (담당:사공유빈)" (차방 · 당두봉갈은 담당을 적었을 때만)
// staff 이면 도슨트 시간대 · 출발지 · 장소도: "동행 도슨트 2시간 13:00~15:00 (출발지:앵당삼거리, 담당:사공유빈)"
const progList = (r, grp, staff) => FIELDS.filter(f=>(grp ? f[0]===grp : /^프로그램/.test(f[0])) && !isSub(f[1]) && r[f[1]]).map(f=>{ const v=String(r[f[1]]), sub=p=>String(r[`${p}_${f[1]}`]||'').trim(), who=sub('stf');   // 담당이 여러 명이면 한 칸에 「문현빈, 김선영」
  // 2026-11-24: 출발지 · 장소 · 담당은 괄호 하나에 쉼표로 "(장소:당두봉갈, 담당:김선영)"
  const ex = !staff ? [] : [sub('crs') && `출발지:${sub('crs')}`, sub('plc') && `장소:${sub('plc')}`, who ? `담당:${who}` : needsStaff(f[1]) ? '담당:미정' : ''].filter(Boolean);
  const tag = !staff ? '' : (sub('tm') ? ` ${sub('tm')}` : '') + itemSlotTimes(r, f[1]).map(v=>` · ${v}`).join('') + (ex.length ? ` (${ex.join(', ')})` : '') + (f[1]==='seminar' ? sem2Tag(r) : '');
  return `${f[2]} ${/^\d+(\+\d+)*$/.test(v) ? v+UNIT(f[1]) : v}${tag}`; });
// 세미나 도슨트 수량 2일 때 두 번째: " · 두 번째 14:00~14:30 (장소:당두봉갈)"
const sem2Tag = r => semXKeys(r).map(sk=>{ const t=String(r['tm_'+sk]||'').trim(), p=String(r['plc_'+sk]||'').trim(); return t||p ? ` ·${t?' '+t:''}${p?` (장소:${p})`:''}` : ''; }).join('');   // 2회차부터 모두 (3회차부터 2026-11-27)
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
  if(sp.some(x=>x.proof)) s += `\n\n[특별 할인 안내]\n` + sp.filter(x=>x.proof).map(x=>`· ${x.name} ${x.n}명은 ${x.rate===1?'무료':Math.round(x.rate*100)+'% 할인'}입니다. 방문 당일 꼭 지참해 주세요: ${x.proof}`).join('\n')
    + `\n· 다른 할인과 겹치면 가장 큰 할인 하나만 적용되고, 증빙이 없으면 할인이 어렵습니다.`;
  return s;
}

// ===== 담당 고르기의 「＋ 새 멤버 추가…」 (2026-11-24) =====
// 이름만 넣으면 멤버관리에 바로 만듦 (임시 사번 NEW-xxxxxx · 이 사번으로는 로그인할 일이 없음) → 그 줄의 담당으로 고름. 사번 · 연락처는 멤버관리에서 넣으면 그 이름 그대로 바뀜
function newMemberAsk(k){
  let m=document.getElementById('nmModal');
  if(!m){ m=document.createElement('div'); m.id='nmModal'; m.className='modal'; m.hidden=true;
    m.innerHTML=`<section class="panel ask-box" role="dialog" aria-modal="true" aria-labelledby="nmTitle"><h2 id="nmTitle">새 멤버 추가</h2>`
      + `<p class="ask-msg">멤버관리에 없는 사람의 이름을 넣으면 바로 멤버로 만들고 담당으로 고릅니다. <b>사번 · 연락처는 멤버관리</b>에서 넣어 주세요.</p>`
      + `<input id="nmName" data-ime="ko" placeholder="이름" style="width:100%;height:38px;border:1px solid var(--line);border-radius:7px;padding:0 10px;font:inherit;box-sizing:border-box">`
      + `<p class="err" id="nmErr" style="min-height:1em;margin:6px 0"></p><div class="ask-btns"><button type="button" class="btn primary" id="nmNo">취소</button><button type="button" class="btn primary" id="nmOk">추가하고 고르기</button></div></section>`;
    document.body.appendChild(m);
    m.addEventListener('mousedown', e=>{ if(e.target===m) m.hidden=true; });
    m.querySelector('#nmNo').onclick=()=>{ m.hidden=true; };
    m.querySelector('#nmName').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); m.querySelector('#nmOk').click(); } }); }
  m.dataset.k=k; m.querySelector('#nmName').value=''; m.querySelector('#nmErr').textContent=''; m.hidden=false; setTimeout(()=>m.querySelector('#nmName').focus(), 0);
  m.querySelector('#nmOk').onclick=async()=>{ const name=m.querySelector('#nmName').value.trim().replace(/\s+/g,' '), err=m.querySelector('#nmErr'), ok=m.querySelector('#nmOk');
    if(!name){ err.textContent='이름을 넣어 주세요.'; return; }
    const pick=()=>{ const sk=itemStfKey(m.dataset.k); rec[sk]=name; touched.add(sk); m.hidden=true; renderItems(true); startTimer(); };
    if(MEMBER_NAMES.includes(name)){ pick(); return; }   // 이미 있는 이름이면 그냥 고름
    ok.disabled=true; ok.textContent='추가하는 중…';
    try{ const emp='NEW-'+Math.random().toString(36).slice(2,8).toUpperCase(), j=await SY.call({action:'memberAdd', list:[{name, emp}], by:savedOwner()||''});
      if(!j.added){ err.textContent='멤버를 만들지 못했습니다. 다시 눌러 주세요.'; return; }
      MEMBER_NAMES=[...new Set([...MEMBER_NAMES, name])].sort((a,b)=>a.localeCompare(b,'ko')); try{ localStorage.setItem('sy_member_names', JSON.stringify(MEMBER_NAMES)); }catch(_){}
      toast(`「${name}」 님을 멤버로 만들었습니다 · 사번 · 연락처는 멤버관리에서`); pick(); }
    catch(e){ err.textContent = e.code==='bad_key' ? '로그인을 확인해 주세요.' : '만들지 못했습니다: '+(e.code||e.message); }
    finally{ ok.disabled=false; ok.textContent='추가하고 고르기'; } };
}
loadMemberNames();
// ▣ js/group/06-booking-status.js — 그날 예약 현황 · 삭제된 단체 예약 · 예약 목록(몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 = 예약 현황 공유 화면) · 직접 추가 · 찾기
// ===================== 그날 예약 현황 (식사·프로그램) =====================
const INFO_OF = k => isSub(k) ? null : OPT[GROUP_OF[k]]?.id || null;   // sadam · mabang · prog
let curInfoKey = null;
const numOf = v => { const s=String(v||'').trim(); return /^\d+(\s*\+\s*\d+)*\s*명?$/.test(s) ? s.match(/\d+/g).reduce((a,x)=>a+(+x),0) : 0; };   // 인원만 더함 (10:30 같은 시간은 제외)
function sameDay(){ return cache.filter(r=>r.date===rec.date && r.id!==editingId && r.callType!=="개인고객" && r.id!==MBDB_ID); }
// 관리자 사이트(admin.sayuwon.com) 사담·마방 현황: 서버(cloudflare/worker.js 의 syncAdmin)가 15분마다 가져와 둔 것
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
// 몽몽마방 예약 목록은 공유 기록(서버 DB 의 calls 표)에 한 줄(id mabangdb, 통화 구분 '몽몽마방예약')로 저장: 수정 기록 칸에 {rows:[{d,t,n,p,m}], at, by}
var MBDB_ID='mabangdb', MBDB_TYPE='몽몽마방예약';   // var: sameDay가 먼저 불려도 되게
function mbDb(){ const r=cache.find(x=>x.id===MBDB_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return { rows:Array.isArray(j.rows)?j.rows:[], at:j.at||'', by:j.by||'' }; }
const mbDbOn = d => mbDb().rows.filter(x=>x.d===d).sort((a,b)=>String(a.t).localeCompare(String(b.t)));
// 대관 · 도슨트 · 프로그램 현황: 예약접수가 된 단체 예약에서 자동으로 (저장된 예약 + 지금 화면의 예약)
//  대관 = 차방 대관(몽몽차방) · 당두봉갈 대관 / 도슨트 = 동행 도슨트(동행) · 세미나 도슨트(PPT) · 이름에 도슨트가 들어간 추가 프로그램 / 프로그램 = 그 밖의 개별 · 시간 프로그램
const RENT_PLACE = { chabang:'몽몽차방', dangdu:'당두봉갈' }, DOCENT_KIND = { donghaeng:'동행', seminar:'PPT', seminar2:'PPT' };
const isCoupon = k => /음료쿠폰/.test(LABEL[k]||'') || /음료쿠폰/.test(PROG_SRC[k]||'');   // 음료쿠폰(가가빈빈 · 몽몽차방)
const bookCat = k => RENT_PLACE[k] ? 'rent' : (DOCENT_KIND[k] || isDocent(LABEL[k])) ? 'docent' : isCoupon(k) ? 'coupon' : 'prog';
const BOOK_CATS = { rent:'대관', docent:'도슨트', prog:'프로그램', coupon:'음료쿠폰' };
function bookRows(withMe){ try{ return bookRows0(withMe); }catch(_){ return []; } }   // 초기화 중(아래 정의 전)에 불려도 되게
// withMe: 예약 목록 창 · 내 일정 출력은 지금 열어 둔 예약도 (화면의 값으로, 「지금 이 예약」 표시 · 2026-11-23: 열어 둔 예약이 도슨트 명단에서 사라지던 것)
//         그날 건수 · 「다른 예약 n건」은 예전처럼 다른 예약만
function bookRows0(withMe){
  const out=[];
  const recs = (cache||[]).filter(r=>isGroupRec(r) && r.id!==editingId && r.date && isBooked(stageOfRec(r))).map(r=>({r, x:xOf(r)}));
  if(withMe && !BOOK_ONLY && rec && rec.date && isBooked(effStage(rec))) recs.push({r:{id:editingId||''}, x:rec, me:true});
  recs.forEach(({r,x,me})=>{
    const notes = Object.fromEntries(String(x.inotes||'').split(/\s*;\s*/).map(s=>{ const i=s.indexOf('='); return i>0 ? [s.slice(0,i).trim(), s.slice(i+1).trim()] : null; }).filter(Boolean));
    PROG_KEYS().forEach(k=>{ const v=x[k]; if(!v) return; const cat=bookCat(k), unit=UNIT(k);
      out.push({ cat, id:r.id, me:!!me, d:x.date, org:x.org||x.contact||'(업체 미정)',
        ppl: (cat==='prog' || cat==='coupon') && unit!=='시간' ? (numOf(v)||numOf(x.people)) : numOf(x.people),
        hrs: unit==='시간' ? (numOf(v)||1) : 0, place:RENT_PLACE[k]||x['plc_'+k]||'', kind:DOCENT_KIND[k]||(cat==='docent'?LABEL[k]:''), item:LABEL[k]||k,
        tm:x['tm_'+k]||'', staff:String(x['stf_'+k]||'').trim()||x.owner||'', note:[notes[k], x['crs_'+k]&&`출발지 ${crsNorm(x['crs_'+k])}`].filter(Boolean).join(' · ') });
      { const o=out[out.length-1];
        if(k==='seminar') semXKeys(x).forEach(sk=>out.push({...o, place:x['plc_'+sk]||'', tm:x['tm_'+sk]||'', staff:String(x['stf_'+sk]||'').trim()||o.staff, note:[notes[sk]].filter(Boolean).join(' · ')}));   // 세미나 도슨트 2회 이상: 회차마다 현황에 한 줄 (2회차 2026-11-18 · 3회차부터 2026-11-27)
        itemSlotTimes(x, k).forEach(v=>out.push({...o, tm:v})); }   // 대관에 더한 시작 · 끝: 시간대마다 한 줄 (2026-11-27)
    });
    // 굿즈로 넣은 음료쿠폰(예: 음료쿠폰(몽몽차방)) · 몽몽차방 · 가가빈빈 음료도 예약 현황 「음료쿠폰」에 (2026-11-18 · 음료 2026-11-21)
    goodsParse(x.goods).filter(g=>isDrinkSrc(g.src)).forEach(g=>out.push({ cat:'coupon', id:r.id, me:!!me, d:x.date, org:x.org||x.contact||'(업체 미정)', ppl:g.qty||0, hrs:0, place:'', kind:'', item:goodsName(g.src), tm:'', staff:String(x.stf_goods||'').trim()||x.owner||'', note:notes['g:'+g.src]||'' }));
  });
  return out.sort((a,b)=>(a.d+(a.tm||'99')).localeCompare(b.d+(b.tm||'99')));
}
function renderDayAll(){
  if(BOOK_ONLY && !$('#bookModal').hidden) paintBook();   // 공유 페이지: 새 기록을 받으면 다시 그림
  const el=$('#dayAll'); if(!el) return;
  // 예약 현황 = 버튼 5개 (몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰). 누르면 예약 목록 창이 그 구분 탭으로. 방문일이 있으면 그날 건수
  const d=rec.date, rows = d ? [...bookRows(), ...manualRows()].filter(x=>x.d===d) : [], n = c => !d ? 0 : c==='mb' ? mbDbOn(d).length + mbAutoRows().filter(x=>x.d===d).length : rows.filter(x=>x.cat===c).length;
  el.innerHTML = `<div class="da-btns">${[['mb','몽몽마방'], ...Object.entries(BOOK_CATS)].map(([c,t])=>`<button type="button" class="da-btn" data-book="${c}" title="${t} 예약 목록${d?` (${dateLabel(d)} ${n(c)}건)`:''}">${t}${n(c)?` <b>${n(c)}</b>`:''}</button>`).join('')}</div>`
    + `<div class="none da-note">${d ? `숫자 = ${dateLabel(d)} 예약 건수 · ` : ''}사담은 예약 전산에서 확인하세요.</div>`
    + dayPicked(d, rows);
}
// 방문일 + 예약 내역에 고른 항목(몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰) → 그날 같은 구분의 다른 예약을 예약 현황 아래에 바로 (2026-11-18)
function dayPicked(d, rows){
  if(!d || BOOK_ONLY) return '';
  const cats=[]; (itemRows||[]).forEach(k=>{ const t=itemKind(k), c = t==='mb' ? 'mb' : t==='prog' ? bookCat(k) : t==='goods' && isDrinkSrc(k.slice(2)) ? 'coupon' : ''; if(c && !cats.includes(c)) cats.push(c); });
  if(!cats.length) return '';
  const order=['mb','rent','docent','prog','coupon']; cats.sort((a,b)=>order.indexOf(a)-order.indexOf(b));
  return cats.map(c=>{
    let li=[];
    if(c==='mb'){ const list=[...mbDbOn(d), ...mbAutoRows().filter(x=>x.d===d && !x.cur)].sort((a,b)=>String(a.t||'99').localeCompare(String(b.t||'99')));
      li=list.map(x=>`<li${x.auto?` data-bopen="${esc(x.id)}" class="r"`:''}><span class="dp-t">${esc(x.t||'시간 미정')}</span><b>${esc(x.n||'')}</b>${x.p?` · ${esc(x.p)}명`:''}${x.m?` · ${esc(x.m)}`:''}${x.pay==='마방'?' · 마방 결제':''}</li>`); }
    else { const list=rows.filter(x=>x.cat===c).sort((a,b)=>String(a.tm||'99').localeCompare(String(b.tm||'99')));
      li=list.map(x=>`<li${x.manual?'':` data-bopen="${esc(x.id)}" class="r"`}><span class="dp-t">${esc(x.tm||'시간 미정')}</span><b>${esc(x.org||'')}</b>${x.ppl?` · ${x.ppl}${c==='coupon'?'장':'명'}`:''}${c==='rent'||c==='docent' ? [x.place, c==='docent'?x.kind:''].filter(Boolean).map(v=>` · ${esc(v)}`).join('') : x.item?` · ${esc(x.item)}`:''}${x.staff?` <small>(담당 ${esc(x.staff)})</small>`:''}</li>`); }
    return `<div class="dp-box"><div class="dp-h">${esc(dateLabel(d))} ${c==='mb'?'몽몽마방':BOOK_CATS[c]} <small>${li.length?`다른 예약 ${li.length}건`:'다른 예약 없음'}</small></div>${li.length?`<ul class="dp-list">${li.join('')}</ul>`:''}</div>`;
  }).join('');
}
// ===================== 삭제된 단체 예약 (서버 동작 'deleted', 보기 전용) =====================
let trashItems=null, trashErr='';
const delInfo = r => { const h=parseHist(r).h, e=[...h].reverse().find(x=>/^\[삭제\]/.test(x.what||'')); return { by:e?e.by:'', why:e?String(e.what).replace(/^\[삭제\]\s*/,''):'(사유 기록 없음)' }; };
function paintTrash(){
  const q=$('#trashSearch').value.trim().replace(/\s/g,'').toLowerCase(), qd=q.replace(/\D/g,'');
  if(trashItems==null){ $('#trashBody').innerHTML = trashErr ? `<tr><td colspan="8" class="empty">${esc(trashErr)}</td></tr>` : SY.skel('table', 6, {cols:8, label:'삭제된 예약을 불러오는 중'}); $('#trashSum').textContent=''; return; }   // 받는 동안 스켈레톤 (2026-11-27)
  const all=trashItems.filter(r=>isGroupRec(r) && r.id!==MBDB_ID).map(r=>({r, ...delInfo(r)})).sort((a,b)=>String(b.r.deleted).localeCompare(String(a.r.deleted)));
  const list=all.filter(o=>!q || [o.r.org, contactCell(o.r).replace(/<[^>]+>/g,''), o.why, o.by, ownerOf(o.r)].join(' ').replace(/\s/g,'').toLowerCase().includes(q) || (qd.length>=3 && JSON.stringify(o.r).replace(/\D/g,'').includes(qd)));
  $('#trashSum').textContent = `${all.length}건${q?` · 찾은 ${list.length}건`:''}`;
  $('#trashBody').innerHTML = list.map(o=>`<tr><td>${esc(fmt(o.r.deleted))}</td><td>${esc(o.by)}</td><td class="note">${esc(o.why)}</td><td>${esc(dateLabel(o.r.date)||'')}</td><td><b>${esc(o.r.org||'(업체 미정)')}</b></td><td>${contactCell(o.r)}</td><td class="num">${esc(o.r.people||'')}</td><td class="owner">${esc(ownerOf(o.r)||'')}</td></tr>`).join('')
    || `<tr><td colspan="8" class="empty">${q?'찾은 예약이 없습니다.':'삭제된 단체 예약이 없습니다.'}</td></tr>`;
}
async function openTrash(){ $('#trashModal').hidden=false; $('#trashSearch').value=''; trashItems=null; trashErr=''; paintTrash();
  try{ const j=await SY.call({action:'deleted'}); trashItems=j.items||[]; }
  catch(e){ trashErr = '불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.'; }
  paintTrash(); }
$('#trashBtn').onclick=openTrash;
$('#trashClose').onclick=()=>{ $('#trashModal').hidden=true; };
$('#trashSearch').addEventListener('input', paintTrash);
$('#trashModal').addEventListener('mousedown', e=>{ if(e.target.id==='trashModal') $('#trashModal').hidden=true; });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#trashModal').hidden){ e.preventDefault(); e.stopImmediatePropagation(); $('#trashModal').hidden=true; } }, true);
// ===================== 예약 목록 창: 몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 =====================
// 대관 · 도슨트 · 프로그램 = 예약접수된 단체 예약에서 자동 + 직접 넣은 예약 / 몽몽마방 = 직접 넣은 예약 (엑셀 붙여넣기는 없앰 · 2026-11-14)
// 직접 넣은 대관 · 도슨트 · 프로그램은 공유 기록 한 줄(id bookdb, 통화 구분 '예약현황추가') 수정 기록 칸에 {rows:[{id,cat,d,org,ppl,tm,place,kind,item,staff,note}], at, by}
var BKDB_ID='bookdb', BKDB_TYPE='예약현황추가';
function bkDb(){ const r=cache.find(x=>x.id===BKDB_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return { rows:Array.isArray(j.rows)?j.rows:[], at:j.at||'', by:j.by||'' }; }
async function bkDbSave(rows, msg){
  if(BOOK_GUEST){ toast('로그인한 사람만 고칠 수 있습니다.'); return; }
  const old=cache.find(x=>x.id===BKDB_ID), now=new Date().toISOString(), keep=ymd(new Date(Date.now()-180*864e5));
  rows=rows.filter(x=>x.d>=keep);   // 180일 지난 것은 정리
  const item={...(old||{}), id:BKDB_ID, callType:BKDB_TYPE, saved:now, takenBy:savedOwner()||'', summary:`예약 현황 직접 추가 ${rows.length}건`, history:JSON.stringify({rows, at:now, by:savedOwner()||''})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===BKDB_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
  if(!$('#bookModal').hidden) paintBook(); renderDayAll(); toast(msg);
}
// ===== 예약 현황 직접 추가 · 몽몽마방 목록의 수정 기록 (2026-11-21): 추가 · 수정 · 빼기(사유 필수)를 모두 남김 =====
// 공유 기록 한 줄(id booklog, 통화 구분 '예약현황기록') 수정 기록 칸에 {log:[{t, by, act, db:'bk'|'mb', cat, row, chg, why}]}
// 한 칸(구글 시트 5만 자)에 다 차면 앞의 기록은 booklog-○○ 줄로 옮겨 두고 새로 (지우지 않음). 목록이 180 · 90일 지나 정리돼도 기록은 남음
var BKLOG_ID='booklog', BKLOG_TYPE='예약현황기록';
const BK_FLD = { d:'날짜', org:'업체', ppl:'인원', tm:'시간', place:'장소', kind:'종류', item:'항목', staff:'담당', note:'비고' };
const bkSnap = (db, x) => { x=x||{}; const o = db==='mb' ? {d:x.d, tm:x.t, org:x.n, ppl:x.p, item:x.m, by:x.by, guest:x.guest} : {d:x.d, org:x.org, ppl:x.ppl, tm:x.tm, place:x.place, kind:x.kind, item:x.item, staff:x.staff, note:x.note, by:x.by, guest:x.guest};
  Object.keys(o).forEach(k=>{ if(o[k]==null || o[k]==='' || o[k]===0) delete o[k]; else o[k]=String(o[k]); }); return o; };
const bkChg = (a, b) => Object.keys(BK_FLD).filter(k=>String(a[k]||'')!==String(b[k]||'')).map(k=>[k, a[k]||'', b[k]||'']);
function bkLogList(){ return (cache||[]).filter(r=>r.callType===BKLOG_TYPE).flatMap(r=>{ try{ const j=JSON.parse(r.history||'{}'); return Array.isArray(j.log) ? j.log : []; }catch(_){ return []; } }).sort((a,b)=>String(b.t).localeCompare(String(a.t))); }
async function bkLogAdd(entries){
  if(BOOK_GUEST || !entries.length) return;
  const now=new Date().toISOString(), by=savedOwner()||'';
  entries=entries.map(e=>({t:now, by, ...e}));
  const old=cache.find(x=>x.id===BKLOG_ID); let log=[]; try{ const j=JSON.parse((old&&old.history)||'{}'); if(Array.isArray(j.log)) log=j.log; }catch(_){}
  let next=[...log, ...entries];
  if(old && log.length && JSON.stringify({log:next}).length>40000){   // 칸이 차면 앞 기록을 따로 한 줄로 옮겨 둠
    const arch={...old, id:BKLOG_ID+'-'+Date.now().toString(36), saved:now, summary:`예약 현황 수정 기록 ${log.length}건 (보관)`}; await store.put(arch); cache.push(arch); next=entries; }
  const item={...(old||{}), id:BKLOG_ID, callType:BKLOG_TYPE, saved:now, takenBy:by, summary:`예약 현황 수정 기록 ${next.length}건`, history:JSON.stringify({log:next, at:now, by})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===BKLOG_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
  if($('#bkLogModal') && !$('#bkLogModal').hidden) paintBkLog();
}
// 수정 기록 창: 지금 탭(몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰) 것만, 「모든 구분」을 켜면 전부
function paintBkLog(){
  const all=$('#bkLogAll').checked, c=bookCatNow, list=bkLogList().filter(e=>all || (c==='mb' ? e.db==='mb' : e.db!=='mb' && e.cat===c));
  const catName = e => e.db==='mb' ? '몽몽마방' : BOOK_CATS[e.cat]||e.cat||'';
  const what = r => [r.d?dateLabel(r.d):'', r.tm, r.org?`<b>${esc(r.org)}</b>`:'', r.ppl?r.ppl+(r.cat==='coupon'?'장':'명'):'', r.place, r.kind, r.item, r.staff?`담당 ${r.staff}`:'', r.note?`비고 ${r.note}`:''].filter(Boolean).map(v=>/^<b>/.test(v)?v:esc(v)).join(' · ');
  $('#bkLogSum').textContent = `${list.length}건${all?'':` · ${c==='mb'?'몽몽마방':BOOK_CATS[c]}`}`;
  $('#bkLogBody').innerHTML = list.map(e=>`<tr class="bklog-${e.act==='빼기'?'del':e.act==='수정'?'edit':'add'}"><td>${esc(dtLabel(e.t))}</td><td>${esc(e.by||'')}</td><td><span class="tag">${esc(e.act)}</span>${all?`<small class="hint" style="margin:0;display:block">${esc(catName(e))}</small>`:''}</td><td>${what({...(e.row||{}), cat:e.cat})}</td>`
    + `<td>${e.act==='빼기' ? `사유: <b>${esc(e.why||'')}</b>` : e.act==='수정' ? (e.chg||[]).map(([k,a,b])=>`${esc(BK_FLD[k]||k)} ${esc(a||'(없음)')} → <b>${esc(b||'(없음)')}</b>`).join('<br>') || '바뀐 칸 없음' : esc(e.why||'')}</td></tr>`).join('')
    || `<tr><td colspan="5" class="empty">아직 기록이 없습니다. 직접 추가 · 수정 · 빼기를 하면 여기에 남습니다.</td></tr>`;
  labelCells('#bkLogBody', ['일시','누가','구분','예약','바뀐 것 · 사유']);
}
function openBkLog(){ $('#bkLogAll').checked=false; paintBkLog(); $('#bkLogModal').hidden=false; }
// 빼기: 사유를 꼭 적어야 뺌. 기록을 먼저 남기고 목록에서 뺌
let bkDelPend=null;   // {db:'bk'|'mb', id | i}
function openBkDel(p){
  const r = p.db==='mb' ? mbDb().rows[p.i] : bkDb().rows.find(x=>x.id===p.id); if(!r) return;
  bkDelPend={...p, snap:bkSnap(p.db, r), cat: p.db==='mb' ? 'mb' : r.cat};
  $('#bkDelMsg').textContent = p.db==='mb' ? `${dateLabel(r.d)} ${r.t||''} ${r.n} 몽몽마방 예약을 목록에서 뺍니다.` : `${dateLabel(r.d)} ${r.org} ${BOOK_CATS[r.cat]} 예약을 목록에서 뺍니다.`;
  $('#bkDelWhy').value=''; $('#bkDelErr').textContent=''; $('#bkDelModal').hidden=false; setTimeout(()=>$('#bkDelWhy').focus(), 0);
}
const closeBkDel = () => { $('#bkDelModal').hidden=true; bkDelPend=null; };
async function doBkDel(){
  const p=bkDelPend, why=$('#bkDelWhy').value.trim(); if(!p) return;
  if(!why){ $('#bkDelErr').textContent='빼는 사유를 적어 주세요.'; $('#bkDelWhy').focus(); return; }
  if(BOOK_GUEST){ toast('로그인한 사람만 뺄 수 있습니다.'); return; }
  $('#bkDelYes').disabled=true;
  try{
    await bkLogAdd([{act:'빼기', db:p.db, cat:p.cat, row:p.snap, why}]);   // 기록 먼저
    if(p.db==='mb'){ const rows=mbDb().rows, k=rows.findIndex(x=>JSON.stringify(bkSnap('mb', x))===JSON.stringify(p.snap)); if(k>=0) await mbDbSave(rows.filter((_,j)=>j!==k), '몽몽마방 예약을 목록에서 뺐습니다 (사유는 기록에 남겼습니다).'); }
    else await bkDbSave(bkDb().rows.filter(x=>x.id!==p.id), '예약을 목록에서 뺐습니다 (사유는 기록에 남겼습니다).');
    closeBkDel();
  } finally { $('#bkDelYes').disabled=false; }
}
let bookCatNow='rent', bookEdit=null;   // bookEdit: 고치는 줄 (몽몽마방은 {mb:번호}, 그 밖은 {id})
const BOOK_COLS = { rent:['일자','업체','인원','장소 · 시간','담당자 이름','비고사항',''], docent:['일자','업체','인원','시간','종류','담당자 이름','비고사항',''], prog:['일자','업체','인원','프로그램 항목','담당자 이름','비고사항',''], coupon:['일자','업체','매수','쿠폰 종류','담당자 이름','비고사항',''] };
// 예약 목록 표 (2026-11-25 통일): 다섯 목록 모두 같은 칸 · 같은 순서 — 날짜 · 시간 · 업체 · 인원 · 내용(목록마다 이름만 다름) · 담당자 · 비고 · (구분) / 줄마다 날짜
const BK_CONTENT = { mb:'메뉴', rent:'장소', docent:'종류 · 장소', prog:'프로그램', coupon:'쿠폰 종류' };
const BK_COLS = c => ['구분','날짜','시간','업체','인원'+(c==='coupon'?' (매수)':''),BK_CONTENT[c]||'내용','담당자','비고'];   // 2026-11-28: 끝의 빈 열(수정 · × 자리)을 없앰 — 비고가 마지막 열 (고치기 = 줄을 누름 · 빼기 = 고치는 창의 「이 예약 빼기」)
const BK_CLS = ['c-k','c-d','c-t','c-o','c-n','c-x','c-s','c-m'];
const bkHeadHTML = c => `<tr>${BK_COLS(c).map((h,i)=>`<th class="${BK_CLS[i]}">${h}</th>`).join('')}</tr>`;
// 「구분」 열 (2026-11-28 · 날짜 앞): 단체 예약에서 온 줄 = 「단체예약」 · 직접 넣은 줄 = 「직접 추가」 (v.src = 'g' | 'm' · 색은 css .bk-src)
const BK_SRC = { g:'단체예약', m:'직접 추가' };
const bkSrcTag = s => `<span class="tag bk-src ${s==='m'?'m':'g'}">${BK_SRC[s==='m'?'m':'g']}</span>`;
// 한 줄: v = {src, d, tm, org, n, x, staff, note} · cls/attr = 줄 표시 · acts = 오른쪽 끝
const bkRowHTML = (v, cls, attr, acts) => `<tr class="${cls}"${attr}><td class="c-k">${bkSrcTag(v.src)}${acts||''}</td><td class="c-d">${esc(dateLabel(v.d))}</td><td class="c-t">${esc(v.tm||'')}</td><td class="c-o"><b>${esc(v.org||'')}</b></td><td class="c-n num">${esc(v.n||'')}</td><td class="c-x">${v.x||''}</td><td class="c-s" style="white-space:pre-line">${esc(v.staff||'')}</td><td class="c-m note">${v.note||''}</td></tr>`;   // acts = 「지금 이 예약」 이름표 (구분 칸 안 · 단체 화면에서 열어 둔 예약)
function manualRows(){ try{ return bkDb().rows.map(x=>({...x, manual:true, ppl:+x.ppl||0})); }catch(_){ return []; } }   // 직접 넣은 대관 · 도슨트 · 프로그램
// ===== 예약 목록 찾기 (2026-11-25 · 2026-11-27 「기간 설정」 단추 없앰): 날짜 칸 두 개를 바로 누름 (비어 있으면 전체 · 하나만 고르면 그날 하루 · 둘이 다르면 기간 · 끝은 시작보다 앞설 수 없음 · 「초기화」 = 전체로) + 검색어(프로그램 · 업체명 · 담당자 이름 · 띄어 쓰면 모두 맞는 것) =====
function bkFind(){ const v=id=>(document.getElementById(id)||{}).value||'', q=v('bfQ').trim().toLowerCase();
  const from=v('bfFrom'), to=v('bfTo');
  let src='', q2=q.replace(/단체\s*예약/g, ()=>{ src=src||'g'; return ' '; }).replace(/직접\s*추가/g, ()=>{ src=src||'m'; return ' '; });   // 「단체예약」 · 「직접 추가」 라고 치면 그 구분의 줄만 (2026-11-28 · 나머지 글자는 전처럼 찾음)
  return { q, src, words:q2.split(/\s+/).filter(Boolean), field:v('bfField'), day:'', from, to, dated:!!(from||to), on:!!(q||from||to) }; }
// 찾기 구분 (2026-11-27 · #bfField): 전체(기본 = 예전과 같음) · 업체명 · 담당자 · 프로그램(내용 칸 = 프로그램 · 종류 · 장소 · 메뉴) · 비고 — 고르면 그 칸에서만 찾음
//  p = { org, staff, what, note, rest } (rest = 시간 · 목록 이름처럼 「전체」일 때만 찾는 것)
const bkHay = (F, p) => (F.field && F.field in p ? [p[F.field]] : [p.org, p.what, p.staff, p.rest, p.note]).flat().join(' ');
const bkFindOk = (F, d, hay) => (!F.day || d===F.day) && (!F.from || d>=F.from) && (!F.to || d<=F.to) && F.words.every(w=>String(hay).toLowerCase().includes(w));
const bfSet = (id, val) => { const p=document.getElementById(id); if(!p) return; p.value=val; const t=p.parentElement.querySelector('.dtxt'); if(t) t.value = val ? dateDisp(val) : ''; };
function bfPaintDate(){ const w=document.getElementById('bfRangeW'); if(!w) return;
  w.classList.remove('off'); w.querySelectorAll('.dtxt').forEach(t=>{ t.disabled=false; t.placeholder='전체'; });
  const f=$('#bfFrom'); if(f) $('#bfTo').min = f.value || '';   // 달력에서 시작보다 앞선 날은 못 고름
  const b=document.getElementById('bfRangeBtn'); if(b) b.hidden=true; }   // 예전 화면(HTML)이 남아 있을 때
function bkFindPaint(n, by){ const F=bkFind(), el=document.getElementById('bfN');   // by: 모든 목록에서 찾았을 때 목록마다 몇 건인지 (예: 「대관 2 · 도슨트 3」)
  if(el){ el.textContent=''; el.hidden=true; }   // 「찾은 예약 n건 (대관 1 · …)」 글은 없앰 (2026-11-27 운영팀 요청 · 건수는 목록별 상자 제목에)
  bfPaintDate(); }
document.addEventListener('change', e=>{ const id=e.target.id; if(id!=='bfFrom' && id!=='bfTo') return;
  const f=$('#bfFrom').value, t=$('#bfTo').value;
  if(id==='bfFrom' && f && (!t || t<f)) bfSet('bfTo', f);   // 시작만 고르면 그날 하루 · 시작을 끝보다 뒤로 옮기면 끝도 같이
  if(id==='bfTo' && t && f && t<f){ bfSet('bfTo', f); toast('끝나는 날은 시작하는 날보다 앞설 수 없습니다.'); }
  if(id==='bfTo' && t && !f) bfSet('bfFrom', t);   // 끝만 고르면 그날 하루
  if(!e.target.value){ bfSet('bfFrom',''); bfSet('bfTo',''); }   // 한쪽을 지우면 전체로
  paintBook(); });
document.addEventListener('input', e=>{ if(e.target.id==='bfQ') paintBook(); });
document.addEventListener('change', e=>{ if(e.target.id==='bfField') paintBook(); });
document.addEventListener('click', e=>{ if(e.target.id!=='bfReset') return; bfSet('bfFrom',''); bfSet('bfTo',''); const q=$('#bfQ'); if(q) q.value=''; const fd=$('#bfField'); if(fd) fd.value=''; paintBook(); });
function paintBook(){
  document.querySelectorAll('#bookTabs [data-bt]').forEach(b=>b.classList.toggle('on', b.dataset.bt===bookCatNow));
  const isMb = bookCatNow==='mb'; $('#bookMb').hidden=!isMb; $('#bookGen').hidden=isMb; $('#bookAll').hidden=true;
  if($('#bookAddBtn')) $('#bookAddBtn').hidden=BOOK_GUEST;   // 직접 추가 = 창으로 · 로그인한 사람만 (2026-11-28 되살림 · 로그인 없이는 단추가 없음)
  if($('#bookLogBtn')) $('#bookLogBtn').hidden=BOOK_GUEST;   // 수정 기록 = 로그인한 사람
  if($('#bookMineL')) $('#bookMineL').hidden=isMb;   // 몽몽마방 목록에는 담당 칸이 없음
  if($('#bookMe')) $('#bookMe').classList.toggle('nomine', isMb && !bkFind().q);   // 휴대폰(출력 단추 없음): 몽몽마방 목록에서는 담당 상자를 통째로 숨김 (css)
  if(bookAddClosed()) paintBookAdd();   // 팝업에 적는 중이면 (새 기록을 받아 다시 그려도) 적던 칸은 그대로
  { const q=$('#bfQ'); if(q && !q.dataset.all){ q.dataset.all='1'; q.placeholder='검색어 (모든 목록에서 찾음)'; q.title='글자를 넣으면 몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 모든 목록에서 찾습니다. 지우면 고른 목록으로 돌아갑니다.'; } }
  const F=bkFind();   // 찾기 (날짜를 고르면 지난 예약도)
  if(F.q){ paintBookAll(F); return; }   // 검색어가 있으면 다섯 목록 모두에서 (2026-11-27)
  if(isMb){ paintMbDb(); $('#bookTitle').textContent='몽몽마방 예약 목록'; { const bs=$('#bookSum'); if(bs){ bs.textContent = $('#mbdbSum').textContent; bs.hidden=false; } } return; }
  const c=bookCatNow, today=todayYmd(), past=$('#bookPast').checked;
  bkFillNames();   // 담당 이름 목록 (새 예약 · 담당이 생기면)
  const me=bkMe(), mine=$('#bookMine').checked && !!me;   // 내 담당만 보기 (2026-11-21)
  const all=[...bookRows(true), ...manualRows()].filter(x=>x.cat===c).sort((a,b)=>(a.d+(a.tm||'99')).localeCompare(b.d+(b.tm||'99'))), list=all.filter(x=>(past || F.dated || x.d>=today) && (!mine || isMine(x, me)) && bkFindOk(F, x.d, bkHay(F, {org:x.org, staff:x.staff, what:[x.item,x.kind,x.place], note:x.note, rest:x.tm})));
  bkFindPaint(list.length);
  $('#bookTitle').textContent = `${BOOK_CATS[c]} 예약 목록`; { const bs=$('#bookSum'); if(bs){ bs.textContent=''; bs.hidden=true; } }   // 건수 · 「단체 예약에서 자동 + 직접 추가」 문구는 없앰 (2026-11-21)
  $('#bookHead').innerHTML = bkHeadHTML(c);
  $('#bookBody').innerHTML = list.map(x=>bkGenRow(x, today, '')).join('')
    || `<tr><td colspan="8" class="empty">${F.on?'찾는 조건에 맞는 예약이 없습니다.':mine?`담당 「${esc(me)}」인 ${past?'':'앞으로 있을 '}예약이 없습니다.`:all.length?'앞으로 있을 예약이 없습니다.':BOOK_CATS[c]+' 예약이 없습니다.'}</td></tr>`;
  labelCells('#bookBody', BK_COLS(c));   // 휴대폰: 칸마다 이름 (카드 모양, 2026-11-21)
  if(!list.length && gWaiting()) $('#bookBody').innerHTML=SY.skel('table', 6, {cols:8, label:'예약 목록을 불러오는 중'});   // 사본이 없고 처음 받는 중 (2026-11-27 · 로그인 없이 볼 때 등)
}
// 대관 · 도슨트 · 프로그램 · 음료쿠폰 한 줄 (tag = 모든 목록에서 찾을 때 내용 칸 앞의 목록 이름표 · 수정 단추의 data-bcat = 그 줄의 목록)
const bkWhat = x => x.cat==='rent' ? (x.place||'(장소 미정)') : x.cat==='docent' ? [x.kind, x.place].filter(Boolean).join(' · ') : (x.item||'');   // 내용 칸
const bkGenRow = (x, today, tag) => bkRowHTML({src:x.manual?'m':'g', d:x.d, tm:(x.tm||(x.cat==='docent'?'(미정)':'')),   /* 2026-11-28: 시간 뒤의 「(1시간)」 은 안 보임 (운영팀 요청 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 모두) */  org:x.org, n:x.ppl?x.ppl+(x.cat==='coupon'?'장':'명'):'', x:esc(bkWhat(x)), staff:x.staff, note:esc(x.note||'')},
      `r${x.d<today?' past':''}${rec.date && x.d===rec.date?' same':''}`, x.manual?` data-bkrow="${esc(x.id)}" data-bcat="${esc(x.cat)}" title="누르면 고치는 창이 뜹니다 (직접 추가한 예약 · 빼기도 그 창에서)"`:` data-bopen="${esc(x.id)}"`,
      `${!x.manual && x.me ? '<span class="tag call bk-now" title="지금 화면에서 열어 둔 예약 (저장 전 내용도 바로)">지금 이 예약</span>' : ''}`);   // 끝 열의 「단체예약」 이름표는 없앰 (2026-11-27 · 줄을 누르면 그 예약이 열리는 것은 그대로)
// ===== 모든 목록에서 찾기 (2026-11-27): 찾기 칸에 글자를 넣으면 고른 목록 하나가 아니라 몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 다섯 목록을 한 표에 (한 사람이 여러 목록의 담당일 때가 있어서)
//  (2026-11-27 다시) 줄마다 이름표를 붙이지 않고 목록마다 상자를 나눠 그 안에 (#bookAll · 상자 제목 = 목록 이름 + 건수 · 표의 칸 이름은 그 목록 것) · 글자를 지우면 고른 목록으로 돌아감 · 날짜만 고른 것은 예전처럼 고른 목록 안에서 · 탭을 누르면 검색어를 지우고 그 목록으로
//  자료는 로그인한 사람(list) · 로그인 안 한 사람(bookList) 모두 다섯 목록 것을 한 번에 받아 두므로 서버는 그대로
const BK_ALL_NAME = { mb:'몽몽마방', ...BOOK_CATS };
const BK_ALL_COLOR = { mb:['#ece9e2','#5c584e'], rent:['#e7efe2','#4f6b3f'], docent:['#e4ecf5','#3d5a80'], prog:['#f6ecdc','#8a5a1c'], coupon:['#f3e6ee','#7d3c62'] };   // [바탕, 글자] — 담당 일정 표 이미지(BK_COLOR)와 같은 색
const bkCatTag = c => `<span class="tag" style="background:${BK_ALL_COLOR[c][0]};color:${BK_ALL_COLOR[c][1]}">${BK_ALL_NAME[c]}</span>`;   // 상자 제목
function paintBookAll(F){
  const today=todayYmd(), past=$('#bookPast').checked, keys=Object.keys(BK_ALL_NAME);
  document.querySelectorAll('#bookTabs [data-bt]').forEach(b=>b.classList.remove('on'));   // 어느 한 목록이 아님
  $('#bookMb').hidden=true; $('#bookGen').hidden=true; $('#bookAll').hidden=false; if($('#bookMineL')) $('#bookMineL').hidden=false;
  bkFillNames();
  const me=bkMe(), mine=$('#bookMine').checked && !!me;
  const rows=[...mbAllRows().map(x=>({k:'mb', src:x.auto?'g':'m', d:x.d, t:String(x.t||''), staff:x.staff||'', hay:{org:x.n, staff:x.staff, what:x.m, note:x.note, rest:[x.t, '몽몽마방']}, x})),
    ...[...bookRows(true), ...manualRows()].filter(x=>BOOK_CATS[x.cat]).map(x=>({k:x.cat, src:x.manual?'m':'g', d:x.d, t:x.tm||'99', staff:x.staff||'', hay:{org:x.org, staff:x.staff, what:[x.item,x.kind,x.place], note:x.note, rest:[x.tm, BOOK_CATS[x.cat]]}, x}))];
  const list=rows.filter(v=>(past || F.dated || v.d>=today) && (!mine || isMine(v, me)) && (!F.src || v.src===F.src) && bkFindOk(F, v.d, bkHay(F, v.hay)))
    .sort((a,b)=>(a.d+a.t).localeCompare(b.d+b.t) || keys.indexOf(a.k)-keys.indexOf(b.k));
  bkFindPaint(list.length, keys.map(k=>{ const n=list.filter(v=>v.k===k).length; return n ? `${BK_ALL_NAME[k]} ${n}` : ''; }).filter(Boolean).join(' · '));
  $('#bookTitle').textContent='모든 예약 목록에서 찾기'; { const bs=$('#bookSum'); if(bs){ bs.textContent=''; bs.hidden=true; } }
  $('#bookAll').innerHTML = keys.map(k=>{ const part=list.filter(v=>v.k===k); if(!part.length) return '';
    return `<section class="bk-all-box"><h3>${bkCatTag(k)}<small>${part.length}건</small></h3><div class="tw"><table class="mbdb-t"><thead>${bkHeadHTML(k)}</thead><tbody id="bkAllB-${k}">${part.map(v=>k==='mb' ? mbRow(v.x, today, '') : bkGenRow(v.x, today, '')).join('')}</tbody></table></div></section>`; }).join('')
    || `<div class="bk-all-none">몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 어디에도 찾는 조건에 맞는 ${past || F.dated ? '' : '앞으로 있을 '}예약이 없습니다.${mine?` (담당 「${esc(me)}」만 보는 중)`:''}</div>`;
  keys.forEach(k=>{ if(document.getElementById('bkAllB-'+k)) labelCells('#bkAllB-'+k, BK_COLS(k)); });   // 휴대폰: 칸마다 이름
}
// 모든 목록에서 찾은 표에서 「수정」을 누르면 그 줄의 목록으로 맞춘 뒤 고치는 창을 엶 (창의 칸이 목록마다 다름) · 몽몽마방 줄의 × 도 여기서
document.addEventListener('click', e=>{ const t=e.target; if(!t || !t.dataset || !t.closest || !t.closest('#bookAll')) return;
  if(t.dataset.bcat && (t.dataset.bcat==='mb' || BOOK_CATS[t.dataset.bcat])) bookCatNow=t.dataset.bcat;
  if(t.dataset.mbdel!=null && mbDb().rows[+t.dataset.mbdel]){ if(BOOK_GUEST){ toast('로그인한 사람만 뺄 수 있습니다.'); return; } openBkDel({db:'mb', i:+t.dataset.mbdel}); }
}, true);
// 예약 목록 표의 칸마다 머리글 이름(data-l) → 휴대폰에서는 줄마다 카드로, 칸 이름을 앞에 (css/group.css 「예약 현황 공유 휴대폰」)
function labelCells(sel, heads){ document.querySelectorAll(sel+' tr').forEach(tr=>{ [...tr.children].forEach((td,i)=>{ if(td.colSpan>1) return; const h=heads[i]||''; if(h) td.dataset.l=h; else td.removeAttribute('data-l'); }); }); }
// 직접 추가 · 수정 칸 (탭마다 칸이 다름) — 2026-11-21: 목록 아래가 아니라 「＋ 직접 추가」 · 「수정」을 누르면 팝업(#bookAddModal)으로
const bookAddClosed = () => !$('#bookAddModal') || $('#bookAddModal').hidden;
// 2026-11-28: 「＋ 직접 추가」 단추를 되살림 (로그인한 사람만) · 창 오른쪽 위 × · 꼭 넣는 칸에 * · 고칠 때는 창 안에서 「이 예약 빼기」 · 적던 것이 있으면 Esc 한 번으로는 닫히지 않음
// ===== 추가한 사람 이름 · 연락처 (2026-11-28 · 운영팀 요청): 직접 추가할 때 꼭 넣고, 그 줄을 눌러 뜨는 고치는 창에서만 보임 (목록에는 안 나옴) =====
//  예약 줄(bookdb · mabangdb 의 rows)에 넣지 않고 따로 한 줄에 둠: id bookwho · 통화 구분 '예약현황추가자' · 수정 기록 칸 {who:{줄 열쇠:{n:이름, t:연락처, at}}}
//  — bookdb · mabangdb 는 로그인 없이 보는 목록(서버 bookList)이 통째로 내보내므로 거기에 연락처를 넣으면 로그인 없는 사람에게도 나감. 이 줄은 로그인한 사람의 목록(list)에만 옴
//  줄 열쇠: 대관 · 도슨트 · 프로그램 · 음료쿠폰 = 줄의 id / 몽몽마방 = 줄의 at(넣은 일시), 없으면(예전 줄) 고칠 때 붙이는 wk
var BKWHO_ID='bookwho', BKWHO_TYPE='예약현황추가자';
function bkWhoAll(){ const r=(cache||[]).find(x=>x.id===BKWHO_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return j.who && typeof j.who==='object' ? j.who : {}; }
const bkWho = key => (key && bkWhoAll()[key]) || {};
const bkWhoKey = () => !bookEdit ? '' : bookEdit.mb!=null ? ((r=>r ? (r.at||r.wk||'') : '')(mbDb().rows[bookEdit.mb])) : (bookEdit.id||'');
const bkWhoLast = name => { if(!name) return ''; const L=Object.values(bkWhoAll()).filter(w=>w && w.n===name && w.t).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))); return L.length ? L[0].t : ''; };   // 같은 이름으로 마지막에 넣은 연락처 (다시 치지 않게)
async function bkWhoSave(key, n, t){
  if(BOOK_GUEST || !key) return; const cur=bkWho(key); if((cur.n||'')===n && (cur.t||'')===t) return;
  const old=cache.find(x=>x.id===BKWHO_ID), now=new Date().toISOString(), who={...bkWhoAll(), [key]:{n, t, at:now}};
  const item={...(old||{}), id:BKWHO_ID, callType:BKWHO_TYPE, saved:(old&&old.saved)||now, takenBy:savedOwner()||'', summary:`예약 현황 추가한 사람 ${Object.keys(who).length}건`, history:JSON.stringify({who, at:now})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===BKWHO_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
}
let bookAddSnap='', bookAddEscAt=0;
const bookAddVals = () => [...document.querySelectorAll('#bookAdd input:not(.dtxt), #bookAdd select, #bookAdd textarea')].map(el=>el.id==='baWhoTel' && SY.telBlank && SY.telBlank(el.value) ? '' : el.value).join('\u0001');   // 저절로 들어간 010- 만 있는 것은 「적은 것」으로 치지 않음
const bookAddDirty = () => !bookAddClosed() && bookAddVals()!==bookAddSnap;
function bookAddOpen(){ if(BOOK_GUEST){ toast('로그인한 사람만 직접 추가할 수 있습니다.'); return; }
  paintBookAdd(); $('#bookAddModal').hidden=false; bookAddSnap=bookAddVals(); bookAddEscAt=0; setTimeout(()=>($('#baOrg')||$('#bookAdd input'))?.focus(), 0); }   // 초점은 첫 입력 칸에 (× 에 주지 않음)
function bookAddClose(){ $('#bookAddModal').hidden=true; bookEdit=null; bookImp=null; bookAddEscAt=0; paintBookAdd(); }
const PLACE_OPTS=['몽몽차방','당두봉갈'], KIND_OPTS=['동행','PPT'], COUPON_OPTS=['음료쿠폰(가가빈빈)','음료쿠폰(몽몽차방)'];
function paintBookAdd(){
  const c=bookCatNow, box=$('#bookAdd'); if(!box) return;
  if(BOOK_GUEST) bookEdit=null;   // 로그인 없이는 추가만 (고치기 · 빼기는 로그인한 사람, 2026-11-21)
  let x = {};
  if(bookEdit && bookEdit.mb!=null){ const r=mbDb().rows[bookEdit.mb]; if(r) x={d:r.d, tm:r.t, org:r.n, ppl:r.p, item:r.m}; }
  else if(bookEdit && bookEdit.id) x = bkDb().rows.find(r=>r.id===bookEdit.id) || {};
  const inp=(id,ph,v,cls='')=>`<input id="${id}" class="${cls}" placeholder="${ph}"${id==='baTm'?' data-tp="range" readonly':''} value="${esc(v==null?'':v)}" autocomplete="off"${/Org|Staff|Note|Item/.test(id)?' data-ime="ko"':''}>`;
  const sel=(id,opts,v)=>`<select id="${id}">${opts.map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('')}${v && !opts.includes(v)?`<option selected>${esc(v)}</option>`:''}</select>`;
  const req='<i class="ba-req" title="꼭 넣는 칸">*</i>';
  const f = c==='mb'
    ? [`<label>시간 ${inp('baTm','',x.tm,'t')}</label>`, `<label><span>예약자${req}</span> ${inp('baOrg','',x.org)}</label>`, `<label><span>인원${req}</span> ${inp('baPpl','명',x.ppl,'n')}</label>`, `<label>메뉴 ${sel('baItem', mbMenus().map(m=>m.name), x.item||'')}</label>`]
    : [`<label><span>업체${req}</span> ${inp('baOrg','',x.org)}</label>`, `<label>${c==='coupon'?'매수':'인원'} ${inp('baPpl',c==='coupon'?'장':'명',x.ppl,'n')}</label>`, `<label>시간 ${inp('baTm','',x.tm,'t')}</label>`,
       c==='rent' ? `<label>장소 ${sel('baPlace', PLACE_OPTS, x.place||'')}</label>` : c==='docent' ? `<label>종류 ${sel('baKind', KIND_OPTS, x.kind||'')}</label>` : c==='coupon' ? `<label>쿠폰 종류 ${sel('baItem', COUPON_OPTS, x.item||'')}</label>` : `<label>프로그램 항목 ${inp('baItem','',x.item)}</label>`,
       `<label>담당자 이름 ${inp('baStaff','',x.staff)}</label>`, `<label class="wide">비고사항 ${inp('baNote','',x.note)}</label>`];
  box.innerHTML = `<div class="ba-h"><b>${c==='mb'?'몽몽마방':BOOK_CATS[c]} ${bookEdit?'예약 고치기':'예약 직접 추가'}</b> <span class="hint" style="margin:0">예약 한 건 · <i class="ba-req">*</i> 표시는 꼭 넣는 칸입니다</span></div>`
    + (BOOK_GUEST ? `<div class="ba-row ba-who"><label class="wide">추가하는 사람 이름 <input id="baBy" data-ime="ko" placeholder="이름" autocomplete="off" value="${esc((()=>{ try{ return localStorage.getItem('sy_guest_name')||''; }catch(_){ return ''; } })())}"></label><span class="hint">로그인 없이 추가합니다 · 고치기 · 빼기는 로그인한 사람이</span></div>` : '')   // 로그인 없이: 이름을 적고 추가 (2026-11-21)
    + `<div class="ba-row"><label><span>날짜${req}</span> ${dboxHTML('id="baDate"', x.d||rec.date||'')}</label>${f.join('')}</div>`
    + (BOOK_GUEST ? '' : (()=>{ const w=bookEdit ? bkWho(bkWhoKey()) : {n:savedOwner()||'', t:bkWhoLast(savedOwner()||'')}, r=bookEdit?'':req;   // 새로 넣을 때는 꼭 · 예전 줄을 고칠 때는 비어 있어도 저장
        return `<div class="ba-row ba-by"><label><span>추가한 사람 이름${r}</span> <input id="baWho" data-ime="ko" placeholder="이름" autocomplete="off" value="${esc(w.n||'')}"></label><label><span>추가한 사람 연락처${r}</span> <input id="baWhoTel" type="tel" inputmode="tel" data-tel placeholder="010-0000-0000" autocomplete="off" value="${esc(w.t||'')}"></label><span class="hint">이 예약을 넣은 사람 · 목록에는 보이지 않고 이 창에서만 보입니다</span></div>`; })())
    + `<div class="ba-btns">${bookEdit && !BOOK_GUEST ? '<button type="button" class="btn ba-del" id="baDel" title="이 예약을 목록에서 뺍니다 (사유를 적는 창이 뜹니다 · 기록에 남음)">이 예약 빼기</button>' : ''}<button type="button" class="btn" id="baCancel">취소</button><button type="button" class="btn primary" id="baSave">${bookEdit?'고치기':'추가'}</button></div>`
}
async function bookAddSave(){
  const c=bookCatNow, v=id=>(($('#'+id)||{}).value||'').trim(), d=v('baDate'), org=v('baOrg'), ppl=parseInt(v('baPpl'))||0;
  if(!d){ toast('날짜를 고르세요.'); return false; } if(!org){ toast(c==='mb'?'예약자를 적어 주세요.':'업체를 적어 주세요.'); $('#baOrg').focus(); return false; }
  const tm=(()=>{ const s=v('baTm'); const f=typeof fmtRange==='function' ? fmtRange(s) : ''; return f || s; })();
  if(BOOK_GUEST){   // 로그인 없이 추가 (2026-11-21): 적은 이름으로 서버에 한 건 (bookAdd) → 목록 다시 받음
    const by=v('baBy'); if(!by){ toast('추가하는 사람 이름을 적어 주세요.'); $('#baBy')?.focus(); return false; }
    if(c==='mb' && !ppl){ toast('인원을 적어 주세요.'); $('#baPpl').focus(); return false; }
    try{ localStorage.setItem('sy_guest_name', by); }catch(_){}
    const row = c==='mb' ? {d, t:tm, n:org, p:String(ppl), m:v('baItem')} : {cat:c, d, org, ppl:String(ppl), tm, place:c==='rent'?v('baPlace'):'', kind:c==='docent'?v('baKind'):'', item:(c==='prog'||c==='coupon')?v('baItem'):'', staff:v('baStaff'), note:v('baNote')};
    try{ const j=await SY.callRaw({action:'bookAdd', db: c==='mb'?MBDB_ID:BKDB_ID, row, by});
      if(!j.ok){ toast('추가하지 못했습니다: '+j.error, 4000); return false; } }
    catch(e){ toast('추가하지 못했습니다 (인터넷 연결). 잠시 뒤 다시 눌러 주세요.'); return false; }
    await bookPull(); toast(`${c==='mb'?'몽몽마방':BOOK_CATS[c]} 예약을 추가했습니다 (${by}).`); return true; }
  // 추가한 사람 이름 · 연락처 (2026-11-28): 새로 넣을 때는 둘 다 꼭 · 연락처는 010-0000-0000 모양으로 맞춤
  const who=v('baWho'), whoTel=(()=>{ let s=v('baWhoTel'); if(SY.telBlank && SY.telBlank(s)) s=''; return (s && typeof fmtPhone==='function' && fmtPhone(s)) || s; })();
  if(c==='mb' && !ppl){ toast('인원을 적어 주세요.'); $('#baPpl').focus(); return false; }
  if($('#baWho')){ if(!bookEdit && !who){ toast('추가한 사람 이름을 적어 주세요.'); $('#baWho').focus(); return false; }
    if(!bookEdit && !whoTel){ toast('추가한 사람 연락처를 적어 주세요.'); $('#baWhoTel').focus(); return false; }
    if(whoTel && whoTel.replace(/0\d{1,2}-\d{3,4}-\d{4}/, '')!==''){ toast('연락처를 010-0000-0000 처럼 넣어 주세요.'); $('#baWhoTel').focus(); return false; } }
  if(c==='mb'){
    const row={d, t:tm, n:org, p:ppl, m:v('baItem')}, rows=[...mbDb().rows];
    const was = bookEdit && bookEdit.mb!=null ? rows[bookEdit.mb] : null;
    if(was){ row.by=was.by; if(was.guest) row.guest=was.guest; if(was.at) row.at=was.at; if(was.wk) row.wk=was.wk; if(!row.at && !row.wk && (who || whoTel)) row.wk='w'+Date.now().toString(36); rows[bookEdit.mb]=row; } else { row.by=savedOwner()||''; row.at=new Date().toISOString(); rows.push(row); }   // at = 넣은 일시 (2026-11-28 · 첫 화면 공통 업무 「예약 현황 직접 추가」 알림이 이것으로 줄을 가림 · js/portal.js commonExtra)
    const ed=!!was; bookEdit=null; await mbDbSave(rows, ed?'몽몽마방 예약을 고쳤습니다.':'몽몽마방 예약을 추가했습니다.');
    if($('#baWho')) await bkWhoSave(row.at||row.wk, who, whoTel);
    await bkLogAdd([ed ? {act:'수정', db:'mb', cat:'mb', row:bkSnap('mb', row), chg:bkChg(bkSnap('mb', was), bkSnap('mb', row))} : {act:'추가', db:'mb', cat:'mb', row:bkSnap('mb', row)}]); return true; }
  const row={ id: (bookEdit&&bookEdit.id) || 'b'+Date.now().toString(36), cat:c, d, org, ppl, tm, place:c==='rent'?v('baPlace'):'', kind:c==='docent'?v('baKind'):'', item:(c==='prog'||c==='coupon')?v('baItem'):'', staff:v('baStaff'), note:v('baNote'), by:savedOwner()||'' };
  const was = bookEdit && bookEdit.id ? bkDb().rows.find(r=>r.id===row.id) : null;
  if(was){ row.by=was.by||row.by; if(was.guest) row.guest=was.guest; if(was.at) row.at=was.at; } else row.at=new Date().toISOString();   // 처음 넣은 사람 · 넣은 일시(at)는 그대로
  const rows=bkDb().rows.filter(r=>r.id!==row.id); rows.push(row);
  const ed=!!was; bookEdit=null; await bkDbSave(rows, ed?'예약을 고쳤습니다.':`${BOOK_CATS[c]} 예약을 추가했습니다.`);
  if($('#baWho')) await bkWhoSave(row.id, who, whoTel);
  await bkLogAdd([ed ? {act:'수정', db:'bk', cat:c, row:bkSnap('bk', row), chg:bkChg(bkSnap('bk', was), bkSnap('bk', row))} : {act:'추가', db:'bk', cat:c, row:bkSnap('bk', row)}]); return true;
}
let bookImp=null;   // (2026-11-28) 「엑셀 표를 한 번에 넣기」 는 운영팀 요청으로 없앰 (창의 접힌 칸 · 읽는 코드 모두) — 이름만 남김 (창을 열고 닫는 곳이 비움)
document.addEventListener('click', async e=>{ const t=e.target;
  if(t.id==='bookAddBtn' || t.id==='bookAddBtn2'){   /* 2026-11-28: 「＋ 직접 추가」 되살림 (창으로 · 로그인한 사람만 — bookAddOpen 이 막음) · 검색 중(모든 목록)에는 고른 목록이 없으므로 마지막으로 본 목록에 */ bookEdit=null; bookAddOpen(); return; }
  if(t.id==='baX'){ bookAddClose(); return; }
  if(t.id==='baDel' && bookEdit){ const p = bookEdit.mb!=null ? {db:'mb', i:bookEdit.mb} : {db:'bk', id:bookEdit.id}; bookAddClose(); openBkDel(p); return; }   // 창 안의 「이 예약 빼기」 → 사유를 적는 창
  if(t.id==='baSave'){ t.disabled=true; const ok=await bookAddSave(); if(!ok){ t.disabled=false; return; } bookAddClose(); return; }
  if(t.id==='baCancel'){ bookAddClose(); return; }
  if(t.dataset.bkedit){ bookEdit={id:t.dataset.bkedit}; bookAddOpen(); return; }
  if(t.dataset.bkdel){ if(BOOK_GUEST){ toast('로그인한 사람만 뺄 수 있습니다.'); return; } openBkDel({db:'bk', id:t.dataset.bkdel}); return; }   // 사유를 적는 창 (2026-11-21)
  if(t.id==='bkDelYes'){ doBkDel(); return; }
  if(t.id==='bkDelNo'){ closeBkDel(); return; }
  if(t.id==='bookLogBtn'){ openBkLog(); return; }
  if(t.id==='bkLogClose'){ $('#bkLogModal').hidden=true; return; }
  if(t.id==='bkLogAll'){ paintBkLog(); return; }
  if(t.dataset.mbedit!=null){ bookEdit={mb:+t.dataset.mbedit}; bookAddOpen(); return; }
  // 직접 추가한 줄을 누르면 고치는 창 (2026-11-28 · 「수정」 단추 대신 · 로그인한 사람만 · 줄 끝 × 는 빼기) — 모든 목록에서 찾은 표에서는 그 줄의 목록으로 맞춤
  { const tr = t.closest && !t.closest('button') && t.closest('tr[data-bkrow], tr[data-mbrow]');
    if(tr && !BOOK_GUEST && bookAddClosed()){ const c=tr.dataset.bcat; if(c==='mb' || BOOK_CATS[c]) bookCatNow=c;
      bookEdit = tr.dataset.mbrow!=null ? {mb:+tr.dataset.mbrow} : {id:tr.dataset.bkrow}; bookAddOpen(); return; } }
});
// 직접 추가 팝업: Esc = 닫기 (뒤의 예약 목록 창보다 먼저)
//  적던 것이 있으면 한 번으로는 닫지 않음 (실수로 사라지지 않게 · 3초 안에 한 번 더 누르면 닫힘 · 2026-11-28)
document.addEventListener('keydown', e=>{ if(e.key!=='Escape' || bookAddClosed()) return; e.preventDefault(); e.stopImmediatePropagation();
  if(bookAddDirty() && Date.now()-bookAddEscAt>3000){ bookAddEscAt=Date.now(); toast('적던 내용이 있습니다. 닫으려면 Esc 를 한 번 더 누르세요.', 3000); return; }
  bookAddClose(); }, true);
// ===== 예약 현황 공유 (첫 화면 3열 → group.html?book=mb|rent|docent|prog|coupon): 예약 목록 창만 한 페이지로 =====
// 로그인하지 않은 사람(book-guest)은 보기만 (직접 추가 · 수정 · 빼기 · 줄 눌러 예약 열기 없음). 로그인한 사람은 단체 화면의 예약 목록 창과 똑같이
var BOOK_ONLY = (()=>{ const q=new URLSearchParams(location.search).get('book'); return q==null ? '' : (q==='mb' || BOOK_CATS[q]) ? q : 'mb'; })();
var BOOK_GUEST = !!BOOK_ONLY && document.documentElement.classList.contains('book-guest');
if(BOOK_ONLY){ $('#crumb').textContent='예약 현황 공유'; setTimeout(()=>openBook(BOOK_ONLY), 50); }
function bookPageSync(){ if(!BOOK_ONLY) return; const t=bookCatNow==='mb'?'몽몽마방':BOOK_CATS[bookCatNow]; document.title=`${t} · 예약 현황 공유 · 사유원 운영 보조 시스템`; $('#crumb').textContent=`예약 현황 공유 › ${t}`; history.replaceState(null,'','group.html?book='+bookCatNow); }
const bookShut = () => { if(!BOOK_ONLY) $('#bookModal').hidden=true; };   // 공유 페이지는 닫지 않음 (메뉴로는 헤더)
// ===== 담당 일정 (2026-11-21 · 2026-11-23 고침): 「이름」 = 담당 칸에 있는 이름 중에서 고름(직접 치지 않음 · 이 브라우저에 기억)
//  담당 칸(대관 · 도슨트 · 프로그램 · 음료쿠폰)에 여러 이름이 있으면(쉼표 · 줄바꿈 · / · 띄어쓰기) 한 사람씩 나눔
//  출력하기 = 그 사람 일정을 표 이미지로 (일자 · 업체 · 인원 · 시간 · 종류, 휴대폰 세로 폭) · 모든 담당 출력 = 담당마다 한 장씩
var BKME_LS='sy_book_me', BKRANGE_LS='sy_book_range';
const staffNames = s => [...new Set(String(s||'').split(/[\n,\/·&+、;]+|\s+/).map(v=>v.replace(/[()[\]]/g,'').replace(/(선생님|님|담당)$/,'').trim()).filter(v=>v.length>=2 && !/^\d+$/.test(v)))];
function bkMe(){ const el=document.getElementById('bookMeName'); return el ? el.value.trim() : ''; }
const isMine = (x, me) => { if(!me) return false; if(staffNames(x.staff).includes(me)) return true; const n=normSrc(me); return !!n && normSrc(x.staff).includes(n); };
const bkRangeDays = () => { const el=document.getElementById('bookRange'); return Math.max(7, parseInt(el && el.value)||7); };
function bkDays(){ const t0=new Date(); t0.setHours(0,0,0,0); return [...Array(bkRangeDays()+1)].map((_,i)=>{ const d=new Date(t0); d.setDate(d.getDate()+i); return ymd(d); }); }   // 오늘 + n일
// 담당 이름 목록: 오늘 이후 대관 · 도슨트 · 프로그램 · 음료쿠폰의 담당 칸에 있는 이름 (가나다순)
function bkStaffList(){ const today=todayYmd(), set=new Set(); [...bookRows(true), ...manualRows()].filter(x=>x.d>=today && BOOK_CATS[x.cat]).forEach(x=>staffNames(x.staff).forEach(n=>set.add(n))); return [...set].sort((a,b)=>a.localeCompare(b,'ko')); }
function bkFillNames(){ try{ bkFillNames0(); }catch(e){ console.warn('담당 이름 목록', e); } }
function bkFillNames0(){ const el=document.getElementById('bookMeName'); if(!el || el.tagName!=='SELECT') return;
  const names=bkStaffList(); let cur=el.value || el.dataset.saved || '';
  if(!cur){ try{ cur=(JSON.parse(localStorage.getItem('sy_user')||'null')||{}).name || localStorage.getItem('sy_guest_name') || ''; }catch(_){} if(!names.includes(cur)) cur=''; }   // 처음: 로그인 이름이 담당 목록에 있으면 그 이름
  const list=cur && !names.includes(cur) ? [cur, ...names] : names, sig=list.join('|')+'#'+cur;   // 고른 이름이 목록에서 없어져도 그대로 둠
  if(el.dataset.sig===sig) return; el.dataset.sig=sig;
  el.innerHTML = `<option value="">담당자 고르기</option>` + list.map(n=>`<option${n===cur?' selected':''}>${esc(n)}</option>`).join(''); el.value=cur; }
(function(){ const el=document.getElementById('bookMeName'); if(!el) return;
  try{ el.dataset.saved=localStorage.getItem(BKME_LS)||''; const rg=document.getElementById('bookRange'); if(rg){ const v=localStorage.getItem(BKRANGE_LS); if(v) rg.value=v; rg.addEventListener('change', ()=>{ try{ localStorage.setItem(BKRANGE_LS, rg.value); }catch(_){} }); } }catch(_){}
  // 이름 목록은 예약 목록을 그릴 때 채움 (paintBook · 여기서 부르면 아직 준비 안 된 함수가 있음)
  el.addEventListener('change', ()=>{ try{ localStorage.setItem(BKME_LS, el.value); }catch(_){} el.dataset.saved=el.value; if($('#bookMine').checked) paintBook(); });
  $('#bookMine').addEventListener('change', ()=>{ if($('#bookMine').checked && !bkMe()){ $('#bookMine').checked=false; toast('이름을 먼저 골라 주세요.'); el.focus(); return; } paintBook(); });
  $('#bookPrint').addEventListener('click', ()=>bookPrintImg());
  $('#bookPrintAll').addEventListener('click', ()=>bookPrintAll());
})();
const BK_COLOR = { rent:['#e7efe2','#4f6b3f'], docent:['#e4ecf5','#3d5a80'], prog:['#f6ecdc','#8a5a1c'], coupon:['#f3e6ee','#7d3c62'] };   // [바탕, 글자 · 테두리]
function bkTm(x){ const m=String(x.tm||'').match(/(\d{1,2})\s*:\s*(\d{2})(?:\s*[~\-–]\s*(\d{1,2})\s*:\s*(\d{2}))?/); if(!m) return null;
  const a=+m[1]*60+(+m[2]); let b = m[3]!=null ? +m[3]*60+(+m[4]) : a+(x.hrs?x.hrs*60:60); if(b<=a) b=a+60; return [a,b]; }
function bkTitle(x){ return x.cat==='docent' ? `도슨트${x.kind?' · '+x.kind:''}` : x.cat==='rent' ? `대관${x.place?' · '+x.place:''}` : x.cat==='coupon' ? (x.item||'음료쿠폰') : (x.item||'프로그램'); }
const bkHM = m => `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;
// 표 한 줄에 들어갈 값: 시간(시작~끝) · 종류(구분 + 자세히) · 덧붙임(출발지)
function bkRowVals(x){ const se=bkTm(x), hasEnd=/[~\-–]/.test(x.tm||'') || x.hrs;
  const time = se ? (hasEnd ? `${bkHM(se[0])}~${bkHM(se[1])}` : bkHM(se[0])) : (x.tm||'미정');
  const det = x.cat==='docent' ? [x.kind, x.hrs?`${x.hrs}시간`:''].filter(Boolean).join(' · ') : x.cat==='rent' ? [x.place, x.hrs?`${x.hrs}시간`:''].filter(Boolean).join(' · ') : x.cat==='coupon' ? (x.item||'') : [x.item, x.hrs?`${x.hrs}시간`:''].filter(Boolean).join(' · ');
  const crs=(String(x.note||'').match(/출발지\s*([^·]+)/)||[])[1];
  return { time, kind:BOOK_CATS[x.cat]||'', det, sub: crs ? `출발지 ${crs.trim()}` : '' }; }
const bkSortKey = x => x.d + String((bkTm(x)||[9999])[0]).padStart(4,'0');
// 한 사람 일정 → 표 이미지 (휴대폰 세로 폭 1080px). 돌려주는 값: {blob, name, n}
async function bkTableImg(me, days){
  const evs=[...bookRows(true), ...manualRows()].filter(x=>BOOK_CATS[x.cat] && days.includes(x.d) && isMine(x, me)).sort((a,b)=>bkSortKey(a).localeCompare(bkSortKey(b)));
  const W=1080, PAD=48, FONT=getComputedStyle(document.body).fontFamily || 'sans-serif', f=(px,b)=>`${b?'700 ':''}${px}px ${FONT}`;
  const COLS=[['구분',124,'c'],['일자',136,'c'],['업체',0,'l'],['인원',90,'c'],['시간',184,'c'],['종류',210,'c']], TW=W-PAD*2; COLS[2][1]=TW-COLS.reduce((s,c)=>s+c[1],0);   // 「구분」 열 (2026-11-28 · 일자 앞 · 단체예약 / 직접 추가)
  const probe=document.createElement('canvas').getContext('2d');
  const wrap=(text,w,px,b,max)=>{ probe.font=f(px,b); const out=[]; let line=''; for(const ch of String(text||'')){ if(probe.measureText(line+ch).width>w && line){ out.push(line); line=ch; } else line+=ch; } if(line) out.push(line);
    if(out.length>max){ const k=out.slice(0,max); let l=k[max-1]; while(l && probe.measureText(l+'…').width>w) l=l.slice(0,-1); k[max-1]=l+'…'; return k; } return out; };
  const rows=evs.map(x=>{ const v=bkRowVals(x), dt=new Date(x.d+'T00:00'), w1=COLS[2][1]-36, w4=COLS[5][1]-24;
    const org=wrap(x.org, w1, 30, 1, 3), sub=v.sub ? wrap(v.sub, w1, 24, 0, 1) : [], det=v.det ? wrap(v.det, w4, 24, 0, 2) : [];
    const h=Math.max(96, 30+org.length*40+sub.length*32, 30+38+det.length*32);
    return {x, v, org, sub, det, h, dl:`${dt.getMonth()+1}/${dt.getDate()}(${DOW[dt.getDay()]})`, red:isRedDay(x.d)}; });
  const HEAD=200, TH=84, FOOT=90, body=rows.reduce((s,r)=>s+r.h,0) || 130;
  const H=HEAD+TH+body+FOOT, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const ctx=cv.getContext('2d'); ctx.textBaseline='top';
  ctx.fillStyle='#f5f3ee'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#2b2a26'; ctx.font=f(52,1); ctx.fillText(`${me} 님 일정`, PAD, 50);
  const d0=new Date(days[0]+'T00:00'), d1=new Date(days[days.length-1]+'T00:00');
  ctx.fillStyle='#7a766b'; ctx.font=f(28); ctx.fillText(`사유원 · ${d0.getMonth()+1}/${d0.getDate()}(${DOW[d0.getDay()]}) ~ ${d1.getMonth()+1}/${d1.getDate()}(${DOW[d1.getDay()]}) · ${evs.length}건`, PAD, 124);
  // 표 (둥근 모서리)
  const tx=PAD, ty=HEAD, th=TH+body, R=18;
  ctx.save(); ctx.beginPath(); ctx.moveTo(tx+R,ty); ctx.arcTo(tx+TW,ty,tx+TW,ty+th,R); ctx.arcTo(tx+TW,ty+th,tx,ty+th,R); ctx.arcTo(tx,ty+th,tx,ty,R); ctx.arcTo(tx,ty,tx+TW,ty,R); ctx.closePath(); ctx.clip();
  ctx.fillStyle='#fff'; ctx.fillRect(tx,ty,TW,th);
  ctx.fillStyle='#3f5440'; ctx.fillRect(tx,ty,TW,TH);
  { let cx=tx; ctx.font=f(28,1); ctx.fillStyle='#fff'; COLS.forEach(([n,w,al])=>{ ctx.textAlign=al==='c'?'center':'left'; ctx.fillText(n, al==='c'?cx+w/2:cx+18, ty+26); cx+=w; }); ctx.textAlign='left'; }
  let y=ty+TH;
  rows.forEach((r,i)=>{ ctx.fillStyle= i%2 ? '#faf8f3' : '#fff'; ctx.fillRect(tx,y,TW,r.h); if(i){ ctx.fillStyle='#ebe7dd'; ctx.fillRect(tx,y,TW,2); }
    let cx=tx; const mid=y+r.h/2;
    { const m=!!r.x.manual, lb=BK_SRC[m?'m':'g']; ctx.textAlign='center'; ctx.font=f(21,1); const kw=ctx.measureText(lb).width+22; ctx.fillStyle=m?'#f6ecdc':'#e7efe2'; ctx.fillRect(cx+COLS[0][1]/2-kw/2, mid-16, kw, 32); ctx.fillStyle=m?'#8a5a1c':'#4f6b3f'; ctx.fillText(lb, cx+COLS[0][1]/2, mid-11); cx+=COLS[0][1]; }   // 구분 (색 이름표)
    ctx.textAlign='center'; ctx.font=f(28); ctx.fillStyle=r.red?'#b3412e':'#2b2a26'; ctx.fillText(r.dl, cx+COLS[1][1]/2, mid-16); cx+=COLS[1][1];   // 일자
    ctx.textAlign='left'; { const bh=r.org.length*40+r.sub.length*32; let yy=mid-bh/2;   // 업체 (+ 출발지)
      ctx.font=f(30,1); ctx.fillStyle='#2b2a26'; r.org.forEach(s=>{ ctx.fillText(s, cx+18, yy+2); yy+=40; });
      ctx.font=f(24); ctx.fillStyle='#7a766b'; r.sub.forEach(s=>{ ctx.fillText(s, cx+18, yy+2); yy+=32; }); } cx+=COLS[2][1];
    ctx.textAlign='center'; ctx.font=f(28); ctx.fillStyle='#2b2a26'; ctx.fillText(r.x.ppl?`${r.x.ppl}${r.x.cat==='coupon'?'장':'명'}`:'-', cx+COLS[3][1]/2, mid-16); cx+=COLS[3][1];   // 인원
    ctx.fillStyle=r.v.time==='미정'?'#b3412e':'#2b2a26'; ctx.fillText(r.v.time, cx+COLS[4][1]/2, mid-16); cx+=COLS[4][1];   // 시간
    { const [bg,fg]=BK_COLOR[r.x.cat]||BK_COLOR.prog, kh=30+(r.det.length?8+r.det.length*32:0); let ky=mid-kh/2;   // 종류: 구분 (색 이름표) + 자세히
      ctx.font=f(22,1); const kw=ctx.measureText(r.v.kind).width+26; ctx.fillStyle=bg; ctx.fillRect(cx+COLS[5][1]/2-kw/2, ky, kw, 30); ctx.fillStyle=fg; ctx.fillText(r.v.kind, cx+COLS[5][1]/2, ky+4); ky+=38;
      ctx.font=f(24); ctx.fillStyle='#4a4740'; r.det.forEach(s=>{ ctx.fillText(s, cx+COLS[5][1]/2, ky); ky+=32; }); }
    ctx.textAlign='left'; y+=r.h; });
  if(!rows.length){ ctx.textAlign='center'; ctx.font=f(28); ctx.fillStyle='#7a766b'; ctx.fillText('이 기간에 담당 일정이 없습니다', tx+TW/2, y+48); ctx.textAlign='left'; }
  ctx.restore();
  ctx.fillStyle='#9a968b'; ctx.font=f(22); ctx.fillText(`사유원 예약 현황 · 담당 「${me}」 · ${dtLabel(new Date().toISOString())} 출력`, PAD, H-FOOT+30);
  const blob=await new Promise(r=>cv.toBlob(r, 'image/png'));
  window.__bkPrintCanvas=cv;   // 마지막으로 만든 이미지 (확인용)
  return { blob, n:evs.length, name:`담당일정_${me}_${days[0].replace(/-/g,'')}-${days[days.length-1].slice(5).replace('-','')}.png` };
}
const bkDownload = (blob, name) => { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000); };
async function bkSave(files, title){   // 휴대폰은 이미지 보기 창(저장 · 길게 눌러 저장 · 공유), 컴퓨터는 파일로 내려받기 (여러 장이면 차례로)
  if(!files.length) return false;
  if(matchMedia('(pointer:coarse)').matches){ await bkShowImg(files[0], title); return true; }   // 2026-11-24: 바로 공유 창을 띄우면 「이미지 저장」이 없는 휴대폰이 있어서
  for(let i=0;i<files.length;i++){ bkDownload(files[i], files[i].name); if(i<files.length-1) await new Promise(r=>setTimeout(r, 450)); } return true; }
// 휴대폰: 만든 표 이미지를 화면 가득 보여 주고 「이미지 저장」(내려받기) · 「공유」 · 길게 눌러 저장 (2026-11-24)
const bkDataUrl = blob => new Promise((ok, no)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=no; r.readAsDataURL(blob); });
async function bkShowImg(file, title){
  let o=document.getElementById('bkImgView');
  if(!o){ o=document.createElement('div'); o.id='bkImgView'; o.className='bk-imgview';
    o.innerHTML='<div class="bkv-top"><b></b><button type="button" class="win-x in-row" data-bkv="x" title="닫기" aria-label="닫기">×</button></div><div class="bkv-img"><img alt="일정 표 이미지"></div>'
      + '<div class="bkv-btns"><a class="btn primary" data-bkv="save">이미지 저장</a><button type="button" class="btn" data-bkv="share">공유</button></div><p class="bkv-hint">저장이 안 되면 위 이미지를 길게 눌러 「이미지 저장」 · 「사진에 저장」을 고르세요.</p>';
    o.addEventListener('click', async e=>{ const a=e.target.closest('[data-bkv]'); if(!a) return;
      if(a.dataset.bkv==='x'){ o.hidden=true; return; }
      if(a.dataset.bkv==='share'){ const f=o._file; try{ if(navigator.canShare && navigator.canShare({files:[f]})) await navigator.share({files:[f], title:o._title}); else toast('이 휴대폰은 공유를 지원하지 않습니다. 「이미지 저장」을 눌러 주세요.'); }catch(_){} } });
    document.body.appendChild(o); }
  const url=await bkDataUrl(file);
  o._file=file; o._title=title; o.querySelector('.bkv-top b').textContent=title; o.querySelector('img').src=url;
  const a=o.querySelector('[data-bkv="save"]'); a.href=url; a.download=file.name;
  o.querySelector('[data-bkv="share"]').hidden=!(navigator.canShare && navigator.canShare({files:[file]}));
  o.hidden=false;
}
async function bookPrintImg(){
  const me=bkMe(); if(!me){ toast('이름을 먼저 골라 주세요.'); $('#bookMeName').focus(); return; }
  const r=await bkTableImg(me, bkDays()); if(!r.blob){ toast('이미지를 만들지 못했습니다.'); return; }
  if(await bkSave([new File([r.blob], r.name, {type:'image/png'})], `${me} 님 일정`)) toast(r.n ? `「${me}」 일정 ${r.n}건을 표로 저장했습니다.` : '이 기간에 담당 일정이 없습니다 (빈 표를 저장했습니다).', 3000);
}
// 모든 담당 출력 (관리자용): 이 기간에 일정이 있는 담당마다 한 장씩 → 그 사람에게 나눠 주기
async function bookPrintAll(){
  const days=bkDays(), rows=[...bookRows(true), ...manualRows()].filter(x=>BOOK_CATS[x.cat] && days.includes(x.d));
  const names=[...new Set(rows.flatMap(x=>staffNames(x.staff)))].sort((a,b)=>a.localeCompare(b,'ko'));
  if(!names.length){ toast('이 기간에 담당이 들어간 일정이 없습니다.'); return; }
  const btn=$('#bookPrintAll'), txt=btn.textContent; btn.disabled=true; btn.textContent='만드는 중…';
  try{ const files=[]; for(const n of names){ const r=await bkTableImg(n, days); if(r.blob && r.n) files.push(new File([r.blob], r.name, {type:'image/png'})); }
    if(await bkSave(files, '담당별 일정')) toast(`담당 ${files.length}명의 일정을 한 장씩 저장했습니다 (${names.join(' · ')}).`, 4200); }
  finally{ btn.disabled=false; btn.textContent=txt; }
}
function openBook(c){ bookCatNow=c; bookEdit=null; bookImp=null; $('#bookModal').hidden=false; paintBook(); bookPageSync(); }
document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('[data-book]'); if(b) openBook(b.dataset.book); const t=e.target.closest && e.target.closest('#bookTabs [data-bt]'); if(t){ bookCatNow=t.dataset.bt; bookEdit=null; { const q=$('#bfQ'); if(q) q.value=''; } paintBook(); bookPageSync(); } });   // 탭을 누르면 검색어(모든 목록에서 찾기)를 지우고 그 목록으로 (2026-11-27)
$('#bookClose').onclick=bookShut;
$('#bookPast').onchange=paintBook;
$('#bookModal').addEventListener('mousedown', e=>{ if(e.target.id==='bookModal') bookShut(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#bookModal').hidden && !BOOK_ONLY){ e.preventDefault(); $('#bookModal').hidden=true; } });
['#bookBody','#mbdbBody','#bookAll'].forEach(sel=>$(sel).addEventListener('click', e=>{ if(e.target.closest('button')) return; const tr=e.target.closest('tr[data-bopen]'); if(!tr || !tr.dataset.bopen) return; const r=cache.find(x=>x.id===tr.dataset.bopen); if(!r || BOOK_GUEST) return;
  if(BOOK_ONLY){ BOOK_ONLY=''; document.documentElement.classList.remove('book-only'); history.replaceState(null,'','group.html'); document.title='단체고객 응대 · 사유원 운영 보조 시스템'; $('#crumb').textContent='단체고객 응대'; }   // 공유 페이지 → 단체 화면으로 바뀌며 그 예약을 엶 (나의 할일 단독 화면과 같음)
  $('#bookModal').hidden=true; openRecordG(r); }));

// 몽몽마방 예약 목록 (직접 추가 · 수정 · 빼기)
function mbYear(m,d){ const t=new Date(); t.setHours(0,0,0,0); let y=t.getFullYear(); const c=new Date(y,m-1,d); if(c-t < -120*864e5) y++; else if(c-t > 245*864e5) y--; return y; }   // 연도가 없으면 오늘에 가까운 쪽
// 몽몽마방 예약 목록 = 직접 넣은 예약 + 단체 예약(예약접수)의 몽몽마방 식사 자동 (대관 · 도슨트 · 프로그램처럼, 지금 열어 둔 예약은 빼고) (2026-11-16)
// 몽몽마방 예약 현황에 들어갈 식사: 몽몽마방 줄(mabangL · 시간 · 메뉴) + 관람+식사 패키지 중 몽몽마방이 든 것(예: 「관람 + 몽몽마방 사유의 밥상」)
function mbMealsOf(x){ const out=[];
  if(x.mabangL || x.mabangTime || x.mabangMenu) out.push({t:x.mabangTime||'', p:numOf(x.mabangL)||'', m:x.mabangMenu||'', pay:x.mabangPay||''});
  viewsParse(x.views).forEach(v=>{ const pm=String(v.src).match(/\(관람,\s*(몽몽마방[^)]*)\)/); if(pm && v.qty) out.push({t:x.mabangTime||'', p:v.qty, m:pm[1].replace(/^몽몽마방\s*/,'')+' (관람 포함)', pay:''}); });
  return out; }
function mbAutoRows(){ try{
  const others = (cache||[]).filter(r=>isGroupRec(r) && r.id!==editingId && r.date && isBooked(stageOfRec(r))).map(r=>({r, x:xOf(r)}))
    .flatMap(({r,x})=>mbMealsOf(x).map(m=>({auto:true, id:r.id, d:x.date, n:x.org||x.contact||'(업체 미정)', ...m})));
  // 지금 입력 중인 예약도: 예약 내역에 몽몽마방(또는 관람+몽몽마방)을 넣으면 저장 · 예약접수 전이라도 바로 (2026-11-16)
  const mine = !BOOK_ONLY && rec && rec.date ? mbMealsOf(rec).map(m=>({auto:true, cur:true, id:'', d:rec.date, n:rec.org||(contactsOf(rec)[0]||{}).name||'(지금 예약)', ...m})) : [];
  return [...others, ...mine];
}catch(_){ return []; } }
function mbAllRows(){ return [...mbDb().rows.map((x,i)=>({...x, i})), ...mbAutoRows()]; }   // 직접 넣은 것(i = 몇 번째) + 단체 예약에서 자동
// 몽몽마방 한 줄 (tag = 모든 목록에서 찾을 때 내용 칸 앞의 목록 이름표)
function mbRow(x, today, tag){ return bkRowHTML({src:x.auto?'g':'m', d:x.d, tm:x.t, org:x.n, n:x.p?x.p+'명':'', x:esc(x.m||''), staff:x.staff||'', note:[x.pay==='마방'?'마방 결제':'', esc(x.note||'')].filter(Boolean).join(' · ')},
      `${x.auto?'r ':''}${x.d<today?'past':''}${rec.date && x.d===rec.date?' same':''}`, x.auto ? (x.cur ? '' : ` data-bopen="${esc(x.id)}"`) : ` data-mbrow="${x.i}" data-bcat="mb" title="누르면 고치는 창이 뜹니다 (직접 추가한 예약 · 빼기도 그 창에서)"`,
      `${x.cur ? '<span class="tag call bk-now" title="지금 화면에서 입력 중인 예약 (저장 전이어도 바로)">지금 이 예약</span>' : ''}`); }
function paintMbDb(){
  const db=mbDb(), today=todayYmd(), past=$('#bookPast').checked;   // 지난 예약도 보기 (예약 목록 창 공통)
  const all=mbAllRows();
  const F=bkFind(), list=all.filter(x=>(past || F.dated || x.d>=today) && bkFindOk(F, x.d, bkHay(F, {org:x.n, staff:x.staff, what:x.m, note:x.note, rest:x.t}))).sort((a,b)=>(a.d+String(a.t)).localeCompare(b.d+String(b.t)));
  bkFindPaint(list.length);
  $('#mbdbSum').textContent = all.length ? `${all.length}건 · 단체 예약(가예약 · 예약확정)에서 자동으로 들어옴 + 직접 추가` : '아직 없음';   // 「＋ 직접 추가」를 없애며 「직접 추가 마지막 저장」 글도 뺌 (2026-11-27)
  $('#mbdbHead').innerHTML = bkHeadHTML('mb');
  $('#mbdbBody').innerHTML = list.map(x=>mbRow(x, today, '')).join('')
    || `<tr><td colspan="8" class="empty">${F.on?'찾는 조건에 맞는 예약이 없습니다.':all.length?'앞으로 있을 몽몽마방 예약이 없습니다.':'몽몽마방 예약이 없습니다.'}</td></tr>`;
  labelCells('#mbdbBody', BK_COLS('mb'));   // 휴대폰: 칸마다 이름 (카드 모양, 2026-11-21)
  if(!list.length && gWaiting()) $('#mbdbBody').innerHTML=SY.skel('table', 6, {cols:8, label:'예약 목록을 불러오는 중'});   // 사본이 없고 처음 받는 중 (2026-11-27)
}
async function mbDbSave(rows, msg){
  if(BOOK_GUEST){ toast('로그인한 사람만 고칠 수 있습니다.'); return; }
  const old=cache.find(x=>x.id===MBDB_ID), now=new Date().toISOString(), keep=ymd(new Date(Date.now()-90*864e5));
  rows=rows.filter(x=>x.d>=keep).sort((a,b)=>(a.d+a.t).localeCompare(b.d+b.t));   // 90일 지난 것은 정리
  const item={...(old||{}), id:MBDB_ID, callType:MBDB_TYPE, saved:now, takenBy:savedOwner()||'', summary:`몽몽마방 예약 목록 ${rows.length}건`, history:JSON.stringify({rows, at:now, by:savedOwner()||''})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===MBDB_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
  if(!$('#bookModal').hidden) paintBook(); renderDayAll(); toast(msg);
}
$('#mbdbBody').addEventListener('click', e=>{ const i=e.target.dataset.mbdel; if(i==null) return; if(!mbDb().rows[+i]) return;
  if(BOOK_GUEST){ toast('로그인한 사람만 뺄 수 있습니다.'); return; }
  openBkDel({db:'mb', i:+i}); });   // 사유를 적는 창 → 수정 기록에 남기고 뺌 (2026-11-21)
// 사유 창 · 수정 기록 창: Esc = 닫기, 사유 칸에서 Ctrl+Enter = 빼기
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && $('#bkDelModal') && !$('#bkDelModal').hidden){ e.preventDefault(); e.stopImmediatePropagation(); closeBkDel(); return; }
  if(e.key==='Escape' && $('#bkLogModal') && !$('#bkLogModal').hidden){ e.preventDefault(); e.stopImmediatePropagation(); $('#bkLogModal').hidden=true; return; }
  if(e.key==='Enter' && e.ctrlKey && e.target.id==='bkDelWhy'){ e.preventDefault(); doBkDel(); }
}, true);

// 확인할 것(팝업): 입력된 값끼리 맞지 않거나, 관리자 사이트 기준 자리가 모자랄 때
function fieldWarnings(r){
  const w=[];
  if(r.date){ const d=new Date(r.date+'T00:00'), t=new Date(); t.setHours(0,0,0,0); if(d<t) w.push({field:'date', reason:'지난 날짜입니다. 방문일을 다시 확인하세요.'}); }
  if(r.tin && !fmtTime(r.tin)) w.push({field:'tin', reason:'입장 시각을 24시간으로 적어 주세요 (예: 13:30).'});
  // 인원 맞추기 (2026-11-20): 관람 인원 = 예약 내역의 관람 · 관람+식사 인원 합 · 식사를 따로 예약했으면 (식사 + 관람+식사) = 관람 인원. 관람 · 식사 · 관람+식사 구분은 품목 관리 기준
  { const n0=numOf(r.people), cA=v=>v ? (numOf(v)||n0) : 0, vs=viewsParse(r.views);
    const kindOf = s => { const it=catalogItems().find(x=>normSrc(x.src)===normSrc(daySrc(s, r))); return it ? it.kind : /\(관람,/.test(s) ? 'package' : 'view'; };
    const viewQ=vs.filter(x=>kindOf(x.src)!=='package').reduce((a,x)=>a+(+x.qty||0),0), pkgQ=vs.filter(x=>kindOf(x.src)==='package').reduce((a,x)=>a+(+x.qty||0),0)+cA(r.sadam1)+cA(r.sadam2)+cA(r.sadamD), area=viewQ+pkgQ+cA(r.haeorum);
    if(n0 && area && area!==n0) w.push({field:'people', blur:1, reason:`관람 인원은 ${n0}명인데 예약 내역의 관람 · 관람+식사 인원(성인 + 학생)을 더하면 ${area}명입니다. 인원을 확인하세요.`});
    const meal=cA(r.mabangL), base=n0||area; if(meal && base && meal+pkgQ!==base) w.push({field:'mabangL', blur:1, reason:`식사 인원(몽몽마방 ${meal}명${pkgQ?` + 관람+식사 ${pkgQ}명`:''} = ${meal+pkgQ}명)이 관람 인원 ${base}명과 다릅니다. 식사 인원을 확인하세요.`}); }
  if(r.tout && !fmtTime(r.tout)) w.push({field:'tout', reason:'퇴장 시각을 24시간으로 적어 주세요 (예: 17:00).'});
  if(r.tin && r.tout && fmtTime(r.tin) && fmtTime(r.tout) && fmtTime(r.tout)<=fmtTime(r.tin)) w.push({field:'tout', reason:'퇴장 시각이 입장보다 빠릅니다. 24시간 표시인지 확인하세요 (오후 3시 = 15:00).'});
  if(r.date && r.tbdDate && r.tbdDate>r.date) w.push({field:'tbdDate', reason:'미정 항목 답변일이 방문일보다 늦습니다.'});
  else if(r.tbd && r.date && r.tbdDate && r.tbdDate>tbdLimit(r.date)) w.push({field:'tbdDate', reason: r.tbdLate ? `${tbdLimitName(r.date)}보다 늦음 · 사유: ${r.tbdLate}` : `미정 항목 답변일은 ${tbdLimitName(r.date)}(${mdLabel(tbdLimit(r.date))})까지입니다. 늦추려면 사유를 적어야 합니다.`});
  if(typeof SPECIAL!=='undefined') specialCounts(r).filter(s=>s.proof).forEach(s=>w.push({field:s.k, reason:`${s.n}명 ${s.name} 할인 → 방문 때 ${s.proof} 지참을 안내하세요.`}));
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
const warnKey = w => w.field+'|'+w.reason;   // 인원 맞추기(blur)는 숫자가 바뀌면 다시 알림
// 인원 칸(관람 인원 · 예약 내역의 성인 · 학생 · 수량)을 나갈 때: 관람 인원 ≠ 성인 + 학생 합 · 식사 인원이 안 맞으면 팝업. 같은 줄 성인 → 학생으로 옮길 때는 아직 안 띄움 (2026-11-20)
document.addEventListener("focusout", e=>{ const el=e.target; if(!el || !(el.id==="f_people" || (el.closest?.("#itemsBox") && (el.dataset.iq!=null || el.dataset.iqa!=null || el.dataset.istu!=null)))) return;
  setTimeout(()=>{ const a=document.activeElement, pair=el.closest(".it-q2"); if(pair && a && pair.contains(a)) return; checkWarn(true); }, 0); });
function scheduleWarn(){ clearTimeout(warnT); warnT=setTimeout(checkWarn, 1200); }
function checkWarn(onBlur){   // onBlur: 칸을 나갈 때 — 인원 맞추기(blur) 경고는 이때만 (치는 동안엔 안 띄움, 2026-11-20)
  if(!window.__autoReady || restoring) return;
  const all=fieldWarnings(rec).filter(w=>!w.blur || onBlur);
  const fresh=all.filter(w=>!warnSeen.has(warnKey(w)));
  if(!fresh.length) return;
  if([...document.querySelectorAll('.modal')].some(m=>!m.hidden)){ clearTimeout(warnT); warnT=setTimeout(()=>checkWarn(onBlur), 1200); return; }   // 다른 팝업이 떠 있으면 닫힌 뒤에
  fresh.forEach(w=>warnSeen.add(warnKey(w)));
  $('#warnList').innerHTML = fresh.map(w=>`<li><b>${esc(LABEL[w.field]||w.field)}</b>${rec[w.field]?` ${esc(rec[w.field])}`:''} · ${esc(w.reason)}</li>`).join('');
  $('#warnModal').hidden=false; setTimeout(()=>$('#warnOk').focus(),0);
}
const resetWarn = (seed) => { warnSeen=new Set(seed ? fieldWarnings(rec).map(warnKey) : []); clearTimeout(warnT); };   // 저장된 예약을 열 때는 원래 있던 것은 띄우지 않음
$('#warnOk').onclick=()=>{ $('#warnModal').hidden=true; };
$('#warnModal').addEventListener('click', e=>{ if(e.target.id==='warnModal') $('#warnModal').hidden=true; });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#warnModal').hidden){ e.preventDefault(); $('#warnModal').hidden=true; } });

function autoSummary(){ return ['단체', rec.org, rec.people&&`${rec.people}명`, rec.date&&dateLabel(rec.date), rec.meal&&rec.meal!=='없음'&&`식사 ${rec.meal}`].filter(Boolean).join(' · '); }

// ▣ js/group/07-store.js — 통화 메모 · 통화 시간 · 알림 글(toast) · 텍스트 복사(보고 글) · 저장: 대기열(pending) · 서버 목록 사본 · 합치기(merged) · 보내기(flush) · 받기(pull)
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
  // 2026-11-24: 제목 아래 빈 줄 · 예약 단계 · 예상 금액 · 미정 항목 · 남은 과업 · 영업 담당은 뺌 (보고받는 쪽에 필요한 방문 정보만)
  const L=[`[단체예약 보고] ${r.org||'(단체명 미정)'}`];
  const add=(k,v)=>{ if(v) L.push(`- ${k}: ${v}`); };
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
  add('서류 요청', [r.wantQuote&&'견적서', r.wantStmt&&'거래명세서'].filter(Boolean).join(', '));
  const ml = noteFull().split('\n').map(s=>s.trim()).filter(Boolean); if(ml.length){ L.push('- 통화 메모:'); ml.forEach(x=>L.push(`  · ${x}`)); }   // 통화 메모 기록들 (기록마다 날짜 · 이름이 앞에 붙음 · 2026-11-27)
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

// ===================== 저장: 공유 DB (서버 요청은 SY.call · 끊긴 사이 저장한 것은 대기열에 모았다가 다시 보냄) =====================
// 서버로 가는 요청은 모두 SY.call (js/common.js). 예전의 「공유 주소가 없으면 이 브라우저에만 저장」 방식은 없앰 (2026-11-23 · 주소는 늘 있음)
const PEND_LS='sayuwon_intake_pending', CACHE_LS='sayuwon_intake_cache';
const readJSON=SY.readJSON;
const writeJSON=SY.writeJSON;
let pending = readJSON(PEND_LS,[]);        // 아직 시트에 못 올린 저장·삭제 [{action:'put',item}|{action:'del',id}]
let serverItems = readJSON(CACHE_LS,[]);   // 마지막으로 받은 시트 내용 (바로 띄우기용)
// 2026-11-21: 사본이 5MB 를 넘으면 localStorage 에 못 써서(조용히 실패) 열 때마다 구글 시트를 기다렸음 → 전체 사본은 IndexedDB 에, 열자마자 그것으로 그림
let pulledOnce=false;
const cacheReady = (async()=>{ const v=(await SY.listCached()) || (await SY.idb.get(CACHE_LS));   // 모든 화면이 같이 쓰는 사본 (js/common.js SY.list) · 없으면 예전 단체 화면 사본
  if(Array.isArray(v) && v.length && !pulledOnce){ serverItems=v; cache=merged(); if(window.__tasksReady){ try{ renderList(); paintMyCount(); tryOpenG(); if(!$('#myModal').hidden) renderMy(); }catch(_){} } } })();
function cacheWrite(items){   // 전체 사본은 SY.list 가 IndexedDB 에 둠 · localStorage 는 작을 때만 (다른 화면이 빨리 쓰도록) — 크면 지워서 저장 대기 · 다른 칸 자리를 남김
  SY.idb.del(CACHE_LS);   // 예전(첫 판) 단체 화면 전용 사본은 지움
  try{ const s=JSON.stringify(items.slice(-1000)); if(s.length < 1.5e6) localStorage.setItem(CACHE_LS, s); else localStorage.removeItem(CACHE_LS); }catch(_){ try{ localStorage.removeItem(CACHE_LS); }catch(__){} } }
const ADMIN_LS='sayuwon_intake_admin';
let adminData = readJSON(ADMIN_LS,null);   // 관리자 사이트 사담·마방 현황 {updated, days:{날짜:{L1,L2,D,MB}}}
let syncState = 'loading', flushing=false, retryTimer=null;
const getKey=SY.getKey;   // 팀 비밀번호 대신 로그인 (2026-11-21, js/common.js)

function merged(){
  const m=new Map(serverItems.map(x=>[x.id,x]));
  pending.forEach(p=>{ if(p.action==='put') m.set(p.item.id,{...p.item,_pending:true}); else m.delete(p.id); });
  // 개인고객 화면에서 이 브라우저로 고친 통화 (과업 체크 등): 시트에 아직 안 올라갔거나 시트를 다시 받기 전이면 그 내용을 씀
  const pp = readJSON('sayuwon_personal_pending',[]), pc = readJSON('sayuwon_personal_cache',[]);
  // 개인고객 화면이 시트에 올린 뒤 다시 받은 내용(_localAt 없음, updated 가 더 새로움)도 이 화면이 가진 옛 내용보다 먼저
  [...pc, ...pp.filter(p=>p.action==='put').map(p=>p.item)].forEach(x=>{ if(!x || !x.id) return; const t=String(x._localAt || (x.callType==='개인고객' && x.updated) || ''); if(!t) return; const s=m.get(x.id);
    if(!s || String(s.updated||'') < t) m.set(x.id, x); });
  pp.forEach(p=>{ if(p.action==='delete') m.delete(p.id); });
  return SY.live.apply([...m.values()]);   // 다른 화면이 방금 저장 · 삭제한 기록 (바로 알리기 · js/common.js SY.live, 2026-11-23)
}
// 다른 화면(다른 탭 · 나의 할일 팝업 · 개인고객 화면)이 기록을 저장 · 삭제하면 그 순간 받아 다시 그림 (2026-11-23) — 서버에서 다시 받기(30초마다)를 기다리지 않음
SY.live.onRev(()=>{ if(BOOK_GUEST) return; if(pending.length) flush(); else pull(); if(typeof loadMyQuoteReq==='function') loadMyQuoteReq(); });   // 다른 컴퓨터에서 바뀜 → 바로 다시 받음 (바뀐 줄만)
let liveT=0;
SY.live.on(m=>{ const id = m.t==='del' ? m.id : m.item.id; cache=merged(); clearTimeout(liveT);
  liveT=setTimeout(()=>{ if(!window.__tasksReady) return;
    try{
      // 그 예약을 이 화면에서도 열어 두었고 고치던 것이 없으면: 새 내용으로 다시 엶 (화면의 과업이 옛 상태로 남았다가 저장되어 되돌아가지 않게)
      if(m.t==='put' && editingId===id && !saving && (lockOwner ? (typeof lockSaving==='undefined' || !lockSaving) : !isDirty()) && $('#listModal').hidden && !document.activeElement?.closest?.('#taskList, #form, #noteList')){ const r=cache.find(x=>x.id===id); if(r){ const y=window.scrollY, typed=$('#memoBox').value, foc=document.activeElement===$('#memoBox'), dId=noteDraftId, dT=noteDraftT; openRecord(r); window.scrollTo(0,y);
        if(typed.trim()){ notes=notes.filter(n=>n.id!==dId); noteDraftId=dId; noteDraftT=dT; if(dId) noteOwn.add(dId); $('#memoBox').value=typed; renderNotes(true); }   // 적던 통화 메모(적는 자리의 글)는 그대로 둠 — 이미 저장된 것이면 같은 기록으로 이어 적음 (2026-11-27 쌓이는 기록)
        if(foc) $('#memoBox').focus(); } }   // 남이 담당인 예약도 새 내용으로 (2026-11-24)
      paintMyCount(); if(!$('#listModal').hidden) renderList();
      if(!$('#myModal').hidden && !(typeof etcEdit!=='undefined' && etcEdit && document.activeElement?.closest?.('.etc-edit')) && !document.activeElement?.matches?.('.tk-memoin, .tk-subin, .tk-in')) renderMy();
    }catch(e){ console.warn('live', e); } }, 30); });
window.addEventListener('storage', e=>{ if(!/^sayuwon_personal_(pending|cache)$/.test(e.key||'')) return; cache=merged();
  if(window.__tasksReady){ paintMyCount(); if(!$('#myModal').hidden) renderMy(); } });   // 다른 창(개인고객)에서 과업을 체크하면 나의 할일에 바로
// 처음 받는 중 (2026-11-27): 이 브라우저에 사본이 하나도 없고 아직 서버 답이 없을 때만 true → 예약 목록 · 나의 할일 · 예약 현황 공유 · 과업 알림 창이 「없습니다」 대신 스켈레톤 (js/common.js SY.skel)
//  사본이 있으면 그것을 먼저 보이므로 false · 서버에서 받았거나 못 받으면(연결 끊김 · 로그인 확인 안 됨) false → 예전 글 그대로
let gSkelOn=false;
const gWaiting = () => { const w = !pulledOnce && syncState==='loading' && !cache.length && !serverItems.length; if(w) gSkelOn=true; return w; };
function paintSync(){
  if(gSkelOn && syncState!=='loading'){ gSkelOn=false;   // 못 받았을 때도 스켈레톤이 남지 않게 한 번 다시 그림 (받았을 때는 받은 쪽이 다시 그림)
    setTimeout(()=>{ try{ renderList(); if(!$('#myModal').hidden) renderMy(); if(!$('#bookModal').hidden) paintBook(); if(typeof ALERT_WIN!=='undefined' && ALERT_WIN) checkTbdPopup(true); }catch(_){} }, 0); }
  const chip=$('#syncChip'), n=pending.length;
  // 연결돼 있으면 아무것도 안 보임. 문제가 있을 때만 헤더에 표시 (비밀번호 문제는 팝업)
  const txt={ loading:'', ok: n?`올리는 중 ${n}건`:'', error: n?`연결 끊김 · ${n}건 대기 · 다시 시도 중`:'연결 끊김 · 다시 시도 중', needkey:'' }[syncState];
  chip.textContent=txt; chip.hidden=!txt; chip.title = syncState==='error' && lastSyncErr ? `마지막 오류: ${lastSyncErr}
15초마다 다시 보냅니다. 저장 대기 중인 내용은 이 브라우저에 남아 있으니 창을 닫아도 다음에 열면 이어서 보냅니다.` : ''; chip.className='sync '+(syncState==='error'?'warn':'');
  const km=$('#keyModal'); km.hidden = syncState!=='needkey' || !!BOOK_GUEST;   // 로그인 확인 안내 (예약 현황 공유를 로그인 없이 볼 때는 안 띄움)
  paintDbTime();
  $('#storeHint').textContent = syncState==='ok' ? '공유 DB에 저장 · 모두가 같은 목록을 봅니다' : syncState==='needkey' ? '로그인을 확인하지 못했습니다 · 첫 화면에서 다시 로그인' : syncState==='error' ? '연결이 안 돼 이 브라우저에 모아 두었다가 다시 올립니다' : '불러오는 중…';
}
// 공유 DB에 마지막으로 저장된 시각 (이 브라우저에서 올린 것) · 마지막으로 받아 온 시각
var DBT_LS = 'sayuwon_db_time';   // var: paintSync가 먼저 불려도 되게
var dbTime = readJSON(DBT_LS, {});
const markDb = k => { dbTime[k]=new Date().toISOString(); writeJSON(DBT_LS, dbTime); paintDbTime(); };
function paintDbTime(){
  const el=$('#dbTime'); if(!el || !dbTime) return;
  const n=pending.length, last=[dbTime.saved, dbTime.cat].filter(Boolean).sort().pop(), t=last || dbTime.pulled;   // 예약 저장 · 품목 관리 저장 중 최근 것
  el.hidden = !t && !n;
  el.textContent = (last ? `DB 저장 ${dtLabel(last)}` : t ? `DB 동기화 ${dtLabel(t)}` : '') + (n ? ` · 저장 대기 ${n}건` : '');
  el.title = `공유 DB · 이 브라우저 기준\n· 예약 마지막 저장: ${dbTime.saved?dtLabel(dbTime.saved):'아직 없음'} (고치고 30초 뒤 자동 저장)\n· 품목 관리 마지막 저장: ${dbTime.cat?dtLabel(dbTime.cat):'아직 없음'} (고치고 2초 뒤 자동 저장)\n· 마지막으로 목록을 받아 옴: ${dbTime.pulled?dtLabel(dbTime.pulled):'아직 없음'}`;
}
// 구글 시트 칸 하나 = 5만 자까지. 수정 기록(history)이 넘으면 처음 저장 줄은 두고 오래된 기록부터 덜어 냄 (바꿨으면 줄인 기록을 돌려줌)
function fitHist(item){ const s=String(item && item.history || ''); if(s.length<=45000) return null; let hj; try{ hj=JSON.parse(s); }catch(_){ return null; }
  let h=Array.isArray(hj.h)?hj.h:[]; while(item.history.length>45000 && h.length>20){ h=[h[0], ...h.slice(1+Math.max(1, Math.floor(h.length/10)))]; hj.h=h; item.history=JSON.stringify(hj); } return h; }
var lastSyncErr='', syncErrN=0;   // 저장 실패 이유 (헤더 「연결 끊김」에 마우스를 올리면 보임)
function handleErr(e){
  if(e.code==='bad_key'){ syncState='needkey'; $('#keyMsg').textContent=SY.authFail(); }
  else { syncState='error'; clearTimeout(retryTimer); retryTimer=setTimeout(()=>{ flush(); }, 15000);
    const net = e instanceof TypeError || /fetch|network|Load failed/i.test(String(e.message||e)), msg = net ? '인터넷 연결 (또는 구글 서버 응답 없음)' : String(e.message||e).replace(/^Error:\s*/,'');
    syncErrN = msg===lastSyncErr ? syncErrN+1 : 1; lastSyncErr = msg;
    if(!net && syncErrN===3) toast(msg==='too_many' ? '틀린 로그인이 여러 번 이어져 서버가 잠시 막았습니다. 15분쯤 뒤에 다시 됩니다.' : `저장이 계속 실패합니다: ${msg}`); }   // 같은 오류가 세 번 이어지면 한 번 알림 (연결 문제는 알리지 않고 계속 다시 시도)
  paintSync();
}
// 예약 현황 공유를 로그인 없이 볼 때 (2026-11-21 · 담당자 휴대폰): 그 목록에 필요한 칸만 받는 bookList (고객 연락처 · 메모 · 수정 기록 없음)
async function bookPull(){
  try{ const j=await SY.callRaw({action:'bookList'});
    if(!j.ok){ syncState='error'; lastSyncErr = String(j.error||''); paintSync(); if($('#bookSum')) $('#bookSum').textContent=lastSyncErr; return; }
    serverItems=j.items||[]; cache=merged(); syncState='ok'; paintSync(); renderDayAll(); if(!$('#bookModal').hidden) paintBook(); }
  catch(e){ syncState='error'; lastSyncErr='인터넷 연결'; paintSync(); }
}
async function flush(){
  if(flushing) return;
  if(BOOK_GUEST) return bookPull();
  if(!getKey()){ syncState='needkey'; paintSync(); return; }
  flushing=true;
  try{
    do {   // 보내는 사이 새로 쌓인 것(예: 삭제 사유 저장 뒤 삭제)까지 이어서 보냄
    while(pending.length){
      if(pending[0].action==='put' && fitHist(pending[0].item)) writeJSON(PEND_LS,pending);   // 예전에 쌓인 저장도 시트 칸 크기에 맞춰
      await SY.call(pending[0]);
      pending.shift(); writeJSON(PEND_LS,pending); dbTime.saved=new Date().toISOString(); writeJSON(DBT_LS, dbTime); paintSync();
    }
    await pull(true);
    } while(pending.length);
  }catch(e){ handleErr(e); }
  finally{ flushing=false; }
}
async function pull(inFlush){
  if(BOOK_GUEST) return bookPull();
  if(!getKey()){ syncState='needkey'; paintSync(); return; }
  if(flushing && !inFlush) return;
  try{
    const j=await SY.list(inFlush ? {fresh:true} : {});   // 바뀐 것만 받아 사본에 합침 (js/common.js, 2026-11-21)
    serverItems=j.items||[]; pulledOnce=true; cacheWrite(serverItems); cache=merged();   // 2026-11-24: 받은 것을 바로 합침 — 예전엔 나의 할일 · 알림을 옛 사본으로 다시 그려(합치기는 그 뒤 renderList 에서) 다른 컴퓨터에서 바꾼 과업이 늦게 보였음
    if(j.admin!==undefined){ adminData=j.admin; writeJSON(ADMIN_LS,adminData); }
    dbTime.pulled=new Date().toISOString(); writeJSON(DBT_LS, dbTime);
    syncState='ok'; lastSyncErr=''; syncErrN=0; $('#keyMsg').textContent=''; paintSync(); renderList(); tryOpenG(); liveSync(); if(window.__tasksReady){ checkPayPopup(); takeDocs(); paintMyCount(); checkTbdPopup(); checkMemoPopup(); if(editingId){ const cr=cache.find(x=>x.id===editingId); if(cr){ memos=mergeMemos(memos, parseHist(cr).memos); paintLock(); } } if(!$("#myModal").hidden && !(typeof etcEdit!=="undefined" && etcEdit && document.activeElement?.closest?.(".etc-edit")) && !document.activeElement?.matches?.(".tk-memoin, .tk-subin, .tk-in")) renderMy(); }   // 과업 칸(메모 · 세부 과업)에 적는 중이면 나의 할일을 다시 그리지 않음
  }catch(e){ if(inFlush) throw e; handleErr(e); }
}
const store={
  async list(){ await cacheReady; cache = merged(); if(typeof applySpd==='function') applySpd(); if(typeof tcfgApply==='function') tcfgApply(); return cache; },
  async put(item){
    pending=pending.filter(p=>!(p.action==='put'&&p.item.id===item.id)); pending.push({action:'put',item}); writeJSON(PEND_LS,pending); paintSync();
    SY.live.post({t:'put', item});   // 다른 화면에 바로 (나의 할일 · 첫 화면)
    flush();
  },
  async del(id, keepPut){   // keepPut: 바로 앞에 넣은 저장(삭제 사유 기록)을 먼저 보내고 삭제
    const local=pending.some(p=>p.action==='put'&&p.item.id===id) && !serverItems.some(x=>x.id===id);
    if(!(keepPut && !local)) pending=pending.filter(p=>!(p.action==='put'&&p.item.id===id));
    if(!local) pending.push({action:'del',id});
    writeJSON(PEND_LS,pending); paintSync(); SY.live.post({t:'del', id}); flush();
  }
};
// (팀 비밀번호 입력 칸은 없앰 · 2026-11-21 — 서버는 로그인으로 확인, 안 되면 「로그인 확인 필요」 안내만)
window.addEventListener('focus', ()=>{ if(pending.length) flush(); else pull(); });   // 다른 창에서 돌아오면 최신 목록
setInterval(()=>{ if(!document.hidden){ if(pending.length) flush(); else pull(); } }, 30000);   // 30초마다 (2026-11-18 · 예전 1분)
// ▣ js/group/08-history-save.js — 수정 기록(무엇이 바뀌었나 · 되돌리기) · 저장(save) · 30초 자동 저장 · 저장 안 한 표시 · 나갈 때 확인
// ===================== 통화 메모 = 쌓이는 기록 (2026-11-27) =====================
// 예약 기록의 수정 기록 칸(history JSON · 서버는 정해진 칸만 받으므로 과업 · 메모 알림처럼 여기에)의 notes:[{id, t(적은 시각), by(적은 사람), text, ed:{t,by}(고침), del:{t,by}(지움 — 줄은 남김)}] 가 기록 목록이고,
//  note(글 한 덩어리 · 예전부터 있던 값)에는 지우지 않은 기록을 「[2026-11-27 14:20 이름] 내용」 줄로 이어 함께 넣는다 — 보고 글자 · 엑셀 · 다음날 준비 · 예전 화면이 note 를 읽으므로.
//  - 예전 예약(notes 없음 · note 만): 그 글을 「예전 메모」 기록 하나로 보임 (저장된 자료를 한꺼번에 바꾸지 않음 — 열어서 저장할 때 notes 가 더해짐)
//  - 예전 화면이 저장하면 notes 는 빠지고 note 만 남는다 → 열 때 notes 를 이은 글과 note 가 다르면 note(글)를 기준으로 기록을 다시 읽어 낸다 (noteFromText · 내용이 사라지지 않게)
//  - 적는 자리(#memoBox)의 글 = 아직 확정 안 한 기록 하나(noteDraftId). 자동 저장은 그 기록을 같은 id 로 저장만 하고, 「저장」 · Ctrl+S 가 기록으로 쌓는다(확정)
//  - 저장할 때: 그사이 남이 더한 기록은 살리고(noteMerge), 내가 이번에 손댄 기록(noteOwn)만 내 것으로 덮는다
const NOTE_HDR = /^\[(?:(\d{4}-\d\d-\d\d) (\d\d:\d\d)(?: ([^\]]*))?|덧붙인 글)\] ?/;
const noteStamp = t => { const d=new Date(t); if(!t || isNaN(d)) return ''; const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const noteKey = n => n.t ? noteStamp(n.t)+' '+(n.by||'') : '';
const noteHash = s => { let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return (h>>>0).toString(36); };
const noteNewId = () => 'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const noteSort = L => (L||[]).map((n,i)=>({n,i})).sort((a,b)=>String(a.n.t||'').localeCompare(String(b.n.t||'')) || a.i-b.i).map(x=>x.n);   // 적은 시각 순 (시각 모르는 예전 메모가 맨 위)
function noteJoin(L){ return noteSort(L).filter(n=>n && !n.del && String(n.text||'').trim()).map((n,i)=> n.t ? `[${noteStamp(n.t)}${n.by?' '+n.by:''}] ${n.text}` : i ? `[덧붙인 글] ${n.text}` : n.text).join('\n'); }
function noteSplit(text){   // 글 → [{t, by, text}] (머리표 「[날짜 시각 이름]」 로 시작하는 줄마다 기록 하나 · 머리표 앞의 글은 예전 메모)
  const out=[]; let cur=null;
  String(text||'').replace(/\r/g,'').split('\n').forEach(line=>{ const m=line.match(NOTE_HDR);
    if(m){ const d=m[1] ? new Date(m[1]+'T'+m[2]+':00') : null; cur={t: d && !isNaN(d) ? d.toISOString() : '', by:(m[3]||'').trim(), text:line.slice(m[0].length)}; out.push(cur); }
    else if(cur) cur.text+='\n'+line; else { cur={t:'', by:'', text:line}; out.push(cur); } });
  out.forEach(n=>{ n.text=n.text.replace(/\s+$/,''); }); return out.filter(n=>n.text.trim());
}
function noteFromText(text, L, who){   // 글이 기준: 글에 있는 기록은 살리고(같은 기록이면 id · 고침 표시 그대로), 글에 없는 기록은 지움 표시로 남김
  L=L||[]; const used=new Set(), ids=new Set(L.map(n=>n.id));
  const out=noteSplit(text).map(p=>{ const k=noteKey(p), free=n=>!n.del && !used.has(n.id) && noteKey(n)===k;
    const hit = L.find(n=>free(n) && String(n.text||'').trim()===p.text.trim()) || (k ? L.find(free) : null);
    if(hit){ used.add(hit.id); return {...hit, text:p.text}; }
    let id='p'+noteHash(k+'|'+p.text.trim()); while(ids.has(id)) id+='x'; ids.add(id); return {id, t:p.t, by:p.by, text:p.text}; });
  L.forEach(n=>{ if(!used.has(n.id)) out.push(n.del ? n : {...n, del:who||{t:'', by:''}}); });
  return out;
}
function notesOf(r){ r=r||{}; const hn=parseHist(r).notes, L=Array.isArray(hn) ? hn.filter(n=>n && n.id).map(n=>({...n})) : [], note=String(r.note||'');
  return noteJoin(L).trim()===note.trim() ? L : noteFromText(note, L); }
function noteDraft(){ const text=String($('#memoBox').value||'').trim(); if(!text) return null;
  if(!noteDraftId){ noteDraftId=noteNewId(); noteDraftT=new Date().toISOString(); noteOwn.add(noteDraftId); }
  return {id:noteDraftId, t:noteDraftT, by:savedOwner()||rec.owner||'', text}; }
const noteLive = () => { const d=noteDraft(); return d ? [...notes.filter(n=>n.id!==d.id), d] : notes.slice(); };
const noteFull = () => noteJoin(noteLive());
function noteMerge(theirs, mine){   // theirs = 지금 저장돼 있는 기록 · mine = 이 화면의 기록
  const T=(theirs||[]).filter(n=>n && n.id), tm=new Map(T.map(n=>[n.id,n])), ids=new Set(mine.map(n=>n.id)), same=new Set(mine.map(n=>noteKey(n)+'|'+String(n.text||'').trim()));
  return noteSort([...mine.map(n=>noteOwn.has(n.id) ? n : (tm.get(n.id)||n)), ...T.filter(n=>!ids.has(n.id) && !noteOwn.has(n.id) && !same.has(noteKey(n)+'|'+String(n.text||'').trim()))]); }
function noteLoad(r){ notes = r ? noteSort(notesOf(r)) : []; noteDraftId=''; noteDraftT=''; noteOwn=new Set(); noteEditId=''; noteShown=new Set(); $('#memoBox').value=''; renderNotes(true); }
function noteCommit(){   // 적는 자리의 글을 기록으로 쌓음 (저장이 끝난 뒤에 부름)
  const d=noteDraft(); if(d) notes=noteSort([...notes.filter(n=>n.id!==d.id), d]);
  $('#memoBox').value=''; noteDraftId=''; noteDraftT=''; noteOwn=new Set(); renderNotes(true); }
const noteCan = n => !editLockBy && (!lockOwner || (!!n.by && n.by===savedOwner()));   // 고치기 · 지우기: 영업 담당은 모두 · 담당이 아니면 내가 적은 기록만
function renderNotes(toEnd){
  const box=$('#noteList'); if(!box) return; const did=noteDraftId && String($('#memoBox').value||'').trim() ? noteDraftId : '';
  const L=noteSort(notes).filter(n=>n.id!==did && !n.del && String(n.text||'').trim()), y=box.scrollTop;
  box.hidden=false;   // 채팅처럼: 기록 자리는 늘 보이고 위에서부터 쌓임 · 적는 자리는 맨 아래 (같은 날 다시 · 운영팀 요청)
  box.innerHTML=L.map(n=>{ const can=noteCan(n), id=esc(n.id), when = n.t ? `<b class="note-when num">${esc(dtLabel(n.t))}</b>${n.by?`<span class="note-by">${esc(n.by)}</span>`:''}` : '<b class="note-when">예전 메모</b>';
    if(n.del) return `<li class="note-it del" data-nid="${id}"><div class="note-h">${when}<span class="note-ed">지운 기록${n.del.by?` · ${esc(n.del.by)}`:''}${n.del.t?` ${esc(dtLabel(n.del.t))}`:''}</span><span class="note-acts"><button type="button" class="note-btn" data-nshow="${id}">${noteShown.has(n.id)?'내용 접기':'내용 보기'}</button>${can?`<button type="button" class="note-btn" data-nback="${id}">되살리기</button>`:''}</span></div>${noteShown.has(n.id)?`<div class="note-tx">${esc(n.text)}</div>`:''}</li>`;
    if(noteEditId===n.id) return `<li class="note-it editing" data-nid="${id}"><div class="note-h">${when}</div><textarea class="note-edit" data-ime="ko" lang="ko" spellcheck="false">${esc(n.text)}</textarea><div class="note-edit-btns"><button type="button" class="btn primary" data-nok="${id}">고친 내용 넣기</button><button type="button" class="btn" data-ncancel="${id}">취소</button></div></li>`;
    return `<li class="note-it" data-nid="${id}"><div class="note-h">${when}${n.ed?`<span class="note-ed" title="${esc([n.ed.by, n.ed.t?dtLabel(n.ed.t):''].filter(Boolean).join(' · '))} 고침 — 고치기 전 글은 「수정 기록」에서">고침</span>`:''}${can?`<span class="note-acts"><button type="button" class="note-btn" data-nedit="${id}">고치기</button><button type="button" class="note-btn" data-ndel="${id}">지우기</button></span>`:''}</div><div class="note-tx">${esc(n.text)}</div></li>`; }).join('');
  noteGrow(); box.scrollTop = toEnd ? box.scrollHeight : y;
}
// 적는 자리 높이: 평소 한두 줄(css) · 길게 적으면 칸의 27% 까지 늘어남(처음 55% 의 절반 · 넘으면 그 안에서 스크롤) · 비우면 도로 (채팅 입력창처럼)
function noteGrow(){ const mb=$('#memoBox'), st=$('#memoStack'), box=$('#noteList'); if(!mb || !st) return; const end = box && box.scrollTop+box.clientHeight >= box.scrollHeight-4;
  mb.style.height=''; if(mb.value && mb.scrollHeight>mb.clientHeight+2) mb.style.height=Math.min(mb.scrollHeight+2, Math.round(st.clientHeight*0.275))+'px';
  if(end && box) box.scrollTop=box.scrollHeight; }
$('#memoBox').addEventListener('input', noteGrow);
// ===================== 수정 기록 =====================
// 저장할 때마다 바뀐 항목을 시각·영업 담당과 함께 남긴다 (시트 '수정 기록' 칸에 JSON)
const mealSum = r => [r.sadam1&&`사담1부 ${r.sadam1}`, r.sadam2&&`사담2부 ${r.sadam2}`, r.sadamD&&`사담디너 ${r.sadamD}`, r.mabangL&&`마방 ${r.mabangTime?r.mabangTime+' ':''}${r.mabangL}`, r.mabangD&&`마방디너 ${r.mabangD}`].filter(Boolean).join(" · ") || r.meal || "";
Object.assign(LABEL, { etcDisc:'기타 할인', etcDiscTo:'기타 할인 대상', etcDiscWhy:'기타 할인 사유', etcDiscTx:'기타 할인 과세(신라)', etcDiscTf:'기타 할인 비과세(사유원)', erpList:'전산 내역', tour:'사전 답사', tbd:'미정 체크', tbdLate:'답변일 늦춘 사유', stage:'예약 단계', erp:'전산 등록', note:'통화 메모' });
function snap(){
  const o={}; allKeys().forEach(k=>{ if(k!=='owner') o[k]=rec[k]||''; });
  o.tbd=rec.tbd||''; o.tbdLate=rec.tbdLate||''; if(typeof SPECIAL!=='undefined') SPECIAL.forEach(s=>o[s.k]=rec[s.k]||'');
  o.stage=effStage(rec); o.erp=rec.erp||''; o.note=noteFull().trim();
  { const es=etcSplit(rec); if(es.tx) o.etcDiscTx=String(es.tx); if(es.tf) o.etcDiscTf=String(es.tf); } ['etcDiscWhy','readDone'].forEach(k=>{ if(rec[k]) o[k]=rec[k]; }); if(erpList.length) o.erpList=erpList.map(x=>`${x.product} ${x.people}명 ${x.amount}`).join(', ');   // 기타 할인 · 전산 내역도 변경으로
  tasks.forEach(t=>{ o['task:'+t.id]=t.done?'완료':''; o['tmemo:'+t.id]=t.memo||''; o['tfile:'+t.id]=(t.files||[]).map(f=>f.name).join(', '); if(t.custom) o['tadd:'+t.id]=t.title; });
  tasks.forEach(t=>{ if(t.dueSet) o['tdue:'+t.id]=t.due||''; if(t.titleSet && !t.custom) o['tttl:'+t.id]=t.title; });   // 직접 바꾼 마감일 · 제목도 변경으로 (자동 저장이 놓치지 않게)
  tasks.forEach(t=>{ if(t.noteEdit) o['tnote:'+t.id]=t.noteEdit; });   // 직접 고친 문구
  tasks.forEach(t=>{ const s=[...Object.entries(t.subs||{}).map(([k,v])=>k+(v?'✓':'')), ...(t.xsubs||[]).map(x=>x.title+(x.done?'✓':''))].join(', '); if(s) o['tsub:'+t.id]=s; });   // 하위 과업 · 세부 과제
  o.taskOrder = tasks.filter(t=>t.ordSet).sort((a,b)=>a.ord-b.ord).map(t=>t.id).join(',');   // 직접 바꾼 순서만 (새 과업이 맨 아래 붙는 것은 변경 아님)   // ▲▼로 바꾼 과업 순서
  return o;
}
function diffSnap(a,b){
  const out=[];
  new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>{
    const x=a[k]||'', y=b[k]||''; if(x===y) return;
    if(k==='note'){ out.push(y.length>x.length && y.startsWith(x) ? '통화 메모 기록 더함' : '통화 메모 수정'); return; }
    if(k==='taskOrder'){ out.push('과업 순서 바꿈'); return; }
    if(k==='readDone'){ out.push(y ? '고객님께 확인 멘트 말씀드림' : '고객님께 확인 멘트 말씀드림 취소'); return; }
    const tm=k.match(/^(task|tmemo|tadd|tfile|tsub|tnote|tdue|tttl):(.+)$/);
    if(tm){ const title=(tasks.find(t=>t.id===tm[2])||{}).title||x||y;
      out.push(tm[1]==='tdue' ? `[과업] ${title} 마감 ${y}` : tm[1]==='tttl' ? `[과업] 제목 → ${y}` : tm[1]==='task' ? `[과업] ${title} ${y?'완료':'완료 취소'}` : tm[1]==='tnote' ? `[과업] ${title} 문구 직접 수정` : tm[1]==='tsub' ? `[과업] ${title} 세부 과제: ${y}` : tm[1]==='tfile' ? `[과업] ${title} 파일 올림` : tm[1]==='tadd' ? (y?`[과업] ${title} 추가`:`[과업] ${x} 삭제`) : `[과업] ${title} 메모 수정`); return; }
    const lab=LABEL[k]||k;
    out.push(!x ? `${lab} ${y} 입력` : !y ? `${lab} ${x} 지움` : `${lab} ${x} → ${y}`);
  });
  return out;
}
// 시트 '수정 기록' 칸: {h:[수정 기록], tasks:[추후 과업]} (예전 기록은 배열만)
function parseHist(r){ try{ const j=JSON.parse(r.history||'[]'); return Array.isArray(j) ? {h:j, tasks:[], erp:[], memos:[]} : {h:j.h||[], tasks:j.tasks||[], erp:j.erp||[], memos:j.memos||[], notes:Array.isArray(j.notes)?j.notes:undefined}; }catch(_){ return {h:[], tasks:[], erp:[], memos:[]}; } }   // memos: 담당이 아닌 사람이 남긴 메모 [{id,t,by,text,seen,seenAt}]
// ---- 바뀐 값의 흐름 (ch): {칸: [처음 값, 다음 값, …]} → "관람 인원 20 → 22 → 25". 자동 저장이 여러 번이어도 한 줄에 모든 변경이 남고, 되돌리기에도 씀
const fmtTime_ = t => dtLabel(t);
function chText(k, c){
  const x=c[0]||'', y=c[c.length-1]||'';
  if(k==='note') return y.length>x.length && y.startsWith(x) ? '통화 메모 기록 더함' : '통화 메모 수정';
  if(k==='taskOrder') return '과업 순서 바꿈';
  if(k==='erpList') return '전산 내역 붙여넣음';
  if(k==='readDone') return y ? '고객님께 확인 멘트 말씀드림' : '고객님께 확인 멘트 말씀드림 취소';
  const tm=k.match(/^(task|tmemo|tadd|tfile|tsub|tnote|tdue|tttl):(.+)$/);
  if(tm){ const title=(tasks.find(t=>t.id===tm[2])||{}).title||x||y;
    return tm[1]==='tdue' ? `[과업] ${title} 마감 ${y}` : tm[1]==='tttl' ? `[과업] 제목 → ${y}` : tm[1]==='task' ? `[과업] ${title} ${y?'완료':'완료 취소'}` : tm[1]==='tnote' ? `[과업] ${title} 문구 직접 수정` : tm[1]==='tsub' ? `[과업] ${title} 세부 과제: ${y||'없음'}` : tm[1]==='tfile' ? `[과업] ${title} 파일 올림` : tm[1]==='tadd' ? (y?`[과업] ${title} 추가`:`[과업] ${x} 삭제`) : `[과업] ${title} 메모 수정`; }
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
const REVERT_SKIP = /^(task|tmemo|tadd|tfile|tsub|tnote|tdue|tttl):|^(taskOrder|erpList)$/;   // 과업 체크 · 메모 · 파일은 되돌리지 않음
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
function paintDirty(){ const ids=dirtyTaskIds(); document.querySelectorAll('#taskList textarea[data-tm]').forEach(ta=>{ const t=tasks.find(x=>x.id===ta.dataset.tm); if(t && ta.value!==(t.memo||'')) ids.add(t.id); });   // 치는 중인 과업 메모도 (칸을 벗어나야 반영되므로)
  $('#saveBtn').classList.toggle('dirty', isDirty() || ids.size>0); document.querySelectorAll('#taskList [data-tsave]').forEach(b=>b.classList.toggle('dirty', ids.has(b.dataset.tsave))); }   // 저장 안 한 변경: 저장 버튼 · 그 과업의 「저장」에 노란 점
// 저장 안 한 변경이 있는 과업 id (체크 · 메모 · 파일 · 마감 · 제목 · 문구 · 하위 과업)
function dirtyTaskIds(){ const a=refSnap(), b=snap(), s=new Set(); new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k=>{ const m=k.match(/^(task|tmemo|tfile|tadd|tdue|tttl|tnote|tsub):(.+)$/); if(m && String(a[k]||'')!==String(b[k]||'')) s.add(m[2]); }); return s; }
let dirtyT=0; document.addEventListener('input', e=>{ if(!e.target.closest?.('#taskList')) return; clearTimeout(dirtyT); dirtyT=setTimeout(paintDirty, 60); });   // 과업 메모를 치는 동안에도
function scheduleAuto(){
  paintDirty(); clearTimeout(autoT);
  if(isDirty() && canSave()) autoT=setTimeout(()=>save({auto:true}), AUTO_SAVE_MS);
}
async function save(opt){
  const auto = !!(opt && opt.auto), quiet = opt===true || auto;
  if(saving){ if(auto){ clearTimeout(autoT); autoT=setTimeout(()=>save(opt), 3000); return; }   // 자동 저장 중이면: 자동은 잠시 뒤, 저장 버튼은 끝나기를 기다렸다가
    await new Promise(ok=>{ const iv=setInterval(()=>{ if(!saving){ clearInterval(iv); ok(); } }, 50); }); return save(opt); }
  if(editLockBy){ if(!auto) toast(`${editLockBy}님이 다른 PC(창)에서 이 예약을 고치는 중이라 저장할 수 없습니다.`); return; }   // 같은 예약을 두 곳에서 고치지 않게
  if(lockOwner) return auto ? saveLockedParts() : saveLockedCommit();   // 남이 담당인 예약: 예약 전체는 저장 안 함 — 통화 메모 · 내가 담당자인 과업만 (2026-11-24 · 15-lock-popups.js)
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
  let newHist = row ? [...(open ? hist.slice(0,-1) : hist), row].slice(-200) : hist;
  const j=joinContacts(rec);
  const typed0=$('#memoBox').value, nl=noteMerge(editingId ? notesOf(cache.find(x=>x.id===editingId)||{}) : [], noteLive());   // 통화 메모 기록: 그사이 남이 더한 것까지 합침 (2026-11-27)
  const item={...rec, ...j, ...packExtra(rec), callType:effStage(rec), summary:autoSummary(), note:noteJoin(nl), takenBy:rec.owner,
    callStart:startedAt?startedAt.toISOString():'', id:editingId||(Date.now().toString(36)+Math.random().toString(36).slice(2,5)), saved:now, history:JSON.stringify({h:newHist, tasks, erp:erpList, memos:mergeMemos(memos, parseHist(cache.find(x=>x.id===editingId)||{}).memos), notes:nl})};   // 메모: 그사이 남이 남긴 것까지 합침
  // 구글 시트 칸 하나에는 5만 자까지만 들어감 → 수정 기록이 너무 길면 처음 저장 줄은 두고 오래된 기록부터 덜어 냄 (넘으면 저장이 계속 실패함)
  { const h2=fitHist(item); if(h2) newHist=h2; }
  Object.keys(item).forEach(k=>{ if(isCKey(k)) delete item[k]; });
  delete item.tbd; delete item.stage; delete item.erp; delete item.tbdDate; delete item.tbdLate; delete item.payContact;
  saving=true;
  try{ await store.put(item); editingId=item.id; openedRaw=rawPick(item); openedObj=liveVals(item); hist=newHist; baseSnap=cur;
    { const did=noteDraftId, same=$('#memoBox').value===typed0;   // 통화 메모: 저장 버튼 · Ctrl+S = 적은 글을 기록으로 쌓고 적는 자리를 비움 · 자동 저장 = 적는 자리는 그대로 (저장하는 사이 더 적었으면 그대로 둠)
      if(!auto && same){ notes=nl; $('#memoBox').value=''; noteDraftId=''; noteDraftT=''; noteOwn=new Set(); } else notes=nl.filter(n=>n.id!==did || !String($('#memoBox').value||'').trim());
      renderNotes(!auto && same); if(same) baseSnap.note=noteFull().trim(); }
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
    if(k==='note'){ notes=noteSort(noteFromText(v, notes, {t:new Date().toISOString(), by:savedOwner()||''})); $('#memoBox').value=''; noteDraftId=''; noteDraftT=''; notes.forEach(n=>noteOwn.add(n.id)); renderNotes(true); return; }   // 통화 메모: 그 버전의 글에 있던 기록만 남기고 뒤에 더한 기록은 지움 표시로 (2026-11-27)
    rec[k]=v; if(v) touched.add(k); });
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

// ▣ js/group/09-tasks.js — 추후 과업: 자동 과업 목록(AUTO_TASKS) · 조건으로 생기고 빠짐(syncAutoTasks) · 마감(autoDue) · 과업 문구(전산 비고 등) · 서류 올리기 · 입금 확인 알림
// ===================== 추후 과업 =====================
// 예약 단계·결제 방식에 따라 자동으로 생기는 과업 + 직접 추가한 과업. 과업마다 체크 · 메모
// ---- 사전답사 정보 (rec.tour = "성명: 홍길동, 연락처: 010-…, 일자: 2026-12-01, 인원: 2명, 시간: 10:00") ----
// 단체상담 입력의 '답사 요청 정보' · 예약 내용의 「사전답사」 팝업이 같은 칸에 씀. 성명 · 연락처가 비면 담당자(첫 줄) 이름 · 연락처
const TOUR_KEYS = [['name','성명',/성명|이름|신청자|담당자/],['phone','연락처',/연락처|전화|휴대|핸드폰/],['date','일자',/일자|날짜|일시|답사일/],['people','인원',/인원/],['time','입장시각',/입장|시간|시각/]];   // 시간 → 입장시각 (2026-11-17, 예전 '시간'도 읽음)
function tourParse(s){ const o={extra:[]}; String(s||'').split(/\s*,\s*/).filter(Boolean).forEach(p=>{ const m=p.match(/^([^:：]+?)\s*[:：]\s*(.*)$/); const hit=m && TOUR_KEYS.find(([,,re])=>re.test(m[1]));
    if(hit && !o[hit[0]]) o[hit[0]]=m[2].trim(); else o.extra.push(p.trim()); }); return o; }
function tourJoin(o){ return [...TOUR_KEYS.filter(([k])=>String(o[k]||'').trim()).map(([k,l])=>`${l}: ${String(o[k]).replace(/\s*,\s*/g,' ').trim()}`), ...(o.extra||[])].join(', '); }
function tourWithDefaults(r, s){ const o=tourParse(s), c=contactsOf(r)[0]||{}, org=String(r.org||'').trim();   // 성명 = 단체명(성명), 기본은 담당자
  if(!o.name && c.name) o.name=c.name; if(o.name && org && !o.name.includes(org)) o.name=`${org}(${o.name})`; if(!o.name && org) o.name=org;
  if(!o.phone && c.phone) o.phone=c.phone; return o; }
const tourPeople = r => numOf(tourParse(r.tour).people);
const tourNote = r => { const pay=tourPeople(r)-1; return `${String(r.org||'').trim()||'단체명'} 사전답사${pay>=1?`/${pay}명 현장 결제 필요`:''}`; };   // 답사 1명은 무료 → 2명 이상이면 (인원 − 1)명 현장 결제 필요 (2026-11-17)
const tourMemo = r => String(r.tour||'').split(/\s*,\s*/).filter(Boolean).join('\n');
const AUTO_TASKS = { erpcheck:'전산 내역 대조 (총 금액 · 할인)', tour:'사전답사 전산 예약', onsitecall:'현장 결제 인원 확인 연락', wkcheck:'다음주 예약 점검', mabang:'몽몽마방 관련 과업',progstaff:'프로그램 · 굿즈 담당 입력', staffbrief:'담당자에게 일정 전달', goodsprep:'굿즈 준비', erp:'전산 예약', erpfix:'전산 예약 수정', quote:'견적서 발급', stmt:'거래명세서 발급', tax:'세금계산서 발행', linksend:'결제링크 전송', paycheck:'입금 확인', clergy:'대구대교구 정보 기입',
  pplchk:PPL_TITLE, erpkeep:'전산 예약을 예약 내용대로 수정', prep:'단체 준비', memocheck:'통화 메모 확인' };   // memocheck = 영업 담당이 아닌 사람이 통화 메모를 고치거나 메모를 남기면 영업 담당에게 (2026-11-24)   // prep = 담당자마다 생기는 「단체 준비 : 동행 도슨트」 (실제 id 는 prep:이름 · 추후과업 메시지 관리의 「단체 준비」 하나로 이름 · 끄기 · 조건 · 마감 · 세부 과업을 정함, 2026-11-24)   // 2026-11-23: 조건이 아니라 「일이 생겼을 때」 만들어지는 자동 과업 두 개도 추후과업 메시지 관리 목록에 (이름 · 마감 · 세부 과업 · 문구 · 끄기)
// ===== 과업이 끝났는지 (2026-11-23 정리) =====
//  - 보통 과업: 사람이 체크하면 끝 (어느 화면에서든 · t.done + t.manualDone)
//  - 아래 여섯 가지는 예약 내용으로 확인한 뒤에만 끝남 (2026-11-23에 「체크만으로 완료」로 바꿨다가 같은 날 되돌림 — 요청):
//    전산 예약 = 전산 내역을 붙여넣어야 · 전산 예약 수정 = 품목 · 인원이 바뀌었으면 붙여넣어야 · 전산 내역 대조 = 총 금액 · 할인이 같아야
//    · 프로그램 · 굿즈 담당 입력 = 담당 칸이 다 차야 · 입금 확인 = 결제링크 전송을 먼저 체크해야
// 금액을 사유원(관람)과 신라(관람 외 전부)로 나눔. 관람+식사 패키지는 관람 가격만큼 사유원
// noMb: 몽몽마방 식사 금액은 빼고 (몽몽마방 결제가 '마방' = 손님이 식당에서 결제 → 전산 비고 현장결제 금액에 넣지 않음)
function moneySplit(r, noMb){
  if(r===rec && erpList.length){ const t=erpTotals(); let saw=t.saw, shilla=t.shilla; const E=erpByKey();
    if(noMb && E.m.mb){ const m=erpRowMoney('mb', E.m.mb); saw=Math.max(0, saw-m.tf); shilla=Math.max(0, shilla-m.tx); }
    // 예약 내역에는 있는데 전산 내역에 없는 품목(예: 몽몽마방 식사를 전산에 안 넣음)은 예약 칸으로 계산해 더함 — 관람은 사유원, 그 밖(식사 · 프로그램 · 굿즈)은 신라 (2026-11-16)
    erpMissing().forEach(x=>{ if(noMb && x.key==='mb') return; saw+=x.m.tf; shilla+=x.m.tx; });
    return {saw, shilla, etc:0, missing:false, erp:true}; }   // 전산 내역이 있으면 전산 금액 (세금계산서 문구 등)
  if(!quoteCat || !r.date || !numOf(r.people)) return null;
  const d=new Date(r.date+'T00:00'), viewSrc=viewSrcOf(r), vp=priceOf(viewSrc);
  let saw=0, shilla=0, missing=false;
  const {blocks, skipped} = quoteBlocks(r);
  blocks.forEach(b=>{ if(noMb && (b.key==='mb' || b.product==='몽몽마방 단품')) return; const m=blockMoney(b, r); if(!m){ missing=true; return; } saw+=m.tf; shilla+=m.tx; });   // 줄마다 비과세 = 사유원, 과세 = 신라 (할인 · 직접 고친 할인액 반영)
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
// 2026-11-19 간소화: 「프로그램 / 현장결제 / 도착시간 입장문 (영업 담당)」 — 다음날 고객 응대 준비의 비고와 같은 모양
//  - 도착시간 · 입장문은 꼭 (9시 치허문 · 10:30 곡신문, 입장문을 아직 안 정했으면 「9시 입장」) · 관람만이면 「관람」은 안 씀
//  - 런치 · 디너 · 일출(해오름) · 프로그램(시간 · 코스 · 장소 · 담당은 괄호로) · 현장결제 · 입장 때 확인할 것(특별 할인 증빙 · 학생)만
//  - 금액 · 출입구 미정 · 인원 변경 · 몽몽마방 · 굿즈 · 메모는 넣지 않음. 끝에 항상 (영업 담당 이름)
const erpShortT = t => { const m=String(t||'').replace(/\s/g,'').match(/^(\d{1,2}):?(\d{2})$/); return m ? (m[2]==='00' ? `${+m[1]}시` : `${+m[1]}:${m[2]}`) : String(t||'').trim(); };
// 프로그램 이름은 비고 규칙의 말로 (런치 · 디너 · 일출 · 일몰 · 동행도슨트 · PPT세미나 · 자체세미나) — 대관은 자체세미나(장소)
// 프로그램 시간 (2026-11-19 점검): 정시~정시 범위는 「15-16시」, 그 밖은 시작 시각만 「14:30」 · 「14시」 (규칙 예: 13:30 동행도슨트 / 15-16시 자체세미나)
const erpProgT = t => { const s=String(t||'').replace(/\s/g,''); const m=s.match(/^(\d{1,2})(?::?(\d{2}))?[~\-–](\d{1,2})(?::?(\d{2}))?/);
  if(m){ const z=v=>!v||v==='00'; return z(m[2]) && z(m[4]) ? `${+m[1]}-${+m[3]}시` : erpShortT(`${m[1]}:${m[2]||'00'}`); }
  return erpShortT(s); };
// 도슨트 코스 (2026-11-19 점검): 「앵당삼거리 시작」 → 「앵당~」 (규칙 예: 동행도슨트(앵당~, 김수정해설사))
const erpCrs = c => { const s=crsNorm(c); return s ? s.replace(/삼거리/g,'').replace(/~$/,'')+'~' : ''; };   // 출발지 → 「앵당~」 · 「치허문~」 (2026-11-19)
const ERP_PROG_NAME = { donghaeng:'동행도슨트', seminar:'PPT세미나', seminar2:'PPT세미나', haeorum:'일출', chabang:'자체세미나(차방)', dangdu:'자체세미나(당두)', yoga:'요가', sound:'사운드워킹', scent:'사유의 향' };
// 전산 비고 규칙 (2026-11-24 정리) — 추후과업 메시지 관리의 「전산 예약」 · 「전산 예약 수정」을 열면 이 글이 그대로 보임 (js/taskcfg.js). 규칙을 바꾸면 이 글도 같이 고쳐 주세요
const ERP_NOTE_RULES = `■ 모양
  항목 / 항목 / 항목 … (영업 담당 이름)
  예) 현장 결제 필요 / 10시 입장 / 12시 몽몽마방(사유의 밥상 10명) / 13시 PPT세미나(당두봉갈, 김철수 담당) / 음료쿠폰 40개 / 굿즈 고추장 2개 (홍길동)

■ 순서
  ① 맨 앞 — 시간이 없는 확인 사항: 현장 결제 필요(또는 현장 재결제 필요) → 특별 할인 증빙 → 대구대교구 시트기입 → 학생 확인
  ② 가운데 — 도착(입장)과 시간이 있는 일정을 이른 시간부터: 입장 · 몽몽마방 · 프로그램 · 대관 · 도슨트
     (시간이 있는 일정이 하나도 없으면 ①을 쓰고 도착을 그 뒤에)
  ③ 맨 뒤 — 음료쿠폰 → 굿즈
  ④ 끝에 늘 (영업 담당 이름)

■ 항목마다 쓰는 말
  · 현장 결제 필요 — 결제 방법이 「현장 결제」일 때
  · 현장 재결제 필요 — 「현장 재결제」에 체크했을 때 (결제링크로 받고 현장에서 카드로 다시 결제)
  · 특별 할인 — 「간송 할인 3명 증빙서류 확인 필요」처럼 할인마다 (가이드 무료는 안 씀)
  · 대구대교구 — 「대구대교구 2명 시트기입」
  · 학생 — 관람 · 관람+식사 줄의 학생 인원을 더해 「학생 5명 확인 필요」
  · 도착 — 입장 시각 + 입장문: 「9시 치허문」 · 「10:30 곡신문」 (입장문을 아직 안 정했으면 「9시 입장」)
  · 시각 쓰는 법 — 정시는 「9시」, 그 밖은 「10:30」 · 일정이 정시~정시면 「15-16시」, 아니면 시작 시각만
  · 몽몽마방 식사 — 「12시 몽몽마방(사유의 밥상 10명)」: 마방 시간 · 메뉴 · 인원 중 넣은 것만
  · 프로그램 · 대관 · 도슨트 — 「시간 이름(출발지, 장소, ○○○ 담당)」 · 괄호는 항목마다 하나, 안에서 쉼표로 나눔
       이름: 동행 도슨트 = 동행도슨트 · 세미나 도슨트 = PPT세미나 · 새벽 해오름 산책 = 일출 · 차방 대관 = 자체세미나(차방)
             · 당두봉갈 대관 = 자체세미나(당두) · 요가 · 사운드워킹 · 사유의 향 · 그 밖의 프로그램은 품목 이름(띄어쓰기 없이)
       도슨트 출발지: 「앵당~」 · 「치허문~」 · 세미나 도슨트 장소: (당두봉갈) · 세미나 도슨트가 2회 이상이면 회차마다 따로 한 칸
       대관(차방 · 당두봉갈)에 시작 · 끝을 더했으면 시간대마다 따로 한 칸 — 예) 10-11시 자체세미나(당두) / 15-16시 자체세미나(당두)
  · 음료쿠폰 — 「음료쿠폰 40개」
  · 굿즈 — 「굿즈 고추장 2개, 모과청 1개」 (예약 내역의 굿즈 품목 · 수량 그대로)
  · 담당자 — 예약 내역의 「담당」 칸에 고른 사람을 그 항목의 괄호 안에 「김철수 담당」으로 (2026-11-27)
       예) 13:30 동행도슨트(앵당~, 김철수 담당) · 15-16시 자체세미나(당두, 김철수 담당) · 10시 요가(김철수 담당)
           음료쿠폰 40개(김철수 담당) · 굿즈 고추장 2개, 모과청 1개(김철수 담당)
       담당이 영업 담당(끝의 괄호)과 같은 사람이면 안 씀 · 담당 칸이 비어 있어도 안 씀 · 여러 명이면 「김철수·이영희 담당」
       세미나 도슨트 2회 이상은 회차마다 담당을 따로 · 굿즈 담당은 굿즈 전체에 한 명 · 몽몽마방은 담당 칸이 없음

■ 넣지 않는 것
  사담 런치 · 디너(전산에 상품으로 있음) · 금액 · 출입구 미정 · 인원 변경 · 통화 메모 · 영업 담당과 같은 사람인 항목 담당자

■ 비고가 비는 때
  입장 시각이 아직 미정이면 비고를 만들지 않음 (입장 시각을 넣으면 생김)

■ 쓰이는 곳
  「전산 예약」 · 「전산 예약 수정」 과업의 문구 {전산비고} — 예약 내용을 바꾸면 문구도 저절로 바뀜 (과업 칸에서 직접 고친 글은 그대로)

■ 바꾸는 법
  · 앞뒤에 늘 붙일 말이 있으면: 아래 「복사 멘트」 칸에서 {전산비고} 앞이나 뒤에 적기
  · 규칙(순서 · 이름 · 쓰는 말) 자체를 바꾸려면: js/group/09-tasks.js 의 erpNote (코드) — 이 글(ERP_NOTE_RULES)도 같이 고치기`;
function erpNote(r, noMeal){   // noMeal: 「전산 예약 수정」 과업 문구는 런치 · 디너를 뺌 (2026-11-19)
  const items=[];
  const who=(r.owner||savedOwner()||'').trim();   // 끝에 항상 (영업 담당 이름)
  // 2026-11-27: 항목 담당자도 괄호 안에 「김철수 담당」 — 괄호는 항목마다 하나(쉼표로 나눔) · 영업 담당과 같은 사람이거나 비어 있으면 안 씀 · 여러 명이면 「김철수·이영희 담당」
  const stfTag = v => { const L=String(v||'').split(/\s*,\s*/).map(w=>w.trim()).filter(Boolean); return !L.length || (L.length===1 && L[0]===who) ? '' : `${L.join('·')} 담당`; };
  const withStf = (s, v) => s + (stfTag(v) ? `(${stfTag(v)})` : '');
  // 런치 · 디너는 비고에 안 씀 (2026-11-19 · 상품으로 전산에 있음). noMeal 은 예전 호출 그대로 둠
  // 2026-11-24: 몽몽마방 식사 · 음료쿠폰도 비고에 (대관 · 도슨트 · 프로그램은 예전부터) — 「12시 몽몽마방(사유의 밥상 10명)」 · 「음료쿠폰 40개」
  if(numOf(r.mabangL) || r.mabangTime){ const inner=[String(r.mabangMenu||'').trim(), numOf(r.mabangL)?`${numOf(r.mabangL)}명`:''].filter(Boolean).join(' '); items.push([erpProgT(r.mabangTime), '몽몽마방'+(inner?`(${inner})`:'')].filter(Boolean).join(' ')); }
  // 맨 뒤에 붙는 것 (2026-11-24 순서): 음료쿠폰 → 굿즈 — 시간 순 일정 뒤 · (영업 담당) 앞
  const tail=[];
  if(String(r.gaga||'').trim() && String(r.gaga).trim()!=='0') tail.push(withStf(`음료쿠폰 ${/^\d+$/.test(String(r.gaga).trim())?String(r.gaga).trim()+'개':String(r.gaga).trim()}`, r.stf_gaga));
  if(String(r.goods||'').trim() && goodsText(r)) tail.push(withStf(`굿즈 ${goodsText(r)}`, r.stf_goods));
  FIELDS.filter(f=>/^프로그램/.test(f[0]) && !isSub(f[1]) && r[f[1]] && f[1]!=='gaga').forEach(f=>{   // 음료쿠폰은 위에서 따로
    const k=f[1], sub=p=>String(r[`${p}_${k}`]||'').trim(), name=ERP_PROG_NAME[k] || String(f[2]).replace(/\s+/g,'');
    const paren=[erpCrs(sub('crs')), /\(/.test(name) ? '' : sub('plc'), stfTag(sub('stf'))].filter(Boolean).join(', ');   // 괄호 = 도슨트 출발 위치 · 장소 · 담당자 (담당자는 2026-11-27 부터) · 자체세미나(당두)처럼 이름에 장소가 있으면 장소는 빼고
    const full = /\(/.test(name) && paren ? name.replace(/\)$/, `, ${paren})`) : name+(paren?`(${paren})`:'');
    items.push([erpProgT(sub('tm')), full].filter(Boolean).join(' '));
    itemSlotTimes(r, k).forEach(v=>items.push([erpProgT(v), full].filter(Boolean).join(' ')));   // 대관에 더한 시작 · 끝: 시간대마다 따로 한 칸 (2026-11-27)
    if(k==='seminar') semXKeys(r).forEach(sk=>{ if(!(r['tm_'+sk]||r['plc_'+sk]||stfTag(r['stf_'+sk]))) return; const p2=[String(r['plc_'+sk]||'').trim(), stfTag(r['stf_'+sk])].filter(Boolean).join(', '); items.push([erpProgT(r['tm_'+sk]), name+(p2?`(${p2})`:'')].filter(Boolean).join(' ')); });   // 세미나 도슨트 2회 이상: 회차마다 따로 한 칸 (3회차부터 2026-11-27)
  });
  if(r.onsite) items.push('현장 재결제 필요'); else if(r.pay==='현장 결제') items.push('현장 결제 필요');   // 2026-11-25: 「현장 재결제」 체크면 「현장 재결제 필요」 · 2026-11-24: 「현장결제」 → 「현장 결제 필요」 (사전답사 비고의 「n명 현장 결제 필요」와 같은 말투)
  { const all=specialCounts(r), cl=all.find(s=>s.k==='dClergy'), sp=all.filter(s=>s.k!=='dClergy' && s.k!=='dGuide'); sp.forEach(s=>items.push(`${s.short} ${s.n}명 증빙서류 확인 필요`));   /* 2026-11-24: 끝에 「필요」 */ if(cl) items.push(`${cl.short} ${cl.n}명 시트기입`); }   // 입장 때 확인할 것
  { const st=viewsParse(r.views).filter(x=>/학생/.test(x.src)).reduce((a,x)=>a+(+x.qty||0),0) + Object.values(istuMap(r)).reduce((a,n)=>a+n,0); if(st) items.push(`학생 ${st}명 확인 필요`); }
  const gate = r.gate && r.gate!=='미정' ? r.gate : '';
  const arrive = r.tin ? `${erpShortT(r.tin)} ${gate || '입장'}` : '';   // 입장문을 아직 안 정했으면 「9시 입장」 · 입장 시간이 미정이면 도착은 안 씀 (2026-11-19)
  // 시간이 적힌 프로그램이 있으면 도착부터 시간 순 (13시 곡신문 / 13:30 동행도슨트 / 15:00 세미나도슨트), 없으면 맨 뒤에 도착 (런치1부 / 현장결제 / 10:30 곡신문)
  const startMin = s => { const m=String(s).match(/^(\d{1,2})(?::(\d\d))?(?=시|\s|-|~)/); return m ? +m[1]*60+(+m[2]||0) : null; };
  const timed=items.filter(s=>startMin(s)!=null), rest=items.filter(s=>startMin(s)==null);
  const parts = [...(timed.length && r.tin ? [...rest, ...[arrive, ...timed].sort((a,b)=>(startMin(a)??-1)-(startMin(b)??-1))] : [...items, arrive].filter(Boolean)), ...tail];
  if(!r.tin) return '';   // 입장 시간이 미정이면 전산 비고에 남길 것이 없음 (2026-11-19)
  return parts.join(' / ') + (who ? ` (${who})` : '');
}
// 세금계산서 발행 요청 문구
function taxMsg(r){
  const m=moneySplit(r), email=(contactsOf(r).find(c=>c.email)||{}).email;
  return `[세금계산서] ${r.org||'(단체명)'}\n1. 금액\n- 사유원 : ${m?won(m.saw):'      '}원\n- 신라 : ${m?won(m.shilla):'      '}원\n2. 사업자 등록증 : 파일 첨부\n3. 이메일 : ${email||'(담당자 이메일)'}\n4. 발행일 : ${r.date?r.date.replace(/-/g,'.')+' '+dowTag(r.date):'(방문일자)'}\n5. 실제 방문일 : ${r.date?r.date.replace(/-/g,'.')+' '+dowTag(r.date):'(방문일자)'}\n감사합니다~`;   // 5. 실제 방문일 (2026-11-19)
}
// 현장 결제 인원 확인 연락: 전주 목요일에 읽을 문구
const onsiteMsg = r => `안녕하세요, 사유원입니다. ${r.org?`<${r.org}> `:''}${r.date?mdLabel(r.date)+' ':''}방문 건으로 연락드렸습니다.\n최종 인원이 ${r.people?`총 ${r.people}명`:'몇 분'} 맞으신가요?\n현장 결제로 진행되기 때문에 당일에는 인원 변경이 어려운 점 다시 한번 안내드립니다.\n변경이 있으시면 지금 말씀해 주세요. 감사합니다.`;
// 담당자에게 일정 전달 (방문 전날): 담당자별로 맡은 프로그램 · 굿즈
function staffMsg(r){
  const by=staffBy(r), head=staffHead(r), c=contactsOf(r)[0]||{};
  return `[단체 일정 전달] ${head}\n` + Object.entries(by).map(([w,l])=>`- ${w}: ${l.join(', ')}`).join('\n') + (c.name||c.phone ? `\n고객 담당: ${[c.name,c.phone].filter(Boolean).join(' ')}` : '') + `\n영업 담당: ${(r.owner||savedOwner()||'').trim()||'-'}`;
}
const staffHead = r => [r.org&&`<${r.org}>`, r.date&&dateLabel(r.date), r.people&&`${r.people}명`, r.tin&&`입장 ${r.tin}${r.gate&&r.gate!=='미정'?' '+r.gate:''}`].filter(Boolean).join(' · ');
// 담당자 준비 과업 (2026-11-24): 프로그램 · 대관 · 도슨트 · 음료쿠폰 · 굿즈의 담당으로 고른 사람마다 「단체 준비」 과업 하나 (id prep:이름 · who = 그 사람)
//  그 사람의 나의 할일 · 첫 화면 「단체고객 전화」에 단체예약으로 나옴 (영업 담당에게는 안 보임) · 마감 = 방문 전날 · 아래 문구 = 그 사람이 맡은 것만
const prepWho = r => Object.keys(staffBy(r)).filter(w=>w!=='(담당 미정)');
function prepMsg(r, who){ const L=staffBy(r)[who]||[], c=contactsOf(r)[0]||{};
  return `[단체예약 준비] ${staffHead(r)}\n${L.map(s=>'- '+s).join('\n')}` + (c.name||c.phone ? `\n고객 담당: ${[c.name,c.phone].filter(Boolean).join(' ')}` : '') + `\n영업 담당: ${(r.owner||savedOwner()||'').trim()||'-'}`; }
// 담당 입력 규칙 (추후과업 메시지 관리 「프로그램 · 굿즈 담당 입력」을 열면 보임 · js/taskcfg.js · 2026-11-27) — 규칙을 바꾸면 이 글도 같이 (missingStaff · syncAutoTasks)
const PROGSTAFF_RULES = `■ 무엇
  예약 내역에 넣은 품목 가운데 「담당」 칸이 비어 있는 것(빨간 칸)이 하나라도 있으면, 그 예약의 추후 과업에 이 과업이 생김
  과업 이름 아래에 어느 품목의 담당이 비었는지 한 줄로 나옴 — 예) 담당이 비어 있는 칸: 요가 · 당두봉갈 대관 · 세미나 도슨트 2회차

■ 담당이 있어야 하는 품목
  개별 프로그램(요가 · 사운드워킹 · 사유의 향 등) · 시간 프로그램(차방 대관 · 당두봉갈 대관 · 동행 도슨트 · 세미나 도슨트) · 음료쿠폰 · 굿즈
  세미나 도슨트가 2회 이상이면 회차마다 담당 칸이 따로 있고, 하나라도 비면 「세미나 도슨트 n회차」로 나옴
  굿즈는 여러 줄이어도 담당이 한 명 (비어 있으면 영업 담당이 저절로 들어감)
  담당 칸이 없는 품목(관람 · 관람+식사 · 사담 · 몽몽마방)은 과업을 만들지 않음

■ 누구에게 · 언제
  그 예약의 영업 담당에게 — 나의 할일 · 첫 화면 · 과업 알림에 다른 과업과 똑같이 셈
  가예약 · 예약확정 단계에서 생김 (예약상담 · 예약취소 단계는 자동 과업이 없어 안 생김 — 가예약으로 바뀌면 그때 생김)
  마감 = 과업이 생긴 날 (아래 마감 칸에서 바꿀 수 있음)

■ 끝나는 때
  담당 칸을 모두 채우면 저절로 끝남 (직접 체크할 수 없음 — 나의 할일에서 체크 칸을 누르면 그 예약이 열림)
    · 메모 · 세부 과제를 적어 둔 과업은 「완료」로 체크되어 남고, 손대지 않은 과업은 목록에서 빠짐 (나의 할일 · 알림에서도 사라짐)
  끝난 뒤 담당이 빈 칸이 다시 생기면(품목을 더하거나 담당을 지우면) 다시 생기거나 다시 열림

■ 과업 보조 설명
  기본 「담당이 비어 있는 칸: {빈담당}」 — {빈담당} 자리에 담당이 빈 품목 이름이 들어감 · 다 채워지면 이 줄은 안 보임`;
// ===== 몽몽마방 관련 과업 (2026-11-27) =====
// 몽몽마방 식사가 들어가면 과업 하나(id mabang) + 세부 과업 넷(DOC_SUBS.mabang: time · pay · report · menu). 예전엔 따로 과업 둘: 「몽몽마방 식당에 시간 확인」(mbcall) · 「몽몽마방 메뉴 선택」(mbmenu)
// 규칙 (추후과업 메시지 관리 「몽몽마방 관련 과업」을 열면 보임 · js/taskcfg.js) — 규칙을 바꾸면 이 글도 같이
const MABANG_RULES = `■ 무엇
  예약 내역에 몽몽마방 식사(인원이나 시간)가 들어가면 과업 「몽몽마방 관련 과업」 하나가 생김
  그 아래 세부 과업 넷 — 모두 체크하면 과업이 끝남
    1. 시간 확인 — 몽몽마방 식당에 전화해 고객님이 말씀하신 시각이 되는지, 그날 예약할 수 있는 시간이 모두 언제인지 확인 (메모에 적어 두기) · 사람이 체크
    2. 결제방식 정하기 — 예약 내역 몽몽마방 줄의 「결제」에서 사무실 · 마방 · 기타를 고르면 저절로 체크 · 다시 미정으로 돌리면 풀림
    3. 마방측에 내용 보고하기 — 과업 안의 글(복사 멘트)을 복사해 식당에 보내고 사람이 체크
    4. 메뉴 선택 — 몽몽마방 줄에서 메뉴를 고르면 저절로 체크 · 메뉴를 비우면 풀림
  저절로 체크되는 두 가지는 직접 체크하거나 풀 수도 있음 (그 뒤 칸이 다시 바뀌면 칸에 맞춰짐)

■ 누구에게 · 언제
  그 예약의 영업 담당에게 (아래 담당 칸에서 바꿀 수 있음) — 나의 할일 · 첫 화면 · 과업 알림에 과업 하나로 셈
  가예약 · 예약확정 단계에서 생김 · 마감 = 과업이 생긴 날 (아래 마감 칸에서 바꿀 수 있음)
  몽몽마방 식사를 빼면: 손대지 않은 과업은 목록에서 빠지고, 직접 체크했거나 메모를 적은 과업은 남음

■ 복사 멘트 (마방측에 보고할 글)
  기본 {마방보고} = 방문일 시작 시각 단체명 인원 메뉴 + 「있습니다」 — 넣은 것만 · 예약 내용이 바뀌면 글도 바뀜
  예) 12/5(토) 12:00 중앙교육연수원 10명 사유의 밥상 있습니다
  「예약 목록 이미지 복사」 (컴퓨터에서만 보임): 오늘부터 앞으로 있는 몽몽마방 예약을 모두 표 이미지로 복사 → 메신저에 Ctrl+V 로 붙여 글과 같이 보냄
    · 이번에 보고하는 예약(지금 열어 둔 예약)은 줄 색이 다르고 「새 예약」 이름표가 붙음 · 복사가 안 되는 브라우저에서는 파일로 내려받음
  과업에서 글을 직접 고칠 수도 있음 (고친 뒤 「다시 만들기」를 누르면 예약 내용으로)

■ 다른 과업과 겹치는 것
  「다음주 예약 점검」의 세부 과업 「미정 · 몽몽마방 결제」 · 「미입력 · 몽몽마방 시간」은 그대로 있음 (고객님께 여쭤 볼 것을 모으는 줄) — 결제를 고르면 양쪽이 함께 정리됨

■ 예전 과업 (2026-11-27 전에 만들어진 예약)
  예전 「몽몽마방 식당에 시간 확인」 · 「몽몽마방 메뉴 선택」은 예약을 열 때(나의 할일에서 셀 때도) 이 과업으로 바뀜 — 메모 · 마감 · 순서 · 직접 더한 세부 과제는 그대로
    · 시간 확인을 이미 끝낸 예약 = 이 과업도 끝난 것으로 (세부 과업 모두 체크) — 끝난 일이 다시 열리지 않음
    · 아직 안 끝낸 예약 = 「시간 확인」이 안 된 채로 열려 있고, 결제방식 · 메뉴는 칸에 맞춰 체크됨
    · 예전 과업을 지워 둔 예약 = 이 과업도 안 뜸`;
// 마방측에 보고할 글 (복사 멘트 {마방보고}): 넣은 것만
//  2026-11-27 (같은 날 다시 · 운영팀이 정한 모양): 「12/3(목) 11:00 의성군가족센터 23명 사유의 밥상 있습니다」 — 방문일 · 시작 시각 · 단체명 · 인원 · 메뉴 + 「있습니다」 (결제 · 비고 · 끝 시각은 넣지 않음)
const mbReport = r => [r.date && dateLabel(r.date), String(r.mabangTime||'').split('~')[0].trim(), String(r.org||'').trim(), numOf(r.mabangL) ? numOf(r.mabangL)+'명' : '', String(r.mabangMenu||'').trim(), '있습니다'].filter(Boolean).join(' ');
// 몽몽마방 예약 목록 이미지 (2026-11-27): 보고하는 날(오늘)부터 앞으로 있는 몽몽마방 예약 모두를 표 한 장으로 → 클립보드에 복사 (메신저에 Ctrl+V 로 붙여 넣어 보고 글과 같이 보냄 · 컴퓨터에서만 — 버튼은 renderTasks)
//  자료 = 예약 현황의 몽몽마방 목록과 같음 (mbAllRows — 단체 예약의 몽몽마방 식사 + 직접 넣은 것) · 지금 열어 둔 예약(이번에 보고하는 것)은 줄 바탕색을 다르게 + 「새 예약」 이름표
async function mbListImg(){
  const today=todayYmd(), rows=mbAllRows().filter(x=>x.d && x.d>=today).sort((a,b)=>(a.d+String(a.t)).localeCompare(b.d+String(b.t)));
  const W=1020, PAD=36, FONT=getComputedStyle(document.body).fontFamily || 'sans-serif', f=(px,b)=>`${b?'700 ':''}${px}px ${FONT}`;
  const COLS=[['구분',112,'c'],['일자',130,'c'],['시간',170,'c'],['단체',0,'l'],['인원',90,'c'],['메뉴',220,'l']], TW=W-PAD*2; COLS[3][1]=TW-COLS.reduce((s,c)=>s+c[1],0);   // 「구분」 열 (2026-11-28 · 일자 앞 · 예약 현황 공유 목록과 같게 — 단체예약 / 직접 추가 · 그만큼 이미지를 넓힘)
  const probe=document.createElement('canvas').getContext('2d');
  const cut=(text,w,px,b)=>{ probe.font=f(px,b); let s=String(text||''); if(probe.measureText(s).width<=w) return s; while(s && probe.measureText(s+'…').width>w) s=s.slice(0,-1); return s+'…'; };
  const RH=56, HEAD=118, TH=52, FOOT=24, body=(rows.length||1)*RH, H=HEAD+TH+body+FOOT;
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const ctx=cv.getContext('2d'); ctx.textBaseline='middle';
  ctx.fillStyle='#f5f3ee'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#2b2a26'; ctx.font=f(32,1); ctx.fillText('몽몽마방 예약 목록', PAD, 44);
  ctx.fillStyle='#7a766b'; ctx.font=f(18); ctx.fillText(`${dateLabel(today)} 기준 · 앞으로 있을 예약 ${rows.length}건`, PAD, 86);
  if(rows.some(x=>x.cur)){ const lx=W-PAD-250; ctx.fillStyle='#ffe9b0'; ctx.fillRect(lx, 74, 26, 24); ctx.fillStyle='#8a5a00'; ctx.font=f(18,1); ctx.fillText('이번에 추가된 예약', lx+36, 86); }
  const tx=PAD, ty=HEAD;
  ctx.fillStyle='#3f5440'; ctx.fillRect(tx,ty,TW,TH);
  { let cx=tx; ctx.font=f(19,1); ctx.fillStyle='#fff'; COLS.forEach(([n,w,al])=>{ ctx.textAlign=al==='c'?'center':'left'; ctx.fillText(n, al==='c'?cx+w/2:cx+14, ty+TH/2); cx+=w; }); ctx.textAlign='left'; }
  let y=ty+TH;
  rows.forEach((x,i)=>{ const cur=!!x.cur; ctx.fillStyle = cur ? '#ffe9b0' : i%2 ? '#faf8f3' : '#fff'; ctx.fillRect(tx,y,TW,RH); if(i){ ctx.fillStyle='#ebe7dd'; ctx.fillRect(tx,y,TW,1); }
    let cx=tx; const mid=y+RH/2, ink=cur?'#5a3b00':'#2b2a26';
    { const m=!x.auto, lb=m?'직접 추가':'단체예약'; ctx.textAlign='center'; ctx.font=f(15,1); const kw=ctx.measureText(lb).width+18; ctx.fillStyle=m?'#f6ecdc':'#e7efe2'; ctx.fillRect(cx+COLS[0][1]/2-kw/2, mid-13, kw, 26); ctx.fillStyle=m?'#8a5a1c':'#4f6b3f'; ctx.fillText(lb, cx+COLS[0][1]/2, mid+1); cx+=COLS[0][1]; }   // 구분 (색 이름표)
    ctx.textAlign='center'; ctx.font=f(20,cur); ctx.fillStyle = !cur && isRedDay(x.d) ? '#b3412e' : ink; ctx.fillText(dateLabel(x.d), cx+COLS[1][1]/2, mid); cx+=COLS[1][1];
    ctx.fillStyle = x.t ? ink : '#b3412e'; ctx.fillText(x.t||'미정', cx+COLS[2][1]/2, mid); cx+=COLS[2][1];
    ctx.textAlign='left'; ctx.fillStyle=ink; ctx.font=f(21,1);
    { let ox=cx+14; if(cur){ ctx.font=f(15,1); const tw=ctx.measureText('새 예약').width+16; ctx.fillStyle='#8a5a00'; ctx.fillRect(ox, mid-13, tw, 26); ctx.fillStyle='#fff'; ctx.fillText('새 예약', ox+8, mid+1); ox+=tw+8; ctx.fillStyle=ink; ctx.font=f(21,1); }
      ctx.fillText(cut(x.n, cx+COLS[3][1]-ox-8, 21, 1), ox, mid); } cx+=COLS[3][1];
    ctx.textAlign='center'; ctx.font=f(20,cur); ctx.fillText(x.p ? x.p+'명' : '-', cx+COLS[4][1]/2, mid); cx+=COLS[4][1];
    ctx.textAlign='left'; ctx.fillText(cut(x.m||'', COLS[5][1]-22, 20, cur), cx+14, mid); y+=RH; });
  if(!rows.length){ ctx.fillStyle='#fff'; ctx.fillRect(tx,y,TW,RH); ctx.textAlign='center'; ctx.font=f(19); ctx.fillStyle='#7a766b'; ctx.fillText('앞으로 있을 몽몽마방 예약이 없습니다', tx+TW/2, y+RH/2); ctx.textAlign='left'; }
  window.__mbImgCanvas=cv;   // 마지막으로 만든 이미지 (확인용)
  return { blob: await new Promise(r=>cv.toBlob(r, 'image/png')), n:rows.length, cur:rows.filter(x=>x.cur).length }; }
async function mbListImgCopy(btn){ const txt=btn.textContent; btn.disabled=true; btn.textContent='만드는 중…';
  try{ const r=await mbListImg(); if(!r.blob){ toast('이미지를 만들지 못했습니다.'); return; }
    try{ await navigator.clipboard.write([new ClipboardItem({'image/png': r.blob})]); toast(`몽몽마방 예약 ${r.n}건을 이미지로 복사했습니다. 보낼 곳에 붙여넣으세요 (Ctrl+V).`, 3600); }
    catch(_){ bkDownload(r.blob, `몽몽마방-예약목록-${todayYmd()}.png`); toast('이미지를 복사하지 못해 파일로 내려받았습니다. 내려받은 파일을 붙여 보내 주세요.', 4200); } }
  finally{ btn.disabled=false; btn.textContent=txt; } }
document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('#taskList [data-mbimg]'); if(b) mbListImgCopy(b); });
// 예전 과업 옮기기: 저장된 예약의 mbcall(시간 확인) · mbmenu(메뉴 선택) → mabang. 예약을 열 때 · 열지 않은 예약을 셀 때(simTasks) 돌고, 저장하면 그 모양으로 남음 (자료를 한꺼번에 고치지 않음)
//  - 묶음이 아직 없으면 예전 과업을 그 자리에서 묶음으로 바꿈 (메모 · 마감 · 순서 · 파일 · 세부 과제 · 지운 표시 그대로) · 직접 고친 제목은 메모로
//  - 시간 확인을 끝낸 예약은 묶음도 끝난 것으로 (끝난 과업에 세부 과업이 더해지면 모두 체크 — syncAutoTasks 의 원래 규칙) · 사람이 끝낸 것이라 manualDone
//  - 묶음이 이미 있으면(예전 화면이 남은 브라우저가 예전 과업을 다시 만든 경우) 체크 · 메모만 합치고 예전 과업은 뺌
function mbMigrate(){ const oc=tasks.find(t=>t.id==='mbcall'), om=tasks.find(t=>t.id==='mbmenu'); if(!oc && !om) return;
  let mb=tasks.find(t=>t.id==='mabang');
  const join=(a,b)=>{ a=String(a||''); b=String(b||'').trim(); return !b || a.includes(b) ? a : [a, b].filter(Boolean).join(' / '); };
  const merge=o=>{ if(!o || o===mb) return; if(!o.removed){ mb.memo=join(mb.memo, o.titleSet ? [o.title, o.memo].filter(Boolean).join(' — ') : o.memo);
      (o.xsubs||[]).forEach(x=>{ const xs=mb.xsubs ||= []; if(!xs.some(y=>y.title===x.title)) xs.push(x); }); (o.files||[]).forEach(f=>{ const fs=mb.files ||= []; if(!fs.some(y=>y.url===f.url)) fs.push(f); }); }
    tasks.splice(tasks.indexOf(o), 1); };
  if(!mb){ mb = oc || om; const wasDone=!!(oc && oc.done);
    mb.id='mabang'; if(mb.titleSet){ mb.memo=join(mb.title, mb.memo); delete mb.titleSet; } mb.title=AUTO_TASKS.mabang; delete mb.autoDone;
    if(wasDone){ mb.done=true; mb.manualDone=1; delete mb.subs; }   // 세부 과업은 syncAutoTasks 가 모두 체크로 채움
    else { mb.done=false; mb.doneAt=''; delete mb.manualDone; mb.subs={time:false}; }
  } else if(oc && oc.done && !oc.removed && !mb.removed){ (mb.subs ||= {}).time=true; }
  merge(oc); merge(om); }
// 단체 준비 규칙 (추후과업 메시지 관리 「단체 준비」를 열면 보임 · js/taskcfg.js) — 규칙을 바꾸면 이 글도 같이
const PREP_RULES = `■ 무엇
  예약 내역에서 프로그램 · 대관 · 도슨트 · 음료쿠폰 · 굿즈의 「담당」으로 고른 사람마다 과업이 하나씩 생김
  예) 단체 준비 : 동행 도슨트 · 요가

■ 누구에게 보이나
  그 담당자의 나의 할일(단체예약 구분 · 오늘 마감) · 첫 화면 「단체고객 전화」의 그 사람 줄 · 마감 알림
  영업 담당의 나의 할일 · 첫 화면에는 안 나옴 (예약 화면의 추후 과업 목록에는 모두 보임)
  영업 담당은 「담당자에게 일정 전달」 하나 — 담당자마다 세부 과업 「김선영 : 동행 도슨트」 (모두 체크하면 완료)

■ 제목
  이 과업 이름(기본 「단체 준비」) + " : " + 그 사람이 맡은 것 이름 (같은 이름은 한 번)
  이름 칸을 바꾸면 앞말만 바뀜 (예: 「준비할 것」 → 「준비할 것 : 동행 도슨트」)

■ 마감 · 조건
  기본 마감 = 방문 전날 · 아래 마감 칸에서 바꿀 수 있음
  예약상담 · 방문일이 지난 예약은 새로 만들지 않음 · 담당이 비면 안 생김 · 담당을 바꾸면 새 사람 것으로
  「이 과업을 자동으로 만들지 않음」에 체크하면 담당자 과업이 안 생김 (「담당자에게 일정 전달」의 담당자별 세부 과업 줄은 그대로)

■ 문구 · 메모
  문구와 메모 칸은 없음 (과업 이름만) — 필요하면 아래 「과업 보조 설명」에 적기 (예: {단체명} {방문일} 입장 {입장시간})

■ 담당 고르기
  예약 내역의 담당 칸은 멤버 목록에서 고름 · 목록에 없으면 「＋ 새 멤버」로 이름만 만들고 사번 · 연락처는 멤버관리에서`;
// 제목 「단체 준비 : 동행 도슨트 · 요가」 (앞말 = 추후과업 메시지 관리의 「단체 준비」 이름 · 2026-11-24) · 문구 · 메모 칸은 없음 (담당자에게는 할 일 이름만)
const prepItems = (r, who) => (staffBy(r)[who]||[]).map(s=>s.replace(/\s+\d.*$/,'').replace(/\s*\(.*$/,'').trim()).filter((v,i,a)=>v && a.indexOf(v)===i);
const prepTitle = (r, who) => `${String(AUTO_TASKS.prep||'단체 준비').trim()} : ${prepItems(r, who).join(' · ')||'단체 일정'}`.slice(0,80);
function staffBy(r){
  const by={}, add=(who,s)=>{ String(who||'').split(/\s*,\s*/).map(w=>w.trim()).filter(Boolean).concat(String(who||'').trim()?[]:['(담당 미정)']).forEach(w=>{ (by[w] ||= []).push(s); }); };   // 담당이 여러 명이면 「문현빈, 김선영」 → 각자
  FIELDS.filter(f=>/^프로그램/.test(f[0]) && !isSub(f[1]) && r[f[1]]).forEach(f=>{ const k=f[1], v=String(r[k]), sub=p=>String(r[`${p}_${k}`]||'').trim();
    // 세미나 도슨트 2회 이상 (3회차부터 2026-11-27): 회차 담당이 1회차 담당과 다르면 그 사람에게 따로 「세미나 도슨트 1회 …」, 같거나 비었으면 1회차 줄 뒤에 이어 적음
    const sx = k==='seminar' ? semXKeys(r) : [], sxOf = sk => ({ w:String(r['stf_'+sk]||'').trim(), t:String(r['tm_'+sk]||'').trim(), p:String(r['plc_'+sk]||'').trim(), n: r===rec && itemNote(sk) ? ` (비고:${itemNote(sk)})` : '' });
    const other = sx.filter(sk=>sxOf(sk).w && sxOf(sk).w!==sub('stf')), mine = sx.filter(sk=>!other.includes(sk));
    add(sub('stf'), `${f[2]} ${/^\d+(\+\d+)*$/.test(v) ? (other.length ? (1+mine.length)+UNIT(k) : v+UNIT(k)) : v}${sub('tm')?' '+sub('tm'):''}${itemSlotTimes(r, k).map(x=>' · '+x).join('')}${sub('crs')?` (출발지:${sub('crs')})`:''}${sub('plc')?` (장소:${sub('plc')})`:''}${r===rec && itemNote(k)?` (비고:${itemNote(k)})`:''}${mine.map(sk=>{ const o=sxOf(sk); return o.t||o.p ? ` ·${o.t?' '+o.t:''}${o.p?` (장소:${o.p})`:''}${o.n}` : ''; }).join('')}`);
    other.forEach(sk=>{ const o=sxOf(sk); add(o.w, `${f[2]} 1${UNIT(k)}${o.t?' '+o.t:''}${o.p?` (장소:${o.p})`:''}${o.n}`); }); });
  if(r.goods) add(r.stf_goods, '굿즈 '+goodsText(r)+(r===rec ? goodsParse(r.goods).map(g=>itemNote('g:'+g.src)?` (${goodsName(g.src)} 비고:${itemNote('g:'+g.src)})`:'').join('') : ''));
  return by;
}
const taskAuto = t => { const base=taskAutoBase(t); return typeof tcfgNote==='function' ? tcfgNote(t, base) : base; };   // 추후과업 메시지 관리에서 고친 문구 틀이 있으면 그것 (js/taskcfg.js, 2026-11-20)
const taskAutoBase = t => t.id==='erp' ? erpNote(rec) : t.id==='erpfix' ? erpNote(rec, true) : t.id==='tax' ? taxMsg(rec) : t.id==='tour' ? tourNote(rec) : t.id==='mabang' ? mbReport(rec) : '';   // 몽몽마방 관련 과업: 마방측에 보고할 글 (2026-11-27)   // 단체 준비(prep:이름)는 문구 없음 (2026-11-24 · 예전 [단체예약 준비] 문구는 없앰)   // 사전답사 전산 예약: 전산 비고 <단체명> 사전답사(/n명 현장 결제 필요)   // 자동으로 만든 문구
const taskText = t => taskAuto(t) ? (t.noteEdit || taskAuto(t)) : '';   // 직접 고쳤으면 그 글 (전산 비고 등)
// 과업 기한(due): 생기면 그날이 기본, 각자 바꿀 수 있음(dueSet). 미정 항목 연락 = 답변일, 현장 결제 인원 확인 = 전주 목요일(지났으면 전날), 결제 확인 = 다음날
const todayYmd = () => ymd(new Date());
function autoDue(id, r){
  { const cd = typeof tcfgDue==='function' ? tcfgDue(id, r) : null; if(cd) return cd; }   // 추후과업 메시지 관리에서 만든 새 과업의 마감
  if(id==='wkcheck'){ const thu = r.date ? tbdLimit(r.date) : '';   // 다음주 예약 점검 = 방문일 전주 목요일. 미정 항목이 있고 그 답변일이 더 이르면 답변일 (2026-11-23 · 미정 항목 확인 연락을 여기로 합침)
    return r.tbd && r.tbdDate && (!thu || r.tbdDate < thu) ? r.tbdDate : (thu || todayYmd()); }
  if(id==='onsitecall') return r.date ? tbdLimit(r.date) : todayYmd();
  if(id==='paycheck') return ymd(nextDay(r.linkSent || new Date().toISOString()));   // 입금 확인 = 결제링크 보낸 다음날
  if(id==='staffbrief') return r.date ? staffFri(r.date) : todayYmd();   // 담당자에게 일정 전달 = 방문 전주 금요일 (2026-11-21 · 예전: 프로그램이 있으면 방문 주 월요일, 굿즈만이면 방문 전날)
  if(id==='goodsprep' || /^prep:/.test(id)){ if(!r.date) return todayYmd(); const d=new Date(r.date+'T00:00'); d.setDate(d.getDate()-1); return ymd(d); }   // 방문 전날 (담당자 준비 과업도)
  return todayYmd();
}
const taskDue = t => t.due || (t.at ? ymd(new Date(t.at)) : todayYmd());   // 예전 과업은 생긴 날
const DOC_SUBS = { quote:[['make','견적서 생성'],['send','견적서 전송'],['nas','견적서 NAS에 업로드']], stmt:[['make','거래명세서 생성'],['send','거래명세서 전송'],['nas','거래명세서 NAS에 업로드']] , clergy:[['ask','예약자에게 정보 요청'],['sheet','대구대교구 시트 기입']],
  mabang:[['time','시간 확인'],['pay','결제방식 정하기'],['report','마방측에 내용 보고하기'],['menu','메뉴 선택']] };   // 몽몽마방 관련 과업 (2026-11-27 · MABANG_RULES)   // 대구대교구 특별 할인이 들어가면 (2026-11-17)
const ONSITE_SUB = '현장 결제 인원 확인 연락';   // 다음주 예약 점검의 세부 과업 (현장 결제일 때 · 2026-11-23 · 예전엔 따로 과업 onsitecall)
// 방문 전주 금요일 (방문 주 월요일 − 3일). 이미 지났으면 방문일 전날, 그것도 지났으면 오늘 (전주 목요일 tbdLimit 와 같은 규칙)
function staffFri(d){ const t=new Date(d+'T00:00'); if(isNaN(t)) return todayYmd(); t.setDate(t.getDate()-((t.getDay()+6)%7)-3); const fri=ymd(t), today=todayYmd(); if(fri>=today) return fri; const p=new Date(d+'T00:00'); p.setDate(p.getDate()-1); const pd=ymd(p); return pd>=today ? pd : today; }
const staffFriName = d => d && staffFri(d)===(()=>{ const t=new Date(d+'T00:00'); t.setDate(t.getDate()-((t.getDay()+6)%7)-3); return ymd(t); })() ? '방문 전주 금요일' : '방문 전날';
const FOLLOW_DUE = new Set(['onsitecall','wkcheck','staffbrief','goodsprep','paycheck']);   // 답변일 · 방문일이 바뀌면 기한도 따라감 (직접 바꾸기 전까지)
// 예약에서 아직 안 넣은 칸 (예약 내역의 빨간 칸 · 관람 인원 · 입장시각) — 미정 항목 확인 연락의 세부 과업 (2026-11-20 · 프로그램 담당은 고객님께 묻는 것이 아니라 뺌)
function askMissing(){ const out=[];
  if(!String(rec.people||'').trim()) out.push('관람 인원'); if(!String(rec.tin||'').trim()) out.push('입장 시간');
  itemKeysFromRec().forEach(k=>{ const t=itemKind(k), nm=itemName(k);
    if(!String(itemQty(k)||'').trim() || String(itemQty(k)).trim()==='0') out.push(`${nm} ${itemUnit(k)==='명'?'인원':itemUnit(k)==='개'?'수량':'시간 수'}`);
    if(t==='mb' && !mbTimes()[0]) out.push(`${nm} 시간`);
    if(t==='prog' && !COUPON_IN_GOODS.includes(k)){ if(!tmTimes(k)[0]) out.push(`${nm} 시간`); if(FIELDS.some(f=>f[1]==='plc_'+k) && !rec['plc_'+k]) out.push(`${nm} 장소`); if(FIELDS.some(f=>f[1]==='crs_'+k) && !crsNorm(rec['crs_'+k])) out.push(`${nm} 출발지`); } });
  return out; }
function syncAutoTasks(){
  const want = [], consult = quietStage(effStage(rec));   // 예약상담은 기록용: 추후 과업 없음
  const needAsk = !!rec.tbd || askMissing().length>0;   // 미정 항목 · 아직 안 넣은 칸(빨간 칸)이 있음 → 다음주 예약 점검의 세부 과업으로 (2026-11-23 · 예전 「미정 항목 확인 연락」)   // 미정 항목 · 아직 안 넣은 칸(빨간 칸)이 있으면 연락 (2026-11-20)   // 미정 항목(결제 방법 포함)이 있으면 답변일에 연락
  // 현장 결제 인원 확인 연락: 따로 과업을 만들지 않고 다음주 예약 점검의 세부 과업으로 (2026-11-23 · 아래 ONSITE_SUB)
  if((rec.date && (rec.date>=todayYmd() || tasks.some(t=>t.id==='wkcheck'))) || needAsk) want.push('wkcheck');   // 다음주 예약 점검 (2026-11-20 · 지난 방문일은 새로 만들지 않음): 미정 · 미입력 항목이 없어도 예약마다 방문일 전주 목요일에 점검 (예전엔 나의 할일에 한 줄로 모아서)
  if(needsErp(rec)) want.push('erp', 'erpcheck');   // 전산 예약 + 전산 내역을 붙여 넣어 예약 내용과 총 금액 · 할인이 같은지 대조 (같으면 자동 완료)
  if(rec.pay==='세금계산서') want.push('tax');
  if(rec.pay==='결제링크') want.push('linksend', 'paycheck');   // 결제링크: 보내기(오늘) · 입금 확인(보낸 다음날). 예약 내용의 버튼과 서로 맞춤
  if(rec.wantQuote) want.push('quote');
  if(rec.wantStmt) want.push('stmt');
  const ms=missingStaff(rec); if(ms.length) want.push('progstaff');   // 프로그램 담당이 비면 입력하라고
  const mbNeed=mbNeedsMenu(rec);   // 몽몽마방 예약인데 메뉴를 안 고름 → 「몽몽마방 관련 과업」의 세부 과업 「메뉴 선택」 (2026-11-27 · 예전엔 따로 과업 mbmenu)
  if(rec.goods) want.push('goodsprep');   // 굿즈가 들어가면 방문 전날까지 굿즈 준비 (그날 13시 · 17시 알림)
  if(rec.date && STAFF_BASES().some(k=>rec[k])) want.push('staffbrief');   // 프로그램 · 굿즈가 있으면 담당자에게 일정 전달 (마감 = 방문 전주 금요일, 2026-11-21) (영업 담당이 직접 체크)
  // 담당자 준비 과업 (2026-11-24): 담당으로 고른 사람마다 하나 (예약상담 · 방문일이 지난 예약은 새로 만들지 않음)
  //  추후과업 메시지 관리 「단체 준비」에서 끄거나(off) 조건(when)을 바꿀 수 있음 · 메모는 쓰지 않음(예전 메모도 지움)
  const prepCfg = (typeof tcfgOf==='function' && tcfgOf('prep')) || {}, prepOn = !prepCfg.off && (!Array.isArray(prepCfg.when) || (typeof tcfgCondOk==='function' && tcfgCondOk({conds:prepCfg.when}, rec, {})));
  if(prepOn && !consult && (!rec.date || rec.date>=todayYmd() || tasks.some(t=>/^prep:/.test(t.id)))) prepWho(rec).forEach(w=>{ const id='prep:'+w; want.push(id);
    const t=tasks.find(x=>x.id===id); if(!t) tasks.push({id, who:w, title:prepTitle(rec, w), done:false, memo:'', at:new Date().toISOString(), due:autoDue(id, rec)});
    else { t.who=w; if(!t.titleSet) t.title=prepTitle(rec, w); t.memo=''; delete t.noteEdit; } });
  if(memoNew().length) want.push('memocheck');   // 통화 메모 확인 (2026-11-24 · 아래 memocheck)
  if(rec.mabangL || rec.mabangTime) want.push('mabang');   // 몽몽마방이 들어가면 「몽몽마방 관련 과업」 하나 (세부 과업: 시간 확인 · 결제방식 정하기 · 마방측에 내용 보고하기 · 메뉴 선택 — 2026-11-27 · 예전엔 따로 과업 mbcall · mbmenu)
  if((parseInt(rec.dClergy)||0)>0) want.push('clergy');   // 대구대교구 특별 할인 → 대구대교구 정보 기입 (예약자에게 정보 요청 · 대구대교구 시트 기입)
  // 전산 예약 수정: 전산 등록을 마친 뒤 인원 · 날짜 · 식사 등이 바뀌면 생김
  const e0=tasks.find(t=>t.id==='erp');
  if(e0){ e0.done=!!rec.erp;
    if(e0.done && e0.base && e0.base.v!==5){ const f0=tasks.find(t=>t.id==='erpfix'); const T=[e0.doneAt, f0&&f0.done&&f0.doneAt, /^\d{4}-\d{2}-\d{2}$/.test(rec.erp||'') ? rec.erp+'T23:59:59' : ''].filter(Boolean).sort().pop() || ''; e0.base = T ? erpBaseUp(e0.base, T) : erpSnap(); }   // 예전 기준(v:3 · v:4) → 수정 기록으로 되살림
    if(e0.done && !e0.base){ const f0=tasks.find(t=>t.id==='erpfix' && !t.done && (t.changes||[]).length && t.at); e0.base = f0 ? erpBaseUp({v:0}, new Date(new Date(f0.at).getTime()-1).toISOString()) : erpSnap(); }   // 기준이 없는데 (다음날 고객 응대 준비 등에서 생긴) 전산 예약 수정이 열려 있으면 그 전 내용을 기준으로
    if(!e0.done) delete e0.base; }
  tasks.forEach(t=>{ if(t.noteEdit && /출입구\s*미정/.test(t.noteEdit)) t.noteEdit=t.noteEdit.split(/\s+\/\s+/).filter(p=>!/^출입구\s*미정$/.test(p.trim())).join(' / ').replace(/\s*출입구\s*미정\s*\/?\s*/g,' ').trim(); });   // 예전 문구의 「출입구 미정」은 안 씀 (2026-11-19)
  tasks.forEach(t=>{ if(t.id==='erpfix' && t.noteEdit && /런치|디너/.test(t.noteEdit)) t.noteEdit=t.noteEdit.split(/\s+\/\s+/).filter(p=>!/^(런치\s*[12]부|디너)$/.test(p.trim())).join(' / '); });   // 전산 예약 수정 문구엔 런치 · 디너 안 씀
  const fixes = e0 && e0.base ? erpDiff(e0.base, erpSnap()) : [];
  if(fixes.length) want.push('erpfix');
  if(rec.tour) want.push('tour');   // 사전 답사가 잡히면 답사도 전산에 예약
  if(typeof tcfgWant==="function") tcfgWant(rec, want);
  { ['tbdcall','onsitecall'].forEach(id=>{ const i=want.indexOf(id); if(i>=0) want.splice(i,1); });   // 「미정 항목 확인 연락」 · 「현장 결제 인원 확인 연락」은 따로 만들지 않음 (다음주 예약 점검의 세부 과업)
    if(needAsk && !want.includes('wkcheck') && !(typeof tcfgOf==='function' && (tcfgOf('wkcheck')||{}).off)) want.push('wkcheck'); }   // 방문일이 아직 없어도 물어볼 것이 있으면 점검 과업   // 추후과업 메시지 관리: 끈 과업은 빼고 조건이 맞는 새 과업은 넣음 (2026-11-20)
  if(consult){ const keep=want.filter(id=>id==='tour' || id==='clergy' || id==='memocheck'); want.length=0; want.push(...keep); }   // 예약상담이면 자동 과업은 사전답사 전산 예약 · 통화 메모 확인(2026-11-26)만 (손대지 않은 것은 아래에서 빠짐)
  mbMigrate();   // 예전 몽몽마방 과업(mbcall · mbmenu) → 몽몽마방 관련 과업 (새로 만들기 전에)
  want.forEach(id=>{ if(!tasks.some(t=>t.id===id)) tasks.push({id, title:AUTO_TASKS[id], done:false, memo: id==='tour' ? tourMemo(rec) : '', ...(id==='tour' ? {memoTour:tourMemo(rec)} : {}), at:new Date().toISOString(), due:autoDue(id, rec), ...(id==='wkcheck' && editingId && rec.date && wkDone(rec.owner||savedOwner()||'', prevWeekThu(rec.date))[editingId] ? {done:true, doneAt:wkDone(rec.owner||savedOwner()||'', prevWeekThu(rec.date))[editingId]} : {})}); });   // 사전 답사 과업 메모 = 답사 정보
  if(typeof tcfgSubs==="function") tcfgSubs(tasks);
  if(typeof tcfgWhoApply==="function") tcfgWhoApply(tasks);   // 추후과업 메시지 관리의 담당 (2026-11-25)
  if(typeof tcfgOnFix==="function") tcfgOnFix(tasks);   // 다시 켠 과업: 끈 동안 지난 마감 → 다시 켠 날 (js/taskcfg.js · 2026-11-25)
  // 예약내역&전산 확인 (pplchk · 2026-11-24): 가장 최근에 붙여 넣은 전산 내역이 지금 예약 내역과 같으면(총 금액 · 할인 · erpCheck) 바뀐 내용이 이미 전산에 반영된 것 → 저절로 완료
  //  열지 않은 예약도 같음 (나의 할일 · 첫 화면) · 추후과업 메시지 관리 「전날 확인 변경 → 예약내역&전산 확인」의 📋 규칙
  { const pc=tasks.find(t=>t.id==='pplchk' && !t.removed);
    if(pc && !pc.done && (erpList||[]).length && !(typeof tcfgOf==='function' && (tcfgOf('pplchk')||{}).noAutoDone)){ let ok=false; try{ ok=erpCheck().ok; }catch(_){}
      if(ok){ pc.done=true; pc.doneAt=new Date().toISOString(); pc.autoDone=true; pc.autoWhy='가장 최근 전산 내역에 이미 반영됨'; } } }
  // 통화 메모 확인 (2026-11-24): 안 읽은 메모(영업 담당이 아닌 사람이 통화 메모를 고친 것 · 남긴 메모)가 있으면 영업 담당에게 · 누가 고쳤는지 (memoBy) · 모두 확인하면 저절로 완료 · 새로 고치면 다시 열림
  //  2026-11-26: 예약상담 · 예약취소 단계에서도 생김 (예전엔 그 단계는 자동 과업이 없어 안 떴음) · 영업 담당이 이 과업을 지운 뒤에도 누가 또 고치면 다시 생김 (예전엔 한 번 지우면 그 예약에서는 다시 안 떴음)
  { const mc0=tasks.find(t=>t.id==='memocheck');
    if(mc0 && mc0.removed){ const last=memoNew().map(m=>m.t||'').sort().pop()||''; if(last && last>(mc0.doneAt||'')){ delete mc0.removed; delete mc0.doneBy; } }   // 지운 뒤에 새로 고친 메모가 있으면 되살림 (아래에서 다시 열림)
    const mc = mc0 && !mc0.removed ? mc0 : null;
    if(mc){ const nm=memoNew(), now=new Date().toISOString();
      mc.memoBy=[...new Set(nm.map(m=>m.by))].join(', '); mc.memoAt=nm.map(m=>m.t||'').sort().pop()||'';
      if(!nm.length && !mc.done){ mc.done=true; mc.doneAt=now; mc.autoDone=true; }
      if(nm.length && mc.done && (!mc.doneAt || mc.memoAt>mc.doneAt)){ mc.done=false; mc.doneAt=''; delete mc.manualDone; delete mc.autoDone; mc.due=todayYmd(); mc.at=now; } } }
  // 담당자에게 일정 전달 (2026-11-24): 담당자마다 세부 과업 「김선영 : 동행 도슨트」 (id s:이름 · 모두 체크하면 완료 · 담당이 빠지면 그 줄도 뺌)
  { const sb=tasks.find(t=>t.id==='staffbrief' && !t.removed);
    if(sb){ const W=prepWho(rec), xs=sb.xsubs ||= [];
      W.forEach(w=>{ const ttl=`${w} : ${prepItems(rec, w).join(' · ')||'단체 일정'}`, x=xs.find(y=>y.id==='s:'+w); if(x) x.title=ttl; else { xs.push({id:'s:'+w, title:ttl, done:false}); if(sb.done && !sb.manualDone){ sb.done=false; delete sb.doneAt; } } });
      for(let i=xs.length-1;i>=0;i--) if(/^s:/.test(xs[i].id) && !W.includes(xs[i].id.slice(2)) && !xs[i].done) xs.splice(i,1); } }   // 추후과업 메시지 관리의 세부 과업 (2026-11-20)
  // 미정 항목 확인 연락 (2026-11-20): 미정 항목 + 빨간 칸(아직 안 넣은 것)을 세부 과업으로 — 하나씩 체크하며 고객님께 여쭘. 다 체크하면 완료
  { const tq=tasks.find(t=>t.id==='wkcheck' && !t.removed), old=tasks.find(t=>t.id==='tbdcall');
    if(old){   // 예전에 저장된 「미정 항목 확인 연락」: 체크해 둔 세부 과업 · 메모를 다음주 예약 점검으로 옮기고 없앰 (2026-11-23)
      if(tq && !old.removed){ const xs=tq.xsubs ||= []; (old.xsubs||[]).forEach(x=>{ if(!xs.some(y=>y.title===x.title)) xs.push(x); }); if(old.memo && !String(tq.memo||'').includes(old.memo)) tq.memo=[tq.memo, old.memo].filter(Boolean).join(' / '); }
      tasks.splice(tasks.indexOf(old), 1); }
    if(tq){ const want2=!want.includes('wkcheck') || (typeof tcfgNoAutoSubs==='function' && tcfgNoAutoSubs('wkcheck')) ? [] : [...String(rec.tbd||'').split(/\s*,\s*/).filter(Boolean).map(l=>`미정 · ${l}`), ...askMissing().map(l=>`미입력 · ${l}`)];
    const xs=tq.xsubs||[], keep=xs.filter(x=>!/^q:/.test(x.id) || want2.includes(x.title)); want2.forEach(l=>{ if(!keep.some(x=>x.title===l)){ keep.push({id:'q:'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), title:l, done:false}); if(tq.done){ tq.done=false; delete tq.doneAt; delete tq.doneBy; delete tq.autoDone; } } }); tq.xsubs=keep; }   // 점검을 끝낸 뒤에 물어볼 것이 새로 생기면 다시 열림
    // 현장 결제 인원 확인 연락 (2026-11-23): 현장 결제 예약이면 다음주 예약 점검의 세부 과업 「p:onsite」(맨 위). 예전에 따로 저장된 과업(onsitecall)은 체크 · 메모를 옮기고 없앰
    const os=tasks.find(t=>t.id==='onsitecall'), osOn = !!tq && want.includes('wkcheck') && rec.pay==='현장 결제' && !!rec.date && !(typeof tcfgNoOnsiteSub==='function' && tcfgNoOnsiteSub());
    if(tq){ const xs=tq.xsubs ||= [], i=xs.findIndex(x=>x.id==='p:onsite');
      if(osOn && i<0){ const was=!!(os && os.done && !os.removed); xs.unshift({id:'p:onsite', title:ONSITE_SUB, done:was, ...(was && os.doneAt ? {doneAt:os.doneAt} : {})});
        if(!was && tq.done && !os){ tq.done=false; delete tq.doneAt; delete tq.doneBy; delete tq.autoDone; } }   // 점검을 끝낸 뒤 현장 결제로 바뀌면 다시 열림
      if(!osOn && i>=0) xs.splice(i,1);   // 현장 결제가 아니게 되면 뺌
      if(os){ if(os.memo && !String(tq.memo||'').includes(os.memo)) tq.memo=[tq.memo, os.memo].filter(Boolean).join(' / '); tasks.splice(tasks.indexOf(os), 1); } } }
  // 방문일 · 답변일 · 결제링크 전송일을 따라가는 마감: 이미 지난 마감은 그 바탕(dueKey)이 그대로면 그대로 둠 (2026-11-21 · 예전엔 지나면 「방문일 전날 · 오늘」로 밀려 빨간 「지남」이 사라졌음)
  { const dk=[rec.date||'', rec.tbdDate||'', rec.linkSent||''].join('|'), td=todayYmd();
    tasks.forEach(t=>{ if((FOLLOW_DUE.has(t.id) || /^prep:/.test(t.id)) && !t.dueSet && !t.done){ const keep = t.due && t.due<td && (t.dueKey===undefined || t.dueKey===dk); if(!keep){ const d=autoDue(t.id, rec); if(t.due!==d) t.due=d; } t.dueKey=dk; } if(!t.due) t.due=taskDue(t); }); }
  tasks.forEach(t=>{ if(!t.custom && !t.titleSet && AUTO_TASKS[t.id] && t.title!==AUTO_TASKS[t.id]) t.title=AUTO_TASKS[t.id]; if((t.id==='pplchk' || t.id==='erpkeep') && !t.titleSet && AUTO_TASKS[t.id] && t.title!==AUTO_TASKS[t.id]) t.title=AUTO_TASKS[t.id]; });   // 추후과업 메시지 관리에서 바꾼 이름 (직접 고친 제목은 그대로)
  const fx=tasks.find(t=>t.id==='erpfix');
  if(fx && !fx.removed){ if(fixes.length){ if(fx.done){ fx.done=false; fx.at=new Date().toISOString(); fx.due=todayYmd(); delete fx.dueSet; } fx.changes=fixes; fx.v=4; } else if(!fx.done && e0 && e0.base){ fx.changes=[]; if(!(fx.xsubs||[]).length){ fx.done=true; fx.doneAt=new Date().toISOString(); fx.autoDone=true; } } }   // 예약 내용이 전산에 올린 때와 같아지면 저절로 완료 (2026-11-19)
  // 하위 과업: 견적서 · 거래명세서는 기본 3개(생성 · 전송 · NAS 업로드) + 누구나 직접 추가한 세부 과제(xsubs). 하위 과업이 있으면 모두 체크될 때 완료
  // (전산 예약 · 프로그램 담당처럼 칸을 채우면 끝나는 과업은 하위 과업과 상관없이 그 조건으로)
  // 몽몽마방 관련 과업 (2026-11-27): 세부 과업 「결제방식 정하기」 · 「메뉴 선택」은 예약 내역의 칸을 채우면 저절로 체크 (칸이 바뀐 때에만 맞춤 — 그 사이 사람이 직접 체크하거나 푼 것은 그대로)
  { const mb=tasks.find(t=>t.id==='mabang' && !t.removed), ds=DOC_SUBS.mabang||[];
    if(mb){ if(!mb.subs) mb.subs=Object.fromEntries(ds.map(([k])=>[k, !!mb.done]));
      const on=want.includes('mabang'), au=mb.au ||= {};
      [['pay', on && !!rec.mabangPay && rec.mabangPay!=='미정'], ['menu', on && !mbNeed]].forEach(([k,ok])=>{ if(!ds.some(([x])=>x===k)) return;
        if(ok && !au[k]){ au[k]=1; mb.subs[k]=true; } if(!ok && au[k]){ au[k]=0; mb.subs[k]=false; } }); } }
  tasks.forEach(t=>{ if(t.removed) return; const ds=DOC_SUBS[t.id]; if(ds && !t.subs) t.subs=Object.fromEntries(ds.map(([k])=>[k, !!t.done]));   // 삭제한 과업은 그대로
    if(ds && t.subs && t.done) ds.forEach(([k])=>{ if(!(k in t.subs)) t.subs[k]=true; });   // 추후과업 메시지 관리에서 세부 과업을 더해도 이미 끝난 과업은 다시 열리지 않게 (2026-11-21)
    if(['erp','erpcheck','progstaff'].includes(t.id)) return;
    const st=[...(ds ? ds.map(([k])=>!!t.subs[k]) : []), ...(t.xsubs||[]).map(x=>!!x.done)]; if(!st.length) return;
    const all=st.every(Boolean); if(all && !t.done){ t.done=true; t.doneAt=new Date().toISOString(); } if(!all && t.done && !t.manualDone){ t.done=false; t.doneAt=''; } });   // 위 체크로 끝낸 과업(manualDone)은 하위 과업이 남아도 완료 그대로
  tasks = tasks.filter(t=> t.custom || want.includes(t.id) || t.done || t.memo || (t.files||[]).length || (t.subs && Object.values(t.subs).some(Boolean)) || (t.xsubs||[]).some(x=>x.done || !/^c:/.test(String(x.id))));   // 조건이 사라진 자동 과업은 (손대지 않았으면) 뺌 · 추후과업 메시지 관리의 세부 과업(c:)만 있고 하나도 체크 안 한 것도 손대지 않은 것 (2026-11-26 · 예전엔 세부 과업을 정해 둔 과업은 조건이 사라져도 남았음)
  const ps=tasks.find(t=>t.id==='progstaff' && !t.removed); if(ps){ ps.done=!ms.length; ps.missing=ms.map(k=>semXName(k, rec)||LABEL[k]||k); }   // 어느 품목의 담당이 비었는지 (세미나 도슨트 2회 이상은 「세미나 도슨트 2회차」 · 2026-11-27) → 과업 보조 설명 {빈담당}
  const ec=tasks.find(t=>t.id==='erpcheck'); if(ec){ const c=erpCheck(); const was=ec.done; ec.done=c.ok; ec.check=c; if(c.ok && !was) ec.doneAt=new Date().toISOString(); if(!c.ok) ec.doneAt=''; }   // 전산 내역 대조: 맞으면 자동 완료, 다르면 다시 열림
  { const ls=tasks.find(t=>t.id==='linksend'); if(ls){ if(!rec.linkSent && ls.done && ls.manualDone){ rec.linkSent=ls.doneAt||new Date().toISOString(); touched.add('linkSent'); }   // 나의 할일 · 알림에서 체크한 것 → 전송 일시로
      ls.done=!!rec.linkSent; ls.doneAt=rec.linkSent||''; }   // 결제링크 전송 = 버튼을 누른 일시
    const pc=tasks.find(t=>t.id==='paycheck'); if(pc){ if(rec.paidAt){ pc.done=true; pc.doneAt=rec.paidAt; } else if(pc.done){ rec.paidAt=pc.doneAt||new Date().toISOString(); touched.add('paidAt'); } } }   // 입금 확인 (알림 팝업에서 완료한 것도 일시로)
  const ORDER=['tour','clergy','onsitecall','wkcheck','mabang','progstaff','staffbrief','goodsprep','erp','erpcheck','erpfix','quote','stmt','tax','linksend','paycheck'];
  // 순서: 마감일이 빠른 순, 마감일이 같으면 최근에 추가된 것이 위. 직접 옮긴 과업(ordSet)은 그 순서 그대로 두고,
  // 옮기지 않은 과업은 그 사이에 마감일에 맞게 끼워 넣음 (같은 마감일이면 직접 옮긴 것보다 위). 끝난 과업은 맨 아래
  const byNew=(a,b)=>taskDue(a).localeCompare(taskDue(b)) || String(b.at||'').localeCompare(String(a.at||''));
  const openT=tasks.filter(t=>!t.done), doneT=tasks.filter(t=>t.done).sort(byNew);
  const list=openT.filter(t=>t.ordSet).sort((a,b)=>a.ord-b.ord);
  openT.filter(t=>!t.ordSet).sort(byNew).forEach(t=>{ const d=taskDue(t); let i=list.findIndex(x=>x.ordSet && taskDue(x)>=d); if(i<0) i=list.length; list.splice(i,0,t); });
  tasks=[...list, ...doneT];
}
// 전산 예약 수정 (2026-11-19 v:5): 전산 등록(또는 전산 내역 다시 붙여넣기)을 마친 뒤 「예약 내용」이 하나라도 바뀌면 생김 (관람 인원 · 날짜 · 시간 · 식사 · 프로그램 · 결제 · 차량 …)
//  기준 = 전산에 올린 때의 예약 내용(erp 과업 base.s). 지금 내용이 기준과 같아지면(되돌리면) 전산 내역을 다시 붙여 넣지 않아도 저절로 완료
//  담당자 · 통화 메모 · 과업 · 전산 내역 · 미정 체크 · 견적서 요청 · 결제링크 · 사전답사처럼 전산 예약과 상관없는 칸은 보지 않음
const ERP_SKIP = /^(task|tmemo|tadd|tfile|tsub|tnote|tdue|tttl):|^(note|taskOrder|readDone|erp|erpList|tbd|tbdLate|tbdDate|stage|owner|wantQuote|wantStmt|linkSent|paidAt|tour|payContact|etcDiscWhy|inotes)$/;
const contentSnap = s => Object.fromEntries(Object.entries(s||{}).filter(([k,v])=>!ERP_SKIP.test(k) && !isCKey(k) && String(v??'').trim()!=='').map(([k,v])=>[k, String(v).trim()]));
const erpSnap = () => ({v:5, s:contentSnap(snap())});
// 예전 기준(v:3 · v:4)은 수정 기록으로 되살림: 전산에 올린 때(T) 뒤의 기록을 거꾸로 되돌린 내용
function erpBaseUp(b, T){ if(!b || b.v===5) return b;
  const s={...snap()}; for(let j=hist.length-1;j>=0;j--){ const h=hist[j]; if(!h || !(String(h.t||'')>T)) break; Object.entries(h.ch||{}).forEach(([k,c])=>{ if(Array.isArray(c)) s[k]=c[0]||''; }); }
  return {v:5, s:contentSnap(s)}; }
// 예약 내역(품목 · 인원 · 할인)이 전산에 올린 때와 다른지 (2026-11-19): 다르면 「전산 예약 수정」을 끝낼 때 전산 내역을 다시 붙여넣음, 아니면 체크만
const ERP_ITEM_KEY = k => ['people','istu','views','viewN','viewSrc','sadam1','sadam2','sadamD','mabangL','mabangD','mabangMenu','goods','idisc','isp','idamt','etcDisc','etcDiscTo','etcDiscTx','etcDiscTf'].includes(k) || PROG_KEYS().includes(k) || SPECIAL.some(s=>s.k===k);
function erpItemsChanged(){ const e0=tasks.find(t=>t.id==='erp'); if(!e0 || !e0.base || e0.base.v!==5) return true;
  const a=e0.base.s||{}, b=contentSnap(snap()); return [...new Set([...Object.keys(a), ...Object.keys(b)])].some(k=>ERP_ITEM_KEY(k) && (a[k]||'')!==(b[k]||'')); }
const erpDiff = (a,b) => { if(!a || a.v!==5 || !a.s) return [];
  return [...new Set([...Object.keys(a.s), ...Object.keys(b.s)])].filter(k=>(a.s[k]||'')!==(b.s[k]||'')).map(k=>{ const l=LABEL[k]||k, x=a.s[k]||'', y=b.s[k]||''; if(k==='views') return '관람 품목 · 인원이 바뀜'; return !x ? `${l} ${y} 입력` : !y ? `${l} ${x} 지움` : `${l} ${x} → ${y}`; }); };
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
const consultTask = t => t.id==='tour' || t.id==='clergy' || t.id==='memocheck' || t.custom;   // 예약상담에서 보이는 과업: 사전답사 전산 예약 + 통화 메모 확인(2026-11-26 · 예약상담 · 예약취소에서도 뜸) + 직접 추가한 과업
function renderTasks(){
  syncAutoTasks();
  const consultOnly = quietStage(effStage(rec));   // 예약상담: 자동 과업은 없고(사전답사 전산 예약만) 직접 추가한 과업은 그대로
  $('#taskAdd').hidden = false;
  const shownTasks = (consultOnly ? tasks.filter(consultTask) : tasks).filter(t=>!t.removed);   // 삭제한 자동 과업(removed)은 숨김 (다시 생기지 않게 기록만 남김)
  if(consultOnly && !shownTasks.length){ paintDocBtns(); $('#taskList').innerHTML='<li class="hint" style="list-style:none;margin:0">예약상담은 자동으로 생기는 과업이 없습니다. 필요한 일은 위 칸에 직접 추가해 주세요.</li>'; $('#taskHint').textContent=''; return; }
  paintDocBtns();
  const box=$('#taskList'), ae=document.activeElement, focus=box.contains(ae) && (ae.tagName==='TEXTAREA' || (ae.tagName==='INPUT' && ae.type!=='checkbox' && !ae.readOnly && !ae.classList.contains('dpick')));   // 메모 · 글자 칸에 쓰는 중일 때만 다시 그리지 않음
  const changeTag = t => { const txt=taskText(t); return !t.copied ? '' : t.copied===txt ? '<span class="hint" style="margin:0">붙여넣은 내용과 같음</span>' : '<span class="chg">예약 내용이 바뀜 · 다시 복사해서 붙여넣기</span>'; };
  if(focus){   // 메모를 쓰는 중이면 문구만 새로
    tasks.forEach(t=>{ const pre=document.getElementById('tpre_'+t.id); if(pre && document.activeElement!==pre) pre.value=taskText(t); const c=document.getElementById('tchg_'+t.id); if(c) c.innerHTML=changeTag(t); });
    return;
  }
  const SUB = { erp:'전산에 예약을 등록하고, 아래 문구를 전산 비고에 붙여넣은 뒤 체크하세요.', tax:'고객 안내 후, 아래 내용으로 세금계산서 발행을 요청하세요.',
    quote:'아래 세 가지를 모두 체크하면 완료됩니다. 버튼을 누르면 견적서 사이트에 예약 내용이 채워집니다. 출력하면 「견적서 생성」이 체크되고, 출력한 내용은 견적서 사이트 발급 내역에서 봅니다.',
    stmt:'아래 세 가지를 모두 체크하면 완료됩니다. 버튼을 누르면 거래명세서로 채워집니다. 출력하면 「거래명세서 생성」이 체크되고, 출력한 내용은 견적서 사이트 발급 내역에서 봅니다.' };
  box.innerHTML = shownTasks.map(t=>{
    const txt=taskText(t);
    const sub = t.id==='paycheck' ? (rec.paidAt ? `입금 확인 ${esc(dtLabel(rec.paidAt))}` : rec.linkSent ? `결제링크를 ${esc(dtLabel(rec.linkSent))}에 보냈습니다. 입금되면 예약 내용의 <b>「입금 확인」</b>을 누르거나 체크하세요 (누른 일시가 기록됩니다). 보낸 다음날(${mdLabel(ymd(nextDay(rec.linkSent)))}) 아침에 이 창을 열면 확인 알림이 뜹니다.` : '결제링크를 먼저 보내세요 (결제링크 전송). 입금되면 예약 내용의 <b>「입금 확인」</b>을 누르거나 체크하세요.')
      : t.id==='linksend' ? (rec.linkSent ? `결제링크 전송 ${esc(dtLabel(rec.linkSent))}` : '고객님께 결제링크를 보내고, 예약 내용 결제 칸 아래 <b>「결제링크 전송」</b>을 누르거나 체크하세요 (누른 일시가 기록됩니다).')
      : t.id==='tour' ? `사전 답사를 사유원 전산에 예약하고 체크하세요. 답사 정보는 아래 메모에 있습니다.`
      : t.id==='wkcheck' ? `기한(${esc(mdLabel(taskDue(t)))} · ${t.dueSet || !rec.date ? '직접 정한 날' : tbdLimitName(rec.date)})에 이 예약을 점검하고 체크하세요. 인원 · 입장 시간 · 식사 · 프로그램 · 결제 · 전산 내역이 맞는지, 미정 · 미입력 항목이 남았는지 확인합니다.` + (rec.tbd ? `<br>미정: <b>${esc(rec.tbd)}</b>${rec.tbdDate ? ` · 답변일 ${esc(mdLabel(rec.tbdDate))}` : ''} — 고객님께 연락해 확인하고, 정해진 내용을 칸에 채운 뒤 아래 세부 과업을 하나씩 체크하세요.` : '')
          + ((t.xsubs||[]).some(x=>x.id==='p:onsite') ? `<br>현장 결제 예약: 고객님께 연락해 <b>최종 인원</b>을 확인하고, <b>당일 인원 변경이 어렵다는 점</b>을 다시 한번 안내한 뒤 「${ONSITE_SUB}」를 체크하세요.` : '')
      : t.id==='onsitecall' ? `현장 결제 예약입니다. 기한(${esc(mdLabel(taskDue(t)))} · ${t.dueSet || !rec.date ? '직접 정한 날' : tbdLimitName(rec.date)})에 고객님께 연락해 <b>최종 인원</b>을 확인하고, <b>당일 인원 변경이 어렵다는 점</b>을 다시 한번 안내하세요.`
      : t.id==='goodsprep' ? `굿즈: <b>${esc(goodsText(rec)||'없음')}</b>${goodsParse(rec.goods).map(g=>itemNote('g:'+g.src)?` · ${esc(goodsName(g.src))} 비고: ${esc(itemNote('g:'+g.src))}`:'').join('')}<br>방문 전날(${esc(rec.date?mdLabel(taskDue(t)):'방문일 미정')})까지 준비하고 체크하세요. 그날 13시 · 17시에 알림이 뜹니다.`
      : /^prep:/.test(t.id) ? `<b>${esc(t.who||t.id.slice(5))}</b> 님 담당 — 맡은 것을 방문 전날(${esc(rec.date?mdLabel(taskDue(t)):'방문일 미정')})까지 준비하고 체크하세요. 이 과업은 ${esc(t.who||t.id.slice(5))} 님의 나의 할일 · 첫 화면 「단체고객 전화」에 단체예약으로 나옵니다.`
      : t.id==='memocheck' ? `<b>${esc(t.memoBy||'다른 직원')}</b>님이 통화 메모를 고쳤거나 메모를 남겼습니다${t.memoAt?` (${esc(dtLabel(t.memoAt))})`:''}. 통화 메모를 확인하고 체크하세요 — 체크하면 아래 새 메모가 모두 「확인함」으로 바뀝니다.`
      : t.id==='staffbrief' ? `${staffFriName(rec.date)}(${esc(rec.date?mdLabel(taskDue(t)):'방문일 미정')}) 각 담당자에게 아래 일정을 전달하고 체크하세요. 영업 담당이 이 예약의 프로그램 · 굿즈를 모두 챙깁니다.`
      : t.id==='progstaff' ? ((t.missing||[]).length ? `담당이 비어 있는 칸: <b>${esc(t.missing.join(' · '))}</b><br>프로그램 · 굿즈 옆 <b>담당</b>에 이름을 넣으면 자동으로 완료됩니다. (개별 · 시간 프로그램 · 굿즈 모두 담당 필수)` : '프로그램 · 굿즈 담당을 모두 넣었습니다.')
      : t.id==='erpcheck' ? (!erpList.length ? '전산에 예약을 넣은 뒤 <b>전산 내역을 붙여 넣어</b> 실제 예약이 이 예약 내용과 같은지 확인하세요. <b>할인 합계</b>와 <b>총 금액</b>이 같으면 저절로 완료됩니다.'
          : `<span class="erp-ck">${erpCheckHTML(erpCheck())}</span><br>${t.done ? '전산 내역과 예약 내용이 같습니다.' : '다른 곳을 전산이나 예약 내용에서 고친 뒤 전산 내역을 다시 붙여 넣으세요 (예약 내역 줄의 할인 · 기타 할인 · 인원 확인).'}`)
      : t.id==='erpfix' ? ((t.changes||[]).length ? `전산 등록 후 바뀐 내용: <b>${esc(t.changes.join(' · '))}</b><br>전산 예약을 고치고 비고도 새 문구로 바꾼 뒤 체크하세요.${erpItemsChanged() ? ' <b>예약 내역(품목 · 인원 · 할인)이 바뀌어</b> 체크하면 전산 내역을 다시 붙여넣습니다.' : ''}` : '전산에 반영했습니다.')
      : t.id==='pplchk' ? `인원수 변경에 따른 예약 내역 확인${t.pplFrom||t.pplTo ? ` (관람 인원 ${esc(t.pplFrom||'?')}명 → ${esc(t.pplTo||'?')}명)` : ''}${t.done && t.autoDone ? ' — <b>자동 완료</b> (가장 최근 전산 내역에 이미 반영됨)' : !t.done ? ' — 전산 내역을 붙여 넣어 예약 내역과 같으면 저절로 완료됩니다' : ''}`
      : SUB[t.id] || '';
    const docBtn = (t.id==='quote'||t.id==='stmt') ? `<div class="tbtn"><button type="button" class="btn" data-tquote="${t.id==='stmt'?'statement':'quote'}">${t.id==='stmt'?'거래명세서 만들기':'견적서 만들기'}</button></div>` : '';
    // 견적서 · 거래명세서 파일 링크는 안 보임 (출력한 내용은 견적서 사이트 발급 내역에서, 2026-11-21)
    const files = !['tax','quote','stmt'].includes(t.id) && (t.files||[]).length ? `<div class="tfiles">${t.files.map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener">📄 ${esc(f.name)}</a>`).join('')}</div>` : '';
    const due=taskDue(t), late=!t.done && due<todayYmd(); const subsDone=taskSubsDone(t), fold=t.done && subsDone && !openDone.has(t.id);   // 아래 하위 과업 · 세부 과제가 다 체크돼야 접힘   // 끝난 과업은 첫 줄만 (누르면 펼침)
    return `<li class="task${t.done?' done':late?' late':''}${fold?' collapsed':''}${t.who && t.who===savedOwner() && String(rec.owner||'').trim()!==savedOwner() ? ' tk-mine' : ''}" data-id="${esc(t.id)}">
      <div class="task-h">${t.done?'':`<span class="tdrag" title="끌어서 순서 바꾸기">⠿</span>`}<span class="task-c"><input type="checkbox" data-tk="${esc(t.id)}"${t.done?' checked':''} title="체크하면 완료"><input class="ttl" data-tttl="${esc(t.id)}" value="${esc(t.title)}" data-ime="ko" spellcheck="false" autocomplete="off" title="눌러서 제목 고치기 (Enter로 확정)"></span>${t.who && t.who!==String(rec.owner||"").trim() ? `<span class="tk-whotag" title="이 과업을 할 사람 (영업 담당이 아님 · 그 사람의 나의 할일에 나옴)">👤 ${esc(t.who)}</span>` : ""}${t.done && subsDone?`<button type="button" class="texp" data-texp="${esc(t.id)}">${fold?'자세히 ▾':'접기 ▴'}</button>`:''}
        <label class="tdue" title="마감일 · 바꿀 수 있음">${late?'기한 지남 ':due==='9999-12-31'?'마감 없음 ':'마감 '}${dboxHTML(`data-tdue="${esc(t.id)}"`, due==="9999-12-31" ? "" : due)}</label><button type="button" class="tsave" data-tsave="${esc(t.id)}" title="이 과업의 고친 내용(체크 · 제목 · 마감일 · 메모 · 세부 과제)을 지금 저장">저장</button><button type="button" class="del" data-tdel="${esc(t.id)}" title="이 과업 삭제 (확인 뒤)" aria-label="과업 삭제">×</button></div>
      ${typeof tcfgDescHTML==='function' ? tcfgDescHTML(t) : (t.id==='pplchk' && pplChanges(t).length ? `<div class="tk-chg tchg-line">바뀐 내용: ${pplChanges(t).map(esc).join(' · ')}</div>` : '')}${t.id==='memocheck'?memoTaskList():''}${subsHTML(t)}${docBtn}${files}
      ${txt?`<textarea class="tnote${t.noteEdit?' edited':''}" id="tpre_${esc(t.id)}" data-tnote="${esc(t.id)}" spellcheck="false" title="자동으로 만든 문구 · 직접 고칠 수 있음">${esc(txt)}</textarea><div class="tbtn"><button type="button" class="btn" data-tcopy="${esc(t.id)}">${t.id.startsWith('erp')||t.id==='tour'?'비고 문구 복사':'문구 복사'}</button>${t.id==='mabang' && innerWidth>=700 && !matchMedia('(pointer:coarse)').matches ? `<button type="button" class="btn" data-mbimg="1" title="오늘부터 앞으로 있는 몽몽마방 예약을 모두 표 이미지로 복사합니다 (이 예약은 다른 색) · 메신저에 Ctrl+V 로 붙여넣기">예약 목록 이미지 복사</button>` : ''}${t.noteEdit?`<button type="button" class="btn" data-tregen="${esc(t.id)}" title="고친 내용을 버리고 예약 내용으로 다시 만들기">다시 만들기</button><span class="hint" style="margin:0">직접 고친 문구</span>`:''}<span id="tchg_${esc(t.id)}">${changeTag(t)}</span></div>`:''}
      ${t.id==='tax' ? `<div class="tfiles">${(t.files||[]).map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener">📄 ${esc(f.name)}</a>`).join('')}
        <label class="btn up${upBusy?' busy':''}">${upBusy?'올리는 중…':(t.files||[]).length?'사업자등록증 추가로 올리기':'사업자등록증 올리기'}<input type="file" data-tup="${esc(t.id)}" accept="image/*,application/pdf" hidden${upBusy?' disabled':''}></label>
        <span class="hint" style="margin:0">사진 · PDF, 10MB 이하 · 구글 드라이브 '사유원 단체예약 서류' 폴더에 저장</span></div>` : ''}
      ${/^prep:/.test(t.id) ? "" : `<textarea data-tm="${esc(t.id)}" placeholder="메모">${esc(t.memo||"")}</textarea>`}   <!-- 단체 준비 과업은 메모 칸 없음 (2026-11-24) -->
    </li>`; }).join('');
  $('#taskHint').textContent = tasks.length ? (editingId ? '체크와 복사는 바로 저장됩니다. 메모는 칸을 벗어나면 저장됩니다.' : '저장하면 과업도 함께 저장됩니다.') : '';
  if(typeof paintDirty==='function' && window.__autoReady) paintDirty();   // 다시 그린 과업 「저장」에도 노란 점
}
const autoSave = () => { if(editingId) save({auto:true}); };   // 과업 체크 · 메모 등은 바로 자동 저장 (수정 기록은 이 세션 줄에 모임)
// 사업자등록증 올리기 → 서버가 DB(files · file_chunks 표)에 저장하고 링크(/file/…)를 돌려줌 (2026-11-23 전에는 구글 드라이브) → 과업에 링크 보관
let upBusy=false;
async function uploadFile(t, file){
  if(!getKey()){ toast('공유 기록에 연결된 뒤에 올릴 수 있습니다.'); return; }
  if(!/^(image\/|application\/pdf$)/.test(file.type)){ toast('사진이나 PDF만 올릴 수 있습니다.'); return; }
  if(file.size > 10*1024*1024){ toast('10MB 이하 파일만 올릴 수 있습니다.'); return; }
  upBusy=true; renderTasks();
  try{
    const data = await new Promise((ok,no)=>{ const fr=new FileReader(); fr.onload=()=>ok(String(fr.result).split(',')[1]); fr.onerror=()=>no(fr.error); fr.readAsDataURL(file); });
    const j = await SY.call({action:'upload', name:file.name, mime:file.type, data, org:rec.org||'', date:rec.date||'', kind:'사업자등록증'});
    (t.files ||= []).push({name:j.file.name, url:j.file.url, at:j.file.at});
    toast(editingId ? '올렸습니다.' : '올렸습니다. 예약을 저장하면 링크가 함께 저장됩니다.');
    upBusy=false; renderTasks(); autoSave();
  }catch(e){
    upBusy=false; renderTasks();
    toast('올리지 못했습니다: '+e.message);
  }
}
$('#taskList').addEventListener('change', e=>{
  const tt=e.target.dataset.tttl; if(tt){ const t=tasks.find(x=>x.id===tt); if(!t) return; const v=e.target.value.trim(); if(!v){ e.target.value=t.title; return; } if(v!==t.title){ t.title=v; t.titleSet=1; startTimer(); renderSide(); autoSave(); } return; }   // 과업 제목 고치기 (제목을 눌러서)
  const xs=e.target.dataset.xsub; if(xs){ const [tid,xid]=xs.split('|'), t=tasks.find(x=>x.id===tid), x=t && (t.xsubs||[]).find(s=>s.id===xid); if(x){ x.done=e.target.checked; renderTasks(); renderSide(); autoSave(); } return; }   // 직접 추가한 세부 과제 체크
  const ts=e.target.dataset.tsub; if(ts){ const [tid,k]=ts.split('|'), t=tasks.find(x=>x.id===tid); if(t){ t.subs=t.subs||{}; t.subs[k]=e.target.checked; renderTasks(); renderSide(); autoSave(); } return; }   // 하위 과업 체크
  const du=e.target.dataset.tdue; if(du){ const t=tasks.find(x=>x.id===du); if(t && !e.target.value){ t.due='9999-12-31'; t.dueSet=1; t.dueSetAt=new Date().toISOString(); e.target.blur(); renderTasks(); renderSide(); autoSave(); return; }   // 달력의 「삭제」 = 마감 없음 (2026-11-24 · 9999-12-31 = 맨 아래 · 지남 아님)
    if(t && e.target.value){ t.due=e.target.value; t.dueSet=1; t.dueSetAt=new Date().toISOString(); e.target.blur(); renderTasks(); renderSide(); autoSave(); } return; }   // 마감일 바꾸기
  const up=e.target.dataset.tup;
  if(up){ const t=tasks.find(x=>x.id===up), f=e.target.files[0]; if(t && f) uploadFile(t, f); return; }
  const id=e.target.dataset.tk; if(!id) return; const t=tasks.find(x=>x.id===id); if(!t) return;
  if(id==='erpcheck'){ e.target.checked=!!t.done; $('#erpPasteBtn')?.click(); return; }   // 체크 = 전산 내역 붙여넣는 칸을 엶 (맞으면 저절로 완료, 2026-11-20)
  if((id==='erp' || (id==='erpfix' && erpItemsChanged())) && e.target.checked){ e.target.checked=false; askErpForTask(id); return; }   // 전산 예약 완료 = 전산 내역을 붙여넣어 예약 내용과 맞는지 확인한 뒤 · 전산 예약 수정은 예약 내역(품목 · 인원 · 할인)이 바뀐 때만 (2026-11-19, 그 밖엔 체크만)
  if(id==='paycheck' && e.target.checked && !rec.linkSent){ e.target.checked=false; toast('결제링크 전송을 먼저 체크해 주세요. (결제링크를 보내기 전에는 입금 확인을 할 수 없습니다)'); return; }   // 결제링크 전송 전에는 입금 확인 불가
  if(id==='linksend' && !e.target.checked && rec.paidAt){ if(!confirm('결제링크 전송을 해제하면 입금 확인도 함께 해제됩니다. 계속할까요?')){ e.target.checked=true; return; } rec.paidAt=''; touched.add('paidAt'); const pc=tasks.find(x=>x.id==='paycheck'); if(pc){ pc.done=false; pc.doneAt=''; delete pc.manualDone; } }   // 결제링크를 다시 보낼 때: 입금 확인도 함께 해제
  t.done=e.target.checked; t.doneAt=t.done?new Date().toISOString():'';
  if(t.done){ t.manualDone=1; t.doneBy=savedOwner()||'';   // 맨 위 체크 = 아래 세부 과업(기본 하위 과업 · 직접 추가한 세부 과제)도 모두 처리한 것으로 (2026-11-23 · 나의 할일에서 완료할 때와 같게)
    const ds=DOC_SUBS[t.id]||[]; if(ds.length || t.subs){ t.subs=t.subs||{}; ds.forEach(([k])=>{ t.subs[k]=true; }); Object.keys(t.subs).forEach(k=>{ t.subs[k]=true; }); }
    (t.xsubs||[]).forEach(x=>{ x.done=true; }); }
  else { delete t.manualDone; if(taskDue(t)<todayYmd()){ t.due=todayYmd(); t.dueSet=1; t.dueSetAt=new Date().toISOString(); }   /* 다시 열면 마감이 지났어도 오늘 마감 (2026-11-19) */ if(t.subs) Object.keys(t.subs).forEach(k=>t.subs[k]=false); (t.xsubs||[]).forEach(x=>x.done=false); }   // 끄면 세부 과업도 모두 해제 (2026-11-18)
  if(id==='memocheck' && t.done){ const me=savedOwner()||'', now=new Date().toISOString(); memos=memos.map(m=>!m.seen && m.by!==me ? {...m, seen:true, seenAt:now} : m); if(typeof paintLock==='function') paintLock(); if(typeof paintMemoCount==='function') paintMemoCount(); }   // 통화 메모 확인을 체크 = 안 읽은 메모를 모두 읽음으로 (2026-11-24)
  if(id==='erp'){ rec.erp = t.done ? ymd(new Date()) : ''; touched.add('erp'); }
  if(id==='linksend' || id==='paycheck'){ const k=id==='linksend'?'linkSent':'paidAt'; rec[k] = t.done ? t.doneAt : ''; touched.add(k); paintFields(); }   // 과업 체크 = 예약 내용 버튼도 (일시 기록)
  if(id==='erpfix' && t.done){ const e=tasks.find(x=>x.id==='erp'); if(e) e.base=erpSnap(); t.changes=[]; }   // 전산에 고친 지금 내용을 기준으로
  renderSide(); autoSave();
});
$('#taskList').addEventListener('click', e=>{
  const rg=e.target.closest('[data-tregen]'); if(rg){ const t=tasks.find(x=>x.id===rg.dataset.tregen); if(t){ t.noteEdit=''; renderTasks(); renderSide(); autoSave(); toast('예약 내용으로 문구를 다시 만들었습니다.'); } return; }
  const tx=e.target.closest('[data-texp]'); if(tx){ const id=tx.dataset.texp; openDone.has(id) ? openDone.delete(id) : openDone.add(id); tx.blur(); renderTasks(); return; }   // 끝난 과업 펼치기 / 접기
  const xd=e.target.closest('[data-xdel]'); if(xd){ const [tid,xid]=xd.dataset.xdel.split('|'), t=tasks.find(x=>x.id===tid); if(t){ t.xsubs=(t.xsubs||[]).filter(s=>s.id!==xid); renderTasks(); renderSide(); autoSave(); } return; }   // 세부 과제 빼기
  const xb=e.target.closest('[data-xaddbtn]'); if(xb){ addXsub(xb.dataset.xaddbtn); return; }
  const mv=e.target.closest('[data-tmv]'); if(mv){ const [id,dir]=mv.dataset.tmv.split('|'), consult=quietStage(effStage(rec));   // 과업 순서 바꾸기 (안 끝난 과업끼리)
    const open=tasks.filter(t=>!t.done && (!consult || consultTask(t))), i=open.findIndex(t=>t.id===id), j=i+(+dir);
    if(i<0 || j<0 || j>=open.length) return; [open[i],open[j]]=[open[j],open[i]]; open.forEach((t,k)=>{ t.ord=k*10; t.ordSet=1; });
    renderTasks(); autoSave(); return; }
  const sv=e.target.closest('[data-tsave]'); if(sv){ document.activeElement?.blur(); setTimeout(()=>{ if(!editingId && !canSave()){ toast('업체나 방문일을 먼저 입력하세요.'); return; } save(true); },0); return; }   // 과업마다 「저장」: 고치던 칸을 확정하고 바로 저장 (자동 저장도 그대로)
  const c=e.target.dataset.tcopy, d=e.target.dataset.tdel, q=e.target.dataset.tquote;
  if(q){ openQuote(q); return; }
  if(c){ const t=tasks.find(x=>x.id===c); const txt=taskText(t); copy(txt, '복사했습니다. 붙여넣으세요.'); t.copied=txt; renderTasks(); autoSave(); }
  if(d){ e.preventDefault(); document.activeElement.blur(); const t=tasks.find(x=>x.id===d); if(!t) return;   // 삭제: 확인 팝업 → 직접 추가한 과업은 지우고, 자동 과업은 다시 생기지 않게 숨김(removed · 완료로)
    askDelete(`「${t.title}」 과업을 정말로 삭제할 건가요?`, ()=>{ if(t.custom) tasks=tasks.filter(x=>x.id!==d); else { t.removed=1; t.done=true; t.doneAt=new Date().toISOString(); t.doneBy=savedOwner()||''; } renderTasks(); renderSide(); autoSave(); toast('과업을 삭제했습니다.'); }); }
});
// 과업 순서: 왼쪽 ⠿ 를 잡고 끌어서 놓기 (안 끝난 과업끼리, ▲▼ 와 같은 순서 값)
let dragId=null;
const dragOpen = () => { const consult=quietStage(effStage(rec)); return tasks.filter(t=>!t.done && (!consult || consultTask(t))); };
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
$('#taskList').addEventListener('keydown', e=>{ if(e.target.dataset.tttl!==undefined){ if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); e.target.blur(); } else if(e.key==='Escape'){ const t=(typeof taskOf==='function'?taskOf:(id=>tasks.find(x=>x.id===id)))(e.target.dataset.tttl); if(t) e.target.value=t.title; e.target.blur(); } } });   // 과업 제목: Enter = 확정, Esc = 되돌리기
$('#taskList').addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.isComposing && e.target.dataset.xadd!==undefined){ e.preventDefault(); addXsub(e.target.dataset.xadd); } });   // 세부 과제: 적고 Enter
$('#taskList').addEventListener('input', e=>{ const id=e.target.dataset.tnote; if(!id) return; const t=tasks.find(x=>x.id===id); if(!t) return; t.noteEdit=e.target.value; e.target.classList.add('edited'); startTimer(); });   // 문구 직접 고치기
$('#taskList').addEventListener('focusout', e=>{ const id=e.target.dataset.tnote; if(!id) return; const t=tasks.find(x=>x.id===id); if(!t) return; if(e.target.value.trim()===taskAuto(t).trim()) t.noteEdit=''; setTimeout(()=>{ renderTasks(); autoSave(); },0); });   // 자동 문구와 같아지면 자동으로
$('#taskList').addEventListener('input', e=>{ const id=e.target.dataset.tm; if(!id) return; const t=tasks.find(x=>x.id===id); if(t) t.memo=e.target.value; });
$('#taskList').addEventListener('focusout', e=>{ if(e.target.dataset.tm!==undefined) autoSave(); });
$('#taskAdd').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#taskAddIn').value.trim(); if(!v) return;
  tasks.push({id:'c'+Date.now().toString(36), title:v, custom:true, done:false, memo:'', at:new Date().toISOString(), due:todayYmd()}); $('#taskAddIn').value=''; renderTasks(); autoSave(); });   // 마감은 오늘 (바꿀 수 있음)
// 통화 메모: 칠 때마다 과업 · 자동 저장 계산을 하면 느려져서, 치기를 멈추고 0.4초 뒤에 한 번만 (한글 조합 중에는 안 함)
let memoT=0;
$('#memoBox').addEventListener('input', e=>{ clearTimeout(memoT); if(e.isComposing) return; memoT=setTimeout(()=>{ renderTasks(); if(window.__autoReady){ scheduleAuto(); saveViewSoon(); } }, 400); });
$('#memoBox').addEventListener('compositionend', ()=>{ clearTimeout(memoT); memoT=setTimeout(()=>{ renderTasks(); if(window.__autoReady){ scheduleAuto(); saveViewSoon(); } }, 400); });
$('#memoBox').addEventListener('blur', ()=>{ if(!memoT) return; clearTimeout(memoT); memoT=0; renderTasks(); if(window.__autoReady){ scheduleAuto(); saveViewSoon(); } });   // 칸을 나가면 바로

// 견적서 사이트가 출력 후 드라이브에 올린 파일 링크를 같은 사이트 저장소(sy_intake_docs)로 돌려줌 → 그 예약의 견적서/거래명세서 과업에 붙이고 완료
const DOCS_LS='sy_intake_docs';
let takingDocs=false;
async function takeDocs(){
  if(BOOK_ONLY) return;   // 예약 현황 공유 페이지에서는 안 함
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
      const ph=parseHist(r); attach(ph.tasks); ph.h.push({t:now, by:savedOwner()||'', what:`[과업] ${title} 출력`});
      await store.put({...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos, notes:ph.notes}), saved:now});
    }
    try{ left.length ? localStorage.setItem(DOCS_LS, JSON.stringify(left)) : localStorage.removeItem(DOCS_LS); }catch(_){}
    if(list.length>left.length){ await store.list(); toast('견적서 사이트에서 출력해 과업 「생성」을 체크했습니다.'); }
  } finally { takingDocs=false; }
}
window.addEventListener('storage', e=>{ if(e.key===DOCS_LS && e.newValue) takeDocs(); });
window.addEventListener('focus', ()=>{ if(window.__tasksReady) takeDocs(); });

// 결제 확인 알림:결제링크를 보낸 다음날부터, 이 창을 열면 아직 확인 안 한 예약을 띄움 (하루 한 번)
function duePayChecks(){
  const today=ymd(new Date());
  // 결제링크를 보낸(「결제링크 전송」) 다음날부터. 보내기 전이면 알림 없음 (예전 기록은 과업이 생긴 다음날부터)
  return (cache||[]).map(r=>{ const ph=parseHist(r), t=ph.tasks.find(t=>t.id==='paycheck' && !t.done); if(!t) return null; const x=xOf(r); if(x.paidAt) return null;
    const base = x.linkSent || (ph.tasks.some(y=>y.id==='linksend') ? '' : t.at); return base && ymd(new Date(base))<today ? {r,t} : null; }).filter(Boolean);
}
function checkPayPopup(force){
  if(BOOK_ONLY || MY_EMBED) return;   // 예약 현황 공유 페이지 · 나의 할일 팝업 안에서는 안 함
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
      await store.put({...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos, notes:ph.notes}), saved:now});
    }
    await store.list(); toast('결제 확인으로 표시했습니다.'); checkPayPopup(true);
  }
});
const fmt=s=>dtLabel(s);
const LIST_SHOW_DEF = {'예약상담':false, '가예약':true, '예약확정':true, '예약취소':false};   // 단체예약 목록에 보일 단계 (기본 = 가예약 · 예약확정, 버튼으로 켜고 끔 · 브라우저에 기억, 2026-11-18)
let listShow = {...LIST_SHOW_DEF, ...SY.readJSON('sayuwon_list_show', {})};
let listSort = (()=>{ try{ return localStorage.getItem('sayuwon_list_sort')||'date'; }catch(_){ return 'date'; } })();   // 기본 방문일 순
document.addEventListener('click', e=>{ const b=e.target.closest('#sortSeg button'); if(b){ listSort=b.dataset.o; try{ localStorage.setItem('sayuwon_list_sort', listSort); }catch(_){} renderList(); } });
// 정렬: 방문일 순(가까운 날부터, 날짜 없으면 뒤) · 접수 순(최근 접수부터)
const listOrder = (a,b) => listSort==='saved' ? String(b.saved||'').localeCompare(String(a.saved||'')) : ((a.date||'9999')).localeCompare(b.date||'9999') || String(a.saved||'').localeCompare(String(b.saved||''));
// 담당자: 이름(전화번호), 여러 명이면 쉼표로
function contactCell(r){ const sp=v=>String(v||'').split(/\s*\/\s*/); const n=sp(r.contact), p=sp(r.phone);
  return n.map((x,i)=>[x.trim(), (p[i]||'').trim()]).filter(([x,y])=>x||y).map(([x,y])=>y ? `${esc(x)}(${esc(y)})` : esc(x)).join(', '); }
document.addEventListener('click', e=>{ const b=e.target.closest('#stageFilter button'); if(!b) return; const s=b.dataset.f; listShow[s]=!listShow[s]; SY.writeJSON('sayuwon_list_show', listShow); renderList(); });   // 단계 버튼: 누르면 켜고 끔
let listSearchT=null; document.addEventListener('input', e=>{ if(e.target.id!=='listSearch') return; clearTimeout(listSearchT); listSearchT=setTimeout(renderList, 150); });
async function renderList(){
  // 예전 기록의 '단체예약'도 함께 (일반 문의·기타는 제외)
  const all=(await store.list()).filter(r=>['단체예약',...STAGES,...Object.keys(OLD_STAGE)].includes(r.callType||'단체예약'));
  const del=id=>`<span class="row-acts"><button class="btn act-fix" data-fix="${id}" title="목록에 보이는 단계 · 전산 · 견적서 · 거래명세서 · 영업 담당 고치기 (남의 예약은 영업 담당만 · 사유 필수)">수정</button><button class="btn act-del" data-del="${id}" title="이 예약 삭제 (사유를 고른 뒤)">삭제</button></span>`;
  const needCall = r => /^자동 등록/.test(r.summary||'');
  const nCall = all.filter(needCall).length;
  // 단계: 시트 '통화 구분' 칸 (예전 이름은 normStage). 예전 '단체예약'은 결제 · 전산으로 판단. 관리자 사이트에서 온 예약은 예약확정
  const stageOf = r => /^adm/.test(r.id) && !STAGES.includes(normStage(r.callType)) ? '예약확정' : STAGES.includes(normStage(r.callType)) ? normStage(r.callType) : stageAuto({...r, ...unpackExtra(r)});
  const erpOf = r => /^adm/.test(r.id) || !!unpackExtra(r).erp;
  // 목록 = 앞으로 있을 예약 (2026-11-26: 기본 기간이 오늘부터라 방문일이 지난 예약은 빠짐 — 기간의 시작을 앞으로 고르면 함께 · 검색하면 지난 것까지). 기본은 가예약 · 예약확정만, 「예약상담」 · 「예약취소」는 버튼으로 켜고 끔 (2026-11-18)
  const today=todayYmd(), isPast = r => !!r.date && r.date < today;
  $('#callCount').hidden = !nCall; $('#callCount').textContent = `전화 필요 ${nCall}`;   // 건수 숫자는 없앰 (2026-11-26 · 머리줄 버튼 · 단계 버튼)
  $('#adminHint').textContent = adminData?.updated ? `관리자 사이트 ${fmtAgo(adminData.updated)} 갱신` : '';
  document.querySelectorAll('#stageFilter button').forEach(b=>{ const s=b.dataset.f; b.classList.toggle('on', !!listShow[s]); b.textContent=s; b.title=listShow[s] ? '누르면 숨기기' : '누르면 보이기'; });
  { const ss=$('#stageSum'); if(ss) ss.textContent=''; }   // 「보기」 글자는 없앰 (2026-11-18)
  // 검색어가 있으면 단계 버튼과 상관없이 모두에서 업체명 · 담당자 이름 · 전화번호(숫자만 비교) · 영업 담당으로 찾음
  const q=String($('#listSearch')?.value||'').trim(), qd=q.replace(/\D/g,''), qs=q.replace(/\s/g,'').toLowerCase();
  const hit = r => { const t=[r.org, r.contact, r.owner, r.takenBy, r.email].join(' ').replace(/\s/g,'').toLowerCase(); return (qs && t.includes(qs)) || (qd.length>=3 && String(r.phone||'').replace(/\D/g,'').includes(qd)); };
  const stageOn = s => !!listShow[s];
  const pool=all, cal=listViewMode==='cal';
  // 기간 (2026-11-26): 버튼 줄의 「기간」(방문일 순 왼쪽) — 기본은 오늘부터 끝까지(= 앞으로 있을 예약). 방문일이 그 기간인 예약만 (방문일 없는 예약은 끝을 안 정했을 때만 · 검색 · 캘린더에는 적용 안 함). 지난 예약은 시작을 앞으로 고르거나 비우면 (「지난 예약 보기」 체크 칸은 없앰)
  const pf=$('#pastFrom').value, pt=$('#pastTo').value, inRange = r => r.date ? ((!pf || r.date>=pf) && (!pt || r.date<=pt)) : !pt;
  // 지난 예약: 표에서는 기간의 시작을 앞으로 고르거나 비웠을 때 · 검색하면 늘 함께 · 캘린더는 달을 넘겨 보므로 늘 함께
  const shown = q ? pool.filter(hit) : pool.filter(r=>stageOn(stageOf(r)) && (cal || inRange(r)));
  document.querySelectorAll('#stageFilter button').forEach(b=>b.classList.toggle('dim', !!q));   // 검색 중에는 단계 버튼이 적용 안 됨
  document.querySelectorAll('#sortSeg button').forEach(b=>b.classList.toggle('on', b.dataset.o===listSort));
  const stageTag = r => { const s=stageOf(r), cw=s==="예약취소" ? unpackExtra(r).cancelWhy : ""; return `<span class="tag st-${s}"${cw?` title="취소 사유: ${esc(cw)}"`:""}>${s}</span>`; };   // 예약취소는 마우스를 올리면 사유
  // 방문일 순: 가까운 날부터 차례로 (지난 예약을 켜면 옛날 것부터 한 줄로 · 날짜 없음은 맨 아래) · 검색했을 때는 방문일이 늦은 것부터 (내림차순)
  const order = listSort==='date' && q ? (a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || String(b.saved||'').localeCompare(String(a.saved||'')) : listOrder;
  const sorted=shown.slice().sort(order); listView = { shown:sorted, stageOf, erpOf };   // 엑셀로 내려받기에 씀 (표에 보이는 그대로)
  { const pb=$('#pastBar'); pb.classList.toggle('dim', !!q); $('#pastSum').textContent = `${sorted.length}건`; $('#pastSum').title = q ? '검색 결과 (검색 중에는 기간이 적용되지 않습니다)' : ''; $('#pastTo').min = pf || ''; }
  $('#listBody').innerHTML=sorted.map(r=>`<tr class="r${isPast(r)?' past':''}${stageOf(r)==='예약취소'?' cancel':''}" data-id="${r.id}"><td class="num">${dateLabel(r.date)}</td><td>${stageTag(r)}</td><td>${needCall(r)?'<span class="tag call">전화 필요</span> ':''}${esc(r.org||(needCall(r)?`예약자 ${r.contact||''}`:''))}${needCall(r)?`<br><small class="hint">${esc((r.summary||'').replace(/^자동 등록 · 전화 필요 · /,''))}</small>`:''}</td><td class="contacts-cell">${contactCell(r)}</td><td class="num">${esc(r.people)}</td><td class="num">${esc((r.tin||'')+(r.tout?'~'+r.tout:''))}</td><td>${esc(mealSum(r))}</td><td>${docTag(r,"quote")}</td><td>${docTag(r,"stmt")}</td><td class="owner">${esc(r.owner||r.takenBy)}</td><td class="num">${fmt(r.saved)}</td><td class="acts">${del(r.id)}</td></tr>`).join('')
    || `<tr><td colspan="12" class="hint">${q ? `'${esc(q)}'(으)로 찾은 예약이 없습니다.` : !pool.length ? '저장한 단체예약이 없습니다.' : '이 기간 · 보이는 단계에 해당하는 예약이 없습니다. 지난 예약은 기간의 시작 날짜를 앞으로 바꾸세요.'}</td></tr>`;
  if(!sorted.length && !q && gWaiting()) $('#listBody').innerHTML=SY.skel('table', 8, {cols:12, label:'예약 목록을 불러오는 중'});   // 사본이 없고 처음 받는 중이면 「저장한 단체예약이 없습니다」 대신 스켈레톤 (2026-11-27 · js/group/07-store.js gWaiting)
  // 캘린더 보기: 같은 단계 버튼 · 검색으로 고른 예약을 달력에. 검색어가 바뀌면 찾은 예약이 있는 달로 (앞으로 있을 가장 가까운 예약 · 없으면 가장 최근에 지난 예약 — 그 뒤 ‹ › 로 넘기는 것은 그대로)
  if(!q) calJumpQ=''; else if(cal && q!==calJumpQ){ calJumpQ=q; const ds=shown.map(r=>r.date).filter(Boolean).sort(), to=ds.find(d=>d>=today) || ds[ds.length-1]; if(to) calMonth=to.slice(0,7); }
  const calList = shown;
  paintListView(); if(cal) renderListCal(calList, stageOf, erpOf, needCall);
  document.querySelectorAll('#listBody tr.r').forEach(tr=>tr.onclick=async e=>{
    if(e.target.dataset.del){ e.stopPropagation(); openDel(e.target.dataset.del); return; }
    if(e.target.dataset.fix){ e.stopPropagation(); openFix(e.target.dataset.fix); return; }
    const r=cache.find(x=>x.id===tr.dataset.id); if(!r) return;
    openRecordG(r);
  });
  renderInfo(curInfoKey);
}
// ---- 단체예약 목록 · 캘린더 보기 (2026-11-18): 표 / 캘린더 버튼, 고른 보기는 이 브라우저에 기억 ----
let listViewMode = (()=>{ try{ return localStorage.getItem('sayuwon_list_view')==='cal' ? 'cal' : 'table'; }catch(_){ return 'table'; } })();
let calMonth = todayYmd().slice(0,7);   // 보고 있는 달 YYYY-MM
let calJumpQ = '';   // 캘린더를 찾은 예약의 달로 옮겨 준 검색어 (같은 검색어로는 다시 옮기지 않음 — 달을 넘겨 볼 수 있게)
bfSet('pastFrom', todayYmd());   // 기간의 기본 = 오늘부터 끝까지 (화면을 새로 열면 다시 이 값)
// 기간 칸 (시작 ~ 끝): 시작이 끝보다 뒤면 끝을 맞춤 · 「오늘부터」 = 기본으로 (오늘 ~ 끝까지)
document.addEventListener('change', e=>{ const id=e.target.id; if(id!=='pastFrom' && id!=='pastTo') return; const f=$('#pastFrom').value, t=$('#pastTo').value; if(f && t && t<f) bfSet(id==='pastFrom'?'pastTo':'pastFrom', id==='pastFrom'?f:t); renderList(); });
document.addEventListener('click', e=>{ if(e.target.id!=='pastClear') return; bfSet('pastFrom', todayYmd()); bfSet('pastTo',''); renderList(); });
function paintListView(){
  document.querySelectorAll('#viewSeg button').forEach(b=>b.classList.toggle('on', b.dataset.v===listViewMode));
  $('#listModal .tw').hidden = listViewMode==='cal'; $('#listCal').hidden = listViewMode!=='cal';
  $('#sortSeg').style.visibility = listViewMode==='cal' ? 'hidden' : '';   // 캘린더는 날짜 순이라 정렬이 필요 없음
  $('#pastBar').style.visibility = listViewMode==='cal' ? 'hidden' : '';   // 캘린더는 달을 넘겨 보므로 기간이 필요 없음
}
document.addEventListener('click', e=>{ const b=e.target.closest('#viewSeg button'); if(!b) return; listViewMode=b.dataset.v; try{ localStorage.setItem('sayuwon_list_view', listViewMode); }catch(_){} renderList(); });
function renderListCal(list, stageOf, erpOf, needCall){
  const [Y,M]=calMonth.split('-').map(Number), first=new Date(Y,M-1,1), days=new Date(Y,M,0).getDate(), lead=first.getDay(), today=todayYmd();
  const byDay={}; list.forEach(r=>{ if(r.date && r.date.slice(0,7)===calMonth) (byDay[r.date]=byDay[r.date]||[]).push(r); });
  const nMonth=Object.values(byDay).reduce((a,x)=>a+x.length,0), noDate=list.filter(r=>!r.date).length, q=String($('#listSearch')?.value||'').trim();
  const ev = r => { const s=stageOf(r), noE = false;   // 전산 미등록 표시는 없앰 (2026-11-18)
    return `<button type="button" class="lc-ev st-${esc(s)}${noE?' noerp':''}" data-cid="${esc(r.id)}" title="${esc([r.org||r.contact, s, noE?'전산 미등록':'', r.people?r.people+'명':'', r.tin?'입장 '+r.tin+(r.tout?'~'+r.tout:''):'', r.owner||r.takenBy].filter(Boolean).join(' · '))}">${r.tin?`<i>${esc(r.tin)}</i>`:''}${needCall(r)?'☎ ':''}${esc(r.org||r.contact||'(업체 미정)')}${r.people?` <em>${esc(r.people)}명</em>`:''}</button>`; };
  let cells=''; for(let i=0;i<lead;i++) cells+='<div class="lc-d lc-off"></div>';
  for(let d=1; d<=days; d++){ const k=`${calMonth}-${String(d).padStart(2,'0')}`, dow=new Date(Y,M-1,d).getDay(), evs=(byDay[k]||[]).sort((a,b)=>String(a.tin||'99').localeCompare(String(b.tin||'99')));
    cells+=`<div class="lc-d${k===today?' lc-today':''}${k<today?' lc-past':''}"><div class="lc-n${dow===0?' sun':dow===6?' sat':''}">${d}${evs.length>1?`<small>${evs.length}건</small>`:''}</div>${evs.map(ev).join('')}</div>`; }
  const tail=(7-(lead+days)%7)%7; for(let i=0;i<tail;i++) cells+='<div class="lc-d lc-off"></div>';
  $('#listCal').innerHTML = `<div class="lc-bar"><button type="button" class="btn" data-cm="-1" title="이전 달">‹</button><b>${Y}년 ${M}월</b><button type="button" class="btn" data-cm="1" title="다음 달">›</button><button type="button" class="btn primary" data-cm="0" title="오늘이 있는 달로 가서 오늘 날짜 칸을 보여 줍니다">오늘</button><small class="hint">${q?`찾은 예약 ${list.length}건 중 `:''}이 달 ${nMonth}건${noDate?` · 방문일 없는 예약 ${noDate}건은 표에서`:''} · 연한 초록 = 예약상담 · 중간 초록 = 가예약 · 초록 = 예약확정 · 회색 = 예약취소 · 누르면 예약 열기</small></div>`
    + `<div class="lc-grid">${[...DOW].map((w,i)=>`<div class="lc-h${i===0?' sun':i===6?' sat':''}">${w}</div>`).join('')}${cells}</div>`;
}
$('#listCal').addEventListener('click', e=>{
  const m=e.target.closest('[data-cm]'); if(m){ const v=+m.dataset.cm; if(!v) calMonth=todayYmd().slice(0,7); else { const [y,mo]=calMonth.split('-').map(Number), d=new Date(y, mo-1+v, 1); calMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
    const p=renderList(); if(!v) p.then(()=>{ const t=$('#listCal .lc-today'); if(t) t.scrollIntoView({block:'center'}); });   // 「오늘」: 오늘 칸이 보이게
    return; }
  const c=e.target.closest('[data-cid]'); if(c){ const r=cache.find(x=>x.id===c.dataset.cid); if(r) openRecordG(r); }
});
// 저장된 예약 하나를 칸에 불러오기
function openRecord(r){
    newCall(false);
    KEYS.forEach(k=>{ rec[k]=r[k]||''; if(rec[k]) touched.add(k); });
    LEGACY_KEYS.forEach(k=>{ if(r[k]) rec[k]=r[k]; });   // 예전 프로그램 값은 그대로 들고 있다가 다시 저장
    if(r.mabangD) rec.mabangD=r.mabangD;   // 예전 '마방 디너' 값도 그대로
    if(!rec.owner) rec.owner=savedOwner();   // 자동 등록된 예약 등 담당이 비어 있으면 이 컴퓨터의 영업 담당
    rec.tbd='';   // 새 통화 기본 미정(차량 대수 · 결제 방법)이 저장된 예약에 섞이지 않게 — 그 예약의 미정 항목만 (2026-11-18)
    const ex=unpackExtra(r); Object.assign(rec,ex); Object.keys(ex).forEach(k=>touched.add(k));
    if(!rec.pay) rec.pay='미정';   // 결제를 안 고른 예전 기록은 미정으로
    if(!rec.gate) rec.gate='미정';   // 입장문을 안 고른 예전 기록도 미정으로
    if(rec.seminar2){ rec.seminar=String((numOf(rec.seminar)||1)+(numOf(rec.seminar2)||1)); rec.seminar2=''; }   // 예전 「세미나 도슨트(2)」 줄 → 세미나 도슨트 수량 2 (시간 · 장소 · 비고는 두 번째 칸 그대로, 2026-11-18)
    { const gl=goodsParse(rec.goods), mv=gl.filter(g=>goodsKeyOf(g.src)); if(mv.length){ mv.forEach(g=>{ const c=goodsKeyOf(g.src); rec[c]=String((numOf(rec[c])||0)+(g.qty||0)); }); rec.goods=goodsJoin(gl.filter(g=>!goodsKeyOf(g.src))); } }   // 굿즈로 넣은 음료쿠폰(가가빈빈) → 예전 칸 gaga 한 줄로 (같은 품목이 두 줄이 되지 않게, 2026-11-18)
    syncPayTbd(rec);   // 결제가 미정이면 미정 항목 '결제 방법'
    if(/^adm/.test(r.id) && !rec.erp) rec.erp='관리자 예약';   // 관리자 사이트에서 온 예약은 이미 전산에 있음
    rec.stage = STAGES.includes(normStage(r.callType)) && normStage(r.callType)!==stageAuto(rec) ? normStage(r.callType) : '';   // 결제로 정해지는 단계와 다를 때만 직접 고른 것으로
    const cs=splitContacts(r); Object.assign(rec,cs); Object.keys(cs).forEach(k=>{ if(cs[k]) touched.add(k); });
    nContacts=Math.max(1,nContactsOf(rec)); editingId=r.id; openedRaw=rawPick(r); openedObj=liveVals(r); noteLoad(r); memoOpened=r.note||'';
    const ph=parseHist(r); hist=ph.h; tasks=ph.tasks; erpList=ph.erp||[]; memos=ph.memos||[];
    { const o=(r.owner||r.takenBy||'').trim(), me=savedOwner(); lockOwner = o && me && o!==me ? o : ''; } paintLock(); acquireEdit(r.id);   // 남이 담당인 예약: 잠금 (메모만)
    renderContacts(); renderForm(); resetWarn(true); baseSnap=snap(); SID=Math.random().toString(36).slice(2); lastAuto=null; clearTimeout(autoT); renderHist(); paintDirty(); closeList(); window.scrollTo({top:0,behavior:"smooth"});
    setTimeout(()=>syncSavedTasks(r.id), 1200);   // 화면에서 저절로 바뀐 과업 상태를 저장된 예약에도 (나의 할일 · 대시보드가 같게)
}

// ===================== 새 통화·단축키 =====================
function newCall(withToast=true){
  if(typeof endStart==='function') endStart();   // 첫 화면(단체명으로 먼저 찾기)을 걷음 (js/group/15-lock-popups.js)
  resetState(); clearInterval(timerInt); tick(); noteLoad(null); status('');
  hist=[]; baseSnap=null; tasks=[]; erpList=[]; tbdAuto=false; memos=[]; lockOwner=''; if(typeof releaseEdit==='function') releaseEdit(); { const hd=document.getElementById('histDet'); if(hd) hd.open=false; }   // 수정 기록은 예약을 열 때마다 접어 둠
  renderHist(); if(typeof paintLock==='function') paintLock();
  renderContacts(); renderForm(); resetWarn(false); emptySnap=snap(); SID=Math.random().toString(36).slice(2); lastAuto=null; clearTimeout(autoT); renderHist(); paintDirty();
  if(withToast){ toast('새 통화를 시작합니다.'); $('#memoBox').focus(); }
}
$('#newBtn').onclick=async()=>{   // 새 통화: 고치던 내용이 있으면 바로 저장하고 새 통화 (저장할 수 없으면 예전처럼 묻기, 2026-11-17)
  if(isDirty() && canSave() && !lockOwner){ await save({auto:true}); if(!isDirty()){ newCall(false); toast('고치던 내용을 저장하고 새 통화를 시작합니다.'); $('#f_org')?.focus(); return; } }
  guardLeave(()=>newCall()); };
// 안 읽은 메모: 영업 담당이 아닌 사람이 통화 메모를 고친 것 · 남긴 메모 (2026-11-24 · 통화 메모 확인 과업)
const memoNew = () => (memos||[]).filter(m=>m && !m.seen && m.by && m.by!==String(rec.owner||'').trim());
const memoTaskList = () => { const own=String(rec.owner||'').trim(), L=(memos||[]).filter(m=>m && m.by && m.by!==own).slice().reverse();   // 「통화 메모 확인」 과업 안에 관련 메모 모두 (최근 것부터 · 2026-11-24 위쪽 상자 대신)
  return L.length && typeof memoLi==='function' ? `<ul class="tk-memos">${L.map(m=>memoLi(m,true)).join('')}</ul>` : ''; };
// 통화 메모 확인 규칙 (추후과업 메시지 관리 「통화 메모 확인」을 열면 보임 · js/taskcfg.js) — 규칙을 바꾸면 이 글도 같이
const MEMOCHECK_RULES = `■ 무엇
  영업 담당이 아닌 사람이 남의 단체예약에서 통화 메모를 고쳐 저장하면, 그 예약의 영업 담당에게 「통화 메모 확인」 과업이 생김

■ 언제 생기나 (2026-11-26 고침)
  통화 메모에 원래 글이 있었든 비어 있었든 상관없이, 영업 담당이 아닌 사람이 내용을 바꿔 저장하면 바로 생김
  예약 단계와 상관없음 — 예약상담 · 예약취소 예약에서도 생김 (예전엔 가예약 · 예약확정에서만 떴음)
  영업 담당 본인이 고친 것은 생기지 않음
  2026-11-27: 통화 메모가 「쌓이는 기록」이 됨 — 영업 담당이 아닌 사람이 기록을 더하거나 · 자기 기록을 고치거나 지워 저장하면 생김 (과업 안에는 방금 더한 기록의 글이 보임)
  이미 안 끝난 과업이 있으면 새로 만들지 않고 그 과업 안에 메모가 더해짐 (같은 사람이 여러 번 고치면 한 줄로)
  영업 담당이 이 과업을 지웠어도, 그 뒤에 누가 또 고치면 다시 생김
  방문일이 30일 넘게 지난 예약은 나의 할일에 나오지 않음 (다른 과업과 같음)
  (「메모를 확인하세요」 팝업은 2026-11-24부터 안 뜸 — 메모는 이 과업 안에서 봄)

■ 과업 보조 설명
  기본은 없음 (2026-11-24 · 예전 「고친 사람: 테스트」는 없앰 — 아래 메모마다 시각 · 이름이 나옴)
  메시지 관리에서 과업 보조 설명을 적으면 {메모고친사람} 으로 고친 사람 이름을 넣을 수 있음

■ 과업 안의 메모 (2026-11-24)
  이 예약에 영업 담당이 아닌 사람이 남긴 메모 · 고친 통화 메모를 과업 안에 모두 보여 줌 (최근 것부터 · 새 메모는 연한 빨강 바탕)
  예전 위쪽 「다른 사람이 남긴 메모」 상자는 없앰

■ 끝나는 때
  과업을 체크하면 안 읽은 메모가 모두 「확인함」으로 바뀌고 과업 완료 (나의 할일에서 체크해도 같음)
  완료한 뒤 누가 또 고치면 다시 열림 (마감 = 그날)

■ 고치는 쪽 (영업 담당이 아닌 사람)
  통화 메모 위에 흐린 글 「수정 사안이 있다면 통화 메모에 남겨 두세요」 · 쓰고 1.5초 뒤 · 칸을 나가면 · 「저장」 버튼으로 저장
  통화 메모만 저장 (예약의 다른 칸은 고칠 수 없음)

■ 바꾸는 법
  이름 · 마감 · 세부 과업 · 과업 보조 설명은 아래 칸에서 · 「이 과업을 자동으로 만들지 않음」에 체크하면 과업은 안 생기고 팝업만 뜸
  과업 보조 설명에서 {메모고친사람} = 고친 사람 이름`;
// 예약내역&전산 확인 규칙 (추후과업 메시지 관리 「전날 확인 변경 → 예약내역&전산 확인」을 열면 보임 · js/taskcfg.js) — 규칙을 바꾸면 이 글도 같이
const PPLCHK_RULES = `■ 언제 생기나
  저장한 예약의 관람 인원이 바뀌면 (단체 화면에서 고치거나 · 다음날 고객 응대 준비에서 바꾸면)
  과업 아래 「바뀐 내용: 관람 인원 20 → 25 (단체 화면)」

■ 저절로 끝나는 때 (2026-11-24)
  가장 최근에 붙여 넣은 전산 내역과 지금 예약 내역을 대조해 총 금액 · 할인이 같으면 = 바뀐 내용이 이미 전산에 반영됨 → 자동 완료
  (전산 예약 · 전산 내역 대조 과업과 같은 대조 · 열지 않은 예약도 나의 할일 · 첫 화면에서 같이)
  같지 않으면 그대로 열려 있음 → 전산을 고치고 전산 내역을 다시 붙여 넣으면 그때 완료
  아래 「전산 내역이 이미 같으면 저절로 완료」 체크를 빼면 사람이 체크해야만 완료

■ 다시 열리는 때
  관람 인원이 또 바뀌면 다시 열림 (바뀐 내용 줄이 새로)`;
// ▣ js/group/10-price.js — 가격표: 견적서 화면의 품목 · 가격 읽기 · 품목 관리 창 · 특별 할인 종류 편집 · 단체 할인율(groupRate) · 학생 인원 · 금액 계산
// ===================== 가격표 =====================
// 가격은 견적서&거래명세서 사이트에서 그때그때 읽어 온다 → 그 사이트의 품목·가격이 바뀌면 여기도 바뀜
//  · 기본 품목: 그 사이트 페이지의 CATALOG_RAW (품목 | 가격 | 할인 대상)와 굿즈·단체 프로그램 목록
//  · 품목 관리에서 바꾼 것: 견적서 서버(SY.quote)의 가격·숨김·추가 품목
// 불러오기 전이나 실패하면 마지막으로 받은 것을 쓴다
const QUOTE_PAGE = 'document/index.html';   // 견적서 사이트 (이 사이트 안 document/ · 예전 주소 sayuwon-invoice-quotation 도 그대로)
const QUOTE_DATA = 'document/js/document.js';   // 품목 목록(CATALOG_RAW · 굿즈 · 단체 프로그램 · TAX_SPLIT)이 들어 있는 견적서 코드
// 견적서 서버(품목 관리에서 바꾼 것 · 발급 내역)는 SY.quote (js/common.js)
const PRICE_EXCLUDE = /쉐프\s*특선|^네이버/;   // 가격표에서 뺀 품목 (음료쿠폰(몽몽차방)은 품목 관리에서 굿즈가 되어 가격표에도 보임, 2026-11-18)
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
      SY.quote.get().catch(()=>null)
    ]);
    const p = parseQuotePage(html);
    const data = (shared && shared.data) || (quoteCat && {edits:quoteCat.edits, added:quoteCat.added}) || {};
    quoteCat = { ...p, edits: data.edits||{}, added: data.added||[], at: new Date().toISOString() };
    writeJSON('sayuwon_quote_cat', quoteCat); priceLoaded = true; simVer++;   // 품목이 바뀌면 열지 않은 예약의 과업도 다시 계산
    addCatalogProgs(quoteCat).forEach(f=>{ document.querySelector('#opt_'+OPT[f[0]].id+' .fields')?.insertAdjacentHTML('beforeend', isSub(f[1]) ? fieldHTML(f[1], isStf(f[1]) ? '담당' : SUB_NAME[f[1].split('_')[0]], '', 'sub'+(isStf(f[1])?' sub-stf':''), isStf(f[1])) : fieldHTML(f[1],f[2],'','pbase',false)); paintFields(); });   // 견적서 품목에 새 단체 품목이 생기면 칸 추가
  }catch(_){ priceLoaded = false; }
  paintFields(); renderPrice(); if(window.__tasksReady) renderTasks();   // 몽몽마방 메뉴 · 가격도 새로
}
// 품목 관리: 견적서 사이트를 ?catalog=1 로 띄우면 품목 관리 창만 나옴. 저장 · 닫기를 알려 주면 가격 · 메뉴를 다시 불러옴
const QUOTE_CAT_URL = './#catalog';   // 품목관리 = 시스템의 #catalog (팝업 안에서는 품목 관리 창으로 바뀜)
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
// 품목 목록은 화면을 그릴 때마다 수백 번 불림 (가격 · 과세 나누기 · 품목 이름 찾기) → 품목 자료가 바뀔 때만 다시 만들고 그 사이에는 만들어 둔 것을 돌려줌 (2026-11-23 · 입력이 늦던 원인)
//  돌려준 목록 · 항목은 고치지 말 것 (고르기 · 정렬은 filter / [...] 로 복사해서)
let catMemo=null;
function catalogItems(){
  if(!quoteCat) return [];
  const c=catMemo, q=quoteCat;
  if(c && c.q===q && c.raw===q.raw && c.edits===q.edits && c.added===q.added && c.n===(q.added||[]).length && c.tax===q.tax && c.mabang===q.mabang && c.gtime===q.gtime && c.geach===q.geach && c.goods===q.goods) return c.out;
  const out=catalogBuild();
  catMemo={q, raw:q.raw, edits:q.edits, added:q.added, n:(q.added||[]).length, tax:q.tax, mabang:q.mabang, gtime:q.gtime, geach:q.geach, goods:q.goods, out};
  return out;
}
function catalogBuild(){
  const has = (arr, s) => (arr||[]).some(x=>normSrc(x)===normSrc(s));
  const kindOf = src => /\(관람,/.test(src) ? 'package' : has(quoteCat.mabang?.length ? quoteCat.mabang : MB_DEF.map(m=>m[0]), src) ? 'mabang' : has(quoteCat.gtime,src) ? 'gtime' : has(quoteCat.geach,src) ? 'geach' : has(quoteCat.goods,src) ? 'goods'
    : (/관람/.test(src) && !/관람권|관람식사권/.test(src)) ? 'view' : 'food';
  const out=[], seen={};
  quoteCat.raw.forEach(line=>{
    const [src, price, disc] = line.split('|'); if(seen[normSrc(src)]) return; seen[normSrc(src)]=1;
    const e = (quoteCat.edits||{})[src] || {};
    if(e.hidden) return;
    out.push({ src, name: e.name, price: e.price!=null ? Number(e.price) : (price ? Number(price) : null), sprice: e.sprice!=null ? Number(e.sprice) : null, staxable: e.staxable!=null ? Number(e.staxable) : null, staxfree: e.staxfree!=null ? Number(e.staxfree) : null, nostu: !!e.nostu, disc: e.disc!=null ? !!e.disc : disc==='1', kind: mbKind((e.kind==='food' && MB_DEF.some(m=>normSrc(m[0])===normSrc(src))) ? 'mabang' : (e.kind || kindOf(src)), src),
      taxable: e.taxable!=null ? Number(e.taxable) : ((quoteCat.tax||{})[src]||[])[0], taxfree: e.taxfree!=null ? Number(e.taxfree) : ((quoteCat.tax||{})[src]||[])[1] });   // 과세 · 비과세 (품목 관리 값 우선)   // 예전에 '식사'로 바꿔 둔 기본 몽몽마방 메뉴도 메뉴로
  });
  (quoteCat.added||[]).forEach(a=>{ if(a.hidden) return; out.push({ src: a.src || a.name, name: a.name, price: a.price!=null ? Number(a.price) : null, sprice: a.sprice!=null ? Number(a.sprice) : null, staxable: a.staxable!=null ? Number(a.staxable) : null, staxfree: a.staxfree!=null ? Number(a.staxfree) : null, nostu: !!a.nostu, disc: !!a.disc, kind: mbKind(a.kind || 'food', a.src || a.name), taxable: a.taxable!=null ? Number(a.taxable) : undefined, taxfree: a.taxfree!=null ? Number(a.taxfree) : undefined }); });
  // 성인 · 학생 가격 (2026-11-20 · 견적서 품목 관리와 같음): 「(학생)」 품목은 그 성인 품목의 학생 가격(sprice)으로 합치고 merged 로 표시 (고르는 목록엔 안 보임 · 상품명으로 찾으면 가격 = 학생 가격)
  const by={}; out.forEach(it=>{ by[normSrc(it.src)] ||= it; });
  out.forEach(it=>{ const s=String(it.src||''); if(s.indexOf('(학생)')<0) return; it.merged=true;   /* 학생 품목은 성인 품목이 없어도(숨김 등) 고르는 목록에서 뺌 */ const base=[s.replace('(학생)',''), s.replace(/\s*관람\(학생\)/,'(관람)')].map(b=>by[normSrc(b)]).find(b=>b && b!==it); if(!base) return;
    it.stuOf=base.src; if(base.nostu) return;   // 품목 관리에서 「학생 빼기」
    if(base.sprice==null && it.price!=null) base.sprice=it.price; if(base.staxable==null && it.taxable!=null) base.staxable=it.taxable; if(base.staxfree==null && it.taxfree!=null) base.staxfree=it.taxfree;   // 학생 과세 · 비과세도 (학생 행)
    it.price = base.sprice!=null ? base.sprice : it.price; it.taxable=base.staxable; it.taxfree=base.staxfree; });
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
// 단체 할인: 20명 미만 사전예약 5%, 20명 이상 단체예약 10% → 관람 · 관람+사담(런치 · 디너) 상품에만
// 특별 할인(사람마다): 그 사람은 단체 할인과 비교해 큰 쪽 하나만
const SPECIAL = [
  {k:'dKansong', name:'간송미술관 제휴', short:'간송', rate:.15, proof:'간송미술관 방문 티켓 (방문일 기준 6개월 이내 것)'},
  {k:'dMerit',   name:'국가유공자',       short:'국가유공자', rate:.30, proof:'국가유공자 증서'},
  {k:'dGunwi',   name:'군위 주민',        short:'군위 주민', rate:.50, proof:'주민등록증 또는 등본 (거주지 확인)'},
  {k:'dClergy',  name:'대구대교구 신부·수녀·신학생', short:'대구대교구', rate:1, proof:'소속 증명서 또는 신분증'},
  {k:'dStaff',   name:'직원',             short:'직원', rate:.30, proof:'사원증 (직원 확인)'},   // 2026-11-17 직원 할인 30%
  {k:'dGuide',   name:'가이드(무료)',     short:'가이드(무료)', rate:1, proof:''},   // 2026-11-20 여행사 가이드 무료 (전산: * 가이드(무료) 성인 1명 100%) · 증빙 없음
];
// ===== 특별 할인 종류 편집 (2026-11-17): 특별할인 팝업의 「편집」 → 이름 · 할인율 · 증빙을 고치고, 새 할인 추가 · 빼기 =====
// 공유 기록 한 줄(id spdisc, 통화 구분 '특별할인설정')의 수정 기록 칸에 {list:[{k,name,short,rate,proof,off,olds}], at, by} → 모든 직원이 같은 목록
//  k(저장 키)는 바뀌지 않음 → 이미 저장된 예약 인원은 그대로. 뺀 할인(off)은 팝업에서만 숨김 (그 할인이 들어간 예약은 계산 · 비고 그대로). 이름을 바꾸면 예전 이름(olds)도 읽음
var SPD_ID='spdisc', SPD_TYPE='특별할인설정';
const SPECIAL_BASE = SPECIAL.map(s=>({...s})), SPECIAL_LABEL_BASE = {...SPECIAL_LABEL};
let spdSig='';
function spdList(){ const r=(cache||[]).find(x=>x.id===SPD_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return Array.isArray(j.list)&&j.list.length ? j.list.concat(SPECIAL_BASE.filter(b=>!j.list.some(x=>x&&x.k===b.k))) : SPECIAL_BASE; }   // 공유 목록에 없는 새 기본 할인(가이드 무료 등)은 뒤에 붙임
function applySpd(){ try{
  const list=spdList(), sig=JSON.stringify(list); if(sig===spdSig) return false; spdSig=sig;
  SPECIAL.splice(0, SPECIAL.length, ...list.filter(s=>s && s.k && (s.short||s.name)).map(s=>({k:s.k, name:String(s.name||s.short), short:String(s.short||s.name), rate:Math.min(1, Math.max(0, +s.rate||0)), proof:String(s.proof||''), off:!!s.off, olds:Array.isArray(s.olds)?s.olds:[]})));
  SPECIAL.forEach(s=>{ const b=SPECIAL_BASE.find(x=>x.k===s.k); SPECIAL_LABEL[s.k] = b && b.short===s.short ? SPECIAL_LABEL_BASE[s.k] : s.short+' 할인'; LABEL[s.k]=SPECIAL_LABEL[s.k]; if(!SP_KEYS.includes(s.k)) SP_KEYS.push(s.k); });
  if(typeof spKey!=='undefined' && spKey!=null && !$('#spModal').hidden && $('#spEdit').hidden) openSp(spKey);   // 다른 직원이 바꾼 목록을 받으면 열린 팝업도
  return true; }catch(_){ return false; } }
function spdRowHTML(s){ return `<tr data-spdk="${esc(s.k)}"${s.off?' class="off"':''}><td><input class="spd-short" value="${esc(s.short)}" data-ime="ko" maxlength="20"></td>`
  + `<td><input class="spd-rate" value="${s.rate>=1?100:Math.round((s.rate||0)*100)||''}" inputmode="numeric" maxlength="3" placeholder="30">%</td>`
  + `<td><input class="spd-proof" value="${esc(s.proof)}" data-ime="ko" placeholder="방문 때 지참"></td>`
  + `<td><label class="spd-off" title="빼면 팝업에 안 보임 (이미 넣은 예약은 그대로)"><input type="checkbox" class="spd-offck"${s.off?' checked':''}> 빼기</label></td></tr>`; }
function openSpd(){ $('#spEditBody').innerHTML = SPECIAL.map(spdRowHTML).join(''); $('#spEdit').hidden=false; $('#spMain').hidden=true; $('#spEditBtn').hidden=true;
  $('#spEditMsg').textContent = (()=>{ const r=(cache||[]).find(x=>x.id===SPD_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return j.at ? `마지막 수정 ${fmt(j.at)}${j.by?' · '+j.by:''}` : ''; })(); }
function closeSpd(){ $('#spEdit').hidden=true; $('#spMain').hidden=false; $('#spEditBtn').hidden=false; }
async function saveSpd(){
  const rows=[...document.querySelectorAll('#spEditBody tr')], prev=Object.fromEntries(SPECIAL.map(s=>[s.k,s])), list=[];
  for(const tr of rows){ const short=tr.querySelector('.spd-short').value.trim(), rv=tr.querySelector('.spd-rate').value.replace(/\D/g,''), proof=tr.querySelector('.spd-proof').value.trim(), off=tr.querySelector('.spd-offck').checked, k=tr.dataset.spdk;
    if(!short && !rv && !proof && !prev[k]) continue;   // 비워 둔 새 줄은 건너뜀
    if(!short){ toast('할인 이름을 넣어 주세요.'); tr.querySelector('.spd-short').focus(); return; }
    const rate=+rv; if(!rv || rate<=0 || rate>100){ toast(`${short}: 할인율을 1~100으로 넣어 주세요 (100 = 무료).`); tr.querySelector('.spd-rate').focus(); return; }
    if(list.some(x=>x.short===short)){ toast(`'${short}' 이름이 두 번 있습니다.`); return; }
    const p=prev[k], olds=[...((p&&p.olds)||[])]; if(p && p.short!==short && !olds.includes(p.short)) olds.push(p.short);   // 이름을 바꾸면 예전 이름도 기억 (저장된 예약을 읽을 때)
    list.push({k, name: p && p.short===short ? p.name : short, short, rate: rate>=100 ? 1 : rate/100, proof, off, ...(olds.length?{olds}:{})}); }
  if(!list.some(s=>!s.off)){ toast('쓰는 특별 할인이 하나는 있어야 합니다.'); return; }
  const old=(cache||[]).find(x=>x.id===SPD_ID), now=new Date().toISOString(), me=savedOwner()||'';
  const item={...(old||{}), id:SPD_ID, callType:SPD_TYPE, saved:now, takenBy:me, summary:`특별 할인 종류 ${list.filter(s=>!s.off).length}개`, history:JSON.stringify({list, at:now, by:me})};
  try{ await store.put(item); }catch(e){ toast('저장하지 못했습니다: '+e.message); return; }
  const ci=cache.findIndex(x=>x.id===SPD_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
  applySpd(); closeSpd(); if(spKey!=null) openSp(spKey); itemChanged(false, true); renderSide(); toast('특별 할인 종류를 저장했습니다. 모든 직원에게 같은 목록이 보입니다.');
}
document.addEventListener('click', e=>{
  if(e.target.id==='spEditBtn'){ openSpd(); return; }
  if(e.target.id==='spEditCancel'){ closeSpd(); return; }
  if(e.target.id==='spEditSave'){ saveSpd(); return; }
  if(e.target.id==='spEditAdd'){ $('#spEditBody').insertAdjacentHTML('beforeend', spdRowHTML({k:'dx'+Date.now().toString(36), short:'', rate:0, proof:''})); $('#spEditBody tr:last-child .spd-short').focus(); return; }
});
document.addEventListener('change', e=>{ if(e.target.classList?.contains('spd-offck')) e.target.closest('tr').classList.toggle('off', e.target.checked); });
applySpd();
function groupRate(n){ return !n ? 0 : n>=20 ? .10 : .05; }   // 인원 0 = 0% · 1~19명 사전예약 5% · 20명부터 단체예약 10% (2026-11-17, 견적서와 같게). n 은 전체 인원이 아니라 「그 품목 줄의 인원」 (2026-11-21 · 부르는 곳: 12-quote-stage-list.js quoteBlocks · 05-item-rows.js followDiscBand). 견적서 화면에는 같은 규칙이 따로 있음: document/js/document.js autoRate — 바꾸면 둘 다
function specialCounts(r){ return SPECIAL.map(s=>({...s, n: Math.max(0, parseInt(r[s.k])||0)})).filter(s=>s.n>0); }
// 선택한 항목 예상 금액 (견적서 발급과 같은 계산) + 전체 가격표(버튼으로)
const discPct = name => (/관람/.test(name) && !/\(관람,/.test(name)) || /사담\s*런치/.test(name);
function blockAmount(b, price){
  if(price==null) return null;
  // 학생(b.stu명)은 1인 가격이 b.stuDiff 만큼 낮음 (품목 관리의 학생 관람 가격) — 앞에서부터 성인, 뒤가 학생으로 셈 (2026-11-20)
  const ns=Math.min(b.stu||0, b.qty), na=b.qty-ns, sd=b.stuDiff||0; let pos=0;
  const val=(c, pct)=>{ const aC=Math.max(0, Math.min(c, na-pos)); pos+=c; return (aC*price + (c-aC)*(price-sd))*(1-pct/100); };
  let left=b.qty, sum=0; const parts=[];
  (b.notes||[]).forEach(nt=>{ const m=nt.match(/(\d+)\s*명\s+(\d+)%/); if(!m) return; const c=Math.min(+m[1],left), p=+m[2]; left-=c; sum+=val(c, p); parts.push(`${p}% ${c}명`); });
  sum+=val(left, 0);
  return { amount: Math.round(sum), disc: parts.join(' · ') };
}
// ===== 학생 (2026-11-20): 관람 · 관람+식사 줄은 모두 성인이 기본, 줄마다 「학생」 인원을 넣으면 그만큼 학생 가격 =====
// rec.istu = "sadam1=5; v:관람(09:00~18:00)=3" (줄 key = 할인 버튼과 같은 dkey) · 학생 가격 = 품목 관리의 「○○ 관람(학생)(시간대)」 · 관람+식사는 관람 부분만 학생 가격 (견적서와 같음)
const istuMap = r => Object.fromEntries(String((r&&r.istu)||'').split(/\s*;\s*/).map(s=>{ const i=s.lastIndexOf('='); return i>0 ? [s.slice(0,i).trim(), Math.max(0, parseInt(s.slice(i+1))||0)] : null; }).filter(x=>x && x[1]>0));
// 학생 가격이 성인과 다른 품목만 성인 · 학생으로 나눠 받음 (품목 관리의 「└ 학생」 행). 학생 가격이 없거나 같으면 인원을 한꺼번에 (2026-11-20)
const itemSrcOf = (k, r=rec) => itemKind(k)==='sadam' ? `${r.date && isRedDay(r.date) ? '주말/공휴일' : '평일'}(관람, ${{sadam1:'사담 런치1부', sadam2:'사담 런치2부', sadamD:'사담 디너'}[k]})` : itemKind(k)==='varea' ? daySrc(k.slice(2), r) : '';
const stuItemOf = src => { const it=catalogItems().find(x=>normSrc(x.src)===normSrc(src)); return it && !it.merged && it.sprice!=null && it.price!=null && it.sprice!==it.price ? it : null; };
const canStu = (k, r=rec) => (itemKind(k)==='sadam' || (itemKind(k)==='varea' && !/학생/.test(k) && !/해오름/.test(k))) && !!stuItemOf(itemSrcOf(k, r));
const itemStu = k => istuMap(rec)[dkey(k)] || 0;
function setItemStu(k, n){ const m=istuMap(rec), kk=dkey(k); n=Math.max(0, parseInt(n)||0); if(n) m[kk]=n; else delete m[kk]; const s=Object.entries(m).map(([a,b])=>`${a}=${b}`).join('; '); if(s!==String(rec.istu||'')){ rec.istu=s; touched.add('istu'); } }
function stuDiffOf(src){ const it=stuItemOf(src); return it ? it.price-it.sprice : 0; }   // 학생 1명당 차이 (성인 가격 − 학생 가격, 그 품목의 학생 행)
// 학생 1인 가격을 과세 · 비과세로: 학생 행의 과세 · 비과세(비율) → 관람+식사는 그날 관람권의 학생 가격(없으면 성인)만큼 비과세 → 관람권은 모두 비과세 → 그 밖은 과세
function stuSplitOf(src, sp, r){
  const it=catalogItems().find(x=>normSrc(x.src)===normSrc(src)); if(!it) return {tx:sp, tf:0};
  const tx=Number(it.staxable)||0, tf=Number(it.staxfree)||0; if((it.staxable!=null || it.staxfree!=null) && tx+tf>0){ const f=Math.round(sp*tf/(tx+tf)); return {tx:sp-f, tf:f}; }
  if(/\(관람,/.test(src)){ const v=catalogItems().find(x=>normSrc(x.src)===normSrc(viewSrcOf(r||rec))), vp = v ? (v.sprice!=null && !v.nostu ? v.sprice : v.price) : null; if(vp!=null && vp<sp) return {tx:sp-vp, tf:vp}; }
  if(it.kind==='view') return {tx:0, tf:sp};
  return {tx:sp, tf:0}; }
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
  // 성인 · 학생 따로 (2026-11-20): 학생은 학생 가격 · 학생 과세 · 비과세 (품목 관리의 학생 행)
  const ns = Math.min(b.stu||0, b.qty), na = b.qty-ns, sp = p-(b.stuDiff||0);
  const u = b.price!=null ? {tx:p, tf:0} : splitOf(b.product, p, r), us = ns ? (b.price!=null ? {tx:sp, tf:0} : stuSplitOf(b.product, sp, r)) : {tx:0, tf:0};
  const fTx=u.tx*na + us.tx*ns, fTf=u.tf*na + us.tf*ns, full=fTx+fTf;
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
    ? ''   // 특별 할인 요약은 없앰 (품목 줄의 「특별할인」 버튼에 바로 보임)
    : '<span class="hint" style="margin:0">관람 인원을 넣으면 할인(19명까지 사전예약 5% · 20명부터 단체예약 10%)이 계산됩니다</span>';
  SPECIAL.forEach(s=>{ const el=$('#'+s.k); if(el && document.activeElement!==el) el.value = rec[s.k]||''; el?.classList.toggle('has', !!rec[s.k]); });
  { const es=etcSplit(rec); [['etcDiscTx',es.tx],['etcDiscTf',es.tf],['etcDiscWhy',null]].forEach(([k,v])=>{ const el=$('#'+k); if(el && document.activeElement!==el) el.value = v==null ? (rec[k]||'') : (v?String(v):''); }); }   // 기타 할인 칸
  // 전산 내역을 붙여넣었으면 예약 칸으로 계산한 예상 금액 · 할인 칸은 숨기고 전산 내역이 가격표
  const useErp = erpList.length>0;
  $('.disc-box').style.display = useErp ? 'none' : '';
  $('#selTitle').hidden = useErp; box.hidden = useErp;
  $('#erpPasteBtn').textContent = '전산 내역 붙여넣기'; $('#erpPasteBtn').parentElement.hidden = useErp;   // 붙여넣은 뒤에는 전산 합계 제목 옆 「전산 내역 다시 붙여넣기」 (2026-11-19)
  priceInfo = null;
  if(useErp){ box.innerHTML=''; $('#priceHint').textContent = '전산 내역 기준'; }
  // 1) 선택한 항목
  else if(!rec.date || !n){   // 방문일 · 관람 인원이 둘 다 있어야 계산. 하나만 있으면 나머지를 넣어 달라고
    box.innerHTML = rec.date && !n ? '<p class="price-need"><b>관람 인원</b>을 입력해 주세요. 방문일과 관람 인원이 있어야 금액이 나옵니다.</p>'
      : n && !rec.date ? '<p class="price-need"><b>방문일</b>을 입력해 주세요. 평일 · 주말 가격이 달라 방문일이 있어야 금액이 나옵니다.</p>'
      : '<p class="hint" style="margin:0">방문일과 관람 인원을 넣으면, 예약 칸에서 고른 관람 · 식사 · 프로그램의 금액이 여기에 나옵니다.</p>';
  } else if(!quoteCat){
    box.innerHTML = priceLoaded===null ? SY.skel('list', 3, {lines:1, label:'가격을 불러오는 중'}) : '<p class="hint" style="margin:0">견적서 사이트에서 가격을 불러오는 중입니다.</p>';   // 처음 받는 중 = 스켈레톤 (2026-11-27) · 못 받은 뒤에는 예전 글
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
if($('#priceAllBtn')) $('#priceAllBtn').onclick=()=>{ const a=$('#priceAll'), open=a.hidden; a.hidden=!open; $('#priceAllBtn').textContent = open ? '전체 가격표 접기' : '전체 가격표 보기'; $('#priceAllBtn').setAttribute('aria-expanded', open); renderPrice(); };
// ▣ js/group/11-erp-paste.js — 전산 내역 붙여넣기: 읽기(parseErp) · 합계 · 예약 칸 채우기 · 전산과 예약 내용이 다른지 견주기(erpCompare)
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
    else if(key==='예약인원'){ cur.people=wonNum((val.match(/\d+/)||[''])[0]); const st=val.match(/학생\s*:?\s*(\d+)\s*명/); if(st) cur.students=+st[1]; }   // 「46명(어른 : 4명,학생 : 42명)」 → 학생 인원도 (관람을 어른 · 학생 품목으로 나눔)
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
// 전산 상품금액(할인 전) 중 비과세(사유원) 몫: 어른 = 품목 비과세, 학생 = 학생 행의 비과세 (2026-11-20 · 예전엔 학생도 어른 비과세로 계산해 차이가 남)
function erpFullTf(x){
  const t=taxOf(x.product); if(!t || !x.people) return null;
  const ns=Math.min(x.students||0, x.people), it=ns ? stuItemOf(x.product) : null, us = it ? stuSplitOf(x.product, it.sprice, {date:x.date||rec.date, tin:''}) : null;
  return t.tf*(x.people-ns) + (us ? us.tf : t.tf)*ns;
}
function erpSplit(x){
  const t=taxOf(x.product);   // 품목 관리의 과세 · 비과세가 있으면 그것으로 (할인 괄호 = 신라 몫이면 그대로 반영)
  if(t){ const fTf=erpFullTf(x);
    let saw = x.discShilla!=null && x.people ? fTf - Math.max(0, x.disc-x.discShilla) : x.students && x.base && fTf!=null ? Math.round(x.amount*fTf/x.base) : Math.round(x.amount*t.tf/(t.tx+t.tf));
    saw=Math.max(0, Math.min(x.amount, saw)); return {saw, shilla:x.amount-saw}; }
  const isView = /관람/.test(x.product) && !/\(관람,/.test(x.product) && !/관람권|관람식사권/.test(x.product);
  if(isView) return {saw:x.amount, shilla:0};
  if(/\(관람,/.test(x.product) && x.people){
    const vsrc=viewSrcOf({date:x.date, tin:''}), vp=priceOf(vsrc) || priceOf(`${x.date && isRedDay(x.date)?'주말/공휴일':'평일'}(관람)`) || 0;
    const vit=catalogItems().find(y=>normSrc(y.src)===normSrc(vsrc)), vsp = vit && vit.sprice!=null && !vit.nostu ? vit.sprice : vp;   // 학생은 그날 관람권의 학생 가격
    const ns=Math.min(x.students||0, x.people), vFull=vp*(x.people-ns)+vsp*ns;
    const sawDisc = x.discShilla!=null ? Math.max(0, x.disc-x.discShilla) : Math.round(vFull*(x.base ? x.disc/x.base : 0));   // 할인 중 사유원 몫
    const saw=Math.max(0, Math.min(x.amount, vFull - sawDisc)); return {saw, shilla:x.amount-saw}; }
  return {saw:0, shilla:x.amount};
}
// 전산 내역 합계 · 사유원 / 신라 (결제 정보가 있으면 면세 = 사유원, 과세 = 신라)
const erpUnit = x => goodsItems().some(g=>normSrc(g.src)===normSrc(x.product)) ? '개' : '명';   // 굿즈는 개
function erpTotals(list=erpList, raw){   // raw: 붙여넣은 전산 금액 그대로 (예약 내역 줄에서 고친 할인은 반영 안 함 · 예약 내용 / 전산 비교의 「전산」 열, 2026-11-20)
  let tot=0, saw=0, shilla=0; list.forEach(x=>{ const s=erpSplit(x); tot+=x.amount; saw+=s.saw; shilla+=s.shilla; });
  const pi=(list[0]||{}).payInfo;
  // 예약 내역 줄에서 할인액을 직접 고친 상품이 있으면: 그 줄은 고친 금액으로 다시 더함 (전산 결제 정보보다 우선)
  const ov=idamtMap(rec), E = !raw && list===erpList && Object.keys(ov).length ? erpByKey() : null, keys = E ? Object.keys(E.m).filter(k=>ov[dkey(k)]) : [];
  if(keys.length){ tot=0; saw=0; shilla=0;
    list.forEach(x=>{ const k=erpKeyOf(x.product); if(k && keys.includes(k)) return; const s=erpSplit(x); tot+=x.amount; saw+=s.saw; shilla+=s.shilla; });
    keys.forEach(k=>{ const m=erpRowMoney(k, E.m[k]); tot+=m.amount; saw+=m.tf; shilla+=m.tx; });
    return {tot, saw, shilla, pi:null}; }
  if(pi && pi.free!=null && pi.taxable!=null){ saw=pi.free; shilla=pi.taxable; }
  return {tot, saw, shilla, pi};
}
// 예약 내역에는 있는데 전산 내역에 없는 품목(예: 몽몽마방 식사를 전산에 안 넣음): 품목 관리 가격으로 계산 (관람 = 사유원, 그 밖 = 신라 · 할인 버튼 · 할인액 반영)
// atMabang: 몽몽마방 결제가 '마방'(손님이 식당에서 결제)이라 현장결제 금액에는 넣지 않음
function erpMissing(){
  if(!erpList.length || !quoteCat || !rec.date) return [];
  const E=erpByKey();
  const has = k => E.m[k] || (k==='seminar2' && E.m.seminar) || (/^v:/.test(k) && /\(학생\)/.test(k) && E.m[k.replace(/\(학생\)/,'')]);   // 관람(학생)은 전산에서 관람 한 줄(어른 · 학생 함께)에 들어 있음 → 빠진 것 아님 (2026-11-17)
  return quoteBlocks(rec).blocks.filter(b=>b.key && !has(b.key)).map(b=>({b, key:b.key, m:blockMoney(b, rec), atMabang: b.key==='mb' && rec.mabangPay==='마방'})).filter(x=>x.m);
}
function renderErp(){
  const box=$('#erpBox'); if(!box) return;
  if(!erpList.length){ box.hidden=true; box.innerHTML=''; return; }
  const t0=erpTotals(erpList, true), pi=t0.pi, miss=erpMissing(); let {tot, saw, shilla}=t0;
  miss.forEach(x=>{ if(x.atMabang) return; tot+=x.m.amount; saw+=x.m.tf; shilla+=x.m.tx; });   // 전산에 없는 품목도 합계에 (품목 관리 가격)
  box.hidden=false;
  const missRows = miss.map(x=>`<tr class="erp-miss"><td colspan="4">${esc(itemName(x.key))} ${x.b.qty}${itemUnit(x.key)} <small class="hint" style="margin:0">전산에 없음 · 품목 관리 가격${x.atMabang?' · 마방에서 결제 (합계 제외)':''}</small>${[x.m.tf>0 && ` · 비과세(사유원) ${won(x.m.tf)}원`, x.m.tx>0 && ` · 과세(신라) ${won(x.m.tx)}원`].filter(Boolean).join('')}</td><td class="tot">${x.atMabang?`<s>${won(x.m.amount)}</s>`:won(x.m.amount)}</td></tr>`).join('');
  // 예약 내용 합계 | 전산 합계 2열로 비교 (2026-11-19 · 예전엔 전산 합계만 + 아래 글씨로 대조) · 「지우기」 대신 「전산 내역 다시 붙여넣기」
  const c=erpCheck(), r=resTotals(), ok=(a,b)=>Math.abs((a||0)-(b||0))<1;
  const mark = (a,b) => r ? `<td class="ck ${ok(a,b)?'ok':'bad'}">${ok(a,b)?'✓ 같음':`✗ ${won(Math.abs((a||0)-(b||0)))} 차이`}</td>` : '<td></td>';
  const cell = v => `<td class="tot">${v==null?'-':won(v)}</td>`;
  box.innerHTML = `<div class="psec-t">전산 내역 합계 (${erpList.length}건${miss.length?` + 전산에 없는 ${miss.length}건`:''} · 상품별은 위 예약 내역 줄에) <button type="button" class="btn" id="erpRepaste" style="padding:1px 8px;font-size:11.5px;margin-left:6px" title="사유원 전산의 상품 정보를 다시 복사해 붙여넣기">전산 내역 다시 붙여넣기</button></div>`
    + (missRows ? `<table class="ptable sel"><tbody>${missRows}</tbody></table>` : '')
    + `<table class="ptable erp-cmp"><thead><tr><th></th><th>예약 내용</th><th>전산</th><th></th></tr></thead><tbody>`
    + `<tr class="sum"><td>총 금액</td>${cell(r&&r.tot)}${cell(t0.tot)}${mark(r&&r.tot, t0.tot)}</tr>`
    + `<tr class="split-row"><td>└ 사유원 (비과세)</td>${cell(r&&r.saw)}${cell(t0.saw)}${mark(r&&r.saw, t0.saw)}</tr>`
    + `<tr class="split-row"><td>└ 신라 (과세)</td>${cell(r&&r.shilla)}${cell(t0.shilla)}${mark(r&&r.shilla, t0.shilla)}</tr>`
    + `<tr><td>할인 합계</td>${cell(r&&r.disc)}${cell(c.pasted?c.eDisc:null)}${mark(r&&r.disc, c.eDisc)}</tr>`
    + (pi&&pi.total ? `<tr class="split-row"><td>전산 결제 ${esc([pi.state, pi.method].filter(Boolean).join(' · '))}</td><td></td>${cell(pi.total)}<td></td></tr>` : '')
    + (miss.some(x=>!x.atMabang) ? `<tr class="split-row"><td>전산 + 전산에 없는 품목</td><td></td>${cell(tot)}<td></td></tr>` : '')
    + `</tbody></table>`
    + (!r ? `<p class="hint" style="margin:4px 0 0">예약 내용 합계는 방문일 · 품목 가격이 있어야 계산됩니다${c.why?` (${esc(c.why)})`:''}</p>` : (c.missing||[]).length ? `<p class="hint" style="margin:4px 0 0">예약 내용 합계에서 빠진 품목: ${esc(c.missing.join(', '))}</p>` : '');
}
// 예약 내용으로 계산한 합계 · 사유원(비과세) · 신라(과세) · 할인 (erpCheck 와 같은 계산 · 기타 할인 반영)
function resTotals(){
  if(!quoteCat || !rec.date) return null;
  const plain={...rec, idamt:''}, {blocks}=quoteBlocks(rec); let tot=0, saw=0, shilla=0, disc=0;
  blocks.forEach(b=>{ const m=blockMoney(b, plain); if(!m) return; tot+=m.amount; saw+=m.tf; shilla+=m.tx; disc+=m.full-m.amount; });
  const es=etcSplit(rec); tot-=es.tx+es.tf; saw-=es.tf; shilla-=es.tx; disc+=es.tx+es.tf;
  return {tot, saw, shilla, disc};
}
document.addEventListener('click', e=>{ if(e.target.id==='erpRepaste') $('#erpPasteBtn').click(); });
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
      const s=SPECIAL.find(s=>t.includes(s.short)), c=t.match(/(\d+)\s*명/); if(s && c) sp[s.k]=Math.max(sp[s.k]||0, +c[1]);   // 특별 할인 인원 (같은 분이 여러 상품 줄에 나오므로 합치지 않고 가장 큰 수)
    });
    if(/\(관람,\s*사담\s*런치\s*1부\)/.test(p)) add('sadam1',n);
    else if(/\(관람,\s*사담\s*런치\s*2부\)/.test(p)) add('sadam2',n);
    else if(/\(관람,\s*사담\s*디너\)/.test(p)) add('sadamD',n);
    else if(/해오름/.test(p)) add('haeorum',n);   // 평일 · 주말 품목 모두
    else if(/\(관람,/.test(p) || (/관람/.test(p) && !/관람권|관람식사권/.test(p))){   // 관람권 · 관람+식사 패키지
      const isBase = false;   // 관람 자동 줄 없음: 전산의 관람권도 모두 항목 줄(관람 · 관람+식사)로
      const put=(src,q)=>{ if(!q) return; const v=views.find(y=>normSrc(y.src)===normSrc(src)); if(v) v.qty+=q; else views.push({src, qty:q}); };
      // 전산은 관람권 한 줄(46명)에 어른 · 학생이 함께 들어옴 (예약인원 「어른 : 4명,학생 : 42명」 · 할인 줄 「학생 42명」) → 예약 내역처럼 관람 · 관람(학생)으로 나눔 (2026-11-17)
      const stN = x.students || +(((x.notes||[]).map(t=>t.match(/학생\s*(\d+)\s*명/)).find(Boolean)||[])[1] || 0);
      const stSrc = !/학생|\(관람,/.test(p) ? p.replace(/^(.*?관람)(\(.*\))?\s*$/, (a,b,c)=>`${b}(학생)${c||''}`) : '';
      if(isBase) view+=n; else if(stN && stSrc && stSrc!==p){ const sn=Math.min(n, stN); put(stSrc, sn); put(p, n-sn); } else put(p, n); }
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
// 세미나 도슨트 두 개(두 장소): 전산은 세미나 한 품목 → 전산 수량 = 두 줄 합이면 두 줄 그대로 같은 것으로 봄
function semSplit(o){ if(rec.seminar2 && numOf(o.seminar) && numOf(o.seminar)===(numOf(rec.seminar)||1)+(numOf(rec.seminar2)||1)){ o.seminar=rec.seminar; o.seminar2=rec.seminar2; } return o; }
// 학생 (2026-11-21): 예약 내역은 2026-11-20부터 「관람 46명 + 그 줄 학생 42명(rec.istu)」로 저장 → 전산의 관람 · 관람(학생) 두 줄을 관람 한 줄 + 학생 인원으로 합쳐 비교 · 채움
// 옛 방식(views 에 「관람(학생)」 줄)도 같은 모양으로 합침. 돌려줌: {views: 합친 관람 문자열, stu: {품목 키: 학생 인원}} (학생 가격이 따로 있는 줄만 학생 인원을 셈)
const stuBase = s => String(s).replace(/\s*\(학생\)/,'');
function viewsStu(views, istu){
  const rows=[], st={}, im=istuMap({istu:istu||''});
  viewsParse(views).forEach(x=>{ const s=String(x.src), b=stuBase(s), q=+x.qty||0; if(!q) return;
    const r=rows.find(y=>normSrc(y.src)===normSrc(b)); if(r) r.qty+=q; else rows.push({src:b, qty:q});
    if(b!==s) st[b]=(st[b]||0)+q; });
  rows.forEach(r=>{ const n=im[dkey('v:'+r.src)]||0; if(n) st[r.src]=(st[r.src]||0)+n; });
  const stu={}; rows.forEach(r=>{ if(st[r.src] && canStu('v:'+r.src)) stu[normSrc(daySrc(r.src, rec))]=Math.min(r.qty, st[r.src]); });
  return { views: goodsJoin(rows), stu, rows, st };
}
function erpStuApply(o){ const v=viewsStu(o.views, ''); o.views=v.views;
  const m=istuMap(rec); Object.keys(m).forEach(k=>{ if(/^v:/.test(k)) delete m[k]; });   // 관람 줄 학생은 전산대로, 관람+식사 줄 학생(전산에 따로 안 나옴)은 그대로
  v.rows.forEach(r=>{ const n=v.st[r.src]; if(n && canStu('v:'+r.src)) m[dkey('v:'+r.src)]=Math.min(r.qty, n); });
  o.istu=Object.entries(m).map(([a,b])=>`${a}=${b}`).join('; '); return o; }
function fillFromErp(list){
  const {o:o0, sp, etc, etcTo, unknown, org, phone} = erpFields(list), o=erpStuApply(erpSameApply(semSplit(o0))), ch=[];
  if(o.istu!==String(rec.istu||'')){ rec.istu=o.istu; touched.add('istu'); ch.push('istu'); }
  const set=(k,v)=>{ v=v||''; if(String(rec[k]||'')===v) return; rec[k]=v; touched.add(k); ch.push(k); };
  ERP_FILL_KEYS().forEach(k=>set(k, o[k]));
  if(o.people) set('people', o.people); if(o.date) set('date', o.date);
  if(org && !rec.org) set('org', org);
  if(phone && !rec.c0_phone) set('c0_phone', fmtPhone(phone));
  SPECIAL.forEach(s=>{ if(sp[s.k]) set(s.k, String(sp[s.k])); });
  if(rec.isp && (SPECIAL.some(s=>sp[s.k]) || etc)){ rec.isp=''; touched.add('isp'); }   // 전산에서 읽은 특별 · 기타 할인은 예약 전체로 (줄마다 넣은 것은 지움)
  if(etc){ set('etcDisc',''); set('etcDiscTo',''); set('etcDiscTx', etcTo==='사유원' ? '' : String(etc)); set('etcDiscTf', etcTo==='사유원' ? String(etc) : ''); if(!rec.etcDiscWhy) set('etcDiscWhy', '전산 기타할인'); }   // 전산 기타할인: 전산이 알려 준 쪽(기본 신라 = 과세)으로
  else if(rec.etcDiscWhy==='전산 기타할인'){ ['etcDisc','etcDiscTx','etcDiscTf','etcDiscWhy'].forEach(k=>set(k,'')); }   // 전산에서 읽었던 기타 할인이 이번 내역에 없으면 뺌 (직접 넣은 할인은 그대로)
  ERP_FILL_KEYS().forEach(k=>{ const g=OPT[GROUP_OF[k]]; if(g && rec[k]) optOpen.add(g.id); });
  staffDefaults();   // 채운 프로그램 · 굿즈 담당 = 영업 담당   // 채워진 식사 · 프로그램 · 굿즈 묶음은 펼침
  return { n: ch.length, unknown };
}
// 전산 내역 ↔ 예약 내용 다른 점 (식사 · 몽몽마방 · 프로그램 · 굿즈 · 방문일 · 관람 인원 + 알아보지 못한 상품)
function erpCompare(list){
  // 관람 · 굿즈는 글자 그대로 비교하면 띄어쓰기 · 평일/주말 · 순서 · 같은 품목이 두 줄로 나뉜 것만으로도 '다름'이 되어 같은 내용이 다르다고 떴음 (2026-11-16)
  // → 품목(평일 · 주말은 방문일에 맞춰, 띄어쓰기 무시)별 수량 합으로 비교. 다를 때는 시간대까지 보이게 (관람 (9~18시) 20명)
  const qmap = (k,v) => { const m={}; (k==='views'?viewsParse(v):goodsParse(v)).forEach(x=>{ const key=normSrc(k==='views'?daySrc(x.src, rec):x.src); m[key]=(m[key]||0)+(+x.qty||0); }); return JSON.stringify(Object.keys(m).sort().filter(a=>m[a]).map(a=>[a,m[a]])); };
  const same = (k,a,b) => (k==='views'||k==='goods') ? qmap(k,a)===qmap(k,b) : String(a||'')===String(b||'');
  const {o:o0, unknown}=erpFields(list), o=erpSameApply(semSplit(o0));
  // 학생: 전산 관람(학생) 줄 ↔ 예약 관람 줄의 학생 인원 (둘 다 관람 한 줄로 합쳐 비교하고, 학생 인원은 따로)
  const eS=viewsStu(o.views, ''), mS=viewsStu(rec.views, rec.istu);
  o.views=eS.views; const mineViews=mS.views;
  const stuTx = v => { const a=v.rows.filter(r=>v.stu[normSrc(daySrc(r.src, rec))]).map(r=>`${viewLabel(daySrc(r.src, rec))} 학생 ${v.stu[normSrc(daySrc(r.src, rec))]}명`); return a.join(', ') || '없음'; };
  const stuSame = JSON.stringify(Object.entries(eS.stu).sort())===JSON.stringify(Object.entries(mS.stu).sort());
  const show=(k,v)=>!v?(k==='viewN'?'자동':'없음'):k==='goods'?goodsText({goods:v}):k==='views'?viewsParse(v).map(x=>`${viewLabel(daySrc(x.src, rec))} ${x.qty}명`).join(', '):k==='date'?dateLabel(v):/^\d+$/.test(String(v))&&UNIT(k)?v+(k==='people'||/^sadam|mabangL/.test(k)?'명':UNIT(k)):v;
  const mv = k => k==='views' ? mineViews : rec[k];
  const d=[...ERP_FILL_KEYS(),'people','date'].filter(k=>!same(k, o[k], mv(k)) && !((k==='people'||k==='date') && !o[k]))
    .map(k=>({k, label:k==='goods'?'굿즈':k==='views'?'관람 · 관람+식사':k==='viewN'?'기본 관람권 인원':LABEL[k]||k, mine:show(k,mv(k)), erp:show(k,o[k])}));
  if(!stuSame) d.push({k:'istu', label:'학생 인원', mine:stuTx(mS), erp:stuTx(eS)});
  unknown.forEach(p=>d.push({k:'?', label:'알아보지 못한 전산 상품', mine:'-', erp:p}));
  return d;
}
// 전산 내역 적용: how = 'fill'(예약 칸을 전산대로) · 'keep'(예약 칸 그대로, 전산 수정 과업) · 'same'(같음)
let erpPendingTask=null, erpDiffList=null;   // erpPendingTask: 붙여넣으면 완료할 과업 (전산 예약 · 전산 예약 수정)
function applyErpList(list, how, diff){
  erpList=list; touched.add('erpList');
  if(how==='fill'){ fillFromErp(list); nContacts=Math.max(nContacts, nContactsOf(rec)); renderContacts(); renderForm(); }
  if(how==='keep' && diff && diff.length && !(typeof tcfgOf==='function' && (tcfgOf('erpkeep')||{}).off)){   // 추후과업 메시지 관리의 「전산 예약을 예약 내용대로 수정」 (id erpkeep · 2026-11-23 · 예전엔 그때그때 새 과업 c…)
    const memo=diff.map(x=>`${x.label}: 예약 ${x.mine} / 전산 ${x.erp}`).join('\n'), nowI=new Date().toISOString(), due=(typeof tcfgDue==='function' && tcfgDue('erpkeep', rec)) || todayYmd();
    let k=tasks.find(x=>x.id==='erpkeep' && !x.removed);
    if(!k) tasks.push({id:'erpkeep', title:AUTO_TASKS.erpkeep, custom:true, done:false, memo, at:nowI, due});
    else { k.memo=memo; if(k.done){ k.done=false; k.doneAt=''; delete k.manualDone; k.at=nowI; k.due=due; delete k.dueSet; (k.xsubs||[]).forEach(x=>x.done=false); } } }
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
  // 「같은 품목 (이름만 다름)」은 어떤 경우든 보임 (2026-11-21): 누르면 예약 · 전산 모두 그대로 두고 같은 것으로 봄 (짝이 맞는 품목은 앞으로도 같은 것으로 기억)
  const pr=erpSamePairs(diff); $('#erpDiffSame').hidden=false;
  $('#erpDiffBody').insertAdjacentHTML('beforeend', `<p class="hint" style="margin:8px 0 0">${pr.length ? pr.map(([r,e])=>`예약 「${esc(r.label)}」와 전산 「${esc(e.label)}」`).join(', ')+'가 이름만 다른 같은 품목이면' : '이름 · 나눈 방식만 다르고 실제로 같은 내용이면'} <b>「같은 품목 (이름만 다름)」</b>을 누르세요. 예약 · 전산 모두 그대로 두고 같은 것으로 봅니다.</p>`);
  $('#erpDiffSame').title = pr.length ? `이름만 다르고 같은 품목: ${pr.map(([r,e])=>`예약 「${r.label}」 = 전산 「${e.label}」`).join(' · ')} — 예약 내용은 그대로, 이 예약에서는 앞으로 같은 것으로 봄` : '실제로 같은 내용: 예약 · 전산 모두 그대로 두고 같은 것으로 봄';
  $('#erpDiffModal').hidden=false; $('#erpDiffFill').focus();
}
// 「같은 품목 (이름만 다름)」 짝: 예약에만 있는 칸 ↔ 전산에만 있는 칸 (관람 · 굿즈 · 인원 · 방문일 · 알아보지 못한 상품은 빼고), 나온 순서대로
function erpSamePairs(diff){ const ok=x=>!['views','goods','people','date','viewN','istu','?'].includes(x.k);
  const onlyMine=diff.filter(x=>ok(x) && x.erp==='없음' && x.mine!=='없음'), onlyErp=diff.filter(x=>ok(x) && x.mine==='없음' && x.erp!=='없음');
  return onlyMine.slice(0, onlyErp.length).map((r,i)=>[r, onlyErp[i]]); }
$('#erpDiffSame').onclick=()=>{ const d=erpDiffList; if(!d) return; const pr=erpSamePairs(d.diff);
  if(pr.length){ const m=erpSameMap(); pr.forEach(([r,e])=>{ m[e.k]=r.k; }); rec.erpSame=Object.entries(m).map(([a,b])=>`${a}>${b}`).join('; '); touched.add('erpSame'); }
  closeErpDiff(); toast(pr.length ? `같은 품목으로 봅니다: ${pr.map(([r,e])=>`${r.label} = ${e.label}`).join(' · ')}` : '예약 내용과 전산 내역을 같은 것으로 봅니다.', 3600);
  applyErpList(d.list, 'same'); };
const closeErpDiff = () => { $('#erpDiffModal').hidden=true; erpDiffList=null; };
$('#erpDiffFill').onclick=()=>{ const d=erpDiffList; closeErpDiff(); if(d) applyErpList(d.list, 'fill', d.diff); };
$('#erpDiffKeep').onclick=()=>{ const d=erpDiffList; closeErpDiff(); if(d) applyErpList(d.list, 'keep', d.diff); };
$('#erpDiffCancel').onclick=()=>{ closeErpDiff(); if(erpPendingTask){ toast('전산 내역을 적용하지 않아 전산 예약은 아직 완료되지 않았습니다.'); erpPendingTask=null; } };
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#erpDiffModal').hidden){ e.preventDefault(); $('#erpDiffCancel').click(); } });
// 전산 예약 · 전산 예약 수정을 완료하려면 전산 내역을 꼭 붙여넣어 예약 내용과 맞는지 확인
function askErpForTask(id){
  erpPendingTask=id;
  $('#erpIn').value=''; $('#erpMsg').textContent='';
  $('#erpNeed').hidden=true;   // 안내 글은 없앰 (2026-11-19)
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

// ▣ js/group/12-quote-stage-list.js — 견적서에 넘길 품목 줄과 할인 줄 계산(quoteBlocks · 단체 할인은 줄 인원 기준) · 견적서 · 거래명세서 화면으로 넘기기 · 발급 내역 · 예약 단계(상담 · 가예약 · 확정 · 취소) · 단체상담 글 읽기 · 엑셀 내려받기 · 단체 예약 목록 · 목록의 「수정」
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
['focusout'].forEach(ev=>document.addEventListener(ev, e=>{ if(!e.target.closest || !e.target.closest('#form [data-k="tin"]')) return;   // 입장시각 칸을 나갈 때
  setTimeout(()=>{ if(fmtTime(rec.tin) && syncViewTime()){ renderItems(true); renderSide(); toast(`입장시각에 맞춰 관람권을 ${(tinHour(rec.tin)??0)>=13?'13~18시':'9~18시'}로 바꿨습니다.`); } }, 0); }));
// 시간대 관람권: 입장시각 13시 이후 = 13~18시, 그 밖(모름 포함) = 9~18시
const timedViewSrc = r => `${r.date && isRedDay(r.date) ? '주말/공휴일' : '평일'} 관람(${(tinHour(r.tin)??0)>=13 ? '13:00~18:00' : '09:00~18:00'})`;
// 입장시각이 바뀌면 예약 내역의 시간대 관람권(9~18 ↔ 13~18)도 따라 바뀜 (인원 · 줄은 그대로)
function syncViewTime(){
  const list=viewsParse(rec.views), i=list.findIndex(x=>/관람\((09|13):00~18:00\)/.test(x.src)); if(i<0) return false;
  const wantT=(tinHour(rec.tin)??0)>=13 ? '13' : '09', curT=list[i].src.match(/\((\d\d):00~/)[1]; if(curT===wantT) return false;
  const old='v:'+list[i].src; list[i].src=list[i].src.replace(/\(\d\d:00~18:00\)/, `(${wantT}:00~18:00)`);
  rec.views=goodsJoin(list); touched.add('views'); const ri=itemRows.indexOf(old); if(ri>=0) itemRows[ri]='v:'+list[i].src; return true;
}
// 관람 영역: 기본 관람권 + 관람 포함 품목(관람+식사 패키지 · 다른 관람권 · 새벽 해오름 산책). 품목 이름의 평일 · 주말은 방문일에 맞춤
const daySrc = (src, r) => { const day=r.date && isRedDay(r.date) ? '주말/공휴일' : '평일', s=String(src).replace(/^(평일|주말\/공휴일)/, day); return priceOf(s)!=null ? s : src; };
const viewsParse = v => goodsParse(v);   // "품목 x5 · 품목 x10"
const areaOthers = r => { const n=numOf(r.people), cnt=v=>v?(numOf(v)||n):0; return cnt(r.sadam1)+cnt(r.sadam2)+cnt(r.sadamD)+cnt(r.haeorum)+viewsParse(r.views).reduce((s,x)=>s+x.qty,0); };
const viewAuto = r => Math.max(0, numOf(r.people) - areaOthers(r));   // 기본 관람 줄 = 관람 인원 − 다른 관람 영역
const effViewN = r => String(r.viewN||'').trim()!=='' ? numOf(r.viewN) : viewAuto(r);   // 직접 줄였으면 그 수
const viewLabel = src => { const m=String(src).match(/\((\d\d):00~(\d\d):00\)/); return itemLabel(src) + (m ? ` (${+m[1]}~${+m[2]}시)` : ''); };   // "관람 (9~18시)" · "관람 (학생)"
// 예약 내역 관람 줄 드롭다운: 품목 관리의 관람 품목 중 방문일(평일 · 주말)에 맞는 것 (네이버 제외)
const viewItems = r => { const day=r.date && isRedDay(r.date) ? '주말/공휴일' : '평일'; return catalogItems().filter(it=>it.kind==='view' && !it.merged && !/네이버/.test(it.src) && String(it.src).startsWith(day) && it.price!=null); };
function quoteBlocks(r){
  const n = numOf(r.people), we = isRedDay(r.date);
  const DAY = we ? '주말/공휴일' : '평일';
  const cnt = v => v ? (numOf(v) || n) : 0;   // 'O' 처럼 숫자가 없으면 전체 인원
  const mbM = mbMenuOf(r);   // 몽몽마방은 단체도 관람과 따로: 관람권 + 고른 메뉴 품목 (사유의 밥상이면 사유의 밥상(단체))
  const blocks=[], skipped=[];
  const add=(product, qty, disc, key)=>{ if(!(qty>0)) return; const b={product, qty, disc, key};   // key = 예약 내역 줄 (할인 버튼)
    const ns = key && canStu(key, r) ? Math.min(qty, istuMap(r)[dkey(key)]||0) : 0, sd = ns ? stuDiffOf(product) : 0; if(ns && sd){ b.stu=ns; b.stuDiff=sd; }   // 학생 인원 (2026-11-20)
    blocks.push(b); };
  // 관람 자동 줄 없음 (2026-11-14): 관람권도 예약 내역에서 직접 고른 것만 계산
  // 관람 + 사담(런치 1부 · 2부 · 디너)은 모두 사전예약 5% · 단체예약 10% 할인 대상 (2026-11-20 디너도 · 견적서 품목과 같음). 품목 관리에서 할인 대상을 끄면 그대로 따름
  const sdDisc = s => { const it=catalogItems().find(x=>normSrc(x.src)===normSrc(s)); return it ? !!it.disc : true; };
  [['sadam1','사담 런치1부'],['sadam2','사담 런치2부'],['sadamD','사담 디너']].forEach(([k,nm])=>{ const s=`${DAY}(관람, ${nm})`; add(s, cnt(r[k]), sdDisc(s), k); });
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
  const g = Math.round(groupRate(n)*100), gName = n>=20 ? '단체예약' : '사전예약';
  // 줄마다 넣은 특별 할인(rec.isp)이 있으면 그 줄에만, 없으면(예전 기록) 예약 전체 인원을 할인 대상 블록에 앞에서부터
  const ispOn = !!String(r.isp||'').trim(), im = ispOn ? ispMap(r) : {};
  const sp = ispOn ? [] : specialCounts(r).map(s=>({...s, left:s.n})), ov = idiscMap(r);
  blocks.forEach(b=>{
    b.notes=[];
    // 할인 버튼: 자동 = 할인 대상 품목이면 인원으로(19명까지 사전예약 5% · 20명부터 단체예약 10%), 줄마다 버튼으로 바꾼 것(항목 할인)이 있으면 그것
    // 2026-11-21: 그 품목(줄) 인원으로 — 관람만이든 관람+식사든 그 줄이 20명 이상이면 단체예약 10% (예전엔 전체 관람 인원)
    const autoP = b.disc ? Math.round(groupRate(b.qty)*100) : 0, o = ov[dkey(b.key||'')], pct = o==='none' ? 0 : o==='pre' ? 5 : o==='grp' ? 10 : autoP, nm = pct===10 ? '단체예약' : '사전예약';
    b.dauto = DISC_OF(autoP); b.dsel = o && DISC_OPTS.some(x=>x[0]===o) ? o : b.dauto; b.gN=0;   // gN = 사전예약 · 단체예약 할인을 받는 인원 (특별 할인이 더 큰 사람은 빼고)
    const mine = ispOn ? SPECIAL.filter(s=>((im[dkey(b.key||'')]||{}).sp||{})[s.k]).map(s=>({...s, left:im[dkey(b.key||'')].sp[s.k]})) : (b.disc ? sp : []);
    if(!mine.length && (o==='none' || (!b.disc && !pct))) return;
    let left=b.qty;
    mine.forEach(s=>{ const c=Math.min(s.left,left); if(c<=0) return; s.left-=c; left-=c;
      const sp2=Math.max(Math.round(s.rate*100), pct); if(sp2===pct) b.gN+=c; b.notes.push(`* ${sp2===pct?nm:s.short} ${c}명 ${sp2}%`); });
    if(left>0 && pct){ b.notes.push(`* ${nm} ${left}명 ${pct}%`); b.gN+=left; }
  });
  return {blocks, skipped};
}
function quoteRaw(r, blocks){
  const d = r.date.replace(/-/g,'.');
  return blocks.map(b=>[`방문일자(순번)\t${d} (0)`, `상품정보\t${b.product}`, `방문자정보\t${r.org||''}`, `예약인원\t${b.qty}명${b.stu ? `(어른 : ${b.qty-b.stu}명,학생 : ${b.stu}명)` : ''}`, ...b.notes].join('\n')).join('\n\n');
}
// 관람 인원이 바뀌었는데 예약 내역의 관람 줄은 그대로일 때 (2026-11-19): 시간대 관람권 줄(9~18 · 13~18) 인원을 「관람 인원 − 다른 관람 영역」에 맞춤
//  관람 인원을 고칠 때 · 견적서 · 거래명세서 · 사전답사를 누를 때. 줄이 없거나 맞추면 0명 이하가 되면 그대로
function fitViewToPeople(r){ const n=numOf(r.people); if(!n) return false;
  const list=viewsParse(r.views), i=list.findIndex(x=>/관람\((09|13):00~18:00\)/.test(x.src)); if(i<0) return false;
  const diff=n-areaOthers(r); if(!diff) return false; const q=list[i].qty+diff; if(q<=0) return false;
  list[i].qty=q; r.views=goodsJoin(list); return true; }
function fitViewNow(){ if(!fitViewToPeople(rec)) return false; touched.add('views'); if(typeof renderItems==='function') renderItems(true); renderSide(); return true; }
document.addEventListener('change', e=>{ if(e.target && e.target.id==='f_people') setTimeout(()=>{ pplTask(); if(fitViewNow()) toast(`관람 인원에 맞춰 예약 내역의 관람 줄 인원을 바꿨습니다 (${viewsParse(rec.views).map(x=>`${viewLabel(daySrc(x.src, rec))} ${x.qty}명`).join(', ')}).`, 3600); }, 0); });
// 저장한 예약의 관람 인원이 바뀌면 추후 과업 「예약 내역&전산 내역 확인」 (설명: 인원수 변경에 따른 예약 내역 확인, 2026-11-19)
function pplTask(){ const was=String((baseSnap||{}).people||'').trim(), now=String(rec.people||'').trim(); if(!editingId || !was || !now || was===now) return;
  if(typeof tcfgOf==='function' && (tcfgOf('pplchk')||{}).off) return;   // 추후과업 메시지 관리에서 끔 (2026-11-23)
  let t=tasks.find(x=>x.id==='pplchk');
  if(!t){ t={id:'pplchk', title:AUTO_TASKS.pplchk||PPL_TITLE, custom:true, done:false, at:new Date().toISOString(), due:(typeof tcfgDue==='function' && tcfgDue('pplchk', rec)) || todayYmd(), pplFrom:was}; tasks.push(t); }
  else if(t.done){ t.done=false; t.doneAt=''; t.at=new Date().toISOString(); t.due=todayYmd(); delete t.dueSet; t.pplFrom=was; t.changes=[]; }
  t.pplTo=now; t.changes=[...(t.changes||[]).filter(c=>!/^관람 인원 .* \(단체 화면\)$/.test(c)), `관람 인원 ${was} → ${now} (단체 화면)`]; renderTasks(); renderSide(); }   // 무엇이 바뀌었는지 과업 아래에 (2026-11-21)
// 「예약 내역&전산 내역 확인」 아래에 보이는 바뀐 내용 (예전 기록은 pplFrom → pplTo 로)
const pplChanges = t => (t.changes||[]).length ? t.changes : (t.pplFrom && t.pplTo ? [`관람 인원 ${t.pplFrom} → ${t.pplTo}`] : []);
// 열어 둔 예약이 다른 곳(다음날 고객 응대 준비 · 다른 PC)에서 바뀌면 (2026-11-19): 30초마다 받아 올 때 확인
//  고치던 것이 없으면 그 예약을 새로 불러오고, 고치는 중이면 내가 안 고친 칸만 받아 넣음 → 옛 내용으로 저장해 덮어쓰지 않게
const liveVals = r => { const x=unpackExtra(r||{}), o={}; ['org','people','date','tin','phone','vehicle','sadam1','sadam2','sadamD','mabangL'].forEach(k=>{ o[k]=String((r||{})[k]??'').trim(); }); o.gate=String(x.gate||'').trim(); o.views=String(x.views||'').trim(); return o; };
function liveSync(){
  try{
    if(!editingId || !openedObj || saving || lockOwner) return;
    const r=merged().find(x=>x.id===editingId); if(!r || r._pending || rawPick(r)===openedRaw) return;
    const nv=liveVals(r), keys=Object.keys(nv).filter(k=>nv[k]!==openedObj[k]);
    openedRaw=rawPick(r); if(!keys.length) return;
    const lab=k=>k==='views'?'관람 품목':(LABEL[k]||k), what=keys.map(k=>k==='views'?'관람 품목':`${lab(k)} ${openedObj[k]||'없음'} → ${nv[k]||'없음'}`).join(', ');
    if(!isDirty() && $('#listModal').hidden){ const y=window.scrollY; openRecord(r); window.scrollTo(0,y); toast(`다른 곳에서 바뀐 내용을 받아 왔습니다: ${what}`, 5000); return; }
    const took=keys.filter(k=>String(rec[k]??'').trim()===String(openedObj[k]??'').trim());
    took.forEach(k=>{ rec[k]=nv[k]; touched.add(k); });
    openedObj=nv;
    if(took.length){ renderForm(); if(typeof renderItems==='function') renderItems(true); renderSide(); toast(`다른 곳에서 바뀐 내용을 받아 넣었습니다: ${took.map(k=>k==='views'?'관람 품목':`${lab(k)} → ${nv[k]||'없음'}`).join(', ')}`, 5000); }
  }catch(e){ console.warn('liveSync', e); }
}
// 견적서 · 거래명세서 · 사전답사 버튼: 넘기기 전에 공유 기록의 최신 내용(다른 화면 · 다음날 고객 응대 준비에서 고친 것)으로 다시 불러옴 (2026-11-19)
//  이 화면에서 고치던 것이 있으면 그것이 지금 내용 → 그대로
async function freshRec(){
  if(!editingId || isDirty()) return false;
  try{ await pull(); }catch(_){ return false; }
  const r=(await store.list()||[]).find(x=>x.id===editingId); if(!r) return false;
  if(!openedRaw || rawPick(r)===openedRaw) return false;
  openRecord(r); toast('공유 기록의 최신 내용으로 다시 불러왔습니다.', 2400); return true;
}
// doc: 'quote'(견적서) | 'statement'(거래명세서). 저장된 예약이면 예약 ID도 넘겨, 견적서 사이트가 출력한 파일을 드라이브에 올리고 이 예약 과업에 링크를 돌려준다
async function openQuote(doc){
  const win=window.open('about:blank', '_blank');   // 누르는 순간 탭을 열어 둠 (불러오는 동안 팝업 차단 피하기)
  await freshRec(); fitViewNow();   // 최신 내용 + 관람 줄 인원을 관람 인원에 맞춤
  return openQuote2(doc, win);
}
async function openQuote2(doc, win){
  if(!rec.date || !numOf(rec.people)){ try{ win && win.close(); }catch(_){} toast('방문일과 관람 인원을 먼저 넣어 주세요.'); return; }
  // 버튼을 누르면 요청 체크가 켜지고(추후 과업 '견적서 발급' · '거래명세서 발급') 저장. 출력해서 파일이 돌아오면 하위 과업 '생성'이 체크됨
  const tid = doc==='statement' ? 'stmt' : 'quote';
  rec[tid==='stmt' ? 'wantStmt' : 'wantQuote'] = '있음'; touched.add(tid==='stmt' ? 'wantStmt' : 'wantQuote');
  renderSide();
  await save(true);   // 파일을 이 예약에 붙이려면 저장돼 있어야 함
  const {blocks, skipped} = quoteBlocks(rec);
  const c = contactsOf(rec)[0] || {};
  const email = (contactsOf(rec).map(x=>String(x.email||'').split(/[\s,;\/]+/).find(s=>/@/.test(s))||'').find(Boolean)) || '';   // 담당자 이메일 중 가장 위에 있는 것 → 견적서 메일 받는 사람 (2026-11-21)
  const h = { at:Date.now(), raw:quoteRaw(rec, blocks), client:rec.org||'', clientMgr:c.name||'', email, sender:savedOwner()||rec.owner||'', doc: doc||'quote', recId: editingId||'', org: rec.org||'', date: rec.date||'' };
  try{ localStorage.setItem('sy_intake_handoff', JSON.stringify(h)); }catch(_){ try{ win && win.close(); }catch(__){} toast('이 브라우저에서는 넘길 수 없습니다.'); return; }
  if(win && !win.closed) win.location.href=new URL(QUOTE_URL, location.href).href; else window.open(QUOTE_URL, '_blank');
  toast(`${doc==='statement'?'거래명세서':'견적서'} 사이트를 열었습니다 · ${blocks.length}개 상품${skipped.length?` · ${skipped.join(', ')}은(는) 직접 추가`:''} · 출력한 내용은 발급 내역에`);
}
// 발급 내역 (견적서 사이트 공유 저장소, 2026-11-21): 이 예약으로 발급한 견적서 · 거래명세서가 있으면 버튼에 ✓, 다시 누르면 발급 내역에서 그 문서를 엶
// 같은 예약 = 발급할 때 넘긴 예약 ID(snapshot.intakeRec) 또는 수신(업체) · 이용일(방문일)이 같은 것. 발급 취소한 것은 빼고
var quoteHist=null, quoteHistAt=0;   // var: paintDocBtns 가 먼저 불려도 되게
const QH_DATE = v => { v=String(v||''); if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const d=new Date(v); return isNaN(d) ? v.slice(0,10) : ymd(d); };
async function loadQuoteHist(force){
  if(BOOK_ONLY || (!force && Date.now()-quoteHistAt<60000)) return; quoteHistAt=Date.now();
  try{ const j=await SY.quote.get('history=1&limit=500');
    if(j && Array.isArray(j.history)){ quoteHist=j.history.map(h=>({ id:h.id, at:h.at, doc:h.doc, client:h.client, date:QH_DATE((h.snapshot&&h.snapshot.useDate)||h.useDate), rec:(h.snapshot&&h.snapshot.intakeRec)||'', canceled:h.canceled })); paintDocBtns(); } }catch(_){}
}
var DOC_KO = { quote:'견적서', statement:'거래명세서', stmt:'거래명세서' };
function issuedDocs(doc){
  if(!quoteHist || !rec) return [];
  const org=normSrc(rec.org), name=DOC_KO[doc];
  return quoteHist.filter(h=>!h.canceled && h.doc===name && ((editingId && h.rec===editingId) || (org && normSrc(h.client)===org && rec.date && h.date===rec.date)));
}
// 이미 발급했으면 발급 내역으로, 아니면 새로 발급
// 2026-11-25: 발급 내역으로 갈 때도 지금 예약 내용(최신으로 다시 불러온 것)을 같이 넘김 → 견적서 사이트에서 「수정발행」을 누르면
//  새 예약 내용으로 품목을 만들고 지난 발급의 결제 방식 · 내부용 / 외부용 · 외부용 바꾼 품목을 이어받음 (document/js/document.js reviseFresh)
async function docBtn(doc){
  // 2026-11-26: 이 문서는 아직 안 냈어도 다른 종류(견적서 ↔ 거래명세서)를 낸 적이 있으면 발급 내역으로 → 그 문서의 「수정발행」이 설정 · 외부용을 이어받아 이 문서를 만듦
  const mine=issuedDocs(doc).length, other=issuedDocs(doc==='statement'?'quote':'statement').length;
  if(!mine && !other){ openQuote(doc); return; }
  const win=window.open('about:blank', '_blank');   // 누르는 순간 탭을 열어 둠 (불러오는 동안 팝업 차단 피하기)
  await freshRec(); fitViewNow();
  if(!mine){   // 처음 내는 문서: 새로 발급할 때(openQuote2)처럼 요청 체크를 켜고 저장
    if(!rec.date || !numOf(rec.people)){ try{ win && win.close(); }catch(_){} toast('방문일과 관람 인원을 먼저 넣어 주세요.'); return; }
    const wk = doc==='statement' ? 'wantStmt' : 'wantQuote';
    rec[wk] = '있음'; touched.add(wk); renderSide();
    await save(true);
  }
  if(isDirty()) await save(true);   // 화면에서 고친 것까지 저장한 뒤 그 내용으로
  const {blocks} = quoteBlocks(rec), c = contactsOf(rec)[0] || {};
  const email = (contactsOf(rec).map(x=>String(x.email||'').split(/[\s,;\/]+/).find(s=>/@/.test(s))||'').find(Boolean)) || '';
  const h={ at:Date.now(), mode:'history', doc, recId:editingId||'', org:rec.org||'', date:rec.date||'',
    raw: blocks.length ? quoteRaw(rec, blocks) : '', client:rec.org||'', clientMgr:c.name||'', email, sender:savedOwner()||rec.owner||'' };
  try{ localStorage.setItem('sy_intake_handoff', JSON.stringify(h)); }catch(_){ try{ win && win.close(); }catch(__){} toast('이 브라우저에서는 넘길 수 없습니다.'); return; }
  if(win && !win.closed) win.location.href=new URL(QUOTE_URL, location.href).href; else window.open(QUOTE_URL, '_blank');
  toast(mine ? `${DOC_KO[doc]} 발급 내역을 열었습니다 · 예약이 바뀌었으면 「수정발행」 = 새 예약 내용 + 지난 설정`
    : `앞서 발급한 ${DOC_KO[doc==='statement'?'quote':'statement']}가 있어 발급 내역을 열었습니다 · 그 줄의 「수정발행」 = 그때 설정 · 외부용을 이어받아 ${DOC_KO[doc]} 만들기`, 5000);
}
$('#quoteBtn').onclick=()=>docBtn('quote');
$('#stmtBtn').onclick=()=>docBtn('statement');
window.addEventListener('focus', ()=>loadQuoteHist());   // 견적서 사이트에서 출력하고 돌아오면 ✓ 다시 (1분에 한 번)
setTimeout(()=>loadQuoteHist(true), 1500);
// 버튼 앞 체크: 켜면 추후 과업에 발급 과업(하위 과업 3개)이 생기고, 끄면 (손대지 않은) 과업이 빠짐
document.querySelectorAll('[data-want]').forEach(c=>c.addEventListener('change', ()=>{ const wk=c.dataset.want; rec[wk]=c.checked?'있음':''; touched.add(wk); startTimer(); renderSide(); }));

// ===================== 예약 단계 (2026-11-18 · 4단계) =====================
// 1 예약상담(연한 초록) = 상담만 · 2 가예약(중간 초록) = 전산에 등록했지만 결제 방식 미정 · 3 예약확정(초록) = 모든 사항이 정해짐 · 4 예약취소(회색) = 가예약 · 예약확정에서만
// 자동(점선): 결제 방식을 정했으면 예약확정, 전산 등록만 했으면 가예약, 아니면 예약상담. 버튼으로 직접 고를 수 있음 (예약취소는 직접만)
// 시트 '통화 구분' 칸에 단계 이름 그대로. 예전 이름: 예약접수 · 공식예약 → 예약확정, 상담 → 예약상담
const STAGES = ['예약상담','가예약','예약확정','예약취소'];
const OLD_STAGE = { '상담':'예약상담', '예약접수':'예약확정', '공식예약':'예약확정' };
const normStage = s => OLD_STAGE[s] || s;
const stageAuto = r => r.pay && r.pay!=='미정' ? '예약확정' : r.erp ? '가예약' : '예약상담';
const effStage = r => (STAGES.includes(r.stage) ? r.stage : '') || stageAuto(r);
const isBooked = s => s==='가예약' || s==='예약확정';   // 그날 자리 · 프로그램을 잡고 있는 예약 (예약 현황 · 방문 예정에 들어감)
const quietStage = s => s==='예약상담' || s==='예약취소';   // 추후 과업을 만들지 않는 단계
const needsErp = r => !quietStage(effStage(r));
function renderStage(){
  const s=effStage(rec), manual=STAGES.includes(rec.stage);
  document.querySelectorAll('#stageSeg button').forEach(b=>{ b.classList.toggle('on', b.dataset.s===s && manual); b.classList.toggle('guess', b.dataset.s===s && !manual);
    if(b.dataset.s==='예약취소'){ const base=rec.stage==='예약취소' ? '' : s; b.disabled = base==='예약상담'; b.title = b.disabled ? '예약취소는 가예약 · 예약확정에서만' : '예약 취소 (회색 · 추후 과업 없음)'; } });
  { const cw=$('#cancelWhyTxt'); if(cw){ const on=s==='예약취소' && !!rec.cancelWhy; cw.hidden=!on; cw.textContent=on ? '사유: '+rec.cancelWhy : ''; cw.title='눌러서 사유 고치기'; } }   // 예약취소 사유를 버튼 옆에
  const lbl = $('#saveBtn').firstChild; if(lbl) lbl.textContent = '저장'; $('#saveBtn').title = `${s}으로 저장 (Ctrl+S)`;   // 단계는 왼쪽 버튼에 보이므로 글자는 짧게
}
// 단계 버튼: 같은 버튼을 다시 누르면 자동으로 · 예약취소는 사유를 받은 뒤 (2026-11-18) · 다른 단계로 바꾸면 취소 사유는 지움
const CANCEL_REASONS = ['일정 변경','인원 부족','다른 곳 이용','날씨','단체 사정','기타'];
function setStage(s){ rec.stage=s; touched.add('stage'); if(s!=='예약취소' && rec.cancelWhy){ rec.cancelWhy=''; touched.add('cancelWhy'); } renderSide(); }
document.querySelectorAll('#stageSeg button').forEach(b=>b.onclick=()=>{
  const s=b.dataset.s;
  if(s==='예약취소' && rec.stage!=='예약취소'){ openCancel(); return; }
  setStage(rec.stage===s ? '' : s); });
function openCancel(){
  $('#cancelChips').innerHTML = CANCEL_REASONS.map(c=>`<button type="button" class="chip" data-cr="${esc(c)}">${esc(c)}</button>`).join('');
  $('#cancelWhy').value = rec.cancelWhy||''; $('#cancelModal').hidden=false; setTimeout(()=>$('#cancelWhy').focus(), 0); }
$('#cancelChips').addEventListener('click', e=>{ const c=e.target.closest('[data-cr]'); if(!c) return; const t=$('#cancelWhy'); t.value = c.dataset.cr==='기타' ? t.value : (t.value.trim() ? t.value.trim()+' · ' : '')+c.dataset.cr; t.focus(); });
$('#cancelNo').onclick=()=>{ $('#cancelModal').hidden=true; };
$('#cancelOk').onclick=()=>{ const v=$('#cancelWhy').value.trim().replace(/\s*\n+\s*/g,' · ');
  if(!v){ toast('취소 사유를 적어 주세요.'); $('#cancelWhy').focus(); return; }
  $('#cancelModal').hidden=true; rec.cancelWhy=v.replace(/\s\/\s/g,' · '); touched.add('cancelWhy'); setStage('예약취소');
  if(editingId) save({auto:true}); toast(`예약취소로 바꿨습니다 · 사유: ${rec.cancelWhy}`); };
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#cancelModal').hidden){ e.preventDefault(); $('#cancelModal').hidden=true; } });
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
  if(fields.tour){ rec.tour=tourJoin(tourWithDefaults(rec, fields.tour)); syncTourTask(); }   // 답사 신청: 성명 · 연락처가 없으면 담당자 이름 · 연락처 → 과업 「사전답사 전산 예약」 메모도
  staffDefaults();   // 단체상담 상품으로 채운 프로그램 담당 = 영업 담당
  Object.keys(fields).forEach(k=>{ const g=OPT[GROUP_OF[k]]; if(g) optOpen.add(g.id); });   // 식사 · 프로그램이 채워졌으면 그 묶음을 펼침
  if(extra.length){ const box=$('#memoBox'); box.value = (box.value ? box.value.replace(/\s*$/,'\n') : '') + extra.join('\n'); }
  nContacts=Math.max(nContacts, nContactsOf(rec)); renderContacts(); startTimer(); renderForm();
  closeConsult(); $('#consultBox').value='';
  toast(`${n}개 항목을 채웠습니다${extra.length?` · ${extra.length}줄은 통화 메모에`:''}`);
};

// ===================== 단체예약 목록 엑셀로 내려받기 (2026-11-26 되살림 · 목록 창 머리줄의 버튼): 표에 보이는 예약 그대로 · 같은 순서 =====================
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
    const rows = listView.shown.slice();   // 표에 보이는 것 그대로 (같은 순서 · renderList 가 정렬해 둠)
    const COLS = [['방문일',12],['단계',9],['전산',8],['업체',22],['영업 담당',9],['결제',16],['차량',10],['입장',7],['입장문',8],['퇴장',7],['관람',8],
      ['사담 1부',8],['사담 2부',8],['사담 디너',9],['마방 시간',12],['마방 인원',9],['마방 메뉴',22],['마방 단가',10],['마방 결제',9],['마방 비고',16],...PROG_KEYS().map(k=>[LABEL[k]+(UNIT(k)==='시간'?' (시간)':''),11]),['기타 프로그램',14],
      ['견적서',10],['거래명세서',10],['담당자',14],['연락처',16],['이메일',24],['인원 변경',9],['현장 재결제',10],['미정 항목',16],['특별 할인',16],['통화 메모',40],['접수',16]];
    const wb = new ExcelJS.Workbook(); wb.creator='사유원 단체 예약 도우미'; wb.created=new Date();
    const ws = wb.addWorksheet('단체예약 현황', { views:[{ state:'frozen', ySplit:1 }] });
    ws.columns = COLS.map(([h,w])=>({ header:h, width:w }));
    rows.forEach(r=>{
      const x={...r, ...unpackExtra(r)}, sp=(String(r.memo||'').match(/(?:^|\s\/\s)특별 할인\s+([^/]+)/)||[])[1]||'';   // 칸 맨 앞 '특별 할인' 만 ('항목 특별 할인' 과 헷갈리지 않게)
      ws.addRow([r.date||'', listView.stageOf(r), listView.erpOf(r)?'등록':(listView.stageOf(r)==='예약상담'?'':'미등록'), r.org||'', r.owner||r.takenBy||'', r.pay||'', r.vehicle||'', r.tin||'', x.gate||'', r.tout||'', r.people||'',
        r.sadam1||'', r.sadam2||'', r.sadamD||'', x.mabangTime||'', (r.mabangL||'')+(r.mabangD?` (예전 디너 ${r.mabangD})`:''), r.mabangMenu||'', (mbUnit({...r,...x})||''), x.mabangPay||'', x.mabangNote||'', ...PROG_KEYS().map(k=>x[k]||''), Object.keys(x).filter(k=>x[k] && (LEGACY_KEYS.includes(k) || (/^px:/.test(k) && !PROG_KEYS().includes(k)))).map(k=>`${LABEL[k]||k.slice(3)} ${x[k]}`).join(', '),
        docState(r,'quote'), docState(r,'stmt'),         r.contact||'', r.phone||'', r.email||'', x.pchg?'있음':'', x.onsite?'있음':'', x.tbd?(x.tbd+(x.tbdDate?` (${x.tbdDate}까지)`:'')):'', sp.trim(), r.note||'', r.saved?fmt(r.saved):'']);
    });
    const head = ws.getRow(1); head.font={ bold:true, color:{argb:'FFFFFFFF'} }; head.alignment={ vertical:'middle', horizontal:'center' }; head.height=22;
    head.eachCell(c=>{ c.fill={ type:'pattern', pattern:'solid', fgColor:{argb:'FF3F5236'} }; });
    ws.eachRow((row,i)=>{ if(i>1) row.alignment={ vertical:'top', wrapText:true }; row.eachCell(c=>{ c.border={ bottom:{ style:'thin', color:{argb:'FFDDDDDD'} } }; }); });
    ws.autoFilter = { from:{row:1,column:1}, to:{row:1,column:COLS.length} };
    const buf = await wb.xlsx.writeBuffer();
    const pf=$('#pastFrom').value, pt=$('#pastTo').value, tag = $('#listSearch')?.value.trim() ? '_검색' : (pf||pt) ? `_${(pf||'처음').replace(/-/g,'')}-${(pt||'끝').replace(/-/g,'')}` : '';   // 검색 · 고른 기간을 파일 이름에
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    a.download=`사유원_단체예약현황${tag}_${ymd(new Date()).replace(/-/g,'')}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000);
    toast(`${rows.length}건을 엑셀로 내려받았습니다.`);
  }catch(e){ toast('엑셀을 만들지 못했습니다: '+e.message); }
  btn.disabled=false; btn.textContent='엑셀로 내려받기';
}
// 견적서 · 거래명세서 버튼: 발급했으면 체크 표시
function paintDocBtns(){
  [['ckQuote','wantQuote'],['ckStmt','wantStmt']].forEach(([c,wk])=>{ const el=document.getElementById(c); if(el) el.checked=!!rec[wk]; });   // 버튼 앞 체크 = 과업 요청
  paintTourCk();   // 사전답사 체크 = 답사 정보 있음
  [['quoteBtn','quote','견적서','quote'],['stmtBtn','stmt','거래명세서','statement']].forEach(([b,id,name,doc])=>{ const el=document.getElementById(b); if(!el) return;
    const hs=typeof issuedDocs==='function' ? issuedDocs(doc) : [], last=hs.map(h=>h.at).sort().pop();   // 발급 내역에 있으면 ✓ (2026-11-21)
    el.classList.toggle('issued', !!hs.length); el.textContent = name;
    el.title = hs.length ? `${name} 발급함 ${last?dtLabel(last):''} · 누르면 발급 내역(재발행 · 수정발행)` : `${name} 발급`; });
}
$('#xlsxBtn').onclick=downloadXlsx;

// 목록 · 엑셀: 견적서 / 거래명세서 발행 여부 (추후 과업 기준)
function docState(r, id){
  const t = parseHist(r).tasks.find(x=>x.id===id), x = unpackExtra(r);
  const asked = id==='quote' ? x.wantQuote : x.wantStmt;
  return t && t.done ? '발행' : (t || asked) ? '요청' : '';
}
const docTag = (r,id) => { const s=docState(r,id); return s==='발행' ? '<span class="tag st-공식예약">발행</span>' : s==='요청' ? '<span class="tag tbd-tag">요청 · 미발행</span>' : ''; };

// ===================== 예약 삭제: 사유 고르기 =====================
// 사유 목록 (피드백 받아 고칠 것)
const DEL_REASONS = ['고객 취소 (방문 취소)','일정 연기 · 날짜 다시 잡기로','다른 예약과 중복 등록','잘못 입력 · 테스트','인원이 줄어 단체 예약 아님 (개인 예약으로)','다른 곳으로 결정 · 견적 후 진행 안 함','연락 두절','기타 (직접 입력)'];
// ===================== 단체예약 목록 '수정': 상태가 실제와 다를 때 사유를 받고 고침 =====================
// 사유 기본 목록 (피드백 받아 고칠 것)
const FIX_REASONS = ['영업 담당 변경 (인수인계 · 담당 바뀜)','잘못 눌러 발행으로 표시됨 (실제로는 발행 안 함)','다른 경로로 이미 발행함 (메일 · 수기 등)','고객이 서류 요청을 취소함','전산 등록 상태가 실제와 다름','예약 단계가 실제와 다름 (결제 · 확정 여부 변경)','기타 (직접 입력)'];
let fixId=null, fixBase=null;
const DOC_LABEL = { '발행':'발행', '요청':'요청 · 미발행', '':'없음' };
function fixStateOf(r){ return { owner: ownerOf(r), stage: stageOfRec(r), erp: (/^adm/.test(r.id) || !!unpackExtra(r).erp) ? '1' : '', quote: docState(r,'quote'), stmt: docState(r,'stmt') }; }
function fixDiffList(a,b){ const out=[];
  if(a.owner!==b.owner) out.push(`영업 담당 ${a.owner||'없음'} → ${b.owner||'없음'}`);
  if(a.stage!==b.stage) out.push(`예약 단계 ${a.stage} → ${b.stage}`);
  if(a.erp!==b.erp) out.push(`전산 ${a.erp?'등록':'미등록'} → ${b.erp?'등록':'미등록'}`);
  if(a.quote!==b.quote) out.push(`견적서 ${DOC_LABEL[a.quote]} → ${DOC_LABEL[b.quote]}`);
  if(a.stmt!==b.stmt) out.push(`거래명세서 ${DOC_LABEL[a.stmt]} → ${DOC_LABEL[b.stmt]}`);
  return out; }
const fixCur = () => ({ owner:$('#fixOwner').value.trim(), stage:$('#fixStage').value, erp:$('#fixErp').value, quote:$('#fixQuote').value, stmt:$('#fixStmt').value });
function paintFixDiff(){ const c=fixCur(), d=fixDiffList(fixBase, c); $('#fixDiff').textContent = (d.length ? '바뀌는 것: '+d.join(', ') : '바꿀 상태를 고르세요.') + (c.owner!==fixBase.owner ? ' · 영업 담당을 바꾸면 자세한 사유를 꼭 적어 주세요.' : ''); $('#fixOk').disabled=!d.length; }
function openFix(id){
  const r=cache.find(x=>x.id===id); if(!r) return;
  // 2026-11-25: 남이 담당인 예약도 열림 — 영업 담당만 바꿀 수 있음(사유 직접 입력 필수) · 단계 · 전산 · 서류는 담당만
  const o=ownerOf(r), me=savedOwner(), other=!!(o && me && o!==me);
  fixId=id; fixBase=fixStateOf(r);
  ['#fixStage','#fixErp','#fixQuote','#fixStmt'].forEach(s=>{ $(s).disabled=other; $(s).title=other?`${o}님 담당 예약이라 영업 담당만 바꿀 수 있습니다.`:''; });
  // 2026-11-25: 영업 담당 = 멤버관리의 사람 모두 (고르기) · 지금 담당이 멤버가 아니면 「(멤버 아님)」으로 그대로
  const paintOwner=()=>{ const cur=fixBase.owner, L=MEMBER_NAMES.slice(); $('#fixOwner').innerHTML=(cur?'':'<option value="">담당 고르기</option>') + L.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('') + (cur && !L.includes(cur) ? `<option value="${esc(cur)}">${esc(cur)} (멤버 아님)</option>` : ''); $('#fixOwner').value=cur; };
  paintOwner(); loadMemberNames().then(()=>{ if(fixId===id && $('#fixOwner').value===fixBase.owner){ paintOwner(); paintFixDiff(); } });
  // 예약 단계 목록은 지금 단계 이름(STAGES)으로 — 예전 목록(예약상담 · 예약접수)엔 가예약 · 예약확정이 없어 그 예약을 고치면 단계가 비던 것 (2026-11-25)
  $('#fixStage').innerHTML=[...new Set([...STAGES, fixBase.stage].filter(Boolean))].map(s=>`<option>${esc(s)}</option>`).join('');
  $('#fixWho').textContent = [r.org||r.contact||'(업체 미정)', r.date&&dateLabel(r.date)].filter(Boolean).join(' · ');
  $('#fixStage').value=fixBase.stage; $('#fixErp').value=fixBase.erp; $('#fixQuote').value=fixBase.quote; $('#fixStmt').value=fixBase.stmt;
  $('#fixReason').innerHTML = '<option value="">사유를 고르세요</option>' + FIX_REASONS.map(x=>`<option>${esc(x)}</option>`).join('');
  $('#fixNote').value=''; paintFixDiff(); $('#fixModal').hidden=false; $('#fixStage').focus();
}
const closeFix = () => { $('#fixModal').hidden=true; fixId=null; };
['#fixStage','#fixErp','#fixQuote','#fixStmt'].forEach(s=>$(s).addEventListener('change', paintFixDiff)); $('#fixOwner').addEventListener('change', paintFixDiff);
$('#fixCancel').onclick=closeFix;
$('#fixModal').addEventListener('mousedown', e=>{ if(e.target.id==='fixModal') closeFix(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#fixModal').hidden){ e.preventDefault(); closeFix(); } });
$('#fixOk').onclick=async ()=>{
  const cur=fixCur(), diff=fixDiffList(fixBase, cur); if(!diff.length) return;
  const reason=$('#fixReason').value, note=$('#fixNote').value.trim();
  if(!reason){ toast('수정 사유를 골라 주세요.'); $('#fixReason').focus(); return; }
  if(/^기타/.test(reason) && !note){ toast('기타 사유를 적어 주세요.'); $('#fixNote').focus(); return; }
  if(cur.owner!==fixBase.owner){
    if(!cur.owner){ toast('영업 담당을 골라 주세요.'); $('#fixOwner').focus(); return; }
    if(!note){ toast('영업 담당을 바꾸는 사유를 적어 주세요.'); $('#fixNote').focus(); return; } }
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
  const item={...r, ...(cur.owner!==fixBase.owner ? {owner:cur.owner} : {}), pay:pk.pay, memo:pk.memo, callType:cur.stage, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos, notes:ph.notes}), saved:now};
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
  await store.put({...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos, notes:ph.notes}), saved:now});
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

// ▣ js/group/13-start-my.js — 시작(처음 한 번 그리기 · 받기) · 내가 영업 담당인 예약 고르기(myRecords) · 저장된 과업 맞추기
// ===================== 시작 =====================
resetState(); buildForm(); mergePriceLayout(); renderForm();
paintSync(); renderList();
flush();
window.__priceReady=true; renderPrice(); loadQuotePrices();
// ===================== 공통: 저장된 예약 하나 읽기 =====================
const xOf = r => ({...r, ...unpackExtra(r)});   // 비고 칸에 모아 둔 값(미정 · 입력 기한 등)까지 펼침
const stageOfRec = r => /^adm/.test(r.id) && !STAGES.includes(normStage(r.callType)) ? '예약확정' : STAGES.includes(normStage(r.callType)) ? normStage(r.callType) : stageAuto(xOf(r));
const isGroupRec = r => ['단체예약',...STAGES,...Object.keys(OLD_STAGE)].includes(r.callType||'단체예약');
const ownerOf = r => (r.owner||r.takenBy||'').trim();
const daysFrom = (a,b) => Math.round((new Date(b+'T00:00')-new Date(a+'T00:00'))/864e5);   // a → b 며칠
const firstContact = r => { const n=String(r.contact||'').split(/\s*\/\s*/)[0]||'', p=String(r.phone||'').split(/\s*\/\s*/)[0]||''; return n||p ? `${n}${p?`(${p})`:''}` : ''; };

// ===================== 나의 할일: 내가 영업 담당인 예약 =====================
// 헤더 '영업 담당' 이름과 같은 예약만. 연락할 미정 항목 · 남은 과업 · 방문 예정 순서로
function myRecords(){ const me=savedOwner(); return me ? (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)===me) : []; }
// 열어 둔 예약의 과업 상태(화면에서 저절로 완료 · 정리된 것)가 저장된 것과 다르면, 과업만 조용히 저장 (2026-11-18)
//  - 다른 칸은 건드리지 않고 수정 기록에도 남기지 않음 · 고치는 중(저장 안 한 변경)이면 원래 저장 때 함께 · 남이 담당 · 다른 창에서 고치는 중이면 안 함
function syncSavedTasks(id){
  if(editingId!==id || lockOwner || editLockBy || isDirty()) return;
  const r=cache.find(x=>x.id===id); if(!r) return;
  const ph=parseHist(r), clean=ts=>JSON.stringify((ts||[]).map(t=>({id:t.id, done:!!t.done, removed:!!t.removed})));
  if(clean(ph.tasks)===clean(tasks)) return;
  let old={}; try{ old=JSON.parse(r.history||'{}')||{}; }catch(_){}
  const item={...r, history:JSON.stringify({...old, h:ph.h, tasks, erp:ph.erp, memos:ph.memos, notes:ph.notes})};
  store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;
}
// 저장된 과업을 추후 과업 칸(화면)과 같은 기준으로 맞춤 (2026-11-18): 화면에서 저절로 완료된 과업이 저장 전이라 나의 할일 · 알림에 「오늘 마감」으로 남던 것
//  - 삭제한 과업(removed) 빼기 · 전산 예약 = 전산 등록 · 결제링크 전송 = 전송 일시 · 입금 확인 = 입금 일시 · 프로그램 담당 = 담당이 다 차면
//  - 견적서 · 거래명세서 등 하위 과업이 모두 체크되면 완료 · 예전 기준(담당자 이름 등)으로 생긴 전산 예약 수정은 빼기
function settleTasks(list, r, x){
  return (list||[]).filter(t=>!t.removed)
    .filter(t=>!(t.id==='erpfix' && !t.done && !(t.v===4 && (t.changes||[]).length) && !(t.changes||[]).some(c=>/전산 비고/.test(c)) && !t.memo && !(t.xsubs||[]).length))
    .map(t=>{ const u={...t};
      if(u.id==='staffbrief' && !u.dueSet && !u.done && r && r.date) u.due=staffFri(r.date);   // 열지 않은 예약도 방문 전주 금요일 (2026-11-21 · 직접 바꾼 마감은 그대로)
      if(u.id==='erp') u.done = !!u.done || !!x.erp || /^adm/.test(r.id);   // 저장된 체크가 먼저 (2026-11-23)
      else if(u.id==='linksend') u.done = !!u.done || !!x.linkSent;
      else if(u.id==='paycheck'){ if(x.paidAt) u.done=true; }
      else if(u.id==='progstaff'){ if(!u.done){ try{ u.done = !missingStaff(x).length; }catch(_){} } }
      else { const ds=DOC_SUBS[u.id], st=[...(ds && u.subs ? ds.map(([k])=>!!u.subs[k]) : []), ...(u.xsubs||[]).map(s=>!!s.done)]; if(st.length && st.every(Boolean)) u.done=true; }
      return u; });
}
// ▣ js/group/14-task-sim.js — 열지 않은 예약의 추후 과업 계산(simTasks — 열었을 때와 같게) · 나의 할일 화면(renderMy: 탭 · 오늘 마감 · 오늘 완료) · 바깥에서 예약 열기
// ===== 열지 않은 예약의 추후 과업 = 열었을 때와 똑같이 (2026-11-21) =====
// 예전: 예약을 열어야 syncAutoTasks(과업 규칙)가 돌아 새 과업(전산 예약 · 견적서 · 담당자에게 일정 전달 …)이 생기고 저장됨 →
//       열기 전에는 나의 할일에 안 뜨다가, 누군가 그 예약을 열면 그때 (이미 기한이 지난 채로) 나타났음
// 지금: 나의 할일 · 알림이 예약마다 그 예약을 연 것처럼 같은 규칙(syncAutoTasks)을 화면 밖에서 돌려 과업을 계산 (저장은 하지 않음 · 화면 상태는 그대로 되돌림)
//  recFromRecord = openRecord 가 시트 한 줄로 예약 칸(rec)을 만드는 것과 같게 (화면은 건드리지 않음) — openRecord 를 고치면 여기도 같이
function recFromRecord(r){
  const o=blank(); KEYS.forEach(k=>{ o[k]=r[k]||''; });
  LEGACY_KEYS.forEach(k=>{ if(r[k]) o[k]=r[k]; }); if(r.mabangD) o.mabangD=r.mabangD;
  if(!o.owner) o.owner=savedOwner(); o.tbd='';
  Object.assign(o, unpackExtra(r));
  if(!o.pay) o.pay='미정'; if(!o.gate) o.gate='미정';
  if(o.seminar2){ o.seminar=String((numOf(o.seminar)||1)+(numOf(o.seminar2)||1)); o.seminar2=''; }
  { const gl=goodsParse(o.goods), mv=gl.filter(g=>goodsKeyOf(g.src)); if(mv.length){ mv.forEach(g=>{ const c=goodsKeyOf(g.src); o[c]=String((numOf(o[c])||0)+(g.qty||0)); }); o.goods=goodsJoin(gl.filter(g=>!goodsKeyOf(g.src))); } }
  syncPayTbd(o);
  if(/^adm/.test(r.id) && !o.erp) o.erp='관리자 예약';
  o.stage = STAGES.includes(normStage(r.callType)) && normStage(r.callType)!==stageAuto(o) ? normStage(r.callType) : '';
  Object.assign(o, splitContacts(r));
  return o;
}
const simCache=new Map();   // 예약 id → {k, tasks} (그 예약 · 오늘 · 품목 · 과업 설정이 같으면 다시 계산하지 않음)
let simVer=0;               // 품목 관리 · 추후과업 메시지 관리를 다시 받으면 올림 → 모두 다시 계산
function simTasks(r){
  const k=[r.saved||'', r.updated||'', r.callType||'', r.date||'', r.memo||'', todayYmd(), simVer, savedOwner()].join('|'), hs=String(r.history||''), c=simCache.get(r.id);
  if(c && c.k===k && c.h===hs) return c.tasks;   // 과업(수정 기록 칸)이 한 글자라도 다르면 다시 계산 (2026-11-23 · 예전엔 길이만 봐서, 길이가 같은 변경이면 옛 과업이 그대로 나왔음)
  // 2026-11-23: 열었을 때와 다르게 계산되던 곳을 맞춤 — ① 그 예약의 수정 기록(hist) · 메모(memos)도 그 예약 것으로 바꿔 놓고 계산 (예전엔 화면에 열려 있는 다른 예약의 수정 기록으로 「전산에 올린 때의 내용」을 되살렸음)
  //  ② 예약상담 · 예약취소로 열리는 예약은 화면처럼 사전답사 · 대구대교구 · 직접 추가한 과업만 ③ 계산이 실패하면 조용히 넘어가지 않고 콘솔에 남김 (실패하면 아래 예전 방식으로 떨어져 화면에 없는 과업이 나올 수 있음)
  const S={rec, tasks, erpList, editingId, touched, hist, memos};
  let out=null;
  try{ const ph=parseHist(r); rec=recFromRecord(r); tasks=JSON.parse(JSON.stringify(ph.tasks||[])); erpList=ph.erp||[]; hist=ph.h||[]; memos=ph.memos||[]; editingId=r.id; touched=new Set();
    // 예약을 열면 화면이 채워 넣는 기본값도 똑같이 (2026-11-23): 굿즈 담당 = 영업 담당 (paintFields 의 syncGoodsStaff) · 결제링크가 아니면 현장 재결제 해제.
    //  이것이 빠져서 굿즈가 있는 예약은 열면 과업이 없는데(담당이 채워짐) 나의 할일 · 첫 화면에는 「프로그램 · 굿즈 담당 입력」 · 「전산 예약 수정」(굿즈 담당이 지워진 것으로 봄)이 계속 떴음
    syncGoodsStaff(); if(rec.pay!=='결제링크' && rec.onsite) rec.onsite='';
    syncAutoTasks(); out = quietStage(effStage(rec)) ? tasks.filter(consultTask) : tasks; }
  catch(e){ out=null; try{ console.warn('simTasks', r.id, r.org, e); }catch(_){} }
  finally{ rec=S.rec; tasks=S.tasks; erpList=S.erpList; editingId=S.editingId; touched=S.touched; hist=S.hist; memos=S.memos; }
  simCache.set(r.id, {k, h:hs, tasks:out}); return out;
}
// 저장된 예약의 추후 과업 (열지 않은 예약도): 위 simTasks (열었을 때와 같은 규칙). 계산이 안 되면 예전 방식(저장된 과업 + 미정 · 현장 결제 · 점검)
// 통화 메모 확인 (2026-11-26): 예약상담 · 예약취소 예약도 영업 담당이 아닌 사람이 고친 안 읽은 메모가 있으면 과업이 뜸 (열었을 때와 같게 simTasks 로 계산)
const recMemoNew = r => { const own=ownerOf(r); return parseHist(r).memos.some(m=>m && !m.seen && m.by && m.by!==own); };
function tasksOf(r){
  if(editingId!==r.id && quietStage(stageOfRec(r)) && recMemoNew(r) && taskRecActive(r)){ const sim=simTasks(r), keep = stageOfRec(r)==='예약취소' ? (t=>t.id==='memocheck') : consultTask;   // 예약취소는 통화 메모 확인만
    if(sim) return sim.filter(t=>!t.removed && keep(t)).map(t=>({...t, due:taskDue(t)})); }
  if(stageOfRec(r)==='예약상담' && editingId!==r.id){ const x=xOf(r), all=parseHist(r).tasks, st=all.find(t=>t.id==='tour'), own=all.filter(t=>t.custom).map(t=>({...t, due:taskDue(t)})); return [...(x.tour ? [st ? {...st, due:taskDue(st)} : {id:'tour', title:AUTO_TASKS.tour, done:false, due:ymd(new Date(r.saved||Date.now())), at:r.saved}] : []), ...own]; }   // 예약상담: 사전답사 전산 예약 + 직접 추가한 과업
  if(editingId===r.id && quietStage(effStage(rec))) return tasks.filter(consultTask).map(t=>({...t, due:taskDue(t)}));
  if(editingId===r.id) return tasks.map(t=>({...t, due:taskDue(t)}));   // 지금 열어 둔 예약은 화면의 과업
  if(stageOfRec(r)==='예약취소') return [];   // 예약취소: 추후 과업 없음
  if(taskRecActive(r)){ const sim=simTasks(r); if(sim) return sim.filter(t=>!t.removed).map(t=>({...t, due:taskDue(t)})); }   // 열었을 때와 같은 과업 (2026-11-21 · 방문 뒤 30일이 지난 예약은 나의 할일에 안 나오므로 계산하지 않음)
  const x={...xOf(r)}; syncPayTbd(x);   // 미정 항목은 화면과 같은 기준 (결제 · 몽몽마방 결제 · 차량)
  const ts=settleTasks(parseHist(r).tasks, r, x);
  const has = id => ts.some(t=>t.id===id) || parseHist(r).tasks.some(t=>t.id===id && t.removed);   // 삭제한 과업은 다시 만들지 않음
  { const i=ts.findIndex(t=>t.id==='tbdcall'); if(i>=0) ts.splice(i,1); }   // 예전 「미정 항목 확인 연락」은 다음주 예약 점검으로 합침 (2026-11-23)
  // 현장 결제 인원 확인 연락은 다음주 예약 점검의 세부 과업 (2026-11-23) — 따로 만들지 않음. 예전에 저장된 것은 다음주 예약 점검이 있으면 아래에서 뺌
  if(((r.date && r.date>=ymd(new Date())) || x.tbd) && !has('wkcheck')){ const thu=prevWeekThu(r.date), old=(typeof wkDone==='function' && thu) ? wkDone(ownerOf(r), thu)[r.id] : '';   // 예전 「다음주 예약 점검」 한 줄에서 체크한 예약은 끝난 것으로
    ts.push({id:'wkcheck', title:AUTO_TASKS.wkcheck, done:!!old, ...(old?{doneAt:old}:{}), due:autoDue('wkcheck', {...x, date:r.date})}); }
  if(typeof tcfgVirtual==="function") tcfgVirtual(r, x, ts, has);   // 추후과업 메시지 관리의 새 과업 (열지 않은 예약도, 2026-11-20)
  if(typeof tcfgWhoApply==="function") tcfgWhoApply(ts);   // 추후과업 메시지 관리의 담당 (2026-11-25)
  return ts.filter(t=> t.id!=='tbdcall' && !(t.id==='onsitecall' && (x.pay!=='현장 결제' || ts.some(y=>y.id==='wkcheck'))))   // 조건이 사라진 것은 뺌 · 현장 결제 인원 확인 연락은 다음주 예약 점검에 합침
    .map(t=>({...t, ...(!t.custom && !t.titleSet && AUTO_TASKS[t.id] ? {title:AUTO_TASKS[t.id]} : t.id==='pplchk' && !t.titleSet ? {title:PPL_TITLE} : {}), due: t.id==='wkcheck' && !t.dueSet && !t.done && x.tbd && x.tbdDate && x.tbdDate < taskDue(t) ? x.tbdDate : taskDue(t)}));
}
const openTasksOf = r => tasksOf(r).filter(t=>!t.done).sort((a,b)=>a.due.localeCompare(b.due));
const taskRecActive = r => !r.date || daysFrom(r.date, ymd(new Date())) <= 30;   // 방문 뒤 30일 지난 예약의 과업은 빼고
function dueTasks(){   // 마감이 오늘이거나 지난 해결 안 된 과업 (영업 담당이 있으면 내 예약만 + 내가 담당자인 준비 과업)
  const today=ymd(new Date()), me=savedOwner();
  const out=[]; (cache||[]).filter(r=>isGroupRec(r) && (!me || ownerOf(r)===me || mayStaff(r, me)) && taskRecActive(r))
    .forEach(r=>openTasksOf(r).forEach(t=>{ if(t.due<=today && (!me || taskForMe(r, t, me))) out.push({r, t}); }));
  return out.sort((a,b)=>a.t.due.localeCompare(b.t.due));
}
// 과업 담당 (2026-11-24): 과업에 who(담당자 준비 과업)가 있으면 그 사람 것 — 영업 담당에게는 안 보임 · 없으면 예약의 영업 담당 것
const taskForMe = (r, t, me) => t.who ? t.who===me : ownerOf(r)===me;
const mayStaff = (r, me) => !!me && (String(r.memo||'').includes(me) || (typeof tcfgWhoSet==='function' && tcfgWhoSet().has(me)));   // 2026-11-25: 추후과업 메시지 관리에서 과업 담당으로 정해진 사람은 모든 예약을 훑음   // 저장된 비고(프로그램 담당 …)에 내 이름이 있는 예약만 계산 (빠르게)
// 내가 영업 담당이 아니지만 담당자로 들어간 예약의 준비 과업
const myStaffRecs = me => (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)!==me && mayStaff(r, me) && taskRecActive(r) && isBooked(stageOfRec(r)))
  .map(r=>({r, x:xOf(r), tasks:openTasksOf(r).filter(t=>t.who===me)})).filter(o=>o.tasks.length);
// 개인고객 통화 (personal.html, 통화 구분 '개인고객')의 추후 과업: 내가 받은(저장한) 통화의 안 끝난 과업
const isPersonalRec = r => r && r.callType==='개인고객';
let myTab = (()=>{ const fix=t=>(!t || t==='all' || t==='etc') ? 'main' : t; const q=new URLSearchParams(location.search).get('tab'); return q ? fix(q) : 'main'; })();   // 열 때는 늘 메인 (주소에 tab= 이 있을 때만 그 탭, 2026-11-19)   // 2026-11-19: 메인 · personal(개인예약) · group(단체예약) · cat:구분 (예전 all · etc 는 메인)   // 나의 할일 탭: all · personal · group (개인고객 화면에서 열면 ?tab=personal → 개인부터)
const MY_ONLY = new URLSearchParams(location.search).get('my')==='1';   // 나의 할일만 보는 모드 (group.html?my=1 — 팝업(embed=1) 안에서 씀)
function myPersonalOpen(){
  const me=savedOwner(); if(!me) return [];
  return (cache||[]).filter(r=>isPersonalRec(r) && (r.owner||r.takenBy)===me).map(r=>{ let ts=[]; try{ ts=(JSON.parse(r.history||'{}').tasks)||[]; }catch(_){}
    return {r, left: ts.filter(t=>!t.done).map(t=>({...t, due: t.due || ymd(new Date(r.saved||Date.now()))})).sort((a,b)=>a.due.localeCompare(b.due))}; }).filter(o=>o.left.length);
}
const personalDueCount = () => { const today=ymd(new Date()); return myPersonalOpen().reduce((s,o)=>s+o.left.filter(t=>t.due<=today).length, 0); };
// 개인예약 · 단체예약 구분에 직접 넣은 업무 (나의 할일 개인 업무 입력에서 고른 것, 2026-11-19) — 있을 때만 그 구분 아래에
// 개인예약 · 단체예약 구분에 직접 넣은 업무 (2026-11-19 고침): 오늘 · 지난 것만이 아니라 앞으로 할 것(예: 12/27 마감)도 추후 과업처럼 마감 순으로 — 예전엔 오늘 할 일만 보여 안 보였음
const etcMemoHTML = d => d && String(d.memo||'').trim() ? `<div class="etc-memo">${esc(String(d.memo).trim())}</div>` : '';   // 직접 넣은 업무의 메모: 누르지 않아도 줄 아래에 늘 보임 (2026-11-20)
// 마감 없는 업무 (2026-11-20): 날짜 없이 「마감 없음」에 모아 둠 · 이름을 누르면 고치기(「반복 없음」으로 바꾸면 마감일) · 체크하면 오늘 완료
function etcLaterHTML(list){ if(!list.length) return '';   // 과업 줄 모양은 모두 같음 (js/mytask.js tkHTML, 2026-11-21)
  const today=opsToday();
  return `<div class="etc-cat-h">마감 없음 <small>${list.length}개</small></div>` + tkListHTML(list.slice().sort((a,b)=>String(a.r.saved||'').localeCompare(String(b.r.saved||''))).map(o=>tkFromE(o, today))); }
// 구분(개인예약 · 단체예약)에 직접 넣은 업무: 업무마다 한 줄 — 오늘 할 날이면 오늘(「오늘 마감」과 같은 줄), 아니면 안 한 지난 날 중 가장 이른 날, 없으면 다음 날짜
// (2026-11-20 · 예전엔 반복 업무가 늘 가장 이른 안 한 날이라, 「오늘 마감」에서 오늘 것을 체크해도 이 목록은 어제 것이 남아 안 바뀐 것처럼 보였음)
function etcDaysOf(c){ const today=opsToday();
  return etcMine().filter(o=>etcCatOf(o.d)===c && o.d.repeat!=='later').map(o=>{ const p=opsPending(o.d, today), day = p.includes(today) ? today : (p[0] || etcNext(o.d, today)); return day ? {...o, day} : null; }).filter(Boolean); }
// 시스템 과업(예약 · 통화의 추후 과업)과 직접 넣은 업무를 한 목록에 마감 순으로 (2026-11-20 · 넣은 방식과 상관없이)
//  2026-11-21: 과업마다 같은 모양의 한 줄 (js/mytask.js tkHTML) — 예약 이름은 줄 안의 출처 버튼(누르면 그 예약)
function mergedTasksHTML(recs, c, _recLi, emptyMsg){
  const list=[]; recs.forEach(o=>o.left.forEach(t=>list.push(o.personal ? tkFromP(o.r, t) : tkFromG(o.r, t))));
  etcDaysOf(c).forEach(e=>list.push(tkFromE(e, e.day)));
  return tkListHTML(tkSort(list), emptyMsg) + etcLaterHTML(etcMine().filter(o=>etcCatOf(o.d)===c && o.d.repeat==='later'));
}
// 설정 (× 옆): 구분 순서 ▲▼ · ＋ 구분 추가
// 전체 화면으로 보기 (× 옆, 2026-11-19): 다음 탭에 나의 할일 한 페이지 (group.html?my=1)
// (「전체 보기」 버튼 · 나의 할일 한 페이지는 2026-11-24에 없앰 — 나의 할일은 팝업으로만. group.html?my=1 을 주소로 열면 첫 화면의 팝업으로 넘어감)
let mySetOpen=false;
function paintMySet(){ const m=$('#mySetModal'), b=$('#mySet'); if(!m || !b) return; m.hidden=!mySetOpen; $('#mySetBtn')?.classList.toggle('on', mySetOpen); if(mySetOpen) b.innerHTML = `<div class="set-cols"><div class="set-col">${catManageHTML()}</div><div class="set-col">${alertSetHTML()}</div></div>`; }   /* 2026-11-25: 왼쪽 구분 · 오른쪽 과업 알림 (2열) */   // 설정 = 팝업 (2026-11-19)
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && mySetOpen){ e.stopImmediatePropagation(); mySetOpen=false; paintMySet(); } }, true);
document.addEventListener('mousedown', e=>{ if(e.target.id==='mySetModal'){ mySetOpen=false; paintMySet(); } });
document.addEventListener('click', e=>{ if(e.target.closest?.('#mySetBtn')){ mySetOpen=!mySetOpen; paintMySet(); return; } if(e.target.closest?.('[data-mysetclose]')){ mySetOpen=false; paintMySet(); } });
// 나의 할일의 개인예약 · 단체예약 과업을 그 자리에서 체크해 완료 (2026-11-19) — 전산 내역을 붙여넣거나 칸을 채워야 끝나는 과업은 체크 대신 「열기」 안내
// 메인 1열 개인 업무 입력 아래: 오늘 마감인 과업 모두 (단체예약 · 개인예약 · 기타 업무) — 그 자리에서 체크해 완료 (2026-11-19)
// 오늘 마감이거나 마감이 지난 내 할 일 모두 (단체 과업 · 개인고객 과업 · 직접 넣은 업무) — 나의 할일 「오늘 마감」과 과업 알림(js/group/15-lock-popups.js alertList)이 같이 씀 (2026-11-26)
//  줄마다 _r(그 기록) · _t(그 과업)를 달아 둠 — 알림이 「방금 넣은 과업은 30분 동안 알리지 않기」 · 「열기」에 씀
function myDueList(){
  const today=ymd(new Date()), list=[];   // 단체 · 개인 · 직접 넣은 업무 모두 같은 줄 (js/mytask.js, 2026-11-21)
  // 오늘 마감 + 이미 마감이 지난 것 (2026-11-21): 지난 것 = 빨강, 오늘 = 노랑 · 마감이 이른 것부터
  dueTasks().filter(o=>o.t.due<=today).forEach(({r,t})=>list.push({...tkFromG(r, t), _r:r, _t:t}));
  myPersonalOpen().forEach(o=>o.left.filter(t=>t.due<=today).forEach(t=>list.push({...tkFromP(o.r, t), _r:o.r, _t:t})));
  // 직접 넣은 업무: 업무마다 한 줄 — 오늘 할 날이 있으면 오늘, 없으면 안 한 지난 날 중 가장 이른 날 (반복 업무의 다른 지난 날은 「지난 n일 모두 완료」)
  const byId={}; myEtcOpen().filter(o=>o.day<=today).forEach(o=>{ (byId[o.r.id] ||= []).push(o); });
  Object.values(byId).forEach(a=>{ const days=a.map(o=>o.day).sort(), day=days.includes(today) ? today : days[0]; list.push(tkFromE(a[0], day, {before:days.filter(d=>d!==day), _r:a[0].r})); });
  return list.sort((a,b)=>(a.due||'').localeCompare(b.due||''));
}
function todayDueHTML(){
  const today=ymd(new Date()), list=myDueList();
  const nLate=list.filter(T=>T.due && T.due<today).length;
  return `<h3 class="my-h sub">오늘 마감 <small>${list.length}개${nLate?` · <b class="late">지난 마감 ${nLate}개</b>`:''}</small></h3>` + (list.length ? tkListHTML(list).replace('pc-list tk-list', 'pc-list tk-list today-due') : '<p class="hint">오늘 마감인 과업이 없습니다.</p>');
}
const myCk = (o, t) => !o.personal && SELF_DONE.has(t.id) ? `<label class="my-ck self" title="예약을 열어 처리하면 완료됩니다 (체크하면 그 예약을 엶)"><input type="checkbox" data-myopenck="${esc(t.id)}"></label>` : `<label class="my-ck" title="체크하면 완료"><input type="checkbox" data-myck="${o.personal?'p':'g'}|${esc(o.r.id)}|${esc(t.id)}"></label>`;   // 전산 예약 · 전산 내역 대조 · 담당 입력처럼 예약에서 끝나는 과업도 체크 칸 (체크하면 그 예약을 엶, 2026-11-19)
document.addEventListener('change', e=>{ if(!(e.target.dataset && e.target.dataset.myopenck)) return; e.target.checked=false; const li=e.target.closest('li'), src=li?.querySelector('[data-myopen]') || e.target.closest('[data-myopen]');   // 과업 줄의 출처 버튼(그 예약)
  if(e.target.dataset.myopenck==='erpcheck') erpAfterOpen=src?.dataset.myopen||''; else toast('이 과업은 예약을 열어 처리하면 완료됩니다 (전산 내역 붙여넣기 · 칸 채우기).', 3200); (src || li?.querySelector('.who'))?.click(); });
// 오늘 완료한 과업 (메인 1열 오늘 마감 아래): 체크를 풀면 다시 열림 — 마감이 지났으면 마감 = 오늘 (2026-11-19)
// 편 · 접은 상태는 직접 누를 때만 바뀜 (화면을 새로 그려도 · 새로 고쳐도 그대로, 2026-11-20)
const DONE_TODAY_LS='sy_done_today_open';
const doneTodayOpen = () => { try{ return localStorage.getItem(DONE_TODAY_LS)==='1'; }catch(_){ return false; } };
function doneTodayHTML(){
  const today=ymd(new Date()), me=savedOwner(), isToday = s => { const x=new Date(s||''); return !isNaN(x) && ymd(x)===today; }, rows=[];
  const L=[];   // 같은 과업 줄 모양 (완료 = 줄 그음 · 체크를 풀면 다시 열림, 2026-11-21)
  (cache||[]).filter(r=>isGroupRec(r) && (ownerOf(r)===me || mayStaff(r, me))).forEach(r=>parseHist(r).tasks.filter(t=>t.done && !t.removed && !SELF_DONE.has(t.id) && isToday(t.doneAt) && taskForMe(r, t, me)).forEach(t=>L.push(tkFromG(r, t))));   // 내가 담당자인 준비 과업도 (2026-11-24 · 체크를 풀어 다시 열 수 있게)
  (cache||[]).filter(r=>isPersonalRec(r) && (r.owner||r.takenBy)===me).forEach(r=>{ let ts=[]; try{ ts=(JSON.parse(r.history||'{}').tasks)||[]; }catch(_){} ts.filter(t=>t.done && isToday(t.doneAt)).forEach(t=>L.push(tkFromP(r, t))); });
  etcMine().forEach(o=>Object.entries(o.d.done||{}).filter(([,v])=>isToday(v&&v.at)).forEach(([day])=>L.push({...tkFromE(o, day), done:true, src:catLabel(etcCatOf(o.d))||ETC_NOCAT, srcAttr:''})));
  L.forEach(T=>rows.push(tkHTML(T)));
  return rows.length ? `<details class="etc-more done-today"${doneTodayOpen()?' open':''} data-etcfold="today"><summary>오늘 완료한 과업 ${rows.length}개 (체크를 풀면 다시 열림)</summary><ul class="pc-list tk-list">${rows.join('')}</ul></details>` : '';
}
document.addEventListener('change', async e=>{ const v=e.target.dataset && e.target.dataset.myunck; if(!v || e.target.checked) return; const [kind,id,tid]=v.split('|'), today=todayYmd(), now=new Date().toISOString(); e.target.disabled=true;
  const reopen = t => { t.done=false; t.doneAt=''; delete t.manualDone; delete t.doneBy; if(t.subs) Object.keys(t.subs).forEach(k=>t.subs[k]=false); (t.xsubs||[]).forEach(x=>x.done=false); if((t.due||'')<today){ t.due=today; t.dueSet=1; t.dueSetAt=now; } };
  try{
    if(kind==='g'){
      if(editingId===id){ const t=tasks.find(x=>x.id===tid); if(t){ reopen(t); renderTasks(); renderSide(); await save({auto:true}); } }
      else { const r=cache.find(x=>x.id===id); if(!r) return; const ph=parseHist(r), t=ph.tasks.find(x=>x.id===tid); if(!t) return; reopen(t); ph.h.push({t:now, by:savedOwner()||'', what:`[과업] ${t.title} 완료 취소`});
        const item={...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos, notes:ph.notes}), saved:now}; await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item; }
    } else { const r=cache.find(x=>x.id===id); if(!r) return; let h={}; try{ h=JSON.parse(r.history||'{}')||{}; }catch(_){} const t=(h.tasks||[]).find(x=>x.id===tid); if(!t) return; reopen(t);
      const item={...r, history:JSON.stringify(h)}; await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item; }
    toast('다시 열었습니다 (마감 = 오늘).'); paintMyCount(); renderMy();
  }catch(err){ e.target.disabled=false; e.target.checked=true; toast('되돌리지 못했습니다: '+(err.code||err.message)); } });
document.addEventListener('change', async e=>{ const v=e.target.dataset && e.target.dataset.myck; if(!v || !e.target.checked) return; const [kind,id,tid]=v.split('|'); e.target.disabled=true;
  try{
    if(kind==='g') await doneTask(id, tid);
    else await donePersonalTask(id, tid);   // js/group/15-lock-popups.js (알림의 체크 칸과 같이 씀 · 2026-11-26)
    toast('과업을 완료로 표시했습니다.'); paintMyCount(); renderMy();
  }catch(err){ e.target.disabled=false; e.target.checked=false; toast('완료로 표시하지 못했습니다: '+(err.code||err.message)); } });
function renderMy(){ paintMySet();
  const me=savedOwner(), today=ymd(new Date()), past=$('#myPast').checked;
  $('#myTitle').textContent = me ? `나의 할일 · ${me}` : '나의 할일';
  if(!me){ $('#mySum').textContent=''; $('#myBody').innerHTML='<p class="hint">맨 위 초록 헤더의 <b>영업 담당</b>에 이름을 넣으면, 그 이름이 영업 담당인 예약을 모아 보여 줍니다.</p>'; return; }
  if(gWaiting()){ $('#mySum').textContent=''; $('#myBody').innerHTML=`<div class="my-cols three">${[0,1,2].map(i=>`<div class="my-col">${SY.skel('list', 4, {label: i ? ' ' : '나의 할일을 불러오는 중'})}</div>`).join('')}</div>`; return; }   // 사본이 없고 처음 받는 중 (2026-11-27 · js/group/07-store.js gWaiting)
  const mine = myRecords().map(r=>({r, x:xOf(r), tasks:openTasksOf(r).filter(t=>taskForMe(r, t, me))}));   // 다른 담당자의 준비 과업은 빼고 (2026-11-24)
  const ahead = mine.filter(o=>!o.r.date || o.r.date>=today);
  const tbdAll = ahead.filter(o=>o.x.tbd);
  const open = [...mine, ...myStaffRecs(me)].filter(o=>o.tasks.length && taskRecActive(o.r)).map(o=>({...o, left:o.tasks})).sort((a,b)=>a.left[0].due.localeCompare(b.left[0].due));   // + 내가 담당자인 준비 과업
  const booked = o => isBooked(stageOfRec(o.r));   // 방문 예정은 가예약 · 예약확정만 (예약상담 · 예약취소는 뺌)
  const shown = (past ? mine : ahead).filter(booked).slice().sort((a,b)=>(a.r.date||'9999').localeCompare(b.r.date||'9999'));
  $('#mySum').textContent = `담당 단체 예약 ${mine.length}건 · 방문 예정 ${ahead.length}건 · 미정 ${tbdAll.length}건 · 남은 과업 단체 ${open.reduce((s,o)=>s+o.left.length,0)}개 · 개인 ${myPersonalOpen().reduce((s,o)=>s+o.left.length,0)}개`;
  const org = r => esc(r.org || r.contact || '(업체 미정)');
  const dueTxt = d => { const n=daysFrom(today,d); return n<0 ? `<b class="late">${-n}일 지남</b>` : n===0 ? '<b class="late">오늘</b>' : `${n}일 남음`; };
  // 단체 탭 2열: ① 단체 추후 과업 ② 방문 예정 (2026-11-24 순서 바꿈)
  const none = t => `<p class="hint">${t}</p>`;
  // 칸의 틀 (2026-11-27 · 모든 탭이 같은 틀): 위(제목 — 「<!--fx-->」 표시가 있으면 거기까지)는 고정, 그 아래 목록만 스크롤 · 스크롤 막대는 칸 안쪽 (css/group.css .my-col.fx)
  const splitHead = h => { let i=h.indexOf('<!--fx-->'); if(i>=0) return [h.slice(0,i), h.slice(i+9)]; i=h.indexOf('</h3>'); return i<0 ? ['', h] : [h.slice(0,i+5), h.slice(i+5)]; };
  const fxCol = h => { const [a,b]=splitHead(h); return `<div class="my-col fx"><div class="my-fix">${a}</div><div class="my-scroll">${b}</div></div>`; };
  let c1 =`<h3 class="my-h">${past?'전체 담당 예약':'방문 예정'} <small>${shown.length}건 · 방문일 순</small></h3>` + (shown.length
    ? `<ul class="pc-list">${shown.map(o=>{ const st=stageOfRec(o.r), left=o.tasks.filter(t=>!t.done).length, dq=docTag(o.r,'quote'), ds=docTag(o.r,'stmt');
        return `<li class="r" data-myopen="${esc(o.r.id)}"><span class="who"><b>${esc(dateLabel(o.r.date)||'방문일 미정')}</b> <span class="tag st-${st}">${st}</span> <b>${org(o.r)}</b>${o.r.people?` · ${esc(o.r.people)}명`:''}<br>`
          + `<small class="hint" style="margin:0">${contactCell(o.r)||'담당자 미입력'}</small>`
          + `${o.x.tbd?`<br><span class="tag tbd-tag">미정: ${esc(o.x.tbd)}</span>${o.x.tbdDate?` <small class="hint" style="margin:0">${esc(mdLabel(o.x.tbdDate))}까지</small>`:''}`:''}`
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
        + o.left.map(t=>`<span class="my-task${t.due<today?' late':t.due===today?' today':''}">${myCk(o,t)} ${esc(t.title)} <small>마감 ${esc(mdLabel(t.due))} (${dueTxt(t.due)})</small></span>`).join('<br>')
        + `</span></li>`).join('')}</ul>`
    : none('해결 안 된 과업이 없습니다.'));
  // 탭 (2026-11-19): 메인 + 구분마다(개인예약 · 단체예약 · 내가 만든 구분 · 구분 없음, 순서는 메인 1열에서 바꿈)
  const order=catOrder(); if(myTab!=='main' && !order.map(catTab).includes(myTab)) myTab='main';
  $('#myTabs').innerHTML = `<button type="button" data-mt="main">메인</button>` + order.map(c=>`<button type="button" data-mt="${esc(catTab(c))}">${esc(catLabel(c))}</button>`).join('');
  document.querySelectorAll('#myTabs [data-mt]').forEach(b=>b.classList.toggle('on', b.dataset.mt===myTab));
  // 휴대폰(700px 아래)에서는 탭 대신 드롭다운으로 구분을 고름 (2026-11-26 · css/group.css 맨 아래 — 구분이 많아도 한 줄)
  { const sel=$('#myTabSel'); if(sel){ sel.innerHTML = `<option value="main">오늘 마감</option>`   /* 휴대폰에서는 「메인」 대신 「오늘 마감」 — 오늘 마감 목록만 보임 (개인 업무 입력 · 구분 칸은 css/group.css 맨 아래에서 숨김 · 2026-11-26) */ + order.map(c=>`<option value="${esc(catTab(c))}">${esc(catLabel(c))}</option>`).join(''); sel.value=myTab; } }
  $('#myPast').closest('label').hidden = myTab!=='group';
  const nG = open.reduce((s,o)=>s+o.left.length,0), persAll = myPersonalOpen(), nP = persAll.reduce((s,o)=>s+o.left.length,0);
  const recLi = (o, ts) => `<li class="r my-tg" ${o.personal?`data-popen="${esc(o.r.id)}"`:`data-myopen="${esc(o.r.id)}"`}><span class="who">`
      + (o.personal ? `<span class="tag">개인</span> <b>${esc(o.r.contact||'(이름 없음)')}</b>${o.r.phone?` · ${esc(o.r.phone)}`:''}${o.r.date?` · ${esc(dateLabel(String(o.r.date).slice(0,10)))}`:''}<br>`
                    : `<span class="tag st-${stageOfRec(o.r)}">단체</span> <b>${org(o.r)}</b> · 방문 ${esc(dateLabel(o.r.date)||'미정')}<br>`)
      + ts.map(t=>`<span class="my-task${t.due<today?' late':t.due===today?' today':''}">${myCk(o,t)} ${esc(t.title)} <small>마감 ${esc(mdLabel(t.due))} (${dueTxt(t.due)})</small></span>`).join('<br>')
      + `</span></li>`;
  const taskList = (list, emptyMsg) => list.length ? `<ul class="pc-list">${list.map(o=>recLi(o, o.left)).join('')}</ul>` : none(emptyMsg);
  // 구분 목록: 시스템 과업 + 직접 넣은 업무를 마감 순으로 한 목록 (2026-11-20)
  const catTasks = (list, c, emptyMsg) => mergedTasksHTML(list, c, recLi, emptyMsg);
  const lateOf = list => list.reduce((s,o)=>s+o.left.filter(t=>t.due<today).length,0);
  // 추후 과업 (단체): 「다음주 예약 점검」(매주 목요일 · weekTask) 을 목록 맨 위 과업 한 줄로 (2026-11-19)
  // 제목의 개수 = 그 아래 목록의 줄 수 (2026-11-27): 그 구분에 직접 넣은 업무도 셈 (예전엔 줄은 보이는데 개수에서는 빠졌음 · 「마감 없음」은 따로 제목이 있어 안 셈)
  const nE = c => etcDaysOf(c).length, lateE = c => etcDaysOf(c).filter(e=>e.day<today).length;
  const nPc = nP + nE(CAT_P), latePc = lateOf(persAll) + lateE(CAT_P);
  const groupTasksHTML = () => { const wk=null /* 다음주 예약 점검은 예약마다 과업(wkcheck)으로 (2026-11-20 · 한 줄 모음 weekTask 는 안 씀) */, cnt=nG+nE(CAT_G)+(wk?1:0), lt=lateOf(open)+lateE(CAT_G)+(wk&&wk.late?1:0);
    const head = `<h3 class="my-h">추후 과업 (단체) <small>${cnt}개${lt?` · <b class="late">기한 지남 ${lt}개</b>`:''}</small></h3>`;
    if(!wk) return head + catTasks(open, CAT_G, '해결 안 된 단체 과업이 없습니다.');
    return head + (open.length ? taskList(open, '').replace('<ul class="pc-list">', '<ul class="pc-list">'+wk.html) : `<ul class="pc-list">${wk.html}</ul>`); };
  if(myTab==='personal'){
    // 개인: ① 추후 과업 ② 내가 받은 개인고객 통화 (최근)
    const calls = (cache||[]).filter(r=>isPersonalRec(r) && (r.owner||r.takenBy)===me).sort((a,b)=>String(b.saved).localeCompare(String(a.saved))).slice(0,50);
    $('#mySum').textContent = `개인고객 통화 ${calls.length}건 · 남은 과업 ${nP}개`;
    const p1 = `<h3 class="my-h">추후 과업 (개인) <small>${nPc}개${latePc?` · <b class="late">기한 지남 ${latePc}개</b>`:''}</small></h3>` + catTasks(persAll.map(o=>({...o, personal:true})), CAT_P, '해결 안 된 개인고객 과업이 없습니다.');
    const p2 = `<h3 class="my-h">내가 받은 개인고객 통화 <small>최근 ${calls.length}건</small></h3>` + (calls.length ? `<ul class="pc-list">${calls.map(r=>{ let ts=[]; try{ ts=JSON.parse(r.history||'{}').tasks||[]; }catch(_){} const left=ts.filter(t=>!t.done).length;
        return `<li class="r" data-popen="${esc(r.id)}"><span class="who"><b>${esc(r.contact||'(이름 없음)')}</b>${r.phone?` · ${esc(r.phone)}`:''}${r.date?` · ${esc(dateLabel(String(r.date).slice(0,10)))}`:''}<br><small class="hint" style="margin:0">${esc(fmt(r.saved))}${r.note?` · ${esc(String(r.note).split(/\n/)[0].slice(0,50))}`:''}${left?` · 남은 과업 ${left}개`:''}</small></span></li>`; }).join('')}</ul>` : none('내가 받은 개인고객 통화가 없습니다.'));
    $('#myBody').innerHTML = `<div class="my-cols two">${fxCol(p1)}${fxCol(p2)}</div>`; return;
  }
  if(/^cat:/.test(myTab)){ const c=myTab.slice(4), n=myEtcOpen().filter(o=>etcCatOf(o.d)===c).length; $('#mySum').textContent = `${c||ETC_NOCAT} 남은 것 ${n}개`; $('#myBody').innerHTML = `<div class="my-cols one">${fxCol(etcCatAllHTML(c))}</div>`; return; }   // 내가 만든 구분 · 구분 없음 (기타 개인 업무)
  if(myTab==='group'){
    $('#mySum').textContent = `담당 단체 예약 ${mine.length}건 · 방문 예정(가예약 · 예약확정) ${ahead.filter(booked).length}건 · 미정 ${tbdAll.length}건 · 남은 과업 ${nG}개`;
    const g2 = groupTasksHTML();
    $('#myBody').innerHTML = `<div class="my-cols two">${fxCol(g2)}${fxCol(c1)}</div>`; return;
  }
  // 메인 (2026-11-19 · 예전 「전체」): ① 개인 업무 입력 + 구분 순서 · 추가 ② ③ 고른 구분의 할 일 (고른 것은 이 브라우저에 기억)
  const pTasks = () => `<h3 class="my-h">개인예약 <small>${nPc}개${latePc?` · <b class="late">기한 지남 ${latePc}개</b>`:''}</small></h3>` + catTasks(persAll.map(o=>({...o, personal:true})), CAT_P, '해결 안 된 개인고객 과업이 없습니다.');
  const secOf = c => c===CAT_P ? pTasks() : c===CAT_G ? groupTasksHTML().replace('추후 과업 (단체)', '단체예약') : etcSection(false, c===CAT_N ? '' : c);
  const pick = n => { let v=''; try{ v=localStorage.getItem('sy_my_col'+n)||''; }catch(_){} if(!order.includes(v)) v = n===2 ? CAT_P : CAT_G; return v; };
  const colSel = (n, v) => `<label class="my-colpick">구분 <select data-mycol="${n}">${order.map(c=>`<option value="${esc(c)}"${c===v?' selected':''}>${esc(catLabel(c))}</option>`).join('')}</select></label>`;
  const v2=pick(2), v3=pick(3);
  $('#mySum').textContent = '';   // 메인: 「개인예약 n · 단체예약 n · 기타 개인 업무 n개」 글은 없앰 (2026-11-24)
  // 2026-11-24: 칸마다 위(입력 · 오늘 마감 제목 / 구분 고르기 · 개인예약 · 단체예약 제목)는 고정, 그 아래 목록만 스크롤 (다시 그려도 스크롤 자리 그대로)
  const [tdH, tdL]=splitHead(todayDueHTML()), [h2, l2]=splitHead(secOf(v2)), [h3, l3]=splitHead(secOf(v3));
  const keep=[...document.querySelectorAll('#myBody .my-scroll')].map(x=>x.scrollTop);
  $('#myBody').innerHTML = `<div class="my-cols three"><div class="my-col fx"><div class="my-fix"><h3 class="my-h">개인 업무 입력</h3>${etcAddHTML()}${myQuoteReqHTML()}${tdH}</div><div class="my-scroll">${tdL}${doneTodayHTML()}</div></div>`
    + `<div class="my-col fx"><div class="my-fix">${colSel(2, v2)}${h2}</div><div class="my-scroll">${l2}</div></div><div class="my-col fx"><div class="my-fix">${colSel(3, v3)}${h3}</div><div class="my-scroll">${l3}</div></div></div>`;
  document.querySelectorAll('#myBody .my-scroll').forEach((x,i)=>{ if(keep[i]) x.scrollTop=keep[i]; });
}
document.addEventListener('change', e=>{ const n=e.target.dataset && e.target.dataset.mycol; if(!n) return; try{ localStorage.setItem('sy_my_col'+n, e.target.value); }catch(_){} renderMy(); });
// 「오늘 마감」 줄 수와 같은 숫자 (2026-11-27): 단체 과업 + 개인고객 과업 + 직접 넣은 업무(업무마다 한 번 — 반복 업무의 안 한 지난 날은 따로 세지 않음 · myDueList 와 같은 기준)
//  예전엔 헤더 숫자가 직접 넣은 업무를 빼고 세어, 나의 할일 「오늘 마감 n개」와 달랐음
//  2026-11-27 다시 고침 — 「오늘 마감」 숫자는 어디서든 이 목록(myDueList) 하나의 길이다. 따로 세는 식을 두지 않는다:
//   · 단체 화면 헤더 「과업 n」 · 나의 할일 「오늘 마감 n개」 · 과업 알림 = 이 파일
//   · 첫 화면 「오늘 마감」 칸(js/portal.js todayBox) · 개인고객 화면 헤더 「과업 n」(js/personal.js paintMyCount) = 보이지 않는 과업 계산 창(group.html?…&engine=1)의 이 myDueList 를 그대로 읽음
//  예전엔 그 두 화면이 저장된 과업을 저마다의 규칙으로 세어, 삭제한 과업 · 다른 담당자의 준비 과업 · 상담 단계라 안 보이는 과업까지 세었음 (2개인데 3개)
function myDueCount(){ if(!savedOwner()) return 0;
  try{ return myDueList().length; }catch(_){ return dueTasks().length + personalDueCount(); } }   // 화면을 막 여는 중(업무 목록 준비 전)이면 단체 · 개인고객 과업만
const MY_ENGINE = /[?&]engine=/.test(location.search) && window.parent!==window;   // 다른 화면(첫 화면 · 개인고객)이 숫자를 읽으려고 띄운 보이지 않는 과업 계산 창
let myDueSig=null;
function paintMyCount(){ const n=myDueCount();   // 마감이 오늘이거나 지난 과업 수 = 나의 할일 「오늘 마감」 줄 수
  const mm=myNewMemos().length, nq=savedOwner() ? myQuoteReqs().length : 0, t=[n&&`과업 ${n}`, nq&&`견적 요청 ${nq}`, mm&&`메모 ${mm}`].filter(Boolean).join(' · ');   // 수정 표시는 없앰 · 내 예약에 확인 안 한 메모 수
  $('#myCount').hidden=!t; $('#myCount').textContent=t;
  // 과업 계산 창이면: 목록이 바뀔 때마다 띄운 화면에 알림 → 그 화면이 숫자 · 「오늘 마감」 칸을 다시 그림 (같은 내용이면 안 보냄)
  if(MY_ENGINE && window.__tasksReady){ try{ const sig=myDueList().map(T=>[T.kind, T.rid, T.tid, T.day, T.due, T.title, (T.before||[]).length].join('|')).join('\n');
    if(sig!==myDueSig){ myDueSig=sig; window.parent.postMessage({type:'sy-my', ev:'due', n}, location.origin); } }catch(_){} } }
function openMy(fromGroup){ myTab='main'; $('#myModal').hidden=false; renderMy(); loadMyQuoteReq();   // 나의 할일 버튼은 어디서든 메인부터 (2026-11-19)
  if(pending.length) flush(); else pull();
  const p=$('#myModal > section'); if(p){ p.tabIndex=-1; try{ p.focus({preventScroll:true}); }catch(_){ p.focus(); } } }   // 초점은 창 상자에 (2026-11-27 · 예전엔 × 단추에 줘서 열자마자 × 에 까만 초점 테두리가 떴음 — css/group.css #myModal > section:focus)
// group.html?open=예약ID → 그 예약을 엶 (팝업 나의 할일에서 단체 줄을 누른 경우 · 목록을 받은 뒤)
let openGId = new URLSearchParams(location.search).get('open'), openGErp = new URLSearchParams(location.search).get('erp')==='1';
// 나의 할일에서 「전산 내역 대조」를 체크하면: 그 예약을 열고 전산 내역 붙여넣는 칸까지 (2026-11-20)
let erpAfterOpen='';
function erpPasteAfter(id){ if(erpAfterOpen!==id) return; erpAfterOpen=''; setTimeout(()=>{ if(editingId===id) $('#erpPasteBtn').click(); }, 400); }
// &hl=people,tin… : 다음날 고객 응대 준비에서 바꾼 칸 → 열고 나서 노랗게 표시 · 그 칸으로 스크롤 (2026-11-19)
const openHl = (new URLSearchParams(location.search).get('hl')||'').split(',').filter(Boolean);
function showHl(){ if(!openHl.length) return; let first=null;
  openHl.forEach(k=>{ const el=document.getElementById('f_'+k) || document.querySelector(`[data-k="${k}"]`); if(!el) return; const box=el.closest('.fld, .field, .f, label, td, .vrow') || el; box.classList.add('hl-prep'); el.classList.add('hl-prep-in'); first ||= box; });
  if(first) first.scrollIntoView({block:'center', behavior:'smooth'});
  const names={org:'업체', people:'관람 인원', tin:'입장시각', vehicle:'차량', phone:'연락처', gate:'입장문'};
  if(typeof toast==='function') toast(`다음날 고객 응대 준비에서 바꾼 칸: ${openHl.map(k=>names[k]||k).join(' · ')}`);
  setTimeout(()=>document.querySelectorAll('.hl-prep, .hl-prep-in').forEach(x=>x.classList.remove('hl-prep','hl-prep-in')), 12000); }
async function tryOpenG(){ if(!openGId) return; const list = await store.list(); const r=(list||[]).find(x=>x.id===openGId); if(!r) return; openGId=null; history.replaceState(null,'','group.html'); openRecordG(r); if(openGErp){ openGErp=false; erpAfterOpen=r.id; erpPasteAfter(r.id); } setTimeout(showHl, 900); }
setTimeout(tryOpenG, 400);
const MY_EMBED = MY_ONLY && window.parent!==window;   // 다른 화면이 팝업으로 띄운 나의 할일
function closeMy(){ if(MY_EMBED){ window.parent.postMessage({type:'sy-my', ev:'close'}, '*'); return; } if(MY_ONLY && document.documentElement.classList.contains('my-only')){ location.href='./'; return; } $('#myModal').hidden=true; }   // 팝업 = 바깥 화면이 닫음, 단독 페이지 = 메뉴로
// 단체 화면의 「나의 할일」 = 이 화면 위 팝업 (메뉴 8번은 한 페이지)
$('#myOpenBtn').onclick=()=>openMy(true);
// 나의 할일 「↻ 새로고침」 (2026-11-21): 보낼 저장이 있으면 먼저 보내고, 공유 기록을 새로(이미 가고 있는 요청과 따로) 받아 다시 그림 (평소엔 30초마다 · 창으로 돌아오면 저절로)
$('#myReloadBtn').onclick=async()=>{ const b=$('#myReloadBtn'); if(b.disabled) return; b.disabled=true; b.textContent='불러오는 중…';
  try{ if(pending.length) await flush(); else await pull(true);    renderMy(); paintMyCount(); toast(syncState==='ok' ? `최신 내용으로 다시 불러왔습니다 (${new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}).` : '불러오지 못했습니다. 잠시 뒤 다시 눌러 주세요.'); }
  catch(e){ handleErr(e); toast('불러오지 못했습니다: '+(e.code||e.message||e)); }
  finally{ b.disabled=false; b.textContent='↻ 새로고침'; } };
if(location.hash==='#my' && !MY_ONLY) setTimeout(openMy, 300);   // 예전 주소 group.html#my
if(MY_ONLY){ document.title='나의 할일 · 사유원 운영 보조 시스템'; $('#crumb').textContent='나의 할일'; setTimeout(openMy, 50); }
document.addEventListener('click', e=>{ const b=e.target.closest('#myTabs [data-mt]'); if(!b) return; myTab=b.dataset.mt; try{ localStorage.setItem('sayuwon_my_tab', myTab); }catch(_){} renderMy(); });
document.addEventListener('change', e=>{ if(e.target.id!=='myTabSel') return; myTab=e.target.value; try{ localStorage.setItem('sayuwon_my_tab', myTab); }catch(_){} renderMy(); });   // 휴대폰의 구분 드롭다운 (2026-11-26)
$('#myCloseBtn').onclick=closeMy;
$('#myPast').onchange=renderMy;
$('#myModal').addEventListener('mousedown', e=>{ if(e.target.id==='myModal' && !MY_ONLY) closeMy(); });
$('#myBody').addEventListener('click', e=>{ if(e.target.closest('.my-ck, .etc-subadd, .etc-subck, [data-etcdone], .tk-ctl:not(.tk-src), .tk-sub, .tk-in, .tk-when')) return; const pe=e.target.closest('[data-popen]');
  if(MY_EMBED){ const ge=e.target.closest('[data-myopen]'); if(pe||ge) window.parent.postMessage({type:'sy-my', ev:'go', url: pe ? 'personal.html?open='+encodeURIComponent(pe.dataset.popen) : 'group.html?open='+encodeURIComponent(ge.dataset.myopen)+(erpAfterOpen===ge.dataset.myopen?'&erp=1':'')}, '*'); erpAfterOpen=''; return; }   // 팝업 안: 바깥 화면이 그 화면으로 이동
  if(pe){ guardLeave(()=>{ location.href='personal.html?open='+encodeURIComponent(pe.dataset.popen); }); return; } const el=e.target.closest('[data-myopen]'); if(!el) return; const r=cache.find(x=>x.id===el.dataset.myopen); if(!r) return;
  if(MY_ONLY){ document.documentElement.classList.remove('my-only'); history.replaceState(null,'','group.html'); document.title='단체고객 응대 · 사유원 운영 보조 시스템'; $('#crumb').textContent='단체고객 응대'; $('#myModal').hidden=true; openRecordG(r); erpPasteAfter(r.id); return; }   // 단체 줄 → 단체 화면으로 바뀌며 그 예약을 엶
  closeMy(); openRecordG(r); erpPasteAfter(r.id); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#myModal').hidden){ e.preventDefault(); closeMy(); } });

// ▣ js/group/15-lock-popups.js — 남이 담당인 예약(잠금 · 통화 메모만 고침) · 두 PC 동시 수정 막기(고치는 중) · 마감 알림 · 미정 기한 알림 · 보던 화면 기억
// ===================== 남이 담당인 예약: 잠금 + 담당자에게 메모 =====================
// 영업 담당이 다른 사람인 예약을 열면 아무것도 고칠 수 없음(저장 · 과업 · 수정 · 삭제 모두). 바꿀 내용은 위쪽 메모로 → 담당자 화면에 '메모를 확인하세요' 팝업
const mergeMemos = (a, b) => { const m=new Map(); [...(b||[]), ...(a||[])].forEach(x=>{ if(!x||!x.id) return; const o=m.get(x.id); m.set(x.id, o ? {...x, ...o, seen: !!(o.seen||x.seen), seenAt:o.seenAt||x.seenAt||''} : x); }); return [...m.values()].sort((x,y)=>String(x.t).localeCompare(String(y.t))); };
function notMineMsg(r){ const o=ownerOf(r), me=savedOwner(); if(o && me && o!==me){ toast(`${o}님 담당 예약이라 고치거나 지울 수 없습니다. 예약을 열어 메모로 남겨 주세요.`); return true; } return false; }
const memoLi = (m, own) => `<li class="${own && !m.seen ? 'new' : ''}"><small>${esc(fmt(m.t))} · <b>${esc(m.by||'')}</b>${own ? (m.seen ? ' · 확인함' : ' · <b style="color:var(--red)">새 메모</b>') : ''}</small><br>${esc(String(m.text||'').replace(/^통화 메모를 남겼습니다 —\n/,'')).replace(/\n/g,'<br>')}</li>`;   // 「통화 메모를 남겼습니다 —」 멘트는 뺌 (2026-11-27 운영팀 · 새로 남기는 메모에는 안 붙이고, 앞서 저장된 것은 보일 때만 뗌)
// ===================== 같은 예약을 두 PC(창)에서 동시에 고치지 않기 =====================
// 예약을 열면 서버에 '고치는 중'(lock)을 잡고 1분마다 연장. 이미 다른 창이 잡고 있으면 읽기 전용(editLockBy)으로 열고 30초마다 다시 확인
// → 풀리면 최신 기록을 받아 다시 열어 고칠 수 있게. 다른 예약을 열거나 새 통화 · 화면을 닫으면 풀어 줌. 서버가 예전 버전이면 아무것도 막지 않음
var editLockBy='', editHeld='', editRetryT=null;
const EDIT_SID = (()=>{ try{ let s=sessionStorage.getItem('sy_edit_sid'); if(!s){ s=Date.now().toString(36)+Math.random().toString(36).slice(2,8); sessionStorage.setItem('sy_edit_sid', s); } return s; }catch(_){ return Math.random().toString(36).slice(2); } })();   // 창마다 (새로고침해도 그대로)
async function acquireEdit(id){
  if(!id || !getKey()) return;
  try{
    const j=await SY.call({action:'lock', id, sid:EDIT_SID, by:savedOwner()||''});
    if(editingId!==id) return;   // 그사이 다른 예약을 열었으면 무시
    if(j.locked){ const was=editLockBy; editLockBy=j.by||'다른 직원'; editHeld=''; if(!was) paintLock(); clearTimeout(editRetryT); editRetryT=setTimeout(()=>acquireEdit(id), 30000); return; }
    editHeld=id; clearTimeout(editRetryT);
    if(editLockBy){ editLockBy=''; await pull(); const r=cache.find(x=>x.id===id); if(r){ editHeld=''; openRecord(r); toast('이제 이 예약을 고칠 수 있습니다. 최신 내용으로 다시 불러왔습니다.'); } else paintLock(); }
  }catch(e){ /* 예전 서버 (bad_action) · 연결 문제: 막지 않음 */ }
}
function releaseEdit(beacon){
  clearTimeout(editRetryT); const id=editHeld; editHeld=''; editLockBy='';
  if(!id || !getKey()) return;
  const body={action:'lock', release:true, id, sid:EDIT_SID};
  if(beacon){ SY.beacon(body); return; }
  setTimeout(()=>{ if(editingId===id){ if(!editLockBy) editHeld=id; return; }   // 같은 예약을 바로 다시 열었으면 풀지 않음
    SY.call(body).catch(()=>{}); }, 0);
}
setInterval(()=>{ if(editHeld && editHeld===editingId) acquireEdit(editHeld); }, 60000);   // 고치는 중 표시 연장
window.addEventListener('pagehide', ()=>releaseEdit(true));
function paintLock(){
  document.body.classList.toggle('locked', !!(lockOwner || editLockBy));
  { const h=$('#memoLockHint'), mb=$('#memoBox');   // 영업 담당이 아니면 통화 메모 위에 흐린 안내 · 빈 칸 안내 글 (2026-11-24)
    if(h){ h.hidden=!lockOwner; h.textContent = lockOwner ? `수정 사안이 있다면 통화 메모에 남겨 두세요. 저장하면 ${lockOwner}님께 「통화 메모 확인」 과업이 갑니다.` : ''; }
    if(mb) mb.placeholder = lockOwner ? '수정 사안이 있다면 통화 메모에 남겨 두세요.' : '메모 입력 (Enter 저장 · Shift+Enter 줄바꿈)';
    if(typeof renderNotes==='function') renderNotes(); }   // 고치기 · 지우기 버튼은 담당 · 「고치는 중」에 따라 달라짐
  const box=$('#ownerMemo'); if(!box) return;
  const me=savedOwner(), list=[...memos].reverse();
  if(editLockBy){   // 다른 PC(창)에서 이 예약을 고치는 중: 읽기 전용, 풀리면 최신 내용으로 다시 불러옴
    box.className='owner-memo lock-ok'; box.hidden=false;
    box.innerHTML = `<div class="om-h">🔒 ${esc(editLockBy)}님이 다른 PC(창)에서 이 예약을 고치는 중입니다</div><div class="hint" style="margin:0">같은 예약을 두 곳에서 고치지 않도록 지금은 볼 수만 있습니다. 그쪽에서 다른 예약을 열거나 화면을 닫으면 30초 안에 자동으로 최신 내용을 불러와 고칠 수 있게 됩니다.</div>`;
    return;
  }
  if(lockOwner){   // 남이 담당인 예약 (2026-11-24): 위쪽 안내 · 「메모 남기기」 상자는 없앰 — 전할 말은 통화 메모에 적으면 영업 담당에게 「메모를 확인하세요」 알림 (고치려 하면 팝업으로 안내)
    box.hidden=true; box.innerHTML='';
  } else { box.hidden=true; box.innerHTML=''; }   // 내 예약: 위쪽 「다른 사람이 남긴 메모」 상자는 없앰 (2026-11-24) — 메모는 추후 과업 「통화 메모 확인」 안에 모두 나옴
}
async function saveMemos(id, fn){   // 공유 기록의 최신 예약에 메모를 바꿔 저장 (다른 칸은 건드리지 않음)
  const r=cache.find(x=>x.id===id); if(!r) return null;
  const ph=parseHist(r); ph.memos=fn(ph.memos||[]);
  const item={...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos, notes:ph.notes})};
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
// 잠긴 예약 (2026-11-24 바꿈): 예약 내용 · 예약 현황 · 수정 기록 · 추후 과업은 모두 읽을 수 있음 (흐리게 하지 않음 · 펼치기 · 스크롤 · 복사 됨)
//  고치는 칸 · 버튼(입력 · 고르기 · 체크 · 버튼)을 누르면 막고 「영업 담당자가 아니어서 편집할 수 없습니다」 팝업
//  남이 담당인 예약(lockOwner)에서도 고칠 수 있는 것: ① 통화 메모 (고치면 영업 담당에게 「메모를 확인하세요」 알림) ② 내가 담당자인 추후 과업(단체 준비 등 t.who === 나)
//  다른 PC(창)에서 고치는 중(editLockBy)이면 통화 메모 · 과업도 막음 (같은 예약을 두 곳에서 고치지 않게)
const LOCK_EDIT_SEL = 'input, select, textarea, button, label, [contenteditable="true"], [data-idel], [data-tmv], .tdrag';
const myLockTask = el => { const li=el.closest && el.closest('#taskList .task'); if(!li) return false; const t=tasks.find(x=>x.id===li.dataset.id); return !!(t && t.who && t.who===savedOwner()); };
const lockAllowed = el => !!el.closest('.lock-ok, [data-mbdb], [data-book], #copyTextBtn, #copyReadBtn, #noteRegenBtn, #noteModal, summary, [data-texp], [data-tcopy], #lockPop, #memoSave')
  || (!editLockBy && (el.closest('#memoBox, #noteList') || myLockTask(el)));   // #noteList = 통화 메모 기록 (내가 적은 기록에만 고치기 · 지우기 버튼이 있음 · 2026-11-27)
const lockBlocked = t => !!(lockOwner || editLockBy) && t && t.closest && !!t.closest('.layout') && !!t.closest(LOCK_EDIT_SEL) && !lockAllowed(t);
let lockNudgeT=0;
function lockPopup(){ if(Date.now()-lockNudgeT<800) return; lockNudgeT=Date.now();
  let m=document.getElementById('lockPop');
  if(!m){ m=document.createElement('div'); m.id='lockPop'; m.className='modal'; m.hidden=true;
    m.innerHTML='<section class="panel ask-box" role="dialog" aria-modal="true" aria-labelledby="lockPopT"><h2 id="lockPopT">🔒 편집할 수 없습니다</h2><p class="ask-msg" id="lockPopMsg"></p><div class="ask-btns"><button type="button" class="btn primary" id="lockPopOk">확인</button></div></section>';
    document.body.appendChild(m); m.addEventListener('mousedown', e=>{ if(e.target===m) m.hidden=true; }); m.querySelector('#lockPopOk').onclick=()=>{ m.hidden=true; }; }
  m.querySelector('#lockPopMsg').innerHTML = editLockBy
    ? `<b>${esc(editLockBy)}</b>님이 다른 PC(창)에서 이 예약을 고치는 중이라 지금은 볼 수만 있습니다. 그쪽에서 닫으면 30초 안에 고칠 수 있게 됩니다.`
    : `<b>영업 담당자가 아니어서 편집할 수 없습니다.</b><br>이 예약은 <b>${esc(lockOwner)}</b>님 담당입니다. 예약 내용 · 예약 현황 · 수정 기록은 볼 수 있습니다.<br><b>통화 메모</b>는 고칠 수 있고(고치면 ${esc(lockOwner)}님께 「통화 메모 확인」 추후 과업), <b>내가 담당자인 추후 과업</b>은 체크할 수 있습니다.`;
  m.hidden=false; setTimeout(()=>m.querySelector('#lockPopOk').focus(), 0); }
['mousedown','click','dblclick','beforeinput','paste','drop','dragstart','change','input','focusin'].forEach(ev=>document.addEventListener(ev, e=>{
  if(!lockBlocked(e.target)) return; e.preventDefault(); e.stopImmediatePropagation();
  if(ev==='mousedown' || ev==='focusin'){ if(ev==='focusin' && e.target.blur) e.target.blur(); lockPopup(); }
}, true));
document.addEventListener('keydown', e=>{ if(!lockBlocked(e.target)) return; if(['Tab','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) || ((e.ctrlKey||e.metaKey) && /^[ca]$/i.test(e.key))) return; e.preventDefault(); e.stopImmediatePropagation(); lockPopup(); }, true);
// 남이 담당인 예약에서 고친 것 저장 (2026-11-24): 예약 전체가 아니라 통화 메모 · 내가 담당자인 과업만 최신 기록 위에 덮어씀 (save 가 lockOwner 일 때 부름)
let lockSaving=false;
async function saveLockedParts(){
  if(!lockOwner || editLockBy || lockSaving || !editingId) return;
  const me=savedOwner(), id=editingId, r0=cache.find(x=>x.id===id); if(!r0 || !me) return;
  const typed0=$('#memoBox').value, live=noteLive(), draft=noteDraft(), mine=tasks.filter(t=>t.who && t.who===me), ph0=parseHist(r0);
  const noteChanged = noteJoin(noteMerge(notesOf(r0), live)).trim()!==noteJoin(notesOf(r0)).trim(), taskChanged = mine.some(t=>JSON.stringify(ph0.tasks.find(x=>x.id===t.id)||null)!==JSON.stringify(t));
  if(!noteChanged && !taskChanged) return true;
  lockSaving=true;
  try{ await pull(true); const r=cache.find(x=>x.id===id); if(!r) return; const ph=parseHist(r), now=new Date().toISOString();
    const nl=noteMerge(notesOf(r), live), note=noteJoin(nl);   // 통화 메모 기록: 방금 받은 최신 기록 위에 내 것만 더함 (2026-11-27)
    mine.forEach(t=>{ const i=ph.tasks.findIndex(x=>x.id===t.id); if(i>=0) ph.tasks[i]={...t}; else ph.tasks.push({...t}); });
    if(noteChanged){   // 영업 담당에게 알림: 아직 안 읽은 내 「통화 메모를 고쳤습니다」가 있으면 그 줄을 새로 (여러 번 고쳐도 알림 한 줄)
      const txt = draft ? draft.text.slice(-400) :`통화 메모 기록을 고쳤습니다 —\n${note.trim().slice(-400)}`, i=(ph.memos||[]).findIndex(m=>m.by===me && !m.seen && m.kind==='note');
      if(i>=0) ph.memos[i]={...ph.memos[i], t:now, text:txt}; else ph.memos=[...(ph.memos||[]), {id:'m'+Date.now().toString(36), t:now, by:me, kind:'note', text:txt, seen:false}]; }
    ph.h.push({t:now, by:me, what: [noteChanged ? (draft ? '[통화 메모] 기록 더함 (담당 아님)' : '[통화 메모] 기록 고침 (담당 아님)') + live.filter(n=>n.del && noteOwn.has(n.id) && n.del.t>(r0.updated||r0.saved||'')).map(n=>` · 지운 기록: ${String(n.text||'').slice(0,80)}`).join('') : '', ...mine.filter(t=>JSON.stringify(ph0.tasks.find(x=>x.id===t.id)||null)!==JSON.stringify(t)).map(t=>`[과업] ${t.title} ${t.done?'완료':'고침'}`)].filter(Boolean).join(' · ')});
    if(noteChanged) ph.notes=nl;
    const item={...r, ...(noteChanged ? {note} : {}), history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos, notes:ph.notes})};
    await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;
    if(noteChanged && editingId===id){ const did=noteDraftId; notes=nl.filter(n=>n.id!==did || !String($('#memoBox').value||'').trim()); if(!noteEditId) renderNotes(); }   // 적는 자리의 글은 그대로 (「저장」을 눌러야 기록으로 쌓임 — saveLockedCommit)
    memos=ph.memos; paintLock(); status(`저장됨 ${new Date().toTimeString().slice(0,5)} · ${noteChanged?'통화 메모':'과업'}`);
    if(noteChanged){ const ms=$('#memoSt'); if(ms){ ms.textContent=`저장됨 ${new Date().toTimeString().slice(0,5)}`; ms.className='memo-st ok'; } }
    try{ baseSnap=snap(); paintDirty(); }catch(_){}   // 저장한 뒤에는 「저장 안 함」으로 보지 않게 (창을 닫을 때 경고 없음)
    return $('#memoBox').value===typed0;   // 저장하는 사이 더 적었으면 아직 기록으로 쌓지 않음
  }catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); }
  finally{ lockSaving=false; } }
// 남이 담당인 예약에서 「저장」 · Ctrl+S (2026-11-27): 저장한 뒤 적는 자리의 글을 기록으로 쌓음 (자동 저장은 saveLockedParts 만 — 적는 자리 그대로)
async function saveLockedCommit(){
  for(let i=0; lockSaving && i<200; i++) await new Promise(ok=>setTimeout(ok, 50));
  const ok = await saveLockedParts(); if(ok===true) noteCommit(); try{ baseSnap=snap(); paintDirty(); }catch(_){}
  return ok; }
// 내 예약에 새 메모가 있으면: '메모를 확인하세요' 팝업 (확인할 때까지, 이 화면에서는 새 메모가 생길 때마다)
let memoShown=new Set();
function myNewMemos(){ const me=savedOwner(); if(!me) return []; const out=[]; (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)===me).forEach(r=>parseHist(r).memos.forEach(m=>{ if(!m.seen && m.by!==me) out.push({r, m}); })); return out.sort((a,b)=>String(b.m.t).localeCompare(String(a.m.t))); }
function paintMemoCount(){ if(typeof paintMyCount==='function') paintMyCount(); }
function checkMemoPopup(){
  return;   // 「메모를 확인하세요」 팝업은 안 띄움 (2026-11-24) — 메모는 추후 과업 「통화 메모 확인」 안에서 봄
  if(BOOK_ONLY) return;   // 예약 현황 공유 페이지에서는 안 함
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
// 알림 시각 (2026-11-25): 예전엔 늘 8 · 11 · 13 · 17시 → 나의 할일 설정에서 사람마다 (SY_ALERT · js/common.js) · 알림은 캘린더처럼 따로 뜨는 창(group.html?alert=1)으로
const ALERT_WIN = /[?&]alert=1/.test(location.search);   // 과업 알림 창 (따로 뜨는 창)
if(ALERT_WIN) document.documentElement.classList.add('alert-only');
// 공유 기록(내 개인업무목록 줄)에 저장된 알림 시각을 이 컴퓨터에 맞춤 — 개인고객 화면 · 다른 컴퓨터도 같게
function alertSync(){ try{ const r=typeof etcCatRec==='function' && etcCatRec(); if(!r) return; const a=(JSON.parse(r.history||'{}')||{}).alertTimes; if(Array.isArray(a) && JSON.stringify(a)!==JSON.stringify(SY_ALERT.times())) SY_ALERT.set(a); }catch(_){} }
const SELF_DONE = new Set(['erp','erpcheck','erpfix','progstaff','mbmenu']);   // erp · erpfix: 전산 내역을 붙여넣어야 완료 · 칸을 채우면 저절로 완료되는 과업은 '열기'만 (2026-11-23에 비웠다가 같은 날 되돌림)   // erp · erpfix: 전산 내역을 붙여넣어야 완료   // 칸을 채우면 저절로 완료되는 과업은 '열기'만
// 알림에 나올 것 = 나의 할일에 있는 것 모두 (2026-11-26 · 예전엔 단체 + 개인고객 과업만):
//  ① 단체 과업 ② 개인고객 과업 ③ 직접 넣은 업무(구분 · 반복 무엇이든 · 오늘 할 것과 안 한 지난 것) — 나의 할일 「오늘 마감」과 같은 목록(myDueList · js/group/14-task-sim.js)
//  ④ 내가 맡은 고객 견적 요청 (나의 할일 메인의 「고객 견적 요청」 · myQuoteReqs)
//  단, 넣은 지(마감을 바꾼 지) 30분이 안 된 것은 알리지 않음
function alertList(){
  const now=Date.now(), old = s => now - (+new Date(s||0)||0) >= QUIET_MS;
  const list = myDueList().filter(T => T.kind==='e' ? old(T._r.saved) : now - Math.max(+new Date(T._t.dueSetAt||0)||0, +new Date(T._t.at||T._r.saved||0)||0) >= QUIET_MS);
  myQuoteReqs().filter(q=>old(q.at)).forEach(q=>{ const a=new Date(q.at||''); list.push({kind:'q', q, due: isNaN(a) ? String(q.at||'').slice(0,10) : ymd(a), title:'견적서 · 거래명세서 발급'}); });
  return list.sort((a,b)=>(a.due||'').localeCompare(b.due||''));
}
// 알림 한 줄: [☐] [이름표] 누구 것 / 할 일 · 마감 / 「열기」
//  2026-11-26: 초록 「완료」 버튼은 없애고, 나의 할일 「오늘 마감」처럼 맨 앞 체크 칸으로 완료 (체크하면 바로 저장 · 그 줄이 사라짐)
//  예약을 열어 처리해야 끝나는 과업(전산 예약 · 전산 내역 대조 등 SELF_DONE)은 회색 체크 칸 — 누르면 그 예약을 엶 · 견적 요청은 체크 칸 없음(견적서 화면에서 끝냄)
function alertRowHTML(T, today){
  const n = T.due ? daysFrom(today, T.due) : 0, late=n<0, when = `${late?`(${-n}일 지남)`:'(오늘)'}`;
  const ck = T.kind==='q' ? '<span class="my-ck no"></span>'
    : T.kind==='g' && SELF_DONE.has(T.tid) ? `<label class="my-ck self" title="예약을 열어 처리하면 완료됩니다 (체크하면 그 예약을 엶)"><input type="checkbox" data-ackopen="${esc(T.rid)}"></label>`
    : `<label class="my-ck" title="체크하면 완료"><input type="checkbox" data-ack="${esc([T.kind, T.rid, T.tid||'', T.day||''].join('|'))}"></label>`;
  const row = (tag, who, sub, open) => `<li class="${late?'late':'today'}">${ck}<span class="who"><span class="tag">${tag}</span> ${who}<br>`
    + `<b class="${late?'late':''}">${esc(T.title||'')}</b> <small class="hint" style="margin:0">${sub}</small></span><button class="btn primary" ${open}>열기</button></li>`;
  if(T.kind==='q'){ const q=T.q; return row('견적', `<b>${esc(q.org||'(업체 미정)')}</b>${q.name?` · ${esc(q.name)}님`:''}${q.date?` · 방문 ${esc(dateLabel(String(q.date).slice(0,10)))}`:''}${q.pax?` · ${esc(q.pax)}명`:''}`, `접수 ${esc(fmt(q.at))} ${when}`, 'data-aopen="quote"'); }
  if(T.kind==='e') return row('업무', `<b>${esc(catLabel(etcCatOf(T.d))||ETC_NOCAT)}</b>${T.rep && T.rep!=='none' ? ` · ${esc(opsRepeatLabel(T.d))}` : ''}`, `마감 ${esc(mdLabel(T.due))} ${when}${T.before&&T.before.length?` · 안 한 지난 날 ${T.before.length}일 더`:''}`, 'data-aopen="my"');
  const r=T._r, t=T._t;
  if(T.kind==='p') return row('개인', `<b>${esc(r.contact||'(이름 없음)')}</b>${r.phone?` · ${esc(r.phone)}`:''}`, `마감 ${esc(mdLabel(t.due))} ${when}`, `data-popen2="${esc(r.id)}"`);
  return row('단체', `<b>${esc(r.org||r.contact||'(업체 미정)')}</b> · 방문 ${esc(dateLabel(r.date)||'미정')}${r.owner?` · ${esc(r.owner)}`:''}`, `마감 ${esc(mdLabel(t.due))} ${when}${t.id==='wkcheck'||t.id==='onsitecall'?` · ${esc(firstContact(r)||'담당자 연락처 없음')}`:''}`, `data-tbdopen="${esc(r.id)}"`);
}
function paintAlert(due){ const today=ymd(new Date());
  $('#tbdList').innerHTML = due.map(T=>alertRowHTML(T, today)).join('');
  // 제목의 「지남 · 오늘」은 과업만 셈 = 나의 할일 「오늘 마감」과 같은 줄 (2026-11-27 · 예전엔 고객 견적 요청 줄도 섞어 세어 「오늘 마감」 개수보다 많았음 → 견적 요청은 따로 적음 · 헤더의 「과업 n · 견적 요청 n」과 같은 모양)
  const tk=due.filter(T=>T.kind!=='q'), nQ=due.length-tk.length;
  $('#tbdTitle').innerHTML = `과업 알림 <small><b class="cnt-late">지남 ${tk.filter(T=>T.due<today).length}</b> · <b class="cnt-today">오늘 ${tk.filter(T=>T.due>=today).length}</b>${nQ?` · 견적 요청 ${nQ}`:''} · 나의 할일 전체 · 알림은 ${esc(SY_ALERT.label())}</small>`;
  $('#tbdLater').title=`닫기 (다음 알림 시각 ${SY_ALERT.label()}에 다시)`;
  $('#tbdModal').hidden=false; }
function checkTbdPopup(force){
  alertSync(); if(ALERT_WIN) force=true;
  const ENG=/[?&]engine=/.test(location.search);   // 첫 화면의 과업 계산 창: 새 창으로만 알림 (2026-11-25 · 첫 화면만 켜 둬도 알림)
  if(BOOK_ONLY || (MY_EMBED && !ENG)) return;   // 예약 현황 공유 페이지 · 나의 할일 팝업 안에서는 안 함
  // 알림 시각(나의 할일 설정 · 기본 오전 8시 · 11시 · 오후 1시 · 5시)이 지나고 처음 화면을 볼 때, 시각마다 한 번
  // 개인고객 화면과 같은 기록(SY_ALERT · sayuwon_task_slot)을 써서, 한 시각에 여러 화면 · 여러 탭에서 또 뜨지 않음
  // 2026-11-26: 따로 뜨는 창으로 (SY_ALERT.show · js/common.js — 브라우저가 막으면 화면을 처음 누를 때 엶 · 끝내 안 열리면 이 화면 팝업)
  if(ALERT_WIN){ const due=alertList();
    if(!due.length){ $('#tbdList').innerHTML = gWaiting() ? `<li class="hint">${SY.skel('list', 3, {label:'과업을 불러오는 중'})}</li>` : '<li class="hint">지금 알릴 과업이 없습니다.</li>';   /* 사본이 없고 처음 받는 중이면 스켈레톤 (2026-11-27) */ $('#tbdTitle').textContent='과업 알림'; $('#tbdModal').hidden=false; return; }
    paintAlert(due); return; }
  const k=SY_ALERT.keyNow(); if(!force && (!k || SY_ALERT.seen(k))) return;
  if(!force && !ENG && [...document.querySelectorAll('.modal')].some(m=>!m.hidden)) return;   // 다른 팝업이 떠 있으면 나중에 (1분마다 다시 봄)
  const due=alertList(); if(!due.length) return;
  if(force){ paintAlert(due); return; }
  SY_ALERT.show(ENG ? null : ()=>{ const d=alertList(); if(d.length) paintAlert(d); }, due.length);   // 과업 계산 창은 보이지 않으므로 이 화면 팝업은 없음
}
// 닫는 단추 (2026-11-27): 따로 뜨는 알림 창에는 없음 — 브라우저 창의 닫기(또는 Esc)로 닫음. 이 화면 안 팝업(창이 끝내 안 열릴 때)에만 오른쪽 위 ×
//  「이 시각의 알림을 봤다」는 기록은 알림을 띄울 때 이미 적으므로(SY_ALERT.mark · js/common.js) 닫을 때 따로 할 일은 없음 — 어떻게 닫아도 다음 알림 시각까지 다시 뜨지 않음
//  휴대폰 (2026-11-27 오후): 휴대폰 브라우저는 알림 창을 작은 창이 아니라 「새 탭」으로 열어 창 자체의 닫는 단추가 없다 → 휴대폰(폭 700px 아래 · 손가락으로 쓰는 기기)에서만 오른쪽 위 × 를 보임. PC 의 작은 알림 창은 그대로(× 없음)
//  × = ① 이 시각의 알림을 본 것으로 적고(주소로 직접 연 알림도 닫으면 다음 알림 시각까지 다시 안 뜸) ② 탭을 닫음(알림이 연 탭이면 닫히고 보던 탭이 다시 보임) ③ 안 닫히면 뒤로 가기 ④ 돌아갈 곳이 없으면 첫 화면
function alertWinClose(){
  try{ const k=SY_ALERT.keyNow(); if(k) SY_ALERT.mark(k); }catch(_){}
  try{ window.close(); }catch(_){}
  setTimeout(()=>{ if(window.closed) return;   // 닫혔으면 여기까지 오지 않거나 closed
    const home=()=>{ location.replace('index.html'); };
    if(history.length>1){ const t=setTimeout(home, 700); addEventListener('pagehide', ()=>clearTimeout(t), {once:true}); history.back(); } else home(); }, 200);
}
$('#tbdLater').onclick=()=>{ if(ALERT_WIN){ alertWinClose(); return; } $('#tbdModal').hidden=true; };
if(ALERT_WIN){ document.title='과업 알림 · 사유원';
  { const mq=matchMedia('(max-width:700px),(pointer:coarse)'), px=()=>{ $('#tbdLater').hidden=!mq.matches; }; px(); try{ mq.addEventListener('change', px); }catch(_){} }
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') window.close(); });
  setInterval(()=>{ if(window.__tasksReady) checkTbdPopup(true); }, 60000);   // 열어 둔 알림 창은 1분마다 새로 (다른 화면에서 끝낸 것은 사라짐)
  let aT=0; SY.live.on(()=>{ clearTimeout(aT); aT=setTimeout(()=>{ if(window.__tasksReady && !document.querySelector('#tbdList input:disabled')) checkTbdPopup(true); }, 150); }); }   // 2026-11-27: 다른 화면에서 과업을 끝내거나 다시 열면 1분을 기다리지 않고 바로 (알림 창의 줄 수가 나의 할일과 어긋나 보이지 않게 · 이 창에서 체크해 저장 중이면 그 저장이 끝난 뒤 다시 그림)
// 과업 하나 완료 (열어 둔 예약이면 화면의 과업, 아니면 저장된 기록을 고쳐 저장)
async function doneTask(id, tid){
  const r=cache.find(x=>x.id===id); if(!r) return;
  const now=new Date().toISOString(), base=tasksOf(r).find(t=>t.id===tid); if(!base) return;
  const mark = t => { t.done=true; t.doneAt=now; t.manualDone=1; t.doneBy=savedOwner()||'';   // 사람이 체크한 것 = 끝 (코드가 다시 따져서 되돌리지 않음, 2026-11-23)
  };
  if(editingId===id){ let t=tasks.find(x=>x.id===tid); if(!t){ t={...base}; tasks.push(t); } mark(t); if(tid==='memocheck'){ const me=savedOwner()||''; memos=memos.map(m=>!m.seen && m.by!==me ? {...m, seen:true, seenAt:now} : m); paintLock(); } if(t.subs) Object.keys(t.subs).forEach(k=>t.subs[k]=true); (t.xsubs||[]).forEach(x=>x.done=true); renderTasks(); await save({auto:true}); return; }
  const ph=parseHist(r); let t=ph.tasks.find(x=>x.id===tid); if(!t){ t={...base, memo:'', at:now}; ph.tasks.push(t); }
  if(tid==='memocheck'){ const me=savedOwner()||''; ph.memos=(ph.memos||[]).map(m=>!m.seen && m.by!==me ? {...m, seen:true, seenAt:now} : m); }   // 나의 할일에서 통화 메모 확인을 체크 = 안 읽은 메모를 읽음으로 (2026-11-24)
  mark(t); if(DOC_SUBS[t.id]) t.subs=Object.fromEntries(DOC_SUBS[t.id].map(([k])=>[k,true])); (t.xsubs||[]).forEach(x=>x.done=true); ph.h.push({t:now, by:savedOwner()||'', what:`[과업] ${t.title} 완료`});
  const item={...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos, notes:ph.notes}), saved:now}; await store.put(item);
  const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;   // 공유 기록에서 다시 받기 전에도 바로 반영
}
// 개인고객 과업 하나 완료 (그 통화 기록에 완료로 저장) — 나의 할일의 체크 칸과 알림의 체크 칸이 같이 씀
async function donePersonalTask(id, tid){
  const r=cache.find(x=>x.id===id); if(!r) return; let h={}; try{ h=JSON.parse(r.history||'{}')||{}; }catch(_){}
  const t=(h.tasks||[]).find(x=>x.id===tid); if(t){ t.done=true; t.doneAt=new Date().toISOString(); t.doneBy=savedOwner()||''; (t.xsubs||[]).forEach(x=>x.done=true); }
  const item={...r, history:JSON.stringify(h)}; await store.put(item); const ci=cache.findIndex(x=>x.id===id); if(ci>=0) cache[ci]=item;
}
// 알림의 체크 칸 (2026-11-26): 체크 = 완료로 저장하고 목록을 다시 그림 (남은 것이 없으면 「지금 알릴 과업이 없습니다」 · 이 화면 팝업이면 닫힘)
const alertRepaint = () => { const d=alertList(); if(d.length){ paintAlert(d); return; }
  if(ALERT_WIN){ $('#tbdList').innerHTML='<li class="hint">지금 알릴 과업이 없습니다.</li>'; $('#tbdTitle').textContent='과업 알림'; } else $('#tbdModal').hidden=true; };
$('#tbdList').addEventListener('change', async e=>{ const d=e.target.dataset||{};
  if(d.ackopen){ e.target.checked=false; toast('이 과업은 예약을 열어 처리하면 완료됩니다 (전산 내역 붙여넣기 · 칸 채우기).', 3200); e.target.closest('li')?.querySelector('[data-tbdopen]')?.click(); return; }
  if(!d.ack || !e.target.checked) return; const [kind, rid, tid, day]=d.ack.split('|'); e.target.disabled=true;
  try{
    if(kind==='g') await doneTask(rid, tid);
    else if(kind==='p') await donePersonalTask(rid, tid);
    else { const o=etcMine().find(x=>x.r.id===rid); if(!o) return; const dd=day||opsToday();
      await etcPut(o.r, {...o.d, done:{...(o.d.done||{}), [dd]:{at:new Date().toISOString(), by:savedOwner()||''}}}, `${dd} 완료 (과업 알림)`); }
    toast('과업을 완료로 표시했습니다.'); paintMyCount(); if(!$('#myModal').hidden) renderMy(); alertRepaint();
  }catch(err){ e.target.disabled=false; e.target.checked=false; toast('완료로 표시하지 못했습니다: '+(err.code||err.message)); } });
$('#tbdList').addEventListener('click', e=>{
  // 「열기」만 있음 (2026-11-26: 「완료」 버튼은 없앰). 단체 = 그 예약 · 개인 = 개인고객 화면의 그 통화 · 업무 = 나의 할일 · 견적 = 견적서 화면
  const d=e.target.dataset, kind = d.tbdopen ? 'g' : d.popen2 ? 'p' : d.aopen; if(!kind) return;
  const url = kind==='g' ? 'group.html?open='+encodeURIComponent(d.tbdopen) : kind==='p' ? 'personal.html?open='+encodeURIComponent(d.popen2) : kind==='quote' ? 'document/index.html' : './#mypop';
  if(ALERT_WIN){ window.open(url, '_blank'); return; }   // 알림 창: 새 탭에서 엶 (알림 창은 그대로)
  $('#tbdModal').hidden=true;
  if(kind==='g'){ const r=cache.find(x=>x.id===d.tbdopen); if(r) openRecordG(r); return; }
  if(kind==='my'){ openMy(); return; }
  guardLeave(()=>{ location.href=url; });
});
setInterval(()=>{ if(window.__tasksReady && !ALERT_WIN) checkTbdPopup(); }, 60000);   // 1분마다 확인 (나중에 = 2시간 뒤 다시)

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
// 열어 둔 예약 · 저장 안 한 입력 · 펼친 묶음 · 열어 둔 목록/나의 할일 · 스크롤을 이 브라우저에 기억했다가 다시 열 때 그대로
const VIEW_LS='sayuwon_view';
let viewT=null, restoring=false;
function saveView(){
  if(BOOK_ONLY) return;   // 예약 현황 공유 페이지에서는 안 함
  if(!window.__autoReady || restoring || MY_ONLY) return;   // 나의 할일 단독 화면(메뉴 8)은 기억하지 않음 → 단체 화면을 열 때 나의 할일가 먼저 뜨지 않게
  try{
    const dirty=isDirty();
    const v={ id:editingId||'', dirty, opt:[...optOpen], y:Math.round(window.scrollY),
      modal: !$('#listModal').hidden ? 'list' : '', at:Date.now() };   // 나의 할일 팝업은 기억하지 않음 (단체 화면은 늘 입력 화면부터)
    if(dirty){ v.rec=rec; v.memo=$('#memoBox').value; v.notes=notes; v.nd=[noteDraftId, noteDraftT]; v.nown=[...noteOwn]; v.tasks=tasks; v.nc=nContacts; v.tbdAuto=tbdAuto; }   // 저장 안 한 입력은 통째로
    localStorage.setItem(VIEW_LS, JSON.stringify(v));
  }catch(_){}
}
const saveViewSoon = () => { clearTimeout(viewT); viewT=setTimeout(saveView, 300); };
window.addEventListener('scroll', saveViewSoon, {passive:true});
window.addEventListener('pagehide', saveView);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) saveView(); });
['listModal','myModal'].forEach(id=>new MutationObserver(saveViewSoon).observe($('#'+id), {attributes:true, attributeFilter:['hidden']}));
async function restoreView(){
  if(BOOK_ONLY || MY_ONLY) return;   // 예약 현황 공유 페이지 · 나의 할일(단독 · 팝업)에서는 안 함 — 팝업 안에서 지난번 단체 화면(열어 둔 예약 · 단체예약 목록)이 되살아나지 않게 (2026-11-18)
  let v=null; try{ v=JSON.parse(localStorage.getItem(VIEW_LS)||'null'); }catch(_){}
  if(!v){ showStart(); return; }
  // 메뉴 · 링크로 들어오면 늘 새 통화 (2026-11-21) — 지난 화면(열어 둔 예약 · 목록)은 새로고침 · 뒤로 가기일 때만. 저장 안 한 입력이 있으면 그것만은 되살림
  //  2026-11-26: 그때 첫 화면은 「단체명으로 먼저 찾기」(showStart) — 되살릴 예약 · 입력 · 목록이 없을 때도
  const navType = (performance.getEntriesByType && (performance.getEntriesByType('navigation')[0]||{}).type) || 'navigate';
  if(navType==='navigate' && !v.dirty){ showStart(); return; }
  if(!v.id && !v.dirty && v.modal!=='list') showStart();
  restoring=true;
  try{
    await store.list();
    const r = v.id ? cache.find(x=>x.id===v.id) : null;
    if(r) openRecord(r);
    if(v.dirty && v.rec && (r || !v.id)){   // 저장 안 한 입력 되살리기 (저장된 예약이면 그 위에)
      Object.assign(rec, v.rec); Object.keys(v.rec).forEach(k=>{ if(v.rec[k]) touched.add(k); });
      if(Array.isArray(v.nd)){ if(Array.isArray(v.notes)){ notes=v.notes; noteOwn=new Set(v.nown||[]); } noteDraftId=v.nd[0]||''; noteDraftT=v.nd[1]||''; notes=notes.filter(n=>n.id!==noteDraftId); $('#memoBox').value = v.memo||''; renderNotes(true); }   // 통화 메모: 적던 글 · 손댄 기록 (2026-11-27)
      else if(!r) $('#memoBox').value = v.memo||'';   // 예전 모양으로 기억해 둔 것: 저장된 예약이면 메모 전체가 들어 있어 넣지 않음(기록이 겹쳐 쌓이지 않게)
      if(Array.isArray(v.tasks)) tasks=v.tasks; tbdAuto=!!v.tbdAuto;
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
window.__tasksReady=true; renderTasks(); checkPayPopup(); takeDocs(); setTimeout(checkTbdPopup, 0) /* 알림 목록이 뒤 조각(16 · 직접 넣은 업무 · 견적 요청)의 것을 써서 파일을 다 읽은 뒤에 (2026-11-26) */; checkMemoPopup();   // 추후 과업 · 결제 확인 알림 · 미정 항목 알림
// 불러오는 중 화면 걷기 (2026-11-21): 예약 정보(사본 또는 서버)가 준비되고, 열 예약(?open= · 새로고침 전 화면)을 다 연 뒤에. 서버 오류 · 로그인 필요 · 20초가 지나면 그냥 걷음
(function gLoadingWatch(){ const H=document.documentElement; if(!H.classList.contains('g-loading')) return; const t0=Date.now();
  const top=()=>{ const h=document.querySelector('body > header'); if(h) H.style.setProperty('--gl-top', Math.round(h.getBoundingClientRect().bottom)+'px'); }; top();
  let hasCache=false; cacheReady.then(()=>{ hasCache=(serverItems||[]).length>0; });
  const tick=()=>{ top();
    const failed = ['error','needkey'].includes(syncState);
    const data = pulledOnce || hasCache || failed;
    const waitOpen = !failed && ((openGId && !(pulledOnce && !(cache||[]).some(x=>x.id===openGId))) || restoring);   // 서버에서 받은 뒤에도 그 예약이 없으면 기다리지 않음
    if((data && !waitOpen) || Date.now()-t0>20000){ H.classList.remove('g-loading'); if(openGId && pulledOnce) toast('열려던 예약을 찾지 못했습니다. 단체예약 목록에서 찾아 주세요.'); return; }
    if(Date.now()-t0>4000) $('#gLoadingMsg').textContent='공유 기록에서 예약 정보를 받는 중…';
    setTimeout(tick, 120); };
  tick(); })();
window.addEventListener('focus', ()=>{ if(priceLoaded && Date.now()-priceLoaded>10*60000) loadQuotePrices(); });
$('#memoBox').focus();

// ===== 첫 화면: 단체명으로 먼저 찾기 (2026-11-26) =====
// 메뉴 · 링크로 단체 화면에 들어오면 입력 칸 하나만 보임 — 단체명을 치면 이미 있는 예약이 아래에 나오고(누르면 그 예약으로), 없으면 새 통화에 업체명이 들어감
//  - 건너뛰는 때: 새로고침 전에 보던 예약 · 저장 안 한 입력 · 목록을 되살릴 때(restoreView) · ?open= 으로 예약을 열 때 · 예약 현황 공유 · 나의 할일 · 알림 창
//  - 걷히는 때: 예약을 열거나 새 통화를 시작하면(newCall 이 endStart 를 부름) · 단체상담 입력을 적용하면
function showStart(force){   // force = 휴대폰 「다른 단체 찾기」: 주소로 연 예약(?open=) 뒤에도 첫 화면으로
  if(!force && (BOOK_ONLY || MY_ONLY || ALERT_WIN || openGId || /[?&]engine=/.test(location.search))) return;
  document.documentElement.classList.add('g-start'); paintStart();
  { const h=document.querySelector('body > header'); if(h) document.documentElement.style.setProperty('--start-top', Math.round(h.getBoundingClientRect().bottom)+'px'); }   // 머리줄 아래 남은 높이의 가운데에 (css #startBox) setTimeout(()=>{ const q=$('#startQ'); if(q) q.focus(); }, 0);
}
function endStart(){ document.documentElement.classList.remove('g-start'); }
// 찾기: 업체명 · 담당자 이름(띄어쓰기 무시) · 전화번호(숫자 4자리부터). 앞으로 있을 예약(가까운 날부터) → 지난 예약(최근 것부터)
function startHits(q){
  const qs=String(q||'').replace(/\s/g,'').toLowerCase(), qd=String(q||'').replace(/\D/g,''), t=todayYmd(); if(!qs) return [];
  const L=(cache||[]).filter(r=>isGroupRec(r) && ([r.org, r.contact].join(' ').replace(/\s/g,'').toLowerCase().includes(qs) || (qd.length>=4 && String(r.phone||'').replace(/\D/g,'').includes(qd))));
  return [...L.filter(r=>!r.date || r.date>=t).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')), ...L.filter(r=>r.date && r.date<t).sort((a,b)=>b.date.localeCompare(a.date))];
}
function paintStart(){
  const q=String($('#startQ').value||'').trim(), L=startHits(q), t=todayYmd();
  $('#startList').innerHTML = L.slice(0,30).map(r=>{ const s=stageOfRec(r);
    return `<li><button type="button" class="start-it" data-sid="${esc(r.id)}"><span class="num">${esc(dateLabel(r.date)||'방문일 미정')}</span><span class="tag st-${esc(s)}">${esc(s)}</span><b>${esc(r.org||r.contact||'(업체 미정)')}</b><small>${[r.people?`${esc(r.people)}명`:'', esc(firstContact(r)), ownerOf(r)?`담당 ${esc(ownerOf(r))}`:'', r.date && r.date<t?'지난 예약':''].filter(Boolean).join(' · ')}</small></button></li>`; }).join('');
  $('#startNew').hidden = isMobG() && !q;   // 휴대폰: 단체명을 적어야 새 통화 (업체 · 방문일 칸이 없어 이름 없이는 저장할 수 없으므로 · 2026-11-27)
  if(isMobG() && !q){ $('#startHint').textContent = '단체명을 입력하면 이미 있는 예약을 찾아 줍니다. 없으면 그 이름으로 새 통화를 시작할 수 있습니다.'; return; }
  $('#startHint').textContent = !q ? '단체명을 입력하면 이미 있는 예약을 찾아 줍니다. 없으면 새 통화에 업체명이 들어갑니다.'
    : L.length ? `이미 있는 예약 ${L.length}건${L.length>30?' (가까운 30건만 보임 · 더 적어 보세요)':''} — 누르면 그 예약으로 갑니다. 새로 받는 예약이면 아래 버튼을 누르세요.`
    : `「${q}」(으)로 저장된 예약이 없습니다. Enter 를 누르면 새 통화에 업체명이 들어갑니다.`;
  $('#startNew').textContent = q ? `「${q}」 새 통화로 시작` : '단체명 없이 새 통화';
}
function startOpen(id){ const r=(cache||[]).find(x=>x.id===id); if(r) openRecord(r); }   // openRecord → newCall → endStart
function startNew(org){
  endStart(); $('#startQ').value='';
  if(org){ rec.org=org; touched.add('org'); startTimer(); renderForm(); toast(`새 통화를 시작합니다 · 업체명 「${org}」`); }
  setTimeout(()=>{ const m=$('#memoBox'); if(m) m.focus(); }, 0);
}
$('#startQ').addEventListener('input', paintStart);
$('#startQ').addEventListener('keydown', e=>{ if(e.key!=='Enter' || e.isComposing || e.keyCode===229) return; e.preventDefault();
  const q=$('#startQ').value.trim(), L=startHits(q); if(!q) return;
  if(!L.length){ startNew(q); return; }   // 없는 단체 → 새 통화에 업체명
  if(L.length===1){ startOpen(L[0].id); return; }   // 한 건뿐이면 바로 그 예약으로
  const f=$('#startList .start-it'); if(f) f.focus(); toast(`이미 있는 예약이 ${L.length}건입니다 · 골라 주세요 (새로 받는 예약이면 아래 버튼)`); });
$('#startList').addEventListener('click', e=>{ const b=e.target.closest('[data-sid]'); if(b) startOpen(b.dataset.sid); });
$('#startNew').onclick=()=>startNew($('#startQ').value.trim());
// ===== 휴대폰(너비 700px 아래 · 2026-11-27): 통화 메모 · 추후 과업만 보임 (예약 내용 · 가격표 · 수정 기록 · 머리줄의 편집 버튼은 css/group.css 맨 끝에서 숨김) =====
//  새 통화: 첫 화면에서 단체명을 적고 시작 (이름 없이는 안 됨) → 통화 메모 「저장」 때 예약상담으로 처음 저장 · 나머지 칸은 PC 에서
//  맨 위 제목 줄(#mobHead)은 어느 예약인지 읽기만 · 「다른 단체 찾기」 = 첫 화면(단체명으로 찾기)으로. 맨 아래 안내 글(#mobNote)은 group.html
//  과업 체크는 휴대폰에서 바로 저장 (PC 는 그대로: 과업의 「저장」 · 맨 위 저장 · 30초 자동 저장 — 휴대폰에는 맨 위 저장 버튼이 안 보여서)
function isMobG(){ return window.matchMedia('(max-width:700px)').matches; }
function paintMobHead(){
  try{ const el=$('#mobHead'); if(!el) return; const s=effStage(rec);
    el.innerHTML = `<div class="mh-row"><span class="tag st-${esc(s)}">${esc(s)}</span><span class="mh-sub">${[esc(dateLabel(rec.date)||'방문일 미정'), rec.people?`${esc(rec.people)}명`:''].filter(Boolean).join(' · ')}</span><button type="button" class="btn primary" id="mobFind">다른 단체 찾기</button></div><b class="mh-org">${esc(rec.org||'(업체 미정)')}</b>`;
  }catch(_){ /* 화면을 처음 그리는 중 (아직 준비 안 된 값) — 다음에 다시 그림 */ } }
$('#mobHead').addEventListener('click', e=>{ if(!e.target.closest('#mobFind')) return; guardLeave(()=>{ newCall(false); showStart(true); window.scrollTo(0,0); }); });
$('#taskList').addEventListener('change', e=>{ if(!isMobG() || e.target.type!=='checkbox') return;
  setTimeout(()=>{ if((editingId || canSave()) && !editLockBy && isDirty()) save(true); }, 300); });
window.matchMedia('(max-width:700px)').addEventListener?.('change', ()=>{ if(document.documentElement.classList.contains('g-start')) paintStart(); });   // 폭이 바뀌면 첫 화면 안내 글도 맞게
document.addEventListener('click', e=>{ if(e.target.id==='consultApplyBtn') setTimeout(()=>{ if($('#consultModal').hidden) endStart(); }, 0); });   // 단체상담 입력을 적용했으면 입력 화면으로


// ===== 예약 내용 「비고 멘트 재출력」: 지금 예약 내용으로 전산 비고 문구를 다시 만들어 팝업으로 (복사 · 직접 고친 과업 문구 바꾸기) =====
(function(){
  const erpTasks = () => tasks.filter(t=>(t.id==='erp'||t.id==='erpfix') && t.noteEdit);
  $('#noteRegenBtn').onclick = () => {
    if(!rec || (!rec.org && !rec.date)){ toast('업체나 방문일을 먼저 입력하세요.'); return; }
    $('#noteOut').value = erpNote(rec);
    const ed = erpTasks(); $('#noteApply').hidden = !ed.length;
    $('#noteHint').textContent = ed.length ? '추후 과업 「전산 예약」의 비고 문구는 직접 고친 것이라 예약 내용이 바뀌어도 그대로입니다. 이 멘트로 바꾸려면 「과업 문구도 이걸로 바꾸기」.' : '';
    $('#noteModal').hidden = false; $('#noteOut').focus(); $('#noteOut').setSelectionRange(0,0); $('#noteOut').scrollTop=0;
  };
  $('#noteCopy').onclick = () => copy($('#noteOut').value, '비고 멘트를 복사했습니다. 전산 비고에 붙여넣으세요.');
  $('#noteApply').onclick = () => { erpTasks().forEach(t=>t.noteEdit=''); renderTasks(); renderSide(); autoSave(); $('#noteApply').hidden=true; $('#noteHint').textContent='추후 과업 「전산 예약」 비고 문구도 이 멘트로 바꿨습니다.'; };
  const close = () => { $('#noteModal').hidden = true; };
  $('#noteClose').onclick = close;
  $('#noteModal').addEventListener('mousedown', e=>{ if(e.target.id==='noteModal') close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#noteModal').hidden){ e.preventDefault(); close(); } });
})();

// ===== 사전답사 (예약 내용의 「사전답사」 버튼 · 견적서 앞) =====
// 팝업: 성명 · 연락처(기본 = 담당자 첫 줄) · 일자 · 인원 · 시간 → rec.tour. 정보가 있으면 추후 과업 「사전답사 전산 예약」(메모 = 답사 정보, 비고 문구 = <단체명> 사전답사/n명 현장 결제 필요)
function syncTourTask(){   // 답사 정보가 바뀌면 과업 메모도 (메모를 직접 고치지 않았으면)
  const t=tasks.find(x=>x.id==='tour'); if(!t || t.done) return;
  if(!t.memo || t.memo===t.memoTour){ t.memo=tourMemo(rec); t.memoTour=t.memo; }
}
function paintTourCk(){ const c=$('#ckTour'); if(c) c.checked=!!String(rec.tour||'').trim(); const b=$('#tourBtn'); if(b) b.classList.toggle('on', !!String(rec.tour||'').trim()); }
async function openTour(){
  await freshRec();   // 최신 내용(단체명 · 담당자 · 연락처)으로 (2026-11-19)
  const o=tourWithDefaults(rec, rec.tour);
  $('#tourName').value=o.name||''; $('#tourPhone').value=o.phone||''; $('#tourPeople').value=String(o.people||'').replace(/\D/g,''); $('#tourTime').value=o.time||'';
  const dv = /^\d{4}-\d{2}-\d{2}$/.test(o.date||'') ? o.date : '';
  $('#tourDateBox').innerHTML = dboxHTML('id="tourDate"', dv) + (o.date && !dv ? `<small class="hint" style="margin:0"> (적혀 있던 일자: ${esc(o.date)})</small>` : '');
  $('#tourModal').dataset.extra = JSON.stringify(o.extra||[]); $('#tourModal').dataset.rawDate = dv ? '' : (o.date||'');
  $('#tourClear').hidden = !String(rec.tour||'').trim();
  $('#tourModal').hidden=false; setTimeout(()=>$('#tourName').focus(),0);
}
const closeTour = () => { $('#tourModal').hidden=true; paintTourCk(); };
function setTour(v){ rec.tour=v; touched.add('tour'); syncTourTask(); startTimer(); renderSide(); renderTasks(); paintTourCk(); }
$('#tourBtn').onclick = openTour;
$('#ckTour').addEventListener('change', e=>{ if(e.target.checked){ e.target.checked=false; openTour(); return; }
  if(!confirm('사전답사 정보를 지울까요? (손대지 않은 과업 「사전답사 전산 예약」도 빠집니다)')){ e.target.checked=true; return; } setTour(''); toast('사전답사 정보를 지웠습니다.'); });
$('#tourSave').onclick = () => {
  let extra=[]; try{ extra=JSON.parse($('#tourModal').dataset.extra||'[]'); }catch(_){}
  const ppl=$('#tourPeople').value.replace(/\D/g,''), t=fmtTime($('#tourTime').value)||$('#tourTime').value.trim();
  const o={ name:$('#tourName').value.trim(), phone:fmtPhone($('#tourPhone').value.trim())||$('#tourPhone').value.trim(), date:$('#tourDate').value||$('#tourModal').dataset.rawDate||'', people: ppl ? ppl+'명' : '', time:t, extra };
  if(!o.date && !o.people && !o.time && !extra.length){ toast('일자 · 인원 · 시간 중 하나는 넣어 주세요.'); return; }
  setTour(tourJoin(o)); closeTour(); toast('사전답사 정보를 넣었습니다. 추후 과업 「사전답사 전산 예약」을 확인하세요.');
};
$('#tourClear').onclick = () => { if(!confirm('사전답사 정보를 지울까요?')) return; setTour(''); closeTour(); };
$('#tourClose').onclick = closeTour;
$('#tourModal').addEventListener('mousedown', e=>{ if(e.target.id==='tourModal') closeTour(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#tourModal').hidden){ e.preventDefault(); closeTour(); } });
$('#tourTime').addEventListener('blur', e=>{ const t=fmtTime(e.target.value); if(t) e.target.value=t; });   // 1000 → 10:00
$('#tourPhone').addEventListener('blur', e=>{ const p=fmtPhone(e.target.value); if(p) e.target.value=p; });

// ===== 삭제 확인 팝업 (추후 과업 삭제 등): 「정말로 삭제할 건가요?」 → 삭제 · 취소 (Enter = 삭제, Esc = 취소) =====
let askOk=null;
function askDelete(msg, ok){ askOk=ok; document.getElementById('askMsg').textContent=msg; document.getElementById('askModal').hidden=false; setTimeout(()=>document.getElementById('askNo').focus(),0); }
const closeAsk = () => { document.getElementById('askModal').hidden=true; askOk=null; };
document.getElementById('askNo').onclick = closeAsk;
document.getElementById('askYes').onclick = () => { const f=askOk; closeAsk(); if(f) f(); };
document.getElementById('askModal').addEventListener('mousedown', e=>{ if(e.target.id==='askModal') closeAsk(); });
document.addEventListener('keydown', e=>{ if(document.getElementById('askModal').hidden) return; if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); closeAsk(); } }, true);
// 과업의 하위 과업(견적서 생성 · 전송 · NAS 등) · 직접 추가한 세부 과제가 모두 체크됐는지 (없으면 true)
function taskSubsDone(t){ const ds=DOC_SUBS[t.id]; return (!ds || !t.subs || ds.every(([k])=>t.subs[k])) && (t.xsubs||[]).every(x=>x.done); }

// 통화 메모 저장 (2026-11-24): 「저장」 버튼 · 영업 담당이 아니면 쓰고 1.5초 뒤 · 칸을 나가면 바로 저장 (예전엔 30초 자동 저장만이라 그 전에 나가면 안 남았음)
let memoLockT=0;
$('#memoBox').addEventListener('input', ()=>{ if(!lockOwner || editLockBy) return; clearTimeout(memoLockT); const ms=$('#memoSt'); if(ms){ ms.textContent='저장 안 함'; ms.className='memo-st'; } memoLockT=setTimeout(()=>saveLockedParts(), 1500); });
$('#memoBox').addEventListener('blur', ()=>{ if(!lockOwner || editLockBy) return; clearTimeout(memoLockT); saveLockedParts(); });
// 통화 메모 기록 고치기 · 지우기 · 되살리기 (2026-11-27): 줄을 없애지 않고 표시만 남김 (ed = 고침 · del = 지움) · 영업 담당은 모두, 담당이 아니면 내가 적은 기록만 (noteCan)
function noteTouched(){ renderNotes();
  if(lockOwner){ clearTimeout(memoLockT); const ms=$('#memoSt'); if(ms){ ms.textContent='저장 안 함'; ms.className='memo-st'; } memoLockT=setTimeout(()=>saveLockedParts(), 1500); }
  else { renderTasks(); if(window.__autoReady){ scheduleAuto(); saveViewSoon(); } } }
$('#noteList').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return; const id=b.dataset.nedit||b.dataset.ndel||b.dataset.nback||b.dataset.nshow||b.dataset.nok||b.dataset.ncancel, n=notes.find(x=>x.id===id); if(!n) return;
  const me=savedOwner()||'', now=new Date().toISOString(), set=o=>{ notes=notes.map(x=>x.id===id ? o : x); noteOwn.add(id); };
  if(b.dataset.nshow){ noteShown.has(id) ? noteShown.delete(id) : noteShown.add(id); renderNotes(); return; }
  if(b.dataset.ncancel){ noteEditId=''; renderNotes(); return; }
  if(!noteCan(n)) return;
  if(b.dataset.nedit){ noteEditId=id; renderNotes(); const ta=$('#noteList .note-edit'); if(ta){ ta.style.height=Math.min(200, ta.scrollHeight+4)+'px'; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); ta.closest('li').scrollIntoView({block:'nearest'}); } return; }
  if(b.dataset.nok){ const ta=b.closest('li').querySelector('.note-edit'), v=String(ta.value||'').trim();
    if(!v){ toast('빈 글로는 고칠 수 없습니다. 없애려면 「지우기」를 눌러 주세요.'); return; }
    noteEditId=''; if(v!==String(n.text||'').trim()){ set({...n, text:v, ed:{t:now, by:me}, eds:[...(n.eds||[]), {t:now, by:me, from:String(n.text||'')}].slice(-20)}); noteTouched(); } else renderNotes(); return; }   // eds = 고치기 전 글(수정 기록 창에서 봄)
  if(b.dataset.ndel){ askDelete('이 통화 메모를 지울까요? 통화 메모 칸에서는 사라지고, 「수정 기록」 버튼에서 내용을 다시 보거나 되살릴 수 있습니다.', ()=>{ const x=notes.find(q=>q.id===id); if(!x) return; set({...x, del:{t:now, by:me}}); noteTouched(); }); return; }
  if(b.dataset.nback){ const o={...n}; delete o.del; set(o); noteTouched(); }
});
$('#noteList').addEventListener('keydown', e=>{ if(!e.target.closest('.note-edit')) return; if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); noteEditId=''; renderNotes(); } else if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); const ok=e.target.closest('li').querySelector('[data-nok]'); if(ok) ok.click(); } });
// 통화 메모 수정 기록 창 (같은 날 다섯 번째 · 운영팀: 통화 메모 칸에는 지금 유효한 메모만 · 고친 것 · 지운 것은 「수정 기록」 버튼에서)
//  지운 메모(del) = 내용 · 누가 언제 지웠는지 · 되살리기 / 고친 메모(eds · 예전 것은 ed 만) = 고치기 전 글과 고친 뒤 글. 최근 것부터.
function noteHistRender(){
  const m=document.getElementById('noteHistModal'); if(!m) return; const ev=[], who=n=>`${n.t?esc(dtLabel(n.t)):'예전 메모'}${n.by?` · ${esc(n.by)}`:''}`;
  notes.forEach(n=>{ const E=n.eds||[];
    E.forEach((e,i)=>ev.push({t:e.t, html:`<div class="nh-h"><b>고침</b><span>${esc(dtLabel(e.t))}${e.by?` · ${esc(e.by)}`:''}</span><span>(적은 것 ${who(n)})</span></div><div class="nh-tx old"><small>고치기 전</small>${esc(e.from)}</div><div class="nh-tx"><small>고친 뒤</small>${esc(i<E.length-1 ? E[i+1].from : n.text)}</div>`}));
    if(n.ed && !E.length) ev.push({t:n.ed.t, html:`<div class="nh-h"><b>고침</b><span>${esc(dtLabel(n.ed.t))}${n.ed.by?` · ${esc(n.ed.by)}`:''}</span><span>(적은 것 ${who(n)})</span></div><div class="nh-tx"><small>고친 뒤 (고치기 전 글은 남아 있지 않습니다)</small>${esc(n.text)}</div>`});
    if(n.del) ev.push({t:n.del.t||'~', html:`<div class="nh-h"><b>지움</b><span>${n.del.t?esc(dtLabel(n.del.t)):''}${n.del.by?` · ${esc(n.del.by)}`:''}</span><span>(적은 것 ${who(n)})</span>${noteCan(n)?`<button type="button" class="btn primary" data-nhback="${esc(n.id)}">되살리기</button>`:''}</div><div class="nh-tx">${esc(n.text)}</div>`}); });
  ev.sort((a,b)=>String(b.t).localeCompare(String(a.t)));
  m.querySelector('#noteHistBody').innerHTML = ev.length ? `<ul class="nh-list">${ev.map(e=>`<li>${e.html}</li>`).join('')}</ul>` : '<p class="nh-none">고치거나 지운 통화 메모가 없습니다.</p>'; }
function noteHistOpen(){
  let m=document.getElementById('noteHistModal');
  if(!m){ m=document.createElement('div'); m.id='noteHistModal'; m.className='modal'; m.hidden=true;
    m.innerHTML='<section class="panel note-hist" role="dialog" aria-modal="true" aria-labelledby="noteHistT" tabindex="-1"><h2 id="noteHistT">통화 메모 수정 기록 <small>고친 것 · 지운 것</small></h2><button type="button" class="win-x" id="noteHistX" title="닫기 (Esc)" aria-label="닫기">×</button><div id="noteHistBody" style="display:flex;flex-direction:column;min-height:0"></div></section>';
    document.body.appendChild(m);
    m.addEventListener('mousedown', e=>{ if(e.target===m) m.hidden=true; }); m.querySelector('#noteHistX').onclick=()=>{ m.hidden=true; };
    m.addEventListener('click', e=>{ const b=e.target.closest('[data-nhback]'); if(!b) return; const id=b.dataset.nhback, n=notes.find(x=>x.id===id); if(!n || !noteCan(n)) return;
      const o={...n, eds:[...(n.eds||[])]}; delete o.del; notes=notes.map(x=>x.id===id ? o : x); noteOwn.add(id); noteTouched(); renderNotes(true); noteHistRender(); toast('메모를 되살렸습니다.'); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !m.hidden){ e.preventDefault(); e.stopPropagation(); m.hidden=true; } }, true); }
  noteHistRender(); m.hidden=false; setTimeout(()=>m.querySelector('.note-hist').focus(), 0); }
$('#memoHistBtn').addEventListener('click', noteHistOpen);
// 적는 자리의 Enter (같은 날 네 번째 · 채팅 입력창처럼): Enter = 저장(기록으로 쌓기) · Shift+Enter = 줄바꿈 · Ctrl+Enter 도 저장 · 한글을 조합하는 중의 Enter 는 그대로 둠
$('#memoBox').addEventListener('keydown', e=>{ if(e.key!=='Enter' || e.shiftKey || e.altKey || e.isComposing || e.keyCode===229) return; e.preventDefault(); if(String($('#memoBox').value||'').trim()) $('#memoSave').click(); });
// 아직 저장한 적 없는 새 통화(PC): 예약을 저장할 수 없으니 적은 글을 화면의 기록으로만 쌓아 둠 — 맨 위 「저장」 · 자동 저장 때 함께 저장됨
function noteStackLocal(){ const d=noteDraft(); if(!d) return false; notes=noteSort([...notes.filter(n=>n.id!==d.id), d]); $('#memoBox').value=''; noteDraftId=''; noteDraftT=''; renderNotes(true); renderTasks(); if(window.__autoReady){ scheduleAuto(); saveViewSoon(); } return true; }
$('#memoSave').addEventListener('click', async ()=>{
  if(!editingId && !(isMobG() && canSave() && !lockOwner)){ if(noteStackLocal()){ const ms=$('#memoSt'); if(ms){ ms.textContent='저장 안 함'; ms.className='memo-st'; } if(!canSave()) toast('메모를 쌓아 두었습니다. 업체나 방문일을 넣고 맨 위 「저장」을 누르면 함께 저장됩니다.'); } $('#memoBox').focus(); return; }   // 휴대폰의 새 통화(단체명만 있음)는 여기서 처음 저장 (휴대폰에는 맨 위 저장 버튼이 없어서 · 2026-11-27)
  if(editLockBy){ lockPopup(); return; }
  clearTimeout(memoLockT); const ms=$('#memoSt');
  if(lockOwner){ await saveLockedCommit(); if(ms && ms.textContent==='저장 안 함'){ ms.textContent='바뀐 것 없음'; } return; }
  await save(); if(ms){ ms.textContent=`저장됨 ${new Date().toTimeString().slice(0,5)}`; ms.className='memo-st ok'; } });
// ▣ js/group/16-etc-tasks.js — 나의 할일의 기타 개인 업무(직접 넣는 업무 · 반복) · 개인 업무 구분 · 과업 알림 시각 설정
// ===== 나의 할일 · 기타 개인 업무 (통화 구분 '개인업무', 2026-11-18 전부 여기로 · 예전 ops.html?p=task 화면은 없앰) =====
// 저장: 공유 기록 한 줄 = 업무 하나. history = {kind:'task', d:{title, repeat, dows, dom, due, start, owner, memo, subs:[{id,title}], done:{날짜:{at,by}}, subDone:{날짜:{sid:1}}}, log}
// 화면 (나의 할일 › 전체 3열의 기타 · 기타 탭):
//  ① 업무 직접 추가 (반복 없음 · 매일 · 매주 요일 · 매달 일자)
//  ② 오늘 할 일 (지난 것 포함, 반복은 최근 7일): 체크 = 그날 완료 · 세부 과업 체크(모두 체크하면 그날 완료) · 이름을 누르면 그 자리에서 고치기
//  ③ 오늘 완료한 것 (체크를 풀면 되돌림) · ④ 내 업무 전체 (다음 날짜 · 누르면 고치기)
//  고치기: 업무 · 반복 · 날짜(시작일) · 세부 과업(추가 · ×) · 메모 · 저장 / 취소 / 삭제(확인 뒤)
const etcRows = () => (cache||[]).filter(r=>r.callType==='개인업무').map(r=>({r, j:opsParse(r)})).filter(o=>o.j).map(o=>({...o, d:o.j.d||{}}));
const etcMine = () => { const me=savedOwner(); return me ? etcRows().filter(o=>(o.d.owner||o.r.takenBy||'')===me) : []; };
function myEtcOpen(){ if(typeof opsParse!=='function') return []; const today=opsToday(), out=[];
  etcMine().forEach(o=>opsPending(o.d, today).forEach(day=>out.push({r:o.r, d:o.d, day})));
  return out.sort((a,b)=>a.day.localeCompare(b.day)); }
const etcNext = (d, today) => { if(!d.repeat || d.repeat==='none'){ const due=d.due||d.start; return due && !(d.done||{})[due] ? due : ''; }
  for(let i=0;i<400;i++){ const x=new Date(today+'T00:00'); x.setDate(x.getDate()+i); const day=opsYmd(x); if(opsOccurs(d, day) && !(d.done||{})[day]) return day; } return ''; };
// 저장 (한 업무). what = 수정 기록에 남길 말
async function etcPut(r, d, what){
  const me=savedOwner()||'', now=new Date().toISOString(), j=opsParse(r)||{kind:'task', log:[]};
  const keep=o=>Object.fromEntries(Object.keys(o||{}).sort().slice(-120).map(k=>[k,o[k]]));
  const d2={...d, done:keep(d.done), subDone:keep(d.subDone)};
  const item={...r, saved:r.saved||now, owner:d2.owner||r.owner||me, summary:`${d2.title} · ${opsRepeatLabel(d2)}`.slice(0,120), history:JSON.stringify({...j, kind:'task', d:d2, log:[...(j.log||[]), {at:now, by:me, what}].slice(-60)})};
  await store.put(item); const i=cache.findIndex(x=>x.id===r.id); if(i>=0) cache[i]=item; else cache.push(item);
  renderMy(); if(typeof paintMyCount==='function') paintMyCount(); return item;
}
// 화면 상태: 추가 칸 · 고치는 업무 · 접힌 목록
let etcForm = {repeat:'none', dows:[], dom:'', due:''}, etcEdit=null, etcOpenAll=false, etcOpenDone=false;   // etcEdit = {id, d}
const REP_OPTS=[['none','반복 없음'],['later','마감 없음'],['daily','매일'],['weekly','매주'],['monthly','매달']];
const etcDowsHTML = (sel, attr) => `<span class="etc-dows">${[1,2,3,4,5,6,0].map(i=>`<button type="button" class="${(sel||[]).includes(i)?'on':''}" ${attr}="${i}">${DOW[i]}</button>`).join('')}</span>`;
const etcDomHTML = (v, id) => `<select id="${id}" title="매달 날짜">${Array.from({length:31},(_,i)=>i+1).map(n=>`<option value="${n}"${String(v||new Date().getDate())===String(n)?' selected':''}>${n===31?'말일':n+'일'}</option>`).join('')}</select>`;
function etcAddHTML(presetCat){   // presetCat: 구분 탭에서는 그 구분이 골라져 있음
  const f=etcForm; if(presetCat!==undefined && etcForm.catTab!==presetCat){ etcForm.cat=presetCat; etcForm.catTab=presetCat; }
  const extra = f.repeat==='later' ? '<span class="hint etc-later">할 때가 되면 이름을 눌러 마감일을 넣으세요</span>' : f.repeat==='none' ?`<label class="etc-due">마감 ${dboxHTML('id="etcDue"', f.due||todayYmd())}</label>` : f.repeat==='weekly' ? etcDowsHTML(f.dows, 'data-etcdow') : f.repeat==='monthly' ? etcDomHTML(f.dom, 'etcDom') : '';
  return `<div class="etc-addbox"><form class="task-add etc-add" id="etcAdd">${etcCatSelHTML('etcCat', f.cat||'')}<input id="etcAddIn" data-ime="ko" placeholder="업무 직접 추가 (Enter)" autocomplete="off"><button class="btn etc-go" type="submit" title="추가 (Enter)" aria-label="추가">↵</button></form>`
    + `<div class="etc-rep"><span class="seg">${REP_OPTS.map(([k,l])=>`<button type="button" class="${f.repeat===k?'on':''}" data-etcrep="${k}">${l}</button>`).join('')}</span>${extra}</div></div>`;   // 추가 칸은 박스로 묶음 (2026-11-18)
}
function etcEditHTML(){
  const d=etcEdit.d, rep=d.repeat||'none';
  const when = rep==='later' ? '<span class="hint etc-later">마감일 없이 둡니다 · 「반복 없음」을 누르면 마감일을 넣을 수 있음</span>' : rep==='none' ?`<label class="etc-due">날짜 ${dboxHTML('id="etcEDue"', d.due||d.start||todayYmd())}</label>`
    : (rep==='weekly' ? etcDowsHTML(d.dows, 'data-eedow') : rep==='monthly' ? etcDomHTML(d.dom, 'etcEDom') : '') + `<label class="etc-due">시작 ${dboxHTML('id="etcEStart"', d.start||todayYmd())}</label>`;
  return `<div class="etc-edit">`
    + `<div class="etc-etop">${etcCatSelHTML('etcECat', etcCatOf(d))}<input id="etcETitle" class="etc-in" data-ime="ko" placeholder="업무" value="${esc(d.title||'')}"></div>`
    + `<div class="etc-rep"><span class="seg">${REP_OPTS.map(([k,l])=>`<button type="button" class="${rep===k?'on':''}" data-eerep="${k}">${l}</button>`).join('')}</span>${when}</div>`
    + `<div class="etc-subs"><b>세부 과업</b>${(d.subs||[]).map((s,i)=>`<span class="etc-sub">${esc(s.title||s.t||'')}<button type="button" data-eesubdel="${i}" title="빼기" aria-label="세부 과업 빼기">×</button></span>`).join('')}<input id="etcESubIn" class="etc-in" data-ime="ko" placeholder="세부 과업 적고 Enter" autocomplete="off"></div>`
    + `<textarea id="etcEMemo" class="etc-in" data-ime="ko" rows="2" placeholder="메모">${esc(d.memo||'')}</textarea>`
    + `<div class="etc-ebtns"><button type="button" class="btn" data-eedel>삭제</button><span class="sp"></span><button type="button" class="btn" data-eecancel>취소</button><button type="button" class="btn primary" data-eesave>저장</button></div></div>`;
}
// ===== 기타 개인 업무 구분 (2026-11-19): 사람마다 구분 목록(공유 기록 한 줄 · 통화 구분 「개인업무목록」, 예전 할 일 목록 화면의 목록 이름도 그대로) · 업무 d.list = 구분 =====
//  기타 탭: 「＋ 구분 추가」 · 추가 · 고치기 칸에서 구분 고르기 · 오늘 할 일을 구분별로 묶어 보기 / 전체 탭: 구분 고르기(그 구분만)
const ETC_NOCAT='구분 없음';
const etcCatRec = () => { const me=savedOwner(); return (cache||[]).find(r=>r.callType==='개인업무목록' && (r.owner||r.takenBy)===me) || null; };
function etcCats(){ let saved=[]; try{ saved=(JSON.parse((etcCatRec()||{}).history||'{}').lists)||[]; }catch(_){}
  const used=etcMine().map(o=>o.d.list).filter(Boolean); return [...new Set([...saved, ...used])].filter(c=>c && c!=='작업' && !/^@/.test(c)); }   // @personal · @group (개인예약 · 단체예약에 넣은 업무)은 내 구분이 아님
async function etcSaveCats(lists, order){ const me=savedOwner()||'', now=new Date().toISOString(), old=etcCatRec();
  let prev={}; try{ prev=JSON.parse((old||{}).history||'{}')||{}; }catch(_){}
  const item={...(old||{}), id: old ? old.id : 'el'+tdHash(me), callType:'개인업무목록', saved:(old&&old.saved)||now, takenBy:me, owner:me, summary:`나의 할일 구분 ${lists.join(', ')}`.slice(0,120), history:JSON.stringify({...prev, lists, order: order || prev.order || []})};   // ...prev: 알림 시각(alertTimes) 등 다른 설정은 그대로
  await store.put(item); const i=cache.findIndex(x=>x.id===item.id); if(i>=0) cache[i]=item; else cache.push(item); }
// 과업 알림 시각 (2026-11-25 · 나의 할일 설정): 시각마다 고치기 · 빼기 · 추가(횟수) · 기본으로 — 내 개인업무목록 줄(alertTimes)에 저장 + 이 컴퓨터(SY_ALERT)
async function etcSaveAlert(L){ L=SY_ALERT.set(L); const me=savedOwner()||'', now=new Date().toISOString(), old=etcCatRec();
  let prev={}; try{ prev=JSON.parse((old||{}).history||'{}')||{}; }catch(_){}
  const item={...(old||{}), id: old ? old.id : 'el'+tdHash(me), callType:'개인업무목록', saved:(old&&old.saved)||now, takenBy:me, owner:me, summary:(old&&old.summary)||'나의 할일 설정', history:JSON.stringify({...prev, lists: prev.lists || etcCats(), order: prev.order || [], alertTimes:L})};
  await store.put(item); const i=cache.findIndex(x=>x.id===item.id); if(i>=0) cache[i]=item; else cache.push(item); }
// 2026-11-26: 「기본으로」 버튼은 없앰 (처음에는 오전 8시 · 11시 · 오후 1시 · 5시 — SY_ALERT.DEF 그대로) · 하루 몇 번(− n번 ＋ · 0번 = 끔 · 많아야 8번)부터 고르고, 시각은 오전/오후 · 시 · 분(10분 단위) 고르기로
const AL_MAX=8;
function alertSetHTML(){ const L=SY_ALERT.times(), n=L.length;
  const row = (t,i) => { const h=Math.floor(t/60), m=t%60, pm=h>=12, h12=h%12||12, m10=Math.floor(m/10)*10;
    return `<li><span class="al-no">${i+1}번째</span>`
      + `<select data-alp="${i}" aria-label="${i+1}번째 알림 오전 · 오후"><option value="0"${pm?'':' selected'}>오전</option><option value="1"${pm?' selected':''}>오후</option></select>`
      + `<select data-alh="${i}" aria-label="${i+1}번째 알림 시">${[12,1,2,3,4,5,6,7,8,9,10,11].map(x=>`<option value="${x}"${x===h12?' selected':''}>${x}시</option>`).join('')}</select>`
      + `<select data-alm="${i}" aria-label="${i+1}번째 알림 분">${[0,10,20,30,40,50].map(x=>`<option value="${x}"${x===m10?' selected':''}>${x ? x+'분' : '정각'}</option>`).join('')}</select>`
      + `<button type="button" class="btn primary" data-aldel="${i}" title="이 시각 빼기">빼기</button></li>`; };
  return `<div class="al-set"><b>과업 알림</b>`   // 2026-11-27: 제목 아래 안내 글(「마감이 오늘이거나 지난 내 할 일을 …」)은 없앰
    + `<div class="al-count"><span>하루에 몇 번 알릴까요?</span><span class="al-step"><button type="button" class="btn primary" data-alminus${n?'':' disabled'} title="한 번 줄이기 (맨 뒤 시각을 뺌)" aria-label="알림 횟수 줄이기">−</button><b>${n ? n+'번' : '끔'}</b><button type="button" class="btn primary" data-aladd${n>=AL_MAX?' disabled':''} title="한 번 늘리기" aria-label="알림 횟수 늘리기">＋</button></span></div>`
    + (n ? `<ul class="al-list">${L.map(row).join('')}</ul><p class="hint al-say">시각을 바꾸면 바로 저장됩니다 · 이른 시각부터 차례로 놓입니다.</p>` : `<p class="hint al-say">알림을 끈 상태입니다. <b>＋</b> 를 누르면 다시 켜집니다.</p>`)
    + `</div>`; }
const alRepaint = () => { if(typeof paintMySet==='function') paintMySet(); };
document.addEventListener('change', async e=>{ const d=e.target.dataset||{}, i = d.alp ?? d.alh ?? d.alm; if(i==null) return; const li=e.target.closest('li'); if(!li) return;
  const pm=li.querySelector('[data-alp]').value==='1', h12=+li.querySelector('[data-alh]').value, m=+li.querySelector('[data-alm]').value, t=((h12%12)+(pm?12:0))*60+m;
  const L=SY_ALERT.times(); if(L[+i]===t) return;
  if(L.includes(t)){ toast(`${SY_ALERT.say(t)} 알림은 이미 있습니다.`); alRepaint(); return; }
  L[+i]=t; await etcSaveAlert(L); alRepaint(); toast(`과업 알림: ${SY_ALERT.label()}`); });
document.addEventListener('click', async e=>{ const b=e.target.closest?.('[data-aldel],[data-aladd],[data-alminus]'); if(!b || b.disabled) return; e.preventDefault(); let L=SY_ALERT.times();
  if(b.dataset.aldel!=null) L.splice(+b.dataset.aldel, 1);
  else if(b.dataset.alminus!=null) L.pop();
  else { if(L.length>=AL_MAX) return;   // 늘리기: 처음 정해 둔 시각(오전 8시 · 11시 · 오후 1시 · 5시) 가운데 빠진 것부터, 다 있으면 맨 뒤 시각의 1시간 뒤
    let n=SY_ALERT.DEF.find(x=>!L.includes(x)); if(n==null){ n=Math.min((L.length ? L[L.length-1] : 420)+60, 1380); while(L.includes(n) && n<1430) n+=10; if(L.includes(n)){ n=0; while(L.includes(n)) n+=10; } }
    L.push(n); }
  await etcSaveAlert(L); alRepaint(); toast(`과업 알림: ${SY_ALERT.label()}`); });
// 나의 할일 구분 (2026-11-19): 개인예약(개인고객 추후 과업) · 단체예약(단체 추후 과업) · 내가 만든 구분(기타 업무) · 구분 없음 — 순서는 사람마다 저장(▲▼로 바꿈)
const CAT_P='@personal', CAT_G='@group', CAT_N='@none';
const catLabel = c => c===CAT_P ? '개인예약' : c===CAT_G ? '단체예약' : c===CAT_N ? ETC_NOCAT : c;
function catOrder(){ let o=[]; try{ o=(JSON.parse((etcCatRec()||{}).history||'{}').order)||[]; }catch(_){}
  const all=[CAT_P, CAT_G, ...etcCats(), CAT_N], out=o.filter(x=>all.includes(x)); all.forEach(x=>{ if(!out.includes(x)) out.push(x); }); return out; }
const catTab = c => c===CAT_P ? 'personal' : c===CAT_G ? 'group' : 'cat:'+(c===CAT_N ? '' : c);
const tabCat = t => t==='personal' ? CAT_P : t==='group' ? CAT_G : /^cat:/.test(t) ? (t.slice(4) || CAT_N) : '';
// 구분 순서 · 추가 (메인 1열)
function catManageHTML(){ const o=catOrder();
  return `<div class="cat-manage"><b>구분</b> <small class="hint" style="margin:0">▲▼로 순서 (탭 · 고르기 순서)</small><ul class="cat-ord">${o.map((c,i)=>`<li><span>${esc(catLabel(c))}</span><button type="button" data-catmv="${i}|-1" title="위로"${i?'':' disabled'}>▲</button><button type="button" data-catmv="${i}|1" title="아래로"${i<o.length-1?'':' disabled'}>▼</button></li>`).join('')}</ul>`
    + (etcCatAdding ? `<div class="cat-addrow"><input id="etcCatIn" class="etc-catin" data-ime="ko" placeholder="새 구분 이름" autocomplete="off"><button type="button" class="btn primary" data-catok>추가</button></div>` : `<button type="button" class="btn cat-addbtn" data-etccatadd>＋ 구분 추가</button>`) + `</div>`; }   // 추가 버튼도 · 위 구분 줄과 같은 너비 · 높이 (2026-11-19)
document.addEventListener('click', async e=>{ const b=e.target.closest?.('[data-catmv]'); if(!b) return; e.preventDefault(); const [i,d]=b.dataset.catmv.split('|').map(Number), o=catOrder(), j=i+d; if(j<0 || j>=o.length) return;
  [o[i],o[j]]=[o[j],o[i]]; await etcSaveCats(etcCats(), o); renderMy(); });
const etcCatOf = d => (d.list && d.list!=='작업') ? d.list : '';
let etcCatFilter = (()=>{ try{ return localStorage.getItem('sy_etc_cat')||''; }catch(_){ return ''; } })(), etcCatAdding=false;   // 전체 탭에서 고른 구분 ('' = 모두)
const etcCatSelHTML = (id, v) => `<select id="${id}" class="etc-cat" title="구분 (안 고르면 구분 없음)"><option value="">${ETC_NOCAT}</option>${catOrder().filter(c=>c!==CAT_N).map(c=>`<option value="${esc(c)}"${c===v?' selected':''}>${esc(catLabel(c))}</option>`).join('')}</select>`;   // 개인예약 · 단체예약도 고를 수 있음 (2026-11-19)
document.addEventListener('change', e=>{
  if(e.target.id==='etcCat') etcForm.cat=e.target.value;
  if(e.target.id==='etcECat' && etcEdit) etcEdit.d.list=e.target.value;
  if(e.target.id==='etcCatFilter'){ etcCatFilter=e.target.value; try{ localStorage.setItem('sy_etc_cat', etcCatFilter); }catch(_){} renderMy(); } });
document.addEventListener('click', e=>{ if(e.target.closest?.('[data-etccatadd]')){ e.preventDefault(); etcCatAdding=true; etcRepaint(); setTimeout(()=>$('#etcCatIn')?.focus(), 0); } });
async function catAddFromIn(){ const el=$('#etcCatIn'); if(!el) return; const v=el.value.trim(); if(!v){ etcCatAdding=false; etcRepaint(); return; } if(v===ETC_NOCAT){ toast('다른 이름을 적어 주세요.'); el.focus(); return; }
  const cs=etcCats(); etcCatAdding=false; if(!cs.includes(v)) await etcSaveCats([...cs, v]); etcForm.cat=v; etcRepaint(); toast(`구분 「${v}」을 만들었습니다.`); }
document.addEventListener('keydown', async e=>{ if(e.target.id!=='etcCatIn') return; if(e.key==='Escape'){ etcCatAdding=false; etcRepaint(); return; } if(e.key!=='Enter' || e.isComposing) return; e.preventDefault(); await catAddFromIn(); });
document.addEventListener('mousedown', e=>{ if(e.target.closest?.('[data-catok]')) e.preventDefault(); });   // 칸을 벗어나며 닫히지 않게
document.addEventListener('click', async e=>{ if(e.target.closest?.('[data-catok]')){ e.preventDefault(); await catAddFromIn(); } });
document.addEventListener('focusout', e=>{ if(e.target.id==='etcCatIn' && !e.target.value.trim()) setTimeout(()=>{ if(etcCatAdding){ etcCatAdding=false; etcRepaint(); } }, 150); });
function etcSection(full, oneCat){   // oneCat (2026-11-19 · 나의 할일 구분 탭 · 메인 2 · 3열): 그 구분 업무만 ('' = 구분 없음) · full = 추가 칸도
  const today=ymd(new Date()), cats=etcCats(), one = oneCat!==undefined, cf = !full && !one && (etcCatFilter==='' || etcCatFilter==='__none' || cats.includes(etcCatFilter)) ? etcCatFilter : '';
  const inCat = o => one ? etcCatOf(o.d)===oneCat : full || !cf ? true : cf==='__none' ? !etcCatOf(o.d) : etcCatOf(o.d)===cf;
  const all=myEtcOpen().filter(inCat), mine=etcMine().filter(inCat);
  // 업무마다 한 줄: 오늘 할 날(없으면 가장 최근 지난 날) + 그 전에 안 한 날 수 (같은 업무가 날짜마다 여러 줄로 쌓이지 않게)
  const byId={}; all.forEach(o=>{ (byId[o.r.id] ||= []).push(o); });
  const list=Object.values(byId).map(a=>{ const s=a.slice().sort((x,y)=>y.day.localeCompare(x.day)); return {...s[0], before:s.slice(1).map(x=>x.day)}; }).sort((a,b)=>a.day.localeCompare(b.day));
  const late=list.filter(o=>o.day<today || o.before.length).length;
  const doneToday=mine.filter(o=>(o.d.done||{})[today]);
  const item = o => tkHTML(tkFromE(o, o.day, {before:o.before}));   // 과업 줄 모양은 모두 같음 · 줄 안에서 바로 고침 (js/mytask.js, 2026-11-21)
  const shownIds=new Set(list.map(o=>o.r.id));
  // 구분별로 묶기 (기타 탭): 구분 순서대로, 구분 없음은 맨 아래 (2026-11-19)
  const grouped = () => { const keys=[...cats, '']; const parts=keys.map(c=>({c, a:list.filter(o=>etcCatOf(o.d)===c)})).filter(g=>g.a.length || (g.c && full));
    return parts.map(g=>`<div class="etc-cat-h">${esc(g.c||ETC_NOCAT)} <small>${g.a.length}개</small></div>` + (g.a.length ? `<ul class="pc-list tk-list">${g.a.map(item).join('')}</ul>` : '<p class="hint etc-cat-empty">오늘 할 업무 없음</p>')).join(''); };
  const catBar = full
    ? `<div class="etc-catbar">${cats.map(c=>`<span class="etc-chip">${esc(c)}</span>`).join('')}${etcCatAdding ? `<input id="etcCatIn" class="etc-catin" data-ime="ko" placeholder="새 구분 이름 (Enter)" autocomplete="off">` : `<button type="button" class="btn sm" data-etccatadd>＋ 구분 추가</button>`}</div>`
    : (cats.length ? `<label class="etc-catpick">구분 <select id="etcCatFilter"><option value="">모두</option>${cats.map(c=>`<option${c===cf?' selected':''}>${esc(c)}</option>`).join('')}<option value="__none"${cf==='__none'?' selected':''}>${ETC_NOCAT}</option></select></label>` : '');
  return `<h3 class="my-h">${one ? esc(oneCat ? catLabel(oneCat) : ETC_NOCAT) : '기타 개인 업무'} <small>할 일 ${list.length}개${late?` · <b class="late">밀린 것 ${late}개</b>`:''}</small></h3>`
    + (one ? (full ? etcAddHTML(oneCat) : '') : catBar + etcAddHTML())
    + (list.length || (!one && full && cats.length) ? (!one && full && cats.length ? grouped() : `<ul class="pc-list tk-list">${list.map(item).join('')}</ul>`) : '<p class="hint">오늘 할 업무가 없습니다.</p>')
    + etcLaterHTML(mine.filter(o=>o.d.repeat==='later' && !/^@/.test(etcCatOf(o.d)||'')), !one)
    + (doneToday.length ? `<details class="etc-more"${etcOpenDone?' open':''} data-etcfold="done"><summary>오늘 완료한 것 ${doneToday.length}개</summary>${tkListHTML(doneToday.map(o=>({...tkFromE(o, today), done:true})))}</details>` : '')
    + `<details class="etc-more"${etcOpenAll?' open':''} data-etcfold="all"><summary>내 업무 전체 ${mine.length}개</summary>`
    + (mine.length ? tkListHTML(mine.slice().sort((a,b)=>String(a.d.title).localeCompare(String(b.d.title),'ko')).map(o=>tkFromE(o, o.d.repeat==='later' ? today : (etcNext(o.d, today)||'')))) : '<p class="hint">아직 업무가 없습니다. 위에서 추가하세요.</p>')
    + `</details>`;
}
// 기타 업무 세부 과업: 줄 아래 칸에 적고 Enter → 바로 저장 · × 빼기 (2026-11-19)
document.addEventListener('keydown', async e=>{ const id=e.target.dataset && e.target.dataset.etcsubadd; if(!id || e.key!=='Enter' || e.isComposing) return; e.preventDefault();
  const v=e.target.value.trim(), o=etcMine().find(x=>x.r.id===id); if(!v || !o) return; e.target.disabled=true;
  try{ await etcPut(o.r, {...o.d, subs:[...(o.d.subs||[]), {id:'s'+Date.now().toString(36), title:v}]}, `세부 과업 추가: ${v}`); setTimeout(()=>document.querySelector(`[data-etcsubadd="${CSS.escape(id)}"]`)?.focus(), 0); }
  catch(err){ e.target.disabled=false; toast('추가하지 못했습니다: '+(err.code||err.message)); } });
document.addEventListener('click', async e=>{ const b=e.target.closest && e.target.closest('[data-etcsubx]'); if(!b) return; e.preventDefault(); e.stopPropagation(); const [id,sid]=b.dataset.etcsubx.split('|'), o=etcMine().find(x=>x.r.id===id); if(!o) return;
  const s=(o.d.subs||[]).find(x=>x.id===sid); await etcPut(o.r, {...o.d, subs:(o.d.subs||[]).filter(x=>x.id!==sid)}, `세부 과업 빼기: ${s?(s.title||''):''}`); });
// 다시 그리기 (쓰던 칸 · 커서 유지)
function etcRepaint(){ const a=document.activeElement, id=a?.id, v=$('#etcAddIn')?.value||''; renderMy(); const i=$('#etcAddIn'); if(i) i.value=v; if(id){ const el=document.getElementById(id); if(el){ el.focus(); try{ const n=el.value.length; el.setSelectionRange(n,n); }catch(_){} } } }
// 고치는 칸의 글자 → etcEdit.d (다시 그려도 남게)
document.addEventListener('input', e=>{ if(!etcEdit) return; if(e.target.id==='etcETitle') etcEdit.d.title=e.target.value; if(e.target.id==='etcEMemo') etcEdit.d.memo=e.target.value; });
document.addEventListener('change', e=>{
  if(e.target.id==='etcDue') etcForm.due=e.target.value; if(e.target.id==='etcDom') etcForm.dom=e.target.value;
  if(etcEdit){ if(e.target.id==='etcEDue') etcEdit.d.due=e.target.value; if(e.target.id==='etcEStart') etcEdit.d.start=e.target.value; if(e.target.id==='etcEDom') etcEdit.d.dom=e.target.value; }
});
document.addEventListener('toggle', e=>{ const f=e.target.dataset?.etcfold; if(f==='all') etcOpenAll=e.target.open; if(f==='done') etcOpenDone=e.target.open; if(f==='today' && e.target.open!==doneTodayOpen()){ try{ localStorage.setItem(DONE_TODAY_LS, e.target.open?'1':'0'); }catch(_){} } }, true);
document.addEventListener('keydown', e=>{ if(e.target.id!=='etcESubIn' || e.key!=='Enter' || e.isComposing) return; e.preventDefault(); const t=e.target.value.trim(); if(!t || !etcEdit) return;
  etcEdit.d.subs=[...(etcEdit.d.subs||[]), {id:'s'+Date.now().toString(36), title:t}]; etcRepaint(); const i=$('#etcESubIn'); if(i){ i.value=''; i.focus(); } });
document.addEventListener('click', async e=>{
  const t=e.target;
  // 추가 칸
  const r=t.closest?.('[data-etcrep]'); if(r){ e.preventDefault(); etcForm.repeat=r.dataset.etcrep; if(etcForm.repeat==='weekly' && !etcForm.dows.length) etcForm.dows=[new Date().getDay()]; etcRepaint(); return; }
  const w=t.closest?.('[data-etcdow]'); if(w){ e.preventDefault(); const i=+w.dataset.etcdow; etcForm.dows = etcForm.dows.includes(i) ? etcForm.dows.filter(x=>x!==i) : [...etcForm.dows, i]; etcRepaint(); return; }
  // 밀린 날 모두 완료 (오늘 줄은 그대로)
  const pb=t.closest?.('[data-etcpast]'); if(pb){ e.preventDefault(); e.stopPropagation(); const o=etcMine().find(x=>x.r.id===pb.dataset.etcpast); if(!o) return; const today=opsToday(), now=new Date().toISOString(), me=savedOwner()||'';
    const days=opsPending(o.d, today), last=days[days.length-1], done={...(o.d.done||{})}; days.filter(d=>d!==last).forEach(d=>{ done[d]={at:now, by:me}; });
    await etcPut(o.r, {...o.d, done}, `밀린 ${days.length-1}일 완료 (나의 할일)`); toast(`「${o.d.title}」 밀린 ${days.length-1}일을 완료로 표시했습니다.`); return; }
  // 고치기 열기
  const ed=t.closest?.('[data-etcedit]'); if(ed){ e.preventDefault(); const o=etcMine().find(x=>x.r.id===ed.dataset.etcedit); if(!o) return;
    etcEdit={id:o.r.id, d:JSON.parse(JSON.stringify(o.d)), where: ed.closest('.today-due') ? 'today' : ed.closest('.my-extra') ? 'extra' : ed.closest('.etc-laterlist') ? 'later' : ''}; if(!etcEdit.d.repeat) etcEdit.d.repeat='none'; etcRepaint(); $('#etcETitle')?.focus(); return; }
  if(!etcEdit) return;
  const er=t.closest?.('[data-eerep]'); if(er){ const d=etcEdit.d; d.repeat=er.dataset.eerep; if(d.repeat==='weekly' && !(d.dows||[]).length) d.dows=[new Date().getDay()]; if(d.repeat==='monthly' && !d.dom) d.dom=String(new Date().getDate()); if(d.repeat!=='none' && !d.start) d.start=todayYmd(); if(d.repeat==='none' && !d.due) d.due=d.start||todayYmd(); etcRepaint(); return; }
  const ew=t.closest?.('[data-eedow]'); if(ew){ const i=+ew.dataset.eedow, s=etcEdit.d.dows||[]; etcEdit.d.dows = s.includes(i) ? s.filter(x=>x!==i) : [...s, i]; etcRepaint(); return; }
  const sd=t.closest?.('[data-eesubdel]'); if(sd){ etcEdit.d.subs=(etcEdit.d.subs||[]).filter((_,i)=>i!==+sd.dataset.eesubdel); etcRepaint(); return; }
  if(t.closest?.('[data-eecancel]')){ etcEdit=null; renderMy(); return; }
  if(t.closest?.('[data-eesave]')){ const d=etcEdit.d, o=etcMine().find(x=>x.r.id===etcEdit.id);
    const pend=$('#etcESubIn')?.value.trim(); if(pend) d.subs=[...(d.subs||[]), {id:'s'+Date.now().toString(36), title:pend}];   // 적어 두고 Enter 를 안 누른 세부 과업도
    if(!String(d.title||'').trim()){ toast('업무 이름을 적어 주세요.'); $('#etcETitle')?.focus(); return; }
    if(d.repeat==='weekly' && !(d.dows||[]).length){ toast('요일을 하나 이상 골라 주세요.'); return; }
    if(!o){ etcEdit=null; renderMy(); return; }
    d.title=d.title.trim(); const id=etcEdit.id; etcEdit=null; await etcPut(o.r, d, '고침 (나의 할일)'); toast(`「${d.title}」 고쳤습니다 · ${opsRepeatLabel(d)}`); return; }
  if(t.closest?.('[data-eedel]')){ const id=etcEdit.id, o=etcMine().find(x=>x.r.id===id); if(!o) return;
    askDelete(`「${o.d.title}」 업무를 삭제할까요? (반복 업무면 앞으로의 날짜도 모두 없어집니다)`, async()=>{ etcEdit=null; await store.del(id); cache=cache.filter(x=>x.id!==id); renderMy(); if(typeof paintMyCount==='function') paintMyCount(); toast(`「${o.d.title}」 삭제했습니다.`); }); return; }
});
// 업무 추가
document.addEventListener('submit', async e=>{
  if(e.target.id!=='etcAdd') return; e.preventDefault();
  const inp=$('#etcAddIn'), title=inp.value.trim(); if(!title){ inp.focus(); return; }
  const me=savedOwner(); if(!me){ toast('이름이 있어야 추가할 수 있습니다.'); return; }
  const f=etcForm, today=todayYmd();
  if(f.repeat==='weekly' && !f.dows.length){ toast('요일을 하나 이상 골라 주세요.'); return; }
  const d={title, repeat:f.repeat, owner:me, memo:'', subs:[]}; if(f.cat) d.list=f.cat;   // 구분 (2026-11-19)
  if(f.repeat==='none') d.due=f.due||today; else if(f.repeat!=='later') d.start=today;   // 마감 없음(later): 날짜 없이 (2026-11-20)
  if(f.repeat==='weekly') d.dows=f.dows.slice();
  if(f.repeat==='monthly') d.dom=String(f.dom||new Date().getDate());
  const now=new Date().toISOString(), item={id:opsId(), callType:'개인업무', saved:now, takenBy:me, owner:me, summary:`${title} · ${opsRepeatLabel(d)}`.slice(0,120),
    history:JSON.stringify({kind:'task', d, log:[{at:now, by:me, what:'추가 (나의 할일)'}]})};
  inp.disabled=true;
  try{ await store.put(item); if(!cache.some(x=>x.id===item.id)) cache.push(item); etcForm={repeat:'none', dows:[], dom:'', due:'', cat:etcForm.cat||''}; renderMy(); if(typeof paintMyCount==='function') paintMyCount(); $('#etcAddIn')?.focus();
    toast(`「${title}」 추가했습니다 · ${opsRepeatLabel(d)}${d.due && d.due!==today ? ` · ${mdLabel(d.due)}` : ''} · 세부 과업 · 메모는 이름을 눌러서`); }
  catch(err){ inp.disabled=false; toast('추가하지 못했습니다: '+(err.code||err.message)); }
});
// 체크: 그날 완료 · 완료 취소 · 세부 과업 (모두 체크하면 그날 완료, 하나라도 풀면 자동 완료 해제)
document.addEventListener('change', async e=>{
  const v=e.target.dataset?.etcdone || e.target.dataset?.etcundo, sv=e.target.dataset?.etcsub; if(!v && !sv) return;
  const me=savedOwner()||'', now=new Date().toISOString();
  if(sv){ const [id,day,sid]=sv.split('|'), o=etcMine().find(x=>x.r.id===id); if(!o) return; const d=o.d;
    const sd={...(d.subDone||{})}, m={...(sd[day]||{})}; if(e.target.checked) m[sid]=1; else delete m[sid]; sd[day]=m;
    const done={...(d.done||{})}, all=(d.subs||[]).length && (d.subs||[]).every(s=>m[s.id]);
    if(all && !done[day]) done[day]={at:now, by:me, auto:1}; if(!all && done[day] && done[day].auto) delete done[day];
    await etcPut(o.r, {...d, subDone:sd, done, ...(all && d.repeat==='later' ? {repeat:'none', due:day} : {})},`${day} 세부 과업 ${e.target.checked?'체크':'해제'}`); if(all) toast(`「${d.title}」 세부 과업을 모두 끝내 그날 완료로 표시했습니다.`); return; }
  const [id,day]=v.split('|'), o=etcMine().find(x=>x.r.id===id); if(!o) return; const done={...(o.d.done||{})};
  let due2=null; if(e.target.dataset.etcdone){ done[day]={at:now, by:me}; if(o.d.repeat==='later') due2=day; } else { delete done[day]; const t0=opsToday(); if((!o.d.repeat || o.d.repeat==='none') && day<t0) due2=t0; }   // 다시 열면 마감이 지났어도 오늘 (반복 없는 업무, 2026-11-19)
  e.target.disabled=true; await etcPut(o.r, {...o.d, done, ...(due2 ? {due:due2} : {}), ...(o.d.repeat==='later' && e.target.dataset.etcdone ? {repeat:'none'} : {})}, e.target.dataset.etcdone ? `${day} 완료 (나의 할일)` : `${day} 완료 취소 (나의 할일)`);
  toast(e.target.dataset.etcdone ? `「${o.d.title}」 완료로 표시했습니다.` : `「${o.d.title}」 완료를 취소했습니다.`);
});
// 짧은 해시 (주간 점검 기록 id)
const tdHash = s => { let h=5381; for(const c of String(s)) h=((h*33) ^ c.codePointAt(0))>>>0; return h.toString(36); };
// ===== 매주 목요일: 다음주 예약 점검 (2026-11-19) =====
// 영업 담당마다, 가장 가까운 지난 목요일(오늘이 목요일이면 오늘)에 그다음 날부터 다음주 일요일까지(금 ~ 다음주 일, 10일 · 2026-11-19 바꿈, 주 시작 = 월요일 · 겹치는 예약은 다시 점검)의 내 예약(가예약 · 예약확정)을 점검
// 나의 할일 › 단체 · 전체 탭의 추후 과업 (단체) 목록 맨 위에 과업 한 줄. 예약(단체 이름)마다 세부 과업(체크) — 이름을 누르면 그 예약 열기
// 체크는 공유 기록 한 줄(통화 구분 「주간점검」, 사람 · 주마다 하나)에 { week, done:{예약ID:시각} }
const wkThu = (today=ymd(new Date())) => { const d=new Date(today+'T00:00'); d.setDate(d.getDate()-((d.getDay()-4+7)%7)); return ymd(d); };
const wkAdd = (ymdS, n) => { const d=new Date(ymdS+'T00:00'); d.setDate(d.getDate()+n); return ymd(d); };
const wkId = (me, thu) => 'wk'+tdHash(me)+thu.replace(/-/g,'');
const wkRec = (me, thu) => (cache||[]).find(r=>r.id===wkId(me, thu)) || null;
const wkDone = (me, thu) => { try{ return (JSON.parse((wkRec(me, thu)||{}).history||'{}').done)||{}; }catch(_){ return {}; } };
function wkItems(me, thu){ const from=wkAdd(thu,1), to=wkAdd(thu,10);
  return (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)===me && r.date && r.date>=from && r.date<=to && isBooked(stageOfRec(r))).sort((a,b)=>String(a.date).localeCompare(String(b.date)) || String(a.org||'').localeCompare(String(b.org||''),'ko')); }
// 추후 과업 (단체) 목록 맨 위에 과업 한 줄: 「다음주 예약 점검」 + 예약마다 세부 과업(체크). 다 체크하면 목록에서 빠짐 (2026-11-19 · 따로 칸 만들지 않음)
function weekTask(){
  const me=savedOwner(); if(!me) return null;
  const today=ymd(new Date()), thu=wkThu(today), from=wkAdd(thu,1), to=wkAdd(thu,10), items=wkItems(me, thu), done=wkDone(me, thu), due=wkDue(me, thu);
  const n=items.filter(r=>done[r.id]).length; if(!items.length || n===items.length) return null;
  const late=today>due, left=daysFromWk(today, due), dt = late ? `<b class="late">${daysFromWk(due, today)}일 지남</b>` : left===0 ? '<b class="late">오늘</b>' : `${left}일 남음`;
  // 맨 앞 체크 = 모두 점검 (2026-11-19) · 마감은 날짜를 눌러 바꿈 (그 주에만, 기본 = 목요일)
  const html = `<li class="my-tg wk-task"><span class="who"><span class="tag">단체</span> <b>다음주 예약 점검</b> · ${esc(mdLabel(from))} ~ ${esc(mdLabel(to))} · ${n}/${items.length}<br>`
    + `<span class="my-task${late?' late':left===0?' today':''}"><label class="my-ck" title="체크하면 이 기간 예약을 모두 점검한 것으로"><input type="checkbox" data-wkall="1"></label> 내 예약(가예약 · 예약확정) 점검 <label class="wk-due" title="눌러서 마감일 바꾸기">마감 ${dboxHTML('data-wkdue="1"', due)} <small>(${dt})</small></label></span></span>`
    + `<div class="etc-subck wk-subs">${items.map(r=>{ const ck=!!done[r.id];
        return `<div class="wk-s${ck?' on':''}"><input type="checkbox" data-wkck="${esc(r.id)}"${ck?' checked':''} title="점검했으면 체크"> <span data-myopen="${esc(r.id)}" class="wk-name" title="눌러서 예약 열기">${esc(r.org||r.contact||'(업체 미정)')}</span> <small class="hint" style="margin:0">${esc(dateLabel(r.date))}${r.people?` · ${esc(r.people)}명`:''}</small></div>`; }).join('')}</div></li>`;
  return {html, late};
}
const daysFromWk = (a, b) => Math.round((new Date(b+'T00:00') - new Date(a+'T00:00'))/86400000);
const wkDue = (me, thu) => { try{ const d=(JSON.parse((wkRec(me, thu)||{}).history||'{}')).due; if(/^\d{4}-\d{2}-\d{2}$/.test(d||'')) return d; }catch(_){} return thu; };   // 마감 (바꿨으면 그 날)
// 저장 (사람 · 주마다 한 줄): {week, done:{예약ID:시각}, due}
async function wkSave(mut){
  const me=savedOwner()||'', thu=wkThu(), old=wkRec(me, thu), now=new Date().toISOString(); let h={}; try{ h=JSON.parse((old||{}).history||'{}')||{}; }catch(_){}
  const nh=mut({week:thu, done:{...(h.done||{})}, ...(h.due?{due:h.due}:{})}, now);
  const items=wkItems(me, thu), n=items.filter(r=>nh.done[r.id]).length;
  const item={...(old||{}), id:wkId(me, thu), callType:'주간점검', saved:(old&&old.saved)||now, takenBy:me, owner:me, summary:`다음주 예약 점검 ${mdLabel(wkAdd(thu,1))}~${mdLabel(wkAdd(thu,10))} · ${n}/${items.length}`, history:JSON.stringify(nh)};
  await store.put(item); const i=cache.findIndex(x=>x.id===item.id); if(i>=0) cache[i]=item; else cache.push(item); renderMy(); if(typeof paintMyCount==='function') paintMyCount();
  return {n, all:items.length};
}
document.addEventListener('change', async e=>{
  const id=e.target.dataset?.wkck, all=e.target.dataset?.wkall, due=e.target.dataset?.wkdue; if(!id && !all && !due) return;
  e.target.disabled=true;
  try{
    if(due){ if(!e.target.value) return; await wkSave(h=>({...h, due:e.target.value})); toast(`다음주 예약 점검 마감을 ${mdLabel(e.target.value)}로 바꿨습니다.`); return; }
    if(all){ const items=wkItems(savedOwner()||'', wkThu()); await wkSave((h,now)=>{ items.forEach(r=>{ if(!h.done[r.id]) h.done[r.id]=now; }); return h; }); toast('다음주 예약 점검을 모두 끝냈습니다.'); return; }
    const r=await wkSave((h,now)=>{ if(e.target.checked) h.done[id]=now; else delete h.done[id]; return h; }); if(r.all && r.n===r.all) toast('다음주 예약 점검을 모두 끝냈습니다.');
  }catch(err){ e.target.disabled=false; if(e.target.type==='checkbox') e.target.checked=!e.target.checked; toast('저장하지 못했습니다: '+(err.code||err.message)); }
});
// 예약 현황 아래 그날 목록: 단체 예약에서 온 줄을 누르면 그 예약 열기 (고치던 것은 openRecordG 가 먼저 물어봄)
document.addEventListener('click', e=>{ const li=e.target.closest?.('#dayAll li[data-bopen]'); if(!li || !li.dataset.bopen) return; const r=cache.find(x=>x.id===li.dataset.bopen); if(r) openRecordG(r); });
$('#cancelWhyTxt')?.addEventListener('click', openCancel);   // 사유를 누르면 고치기

// ===== 고객 견적 요청 → 견적서 · 거래명세서 담당자의 나의 할일 (2026-11-23) =====
// 멤버관리에서 「견적서 · 거래명세서 담당」으로 체크한 사람(서버 kv role:quote)에게, 아직 「접수」인 고객 견적 요청을 메인 1열 「오늘 마감」 위에 보여 줌.
// 담당이 아무도 없으면 모두에게 (담당 미지정 안내와 함께). 누르면 견적서 화면 — 거기서 출력 · 「끝난 요청으로」 하면 사라짐. 첫 화면 대시보드(js/portal.js lastReq)와 같은 기준
const MYQR_LS = 'sy_my_quotereq';
let myQR = (()=>{ try{ return JSON.parse(localStorage.getItem(MYQR_LS)||'null') || {items:[], owners:[]}; }catch(_){ return {items:[], owners:[]}; } })(), myQRBusy=false;
const myQuoteReqs = () => { const me=savedOwner(); return me && (!(myQR.owners||[]).length || myQR.owners.includes(me)) ? (myQR.items||[]) : []; };
async function loadMyQuoteReq(){
  if(myQRBusy || /[?&]engine=/.test(location.search) || typeof SY==='undefined' || !SY.callRaw) return; myQRBusy=true;
  try{ const [m, qr] = await Promise.all([SY.callRaw({action:'members'}).catch(()=>null), SY.callRaw({action:'quoteReqList'}).catch(()=>null)]);
    if(m && m.ok && qr && qr.ok){ const up=s=>String(s||'').trim().toUpperCase(), es=((m.roles||{}).quote||[]).map(up);
      myQR={items:(qr.items||[]).filter(r=>(r.status||'접수')==='접수').map(r=>({org:r.org, name:r.name, date:r.date, pax:r.pax, at:r.at})), owners:(m.members||[]).filter(x=>es.includes(up(x.emp))).map(x=>String(x.name||'').trim()).filter(Boolean)};
      try{ localStorage.setItem(MYQR_LS, JSON.stringify(myQR)); }catch(_){}
      paintMyCount(); if(typeof ALERT_WIN!=='undefined' && ALERT_WIN && window.__tasksReady) checkTbdPopup(true);   // 과업 알림 창: 견적 요청을 새로 받으면 다시 그림 (2026-11-26)
      if(!$('#myModal').hidden && myTab==='main' && !document.activeElement?.closest?.('#myBody input, #myBody textarea, #myBody select')) renderMy(); }   // 입력 중이면 다시 그리지 않음
  }catch(_){} finally{ myQRBusy=false; }
}
function myQuoteReqHTML(){
  const L=myQuoteReqs(); if(!L.length) return '';
  const today=ymd(new Date()), late=L.filter(r=>String(r.at||'').slice(0,10)<today).length;
  return `<h3 class="my-h sub">고객 견적 요청 <small>${L.length}건${late?` · <b class="late">지난 요청 ${late}건</b>`:''}${(myQR.owners||[]).length?'':' · 담당 미지정 (멤버관리에서 지정)'}</small></h3>`
    + `<ul class="pc-list">${L.map(r=>{ const d=String(r.at||'').slice(0,10);
        return `<li class="r my-tg"><a class="who" href="document/index.html" target="_top" style="color:inherit;text-decoration:none"><span class="tag">견적</span> <b>${esc(r.org||'')}</b>${r.name?` · ${esc(r.name)}님`:''}${r.date?` · 방문 ${esc(dateLabel(String(r.date).slice(0,10)))}`:''}${r.pax?` · ${esc(r.pax)}명`:''}<br>`
          + `<span class="my-task${d<today?' late':' today'}">견적서 · 거래명세서 발급 <small>접수 ${esc(String(r.at||'').slice(5,16))}</small></span></a></li>`; }).join('')}</ul>`;
}
if(!/[?&]engine=/.test(location.search)){ setTimeout(loadMyQuoteReq, 1500); setInterval(()=>{ if(document.visibilityState==='visible') loadMyQuoteReq(); }, 60e3); }

// ===== 나의 할일을 다시 그려도 적던 글자는 그대로 (2026-11-24) =====
// 30초마다 받아 오기 · 다른 컴퓨터에서 바뀜 · 견적 요청 1분마다 등으로 renderMy() 가 나의 할일을 통째로 다시 그리면, 적고 있던 칸(개인 업무 입력 · 세부 과업 · 메모 · 업무 고치기 등)이 비워졌음
//  → 다시 그리기 직전에 #myBody 안의 글자 칸 중 「처음 값과 달라진 것」(= 사람이 적은 것)과 커서를 기억했다가, 다시 그린 뒤 같은 자리의 칸에 되돌림
//  · 추가 칸(Enter · 추가)은 저장하는 동안 disabled 가 되므로 기억하지 않음 → 추가한 뒤에는 예전처럼 비워짐
//  · 같은 자리 = 칸의 id, 없으면 칸과 그 위 칸들의 data-* 값으로 (여러 과업의 「세부 과업 추가」 칸을 구분)
(function(){
  if(typeof renderMy!=='function') return;
  const TXT='input:not([type]), input[type=text], input[type=search], input[type=tel], input[type=number], textarea';
  const keyOf = el => { const parts=[]; let n=el;
    while(n && n.id!=='myBody'){ if(n.id){ parts.unshift('#'+n.id); break; }
      const ds=Object.entries(n.dataset||{}).filter(([k])=>k!=='ime').map(([k,v])=>k+'='+v).join('&'); if(ds) parts.unshift(n.tagName+'['+ds+']');
      n=n.parentElement; }
    return parts.length ? parts.join(' > ') + (el.className ? '.'+String(el.className).trim().split(/\s+/).join('.') : '') : ''; };
  const base=renderMy;
  renderMy=function(){
    const box=document.getElementById('myBody'), a=document.activeElement, vals={}; let foc=null;
    if(box){ box.querySelectorAll(TXT).forEach(el=>{ if(el.disabled || el.readOnly) return; const k=keyOf(el); if(k && el.value!==el.defaultValue) vals[k]=el.value; });
      if(a && box.contains(a) && a.matches(TXT) && !a.disabled){ const k=keyOf(a); if(k){ foc={k}; try{ foc.s=a.selectionStart; foc.e=a.selectionEnd; }catch(_){} } } }
    const r=base.apply(this, arguments);
    const box2=document.getElementById('myBody');
    if(box2 && (Object.keys(vals).length || foc)){ box2.querySelectorAll(TXT).forEach(el=>{ const k=keyOf(el); if(!k) return;
        if(k in vals && el.value!==vals[k]){ el.value=vals[k]; if(el.matches('[data-tkmemoin]') && typeof tkGrow==='function') try{ tkGrow(el); }catch(_){} }
        if(foc && k===foc.k){ el.focus({preventScroll:true}); try{ if(foc.s!=null) el.setSelectionRange(foc.s, foc.e); }catch(_){} } }); }
    return r; };
})();
// 나의 할일 › 내가 만든 구분 탭 (2026-11-24): 오늘 · 지난 것만이 아니라 그 구분의 업무 모두 — 업무마다 한 줄(밀린 날이 있으면 가장 이른 밀린 날 · 없으면 다음 할 날), 마감일 순 · 마감 없음은 맨 아래
//  (메인은 그대로 「오늘 마감」만 · 개인예약 · 단체예약 탭은 예전부터 모두 마감 순)
function etcCatAllHTML(c){
  const today=ymd(new Date()), mine=etcMine().filter(o=>etcCatOf(o.d)===c);
  const list=mine.filter(o=>o.d.repeat!=='later').map(o=>{ const p=opsPending(o.d, today), day = p.length ? p[0] : etcNext(o.d, today); return day ? {...o, day, before:p.slice(1)} : null; }).filter(Boolean)
    .sort((a,b)=>a.day.localeCompare(b.day) || String(a.d.title||'').localeCompare(String(b.d.title||''),'ko'));
  const late=list.filter(o=>o.day<today).length, doneToday=mine.filter(o=>(o.d.done||{})[today]);
  return `<h3 class="my-h">${esc(c ? catLabel(c) : ETC_NOCAT)} <small>할 일 ${list.length}개${late?` · <b class="late">밀린 것 ${late}개</b>`:''}</small></h3>`
    + etcAddHTML(c) + '<!--fx-->'   /* 여기까지(제목 · 입력 상자)는 고정, 아래 목록만 스크롤 (2026-11-27 · js/group/14-task-sim.js fxCol) */
    + (list.length ? tkListHTML(list.map(o=>tkFromE(o, o.day, {before:o.before}))) : '<p class="hint">할 업무가 없습니다.</p>')
    + etcLaterHTML(mine.filter(o=>o.d.repeat==='later'))
    + (doneToday.length ? `<details class="etc-more"${etcOpenDone?' open':''} data-etcfold="done"><summary>오늘 완료한 것 ${doneToday.length}개</summary>${tkListHTML(doneToday.map(o=>({...tkFromE(o, today), done:true})))}</details>` : '');
}
// ▣ js/group/17-dev-fake.js — 시험용: 가짜 예약 채우기 · 비우기 (테스트 DB · 가짜 DB 에서만 · 배포 DB 에 샌 가짜 예약 청소)
// ===== 시험용 모드 전용: 가짜 예약 채우기 · 비우기 (2026-11-25) =====
//  주소 끝 ?mock=1 로 켠 시험용 모드(js/devcf.js · 이 브라우저 안의 가짜 DB)에서만 보임 — 진짜 기록(공유 DB)에는 절대 쓰지 않음
//  단체 화면 · 예약 현황 공유 오른쪽 아래 「가짜 예약 채우기」: 단체 예약 약 210건 · 11 ~ 12월은 날마다 0 ~ 7건 · 그 밖(1년 전 ~ 다음 해 2월)은 드문드문 (모두 관람 또는 관람+식사 · 몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 · 여러 담당 · 지난 날짜 섞임)
//  「가짜 예약 비우기」: id 가 tst001 ~ (2026-11-25 예전 fake001 ~ 도) 인 것만 지움 (원래 있던 가상 예약 mock0001 등은 그대로)
//  id 를 fake··· → tst··· 로 바꾼 까닭 (2026-11-25): 예전 버전으로 열려 있던 창 · 첫 화면이 fake··· 를 「진짜 DB 에 샌 가짜」로 알고 테스트 DB 에서도 지워서 채운 것이 자꾸 사라짐 → 예전 버전이 모르는 이름으로
// 진짜 DB 청소 (2026-11-25 사고): 테스트 사이트의 시험용 모드에서 만든 가상 예약(mock0001 ~ · fake001 ~)이 같은 브라우저 저장소를 타고 진짜 DB 에 올라감
//  → 진짜 서버로 도는 단체 화면을 누가 열든, 목록에 그런 id 가 있으면 지움 (그 id 는 시험용 DB 만 만듦 · 진짜 예약 id 는 시각으로 만든 다른 모양) · 저장 대기열에 남은 것도 버림
(function(){
  if(typeof SY_DB_NAME==='undefined' || SY_DB_NAME!=='배포 DB') return;   // 청소는 배포 DB 에서만 (테스트 DB · 시험용 DB 의 가짜 예약은 그대로)
  const FAKE=/^(mock\d{4}|fake\d{3}|tst\d{3})$/;
  // 2026-11-25 고침: 한 번만 돌던 것을 계속 (예전 코드로 열려 있던 창이 다시 올려도 또 지움) · 지운 것은 화면 목록에서 바로 뺌 · 열어 둔 게 가상 예약이면 새 화면으로
  const sent={};   // id → 지우라고 보낸 시각 (같은 것을 2분 안에 또 보내지 않음)
  let busy=false;
  const sweep=async ()=>{ if(busy || !window.__tasksReady || !Array.isArray(cache)) return; busy=true;
    try{ const before=pending.length; pending=pending.filter(p=>!(p.action==='put' && p.item && FAKE.test(String(p.item.id)))); if(pending.length!==before) writeJSON(PEND_LS, pending);
      const L=cache.filter(r=>FAKE.test(String(r.id)));
      for(const r of L){ if(Date.now()-(sent[r.id]||0) < 120e3) continue; sent[r.id]=Date.now(); await store.del(r.id); console.info('[청소] 시험용 가상 예약을 진짜 DB 에서 지움:', r.id, r.org||r.contact||''); }
      if(L.length){ cache=cache.filter(r=>!FAKE.test(String(r.id))); if(typeof renderList==='function') try{ renderList(); }catch(_){} }
      if(typeof editingId!=='undefined' && FAKE.test(String(editingId||''))){ location.replace('group.html'); }
    }catch(e){ console.warn('[청소] 실패', e); } finally{ busy=false; } };
  setInterval(sweep, 5000);
})();
(function(){
  if(!window.SY_CF && !(typeof SY_DB_NAME!=='undefined' && SY_DB_NAME==='테스트 DB')) return;   // 시험용 DB · 테스트 DB 에서만 (배포 DB 에서는 아무것도 안 함 · 2026-11-25 테스트 DB 도)
  const ORGS=['대구시교육청','중앙교육연수원','대구정책연구원','한국은행 대구본부','경북대학교 평생교육원','영남일보 독자모임','포항제철 신우회','안동시청 문화과','계명대 경영학과','대구가톨릭대 동문회','칠곡군 여성단체','삼성전자 구미 동호회','대구은행 퇴직자회','경산시 노인복지관','청송 산림조합','군위군청 관광과'];
  const STAFF=['문현빈','김수정','사공유빈','김사유','이정원','박도슨트'];
  const MENUS=['사유의 밥상','몽몽 정식','사유의 밥상(단체)','몽몽 도시락'];
  const TIMES=['09:30','10:00','10:30','11:00','13:00','13:30','14:00','15:00'];
  const pick=(a,i)=>a[i%a.length];
  const day=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return SY.ymd(d); };
  // 날짜 (2026-11-25 다시 · 테스트를 11 ~ 12월에서 하므로): 올해 11월 1일 ~ 12월 31일은 날마다 0 ~ 7건 (없는 날 · 1건 · … · 가장 많은 날 7건이 고루 섞임)
  //  그 밖은 드문드문: 1년 전 11월 ~ 올해 10월은 9일에 1건 · 다음 해 1 ~ 2월은 6일에 1건. 누를 때마다 같은 날짜가 나옴 (난수 없음)
  const FAKE_DATES=(()=>{ const out=[], t=new Date(), y=t.getMonth()<6 ? t.getFullYear()-1 : t.getFullYear(), W=[0,1,1,2,2,3,3,4,0,5,2,6,1,7,3,4];
    const add=(d,c)=>{ for(let k=0;k<c;k++) out.push(SY.ymd(d)); };
    for(let d=new Date(y-1,10,1), k=0; d<new Date(y,10,1); d.setDate(d.getDate()+1), k++) if(k%9===4) add(d,1);
    for(let d=new Date(y,10,1), k=0; d<new Date(y+1,0,1); d.setDate(d.getDate()+1), k++) add(d, W[(k*7+3)%16]);
    for(let d=new Date(y+1,0,1), k=0; d<new Date(y+1,2,1); d.setDate(d.getDate()+1), k++) if(k%6===2) add(d,1);
    return out; })();
  const FAKE_N=FAKE_DATES.length;
  function fakeRec(i){
    const people=10+((i*7)%31), owner='테스트';   // 영업 담당 = 테스트 (2026-11-25 · 테스트 멤버로 로그인해 모두 고쳐 보게 · 프로그램 담당은 여러 이름 그대로)
    const date=FAKE_DATES[i], tin=pick(TIMES,i);
    const x={ org:pick(ORGS,i)+(i>=ORGS.length?` ${Math.floor(i/ORGS.length)+1}차`:''), date, owner, people:String(people), contact:'가짜 담당 '+(i+1), phone:`010-9${String(1000+i).slice(-3)}-${String(2000+i)}`,
      tin, tout:'16:00', pay:i%3?'결제링크':'현장 결제', note:'가짜 예약 (시험용)' };
    // 모든 예약에 관람 또는 관람+식사 (2026-11-25): 관람만 · 관람+사담 런치1부 · 관람 일부 + 관람+사담 런치2부 · 관람+사담 디너 — 방문일 평일 / 주말·공휴일, 입장 13시 이후면 13~18시 관람권
    const dayName=typeof isRedDay==='function' && isRedDay(date) ? '주말/공휴일' : '평일', vt=(parseInt(tin)||0)>=13 ? '13:00~18:00' : '09:00~18:00', vsrc=`${dayName} 관람(${vt})`;
    const kind=i%4, part=Math.max(5, Math.round(people/2));
    if(kind===0) x.views=`${vsrc} x${people}`;
    else if(kind===1) x.sadam1=String(people);
    else if(kind===2){ x.sadam2=String(part); x.views=`${vsrc} x${people-part}`; }
    else x.sadamD=String(people);
    // 다섯 목록에 고루: 몽몽마방 · 대관(차방 · 당두봉갈) · 도슨트(동행 · 세미나) · 프로그램(요가 · 사운드워킹 · 사유의 향) · 음료쿠폰(가가빈빈)
    if(i%2===0){ x.mabangL=String(people); x.mabangTime=pick(['12:00','12:30','11:30'],i); x.mabangMenu=pick(MENUS,i); }
    if(i%4===1){ x.chabang='2'; x.tm_chabang=pick(TIMES,i+2); x.stf_chabang=pick(STAFF,i+2); }
    if(i%5===2){ x.dangdu='1'; x.tm_dangdu=pick(TIMES,i+3); x.stf_dangdu=pick(STAFF,i+3); }
    if(i%3===0){ x.donghaeng='1'; x.tm_donghaeng=pick(TIMES,i+1); x.stf_donghaeng=pick(STAFF,i); x.crs_donghaeng=pick(['앵당','치허문'],i); }
    if(i%7===3){ x.seminar='1'; x.tm_seminar='15:00'; x.stf_seminar=pick(STAFF,i+4); x.plc_seminar='당두봉갈'; }
    if(i%3===1){ const k=pick(['yoga','sound','scent'],i); x[k]=String(Math.min(people,20)); x['tm_'+k]=pick(TIMES,i+5); x['stf_'+k]=pick(STAFF,i+5); }
    if(i%4===2){ x.gaga=String(people); x.stf_gaga=pick(STAFF,i); }
    return x;
  }
  async function fill(n){
    const now=new Date().toISOString(), h=JSON.stringify({h:[{t:now, by:'시험', what:'가짜 예약 (시험용)'}], tasks:[], erp:[], memos:[]});
    for(let i=0;i<n;i++){ const x=fakeRec(i), past=x.date<todayYmd(), stage=past ? (i%13===0?'예약취소':'예약확정') : i%6===5?'예약상담':i%3===2?'가예약':'예약확정';   // 지난 예약은 거의 예약확정 · 가끔 예약취소
      if(stage==='예약취소') x.cancelWhy='가짜 예약 (시험용 취소)';
      if(i%10===0) toast(`가짜 예약 넣는 중 · ${i}/${n}`, 1500);
      const item={...x, ...packExtra(x), callType:stage, summary:`가짜 예약 ${i+1}`, takenBy:x.owner, callStart:now, id:'tst'+String(i+1).padStart(3,'0'), saved:now, history:h};
      await store.put(item); }   // 화면이 저장할 때와 같은 모양 (칸 + packExtra 로 묶은 비고)
    await synced();
  }
  const synced = async () => { for(let i=0;i<1200 && pending.length;i++){ await new Promise(r=>setTimeout(r,250)); if(pending.length && i%8===7) flush(); } };   // 가짜 DB에 다 들어갈 때까지
  async function clear(){ const L=(cache||[]).filter(r=>/^(fake|tst)\d+$/.test(r.id)); for(const r of L) await store.del(r.id); await synced(); return L.length; }
  function bar(){ if(document.getElementById('fakeBar')) return; const b=document.createElement('div'); b.id='fakeBar';
    b.innerHTML='<b>'+(window.SY_CF?'시험용':'테스트 DB')+'</b><button type="button" class="btn primary" data-fake="fill" title="단체 예약 '+FAKE_N+'건 · 11 ~ 12월은 날마다 0 ~ 7건 · 그 밖은 드문드문 · 모두 관람 또는 관람+식사 (지금 DB 에만 · 배포 DB 에는 안 감 · 4~5분 걸림)">가짜 예약 채우기</button><button type="button" class="btn primary" data-fake="clear" title="가짜 예약(tst… · 예전 fake…)만 지움">가짜 예약 비우기</button>';
    document.body.appendChild(b); }
  document.addEventListener('click', async e=>{ const b=e.target.closest?.('[data-fake]'); if(!b) return; b.disabled=true;
    try{ if(b.dataset.fake==='fill'){ await fill(FAKE_N); toast(`가짜 예약 ${FAKE_N}건을 넣었습니다. 다시 불러옵니다.`); }
      else { const n=await clear(); toast(`가짜 예약 ${n}건을 지웠습니다. 다시 불러옵니다.`); }
      setTimeout(()=>location.reload(), 700); }
    catch(er){ b.disabled=false; toast('못 했습니다: '+(er.code||er.message)); console.error(er); } });
  if(document.body) bar(); else document.addEventListener('DOMContentLoaded', bar);
})();
