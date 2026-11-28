// ===== 고객 응대 보조 · 예약 현황 공유 (status.html, 2026-11-18) =====
// 방문자내역 엑셀(전산 → 방문자내역, 하루 한 파일 · 여러 날 함께) → 날짜마다 표:
//   구분(오전입장 · 오후입장 · 사담 런치 1부 · 2부 · 디너 · 몽몽마방 사유의 밥상 · 그 밖의 상품) · 인원 · 세부(홈페이지 · 네이버) · 단체 예약 포함
//  - 홈페이지 인원 = 엑셀의 상품 줄 인원(어른 + 학생) 합. 사유의 밥상(단체)는 뺌 (관람 인원은 그대로)
//  - 네이버 인원: 네이버 예약자관리 엑셀(.xlsx · 비밀번호)을 함께 넣으면 날짜마다 오전 · 오후 입장의 「네이버」 칸에 (js/naverxl.js · 네이버 이관 2단계와 같은 환불 계산), 직접 고쳐도 됨
//  - 단체 예약 포함 = 할인이 「단체관람」이거나 그날 단체예약(공유 기록)과 연락처 · 이름이 맞는 예약 → 「단체명(담당자) n명」을 그 구분 칸에
//  - 모든 칸은 화면에서 바로 고칠 수 있고(이 브라우저에 기억), 「사진으로 저장」은 아래 미리보기를 그대로 PNG 로
(function(){
  const $=s=>document.querySelector(s), esc=SY.esc, DOW=SY.DOW;
  const user=SY.user()||{}; $('#me').innerHTML = user.name ? `👤 <b>${esc(user.name)}</b>` : '';
  let toastT; const toast = m => { const t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'), 2600); };
  const LS='sy_status_v1', FOOT_DEF='집계 기준 | 홈페이지 예약 + 네이버 확정 인원 · 사유의 밥상(단체) 제외 · 단체 예약 인원은 해당 상품 인원에 포함';
  const TITLE='사유원 예약 현황';   // 제목은 고정 (2026-11-19 · 제목 칸 없앰)
  let st = SY.readJSON(LS, null) || { title:TITLE, foot:FOOT_DEF, days:[] };
  // ---------- 팀 공유 (2026-11-21): 이 화면 내용 전체 = 공유 기록 한 줄(id statusdb · 통화 구분 「예약현황공유」) ----------
  //  고치면 1.5초 뒤 올리고, 열 때 · 30초마다 · 이 창으로 돌아올 때 다른 사람이 고친 것을 받음 (마지막에 저장한 것이 이김)
  //  날이 바뀌면 지난 날짜는 지움(keepTwo) → 지운 것도 올림. 하루 동안은 그대로 유지 · 공유
  const SHARE_ID='statusdb', SHARE_TYPE='예약현황공유', me=(SY.user()||{}).name||'';
  let pushT=null, pushing=false;
  async function pushShare(){ pushT=null; if(!SY.getKey()) return; pushing=true;
    try{ const now=st.at||new Date().toISOString(), item={id:SHARE_ID, callType:SHARE_TYPE, saved:now, takenBy:me, owner:me, summary:`예약 현황 공유 ${st.days.map(d=>d.date).join(' · ')}`, history:JSON.stringify({st, at:now, by:me})};
      await SY.call({action:'put', item}); paintShare(`공유됨 · ${hm(now)} ${me}`); }
    catch(e){ paintShare('공유 못 함 · 잠시 뒤 다시', true); }
    finally{ pushing=false; } }
  const save = () => { st.at=new Date().toISOString(); st.by=me; SY.writeJSON(LS, st); clearTimeout(pushT); paintShare('공유 중…'); pushT=setTimeout(pushShare, 1500); };
  async function pullShare(){ if(!SY.getKey() || pushing || pushT) return;   // 올리는 중 · 올릴 것이 남아 있으면 받지 않음
    try{ const j=await SY.list(); const r=(j.items||[]).find(x=>x.id===SHARE_ID); if(!r) return; let h=null; try{ h=JSON.parse(r.history||'null'); }catch(_){}
      if(!h || !h.st) return; const el=document.activeElement, typing=el && el.closest && el.closest('#stEdit') && /INPUT|TEXTAREA/.test(el.tagName);
      if(String(h.at||'') > String(st.at||'') && !typing){ st=h.st; SY.writeJSON(LS, st); render(); paintShare(`${hm(h.at)} ${h.by||''} 님이 고친 내용을 받았습니다`); } }
    catch(_){} }
  const hm = iso => { const x=new Date(iso||''); return isNaN(x) ? '' : `${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`; };   // 이 컴퓨터 시각
  function paintShare(t, bad){ const el=document.getElementById('shareSt'); if(el){ el.textContent=t; el.className='share-st'+(bad?' bad':''); } }
  const digits = s => String(s||'').replace(/\D/g,''), norm = s => String(s||'').replace(/\s/g,'').toLowerCase();
  const dLab = d => { const t=new Date(d+'T00:00'); return isNaN(t) ? d : `${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]})`; };
  const dLong = d => { const t=new Date(d+'T00:00'); return isNaN(t) ? d : `${t.getFullYear()}. ${t.getMonth()+1}. ${t.getDate()}.(${DOW[t.getDay()]})`; };

  // ---------- 단체예약 (공유 기록) : 이름 가져오기 ----------
  const GROUP_TYPES=['단체예약','예약상담','가예약','예약확정','예약접수','상담','공식예약'];
  let groups = (SY.readJSON('sayuwon_intake_cache', [])||[]).filter(r=>GROUP_TYPES.includes(r.callType||'단체예약'));
  async function loadGroups(){
    if(!SY.getKey()){ ($('#keyBox')||{}).hidden=false; return; }
    try{ let j; try{ j=await SY.list(); }catch(e){ j={ok:false, error:e.code||e.message}; }
      if(!j.ok){ if(j.error==='bad_key') ($('#keyBox')||{}).hidden=false; return; }
      groups=(j.items||[]).filter(r=>GROUP_TYPES.includes(r.callType||'단체예약')); ($('#keyBox')||{}).hidden=true; }catch(_){}
  }
  // (팀 비밀번호 입력 칸은 없앰 · 2026-11-21 — 서버는 로그인으로 확인)

  // ---------- 엑셀 읽기 (전산 방문자내역: HTML 표 모양의 .xls) ----------
  const cellLines = td => td ? td.innerHTML.split(/<br\s*\/?>/i).map(h=>{ const d=document.createElement('div'); d.innerHTML=h; return d.textContent.replace(/\s+/g,' ').trim(); }).filter((s,i,a)=>s!=='' || i<a.length-1) : [];
  function parse(text){
    const doc=new DOMParser().parseFromString(text,'text/html'), trs=[...doc.querySelectorAll('tr')];
    const hi=trs.findIndex(tr=>/성명/.test(tr.textContent) && /연락처/.test(tr.textContent)); if(hi<0) throw new Error('방문자내역 표(성명 · 연락처 열)를 찾지 못했습니다.');
    const cols=[], sub=[...(trs[hi+1]||{children:[]}).children].map(td=>td.textContent.trim()); let si=0;
    [...trs[hi].children].forEach(td=>{ const n=+td.getAttribute('colspan')||1, h=td.textContent.replace(/\s/g,''); if(n>1) for(let i=0;i<n;i++) cols.push(h+'·'+(sub[si++]||i)); else cols.push(h); });
    const ix = re => cols.findIndex(c=>re.test(c));
    const C={ name:ix(/^성명/), phone:ix(/^연락처/), prog:ix(/^프로그램/), adult:ix(/어른/), student:ix(/학생/), disc:ix(/^할인$/) };
    const rows=[];
    trs.slice(hi+1).forEach(tr=>{ const tds=[...tr.children]; if(tds.length<cols.length-2 || !tds[C.name]) return; const name=tds[C.name].textContent.trim(); if(!name) return;
      const prods=cellLines(tds[C.prog]).filter(Boolean), ad=cellLines(tds[C.adult]).map(v=>+v||0), stu=cellLines(tds[C.student]).map(v=>+v||0);
      rows.push({ name, phone:tds[C.phone]?.textContent.trim()||'', items:prods.map((p,k)=>({p, n:(ad[k]||0)+(stu[k]||0)})), disc: C.disc>=0 ? cellLines(tds[C.disc]).join(' ') : '' }); });
    const head=(doc.querySelector('title')||{}).textContent+' '+trs.slice(0,hi).map(t=>t.textContent).join(' '), dm=head.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    const date = dm ? `${dm[1]}-${dm[2].padStart(2,'0')}-${dm[3].padStart(2,'0')}` : '';
    if(!date) throw new Error('엑셀에서 날짜를 찾지 못했습니다.');
    return {date, rows};
  }
  // 상품 → 구분
  const ORDER=['오전입장','오후입장','사담 런치 1부','사담 런치 2부','사담 디너','몽몽마방 사유의 밥상'];
  // 방문자내역의 상품 이름이 「네이버 …」로 시작하면 네이버 예약 (2026-11-26 · 예: 「네이버 평일 관람(09:00~18:00)」) → 구분은 같은 줄, 인원은 「네이버」 칸
  const NV_RE=/^\s*네이버\s*/;
  function catOf(p){
    const s=String(p).replace(NV_RE,'').replace(/^(평일|주말\/공휴일|주말|공휴일)\s*/,'').trim();
    if(/사유의\s*밥상\(단체\)/.test(s)) return null;   // 단체 식사는 뺌 (관람은 따로 셈)
    const pk=s.match(/^\(관람,\s*(.+)\)$/); if(pk) return pk[1].replace(/\s+/g,' ').replace(/런치\s*(\d)부/,'런치 $1부').trim();
    if(/관람\(09:00~18:00\)/.test(s) || /^관람$/.test(s)) return '오전입장';
    if(/관람\(13:00~18:00\)/.test(s)) return '오후입장';
    return s;
  }
  function buildDay(v){
    // 2026-11-19: 단체예약 등 다른 기록과 연결하지 않고 엑셀 표 그대로 — 단체 = 할인 「단체관람」이거나 10명 이상, 이름 = 엑셀 성명 그대로
    const map={};
    const row = c => map[c] ||= {cat:c, home:0, naver:0, groups:[]};
    v.rows.forEach(x=>{
      const ppl = x.items.reduce((a,it)=>a+(+it.n||0),0);
      const isGroup = /단체관람/.test(x.disc) || ppl>=10;
      const gName = String(x.name||'').trim();
      x.items.forEach(it=>{ const c=catOf(it.p); if(!c || !it.n) return; const r=row(c); r[NV_RE.test(it.p)?'naver':'home']+=it.n; if(isGroup) r.groups.push(`${gName} ${it.n}명`); });   // 「네이버 …」 상품은 네이버 칸 (2026-11-26)
    });
    ORDER.forEach(c=>{ if(c==='오전입장' || c==='오후입장') row(c); });   // 입장은 0명이어도 줄
    const rows=Object.values(map).sort((a,b)=>{ const ia=ORDER.indexOf(a.cat), ib=ORDER.indexOf(b.cat); return (ia<0?99:ia)-(ib<0?99:ib) || a.cat.localeCompare(b.cat,'ko'); })
      .filter(r=>r.home>0 || r.naver>0 || ORDER.slice(0,2).includes(r.cat)).map(r=>({cat:r.cat, home:r.home, naver:r.naver, groups:r.groups.join('\n')}));
    // nvx = 방문자내역에서 센 네이버 인원 (날짜 아래 요약 글에 씀). 예전에 넣어 둔 네이버 엑셀 · 직접 입력 값을 입힐지는 readFiles 가 정함 (나중에 넣은 것이 이김)
    const nvAll=rows.reduce((a,r)=>a+r.naver,0), nvOf=c=>(rows.find(r=>r.cat===c)||{}).naver||0;
    return {date:v.date, rows, nvx: nvAll ? {am:nvOf('오전입장'), pm:nvOf('오후입장'), all:nvAll} : null};
  }
  // ---------- 네이버 예약자관리 엑셀 (2026-11-19): 날짜마다 오전 · 오후 인원 → 그 날짜의 오전입장 · 오후입장 줄 「네이버」 칸 ----------
  st.naver ||= {};   // { 'YYYY-MM-DD': {am, pm, n, full, partial, check:[]} } · 방문자내역을 나중에 넣어도 들어감
  // 이 화면은 무조건 오늘 + 내일 2일만 (2026-11-21): 날짜 표 · 네이버 인원 모두 — 다른 날짜는 넣어도 빼고, 날이 바뀌면 지난 날짜는 저절로 빠짐
  const twoDays = () => { const a=new Date(), b=new Date(); b.setDate(b.getDate()+1); return [SY.ymd(a), SY.ymd(b)]; };
  const inTwo = d => twoDays().includes(d);
  function keepTwo(){ const n0=st.days.length+Object.keys(st.naver).length; st.days=st.days.filter(d=>inTwo(d.date)); Object.keys(st.naver).forEach(d=>{ if(!inTwo(d)) delete st.naver[d]; }); if(st.days.length+Object.keys(st.naver).length!==n0) SY.writeJSON(LS, st); }   // 지난 날짜 지우기는 「고친 것」이 아님 (공유 시각을 바꾸지 않아 다른 사람의 오늘 내용을 그대로 받음, 2026-11-21)
  keepTwo();
  function applyNaver(day){
    const nv=st.naver[day.date]; if(!nv) return day;
    [['오전입장','am'],['오후입장','pm']].forEach(([c,k])=>{ let r=day.rows.find(x=>x.cat===c); if(!r){ r={cat:c, home:0, naver:0, groups:''}; day.rows.splice(k==='am'?0:1, 0, r); } r.naver=nv[k]; });
    Object.entries(nv.extra||{}).forEach(([c,n])=>{ let r=day.rows.find(x=>x.cat===c); if(!r){ r={cat:c, home:0, naver:0, groups:''}; day.rows.push(r); } r.naver=n; });   // 사진에서 그 밖의 구분으로 고른 줄
    return day;
  }
  // ---------- 네이버 예약 달력 사진 (2026-11-19 · 엑셀이 안 될 때): 파란 「확정」 숫자 → 확인 표 → 넣기 ----------
  const IMG_MAP_LS='sy_status_nvimg_map2';   // 줄마다 고른 구분 (다음에도 같게) · 기본: 1번째 줄 전체(확인용) · 2번째 오전 · 3번째 오후 (2026-11-19)
  const IMG_DEF=['전체','오전입장','오후입장'];
  let imgRes=null;   // {urls:[사진], dates:[날짜], grid:[[줄][날짜]], cats:[줄마다 구분]} — 사진을 더 넣으면 날짜가 옆에 붙음
  const imgCats = () => [...new Set(['오전입장','오후입장', ...ORDER.slice(2), ...st.days.flatMap(d=>d.rows.map(r=>r.cat)).filter(Boolean)])];
  // 사진의 「19」 → 날짜: 넣어 둔 방문자내역 날짜 중 그날이 있으면 그 날짜, 없으면 오늘에서 가까운 그날
  const guessDate = dd => { if(!dd) return ''; const hit=st.days.find(d=>+d.date.slice(8)===dd); if(hit) return hit.date;
    const t=new Date(); t.setHours(0,0,0,0); let c=new Date(t.getFullYear(), t.getMonth(), dd); if(c < new Date(t.getTime()-10*864e5)) c=new Date(t.getFullYear(), t.getMonth()+1, dd); return SY.ymd(c); };
  function paintImgBox(){
    const box=$('#nvImgBox'); if(!imgRes){ box.hidden=true; box.innerHTML=''; return; }
    const cats=imgCats(), R=imgRes;
    const sel = ri => { const v=R.cats[ri]; return `<select data-imgcat="${ri}"><option value="">(빼기)</option><option value="전체"${v==='전체'?' selected':''}>전체 (확인용)</option>${cats.map(c=>`<option${c===v?' selected':''}>${esc(c)}</option>`).join('')}</select>`; };
    // 확인: 전체 = 오전 + 오후 인지 (전체 줄에 숫자가 있을 때만)
    const ti=R.cats.indexOf('전체'), warn=R.dates.map((d,ci)=>{ if(ti<0) return ''; const tot=R.grid[ti][ci]||0; if(!tot) return ''; const s=R.grid.reduce((a,row,ri)=>a+(/입장$/.test(R.cats[ri]||'') ? (row[ci]||0) : 0),0); return s!==tot ? `전체 ${tot} ≠ 오전 + 오후 ${s}` : ''; });
    box.hidden=false;
    box.innerHTML = `<div class="ni-grid"><div class="ni-pic">${R.urls.map(u=>`<img src="${u}" alt="넣은 사진">`).join('')}</div><div class="ni-tbl"><b>사진에서 읽은 네이버 확정 인원</b>`
      + `<table class="ed-t"><thead><tr><th>줄 (위에서부터)</th>${R.dates.map((d,ci)=>`<th><input type="date" data-imgdate="${ci}" value="${esc(d)}"></th>`).join('')}</tr></thead><tbody>`
      + R.grid.map((row,ri)=>`<tr><td>${ri+1}번째 줄 ${sel(ri)}</td>${row.map((n,ci)=>`<td><input class="n" inputmode="numeric" data-imgn="${ri}|${ci}" value="${n}"></td>`).join('')}</tr>`).join('')
      + (warn.some(Boolean) ? `<tr><td class="ni-warn">확인</td>${warn.map(w=>`<td class="ni-warn">${w?'⚠ '+esc(w):''}</td>`).join('')}</tr>` : '')
      + `</tbody></table><div class="ni-btns"><button type="button" class="btn" id="niClose">닫기</button><button type="button" class="btn primary" id="niApply">넣기</button></div></div></div>`;
  }
  async function readImg(blob){
    $('#fileErr').textContent=''; const box=$('#nvImgBox'); const keep=box.innerHTML; box.hidden=false;
    const msg=document.createElement('p'); msg.className='hint'; msg.textContent='사진을 읽는 중…'; if(imgRes) box.prepend(msg); else { box.innerHTML=''; box.appendChild(msg); }
    try{ const r=await NaverImg.read(blob, s=>{ msg.textContent=s; });
      const m=SY.readJSON(IMG_MAP_LS, null);
      if(!imgRes) imgRes={ urls:[], dates:[], grid:[], cats:[] };
      const R=imgRes; R.urls.push(r.url);
      r.grid.forEach((_,ri)=>{ if(!R.grid[ri]){ R.grid[ri]=R.dates.map(()=>0); R.cats[ri] = m && m[ri]!=null ? m[ri] : (IMG_DEF[ri]||''); } });
      r.days.forEach((dd,ci)=>{ const date=guessDate(dd); let k = date ? R.dates.indexOf(date) : -1;   // 같은 날짜면 덮어씀, 아니면 옆에 붙임
        if(k<0){ k=R.dates.length; R.dates.push(date); R.grid.forEach(row=>row.push(0)); }
        R.grid.forEach((row,ri)=>{ row[k] = (r.grid[ri]||[])[ci] || 0; }); });
      paintImgBox(); toast('사진을 읽었습니다. 날짜 · 숫자를 확인하고 [넣기]를 누르세요.'); }
    catch(e){ msg.remove(); if(!imgRes){ box.hidden=true; box.innerHTML=''; } else if(!box.innerHTML) box.innerHTML=keep; $('#fileErr').textContent = e.message||'사진을 읽지 못했습니다.'; }
  }
  // 네이버 사진 올리기는 없앰 (2026-11-19) — 네이버 엑셀이 안 되면 직접 입력 팝업
  if($('#nvImgFile')) $('#nvImgFile').addEventListener('change', e=>{ const fs=[...e.target.files]; e.target.value=''; (async()=>{ for(const f of fs) await readImg(f); })(); });   // 여러 장 한 번에 (토 · 일)
  if($('#nvImgFile')) document.addEventListener('paste', e=>{ const it=[...(e.clipboardData||{}).items||[]].find(i=>/^image\//.test(i.type)); if(!it) return; e.preventDefault(); readImg(it.getAsFile()); });   // 캡처 → Ctrl+V
  document.addEventListener('change', e=>{ const t=e.target; if(!imgRes) return;
    if(t.dataset.imgcat!=null){ imgRes.cats[+t.dataset.imgcat]=t.value; SY.writeJSON(IMG_MAP_LS, imgRes.cats); }
    if(t.dataset.imgdate!=null) imgRes.dates[+t.dataset.imgdate]=t.value;
    if(t.dataset.imgn!=null){ const [ri,ci]=t.dataset.imgn.split('|').map(Number); t.value=t.value.replace(/\D/g,''); imgRes.grid[ri][ci]=+t.value||0; } });
  document.addEventListener('click', e=>{
    if(e.target.id==='niClose'){ imgRes=null; paintImgBox(); return; }
    if(e.target.id!=='niApply' || !imgRes) return;
    const R=imgRes, put=[], wait=[];
    R.dates.forEach((date,ci)=>{ if(!date || !inTwo(date)) return; const v={am:0, pm:0, extra:{}, src:'img'};
      R.grid.forEach((row,ri)=>{ const c=R.cats[ri], n=row[ci]||0; if(!c || c==='전체') return;   /* 전체는 확인용 (넣지 않음) */ if(c==='오전입장') v.am+=n; else if(c==='오후입장') v.pm+=n; else v.extra[c]=(v.extra[c]||0)+n; });
      st.naver[date]=v; const d=st.days.find(x=>x.date===date); if(d){ applyNaver(d); put.push(dLab(date)); } else wait.push(dLab(date)); });
    save(); imgRes=null; paintImgBox(); render();
    toast([put.length?`네이버 인원을 넣었습니다 (${put.join(' · ')})`:'', wait.length?`${wait.join(' · ')}: 그 날짜 방문자내역을 넣으면 들어갑니다`:''].filter(Boolean).join(' · ') || '넣을 날짜가 없습니다.');
  });
  // ---------- 네이버 엑셀을 못 읽으면 (2026-11-19): 팝업에서 날짜마다 오전 · 오후 네이버 인원을 직접 ----------
  let manRows=[];   // [{date, am, pm}]
  function openNaverManual(why){
    // 네이버 입력은 늘 오늘 + 내일 2일 (2026-11-21 · 예전엔 넣어 둔 방문자내역 날짜가 모두 쌓여 나옴)
    const t0=new Date(), t1=new Date(); t1.setDate(t1.getDate()+1);
    manRows=[SY.ymd(t0), SY.ymd(t1)].map(date=>{ const v=st.naver[date]||{}; return {date, am:v.am??'', pm:v.pm??''}; });
    $('#nvManTitle').textContent = why ? '네이버 엑셀 오류 · 직접 입력' : '네이버 인원을 직접 넣어 주세요';
    $('#nvManMsg').textContent = `${why ? (why==='네이버 엑셀 오류' ? '네이버 엑셀 오류입니다. ' : `네이버 엑셀 오류입니다 (${why}). `) : ''}네이버 예약 화면을 보고 날짜마다 오전 · 오후 확정 인원을 넣으면 그 날짜의 「네이버」 칸에 들어갑니다.`;
    paintMan(); $('#nvManModal').hidden=false; setTimeout(()=>$('#nvManBody input[data-man$="|am"]')?.focus(), 0); }
  function paintMan(){ $('#nvManBody').innerHTML = manRows.map((r,i)=>`<tr><td><input type="date" data-man="${i}|date" value="${esc(r.date)}"></td><td><input class="n" inputmode="numeric" data-man="${i}|am" value="${esc(String(r.am))}" placeholder="0"></td><td><input class="n" inputmode="numeric" data-man="${i}|pm" value="${esc(String(r.pm))}" placeholder="0"></td><td>${manRows.length>1?`<button type="button" class="btn sm" data-mandel="${i}" title="이 날짜 빼기">×</button>`:''}</td></tr>`).join(''); }
  document.addEventListener('input', e=>{ const m=e.target.dataset && e.target.dataset.man; if(!m) return; const [i,f]=m.split('|'); if(f!=='date') e.target.value=e.target.value.replace(/\D/g,''); manRows[+i][f]=e.target.value; });
  document.addEventListener('click', e=>{ const d=e.target.closest && e.target.closest('[data-mandel]'); if(d){ manRows.splice(+d.dataset.mandel,1); paintMan(); } });
  $('#nvManAdd').onclick=()=>{ const last=manRows[manRows.length-1]; let nd=SY.ymd(new Date()); if(last && last.date){ const x=new Date(last.date+'T00:00'); x.setDate(x.getDate()+1); nd=SY.ymd(x); } manRows.push({date:nd, am:'', pm:''}); paintMan(); };
  $('#nvManNo').onclick=()=>{ $('#nvManModal').hidden=true; };
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#nvManModal').hidden) $('#nvManModal').hidden=true; });
  $('#nvManOk').onclick=()=>{ const put=[], wait=[];
    manRows.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date) && inTwo(r.date) && (r.am!=='' || r.pm!=='')).forEach(r=>{ st.naver[r.date]={am:+r.am||0, pm:+r.pm||0, extra:{}, src:'manual'}; const d=st.days.find(x=>x.date===r.date); if(d){ applyNaver(d); put.push(dLab(r.date)); } else wait.push(dLab(r.date)); });
    if(!put.length && !wait.length){ toast('넣을 인원을 적어 주세요.'); return; }
    $('#nvManModal').hidden=true; save(); render();
    toast([put.length?`네이버 인원을 넣었습니다 (${put.join(' · ')})`:'', wait.length?`${wait.join(' · ')}: 그 날짜 방문자내역을 넣으면 들어갑니다`:''].filter(Boolean).join(' · ')); };
  const PW_LS='sayuwon.xlsxPassword';   // 네이버 이관 화면과 같은 곳에 기억
  try{ $('#nvPw').value=localStorage.getItem(PW_LS)||''; }catch(_){}
  let pendingNaver=[];   // 비밀번호가 없어서 못 읽은 파일 → 비밀번호를 넣으면 다시
  const isNaverFile = h => (h[0]===0x50 && h[1]===0x4b) || (h[0]===0xd0 && h[1]===0xcf);   // .xlsx (비밀번호 걸린 것 포함)
  async function readFiles(files){
    if(window.syDaily && files && files.length) syDaily.mark('status', '엑셀 넣음');   // 하루 한 번 작업 기록 (2026-11-24 · js/dailyguard.js)
    $('#fileErr').textContent=''; const got=[], errs=[], nvGot=[], skip=[], newDays=[]; let nvFail='';   // nvFail: 네이버 엑셀을 못 읽은 이유 → 직접 입력 팝업
    for(const f of files){
      try{ const buf=await f.arrayBuffer(), h=new Uint8Array(buf.slice(0,4));
        if(isNaverFile(h)){
          if(!window.NaverXL || !window.XLSX) throw new Error('엑셀 도구를 불러오는 중입니다. 잠시 뒤 다시 넣어 주세요.');
          const pw=$('#nvPw').value;
          try{ const days=await NaverXL.read(f, pw); $('.in-opts').classList.remove('need');
            if(pw) try{ $('#nvKeep').checked ? localStorage.setItem(PW_LS, pw) : localStorage.removeItem(PW_LS); }catch(_){}
            Object.entries(days).forEach(([date,v])=>{ if(!inTwo(date)) return; st.naver[date]=v; nvGot.push(date); const d=st.days.find(x=>x.date===date); if(d) applyNaver(d); });   // 오늘 · 내일 것만
            pendingNaver=pendingNaver.filter(x=>x!==f);
          }catch(e){ if(e.code!=='need_pw' && /비밀번호/.test(e.message)){ if(!pendingNaver.includes(f)) pendingNaver.push(f); nvFail='네이버 엑셀 오류'; continue; }   // 비밀번호가 맞지 않음 → 오류 글 대신 직접 입력 팝업 (2026-11-19 · 맞는 비밀번호를 넣으면 다시 읽음)
            if(e.code==='need_pw'){ if(!pendingNaver.includes(f)) pendingNaver.push(f); $('.in-opts').classList.add('need'); $('#nvPw').focus(); throw e; }
            pendingNaver=pendingNaver.filter(x=>x!==f); nvFail=e.message||'알 수 없는 오류'; continue; }   // 비밀번호 말고 다른 오류 → 끝나고 직접 입력 팝업 (2026-11-19)
          continue;
        }
        const v=parse(new TextDecoder('utf-8').decode(buf));
        if(!inTwo(v.date)){ skip.push(dLab(v.date)); continue; }   // 오늘 · 내일이 아닌 방문자내역은 넣지 않음 (2026-11-21)
        const day=buildDay(v);
        st.days=st.days.filter(d=>d.date!==day.date); st.days.push(day); newDays.push(day); got.push(dLab(day.date)); }
      catch(e){ errs.push(`${f.name}: ${e.message||'읽지 못했습니다.'}`); }
    }
    // 네이버 칸은 나중에 넣은 것이 이김 (2026-11-26): 방문자내역에 「네이버 …」 상품이 있으면 예전에 넣어 둔 네이버 엑셀 · 직접 입력 값은 버리고 방문자내역 값.
    //  이번에 네이버 엑셀을 함께 넣었으면 엑셀 값 (전체 명단이라서). 방문자내역에 네이버 상품이 없으면 예전처럼 기억해 둔 값을 입힘
    newDays.forEach(day=>{ if(day.nvx && !nvGot.includes(day.date)) delete st.naver[day.date]; applyNaver(day); });
    if(skip.length) errs.push(`${skip.join(' · ')} 방문자내역은 넣지 않았습니다 (이 화면은 오늘 · 내일만)`);
    $('#fileErr').textContent=errs.join(' · ');
    st.days.sort((a,b)=>a.date.localeCompare(b.date)); save(); render();
    const nvShown=nvGot.filter(d=>st.days.some(x=>x.date===d)).sort(), nvWait=nvGot.filter(d=>!st.days.some(x=>x.date===d)).sort();
    const msg=[ got.length ? `${got.join(' · ')} 예약 현황을 만들었습니다` : '',
      nvShown.length ? `네이버 인원을 넣었습니다 (${nvShown.map(dLab).join(' · ')})` : '',
      nvWait.length ? `네이버 ${nvWait.map(dLab).join(' · ')}: 그 날짜 방문자내역을 넣으면 들어갑니다` : '' ].filter(Boolean);
    if(msg.length) toast(msg.join(' · '));
    if(nvFail) openNaverManual(nvFail);
  }
  $('#nvPw').addEventListener('keydown', e=>{ if(e.key==='Enter' && pendingNaver.length){ e.preventDefault(); readFiles(pendingNaver.slice()); } });
  $('#nvPw').addEventListener('change', ()=>{ if(pendingNaver.length && $('#nvPw').value) readFiles(pendingNaver.slice()); });
  $('#file').addEventListener('change', e=>{ if(e.target.files.length) readFiles([...e.target.files]); e.target.value=''; });
  const drop=$('#drop');
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e=>{ if(e.dataTransfer.files.length) readFiles([...e.dataTransfer.files]); });

  // ---------- 화면: 고치는 칸(왼쪽) + 사진과 똑같은 미리보기(오른쪽) ----------
  const PAL=[['#1f5c46','#e8f2ec','#eef6f1'],['#1f4f86','#e8f0f8','#eef4fa'],['#7a4b12','#f6efe4','#faf5ec'],['#5b3a7a','#f0eaf6','#f6f1fa']];   // 날짜마다 색 (글자 · 머리 · 인원 칸)
  const sum = (d,k) => d.rows.reduce((a,r)=>a+(+r[k]||0),0);
  function shotHTML(){
    const days=st.days, range = days.length ? (days.length===1 ? dLong(days[0].date) : `${dLong(days[0].date)} – ${dLong(days[days.length-1].date).replace(/^\d{4}\.\s*/,'')}`) : '';
    return `<div class="sh-wrap"><div class="sh-title">${esc(st.title)}</div><div class="sh-range">${esc(range)}</div>`
      + days.map((d,i)=>{ const [c,h,n]=PAL[i%PAL.length], home=sum(d,'home'), nav=sum(d,'naver');
        return `<div class="sh-card"><div class="sh-head"><b style="color:${c}">${esc(dLab(d.date))} 예약 현황</b><div class="sh-total" style="background:${h}"><span><b style="color:${c}">합계</b><small>홈페이지 ${home}${nav?` · 네이버 확정 ${nav}`:''}</small></span><em style="color:${c}">${home+nav}명</em></div></div>`
          + `<table><thead><tr style="background:${h}"><th>구분</th><th>인원</th><th>세부</th><th>단체 예약 포함</th></tr></thead><tbody>`
          + d.rows.map(r=>{ const tot=(+r.home||0)+(+r.naver||0), g=String(r.groups||'').trim();
            return `<tr><td class="c1">${esc(r.cat)}</td><td class="c2" style="background:${n};color:${c}">${tot}명</td><td class="c3">${+r.naver ? `홈페이지 예약 ${+r.home||0}명<br>네이버 예약 ${+r.naver}명` : '—'}</td><td class="c4">${g ? esc(g).replace(/\n/g,'<br>') : '—'}</td></tr>`; }).join('')
          + `</tbody></table></div>`; }).join('')
      + `<div class="sh-foot">${esc(st.foot)}</div></div>`;
  }
  // 날짜 아래 네이버 엑셀 요약 (몇 건 · 전액환불 · 일부 환불 · 확인할 것)
  const naverSum = date => { const v=st.naver[date], x=(st.days.find(d=>d.date===date)||{}).nvx;
    if(!v && x) return `<p class="nv-sum">네이버 (방문자내역 엑셀의 「네이버 …」 상품): 오전 <b>${x.am}</b>명 · 오후 <b>${x.pm}</b>명${x.all>x.am+x.pm?` · 그 밖 <b>${x.all-x.am-x.pm}</b>명`:''}</p>`;
    if(!v) return `<p class="nv-sum">네이버: 예약자관리 엑셀이나 사진을 아직 넣지 않음 (넣거나 「네이버」 칸에 직접)</p>`;
    if(v.src==='manual') return `<p class="nv-sum">네이버 직접 입력: 오전 <b>${v.am}</b>명 · 오후 <b>${v.pm}</b>명</p>`;
    if(v.src==='img') return `<p class="nv-sum">네이버 사진: 오전 <b>${v.am}</b>명 · 오후 <b>${v.pm}</b>명${Object.entries(v.extra||{}).map(([c,n])=>` · ${esc(c)} <b>${n}</b>명`).join('')} (사진의 확정 인원)</p>`;
    return `<p class="nv-sum">네이버 엑셀: 예약 ${v.n}건 → 오전 <b>${v.am}</b>명 · 오후 <b>${v.pm}</b>명${v.full?` · 전액환불 ${v.full}건 뺌`:''}${v.partial?` · 일부 환불 ${v.partial}건 인원 뺌`:''}`
      + (v.check||[]).map(c=>`<span class="warn">⚠ ${esc(c)}</span>`).join('') + `</p>`; };
  function editHTML(){
    return st.days.map((d,di)=>{ const home=sum(d,'home'), nav=sum(d,'naver');
      return `<div class="ed-day" data-di="${di}"><div class="ed-h"><b>${esc(dLab(d.date))}</b><span class="hint">홈페이지 ${home} · 네이버 ${nav} · 합계 ${home+nav}명</span><span class="sp"></span><button type="button" class="btn sm" data-addrow="${di}">＋ 줄 추가</button><button type="button" class="btn sm" data-delday="${di}">이 날짜 빼기</button></div>`
        + naverSum(d.date)
        + `<table class="ed-t"><thead><tr><th>구분</th><th>홈페이지</th><th>네이버</th><th>인원</th><th>단체 예약 포함 (한 줄에 하나)</th><th></th></tr></thead><tbody>`
        + d.rows.map((r,ri)=>`<tr><td><input data-f="${di}|${ri}|cat" data-ime="ko" value="${esc(r.cat)}"></td><td><input class="n" inputmode="numeric" data-f="${di}|${ri}|home" value="${+r.home||0}"></td><td><input class="n nv" inputmode="numeric" data-f="${di}|${ri}|naver" value="${+r.naver||0}"></td><td class="tot">${(+r.home||0)+(+r.naver||0)}명</td><td><textarea data-f="${di}|${ri}|groups" data-ime="ko" rows="1">${esc(r.groups||'')}</textarea></td><td><button type="button" class="ed-x" data-delrow="${di}|${ri}" title="이 줄 빼기">×</button></td></tr>`).join('')
        + `</tbody></table></div>`; }).join('')
      + (st.days.length ? `<label class="ed-foot">아래 글 <input data-foot data-ime="ko" value="${esc(st.foot)}"></label>` : '');
  }
  function paintShot(){ $('#stPrev').innerHTML=shotHTML(); requestAnimationFrame(fitPrev); }
  // 미리보기는 스크롤 없이 한눈에 (2026-11-19): 오른쪽 칸 너비 · 화면 높이(고정 헤더 · 버튼 줄 빼고)에 맞춰 통째로 줄임
  function fitPrev(){
    const box=document.querySelector('.pv-box'), v=$('#stPrev'), side=$('#stRight'); if(!box || !v || side.hidden) return;
    v.style.transform=''; v.style.width=''; box.style.height=''; box.style.width='';
    const inner=v.firstElementChild, w=(inner&&inner.offsetWidth)||v.scrollWidth, h=v.scrollHeight; if(!w || !h) return;   // 사진(.sh-wrap 800px) 크기 그대로
    const sticky=getComputedStyle(side).position==='sticky', top = sticky ? (parseFloat(getComputedStyle(side).top)||0) + (box.getBoundingClientRect().top - side.getBoundingClientRect().top) : 0;
    const availH = sticky ? Math.max(240, window.innerHeight - top - 16) : Infinity, s=Math.min(1, box.clientWidth/w, availH/h);
    if(s<1){ v.style.width=w+'px'; v.style.transform=`scale(${s})`; }
    box.style.height=Math.ceil(h*s)+'px'; box.style.width=Math.ceil(w*s)+'px';   // 미리보기 칸 = 저장되는 사진과 같은 비율 · 가운데 (2026-11-20)
  }
  window.addEventListener('resize', ()=>fitPrev());
  function render(){
    keepTwo();   // 화면을 켜 둔 채 날이 바뀌어도 오늘 · 내일만
    const has=st.days.length>0; $('#stClear').hidden=!has; $('#stRight').hidden=!has; st.title=TITLE;
    $('#stEdit').innerHTML = has ? `<div class="st-ed">${editHTML()}</div>` : '';
    if(has) paintShot();
    document.querySelectorAll('.ed-t textarea').forEach(t=>{ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; });
  }
  // 고치기 (칠 때마다 미리보기 · 합계만 다시)
  document.addEventListener('input', e=>{ const t=e.target;
    if(t.hasAttribute('data-foot')){ st.foot=t.value; save(); paintShot(); return; }
    const f=t.dataset.f; if(!f) return; const [di,ri,k]=f.split('|'), r=st.days[+di].rows[+ri];
    r[k] = k==='home'||k==='naver' ? (t.value=t.value.replace(/\D/g,''), +t.value||0) : t.value;
    if(t.tagName==='TEXTAREA'){ t.style.height='auto'; t.style.height=t.scrollHeight+'px'; }
    const tr=t.closest('tr'); if(tr) tr.querySelector('.tot').textContent=`${(+r.home||0)+(+r.naver||0)}명`;
    const d=st.days[+di], h=t.closest('.ed-day').querySelector('.ed-h .hint'); h.textContent=`홈페이지 ${sum(d,'home')} · 네이버 ${sum(d,'naver')} · 합계 ${sum(d,'home')+sum(d,'naver')}명`;
    save(); paintShot(); });
  document.addEventListener('click', e=>{
    const a=e.target.closest('[data-addrow]'); if(a){ st.days[+a.dataset.addrow].rows.push({cat:'', home:0, naver:0, groups:''}); save(); render(); return; }
    const x=e.target.closest('[data-delrow]'); if(x){ const [di,ri]=x.dataset.delrow.split('|').map(Number); st.days[di].rows.splice(ri,1); save(); render(); return; }
    const dd=e.target.closest('[data-delday]'); if(dd){ const d=st.days[+dd.dataset.delday]; if(!confirm(`${dLab(d.date)} 예약 현황을 뺄까요?`)) return; st.days.splice(+dd.dataset.delday,1); save(); render(); return; }
  });
  $('#stClear').onclick=()=>{ if(!confirm('만든 예약 현황과 고친 내용을 모두 지울까요?')) return; st={ title:st.title||'사유원 예약 현황', foot:FOOT_DEF, days:[], naver:{} }; save(); render(); };
  // 사진으로 저장: 미리보기와 같은 표를 화면 밖에 원래 크기로 그려 PNG 로
  $('#stPng').onclick=async()=>{
    if(!st.days.length) return; if(!window.html2canvas){ toast('잠시 뒤 다시 눌러 주세요.'); return; }
    const box=$('#stShot'); box.innerHTML=shotHTML();
    try{ const cv=await html2canvas(box.firstChild, {scale:2, backgroundColor:'#f3f6f9'}); const blob=await new Promise(ok=>cv.toBlob(ok,'image/png')), a=document.createElement('a');
      const nm=st.days.length>1 ? `${st.days[0].date}~${st.days[st.days.length-1].date.slice(5)}` : st.days[0].date;
      a.href=URL.createObjectURL(blob); a.download=`사유원_예약현황_${nm}.png`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 2000); toast('사진으로 저장했습니다.'); }
    catch(_){ toast('사진을 만들지 못했습니다.'); }
  };
  render();   // 단체예약 목록은 안 받음 (2026-11-19 · 엑셀 표 그대로)
  pullShare(); setInterval(()=>{ if(!document.hidden) pullShare(); }, 30000); window.addEventListener("focus", pullShare);   // 팀 공유: 열 때 · 30초마다 · 돌아올 때 받음 (2026-11-21)
})();
