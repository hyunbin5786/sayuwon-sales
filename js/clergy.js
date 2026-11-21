// ===== 대구대교구 무료입장 명부 (clergy.html · 2026-11-19) =====
// 천주교 대구대교구 수녀 · 신부 · 신학생 무료입장(연 2회) 명부. 팀 공유: 공유 기록(calls) 통화 구분 「무료입장명부」
//  저장: 한 줄(시트 칸)에 5만 자까지라 4만 자씩 나눠 id clergy0 · clergy1 … ({part, of, at, rows:[[id, 방문일, 소속, 이름, 직책, 연락처, 비고, 회차]]})
//  - 「엑셀 불러오기」: 명부 엑셀(머리줄에 방문일 · 소속 · 이름 · 직책 · 연락처 · 비고 · 회차)을 읽어 명부를 그 내용으로 바꿈 (확인 팝업)
//  - 「＋ 새로 추가」: 한 줄 추가 (회차는 올해 그 사람 방문 수로 채움) · 줄 끝 × 로 지우기 (확인 팝업)
//  - 추가 · 지우기는 저장 직전에 최신 명부를 다시 받아 그 위에 반영 (여러 명이 같이 써도 덮어쓰지 않게)
(function(){
  const $ = s => document.querySelector(s), esc = SY.esc;
  const user = SY.user() || {}; $('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
  let toastT; const toast = (m, ms=2600) => { const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), ms); };
  const st = (txt, cls) => { const el=$('#st'); el.textContent=txt; el.className='save-st '+(cls||''); };
  async function callApi(body){ const r=await fetch(SY.API_URL,{method:'POST',body:JSON.stringify({...body,key:SY.getKey()})}); const j=await r.json(); if(!j.ok){ const e=new Error(j.error||'error'); e.code=j.error; throw e; } return j; }
  const TYPE='무료입장명부', PART=i=>'clergy'+i, MAXC=40000;
  const digits = s => String(s||'').replace(/\D/g,'');
  const newId = () => 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  let rows=[], loaded=false, busy=false;

  // ---------- 받기 · 저장 ----------
  function fromItems(items){
    const ps=(items||[]).filter(x=>x.callType===TYPE && /^clergy\d+$/.test(x.id||'')).map(x=>{ let j=null; try{ j=JSON.parse(x.history||'null'); }catch(_){} return j && Array.isArray(j.rows) ? {...j, id:x.id} : null; }).filter(Boolean);
    if(!ps.length) return {rows:[], parts:[]};
    const at=ps.map(p=>String(p.at||'')).sort().pop(), cur=ps.filter(p=>String(p.at||'')===at).sort((a,b)=>a.part-b.part);   // 마지막으로 저장한 묶음만
    return { rows: cur.flatMap(p=>p.rows).map(a=>({id:a[0], date:a[1]||'', org:a[2]||'', name:a[3]||'', pos:a[4]||'', phone:a[5]||'', note:a[6]||'', turn:a[7]||''})), parts: ps.map(p=>p.id) };
  }
  async function fetchAll(){ const j=await SY.list(); return fromItems(j.items); }   // 같이 쓰는 사본 + 바뀐 것만 (2026-11-21)
  async function load(){
    if(!SY.getKey()){ $('#keyBox').hidden=false; $('#body').innerHTML='<tr><td colspan="9" class="hint">팀 비밀번호를 넣으면 명부가 보입니다.</td></tr>'; return; }
    st('불러오는 중…', 'wait');
    try{ const r=await fetchAll(); rows=r.rows; loaded=true; $('#keyBox').hidden=true; st('', ''); render(); }
    catch(e){ if(e.code==='bad_key'){ $('#keyBox').hidden=false; toast('팀 비밀번호가 맞지 않습니다.'); } st('불러오지 못함 — 잠시 뒤 다시 열어 주세요', 'bad'); }
  }
  async function saveAll(list){
    const at=new Date().toISOString(), by=user.name||'', packs=[]; let cur=[], size=0;
    list.forEach(r=>{ const a=[r.id, r.date, r.org, r.name, r.pos, r.phone, r.note, r.turn], n=JSON.stringify(a).length+1; if(size+n>MAXC && cur.length){ packs.push(cur); cur=[]; size=0; } cur.push(a); size+=n; });
    if(cur.length || !packs.length) packs.push(cur);
    const old=(await fetchAll()).parts;
    for(let i=0;i<packs.length;i++) await callApi({action:'put', item:{id:PART(i), callType:TYPE, saved:at, takenBy:by, owner:by, summary:`대구대교구 무료입장 명부 ${i+1}/${packs.length} · ${list.length}명`, history:JSON.stringify({part:i, of:packs.length, at, rows:packs[i]})}});
    for(const id of old) if(+id.slice(6)>=packs.length) await callApi({action:'del', id});   // 남는 묶음은 지움
    rows=list;
  }
  // 최신 명부를 받아 바꾼 뒤 저장 (추가 · 지우기)
  async function change(fn, okMsg){
    if(busy) return; if(!SY.getKey()){ $('#keyBox').hidden=false; toast('팀 비밀번호를 먼저 넣어 주세요.'); return; }
    busy=true; st('저장 중…', 'wait');
    try{ const latest=(await fetchAll()).rows; await saveAll(fn(latest)); render(); st(`저장됨 ${new Date().toTimeString().slice(0,5)}`, 'ok'); if(okMsg) toast(okMsg); return true; }
    catch(e){ st('저장 못 함 — 다시 해 주세요', 'bad'); toast(e.code==='bad_key' ? '팀 비밀번호가 맞지 않습니다.' : '저장하지 못했습니다: '+(e.code||e.message)); return false; }
    finally{ busy=false; }
  }

  // ---------- 화면 ----------
  const year = () => String(new Date().getFullYear());
  const who = r => r.name.replace(/\s/g,'')+'|'+digits(r.phone);
  const yearCount = () => { const m={}; rows.forEach(r=>{ if(String(r.date).startsWith(year())) m[who(r)]=(m[who(r)]||0)+1; }); return m; };
  const dLab = d => /^\d{4}-\d{2}-\d{2}$/.test(d) ? SY.dateDisp(d) : d;
  function render(){
    if(!loaded) return;
    const q=$('#q').value.trim().replace(/\s/g,'').toLowerCase(), qd=digits(q), onlyY=$('#onlyYear').checked, yc=yearCount();
    const list=rows.filter(r=>(!onlyY || String(r.date).startsWith(year())) && (!q || (r.name+r.org+r.note+r.pos).replace(/\s/g,'').toLowerCase().includes(q) || (qd.length>=3 && digits(r.phone).includes(qd))))
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)) || a.name.localeCompare(b.name,'ko'));
    $('#sum').textContent = `${rows.length}명${q||onlyY?` · 찾은 ${list.length}명`:''}`;
    $('#body').innerHTML = list.length ? list.map(r=>{ const n=yc[who(r)]||0;
      return `<tr><td class="nw">${esc(dLab(r.date))}</td><td>${esc(r.org)}</td><td class="nm">${esc(r.name)}</td><td>${esc(r.pos)}</td><td class="nw">${esc(r.phone)}</td><td>${esc(r.note)}</td><td class="nw">${esc(r.turn)}</td>`
        + `<td class="nw">${n?`<span class="cnt${n>=2?' full':''}" title="${n>=2?'올해 2회 다 씀':'올해 '+n+'회'}">${n}회</span>`:''}</td><td><button type="button" class="btn sm" data-del="${esc(r.id)}" title="이 줄 지우기">×</button></td></tr>`; }).join('')
      : `<tr><td colspan="9" class="hint">${rows.length ? '찾은 사람이 없습니다.' : '아직 명부가 없습니다. 「엑셀 불러오기」로 명부 엑셀을 넣거나 「＋ 새로 추가」를 눌러 주세요.'}</td></tr>`;
  }
  $('#q').addEventListener('input', render); $('#onlyYear').addEventListener('change', render);

  // ---------- 새로 추가 ----------
  function openAdd(){ const t=SY.ymd(new Date());
    $('#addBox').innerHTML = `<div class="cl-add"><label>방문일 <input type="date" id="aDate" value="${t}"></label><label>소속 <input id="aOrg" data-ime="ko" placeholder="성당 · 수녀원 · 신학원"></label>`
      + `<label>이름 <input id="aName" data-ime="ko"></label><label>직책 <input id="aPos" list="posList" data-ime="ko" value="수녀"><datalist id="posList"><option>수녀</option><option>신부</option><option>신학생</option></datalist></label>`
      + `<label>연락처 <input id="aPhone" inputmode="tel"></label><label>비고 <input id="aNote" data-ime="ko" value="무료단독"></label><label>회차 <input id="aTurn" placeholder="자동"></label>`
      + `<span class="cl-add-btns"><button type="button" class="btn" id="aNo">취소</button><button type="button" class="btn primary" id="aOk">추가</button></span><p class="hint" id="aHint"></p></div>`;
    $('#addBox').hidden=false; $('#aName').focus(); }
  function turnHint(){ const n=$('#aName')?.value.trim(), p=$('#aPhone')?.value; if(!n) { $('#aHint').textContent=''; return; }
    const c=yearCount()[n.replace(/\s/g,'')+'|'+digits(p)]||0; $('#aTurn').placeholder = `${c+1}회차`;
    $('#aHint').innerHTML = c ? `올해 이미 <b>${c}회</b> 방문${c>=2?' — <b class="bad">연 2회를 다 썼습니다</b>':''}` : ''; }
  document.addEventListener('input', e=>{ if(e.target.id==='aName' || e.target.id==='aPhone') turnHint(); if(e.target.id==='aPhone' && SY.phoneTyping) SY.phoneTyping(e.target, e.inputType); });
  $('#addBtn').onclick=()=>{ if(!loaded){ toast('명부를 먼저 불러와 주세요.'); return; } openAdd(); };
  document.addEventListener('click', async e=>{
    if(e.target.id==='aNo'){ $('#addBox').hidden=true; $('#addBox').innerHTML=''; return; }
    if(e.target.id==='aOk'){ const r={id:newId(), date:$('#aDate').value, org:$('#aOrg').value.trim(), name:$('#aName').value.trim(), pos:$('#aPos').value.trim(), phone:$('#aPhone').value.trim(), note:$('#aNote').value.trim(), turn:$('#aTurn').value.trim()};
      if(!r.name){ toast('이름을 적어 주세요.'); $('#aName').focus(); return; }
      if(!r.turn){ const c=yearCount()[who(r)]||0; if(String(r.date).startsWith(year())) r.turn=`${c+1}회차`; }
      if(await change(list=>[...list, r], `「${r.name}」을 명부에 넣었습니다.`)){ $('#addBox').hidden=true; $('#addBox').innerHTML=''; } return; }
    const d=e.target.closest && e.target.closest('[data-del]'); if(d){ const r=rows.find(x=>x.id===d.dataset.del); if(!r) return;
      ask(`<b>${esc(dLab(r.date))} · ${esc(r.name)}</b> 줄을 명부에서 지울까요? (팀이 함께 보는 명부에서 지워집니다)`, '지우기', ()=>change(list=>list.filter(x=>x.id!==r.id), `「${r.name}」 줄을 지웠습니다.`)); }
  });

  // ---------- 확인 팝업 ----------
  let askFn=null;
  function ask(html, yes, fn){ $('#askMsg').innerHTML=html; $('#askYes').textContent=yes||'확인'; askFn=fn; $('#askModal').hidden=false; setTimeout(()=>$('#askNo').focus(), 0); }
  $('#askNo').onclick=()=>{ $('#askModal').hidden=true; askFn=null; };
  $('#askYes').onclick=()=>{ $('#askModal').hidden=true; const f=askFn; askFn=null; if(f) f(); };
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#askModal').hidden){ $('#askModal').hidden=true; askFn=null; } });

  // ---------- 엑셀 불러오기 ----------
  const toYmd = v => { if(v==null || v==='') return '';
    if(typeof v==='number'){ const p=XLSX.SSF.parse_date_code(v); return p ? `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}` : String(v); }
    if(v instanceof Date && !isNaN(v)) return SY.ymd(v);
    const m=String(v).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` : String(v).trim(); };
  function parseXl(buf){
    const wb=XLSX.read(buf, {type:'array'}), ws=wb.Sheets[wb.SheetNames[0]], A=XLSX.utils.sheet_to_json(ws, {header:1, raw:true, defval:''});
    const hi=A.findIndex(r=>r.some(c=>/이름/.test(String(c))) && r.some(c=>/방문일|연락처/.test(String(c)))); if(hi<0) throw new Error('머리줄(방문일 · 이름 · 연락처)을 찾지 못했습니다.');
    const H=A[hi].map(c=>String(c).replace(/\s/g,'')), ix=re=>H.findIndex(h=>re.test(h));
    const C={date:ix(/^방문일/), org:ix(/^소속/), name:ix(/^이름/), pos:ix(/^직책/), phone:ix(/^연락처/), note:ix(/^비고/), turn:ix(/^회차/)};
    const g=(r,k)=>C[k]>=0 ? String(r[C[k]]??'').replace(/^[\s\t]+|[\s\t]+$/g,'') : '';
    let last=''; const out=[];
    A.slice(hi+1).forEach(r=>{ const name=g(r,'name'); if(!name) return; let date=C.date>=0 ? toYmd(r[C.date]) : ''; if(!date) date=last; else last=date;
      out.push({id:newId()+out.length.toString(36), date, org:g(r,'org'), name, pos:g(r,'pos'), phone:g(r,'phone'), note:g(r,'note'), turn:g(r,'turn')}); });
    return out;
  }
  $('#xlBtn').onclick=()=>{ if(!SY.getKey()){ $('#keyBox').hidden=false; toast('팀 비밀번호를 먼저 넣어 주세요.'); return; } $('#xlFile').click(); };
  $('#xlFile').addEventListener('change', async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    let list; try{ list=parseXl(await f.arrayBuffer()); }catch(err){ toast('엑셀을 읽지 못했습니다: '+(err.message||err), 4000); return; }
    if(!list.length){ toast('엑셀에서 명부 줄을 찾지 못했습니다.'); return; }
    ask(`엑셀에서 <b>${list.length}명</b>을 읽었습니다. 명부를 이 엑셀 내용으로 바꿀까요?${rows.length?`<br>(지금 명부 ${rows.length}명은 엑셀 내용으로 바뀝니다)`:''}`, '바꾸기',
      ()=>change(()=>list, `명부를 엑셀 내용 ${list.length}명으로 바꿨습니다.`)); });

  // ---------- 팀 비밀번호 ----------
  $('#keyBtn').onclick=()=>{ const v=$('#keyIn').value.trim(); if(!v) return; try{ localStorage.setItem(SY.KEY_LS||'sayuwon_intake_key', v); }catch(_){} $('#keyIn').value=''; load(); };
  $('#keyIn').addEventListener('keydown', e=>{ if(e.key==='Enter') $('#keyBtn').click(); });
  load();
  setInterval(()=>{ if(!document.hidden && loaded && !busy && $('#addBox').hidden) fetchAll().then(r=>{ rows=r.rows; render(); }).catch(()=>{}); }, 60000);   // 1분마다 남이 고친 것 받아 옴
})();
