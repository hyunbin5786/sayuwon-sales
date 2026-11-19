// ===== 네이버 예약 달력 사진 읽기 (예약 현황 공유 · 2026-11-19) =====
// 엑셀이 안 될 때: 네이버 예약 관리의 달력 화면 캡처 → 파란 「확정」 칸을 찾아 숫자를 읽음 (이 브라우저 안에서만, 어디에도 올리지 않음)
//  - 줄: 회색 가로선으로 나눔. 첫 가로선 위 = 날짜 머리, 그 아래 칸마다 1번째 줄(전체) · 2번째(오전) · 3번째(오후)
//    (주말처럼 1번째 줄이 비어 있어도 줄 순서가 밀리지 않음)
//  - 세로줄(날짜): 색 있는 상자(예매가능 · 확정)의 가로 위치 · 날짜는 그 세로줄 머리의 「19」 같은 숫자
//  - 숫자 읽기: 파란 상자 오른쪽(흰 글자)만 잘라 글자 읽기(tesseract.js, 숫자만) · 확정 상자가 없는 칸은 0
//  - 읽은 결과는 화면의 확인 표에서 고친 뒤 넣음 (잘못 읽을 수 있으므로)
window.NaverImg = (function(){
  let tessP = null;
  const loadTess = () => tessP ||= new Promise((ok, no) => { if (window.Tesseract) return ok(); const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'; s.onload = ok; s.onerror = () => { tessP = null; no(new Error('글자 읽기 도구를 불러오지 못했습니다 (인터넷 연결 확인)')); }; document.head.appendChild(s); });
  const loadImg = blob => new Promise((ok, no) => { const u = URL.createObjectURL(blob), im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('사진을 열지 못했습니다')); im.src = u; });

  // 사진 분석: 색 상자(파랑 = 확정, 그 밖 = 예매가능 등) · 회색 가로선
  function scan(img){
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const W = c.width, H = c.height, D = g.getImageData(0, 0, W, H).data;
    const isBlue = p => { const k = p * 4, r = D[k], gg = D[k+1], b = D[k+2]; return b > 190 && r < 130 && b - r > 90 && gg > 100 && gg < 180; };
    const isColor = p => { const k = p * 4, r = D[k], gg = D[k+1], b = D[k+2]; return Math.max(r, gg, b) - Math.min(r, gg, b) > 35; };
    const comps = pred => { const seen = new Uint8Array(W * H), out = [];
      for (let p = 0; p < W * H; p++) {
        if (seen[p] || !pred(p)) continue;
        let x0 = W, x1 = 0, y0 = H, y1 = 0, n = 0; const st = [p]; seen[p] = 1;
        while (st.length) { const q = st.pop(), qx = q % W, qy = (q - qx) / W; n++;
          if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
          for (const nq of [q + 1, q - 1, q + W, q - W]) { if (nq < 0 || nq >= W * H || seen[nq]) continue; if (Math.abs((nq % W) - qx) > 1) continue; if (pred(nq)) { seen[nq] = 1; st.push(nq); } } }
        if (n > 300 && x1 - x0 > 50 && y1 - y0 > 12) out.push({ x0, x1, y0, y1 });
      }
      const mw = out.map(b => b.x1 - b.x0).sort((a, b) => a - b)[Math.floor(out.length / 2)] || 0;
      return out.filter(b => b.x1 - b.x0 >= mw * 0.7); };   // 화면 끝에 잘린 상자는 뺌
    const lines = [];   // 회색 가로선 (폭의 절반 이상)
    for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) { const k = (y * W + x) * 4, r = D[k], gg = D[k+1], b = D[k+2]; if (Math.abs(r - gg) < 10 && Math.abs(gg - b) < 10 && r < 236 && r > 150) n++; }
      if (n > W * 0.5 && !(lines.length && y - lines[lines.length - 1] <= 2)) lines.push(y); }
    return { blue: comps(isBlue), all: comps(isColor), lines, W, H };
  }
  // 잘라서 흑백으로 (light = 밝은 글자(상자 안 흰 숫자)를 검게, 아니면 어두운 글자 · 빨간 글자(주말 날짜)를 검게)
  function crop(img, x0, y0, x1, y1, light){
    const S = 3, P = 20, c = document.createElement('canvas'); c.width = (x1 - x0) * S + P * 2; c.height = (y1 - y0) * S + P * 2;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, x0, y0, x1 - x0, y1 - y0, P, P, (x1 - x0) * S, (y1 - y0) * S);
    const d = g.getImageData(P, P, (x1 - x0) * S, (y1 - y0) * S);
    for (let k = 0; k < d.data.length; k += 4) { const r = d.data[k], gg = d.data[k+1], b = d.data[k+2], lum = (r + gg + b) / 3;
      const ink = light ? (r > 160 && b > 160) : (lum < 130 || (r - gg > 70 && r - b > 70)); d.data[k] = d.data[k+1] = d.data[k+2] = ink ? 0 : 255; }
    g.putImageData(d, P, P); return c;
  }
  const cluster = (vals, tol) => { const out = []; vals.slice().sort((a, b) => a - b).forEach(v => { const c = out.find(c => Math.abs(c.v - v) <= tol); if (c) { c.n++; c.v += (v - c.v) / c.n; } else out.push({ v, n: 1 }); }); return out.map(c => c.v).sort((a, b) => a - b); };

  // → { days:[19, 20] (못 읽으면 null), grid:[[1번째 줄 날짜1, 날짜2], [2번째 줄 …], …], url }
  async function read(blob, onStep){
    const img = await loadImg(blob), S = scan(img);
    if (!S.blue.length && !S.all.length) throw new Error('「예매가능 · 확정」 칸을 찾지 못했습니다. 네이버 예약 달력 화면을 캡처해 주세요.');
    const head = S.lines.find(y => S.all.some(b => b.y0 > y)) ?? 0;   // 날짜 머리 아래 첫 가로선
    const rowLines = S.lines.filter(y => y >= head);
    const rowOf = b => { const cy = (b.y0 + b.y1) / 2; if (cy < head) return -1; let i = 0; while (i + 1 < rowLines.length && rowLines[i + 1] < cy) i++; return i; };
    const xs = cluster(S.all.map(b => (b.x0 + b.x1) / 2), 30);
    const nRows = Math.max(3, ...S.all.map(b => rowOf(b) + 1));
    onStep && onStep('글자 읽기 도구를 불러오는 중…');
    await loadTess();
    const w = await Tesseract.createWorker('eng'); await w.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '7' });
    try {
      const grid = Array.from({ length: nRows }, () => xs.map(() => 0)), days = [];
      let done = 0;
      for (const b of S.blue) {
        const ci = xs.findIndex(x => Math.abs(x - (b.x0 + b.x1) / 2) <= 30), ri = rowOf(b); if (ci < 0 || ri < 0) continue;
        const r = await w.recognize(crop(img, Math.round(b.x0 + (b.x1 - b.x0) * 0.45), b.y0 + 2, b.x1 - 3, b.y1 - 1, true));
        grid[ri][ci] = parseInt(r.data.text.replace(/\D/g, '')) || 0;
        onStep && onStep(`숫자 읽는 중… ${++done}/${S.blue.length}`);
      }
      for (const x of xs) {   // 날짜: 그 세로줄 머리 (첫 가로선 위, 「19 목」 · 주말은 빨간 글자)
        const col = S.all.filter(b => Math.abs((b.x0 + b.x1) / 2 - x) <= 30).sort((a, b) => a.x0 - b.x0)[0];
        const y1 = Math.max(12, head || Math.max(12, col.y0 - 32)), y0 = Math.max(0, y1 - 90);
        const r = await w.recognize(crop(img, Math.max(0, col.x0 - 6), y0, Math.min(img.width, col.x0 + 70), y1, false));
        const m = r.data.text.match(/\d{1,2}/); days.push(m && +m[0] >= 1 && +m[0] <= 31 ? +m[0] : null);
      }
      return { days, grid, url: img.src };
    } finally { await w.terminate(); }
  }
  return { read };
})();
