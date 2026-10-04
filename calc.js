/* 評分邏輯：能力值 70 = 該層級平均，每 1 個標準差 = SCALE 分（娛樂用，拉大分數差距）。 */
const AVG = 70;
const SCALE = 14;
const posList = (st) => (Array.isArray(st.pos) ? st.pos : st.pos ? [st.pos] : []);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const zScore = (z) => clamp(Math.round(AVG + SCALE * z), 1, 99);

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return isFinite(n) ? n : null;
}

/* 標準常態分布的反函數（Abramowitz & Stegun 26.2.23），用來把 PR 值換成 z 分數 */
function probit(p) {
  const rat = (t) => t - (2.515517 + 0.802853 * t + 0.010328 * t * t) /
    (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  return p < 0.5 ? -rat(Math.sqrt(-2 * Math.log(p))) : rat(Math.sqrt(-2 * Math.log(1 - p)));
}
const prScore = (pr) => zScore(probit(clamp(numOrNull(pr) ?? 50, 1, 99) / 100));

/* 等級對應：C（第 8 級）＝ 層級平均 70，A+ ＝ 99，E- ＝ 30 */
const gradeScore = (g) => {
  const i = GRADES.indexOf(g);
  if (i < 0) return null;
  return i >= 7 ? Math.round(AVG + (i - 7) * (99 - AVG) / 7) : Math.round(AVG - (7 - i) * (AVG - 30) / 7);
};
const scoreGrade = (s) => {
  const i = s >= AVG ? 7 + (s - AVG) * 7 / (99 - AVG) : 7 - (AVG - s) * 7 / (AVG - 30);
  return GRADES[clamp(Math.round(i), 0, 14)];
};

const OVR_W = { S: 0.22, P: 0.16, D: 0.17, R: 0.13, A: 0.17, I: 0.15 };

/* 加權平均，忽略沒有資料（w = 0）的項目 */
function wavg(items) {
  const tw = items.reduce((s, [, w]) => s + w, 0);
  return tw ? items.reduce((s, [v, w]) => s + v * w, 0) / tw : AVG;
}

function shootPart(st, key, L) {
  const att = numOrNull(st.shoot[key].att), made = numOrNull(st.shoot[key].made);
  if (att === null || made === null || att <= 0) return null;
  const m = Math.min(made, att);
  const [mean, sd] = SHOOT_BASE[key][L];
  const k = 10; /* 少量球數往平均靠，避免 1 投 1 中就變 100% */
  const pct = ((m + k * mean / 100) / (att + k)) * 100;
  return { score: zScore((pct - mean) / sd), conf: Math.min(1, att / 20), pct: (m / att) * 100, att, made: m };
}

function computeStats(st) {
  const L = st.level, g = st.gender === 'f' ? 'f' : 'm';
  const B = ATH_BASE[g];
  const notes = {};

  /* 運動能力 */
  const vjS = numOrNull(st.pro.vjStand), vjR = numOrNull(st.pro.vjRun), sp = numOrNull(st.pro.sprint);
  const jumpArr = [];
  if (vjS !== null) jumpArr.push(zScore((vjS - B.vjStand[L][0]) / B.vjStand[L][1]));
  if (vjR !== null) jumpArr.push(zScore((vjR - B.vjRun[L][0]) / B.vjRun[L][1]));
  const comps = {
    jump: jumpArr.length ? avg(jumpArr) : prScore(st.ath.jump),
    speed: sp !== null ? zScore(-(sp - B.sprint[L][0]) / B.sprint[L][1]) : prScore(st.ath.speed),
    agility: prScore(st.ath.agility),
    endurance: prScore(st.ath.endurance),
    strength: prScore(st.ath.strength)
  };
  Object.keys(comps).forEach((k) => (comps[k] = Math.round(comps[k])));
  const A = Math.round(avg(Object.values(comps)));
  const proUsed = [vjS, vjR, sp].filter((x) => x !== null).length;
  notes.A = proUsed ? `用了 ${proUsed} 項專業數據，其餘依自評` : '依你的自評（相對同層級的 PR）';

  /* 身高（依位置調整；選了多個位置就取平均） */
  const h = numOrNull(st.height);
  const ps = posList(st);
  const off = ps.length ? avg(ps.map((p) => POS_OFF[p] || 0)) : 0;
  const hs = h !== null ? zScore((h - (B.height[L][0] + off)) / B.height[L][1]) : AVG;
  /* 體型：身高相對於「同層級、同位置」平均的標準差；≥+0.8 算高大，≤-0.8 算嬌小 */
  const sizeZ = h !== null ? (h - (B.height[L][0] + off)) / B.height[L][1] : null;

  /* 籃板：潛力（跳躍＋身高）＋比賽表現（自評） */
  const rebPot = Math.round(h !== null ? 0.6 * comps.jump + 0.4 * hs : comps.jump); /* 沒填身高就只看彈跳 */
  const rebPerf = Math.round(avg([prScore(st.reb.off), prScore(st.reb.def)]));
  const R = Math.round((rebPot + rebPerf) / 2);
  notes.R = `潛力 ${rebPot}（彈跳＋身高）／表現 ${rebPerf}（自評）`;

  /* 防守：潛力（敏捷、速度、耐力）＋比賽表現（自評） */
  /* 位置會影響防守的重點：長人看內線護框，後衛看外線與抄截；選了多個位置就取平均權重 */
  const bigShare = ps.length ? ps.filter((p) => p === 'C' || p === 'PF').length / ps.length : 0;
  const guardShare = ps.length ? ps.filter((p) => p === 'PG' || p === 'SG').length / ps.length : 0;
  const wPer = 0.34 + 0.18 * guardShare - 0.14 * bigShare, wRim = 0.33 - 0.13 * guardShare + 0.27 * bigShare, wSte = 1 - wPer - wRim;
  const defPot = Math.round(bigShare >= 0.5
    ? 0.3 * comps.agility + 0.2 * comps.speed + 0.2 * comps.endurance + 0.15 * comps.jump + 0.15 * comps.strength
    : 0.45 * comps.agility + 0.35 * comps.speed + 0.2 * comps.endurance);
  const defPerf = Math.round(wPer * prScore(st.defn.perimeter) + wRim * prScore(st.defn.rim) + wSte * prScore(st.defn.steal));
  const D = Math.round((defPot + defPerf) / 2);
  notes.D = `潛力 ${defPot}（敏捷＋速度＋耐力）／表現 ${defPerf}（自評）`;

  /* 投籃：命中率資料 ＋ 自評 */
  const parts = { three: shootPart(st, 'three', L), mid: shootPart(st, 'mid', L), ft: shootPart(st, 'ft', L) };
  const W = { three: 0.4, mid: 0.3, ft: 0.3 };
  const items = [[prScore(st.shoot.self), 0.4]];
  const used = [];
  for (const k of Object.keys(parts)) {
    if (parts[k]) { items.push([parts[k].score, W[k] * parts[k].conf]); used.push({ three: '三分', mid: '中距離', ft: '罰球' }[k]); }
  }
  const S = Math.round(wavg(items));
  notes.S = used.length ? `用了${used.join('、')}命中率，加上自評` : '沒有填命中率，依你的自評';

  /* 組織：運球等級 ＋ 傳球 */
  const skillGrades = [];
  DRIBBLE_SKILLS.forEach((s) => { const sc = gradeScore(st.dribble.skills[s]); if (sc !== null) skillGrades.push(sc); });
  (st.dribble.custom || []).forEach((c) => { const sc = gradeScore(c.grade); if (sc !== null) skillGrades.push(sc); });
  const overall = gradeScore(st.dribble.overall) ?? AVG;
  const dribble = skillGrades.length ? Math.round(0.5 * overall + 0.5 * avg(skillGrades)) : overall;
  const P = Math.round(0.6 * dribble + 0.4 * prScore(st.pass));
  notes.P = `運球 ${scoreGrade(dribble)}（${skillGrades.length} 項技能）＋傳球視野`;

  /* 球商 */
  const iqItems = [[prScore(st.iq.decision), 0.4]];
  const atr = { '3': 1.8, '2': 0.9, '1': 0, '0.5': -0.9 }[st.iq.atr];
  if (atr !== undefined) iqItems.push([zScore(atr), 0.25]);
  const fouls = { '1': 0.9, '2': 0.4, '3': -0.1, '4': -0.7, '5': -1.3 }[st.iq.fouls];
  if (fouls !== undefined) iqItems.push([zScore(fouls), 0.15]);
  const sel = { good: 1.0, mid: 0, bad: -1.1 }[st.iq.select];
  if (sel !== undefined) iqItems.push([zScore(sel), 0.2]);
  const I = Math.round(wavg(iqItems));
  notes.I = '決策自評、助攻失誤比、犯規、投籃選擇綜合';

  const axes = { S: clamp(S, 1, 99), P: clamp(P, 1, 99), D: clamp(D, 1, 99), R: clamp(R, 1, 99), A: clamp(A, 1, 99), I: clamp(I, 1, 99) };
  const ovr = clamp(Math.round(Object.keys(OVR_W).reduce((s, k) => s + axes[k] * OVR_W[k], 0)), 1, 99);
  return {
    axes, ovr, grade: scoreGrade(ovr), notes, comps, parts, dribble, sizeZ,
    potential: { R: rebPot, D: defPot }, perf: { R: rebPerf, D: defPerf }
  };
}

/* ---------- AI 評語（規則式，不是真的 AI） ---------- */
const ARCHS = [
  { name: '持球大核', avoidBig: true, line: '球在手上就是威脅，能自己創造出手，也能帶動隊友。',
    f: (c) => 0.35 * c.P + 0.35 * c.S + 0.15 * c.A + 0.15 * c.I + (c.h('運球急停跳投') || c.h('後仰跳投') || c.h('翻身後仰') ? 5 : 0) },
  { name: '單挑型側翼', req: ['SG', 'SF', 'PF'], line: '喜歡一對一，靠投籃和身體條件在邊線創造得分。',
    f: (c) => 0.4 * c.S + 0.25 * c.A + 0.2 * c.P + 0.15 * c.I + (c.h('後仰跳投') || c.h('翻身後仰') ? 6 : 0) + (c.inPos('SG', 'SF') ? 3 : 0) },
  { name: '接球射手', avoidBig: true, line: '空檔就是機會，出手快、命中穩，是隊友最想傳球的人。',
    f: (c) => 0.7 * c.S + 0.15 * c.I + 0.15 * c.A + (c.h('接球投籃') ? 8 : 0) + (c.h('底角三分') ? 3 : 0) - Math.max(0, c.P - c.S) * 0.3 },
  { name: '3&D 側翼', req: ['SG', 'SF', 'PF'], line: '能投三分，也能守人，是教練最愛的角色球員。',
    f: (c) => 0.4 * c.S + 0.4 * c.D + 0.2 * c.A + (c.inPos('SG', 'SF') ? 3 : 0) },
  { name: '攻守均衡型控衛', req: ['PG', 'SG'], line: '組織、得分、防守都不偏廢，是穩定的場上指揮官。',
    f: (c) => 0.3 * c.P + 0.25 * c.D + 0.2 * c.S + 0.25 * c.I - Math.abs(c.P - c.D) * 0.2 + (c.inPos('PG') ? 4 : 0) },
  { name: '組織型控衛', req: ['PG', 'SG'], line: '看得到空檔，傳得出球，讓全隊的進攻流動起來。',
    f: (c) => 0.5 * c.P + 0.3 * c.I + 0.2 * c.S + (c.inPos('PG') ? 4 : 0) },
  { name: '投射型長人', req: ['PF', 'C'], line: '身高臂長還能投外線，把對手的護框大個子拉出禁區。',
    f: (c) => 0.55 * c.S + 0.15 * c.D + 0.15 * c.R + 0.15 * c.I + (c.h('接球投籃') ? 6 : 0) + (c.h('底角三分') ? 3 : 0) },
  { name: '鎖防型球員', line: '防守是你的招牌，能把對位的人壓制到難受。',
    f: (c) => 0.7 * c.D + 0.15 * c.A + 0.15 * c.I },
  { name: '護框籃板型內線', req: ['PF', 'C'], line: '在籃下卡位、搶籃板、護框，內線的苦工都靠你。',
    f: (c) => 0.4 * c.R + 0.3 * c.D + 0.3 * c.A + (c.inPos('PF', 'C') ? 6 : 0) + (c.h('灌籃／空中終結') ? 3 : 0) },
  { name: '持球攻框型', line: '利用速度和爆發力強攻籃下，終結能力強。',
    f: (c) => 0.4 * c.A + 0.35 * c.P + 0.25 * c.S + (c.h('突破上籃') ? 6 : 0) + (c.h('灌籃／空中終結') ? 4 : 0) },
  { name: '攻守兼備前鋒', req: ['SF', 'PF'], line: '投籃、防守、籃板都能貢獻，是球隊的萬用拼圖。',
    f: (c) => 0.3 * c.S + 0.25 * c.D + 0.25 * c.R + 0.2 * c.A + (c.inPos('SF', 'PF') ? 4 : 0) },
  { name: '全能型球員', line: '六項能力都沒有明顯短板，放在哪個位置都能用。',
    f: (c) => avg([c.S, c.P, c.D, c.R, c.A, c.I]) + (Math.min(c.S, c.P, c.D, c.R, c.A, c.I) - AVG) * 0.3 },
  { name: '場上指揮官', line: '球商很高，懂得在對的時間做對的選擇。',
    f: (c) => 0.5 * c.I + 0.25 * c.P + 0.25 * c.D }
];

function analyze(st, stats) {
  const a = stats.axes;
  const habSet = new Set(st.habits || []);
  const hg = st.habitGrades || {};
  const sizeKind = stats.sizeZ == null ? null : stats.sizeZ >= 0.8 ? 'big' : stats.sizeZ <= -0.8 ? 'small' : null;
  const mine = posList(st);
  const c = { ...a, inPos: (...p) => p.some((x) => mine.includes(x)), h: (x) => habSet.has(x) };
  /* 位置不符的稱號扣分（沒選位置就不扣）；長人不適合「接球射手」「持球大核」這類後衛稱號 */
  const isBig = mine.length > 0 && mine.every((p) => p === 'C' || p === 'PF');
  const ranked = ARCHS.map((x) => {
    let score = x.f(c);
    if (x.req && mine.length && !x.req.some((p) => mine.includes(p))) score -= 25;
    if (x.avoidBig && isBig) score -= 14;
    return { ...x, score };
  }).sort((p, q) => q.score - p.score);
  const arch = [ranked[0], ranked[1]];

  const axSorted = AX.map((x) => ({ ...x, v: a[x.k] })).sort((p, q) => q.v - p.v);
  const top = axSorted[0], low = axSorted[5];
  const levelName = LEVELS[st.level].name;

  const nm = st.name.trim() || '這位球員';
  const o = stats.ovr;
  const comments = [];
  /* 第 1 句：依整體 OVR 的總評，太菜就直說，很強就浮誇 */
  comments.push(
    o < 56 ? `${nm}，說實話，你的數據慘到我想幫你報名新手教學。先從把球拿穩開始練吧。` :
    o < 66 ? `${nm}，你該練練了。整體連${levelName}的平均都沒摸到，球隊現在最需要你的位置是板凳上的加油團。` :
    o < 74 ? `${nm}，不上不下的路人水準。不會被嫌棄，但也不會被記住，想出頭就得補短板。` :
    o < 82 ? `${nm}，有料！在${levelName}裡你是會被點名「來我們這隊」的人。` :
    o < 90 ? `${nm}，危險人物。對手看到你上場，防守戰術會先改。` :
    o < 95 ? `${nm}，這數據太誇張了吧！在${levelName}根本是降維打擊，建議直接報名更高的層級。` :
    `${nm}，天啊！這張卡建議裱框掛牆，教練看到會哭、對手看到會退賽，我看到只想說：請收下我的膝蓋。`
  );
  /* 第 2 句：最弱的一項＋練法 */
  const TIPS = {
    S: '每天定點投 100 顆，先從罰球和籃下開始，手感是練出來的。',
    P: '左右手各運球 10 分鐘，眼睛不要盯著球，傳球前記得先抬頭。',
    D: '練側滑步和卡位，防守靠腳不是靠嘴。',
    R: '學會預判球的落點，卡位比跳得高更重要。',
    A: '深蹲、跳繩、折返跑，身體是一切的本錢。',
    I: '多看比賽、少亂投，傳球前先抬頭，球商是看出來的。'
  };
  comments.push(low.v < 75
    ? `最大的洞是${low.zh}（${low.v}）。${TIPS[low.k]}`
    : `連最弱的${low.zh}都有 ${low.v}，你根本沒有明顯短板，真的很煩（誇獎）。`);
  /* 第 3 句：最強的一項 */
  comments.push(
    top.v >= 94 ? `${top.zh} ${top.v}，這已經不是能力值，是藝術品！` :
    top.v >= 86 ? `${top.zh}高達 ${top.v}，是你的招牌，對手都知道卻擋不住。` :
    top.v >= 78 ? `${top.zh}（${top.v}）是你的招牌，繼續保持。` :
    `連最強的${top.zh}都只有 ${top.v}，先把一項練到能拿出來吹牛吧。`
  );
  /* 第 4 句：球風 */
  comments.push(`球風判定：「${arch[0].name}」，${arch[0].line}也有一點「${arch[1].name}」的影子。`);
  const hs = (st.habits || []).slice(0, 4).map((h) => (hg[h] ? h + ' ' + hg[h] : h));
  if (hs.length) comments.push(`招牌技能：${hs.join('、')}。`);
  const dR = stats.potential.R - stats.perf.R, dD = stats.potential.D - stats.perf.D;
  if (dR >= 8 || dD >= 8) {
    comments.push(`身體條件其實比你對自己${dR >= dD ? '籃板' : '防守'}的評價好，別再謙虛，上場多拚一點。`);
  } else if (dR <= -8 || dD <= -8) {
    comments.push(`你的${dR <= dD ? '籃板' : '防守'}表現比體能推算還突出，靠的是技巧和意識，聰明。`);
  }
  const goat = Object.values(a).every((v) => v >= 95);
  let verdict =
    o < 66 ? `你該練練${low.zh}了` : o < 74 ? `補強${low.zh}就能升級` : o < 82 ? '朋友場搶手貨' :
    o < 90 ? '對手的噩夢' : o < 95 ? '降維打擊' : '請收下我的膝蓋';
  if (goat) {
    verdict = '你就是 GOAT';
    comments[0] = `${nm}，六項能力全部爆表。你是籃球界的 GOAT，找不到你的模板，資料庫只能對你下跪。`;
  }

  /* NBA／WNBA 風格對照：比較「形狀」（扣掉平均後的六項高低） */
  const vec = AX.map((x) => a[x.k]);
  const centered = (v) => { const m = avg(v); return v.map((x) => x - m); };
  const cu = centered(vec);
  const norm = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  const sameGender = TEMPLATES.filter((t) => t.g === (st.gender === 'f' ? 'f' : 'm'));
  /* 位置優先：只在你選的位置（可複選）裡找；不到 3 位才放寬到相鄰位置。沒選位置就全部比。 */
  const ADJ = { PG: ['SG'], SG: ['PG', 'SF'], SF: ['SG', 'PF'], PF: ['SF', 'C'], C: ['PF'] };
  let cand = mine.length ? sameGender.filter((t) => t.pos.some((p) => mine.includes(p))) : sameGender;
  if (cand.length < 3) {
    const adj = new Set(mine.flatMap((p) => ADJ[p] || []));
    cand = cand.concat(sameGender.filter((t) => !cand.includes(t) && t.pos.some((p) => adj.has(p))));
  }
  /* 六項能力幾乎一樣高（沒有明顯特色）時，形狀比較沒有意義，降低相似度的可信權重 */
  const weight = Math.min(1, norm(cu) / 25);
  /* 扣將：有「灌籃」習慣（含自訂寫法）而且彈跳夠高時，把扣將加進候選，並保證至少 2 位出現在結果裡 */
  const dunkMode = [...habSet].some((h) => /灌籃|扣籃|dunk/i.test(h)) && stats.comps.jump >= 80;
  if (dunkMode) {
    const pool = sameGender.filter((t) => t.dk);
    const posPool = mine.length ? pool.filter((t) => t.pos.some((p) => mine.includes(p))) : pool;
    cand = cand.concat((posPool.length >= 2 ? posPool : pool).filter((t) => !cand.includes(t)));
  }
  const scored = cand.map((t) => {
    const ct = centered(t.v);
    const cos = ct.reduce((s, x, i) => s + x * cu[i], 0) / (norm(ct) * norm(cu));
    /* 技能等級達 A- 以上的「招牌技能」，如果剛好是這位球星的招牌，相似度大幅加成（A- +10、A +12、A+ +15 分）；如果是他的標誌性招牌（sig）再加 12 分；沒評等級的技能只加 4 分 */
    const boost = [];
    let skillBonus = 0;
    t.hab.forEach((x) => {
      if (!habSet.has(x)) return;
      const gi = GRADES.indexOf(hg[x]);
      if (gi >= GRADES.indexOf('A-')) {
        skillBonus += gi >= GRADES.indexOf('A+') ? 0.15 : gi >= GRADES.indexOf('A') ? 0.12 : 0.10;
        if (t.sig && t.sig.includes(x)) skillBonus += 0.12; /* 這位球星的標誌性招牌，再多加 12 分 */
        boost.push(x + ' ' + hg[x]);
      }
      else skillBonus += 0.04;
    });
    /* 體型：高大的對高大、嬌小的對嬌小加分；高大對嬌小則扣分（只有球星有標體型時才比） */
    const sizeBonus = t.size && sizeKind ? (t.size === sizeKind ? 0.06 : -0.05) : 0;
    const bonus = skillBonus + sizeBonus + (t.pos[0] === mine[0] ? 0.04 : 0) + (dunkMode && t.dk ? 0.06 : 0);
    return { t, dk: !!t.dk, boost, sim: clamp(Math.round(50 + 42 * cos * weight + bonus * 100), 40, 96) };
  }).sort((p, q) => q.sim - p.sim);
  let matches = scored.slice(0, dunkMode ? 4 : 3);
  if (dunkMode) {
    let n = matches.filter((m) => m.dk).length;
    const extra = scored.filter((m) => m.dk && !matches.includes(m));
    while (n < 2 && extra.length) {
      const idx = matches.map((m) => !m.dk).lastIndexOf(true);
      if (idx < 0) break;
      matches[idx] = extra.shift(); n++;
    }
    matches.sort((p, q) => q.sim - p.sim);
  }
  /* 彩蛋：罰球技能達 A- 以上，而且位置有後衛（男子）→ 直接觸發 SGA，名字後面揭曉小字「罰球之神」 */
  const ftSkill = GRADES.indexOf(hg['罰球']) >= GRADES.indexOf('A-') && habSet.has('罰球');
  if (ftSkill && st.gender !== 'f' && mine.some((p) => p === 'PG' || p === 'SG')) {
    const sga = TEMPLATES.find((t) => t.n === 'Shai Gilgeous-Alexander');
    const prev = scored.find((m) => m.t === sga);
    const pin = { t: sga, dk: false, boost: ['罰球 ' + hg['罰球']], sim: Math.min(96, Math.max(prev ? prev.sim : 0, 92)), sub: '罰球之神' };
    matches = [pin, ...matches.filter((m) => m.t !== sga)].slice(0, dunkMode ? 4 : 3);
  }
  if (goat) matches = [{ t: { n: 'G.O.A.T.', tag: '你是籃球界的 GOAT，找不到你的模板', goat: true, hab: [], pos: [] }, sim: 100, dk: false }];

  return { arch, comments, matches, top, low, levelName, verdict, dunkMode, goat };
}

/* ---------- 有趣標籤：依 OVR 與強弱項推薦，使用者自己勾選要不要放上卡片 ---------- */
const TAGS_BY_OVR = [
  [56, ['系隊飲水機球員', '場邊氣氛組組長', '我只是來運動的']],
  [66, ['熱身最強選手', '賽前拉伸冠軍', '板凳最佳啦啦隊']],
  [74, ['朋友場混分王', '週末戰士', '公園路人甲']],
  [82, ['球場常客', '被點名要的人', '社區小有名氣']],
  [90, ['對手的噩夢', '校園傳說', '球場恐怖分子']],
  [95, ['降維打擊', '教練的心頭肉', '球場 MVP 預定']],
  [100, ['請收下我的膝蓋', '籃球之神的親戚', '直接簽約吧']]
];
const TAGS_HIGH = {
  S: ['三分雨製造機', '空檔必殺'], P: ['助攻製造機', '場上導演'], D: ['鎖喉防守員', '防守一哥'],
  R: ['籃板怪', '禁區清道夫'], A: ['空中飛人', '體能怪物'], I: ['球場諸葛亮', '籃球智商 200']
};
const TAGS_LOW = {
  S: ['籃框不是你朋友', '磚匠'], P: ['運球靠運氣', '傳球靠緣分'], D: ['防守靠喊', '防守靠祈禱'],
  R: ['籃板靠緣分', '禁區觀光客'], A: ['跑兩趟就喘', '體能靠意志'], I: ['亂投大師', '球商在線上嗎']
};

/* 運球技能達到 A（含）以上，就解鎖「XX 大師」標籤；等級越高越前面 */
const MASTER_BASE = {
  '基本運球': '基本功', '變向過人': '變向', '胯下運球': '胯下', '背後運球': '背運',
  '後轉身': '轉身', '急停急起': '急停', '非慣用手運球': '雙手運球'
};
/* A ＝「XX 大師」，A+ ＝「XX 之神」 */
function masterTags(st) {
  const items = [];
  const add = (base, grade) => {
    const i = GRADES.indexOf(grade);
    if (i >= GRADES.indexOf('A')) items.push({ label: base + (i >= GRADES.indexOf('A+') ? '之神' : '大師'), i });
  };
  add('運球', st.dribble.overall);
  DRIBBLE_SKILLS.forEach((k) => add(MASTER_BASE[k], st.dribble.skills[k]));
  (st.dribble.custom || []).forEach((c) => add(c.name.replace(/(大師|之神)$/, ''), c.grade));
  return Array.from(new Set(items.sort((p, q) => q.i - p.i).map((x) => x.label)));
}

function recommendTags(stats, st) {
  const o = stats.ovr, a = stats.axes;
  if (Object.values(a).every((v) => v >= 95)) return ['籃球界的 GOAT', '請收下我的膝蓋', '籃球之神本神'];
  const out = st ? masterTags(st) : [];
  const tier = TAGS_BY_OVR.find(([lim]) => o < lim)[1];
  out.push(tier[0]);
  const sorted = AX.map((x) => ({ k: x.k, v: a[x.k] })).sort((p, q) => q.v - p.v);
  if (sorted[0].v >= 85) out.push(TAGS_HIGH[sorted[0].k][0]);
  if (sorted[5].v <= 65) out.push(TAGS_LOW[sorted[5].k][0]);
  out.push(tier[1]);
  if (sorted[1].v >= 88) out.push(TAGS_HIGH[sorted[1].k][1]);
  out.push(tier[2]);
  return Array.from(new Set(out));
}
