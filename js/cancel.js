// ===== 예약 취소 요청 (cancel.html · 2026-11-19) =====
// 직원이 취소 담당자에게 예약 취소 처리를 부탁하는 요청서 (예전 엑셀 「사유원 예약 취소 요청」을 옮김)
//  ① 취소 요청하기: 방문일 · 예약 사이트 · 예약자 이름 · 연락처 · 예약 번호 · 취소 내용(전체 환불 / 부분 취소 + 취소할 인원) · 취소 사유(하나만 · 기타면 자세히) · 증빙 서류(+ PDF · JPG · PNG 올리기) · 환불 계좌(가상계좌 결제 시: 은행 · 계좌번호 · 본인 / 타인 계좌 + 이름) · 요청자 = 로그인 이름
//     빠진 정보가 있어도 보낼 수 있음 (확인 팝업) → 요청 목록에서 「정보 채우기」 · 「증빙 올리기」로 나중에 채움 (2026-11-23)
//  ② 요청 목록 · 처리: 처리 전 / 처리 완료 / 전체 · 「정보 덜 된 것만」 · 찾기 · 「처리 완료」(처리 메모 · 처리한 사람 · 시각) · 「되돌리기」 · 「엑셀 불러오기」(예전 엑셀 줄을 더함)
//  저장: 공유 기록(calls) 통화 구분 「취소요청」, 4만 자씩 나눠 id cxreq0 · cxreq1 … ({part, of, at, rows:[요청…]}). 저장 직전 최신 목록을 다시 받아 그 위에 반영
//  요청 한 줄: {id, at, by, date, site, name, phone, no, kind, amt(취소 내용 글), ppl(예약 인원), cnt(취소할 인원), erp(전산 예약 상품 · 인원 · 금액), why, whyTxt, doc, files:[{name,url,at,by}], acc(글), accBank, accNo, accOwn(본인|타인), accName, done, edited}
(function(){
  const $ = s => document.querySelector(s), esc = SY.esc;
  const user = SY.user() || {}; $('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
  let toastT; const toast = (m, ms=2600) => { const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), ms); };
  const st = (txt, cls) => { const el=$('#st'); el.textContent=txt; el.className='save-st '+(cls||''); };
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
  const fetchAll = async () => fromItems((await SY.list()).items);   // 같이 쓰는 사본 + 바뀐 것만 (2026-11-21)
  async function saveAll(list){
    const at=new Date().toISOString(), by=user.name||'', packs=[]; let cur=[], size=0;
    list.forEach(r=>{ const n=JSON.stringify(r).length+1; if(size+n>MAXC && cur.length){ packs.push(cur); cur=[]; size=0; } cur.push(r); size+=n; });
    if(cur.length || !packs.length) packs.push(cur);
    const old=(await fetchAll()).parts;
    for(let i=0;i<packs.length;i++) await SY.call({action:'put', item:{id:PART(i), callType:TYPE, saved:at, takenBy:by, owner:by, summary:`예약 취소 요청 ${i+1}/${packs.length} · ${list.length}건 · 처리 전 ${list.filter(r=>!r.done).length}건`, history:JSON.stringify({part:i, of:packs.length, at, rows:packs[i]})}});
    for(const id of old) if(+id.slice(5)>=packs.length) await SY.call({action:'del', id});
    reqs=list;
  }
  async function change(fn, okMsg){
    if(busy) return false; if(!SY.getKey()){ $('#keyBox').hidden=false; toast(SY.authFail()); return false; }
    busy=true; st('저장 중…', 'wait');
    try{ await saveAll(fn((await fetchAll()).rows)); render(); st(`저장됨 ${new Date().toTimeString().slice(0,5)}`, 'ok'); if(okMsg) toast(okMsg); return true; }
    catch(e){ st('저장 못 함 — 다시 해 주세요', 'bad'); toast(e.code==='bad_key' ? SY.authFail() : '저장하지 못했습니다: '+(e.code||e.message)); return false; }
    finally{ busy=false; }
  }
  async function load(){
    if(!SY.getKey()){ $('#keyBox').hidden=false; return; }
    try{ reqs=(await fetchAll()).rows; loaded=true; $('#keyBox').hidden=true; render(); }
    catch(e){ if(e.code==='bad_key'){ $('#keyBox').hidden=false; toast(SY.authFail()); } else st('불러오지 못함 — 잠시 뒤 다시 열어 주세요', 'bad'); }
  }

  // ---------- 빠진 정보 (2026-11-23): 요청 목록에 「⚠ 빠진 정보」로 표시 · 「정보 덜 된 것만」으로 모아 보기 ----------
  //  환불 계좌는 가상계좌 결제일 때만 필요해서(결제 방법은 이 화면이 모름) 빠진 정보로 세지 않음
  function missOf(r){
    return [ !r.date && '방문일', !r.name && '예약자 이름', !r.phone && '연락처', !r.no && '예약 번호', !r.why && !r.whyTxt && '취소 사유',
      r.why==='기타' && !r.whyTxt && '사유 자세히',
      r.kind==='부분 취소' && !r.cnt && !r.amt && '취소할 인원',
      (r.accBank || r.accNo) && !r.accBank && '환불 계좌 은행', (r.accBank || r.accNo) && !r.accNo && '환불 계좌번호', (r.accBank || r.accNo) && !r.accName && (r.accOwn==='타인' || !r.name) && '예금주 이름',   // 본인 계좌는 이름이 비어 있으면 예약자 이름으로 봄
      (r.doc==='받음' || r.doc==='받을 예정') && !(r.files||[]).length && '증빙 서류 파일' ].filter(Boolean);
  }
  const partTxt = (cnt, ppl) => cnt ? `${cnt}명 취소${ppl ? ` (${ppl}명 → ${ppl-cnt}명)` : ''}` : '';

  // ---------- 증빙 서류 올리기: 서버 「upload」 (단체 사업자등록증과 같은 곳 · 볼 때는 링크) ----------
  async function upFiles(fileList, info){
    if(!SY.getKey()){ $('#keyBox').hidden=false; toast(SY.authFail()); return []; }
    const out=[];
    for(const file of [...fileList]){
      // PDF · JPG(JPEG) · PNG — 컴퓨터에 따라 종류가 비어 있거나 image/jpg 로 오면 확장자로 정함
      const ext=(file.name.match(/\.([a-z0-9]+)$/i)||[])[1]?.toLowerCase()||'', mime={pdf:'application/pdf', jpg:'image/jpeg', jpeg:'image/jpeg', jfif:'image/jpeg', png:'image/png'}[ext] || (file.type==='image/jpg' ? 'image/jpeg' : file.type);
      if(!/^(application\/pdf|image\/jpeg|image\/png)$/.test(mime)){ toast(`「${file.name}」 — PDF · JPG · PNG 파일만 올릴 수 있습니다.`, 3400); continue; }
      if(file.size > 10*1024*1024){ toast(`「${file.name}」 — 10MB 이하 파일만 올릴 수 있습니다.`); continue; }
      try{
        const data = await new Promise((ok,no)=>{ const fr=new FileReader(); fr.onload=()=>ok(String(fr.result).split(',')[1]); fr.onerror=()=>no(fr.error); fr.readAsDataURL(file); });
        const j = await SY.call({action:'upload', name:file.name, mime, data, org:info.name||'예약자', date:info.date||'', kind:'취소 증빙'});
        out.push({name:j.file.name, url:j.file.url, at:j.file.at, by:user.name||''});
      }catch(e){ toast(`「${file.name}」을(를) 올리지 못했습니다: ${e.message||e.code}`, 4000); }
    }
    return out;
  }
  // 파일 주소 끝에 화면에 보이는 이름을 붙임 (2026-11-23): 브라우저가 탭 제목 · 저장할 때 파일 이름을 주소 끝(원래는 fxxxx 코드)에서 가져가기 때문.
  //  서버가 /file/<id>/<이름> 을 받을 때(api 8 이상)만 붙임 — 서버를 다시 배포하기 전에는 예전 주소 그대로
  let fileApi=0;
  fetch(SY.API_URL||SY_BACKEND.API_URL).then(r=>r.json()).then(j=>{ fileApi=+j.api||0; if(fileApi>=8){ render(); syncDoc(); } }).catch(()=>{});
  const fileHref = f => fileApi>=8 && /\/file\/[A-Za-z0-9_-]+$/.test(f.url||'') && f.name ? `${f.url}/${encodeURIComponent(f.name)}` : (f.url||'');
  const fileLinks = (files, rmAttr) => (files||[]).map((f,i)=>`<span class="cx-file"><a href="${esc(fileHref(f))}" target="_blank" rel="noopener" title="${esc(f.name||"증빙 서류")} — 새 창에서 보기">📎 ${esc(f.name||'증빙 서류')}</a>${rmAttr?`<button type="button" ${rmAttr}="${i}" title="이 파일 빼기">×</button>`:''}</span>`).join('');

  // ---------- 탭 없음 (2026-11-23): 1열 취소 요청하기 · 2열 요청 목록이 늘 함께 보임 ----------
  const toForm = () => { const y=$('#pReq').getBoundingClientRect().top; if(y<0 || y>innerHeight*0.5) $('#pReq').scrollIntoView({behavior:'smooth', block:'start'}); };

  // ---------- ① 요청하기 ----------
  let editId=null, formFiles=[], origUrls=new Set(), formErp='', upBusy=false;
  const segVal = id => ($(`#${id} button.on`)||{}).dataset?.v || '';
  const setSeg = (id, v) => document.querySelectorAll(`#${id} button`).forEach(b=>b.classList.toggle('on', b.dataset.v===v));
  document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('.seg button'); if(!b) return;
    const box=b.parentElement; box.querySelectorAll('button').forEach(x=>x.classList.toggle('on', x===b)); if(box.id==='flt'){ flt=b.dataset.v; render(); }
    if(box.id==='fKind'){ syncKind(); if(segVal('fKind')==='부분 취소') setTimeout(()=>$('#fCnt').focus(),0); }
    if(box.id==='fWhy'){ syncWhy(); if(segVal('fWhy')==='기타') setTimeout(()=>$('#fWhyTxt').focus(),0); }
    if(box.id==='fAccOwn'){ const other=segVal('fAccOwn')==='타인';   // 본인 → 예약자 이름을 넣음 · 타인 → (넣어 준 이름이면) 비우고 적게 함
      if(other){ if(accAuto) $('#fAccName').value=''; accAuto=false; setTimeout(()=>$('#fAccName').focus(),0); } else { accAuto=true; ownName(); } }
    if(box.id==='fDoc') syncDoc(); });
  // 취소 사유: 하나만 · 「기타」면 사유 자세히 (2026-11-23)
  const syncWhy = () => { $('#fWhyTxtBox').hidden = segVal('fWhy')!=='기타'; };
  // 환불 계좌: 은행 · 계좌번호 · 예금주(본인 / 타인) + 예금주 이름 → acc 글로도 저장 (목록 · 엑셀과 같은 모양)
  //  예금주 이름 칸은 늘 보임 (2026-11-23): 본인 계좌면 예약자 이름을 넣어 줌(고칠 수 있음 · 고치기 전까지는 예약자 이름을 따라감), 타인 계좌면 비우고 적게 함
  let accAuto=true;   // 예금주 이름이 예약자 이름을 따라가는 중인지
  const ownName = () => { if(segVal('fAccOwn')==='본인' && accAuto) $('#fAccName').value=$('#fName').value.trim(); };
  const syncAcc = () => { ownName(); };
  $('#fName').addEventListener('input', ownName);
  $('#fAccName').addEventListener('input', ()=>{ accAuto=false; });
  function accOf(name){ const bank=$('#fBank').value, no=$('#fAccNo').value.trim(), own=segVal('fAccOwn')||'본인', nm=$('#fAccName').value.trim();
    if(!bank && !no) return {accBank:'', accNo:'', accOwn:'', accName:'', acc:''};
    return {accBank:bank, accNo:no, accOwn:own, accName:nm, acc:[bank, no].filter(Boolean).join(' ') + ` · 예금주 ${own==='타인' ? `타인 계좌 (${nm||'이름 없음'})` : `본인${nm?` (${nm})`:''}`}`}; }
  $('#fPhone').addEventListener('input', e=>{ if(SY.phoneTyping) SY.phoneTyping(e.target, e.inputType); });

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
  makeDateBox($('#fDate'));
  const setDate = v => { $('#fDate').value=v||''; $('#fDate').dispatchEvent(new Event('input')); };

  // 부분 취소: 취소할 인원 · 예약 인원(전산 예약에서) — 예약 인원보다 많으면 에러
  function cntCheck(){
    const part=segVal('fKind')==='부분 취소', cnt=+$('#fCnt').value||0, ppl=+$('#fPpl').value||0, msg=$('#fCntMsg');
    let err='', note='';
    if(part && $('#fCnt').value!==''){
      if(cnt<1 || cnt!==Math.floor(cnt)) err='취소할 인원은 1명 이상 정수로 적어 주세요.';
      else if(ppl && cnt>ppl) err=`예약 인원(${ppl}명)보다 많이 취소할 수 없습니다. 취소할 인원을 확인해 주세요.`;
      else if(ppl && cnt===ppl) note='예약 인원 모두 취소입니다 — 전체 환불이 맞는지 확인해 주세요.';
      else if(ppl) note=`${ppl}명 → ${ppl-cnt}명`;
    }
    msg.textContent = err ? '⚠ '+err : note; msg.className='cx-cnt-msg'+(err?' bad':''); msg.hidden=!part || (!err && !note);
    $('#fCnt').classList.toggle('bad', !!err);
    return err;
  }
  function syncKind(){ const part=segVal('fKind')==='부분 취소'; $('#fCntBox').hidden=!part; $('#fPplBox').hidden=!part; cntCheck(); }
  ['fCnt','fPpl'].forEach(id=>$('#'+id).addEventListener('input', cntCheck));
  function syncDoc(){ $('#fFilesRow').hidden = !segVal('fDoc') && !formFiles.length; $('#fFiles').innerHTML=fileLinks(formFiles, 'data-frm');
    $('#fUpBtn').classList.toggle('busy', upBusy); $('#fUpBtn').firstChild.textContent = upBusy ? '올리는 중…' : formFiles.length ? '증빙 서류 더 올리기' : '증빙 서류 올리기'; $('#fUp').disabled=upBusy; }
  $('#fUp').addEventListener('change', async e=>{ const fl=[...e.target.files]; e.target.value=''; if(!fl.length || upBusy) return;
    upBusy=true; syncDoc(); const got=await upFiles(fl, {name:$('#fName').value.trim(), date:$('#fDate').value}); upBusy=false;
    if(got.length){ formFiles.push(...got); if(!segVal('fDoc') || segVal('fDoc')==='받을 예정') setSeg('fDoc','받음'); toast(`${got.length}개 올렸습니다. ${editId?'「고친 내용 저장」':'「취소 요청 보내기」'}를 누르면 요청에 함께 저장됩니다.`, 3400); }
    syncDoc(); });
  $('#fFiles').addEventListener('click', e=>{ const b=e.target.closest('[data-frm]'); if(!b) return; formFiles.splice(+b.dataset.frm, 1); syncDoc(); });

  // ---------- 전산 예약 붙여넣기 (2026-11-21): 방문일 · 예약자 이름 · 연락처 · 예약 사이트(홈페이지) · 예약 인원 · 상품 · 금액 저절로 ----------
  //  전산 예약 내역: 「방문일자(순번) 2026.11.21 (1)」 「상품정보 …」 「방문자정보 이름(010-…)」 「예약인원 5명(어른 : 5명)」 「금액 327,750」 — 상품이 여러 개면 블록이 여러 개
  function parseErpCx(text){
    const blocks=[]; let cur=null;
    String(text||'').split(/\r?\n/).forEach(line=>{ const t=line.trim(); if(!t) return;
      const m=t.match(/^([^\t:：]+?)\s*(?:\t+|[:：]\s*|\s{2,})(.*)$/); const k=m ? m[1].replace(/\s/g,'') : '', v=m ? m[2].trim() : '';
      if(k==='방문일자(순번)'){ cur={}; blocks.push(cur); const d=v.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); if(d) cur.date=`${d[1]}-${d[2].padStart(2,'0')}-${d[3].padStart(2,'0')}`; return; }
      if(!cur) return;
      if(k==='상품정보') cur.product=v;
      else if(k==='방문자정보'){ const p=v.match(/^(.*?)\s*\(([^)]*)\)\s*$/); cur.name=(p?p[1]:v).trim(); cur.phone=p && /\d{2,}/.test(p[2]) ? p[2].trim() : ''; }
      else if(k==='예약인원'){ cur.people=+((v.match(/(\d+)\s*명/)||[])[1]||0); cur.peopleTxt=v; }
      else if(k==='금액') cur.amount=+v.replace(/\D/g,'')||0;
    });
    return blocks.filter(b=>b.date || b.product);
  }
  function fillFromErp(){
    const bl=parseErpCx($('#fErp').value), ok=$('#fErpOk'); if(!bl.length){ ok.hidden=true; return; }
    const first=bl.find(b=>b.name)||bl[0], set=(id,v)=>{ if(v) $('#'+id).value=v; }, got=[];
    if(first.date){ setDate(first.date); got.push('방문일'); }
    if(first.name){ set('fName', first.name); got.push('예약자 이름'); }
    if(first.phone){ set('fPhone', SY.fmtPhone(first.phone)); got.push('연락처'); }
    setSeg('fSite','홈페이지'); got.push('예약 사이트(홈페이지)');   // 전산 예약 = 홈페이지
    const won=n=>Number(n||0).toLocaleString('ko-KR'), tot=bl.reduce((s,b)=>s+(b.amount||0),0);
    // 예약 인원: 상품이 여러 개면 가장 많은 인원 (같은 사람이 상품 여러 개를 산 경우가 많음)
    const ppl=Math.max(0, ...bl.map(b=>b.people||0)); if(ppl){ $('#fPpl').value=ppl; got.push(`예약 인원(${ppl}명)`); }
    const items=bl.map(b=>`${b.product||''}${b.people?` ${b.people}명`:''}${b.amount?` ${won(b.amount)}원`:''}`.trim()).filter(Boolean);
    formErp = items.length ? items.join(' + ') + (bl.length>1 && tot ? ` · 합계 ${won(tot)}원` : '') : '';
    ok.textContent = `✓ 전산 예약에서 넣었습니다: ${got.join(' · ')}${formErp?` — 예약 내용: ${formErp}`:''}. 아래 칸을 확인하고 취소 내용 · 사유를 골라 주세요.`; ok.hidden=false;
    cntCheck(); ownName();
  }
  $('#fErp').addEventListener('input', fillFromErp);

  function resetForm(){ ['fErp','fName','fPhone','fNo','fWhyTxt','fBank','fAccNo','fAccName','fCnt','fPpl'].forEach(id=>$('#'+id).value=''); setDate(''); $('#fErpOk').hidden=true;
    [['fSite','홈페이지'],['fKind','전체 환불'],['fDoc',''],['fWhy',null],['fAccOwn','본인']].forEach(([id,v])=>setSeg(id,v));
    editId=null; formFiles=[]; origUrls=new Set(); formErp=''; accAuto=true;
    $('#fEditBar').hidden=true; $('#fEditCancel').hidden=true; $('#fReset').hidden=false; $('#fSend').textContent='취소 요청 보내기';
    syncKind(); syncDoc(); syncWhy(); syncAcc(); }
  $('#fReset').onclick=resetForm;
  $('#fEditCancel').onclick=()=>{ resetForm(); };

  // 요청 목록의 「정보 채우기」: 그 요청을 요청서에 불러와 고침
  function openEdit(r){
    resetForm(); editId=r.id;
    setDate(r.date); setSeg('fSite', r.site||'홈페이지'); $('#fName').value=r.name||''; $('#fPhone').value=r.phone||''; $('#fNo').value=r.no||'';
    setSeg('fKind', r.kind==='부분 취소' ? '부분 취소' : '전체 환불'); $('#fCnt').value=r.cnt||''; $('#fPpl').value=r.ppl||'';
    // 취소 사유: 하나만. 예전 요청(여러 개 · 지금 없는 사유 · 엑셀 글)은 고를 수 있는 것 하나만 고르고, 나머지는 「기타 + 사유 자세히」로
    const whys=String(r.why||'').split(/,\s*/).filter(Boolean), opts=[...document.querySelectorAll('#fWhy button')].map(b=>b.dataset.v);
    const pick=whys.length===1 && opts.includes(whys[0]) ? whys[0] : (whys.length || r.whyTxt) ? '기타' : null;
    setSeg('fWhy', pick); $('#fWhyTxt').value = pick==='기타' ? [...whys.filter(w=>w!=='기타'), r.whyTxt].filter(Boolean).join(' · ') : '';
    setSeg('fDoc', r.doc||''); formFiles=[...(r.files||[])]; origUrls=new Set(formFiles.map(f=>f.url)); formErp=r.erp||'';
    if(r.accBank!=null || r.accNo!=null){ $('#fBank').value=r.accBank||''; $('#fAccNo').value=r.accNo||''; setSeg('fAccOwn', r.accOwn||'본인'); $('#fAccName').value=r.accName||''; accAuto = (r.accOwn||'본인')==='본인' && (!r.accName || r.accName===r.name); }
    else if(r.acc) $('#fAccNo').value=r.acc;   // 예전 요청: 한 줄로 적힌 계좌는 계좌번호 칸에 (은행 · 예금주는 다시 골라 주세요)
    const miss=missOf(r);
    $('#fEditBar').innerHTML=`✎ <b>${esc(r.name||'(이름 없음)')}</b> 님 취소 요청을 고치는 중 <small>(요청 ${esc(r.by||'')}${r.at?` · ${esc(atLab(r.at))}`:''})</small>${miss.length?`<br><span class="bad">빠진 정보: ${esc(miss.join(' · '))}</span>`:''}${r.erp?`<br><small>전산 예약: ${esc(r.erp)}</small>`:(r.amt && r.kind!=='부분 취소'?`<br><small>예전 자세히: ${esc(r.amt)}</small>`:'')}`;
    $('#fEditBar').hidden=false; $('#fEditCancel').hidden=false; $('#fReset').hidden=true; $('#fSend').textContent='고친 내용 저장';
    syncKind(); syncDoc(); syncWhy(); syncAcc(); toForm(); $('#fName').focus({preventScroll:true});
  }

  $('#fSend').onclick=async()=>{
    if(busy || upBusy){ if(upBusy) toast('파일을 올리는 중입니다. 잠시 뒤 다시 눌러 주세요.'); return; }
    const kind=segVal('fKind'), part=kind==='부분 취소', cnt=part ? (+$('#fCnt').value||0) : 0, ppl=+$('#fPpl').value||0;
    const err=cntCheck(); if(err){ toast(err, 3600); $('#fCnt').focus(); return; }
    const f={ date:$('#fDate').value, site:segVal('fSite'), name:$('#fName').value.trim(), phone:$('#fPhone').value.trim(), no:$('#fNo').value.trim(),
      kind, cnt: cnt||'', ppl: ppl||'', erp:formErp, why:segVal('fWhy'), doc:segVal('fDoc'), whyTxt: segVal('fWhy')==='기타' ? $('#fWhyTxt').value.trim() : '' };
    Object.assign(f, accOf(f.name));
    if(!f.name && !f.phone && !f.no){ toast('예약자 이름 · 연락처 · 예약 번호 중 하나는 적어 주세요.', 3200); $('#fName').focus(); return; }
    const id=editId, files=[...formFiles], orig=origUrls;
    const build = old => { const amt = part && cnt ? partTxt(cnt, ppl) : part ? (old?.amt||'') : (old && old.erp==null ? (old.amt||'') : '');   // 예전 줄(전산 예약 칸이 없던 때)의 「자세히」는 남김
      return {...f, amt}; };
    const go = async () => {
      if(id){
        const ok=await change(list=>list.map(x=>{ if(x.id!==id) return x;
          const added=(x.files||[]).filter(g=>!orig.has(g.url) && !files.some(h=>h.url===g.url));   // 고치는 동안 목록에서 다른 사람이 올린 파일은 지키기
          return {...x, ...build(x), files:[...files, ...added], edited:{at:new Date().toISOString(), by:user.name||''}}; }), `「${f.name||f.no||f.phone}」 요청을 고쳤습니다.`);
        if(ok) resetForm();
      } else {
        const r={ id:newId(), at:new Date().toISOString(), by:user.name||'', ...build(null), files, done:null };
        if(await change(list=>[r, ...list], `「${r.name||r.no||r.phone}」 취소 요청을 보냈습니다. 취소 담당자가 처리하면 목록에 「처리 완료」로 바뀝니다.`)) resetForm();
      }
    };
    const miss=missOf({...f, amt:build(null).amt, files});
    if(!miss.length){ go(); return; }
    ask(`<p>아직 <b>빠진 정보</b>가 있습니다: <b class="bad">${esc(miss.join(' · '))}</b></p><p class="hint">이대로 ${id?'저장':'보내'}고, 나중에 요청 목록의 「정보 채우기」 · 「증빙 올리기」로 채울 수 있습니다. 요청 목록에는 「⚠ 빠진 정보」로 표시됩니다.</p>`, id ? '이대로 저장' : '이대로 보내기', go);
  };

  // ---------- ② 목록 · 처리 ----------
  function render(){
    const nOpen=reqs.filter(r=>!r.done).length, nMiss=reqs.filter(r=>!r.done && missOf(r).length).length;
    $('#openN').textContent = nOpen ? nOpen : ''; $('#missN').textContent = nMiss ? nMiss : '';
    if(!loaded){ $('#list').innerHTML='<p class="hint">로그인하면 요청 목록이 보입니다.</p>'; return; }
    const onlyMiss=$('#fltMiss').checked;
    const q=$('#q').value.trim().replace(/\s/g,'').toLowerCase(), qd=digits(q);
    const list=reqs.filter(r=>(flt==='all' || (flt==='open' ? !r.done : !!r.done)) && (!onlyMiss || (!r.done && missOf(r).length))
        && (!q || [r.name,r.no,r.by,r.whyTxt,r.amt,r.erp].join('').replace(/\s/g,'').toLowerCase().includes(q) || (qd.length>=3 && digits(r.phone+r.no).includes(qd))))
      .sort((a,b)=> flt==='open' ? String(a.at||'').localeCompare(String(b.at||'')) : String(b.done?.at||b.at||'').localeCompare(String(a.done?.at||a.at||'')));   // 처리 전 = 오래된 요청부터
    $('#sum').textContent = `처리 전 ${nOpen}건${nMiss?` (정보 덜 됨 ${nMiss}건)`:''} · 전체 ${reqs.length}건${q||onlyMiss?` · 찾은 ${list.length}건`:''}`;
    $('#list').innerHTML = list.length ? table(list.map(card).join('')) : `<p class="hint">${onlyMiss?'정보가 덜 된 요청이 없습니다.':flt==='open'?'처리할 취소 요청이 없습니다.':'요청이 없습니다.'}</p>`;
  }
  let cardUp=null;   // 증빙을 올리는 중인 요청 id
  // 요청 목록 = 표 하나 (2026-11-23): 요청 한 건 = 한 줄 (계속 쌓이므로 아래로 늘어남). 빠진 칸은 빨간 「빠짐」
  const MISS_ROW={'방문일':'date','예약자 이름':'name','연락처':'phone','예약 번호':'no','취소 사유':'why','사유 자세히':'why','취소할 인원':'kind','증빙 서류 파일':'doc','환불 계좌 은행':'acc','환불 계좌번호':'acc','예금주 이름':'acc'};
  // 2026-11-23: 「전산 예약」 열은 뺌 (내용은 「정보 채우기」로 열면 위 안내 줄에 보이고, 찾기에도 걸림)
  const COLS=['상태','예약자 · 연락처','방문일','예약 번호','취소 내용','취소 사유','증빙 서류','환불 계좌','요청','처리'];
  const table = rows => `<div class="cx-tbw"><table class="cx-tb"><thead><tr>${COLS.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  function card(r){
    const miss=r.done ? [] : missOf(r), mk=new Set(miss.map(m=>MISS_ROW[m]));
    const cut = r.kind==='부분 취소' && r.cnt ? partTxt(r.cnt, r.ppl) : (r.amt||'');
    const why=[r.why, r.whyTxt].filter(Boolean).join(' · ');
    const td=(k, html, cls='') => `<td class="${cls}${mk.has(k)?' m':''}">${html || (mk.has(k) ? '<span class="cx-gap">빠짐</span>' : '<span class="cx-none">—</span>')}</td>`;
    const up=`<label class="btn sm line-g cx-upb${cardUp===r.id?' busy':''}">${cardUp===r.id?'올리는 중…':(r.files||[]).length?'더 올리기':'증빙 올리기'}<input type="file" data-cxup="${esc(r.id)}" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple hidden${cardUp?' disabled':''}></label>`;
    return `<tr class="${r.done?'done':''}${miss.length?' miss':''}" data-id="${esc(r.id)}">`
      + `<td class="c-st"><span class="cx-st${r.done?' ok':''}">${r.done?'✓ 처리 완료':'처리 전'}</span>${miss.length?`<span class="cx-mn" title="빠진 정보: ${esc(miss.join(' · '))}">⚠ 빠진 ${miss.length}</span>`:''}`
      +   `<button type="button" class="btn sm${miss.length?' primary':''}" data-edit="${esc(r.id)}">${miss.length?'정보 채우기':'고치기'}</button></td>`
      + `<td class="c-nm${mk.has('name')||mk.has('phone')?' m':''}"><span class="tag">${esc(r.site||'-')}</span><b>${r.name?esc(r.name):'<span class="cx-gap">이름 빠짐</span>'}</b><br>${r.phone?esc(r.phone):'<span class="cx-gap">연락처 빠짐</span>'}</td>`
      + td('date', /^\d{4}-\d{2}-\d{2}$/.test(r.date||'') ? `${+r.date.slice(5,7)}/${+r.date.slice(8,10)} (${SY.DOW[new Date(r.date+'T00:00').getDay()]})${r.date.slice(0,4)!==String(new Date().getFullYear())?`<br><small>${r.date.slice(0,4)}년</small>`:''}` : esc(r.date||''), 'c-nw')
      + td('no', r.no ? `<button type="button" class="cx-no" data-copy="${esc(r.no)}" title="예약 번호 복사">${esc(r.no)}</button>` : '')
      + td('kind', `<b class="${r.kind==='전체 환불'?'all':''}">${esc(r.kind||'')}</b>${cut?`<br><small>${esc(cut)}</small>`:''}`, 'c-nw')
      + td('why', esc(why))
      + td('doc', `<div class="cx-files">${r.doc?`<i class="doc">${esc(r.doc)}</i>`:'<span class="cx-none">필요 없음</span>'}${fileLinks(r.files)}${mk.has('doc')?'<span class="cx-gap">파일 빠짐</span>':''}${up}</div>`, 'c-doc')
      + td('acc', r.acc ? `<small>${esc(r.acc)}</small>` : '', 'c-acc')
      + td('req', `${esc(r.by||'')}${r.at?`<br><small>${esc(atLab(r.at))}</small>`:''}${r.edited?`<br><small>고침 ${esc(r.edited.by||'')}</small>`:''}`, 'c-req')
      + `<td class="c-do">${r.done
          ? `<span class="cx-done">✓ ${esc(r.done.by||'')}${r.done.at?` <small>${esc(atLab(r.done.at))}</small>`:''}${r.done.memo?`<br><small>${esc(r.done.memo)}</small>`:''}</span><button type="button" class="btn sm" data-undo="${esc(r.id)}">되돌리기</button>`
          : `<input class="cx-memo" data-memo="${esc(r.id)}" data-ime="ko" placeholder="처리 메모 (선택)"><button type="button" class="btn primary sm" data-done="${esc(r.id)}">처리 완료</button>`}</td></tr>`;
  }
  $('#q').addEventListener('input', render);
  $('#fltMiss').addEventListener('change', render);
  let askFn=null;
  const ask = (html, yes, fn) => { $('#askMsg').innerHTML=html; $('#askYes').textContent=yes; askFn=fn; $('#askModal').hidden=false; setTimeout(()=>$('#askNo').focus(),0); };
  $('#askNo').onclick=()=>{ $('#askModal').hidden=true; askFn=null; };
  $('#askYes').onclick=()=>{ $('#askModal').hidden=true; const f=askFn; askFn=null; if(f) f(); };
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#askModal').hidden){ $('#askModal').hidden=true; askFn=null; } });
  document.addEventListener('click', async e=>{
    const cp=e.target.closest && e.target.closest('[data-copy]'); if(cp){ try{ await navigator.clipboard.writeText(cp.dataset.copy); toast('예약 번호를 복사했습니다.'); }catch(_){} return; }
    const ed=e.target.closest && e.target.closest('[data-edit]'); if(ed){ const r=reqs.find(x=>x.id===ed.dataset.edit); if(r) openEdit(r); return; }
    const d=e.target.closest && e.target.closest('[data-done]'); if(d){ const r=reqs.find(x=>x.id===d.dataset.done); if(!r) return; const memo=(document.querySelector(`[data-memo="${CSS.escape(r.id)}"]`)||{}).value?.trim()||'', miss=missOf(r);
      ask(`<p><b>${esc(r.name)}</b> (${esc(r.no||r.phone||'')}) 취소 요청을 <b>처리 완료</b>로 표시할까요?</p>${miss.length?`<p class="bad">⚠ 아직 빠진 정보가 있습니다: ${esc(miss.join(' · '))}</p>`:''}${memo?`<p class="hint">메모: ${esc(memo)}</p>`:''}`, '처리 완료',
        ()=>change(list=>list.map(x=>x.id===r.id ? {...x, done:{at:new Date().toISOString(), by:user.name||'', memo}} : x), `「${r.name}」 처리 완료로 표시했습니다.`)); return; }
    const u=e.target.closest && e.target.closest('[data-undo]'); if(u){ const r=reqs.find(x=>x.id===u.dataset.undo); if(!r) return;
      ask(`<p><b>${esc(r.name)}</b> 취소 요청을 다시 <b>처리 전</b>으로 돌릴까요?</p>`, '되돌리기', ()=>change(list=>list.map(x=>x.id===r.id ? {...x, done:null} : x), '처리 전으로 돌렸습니다.')); }
  });
  // 요청 목록에서 증빙 올리기 → 바로 그 요청에 저장 (증빙 서류가 「필요 없음 · 받을 예정」이었으면 「받음」으로)
  $('#list').addEventListener('change', async e=>{ const id=e.target.dataset && e.target.dataset.cxup; if(!id) return;
    const fl=[...e.target.files]; e.target.value=''; const r=reqs.find(x=>x.id===id); if(!r || !fl.length || cardUp) return;
    cardUp=id; render(); const got=await upFiles(fl, r); cardUp=null;
    if(!got.length){ render(); return; }
    if(!await change(list=>list.map(x=>x.id===id ? {...x, files:[...(x.files||[]), ...got], doc:'받음'} : x), `「${r.name||r.no}」 요청에 증빙 서류 ${got.length}개를 올렸습니다.`)) render(); });

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
  $('#xlBtn').onclick=()=>{ if(!SY.getKey()){ $('#keyBox').hidden=false; toast(SY.authFail()); return; } $('#xlFile').click(); };
  $('#xlFile').addEventListener('change', async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    let add; try{ add=parseXl(await f.arrayBuffer()); }catch(err){ toast('엑셀을 읽지 못했습니다: '+(err.message||err), 4000); return; }
    const key=r=>(r.no+'|'+r.name).replace(/\s/g,''), have=new Set(reqs.map(key)), fresh=add.filter(r=>!have.has(key(r)));
    if(!fresh.length){ toast(add.length ? '엑셀의 요청이 이미 모두 목록에 있습니다.' : '엑셀에서 요청 줄을 찾지 못했습니다.'); return; }
    ask(`<p>엑셀에서 <b>${add.length}건</b>을 읽었습니다. 목록에 없는 <b>${fresh.length}건</b>을 더할까요?</p><p class="hint">처리 여부 칸에 「완료」가 있으면 처리 완료로 넣습니다.</p>`, '더하기',
      ()=>change(list=>{ const h=new Set(list.map(key)); return [...list, ...fresh.filter(r=>!h.has(key(r)))]; }, `${fresh.length}건을 목록에 더했습니다.`)); });

  syncKind(); syncDoc(); syncWhy(); syncAcc(); render(); load();
  setInterval(()=>{ if(!document.hidden && loaded && !busy && !cardUp) fetchAll().then(r=>{ const ae=document.activeElement; if(ae && ae.classList.contains('cx-memo')) return; reqs=r.rows; render(); }).catch(()=>{}); }, 30000);   // 30초마다 새 요청 · 처리 받아 옴
})();
