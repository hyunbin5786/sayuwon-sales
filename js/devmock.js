// ===== 로컬 미리보기 전용 가짜 서버 (2026-11-23) =====
// 진짜 공유 기록(구글 시트)에 쓰지 않고 화면을 시험하려고 만든 것. 운영 주소(github.io 등)에서는 읽히지 않음 —
// js/common.js 맨 아래가 localhost 이고 ?mock=1 을 한 번 붙였을 때만 이 파일을 읽음 (끄기: ?mock=0)
//  - apps-script/group-intake.gs 의 동작(action)을 같은 모양으로 흉내 냄: login · members · memberAdd · memberDel · list(since) · put · del · deleted · lock
//    · upload · mentList · mentImgPut · mentImgGet · bookList · bookAdd · quoteReqAdd · quoteReqList · quoteReqMark · syncAdmin
//  - 견적서 서버(품목 목록 · 발급 내역)도 흉내 냄: GET → {data}, GET ?history=1 → {history}, POST {ops | history | cancel}
//  - 내용은 이 브라우저 localStorage 'sy_mock_db' 에만 (지우기: SY_MOCK.reset()). 처음엔 시험용 멤버 한 명(테스트 / T001)과 가상 예약 몇 건
//  - 서버를 바꿀 때(DB 이관)도 새 서버가 이 동작 목록을 똑같이 내면 화면은 그대로 돎 → 새 서버의 시험 기준으로도 씀
(function(){
  const LS='sy_mock_db', now=()=>new Date().toISOString();
  const kst = () => { const d=new Date(Date.now()+9*36e5); return d.toISOString().slice(0,16).replace('T',' '); };
  const day = n => { const d=new Date(); d.setDate(d.getDate()+n); return SY.ymd(d); };
  const seed = () => ({
    members:[{name:'테스트', emp:'T001', added:kst(), by:'가짜 서버'}, {name:'김영업', emp:'T002', added:kst(), by:'가짜 서버'}],
    calls:[
      {id:'mock0001', saved:now(), callStart:now(), takenBy:'테스트', callType:'예약확정', summary:'가상 단체 · 관람 + 사담', date:day(1), org:'가상여행사', owner:'테스트', pay:'현장 결제', vehicle:'버스 1', people:'20', sadam1:'20', contact:'홍길동', phone:'010-0000-0001', email:'test@example.com', tin:'10:00', tout:'15:00', memo:'', note:'가짜 서버 시험용 예약', history:JSON.stringify({h:[], tasks:[], erp:[], memos:[]})},
      {id:'mock0002', saved:now(), callStart:now(), takenBy:'김영업', callType:'가예약', summary:'가상 단체 2', date:day(9), org:'가상고등학교', owner:'김영업', people:'35', mabangL:'35', contact:'이선생', phone:'010-0000-0002', tin:'11:00', tout:'16:00', memo:'', note:'', history:JSON.stringify({h:[], tasks:[], erp:[], memos:[]})},
      {id:'mock0003', saved:now(), callStart:now(), takenBy:'테스트', callType:'개인고객', summary:'가상 개인 문의', contact:'박고객', phone:'010-0000-0003', owner:'테스트', memo:'', note:'주차 문의', history:JSON.stringify({h:[], tasks:[], cat:'문의', reportTo:'', reserved:''})},
    ],
    quotereq:[], files:{}, locks:{}, admin:null,
    quote:{ data:{edits:{}, added:[]}, history:[] },
  });
  let db; try{ db=JSON.parse(localStorage.getItem(LS)||'null'); }catch(_){ db=null; }
  if(!db || !Array.isArray(db.calls)) db=seed();
  const save = () => { try{ localStorage.setItem(LS, JSON.stringify(db)); }catch(_){} };
  save();
  const norm = v => String(v||'').replace(/\s+/g,''), live = () => db.members.filter(m=>!m.deleted);
  const authOk = req => { const w=req.who||{}; if(!live().length) return true; return live().some(m=>norm(m.name)===norm(w.name) && norm(m.emp).toUpperCase()===norm(w.emp).toUpperCase()); };
  const put = item => { const id=String(item.id||''); if(!/^[a-z0-9]{4,40}$/.test(id)) throw new Error('bad_id');
    const it={...item, updated:now(), deleted:''}; Object.keys(it).forEach(k=>{ if(k[0]==='_') delete it[k]; else if(it[k]==null) it[k]=''; else it[k]=String(it[k]); });
    it.inout = (it.tin||it.tout) ? (it.tin||'')+'~'+(it.tout||'') : '';
    const i=db.calls.findIndex(x=>x.id===id); if(i>=0) db.calls[i]=it; else db.calls.push(it); return id; };
  const BOOK_IDS={mabangdb:'몽몽마방예약', bookdb:'예약현황추가'}, GROUP={'단체예약':1,'예약상담':1,'가예약':1,'예약확정':1,'예약접수':1,'상담':1,'공식예약':1};
  const BOOK_KEYS=['id','callType','date','org','owner','people','sadam1','sadam2','sadamD','mabangL','mabangD','chabang','donghaeng','dangdu','yoga','gaga','teaMed','gayageum','cabin','tin','tout','meal','mabangMenu','memo','saved','updated'];
  const log=[];   // 시험에서 무엇을 보냈는지 보려고 (SY_MOCK.log)
  function main(req){
    log.push(req); if(log.length>300) log.shift();
    const a=req.action, live2=db.calls.filter(x=>!x.deleted);
    if(a==='quoteGet') return req.history ? {ok:true, history:db.quote.history.slice().reverse()} : {ok:true, data:db.quote.data, historyApi:3};
    if(a==='quotePost') return quotePostSync(req);
    if(a==='login'){ const l=live(); if(!l.length) return {ok:true, member:true, empty:true}; return {ok:true, member:l.some(m=>norm(m.name)===norm(req.name) && norm(m.emp).toUpperCase()===norm(req.emp).toUpperCase())}; }
    if(a==='mentList'){ const r=live2.find(x=>x.id==='mentdb'); return {ok:true, ment:r ? {history:r.history, saved:r.saved} : null}; }
    if(a==='mentImgGet'){ const f=db.files[req.id]; if(!f || !f.ment) return {ok:false, error:'mentimg: not_allowed'}; return {ok:true, file:{id:req.id, mime:f.mime, data:f.data}}; }
    if(a==='bookList'){ const from=day(-120); return {ok:true, api:6, items:live2.map(o=>BOOK_IDS[o.id] ? {id:o.id, callType:o.callType, saved:o.saved, updated:o.updated, history:o.history}
      : (!GROUP[o.callType||'단체예약'] || !o.date || o.date<from) ? null : Object.fromEntries(BOOK_KEYS.map(k=>[k, o[k]||'']))).filter(Boolean)}; }
    if(a==='bookAdd'){ const dbid=String(req.db||''), by=String(req.by||'').trim(); if(!BOOK_IDS[dbid]) return {ok:false, error:'bookadd: bad_db'}; if(!by) return {ok:false, error:'bookadd: no_name'};
      const row={...(req.row||{}), by, guest:'1'}; if(!/^\d{4}-\d{2}-\d{2}$/.test(row.d||'')) return {ok:false, error:'bookadd: bad_date'}; if(dbid==='bookdb') row.id='b'+Date.now().toString(36);
      const cur=live2.find(x=>x.id===dbid) || {id:dbid, callType:BOOK_IDS[dbid], saved:now()}; let j={}; try{ j=JSON.parse(cur.history||'{}')||{}; }catch(_){}
      j.rows=[...(Array.isArray(j.rows)?j.rows:[]), row]; j.at=now(); j.by=by; cur.history=JSON.stringify(j); cur.takenBy=by; put(cur); save(); return {ok:true, api:6, item:{id:dbid, history:cur.history}}; }
    if(a==='quoteReqAdd'){ const it=req.item||{}; if(it.hp) return {ok:true, id:'', api:7}; if(!it.org || !it.name) return {ok:false, error:'need_name'};
      if(String(it.phone||'').replace(/\D/g,'').length<9) return {ok:false, error:'bad_phone'}; if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(it.email||'')) return {ok:false, error:'bad_email'};
      if(!/^\d{4}-\d{2}-\d{2}$/.test(it.date||'')) return {ok:false, error:'bad_date'}; if(!it.agree) return {ok:false, error:'need_agree'};
      const o={id:'q'+Date.now().toString(36), at:kst(), org:it.org, name:it.name, phone:it.phone, email:it.email, date:it.date, pax:String(it.pax||''), memo:it.memo||'', status:'접수', by:'', doneAt:'', deleted:''};
      db.quotereq.push(o); save(); return {ok:true, id:o.id, api:7}; }
    if(!authOk(req)) return {ok:false, error:'bad_key'};
    if(a==='quoteReqList') return {ok:true, api:7, items:db.quotereq.filter(o=>!o.deleted).slice().reverse()};
    if(a==='quoteReqMark'){ const o=db.quotereq.find(x=>x.id===req.id); if(!o) return {ok:false, error:'not_found'}; const by=(req.who&&req.who.name)||'';
      if(req.status==='삭제') o.deleted=kst()+' '+by; else if(/^(접수|출력|완료)$/.test(req.status)){ o.status=req.status; o.by=by; o.doneAt=kst(); } else return {ok:false, error:'bad_status'}; save(); return {ok:true, api:7, item:o}; }
    if(a==='members') return {ok:true, members:live().map(({name,emp,added,by})=>({name,emp,added,by}))};
    if(a==='memberAdd'){ let added=0; (req.list||[]).forEach(m=>{ const name=String(m&&m.name||'').trim(), emp=String(m&&m.emp||'').trim(); if(!name || !/^[0-9A-Za-z-]{2,20}$/.test(emp) || live().some(x=>norm(x.emp).toUpperCase()===emp.toUpperCase())) return; db.members.push({name, emp, added:kst(), by:String(req.by||'')}); added++; }); save(); return {ok:true, added, members:main({action:'members', who:req.who}).members}; }
    if(a==='memberDel'){ let removed=0; live().forEach(m=>{ if(norm(m.emp).toUpperCase()===norm(req.emp).toUpperCase()){ m.deleted=kst(); removed++; } }); save(); return {ok:true, removed, members:live().map(({name,emp,added,by})=>({name,emp,added,by}))}; }
    if(a==='list'){ const t=now(); if(req.since) return {ok:true, delta:true, now:t, admin:db.admin, api:5, items:db.calls.filter(x=>(x.updated && x.updated>req.since) || (x.deleted && x.deleted>req.since))};
      return {ok:true, now:t, admin:db.admin, api:5, items:live2.slice(-(+req.limit||2000))}; }
    if(a==='deleted') return {ok:true, api:4, items:db.calls.filter(x=>x.deleted).slice(-(+req.limit||1000))};
    if(a==='lock'){ const id=String(req.id||''), sid=String(req.sid||''); if(!/^[a-z0-9]{4,40}$/.test(id) || !sid) return {ok:false, error:'bad_id'}; const v=db.locks[id], t=Date.now();
      if(req.release){ if(v && v.sid===sid) delete db.locks[id]; save(); return {ok:true, released:true}; }
      if(v && v.sid!==sid && t-v.at<150000) return {ok:true, locked:true, by:v.by, at:v.at};
      db.locks[id]={sid, by:String(req.by||''), at:t}; save(); return {ok:true, locked:false}; }
    if(a==='upload' || a==='mentImgPut'){ const id='file'+Date.now().toString(36); db.files[id]={mime:req.mime, data:String(req.data||'').slice(0, 400000), name:req.name, ment:a==='mentImgPut'}; save();
      return {ok:true, file:{id, name:String(req.name||'파일'), url:'about:blank#'+id, at:now()}}; }
    if(a==='syncAdmin') return {ok:true, result:{sadamDays:0, big:0, added:0}, admin:db.admin};
    try{
      if(a==='put'){ const id=put(req.item||{}); save(); return {ok:true, id}; }
      if(a==='del'){ const x=db.calls.find(y=>y.id===String(req.id||'')); if(x) x.deleted=now(); save(); return {ok:true, id:String(req.id||'')}; }
    }catch(e){ return {ok:false, error:String(e)}; }
    return {ok:false, error:'bad_action'};
  }
  const wait = v => new Promise(ok=>setTimeout(()=>ok(JSON.parse(JSON.stringify(v))), 30));   // 진짜 서버처럼 조금 뒤에 · 사본을 돌려줌
  SY_BACKEND.main = body => wait(main(body));
  SY_BACKEND.beacon = body => { main(body); };
  // 견적서 서버 동작(quoteGet · quotePost)은 common.js 가 main 으로 보냄 → 위 main() 이 받음
  function quotePostSync(body){ const q=db.quote;
    (body.ops||[]).forEach(o=>{ const d=q.data; d.edits=d.edits||{}; d.added=d.added||[];
      if(o.op==='add') d.added.push(o.item);
      else if(o.op==='set'){ (d.edits[o.src] ||= {})[o.field]=o.value; }
      else if(o.op==='setAdded'){ const x=d.added.find(y=>String(y.uid)===String(o.uid)); if(x) x[o.field]=o.value; }
      else if(o.op==='delAdded') d.added=d.added.filter(y=>String(y.uid)!==String(o.uid));
      else if(o.op==='reset') q.data={edits:{}, added:[]};
      else if(o.op==='replace') q.data=o.data||{edits:{}, added:[]}; });
    (body.history||[]).forEach(h=>{ if(!q.history.some(x=>x.id===h.id)) q.history.push(h); });
    (body.cancel||[]).forEach(c=>{ const h=q.history.find(x=>x.id===c.id); if(h){ h.canceled=c.canceled; h.cancelNote=c.cancelNote; } });
    save(); return (body.history||[]).length || (body.cancel||[]).length ? {ok:true, saved:(body.history||[]).length, canceled:(body.cancel||[]).length, data:q.data} : {ok:true, data:q.data}; }
  window.SY_MOCK = { get db(){ return db; }, log, reset(){ db=seed(); save(); try{ indexedDB.deleteDatabase('sayuwon'); }catch(_){} }, save };
  console.info('[가짜 서버] js/devmock.js 사용 중 — 진짜 공유 기록에는 쓰지 않습니다 (끄기: ?mock=0)');
  document.addEventListener('DOMContentLoaded', ()=>{ const b=document.createElement('div'); b.textContent='가짜 서버 (시험용)'; b.style.cssText='position:fixed;right:8px;bottom:8px;z-index:9999;background:#b3261e;color:#fff;font:12px sans-serif;padding:3px 8px;border-radius:4px;opacity:.85;pointer-events:none'; document.body.appendChild(b); });
})();
