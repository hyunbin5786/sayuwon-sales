// ===== 시각 고르기 (공통, 2026-11-18): 키보드 대신 스크롤해서 고르는 24시간 시각 =====
// 시각 칸에 data-tp="1" (한 시각 "13:30") 또는 data-tp="range" (시간대 "12:00~13:00")를 붙이면, 누를 때 아래에 시 · 분 목록이 뜸
//  - 시(06~19, 사유원 운영 시각 · 2026-11-18) · 분(5분 단위, 이미 적힌 분이 5분 단위가 아니면 그 분도) 를 스크롤해서 누름. 분을 누르면 닫힘 (시간대는 「끝」 분을 누르면)
//  - 고르면 칸 값을 바꾸고 input · change · focusout 을 보내서, 칸마다 원래 하던 저장 · 끝 시각 자동(+1시간) 등이 그대로 돌아감
//  - 바깥을 누르거나 Esc 면 닫힘 · 「지우기」로 비움
(function(){
  const css = `.tp-pop{position:fixed;z-index:2000;background:#fffefb;border:1px solid #dfdace;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:10px;display:flex;flex-direction:column;gap:8px;font:13px "Noto Sans KR",system-ui,sans-serif;color:#262620}
.tp-pop[hidden]{display:none}
.tp-blocks{display:flex;gap:12px}
.tp-block{display:flex;flex-direction:column;gap:4px}
.tp-block > b{font-size:11.5px;color:#77736a;text-align:center}
.tp-cols{display:flex;gap:4px}
.tp-col{height:200px;overflow-y:auto;scroll-snap-type:y mandatory;border:1px solid #ece8de;border-radius:8px;width:54px;padding:2px;scrollbar-width:thin}
.tp-col button{display:block;width:100%;height:30px;border:0;background:none;border-radius:6px;font:14px "Noto Sans KR",sans-serif;cursor:pointer;scroll-snap-align:center;color:#262620;font-variant-numeric:tabular-nums}
.tp-col button:hover{background:#e4eadf}
.tp-col button.on{background:#3f5236;color:#fff;font-weight:700}
.tp-col-h{font-size:10.5px;color:#9a968c;text-align:center}
.tp-btns{display:flex;justify-content:space-between;gap:6px}
.tp-btns button{height:28px;border:1px solid #dfdace;background:#fff;border-radius:7px;padding:0 10px;font:12px "Noto Sans KR",sans-serif;cursor:pointer;color:#262620}
.tp-btns button.ok{background:#3f5236;border-color:#3f5236;color:#fff;font-weight:700}
input[data-tp]{cursor:pointer;caret-color:transparent}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  const pad = n => String(n).padStart(2,'0');
  const H_MIN=6, H_MAX=19;   // 고를 수 있는 시: 06시 ~ 19시 (이미 적힌 시각이 밖이면 그 시도 목록에)
  const parse = v => { const m=String(v||'').match(/(\d{1,2}):?(\d{2})/); return m ? [Math.min(23,+m[1]), Math.min(59,+m[2])] : null; };
  const fmt = (h,m) => `${pad(h)}:${pad(m)}`;
  let pop=null, cur=null, val=null;   // cur = 지금 고르는 칸, val = [[h,m]] 또는 [[h,m],[h,m]] (시간대)
  function build(){
    pop=document.createElement('div'); pop.className='tp-pop'; pop.hidden=true; document.body.appendChild(pop);
    pop.addEventListener('mousedown', e=>e.preventDefault());   // 칸에서 포커스가 빠지지 않게
    pop.addEventListener('click', e=>{
      const b=e.target.closest('button'); if(!b) return;
      if(b.dataset.act==='clear'){ apply(''); close(); return; }
      if(b.dataset.act==='close'){ close(); return; }
      const i=+b.dataset.i, part=b.dataset.p, n=+b.dataset.n;
      if(!val[i]) val[i] = i===1 && val[0] ? [Math.min(H_MAX,val[0][0]+1), val[0][1]] : [9,0];
      if(part==='h') val[i][0]=n; else val[i][1]=n;
      if(i===0 && val.length===2 && (!val[1] || val[1][0]*60+val[1][1] <= val[0][0]*60+val[0][1])) val[1]=[Math.min(H_MAX,val[0][0]+1), val[0][1]];   // 시간대: 끝 = 시작 + 1시간 (끝이 앞서면)
      paint(); apply(text());
      if(part==='m' && i===val.length-1) close();
    });
  }
  const text = () => val.length===2 ? (val[0] ? fmt(...val[0]) : '') + '~' + (val[1] ? fmt(...val[1]) : '') : (val[0] ? fmt(...val[0]) : '');
  function colHTML(i, part, n, max, step, sel){
    const vals=[]; for(let x=n;x<=max;x+=step) vals.push(x); if(sel!=null && !vals.includes(sel)) { vals.push(sel); vals.sort((a,b)=>a-b); }
    return `<div><div class="tp-col-h">${part==='h'?'시':'분'}</div><div class="tp-col" data-col="${i}${part}">${vals.map(x=>`<button type="button" data-i="${i}" data-p="${part}" data-n="${x}" class="${sel===x?'on':''}">${pad(x)}</button>`).join('')}</div></div>`;
  }
  function paint(){
    const blocks = val.map((v,i)=>`<div class="tp-block">${val.length===2?`<b>${i?'끝':'시작'}</b>`:''}<div class="tp-cols">${colHTML(i,'h',H_MIN,H_MAX,1,v?v[0]:null)}${colHTML(i,'m',0,55,5,v?v[1]:null)}</div></div>`).join('');
    const keep=[...pop.querySelectorAll('.tp-col')].map(c=>[c.dataset.col, c.scrollTop]);
    pop.innerHTML = `<div class="tp-blocks">${blocks}</div><div class="tp-btns"><button type="button" data-act="clear">지우기</button><button type="button" class="ok" data-act="close">닫기</button></div>`;
    if(keep.length) keep.forEach(([k,t])=>{ const c=pop.querySelector(`[data-col="${k}"]`); if(c) c.scrollTop=t; });
    else pop.querySelectorAll('.tp-col').forEach(c=>{ const on=c.querySelector('.on') || c.querySelector('[data-n="9"]') || c.firstElementChild; if(on) c.scrollTop = on.offsetTop - c.clientHeight/2 + on.offsetHeight/2; });
  }
  function place(){ if(!live() || !pop || pop.hidden) return; const r=cur.getBoundingClientRect(), w=pop.offsetWidth, h=pop.offsetHeight;
    let top=r.bottom+4; if(top+h > innerHeight-8) top=Math.max(8, r.top-h-4); pop.style.top=top+'px'; pop.style.left=Math.max(8, Math.min(r.left, innerWidth-w-8))+'px'; }
  // 고르는 사이 화면이 다시 그려져 칸이 바뀌면 (예: 다음날 고객 응대 준비 표) 같은 칸(id · data-…)을 다시 찾아서 씀 (2026-11-21)
  let curSel='';
  const selOf = el => { const a=[...el.attributes].filter(x=>x.name==='id' || (/^data-/.test(x.name) && x.name!=='data-tp')); return a.length ? 'input'+a.map(x=>x.name==='id' ? '#'+CSS.escape(x.value) : `[${x.name}="${CSS.escape(x.value)}"]`).join('') : ''; };
  const live = () => { if(cur && !cur.isConnected && curSel){ const n=document.querySelector(curSel); if(n) cur=n; } return cur; };
  function apply(v){ if(!live()) return; cur.value=v; cur.dispatchEvent(new Event('input',{bubbles:true})); cur.dispatchEvent(new Event('change',{bubbles:true})); }
  function open(el){
    if(!pop) build(); if(cur===el && !pop.hidden) return;
    cur=el; curSel=selOf(el); const range=el.dataset.tp==='range';
    if(range){ const [a,b]=String(el.value||'').split('~'); val=[parse(a), parse(b)]; } else val=[parse(el.value)];
    pop.innerHTML=''; pop.hidden=false; paint(); place();   // 보이게 한 뒤 그려야 고른 시각으로 스크롤됨
  }
  function close(){ if(!pop || pop.hidden) return; pop.hidden=true; live(); const el=cur; cur=null; if(el){ el.dispatchEvent(new FocusEvent('focusout',{bubbles:true})); el.dispatchEvent(new Event('blur')); } }
  window.syTimePick = { open, close };
  document.addEventListener('click', e=>{ const el=e.target.closest?.('input[data-tp]'); if(el){ open(el); return; } if(pop && !pop.hidden && !pop.contains(e.target)) close(); }, true);
  document.addEventListener('focusin', e=>{ const el=e.target; if(el.matches?.('input[data-tp]')){ el.readOnly=true; } });   // 키보드로 치지 않음 (스크롤로 고르기)
  document.addEventListener('keydown', e=>{ if(pop && !pop.hidden && e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);
  window.addEventListener('scroll', place, true); window.addEventListener('resize', place);
})();
