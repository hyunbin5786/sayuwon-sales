// ===== 예약 취소 요청 (cancel.html · 2026-11-19) =====
// 직원이 취소 담당자에게 예약 취소 처리를 부탁하는 요청서 (예전 엑셀 「사유원 예약 취소 요청」을 옮김)
//  ① 취소 요청하기: 방문일 · 예약 사이트 · 예약자 이름 · 연락처 · 예약 번호 · 취소 내용(전체 환불 / 부분 취소 + 자세히) · 취소 사유(고르기 + 자세히) · 증빙 서류 · 환불 계좌(가상계좌일 때) · 요청자 = 로그인 이름
//  ② 요청 목록 · 처리: 처리 전 / 처리 완료 / 전체 · 찾기 · 「처리 완료」(처리 메모 · 처리한 사람 · 시각) · 「되돌리기」 · 「엑셀 불러오기」(예전 엑셀 줄을 더함)
//  저장: 공유 기록(calls) 통화 구분 「취소요청」, 4만 자씩 나눠 id cxreq0 · cxreq1 … ({part, of, at, rows:[요청…]}). 저장 직전 최신 목록을 다시 받아 그 위에 반영
(function(){
  const $ = s => document.querySelector(s), esc = SY.esc;
  const user = SY.user() || {}; $('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
  let toastT; const toast = (m, ms=2600) => { const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), ms); };
  const st = (txt, cls) => { const el=$('#st'); el.textContent=txt; el.className='save-st '+(cls||''); };
  async function callApi(body){ const r=await fetch(SY.API_URL,{method:'POST',body:JSON.stringify({...body,key:SY.getKey()})}); const j=await r.json(); if(!j.ok){ const e=new Error(j.error||'error'); e.code=j.error; throw e; } return j; }
  const TYPE='취소요청', PART=i=>'cxreq'+i, MAXC=40000;
  const digits = s => String(s||'').replace(/\D/g,'');
  const newId = () => 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const atLab = iso => { const x=new Date(iso||''); return isNaN(x) ? '' : `${x.getMonth()+1}/${x.getDate()}(${SY.DOW[x.getDay()]}) ${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`; };
  const dLab = d => /^\d{4}-\d{2}-\d{2}$/.test(d||'') ? SY.dateDisp(d) : (d||'');
  let reqs=[], loaded=false, busy=false, tab='req', flt='open';

  // ---------- 받기 · 저장 (나눠 저장) ----------
  function fromItems(items){
    const ps=(items||[]).filter(x=>x.callType===TYPE && /^cxreq\d+$/.test(x.id||'')).map(x=>{ let j=null; try{ j=JSON.parse(x.history||'null'); }catch(_){} return j && Array.isArray(j.rows) ? {...j, id:x.id} : null; }).filter(Boolean);
    if(!ps.length) return {rows:[], parts:[]};
    const at=ps.map(p=>String(p.at||'')).sort().pop();
    return { rows: ps.filter(p=>String(p.at||'')===at).sort((a,b)=>a.part-b.part).flatMap(p=>p.rows), parts: ps.map(p=>p.id) };
  }
  const fetchAll = async () => fromItems((await callApi({action:'list'})).items);
  async function saveAll(list){
    const at=new Date().toISOString(), by=user.name||'', packs=[]; let cur=[], size=0;
    list.forEach(r=>{ const n=JSON.stringify(r).length+1; if(size+n>MAXC && cur.length){ packs.push(cur); cur=[]; size=0; } cur.push(r); size+=n; });
    if(cur.length || !packs.length) packs.push(cur);
    const old=(await fetchAll()).parts;
    for(let i=0;i<packs.length;i++) await callApi({action:'put', item:{id:PART(i), callType:TYPE, saved:at, takenBy:by, owner:by, summary:`예약 취소 요청 ${i+1}/${packs.length} · ${list.length}건 · 처리 전 ${list.filter(r=>!r.done).length}건`, history:JSON.stringify({part:i, of:packs.length, at, rows:packs[i]})}});
    for(const id of old) if(+id.slice(5)>=packs.length) await callApi({action:'del', id});
    reqs=list;
  }
  async function change(fn, okMsg){
    if(busy) return false; if(!SY.getKey()){ $('#keyBox').hidden=false; toast('팀 비밀번호를 먼저 넣어 주세요.'); return false; }
    busy=true; st('저장 중…', 'wait');
    try{ await saveAll(fn((await fetchAll()).rows)); render(); st(`저장됨 ${new Date().toTimeString().slice(0,5)}`, 'ok'); if(okMsg) toast(okMsg); return true; }
    catch(e){ st('저장 못 함 — 다시 해 주세요', 'bad'); toast(e.code==='bad_key' ? '팀 비밀번호가 맞지 않습니다.' : '저장하지 못했습니다: '+(e.code||e.message)); return false; }
    finally{ busy=false; }
  }
  async function load(){
    if(!SY.getKey()){ $('#keyBox').hidden=false; return; }
    try{ reqs=(await fetchAll()).rows; loaded=true; $('#keyBox').hidden=true; render(); }
    catch(e){ if(e.code==='bad_key'){ $('#keyBox').hidden=false; toast('팀 비밀번호가 맞지 않습니다.'); } else st('불러오지 못함 — 잠시 뒤 다시 열어 주세요', 'bad'); }
  }

  // ---------- 탭 ----------
  function setTab(t){ tab=t; document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.classList.toggle('on', b.dataset.tab===t)); $('#pReq').hidden=t!=='req'; $('#pList').hidden=t!=='list'; try{ localStorage.setItem('sy_cx_tab', t); }catch(_){} render(); }
  document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));

  // ---------- ① 요청하기 ----------
  const segVal = id => ($(`#${id} button.on`)||{}).dataset?.v || '';
  const chipVals = () => [...document.querySelectorAll('#fWhy button.on')].map(b=>b.dataset.v);
  document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('.seg button, .chips button'); if(!b) return;
    const box=b.parentElement; if(box.classList.contains('chips')) b.classList.toggle('on'); else { box.querySelectorAll('button').forEach(x=>x.classList.toggle('on', x===b)); if(box.id==='flt'){ flt=b.dataset.v; render(); } } });
  $('#fVa').addEventListener('change', e=>{ $('#fAccBox').hidden=!e.target.checked; if(e.target.checked) $('#fAcc').focus(); });
  $('#fPhone').addEventListener('input', e=>{ if(SY.phoneTyping) SY.phoneTyping(e.target, e.inputType); });
  function resetForm(){ ['fDate','fName','fPhone','fNo','fAmt','fWhyTxt','fAcc'].forEach(id=>$('#'+id).value=''); $('#fVa').checked=false; $('#fAccBox').hidden=true;
    [['fSite','홈페이지'],['fKind','전체 환불'],['fDoc','']].forEach(([id,v])=>document.querySelectorAll(`#${id} button`).forEach(b=>b.classList.toggle('on', b.dataset.v===v)));
    document.querySelectorAll('#fWhy button').forEach(b=>b.classList.remove('on')); }
  $('#fReset').onclick=resetForm;
  $('#fSend').onclick=async()=>{
    const r={ id:newId(), at:new Date().toISOString(), by:user.name||'', date:$('#fDate').value, site:segVal('fSite'), name:$('#fName').value.trim(), phone:$('#fPhone').value.trim(), no:$('#fNo').value.trim(),
      kind:segVal('fKind'), amt:$('#fAmt').value.trim(), why:chipVals().join(', '), doc:segVal('fDoc'), whyTxt:$('#fWhyTxt').value.trim(), acc:$('#fVa').checked ? $('#fAcc').value.trim() : '', done:null };
    const miss=[!r.date&&'방문일', !r.name&&'예약자 이름', !r.no&&!r.phone&&'예약 번호(또는 연락처)', !r.why&&!r.whyTxt&&'취소 사유', r.kind==='부분 취소'&&!r.amt&&'부분 취소 자세히', $('#fVa').checked&&!r.acc&&'환불 계좌'].filter(Boolean);
    if(miss.length){ toast(`${miss.join(' · ')}을(를) 적어 주세요.`, 3200); return; }
    if(await change(list=>[r, ...list], `「${r.name}」 취소 요청을 보냈습니다. 취소 담당자가 처리하면 목록에 「처리 완료」로 바뀝니다.`)){ resetForm(); }
  };

  // ---------- ② 목록 · 처리 ----------
  function render(){
    const nOpen=reqs.filter(r=>!r.done).length; $('#openN').textContent = nOpen ? nOpen : '';
    if(!loaded){ $('#list').innerHTML='<p class="hint">팀 비밀번호를 넣으면 요청 목록이 보입니다.</p>'; return; }
    const q=$('#q').value.trim().replace(/\s/g,'').toLowerCase(), qd=digits(q);
    const list=reqs.filter(r=>(flt==='all' || (flt==='open' ? !r.done : !!r.done)) && (!q || [r.name,r.no,r.by,r.whyTxt,r.amt].join('').replace(/\s/g,'').toLowerCase().includes(q) || (qd.length>=3 && digits(r.phone+r.no).includes(qd))))
      .sort((a,b)=> flt==='open' ? String(a.at||'').localeCompare(String(b.at||'')) : String(b.done?.at||b.at||'').localeCompare(String(a.done?.at||a.at||'')));   // 처리 전 = 오래된 요청부터
    $('#sum').textContent = `처리 전 ${nOpen}건 · 전체 ${reqs.length}건${q?` · 찾은 ${list.length}건`:''}`;
    $('#list').innerHTML = list.length ? list.map(card).join('') : `<p class="hint">${flt==='open'?'처리할 취소 요청이 없습니다.':'요청이 없습니다.'}</p>`;
  }
  function card(r){
    const why=[r.why, r.whyTxt].filter(Boolean).join(' · ');
    return `<div class="cx-card${r.done?' done':''}" data-id="${esc(r.id)}"><div class="cx-main-col">`
      + `<div class="cx-h"><span class="tag">${esc(r.site||'-')}</span> <b>${esc(r.name||'(이름 없음)')}</b>${r.phone?` · ${esc(r.phone)}`:''}${r.no?` · <button type="button" class="cx-no" data-copy="${esc(r.no)}" title="예약 번호 복사">${esc(r.no)}</button>`:''} <span class="cx-date">방문 ${esc(dLab(r.date))}</span></div>`
      + `<div class="cx-l"><span>취소</span><b class="${r.kind==='전체 환불'?'all':''}">${esc(r.kind||'')}</b>${r.amt?` ${esc(r.amt)}`:''}</div>`
      + (why ? `<div class="cx-l"><span>사유</span>${esc(why)}${r.doc?` <i class="doc">서류 ${esc(r.doc)}</i>`:''}</div>` : '')
      + (r.acc ? `<div class="cx-l"><span>환불 계좌</span>${esc(r.acc)}</div>` : '')
      + `<div class="cx-l sub"><span>요청</span>${esc(r.by||'')}${r.at?` · ${esc(atLab(r.at))}`:''}</div></div>`
      + `<div class="cx-side">${r.done
          ? `<div class="cx-done">✓ 처리 완료${r.done.at?` <small>${esc(atLab(r.done.at))}</small>`:''}${r.done.by?`<br><small>${esc(r.done.by)}</small>`:''}${r.done.memo?`<br><small>${esc(r.done.memo)}</small>`:''}</div><button type="button" class="btn sm" data-undo="${esc(r.id)}">되돌리기</button>`
          : `<input class="cx-memo" data-memo="${esc(r.id)}" data-ime="ko" placeholder="처리 메모 (선택)"><button type="button" class="btn primary" data-done="${esc(r.id)}">처리 완료</button>`}</div></div>`;
  }
  $('#q').addEventListener('input', render);
  let askFn=null;
  const ask = (html, yes, fn) => { $('#askMsg').innerHTML=html; $('#askYes').textContent=yes; askFn=fn; $('#askModal').hidden=false; setTimeout(()=>$('#askNo').focus(),0); };
  $('#askNo').onclick=()=>{ $('#askModal').hidden=true; askFn=null; };
  $('#askYes').onclick=()=>{ $('#askModal').hidden=true; const f=askFn; askFn=null; if(f) f(); };
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#askModal').hidden){ $('#askModal').hidden=true; askFn=null; } });
  document.addEventListener('click', async e=>{
    const cp=e.target.closest && e.target.closest('[data-copy]'); if(cp){ try{ await navigator.clipboard.writeText(cp.dataset.copy); toast('예약 번호를 복사했습니다.'); }catch(_){} return; }
    const d=e.target.closest && e.target.closest('[data-done]'); if(d){ const r=reqs.find(x=>x.id===d.dataset.done); if(!r) return; const memo=(document.querySelector(`[data-memo="${CSS.escape(r.id)}"]`)||{}).value?.trim()||'';
      ask(`<p><b>${esc(r.name)}</b> (${esc(r.no||r.phone||'')}) 취소 요청을 <b>처리 완료</b>로 표시할까요?</p>${memo?`<p class="hint">메모: ${esc(memo)}</p>`:''}`, '처리 완료',
        ()=>change(list=>list.map(x=>x.id===r.id ? {...x, done:{at:new Date().toISOString(), by:user.name||'', memo}} : x), `「${r.name}」 처리 완료로 표시했습니다.`)); return; }
    const u=e.target.closest && e.target.closest('[data-undo]'); if(u){ const r=reqs.find(x=>x.id===u.dataset.undo); if(!r) return;
      ask(`<p><b>${esc(r.name)}</b> 취소 요청을 다시 <b>처리 전</b>으로 돌릴까요?</p>`, '되돌리기', ()=>change(list=>list.map(x=>x.id===r.id ? {...x, done:null} : x), '처리 전으로 돌렸습니다.')); }
  });

  // ---------- 예전 엑셀 불러오기 (줄을 더함 · 같은 예약 번호 + 이름은 건너뜀) ----------
  const toYmd = v => { if(v==null || v==='') return ''; if(typeof v==='number'){ const p=XLSX.SSF.parse_date_code(v); return p ? `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}` : String(v); }
    const m=String(v).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` : String(v).trim(); };
  function parseXl(buf){
    const wb=XLSX.read(buf, {type:'array'}), A=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1, raw:true, defval:''});
    const hi=A.findIndex(r=>r.some(c=>/예약자\s*이름/.test(String(c)))); if(hi<0) throw new Error('머리줄(예약자 이름 · 예약 번호 …)을 찾지 못했습니다.');
    const H=A[hi].map(c=>String(c).replace(/\s/g,'')), ix=re=>H.findIndex(h=>re.test(h));
    const C={at:ix(/^요청날짜/), date:ix(/^방문일/), site:ix(/^예약사이트/), name:ix(/^예약자이름/), phone:ix(/^예약자연락처/), no:ix(/^예약번호/), amt:ix(/^취소내용/), why:ix(/^취소사유/), by:ix(/^요청자/), done:ix(/^처리/), acc:ix(/^환불계좌/)};
    const g=(r,k)=>C[k]>=0 ? String(r[C[k]]??'').trim() : '';
    return A.slice(hi+1).map((r,i)=>{ const name=g(r,'name'), no=g(r,'no'); if(!name && !no) return null;
      if(name==='홍길동' && digits(g(r,'phone'))==='01012345678') return null;   // 엑셀 맨 위 보기 줄
      const amt=g(r,'amt'), dn=g(r,'done'), at=C.at>=0 ? toYmd(r[C.at]) : '';
      return { id:newId()+i.toString(36), at: at ? at+'T09:00:00' : '', by:g(r,'by'), date:C.date>=0 ? toYmd(r[C.date]) : '', site:g(r,'site').replace(/^홈페이$/,'홈페이지'), name, phone:g(r,'phone'), no,
        kind: /전체|전제/.test(amt) ? '전체 환불' : '부분 취소', amt, why:'', doc:'', whyTxt:g(r,'why'), acc:g(r,'acc'),
        done: /처리\s*완료|완료/.test(dn) ? {at:'', by:'', memo:dn} : null, ...( !/완료/.test(dn) && dn ? {note:dn} : {}) };
    }).filter(Boolean);
  }
  $('#xlBtn').onclick=()=>{ if(!SY.getKey()){ $('#keyBox').hidden=false; toast('팀 비밀번호를 먼저 넣어 주세요.'); return; } $('#xlFile').click(); };
  $('#xlFile').addEventListener('change', async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    let add; try{ add=parseXl(await f.arrayBuffer()); }catch(err){ toast('엑셀을 읽지 못했습니다: '+(err.message||err), 4000); return; }
    const key=r=>(r.no+'|'+r.name).replace(/\s/g,''), have=new Set(reqs.map(key)), fresh=add.filter(r=>!have.has(key(r)));
    if(!fresh.length){ toast(add.length ? '엑셀의 요청이 이미 모두 목록에 있습니다.' : '엑셀에서 요청 줄을 찾지 못했습니다.'); return; }
    ask(`<p>엑셀에서 <b>${add.length}건</b>을 읽었습니다. 목록에 없는 <b>${fresh.length}건</b>을 더할까요?</p><p class="hint">처리 여부 칸에 「완료」가 있으면 처리 완료로 넣습니다.</p>`, '더하기',
      ()=>change(list=>{ const h=new Set(list.map(key)); return [...list, ...fresh.filter(r=>!h.has(key(r)))]; }, `${fresh.length}건을 목록에 더했습니다.`)); });

  // ---------- 팀 비밀번호 · 시작 ----------
  $('#keyBtn').onclick=()=>{ const v=$('#keyIn').value.trim(); if(!v) return; try{ localStorage.setItem(SY.KEY_LS||'sayuwon_intake_key', v); }catch(_){} $('#keyIn').value=''; load(); };
  $('#keyIn').addEventListener('keydown', e=>{ if(e.key==='Enter') $('#keyBtn').click(); });
  let t0='req'; try{ t0=localStorage.getItem('sy_cx_tab')||'req'; }catch(_){} if(/[?&]tab=list/.test(location.search)) t0='list';
  setTab(t0); load();
  setInterval(()=>{ if(!document.hidden && loaded && !busy) fetchAll().then(r=>{ const ae=document.activeElement; if(ae && ae.classList.contains('cx-memo')) return; reqs=r.rows; render(); }).catch(()=>{}); }, 30000);   // 30초마다 새 요청 · 처리 받아 옴
})();
