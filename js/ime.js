// ===== 칸별 한글/영어 입력 (단체 · 개인고객 공통) =====

// ===================== 칸별 한글/영어 입력 (견적서 사이트 방식) =====================
// data-ime="ko" (단체명·담당자 성함·영업 담당): 칸에 들어가면 항상 한글부터. 컴퓨터 입력기가 영문이어도 두벌식으로 조합.
//   한/영 키 · Shift+Space · 위쪽 한/A 버튼으로 영어 ↔ 한글
// data-ime="en" (이메일): 항상 영어. 입력기가 한글이어도 누른 자판 글자로 바꿔 넣음
(function(){
  let on = true;
  const MAP = { q:"ㅂ", w:"ㅈ", e:"ㄷ", r:"ㄱ", t:"ㅅ", y:"ㅛ", u:"ㅕ", i:"ㅑ", o:"ㅐ", p:"ㅔ",
                a:"ㅁ", s:"ㄴ", d:"ㅇ", f:"ㄹ", g:"ㅎ", h:"ㅗ", j:"ㅓ", k:"ㅏ", l:"ㅣ",
                z:"ㅋ", x:"ㅌ", c:"ㅊ", v:"ㅍ", b:"ㅠ", n:"ㅜ", m:"ㅡ",
                Q:"ㅃ", W:"ㅉ", E:"ㄸ", R:"ㄲ", T:"ㅆ", O:"ㅒ", P:"ㅖ" };
  const REV = {}; Object.keys(MAP).forEach(k=>{ if(!REV[MAP[k]] || k===k.toLowerCase()) REV[MAP[k]]=k; });
  Object.assign(REV,{ "ㅃ":"Q","ㅉ":"W","ㄸ":"E","ㄲ":"R","ㅆ":"T","ㅒ":"O","ㅖ":"P" });
  const btn = document.getElementById('ko-toggle');
  const mode = el => el && el.dataset ? el.dataset.ime : '';
  function paintBtn(){ btn.textContent = on ? '한' : 'A'; btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on?'true':'false');
    btn.title = on ? '한글 입력 중 (단체명·담당자 성함) · 한/영 키나 Shift+Space로 영어' : '영어 입력 중 · 한/영 키나 Shift+Space로 한글'; }
  function setOn(v){ on=v; comp=null; enQ=[]; paintBtn(); }
  btn.addEventListener('click', ()=>{ setOn(!on); const a=document.activeElement; if(mode(a)==='ko') a.focus(); });
  paintBtn();
  const effOn = el => mode(el)==='ko' ? on : false;   // 이메일은 늘 영어
  function isHanYoung(e){ return e.key==='HangulMode' || e.code==='Lang1' || e.keyCode===21; }
  function put(el,start,end,text){ const v=el.value; el.value=v.slice(0,start)+text+v.slice(end); const c=start+text.length; el.setSelectionRange(c,c); el.dispatchEvent(new Event('input',{bubbles:true})); return c; }
  // 남은 한글을 자판 글자로 (이메일 안전장치)
  const toKeys = s => window.Hangul ? Hangul.disassemble(s).map(j=>REV[j]||j).join('') : s;

  let comp=null, enQ=[], enEl=null, enStart=null, osKo=null;
  document.addEventListener('focusin', e=>{ comp=null; if(mode(e.target)==='ko') setOn(true); });   // 단체명·성함은 들어갈 때마다 한글부터
  document.addEventListener('mousedown', ()=>{ comp=null; });
  document.addEventListener('keydown', e=>{
    const ime = e.isComposing || e.key==='Process' || e.keyCode===229;
    const el = e.target, m = mode(el);
    if(isHanYoung(e) || (ime && (e.code==='Lang1' || e.code==='AltRight'))){ if(m!=='en') setOn(!on); if(osKo!==null) osKo=!osKo; return; }
    if(m!=='ko' && m!=='en') return;
    if(m==='ko' && e.key===' ' && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey){ e.preventDefault(); setOn(!on); return; }
    if(e.ctrlKey || e.altKey || e.metaKey){ comp=null; return; }
    if(/^Key[A-Z]$/.test(e.code)){ if(m==='ko' && osKo!==null && ime!==osKo) setOn(!on); osKo=ime; }
    if(!effOn(el)){   // 영어인데 입력기가 한글: 누른 자판을 기억하고 조합을 바로 끝냄
      if(ime && /^Key[A-Z]$/.test(e.code)){
        const ch=e.code.slice(3), upper = e.shiftKey !== (e.getModifierState && e.getModifierState('CapsLock'));
        enQ.push(upper?ch:ch.toLowerCase()); enEl=el;
        setTimeout(()=>{ if(document.activeElement===el){ el.blur(); el.focus(); } },0);
      }
      return;
    }
    if(!window.Hangul || ime){ if(e.key!=='Shift') comp=null; return; }   // 한글 + 입력기 한글: 그대로
    const live = comp && comp.el===el && el.selectionStart===comp.end && el.selectionEnd===comp.end;
    if(/^[a-zA-Z]$/.test(e.key)){
      const j=(e.shiftKey && MAP[e.key.toUpperCase()]) || MAP[e.key.toLowerCase()];
      e.preventDefault();
      if(!live) comp={el, start:el.selectionStart, end:el.selectionEnd, jamo:[]};
      comp.jamo.push(j);
      const text=Hangul.assemble(comp.jamo);
      comp.end=put(el,comp.start,comp.end,text);
      if(text.length>2){ const n=text.length-2; comp.start+=n; comp.jamo=Hangul.disassemble(text.slice(n)); }
      return;
    }
    if(e.key==='Backspace' && live && comp.jamo.length){ e.preventDefault(); comp.jamo.pop(); comp.end=put(el,comp.start,comp.end,Hangul.assemble(comp.jamo)); if(!comp.jamo.length) comp=null; return; }
    if(e.key!=='Shift') comp=null;
  }, true);
  document.addEventListener('compositionstart', e=>{ if(!effOn(e.target) && mode(e.target)) enStart=e.target.selectionStart; }, true);
  document.addEventListener('compositionend', e=>{
    const el=e.target; if(effOn(el) || !mode(el)) return;
    const data=e.data||'', start=enStart;
    if(el===enEl && enQ.length){
      const n = window.Hangul ? Hangul.disassemble(data).length : data.length;
      const letters = enQ.splice(0, n||enQ.length).join('');
      setTimeout(()=>{ if(start==null || el.value.slice(start,start+data.length)!==data) return; put(el,start,start+data.length,letters); },0);
    } else if(mode(el)==='en'){
      setTimeout(()=>{ if(/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(el.value)){ const c=el.selectionStart; el.value=toKeys(el.value); el.setSelectionRange(c,c); el.dispatchEvent(new Event('input',{bubbles:true})); } },0);
    }
  }, true);
  // 이메일: 붙여넣기 등으로 한글이 들어오면 자판 글자로
  document.addEventListener('input', e=>{ const el=e.target; if(mode(el)==='en' && !e.isComposing && /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(el.value)){ el.value=toKeys(el.value); el.dispatchEvent(new Event('input',{bubbles:true})); } }, true);
})();
