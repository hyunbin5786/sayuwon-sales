// ===== 네이버 예약 달력 사진 읽기 (예약 현황 공유 · 2026-11-19) =====
// 엑셀이 안 될 때: 네이버 예약 관리의 달력 화면 캡처 → 파란 「확정」 칸을 찾아 숫자를 읽음 (이 브라우저 안에서만, 어디에도 올리지 않음)
//  - 칸 찾기: 파란색 덩어리(확정 상자) → 같은 세로줄 = 같은 날짜, 같은 높이 = 같은 상품(줄)
//  - 숫자 읽기: 상자 오른쪽(흰 글자)만 잘라 글자 읽기(tesseract.js, 숫자만) · 날짜: 상자 위쪽 머리의 「19」 같은 숫자
//  - 읽은 결과는 화면의 확인 표에서 고친 뒤 넣음 (잘못 읽을 수 있으므로)
window.NaverImg = (function(){
  let tessP = null;
  const loadTess = () => tessP ||= new Promise((ok, no) => { if (window.Tesseract) return ok(); const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'; s.onload = ok; s.onerror = () => { tessP = null; no(new Error('글자 읽기 도구를 불러오지 못했습니다 (인터넷 연결 확인)')); }; document.head.appendChild(s); });
  const loadImg = blob => new Promise((ok, no) => { const u = URL.createObjectURL(blob), im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('사진을 열지 못했습니다')); im.src = u; });

  // 파란 「확정」 상자 찾기 (연결된 파란 점 덩어리)
  function findBoxes(img){
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const W = c.width, H = c.height, D = g.getImageData(0, 0, W, H).data;
    const isBlue = p => { const k = p * 4, r = D[k], gg = D[k+1], b = D[k+2]; return b > 190 && r < 130 && b - r > 90 && gg > 100 && gg < 180; };
    const seen = new Uint8Array(W * H), boxes = [];
    for (let p = 0; p < W * H; p++) {
      if (seen[p] || !isBlue(p)) continue;
      let x0 = W, x1 = 0, y0 = H, y1 = 0, n = 0; const st = [p]; seen[p] = 1;
      while (st.length) { const q = st.pop(), qx = q % W, qy = (q - qx) / W; n++;
        if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
        for (const nq of [q + 1, q - 1, q + W, q - W]) { if (nq < 0 || nq >= W * H || seen[nq]) continue; if (Math.abs((nq % W) - qx) > 1) continue; if (isBlue(nq)) { seen[nq] = 1; st.push(nq); } } }
      if (n > 300 && x1 - x0 > 50 && y1 - y0 > 12) boxes.push({ x0, x1, y0, y1 });
    }
    const mw = boxes.map(b => b.x1 - b.x0).sort((a, b) => a - b)[Math.floor(boxes.length / 2)] || 0;
    return boxes.filter(b => b.x1 - b.x0 >= mw * 0.7);   // 화면 끝에 잘린 상자는 뺌
  }
  // 잘라서 흑백으로 (light = 밝은 글자(상자 안 흰 숫자)를 검게)
  function crop(img, x0, y0, x1, y1, light){
    const S = 3, P = 20, c = document.createElement('canvas'); c.width = (x1 - x0) * S + P * 2; c.height = (y1 - y0) * S + P * 2;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, x0, y0, x1 - x0, y1 - y0, P, P, (x1 - x0) * S, (y1 - y0) * S);
    const d = g.getImageData(P, P, (x1 - x0) * S, (y1 - y0) * S);
    for (let k = 0; k < d.data.length; k += 4) { const r = d.data[k], b = d.data[k+2], lum = (r + d.data[k+1] + b) / 3;
      const ink = light ? (r > 160 && b > 160) : lum < 120; d.data[k] = d.data[k+1] = d.data[k+2] = ink ? 0 : 255; }
    g.putImageData(d, P, P); return c;
  }
  const cluster = (vals, tol) => { const out = []; vals.slice().sort((a, b) => a - b).forEach(v => { const c = out.find(c => Math.abs(c.v - v) <= tol); if (c) { c.n++; c.v += (v - c.v) / c.n; } else out.push({ v, n: 1 }); }); return out.map(c => c.v).sort((a, b) => a - b); };

  // → { days:[19, 20] (못 읽으면 null), grid:[[줄1 날짜1, 줄1 날짜2], …], url }
  async function read(blob, onStep){
    const img = await loadImg(blob), boxes = findBoxes(img);
    if (!boxes.length) throw new Error('파란 「확정」 칸을 찾지 못했습니다. 네이버 예약 달력 화면을 캡처해 주세요.');
    const xs = cluster(boxes.map(b => (b.x0 + b.x1) / 2), 30), ys = cluster(boxes.map(b => (b.y0 + b.y1) / 2), 12);
    onStep && onStep('글자 읽기 도구를 불러오는 중…');
    await loadTess();
    const w = await Tesseract.createWorker('eng'); await w.setParameters({ tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '7' });
    try {
      const grid = ys.map(() => xs.map(() => 0)), days = [];
      let done = 0;
      for (const b of boxes) {
        const ci = xs.findIndex(x => Math.abs(x - (b.x0 + b.x1) / 2) <= 30), ri = ys.findIndex(y => Math.abs(y - (b.y0 + b.y1) / 2) <= 12);
        const r = await w.recognize(crop(img, Math.round(b.x0 + (b.x1 - b.x0) * 0.45), b.y0 + 2, b.x1 - 3, b.y1 - 1, true));
        grid[ri][ci] = parseInt(r.data.text.replace(/\D/g, '')) || 0;
        onStep && onStep(`숫자 읽는 중… ${++done}/${boxes.length}`);
      }
      for (const x of xs) {   // 날짜: 그 세로줄 첫 상자 위쪽 머리 (「19 목」)
        const col = boxes.filter(b => Math.abs((b.x0 + b.x1) / 2 - x) <= 30).sort((a, b) => a.y0 - b.y0)[0];
        const y1 = Math.max(10, col.y0 - 32), y0 = Math.max(0, y1 - 80);
        const r = await w.recognize(crop(img, Math.max(0, col.x0 - 6), y0, Math.min(img.width, col.x0 + 70), y1, false));
        const m = r.data.text.match(/\d{1,2}/); days.push(m && +m[0] >= 1 && +m[0] <= 31 ? +m[0] : null);
      }
      return { days, grid, url: img.src };
    } finally { await w.terminate(); }
  }
  return { read };
})();
