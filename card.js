/* 分享卡片（像素風）：用 Canvas 自己畫。標籤太多時，版面會自動往下撐，不會互相壓住。 */
const CARD_W = 1080, CARD_BASE_H = 1550, DIV_Y = 676;
const FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Segoe UI",sans-serif';
const PX = '"Press Start 2P","Courier New","Consolas",monospace';
const CC = { navy: '#0b2a55', blue: '#0a73d6', cyan: '#00a8ff', soft: '#4d6f9c', gold: '#ff9a1f', white: '#ffffff', pale: '#eaf6ff' };

function setFont(ctx, size, weight = 700, family = FONT) { ctx.font = `${weight} ${size}px ${family}`; }

function text(ctx, str, x, y, o = {}) {
  setFont(ctx, o.size || 28, o.weight || (o.px ? 400 : 700), o.px ? PX : FONT);
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(str, x + (o.sx || 3), y + (o.sy || 3)); }
  ctx.fillStyle = o.color || CC.navy;
  ctx.fillText(str, x, y);
}

function fitSize(ctx, str, maxW, start, min, weight = 800, px = false) {
  let s = start;
  while (s > min) { setFont(ctx, s, weight, px ? PX : FONT); if (ctx.measureText(str).width <= maxW) break; s -= 2; }
  return s;
}

/* 像素方框：四個角缺一格，像 8-bit 遊戲的視窗 */
function pixelPath(ctx, x, y, w, h, n) {
  ctx.beginPath();
  ctx.moveTo(x + n, y); ctx.lineTo(x + w - n, y); ctx.lineTo(x + w - n, y + n); ctx.lineTo(x + w, y + n);
  ctx.lineTo(x + w, y + h - n); ctx.lineTo(x + w - n, y + h - n); ctx.lineTo(x + w - n, y + h); ctx.lineTo(x + n, y + h);
  ctx.lineTo(x + n, y + h - n); ctx.lineTo(x, y + h - n); ctx.lineTo(x, y + n); ctx.lineTo(x + n, y + n); ctx.closePath();
}
function pixelFrame(ctx, x, y, w, h, o = {}) {
  const n = o.notch || 8, bw = o.bw || 6;
  if (o.shadow) { pixelPath(ctx, x + 8, y + 8, w, h, n); ctx.fillStyle = o.shadow; ctx.fill(); }
  pixelPath(ctx, x, y, w, h, n);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  ctx.strokeStyle = o.border || CC.navy; ctx.lineWidth = bw; ctx.lineJoin = 'miter'; ctx.stroke();
}

/* 標籤的寬度（含前綴：prefix 會在左邊畫一小塊深色的分類字樣，例如「技能」） */
function badgeWidth(ctx, label, o = {}) {
  const size = o.size || 24;
  setFont(ctx, size, 800);
  let w = Math.ceil(ctx.measureText(label).width + 36);
  if (o.prefix) { setFont(ctx, size - 4, 800); w += Math.ceil(ctx.measureText(o.prefix).width + 22); }
  return w;
}
function pixelBadge(ctx, x, y, label, o = {}) {
  const size = o.size || 24, h = 44;
  const w = badgeWidth(ctx, label, o);
  pixelFrame(ctx, x, y, w, h, { fill: o.fill || CC.white, border: o.border || CC.navy, bw: 4, notch: 6, shadow: o.noShadow ? null : 'rgba(11,42,85,.25)' });
  let lx = x;
  if (o.prefix) {
    setFont(ctx, size - 4, 800);
    const pw = Math.ceil(ctx.measureText(o.prefix).width + 22);
    ctx.fillStyle = o.pfill || CC.navy; ctx.fillRect(x + 4, y + 4, pw - 4, h - 8);
    text(ctx, o.prefix, x + 4 + (pw - 4) / 2, y + h / 2 + 1, { size: size - 4, color: CC.white, base: 'middle', align: 'center', weight: 800 });
    lx = x + pw;
  }
  text(ctx, label, lx + (w - (lx - x)) / 2, y + h / 2 + 1, { size, color: o.color || CC.navy, base: 'middle', align: 'center', weight: 800 });
  return w;
}

/* 標籤流：會自動換行，回傳最後一行的底部 */
function flowBadges(ctx, items, startX, startY, minX, maxX, step) {
  let x = startX, y = startY;
  items.forEach((it) => {
    const w = badgeWidth(ctx, it.label, it);
    if (x + w > maxX) { x = minX; y += step; }
    it.w = pixelBadge(ctx, x, y, it.label, it);
    x += it.w + 14;
  });
  return y + 44;
}

function drawRadar(ctx, cx, cy, r, stats) {
  const n = AX.length;
  const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * r * (v / 100), cy + Math.sin(a) * r * (v / 100)]; };
  [20, 40, 60, 80, 100].forEach((lv) => {
    ctx.beginPath();
    AX.forEach((_, i) => { const [x, y] = pt(i, lv); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.strokeStyle = lv === 100 ? CC.navy : 'rgba(11,42,85,.28)';
    ctx.lineWidth = lv === 100 ? 5 : 2; ctx.setLineDash(lv === 100 ? [] : [6, 6]); ctx.lineJoin = 'miter'; ctx.stroke(); ctx.setLineDash([]);
  });
  /* 70 ＝ 層級平均，用較明顯的藍色虛線標出 */
  ctx.beginPath();
  AX.forEach((_, i) => { const [x, y] = pt(i, 70); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.closePath(); ctx.strokeStyle = 'rgba(10,115,214,.75)'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.stroke(); ctx.setLineDash([]);
  AX.forEach((_, i) => { const [x, y] = pt(i, 100); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.strokeStyle = 'rgba(11,42,85,.25)'; ctx.lineWidth = 2; ctx.stroke(); });
  text(ctx, '70', cx + 8, cy - r * 0.7 + 22, { size: 14, color: CC.soft, px: true });

  const pot = AX.map((x) => (stats.potential[x.k] !== undefined ? stats.potential[x.k] : stats.axes[x.k]));
  ctx.beginPath(); pot.forEach((v, i) => { const [x, y] = pt(i, v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
  ctx.strokeStyle = CC.gold; ctx.lineWidth = 5; ctx.setLineDash([12, 8]); ctx.stroke(); ctx.setLineDash([]);

  ctx.beginPath(); AX.forEach((x, i) => { const [px, py] = pt(i, stats.axes[x.k]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath();
  ctx.fillStyle = 'rgba(0,168,255,.45)'; ctx.fill();
  ctx.strokeStyle = CC.blue; ctx.lineWidth = 6; ctx.lineJoin = 'miter'; ctx.stroke();
  AX.forEach((x, i) => { const [px, py] = pt(i, stats.axes[x.k]); ctx.fillStyle = CC.white; ctx.fillRect(px - 9, py - 9, 18, 18); ctx.strokeStyle = CC.navy; ctx.lineWidth = 4; ctx.strokeRect(px - 9, py - 9, 18, 18); });
  AX.forEach((x, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const lx = cx + Math.cos(a) * (r + 30), ly = cy + Math.sin(a) * (r + 30);
    const align = Math.abs(Math.cos(a)) < 0.2 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right';
    const dy = Math.sin(a) < -0.5 ? -22 : Math.sin(a) > 0.5 ? 34 : 6;
    text(ctx, x.zh, lx, ly + dy, { size: 28, align });
    text(ctx, x.en, lx, ly + dy + 22, { size: 11, align, color: CC.soft, px: true });
  });
}

function drawBg(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#f0f9ff'); bg.addColorStop(0.5, '#cfe8ff'); bg.addColorStop(1, '#a9d3fb');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(10,115,214,.08)'; ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  /* 像素星星 */
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 40; i++) { const x = (i * 197) % W, y = (i * 331) % H; ctx.fillRect(x - (x % 6), y - (y % 6), 6, 6); }
}

/* 把照片用 cover 方式裁進方框（偏向上方，通常臉在上面） */
function drawPhotoCover(ctx, img, x, y, w, h, bias = 0.3) {
  const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x - (dw - w) / 2, y - (dh - h) * bias, dw, dh);
}
/* 小頭像框：疊在像素角色展示框的右上角 */
function drawAvatar(ctx, img, x, y, s) {
  pixelFrame(ctx, x, y, s, s, { fill: CC.white, border: CC.navy, bw: 6, notch: 8, shadow: 'rgba(11,42,85,.35)' });
  ctx.save(); pixelPath(ctx, x + 4, y + 4, s - 8, s - 8, 6); ctx.clip();
  drawPhotoCover(ctx, img, x + 4, y + 4, s - 8, s - 8, 0.25);
  ctx.restore();
  pixelFrame(ctx, x, y, s, s, { border: CC.navy, bw: 6, notch: 8 });
}

/* 左上到右側的英雄區；回傳下緣 y。畫在暫時的畫布上也能量出高度。 */
function drawHero(ctx, R, ch) {
  const { st, stats, an, tags } = R;
  const W = CARD_W, rx = 490, maxX = W - 70;
  const lvl = LEVELS[st.level];

  /* 左：像素球員的展示框 */
  const px = 70, py = 130, pw = 380, ph = 470;
  pixelFrame(ctx, px, py, pw, ph, { fill: '#9fd2ff', border: CC.navy, bw: 8, notch: 14, shadow: 'rgba(11,42,85,.3)' });
  ctx.save(); pixelPath(ctx, px, py, pw, ph, 14); ctx.clip();
  const g = ctx.createLinearGradient(px, py, px, py + ph);
  g.addColorStop(0, '#bfe3ff'); g.addColorStop(0.72, '#7fc0f5'); g.addColorStop(0.72, '#c98a4a'); g.addColorStop(1, '#a8703a');
  ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let x = px + 40; x < px + pw; x += 90) ctx.fillRect(x, py + 60 + ((x / 90) % 3) * 34, 54, 12);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(px, py + ph * 0.72 + 14, pw, 4);
  /* 版面：像素角色＋頭像（預設）／只放像素角色／只放大頭照；沒有照片就只放像素角色 */
  const photo = R.photo, mode = st.photoMode || 'both';
  if (photo && mode === 'photo') drawPhotoCover(ctx, photo, px, py, pw, ph, 0.3);
  else drawPlayer(ctx, px + (pw - GW * 7) / 2, py + ph - GH * 7 - 6, 7, ch, st.jersey, 0.15);
  ctx.restore();
  pixelFrame(ctx, px, py, pw, ph, { border: CC.navy, bw: 8, notch: 14 });
  if (photo && mode === 'both') drawAvatar(ctx, photo, px + pw - 104 - 14, py + 14, 104);
  if (st.jersey) pixelBadge(ctx, px + 18, py + ph - 66, '#' + st.jersey, { fill: CC.navy, color: CC.white, border: CC.white, size: 26, noShadow: true });

  /* 右：層級（有趣標籤改放在下方的藍色區塊） */
  text(ctx, lvl.en, rx, 158, { size: 14, color: CC.soft, px: true });
  text(ctx, lvl.name, rx, 204, { size: 32, color: CC.blue, weight: 800 });
  const nameY = 292;

  const name = (st.name || 'PLAYER').toUpperCase();
  const ns = fitSize(ctx, name, maxX - rx, 76, 34);
  text(ctx, name, rx, nameY, { size: ns, weight: 800, shadow: 'rgba(0,168,255,.35)' });
  const sub = [(Array.isArray(st.pos) ? st.pos : st.pos ? [st.pos] : []).map((p) => POS_NAME[p]).join('／') || POS_NAME[''], { R: '右手', L: '左手', B: '雙手皆可' }[st.hand], st.height ? st.height + ' cm' : ''].filter(Boolean).join('  ·  ');
  text(ctx, sub, rx, nameY + 44, { size: 26, color: CC.soft });

  /* OVR 與等級 */
  text(ctx, 'OVR', rx, nameY + 100, { size: 18, color: CC.soft, px: true });
  setFont(ctx, 110, 400, PX);
  text(ctx, String(stats.ovr), rx, nameY + 215, { size: 110, color: CC.blue, px: true, shadow: CC.navy, sx: 6, sy: 6 });
  const gx = maxX - 190, gy = nameY + 70;
  pixelFrame(ctx, gx, gy, 190, 170, { fill: CC.gold, border: CC.navy, bw: 6, notch: 12, shadow: 'rgba(11,42,85,.3)' });
  text(ctx, 'GRADE', gx + 95, gy + 38, { size: 12, color: CC.white, px: true, align: 'center' });
  text(ctx, stats.grade, gx + 95, gy + 128, { size: 76, color: CC.white, px: true, align: 'center', shadow: CC.navy, sx: 5, sy: 5 });

/* 三種外觀：稱號＝藍色實心；有趣標籤＝深藍實心加「#」；技能＝白底藍框加「技能」字樣，另起一行 */
  const titles = [
    ...an.arch.map((a) => ({ label: a.name, fill: CC.blue, color: CC.white })),
    ...(st.tags || []).slice(0, 3).map((t) => ({ label: '#' + t, fill: CC.navy, color: CC.white, border: CC.navy }))
  ];
  let bottom = flowBadges(ctx, titles, rx, nameY + 252, rx, maxX, 56);
  const skills = (st.habits || []).slice(0, 4).map((h) => ({ label: h.replace('／', '/') + ((st.habitGrades || {})[h] ? ' ' + st.habitGrades[h] : ''), prefix: '技能', fill: CC.white, color: CC.navy, border: CC.blue, pfill: CC.blue }));
  if (skills.length) bottom = flowBadges(ctx, skills, rx, bottom + 14, rx, maxX, 56);
  return Math.max(py + ph, bottom);
}

function drawCard(canvas, R, ch) {
  const W = CARD_W;
  /* 先在暫時畫布量出英雄區高度，決定下方整體要往下推多少 */
  const probe = document.createElement('canvas'); probe.width = W; probe.height = 2400;
  const heroBottom = drawHero(probe.getContext('2d'), R, ch);
  const dy = Math.max(0, heroBottom + 34 - DIV_Y);
  /* 風格面板如果同時有「招牌技能加成」與「扣將對照」兩行，卡片再加高一行 */
  const m0 = R.an.matches[0];
  const preLines = (R.an.dunkMode ? 1 : 0) + (m0.boost && m0.boost.length ? 1 : 0);
  const H = CARD_BASE_H + dy + (preLines > 1 ? 28 : 0);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const { st, stats, an } = R;
  const lvl = LEVELS[st.level];

  drawBg(ctx, W, H);
  pixelFrame(ctx, 24, 24, W - 48, H - 48, { fill: 'rgba(255,255,255,.35)', border: CC.navy, bw: 8, notch: 20 });
  pixelPath(ctx, 40, 40, W - 80, H - 80, 14); ctx.strokeStyle = 'rgba(11,42,85,.35)'; ctx.lineWidth = 3; ctx.stroke();

  text(ctx, '◆ HOOP RATING', 70, 92, { size: 22, color: CC.blue, px: true });
  const d = new Date();
  text(ctx, `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`, W - 70, 92, { size: 16, color: CC.soft, px: true, align: 'right' });

  drawHero(ctx, R, ch);

  ctx.save(); ctx.translate(0, dy);
  ctx.fillStyle = CC.navy; ctx.fillRect(70, DIV_Y - 4, W - 140, 6);

  text(ctx, '70 ＝ ' + lvl.name + '平均', 70, DIV_Y + 36, { size: 19, color: CC.soft, weight: 600 });
  drawRadar(ctx, 335, DIV_Y + 257, 150, stats);
  text(ctx, '橘色虛線 ＝ 潛力', 70, DIV_Y + 484, { size: 19, color: CC.gold, weight: 700 });

  /* 能力條：像素分格 */
  const bx = 620, bw = W - 70 - bx, barW = bw - 96, segN = 20, gap = 3, segW = (barW - (segN - 1) * gap) / segN;
  AX.forEach((x, i) => {
    const y = DIV_Y + 48 + i * 66, v = stats.axes[x.k];
    text(ctx, x.zh, bx, y + 24, { size: 28 });
    text(ctx, x.en, bx + 124, y + 22, { size: 10, color: CC.soft, px: true });
    text(ctx, String(v), bx + bw, y + 30, { size: 30, align: 'right', color: v >= 85 ? CC.gold : CC.navy, px: true, shadow: v >= 85 ? CC.navy : null, sx: 3, sy: 3 });
    const on = Math.round((v / 99) * segN);
    for (let k = 0; k < segN; k++) {
      ctx.fillStyle = k < on ? (k > 16 ? CC.gold : k > 13 ? CC.cyan : CC.blue) : 'rgba(11,42,85,.15)';
      ctx.fillRect(bx + k * (segW + gap), y + 38, segW, 16);
    }
    if (stats.potential[x.k] !== undefined) {
      const mx = bx + barW * (stats.potential[x.k] / 99);
      ctx.fillStyle = CC.gold; ctx.fillRect(mx - 3, y + 30, 6, 6); ctx.fillRect(mx - 6, y + 36, 12, 4); ctx.fillRect(mx - 3, y + 40, 6, 6);
      ctx.fillStyle = CC.navy; ctx.fillRect(mx - 1, y + 36, 2, 4);
    }
  });
  text(ctx, '▮ 能力值　◆ 潛力（籃板、防守）', bx, DIV_Y + 462, { size: 19, color: CC.soft, weight: 600 });

  /* 一句話總評 */
  pixelFrame(ctx, 70, DIV_Y + 506, W - 140, 76, { fill: CC.navy, border: CC.navy, bw: 4, notch: 10, shadow: 'rgba(11,42,85,.3)' });
  const vs = fitSize(ctx, an.verdict, W - 300, 38, 22);
  text(ctx, '★ ' + an.verdict + ' ★', W / 2, DIV_Y + 556, { size: vs, color: CC.white, align: 'center', weight: 800 });

  /* 風格對照與熱區 */
  const by = DIV_Y + 612, m = an.matches[0];
  const dkLine = an.dunkMode ? (an.matches.find((x) => x.dk && x !== m) || (m.dk ? m : null)) : null;
  const boostLine = m.boost && m.boost.length ? `招牌技能加成：${m.boost.join('、')}` : '';
  const extraLines = (dkLine ? 1 : 0) + (boostLine ? 1 : 0);
  const PH = 132 + 28 * Math.max(1, extraLines);
  pixelFrame(ctx, 70, by, 640, PH, { fill: m.t.goat ? '#fff3d6' : 'rgba(255,255,255,.75)', border: m.t.goat ? CC.gold : CC.navy, bw: 5, notch: 10, shadow: 'rgba(11,42,85,.25)' });
  text(ctx, 'STYLE MATCH', 96, by + 38, { size: 12, color: CC.soft, px: true });
  text(ctx, '風格對照', 250, by + 38, { size: 18, color: CC.soft, weight: 700 });
  if (m.t.goat) {
    text(ctx, 'G.O.A.T.', 96, by + 92, { size: 38, color: CC.gold, px: true, shadow: CC.navy, sx: 4, sy: 4 });
    const gs = fitSize(ctx, m.t.tag, 590, 26, 16);
    text(ctx, m.t.tag, 96, by + 132, { size: gs, weight: 800 });
  } else {
    const mn = fitSize(ctx, m.t.n, m.sub ? 440 : 590, 46, 26);
    text(ctx, m.t.n, 96, by + 86, { size: mn, weight: 800, color: CC.blue });
    if (m.sub) { /* 揭曉的小字，例如「罰球之神」 */
      setFont(ctx, mn, 800);
      const nw = ctx.measureText(m.t.n).width;
      text(ctx, m.sub, 96 + nw + 14, by + 86, { size: 22, weight: 800, color: CC.gold, shadow: CC.navy, sx: 2, sy: 2 });
    }
    text(ctx, `${m.t.tag} · 相似度 ${m.sim}%`, 96, by + 116, { size: 22, weight: 600 });
    let ly = by + 146;
    if (boostLine) { text(ctx, boostLine, 96, ly, { size: fitSize(ctx, boostLine, 590, 21, 14), weight: 700, color: CC.blue }); ly += 28; }
    if (dkLine) { const t = `扣將對照：${dkLine.t.n}（${dkLine.t.tag}）`; text(ctx, t, 96, ly, { size: fitSize(ctx, t, 590, 21, 14), weight: 700, color: CC.gold, shadow: CC.navy, sx: 1, sy: 1 }); }
  }

  const zones = new Set(st.zones || []);
  pixelFrame(ctx, 740, by, W - 70 - 740, PH, { fill: 'rgba(255,255,255,.75)', border: CC.navy, bw: 5, notch: 10, shadow: 'rgba(11,42,85,.25)' });
  ctx.save(); pixelPath(ctx, 740, by, W - 70 - 740, PH, 10); ctx.clip();
  drawCourtCanvas(ctx, 752, by + 24, 118, zones, { base: '#eaf5ff', off: 'rgba(10,115,214,.10)', on: 'rgba(255,154,31,.9)', line: CC.navy });
  ctx.restore();
  text(ctx, 'HOT ZONES', 886, by + 66, { size: 11, color: CC.soft, px: true });
  text(ctx, zones.size ? `${zones.size} 區擅長` : '未標記', 886, by + 108, { size: 24 });

  text(ctx, '能力值 70 ＝ 該層級平均　·　評價僅供娛樂參考', W / 2, by + PH + 44, { size: 20, align: 'center', color: CC.soft, weight: 600 });
  ctx.restore();
}
