// ===================== 전산 내역 붙여넣기 =====================
// 사유원 전산의 상품 정보를 통째로 붙여넣으면 상품마다 방문일 · 상품 · 인원 · 상품금액 · 할인 · 금액으로 읽어 표로 보여 줌 (예약에 함께 저장)
const wonNum = s => parseInt(String(s||'').replace(/[^\d]/g,''))||0;
const isErpText = s => /방문일자\s*\(순번\)/.test(s||'');
function parseErp(text){
  const out=[], pay={}; let cur=null, sect='item', pend='';   // sect: 'pay' 이면 결제 정보 (상품마다의 칸을 덮지 않음)
  String(text||'').split(/\r?\n/).forEach(line=>{
    const t=line.trim(); if(!t) return;
    if(/^(결제\s*정보|결제\s*\/\s*취소\s*이력|과세금액표시)$/.test(t)){ if(cur){ out.push(cur); cur=null; } sect='pay'; return; }
    const m=t.match(/^([^\t:：]+?)\s*(?:\t+|[:：]\s*|\s{2,})(.*)$/) || (line.match(/\t\s*$/) ? [t, t, ''] : null);
    const key=m ? m[1].replace(/\s/g,'') : '', val=m ? m[2].trim() : '';
    if(sect==='pay'){   // 결제 정보: "면세금액(입장료)<탭>" 다음 줄에 금액이 오기도 함
      const take=(k,v)=>{ if(/^결제금액$/.test(k)) pay.total=wonNum(v); else if(/^과세금액$/.test(k)) pay.taxable=wonNum(v); else if(/^면세금액/.test(k)) pay.free=wonNum(v); else if(/^결제수단$/.test(k)) pay.method=v; else if(/^결제상태$/.test(k)) pay.state=v; };
      if(key==='방문일자(순번)') sect='item';
      else { if(m && val){ take(key,val); pend=''; } else if(m) pend=key; else if(pend && /^[\d,]+$/.test(t)){ take(pend,t); pend=''; } else pend=t.replace(/\s/g,''); return; }
    }
    if(key==='방문일자(순번)'){ if(cur) out.push(cur); const d=val.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/), sq=val.match(/\((\d+)\)/); cur={date:d?`${d[1]}-${d[2].padStart(2,'0')}-${d[3].padStart(2,'0')}`:'', seq:sq?sq[1]:'', product:'', people:0, base:0, disc:0, amount:0, notes:[]}; return; }
    if(!cur) return;
    if(/^\*/.test(t)){ cur.notes.push(t.replace(/^\*\s*/,'').replace(/\(\)\s*$/,'')); return; }
    if(key==='상품정보') cur.product=val;
    else if(key==='방문자정보') cur.visitor=val;
    else if(key==='예약인원'){ cur.people=wonNum((val.match(/\d+/)||[''])[0]); const st=val.match(/학생\s*:?\s*(\d+)\s*명/); if(st) cur.students=+st[1]; }   // 「46명(어른 : 4명,학생 : 42명)」 → 학생 인원도 (관람을 어른 · 학생 품목으로 나눔)
    else if(key==='상품금액') cur.base=wonNum(val);
    else if(key==='할인금액'){ cur.disc=wonNum(val.replace(/\(.*$/,'')); const p=val.match(/\(([\d,]+)\)/); if(p) cur.discShilla=wonNum(p[1]); }   // 156,000(96,000): 괄호 = 할인 중 신라 몫
    else if(key==='금액') cur.amount=wonNum(val);
    else if(/^등록/.test(t)) cur.reg=t.replace(/^등록\s*[:：]?\s*/,'');
  });
  if(cur) out.push(cur);
  const list=out.filter(x=>x.product).map(x=>({...x, amount: x.amount || Math.max(0, x.base-x.disc)}));
  if(list.length && (pay.total || pay.free!=null || pay.taxable!=null)) list[0].payInfo=pay;   // 결제 정보(결제 금액 · 과세 · 면세)는 첫 줄에 붙여 함께 저장
  return list;
}
// 사유원 / 신라 나누기: 관람 = 사유원, 관람+식사 패키지 = 관람료만큼 사유원 나머지 신라, 그 밖 = 신라
// 전산 상품금액(할인 전) 중 비과세(사유원) 몫: 어른 = 품목 비과세, 학생 = 학생 행의 비과세 (2026-11-20 · 예전엔 학생도 어른 비과세로 계산해 차이가 남)
function erpFullTf(x){
  const t=taxOf(x.product); if(!t || !x.people) return null;
  const ns=Math.min(x.students||0, x.people), it=ns ? stuItemOf(x.product) : null, us = it ? stuSplitOf(x.product, it.sprice, {date:x.date||rec.date, tin:''}) : null;
  return t.tf*(x.people-ns) + (us ? us.tf : t.tf)*ns;
}
function erpSplit(x){
  const t=taxOf(x.product);   // 품목 관리의 과세 · 비과세가 있으면 그것으로 (할인 괄호 = 신라 몫이면 그대로 반영)
  if(t){ const fTf=erpFullTf(x);
    let saw = x.discShilla!=null && x.people ? fTf - Math.max(0, x.disc-x.discShilla) : x.students && x.base && fTf!=null ? Math.round(x.amount*fTf/x.base) : Math.round(x.amount*t.tf/(t.tx+t.tf));
    saw=Math.max(0, Math.min(x.amount, saw)); return {saw, shilla:x.amount-saw}; }
  const isView = /관람/.test(x.product) && !/\(관람,/.test(x.product) && !/관람권|관람식사권/.test(x.product);
  if(isView) return {saw:x.amount, shilla:0};
  if(/\(관람,/.test(x.product) && x.people){
    const vsrc=viewSrcOf({date:x.date, tin:''}), vp=priceOf(vsrc) || priceOf(`${x.date && isRedDay(x.date)?'주말/공휴일':'평일'}(관람)`) || 0;
    const vit=catalogItems().find(y=>normSrc(y.src)===normSrc(vsrc)), vsp = vit && vit.sprice!=null && !vit.nostu ? vit.sprice : vp;   // 학생은 그날 관람권의 학생 가격
    const ns=Math.min(x.students||0, x.people), vFull=vp*(x.people-ns)+vsp*ns;
    const sawDisc = x.discShilla!=null ? Math.max(0, x.disc-x.discShilla) : Math.round(vFull*(x.base ? x.disc/x.base : 0));   // 할인 중 사유원 몫
    const saw=Math.max(0, Math.min(x.amount, vFull - sawDisc)); return {saw, shilla:x.amount-saw}; }
  return {saw:0, shilla:x.amount};
}
// 전산 내역 합계 · 사유원 / 신라 (결제 정보가 있으면 면세 = 사유원, 과세 = 신라)
const erpUnit = x => goodsItems().some(g=>normSrc(g.src)===normSrc(x.product)) ? '개' : '명';   // 굿즈는 개
function erpTotals(list=erpList, raw){   // raw: 붙여넣은 전산 금액 그대로 (예약 내역 줄에서 고친 할인은 반영 안 함 · 예약 내용 / 전산 비교의 「전산」 열, 2026-11-20)
  let tot=0, saw=0, shilla=0; list.forEach(x=>{ const s=erpSplit(x); tot+=x.amount; saw+=s.saw; shilla+=s.shilla; });
  const pi=(list[0]||{}).payInfo;
  // 예약 내역 줄에서 할인액을 직접 고친 상품이 있으면: 그 줄은 고친 금액으로 다시 더함 (전산 결제 정보보다 우선)
  const ov=idamtMap(rec), E = !raw && list===erpList && Object.keys(ov).length ? erpByKey() : null, keys = E ? Object.keys(E.m).filter(k=>ov[dkey(k)]) : [];
  if(keys.length){ tot=0; saw=0; shilla=0;
    list.forEach(x=>{ const k=erpKeyOf(x.product); if(k && keys.includes(k)) return; const s=erpSplit(x); tot+=x.amount; saw+=s.saw; shilla+=s.shilla; });
    keys.forEach(k=>{ const m=erpRowMoney(k, E.m[k]); tot+=m.amount; saw+=m.tf; shilla+=m.tx; });
    return {tot, saw, shilla, pi:null}; }
  if(pi && pi.free!=null && pi.taxable!=null){ saw=pi.free; shilla=pi.taxable; }
  return {tot, saw, shilla, pi};
}
// 예약 내역에는 있는데 전산 내역에 없는 품목(예: 몽몽마방 식사를 전산에 안 넣음): 품목 관리 가격으로 계산 (관람 = 사유원, 그 밖 = 신라 · 할인 버튼 · 할인액 반영)
// atMabang: 몽몽마방 결제가 '마방'(손님이 식당에서 결제)이라 현장결제 금액에는 넣지 않음
function erpMissing(){
  if(!erpList.length || !quoteCat || !rec.date) return [];
  const E=erpByKey();
  const has = k => E.m[k] || (k==='seminar2' && E.m.seminar) || (/^v:/.test(k) && /\(학생\)/.test(k) && E.m[k.replace(/\(학생\)/,'')]);   // 관람(학생)은 전산에서 관람 한 줄(어른 · 학생 함께)에 들어 있음 → 빠진 것 아님 (2026-11-17)
  return quoteBlocks(rec).blocks.filter(b=>b.key && !has(b.key)).map(b=>({b, key:b.key, m:blockMoney(b, rec), atMabang: b.key==='mb' && rec.mabangPay==='마방'})).filter(x=>x.m);
}
function renderErp(){
  const box=$('#erpBox'); if(!box) return;
  if(!erpList.length){ box.hidden=true; box.innerHTML=''; return; }
  const t0=erpTotals(erpList, true), pi=t0.pi, miss=erpMissing(); let {tot, saw, shilla}=t0;
  miss.forEach(x=>{ if(x.atMabang) return; tot+=x.m.amount; saw+=x.m.tf; shilla+=x.m.tx; });   // 전산에 없는 품목도 합계에 (품목 관리 가격)
  box.hidden=false;
  const missRows = miss.map(x=>`<tr class="erp-miss"><td colspan="4">${esc(itemName(x.key))} ${x.b.qty}${itemUnit(x.key)} <small class="hint" style="margin:0">전산에 없음 · 품목 관리 가격${x.atMabang?' · 마방에서 결제 (합계 제외)':''}</small>${[x.m.tf>0 && ` · 비과세(사유원) ${won(x.m.tf)}원`, x.m.tx>0 && ` · 과세(신라) ${won(x.m.tx)}원`].filter(Boolean).join('')}</td><td class="tot">${x.atMabang?`<s>${won(x.m.amount)}</s>`:won(x.m.amount)}</td></tr>`).join('');
  // 예약 내용 합계 | 전산 합계 2열로 비교 (2026-11-19 · 예전엔 전산 합계만 + 아래 글씨로 대조) · 「지우기」 대신 「전산 내역 다시 붙여넣기」
  const c=erpCheck(), r=resTotals(), ok=(a,b)=>Math.abs((a||0)-(b||0))<1;
  const mark = (a,b) => r ? `<td class="ck ${ok(a,b)?'ok':'bad'}">${ok(a,b)?'✓ 같음':`✗ ${won(Math.abs((a||0)-(b||0)))} 차이`}</td>` : '<td></td>';
  const cell = v => `<td class="tot">${v==null?'-':won(v)}</td>`;
  box.innerHTML = `<div class="psec-t">전산 내역 합계 (${erpList.length}건${miss.length?` + 전산에 없는 ${miss.length}건`:''} · 상품별은 위 예약 내역 줄에) <button type="button" class="btn" id="erpRepaste" style="padding:1px 8px;font-size:11.5px;margin-left:6px" title="사유원 전산의 상품 정보를 다시 복사해 붙여넣기">전산 내역 다시 붙여넣기</button></div>`
    + (missRows ? `<table class="ptable sel"><tbody>${missRows}</tbody></table>` : '')
    + `<table class="ptable erp-cmp"><thead><tr><th></th><th>예약 내용</th><th>전산</th><th></th></tr></thead><tbody>`
    + `<tr class="sum"><td>총 금액</td>${cell(r&&r.tot)}${cell(t0.tot)}${mark(r&&r.tot, t0.tot)}</tr>`
    + `<tr class="split-row"><td>└ 사유원 (비과세)</td>${cell(r&&r.saw)}${cell(t0.saw)}${mark(r&&r.saw, t0.saw)}</tr>`
    + `<tr class="split-row"><td>└ 신라 (과세)</td>${cell(r&&r.shilla)}${cell(t0.shilla)}${mark(r&&r.shilla, t0.shilla)}</tr>`
    + `<tr><td>할인 합계</td>${cell(r&&r.disc)}${cell(c.pasted?c.eDisc:null)}${mark(r&&r.disc, c.eDisc)}</tr>`
    + (pi&&pi.total ? `<tr class="split-row"><td>전산 결제 ${esc([pi.state, pi.method].filter(Boolean).join(' · '))}</td><td></td>${cell(pi.total)}<td></td></tr>` : '')
    + (miss.some(x=>!x.atMabang) ? `<tr class="split-row"><td>전산 + 전산에 없는 품목</td><td></td>${cell(tot)}<td></td></tr>` : '')
    + `</tbody></table>`
    + (!r ? `<p class="hint" style="margin:4px 0 0">예약 내용 합계는 방문일 · 품목 가격이 있어야 계산됩니다${c.why?` (${esc(c.why)})`:''}</p>` : (c.missing||[]).length ? `<p class="hint" style="margin:4px 0 0">예약 내용 합계에서 빠진 품목: ${esc(c.missing.join(', '))}</p>` : '');
}
// 예약 내용으로 계산한 합계 · 사유원(비과세) · 신라(과세) · 할인 (erpCheck 와 같은 계산 · 기타 할인 반영)
function resTotals(){
  if(!quoteCat || !rec.date) return null;
  const plain={...rec, idamt:''}, {blocks}=quoteBlocks(rec); let tot=0, saw=0, shilla=0, disc=0;
  blocks.forEach(b=>{ const m=blockMoney(b, plain); if(!m) return; tot+=m.amount; saw+=m.tf; shilla+=m.tx; disc+=m.full-m.amount; });
  const es=etcSplit(rec); tot-=es.tx+es.tf; saw-=es.tf; shilla-=es.tx; disc+=es.tx+es.tf;
  return {tot, saw, shilla, disc};
}
document.addEventListener('click', e=>{ if(e.target.id==='erpRepaste') $('#erpPasteBtn').click(); });
// 전산 내역 → 예약 내용 칸: 관람 · 관람+사담 · 몽몽마방 메뉴 · 프로그램 · 굿즈 · 방문일 · 인원 · 기타 할인 · 특별 할인
function erpFields(list){
  const o={}, goods=[], views=[], unknown=[], sp={}; let view=0, etc=0, etcTo='';
  const add=(k,n)=>{ o[k]=String((numOf(o[k])||0)+(n||0)); };
  const progBy={}; Object.entries(PROG_SRC).forEach(([k,s])=>{ if(!progBy[normSrc(s)]) progBy[normSrc(s)]=k; }); progBy[normSrc('당두봉갈 대관')]='dangdu';
  const mbs=mbMenus(), gds=goodsItems();
  list.forEach(x=>{
    const p=x.product, ns=normSrc(p), n=x.people||0;
    x.notes.forEach(t=>{
      const m=t.match(/^기타\s*할인\s*-?\s*([\d,]+)/); if(m){ etc+=wonNum(m[1]); if(!etcTo){ const s=erpSplit(x); etcTo = s.saw && !s.shilla ? '사유원' : '신라'; } return; }
      const s=SPECIAL.find(s=>t.includes(s.short)), c=t.match(/(\d+)\s*명/); if(s && c) sp[s.k]=Math.max(sp[s.k]||0, +c[1]);   // 특별 할인 인원 (같은 분이 여러 상품 줄에 나오므로 합치지 않고 가장 큰 수)
    });
    if(/\(관람,\s*사담\s*런치\s*1부\)/.test(p)) add('sadam1',n);
    else if(/\(관람,\s*사담\s*런치\s*2부\)/.test(p)) add('sadam2',n);
    else if(/\(관람,\s*사담\s*디너\)/.test(p)) add('sadamD',n);
    else if(/해오름/.test(p)) add('haeorum',n);   // 평일 · 주말 품목 모두
    else if(/\(관람,/.test(p) || (/관람/.test(p) && !/관람권|관람식사권/.test(p))){   // 관람권 · 관람+식사 패키지
      const isBase = false;   // 관람 자동 줄 없음: 전산의 관람권도 모두 항목 줄(관람 · 관람+식사)로
      const put=(src,q)=>{ if(!q) return; const v=views.find(y=>normSrc(y.src)===normSrc(src)); if(v) v.qty+=q; else views.push({src, qty:q}); };
      // 전산은 관람권 한 줄(46명)에 어른 · 학생이 함께 들어옴 (예약인원 「어른 : 4명,학생 : 42명」 · 할인 줄 「학생 42명」) → 예약 내역처럼 관람 · 관람(학생)으로 나눔 (2026-11-17)
      const stN = x.students || +(((x.notes||[]).map(t=>t.match(/학생\s*(\d+)\s*명/)).find(Boolean)||[])[1] || 0);
      const stSrc = !/학생|\(관람,/.test(p) ? p.replace(/^(.*?관람)(\(.*\))?\s*$/, (a,b,c)=>`${b}(학생)${c||''}`) : '';
      if(isBase) view+=n; else if(stN && stSrc && stSrc!==p){ const sn=Math.min(n, stN); put(stSrc, sn); put(p, n-sn); } else put(p, n); }
    else if(progBy[ns]) add(progBy[ns], n);
    else { const mb=mbs.find(m=>normSrc(m.src)===ns);
      if(mb){ add('mabangL',n); if(o.mabangMenu && o.mabangMenu!==mb.name) unknown.push(p+' (몽몽마방 메뉴가 여러 개)'); else o.mabangMenu=mb.name; }
      else { const gi=gds.find(g=>normSrc(g.src)===ns); if(gi){ const g=goods.find(g=>g.src===gi.src); if(g) g.qty+=n; else goods.push({src:gi.src, qty:n}); } else unknown.push(p); } }
  });
  o.goods=goodsJoin(goods); o.views=goodsJoin(views);
  const vsum=views.reduce((s,y)=>s+y.qty,0), pkg=numOf(o.sadam1)+numOf(o.sadam2)+numOf(o.sadamD)+vsum, ppl=Math.max(view+pkg, numOf(o.haeorum)) || Math.max(0, ...['mabangL',...PROG_KEYS()].filter(k=>UNIT(k)!=='시간').map(k=>numOf(o[k])));
  if(ppl) o.people=String(ppl);
  o.viewN = '';   // 관람 자동 줄을 없애 기본 관람권 인원은 쓰지 않음
  const d=list.find(x=>x.date); if(d) o.date=d.date;
  const v=(list.find(x=>x.visitor)||{}).visitor||'', vm=v.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return { o, sp, etc, etcTo, unknown, org:(vm?vm[1]:v).trim(), phone: vm && /\d{2,}/.test(vm[2]) ? vm[2] : '' };
}
const ERP_FILL_KEYS = () => ['sadam1','sadam2','sadamD','views','viewN','mabangL','mabangMenu',...PROG_KEYS(),'goods'];   // 전산 내역대로 맞추는 칸 (없으면 비움)
// 세미나 도슨트 두 개(두 장소): 전산은 세미나 한 품목 → 전산 수량 = 두 줄 합이면 두 줄 그대로 같은 것으로 봄
function semSplit(o){ if(rec.seminar2 && numOf(o.seminar) && numOf(o.seminar)===(numOf(rec.seminar)||1)+(numOf(rec.seminar2)||1)){ o.seminar=rec.seminar; o.seminar2=rec.seminar2; } return o; }
// 학생 (2026-11-21): 예약 내역은 2026-11-20부터 「관람 46명 + 그 줄 학생 42명(rec.istu)」로 저장 → 전산의 관람 · 관람(학생) 두 줄을 관람 한 줄 + 학생 인원으로 합쳐 비교 · 채움
// 옛 방식(views 에 「관람(학생)」 줄)도 같은 모양으로 합침. 돌려줌: {views: 합친 관람 문자열, stu: {품목 키: 학생 인원}} (학생 가격이 따로 있는 줄만 학생 인원을 셈)
const stuBase = s => String(s).replace(/\s*\(학생\)/,'');
function viewsStu(views, istu){
  const rows=[], st={}, im=istuMap({istu:istu||''});
  viewsParse(views).forEach(x=>{ const s=String(x.src), b=stuBase(s), q=+x.qty||0; if(!q) return;
    const r=rows.find(y=>normSrc(y.src)===normSrc(b)); if(r) r.qty+=q; else rows.push({src:b, qty:q});
    if(b!==s) st[b]=(st[b]||0)+q; });
  rows.forEach(r=>{ const n=im[dkey('v:'+r.src)]||0; if(n) st[r.src]=(st[r.src]||0)+n; });
  const stu={}; rows.forEach(r=>{ if(st[r.src] && canStu('v:'+r.src)) stu[normSrc(daySrc(r.src, rec))]=Math.min(r.qty, st[r.src]); });
  return { views: goodsJoin(rows), stu, rows, st };
}
function erpStuApply(o){ const v=viewsStu(o.views, ''); o.views=v.views;
  const m=istuMap(rec); Object.keys(m).forEach(k=>{ if(/^v:/.test(k)) delete m[k]; });   // 관람 줄 학생은 전산대로, 관람+식사 줄 학생(전산에 따로 안 나옴)은 그대로
  v.rows.forEach(r=>{ const n=v.st[r.src]; if(n && canStu('v:'+r.src)) m[dkey('v:'+r.src)]=Math.min(r.qty, n); });
  o.istu=Object.entries(m).map(([a,b])=>`${a}=${b}`).join('; '); return o; }
function fillFromErp(list){
  const {o:o0, sp, etc, etcTo, unknown, org, phone} = erpFields(list), o=erpStuApply(erpSameApply(semSplit(o0))), ch=[];
  if(o.istu!==String(rec.istu||'')){ rec.istu=o.istu; touched.add('istu'); ch.push('istu'); }
  const set=(k,v)=>{ v=v||''; if(String(rec[k]||'')===v) return; rec[k]=v; touched.add(k); ch.push(k); };
  ERP_FILL_KEYS().forEach(k=>set(k, o[k]));
  if(o.people) set('people', o.people); if(o.date) set('date', o.date);
  if(org && !rec.org) set('org', org);
  if(phone && !rec.c0_phone) set('c0_phone', fmtPhone(phone));
  SPECIAL.forEach(s=>{ if(sp[s.k]) set(s.k, String(sp[s.k])); });
  if(rec.isp && (SPECIAL.some(s=>sp[s.k]) || etc)){ rec.isp=''; touched.add('isp'); }   // 전산에서 읽은 특별 · 기타 할인은 예약 전체로 (줄마다 넣은 것은 지움)
  if(etc){ set('etcDisc',''); set('etcDiscTo',''); set('etcDiscTx', etcTo==='사유원' ? '' : String(etc)); set('etcDiscTf', etcTo==='사유원' ? String(etc) : ''); if(!rec.etcDiscWhy) set('etcDiscWhy', '전산 기타할인'); }   // 전산 기타할인: 전산이 알려 준 쪽(기본 신라 = 과세)으로
  else if(rec.etcDiscWhy==='전산 기타할인'){ ['etcDisc','etcDiscTx','etcDiscTf','etcDiscWhy'].forEach(k=>set(k,'')); }   // 전산에서 읽었던 기타 할인이 이번 내역에 없으면 뺌 (직접 넣은 할인은 그대로)
  ERP_FILL_KEYS().forEach(k=>{ const g=OPT[GROUP_OF[k]]; if(g && rec[k]) optOpen.add(g.id); });
  staffDefaults();   // 채운 프로그램 · 굿즈 담당 = 영업 담당   // 채워진 식사 · 프로그램 · 굿즈 묶음은 펼침
  return { n: ch.length, unknown };
}
// 전산 내역 ↔ 예약 내용 다른 점 (식사 · 몽몽마방 · 프로그램 · 굿즈 · 방문일 · 관람 인원 + 알아보지 못한 상품)
function erpCompare(list){
  // 관람 · 굿즈는 글자 그대로 비교하면 띄어쓰기 · 평일/주말 · 순서 · 같은 품목이 두 줄로 나뉜 것만으로도 '다름'이 되어 같은 내용이 다르다고 떴음 (2026-11-16)
  // → 품목(평일 · 주말은 방문일에 맞춰, 띄어쓰기 무시)별 수량 합으로 비교. 다를 때는 시간대까지 보이게 (관람 (9~18시) 20명)
  const qmap = (k,v) => { const m={}; (k==='views'?viewsParse(v):goodsParse(v)).forEach(x=>{ const key=normSrc(k==='views'?daySrc(x.src, rec):x.src); m[key]=(m[key]||0)+(+x.qty||0); }); return JSON.stringify(Object.keys(m).sort().filter(a=>m[a]).map(a=>[a,m[a]])); };
  const same = (k,a,b) => (k==='views'||k==='goods') ? qmap(k,a)===qmap(k,b) : String(a||'')===String(b||'');
  const {o:o0, unknown}=erpFields(list), o=erpSameApply(semSplit(o0));
  // 학생: 전산 관람(학생) 줄 ↔ 예약 관람 줄의 학생 인원 (둘 다 관람 한 줄로 합쳐 비교하고, 학생 인원은 따로)
  const eS=viewsStu(o.views, ''), mS=viewsStu(rec.views, rec.istu);
  o.views=eS.views; const mineViews=mS.views;
  const stuTx = v => { const a=v.rows.filter(r=>v.stu[normSrc(daySrc(r.src, rec))]).map(r=>`${viewLabel(daySrc(r.src, rec))} 학생 ${v.stu[normSrc(daySrc(r.src, rec))]}명`); return a.join(', ') || '없음'; };
  const stuSame = JSON.stringify(Object.entries(eS.stu).sort())===JSON.stringify(Object.entries(mS.stu).sort());
  const show=(k,v)=>!v?(k==='viewN'?'자동':'없음'):k==='goods'?goodsText({goods:v}):k==='views'?viewsParse(v).map(x=>`${viewLabel(daySrc(x.src, rec))} ${x.qty}명`).join(', '):k==='date'?dateLabel(v):/^\d+$/.test(String(v))&&UNIT(k)?v+(k==='people'||/^sadam|mabangL/.test(k)?'명':UNIT(k)):v;
  const mv = k => k==='views' ? mineViews : rec[k];
  const d=[...ERP_FILL_KEYS(),'people','date'].filter(k=>!same(k, o[k], mv(k)) && !((k==='people'||k==='date') && !o[k]))
    .map(k=>({k, label:k==='goods'?'굿즈':k==='views'?'관람 · 관람+식사':k==='viewN'?'기본 관람권 인원':LABEL[k]||k, mine:show(k,mv(k)), erp:show(k,o[k])}));
  if(!stuSame) d.push({k:'istu', label:'학생 인원', mine:stuTx(mS), erp:stuTx(eS)});
  unknown.forEach(p=>d.push({k:'?', label:'알아보지 못한 전산 상품', mine:'-', erp:p}));
  return d;
}
// 전산 내역 적용: how = 'fill'(예약 칸을 전산대로) · 'keep'(예약 칸 그대로, 전산 수정 과업) · 'same'(같음)
let erpPendingTask=null, erpDiffList=null;   // erpPendingTask: 붙여넣으면 완료할 과업 (전산 예약 · 전산 예약 수정)
function applyErpList(list, how, diff){
  erpList=list; touched.add('erpList');
  if(how==='fill'){ fillFromErp(list); nContacts=Math.max(nContacts, nContactsOf(rec)); renderContacts(); renderForm(); }
  if(how==='keep' && diff && diff.length) tasks.push({id:'c'+Date.now().toString(36), title:'전산 예약을 예약 내용대로 수정', custom:true, done:false,
    memo:diff.map(x=>`${x.label}: 예약 ${x.mine} / 전산 ${x.erp}`).join('\n'), at:new Date().toISOString(), due:todayYmd()});
  if(erpPendingTask){ const t=tasks.find(x=>x.id===erpPendingTask);
    if(t){ t.done=true; t.doneAt=new Date().toISOString();
      if(t.id==='erp'){ rec.erp=ymd(new Date()); touched.add('erp'); }
      if(t.id==='erpfix'){ const e=tasks.find(x=>x.id==='erp'); if(e) e.base=erpSnap(); t.changes=[]; } }
    erpPendingTask=null; }
  if(how!=='keep'){ const e=tasks.find(x=>x.id==='erp'); if(e && e.done){ e.base=erpSnap(); const fx=tasks.find(x=>x.id==='erpfix'); if(fx && !fx.done) fx.changes=[]; } }   // 예약 내용 = 전산 → 전산 예약 수정 기준도 지금 내용
  startTimer(); renderTasks(); renderSide(); autoSave();
  toast(how==='fill' ? `전산 내역 ${list.length}건 · 예약 내용을 전산 내역대로 맞췄습니다.` : how==='keep' ? `전산 내역 ${list.length}건 · 예약 내용은 그대로 두고 추후 과업 '전산 예약을 예약 내용대로 수정'을 만들었습니다.` : `전산 내역 ${list.length}건 · 예약 내용과 일치합니다.`);
}
function takeErpText(text){
  const list=parseErp(text);
  if(!list.length) return 0;
  const empty = !itemKeysFromRec().length && !numOf(rec.people);   // 예약 칸이 비어 있으면 그냥 채움
  const diff = empty ? [] : erpCompare(list);
  if(empty) applyErpList(list, 'fill');
  else if(!diff.length) applyErpList(list, 'same');
  else openErpDiff(list, diff);
  return {count:list.length};
}
function openErpDiff(list, diff){
  erpDiffList={list, diff};
  $('#erpDiffBody').innerHTML = `<table class="ptable"><thead><tr><th>항목</th><th>예약 내용</th><th>전산 내역</th></tr></thead><tbody>${diff.map(x=>`<tr><td>${esc(x.label)}</td><td>${esc(x.mine)}</td><td><b>${esc(x.erp)}</b></td></tr>`).join('')}</tbody></table>`;
  // 「같은 품목 (이름만 다름)」은 어떤 경우든 보임 (2026-11-21): 누르면 예약 · 전산 모두 그대로 두고 같은 것으로 봄 (짝이 맞는 품목은 앞으로도 같은 것으로 기억)
  const pr=erpSamePairs(diff); $('#erpDiffSame').hidden=false;
  $('#erpDiffBody').insertAdjacentHTML('beforeend', `<p class="hint" style="margin:8px 0 0">${pr.length ? pr.map(([r,e])=>`예약 「${esc(r.label)}」와 전산 「${esc(e.label)}」`).join(', ')+'가 이름만 다른 같은 품목이면' : '이름 · 나눈 방식만 다르고 실제로 같은 내용이면'} <b>「같은 품목 (이름만 다름)」</b>을 누르세요. 예약 · 전산 모두 그대로 두고 같은 것으로 봅니다.</p>`);
  $('#erpDiffSame').title = pr.length ? `이름만 다르고 같은 품목: ${pr.map(([r,e])=>`예약 「${r.label}」 = 전산 「${e.label}」`).join(' · ')} — 예약 내용은 그대로, 이 예약에서는 앞으로 같은 것으로 봄` : '실제로 같은 내용: 예약 · 전산 모두 그대로 두고 같은 것으로 봄';
  $('#erpDiffModal').hidden=false; $('#erpDiffFill').focus();
}
// 「같은 품목 (이름만 다름)」 짝: 예약에만 있는 칸 ↔ 전산에만 있는 칸 (관람 · 굿즈 · 인원 · 방문일 · 알아보지 못한 상품은 빼고), 나온 순서대로
function erpSamePairs(diff){ const ok=x=>!['views','goods','people','date','viewN','istu','?'].includes(x.k);
  const onlyMine=diff.filter(x=>ok(x) && x.erp==='없음' && x.mine!=='없음'), onlyErp=diff.filter(x=>ok(x) && x.mine==='없음' && x.erp!=='없음');
  return onlyMine.slice(0, onlyErp.length).map((r,i)=>[r, onlyErp[i]]); }
$('#erpDiffSame').onclick=()=>{ const d=erpDiffList; if(!d) return; const pr=erpSamePairs(d.diff);
  if(pr.length){ const m=erpSameMap(); pr.forEach(([r,e])=>{ m[e.k]=r.k; }); rec.erpSame=Object.entries(m).map(([a,b])=>`${a}>${b}`).join('; '); touched.add('erpSame'); }
  closeErpDiff(); toast(pr.length ? `같은 품목으로 봅니다: ${pr.map(([r,e])=>`${r.label} = ${e.label}`).join(' · ')}` : '예약 내용과 전산 내역을 같은 것으로 봅니다.', 3600);
  applyErpList(d.list, 'same'); };
const closeErpDiff = () => { $('#erpDiffModal').hidden=true; erpDiffList=null; };
$('#erpDiffFill').onclick=()=>{ const d=erpDiffList; closeErpDiff(); if(d) applyErpList(d.list, 'fill', d.diff); };
$('#erpDiffKeep').onclick=()=>{ const d=erpDiffList; closeErpDiff(); if(d) applyErpList(d.list, 'keep', d.diff); };
$('#erpDiffCancel').onclick=()=>{ closeErpDiff(); if(erpPendingTask){ toast('전산 내역을 적용하지 않아 전산 예약은 아직 완료되지 않았습니다.'); erpPendingTask=null; } };
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#erpDiffModal').hidden){ e.preventDefault(); $('#erpDiffCancel').click(); } });
// 전산 예약 · 전산 예약 수정을 완료하려면 전산 내역을 꼭 붙여넣어 예약 내용과 맞는지 확인
function askErpForTask(id){
  erpPendingTask=id;
  $('#erpIn').value=''; $('#erpMsg').textContent='';
  $('#erpNeed').hidden=true;   // 안내 글은 없앰 (2026-11-19)
  $('#erpModal').hidden=false; setTimeout(()=>$('#erpIn').focus(),0);
}
$('#erpPasteBtn').onclick=()=>{ erpPendingTask=null; $('#erpNeed').hidden=true; $('#erpIn').value=''; $('#erpMsg').textContent=''; $('#erpModal').hidden=false; setTimeout(()=>$('#erpIn').focus(),0); };
const cancelErpIn = () => { $('#erpModal').hidden=true; if(erpPendingTask){ erpPendingTask=null; toast('전산 내역을 붙여넣지 않아 전산 예약은 아직 완료되지 않았습니다.'); } };
$('#erpCancel').onclick=cancelErpIn;
$('#erpModal').addEventListener('mousedown', e=>{ if(e.target.id==='erpModal') cancelErpIn(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#erpModal').hidden){ e.preventDefault(); cancelErpIn(); } });
$('#erpOk').onclick=()=>{ if(!parseErp($('#erpIn').value).length){ $('#erpMsg').textContent='"방문일자(순번)"으로 시작하는 전산 상품 정보를 찾지 못했습니다.'; return; } $('#erpModal').hidden=true; takeErpText($('#erpIn').value); };   // 예약 내용과 다르면 어떻게 맞출지 묻는 창
document.addEventListener('click', e=>{ if(e.target.id==='erpClear'){ erpList=[]; touched.add('erpList'); renderSide(); toast('전산 내역을 지웠습니다.'); } });
// 특별 할인 인원 입력 (숫자만)
document.querySelectorAll('[data-dk]').forEach(el=>{
  const take=()=>{ const c=el.value.replace(/\D/g,''); if(c!==el.value) el.value=c; rec[el.dataset.dk]=el.value; touched.add(el.dataset.dk); startTimer(); renderSide(); };
  el.addEventListener('beforeinput', e=>{ if(e.data && /\D/.test(e.data) && !e.isComposing) e.preventDefault(); });   // 글자는 아예 안 들어가게
  el.addEventListener('input', take);
  el.addEventListener('compositionend', ()=>setTimeout(take,0));   // 한글 자판으로 친 글자도 지움
  el.addEventListener('blur', take);
});

