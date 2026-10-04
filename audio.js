/* 音效與背景音樂：全部用 Web Audio 即時合成，沒有任何音檔，所以沒有版權問題。
   想換成真的饒舌／熱血配樂：把無版權音檔放進 site/audio/，再把下面的 BGM_FILE 改成檔名即可。 */
const BGM_FILE = ''; /* 例如 'audio/bgm.mp3' */
const SOUND_KEY = 'hoop-sound';

const Sound = (() => {
  let ctx = null, master = null, musicGain = null, noiseBuf = null, timer = null, step = 0, nextT = 0, audioEl = null;
  let enabled = true, started = false;
  try { enabled = localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { /* 略過 */ }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.16;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
    musicGain.connect(lp); lp.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function tone(freq, t, dur, type, vol, dest, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, hp, dest) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || master); s.start(t); s.stop(t + dur + 0.02);
  }

  /* ---- 音效 ---- */
  const sfx = {
    click() { if (!enabled || !ensure()) return; const t = ctx.currentTime; tone(660, t, 0.06, 'square', 0.07); tone(990, t + 0.04, 0.07, 'square', 0.06); },
    pick() { if (!enabled || !ensure()) return; const t = ctx.currentTime; tone(520, t, 0.07, 'square', 0.08); tone(780, t + 0.06, 0.09, 'square', 0.08); },
    next() { if (!enabled || !ensure()) return; const t = ctx.currentTime; [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.06, 0.1, 'square', 0.07)); },
    back() { if (!enabled || !ensure()) return; const t = ctx.currentTime; [784, 523].forEach((f, i) => tone(f, t + i * 0.06, 0.1, 'square', 0.07)); },
    error() { if (!enabled || !ensure()) return; const t = ctx.currentTime; tone(180, t, 0.18, 'sawtooth', 0.08, null, 110); },
    bounce() { if (!enabled || !ensure()) return; const t = ctx.currentTime; tone(150, t, 0.12, 'sine', 0.2, null, 60); },
    done() {
      if (!enabled || !ensure()) return; const t = ctx.currentTime;
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.09, 0.16, 'square', 0.08));
      noise(t + 0.6, 0.5, 0.05, 6000);
    }
  };

  /* ---- 背景音樂：92 BPM 的輕快嘻哈鼓點 ---- */
  const ROOTS = [55, 43.65, 65.41, 49];            /* Am – F – C – G */
  const SCALE = [220, 261.63, 329.63, 392, 440, 523.25]; /* A 小調五聲 */
  const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0];
  const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
  const LEAD = [4, -1, 2, -1, 3, -1, 1, 2, 4, -1, 5, -1, 3, 2, -1, 0];

  function schedule() {
    const spb = 60 / 92 / 4; /* 十六分音符 */
    while (nextT < ctx.currentTime + 0.25) {
      const s = step % 16, bar = Math.floor(step / 16) % 4;
      if (KICK[s]) { tone(120, nextT, 0.16, 'sine', 0.9, musicGain, 45); }
      if (SNARE[s]) { noise(nextT, 0.14, 0.45, 1800, musicGain); tone(220, nextT, 0.08, 'triangle', 0.3, musicGain); }
      noise(nextT, s % 2 ? 0.03 : 0.05, s % 2 ? 0.1 : 0.18, 7000, musicGain);
      if (s % 4 === 0 || s === 6 || s === 10 || s === 14) tone(ROOTS[bar] * (s === 14 ? 2 : 1), nextT, 0.22, 'sawtooth', 0.32, musicGain);
      const li = LEAD[(s + bar * 3) % 16];
      if (li >= 0) tone(SCALE[li] * (bar === 1 ? 0.8 : 1), nextT, 0.12, 'square', 0.1, musicGain);
      nextT += spb; step++;
    }
  }

  function startMusic() {
    if (!enabled) return;
    if (BGM_FILE) {
      if (!audioEl) { audioEl = new Audio(BGM_FILE); audioEl.loop = true; audioEl.volume = 0.35; }
      audioEl.play().catch(() => {});
      return;
    }
    if (!ensure() || timer) return;
    if (ctx.state === 'suspended') ctx.resume();
    nextT = ctx.currentTime + 0.05; step = 0;
    timer = setInterval(schedule, 40);
  }
  function stopMusic() {
    if (audioEl) audioEl.pause();
    if (timer) { clearInterval(timer); timer = null; }
  }

  return {
    sfx,
    get enabled() { return enabled; },
    /* 第一次使用者操作後才能啟動（瀏覽器限制） */
    unlock() { if (started) return; started = true; if (ensure() && ctx.state === 'suspended') ctx.resume(); startMusic(); },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off'); } catch (e) { /* 略過 */ }
      if (enabled) { started = true; ensure(); if (ctx.state === 'suspended') ctx.resume(); startMusic(); sfx.pick(); } else stopMusic();
      return enabled;
    }
  };
})();
