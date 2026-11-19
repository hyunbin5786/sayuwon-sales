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
  const save = () => SY.writeJSON(LS, st);
  const digits = s => String(s||'').replace(/\D/g,''), norm = s => String(s||'').replace(/\s/g,'').toLowerCase();
  const dLab = d => { const t=new Date(d+'T00:00'); return isNaN(t) ? d : `${t.getMonth()+1}/${t.getDate()}(${DOW[t.getDay()]})`; };
  const dLong = d => { const t=new Date(d+'T00:00'); return isNaN(t) ? d : `${t.getFullYear()}. ${t.getMonth()+1}. ${t.getDate()}.(${DOW[t.getDay()]})`; };

  // ---------- 단체예약 (공유 기록) : 이름 가져오기 ----------
  const GROUP_TYPES=['단체예약','예약상담','가예약','예약확정','예약접수','상담','공식예약'];
  let groups = (SY.readJSON('sayuwon_intake_cache', [])||[]).filter(r=>GROUP_TYPES.includes(r.callType||'단체예약'));
  async function loadGroups(){
    if(!SY.getKey()){ $('#keyBox').hidden=false; return; }
    try{ const r=await fetch(SY.API_URL,{method:'POST',body:JSON.stringify({action:'list', key:SY.getKey()})}); const j=await r.json();
      if(!j.ok){ if(j.error==='bad_key') $('#keyBox').hidden=false; return; }
      groups=(j.items||[]).filter(r=>GROUP_TYPES.includes(r.callType||'단체예약')); $('#keyBox').hidden=true; }catch(_){}
  }
  $('#keyBtn').onclick=()=>{ const v=$('#keyIn').value.trim(); if(!v) return; try{ localStorage.setItem(SY.KEY_LS, v); }catch(_){} $('#keyIn').value=''; loadGroups().then(()=>toast('연결했습니다. 엑셀을 다시 넣으면 단체 이름이 들어갑니다.')); };

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
  function catOf(p){
    const s=String(p).replace(/^(평일|주말\/공휴일|주말|공휴일)\s*/,'').trim();
    if(/사유의\s*밥상\(단체\)/.test(s)) return null;   // 단체 식사는 뺌 (관람은 따로 셈)
    const pk=s.match(/^\(관람,\s*(.+)\)$/); if(pk) return pk[1].replace(/\s+/g,' ').replace(/런치\s*(\d)부/,'런치 $1부').trim();
    if(/관람\(09:00~18:00\)/.test(s) || /^관람$/.test(s)) return '오전입장';
    if(/관람\(13:00~18:00\)/.test(s)) return '오후입장';
    return s;
  }
  function buildDay(v){
    const dg=groups.filter(r=>String(r.date||'').slice(0,10)===v.date), used=new Set();
    const find = x => { const ph=digits(x.phone), nm=norm(x.name.replace(/\(.*?\)/g,''));
      return dg.find(r=>!used.has(r.id) && ph.length>=9 && String(r.phone||'').split(/\s*\/\s*/).map(digits).includes(ph))
        || dg.find(r=>!used.has(r.id) && [r.org, ...String(r.contact||'').split(/\s*\/\s*/)].map(norm).filter(Boolean).some(n=>n===nm)) || null; };
    const map={};
    const row = c => map[c] ||= {cat:c, home:0, naver:0, groups:[]};
    v.rows.forEach(x=>{
      const rec=find(x); if(rec) used.add(rec.id);
      const isGroup = !!rec || /단체관람/.test(x.disc);
      const gName = rec ? `${rec.org||x.name}${String(rec.contact||'').split(/\s*\/\s*/)[0] ? `(${String(rec.contact).split(/\s*\/\s*/)[0].trim()})` : ''}` : x.name;
      x.items.forEach(it=>{ const c=catOf(it.p); if(!c || !it.n) return; const r=row(c); r.home+=it.n; if(isGroup) r.groups.push(`${gName} ${it.n}명`); });
    });
    ORDER.forEach(c=>{ if(c==='오전입장' || c==='오후입장') row(c); });   // 입장은 0명이어도 줄
    const rows=Object.values(map).sort((a,b)=>{ const ia=ORDER.indexOf(a.cat), ib=ORDER.indexOf(b.cat); return (ia<0?99:ia)-(ib<0?99:ib) || a.cat.localeCompare(b.cat,'ko'); })
      .filter(r=>r.home>0 || ORDER.slice(0,2).includes(r.cat)).map(r=>({cat:r.cat, home:r.home, naver:0, groups:r.groups.join('\n')}));
    return applyNaver({date:v.date, rows});
  }
  // ---------- 네이버 예약자관리 엑셀 (2026-11-19): 날짜마다 오전 · 오후 인원 → 그 날짜의 오전입장 · 오후입장 줄 「네이버」 칸 ----------
  st.naver ||= {};   // { 'YYYY-MM-DD': {am, pm, n, full, partial, check:[]} } · 방문자내역을 나중에 넣어도 들어감
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
    box.innerHTML = `<div class="ni-grid"><div class="ni-pic">${R.urls.map(u=>`<img src="${u}" alt="넣은 사진">`).join('')}</div><div class="ni-tbl"><b>사진에서 읽은 네이버 확정 인원</b> <span class="hint">날짜 · 숫자가 맞는지 보고 [넣기] · 토 · 일처럼 화면이 나뉘면 사진을 더 넣으세요 (Ctrl+V · 날짜가 옆에 붙음)</span>`
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
  $('#nvImgBtn').onclick=()=>$('#nvImgFile').click();
  $('#nvImgFile').addEventListener('change', e=>{ const fs=[...e.target.files]; e.target.value=''; (async()=>{ for(const f of fs) await readImg(f); })(); });   // 여러 장 한 번에 (토 · 일)
  document.addEventListener('paste', e=>{ const it=[...(e.clipboardData||{}).items||[]].find(i=>/^image\//.test(i.type)); if(!it) return; e.preventDefault(); readImg(it.getAsFile()); });   // 캡처 → Ctrl+V
  document.addEventListener('change', e=>{ const t=e.target; if(!imgRes) return;
    if(t.dataset.imgcat!=null){ imgRes.cats[+t.dataset.imgcat]=t.value; SY.writeJSON(IMG_MAP_LS, imgRes.cats); }
    if(t.dataset.imgdate!=null) imgRes.dates[+t.dataset.imgdate]=t.value;
    if(t.dataset.imgn!=null){ const [ri,ci]=t.dataset.imgn.split('|').map(Number); t.value=t.value.replace(/\D/g,''); imgRes.grid[ri][ci]=+t.value||0; } });
  document.addEventListener('click', e=>{
    if(e.target.id==='niClose'){ imgRes=null; paintImgBox(); return; }
    if(e.target.id!=='niApply' || !imgRes) return;
    const R=imgRes, put=[], wait=[];
    R.dates.forEach((date,ci)=>{ if(!date) return; const v={am:0, pm:0, extra:{}, src:'img'};
      R.grid.forEach((row,ri)=>{ const c=R.cats[ri], n=row[ci]||0; if(!c || c==='전체') return;   /* 전체는 확인용 (넣지 않음) */ if(c==='오전입장') v.am+=n; else if(c==='오후입장') v.pm+=n; else v.extra[c]=(v.extra[c]||0)+n; });
      st.naver[date]=v; const d=st.days.find(x=>x.date===date); if(d){ applyNaver(d); put.push(dLab(date)); } else wait.push(dLab(date)); });
    save(); imgRes=null; paintImgBox(); render();
    toast([put.length?`네이버 인원을 넣었습니다 (${put.join(' · ')})`:'', wait.length?`${wait.join(' · ')}: 그 날짜 방문자내역을 넣으면 들어갑니다`:''].filter(Boolean).join(' · ') || '넣을 날짜가 없습니다.');
  });
  const PW_LS='sayuwon.xlsxPassword';   // 네이버 이관 화면과 같은 곳에 기억
  try{ $('#nvPw').value=localStorage.getItem(PW_LS)||''; }catch(_){}
  let pendingNaver=[];   // 비밀번호가 없어서 못 읽은 파일 → 비밀번호를 넣으면 다시
  const isNaverFile = h => (h[0]===0x50 && h[1]===0x4b) || (h[0]===0xd0 && h[1]===0xcf);   // .xlsx (비밀번호 걸린 것 포함)
  async function readFiles(files){
    $('#fileErr').textContent=''; const got=[], errs=[], nvGot=[];
    for(const f of files){
      try{ const buf=await f.arrayBuffer(), h=new Uint8Array(buf.slice(0,4));
        if(isNaverFile(h)){
          if(!window.NaverXL || !window.XLSX) throw new Error('엑셀 도구를 불러오는 중입니다. 잠시 뒤 다시 넣어 주세요.');
          const pw=$('#nvPw').value;
          try{ const days=await NaverXL.read(f, pw); $('.in-opts').classList.remove('need');
            if(pw) try{ $('#nvKeep').checked ? localStorage.setItem(PW_LS, pw) : localStorage.removeItem(PW_LS); }catch(_){}
            Object.entries(days).forEach(([date,v])=>{ st.naver[date]=v; nvGot.push(date); const d=st.days.find(x=>x.date===date); if(d) applyNaver(d); });
            pendingNaver=pendingNaver.filter(x=>x!==f);
          }catch(e){ if(e.code==='need_pw' || /비밀번호/.test(e.message)){ if(!pendingNaver.includes(f)) pendingNaver.push(f); $('.in-opts').classList.add('need'); $('#nvPw').focus(); } throw e; }
          continue;
        }
        const v=parse(new TextDecoder('utf-8').decode(buf)); const day=buildDay(v);
        st.days=st.days.filter(d=>d.date!==day.date); st.days.push(day); got.push(dLab(day.date)); }
      catch(e){ errs.push(`${f.name}: ${e.message||'읽지 못했습니다.'}`); }
    }
    $('#fileErr').textContent=errs.join(' · ');
    st.days.sort((a,b)=>a.date.localeCompare(b.date)); save(); render();
    const nvShown=nvGot.filter(d=>st.days.some(x=>x.date===d)).sort(), nvWait=nvGot.filter(d=>!st.days.some(x=>x.date===d)).sort();
    const msg=[ got.length ? `${got.join(' · ')} 예약 현황을 만들었습니다` : '',
      nvShown.length ? `네이버 인원을 넣었습니다 (${nvShown.map(dLab).join(' · ')})` : '',
      nvWait.length ? `네이버 ${nvWait.map(dLab).join(' · ')}: 그 날짜 방문자내역을 넣으면 들어갑니다` : '' ].filter(Boolean);
    if(msg.length) toast(msg.join(' · '));
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
  const naverSum = date => { const v=st.naver[date];
    if(!v) return `<p class="nv-sum">네이버: 예약자관리 엑셀이나 사진을 아직 넣지 않음 (넣거나 「네이버」 칸에 직접)</p>`;
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
  function paintShot(){ $('#stPrev').innerHTML=shotHTML(); }
  function render(){
    const has=st.days.length>0; $('#stBar').hidden=!has; $('#stRight').hidden=!has; st.title=TITLE;
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
  render(); loadGroups();
})();
