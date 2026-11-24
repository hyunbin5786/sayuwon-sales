// ===== 홍보 보조 › 홍보 기자 리스트 (press.html · 2026-11-24) =====
// 기자 한 명 = 한 줄: 리스트(어느 명단) · 구분 · 매체 · 이름 · 직위/소속 · 휴대폰 · 이메일 · 메모
// 저장: 서버 DB 의 press 표 (cloudflare/worker.js pressList · pressSave · pressDel) — 개인 연락처이므로 GitHub 에는 넣지 않음 · 로그인한 사람만
//  - 표에서 바로 고치기: 칸을 누르면 글자 칸 → Enter 또는 다른 칸을 누르면 그 줄만 저장 (고친 사람 · 시각이 남음)
//  - ＋ 기자 추가 (지금 고른 리스트 맨 위에 빈 줄) · 왼쪽 체크 → 선택 삭제 · 줄 끝 × 삭제 (확인)
//  - 엑셀 · 독스 불러오기: 여러 파일을 한 번에 — 엑셀은 시트마다(「이메일 · 이름」 머리줄을 찾음, 머리줄이 없는 시트는 앞 시트 칸 모양으로 · ID/PW 시트는 뺌),
//    독스(.docx)는 첫 줄 = 리스트 이름 · 글 속 이메일 주소(뒤 괄호는 메모). 같은 리스트에 같은 이메일(이메일이 없으면 매체 + 이름)이 있으면 건너뜀
//  - 메일 주소 복사: 체크한 기자(없으면 지금 보이는 기자) 이메일을 「a@b.com, c@d.com, …」(겹치는 주소는 한 번) · 독스 모양 = 첫 줄 제목 + 다음 줄 주소들 (받은 독스와 같은 모양)
(function(){
  const $ = s => document.querySelector(s), esc = SY.esc;
  const user = SY.user() || {}; $('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
  let toastT; const toast = (m, ms=2600) => { const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), ms); };
  const st = (txt, cls) => { const el=$('#st'); el.textContent=txt; el.className='save-st '+(cls||''); };
  const COLS = [['list','리스트'],['cat','구분'],['media','매체'],['name','이름'],['pos','직위 · 소속'],['phone','휴대폰'],['email','이메일'],['memo','메모']];
  const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
  const nsK = s => String(s||'').replace(/\s/g,'').toLowerCase();
  const emailOf = r => (String(r.email||'').match(EMAIL_RE)||[]).map(e=>e.toLowerCase());
  let rows=[], loaded=false, listSel=(()=>{ try{ return localStorage.getItem('sy_press_list')||''; }catch(_){ return ''; } })(), limit=400;
  const checked=new Set();

  // ---------- 받기 · 저장 ----------
  async function load(quiet){ if(!quiet) st('불러오는 중…','wait');
    try{ const j=await SY.call({action:'pressList'}); rows=j.items||[]; loaded=true; st('',''); render(); }
    catch(e){ st(e.code==='bad_key' ? SY.authFail() : e.code==='bad_action' ? '서버(Cloudflare)를 새 코드로 올려야 쓸 수 있습니다' : '불러오지 못함 — 잠시 뒤 다시', 'bad'); loaded=true; render(); } }
  async function save(list, what){ st('저장 중…','wait');
    try{ const j=await SY.call({action:'pressSave', rows:list}); st(`저장됨 ${new Date().toTimeString().slice(0,5)}${what?' · '+what:''}`,'ok'); return j.ids||[]; }
    catch(e){ st('저장 못 함','bad'); toast(e.code==='bad_key' ? SY.authFail() : e.code==='bad_action' ? '서버(Cloudflare)를 새 코드로 올려야 저장됩니다.' : '저장하지 못했습니다: '+(e.code||e.message), 4000); throw e; } }

  // ---------- 표 ----------
  const lists = () => { const m=new Map(); rows.forEach(r=>m.set(r.list||'(리스트 없음)', (m.get(r.list||'(리스트 없음)')||0)+1)); return [...m]; };
  function filtered(){ const q=nsK($('#q').value), cat=$('#cat').value, dupOnly=$('#dupOnly').checked, cnt=dupCount();
    return rows.filter(r=>(!listSel || (r.list||'(리스트 없음)')===listSel) && (!cat || r.cat===cat) && (!q || nsK(COLS.map(([k])=>r[k]).join(' ')).includes(q)) && (!dupOnly || isDup(r, cnt))); }
  // 겹침 = 같은 리스트 안에 같은 이메일이 두 번 이상 (다른 리스트끼리 겹치는 것은 흔하므로 표시하지 않음 · 메일 주소 복사는 어차피 한 번만)
  const dk = (r, e) => (r.list||'')+'|'+e;
  function dupCount(){ const m=new Map(); rows.forEach(r=>emailOf(r).forEach(e=>m.set(dk(r,e),(m.get(dk(r,e))||0)+1))); return m; }
  const isDup = (r, cnt) => emailOf(r).some(e=>cnt.get(dk(r,e))>1);
  function render(){
    if(!loaded) return;
    const L=lists(); if(listSel && !L.some(([n])=>n===listSel)) listSel='';
    $('#lists').innerHTML = `<button type="button" class="pr-chip${listSel?'':' on'}" data-list="">전체 <small>${rows.length}</small></button>` + L.map(([n,c])=>`<button type="button" class="pr-chip${n===listSel?' on':''}" data-list="${esc(n)}">${esc(n)} <small>${c}</small></button>`).join('');
    const cats=[...new Set(rows.filter(r=>!listSel || (r.list||'(리스트 없음)')===listSel).map(r=>r.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko')), cs=$('#cat'), cv=cs.value;
    cs.innerHTML = `<option value="">구분 전체</option>` + cats.map(c=>`<option${c===cv?' selected':''}>${esc(c)}</option>`).join('');
    const F=filtered(), cnt=dupCount(), show=F.slice(0, limit);
    $('#sum').textContent = `${rows.length}명${F.length!==rows.length?` · 보이는 ${F.length}명`:''}${checked.size?` · 체크 ${checked.size}명`:''}`;
    $('#head').innerHTML = `<tr><th class="ck"><input type="checkbox" id="ckAll" title="보이는 줄 모두"></th>${COLS.map(([k,l])=>`<th class="c-${k}">${l}</th>`).join('')}<th></th></tr>`;
    $('#body').innerHTML = show.length ? show.map(r=>{ const dup=isDup(r, cnt);
      return `<tr data-id="${esc(r.id)}"${checked.has(r.id)?' class="sel"':''}><td class="ck"><input type="checkbox" data-ck="${esc(r.id)}"${checked.has(r.id)?' checked':''}></td>`
        + COLS.map(([k])=>`<td class="c-${k}${k==='email'&&dup?' dup':''}" data-k="${k}" contenteditable="plaintext-only" spellcheck="false">${esc(r[k]||'')}</td>`).join('')
        + `<td class="x"><button type="button" class="pr-x" data-del="${esc(r.id)}" title="이 기자 삭제">×</button></td></tr>`; }).join('')
      : `<tr><td colspan="${COLS.length+2}" class="empty">${rows.length ? '찾은 기자가 없습니다.' : '아직 명단이 없습니다. 「엑셀 · 독스 불러오기」로 기자 리스트 파일을 넣거나 「＋ 기자 추가」를 눌러 주세요.'}</td></tr>`;
    $('#more').innerHTML = F.length>limit ? `${limit}명까지 보이는 중 · <button type="button" class="btn sm" id="moreBtn">모두 보기 (${F.length}명)</button> (찾기 · 리스트로 좁히면 빠릅니다)` : '';
    $('#delSel').disabled=!checked.size; $('#delSel').textContent = checked.size ? `선택 삭제 (${checked.size})` : '선택 삭제';
    const ck=$('#ckAll'); if(ck){ const ids=show.map(r=>r.id); ck.checked = ids.length>0 && ids.every(id=>checked.has(id)); }
  }
  // 칸 고치기 → 그 줄만 저장
  const editing = () => document.activeElement && document.activeElement.matches && document.activeElement.matches('#body td[data-k]');
  document.addEventListener('focusin', e=>{ const td=e.target.closest && e.target.closest('#body td[data-k]'); if(td) td.dataset.before=td.textContent; });
  document.addEventListener('keydown', e=>{ const td=e.target.closest && e.target.closest('#body td[data-k]'); if(!td) return;
    if(e.key==='Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); td.blur(); }
    if(e.key==='Escape'){ td.textContent=td.dataset.before||''; td.blur(); } });
  document.addEventListener('focusout', async e=>{ const td=e.target.closest && e.target.closest('#body td[data-k]'); if(!td) return;
    const v=td.textContent.replace(/ /g,' ').trim(), k=td.dataset.k, id=td.closest('tr').dataset.id, r=rows.find(x=>x.id===id); if(!r || (r[k]||'')===v){ td.textContent=r?(r[k]||''):v; return; }
    const before=r[k]; r[k]=v;
    try{ await save([r], `${r.name||r.media||''} ${COLS.find(c=>c[0]===k)[1]}`); if(k==='list' || k==='email' || k==='cat') render(); }
    catch(_){ r[k]=before; td.textContent=before||''; } });
  // 체크 · 리스트 · 찾기
  document.addEventListener('change', e=>{
    const c=e.target.closest && e.target.closest('[data-ck]'); if(c){ c.checked ? checked.add(c.dataset.ck) : checked.delete(c.dataset.ck); c.closest('tr').classList.toggle('sel', c.checked); render(); return; }
    if(e.target.id==='ckAll'){ const ids=filtered().slice(0, limit).map(r=>r.id); ids.forEach(id=>e.target.checked ? checked.add(id) : checked.delete(id)); render(); return; }
    if(e.target.id==='cat' || e.target.id==='dupOnly'){ limit=400; render(); } });
  $('#q').addEventListener('input', ()=>{ limit=400; render(); });
  document.addEventListener('click', e=>{
    const l=e.target.closest('[data-list]'); if(l){ listSel=l.dataset.list; try{ localStorage.setItem('sy_press_list', listSel); }catch(_){} limit=400; $('#cat').value=''; render(); return; }
    if(e.target.id==='moreBtn'){ limit=1e9; render(); return; }
    const d=e.target.closest('[data-del]'); if(d){ const r=rows.find(x=>x.id===d.dataset.del); if(r) askDel([r.id], `「${esc(r.name||r.email||r.media||'이름 없음')}」`); return; } });
  // ＋ 기자 추가: 지금 고른 리스트 맨 위에 빈 줄 → 매체 칸에 커서
  $('#addBtn').onclick=async()=>{ const minOrd=rows.reduce((m,r)=>Math.min(m, +r.ord||0), 0);
    const r={list:listSel || '직접 추가', cat:$('#cat').value||'', media:'', name:'', pos:'', phone:'', email:'', memo:'', ord:minOrd-1};
    try{ const ids=await save([r], '기자 추가'); r.id=ids[0]; r.by=user.name||''; rows.unshift(r); $('#q').value=''; render();
      const td=document.querySelector(`#body tr[data-id="${CSS.escape(r.id)}"] td[data-k="media"]`); if(td){ td.focus(); td.scrollIntoView({block:'center'}); } }catch(_){} };
  // 삭제
  let askFn=null;
  function ask(html, yes, fn){ $('#askMsg').innerHTML=html; $('#askYes').textContent=yes; askFn=fn; $('#askModal').hidden=false; }
  $('#askNo').onclick=()=>{ $('#askModal').hidden=true; askFn=null; };
  $('#askYes').onclick=()=>{ $('#askModal').hidden=true; const f=askFn; askFn=null; if(f) f(); };
  function askDel(ids, what){ ask(`${what}을(를) 기자 리스트에서 삭제할까요? (팀이 함께 보는 명단에서 빠집니다)`, '삭제', async()=>{
    st('삭제 중…','wait'); try{ await SY.call({action:'pressDel', ids}); rows=rows.filter(r=>!ids.includes(r.id)); ids.forEach(id=>checked.delete(id)); render(); st('삭제됨','ok'); toast(`${ids.length}명을 삭제했습니다.`); }
    catch(e){ st('삭제 못 함','bad'); toast('삭제하지 못했습니다: '+(e.code||e.message)); } }); }
  $('#delSel').onclick=()=>{ if(checked.size) askDel([...checked], `체크한 <b>${checked.size}명</b>`); };

  // ---------- 메일 주소 복사 (받은 독스 모양: 「주소, 주소, …」) ----------
  function mailList(){ const src=checked.size ? rows.filter(r=>checked.has(r.id)) : filtered(), seen=new Set(), out=[];
    src.forEach(r=>emailOf(r).forEach(e=>{ if(!seen.has(e)){ seen.add(e); out.push(e); } })); return {out, from:checked.size?'체크한':'보이는', n:src.length}; }
  async function copy(text){ try{ await navigator.clipboard.writeText(text); return true; }catch(_){ const t=document.createElement('textarea'); t.value=text; document.body.appendChild(t); t.select(); const ok=document.execCommand('copy'); t.remove(); return ok; } }
  $('#copyMail').onclick=async()=>{ const {out, from, n}=mailList(); if(!out.length){ toast('복사할 이메일이 없습니다.'); return; }
    if(await copy(out.join(', '))) toast(`${from} ${n}명 중 이메일 ${out.length}개를 복사했습니다 · 메일 받는 사람 · 숨은참조 칸에 붙여 넣으세요.`, 4000); };
  $('#copyDoc').onclick=async()=>{ const {out, from, n}=mailList(); if(!out.length){ toast('복사할 이메일이 없습니다.'); return; }
    const title = listSel || '홍보 기자 리스트';
    if(await copy(`${title}\n${out.join(', ')}`)) toast(`독스 모양(첫 줄 「${title}」 + 주소 ${out.length}개)으로 복사했습니다.`, 4000); };
  // 엑셀로 내려받기 (지금 보이는 기자)
  $('#xlOut').onclick=()=>{ const F=filtered(); if(!F.length){ toast('내려받을 기자가 없습니다.'); return; }
    const aoa=[COLS.map(c=>c[1]), ...F.map(r=>COLS.map(([k])=>r[k]||''))], wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), '기자 리스트');
    XLSX.writeFile(wb, `홍보 기자 리스트${listSel?'_'+listSel.replace(/[\\/:*?"<>|]/g,''):''}_${new Date().toISOString().slice(0,10)}.xlsx`); };

  // ---------- 불러오기 (엑셀 여러 시트 · 독스) ----------
  const S = v => String(v??'').replace(/\s/g,'');
  function mapHeader(H){ const M={cat:-1, media:-1, name:-1, pos:-1, phone:-1, email:-1, memo:[]}, used=new Set();
    const find=(k, re)=>{ const i=H.findIndex((h,j)=>!used.has(j) && re.test(h)); if(i>=0){ M[k]=i; used.add(i); } };
    find('email', /^(이메일|e-?mail|메일)/i); find('name', /^(이름|기자명|성명)/); find('media', /^(매체|언론사)/); find('cat', /^구분/); find('phone', /(휴대|핸드폰|전화|연락처)/); find('pos', /(직위|직책|직급|소속|팀|부서)/);
    if(M.pos<0 && M.media>=0 && M.name>M.media+1 && H[M.media+1]==='') { M.pos=M.media+1; used.add(M.media+1); }   // 매체 다음 이름 없는 칸 = 직책 (월간지)
    H.forEach((h,j)=>{ if(!used.has(j)) M.memo.push([j, h]); });
    return M; }
  function sheetRows(A, M){ const out=[]; let cat='', media='';
    A.forEach(r=>{ const g=i=>i>=0 ? String(r[i]??'').replace(/\r?\n/g,' ').replace(/\s+/g,' ').trim() : '';
      const name=g(M.name), email=(g(M.email).match(EMAIL_RE)||[]).join(', '), mRaw=g(M.media), cRaw=g(M.cat);
      if(cRaw) cat=cRaw; if(mRaw) media=mRaw;
      if(!name && !email) return;
      if(/^(이름|기자명|성명)$/.test(S(name))) return;   // 머리줄이 또 나오면 건너뜀
      const memo=M.memo.map(([j,h])=>{ const v=String(r[j]??'').replace(/\s+/g,' ').trim(); return v ? (h && !/^\d+$/.test(h) ? `${h}: ${v}` : v) : ''; }).filter(Boolean).join(' · ');
      out.push({cat, media, name, pos:g(M.pos), phone:g(M.phone), email, memo}); });
    return out; }
  async function readXlsx(file){ const wb=XLSX.read(await file.arrayBuffer(), {type:'array'}), base=file.name.replace(/\.[^.]+$/,''), srcs=[]; let lastM=null;
    const dataSheets=[];
    wb.SheetNames.forEach(n=>{ const A=XLSX.utils.sheet_to_json(wb.Sheets[n], {header:1, defval:'', raw:false});
      const hi=A.findIndex(r=>r.some(c=>/^(이메일|e-?mail)/i.test(S(c))) && r.some(c=>/^(이름|기자명|성명)/.test(S(c))));
      const head = hi>=0 ? A[hi].map(S) : null;
      // 아이디 · 비밀번호가 있는 시트(웹하드 등)는 머리줄이 어디 있든 넣지 않음
      if(A.slice(0, 8).some(r=>r.some(c=>/^(ID|PW|비밀번호|패스워드)$/i.test(S(c))))){ srcs.push({name:`${base} · ${n}`, skip:'아이디 · 비밀번호가 있는 시트라 넣지 않음', rows:[]}); return; }
      let M=head ? mapHeader(head) : lastM, body=head ? A.slice(hi+1) : A;
      if(!M){ srcs.push({name:`${base} · ${n}`, skip:'「이메일 · 이름」 머리줄을 찾지 못함', rows:[]}); return; }
      const R=sheetRows(body, M);
      if(!head && R.filter(r=>r.email).length<3){ srcs.push({name:`${base} · ${n}`, skip:'기자 명단이 아님', rows:[]}); return; }
      if(head) lastM=M; dataSheets.push(n); srcs.push({name:`${base} · ${n}`, sheet:n, rows:R, note:head?'':'머리줄 없음 — 앞 시트 칸 모양으로 읽음'}); });
    if(dataSheets.length===1) srcs.forEach(s=>{ if(s.sheet) s.name=base; });   // 시트가 하나면 파일 이름만
    return srcs; }
  async function readDocx(file){ const z=await JSZip.loadAsync(await file.arrayBuffer()), xml=await z.file('word/document.xml').async('string');
    const paras=xml.split(/<w:p\b[^>]*>/).map(p=>p.replace(/<w:tab\/>/g,' ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim()).filter(Boolean);
    const title=paras[0] && !EMAIL_RE.test(paras[0]) ? paras[0] : file.name.replace(/\.[^.]+$/,''); EMAIL_RE.lastIndex=0;
    const text=paras.join(', '), out=[], re=/([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\s*(\(([^)]*)\))?/g; let m;
    while((m=re.exec(text))) out.push({cat:'', media:'', name:'', pos:'', phone:'', email:m[1], memo:m[3]||''});
    return [{name:title, rows:out, note:'독스 — 이메일 주소만'}]; }
  let imp=[];
  $('#impFile').addEventListener('change', async e=>{ const fs=[...e.target.files]; e.target.value=''; if(!fs.length) return;
    imp=[]; for(const f of fs){ try{ imp.push(...(/\.docx$/i.test(f.name) ? await readDocx(f) : await readXlsx(f))); }catch(err){ imp.push({name:f.name, skip:'읽지 못함: '+(err.message||err), rows:[]}); } }
    // 처음에 체크를 뺄 것: 「참고용 · 과거」 시트 · 다른 파일과 이메일이 거의(80% 이상) 같은 더 작은 명단 (예: 예전 판 파일)
    const em = s => new Set(s.rows.flatMap(emailOf));
    imp.forEach(s=>{ if(s.skip) return; if(/참고|과거|history/i.test(s.name)){ s.off=true; s.why='참고용 · 과거 자료라 처음에는 빼 둠'; return; }
      const a=em(s); if(a.size<5) return;
      const named = o => o.rows.filter(r=>r.name).length >= o.rows.length/2;   // 이름이 있는 명단만 대신할 수 있음 (이메일만 있는 독스는 아님)
      const big=imp.find(o=>o!==s && !o.skip && named(o) && o.rows.length>=s.rows.length && (()=>{ const b=em(o); let n=0; a.forEach(e=>{ if(b.has(e)) n++; }); return n/a.size>=0.8; })());
      if(big){ s.off=true; s.why=`「${big.name}」과 거의 같아 처음에는 빼 둠`; } });
    paintImp(); $('#impModal').hidden=false; });
  const keyIn = (list, r) => list+'|'+(emailOf(r)[0] || nsK(r.media)+'/'+nsK(r.name));
  function paintImp(){ const have=new Set(rows.map(r=>keyIn(r.list||'', r)));
    $('#impBody').innerHTML = `<p class="hint">파일 · 시트마다 하나의 <b>리스트</b>가 됩니다 (이름은 고칠 수 있음). 같은 리스트에 같은 이메일(없으면 매체 + 이름)이 이미 있으면 건너뜁니다.</p>`
      + `<div class="tw"><table class="pr-it"><thead><tr><th></th><th>리스트 이름</th><th class="num">기자</th><th class="num">새로</th><th>비고</th></tr></thead><tbody>`
      + imp.map((s,i)=>{ if(s.skip) return `<tr class="skip"><td></td><td>${esc(s.name)}</td><td></td><td></td><td class="hint">${esc(s.skip)}</td></tr>`;
          const seen=new Set(), fresh=s.rows.filter(r=>{ const k=keyIn(s.name, r); if(have.has(k) || seen.has(k)) return false; seen.add(k); return true; }).length;
          return `<tr><td><input type="checkbox" data-imp="${i}"${s.off?'':' checked'}></td><td><input class="pr-in" data-impname="${i}" value="${esc(s.name)}"></td><td class="num">${s.rows.length}</td><td class="num"><b>${fresh}</b></td><td class="hint">${[s.why ? `<b class="pr-off">${esc(s.why)}</b>` : '', esc(s.note||''), s.rows.length-fresh ? `겹침 · 이미 있음 ${s.rows.length-fresh}` : ''].filter(Boolean).join(' · ')}</td></tr>`; }).join('')
      + `</tbody></table></div>`; $('#impErr').textContent=''; }
  $('#impBody').addEventListener('change', e=>{ const c=e.target.closest('[data-imp]'); if(c){ imp[+c.dataset.imp].off=!c.checked; } const n=e.target.closest('[data-impname]'); if(n){ imp[+n.dataset.impname].name=n.value.trim()||imp[+n.dataset.impname].name; paintImp(); } });
  $('#impNo').onclick=()=>{ $('#impModal').hidden=true; imp=[]; };
  $('#impOk').onclick=async()=>{ const ok=$('#impOk'); ok.disabled=true; let n=0;
    try{ await load(true); const have=new Set(rows.map(r=>keyIn(r.list||'', r)));
      for(const s of imp.filter(s=>!s.skip && !s.off)){ let ord=rows.reduce((m,r)=>Math.max(m, +r.ord||0), 0)+1; const seen=new Set();
        const L=s.rows.filter(r=>{ const k=keyIn(s.name, r); if(have.has(k) || seen.has(k)) return false; seen.add(k); return true; }).map(r=>({...r, list:s.name, ord:ord++}));
        if(!L.length) continue; ok.textContent=`넣는 중… ${s.name}`; await save(L, `불러오기 ${s.name}`); n+=L.length; L.forEach(r=>have.add(keyIn(r.list, r))); }
      $('#impModal').hidden=true; imp=[]; await load(true); toast(`${n}명을 넣었습니다.`, 3500); }
    catch(e){ $('#impErr').textContent=`넣다가 멈췄습니다 (${n}명 넣음 · 다시 눌러도 겹치지 않음): `+(e.code||e.message); }
    finally{ ok.disabled=false; ok.textContent='넣기'; } };

  load();
  SY.live.onRev(()=>{ if(!editing() && $('#impModal').hidden) load(true); });   // 다른 컴퓨터에서 바뀌면 바로 (고치는 중이면 다음에)
})();
