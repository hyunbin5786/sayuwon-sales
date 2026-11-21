// ===== 고객 견적 요청 페이지 (document/request.html · 2026-11-21) =====
// 고객님이 로그인 없이 입력 → 공유 기록 서버(SY.API_URL)의 quoteReqAdd 로 한 건 저장 (서버는 목록 · 내용을 돌려주지 않음)
// 직원은 견적서 화면 1단계 「고객 견적 요청」에서 이 기록을 열어 초안으로 채움
(function(){
  const $ = id => document.getElementById(id);
  const form = $('req-form'), err = $('q-err'), send = $('q-send');
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  $('q-date').min = ymd(new Date());

  // 연락처: 치는 동안 - 넣기 (다른 화면 연락처 칸과 같은 방식)
  $('q-phone').addEventListener('input', e => { const el=e.target, f=SY.phoneTyping(el, e.inputType); if(f!==el.value) el.value=f; });

  const MSG = {
    need_name: '단체명과 담당자 성함을 적어 주세요.',
    bad_phone: '연락처를 확인해 주세요.',
    bad_email: '이메일 주소를 확인해 주세요.',
    bad_date: '방문 희망일을 골라 주세요.',
    need_agree: '개인정보 수집 · 이용에 동의해 주세요.',
    busy: '요청이 많아 잠시 받을 수 없습니다. 잠시 후 다시 보내 주세요.',
    bad_key: '지금은 요청을 받을 수 없습니다. 잠시 후 다시 보내 주세요.',
    bad_action: '지금은 요청을 받을 수 없습니다. 잠시 후 다시 보내 주세요.'
  };
  const showErr = (code, focusId) => { err.textContent = MSG[code] || code; if(focusId){ const el=$(focusId); (el.previousElementSibling && el.previousElementSibling.classList.contains('dtxt') ? el.previousElementSibling : el).focus(); } };

  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    const it = {
      org: $('q-org').value.trim(), name: $('q-name').value.trim(), phone: SY.fmtPhone($('q-phone').value),
      email: $('q-email').value.trim(), date: $('q-date').value, pax: $('q-pax').value.trim(),
      memo: $('q-memo').value.trim(), agree: $('q-agree').checked, hp: $('q-hp').value
    };
    if(!it.org) return showErr('need_name', 'q-org');
    if(!it.name) return showErr('need_name', 'q-name');
    if(it.phone.replace(/\D/g,'').length < 9) return showErr('bad_phone', 'q-phone');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(it.email)) return showErr('bad_email', 'q-email');
    if(!it.date) return showErr('bad_date', 'q-date');
    if(!it.agree) return showErr('need_agree', 'q-agree');
    send.disabled = true; send.textContent = '보내는 중…';
    try{
      const r = await fetch(SY.API_URL, { method:'POST', body: JSON.stringify({ action:'quoteReqAdd', item: it }) }).then(x => x.json());
      if(!r.ok) throw Object.assign(new Error(r.error), { code: r.error });
      form.hidden = true; $('req-done').hidden = false;
      $('req-done-text').textContent = `${it.org} ${it.name}님, 방문 희망일 ${SY.dateDisp(it.date)}${it.pax ? ' · ' + it.pax + '명' : ''} 견적 요청을 받았습니다. 확인 후 ${it.email} 로 견적서를 보내 드리겠습니다.`;
      window.scrollTo(0, 0);
    } catch(x){
      err.textContent = MSG[x && x.code] || '보내지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.';
    } finally { send.disabled = false; send.textContent = '견적 요청 보내기'; }
  });
  $('q-again').addEventListener('click', () => {
    ['q-memo', 'q-pax', 'q-date'].forEach(id => { $(id).value = ''; $(id).dispatchEvent(new Event('change')); });
    $('req-done').hidden = true; form.hidden = false; $('q-date').previousElementSibling.focus();
  });
})();
