/* 介面與流程 */
const esc = (t) => String(t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const STORE_KEY = 'hoop-rating-v2';
const STEPS = 7;

function defaultState() {
  return {
    name: '', jersey: '', gender: 'm', height: '', weight: '', pos: [], hand: 'R', level: null,
    ath: { jump: 50, speed: 50, agility: 50, endurance: 50, strength: 50 },
    pro: { vjStand: '', vjRun: '', sprint: '' },
    shoot: { three: { att: '', made: '' }, mid: { att: '', made: '' }, ft: { att: '', made: '' }, self: 50 },
    zones: [], habits: [], customHabits: [], habitGrades: {},
    dribble: { overall: 'C', skills: {}, custom: [] }, pass: 50,
    reb: { off: 50, def: 50 }, defn: { perimeter: 50, rim: 50, steal: 50 },
    iq: { decision: 50, atr: '', fouls: '', select: '' },
    char: defaultChar(), tags: [], tagsTouched: false, photo: '', photoMode: 'both'
  };
}
function merge(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (!(k in extra)) continue;
    const b = base[k], e = extra[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) base[k] = merge(b, e);
    else base[k] = e;
  }
  if (extra.skills && base.skills !== undefined) base.skills = extra.skills;
  if (extra.habitGrades && base.habitGrades !== undefined) base.habitGrades = extra.habitGrades;
  return base;
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const st = merge(defaultState(), JSON.parse(raw));
    if (!Array.isArray(st.pos)) st.pos = st.pos ? [st.pos] : []; /* 舊版是單一位置 */
    return st;
  } catch (e) { return null; }
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 無痕模式等情況下略過 */ } }

let state = load() || defaultState();
let photoImg = null; /* 大頭照（縮小後存在瀏覽器裡，不會上傳） */
let step = 0;
let resultData = null;

const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function setPath(o, p, v) {
  const ks = p.split('.'), last = ks.pop();
  const t = ks.reduce((a, k) => (a[k] = a[k] ?? {}), o);
  t[last] = v;
}

/* ---------- 動態區塊 ---------- */
function prText(v) { v = +v; return v === 50 ? 'PR 50 · 同層級平均' : v > 50 ? `PR ${v} · 前 ${100 - v}%` : `PR ${v} · 後 ${100 - v}%`; }

function buildSliders(container, list) {
  container.innerHTML = list.map((s) => `
    <div class="slider">
      <div class="top"><span class="nm">${s.name} <small>${s.sub || ''}</small></span><span class="val"></span></div>
      <input type="range" min="1" max="99" step="1" data-path="${s.path}" aria-label="${s.name}">
    </div>`).join('');
}
function buildDynamic() {
  buildSliders($('#athSliders'), [
    { path: 'ath.jump', name: '彈跳', sub: '起跳高度、爆發力' },
    { path: 'ath.speed', name: '速度', sub: '衝刺、快攻跑動' },
    { path: 'ath.agility', name: '敏捷', sub: '變向、側向移動' },
    { path: 'ath.endurance', name: '體能', sub: '跑動、續航力' },
    { path: 'ath.strength', name: '力量', sub: '身體對抗、卡位' }
  ]);
  buildSliders($('#shootSlider'), [{ path: 'shoot.self', name: '投籃整體自評', sub: '沒有命中數據也可以只填這個' }]);
  buildSliders($('#passSlider'), [{ path: 'pass', name: '傳球與視野', sub: '組織、助攻、看空檔的能力' }]);
  buildSliders($('#rebSliders'), [{ path: 'reb.off', name: '進攻籃板' }, { path: 'reb.def', name: '防守籃板' }]);
  buildSliders($('#defSliders'), [
    { path: 'defn.perimeter', name: '外線防守', sub: '守運球、不被過' },
    { path: 'defn.rim', name: '內線護框', sub: '卡位、阻攻、對抗' },
    { path: 'defn.steal', name: '抄截與預判' }
  ]);
  buildSliders($('#iqSliders'), [{ path: 'iq.decision', name: '場上決策與判斷', sub: '知道什麼時候該投、傳、切' }]);

  const gradeOpts = (blank) => (blank ? '<option value="">—</option>' : '') + GRADES.slice().reverse().map((g) => `<option value="${g}">${g}</option>`).join('');
  $('#dribbleOverall').innerHTML = gradeOpts(false);
  $('#customGrade').innerHTML = gradeOpts(false);
  $('#customGrade').value = 'C';
  $('#skillRows').innerHTML = DRIBBLE_SKILLS.map((s) => `
    <div class="skill"><span>${s}</span><select data-path="dribble.skills.${s}" aria-label="${s}">${gradeOpts(true)}</select></div>`).join('');

  $('#levelCards').innerHTML = LEVELS.map((l, i) => `
    <button type="button" class="lvl" data-level="${i}"><span class="en">${l.en}</span><br><span class="nm">${l.name}</span><br><span class="ds">${l.desc}</span></button>`).join('');
  buildCreator();
}

/* ---------- 角色建立 ---------- */
const CHAR_GROUPS = [
  { key: 'hair', label: '髮型', type: 'chips', opts: HAIR_STYLES },
  { key: 'hairColor', label: '髮色', type: 'swatch', colors: HAIR_COLORS, names: HAIR_COLOR_NAMES },
  { key: 'skin', label: '膚色', type: 'swatch', colors: SKIN_TONES, names: SKIN_NAMES },
  { key: 'height', label: '身高', type: 'chips', opts: HEIGHT_NAMES },
  { key: 'build', label: '體型', type: 'chips', opts: BUILD_NAMES },
  { key: 'jersey', label: '球衣款式（NBA 風格，共 12 款）', type: 'jersey' },
  { key: 'c1', label: '球衣主色', type: 'swatch', colors: PALETTE, names: PALETTE_NAMES },
  { key: 'c2', label: '球衣副色', type: 'swatch', colors: PALETTE, names: PALETTE_NAMES },
  { key: 'shorts', label: '球褲顏色', type: 'chips', opts: ['跟主色', '跟副色'] },
  { key: 'headband', label: '頭帶', type: 'swatch', colors: PALETTE, names: PALETTE_NAMES, none: true },
  { key: 'wrist', label: '手臂配件', type: 'chips', opts: WRIST_NAMES },
  { key: 'wristColor', label: '配件顏色', type: 'swatch', colors: PALETTE, names: PALETTE_NAMES },
  { key: 'socks', label: '長襪', type: 'chips', opts: SOCK_NAMES },
  { key: 'sockColor', label: '襪子顏色', type: 'swatch', colors: PALETTE, names: PALETTE_NAMES },
  { key: 'shoes', label: '球鞋顏色', type: 'swatch', colors: PALETTE, names: PALETTE_NAMES },
  { key: 'glasses', label: '眼鏡', type: 'chips', opts: GLASS_NAMES }
];

function buildCreator() {
  const box = $('#charOptions');
  box.innerHTML = CHAR_GROUPS.map((g) => {
    let body = '';
    if (g.type === 'chips') body = `<div class="chips wrap">${g.opts.map((o, i) => `<button type="button" class="chip" data-ck="${g.key}" data-cv="${i}">${o}</button>`).join('')}</div>`;
    else if (g.type === 'swatch') {
      body = `<div class="swatches">${g.none ? `<button type="button" class="sw none" data-ck="${g.key}" data-cv="-1" title="無" aria-label="無">✕</button>` : ''}` +
        g.colors.map((c, i) => `<button type="button" class="sw" style="background:${c}" data-ck="${g.key}" data-cv="${i}" title="${g.names[i]}" aria-label="${g.names[i]}"></button>`).join('') + '</div>';
    } else body = `<div class="jerseys">${JERSEY_STYLES.map((n, i) => `<button type="button" class="jt" data-ck="jersey" data-cv="${i}" title="${n}"><canvas class="jthumb" data-style="${i}" width="56" height="60"></canvas><span>${n}</span></button>`).join('')}</div>`;
    return `<div class="opt"><h4>${g.label}</h4>${body}</div>`;
  }).join('');
  $$('[data-ck]', box).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.ck;
    state.char[k] = +b.dataset.cv;
    if (k === 'height') state.char.heightSet = true;
    save(); refreshCreator();
  }));
}
function refreshCreator() {
  $$('[data-ck]').forEach((b) => b.classList.toggle('on', state.char[b.dataset.ck] === +b.dataset.cv));
  const c1 = PALETTE[state.char.c1], c2 = PALETTE[state.char.c2], skin = SKIN_TONES[state.char.skin];
  $$('canvas.jthumb').forEach((cv) => {
    const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a * 4, b * 4, w * 4, h * 4); };
    paintJersey(px, +cv.dataset.style, 14, 15, c1, c2, skin, state.jersey);
  });
  drawCharPreview(0.15);
}
function drawCharPreview(phase) {
  const cv = $('#charCanvas'), x = cv.getContext('2d');
  x.clearRect(0, 0, cv.width, cv.height);
  drawPlayer(x, 0, 0, 6, state.char, state.jersey, phase);
}
let animId = null;
function startCharAnim() {
  if (animId) return;
  const loop = (t) => {
    if (step !== 6 || !$('#wizard').classList.contains('active')) { animId = null; return; }
    drawCharPreview((t / 1000 * 1.3) % 1);
    animId = requestAnimationFrame(loop);
  };
  animId = requestAnimationFrame(loop);
}
function randomChar() {
  const r = (n) => Math.floor(Math.random() * n);
  const keep = state.char.heightSet;
  const c = defaultChar();
  Object.assign(c, { hair: r(HAIR_STYLES.length), hairColor: r(HAIR_COLORS.length), skin: r(SKIN_TONES.length), build: r(3), jersey: r(JERSEY_STYLES.length),
    c1: r(PALETTE.length), c2: r(PALETTE.length), shorts: r(2), headband: Math.random() < 0.4 ? r(PALETTE.length) : -1, wrist: r(3), wristColor: r(PALETTE.length),
    socks: r(4), sockColor: r(PALETTE.length), shoes: r(PALETTE.length), glasses: Math.random() < 0.3 ? 1 + r(2) : 0 });
  if (c.c1 === c.c2) c.c2 = (c.c2 + 6) % PALETTE.length;
  c.height = state.char.height; c.heightSet = keep;
  state.char = c; save(); refreshCreator();
}
function autoHeight() {
  const h = parseFloat(state.height);
  if (state.char.heightSet || !isFinite(h)) return;
  const lo = state.gender === 'f' ? 158 : 170, hi = state.gender === 'f' ? 170 : 182;
  state.char.height = h < lo ? 0 : h > hi ? 2 : 1;
}

/* ---------- 綁定 ---------- */
function updateVal(el) { const v = el.parentElement.querySelector('.val'); if (v) v.textContent = prText(el.value); }
function bindAll() {
  $$('[data-path]').forEach((el) => {
    if (el.classList.contains('chips')) return;
    const path = el.dataset.path;
    const v = getPath(state, path);
    if (v !== undefined && v !== null) el.value = v;
    if (el.type === 'range') updateVal(el);
    el.addEventListener('input', () => {
      const val = el.type === 'range' ? +el.value : el.value;
      setPath(state, path, val);
      if (el.type === 'range') updateVal(el);
      save(); refreshPotential();
    });
  });
  $$('.chips[data-path]').forEach((g) => {
    const path = g.dataset.path;
    $$('.chip', g).forEach((b) => b.addEventListener('click', () => {
      if (g.dataset.multi) {
        const v = b.dataset.value, cur = getPath(state, path) || [];
        if (v === '') setPath(state, path, []);
        else if (cur.includes(v)) setPath(state, path, cur.filter((x) => x !== v));
        else if (cur.length >= 3) { Sound.sfx.error(); toast('最多選 3 個位置'); return; }
        else setPath(state, path, [...cur, v]);
      } else setPath(state, path, b.dataset.value);
      save(); refreshChipGroup(g);
    }));
    refreshChipGroup(g);
  });
  $$('.lvl').forEach((b) => b.addEventListener('click', () => { state.level = +b.dataset.level; save(); refreshLevels(); }));
  refreshLevels();
  renderHabits(); refreshZones(); refreshCustom(); refreshCreator();
}
function refreshChipGroup(g) {
  const cur = getPath(state, g.dataset.path);
  $$('.chip', g).forEach((b) => {
    const v = b.dataset.value;
    const on = g.dataset.multi ? (v === '' ? !(cur || []).length : (cur || []).includes(v)) : v === String(cur ?? '');
    b.classList.toggle('on', on);
  });
}
function refreshLevels() { $$('.lvl').forEach((b) => b.classList.toggle('on', +b.dataset.level === state.level)); }
/* 投籃習慣：內建選項＋使用者自訂（自訂的可以按 ✕ 刪除） */
function renderHabits() {
  const box = $('#habitChips');
  box.innerHTML = '';
  /* 以前自訂的技能如果後來變成內建選項，就合併成一個，保留已選與等級 */
  const customs = state.customHabits.filter((h) => !HABITS.includes(h));
  [...HABITS, ...customs].forEach((h) => {
    const custom = customs.includes(h);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip' + (state.habits.includes(h) ? ' on' : '');
    b.textContent = h;
    if (custom) { const x = document.createElement('span'); x.className = 'x'; x.textContent = '✕'; x.dataset.rm = '1'; b.appendChild(x); }
    b.addEventListener('click', (e) => {
      if (e.target.dataset.rm) {
        state.customHabits = state.customHabits.filter((v) => v !== h);
        state.habits = state.habits.filter((v) => v !== h);
        delete state.habitGrades[h];
      } else if (state.habits.includes(h)) { state.habits = state.habits.filter((v) => v !== h); delete state.habitGrades[h]; }
      else state.habits.push(h);
      save(); renderHabits();
    });
    box.appendChild(b);
  });
  renderHabitGrades();
}
/* 選了的技能，可以替它評等級（C ＝ 層級平均）；A- 以上會提高對應球星的相似度 */
function renderHabitGrades() {
  const box = $('#habitGrades');
  box.innerHTML = '';
  box.hidden = state.habits.length === 0;
  state.habits.forEach((h) => {
    const row = document.createElement('div'); row.className = 'skill';
    const name = document.createElement('span'); name.textContent = h;
    const sel = document.createElement('select'); sel.setAttribute('aria-label', h + ' 等級');
    sel.innerHTML = '<option value="">—</option>' + GRADES.slice().reverse().map((g) => '<option value="' + g + '">' + g + '</option>').join('');
    sel.value = state.habitGrades[h] || '';
    sel.addEventListener('change', () => { if (sel.value) state.habitGrades[h] = sel.value; else delete state.habitGrades[h]; save(); });
    row.appendChild(name); row.appendChild(sel); box.appendChild(row);
  });
}
function refreshZones() {
  const set = new Set(state.zones);
  buildCourtSVG($('#zoneMap'), set, (id) => {
    const i = state.zones.indexOf(id);
    if (i >= 0) state.zones.splice(i, 1); else state.zones.push(id);
    save(); refreshZones();
  });
  const names = ZONES.filter((z) => set.has(z.id)).map((z) => z.name);
  $('#zoneNames').textContent = names.length ? '擅長：' + names.join('、') : '尚未標記（可以不填）';
}
function refreshCustom() {
  const box = $('#customList');
  box.innerHTML = state.dribble.custom.map((c, i) => `<button type="button" class="chip on" data-rm="${i}">${esc(c.name)} ${esc(c.grade)}<span class="x">✕</span></button>`).join('');
  $$('[data-rm]', box).forEach((b) => b.addEventListener('click', () => { state.dribble.custom.splice(+b.dataset.rm, 1); save(); refreshCustom(); }));
}
function refreshPotential() {
  const box = $('#potentialBox');
  if (!box || state.level === null) return;
  const s = computeStats(state);
  box.innerHTML = `
    <div class="pot"><b>${s.potential.R}</b><span>籃板潛力（依彈跳與身高推算）</span></div>
    <div class="pot"><b>${s.potential.D}</b><span>防守潛力（依敏捷、速度、體能推算）</span></div>`;
}

/* ---------- 流程 ---------- */
function showScreen(id) {
  ['intro', 'wizard', 'result'].forEach((s) => $('#' + s).classList.toggle('active', s === id));
  $('#progress').hidden = id !== 'wizard';
  window.scrollTo(0, 0);
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
function showStep(i) {
  step = i;
  $$('.step').forEach((s) => s.hidden = +s.dataset.step !== i);
  $('#progressBar').style.width = ((i + 1) / STEPS) * 100 + '%';
  $('#nextBtn').textContent = i === STEPS - 1 ? '生成球員卡' : '下一步';
  if (i === 5) refreshPotential();
  if (i === 6) { autoHeight(); refreshCreator(); startCharAnim(); }
  showScreen('wizard');
}
function validate(i) {
  if (i === 0 && !state.name.trim()) { Sound.sfx.error(); toast('請先輸入球員名字'); $('[data-path="name"]').focus(); return false; }
  if (i === 1 && state.level === null) { Sound.sfx.error(); toast('請選擇你的參賽層級'); return false; }
  return true;
}

/* ---------- 結果頁 ---------- */
function redrawCard() {
  if (!resultData) return;
  resultData.tags = state.tags;
  resultData.photo = photoImg;
  drawCard($('#cardCanvas'), resultData, state.char);
}
function renderTagPanel() {
  const rec = resultData.rec;
  const all = Array.from(new Set([...rec, ...state.tags]));
  $('#tagList').innerHTML = all.map((t) => {
    const on = state.tags.includes(t), isRec = rec.includes(t);
    return `<button type="button" class="chip${on ? ' on' : ''}" data-tag="${esc(t)}">${isRec ? '★ ' : ''}${esc(t)}</button>`;
  }).join('');
  $$('[data-tag]', $('#tagList')).forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.tag, i = state.tags.indexOf(t);
    if (i >= 0) state.tags.splice(i, 1);
    else if (state.tags.length >= 3) { Sound.sfx.error(); toast('卡片上最多放 3 個標籤'); return; }
    else state.tags.push(t);
    state.tagsTouched = true; save(); renderTagPanel(); redrawCard();
  }));
}
function showResult() {
  const stats = computeStats(state);
  const an = analyze(state, stats);
  const rec = recommendTags(stats, state);
  const masters = masterTags(state);
  /* 還沒自己調整過標籤時：大師標籤優先（最多 2 個），再補 1 個一般推薦，總共不超過 3 個 */
  if (!state.tagsTouched) state.tags = Array.from(new Set([...masters.slice(0, 2), ...rec.filter((t) => !masters.includes(t)).slice(0, 1)])).slice(0, 3);
  resultData = { st: state, stats, an, tags: state.tags, rec, photo: photoImg };
  redrawCard();
  renderTagPanel();

  $('#comments').innerHTML = '<h3 style="margin-top:0">AI 評語</h3>' + an.comments.map((c) => `<p>${esc(c)}</p>`).join('');
  $('#breakdown').innerHTML = '<h3 style="margin-top:0">能力值怎麼來的</h3>' + AX.map((x) =>
    `<div class="bd"><b>${stats.axes[x.k]}</b><span>${x.zh} <small style="display:inline;color:var(--soft)">${x.en}</small></span><small>${stats.notes[x.k]}</small></div>`).join('');
  $('#matches').innerHTML = '<h3 style="margin-top:0">風格對照</h3>' + an.matches.map((m) => m.t.goat
    ? `<div class="matchrow"><div><b>G.O.A.T.</b><small>你是籃球界的 GOAT，找不到你的模板</small></div><b class="sim">∞</b></div>`
    : `<div class="matchrow"><div><b>${esc(m.t.n)}</b>${m.dk ? ' <span class="dk">扣將</span>' : ''}${m.sub ? ` <span class="dk">${esc(m.sub)}</span>` : ''}<small>${esc(m.t.tag)}</small>${m.boost && m.boost.length ? `<small class="boost">招牌技能加成：${esc(m.boost.join('、'))}</small>` : ''}</div><b class="sim">${m.sim}%</b></div>`).join('');
  showScreen('result');
  Sound.sfx.done();
}

function canvasBlob() { return new Promise((res) => $('#cardCanvas').toBlob(res, 'image/png')); }
async function download() {
  const blob = await canvasBlob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `hoop-rating-${(state.name || 'player').replace(/\s+/g, '-')}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function share() {
  const blob = await canvasBlob();
  const file = new File([blob], 'hoop-rating.png', { type: 'image/png' });
  const m0 = resultData.an.matches[0];
  const text = m0.t.goat ? `我的籃球能力值全滿，OVR ${resultData.stats.ovr}，我是籃球界的 GOAT！` : `我的籃球能力值 OVR ${resultData.stats.ovr}（${resultData.stats.grade}），風格像 ${m0.t.n}！`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'HOOP RATING', text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  await download();
  toast('已下載圖片，可以直接貼到社群');
}

/* ---------- 大頭照 ---------- */
const PHOTO_MODES = [['both', '像素角色＋頭像'], ['sprite', '只放像素角色'], ['photo', '只放大頭照']];
function buildPhotoModes() {
  $$('.pm-chips').forEach((box) => {
    box.innerHTML = PHOTO_MODES.map(([v, n]) => `<button type="button" class="chip" data-pm="${v}">${n}</button>`).join('');
    $$('[data-pm]', box).forEach((b) => b.addEventListener('click', () => { state.photoMode = b.dataset.pm; save(); refreshPhotoUI(); redrawCard(); }));
  });
}
function refreshPhotoUI() {
  const has = !!photoImg;
  $('#photoPreview').hidden = !has;
  if (has) $('#photoPreview').src = state.photo;
  $('#uploadText').hidden = has;
  $('#photoClear').hidden = !has;
  $$('.pm-chips').forEach((b) => { b.hidden = !has; });
  $('#photoModePanel').hidden = !has;
  $$('[data-pm]').forEach((b) => b.classList.toggle('on', b.dataset.pm === state.photoMode));
}
function setPhoto(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 480, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      photoImg = c;
      state.photo = c.toDataURL('image/jpeg', 0.82);
      if (!state.photoMode) state.photoMode = 'both';
      save(); refreshPhotoUI(); redrawCard();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function clearPhoto() {
  photoImg = null; state.photo = ''; $('#photoInput').value = '';
  save(); refreshPhotoUI(); redrawCard();
}
function restorePhoto() {
  if (!state.photo) return;
  const img = new Image();
  img.onload = () => { photoImg = img; refreshPhotoUI(); redrawCard(); };
  img.src = state.photo;
}

/* ---------- 啟動 ---------- */
function updateSoundBtn() { const b = $('#soundBtn'); b.textContent = Sound.enabled ? '♪ ON' : '♪ OFF'; b.setAttribute('aria-pressed', String(Sound.enabled)); }

function init() {
  buildDynamic();
  bindAll();
  buildPhotoModes(); refreshPhotoUI(); restorePhoto();
  updateSoundBtn();

  /* 所有按鈕共用的點擊音效（有 data-sfx 的按鈕自己負責） */
  document.addEventListener('click', (e) => {
    Sound.unlock();
    const t = e.target.closest('button, .zone, summary, select, .upload');
    if (!t || t.dataset.sfx || t.id === 'soundBtn') return;
    Sound.sfx.click();
  }, true);
  $('#soundBtn').addEventListener('click', () => { Sound.toggle(); updateSoundBtn(); });

  $('#startBtn').addEventListener('click', () => { Sound.sfx.next(); showStep(0); });
  $('#nextBtn').addEventListener('click', () => {
    if (!validate(step)) return;
    if (step === STEPS - 1) showResult(); else { Sound.sfx.next(); showStep(step + 1); }
  });
  $('#backBtn').addEventListener('click', () => { Sound.sfx.back(); if (step === 0) showScreen('intro'); else showStep(step - 1); });
  $('#randChar').addEventListener('click', randomChar);
  $('#photoInput').addEventListener('change', (e) => { if (e.target.files[0]) setPhoto(e.target.files[0]); });
  $('#photoClear').addEventListener('click', (e) => { e.preventDefault(); clearPhoto(); });
  $('#customAdd').addEventListener('click', () => {
    const name = $('#customName').value.trim();
    if (!name) return;
    state.dribble.custom.push({ name, grade: $('#customGrade').value });
    $('#customName').value = ''; save(); refreshCustom();
  });
  $('#habitAdd').addEventListener('click', () => {
    const t = $('#habitInput').value.trim().slice(0, 12);
    if (!t) return;
    if (state.customHabits.length >= 6) { Sound.sfx.error(); toast('自訂習慣最多 6 個'); return; }
    if (!HABITS.includes(t) && !state.customHabits.includes(t)) state.customHabits.push(t);
    if (!state.habits.includes(t)) state.habits.push(t);
    $('#habitInput').value = ''; save(); renderHabits();
  });
  $('#tagAdd').addEventListener('click', () => {
    const t = $('#tagInput').value.trim().slice(0, 12);
    if (!t) return;
    if (state.tags.length >= 3) { Sound.sfx.error(); toast('卡片上最多放 3 個標籤，先取消一個'); return; }
    if (!state.tags.includes(t)) state.tags.push(t);
    $('#tagInput').value = ''; state.tagsTouched = true; save(); renderTagPanel(); redrawCard();
  });
  $('#shareBtn').addEventListener('click', share);
  $('#downloadBtn').addEventListener('click', download);
  $('#editBtn').addEventListener('click', () => showStep(0));
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('確定要清除所有答案，重新開始嗎？')) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* 略過 */ }
    state = defaultState(); photoImg = null; refreshPhotoUI();
    $$('[data-path]').forEach((el) => { if (!el.classList.contains('chips')) { const v = getPath(state, el.dataset.path); el.value = v === undefined ? '' : v; if (el.type === 'range') updateVal(el); } });
    $$('.chips[data-path]').forEach(refreshChipGroup);
    refreshLevels(); renderHabits(); refreshZones(); refreshCustom(); refreshCreator();
    showScreen('intro');
  });
  showStep(0); showScreen('intro');

  /* 像素字體載入後，如果已經在結果頁就重畫一次 */
  if (document.fonts && document.fonts.load) {
    document.fonts.load('16px "Press Start 2P"').then(() => { if ($('#result').classList.contains('active')) redrawCard(); }).catch(() => {});
  }
}
init();
