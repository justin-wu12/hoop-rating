/* 半場投籃熱區：同一組幾何同時給 SVG（選擇用）與 Canvas（分享卡片）使用。
   座標：寬 500、高 470，底線在上方，籃框中心 (250, 52)，1 單位 = 0.1 英尺。 */
const COURT = { W: 500, H: 470, bx: 250, by: 52, r3: 237.5, cornerX: 30, cornerY: 141.5 };

function polar(theta, R) {
  const t = (theta * Math.PI) / 180;
  return [COURT.bx + R * Math.sin(t), COURT.by + R * Math.cos(t)];
}
function wedge(t1, t2, R) {
  const [x1, y1] = polar(t1, R), [x2, y2] = polar(t2, R);
  return `M${COURT.bx} ${COURT.by}L${x1.toFixed(1)} ${y1.toFixed(1)}A${R} ${R} 0 0 0 ${x2.toFixed(1)} ${y2.toFixed(1)}Z`;
}

const IN3_PATH = `M30 0V141.5A237.5 237.5 0 0 0 470 141.5V0Z`;
const ZONES = [
  { id: 'c3L', name: '左底角三分', path: 'M0 0H30V141.5H0Z', layer: 'out' },
  { id: 'c3R', name: '右底角三分', path: 'M470 0H500V141.5H470Z', layer: 'out' },
  { id: 'w3L', name: '左側 45° 三分', path: wedge(-67.9, -22, 700), layer: 'out' },
  { id: 't3', name: '弧頂三分', path: wedge(-22, 22, 700), layer: 'out' },
  { id: 'w3R', name: '右側 45° 三分', path: wedge(22, 67.9, 700), layer: 'out' },
  { id: 'mL', name: '左側中距離', path: wedge(-90, -30, 237.5) + 'M30 0H170V52H30Z', layer: 'mid' },
  { id: 'mC', name: '中路中距離', path: wedge(-30, 30, 237.5), layer: 'mid' },
  { id: 'mR', name: '右側中距離', path: wedge(30, 90, 237.5) + 'M330 0H470V52H330Z', layer: 'mid' },
  { id: 'paint', name: '禁區（籃下）', path: 'M170 0H330V190H170Z', layer: 'paint' }
];

const COURT_LINES = [
  'M0 0H500V470H0Z',
  IN3_PATH.replace(/Z$/, ''),
  'M170 0V190H330V0',
  'M190 0V190M310 0V190',
  'M190 190A60 60 0 0 0 310 190',
  'M210 52A40 40 0 0 0 290 52',
  'M220 40H280'
];

/* 在 SVG 裡建立熱區地圖。selected 是 Set；onToggle(id) 為點擊回呼（可省略＝唯讀）。 */
function buildCourtSVG(svg, selected, onToggle) {
  const NS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';
  const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const defs = mk('defs', {});
  const cp = mk('clipPath', { id: 'in3clip' });
  cp.appendChild(mk('path', { d: IN3_PATH }));
  defs.appendChild(cp);
  svg.appendChild(defs);

  const addZone = (z) => {
    const p = mk('path', { d: z.path, class: 'zone' + (selected.has(z.id) ? ' on' : ''), 'data-id': z.id });
    if (z.layer === 'mid') p.setAttribute('clip-path', 'url(#in3clip)');
    const t = mk('title', {}); t.textContent = z.name; p.appendChild(t);
    if (onToggle) p.addEventListener('click', () => onToggle(z.id));
    svg.appendChild(p);
  };
  ZONES.filter((z) => z.layer === 'out').forEach(addZone);
  svg.appendChild(mk('path', { d: IN3_PATH, class: 'zone-in' }));
  ZONES.filter((z) => z.layer === 'mid').forEach(addZone);
  ZONES.filter((z) => z.layer === 'paint').forEach(addZone);
  COURT_LINES.forEach((d) => svg.appendChild(mk('path', { d, class: 'court-line' })));
  svg.appendChild(mk('circle', { cx: COURT.bx, cy: COURT.by, r: 7.5, class: 'court-line rim' }));
}

/* 在 Canvas 上畫迷你球場（分享卡片用） */
function drawCourtCanvas(ctx, x, y, w, selected, c) {
  const s = w / COURT.W;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath(); ctx.rect(0, 0, COURT.W, COURT.H); ctx.clip();
  ctx.fillStyle = c.base; ctx.fillRect(0, 0, COURT.W, COURT.H);
  const fill = (z) => {
    ctx.fillStyle = selected.has(z.id) ? c.on : c.off;
    ctx.fill(new Path2D(z.path));
  };
  ZONES.filter((z) => z.layer === 'out').forEach(fill);
  const in3 = new Path2D(IN3_PATH);
  ctx.fillStyle = c.base; ctx.fill(in3);
  ctx.save(); ctx.clip(in3);
  ZONES.filter((z) => z.layer === 'mid').forEach(fill);
  ctx.restore();
  ZONES.filter((z) => z.layer === 'paint').forEach(fill);
  ctx.strokeStyle = c.line; ctx.lineWidth = 3;
  COURT_LINES.forEach((d) => ctx.stroke(new Path2D(d)));
  ctx.beginPath(); ctx.arc(COURT.bx, COURT.by, 7.5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
