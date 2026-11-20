// ===== 추후과업 메시지 관리 (2026-11-20) =====
// 단체예약의 자동 추후 과업을 모든 직원이 같이 고침: ① 원래 있는 과업 — 이름 · 더할 조건 · 마감 · 세부 과업 · 과업 문구 · 고객 안내 글 · 끄기
// ② 새 과업 — 이름 · 언제 생길지(모든 예약 또는 조건, 여러 개면 모두 맞을 때) · 마감 · 세부 과업 · 과업 문구 · 고객 안내 글
// 공유 기록 한 줄(id taskcfg, 통화 구분 '추후과업설정')의 수정 기록 칸에 {b:{과업id:{title,conds,due,subs,note,msg,off}}, c:[{id,title,conds,due,subs,note,msg,off}], at, by}
// 문구 · 안내 글은 {단체명} 처럼 바꿔 넣는 말을 씀 → 예약마다 그 값으로
var TCFG_ID='taskcfg', TCFG_TYPE='추후과업설정';
const TCFG_BASE_TITLES = {...AUTO_TASKS};   // 처음 이름 (되돌리기용)
// 원래 있는 과업이 생기는 때 (원래 조건 설명 · 조건을 더하면 그것까지 맞을 때만)
const TCFG_WHEN = { tour:'사전 답사가 잡히면', clergy:'대구대교구 특별 할인이 있으면', tbdcall:'미정 항목 · 아직 안 넣은 칸이 있으면 (마감 = 답변일)', onsitecall:'결제 방식이 현장 결제이면 (마감 = 방문일 전주 목요일 · 지났으면 방문일 전날)',
  wkcheck:'방문일이 있으면 모든 예약 (마감 = 방문일 전주 목요일 · 지났으면 방문일 전날)', mbcall:'몽몽마방이 있으면', mbmenu:'몽몽마방 메뉴를 안 골랐으면', progstaff:'프로그램 · 굿즈 담당이 비었으면', staffbrief:'프로그램 · 굿즈가 있으면',
  goodsprep:'굿즈가 있으면 (마감 = 방문 전날)', erp:'가예약 · 예약확정이면', erpcheck:'가예약 · 예약확정이면', erpfix:'전산 등록 뒤 예약 내용이 바뀌면', quote:'견적서 요청을 체크하면', stmt:'거래명세서 요청을 체크하면',
  tax:'결제 방식이 세금계산서이면', linksend:'결제 방식이 결제링크이면', paycheck:'결제 방식이 결제링크이면 (마감 = 보낸 다음날)' };
const TCFG_AUTO_NOTE = new Set(['erp','erpfix','tax','tour']);   // 원래 자동 문구가 있는 과업 (기본 문구 = {자동문구})
// 바꿔 넣는 말
const TCFG_VARS = [['단체명', r=>r.org||''], ['담당자', r=>((typeof contactsOf==='function' ? contactsOf(r)[0] : null)||{}).name || String(r.contact||'').split(/\s*\/\s*/)[0].trim()]   /* 고객 담당자 이름 (첫 번째) */, ['방문일', r=>r.date ? dateLabel(r.date) : '방문일 미정'], ['입장시간', r=>r.tin||''],
  ['인원', r=>r.people ? r.people+'명' : ''], ['영업담당', r=>r.owner||''], ['결제방식', r=>r.pay||''], ['미정항목', r=>r.tbd||''], ['답변일', r=>r.tbdDate ? mdLabel(r.tbdDate) : ''], ['입장문', r=>r.gate||'']];
// 조건 (모두 맞을 때 생김 · 새 과업은 하나도 없으면 가예약 · 예약확정 모든 예약)
const TCFG_CONDS = [
  ['pay',    '결제 방식이', r=>r.pay, PAYS],
  ['stage',  '단계가', r=>effStage(r), ['가예약','예약확정']],
  ['mb',     '몽몽마방이 있으면', r=>!!(r.mabangL||r.mabangMenu||r.mabangTime)],
  ['sadam',  '사담 식사가 있으면', r=>!!(r.sadam1||r.sadam2||r.sadamD) || viewsParse(r.views).some(v=>/\(관람,\s*사담/.test(v.src))],
  ['prog',   '프로그램이 있으면', r=>PROG_KEYS().some(k=>r[k])],
  ['goods',  '굿즈가 있으면', r=>!!r.goods],
  ['stu',    '학생이 있으면', r=>!!String(r.istu||'').trim() || viewsParse(r.views).some(v=>/학생/.test(v.src))],
  ['sp',     '특별 할인이 있으면', r=>specialCounts(r).length>0],
  ['tbd',    '미정 항목이 있으면', r=>!!r.tbd],
  ['tour',   '사전 답사가 있으면', r=>!!r.tour],
  ['weekend','주말 · 공휴일 방문이면', r=>!!(r.date && isRedDay(r.date))],
  ['pplMin', '관람 인원이 ○명 이상이면', r=>numOf(r.people), 'num'],
  ['pplMax', '관람 인원이 ○명 이하이면', r=>numOf(r.people), 'num'],
];
const TCFG_DUE = [['visit','방문일 ○일 전'],['prevThu','방문일 전주 목요일 (지났으면 전날)'],['visitMon','방문 주 월요일'],['made','과업이 생긴 날 ○일 뒤']];
let tcfg = {b:{}, c:[]}, tcfgSig='';
function tcfgRead(){ const r=(cache||[]).find(x=>x.id===TCFG_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return {b:j.b&&typeof j.b==='object'?j.b:{}, c:Array.isArray(j.c)?j.c:[], at:j.at||'', by:j.by||''}; }
// 받은 설정을 화면에 반영: 과업 이름(AUTO_TASKS) · 새 과업 이름 · 방문일을 따라가는 마감
function tcfgApply(){ try{ const j=tcfgRead(), sig=JSON.stringify([j.b, j.c]); if(sig===tcfgSig) return false; tcfgSig=sig; tcfg=j;
  Object.keys(TCFG_BASE_TITLES).forEach(id=>{ const b=j.b[id]||{}, t=String(b.title||'').trim(); AUTO_TASKS[id] = t || TCFG_BASE_TITLES[id]; if(b.due && b.due.base && b.due.base!=='orig' && b.due.base!=='made') FOLLOW_DUE.add(id); });   // 원래 과업도 마감을 바꿨으면 방문일을 따라감
  j.c.forEach(c=>{ if(c && c.id){ AUTO_TASKS[c.id] = String(c.title||'').trim() || '(이름 없는 과업)'; if(c.due && c.due.base!=='made') FOLLOW_DUE.add(c.id); } });
  return true; }catch(_){ return false; } }
const tcfgCustom = id => (tcfg.c||[]).find(c=>c && c.id===id) || null;
const tcfgOf = id => tcfgCustom(id) || (tcfg.b||{})[id] || null;   // 그 과업의 설정 (새 과업 · 원래 과업)
function tcfgCondOk(c, r){ const conds=Array.isArray(c&&c.conds)?c.conds:[];
  return conds.every(q=>{ const d=TCFG_CONDS.find(x=>x[0]===q.k); if(!d) return true; const v=d[2](r);
    if(d[3]==='num'){ const n=parseInt(q.v)||0; return q.k==='pplMin' ? v>=n : v<=n && v>0; }
    if(Array.isArray(d[3])) return !q.v || String(v||'')===String(q.v);
    return !!v; }); }
// syncAutoTasks 에서: 끈 과업 · 더한 조건이 안 맞는 원래 과업은 빼고, 조건이 맞는 새 과업을 넣음
function tcfgWant(r, want){ for(let i=want.length-1;i>=0;i--){ const b=(tcfg.b||{})[want[i]]; if(b && (b.off || !tcfgCondOk(b, r))) want.splice(i,1); }
  (tcfg.c||[]).forEach(c=>{ if(c && c.id && !c.off && tcfgCondOk(c, r) && !want.includes(c.id)) want.push(c.id); }); }
// 마감: 새 과업 · 마감을 바꾼 원래 과업 (원래대로면 null → 원래 규칙)
function tcfgDue(id, r){ const c=tcfgOf(id); if(!c || !c.due || !c.due.base || c.due.base==='orig') return null; const d=c.due, n=Math.max(0, parseInt(d.n)||0), today=ymd(new Date());
  if(d.base==='made'){ const x=new Date(); x.setDate(x.getDate()+n); return ymd(x); }
  if(!r.date) return today;
  if(d.base==='prevThu') return tbdLimit(r.date);
  if(d.base==='visitMon'){ const x=new Date(r.date+'T00:00'); x.setDate(x.getDate()-((x.getDay()+6)%7)); const v=ymd(x); return v>=today ? v : today; }
  const x=new Date(r.date+'T00:00'); x.setDate(x.getDate()-n); const v=ymd(x); return v>=today ? v : today; }
// 열지 않은 예약(나의 할일 등): 조건이 맞는 새 과업은 넣고, 끄거나 더한 조건이 안 맞는 (손대지 않은) 원래 과업은 빼고, 바꾼 마감은 맞춤
function tcfgVirtual(r, x, ts, has){
  for(let i=ts.length-1;i>=0;i--){ const t=ts[i], b=(tcfg.b||{})[t.id]; if(!b || t.done || t.custom) continue;
    if((b.off || !tcfgCondOk(b, x)) && !t.memo && !(t.xsubs||[]).some(s=>s.done)){ ts.splice(i,1); continue; }
    if(!t.dueSet){ const d=tcfgDue(t.id, x); if(d) ts[i]={...t, due:d}; } }
  if(!r.date || r.date<ymd(new Date())) return;
  (tcfg.c||[]).forEach(c=>{ if(!c || !c.id || c.off || has(c.id)) return; if(!tcfgCondOk(c, x)) return; ts.push({id:c.id, title:AUTO_TASKS[c.id], done:false, due:tcfgDue(c.id, x)||ymd(new Date())}); }); }
// 세부 과업: 안 끝난 과업에 설정의 세부 과업을 넣음 (이름이 같은 것이 이미 있으면 그대로 · 체크하며 하나씩)
function tcfgSubs(list){ (list||[]).forEach(t=>{ if(t.done || t.removed) return; const c=tcfgOf(t.id), subs=(c&&Array.isArray(c.subs)?c.subs:[]).map(s=>String(s||'').trim()).filter(Boolean); if(!subs.length) return;
  const xs=t.xsubs ||= []; subs.forEach((s,i)=>{ if(!xs.some(x=>x.title===s)) xs.push({id:'c:'+i+Date.now().toString(36), title:s, done:false}); }); }); }
// 바꿔 넣기
function tcfgFill(tpl, r, base){ let s=String(tpl||''); s=s.replace(/\{자동문구\}/g, base||''); TCFG_VARS.forEach(([k,f])=>{ s=s.split('{'+k+'}').join(String(f(r)||'')); }); return s.trim(); }
// 과업 문구 (전산 비고 · 세금계산서 요청 등): 설정한 틀이 있으면 그 틀, 없으면 원래 문구
function tcfgNote(t, base){ const c=tcfgOf(t.id), tpl=c&&c.note; if(tpl==null || !String(tpl).trim()) return base; return tcfgFill(tpl, rec, base); }
// 고객 안내 글 (과업 안에 「안내 글 복사」)
function tcfgMsg(t){ const c=tcfgOf(t.id), tpl=c&&c.msg; return tpl && String(tpl).trim() ? tcfgFill(tpl, rec, '') : ''; }
function tcfgMsgHTML(t){ const m=tcfgMsg(t); if(!m) return '';
  return `<div class="tmsg"><span class="tmsg-h">고객 안내 글</span><textarea class="tnote" readonly spellcheck="false">${esc(m)}</textarea><div class="tbtn"><button type="button" class="btn" data-tmsgcopy="${esc(t.id)}">안내 글 복사</button></div></div>`; }
document.addEventListener('click', e=>{ const b=e.target.closest?.('[data-tmsgcopy]'); if(!b) return; const t=(typeof tasks!=='undefined'?tasks:[]).find(x=>x.id===b.dataset.tmsgcopy); if(t) copy(tcfgMsg(t), '고객 안내 글을 복사했습니다. 붙여넣으세요.'); });

// ===== 관리 팝업 =====
// 고치는 대상 T: 'b:과업id' (원래 과업) · 'c:번호' (새 과업)
let tcfgDraft=null, tcfgOpenId='';
function tcfgModal(){ let m=$('#tcfgModal'); if(m) return m;
  m=document.createElement('div'); m.className='modal'; m.id='tcfgModal'; m.hidden=true;
  m.innerHTML=`<section class="panel tcfg-pop" role="dialog" aria-modal="true" aria-labelledby="tcfgTitle">
    <div class="tcfg-head"><h2 id="tcfgTitle">추후과업 메시지 관리</h2><button type="button" class="btn" data-tcfgclose>닫기</button></div>
    <p class="hint" style="margin:0 0 8px">단체예약에 자동으로 생기는 추후 과업의 이름 · 언제 생길지 · 마감 · 세부 과업 · 과업 문구 · 고객 안내 글을 고치고, 새 과업을 추가합니다. 모든 직원에게 같게 적용됩니다.<br>문구 · 안내 글에 넣을 수 있는 말: <span id="tcfgVars"></span></p>
    <div id="tcfgBody" class="tcfg-body"></div>
    <div class="row-btns" style="margin-top:10px"><button type="button" class="btn" data-tcfgadd>＋ 새 과업 추가</button><small class="hint" id="tcfgMsg" style="margin:0 0 0 auto"></small><button type="button" class="btn" data-tcfgclose>취소</button><button type="button" class="btn primary" data-tcfgsave>저장</button></div>
  </section>`;
  document.body.appendChild(m);
  m.addEventListener('mousedown', e=>{ if(e.target===m) tcfgClose(); });
  return m; }
function tcfgOpen(){ tcfgApply(); tcfgDraft=JSON.parse(JSON.stringify({b:tcfg.b||{}, c:tcfg.c||[]})); tcfgOpenId=''; const m=tcfgModal();
  $('#tcfgVars').innerHTML = [...TCFG_VARS.map(v=>v[0]), '자동문구'].map(k=>`<code>{${esc(k)}}</code>`).join(' ');
  const j=tcfgRead(); $('#tcfgMsg').textContent = j.at ? `마지막 저장 ${fmt(j.at)}${j.by?' · '+j.by:''}` : '';
  tcfgPaint(); m.hidden=false; }
function tcfgClose(){ const m=$('#tcfgModal'); if(m) m.hidden=true; tcfgDraft=null; }
function tcfgTarget(T, make){ const d=tcfgDraft; if(!d) return null; if(T.startsWith('b:')){ const id=T.slice(2); if(!d.b[id] && make) d.b[id]={}; return d.b[id]||null; } return d.c[+T.slice(2)]||null; }
const tcfgTA = (attr, v, ph) => `<textarea class="tcfg-in" ${attr} data-ime="ko" rows="3" placeholder="${esc(ph)}">${esc(v||'')}</textarea>`;
const tcfgCondTxt = conds => (conds||[]).map(q=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k); if(!x) return ''; return x[3]==='num' ? x[1].replace('○', q.v||'?') : Array.isArray(x[3]) ? `${x[1]} ${q.v||'?'}` : x[1]; }).filter(Boolean).join(' · ');
const tcfgDueTxt = due => { const x=TCFG_DUE.find(y=>y[0]===(due&&due.base)); return x ? x[1].replace('○', (due.n??0)) : ''; };
// 펼친 칸 (원래 과업 · 새 과업 같은 모양)
function tcfgEdHTML(T, c, builtin, id){
  const conds=Array.isArray(c.conds)?c.conds:[], due=c.due||{base: builtin?'orig':'visit', n:3}, subs=Array.isArray(c.subs)?c.subs:[];
  const condRow=(q,j)=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k)||TCFG_CONDS[0];
    return `<div class="tcfg-cond"><select data-tcc="${T}|${j}|k">${TCFG_CONDS.map(y=>`<option value="${y[0]}"${y[0]===x[0]?' selected':''}>${esc(y[1])}</option>`).join('')}</select>`
      + (x[3]==='num' ? `<input data-tcc="${T}|${j}|v" inputmode="numeric" data-ime="num" value="${esc(q.v||'')}" placeholder="명" style="width:64px">` : Array.isArray(x[3]) ? `<select data-tcc="${T}|${j}|v">${x[3].map(o=>`<option${o===q.v?' selected':''}>${esc(o)}</option>`).join('')}</select>` : '')
      + `<button type="button" class="del" data-tccdel="${T}|${j}" title="이 조건 빼기">×</button></div>`; };
  const dueOpts = builtin ? [['orig','원래대로'], ...TCFG_DUE] : TCFG_DUE;
  return `<div class="tcfg-ed">
    <label>과업 이름 <input class="tcfg-in" data-tf="${T}|title" data-ime="ko" value="${esc(c.title||'')}" placeholder="${esc(builtin ? TCFG_BASE_TITLES[id] : '과업 이름')}"></label>
    <div class="tcfg-lab">언제 생길지 <small class="hint">${builtin ? `(원래: ${esc(TCFG_WHEN[id]||'')} · 조건을 더하면 그것까지 맞을 때만)` : '(조건이 없으면 가예약 · 예약확정 모든 예약 · 여러 개면 모두 맞을 때)'}</small></div>
    <div class="tcfg-conds">${conds.map(condRow).join('') || `<span class="hint">${builtin?'원래 조건만':'모든 예약'}</span>`}<button type="button" class="btn sm" data-tccadd="${T}">＋ 조건</button></div>
    <div class="tcfg-lab">마감</div>
    <div class="tcfg-due"><select data-tf="${T}|dueBase">${dueOpts.map(([k,l])=>`<option value="${k}"${k===due.base?' selected':''}>${esc(l)}</option>`).join('')}</select>${due.base==='visit'||due.base==='made'?`<input data-tf="${T}|dueN" inputmode="numeric" data-ime="num" value="${esc(due.n??0)}" style="width:56px"> 일`:''}</div>
    <div class="tcfg-lab">세부 과업 <small class="hint">(과업에 체크 칸으로 들어감 · 모두 체크하면 그 과업 완료)</small></div>
    <div class="tcfg-subs">${subs.map((s,i)=>`<span class="tcfg-sub"><input class="tcfg-in" data-tsub="${T}|${i}" data-ime="ko" value="${esc(s)}"><button type="button" class="del" data-tsubdel="${T}|${i}" title="이 세부 과업 빼기">×</button></span>`).join('')}<span class="tcfg-sub"><input class="tcfg-in" data-tsubnew="${T}" data-ime="ko" placeholder="＋ 세부 과업 (적고 Enter)"></span></div>
    <div class="tcfg-two">
      <label>과업 문구 <small class="hint">${builtin && TCFG_AUTO_NOTE.has(id) ? '(비우면 원래 자동 문구 · {자동문구})' : '(「문구 복사」 · 비우면 없음)'}</small>${tcfgTA(`data-tf="${T}|note"`, c.note, builtin && TCFG_AUTO_NOTE.has(id) ? '{자동문구}' : '')}</label>
      <label>고객 안내 글 <small class="hint">(「안내 글 복사」 · 비우면 없음)</small>${tcfgTA(`data-tf="${T}|msg"`, c.msg, '안녕하세요 {담당자}님, 사유원입니다. …')}</label>
    </div>
    <div class="tcfg-ebtm"><label class="chk"><input type="checkbox" data-tf="${T}|off"${c.off?' checked':''}> ${builtin?'이 과업을 자동으로 만들지 않음':'잠시 끄기'}</label><span class="sp"></span>${builtin ? (Object.keys(c).length ? `<button type="button" class="btn" data-tcreset="${T}">원래대로 되돌리기</button>` : '') : `<button type="button" class="btn" data-tcdel="${T}">이 과업 삭제</button>`}</div></div>`; }
function tcfgPaint(){ const d=tcfgDraft; if(!d) return; const body=$('#tcfgBody'), st=body.scrollTop;
  const head=(T, name, sub, tags, open, off)=>`<div class="tcfg-row${off?' off':''}" data-tcfgopen="${esc(T)}"><b>${esc(name)}</b><small class="hint">${esc(sub)}</small>${tags}<span class="tcfg-arrow">${open?'▴':'▾'}</span></div>`;
  const built = Object.keys(TCFG_BASE_TITLES).map(id=>{ const T='b:'+id, b=d.b[id]||{}, open=tcfgOpenId===T;
    const sub=[TCFG_WHEN[id]||'', tcfgCondTxt(b.conds) ? '+ '+tcfgCondTxt(b.conds) : '', b.due && b.due.base && b.due.base!=='orig' ? '마감 '+tcfgDueTxt(b.due) : ''].filter(Boolean).join(' · ');
    const tags=(b.off?'<span class="tag">끔</span>':'')+((b.note||b.msg)?'<span class="tag">문구</span>':'')+((b.subs||[]).length?`<span class="tag">세부 ${b.subs.length}</span>`:'');
    return `<li class="${open?'open':''}">${head(T, String(b.title||'').trim()||TCFG_BASE_TITLES[id], sub, tags, open, b.off)}${open?tcfgEdHTML(T, b, true, id):''}</li>`; }).join('');
  const custom = (d.c||[]).map((c,i)=>{ const T='c:'+i, open=tcfgOpenId===T;
    const sub=`${tcfgCondTxt(c.conds)||'모든 예약 (가예약 · 예약확정)'} · 마감 ${tcfgDueTxt(c.due||{base:'visit',n:3})}`;
    const tags='<span class="tag">새 과업</span>'+(c.off?'<span class="tag">끔</span>':'')+((c.subs||[]).length?`<span class="tag">세부 ${c.subs.length}</span>`:'');
    return `<li class="${open?'open':''}">${head(T, String(c.title||'').trim()||'(이름 없는 과업)', sub, tags, open, c.off)}${open?tcfgEdHTML(T, c, false):''}</li>`; }).join('');
  body.innerHTML = `<div class="tcfg-sec">원래 있는 과업 <small class="hint">눌러서 고치기</small></div><ul class="tcfg-list">${built}</ul>`
    + `<div class="tcfg-sec">새 과업 <small class="hint">${(d.c||[]).length}개</small></div>` + ((d.c||[]).length ? `<ul class="tcfg-list">${custom}</ul>` : '<p class="hint" style="margin:4px 0">아직 없습니다. 아래 「＋ 새 과업 추가」를 누르세요.</p>');
  body.scrollTop=st; }
// 칸 값 → 초안. 돌려주는 값이 true 면 다시 그림
function tcfgSet(el){ if(!tcfgDraft) return false;
  if(el.dataset.tf){ const [T,f]=el.dataset.tf.split('|'), c=tcfgTarget(T, true); if(!c) return false;
    if(f==='off'){ c.off=el.checked; return true; }
    if(f==='dueBase'){ c.due={...(c.due||{}), base:el.value}; if(c.due.n==null) c.due.n=3; return true; }
    if(f==='dueN'){ c.due={...(c.due||{}), n:parseInt(el.value.replace(/\D/g,''))||0}; return false; }
    c[f]=el.value; return false; }
  if(el.dataset.tcc){ const [T,j,f]=el.dataset.tcc.split('|'), q=((tcfgTarget(T)||{}).conds||[])[+j]; if(!q) return false;
    if(f==='k'){ q.k=el.value; const x=TCFG_CONDS.find(y=>y[0]===q.k); q.v = Array.isArray(x&&x[3]) ? x[3][0] : ''; return true; }
    q.v = el.inputMode==='numeric' ? el.value.replace(/\D/g,'') : el.value; return false; }
  if(el.dataset.tsub){ const [T,i]=el.dataset.tsub.split('|'), c=tcfgTarget(T); if(c && c.subs) c.subs[+i]=el.value; return false; }
  return false; }
function tcfgSubAdd(el){ const T=el.dataset.tsubnew, v=el.value.trim(); if(!v) return; const c=tcfgTarget(T, true); (c.subs ||= []).push(v); el.value=''; tcfgPaint(); setTimeout(()=>document.querySelector(`#tcfgModal [data-tsubnew="${T}"]`)?.focus(),0); }
document.addEventListener('input', e=>{ if(!e.target.closest?.('#tcfgModal')) return; if(e.target.tagName!=='SELECT' && e.target.type!=='checkbox') tcfgSet(e.target); });
document.addEventListener('change', e=>{ if(!e.target.closest?.('#tcfgModal')) return; if(tcfgSet(e.target)) tcfgPaint(); });
document.addEventListener('keydown', e=>{ const el=e.target; if(!el.dataset || el.dataset.tsubnew==null || e.key!=='Enter' || e.isComposing) return; e.preventDefault(); tcfgSubAdd(el); });
// 「＋ 세부 과업」에 적고 Enter 를 안 누른 채 저장해도 들어가게 (저장 때 모음)
const tcfgPendSubs = () => document.querySelectorAll('#tcfgModal [data-tsubnew]').forEach(el=>{ const v=el.value.trim(); if(!v) return; const c=tcfgTarget(el.dataset.tsubnew, true); (c.subs ||= []).push(v); el.value=''; });
document.addEventListener('click', async e=>{
  if(e.target.closest?.('#tcfgBtn')){ tcfgOpen(); return; }
  if(!e.target.closest?.('#tcfgModal') || !tcfgDraft) return; const d=tcfgDraft;
  if(e.target.closest('[data-tcfgclose]')){ tcfgClose(); return; }
  const o=e.target.closest('[data-tcfgopen]'); if(o){ tcfgPendSubs(); tcfgOpenId = tcfgOpenId===o.dataset.tcfgopen ? '' : o.dataset.tcfgopen; tcfgPaint(); return; }
  if(e.target.closest('[data-tcfgadd]')){ tcfgPendSubs(); const id='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); d.c.push({id, title:'', conds:[], due:{base:'visit', n:3}, subs:[], note:'', msg:''}); tcfgOpenId='c:'+(d.c.length-1); tcfgPaint(); setTimeout(()=>{ const t=document.querySelector(`#tcfgModal [data-tf="c:${d.c.length-1}|title"]`); t?.scrollIntoView({block:'center'}); t?.focus(); },0); return; }
  const ca=e.target.closest('[data-tccadd]'); if(ca){ tcfgPendSubs(); const c=tcfgTarget(ca.dataset.tccadd, true); (c.conds ||= []).push({k:'mb', v:''}); tcfgPaint(); return; }
  const cd=e.target.closest('[data-tccdel]'); if(cd){ const [T,j]=cd.dataset.tccdel.split('|'), c=tcfgTarget(T); if(c && c.conds) c.conds.splice(+j,1); tcfgPaint(); return; }
  const sd=e.target.closest('[data-tsubdel]'); if(sd){ const [T,i]=sd.dataset.tsubdel.split('|'), c=tcfgTarget(T); if(c && c.subs) c.subs.splice(+i,1); tcfgPaint(); return; }
  const rs=e.target.closest('[data-tcreset]'); if(rs){ const id=rs.dataset.tcreset.slice(2); askDelete(`「${TCFG_BASE_TITLES[id]}」 과업의 고친 내용(이름 · 조건 · 마감 · 세부 과업 · 문구 · 끄기)을 모두 원래대로 되돌릴까요?`, ()=>{ delete d.b[id]; tcfgPaint(); }); return; }
  const dl=e.target.closest('[data-tcdel]'); if(dl){ const i=+dl.dataset.tcdel.slice(2), c=d.c[i]; askDelete(`「${String(c.title||'').trim()||'(이름 없는 과업)'}」 새 과업을 삭제할까요? (이미 예약에 생긴 과업은 그대로 남습니다)`, ()=>{ d.c.splice(i,1); tcfgOpenId=''; tcfgPaint(); }); return; }
  if(e.target.closest('[data-tcfgsave]')){
    tcfgPendSubs();
    const bad=d.c.findIndex(c=>!String(c.title||'').trim()); if(bad>=0){ toast('새 과업의 이름을 적어 주세요.'); tcfgOpenId='c:'+bad; tcfgPaint(); return; }
    const clean=c=>{ c.conds=(c.conds||[]).filter(q=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k); return x && (x[3]!=='num' || q.v!==''); }); if(!c.conds.length) delete c.conds;
      c.subs=(c.subs||[]).map(s=>String(s||'').trim()).filter(Boolean); if(!c.subs.length) delete c.subs;
      ['title','note','msg'].forEach(f=>{ if(c[f]!=null){ c[f]=String(c[f]).trim(); if(!c[f]) delete c[f]; } }); if(!c.off) delete c.off; };
    d.c.forEach(c=>{ clean(c); c.title=c.title||''; if(!c.due) c.due={base:'visit', n:3}; });
    Object.keys(d.b).forEach(id=>{ const b=d.b[id]; clean(b); if(b.due && (!b.due.base || b.due.base==='orig')) delete b.due; if(!Object.keys(b).length) delete d.b[id]; });
    const btn=e.target.closest('[data-tcfgsave]'); btn.disabled=true;
    try{ const old=(cache||[]).find(x=>x.id===TCFG_ID), now=new Date().toISOString(), me=savedOwner()||'';
      const item={...(old||{}), id:TCFG_ID, callType:TCFG_TYPE, saved:(old&&old.saved)||now, takenBy:me, summary:`추후과업 설정 · 새 과업 ${d.c.length}개`, history:JSON.stringify({b:d.b, c:d.c, at:now, by:me})};
      await store.put(item); const i=cache.findIndex(x=>x.id===TCFG_ID); if(i>=0) cache[i]=item; else cache.push(item);
      tcfgSig=''; tcfgApply(); tcfgClose(); if(typeof renderTasks==='function'){ try{ syncAutoTasks(); }catch(_){} renderTasks(); } if(typeof renderSide==='function') renderSide();
      toast('추후과업 설정을 저장했습니다. 모든 직원에게 같게 적용됩니다.'); }
    catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); }
    finally{ btn.disabled=false; } }
});
document.addEventListener('keydown', e=>{ if(e.key!=='Escape' || !$('#tcfgModal') || $('#tcfgModal').hidden) return; if(!document.getElementById('askModal')?.hidden) return; e.preventDefault(); e.stopImmediatePropagation(); tcfgClose(); }, true);   // 확인 팝업이 떠 있으면 그것부터 닫힘
tcfgApply();
