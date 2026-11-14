(function(){
// ===================== 날짜 칸 (단체 화면 방문일과 같은 방식) =====================
// 칸 안에 "2026-12-05 (토)". 누르면 바로 달력, 달력을 연 뒤 한 번 더 누르거나 숫자를 치면 글자로 직접 입력 (2026-12-05 · 12/5 · 1205)
// 원래 <input type="date"> 는 숨긴 달력으로 그대로 두어 값 · 이벤트(input · change)는 예전 그대로
const DOW_="일월화수목금토"; const dateDisp = v => { if(!v) return ""; const t=new Date(v+"T00:00"); return isNaN(t) ? v : `${v} (${DOW_[t.getDay()]})`; };
function parseDateText(s){
  s=String(s||'').replace(/\([^)]*\)\s*$/,'').trim(); if(!s) return '';
  let y, m, d, x;
  if((x=s.match(/^(\d{4})\s*[-./년 ]?\s*(\d{1,2})\s*[-./월 ]?\s*(\d{1,2})\s*일?$/))){ y=+x[1]; m=+x[2]; d=+x[3]; }
  else if((x=s.match(/^(\d{1,2})\s*[-./월 ]\s*(\d{1,2})\s*일?$/)) || (x=s.match(/^(\d{2})(\d{2})$/))){
    m=+x[1]; d=+x[2]; const now=new Date(); y=now.getFullYear(); const t=new Date(y,m-1,d); now.setHours(0,0,0,0); if(t<now) y++; }   // 연도 없으면 올해 (이미 지났으면 내년)
  else return null;
  const t=new Date(y,m-1,d); if(t.getFullYear()!==y || t.getMonth()!==m-1 || t.getDate()!==d) return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function makeDateBox(pick){
  if(!pick || pick.dataset.dbox) return; pick.dataset.dbox='1';
  const box=document.createElement('span'); box.className='dbox'; pick.parentNode.insertBefore(box, pick);
  const txt=document.createElement('input'); txt.className='dtxt'; txt.readOnly=true; txt.placeholder=pick.dataset.ph||'누르면 달력'; txt.title='누르면 달력 · 한 번 더 누르면 직접 입력 (예: 2026-12-05, 12/5)'; txt.setAttribute('inputmode','numeric');
  box.appendChild(txt); box.appendChild(pick); pick.classList.add('dpick'); pick.tabIndex=-1;
  const paint=()=>{ if(!txt.dataset.editing) txt.value=dateDisp(pick.value); };
  const set=v=>{ pick.value=v; pick.dispatchEvent(new Event('input',{bubbles:true})); pick.dispatchEvent(new Event('change',{bubbles:true})); paint(); };
  const openPick=()=>{ try{ pick.showPicker(); }catch(_){ pick.focus(); } };
  const startEdit=blank=>{ txt.dataset.editing='1'; txt.readOnly=false; txt.value = blank ? '' : pick.value; txt.focus(); if(!blank) txt.select(); };
  txt.addEventListener('mousedown', e=>{ if(txt.dataset.editing) return;
    if(Date.now()-(+txt.dataset.pickAt||0) < 20000){ e.preventDefault(); txt.dataset.pickAt=''; startEdit(false); return; }   // 두 번째 누름 = 직접 입력
    txt.dataset.pickAt=String(Date.now()); setTimeout(openPick,0); });
  txt.addEventListener('keydown', e=>{ if(!txt.dataset.editing && /^\d$/.test(e.key)) startEdit(true); else if(!txt.dataset.editing && (e.key==='Enter' || e.key===' ')){ e.preventDefault(); openPick(); } else if(txt.dataset.editing && e.key==='Enter'){ e.preventDefault(); txt.blur(); } });
  txt.addEventListener('blur', ()=>{ if(!txt.dataset.editing) return; const d=parseDateText(txt.value);
    delete txt.dataset.editing; txt.readOnly=true;
    if(d===null){ alert('날짜를 알아볼 수 없습니다. 예) 2026-12-05, 12/5'); paint(); return; }
    if(d!==pick.value) set(d); else paint(); });
  pick.addEventListener('input', paint); pick.addEventListener('change', paint);
  pick.__paintBox = paint; paint();
}
const enhanceDates = root => (root||document).querySelectorAll('input[type=date]:not([data-dbox])').forEach(makeDateBox);
const syncDates = () => document.querySelectorAll('input[type=date][data-dbox]').forEach(p=>p.__paintBox && p.__paintBox());   // 코드로 값을 바꾼 뒤 칸 글자 맞춤
if(/[?&]catalog=1/.test(location.search)) return;
enhanceDates(); setInterval(syncDates, 400);   // 견적서 코드가 이용일 · 발행일 값을 바꿔도 칸 글자 (요일) 맞춤
})();
