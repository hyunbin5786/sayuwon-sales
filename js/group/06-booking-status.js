// ▣ js/group/06-booking-status.js — 그날 예약 현황 · 삭제된 단체 예약 · 예약 목록(몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 = 예약 현황 공유 화면) · 직접 추가 · 찾기
// ===================== 그날 예약 현황 (식사·프로그램) =====================
const INFO_OF = k => isSub(k) ? null : OPT[GROUP_OF[k]]?.id || null;   // sadam · mabang · prog
let curInfoKey = null;
const numOf = v => { const s=String(v||'').trim(); return /^\d+(\s*\+\s*\d+)*\s*명?$/.test(s) ? s.match(/\d+/g).reduce((a,x)=>a+(+x),0) : 0; };   // 인원만 더함 (10:30 같은 시간은 제외)
function sameDay(){ return cache.filter(r=>r.date===rec.date && r.id!==editingId && r.callType!=="개인고객" && r.id!==MBDB_ID); }
// 관리자 사이트(admin.sayuwon.com) 사담·마방 현황: 서버(cloudflare/worker.js 의 syncAdmin)가 15분마다 가져와 둔 것
const ADMIN_SLOT = { sadam1:['L1','사담 런치1부'], sadam2:['L2','사담 런치2부'], sadamD:['D','사담 디너'], mabangL:['MB','마방 사유의 밥상'] };
const fmtAgo = s => { if(!s) return ''; const m=Math.round((Date.now()-new Date(s))/60000); return m<1?'방금':m<60?`${m}분 전`:`${Math.round(m/60)}시간 전`; };
function renderInfo(k){
  curInfoKey = k || null;
  document.querySelectorAll('#form .f.hot').forEach(w=>w.classList.remove('hot'));
  if(k) document.getElementById('w_'+k)?.classList.add('hot');
  Object.values(OPT).map(o=>o.id).forEach(box=>{
    const el=document.getElementById('info_'+box); if(!el) return;
    if(!rec.date){ el.innerHTML='<span class="none">방문일을 넣으면 그날 예약 현황이 여기에 보입니다.</span>'; return; }
    const day=sameDay(); const keys=FIELDS.filter(f=>INFO_OF(f[1])===box && !MB_INFO_SKIP.has(f[1])).map(f=>f[1]);
    if(k && INFO_OF(k)===box && !MB_INFO_SKIP.has(k)){
      const hits=day.filter(r=>r[k]);
      const tot=hits.reduce((s,r)=>s+numOf(r[k]),0);
      el.innerHTML = `<b>${dateLabel(rec.date)} ${LABEL[k]}</b> · ${hits.length? `이미 ${hits.length}건${tot?`, ${tot}${UNIT(k)}`:''}` : '<span class="none">다른 예약 없음</span>'}`
        + (hits.length? `<ul>${hits.map(r=>`<li>${esc(r.org||r.contact||'(업체 미정)')} · ${esc(r[k])}${/^\d+$/.test(r[k])?UNIT(k):''}${r.owner?` · ${esc(r.owner)}`:''}</li>`).join('')}</ul>` : '')
        ;
    } else {
      const parts=keys.map(key=>{ const hits=day.filter(r=>r[key]); if(!hits.length) return ''; const tot=hits.reduce((s,r)=>s+numOf(r[key]),0); return `${LABEL[key]} ${hits.length}건${tot?`(${tot}${UNIT(key)})`:''}`; }).filter(Boolean);
      el.innerHTML = `<b>${dateLabel(rec.date)} ${Object.values(OPT).find(o=>o.id===box).title} 예약 현황</b> · ` + (parts.length? esc(parts.join(' · ')) : '<span class="none">다른 예약 없음</span>') + ' <span class="none">(칸에 커서를 두면 업체별로 보입니다)</span>';
    }
  });
  renderDayAll();
}

// ===================== 예약 현황 (방문일 하루): 단체 · 몽몽마방 · 사담 =====================
// 단체 = 이 시스템의 다른 단체 예약 · 몽몽마방 = '몽몽마방 예약 목록'(NAS 엑셀 몽몽마방 예약 탭을 붙여 넣은 것) · 사담 = 예약 전산에서 확인
// 몽몽마방 예약 목록은 공유 기록(서버 DB 의 calls 표)에 한 줄(id mabangdb, 통화 구분 '몽몽마방예약')로 저장: 수정 기록 칸에 {rows:[{d,t,n,p,m}], at, by}
var MBDB_ID='mabangdb', MBDB_TYPE='몽몽마방예약';   // var: sameDay가 먼저 불려도 되게
function mbDb(){ const r=cache.find(x=>x.id===MBDB_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return { rows:Array.isArray(j.rows)?j.rows:[], at:j.at||'', by:j.by||'' }; }
const mbDbOn = d => mbDb().rows.filter(x=>x.d===d).sort((a,b)=>String(a.t).localeCompare(String(b.t)));
// 대관 · 도슨트 · 프로그램 현황: 예약접수가 된 단체 예약에서 자동으로 (저장된 예약 + 지금 화면의 예약)
//  대관 = 차방 대관(몽몽차방) · 당두봉갈 대관 / 도슨트 = 동행 도슨트(동행) · 세미나 도슨트(PPT) · 이름에 도슨트가 들어간 추가 프로그램 / 프로그램 = 그 밖의 개별 · 시간 프로그램
const RENT_PLACE = { chabang:'몽몽차방', dangdu:'당두봉갈' }, DOCENT_KIND = { donghaeng:'동행', seminar:'PPT', seminar2:'PPT' };
const isCoupon = k => /음료쿠폰/.test(LABEL[k]||'') || /음료쿠폰/.test(PROG_SRC[k]||'');   // 음료쿠폰(가가빈빈 · 몽몽차방)
const bookCat = k => RENT_PLACE[k] ? 'rent' : (DOCENT_KIND[k] || isDocent(LABEL[k])) ? 'docent' : isCoupon(k) ? 'coupon' : 'prog';
const BOOK_CATS = { rent:'대관', docent:'도슨트', prog:'프로그램', coupon:'음료쿠폰' };
function bookRows(withMe){ try{ return bookRows0(withMe); }catch(_){ return []; } }   // 초기화 중(아래 정의 전)에 불려도 되게
// withMe: 예약 목록 창 · 내 일정 출력은 지금 열어 둔 예약도 (화면의 값으로, 「지금 이 예약」 표시 · 2026-11-23: 열어 둔 예약이 도슨트 명단에서 사라지던 것)
//         그날 건수 · 「다른 예약 n건」은 예전처럼 다른 예약만
function bookRows0(withMe){
  const out=[];
  const recs = (cache||[]).filter(r=>isGroupRec(r) && r.id!==editingId && r.date && isBooked(stageOfRec(r))).map(r=>({r, x:xOf(r)}));
  if(withMe && !BOOK_ONLY && rec && rec.date && isBooked(effStage(rec))) recs.push({r:{id:editingId||''}, x:rec, me:true});
  recs.forEach(({r,x,me})=>{
    const notes = Object.fromEntries(String(x.inotes||'').split(/\s*;\s*/).map(s=>{ const i=s.indexOf('='); return i>0 ? [s.slice(0,i).trim(), s.slice(i+1).trim()] : null; }).filter(Boolean));
    PROG_KEYS().forEach(k=>{ const v=x[k]; if(!v) return; const cat=bookCat(k), unit=UNIT(k);
      out.push({ cat, id:r.id, me:!!me, d:x.date, org:x.org||x.contact||'(업체 미정)',
        ppl: (cat==='prog' || cat==='coupon') && unit!=='시간' ? (numOf(v)||numOf(x.people)) : numOf(x.people),
        hrs: unit==='시간' ? (numOf(v)||1) : 0, place:RENT_PLACE[k]||x['plc_'+k]||'', kind:DOCENT_KIND[k]||(cat==='docent'?LABEL[k]:''), item:LABEL[k]||k,
        tm:x['tm_'+k]||'', staff:String(x['stf_'+k]||'').trim()||x.owner||'', note:[notes[k], x['crs_'+k]&&`출발지 ${crsNorm(x['crs_'+k])}`].filter(Boolean).join(' · ') });
      if(k==='seminar' && numOf(v)>=2 && !x.seminar2){ const o=out[out.length-1]; out.push({...o, place:x.plc_seminar2||'', tm:x.tm_seminar2||'', staff:String(x.stf_seminar2||'').trim()||o.staff, note:[notes.seminar2].filter(Boolean).join(' · ')}); }   // 세미나 도슨트 수량 2: 두 번째도 현황에 한 줄 (2026-11-18)
    });
    // 굿즈로 넣은 음료쿠폰(예: 음료쿠폰(몽몽차방)) · 몽몽차방 · 가가빈빈 음료도 예약 현황 「음료쿠폰」에 (2026-11-18 · 음료 2026-11-21)
    goodsParse(x.goods).filter(g=>isDrinkSrc(g.src)).forEach(g=>out.push({ cat:'coupon', id:r.id, me:!!me, d:x.date, org:x.org||x.contact||'(업체 미정)', ppl:g.qty||0, hrs:0, place:'', kind:'', item:goodsName(g.src), tm:'', staff:String(x.stf_goods||'').trim()||x.owner||'', note:notes['g:'+g.src]||'' }));
  });
  return out.sort((a,b)=>(a.d+(a.tm||'99')).localeCompare(b.d+(b.tm||'99')));
}
function renderDayAll(){
  if(BOOK_ONLY && !$('#bookModal').hidden) paintBook();   // 공유 페이지: 새 기록을 받으면 다시 그림
  const el=$('#dayAll'); if(!el) return;
  // 예약 현황 = 버튼 5개 (몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰). 누르면 예약 목록 창이 그 구분 탭으로. 방문일이 있으면 그날 건수
  const d=rec.date, rows = d ? [...bookRows(), ...manualRows()].filter(x=>x.d===d) : [], n = c => !d ? 0 : c==='mb' ? mbDbOn(d).length + mbAutoRows().filter(x=>x.d===d).length : rows.filter(x=>x.cat===c).length;
  el.innerHTML = `<div class="da-btns">${[['mb','몽몽마방'], ...Object.entries(BOOK_CATS)].map(([c,t])=>`<button type="button" class="da-btn" data-book="${c}" title="${t} 예약 목록${d?` (${dateLabel(d)} ${n(c)}건)`:''}">${t}${n(c)?` <b>${n(c)}</b>`:''}</button>`).join('')}</div>`
    + `<div class="none da-note">${d ? `숫자 = ${dateLabel(d)} 예약 건수 · ` : ''}사담은 예약 전산에서 확인하세요.</div>`
    + dayPicked(d, rows);
}
// 방문일 + 예약 내역에 고른 항목(몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰) → 그날 같은 구분의 다른 예약을 예약 현황 아래에 바로 (2026-11-18)
function dayPicked(d, rows){
  if(!d || BOOK_ONLY) return '';
  const cats=[]; (itemRows||[]).forEach(k=>{ const t=itemKind(k), c = t==='mb' ? 'mb' : t==='prog' ? bookCat(k) : t==='goods' && isDrinkSrc(k.slice(2)) ? 'coupon' : ''; if(c && !cats.includes(c)) cats.push(c); });
  if(!cats.length) return '';
  const order=['mb','rent','docent','prog','coupon']; cats.sort((a,b)=>order.indexOf(a)-order.indexOf(b));
  return cats.map(c=>{
    let li=[];
    if(c==='mb'){ const list=[...mbDbOn(d), ...mbAutoRows().filter(x=>x.d===d && !x.cur)].sort((a,b)=>String(a.t||'99').localeCompare(String(b.t||'99')));
      li=list.map(x=>`<li${x.auto?` data-bopen="${esc(x.id)}" class="r"`:''}><span class="dp-t">${esc(x.t||'시간 미정')}</span><b>${esc(x.n||'')}</b>${x.p?` · ${esc(x.p)}명`:''}${x.m?` · ${esc(x.m)}`:''}${x.pay==='마방'?' · 마방 결제':''}</li>`); }
    else { const list=rows.filter(x=>x.cat===c).sort((a,b)=>String(a.tm||'99').localeCompare(String(b.tm||'99')));
      li=list.map(x=>`<li${x.manual?'':` data-bopen="${esc(x.id)}" class="r"`}><span class="dp-t">${esc(x.tm||'시간 미정')}</span><b>${esc(x.org||'')}</b>${x.ppl?` · ${x.ppl}${c==='coupon'?'장':'명'}`:''}${c==='rent'||c==='docent' ? [x.place, c==='docent'?x.kind:''].filter(Boolean).map(v=>` · ${esc(v)}`).join('') : x.item?` · ${esc(x.item)}`:''}${x.staff?` <small>(담당 ${esc(x.staff)})</small>`:''}</li>`); }
    return `<div class="dp-box"><div class="dp-h">${esc(dateLabel(d))} ${c==='mb'?'몽몽마방':BOOK_CATS[c]} <small>${li.length?`다른 예약 ${li.length}건`:'다른 예약 없음'}</small></div>${li.length?`<ul class="dp-list">${li.join('')}</ul>`:''}</div>`;
  }).join('');
}
// 삭제한 예약의 삭제한 사람 · 사유 (수정 기록의 [삭제] 줄) — 단체예약 목록이 「예약취소」에 함께 보일 때 씀 (예전 「삭제된 예약」 창은 2026-11-26 없앰)
const delInfo = r => { const h=parseHist(r).h, e=[...h].reverse().find(x=>/^\[삭제\]/.test(x.what||'')); return { by:e?e.by:'', why:e?String(e.what).replace(/^\[삭제\]\s*/,''):'(사유 기록 없음)' }; };
// ===================== 예약 목록 창: 몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰 =====================
// 대관 · 도슨트 · 프로그램 = 예약접수된 단체 예약에서 자동 + 직접 넣은 예약 / 몽몽마방 = 직접 넣은 예약 (엑셀 붙여넣기는 없앰 · 2026-11-14)
// 직접 넣은 대관 · 도슨트 · 프로그램은 공유 기록 한 줄(id bookdb, 통화 구분 '예약현황추가') 수정 기록 칸에 {rows:[{id,cat,d,org,ppl,tm,place,kind,item,staff,note}], at, by}
var BKDB_ID='bookdb', BKDB_TYPE='예약현황추가';
function bkDb(){ const r=cache.find(x=>x.id===BKDB_ID); let j={}; try{ j=JSON.parse((r&&r.history)||'{}')||{}; }catch(_){} return { rows:Array.isArray(j.rows)?j.rows:[], at:j.at||'', by:j.by||'' }; }
async function bkDbSave(rows, msg){
  if(BOOK_GUEST){ toast('로그인한 사람만 고칠 수 있습니다.'); return; }
  const old=cache.find(x=>x.id===BKDB_ID), now=new Date().toISOString(), keep=ymd(new Date(Date.now()-180*864e5));
  rows=rows.filter(x=>x.d>=keep);   // 180일 지난 것은 정리
  const item={...(old||{}), id:BKDB_ID, callType:BKDB_TYPE, saved:now, takenBy:savedOwner()||'', summary:`예약 현황 직접 추가 ${rows.length}건`, history:JSON.stringify({rows, at:now, by:savedOwner()||''})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===BKDB_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
  if(!$('#bookModal').hidden) paintBook(); renderDayAll(); toast(msg);
}
// ===== 예약 현황 직접 추가 · 몽몽마방 목록의 수정 기록 (2026-11-21): 추가 · 수정 · 빼기(사유 필수)를 모두 남김 =====
// 공유 기록 한 줄(id booklog, 통화 구분 '예약현황기록') 수정 기록 칸에 {log:[{t, by, act, db:'bk'|'mb', cat, row, chg, why}]}
// 한 칸(구글 시트 5만 자)에 다 차면 앞의 기록은 booklog-○○ 줄로 옮겨 두고 새로 (지우지 않음). 목록이 180 · 90일 지나 정리돼도 기록은 남음
var BKLOG_ID='booklog', BKLOG_TYPE='예약현황기록';
const BK_FLD = { d:'날짜', org:'업체', ppl:'인원', tm:'시간', place:'장소', kind:'종류', item:'항목', staff:'담당', note:'비고' };
const bkSnap = (db, x) => { x=x||{}; const o = db==='mb' ? {d:x.d, tm:x.t, org:x.n, ppl:x.p, item:x.m, by:x.by, guest:x.guest} : {d:x.d, org:x.org, ppl:x.ppl, tm:x.tm, place:x.place, kind:x.kind, item:x.item, staff:x.staff, note:x.note, by:x.by, guest:x.guest};
  Object.keys(o).forEach(k=>{ if(o[k]==null || o[k]==='' || o[k]===0) delete o[k]; else o[k]=String(o[k]); }); return o; };
const bkChg = (a, b) => Object.keys(BK_FLD).filter(k=>String(a[k]||'')!==String(b[k]||'')).map(k=>[k, a[k]||'', b[k]||'']);
function bkLogList(){ return (cache||[]).filter(r=>r.callType===BKLOG_TYPE).flatMap(r=>{ try{ const j=JSON.parse(r.history||'{}'); return Array.isArray(j.log) ? j.log : []; }catch(_){ return []; } }).sort((a,b)=>String(b.t).localeCompare(String(a.t))); }
async function bkLogAdd(entries){
  if(BOOK_GUEST || !entries.length) return;
  const now=new Date().toISOString(), by=savedOwner()||'';
  entries=entries.map(e=>({t:now, by, ...e}));
  const old=cache.find(x=>x.id===BKLOG_ID); let log=[]; try{ const j=JSON.parse((old&&old.history)||'{}'); if(Array.isArray(j.log)) log=j.log; }catch(_){}
  let next=[...log, ...entries];
  if(old && log.length && JSON.stringify({log:next}).length>40000){   // 칸이 차면 앞 기록을 따로 한 줄로 옮겨 둠
    const arch={...old, id:BKLOG_ID+'-'+Date.now().toString(36), saved:now, summary:`예약 현황 수정 기록 ${log.length}건 (보관)`}; await store.put(arch); cache.push(arch); next=entries; }
  const item={...(old||{}), id:BKLOG_ID, callType:BKLOG_TYPE, saved:now, takenBy:by, summary:`예약 현황 수정 기록 ${next.length}건`, history:JSON.stringify({log:next, at:now, by})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===BKLOG_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
  if($('#bkLogModal') && !$('#bkLogModal').hidden) paintBkLog();
}
// 수정 기록 창: 지금 탭(몽몽마방 · 대관 · 도슨트 · 프로그램 · 음료쿠폰) 것만, 「모든 구분」을 켜면 전부
function paintBkLog(){
  const all=$('#bkLogAll').checked, c=bookCatNow, list=bkLogList().filter(e=>all || (c==='mb' ? e.db==='mb' : e.db!=='mb' && e.cat===c));
  const catName = e => e.db==='mb' ? '몽몽마방' : BOOK_CATS[e.cat]||e.cat||'';
  const what = r => [r.d?dateLabel(r.d):'', r.tm, r.org?`<b>${esc(r.org)}</b>`:'', r.ppl?r.ppl+(r.cat==='coupon'?'장':'명'):'', r.place, r.kind, r.item, r.staff?`담당 ${r.staff}`:'', r.note?`비고 ${r.note}`:''].filter(Boolean).map(v=>/^<b>/.test(v)?v:esc(v)).join(' · ');
  $('#bkLogSum').textContent = `${list.length}건${all?'':` · ${c==='mb'?'몽몽마방':BOOK_CATS[c]}`}`;
  $('#bkLogBody').innerHTML = list.map(e=>`<tr class="bklog-${e.act==='빼기'?'del':e.act==='수정'?'edit':'add'}"><td>${esc(dtLabel(e.t))}</td><td>${esc(e.by||'')}</td><td><span class="tag">${esc(e.act)}</span>${all?`<small class="hint" style="margin:0;display:block">${esc(catName(e))}</small>`:''}</td><td>${what({...(e.row||{}), cat:e.cat})}</td>`
    + `<td>${e.act==='빼기' ? `사유: <b>${esc(e.why||'')}</b>` : e.act==='수정' ? (e.chg||[]).map(([k,a,b])=>`${esc(BK_FLD[k]||k)} ${esc(a||'(없음)')} → <b>${esc(b||'(없음)')}</b>`).join('<br>') || '바뀐 칸 없음' : esc(e.why||'')}</td></tr>`).join('')
    || `<tr><td colspan="5" class="empty">아직 기록이 없습니다. 직접 추가 · 수정 · 빼기를 하면 여기에 남습니다.</td></tr>`;
  labelCells('#bkLogBody', ['일시','누가','구분','예약','바뀐 것 · 사유']);
}
function openBkLog(){ $('#bkLogAll').checked=false; paintBkLog(); $('#bkLogModal').hidden=false; }
// 빼기: 사유를 꼭 적어야 뺌. 기록을 먼저 남기고 목록에서 뺌
let bkDelPend=null;   // {db:'bk'|'mb', id | i}
function openBkDel(p){
  const r = p.db==='mb' ? mbDb().rows[p.i] : bkDb().rows.find(x=>x.id===p.id); if(!r) return;
  bkDelPend={...p, snap:bkSnap(p.db, r), cat: p.db==='mb' ? 'mb' : r.cat};
  $('#bkDelMsg').textContent = p.db==='mb' ? `${dateLabel(r.d)} ${r.t||''} ${r.n} 몽몽마방 예약을 목록에서 뺍니다.` : `${dateLabel(r.d)} ${r.org} ${BOOK_CATS[r.cat]} 예약을 목록에서 뺍니다.`;
  $('#bkDelWhy').value=''; $('#bkDelErr').textContent=''; $('#bkDelModal').hidden=false; setTimeout(()=>$('#bkDelWhy').focus(), 0);
}
const closeBkDel = () => { $('#bkDelModal').hidden=true; bkDelPend=null; };
async function doBkDel(){
  const p=bkDelPend, why=$('#bkDelWhy').value.trim(); if(!p) return;
  if(!why){ $('#bkDelErr').textContent='빼는 사유를 적어 주세요.'; $('#bkDelWhy').focus(); return; }
  if(BOOK_GUEST){ toast('로그인한 사람만 뺄 수 있습니다.'); return; }
  $('#bkDelYes').disabled=true;
  try{
    await bkLogAdd([{act:'빼기', db:p.db, cat:p.cat, row:p.snap, why}]);   // 기록 먼저
    if(p.db==='mb'){ const rows=mbDb().rows, k=rows.findIndex(x=>JSON.stringify(bkSnap('mb', x))===JSON.stringify(p.snap)); if(k>=0) await mbDbSave(rows.filter((_,j)=>j!==k), '몽몽마방 예약을 목록에서 뺐습니다 (사유는 수정 기록에).'); }
    else await bkDbSave(bkDb().rows.filter(x=>x.id!==p.id), '예약을 목록에서 뺐습니다 (사유는 수정 기록에).');
    closeBkDel();
  } finally { $('#bkDelYes').disabled=false; }
}
let bookCatNow='rent', bookEdit=null;   // bookEdit: 고치는 줄 (몽몽마방은 {mb:번호}, 그 밖은 {id})
const BOOK_COLS = { rent:['일자','업체','인원','장소 · 시간','담당자 이름','비고사항',''], docent:['일자','업체','인원','시간','종류','담당자 이름','비고사항',''], prog:['일자','업체','인원','프로그램 항목','담당자 이름','비고사항',''], coupon:['일자','업체','매수','쿠폰 종류','담당자 이름','비고사항',''] };
// 예약 목록 표 (2026-11-25 통일): 다섯 목록 모두 같은 칸 · 같은 순서 — 날짜 · 시간 · 업체 · 인원 · 내용(목록마다 이름만 다름) · 담당자 · 비고 · (구분) / 줄마다 날짜
const BK_CONTENT = { mb:'메뉴', rent:'장소', docent:'종류 · 장소', prog:'프로그램', coupon:'쿠폰 종류' };
const BK_COLS = c => ['날짜','시간','업체','인원'+(c==='coupon'?' (매수)':''),BK_CONTENT[c]||'내용','담당자','비고',''];
const BK_CLS = ['c-d','c-t','c-o','c-n','c-x','c-s','c-m','c-a'];
const bkHeadHTML = c => `<tr>${BK_COLS(c).map((h,i)=>`<th class="${BK_CLS[i]}">${h}</th>`).join('')}</tr>`;
// 한 줄: v = {d, tm, org, n, x, staff, note} · cls/attr = 줄 표시 · acts = 오른쪽 끝
const bkRowHTML = (v, cls, attr, acts) => `<tr class="${cls}"${attr}><td class="c-d">${esc(dateLabel(v.d))}</td><td class="c-t">${esc(v.tm||'')}</td><td class="c-o"><b>${esc(v.org||'')}</b></td><td class="c-n num">${esc(v.n||'')}</td><td class="c-x">${v.x||''}</td><td class="c-s" style="white-space:pre-line">${esc(v.staff||'')}</td><td class="c-m note">${v.note||''}</td><td class="c-a acts">${acts}</td></tr>`;
function manualRows(){ try{ return bkDb().rows.map(x=>({...x, manual:true, ppl:+x.ppl||0})); }catch(_){ return []; } }   // 직접 넣은 대관 · 도슨트 · 프로그램
// ===== 예약 목록 찾기 (2026-11-25): 날짜(기본 = 전체 · 「기간 설정」을 누르면 오늘 ~ 오늘로 켜짐 → 시작 = 끝이면 그날 하루, 다르면 기간 · 끝은 시작보다 앞설 수 없음) + 검색어(프로그램 · 업체명 · 담당자 이름 · 띄어 쓰면 모두 맞는 것) =====
let bfOn=false;   // 기간 설정을 켰는지
function bkFind(){ const v=id=>(document.getElementById(id)||{}).value||'', q=v('bfQ').trim().toLowerCase();
  const from=bfOn?v('bfFrom'):'', to=bfOn?v('bfTo'):'';
  return { q, words:q.split(/\s+/).filter(Boolean), day:'', from, to, dated:!!(from||to), on:!!(q||from||to) }; }
const bkFindOk = (F, d, hay) => (!F.day || d===F.day) && (!F.from || d>=F.from) && (!F.to || d<=F.to) && F.words.every(w=>String(hay).toLowerCase().includes(w));
const bfSet = (id, val) => { const p=document.getElementById(id); if(!p) return; p.value=val; const t=p.parentElement.querySelector('.dtxt'); if(t) t.value = val ? dateDisp(val) : ''; };
function bfPaintDate(){ const w=document.getElementById('bfRangeW'), b=document.getElementById('bfRangeBtn'); if(!w || !b) return;
  w.classList.toggle('off', !bfOn); w.querySelectorAll('.dtxt').forEach(t=>{ t.disabled=!bfOn; t.placeholder = bfOn ? '날짜 고르기' : '전체'; });
  const f=$('#bfFrom'); if(f) $('#bfTo').min = f.value || '';   // 달력에서 시작보다 앞선 날은 못 고름
  b.textContent = bfOn ? '전체 보기' : '기간 설정'; b.title = bfOn ? '날짜 조건 끄기 (전체)' : '누르면 오늘 ~ 오늘로 켜짐 (시작 = 끝이면 그날 하루 · 다르면 기간)'; }
function bkFindPaint(n){ const F=bkFind(), el=document.getElementById('bfN');
  if(el) el.textContent = F.on ? `찾은 예약 ${n}건${F.from ? ` · ${F.from===F.to ? mdLabel(F.from)+' 하루' : mdLabel(F.from)+' ~ '+mdLabel(F.to)}` : ''}` : '';
  bfPaintDate(); }
document.addEventListener('click', e=>{ if(e.target.id!=='bfRangeBtn') return; bfOn=!bfOn;
  if(bfOn){ const t=todayYmd(); bfSet('bfFrom', t); bfSet('bfTo', t); } else { bfSet('bfFrom',''); bfSet('bfTo',''); }
  paintBook(); });
document.addEventListener('change', e=>{ const id=e.target.id; if(id!=='bfFrom' && id!=='bfTo') return;
  const f=$('#bfFrom').value, t=$('#bfTo').value;
  if(id==='bfFrom' && f && (!t || t<f)) bfSet('bfTo', f);   // 시작을 끝보다 뒤로 옮기면 끝도 같이
  if(id==='bfTo' && t && f && t<f){ bfSet('bfTo', f); toast('끝나는 날은 시작하는 날보다 앞설 수 없습니다.'); }
  if(id==='bfFrom' && !f) bfSet('bfFrom', t || todayYmd());
  if(id==='bfTo' && !$('#bfTo').value) bfSet('bfTo', $('#bfFrom').value);
  paintBook(); });
document.addEventListener('input', e=>{ if(e.target.id==='bfQ') paintBook(); });
document.addEventListener('click', e=>{ if(e.target.id!=='bfReset') return; bfOn=false; bfSet('bfFrom',''); bfSet('bfTo',''); const q=$('#bfQ'); if(q) q.value=''; paintBook(); });
function paintBook(){
  document.querySelectorAll('#bookTabs [data-bt]').forEach(b=>b.classList.toggle('on', b.dataset.bt===bookCatNow));
  const isMb = bookCatNow==='mb'; $('#bookMb').hidden=!isMb; $('#bookGen').hidden=isMb;
  if($('#bookAddBtn')) $('#bookAddBtn').hidden=false;   // 직접 추가 = 팝업 (로그인 없이도 이름을 적고 추가, 2026-11-21)
  if($('#bookLogBtn')) $('#bookLogBtn').hidden=BOOK_GUEST;   // 수정 기록 = 로그인한 사람
  if($('#bookMineL')) $('#bookMineL').hidden=isMb;   // 몽몽마방 목록에는 담당 칸이 없음
  if(bookAddClosed()) paintBookAdd();   // 팝업에 적는 중이면 (새 기록을 받아 다시 그려도) 적던 칸은 그대로
  if(isMb){ paintMbDb(); $('#bookTitle').textContent='몽몽마방 예약 목록'; $('#bookSum').textContent = $('#mbdbSum').textContent; return; }
  const c=bookCatNow, today=todayYmd(), past=$('#bookPast').checked;
  bkFillNames();   // 담당 이름 목록 (새 예약 · 담당이 생기면)
  const me=bkMe(), mine=$('#bookMine').checked && !!me;   // 내 담당만 보기 (2026-11-21)
  const F=bkFind();   // 찾기 (날짜를 고르면 지난 예약도)
  const all=[...bookRows(true), ...manualRows()].filter(x=>x.cat===c).sort((a,b)=>(a.d+(a.tm||'99')).localeCompare(b.d+(b.tm||'99'))), list=all.filter(x=>(past || F.dated || x.d>=today) && (!mine || isMine(x, me)) && bkFindOk(F, x.d, [x.org,x.item,x.kind,x.place,x.staff,x.tm,x.note].join(' ')));
  bkFindPaint(list.length);
  $('#bookTitle').textContent = `${BOOK_CATS[c]} 예약 목록`; { const bs=$('#bookSum'); if(bs){ bs.textContent=''; bs.hidden=true; } }   // 건수 · 「단체 예약에서 자동 + 직접 추가」 문구는 없앰 (2026-11-21)
  $('#bookHead').innerHTML = bkHeadHTML(c);
  const what = x => c==='rent' ? (x.place||'(장소 미정)') : c==='docent' ? [x.kind, x.place].filter(Boolean).join(' · ') : (x.item||'');   // 내용 칸
  $('#bookBody').innerHTML = list.map(x=>bkRowHTML({d:x.d, tm:(x.tm||(c==='docent'?'(미정)':''))+(x.hrs?` (${x.hrs}시간)`:''), org:x.org, n:x.ppl?x.ppl+(c==='coupon'?'장':'명'):'', x:esc(what(x)), staff:x.staff, note:esc(x.note||'')},
      `r${x.d<today?' past':''}${rec.date && x.d===rec.date?' same':''}`, x.manual?'':` data-bopen="${esc(x.id)}"`,
      `${x.manual ? `<button type="button" class="btn sm" data-bkedit="${esc(x.id)}">수정</button><button type="button" class="del" data-bkdel="${esc(x.id)}" title="빼기">×</button>` : x.me ? '<span class="tag call" title="지금 화면에서 열어 둔 예약 (저장 전 내용도 바로)">지금 이 예약</span>' : '<span class="tag" title="단체 예약에서 자동 · 줄을 누르면 그 예약">단체예약</span>'}`)).join('')
    || `<tr><td colspan="8" class="empty">${F.on?'찾는 조건에 맞는 예약이 없습니다.':mine?`담당 「${esc(me)}」인 ${past?'':'앞으로 있을 '}예약이 없습니다.`:all.length?'앞으로 있을 예약이 없습니다.':BOOK_CATS[c]+' 예약이 없습니다. 위 「＋ 직접 추가」로 넣으세요.'}</td></tr>`;
  labelCells('#bookBody', BK_COLS(c));   // 휴대폰: 칸마다 이름 (카드 모양, 2026-11-21)
}
// 예약 목록 표의 칸마다 머리글 이름(data-l) → 휴대폰에서는 줄마다 카드로, 칸 이름을 앞에 (css/group.css 「예약 현황 공유 휴대폰」)
function labelCells(sel, heads){ document.querySelectorAll(sel+' tr').forEach(tr=>{ [...tr.children].forEach((td,i)=>{ if(td.colSpan>1) return; const h=heads[i]||''; if(h) td.dataset.l=h; else td.removeAttribute('data-l'); }); }); }
// 직접 추가 · 수정 칸 (탭마다 칸이 다름) — 2026-11-21: 목록 아래가 아니라 「＋ 직접 추가」 · 「수정」을 누르면 팝업(#bookAddModal)으로
const bookAddClosed = () => !$('#bookAddModal') || $('#bookAddModal').hidden;
function bookAddOpen(){ paintBookAdd(); $('#bookAddModal').hidden=false; setTimeout(()=>(($('#baBy') && !$('#baBy').value ? $('#baBy') : $('#baOrg'))||$('#bookAdd input'))?.focus(), 0); }
function bookAddClose(){ $('#bookAddModal').hidden=true; bookEdit=null; bookImp=null; paintBookAdd(); }
const PLACE_OPTS=['몽몽차방','당두봉갈'], KIND_OPTS=['동행','PPT'], COUPON_OPTS=['음료쿠폰(가가빈빈)','음료쿠폰(몽몽차방)'];
function paintBookAdd(){
  const c=bookCatNow, box=$('#bookAdd'); if(!box) return;
  if(BOOK_GUEST) bookEdit=null;   // 로그인 없이는 추가만 (고치기 · 빼기는 로그인한 사람, 2026-11-21)
  let x = {};
  if(bookEdit && bookEdit.mb!=null){ const r=mbDb().rows[bookEdit.mb]; if(r) x={d:r.d, tm:r.t, org:r.n, ppl:r.p, item:r.m}; }
  else if(bookEdit && bookEdit.id) x = bkDb().rows.find(r=>r.id===bookEdit.id) || {};
  const inp=(id,ph,v,cls='')=>`<input id="${id}" class="${cls}" placeholder="${ph}"${id==='baTm'?' data-tp="range" readonly':''} value="${esc(v==null?'':v)}" autocomplete="off"${/Org|Staff|Note|Item/.test(id)?' data-ime="ko"':''}>`;
  const sel=(id,opts,v)=>`<select id="${id}">${opts.map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('')}${v && !opts.includes(v)?`<option selected>${esc(v)}</option>`:''}</select>`;
  const f = c==='mb'
    ? [`<label>시간 ${inp('baTm','',x.tm,'t')}</label>`, `<label>예약자 ${inp('baOrg','',x.org)}</label>`, `<label>인원 ${inp('baPpl','명',x.ppl,'n')}</label>`, `<label>메뉴 ${sel('baItem', mbMenus().map(m=>m.name), x.item||'')}</label>`]
    : [`<label>업체 ${inp('baOrg','',x.org)}</label>`, `<label>${c==='coupon'?'매수':'인원'} ${inp('baPpl',c==='coupon'?'장':'명',x.ppl,'n')}</label>`, `<label>시간 ${inp('baTm','',x.tm,'t')}</label>`,
       c==='rent' ? `<label>장소 ${sel('baPlace', PLACE_OPTS, x.place||'')}</label>` : c==='docent' ? `<label>종류 ${sel('baKind', KIND_OPTS, x.kind||'')}</label>` : c==='coupon' ? `<label>쿠폰 종류 ${sel('baItem', COUPON_OPTS, x.item||'')}</label>` : `<label>프로그램 항목 ${inp('baItem','',x.item)}</label>`,
       `<label>담당자 이름 ${inp('baStaff','',x.staff)}</label>`, `<label class="wide">비고사항 ${inp('baNote','',x.note)}</label>`];
  box.innerHTML = `<div class="ba-h"><b>${c==='mb'?'몽몽마방':BOOK_CATS[c]} ${bookEdit?'예약 고치기':'예약 직접 추가'}</b> <span class="hint" style="margin:0">예약 한 건</span></div>`
    + (BOOK_GUEST ? `<div class="ba-row ba-who"><label class="wide">추가하는 사람 이름 <input id="baBy" data-ime="ko" placeholder="이름" autocomplete="off" value="${esc((()=>{ try{ return localStorage.getItem('sy_guest_name')||''; }catch(_){ return ''; } })())}"></label><span class="hint">로그인 없이 추가합니다 · 고치기 · 빼기는 로그인한 사람이</span></div>` : '')   // 로그인 없이: 이름을 적고 추가 (2026-11-21)
    + `<div class="ba-row"><label>날짜 ${dboxHTML('id="baDate"', x.d||rec.date||'')}</label>${f.join('')}</div>`
    + `<div class="ba-btns"><button type="button" class="btn" id="baCancel">취소</button><button type="button" class="btn primary" id="baSave">${bookEdit?'고치기':'추가'}</button></div>`
    + (!['mb','coupon'].includes(c) && !bookEdit && !BOOK_GUEST ? `<details class="ba-imp"><summary class="hint">엑셀 표를 한 번에 넣기 (대관 · 도슨트 · 프로그램 표)</summary><p class="hint" style="margin:4px 0">엑셀에서 줄을 복사해 붙여 넣으세요. 열 순서: 일자 · 업체 · 인원 · 동행 도슨트 시간 · PPT 도슨트 시간 · 대관 시간 · … · 담당 · 비고. 시간이 있는 칸마다 한 건씩 들어갑니다 (대관 장소는 넣은 뒤 「수정」에서).</p><textarea id="baImp" placeholder="여기에 붙여 넣기"></textarea><div id="baImpPrev" class="mb-prev"></div><div class="row-btns" style="justify-content:flex-end"><button type="button" class="btn primary" id="baImpSave" disabled>모두 넣기</button></div></details>` : '');
}
async function bookAddSave(){
  const c=bookCatNow, v=id=>(($('#'+id)||{}).value||'').trim(), d=v('baDate'), org=v('baOrg'), ppl=parseInt(v('baPpl'))||0;
  if(!d){ toast('날짜를 고르세요.'); return false; } if(!org){ toast(c==='mb'?'예약자를 적어 주세요.':'업체를 적어 주세요.'); $('#baOrg').focus(); return false; }
  const tm=(()=>{ const s=v('baTm'); const f=typeof fmtRange==='function' ? fmtRange(s) : ''; return f || s; })();
  if(BOOK_GUEST){   // 로그인 없이 추가 (2026-11-21): 적은 이름으로 서버에 한 건 (bookAdd) → 목록 다시 받음
    const by=v('baBy'); if(!by){ toast('추가하는 사람 이름을 적어 주세요.'); $('#baBy')?.focus(); return false; }
    if(c==='mb' && !ppl){ toast('인원을 적어 주세요.'); $('#baPpl').focus(); return false; }
    try{ localStorage.setItem('sy_guest_name', by); }catch(_){}
    const row = c==='mb' ? {d, t:tm, n:org, p:String(ppl), m:v('baItem')} : {cat:c, d, org, ppl:String(ppl), tm, place:c==='rent'?v('baPlace'):'', kind:c==='docent'?v('baKind'):'', item:(c==='prog'||c==='coupon')?v('baItem'):'', staff:v('baStaff'), note:v('baNote')};
    try{ const j=await SY.callRaw({action:'bookAdd', db: c==='mb'?MBDB_ID:BKDB_ID, row, by});
      if(!j.ok){ toast('추가하지 못했습니다: '+j.error, 4000); return false; } }
    catch(e){ toast('추가하지 못했습니다 (인터넷 연결). 잠시 뒤 다시 눌러 주세요.'); return false; }
    await bookPull(); toast(`${c==='mb'?'몽몽마방':BOOK_CATS[c]} 예약을 추가했습니다 (${by}).`); return true; }
  if(c==='mb'){ if(!ppl){ toast('인원을 적어 주세요.'); $('#baPpl').focus(); return false; }
    const row={d, t:tm, n:org, p:ppl, m:v('baItem')}, rows=[...mbDb().rows];
    const was = bookEdit && bookEdit.mb!=null ? rows[bookEdit.mb] : null;
    if(was){ row.by=was.by; if(was.guest) row.guest=was.guest; rows[bookEdit.mb]=row; } else { row.by=savedOwner()||''; rows.push(row); }
    const ed=!!was; bookEdit=null; await mbDbSave(rows, ed?'몽몽마방 예약을 고쳤습니다.':'몽몽마방 예약을 추가했습니다.');
    await bkLogAdd([ed ? {act:'수정', db:'mb', cat:'mb', row:bkSnap('mb', row), chg:bkChg(bkSnap('mb', was), bkSnap('mb', row))} : {act:'추가', db:'mb', cat:'mb', row:bkSnap('mb', row)}]); return true; }
  const row={ id: (bookEdit&&bookEdit.id) || 'b'+Date.now().toString(36), cat:c, d, org, ppl, tm, place:c==='rent'?v('baPlace'):'', kind:c==='docent'?v('baKind'):'', item:(c==='prog'||c==='coupon')?v('baItem'):'', staff:v('baStaff'), note:v('baNote'), by:savedOwner()||'' };
  const was = bookEdit && bookEdit.id ? bkDb().rows.find(r=>r.id===row.id) : null;
  if(was){ row.by=was.by||row.by; if(was.guest) row.guest=was.guest; }   // 처음 넣은 사람은 그대로
  const rows=bkDb().rows.filter(r=>r.id!==row.id); rows.push(row);
  const ed=!!was; bookEdit=null; await bkDbSave(rows, ed?'예약을 고쳤습니다.':`${BOOK_CATS[c]} 예약을 추가했습니다.`);
  await bkLogAdd([ed ? {act:'수정', db:'bk', cat:c, row:bkSnap('bk', row), chg:bkChg(bkSnap('bk', was), bkSnap('bk', row))} : {act:'추가', db:'bk', cat:c, row:bkSnap('bk', row)}]); return true;
}
// 엑셀 표 한 번에 넣기: 일자 · 업체 · 인원 · 동행 시간 · PPT 시간 · 대관 시간 · … · 담당 · 비고 (따옴표로 묶인 칸 안 줄바꿈도)
function tsvRows(text){ const rows=[]; let row=[], cell='', q=false; const s=String(text||'').replace(/\r/g,'');
  for(let i=0;i<s.length;i++){ const ch=s[i];
    if(q){ if(ch==='"'){ if(s[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=ch; continue; }
    if(ch==='"' && cell.trim()===''){ q=true; cell=''; continue; }
    if(ch==='\t'){ row.push(cell); cell=''; } else if(ch==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; } else cell+=ch; }
  row.push(cell); rows.push(row); return rows.map(r=>r.map(c=>c.trim())).filter(r=>r.some(Boolean)); }
let bookImp=null;
function bookImpParse(text){ const out=[], skipped=[]; const p2=n=>String(n).padStart(2,'0');
  tsvRows(text).forEach(cells0=>{ const cells = cells0[0]==='' ? cells0.slice(1) : cells0;
    const dm=String(cells[0]||'').match(/(\d{1,2})\s*[\/.월]\s*(\d{1,2})/); if(!dm){ skipped.push(cells.join(' ')); return; }
    const d=`${mbYear(+dm[1],+dm[2])}-${p2(dm[1])}-${p2(dm[2])}`, org=cells[1]||'', ppl=parseInt(cells[2])||0;
    const tail=cells.slice(3), note=tail.length ? tail[tail.length-1] : '', staff=tail.length>1 ? tail[tail.length-2].replace(/\s*\n\s*/g,'\n') : '';
    const t=i=>{ const s=tail[i]||''; return /\d{1,2}\s*:\s*\d{2}/.test(s) ? ((typeof fmtRange==='function' && fmtRange(s)) || s.replace(/\s/g,'')) : ''; };
    const base={d, org, ppl, staff, note, by:savedOwner()||''}, n0=out.length;
    if(t(0)) out.push({...base, cat:'docent', kind:'동행', tm:t(0)});
    if(t(1)) out.push({...base, cat:'docent', kind:'PPT', tm:t(1)});
    if(t(2)) out.push({...base, cat:'rent', place:'', tm:t(2)});
    if(out.length===n0) out.push({...base, cat:'prog', item:note, tm:''});
  });
  out.forEach((x,i)=>{ x.id='b'+Date.now().toString(36)+i; });
  return {rows:out, skipped};
}
document.addEventListener('input', e=>{ if(e.target.id!=='baImp') return; bookImp = e.target.value.trim() ? bookImpParse(e.target.value) : null;
  $('#baImpPrev').innerHTML = !bookImp ? '' : bookImp.rows.length ? `<b>${bookImp.rows.length}건</b><ul>${bookImp.rows.map(x=>`<li>${esc(dateLabel(x.d))} · ${esc(BOOK_CATS[x.cat])}${x.kind?' '+esc(x.kind):''} ${esc(x.tm||'')} · <b>${esc(x.org)}</b> · ${x.ppl}명${x.staff?' · '+esc(x.staff.replace(/\n/g,', ')):''}${x.note?' · '+esc(x.note):''}</li>`).join('')}</ul>${bookImp.skipped.length?`<div class="hint">읽지 못한 줄 ${bookImp.skipped.length}개</div>`:''}` : '<b class="late">읽은 줄이 없습니다.</b>';
  $('#baImpSave').disabled = !(bookImp && bookImp.rows.length); });
document.addEventListener('click', async e=>{ const t=e.target;
  if(t.id==='bookAddBtn' || t.id==='bookAddBtn2'){ bookEdit=null; bookAddOpen(); return; }   // bookAddBtn2 = 휴대폰에서 출력하기 아래 (2026-11-24)   // 로그인 없이도 (이름 칸이 나옴)
  if(t.id==='baSave'){ t.disabled=true; const ok=await bookAddSave(); if(!ok){ t.disabled=false; return; } bookAddClose(); return; }
  if(t.id==='baCancel'){ bookAddClose(); return; }
  if(t.id==='baImpSave' && bookImp){ const key=x=>[x.cat,x.d,x.org,x.tm,x.kind].join('|'), have=new Set(bkDb().rows.map(key)), add=bookImp.rows.filter(x=>!have.has(key(x)));
    bookImp=null; await bkDbSave([...bkDb().rows, ...add], `${add.length}건을 넣었습니다.${add.length?'':' (이미 있는 예약)'}`);
    await bkLogAdd(add.map(x=>({act:'추가', db:'bk', cat:x.cat, row:bkSnap('bk', x), why:'엑셀 표로 한 번에'}))); bookAddClose(); return; }
  if(t.dataset.bkedit){ bookEdit={id:t.dataset.bkedit}; bookAddOpen(); return; }
  if(t.dataset.bkdel){ if(BOOK_GUEST){ toast('로그인한 사람만 뺄 수 있습니다.'); return; } openBkDel({db:'bk', id:t.dataset.bkdel}); return; }   // 사유를 적는 창 (2026-11-21)
  if(t.id==='bkDelYes'){ doBkDel(); return; }
  if(t.id==='bkDelNo'){ closeBkDel(); return; }
  if(t.id==='bookLogBtn'){ openBkLog(); return; }
  if(t.id==='bkLogClose'){ $('#bkLogModal').hidden=true; return; }
  if(t.id==='bkLogAll'){ paintBkLog(); return; }
  if(t.dataset.mbedit!=null){ bookEdit={mb:+t.dataset.mbedit}; bookAddOpen(); return; }
});
// 직접 추가 팝업: Esc = 닫기 (뒤의 예약 목록 창보다 먼저)
document.addEventListener('keydown', e=>{ if(e.key!=='Escape' || bookAddClosed()) return; e.preventDefault(); e.stopImmediatePropagation(); bookAddClose(); }, true);
// ===== 예약 현황 공유 (첫 화면 3열 → group.html?book=mb|rent|docent|prog|coupon): 예약 목록 창만 한 페이지로 =====
// 로그인하지 않은 사람(book-guest)은 보기만 (직접 추가 · 수정 · 빼기 · 줄 눌러 예약 열기 없음). 로그인한 사람은 단체 화면의 예약 목록 창과 똑같이
var BOOK_ONLY = (()=>{ const q=new URLSearchParams(location.search).get('book'); return q==null ? '' : (q==='mb' || BOOK_CATS[q]) ? q : 'mb'; })();
var BOOK_GUEST = !!BOOK_ONLY && document.documentElement.classList.contains('book-guest');
if(BOOK_ONLY){ $('#crumb').textContent='예약 현황 공유'; setTimeout(()=>openBook(BOOK_ONLY), 50); }
function bookPageSync(){ if(!BOOK_ONLY) return; const t=bookCatNow==='mb'?'몽몽마방':BOOK_CATS[bookCatNow]; document.title=`${t} · 예약 현황 공유 · 사유원 운영 보조 시스템`; $('#crumb').textContent=`예약 현황 공유 › ${t}`; history.replaceState(null,'','group.html?book='+bookCatNow); }
const bookShut = () => { if(!BOOK_ONLY) $('#bookModal').hidden=true; };   // 공유 페이지는 닫지 않음 (메뉴로는 헤더)
// ===== 담당 일정 (2026-11-21 · 2026-11-23 고침): 「이름」 = 담당 칸에 있는 이름 중에서 고름(직접 치지 않음 · 이 브라우저에 기억)
//  담당 칸(대관 · 도슨트 · 프로그램 · 음료쿠폰)에 여러 이름이 있으면(쉼표 · 줄바꿈 · / · 띄어쓰기) 한 사람씩 나눔
//  출력하기 = 그 사람 일정을 표 이미지로 (일자 · 업체 · 인원 · 시간 · 종류, 휴대폰 세로 폭) · 모든 담당 출력 = 담당마다 한 장씩
var BKME_LS='sy_book_me', BKRANGE_LS='sy_book_range';
const staffNames = s => [...new Set(String(s||'').split(/[\n,\/·&+、;]+|\s+/).map(v=>v.replace(/[()[\]]/g,'').replace(/(선생님|님|담당)$/,'').trim()).filter(v=>v.length>=2 && !/^\d+$/.test(v)))];
function bkMe(){ const el=document.getElementById('bookMeName'); return el ? el.value.trim() : ''; }
const isMine = (x, me) => { if(!me) return false; if(staffNames(x.staff).includes(me)) return true; const n=normSrc(me); return !!n && normSrc(x.staff).includes(n); };
const bkRangeDays = () => { const el=document.getElementById('bookRange'); return Math.max(7, parseInt(el && el.value)||7); };
function bkDays(){ const t0=new Date(); t0.setHours(0,0,0,0); return [...Array(bkRangeDays()+1)].map((_,i)=>{ const d=new Date(t0); d.setDate(d.getDate()+i); return ymd(d); }); }   // 오늘 + n일
// 담당 이름 목록: 오늘 이후 대관 · 도슨트 · 프로그램 · 음료쿠폰의 담당 칸에 있는 이름 (가나다순)
function bkStaffList(){ const today=todayYmd(), set=new Set(); [...bookRows(true), ...manualRows()].filter(x=>x.d>=today && BOOK_CATS[x.cat]).forEach(x=>staffNames(x.staff).forEach(n=>set.add(n))); return [...set].sort((a,b)=>a.localeCompare(b,'ko')); }
function bkFillNames(){ try{ bkFillNames0(); }catch(e){ console.warn('담당 이름 목록', e); } }
function bkFillNames0(){ const el=document.getElementById('bookMeName'); if(!el || el.tagName!=='SELECT') return;
  const names=bkStaffList(); let cur=el.value || el.dataset.saved || '';
  if(!cur){ try{ cur=(JSON.parse(localStorage.getItem('sy_user')||'null')||{}).name || localStorage.getItem('sy_guest_name') || ''; }catch(_){} if(!names.includes(cur)) cur=''; }   // 처음: 로그인 이름이 담당 목록에 있으면 그 이름
  const list=cur && !names.includes(cur) ? [cur, ...names] : names, sig=list.join('|')+'#'+cur;   // 고른 이름이 목록에서 없어져도 그대로 둠
  if(el.dataset.sig===sig) return; el.dataset.sig=sig;
  el.innerHTML = `<option value="">담당자 고르기</option>` + list.map(n=>`<option${n===cur?' selected':''}>${esc(n)}</option>`).join(''); el.value=cur; }
(function(){ const el=document.getElementById('bookMeName'); if(!el) return;
  try{ el.dataset.saved=localStorage.getItem(BKME_LS)||''; const rg=document.getElementById('bookRange'); if(rg){ const v=localStorage.getItem(BKRANGE_LS); if(v) rg.value=v; rg.addEventListener('change', ()=>{ try{ localStorage.setItem(BKRANGE_LS, rg.value); }catch(_){} }); } }catch(_){}
  // 이름 목록은 예약 목록을 그릴 때 채움 (paintBook · 여기서 부르면 아직 준비 안 된 함수가 있음)
  el.addEventListener('change', ()=>{ try{ localStorage.setItem(BKME_LS, el.value); }catch(_){} el.dataset.saved=el.value; if($('#bookMine').checked) paintBook(); });
  $('#bookMine').addEventListener('change', ()=>{ if($('#bookMine').checked && !bkMe()){ $('#bookMine').checked=false; toast('이름을 먼저 골라 주세요.'); el.focus(); return; } paintBook(); });
  $('#bookPrint').addEventListener('click', ()=>bookPrintImg());
  $('#bookPrintAll').addEventListener('click', ()=>bookPrintAll());
})();
const BK_COLOR = { rent:['#e7efe2','#4f6b3f'], docent:['#e4ecf5','#3d5a80'], prog:['#f6ecdc','#8a5a1c'], coupon:['#f3e6ee','#7d3c62'] };   // [바탕, 글자 · 테두리]
function bkTm(x){ const m=String(x.tm||'').match(/(\d{1,2})\s*:\s*(\d{2})(?:\s*[~\-–]\s*(\d{1,2})\s*:\s*(\d{2}))?/); if(!m) return null;
  const a=+m[1]*60+(+m[2]); let b = m[3]!=null ? +m[3]*60+(+m[4]) : a+(x.hrs?x.hrs*60:60); if(b<=a) b=a+60; return [a,b]; }
function bkTitle(x){ return x.cat==='docent' ? `도슨트${x.kind?' · '+x.kind:''}` : x.cat==='rent' ? `대관${x.place?' · '+x.place:''}` : x.cat==='coupon' ? (x.item||'음료쿠폰') : (x.item||'프로그램'); }
const bkHM = m => `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;
// 표 한 줄에 들어갈 값: 시간(시작~끝) · 종류(구분 + 자세히) · 덧붙임(출발지)
function bkRowVals(x){ const se=bkTm(x), hasEnd=/[~\-–]/.test(x.tm||'') || x.hrs;
  const time = se ? (hasEnd ? `${bkHM(se[0])}~${bkHM(se[1])}` : bkHM(se[0])) : (x.tm||'미정');
  const det = x.cat==='docent' ? [x.kind, x.hrs?`${x.hrs}시간`:''].filter(Boolean).join(' · ') : x.cat==='rent' ? [x.place, x.hrs?`${x.hrs}시간`:''].filter(Boolean).join(' · ') : x.cat==='coupon' ? (x.item||'') : [x.item, x.hrs?`${x.hrs}시간`:''].filter(Boolean).join(' · ');
  const crs=(String(x.note||'').match(/출발지\s*([^·]+)/)||[])[1];
  return { time, kind:BOOK_CATS[x.cat]||'', det, sub: crs ? `출발지 ${crs.trim()}` : '' }; }
const bkSortKey = x => x.d + String((bkTm(x)||[9999])[0]).padStart(4,'0');
// 한 사람 일정 → 표 이미지 (휴대폰 세로 폭 1080px). 돌려주는 값: {blob, name, n}
async function bkTableImg(me, days){
  const evs=[...bookRows(true), ...manualRows()].filter(x=>BOOK_CATS[x.cat] && days.includes(x.d) && isMine(x, me)).sort((a,b)=>bkSortKey(a).localeCompare(bkSortKey(b)));
  const W=1080, PAD=48, FONT=getComputedStyle(document.body).fontFamily || 'sans-serif', f=(px,b)=>`${b?'700 ':''}${px}px ${FONT}`;
  const COLS=[['일자',150,'c'],['업체',0,'l'],['인원',96,'c'],['시간',196,'c'],['종류',236,'c']], TW=W-PAD*2; COLS[1][1]=TW-COLS.reduce((s,c)=>s+c[1],0);
  const probe=document.createElement('canvas').getContext('2d');
  const wrap=(text,w,px,b,max)=>{ probe.font=f(px,b); const out=[]; let line=''; for(const ch of String(text||'')){ if(probe.measureText(line+ch).width>w && line){ out.push(line); line=ch; } else line+=ch; } if(line) out.push(line);
    if(out.length>max){ const k=out.slice(0,max); let l=k[max-1]; while(l && probe.measureText(l+'…').width>w) l=l.slice(0,-1); k[max-1]=l+'…'; return k; } return out; };
  const rows=evs.map(x=>{ const v=bkRowVals(x), dt=new Date(x.d+'T00:00'), w1=COLS[1][1]-36, w4=COLS[4][1]-24;
    const org=wrap(x.org, w1, 30, 1, 2), sub=v.sub ? wrap(v.sub, w1, 24, 0, 1) : [], det=v.det ? wrap(v.det, w4, 24, 0, 2) : [];
    const h=Math.max(96, 30+org.length*40+sub.length*32, 30+38+det.length*32);
    return {x, v, org, sub, det, h, dl:`${dt.getMonth()+1}/${dt.getDate()}(${DOW[dt.getDay()]})`, red:isRedDay(x.d)}; });
  const HEAD=200, TH=84, FOOT=90, body=rows.reduce((s,r)=>s+r.h,0) || 130;
  const H=HEAD+TH+body+FOOT, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const ctx=cv.getContext('2d'); ctx.textBaseline='top';
  ctx.fillStyle='#f5f3ee'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#2b2a26'; ctx.font=f(52,1); ctx.fillText(`${me} 님 일정`, PAD, 50);
  const d0=new Date(days[0]+'T00:00'), d1=new Date(days[days.length-1]+'T00:00');
  ctx.fillStyle='#7a766b'; ctx.font=f(28); ctx.fillText(`사유원 · ${d0.getMonth()+1}/${d0.getDate()}(${DOW[d0.getDay()]}) ~ ${d1.getMonth()+1}/${d1.getDate()}(${DOW[d1.getDay()]}) · ${evs.length}건`, PAD, 124);
  // 표 (둥근 모서리)
  const tx=PAD, ty=HEAD, th=TH+body, R=18;
  ctx.save(); ctx.beginPath(); ctx.moveTo(tx+R,ty); ctx.arcTo(tx+TW,ty,tx+TW,ty+th,R); ctx.arcTo(tx+TW,ty+th,tx,ty+th,R); ctx.arcTo(tx,ty+th,tx,ty,R); ctx.arcTo(tx,ty,tx+TW,ty,R); ctx.closePath(); ctx.clip();
  ctx.fillStyle='#fff'; ctx.fillRect(tx,ty,TW,th);
  ctx.fillStyle='#3f5440'; ctx.fillRect(tx,ty,TW,TH);
  { let cx=tx; ctx.font=f(28,1); ctx.fillStyle='#fff'; COLS.forEach(([n,w,al])=>{ ctx.textAlign=al==='c'?'center':'left'; ctx.fillText(n, al==='c'?cx+w/2:cx+18, ty+26); cx+=w; }); ctx.textAlign='left'; }
  let y=ty+TH;
  rows.forEach((r,i)=>{ ctx.fillStyle= i%2 ? '#faf8f3' : '#fff'; ctx.fillRect(tx,y,TW,r.h); if(i){ ctx.fillStyle='#ebe7dd'; ctx.fillRect(tx,y,TW,2); }
    let cx=tx; const mid=y+r.h/2;
    ctx.textAlign='center'; ctx.font=f(28); ctx.fillStyle=r.red?'#b3412e':'#2b2a26'; ctx.fillText(r.dl, cx+COLS[0][1]/2, mid-16); cx+=COLS[0][1];   // 일자
    ctx.textAlign='left'; { const bh=r.org.length*40+r.sub.length*32; let yy=mid-bh/2;   // 업체 (+ 출발지)
      ctx.font=f(30,1); ctx.fillStyle='#2b2a26'; r.org.forEach(s=>{ ctx.fillText(s, cx+18, yy+2); yy+=40; });
      ctx.font=f(24); ctx.fillStyle='#7a766b'; r.sub.forEach(s=>{ ctx.fillText(s, cx+18, yy+2); yy+=32; }); } cx+=COLS[1][1];
    ctx.textAlign='center'; ctx.font=f(28); ctx.fillStyle='#2b2a26'; ctx.fillText(r.x.ppl?`${r.x.ppl}${r.x.cat==='coupon'?'장':'명'}`:'-', cx+COLS[2][1]/2, mid-16); cx+=COLS[2][1];   // 인원
    ctx.fillStyle=r.v.time==='미정'?'#b3412e':'#2b2a26'; ctx.fillText(r.v.time, cx+COLS[3][1]/2, mid-16); cx+=COLS[3][1];   // 시간
    { const [bg,fg]=BK_COLOR[r.x.cat]||BK_COLOR.prog, kh=30+(r.det.length?8+r.det.length*32:0); let ky=mid-kh/2;   // 종류: 구분 (색 이름표) + 자세히
      ctx.font=f(22,1); const kw=ctx.measureText(r.v.kind).width+26; ctx.fillStyle=bg; ctx.fillRect(cx+COLS[4][1]/2-kw/2, ky, kw, 30); ctx.fillStyle=fg; ctx.fillText(r.v.kind, cx+COLS[4][1]/2, ky+4); ky+=38;
      ctx.font=f(24); ctx.fillStyle='#4a4740'; r.det.forEach(s=>{ ctx.fillText(s, cx+COLS[4][1]/2, ky); ky+=32; }); }
    ctx.textAlign='left'; y+=r.h; });
  if(!rows.length){ ctx.textAlign='center'; ctx.font=f(28); ctx.fillStyle='#7a766b'; ctx.fillText('이 기간에 담당 일정이 없습니다', tx+TW/2, y+48); ctx.textAlign='left'; }
  ctx.restore();
  ctx.fillStyle='#9a968b'; ctx.font=f(22); ctx.fillText(`사유원 예약 현황 · 담당 「${me}」 · ${dtLabel(new Date().toISOString())} 출력`, PAD, H-FOOT+30);
  const blob=await new Promise(r=>cv.toBlob(r, 'image/png'));
  window.__bkPrintCanvas=cv;   // 마지막으로 만든 이미지 (확인용)
  return { blob, n:evs.length, name:`담당일정_${me}_${days[0].replace(/-/g,'')}-${days[days.length-1].slice(5).replace('-','')}.png` };
}
const bkDownload = (blob, name) => { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000); };
async function bkSave(files, title){   // 휴대폰은 이미지 보기 창(저장 · 길게 눌러 저장 · 공유), 컴퓨터는 파일로 내려받기 (여러 장이면 차례로)
  if(!files.length) return false;
  if(matchMedia('(pointer:coarse)').matches){ await bkShowImg(files[0], title); return true; }   // 2026-11-24: 바로 공유 창을 띄우면 「이미지 저장」이 없는 휴대폰이 있어서
  for(let i=0;i<files.length;i++){ bkDownload(files[i], files[i].name); if(i<files.length-1) await new Promise(r=>setTimeout(r, 450)); } return true; }
// 휴대폰: 만든 표 이미지를 화면 가득 보여 주고 「이미지 저장」(내려받기) · 「공유」 · 길게 눌러 저장 (2026-11-24)
const bkDataUrl = blob => new Promise((ok, no)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=no; r.readAsDataURL(blob); });
async function bkShowImg(file, title){
  let o=document.getElementById('bkImgView');
  if(!o){ o=document.createElement('div'); o.id='bkImgView'; o.className='bk-imgview';
    o.innerHTML='<div class="bkv-top"><b></b><button type="button" class="btn" data-bkv="x">닫기</button></div><div class="bkv-img"><img alt="일정 표 이미지"></div>'
      + '<div class="bkv-btns"><a class="btn primary" data-bkv="save">이미지 저장</a><button type="button" class="btn" data-bkv="share">공유</button></div><p class="bkv-hint">저장이 안 되면 위 이미지를 길게 눌러 「이미지 저장」 · 「사진에 저장」을 고르세요.</p>';
    o.addEventListener('click', async e=>{ const a=e.target.closest('[data-bkv]'); if(!a) return;
      if(a.dataset.bkv==='x'){ o.hidden=true; return; }
      if(a.dataset.bkv==='share'){ const f=o._file; try{ if(navigator.canShare && navigator.canShare({files:[f]})) await navigator.share({files:[f], title:o._title}); else toast('이 휴대폰은 공유를 지원하지 않습니다. 「이미지 저장」을 눌러 주세요.'); }catch(_){} } });
    document.body.appendChild(o); }
  const url=await bkDataUrl(file);
  o._file=file; o._title=title; o.querySelector('.bkv-top b').textContent=title; o.querySelector('img').src=url;
  const a=o.querySelector('[data-bkv="save"]'); a.href=url; a.download=file.name;
  o.querySelector('[data-bkv="share"]').hidden=!(navigator.canShare && navigator.canShare({files:[file]}));
  o.hidden=false;
}
async function bookPrintImg(){
  const me=bkMe(); if(!me){ toast('이름을 먼저 골라 주세요.'); $('#bookMeName').focus(); return; }
  const r=await bkTableImg(me, bkDays()); if(!r.blob){ toast('이미지를 만들지 못했습니다.'); return; }
  if(await bkSave([new File([r.blob], r.name, {type:'image/png'})], `${me} 님 일정`)) toast(r.n ? `「${me}」 일정 ${r.n}건을 표로 저장했습니다.` : '이 기간에 담당 일정이 없습니다 (빈 표를 저장했습니다).', 3000);
}
// 모든 담당 출력 (관리자용): 이 기간에 일정이 있는 담당마다 한 장씩 → 그 사람에게 나눠 주기
async function bookPrintAll(){
  const days=bkDays(), rows=[...bookRows(true), ...manualRows()].filter(x=>BOOK_CATS[x.cat] && days.includes(x.d));
  const names=[...new Set(rows.flatMap(x=>staffNames(x.staff)))].sort((a,b)=>a.localeCompare(b,'ko'));
  if(!names.length){ toast('이 기간에 담당이 들어간 일정이 없습니다.'); return; }
  const btn=$('#bookPrintAll'), txt=btn.textContent; btn.disabled=true; btn.textContent='만드는 중…';
  try{ const files=[]; for(const n of names){ const r=await bkTableImg(n, days); if(r.blob && r.n) files.push(new File([r.blob], r.name, {type:'image/png'})); }
    if(await bkSave(files, '담당별 일정')) toast(`담당 ${files.length}명의 일정을 한 장씩 저장했습니다 (${names.join(' · ')}).`, 4200); }
  finally{ btn.disabled=false; btn.textContent=txt; }
}
function openBook(c){ bookCatNow=c; bookEdit=null; bookImp=null; $('#bookModal').hidden=false; paintBook(); bookPageSync(); }
document.addEventListener('click', e=>{ const b=e.target.closest && e.target.closest('[data-book]'); if(b) openBook(b.dataset.book); const t=e.target.closest && e.target.closest('#bookTabs [data-bt]'); if(t){ bookCatNow=t.dataset.bt; bookEdit=null; paintBook(); bookPageSync(); } });
$('#bookClose').onclick=bookShut;
$('#bookPast').onchange=paintBook;
$('#bookModal').addEventListener('mousedown', e=>{ if(e.target.id==='bookModal') bookShut(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#bookModal').hidden && !BOOK_ONLY){ e.preventDefault(); $('#bookModal').hidden=true; } });
['#bookBody','#mbdbBody'].forEach(sel=>$(sel).addEventListener('click', e=>{ if(e.target.closest('button')) return; const tr=e.target.closest('tr[data-bopen]'); if(!tr || !tr.dataset.bopen) return; const r=cache.find(x=>x.id===tr.dataset.bopen); if(!r || BOOK_GUEST) return;
  if(BOOK_ONLY){ BOOK_ONLY=''; document.documentElement.classList.remove('book-only'); history.replaceState(null,'','group.html'); document.title='단체고객 응대 · 사유원 운영 보조 시스템'; $('#crumb').textContent='단체고객 응대'; }   // 공유 페이지 → 단체 화면으로 바뀌며 그 예약을 엶 (나의 할일 단독 화면과 같음)
  $('#bookModal').hidden=true; openRecordG(r); }));

// 몽몽마방 예약 목록 (직접 추가 · 수정 · 빼기)
function mbYear(m,d){ const t=new Date(); t.setHours(0,0,0,0); let y=t.getFullYear(); const c=new Date(y,m-1,d); if(c-t < -120*864e5) y++; else if(c-t > 245*864e5) y--; return y; }   // 연도가 없으면 오늘에 가까운 쪽
// 몽몽마방 예약 목록 = 직접 넣은 예약 + 단체 예약(예약접수)의 몽몽마방 식사 자동 (대관 · 도슨트 · 프로그램처럼, 지금 열어 둔 예약은 빼고) (2026-11-16)
// 몽몽마방 예약 현황에 들어갈 식사: 몽몽마방 줄(mabangL · 시간 · 메뉴) + 관람+식사 패키지 중 몽몽마방이 든 것(예: 「관람 + 몽몽마방 사유의 밥상」)
function mbMealsOf(x){ const out=[];
  if(x.mabangL || x.mabangTime || x.mabangMenu) out.push({t:x.mabangTime||'', p:numOf(x.mabangL)||'', m:x.mabangMenu||'', pay:x.mabangPay||''});
  viewsParse(x.views).forEach(v=>{ const pm=String(v.src).match(/\(관람,\s*(몽몽마방[^)]*)\)/); if(pm && v.qty) out.push({t:x.mabangTime||'', p:v.qty, m:pm[1].replace(/^몽몽마방\s*/,'')+' (관람 포함)', pay:''}); });
  return out; }
function mbAutoRows(){ try{
  const others = (cache||[]).filter(r=>isGroupRec(r) && r.id!==editingId && r.date && isBooked(stageOfRec(r))).map(r=>({r, x:xOf(r)}))
    .flatMap(({r,x})=>mbMealsOf(x).map(m=>({auto:true, id:r.id, d:x.date, n:x.org||x.contact||'(업체 미정)', ...m})));
  // 지금 입력 중인 예약도: 예약 내역에 몽몽마방(또는 관람+몽몽마방)을 넣으면 저장 · 예약접수 전이라도 바로 (2026-11-16)
  const mine = !BOOK_ONLY && rec && rec.date ? mbMealsOf(rec).map(m=>({auto:true, cur:true, id:'', d:rec.date, n:rec.org||(contactsOf(rec)[0]||{}).name||'(지금 예약)', ...m})) : [];
  return [...others, ...mine];
}catch(_){ return []; } }
function paintMbDb(){
  const db=mbDb(), today=todayYmd(), past=$('#bookPast').checked;   // 지난 예약도 보기 (예약 목록 창 공통)
  const all=[...db.rows.map((x,i)=>({...x, i})), ...mbAutoRows()];
  const F=bkFind(), list=all.filter(x=>(past || F.dated || x.d>=today) && bkFindOk(F, x.d, [x.n,x.m,x.t,x.note,x.staff].join(' '))).sort((a,b)=>(a.d+String(a.t)).localeCompare(b.d+String(b.t)));
  bkFindPaint(list.length);
  $('#mbdbSum').textContent = all.length ? `${all.length}건 · 단체 예약(가예약 · 예약확정)에서 자동 + 직접 추가${db.at?` · 직접 추가 마지막 저장 ${dtLabel(db.at)}${db.by?` (${db.by})`:''}`:''}` : '아직 없음';
  $('#mbdbHead').innerHTML = bkHeadHTML('mb');
  $('#mbdbBody').innerHTML = list.map(x=>bkRowHTML({d:x.d, tm:x.t, org:x.n, n:x.p?x.p+'명':'', x:esc(x.m||''), staff:x.staff||'', note:[x.pay==='마방'?'마방 결제':'', esc(x.note||'')].filter(Boolean).join(' · ')},
      `${x.auto?'r ':''}${x.d<today?'past':''}${rec.date && x.d===rec.date?' same':''}`, x.auto && !x.cur?` data-bopen="${esc(x.id)}"`:'',
      `${x.cur ? '<span class="tag call" title="지금 화면에서 입력 중인 예약 (저장 전이어도 바로)">지금 이 예약</span>' : x.auto ? '<span class="tag" title="단체 예약에서 자동 · 줄을 누르면 그 예약">단체예약</span>' : `<button type="button" class="btn sm" data-mbedit="${x.i}">수정</button><button type="button" class="del" data-mbdel="${x.i}" title="이 예약 빼기">×</button>`}`)).join('')
    || `<tr><td colspan="8" class="empty">${F.on?'찾는 조건에 맞는 예약이 없습니다.':all.length?'앞으로 있을 몽몽마방 예약이 없습니다.':'위 「＋ 직접 추가」로 몽몽마방 예약을 넣으세요.'}</td></tr>`;
  labelCells('#mbdbBody', BK_COLS('mb'));   // 휴대폰: 칸마다 이름 (카드 모양, 2026-11-21)
}
async function mbDbSave(rows, msg){
  if(BOOK_GUEST){ toast('로그인한 사람만 고칠 수 있습니다.'); return; }
  const old=cache.find(x=>x.id===MBDB_ID), now=new Date().toISOString(), keep=ymd(new Date(Date.now()-90*864e5));
  rows=rows.filter(x=>x.d>=keep).sort((a,b)=>(a.d+a.t).localeCompare(b.d+b.t));   // 90일 지난 것은 정리
  const item={...(old||{}), id:MBDB_ID, callType:MBDB_TYPE, saved:now, takenBy:savedOwner()||'', summary:`몽몽마방 예약 목록 ${rows.length}건`, history:JSON.stringify({rows, at:now, by:savedOwner()||''})};
  await store.put(item); const ci=cache.findIndex(x=>x.id===MBDB_ID); if(ci>=0) cache[ci]=item; else cache.push(item);
  if(!$('#bookModal').hidden) paintBook(); renderDayAll(); toast(msg);
}
$('#mbdbBody').addEventListener('click', e=>{ const i=e.target.dataset.mbdel; if(i==null) return; if(!mbDb().rows[+i]) return;
  if(BOOK_GUEST){ toast('로그인한 사람만 뺄 수 있습니다.'); return; }
  openBkDel({db:'mb', i:+i}); });   // 사유를 적는 창 → 수정 기록에 남기고 뺌 (2026-11-21)
// 사유 창 · 수정 기록 창: Esc = 닫기, 사유 칸에서 Ctrl+Enter = 빼기
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && $('#bkDelModal') && !$('#bkDelModal').hidden){ e.preventDefault(); e.stopImmediatePropagation(); closeBkDel(); return; }
  if(e.key==='Escape' && $('#bkLogModal') && !$('#bkLogModal').hidden){ e.preventDefault(); e.stopImmediatePropagation(); $('#bkLogModal').hidden=true; return; }
  if(e.key==='Enter' && e.ctrlKey && e.target.id==='bkDelWhy'){ e.preventDefault(); doBkDel(); }
}, true);

// 확인할 것(팝업): 입력된 값끼리 맞지 않거나, 관리자 사이트 기준 자리가 모자랄 때
function fieldWarnings(r){
  const w=[];
  if(r.date){ const d=new Date(r.date+'T00:00'), t=new Date(); t.setHours(0,0,0,0); if(d<t) w.push({field:'date', reason:'지난 날짜입니다. 방문일을 다시 확인하세요.'}); }
  if(r.tin && !fmtTime(r.tin)) w.push({field:'tin', reason:'입장 시각을 24시간으로 적어 주세요 (예: 13:30).'});
  // 인원 맞추기 (2026-11-20): 관람 인원 = 예약 내역의 관람 · 관람+식사 인원 합 · 식사를 따로 예약했으면 (식사 + 관람+식사) = 관람 인원. 관람 · 식사 · 관람+식사 구분은 품목 관리 기준
  { const n0=numOf(r.people), cA=v=>v ? (numOf(v)||n0) : 0, vs=viewsParse(r.views);
    const kindOf = s => { const it=catalogItems().find(x=>normSrc(x.src)===normSrc(daySrc(s, r))); return it ? it.kind : /\(관람,/.test(s) ? 'package' : 'view'; };
    const viewQ=vs.filter(x=>kindOf(x.src)!=='package').reduce((a,x)=>a+(+x.qty||0),0), pkgQ=vs.filter(x=>kindOf(x.src)==='package').reduce((a,x)=>a+(+x.qty||0),0)+cA(r.sadam1)+cA(r.sadam2)+cA(r.sadamD), area=viewQ+pkgQ+cA(r.haeorum);
    if(n0 && area && area!==n0) w.push({field:'people', blur:1, reason:`관람 인원은 ${n0}명인데 예약 내역의 관람 · 관람+식사 인원(성인 + 학생)을 더하면 ${area}명입니다. 인원을 확인하세요.`});
    const meal=cA(r.mabangL), base=n0||area; if(meal && base && meal+pkgQ!==base) w.push({field:'mabangL', blur:1, reason:`식사 인원(몽몽마방 ${meal}명${pkgQ?` + 관람+식사 ${pkgQ}명`:''} = ${meal+pkgQ}명)이 관람 인원 ${base}명과 다릅니다. 식사 인원을 확인하세요.`}); }
  if(r.tout && !fmtTime(r.tout)) w.push({field:'tout', reason:'퇴장 시각을 24시간으로 적어 주세요 (예: 17:00).'});
  if(r.tin && r.tout && fmtTime(r.tin) && fmtTime(r.tout) && fmtTime(r.tout)<=fmtTime(r.tin)) w.push({field:'tout', reason:'퇴장 시각이 입장보다 빠릅니다. 24시간 표시인지 확인하세요 (오후 3시 = 15:00).'});
  if(r.date && r.tbdDate && r.tbdDate>r.date) w.push({field:'tbdDate', reason:'미정 항목 답변일이 방문일보다 늦습니다.'});
  else if(r.tbd && r.date && r.tbdDate && r.tbdDate>tbdLimit(r.date)) w.push({field:'tbdDate', reason: r.tbdLate ? `${tbdLimitName(r.date)}보다 늦음 · 사유: ${r.tbdLate}` : `미정 항목 답변일은 ${tbdLimitName(r.date)}(${mdLabel(tbdLimit(r.date))})까지입니다. 늦추려면 사유를 적어야 합니다.`});
  if(typeof SPECIAL!=='undefined') specialCounts(r).filter(s=>s.proof).forEach(s=>w.push({field:s.k, reason:`${s.n}명 ${s.name} 할인 → 방문 때 ${s.proof} 지참을 안내하세요.`}));
  const day = adminData && adminData.days && adminData.days[r.date];
  if(day) Object.entries(ADMIN_SLOT).forEach(([k,[slot,name]])=>{
    const s=day[slot], want=numOf(r[k]); if(!s || !want) return;
    const left = s.max!=null && s.cur!=null ? s.max-s.cur : null;
    if(s.close) w.push({field:k, reason:`관리자 사이트에서 ${name}이(가) 마감입니다. 다른 시간을 안내하세요.`});
    else if(left!=null && want>left) w.push({field:k, reason:`${name} 남은 자리는 ${left}명인데 ${want}명입니다.`});
  });
  return w;
}

// 이상한 값이 새로 생기면 (입력을 멈추고 1.2초 뒤) 바로 팝업. 한 번 보여 준 것은 이 예약을 여는 동안 다시 띄우지 않음
let warnSeen=new Set(), warnT=null;
const warnKey = w => w.field+'|'+w.reason;   // 인원 맞추기(blur)는 숫자가 바뀌면 다시 알림
// 인원 칸(관람 인원 · 예약 내역의 성인 · 학생 · 수량)을 나갈 때: 관람 인원 ≠ 성인 + 학생 합 · 식사 인원이 안 맞으면 팝업. 같은 줄 성인 → 학생으로 옮길 때는 아직 안 띄움 (2026-11-20)
document.addEventListener("focusout", e=>{ const el=e.target; if(!el || !(el.id==="f_people" || (el.closest?.("#itemsBox") && (el.dataset.iq!=null || el.dataset.iqa!=null || el.dataset.istu!=null)))) return;
  setTimeout(()=>{ const a=document.activeElement, pair=el.closest(".it-q2"); if(pair && a && pair.contains(a)) return; checkWarn(true); }, 0); });
function scheduleWarn(){ clearTimeout(warnT); warnT=setTimeout(checkWarn, 1200); }
function checkWarn(onBlur){   // onBlur: 칸을 나갈 때 — 인원 맞추기(blur) 경고는 이때만 (치는 동안엔 안 띄움, 2026-11-20)
  if(!window.__autoReady || restoring) return;
  const all=fieldWarnings(rec).filter(w=>!w.blur || onBlur);
  const fresh=all.filter(w=>!warnSeen.has(warnKey(w)));
  if(!fresh.length) return;
  if([...document.querySelectorAll('.modal')].some(m=>!m.hidden)){ clearTimeout(warnT); warnT=setTimeout(()=>checkWarn(onBlur), 1200); return; }   // 다른 팝업이 떠 있으면 닫힌 뒤에
  fresh.forEach(w=>warnSeen.add(warnKey(w)));
  $('#warnList').innerHTML = fresh.map(w=>`<li><b>${esc(LABEL[w.field]||w.field)}</b>${rec[w.field]?` ${esc(rec[w.field])}`:''} · ${esc(w.reason)}</li>`).join('');
  $('#warnModal').hidden=false; setTimeout(()=>$('#warnOk').focus(),0);
}
const resetWarn = (seed) => { warnSeen=new Set(seed ? fieldWarnings(rec).map(warnKey) : []); clearTimeout(warnT); };   // 저장된 예약을 열 때는 원래 있던 것은 띄우지 않음
$('#warnOk').onclick=()=>{ $('#warnModal').hidden=true; };
$('#warnModal').addEventListener('click', e=>{ if(e.target.id==='warnModal') $('#warnModal').hidden=true; });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#warnModal').hidden){ e.preventDefault(); $('#warnModal').hidden=true; } });

function autoSummary(){ return ['단체', rec.org, rec.people&&`${rec.people}명`, rec.date&&dateLabel(rec.date), rec.meal&&rec.meal!=='없음'&&`식사 ${rec.meal}`].filter(Boolean).join(' · '); }

