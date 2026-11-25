// ===== 네이버 예약 → 사유원 전산 이관 (naver.html · 2026-11-19) — 원래 따로 있던 사이트를 옮겨 온 것이라 작은 도구($ · esc · toast)를 이 파일 안에 따로 둠. 엑셀 비밀번호 풀기는 js/naverxl.js(예약 현황 공유)에도 같은 코드가 있음 =====
/* ---------- 공통 ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PHONE_RE = /(01[016789])[\s.\-]?(\d{3,4})[\s.\-]?(\d{4})/g;
const digits = s => String(s ?? '').replace(/\D/g, '');
const fmtPhone = s => { const d = digits(s); return d.length === 11 ? `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}` : d.length === 10 ? `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}` : String(s ?? '').trim(); };
const won = n => Number(n || 0).toLocaleString('ko-KR');
const num = v => { const n = Number(String(v ?? '').replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; };
function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1600); }
function csvCell(v, sep){ v = String(v ?? ''); return sep === ',' && /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v; }
function toLines(rows, sep){ return rows.map(r => r.map(c => csvCell(c, sep)).join(sep)).join('\n'); }

document.querySelectorAll('#nav button[data-s]').forEach(b => b.onclick = () => b.dataset.s === '4' ? goStep3() : go(b.dataset.s));
// 리셋: 붙여넣은 텍스트·엑셀·결과를 모두 지우고 처음 화면으로 (가격·엑셀 비밀번호는 유지)
$('btnReset').onclick = () => {
  askConfirm('지금까지 입력한 내용을 모두 지우고 처음부터 시작할까요?\n\n붙여넣은 텍스트, 엑셀, 정리 결과, 직접 고친 내용이 모두 사라집니다.\n(저장한 관람권 가격과 기억한 엑셀 비밀번호는 그대로 유지됩니다)', '모두 지우기')
    .then(ok => ok && resetAll());
};
// 확인 상자: 브라우저 기본 confirm()은 환경에 따라 막혀 바로 '취소'가 되므로 페이지 안에 직접 그림
function askConfirm(message, okLabel = '확인'){
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">
      <p style="white-space:pre-line;margin:0 0 16px">${esc(message)}</p>
      <div class="row" style="justify-content:flex-end;margin:0">
        <button class="btn ghost" data-a="no">취소</button><button class="btn" data-a="yes">${esc(okLabel)}</button>
      </div></div>`;
    const done = v => { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = e => { if (e.key === 'Escape') done(false); }; // Enter는 포커스된 버튼이 처리
    wrap.onclick = e => { if (e.target === wrap) done(false); const a = e.target.dataset?.a; if (a) done(a === 'yes'); };
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    wrap.querySelector('[data-a="yes"]').focus();
  });
}
// 새로고침에 기대지 않고 화면과 데이터를 직접 비움 (브라우저가 입력값을 되살리는 경우가 있어서)
function resetAll(){
  Object.assign(state, { rows: [], source: null, excelInfo: null, refunds: [], final: [], finalEdits: {}, unmatched: [], manual: false, filter1: null, filter3: null, sort1: null, sort3: null, checks: {}, copies: {}, excel: new Map(), filter5: null, sort5: { k: 'adult', dir: 'asc' } });
  $('onlyTodo5').checked = false; $('stat5').innerHTML = ''; $('tbl5').innerHTML = '';
  sheetRows = null; header2 = []; body2 = []; colMap = {};
  document.querySelectorAll('textarea').forEach(t => t.value = '');
  $('file2').value = '';
  $('drop2Label').textContent = '엑셀 파일을 끌어다 놓거나 클릭해서 선택';
  document.querySelectorAll('#s2 details').forEach(d => d.open = false);
  $('colmap2').innerHTML = ''; $('colmap2').style.display = 'none'; $('btnColmap').style.display = 'none';
  for (const id of ['stat1', 'warn1', 'tbl1', 'stat3', 'tbl3', 'unmatched3', 'stat4', 'groups4']) $(id).innerHTML = '';
  $('res1').style.display = 'none'; $('res3').style.display = 'none';
  $('sep1').value = ','; $('hdr1').checked = false;
  renderPrices();                 // 저장하지 않은 가격 입력은 저장된 값으로 되돌림
  $('prices2').style.display = 'none';
  try { $('pw2').value = localStorage.getItem(PW_KEY) || ''; } catch { $('pw2').value = ''; }
  setWorkDate(new Date());        // 작업 날짜·요금 기준은 오늘로
  $('src2').innerHTML = ''; go(1); window.scrollTo(0, 0);
  toast('모두 지웠습니다');
}
function go(n){
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.s === String(n)));
  document.querySelectorAll('main section').forEach(s => s.classList.toggle('on', s.id === 's' + n));
  if (String(n) === '4') renderBulk(); // 일괄등록 탭을 열 때마다 최신 명단으로 다시 만듦
  if (String(n) === '5') renderReview();
}
document.addEventListener('click', e => {
  const id = e.target.dataset?.copy; if (!id) return;
  navigator.clipboard.writeText($(id).value).then(() => {
    toast('복사했습니다');
    const key = e.target.dataset.ckey;
    if (key == null) return;
    state.copies = state.copies || {};
    state.copies[key] = (state.copies[key] || 0) + 1;
    e.target.nextElementSibling.outerHTML = copyCount(key);
  });
});

/* 상태 */
const state = { rows: [], refunds: [], final: [], finalEdits: {} };

/* ---------- 오늘 날짜 기준 평일/주말 (모든 단계 공통) ---------- */
// 공휴일·대체공휴일 (주말에 겹치는 날은 생략). 해마다 추가 필요
const HOLIDAYS = {
  '2026-01-01': '신정', '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴',
  '2026-03-02': '삼일절 대체공휴일', '2026-05-05': '어린이날', '2026-05-25': '부처님오신날 대체공휴일',
  '2026-06-03': '지방선거', '2026-08-17': '광복절 대체공휴일', '2026-09-24': '추석 연휴', '2026-09-25': '추석',
  '2026-10-05': '개천절 대체공휴일', '2026-10-09': '한글날', '2026-12-25': '성탄절',
};
const WEEKDAYS = ['일','월','화','수','목','금','토'];
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function autoDayType(d){
  const h = HOLIDAYS[ymd(d)];
  if (h) return { day: 'weekend', why: `공휴일(${h})` };
  const w = d.getDay();
  return (w === 0 || w === 6) ? { day: 'weekend', why: `${WEEKDAYS[w]}요일` } : { day: 'weekday', why: `${WEEKDAYS[w]}요일` };
}
// 작업 날짜: 기본은 오늘, 화면에서 바꿀 수 있음 (저장하지 않음)
const REAL_TODAY = ymd(new Date());
let workDate = new Date(), workAuto = autoDayType(workDate);
state.dayType = workAuto.day;
function renderToday(){
  const isToday = ymd(workDate) === REAL_TODAY;
  $('workDate').value = ymd(workDate);
  $('todayText').textContent = `(${WEEKDAYS[workDate.getDay()]})`;
  $('todayBack').style.display = isToday ? 'none' : '';
  const wk = state.dayType === 'weekend';
  $('todayTag').textContent = wk ? '주말/공휴일 요금 적용' : '평일 요금 적용';
  $('todayTag').className = 'tag ' + (wk ? 'warn' : 'ok');
  $('todayDay').value = state.dayType;
}
function refreshAll(){
  renderToday();
  state.rows.length && render1();
  body2.length && computeFinal();
}
function setWorkDate(d){
  workDate = d; workAuto = autoDayType(d);
  state.dayType = workAuto.day; // 날짜를 바꾸면 요금 기준도 그 날짜로 다시 판단
  refreshAll();
}
$('workDate').onchange = () => { const d = parseDate($('workDate').value); d ? setWorkDate(d) : renderToday(); };
$('todayBack').onclick = () => setWorkDate(new Date());
$('todayDay').onchange = () => { state.dayType = $('todayDay').value; refreshAll(); };
renderToday();

// 상품명 → 분류. 앞의 "[9월, 10월]" 같은 기간 표시와 공백은 무시하고 비교
const PRODUCT_MAP = {
  '관람(평일)09:00-18:00':        '네이버 평일 관람(09:00~18:00)',
  '관람(평일)13:00-18:00':        '네이버 평일 관람(13:00~18:00)',
  '관람(주말/공휴일)09:00-18:00': '네이버 주말/공휴일 관람(09:00~18:00)',
  '관람(주말/공휴일)13:00-18:00': '네이버 주말/공휴일 관람(13:00~18:00)',
};
function classify(product){
  const key = String(product || '').replace(/^\s*\[[^\]]*\]/, '').replace(/\s+/g, '');
  if (PRODUCT_MAP[key]) return PRODUCT_MAP[key];
  // 표에 없는 상품은 이름으로 추정
  const p = String(product || '');
  const day = /주말|휴일|공휴|토|일\)/.test(p) && !/평일/.test(p) ? '주말/공휴일' : /평일/.test(p) ? '평일' : '';
  const t = p.match(/(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})/);
  if (!t) return p.trim();
  const hm = (h, m) => `${String(Number(h)).padStart(2, '0')}:${m}`;
  return `네이버 ${day ? day + ' ' : ''}관람(${hm(t[1], t[2])}~${hm(t[3], t[4])})`;
}
// 분류명에서 오전/오후 · 평일/주말 판단 (시작 시각 12시 전이면 오전)
const slotPart = slot => { const m = String(slot).match(/\((\d{1,2}):\d{2}/); return m ? (Number(m[1]) < 12 ? 'am' : 'pm') : /오후/.test(slot) ? 'pm' : 'am'; };
// 짧은 이름: 오전권 / 오후권 (같은 시간대에 평일·주말 분류가 함께 있으면 "오전권(주말/공휴일)"처럼 구분)
const slotShort = (slot, all = []) => {
  if (!slot) return '(분류 없음)';
  const part = slotPart(slot), name = part === 'am' ? '오전권' : '오후권';
  const twins = all.filter(s => s && slotPart(s) === part);
  return twins.length > 1 ? `${name}(${/주말|공휴/.test(slot) ? '주말/공휴일' : '평일'})` : name;
};
const slotDay = slot => /주말|공휴/.test(slot) ? 'weekend' : /평일/.test(slot) ? 'weekday' : null;

/* ---------- 1단계: 네이버 텍스트 파싱 ---------- */
const NAME_LABEL = /(?:예약자명?|예매자|이름|성함|성명)\s*[:：]?\s*([가-힣]{2,5}|[A-Za-z][A-Za-z ]{1,20})/;
const VISITOR_LABEL = /(?:방문자|실\s*방문자|이용자|실\s*이용자)\s*(?:명|이름|정보|성함)?\s*[:：]?\s*([가-힣]{2,5})/;
const ADULT_RE = /(성인|대인|어른|일반)\s*(?:\([^)]*\))?[^\d\n]{0,6}(\d{1,3})/g;
const STUDENT_RE = /(학생|청소년|어린이|소인|아동|초등|중학생|고등학생|대학생|중고생)\s*(?:\([^)]*\))?[^\d\n]{0,6}(\d{1,3})/g;

function sumMatches(re, text){ let s = 0, m; re.lastIndex = 0; while ((m = re.exec(text))) s += Number(m[2]); return s; }

// 탭으로 구분된 표(머리글 포함)를 붙여넣은 경우
function parseTable(text){
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const hi = lines.findIndex(l => l.includes('\t') && /(예약자|예매자|이름|성명)/.test(l) && /(전화|연락처|휴대폰)/.test(l));
  if (hi < 0) return null;
  const h = lines[hi].split('\t').map(s => s.trim());
  const find = re => h.findIndex(x => re.test(x));
  const ci = { name: find(/예약자|예매자|이름|성명/), phone: find(/전화|연락처|휴대폰/), adult: find(/성인|대인|어른|일반/), student: find(/학생|청소년|어린이|소인|아동/), visitor: find(/방문자|이용자/), vphone: find(/방문자.*(전화|연락처)|이용자.*(전화|연락처)/) };
  return lines.slice(hi + 1).map(l => {
    const c = l.split('\t');
    const r = { name: (c[ci.name] || '').trim(), phone: fmtPhone(c[ci.phone]), adult: ci.adult >= 0 ? num(c[ci.adult]) : 0, student: ci.student >= 0 ? num(c[ci.student]) : 0, note: '' };
    if (ci.visitor >= 0 && c[ci.visitor]?.trim() && c[ci.visitor].trim() !== r.name) {
      const vp = ci.vphone >= 0 && ci.vphone !== ci.visitor ? fmtPhone(c[ci.vphone]) : '';
      r.note = vp ? `${c[ci.visitor].trim()}(${vp})` : c[ci.visitor].trim();
    }
    return r;
  }).filter(r => r.name || r.phone);
}

// 자유 형식 텍스트: 예약 1건 단위로 나눈 뒤 각 블록에서 추출
function splitBlocks(text){
  let blocks = text.split(/\n(?=\s*(?:예약번호|No\.?\s*\d|\d{9,}))/);
  if (blocks.length <= 1) blocks = text.split(/\n\s*\n+/);
  // 블록 하나에 전화번호가 3개 이상이면 줄 단위 레코드로 간주
  if (blocks.length <= 1) {
    const phones = text.match(PHONE_RE) || [];
    if (phones.length > 2) blocks = text.split(/\r?\n/);
  }
  return blocks.map(b => b.trim()).filter(b => /01[016789][\s.\-]?\d{3,4}[\s.\-]?\d{4}/.test(b));
}

function parseBlock(b){
  PHONE_RE.lastIndex = 0;
  const phones = [...b.matchAll(PHONE_RE)].map(m => fmtPhone(m[0]));
  const uniq = [...new Set(phones)];
  let name = (b.match(NAME_LABEL) || [])[1] || '';
  if (!name) {
    // 라벨이 없으면 첫 전화번호 앞의 한글 이름(2~4자)
    const before = b.slice(0, b.search(/01[016789]/));
    const cand = before.match(/[가-힣]{2,4}/g) || [];
    name = cand.filter(w => !/(예약|확정|대기|취소|오전|오후|관람|성인|학생|입장|이용|방문|결제|완료|네이버|사유원)/.test(w)).pop() || '';
  }
  const adult = sumMatches(ADULT_RE, b);
  const student = sumMatches(STUDENT_RE, b);
  let note = '';
  const visitor = (b.match(VISITOR_LABEL) || [])[1];
  if (visitor && visitor !== name) note = uniq[1] ? `${visitor}(${uniq[1]})` : visitor;
  else if (uniq.length > 1) note = `(${uniq[1]})`;
  return { name: name.trim(), phone: uniq[0] || '', adult, student, note };
}

// 네이버 예약 관리 화면 복사본: "확정 / 이름 / 신규예매|취소 N / 예매자<TAB>이름 / 전화번호<TAB>... / 수량 / 평일(성인) 2 / 결제상태..."
const STATUS_LINE = /^(확정|완료|대기|미확정|취소|이용완료|노쇼|예약확정|예약대기)\s*$/;
function parseNaverList(text){
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const starts = [];
  lines.forEach((l, i) => { if (STATUS_LINE.test(l) && lines.slice(i + 1, i + 5).some(x => /^예매자\s/.test(x))) starts.push(i); });
  if (!starts.length) return null;
  return starts.map((s, n) => {
    const block = lines.slice(s, starts[n + 1] ?? lines.length);
    const kv = {};
    let inQty = false, adult = 0, student = 0;
    const unknownQty = [];
    for (const l of block) {
      if (/^수량\s*$/.test(l)) { inQty = true; continue; }
      const m = l.match(/^([^\t]+?)\t+(.*)$/);
      if (m) { inQty = false; kv[m[1].trim()] = m[2].trim(); continue; }
      if (inQty) {
        const q = l.match(/^(.*?)\s*(\d+)\s*$/);
        if (!q) continue;
        // 권종은 성인·학생 두 가지뿐: "(성인)"은 성인수, "(학생)"은 학생수. "전체 4" 같은 합계 줄 등 나머지는 세지 않음
        if (/성인/.test(q[1])) adult += Number(q[2]);
        else if (/학생/.test(q[1])) student += Number(q[2]);
        else if (!/^(전체|합계|총)/.test(q[1].trim())) unknownQty.push(l.trim());
      }
    }
    // 대리예약이면 예매자 뒤에 "대리예약"이 붙어 나옴
    const name = (kv['예매자'] || block[1] || '').replace(/\s*대리\s*예약\s*$/, '').trim();
    let note = '';
    // 대리예약: 방문자/이용자 항목이 있으면 비고에 이름(전화번호)
    const vKey = Object.keys(kv).find(k => /방문자|이용자/.test(k) && !/(전화|연락처|휴대폰)/.test(k));
    const vpKey = Object.keys(kv).find(k => /방문자|이용자/.test(k) && /(전화|연락처|휴대폰)/.test(k));
    if (vKey || vpKey) {
      const raw = vKey ? kv[vKey] : '';
      const vPhoneIn = raw.match(/01[016789][\s.\-]?\d{3,4}[\s.\-]?\d{4}/);
      const vName = raw.replace(vPhoneIn?.[0] || '', '').replace(/[()]/g, '').trim();
      const vPhone = vpKey ? fmtPhone(kv[vpKey]) : vPhoneIn ? fmtPhone(vPhoneIn[0]) : '';
      if (vName && vName !== name) note = vPhone ? `${vName}(${vPhone})` : vName;
    }
    return { slot: classify(kv['상품']), name, phone: fmtPhone(kv['전화번호']), adult, student, note, unknownQty, bookingNo: kv['예매번호'] || '', useDate: (d => d ? ymd(d) : '')(parseDate(kv['이용일'] || '')) };
  });
}

function parseNaver(text){
  if (!text.trim()) return [];
  return parseNaverList(text) || parseTable(text) || splitBlocks(text).map(parseBlock);
}

const COLS1 = [['slot','분류'],['name','예매자'],['phone','전화번호'],['adult','성인수'],['student','학생수'],['note','실방문자']];

/* 인원 정렬: 열 제목 옆 버튼을 누를 때마다 ↕(입력 순서) → ▲(오름차순) → ▼(내림차순) → ↕ */
const sortVal = (r, k) => k === 'total' ? r.adult + r.student : k === 'name' ? String(r.name || '') : r[k];
const SORT_KEYS = ['name', 'adult', 'student']; // 정렬 버튼을 붙이는 열: 예매자·성인수·학생수
function sortRows(list, s, get = x => x){
  if (!s?.k) return list;
  const m = s.dir === 'asc' ? 1 : -1;
  const cmp = (x, y) => typeof x === 'string' ? x.localeCompare(y, 'ko') : x - y; // 이름은 가나다순, 인원은 숫자순
  return list.slice().sort((a, b) => cmp(sortVal(get(a), s.k), sortVal(get(b), s.k)) * m); // 같은 값은 입력 순서 유지
}
const sortBtn = (s, k) => `<button type="button" class="sortbtn" data-sort="${k}" title="인원 정렬">${s?.k === k ? (s.dir === 'asc' ? '▲' : '▼') : '↕'}</button>`;
function nextSort(s, k){ return s?.k !== k ? { k, dir: 'asc' } : s.dir === 'asc' ? { k, dir: 'desc' } : { k: null }; }

function renderEditable(el, rows, onChange){
  el._rows = rows; // [저장하기]가 칸 위치 → 예약을 찾을 때 사용
  if (!rows.length) { el.innerHTML = `<div class="empty">${state.filter1 ? '이 관람권 예약이 없습니다.' : '예약을 찾지 못했습니다.'}</div>`; return; }
  el.innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>#</th>${COLS1.map(([k, l]) => `<th class="${k==='adult'||k==='student'?'num':''}">${l}${SORT_KEYS.includes(k) ? sortBtn(state.sort1, k) : ''}</th>`).join('')}</tr></thead><tbody>${
    rows.map((r,i)=>`<tr><td>${i+1}</td>${COLS1.map(([k])=>`<td contenteditable data-i="${i}" data-k="${k}" class="${k==='adult'||k==='student'?'num':''}">${esc(r[k])}</td>`).join('')}</tr>`).join('')
  }</tbody></table></div>`;
  el.querySelectorAll('td[contenteditable]').forEach(td => td.onblur = () => {
    const r = rows[td.dataset.i], k = td.dataset.k;
    r[k] = (k === 'adult' || k === 'student') ? num(td.textContent) : td.textContent.trim();
    onChange();
  });
  el.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { state.sort1 = nextSort(state.sort1, b.dataset.sort); onChange(); });
}

function render1(){
  const sep = $('sep1').value === '\\t' ? '\t' : ',';
  const head = $('hdr1').checked ? [COLS1.map(c => c[1])] : [];
  // 분류 네모칸을 누르면 그 분류만 보기 (다시 누르거나 '전체'를 누르면 해제)
  const shown = sortRows(state.filter1 ? state.rows.filter(r => (r.slot || '(분류 없음)') === state.filter1) : state.rows, state.sort1);
  $('out1').value = toLines(head.concat(shown.map(r => COLS1.map(([k]) => r[k]))), sep);
  // 네모칸 순서는 항상 09~18 → 13~18 → 전체. 작업 날짜 요금의 두 관람권은 0건이어도 표시
  const dayName = state.dayType === 'weekend' ? '주말/공휴일' : '평일';
  const groups = new Map([`네이버 ${dayName} 관람(09:00~18:00)`, `네이버 ${dayName} 관람(13:00~18:00)`].map(k => [k, { n: 0, a: 0, s: 0 }]));
  const total = { n: 0, a: 0, s: 0 };
  for (const r of state.rows) {
    const k = r.slot || '(분류 없음)';
    if (!groups.has(k)) groups.set(k, { n: 0, a: 0, s: 0 });
    for (const g of [groups.get(k), total]) { g.n++; g.a += r.adult; g.s += r.student; }
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (slotPart(a) === 'am' ? 0 : 1) - (slotPart(b) === 'am' ? 0 : 1));
  $('stat1').innerHTML = [...ordered, ['전체', total]].map(([k, g]) => {
    const on = k === '전체' ? !state.filter1 : state.filter1 === k;
    return `<button type="button" class="stat" data-slot="${esc(k)}" style="cursor:pointer;text-align:left;font:inherit;color:inherit;border:2px solid ${on ? 'var(--accent)' : 'transparent'}"><b>${g.n}건 · ${g.a + g.s}명</b><span>${esc(k)} · 성인 ${g.a} / 학생 ${g.s}</span></button>`;
  }).join('');
  $('stat1').querySelectorAll('[data-slot]').forEach(b => b.onclick = () => {
    const k = b.dataset.slot;
    state.filter1 = (k === '전체' || state.filter1 === k) ? null : k;
    render1();
  });
  // 오늘 날짜와 맞지 않는 예약 경고
  const today = ymd(workDate), dayWord = state.dayType === 'weekend' ? '주말' : '평일';
  const otherDate = state.rows.filter(r => r.useDate && r.useDate !== today);
  const otherDay = state.rows.filter(r => slotDay(r.slot) && slotDay(r.slot) !== state.dayType);
  const warns = [];
  if (otherDate.length) warns.push(`이용일이 작업 날짜(${today})와 다른 예약 ${otherDate.length}건: ${[...new Set(otherDate.map(r => r.useDate))].join(', ')}`);
  if (otherDay.length) warns.push(`작업 날짜는 ${dayWord} 요금인데 다른 상품인 예약 ${otherDay.length}건: ${otherDay.map(r => r.name).join(', ')}`);
  const oddQty = state.rows.filter(r => r.unknownQty?.length);
  if (oddQty.length) warns.push(`성인·학생이 아닌 수량 줄이 있어 세지 않은 예약 ${oddQty.length}건: ${oddQty.map(r => `${r.name}(${r.unknownQty.join(', ')})`).join(', ')}`);
  $('warn1').innerHTML = warns.map(w => `<p class="hint" style="margin:10px 0 0"><span class="tag warn">확인 필요</span> ${esc(w)}</p>`).join('');
  renderEditable($('tbl1'), shown, render1);
  if (body2.length || state.manual) computeFinal(); // 1단계를 고치면 2단계 최종 인원도 다시 계산
}
// 붙여넣으면 바로 정리 (결과가 안 나오면 [정리하기]를 직접 누름)
$('inAll').addEventListener('paste', () => setTimeout(() => $('inAll').value.trim() && $('btnParse').click(), 0));
$('btnParse').onclick = () => {
  state.rows = parseNaver($('inAll').value);
  if (state.rows.length && window.syDaily) syDaily.mark('naver', '텍스트 정리');   // 하루 한 번 작업 기록 (2026-11-24 · js/dailyguard.js)
  state.source = 'text';   // 이제부터 명단은 텍스트 (엑셀은 환불 반영 · 점검에만)
  state.filter1 = null;
  state.finalEdits = {}; // 명단이 바뀌면 2단계에서 고친 내용은 초기화
  $('res1').style.display = '';
  render1();
};
$('sep1').onchange = $('hdr1').onchange = () => $('res1').style.display !== 'none' && render1();

/* ---------- 2단계: 환불 확인 ---------- */
let sheetRows = null; // 2차원 배열
const drop2 = $('drop2');
drop2.onclick = () => $('file2').click();
drop2.ondragover = e => { e.preventDefault(); drop2.classList.add('over'); };
drop2.ondragleave = () => drop2.classList.remove('over');
drop2.ondrop = e => { e.preventDefault(); drop2.classList.remove('over'); if (e.dataTransfer.files[0]) readSheet(e.dataTransfer.files[0]); };
$('file2').onchange = e => e.target.files[0] && readSheet(e.target.files[0]);

/* 암호 걸린 엑셀(Office Agile 암호화: AES + SHA-512) 풀기 — 브라우저 Web Crypto 사용 */
const PW_KEY = 'sayuwon.xlsxPassword';
try { $('pw2').value = localStorage.getItem(PW_KEY) || ''; } catch {}
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const concatBytes = (...arrs) => { const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };
const u32le = n => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
const hashOf = (alg, data) => crypto.subtle.digest(alg, data).then(b => new Uint8Array(b));
const fitLen = (h, n, pad = 0x36) => { const out = new Uint8Array(n).fill(pad); out.set(h.slice(0, n)); return out; };
// 패딩 없는 AES-CBC 복호화 (Web Crypto는 PKCS7만 지원하므로 패딩 블록을 덧붙여 처리)
async function aesCbcRaw(keyBytes, iv, data){
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['encrypt', 'decrypt']);
  const last = data.slice(data.length - 16);
  const padBlock = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: last }, key, new Uint8Array(16).fill(16))).slice(0, 16);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, concatBytes(data, padBlock)));
}
async function decryptXlsx(bytes, password){
  const cfb = XLSX.CFB.read(bytes, { type: 'array' });
  const info = XLSX.CFB.find(cfb, 'EncryptionInfo')?.content;
  const pkg = XLSX.CFB.find(cfb, 'EncryptedPackage')?.content;
  if (!info || !pkg) throw new Error('암호화된 엑셀 형식이 아닙니다');
  if (!(info[0] === 4 && info[2] === 4)) throw new Error('지원하지 않는 암호화 방식입니다');
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(new Uint8Array(info).slice(8)), 'application/xml');
  const kd = xml.getElementsByTagName('keyData')[0];
  const ek = [...xml.getElementsByTagName('*')].find(e => e.localName === 'encryptedKey');
  const alg = a => ({ SHA512: 'SHA-512', SHA384: 'SHA-384', SHA256: 'SHA-256', SHA1: 'SHA-1' })[a.getAttribute('hashAlgorithm')];
  const hAlg = alg(ek), keyLen = Number(ek.getAttribute('keyBits')) / 8, spin = Number(ek.getAttribute('spinCount'));
  // 비밀번호 → 키 (spinCount 만큼 반복 해시)
  const pwBytes = new Uint8Array(password.length * 2);
  for (let i = 0; i < password.length; i++) { const c = password.charCodeAt(i); pwBytes[i*2] = c & 255; pwBytes[i*2+1] = c >> 8; }
  let h = await hashOf(hAlg, concatBytes(b64(ek.getAttribute('saltValue')), pwBytes));
  for (let i = 0; i < spin; i++) h = await hashOf(hAlg, concatBytes(u32le(i), h));
  const blockKey = async bk => fitLen(await hashOf(hAlg, concatBytes(h, new Uint8Array(bk))), keyLen);
  const pwSalt = b64(ek.getAttribute('saltValue'));
  // 비밀번호 확인
  const vIn = (await aesCbcRaw(await blockKey([0xfe,0xa7,0xd2,0x76,0x3b,0x4b,0x9e,0x79]), pwSalt, b64(ek.getAttribute('encryptedVerifierHashInput')))).slice(0, 16);
  const vHash = await aesCbcRaw(await blockKey([0xd7,0xaa,0x0f,0x6d,0x30,0x61,0x34,0x4e]), pwSalt, b64(ek.getAttribute('encryptedVerifierHashValue')));
  const expect = await hashOf(hAlg, vIn);
  if (expect.some((b, i) => b !== vHash[i])) throw new Error('비밀번호가 맞지 않습니다');
  const secret = (await aesCbcRaw(await blockKey([0x14,0x6e,0x0b,0xe7,0xab,0xac,0xd0,0xd6]), pwSalt, b64(ek.getAttribute('encryptedKeyValue')))).slice(0, Number(kd.getAttribute('keyBits')) / 8);
  // 본문: 4096바이트 단위로 복호화
  const data = new Uint8Array(pkg), size = data[0] | data[1] << 8 | data[2] << 16 | data[3] * 16777216;
  const kdSalt = b64(kd.getAttribute('saltValue')), kdAlg = alg(kd), parts = [];
  for (let off = 8, seg = 0; off < data.length; off += 4096, seg++) {
    const iv = fitLen(await hashOf(kdAlg, concatBytes(kdSalt, u32le(seg))), 16);
    parts.push(await aesCbcRaw(secret, iv, data.slice(off, Math.min(off + 4096, data.length))));
  }
  return concatBytes(...parts).slice(0, size);
}
const isEncrypted = bytes => { try { return !!XLSX.CFB.find(XLSX.CFB.read(bytes, { type: 'array' }), 'EncryptedPackage'); } catch { return false; } };

async function readSheet(file){
  const label = $('drop2Label');
  try {
    let bytes = new Uint8Array(await file.arrayBuffer());
    if (isEncrypted(bytes)) {
      const pw = $('pw2').value;
      if (!pw) { toast('엑셀 비밀번호를 입력해 주세요'); $('pw2').focus(); label.textContent = '비밀번호를 입력한 뒤 파일을 다시 넣어 주세요'; return; }
      label.textContent = '암호를 푸는 중…';
      bytes = await decryptXlsx(bytes, pw);
      try { $('pwKeep2').checked ? localStorage.setItem(PW_KEY, pw) : localStorage.removeItem(PW_KEY); } catch {}
    }
    const wb = XLSX.read(bytes, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    sheetRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
    label.textContent = `📄 ${file.name} · ${sheetRows.length}행 불러옴 (다른 파일은 다시 끌어다 놓기)`;
    if (window.syDaily) syDaily.mark('naver', '엑셀 넣음');   // 하루 한 번 작업 기록 (2026-11-24)
    $('in2').value = '';
    runCheck();
  } catch (e) {
    // 엑셀 오류(비밀번호가 맞지 않음 등): 1단계 텍스트 명단이 있으면 그대로 최종 인원(환불은 표에서 직접) · 없으면 1단계로 (2026-11-24)
    if (state.source === 'text' && state.rows.length) {
      label.textContent = `⚠️ 엑셀 오류: ${e.message} — 1단계 텍스트 명단을 그대로 씁니다 (환불은 표에서 직접 고침)`;
      state.manual = !body2.length; computeFinal(); renderSrc2();
      toast(`엑셀 오류 (${e.message}) · 텍스트 명단 그대로 최종 인원을 만들었습니다`);
      return;
    }
    label.textContent = `⚠️ 엑셀 오류: ${e.message} — 1단계(텍스트)로 넘어갔습니다`;
    go(1); window.scrollTo(0, 0); setTimeout(() => $('inAll') && $('inAll').focus(), 0);
    toast(`엑셀 오류 (${e.message}) · 네이버 예약 텍스트를 붙여넣어 명단을 만들어 주세요`);
  }
}

const COL_RULES = {
  booking: [/예약\s*번호|예매\s*번호|주문\s*번호/, '예약번호'],
  name:   [/예약자|예매자|이름|성명/, '예약자'],
  phone:  [/전화|연락처|휴대폰/, '전화번호'],
  paid:   [/실\s*결제|결제\s*금액|결제액/, '실결제금액'],
  refund: [/환불\s*금액|환불액|환불/, '환불금액'],
  date:   [/이용\s*일|방문\s*일|관람\s*일|이용\s*일시|예약\s*일시|날짜/, '이용일'],
  ticket: [/상품|관람권|옵션|권종/, '상품명'],
};
// 네이버 예약자관리 엑셀의 실제 열 이름 (정확히 같은 이름을 먼저 찾고, 없으면 COL_RULES로 추정)
const NAVER_COLS = { booking: '예약번호', name: '예매자', phone: '전화번호', paid: '실결제금액', refund: '환불금액', date: '이용일', ticket: '상품' };
function detectCols(header){
  const map = {};
  for (const [k, [re]] of Object.entries(COL_RULES)) {
    const exact = header.findIndex(h => String(h).trim() === NAVER_COLS[k]);
    if (exact >= 0) { map[k] = exact; continue; }
    let idx = header.findIndex(h => re.test(String(h)));
    if (k === 'paid' && idx >= 0 && /환불/.test(header[idx])) idx = header.findIndex(h => re.test(String(h)) && !/환불/.test(h));
    map[k] = idx;
  }
  return map;
}
// 관람권 가격 칸도 평소에는 숨기고 [관람권 가격 수정하기]를 누를 때만 펼침 (접으면 저장 안 한 입력은 되돌림)
$('btnPrices').onclick = () => {
  const box = $('prices2'), open = box.style.display === 'none';
  box.style.display = open ? '' : 'none';
  if (!open) renderPrices();
};
// 열 선택 칸은 평소에 숨겨 두고 [엑셀 열 인식 수정하기]를 누를 때만 펼침
$('btnColmap').onclick = () => { const box = $('colmap2'); box.style.display = box.style.display === 'none' ? '' : 'none'; };
function renderColMap(header, map){
  const box = $('colmap2'); $('btnColmap').style.display = '';
  box.innerHTML = Object.entries(COL_RULES).map(([k,[,label]]) =>
    `<label class="chk">${label}<select data-col="${k}"><option value="-1">(없음)</option>${header.map((h,i)=>`<option value="${i}" ${map[k]===i?'selected':''}>${esc(h)}</option>`).join('')}</select></label>`).join('');
  box.querySelectorAll('select').forEach(s => s.onchange = () => { colMap[s.dataset.col] = Number(s.value); compute2(); });
}

function parseDate(v){
  // "2026. 10. 21.", "2026-10-21", "26. 10. 21.(수)" 모두 지원
  const m = String(v).match(/(\d{4}|\d{2})[.\-\/년]\s*(\d{1,2})[.\-\/월]\s*(\d{1,2})/);
  if (m) return new Date(Number(m[1].length === 2 ? '20' + m[1] : m[1]), Number(m[2]) - 1, Number(m[3]));
  const m2 = String(v).match(/(\d{1,2})[.\/월]\s*(\d{1,2})/);
  if (m2) return new Date(new Date().getFullYear(), Number(m2[1]) - 1, Number(m2[2]));
  return null;
}
/* 관람권 가격: [저장]을 눌러 확인하면 이 브라우저의 기본값이 됨 */
const DEFAULT_PRICES = { weekday: { adult: 50000, student: 45000 }, weekend: { adult: 69000, student: 62000 } };
const PRICE_KEY = 'sayuwon.prices';
const DAY_LABEL = { weekday: '평일', weekend: '주말' };
let prices = loadPrices();
function loadPrices(){
  try { const p = JSON.parse(localStorage.getItem(PRICE_KEY)); if (p?.weekday?.adult && p?.weekend?.adult) return p; } catch {}
  return structuredClone(DEFAULT_PRICES);
}
const priceInputs = [...document.querySelectorAll('[data-price]')];
const priceLabel = key => { const [d, k] = key.split('.'); return `${DAY_LABEL[d]} ${k === 'adult' ? '성인' : '학생'}`; };
function renderPrices(){
  priceInputs.forEach(i => { const [d, k] = i.dataset.price.split('.'); i.value = prices[d][k]; i.style.borderColor = ''; });
  $('priceSave').disabled = true;
}
// 입력만 바꾼 상태에서는 계산에 쓰지 않고, 바뀐 칸만 표시
priceInputs.forEach(i => i.oninput = () => {
  const [d, k] = i.dataset.price.split('.');
  i.style.borderColor = num(i.value) !== prices[d][k] ? 'var(--warn)' : '';
  $('priceSave').disabled = !priceInputs.some(x => x.style.borderColor);
});
function applyPrices(next){
  prices = next;
  try { localStorage.setItem(PRICE_KEY, JSON.stringify(prices)); } catch {}
  renderPrices();
  body2.length && computeFinal();
  toast('관람권 가격을 저장했습니다');
}
$('priceSave').onclick = () => {
  const next = structuredClone(prices);
  const changes = [];
  for (const i of priceInputs) {
    const [d, k] = i.dataset.price.split('.'), v = num(i.value);
    if (!v) { toast(`${priceLabel(i.dataset.price)} 가격을 입력해 주세요`); return; }
    if (v !== prices[d][k]) { changes.push(`${priceLabel(i.dataset.price)}: ${won(prices[d][k])}원 → ${won(v)}원`); next[d][k] = v; }
  }
  if (!changes.length) return;
  askConfirm(`정말 변경하시겠습니까?\n\n${changes.join('\n')}\n\n저장하면 앞으로 이 가격이 기본값이 됩니다.`, '변경')
    .then(ok => ok ? applyPrices(next) : renderPrices());
};
$('priceReset').onclick = () => {
  const d = DEFAULT_PRICES;
  askConfirm(`정말 변경하시겠습니까?\n\n처음 가격으로 되돌립니다.\n평일 성인 ${won(d.weekday.adult)}원 · 평일 학생 ${won(d.weekday.student)}원\n주말 성인 ${won(d.weekend.adult)}원 · 주말 학생 ${won(d.weekend.student)}원`, '되돌리기')
    .then(ok => ok && applyPrices(structuredClone(DEFAULT_PRICES)));
};
renderPrices();

// 환불금액 = 성인취소×성인가 + 학생취소×학생가 가 되는 조합 (예약 인원 안에서)
function solveCancel(refund, p, maxA = Infinity, maxS = Infinity){
  const out = [];
  if (!p.adult || !p.student) return out;
  for (let a = 0; a * p.adult <= refund && a <= maxA; a++) {
    const rest = refund - a * p.adult;
    if (rest % p.student === 0 && rest / p.student <= maxS) out.push({ a, s: rest / p.student });
  }
  return out;
}

// 부분취소 1건의 평일/주말과 취소 조합을 정함. row는 맞춰진 1단계 예약(없으면 undefined)
function resolveRefund(f, row){
  if (f.kind !== 'partial') return;
  f.day = state.dayType;
  f.sols = row ? solveCancel(f.refund, prices[f.day], row.origAdult, row.origStudent) : solveCancel(f.refund, prices[f.day]);
  if (!(f.solIdx < f.sols.length)) f.solIdx = 0;
  f.flag = !f.sols.length ? '금액에 맞는 인원 조합 없음' : f.sols.length > 1 ? `가능한 조합 ${f.sols.length}개 · 선택 필요` : '';
}
// 부분취소로 바뀐 인원을 "성인 6→5" 형태로 (바뀐 쪽만)
const changeText = (a, st, s) => [s.a ? `성인 ${a}→${a - s.a}` : '', s.s ? `학생 ${st}→${st - s.s}` : ''].filter(Boolean).join(' · ');
const solText = s => [s.a ? `성인 ${s.a}` : '', s.s ? `학생 ${s.s}` : ''].filter(Boolean).join(' · ') || '0명';

let colMap = {}, header2 = [], body2 = [];
function runCheck(){
  let rows = sheetRows;
  if ($('in2').value.trim()) rows = $('in2').value.split(/\r?\n/).filter(l => l.trim()).map(l => l.split('\t'));
  if (!rows || !rows.length) { toast('엑셀 파일이나 붙여넣은 표가 없습니다'); return; }
  const hi = rows.findIndex(r => r.some(c => /환불/.test(c)));
  if (hi < 0) { toast('"환불금액" 머리글을 찾지 못했습니다'); return; }
  header2 = rows[hi].map(h => String(h).trim());
  body2 = rows.slice(hi + 1).filter(r => r.some(c => String(c).trim()));
  colMap = detectCols(header2);
  renderColMap(header2, colMap);
  compute2();
}
$('btnCheck').onclick = runCheck;

function compute2(){
  // ① 환불금액이 있는 예약만 후보로 추림
  const candidates = body2.filter(r => num(r[colMap.refund]) > 0);
  // ② 후보 각각을 전액환불 / 부분취소로 판단
  state.finalEdits = {};
  state.manual = false;
  state.refunds = candidates.map(r => {
    const paid = num(r[colMap.paid]), refund = num(r[colMap.refund]);
    return { bookingNo: colMap.booking >= 0 ? digits(r[colMap.booking]) : '', name: String(r[colMap.name] ?? '').trim(), phone: fmtPhone(r[colMap.phone]), date: colMap.date >= 0 ? r[colMap.date] : '',
      paid, refund, kind: paid === refund ? 'full' : 'partial', solIdx: 0 };
  });
  // ③ 1단계 정보 점검용: 엑셀의 모든 예약을 예매번호로 기억 (예매자·전화번호·성인/학생 수량·결제금액)
  const qtyCols = header2.map((h, i) => ({ h, i })).filter(({ h }) => /\((성인|학생)\)\s*$/.test(h)); // "가격분류1-평일(성인)" 등, "… 결제금액" 열은 제외
  const vNameCol = header2.findIndex(h => h === '방문자'), vPhoneCol = header2.findIndex(h => /^방문자\s*(전화|연락처|휴대폰)/.test(h));
  state.excel = new Map();
  for (const r of body2) {
    const bn = colMap.booking >= 0 ? digits(r[colMap.booking]) : '';
    if (!bn) continue;
    let adult = null, student = null;
    if (qtyCols.length) { adult = 0; student = 0; for (const { h, i } of qtyCols) /성인/.test(h) ? adult += num(r[i]) : student += num(r[i]); }
    state.excel.set(bn, { name: String(r[colMap.name] ?? '').replace(/\s*대리\s*예약\s*$/, '').trim(), phone: digits(r[colMap.phone]), adult, student, paid: num(r[colMap.paid]),
      slot: colMap.ticket >= 0 && r[colMap.ticket] ? classify(r[colMap.ticket]) : '',
      hasVisitorCol: vNameCol >= 0,
      vName: vNameCol >= 0 ? String(r[vNameCol] ?? '').trim() : '',
      vPhoneRaw: vPhoneCol >= 0 ? String(r[vPhoneCol] ?? '').trim() : '' });
  }
  // ④ 명단: 텍스트로 만들지 않았으면 엑셀에서 바로 (2026-11-19 · 엑셀이 먼저, 안 되면 텍스트)
  if (state.source !== 'text') {
    const built = excelRows(qtyCols, vNameCol, vPhoneCol);
    state.rows = built.rows; state.source = 'excel'; state.excelInfo = built;
  }
  computeFinal();
  renderSrc2();
}
// 엑셀 한 줄 = 예약 하나. 전액환불(취소)은 빼고, 인원은 가격분류 (성인) · (학생) 수량 (없으면 결제금액으로, 조합이 하나일 때만)
// 엑셀로 안 되는 경우(전화번호 앞자리가 가려짐 · 인원을 알 수 없음)는 problems 로 → 텍스트로 하라고 안내
function excelRows(qtyCols, vNameCol, vPhoneCol){
  const rows = [], problems = [], statusCol = header2.findIndex(h => /상태/.test(h));
  let cancelled = 0;
  for (const r of body2) {
    const paid = num(r[colMap.paid]), refund = num(r[colMap.refund]);
    if (refund > 0 && refund >= paid) { cancelled++; continue; }
    if (statusCol >= 0 && /취소/.test(r[statusCol]) && !refund) { cancelled++; continue; }
    const name = String(r[colMap.name] ?? '').replace(/\s*대리\s*예약\s*$/, '').trim(), ph = digits(r[colMap.phone]);
    if (!name && !ph) continue;
    const slot = colMap.ticket >= 0 && r[colMap.ticket] ? classify(r[colMap.ticket]) : '';
    let adult = null, student = null;
    if (qtyCols.length) { adult = 0; student = 0; for (const { h, i } of qtyCols) /성인/.test(h) ? adult += num(r[i]) : student += num(r[i]); }
    else if (paid) { const sols = solveCancel(paid, prices[slotDay(slot) || state.dayType]); if (sols.length === 1) ({ a: adult, s: student } = sols[0]); }
    if (adult == null) problems.push(`${name}: 인원을 알 수 없음`);
    if (ph.length < 10) problems.push(`${name}: 전화번호가 가려져 있음(…${ph.slice(-4)})`);
    const vName = vNameCol >= 0 ? String(r[vNameCol] ?? '').trim() : '', vRaw = vPhoneCol >= 0 ? String(r[vPhoneCol] ?? '').trim() : '';
    const note = vName && vName !== name ? (digits(vRaw).length >= 10 ? `${vName}(${fmtPhone(vRaw)})` : vRaw ? `${vName}(${vRaw})` : vName) : '';
    const d = colMap.date >= 0 ? parseDate(r[colMap.date]) : null;
    rows.push({ slot, name, phone: ph.length >= 10 ? fmtPhone(ph) : String(r[colMap.phone] ?? '').trim(), adult: adult ?? 0, student: student ?? 0, note,
      unknownQty: [], bookingNo: colMap.booking >= 0 ? digits(r[colMap.booking]) : '', useDate: d ? ymd(d) : '' });
  }
  const other = rows.filter(r => r.useDate && r.useDate !== ymd(workDate));
  if (other.length) problems.push(`이용일이 작업 날짜(${ymd(workDate)})와 다른 예약 ${other.length}건: ${[...new Set(other.map(r => r.useDate))].join(', ')}`);
  return { rows, problems, cancelled };
}
// 1단계 위: 명단을 어디서 만들었는지 + 엑셀로 안 되는 것
function renderSrc2(){
  const box = $('src2'); if (!box) return;
  if (state.source === 'text') {
    box.innerHTML = `<p class="hint" style="margin:10px 0 0"><span class="tag yellow">텍스트 명단</span> 1단계에서 정리한 명단 ${state.rows.length}건을 씁니다${body2.length ? ' · 엑셀은 환불 반영과 점검에만' : ''}. <button type="button" class="btn ghost" id="backToExcel">엑셀로 명단 다시 만들기</button></p>`;
  } else if (state.source === 'excel') {
    const x = state.excelInfo || { rows: [], problems: [], cancelled: 0 };
    box.innerHTML = `<p class="hint" style="margin:10px 0 0"><span class="tag ok">엑셀 명단</span> 네이버 엑셀에서 예약 ${x.rows.length}건${x.cancelled ? ` (전액환불 · 취소 ${x.cancelled}건 뺌)` : ''}으로 명단을 만들었습니다.</p>`
      + (x.problems.length ? `<div class="hint" style="margin:8px 0 0;color:var(--bad)"><span class="tag bad">엑셀로 안 되는 것 ${x.problems.length}</span> ${x.problems.map(esc).join(' · ')}<br>표에서 직접 고치거나, 1단계에서 텍스트로 명단을 만드세요 <button type="button" class="btn ghost" id="goText2">← 1단계(텍스트)로</button></div>` : '');
  } else box.innerHTML = '';
  const b = $('backToExcel'); if (b) b.onclick = () => { state.source = null; state.manual = false; if (body2.length) compute2(); else renderSrc2(); toast('엑셀로 명단을 다시 만들었습니다'); };
  const g = $('goText2'); if (g) g.onclick = () => $('btnManual').click();
}

// 1단계 정보를 엑셀(예매번호가 같은 줄) 기준으로 점검하고, 틀린 것은 엑셀 값으로 고침. 고친 내용을 돌려줌
function checkAgainstExcel(out, ex){
  const fixes = [];
  // 상품 분류
  if (ex.slot && ex.slot !== out.slot) { fixes.push(`분류 ${out.slot}→${ex.slot}`); out.slot = ex.slot; }
  if (ex.name && ex.name !== out.name) { fixes.push(`예매자 ${out.name}→${ex.name}`); out.name = ex.name; }
  if (ex.phone) {
    const mine = digits(out.phone);
    if (ex.phone.length >= 10) { if (ex.phone !== mine) { fixes.push(`전화번호 ${out.phone}→${fmtPhone(ex.phone)}`); out.phone = fmtPhone(ex.phone); } }
    else if (!mine.endsWith(ex.phone.slice(-4))) fixes.push(`전화번호 뒷자리가 엑셀(…${ex.phone.slice(-4)})과 다름`); // 엑셀은 앞자리가 가려져 있어 고칠 수 없음
  }
  // 인원: 엑셀 수량 열 기준, 수량 열이 없으면 결제금액으로 계산 (조합이 하나일 때만)
  const p = prices[slotDay(out.slot) || state.dayType];
  let a = ex.adult, s = ex.student;
  if (a == null && ex.paid) { const sols = solveCancel(ex.paid, p); if (sols.length === 1) ({ a, s } = sols[0]); }
  if (a != null && (a !== out.adult || s !== out.student)) {
    if (a !== out.adult) fixes.push(`성인 ${out.adult}→${a}`);
    if (s !== out.student) fixes.push(`학생 ${out.student}→${s}`);
    if (a + s !== out.adult + out.student) fixes.push(`합계 ${out.adult + out.student}→${a + s}`);
    out.adult = out.origAdult = a; out.student = out.origStudent = s;
  }
  // 실방문자(대리예약): 성함과 전화번호 끝 4자리. 엑셀 전화번호는 앞자리가 가려져 있어 끝 4자리로 비교
  if (ex.hasVisitorCol) {
    const m = String(out.note || '').match(/^([^()]*)\(([^)]*)\)/);
    const myName = (m ? m[1] : String(out.note || '')).trim(), myLast4 = digits(m ? m[2] : '').slice(-4);
    const exProxy = ex.vName && ex.vName !== ex.name; // 방문자가 예매자 본인이면 대리예약 아님
    const exLast4 = digits(ex.vPhoneRaw).slice(-4);
    const exNote = exProxy ? (exLast4 && digits(ex.vPhoneRaw).length >= 10 ? `${ex.vName}(${fmtPhone(ex.vPhoneRaw)})` : `${ex.vName}(${ex.vPhoneRaw || ''})`) : '';
    if (!exProxy && myName) { fixes.push(`실방문자 ${out.note}→없음`); out.note = ''; }
    else if (exProxy && !myName) { fixes.push(`실방문자 없음→${ex.vName}`); out.note = exNote; }
    else if (exProxy) {
      if (myName !== ex.vName) { fixes.push(`실방문자 ${myName}→${ex.vName}`); out.note = `${ex.vName}(${m ? m[2] : ex.vPhoneRaw})`; }
      if (exLast4 && myLast4 !== exLast4) fixes.push(`실방문자 전화번호 끝자리가 엑셀(…${exLast4})과 다름`);
    }
  }
  // 금액 점검: 인원 × 관람권 가격이 엑셀 결제금액과 다르면 알려 줌 (고치지는 않음)
  if (a != null && ex.paid && a * p.adult + s * p.student !== ex.paid) fixes.push(`금액 확인 필요 (엑셀 ${won(ex.paid)}원 / 인원×가격 ${won(a * p.adult + s * p.student)}원)`);
  return fixes;
}

// 1단계(텍스트 정리)로 돌아가기
$('btnManual').onclick = () => { go(1); window.scrollTo(0, 0); $('inAll').focus(); toast('네이버 예약 텍스트를 붙여넣어 명단을 만들어 주세요'); };
// 텍스트 명단 → 최종 인원: 엑셀이 있으면 엑셀의 환불을 반영, 없으면 명단 그대로(직접 고침)
$('text2final').onclick = () => {
  if (!state.rows.length) { toast('먼저 텍스트를 붙여넣어 정리해 주세요'); return; }
  state.source = 'text'; state.finalEdits = {};
  state.manual = !body2.length;
  computeFinal(); renderSrc2();
  go(2); window.scrollTo(0, 0);   // 2단계 엑셀로 확인 (2026-11-24 · 4단계 흐름)
  toast(body2.length ? '엑셀의 환불을 반영했습니다 · 최종 인원을 확인해 주세요' : '네이버 엑셀을 넣어 환불을 확인해 주세요 (엑셀이 없으면 표를 직접 고침)');
};

/* ---------- 최종 인원 (1단계 명단 + 환불 결과) ---------- */
function computeFinal(){
  const src = state.rows;
  const refunds = state.manual ? [] : state.refunds; // 오류 모드면 환불 반영 없이 1단계 표 그대로
  const matched = new Map(); // 환불 index → 맞춰진 최종 행
  // 1단계에서 확인된 예약만 검증: 전액환불(이미 취소된 예약)은 보지 않고 부분취소만 반영
  const usable = (f, i) => !matched.has(i) && f.kind === 'partial';
  const hasBookingCol = refunds.some(f => f.bookingNo);
  state.final = src.map(r => {
    const out = { ...r, origAdult: r.adult, origStudent: r.student, status: 'ok', memo: '' };
    const pd = digits(r.phone), bn = digits(r.bookingNo);
    // 엑셀 기준 점검 (부분취소 계산 전에 원래 인원부터 바로잡음)
    const ex = !state.manual && bn && state.excel?.get(bn);
    if (ex) { const fixes = checkAgainstExcel(out, ex); if (fixes.length) out.inputErr = fixes; }
    let ri;
    if (bn && hasBookingCol) {
      // 예매번호가 양쪽에 있으면 예매번호로만 맞춤 (이름이 같은 다른 예약과 섞이지 않도록)
      ri = refunds.findIndex((f, i) => usable(f, i) && f.bookingNo === bn);
    } else {
      ri = refunds.findIndex((f, i) => usable(f, i) && pd && digits(f.phone) === pd);
      if (ri < 0) ri = refunds.findIndex((f, i) => usable(f, i) && f.name && f.name === r.name);
    }
    if (ri >= 0) matched.set(ri, out);
    return out;
  });
  refunds.forEach((f, i) => resolveRefund(f, matched.get(i)));
  for (const [i, out] of matched) {
    const f = refunds[i];
    if (f.kind === 'full') { out.status = 'full'; out.adult = 0; out.student = 0; out.memo = '전액환불'; continue; }
    if (!f.sols.length) { out.status = 'warn'; out.memo = '환불금액에 맞는 인원 조합 없음'; continue; }
    const s = f.sols[f.solIdx];
    out.adult -= s.a; out.student -= s.s;
    out.status = f.sols.length > 1 ? 'warn' : 'partial';
    out.memo = changeText(out.origAdult, out.origStudent, s);
    if (f.sols.length > 1) out.refIdx = i; // 가능한 조합이 여러 개면 표에서 고르게 함
  }
  // 최종 인원 표에서 직접 고친 값은 다시 계산해도 유지
  state.final.forEach((out, i) => { if (state.finalEdits[i]) { Object.assign(out, state.finalEdits[i]); out.edited = true; } });
  state.unmatched = refunds.filter((_, i) => !matched.has(i));
  renderFinal();
}

const COLS3 = [['slot','분류'],['name','예매자'],['phone','전화번호'],['adult','성인'],['student','학생']];
function renderFinal(){
  const refunds = state.refunds, unmatched = state.manual ? [] : (state.unmatched || []);
  if (!state.rows.length) {
    $('res3').style.display = '';
    $('stat3').innerHTML = ''; $('tbl3').innerHTML = '<div class="empty">명단이 비어 있습니다. 1단계에서 텍스트로 명단을 만들거나 네이버 예약자관리 엑셀을 넣어 주세요.</div>';
    $('unmatched3').innerHTML = ''; $('out3').value = '';
    return;
  }
  $('res3').style.display = '';
  const live = state.final.filter(r => r.status !== 'full');
  const sum = (rows, k) => rows.reduce((s,r)=>s+r[k],0);
  // 1단계와 같이 09~18 → 13~18 순서, 작업 날짜 요금의 두 관람권은 0명이어도 표시
  const dayName = state.dayType === 'weekend' ? '주말/공휴일' : '평일';
  const slots = [...new Set([`네이버 ${dayName} 관람(09:00~18:00)`, `네이버 ${dayName} 관람(13:00~18:00)`, ...live.map(r => r.slot)])]
    .sort((a, b) => (slotPart(a) === 'am' ? 0 : 1) - (slotPart(b) === 'am' ? 0 : 1));
  const bySlot = s => live.filter(r => r.slot === s);
  // 관람권별 방문 인원(합계 + 성인·학생)과 전체 총 방문 인원. 관람권 칸을 누르면 그 관람권만 보기 (총 방문 인원 = 전체)
  if (state.filter3 && !slots.includes(state.filter3)) state.filter3 = null;
  const box = (key, label, value) => {
    const on = key === null ? !state.filter3 : state.filter3 === key;
    return `<button type="button" class="stat" data-slot3="${esc(key ?? '')}" style="cursor:pointer;text-align:left;font:inherit;color:inherit;border:2px solid ${on ? 'var(--accent)' : 'transparent'}"><b>${value}</b><span>${label}</span></button>`;
  };
  $('stat3').innerHTML = [
    ...slots.map(s => { const n = sum(bySlot(s),'adult') + sum(bySlot(s),'student'), cap = capacity[slotPart(s)];
      return box(s, `${slotShort(s, slots)} · 성인 ${sum(bySlot(s),'adult')} / 학생 ${sum(bySlot(s),'student')}`, n > cap ? `<span style="color:var(--bad)">${n}명 · 최대 ${cap}명 초과</span>` : `${n}명`); }),
    box(null, `총 방문 인원 · 성인 ${sum(live,'adult')} / 학생 ${sum(live,'student')}`, sum(live,'adult') + sum(live,'student') + '명'),
    `<div class="stat"><b>${state.final.filter(r=>r.status==='partial'||r.status==='warn').length}건</b><span>부분취소 반영</span></div>`,
    `<div class="stat"><b style="color:var(--bad)">${state.final.filter(r=>r.inputErr).length}건</b><span>입력오류 (엑셀 기준 점검)</span></div>`,
  ].join('');
  $('stat3').querySelectorAll('[data-slot3]').forEach(b => b.onclick = () => {
    const k = b.dataset.slot3 || null;
    state.filter3 = (k === null || state.filter3 === k) ? null : k;
    renderFinal();
  });
  // 표에 보일 행: 전액환불 제외 → 관람권 필터 → 인원 정렬 (i는 state.final의 원래 위치)
  // 기본 순서(정렬 버튼을 안 눌렀을 때): 부분취소 → 확인 필요 → 미환불, 같은 상태끼리는 입력 순서
  // 입력오류가 있는 줄을 가장 위에, 그다음 부분취소 → 확인 필요 → 미환불
  const statusRank = { partial: 0, warn: 1, ok: 2 };
  const rank = r => (r.inputErr ? 0 : 1) * 10 + (statusRank[r.status] ?? 3);
  const base = state.final.map((r, i) => ({ r, i })).filter(({ r }) => r.status !== 'full' && (!state.filter3 || r.slot === state.filter3))
    .sort((a, b) => rank(a.r) - rank(b.r));
  const view = sortRows(base, state.sort3, x => x.r);
  const tag = { ok:['미환불','ok'], full:['제외','bad'], partial:['부분취소','yellow'], warn:['확인 필요','bad'] };
  const cell = (r, i, k) => `<td contenteditable data-i="${i}" data-k="${k}" class="${k==='adult'||k==='student'?'num':''}">${esc(r[k])}</td>`;
  $('tbl3').innerHTML = (state.manual
      ? `<p class="hint" style="margin:10px 0 0"><span class="tag bad">텍스트 명단 그대로</span> 엑셀 없이 텍스트로 정리한 명단을 그대로 불러왔습니다. 환불·취소 인원을 표에서 직접 고쳐 주세요. 엑셀을 넣으면 환불이 자동으로 반영됩니다.</p>`
      : `<p class="hint" style="margin:10px 0 0">표의 칸은 클릭해서 바로 고칠 수 있고, 고친 내용은 3단계 일괄등록에 반영됩니다.</p>`) + `
    <div class="tbl-wrap"><table><thead><tr>${COLS3.map(([k, l]) => `<th class="${k==='adult'||k==='student'?'num':''}">${l}${SORT_KEYS.includes(k) ? sortBtn(state.sort3, k) : ''}</th>`).join('')}<th class="num">합계${sortBtn(state.sort3, 'total')}</th><th>실방문자</th><th>상태</th></tr></thead><tbody>${
    view.length ? view.map(({ r, i }) => `<tr>${COLS3.map(([k]) => cell(r, i, k)).join('')}
      <td class="num">${r.adult + r.student}</td>${cell(r, i, 'note')}
      <td>${r.inputErr ? `<span class="tag bad">입력오류</span> <span class="hint" style="color:var(--bad)">엑셀 기준 수정: ${esc(r.inputErr.join(', '))}</span><br>` : ''}<span class="tag ${tag[r.status][1]}">${tag[r.status][0]}</span> ${r.refIdx !== undefined && !r.edited
        ? `<select data-sol="${r.refIdx}">${refunds[r.refIdx].sols.map((s,j) => `<option value="${j}" ${refunds[r.refIdx].solIdx===j?'selected':''}>${changeText(r.origAdult, r.origStudent, s)}</option>`).join('')}</select>`
        : `<span class="hint">${esc([r.memo, r.edited ? '직접 수정함' : ''].filter(Boolean).join(' · '))}</span>`}</td></tr>`).join('')
      : `<tr><td colspan="9" class="empty">이 관람권 예약이 없습니다.</td></tr>`
  }</tbody></table></div>`;
  $('tbl3').querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { state.sort3 = nextSort(state.sort3, b.dataset.sort); renderFinal(); });
  $('tbl3').querySelectorAll('select[data-sol]').forEach(s => s.onchange = () => {
    refunds[s.dataset.sol].solIdx = Number(s.value);
    computeFinal();
  });
  $('tbl3').querySelectorAll('td[contenteditable]').forEach(td => td.onblur = () => {
    const i = Number(td.dataset.i), k = td.dataset.k, r = state.final[i];
    const v = (k === 'adult' || k === 'student') ? num(td.textContent) : td.textContent.trim();
    if (v === r[k]) return;
    r[k] = v; r.edited = true;
    (state.finalEdits[i] ||= {})[k] = v;
    renderFinal();
  });
  // 1단계 명단에 없는 예약의 환불은 관심 대상이 아니므로 따로 표시하지 않음
  $('unmatched3').innerHTML = '';
  $('out3').value = toLines([['분류','예매자','전화번호','성인수','학생수','실방문자']].concat(view.map(({ r }) => [r.slot, r.name, r.phone, r.adult, r.student, r.note])), ',');
}

/* ---------- 3단계: 일괄등록 (분류·인원이 같은 예약끼리 한 칸) ---------- */
// 칸마다 복사 버튼을 누른 횟수 (분류|성인|학생 기준이라 탭을 다시 열어도 유지)
const copyCount = key => {
  const c = (state.copies || {})[key] || 0;
  return `<span class="copycnt" style="font-size:14px;font-weight:${c ? 700 : 400};color:${c ? 'var(--accent)' : 'var(--muted)'}">${c ? `복사 ${c}회` : '아직 복사 안 함'}</span>`;
};
function renderBulk(){
  // 2단계 최종 인원을 그대로 사용
  const src = state.final.filter(r => r.status !== 'full' && r.adult + r.student > 0);
  if (!src.length) {
    $('stat4').innerHTML = '';
    $('groups4').innerHTML = '<div class="card"><div class="empty">최종 인원이 없습니다. 1 · 2단계에서 최종 인원을 먼저 만들어 주세요.</div></div>';
    return;
  }
  // 대리예약(실방문자가 있는 예약)은 따로 입력하므로 일괄등록 칸에서 뺌
  // 대리예약도 일괄등록 칸에 예매자 이름·번호로 함께 넣고, 아래 표에서 따로 확인해 나중에 고침
  const proxies = src.filter(r => String(r.note || '').trim());
  const groups = new Map();
  for (const r of src) {
    const key = `${r.slot}|${r.adult}|${r.student}`;
    if (!groups.has(key)) groups.set(key, { key, slot: r.slot, adult: r.adult, student: r.student, rows: [] });
    groups.get(key).rows.push([r.name, fmtPhone(r.phone)]);
  }
  const list = [...groups.values()].sort((a, b) => String(a.slot).localeCompare(String(b.slot), 'ko') || a.adult - b.adult || a.student - b.student);
  $('stat4').innerHTML = '';

  // 1열 오전권(09:00 시작), 2열 오후권(13:00 시작)
  let n = 0;
  // 칸 제목은 핵심인 인원·건수를 크게. 분류명은 같은 열에 평일·주말이 섞였을 때만 작게 표시
  const box = (g, showSlot) => { const i = n++; return `
    <div class="card">
      <div style="font-size:17px;font-weight:700;margin:0 0 8px">${[g.adult ? `성인 ${g.adult}` : '', g.student ? `학생 ${g.student}` : ''].filter(Boolean).join(' · ')} <span style="color:var(--accent)">· ${g.rows.length}건</span></div>
      ${showSlot ? `<p class="hint" style="margin:-4px 0 8px">${esc(g.slot)}</p>` : ''}
      <textarea class="out" id="bulk${i}" readonly style="min-height:${Math.min(60 + g.rows.length * 20, 240)}px">${esc(toLines(g.rows, ','))}</textarea>
      <div class="row" style="margin-bottom:0;align-items:center"><button class="btn ghost" data-copy="bulk${i}" data-ckey="${esc(g.key)}">복사</button>${copyCount(g.key)}</div>
    </div>`; };
  // 열 제목 옆 인원: 그 관람권의 전체 방문 인원 (대리예약 포함)
  const count = part => {
    const rs = src.filter(r => slotPart(r.slot) === part), a = rs.reduce((s, r) => s + r.adult, 0), st = rs.reduce((s, r) => s + r.student, 0);
    return `<span class="hint" style="font-weight:400">(성인 ${a}명, 학생 ${st}명, 총 ${a + st}명)</span>`;
  };
  const col = (title, part) => {
    const gs = list.filter(g => slotPart(g.slot) === part);
    const mixed = new Set(gs.map(g => g.slot)).size > 1;
    return `<div><h3 style="margin:0 0 10px">${title} ${count(part)}</h3>${gs.length ? gs.map(g => box(g, mixed)).join('') : '<div class="card"><div class="empty">없음</div></div>'}</div>`;
  };
  $('groups4').innerHTML = `<div class="grid2">${col('오전권', 'am')}${col('오후권', 'pm')}</div>` +
    (proxies.length ? `<div class="card">
      <h2>대리예약 · 별도입력</h2>
      <p class="hint">위 일괄등록 명단에는 예매자 이름·번호로 들어가 있습니다. 실방문자는 이 표를 보고 나중에 찾아서 넣어 주세요.</p>
      <div class="tbl-wrap"><table><thead><tr><th>#</th>${COLS1.map(([k, l]) => `<th class="${k==='adult'||k==='student'?'num':''}">${l}</th>`).join('')}</tr></thead><tbody>${
        proxies.map((r, i) => `<tr><td>${i + 1}</td>${COLS1.map(([k]) => `<td class="${k==='adult'||k==='student'?'num':''}">${esc(r[k])}</td>`).join('')}</tr>`).join('')
      }</tbody></table></div></div>` : '');
}
/* ---------- 4단계: 최종검토 (일괄등록 누락 확인용 체크) ---------- */
// 체크 상태는 예매번호(없으면 이름+전화번호)로 기억해서 2단계를 다시 계산해도 유지
const reviewKey = r => r.bookingNo || `${r.name}|${digits(r.phone)}`;
function renderReview(){
  const src = state.final.filter(r => r.status !== 'full' && r.adult + r.student > 0);
  if (!src.length) {
    $('stat5').innerHTML = '';
    $('tbl5').innerHTML = '<div class="empty">최종 인원이 없습니다. 1 · 2단계에서 최종 인원을 먼저 만들어 주세요.</div>';
    $('checkAll5').disabled = true;
    return;
  }
  state.checks ||= {};
  const done = src.filter(r => state.checks[reviewKey(r)]);
  const people = rows => rows.reduce((s, r) => s + r.adult + r.student, 0);
  // 오전권 / 오후권 / 전체 버튼: 누르면 그 관람권만 보면서 따로 체크 (각 버튼에 등록 진행 상황 표시)
  const isDone = r => !!state.checks[reviewKey(r)];
  // 건수가 아니라 인원(명) 기준으로 표시 (1단계 네모칸처럼 성인/학생도 함께)
  const partBtn = (key, label) => {
    const rs = key ? src.filter(r => slotPart(r.slot) === key) : src;
    const total = people(rs), done = people(rs.filter(isDone)), left = total - done;
    const a = rs.reduce((s, r) => s + r.adult, 0), st = rs.reduce((s, r) => s + r.student, 0);
    const on = (state.filter5 || null) === key;
    return `<button type="button" class="stat" data-part5="${key || ''}" style="cursor:pointer;text-align:left;font:inherit;color:inherit;min-width:170px;border:2px solid ${on ? 'var(--accent)' : 'transparent'}">
      <b>${label} · ${total}명</b><span>성인 ${a} / 학생 ${st}<br>등록 ${done}명 · 미등록 <b style="display:inline;font-size:inherit;color:${left ? 'var(--bad)' : 'var(--ok)'}">${left}</b>명</span></button>`;
  };
  const view = state.filter5 ? src.filter(r => slotPart(r.slot) === state.filter5) : src;
  $('stat5').innerHTML = partBtn('am', '오전권') + partBtn('pm', '오후권') + partBtn(null, '전체');
  $('stat5').querySelectorAll('[data-part5]').forEach(b => b.onclick = () => { state.filter5 = b.dataset.part5 || null; renderReview(); });
  // 기본은 성인수 오름차순. 예매자·성인수·학생수 버튼으로 바꿀 수 있음
  if (state.sort5 === undefined) state.sort5 = { k: 'adult', dir: 'asc' };
  const rows = sortRows($('onlyTodo5').checked ? view.filter(r => !isDone(r)) : view, state.sort5);
  $('tbl5').innerHTML = rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>#</th>${COLS1.map(([k, l]) => `<th class="${k==='adult'||k==='student'?'num':''}">${l}${SORT_KEYS.includes(k) ? sortBtn(state.sort5, k) : ''}</th>`).join('')}<th style="text-align:center">등록</th></tr></thead><tbody>${
    rows.map((r, i) => { const on = !!state.checks[reviewKey(r)]; return `<tr style="${on ? 'opacity:.55' : ''}"><td>${i + 1}</td>${COLS1.map(([k]) => `<td class="${k==='adult'||k==='student'?'num':''}">${esc(r[k])}</td>`).join('')}
      <td style="text-align:center"><input type="checkbox" data-key="${esc(reviewKey(r))}" ${on ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer"></td></tr>`; }).join('')
  }</tbody></table></div>` : '<div class="empty">미등록 예약이 없습니다. 모두 등록되었습니다.</div>';
  $('tbl5').querySelectorAll('input[data-key]').forEach(c => c.onchange = () => { state.checks[c.dataset.key] = c.checked; renderReview(); });
  $('tbl5').querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { state.sort5 = nextSort(state.sort5, b.dataset.sort); renderReview(); });
  // 전체 등록: 지금 보고 있는 관람권(오전권/오후권/전체)의 예약을 한 번에 체크. 모두 체크돼 있으면 전체 해제
  const partName = state.filter5 === 'am' ? '오전권 ' : state.filter5 === 'pm' ? '오후권 ' : '';
  const allDone = view.length > 0 && view.every(isDone);
  $('checkAll5').textContent = allDone ? `${partName}전체 해제` : `${partName}전체 등록`;
  $('checkAll5').className = allDone ? 'btn ghost' : 'btn';
  $('checkAll5').disabled = !view.length;
  $('checkAll5').onclick = () => { for (const r of view) state.checks[reviewKey(r)] = !allDone; renderReview(); };
}
$('onlyTodo5').onchange = renderReview;

document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => b.dataset.go === '4' ? goStep3() : (go(b.dataset.go), window.scrollTo(0, 0)));

/* ---------- 관람권별 최대 인원 (기본 오전권·오후권 각 50명, 바꾸면 이 컴퓨터의 기본값이 됨) ---------- */
const CAP_KEY = 'sayuwon.capacity', DEFAULT_CAP = { am: 50, pm: 50 };
let capacity = (() => { try { const c = JSON.parse(localStorage.getItem(CAP_KEY)); if (c?.am > 0 && c?.pm > 0) return c; } catch {} return { ...DEFAULT_CAP }; })();
function saveCapacity(next){
  capacity = next;
  try { localStorage.setItem(CAP_KEY, JSON.stringify(capacity)); } catch {}
  renderCap();
  if (state.final.length) renderFinal();
}
function renderCap(){ document.querySelectorAll('[data-cap]').forEach(i => i.value = capacity[i.dataset.cap]); }
renderCap();
$('btnCap').onclick = () => { const box = $('cap2'), open = box.style.display === 'none'; box.style.display = open ? '' : 'none'; if (!open) renderCap(); };
$('capSave').onclick = () => {
  const next = { am: num(document.querySelector('[data-cap="am"]').value), pm: num(document.querySelector('[data-cap="pm"]').value) };
  if (!(next.am > 0 && next.pm > 0)) { toast('최대 인원을 1명 이상으로 입력해 주세요'); return; }
  if (next.am === capacity.am && next.pm === capacity.pm) return;
  askConfirm(`정말 변경하시겠습니까?\n\n오전권 ${capacity.am}명 → ${next.am}명\n오후권 ${capacity.pm}명 → ${next.pm}명\n\n저장하면 앞으로 이 인원이 기본값이 됩니다.`, '변경')
    .then(ok => { if (ok) { saveCapacity(next); toast('최대 인원을 저장했습니다'); } else renderCap(); });
};
// 2단계 최종 인원의 오전권·오후권 합계 (전액환불 제외)
function partTotals(){
  const t = { am: 0, pm: 0 };
  for (const r of state.final) if (r.status !== 'full') t[slotPart(r.slot)] += r.adult + r.student;
  return t;
}
const PART_NAME = { am: '오전권', pm: '오후권' };

// 3단계로 갈 때 최대 인원 초과 점검
function goStep3(){
  const t = partTotals(), over = ['am', 'pm'].filter(p => state.final.length && t[p] > capacity[p]);
  if (!over.length) { go(4); window.scrollTo(0, 0); return; }
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">
    <p style="margin:0 0 6px;font-weight:700;color:var(--bad)">최대 인원을 넘었습니다</p>
    <p style="margin:0 0 14px">${over.map(p => `${PART_NAME[p]} 최종 인원 <b>${t[p]}명</b> (최대 ${capacity[p]}명)`).join('<br>')}<br><br>인원 입력이 잘못된 것인지 확인해 주세요.</p>
    <div data-step="cap" style="display:none;margin:0 0 14px">
      ${['am', 'pm'].map(p => `<label class="chk" style="margin-right:12px">${PART_NAME[p]} <input type="number" min="1" data-newcap="${p}" value="${Math.max(capacity[p], t[p])}" style="width:80px">명</label>`).join('')}
    </div>
    <div class="row" style="justify-content:flex-end;margin:0">
      <button class="btn ghost" data-a="check">오류 점검</button><button class="btn" data-a="cap">최대 인원 수정</button>
    </div></div>`;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  wrap.onclick = e => {
    if (e.target === wrap) return close();
    const a = e.target.dataset?.a;
    if (a === 'check') {
      // 2단계 표에서 직접 고치도록: 넘은 관람권만 보이게 하고 표로 이동
      close(); go(2);
      const slot = state.final.find(r => r.status !== 'full' && slotPart(r.slot) === over[0])?.slot;
      if (slot) { state.filter3 = slot; renderFinal(); }
      $('res3').scrollIntoView({ behavior: 'smooth' });
      toast(`${PART_NAME[over[0]]} 인원을 표에서 확인하고 고친 뒤 [저장하기]를 눌러 주세요`);
    } else if (a === 'cap') {
      const step = wrap.querySelector('[data-step="cap"]');
      if (step.style.display === 'none') { // 처음 누르면 입력칸을 보여 주고, 다시 누르면 저장 후 3단계로
        step.style.display = ''; e.target.textContent = '저장하고 3단계로'; step.querySelector('input').focus(); return;
      }
      const next = { am: num(wrap.querySelector('[data-newcap="am"]').value), pm: num(wrap.querySelector('[data-newcap="pm"]').value) };
      if (!(next.am > 0 && next.pm > 0)) { toast('최대 인원을 1명 이상으로 입력해 주세요'); return; }
      close(); saveCapacity(next); toast('최대 인원을 저장했습니다');
      go(4); window.scrollTo(0, 0);
    }
  };
  document.addEventListener('keydown', onKey);
  document.body.appendChild(wrap);
}

/* 저장하기: 고치던 칸을 확정하고(blur) 다시 계산해 다음 단계로 넘김. 칸을 고치면 바로 반영되는 기존 동작은 그대로 */
// 포커스가 빠지지 않아 반영이 안 된 칸이 있을 수 있으므로, 표의 모든 칸 글자를 직접 읽어서 반영
const cellValue = td => (td.dataset.k === 'adult' || td.dataset.k === 'student') ? num(td.textContent) : td.textContent.trim();
$('save1').onclick = () => {
  const rows = $('tbl1')._rows || [];
  $('tbl1').querySelectorAll('td[contenteditable]').forEach(td => { const r = rows[td.dataset.i]; if (r) r[td.dataset.k] = cellValue(td); });
  render1();
  toast(body2.length || state.manual ? '저장했습니다 · 2단계에 반영됨' : '저장했습니다');
};
$('save3').onclick = () => {
  $('tbl3').querySelectorAll('td[contenteditable]').forEach(td => {
    const i = Number(td.dataset.i), k = td.dataset.k, r = state.final[i], v = cellValue(td);
    if (r && v !== r[k]) { r[k] = v; r.edited = true; (state.finalEdits[i] ||= {})[k] = v; }
  });
  renderFinal();
  toast('저장했습니다 · 3·4단계에 반영됨');
};

/* ---------- 버튼 설명 말풍선 (마우스를 올리면 바로 표시) ---------- */
const TIPS = {
  btnReset: '입력한 텍스트·엑셀·결과를 모두 지우고 처음부터 시작',
  todayBack: '작업 날짜를 오늘로 되돌리기',
  btnParse: '붙여넣은 텍스트를 다시 정리 (붙여넣으면 자동으로 정리됨)',
  btnCheck: '엑셀을 다시 읽어 최종 인원 계산',
  btnManual: '1단계로 돌아가 네이버 예약 텍스트로 명단 만들기',
  btnColmap: '엑셀에서 어떤 열을 쓸지 직접 고르기',
  btnPrices: '관람권 가격 칸 열기/닫기',
  save1: '표에서 고친 내용을 저장 (최종 인원에 반영)',
  save3: '표에서 고친 내용을 저장하고 3·4단계에 반영',
  priceSave: '바꾼 가격을 저장 (앞으로 기본값이 됨)',
  priceReset: '처음 가격(50,000 / 45,000 / 69,000 / 62,000)으로 되돌리기',
  btnCap: '오전권·오후권 최대 인원 칸 열기/닫기',
  capSave: '바꾼 최대 인원을 저장 (앞으로 기본값이 됨)',
};
function tipFor(el){
  if (el.closest('#s5')) return ''; // 4단계는 말풍선 없이 버튼 모양(마우스 올림 효과)만
  if (el.id && TIPS[el.id]) return TIPS[el.id];
  const d = el.dataset;
  if (d.s) return { 1: '1단계 · 네이버 예약 텍스트로 명단 만들기', 2: '2단계 · 네이버 엑셀로 확인 → 최종 인원', 4: '3단계 · 일괄등록 명단', 5: '4단계 · 등록 누락 확인' }[d.s];
  if (d.go) return '다음 단계로 이동';
  if (d.copy) return '아래 내용을 클립보드에 복사';
  if (d.sort) return d.sort === 'name' ? '누를 때마다 ▲ 가나다순 → ▼ 가나다 역순 → ↕ 원래 순서' : '누를 때마다 ▲ 적은 인원부터 → ▼ 많은 인원부터 → ↕ 원래 순서';
  if (d.slot !== undefined || d.slot3 !== undefined) return (d.slot === '전체' || d.slot3 === '') ? '전체 예약 보기' : '이 관람권 예약만 보기 (다시 누르면 전체)';
  if (d.sol) return '환불금액에 맞는 인원 조합 중 실제 취소된 것을 고르기';
  if (el.id === 'drop2') return '클릭하거나 끌어다 놓아 엑셀 파일 넣기';
  if (el.matches('td[contenteditable]')) return '클릭해서 직접 고치기';
  return '';
}
const tipEl = Object.assign(document.createElement('div'), { id: 'tip' });
document.body.appendChild(tipEl);
const TIP_TARGETS = 'button, .drop, select[data-sol], input[data-key], td[contenteditable]';
document.addEventListener('mouseover', e => {
  const el = e.target.closest?.(TIP_TARGETS);
  const text = el && tipFor(el);
  if (!text) { tipEl.classList.remove('on'); return; }
  tipEl.textContent = text;
  const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let top = r.bottom + 6; if (top + h > innerHeight - 4) top = r.top - h - 6; // 아래 공간이 없으면 위에
  tipEl.style.top = top + 'px';
  tipEl.style.left = Math.max(4, Math.min(innerWidth - w - 4, r.left + r.width / 2 - w / 2)) + 'px';
  tipEl.classList.add('on');
});
document.addEventListener('mouseout', e => { if (!e.relatedTarget?.closest?.(TIP_TARGETS)) tipEl.classList.remove('on'); });
document.addEventListener('scroll', () => tipEl.classList.remove('on'), true);
