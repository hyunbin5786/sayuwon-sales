// ===== 함께 고치는 표 (2026-11-24 · 기업 프로모션 할인 promo.html · 협업 여행사 할인 agency.html 이 같이 씀) =====
// 공유 기록(calls) 한 줄에 표 전체 {rows:[{id, …칸}], …그 밖의 값, log:[{at, by, what}]} — 칸을 눌러 바로 고치기(Enter 저장 · Shift+Enter 줄바꿈 · Esc 되돌리기) · ＋ 추가 · × 삭제(확인)
//  고칠 때마다 최신을 받아 그 위에 (여러 명이 같이 고쳐도 덮어쓰지 않게) · 다른 컴퓨터에서 바뀌면 바로 다시 받음 (SY.live.onRev)
//  아직 아무도 고치지 않았으면 cfg.seed(처음 내용)를 보여 주고 처음 고칠 때 함께 저장
//  syTable({ id, type, cols:[{k, l, cls}], seed:[…], sort(a,b), extraHead, extraCell(r), onData(data) , el:{table, add, q, st, sum, log} })
//   → { data(), change(fn(data)→data|null, what), render() }
window.syTable = function(cfg){
  const $ = s => document.querySelector(s), esc = SY.esc, user = SY.user() || {};
  const E = cfg.el;
  const st = (t, c) => { const el=$(E.st); if(el){ el.textContent=t; el.className='save-st '+(c||''); } };
  const toast = cfg.toast || (m=>alert(m));
  let data = {rows:(cfg.seed||[]).map(r=>({...r}))}, saved=false, busy=false;
  const fromItems = items => { const it=(items||[]).find(x=>x.id===cfg.id && !x.deleted); let h=null; try{ h=JSON.parse((it && it.history)||'null'); }catch(_){}
    return it && h && Array.isArray(h.rows) ? {data:h, item:it} : {data:{rows:(cfg.seed||[]).map(r=>({...r})), log:[]}, item:null}; };
  async function fetchNow(){ const j=await SY.list(); return fromItems(j.items); }
  async function load(quiet){ if(!quiet) st('불러오는 중…','wait');
    try{ const r=await fetchNow(); data=r.data; saved=!!r.item; st('',''); render(); if(cfg.onData) cfg.onData(data); }
    catch(e){ st(e.code==='bad_key' ? SY.authFail() : '불러오지 못함 — 잠시 뒤 다시','bad'); render(); } }
  async function change(fn, what){
    if(busy) return false; busy=true; st('저장 중…','wait');
    try{ const cur=await fetchNow(), next=fn(JSON.parse(JSON.stringify(cur.data))); if(!next){ st('',''); return false; }
      const now=new Date().toISOString(); next.log=[...(cur.data.log||[]), {at:now, by:user.name||'', what}].slice(-200);
      const item={...(cur.item||{}), id:cfg.id, callType:cfg.type, saved:(cur.item && cur.item.saved)||now, takenBy:user.name||'', owner:'', summary:`${cfg.type} ${next.rows.length}개 · ${what}`.slice(0,120), history:JSON.stringify(next)};
      delete item.date; delete item.org;
      await SY.call({action:'put', item}); SY.live.post({t:'put', item});
      data=next; saved=true; render(); if(cfg.onData) cfg.onData(data); st(`저장됨 ${new Date().toTimeString().slice(0,5)}`,'ok'); return true; }
    catch(e){ st('저장 못 함','bad'); toast(e.code==='bad_key' ? SY.authFail() : '저장하지 못했습니다: '+(e.code||e.message)); return false; }
    finally{ busy=false; } }
  const cellHtml = v => esc(v||'');
  function render(){
    const tb=$(E.table); if(!tb) return;
    const q=String(($(E.q)||{}).value||'').replace(/\s/g,'').toLowerCase();
    let L=data.rows.slice(); if(cfg.sort) L.sort(cfg.sort);
    if(q) L=L.filter(r=>cfg.cols.map(c=>r[c.k]||'').join(' ').replace(/\s/g,'').toLowerCase().includes(q));
    if(E.sum && $(E.sum)) $(E.sum).textContent = `${data.rows.length}개${q?` · 찾은 ${L.length}개`:''}`;
    tb.innerHTML = `<thead><tr>${cfg.cols.map(c=>`<th class="c-${c.k}">${c.l}</th>`).join('')}${cfg.extraHead||''}<th></th></tr></thead><tbody>`
      + (L.length ? L.map(r=>`<tr data-sid="${esc(r.id)}">${cfg.cols.map(c=>`<td class="c-${c.k} ${c.cls||''}" data-k="${c.k}" data-l="${esc(c.l)}" contenteditable="plaintext-only" spellcheck="false">${cellHtml(r[c.k])}</td>`).join('')}${cfg.extraCell ? cfg.extraCell(r) : ''}<td class="sx"><button type="button" class="st-x" data-sdel="${esc(r.id)}" title="이 줄 삭제">×</button></td></tr>`).join('')
        : `<tr><td colspan="${cfg.cols.length+2}" class="empty">${q?'찾은 것이 없습니다.':'아직 없습니다. 「＋ 추가」를 눌러 주세요.'}</td></tr>`) + `</tbody>`;
    const lg=(data.log||[]).slice(-1)[0]; if(E.log && $(E.log)) $(E.log).textContent = lg ? `마지막 수정: ${new Date(lg.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${lg.by||''} · ${lg.what||''}` : (saved ? '' : '처음 내용 · 아직 고친 사람 없음');
    if(cfg.afterRender) cfg.afterRender(data);
  }
  // 칸 고치기
  const inTbl = el => el && el.closest && el.closest(E.table+' td[data-k]');
  document.addEventListener('focusin', e=>{ const td=inTbl(e.target); if(td) td.dataset.before=td.textContent; });
  document.addEventListener('keydown', e=>{ const td=inTbl(e.target); if(!td) return;
    if(e.key==='Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); td.blur(); }
    if(e.key==='Escape'){ td.textContent=td.dataset.before||''; td.blur(); } });
  document.addEventListener('focusout', async e=>{ const td=inTbl(e.target); if(!td) return;
    const v=td.innerText.replace(/ /g,' ').replace(/\n+$/,'').trim(), k=td.dataset.k, id=td.closest('tr').dataset.sid, r=data.rows.find(x=>x.id===id);
    if(!r || (r[k]||'')===v){ if(r) td.textContent=r[k]||''; return; }
    const name=r[cfg.nameKey||cfg.cols[0].k]||'';
    const ok=await change(d=>{ const x=d.rows.find(y=>y.id===id); if(!x){ toast('그사이 다른 분이 이 줄을 지웠습니다.'); return null; } x[k]=v; return d; }, `고침: ${String(name).split('\n')[0]} · ${td.dataset.l}`);
    if(!ok) td.textContent=r[k]||''; });
  // 추가 · 삭제
  if(E.add && $(E.add)) $(E.add).onclick=async()=>{ const id='s'+Date.now().toString(36); const blank=Object.fromEntries(cfg.cols.map(c=>[c.k, ''])); Object.assign(blank, cfg.blank||{}, {id});
    if(await change(d=>{ d.rows.push(blank); return d; }, '추가')){ if(E.q && $(E.q)) $(E.q).value=''; render();
      const td=document.querySelector(`${E.table} tr[data-sid="${id}"] td[data-k]${cfg.focusKey?`[data-k="${cfg.focusKey}"]`:''}`); if(td){ td.scrollIntoView({block:'center'}); td.focus(); } } };
  document.addEventListener('click', e=>{ const d=e.target.closest && e.target.closest(E.table+' [data-sdel]'); if(!d) return; const r=data.rows.find(x=>x.id===d.dataset.sdel); if(!r) return;
    const name=String(r[cfg.nameKey||cfg.cols[0].k]||'이 줄').split('\n')[0];
    (cfg.ask||((m,f)=>{ if(confirm(m.replace(/<[^>]+>/g,''))) f(); }))(`「<b>${esc(name)}</b>」을(를) 삭제할까요? (팀이 함께 보는 표에서 빠집니다)`, ()=>change(dd=>{ dd.rows=dd.rows.filter(x=>x.id!==r.id); return dd; }, `삭제: ${name}`)); });
  if(E.q && $(E.q)) $(E.q).addEventListener('input', render);
  load();
  SY.live.onRev(()=>{ if(!inTbl(document.activeElement) && !busy) load(true); });
  return { data:()=>data, change, render, reload:()=>load(true) };
};
