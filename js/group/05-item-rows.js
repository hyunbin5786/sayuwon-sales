// 예약 내역: 품목을 고르면 비고를 뺀 모든 칸(인원 · 수량 · 시작 · 끝 · 장소 · 코스 · 결제 등)이 비었을 때 빨간 칸 — 고객님께 여쭤볼 정보 (2026-11-18)
// (담당은 paintItemState 에서 · 결제 미정은 노란 칸 · 코스 「앵당삼거리 시작」을 켜면 채운 것)
function paintTmMissing(){
  document.querySelectorAll('#itemsBox .it-row:not(.it-new) .it-q input[data-iq]').forEach(q=>q.closest('.it-q').classList.toggle('missing', !q.value.trim()));
  document.querySelectorAll('#itemsBox .it-row:not(.it-new) .it-q2 input[data-iqa]').forEach(q=>q.closest('label').classList.toggle('missing', !numOf(itemQty(q.dataset.iqa))));   // 성인 · 학생: 줄 인원이 비었을 때 성인 칸만 빨갛게 (학생 0명은 그대로, 2026-11-20)
  document.querySelectorAll('#itemsBox .it-row:not(.it-new) .it-xl').forEach(l=>{ const x=l.querySelector('.it-x'); l.classList.toggle('missing', !!x && !String(x.value||'').trim()); });
}
function paintItemState(){   // 담당이 빈 줄은 빨갛게, 그날 현황은 넣은 묶음만
  document.querySelectorAll('#itemsBox [data-is]').forEach(el=>el.closest('.it-s, .it-xl')?.classList.toggle('missing', !el.value.trim()));   // 세미나 도슨트 2회: 장소마다 담당 칸(.it-xl)도
  paintTmMissing();
  const kinds=new Set(itemRows.map(k=>{ const t=itemKind(k); return t==='sadam'?'sadam':t==='mb'?'mabang':t==='prog'?(OPT[GROUP_OF[k]]||{}).id:''; }));
  document.querySelectorAll('#itemsInfo .dayinfo').forEach(el=>{ el.hidden = !kinds.has(el.id.replace('info_','')); });
  const dn=$('#dayNone'); if(dn) dn.hidden = [...document.querySelectorAll('#itemsInfo .dayinfo')].some(el=>!el.hidden);
}
// 글자를 치는 칸(메모 · 이름 · 이메일 · 비고 · 담당 등): 칠 때마다 화면 전체를 다시 그리면 느려서, 값은 바로 넣고 다시 그리기는 멈추고 0.35초 뒤 한 번 (칸을 나가면 바로)
const isTypingEl = el => !!el && (el.tagName==='TEXTAREA' || (el.tagName==='INPUT' && /^(text|email|tel|search|)$/.test(el.getAttribute('type')||'')));
let repaintT=0;
function repaintSoon(){ clearTimeout(repaintT); repaintT=setTimeout(()=>{ repaintT=0; paintFields(); renderSide(); }, 350); }
function repaintNow(){ if(!repaintT) return; clearTimeout(repaintT); repaintT=0; paintFields(); renderSide(); }
document.addEventListener('focusout', e=>{ if(e.target.closest?.('#form, #itemsBox')) setTimeout(repaintNow, 0); });
function itemChanged(structural, keepStaff){ if(!keepStaff) staffDefaults(); startTimer();   // 담당을 직접 지울 때는 다시 채우지 않음
  paintFields(); renderSide(); if(structural) renderItems(true); else paintTmMissing(); }
document.addEventListener('change', e=>{ const v=e.target.closest?.('#itemsBox [data-iview]'); if(!v) return; rec.viewSrc=v.value; touched.add('viewSrc'); itemChanged(false, true); });   // 관람 품목 고르기
document.addEventListener('change', e=>{
  const s=e.target.closest?.('#itemsBox [data-isel]'); if(!s) return;
  const old=s.dataset.isel, val=s.value; if(!val) return;
  const nk = val.startsWith('mb:') ? 'mb' : val;
  let q=itemQty(old); const st=itemHasStaff(old) ? String(rec[itemStfKey(old)]||'') : '', so=canStu(old) ? itemStu(old) : 0;
  if(nk!==old) clearItem(old);
  if(nk!==old && !numOf(q) && (itemKind(nk)==='sadam' || (itemKind(nk)==='varea' && !/학생|해오름/.test(nk)))){ const n0=numOf(rec.people), rest=n0-areaOthers(rec); q = rest>0 ? String(rest) : n0 ? String(n0) : ''; }   // 관람 · 관람+식사: 기본 = 관람 인원(다른 줄에 넣은 만큼 빼고) 모두 성인 (2026-11-20)
  if(val.startsWith('mb:') && val.length>3){ rec.mabangMenu=val.slice(3); touched.add('mabangMenu'); mbPayDefault(); }
  const i=itemRows.indexOf(old); if(i>=0) itemRows[i]=nk; else itemRows.push(nk);
  if(nk!==old){ setItemQty(nk, q || (itemKind(nk)==='goods' ? '1' : '')); if(itemHasStaff(nk) && st && !String(rec[itemStfKey(nk)]||'').trim()){ rec[itemStfKey(nk)]=st; touched.add(itemStfKey(nk)); } if(so && canStu(nk)) setItemStu(nk, Math.min(so, numOf(itemQty(nk)))); }
  itemChanged(true);
  const qi=document.querySelector(`#itemsBox [data-iq="${CSS.escape(nk)}"], #itemsBox [data-iqa="${CSS.escape(nk)}"]`); if(qi && !qi.value) qi.focus();
});
document.addEventListener('input', e=>{
  const el=e.target; if(!el.closest?.('#itemsBox')) return;
  if(el.dataset.iq!=null){ const k=el.dataset.iq, c=el.value.replace(/[^\d+]/g,''), was=itemQty(k); if(c!==el.value) el.value=c; setItemQty(k, el.value);
    if(k==='seminar' && (numOf(was)>=2)!==(numOf(el.value)>=2)){ itemChanged(true, !!was); const q=document.querySelector('#itemsBox [data-iq="seminar"]'); if(q){ q.focus(); const n=q.value.length; try{ q.setSelectionRange(n,n); }catch(_){} } if(numOf(el.value)>=2) openSemGuide(); return; }   // 세미나 도슨트 수량 2 ↔ 1: 두 번째 시작 · 끝 · 장소 · 비고 줄을 넣고 빼기
    if(itemKind(k)==='prog' && itemUnit(k)==='시간' && numOf(el.value) && numOf(el.value)!==numOf(was)){ const [s]=tmTimes(k); if(s && fmtTime(s)){ const en=plusH(s, progHours(k)); rec['tm_'+k]=`${s}~${en}`; touched.add('tm_'+k); const b=el.closest('.it-row')?.querySelector(`[data-ix="tmE:${CSS.escape(k)}"]`); if(b) b.value=en; paintTmMissing(); } }   // 시간 프로그램(대관 등): 수량(시간)을 바꾸면 끝 = 시작 + 그 시간 (2026-11-18)
    itemChanged(false, !!was); }   // 담당 기본값은 수량을 처음 넣을 때만
  else if(el.dataset.iqa!=null){ const k=el.dataset.iqa, c=el.value.replace(/\D/g,''), was=itemQty(k); if(c!==el.value) el.value=c;   // 성인 인원 → 그 줄 인원 = 성인 + 학생 (2026-11-20)
    const a=parseInt(c)||0, s=itemStu(k); setItemQty(k, a+s ? String(a+s) : ''); itemChanged(false, !!was); }
  else if(el.dataset.istu!=null){ const k=el.dataset.istu, c=el.value.replace(/\D/g,''); if(c!==el.value) el.value=c;   // 학생 인원: 친 그대로 (성인 칸은 건드리지 않음) · 그 줄 인원 = 성인 + 학생 (2026-11-20 · 맞지 않으면 칸을 나갈 때 팝업)
    const n=parseInt(c)||0, ai=el.closest('.it-q2')?.querySelector('[data-iqa]'), a=parseInt((ai?.value||'').replace(/\D/g,''))||0;
    setItemStu(k, n); setItemQty(k, a+n ? String(a+n) : ''); itemChanged(false, true); }
  else if(el.dataset.inote!=null){ setItemNote(el.dataset.inote, el.value); startTimer(); repaintSoon(); }   // 항목 비고 (치는 동안은 다시 그리지 않음)
  else if(el.dataset.is!=null){ const sk=itemStfKey(el.dataset.is); rec[sk]=el.value; touched.add(sk); startTimer(); repaintSoon(); }   // 담당 이름 (치는 동안은 다시 그리지 않음)
  else if(el.dataset.ix==='mbS' || el.dataset.ix==='mbE' || /^tm[SE]:/.test(el.dataset.ix||'')){ el.value=el.value.replace(/[^\d:]/g,''); }   // 몽몽마방 · 프로그램 시작 · 끝: 칸을 나갈 때 맞춰 저장 (아래)
  else if(el.dataset.ix!=null && el.tagName==='INPUT'){ rec[el.dataset.ix]=el.value; touched.add(el.dataset.ix); itemChanged(false, true); }
});
document.addEventListener('change', e=>{ const el=e.target; if(!el.closest?.('#itemsBox') || el.dataset.ix==null || el.tagName!=='SELECT') return; rec[el.dataset.ix]=el.value; touched.add(el.dataset.ix);
  if(el.dataset.ix==='mabangPay'){ syncPayTbd(rec); touched.add('tbd'); el.parentNode.classList.toggle('tbd', el.value==='미정'); paintFields(); renderSide(); paintTmMissing(); if(el.value==='기타') openPayGuide('기타', '몽몽마방'); }   // 몽몽마방 결제 미정 ↔ 미정 항목
  itemChanged(false); });
// 몽몽마방 시작 · 끝나는 시각: 칸을 나갈 때 24시간으로 맞추고, 시작을 넣으면 끝 = 1시간 뒤
document.addEventListener('focusout', e=>{ const el=e.target, ix=el.dataset?.ix; if(!el.closest?.('#itemsBox') || (ix!=='mbS' && ix!=='mbE')) return;
  let [s, en]=mbTimes(); const v=el.value.trim() ? (fmtTime(el.value)||el.value.trim()) : '';
  if(ix==='mbS'){ if(v===s) { el.value=v; return; } s=v; if(v && fmtTime(v)) en=plus1h(v); } else { if(v===en){ el.value=v; return; } en=v; }
  rec.mabangTime = s||en ? `${s}~${en}` : ''; touched.add('mabangTime');
  const row=el.closest('.it-row'); if(row){ const a=row.querySelector('[data-ix="mbS"]'), b=row.querySelector('[data-ix="mbE"]'); if(a) a.value=s; if(b) b.value=en; }
  itemChanged(false, true); });
// 개별 · 시간 프로그램 시작 · 끝나는 시각 (몽몽마방과 같은 방식): 시작을 넣으면 끝 = 1시간 뒤 (시간 프로그램은 예약한 시간만큼). 저장은 tm_키 "13:00~14:00"
document.addEventListener('focusout', e=>{ const el=e.target, ix=el.dataset?.ix||''; if(!el.closest?.('#itemsBox') || !/^tm[SE]:/.test(ix)) return;
  const k=ix.slice(4), isS=ix[2]==='S'; let [s, en]=tmTimes(k); const v=el.value.trim() ? (fmtTime(el.value)||el.value.trim()) : '';
  if(isS){ if(v===s){ el.value=v; return; } s=v; if(v && fmtTime(v)) en=plusH(v, progHours(k)); } else { if(v===en){ el.value=v; return; } en=v; }
  rec['tm_'+k] = s||en ? `${s}~${en}` : ''; touched.add('tm_'+k);
  const row=el.closest('.it-row'); if(row){ const a=row.querySelector(`[data-ix="tmS:${CSS.escape(k)}"]`), b=row.querySelector(`[data-ix="tmE:${CSS.escape(k)}"]`); if(a) a.value=s; if(b) b.value=en; }
  itemChanged(false, true); paintTmMissing(); });
document.addEventListener('focusout', e=>{ const el=e.target; if(!el.closest?.('#itemsBox') || el.dataset.ix==null || el.tagName!=='INPUT' || !el.value) return;
  if(/^(mabangTime|tm_)/.test(el.dataset.ix)){ const f=fmtRange(el.value); if(f && f!==el.value){ el.value=f; rec[el.dataset.ix]=f; touched.add(el.dataset.ix); itemChanged(false); } } });   // 12001300 → 12:00~13:00
document.addEventListener('focusin', e=>{ const el=e.target; if(!el.closest?.('#itemsBox') || el.dataset.iq==null) return; const k=el.dataset.iq, t=itemKind(k); renderInfo(t==='mb' ? 'mabangL' : ['sadam','prog'].includes(t) ? k : null); });   // 그날 같은 항목 예약 현황
document.addEventListener('click', e=>{
  if(e.target.closest?.('#itemsBox [data-iadd]')){
    // 관람권이 아직 없으면 먼저 관람권 줄을 자동으로: 입장시각 13시 이후면 13~18시, 아니면 9~18시 · 인원 = 관람 인원 − 관람 포함 품목(사담 등) 인원
    if(!viewsParse(rec.views).some(x=>/관람\(\d\d:00~18:00\)/.test(x.src)) && numOf(rec.people)){ const src=timedViewSrc(rec), q=Math.max(0, numOf(rec.people)-areaOthers(rec));
      if(q){ setItemQty('v:'+src, String(q)); if(!itemRows.includes('v:'+src)) itemRows.unshift('v:'+src); toast(`관람권(${/13:00/.test(src)?'13~18시':'9~18시'}) ${q}명을 넣었습니다.`); } }
    const k='new:'+Date.now().toString(36); itemRows.push(k); itemPend.add(k); itemChanged(true); document.querySelector(`#itemsBox [data-isel="${k}"]`)?.focus(); return; }   // 금액도 바로 다시 계산 (자동으로 넣은 관람권 줄이 처음부터 할인 · 금액으로 보이게, 2026-11-18)
  const d=e.target.closest?.('#itemsBox [data-idel]'); if(d){ const k=d.dataset.idel; clearItem(k); itemRows=itemRows.filter(x=>x!==k); itemChanged(true); }
});
// "12001300" · "12-13" · "12:00~13:00" → "12:00~13:00"
function fmtRange(v){ const s=String(v||'').trim(); if(!s) return ''; let a, b; const p=s.split(/\s*[~\-–]\s*/);
  if(p.length===2){ a=fmtTime(p[0]); b=fmtTime(p[1]); } else { const d=s.replace(/\D/g,''); if(d.length===8){ a=fmtTime(d.slice(0,4)); b=fmtTime(d.slice(4)); } else if(d.length===4 && !/:/.test(s)){ a=fmtTime(d.slice(0,2)); b=fmtTime(d.slice(2)); } }
  return a && b ? `${a}~${b}` : ''; }
const TIME_KEYS = { tin:'12:00', tout:'18:00' };   // 입장 · 퇴장: 24시간 표시 시각 (값은 자리 표시)
// "930" · "9:30" · "13" · "오후 2시" → "09:30" · "13:00" · "14:00". 시각이 아니면 ''
function fmtTime(v){ v=String(v||'').trim(); let m=v.match(/^(\d{1,2}):?(\d{2})$/) || v.match(/^(\d{1,2})$/); let h, mi;
  if(m){ h=+m[1]; mi=+(m[2]||0); } else { m=v.match(/(\d{1,2})\s*(?:시|:)\s*(\d{1,2})?/); if(!m) return ''; h=+m[1]; mi=+(m[2]||0); if(/오후|저녁|pm/i.test(v) && h<12) h+=12; }
  return h<=23 && mi<=59 ? `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}` : ''; }
// 방문일: 칸에는 "2026-12-05 (토)"처럼 요일까지. 직접 칠 때는 2026-12-05 · 2026.12.5 · 20261205 · 12/5 · 1205 · 12월 5일 (연도 없으면 올해, 지났으면 내년)
const dateDisp = SY.dateDisp;   // 공통 (js/common.js)
// 날짜 칸 (마감일 · 미정 항목 답변일): 방문일처럼 칸 안에 "2026-11-14 (금)". 누르면 달력, 고르는 즉시 요일도 바뀜
const dboxHTML = (attrs, v) => `<span class="dbox"><input class="dtxt" readonly value="${esc(dateDisp(v))}" placeholder="날짜 고르기"><input type="date" class="dpick" ${attrs} value="${esc(v||'')}" tabindex="-1" aria-hidden="true"></span>`;
const dboxOpen = t => { const p=t.parentElement.querySelector('.dpick'); if(!p) return; try{ p.showPicker(); }catch(_){ p.focus(); p.click(); } };
document.addEventListener('click', e=>{ const t=e.target.closest?.('.dtxt'); if(t){ e.preventDefault(); dboxOpen(t); } });
document.addEventListener('keydown', e=>{ const t=e.target.closest?.('.dtxt'); if(t && (e.key==='Enter' || e.key===' ' || e.key==='ArrowDown')){ e.preventDefault(); dboxOpen(t); } });
['input','change'].forEach(ev=>document.addEventListener(ev, e=>{ const p=e.target; if(!p.classList?.contains('dpick')) return; const t=p.parentElement.querySelector('.dtxt'); if(t) t.value=dateDisp(p.value); }, true));
function parseDateText(s){ return SY.parseDateText(s); }   // 공통 (js/common.js)
const NUM_ONLY = { people:/[^\d+]/g, vehicle:/[^\d]/g, mabangPrice:/[^\d]/g, mabangTime:/[^\d:~]/g };   // 관람 인원은 42+2 처럼 + 허용
FIELDS.forEach(f=>{ if(/^tm_/.test(f[1])) NUM_ONLY[f[1]]=/[^\d:~]/g; });   // 도슨트 시간대도 숫자 · : · ~ 만
// 연락처: 빈 칸을 누르면 010- 이 들어가고, 숫자를 치면 - 가 자동 (어떤 번호든 자릿수에 맞춰, 2026-11-18)
//  휴대폰 010-1234-5678 · 010-123-4567(예전 10자리) · 서울 02-123-4567 / 02-1234-5678 · 지역 · 070 031-123-4567 / 031-1234-5678
//  0505 등 050X-123-4567 · 대표번호 1588-1234 · 그 밖 1234-5678. 010- 이 자동으로 들어간 칸에 0 으로 시작하는 번호(02 · 031 …)를 치면 010 은 뗌
const PHONE = k => /^c\d+_phone$/.test(k);
function fmtPhone(v){ return SY.fmtPhone(v); }   // 공통 (js/common.js)
const VTYPES = ['버스','승용','혼합','미정'];
// 차량 값: "버스 2대" · "승용 3대" · "혼합 (버스 1대 + 승용 2대)" · "미정"
function vehParts(v){ v=String(v||'');
  if(/^미정/.test(v)) return {t:'미정',n:'',bus:'',car:''};
  const bus=(v.match(/버스\s*(\d+)/)||[,''])[1], car=(v.match(/승용\s*(\d+)/)||[,''])[1];
  if(/혼합/.test(v) || (bus && car)) return {t:'혼합',n:'',bus,car};
  const t=VTYPES.find(x=>v.includes(x)) || (/(대형|중형|소형|미니)/.test(v)?'버스':''); const n=(v.match(/\d+/)||[''])[0]; return {t,n,bus:'',car:''}; }
function vehJoin(t,n,bus,car){
  if(t==='미정') return '미정';
  if(t==='혼합'){ const p=[bus&&`버스 ${bus}대`, car&&`승용 ${car}대`].filter(Boolean); return p.length ? `혼합 (${p.join(' + ')})` : '혼합'; }
  return n ? `${t||'버스'} ${n}대` : (t && t!=='버스' ? t : ''); }
const vehRead = () => vehJoin($('#f_vtype').value, $('#f_vehicle').value, $('#f_vbus').value, $('#f_vcar').value);
const busCount = people => { const n=numOf(people); return !n ? 0 : n<45 ? 1 : Math.floor(n/45); };   // 버스 대수: 45명 미만 1대, 그 이상 인원 ÷ 45 버림 (2026-11-18)
var vehAutoN=0;   // 자동으로 넣은 버스 대수 (관람 인원을 바꾸면 따라감 · 직접 고치면 0)
function fieldHTML(k,label,col,cls,req){
  let extra = DATE_KEYS.has(k) && k!=='date' ? ' type="date"' : '';
  if(k==='date') extra+=' readonly inputmode="numeric" data-ime="num" placeholder="누르면 달력" title="누르면 달력 · 한 번 더 누르면 직접 입력"';
  if(k==='owner') extra+=' list="owners"';
  if(KO_FIRST(k)) extra+=' data-ime="ko"';
  if(EN_ONLY(k))  extra+=' data-ime="en" inputmode="email" lang="en" autocapitalize="off" spellcheck="false"';
  if(PHONE(k))    extra+=' data-ime="num" inputmode="tel" placeholder="010-0000-0000"';
  if(NUM_ONLY[k]) extra+=' inputmode="numeric" data-ime="num"';
  if(TIME_KEYS[k]) extra+=` data-tp="1" readonly title="누르면 시각 고르기 (24시간)"`;   // 입장 · 퇴장: 스크롤로 고르기 (js/timepick.js)
  if(k==='mabangTime') extra+=' placeholder="12:00~13:00" title="24시간 · 숫자만 쳐도 됨 (12001300)"';
  if(k==='mabangPrice') extra+=' placeholder="1인 단가"';
  if(k==='mabangNote') extra+=' data-ime="ko"';
  const input = k==='goods'
    ? `<div class="goods-box" id="f_goods"></div>`   /* 굿즈 구매: 품목 + 수량 */
    : k==='mabangMenu'
    ? `<div class="mb-menu" id="f_mabangMenu"></div>`
    : k==='mabangPay'
    ? `<select id="f_${k}" data-k="${k}"><option value="">선택</option>${MB_PAYS.map(p=>`<option>${p}</option>`).join('')}</select>`
    : k==='vehicle'
    ? `<div class="vrow"><select id="f_vtype" data-k="vehicle" aria-label="차종">${VTYPES.map(t=>`<option>${t}</option>`).join('')}</select><input id="f_${k}" data-k="${k}"${extra} placeholder="대수"><span class="vmix" id="f_vmix" hidden><i>버스</i><input id="f_vbus" data-k="vehicle"${extra} placeholder="대" aria-label="버스 대수"><i>승용</i><input id="f_vcar" data-k="vehicle"${extra} placeholder="대" aria-label="승용 대수"></span></div>`
    : CHECKS[k]
    ? `<label class="ckf"><input type="checkbox" id="f_${k}" data-k="${k}"> ${CHECKS[k]}</label>`
    : k==='gate'
    ? `<select id="f_${k}" data-k="${k}">${GATES.map(g=>`<option>${g}</option>`).join('')}</select>`   /* 입장문: 선택 없음, 기본 미정 */
    : k==='pay'
    ? `<select id="f_${k}" data-k="${k}">${PAYS.map(p=>`<option>${p}</option>`).join('')}</select>`
    : k==='date'   // 보이는 칸은 "2026-12-05 (토)" 글자, 달력은 밑에 숨긴 날짜 칸으로
    ? `<input id="f_date" data-k="date" class="date-text"${extra}><input type="date" id="f_datePick" class="date-pick" tabindex="-1" aria-hidden="true">`
    : isStf(k)
    ? `<input id="f_${k}" data-k="${k}" data-ime="ko" placeholder="담당자 이름 (필수)" autocomplete="off">`
    : /^plc_/.test(k)
    ? `<select id="f_${k}" data-k="${k}"><option value="">선택</option>${PLC_OPTS.map(p=>`<option>${p}</option>`).join('')}</select>`
    : /^tm_/.test(k)
    ? `<input id="f_${k}" data-k="${k}" inputmode="numeric" data-ime="num" placeholder="13:00~15:00" title="24시간 · 숫자만 쳐도 됨 (13001500)" autocomplete="off">`
    : /^crs_/.test(k)
    ? `<input id="f_${k}" data-k="${k}" data-ime="ko" autocomplete="off">`
    : `<input id="f_${k}" data-k="${k}"${extra}${/^프로그램/.test(GROUP_OF[k]||'') ? ` placeholder="${UNIT(k)}"` : ''}>`;
  const tbdBox = k!=='vehicle' && k!=='pay' && k!=='mabangPay' && TBD_KEYS.some(([tk])=>tk===k) ? `<label class="tbdck" title="아직 안 정해졌으면 체크"><input type="checkbox" data-tbd="${k}">미정</label>` : "";
  return `<div class="f ${cls}${req?' req':''}${tbdBox?' has-tbd':''}" id="w_${k}"><label for="f_${k}"><span>${label}</span></label><div class="inbox">${input}${tbdBox}</div></div>`;
}
function buildForm(){
  const req=new Set(REQUIRED().map(r=>r[0]));
  let html='', g='';
  const close=()=>{ if(!g) return; html+='</div>'; if(OPT[g] && OPT[g].id!=='goods') html+=`<div class="dayinfo" id="info_${OPT[g].id}"></div>`; html+='</div>'; };
  FIELDS.forEach(([grp,k,label,col,cls])=>{
    if(grp!==g){
      close();
      if(OPT[grp] && !Object.keys(OPT).some(x=>x===g)){   // 첫 접는 묶음 앞에 버튼 3개
        html+=`<div class="grp items-grp"><div class="grp-t"><span>예약 내역</span></div><div class="items-box" id="itemsBox"></div><div id="itemsInfo"></div></div>`;
        html+=`<div class="opt-bar">${Object.values(OPT).map(o=>`<button type="button" class="opt-btn" data-opt="${o.id}" aria-expanded="false"><span>${o.short||o.title}</span><small id="optsum_${o.id}"></small></button>`).join('')}</div>`;
      }
      html+= OPT[grp]
        ? `<div class="grp opt" id="opt_${OPT[grp].id}" hidden><div class="grp-t"><span>${OPT[grp].title}</span></div><div class="fields">`
        : `<div class="grp" data-grp="${grp}"><div class="grp-t"><span>${grp}</span></div><div class="fields">`;
      g=grp;
    }
    if(k==='tbdDate' || k==='owner' || k==='payContact') return;   // 입력 기한 · 결제 연락 예정일은 예약 내용 제목 줄, 영업 담당은 맨 위 초록 헤더
    if(isSub(k)) html += fieldHTML(k, isStf(k) ? '담당' : SUB_NAME[k.split('_')[0]], col, 'sub'+(isStf(k)?' sub-stf':''), isStf(k));   // 프로그램 · 굿즈 바로 옆 '담당 *' (필수)
    else html += fieldHTML(k,label,col,(cls||'')+(STAFF_BASES().includes(k) && k!=='goods' ? ' pbase' : ''),req.has(k)||k==='payContact');
    if(k==='pchg') html += `</div></div><div class="grp" data-grp="담당자"><div class="grp-t"><span>담당자</span><span class="hint" style="margin:0">여러 명이면 추가</span></div><div class="contacts" id="contacts"></div><button type="button" class="btn addc" id="addContact">+ 담당자 추가</button>` + `<div class="fields" hidden>`;
  });
  close();
  $('#form').innerHTML = html;
  document.querySelectorAll('#form .dayinfo').forEach(el=>$('#itemsInfo')?.appendChild(el));   // 그날 예약 현황은 항목 줄 아래로
  // 사담 줄은 4칸 중 3칸만 쓰므로 빈 칸 하나
  document.querySelectorAll('.opt-btn').forEach(b=>b.onclick=()=>{
    const id=b.dataset.opt; optOpen.has(id) ? optOpen.delete(id) : optOpen.add(id); paintOpt();
    if(optOpen.has(id)) document.querySelector(`#opt_${id} input`)?.focus();
  });
  document.querySelectorAll('[data-tbd]').forEach(b=>b.onclick=()=>{
    const s=tbdSet(rec), k=b.dataset.tbd; s.has(k) ? s.delete(k) : s.add(k);
    rec.tbd = TBD_KEYS.filter(([tk])=>s.has(tk)).map(([,tl])=>tl).join(', ');
    if(!s.size){ rec.tbdDate=''; rec.tbdLate=''; tbdAuto=false; }   // 미정 항목이 없으면 입력 기한 · 늦춘 사유도 없음
    touched.add('tbd'); startTimer(); paintFields(); renderSide();
  });
  $('#addContact').onclick=()=>{ nContacts++; renderContacts(); document.getElementById(`f_c${nContacts-1}_name`).focus(); };
  $('#form').addEventListener('input', e=>{
    const k=e.target.dataset.k; if(!k) return;
    if(PHONE(k) && !e.isComposing){
      const el=e.target, atEnd=el.selectionStart===el.value.length;
      const f=SY.phoneTyping(el, e.inputType);   // 자릿수에 맞춰 - · 자동 010- 뒤 02 · 031 … 이면 010 뗌 · 지우는 중엔 끝 - 안 붙임 (js/common.js)
      if(f!==el.value){ el.value=f; if(atEnd) el.setSelectionRange(f.length,f.length); }
    }
    if(TIME_KEYS[k] && !e.isComposing){   // 숫자만 치면 : 자동 (1330 → 13:30)
      const el=e.target, del=e.inputType && e.inputType.startsWith('delete');
      const d=el.value.replace(/\D/g,'').slice(0,4), f = del ? el.value.replace(/[^\d:]/g,'') : d.length>=3 ? `${d.slice(0,d.length-2)}:${d.slice(-2)}` : d;
      if(f!==el.value){ el.value=f; el.setSelectionRange(f.length,f.length); }
    }
    if(NUM_ONLY[k] && e.target.tagName==='INPUT' && !e.isComposing){ const c=e.target.value.replace(NUM_ONLY[k],''); if(c!==e.target.value){ const p=e.target.selectionStart-(e.target.value.length-c.length); e.target.value=c; try{ e.target.setSelectionRange(p,p); }catch(_){} } }
    if(k==='date'){ const d=parseDateText(e.target.value); if(d===null) return; }   // 방문일을 치는 중 (날짜가 되기 전엔 그대로)
    rec[k]= e.target.type==='checkbox' ? (e.target.checked?'있음':'') : k==='vehicle' ? vehRead() : k==='date' ? parseDateText(e.target.value) : e.target.value;
    touched.add(k);
    if(k==='pay' || k==='mabangPay' || k==='vehicle'){ syncPayTbd(rec); touched.add('tbd'); }   // 결제 미정 ↔ 미정 항목 '결제 방법' · '몽몽마방 결제'
    if(k==='pay' && PAY_GUIDE[rec.pay]) openPayGuide(rec.pay);
    if(k==='mabangPay' && rec.mabangPay==='기타') openPayGuide('기타', '몽몽마방');   // 결제 방식을 고르면 그 안내를 바로 팝업으로
    if(k==='vehicle' && e.target.id==='f_vtype'){ const s=tbdSet(rec); rec.vehicle==='미정' ? s.add('vehicle') : s.delete('vehicle'); rec.tbd=TBD_KEYS.filter(([tk])=>s.has(tk)).map(([,tl])=>tl).join(', '); if(!s.size){ rec.tbdDate=''; rec.tbdLate=''; tbdAuto=false; } touched.add('tbd'); }   // 차종 '미정' = 차량 미정 체크
    // 버스: 고르는 순간 대수 자동 = 관람 인원 45명 미만 1대, 그 이상은 인원 ÷ 45 (버림). 관람 인원을 바꾸면 자동으로 넣은 대수도 따라감 (직접 고친 대수는 그대로, 2026-11-18)
    if(k==='vehicle' && e.target.id==='f_vtype' && $('#f_vtype').value==='버스' && !vehParts(rec.vehicle).n){ const n=busCount(rec.people); if(n){ rec.vehicle=`버스 ${n}대`; vehAutoN=n; $('#f_vehicle').value=String(n); } }
    if(k==='vehicle' && e.target.id==='f_vehicle') vehAutoN=0;
    if(k==='people'){ const p=vehParts(rec.vehicle); if(p.t==='버스' && vehAutoN && +p.n===vehAutoN){ const n=busCount(rec.people); if(n && n!==vehAutoN){ rec.vehicle=`버스 ${n}대`; vehAutoN=n; touched.add('vehicle'); } } }
    if(k==='date') renderInfo();
    startTimer(); if(isTypingEl(e.target)) repaintSoon(); else { paintFields(); renderSide(); }   // 글자를 치는 칸은 멈춘 뒤 한 번만 다시 그림 (빠르게, 2026-11-18)
  });
  // 식사 칸을 누르면 비어 있을 때 방문 인원을 먼저 넣고 전체 선택 (그대로 두거나 바로 고쳐 쓰기)
  $('#form').addEventListener('click', e=>{ const el=e.target, k=el.dataset?.k;
    if(!MEAL_KEYS.includes(k) || el.value || !numOf(rec.people)) return;
    el.value=String(numOf(rec.people)); el.dispatchEvent(new Event('input',{bubbles:true})); el.select(); });
  // 담당자 순서: ▲ 를 누르면 바로 위 담당자와 자리를 바꿈 (맨 위가 견적서 수신 · 연락처 · 목록에 쓰이는 대표 담당자)
  $('#form').addEventListener('click', e=>{ const u=e.target.closest('.up'); if(!u) return; const i=+u.dataset.up; if(i<1) return;
    CFIELDS.forEach(([f])=>{ const a=`c${i-1}_${f}`, b=`c${i}_${f}`, t=rec[a]||''; rec[a]=rec[b]||''; rec[b]=t; touched.add(a); touched.add(b); });
    startTimer(); renderContacts(); renderForm(); toast('담당자 순서를 바꿨습니다.'); });
  $('#form').addEventListener('click', e=>{
    const x=e.target.closest('.x'); if(!x) return;
    const i=+x.dataset.i;
    for(let j=i;j<nContacts-1;j++) CFIELDS.forEach(([f])=>{ rec[`c${j}_${f}`]=rec[`c${j+1}_${f}`]||''; if(touched.has(`c${j+1}_${f}`)) touched.add(`c${j}_${f}`); });
    CFIELDS.forEach(([f])=>{ delete rec[`c${nContacts-1}_${f}`]; });
    nContacts=Math.max(1,nContacts-1); renderContacts(); renderForm();
  });
  // Enter로 다음 칸
  $('#form').addEventListener('keydown', e=>{
    if(e.key!=='Enter' || e.isComposing || e.target.tagName!=='INPUT') return; e.preventDefault();
    const ins=[...document.querySelectorAll('#form input:not([type=checkbox])')]; const i=ins.indexOf(e.target); if(ins[i+1]) ins[i+1].focus();
  });
  // 식사·프로그램 칸에 커서(마우스·입력)를 두면 그날 그 칸의 예약 현황
  const hot = e=>{ const w=e.target.closest('.f'); const k=w?.querySelector('input')?.dataset.k; if(k && INFO_OF(k)) renderInfo(k); };
  $('#form').addEventListener('mouseover', hot);
  $('#form').addEventListener('focusin', hot);
  // 연락처: 빈 칸을 누르면 010- 부터. 아무것도 안 치고 나가면 다시 비움
  $('#form').addEventListener('focusin', e=>{ const el=e.target; if(PHONE(el.dataset?.k||'') && !el.value){ el.value='010-'; el.dataset.autop='1'; setTimeout(()=>{ try{ el.setSelectionRange(4,4); }catch(_){} },0); } });
  $('#form').addEventListener('focusout', e=>{ const el=e.target; if(!PHONE(el.dataset?.k||'')) return; delete el.dataset.autop; if(/^010-?$/.test(el.value) && !rec[el.dataset.k]) el.value=''; });
  // 방문일: 누르면 달력부터. 달력을 연 뒤 칸을 한 번 더 누르면 글자로 직접 고치기. 숫자를 치기 시작해도 직접 입력
  { const dt=$('#f_date'), dp=$('#f_datePick');
    const openPick=()=>{ try{ dp.showPicker(); }catch(_){ dp.focus(); } };
    const startEdit=(blank)=>{ dt.dataset.editing='1'; dt.readOnly=false; dt.value = blank ? '' : (rec.date||''); dt.focus(); if(!blank) dt.select(); };
    dt.addEventListener('mousedown', e=>{
      if(dt.dataset.editing) return;
      if(Date.now()-(+dt.dataset.pickAt||0) < 20000){ e.preventDefault(); dt.dataset.pickAt=''; startEdit(false); return; }   // 두 번째 누름
      dt.dataset.pickAt=String(Date.now()); setTimeout(openPick,0);
    });
    dt.addEventListener('keydown', e=>{ if(!dt.dataset.editing && /^\d$/.test(e.key)) startEdit(true); });
    dt.addEventListener('blur', ()=>{ if(!dt.dataset.editing) return;
      const d=parseDateText(dt.value); if(d===null){ toast('날짜를 알아볼 수 없습니다. 예) 2026-12-05, 12/5'); }
      delete dt.dataset.editing; dt.readOnly=true; paintFields(); });
    dp.addEventListener('change', ()=>{ dt.value=dp.value; dt.dispatchEvent(new Event('input',{bubbles:true})); });
  }
  // 입장시각: 빈 칸을 눌러도 아무것도 넣지 않음 (2026-11-16). 나갈 때 24시간 HH:MM 으로 맞춤 (9:30 → 09:30, 13 → 13:00)
  // 몽몽마방 시간: 빈 칸을 누르면 고객님 입장 시각부터 1시간 (예: 입장 13:00 → 13:00~14:00), 고쳐 쓰기 쉽게 선택된 상태
  $('#form').addEventListener('focusin', e=>{ const el=e.target; if(el.dataset?.k!=='mabangTime' || el.value) return; const t=fmtTime(rec.tin); if(!t) return; const h=+t.slice(0,2)+1; el.value=`${t}~${String(Math.min(h,23)).padStart(2,'0')}${t.slice(2)}`; el.dispatchEvent(new Event('input',{bubbles:true})); setTimeout(()=>{ try{ el.select(); }catch(_){} },0); });
  const mbDefTime = () => { const t=fmtTime(rec.tin); if(!t) return ''; const h=Math.min(+t.slice(0,2)+1,23); return `${t}~${String(h).padStart(2,'0')}${t.slice(2)}`; };
  $('#form').addEventListener('input', e=>{ if(e.target.dataset?.k!=='mabangL' || !rec.mabangL || rec.mabangTime) return; const v=mbDefTime(); if(!v) return; rec.mabangTime=v; touched.add('mabangTime'); paintFields(); renderSide(); });   // 몽몽마방 인원을 넣으면 시간도 입장 시각으로
  $('#form').addEventListener('input', e=>{ const k=e.target.dataset?.k; if(k && STAFF_BASES().includes(k) && staffDefaults()) { paintFields(); renderSide(); } });   // 프로그램을 넣으면 담당 = 영업 담당 (바꿀 수 있음)
  $('#form').addEventListener('focusout', e=>{ const el=e.target, k=el.dataset?.k; if(!TIME_KEYS[k] || !el.value) return; const f=fmtTime(el.value); if(f && f!==el.value){ el.value=f; el.dispatchEvent(new Event('input',{bubbles:true})); } });
  // 몽몽마방: 시간은 나갈 때 12:00~13:00 으로, 메뉴는 체크한 것을 ", " 로, 단가 칸이 비어 있을 때 누르면 메뉴로 계산한 제안 단가
  $('#form').addEventListener('focusout', e=>{ const el=e.target; const kk=el.dataset?.k||''; if((kk!=='mabangTime' && !/^tm_/.test(kk)) || !el.value) return; const f=fmtRange(el.value); if(f && f!==el.value){ el.value=f; el.dispatchEvent(new Event('input',{bubbles:true})); } });   // 몽몽마방 시간 · 도슨트 시간대
  // 몽몽마방 메뉴: 하나 고르기, 고른 것을 다시 누르면 해제
  $('#form').addEventListener('click', e=>{ const el=e.target; if(el.dataset?.menu===undefined) return;
    const was = rec.mabangMenu===el.dataset.menu;
    rec.mabangMenu = was ? '' : el.dataset.menu; if(was) el.checked=false;
    touched.add('mabangMenu'); startTimer(); paintFields(); renderSide(); });
  $('#form').addEventListener('mouseleave', ()=>{ const a=document.activeElement?.dataset?.k; renderInfo(a && INFO_OF(a) ? a : null); });
  renderContacts();
}
function renderContacts(){
  const req=new Set(REQUIRED().map(r=>r[0]));
  let h='';
  for(let i=0;i<nContacts;i++){
    h+=`<div class="crow">${CFIELDS.map(([f,l])=>fieldHTML(`c${i}_${f}`, l, '', '', req.has(`c${i}_${f}`))).join('')}<span class="cacts">${i?`<button type="button" class="up" data-up="${i}" title="위로 올리기 (맨 위 = 주로 연락하는 대표 담당자)">▲</button><button type="button" class="x" data-i="${i}" title="이 담당자 빼기">×</button>`:''}</span></div>`;   // 버튼 자리는 모든 줄에 같은 폭 (첫 줄은 비움) → 칸 열이 맞음
  }
  $('#contacts').innerHTML=h;
  for(let i=0;i<nContacts;i++) CFIELDS.forEach(([f])=>{ const k=`c${i}_${f}`, el=document.getElementById('f_'+k); el.value=rec[k]||''; });
  paintFields();
}
function paintFields(changed=[]){
  syncGoodsStaff();   // 굿즈 담당 = 영업 담당
  const req=new Set(REQUIRED().map(r=>r[0]));
  const warnF=new Set(fieldWarnings(rec).map(u=>u.field)), tbdS=tbdSet(rec);   // 칸마다 다시 계산하지 않고 한 번만 (2026-11-23 · 칸 69개 × 경고 계산 = 입력이 늦던 원인)
  allKeys().forEach(k=>{
    if(k==='owner') return;   // 헤더의 영업 담당은 이 컴퓨터 사용자 (기록마다 바뀌지 않음)
    const el=document.getElementById('f_'+k); if(!el) return;
    const v=rec[k]||'';
    if(k==='vehicle'){ const p=vehParts(v), a=document.activeElement;
      if(p.t && a!==$('#f_vtype')) $('#f_vtype').value=p.t;
      if(!v && a!==$('#f_vtype')) $('#f_vtype').value = '미정';   // 비어 있으면 미정 (2026-11-18 · 예전엔 버스)
      [[el,p.n],[$('#f_vbus'),p.bus],[$('#f_vcar'),p.car]].forEach(([x,val])=>{ if(a!==x && x.value!==val) x.value=val; });
      const t=$('#f_vtype').value; el.hidden = t==='혼합' || t==='미정'; $('#f_vmix').hidden = t!=='혼합'; }
    else if(el.type==='checkbox') el.checked=!!v;
    else if(k==='date'){ if(!el.dataset.editing){ const d=dateDisp(v); if(el.value!==d) el.value=d; } const p=$('#f_datePick'); if(p && p.value!==v) p.value=v; }
    else if(k==='mabangMenu'){ const h=mbMenuHTML(v); if(el.dataset.h!==h){ el.innerHTML=h; el.dataset.h=h; } }
    else if(k==='goods'){ const h=goodsHTML(v); if(el.dataset.h!==h && !el.contains(document.activeElement)){ el.innerHTML=h; el.dataset.h=h; } }
    else { if(el.tagName==='SELECT' && v && ![...el.options].some(o=>o.value===v)) el.add(new Option(v,v)); if(el.value!==v && document.activeElement!==el) el.value=v; }
    const w=document.getElementById('w_'+k);
    w.classList.toggle('unsure', warnF.has(k));
    // 차량은 처음에 받아야 하는 정보 → 미정이어도 빨간색 (2026-11-21)
    const vehRed = k==='vehicle' && (!v || /^미정/.test(v));
    const isTbd = !vehRed && (tbdS.has(k) || v==='미정');   // 미정 체크 · 값이 미정이면 노란색
    w.classList.toggle('tbd', isTbd);
    w.classList.toggle('missing', vehRed || (req.has(k) && !v && !isTbd) || (isStf(k) && !v && needsStaff(k.slice(4))));
    w.classList.toggle('got', req.has(k) && !!v && !isTbd && !vehRed);   // 예약 내용 칸 색: 빨강 = 미입력 · 노랑 = 미정 · 초록 = 완료 (2026-11-18)
    if(isSub(k)) w.hidden = !rec[baseOf(k)] && !v;   // 프로그램을 넣었을 때만 담당 · 시간대 · 코스 칸
    if(w.classList.contains('pbase')) w.classList.toggle('on', !!v);
    if(OPT[GROUP_OF[k]]) el.classList.toggle('has', !!v);
  });
  layoutProg(); renderItems();
  const ts=tbdSet(rec); document.querySelectorAll('[data-tbd]').forEach(b=>{ const on=ts.has(b.dataset.tbd); b.checked=on; });
  // 현장 재결제는 결제링크일 때만 (현장 결제는 원래 현장에서 하므로 해당 없음)
  const os=document.getElementById('f_onsite');
  if(os){ const ok=rec.pay==='결제링크'; os.disabled=!ok; os.closest('.ckf').title = ok ? '' : '결제 방식이 결제링크일 때만 체크할 수 있습니다';
    if(!ok && rec.onsite){ rec.onsite=''; os.checked=false; } }
  const pc=document.getElementById('w_payContact'); if(pc) pc.hidden = rec.pay!=='미정';
  paintPayLink();
  paintOpt();
}
// 접는 묶음: 값이 있으면 버튼·묶음을 초록으로, 버튼에 입력 내용 요약
function paintOpt(){
  if(window.__autoReady) saveViewSoon();   // 펼친 묶음도 기억
  Object.entries(OPT).forEach(([grp,o])=>{
    const keys=FIELDS.filter(f=>f[0]===grp && !isSub(f[1])).map(f=>f[1]);
    const filled=keys.filter(k=>rec[k]);
    const sum = o.id==='goods' ? goodsText(rec) : o.id==='mabang' ? mabangText(rec) : /^프로그램/.test(grp) ? progList(rec, grp, true).join(' · ') : filled.map(k=>{ const v=rec[k]; return `${FIELDS.find(f=>f[1]===k)[2]} ${/^\d+(\+\d+)*$/.test(v)?v+UNIT(k):v}`; }).join(' · ');
    const b=document.querySelector(`.opt-btn[data-opt="${o.id}"]`), box=document.getElementById('opt_'+o.id);
    if(!b||!box) return;
    b.classList.toggle('filled', filled.length>0);
    b.setAttribute('aria-expanded', optOpen.has(o.id)?'true':'false');
    document.getElementById('optsum_'+o.id).textContent = sum || '없음';
    b.title = sum || `${o.title} 입력 없음 · 누르면 펼침`;
    box.hidden = !optOpen.has(o.id);
    box.classList.toggle('filled', filled.length>0);
  });
}
function renderForm(changed=[]){
  const need=Math.max(1, nContactsOf(rec));
  if(need>nContacts){ nContacts=need; renderContacts(); }
  paintFields(changed);
  renderSide();
}
function dateLabel(d){ if(!d) return ''; const t=new Date(d+'T00:00'); return isNaN(t)?d:`${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]})`; }
const mdLabel = d => { const t=new Date(d+'T00:00'); return isNaN(t)?d:`${t.getMonth()+1}월 ${t.getDate()}일 (${DOW[t.getDay()]})`; };   // 날짜는 항상 끝에 (요일)
const dowTag = d => { const t=new Date(String(d||'')+'T00:00'); return isNaN(t) ? '' : `(${DOW[t.getDay()]})`; };
const dtLabel = s => { const d=new Date(s); if(!s||isNaN(d)) return ''; return `${d.getMonth()+1}/${d.getDate()}(${DOW[d.getDay()]}) ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };   // 시각: 11/12(목) 09:35
// 미정 항목 입력 기한: 미정 체크가 있을 때만 보이고, 기본값은 방문일 전주 목요일 (직접 바꾸면 그대로 둠)
let tbdAuto=false;
function prevWeekThu(d){ const t=new Date(d+'T00:00'); if(isNaN(t)) return ''; t.setDate(t.getDate()-((t.getDay()+6)%7)-4); return ymd(t); }
// 미정 항목 답변일 기본값 · 한도: 방문일 전주 목요일. 그 목요일이 이미 지났으면 방문일 전날 (그것도 지났으면 오늘)
function tbdLimit(d){ const thu=prevWeekThu(d), today=ymd(new Date()); if(!thu) return ''; if(thu>=today) return thu; const p=new Date(d+'T00:00'); p.setDate(p.getDate()-1); const pd=ymd(p); return pd>=today ? pd : today; }
const tbdLimitName = d => tbdLimit(d)===prevWeekThu(d) ? '방문일 전주 목요일' : '방문일 전날';
function applyTbdDefault(){
  const has=tbdSet(rec).size>0, w=document.getElementById('w_tbdDate');
  if(w) w.hidden=!has;
  if(!has || !rec.date || (rec.tbdDate && !tbdAuto)) return;
  const v=tbdLimit(rec.date);   // 전주 목요일, 이미 지났으면 방문일 전날
  if(v && rec.tbdDate!==v){ rec.tbdDate=v; tbdAuto=true; const el=document.getElementById('f_tbdDate'); if(el) el.value=v; }
}
// 인원이 19명 ↔ 20명을 넘나들면 할인 버튼을 직접 고른 것(사전예약 · 단체예약)과 고친 할인액은 지우고 인원 기준(자동)으로 다시 (할인 없음은 그대로)

// 2026-11-21: 품목(줄)마다 그 줄 인원으로 — 관람 · 관람+식사 줄이 20명 이상이면 단체예약 10%, 19명까지 사전예약 5%. 그 줄이 넘나들 때 그 줄만 다시
function followDiscBand(){
  const bl=quoteBlocks(rec).blocks.filter(x=>x.key && x.disc), now={}; bl.forEach(x=>{ now[x.key] = x.qty>=20 ? 2 : x.qty>0 ? 1 : 0; });
  if(discBand && typeof discBand==='object'){
    const m=idiscMap(rec), am=idamtMap(rec), up=[], down=[]; let mchg=false;
    bl.forEach(x=>{ const was=discBand[x.key], b=now[x.key]; if(!was || !b || was===b) return; const kk=dkey(x.key);
      if(m[kk]==='pre' || m[kk]==='grp'){ delete m[kk]; mchg=true; } if(x.dsel!=='none' && am[kk]) setItemDamt(x.key, null);
      (b===2 ? up : down).push(itemName(x.key)); });
    if(mchg){ rec.idisc=Object.entries(m).map(([a,c])=>`${a}=${c}`).join('; '); touched.add('idisc'); }
    if(up.length) toast(`${up.join(' · ')} 인원이 20명 이상이 되어 할인을 단체예약 10%로 바꿨습니다.`);
    if(down.length) toast(`${down.join(' · ')} 인원이 20명 미만이 되어 할인을 사전예약 5%로 바꿨습니다.`);
  }
  discBand=now;
}
function renderSide(){
  followDiscBand();
  applyTbdDefault();
  if(typeof renderStage==='function') renderStage();
  const ts = tbdSet(rec), req = REQUIRED(), miss = req.filter(([k])=>!rec[k] && !ts.has(k));
  // 물어볼 것: 전부 보여 주고, 받은 항목은 초록색, 미정으로 체크한 항목은 노란색
  $('#missBox').innerHTML = `<ul class="chk miss">${req.map(([k,l,q])=>`<li class="${ts.has(k)||(k==='pay'&&rec.pay==='미정')?'tbd':rec[k]?'got':''}" title="${q}"><b>${l}</b></li>`).join('')}</ul>`
    + (miss.length ? '' : `<div class="done-all" style="margin-top:6px">필수 정보를 모두 받았습니다. 저장하세요.</div>`);
  if(window.__autoReady) scheduleWarn();   // 이상한 값이 새로 생기면 바로 팝업
  { const tt=$('#tbdTxt'); if(tt) tt.value = dateDisp(rec.tbdDate); }   // 답변일: 칸 안에 날짜 (요일)
  paintReadback();   // 고객님께 확인 멘트 (자동 · 직접 고침 · 말씀드림)
  renderInfo(curInfoKey);
  if(typeof renderPrice==='function' && window.__priceReady) renderPrice();
  if(window.__tasksReady) renderTasks();
  if(window.__autoReady) scheduleAuto();   // 고칠 때마다 자동 저장 타이머
  if(window.__autoReady) saveViewSoon();   // 새로고침해도 이 화면 그대로
}
// 결제링크: 결제 · 현장 재결제 옆에 「결제링크 전송」 · 「입금 확인」 체크 칸 (현장 재결제와 같은 모양, 결제링크일 때만 체크 가능)
// 체크하면 그 일시를 기록(칸에 일시가 보임), 끄면 지울지 물음. 추후 과업(결제링크 전송 · 입금 확인)과 서로 맞춤
const PAYLINK = [['linkSent','결제링크 전송','linksend','보냄'],['paidAt','입금 확인','paycheck','입금됨']];
function paintPayLink(){
  const anchor=document.getElementById('w_onsite') || document.getElementById('w_pay'); if(!anchor) return;
  const on=rec.pay==='결제링크';
  let prev=anchor;
  PAYLINK.forEach(([k,l,,txt])=>{
    let w=document.getElementById('pl_'+k);   // w_linkSent 는 숨은 칸이 따로 있어서 pl_
    if(!w){ w=document.createElement('div'); w.className='f'; w.id='pl_'+k; w.innerHTML=`<label for="plck_${k}"><span>${l}</span></label><div class="inbox"><label class="ckf"><input type="checkbox" id="plck_${k}" data-pl="${k}"> <span class="pl-txt"></span></label></div>`; prev.after(w); }
    prev=w;
    const ck=w.querySelector('input'), lb=w.querySelector('.ckf'), sp=w.querySelector('.pl-txt');
    ck.disabled=!on; ck.checked=!!rec[k]; sp.textContent = rec[k] ? (d=>`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`)(new Date(rec[k])) : txt;   // 칸이 좁아 11/16 15:09 (요일은 마우스를 올리면)
    lb.title = !on ? '결제 방식이 결제링크일 때만 체크할 수 있습니다' : rec[k] ? `${l} ${dtLabel(rec[k])} · 끄면 기록을 지울지 물어봅니다` : `체크하면 ${l} 일시가 기록되고 추후 과업도 완료됩니다`;
  });
}
document.addEventListener('change', e=>{ const ck=e.target; if(!ck.matches?.('input[data-pl]')) return;
  const [k,l,tid]=PAYLINK.find(p=>p[0]===ck.dataset.pl);
  // 결제링크 전송 전에는 입금 확인 불가 · 결제링크 전송을 풀면(다시 보낼 때) 입금 확인도 함께 해제 (2026-11-18)
  if(!ck.checked){ const alsoPaid = k==='linkSent' && rec.paidAt;
    if(rec[k] && !confirm(`${l} 기록(${dtLabel(rec[k])})을 지울까요?${alsoPaid?'\n입금 확인 기록도 함께 지워집니다.':''}`)){ ck.checked=true; return; } rec[k]='';
    if(alsoPaid){ rec.paidAt=''; touched.add('paidAt'); const pc=tasks.find(x=>x.id==='paycheck'); if(pc){ pc.done=false; pc.doneAt=''; delete pc.manualDone; } } }
  else { if(k==='paidAt' && !rec.linkSent){ ck.checked=false; toast('결제링크 전송을 먼저 체크해 주세요. (결제링크를 보내기 전에는 입금 확인을 할 수 없습니다)'); return; } rec[k]=new Date().toISOString(); }
  touched.add(k); const t=tasks.find(x=>x.id===tid); if(t){ t.done=!!rec[k]; t.doneAt=rec[k]||''; }
  startTimer(); paintPayLink(); renderSide(); renderTasks(); if(window.__autoReady) scheduleAuto();
  if(rec[k]) toast(`${l} ${dtLabel(rec[k])} 기록했습니다.`);
});
// 결제 방식별로 끊기 전에 추가로 받거나 안내할 것
const PAY_GUIDE = {
  '세금계산서': ['세금계산서 발행을 위해 사업자등록증을 보내주시겠어요?', '세금계산서 받으실 이메일 주소가 어떻게 되실까요?', '세금계산서 발행일은 언제로 해 드릴까요?'],
  '결제링크':   ['결제링크 보내드리면 언제쯤 결제하실 수 있을까요?', '현장에서 법인카드로 다시 결제하실 계획도 있으실까요?'],
  '현장 결제':  ['현장 결제로 하시면 당일 인원 변경이 어려운 점 양해 부탁드립니다.', '인원은 언제까지 확정해 주실 수 있을까요?'],
  '기타':       ['고객님께 어떻게 결제하실지 여쭤 보세요.', '정한 결제 방법을 「통화 메모」에 꼭 남겨 주세요.'],
};
let pgMemo=false, pgStf=false;   // 기타 결제 안내를 닫으면 통화 메모 칸으로 · 세미나 2회 안내를 닫으면 담당 칸으로
// 세미나 도슨트를 2회로 바꾼 순간 안내 (결제 안내 팝업을 같이 씀, 2026-11-18)
function openSemGuide(){ pgMemo=false; pgStf=true; $('#pgModal .hint').hidden=true;
  $('#pgTitle').textContent = '세미나 도슨트 2회';
  $('#pgBody').innerHTML = ['담당자 이름을 모두 입력해 주세요.', '비고에 각 장소의 담당자 이름도 적어 주세요.'].map(g=>`<li>${esc(g)}</li>`).join('');
  $('#pgModal').hidden = false; setTimeout(()=>$('#pgOk').focus(), 0); }
function openPayGuide(pay, what){ pgMemo = pay==='기타'; pgStf=false; $('#pgModal .hint').hidden=false;
  $('#pgTitle').textContent = pay==='기타' ? `[${what?what+' ':''}기타 결제] 통화 메모에 결제 방법을 남겨 주세요` : `[${pay} 안내] 고객님께 말씀드리세요`;
  $('#pgBody').innerHTML = PAY_GUIDE[pay].map(g=>`<li>${esc(g)}</li>`).join('');
  $('#pgModal').hidden = false; setTimeout(()=>$('#pgOk').focus(), 0);
}
$('#pgOk').onclick = () => { $('#pgModal').hidden = true; if(pgStf){ pgStf=false; const s=document.querySelector('#itemsBox [data-is="seminar"]'); if(s){ s.focus(); const n=s.value.length; try{ s.setSelectionRange(n,n); }catch(_){} } return; } if(pgMemo){ pgMemo=false; const m=$('#memoBox'); if(m){ m.scrollIntoView({block:'center'}); m.focus(); } } };
$('#pgModal').addEventListener('click', e=>{ if(e.target.id==='pgModal') $('#pgModal').hidden = true; });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#pgModal').hidden){ e.preventDefault(); $('#pgModal').hidden = true; } });
// 프로그램 입력 내용: "요가 20명", "차방 대관 2시간" (grp 를 주면 그 묶음만)
// staff 를 주면 "동행 도슨트 2시간 (담당:사공유빈)" (차방 · 당두봉갈은 담당을 적었을 때만)
// staff 이면 도슨트 시간대 · 출발지 · 장소도: "동행 도슨트 2시간 13:00~15:00 (출발지:앵당삼거리, 담당:사공유빈)"
const progList = (r, grp, staff) => FIELDS.filter(f=>(grp ? f[0]===grp : /^프로그램/.test(f[0])) && !isSub(f[1]) && r[f[1]]).map(f=>{ const v=String(r[f[1]]), sub=p=>String(r[`${p}_${f[1]}`]||'').trim(), who=sub('stf');   // 담당이 여러 명이면 한 칸에 「문현빈, 김선영」
  // 2026-11-24: 출발지 · 장소 · 담당은 괄호 하나에 쉼표로 "(장소:당두봉갈, 담당:김선영)"
  const ex = !staff ? [] : [sub('crs') && `출발지:${sub('crs')}`, sub('plc') && `장소:${sub('plc')}`, who ? `담당:${who}` : needsStaff(f[1]) ? '담당:미정' : ''].filter(Boolean);
  const tag = !staff ? '' : (sub('tm') ? ` ${sub('tm')}` : '') + (ex.length ? ` (${ex.join(', ')})` : '') + (f[1]==='seminar' ? sem2Tag(r) : '');
  return `${f[2]} ${/^\d+(\+\d+)*$/.test(v) ? v+UNIT(f[1]) : v}${tag}`; });
// 세미나 도슨트 수량 2일 때 두 번째: " · 두 번째 14:00~14:30 (장소:당두봉갈)"
const sem2Tag = r => { if(!(numOf(r.seminar)>=2) || r.seminar2) return ''; const t=String(r.tm_seminar2||'').trim(), p=String(r.plc_seminar2||'').trim(); return t||p ? ` ·${t?' '+t:''}${p?` (장소:${p})`:''}` : ''; };
// 조사: 받침에 따라 (으)로 · 은/는 · 이고/고
const lastJong = s => { const c=String(s).trim().slice(-1).charCodeAt(0)-0xAC00; return c>=0 && c<11172 ? c%28 : (/[0-9]$/.test(s) ? ({0:1,1:8,3:1,6:1,7:8,8:8}[String(s).slice(-1)]||0) : 0); };   // 0 = 받침 없음, 8 = ㄹ
const ro  = s => { const j=lastJong(s); return !j || j===8 ? '로' : '으로'; };
const eun = s => lastJong(s) ? '은' : '는';
function readback(r){
  // 고객님께 읽어 드릴 확인 문장. 업체명은 <업체명>
  // 한 줄에 하나씩 "~ 맞으신가요?" 로 묻는다
  const S=[];
  const day = r.date ? (()=>{ const d=new Date(r.date+'T00:00'); return isNaN(d)?r.date:`${d.getMonth()+1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일`; })() : '';
  const org = r.org ? `<${r.org}>` : '';
  if(org && day) S.push(`${org} 단체로 ${day}에 방문하시는 거 맞으신가요?`); else if(org) S.push(`${org} 단체 예약 맞으신가요?`); else if(day) S.push(`${day}에 방문하시는 거 맞으신가요?`);
  if(r.tin){ const gate = r.gate && r.gate!=='미정' ? `${r.gate}${ro(r.gate)} ` : '';
    S.push(r.tout ? `${r.tin}에 ${gate}도착하셔서 ${r.tout}에 퇴장하실 예정 맞으신가요?` : `${r.tin}에 ${gate}도착하실 예정 맞으신가요?`); }
  const veh = !r.vehicle || r.vehicle==='미정' ? '' : (()=>{ const v=r.vehicle.replace(/^혼합 \((.+)\)$/,'$1').replace(/ \+ /g,', ').replace(/^승용$/,'승용차').replace(/승용 (\d)/g,'승용차 $1'); return `${v}${ro(v)} 오시는`; })();
  if(r.people) S.push(veh ? `인원은 총 ${r.people}명이고, ${veh} 거 맞으신가요?` : `인원은 총 ${r.people}명 맞으신가요?`);
  else if(veh) S.push(`${veh} 거 맞으신가요?`);
  if(r.pay==='현장 결제') S.push('결제는 현장 결제로 진행되며, 그러기에 인원 변경 어려우신 점 이해되셨을까요?');
  else if(r.pay==='미정') S.push(`결제 방법은 ${r.tbdDate?mdLabel(r.tbdDate)+'까지':'나중에'} 알려주시기로 하신 거 맞으신가요?`);
  else if(r.pay) S.push(`결제는 ${r.pay}${ro(r.pay)} 진행하시는 거 맞으신가요?`);
  // 미정 항목 답변일: 그때까지 말씀해 주신 인원(내용)으로 고정 (결제 방법은 위 줄에서)
  const tn = String(r.tbd||'').split(/\s*,\s*/).filter(x=>x && x!=='결제 방법');
  if(tn.length && r.tbdDate){ const t=tn.join(' · '); S.push(`아직 정해지지 않은 ${t}${eun(t)} ${mdLabel(r.tbdDate)}까지 말씀해 주시면, 말씀해 주신 ${tn.includes('관람 인원')?'인원':'내용'}으로 고정됩니다.`); }
  // 입장문은 미정 항목이 아님: 전날 전화로 안내
  if(!r.gate || r.gate==='미정') S.push('입장하실 문은 입장 전날 전화드리면서 안내드리겠습니다.');
  const cs=contactsOf(r), mails=cs.map(c=>c.email).filter(Boolean);
  const docs = [r.wantQuote&&'견적서', r.wantStmt&&'거래명세서'].filter(Boolean).join('와 ');
  if(docs) S.push(mails.length ? `${docs}는 ${mails.join(', ')}로 보내드리면 될까요?` : `${docs} 받으실 이메일 주소를 알려주시겠어요?`);
  if(!S.length || (!r.org && !r.date && !r.people)) return '내용이 채워지면 고객에게 읽어줄 확인 문구가 만들어집니다.';
  let s = `마지막으로 예약 확인하겠습니다.\n${S.join('\n')}\n\n저희가 입장 전날에 전화드리면서 다시 안내드리겠습니다. 감사합니다.`;   // 마지막 멘트는 항상 이것으로
  // 결제 방식 안내(PAY_GUIDE)는 결제를 고를 때 팝업
  // 특별 할인: 인원 · 할인율 · 지참할 증빙
  const sp = typeof SPECIAL!=='undefined' ? specialCounts(r) : [];
  if(sp.some(x=>x.proof)) s += `\n\n[특별 할인 안내]\n` + sp.filter(x=>x.proof).map(x=>`· ${x.name} ${x.n}명은 ${x.rate===1?'무료':Math.round(x.rate*100)+'% 할인'}입니다. 방문 당일 꼭 지참해 주세요: ${x.proof}`).join('\n')
    + `\n· 다른 할인과 겹치면 가장 큰 할인 하나만 적용되고, 증빙이 없으면 할인이 어렵습니다.`;
  return s;
}

