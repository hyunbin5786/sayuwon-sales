// ===== 추후과업 메시지 관리 (2026-11-20) =====
// 단체예약의 자동 추후 과업을 모든 직원이 같이 고침: ① 원래 있는 과업 — 이름 · 과업 문구 · 고객 안내 글 · 끄기
// ② 새 과업 — 이름 · 언제 생길지(모든 예약 또는 조건, 여러 개면 모두 맞을 때) · 마감 · 과업 문구 · 고객 안내 글
// 공유 기록 한 줄(id taskcfg, 통화 구분 '추후과업설정')의 수정 기록 칸에 {b:{과업id:{title,note,msg,off}}, c:[{id,title,conds,due,note,msg,off}], at, by}
// 문구 · 안내 글은 {단체명} 처럼 바꿔 넣는 말을 씀 → 예약마다 그 값으로
var TCFG_ID='taskcfg', TCFG_TYPE='추후과업설정';
const TCFG_BASE_TITLES = {...AUTO_TASKS};   // 처음 이름 (되돌리기용)
// 원래 있는 과업이 생기는 때 (설명만 · 바꿀 수 없음)
const TCFG_WHEN = { tour:'사전 답사가 잡히면', clergy:'대구대교구 특별 할인이 있으면', tbdcall:'미정 항목 · 아직 안 넣은 칸이 있으면 (마감 = 답변일)', onsitecall:'결제 방식이 현장 결제이면 (마감 = 방문일 전주 목요일)',
  wkcheck:'방문일이 있으면 모든 예약 (마감 = 방문일 전주 목요일)', mbcall:'몽몽마방이 있으면', mbmenu:'몽몽마방 메뉴를 안 골랐으면', progstaff:'프로그램 · 굿즈 담당이 비었으면', staffbrief:'프로그램 · 굿즈가 있으면',
  goodsprep:'굿즈가 있으면 (마감 = 방문 전날)', erp:'가예약 · 예약확정이면', erpcheck:'가예약 · 예약확정이면', erpfix:'전산 등록 뒤 예약 내용이 바뀌면', quote:'견적서 요청을 체크하면', stmt:'거래명세서 요청을 체크하면',
  tax:'결제 방식이 세금계산서이면', linksend:'결제 방식이 결제링크이면', paycheck:'결제 방식이 결제링크이면 (마감 = 보낸 다음날)' };
const TCFG_AUTO_NOTE = new Set(['erp','erpfix','tax','tour']);   // 원래 자동 문구가 있는 과업 (기본 문구 = {자동문구})
// 바꿔 넣는 말
const TCFG_VARS = [['단체명', r=>r.org||''], ['담당자', r=>((typeof contactsOf==='function' ? contactsOf(r)[0] : null)||{}).name || String(r.contact||'').split(/\s*\/\s*/)[0].trim()]   /* 고객 담당자 이름 (첫 번째) */, ['방문일', r=>r.date ? dateLabel(r.date) : '방문일 미정'], ['입장시간', r=>r.tin||''],
  ['인원', r=>r.people ? r.people+'명' : ''], ['영업담당', r=>r.owner||''], ['결제방식', r=>r.pay||''], ['미정항목', r=>r.tbd||''], ['답변일', r=>r.tbdDate ? mdLabel(r.tbdDate) : ''], ['입장문', r=>r.gate||'']];
// 새 과업의 조건 (모두 맞을 때 생김 · 하나도 없으면 가예약 · 예약확정 모든 예약)
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
const TCFG_DUE = [['visit','방문일 ○일 전'],['prevThu','방문일 전주 목요일'],['visitMon','방문 주 월요일'],['made','과업이 생긴 날 ○일 뒤']];
let tcfg = {b:{}, c:[]}, tcfgSig='';
function tcfgRead(){ const r=(cache||[]).find(x=>x.id===TCFG_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return {b:j.b&&typeof j.b==='object'?j.b:{}, c:Array.isArray(j.c)?j.c:[], at:j.at||'', by:j.by||''}; }
// 받은 설정을 화면에 반영: 과업 이름(AUTO_TASKS) · 새 과업 이름 · 방문일을 따라가는 마감
function tcfgApply(){ try{ const j=tcfgRead(), sig=JSON.stringify([j.b, j.c]); if(sig===tcfgSig) return false; tcfgSig=sig; tcfg=j;
  Object.keys(TCFG_BASE_TITLES).forEach(id=>{ const t=String((j.b[id]||{}).title||'').trim(); AUTO_TASKS[id] = t || TCFG_BASE_TITLES[id]; });
  j.c.forEach(c=>{ if(c && c.id){ AUTO_TASKS[c.id] = String(c.title||'').trim() || '(이름 없는 과업)'; if(c.due && c.due.base!=='made') FOLLOW_DUE.add(c.id); } });
  return true; }catch(_){ return false; } }
const tcfgCustom = id => (tcfg.c||[]).find(c=>c && c.id===id) || null;
function tcfgCondOk(c, r){ const conds=Array.isArray(c.conds)?c.conds:[];
  return conds.every(q=>{ const d=TCFG_CONDS.find(x=>x[0]===q.k); if(!d) return true; const v=d[2](r);
    if(d[3]==='num'){ const n=parseInt(q.v)||0; return q.k==='pplMin' ? v>=n : v<=n && v>0; }
    if(Array.isArray(d[3])) return !q.v || String(v||'')===String(q.v);
    return !!v; }); }
// syncAutoTasks 에서: 끈 과업은 빼고, 조건이 맞는 새 과업을 넣음
function tcfgWant(r, want){ for(let i=want.length-1;i>=0;i--){ if((tcfg.b[want[i]]||{}).off) want.splice(i,1); }
  (tcfg.c||[]).forEach(c=>{ if(c && c.id && !c.off && tcfgCondOk(c, r) && !want.includes(c.id)) want.push(c.id); }); }
// 마감
function tcfgDue(id, r){ const c=tcfgCustom(id); if(!c) return null; const d=c.due||{base:'made', n:0}, n=Math.max(0, parseInt(d.n)||0), today=ymd(new Date());
  if(d.base==='made'){ const x=new Date(); x.setDate(x.getDate()+n); return ymd(x); }
  if(!r.date) return today;
  if(d.base==='prevThu') return tbdLimit(r.date);
  if(d.base==='visitMon'){ const x=new Date(r.date+'T00:00'); x.setDate(x.getDate()-((x.getDay()+6)%7)); const v=ymd(x); return v>=today ? v : today; }
  const x=new Date(r.date+'T00:00'); x.setDate(x.getDate()-n); const v=ymd(x); return v>=today ? v : today; }
// 열지 않은 예약(나의 할일 등)에도 조건이 맞는 새 과업
function tcfgVirtual(r, x, ts, has){ if(!r.date || r.date<ymd(new Date())) return;
  (tcfg.c||[]).forEach(c=>{ if(!c || !c.id || c.off || has(c.id)) return; if(!tcfgCondOk(c, x)) return; ts.push({id:c.id, title:AUTO_TASKS[c.id], done:false, due:tcfgDue(c.id, x)}); }); }
// 바꿔 넣기
function tcfgFill(tpl, r, base){ let s=String(tpl||''); s=s.replace(/\{자동문구\}/g, base||''); TCFG_VARS.forEach(([k,f])=>{ s=s.split('{'+k+'}').join(String(f(r)||'')); }); return s.trim(); }
// 과업 문구 (전산 비고 · 세금계산서 요청 등): 설정한 틀이 있으면 그 틀, 없으면 원래 문구
function tcfgNote(t, base){ const c=tcfgCustom(t.id), tpl = c ? c.note : (tcfg.b[t.id]||{}).note; if(tpl==null || !String(tpl).trim()) return base; return tcfgFill(tpl, rec, base); }
// 고객 안내 글 (과업 안에 「안내 글 복사」)
function tcfgMsg(t){ const c=tcfgCustom(t.id), tpl = c ? c.msg : (tcfg.b[t.id]||{}).msg; return tpl && String(tpl).trim() ? tcfgFill(tpl, rec, '') : ''; }
function tcfgMsgHTML(t){ const m=tcfgMsg(t); if(!m) return '';
  return `<div class="tmsg"><span class="tmsg-h">고객 안내 글</span><textarea class="tnote" readonly spellcheck="false">${esc(m)}</textarea><div class="tbtn"><button type="button" class="btn" data-tmsgcopy="${esc(t.id)}">안내 글 복사</button></div></div>`; }
document.addEventListener('click', e=>{ const b=e.target.closest?.('[data-tmsgcopy]'); if(!b) return; const t=(typeof tasks!=='undefined'?tasks:[]).find(x=>x.id===b.dataset.tmsgcopy); if(t) copy(tcfgMsg(t), '고객 안내 글을 복사했습니다. 붙여넣으세요.'); });

// ===== 관리 팝업 =====
let tcfgDraft=null, tcfgOpenId='';
function tcfgModal(){ let m=$('#tcfgModal'); if(m) return m;
  m=document.createElement('div'); m.className='modal'; m.id='tcfgModal'; m.hidden=true;
  m.innerHTML=`<section class="panel consult tcfg-pop" role="dialog" aria-modal="true" aria-labelledby="tcfgTitle">
    <div class="tcfg-head"><h2 id="tcfgTitle">추후과업 메시지 관리</h2><button type="button" class="btn" data-tcfgclose>닫기</button></div>
    <p class="hint" style="margin:0 0 8px">단체예약에 자동으로 생기는 추후 과업의 이름 · 과업 문구 · 고객 안내 글을 고치고, 새 과업을 추가합니다. 모든 직원에게 같게 적용됩니다.<br>문구 · 안내 글에 넣을 수 있는 말: <span id="tcfgVars"></span></p>
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
const tcfgTA = (attr, v, ph, rows=2) => `<textarea class="tcfg-in" ${attr} data-ime="ko" rows="${rows}" placeholder="${esc(ph)}">${esc(v||'')}</textarea>`;
function tcfgPaint(){ const d=tcfgDraft; if(!d) return;
  const built = Object.keys(TCFG_BASE_TITLES).map(id=>{ const b=d.b[id]||{}, open=tcfgOpenId===id, name=String(b.title||'').trim()||TCFG_BASE_TITLES[id];
    const head=`<div class="tcfg-row${b.off?' off':''}" data-tcfgopen="${esc(id)}"><b>${esc(name)}</b><small class="hint">${esc(TCFG_WHEN[id]||'')}</small>${b.off?'<span class="tag">끔</span>':''}${(b.note||b.msg)?'<span class="tag">문구</span>':''}<span class="tcfg-arrow">${open?'▴':'▾'}</span></div>`;
    if(!open) return `<li>${head}</li>`;
    return `<li class="open">${head}<div class="tcfg-ed">
      <label>과업 이름 <input class="tcfg-in" data-tb="${esc(id)}|title" data-ime="ko" value="${esc(b.title||'')}" placeholder="${esc(TCFG_BASE_TITLES[id])}"></label>
      <label>과업 문구 ${TCFG_AUTO_NOTE.has(id)?'<small class="hint">(비우면 원래 자동 문구 · {자동문구} 로 원래 문구를 넣을 수 있음)</small>':'<small class="hint">(과업 안에 「문구 복사」로 나옴 · 비우면 없음)</small>'}${tcfgTA(`data-tb="${esc(id)}|note"`, b.note, TCFG_AUTO_NOTE.has(id)?'{자동문구}':'', 3)}</label>
      <label>고객 안내 글 <small class="hint">(과업 안에 「안내 글 복사」로 나옴 · 비우면 없음)</small>${tcfgTA(`data-tb="${esc(id)}|msg"`, b.msg, '안녕하세요 {담당자}님, 사유원입니다. …', 4)}</label>
      <label class="chk"><input type="checkbox" data-tb="${esc(id)}|off"${b.off?' checked':''}> 이 과업을 자동으로 만들지 않음</label></div></li>`; }).join('');
  const custom = (d.c||[]).map((c,i)=>{ const open=tcfgOpenId===c.id, conds=Array.isArray(c.conds)?c.conds:[], due=c.due||{base:'visit', n:3};
    const condTxt = conds.length ? conds.map(q=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k); if(!x) return ''; return x[3]==='num' ? x[1].replace('○', q.v||'?') : Array.isArray(x[3]) ? `${x[1]} ${q.v||'?'}` : x[1]; }).filter(Boolean).join(' · ') : '모든 예약 (가예약 · 예약확정)';
    const dueTxt = (TCFG_DUE.find(x=>x[0]===due.base)||TCFG_DUE[0])[1].replace('○', due.n??0);
    const head=`<div class="tcfg-row${c.off?' off':''}" data-tcfgopen="${esc(c.id)}"><b>${esc(String(c.title||'').trim()||'(이름 없는 과업)')}</b><small class="hint">${esc(condTxt)} · 마감 ${esc(dueTxt)}</small><span class="tag">새 과업</span>${c.off?'<span class="tag">끔</span>':''}<span class="tcfg-arrow">${open?'▴':'▾'}</span></div>`;
    if(!open) return `<li>${head}</li>`;
    const condRow=(q,j)=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k)||TCFG_CONDS[0];
      return `<div class="tcfg-cond"><select data-tcc="${i}|${j}|k">${TCFG_CONDS.map(y=>`<option value="${y[0]}"${y[0]===x[0]?' selected':''}>${esc(y[1])}</option>`).join('')}</select>`
        + (x[3]==='num' ? `<input data-tcc="${i}|${j}|v" inputmode="numeric" data-ime="num" value="${esc(q.v||'')}" placeholder="명" style="width:70px">` : Array.isArray(x[3]) ? `<select data-tcc="${i}|${j}|v">${x[3].map(o=>`<option${o===q.v?' selected':''}>${esc(o)}</option>`).join('')}</select>` : '')
        + `<button type="button" class="del" data-tccdel="${i}|${j}" title="이 조건 빼기">×</button></div>`; };
    return `<li class="open">${head}<div class="tcfg-ed">
      <label>과업 이름 <input class="tcfg-in" data-tc="${i}|title" data-ime="ko" value="${esc(c.title||'')}" placeholder="과업 이름"></label>
      <div class="tcfg-lab">언제 생길지 <small class="hint">(조건이 없으면 가예약 · 예약확정 모든 예약 · 여러 개면 모두 맞을 때)</small></div>
      <div class="tcfg-conds">${conds.map(condRow).join('') || '<span class="hint">모든 예약</span>'}<button type="button" class="btn sm" data-tccadd="${i}">＋ 조건</button></div>
      <div class="tcfg-lab">마감</div>
      <div class="tcfg-due"><select data-tc="${i}|dueBase">${TCFG_DUE.map(([k,l])=>`<option value="${k}"${k===due.base?' selected':''}>${esc(l)}</option>`).join('')}</select>${due.base==='visit'||due.base==='made'?`<input data-tc="${i}|dueN" inputmode="numeric" data-ime="num" value="${esc(due.n??0)}" style="width:60px"> 일`:''}</div>
      <label>과업 문구 <small class="hint">(과업 안에 「문구 복사」로 나옴 · 비우면 없음)</small>${tcfgTA(`data-tc="${i}|note"`, c.note, '', 3)}</label>
      <label>고객 안내 글 <small class="hint">(과업 안에 「안내 글 복사」로 나옴 · 비우면 없음)</small>${tcfgTA(`data-tc="${i}|msg"`, c.msg, '안녕하세요 {담당자}님, 사유원입니다. …', 4)}</label>
      <div class="tcfg-ebtm"><label class="chk"><input type="checkbox" data-tc="${i}|off"${c.off?' checked':''}> 잠시 끄기</label><span class="sp"></span><button type="button" class="btn" data-tcdel="${i}">이 과업 삭제</button></div></div></li>`; }).join('');
  $('#tcfgBody').innerHTML = `<div class="tcfg-sec">원래 있는 과업 <small class="hint">눌러서 고치기</small></div><ul class="tcfg-list">${built}</ul>`
    + `<div class="tcfg-sec">새 과업 <small class="hint">${(d.c||[]).length}개</small></div>` + ((d.c||[]).length ? `<ul class="tcfg-list">${custom}</ul>` : '<p class="hint" style="margin:4px 0">아직 없습니다. 아래 「＋ 새 과업 추가」를 누르세요.</p>'); }
function tcfgSet(el){ const d=tcfgDraft; if(!d) return;
  if(el.dataset.tb){ const [id,f]=el.dataset.tb.split('|'); const b=d.b[id] ||= {}; if(f==='off') b.off=el.checked; else b[f]=el.value; if(!b.title && !b.note && !b.msg && !b.off) delete d.b[id]; return f==='off'; }
  if(el.dataset.tc){ const [i,f]=el.dataset.tc.split('|'), c=d.c[+i]; if(!c) return;
    if(f==='off'){ c.off=el.checked; return true; } if(f==='dueBase'){ c.due={...(c.due||{}), base:el.value}; return true; } if(f==='dueN'){ c.due={...(c.due||{}), n:parseInt(el.value.replace(/\D/g,''))||0}; return false; }
    c[f]=el.value; return false; }
  if(el.dataset.tcc){ const [i,j,f]=el.dataset.tcc.split('|'), q=((d.c[+i]||{}).conds||[])[+j]; if(!q) return; if(f==='k'){ q.k=el.value; const x=TCFG_CONDS.find(y=>y[0]===q.k); q.v = Array.isArray(x&&x[3]) ? x[3][0] : ''; return true; } q.v = el.inputMode==='numeric' ? el.value.replace(/\D/g,'') : el.value; return false; } }
document.addEventListener('input', e=>{ if(!e.target.closest?.('#tcfgModal')) return; if(e.target.tagName!=='SELECT' && e.target.type!=='checkbox') tcfgSet(e.target); });
document.addEventListener('change', e=>{ if(!e.target.closest?.('#tcfgModal')) return; if(tcfgSet(e.target)) tcfgPaint(); });
document.addEventListener('click', async e=>{
  if(e.target.closest?.('#tcfgBtn')){ tcfgOpen(); return; }
  if(!e.target.closest?.('#tcfgModal') || !tcfgDraft) return; const d=tcfgDraft;
  if(e.target.closest('[data-tcfgclose]')){ tcfgClose(); return; }
  const o=e.target.closest('[data-tcfgopen]'); if(o){ tcfgOpenId = tcfgOpenId===o.dataset.tcfgopen ? '' : o.dataset.tcfgopen; tcfgPaint(); return; }
  if(e.target.closest('[data-tcfgadd]')){ const id='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); d.c.push({id, title:'', conds:[], due:{base:'visit', n:3}, note:'', msg:''}); tcfgOpenId=id; tcfgPaint(); setTimeout(()=>document.querySelector(`#tcfgModal [data-tc="${d.c.length-1}|title"]`)?.focus(),0); return; }
  const ca=e.target.closest('[data-tccadd]'); if(ca){ const c=d.c[+ca.dataset.tccadd]; (c.conds ||= []).push({k:'mb', v:''}); tcfgPaint(); return; }
  const cd=e.target.closest('[data-tccdel]'); if(cd){ const [i,j]=cd.dataset.tccdel.split('|'); d.c[+i].conds.splice(+j,1); tcfgPaint(); return; }
  const dl=e.target.closest('[data-tcdel]'); if(dl){ const c=d.c[+dl.dataset.tcdel]; askDelete(`「${String(c.title||'').trim()||'(이름 없는 과업)'}」 새 과업을 삭제할까요? (이미 예약에 생긴 과업은 그대로 남습니다)`, ()=>{ d.c.splice(+dl.dataset.tcdel,1); tcfgPaint(); }); return; }
  if(e.target.closest('[data-tcfgsave]')){
    const bad=d.c.find(c=>!String(c.title||'').trim()); if(bad){ toast('새 과업의 이름을 적어 주세요.'); tcfgOpenId=bad.id; tcfgPaint(); return; }
    d.c.forEach(c=>{ c.title=String(c.title).trim(); c.conds=(c.conds||[]).filter(q=>{ const x=TCFG_CONDS.find(y=>y[0]===q.k); return x && (x[3]!=='num' || q.v!==''); }); });
    Object.values(d.b).forEach(b=>{ ['title','note','msg'].forEach(f=>{ if(b[f]!=null) b[f]=String(b[f]).trim(); }); });
    const btn=e.target.closest('[data-tcfgsave]'); btn.disabled=true;
    try{ const old=(cache||[]).find(x=>x.id===TCFG_ID), now=new Date().toISOString(), me=savedOwner()||'';
      const item={...(old||{}), id:TCFG_ID, callType:TCFG_TYPE, saved:(old&&old.saved)||now, takenBy:me, summary:`추후과업 설정 · 새 과업 ${d.c.length}개`, history:JSON.stringify({b:d.b, c:d.c, at:now, by:me})};
      await store.put(item); const i=cache.findIndex(x=>x.id===TCFG_ID); if(i>=0) cache[i]=item; else cache.push(item);
      tcfgSig=''; tcfgApply(); tcfgClose(); if(typeof renderTasks==='function'){ try{ syncAutoTasks(); }catch(_){} renderTasks(); } if(typeof renderSide==='function') renderSide();
      toast('추후과업 설정을 저장했습니다. 모든 직원에게 같게 적용됩니다.'); }
    catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); }
    finally{ btn.disabled=false; } }
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && $('#tcfgModal') && !$('#tcfgModal').hidden){ e.preventDefault(); e.stopImmediatePropagation(); tcfgClose(); } }, true);
tcfgApply();
