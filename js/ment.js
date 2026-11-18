// ===== 고객 응대 보조 · 전화응대 멘트 (ment.html, 2026-11-18) =====
// 자주 쓰는 안내 멘트(문자 · 카톡으로 보내는 글)를 모아 두고 「복사」로 바로 붙여 넣기
//  - 저장: 공유 기록(구글 시트 calls, 단체 화면과 같은 Apps Script)의 한 줄 id=mentdb (통화 구분 '응대멘트')
//          수정 기록 칸(history)에 JSON {items:[{id, title, body}], at, by}
//  - 로그인하지 않아도 보고 복사할 수 있음 (팀 비밀번호는 필요). 추가 · 수정 · 삭제는 로그인한 사람만
//  - 처음(아직 아무것도 없을 때)은 기본 멘트 [홈페이지링크] 하나
(function(){
  const $=s=>document.querySelector(s), esc=SY.esc;
  const ID='mentdb', TYPE='응대멘트', CACHE_LS='sy_ment_cache', FAV_LS='sy_ment_fav';
  let favs=new Set(SY.readJSON(FAV_LS, []));   // 즐겨찾기 (이 브라우저 · 사람마다 따로, 로그인 안 해도 됨, 2026-11-18)
  const DEFAULT=[{ id:'home', title:'홈페이지링크', body:'안녕하세요.\n사유원입니다.\n\n공식 홈페이지 링크 보내드립니다.\nhttps://sayuwon.com/\n\n감사합니다.' }];
  const user=SY.user(), logged=!!user;
  let row=null, items=SY.readJSON(CACHE_LS, null)||DEFAULT.slice(), edit=null;   // edit = 고치는 멘트 id ('new' = 새로)
  $('#me').textContent = logged ? '👤 '+user.name : '';
  $('#guestHint').hidden = logged; $('#addBtn').hidden = !logged;

  const toast = m => { const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>{ t.hidden=true; }, 2200); };
  const setSync = t => { $('#sync').textContent=t; };
  async function api(body){
    const r=await fetch(SY.API_URL,{method:'POST',body:JSON.stringify({...body,key:SY.getKey()})});
    const j=await r.json(); if(!j.ok){ const e=new Error(j.error||'error'); e.code=j.error; throw e; } return j;
  }
  async function pull(){
    if(!SY.getKey()){ $('#keyBox').hidden=false; return; }
    setSync('불러오는 중…');
    try{ const j=await api({action:'list'}); $('#keyBox').hidden=true;
      row=(j.items||[]).find(r=>r.id===ID)||null;
      let h=null; try{ h=row ? JSON.parse(row.history||'{}') : null; }catch(_){}
      items = h && Array.isArray(h.items) ? h.items : DEFAULT.slice();
      SY.writeJSON(CACHE_LS, items); setSync(''); if(!edit) render();
    }catch(e){ if(e.code==='bad_key'){ $('#keyBox').hidden=false; $('#keyErr').textContent='비밀번호가 맞지 않습니다.'; } setSync('연결 안 됨 · 잠시 뒤 다시'); }
  }
  async function push(what){
    if(!logged){ toast('로그인한 사람만 고칠 수 있습니다.'); return false; }
    const now=new Date().toISOString();
    const item={...(row||{}), id:ID, callType:TYPE, saved:(row&&row.saved)||now, takenBy:user.name, summary:`전화응대 멘트 ${items.length}개`, history:JSON.stringify({items, at:now, by:user.name})};
    delete item.date; delete item.org;
    SY.writeJSON(CACHE_LS, items); render(); setSync('저장 중…');
    try{ await api({action:'put', item}); row=item; setSync(''); toast(what); return true; }
    catch(e){ setSync('저장 못 함'); toast('저장하지 못했습니다: '+(e.code||e.message)); return false; }
  }

  function render(){
    const q=$('#q').value.trim().replace(/\s/g,'').toLowerCase();
    const list=items.filter(m=>!q || (m.title+m.body).replace(/\s/g,'').toLowerCase().includes(q))
      .map((m,i)=>({m,i})).sort((a,b)=>(favs.has(b.m.id)-favs.has(a.m.id)) || a.i-b.i).map(o=>o.m);   // 즐겨찾기한 멘트가 위로 (그 안에서는 원래 순서)
    $('#sum').textContent = `${items.length}개${q?` · 찾은 ${list.length}개`:''}`;
    const form = m => `<div class="ment ment-edit" data-id="${esc(m.id)}"><input class="m-title" data-ime="ko" placeholder="멘트 이름" value="${esc(m.title)}">`
      + `<textarea class="m-body" data-ime="ko" rows="8" placeholder="멘트 내용">${esc(m.body)}</textarea>`
      + `<div class="row-btns">${m.id==='new'?'':'<button type="button" class="btn" data-mdel>삭제</button>'}<span class="sp"></span><button type="button" class="btn" data-mcancel>취소</button><button type="button" class="btn primary" data-msave>저장</button></div></div>`;
    const card = m => edit===m.id ? form(m) : `<div class="ment${favs.has(m.id)?' fav':''}" data-id="${esc(m.id)}"><div class="m-head"><button type="button" class="m-star${favs.has(m.id)?' on':''}" data-mfav title="${favs.has(m.id)?'즐겨찾기 빼기':'즐겨찾기 (위로)'}" aria-pressed="${favs.has(m.id)}">${favs.has(m.id)?'★':'☆'}</button><b>[${esc(m.title||'멘트')}]</b><span class="sp"></span>`
      + `<button type="button" class="btn primary sm" data-mcopy>복사</button>${logged?'<button type="button" class="btn sm" data-medit>수정</button>':''}</div><div class="m-body-v">${esc(m.body)}</div></div>`;
    $('#list').innerHTML = (edit==='new' ? form({id:'new', title:'', body:''}) : '')
      + (list.length ? list.map(card).join('') : `<p class="hint">${q?'찾은 멘트가 없습니다.':'멘트가 없습니다.'}</p>`);
    const f=$('#list .ment-edit .m-title'); if(f && !f.value) f.focus();
  }
  async function copy(text){
    try{ await navigator.clipboard.writeText(text); }
    catch(_){ const t=document.createElement('textarea'); t.value=text; t.style.position='fixed'; t.style.opacity='0'; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); }catch(__){} t.remove(); }
  }
  $('#list').addEventListener('click', async e=>{
    const box=e.target.closest('.ment'); if(!box) return; const id=box.dataset.id, m=items.find(x=>x.id===id);
    if(e.target.closest('[data-mcopy]') && m){ await copy(`[${m.title}]\n${m.body}`); toast(`「${m.title}」 멘트를 제목과 함께 복사했습니다.`); return; }   // 제목도 함께 (2026-11-18)
    if(e.target.closest('[data-mfav]') && m){ favs.has(id) ? favs.delete(id) : favs.add(id); SY.writeJSON(FAV_LS, [...favs]); render(); toast(favs.has(id) ? `「${m.title}」 즐겨찾기 · 위로 올렸습니다.` : `「${m.title}」 즐겨찾기를 뺐습니다.`); return; }
    if(e.target.closest('[data-medit]')){ edit=id; render(); box.scrollIntoView?.({block:'nearest'}); return; }
    if(e.target.closest('[data-mcancel]')){ edit=null; render(); return; }
    if(e.target.closest('[data-msave]')){
      const title=box.querySelector('.m-title').value.trim(), body=box.querySelector('.m-body').value.replace(/\s+$/,'');
      if(!body.trim()){ toast('멘트 내용을 적어 주세요.'); box.querySelector('.m-body').focus(); return; }
      const t=title.replace(/^\[|\]$/g,'').trim()||body.split('\n')[0].slice(0,20);
      if(id==='new') items=[{id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), title:t, body}, ...items];
      else items=items.map(x=>x.id===id ? {...x, title:t, body} : x);
      edit=null; await push(id==='new' ? `「${t}」 멘트를 추가했습니다.` : `「${t}」 멘트를 고쳤습니다.`); return; }
    if(e.target.closest('[data-mdel]') && m){
      $('#askMsg').textContent=`「${m.title}」 멘트를 삭제할까요?`; $('#askModal').hidden=false;
      $('#askYes').onclick=async()=>{ $('#askModal').hidden=true; items=items.filter(x=>x.id!==id); edit=null; await push(`「${m.title}」 멘트를 삭제했습니다.`); }; }
  });
  $('#askNo').onclick=()=>{ $('#askModal').hidden=true; };
  $('#addBtn').onclick=()=>{ if(!logged) return; edit='new'; $('#q').value=''; render(); };
  $('#q').addEventListener('input', ()=>{ if(!edit) render(); });
  $('#keyForm').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#keyIn').value.trim(); if(!v) return; try{ localStorage.setItem(SY.KEY_LS, v); }catch(_){} $('#keyIn').value=''; $('#keyErr').textContent=''; pull(); });
  window.addEventListener('focus', ()=>{ if(!edit) pull(); });
  render(); pull();
})();
