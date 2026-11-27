// ===== 대구대교구 무료입장 명부 (clergy.html · 2026-11-19 · 2026-11-23 DB 표로 옮김) =====
// 천주교 대구대교구 수녀 · 신부 · 신학생 무료입장(연 2회) 명부. 팀 공유
//  저장 (2026-11-23~): 서버 DB 의 명부 표 clergy (한 줄 = 한 번 방문 · cloudflare/worker.js 「대구대교구 무료입장 명부」 · docs 22절)
//   - 열 때 · 다른 컴퓨터에서 바뀔 때(SY.live.onRev) 명부 전체를 받아 이 화면 안에서 찾음
//   - 예전 저장(공유 기록 calls 의 clergy0 · clergy1 … 4만 자씩 묶음)은 처음 열 때 한 번 DB 로 옮기고 그 묶음은 지움 (moved)
//  - 「엑셀 불러오기」: 명부 엑셀(머리줄에 방문일 · 소속 · 이름 · 직책 · 연락처 · 비고 · 회차)을 읽어 명부를 그 내용으로 바꿈 (확인 팝업 · clergyImport)
//  - 화면 (2026-11-23): 1열 = 「새로 추가」 칸(늘 열려 있음 · 추가만) · 2열 = 명부 표(엑셀 불러오기 · 찾기 · × 지우기)
//  - 「새로 추가」: 방문일 · 소속 · 이름 · 직책 · 연락처 → 회차(그해 방문 수 + 1) · 대구대교구 소속(js/clergyorg.js) 확인, 문제 없으면 바로 저장 · 3회차 이상 · 목록에 없는 소속이면 경고 팝업(그래도 저장 가능) · 줄 끝 × 로 지우기 (확인 팝업)
//  - 회차는 서버가 넣는 순간 다시 셈 (둘이 같이 넣어도 맞음) · 추가 · 지우기는 한 줄씩이라 남이 고친 것을 덮어쓰지 않음
(function(){
  const $ = s => document.querySelector(s), esc = SY.esc;
  const user = SY.user() || {}; $('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
  let toastT; const toast = (m, ms=2600) => { const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), ms); };
  const st = (txt, cls) => { const el=$('#st'); el.textContent=txt; el.className='save-st '+(cls||''); };
  const TYPE='무료입장명부';
  const digits = s => String(s||'').replace(/\D/g,'');
  let rows=[], loaded=false, busy=false, oldServer=false;

  // ---------- 받기 · 저장 ----------
  // 예전 저장 모양 (calls 의 clergy0 · clergy1 …) — DB 로 옮기기 · 서버가 아직 예전 버전일 때 보기만
  function fromItems(items){
    const ps=(items||[]).filter(x=>x.callType===TYPE && /^clergy\d+$/.test(x.id||'')).map(x=>{ let j=null; try{ j=JSON.parse(x.history||'null'); }catch(_){} return j && Array.isArray(j.rows) ? {...j, id:x.id} : null; }).filter(Boolean);
    if(!ps.length) return {rows:[], parts:[]};
    const at=ps.map(p=>String(p.at||'')).sort().pop(), cur=ps.filter(p=>String(p.at||'')===at).sort((a,b)=>a.part-b.part);   // 마지막으로 저장한 묶음만
    return { rows: cur.flatMap(p=>p.rows).map(a=>({id:a[0], date:a[1]||'', org:a[2]||'', name:a[3]||'', pos:a[4]||'', phone:a[5]||'', note:a[6]||'', turn:a[7]||''})), parts: ps.map(p=>p.id) };
  }
  const fetchAll = async () => (await SY.call({action:'clergyList'})).items || [];
  const setRO = on => { oldServer=on; $('#aOk').disabled=on; $('#xlBtn').disabled=on; };
  async function moveOld(){   // 예전 묶음 → DB (한 번)
    const old=fromItems((await SY.list()).items); if(!old.rows.length && !old.parts.length) return 0;
    if(old.rows.length) await SY.call({action:'clergyImport', rows:old.rows});
    for(const id of old.parts) await SY.call({action:'del', id});   // 옮긴 묶음은 지움 (지워진 기록에 남음)
    return old.rows.length;
  }
  async function load(){
    if(!SY.getKey()){ $('#keyBox').hidden=false; $('#body').innerHTML='<tr><td colspan="9" class="hint">로그인하면 명부가 보입니다.</td></tr>'; return; }
    st('불러오는 중…', 'wait');
    if(!loaded) $('#body').innerHTML=SY.skel('table', 8, {cols:9, label:'명부를 불러오는 중'});   // 받는 동안 표 자리에 스켈레톤 (2026-11-27 · js/common.js SY.skel)
    try{
      let j=await SY.call({action:'clergyList'});
      if(!j.moved){ const n=await moveOld(); if(n){ toast(`예전 명부 ${n}명을 DB 로 옮겼습니다.`); j=await SY.call({action:'clergyList'}); } }
      rows=j.items||[]; loaded=true; setRO(false); $('#keyBox').hidden=true; st('', ''); render();
    }catch(e){
      if(!loaded) $('#body').innerHTML='';   // 못 받았으면 스켈레톤을 걷음 (위쪽 글이 알림)
      if(e.code==='bad_key'){ $('#keyBox').hidden=false; toast(SY.authFail()); st('불러오지 못함', 'bad'); return; }
      if(e.code==='bad_action'){   // 서버(cloudflare/worker.js)를 아직 새로 올리지 않음 → 예전 명부를 보기만
        try{ rows=fromItems((await SY.list()).items).rows; loaded=true; setRO(true); render(); st('서버를 새로 올려야 추가 · 엑셀 불러오기가 됩니다 (지금은 보기만)', 'bad'); return; }catch(_){}
      }
      st('불러오지 못함 — 잠시 뒤 다시 열어 주세요', 'bad');
    }
  }
  async function reload(){ if(!loaded || busy || oldServer) return; try{ rows=await fetchAll(); render(); }catch(_){} }
  // 서버에 한 번 보내고 명부를 다시 받음 (추가 · 지우기 · 엑셀)
  async function change(fn, okMsg){
    if(busy) return; if(!SY.getKey()){ $('#keyBox').hidden=false; toast(SY.authFail()); return; }
    busy=true; st('저장 중…', 'wait');
    try{ await fn(); rows=await fetchAll(); render(); st(`저장됨 ${new Date().toTimeString().slice(0,5)}`, 'ok'); if(okMsg) toast(typeof okMsg==='function' ? okMsg() : okMsg); return true; }
    catch(e){ st('저장 못 함 — 다시 해 주세요', 'bad'); toast(e.code==='bad_key' ? SY.authFail() : '저장하지 못했습니다: '+(e.code||e.message)); return false; }
    finally{ busy=false; }
  }

  // ---------- 화면 ----------
  const year = () => String(new Date().getFullYear());
  // 같은 사람 = 소속 · 이름 · 연락처가 모두 같을 때 (2026-11-23) — 회차 · 올해 횟수는 이것으로 셈. 서버 worker.js clWho 와 같은 규칙
  const orgKey = s => String(s||'').replace(/\s/g,'').replace(/^\((재|복|사)\)/,'').replace(/^천주교/,'');
  const who = r => orgKey(r.org)+'|'+String(r.name||'').replace(/\s/g,'')+'|'+digits(r.phone);
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

  // ---------- 새로 추가 (2026-11-21: 방문일 · 소속 · 이름 · 직책 · 연락처만 넣으면 회차 · 대구대교구 소속을 확인해 문제 없으면 바로 저장) ----------
  //  회차 = 그 방문일 해에 같은 사람(이름 + 연락처 숫자)이 명부에 있는 수 + 1 → 3회차부터(연 2회 넘음) 경고
  //  소속 = js/clergyorg.js(대교구 누리집 본당 164곳 · 교구 기관 · 교구에서 일하는 수도회) 또는 명부에 이미 적힌 소속이면 통과, 아니면 경고
  //  경고가 있으면 팝업에 경고 문구 → 「그래도 저장」을 누르면 저장 (취소하면 고쳐서 다시)
  // 소속 자동 검색 (2026-11-23): 대구대교구 누리집은 프로그램이 읽는 것을 막아(방화벽) 직접 검색할 수 없음 → 누리집에서 옮겨 둔 목록(js/clergyorg.js)과 명부에 이미 있는 소속에서 찾음
  //  찾으면 칸 아래에 「✓ 대구대교구 ○○ 본당」 · 없으면 저장할 때 팝업 → 관리자가 「승인하고 등록」을 누르면 등록 (비고에 「소속 승인 (이름)」)
  const nz = orgKey;
  const ORG = window.CLERGY_ORG || {parish:[], order:[], word:[], inst:[]};
  function orgFind(org, list){   // 찾은 이름 (없으면 '')
    const n=nz(org); if(!n) return '';
    const w=ORG.word.find(w=>n.includes(w)); if(w) return `대구대교구 (${w})`;
    const p=ORG.parish.find(p=>n===p || n===p+'성당' || n===p+'본당' || n.includes(p+'성당') || n.includes(p+'본당') || n.includes(p+'주교좌') || n.includes(p+'공소')); if(p) return `대구대교구 ${p} 본당`;
    const o=ORG.order.find(o=>n.includes(o)); if(o) return `대구대교구 수도회 · ${o}`;
    const i=ORG.inst.find(i=>n===i || (i.length>=4 && n.includes(i)) || (n.length>=4 && i.includes(n))); if(i) return `대구대교구 기관 · ${i}`;
    return (list||[]).some(r=>r.org && nz(r.org)===n) ? '명부에 이미 있는 소속' : '';
  }
  const orgOk = (org, list) => !!orgFind(org, list);
  const visitsIn = (list, r) => { const y=String(r.date).slice(0,4); return list.filter(x=>who(x)===who(r) && String(x.date).slice(0,4)===y).length; };
  const ORG_LINK = '<a href="https://www.daegu-archdiocese.or.kr/page/org.html?srl=inst&amp;kind=f" target="_blank" rel="noopener">천주교 대구대교구 기관 검색</a>';
  function warnsFor(r, list){
    const w=[], c=visitsIn(list, r);
    if(c>=2) w.push(`<b>${esc(r.name)}</b> 님(같은 소속 · 연락처)은 ${esc(String(r.date).slice(0,4))}년에 이미 <b>${c}회</b> 방문했습니다 — 이번이 <b>${c+1}회차</b>로 연 2회를 넘습니다.`);
    return w;
  }
  // 날짜 칸: 단체 방문일과 같은 방식 (칸 안에 「날짜 (요일)」 · 누르면 달력 · 한 번 더 누르거나 숫자를 치면 직접 입력)
  function makeDateBox(pick){
    const box=document.createElement('span'); box.className='dbox'; pick.parentNode.insertBefore(box, pick);
    const txt=document.createElement('input'); txt.className='dtxt'; txt.readOnly=true; txt.placeholder='누르면 달력'; txt.title='누르면 달력 · 한 번 더 누르면 직접 입력'; txt.setAttribute('inputmode','numeric');
    box.appendChild(txt); box.appendChild(pick); pick.classList.add('dpick'); pick.tabIndex=-1;
    const paint=()=>{ if(!txt.dataset.editing) txt.value=SY.dateDisp(pick.value); };
    const openPick=()=>{ try{ pick.showPicker(); }catch(_){ pick.focus(); } };
    const startEdit=blank=>{ txt.dataset.editing='1'; txt.readOnly=false; txt.value=blank?'':pick.value; txt.focus(); if(!blank) txt.select(); };
    txt.addEventListener('mousedown', e=>{ if(txt.dataset.editing) return; if(Date.now()-(+txt.dataset.pickAt||0)<20000){ e.preventDefault(); txt.dataset.pickAt=''; startEdit(false); return; } txt.dataset.pickAt=String(Date.now()); setTimeout(openPick,0); });
    txt.addEventListener('keydown', e=>{ if(!txt.dataset.editing && /^\d$/.test(e.key)) startEdit(true); else if(!txt.dataset.editing && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); openPick(); } else if(txt.dataset.editing && e.key==='Enter'){ e.preventDefault(); txt.blur(); } });
    txt.addEventListener('blur', ()=>{ if(!txt.dataset.editing) return; const d=SY.parseDateText(txt.value); delete txt.dataset.editing; txt.readOnly=true;
      if(d===null){ toast('날짜를 알아볼 수 없습니다. 2026-12-05 · 12/5 처럼 적어 주세요.'); paint(); return; }
      if(d!==pick.value){ pick.value=d; pick.dispatchEvent(new Event('input',{bubbles:true})); } paint(); });
    pick.addEventListener('input', paint); pick.addEventListener('change', paint); paint();
  }
  // 1열 「새로 추가」 칸은 늘 열려 있음 (2026-11-23 · 2열이 명부 표). 저장하면 방문일 · 직책은 두고 소속 · 이름 · 연락처를 비움
  const clearAdd = () => { ['aOrg','aName','aPhone'].forEach(id=>{ $('#'+id).value=''; }); $('#aHint').textContent=''; $('#aOrg').focus(); };
  function buildAdd(){ const t=SY.ymd(new Date());
    $('#addBox').innerHTML = `<div class="cl-add"><label>방문일 <input type="date" id="aDate" value="${t}"></label><label>소속 <input id="aOrg" data-ime="ko" placeholder="본당 · 수녀원 · 기관"></label>`
      + `<label>이름 <input id="aName" data-ime="ko"></label><label>직책 <input id="aPos" list="posList" data-ime="ko" value="수녀"><datalist id="posList"><option>수녀</option><option>신부</option><option>신학생</option></datalist></label>`
      + `<label>연락처 <input id="aPhone" inputmode="tel"></label>`
      + `<span class="cl-add-btns"><button type="button" class="btn" id="aNo">비우기</button><button type="button" class="btn primary" id="aOk">저장</button></span><p class="hint" id="aHint"></p></div>`;
    makeDateBox($('#aDate')); }
  const formRow = () => ({date:$('#aDate').value, org:$('#aOrg').value.trim(), name:$('#aName').value.trim(), pos:$('#aPos').value.trim(), phone:$('#aPhone').value.trim(), note:'', turn:''});
  function turnHint(){ if(!$('#aHint')) return; const r=formRow(); if(!r.name && !r.org){ $('#aHint').textContent=''; return; }
    const out=[]; if(r.name && /^\d{4}/.test(r.date)){ const c=visitsIn(rows, r); out.push(c>=2 ? `<b class="bad">${r.date.slice(0,4)}년에 이미 ${c}회 방문 — ${c+1}회차 (연 2회 넘음)</b>` : `${r.date.slice(0,4)}년 <b>${c+1}회차</b>`); }
    if(r.org){ const f=orgFind(r.org, rows); out.push(f ? `<b class="ok">✓ ${esc(f)}</b>` : '<b class="bad">대구대교구에서 찾지 못함 — 저장할 때 관리자 승인</b>'); }
    $('#aHint').innerHTML = out.join(' · '); }
  document.addEventListener('input', e=>{ if(['aName','aPhone','aOrg','aDate'].includes(e.target.id)) turnHint(); if(e.target.id==='aPhone' && SY.phoneTyping) SY.phoneTyping(e.target, e.inputType); });
  buildAdd();
  async function saveNew(r){   // 회차는 서버가 넣는 순간 다시 셈
    let turn=''; if(await change(async ()=>{ turn=((await SY.call({action:'clergyAdd', row:r})).item||{}).turn||''; }, ()=>`「${r.name}」을 명부에 넣었습니다${turn?' ('+turn+')':''}.`)) clearAdd(); }
  document.addEventListener('click', async e=>{
    if(e.target.id==='aNo'){ clearAdd(); return; }
    if(e.target.id==='aOk'){ if(busy) return; if(!loaded || oldServer){ toast(oldServer ? '서버를 새로 올려야 추가할 수 있습니다.' : '명부를 먼저 불러와 주세요.'); return; } const r=formRow();
      if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)){ toast('방문일을 넣어 주세요.'); return; }
      const miss=[['org','소속','aOrg'],['name','이름','aName'],['pos','직책','aPos'],['phone','연락처','aPhone']].find(([k])=>!r[k]);
      if(miss){ toast(`${miss[1]}을(를) 적어 주세요.`); $('#'+miss[2]).focus(); return; }
      let latest=rows; try{ st('확인 중…', 'wait'); latest=await fetchAll(); rows=latest; st('', ''); }catch(_){ st('', ''); }   // 최신 명부로 확인
      const w=warnsFor(r, latest), found=orgOk(r.org, latest);
      if(!w.length && found){ await saveNew(r); return; }   // 문제 없으면 바로 저장
      if(!found){   // 소속을 찾지 못함 → 관리자 승인 팝업 (검색이 안 되는 것일 수도 있어서 승인하면 그대로 등록)
        ask(`<span class="bad">⚠ 소속을 대구대교구에서 찾지 못했습니다</span><br>「<b>${esc(r.org)}</b>」을 대구대교구 본당 · 기관 목록과 명부에서 찾아봤지만 없습니다. 검색이 안 되는 것일 수도 있으니 ${ORG_LINK}에서 확인해 주세요.`
          + (w.length ? `<br><br>${w.map(x=>'· '+x).join('<br>')}` : '') + `<br><br><b>관리자가 승인하면 그대로 등록합니다.</b>`,
          '승인하고 등록', ()=>saveNew({...r, note:`소속 승인 (${user.name||''})`})); return; }
      ask(`<span class="bad">⚠ 확인해 주세요</span><br>${w.map(x=>'· '+x).join('<br>')}<br><br>그래도 명부에 저장할까요?`, '그래도 저장', ()=>saveNew(r)); return; }
    const d=e.target.closest && e.target.closest('[data-del]'); if(d){ const r=rows.find(x=>x.id===d.dataset.del); if(!r) return;
      ask(`<b>${esc(dLab(r.date))} · ${esc(r.name)}</b> 줄을 명부에서 지울까요? (팀이 함께 보는 명부에서 지워집니다)`, '지우기', ()=>change(()=>SY.call({action:'clergyDel', id:r.id}), `「${r.name}」 줄을 지웠습니다.`)); }
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
      out.push({date, org:g(r,'org'), name, pos:g(r,'pos'), phone:g(r,'phone'), note:g(r,'note'), turn:g(r,'turn')}); });
    return out;
  }
  $('#xlBtn').onclick=()=>{ if(!SY.getKey()){ $('#keyBox').hidden=false; toast(SY.authFail()); return; } $('#xlFile').click(); };
  $('#xlFile').addEventListener('change', async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    let list; try{ list=parseXl(await f.arrayBuffer()); }catch(err){ toast('엑셀을 읽지 못했습니다: '+(err.message||err), 4000); return; }
    if(!list.length){ toast('엑셀에서 명부 줄을 찾지 못했습니다.'); return; }
    ask(`엑셀에서 <b>${list.length}명</b>을 읽었습니다. 명부를 이 엑셀 내용으로 바꿀까요?${rows.length?`<br>(지금 명부 ${rows.length}명은 엑셀 내용으로 바뀝니다)`:''}`, '바꾸기',
      ()=>change(async ()=>{ for(let i=0;i<list.length;i+=1500) await SY.call({action:'clergyImport', rows:list.slice(i, i+1500), replace:i===0}); }, `명부를 엑셀 내용 ${list.length}명으로 바꿨습니다.`)); });

  load();
  SY.live.onRev(()=>reload());   // 다른 컴퓨터에서 바뀌면 바로 다시 받음 (서버 「바뀜 기다리기」)
  setInterval(()=>{ if(!document.hidden) reload(); }, 300000);   // 놓친 것 대비 5분마다
})();
