// ===== 다음날 고객 응대 준비 (prep.html) =====
// 공통 도구(SY: 공유 주소 · 날짜 · 전화 · esc · 저장소)는 js/common.js, 전체 구조는 README 14절
// 준비할 날짜(기본 내일 · 엑셀 방문일이 다르면 팝업) → ① 방문자내역 엑셀 → ② 티켓 발권 대상(단체예약은 늘 자동 연결) → ④ 입장문 추천 · 표(목록 · 새로 조사 구분) · 엑셀 · 이미지

const $ = s => document.querySelector(s);
const esc = SY.esc;   // 공통 도구 (js/common.js)
let user={}; try{ user=JSON.parse(localStorage.getItem('sy_user')||'{}')||{}; }catch(_){}
$('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
let toastT; function toast(m, ms=2600){ const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), ms); }
const DOW = SY.DOW;
const dLab = d => { const t=new Date(d+'T00:00'); return isNaN(t)?d:`${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]})`; };
const digits = s => String(s||'').replace(/\D/g,'');
const norm = s => String(s||'').replace(/\s/g,'').toLowerCase();

// ===================== 공유 기록 (단체예약) =====================
const SHARED_URL = SY.API_URL;   // 공유 기록 Apps Script (js/common.js)
const KEY_LS=SY.KEY_LS, GROUP_CACHE_LS='sayuwon_intake_cache';
const getKey = SY.getKey;
async function callApi(body){ const r=await fetch(SHARED_URL,{method:'POST',body:JSON.stringify({...body,key:getKey()})}); const j=await r.json(); if(!j.ok){ const e=new Error(j.error||'error'); e.code=j.error; throw e; } return j; }
const GROUP_TYPES=['예약확정','예약접수','공식예약'];   // 연결은 예약확정만 (2026-11-18 · 예약상담 · 가예약 · 예약취소는 가져오지 않음 · 예약접수 · 공식예약 = 예전 이름)
const isConfirmed = r => GROUP_TYPES.includes(r.callType) || (/^adm/.test(r.id||'') && (r.callType||'단체예약')==='단체예약');   // 관리자 사이트에서 온 예약도 확정
const memoVal = (r, label) => { const p=String(r.memo||'').split(' / ').map(s=>s.trim()).find(s=>s.startsWith(label+' ')); return p ? p.slice(label.length+1).trim() : ''; };   // 비고 칸 「입장문 치허문」 등
let groups = (()=>{ try{ return (JSON.parse(localStorage.getItem(GROUP_CACHE_LS)||'[]')||[]).filter(isConfirmed); }catch(_){ return []; } })();
async function loadGroups(){
  if(!getKey()){ $('#keyBox').hidden=false; return; }
  try{ const j=await SY.list(); groups=(j.items||[]).filter(isConfirmed); $('#keyBox').hidden=true; noticeFrom(j.items); agencyFrom(j.items); paintHist(j.items);
    if(state){ build(false); if(hasEdits()) scheduleAuto(); } }   // 저장 안 한 수정이 남아 있으면 버튼 옆에 알림
  catch(e){ if(e.code==='bad_key'){ $('#keyBox').hidden=false; toast('팀 비밀번호가 맞지 않습니다.'); } else toast('단체예약을 불러오지 못했습니다. 마지막으로 받은 목록으로 보여 줍니다.'); }
}
$('#keyBtn').onclick=()=>{ const v=$('#keyIn').value.trim(); if(!v) return; try{ localStorage.setItem(KEY_LS, v); }catch(_){} $('#keyIn').value=''; loadGroups(); };

// ===================== ① 엑셀 (전산 방문자내역: HTML 표 모양의 .xls) =====================
// 열: 구분 · 방문일 · 성명 · 연락처 · 예약일시 · 프로그램유형 · 예약인원(어른 · 학생) · 불래원 · … · 결제수단 · 금액 · 입장정보(입장 · 퇴장) · 비고
// 한 줄 = 한 예약. 상품이 여러 개면 칸 안에서 줄바꿈으로 나뉨 (상품마다 인원)
const cellLines = td => td ? td.innerHTML.split(/<br\s*\/?>/i).map(h=>{ const d=document.createElement('div'); d.innerHTML=h; return d.textContent.replace(/\s+/g,' ').trim(); }).filter((s,i,a)=>s!=='' || i<a.length-1) : [];
function parseVisitors(text){
  const doc=new DOMParser().parseFromString(text, 'text/html'), trs=[...doc.querySelectorAll('tr')];
  const hi=trs.findIndex(tr=>/성명/.test(tr.textContent) && /연락처/.test(tr.textContent)); if(hi<0) throw new Error('방문자내역 표(성명 · 연락처 열)를 찾지 못했습니다.');
  const cols=[]; const sub=[...(trs[hi+1]||{children:[]}).children].map(td=>td.textContent.trim()); let si=0;
  [...trs[hi].children].forEach(td=>{ const n=+td.getAttribute('colspan')||1, h=td.textContent.replace(/\s/g,''); if(n>1) for(let i=0;i<n;i++) cols.push(h+'·'+(sub[si++]||i)); else cols.push(h); });
  const ix = re => cols.findIndex(c=>re.test(c));
  const C={ kind:ix(/^구분$/), date:ix(/^방문일/), name:ix(/^성명/), phone:ix(/^연락처/), at:ix(/^예약일시/), prog:ix(/^프로그램/), adult:ix(/어른/), student:ix(/학생/), pay:ix(/^결제수단/), note:ix(/^비고/) };
  const title=(doc.querySelector('title')||{}).textContent||'', head=trs.slice(0,hi).map(t=>t.textContent).join(' ');
  const rows=[];
  trs.slice(hi+1).forEach((tr,i)=>{ const tds=[...tr.children]; if(tds.length<cols.length-2 || !tds[C.name]) return; const name=tds[C.name].textContent.trim(); if(!name) return;
    const prods=cellLines(tds[C.prog]).filter(Boolean), ad=cellLines(tds[C.adult]).map(v=>+v||0), st=cellLines(tds[C.student]).map(v=>+v||0);
    const items=prods.map((p,k)=>({p, n:(ad[k]||0)+(st[k]||0)}));
    rows.push({ id:'x'+i, at:C.at>=0 ? (tds[C.at]?.textContent||'').replace(/\s+/g,' ').trim() : '', kind:tds[C.kind]?.textContent.trim()||'', date:(tds[C.date]?.textContent.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/)||[]).slice(1).map((v,j)=>j?v.padStart(2,'0'):v).join('-'),
      name, phone:tds[C.phone]?.textContent.trim()||'', items, ppl: ad.reduce((s,v)=>s+v,0)+st.reduce((s,v)=>s+v,0),
      pay:cellLines(tds[C.pay]).filter(Boolean).join(', '), note:C.note>=0 ? tds[C.note].innerHTML.replace(/<\/p>|<br\s*\/?>/gi,' / ').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').replace(/(\s*\/\s*)+$/,'').trim() : '' });   // 비고: 문단은 ' / '로
  });
  const dm=(title+' '+head).match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  const date = dm ? `${dm[1]}-${dm[2].padStart(2,'0')}-${dm[3].padStart(2,'0')}` : (rows.find(r=>r.date)||{}).date || '';
  return { date, rows };
}
// 같은 날 엑셀을 다시 넣을 때 (2026-11-20 · 성명 기준): 예약이 늘거나 취소돼서 새로 받은 엑셀
//  - 성명이 같은 예약 = 이전 줄 그대로 (줄 번호 · 고친 것 · 고른 것 · 연결 · 연락 체크 유지)
//  - 새 엑셀에 없는 성명 = 그 줄을 지움 (취소) · 새 엑셀에만 있는 성명 = 새 줄
//  - 같은 성명이 여러 줄이면 위에서부터 하나씩 짝지음
function mergeVisitors(old, fresh){
  const nm=s=>String(s||'').replace(/\s/g,''), used=new Set(), keep=[], add=[];
  fresh.forEach(n=>{ const o=old.find(x=>!used.has(x) && nm(x.name)===nm(n.name)); if(o){ used.add(o); if(!o.at && n.at) o.at=n.at; keep.push(o); } else add.push(n); });
  const gone=old.filter(x=>!used.has(x));
  let k=old.reduce((mx,x)=>Math.max(mx, +(String(x.id).match(/^x(\d+)$/)||[])[1]||0), -1)+1;   // 새 줄 번호 = 이어서 (지운 줄 · 이미 있던 줄의 고친 것과 안 섞이게)
  add.forEach(n=>{ n.id='x'+(k++); });
  return { rows:[...old.filter(x=>used.has(x)), ...add], added:add.length, kept:keep.length, gone };
}
async function readFile(f){
  $('#fileErr').textContent='';
  try{
    const buf=await f.arrayBuffer(), head=new Uint8Array(buf.slice(0,4));
    if(head[0]===0x50 && head[1]===0x4b) throw new Error('.xlsx 파일입니다. 전산 방문자내역에서 내려받은 .xls 파일을 그대로 넣어 주세요.');
    if(head[0]===0xd0 && head[1]===0xcf) throw new Error('예전 엑셀(.xls 바이너리) 파일입니다. 전산 방문자내역에서 내려받은 파일을 그대로 넣어 주세요.');
    const text=new TextDecoder('utf-8').decode(buf), v=parseVisitors(text);
    if(!v.rows.length) throw new Error('예약 줄을 찾지 못했습니다.');
    if(v.date && v.date!==prepDate){ showDateModal(`넣은 엑셀의 방문일은 <b>${esc(dLab(v.date))}</b>인데, 준비할 날짜는 <b>${esc(dLab(prepDate))}</b>입니다.<br>${esc(dLab(prepDate))} 방문자내역 엑셀로 바꿔 주세요.`); return; }   // 다음날(준비할 날짜) 파일이 아니면 읽지 않음 (2026-11-18)
    const d=v.date||prepDate;
    if(state && state.date===d && Array.isArray(state.rows) && state.rows.length){   // 같은 날 엑셀을 다시 넣으면: 성명이 같으면 유지 · 없어진 성명은 지움 · 새 성명은 추가 (2026-11-20)
      const m=mergeVisitors(state.rows, v.rows); state.rows=m.rows; state.file=f.name;
      m.gone.forEach(x=>{ delete state.sel[x.id]; delete state.link[x.id]; delete state.edit[x.id]; if(state.saved) delete state.saved[x.id]; });   // 지운 줄의 고른 것 · 연결 · 고친 것도
      build(true); saveState();
      const parts=[m.added?`새 예약 ${m.added}건 추가`:'', m.gone.length?`없어진 예약 ${m.gone.length}건 삭제 (${m.gone.map(x=>x.name).join(', ')})`:'', `그대로 ${m.kept}건`].filter(Boolean);
      toast(m.added || m.gone.length ? parts.join(' · ') : `바뀐 예약이 없습니다 (그대로 ${m.kept}건)`, 4000); return; }
    state={ file:f.name, date:d, rows:v.rows, sel:{}, link:{}, edit:{} };
    build(true); saveState(); toast(`${v.rows.length}건을 읽었습니다.`);
  }catch(e){ $('#fileErr').textContent = e.message || '파일을 읽지 못했습니다.'; }
}
$('#file').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) readFile(f); e.target.value=''; });
const drop=$('#drop');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('over'); }));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e=>{ const f=e.dataTransfer.files[0]; if(f) readFile(f); });

// ===================== 준비할 날짜 (2026-11-18): 맨 위 · 기본 = 내일 · 엑셀의 방문일이 다르면 팝업 =====================
const tomorrowYmd = () => { const d=new Date(); d.setDate(d.getDate()+1); return SY.ymd(d); };
let prepDate = tomorrowYmd(), dateAuto = true;   // 준비할 날짜 = 늘 내일 (직접 다른 날을 고르기 전까지, 자정이 지나면 저절로 다음 날, 2026-11-19)
function paintPrepDate(){ $('#prepDateTxt').value = SY.dateDisp(prepDate); $('#prepDate').value = prepDate;
  const h=$('#prepDateHint'), mis = state && state.date && state.date!==prepDate;
  h.className = mis ? 'bad' : ''; h.textContent = mis ? `읽어 둔 엑셀은 ${dLab(state.date)} 것입니다 — 파일을 바꿔 주세요` : prepDate===tomorrowYmd() ? '내일 · 이 날짜의 방문자내역 엑셀을 넣으세요' : '이 날짜의 방문자내역 엑셀을 넣으세요'; }
function showDateModal(html){ $('#dmMsg').innerHTML=html; $('#dateModal').hidden=false; setTimeout(()=>$('#dmPick').focus(), 0); }
$('#dmClose').onclick=()=>{ $('#dateModal').hidden=true; };
$('#dmPick').onclick=()=>{ $('#dateModal').hidden=true; $('#file').click(); };
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#dateModal').hidden) $('#dateModal').hidden=true; });
// 날짜 칸: 누르면 달력, 달력이 열린 뒤 한 번 더 누르면 직접 입력 (다른 화면의 방문일 칸과 같음)
{ const t=$('#prepDateTxt'), p=$('#prepDate'); let pickAt=0;
  t.addEventListener('click', ()=>{ if(!t.readOnly) return; if(Date.now()-pickAt<20000){ t.readOnly=false; t.select(); pickAt=0; return; } pickAt=Date.now(); try{ p.showPicker(); }catch(_){ p.focus(); } });
  const setD = async v => { if(!v || v===prepDate) { paintPrepDate(); return; } dateAuto = v===tomorrowYmd(); await switchDate(v); };   // 달력에서 날짜를 고르면 그날 마지막으로 저장된 기록   // 날짜를 바꾸면 하던 것은 저장, 새 날짜는 빈 화면 (팀이 준비해 둔 것이 있으면 그것, 2026-11-19)
  p.addEventListener('change', ()=>setD(p.value));
  t.addEventListener('blur', ()=>{ if(t.readOnly) return; t.readOnly=true; const v=SY.parseDateText(t.value); if(v) setD(v); else paintPrepDate(); });
  t.addEventListener('keydown', e=>{ if(e.key==='Enter') t.blur(); }); }

// ===================== 상태 (이 브라우저에만 · 새로고침해도 그대로) =====================
const STATE_LS='sayuwon_prep_state';
let state = (()=>{ try{ return JSON.parse(localStorage.getItem(STATE_LS)||'null'); }catch(_){ return null; } })();
const saveState = () => { try{ localStorage.setItem(STATE_LS, JSON.stringify(state)); }catch(_){} sharePush(); };
// ===================== 팀 공유 (2026-11-19): 준비할 날짜마다 공유 기록 한 줄 (id prepYYYYMMDD · 통화 구분 「응대준비」) =====================
// 엑셀 · 고른 줄 · 연결 · 표에서 고친 것 · 연락 체크를 모두 → 누가 열어도 같은 내용. 고칠 때마다 1.5초 뒤 올리고, 30초마다 남이 고친 것을 받아 옴 (마지막에 저장한 것이 이김)
const PREP_ID = d => 'prep'+String(d||'').replace(/\D/g,'');
let pushT=null, lastLocalEdit=0, pushing=false;
const shareSt = (txt, cls) => { const el=$('#shareSt'); if(el){ el.textContent=txt; el.className='share-st '+(cls||''); } };
// 시트 칸 하나는 5만 자까지 → 엑셀 줄을 짧게 (상품 이름은 한 번만 적고 번호로) 2026-11-19
function packState(st){ const P=[], pi=p=>{ let i=P.indexOf(p); if(i<0){ i=P.length; P.push(p); } return i; };
  const R=st.rows.map(x=>[x.id, x.kind||'', x.name||'', x.phone||'', x.items.map(i=>[pi(i.p), i.n]), x.ppl||0, x.pay||'', x.note||'']);
  const o={...st, rows:undefined, pk:2, P, R}; delete o.rows; return o; }
function unpackState(o){ if(!o || o.pk!==2) return o; const st={...o}; delete st.pk; delete st.P; delete st.R;
  st.rows=(o.R||[]).map(a=>({id:a[0], kind:a[1], date:o.date, name:a[2], phone:a[3], items:(a[4]||[]).map(([i,n])=>({p:o.P[i], n})), ppl:a[5], pay:a[6], note:a[7]})); return st; }
function sharePush(){ if(!state || !getKey()) return; lastLocalEdit=Date.now(); clearTimeout(pushT); shareSt('팀에 올리는 중…', 'wait'); pushT=setTimeout(pushNow, 1500); }
async function pushNow(){
  if(!state || !getKey()) return false; while(pushing) await new Promise(ok=>setTimeout(ok, 200)); clearTimeout(pushT); pushT=null;
  pushing=true; const at=new Date().toISOString(), by=user.name||'';
  const st={...state, at, by}, body=JSON.stringify(packState(st));
  if(body.length>48000){ shareSt('너무 커서 팀에 못 올림 (이 PC에만 저장)', 'bad'); pushing=false; return false; }
  try{ await callApi({action:'put', item:{id:PREP_ID(state.date), callType:'응대준비', saved:at, takenBy:by, owner:by, summary:`다음날 고객 응대 준비 ${state.date} · ${state.rows.length}건 · ${by}`.slice(0,120), history:body}});
    state.at=at; state.by=by; try{ localStorage.setItem(STATE_LS, JSON.stringify(state)); }catch(_){} histAdd(state.date, at);
    shareSt(`팀과 공유됨 · 최종 편집 ${editLab(at)}`, 'ok'); return true; }
  catch(e){ shareSt('팀에 못 올림 — 잠시 뒤 다시 올립니다', 'bad'); pushT=setTimeout(pushNow, 15000); return false; }
  finally{ pushing=false; }
}
// 공유된 것 받아 오기: 이 날짜의 공유 기록이 지금 화면 것보다 새로우면 바꿈 (방금 고치는 중이면 기다림)
async function pullShared(force){
  if(!getKey()) return false;
  const d=prepDate; let j; try{ j=await SY.list(); }catch(_){ return false; }
  noticeFrom(j.items); agencyFrom(j.items); paintHist(j.items);   // 안내 명단 상품 · 지난 기록 목록도
  const r=(j.items||[]).find(x=>x.id===PREP_ID(d)); if(!r){ if(state && state.date===d && (state.rows||[]).length && !state.at) sharePush(); return false; }   // 이 PC에만 있던 그날 내용은 팀에 올림 (지난 기록에도 나오게)
  let st=null; try{ st=unpackState(JSON.parse(r.history||'null')); }catch(_){} if(!st || !Array.isArray(st.rows)) return false;
  const mine = state && state.date===d ? String(state.at||'') : '';
  if(!force && mine && String(st.at||'')<=mine) return false;
  if(!force && (Date.now()-lastLocalEdit<8000 || pushing)) return false;   // 고치는 중
  if(document.activeElement && document.activeElement.closest && document.activeElement.closest('#outBody, #listBody') && !force) return false;
  const was = state && state.date===d && state.at;
  state=st; try{ localStorage.setItem(STATE_LS, JSON.stringify(state)); }catch(_){}
  build(false); paintPrepDate(); if(st.at) histAdd(d, st.at); shareSt(`팀과 공유됨 · 최종 편집 ${editLab(st.at)}`, 'ok');
  if(was && st.by && st.by!==(user.name||'')) toast(`다른 곳에서 고친 내용을 받아 왔습니다 (최종 편집 ${editLab(st.at)}).`);
  return true;
}
setInterval(()=>{ if(!document.hidden) pullShared(); }, 30000);
// 지난 기록 (2026-11-19): 팀이 준비해 둔 날짜(공유 기록 prepYYYYMMDD)를 골라 그날 내용 보기 · 고치기 — 늘 보이게 (없으면 「없음」)
let histItems=[];
function paintHist(items){ if(items) histItems=items.filter(x=>x.callType==='응대준비' && /^prep\d{8}$/.test(x.id||'')).map(x=>({id:x.id, at:x.saved||''}));
  const sel=$('#histSel'); if(!sel) return;
  const ds=histItems.map(x=>{ const d=x.id.slice(4); return {d:`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6)}`, at:x.at}; }).sort((a,b)=>b.d.localeCompare(a.d));
  sel.innerHTML = `<option value="">지난 기록 (${ds.length})</option>` + (ds.length ? ds.map(o=>`<option value="${esc(o.d)}"${o.d===prepDate?' selected':''}>${esc(dLab(o.d))}${o.at?` · 최종 편집 ${esc(editLab(o.at))}`:''}</option>`).join('') : '<option value="" disabled>아직 팀에 저장된 날이 없습니다</option>');
  sel.hidden = false; }
const histAdd = (d, at) => { const id=PREP_ID(d); const x=histItems.find(h=>h.id===id); if(x) x.at=at; else histItems.push({id, at}); paintHist(); };
const editLab = iso => { const x=new Date(iso||''); return isNaN(x) ? '' : `${x.getMonth()+1}/${x.getDate()}(${DOW[x.getDay()]}) ${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`; };   // 최종 편집 시각 (여러 명이 함께 고치므로 이름 대신, 2026-11-19)
// 준비할 날짜를 바꾸면 (2026-11-19): 하던 날짜는 팀에 저장(이 PC에도 날짜별 사본) → 새 날짜는 팀이 준비해 둔 것이 있으면 그것, 없으면 완전히 빈 화면
const BAK_LS = d => 'sayuwon_prep_bak_'+String(d||'').replace(/\D/g,'');
async function switchDate(v){ if(!v) return false;
  if(state && state.date!==v){ try{ localStorage.setItem(BAK_LS(state.date), JSON.stringify(state)); }catch(_){}
    const done = getKey() ? await pushNow() : false; if(getKey() && !done) toast(`${dLab(state.date)} 내용을 팀에 못 올렸습니다 (이 PC에는 저장해 두었습니다).`); }
  prepDate=v; paintPrepDate(); paintHist();
  if(state && state.date===v) return true;
  if(await pullShared(true)) return true;
  let bak=null; try{ bak=JSON.parse(localStorage.getItem(BAK_LS(v))||'null'); }catch(_){}
  if(bak && bak.date===v && Array.isArray(bak.rows)){ state=bak; try{ localStorage.setItem(STATE_LS, JSON.stringify(state)); }catch(_){} build(false); paintPrepDate(); return true; }   // 팀에 없으면 이 PC 사본
  state=null; rows=[]; try{ localStorage.removeItem(STATE_LS); }catch(_){} render(); shareSt('이 날짜는 저장된 기록이 없습니다', ''); return false; }
$('#histSel')?.addEventListener('change', async e=>{ const v=e.target.value; if(!v || v===prepDate && state && state.date===v) return; const ok=await switchDate(v); toast(ok ? `${dLab(v)} 기록을 불러왔습니다.` : '그날 기록을 불러오지 못했습니다.'); });
const keepTomorrow = () => { if(dateAuto && prepDate!==tomorrowYmd()) switchDate(tomorrowYmd()); };   // 켜 둔 채 날짜가 바뀌면 내일로
window.addEventListener('focus', ()=>{ keepTomorrow(); pullShared(); });
setInterval(keepTomorrow, 60000);

// ===================== ② · ③ 목록 만들기 + 단체예약 연결 =====================
const dayGroups = () => state ? groups.filter(r=>String(r.date||'').slice(0,10)===state.date) : [];
const recPhones = r => String(r.phone||'').split(/\s*\/\s*/).map(digits).filter(p=>p.length>=9);
const recNames = r => [r.org, ...String(r.contact||'').split(/\s*\/\s*/)].map(norm).filter(Boolean);
function autoLink(x, dg, used){
  const ph=digits(x.phone), nm=norm(x.name.replace(/\(.*?\)/g,'')), pn=norm((x.name.match(/\((.+?)\)/)||[])[1]||'');
  const cands=dg.filter(r=>!used.has(r.id));
  return (ph.length>=9 && cands.find(r=>recPhones(r).includes(ph))) || cands.find(r=>recNames(r).some(n=>n && (n===nm || (pn && (n.includes(pn)||pn.includes(n)))))) || null;
}
const shortProd = p => { const m=p.match(/\(관람,\s*(.+)\)/); if(m) return m[1].replace(/^사담\s*/,'').replace(/^몽몽마방\s*/,'').replace(/\s/g,''); const t=p.match(/관람\((\d\d):00~18:00\)/); return t ? (t[1]==='13'?'오후 관람':'관람') : p; };
const isGroupName = s => /^[^()]+\(\s*(?!개인|대리)[가-힣A-Za-z ]{2,12}\s*\)\s*$/.test(String(s||'').trim());   // 「산청군청(고영현)」 = 단체명(담당자) → 단체 (2026-11-19)
const fmtT = v => { const m=String(v||'').match(/(\d{1,2})\s*:?\s*(\d{2})/); return m ? `${String(+m[1]).padStart(2,'0')}:${m[2]}` : ''; };
const toMin = t => { const m=fmtT(t).match(/(\d\d):(\d\d)/); return m ? +m[1]*60 + +m[2] : null; };
// 차량 (2026-11-19): 버스 · 승용 대수를 따로. 단체예약 값 「버스 2대」 · 「승용 3대」 · 「혼합 (버스 1대 + 승용 2대)」 · 「미정」 ↔ {bus:'2', car:''}
function vehSplit(v){ const s=String(v||''); if(!s || /^미정/.test(s)) return {bus:'', car:''};
  const b=(s.match(/버스\D*?(\d+)/)||[])[1]||'', c=(s.match(/(?:승용|자차|개별|승합)\D*?(\d+)/)||[])[1]||'';
  if(!b && !c && /^\d+$/.test(s.trim())) return {bus:s.trim(), car:''};   // 예전 표의 「2」 = 버스 2대
  return {bus:b, car:c}; }
const vehJoinG = (bus, car) => bus && car ? `혼합 (버스 ${bus}대 + 승용 ${car}대)` : bus ? `버스 ${bus}대` : car ? `승용 ${car}대` : '미정';   // 단체예약에 넣는 모양
const vehLabel = (bus, car) => [bus && `버스${bus}`, car && `승용${car}`].filter(Boolean).join(' · ') || '미정';   // 이미지 · 엑셀
const MEAL_COLS = [['sadam1','런치1부'],['sadam2','런치2부'],['sadamD','디너'],['mabangL','마방 식사']];
const PROG_COLS = [['chabang','몽몽차방 대관'],['dangdu','당두봉갈 대관'],['donghaeng','동행 도슨트'],['yoga','요가'],['gaga','음료쿠폰(가가빈빈)'],['teaMed','티하우스 명상'],['gayageum','가야금'],['cabin','유루 캐빈']];
function recNote(r){
  const memo=String(r.memo||''), parts=[];
  MEAL_COLS.forEach(([k,l])=>{ if(r[k]) parts.push(k==='mabangL' && r.mabangTime ? `${l} ${r.mabangTime}` : l); });   // 식사 (사담 · 마방)
  PROG_COLS.forEach(([k,l])=>{ if(r[k]) parts.push(`${l} ${r[k]}`); });
  const xp=memo.match(/추가 프로그램\s+([^/]+)/); if(xp) parts.push(xp[1].trim());
  if(/현장/.test(r.pay||'')) parts.push('현장결제');
  const note=String(r.note||'').split(/\n/)[0].trim(); if(note) parts.push(note.slice(0,40));
  return parts.join(' / ');
}
let rows=[];   // 결과 줄
function build(fresh){
  if(!state) return;
  const min=+$('#minPpl').value||10, dg=dayGroups(), used=new Set();
  // 연결: 직접 고른 것 먼저, 그다음 자동
  Object.values(state.link).forEach(id=>{ if(id && id!=='none') used.add(id); });
  const base = state.rows.map(x=>{ let rec=null; const l=state.link[x.id]; if(l==='none') rec=null; else if(l) rec=dg.find(r=>r.id===l)||null; else { rec=autoLink(x, dg, used); if(rec) used.add(rec.id); } return {x, rec}; });
  base.forEach(o=>{ o.ag=agencyOf(o.x); });   // 여행사 등록 목록을 먼저 (2026-11-19)
  const list = base.filter(o=>o.rec || o.ag || o.x.ppl>=min);
  dg.filter(r=>!used.has(r.id) && !base.some(o=>o.rec===r)).forEach(r=>list.push({x:null, rec:r}));   // 전산 명단에 없는 단체예약도
  if(fresh) list.forEach(o=>{ const k=o.x?o.x.id:'r'+o.rec.id; if(state.sel[k]==null) state.sel[k]=true; });
  rows = list.map(o=>{ const k=o.x?o.x.id:'r'+o.rec.id, r=o.rec, x=o.x, ag=o.ag||null, v=vehSplit(r&&r.vehicle), e=state.edit[k]||{};
    if(e.vehicle!=null && e.bus==null && e.car==null){ const o2=vehSplit(e.vehicle); e.bus=o2.bus; e.car=o2.car; delete e.vehicle; }   // 예전에 한 칸으로 고친 차량
    const prods=x ? x.items.filter(i=>i.n>0 || x.items.length===1).map(i=>shortProd(i.p)) : [];
    const pmT = x && x.items.some(i=>/13:00~18:00/.test(i.p)) && !x.items.some(i=>/09:00~18:00|\(관람,/.test(i.p)) ? '13:00 이후' : '';
    // 처음 값(엑셀 · 단체예약) — 표에서 고친 값(state.edit)과 비교해 「수정 내용 저장」에 씀 (2026-11-19)
    const agV = ag && !r ? {bus:String(ag.bus||'').replace(/\D/g,''), car:String(ag.car||'').replace(/\D/g,'')} : {bus:'', car:''};   // 여행사 등록의 차량 (단체예약 기록이 없을 때 · 2026-11-20)
    const orig = { name: r ? (r.org||r.contact||'(업체 미정)') : x.name, ppl: x ? x.ppl : (parseInt(r.people)||0),   // 개인도 성명 그대로 (「(개인)」 안 붙임, 2026-11-20)
      time: fmtT(r&&r.tin) || (ag ? fmtT(ag.time) : '') || '', bus: v.bus || (!v.car ? agV.bus : ''), car: v.car || (!v.bus ? agV.car : ''),   // 여행사는 등록한 도착시간 · 차량이 기본 (비워 두면 없음) phone: x&&x.phone || String(r&&r.phone||'').split(/\s*\/\s*/)[0] || '',
      note: x && x.note && x.note!=='-' ? x.note : '',
      gate: (()=>{ const rg=r ? (memoVal(r,'입장문')||r.gate||'') : ''; return /^(치허문|곡신문)$/.test(rg) ? rg : (ag && ag.gate) || ''; })() };   // 여행사는 등록한 입장문이 기본   // 비고 = 전산 방문자내역 엑셀의 비고 그대로 (2026-11-19 · 상품 · 단체예약 내용을 만들어 붙이지 않음)
    return { key:k, recId: r ? r.id : '', on: state.sel[k]!==false, group: !!r || !!ag || isGroupName(x&&x.name), inList: !!r, agency: ag ? ag.name : '', agMemo: ag ? (ag.memo||'') : '', orig,
      name: e.name ?? orig.name, xname:x?x.name:'', ppl: e.ppl!=null && e.ppl!=='' ? (parseInt(e.ppl)||0) : orig.ppl,
      time: e.time ?? orig.time, timeHint: pmT, bus: e.bus ?? orig.bus, car: e.car ?? orig.car,
      get vehicle(){ return vehLabel(this.bus, this.car); },
      phone: e.phone ?? orig.phone,
      xnote: orig.note, note: e.note ?? '',   // xnote = 엑셀 비고 원문 · note = 표 · 이미지 비고 (간소화, render 에서 채움)
      onsitePay: /현장/.test((r&&r.pay)||''),   // 현장결제건 (단체예약 결제 방법)
      gate: e.gate ?? orig.gate, /* 입장문: 추천 없음 (2026-11-19) — 단체예약에서 정해 둔 문이 있으면 그 문, 없으면 빈칸 → 관리하는 사람이 고름 */ missing: !x, stage: r ? (r.callType||'') : '', prods: x ? x.items.map(i=>`${i.p} ${i.n}명`).join('\n') : '', pay: (x&&x.pay)||'' };
  });
  render();
}
// ===================== ④ 표에서 고친 것 → 저장 (2026-11-19) =====================
// 고친 칸(노란 표시) = 처음 값(엑셀 · 단체예약)과 다르고 아직 저장하지 않은 것. 「수정 내용 저장」 (2026-11-19 다시):
//  ① 단체예약과 연결된 줄은 고친 칸만이 아니라 표에 적힌 내용 그대로(업체명 · 관람 인원 · 입장시각 · 차량 · 연락처 · 입장문) 단체예약에 올림 — 빈칸은 지우지 않음
//  ② 전산에 등록한 예약이 바뀌면 그 단체예약의 추후 과업 「전산 예약 수정」 (나의 할일 기타 업무 「전산내용 재반영」은 없앰)
const FIELD_LABEL = { name:'이름', ppl:'인원', time:'도착시간', gate:'입장문', bus:'버스', car:'승용', phone:'연락처', note:'비고' };
function rowChanges(r){
  const e=state.edit[r.key]||{}, sv=(state.saved||{})[r.key]||{}, out=[];
  ['name','ppl','time','gate','bus','car','phone','note'].forEach(f=>{ if(e[f]==null) return; const to=f==='ppl' ? String(r.ppl) : String(e[f]).trim(), from=String(r.orig[f]??'').trim();
    if(to!==from && sv[f]!==to) out.push({f, from, to}); });  return out;
}
const memoSet = (memo, label, val) => { const p=String(memo||'').split(' / ').map(s=>s.trim()).filter(s=>s && !s.startsWith(label+' ')); if(val) p.push(`${label} ${val}`); return p.join(' / '); };
// 인원을 고치면 단체예약 예약 내역의 시간대 관람권 줄(비고 칸 「관람 품목 … x30」)도 맞춤 — 견적서 · 전산 예약 수정이 바뀐 인원으로 (2026-11-19 · group.js fitViewToPeople 과 같은 기준)
function fitViewMemo(it){
  const n=parseInt(it.people)||0, vs=memoVal(it,'관람 품목'); if(!n || !vs || /haeorum|해오름/.test(String(it.memo||''))) return;
  const list=vs.split(/\s*·\s*/).map(s=>s.match(/^(.+) x(\d+)$/)).filter(Boolean).map(m=>({src:m[1].trim(), qty:+m[2]}));
  const i=list.findIndex(x=>/관람\((09|13):00~18:00\)/.test(x.src)); if(i<0) return;
  const cnt=v=>v?(parseInt(v)||n):0, area=cnt(it.sadam1)+cnt(it.sadam2)+cnt(it.sadamD)+list.reduce((s,x)=>s+x.qty,0), q=list[i].qty+(n-area); if(q<=0 || q===list[i].qty) return;
  list[i].qty=q; it.memo=memoSet(it.memo, '관람 품목', list.filter(x=>x.qty>0).map(x=>`${x.src} x${x.qty}`).join(' · '));
}
const short = s => { s=String(s||''); return s.length>40 ? s.slice(0,40)+'…' : s; };
// 저장은 「수정 내용 저장」 버튼으로만 (2026-11-19 · 자동 저장 없앰). 고친 것이 있으면 버튼에 노란 ● · 버튼 옆에 「저장 안 한 수정 n건」
//  저장 결과는 버튼 옆 글자로 (저장 중 · 저장됨 시각 · 저장 못 함 + 이유). 새 탭은 안 띄움 (「자세히」 버튼으로)
let autoT=null, saving=false, saveAgain=false;
const hasEdits = () => !!state && rows.some(r=>rowChanges(r).length);
const saveSt = (txt, cls) => { const el=$('#saveSt'); if(el){ el.textContent=txt; el.className='save-st '+(cls||''); } };
function scheduleAuto(){ const n=state ? rows.reduce((a,r)=>a+rowChanges(r).length,0) : 0; if(n) saveSt(`저장 안 한 수정 ${n}건 — 「수정 내용 저장」을 눌러 주세요`, 'wait'); else if(/저장 안 한/.test(($('#saveSt')||{}).textContent||'')) saveSt('', ''); }   // 이름은 그대로 (예전 자동 저장 자리) · 지금은 알림만
window.addEventListener('beforeunload', e=>{ if(hasEdits()){ e.preventDefault(); e.returnValue=''; } });
// 단체예약 칸 이름 (단체고객 전화응대 화면에서 표시할 칸)
const GROUP_KEY = { name:'org', ppl:'people', time:'tin', bus:'vehicle', car:'vehicle', phone:'phone', gate:'gate' };
async function saveEdits(auto){
  if(!state) return;
  if(saving){ saveAgain=true; return; }   // 저장 중이면 끝난 뒤 한 번 더
  clearTimeout(autoT);
  // 2026-11-19 다시: 고친 칸만이 아니라, 표(③ 응대 표)에 적힌 내용 그대로 연결된 단체예약에 올림 (빠지는 것 없게). 다른 칸이면 바꾸고, 같으면 그대로
  const todo=rows.map(r=>({r, ch:rowChanges(r)})), linked=rows.filter(r=>r.on && r.recId);
  if(!linked.length && !todo.some(o=>o.ch.length)){ if(!auto) toast('저장할 내용이 없습니다 (단체예약과 연결된 줄이 없습니다).'); return; }
  if(!getKey()){ $('#keyBox').hidden=false; saveSt('저장 못 함: 팀 비밀번호가 없습니다', 'bad'); toast('저장하려면 팀 비밀번호를 먼저 넣어 주세요.'); return; }
  saving=true; saveSt('저장 중…', 'wait'); const btn=$('#saveEdits'); btn.disabled=true; const now=new Date().toISOString(), me=user.name||'', today=SY.ymd(new Date());
  let nGroup=0, nFix=0;
  const G_LABEL = { org:'업체명', people:'관람 인원', tin:'입장시각', vehicle:'차량', phone:'연락처', gate:'입장문', views:'관람 품목' };
  try{
    const latest = linked.length ? ((await SY.list({fresh:true})).items||[]) : [];   // 저장하는 순간의 최신 단체예약 위에
    const failed=[], want={};
    for(const r of linked){
      const rec = latest.find(g=>g.id===r.recId) || groups.find(g=>g.id===r.recId); if(!rec){ failed.push(r.name+' (단체예약을 못 찾음)'); continue; }
      const it={...rec}; delete it._localAt; delete it._pending;
      // 표의 값 → 단체예약 칸 (빈칸이면 그 칸은 그대로 · 지우지 않음)
      if(String(r.name||'').trim()) it.org=String(r.name).trim();
      if(+r.ppl>0 && String(parseInt(rec.people)||0)!==String(+r.ppl)){ it.people=String(+r.ppl); fitViewMemo(it); }
      if(fmtT(r.time)) it.tin=fmtT(r.time);
      if(r.bus || r.car) it.vehicle=vehJoinG(r.bus, r.car);
      if(String(r.phone||'').trim()){ const p=String(rec.phone||'').split(/\s*\/\s*/); p[0]=String(r.phone).trim(); it.phone=p.filter((x,i)=>x || i===0).join(' / '); }
      if(memoVal(rec,'입장문')!==(r.gate||'') && (r.gate || memoVal(rec,'입장문'))) it.memo=memoSet(it.memo, '입장문', r.gate||'');
      // 바뀐 칸 (단체 화면 수정 기록과 같은 모양: 칸마다 [전, 후])
      const chg={}; ['org','people','tin','vehicle','phone'].forEach(k=>{ if(String(rec[k]||'')!==String(it[k]||'')) chg[k]=[String(rec[k]||''), String(it[k]||'')]; });
      { const gO=memoVal(rec,'입장문'), gN=memoVal(it,'입장문'); if(gO!==gN) chg.gate=[gO, gN]; const vO=memoVal(rec,'관람 품목'), vN=memoVal(it,'관람 품목'); if(vO!==vN) chg.views=[vO, vN]; }
      want[r.recId]={org:it.org, people:it.people, tin:it.tin, vehicle:it.vehicle, phone:it.phone, gate:memoVal(it,'입장문')};
      if(!Object.keys(chg).length) continue;   // 이미 같음
      const lines=Object.entries(chg).map(([k,[a,b]])=>k==='views' ? '관람 품목 · 인원이 바뀜' : !a ? `${G_LABEL[k]} ${b} 입력` : !b ? `${G_LABEL[k]} ${a} 지움` : `${G_LABEL[k]} ${a} → ${b}`);
      let h={}; try{ const j=JSON.parse(rec.history||'{}'); h = Array.isArray(j) ? {h:j} : (j||{}); }catch(_){}
      h.h=[...(h.h||[]), {t:now, by:me, what:`[다음날 고객 응대 준비] ${lines.join(', ')}`, ch:chg}];
      // 전산에 등록한 예약이면 그 예약의 추후 과업 「전산 예약 수정」 (단체 화면과 같은 과업 · 열면 단체 화면이 전산에 올린 때와 비교해 다시 맞춤)
      if(chg.people){ const ts=Array.isArray(h.tasks) ? h.tasks : []; let pt=ts.find(t=>t.id==='pplchk');   // 관람 인원이 바뀌면 그 예약의 추후 과업 「예약 내역&전산 내역 확인」 (2026-11-19)
        if(!pt){ pt={id:'pplchk', title:'전날 확인 변경 → 예약내역&전산 확인', custom:true, done:false, at:now, due:today, pplFrom:chg.people[0]}; ts.push(pt); }
        else if(pt.done){ pt.done=false; pt.doneAt=''; pt.at=now; pt.due=today; delete pt.dueSet; pt.pplFrom=chg.people[0]; pt.changes=[]; }
        if(!pt.titleSet) pt.title='전날 확인 변경 → 예약내역&전산 확인';   // 과업 이름 (2026-11-21)
        pt.pplTo=chg.people[1]; pt.changes=[...new Set([...(pt.changes||[]), ...lines.map(l=>`${l} (다음날 고객 응대 준비)`)])]; h.tasks=ts; }   // 무엇이 바뀌었는지 과업 아래에 (2026-11-21)
      if(memoVal(rec,'전산 등록') || /^adm/.test(rec.id||'')){
        const ts=Array.isArray(h.tasks) ? h.tasks : []; let fx=ts.find(t=>t.id==='erpfix');
        if(!fx){ fx={id:'erpfix', title:'전산 예약 수정', done:false, at:now, due:today}; ts.push(fx); }
        else if(fx.done || fx.removed){ fx.done=false; delete fx.removed; delete fx.autoDone; fx.doneAt=''; fx.at=now; fx.due=today; delete fx.dueSet; }
        fx.changes=[...new Set([...(fx.changes||[]).filter(c=>!/^전산 비고/.test(c)), ...lines])]; fx.v=4; h.tasks=ts; nFix++;
      }
      it.history=JSON.stringify(h); it.saved=now;
      await callApi({action:'put', item:it}); nGroup++;
      const gi=groups.findIndex(g=>g.id===it.id); if(gi>=0) groups[gi]=it; else groups.push(it);
    }
    // 저장 확인: 다시 받아서 표의 값이 정말 들어갔는지
    if(nGroup){ const chk=((await SY.list({fresh:true})).items||[]);
      Object.entries(want).forEach(([id,w])=>{ const g=chk.find(x=>x.id===id); if(!g) return; const bad=['org','people','tin','vehicle','phone'].filter(k=>String(g[k]||'')!==String(w[k]||'')); if(memoVal(g,'입장문')!==(w.gate||'')) bad.push('gate');
        if(bad.length) failed.push(`${(linked.find(r=>r.recId===id)||{}).name||id} (${bad.map(k=>G_LABEL[k]).join(' · ')})`); });
      groups = chk.filter(isConfirmed).length ? chk.filter(isConfirmed) : groups; }
    if(failed.length) throw Object.assign(new Error('단체예약에 반영되지 않음: '+failed.join(', ')), {code:'단체예약에 반영되지 않음: '+failed.join(', ')});
    // 저장한 값 기억 (노란 표시 없앰). 전산 예약 수정은 단체예약의 추후 과업으로 (나의 할일 「전산내용 재반영」 업무는 없앰, 2026-11-19)
    state.saved ||= {}; todo.forEach(({r,ch})=>{ const s=(state.saved[r.key] ||= {}); ch.forEach(c=>{ s[c.f]=c.to; }); });
    saveState(); build(false);
    const msg = nGroup ? `단체예약 ${nGroup}건 반영${nFix?` · 전산 예약 수정 과업 ${nFix}건`:''}` : '단체예약은 이미 표와 같음';
    saveSt(`저장됨 ${new Date().toTimeString().slice(0,5)} · ${msg}`, 'ok');
    toast(`저장했습니다. ${msg}.`);
  }catch(e){ const why = e.code==='bad_key' ? '팀 비밀번호가 맞지 않습니다' : (e.code || e.message || '연결 오류');
    saveSt(`저장 못 함: ${why}${nGroup?` (단체예약 ${nGroup}건까지는 반영)`:''} — 다시 눌러 주세요`, 'bad');
    toast(e.code==='bad_key' ? '팀 비밀번호가 맞지 않습니다.' : `저장하지 못했습니다 (${why})${nGroup?` · 단체예약 ${nGroup}건까지는 반영됨`:''}. 「수정 내용 저장」을 다시 눌러 주세요.`); }
  finally{ btn.disabled=false; saving=false; if(saveAgain){ saveAgain=false; } }
}
// 「수정 내용 저장」 (새 탭은 띄우지 않음, 2026-11-19)
function onSaveClick(){ if(!state || saving) return; saveEdits(false); }
// 「자세히」: 목록에서 가져온 단체(단체예약 연결) → 다음 탭에 그 예약 (단체고객 전화응대)
document.addEventListener('click', e=>{ const b=e.target.closest?.('[data-open-rec]'); if(!b) return; e.preventDefault(); window.open(`group.html?open=${encodeURIComponent(b.dataset.openRec)}`, '_blank'); });
// ===================== 여행사 등록 (2026-11-19): 아너드처럼 늘 단체로 들어가는 업체 =====================
// ② 「여행사 등록」 → 단체명 · 입장문 · 메모 목록 (팀 공유: 공유 기록 id prepagency). 엑셀을 읽으면 이 목록을 먼저 보고,
// 성명에 등록한 단체명이 들어 있으면 인원과 상관없이 티켓 발권 대상의 단체로 (입장문 기본값 · 메모는 비고에)
const AGENCY_ID='prepagency', AGENCY_LS='sayuwon_prep_agency';
let agencies = (()=>{ try{ return JSON.parse(localStorage.getItem(AGENCY_LS)||'[]')||[]; }catch(_){ return []; } })();
const agencyOf = x => { if(!x) return null; const nm=norm(x.name); return agencies.find(a=>a.name && nm.includes(norm(a.name))) || null; };
function agencyFrom(items){ const r=(items||[]).find(x=>x.id===AGENCY_ID); if(!r) return; try{ const j=JSON.parse(r.history||'{}'); if(Array.isArray(j.list)){ const was=JSON.stringify(agencies); agencies=j.list; try{ localStorage.setItem(AGENCY_LS, JSON.stringify(agencies)); }catch(_){} if(was!==JSON.stringify(agencies) && state) build(false); } }catch(_){} }
let agEdit=[];
function paintAg(){ $('#agBody').innerHTML = agEdit.map((a,i)=>`<tr><td><input data-ag="${i}|name" data-ime="ko" value="${esc(a.name||'')}" placeholder="단체명"></td>`
  + `<td><select data-ag="${i}|gate"><option value=""${a.gate?'':' selected'}>미정</option><option${a.gate==='치허문'?' selected':''}>치허문</option><option${a.gate==='곡신문'?' selected':''}>곡신문</option></select></td>`
  + `<td><input data-ag="${i}|time" value="${esc(a.time||'')}" placeholder="--:--" inputmode="numeric" title="도착시간 (비워 두면 없음)"></td>`
  + `<td class="ag-veh"><label>버스<input data-ag="${i}|bus" value="${esc(a.bus||'')}" inputmode="numeric" placeholder="-">대</label><label>승용<input data-ag="${i}|car" value="${esc(a.car||'')}" inputmode="numeric" placeholder="-">대</label></td>`
  + `<td><input data-ag="${i}|memo" data-ime="ko" value="${esc(a.memo||'')}" placeholder="메모"></td><td><button type="button" class="btn sm" data-agdel="${i}" title="빼기">×</button></td></tr>`).join('')
  || '<tr><td colspan="6" class="hint">등록한 여행사가 없습니다. 「＋ 추가」를 눌러 주세요.</td></tr>'; }
$('#agBtn').onclick=()=>{ agEdit=agencies.map(a=>({...a})); if(!agEdit.length) agEdit.push({name:'', gate:'', memo:''}); paintAg(); $('#agModal').hidden=false; setTimeout(()=>$('#agBody input')?.focus(), 0); };
$('#agAdd').onclick=()=>{ agEdit.push({name:'', gate:'', memo:''}); paintAg(); const ins=document.querySelectorAll('#agBody input[data-ag$="|name"]'); ins[ins.length-1]?.focus(); };
$('#agNo').onclick=()=>{ $('#agModal').hidden=true; };
document.addEventListener('input', e=>{ const m=e.target.dataset && e.target.dataset.ag; if(!m) return; const [i,f]=m.split('|'); agEdit[+i][f]=e.target.value; });
document.addEventListener('change', e=>{ const m=e.target.dataset && e.target.dataset.ag; if(!m) return; const [i,f]=m.split('|'); agEdit[+i][f]=e.target.value; });
document.addEventListener('click', e=>{ const d=e.target.closest && e.target.closest('[data-agdel]'); if(d){ agEdit.splice(+d.dataset.agdel,1); paintAg(); } });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#agModal').hidden) $('#agModal').hidden=true; });
$('#agOk').onclick=async()=>{
  const num=v=>{ const n=String(v||'').replace(/\D/g,''); return n && +n ? String(+n) : ''; };   // 차량 대수: 숫자만 · 0은 빈칸
  agencies=agEdit.map(a=>({name:String(a.name||'').trim(), gate:a.gate||'', time:fmtT(a.time), bus:num(a.bus), car:num(a.car), memo:String(a.memo||'').trim()})).filter(a=>a.name);   // 도착시간 · 차량 (2026-11-20, 비워 두면 없음)
  try{ localStorage.setItem(AGENCY_LS, JSON.stringify(agencies)); }catch(_){}
  $('#agModal').hidden=true; if(state) build(false); toast(`여행사 ${agencies.length}곳을 저장했습니다.`);
  if(getKey()) try{ await callApi({action:'put', item:{id:AGENCY_ID, callType:'응대준비설정', saved:new Date().toISOString(), takenBy:user.name||'', owner:user.name||'', summary:`다음날 고객 응대 준비 · 여행사 ${agencies.length}곳`, history:JSON.stringify({list:agencies})}}); }catch(_){ toast('여행사 목록을 팀에 올리지 못했습니다.'); }
};
// ===================== 안내 명단 (2026-11-19): 해오름 산책 · 선셋디너처럼 고객님께 따로 알려야 하는 상품 =====================
// ② 티켓 발권 대상 위에 그날 엑셀의 상품 이름을 모두 띄우고 체크 → 체크한 상품을 예약한 고객을 ③ 표 아래 · 이미지 · 엑셀에 「이름(n명, 전화번호)」
// 기본: 관람만(네이버 포함) · 사담 런치 · 디너 · 몽몽마방 사유의 밥상 · 해오름 산책은 빼고 나머지(관람+식사 중 그 밖 · 선셋 등)는 체크
// 고른 것은 팀 공유(공유 기록 id prepnotice, 모든 날짜 공통) — 한 번 바꾸면 다음 날에도 그대로
const NOTICE_ID='prepnotice', NOTICE_LS='sayuwon_prep_notice';
let noticeSel = (()=>{ try{ return JSON.parse(localStorage.getItem(NOTICE_LS)||'{}')||{}; }catch(_){ return {}; } })();
const noticeDefault = p => { const s=String(p||'');
  if(/네이버/.test(s)) return false;
  if(/^(평일|주말\/공휴일|주말|공휴일)?\s*관람\s*\(/.test(s.replace(/\s/g,' ')) && !/,/.test(s)) return false;   // 관람권만 (9~18 · 13~18 · 학생 등)
  if(/사담\s*(런치|디너)/.test(s) || /몽몽마방\s*사유의\s*밥상/.test(s)) return false;
  if(/해오름/.test(s)) return false;   // 해오름 산책도 기본은 안 나옴 — 고를 때만 (2026-11-19)
  return true; };
const noticeOn = p => noticeSel[p]!=null ? !!noticeSel[p] : noticeDefault(p);
const allProds = () => { const m=new Map(); (state?state.rows:[]).forEach(x=>x.items.forEach(i=>{ if(i.n>0) m.set(i.p, (m.get(i.p)||0)+i.n); })); return [...m.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'ko')); };
// 체크한 상품마다 [상품, 「이름(n명, 전화번호)」 목록]
function noticeLists(){ return allProds().filter(([p])=>noticeOn(p)).map(([p])=>{ const ppl=state.rows.map(x=>{ const n=x.items.filter(i=>i.p===p).reduce((a,i)=>a+i.n,0); return n ? `${x.name}(${n}명${x.phone?', '+x.phone:''})` : ''; }).filter(Boolean);
  return [p, ppl.join(', ') + (/해오름/.test(p) && ppl.length ? ' · 고객 도착 AM 6:00' : '')]; }).filter(([,t])=>t); }
const noticeLabel = p => String(p).replace(/^(평일|주말\/공휴일)\s*/,'').replace(/^\((.*)\)$/,'$1').replace(/^관람,\s*/,'');   // 「평일(관람, 선셋디너)」 → 「선셋디너」
function noticeBoxHTML(){ const ps=allProds().sort((a,b)=>(noticeOn(b[0])-noticeOn(a[0])) || String(a[0]).localeCompare(String(b[0]),'ko')); if(!ps.length) return '';   // 체크한 것이 위 · 명수는 체크한 것만 (2026-11-19)
  return `<div class="notice-box"><b>안내 명단 상품</b> <small class="hint">체크한 상품을 예약한 고객은 위 표 아래 · 이미지 · 엑셀에 「이름(명수, 전화번호)」로 (팀 공유 · 다음 날에도 그대로)</small><div class="nb-list">`
    + ps.map(([p,n])=>`<label class="${noticeOn(p)?'on':''}"><input type="checkbox" data-notice="${esc(p)}"${noticeOn(p)?' checked':''}> ${esc(p)}${noticeOn(p)?` <small>${n}명</small>`:''}</label>`).join('') + `</div></div>`; }
async function noticeSave(){ try{ localStorage.setItem(NOTICE_LS, JSON.stringify(noticeSel)); }catch(_){}
  if(!getKey()) return; try{ await callApi({action:'put', item:{id:NOTICE_ID, callType:'응대준비설정', saved:new Date().toISOString(), takenBy:user.name||'', owner:user.name||'', summary:'다음날 고객 응대 준비 · 안내 명단 상품', history:JSON.stringify({sel:noticeSel})}}); }catch(_){ toast('안내 명단 상품 고른 것을 팀에 올리지 못했습니다.'); } }
function noticeFrom(items){ const r=(items||[]).find(x=>x.id===NOTICE_ID); if(!r) return; try{ const j=JSON.parse(r.history||'{}'); if(j && j.sel){ noticeSel=j.sel; try{ localStorage.setItem(NOTICE_LS, JSON.stringify(noticeSel)); }catch(_){} } }catch(_){} }
document.addEventListener('change', e=>{ const p=e.target.dataset && e.target.dataset.notice; if(p==null) return; noticeSel[p]=e.target.checked; render(); noticeSave(); });
// ===================== 화면 =====================
function render(){
  const s=state; [ '#p2','#p4' ].forEach(id=>$(id).classList.toggle('off', !s)); paintPrepDate();
  $('#noticeBox').innerHTML = s ? noticeBoxHTML() : '';   // 안내 명단 상품 (2026-11-19)
  if(!s){ $('#fileSum').innerHTML=''; $('#listBody').innerHTML=''; $('#outBody').innerHTML=''; $('#outFoot').innerHTML=''; return; }
  const total=s.rows.reduce((a,x)=>a+x.ppl,0), dg=dayGroups();
  $('#fileSum').innerHTML = `<span>파일 <b>${esc(s.file)}</b></span><span>방문일 <b>${esc(dLab(s.date))}</b></span><span>예약 <b>${s.rows.length}</b>건</span><span>방문 인원 <b>${total}</b>명</span><button class="btn" id="clearBtn" type="button">지우기</button>`;
  // ② 목록
  // 연결: 「연결 안 함」 하나 + 그날 단체예약 (2026-11-19 · 자동으로 찾기 · 개인으로를 합침). 처음에는 자동으로 찾아 맞는 단체가 있으면 그것이 골라져 있음
  const linkOpts = (k, curId) => `<select class="link-sel" data-link="${esc(k)}"><option value="none"${s.link[k]==='none' || !curId?' selected':''}>연결 안 함</option>${dg.map(r=>`<option value="${esc(r.id)}"${(s.link[k]||curId)===r.id?' selected':''}>${esc(r.org||r.contact||'(업체 미정)')} · ${esc(r.people||'')}명</option>`).join('')}</select>`;
  $('#listBody').innerHTML = rows.map(r=>`<tr class="${r.on?'':'dim'}"><td><input type="checkbox" data-sel="${esc(r.key)}"${r.on?' checked':''}></td><td>${r.agency?'<span class="tag ag" title="여행사 등록 목록에 있음">여행사</span>':r.group?'<span class="tag grp">단체</span>':'<span class="tag ind">개인</span>'}${r.missing?'<span class="tag warn" title="단체예약에는 있는데 전산 방문자내역에 없음">전산에 없음</span>':''}</td><td>${esc(r.xname||'-')}</td><td>${esc(r.phone)}</td><td class="num">${r.ppl}</td><td style="white-space:pre-line;font-size:12px">${esc(r.prods)}</td><td>${r.missing?esc(r.name):linkOpts(r.key, r.recId)}</td></tr>`).join('')
    || '<tr><td colspan="7" class="hint" style="text-align:center;padding:14px">기준 이상인 예약이 없습니다.</td></tr>';
  const on=rows.filter(r=>r.on);
  $('#p2Sum').textContent = `${on.length}팀 · ${on.reduce((a,r)=>a+r.ppl,0)}명 · 단체예약 ${dg.length}건 중 연결 ${rows.filter(r=>r.inList && !r.missing).length}${rows.some(r=>r.missing)?` · 전산에 없음 ${rows.filter(r=>r.missing).length}`:''}${groups.length?'':' (단체예약을 아직 못 불러옴)'}`;   // ③ 단체예약 정보 넣기는 없애고 여기에 요약 (2026-11-18)
  // ④ 결과 표 (도착 시간 순)
  const list=on.slice().sort((a,b)=>(toMin(a.time)??9999)-(toMin(b.time)??9999));
  rows.forEach(r=>{ const e=state.edit[r.key]||{}; r.orig.note=shortNote(r); r.note = e.note ?? r.orig.note; });   // 비고 = 간소화한 글 (이미지와 같음 · 직접 고치면 고친 글)
  rows.forEach(r=>{ r._chg=new Set(rowChanges(r).map(c=>c.f)); });   // 저장 안 한 수정 칸 (노란 테두리)
  { const n=rows.reduce((a,r)=>a+r._chg.size,0), b=$('#saveEdits'); if(b){ b.title = n ? `저장 안 한 수정 ${n}건 — 눌러서 저장` : '표에 적힌 내용을 연결된 단체예약에 그대로 올림'; b.classList.toggle('dirty', n>0); } }
  const yy=s.date.slice(2).replace(/-/g,'');
  $('#outHead').innerHTML = `${yy}(${DOW[new Date(s.date+'T00:00').getDay()]||''})<br>${total}명+@`;
  $('#outBody').innerHTML = list.map(r=>`<tr class="${r.inList?'':'new'}">`
    + `<td class="called no-print${(state.edit[r.key]||{}).called?' on':''}"><label title="이 고객에게 연락했는지 (이 브라우저에 기억)"><input type="checkbox" data-call="${esc(r.key)}"${(state.edit[r.key]||{}).called?' checked':''}></label></td>`   // 연락 체크 = 맨 앞 열 (2026-11-19)
    + `<td class="name"><div class="nmw"><input class="nm${r._chg.has('name')?' chg':''}" data-e="${esc(r.key)}|name" value="${esc(r.name)}" data-ime="ko">${r.recId?`<button type="button" class="more no-print" data-open-rec="${esc(r.recId)}" title="자세히 — 다음 탭에 이 단체예약 열기 (단체고객 전화응대)" aria-label="자세히"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>`:''}</div></td><td class="num"><input class="pp${r._chg.has('ppl')?' chg':''}" data-e="${esc(r.key)}|ppl" value="${r.ppl}" inputmode="numeric"></td>`
    + `<td><input class="t${r._chg.has('time')?' chg':''}" data-e="${esc(r.key)}|time" value="${esc(r.time)}" placeholder="${esc(r.timeHint||'시간')}"></td>`
    + `<td><select class="gate ${esc(r.gate||'none')}${r._chg.has('gate')?' chg':''}" data-e="${esc(r.key)}|gate"><option value=""${r.gate?'':' selected'}>미정</option><option${r.gate==='치허문'?' selected':''}>치허문</option><option${r.gate==='곡신문'?' selected':''}>곡신문</option></select></td>`   // 입장문: 관리하는 사람이 고름 (추천 없음, 2026-11-19)
    + `<td class="veh${!r.bus && !r.car ? ' tbd' : ''}"><label>버스<input class="vn${r._chg.has('bus')?' chg':''}" data-e="${esc(r.key)}|bus" value="${esc(r.bus)}" inputmode="numeric" placeholder="-">대</label><label>승용<input class="vn${r._chg.has('car')?' chg':''}" data-e="${esc(r.key)}|car" value="${esc(r.car)}" inputmode="numeric" placeholder="-">대</label></td><td><input class="p${r._chg.has('phone')?' chg':''}" data-e="${esc(r.key)}|phone" value="${esc(r.phone)}"></td>`
    + `<td class="note"><textarea class="${r._chg.has('note')?'chg':''}" data-e="${esc(r.key)}|note" rows="1">${esc(r.note)}</textarea></td></tr>`).join('');
  const gSum=list.filter(r=>r.group).reduce((a,r)=>a+r.ppl,0), bus=list.reduce((a,r)=>a+(+r.bus||0),0), ind=total-list.reduce((a,r)=>a+(r.missing?0:r.ppl),0);
  const onsite=list.filter(r=>r.onsitePay || /현장/.test(r.xnote||'')).map(r=>r.name);
  $('#outFoot').innerHTML = `<tr><td class="no-print"></td><td class="g">단체</td><td class="g num">${gSum}</td><td></td><td></td><td class="bus">버스 ${bus}대+</td><td colspan="2" class="ind">개인고객 ${ind}명</td></tr>`
    + `<tr><td class="no-print"></td><td>현장결제건</td><td colspan="6" style="text-align:left">${esc(onsite.join(', ')||'-')}</td></tr>`
    + noticeLists().map(([p,t])=>`<tr class="notice"><td class="no-print"></td><td>${esc(noticeLabel(p))}</td><td colspan="6" style="text-align:left">${esc(t)}</td></tr>`).join('');   // 안내 명단 (고른 상품만 · 해오름 산책도 고를 때만, 2026-11-19)
  $('#p4Sum').textContent = `${list.length}팀 · 치허문 ${list.filter(r=>r.gate==='치허문').length} · 곡신문 ${list.filter(r=>r.gate==='곡신문').length} · 연락 ${list.filter(r=>(s.edit[r.key]||{}).called).length}/${list.length}`;
  document.querySelectorAll('.out textarea').forEach(t=>{ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; });
}
document.addEventListener('change', e=>{ const t=e.target;
  if(t.dataset.sel){ state.sel[t.dataset.sel]=t.checked; saveState(); build(false); return; }
  if(t.dataset.call){ const e=(state.edit[t.dataset.call] ||= {}); if(t.checked) e.called=new Date().toISOString(); else delete e.called; saveState(); render(); return; }   // 연락 체크
  if(t.dataset.link!=null){ const k=t.dataset.link; if(t.value) state.link[k]=t.value; else delete state.link[k]; delete state.edit[k]; saveState(); build(false); return; }
  if(t.id==='minPpl'){ build(true); saveState(); return; }
  if(t.dataset.e){ const [k,f]=t.dataset.e.split('|'); if(f==='bus' || f==='car'){ t.value=t.value.replace(/\D/g,''); if(t.value==='0') t.value=''; }   /* 차량 대수: 숫자만 · 0은 빈칸 */ (state.edit[k] ||= {})[f]=t.value; saveState(); if(f==='time' || f==='ppl' || f==='name') build(false); else { const r=rows.find(x=>x.key===k); if(r){ r[f]=t.value; } render(); } scheduleAuto(); }   // 저장 안 한 수정 알림은 표를 다시 계산한 뒤 (2026-11-19)
});
document.addEventListener('input', e=>{ const t=e.target; if(t.tagName==='TEXTAREA' && t.dataset.e){ const [k,f]=t.dataset.e.split('|'); (state.edit[k] ||= {})[f]=t.value; const r=rows.find(x=>x.key===k); if(r) r[f]=t.value; saveState(); scheduleAuto(); t.style.height='auto'; t.style.height=t.scrollHeight+'px'; } });
// 지우기 (2026-11-19): 팀이 함께 쓰는 내용이라 바로 지우지 않고 확인 팝업 → 「지우기」를 한 번 더 눌러야 모두의 화면에서 지움
document.addEventListener('click', e=>{ if(e.target.id==='clearBtn' && state){ $('#clrMsg').innerHTML=`<b>${esc(dLab(state.date))}</b> 엑셀 · 고른 줄 · 표에서 고친 내용 · 연락 체크를 지웁니다.<br>팀이 함께 보는 내용이라 <b>다른 사람 화면에서도 지워집니다.</b> (단체예약에 이미 올린 내용은 그대로)`; $('#clrModal').hidden=false; setTimeout(()=>$('#clrNo').focus(), 0); } });
$('#clrNo').onclick=()=>{ $('#clrModal').hidden=true; };
$('#clrYes').onclick=async()=>{ $('#clrModal').hidden=true; if(!state) return; const d=state.date; clearTimeout(pushT);
  if(getKey()){ try{ await callApi({action:'del', id:PREP_ID(d)}); }catch(_){ toast('팀 공유 내용을 지우지 못했습니다. 잠시 뒤 다시 해 주세요.'); return; } }
  state=null; rows=[]; try{ localStorage.removeItem(STATE_LS); }catch(_){} render(); shareSt('', ''); toast(`${dLab(d)} 내용을 지웠습니다.`); };
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#clrModal').hidden) $('#clrModal').hidden=true; });
// 표 내용 (엑셀 · 이미지 공통): 도착 시간 순
function tableData(){ const s=state, list=rows.filter(r=>r.on).sort((a,b)=>(toMin(a.time)??9999)-(toMin(b.time)??9999)), total=s.rows.reduce((a,x)=>a+x.ppl,0);
  const head=[`${s.date.slice(2).replace(/-/g,'')}(${DOW[new Date(s.date+'T00:00').getDay()]}) ${total}명+@`,'인원(명)','도착시간','입장문','차량','연락처','비고'];
  return [head, ...list.map(r=>[r.name, r.ppl, r.time||r.timeHint||'', r.gate||'미정', r.vehicle, r.phone, r.note])]; }
// 엑셀로 내려받기 (예전 표 모양: 머리 초록 · 입장문 색 · 아래 합계)
$('#xlsxBtn').onclick=async()=>{ if(!state || !window.ExcelJS) return; const d=tableData(), wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('다음날 고객 응대');
  ws.columns=[{width:16},{width:6},{width:8},{width:8},{width:7},{width:13},{width:24}];   // 핸드폰에서 보기 좋게 좁게 (비고는 줄바꿈)
  ws.pageSetup={orientation:'portrait', fitToPage:true, fitToWidth:1, fitToHeight:0, paperSize:9};
  d.forEach((r,i)=>{ const row=ws.addRow(r); row.eachCell(c=>{ c.alignment={horizontal:'center', vertical:'middle', wrapText:true}; c.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}}; });
    if(!i) row.eachCell(c=>{ c.font={bold:true, color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern', pattern:'solid', fgColor:{argb:'FF5A6B4F'}}; });
    else { const g=row.getCell(4); g.fill={type:'pattern', pattern:'solid', fgColor:{argb: r[3]==='곡신문' ? 'FFDBE7F7' : 'FFDCEFD8'}}; } });
  const on=rows.filter(r=>r.on), total=state.rows.reduce((a,x)=>a+x.ppl,0), gSum=on.filter(r=>r.group).reduce((a,r)=>a+r.ppl,0), bus=on.reduce((a,r)=>a+(+r.bus||0),0), ind=total-on.reduce((a,r)=>a+(r.missing?0:r.ppl),0);
  const f=ws.addRow(['단체', gSum, '', '', `버스 ${bus}대+`, `개인고객 ${ind}명`, '']); ws.mergeCells(f.number,6,f.number,7);
  [[1,'FFD9EAD3'],[2,'FFD9EAD3'],[5,'FFF6C26B'],[6,'FFFFF200']].forEach(([c,col])=>{ const x=f.getCell(c); x.fill={type:'pattern', pattern:'solid', fgColor:{argb:col}}; x.font={bold:true}; x.alignment={horizontal:'center'}; });
  { const os=rows.filter(r=>r.on && (r.onsitePay || /현장/.test(r.xnote||''))).map(r=>r.name);   // 현장결제건 · 안내 명단 (2026-11-19)
    [['현장결제건', os.join(', ')||'-'], ...noticeLists().map(([p,t])=>[noticeLabel(p), t])].forEach(([l,t])=>{ const x=ws.addRow([l, t]); ws.mergeCells(x.number,2,x.number,7); x.getCell(1).font={bold:true}; x.getCell(1).alignment={vertical:'middle'}; x.getCell(2).alignment={wrapText:true, vertical:'middle'}; }); }
  const buf=await wb.xlsx.writeBuffer(), a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([buf])); a.download=`다음날_고객응대_${state.date.slice(2).replace(/-/g,'')}.xlsx`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000); };


// 이미지의 비고 = 간소화 (2026-11-19): 「프로그램 / 현장결제 / 도착시간 입장문」
//  - 도착시간 · 입장문은 꼭 (예: 9시 치허문 · 10:30 곡신문) · 관람만이면 「관람」은 안 씀
//  - 런치 · 디너 · 일출 · 일몰 · 동행도슨트 · PPT세미나 · 자체세미나가 있으면 (상품 이름 · 엑셀 비고에서, 시간 · 괄호 설명은 그대로)
//  - 금액 · 출입구 미정 · 입장 시각 · 마방 식사 · 적은 사람 이름 등은 뺌. 표에서 비고를 직접 고쳤으면 고친 글 그대로
const PROG_RE = /런치|디너|일출|해오름|일몰|선셋|도슨트|세미나|PPT/i;
const shortT = t => { const m=fmtT(t).match(/(\d\d):(\d\d)/); return m ? (m[2]==='00' ? `${+m[1]}시` : `${+m[1]}:${m[2]}`) : String(t||'').trim(); };
const MEAL_ONLY = s => /런치|디너/.test(s) && !/도슨트|세미나|PPT|일출|일몰/i.test(s);   // 식사(상품명)만 적힌 조각: 「런치2부」 「사담 디너」 → 비고에서 뺌
function shortNote(r){
  const out=[], add=s=>{ s=String(s||'').trim(); if(s && !out.some(x=>norm(x)===norm(s))) out.push(s); };
  const clean = s => String(s).replace(/사담\s*/g,'').replace(/런치\s*(\d)\s*부/g,'런치$1부').replace(/해오름\s*산책|해오름/g,'일출').replace(/선셋/g,'일몰').replace(/\s+/g,' ').trim();
  // 상품 이름은 비고에 안 씀 (2026-11-19 · 상품은 ② 티켓 발권 대상에서 담당자가 확인) — 엑셀 비고의 프로그램(금액 칸은 빼고) · 여행사 메모 · 현장결제 · 도착시간 입장문만
  String(r.xnote||'').replace(/\s*\(\s*[가-힣]{2,4}\s*\)\s*$/,'')   // 맨 끝 적은 사람 이름 「(문현빈)」은 뺌
    .split(/\s*\/\s*/).forEach(s=>{ if(PROG_RE.test(s) && !/\d[\d,]*\s*원/.test(s) && !MEAL_ONLY(clean(s))) add(clean(s)); });   // 런치 · 디너(예약 상품명)는 안 씀 (2026-11-20)
  if(r.agMemo) add(r.agMemo);   // 여행사 등록 메모 (2026-11-19)
  if(r.onsitePay || /현장\s*결제/.test(r.xnote||'')) add('현장결제');
  const arrive = r.time ? `${shortT(r.time)} ${r.gate || '입장'}` : (r.gate || '');   // 입장문을 아직 안 골랐으면 「9시 입장」 (2026-11-19)
  // 시간이 적힌 프로그램이 있으면 도착부터 시간 순 (예: 13시 곡신문 / 13:30 동행도슨트 / 15-16시 자체세미나), 없으면 맨 뒤에 도착 (예: 런치1부 / 현장결제 / 10:30 곡신문)
  const startMin = s => { const m=String(s).match(/^(\d{1,2})(?::(\d\d))?(?=시|\s|-|~)/); return m ? +m[1]*60+(+m[2]||0) : null; };
  if(out.some(s=>startMin(s)!=null) && arrive){
    const timed=out.filter(s=>startMin(s)!=null), rest=out.filter(s=>startMin(s)==null);
    return [...rest, ...[arrive, ...timed].sort((a,b)=>(startMin(a)??-1)-(startMin(b)??-1))].join(' / ');
  }
  add(arrive);
  return out.join(' / ');
}
// 이미지로 저장: 핸드폰에서 보기 좋은 좁은 폭(430px)의 표를 화면 밖에 그려 PNG로 (카카오톡으로 보내기 좋게)
$('#pngBtn').onclick=async()=>{
  if(!state || !window.html2canvas){ toast('잠시 뒤 다시 눌러 주세요.'); return; }
  const s=state, list=rows.filter(r=>r.on).sort((a,b)=>(toMin(a.time)??9999)-(toMin(b.time)??9999)), total=s.rows.reduce((a,x)=>a+x.ppl,0);
  const gSum=list.filter(r=>r.group).reduce((a,r)=>a+r.ppl,0), bus=list.reduce((a,r)=>a+(+r.bus||0),0), ind=total-list.reduce((a,r)=>a+(r.missing?0:r.ppl),0);
  const onsite=list.filter(r=>r.onsitePay || /현장/.test(r.xnote||'')).map(r=>r.name);
  const box=$('#shot');
  box.innerHTML = `<div class="sh-h"><b>${esc(dLab(s.date))} 단체현황 · ${list.length}팀</b><span>방문 ${total}명+@</span></div>`
    + `<table><thead><tr><th>단체 · 고객</th><th>인원</th><th>도착</th><th>입장문</th><th>차량</th></tr></thead><tbody>`
    + list.map(r=>`<tr class="${r.inList?'':'new'}"><td class="nm"><b>${esc(r.name)}</b>${r.phone?`<small>${esc(r.phone)}</small>`:''}</td><td class="c">${r.ppl}</td><td class="c">${esc(r.time||r.timeHint||'')}</td><td class="c">${r.gate?`<span class="g ${esc(r.gate)}">${esc(r.gate)}</span>`:'<span class="g tbd">미정</span>'}</td><td class="c">${esc(r.vehicle||'')}</td></tr>`
      + ((n=>n ? `<tr class="nt"><td colspan="5">${esc(n)}</td></tr>` : '')(shortNote(r)))).join('')
    + `</tbody></table>`
    + `<div class="sh-f"><span class="g1">단체 ${gSum}명</span><span class="g2">버스 ${bus}대+</span><span class="g3">개인고객 ${ind}명</span></div>`
    + `<div class="sh-n">현장결제건: ${esc(onsite.join(', ')||'-')}</div>`
    + noticeLists().map(([p,t])=>`<div class="sh-n">${esc(noticeLabel(p))}: ${esc(t)}</div>`).join('');
  try{
    const cv=await html2canvas(box, {scale:2, backgroundColor:'#ffffff'});
    const blob=await new Promise(ok=>cv.toBlob(ok, 'image/png')), a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=`다음날_고객응대_${s.date.slice(2).replace(/-/g,'')}.png`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
    toast('이미지로 저장했습니다.');
  }catch(_){ toast('이미지를 만들지 못했습니다.'); }
};

$("#saveEdits").onclick=onSaveClick;   // ③ 응대 표에서 고친 것 저장 (2026-11-19 · 버튼으로만)

if(state) build(false); else render();
paintHist(); loadGroups();
paintPrepDate();
if(state && state.date && state.date!==prepDate){ const d=prepDate; prepDate=state.date; switchDate(d); } else pullShared();   // 어제 것이 남아 있으면: 그것은 저장하고 내일(준비할 날짜)은 빈 화면 (팀이 준비해 둔 것이 있으면 그것)
