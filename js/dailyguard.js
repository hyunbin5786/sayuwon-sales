// ===== 하루 한 번만 하는 작업 (2026-11-24): 예약 현황 공유(status.html) · 네이버 예약 → 전산 이관(naver.html) =====
// 같은 날 두 사람이 따로 하면 안 되는 작업. 누가 일을 시작하면(엑셀을 넣거나 텍스트를 정리하면) 「오늘 · 이름 · 시각」을 공유 기록에 남기고,
// 같은 날 다른 사람이 그 화면을 열면 경고 팝업 → 「메뉴로」 또는 「무시하고 시작하기」(오류가 있어 다시 해야 할 때)
// 저장: 공유 기록(calls) 작업마다 한 줄 — id dailystatus · dailynaver, 통화 구분 「하루작업」, 수정 기록 칸 = {date(오늘 · 한국 날짜), uses:[{name, emp, at, what}]}
//   날이 바뀌면 그 줄을 새로 씀 (줄이 늘지 않음 · 서버 고칠 것 없음)
// 쓰는 법: syDaily.guard('naver', '네이버 예약 → 사유원 전산 이관') — 화면을 열 때 / syDaily.mark('naver', '엑셀 넣음') — 일을 시작할 때 (한 화면에서 처음 한 번만 올림)
window.syDaily = (function(){
  const TYPE='하루작업', idOf = t => 'daily' + t;
  const today = () => { const d=new Date(Date.now()+9*3600e3); return d.toISOString().slice(0,10); };   // 한국 날짜
  const norm = v => String(v||'').replace(/\s+/g,'').toUpperCase();
  const me = () => SY.user() || {};
  const esc = SY.esc;
  async function read(task){   // 오늘 쓴 사람들 [{name, emp, at, what}]
    const j=await SY.list(), it=(j.items||[]).find(x=>x.id===idOf(task) && !x.deleted);
    let h=null; try{ h=JSON.parse((it && it.history)||'null'); }catch(_){}
    return { item:it||null, uses: h && h.date===today() && Array.isArray(h.uses) ? h.uses : [] };
  }
  const marked = {};
  async function mark(task, what){
    if(marked[task] || !SY.user()) return; marked[task]=true;
    try{ const {item, uses}=await read(task), u=me(), now=new Date().toISOString();
      const list=[...uses, {name:u.name||'', emp:u.emp||'', at:now, what:String(what||'').slice(0,40)}].slice(-30);
      await SY.call({action:'put', item:{...(item||{}), id:idOf(task), callType:TYPE, saved:(item && item.saved)||now, takenBy:u.name||'', owner:u.name||'',
        summary:`하루 한 번 작업 · ${task} · ${today()} · ${list.length}번`, history:JSON.stringify({date:today(), uses:list})}});
    }catch(e){ marked[task]=false; console.warn('하루 작업 기록을 남기지 못함', e); }
  }
  const hm = iso => { const d=new Date(iso); return `${d.getHours()<12?'오전':'오후'} ${((d.getHours()+11)%12)+1}:${String(d.getMinutes()).padStart(2,'0')}`; };
  function popup(label, others){
    const byName={}; others.forEach(x=>{ (byName[x.name||'(이름 없음)'] ||= []).push(x); });
    const lines=Object.entries(byName).map(([n, xs])=>`<li><b>${esc(n)}</b> 님 · ${xs.map(x=>esc(hm(x.at))+(x.what?` (${esc(x.what)})`:'')).join(' · ')}</li>`).join('');
    const o=document.createElement('div'); o.className='dg-wrap';
    o.innerHTML=`<style>.dg-wrap{position:fixed;inset:0;z-index:200;background:rgba(30,30,25,.55);display:flex;align-items:center;justify-content:center;padding:16px}
      .dg-box{background:#fff;border-radius:14px;max-width:460px;width:100%;padding:22px 22px 18px;box-shadow:0 10px 40px rgba(0,0,0,.25);font-size:15px;line-height:1.6;color:#262620}
      .dg-box h2{margin:0 0 10px;font-size:19px;color:#b5442c}.dg-box ul{margin:8px 0 12px;padding-left:20px}.dg-box p{margin:0 0 8px}
      .dg-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
      .dg-btns button{height:44px;padding:0 18px;border:0;border-radius:10px;background:#3f5a46;color:#fff;font:inherit;font-weight:700;cursor:pointer}</style>
      <div class="dg-box" role="dialog" aria-modal="true"><h2>⚠ 오늘 이미 다른 분이 한 작업입니다</h2>
      <p><b>${esc(label)}</b>은(는) 하루에 한 번만 해야 합니다 (두 번 하면 중복으로 들어감).</p>
      <p>오늘 한 사람</p><ul>${lines}</ul>
      <p>먼저 그분께 확인해 주세요. 오류가 있어 다시 해야 한다면 「무시하고 시작하기」를 누르세요.</p>
      <div class="dg-btns"><button type="button" data-dg="menu">메뉴로</button><button type="button" data-dg="go">무시하고 시작하기</button></div></div>`;
    o.addEventListener('click', e=>{ const b=e.target.closest('[data-dg]'); if(!b) return; if(b.dataset.dg==='menu'){ location.href='./'; return; } o.remove(); });
    document.body.appendChild(o); setTimeout(()=>o.querySelector('[data-dg="menu"]').focus(), 0);
  }
  async function guard(task, label){
    if(!SY.user()) return;
    try{ const {uses}=await read(task), my=norm(me().emp), others=uses.filter(x=>norm(x.emp)!==my);
      if(others.length) popup(label, others);
    }catch(e){ console.warn('하루 작업 확인을 못 함', e); }
  }
  return { guard, mark, read };
})();
