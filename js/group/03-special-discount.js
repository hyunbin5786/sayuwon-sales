// ▣ js/group/03-special-discount.js — 품목마다 특별 할인(팝업) · 예약 내역 줄(itemRows): 수량 · 관람 인원 자동 · 품목 고르기 · 줄 그리기
// ===== 품목마다 특별 할인 (2026-11-16): 예약 내역 줄의 「특별할인」 버튼 → 팝업(특별 할인 인원 · 기타 할인) =====
// rec.isp = "줄=dKansong:2,dMerit:1|비과세(사유원):과세(신라)|사유; …" (시트 비고 칸 '항목 특별 할인')
// 예약 전체 칸(간송 · 국가유공자 · 군위 주민 · 대구대교구 인원, 기타 할인 비과세 · 과세 · 사유)은 줄마다 넣은 것의 합 → 안내 문구 · 전산 대조 · 합계가 그대로 씀
const SP_KEYS = Object.keys(SPECIAL_LABEL);
const ispMap = r => { const o={}; String((r&&r.isp)||'').split(/\s*;\s*/).forEach(s=>{ const i=s.indexOf('='); if(i<=0) return; const [cnt, money, why] = s.slice(i+1).split('|'), [tf, tx]=String(money||'').split(':'); const sp={};
  String(cnt||'').split(',').forEach(p=>{ const [a,n]=p.split(':'); if(SP_KEYS.includes(a) && +n>0) sp[a]=+n; });
  o[s.slice(0,i).trim()]={sp, tf:Math.max(0,parseInt(tf)||0), tx:Math.max(0,parseInt(tx)||0), why:String(why||'').trim()}; }); return o; };
const ispEmpty = v => !v || (!Object.keys(v.sp||{}).length && !v.tf && !v.tx);
const ispStr = m => Object.entries(m).filter(([,v])=>!ispEmpty(v)).map(([k,v])=>`${k}=${Object.entries(v.sp).map(([a,n])=>`${a}:${n}`).join(',')}|${v.tf||0}:${v.tx||0}|${String(v.why||'').replace(/[;|=\/]/g,' ').trim()}`).join('; ');
function ispSumUp(){   // 줄마다 넣은 것 → 예약 전체 칸
  const m=Object.values(ispMap(rec)), set=(k,v)=>{ v=v?String(v):''; if(String(rec[k]||'')!==v){ rec[k]=v; touched.add(k); } };
  SP_KEYS.forEach(k=>set(k, Math.max(0, ...m.map(v=>v.sp[k]||0))));   // 같은 분이 여러 품목(관람 · 식사 등)에서 할인받으면 품목마다 넣으므로, 인원은 품목 중 가장 큰 수 (합치면 2배로 셈)
  set('etcDiscTf', m.reduce((s,v)=>s+v.tf,0)); set('etcDiscTx', m.reduce((s,v)=>s+v.tx,0));
  set('etcDiscWhy', [...new Set(m.filter(v=>v.tf||v.tx).map(v=>v.why).filter(Boolean))].join(', '));
  if(rec.etcDisc){ set('etcDisc',''); set('etcDiscTo',''); }
}
function ispMigrate(k){   // 예약 전체로 들어 있던 특별 할인 · 기타 할인(예전 기록 · 전산 내역에서 읽은 것) → 지금 연 줄로 옮김 (팝업에 바로 보여서 같은 인원을 또 넣지 않게)
  if(String(rec.isp||'').trim()) return;
  const sp={}; SP_KEYS.forEach(x=>{ const n=parseInt(rec[x])||0; if(n>0) sp[x]=n; }); const es=etcSplit(rec);
  if(!Object.keys(sp).length && !es.tx && !es.tf) return;
  rec.isp=ispStr({[dkey(k)]:{sp, tf:es.tf, tx:es.tx, why:rec.etcDiscWhy||''}}); touched.add('isp');
}
function setItemSp(k, val){   // val = {sp, tf, tx, why} · null = 이 줄 특별 할인 없앰
  ispMigrate(k); const m=ispMap(rec);
  if(val && !ispEmpty(val)) m[dkey(k)]=val; else delete m[dkey(k)];
  const s=ispStr(m); if(s!==String(rec.isp||'')){ rec.isp=s; touched.add('isp'); }
  ispSumUp();
}
const ispOf = k => ispMap(rec)[dkey(k)];
function spBtnHTML(k){ const v=ispOf(k), on=!ispEmpty(v);
  const t = on ? [...Object.entries(v.sp).map(([a,n])=>`${SPECIAL_LABEL[a].replace(/ 할인$/,'')} ${n}명`), (v.tf||v.tx) && `기타 -${wonTxt(v.tf+v.tx)}원`].filter(Boolean).join(' · ') : '';
  return `<span class="spwrap" data-spwrap="${esc(k)}"><button type="button" class="spbtn${on?' on':''}" data-spopen="${esc(k)}" title="이 품목에 특별 할인(간송 · 국가유공자 · 군위 주민 · 대구대교구 · 직원) · 기타 할인 넣기">특별할인${t?` <b>${esc(t)}</b>`:''}</button></span>`; }
let spKey=null;
function openSp(k){ spKey=k; ispMigrate(k); $('#spEdit').hidden=true; $('#spMain').hidden=false; $('#spEditBtn').hidden=false; document.querySelectorAll('#itemsBox [data-spwrap]').forEach(b=>{ b.outerHTML=spBtnHTML(b.dataset.spwrap); });   // 예전 기록이면 그 할인이 들어간 줄에 먼저 표시
  const v=ispOf(k) || {sp:{}, tf:0, tx:0, why:''};
  $('#spTitle').textContent = `특별 할인 · ${itemName(k)}`;
  $('#spPeople').innerHTML = SPECIAL.filter(s=>!s.off || v.sp[s.k]).map(s=>`<label title="${esc(s.name)} · ${s.rate===1?'무료':Math.round(s.rate*100)+'%'}${s.proof?" · 지참: "+esc(s.proof):""}">${esc(s.short)} <small>${s.rate===1?'무료':Math.round(s.rate*100)+'%'}</small><input data-spk="${s.k}" inputmode="numeric" data-ime="num" maxlength="3" autocomplete="off" value="${v.sp[s.k]||''}">명</label>`).join('');
  $('#spTf').value = v.tf ? wonTxt(v.tf) : ''; $('#spTx').value = v.tx ? wonTxt(v.tx) : ''; $('#spWhy').value = v.why||'';
  const n=numOf(itemQty(k)); $('#spHint').textContent = n ? `이 품목 ${n}${itemUnit(k)} 중 특별 할인 인원은 단체 할인과 비교해 큰 쪽 하나만 적용됩니다. 같은 분이 다른 품목에서도 할인받으면 그 품목에도 넣으세요 (증빙 안내 인원은 품목 중 가장 큰 수).` : '';
  $('#spModal').hidden=false; setTimeout(()=>$('#spPeople input')?.focus(), 0); }
function spApply(){ if(spKey==null) return;
  const sp={}; document.querySelectorAll('#spPeople [data-spk]').forEach(el=>{ const n=parseInt(el.value.replace(/\D/g,''))||0; if(n>0) sp[el.dataset.spk]=n; });
  const tot=Object.values(sp).reduce((a,b)=>a+b,0), q=numOf(itemQty(spKey));
  if(q && tot>q){ toast(`특별 할인 인원(${tot}명)이 이 품목 수량(${q})보다 많습니다.`); return; }
  const num=id=>Math.max(0, parseInt($(id).value.replace(/\D/g,''))||0), tf=num('#spTf'), tx=num('#spTx'), why=$('#spWhy').value.trim();
  if((tf||tx) && !why){ toast('기타 할인 사유를 적어 주세요.'); $('#spWhy').focus(); return; }
  setItemSp(spKey, {sp, tf, tx, why}); $('#spModal').hidden=true; spKey=null; itemChanged(false, true); renderSide(); startTimer(); }
document.addEventListener('click', e=>{ const b=e.target.closest?.('#itemsBox [data-spopen]'); if(b){ openSp(b.dataset.spopen); return; }
  if(e.target.id==='spOk') spApply(); else if(e.target.id==='spCancel' || e.target.id==='spModal') { $('#spModal').hidden=true; spKey=null; }
  else if(e.target.id==='spClear' && spKey!=null){ setItemSp(spKey, null); $('#spModal').hidden=true; spKey=null; itemChanged(false, true); renderSide(); startTimer(); } });
document.addEventListener('input', e=>{ const el=e.target; if(!el.closest?.('#spMain') || el.id==='spWhy') return; const c=el.value.replace(/[^\d,]/g,''); if(c!==el.value) el.value=c; });
document.addEventListener('focusout', e=>{ const el=e.target; if(el.id==='spTf' || el.id==='spTx'){ const n=parseInt(el.value.replace(/\D/g,''))||0; el.value = n ? wonTxt(n) : ''; } });
document.addEventListener('keydown', e=>{ if($('#spModal').hidden) return; if(!$('#spEdit').hidden){ if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); closeSpd(); } else if(e.key==='Enter' && !e.isComposing && e.target.tagName==='INPUT'){ e.preventDefault(); } return; } if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); $('#spModal').hidden=true; spKey=null; } else if(e.key==='Enter' && e.target.closest?.('#spModal')){ e.preventDefault(); spApply(); } }, true);
function setItemNote(k, v){ const m=inotesMap(); v=String(v||'').replace(/[;=]/g,',').trim(); if(v) m[k]=v; else delete m[k]; rec.inotes=Object.entries(m).map(([a,b])=>`${a}=${b}`).join('; '); touched.add('inotes'); }
const itemName = k => k==='view' ? '관람' : /^v:/.test(k) ? itemLabel(daySrc(k.slice(2), rec)) : k==='mb' ? '몽몽마방 '+(rec.mabangMenu||'') : /^g:/.test(k) ? goodsName(k.slice(2)) : (SADAM_ITEMS.find(x=>x[0]===k)||[])[1] || LABEL[k] || k;
const itemNotesText = () => Object.entries(inotesMap()).filter(([k])=>itemKeysFromRec().includes(k) || (k==='seminar2' && rec.seminar && sem2On(rec)) || semXKeys(rec).includes(k)).map(([k,v])=>`${isSemX(k) ? '세미나 도슨트' : itemName(k)}: ${v}`);   // 비고가 있는 항목만
const itemUnit = k => itemKind(k)==='goods' ? '개' : itemKind(k)==='prog' ? UNIT(k) : '명';
const itemHasStaff = k => ['prog','goods'].includes(itemKind(k));
const itemStfKey = k => itemKind(k)==='goods' ? 'stf_goods' : 'stf_'+k;   // 굿즈 담당은 굿즈 전체 하나
function itemKeysFromRec(){
  return [   /* 관람 자동 줄 없음: 관람권도 「항목 추가」로 직접 */ ...viewsParse(rec.views).map(v=>'v:'+v.src), ...SADAM_ITEMS.map(x=>x[0]).filter(k=>rec[k]), ...(rec.mabangL||rec.mabangMenu||rec.mabangTime ? ['mb'] : []),
    ...PROG_KEYS().filter(k=>rec[k]), ...goodsParse(rec.goods).map(g=>'g:'+g.src)];
}
function itemQty(k){ const t=itemKind(k);
  if(t==='view') return String(effViewN(rec));   // 기본 관람 줄 = 관람 인원 − 다른 관람 영역 (직접 줄였으면 그 수)
  if(t==='varea'){ const v=viewsParse(rec.views).find(x=>x.src===k.slice(2)); return v ? String(v.qty) : ''; }
  if(t==='mb') return rec.mabangL||'';
  if(t==='goods'){ const g=goodsParse(rec.goods).find(x=>x.src===k.slice(2)); return g ? String(g.qty) : ''; }
  return t==='new' ? '' : (rec[k]||''); }
function setItemQty(k, v){ const t=itemKind(k); v=String(v||'').trim();
  if(t==='view'){   // 기본 관람 줄: 관람 인원이 비었으면 관람 인원으로, 남은 인원과 같으면 자동, 줄이면 그 수
    if(!numOf(rec.people)){ rec.people=v; touched.add('people'); if(rec.viewN){ rec.viewN=''; touched.add('viewN'); } return; }
    const nv = numOf(v)===viewAuto(rec) ? '' : v; if(String(rec.viewN||'')!==nv){ rec.viewN=nv; touched.add('viewN'); } return; }
  if(t==='varea'){ const list=viewsParse(rec.views), src=k.slice(2), q=Math.max(0, parseInt(v)||0), x=list.find(y=>y.src===src); if(x) x.qty=q; else if(q) list.push({src, qty:q}); rec.views=goodsJoin(list); touched.add('views'); if(q) itemPend.delete(k); else itemPend.add(k); syncPeopleFromArea(); return; }
  if(t==='mb'){ rec.mabangL=v; touched.add('mabangL');
    if(v && !rec.mabangTime){ const tt=fmtTime(rec.tin); if(tt){ rec.mabangTime=`${tt}~${String(Math.min(+tt.slice(0,2)+1,23)).padStart(2,'0')}${tt.slice(2)}`; touched.add('mabangTime'); } }
    if(v) mbPayDefault(); }   // 몽몽마방 시간 기본 = 입장부터 1시간 · 결제방식 기본 = 미정
  else if(t==='goods'){ const list=goodsParse(rec.goods), src=k.slice(2), q=Math.max(0, parseInt(v)||0), g=list.find(x=>x.src===src); if(g) g.qty=q; else if(q) list.push({src, qty:q}); rec.goods=goodsJoin(list); touched.add('goods'); }
  else if(t!=='new'){ rec[k]=v; touched.add(k); if(t==='sadam' || k==='haeorum') syncPeopleFromArea(); }
  if(v && v!=='0') itemPend.delete(k); else itemPend.add(k);
}
// 관람 인원이 비어 있으면 예약 내역의 관람 · 관람+식사 줄 인원 합으로 채움 (이렇게 채운 동안은 줄 인원을 바꾸면 따라감 · 직접 고치면 그만) → 할인(19명까지 사전예약 · 20명부터 단체예약)이 바로

function syncPeopleFromArea(){ const s=viewsParse(rec.views).reduce((a,x)=>a+(+x.qty||0),0)+numOf(rec.sadam1)+numOf(rec.sadam2)+numOf(rec.sadamD)+numOf(rec.haeorum);
  if(numOf(rec.people) && !peopleAuto) return; if(!s && !peopleAuto) return; rec.people = s ? String(s) : ''; peopleAuto=!!s; touched.add('people'); const el=document.getElementById('f_people'); if(el && document.activeElement!==el) el.value=rec.people; }
document.addEventListener('input', e=>{ if(e.target && e.target.id==='f_people') peopleAuto=false; }, true);   // 관람 인원을 직접 고치면 자동으로 따라가지 않음
function mbPayDefault(){ if(rec.mabangPay) return; rec.mabangPay='미정'; touched.add('mabangPay'); syncPayTbd(rec); touched.add('tbd'); }   // 몽몽마방을 새로 넣으면 결제방식 = 미정 → 미정 항목 '몽몽마방 결제' (고객님께 여쭤 볼 것)
const mbTimes = () => { const p=String(rec.mabangTime||'').split('~'); return [p[0]||'', p[1]||'']; };   // 몽몽마방 시간 "12:00~13:00" → [시작, 끝]
const plus1h = t => { const f=fmtTime(t); return f ? `${String(Math.min(+f.slice(0,2)+1,23)).padStart(2,'0')}${f.slice(2)}` : ''; };
const plusH = (t, h) => { const f=fmtTime(t); if(!f) return ''; const m=+f.slice(0,2)*60 + +f.slice(3,5) + Math.round((h||1)*60), e=Math.min(m, 23*60+59); return `${String(Math.floor(e/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`; };   // 시작 + h시간
const tmTimes = k => { const p=String(rec['tm_'+k]||'').split('~'); return [p[0]||'', p[1]||'']; };   // 프로그램 시간대 "13:00~15:00" → [시작, 끝]
const progHours = k => /^seminar\d?$/.test(k) ? 0.5 : itemUnit(k)==='시간' ? Math.max(1, numOf(itemQty(k))||1) : 1;   // 끝 = 시작 + 1시간 (시간 프로그램은 예약한 시간만큼 · 세미나 도슨트는 30분, 2026-11-18)
function clearItem(k){ const t=itemKind(k);
  if(ispOf(k)) setItemSp(k, null);   // 그 줄의 특별 할인 · 기타 할인도
  if(itemStu(k)) setItemStu(k, 0);   // 그 줄의 학생 인원도
  if(itemNote(k)) setItemNote(k, '');
  if(k==='seminar') Object.keys(inotesMap()).filter(isSemX).forEach(x=>setItemNote(x, ''));   // 2회차부터의 세미나 비고도
  if(SLOT_KEYS.includes(k) && slotsMap(rec)[k]) setItemSlots(k, []);   // 대관에 더한 시작 · 끝도 (2026-11-27)
  if(t==='view') return;   // 관람 줄은 관람 인원 칸으로만
  if(t==='varea'){ rec.views=goodsJoin(viewsParse(rec.views).filter(x=>x.src!==k.slice(2))); touched.add('views'); itemPend.delete(k); return; }
  if(t==='mb'){ ['mabangL','mabangMenu','mabangTime','mabangPay'].forEach(x=>{ if(rec[x]){ rec[x]=''; touched.add(x); } }); syncPayTbd(rec); touched.add('tbd'); }   // 몽몽마방을 빼면 미정 항목 '몽몽마방 결제'도
  else if(t==='goods'){ rec.goods=goodsJoin(goodsParse(rec.goods).filter(x=>x.src!==k.slice(2))); touched.add('goods'); if(!rec.goods && rec.stf_goods){ rec.stf_goods=''; touched.add('stf_goods'); } }
  else if(t!=='new'){ [k, 'stf_'+k, 'tm_'+k, 'crs_'+k, 'plc_'+k, ...(k==='seminar' ? SEM2_IX : [])].forEach(x=>{ if(rec[x]){ rec[x]=''; touched.add(x); } }); }
  itemPend.delete(k);
}
// 담당 고르기 (2026-11-24): 이름을 치지 않고 멤버 목록(멤버관리)에서 고름 → 그 사람에게 「단체 준비」 과업이 감 (이름이 정확히 같아야 해서)
//  목록에 없는 사람은 맨 아래 「＋ 새 멤버 추가…」 → 이름만 넣으면 멤버로 바로 만듦 (임시 사번 NEW-… · 사번 · 연락처는 멤버관리에서)
//  예전에 쳐 둔 이름이 멤버가 아니면 「(멤버 아님)」으로 그대로 보임
let MEMBER_NAMES = (()=>{ try{ return JSON.parse(localStorage.getItem('sy_member_names')||'[]')||[]; }catch(_){ return []; } })();
async function loadMemberNames(again){ try{ const j=await SY.callRaw({action:'members'}); if(!j || !j.ok) return;
    const L=[...new Set((j.members||[]).map(m=>String(m.name||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
    const changed=L.join('|')!==MEMBER_NAMES.join('|'); MEMBER_NAMES=L; try{ localStorage.setItem('sy_member_names', JSON.stringify(L)); }catch(_){}
    if((changed || again) && typeof renderItems==='function' && document.getElementById('itemsBox')) renderItems(true); }catch(_){} }
const staffSelHTML = (k, v, title) => { const cur=String(v||'').trim(), has=MEMBER_NAMES.includes(cur);
  return `<select class="it-stfsel" data-is="${esc(k)}" title="${esc(title||'담당')}"><option value="">담당 고르기 (필수)</option>${MEMBER_NAMES.map(n=>`<option value="${esc(n)}"${n===cur?' selected':''}>${esc(n)}</option>`).join('')}`
    + (cur && !has ? `<option value="${esc(cur)}" selected>${esc(cur)} (멤버 아님)</option>` : '') + `<option value="__new">＋ 새 멤버 추가…</option></select>`; };
// 대관에 더한 시작 · 끝 (2026-11-27): rec.islots 에 줄마다 "시작~끝" (js/group/01-fields.js slotsMap) — 첫 시간대는 예전처럼 tm_키
function setItemSlots(k, arr){ const m=slotsMap(rec); if(arr.length) m[k]=arr.map(v=>String(v||'').replace(/[;=,]/g,'').trim()); else delete m[k]; const s=Object.entries(m).map(([a,b])=>`${a}=${b.join(',')}`).join('; '); if(s!==String(rec.islots||'')){ rec.islots=s; touched.add('islots'); } }
const rawSlots = k => SLOT_KEYS.includes(k) ? (slotsMap(rec)[k]||[]) : [];   // 화면용: 시간 수 칸을 잠깐 비워도 더한 줄은 그대로 (전산 비고 등은 itemSlotTimes — 품목이 있을 때만)
const slotIxVal = ix => { const m=String(ix).match(/^sl([SE]):(.+):(\d+)$/); if(!m) return ''; const p=String(rawSlots(m[2])[+m[3]]||'').split('~'); return (m[1]==='S' ? p[0] : p[1])||''; };
const slotsHTML = k => { const L=rawSlots(k);
  return L.map((v,i)=>{ const p=String(v||'').split('~');
      return `<div class="it-sem2 it-slot"><span class="it-semn">시간 ${i+2}</span><label class="it-xl">시작 <input class="it-x" data-ix="slS:${esc(k)}:${i}" data-tp="1" readonly title="더한 시작 시각. 넣으면 끝나는 시각이 1시간 뒤로 (고칠 수 있음)" value="${esc(p[0]||'')}"></label>`
        + `<label class="it-xl">끝 <input class="it-x" data-ix="slE:${esc(k)}:${i}" data-tp="1" readonly title="더한 끝나는 시각" value="${esc(p[1]||'')}"></label>`
        + `<button type="button" class="it-slotdel" data-slotdel="${esc(k)}:${i}" title="이 시작 · 끝 빼기" aria-label="이 시작 · 끝 빼기">×</button></div>`; }).join('')
    + (L.length<SLOT_MAX ? `<div class="it-sem2 it-slot it-slotadd"${numOf(rec[k])>=1?'':' hidden'}><button type="button" class="btn primary" data-slotadd="${esc(k)}" title="대관을 여러 번에 나눠 쓸 때 시작 · 끝을 한 줄 더 넣습니다 (금액 · 시간 수는 그대로)">＋ 시작 · 끝 더하기</button></div>` : ''); };
// 세미나 도슨트 2회 이상: 회차마다 담당 칸 (1회차 = stf_seminar · 2회차 = stf_seminar2 · 3회차 = stf_seminar3 …, 2026-11-21 · 3회차부터 2026-11-27)
const semStfHTML = (k, tt) => { const v=String(rec['stf_'+k]||''); return `<label class="it-xl it-stf${v.trim()?'':' missing'}">담당 ${staffSelHTML(k, v, tt)}</label>`; };
// 드롭다운: 묶음(optgroup)별 항목. 다른 줄에서 이미 고른 항목은 못 고름
function itemSelectHTML(k, rows){
  const used=new Set(rows.filter(x=>x!==k)), mbUsed=used.has('mb');
  const opt=(v,l,dis,sel)=>`<option value="${esc(v)}"${dis?' disabled':''}${sel?' selected':''}>${esc(l)}</option>`;
  const pr=()=>'';   // 드롭다운에는 품목 이름만 (가격은 옆 칸에)
  const cur=mbMenuOf(rec);
  let h=`<option value="">항목 고르기</option>`;
  // 관람 · 관람+식사: 관람권(기본 관람 줄과 다른 것) · 관람 포함 패키지 전부 · 새벽 해오름 산책. 사담 1부 · 2부 · 디너는 예전 칸(sadam1 · 2 · D)
  const day=rec.date && isRedDay(rec.date) ? '주말/공휴일' : '평일', base=normSrc(viewSrcOf(rec));
  const SADAM_OF = {'사담런치1부':'sadam1','사담런치2부':'sadam2','사담디너':'sadamD'};
  const area = catalogItems().filter(it=>(it.kind==='view' || it.kind==='package') && (!it.merged || (itemKind(k)==='varea' && normSrc(daySrc(k.slice(2), rec))===normSrc(it.src))) && !/네이버/.test(it.src) && String(it.src).startsWith(day) && it.price!=null);   // 관람권(9~18 · 13~18 · 학생 등)도 모두 여기서 고름
  h+=`<optgroup label="관람 · 관람+식사">${area.map(it=>{ const pm=String(it.src).match(/\(관람,\s*(.+)\)$/), sk=pm ? SADAM_OF[normSrc(pm[1])] : null, v=sk || 'v:'+it.src;
      return opt(v, (pm ? '관람 + '+pm[1] : viewLabel(it.src)), used.has(v), k===v || (itemKind(k)==='varea' && normSrc(daySrc(k.slice(2), rec))===normSrc(it.src))); }).join('')}`
    + `${FIELDS.some(f=>f[1]==='haeorum') ? opt('haeorum', '새벽 해오름 산책 (관람료 포함)'+pr(progSrc('haeorum', rec)), used.has('haeorum'), k==='haeorum') : ''}</optgroup>`;
  h+=`<optgroup label="몽몽마방">${mbMenus().map(m=>opt('mb:'+m.name, `몽몽마방 ${m.name}`, mbUsed, k==='mb' && cur && cur.name===m.name)).join('')}${k==='mb' && !cur ? opt('mb:', rec.mabangMenu ? `몽몽마방 ${rec.mabangMenu} (예전 메뉴 · 다시 고르기)` : '몽몽마방 (메뉴 고르기)', false, true) : ''}</optgroup>`;
  [['프로그램(개별)','개별 프로그램'],['프로그램(시간)','시간 프로그램']].forEach(([g,l])=>{
    h+=`<optgroup label="${l}">${FIELDS.filter(f=>f[0]===g && !isSub(f[1]) && f[1]!=='haeorum' && !COUPON_IN_GOODS.includes(f[1]) && (f[1]!=='seminar2' || k==='seminar2')).map(f=>opt(f[1], f[2]+pr(progSrc(f[1], rec)), used.has(f[1]), k===f[1])).join('')}</optgroup>`; });
  const gi=goodsItems();
  // 굿즈 = 품목 관리에서 구분이 굿즈인 품목 (품목 관리 품명 그대로). 예전 전용 칸이 있는 품목(음료쿠폰(가가빈빈) = gaga)은 그 칸으로 한 번만 (2026-11-18)
  // 음료쿠폰 (2026-11-21): 몽몽차방 · 가가빈빈 음료(아메리카노 · 모과차 등)는 품목에서 지우고 음료쿠폰으로 통합 → 음료쿠폰(가가빈빈 · 몽몽차방)은 굿즈 묶음 맨 위. 저장은 그대로 (gaga 칸 · 굿즈 g:품목)
  const gk = it => goodsKeyOf(it.src), gv = it => gk(it) || 'g:'+it.src, gl = it => String(it.name||'').trim()||it.src;
  const cpFix = COUPON_IN_GOODS.filter(c=>FIELDS.some(f=>f[1]===c) && !gi.some(it=>gk(it)===c));   // 품목 관리에서 아직 굿즈가 아니어도(예전 목록) 음료쿠폰(가가빈빈)은 늘 보이게
  const gs = [...gi].sort((a,b)=>(isDrinkSrc(b.src)?1:0)-(isDrinkSrc(a.src)?1:0));   // 음료쿠폰이 맨 위, 나머지는 가나다
  const stray = itemKind(k)==='goods' && !gi.some(it=>'g:'+it.src===k) ? k : '';   // 품목 관리에서 지운(이름을 바꾼) 굿즈가 예전 기록에 남아 있으면 그 줄에서만 보임 (예: 예전 아메리카노(몽몽차방))
  h+=`<optgroup label="굿즈">${cpFix.map(c=>opt(c, LABEL[c]||c, used.has(c), k===c)).join('')}${gs.map(it=>opt(gv(it), gl(it), used.has(gv(it)), k===gv(it))).join('')}${stray ? opt(stray, stray.slice(2), false, true) : ''}</optgroup>`;
  return `<select class="it-sel" data-isel="${esc(k)}" aria-label="항목">${h}</select>`;
}
function itemRowHTML(k, rows){
  const t=itemKind(k), stf=itemHasStaff(k), sv=stf ? String(rec[itemStfKey(k)]||'') : '';
  const note = t==='new' ? '' : `<input class="it-x it-note" data-inote="${esc(k)}" data-ime="ko" placeholder="비고" value="${esc(itemNote(k))}">`;
  if(t==='view'){ const vs=viewSrcOf(rec), vi=viewItems(rec).filter(it=>!/\(\d\d:00~18:00\)/.test(it.src) || normSrc(it.src)===normSrc(vs));   // 시간대 관람권은 입장 시각으로 정해진 것만
    const opts = vi.length ? vi.map(it=>`<option value="${esc(it.src)}"${normSrc(it.src)===normSrc(vs)?' selected':''}>${esc(viewLabel(it.src))}</option>`).join('') : `<option>관람 (관람 인원)</option>`;
    return `<div class="it-row it-view" data-irow="view"><select class="it-sel" data-iview aria-label="관람 품목" title="관람 품목 (관람 인원 = 수량)">${opts}</select><span class="it-p" data-iup="view"></span>`
      + `<span class="it-q"><input data-iq="view" inputmode="numeric" data-ime="num" placeholder="인원" value="${esc(itemQty('view'))}" title="관람 인원 − 다른 관람 품목(관람+식사 · 해오름 등). 직접 줄이면 그 수로 (관람하지 않는 인원)"><i>명</i></span>`
      + `<span class="it-s none"><input disabled placeholder="담당 없음"></span><span></span><div class="it-money" data-ip="view"></div><div class="it-extra">${note}<span class="it-amt" data-iamt="view"></span></div></div>`; }
  // 몽몽마방: 시작 시각 → 끝나는 시각(시작을 넣으면 1시간 뒤로 자동) → 결제방식(새로 넣으면 미정) → 비고. 저장은 예전처럼 mabangTime "12:00~13:00"
  const mbt = t==='mb' ? mbTimes() : null;
  const extra = t==='mb' ? `<label class="it-xl">시작 <input class="it-x" data-ix="mbS" data-tp="1" readonly title="몽몽마방 시작 시각 (24시간 · 1200 처럼 숫자만 쳐도 됨). 넣으면 끝나는 시각이 1시간 뒤로" value="${esc(mbt[0])}"></label>`
      + `<label class="it-xl">끝 <input class="it-x" data-ix="mbE" data-tp="1" readonly title="몽몽마방 끝나는 시각 (시작 시각을 넣으면 1시간 뒤로 자동)" value="${esc(mbt[1])}"></label>`
      + `<label class="it-xl${rec.mabangPay==='미정'?' tbd':''}">결제 <select class="it-x" data-ix="mabangPay" title="몽몽마방 결제방식 · 미정이면 미정 항목 '몽몽마방 결제'로 (고객님께 여쭤 보기)">${rec.mabangPay?'':'<option value="" selected>선택</option>'}${MB_PAYS.map(x=>`<option${rec.mabangPay===x?' selected':''}>${x}</option>`).join('')}</select></label>` + note
    : t==='prog' && !COUPON_IN_GOODS.includes(k) ? (()=>{ const [s,en]=tmTimes(k), SX = k==='seminar' && sem2On(rec) ? (semXKeys(rec).length ? semXKeys(rec) : ['seminar2']) : [];   // SX = 세미나 도슨트 2회차부터의 줄 (횟수만큼 · 2026-11-27)   // 개별 · 시간 프로그램: 시작 → 끝(시작을 넣으면 1시간 · 시간 프로그램은 예약 시간만큼 뒤) → 비고 (도슨트는 코스도). 저장은 예전처럼 tm_키 "13:00~14:00"
        return (SX.length ? `<span class="it-semn">1회차</span>` : '') + `<label class="it-xl">시작 <input class="it-x" data-ix="tmS:${esc(k)}" data-tp="1" readonly title="프로그램 시작 시각 (24시간 · 1300 처럼 숫자만 쳐도 됨). 넣으면 끝나는 시각이 자동" value="${esc(s)}"></label>`
          + `<label class="it-xl">끝 <input class="it-x" data-ix="tmE:${esc(k)}" data-tp="1" readonly title="프로그램 끝나는 시각 (시작을 넣으면 1시간 · 시간 프로그램은 예약 시간만큼 뒤로 자동)" value="${esc(en)}"></label>`
          + (FIELDS.some(f=>f[1]==='plc_'+k) ? (()=>{ const pv=rec['plc_'+k]||''; return `<label class="it-xl">장소 <select class="it-x" data-ix="plc_${esc(k)}" title="세미나 도슨트 장소">${pv?'':'<option value="" selected>선택</option>'}${[...PLC_OPTS, ...(pv && !PLC_OPTS.includes(pv) ? [pv] : [])].map(x=>`<option${pv===x?' selected':''}>${esc(x)}</option>`).join('')}</select></label>`; })() : '')   // 세미나 도슨트: 장소 (몽몽차방 · 당두봉갈 · 기타) → 비고
          + (SX.length ? semStfHTML('seminar', '1회차 세미나 도슨트 담당') : '')
          + (FIELDS.some(f=>f[1]==='crs_'+k) ? (()=>{ const cv=crsNorm(rec['crs_'+k]), opts=[...CRS_OPTS, ...(cv && !CRS_OPTS.includes(cv) ? [cv] : [])];   // 도슨트: 출발지 드롭다운 (앵당삼거리 · 치허문 · 곡신문 · 사담, 2026-11-19 · 예전 코스 칸) → 비고 「동행도슨트(앵당~)」
              return `<label class="it-xl it-crs">출발지 <select class="it-x" data-ix="crs_${esc(k)}" title="도슨트 출발지"><option value="">선택</option>${opts.map(o=>`<option${o===cv?' selected':''}>${esc(o)}</option>`).join('')}</select></label>`; })() : '')
          + note
          + SX.map(sk=>{ const [s2,e2]=tmTimes(sk), pv=rec['plc_'+sk]||'', no=semNo(sk);   // 세미나 도슨트 횟수만큼: 2회차부터 회차마다 시작 · 끝 · 장소 · 담당 · 비고 한 줄 (2회차 2026-11-18 · 3회차부터 2026-11-27)
              return `<div class="it-sem2"><span class="it-semn">${no}회차</span><label class="it-xl">시작 <input class="it-x" data-ix="tmS:${sk}" data-tp="1" readonly title="${no}회차 세미나 도슨트 시작 시각. 넣으면 끝나는 시각이 30분 뒤로" value="${esc(s2)}"></label>`
                + `<label class="it-xl">끝 <input class="it-x" data-ix="tmE:${sk}" data-tp="1" readonly title="${no}회차 세미나 도슨트 끝나는 시각" value="${esc(e2)}"></label>`
                + `<label class="it-xl">장소 <select class="it-x" data-ix="plc_${sk}" title="${no}회차 세미나 도슨트 장소">${pv?'':'<option value="" selected>선택</option>'}${[...PLC_OPTS, ...(pv && !PLC_OPTS.includes(pv) ? [pv] : [])].map(x=>`<option${pv===x?' selected':''}>${esc(x)}</option>`).join('')}</select></label>`
                + semStfHTML(sk, `${no}회차 세미나 도슨트 담당`)
                + `<input class="it-x it-note" data-inote="${sk}" data-ime="ko" placeholder="비고" value="${esc(itemNote(sk))}"></div>`; }).join('')
          + (SLOT_KEYS.includes(k) ? slotsHTML(k) : ''); })()
    : note;
  // 관람 · 관람+식사 줄: 인원 칸을 성인 · 학생 두 칸으로 (2026-11-20). 기본은 모두 성인, 학생을 넣으면 그만큼 성인에서 빠짐 (합 = 그 줄 인원)
  const qtyHTML = canStu(k) ? (()=>{ const tot=numOf(itemQty(k)), s=Math.min(itemStu(k), tot);
      return `<span class="it-q it-q2"><label title="성인 인원"><b>성인</b><input data-iqa="${esc(k)}" inputmode="numeric" data-ime="num" placeholder="인원" value="${tot ? tot-s : esc(itemQty(k))}"></label>`
        + `<label title="학생 인원 (넣으면 그만큼 성인에서 빠짐) · 학생은 품목 관리의 학생 관람 가격 (관람+식사는 관람 부분만)"><b>학생</b><input data-istu="${esc(k)}" inputmode="numeric" data-ime="num" placeholder="0" value="${s||''}"></label></span>`; })()
    : `<span class="it-q"><input data-iq="${esc(k)}" inputmode="numeric" data-ime="num" placeholder="수량" value="${esc(itemQty(k))}"${t==='new'?' disabled':''}><i>${itemUnit(k)}</i></span>`;
  return `<div class="it-row${t==='new'?' it-new':''}" data-irow="${esc(k)}">${itemSelectHTML(k, rows)}<span class="it-p" data-iup="${esc(k)}"></span>`
    + qtyHTML
    + (t==='goods' ? `<span class="it-s${sv.trim()?'':' missing'}">${staffSelHTML(k, sv, '굿즈 담당 (기본 = 영업 담당 · 굿즈 모두 같은 담당)')}</span>`
      : k==='seminar' && sem2On(rec) ? `<span class="it-s none"><input disabled placeholder="회차마다 담당 ↓" title="세미나 도슨트 2회 이상: 아래 회차마다 담당을 넣습니다"></span>`   // 2026-11-21
      : stf ? `<span class="it-s${sv.trim()?'':' missing'}">${staffSelHTML(k, sv, '프로그램 담당')}</span>` : `<span class="it-s none"><input disabled placeholder="${t==='new'?'항목을 먼저 고르세요':'담당 없음'}"></span>`)
    + `<button type="button" class="it-del" data-idel="${esc(k)}" title="이 항목 빼기">×</button>`
    + (t==='new' ? '' : `<div class="it-money" data-ip="${esc(k)}"></div><div class="it-extra">${extra}<span class="it-amt" data-iamt="${esc(k)}"></span></div>`) + `</div>`;   // 둘째 줄: 할인(할인 대상만) · 셋째 줄: 비고 (할인이 없으면 바로 비고, 금액은 그 줄 끝)
}
function renderItems(force){
  const box=$('#itemsBox'); if(!box) return;
  const recKeys=itemKeysFromRec();
  itemRows = itemRows.filter(k=>recKeys.includes(k) || itemPend.has(k));
  recKeys.forEach(k=>{ if(!itemRows.includes(k)) itemRows.push(k); });
  if(itemRows.includes('view')) itemRows=['view', ...itemRows.filter(k=>k!=='view')];   // 관람 인원은 항상 첫 줄
  const sig=itemRows.join('|') + (rec.seminar && sem2On(rec) ? '|sem'+(semXKeys(rec).length||1) : '') + '|sl'+SLOT_KEYS.map(k=>rawSlots(k).length).join(',');   // 세미나 도슨트 두 번째 줄이 생기고 없어질 때도 다시 그림
  if(!force && box.dataset.sig===sig && box.contains(document.activeElement)){   // 쓰는 중: 줄은 그대로 두고 값만 맞춤
    box.querySelectorAll('[data-iq],[data-iqa],[data-istu],[data-is],[data-ix],[data-inote]').forEach(el=>{ if(el===document.activeElement) return;
      const stuT = k => Math.min(itemStu(k), numOf(itemQty(k)));   // 성인 · 학생 칸 (2026-11-20)
      const v = el.dataset.iqa!=null ? (numOf(itemQty(el.dataset.iqa)) ? String(numOf(itemQty(el.dataset.iqa))-stuT(el.dataset.iqa)) : itemQty(el.dataset.iqa)) : el.dataset.istu!=null ? (stuT(el.dataset.istu) ? String(stuT(el.dataset.istu)) : '') : el.dataset.iq!=null ? itemQty(el.dataset.iq) : el.dataset.is!=null ? String(rec[itemStfKey(el.dataset.is)]||'') : el.dataset.inote!=null ? itemNote(el.dataset.inote) : el.dataset.ix==='mbS' ? mbTimes()[0] : el.dataset.ix==='mbE' ? mbTimes()[1] : /^tm[SE]:/.test(el.dataset.ix) ? tmTimes(el.dataset.ix.slice(4))[el.dataset.ix[2]==='S'?0:1] : /^sl[SE]:/.test(el.dataset.ix) ? slotIxVal(el.dataset.ix) : /^crs_/.test(el.dataset.ix) ? crsNorm(rec[el.dataset.ix]) : String(rec[el.dataset.ix]||''); if(el.value!==v) el.value=v; });
    paintItemState(); paintItemPrices(); return;
  }
  box.dataset.sig=sig;
  box.innerHTML = (itemRows.length ? `<div class="it-head"><span>품목</span><span>가격 (1인 · 회당)</span><span>인원 · 수량</span><span>담당</span><span></span></div>` : '')
    + itemRows.map(k=>itemRowHTML(k, itemRows)).join('') + `<div id="erpExtra"></div>`
    + `<div class="it-foot"><button type="button" class="btn it-add" data-iadd>＋ 항목 추가</button><span class="hint" style="margin:0">${itemRows.length?'':'사담 식사 · 몽몽마방 · 개별 프로그램 · 시간 프로그램 · 굿즈 중에서 고르세요'}</span></div>`;
  paintItemState(); paintItemPrices();
}
// 가격표를 예약 내역 아래로 합치고(할인 · 합계 · 전산 내역), 두 번째 열의 가격표 자리는 '그날 예약 현황'으로
function mergePriceLayout(){
  const dp=$('#dayPanel'), box=$('#itemsBox'); if(!dp || !box || $('#priceWrap')) return;
  const w=document.createElement('div'); w.id='priceWrap'; w.className='price-panel price-wrap';
  ['.disc-box','#selTitle','#priceBox','#erpBox','#priceAll','#priceSrc'].forEach(s=>{ const el=dp.querySelector(s); if(el) w.appendChild(el); });
  const btns=$('#erpPasteBtn')?.parentElement; if(btns) w.insertBefore(btns, $('#erpBox'));
  box.after(w);
  $('#selTitle').textContent='할인 · 합계';
  const ph=$('#priceHint'); if(ph) box.closest('.grp')?.querySelector('.grp-t')?.appendChild(ph);   // "11/27(금) → 평일 가격"
  dp.querySelector('h2').innerHTML='예약 현황 <small>누르면 구분별 예약 목록</small>';
  dp.querySelector('h2').insertAdjacentHTML('afterend','<div class="dayinfo day-all" id="dayAll"></div>');
  const info=$('#itemsInfo'); if(info) dp.appendChild(info);
  dp.insertAdjacentHTML('beforeend','<p class="hint" id="dayNone" style="margin:0">방문일과 예약 내역(사담 · 몽몽마방 · 프로그램)을 넣으면 그날 다른 예약 현황이 여기에 보입니다. 예약 내역의 수량 칸에 커서를 두면 업체별로 보입니다.</p>');
}
// 줄마다 금액 (가격표 계산과 같은 것): 금액 굵게, 아래에 단가 · 할인
let priceInfo = null;   // { 품목: {qty, p, a} } (renderPrice가 채움, 전산 내역이 있으면 null)
const PRICE_RETRIED = new Map();   // 금액 계산이 늦은 줄을 다시 계산한 시각 (같은 품목 · 수량 · 날짜 · 인원은 2초에 한 번만 → 끝없이 돌지 않게)
function itemSrc(k){ const t=itemKind(k), DAY=rec.date && isRedDay(rec.date) ? '주말/공휴일' : '평일';
  if(t==='view') return viewSrcOf(rec);
  if(t==='varea') return daySrc(k.slice(2), rec);
  if(t==='sadam') return `${DAY}(관람, ${{sadam1:'사담 런치1부', sadam2:'사담 런치2부', sadamD:'사담 디너'}[k]})`;
  if(t==='mb') return (mbMenuOf(rec)||{}).src || (Number(rec.mabangPrice) ? '몽몽마방 단품' : '');
  if(t==='prog') return progSrc(k, rec) || '';
  if(t==='goods') return k.slice(2);
  return ''; }
