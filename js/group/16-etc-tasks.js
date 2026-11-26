// ▣ js/group/16-etc-tasks.js — 나의 할일의 기타 개인 업무(직접 넣는 업무 · 반복) · 개인 업무 구분 · 과업 알림 시각 설정
// ===== 나의 할일 · 기타 개인 업무 (통화 구분 '개인업무', 2026-11-18 전부 여기로 · 예전 ops.html?p=task 화면은 없앰) =====
// 저장: 공유 기록 한 줄 = 업무 하나. history = {kind:'task', d:{title, repeat, dows, dom, due, start, owner, memo, subs:[{id,title}], done:{날짜:{at,by}}, subDone:{날짜:{sid:1}}}, log}
// 화면 (나의 할일 › 전체 3열의 기타 · 기타 탭):
//  ① 업무 직접 추가 (반복 없음 · 매일 · 매주 요일 · 매달 일자)
//  ② 오늘 할 일 (지난 것 포함, 반복은 최근 7일): 체크 = 그날 완료 · 세부 과업 체크(모두 체크하면 그날 완료) · 이름을 누르면 그 자리에서 고치기
//  ③ 오늘 완료한 것 (체크를 풀면 되돌림) · ④ 내 업무 전체 (다음 날짜 · 누르면 고치기)
//  고치기: 업무 · 반복 · 날짜(시작일) · 세부 과업(추가 · ×) · 메모 · 저장 / 취소 / 삭제(확인 뒤)
const etcRows = () => (cache||[]).filter(r=>r.callType==='개인업무').map(r=>({r, j:opsParse(r)})).filter(o=>o.j).map(o=>({...o, d:o.j.d||{}}));
const etcMine = () => { const me=savedOwner(); return me ? etcRows().filter(o=>(o.d.owner||o.r.takenBy||'')===me) : []; };
function myEtcOpen(){ if(typeof opsParse!=='function') return []; const today=opsToday(), out=[];
  etcMine().forEach(o=>opsPending(o.d, today).forEach(day=>out.push({r:o.r, d:o.d, day})));
  return out.sort((a,b)=>a.day.localeCompare(b.day)); }
const etcNext = (d, today) => { if(!d.repeat || d.repeat==='none'){ const due=d.due||d.start; return due && !(d.done||{})[due] ? due : ''; }
  for(let i=0;i<400;i++){ const x=new Date(today+'T00:00'); x.setDate(x.getDate()+i); const day=opsYmd(x); if(opsOccurs(d, day) && !(d.done||{})[day]) return day; } return ''; };
// 저장 (한 업무). what = 수정 기록에 남길 말
async function etcPut(r, d, what){
  const me=savedOwner()||'', now=new Date().toISOString(), j=opsParse(r)||{kind:'task', log:[]};
  const keep=o=>Object.fromEntries(Object.keys(o||{}).sort().slice(-120).map(k=>[k,o[k]]));
  const d2={...d, done:keep(d.done), subDone:keep(d.subDone)};
  const item={...r, saved:r.saved||now, owner:d2.owner||r.owner||me, summary:`${d2.title} · ${opsRepeatLabel(d2)}`.slice(0,120), history:JSON.stringify({...j, kind:'task', d:d2, log:[...(j.log||[]), {at:now, by:me, what}].slice(-60)})};
  await store.put(item); const i=cache.findIndex(x=>x.id===r.id); if(i>=0) cache[i]=item; else cache.push(item);
  renderMy(); if(typeof paintMyCount==='function') paintMyCount(); return item;
}
// 화면 상태: 추가 칸 · 고치는 업무 · 접힌 목록
let etcForm = {repeat:'none', dows:[], dom:'', due:''}, etcEdit=null, etcOpenAll=false, etcOpenDone=false;   // etcEdit = {id, d}
const REP_OPTS=[['none','반복 없음'],['later','마감 없음'],['daily','매일'],['weekly','매주'],['monthly','매달']];
const etcDowsHTML = (sel, attr) => `<span class="etc-dows">${[1,2,3,4,5,6,0].map(i=>`<button type="button" class="${(sel||[]).includes(i)?'on':''}" ${attr}="${i}">${DOW[i]}</button>`).join('')}</span>`;
const etcDomHTML = (v, id) => `<select id="${id}" title="매달 날짜">${Array.from({length:31},(_,i)=>i+1).map(n=>`<option value="${n}"${String(v||new Date().getDate())===String(n)?' selected':''}>${n===31?'말일':n+'일'}</option>`).join('')}</select>`;
function etcAddHTML(presetCat){   // presetCat: 구분 탭에서는 그 구분이 골라져 있음
  const f=etcForm; if(presetCat!==undefined && etcForm.catTab!==presetCat){ etcForm.cat=presetCat; etcForm.catTab=presetCat; }
  const extra = f.repeat==='later' ? '<span class="hint etc-later">할 때가 되면 이름을 눌러 마감일을 넣으세요</span>' : f.repeat==='none' ?`<label class="etc-due">마감 ${dboxHTML('id="etcDue"', f.due||todayYmd())}</label>` : f.repeat==='weekly' ? etcDowsHTML(f.dows, 'data-etcdow') : f.repeat==='monthly' ? etcDomHTML(f.dom, 'etcDom') : '';
  return `<div class="etc-addbox"><form class="task-add etc-add" id="etcAdd">${etcCatSelHTML('etcCat', f.cat||'')}<input id="etcAddIn" data-ime="ko" placeholder="업무 직접 추가 (Enter)" autocomplete="off"><button class="btn etc-go" type="submit" title="추가 (Enter)" aria-label="추가">↵</button></form>`
    + `<div class="etc-rep"><span class="seg">${REP_OPTS.map(([k,l])=>`<button type="button" class="${f.repeat===k?'on':''}" data-etcrep="${k}">${l}</button>`).join('')}</span>${extra}</div></div>`;   // 추가 칸은 박스로 묶음 (2026-11-18)
}
function etcEditHTML(){
  const d=etcEdit.d, rep=d.repeat||'none';
  const when = rep==='later' ? '<span class="hint etc-later">마감일 없이 둡니다 · 「반복 없음」을 누르면 마감일을 넣을 수 있음</span>' : rep==='none' ?`<label class="etc-due">날짜 ${dboxHTML('id="etcEDue"', d.due||d.start||todayYmd())}</label>`
    : (rep==='weekly' ? etcDowsHTML(d.dows, 'data-eedow') : rep==='monthly' ? etcDomHTML(d.dom, 'etcEDom') : '') + `<label class="etc-due">시작 ${dboxHTML('id="etcEStart"', d.start||todayYmd())}</label>`;
  return `<div class="etc-edit">`
    + `<div class="etc-etop">${etcCatSelHTML('etcECat', etcCatOf(d))}<input id="etcETitle" class="etc-in" data-ime="ko" placeholder="업무" value="${esc(d.title||'')}"></div>`
    + `<div class="etc-rep"><span class="seg">${REP_OPTS.map(([k,l])=>`<button type="button" class="${rep===k?'on':''}" data-eerep="${k}">${l}</button>`).join('')}</span>${when}</div>`
    + `<div class="etc-subs"><b>세부 과업</b>${(d.subs||[]).map((s,i)=>`<span class="etc-sub">${esc(s.title||s.t||'')}<button type="button" data-eesubdel="${i}" title="빼기" aria-label="세부 과업 빼기">×</button></span>`).join('')}<input id="etcESubIn" class="etc-in" data-ime="ko" placeholder="세부 과업 적고 Enter" autocomplete="off"></div>`
    + `<textarea id="etcEMemo" class="etc-in" data-ime="ko" rows="2" placeholder="메모">${esc(d.memo||'')}</textarea>`
    + `<div class="etc-ebtns"><button type="button" class="btn" data-eedel>삭제</button><span class="sp"></span><button type="button" class="btn" data-eecancel>취소</button><button type="button" class="btn primary" data-eesave>저장</button></div></div>`;
}
// ===== 기타 개인 업무 구분 (2026-11-19): 사람마다 구분 목록(공유 기록 한 줄 · 통화 구분 「개인업무목록」, 예전 할 일 목록 화면의 목록 이름도 그대로) · 업무 d.list = 구분 =====
//  기타 탭: 「＋ 구분 추가」 · 추가 · 고치기 칸에서 구분 고르기 · 오늘 할 일을 구분별로 묶어 보기 / 전체 탭: 구분 고르기(그 구분만)
const ETC_NOCAT='구분 없음';
const etcCatRec = () => { const me=savedOwner(); return (cache||[]).find(r=>r.callType==='개인업무목록' && (r.owner||r.takenBy)===me) || null; };
function etcCats(){ let saved=[]; try{ saved=(JSON.parse((etcCatRec()||{}).history||'{}').lists)||[]; }catch(_){}
  const used=etcMine().map(o=>o.d.list).filter(Boolean); return [...new Set([...saved, ...used])].filter(c=>c && c!=='작업' && !/^@/.test(c)); }   // @personal · @group (개인예약 · 단체예약에 넣은 업무)은 내 구분이 아님
async function etcSaveCats(lists, order){ const me=savedOwner()||'', now=new Date().toISOString(), old=etcCatRec();
  let prev={}; try{ prev=JSON.parse((old||{}).history||'{}')||{}; }catch(_){}
  const item={...(old||{}), id: old ? old.id : 'el'+tdHash(me), callType:'개인업무목록', saved:(old&&old.saved)||now, takenBy:me, owner:me, summary:`나의 할일 구분 ${lists.join(', ')}`.slice(0,120), history:JSON.stringify({...prev, lists, order: order || prev.order || []})};   // ...prev: 알림 시각(alertTimes) 등 다른 설정은 그대로
  await store.put(item); const i=cache.findIndex(x=>x.id===item.id); if(i>=0) cache[i]=item; else cache.push(item); }
// 과업 알림 시각 (2026-11-25 · 나의 할일 설정): 시각마다 고치기 · 빼기 · 추가(횟수) · 기본으로 — 내 개인업무목록 줄(alertTimes)에 저장 + 이 컴퓨터(SY_ALERT)
async function etcSaveAlert(L){ L=SY_ALERT.set(L); const me=savedOwner()||'', now=new Date().toISOString(), old=etcCatRec();
  let prev={}; try{ prev=JSON.parse((old||{}).history||'{}')||{}; }catch(_){}
  const item={...(old||{}), id: old ? old.id : 'el'+tdHash(me), callType:'개인업무목록', saved:(old&&old.saved)||now, takenBy:me, owner:me, summary:(old&&old.summary)||'나의 할일 설정', history:JSON.stringify({...prev, lists: prev.lists || etcCats(), order: prev.order || [], alertTimes:L})};
  await store.put(item); const i=cache.findIndex(x=>x.id===item.id); if(i>=0) cache[i]=item; else cache.push(item); }
// 2026-11-26: 「기본으로」 버튼은 없앰 (처음에는 오전 8시 · 11시 · 오후 1시 · 5시 — SY_ALERT.DEF 그대로) · 하루 몇 번(− n번 ＋ · 0번 = 끔 · 많아야 8번)부터 고르고, 시각은 오전/오후 · 시 · 분(10분 단위) 고르기로
const AL_MAX=8;
function alertSetHTML(){ const L=SY_ALERT.times(), n=L.length;
  const row = (t,i) => { const h=Math.floor(t/60), m=t%60, pm=h>=12, h12=h%12||12, m10=Math.floor(m/10)*10;
    return `<li><span class="al-no">${i+1}번째</span>`
      + `<select data-alp="${i}" aria-label="${i+1}번째 알림 오전 · 오후"><option value="0"${pm?'':' selected'}>오전</option><option value="1"${pm?' selected':''}>오후</option></select>`
      + `<select data-alh="${i}" aria-label="${i+1}번째 알림 시">${[12,1,2,3,4,5,6,7,8,9,10,11].map(x=>`<option value="${x}"${x===h12?' selected':''}>${x}시</option>`).join('')}</select>`
      + `<select data-alm="${i}" aria-label="${i+1}번째 알림 분">${[0,10,20,30,40,50].map(x=>`<option value="${x}"${x===m10?' selected':''}>${x ? x+'분' : '정각'}</option>`).join('')}</select>`
      + `<button type="button" class="btn primary" data-aldel="${i}" title="이 시각 빼기">빼기</button></li>`; };
  return `<div class="al-set"><b>과업 알림</b>`
    + `<p class="hint al-say">마감이 오늘이거나 지난 내 할 일을, 정한 시각이 지나고 화면을 처음 볼 때 따로 뜨는 창으로 알려 줍니다. (창이 바로 안 뜨는 브라우저에서는 화면을 한 번 누를 때 뜹니다)</p>`
    + `<div class="al-count"><span>하루에 몇 번 알릴까요?</span><span class="al-step"><button type="button" class="btn primary" data-alminus${n?'':' disabled'} title="한 번 줄이기 (맨 뒤 시각을 뺌)" aria-label="알림 횟수 줄이기">−</button><b>${n ? n+'번' : '끔'}</b><button type="button" class="btn primary" data-aladd${n>=AL_MAX?' disabled':''} title="한 번 늘리기" aria-label="알림 횟수 늘리기">＋</button></span></div>`
    + (n ? `<ul class="al-list">${L.map(row).join('')}</ul><p class="hint al-say">시각을 바꾸면 바로 저장됩니다 · 이른 시각부터 차례로 놓입니다.</p>` : `<p class="hint al-say">알림을 끈 상태입니다. <b>＋</b> 를 누르면 다시 켜집니다.</p>`)
    + `</div>`; }
const alRepaint = () => { if(typeof paintMySet==='function') paintMySet(); };
document.addEventListener('change', async e=>{ const d=e.target.dataset||{}, i = d.alp ?? d.alh ?? d.alm; if(i==null) return; const li=e.target.closest('li'); if(!li) return;
  const pm=li.querySelector('[data-alp]').value==='1', h12=+li.querySelector('[data-alh]').value, m=+li.querySelector('[data-alm]').value, t=((h12%12)+(pm?12:0))*60+m;
  const L=SY_ALERT.times(); if(L[+i]===t) return;
  if(L.includes(t)){ toast(`${SY_ALERT.say(t)} 알림은 이미 있습니다.`); alRepaint(); return; }
  L[+i]=t; await etcSaveAlert(L); alRepaint(); toast(`과업 알림: ${SY_ALERT.label()}`); });
document.addEventListener('click', async e=>{ const b=e.target.closest?.('[data-aldel],[data-aladd],[data-alminus]'); if(!b || b.disabled) return; e.preventDefault(); let L=SY_ALERT.times();
  if(b.dataset.aldel!=null) L.splice(+b.dataset.aldel, 1);
  else if(b.dataset.alminus!=null) L.pop();
  else { if(L.length>=AL_MAX) return;   // 늘리기: 처음 정해 둔 시각(오전 8시 · 11시 · 오후 1시 · 5시) 가운데 빠진 것부터, 다 있으면 맨 뒤 시각의 1시간 뒤
    let n=SY_ALERT.DEF.find(x=>!L.includes(x)); if(n==null){ n=Math.min((L.length ? L[L.length-1] : 420)+60, 1380); while(L.includes(n) && n<1430) n+=10; if(L.includes(n)){ n=0; while(L.includes(n)) n+=10; } }
    L.push(n); }
  await etcSaveAlert(L); alRepaint(); toast(`과업 알림: ${SY_ALERT.label()}`); });
// 나의 할일 구분 (2026-11-19): 개인예약(개인고객 추후 과업) · 단체예약(단체 추후 과업) · 내가 만든 구분(기타 업무) · 구분 없음 — 순서는 사람마다 저장(▲▼로 바꿈)
const CAT_P='@personal', CAT_G='@group', CAT_N='@none';
const catLabel = c => c===CAT_P ? '개인예약' : c===CAT_G ? '단체예약' : c===CAT_N ? ETC_NOCAT : c;
function catOrder(){ let o=[]; try{ o=(JSON.parse((etcCatRec()||{}).history||'{}').order)||[]; }catch(_){}
  const all=[CAT_P, CAT_G, ...etcCats(), CAT_N], out=o.filter(x=>all.includes(x)); all.forEach(x=>{ if(!out.includes(x)) out.push(x); }); return out; }
const catTab = c => c===CAT_P ? 'personal' : c===CAT_G ? 'group' : 'cat:'+(c===CAT_N ? '' : c);
const tabCat = t => t==='personal' ? CAT_P : t==='group' ? CAT_G : /^cat:/.test(t) ? (t.slice(4) || CAT_N) : '';
// 구분 순서 · 추가 (메인 1열)
function catManageHTML(){ const o=catOrder();
  return `<div class="cat-manage"><b>구분</b> <small class="hint" style="margin:0">▲▼로 순서 (탭 · 고르기 순서)</small><ul class="cat-ord">${o.map((c,i)=>`<li><span>${esc(catLabel(c))}</span><button type="button" data-catmv="${i}|-1" title="위로"${i?'':' disabled'}>▲</button><button type="button" data-catmv="${i}|1" title="아래로"${i<o.length-1?'':' disabled'}>▼</button></li>`).join('')}</ul>`
    + (etcCatAdding ? `<div class="cat-addrow"><input id="etcCatIn" class="etc-catin" data-ime="ko" placeholder="새 구분 이름" autocomplete="off"><button type="button" class="btn primary" data-catok>추가</button></div>` : `<button type="button" class="btn cat-addbtn" data-etccatadd>＋ 구분 추가</button>`) + `</div>`; }   // 추가 버튼도 · 위 구분 줄과 같은 너비 · 높이 (2026-11-19)
document.addEventListener('click', async e=>{ const b=e.target.closest?.('[data-catmv]'); if(!b) return; e.preventDefault(); const [i,d]=b.dataset.catmv.split('|').map(Number), o=catOrder(), j=i+d; if(j<0 || j>=o.length) return;
  [o[i],o[j]]=[o[j],o[i]]; await etcSaveCats(etcCats(), o); renderMy(); });
const etcCatOf = d => (d.list && d.list!=='작업') ? d.list : '';
let etcCatFilter = (()=>{ try{ return localStorage.getItem('sy_etc_cat')||''; }catch(_){ return ''; } })(), etcCatAdding=false;   // 전체 탭에서 고른 구분 ('' = 모두)
const etcCatSelHTML = (id, v) => `<select id="${id}" class="etc-cat" title="구분 (안 고르면 구분 없음)"><option value="">${ETC_NOCAT}</option>${catOrder().filter(c=>c!==CAT_N).map(c=>`<option value="${esc(c)}"${c===v?' selected':''}>${esc(catLabel(c))}</option>`).join('')}</select>`;   // 개인예약 · 단체예약도 고를 수 있음 (2026-11-19)
document.addEventListener('change', e=>{
  if(e.target.id==='etcCat') etcForm.cat=e.target.value;
  if(e.target.id==='etcECat' && etcEdit) etcEdit.d.list=e.target.value;
  if(e.target.id==='etcCatFilter'){ etcCatFilter=e.target.value; try{ localStorage.setItem('sy_etc_cat', etcCatFilter); }catch(_){} renderMy(); } });
document.addEventListener('click', e=>{ if(e.target.closest?.('[data-etccatadd]')){ e.preventDefault(); etcCatAdding=true; etcRepaint(); setTimeout(()=>$('#etcCatIn')?.focus(), 0); } });
async function catAddFromIn(){ const el=$('#etcCatIn'); if(!el) return; const v=el.value.trim(); if(!v){ etcCatAdding=false; etcRepaint(); return; } if(v===ETC_NOCAT){ toast('다른 이름을 적어 주세요.'); el.focus(); return; }
  const cs=etcCats(); etcCatAdding=false; if(!cs.includes(v)) await etcSaveCats([...cs, v]); etcForm.cat=v; etcRepaint(); toast(`구분 「${v}」을 만들었습니다.`); }
document.addEventListener('keydown', async e=>{ if(e.target.id!=='etcCatIn') return; if(e.key==='Escape'){ etcCatAdding=false; etcRepaint(); return; } if(e.key!=='Enter' || e.isComposing) return; e.preventDefault(); await catAddFromIn(); });
document.addEventListener('mousedown', e=>{ if(e.target.closest?.('[data-catok]')) e.preventDefault(); });   // 칸을 벗어나며 닫히지 않게
document.addEventListener('click', async e=>{ if(e.target.closest?.('[data-catok]')){ e.preventDefault(); await catAddFromIn(); } });
document.addEventListener('focusout', e=>{ if(e.target.id==='etcCatIn' && !e.target.value.trim()) setTimeout(()=>{ if(etcCatAdding){ etcCatAdding=false; etcRepaint(); } }, 150); });
function etcSection(full, oneCat){   // oneCat (2026-11-19 · 나의 할일 구분 탭 · 메인 2 · 3열): 그 구분 업무만 ('' = 구분 없음) · full = 추가 칸도
  const today=ymd(new Date()), cats=etcCats(), one = oneCat!==undefined, cf = !full && !one && (etcCatFilter==='' || etcCatFilter==='__none' || cats.includes(etcCatFilter)) ? etcCatFilter : '';
  const inCat = o => one ? etcCatOf(o.d)===oneCat : full || !cf ? true : cf==='__none' ? !etcCatOf(o.d) : etcCatOf(o.d)===cf;
  const all=myEtcOpen().filter(inCat), mine=etcMine().filter(inCat);
  // 업무마다 한 줄: 오늘 할 날(없으면 가장 최근 지난 날) + 그 전에 안 한 날 수 (같은 업무가 날짜마다 여러 줄로 쌓이지 않게)
  const byId={}; all.forEach(o=>{ (byId[o.r.id] ||= []).push(o); });
  const list=Object.values(byId).map(a=>{ const s=a.slice().sort((x,y)=>y.day.localeCompare(x.day)); return {...s[0], before:s.slice(1).map(x=>x.day)}; }).sort((a,b)=>a.day.localeCompare(b.day));
  const late=list.filter(o=>o.day<today || o.before.length).length;
  const doneToday=mine.filter(o=>(o.d.done||{})[today]);
  const item = o => tkHTML(tkFromE(o, o.day, {before:o.before}));   // 과업 줄 모양은 모두 같음 · 줄 안에서 바로 고침 (js/mytask.js, 2026-11-21)
  const shownIds=new Set(list.map(o=>o.r.id));
  // 구분별로 묶기 (기타 탭): 구분 순서대로, 구분 없음은 맨 아래 (2026-11-19)
  const grouped = () => { const keys=[...cats, '']; const parts=keys.map(c=>({c, a:list.filter(o=>etcCatOf(o.d)===c)})).filter(g=>g.a.length || (g.c && full));
    return parts.map(g=>`<div class="etc-cat-h">${esc(g.c||ETC_NOCAT)} <small>${g.a.length}개</small></div>` + (g.a.length ? `<ul class="pc-list tk-list">${g.a.map(item).join('')}</ul>` : '<p class="hint etc-cat-empty">오늘 할 업무 없음</p>')).join(''); };
  const catBar = full
    ? `<div class="etc-catbar">${cats.map(c=>`<span class="etc-chip">${esc(c)}</span>`).join('')}${etcCatAdding ? `<input id="etcCatIn" class="etc-catin" data-ime="ko" placeholder="새 구분 이름 (Enter)" autocomplete="off">` : `<button type="button" class="btn sm" data-etccatadd>＋ 구분 추가</button>`}</div>`
    : (cats.length ? `<label class="etc-catpick">구분 <select id="etcCatFilter"><option value="">모두</option>${cats.map(c=>`<option${c===cf?' selected':''}>${esc(c)}</option>`).join('')}<option value="__none"${cf==='__none'?' selected':''}>${ETC_NOCAT}</option></select></label>` : '');
  return `<h3 class="my-h">${one ? esc(oneCat ? catLabel(oneCat) : ETC_NOCAT) : '기타 개인 업무'} <small>할 일 ${list.length}개${late?` · <b class="late">밀린 것 ${late}개</b>`:''}</small></h3>`
    + (one ? (full ? etcAddHTML(oneCat) : '') : catBar + etcAddHTML())
    + (list.length || (!one && full && cats.length) ? (!one && full && cats.length ? grouped() : `<ul class="pc-list tk-list">${list.map(item).join('')}</ul>`) : '<p class="hint">오늘 할 업무가 없습니다.</p>')
    + etcLaterHTML(mine.filter(o=>o.d.repeat==='later' && !/^@/.test(etcCatOf(o.d)||'')), !one)
    + (doneToday.length ? `<details class="etc-more"${etcOpenDone?' open':''} data-etcfold="done"><summary>오늘 완료한 것 ${doneToday.length}개</summary>${tkListHTML(doneToday.map(o=>({...tkFromE(o, today), done:true})))}</details>` : '')
    + `<details class="etc-more"${etcOpenAll?' open':''} data-etcfold="all"><summary>내 업무 전체 ${mine.length}개</summary>`
    + (mine.length ? tkListHTML(mine.slice().sort((a,b)=>String(a.d.title).localeCompare(String(b.d.title),'ko')).map(o=>tkFromE(o, o.d.repeat==='later' ? today : (etcNext(o.d, today)||'')))) : '<p class="hint">아직 업무가 없습니다. 위에서 추가하세요.</p>')
    + `</details>`;
}
// 기타 업무 세부 과업: 줄 아래 칸에 적고 Enter → 바로 저장 · × 빼기 (2026-11-19)
document.addEventListener('keydown', async e=>{ const id=e.target.dataset && e.target.dataset.etcsubadd; if(!id || e.key!=='Enter' || e.isComposing) return; e.preventDefault();
  const v=e.target.value.trim(), o=etcMine().find(x=>x.r.id===id); if(!v || !o) return; e.target.disabled=true;
  try{ await etcPut(o.r, {...o.d, subs:[...(o.d.subs||[]), {id:'s'+Date.now().toString(36), title:v}]}, `세부 과업 추가: ${v}`); setTimeout(()=>document.querySelector(`[data-etcsubadd="${CSS.escape(id)}"]`)?.focus(), 0); }
  catch(err){ e.target.disabled=false; toast('추가하지 못했습니다: '+(err.code||err.message)); } });
document.addEventListener('click', async e=>{ const b=e.target.closest && e.target.closest('[data-etcsubx]'); if(!b) return; e.preventDefault(); e.stopPropagation(); const [id,sid]=b.dataset.etcsubx.split('|'), o=etcMine().find(x=>x.r.id===id); if(!o) return;
  const s=(o.d.subs||[]).find(x=>x.id===sid); await etcPut(o.r, {...o.d, subs:(o.d.subs||[]).filter(x=>x.id!==sid)}, `세부 과업 빼기: ${s?(s.title||''):''}`); });
// 다시 그리기 (쓰던 칸 · 커서 유지)
function etcRepaint(){ const a=document.activeElement, id=a?.id, v=$('#etcAddIn')?.value||''; renderMy(); const i=$('#etcAddIn'); if(i) i.value=v; if(id){ const el=document.getElementById(id); if(el){ el.focus(); try{ const n=el.value.length; el.setSelectionRange(n,n); }catch(_){} } } }
// 고치는 칸의 글자 → etcEdit.d (다시 그려도 남게)
document.addEventListener('input', e=>{ if(!etcEdit) return; if(e.target.id==='etcETitle') etcEdit.d.title=e.target.value; if(e.target.id==='etcEMemo') etcEdit.d.memo=e.target.value; });
document.addEventListener('change', e=>{
  if(e.target.id==='etcDue') etcForm.due=e.target.value; if(e.target.id==='etcDom') etcForm.dom=e.target.value;
  if(etcEdit){ if(e.target.id==='etcEDue') etcEdit.d.due=e.target.value; if(e.target.id==='etcEStart') etcEdit.d.start=e.target.value; if(e.target.id==='etcEDom') etcEdit.d.dom=e.target.value; }
});
document.addEventListener('toggle', e=>{ const f=e.target.dataset?.etcfold; if(f==='all') etcOpenAll=e.target.open; if(f==='done') etcOpenDone=e.target.open; if(f==='today' && e.target.open!==doneTodayOpen()){ try{ localStorage.setItem(DONE_TODAY_LS, e.target.open?'1':'0'); }catch(_){} } }, true);
document.addEventListener('keydown', e=>{ if(e.target.id!=='etcESubIn' || e.key!=='Enter' || e.isComposing) return; e.preventDefault(); const t=e.target.value.trim(); if(!t || !etcEdit) return;
  etcEdit.d.subs=[...(etcEdit.d.subs||[]), {id:'s'+Date.now().toString(36), title:t}]; etcRepaint(); const i=$('#etcESubIn'); if(i){ i.value=''; i.focus(); } });
document.addEventListener('click', async e=>{
  const t=e.target;
  // 추가 칸
  const r=t.closest?.('[data-etcrep]'); if(r){ e.preventDefault(); etcForm.repeat=r.dataset.etcrep; if(etcForm.repeat==='weekly' && !etcForm.dows.length) etcForm.dows=[new Date().getDay()]; etcRepaint(); return; }
  const w=t.closest?.('[data-etcdow]'); if(w){ e.preventDefault(); const i=+w.dataset.etcdow; etcForm.dows = etcForm.dows.includes(i) ? etcForm.dows.filter(x=>x!==i) : [...etcForm.dows, i]; etcRepaint(); return; }
  // 밀린 날 모두 완료 (오늘 줄은 그대로)
  const pb=t.closest?.('[data-etcpast]'); if(pb){ e.preventDefault(); e.stopPropagation(); const o=etcMine().find(x=>x.r.id===pb.dataset.etcpast); if(!o) return; const today=opsToday(), now=new Date().toISOString(), me=savedOwner()||'';
    const days=opsPending(o.d, today), last=days[days.length-1], done={...(o.d.done||{})}; days.filter(d=>d!==last).forEach(d=>{ done[d]={at:now, by:me}; });
    await etcPut(o.r, {...o.d, done}, `밀린 ${days.length-1}일 완료 (나의 할일)`); toast(`「${o.d.title}」 밀린 ${days.length-1}일을 완료로 표시했습니다.`); return; }
  // 고치기 열기
  const ed=t.closest?.('[data-etcedit]'); if(ed){ e.preventDefault(); const o=etcMine().find(x=>x.r.id===ed.dataset.etcedit); if(!o) return;
    etcEdit={id:o.r.id, d:JSON.parse(JSON.stringify(o.d)), where: ed.closest('.today-due') ? 'today' : ed.closest('.my-extra') ? 'extra' : ed.closest('.etc-laterlist') ? 'later' : ''}; if(!etcEdit.d.repeat) etcEdit.d.repeat='none'; etcRepaint(); $('#etcETitle')?.focus(); return; }
  if(!etcEdit) return;
  const er=t.closest?.('[data-eerep]'); if(er){ const d=etcEdit.d; d.repeat=er.dataset.eerep; if(d.repeat==='weekly' && !(d.dows||[]).length) d.dows=[new Date().getDay()]; if(d.repeat==='monthly' && !d.dom) d.dom=String(new Date().getDate()); if(d.repeat!=='none' && !d.start) d.start=todayYmd(); if(d.repeat==='none' && !d.due) d.due=d.start||todayYmd(); etcRepaint(); return; }
  const ew=t.closest?.('[data-eedow]'); if(ew){ const i=+ew.dataset.eedow, s=etcEdit.d.dows||[]; etcEdit.d.dows = s.includes(i) ? s.filter(x=>x!==i) : [...s, i]; etcRepaint(); return; }
  const sd=t.closest?.('[data-eesubdel]'); if(sd){ etcEdit.d.subs=(etcEdit.d.subs||[]).filter((_,i)=>i!==+sd.dataset.eesubdel); etcRepaint(); return; }
  if(t.closest?.('[data-eecancel]')){ etcEdit=null; renderMy(); return; }
  if(t.closest?.('[data-eesave]')){ const d=etcEdit.d, o=etcMine().find(x=>x.r.id===etcEdit.id);
    const pend=$('#etcESubIn')?.value.trim(); if(pend) d.subs=[...(d.subs||[]), {id:'s'+Date.now().toString(36), title:pend}];   // 적어 두고 Enter 를 안 누른 세부 과업도
    if(!String(d.title||'').trim()){ toast('업무 이름을 적어 주세요.'); $('#etcETitle')?.focus(); return; }
    if(d.repeat==='weekly' && !(d.dows||[]).length){ toast('요일을 하나 이상 골라 주세요.'); return; }
    if(!o){ etcEdit=null; renderMy(); return; }
    d.title=d.title.trim(); const id=etcEdit.id; etcEdit=null; await etcPut(o.r, d, '고침 (나의 할일)'); toast(`「${d.title}」 고쳤습니다 · ${opsRepeatLabel(d)}`); return; }
  if(t.closest?.('[data-eedel]')){ const id=etcEdit.id, o=etcMine().find(x=>x.r.id===id); if(!o) return;
    askDelete(`「${o.d.title}」 업무를 삭제할까요? (반복 업무면 앞으로의 날짜도 모두 없어집니다)`, async()=>{ etcEdit=null; await store.del(id); cache=cache.filter(x=>x.id!==id); renderMy(); if(typeof paintMyCount==='function') paintMyCount(); toast(`「${o.d.title}」 삭제했습니다.`); }); return; }
});
// 업무 추가
document.addEventListener('submit', async e=>{
  if(e.target.id!=='etcAdd') return; e.preventDefault();
  const inp=$('#etcAddIn'), title=inp.value.trim(); if(!title){ inp.focus(); return; }
  const me=savedOwner(); if(!me){ toast('이름이 있어야 추가할 수 있습니다.'); return; }
  const f=etcForm, today=todayYmd();
  if(f.repeat==='weekly' && !f.dows.length){ toast('요일을 하나 이상 골라 주세요.'); return; }
  const d={title, repeat:f.repeat, owner:me, memo:'', subs:[]}; if(f.cat) d.list=f.cat;   // 구분 (2026-11-19)
  if(f.repeat==='none') d.due=f.due||today; else if(f.repeat!=='later') d.start=today;   // 마감 없음(later): 날짜 없이 (2026-11-20)
  if(f.repeat==='weekly') d.dows=f.dows.slice();
  if(f.repeat==='monthly') d.dom=String(f.dom||new Date().getDate());
  const now=new Date().toISOString(), item={id:opsId(), callType:'개인업무', saved:now, takenBy:me, owner:me, summary:`${title} · ${opsRepeatLabel(d)}`.slice(0,120),
    history:JSON.stringify({kind:'task', d, log:[{at:now, by:me, what:'추가 (나의 할일)'}]})};
  inp.disabled=true;
  try{ await store.put(item); if(!cache.some(x=>x.id===item.id)) cache.push(item); etcForm={repeat:'none', dows:[], dom:'', due:'', cat:etcForm.cat||''}; renderMy(); if(typeof paintMyCount==='function') paintMyCount(); $('#etcAddIn')?.focus();
    toast(`「${title}」 추가했습니다 · ${opsRepeatLabel(d)}${d.due && d.due!==today ? ` · ${mdLabel(d.due)}` : ''} · 세부 과업 · 메모는 이름을 눌러서`); }
  catch(err){ inp.disabled=false; toast('추가하지 못했습니다: '+(err.code||err.message)); }
});
// 체크: 그날 완료 · 완료 취소 · 세부 과업 (모두 체크하면 그날 완료, 하나라도 풀면 자동 완료 해제)
document.addEventListener('change', async e=>{
  const v=e.target.dataset?.etcdone || e.target.dataset?.etcundo, sv=e.target.dataset?.etcsub; if(!v && !sv) return;
  const me=savedOwner()||'', now=new Date().toISOString();
  if(sv){ const [id,day,sid]=sv.split('|'), o=etcMine().find(x=>x.r.id===id); if(!o) return; const d=o.d;
    const sd={...(d.subDone||{})}, m={...(sd[day]||{})}; if(e.target.checked) m[sid]=1; else delete m[sid]; sd[day]=m;
    const done={...(d.done||{})}, all=(d.subs||[]).length && (d.subs||[]).every(s=>m[s.id]);
    if(all && !done[day]) done[day]={at:now, by:me, auto:1}; if(!all && done[day] && done[day].auto) delete done[day];
    await etcPut(o.r, {...d, subDone:sd, done, ...(all && d.repeat==='later' ? {repeat:'none', due:day} : {})},`${day} 세부 과업 ${e.target.checked?'체크':'해제'}`); if(all) toast(`「${d.title}」 세부 과업을 모두 끝내 그날 완료로 표시했습니다.`); return; }
  const [id,day]=v.split('|'), o=etcMine().find(x=>x.r.id===id); if(!o) return; const done={...(o.d.done||{})};
  let due2=null; if(e.target.dataset.etcdone){ done[day]={at:now, by:me}; if(o.d.repeat==='later') due2=day; } else { delete done[day]; const t0=opsToday(); if((!o.d.repeat || o.d.repeat==='none') && day<t0) due2=t0; }   // 다시 열면 마감이 지났어도 오늘 (반복 없는 업무, 2026-11-19)
  e.target.disabled=true; await etcPut(o.r, {...o.d, done, ...(due2 ? {due:due2} : {}), ...(o.d.repeat==='later' && e.target.dataset.etcdone ? {repeat:'none'} : {})}, e.target.dataset.etcdone ? `${day} 완료 (나의 할일)` : `${day} 완료 취소 (나의 할일)`);
  toast(e.target.dataset.etcdone ? `「${o.d.title}」 완료로 표시했습니다.` : `「${o.d.title}」 완료를 취소했습니다.`);
});
// 짧은 해시 (주간 점검 기록 id)
const tdHash = s => { let h=5381; for(const c of String(s)) h=((h*33) ^ c.codePointAt(0))>>>0; return h.toString(36); };
// ===== 매주 목요일: 다음주 예약 점검 (2026-11-19) =====
// 영업 담당마다, 가장 가까운 지난 목요일(오늘이 목요일이면 오늘)에 그다음 날부터 다음주 일요일까지(금 ~ 다음주 일, 10일 · 2026-11-19 바꿈, 주 시작 = 월요일 · 겹치는 예약은 다시 점검)의 내 예약(가예약 · 예약확정)을 점검
// 나의 할일 › 단체 · 전체 탭의 추후 과업 (단체) 목록 맨 위에 과업 한 줄. 예약(단체 이름)마다 세부 과업(체크) — 이름을 누르면 그 예약 열기
// 체크는 공유 기록 한 줄(통화 구분 「주간점검」, 사람 · 주마다 하나)에 { week, done:{예약ID:시각} }
const wkThu = (today=ymd(new Date())) => { const d=new Date(today+'T00:00'); d.setDate(d.getDate()-((d.getDay()-4+7)%7)); return ymd(d); };
const wkAdd = (ymdS, n) => { const d=new Date(ymdS+'T00:00'); d.setDate(d.getDate()+n); return ymd(d); };
const wkId = (me, thu) => 'wk'+tdHash(me)+thu.replace(/-/g,'');
const wkRec = (me, thu) => (cache||[]).find(r=>r.id===wkId(me, thu)) || null;
const wkDone = (me, thu) => { try{ return (JSON.parse((wkRec(me, thu)||{}).history||'{}').done)||{}; }catch(_){ return {}; } };
function wkItems(me, thu){ const from=wkAdd(thu,1), to=wkAdd(thu,10);
  return (cache||[]).filter(r=>isGroupRec(r) && ownerOf(r)===me && r.date && r.date>=from && r.date<=to && isBooked(stageOfRec(r))).sort((a,b)=>String(a.date).localeCompare(String(b.date)) || String(a.org||'').localeCompare(String(b.org||''),'ko')); }
// 추후 과업 (단체) 목록 맨 위에 과업 한 줄: 「다음주 예약 점검」 + 예약마다 세부 과업(체크). 다 체크하면 목록에서 빠짐 (2026-11-19 · 따로 칸 만들지 않음)
function weekTask(){
  const me=savedOwner(); if(!me) return null;
  const today=ymd(new Date()), thu=wkThu(today), from=wkAdd(thu,1), to=wkAdd(thu,10), items=wkItems(me, thu), done=wkDone(me, thu), due=wkDue(me, thu);
  const n=items.filter(r=>done[r.id]).length; if(!items.length || n===items.length) return null;
  const late=today>due, left=daysFromWk(today, due), dt = late ? `<b class="late">${daysFromWk(due, today)}일 지남</b>` : left===0 ? '<b class="late">오늘</b>' : `${left}일 남음`;
  // 맨 앞 체크 = 모두 점검 (2026-11-19) · 마감은 날짜를 눌러 바꿈 (그 주에만, 기본 = 목요일)
  const html = `<li class="my-tg wk-task"><span class="who"><span class="tag">단체</span> <b>다음주 예약 점검</b> · ${esc(mdLabel(from))} ~ ${esc(mdLabel(to))} · ${n}/${items.length}<br>`
    + `<span class="my-task${late?' late':left===0?' today':''}"><label class="my-ck" title="체크하면 이 기간 예약을 모두 점검한 것으로"><input type="checkbox" data-wkall="1"></label> 내 예약(가예약 · 예약확정) 점검 <label class="wk-due" title="눌러서 마감일 바꾸기">마감 ${dboxHTML('data-wkdue="1"', due)} <small>(${dt})</small></label></span></span>`
    + `<div class="etc-subck wk-subs">${items.map(r=>{ const ck=!!done[r.id];
        return `<div class="wk-s${ck?' on':''}"><input type="checkbox" data-wkck="${esc(r.id)}"${ck?' checked':''} title="점검했으면 체크"> <span data-myopen="${esc(r.id)}" class="wk-name" title="눌러서 예약 열기">${esc(r.org||r.contact||'(업체 미정)')}</span> <small class="hint" style="margin:0">${esc(dateLabel(r.date))}${r.people?` · ${esc(r.people)}명`:''}</small></div>`; }).join('')}</div></li>`;
  return {html, late};
}
const daysFromWk = (a, b) => Math.round((new Date(b+'T00:00') - new Date(a+'T00:00'))/86400000);
const wkDue = (me, thu) => { try{ const d=(JSON.parse((wkRec(me, thu)||{}).history||'{}')).due; if(/^\d{4}-\d{2}-\d{2}$/.test(d||'')) return d; }catch(_){} return thu; };   // 마감 (바꿨으면 그 날)
// 저장 (사람 · 주마다 한 줄): {week, done:{예약ID:시각}, due}
async function wkSave(mut){
  const me=savedOwner()||'', thu=wkThu(), old=wkRec(me, thu), now=new Date().toISOString(); let h={}; try{ h=JSON.parse((old||{}).history||'{}')||{}; }catch(_){}
  const nh=mut({week:thu, done:{...(h.done||{})}, ...(h.due?{due:h.due}:{})}, now);
  const items=wkItems(me, thu), n=items.filter(r=>nh.done[r.id]).length;
  const item={...(old||{}), id:wkId(me, thu), callType:'주간점검', saved:(old&&old.saved)||now, takenBy:me, owner:me, summary:`다음주 예약 점검 ${mdLabel(wkAdd(thu,1))}~${mdLabel(wkAdd(thu,10))} · ${n}/${items.length}`, history:JSON.stringify(nh)};
  await store.put(item); const i=cache.findIndex(x=>x.id===item.id); if(i>=0) cache[i]=item; else cache.push(item); renderMy(); if(typeof paintMyCount==='function') paintMyCount();
  return {n, all:items.length};
}
document.addEventListener('change', async e=>{
  const id=e.target.dataset?.wkck, all=e.target.dataset?.wkall, due=e.target.dataset?.wkdue; if(!id && !all && !due) return;
  e.target.disabled=true;
  try{
    if(due){ if(!e.target.value) return; await wkSave(h=>({...h, due:e.target.value})); toast(`다음주 예약 점검 마감을 ${mdLabel(e.target.value)}로 바꿨습니다.`); return; }
    if(all){ const items=wkItems(savedOwner()||'', wkThu()); await wkSave((h,now)=>{ items.forEach(r=>{ if(!h.done[r.id]) h.done[r.id]=now; }); return h; }); toast('다음주 예약 점검을 모두 끝냈습니다.'); return; }
    const r=await wkSave((h,now)=>{ if(e.target.checked) h.done[id]=now; else delete h.done[id]; return h; }); if(r.all && r.n===r.all) toast('다음주 예약 점검을 모두 끝냈습니다.');
  }catch(err){ e.target.disabled=false; if(e.target.type==='checkbox') e.target.checked=!e.target.checked; toast('저장하지 못했습니다: '+(err.code||err.message)); }
});
// 예약 현황 아래 그날 목록: 단체 예약에서 온 줄을 누르면 그 예약 열기 (고치던 것은 openRecordG 가 먼저 물어봄)
document.addEventListener('click', e=>{ const li=e.target.closest?.('#dayAll li[data-bopen]'); if(!li || !li.dataset.bopen) return; const r=cache.find(x=>x.id===li.dataset.bopen); if(r) openRecordG(r); });
$('#cancelWhyTxt')?.addEventListener('click', openCancel);   // 사유를 누르면 고치기

// ===== 고객 견적 요청 → 견적서 · 거래명세서 담당자의 나의 할일 (2026-11-23) =====
// 멤버관리에서 「견적서 · 거래명세서 담당」으로 체크한 사람(서버 kv role:quote)에게, 아직 「접수」인 고객 견적 요청을 메인 1열 「오늘 마감」 위에 보여 줌.
// 담당이 아무도 없으면 모두에게 (담당 미지정 안내와 함께). 누르면 견적서 화면 — 거기서 출력 · 「끝난 요청으로」 하면 사라짐. 첫 화면 대시보드(js/portal.js lastReq)와 같은 기준
const MYQR_LS = 'sy_my_quotereq';
let myQR = (()=>{ try{ return JSON.parse(localStorage.getItem(MYQR_LS)||'null') || {items:[], owners:[]}; }catch(_){ return {items:[], owners:[]}; } })(), myQRBusy=false;
const myQuoteReqs = () => { const me=savedOwner(); return me && (!(myQR.owners||[]).length || myQR.owners.includes(me)) ? (myQR.items||[]) : []; };
async function loadMyQuoteReq(){
  if(myQRBusy || /[?&]engine=/.test(location.search) || typeof SY==='undefined' || !SY.callRaw) return; myQRBusy=true;
  try{ const [m, qr] = await Promise.all([SY.callRaw({action:'members'}).catch(()=>null), SY.callRaw({action:'quoteReqList'}).catch(()=>null)]);
    if(m && m.ok && qr && qr.ok){ const up=s=>String(s||'').trim().toUpperCase(), es=((m.roles||{}).quote||[]).map(up);
      myQR={items:(qr.items||[]).filter(r=>(r.status||'접수')==='접수').map(r=>({org:r.org, name:r.name, date:r.date, pax:r.pax, at:r.at})), owners:(m.members||[]).filter(x=>es.includes(up(x.emp))).map(x=>String(x.name||'').trim()).filter(Boolean)};
      try{ localStorage.setItem(MYQR_LS, JSON.stringify(myQR)); }catch(_){}
      paintMyCount(); if(typeof ALERT_WIN!=='undefined' && ALERT_WIN && window.__tasksReady) checkTbdPopup(true);   // 과업 알림 창: 견적 요청을 새로 받으면 다시 그림 (2026-11-26)
      if(!$('#myModal').hidden && myTab==='main' && !document.activeElement?.closest?.('#myBody input, #myBody textarea, #myBody select')) renderMy(); }   // 입력 중이면 다시 그리지 않음
  }catch(_){} finally{ myQRBusy=false; }
}
function myQuoteReqHTML(){
  const L=myQuoteReqs(); if(!L.length) return '';
  const today=ymd(new Date()), late=L.filter(r=>String(r.at||'').slice(0,10)<today).length;
  return `<h3 class="my-h sub">고객 견적 요청 <small>${L.length}건${late?` · <b class="late">지난 요청 ${late}건</b>`:''}${(myQR.owners||[]).length?'':' · 담당 미지정 (멤버관리에서 지정)'}</small></h3>`
    + `<ul class="pc-list">${L.map(r=>{ const d=String(r.at||'').slice(0,10);
        return `<li class="r my-tg"><a class="who" href="document/index.html" target="_top" style="color:inherit;text-decoration:none"><span class="tag">견적</span> <b>${esc(r.org||'')}</b>${r.name?` · ${esc(r.name)}님`:''}${r.date?` · 방문 ${esc(dateLabel(String(r.date).slice(0,10)))}`:''}${r.pax?` · ${esc(r.pax)}명`:''}<br>`
          + `<span class="my-task${d<today?' late':' today'}">견적서 · 거래명세서 발급 <small>접수 ${esc(String(r.at||'').slice(5,16))}</small></span></a></li>`; }).join('')}</ul>`;
}
if(!/[?&]engine=/.test(location.search)){ setTimeout(loadMyQuoteReq, 1500); setInterval(()=>{ if(document.visibilityState==='visible') loadMyQuoteReq(); }, 60e3); }

// ===== 나의 할일을 다시 그려도 적던 글자는 그대로 (2026-11-24) =====
// 30초마다 받아 오기 · 다른 컴퓨터에서 바뀜 · 견적 요청 1분마다 등으로 renderMy() 가 나의 할일을 통째로 다시 그리면, 적고 있던 칸(개인 업무 입력 · 세부 과업 · 메모 · 업무 고치기 등)이 비워졌음
//  → 다시 그리기 직전에 #myBody 안의 글자 칸 중 「처음 값과 달라진 것」(= 사람이 적은 것)과 커서를 기억했다가, 다시 그린 뒤 같은 자리의 칸에 되돌림
//  · 추가 칸(Enter · 추가)은 저장하는 동안 disabled 가 되므로 기억하지 않음 → 추가한 뒤에는 예전처럼 비워짐
//  · 같은 자리 = 칸의 id, 없으면 칸과 그 위 칸들의 data-* 값으로 (여러 과업의 「세부 과업 추가」 칸을 구분)
(function(){
  if(typeof renderMy!=='function') return;
  const TXT='input:not([type]), input[type=text], input[type=search], input[type=tel], input[type=number], textarea';
  const keyOf = el => { const parts=[]; let n=el;
    while(n && n.id!=='myBody'){ if(n.id){ parts.unshift('#'+n.id); break; }
      const ds=Object.entries(n.dataset||{}).filter(([k])=>k!=='ime').map(([k,v])=>k+'='+v).join('&'); if(ds) parts.unshift(n.tagName+'['+ds+']');
      n=n.parentElement; }
    return parts.length ? parts.join(' > ') + (el.className ? '.'+String(el.className).trim().split(/\s+/).join('.') : '') : ''; };
  const base=renderMy;
  renderMy=function(){
    const box=document.getElementById('myBody'), a=document.activeElement, vals={}; let foc=null;
    if(box){ box.querySelectorAll(TXT).forEach(el=>{ if(el.disabled || el.readOnly) return; const k=keyOf(el); if(k && el.value!==el.defaultValue) vals[k]=el.value; });
      if(a && box.contains(a) && a.matches(TXT) && !a.disabled){ const k=keyOf(a); if(k){ foc={k}; try{ foc.s=a.selectionStart; foc.e=a.selectionEnd; }catch(_){} } } }
    const r=base.apply(this, arguments);
    const box2=document.getElementById('myBody');
    if(box2 && (Object.keys(vals).length || foc)){ box2.querySelectorAll(TXT).forEach(el=>{ const k=keyOf(el); if(!k) return;
        if(k in vals && el.value!==vals[k]){ el.value=vals[k]; if(el.matches('[data-tkmemoin]') && typeof tkGrow==='function') try{ tkGrow(el); }catch(_){} }
        if(foc && k===foc.k){ el.focus({preventScroll:true}); try{ if(foc.s!=null) el.setSelectionRange(foc.s, foc.e); }catch(_){} } }); }
    return r; };
})();
// 나의 할일 › 내가 만든 구분 탭 (2026-11-24): 오늘 · 지난 것만이 아니라 그 구분의 업무 모두 — 업무마다 한 줄(밀린 날이 있으면 가장 이른 밀린 날 · 없으면 다음 할 날), 마감일 순 · 마감 없음은 맨 아래
//  (메인은 그대로 「오늘 마감」만 · 개인예약 · 단체예약 탭은 예전부터 모두 마감 순)
function etcCatAllHTML(c){
  const today=ymd(new Date()), mine=etcMine().filter(o=>etcCatOf(o.d)===c);
  const list=mine.filter(o=>o.d.repeat!=='later').map(o=>{ const p=opsPending(o.d, today), day = p.length ? p[0] : etcNext(o.d, today); return day ? {...o, day, before:p.slice(1)} : null; }).filter(Boolean)
    .sort((a,b)=>a.day.localeCompare(b.day) || String(a.d.title||'').localeCompare(String(b.d.title||''),'ko'));
  const late=list.filter(o=>o.day<today).length, doneToday=mine.filter(o=>(o.d.done||{})[today]);
  return `<h3 class="my-h">${esc(c ? catLabel(c) : ETC_NOCAT)} <small>할 일 ${list.length}개${late?` · <b class="late">밀린 것 ${late}개</b>`:''}</small></h3>`
    + etcAddHTML(c)
    + (list.length ? tkListHTML(list.map(o=>tkFromE(o, o.day, {before:o.before}))) : '<p class="hint">할 업무가 없습니다.</p>')
    + etcLaterHTML(mine.filter(o=>o.d.repeat==='later'))
    + (doneToday.length ? `<details class="etc-more"${etcOpenDone?' open':''} data-etcfold="done"><summary>오늘 완료한 것 ${doneToday.length}개</summary>${tkListHTML(doneToday.map(o=>({...tkFromE(o, today), done:true})))}</details>` : '');
}
