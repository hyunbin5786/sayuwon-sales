// ===== 고객 응대 보조 · 전화응대 멘트 (ment.html, 2026-11-18) =====
// 자주 쓰는 안내 멘트(문자 · 카톡으로 보내는 글)를 모아 두고 「복사」로 바로 붙여 넣기
//  - 저장: 공유 기록(서버 DB 의 calls 표 · 단체 화면과 같은 서버)의 한 줄 id=mentdb (통화 구분 '응대멘트')
//          수정 기록 칸(history)에 JSON {items:[{id, title, body, imgs:[{id, name}]}], at, by}
//  - 이미지: 추가 · 수정할 때 「＋ 이미지」(여러 장) · 붙여넣기(Ctrl+V) · 끌어다 놓기 → 줄여서(긴 쪽 1600px) 구글 드라이브 '응대멘트 이미지' 폴더에
//           (서버 동작 mentImgPut · mentImgGet). 카드에 작은 그림 + 「이미지 복사」(크롬: 그림 그대로 클립보드 → 카톡에 Ctrl+V)
//  - 로그인하지 않아도 보고 복사할 수 있음 (팀 비밀번호는 필요). 추가 · 수정 · 삭제는 로그인한 사람만
//  - 처음(아직 아무것도 없을 때)은 기본 멘트 [홈페이지링크] 하나
//  - 화면 (2026-11-23): 컴퓨터 = 1열 제목 목록(순서 · ★ · ⠿) → 누르면 2열에 글 전체 + 올린 이미지 / 휴대폰 = 예전 그대로 (제목 + 복사 버튼 한 줄)
(function(){
  // 새 버전이 나오면 스스로 새로 불러옴 (2026-11-18): 휴대폰 · 컴퓨터 브라우저가 이 화면을 10분까지 기억해서 예전 코드(예전 즐겨찾기 방식 등)가 돌던 것
  (function(){ try{ const me=[...document.scripts].map(s=>s.src).find(s=>/js\/ment\.js\?v=/.test(s)), cur=me && me.split('?v=')[1];
    if(!cur || sessionStorage.getItem('sy_ment_fresh')===cur) return;
    fetch('ment.html?nc='+Date.now(), {cache:'no-store'}).then(r=>r.text()).then(t=>{ const m=t.match(/js\/ment\.js\?v=([\w-]+)/); if(m && m[1]!==cur && sessionStorage.getItem('sy_ment_fresh')!==m[1]){ sessionStorage.setItem('sy_ment_fresh', m[1]);   /* 한 번만 (끝없이 돌지 않게) */ location.replace(location.pathname+'?v='+m[1]); } }).catch(()=>{});
  }catch(_){} })();
  const $=s=>document.querySelector(s), esc=SY.esc;
  const ID='mentdb', TYPE='응대멘트', CACHE_LS='sy_ment_cache', FAV_LS='sy_ment_fav';
  const LOCAL_FAVS=SY.readJSON(FAV_LS, []);   // 예전(이 브라우저만) 즐겨찾기 → 공유로 옮길 때 씀 (2026-11-18)
  const isFav = m => !!(m && m.fav);   // 즐겨찾기 = 멘트에 함께 저장 (공유 기록 · 휴대폰 · 컴퓨터 · 모든 사람 같음)
  const isMobile = () => matchMedia('(max-width:700px)').matches;
  const canEdit = () => logged && !isMobile();   // 추가 · 수정 · 삭제 · 즐겨찾기 바꾸기는 컴퓨터에서 로그인한 사람만
  const DEFAULT=[{ id:'home', title:'홈페이지링크', body:'안녕하세요.\n사유원입니다.\n\n공식 홈페이지 링크 보내드립니다.\nhttps://sayuwon.com/\n\n감사합니다.' }];
  const user=SY.user(), logged=!!user;
  let pushing=false, failed=false, loaded=!!SY.readJSON(CACHE_LS, null);   // 이 기기에서 공유 멘트를 한 번이라도 받았는지 (못 받았으면 기본 멘트 대신 팀 비밀번호 안내)
  let row=null, items=SY.readJSON(CACHE_LS, null)||DEFAULT.slice(), edit=null, draftImgs=[], uploading=0;   // edit = 고치는 멘트 id ('new' = 새로) · draftImgs = 고치는 중 이미지
  let sel=null;   // 컴퓨터 화면(2열)에서 왼쪽 목록에서 고른 멘트 id (2026-11-23)
  const imgCache={}, imgWait={};   // 이미지 id → data URL (이 창에서만)
  $('#me').textContent = logged ? '👤 '+user.name : '';
  $('#addBtn').hidden = !logged;

  const toast = (m, ms=2200) => { const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>{ t.hidden=true; }, ms); };
  const setSync = t => { $('#sync').textContent=t; };
  const needDeploy = () => '';   // (예전 서버가 이미지 기능이 없는 버전일 때 안내하던 것 — 이제 늘 됨)
  // 불러오기: 팀 비밀번호 없이 (서버 동작 mentList · 2026-11-18, 주로 휴대폰). 예전 배포면 비밀번호가 있는 기기만 전체 목록에서
  const applyRow = r => { row = r ? {...(row||{}), ...r} : row; let h=null; try{ h=r ? JSON.parse(r.history||'{}') : null; }catch(_){}
    items = h && Array.isArray(h.items) ? h.items : DEFAULT.slice(); SY.writeJSON(CACHE_LS, items); loaded=true; failed=false; setSync(''); if(!edit) render();
    // 예전에 이 컴퓨터에서만 해 둔 즐겨찾기 → 공유 즐겨찾기로 한 번 옮김 (아직 아무 멘트도 즐겨찾기가 없을 때만)
    if(canEdit() && LOCAL_FAVS.length && r && !items.some(x=>x.fav)){ items=items.map(x=>LOCAL_FAVS.includes(x.id) ? {...x, fav:true} : x); try{ localStorage.removeItem(FAV_LS); }catch(_){} LOCAL_FAVS.length=0; if(items.some(x=>x.fav)) push('이 컴퓨터의 즐겨찾기를 휴대폰에도 보이게 옮겼습니다.'); } };
  async function pull(){
    if(pushing) return;   // 저장 중에는 다시 읽지 않음 (저장 전 내용으로 덮어쓰지 않게)
    setSync('불러오는 중…');
    try{ const j=await SY.call({action:'mentList'}); applyRow(j.ment||null); return; }
    catch(e){
      if(SY.getKey()){ try{ const j=await SY.call({action:'list'}); applyRow((j.items||[]).find(r=>r.id===ID)||null); return; } catch(_){} }
      failed=true; setSync('연결 안 됨 · 잠시 뒤 다시'); if(!loaded && !edit) render(); }
  }
  async function push(what){
    if(!logged){ toast('로그인한 사람만 고칠 수 있습니다.'); return false; }
    const now=new Date().toISOString();
    const item={...(row||{}), id:ID, callType:TYPE, saved:(row&&row.saved)||now, takenBy:user.name, summary:`전화응대 멘트 ${items.length}개`, history:JSON.stringify({items, at:now, by:user.name})};
    delete item.date; delete item.org;
    SY.writeJSON(CACHE_LS, items); render(); setSync('저장 중…');
    pushing=true; try{ await SY.call({action:'put', item}); row=item; pushing=false; setSync(''); toast(what); return true; }
    catch(e){ pushing=false; setSync('저장 못 함'); if(e.code==='bad_key'){ $('#keyBox').hidden=false; toast(SY.authFail(), 4000); } else toast('저장하지 못했습니다: '+(e.code||e.message)); return false; }   // 고치기만 비밀번호 필요
  }

  // ---------- 이미지 ----------
  // 불러오기 (한 번 받은 것은 이 창에 기억)
  function loadImg(id){
    if(imgCache[id]) return Promise.resolve(imgCache[id]);
    if(!imgWait[id]) imgWait[id]=SY.call({action:'mentImgGet', id}).then(j=>{ imgCache[id]=`data:${j.file.mime};base64,${j.file.data}`; return imgCache[id]; }).catch(e=>{ delete imgWait[id]; throw e; });
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
        const j=await SY.call({action:'mentImgPut', name:name+(mime==='image/png'?'.png':'.jpg'), mime, data:url.split(',')[1]});
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
  // 이미지 복사 · 보내기 (2026-11-18 다시): 그림을 미리 받아 PNG 로 만들어 두고(pngCache), 누르는 순간 바로
  //  - 휴대폰: 공유 창(카카오톡 · 문자 등)으로 그림을 바로 보냄 (휴대폰 카톡은 붙여넣기로 그림이 잘 안 들어감) · 공유가 안 되는 브라우저는 클립보드로
  //  - 컴퓨터: 클립보드에 그림 그대로 → 카톡 PC에 Ctrl+V
  //  - 누르기 전에 받아 두지 않으면 휴대폰 브라우저가 「누른 직후」가 아니라고 막아서 안 되던 것
  const pngCache={}, pngWait={};
  function pngOf(id){
    if(pngCache[id]) return Promise.resolve(pngCache[id]);
    if(!pngWait[id]) pngWait[id]=loadImg(id).then(url=>new Promise((ok,no)=>{ const im=new Image(); im.onload=()=>{ const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; c.getContext('2d').drawImage(im,0,0); c.toBlob(b=>{ if(!b) return no(new Error('png')); pngCache[id]=b; ok(b); }, 'image/png'); }; im.onerror=()=>no(new Error('img')); im.src=url; })).catch(e=>{ delete pngWait[id]; throw e; });
    return pngWait[id];
  }
  function preloadImgs(){ items.forEach(m=>(m.imgs||[]).forEach(x=>{ pngOf(x.id).catch(()=>{}); })); }
  async function copyImg(id, name){
    const fileOf = b => new File([b], (String(name||'이미지').replace(/[\/:*?"<>|]+/g,' ').trim()||'이미지')+'.png', {type:'image/png'});
    if(isMobile() && navigator.share){
      const b=pngCache[id] || await pngOf(id), f=fileOf(b);
      if(!navigator.canShare || navigator.canShare({files:[f]})){ await navigator.share({files:[f]}); return 'share'; }
    }
    // 클립보드: 누르는 순간 바로 쓰기 (그림이 아직이면 받는 중인 것을 넘김 — 사파리 · 크롬 모두)
    const data = pngCache[id] || pngOf(id);
    await navigator.clipboard.write([new ClipboardItem({'image/png': data})]);
    return 'copy';
  }
  // 휴대폰: 「이미지 저장」 버튼 하나로 그 멘트의 그림을 모두 갤러리에 저장 (2026-11-19)
  //  - 아이폰 · 아이패드: 공유 창 → 「이미지 n개 저장」(사진 앱) · 사파리는 내려받기를 파일 앱에 넣어서
  //  - 안드로이드: 내려받기(Download 폴더 → 갤러리 앱에 보임)
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints>1);
  async function saveImgs(m){
    const imgs=m.imgs||[], base=(String(m.title||'이미지').replace(/[\/:*?"<>|]+/g,' ').trim()||'이미지');
    const blobs=imgs.every(x=>pngCache[x.id]) ? imgs.map(x=>pngCache[x.id]) : await Promise.all(imgs.map(x=>pngOf(x.id)));
    const files=blobs.map((b,i)=>new File([b], `${base}${imgs.length>1?'_'+(i+1):''}.png`, {type:'image/png'}));
    if(isIOS() && navigator.share && (!navigator.canShare || navigator.canShare({files}))){ await navigator.share({files}); return 'share'; }
    for(const f of files){ const u=URL.createObjectURL(f), a=document.createElement('a'); a.href=u; a.download=f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u), 4000); await new Promise(r=>setTimeout(r, 400)); }
    return 'download';
  }

  function render(){
    // 이 기기에서 아직 멘트를 못 받았으면 예전 기본 멘트 대신 「불러오는 중」 · 「불러오지 못함」 (팀 비밀번호는 필요 없음, 2026-11-18)
    if(!loaded && !edit){ $('#sum').textContent=''; $('#list').innerHTML = failed ? '<p class="need-key">멘트를 불러오지 못했습니다. 인터넷 연결을 확인하고 잠시 뒤 다시 열어 주세요.</p>' : SY.skel('list', 6, {label:'멘트를 불러오는 중'}); return; }   // 받는 동안 스켈레톤 (2026-11-27)
    const q=$('#q').value.trim().replace(/\s/g,'').toLowerCase();
    const list=items.filter(m=>!q || (m.title+m.body).replace(/\s/g,'').toLowerCase().includes(q))
      .map((m,i)=>({m,i})).sort((a,b)=>(isFav(b.m)-isFav(a.m)) || a.i-b.i).map(o=>o.m);   // 즐겨찾기한 멘트가 위로 (그 안에서는 원래 순서)
    $('#sum').textContent = `${items.length}개${q?` · 찾은 ${list.length}개`:''}`;
    const form = m => `<div class="ment ment-edit" data-id="${esc(m.id)}"><input class="m-title" data-ime="ko" placeholder="멘트 이름" value="${esc(m.title)}">`
      + `<textarea class="m-body" data-ime="ko" rows="8" placeholder="멘트 내용">${esc(m.body)}</textarea>`
      + `<div class="m-imgs"></div>`
      + `<div class="row-btns">${m.id==='new'?'':'<button type="button" class="btn" data-mdel>삭제</button>'}<span class="sp"></span><button type="button" class="btn" data-mcancel>취소</button><button type="button" class="btn primary" data-msave>저장</button></div></div>`;
    // 카드에는 그림 미리보기 없이 「글 복사」 옆에 「이미지 복사」 버튼만 (여러 장이면 이미지 1 · 2 …, 2026-11-18)
    const imgBtns = m => !(m.imgs||[]).length ? '' : isMobile() ? `<button type="button" class="btn sm" data-imgsave title="그림을 모두 갤러리에 저장">이미지 저장${m.imgs.length>1?` (${m.imgs.length})`:''}</button>` : (m.imgs||[]).map((x,i,a)=>`<button type="button" class="btn sm" data-imgcopy="${esc(x.id)}" title="${esc(x.name||'이미지')} · 그림을 복사 → 카톡에 Ctrl+V">이미지${a.length>1?(i+1):''}<span class="cp"> 복사</span></button>`).join('');
    const imgsHTML = () => '';
    const card = m => edit===m.id ? form(m) : `<div class="ment${isFav(m)?' fav':''}" data-id="${esc(m.id)}"><div class="m-head"><button type="button" class="m-star${isFav(m)?' on':''}" data-mfav title="${isFav(m)?'즐겨찾기 빼기':'즐겨찾기 (위로)'}" aria-pressed="${isFav(m)}">${isFav(m)?'★':'☆'}</button>${canEdit()?'<span class="m-grip" draggable="true" data-mgrip title="끌어서 다른 멘트 위에 놓으면 그 자리로 (순서 바꾸기)" aria-label="순서 바꾸기">⠿</span>':''}<b>${esc(m.title||'멘트')}</b><span class="sp"></span>`
      + `<button type="button" class="btn primary sm" data-mcopy title="제목과 글을 복사">${(m.imgs||[]).length?'글 복사':'복사'}</button>${imgBtns(m)}${canEdit()?'<button type="button" class="btn sm" data-medit>수정</button>':''}</div><div class="m-body-v">${esc(m.body)}</div>${imgsHTML(m)}</div>`;
    const two = !isMobile(); $('#list').classList.toggle('md', two);
    if(two){
      // 컴퓨터 (2026-11-23): 1열 = 제목만 순서대로 (★ 즐겨찾기 · ⠿ 순서 바꾸기) → 누르면 2열에 그 멘트의 글 전체 + 올린 이미지 + 복사 · 수정
      if(!list.some(m=>m.id===sel)) sel = list.length ? list[0].id : null;
      const cur = list.find(m=>m.id===sel);
      const nav = list.length ? list.map((m,i)=>`<div class="ment m-item${isFav(m)?' fav':''}${m.id===sel && edit!=='new'?' on':''}" data-id="${esc(m.id)}" title="${esc(m.title||'멘트')}"><button type="button" class="m-star${isFav(m)?' on':''}" data-mfav title="${isFav(m)?'즐겨찾기 빼기':'즐겨찾기 (위로)'}" aria-pressed="${isFav(m)}">${isFav(m)?'★':'☆'}</button>${canEdit()?'<span class="m-grip" draggable="true" data-mgrip title="끌어서 다른 멘트 위에 놓으면 그 자리로 (순서 바꾸기)" aria-label="순서 바꾸기">⠿</span>':''}<span class="m-no">${i+1}</span><b>${esc(m.title||'멘트')}</b>${(m.imgs||[]).length?`<span class="m-hasimg" title="이미지 ${m.imgs.length}장">🖼</span>`:''}</div>`).join('')
        : `<p class="hint">${q?'찾은 멘트가 없습니다.':'멘트가 없습니다.'}</p>`;
      const view = m => `<div class="ment m-view${isFav(m)?' fav':''}" data-id="${esc(m.id)}"><div class="m-head"><b>${esc(m.title||'멘트')}</b><span class="sp"></span>`
        + `<button type="button" class="btn primary sm" data-mcopy title="제목과 글을 복사">${(m.imgs||[]).length?'글 복사':'복사'}</button>${imgBtns(m)}${canEdit()?'<button type="button" class="btn sm" data-medit>수정</button>':''}</div><div class="m-body-v">${esc(m.body)}</div>`
        + ((m.imgs||[]).length ? `<div class="m-imgs view">${m.imgs.map(x=>`<span class="m-img"><img data-imgid="${esc(x.id)}" alt="${esc(x.name||'이미지')}" title="누르면 크게"></span>`).join('')}</div>` : '') + `</div>`;
      const detail = edit==='new' ? form({id:'new', title:'', body:''}) : !cur ? '<p class="hint">왼쪽에서 멘트를 고르세요.</p>' : edit===cur.id ? form(cur) : view(cur);
      $('#list').innerHTML = `<div class="m-nav">${nav}</div><div class="m-detail">${detail}</div>`;
    } else
    $('#list').innerHTML = (edit==='new' ? form({id:'new', title:'', body:''}) : '')
      + (list.length ? list.map(card).join('') : `<p class="hint">${q?'찾은 멘트가 없습니다.':'멘트가 없습니다.'}</p>`);
    paintDraft(); paintImgs(); preloadImgs();   // 이미지 복사 · 보내기를 누르는 순간 바로 되게 그림을 미리 받아 둠
    const f=$('#list .ment-edit .m-title'); if(f && !f.value) f.focus();
  }
  async function copy(text){
    try{ await navigator.clipboard.writeText(text); }
    catch(_){ const t=document.createElement('textarea'); t.value=text; t.style.position='fixed'; t.style.opacity='0'; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); }catch(__){} t.remove(); }
  }
  $('#list').addEventListener('click', async e=>{
    const box=e.target.closest('.ment'); if(!box) return; const id=box.dataset.id, m=items.find(x=>x.id===id);
    if(box.classList.contains('m-item') && !e.target.closest('[data-mfav],[data-mgrip]')){   // 왼쪽 제목을 누름 → 오른쪽에 그 멘트
      if(edit){ toast('고치던 멘트를 먼저 저장하거나 취소해 주세요.'); return; } sel=id; render(); return; }
    if(e.target.closest('[data-mcopy]') && m){ await copy(`[${m.title}]\n${m.body}`); toast((m.imgs||[]).length ? (isMobile() ? `「${m.title}」 글을 복사했습니다. 그림은 「이미지 저장」으로 저장해 보내세요.` : `「${m.title}」 글을 복사했습니다. 붙여 넣은 뒤 「이미지 복사」로 그림도 붙여 넣으세요.`) : `「${m.title}」 멘트를 제목과 함께 복사했습니다.`, 3200); return; }   // 제목도 함께
    if(e.target.closest('[data-imgsave]') && m){   // 휴대폰: 그림 모두 저장
      try{ const how=await saveImgs(m), n=(m.imgs||[]).length; toast(how==='share' ? '「이미지 저장」을 고르면 사진 앱에 저장됩니다.' : `그림 ${n}장을 저장했습니다 (갤러리 · Download 폴더).`, 3200); }
      catch(err){ if(err && err.name==='AbortError') return; toast(needDeploy(err) || '그림을 저장하지 못했습니다. 잠시 뒤 다시 눌러 주세요 (그림을 받는 중일 수 있습니다).', 4000); } return; }
    const ic=e.target.closest('[data-imgcopy]'); if(ic){ const nm=(items.find(x=>(x.imgs||[]).some(i=>i.id===ic.dataset.imgcopy))||{}).title||'이미지';
      try{ const how=await copyImg(ic.dataset.imgcopy, nm); toast(how==='share' ? '그림을 보냈습니다.' : isMobile() ? '그림을 복사했습니다. 붙여 넣기가 안 되면 「이미지」를 다시 눌러 공유로 보내세요.' : '이미지를 복사했습니다. 카톡 · 문자에 붙여 넣으세요 (Ctrl+V).', 3200); }
      catch(err){ if(err && err.name==='AbortError') return;   // 공유 창을 닫음
        toast(needDeploy(err) || (isMobile() ? '그림을 보내지 못했습니다. 잠시 뒤 다시 눌러 주세요 (그림을 받는 중일 수 있습니다).' : '이미지를 복사하지 못했습니다. 크롬 · 엣지에서 해 주세요.'), 4000); } return; }
    if(e.target.closest('[data-mfav]') && m){   // 즐겨찾기: 멘트에 저장 → 휴대폰 · 컴퓨터 · 모든 사람에게 같은 순서 (바꾸기는 컴퓨터에서 로그인한 사람만)
      if(!canEdit()){ toast(isMobile() ? '즐겨찾기는 컴퓨터에서 바꿀 수 있습니다.' : '로그인하면 즐겨찾기를 바꿀 수 있습니다.'); return; }
      const want=!m.fav; items=items.map(x=>x.id===id ? {...x, fav:want} : x);
      const ok=await push(want ? `「${m.title}」 즐겨찾기 저장 중…` : `「${m.title}」 즐겨찾기 빼는 중…`);
      if(!ok){ items=items.map(x=>x.id===id ? {...x, fav:m.fav} : x); SY.writeJSON(CACHE_LS, items); render(); return; }   // 저장 못 하면 되돌림 (팀 비밀번호 칸이 뜸)
      // 공유 기록에 정말 들어갔는지 다시 읽어서 확인 (휴대폰과 같은 길로)
      try{ const j=await SY.call({action:'mentList'}); let h={}; try{ h=JSON.parse((j.ment||{}).history||'{}'); }catch(_){}
        const s=(h.items||[]).find(x=>x.id===id); toast(s && !!s.fav===want ? (want ? `「${m.title}」 즐겨찾기 · 휴대폰에도 맨 위에 보입니다.` : `「${m.title}」 즐겨찾기를 뺐습니다 (휴대폰에도).`) : '즐겨찾기가 공유 기록에 저장되지 않았습니다. 잠시 뒤 다시 눌러 주세요.', 3500); }
      catch(_){ toast('저장은 했지만 확인하지 못했습니다. 휴대폰에서 새로고침해 보세요.', 3500); }
      return; }
    const dl=e.target.closest('[data-imgdel]'); if(dl){ draftImgs.splice(+dl.dataset.imgdel, 1); paintDraft(); return; }
    if((e.target.closest('[data-medit]') || e.target.closest('[data-msave]') || e.target.closest('[data-mdel]')) && !canEdit()){ toast('멘트 추가 · 수정은 컴퓨터에서 할 수 있습니다.'); return; }   // 휴대폰에서는 복사만
    if(e.target.closest('[data-medit]')){ edit=id; draftImgs=[...((m&&m.imgs)||[])]; render(); box.scrollIntoView?.({block:'nearest'}); return; }
    if(e.target.closest('[data-mcancel]')){ edit=null; draftImgs=[]; render(); return; }
    if(e.target.closest('[data-msave]')){
      if(uploading){ toast('이미지를 올리는 중입니다. 잠시 뒤 저장하세요.'); return; }
      const title=box.querySelector('.m-title').value.trim(), body=box.querySelector('.m-body').value.replace(/\s+$/,'');
      if(!body.trim() && !draftImgs.length){ toast('멘트 내용이나 이미지를 넣어 주세요.'); box.querySelector('.m-body').focus(); return; }
      const t=title.replace(/^\[|\]$/g,'').trim()||body.split('\n')[0].slice(0,20)||'이미지';
      const imgs=draftImgs.slice();
      if(id==='new'){ sel=Date.now().toString(36)+Math.random().toString(36).slice(2,6); items=[{id:sel, title:t, body, imgs}, ...items]; }
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
  // 순서 바꾸기 (2026-11-20): 멘트 이름 앞 ⠿ 를 끌어 다른 멘트 위에 놓으면 그 자리로 → 공유 기록에 저장 (모든 사람 · 휴대폰도 같은 순서)
  //  즐겨찾기는 늘 위에 모이므로 즐겨찾기끼리 · 나머지끼리만. 컴퓨터에서 로그인한 사람만
  let dragId=null;
  const clearDrag = () => document.querySelectorAll('#list .ment.dragging, #list .ment.drop-on').forEach(x=>x.classList.remove('dragging','drop-on'));
  $('#list').addEventListener('dragstart', e=>{ const g=e.target.closest?.('[data-mgrip]'); if(!g || edit) return; const b=g.closest('.ment'); dragId=b.dataset.id; if(sel!==dragId){ /* 끌기 시작한 멘트는 그대로 두고 */ }
    e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', dragId); try{ e.dataTransfer.setDragImage(b, 24, 20); }catch(_){} b.classList.add('dragging'); });
  $('#list').addEventListener('dragover', e=>{ if(!dragId) return; const b=e.target.closest('.ment:not(.ment-edit):not(.m-view)'); if(!b || b.dataset.id===dragId) return; e.preventDefault(); e.dataTransfer.dropEffect='move';
    if(!b.classList.contains('drop-on')){ document.querySelectorAll('#list .ment.drop-on').forEach(x=>x.classList.remove('drop-on')); b.classList.add('drop-on'); } });
  $('#list').addEventListener('drop', async e=>{ if(!dragId) return; const b=e.target.closest('.ment:not(.ment-edit):not(.m-view)'); const from=dragId; dragId=null; clearDrag(); if(!b || b.dataset.id===from) return; e.preventDefault();
    const a=items.find(x=>x.id===from), t=items.find(x=>x.id===b.dataset.id); if(!a || !t) return;
    if(isFav(a)!==isFav(t)){ toast('즐겨찾기한 멘트는 즐겨찾기끼리, 나머지는 나머지끼리 순서를 바꿀 수 있습니다.', 3200); return; }
    const old=items.slice(), i=items.indexOf(a), j=items.indexOf(t), next=items.filter(x=>x!==a); next.splice(next.indexOf(t)+(i<j?1:0), 0, a);   // 아래로 옮기면 그 멘트 뒤, 위로 옮기면 그 멘트 앞
    items=next; const ok=await push(`「${a.title}」 순서를 바꿨습니다.`); if(!ok){ items=old; SY.writeJSON(CACHE_LS, items); render(); } });
  $('#list').addEventListener('dragend', ()=>{ dragId=null; clearDrag(); });
  // 그림을 누르면 크게 (누르거나 Esc 로 닫기)
  $('#list').addEventListener('click', e=>{ const im=e.target.closest('.m-imgs.view img'); if(!im || !im.src) return; const z=document.createElement('div'); z.className='m-zoom'; z.innerHTML='<img alt="">'; z.firstChild.src=im.src; z.onclick=()=>z.remove(); document.body.appendChild(z); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') document.querySelector('.m-zoom')?.remove(); });
  $('#askNo').onclick=()=>{ $('#askModal').hidden=true; };
  $('#addBtn').onclick=()=>{ if(!canEdit()){ toast('멘트 추가는 컴퓨터에서 할 수 있습니다.'); return; } edit='new'; draftImgs=[]; $('#q').value=''; render(); };
  $('#q').addEventListener('input', ()=>{ if(!edit) render(); });
  // (팀 비밀번호 입력 칸은 없앰 · 2026-11-21 — 서버는 로그인으로 확인)
  window.addEventListener('focus', ()=>{ if(!edit) pull(); });
  matchMedia('(max-width:700px)').addEventListener?.('change', ()=>{ if(!edit) render(); });
  render(); pull();
})();
