// ===== 전체 메뉴 (모든 화면 공통, 2026-11-18) =====
// 헤더 맨 앞 ☰ 버튼 → 왼쪽에서 메뉴가 화면 위로 뜸 (뒤는 회색으로 가림 · 화면을 밀지 않음). 바깥 · × · Esc 로 닫기
// 묶음(예약보조 · 운영보조 · 홍보 보조 · 매뉴얼 · 기타 설정)은 눌러서 펼치고 접으며, 펼친 상태는 이 브라우저에 기억 (sy_menu_acc2 · 2026-11-24: 처음에는 모두 접힘 — 예전 기억은 쓰지 않음)
// ===== 글자 크기 (2026-11-26): 헤더 오른쪽의 「가가」 버튼 → 슬라이더 (85% ~ 140%). 고른 크기는 이 브라우저에 기억 (sy_fz) =====
//  화면 전체를 확대(zoom)하지 않고 글자만 키움: 확대하면 달력 · 시간 고르는 창의 자리와 화면 높이(vh) 계산이 어긋남.
//  방법: CSS 파일의 글자 크기(…px)를 「…px × --sy-fz」 로 바꿔 두고, html 의 --sy-fz 값만 바꿈. 「보통」만 쓰는 브라우저에서는 아무것도 바꾸지 않음.
//  견적서 종이 · 사진으로 저장하는 표 · 인쇄는 늘 원래 크기 (css/menu.css 에서 --sy-fz:1 로 되돌림). 팝업(iframe) 안에서도 같은 크기로 보이게 이 부분은 팝업 안에서도 돈다.
window.syFont = (function(){
  const KEY='sy_fz', MIN=.85, MAX=1.4, root=document.documentElement;
  const get = () => { try{ const v=+localStorage.getItem(KEY); return v>=MIN && v<=MAX ? Math.round(v*100)/100 : 1; }catch(_){ return 1; } };
  const PX=/^([\d.]+)px$/;
  const fixRules = rules => { for(const r of rules){
    const s=r.style;
    if(s && typeof s.getPropertyValue==='function'){ const v=s.getPropertyValue('font-size'), m=PX.exec(v);
      if(m) s.setProperty('font-size', `calc(${m[1]}px * var(--sy-fz,1))`, s.getPropertyPriority('font-size'));
      else if(!v){ const f=s.getPropertyValue('font');   // font 한 줄에 var(…) 가 섞여 있으면 font-size 가 따로 읽히지 않음 → 그 줄의 첫 px 값(=글자 크기)을 바꿈
        if(/var\(/.test(f) && !/--sy-fz/.test(f) && /[\d.]+px/.test(f)) s.setProperty('font', f.replace(/([\d.]+)px/, 'calc($1px * var(--sy-fz,1))'), s.getPropertyPriority('font')); } }
    let sub=null; try{ sub=r.cssRules; }catch(_){}
    if(sub && sub.length) fixRules(sub); } };
  let on=false, timer=0;
  const fixAll = () => { for(const sh of document.styleSheets){ let rules=null; try{ rules=sh.cssRules; }catch(_){}   // 다른 곳의 CSS(글꼴)는 읽을 수 없음 → 건너뜀
    if(rules) try{ fixRules(rules); }catch(_){} } };
  const later = () => { clearTimeout(timer); timer=setTimeout(fixAll, 30); };
  const start = () => { if(on) return; on=true; fixAll(); window.addEventListener('load', fixAll);
    // 나중에 더해지는 CSS (나의 할일 팝업 · 시간 고르는 창 등)도 같이
    try{ new MutationObserver(ms=>{ for(const m of ms) for(const n of m.addedNodes){ if(n.nodeName==='STYLE') later(); else if(n.nodeName==='LINK'){ n.addEventListener('load', later); later(); } } }).observe(root, {childList:true, subtree:true}); }catch(_){} };
  const apply = () => { const v=get(); if(v!==1) start(); if(v===1) root.style.removeProperty('--sy-fz'); else root.style.setProperty('--sy-fz', v); window.dispatchEvent(new Event('resize')); return v; };   // resize: 크기에 맞춰 다시 재는 화면(예약 현황 미리보기 등)이 다시 재게
  const set = v => { try{ if(v===1) localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); }catch(_){}
    document.querySelectorAll('iframe').forEach(f=>{ try{ f.contentWindow.syFont.apply(); }catch(_){} });   // 열려 있는 팝업(나의 할일 · 품목관리 등) 안도 바로
    return apply(); };
  window.addEventListener('storage', e=>{ if(e.key===null || /sy_fz$/.test(e.key)) apply(); });   // 다른 창에서 바꾸면 여기도
  if(get()!==1) apply();
  return {MIN, MAX, get, set, apply};
})();
(function(){
  if(window.parent!==window) return;   // 팝업 안(나의 할일 · 품목관리 등)에서는 안 띄움
  const hd=document.querySelector('header'); if(!hd) return;
  const VER = (((document.currentScript||{}).src||'').match(/[?&]v=([\w-]+)/)||[])[1] || '';   // 이 파일을 읽은 ?v= 값 — 아래에서 CSS 를 더할 때 같은 값을 씀 (tools/bump.ps1 은 HTML 만 바꾸므로)
  const base = /\/document\//.test(location.pathname) ? '../' : '';
  const logged = (()=>{ try{ const u=JSON.parse(localStorage.getItem('sy_user')||'null'); return !!(u && u.name && u.emp); }catch(_){ return false; } })();
  const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const I = (href, b, s, go) => ({href:base+href, key:href, b, s, go});   // key = 메뉴 설정에서 이 항목을 가리키는 열쇠 (주소 그대로)
  const G = [
    {k:'book', t:'예약보조', login:1, items:[ {sub:'고객 응대 접수'}, I('personal.html','개인고객 응대'), I('group.html','단체고객 응대'),
      {sub:'고객 응대 보조'}, I('status.html','예약 현황 공유'), I('naver.html','네이버 예약 → 사유원 전산 이관'), {...I('ment.html','전화응대 멘트'), guest:1}, I('document/','견적서 / 거래명세서 발급'), I('prep.html','다음날 고객 응대 준비'), I('clergy.html','대구대교구 무료입장 명부'), I('cancel.html','예약 취소 요청'), I('rent.html','대관 규정 및 상품'), I('agency.html','협업 여행사 할인 현황') ]},   // guest: 로그인하지 않아도 보이는 항목 (2026-11-18) · sep: 가로줄 = 아침 · 일과 중 · 하루 마무리에 하는 일 구분 (2026-11-19)
    {k:'ops', t:'운영보조', items:[ {sub:'예약현황 공유'}, {key:'book', b:'예약현황 공유 (몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰)', chips:[['mb','몽몽마방'],['rent','대관'],['docent','도슨트'],['prog','프로그램'],['coupon','음료쿠폰']]},
      {sub:'운영 참고 자료'}, I('lost.html','분실물 찾기'),{...I('accident.html','사고현황 접수'), login:1}, {...I('stock.html','재고관리'), login:1}, {...I('promo.html','기업 프로모션 할인'), login:1} ]},   // 스마트스토어 발송 보고는 메뉴에서 뺌 (2026-11-24 · 스마트스토어 판매는 재고관리에서 기록)
    {k:'pr', t:'홍보 보조', login:1, items:[ I('press.html','홍보 기자 리스트') ]},   // 2026-11-24 · 기능은 나중에 (지금은 준비 중 페이지)
    {k:'manual', t:'매뉴얼', login:1, items:[ I('manual.html','고객 응대 매뉴얼') ]},   // 2026-11-24 홍보 보조 아래 · 보기 · 찾기 · 안내문 올리기 · 반영은 한 화면(manual.html)에서
    {k:'set', t:'기타 설정', login:1, items:[ I('./#catalog','품목관리','', 'catalog'), I('./#members','멤버관리','', 'members'), {key:'menucfg', b:'메뉴 설정', cfgBtn:1} ]},
  ];
  // 개발 중 기능 (2026-11-25): 배포 사이트에서는 메뉴에서 아예 뺌 (테스트 사이트에만 있음 · js/common.js SY_DEV.DEV_PAGES) · 다 빠진 묶음(홍보 보조 · 매뉴얼 등)도 안 보임
  if(typeof SY_DEV!=='undefined' && SY_DEV.isProd){ G.forEach(g=>{ g.items=g.items.filter(i=>!(i.href && SY_DEV.off(i.href))); }); for(let i=G.length-1;i>=0;i--) if(!G[i].items.some(x=>x.href || x.chips)) G.splice(i,1); }
  let st={}; try{ st=JSON.parse(localStorage.getItem('sy_menu_acc2')||'{}')||{}; }catch(_){}
  // 지금 화면 표시: 파일 이름이 같고, 메뉴 주소의 ?값(tab · p 등)이 지금 주소에도 있으면 (단체고객 응대는 나의 할일 · 예약 현황이 아닐 때만)
  const herePath = /\/document\//.test(location.pathname) ? 'document/' : (location.pathname.replace(/.*\//,'') || 'index.html'), hereQ = new URLSearchParams(location.search);
  const isHere = href => { const [p,q]=href.replace(/^(\.\.\/)?/,'').split('?'); if((p||'index.html')!==herePath) return false;
    if(!q) return p!=='group.html' || (!hereQ.get('my') && !hereQ.get('book'));
    return [...new URLSearchParams(q)].every(([k,v])=>hereQ.get(k)===v); };
  const isHomePg = herePath==='index.html';   // 첫 화면: 메뉴를 고르러 오는 곳 → 로그인했으면 메뉴를 펼친 채로 (묶음도 모두 펼침)
  // ===== 메뉴 설정 (2026-11-26): 메뉴 항목마다 PC · 모바일(700px 아래)에 보일지 — 「기타 설정 › 메뉴 설정」에서 체크로 정함. 모두가 같이 쓰는 설정 =====
  //  저장: 공유 기록(calls) 한 줄 id menudb · 통화 구분 「메뉴설정」 · 수정 기록 칸 {cfg:{항목 열쇠:{pc, m}}}. 읽기: 서버 동작 menuGet (로그인 없이 · api 12 부터 — 예전 서버면 기본값)
  //  항목 열쇠 = 그 항목의 주소(personal.html · document/ · ./#catalog …) · 예약현황 공유 묶음 = book · 나의 할일 = my · 메뉴 설정 = menucfg
  //  기본값(설정에 없는 항목 · 새로 생긴 항목): PC · 모바일 모두 보임 / 나의 할일 = 모바일만 (PC 는 헤더에 버튼이 있음) / 메뉴 설정 = PC 만. 메뉴 설정은 PC 에서 늘 보임 (못 끄게 — 끄면 다시 켤 길이 없음)
  //  받아 온 설정은 이 브라우저에 기억(sy_menu_cfg)해 두고 화면을 열 때 바로 씀 → 뒤에서 새로 받아 달라졌으면 메뉴를 다시 그림. 로그인해야 보이는 항목은 설정과 상관없이 로그인해야 보임
  const MQ = matchMedia('(max-width:700px)');
  const DEF = k => k==='my' ? {pc:false, m:true} : k==='menucfg' ? {pc:true, m:false} : {pc:true, m:true};
  let cfg={}; try{ cfg=JSON.parse(localStorage.getItem('sy_menu_cfg')||'{}')||{}; }catch(_){}
  const cfgOf = (k, f) => { const c=cfg[k]; return c && typeof c[f]==='boolean' ? c[f] : DEF(k)[f]; };
  const shown = k => (k==='menucfg' && !MQ.matches) ? true : cfgOf(k, MQ.matches ? 'm' : 'pc');
  const isItem = it => !!(it.href || it.chips || it.cfgBtn);
  const vis = (it, g) => isItem(it) && shown(it.key) && (logged || (!it.login && (!g.login || it.guest)));   // 로그인 안 했으면: 로그인 묶음에서는 guest 항목만 · 다른 묶음에서는 login 이 아닌 항목만
  const itemHTML = it => it.chips ? `<div class="sm-chips">${it.chips.map(([k,l])=>`<a class="sm-chip" href="${base}group.html?book=${k}">${esc(l)}</a>`).join('')}</div>`
    : it.cfgBtn ? `<a class="sm-i" href="#" data-smcfg><b>${esc(it.b)}</b></a>`
    : `<a class="sm-i${isHere(it.href)?' on':''}" href="${esc(it.href)}"${it.go?` data-go="${it.go}"`:''}><b>${esc(it.b)}${typeof SY_DEV!=="undefined" && SY_DEV.tag && SY_DEV.tag(it.href)?`<small class="sm-dev">test에만 보임</small>`:""}</b></a>`;   /* 개발 중 기능: 배포 사이트엔 이름표 없음 · 테스트 사이트에만 「test에만 보임」 (2026-11-25 · js/common.js SY_DEV.tag) */
  const groupHTML = g => { const its=g.items.filter((it, n, a)=>{ if(!it.sub) return vis(it, g);
      for(let j=n+1; j<a.length && !a[j].sub; j++) if(vis(a[j], g)) return true; return false; });   // 소제목은 그 아래에 보이는 항목이 있을 때만
    return its.some(isItem) ? `<details class="sm-g" data-acc="${g.k}"${(g.k in st ? st[g.k] : false)?' open':''}><summary>${esc(g.t)}</summary>${its.map(it=>it.sub ? `<div class="sm-sub">${esc(it.sub)}</div>` : itemHTML(it)).join('')}</details>` : ''; };
  // 맨 위 「나의 할일」(로그인한 사람만 · 설정에 따라) = 헤더의 「나의 할일」 버튼과 같은 것을 엶 (같은 자료라 체크는 PC 와 그대로 이어짐 · 휴대폰 헤더에서는 그 버튼을 숨기므로 여기에 둠)
  //  맨 아래: 로그아웃(휴대폰에서만 보임 · css) / 로그인 안 했으면 「로그인」(누르면 첫 화면 = 로그인 화면 · 첫 화면에서는 넣지 않음)
  const navHTML = () => `<div class="sm-top"><b class="sm-title">메뉴</b><button type="button" class="sm-x" data-smclose title="닫기 (Esc)" aria-label="메뉴 닫기">×</button></div>`
    + (logged && shown('my') ? `<div class="sm-m"><button type="button" class="sm-my" data-smmy>나의 할일</button></div>` : '')
    + G.map(groupHTML).join('')
    + (logged ? `<button type="button" class="sm-out" data-smout>로그아웃</button>` : `<p class="sm-note">로그인하면 모든 메뉴가 보입니다.</p>` + (isHomePg ? '' : `<a class="sm-in" href="${base}index.html">로그인</a>`));
  const wrap=document.createElement('div'); wrap.className='smenu'; wrap.id='smenu'; wrap.hidden=true;
  wrap.innerHTML = `<div class="sm-bg" data-smclose></div><nav class="sm-panel" aria-label="전체 메뉴"></nav>`;
  const draw = () => { const nav=wrap.querySelector('.sm-panel'), y=nav.scrollTop; nav.innerHTML=navHTML(); nav.scrollTop=y;
    nav.querySelectorAll('details[data-acc]').forEach(d=>d.addEventListener('toggle', ()=>{ st[d.dataset.acc]=d.open; try{ localStorage.setItem('sy_menu_acc2', JSON.stringify(st)); }catch(_){} })); };
  draw();
  try{ MQ.addEventListener('change', draw); }catch(_){}   // 창 너비가 PC ↔ 모바일로 바뀌면 다시
  const cfgParse = j => { try{ const c=(JSON.parse(((j && j.menu) || {}).history || '{}') || {}).cfg; return c && typeof c==='object' ? c : {}; }catch(_){ return {}; } };
  const cfgPull = () => (typeof SY==='undefined' ? Promise.resolve(null) : SY.callRaw({action:'menuGet'})).then(j=>{ if(!j || !j.ok) return false;
      const c=cfgParse(j), s=JSON.stringify(c); if(s!==JSON.stringify(cfg)){ cfg=c; try{ localStorage.setItem('sy_menu_cfg', s); }catch(_){} draw(); } return true; }).catch(()=>false);
  cfgPull();
  // 메뉴 설정 창: 묶음마다 항목 · PC ☐ · 모바일 ☐ (체크 = 보임). 「저장」을 눌러야 모두에게 적용
  let mc=null;
  const mcRows = () => [{t:'맨 위', items:[{key:'my', b:'나의 할일'}]}].concat(G.map(g=>({t:g.t, items:g.items.filter(isItem).map(it=>({key:it.key, b:it.b}))})).filter(g=>g.items.length));
  async function mcOpen(){
    if(!mc){ mc=document.createElement('div'); mc.className='smc-wrap'; mc.hidden=true; document.body.appendChild(mc);
      mc.addEventListener('click', e=>{ if(e.target===mc || e.target.closest('[data-smcx]')){ mc.hidden=true; return; } if(e.target.closest('[data-smcsave]')) mcSave(); }); }
    const fresh=await cfgPull();   // 다른 사람이 방금 바꾼 것 위에 덮어쓰지 않게 최신부터
    mc.innerHTML = `<section class="smc-panel" role="dialog" aria-modal="true" aria-label="메뉴 설정"><h2>메뉴 설정</h2><p class="smc-hint">체크한 곳에서 그 메뉴가 보입니다. 「저장」을 누르면 모든 사람의 메뉴에 적용됩니다. 로그인해야 보이는 메뉴는 로그인한 사람에게만 보입니다.</p>`
      + `<div class="smc-body"><table class="smc-t"><thead><tr><th>메뉴</th><th>PC</th><th>모바일</th></tr></thead><tbody>`
      + mcRows().map(g=>`<tr class="smc-g"><td colspan="3">${esc(g.t)}</td></tr>` + g.items.map(it=>`<tr><td>${esc(it.b)}</td>`
          + ['pc','m'].map(f=>{ const lock=it.key==='menucfg' && f==='pc'; return `<td><input type="checkbox" data-smck="${esc(it.key)}|${f}" aria-label="${esc(it.b)} ${f==='pc'?'PC':'모바일'}"${lock || cfgOf(it.key, f) ? ' checked' : ''}${lock ? ' disabled title="메뉴 설정은 PC 에서 늘 보입니다"' : ''}></td>`; }).join('') + `</tr>`).join('')).join('')
      + `</tbody></table></div><p class="smc-err" id="smcErr">${fresh ? '' : '서버(Cloudflare)가 아직 예전 코드라 설정을 불러오지 못했습니다 — 저장해도 로그인하지 않은 화면에는 적용되지 않을 수 있습니다.'}</p><div class="smc-btns"><button type="button" class="smc-b" data-smcx>취소</button><button type="button" class="smc-b" data-smcsave>저장</button></div></section>`;
    mc.hidden=false; }
  async function mcSave(){
    const next={...cfg}; mc.querySelectorAll('[data-smck]').forEach(c=>{ const [k,f]=c.dataset.smck.split('|'); (next[k] = {...(next[k]||{})})[f]=c.checked; });   // 이 화면에 없는 항목(다른 사이트에만 있는 것)의 설정은 그대로 둠
    const errEl=mc.querySelector('#smcErr'), sv=mc.querySelector('[data-smcsave]'); errEl.textContent=''; sv.disabled=true;
    try{ const now=new Date().toISOString(), me=((typeof SY!=='undefined' && SY.user && SY.user()) || {}).name || '';
      await SY.call({action:'put', item:{id:'menudb', callType:'메뉴설정', saved:now, takenBy:me, owner:'', summary:'메뉴 설정 (PC · 모바일에 보일 메뉴)', history:JSON.stringify({cfg:next, at:now, by:me})}});
      cfg=next; try{ localStorage.setItem('sy_menu_cfg', JSON.stringify(cfg)); }catch(_){} draw(); mc.hidden=true; }
    catch(e){ errEl.textContent='저장하지 못했습니다: '+(e.code==='bad_key' ? '로그인을 다시 해 주세요' : (e.code || e.message || e)); }
    sv.disabled=false; }
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && mc && !mc.hidden){ e.preventDefault(); e.stopImmediatePropagation(); mc.hidden=true; } }, true);
  document.body.appendChild(wrap);
  const btn=document.createElement('button'); btn.type='button'; btn.className='smenu-btn'; btn.title='메뉴 열기 / 닫기'; btn.setAttribute('aria-label','메뉴'); btn.innerHTML='☰ <span>메뉴</span>';
  hd.insertBefore(btn, hd.firstChild);
  // 글자 크기 버튼 (2026-11-26): 헤더 오른쪽 끝 (첫 화면은 매뉴얼 버튼 바로 앞). 누르면 작은 창에 슬라이더 (85% ~ 140% · 5% 씩) — 움직이는 대로 바로 바뀜. 바깥 · Esc 로 닫기
  const fw=document.createElement('span'); fw.className='fz-wrap';
  { const pct = v => Math.round(v*100)+'%';
    fw.innerHTML = `<button type="button" class="smenu-btn fz-btn" title="글자 크기 바꾸기" aria-label="글자 크기" aria-haspopup="true"><b class="fz-ic"><small>가</small>가</b></button>`
      + `<div class="fz-pop" role="group" aria-label="글자 크기" hidden><div class="fz-t"><b>글자 크기</b><output class="fz-v"></output></div>`
      + `<div class="fz-row"><i class="fz-s" aria-hidden="true">가</i><input type="range" class="fz-range" min="${syFont.MIN}" max="${syFont.MAX}" step="0.05" aria-label="글자 크기"><i class="fz-l" aria-hidden="true">가</i></div>`
      + `<button type="button" class="fz-reset">보통으로</button></div>`;
    hd.appendChild(fw);
    const fb=fw.querySelector('.fz-btn'), fp=fw.querySelector('.fz-pop'), rg=fw.querySelector('.fz-range'), out=fw.querySelector('.fz-v'), rs=fw.querySelector('.fz-reset');
    const draw = () => { const cur=syFont.get(); rg.value=cur; out.textContent=pct(cur); rs.disabled = cur===1; };
    // 창 자리: 버튼 왼쪽에 맞추되 화면 오른쪽 밖으로 나가면 그만큼 왼쪽으로 (줄이 바뀌어 버튼이 왼쪽에 있어도 화면 안에)
    const place = () => { fp.style.left='0px'; const r=fp.getBoundingClientRect(), over=r.right-(document.documentElement.clientWidth-8); if(over>0) fp.style.left=-Math.min(over, Math.max(0, r.left-8))+'px'; };
    const fopen = v => { fp.hidden=!v; fb.classList.toggle('on', v); if(v){ draw(); place(); } };
    fb.addEventListener('click', ()=>fopen(fp.hidden));
    rg.addEventListener('input', ()=>{ syFont.set(+rg.value); out.textContent=pct(syFont.get()); rs.disabled = syFont.get()===1; });
    rs.addEventListener('click', ()=>{ syFont.set(1); draw(); });
    document.addEventListener('click', e=>{ if(!fp.hidden && !fw.contains(e.target)) fopen(false); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !fp.hidden){ fopen(false); fb.focus(); } }); }
  // ===== 매뉴얼 (2026-11-21): 헤더 맨 오른쪽 위 책 버튼 → 이 페이지의 매뉴얼(manual/페이지.html)을 큰 창으로 =====
  //  형식(노션 「네이버→사유원 예약 이관」 따라): [1단계] 제목 · 화면 사진(번호 표시) · 짧은 설명 · 접는 칸(이럴 때는 …). 아직 없는 페이지는 「준비 중」
  const MAN_KEY = herePath==='document/' ? 'document' : herePath==='group.html' ? (hereQ.get('my') ? 'my' : hereQ.get('book') ? 'book' : 'group') : herePath.replace(/\.html$/,'');
  const MAN_NAME = (document.title||'').split(' · ')[0] || '이 페이지';
  const mbk=document.createElement('button'); mbk.type='button'; mbk.className='smenu-btn man-btn'; mbk.title=`${MAN_NAME} 매뉴얼 (사용 방법)`; mbk.setAttribute('aria-label','매뉴얼');
  mbk.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12 6.5C10.2 5 7.6 4.3 4 4.5v13c3.6-.2 6.2.5 8 2 1.8-1.5 4.4-2.2 8-2v-13c-3.6-.2-6.2.5-8 2Zm0 0v13"/></svg><span>매뉴얼</span>';
  // 위치 (2026-11-21 변경): 헤더 맨 오른쪽. 오른쪽에 다른 것(이름 · 나의 할일 · 로그아웃 등)이 있으면 그 뒤, 없으면 오른쪽 끝으로 밀어 붙임
  // 2026-11-24: 매뉴얼 버튼은 첫 화면에만 (다른 화면의 매뉴얼 버튼은 모두 없앰 — 요청). 첫 화면의 버튼은 지우면 안 됨
  const manOn = isHomePg;
  if(manOn) hd.appendChild(mbk);
  // 2026-11-26: 글자 크기 버튼(fw)이 모든 화면의 오른쪽 끝에 생김 → 밀어 붙이는 것은 fw, 매뉴얼 버튼은 그 바로 뒤
  if(manOn) mbk.style.marginLeft='0';
  const manPlace = () => { fw.style.marginLeft='8px'; const hr=hd.getBoundingClientRect(), pr=parseFloat(getComputedStyle(hd).paddingRight)||0, last=(manOn && mbk.offsetParent) ? mbk : fw;
    if(hr.right-pr-last.getBoundingClientRect().right > 4) fw.style.marginLeft='auto'; };
  requestAnimationFrame(manPlace); window.addEventListener('load', manPlace);
  try{ new ResizeObserver(()=>requestAnimationFrame(manPlace)).observe(hd); new MutationObserver(ms=>{ if(ms.some(m=>m.target!==mbk && !mbk.contains(m.target) && m.target!==fw && !fw.contains(m.target))) requestAnimationFrame(manPlace); }).observe(hd, {subtree:true, attributes:true, attributeFilter:['hidden','style','class'], childList:true}); }catch(_){}
  const man=document.createElement('div'); man.className='man-wrap'; man.hidden=true;
  man.innerHTML=`<div class="man-bg" data-manclose></div><section class="man-panel" role="dialog" aria-modal="true" aria-label="매뉴얼"><div class="man-top"><b>📖 ${esc(MAN_NAME)} 매뉴얼</b><button type="button" class="man-x" data-manclose title="닫기 (Esc)" aria-label="매뉴얼 닫기">×</button></div><div class="man-body" id="manBody"><p class="man-wait">불러오는 중…</p></div></section>`;
  document.body.appendChild(man);
  let manLoaded=false;
  async function openMan(){ man.hidden=false; document.documentElement.classList.add('man-open'); if(manLoaded) return;
    const body=man.querySelector('#manBody');
    try{ const r=await fetch(`${base}manual/${MAN_KEY}.html?t=${Date.now()}`); if(!r.ok) throw 0; const h=await r.text();
      body.innerHTML = h.replace(/(src|href)="img\//g, `$1="${base}manual/img/`); manLoaded=true; }
    catch(_){ body.innerHTML=`<p class="man-wait">이 페이지의 매뉴얼은 준비 중입니다.</p>`; } }
  const closeMan = () => { man.hidden=true; document.documentElement.classList.remove('man-open'); };
  mbk.addEventListener('click', ()=>man.hidden ? openMan() : closeMan());
  man.addEventListener('click', e=>{ if(e.target.closest('[data-manclose]')) closeMan(); const im=e.target.closest('.man-body img'); if(im){ const z=document.createElement('div'); z.className='man-zoom'; z.innerHTML='<img alt="">'; z.firstChild.src=im.src; z.onclick=()=>z.remove(); document.body.appendChild(z); } });
  document.addEventListener('keydown', e=>{ if(e.key!=='Escape') return; const z=document.querySelector('.man-zoom'); if(z){ z.remove(); return; } if(!man.hidden) closeMan(); });
  // 첫 화면(로그인)은 메뉴를 왼쪽에 붙여 펼쳐 둠: 회색 가림 없이, 대시보드는 메뉴 너비만큼 옆으로 좁혀짐 (html.smenu-dock). × · ☰ 로 접고 펴기
  const dock = isHomePg && logged;
  const setTop = () => document.documentElement.style.setProperty('--sm-top', Math.max(0, Math.round(hd.getBoundingClientRect().bottom))+'px');
  const open = v => { wrap.hidden=!v; document.documentElement.classList.toggle(dock?'smenu-dock':'smenu-open', v); btn.classList.toggle('on', v); if(dock && v) setTop(); };
  if(dock){ wrap.classList.add('dock'); window.addEventListener('resize', setTop); }
  window.syMenu = open;
  // 나의 할일: 모든 화면 헤더에 (없는 화면 · 네이버 이관 · 견적서 등은 여기서 버튼과 팝업을 만듦, 2026-11-18). 메뉴에서는 뺌
  if(logged && !hd.querySelector('[data-mypop], #myOpenBtn')){
    const mb=document.createElement('button'); mb.type='button'; mb.className='smenu-my'; mb.textContent='나의 할일'; mb.title='단체 예약 · 개인고객 통화 · 기타 개인 업무의 할일을 한눈에 (팝업)';
    const meEl=hd.querySelector('.me, .sys-me'); if(meEl) meEl.after(mb); else hd.appendChild(mb);   // 이름 바로 뒤 (헤더 왼쪽: ☰ 메뉴 · 시스템 이름 › 화면 · 이름 · 나의 할일)
    if(typeof window.openMyPop!=='function'){
      if(!document.querySelector('link[href*="mypop.css"]')){ const l=document.createElement('link'); l.rel='stylesheet'; l.href=base+'css/mypop.css?v='+VER; document.head.appendChild(l); }
      const pop=document.createElement('div'); pop.className='mypop'; pop.hidden=true; pop.innerHTML='<div class="box"><iframe title="나의 할일"></iframe></div>'; document.body.appendChild(pop);
      const fr=pop.querySelector('iframe'), closeP=()=>{ pop.hidden=true; fr.src='about:blank'; };
      window.openMyPop = () => { fr.src=base+'group.html?my=1&embed=1&t='+Date.now(); pop.hidden=false; };
      window.addEventListener('message', e=>{ if(!e.data || e.data.type!=='sy-my' || e.source!==fr.contentWindow) return; if(e.data.ev==='close') closeP();
        if(e.data.ev==='go' && (/^(group|personal)\.html\?open=/.test(e.data.url||''))){ closeP(); location.href=base+e.data.url; } });
      pop.addEventListener('click', e=>{ if(e.target===pop) closeP(); });
      document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !pop.hidden){ e.preventDefault(); closeP(); } });
    }
    mb.addEventListener('click', ()=>window.openMyPop());
  }
  btn.addEventListener('click', ()=>open(wrap.hidden));
  if(isHomePg && logged && !matchMedia('(max-width:700px)').matches) open(true);   // 휴대폰에서는 펼쳐 두지 않음 — 첫 화면에 캘린더만 (2026-11-26)
  wrap.addEventListener('click', e=>{ if(e.target.closest('[data-smmy]')){ open(false); const b=hd.querySelector('[data-mypop], #myOpenBtn, .smenu-my'); if(b) b.click(); else if(typeof window.openMyPop==='function') window.openMyPop(); return; }
    if(e.target.closest('[data-smout]')){   // 로그아웃 (첫 화면 js/portal.js 의 로그아웃과 같은 일 · 첫 화면이면 그 버튼을 그대로 누름)
      const lb=document.getElementById('logoutBtn'); if(lb){ lb.click(); return; }
      if(!confirm('로그아웃할까요? 다음 사람이 이름과 사번으로 다시 로그인합니다.')) return;
      ['sy_user','sayuwon_owner','sy_sender','sy_dash_cache'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(_){} }); location.href=base+'index.html'; return; }
    if(e.target.closest('[data-smcfg]')){ e.preventDefault(); if(!dock) open(false); mcOpen(); return; }   // 기타 설정 › 메뉴 설정
    if(e.target.closest('[data-smclose]')) open(false); else if(e.target.closest('a') && !dock) setTimeout(()=>open(false), 0); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !wrap.hidden){ e.preventDefault(); e.stopImmediatePropagation(); open(false); } }, true);
})();
