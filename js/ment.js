// ===== 고객 응대 보조 · 전화응대 멘트 (ment.html, 2026-11-18) =====
// 자주 쓰는 안내 멘트(문자 · 카톡으로 보내는 글)를 모아 두고 「복사」로 바로 붙여 넣기
//  - 저장: 공유 기록(구글 시트 calls, 단체 화면과 같은 Apps Script)의 한 줄 id=mentdb (통화 구분 '응대멘트')
//          수정 기록 칸(history)에 JSON {items:[{id, title, body, imgs:[{id, name}]}], at, by}
//  - 이미지: 추가 · 수정할 때 「＋ 이미지」(여러 장) · 붙여넣기(Ctrl+V) · 끌어다 놓기 → 줄여서(긴 쪽 1600px) 구글 드라이브 '응대멘트 이미지' 폴더에
//           (Apps Script mentImgPut · mentImgGet). 카드에 작은 그림 + 「이미지 복사」(크롬: 그림 그대로 클립보드 → 카톡에 Ctrl+V)
//  - 로그인하지 않아도 보고 복사할 수 있음 (팀 비밀번호는 필요). 추가 · 수정 · 삭제는 로그인한 사람만
//  - 처음(아직 아무것도 없을 때)은 기본 멘트 [홈페이지링크] 하나
(function(){
  const $=s=>document.querySelector(s), esc=SY.esc;
  const ID='mentdb', TYPE='응대멘트', CACHE_LS='sy_ment_cache', FAV_LS='sy_ment_fav';
  let favs=new Set(SY.readJSON(FAV_LS, []));   // 즐겨찾기 (이 브라우저 · 사람마다 따로, 로그인 안 해도 됨)
  const DEFAULT=[{ id:'home', title:'홈페이지링크', body:'안녕하세요.\n사유원입니다.\n\n공식 홈페이지 링크 보내드립니다.\nhttps://sayuwon.com/\n\n감사합니다.' }];
  const user=SY.user(), logged=!!user;
  let loaded=!!SY.readJSON(CACHE_LS, null);   // 이 기기에서 공유 멘트를 한 번이라도 받았는지 (못 받았으면 기본 멘트 대신 팀 비밀번호 안내)
  let row=null, items=SY.readJSON(CACHE_LS, null)||DEFAULT.slice(), edit=null, draftImgs=[], uploading=0;   // edit = 고치는 멘트 id ('new' = 새로) · draftImgs = 고치는 중 이미지
  const imgCache={}, imgWait={};   // 이미지 id → data URL (이 창에서만)
  $('#me').textContent = logged ? '👤 '+user.name : '';
  $('#guestHint').hidden = logged; $('#addBtn').hidden = !logged;

  const toast = (m, ms=2200) => { const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>{ t.hidden=true; }, ms); };
  const setSync = t => { $('#sync').textContent=t; };
  async function api(body){
    const r=await fetch(SY.API_URL,{method:'POST',body:JSON.stringify({...body,key:SY.getKey()})});
    const j=await r.json(); if(!j.ok){ const e=new Error(j.error||'error'); e.code=j.error; throw e; } return j;
  }
  const needDeploy = e => e && e.code==='bad_action' ? 'Apps Script를 새 버전으로 배포해야 이미지를 쓸 수 있습니다 (apps-script/group-intake.gs).' : '';
  async function pull(){
    if(!SY.getKey()){ $('#keyBox').hidden=false; render(); return; }
    setSync('불러오는 중…');
    try{ const j=await api({action:'list'}); $('#keyBox').hidden=true;
      row=(j.items||[]).find(r=>r.id===ID)||null;
      let h=null; try{ h=row ? JSON.parse(row.history||'{}') : null; }catch(_){}
      items = h && Array.isArray(h.items) ? h.items : DEFAULT.slice();
      SY.writeJSON(CACHE_LS, items); loaded=true; setSync(''); if(!edit) render();
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

  // ---------- 이미지 ----------
  // 불러오기 (한 번 받은 것은 이 창에 기억)
  function loadImg(id){
    if(imgCache[id]) return Promise.resolve(imgCache[id]);
    if(!imgWait[id]) imgWait[id]=api({action:'mentImgGet', id}).then(j=>{ imgCache[id]=`data:${j.file.mime};base64,${j.file.data}`; return imgCache[id]; }).catch(e=>{ delete imgWait[id]; throw e; });
    return imgWait[id];
  }
  function paintImgs(){   // 화면의 작은 그림들 채우기
    document.querySelectorAll('#list img[data-imgid]').forEach(im=>{ const id=im.dataset.imgid; if(imgCache[id]){ if(im.src!==imgCache[id]) im.src=imgCache[id]; return; }
      loadImg(id).then(u=>{ document.querySelectorAll(`#list img[data-imgid="${CSS.escape(id)}"]`).forEach(x=>{ x.src=u; }); })
        .catch(e=>{ im.closest('.m-img')?.classList.add('err'); im.alt = needDeploy(e) ? '배포 필요' : '불러오지 못함'; im.title = needDeploy(e) || '이미지를 불러오지 못했습니다'; }); });
  }
  // 줄이기: 긴 쪽 1600px, 사진은 JPEG(0.85) · PNG/GIF(그림 · 글자)는 PNG 그대로 (너무 크면 JPEG)
  function shrink(file){ return new Promise((ok, no)=>{ const fr=new FileReader(); fr.onerror=()=>no(new Error('읽지 못함')); fr.onload=()=>{ const im=new Image(); im.onerror=()=>no(new Error('그림이 아님'));
      im.onload=()=>{ const max=1600, s=Math.min(1, max/Math.max(im.width, im.height)), w=Math.round(im.width*s), h=Math.round(im.height*s);
        const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.fillStyle='#fff'; if(!/png|gif/.test(file.type)) g.fillRect(0,0,w,h); g.drawImage(im,0,0,w,h);
        let mime=/png|gif/.test(file.type) ? 'image/png' : 'image/jpeg', url=c.toDataURL(mime, 0.85);
        if(mime==='image/png' && url.length > 2.5e6){ g.globalCompositeOperation='destination-over'; g.fillStyle='#fff'; g.fillRect(0,0,w,h); mime='image/jpeg'; url=c.toDataURL(mime, 0.85); }
        ok({mime, url}); }; im.src=fr.result; }; fr.readAsDataURL(file); }); }
  async function addFiles(files){
    const list=[...files].filter(f=>/^image\//.test(f.type)); if(!list.length){ toast('사진 파일만 넣을 수 있습니다.'); return; }
    for(const f of list){
      uploading++; paintDraft();
      try{ const {mime, url}=await shrink(f), name=`${($('#list .ment-edit .m-title')?.value||'멘트').trim()||'멘트'} ${draftImgs.length+1}`;
        const j=await api({action:'mentImgPut', name:name+(mime==='image/png'?'.png':'.jpg'), mime, data:url.split(',')[1]});
        imgCache[j.file.id]=url; draftImgs.push({id:j.file.id, name:j.file.name}); }
      catch(e){ toast(needDeploy(e) || ('이미지를 올리지 못했습니다: '+(e.code||e.message)), 4000); }
      finally{ uploading--; paintDraft(); }
    }
  }
  function paintDraft(){   // 고치는 칸의 이미지 줄만 다시 그림 (적던 글자는 그대로)
    const box=$('#list .ment-edit .m-imgs'); if(!box) return;
    box.innerHTML = draftImgs.map((x,i)=>`<span class="m-img"><img data-imgid="${esc(x.id)}" alt="${esc(x.name)}"><button type="button" class="m-imgx" data-imgdel="${i}" title="이 이미지 빼기" aria-label="이미지 빼기">×</button></span>`).join('')
      + `<label class="btn sm m-imgadd" title="사진 고르기 (여러 장) · 이 칸에 붙여넣기(Ctrl+V) · 끌어다 놓기도 됨">＋ 이미지<input type="file" accept="image/*" multiple hidden data-imgpick></label>`
      + (uploading ? `<span class="hint">올리는 중… (${uploading})</span>` : '');
    paintImgs();
  }
  // 클립보드에 그림 그대로 (크롬 · 엣지: PNG로 바꿔서)
  async function copyImg(id){
    const url=await loadImg(id), im=new Image(); im.src=url; await im.decode();
    const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; c.getContext('2d').drawImage(im,0,0);
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));
    await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
  }

  function render(){
    // 이 기기에서 아직 공유 멘트를 못 받았으면(팀 비밀번호 없음 등) 예전 기본 멘트 대신 안내 (2026-11-18: 휴대폰에 옛 멘트만 보이던 것)
    if(!loaded && !edit){ $('#sum').textContent=''; $('#list').innerHTML='<p class="need-key">이 기기에서는 아직 공유 멘트를 받지 못했습니다.<br><b>위 칸에 팀 비밀번호</b>(단체 화면과 같은 비밀번호)를 넣고 「연결」을 누르면 모든 멘트가 보입니다. 한 번 넣으면 이 기기에 기억됩니다.</p>'; return; }
    const q=$('#q').value.trim().replace(/\s/g,'').toLowerCase();
    const list=items.filter(m=>!q || (m.title+m.body).replace(/\s/g,'').toLowerCase().includes(q))
      .map((m,i)=>({m,i})).sort((a,b)=>(favs.has(b.m.id)-favs.has(a.m.id)) || a.i-b.i).map(o=>o.m);   // 즐겨찾기한 멘트가 위로 (그 안에서는 원래 순서)
    $('#sum').textContent = `${items.length}개${q?` · 찾은 ${list.length}개`:''}`;
    const form = m => `<div class="ment ment-edit" data-id="${esc(m.id)}"><input class="m-title" data-ime="ko" placeholder="멘트 이름" value="${esc(m.title)}">`
      + `<textarea class="m-body" data-ime="ko" rows="8" placeholder="멘트 내용">${esc(m.body)}</textarea>`
      + `<div class="m-imgs"></div>`
      + `<div class="row-btns">${m.id==='new'?'':'<button type="button" class="btn" data-mdel>삭제</button>'}<span class="sp"></span><button type="button" class="btn" data-mcancel>취소</button><button type="button" class="btn primary" data-msave>저장</button></div></div>`;
    // 카드에는 그림 미리보기 없이 「글 복사」 옆에 「이미지 복사」 버튼만 (여러 장이면 이미지 1 · 2 …, 2026-11-18)
    const imgBtns = m => (m.imgs||[]).map((x,i,a)=>`<button type="button" class="btn sm" data-imgcopy="${esc(x.id)}" title="${esc(x.name||'이미지')} · 그림을 복사 → 카톡에 Ctrl+V">이미지${a.length>1?' '+(i+1):''} 복사</button>`).join('');
    const imgsHTML = () => '';
    const card = m => edit===m.id ? form(m) : `<div class="ment${favs.has(m.id)?' fav':''}" data-id="${esc(m.id)}"><div class="m-head"><button type="button" class="m-star${favs.has(m.id)?' on':''}" data-mfav title="${favs.has(m.id)?'즐겨찾기 빼기':'즐겨찾기 (위로)'}" aria-pressed="${favs.has(m.id)}">${favs.has(m.id)?'★':'☆'}</button><b>${esc(m.title||'멘트')}</b><span class="sp"></span>`
      + `<button type="button" class="btn primary sm" data-mcopy title="제목과 글을 복사">${(m.imgs||[]).length?'글 복사':'복사'}</button>${imgBtns(m)}${logged?'<button type="button" class="btn sm" data-medit>수정</button>':''}</div><div class="m-body-v">${esc(m.body)}</div>${imgsHTML(m)}</div>`;
    $('#list').innerHTML = (edit==='new' ? form({id:'new', title:'', body:''}) : '')
      + (list.length ? list.map(card).join('') : `<p class="hint">${q?'찾은 멘트가 없습니다.':'멘트가 없습니다.'}</p>`);
    paintDraft(); paintImgs();
    const f=$('#list .ment-edit .m-title'); if(f && !f.value) f.focus();
  }
  async function copy(text){
    try{ await navigator.clipboard.writeText(text); }
    catch(_){ const t=document.createElement('textarea'); t.value=text; t.style.position='fixed'; t.style.opacity='0'; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); }catch(__){} t.remove(); }
  }
  $('#list').addEventListener('click', async e=>{
    const box=e.target.closest('.ment'); if(!box) return; const id=box.dataset.id, m=items.find(x=>x.id===id);
    if(e.target.closest('[data-mcopy]') && m){ await copy(`[${m.title}]\n${m.body}`); toast((m.imgs||[]).length ? `「${m.title}」 글을 복사했습니다. 붙여 넣은 뒤 「이미지 복사」로 그림도 붙여 넣으세요.` : `「${m.title}」 멘트를 제목과 함께 복사했습니다.`, 3200); return; }   // 제목도 함께
    const ic=e.target.closest('[data-imgcopy]'); if(ic){ ic.disabled=true; try{ await copyImg(ic.dataset.imgcopy); toast('이미지를 복사했습니다. 카톡 · 문자에 붙여 넣으세요 (Ctrl+V).'); }
      catch(err){ toast(needDeploy(err) || '이미지를 복사하지 못했습니다. 크롬 · 엣지에서 해 주세요 (그림을 오른쪽 클릭 → 이미지 복사도 됩니다).', 4000); } finally{ ic.disabled=false; } return; }
    if(e.target.closest('[data-mfav]') && m){ favs.has(id) ? favs.delete(id) : favs.add(id); SY.writeJSON(FAV_LS, [...favs]); render(); toast(favs.has(id) ? `「${m.title}」 즐겨찾기 · 위로 올렸습니다.` : `「${m.title}」 즐겨찾기를 뺐습니다.`); return; }
    const dl=e.target.closest('[data-imgdel]'); if(dl){ draftImgs.splice(+dl.dataset.imgdel, 1); paintDraft(); return; }
    if(e.target.closest('[data-medit]')){ edit=id; draftImgs=[...((m&&m.imgs)||[])]; render(); box.scrollIntoView?.({block:'nearest'}); return; }
    if(e.target.closest('[data-mcancel]')){ edit=null; draftImgs=[]; render(); return; }
    if(e.target.closest('[data-msave]')){
      if(uploading){ toast('이미지를 올리는 중입니다. 잠시 뒤 저장하세요.'); return; }
      const title=box.querySelector('.m-title').value.trim(), body=box.querySelector('.m-body').value.replace(/\s+$/,'');
      if(!body.trim() && !draftImgs.length){ toast('멘트 내용이나 이미지를 넣어 주세요.'); box.querySelector('.m-body').focus(); return; }
      const t=title.replace(/^\[|\]$/g,'').trim()||body.split('\n')[0].slice(0,20)||'이미지';
      const imgs=draftImgs.slice();
      if(id==='new') items=[{id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), title:t, body, imgs}, ...items];
      else items=items.map(x=>x.id===id ? {...x, title:t, body, imgs} : x);
      edit=null; draftImgs=[]; await push(id==='new' ? `「${t}」 멘트를 추가했습니다.` : `「${t}」 멘트를 고쳤습니다.`); return; }
    if(e.target.closest('[data-mdel]') && m){
      $('#askMsg').textContent=`「${m.title}」 멘트를 삭제할까요?`; $('#askModal').hidden=false;
      $('#askYes').onclick=async()=>{ $('#askModal').hidden=true; items=items.filter(x=>x.id!==id); edit=null; draftImgs=[]; await push(`「${m.title}」 멘트를 삭제했습니다.`); }; }
  });
  // 이미지 넣기: 고르기 · 붙여넣기 · 끌어다 놓기 (고치는 칸에서만)
  $('#list').addEventListener('change', e=>{ if(e.target.matches('[data-imgpick]')){ addFiles(e.target.files); e.target.value=''; } });
  $('#list').addEventListener('paste', e=>{ if(!e.target.closest('.ment-edit')) return; const fs=[...(e.clipboardData?.items||[])].filter(x=>x.kind==='file' && /^image\//.test(x.type)).map(x=>x.getAsFile()).filter(Boolean); if(!fs.length) return; e.preventDefault(); addFiles(fs); });
  $('#list').addEventListener('dragover', e=>{ const b=e.target.closest('.ment-edit'); if(!b) return; e.preventDefault(); b.classList.add('drop'); });
  $('#list').addEventListener('dragleave', e=>{ e.target.closest('.ment-edit')?.classList.remove('drop'); });
  $('#list').addEventListener('drop', e=>{ const b=e.target.closest('.ment-edit'); if(!b) return; e.preventDefault(); b.classList.remove('drop'); if(e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); });
  // 그림을 누르면 크게 (누르거나 Esc 로 닫기)
  $('#list').addEventListener('click', e=>{ const im=e.target.closest('.m-imgs.view img'); if(!im || !im.src) return; const z=document.createElement('div'); z.className='m-zoom'; z.innerHTML='<img alt="">'; z.firstChild.src=im.src; z.onclick=()=>z.remove(); document.body.appendChild(z); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') document.querySelector('.m-zoom')?.remove(); });
  $('#askNo').onclick=()=>{ $('#askModal').hidden=true; };
  $('#addBtn').onclick=()=>{ if(!logged) return; edit='new'; draftImgs=[]; $('#q').value=''; render(); };
  $('#q').addEventListener('input', ()=>{ if(!edit) render(); });
  $('#keyForm').addEventListener('submit', e=>{ e.preventDefault(); const v=$('#keyIn').value.trim(); if(!v) return; try{ localStorage.setItem(SY.KEY_LS, v); }catch(_){} $('#keyIn').value=''; $('#keyErr').textContent=''; pull(); });
  window.addEventListener('focus', ()=>{ if(!edit) pull(); });
  render(); pull();
})();
