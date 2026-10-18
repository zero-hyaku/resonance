/* =========================================================
   사운드 — 배경음악 전환(페이드) + 효과음
   설정은 js/sound-config.js
   ========================================================= */
window.Sound = (function () {
  const CFG = window.SOUND_CONFIG || {};
  const FADE = CFG.fadeMs || 1400;
  const STORE = 'res-sound-on';

  let enabled = true;
  try { enabled = localStorage.getItem(STORE) !== '0'; } catch (e) { /* 저장소 없음 */ }

  /* ---------- 유튜브 ---------- */
  function ytId(url) {
    const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    return m ? m[1] : null;
  }
  function ytStart(url) {
    const m = String(url).match(/[?&](?:t|start)=(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  let ytApi = null;
  function loadYT() {
    if (ytApi) return ytApi;
    ytApi = new Promise(res => {
      if (window.YT && window.YT.Player) return res(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
    return ytApi;
  }
  let ytHost = null;
  function ytContainer() {
    if (ytHost) return ytHost;
    ytHost = document.createElement('div');
    ytHost.setAttribute('aria-hidden', 'true');
    ytHost.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;height:200px;overflow:hidden;opacity:0;pointer-events:none;';
    document.body.appendChild(ytHost);
    return ytHost;
  }

  /* ---------- 트랙 (파일 / 유튜브 공통) ---------- */
  function makeTrack(def) {
    if (!def || !def.src) return null;
    const base = def.volume == null ? 0.5 : def.volume;
    const id = ytId(def.src);
    let level = 0; // 0~1 페이드 위치

    if (id) {
      let player = null, ready = false, wantPlay = false;
      const el = document.createElement('div');
      ytContainer().appendChild(el);
      loadYT().then(YT => {
        player = new YT.Player(el, {
          width: 200, height: 200, videoId: id,
          playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, loop: 1, playlist: id, start: ytStart(def.src) },
          events: {
            onReady: () => { ready = true; player.setVolume(0); if (wantPlay) player.playVideo(); },
            onStateChange: e => { if (e.data === YT.PlayerState.ENDED) { player.seekTo(ytStart(def.src)); player.playVideo(); } }
          }
        });
      });
      return {
        play() { wantPlay = true; if (ready) player.playVideo(); },
        pause() { wantPlay = false; if (ready) player.pauseVideo(); },
        set(v) { level = v; if (ready) player.setVolume(Math.round(v * base * 100)); },
        get level() { return level; }
      };
    }

    const a = new Audio();
    a.src = def.src; a.loop = true; a.preload = 'auto'; a.volume = 0;
    return {
      play() { const p = a.play(); if (p && p.catch) p.catch(() => {}); },
      pause() { a.pause(); },
      set(v) { level = v; a.volume = Math.max(0, Math.min(1, v * base)); },
      get level() { return level; }
    };
  }

  /* ---------- 페이드 ---------- */
  const fades = new Map();
  function fade(track, to, done) {
    if (!track) return;
    cancelAnimationFrame(fades.get(track));
    const from = track.level, t0 = performance.now();
    const dur = Math.max(1, FADE * Math.abs(to - from));
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      track.set(from + (to - from) * p);
      if (p < 1) fades.set(track, requestAnimationFrame(step));
      else { fades.delete(track); if (done) done(); }
    })(t0);
  }

  /* ---------- 배경음악 ---------- */
  const tracks = {};
  function track(key) {
    if (!(key in tracks)) tracks[key] = makeTrack(key === 'main' ? CFG.main : (CFG.origins || {})[key]);
    return tracks[key];
  }
  let current = null;   // 지금 재생해야 하는 트랙 키
  let unlocked = false; // 브라우저 자동재생 제한 해제 여부

  function switchTo(key) {
    if (!track(key)) key = 'main';           // 곡이 없는 오리진은 기본 배경음악 유지
    if (key === current) return;
    const prev = current && track(current);
    current = key;
    if (prev) fade(prev, 0, () => { if (track(current) !== prev) prev.pause(); });
    startCurrent();
  }
  function startCurrent() {
    const t = current && track(current);
    if (!t || !enabled || !unlocked) return;
    t.play();
    fade(t, 1);
  }

  /* ---------- 효과음 ---------- */
  const sfxCache = {};
  const missing = new Set();
  function sfx(name) {
    if (!enabled || !unlocked) return;
    const def = (CFG.sfx || {})[name];
    if (!def || !def.src || missing.has(name)) return;
    let base = sfxCache[name];
    if (!base) {
      base = sfxCache[name] = new Audio(def.src);
      base.preload = 'auto';
      base.addEventListener('error', () => missing.add(name), { once: true });
    }
    const a = base.readyState >= 2 ? base.cloneNode() : base;
    a.volume = def.volume == null ? 0.5 : def.volume;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  }

  /* ---------- 자동재생 제한: 첫 사용자 입력 후 시작 ---------- */
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    startCurrent();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, unlock, { once: true, capture: true }));

  // 탭이 가려지면 조용히 줄였다가 돌아오면 다시
  document.addEventListener('visibilitychange', () => {
    const t = current && track(current);
    if (!t || !enabled || !unlocked) return;
    if (document.hidden) fade(t, 0, () => { if (document.hidden) t.pause(); });
    else { t.play(); fade(t, 1); }
  });

  function setEnabled(on) {
    enabled = on;
    try { localStorage.setItem(STORE, on ? '1' : '0'); } catch (e) { /* 저장소 없음 */ }
    const t = current && track(current);
    if (!t) return;
    if (on) startCurrent();
    else fade(t, 0, () => { if (!enabled) t.pause(); });
  }

  return {
    start() { switchTo('main'); },
    enterOrigin(id) { switchTo(id); },
    leaveOrigin() { switchTo('main'); },
    sfx,
    get enabled() { return enabled; },
    toggle() { setEnabled(!enabled); return enabled; }
  };
})();
