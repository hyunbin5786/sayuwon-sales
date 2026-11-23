// ===== 고객 견적 요청 페이지 (document/request.html · 2026-11-21 · 2026-11-23 요청 선택지 · 서류 종류 · 현장 결제) =====
// 고객님이 로그인 없이 입력 → 공유 기록 서버의 quoteReqAdd 로 한 건 저장 (서버는 목록 · 내용을 돌려주지 않음)
// 직원은 견적서 화면 1단계 「고객 견적 요청」에서 이 기록을 열어 초안으로 채움
//  - 매표소에서 직원이 고객님께 보여 드리는 화면 (고객님이 직접 입력). 서류는 체크한 것만 발급일 칸(견적서 = 방문일 · 거래명세서 = 오늘이 기본) (결제 칸은 없앰 · 직원 화면에서 늘 현장 결제)
//  - 서버에 보내는 칸은 예전 그대로 (org · name · phone · email · date · pax · memo). 2026-11-23에 더한 것(필요한 서류 · 견적서 발급일 · 현장 결제 · 고른 요청 · 체험비 품목)은
//    모두 memo 글자 안에 「[서류] … / [결제] … / [요청] … / [기타] …」 줄로 적어 보냄 → 서버 · DB 는 바꿀 것 없고, 직원 화면의 요청사항에 그대로 보임 (memo 는 1,000자까지)
//  - 체험비 품목 목록 = 견적서 품목 중 단체(시간) · 단체(개별) · 굿즈 (document.js 의 기본 목록 + 품목 관리에서 바꾼 것 · 숨긴 품목은 뺌)
(function(){
  const $ = id => document.getElementById(id), esc = SY.esc;
  const form = $('req-form'), err = $('q-err'), send = $('q-send');
  const won = n => (Math.round(+n || 0)).toLocaleString('ko-KR');

  // 연락처: 치는 동안 - 넣기 (다른 화면 연락처 칸과 같은 방식). 「010-」 이 미리 적혀 있음 (request.html · 2026-11-23) — 누르면 커서가 그 뒤로, 02 · 031 … 을 치면 010 이 떼어짐 (SY.phoneTyping)
  { const p = $('q-phone'), end = () => { if(p.value === '010-') setTimeout(() => p.setSelectionRange(4, 4), 0); };
    if(!p.value){ p.value = '010-'; p.dataset.autop = '1'; }   // 브라우저가 지난 입력을 되살려 비운 경우
    p.addEventListener('focus', end); p.addEventListener('click', end);
    p.addEventListener('blur', () => { if(!p.value.trim()){ p.value = '010-'; p.dataset.autop = '1'; } }); }
  $('q-phone').addEventListener('input', e => { const el=e.target, f=SY.phoneTyping(el, e.inputType); if(f!==el.value) el.value=f; });

  // ---------- 필요한 서류: 견적서 · 거래명세서 (둘 다 고를 수 있음). 체크한 것만 그 발급일 칸이 뜸 (2026-11-23) ----------
  //  기본 발급일: 견적서 = 방문(예정)일 (방문일을 바꾸면 따라감 — 발급일을 직접 고친 뒤에는 그대로) · 거래명세서 = 신청하는 날(오늘)
  let auto = false; const setDate = (id, v) => { auto = true; $(id).value = v; $(id).dispatchEvent(new Event('change')); auto = false; };   // 날짜 칸(datebox)의 글자도 같이 바뀌게
  let issueTouched = false;
  const paintDoc = () => {
    const q = $('q-doc-quote').checked, s = $('q-doc-stmt').checked;
    $('q-issue-wrap').hidden = !q; $('q-sissue-wrap').hidden = !s;
    if(q && !issueTouched && $('q-issue').value !== $('q-date').value) setDate('q-issue', $('q-date').value);
    if(s && !$('q-sissue').value) setDate('q-sissue', SY.ymd(new Date()));
  };
  ['q-doc-quote', 'q-doc-stmt'].forEach(id => $(id).addEventListener('change', paintDoc));
  $('q-issue').addEventListener('input', e => { if(!auto) issueTouched = true; });
  $('q-issue').addEventListener('change', e => { if(!auto) issueTouched = true; });
  $('q-date').addEventListener('change', paintDoc);
  setTimeout(paintDoc, 0);

  // ---------- 요청사항 선택지 ----------
  const EXP = 'q-opt-exp';   // 「식사 / 굿즈 구매 금액은 체험비로 바꿔 주세요」
  const OPTS = [];   // 그 밖의 선택지 [칸 id, 문구] — 2026-11-23에 세 개(세금계산서 · 사업자등록증/통장 사본 · 인원 변경)를 뺌. 다시 넣으려면 여기에 더하고 request.html 에 같은 id 의 체크 칸을
  const paintNote = () => { $('q-note').hidden = !(OPTS.some(([id]) => $(id).checked) || $('q-memo').value.trim()); };
  OPTS.forEach(([id]) => $(id).addEventListener('change', paintNote)); $('q-memo').addEventListener('input', paintNote);

  // ---------- 체험비 품목: 견적서 품목 목록에서 단체(시간) · 단체(개별) · 굿즈 ----------
  let catalog = null, picked = new Set();   // catalog = [{kind:'gtime'|'geach'|'goods', name, price}] · picked = 고른 품목 이름
  const KIND = { gtime: '단체 프로그램 (시간 단위)', geach: '단체 프로그램 (1인 단위)', goods: '굿즈' };
  async function loadCatalog(){
    if(catalog) return catalog;
    const [code, shared] = await Promise.all([fetch('js/document.js?t=' + Date.now()).then(r => r.text()), SY.quote.get().catch(() => null)]);
    const m = code.match(/var CATALOG_RAW = \[([\s\S]*?)\];/); if(!m) throw new Error('품목 목록을 찾지 못함');
    const raw = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
    const list = name => { const mm = code.match(new RegExp('\\[([^\\]]*)\\]\\.forEach\\(function\\(n\\)\\{\\s*' + name + '\\[n\\]')); return mm ? [...mm[1].matchAll(/"([^"]+)"/g)].map(x => x[1]) : []; };
    const ns = s => String(s || '').replace(/\s/g, ''), sets = { gtime: list('GROUP_TIME').map(ns), geach: list('GROUP_EACH').map(ns), goods: list('GOODS').map(ns) };
    const d = (shared && shared.data) || {}, edits = d.edits || {}, out = [], seen = {};
    raw.forEach(line => { const [src, price] = line.split('|'); if(seen[ns(src)]) return; seen[ns(src)] = 1; const e = edits[src] || {}; if(e.hidden) return;
      const kind = e.kind || Object.keys(sets).find(k => sets[k].includes(ns(src))) || ''; if(!KIND[kind]) return;
      out.push({ kind, name: String(e.name || src).replace(/\(수정\)$/, '').trim(), price: e.price != null ? Number(e.price) : (price ? Number(price) : null) }); });
    (d.added || []).forEach(a => { if(a.hidden || !KIND[a.kind]) return; out.push({ kind: a.kind, name: String(a.name || a.src || '').trim(), price: a.price != null ? Number(a.price) : null }); });
    return (catalog = out.filter(x => x.name));
  }
  function paintExpSum(){
    const el = $('q-exp-sum'); el.hidden = !$(EXP).checked;
    el.innerHTML = picked.size ? `고른 품목: <b>${[...picked].map(esc).join(' · ')}</b> <button type="button" class="linkbtn" id="q-exp-edit">품목 다시 고르기</button>`
      : `품목을 고르지 않으셔서 <b>「대관」</b>으로 발급해 드립니다. <button type="button" class="linkbtn" id="q-exp-edit">품목 고르기</button>`;
  }
  async function openExp(){
    const modal = $('exp-modal'), body = $('exp-list'); modal.hidden = false; body.innerHTML = '<p class="hint">품목을 불러오는 중…</p>';
    try { const items = await loadCatalog();
      body.innerHTML = Object.keys(KIND).map(k => { const L = items.filter(x => x.kind === k); if(!L.length) return '';
        return `<div class="exp-group"><div class="exp-kind">${KIND[k]}</div>${L.map(x => `<label class="exp-item"><input type="checkbox" value="${esc(x.name)}"${picked.has(x.name) ? ' checked' : ''}><span class="exp-name">${esc(x.name)}</span><span class="exp-price">${x.price != null ? won(x.price) + '원' : ''}</span></label>`).join('')}</div>`; }).join('')
        || '<p class="hint">지금은 품목을 보여 드릴 수 없습니다. 고르지 않으셔도 「대관」으로 발급해 드립니다.</p>';
    } catch(e){ body.innerHTML = '<p class="hint">품목을 불러오지 못했습니다. 고르지 않으셔도 「대관」으로 발급해 드리며, 원하시는 품목은 아래 「기타 요청」에 적어 주셔도 됩니다.</p>'; }
  }
  const closeExp = save => { if(save) picked = new Set([...document.querySelectorAll('#exp-list input:checked')].map(x => x.value).slice(0, 12)); $('exp-modal').hidden = true; paintExpSum(); };
  $(EXP).addEventListener('change', () => { if($(EXP).checked) openExp(); else { picked = new Set(); paintExpSum(); } });
  $('exp-ok').addEventListener('click', () => closeExp(true));
  $('exp-skip').addEventListener('click', () => { picked = new Set(); closeExp(false); });
  $('exp-modal').addEventListener('mousedown', e => { if(e.target.id === 'exp-modal') closeExp(false); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !$('exp-modal').hidden) closeExp(false); });
  document.addEventListener('click', e => { if(e.target.id === 'q-exp-edit') openExp(); });

  // ---------- 보내기 ----------
  const MSG = {
    need_name: '단체명과 담당자 성함을 적어 주세요.',
    bad_phone: '연락처를 확인해 주세요.',
    bad_email: '이메일 주소를 확인해 주세요.',
    bad_date: '방문(예정)일을 골라 주세요.',
    need_doc: '필요한 서류(견적서 · 거래명세서)를 하나 이상 골라 주세요.',
    need_agree: '개인정보 수집 · 이용에 동의해 주세요.',
    busy: '요청이 많아 잠시 받을 수 없습니다. 잠시 후 다시 보내 주세요.',
    bad_key: '지금은 요청을 받을 수 없습니다. 잠시 후 다시 보내 주세요.',
    bad_action: '지금은 요청을 받을 수 없습니다. 잠시 후 다시 보내 주세요.'
  };
  const showErr = (code, focusId) => { err.textContent = MSG[code] || code; if(focusId){ const el=$(focusId); (el.previousElementSibling && el.previousElementSibling.classList.contains('dtxt') ? el.previousElementSibling : el).focus(); } };
  // 고른 것들을 요청사항 글자로 (직원 화면에 그대로 보임)
  function memoText(){
    const L = [], q = $('q-doc-quote').checked, s = $('q-doc-stmt').checked, issue = $('q-issue').value, sissue = $('q-sissue').value;   // (예약 번호 칸은 2026-11-23에 없앰)
    L.push('[서류] ' + [q ? '견적서' + (issue ? ` (발급일 ${issue})` : '') : '', s ? '거래명세서' + (sissue ? ` (발급일 ${sissue})` : '') : ''].filter(Boolean).join(' · '));
    // (「현장에서 재결제했습니다」 칸은 2026-11-23에 없앰 — 이 요청서로 들어온 요청은 직원 화면에서 늘 현장 결제로 처리)
    if($(EXP).checked) L.push('[요청] 식사 / 굿즈 구매 금액은 체험비로 — ' + (picked.size ? '품목: ' + [...picked].join(', ') : '품목 선택 없음 (대관으로)'));
    OPTS.forEach(([id, t]) => { if($(id).checked) L.push('[요청] ' + t); });
    const etc = $('q-memo').value.trim(); if(etc) L.push('[기타] ' + etc);
    return L.join('\n').slice(0, 1000);
  }

  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    const it = {
      org: $('q-org').value.trim(), name: $('q-name').value.trim(), phone: SY.fmtPhone($('q-phone').value),
      email: $('q-email').value.trim(), date: $('q-date').value, pax: $('q-pax').value.trim(),
      memo: memoText(), agree: $('q-agree').checked, hp: $('q-hp').value
    };
    if(!it.org) return showErr('need_name', 'q-org');
    if(!it.name) return showErr('need_name', 'q-name');
    if(it.phone.replace(/\D/g,'').length < 9) return showErr('bad_phone', 'q-phone');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(it.email)) return showErr('bad_email', 'q-email');
    if(!it.date) return showErr('bad_date', 'q-date');
    if(!$('q-doc-quote').checked && !$('q-doc-stmt').checked) return showErr('need_doc', 'q-doc-quote');
    if(!it.agree) return showErr('need_agree', 'q-agree');
    send.disabled = true; send.textContent = '보내는 중…';
    try{
      const r = await SY.callRaw({ action:'quoteReqAdd', item: it });
      if(!r.ok) throw Object.assign(new Error(r.error), { code: r.error });
      form.hidden = true; $('req-done').hidden = false;
      const docs = [$('q-doc-quote').checked ? '견적서' : '', $('q-doc-stmt').checked ? '거래명세서' : ''].filter(Boolean).join(' · ');
      $('req-done-text').textContent = `${it.org} ${it.name}님, 방문(예정)일 ${SY.dateDisp(it.date)}${it.pax ? ' · ' + it.pax + '명' : ''} ${docs} 요청을 받았습니다. 확인 후 ${it.email} 로 보내 드리겠습니다.`;
      window.scrollTo(0, 0);
    } catch(x){
      err.textContent = MSG[x && x.code] || '보내지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.';
    } finally { send.disabled = false; send.textContent = '요청 보내기'; }
  });
  $('q-again').addEventListener('click', () => {
    ['q-memo', 'q-pax', 'q-date', 'q-issue', 'q-sissue'].forEach(id => { $(id).value = ''; $(id).dispatchEvent(new Event('change')); });
    [EXP, ...OPTS.map(o => o[0]), 'q-doc-stmt', 'q-doc-quote'].forEach(id => { $(id).checked = false; }); picked = new Set(); issueTouched = false;
    paintDoc(); paintExpSum(); paintNote();
    $('req-done').hidden = true; form.hidden = false; $('q-date').previousElementSibling.focus();
  });
})();
