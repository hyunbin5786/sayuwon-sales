// ===== 네이버 예약자관리 엑셀 읽기 (예약 현황 공유 · 2026-11-19) =====
// 네이버 이관(naver.html) 2단계와 같은 방식: 비밀번호 걸린 .xlsx 를 이 브라우저 안에서 풀고(어디에도 올리지 않음)
//  - 예약마다 이용일 · 상품(오전권 · 오후권) · 성인/학생 수량 · 실결제금액 · 환불금액
//  - 환불금액 = 실결제금액 → 전액환불(0명) · 일부만 환불 → 「성인취소×성인가 + 학생취소×학생가 = 환불금액」 조합으로 인원을 뺌
//  - 관람권 가격은 네이버 이관 화면에서 저장한 값(sayuwon.prices), 없으면 기본값
window.NaverXL = (function(){
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const concatBytes = (...arrs) => { const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };
  const u32le = n => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
  const hashOf = (alg, data) => crypto.subtle.digest(alg, data).then(b => new Uint8Array(b));
  const fitLen = (h, n, pad = 0x36) => { const out = new Uint8Array(n).fill(pad); out.set(h.slice(0, n)); return out; };
  async function aesCbcRaw(keyBytes, iv, data){
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['encrypt', 'decrypt']);
    const last = data.slice(data.length - 16);
    const padBlock = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv: last }, key, new Uint8Array(16).fill(16))).slice(0, 16);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, concatBytes(data, padBlock)));
  }
  async function decrypt(bytes, password){
    const cfb = XLSX.CFB.read(bytes, { type: 'array' });
    const info = XLSX.CFB.find(cfb, 'EncryptionInfo')?.content, pkg = XLSX.CFB.find(cfb, 'EncryptedPackage')?.content;
    if (!info || !pkg) throw new Error('암호화된 엑셀 형식이 아닙니다');
    if (!(info[0] === 4 && info[2] === 4)) throw new Error('지원하지 않는 암호화 방식입니다');
    const xml = new DOMParser().parseFromString(new TextDecoder().decode(new Uint8Array(info).slice(8)), 'application/xml');
    const kd = xml.getElementsByTagName('keyData')[0], ek = [...xml.getElementsByTagName('*')].find(e => e.localName === 'encryptedKey');
    const alg = a => ({ SHA512: 'SHA-512', SHA384: 'SHA-384', SHA256: 'SHA-256', SHA1: 'SHA-1' })[a.getAttribute('hashAlgorithm')];
    const hAlg = alg(ek), keyLen = Number(ek.getAttribute('keyBits')) / 8, spin = Number(ek.getAttribute('spinCount'));
    const pwBytes = new Uint8Array(password.length * 2);
    for (let i = 0; i < password.length; i++) { const c = password.charCodeAt(i); pwBytes[i*2] = c & 255; pwBytes[i*2+1] = c >> 8; }
    let h = await hashOf(hAlg, concatBytes(b64(ek.getAttribute('saltValue')), pwBytes));
    for (let i = 0; i < spin; i++) h = await hashOf(hAlg, concatBytes(u32le(i), h));
    const blockKey = async bk => fitLen(await hashOf(hAlg, concatBytes(h, new Uint8Array(bk))), keyLen);
    const pwSalt = b64(ek.getAttribute('saltValue'));
    const vIn = (await aesCbcRaw(await blockKey([0xfe,0xa7,0xd2,0x76,0x3b,0x4b,0x9e,0x79]), pwSalt, b64(ek.getAttribute('encryptedVerifierHashInput')))).slice(0, 16);
    const vHash = await aesCbcRaw(await blockKey([0xd7,0xaa,0x0f,0x6d,0x30,0x61,0x34,0x4e]), pwSalt, b64(ek.getAttribute('encryptedVerifierHashValue')));
    const expect = await hashOf(hAlg, vIn);
    if (expect.some((b, i) => b !== vHash[i])) throw new Error('엑셀 비밀번호가 맞지 않습니다');
    const secret = (await aesCbcRaw(await blockKey([0x14,0x6e,0x0b,0xe7,0xab,0xac,0xd0,0xd6]), pwSalt, b64(ek.getAttribute('encryptedKeyValue')))).slice(0, Number(kd.getAttribute('keyBits')) / 8);
    const data = new Uint8Array(pkg), size = data[0] | data[1] << 8 | data[2] << 16 | data[3] * 16777216;
    const kdSalt = b64(kd.getAttribute('saltValue')), kdAlg = alg(kd), parts = [];
    for (let off = 8, seg = 0; off < data.length; off += 4096, seg++) {
      const iv = fitLen(await hashOf(kdAlg, concatBytes(kdSalt, u32le(seg))), 16);
      parts.push(await aesCbcRaw(secret, iv, data.slice(off, Math.min(off + 4096, data.length))));
    }
    return concatBytes(...parts).slice(0, size);
  }
  const isEncrypted = bytes => { try { return !!XLSX.CFB.find(XLSX.CFB.read(bytes, { type: 'array' }), 'EncryptedPackage'); } catch { return false; } };

  // ---------- 날짜 · 가격 ----------
  const num = v => { const n = Number(String(v ?? '').replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; };
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function parseDate(v){
    if (v instanceof Date && !isNaN(v)) return v;
    const m = String(v).match(/(\d{4}|\d{2})[.\-\/년]\s*(\d{1,2})[.\-\/월]\s*(\d{1,2})/);
    if (m) return new Date(Number(m[1].length === 2 ? '20' + m[1] : m[1]), Number(m[2]) - 1, Number(m[3]));
    return null;
  }
  // 공휴일 (naver.html 과 같은 목록 · 해마다 추가)
  const HOLIDAYS = ['2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-02','2026-05-05','2026-05-25','2026-06-03','2026-08-17','2026-09-24','2026-09-25','2026-10-05','2026-10-09','2026-12-25'];
  const dayOf = date => { const d = new Date(date + 'T00:00'); return HOLIDAYS.includes(date) || d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : 'weekday'; };
  const DEFAULT_PRICES = { weekday: { adult: 50000, student: 45000 }, weekend: { adult: 69000, student: 62000 } };
  const prices = () => { try { const p = JSON.parse(localStorage.getItem('sayuwon.prices')); if (p?.weekday?.adult && p?.weekend?.adult) return p; } catch {} return DEFAULT_PRICES; };
  function solveCancel(refund, p, maxA = Infinity, maxS = Infinity){
    const out = [];
    if (!p.adult || !p.student) return out;
    for (let a = 0; a * p.adult <= refund && a <= maxA; a++) { const rest = refund - a * p.adult; if (rest % p.student === 0 && rest / p.student <= maxS) out.push({ a, s: rest / p.student }); }
    return out;
  }
  // 상품 → 오전 · 오후 (시작 시각 12시 전이면 오전), 평일 · 주말
  const partOf = t => { const m = String(t).match(/(\d{1,2}):\d{2}/); return m ? (Number(m[1]) < 12 ? 'am' : 'pm') : /오후/.test(t) ? 'pm' : 'am'; };
  const dayOfTicket = t => /주말|공휴/.test(t) ? 'weekend' : /평일/.test(t) ? 'weekday' : null;

  // ---------- 엑셀 → 날짜마다 오전 · 오후 인원 ----------
  const COLS = { booking: [/예약\s*번호|예매\s*번호|주문\s*번호/, '예약번호'], name: [/예약자|예매자|이름|성명/, '예매자'], paid: [/실\s*결제|결제\s*금액|결제액/, '실결제금액'],
    refund: [/환불\s*금액|환불액|환불/, '환불금액'], date: [/이용\s*일|방문\s*일|관람\s*일|이용\s*일시|예약\s*일시|날짜/, '이용일'], ticket: [/상품|관람권|옵션|권종/, '상품'], status: [/상태/, '예약상태'] };
  function detect(header){
    const map = {};
    for (const [k, [re, exactName]] of Object.entries(COLS)) {
      const exact = header.findIndex(h => h === exactName); if (exact >= 0) { map[k] = exact; continue; }
      let idx = header.findIndex(h => re.test(h));
      if (k === 'paid' && idx >= 0 && /환불/.test(header[idx])) idx = header.findIndex(h => re.test(h) && !/환불/.test(h));
      map[k] = idx;
    }
    return map;
  }
  async function read(file, password){
    let bytes = new Uint8Array(await file.arrayBuffer());
    if (isEncrypted(bytes)) { if (!password) { const e = new Error('네이버 엑셀 비밀번호를 넣어 주세요'); e.code = 'need_pw'; throw e; } bytes = await decrypt(bytes, password); }
    const wb = XLSX.read(bytes, { type: 'array', cellDates: true });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
    const hi = rows.findIndex(r => r.some(c => /환불/.test(c)));
    if (hi < 0) throw new Error('네이버 예약자관리 엑셀이 아닙니다 (「환불금액」 열이 없음)');
    const header = rows[hi].map(h => String(h).trim()), C = detect(header);
    if (C.date < 0) throw new Error('「이용일」 열을 찾지 못했습니다');
    const qtyCols = header.map((h, i) => ({ h, i })).filter(({ h }) => /\((성인|학생)\)\s*$/.test(h));
    const P = prices(), days = {};
    rows.slice(hi + 1).filter(r => r.some(c => String(c).trim())).forEach(r => {
      const d = parseDate(r[C.date]); if (!d) return;
      const date = ymd(d), ticket = C.ticket >= 0 ? String(r[C.ticket] || '') : '', part = partOf(ticket || r[C.date]);
      const p = P[dayOfTicket(ticket) || dayOf(date)];
      const paid = C.paid >= 0 ? num(r[C.paid]) : 0, refund = C.refund >= 0 ? num(r[C.refund]) : 0;
      const D = days[date] ||= { am: 0, pm: 0, n: 0, full: 0, partial: 0, check: [] };
      const who = C.name >= 0 ? String(r[C.name] || '').replace(/\s*대리\s*예약\s*$/, '').trim() : '';
      let a = null, s = null;
      if (qtyCols.length) { a = 0; s = 0; qtyCols.forEach(({ h, i }) => /성인/.test(h) ? a += num(r[i]) : s += num(r[i])); }
      else if (paid) { const sol = solveCancel(paid, p); if (sol.length === 1) ({ a, s } = sol[0]); }
      D.n++;
      if (a == null) { D.check.push(`${who || '예약'}: 인원을 알 수 없음`); return; }
      if (refund > 0 && refund >= paid) { D.full++; return; }   // 전액환불 = 취소
      if (C.status >= 0 && /취소/.test(r[C.status]) && !refund) { D.full++; return; }
      if (refund > 0) {
        const sols = solveCancel(refund, p, a, s);
        if (!sols.length) D.check.push(`${who || '예약'}: 환불금액에 맞는 인원 조합 없음 (그대로 셈)`);
        else { if (sols.length > 1) D.check.push(`${who || '예약'}: 취소 인원 조합이 ${sols.length}가지 (첫 번째로 셈)`); a -= sols[0].a; s -= sols[0].s; D.partial++; }
      }
      D[part] += a + s;
    });
    return days;
  }
  return { read, isEncrypted };
})();
