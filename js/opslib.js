// ===== 운영보조 공통 (기타 개인 업무 · 분실물 · 사고현황 · 재고 · 대시보드) =====
// 공유 기록(구글 시트 calls, 단체 화면과 같은 Apps Script)에 한 줄 = 한 건으로 저장. 통화 구분(callType)으로 나눔:
//   개인업무 · 분실물 · 사고 · 재고. 내용은 '수정 기록' 칸(history)에 JSON {kind, d:{…}, log:[…]}
//   (방문일 · 업체 칸은 비워 둠 → 단체 화면의 '그날 예약 현황' 등에 섞이지 않게)
const OPS_TYPES = { task:'개인업무', lost:'분실물', accident:'사고', stock:'재고', ship:'스마트스토어' };
const opsKey = SY.getKey;   // 팀 비밀번호 대신 로그인 (2026-11-21, js/common.js)
// 서버 요청은 SY.call (js/common.js)
const opsUser = () => SY.readJSON(SY.USER_LS, {}) || {};
const opsYmd = d => { const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const opsToday = () => opsYmd(new Date());
const OPS_DOW = ['일','월','화','수','목','금','토'];
const opsDateLabel = v => { if(!v) return ''; const t=new Date(v+'T00:00'); return isNaN(t) ? v : `${t.getMonth()+1}/${t.getDate()}(${OPS_DOW[t.getDay()]})`; };
const opsId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
function opsParse(r){ try{ const j=JSON.parse(r.history||'{}'); return j && j.kind ? j : null; }catch(_){ return null; } }

// ---- 기타 개인 업무: 반복 (없음 · 매일 · 매주(요일) · 매달(일자)) ----
// d = {title, repeat:'none'|'daily'|'weekly'|'monthly', dows:[0..6], dom:1..31 (31 = 말일까지), start, due, memo, owner, done:{날짜:{at,by}}}
function opsOccurs(d, day){   // 이 업무가 그 날짜(YYYY-MM-DD)에 해야 하는 날인지
  if(d.stop && day > d.stop) return false;
  if(d.repeat==='none' || !d.repeat) return day===(d.due||d.start);
  if(d.start && day < d.start) return false;
  const t=new Date(day+'T00:00');
  if(d.repeat==='daily') return true;
  if(d.repeat==='weekly') return (d.dows||[]).includes(t.getDay());
  if(d.repeat==='monthly'){ const last=new Date(t.getFullYear(), t.getMonth()+1, 0).getDate(), want=Math.min(+d.dom||1, last); return t.getDate()===want; }
  return false;
}
// 아직 안 한 날짜들: 오늘 할 것 + 지난 것 (반복 업무는 최근 7일까지만, 한 번 하는 업무는 마감이 지났으면 계속)
function opsPending(d, today=opsToday()){
  const done=d.done||{}, out=[];
  if(d.repeat==='none' || !d.repeat){ const due=d.due||d.start||today; if(!done[due] && due<=today) out.push(due); return out; }
  for(let i=7;i>=0;i--){ const x=new Date(today+'T00:00'); x.setDate(x.getDate()-i); const day=opsYmd(x); if(opsOccurs(d, day) && !done[day]) out.push(day); }
  return out;
}
const opsRepeatLabel = d => d.repeat==='daily' ? '매일' : d.repeat==='weekly' ? `매주 ${(d.dows||[]).slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(i=>OPS_DOW[i]).join('·')||'(요일 없음)'}` : d.repeat==='monthly' ? `매달 ${+d.dom>=31?'말일':(d.dom||1)+'일'}` : d.repeat==='later' ? '마감 없음' : '반복 없음';

// ---- 굿즈 품목 (품목관리 · 견적서 품목 목록 중 굿즈): 스마트스토어 발송 보고의 상품명 ----
// 단체 화면과 같은 자료: 견적서 코드(document/js/document.js)의 CATALOG_RAW · GOODS + 품목관리에서 고친 것(공유 · edits · added)
// 단체 화면이 받아 둔 것(sayuwon_quote_cat)을 바로 쓰고, 새로 받아서 바꿈
const OPS_QUOTE_DATA = 'document/js/document.js';
function opsGoodsFrom(qc){
  if(!qc || !qc.raw) return [];
  const ns=s=>String(s||'').replace(/\s/g,''), isG=src=>(qc.goods||[]).some(x=>ns(x)===ns(src)), out=[], seen={};
  qc.raw.forEach(line=>{ const [src, price]=line.split('|'); if(seen[ns(src)]) return; seen[ns(src)]=1; const e=(qc.edits||{})[src]||{}; if(e.hidden) return;
    if((e.kind || (isG(src)?'goods':''))!=='goods') return; out.push({src, name:String(e.name||src).trim(), price: e.price!=null ? Number(e.price) : (price ? Number(price) : null)}); });
  (qc.added||[]).forEach(a=>{ if(a.hidden || a.kind!=='goods') return; out.push({src:a.src||a.name, name:String(a.name||a.src).trim(), price: a.price!=null ? Number(a.price) : null}); });
  return out.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
}
let opsGoodsCache = opsGoodsFrom(SY.readJSON('sayuwon_quote_cat', null));
async function opsLoadGoods(){
  try{
    const [html, shared] = await Promise.all([fetch(OPS_QUOTE_DATA+'?t='+Date.now()).then(r=>r.text()), SY.quote.get().catch(()=>null)]);
    const m=html.match(/var CATALOG_RAW = \[([\s\S]*?)\];/); if(!m) return opsGoodsCache;
    const raw=[...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
    const gm=html.match(/\[([^\]]*)\]\.forEach\(function\(n\)\{\s*GOODS\[n\]/), goods=gm ? [...gm[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]) : [];
    const old=SY.readJSON('sayuwon_quote_cat', null)||{}, d=(shared && shared.data) || {edits:old.edits, added:old.added};
    opsGoodsCache = opsGoodsFrom({raw, goods, edits:d.edits||{}, added:d.added||[]});
  }catch(_){}
  return opsGoodsCache;
}

// ---- 기업 프로모션 할인 기간 · 만료 알림 (2026-11-24 · promo.html · 첫 화면 공통 업무 · 캘린더) ----
// 기간 글자에서 날짜를 읽음: 「26.09.01(화)~26.12.31(목)」 · 「2026.09.15(화)~12.27(일)」(끝에 해가 없으면 앞 날짜의 해) · 「26.05.11(월)」(시작만) → {from, to}
function opsPeriod(text){
  const out=[]; let y=null;
  String(text||'').replace(/(?:(\d{2,4})\s*[.\-\/년]\s*)?(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/g, (m, yy, mm, dd)=>{ if(yy) y = yy.length===2 ? 2000+(+yy) : +yy; if(!y) return m;
    const d=`${y}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`; if(!isNaN(new Date(d+'T00:00'))) out.push(d); return m; });
  return { from: out[0]||'', to: out.length>1 ? out[out.length-1] : '' };
}
const opsAddMonths = (ymd, n) => { const d=new Date(ymd+'T00:00'), day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n); const last=new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); d.setDate(Math.min(day, last)); return opsYmd(d); };
// 만료 2달 전 · 1달 전 알림: [{id, name, kind:'m2'|'m1', label, due, end}] — 「확인」한 것(acks[id][kind]) · 만료 7일이 지난 것은 뺌
function opsPromoAlerts(data, today, months){   // months: 몇 달 전에 알릴지 (기본 [2, 1] · 첫 화면 공통 업무 관리에서 바꿈 2026-11-24)
  const out=[], acks=(data && data.acks)||{}, M=(months && months.length ? months : [2,1]);
  ((data && data.rows)||[]).forEach(r=>{ const p=opsPeriod(r.period); if(!p.to || opsYmd(new Date(new Date(p.to+'T00:00').getTime()+7*864e5)) < today) return;   // 기간 끝이 없거나 만료 7일이 지났으면 알림 없음
    M.map(n=>['m'+n, n, `만료 ${n}달 전`]).forEach(([k,n,l])=>{ if((acks[r.id]||{})[k]) return; out.push({id:r.id, name:String(r.name||'').split('\n')[0], kind:k, label:l, due:opsAddMonths(p.to, -n), end:p.to}); }); });
  return out;
}

// ---- 협업 여행사 집계기록 주기 (2026-11-24 · agency.html · 첫 화면 공통 업무) ----
// cycle = 3(분기) · 6(반기 · 기본) 개월. 달력 기준으로 나눔 (반기 = 1~6월 · 7~12월, 분기 = 1~3 · 4~6 · 7~9 · 10~12월)
function opsAggPeriod(ymd, cycle){ const c=+cycle===3?3:6, d=new Date(ymd+'T00:00'), y=d.getFullYear(), s=Math.floor(d.getMonth()/c)*c;
  const from=opsYmd(new Date(y, s, 1)), to=opsYmd(new Date(y, s+c, 0)), n=s/c+1;
  return {from, to, label: c===6 ? `${y} ${n===1?'상반기':'하반기'}` : `${y} ${n}분기`}; }
// 집계를 넣어야 할 때: 바로 앞 기간(끝난 기간)의 기록이 아직 없으면 {label, from, to, due(다음 기간 첫날)}
function opsAggDue(data, today){ const c=(data && data.cycle)||6, cur=opsAggPeriod(today, c), prevDay=opsYmd(new Date(new Date(cur.from+'T00:00').getTime()-864e5)), p=opsAggPeriod(prevDay, c);
  const done=((data && data.records)||[]).some(r=>r.label===p.label); return done ? null : {...p, due:cur.from}; }
