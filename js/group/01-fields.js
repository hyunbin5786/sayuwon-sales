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
// 프로그램 품목 ↔ 견적서 품목 (견적서·금액 계산용)
const PROG_SRC = { yoga:'요가프로그램(단체)', gaga:'음료쿠폰(가가빈빈)', chabang:'대관', dangdu:'대관', donghaeng:'해설사도슨트(수정)', seminar:'세미나', seminar2:'세미나', sound:'사운드워킹', scent:'사유의 향', haeorum:'사유원 새벽 해오름 산책(평일)' };
const HAEORUM_WE = '사유원 새벽 해오름 산책(주말)';
const progSrc = (k, r) => k==='haeorum' && r && r.date && isRedDay(r.date) ? HAEORUM_WE : PROG_SRC[k];   // 해오름 산책: 토/일 · 공휴일은 주말 품목
// 지금 견적서 품목 리스트에 있는 단체 품목 (이것 말고 새로 추가된 것만 프로그램 칸으로 붙임)
const PROG_KNOWN = ['사유원 새벽 해오름 산책(주말)','대관','세미나','해설사도슨트(수정)','임원도슨트(수정)','사운드워킹','사유의 향','요가프로그램(단체)','음료쿠폰(가가빈빈)','음료쿠폰(몽몽차방)','사유의 밥상(단체)','당두봉갈 대관'];
const PROG_GRP = { geach:'프로그램(개별)', gtime:'프로그램(시간)' };
const UNIT = k => /^seminar2?$/.test(k) ? '회' : COUPON_IN_GOODS.includes(k) ? '개' : (FIELDS.find(f=>f[1]===k)||[])[0]==='프로그램(시간)' ? '시간' : '명';   // 세미나 도슨트는 회 (2026-11-18)
// 세미나 도슨트 수량 2 = 두 번(두 장소): 두 번째의 시작 · 끝 · 장소 · 비고는 예전 「세미나 도슨트(2)」 칸(tm_seminar2 · plc_seminar2 · 비고 seminar2)에 둠 (2026-11-18)
const sem2On = r => numOf(r.seminar)>=2 || !!r.seminar2;
const SEM2_IX = ['tm_seminar2','plc_seminar2','stf_seminar2'];   // 두 번째 장소 담당(stf_seminar2)도 (2026-11-21)
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
  ...(r.seminar && sem2On(r) && !r.seminar2 && !String(r.stf_seminar2||'').trim() ? ['seminar2'] : [])];   // 세미나 도슨트 2회: 두 번째 장소 담당도 필수 (2026-11-21)
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
CFIELDS.forEach(([f,l])=>{ for(let i=0;i<10;i++) LABEL[`c${i}_${f}`]= i? `${l}(${i+1})` : l; });
const SPECIAL_LABEL = { dKansong:'간송 할인', dMerit:'국가유공자 할인', dGunwi:'군위 주민 할인', dClergy:'대구대교구', dStaff:'직원 할인', dGuide:'가이드 무료' }; Object.assign(LABEL, SPECIAL_LABEL);
Object.assign(LABEL, { teaMed:'티하우스 명상', gayageum:'가야금', cabin:'유루 캐빈' });
try{ addCatalogProgs(JSON.parse(localStorage.getItem('sayuwon_quote_cat'))); }catch(_){}   // 마지막으로 받은 견적서 품목으로 (새로 받으면 그때 다시)
const DOW = SY.DOW;   // 공통 도구 (js/common.js)
const $ = s => document.querySelector(s);
const esc = SY.esc;
const ymd = SY.ymd;
const isCKey = k => /^c\d+_(name|phone|email|memo)$/.test(k);   // 담당자 칸 (시트에는 담당자 · 연락처 · 이메일 열에 " / "로 모아서, 메모는 비고 칸에)

