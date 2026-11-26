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
  ['메모고친사람', (r,t)=>(t && t.memoBy)||''],   // 통화 메모 확인: 통화 메모를 고치거나 메모를 남긴 사람 (2026-11-24)
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
  ['memoNew','다른 사람이 통화 메모를 고치거나 메모를 남기면 (안 읽은 메모가 있으면)', ()=>typeof memoNew==='function' && memoNew().length>0],   // 통화 메모 확인 (2026-11-24)
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
  prep:[C_('progGoods')],   // 단체 준비 (담당자마다 · 2026-11-24)
  memocheck:[C_('memoNew')],   // 통화 메모 확인 (2026-11-24)
  quote:[C_('wantQuote')], stmt:[C_('wantStmt')], tax:[C_('pay','세금계산서')], linksend:[C_('pay','결제링크')], paycheck:[C_('pay','결제링크')], pplchk:[C_('pplChanged')], erpkeep:[C_('erpKeep')] };
const TCFG_DEF_DUE = { tbdcall:{base:'tbdDate'}, onsitecall:{base:'prevThu'}, wkcheck:{base:'prevThu'}, paycheck:{base:'linkNext'}, staffbrief:{base:'prevFri'}, goodsprep:{base:'visit', n:1}, prep:{base:'visit', n:1} };
const tcfgDefDue = id => TCFG_DEF_DUE[id] || {base:'made', n:0};
const TCFG_DEF_NOTE = { erp:'{전산비고}', erpfix:'{전산비고}', tour:'{답사비고}',
  tax:'[세금계산서] {단체명}\n1. 금액\n- 사유원 : {사유원금액}원\n- 신라 : {신라금액}원\n2. 사업자 등록증 : 파일 첨부\n3. 이메일 : {이메일}\n4. 발행일 : {방문일점}\n5. 실제 방문일 : {방문일점}\n감사합니다~' };
// 과업 아래 안내 줄의 원래 틀 (과업 제목 아래에 자동으로 붙는 글). 지금 자동으로 붙는 것은 「전날 확인 변경 → 예약내역&전산 확인」의 바뀐 내용 하나
const TCFG_DEF_DESC = { pplchk:'바뀐 내용: {바뀐내용}' };   // memocheck 안내 줄 「고친 사람: ○○」은 없앰 (2026-11-24 · 과업 안 메모 목록에 이름이 나옴)
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
const tcfgOf = id => (/^prep:/.test(String(id)) ? (tcfg.b||{}).prep : null) || tcfgCustom(id) || (tcfg.b||{})[id] || null;   // 단체 준비(prep:이름)는 모두 「단체 준비」(prep) 설정을 따름 (2026-11-24)   // 그 과업의 설정 (새 과업 · 원래 과업)
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
  Object.keys(TCFG_BASE_TITLES).forEach(id=>{ if(id==='prep') return; const b=(tcfg.b||{})[id]; if(!b) return; const i=want.indexOf(id), on=tcfgBuiltinOn(id, b, r, i>=0, ctx);   // 단체 준비는 담당자마다 따로 만듦 (09-tasks.js)
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
// 다시 켠 과업 (2026-11-25): 추후과업 메시지 관리에서 껐다가 다시 켜면 그날(onAt)을 적어 둠 → 안 끝난 과업의 마감이 그날보다 이르면 그날로 (끈 동안 지나간 마감이 「기간이 지난 과업」으로 뜨지 않게)
const tcfgOnDue = t => { if(!t || t.done) return ''; const on=String((tcfgOf(t.id)||{}).onAt||''); if(!on) return ''; const d = typeof taskDue==='function' ? taskDue(t) : String(t.due||''); return d && d<on ? on : ''; };
function tcfgOnFix(list){ (list||[]).forEach(t=>{ const d=tcfgOnDue(t); if(d) t.due=d; }); }
// 열지 않은 예약(나의 할일 등): 조건이 맞는 과업은 넣고, 끄거나 조건이 안 맞는 (손대지 않은) 원래 과업은 빼고, 바꾼 마감은 맞춤
function tcfgVirtual(r, x, ts, has){
  const ctx={orig:new Set(ts.map(t=>t.id)), hasWk: ts.some(t=>t.id==='wkcheck')};
  for(let i=ts.length-1;i>=0;i--){ const t=ts[i], b=(tcfg.b||{})[t.id]; if(!b || t.done || t.custom) continue;
    if(!tcfgBuiltinOn(t.id, b, x, true, ctx) && !t.memo && !(t.xsubs||[]).some(s=>s.done)){ ts.splice(i,1); continue; }
    if(!t.dueSet){ const d=tcfgDue(t.id, x); if(d) ts[i]={...t, due:d}; } }
  ts.forEach((t,i)=>{ const d=tcfgOnDue(t); if(d) ts[i]={...t, due:d}; });   // 다시 켠 과업: 끈 동안 지난 마감 → 다시 켠 날 (2026-11-25)
  if(!r.date || r.date<ymd(new Date())) return;
  Object.keys(TCFG_BASE_TITLES).forEach(id=>{ const b=(tcfg.b||{})[id]; if(!b || !Array.isArray(b.when) || has(id) || ts.some(t=>t.id===id) || id==='erpfix' || id==='prep') return;
    if(tcfgBuiltinOn(id, b, x, false, ctx) && !quietStage(effStage(x))) ts.push({id, title:AUTO_TASKS[id], done:false, due:tcfgDue(id, x)||autoDue(id, x)}); });
  (tcfg.c||[]).forEach(c=>{ if(!c || !c.id || c.off || has(c.id)) return; if(!tcfgCondOk(c, x, ctx)) return; ts.push({id:c.id, title:AUTO_TASKS[c.id], done:false, due:tcfgDue(c.id, x)||ymd(new Date())}); }); }
// 세부 과업(직접 넣은 것): 안 끝난 과업에 설정의 세부 과업을 넣음 (이름이 같은 것이 이미 있으면 그대로)
function tcfgSubs(list){ (list||[]).forEach(t=>{ if(t.done || t.removed) return; const c=tcfgOf(t.id), subs=(c&&Array.isArray(c.subs)?c.subs:[]).map(s=>String(s||'').trim()).filter(Boolean); if(!subs.length) return;
  const xs=t.xsubs ||= []; subs.forEach((s,i)=>{ if(!xs.some(x=>x.title===s)) xs.push({id:'c:'+i+Date.now().toString(36), title:s, done:false}); }); }); }
// 담당 (2026-11-25): 추후과업 메시지 관리에서 과업마다 정한 담당 → 그 과업(t.who)에. 담당을 비우면 다시 영업 담당 (설정으로 넣은 것만 뺌 · 단체 준비는 그대로). 끝낸 과업은 그대로
function tcfgWhoApply(list){ (list||[]).forEach(t=>{ if(!t || t.done || /^prep:/.test(String(t.id))) return; const c=tcfgOf(t.id), w=String((c&&c.who)||'').trim();
  if(w){ t.who=w; t.whoCfg=1; } else if(t.whoCfg){ delete t.who; delete t.whoCfg; } }); }
// 담당으로 정해진 사람들 — 이 사람은 영업 담당이 아닌 예약도 훑어 자기 과업을 찾음 (mayStaff)
const tcfgWhoSet = () => new Set([...Object.values(tcfg.b||{}).map(b=>b && b.who), ...(tcfg.c||[]).map(c=>c && c.who)].map(w=>String(w||'').trim()).filter(Boolean));
const tcfgNoAutoSubs = id => !!((tcfg.b||{})[id]||{}).noAutoSubs;   // 미정 항목 확인 연락: 미정 · 미입력 칸을 세부 과업으로 넣지 않음
const tcfgNoOnsiteSub = () => { const b=tcfg.b||{}; return !!((b.wkcheck||{}).noOnsiteSub || (b.onsitecall||{}).off); };   // 다음주 예약 점검에 「현장 결제 인원 확인 연락」을 넣지 않음 (예전에 그 과업을 꺼 두었으면 끈 채로)
// 바꿔 넣기
function tcfgFill(tpl, r, base, t){ let s=String(tpl||''); s=s.replace(/\{자동문구\}/g, base||''); TCFG_VARS.forEach(([k,f])=>{ if(s.indexOf('{'+k+'}')<0) return; let v=''; try{ v=f(r,t); }catch(_){} s=s.split('{'+k+'}').join(String(v||'')); }); return s.trim(); }
// 과업 문구 (전산 비고 · 세금계산서 요청 등): 고친 틀이 있으면 그 틀(비우면 없음), 없으면 원래 문구
function tcfgNote(t, base){ const c=tcfgOf(t.id), tpl=c&&c.note; if(tpl==null) return base; return tcfgFill(tpl, rec, base, t); }
// 과업 아래 안내 줄 (2026-11-23): 단체 화면 추후 과업에서 과업 제목 아래에 자동으로 붙는 글 (예: 「바뀐 내용: 관람 인원 20 → 25 (단체 화면)」). 틀을 고칠 수 있고, 비우면 없음
//  {바뀐내용} · {빈담당} 을 쓴 틀은 그 값이 하나도 없으면 줄을 안 보임 (바뀐 것이 없는데 「바뀐 내용:」만 보이지 않게)
function tcfgDesc(t){ const c=tcfgOf(t.id), tpl=String(c && c.desc!=null ? c.desc : (TCFG_DEF_DESC[t.id]||'')); if(!tpl.trim()) return '';
  const need=[['바뀐내용', x=>x.id==='pplchk' && typeof pplChanges==='function' ? pplChanges(x) : (x.changes||[])], ['빈담당', x=>x.missing||[]], ['메모고친사람', x=>x.memoBy ? [x.memoBy] : []]].filter(([k])=>tpl.indexOf('{'+k+'}')>=0);
  if(need.length && need.every(([,f])=>!f(t).length)) return '';
  return tcfgFill(tpl, rec, '', t); }
function tcfgDescHTML(t){ const s=tcfgDesc(t); return s ? `<div class="tk-chg tchg-line">${esc(s).replace(/\n/g,'<br>')}</div>` : ''; }

// ===== 관리 팝업 (2026-11-25 다시: 나의 할일처럼 — 왼쪽 과업 목록 · 오른쪽 그 과업의 모든 칸 / 「한눈에 보기」 표) =====
// 고치는 대상 T: 'b:과업id' (원래 과업) · 'c:번호' (새 과업). 초안은 모든 칸을 채운 모양 {title, conds, due, subs, note, desc, off, who, autoSubs}
let tcfgDraft=null, tcfgOpenId='', tcfgLastIn=null, tcfgView='edit', tcfgQ='';
const tcfgClone = o => JSON.parse(JSON.stringify(o));
// 원래 과업의 지금 값 (저장된 고친 칸 + 나머지는 기본값)
function tcfgEff(id, b){ b=b||{};
  return { title: String(b.title||''), conds: tcfgClone(Array.isArray(b.when) ? b.when : [...(TCFG_DEF_WHEN[id]||[]), ...(b.conds||[])]),
    due: b.due && b.due.base && b.due.base!=='orig' ? {...b.due} : {...tcfgDefDue(id)},
    subs: TCFG_BASE_DOC[id] ? [...(Array.isArray(b.docSubs) ? b.docSubs : TCFG_BASE_DOC[id].map(x=>x[1])), ...(b.subs||[])] : [...(b.subs||[])],
    note: b.note!=null ? b.note : (TCFG_DEF_NOTE[id]||''), desc: b.desc!=null ? b.desc : (TCFG_DEF_DESC[id]||''), off: !!b.off, who: String(b.who||''), autoSubs: !b.noAutoSubs, onsiteSub: id==='wkcheck' ? !tcfgNoOnsiteSub() : true, autoDone: !b.noAutoDone }; }   // autoDone: 예약내역&전산 확인 — 전산 내역이 이미 같으면 저절로 완료 (2026-11-24) · who: 담당 (2026-11-25 · 비우면 영업 담당)
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
  { const v=String(e.desc||'').trim(); if(v!==String(TCFG_DEF_DESC[id]||'').trim()) o.desc=v; } if(e.off) o.off=true; if(id==='wkcheck' && !e.autoSubs) o.noAutoSubs=true; if(id==='wkcheck' && !e.onsiteSub) o.noOnsiteSub=true; if(id==='pplchk' && !e.autoDone) o.noAutoDone=true;
  { const w=String(e.who||'').trim(); if(w && !TCFG_WHO_FIXED[id]) o.who=w; }
  return o; }
function tcfgPackC(c){ const o={id:c.id, title:String(c.title||'').trim(), due:tcfgDueNorm(c.due||{base:'visit',n:3})};
  const conds=tcfgCleanConds(c.conds); if(conds.length) o.conds=conds; const subs=tcfgSubsClean(c.subs); if(subs.length) o.subs=subs;
  ['note','desc'].forEach(f=>{ const v=String(c[f]||'').trim(); if(v) o[f]=v; }); if(c.off) o.off=true; { const w=String(c.who||'').trim(); if(w) o.who=w; } return o; }
// 담당 (2026-11-25): 비우면 그 예약의 영업 담당 · 멤버를 고르면 그 사람에게 (나의 할일 · 알림 · 첫 화면 모두) · 단체 준비는 예약 내역의 담당자마다라 못 바꿈
const TCFG_WHO_FIXED = { prep:'각 프로그램 · 굿즈 담당자 (예약 내역의 담당 칸 · 사람마다 하나)' };
const tcfgWhoTxt = (id, c) => TCFG_WHO_FIXED[id] ? '프로그램 · 굿즈 담당자마다' : (String((c||{}).who||'').trim() || '영업 담당');
// ===== 자동 체크 조건 (2026-11-26 · 화면에 보여 주기만) =====
// 과업마다: done = 과업 자체가 저절로 끝난 것으로 체크되는 때 · hand = 직접 체크할 때 · back = 다시 열리는 때 · subs = 세부 과업이 저절로 체크되는 때 (원래 키 → 글) · short = 한눈에 보기 표에 쓰는 짧은 글
// 조건은 설정 값이 아니라 코드에 과업마다 정해져 있음 (예약내역&전산 확인의 켜고 끄기 하나만 설정) — 그 규칙을 바꾸면 이 글도 같이:
//   js/group/09-tasks.js syncAutoTasks(전산 예약 · 전산 내역 대조 · 전산 예약 수정 · 담당 입력 · 메뉴 선택 · 결제링크 · 입금 확인 · 예약내역&전산 확인 · 통화 메모 확인 · 세부 과업을 모두 체크하면 완료) · takeDocs(견적서 · 거래명세서 「생성」)
//   js/group/11-erp-paste.js applyErpList(전산 내역을 붙여 넣으면 완료) · js/group/13-start-my.js settleTasks(열지 않은 예약) · js/group/12-quote-stage-list.js pplTask(다시 열림)
const TCFG_AUTO = {
  erp: { short:'전산 내역을 붙여 넣으면', done:['과업을 체크하면 전산 내역 붙여넣기 창이 열리고, 전산 내역을 붙여 넣으면 완료 (전산 등록일이 기록됨)', '관리자 사이트에서 가져온 예약은 이미 전산에 있는 예약이라 처음부터 완료'],
    hand:'체크만으로는 끝나지 않음 — 전산 내역을 붙여 넣어야 함 (나의 할일 · 알림에서는 「열기」만)', back:'과업 체크를 풀면 전산 등록 기록이 지워지고 다시 열림' },
  erpcheck: { short:'전산 내역의 할인 합계 · 총 금액이 예약과 같으면', done:['전산 내역을 붙여 넣었을 때 예약 내용과 「할인 합계」 · 「총 금액」이 둘 다 같으면 완료'],
    hand:'직접 체크할 수 없음 — 체크 칸을 누르면 전산 내역 붙여넣기 창이 열림', back:'예약을 고치거나 전산 내역을 다시 붙여 넣어 금액이 달라지면 다시 열림' },
  erpfix: { short:'예약 내용이 전산에 올린 때와 같아지면 · 전산 내역을 다시 붙여 넣으면', done:['예약 내용을 되돌려 전산에 올린 때와 다시 같아지면 완료 (세부 과업이 없을 때)', '예약 내역(품목 · 인원 · 할인)이 바뀐 경우: 과업을 체크하면 전산 내역 붙여넣기 창이 열리고, 붙여 넣으면 완료'],
    hand:'예약 내역이 아닌 것(날짜 · 시간 등)만 바뀐 경우는 직접 체크하면 완료', back:'완료한 뒤 예약 내용이 또 바뀌면 다시 열림 (마감 = 그날)' },
  progstaff: { short:'담당 칸을 모두 채우면', done:['프로그램 · 굿즈 옆 「담당」 칸을 모두 채우면 완료'], hand:'직접 체크할 수 없음 — 담당 칸을 채워야 끝남', back:'담당이 빈 칸이 새로 생기면 다시 열림' },
  mbmenu: { short:'몽몽마방 메뉴를 고르면', done:['몽몽마방 식사에서 메뉴를 고르면 완료'], hand:'직접 체크할 수 없음 — 메뉴를 골라야 끝남', back:'고른 메뉴를 다시 비우면 다시 열림' },
  linksend: { short:'「결제링크 전송」을 누르면', done:['예약 내용 결제 칸 아래 「결제링크 전송」을 누르면 완료 (누른 일시가 기록됨)'], hand:'과업을 직접 체크해도 같음 (체크한 일시가 전송 일시로 기록됨)', back:'결제링크 전송 기록을 지우면 다시 열림' },
  paycheck: { short:'「입금 확인」을 누르면', done:['예약 내용 결제 칸 아래 「입금 확인」을 누르면 완료 (누른 일시가 기록됨)', '결제링크를 보낸 다음날부터 뜨는 결제 확인 알림에서 「입금 확인함」을 눌러도 완료'],
    hand:'과업을 직접 체크해도 같음 · 결제링크 전송을 먼저 끝내야 체크할 수 있음', back:'결제링크 전송을 풀면 입금 확인도 함께 풀려 다시 열림' },
  pplchk: { short:'가장 최근 전산 내역과 예약 내역이 같으면', done:['가장 최근에 붙여 넣은 전산 내역과 지금 예약 내역의 총 금액 · 할인이 같으면 완료 (바뀐 내용이 이미 전산에 반영된 것 · 아래 체크로 끌 수 있음)'], back:'완료한 뒤 관람 인원이 또 바뀌면 다시 열림' },
  memocheck: { short:'안 읽은 메모가 없어지면', done:['안 읽은 메모가 하나도 남지 않으면 완료'], hand:'과업을 직접 체크하면 안 읽은 메모가 모두 「확인함」으로 바뀌고 완료', back:'완료한 뒤 다른 사람이 통화 메모를 또 고치거나 메모를 남기면 다시 열림 (마감 = 그날)' },
  wkcheck: { short:'예전 한 줄 점검에서 이미 체크해 둔 예약이면', done:['예전 「다음주 예약 점검」 한 줄(나의 할일)에서 이미 체크해 둔 예약은 처음부터 완료'], back:'완료한 뒤 미정 · 미입력 항목이 새로 생기거나 현장 결제로 바뀌면 다시 열림' },
  staffbrief: { back:'새 담당자가 생기면 그 사람 줄이 더해지고 다시 열림' },
  erpkeep: { back:'완료한 뒤 전산 내역을 다시 붙여 넣고 「예약 내용 그대로」를 또 고르면 다시 열림' },
  quote: { subs:{ make:['견적서를 출력하면', '이 예약에서 「견적서 만들기」로 견적서 화면을 열어 출력하면 체크'] } },
  stmt: { subs:{ make:['거래명세서를 출력하면', '이 예약에서 「거래명세서 만들기」로 견적서 화면을 열어 출력하면 체크'] } } };
const TCFG_SUB_NOEND = new Set(['erp','erpcheck','progstaff','mbmenu','linksend']);   // 세부 과업을 모두 체크해도 끝나지 않는 과업 (자기 조건으로만 끝남)
const tcfgAutoOf = (id, builtin) => (builtin && TCFG_AUTO[id]) || {};
// 과업 자체가 저절로 체크되는 때 (예약내역&전산 확인은 꺼 두었으면 없음)
const tcfgAutoDone = (id, c, builtin) => id==='pplchk' && c && c.autoDone===false ? [] : (tcfgAutoOf(id, builtin).done||[]);
// 세부 과업 하나가 저절로 체크되는 때: [짧은 글, 긴 글] (없으면 null = 직접 체크). 원래 세부 과업의 이름을 그대로 둔 것만 (이름을 바꾸면 새 세부 과업이 됨)
const tcfgSubAuto = (id, builtin, label) => { const s=tcfgAutoOf(id, builtin).subs; return s && TCFG_BASE_DOC[id] ? (s[tcfgDocKey(id, String(label||'').trim())]||null) : null; };
// 예약 내용에 따라 저절로 들어가는 세부 과업: [이름, 언제 들어가나, 언제 빠지나]
function tcfgDynSubs(id, c, builtin){ if(!builtin) return [];
  if(id==='wkcheck') return [c.onsiteSub ? [ONSITE_SUB, '결제 방법이 현장 결제이면 들어감', '현장 결제가 아니게 되면 빠짐'] : null, c.autoSubs ? ['미정 · ○○ / 미입력 · ○○', '미정 항목 · 아직 안 넣은 칸마다 한 줄씩 들어감', '미정이 정해지거나 빈 칸을 채우면 그 줄은 빠짐'] : null].filter(Boolean);
  if(id==='staffbrief') return [['담당자 이름 : 맡은 프로그램 · 굿즈', '프로그램 · 굿즈 담당자마다 한 줄씩 들어감', '담당에서 빠진 사람의 줄은 (체크 전이면) 빠짐']];
  return []; }
const tcfgHasSubs = (id, c, builtin) => tcfgSubsClean(c.subs).length>0 || tcfgDynSubs(id, c, builtin).length>0;
const tcfgHasAuto = it => tcfgAutoDone(it.id, it.c, it.builtin).length>0 || tcfgSubsClean(it.c.subs).some(s=>tcfgSubAuto(it.id, it.builtin, s));
// 편집 화면의 카드 「언제 끝난 것으로 체크되나」: 과업 (자동 · 직접 · 다시 열림) + 세부 과업마다 (자동 · 직접)
function tcfgDoneHTML(T, c, builtin, id){
  const a=tcfgAutoOf(id, builtin), subs=tcfgSubsClean(c.subs), dyn=tcfgDynSubs(id, c, builtin), has=subs.length>0 || dyn.length>0, noEnd=builtin && TCFG_SUB_NOEND.has(id);
  const li=(k,l,s)=>`<li><span class="tag ${k}">${l}</span><span>${esc(s)}</span></li>`, L=[];
  tcfgAutoDone(id, c, builtin).forEach(s=>L.push(li('auto','자동',s)));
  if(id==='pplchk' && builtin && c.autoDone===false) L.push(li('hand','꺼 둠','전산 내역이 이미 같아도 저절로 완료하지 않음 (아래 체크를 켜면 다시 자동)'));
  if(has) L.push(noEnd ? li('hand','참고','세부 과업을 모두 체크해도 이 과업은 끝나지 않음 (위 조건으로만 끝남)') : li('auto','자동','세부 과업을 모두 체크하면 과업도 완료'));
  L.push(li('hand','직접', a.hand || ('과업을 체크하면 완료'+(has ? ' (세부 과업도 모두 체크됨)' : ''))));
  if(a.back) L.push(li('back','다시 열림',a.back));
  if(has && !noEnd) L.push(li('back','다시 열림','세부 과업 체크를 하나라도 풀면 다시 열림 (과업을 직접 체크해 끝낸 경우는 그대로)'));
  const S=[...subs.map((s,i)=>{ const au=tcfgSubAuto(id, builtin, s); return `<li><span class="tcfg-n">${i+1}</span><span><b>${esc(s)}</b> ${au ? `<span class="tag auto">자동</span> ${esc(au[1])} · 직접 체크해도 됨` : '<span class="tag hand">직접</span> 사람이 체크'}</span></li>`; }),
    ...dyn.map(d=>`<li><span class="tcfg-n">＋</span><span><b>${esc(d[0])}</b> <span class="tag hand">직접</span> 사람이 체크 · ${esc(d[1])} · ${esc(d[2])}</span></li>`)];
  // 2026-11-26: 따로 카드가 아니라 세부 과업 제목 옆 ? 를 누르면 펼쳐지는 도움말 (문구 ? 와 같은 모양)
  return `<div class="tcfg-helpbox tcfg-donebox">
      <div class="tcfg-hcol"><div class="tcfg-hh">과업이 끝난 것으로 체크되는 때</div><ul class="tcfg-dl">${L.join('')}</ul></div>
      <div class="tcfg-hcol"><div class="tcfg-hh">세부 과업이 체크되는 때</div>${S.length ? `<ul class="tcfg-dl">${S.join('')}</ul>` : '<p class="hint">세부 과업이 없습니다.</p>'}</div>
      <div class="hint" style="grid-column:1/-1">자동 체크 조건은 과업마다 정해진 규칙이라 여기서는 보기만 합니다 · 조건이 사라지면 손대지 않은 과업은 목록에서 빠짐</div>
    </div>`; }
let tcfgDoneOpen=false;   // 세부 과업 ? (언제 체크되나) 펼침
// 한눈에 보기 표의 「자동 체크」 칸
function tcfgAutoCell(it){ const a=tcfgAutoOf(it.id, it.builtin), c=it.c, out=[];
  if(tcfgAutoDone(it.id, c, it.builtin).length) out.push(`<div><span class="tag auto">과업</span> ${esc(a.short || tcfgAutoDone(it.id, c, it.builtin)[0])}</div>`);
  if(tcfgHasSubs(it.id, c, it.builtin) && !(it.builtin && TCFG_SUB_NOEND.has(it.id))) out.push(`<div><span class="tag auto">과업</span> 세부 과업을 모두 체크하면</div>`);
  tcfgSubsClean(c.subs).forEach(s=>{ const au=tcfgSubAuto(it.id, it.builtin, s); if(au) out.push(`<div><span class="tag auto">세부</span> 「${esc(s)}」 — ${esc(au[0])}</div>`); });
  return out.join('') || '<span class="hint">직접 체크</span>'; }
const TCFG_CSS = `#tcfgModal .tag.auto{background:#ece6f7;color:#5b3fa0}#tcfgModal .tag.hand{background:#ece9e2;color:#5f5b52}#tcfgModal .tag.back{background:#fff3d6;color:#8a5a00}
#tcfgModal .tcfg-dl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:1.55}
#tcfgModal .tcfg-dl li{display:flex;gap:8px;align-items:baseline}
#tcfgModal .tcfg-dl li>.tag{flex:none;min-width:54px;text-align:center;white-space:nowrap}
#tcfgModal .tcfg-dl .tcfg-n{align-self:flex-start;margin-top:1px}
#tcfgModal .tcfg-donebox .tcfg-hh{margin-bottom:6px}
#tcfgModal .tcfg-sub .tag{flex:none;white-space:nowrap}
#tcfgModal .tcfg-table td.au{min-width:210px}#tcfgModal .tcfg-table td.au div+div{margin-top:4px}`;   // 이 화면만의 모양 (css/group.css 의 #tcfgModal 규칙에 더함)
// 목록에 쓰는 과업들: 원래 과업 → 새 과업
function tcfgItems(){ const d=tcfgDraft; if(!d) return [];
  return [...Object.keys(TCFG_BASE_TITLES).map(id=>({T:'b:'+id, id, c:d.b[id], builtin:true})), ...(d.c||[]).map((c,i)=>({T:'c:'+i, id:c.id, c, builtin:false}))]; }
const tcfgName = it => String(it.c.title||'').trim() || (it.builtin ? TCFG_BASE_TITLES[it.id] : '(이름 없는 과업)');
const tcfgChanged = it => it.builtin && Object.keys(tcfgPack(it.id, it.c)).length>0;
function tcfgModal(){ let m=$('#tcfgModal'); if(m) return m;
  m=document.createElement('div'); m.className='modal'; m.id='tcfgModal'; m.hidden=true;
  m.innerHTML=`<style>${TCFG_CSS}</style><section class="panel tcfg-pop" role="dialog" aria-modal="true" aria-labelledby="tcfgTitle">
    <div class="tcfg-head"><h2 id="tcfgTitle">추후과업 메시지 관리</h2>
      <span class="seg tcfg-seg"><button type="button" data-tcview="table" title="모든 과업을 한 표로 보기 · 다시 누르면 과업 편집으로">한눈에 보기</button></span>
      <small class="hint" id="tcfgMsg"></small><button type="button" class="tcfg-x" data-tcfgclose title="닫기 (Esc)" aria-label="닫기">×</button></div>
    <div class="tcfg-main" id="tcfgMain">
      <aside class="tcfg-side"><input id="tcfgQ" class="tcfg-q" type="search" placeholder="과업 찾기 (이름 · 조건 · 담당)" data-ime="ko" autocomplete="off"><div id="tcfgList" class="tcfg-items"></div><button type="button" class="btn primary" data-tcfgadd>＋ 새 과업 추가</button></aside>
      <div class="tcfg-pane" id="tcfgBody"></div>
    </div>
    <div class="tcfg-foot"><small class="hint" id="tcfgDirty"></small><span class="sp"></span><button type="button" class="btn primary" data-tcfgsave data-tcfoot>저장</button></div>
  </section>`;
  document.body.appendChild(m);
  m.addEventListener('mousedown', e=>{ if(e.target===m) tcfgClose(); });
  m.addEventListener('focusin', e=>{ if(e.target.matches?.('textarea.tcfg-in, input.tcfg-in[data-tf]')) tcfgLastIn=e.target; });
  m.addEventListener('input', e=>{ if(e.target.id==='tcfgQ'){ tcfgQ=e.target.value.trim(); tcfgPaintList(); } });
  return m; }
function tcfgOpen(){ tcfgApply();
  tcfgDraft={ b:Object.fromEntries(Object.keys(TCFG_BASE_TITLES).map(id=>[id, tcfgEff(id, (tcfg.b||{})[id])])),
    c:tcfgClone(tcfg.c||[]).map(c=>({...c, conds:c.conds||[], subs:c.subs||[], due:c.due||{base:'visit',n:3}, note:c.note||'', desc:c.desc||'', who:c.who||''})) };
  tcfgSaved=JSON.stringify(tcfgDraft);
  tcfgOpenId = tcfgOpenId && tcfgTarget(tcfgOpenId) ? tcfgOpenId : (tcfgItems()[0]||{}).T || ''; tcfgLastIn=null; tcfgQ=''; const m=tcfgModal(); $('#tcfgQ').value='';
  if(typeof loadMemberNames==='function') loadMemberNames().then(()=>{ if(tcfgDraft) tcfgPaint(); });   // 담당 고르기 = 멤버관리의 사람
  const j=tcfgRead(); $('#tcfgMsg').textContent = j.at ? `마지막 저장 ${fmt(j.at)}${j.by?' · '+j.by:''}` : '';
  tcfgPaint(); m.hidden=false; }
let tcfgSaved='';   // 열었을 때 초안 (고친 것이 있는지)
function tcfgClose(){ const m=$('#tcfgModal'); if(m) m.hidden=true; tcfgDraft=null; }
function tcfgTarget(T){ const d=tcfgDraft; if(!d || !T) return null; return T.startsWith('b:') ? d.b[T.slice(2)]||null : d.c[+T.slice(2)]||null; }
const tcfgTA = (attr, v, ph, rows) => `<textarea class="tcfg-in" ${attr} data-ime="ko" rows="${rows||3}" placeholder="${esc(ph||'')}">${esc(v||'')}</textarea>`;
const tcfgCondTxt = conds => (conds||[]).map(q=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k); if(!x) return ''; return x[3]==='num' ? x[1].replace('○', q.v||'?') : Array.isArray(x[3]) ? `${x[1]} ${q.v||'?'}` : x[1]; }).filter(Boolean).join(' · ');
const tcfgDueTxt = due => { const x=TCFG_DUE.find(y=>y[0]===(due&&due.base)); if(!x) return ''; if(due.base==='made' && !(+due.n)) return '과업이 생긴 날'; return x[1].replace('○', (due.n??0)); };
const tcfgWhenTxt = (it) => tcfgCondTxt(it.c.conds) || (it.builtin ? '모든 예약' : '모든 예약 (가예약 · 예약확정)');
// 오른쪽: 고르는 과업의 모든 칸 (원래 과업 · 새 과업 같은 모양 · 칸마다 카드)
function tcfgEdHTML(T, c, builtin, id){
  const conds=c.conds||[], due=c.due||{base:'visit', n:3}, subs=c.subs||[];
  const condRow=(q,j)=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k)||TCFG_CONDS[0];
    return `<div class="tcfg-cond"><span class="tcfg-and">${j?'그리고':'만약'}</span><select data-tcc="${T}|${j}|k">${TCFG_CONDS.map(y=>`<option value="${y[0]}"${y[0]===x[0]?' selected':''}>${esc(y[1])}</option>`).join('')}</select>`
      + (x[3]==='num' ? `<input data-tcc="${T}|${j}|v" inputmode="numeric" data-ime="num" value="${esc(q.v||'')}" placeholder="명" style="width:64px">` : Array.isArray(x[3]) ? `<select data-tcc="${T}|${j}|v">${x[3].map(o=>`<option${o===q.v?' selected':''}>${esc(o)}</option>`).join('')}</select>` : '')
      + `<button type="button" class="del" data-tccdel="${T}|${j}" title="이 조건 빼기">×</button></div>`; };
  const fixedNote = builtin && ['erp','erpfix','tour','tax'].includes(id);
  const names=(typeof MEMBER_NAMES!=='undefined' ? MEMBER_NAMES : []), w=String(c.who||'').trim();
  const whoHTML = TCFG_WHO_FIXED[id] ? `<div class="tcfg-fixed">${esc(TCFG_WHO_FIXED[id])}</div>`
    : `<select class="tcfg-who" data-tf="${T}|who"><option value="">영업 담당 (기본)</option>${names.map(n=>`<option value="${esc(n)}"${n===w?' selected':''}>${esc(n)}</option>`).join('')}${w && !names.includes(w) ? `<option value="${esc(w)}" selected>${esc(w)} (멤버 아님)</option>` : ''}</select>
      <small class="hint">멤버를 고르면 모든 예약의 이 과업이 그 사람의 나의 할일 · 알림으로 갑니다 (이미 끝낸 과업은 그대로).</small>`;
  const rule = builtin && (id==='erp' || id==='erpfix') && typeof ERP_NOTE_RULES!=='undefined' ? ['전산 비고 {전산비고} 가 만들어지는 규칙', ERP_NOTE_RULES]
    : builtin && id==='prep' && typeof PREP_RULES!=='undefined' ? ['단체 준비 과업 규칙', PREP_RULES]
    : builtin && id==='memocheck' && typeof MEMOCHECK_RULES!=='undefined' ? ['통화 메모 확인 과업 규칙', MEMOCHECK_RULES]
    : builtin && id==='pplchk' && typeof PPLCHK_RULES!=='undefined' ? ['예약내역&전산 확인 과업 규칙', PPLCHK_RULES] : null;
  return `<div class="tcfg-ed">
    <div class="tcfg-card tcfg-top">
      <div class="tcfg-name"><input class="tcfg-in tcfg-title" data-tf="${T}|title" data-ime="ko" value="${esc(c.title||'')}" placeholder="${esc(builtin ? TCFG_BASE_TITLES[id] : '과업 이름')}" aria-label="과업 이름">
        ${c.off ? `<label class="chk tcfg-onoff"><input type="checkbox" data-tf="${T}|off" checked> 꺼져 있음 (체크를 빼면 다시 켜짐)</label>` : ''}<button type="button" class="btn primary" data-tcfgsave>저장</button></div>   <!-- 2026-11-26: 끄기 · 원래대로 되돌리기 · 취소를 없애고 저장 버튼을 이 자리에 (이미 꺼 둔 과업만 다시 켤 수 있게 체크를 보임) -->
      <div class="tcfg-meta">${builtin && TCFG_BASE_TITLES[id] && String(c.title||'').trim() && String(c.title).trim()!==TCFG_BASE_TITLES[id] ? `<span class="hint">처음 이름: ${esc(TCFG_BASE_TITLES[id])}</span>` : ''}<span class="sp"></span>${builtin ? '' : `<button type="button" class="btn primary sm" data-tcdel="${T}">이 과업 삭제</button>`}</div>
    </div>
    <div class="tcfg-card"><h4>세부 과업 <button type="button" class="tcfg-help${tcfgDoneOpen?' on':''}" data-tcdone title="이 과업과 세부 과업이 언제 (자동으로) 체크되는지 보기" aria-expanded="${tcfgDoneOpen}">?</button> <small class="hint">과업 안에 체크 칸으로 들어감 · 모두 체크하면 그 과업 완료</small></h4>
      ${tcfgDoneOpen ? tcfgDoneHTML(T, c, builtin, id) : ''}
      <div class="tcfg-subs">${subs.map((s,i)=>`<span class="tcfg-sub"><span class="tcfg-n">${i+1}</span><input class="tcfg-in" data-tsub="${T}|${i}" data-ime="ko" value="${esc(s)}">${(au=>au ? `<span class="tag auto" title="${esc(au[1])}">자동 체크 · ${esc(au[0])}</span>` : '<span class="tag hand">직접 체크</span>')(tcfgSubAuto(id, builtin, s))}<button type="button" class="del" data-tsubdel="${T}|${i}" title="이 세부 과업 빼기">×</button></span>`).join('')}<span class="tcfg-sub"><span class="tcfg-n">＋</span><input class="tcfg-in" data-tsubnew="${T}" data-ime="ko" placeholder="세부 과업 더하기 (적고 Enter)"></span></div>
      ${builtin && id==='wkcheck' ? `<div class="tcfg-auto"><div class="tcfg-lab">예약 내용에 따라 저절로 넣는 세부 과업 (체크를 빼면 넣지 않음)</div>
        <label class="chk"><input type="checkbox" data-tf="${T}|onsiteSub"${c.onsiteSub?' checked':''}> <b>${esc(ONSITE_SUB)}</b> <small class="hint">— 결제 방법이 현장 결제일 때 · 최종 인원 확인 · 당일 인원 변경이 어렵다는 안내</small></label>
        <label class="chk"><input type="checkbox" data-tf="${T}|autoSubs"${c.autoSubs?' checked':''}> <b>미정 항목에 대한 내용</b> <small class="hint">— 미정 항목 · 아직 안 넣은 칸을 하나씩 (예: 「미정 · 결제 방법」)</small></label></div>` : ''}
      ${builtin && id==='pplchk' ? `<div class="tcfg-auto"><label class="chk"><input type="checkbox" data-tf="${T}|autoDone"${c.autoDone?' checked':''}> <b>전산 내역이 이미 같으면 저절로 완료</b> <small class="hint">— 가장 최근 전산 내역과 예약 내역의 총 금액 · 할인이 같으면</small></label></div>` : ''}
    </div>
    <div class="tcfg-card"><h4>언제 생기고 · 언제까지 · 누구에게 <small class="hint">조건이 모두 맞을 때 생김 · 조건이 없으면 ${builtin?'모든 예약':'가예약 · 예약확정인 모든 예약'}</small></h4>
      <div class="tcfg-when">
        <div class="tcfg-wl"><div class="tcfg-lab">언제 생길지</div><div class="tcfg-conds">${conds.map(condRow).join('') || `<span class="hint">모든 예약</span>`}</div><button type="button" class="btn primary sm" data-tccadd="${T}">＋ 조건 더하기</button></div>
        <div class="tcfg-wr"><div class="tcfg-lab">마감</div><div class="tcfg-due"><select data-tf="${T}|dueBase">${TCFG_DUE.map(([k,l])=>`<option value="${k}"${k===due.base?' selected':''}>${esc(l)}</option>`).join('')}</select>${TCFG_N_DUE.has(due.base)?`<input data-tf="${T}|dueN" inputmode="numeric" data-ime="num" value="${esc(due.n??0)}" style="width:56px"> 일`:''}</div></div>
        <div class="tcfg-wh"><div class="tcfg-lab">담당</div>${whoHTML}</div>
      </div>
    </div>
    <div class="tcfg-card"><h4>문구 <button type="button" class="tcfg-help${tcfgHelp?' on':''}" data-tchelp title="과업 보조 설명과 복사 멘트가 어떻게 다른지 예시로 보기" aria-expanded="${tcfgHelp}">?</button> <small class="hint">비우면 없음</small></h4>
      ${tcfgVarsHTML()}
      ${tcfgHelp ? tcfgHelpHTML() : ''}
      <div class="tcfg-two">
        <label><span class="tcfg-lh"><span class="hb a">A</span> 과업 보조 설명</span> <small class="hint">과업 이름 아래에 늘 보이는 짧은 설명 (읽기만)</small>${tcfgTA(`data-tf="${T}|desc"`, c.desc, '예: 바뀐 내용: {바뀐내용}', 5)}</label>
        <label><span class="tcfg-lh"><span class="hb b">B</span> 복사 멘트</span> <small class="hint">과업의 「문구 복사」로 복사해 붙여 넣는 글${fixedNote ? ' · {전산비고} 등은 예약 내용으로 자동' : ''}</small>${tcfgTA(`data-tf="${T}|note"`, c.note, '예: [세금계산서] {단체명} …', 5)}</label>
      </div>
    </div>
    ${rule ? `<details class="tcfg-rule"><summary>📋 ${esc(rule[0])} (참고 · 누르면 펼침)</summary><pre>${esc(rule[1])}</pre></details>` : ''}
  </div>`; }
// 문구 ? 도움말 (2026-11-25): 과업 보조 설명(A) vs 복사 멘트(B) — 과업 모양으로 어디에 나오는지 보여 줌
let tcfgHelp=false;
function tcfgHelpHTML(){
  return `<div class="tcfg-helpbox">
    <div class="tcfg-hcol"><div class="tcfg-hh"><span class="hb a">A</span> 과업 보조 설명</div>
      <p>과업 이름 바로 아래에 <b>늘 보이는 짧은 설명</b>입니다. 복사하지 않고 <b>읽기만</b> 합니다. 왜 이 과업이 생겼는지, 무엇이 바뀌었는지 알려 줄 때 씁니다.</p>
      <p class="hint">예: 「예약내역&전산 확인」 → 바뀐 내용: 관람 인원 20 → 25</p></div>
    <div class="tcfg-hcol"><div class="tcfg-hh"><span class="hb b">B</span> 복사 멘트</div>
      <p>과업 안 회색 칸에 들어가고, <b>「문구 복사」</b>를 눌러 <b>다른 곳에 붙여 넣는 글</b>입니다. 전산 비고, 세금계산서 요청 메시지, 고객에게 보낼 문자 등에 씁니다.</p>
      <p class="hint">예: 「전산 예약」 → 전산 예약 비고 칸에 붙여 넣을 글 · 「세금계산서 발행」 → 담당 부서에 보낼 요청 글</p></div>
    <div class="tcfg-hdemo"><div class="hint" style="margin-bottom:4px">과업이 이렇게 보입니다 (예시)</div>
      <div class="tcfg-mock"><div class="mk-h"><span class="mk-ck"></span><b>전산 예약 수정</b><span class="mk-due">마감 11/26(목)</span></div>
        <div class="mk-desc"><span class="hb a">A</span> 바뀐 내용: 관람 인원 20 → 25 · 입장 10:00 → 11:00</div>
        <div class="mk-note"><span class="hb b">B</span> 현장 결제 필요 / 11시 입장 / 12시 몽몽마방(사유의 밥상 25명) (김영업)</div>
        <div class="mk-btns"><span class="mk-btn">문구 복사</span><span class="hint">← B 를 복사</span></div></div></div>
  </div>`; }
// 바꿔 넣는 말 (2026-11-25): 지금 쓰는 것만 보여 줌 (원래 과업의 기본 문구 · 규칙 안내에 쓰인 것). 누르면 설명 · 예시가 펼쳐짐 (글 칸에 넣지 않음 — 직접 {이름} 으로 적음)
//  예전에 보이던 나머지({담당자} {인원} {결제방식} …)는 목록에서만 뺐고, 이미 저장된 문구에 있으면 그대로 바뀌어 들어감 (TCFG_VARS)
const TCFG_VAR_SHOW = [
  ['단체명','예약의 업체(단체) 이름','중앙교육연수원'],
  ['방문일','방문일 (요일)','11/28(토)'],
  ['방문일점','방문일을 점 날짜로 (세금계산서 요청 글)','2026.11.28 (토)'],
  ['입장시간','입장 시각','10:00'],
  ['바뀐내용','예약에서 바뀐 것 (예약내역&전산 확인 · 전산 예약 수정) — 바뀐 것이 없으면 그 줄은 안 보임','관람 인원 20 → 25 · 입장 10:00 → 11:00'],
  ['메모고친사람','통화 메모를 고치거나 메모를 남긴 사람 (통화 메모 확인)','김수정'],
  ['전산비고','전산 예약 비고에 넣을 글 — 규칙대로 자동 (📋 전산 비고 규칙)','현장 결제 필요 / 10시 입장 / 12시 몽몽마방(사유의 밥상 20명) (김영업)'],
  ['답사비고','사전답사 전산 예약 비고','중앙교육연수원 사전답사/2명 현장 결제 필요'],
  ['사유원금액','결제 금액 중 ㈜사유원(비과세 · 입장료) 몫','900,000'],
  ['신라금액','결제 금액 중 신라(과세 · 식사 · 프로그램 · 대관) 몫','1,440,000'],
  ['이메일','담당자 이메일 중 맨 위','sample@example.com']];
let tcfgVarOpen='';
function tcfgVarsHTML(){
  const o=TCFG_VAR_SHOW.find(v=>v[0]===tcfgVarOpen);
  let now=''; if(o && typeof rec!=='undefined' && rec && (rec.org||rec.date)){ try{ const f=(TCFG_VARS.find(v=>v[0]===o[0])||[])[1]; now=f ? String(f(rec, null)||'') : ''; }catch(_){ now=''; } }
  return `<div class="tcfg-vars"><span class="tcfg-vh">바꿔 넣는 말</span> <small class="hint">문구에 {단체명} 처럼 적으면 예약마다 그 값으로 바뀜 · 누르면 설명과 예시</small>
    <div class="tcfg-chips">${TCFG_VAR_SHOW.map(v=>`<button type="button" class="tcfg-chip${v[0]===tcfgVarOpen?' on':''}" data-tvar="${esc(v[0])}" aria-expanded="${v[0]===tcfgVarOpen}">{${esc(v[0])}}</button>`).join('')}</div>
    ${o ? `<div class="tcfg-varbox"><b>{${esc(o[0])}}</b> — ${esc(o[1])}<div class="tcfg-vex">예: <span>${esc(o[2])}</span></div>${now ? `<div class="tcfg-vex">지금 열어 둔 예약에서: <span>${esc(now)}</span></div>` : ''}<div class="hint" style="margin-top:4px">쓰는 법: 문구 칸에 <code>{${esc(o[0])}}</code> 그대로 적기</div></div>` : ''}
  </div>`; }
// 왼쪽 목록
function tcfgPaintList(){ const box=$('#tcfgList'); if(!box || !tcfgDraft) return; const st=box.scrollTop, q=tcfgQ.toLowerCase();
  const row = it => { const name=tcfgName(it), when=tcfgWhenTxt(it), sub=`${when} · 마감 ${tcfgDueTxt(it.c.due||{base:'visit',n:3})} · ${tcfgWhoTxt(it.id, it.c)}`;
    if(q && !(name+' '+sub).toLowerCase().includes(q)) return '';
    const n=tcfgSubsClean(it.c.subs).length;
    const tags=(it.c.off?'<span class="tag off">끔</span>':'')+(tcfgChanged(it)?'<span class="tag chg">고침</span>':'')+(n?`<span class="tag">세부 ${n}</span>`:'')+(tcfgHasAuto(it)?'<span class="tag auto">자동 체크</span>':'')+(String(it.c.who||'').trim()?`<span class="tag who">${esc(it.c.who)}</span>`:'');
    return `<button type="button" class="tcfg-item${it.T===tcfgOpenId?' on':''}${it.c.off?' off':''}" data-tcfgopen="${esc(it.T)}"><span class="nm">${esc(name)}</span>${tags?`<span class="tg">${tags}</span>`:''}<span class="sm">${esc(sub)}</span></button>`; };
  const items=tcfgItems(), R=items.map(row).join('');   // 2026-11-26: 「원래 있는 과업 / 새 과업」 구분 없이 한 목록으로
  box.innerHTML = `<div class="tcfg-sec">과업 <small>${items.length}</small></div>${R || '<p class="hint">찾는 과업이 없습니다.</p>'}`;
  box.scrollTop=st;
  const dirty = tcfgSaved && JSON.stringify(tcfgDraft)!==tcfgSaved; const dm=$('#tcfgDirty'); if(dm) dm.textContent = dirty ? '저장하지 않은 고친 내용이 있습니다' : ''; }
// 한눈에 보기: 모든 과업을 한 표로 (줄을 누르면 그 과업 편집)
function tcfgTableHTML(){
  const cut=(s,n)=>{ s=String(s||'').replace(/\s+/g,' ').trim(); return s.length>n ? s.slice(0,n)+'…' : s; };
  const rows=tcfgItems().map(it=>{ const c=it.c, subs=tcfgSubsClean(c.subs);
    return `<tr class="${c.off?'off':''}" data-tcfgopen="${esc(it.T)}" title="누르면 이 과업 편집">
      <td class="nm"><b>${esc(tcfgName(it))}</b>${tcfgChanged(it)?' <span class="tag chg">고침</span>':''}</td>
      <td>${c.off?'<span class="tag off">끔</span>':'<span class="tag on">켜짐</span>'}</td>
      <td>${esc(tcfgWhenTxt(it))}</td><td>${esc(tcfgDueTxt(c.due||{base:'visit',n:3}))}</td><td>${esc(tcfgWhoTxt(it.id, c))}</td>
      <td>${subs.length ? `<ol>${subs.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>` : ''}${tcfgDynSubs(it.id, c, it.builtin).map(d=>`<div class="hint">＋ ${esc(d[0])} (예약 내용에 따라 저절로 들어감)</div>`).join('')}</td>
      <td class="au">${tcfgAutoCell(it)}</td>
      <td class="tx">${esc(cut(c.desc, 60))}</td><td class="tx">${esc(cut(c.note, 80))}</td></tr>`; }).join('');
  return `<div class="tcfg-tablewrap"><table class="tcfg-table"><thead><tr><th>과업</th><th>상태</th><th>언제 생길지</th><th>마감</th><th>담당</th><th>세부 과업</th><th>자동 체크</th><th>과업 보조 설명</th><th>복사 멘트</th></tr></thead><tbody>${rows}</tbody></table></div>`; }
function tcfgPaint(){ const d=tcfgDraft; if(!d) return; const body=$('#tcfgBody'), main=$('#tcfgMain');
  document.querySelectorAll('#tcfgModal [data-tcview]').forEach(b=>b.classList.toggle('on', b.dataset.tcview===tcfgView));
  main.classList.toggle('table', tcfgView==='table');
  { const fb=document.querySelector('#tcfgModal [data-tcfoot]'); if(fb) fb.style.display = tcfgView==='table' ? '' : 'none'; }   // 아래 저장 버튼은 한눈에 보기에서만 (과업 편집에서는 과업 이름 옆 저장)
  if(tcfgView==='table'){ body.innerHTML=tcfgTableHTML(); tcfgPaintList(); return; }
  const st=body.scrollTop, it=tcfgItems().find(i=>i.T===tcfgOpenId);
  body.innerHTML = it ? tcfgEdHTML(it.T, it.c, it.builtin, it.id) : '<p class="hint" style="padding:20px">왼쪽에서 과업을 고르세요.</p>';
  if(body.dataset.T===tcfgOpenId) body.scrollTop=st; else body.scrollTop=0; body.dataset.T=tcfgOpenId;
  tcfgPaintList(); }
// 칸 값 → 초안. 돌려주는 값이 true 면 다시 그림
function tcfgSet(el){ if(!tcfgDraft) return false;
  if(el.dataset.tf){ const [T,f]=el.dataset.tf.split('|'), c=tcfgTarget(T); if(!c) return false;
    if(f==='off' || f==='autoSubs' || f==='onsiteSub' || f==='autoDone'){ c[f]=el.checked; return true; }
    if(f==='who'){ c.who=el.value; return true; }
    if(f==='dueBase'){ c.due={...(c.due||{}), base:el.value}; if(c.due.n==null) c.due.n=TCFG_N_DUE.has(el.value) ? (el.value==='made'?0:3) : 0; return true; }
    if(f==='dueN'){ c.due={...(c.due||{}), n:parseInt(el.value.replace(/\D/g,''))||0}; return false; }
    c[f]=el.value; return false; }
  if(el.dataset.tcc){ const [T,j,f]=el.dataset.tcc.split('|'), q=((tcfgTarget(T)||{}).conds||[])[+j]; if(!q) return false;
    if(f==='k'){ q.k=el.value; const x=TCFG_CONDS.find(y=>y[0]===q.k); q.v = Array.isArray(x&&x[3]) ? x[3][0] : ''; return true; }
    q.v = el.inputMode==='numeric' ? el.value.replace(/\D/g,'') : el.value; return false; }
  if(el.dataset.tsub){ const [T,i]=el.dataset.tsub.split('|'), c=tcfgTarget(T); if(c && c.subs) c.subs[+i]=el.value; return false; }
  return false; }
function tcfgSubAdd(el){ const T=el.dataset.tsubnew, v=el.value.trim(); if(!v) return; const c=tcfgTarget(T); if(!c) return; (c.subs ||= []).push(v); el.value=''; tcfgPaint(); setTimeout(()=>document.querySelector(`#tcfgModal [data-tsubnew="${T}"]`)?.focus(),0); }
document.addEventListener('input', e=>{ if(!e.target.closest?.('#tcfgModal') || e.target.id==='tcfgQ') return; if(e.target.tagName!=='SELECT' && e.target.type!=='checkbox'){ tcfgSet(e.target); tcfgPaintList(); } });   // 이름 · 조건 등 → 왼쪽 목록도 바로
document.addEventListener('change', e=>{ if(!e.target.closest?.('#tcfgModal')) return; if(tcfgSet(e.target)) tcfgPaint(); });
document.addEventListener('keydown', e=>{ const el=e.target; if(!el.dataset || el.dataset.tsubnew==null || e.key!=='Enter' || e.isComposing) return; e.preventDefault(); tcfgSubAdd(el); });
// 「＋ 세부 과업」에 적고 Enter 를 안 누른 채 저장해도 들어가게 (저장 때 모음)
const tcfgPendSubs = () => document.querySelectorAll('#tcfgModal [data-tsubnew]').forEach(el=>{ const v=el.value.trim(); if(!v) return; const c=tcfgTarget(el.dataset.tsubnew); if(!c) return; (c.subs ||= []).push(v); el.value=''; });
document.addEventListener('click', async e=>{
  if(e.target.closest?.('#tcfgBtn')){ tcfgOpen(); return; }
  if(!e.target.closest?.('#tcfgModal') || !tcfgDraft) return; const d=tcfgDraft;
  const tv=e.target.closest("[data-tvar]"); if(tv){
    tcfgVarOpen = tcfgVarOpen===tv.dataset.tvar ? "" : tv.dataset.tvar; tcfgPaint(); return; }   // 바꿔 넣는 말: 눌러서 설명 · 예시 펼치기 / 접기 (2026-11-25 · 글 칸에 넣지 않음)
  if(e.target.closest('[data-tcfgclose]')){ if(tcfgSaved && JSON.stringify(tcfgDraft)!==tcfgSaved && !confirm('저장하지 않은 고친 내용이 있습니다. 저장하지 않고 닫을까요?')) return; tcfgClose(); return; }
  if(e.target.closest('[data-tchelp]')){ tcfgHelp=!tcfgHelp; tcfgPaint(); return; }
  if(e.target.closest('[data-tcdone]')){ tcfgPendSubs(); tcfgDoneOpen=!tcfgDoneOpen; tcfgPaint(); return; }   // 세부 과업 ? : 언제 체크되나
  const vw=e.target.closest('[data-tcview]'); if(vw){ tcfgPendSubs(); tcfgView = tcfgView==='table' ? 'edit' : 'table'; tcfgPaint(); return; }   // 한눈에 보기: 다시 누르면 과업 편집으로 (2026-11-26 · 「과업별 편집」 버튼 없앰)
  const o=e.target.closest('[data-tcfgopen]'); if(o){ tcfgPendSubs(); tcfgOpenId=o.dataset.tcfgopen; tcfgView='edit'; tcfgPaint(); return; }
  if(e.target.closest('[data-tcfgadd]')){ tcfgPendSubs(); const id='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); d.c.push({id, title:'', conds:[], due:{base:'visit', n:3}, subs:[], note:'', desc:'', who:''}); tcfgView='edit'; tcfgQ=''; if($('#tcfgQ')) $('#tcfgQ').value=''; tcfgOpenId='c:'+(d.c.length-1); tcfgPaint(); setTimeout(()=>{ const t=document.querySelector(`#tcfgModal [data-tf="c:${d.c.length-1}|title"]`); t?.scrollIntoView({block:'center'}); t?.focus(); },0); return; }
  const ca=e.target.closest('[data-tccadd]'); if(ca){ tcfgPendSubs(); const c=tcfgTarget(ca.dataset.tccadd); if(c){ (c.conds ||= []).push({k:'mb', v:''}); tcfgPaint(); } return; }
  const cd=e.target.closest('[data-tccdel]'); if(cd){ const [T,j]=cd.dataset.tccdel.split('|'), c=tcfgTarget(T); if(c && c.conds) c.conds.splice(+j,1); tcfgPaint(); return; }
  const sd=e.target.closest('[data-tsubdel]'); if(sd){ const [T,i]=sd.dataset.tsubdel.split('|'), c=tcfgTarget(T); if(c && c.subs) c.subs.splice(+i,1); tcfgPaint(); return; }
  const rs=e.target.closest('[data-tcreset]'); if(rs){ const id=rs.dataset.tcreset.slice(2); askDelete(`「${TCFG_BASE_TITLES[id]}」 과업을 원래 규칙(이름 · 조건 · 마감 · 세부 과업 · 문구)으로 되돌릴까요? 저장해야 적용됩니다.`, ()=>{ d.b[id]=tcfgEff(id, {}); tcfgPaint(); }); return; }
  const dl=e.target.closest('[data-tcdel]'); if(dl){ const i=+dl.dataset.tcdel.slice(2), c=d.c[i]; askDelete(`「${String(c.title||'').trim()||'(이름 없는 과업)'}」 과업을 삭제할까요? (이미 예약에 생긴 과업은 그대로 남습니다)`, ()=>{ d.c.splice(i,1); tcfgOpenId=(tcfgItems()[0]||{}).T||''; tcfgPaint(); }); return; }
  if(e.target.closest('[data-tcfgsave]')){
    tcfgPendSubs();
    const bad=d.c.findIndex(c=>!String(c.title||'').trim()); if(bad>=0){ toast('과업 이름을 적어 주세요.'); tcfgOpenId='c:'+bad; tcfgPaint(); return; }
    const B={}; Object.keys(d.b).forEach(id=>{ const o=tcfgPack(id, d.b[id]); if(Object.keys(o).length) B[id]=o; });
    const C=d.c.map(tcfgPackC);
    { const pb=tcfg.b||{}, pc=tcfg.c||[], today=ymd(new Date()), onOf=p=>p ? (p.off ? today : String(p.onAt||'')) : '';   // 다시 켠 날 (껐던 과업을 켜면 오늘 · 이미 적힌 날은 이어감 · 끄면 지움)
      Object.keys(TCFG_BASE_TITLES).forEach(id=>{ if(B[id] && B[id].off) return; const on=onOf(pb[id]); if(on) (B[id] ||= {}).onAt=on; });
      C.forEach(o=>{ if(o.off) return; const on=onOf(pc.find(x=>x && x.id===o.id)); if(on) o.onAt=on; }); }
    const btn=e.target.closest('[data-tcfgsave]'); btn.disabled=true;
    try{ const old=(cache||[]).find(x=>x.id===TCFG_ID), now=new Date().toISOString(), me=savedOwner()||'';
      const item={...(old||{}), id:TCFG_ID, callType:TCFG_TYPE, saved:(old&&old.saved)||now, takenBy:me, summary:`추후과업 설정 · 고친 과업 ${Object.keys(B).length}개 · 새 과업 ${C.length}개`, history:JSON.stringify({b:B, c:C, at:now, by:me})};
      await store.put(item); const i=cache.findIndex(x=>x.id===TCFG_ID); if(i>=0) cache[i]=item; else cache.push(item);
      tcfgSig=''; tcfgApply(); tcfgClose(); if(typeof renderTasks==='function'){ try{ syncAutoTasks(); }catch(_){} renderTasks(); } if(typeof renderSide==='function') renderSide();
      toast('추후과업 설정을 저장했습니다. 모든 직원에게 같게 적용됩니다.'); }
    catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); }
    finally{ btn.disabled=false; } }
});
document.addEventListener('keydown', e=>{ if(e.key!=='Escape' || !$('#tcfgModal') || $('#tcfgModal').hidden) return; if(!document.getElementById('askModal')?.hidden) return; e.preventDefault(); e.stopImmediatePropagation(); if(tcfgSaved && tcfgDraft && JSON.stringify(tcfgDraft)!==tcfgSaved && !confirm('저장하지 않은 고친 내용이 있습니다. 저장하지 않고 닫을까요?')) return; tcfgClose(); }, true);   // 확인 팝업이 떠 있으면 그것부터 닫힘
tcfgApply();
