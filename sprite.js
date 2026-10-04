/* 像素球員：全部用方塊程式畫出來，沒有任何圖檔。邏輯格 44×66，底部對齊地板。 */
const GW = 44, GH = 66, FLOOR = 64;

const DIGITS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '001', '010', '010'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111']
};

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lum(h) { const [r, g, b] = hexToRgb(h); return 0.299 * r + 0.587 * g + 0.114 * b; }
function shade(h, amt) {
  const [r, g, b] = hexToRgb(h).map((v) => Math.max(0, Math.min(255, Math.round(v + amt))));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function drawNum(px, num, x0, y0, col, outline) {
  const s = String(num), w = s.length * 4 - 1;
  const draw = (ox, oy, c) => {
    for (let i = 0; i < s.length; i++) {
      const rows = DIGITS[s[i]];
      for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (rows[r][q] === '1') px(x0 + ox + i * 4 + q, y0 + oy + r, 1, 1, c);
    }
  };
  [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => draw(dx, dy, outline));
  draw(0, 0, col);
  return w;
}

/* 球衣：px(x, y, w, h, color) 是區域座標的畫方塊函式，也用在款式縮圖 */
function paintJersey(px, style, tw, th, c1, c2, skin, num) {
  const fill = (c) => px(0, 0, tw, th, c);
  const mid = Math.floor(tw / 2);
  switch (style) {
    case 0: fill(c1); px(0, th - 1, tw, 1, c2); break;
    case 1: fill(c1); px(1, 0, 1, th, c2); px(tw - 2, 0, 1, th, c2); px(0, th - 1, tw, 1, c2); break;
    case 2: fill(c1); px(0, 3, tw, 3, c2); break;
    case 3: fill(c1); for (let y = 0; y < th; y++) px(Math.min(tw - 3, Math.floor((y * tw) / th)), y, 3, 1, c2); break;
    case 4: fill(c1); px(mid, 0, tw - mid, th, c2); break;
    case 5: fill(c1); px(0, 0, tw, 5, c2); break;
    case 6: fill(c1); for (let x = 0; x < tw; x += 3) px(x, 0, 1, th, c2); break;
    case 7: fill(c1);
      [[mid - 1, 1], [mid, 2], [mid - 2, 3], [mid - 1, 4]].forEach(([x, y]) => px(x, y, 3, 1, c2));
      px(mid - 2, 5, 2, 1, c2); break;
    case 8: fill(c1);
      [[2, 1], [mid - 1, 1], [tw - 4, 1]].forEach(([x, y]) => { px(x, y + 1, 3, 1, c2); px(x + 1, y, 1, 3, c2); });
      break;
    case 9: fill(c1); for (let y = 1; y < th; y += 4) px(0, y, tw, 2, c2); break;
    case 10: fill(c1); px(0, 0, 1, th, c2); px(tw - 1, 0, 1, th, c2); px(0, th - 1, tw, 1, c2);
      for (let i = 0; i < 4; i++) { px(mid - 3 + i, i, 1, 1, c2); px(mid + 2 - i, i, 1, 1, c2); } break;
    case 11: fill(c1); px(0, 0, tw, 4, c2);
      for (let x = 0; x < tw; x++) { px(x, 4, 1, 1, x % 2 ? c2 : c1); px(x, 5, 1, 1, x % 2 ? c1 : c2); } break;
    default: fill(c1);
  }
  /* 領口（圓領；V 領款式由款式本身處理） */
  px(mid - 2, 0, 4, 1, skin); px(mid - 1, 1, 2, 1, skin);
  if (num !== '' && num !== null && num !== undefined) {
    const s = String(parseInt(num, 10));
    if (s !== 'NaN') {
      const nw = s.length * 4 - 1;
      const bgc = style === 4 ? c1 : c1;
      const col = lum(bgc) > 140 ? '#0b2a55' : '#ffffff';
      const out = lum(bgc) > 140 ? '#ffffff' : '#0b2a55';
      drawNum(px, s, Math.floor((tw - nw) / 2), 6, col, out);
    }
  }
}

function drawBall(P, x, y) {
  /* x, y = 球的左上角；11×11（含外框） */
  const rows = [3, 7, 9, 11, 11, 11, 11, 11, 9, 7, 3];
  rows.forEach((w, i) => P(x + (11 - w) / 2, y + i, w, 1, '#7a3200'));
  const inner = [5, 7, 9, 9, 9, 9, 9, 7, 5];
  inner.forEach((w, i) => P(x + (11 - w) / 2, y + 1 + i, w, 1, '#ff8a1f'));
  P(x + 5, y + 1, 1, 9, '#7a3200');
  P(x + 1, y + 5, 9, 1, '#7a3200');
  P(x + 3, y + 3, 2, 1, '#ffb866');
}

function drawPlayer(ctx, ox, oy, s, ch, num, phase = 0) {
  ctx.imageSmoothingEnabled = false;
  const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(ox + x * s), Math.round(oy + y * s), Math.ceil(w * s), Math.ceil(h * s)); };
  const skin = SKIN_TONES[ch.skin], skinD = shade(skin, -28);
  const hairC = HAIR_COLORS[ch.hairColor], hairD = shade(hairC, -35), hairL = shade(hairC, 40);
  const c1 = PALETTE[ch.c1], c2 = PALETTE[ch.c2];
  const cx = 22;
  const LEG = [9, 12, 15][ch.height], TW = [12, 14, 17][ch.build], AW = [2, 3, 4][ch.build], LW = [3, 4, 5][ch.build];
  const sb = 61 - LEG;               /* 球褲下緣 */
  const ty = sb - 8 - 15;            /* 球衣上緣 */
  const hy = ty - 1 - 11;            /* 頭頂 */
  const tx = cx - Math.floor(TW / 2);
  const hx = cx - 5;

  /* 地板陰影 */
  P(cx - 11, FLOOR, 22, 2, 'rgba(11,42,85,.25)');

  /* 後方頭髮 */
  if (ch.hair === 3) { /* 爆炸頭 */
    for (let dy = -9; dy <= 9; dy++) for (let dx = -10; dx <= 10; dx++) {
      if ((dx * dx) / 100 + (dy * dy) / 81 <= 1) P(cx + dx, hy + 2 + dy, 1, 1, ((dx + dy) & 3) === 0 ? hairD : hairC);
    }
  }
  if (ch.hair === 7) { P(hx - 1, hy + 2, 12, 12, hairC); }           /* 長髮後片 */
  if (ch.hair === 6) { P(cx - 3, hy - 4, 6, 4, hairC); P(cx - 2, hy - 5, 4, 1, hairC); P(cx - 2, hy - 3, 1, 1, hairL); } /* 丸子 */

  /* 雙腿與襪子、鞋子 */
  const legTop = sb, legBot = FLOOR - 3;
  [cx - LW - 1, cx + 1].forEach((lx) => {
    P(lx, legTop, LW, legBot - legTop, skin);
    P(lx + LW - 1, legTop, 1, legBot - legTop, skinD);
    const sl = [0, 2, 6, 10][ch.socks];
    if (sl) { P(lx, legBot - sl, LW, sl, PALETTE[ch.sockColor]); if (sl > 2) P(lx, legBot - sl, LW, 1, shade(PALETTE[ch.sockColor], lum(PALETTE[ch.sockColor]) > 140 ? -50 : 60)); }
    const shoe = PALETTE[ch.shoes];
    P(lx - 1, legBot, LW + 2, 3, shoe);
    P(lx - 1, legBot + 2, LW + 2, 1, lum(shoe) > 200 ? '#9ca3af' : '#ffffff');
  });

  /* 球褲 */
  const shc = ch.shorts === 0 ? c1 : c2, shs = ch.shorts === 0 ? c2 : c1;
  P(tx, sb - 8, TW, 8, shc);
  P(tx, sb - 8, TW, 1, shs);
  P(tx, sb - 8, 1, 8, shs); P(tx + TW - 1, sb - 8, 1, 8, shs);
  P(cx, sb - 3, 1, 3, shade(shc, -40)); /* 褲襠線 */

  /* 球衣 */
  paintJersey((x, y, w, h, c) => P(tx + x, ty + y, w, h, c), ch.jersey, TW, 15, c1, c2, skin, num);

  /* 手臂：右手（畫面左）運球，左手（畫面右）護球 */
  const ease = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2; /* 0 球在地上、1 球回到手上 */
  const fore = 8 + Math.round((1 - ease) * 2);
  const rax = tx - AW, rfx = tx - AW - 1;
  P(rax, ty + 1, AW, 7, skin); P(rfx, ty + 7, AW, fore, skin);
  P(rfx - 1, ty + 7 + fore, AW + 2, 3, skin);
  const hy2 = ty + 7 + fore; /* 手的位置 */
  const lax = tx + TW;
  P(lax, ty + 1, AW, 6, skin); P(lax, ty + 6, AW + 5, AW, skin); P(lax + AW + 4, ty + 3, AW, AW + 3, skin);
  if (ch.wrist === 1) {
    P(rfx, hy2 - 2, AW, 2, PALETTE[ch.wristColor]); P(lax + AW + 4, ty + 3 + AW + 1, AW, 2, PALETTE[ch.wristColor]);
  } else if (ch.wrist === 2) {
    const wc = PALETTE[ch.wristColor];
    P(rax, ty + 1, AW, 7, wc); P(rfx, ty + 7, AW, fore - 1, wc);
    P(lax, ty + 1, AW, 6, wc); P(lax, ty + 6, AW + 5, AW, wc);
  }

  /* 球：phase 讓它在地板與手之間彈跳 */
  const bx = rfx - 5, floorBall = FLOOR - 11, handBall = hy2 + 2;
  drawBall(P, bx, Math.round(floorBall + (handBall - floorBall) * ease));

  /* 脖子與頭 */
  P(cx - 2, ty - 1, 4, 1, skinD);
  P(hx - 1, hy + 4, 1, 3, skinD); P(hx + 10, hy + 4, 1, 3, skinD); /* 耳朵 */
  P(hx, hy, 10, 11, skin);
  P(hx, hy + 10, 10, 1, skinD);
  P(hx + 2, hy + 5, 1, 2, '#1b1b1f'); P(hx + 7, hy + 5, 1, 2, '#1b1b1f'); /* 眼睛 */
  P(cx - 1, hy + 8, 2, 1, '#8a3b3b');                                   /* 嘴 */

  /* 前方頭髮 */
  switch (ch.hair) {
    case 1: P(hx, hy - 1, 10, 3, hairC); P(hx, hy + 2, 1, 2, hairC); P(hx + 9, hy + 2, 1, 2, hairC); break;
    case 2: P(hx, hy - 2, 10, 4, hairC); P(hx + 2, hy - 3, 7, 1, hairC); P(hx, hy + 2, 1, 3, hairC); P(hx + 9, hy + 2, 1, 3, hairC);
      for (let i = 0; i < 4; i++) P(hx + 3 + i, hy - 2 + (i > 2 ? 1 : 0), 1, 1, hairL); break;
    case 3: P(hx, hy - 1, 10, 3, hairC); break;
    case 4:
      P(hx, hy - 1, 10, 4, hairC);
      [-8, -6, -4, 3, 5, 7].forEach((d, i) => { const len = 9 + (i % 3) * 2; P(cx + d - (d > 0 ? 0 : 0), hy + 2, 2, len, i % 2 ? hairD : hairC); });
      break;
    case 5:
      P(hx, hy - 1, 10, 5, hairC);
      for (let x = 1; x < 10; x += 2) P(hx + x, hy - 1, 1, 5, hairD);
      break;
    case 6: P(hx, hy - 1, 10, 3, hairC); P(hx, hy + 2, 1, 2, hairC); P(hx + 9, hy + 2, 1, 2, hairC); break;
    case 7: P(hx, hy - 1, 10, 3, hairC); P(hx - 1, hy + 2, 2, 11, hairC); P(hx + 9, hy + 2, 2, 11, hairC); P(cx - 1, hy - 1, 1, 3, hairD); break;
    default: P(cx - 3, hy, 3, 1, 'rgba(255,255,255,.35)');
  }
  /* 頭帶 */
  if (ch.headband >= 0) { const hb = PALETTE[ch.headband]; P(hx - 1, hy + 2, 12, 2, hb); if (lum(hb) > 200) P(hx - 1, hy + 3, 12, 1, '#c7ccd4'); }
  /* 眼鏡 */
  if (ch.glasses === 1) {
    P(hx + 1, hy + 4, 4, 4, '#1b1b1f'); P(hx + 2, hy + 5, 2, 2, '#cfe8ff'); P(hx + 5, hy + 5, 1, 1, '#1b1b1f');
    P(hx + 6, hy + 4, 4, 4, '#1b1b1f'); P(hx + 7, hy + 5, 2, 2, '#cfe8ff');
    P(hx + 2, hy + 5, 1, 2, '#1b1b1f'); P(hx + 7, hy + 5, 1, 2, '#1b1b1f');
  } else if (ch.glasses === 2) {
    P(hx - 1, hy + 4, 12, 4, '#1b1b1f'); P(hx, hy + 5, 10, 2, '#ff9a1f'); P(hx + 1, hy + 5, 2, 1, '#ffd08a');
  }
}
