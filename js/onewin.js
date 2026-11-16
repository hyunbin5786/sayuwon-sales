// ===== 한 번에 한 창만 (모든 화면 공통) =====
// 기록이 여러 창에서 고쳐지지 않도록: 이 시스템 화면을 새 창(탭)에서 열면, 먼저 열려 있던 창은 로그아웃 화면으로 바뀜
//  - 같은 브라우저의 창 · 탭끼리 (localStorage 'sy_active_win' = 지금 쓰는 창). 다른 컴퓨터끼리는 해당 없음
//  - 제외: 팝업 안 화면(마이페이지 · 품목관리 iframe), 단체 화면의 견적서 · 거래명세서 버튼으로 연 견적서 새 탭(?from=intake)
//  - 로그아웃된 창: 첫 화면(?off=1)으로 바뀌고 「이 창에서 다시 쓰기」를 누르면 이 창이 다시 쓰는 창이 됨 (그때는 다른 창이 로그아웃)
(function(){
  if(window.top!==window) return;
  if(/[?&]from=intake\b/.test(location.search)) return;
  const KEY='sy_active_win', me=Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const root=/\/document\//.test(location.pathname) ? '../' : './';
  const off=/[?&]off=1\b/.test(location.search);
  const claim=()=>{ try{ localStorage.setItem(KEY, JSON.stringify({id:me, at:Date.now(), path:location.pathname})); }catch(_){} };
  if(off){   // 로그아웃된 창: 이 창은 쓰는 창이 아님 → 안내 + 다시 쓰기
    const show=()=>{ const d=document.createElement('div'); d.className='onewin-off';
      d.innerHTML='<div class="box"><b>이 창은 로그아웃되었습니다</b><p>다른 창(탭)에서 사유원 예약 보조 시스템을 열었습니다. 기록이 여러 곳에서 고쳐지지 않도록 한 번에 한 창만 쓸 수 있습니다.</p><p class="s">이 창을 닫거나, 이 창에서 계속하려면 아래를 누르세요 (그러면 다른 창이 로그아웃됩니다).</p><button type="button">이 창에서 다시 쓰기</button></div>';
      d.querySelector('button').onclick=()=>{ claim(); location.replace(root); };
      const st=document.createElement('style'); st.textContent='.onewin-off{position:fixed;inset:0;z-index:9999;background:rgba(30,30,25,.6);display:flex;align-items:center;justify-content:center;padding:16px}.onewin-off .box{background:#fffefb;border-radius:12px;padding:22px 24px;max-width:420px;font:14px/1.6 "Noto Sans KR",sans-serif;color:#262620;box-shadow:0 20px 60px rgba(0,0,0,.3)}.onewin-off b{font-size:17px;color:#3f5236}.onewin-off p{margin:8px 0}.onewin-off .s{color:#77736a;font-size:12.5px}.onewin-off button{margin-top:8px;border:0;background:#3f5236;color:#fff;border-radius:7px;padding:9px 16px;font:700 14px "Noto Sans KR",sans-serif;cursor:pointer}';
      document.head.appendChild(st); document.body.appendChild(d); };
    if(document.body) show(); else document.addEventListener('DOMContentLoaded', show);
    return;
  }
  claim();
  window.addEventListener('storage', e=>{
    if(e.key!==KEY || !e.newValue) return; let v=null; try{ v=JSON.parse(e.newValue); }catch(_){}
    if(!v || v.id===me) return;
    window.__winOff=true; window.__autoReady=false;   // 자동 저장 · 알림 멈춤 (단체 화면)
    location.replace(root+'?off=1');   // 이 창은 로그아웃 화면으로
  });
})();
