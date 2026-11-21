// ===== 나의 할일 과업 한 줄 (2026-11-21): 시스템 과업(단체 · 개인고객 추후 과업)이든 직접 넣은 업무든 모두 같은 모양 =====
//  [☐ 이름] / [출처 · 구분] [마감] [반복] [＋ 메모] [＋ 세부] [삭제] / 메모 / 세부 과업
//  고치는 팝업 없이 줄 안의 버튼으로 바로: 이름 · 메모를 누르면 그 자리에서 글 칸 → Enter · 칸을 벗어나면 저장, 마감 = 날짜 칸(누르면 달력), 반복 · 구분 = 고르기
//  kind: g = 단체 예약 과업 · p = 개인고객 통화 과업 · e = 직접 넣은 업무(기타 개인 업무)
//  group.js 의 전역(cache · tasksOf · parseHist · store · etcPut · etcMine …)을 씀 → group.js 다음에 불러옴

// ---------- 줄 자료 ----------
function tkFromG(r, t){
  const ds=DOC_SUBS[t.id], subs=[...(ds ? ds.map(([k,l])=>({id:'d:'+k, title:l, done:!!(t.subs||{})[k], fixed:true})) : []), ...(t.xsubs||[]).map(x=>({id:x.id, title:x.title, done:!!x.done}))];
  return { kind:'g', rid:r.id, tid:t.id, day:'', title:t.title, due:t.due||'', done:!!t.done, memo:t.memo||'', subs,
    src:`단체 · ${r.org||r.contact||'(업체 미정)'}${r.date?' · 방문 '+dateLabel(r.date):''}`, srcAttr:`data-myopen="${esc(r.id)}"`, canDel: !!t.custom };
}
function tkFromP(r, t){
  return { kind:'p', rid:r.id, tid:t.id, day:'', title:t.title, due:t.due||'', done:!!t.done, memo:t.memo||'', subs:(t.xsubs||[]).map(x=>({id:x.id, title:x.title, done:!!x.done})),
    src:`개인 · ${r.contact||'(이름 없음)'}${r.date?' · '+dateLabel(String(r.date).slice(0,10)):''}`, srcAttr:`data-popen="${esc(r.id)}"`, canDel:false };
}
function tkFromE(o, day, extra){
  const d=o.d, rep=d.repeat||'none', sd=((d.subDone||{})[day])||{};
  return { kind:'e', rid:o.r.id, tid:'', day:day||'', title:d.title, due: rep==='later' ? '' : (day||''), done:false, memo:d.memo||'', d, rep,
    subs:(d.subs||[]).map(s=>({id:s.id, title:s.title||s.t||'', done:!!sd[s.id]})), canDel:true, ...(extra||{}) };
}
// 마감 순 (마감 없음은 맨 뒤)
const tkSort = list => list.slice().sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999') || String(a.title).localeCompare(String(b.title),'ko'));

// ---------- 줄 그리기 ----------
function tkDueTxt(due){ const today=ymd(new Date()), n=daysFrom(today, due); return n<0 ? `<b class="late">${-n}일 지남</b>` : n===0 ? '<b class="late">오늘</b>' : `${n}일 남음`; }
function tkHTML(T){
  const today=ymd(new Date()), key=esc([T.kind, T.rid, T.tid, T.day].join('|'));
  const cls = T.done ? ' done' : T.due && T.due<today ? ' late' : T.due===today ? ' today' : '';
  const ck = T.done
    ? `<label class="my-ck" title="체크를 풀면 다시 열림"><input type="checkbox" checked ${T.kind==='e' ? `data-etcundo="${esc(T.rid)}|${esc(T.day)}"` : `data-myunck="${T.kind}|${esc(T.rid)}|${esc(T.tid)}"`}></label>`
    : T.kind==='e' ? `<label class="my-ck" title="체크하면 그날 완료"><input type="checkbox" data-etcdone="${esc(T.rid)}|${esc(T.day||today)}"></label>`
    : myCk({r:{id:T.rid}, personal:T.kind==='p'}, {id:T.tid});
  const title = `<button type="button" class="tk-ctl tk-title" data-tkt title="눌러서 이름 고치기">${T.done?`<s>${esc(T.title)}</s>`:esc(T.title)}</button>`;
  if(T.done) return `<li class="tk${cls}" data-tk="${key}"><div class="tk-main">${ck}${title}</div>${T.src?`<div class="tk-meta"><button type="button" class="tk-ctl tk-src" ${T.srcAttr} title="그 예약 · 통화 열기">${esc(T.src)}</button></div>`:''}</li>`;
  const meta=[];
  if(T.kind==='e'){
    meta.push(`<select class="tk-ctl tk-cat" data-tkcat title="구분 바꾸기"><option value="">${ETC_NOCAT}</option>${catOrder().filter(c=>c!==CAT_N).map(c=>`<option value="${esc(c)}"${c===etcCatOf(T.d)?' selected':''}>${esc(catLabel(c))}</option>`).join('')}</select>`);
    meta.push(`<select class="tk-ctl tk-rep" data-tkrep title="반복 바꾸기">${REP_OPTS.map(([k,l])=>`<option value="${k}"${T.rep===k?' selected':''}>${l}</option>`).join('')}</select>`);
    if(T.rep==='weekly') meta.push(`<span class="tk-ctl tk-dows">${[1,2,3,4,5,6,0].map(i=>`<button type="button" class="${(T.d.dows||[]).includes(i)?'on':''}" data-tkdow="${i}">${DOW[i]}</button>`).join('')}</span>`);
    if(T.rep==='monthly') meta.push(`<select class="tk-ctl tk-dom" data-tkdom title="매달 날짜">${Array.from({length:31},(_,i)=>i+1).map(n=>`<option value="${n}"${String(T.d.dom||1)===String(n)?' selected':''}>${n===31?'말일':n+'일'}</option>`).join('')}</select>`);
  } else meta.push(`<button type="button" class="tk-ctl tk-src" ${T.srcAttr} title="그 예약 · 통화 열기">${esc(T.src)}</button>`);
  // 마감: 반복 없음 · 시스템 과업 = 날짜 칸(누르면 달력), 마감 없음 = 빈 날짜 칸, 반복 = 이번 날짜(글자)
  if(T.kind!=='e' || T.rep==='none' || T.rep==='later') meta.push(`<span class="tk-ctl tk-due" title="눌러서 마감 바꾸기">${dboxHTML('data-tkdue', T.due)}${T.due?`<small>${tkDueTxt(T.due)}</small>`:'<small>마감 없음</small>'}</span>`);
  else if(T.day) meta.push(`<span class="tk-when">${esc(opsDateLabel(T.day))} <small>${tkDueTxt(T.day)}</small></span>`);
  if(T.before && T.before.length) meta.push(`<button type="button" class="tk-ctl tk-add etc-past" data-etcpast="${esc(T.rid)}" title="${esc(T.before.map(opsDateLabel).join(', '))}">지난 ${T.before.length}일 모두 완료</button>`);
  if(!T.memo) meta.push(`<button type="button" class="tk-ctl tk-add" data-tkmemo>＋ 메모</button>`);
  meta.push(`<button type="button" class="tk-ctl tk-add" data-tksubadd>＋ 세부</button>`);
  if(T.canDel) meta.push(`<button type="button" class="tk-ctl tk-add tk-del" data-tkdel title="이 과업 삭제">삭제</button>`);
  const n=T.subs.filter(s=>s.done).length;
  return `<li class="tk${cls}" data-tk="${key}"><div class="tk-main">${ck}${title}${T.subs.length?`<small class="tk-cnt">세부 ${n}/${T.subs.length}</small>`:''}</div>`
    + `<div class="tk-meta">${meta.join('')}</div>`
    + (T.memo ? `<div class="tk-ctl tk-memo" data-tkmemo title="눌러서 메모 고치기">${esc(T.memo)}</div>` : '')
    + (T.subs.length ? `<div class="tk-subs">${T.subs.map(s=>`<span class="tk-sub${s.done?' on':''}"><label><input type="checkbox" ${T.kind==='e' ? `data-etcsub="${esc(T.rid)}|${esc(T.day)}|${esc(s.id)}"` : `data-tksub="${esc(s.id)}"`}${s.done?' checked':''}> ${esc(s.title)}</label>${s.fixed?'':`<button type="button" class="tk-ctl tk-subx" ${T.kind==='e' ? `data-etcsubx="${esc(T.rid)}|${esc(s.id)}"` : `data-tksubx="${esc(s.id)}"`} title="세부 과업 빼기">×</button>`}</span>`).join('')}</div>` : '')
    + `</li>`;
}
const tkListHTML = (list, empty) => list.length ? `<ul class="pc-list tk-list">${list.map(tkHTML).join('')}</ul>` : (empty ? `<p class="hint">${empty}</p>` : '');

// ---------- 고치기 (줄 안에서 바로 저장) ----------
const tkKeyOf = el => { const li=el.closest?.('[data-tk]'); if(!li) return null; const [kind,rid,tid,day]=li.dataset.tk.split('|'); return {kind, rid, tid, day, li}; };
async function tkMut(K, fnTask, fnEtc, what){
  const now=new Date().toISOString();
  try{
    if(K.kind==='e'){ const o=etcMine().find(x=>x.r.id===K.rid); if(!o) return; const d=JSON.parse(JSON.stringify(o.d)); if(fnEtc(d)===false) return; await etcPut(o.r, d, what+' (나의 할일)'); return; }   // etcPut 이 다시 그림
    const r=cache.find(x=>x.id===K.rid); if(!r) return;
    if(K.kind==='g'){
      if(editingId===K.rid){ let t=tasks.find(x=>x.id===K.tid); if(!t){ const b=tasksOf(r).find(x=>x.id===K.tid); if(!b) return; t={...b}; tasks.push(t); } if(fnTask(t, now)===false) return; renderTasks(); await save({auto:true}); }
      else { const ph=parseHist(r); let t=ph.tasks.find(x=>x.id===K.tid); if(!t){ const b=tasksOf(r).find(x=>x.id===K.tid); if(!b) return; t={...b, memo:b.memo||'', at:now}; ph.tasks.push(t); }
        if(fnTask(t, now)===false) return; ph.h.push({t:now, by:savedOwner()||'', what:`[과업] ${t.title} ${what}`});
        const item={...r, history:JSON.stringify({h:ph.h, tasks:ph.tasks, erp:ph.erp, memos:ph.memos}), saved:now}; await store.put(item); const i=cache.findIndex(x=>x.id===r.id); if(i>=0) cache[i]=item; }
    } else {
      let h={}; try{ h=JSON.parse(r.history||'{}')||{}; }catch(_){} const t=(h.tasks||[]).find(x=>x.id===K.tid); if(!t) return; if(fnTask(t, now)===false) return;
      const item={...r, history:JSON.stringify(h)}; await store.put(item); const i=cache.findIndex(x=>x.id===r.id); if(i>=0) cache[i]=item;
    }
    renderMy(); if(typeof paintMyCount==='function') paintMyCount();
  }catch(err){ toast('저장하지 못했습니다: '+(err.code||err.message)); renderMy(); }
}
// 세부 과업을 모두 체크하면 완료, 하나라도 풀면 (위 체크로 끝낸 것이 아니면) 다시 열림 — 단체 화면과 같은 규칙
function tkSubsDone(t, now){ const ds=DOC_SUBS[t.id], st=[...(ds ? ds.map(([k])=>!!(t.subs||{})[k]) : []), ...(t.xsubs||[]).map(x=>!!x.done)]; if(!st.length) return;
  const all=st.every(Boolean); if(all && !t.done){ t.done=true; t.doneAt=now; } if(!all && t.done && !t.manualDone){ t.done=false; t.doneAt=''; } }

// 이름 · 메모 · 세부 과업 추가: 누르면 그 자리에 글 칸
function tkInline(el, {value='', multi=false, placeholder='', save}){
  const inp=document.createElement(multi?'textarea':'input'); inp.className='tk-in'+(multi?' tk-in-memo':''); inp.value=value; inp.placeholder=placeholder; inp.setAttribute('data-ime','ko'); if(multi) inp.rows=2;
  el.replaceWith(inp); inp.focus(); try{ const n=inp.value.length; inp.setSelectionRange(n,n); }catch(_){}
  let done=false; const finish = async ok => { if(done) return; done=true; const v=inp.value.trim(); if(ok && v!==String(value).trim()) await save(v); else renderMy(); };
  inp.addEventListener('keydown', e=>{ if(e.isComposing) return; if(e.key==='Escape'){ e.preventDefault(); finish(false); } else if(e.key==='Enter' && (!multi || e.ctrlKey || e.metaKey)){ e.preventDefault(); finish(true); } });
  inp.addEventListener('blur', ()=>finish(true));
}
document.addEventListener('click', e=>{
  const t=e.target; if(!t.closest?.('.tk')) return;
  const K=tkKeyOf(t); if(!K) return;
  const tt=t.closest('[data-tkt]'); if(tt){ e.preventDefault(); e.stopPropagation(); const cur=(tt.textContent||'').trim();
    tkInline(tt, {value:cur, placeholder:'과업 이름', save: v=>{ if(!v){ toast('이름을 적어 주세요.'); renderMy(); return; } return tkMut(K, x=>{ x.title=v; x.titleSet=1; }, d=>{ d.title=v; }, `이름 → ${v}`); }}); return; }
  const mm=t.closest('[data-tkmemo]'); if(mm){ e.preventDefault(); e.stopPropagation(); const cur=mm.classList.contains('tk-memo') ? mm.textContent : '';
    const box=document.createElement('div'); K.li.appendChild(box); if(!mm.classList.contains('tk-memo')) mm.remove();
    tkInline(mm.classList.contains('tk-memo') ? mm : box, {value:cur, multi:true, placeholder:'메모 (Ctrl+Enter 또는 칸 밖을 누르면 저장)', save: v=>tkMut(K, x=>{ x.memo=v; }, d=>{ d.memo=v; }, v?'메모 고침':'메모 지움')}); return; }
  const sa=t.closest('[data-tksubadd]'); if(sa){ e.preventDefault(); e.stopPropagation(); const box=document.createElement('div'); K.li.appendChild(box);
    tkInline(box, {placeholder:'세부 과업 (Enter)', save: v=>{ if(!v){ renderMy(); return; } const id='x'+Date.now().toString(36);
      return tkMut(K, (x, now)=>{ x.xsubs=[...(x.xsubs||[]), {id, title:v, done:false}]; tkSubsDone(x, now); }, d=>{ d.subs=[...(d.subs||[]), {id:'s'+Date.now().toString(36), title:v}]; }, `세부 과업 추가: ${v}`); }}); return; }
  const sx=t.closest('[data-tksubx]'); if(sx){ e.preventDefault(); e.stopPropagation(); const sid=sx.dataset.tksubx;
    tkMut(K, (x, now)=>{ x.xsubs=(x.xsubs||[]).filter(s=>s.id!==sid); tkSubsDone(x, now); }, ()=>false, '세부 과업 빼기'); return; }
  const dw=t.closest('[data-tkdow]'); if(dw){ e.preventDefault(); e.stopPropagation(); const i=+dw.dataset.tkdow;
    tkMut(K, ()=>false, d=>{ const s=d.dows||[]; const n=s.includes(i) ? s.filter(x=>x!==i) : [...s, i]; if(!n.length){ toast('요일을 하나 이상 골라 주세요.'); return false; } d.dows=n; }, '요일 바꿈'); return; }
  const dl=t.closest('[data-tkdel]'); if(dl){ e.preventDefault(); e.stopPropagation();
    if(K.kind==='e'){ const o=etcMine().find(x=>x.r.id===K.rid); if(!o) return;
      askDelete(`「${o.d.title}」 업무를 삭제할까요? (반복 업무면 앞으로의 날짜도 모두 없어집니다)`, async()=>{ await store.del(K.rid); cache=cache.filter(x=>x.id!==K.rid); renderMy(); if(typeof paintMyCount==='function') paintMyCount(); toast(`「${o.d.title}」 삭제했습니다.`); }); return; }
    askDelete('이 과업을 삭제할까요?', ()=>tkMut(K, x=>{ x.removed=true; }, ()=>false, '삭제')); return; }
});
document.addEventListener('change', e=>{
  const t=e.target; if(!t.closest?.('.tk')) return; const K=tkKeyOf(t); if(!K) return;
  if(t.dataset.tksub!=null){ const sid=t.dataset.tksub, on=t.checked;
    tkMut(K, (x, now)=>{ if(/^d:/.test(sid)){ const k=sid.slice(2); x.subs={...(x.subs||Object.fromEntries((DOC_SUBS[x.id]||[]).map(([a])=>[a,false]))), [k]:on}; } else (x.xsubs||[]).forEach(s=>{ if(s.id===sid) s.done=on; }); tkSubsDone(x, now); }, ()=>false, on?'세부 과업 체크':'세부 과업 해제'); return; }
  if(t.hasAttribute('data-tkdue')){ const v=t.value; if(!v) return;
    tkMut(K, (x, now)=>{ x.due=v; x.dueSet=1; x.dueSetAt=now; }, d=>{ if(d.repeat==='later' || !d.repeat) d.repeat='none'; d.due=v; }, `마감 → ${v}`); return; }
  if(t.dataset.tkcat!=null){ const v=t.value; tkMut(K, ()=>false, d=>{ if(v) d.list=v; else delete d.list; }, `구분 → ${v?catLabel(v):ETC_NOCAT}`); return; }
  if(t.dataset.tkdom!=null){ const v=t.value; tkMut(K, ()=>false, d=>{ d.dom=String(v); }, `매달 ${v}일`); return; }
  if(t.dataset.tkrep!=null){ const v=t.value;
    tkMut(K, ()=>false, d=>{ d.repeat=v; if(v==='weekly' && !(d.dows||[]).length) d.dows=[new Date().getDay()]; if(v==='monthly' && !d.dom) d.dom=String(new Date().getDate()); if(v!=='none' && v!=='later' && !d.start) d.start=todayYmd(); if(v==='none' && !d.due) d.due=d.start||todayYmd(); }, `반복 → ${(REP_OPTS.find(o=>o[0]===v)||[])[1]||v}`); return; }
});
