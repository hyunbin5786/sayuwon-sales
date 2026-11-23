// ===== 추후과업 메시지 관리 (2026-11-20 · 2026-11-21 모두 편집) =====
// 단체예약의 자동 추후 과업을 모든 직원이 같이 고침. 원래 있는 과업도 새 과업과 똑같이 모든 칸을 편집:
//   이름 · 언제 생길지(조건 — 원래 조건도 조건 칸으로 채워 둠, 빼거나 바꿀 수 있음) · 마감(원래 규칙이 골라져 있음) · 세부 과업(견적서 생성 · 전송 등 원래 것도)
//   · 과업 문구(전산 비고 · 세금계산서 요청 등) · 과업 아래 안내 줄(바뀐 내용 등 · 2026-11-23 · 예전 「고객 안내 글」은 쓰지 않아 없앰) · 끄기
// 원래 값 그대로인 칸은 저장하지 않음 → 코드의 원래 규칙 그대로. 고친 칸만 공유 기록에 저장
// 공유 기록 한 줄(id taskcfg, 통화 구분 '추후과업설정')의 수정 기록 칸에 {b:{과업id:{title,when,due,docSubs,subs,note,desc,off,noAutoSubs}}, c:[{id,title,conds,due,subs,note,desc,off}], at, by}   (예전에 저장된 msg 는 읽지 않고, 다음 저장 때 없어짐)
//   (예전 b.conds = 원래 조건에 더하는 조건 → 열면 원래 조건 + 그것으로 보이고, 저장하면 when 으로 바뀜)
// 문구 · 안내 줄은 {단체명} 처럼 바꿔 넣는 말을 씀 → 예약마다 그 값으로
var TCFG_ID='taskcfg', TCFG_TYPE='추후과업설정';
const TCFG_BASE_TITLES = {...AUTO_TASKS};   // 처음 이름 (되돌리기용)
delete TCFG_BASE_TITLES.onsitecall; delete TCFG_BASE_TITLES.tbdcall;   // 2026-11-23: 현장 결제 인원 확인 연락 · 미정 항목 확인 연락은 따로 과업이 아니라 다음주 예약 점검의 세부 과업 (그 칸에서 켜고 끔)
const TCFG_BASE_DOC = JSON.parse(JSON.stringify(DOC_SUBS));   // 원래 세부 과업 (견적서 · 거래명세서 · 대구대교구)
const TCFG_BASE_FOLLOW = new Set(FOLLOW_DUE);
// 바꿔 넣는 말 (r = 예약, t = 과업)
const TCFG_VARS = [
  ['단체명', r=>r.org||''], ['담당자', r=>((typeof contactsOf==='function' ? contactsOf(r)[0] : null)||{}).name || String(r.contact||'').split(/\s*\/\s*/)[0].trim()], ['방문일', r=>r.date ? dateLabel(r.date) : '방문일 미정'],
  ['입장시간', r=>r.tin||''], ['인원', r=>r.people ? r.people+'명' : ''], ['영업담당', r=>r.owner||''], ['결제방식', r=>r.pay||''], ['미정항목', r=>r.tbd||''], ['답변일', r=>r.tbdDate ? mdLabel(r.tbdDate) : ''], ['입장문', r=>r.gate||''],
  ['마감', (r,t)=>t ? mdLabel(taskDue(t)) : ''], ['마감기준', (r,t)=>!r.date ? '방문일 미정' : t && t.dueSet ? '직접 정한 날' : t && t.id==='staffbrief' ? staffFriName(r.date) : tbdLimitName(r.date)],
  ['굿즈', r=>goodsText(r)||'없음'], ['빈담당', (r,t)=>((t&&t.missing)||[]).join(' · ')], ['바뀐내용', (r,t)=>(t && t.id==='pplchk' && typeof pplChanges==='function' ? pplChanges(t) : ((t&&t.changes)||[])).join(' · ')],
  ['몽몽마방인원', r=>r.mabangL ? r.mabangL+'명' : '인원 미정'], ['몽몽마방시간', r=>r.mabangTime||'(시간 미입력)'], ['몽몽마방메뉴', ()=>mbMenus().map(m=>m.name).join(' · ')],
  ['결제링크전송', r=>r.linkSent ? dtLabel(r.linkSent) : '(아직 안 보냄)'],
  ['전산비고', r=>erpNote(r)], ['답사비고', r=>tourNote(r)],
  ['사유원금액', r=>{ const m=moneySplit(r); return m ? won(m.saw) : ''; }], ['신라금액', r=>{ const m=moneySplit(r); return m ? won(m.shilla) : ''; }],
  ['이메일', r=>(contactsOf(r).find(c=>c.email)||{}).email||''], ['방문일점', r=>r.date ? r.date.replace(/-/g,'.')+' '+dowTag(r.date) : '']];
// 조건 (모두 맞을 때 생김). [키, 이름, 값(r, ctx), 고르는 값 | 'num']
const TCFG_CONDS = [
  ['booked', '가예약 · 예약확정이면', r=>!quietStage(effStage(r))],
  ['stage',  '단계가', r=>effStage(r), ['가예약','예약확정']],
  ['date',   '방문일이 있으면', r=>!!r.date],
  ['pay',    '결제 방식이', r=>r.pay, PAYS],
  ['tbdMiss','미정 항목 · 아직 안 넣은 칸이 있으면', r=>!!r.tbd || (typeof rec!=='undefined' && r===rec && askMissing().length>0)],
  ['tbd',    '미정 항목이 있으면', r=>!!r.tbd],
  ['mb',     '몽몽마방이 있으면', r=>!!(r.mabangL||r.mabangMenu||r.mabangTime)],
  ['mbTime', '몽몽마방 인원 · 시간이 있으면', r=>!!(r.mabangL||r.mabangTime)],
  ['mbNoMenu','몽몽마방 메뉴를 안 골랐으면', r=>mbNeedsMenu(r)],
  ['sadam',  '사담 식사가 있으면', r=>!!(r.sadam1||r.sadam2||r.sadamD) || viewsParse(r.views).some(v=>/\(관람,\s*사담/.test(v.src))],
  ['prog',   '프로그램이 있으면', r=>PROG_KEYS().some(k=>r[k])],
  ['goods',  '굿즈가 있으면', r=>!!r.goods],
  ['progGoods','프로그램 · 굿즈가 있으면', r=>STAFF_BASES().some(k=>r[k])],
  ['staffMiss','프로그램 · 굿즈 담당이 비었으면', r=>missingStaff(r).length>0],
  ['stu',    '학생이 있으면', r=>!!String(r.istu||'').trim() || viewsParse(r.views).some(v=>/학생/.test(v.src))],
  ['sp',     '특별 할인이 있으면', r=>specialCounts(r).length>0],
  ['clergy', '대구대교구 특별 할인이 있으면', r=>(parseInt(r.dClergy)||0)>0],
  ['tour',   '사전 답사가 있으면', r=>!!r.tour],
  ['wantQuote','견적서 요청을 체크하면', r=>!!r.wantQuote],
  ['wantStmt', '거래명세서 요청을 체크하면', r=>!!r.wantStmt],
  ['erpChanged','전산 등록 뒤 예약 내용이 바뀌면', (r,ctx)=>!!(ctx && ctx.orig && ctx.orig.has('erpfix'))],
  ['pplChanged','저장한 예약의 관람 인원이 바뀌면 (단체 화면 · 다음날 고객 응대 준비 · 이 과업 전용)', (r,ctx)=>!!(ctx && ctx.orig && ctx.orig.has('pplchk'))],
  ['erpKeep','전산 내역을 붙여넣고 「예약 내용 그대로」를 고르면 (이 과업 전용)', (r,ctx)=>!!(ctx && ctx.orig && ctx.orig.has('erpkeep'))],
  ['weekend','주말 · 공휴일 방문이면', r=>!!(r.date && isRedDay(r.date))],
  ['pplMin', '관람 인원이 ○명 이상이면', r=>numOf(r.people), 'num'],
  ['pplMax', '관람 인원이 ○명 이하이면', r=>numOf(r.people), 'num'],
];
const TCFG_DUE = [['made','과업이 생긴 날 ○일 뒤'],['visit','방문일 ○일 전'],['prevThu','방문일 전주 목요일 (지났으면 전날)'],['prevFri','방문 전주 금요일 (지났으면 전날)'],['visitMon','방문 주 월요일'],['tbdDate','미정 항목 답변일'],['linkNext','결제링크 보낸 다음날']];
const TCFG_N_DUE = new Set(['made','visit']);
// ----- 원래 과업의 기본값 (코드 규칙과 같음 · 편집 칸에 미리 채워 둠) -----
const C_ = (k,v) => ({k, v:v||''});
const TCFG_DEF_WHEN = { tour:[C_('tour')], clergy:[C_('clergy')], tbdcall:[C_('tbdMiss')], onsitecall:[C_('pay','현장 결제'),C_('date')], wkcheck:[C_('date')], mbcall:[C_('mbTime')], mbmenu:[C_('mbNoMenu')],
  progstaff:[C_('staffMiss')], staffbrief:[C_('date'),C_('progGoods')], goodsprep:[C_('goods')], erp:[C_('booked')], erpcheck:[C_('booked')], erpfix:[C_('erpChanged')],
  quote:[C_('wantQuote')], stmt:[C_('wantStmt')], tax:[C_('pay','세금계산서')], linksend:[C_('pay','결제링크')], paycheck:[C_('pay','결제링크')], pplchk:[C_('pplChanged')], erpkeep:[C_('erpKeep')] };
const TCFG_DEF_DUE = { tbdcall:{base:'tbdDate'}, onsitecall:{base:'prevThu'}, wkcheck:{base:'prevThu'}, paycheck:{base:'linkNext'}, staffbrief:{base:'prevFri'}, goodsprep:{base:'visit', n:1} };
const tcfgDefDue = id => TCFG_DEF_DUE[id] || {base:'made', n:0};
const TCFG_DEF_NOTE = { erp:'{전산비고}', erpfix:'{전산비고}', tour:'{답사비고}',
  tax:'[세금계산서] {단체명}\n1. 금액\n- 사유원 : {사유원금액}원\n- 신라 : {신라금액}원\n2. 사업자 등록증 : 파일 첨부\n3. 이메일 : {이메일}\n4. 발행일 : {방문일점}\n5. 실제 방문일 : {방문일점}\n감사합니다~' };
// 과업 아래 안내 줄의 원래 틀 (과업 제목 아래에 자동으로 붙는 글). 지금 자동으로 붙는 것은 「전날 확인 변경 → 예약내역&전산 확인」의 바뀐 내용 하나
const TCFG_DEF_DESC = { pplchk:'바뀐 내용: {바뀐내용}' };
// 세부 과업 이름 → 원래 키 (체크 기록이 그대로 이어지게)
const tcfgDocKey = (id, l) => { const b=(TCFG_BASE_DOC[id]||[]).find(x=>x[1]===l); if(b) return b[0]; let h=0; for(const ch of String(l)) h=(h*31+ch.charCodeAt(0))|0; return 'u'+(h>>>0).toString(36); };

let tcfg = {b:{}, c:[]}, tcfgSig='';
function tcfgRead(){ const r=(cache||[]).find(x=>x.id===TCFG_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return {b:j.b&&typeof j.b==='object'?j.b:{}, c:Array.isArray(j.c)?j.c:[], at:j.at||'', by:j.by||''}; }
// 받은 설정을 화면에 반영: 과업 이름(AUTO_TASKS) · 마감이 방문일을 따라가는지(FOLLOW_DUE) · 원래 세부 과업(DOC_SUBS)
function tcfgApply(){ try{ const j=tcfgRead(), sig=JSON.stringify([j.b, j.c]); if(sig===tcfgSig) return false; tcfgSig=sig; tcfg=j; if(typeof simVer!=="undefined") simVer++;
  FOLLOW_DUE.clear(); TCFG_BASE_FOLLOW.forEach(x=>FOLLOW_DUE.add(x));
  Object.keys(TCFG_BASE_DOC).forEach(id=>{ DOC_SUBS[id]=TCFG_BASE_DOC[id].map(x=>[...x]); });
  Object.keys(TCFG_BASE_TITLES).forEach(id=>{ const b=j.b[id]||{}, t=String(b.title||'').trim(); AUTO_TASKS[id] = t || TCFG_BASE_TITLES[id];
    if(b.due && b.due.base && b.due.base!=='orig'){ if(b.due.base==='made') FOLLOW_DUE.delete(id); else FOLLOW_DUE.add(id); }
    if(Array.isArray(b.docSubs) && TCFG_BASE_DOC[id]) DOC_SUBS[id]=b.docSubs.map(l=>[tcfgDocKey(id,l), l]); });
  j.c.forEach(c=>{ if(c && c.id){ AUTO_TASKS[c.id] = String(c.title||'').trim() || '(이름 없는 과업)'; if(c.due && c.due.base!=='made') FOLLOW_DUE.add(c.id); } });
  return true; }catch(_){ return false; } }
const tcfgCustom = id => (tcfg.c||[]).find(c=>c && c.id===id) || null;
const tcfgOf = id => tcfgCustom(id) || (tcfg.b||{})[id] || null;   // 그 과업의 설정 (새 과업 · 원래 과업)
function tcfgCondOk(c, r, ctx){ const conds=Array.isArray(c&&c.conds)?c.conds:[];
  return conds.every(q=>{ const d=TCFG_CONDS.find(x=>x[0]===q.k); if(!d) return true; const v=d[2](r, ctx);
    if(d[3]==='num'){ const n=parseInt(q.v)||0; return q.k==='pplMin' ? v>=n : v<=n && v>0; }
    if(Array.isArray(d[3])) return !q.v || String(v||'')===String(q.v);
    return !!v; }); }
// 원래 과업이 이 예약에 생기는지: 조건을 고쳤으면(when) 그 조건, 아니면 원래 규칙(inOrig) + 예전에 더한 조건(conds)
function tcfgBuiltinOn(id, b, r, inOrig, ctx){
  if(b.off) return false;
  if(Array.isArray(b.when)){ if(!tcfgCondOk({conds:b.when}, r, ctx)) return false;
    if(id==='wkcheck' && !(r.date && (r.date>=ymd(new Date()) || (ctx && ctx.hasWk)))) return false;   // 지난 방문일엔 새로 만들지 않음 (원래 규칙)
    return true; }
  return inOrig && tcfgCondOk(b, r, ctx); }
// syncAutoTasks 에서: 끈 과업 · 조건이 안 맞는 원래 과업은 빼고, 조건이 맞는 과업은 넣음
function tcfgWant(r, want){ const ctx={orig:new Set(want), hasWk: typeof tasks!=='undefined' && r===rec && tasks.some(t=>t.id==='wkcheck')};
  Object.keys(TCFG_BASE_TITLES).forEach(id=>{ const b=(tcfg.b||{})[id]; if(!b) return; const i=want.indexOf(id), on=tcfgBuiltinOn(id, b, r, i>=0, ctx);
    if(on && i<0) want.push(id); if(!on && i>=0) want.splice(i,1); });
  (tcfg.c||[]).forEach(c=>{ if(c && c.id && !c.off && tcfgCondOk(c, r, ctx) && !want.includes(c.id)) want.push(c.id); }); }
// 마감: 고친 마감 (원래대로면 null → 원래 규칙)
function tcfgDue(id, r){ const c=tcfgOf(id); if(!c || !c.due || !c.due.base || c.due.base==='orig') return null; const d=c.due, n=Math.max(0, parseInt(d.n)||0), today=ymd(new Date());
  if(d.base==='made'){ const x=new Date(); x.setDate(x.getDate()+n); return ymd(x); }
  if(d.base==='tbdDate') return r.tbdDate || today;
  if(d.base==='linkNext') return ymd(nextDay(r.linkSent || new Date().toISOString()));
  if(!r.date) return today;
  if(d.base==='prevThu') return tbdLimit(r.date);
  if(d.base==='prevFri') return staffFri(r.date);
  if(d.base==='visitMon'){ const x=new Date(r.date+'T00:00'); x.setDate(x.getDate()-((x.getDay()+6)%7)); const v=ymd(x); return v>=today ? v : today; }
  const x=new Date(r.date+'T00:00'); x.setDate(x.getDate()-n); const v=ymd(x); return v>=today ? v : today; }
// 열지 않은 예약(나의 할일 등): 조건이 맞는 과업은 넣고, 끄거나 조건이 안 맞는 (손대지 않은) 원래 과업은 빼고, 바꾼 마감은 맞춤
function tcfgVirtual(r, x, ts, has){
  const ctx={orig:new Set(ts.map(t=>t.id)), hasWk: ts.some(t=>t.id==='wkcheck')};
  for(let i=ts.length-1;i>=0;i--){ const t=ts[i], b=(tcfg.b||{})[t.id]; if(!b || t.done || t.custom) continue;
    if(!tcfgBuiltinOn(t.id, b, x, true, ctx) && !t.memo && !(t.xsubs||[]).some(s=>s.done)){ ts.splice(i,1); continue; }
    if(!t.dueSet){ const d=tcfgDue(t.id, x); if(d) ts[i]={...t, due:d}; } }
  if(!r.date || r.date<ymd(new Date())) return;
  Object.keys(TCFG_BASE_TITLES).forEach(id=>{ const b=(tcfg.b||{})[id]; if(!b || !Array.isArray(b.when) || has(id) || ts.some(t=>t.id===id) || id==='erpfix') return;
    if(tcfgBuiltinOn(id, b, x, false, ctx) && !quietStage(effStage(x))) ts.push({id, title:AUTO_TASKS[id], done:false, due:tcfgDue(id, x)||autoDue(id, x)}); });
  (tcfg.c||[]).forEach(c=>{ if(!c || !c.id || c.off || has(c.id)) return; if(!tcfgCondOk(c, x, ctx)) return; ts.push({id:c.id, title:AUTO_TASKS[c.id], done:false, due:tcfgDue(c.id, x)||ymd(new Date())}); }); }
// 세부 과업(직접 넣은 것): 안 끝난 과업에 설정의 세부 과업을 넣음 (이름이 같은 것이 이미 있으면 그대로)
function tcfgSubs(list){ (list||[]).forEach(t=>{ if(t.done || t.removed) return; const c=tcfgOf(t.id), subs=(c&&Array.isArray(c.subs)?c.subs:[]).map(s=>String(s||'').trim()).filter(Boolean); if(!subs.length) return;
  const xs=t.xsubs ||= []; subs.forEach((s,i)=>{ if(!xs.some(x=>x.title===s)) xs.push({id:'c:'+i+Date.now().toString(36), title:s, done:false}); }); }); }
const tcfgNoAutoSubs = id => !!((tcfg.b||{})[id]||{}).noAutoSubs;   // 미정 항목 확인 연락: 미정 · 미입력 칸을 세부 과업으로 넣지 않음
const tcfgNoOnsiteSub = () => { const b=tcfg.b||{}; return !!((b.wkcheck||{}).noOnsiteSub || (b.onsitecall||{}).off); };   // 다음주 예약 점검에 「현장 결제 인원 확인 연락」을 넣지 않음 (예전에 그 과업을 꺼 두었으면 끈 채로)
// 바꿔 넣기
function tcfgFill(tpl, r, base, t){ let s=String(tpl||''); s=s.replace(/\{자동문구\}/g, base||''); TCFG_VARS.forEach(([k,f])=>{ if(s.indexOf('{'+k+'}')<0) return; let v=''; try{ v=f(r,t); }catch(_){} s=s.split('{'+k+'}').join(String(v||'')); }); return s.trim(); }
// 과업 문구 (전산 비고 · 세금계산서 요청 등): 고친 틀이 있으면 그 틀(비우면 없음), 없으면 원래 문구
function tcfgNote(t, base){ const c=tcfgOf(t.id), tpl=c&&c.note; if(tpl==null) return base; return tcfgFill(tpl, rec, base, t); }
// 과업 아래 안내 줄 (2026-11-23): 단체 화면 추후 과업에서 과업 제목 아래에 자동으로 붙는 글 (예: 「바뀐 내용: 관람 인원 20 → 25 (단체 화면)」). 틀을 고칠 수 있고, 비우면 없음
//  {바뀐내용} · {빈담당} 을 쓴 틀은 그 값이 하나도 없으면 줄을 안 보임 (바뀐 것이 없는데 「바뀐 내용:」만 보이지 않게)
function tcfgDesc(t){ const c=tcfgOf(t.id), tpl=String(c && c.desc!=null ? c.desc : (TCFG_DEF_DESC[t.id]||'')); if(!tpl.trim()) return '';
  const need=[['바뀐내용', x=>x.id==='pplchk' && typeof pplChanges==='function' ? pplChanges(x) : (x.changes||[])], ['빈담당', x=>x.missing||[]]].filter(([k])=>tpl.indexOf('{'+k+'}')>=0);
  if(need.length && need.every(([,f])=>!f(t).length)) return '';
  return tcfgFill(tpl, rec, '', t); }
function tcfgDescHTML(t){ const s=tcfgDesc(t); return s ? `<div class="tk-chg tchg-line">${esc(s).replace(/\n/g,'<br>')}</div>` : ''; }

// ===== 관리 팝업 =====
// 고치는 대상 T: 'b:과업id' (원래 과업) · 'c:번호' (새 과업). 초안은 모든 칸을 채운 모양 {title, conds, due, subs, note, desc, off, autoSubs}
let tcfgDraft=null, tcfgOpenId='', tcfgLastIn=null;
const tcfgClone = o => JSON.parse(JSON.stringify(o));
// 원래 과업의 지금 값 (저장된 고친 칸 + 나머지는 기본값)
function tcfgEff(id, b){ b=b||{};
  return { title: String(b.title||''), conds: tcfgClone(Array.isArray(b.when) ? b.when : [...(TCFG_DEF_WHEN[id]||[]), ...(b.conds||[])]),
    due: b.due && b.due.base && b.due.base!=='orig' ? {...b.due} : {...tcfgDefDue(id)},
    subs: TCFG_BASE_DOC[id] ? [...(Array.isArray(b.docSubs) ? b.docSubs : TCFG_BASE_DOC[id].map(x=>x[1])), ...(b.subs||[])] : [...(b.subs||[])],
    note: b.note!=null ? b.note : (TCFG_DEF_NOTE[id]||''), desc: b.desc!=null ? b.desc : (TCFG_DEF_DESC[id]||''), off: !!b.off, autoSubs: !b.noAutoSubs, onsiteSub: id==='wkcheck' ? !tcfgNoOnsiteSub() : true }; }
const tcfgCleanConds = cs => (cs||[]).map(q=>({k:q.k, v:String(q.v??'')})).filter(q=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k); return x && (x[3]!=='num' || q.v!==''); });
const tcfgDueNorm = d => { d=d||{}; return TCFG_N_DUE.has(d.base) ? {base:d.base, n:Math.max(0, parseInt(d.n)||0)} : {base:d.base||'made'}; };
const tcfgSubsClean = s => (s||[]).map(x=>String(x||'').trim()).filter(Boolean);
const tcfgEq = (a,b) => JSON.stringify(a)===JSON.stringify(b);
// 저장할 모양: 기본값과 다른 칸만
function tcfgPack(id, e){ const o={};
  const t=String(e.title||'').trim(); if(t && t!==TCFG_BASE_TITLES[id]) o.title=t;
  const conds=tcfgCleanConds(e.conds); if(!tcfgEq(conds, tcfgCleanConds(TCFG_DEF_WHEN[id]||[]))) o.when=conds;
  const due=tcfgDueNorm(e.due); if(!tcfgEq(due, tcfgDueNorm(tcfgDefDue(id)))) o.due=due;
  const subs=tcfgSubsClean(e.subs);
  if(TCFG_BASE_DOC[id]){ if(!tcfgEq(subs, TCFG_BASE_DOC[id].map(x=>x[1]))) o.docSubs=subs; } else if(subs.length) o.subs=subs;
  { const v=String(e.note||'').trim(); if(v!==String(TCFG_DEF_NOTE[id]||'').trim()) o.note=v; }
  { const v=String(e.desc||'').trim(); if(v!==String(TCFG_DEF_DESC[id]||'').trim()) o.desc=v; } if(e.off) o.off=true; if(id==='wkcheck' && !e.autoSubs) o.noAutoSubs=true; if(id==='wkcheck' && !e.onsiteSub) o.noOnsiteSub=true;
  return o; }
function tcfgPackC(c){ const o={id:c.id, title:String(c.title||'').trim(), due:tcfgDueNorm(c.due||{base:'visit',n:3})};
  const conds=tcfgCleanConds(c.conds); if(conds.length) o.conds=conds; const subs=tcfgSubsClean(c.subs); if(subs.length) o.subs=subs;
  ['note','desc'].forEach(f=>{ const v=String(c[f]||'').trim(); if(v) o[f]=v; }); if(c.off) o.off=true; return o; }
function tcfgModal(){ let m=$('#tcfgModal'); if(m) return m;
  m=document.createElement('div'); m.className='modal'; m.id='tcfgModal'; m.hidden=true;
  m.innerHTML=`<section class="panel tcfg-pop" role="dialog" aria-modal="true" aria-labelledby="tcfgTitle">
    <div class="tcfg-head"><h2 id="tcfgTitle">추후과업 메시지 관리</h2><button type="button" class="btn" data-tcfgclose>닫기</button></div>
    <p class="hint" style="margin:0 0 6px">단체예약에 자동으로 생기는 추후 과업의 <b>이름 · 언제 생길지 · 마감 · 세부 과업 · 과업 문구 · 과업 아래 안내 줄</b>을 모두 고칠 수 있습니다. 원래 있는 과업도 지금 규칙이 칸에 채워져 있습니다. 저장하면 모든 직원에게 같게 적용됩니다.</p>
    <div class="tcfg-vars"><span class="hint">바꿔 넣는 말 (누르면 글 칸에 들어감):</span> <span id="tcfgVars"></span></div>
    <div id="tcfgBody" class="tcfg-body"></div>
    <div class="row-btns" style="margin-top:10px"><button type="button" class="btn" data-tcfgadd>＋ 새 과업 추가</button><small class="hint" id="tcfgMsg" style="margin:0 0 0 auto"></small><button type="button" class="btn" data-tcfgclose>취소</button><button type="button" class="btn primary" data-tcfgsave>저장</button></div>
  </section>`;
  document.body.appendChild(m);
  m.addEventListener('mousedown', e=>{ if(e.target===m) tcfgClose(); });
  m.addEventListener('focusin', e=>{ if(e.target.matches?.('textarea.tcfg-in, input.tcfg-in[data-tf]')) tcfgLastIn=e.target; });
  return m; }
function tcfgOpen(){ tcfgApply();
  tcfgDraft={ b:Object.fromEntries(Object.keys(TCFG_BASE_TITLES).map(id=>[id, tcfgEff(id, (tcfg.b||{})[id])])),
    c:tcfgClone(tcfg.c||[]).map(c=>({...c, conds:c.conds||[], subs:c.subs||[], due:c.due||{base:'visit',n:3}, note:c.note||'', desc:c.desc||''})) };
  tcfgOpenId=''; tcfgLastIn=null; const m=tcfgModal();
  $('#tcfgVars').innerHTML = TCFG_VARS.map(v=>`<code data-tvar="${esc(v[0])}" title="눌러서 넣기">{${esc(v[0])}}</code>`).join(' ');
  const j=tcfgRead(); $('#tcfgMsg').textContent = j.at ? `마지막 저장 ${fmt(j.at)}${j.by?' · '+j.by:''}` : '';
  tcfgPaint(); m.hidden=false; }
function tcfgClose(){ const m=$('#tcfgModal'); if(m) m.hidden=true; tcfgDraft=null; }
function tcfgTarget(T){ const d=tcfgDraft; if(!d) return null; return T.startsWith('b:') ? d.b[T.slice(2)]||null : d.c[+T.slice(2)]||null; }
const tcfgTA = (attr, v, ph, rows) => `<textarea class="tcfg-in" ${attr} data-ime="ko" rows="${rows||3}" placeholder="${esc(ph||'')}">${esc(v||'')}</textarea>`;
const tcfgCondTxt = conds => (conds||[]).map(q=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k); if(!x) return ''; return x[3]==='num' ? x[1].replace('○', q.v||'?') : Array.isArray(x[3]) ? `${x[1]} ${q.v||'?'}` : x[1]; }).filter(Boolean).join(' · ');
const tcfgDueTxt = due => { const x=TCFG_DUE.find(y=>y[0]===(due&&due.base)); if(!x) return ''; if(due.base==='made' && !(+due.n)) return '과업이 생긴 날'; return x[1].replace('○', (due.n??0)); };
// 펼친 칸 (원래 과업 · 새 과업 같은 모양)
function tcfgEdHTML(T, c, builtin, id){
  const conds=c.conds||[], due=c.due||{base:'visit', n:3}, subs=c.subs||[];
  const condRow=(q,j)=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k)||TCFG_CONDS[0];
    return `<div class="tcfg-cond"><select data-tcc="${T}|${j}|k">${TCFG_CONDS.map(y=>`<option value="${y[0]}"${y[0]===x[0]?' selected':''}>${esc(y[1])}</option>`).join('')}</select>`
      + (x[3]==='num' ? `<input data-tcc="${T}|${j}|v" inputmode="numeric" data-ime="num" value="${esc(q.v||'')}" placeholder="명" style="width:64px">` : Array.isArray(x[3]) ? `<select data-tcc="${T}|${j}|v">${x[3].map(o=>`<option${o===q.v?' selected':''}>${esc(o)}</option>`).join('')}</select>` : '')
      + `<button type="button" class="del" data-tccdel="${T}|${j}" title="이 조건 빼기">×</button></div>`; };
  const fixedNote = builtin && ['erp','erpfix','tour','tax'].includes(id);
  return `<div class="tcfg-ed">
    <label>과업 이름 <input class="tcfg-in" data-tf="${T}|title" data-ime="ko" value="${esc(c.title||'')}" placeholder="${esc(builtin ? TCFG_BASE_TITLES[id] : '과업 이름')}"></label>
    <div class="tcfg-lab">언제 생길지 <small class="hint">(조건이 모두 맞을 때 생김 · 조건이 없으면 가예약 · 예약확정인 모든 예약)</small></div>
    <div class="tcfg-conds">${conds.map(condRow).join('') || `<span class="hint">모든 예약</span>`}<button type="button" class="btn sm" data-tccadd="${T}">＋ 조건</button></div>
    <div class="tcfg-lab">마감</div>
    <div class="tcfg-due"><select data-tf="${T}|dueBase">${TCFG_DUE.map(([k,l])=>`<option value="${k}"${k===due.base?' selected':''}>${esc(l)}</option>`).join('')}</select>${TCFG_N_DUE.has(due.base)?`<input data-tf="${T}|dueN" inputmode="numeric" data-ime="num" value="${esc(due.n??0)}" style="width:56px"> 일`:''}</div>
    <div class="tcfg-lab">세부 과업 <small class="hint">(과업에 체크 칸으로 들어감 · 모두 체크하면 그 과업 완료)</small></div>
    <div class="tcfg-subs">${subs.map((s,i)=>`<span class="tcfg-sub"><input class="tcfg-in" data-tsub="${T}|${i}" data-ime="ko" value="${esc(s)}"><button type="button" class="del" data-tsubdel="${T}|${i}" title="이 세부 과업 빼기">×</button></span>`).join('')}<span class="tcfg-sub"><input class="tcfg-in" data-tsubnew="${T}" data-ime="ko" placeholder="＋ 세부 과업 (적고 Enter)"></span></div>
    ${builtin && id==='wkcheck' ? `<div class="tcfg-lab">자동으로 넣는 세부 과업 <small class="hint">(예약 내용에 따라 저절로 들어감 · 체크를 빼면 넣지 않음)</small></div>
    <div class="tcfg-auto">
      <label class="chk"><input type="checkbox" data-tf="${T}|onsiteSub"${c.onsiteSub?' checked':''}> <b>${esc(ONSITE_SUB)}</b> <small class="hint">— 결제 방법이 현장 결제일 때 · 고객님께 최종 인원을 확인하고 당일 인원 변경이 어렵다는 점을 안내</small></label>
      <label class="chk"><input type="checkbox" data-tf="${T}|autoSubs"${c.autoSubs?' checked':''}> <b>미정 항목에 대한 내용</b> <small class="hint">— 미정 항목 · 아직 안 넣은 칸을 하나씩 (예: 「미정 · 결제 방법」 「미입력 · 입장 시간」)</small></label>
    </div>` : ''}
    <div class="tcfg-two">
      <label>과업 문구 <small class="hint">(「문구 복사」 버튼으로 복사 · 비우면 없음${fixedNote ? ' · {전산비고} 등은 예약 내용으로 자동' : ''})</small>${tcfgTA(`data-tf="${T}|note"`, c.note, '')}</label>
      <label>과업 아래 안내 줄 <small class="hint">(과업 제목 아래에 자동으로 붙는 글 · 예: 바뀐 내용 · 비우면 없음)</small>${tcfgTA(`data-tf="${T}|desc"`, c.desc, '')}</label>
    </div>
    <div class="tcfg-ebtm"><label class="chk"><input type="checkbox" data-tf="${T}|off"${c.off?' checked':''}> ${builtin?'이 과업을 자동으로 만들지 않음':'잠시 끄기'}</label><span class="sp"></span>${builtin ? `<button type="button" class="btn" data-tcreset="${T}">원래대로 되돌리기</button>` : `<button type="button" class="btn" data-tcdel="${T}">이 과업 삭제</button>`}</div></div>`; }
function tcfgPaint(){ const d=tcfgDraft; if(!d) return; const body=$('#tcfgBody'), st=body.scrollTop;
  const head=(T, name, sub, tags, open, off)=>`<div class="tcfg-row${off?' off':''}" data-tcfgopen="${esc(T)}"><b>${esc(name)}</b><small class="hint">${esc(sub)}</small>${tags}<span class="tcfg-arrow">${open?'▴':'▾'}</span></div>`;
  const built = Object.keys(TCFG_BASE_TITLES).map(id=>{ const T='b:'+id, e=d.b[id], open=tcfgOpenId===T, changed=Object.keys(tcfgPack(id, e)).length>0;
    const sub=[tcfgCondTxt(e.conds)||'모든 예약', '마감 '+tcfgDueTxt(e.due)].join(' · ');
    const tags=(e.off?'<span class="tag">끔</span>':'')+(changed?'<span class="tag">고침</span>':'')+(tcfgSubsClean(e.subs).length?`<span class="tag">세부 ${tcfgSubsClean(e.subs).length}</span>`:'')
      +(id==='wkcheck' && (e.onsiteSub||e.autoSubs) ? `<span class="tag" title="${esc([e.onsiteSub&&ONSITE_SUB, e.autoSubs&&'미정 항목에 대한 내용'].filter(Boolean).join(' · '))}">자동 세부 ${(e.onsiteSub?1:0)+(e.autoSubs?1:0)}</span>` : '');   // 다음주 예약 점검: 현장 결제 인원 확인 연락 · 미정 항목 (2026-11-23)
    return `<li class="${open?'open':''}">${head(T, String(e.title||'').trim()||TCFG_BASE_TITLES[id], sub, tags, open, e.off)}${open?tcfgEdHTML(T, e, true, id):''}</li>`; }).join('');
  const custom = (d.c||[]).map((c,i)=>{ const T='c:'+i, open=tcfgOpenId===T;
    const sub=`${tcfgCondTxt(c.conds)||'모든 예약 (가예약 · 예약확정)'} · 마감 ${tcfgDueTxt(c.due||{base:'visit',n:3})}`;
    const tags='<span class="tag">새 과업</span>'+(c.off?'<span class="tag">끔</span>':'')+(tcfgSubsClean(c.subs).length?`<span class="tag">세부 ${tcfgSubsClean(c.subs).length}</span>`:'');
    return `<li class="${open?'open':''}">${head(T, String(c.title||'').trim()||'(이름 없는 과업)', sub, tags, open, c.off)}${open?tcfgEdHTML(T, c, false):''}</li>`; }).join('');
  body.innerHTML = `<div class="tcfg-sec">원래 있는 과업 <small class="hint">눌러서 고치기 · 「고침」 = 원래 규칙과 다름</small></div><ul class="tcfg-list">${built}</ul>`
    + `<div class="tcfg-sec">새 과업 <small class="hint">${(d.c||[]).length}개</small></div>` + ((d.c||[]).length ? `<ul class="tcfg-list">${custom}</ul>` : '<p class="hint" style="margin:4px 0">아직 없습니다. 아래 「＋ 새 과업 추가」를 누르세요.</p>');
  body.scrollTop=st; }
// 칸 값 → 초안. 돌려주는 값이 true 면 다시 그림
function tcfgSet(el){ if(!tcfgDraft) return false;
  if(el.dataset.tf){ const [T,f]=el.dataset.tf.split('|'), c=tcfgTarget(T); if(!c) return false;
    if(f==='off' || f==='autoSubs' || f==='onsiteSub'){ c[f]=el.checked; return true; }
    if(f==='dueBase'){ c.due={...(c.due||{}), base:el.value}; if(c.due.n==null) c.due.n=TCFG_N_DUE.has(el.value) ? (el.value==='made'?0:3) : 0; return true; }
    if(f==='dueN'){ c.due={...(c.due||{}), n:parseInt(el.value.replace(/\D/g,''))||0}; return false; }
    c[f]=el.value; return false; }
  if(el.dataset.tcc){ const [T,j,f]=el.dataset.tcc.split('|'), q=((tcfgTarget(T)||{}).conds||[])[+j]; if(!q) return false;
    if(f==='k'){ q.k=el.value; const x=TCFG_CONDS.find(y=>y[0]===q.k); q.v = Array.isArray(x&&x[3]) ? x[3][0] : ''; return true; }
    q.v = el.inputMode==='numeric' ? el.value.replace(/\D/g,'') : el.value; return false; }
  if(el.dataset.tsub){ const [T,i]=el.dataset.tsub.split('|'), c=tcfgTarget(T); if(c && c.subs) c.subs[+i]=el.value; return false; }
  return false; }
function tcfgSubAdd(el){ const T=el.dataset.tsubnew, v=el.value.trim(); if(!v) return; const c=tcfgTarget(T); if(!c) return; (c.subs ||= []).push(v); el.value=''; tcfgPaint(); setTimeout(()=>document.querySelector(`#tcfgModal [data-tsubnew="${T}"]`)?.focus(),0); }
document.addEventListener('input', e=>{ if(!e.target.closest?.('#tcfgModal')) return; if(e.target.tagName!=='SELECT' && e.target.type!=='checkbox') tcfgSet(e.target); });
document.addEventListener('change', e=>{ if(!e.target.closest?.('#tcfgModal')) return; if(tcfgSet(e.target)) tcfgPaint(); });
document.addEventListener('keydown', e=>{ const el=e.target; if(!el.dataset || el.dataset.tsubnew==null || e.key!=='Enter' || e.isComposing) return; e.preventDefault(); tcfgSubAdd(el); });
// 「＋ 세부 과업」에 적고 Enter 를 안 누른 채 저장해도 들어가게 (저장 때 모음)
const tcfgPendSubs = () => document.querySelectorAll('#tcfgModal [data-tsubnew]').forEach(el=>{ const v=el.value.trim(); if(!v) return; const c=tcfgTarget(el.dataset.tsubnew); if(!c) return; (c.subs ||= []).push(v); el.value=''; });
document.addEventListener('mousedown', e=>{ if(e.target.closest?.('#tcfgModal [data-tvar]')) e.preventDefault(); });   // 바꿔 넣는 말을 눌러도 글 칸 커서가 그대로
document.addEventListener('click', async e=>{
  if(e.target.closest?.('#tcfgBtn')){ tcfgOpen(); return; }
  if(!e.target.closest?.('#tcfgModal') || !tcfgDraft) return; const d=tcfgDraft;
  const tv=e.target.closest('[data-tvar]'); if(tv){ const el=tcfgLastIn; if(!el || !document.body.contains(el)){ toast('먼저 넣을 글 칸(과업 문구 · 과업 아래 안내 줄)을 누르세요.'); return; }
    const s='{'+tv.dataset.tvar+'}', a=el.selectionStart??el.value.length, b=el.selectionEnd??a; el.value=el.value.slice(0,a)+s+el.value.slice(b); el.focus(); el.selectionStart=el.selectionEnd=a+s.length; tcfgSet(el); return; }
  if(e.target.closest('[data-tcfgclose]')){ tcfgClose(); return; }
  const o=e.target.closest('[data-tcfgopen]'); if(o){ tcfgPendSubs(); tcfgOpenId = tcfgOpenId===o.dataset.tcfgopen ? '' : o.dataset.tcfgopen; tcfgPaint(); return; }
  if(e.target.closest('[data-tcfgadd]')){ tcfgPendSubs(); const id='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); d.c.push({id, title:'', conds:[], due:{base:'visit', n:3}, subs:[], note:'', desc:''}); tcfgOpenId='c:'+(d.c.length-1); tcfgPaint(); setTimeout(()=>{ const t=document.querySelector(`#tcfgModal [data-tf="c:${d.c.length-1}|title"]`); t?.scrollIntoView({block:'center'}); t?.focus(); },0); return; }
  const ca=e.target.closest('[data-tccadd]'); if(ca){ tcfgPendSubs(); const c=tcfgTarget(ca.dataset.tccadd); if(c){ (c.conds ||= []).push({k:'mb', v:''}); tcfgPaint(); } return; }
  const cd=e.target.closest('[data-tccdel]'); if(cd){ const [T,j]=cd.dataset.tccdel.split('|'), c=tcfgTarget(T); if(c && c.conds) c.conds.splice(+j,1); tcfgPaint(); return; }
  const sd=e.target.closest('[data-tsubdel]'); if(sd){ const [T,i]=sd.dataset.tsubdel.split('|'), c=tcfgTarget(T); if(c && c.subs) c.subs.splice(+i,1); tcfgPaint(); return; }
  const rs=e.target.closest('[data-tcreset]'); if(rs){ const id=rs.dataset.tcreset.slice(2); askDelete(`「${TCFG_BASE_TITLES[id]}」 과업을 원래 규칙(이름 · 조건 · 마감 · 세부 과업 · 문구)으로 되돌릴까요? 저장해야 적용됩니다.`, ()=>{ d.b[id]=tcfgEff(id, {}); tcfgPaint(); }); return; }
  const dl=e.target.closest('[data-tcdel]'); if(dl){ const i=+dl.dataset.tcdel.slice(2), c=d.c[i]; askDelete(`「${String(c.title||'').trim()||'(이름 없는 과업)'}」 새 과업을 삭제할까요? (이미 예약에 생긴 과업은 그대로 남습니다)`, ()=>{ d.c.splice(i,1); tcfgOpenId=''; tcfgPaint(); }); return; }
  if(e.target.closest('[data-tcfgsave]')){
    tcfgPendSubs();
    const bad=d.c.findIndex(c=>!String(c.title||'').trim()); if(bad>=0){ toast('새 과업의 이름을 적어 주세요.'); tcfgOpenId='c:'+bad; tcfgPaint(); return; }
    const B={}; Object.keys(d.b).forEach(id=>{ const o=tcfgPack(id, d.b[id]); if(Object.keys(o).length) B[id]=o; });
    const C=d.c.map(tcfgPackC);
    const btn=e.target.closest('[data-tcfgsave]'); btn.disabled=true;
    try{ const old=(cache||[]).find(x=>x.id===TCFG_ID), now=new Date().toISOString(), me=savedOwner()||'';
      const item={...(old||{}), id:TCFG_ID, callType:TCFG_TYPE, saved:(old&&old.saved)||now, takenBy:me, summary:`추후과업 설정 · 고친 과업 ${Object.keys(B).length}개 · 새 과업 ${C.length}개`, history:JSON.stringify({b:B, c:C, at:now, by:me})};
      await store.put(item); const i=cache.findIndex(x=>x.id===TCFG_ID); if(i>=0) cache[i]=item; else cache.push(item);
      tcfgSig=''; tcfgApply(); tcfgClose(); if(typeof renderTasks==='function'){ try{ syncAutoTasks(); }catch(_){} renderTasks(); } if(typeof renderSide==='function') renderSide();
      toast('추후과업 설정을 저장했습니다. 모든 직원에게 같게 적용됩니다.'); }
    catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); }
    finally{ btn.disabled=false; } }
});
document.addEventListener('keydown', e=>{ if(e.key!=='Escape' || !$('#tcfgModal') || $('#tcfgModal').hidden) return; if(!document.getElementById('askModal')?.hidden) return; e.preventDefault(); e.stopImmediatePropagation(); tcfgClose(); }, true);   // 확인 팝업이 떠 있으면 그것부터 닫힘
tcfgApply();
