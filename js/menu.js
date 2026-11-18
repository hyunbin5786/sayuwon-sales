// ===== 전체 메뉴 (모든 화면 공통, 2026-11-18) =====
// 헤더 맨 앞 ☰ 버튼 → 왼쪽에서 메뉴가 화면 위로 뜸 (뒤는 회색으로 가림 · 화면을 밀지 않음). 바깥 · × · Esc 로 닫기
// 묶음(나의 할일 · 예약보조 · 운영보조 · 기타 설정)은 눌러서 펼치고 접으며, 펼친 상태는 이 브라우저에 기억 (sy_menu_acc)
(function(){
  if(window.parent!==window) return;   // 팝업 안(나의 할일 · 품목관리 등)에서는 안 띄움
  const hd=document.querySelector('header'); if(!hd) return;
  const base = /\/document\//.test(location.pathname) ? '../' : '';
  const logged = (()=>{ try{ const u=JSON.parse(localStorage.getItem('sy_user')||'null'); return !!(u && u.name && u.emp); }catch(_){ return false; } })();
  const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const I = (href, b, s, go) => ({href:base+href, b, s, go});
  const G = [
    {k:'book', t:'예약보조', login:1, items:[ {sub:'고객응대 접수'}, I('personal.html','개인고객 전화응대'), I('group.html','단체고객 전화응대'),
      {sub:'고객 응대 보조'}, I('naver.html','네이버 예약 → 사유원 전산 이관'), I('prep.html','다음날 고객 응대 준비'), I('document/','견적서 / 거래명세서 발급') ]},
    {k:'ops', t:'운영보조', items:[ {sub:'예약현황 공유'}, {chips:[['mb','몽몽마방'],['rent','대관'],['docent','도슨트'],['prog','프로그램'],['coupon','음료쿠폰']]},
      {...I('ops.html?p=lost','분실물 찾기'), login:1}, {...I('ops.html?p=accident','사고현황 접수'), login:1}, {...I('ops.html?p=stock','재고확인'), login:1}, {...I('ops.html?p=ship','스마트스토어 발송 보고'), login:1} ]},
    {k:'set', t:'기타 설정', login:1, items:[ I('./#catalog','품목관리','', 'catalog'), I('./#members','멤버관리','', 'members') ]},
  ];
  let st={}; try{ st=JSON.parse(localStorage.getItem('sy_menu_acc')||'{}')||{}; }catch(_){}
  // 지금 화면 표시: 파일 이름이 같고, 메뉴 주소의 ?값(tab · p 등)이 지금 주소에도 있으면 (단체고객 전화응대는 나의 할일 · 예약 현황이 아닐 때만)
  const herePath = /\/document\//.test(location.pathname) ? 'document/' : (location.pathname.replace(/.*\//,'') || 'index.html'), hereQ = new URLSearchParams(location.search);
  const isHere = href => { const [p,q]=href.replace(/^(\.\.\/)?/,'').split('?'); if((p||'index.html')!==herePath) return false;
    if(!q) return p!=='group.html' || (!hereQ.get('my') && !hereQ.get('book'));
    return [...new URLSearchParams(q)].every(([k,v])=>hereQ.get(k)===v); };
  const isHomePg = herePath==='index.html';   // 첫 화면: 메뉴를 고르러 오는 곳 → 로그인했으면 메뉴를 펼친 채로 (묶음도 모두 펼침)
  const itemHTML = it => it.sub ? `<div class="sm-sub">${esc(it.sub)}</div>`
    : it.chips ? `<div class="sm-chips">${it.chips.map(([k,l])=>`<a class="sm-chip" href="${base}group.html?book=${k}">${esc(l)}</a>`).join('')}</div>`
    : (it.login && !logged) ? ''
    : `<a class="sm-i${isHere(it.href)?' on':''}" href="${esc(it.href)}"${it.go?` data-go="${it.go}"`:''}><b>${esc(it.b)}</b></a>`;   // 메뉴 아래 회색 설명은 없앰 (2026-11-18)
  const wrap=document.createElement('div'); wrap.className='smenu'; wrap.id='smenu'; wrap.hidden=true;
  wrap.innerHTML = `<div class="sm-bg" data-smclose></div><nav class="sm-panel" aria-label="전체 메뉴"><div class="sm-top"><button type="button" class="sm-x" data-smclose title="닫기 (Esc)" aria-label="메뉴 닫기">×</button></div>`
    + G.filter(g=>logged || !g.login).map(g=>`<details class="sm-g" data-acc="${g.k}"${(isHomePg || (g.k in st ? st[g.k] : g.k!=='set'))?' open':''}><summary>${esc(g.t)}</summary>${g.items.map(itemHTML).join('')}</details>`).join('')
    + (logged ? '' : `<p class="sm-note">로그인하면 모든 메뉴가 보입니다.</p>`) + `</nav>`;
  document.body.appendChild(wrap);
  const btn=document.createElement('button'); btn.type='button'; btn.className='smenu-btn'; btn.title='메뉴 열기 / 닫기'; btn.setAttribute('aria-label','메뉴'); btn.innerHTML='☰ <span>메뉴</span>';
  hd.insertBefore(btn, hd.firstChild);
  const open = v => { wrap.hidden=!v; document.documentElement.classList.toggle('smenu-open', v); btn.classList.toggle('on', v); };
  window.syMenu = open;
  // 나의 할일: 모든 화면 헤더에 (없는 화면 · 네이버 이관 · 견적서 등은 여기서 버튼과 팝업을 만듦, 2026-11-18). 메뉴에서는 뺌
  if(logged && !hd.querySelector('[data-mypop], #myOpenBtn')){
    const mb=document.createElement('button'); mb.type='button'; mb.className='smenu-my'; mb.textContent='나의 할일'; mb.title='단체 예약 · 개인고객 통화 · 기타 개인 업무의 할일을 한눈에 (팝업)';
    const meEl=hd.querySelector('.me, .sys-me'); if(meEl) meEl.after(mb); else hd.appendChild(mb);   // 이름 바로 뒤 (헤더 왼쪽: ☰ 메뉴 · 시스템 이름 › 화면 · 이름 · 나의 할일)
    if(typeof window.openMyPop!=='function'){
      if(!document.querySelector('link[href*="mypop.css"]')){ const l=document.createElement('link'); l.rel='stylesheet'; l.href=base+'css/mypop.css?v=20261116'; document.head.appendChild(l); }
      const pop=document.createElement('div'); pop.className='mypop'; pop.hidden=true; pop.innerHTML='<div class="box"><iframe title="나의 할일"></iframe></div>'; document.body.appendChild(pop);
      const fr=pop.querySelector('iframe'), closeP=()=>{ pop.hidden=true; fr.src='about:blank'; };
      window.openMyPop = () => { fr.src=base+'group.html?my=1&embed=1&t='+Date.now(); pop.hidden=false; };
      window.addEventListener('message', e=>{ if(!e.data || e.data.type!=='sy-my' || e.source!==fr.contentWindow) return; if(e.data.ev==='close') closeP();
        if(e.data.ev==='go' && (/^(group|personal)\.html\?open=/.test(e.data.url||'') || e.data.url==='ops.html?p=task')){ closeP(); location.href=base+e.data.url; } });
      pop.addEventListener('click', e=>{ if(e.target===pop) closeP(); });
      document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !pop.hidden){ e.preventDefault(); closeP(); } });
    }
    mb.addEventListener('click', ()=>window.openMyPop());
  }
  btn.addEventListener('click', ()=>open(wrap.hidden));
  if(isHomePg && logged) open(true);
  wrap.addEventListener('click', e=>{ if(e.target.closest('[data-smclose]')) open(false); else if(e.target.closest('a')) setTimeout(()=>open(false), 0); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !wrap.hidden){ e.preventDefault(); e.stopImmediatePropagation(); open(false); } }, true);
  wrap.querySelectorAll('details[data-acc]').forEach(d=>d.addEventListener('toggle', ()=>{ st[d.dataset.acc]=d.open; try{ localStorage.setItem('sy_menu_acc', JSON.stringify(st)); }catch(_){} }));
})();
