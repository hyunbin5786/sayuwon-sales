// ===== 대관 규정 및 상품 (rent.html · 2026-11-24) =====
// 대관 상품 한 줄 = 항목 · 산출 기준 · 기준 금액 · 추가 대관 · 추가 항목 · 장소 · 기타 조건. 칸 안은 여러 줄 그대로 (줄바꿈)
// 저장: 공유 기록(calls) 한 줄 id rentdb · 통화 구분 「대관규정」 · 수정 기록 칸 {rows:[{id, item, basis, price, extra, place, note}], log:[{at, by, what}]}
//   아직 아무도 고치지 않았으면 아래 DEFAULT(2026-11-24 노션 표 + 웨딩 · 돌잔치 · 룩북 · CF 금액 안내)를 보여 주고, 처음 고칠 때 함께 저장
//   고치기 · 더하기 · 빼기 · 순서는 늘 최신을 받아 그 위에 (여러 명이 같이 고쳐도 덮어쓰지 않게) · 다른 컴퓨터에서 바뀌면 바로 다시 받음 (SY.live.onRev)
//   칸을 더 늘리려면 COLS 에 한 줄 더하면 됨 (예전 줄은 빈 칸으로 보임)
(function(){
  const $ = s => document.querySelector(s), esc = SY.esc;
  const user = SY.user() || {}; $('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
  let toastT; const toast = (m, ms=2600) => { const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), ms); };
  const st = (txt, cls) => { const el=$('#st'); el.textContent=txt; el.className='save-st '+(cls||''); };
  const ID='rentdb', TYPE='대관규정';
  const COLS = [['item','항목',1],['basis','산출 기준'],['price','기준 금액'],['extra','추가 대관 · 추가 항목'],['place','장소'],['note','기타 조건']];   // [저장 이름, 화면 이름, 꼭 넣기]
  const PLACE_ALL='소요헌/경전/별유동천/현암/사담 수변 무대/유원 사야정/명정/심포니6/매원평전';
  const NOTE_FILM='• 요일 구분 없이 동일한 기준 적용\n• 일반 관람객과 병행하여 운영\n• 대관 가능시간 : 07:00-11:00 or 16:00-20:00\n• 계약 시 저작권 및 촬영 결과물의 활용, 노출 범위를 사유원과 사전 협의 후 명시';
  const DEFAULT = [
    {id:'r1', item:'룩북, 드라마, 영화, 뮤직비디오', basis:'4시간', price:'32,000,000원\n(10% 조정 28,800,000원 · 20% 조정 25,600,000원)', extra:'추가 1시간당 8,000,000원', place:PLACE_ALL, note:NOTE_FILM},
    {id:'r2', item:'CF, 광고', basis:'4시간', price:'48,000,000원\n(10% 조정 43,200,000원 · 20% 조정 38,400,000원)', extra:'추가 1시간당 12,000,000원', place:PLACE_ALL, note:NOTE_FILM},
    {id:'r3', item:'공연', basis:'', price:'', extra:'', place:'소요헌/경전/현암/사담 수변 무대/유원 사야정/명정/심포니6/매원평전', note:''},
    {id:'r4', item:'요가', basis:'1인', price:'30,000원', extra:'', place:'소요헌/경전/심포니6/매원평전', note:''},
    {id:'r5', item:'웨딩', basis:'60인 (주류는 10인)\n준비 대관 및 본 대관 포함', price:'총 40,200,000원\n12,000,000원 (1인 식대 / 200,000원)\n4,200,000원 (1인 입장권 / 70,000원)\n700,000원 (1인 주류 / 70,000원)\n24,000,000원 (대관료 · 준비 대관 및 본 대관)', extra:'', place:'경전/별유동천/매원평전',
      note:'• 관람료 별도\n• 최소 15명 / 최대 30명\n• 위 항목 외 웨딩 진행에 필요한 모든 제반 사항은 주최 측에서 직접 준비하고 비용을 부담\n• 대관료는 준비 대관 및 본 대관을 포함'},
    {id:'r6', item:'(야외식음) 돌잔치', basis:'10명 (음료는 2인)\n공간 대여는 4시간', price:'총 16,800,000원부터\n700,000원 (1인 관람료 / 70,000원)\n2,000,000원 (1인 식사 / 200,000원)\n140,000원 (1인 음료 / 70,000원)\n12,000,000원 (대관료 · 4시간)', extra:'플라워-돌상 (조화 / 900,000원부터)\n플라워-돌상 (생화 / 1,500,000원부터)\n포토-모네프랑 (1,200,000원부터)', place:'경전/매원평전',
      note:'• 플라워(돌상) 및 포토 비용은 선택 사항이며, 표기 금액은 시작가입니다. 세부 구성에 따라 최종 금액이 달라질 수 있습니다.\n• 총금액(16,800,000원부터) = 기본 비용 2,700,000원 + 대관료 12,000,000원 + 생화 돌상 · 포토 2,100,000원'},
    {id:'r7', item:'(실내) 자체 세미나', basis:'1시간', price:'500,000원', extra:'', place:'몽몽차방, 당두봉갈', note:''},
    {id:'r8', item:'(실내) PPT 세미나', basis:'30분', price:'500,000원', extra:'', place:'몽몽차방, 당두봉갈', note:''},
    {id:'r9', item:'(단체행사)', basis:'', price:'', extra:'', place:'(100명 내외) 사담 수변 무대/심포니6/매원평전\n(50명 내외) 소요헌 사담 수변 무대/명정\n(30명 내외) 유원 사야정\n(10인 이하) 소요헌, 현암, 유원 사야정', note:''},
  ];
  let rows=DEFAULT.map(r=>({...r})), log=[], saved=false, loaded=false, busy=false, editId=null, arrange=false;

  // ---------- 받기 · 저장 ----------
  function fromItems(items){ const it=(items||[]).find(x=>x.id===ID && !x.deleted); let h=null; try{ h=JSON.parse((it && it.history)||'null'); }catch(_){}
    return it && h && Array.isArray(h.rows) ? {rows:h.rows, log:Array.isArray(h.log)?h.log:[], item:it} : {rows:DEFAULT.map(r=>({...r})), log:[], item:null}; }
  async function fetchNow(){ const j=await SY.list(); return fromItems(j.items); }
  async function load(){ st('불러오는 중…','wait');
    if(!loaded) $('#body').innerHTML=SY.skel('table', 7, {cols:5, label:'대관 규정을 불러오는 중'});   // 받는 동안 표 자리에 스켈레톤 (2026-11-27)
    try{ const r=await fetchNow(); rows=r.rows; log=r.log; saved=!!r.item; loaded=true; st('',''); render(); }
    catch(e){ st(e.code==='bad_key' ? SY.authFail() : '불러오지 못함 — 잠시 뒤 다시 열어 주세요', 'bad'); loaded=true; render(); } }
  // 최신을 받아 fn(rows) 로 바꾼 뒤 저장
  async function change(fn, what){
    if(busy) return false; busy=true; st('저장 중…','wait');
    try{ const cur=await fetchNow(), next=fn(cur.rows.map(r=>({...r}))); if(!next){ st('',''); return false; }
      const now=new Date().toISOString(), lg=[...cur.log, {at:now, by:user.name||'', what}].slice(-100);
      const item={...(cur.item||{}), id:ID, callType:TYPE, saved:(cur.item && cur.item.saved)||now, takenBy:user.name||'', owner:'', summary:`대관 규정 및 상품 ${next.length}개 · ${what}`.slice(0,120), history:JSON.stringify({rows:next, log:lg, at:now, by:user.name||''})};
      delete item.date; delete item.org;
      await SY.call({action:'put', item}); SY.live.post({t:'put', item});
      rows=next; log=lg; saved=true; render(); st(`저장됨 ${new Date().toTimeString().slice(0,5)}`, 'ok'); return true; }
    catch(e){ st('저장 못 함 — 다시 해 주세요','bad'); toast(e.code==='bad_key' ? SY.authFail() : '저장하지 못했습니다: '+(e.code||e.message)); return false; }
    finally{ busy=false; } }

  // ---------- 표 ----------
  const cell = v => esc(v||'').replace(/\n/g,'<br>');
  // 표 = 핵심만 (2026-11-24): 항목 · 산출 기준 · 기준 금액(첫 줄) · 장소(앞 2곳 + 외 n곳) · 「자세히 보기」 → 오른쪽 옆 보기(노션 사이드 보기처럼)에 모든 칸
  const first = v => String(v||'').split('\n').map(s=>s.trim()).filter(Boolean)[0] || '';
  const places = v => String(v||'').split(/[\/,\n]+/).map(s=>s.replace(/^\([^)]*\)\s*/,'').trim()).filter(Boolean);
  const placeShort = v => { const p=places(v); return p.length>2 ? `${p.slice(0,2).join(' · ')} 외 ${p.length-2}곳` : p.join(' · '); };
  const CORE = [['item','항목'],['basis','산출 기준'],['price','기준 금액'],['place','장소']];
  function render(){
    const q=$('#q').value.trim().toLowerCase().replace(/\s/g,'');
    const list=rows.filter(r=>!q || COLS.map(([k])=>r[k]||'').join(' ').toLowerCase().replace(/\s/g,'').includes(q));
    $('#sum').textContent = `${rows.length}개${q?` · 찾은 ${list.length}개`:''}`;
    $('#head').innerHTML = `<tr>${CORE.map(([,l])=>`<th>${l}</th>`).join('')}<th></th></tr>`;
    $('#body').innerHTML = list.length ? list.map(r=>{ const i=rows.indexOf(r), more=String(r.price||'').split('\n').filter(s=>s.trim()).length>1;
      return `<tr data-rid="${esc(r.id)}"${peekId===r.id?' class="on"':''}><td data-l="항목" class="c-item"><b>${esc(first(r.item))}</b></td><td data-l="산출 기준" class="c-basis">${esc(first(r.basis))}${String(r.basis||'').includes('\n')?' <small class="more">…</small>':''}</td>`
        + `<td data-l="기준 금액" class="c-price">${esc(first(r.price))}${more?' <small class="more">외 내역</small>':''}</td><td data-l="장소" class="c-place">${esc(placeShort(r.place))}</td>`
        + (arrange ? `<td class="acts"><button type="button" class="btn" data-mv="${esc(r.id)}|-1"${i===0?' disabled':''} title="위로">↑</button><button type="button" class="btn" data-mv="${esc(r.id)}|1"${i===rows.length-1?' disabled':''} title="아래로">↓</button><button type="button" class="btn primary" data-del="${esc(r.id)}">빼기</button></td>`
          : `<td class="acts"><button type="button" class="btn sm" data-peek="${esc(r.id)}">자세히 보기</button></td>`) + `</tr>`; }).join('')
      : `<tr><td colspan="${CORE.length+1}" class="empty">${q?'찾은 항목이 없습니다.':'항목이 없습니다. 「＋ 항목 추가」를 눌러 주세요.'}</td></tr>`;
    if(peekId) paintPeek();
    const last=log[log.length-1]; $('#log').textContent = last ? `마지막 수정: ${new Date(last.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${last.by||''} · ${last.what||''}` : (saved ? '' : '처음 내용 (2026-11-24 대관 안내 자료) · 아직 고친 사람 없음');
    $('#editMode').classList.toggle('primary', arrange); $('#editMode').textContent = arrange ? '순서 · 빼기 끝' : '순서 · 빼기';
  }
  $('#q').addEventListener('input', render);
  $('#editMode').onclick=()=>{ arrange=!arrange; render(); };

  // ---------- 고치기 · 더하기 ----------
  function openEdit(id){ editId=id; const r=id ? rows.find(x=>x.id===id) : {};
    if(id && !r) return;
    $('#eTitle').textContent = id ? `「${(r.item||'').split('\n')[0]}」 고치기` : '대관 항목 추가';
    $('#eFields').innerHTML = COLS.map(([k,l,req])=>`<label class="ef"><span>${l}${req?' <i>*</i>':''}</span><textarea id="f_${k}" data-ime="ko" rows="${k==='item'?1:k==='price'||k==='note'||k==='place'?4:2}">${esc(r[k]||'')}</textarea></label>`).join('');
    $('#eDel').hidden=!id; $('#eErr').textContent=''; $('#editModal').hidden=false; setTimeout(()=>$('#f_item').focus(), 0); }
  const closeEdit = () => { $('#editModal').hidden=true; editId=null; };
  $('#addBtn').onclick=()=>openEdit(null);
  $('#eNo').onclick=closeEdit;
  $('#editModal').addEventListener('mousedown', e=>{ if(e.target.id==='editModal') closeEdit(); });
  $('#eOk').onclick=async()=>{
    const v={}; COLS.forEach(([k])=>{ v[k]=$('#f_'+k).value.replace(/\r\n?/g,'\n').replace(/\s+$/,'').replace(/^\s*\n/,''); });
    if(!v.item.trim()){ $('#eErr').textContent='항목 이름을 넣어 주세요.'; $('#f_item').focus(); return; }
    const id=editId, name=v.item.split('\n')[0];
    const ok=await change(list=>{ if(id){ const i=list.findIndex(x=>x.id===id); if(i<0){ toast('그사이 다른 분이 이 항목을 뺐습니다.'); return null; } list[i]={...list[i], ...v}; return list; }
      return [...list, {id:'r'+Date.now().toString(36), ...v}]; }, id ? `고침: ${name}` : `추가: ${name}`);
    if(ok){ closeEdit(); toast(id ? `「${name}」을 고쳤습니다.` : `「${name}」을 추가했습니다.`); } };
  $('#eDel').onclick=()=>{ const r=rows.find(x=>x.id===editId); if(r) askDel(r); };
  // ---------- 순서 · 빼기 ----------
  let askFn=null;
  function ask(html, yes, fn){ $('#askMsg').innerHTML=html; $('#askYes').textContent=yes; askFn=fn; $('#askModal').hidden=false; }
  $('#askNo').onclick=()=>{ $('#askModal').hidden=true; askFn=null; };
  $('#askYes').onclick=()=>{ $('#askModal').hidden=true; const f=askFn; askFn=null; if(f) f(); };
  function askDel(r){ const name=(r.item||'').split('\n')[0];
    ask(`「<b>${esc(name)}</b>」 항목을 표에서 뺄까요? (팀이 함께 보는 표에서 빠집니다)`, '빼기', async()=>{ if(await change(list=>list.filter(x=>x.id!==r.id), `빼기: ${name}`)){ closeEdit(); toast(`「${name}」을 뺐습니다.`); } }); }
  document.addEventListener('click', e=>{
    const mv=e.target.closest('[data-mv]'); if(mv){ const [id,d]=mv.dataset.mv.split('|'); change(list=>{ const i=list.findIndex(x=>x.id===id), j=i+(+d); if(i<0 || j<0 || j>=list.length) return null; [list[i],list[j]]=[list[j],list[i]]; return list; }, '순서 바꿈'); return; }
    const dl=e.target.closest('[data-del]'); if(dl){ const r=rows.find(x=>x.id===dl.dataset.del); if(r) askDel(r); return; }
    const pk=e.target.closest('[data-peek]'); if(pk){ openPeek(pk.dataset.peek); return; }
    const tr=e.target.closest('tr[data-rid]'); if(tr && !arrange && !e.target.closest('a,button')) openPeek(tr.dataset.rid);   // 줄을 눌러도 옆 보기
  });
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ if(!$('#askModal').hidden){ $('#askModal').hidden=true; return; } if(!$('#editModal').hidden){ closeEdit(); return; } if(peekId) closePeek(); return; }
    if(peekId && $('#editModal').hidden && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName||'') && (e.key==='ArrowUp' || e.key==='ArrowDown')){ e.preventDefault(); stepPeek(e.key==='ArrowUp'?-1:1); } });

  // ---------- 옆 보기 (노션 사이드 보기처럼 · 2026-11-24): 오른쪽에서 열림 · 모든 칸을 크게 · ↑ ↓ 앞뒤 항목 · 수정 · 닫기(Esc) ----------
  let peekId=null;
  function openPeek(id){ peekId=id; paintPeek(); $('#peek').hidden=false; document.body.classList.add('peek-open'); render(); }
  function closePeek(){ peekId=null; $('#peek').hidden=true; document.body.classList.remove('peek-open'); render(); }
  function stepPeek(d){ const i=rows.findIndex(x=>x.id===peekId), j=i+d; if(j>=0 && j<rows.length) openPeek(rows[j].id); }
  const lines = v => String(v||'').split('\n').map(s=>s.trim()).filter(Boolean);
  function paintPeek(){ const r=rows.find(x=>x.id===peekId); if(!r){ closePeek(); return; } const i=rows.indexOf(r);
    const sec = (l, html) => html ? `<section class="pk-sec"><h3>${l}</h3>${html}</section>` : '';
    const block = v => lines(v).length ? `<div class="pk-txt">${lines(v).map(s=>`<p class="${/^[•·\-※]/.test(s)?'bul':''}">${esc(s.replace(/^[•·\-]\s*/,''))}</p>`).join('')}</div>` : '';
    const price = v => { const L=lines(v); if(!L.length) return ''; return `<div class="pk-price"><b>${esc(L[0])}</b>${L.length>1?`<ul>${L.slice(1).map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}</div>`; };
    const chips = v => { const L=lines(v); if(!L.length) return ''; return L.map(s=>{ const m=s.match(/^(\([^)]*\))\s*(.*)$/); return `<div class="pk-pl">${m?`<small>${esc(m[1])}</small>`:''}${places(m?m[2]:s).map(p=>`<span class="pk-chip">${esc(p)}</span>`).join('')}</div>`; }).join(''); };
    $('#peekBody').innerHTML = `<div class="pk-top"><button type="button" class="pk-nav" data-pkstep="-1"${i===0?' disabled':''} title="앞 항목 (↑)">↑</button><button type="button" class="pk-nav" data-pkstep="1"${i===rows.length-1?' disabled':''} title="뒤 항목 (↓)">↓</button><span class="sp"></span><button type="button" class="btn primary" data-pkedit="${esc(r.id)}">수정</button><button type="button" class="win-x in-row" data-pkclose title="닫기 (Esc)" aria-label="닫기">×</button></div>`
      + `<h2 class="pk-title">${esc(first(r.item))}</h2>${lines(r.item).length>1?`<p class="hint">${esc(lines(r.item).slice(1).join(' · '))}</p>`:''}`
      + `<dl class="pk-props"><dt>산출 기준</dt><dd>${lines(r.basis).map(esc).join('<br>')||'<span class="hint">—</span>'}</dd><dt>기준 금액</dt><dd>${esc(first(r.price))||'<span class="hint">—</span>'}</dd><dt>장소</dt><dd>${places(r.place).length ? `${places(r.place).length}곳` : '<span class="hint">—</span>'}</dd></dl>`
      + sec('기준 금액 · 내역', price(r.price)) + sec('추가 대관 · 추가 항목', block(r.extra)) + sec('장소', chips(r.place)) + sec('기타 조건', block(r.note)); }
  $('#peek').addEventListener('click', e=>{
    if(e.target.closest('[data-pkclose]')){ closePeek(); return; }
    const s=e.target.closest('[data-pkstep]'); if(s){ stepPeek(+s.dataset.pkstep); return; }
    const ed=e.target.closest('[data-pkedit]'); if(ed) openEdit(ed.dataset.pkedit); });

  load();
  SY.live.onRev(()=>{ if($('#editModal').hidden && !busy) fetchNow().then(r=>{ rows=r.rows; log=r.log; saved=!!r.item; render(); }).catch(()=>{}); });   // 다른 컴퓨터에서 바뀌면 바로
})();
