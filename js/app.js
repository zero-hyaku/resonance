/* =========================================================
   RESONANCE — 앱 (부팅 / HUD / 창 / 팝업 / 프로필)
   ========================================================= */
(function () {
  const R = window.RES;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = window.Sound || { sfx() {}, start() {}, enterOrigin() {}, leaveOrigin() {}, toggle() { return false; }, enabled: false };

  const regionById = id => R.regions.find(r => r.id === id);
  const factionById = id => R.factions.find(f => f.id === id);
  const ch = id => R.characters[id];

  /* =========================================================
     이미지 슬롯 — 파일이 있으면 채우고, 없으면 자리 표시
     ========================================================= */
  const imgCache = new Map();
  function findImg(base) {
    if (imgCache.has(base)) return imgCache.get(base);
    const p = new Promise(res => {
      const exts = ['webp', 'png', 'jpg'];
      let i = 0;
      const next = () => {
        if (i >= exts.length) return res(null);
        const url = base + '.' + exts[i++];
        const im = new Image();
        im.onload = () => res(url);
        im.onerror = next;
        im.src = url;
      };
      next();
    });
    imgCache.set(base, p);
    return p;
  }
  function hydrate(root) {
    $$('[data-img]', root).forEach(async fig => {
      for (const base of fig.dataset.img.split('|')) {
        const url = await findImg(base);
        if (!url) continue;
        if (!fig.isConnected) return;
        const img = document.createElement('img');
        img.src = url; img.alt = fig.dataset.alt || ''; img.decoding = 'async';
        fig.prepend(img);
        requestAnimationFrame(() => fig.classList.add('has-img'));
        return;
      }
    });
  }
  const thumb = base => `${base}-thumb|${base}`;
  function slot(base, shape, label, extra) {
    return `<figure class="slot slot--${shape} ${extra || ''}" data-img="${esc(base)}" data-alt="${esc(label)}">
      <figcaption class="slot-ph"><b>${esc(label)}</b><span>IMAGE SLOT</span></figcaption></figure>`;
  }

  /* =========================================================
     텍스트 복호화 효과
     ========================================================= */
  const GLYPH = '▓▒░█<>/\\|#%&*+=?01ABCDEF';
  function scramble(el, text, dur) {
    if (reduceMotion) { el.textContent = text; return; }
    dur = dur || Math.min(1400, 300 + text.length * 4);
    const t0 = performance.now(), n = text.length;
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const k = Math.floor(p * n);
      let out = text.slice(0, k);
      const tail = Math.min(n - k, 28);
      for (let i = 0; i < tail; i++) {
        const c = text[k + i];
        out += c === ' ' || c === '\n' ? c : GLYPH[(Math.random() * GLYPH.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* =========================================================
     스포일러 — 본문은 열람 전까지 DOM에 넣지 않는다
     ========================================================= */
  const spoilers = new Map();
  let spoilerSeq = 0;
  function spoiler(title, text) {
    const id = 'sp' + (++spoilerSeq);
    spoilers.set(id, text);
    return `<div class="spoiler" data-spoiler="${id}">
      <div class="spoiler-h"><span class="mono">CLASSIFIED</span><b>${esc(title)}</b>
        <button type="button" class="spoiler-btn" data-reveal="${id}">열람 ▸</button></div>
      <div class="spoiler-body"><i class="redact"></i><i class="redact"></i><i class="redact"></i></div>
    </div>`;
  }
  function revealSpoiler(id) {
    const box = $(`[data-spoiler="${id}"]`);
    if (!box || box.classList.contains('is-open')) return;
    S.sfx('reveal');
    box.classList.add('is-open');
    $('.spoiler-btn', box).remove();
    $('.spoiler-h .mono', box).textContent = 'DECLASSIFIED';
    const body = $('.spoiler-body', box);
    body.innerHTML = '<p class="spoiler-text"></p>';
    scramble($('p', body), spoilers.get(id));
  }

  /* =========================================================
     공통 조각
     ========================================================= */
  const secH = (ko, en) => `<div class="sec-h"><span class="sq"></span><h3>${esc(ko)}</h3><span class="en">${esc(en)}</span></div>`;
  const meter = (n, max) => `<div class="meter ${n >= 5 ? 'meter--max' : ''}" aria-label="위협도 ${n}/${max || 5}">${Array.from({ length: max || 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
  const pinFor = (type, id) => R.markers.find(m => m.type === type && m.id === id);

  function wave(kind) {
    const paths = {
      aria: 'M0 6 C4 0 6 12 10 6 S16 0 18 6 S22 11 25 4 S30 10 33 6 S38 1 41 7 S44 6 46 6',
      requiem: 'M0 6 L6 6 L8 1 L10 11 L12 6 L18 6 L20 1 L22 11 L24 6 L30 6 L32 1 L34 11 L36 6 L46 6',
      chorus: 'M0 6 Q3 2 6 6 T12 6 T18 6 T24 6 T30 6 T36 6 T42 6 T46 6 M0 7 Q4 10 8 7 T16 7 T24 7 T32 7 T40 7 T46 7',
      noise: 'M0 6 L3 2 L5 9 L8 3 L10 10 L13 1 L15 8 L19 4 L21 11 L24 2 L27 9 L30 5 L33 10 L36 3 L39 8 L42 4 L46 7',
      static: 'M0 6 L46 6'
    };
    return `<svg class="wave-ico" viewBox="0 0 46 12" aria-hidden="true"><path d="${paths[kind]}"/></svg>`;
  }

  /* =========================================================
     01 WORLD
     ========================================================= */
  function visVoid() {
    const r = window.MapGeo.rng(11);
    let parts = '';
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 50 + r() * 45;
      const x = 100 + Math.cos(a) * d, y = 100 + Math.sin(a) * d;
      parts += `<circle class="v-void-p" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + r() * 1.2).toFixed(1)}" style="--tx:${(100 - x).toFixed(1)}px;--ty:${(100 - y).toFixed(1)}px;animation-delay:${(r() * 4).toFixed(2)}s"/>`;
    }
    return `<svg viewBox="0 0 200 200" aria-hidden="true">
      <circle class="v-void-ring" cx="100" cy="100" r="88" stroke-dasharray="2 5"/>
      <circle class="v-void-ring" cx="100" cy="100" r="66"/>
      <circle class="v-void-ring" cx="100" cy="100" r="46" stroke-opacity=".5"/>
      ${parts}
      <circle class="v-void-core" cx="100" cy="100" r="22"/>
      <path class="v-void-crack" d="M100 78 L94 60 L102 46 L96 22 M122 100 L140 96 L152 108 L178 104 M86 116 L72 132 L76 150 L60 172"/>
    </svg><span class="cap mono">VOID — R.E. 0</span>`;
  }
  function visPillars() {
    const hs = [86, 80, 94, 72, 90, 66];
    return `<div class="pillars-axis"></div><div class="pillars">${R.originOrder.map((id, i) => {
      const c = ch(id);
      return `<button type="button" class="pillar" data-profile="${id}" aria-label="${esc(c.name)} 프로필">
        <i style="height:${hs[i]}%;animation-delay:${0.5 + i * 0.08}s"></i><span>${esc(c.name)}</span><small>${esc(c.weapon)}</small></button>`;
    }).join('')}</div><span class="cap mono">6 VESSELS</span>`;
  }
  function visPair() {
    return `<svg viewBox="0 0 200 200" aria-hidden="true">
      <path class="v-wave" d="M78 96 C92 80 108 112 122 96"/>
      <path class="v-wave v-wave--2" d="M78 104 C92 120 108 88 122 104"/>
      <circle class="v-node" cx="50" cy="100" r="28"/>
      <rect class="v-node" x="124" y="72" width="56" height="56" transform="rotate(45 152 100)"/>
      <text class="v-node-t" x="50" y="104">지휘자</text>
      <text class="v-node-t" x="152" y="104">레조넌트</text>
      <text class="v-node-s" x="50" y="146">CONDUCTOR</text>
      <text class="v-node-s" x="152" y="150">RESONANT</text>
      <text class="v-node-s" x="100" y="40">RESONANCE</text>
      <path d="M70 172 H130" stroke="rgba(255,255,255,.2)" stroke-dasharray="2 3"/>
      <text class="v-node-s" x="100" y="186">VS. DISSONANT</text>
    </svg>`;
  }
  function renderWorld(tab) {
    if (tab === 'timeline') {
      const total = R.world.era.current;
      const pos = y => (y / total * 100).toFixed(3) + '%';
      const bar = R.timeline.map((t, i) => {
        if (t.kind === 'era') {
          return `<div class="tl-seg" style="left:${pos(t.from)};width:calc(${pos(t.to - t.from)} - 2px)"><span>${esc(t.tag)}</span></div>`;
        }
        const mid = (t.from + t.to) / 2;
        return `<div class="tl-pt ${t.kind === 'catastrophe' ? 'tl-pt--cat' : ''} ${t.kind === 'now' ? 'tl-pt--now' : ''}" style="left:${pos(mid)}">
          <button type="button" data-tl="${i}" aria-label="${esc(t.label + ' ' + t.tag)}" title="${esc(t.label + ' — ' + t.tag)}"></button></div>`;
      }).join('');
      const list = R.timeline.map((t, i) => `
        <li class="tl-item rv ${t.kind === 'catastrophe' ? 'tl-item--cat' : ''} ${t.kind === 'era' ? 'tl-item--era' : ''} ${t.kind === 'now' ? 'tl-item--now' : ''}" id="tl-${i}">
          <span class="tl-year">R.E. ${esc(t.label)}</span>
          <div><p class="tl-tag">${esc(t.tag)}${t.kind === 'catastrophe' ? '<em>DISASTER</em>' : ''}</p><p class="tl-text">${esc(t.text)}</p></div>
        </li>`).join('');
      return `
        <section class="sec">
          ${secH('재건력', 'REBUILT ERA · R.E.')}
          <p class="lede rv">세계가 한 번 끝나고 처음부터 다시 세워야 했던 해, 대침묵을 R.E. 0으로 센다. 현재는 <b>재건력 ${total}년</b>.</p>
        </section>
        <section class="sec rv">
          <p class="tl-zoom-note">SCALE 1 : ${total} YEARS — 마커를 누르면 해당 기록으로 이동</p>
          <div class="tl-bar"><div class="tl-track"></div>${bar}
            <div class="tl-scale"><span>0</span><span>500</span><span>1000</span><span>1500</span><span>2000</span><span>2500</span><span>${total}</span></div></div>
        </section>
        <ol class="tl-list">${list}</ol>`;
    }

    const visuals = { void: visVoid, pillars: visPillars, pair: visPair };
    const chapters = R.world.chapters.map(c => `
      <article class="chapter rv">
        <div class="ch-vis">${visuals[c.visual]()}</div>
        <div>
          <p class="ch-code">${esc(c.code)}</p>
          <h3 class="ch-title">${esc(c.title)}</h3>
          <p class="ch-en">${esc(c.en)}</p>
          <p class="para">${esc(c.text)}</p>
          ${c.visual === 'pair' ? `<div class="chips" style="margin-top:14px"><button type="button" class="chip chip--b" data-goto="system:conductor">지휘자 ▸</button><button type="button" class="chip chip--b" data-goto="system:resonant">레조넌트 ▸</button><button type="button" class="chip" data-goto="world:timeline">연표 ▸</button></div>` : ''}
          ${c.spoiler ? spoiler(c.spoiler.title, c.spoiler.text) : ''}
        </div>
      </article>`).join('');
    return `
      <section class="sec">${chapters}</section>
      <section class="sec">
        ${secH('주인공', 'PROTAGONIST')}
        <div class="protag rv">
          <div class="protag-card"><span class="mono">CONDUCTOR // MULTI-CONTRACT</span><p>${esc(R.protagonist.text)}</p></div>
          ${spoiler(R.protagonist.spoiler.title, R.protagonist.spoiler.text)}
        </div>
      </section>`;
  }

  /* =========================================================
     02 SYSTEM
     ========================================================= */
  function figHuman(x, y) {
    return `<circle class="d-human" cx="${x}" cy="${y}" r="8"/><path class="d-human" d="M${x} ${y + 8} V${y + 40} M${x - 14} ${y + 20} H${x + 14} M${x} ${y + 40} L${x - 10} ${y + 62} M${x} ${y + 40} L${x + 10} ${y + 62}"/>`;
  }
  function renderSystem(tab) {
    if (tab === 'resonant') {
      const n = R.resonant.grades.length;
      const tiers = R.resonant.grades.map((g, i) => {
        const w = 26 + i * 18;
        return `<div class="pyr rv">
          <div class="pyr-bar" style="--w:${w}%;--a:${(0.6 - i * 0.11).toFixed(2)};--inset:${i === 0 ? 50 : 9}%"><b>${esc(g.en.toUpperCase())}</b><span>${esc(g.name)}</span></div>
          <div class="pyr-d"><b>${esc(g.name)}</b><span class="chip ${i === 0 ? 'chip--inv' : ''}">${esc(g.note)}</span><p>${esc(g.text)}</p></div>
        </div>`;
      }).join('');
      return `
        <div class="hero-title rv"><span class="en">RESONANT</span><span class="ko">레조넌트</span></div>
        <section class="sec"><p class="lede rv">${esc(R.resonant.text)}</p></section>
        <section class="sec">${secH('등급', `GRADE · ${n} TIERS`)}<div class="pyramid">${tiers}</div></section>`;
    }
    if (tab === 'origin') {
      return `
        <div class="hero-title rv"><span class="en">ORIGIN</span><span class="ko">오리진</span><span class="chip chip--inv">6기 한정</span></div>
        <section class="sec"><p class="lede rv">${esc(R.originConcept.text)}</p></section>
        <section class="sec grid-2">
          <div class="callout callout--warn rv"><h4>계약의 위험<small>RISK</small></h4><p>${esc(R.originConcept.risk)}</p></div>
          <div class="callout rv"><h4>오리진의 본체<small>VESSEL</small></h4><p>${esc(R.originConcept.body)}</p></div>
        </section>
        <section class="sec">${secH('여섯 기둥', 'THE SIX')}
          <div class="omini">${R.originOrder.map(id => {
            const c = ch(id);
            return `<button type="button" class="rv" data-profile="${id}">${slot(thumb(c.img), 'portrait', c.en)}<span>${esc(c.name)}</span><small>${esc(c.weapon)} · ${esc(c.affiliation.split(' ')[0])}</small></button>`;
          }).join('')}</div>
        </section>`;
    }
    // conductor
    const C = R.conductor;
    const arm = `<svg viewBox="0 0 320 140" aria-hidden="true">
      ${figHuman(120, 34)}
      <path class="d-res" d="M134 54 L196 30" stroke-width="3"/><circle class="d-glow" cx="166" cy="42" r="26"/>
      <path class="d-arrow" d="M200 40 H244"/>
      <circle class="d-enemy" cx="270" cy="60" r="18"/><circle class="d-enemy" cx="270" cy="60" r="8"/>
      <text class="d-lbl" x="96" y="128">CONDUCTOR + WEAPON</text><text class="d-lbl" x="246" y="100">TARGET</text>
    </svg>`;
    const fam = `<svg viewBox="0 0 320 140" aria-hidden="true">
      ${figHuman(56, 34)}
      <path class="d-arrow" d="M76 58 H124"/>
      <rect class="d-res" x="140" y="34" width="44" height="44" transform="rotate(45 162 56)"/><circle class="d-fill" cx="162" cy="56" r="5"/>
      <path class="d-arrow" d="M196 56 H244"/>
      <circle class="d-enemy" cx="270" cy="60" r="18"/><circle class="d-enemy" cx="270" cy="60" r="8"/>
      <text class="d-lbl" x="24" y="128">REAR · BOOST</text><text class="d-lbl" x="130" y="128">AUTONOMOUS</text><text class="d-lbl" x="246" y="100">TARGET</text>
    </svg>`;
    return `
      <div class="hero-title rv"><span class="en">CONDUCTOR</span><span class="ko">지휘자</span></div>
      <section class="sec">
        <p class="lede rv">${esc(C.text)}</p>
        <div class="stat-row">${C.rules.map(r => `<div class="stat rv"><span class="mono">${esc(r.k)}</span><b>${esc(r.v)}</b></div>`).join('')}</div>
      </section>
      <section class="sec">${secH('전투 유형', 'COMBAT TYPE')}
        <div class="grid-2">
          ${[arm, fam].map((svg, i) => `<div class="ctype rv">${svg}<div class="ctype-b"><h4>${esc(C.types[i].name)}<small>${esc(C.types[i].en.toUpperCase())}</small></h4><p>${esc(C.types[i].text)}</p></div></div>`).join('')}
        </div>
      </section>`;
  }

  /* =========================================================
     03 THREAT
     ========================================================= */
  const gradeColor = ['#ffffff', 'var(--b1)', 'var(--b2)', 'var(--b3)', '#3a3a3a'];
  function renderThreat(tab) {
    const D = R.dissonant;
    if (tab === 'aria') {
      return `
        <div class="hero-title rv"><span class="en">ARIA FILE</span><span class="ko">아리아 개체 기록</span><span class="chip chip--inv">국가 재난급</span></div>
        <section class="sec"><p class="lede rv">지금까지 발견된 아리아는 모두 고유한 이름이 있다. 토벌된 개체는 총 3기. 아래는 공개된 기록이다.</p></section>
        ${R.arias.map(a => `
        <article class="aria rv">
          ${slot(a.img, 'portrait', a.erased ? 'DATA ERASED' : a.en, a.erased ? 'slot--erased' : '')}
          <div>
            <p class="ttl">「${esc(a.title)}」</p>
            <h4>${esc(a.name)}<small>${esc(a.en.toUpperCase())}</small></h4>
            <div class="aria-meta"><span class="stamp stamp--${a.statusKind}">${esc(a.status)}</span><span class="chip">${esc(a.era)}</span></div>
            <p class="aria-form">${esc(a.form)}</p>
            <p class="para">${esc(a.text)}</p>
            ${a.toll ? `<div class="toll"><b>${esc(a.toll)}</b><span>명 소멸 · 피해 규모</span></div>` : ''}
          </div>
        </article>`).join('')}`;
    }
    if (tab === 'dissonance') {
      const S = R.dissonance;
      return `
        <div class="hero-title rv"><span class="en">DISSONANCE</span><span class="ko">디소넌스 — 인간에서 디소넌트로</span></div>
        <section class="sec"><p class="lede rv">${esc(S.text)}</p></section>
        <section class="sec">${secH('변이 단계', 'MUTATION STAGES')}
          <div class="stages">${S.stages.map((s, i) => `
            ${i ? '<div class="stage-arrow rv">▶</div>' : ''}
            <div class="stage-card rv"><span class="mono">STAGE 0${i + 1} · ${esc(s.en.toUpperCase())}</span><b>${esc(s.name)}</b><p>${esc(s.text)}</p></div>`).join('')}
          </div>
        </section>
        <section class="sec rv">
          <div class="callout"><h4>사일런트 존 노출과 변이<small>EXPOSURE</small></h4>
            <p>결계 밖에서 사흘을 버티면 \'전조\' 단계가 시작된다. <button type="button" class="chip chip--b" data-goto="region:silent-zone">사일런트 존 기록 ▸</button></p></div>
        </section>`;
    }
    const keys = ['aria', 'requiem', 'chorus', 'noise', 'static'];
    return `
      <div class="hero-title rv"><span class="en">DISSONANT</span><span class="ko">디소넌트</span></div>
      <section class="sec"><p class="lede rv">${esc(D.text)}</p></section>
      <section class="sec">${secH('개체 분포', 'POPULATION RATIO')}
        <div class="ratio rv">${D.grades.map((g, i) => `<div class="ratio-seg" style="--r:${g.ratio};background:${gradeColor[i]}" title="${esc(g.name)} ${g.ratio}%">${g.ratio >= 5 ? `<span style="${i === 4 ? 'color:#ddd' : ''}">${esc(g.en.toUpperCase())} ${g.ratio}%</span>` : ''}</div>`).join('')}</div>
        <div class="ratio-legend rv"><span>◀ 위험</span><span>ARIA 1% · REQUIEM 5% · CHORUS 15% · NOISE 30% · STATIC 49%</span><span>흔함 ▶</span></div>
        <div class="grade-list">${D.grades.map((g, i) => `
          <div class="grade rv">
            <div class="grade-n"><b>${esc(g.name)}</b><span>${esc(g.en.toUpperCase())}</span><br><span class="chip ${i === 0 ? 'chip--inv' : ''}">${esc(g.cls)}</span></div>
            <p>${esc(g.text)}</p>
            <div class="grade-side">
              <div><span class="mono">SOUND</span>${wave(keys[i])}${esc(g.sound)}</div>
              <div><span class="mono">RESPONSE</span>${esc(g.vs)}</div>
            </div>
          </div>`).join('')}</div>
      </section>`;
  }

  /* =========================================================
     04 REGION
     ========================================================= */
  function zoneGrid(prefix, zones) {
    return `<div class="zones">${zones.map(z => `
      <button type="button" class="zone rv" data-zone="${prefix}/${z.id}">
        ${slot(thumb(`assets/img/zones/${prefix}-${z.id}`), 'card', z.en)}
        <span class="zone-n"><b>${esc(z.name)}</b><small>${esc(z.tag || '')}</small></span>
      </button>`).join('')}</div>`;
  }
  function renderRegion(id) {
    const r = regionById(id);
    const f = r.faction && factionById(r.faction);
    const parts = [];
    parts.push(`
      <div class="hero-title rv"><span class="en">${esc(r.en.toUpperCase())}</span><span class="ko">${esc(r.name)}</span>
        <div class="chips"><span class="chip chip--b">${esc(r.dir)}</span><span class="chip">“${esc(r.alias)}”</span></div></div>
      <div class="region-top rv">
        ${slot(r.img, 'wide', r.en)}
        <div class="region-meta">
          <div class="mm-wrap"><span class="mm-cap mono">VERTUM // ${esc(r.en.toUpperCase())}</span>${window.MapGeo.minimap({ highlight: r.id })}</div>
          <div class="threat"><div>${meter(r.threat)}<p class="threat-lbl">THREAT ${r.threat}/5 · ${esc(r.threatLabel)}</p></div>
            ${f ? `<button type="button" class="chip chip--b" data-goto="faction:${f.id}">${esc(f.name)} ▸</button>` : ''}</div>
        </div>
      </div>
      <section class="sec" style="margin-top:28px"><p class="lede rv">${esc(r.summary)}</p></section>`);

    parts.push(`<section class="sec">${secH('환경', 'ENVIRONMENT')}
      <p class="para rv">${esc(r.env)}</p>
      <div class="palette rv">${r.palette.map(p => `<div class="swatch"><i style="background:${p.hex}"></i><span>${esc(p.name)}<small>${p.hex.toUpperCase()}</small></span></div>`).join('')}</div>
      ${r.extra ? `<div class="extra-grid">${r.extra.map(x => `<div class="callout rv"><h4>${esc(x.title)}<small>${esc(x.en.toUpperCase())}</small></h4><p>${esc(x.text)}</p></div>`).join('')}</div>` : ''}
    </section>`);

    if (r.depth) {
      parts.push(`<section class="sec">${secH('심도', 'DEPTH')}
        <div class="depth rv">${r.depth.map((d, i) => `
          <div class="depth-row"><span class="depth-lv">${i < 3 ? 'L' + (i + 1) : '∅'}</span>
            <div class="depth-n"><b>${esc(d.name)}</b><small>${esc(d.en.toUpperCase())}</small><p>${esc(d.state)}</p></div>
            <div class="depth-who"><span class="mono">ENDURANCE</span>${esc(d.who)}</div></div>`).join('')}</div>
      </section>
      <section class="sec">${secH('결계 밖 노출 시간에 따른 변화', 'EXPOSURE')}
        <div class="exposure rv">${r.exposure.map((e, i) => `
          <div class="exp"><i class="exp-bar" style="--p:${(i + 1) / r.exposure.length}"></i><span class="mono">T+${i + 1}</span><b>${esc(e.t)}</b><p>${esc(e.s)}</p></div>`).join('')}</div>
      </section>
      <section class="sec rv"><div class="callout"><h4>트레몰로 라인<small>TREMOLO LINE</small></h4><p>${esc(R.continentInfo.transit)}</p></div></section>`);
    }

    parts.push(`<section class="sec">${secH(r.depth ? '주요 지점' : '구역', `${r.depth ? 'POINTS' : 'DISTRICTS'} · ${r.zones.length}`)}${zoneGrid(r.id, r.zones)}</section>`);

    if (r.life) {
      parts.push(`<section class="sec">${secH('생활상', 'DAILY LIFE')}
        <div class="tiles">${r.life.map(l => `<div class="tile rv"><span class="tile-k">${esc(l.k)}</span><p>${esc(l.t)}</p></div>`).join('')}</div></section>`);
    }
    parts.push(`<section class="sec">${secH('디소넌트 위협도', 'THREAT LEVEL')}
      <div class="callout rv"><h4>${esc(r.threatLabel)}<small>LEVEL ${r.threat}</small></h4><p>${esc(r.threatText)}</p></div></section>`);
    return parts.join('');
  }

  /* =========================================================
     05 FACTION
     ========================================================= */
  function memberRole(c) {
    if (c.kind === 'origin') return c.position ? `오리진 · ${c.position}` : '오리진';
    if (c.kind === 'conductor') return `${c.position} · 지휘자`;
    if (c.kind === 'resonant') return `${c.grade} · ${ch(c.partner).name}의 레조넌트`;
    return c.position || '';
  }
  function memberCard(id) {
    const c = ch(id);
    return `<button type="button" class="member rv ${c.kind === 'origin' ? 'member--origin' : ''}" data-profile="${id}">
      ${slot(thumb(c.img), 'portrait', c.en)}
      <span class="member-n"><b>${esc(c.name)}</b><small>${esc(memberRole(c))}</small></span></button>`;
  }
  function renderFaction(id) {
    const f = factionById(id);
    const r = regionById(f.region);
    const pin = pinFor('faction', f.id);
    return `
      <div class="hero-title rv"><span class="en">${esc(f.en.toUpperCase())}</span><span class="ko">${esc(f.name)}</span>
        <div class="chips"><span class="chip chip--b">${esc(f.loc)}</span></div></div>
      <blockquote class="motto rv"><p>${esc(f.motto)}</p><small>DOCTRINE // 행동 이념</small></blockquote>
      <div class="region-top rv">
        ${slot(f.img, 'wide', f.en)}
        <div class="region-meta">
          <div class="mm-wrap"><span class="mm-cap mono">LOCATION // ${esc(r.en.toUpperCase())}</span>${window.MapGeo.minimap({ highlight: r.id, pins: [{ x: pin.x, y: pin.y, label: f.name }] })}</div>
          <div><button type="button" class="chip chip--b" data-goto="region:${r.id}">${esc(r.name)} 지역 기록 ▸</button></div>
        </div>
      </div>
      <section class="sec" style="margin-top:28px">
        <p class="lede rv">${esc(f.text)}</p>
        <div class="stance rv"><span class="mono">${esc(f.stance.label)}</span><b>${esc(f.stance.value)}</b></div>
      </section>
      <section class="sec">${secH('주요 업무', 'OPERATIONS')}
        <div class="duties">${f.duties.map((d, i) => `<div class="duty rv"><span>0${i + 1}</span><p>${esc(d)}</p></div>`).join('')}</div></section>
      <section class="sec">${secH('생활상', 'CODE OF LIFE')}<p class="para rv">${esc(f.life)}</p></section>
      ${f.halls ? `<section class="sec">${secH(f.halls.title, 'TEMPLE OF THE HOLY ARK')}<p class="para rv" style="margin-bottom:16px">${esc(f.halls.text)}</p>${zoneGrid('ark', f.halls.zones)}</section>` : ''}
      <section class="sec">${secH('구성원', `MEMBERS · ${f.members.length}`)}
        <div class="members">${f.members.map(memberCard).join('')}</div></section>`;
  }

  /* =========================================================
     06 ORIGINS / 07 PERSONNEL
     ========================================================= */
  function renderOrigins() {
    const n = R.originOrder.length;
    const ang = i => (i / n) * Math.PI * 2 - Math.PI / 2;
    const spokes = R.originOrder.map((_, i) => {
      const a = ang(i);
      return `<line x1="${(50 + Math.cos(a) * 25).toFixed(2)}" y1="${(50 + Math.sin(a) * 25).toFixed(2)}" x2="${(50 + Math.cos(a) * 27.5).toFixed(2)}" y2="${(50 + Math.sin(a) * 27.5).toFixed(2)}"/>`;
    }).join('');
    const nodes = R.originOrder.map((id, i) => {
      const c = ch(id), a = ang(i);
      return `<div class="onode ${i === 0 ? 'onode--top' : ''}" style="left:${(50 + Math.cos(a) * 41).toFixed(2)}%;top:${(50 + Math.sin(a) * 41).toFixed(2)}%">
        <button type="button" class="onode-btn rv" data-profile="${id}">
          ${slot(thumb(c.img), 'square', c.en, 'slot--round')}
          <span class="onode-n"><span class="mono">ORIGIN 0${i + 1}</span><b>${esc(c.name)}</b><small>${esc(c.en.toUpperCase())} · ${esc(c.weapon)}</small></span>
        </button></div>`;
    }).join('');
    return `
      <div class="orbit-wrap"><div class="orbit">
        <div class="orbit-glow" aria-hidden="true"></div>
        <svg class="orbit-svg" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="41" class="ob-ring"/>
          <circle cx="50" cy="50" r="47" class="ob-ring ob-ring--dash"/>
          <circle cx="50" cy="50" r="25" class="ob-ring ob-ring--in"/>
          <circle cx="50" cy="50" r="25" class="ob-ring ob-ring--in-glow"/>
          <g class="ob-spokes">${spokes}</g>
        </svg>
        <div class="orbit-core"><div class="rv">
          <span class="mono">AXIS OF THE WORLD</span>
          <h3>THE SIX<br>ORIGINS</h3>
          <p class="orbit-ko">세계를 지탱하는 여섯 기둥</p>
          <p class="orbit-text">${esc(R.originConcept.text.split('. ').slice(0, 2).join('. '))}</p>
        </div></div>
        ${nodes}
      </div></div>`;
  }
  function renderPersonnel() {
    const pairs = R.factions.map(f => {
      const ids = f.members.filter(id => ch(id).kind !== 'origin');
      return `<div class="pair rv"><div class="pair-h"><span>${esc(f.name)}</span><span class="mono">CONTRACT PAIR</span></div>
        <div class="pair-g">${memberCard(ids[0])}<span class="pair-link"><i></i></span>${memberCard(ids[1])}</div></div>`;
    }).join('');
    return `
      <div class="hero-title rv"><span class="en">PERSONNEL</span><span class="ko">인물 기록</span></div>
      <section class="sec">${secH('기관 지휘자 · 레조넌트', 'CONDUCTOR & RESONANT')}<div class="pairs">${pairs}</div></section>
      <section class="sec">${secH('동반자', 'COMPANION')}<div class="members" style="max-width:420px">${memberCard('flutter')}</div></section>
      <section class="sec rv"><div class="callout"><h4>오리진 기록은 별도 분류<small>ORIGINS</small></h4><p>여섯 오리진의 프로필은 <button type="button" class="chip chip--b" data-open-win="origins">06 ORIGINS ▸</button>에서 열람할 수 있다.</p></div></section>`;
  }

  /* =========================================================
     창 시스템
     ========================================================= */
  const WIN = {
    world: { code: '01 / WORLD', title: 'WORLD', ko: '세계의 시작', tabs: [['origin', '기원'], ['timeline', '연표']], render: renderWorld },
    system: { code: '02 / RESONANCE', title: 'RESONANCE', ko: '공명 체계', tabs: [['conductor', '지휘자'], ['resonant', '레조넌트'], ['origin', '오리진']], render: renderSystem },
    threat: { code: '03 / DISSONANT', title: 'DISSONANT', ko: '디소넌트', tabs: [['grades', '등급'], ['aria', '아리아 기록'], ['dissonance', '디소넌스']], render: renderThreat },
    region: { code: '04 / REGIONS', title: 'REGIONS', ko: '지역', tabs: R.regions.map(r => [r.id, r.name]), render: renderRegion },
    faction: { code: '05 / FACTIONS', title: 'FACTIONS', ko: '기관', tabs: R.factions.map(f => [f.id, f.name]), render: renderFaction },
    origins: { code: '06 / ORIGINS', title: 'ORIGINS', ko: '오리진', tabs: null, render: renderOrigins },
    personnel: { code: '07 / PERSONNEL', title: 'PERSONNEL', ko: '인물', tabs: null, render: renderPersonnel }
  };
  const winLayer = $('#window-layer');
  const popLayer = $('#popup-layer');
  let cur = null; // { key, tab, el }

  function stagger(root) {
    $$('.rv', root).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 16)));
  }

  function openWindow(key, tab) {
    const def = WIN[key];
    if (!def) return;
    tab = tab || (def.tabs ? def.tabs[0][0] : null);
    if (cur && cur.key === key) { if (tab !== cur.tab) switchTab(tab); return; }
    if (cur) cur.el.remove();
    S.sfx('open');

    const el = document.createElement('section');
    el.className = 'win';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', def.ko);
    el.innerHTML = `
      <header class="win-head"><span class="win-code mono">${def.code}</span>
        <h2 class="win-title"><span data-decode>${def.title}</span><small>${esc(def.ko)}</small></h2>
        <button type="button" class="x-btn" data-close>✕ CLOSE</button></header>
      ${def.tabs ? `<nav class="win-tabs" role="tablist">${def.tabs.map(([id, label], i) => `<button type="button" role="tab" data-tab="${id}"><small>0${i + 1}</small>${esc(label)}</button>`).join('')}</nav>` : ''}
      <div class="win-body"></div>
      <footer class="win-foot mono"><span>RESONANCE ARCHIVE // ${def.title}</span><span>ESC: CLOSE</span></footer>`;
    winLayer.appendChild(el);
    winLayer.classList.add('has-win');
    cur = { key, tab: null, el };
    fillBody(tab, false);
    scramble($('[data-decode]', el), def.title, 600);
    $$('.menu [data-open]').forEach(b => b.classList.toggle('is-active', b.dataset.open === key));
    globe && globe.pause(true);
    setTimeout(() => $('[data-close]', el).focus({ preventScroll: true }), 50);
  }
  function fillBody(tab, swap) {
    const def = WIN[cur.key];
    const body = $('.win-body', cur.el);
    cur.tab = tab;
    body.classList.toggle('is-swap', !!swap);
    body.innerHTML = def.render(tab);
    body.scrollTop = 0;
    stagger(body);
    hydrate(body);
    $$('[data-tab]', cur.el).forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on);
      if (on) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }
  function switchTab(tab) { fillBody(tab, true); }
  function closeWindow() {
    if (!cur) return;
    const el = cur.el;
    cur = null;
    S.sfx('close');
    el.classList.add('is-off');
    $$('.menu [data-open]').forEach(b => b.classList.remove('is-active'));
    setTimeout(() => { el.remove(); if (!cur) winLayer.classList.remove('has-win'); }, reduceMotion ? 0 : 320);
    if (!popStack.length) globe && globe.pause(false);
  }

  /* ---------- 팝업 ---------- */
  const popStack = [];
  function openPop(html, opts) {
    const el = document.createElement('div');
    el.className = 'pop ' + (opts.cls || '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="pop-head"><span class="mono">${esc(opts.code)}</span><button type="button" class="x-btn" data-pop-close>✕</button></div><div class="pop-body">${html}</div>`;
    popLayer.appendChild(el);
    popLayer.classList.add('has-pop');
    popStack.push(el);
    S.sfx('open');
    hydrate(el);
    globe && globe.pause(true);
    setTimeout(() => $('[data-pop-close]', el).focus({ preventScroll: true }), 50);
    return el;
  }
  function closePop() {
    const el = popStack.pop();
    if (!el) return;
    S.sfx('close');
    if (el.classList.contains('pop--profile') || el.classList.contains('dossier')) S.leaveOrigin();
    el.classList.add('is-off');
    setTimeout(() => { el.remove(); if (!popStack.length) popLayer.classList.remove('has-pop'); }, reduceMotion ? 0 : 300);
    if (!popStack.length && !cur) globe && globe.pause(false);
  }

  function zoneLookup(key) {
    const [prefix, zid] = key.split('/');
    if (prefix === 'ark') {
      const z = factionById('ark').halls.zones.find(z => z.id === zid);
      return { z, where: '성궤 신전', en: 'TEMPLE OF THE HOLY ARK', img: `assets/img/zones/ark-${zid}` };
    }
    const r = regionById(prefix);
    return { z: r.zones.find(z => z.id === zid), where: r.name, en: r.en.toUpperCase(), img: `assets/img/zones/${prefix}-${zid}` };
  }
  function openZone(key) {
    const { z, where, en, img } = zoneLookup(key);
    openPop(`<div class="zp">${slot(img, 'card', z.en)}
      <h4>${esc(z.name)}<small>${esc(z.en.toUpperCase())}</small></h4>
      <div class="chips"><span class="chip chip--b">${esc(where)}</span>${z.tag ? `<span class="chip">${esc(z.tag)}</span>` : ''}</div>
      <p>${esc(z.desc)}</p></div>`, { code: `DISTRICT // ${en}` });
  }

  /* ---------- 프로필 ---------- */
  const KIND = { origin: '오리진', conductor: '지휘자', resonant: '레조넌트', dissonant: '디소넌트' };
  function profileLeft(id, past) {
    const c = ch(id);
    const imgs = past ? `${c.img}-past|${c.img}` : c.img;
    const chips = [`<span class="chip chip--b">${KIND[c.kind]}</span>`];
    if (c.grade && c.kind !== 'origin') chips.push(`<span class="chip">${esc(c.grade)}</span>`);
    if (c.combat) chips.push(`<span class="chip">${esc(c.combat)}</span>`);
    if (past) chips.push('<span class="chip chip--inv">BEYONDER</span>');
    return `
      ${slot(imgs, 'portrait', c.en)}
      <h3 class="pf-name">${esc(c.name)}</h3>
      <p class="pf-en">${esc(c.en.toUpperCase())}</p>
      <div class="chips">${chips.join('')}</div>
      ${c.partner ? `<button type="button" class="pf-partner" data-profile="${c.partner}"><span><span class="mono">CONTRACT ↔ </span>${esc(ch(c.partner).name)}</span><span>▸</span></button>` : ''}
      ${c.past ? `<button type="button" class="pf-switch" data-past="${id}">
        <span class="mono">${past ? 'RETURN // CURRENT RECORD' : 'SPOILER // BEYONDER RECORD'}</span>
        <span>${past ? '◂ 현재 기록으로 돌아가기' : '초월자 시절 기록 열람 ▸'}</span></button>` : ''}`;
  }
  function profileNow(id) {
    const c = ch(id);
    const row = (k, v, wide) => `<div class="${wide ? 'wide' : ''}"><dt>${k}</dt><dd>${esc(v || '—')}</dd></div>`;
    const rows = [
      row('이름', `${c.name} (${c.en})`),
      row('구분', KIND[c.kind]),
      row('나이', c.age),
      row('성별', c.gender),
      row('직위', c.position),
      row('등급', c.grade),
      row('본체 위치', c.body),
      row('소속', c.affiliation)
    ];
    if (c.kind === 'origin') rows.push(row('무기', c.weapon), row('각성', c.awaken), row('계약 이력', c.contracts, true));
    if (c.kind === 'resonant') rows.push(row('전투 유형', c.combat), row('무기 형태', c.weapon));
    const sec = (ko, en, inner) => inner ? `<section class="pf-sec rv"><h5>${ko}<span>${en}</span></h5>${inner}</section>` : '';
    const p = t => t ? `<p>${esc(t)}</p>` : '';
    return `
      <dl class="pf-basic rv">${rows.join('')}</dl>
      ${sec('직책', 'DUTY', p(c.duty))}
      ${sec('외형', 'APPEARANCE', p(c.appearance))}
      ${sec('성격', 'PERSONALITY', p(c.personality))}
      ${sec('특징', 'TRAITS', p(c.traits))}
      ${sec('능력', 'ABILITY', c.ability ? `<div class="ability"><b>${esc(c.ability.name)}</b><p>${esc(c.ability.text)}</p></div>` : '')}
      ${sec('행적', 'RECORD', p(c.history))}
      ${sec('계약 이력', 'CONTRACT LOG', c.contractLog ? `<ol class="clog">${c.contractLog.map((l, i) => `<li><b>#${i + 1} · ${esc(l.at)}</b>${esc(l.text)}</li>`).join('')}</ol>` : '')}
      ${c.spoiler ? `<section class="pf-sec rv">${spoiler('기밀 기록', c.spoiler)}</section>` : ''}`;
  }
  function profilePast(id) {
    const c = ch(id), P = c.past;
    return `
      <div class="past-head rv"><span class="mono">CLASSIFIED // BEYONDER RECORD</span>
        <h3 class="past-name">${esc(P.trueEn.toUpperCase())}<small>${esc(P.trueName)} — ${esc(P.title)}</small></h3></div>
      <section class="pf-sec rv"><h5>과거<span>BEFORE THE SILENCE</span></h5><p>${esc(P.text)}</p></section>
      <section class="pf-sec rv"><h5>시련<span>TRIAL</span></h5>
        <div class="trial"><span class="mono">TRIAL OF ${esc(P.trueEn.toUpperCase())}</span><h6>${esc(P.trial.name)}</h6><small>${esc(P.trial.en.toUpperCase())}</small>
          <p>${esc(P.trial.text)}</p><q>${esc(P.trial.question)}</q></div></section>`;
  }
  function profileHTML(id, past) {
    return `<div class="profile ${past ? 'is-past' : ''}" data-pf="${id}">
      <div class="pf-left">${profileLeft(id, past)}</div>
      <div class="pf-right">${past ? profilePast(id) : profileNow(id)}</div></div>`;
  }
  /* ---------- 오리진 상세 — 전체 화면 ---------- */
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
  function dossierBody(id, past, full) {
    const c = ch(id);
    const idx = R.originOrder.indexOf(id) + 1;
    const fact = (k, v) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`;
    const more = `<button type="button" class="ds-more" data-more>${full ? '◂ 요약으로 돌아가기' : '상세 기록 열람 ▸'}</button>`;
    if (past) {
      const P = c.past;
      return `
        <div class="ds-hero rv">
          <span class="ds-code mono">CLASSIFIED // BEYONDER RECORD · ORIGIN 0${idx}</span>
          <h2 class="ds-name"><span>${esc(P.trueEn.toUpperCase())}</span></h2>
          <p class="ds-ko">${esc(P.trueName)} <span>— ${esc(P.title)}</span></p>
          ${full ? '' : `<dl class="ds-facts">${fact('본명', `${P.trueName} (${P.trueEn})`)}${fact('칭호', P.title)}${fact('시련', `${P.trial.name} · ${P.trial.en}`)}</dl>`}
          ${more}
        </div>
        ${full ? `
        <section class="pf-sec rv"><h5>과거<span>BEFORE THE SILENCE</span></h5><p>${esc(P.text)}</p></section>
        <section class="pf-sec rv"><h5>시련<span>TRIAL</span></h5>
          <div class="trial"><span class="mono">TRIAL OF ${esc(P.trueEn.toUpperCase())}</span><h6>${esc(P.trial.name)}</h6><small>${esc(P.trial.en.toUpperCase())}</small>
            <p>${esc(P.trial.text)}</p><q>${esc(P.trial.question)}</q></div></section>` : ''}`;
    }
    return `
      <div class="ds-hero rv">
        <span class="ds-code mono">ORIGIN 0${idx} // VESSEL : ${esc(c.weapon)}</span>
        <h2 class="ds-name"><span>${esc(c.en.toUpperCase())}</span></h2>
        <p class="ds-ko">${esc(c.name)} <span>— ${esc(c.affiliation)}${c.position ? ' · ' + esc(c.position) : ''}</span></p>
        ${full ? '' : `<dl class="ds-facts">${fact('무기', c.weapon)}${fact('본체 위치', c.body)}${fact('각성', c.awaken)}${fact('고유 능력', c.ability.name)}</dl>`}
        ${more}
      </div>
      ${full ? profileNow(id) : ''}`;
  }
  // 이름이 길어도 줄바꿈 없이 한 줄에 들어오도록 글자 크기를 맞춘다
  function fitName(el) {
    const h = el && $('.ds-name', el);
    if (!h) return;
    const span = h.firstElementChild;
    h.style.fontSize = '';
    const room = h.clientWidth, w = span.scrollWidth;
    if (w > room) h.style.fontSize = (parseFloat(getComputedStyle(h).fontSize) * room / w * 0.92) + 'px';
  }
  window.addEventListener('resize', () => $$('.dossier').forEach(fitName));
  function renderDossier(el, id, past, full, swap) {
    el.classList.toggle('is-full', full);
    const body = $('.ds-body', el);
    body.innerHTML = dossierBody(id, past, full);
    $('.ds-scroll', el).scrollTop = 0;
    if (swap) body.classList.add('is-swap'); else body.classList.remove('is-swap');
    stagger(body);
    fitName(el);
  }
  function openDossier(id) {
    const c = ch(id);
    const bgNow = `${c.img}-bg|${c.img}`;
    const bgPast = `${c.img}-past-bg|${c.img}-past|${bgNow}`;
    const el = document.createElement('div');
    el.className = 'pop pop--dossier dossier' + (c.side === 'right' ? ' dossier--right' : '');
    el.dataset.pf = id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', `${c.name} 프로필`);
    el.style.setProperty('--ac', c.color);
    el.style.setProperty('--ac-rgb', hexRgb(c.color));
    el.innerHTML = `
      <div class="ds-bg ds-bg--now"><figure class="ds-img" data-img="${esc(bgNow)}" data-alt="${esc(c.en)}"></figure></div>
      <div class="ds-bg ds-bg--past"><figure class="ds-img" data-img="${esc(bgPast)}" data-alt="${esc(c.past.trueEn)}"></figure></div>
      <div class="ds-mark" aria-hidden="true">${esc(c.en.toUpperCase())}</div>
      <div class="ds-shade" aria-hidden="true"></div>
      <header class="ds-top">
        <span class="ds-top-code mono"><i></i>PERSONNEL FILE // ORIGIN // ${esc(c.en.toUpperCase())}</span>
        <button type="button" class="ds-past" data-past="${id}"><span class="mono">SPOILER</span><b>초월자 시절 기록 열람 ▸</b></button>
        <button type="button" class="x-btn" data-pop-close>✕ CLOSE</button>
      </header>
      <div class="ds-scroll"><div class="ds-body"></div></div>`;
    popLayer.appendChild(el);
    popLayer.classList.add('has-pop');
    popStack.push(el);
    S.sfx('open');
    renderDossier(el, id, false, false);
    hydrate(el);
    if (document.fonts) document.fonts.ready.then(() => fitName(el));
    globe && globe.pause(true);
    setTimeout(() => $('[data-pop-close]', el).focus({ preventScroll: true }), 50);
  }
  function toggleDossier(el, id) {
    const past = !el.classList.contains('is-past');
    S.sfx('reveal');
    el.classList.toggle('is-past', past);
    el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
    renderDossier(el, id, past, false, true);
    $('.ds-past b', el).textContent = past ? '◂ 현재 기록으로 돌아가기' : '초월자 시절 기록 열람 ▸';
    $('.ds-past .mono', el).textContent = past ? 'RETURN' : 'SPOILER';
    $('.ds-mark', el).textContent = (past ? ch(id).past.trueEn : ch(id).en).toUpperCase();
    if (past) scramble($('.ds-name span', el), ch(id).past.trueEn.toUpperCase(), 900);
  }

  function openProfile(id) {
    if (ch(id).kind === 'origin') S.enterOrigin(id); else S.leaveOrigin();
    if (ch(id).kind === 'origin') { openDossier(id); return; }
    const top = popStack[popStack.length - 1];
    const code = c => `PERSONNEL FILE // ${c.en.toUpperCase()}`;
    if (top && top.classList.contains('pop--profile')) {
      // 같은 팝업 안에서 교체 (계약 상대로 이동 등)
      $('.pop-head .mono', top).textContent = code(ch(id));
      const body = $('.pop-body', top);
      body.innerHTML = profileHTML(id, false);
      const right = $('.pf-right', body);
      right.classList.add('is-glitch');
      stagger(body); hydrate(body);
      return;
    }
    const el = openPop(profileHTML(id, false), { cls: 'pop--profile', code: code(ch(id)) });
    stagger(el);
  }
  function togglePast(id) {
    const pf = $(`[data-pf="${id}"]`);
    if (!pf) return;
    if (pf.classList.contains('dossier')) { toggleDossier(pf, id); return; }
    const past = !pf.classList.contains('is-past');
    S.sfx('reveal');
    pf.classList.toggle('is-past', past);
    $('.pf-left', pf).innerHTML = profileLeft(id, past);
    const right = $('.pf-right', pf);
    right.innerHTML = past ? profilePast(id) : profileNow(id);
    right.scrollTop = 0;
    right.classList.remove('is-glitch'); void right.offsetWidth; right.classList.add('is-glitch');
    stagger(pf); hydrate(pf);
    if (past) scramble($('.past-name', pf).firstChild, ch(id).past.trueEn.toUpperCase(), 900);
    $('[data-past]', pf).focus({ preventScroll: true });
  }

  /* =========================================================
     전역 이벤트
     ========================================================= */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open],[data-open-win],[data-tab],[data-close],[data-pop-close],[data-zone],[data-profile],[data-goto],[data-reveal],[data-past],[data-tl],[data-more]');
    if (!t) {
      if (e.target === winLayer && !popStack.length) closeWindow();
      if (e.target === popLayer) closePop();
      return;
    }
    const d = t.dataset;
    if (d.open) openWindow(d.open);
    else if (d.openWin) openWindow(d.openWin);
    else if (d.tab) switchTab(d.tab);
    else if ('close' in d) closeWindow();
    else if ('popClose' in d) closePop();
    else if (d.zone) openZone(d.zone);
    else if (d.profile) openProfile(d.profile);
    else if (d.goto) { const [k, tab] = d.goto.split(':'); if (popStack.length) closePop(); openWindow(k, tab); }
    else if (d.reveal) revealSpoiler(d.reveal);
    else if (d.past) togglePast(d.past);
    else if ('more' in d) {
      const el = t.closest('.dossier');
      renderDossier(el, el.dataset.pf, el.classList.contains('is-past'), !el.classList.contains('is-full'), true);
    }
    else if (d.tl) {
      const item = $('#tl-' + d.tl);
      if (item) {
        item.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        $$('.tl-pt button.is-on').forEach(b => b.classList.remove('is-on'));
        t.classList.add('is-on');
        item.classList.remove('is-flash'); void item.offsetWidth; item.classList.add('is-flash');
        setTimeout(() => item.classList.remove('is-flash'), 1400);
      }
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (popStack.length) closePop();
    else if (cur) closeWindow();
  });

  /* =========================================================
     HUD
     ========================================================= */
  function tickClock() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    $('[data-clock]').textContent = `R.E. ${R.world.era.current}.${p(d.getMonth() + 1)}.${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  setInterval(tickClock, 1000); tickClock();
  setInterval(() => { $('[data-sync]').textContent = (96 + Math.random() * 3.2).toFixed(1); }, 1600);

  // 구체 테두리 눈금
  (function ticks() {
    const g = $('.gh-ticks');
    let s = '';
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * Math.PI * 2, long = i % 10 === 0;
      const r1 = 470, r2 = long ? 488 : 478;
      s += `<line x1="${500 + Math.cos(a) * r1}" y1="${500 + Math.sin(a) * r1}" x2="${500 + Math.cos(a) * r2}" y2="${500 + Math.sin(a) * r2}"/>`;
    }
    g.innerHTML = s;
  })();

  /* ---------- 사이드 카드 ---------- */
  const side = $('[data-side]');
  function sideDefault() {
    return `<div class="sc-code mono"><span>CONTINENT</span><span>R.E. ${R.world.era.current}</span></div>
      <p class="sc-en">VERTUM</p><p class="sc-ko">대륙 베르툼</p>
      <p class="sc-text">${esc(R.continentInfo.text)}</p>
      <div class="sc-stats"><div><b>3</b><span>도시국가</span></div><div><b>6</b><span>오리진</span></div><div><b>3</b><span>기관</span></div></div>
      <p class="sc-text">${esc(R.continentInfo.transit)}</p>`;
  }
  function sideFor(h) {
    if (!h) return sideDefault();
    if (h.type === 'region') {
      const r = regionById(h.id);
      return `<div class="sc-code mono"><span>REGION // ${esc(r.dir)}</span><span>THREAT ${r.threat}/5</span></div>
        <p class="sc-en">${esc(r.en.toUpperCase())}</p><p class="sc-ko">${esc(r.name)}</p><p class="sc-alias">“${esc(r.alias)}”</p>
        <div style="margin-top:12px">${meter(r.threat)}</div>
        <p class="sc-text">${esc(r.summary)}</p><p class="sc-cta mono">CLICK TO OPEN RECORD</p>`;
    }
    if (h.type === 'faction') {
      const f = factionById(h.id);
      return `<div class="sc-code mono"><span>FACTION</span><span>${esc(regionById(f.region).en.toUpperCase())}</span></div>
        <p class="sc-en">${esc(f.en.toUpperCase())}</p><p class="sc-ko">${esc(f.name)}</p>
        <p class="sc-motto">${esc(f.motto)}</p>
        <dl class="sc-meta"><div><span>LOCATION</span><span>${esc(f.loc)}</span></div><div><span>MEMBERS</span><span>${f.members.map(m => esc(ch(m).name)).join(' · ')}</span></div></dl>
        <p class="sc-cta mono">CLICK TO OPEN RECORD</p>`;
    }
    const c = ch(h.id);
    return `<div class="sc-code mono"><span>ORIGIN // VESSEL</span><span>${esc(c.weapon)}</span></div>
      <p class="sc-en">${esc(c.en.toUpperCase())}</p><p class="sc-ko">${esc(c.name)}</p>
      <dl class="sc-meta">
        <div><span>WEAPON</span><span>${esc(c.weapon)}</span></div>
        <div><span>VESSEL</span><span>${esc(c.body)}</span></div>
        <div><span>AFFIL.</span><span>${esc(c.affiliation)}</span></div>
        <div><span>AWAKEN</span><span>${esc(c.awaken)}</span></div>
      </dl>
      <p class="sc-cta mono">CLICK TO OPEN PERSONNEL FILE</p>`;
  }
  let sideKey = null;
  function updateSide(h) {
    const key = h ? h.type + h.id : '';
    if (key === sideKey) return;
    sideKey = key;
    side.innerHTML = sideFor(h);
    side.classList.remove('is-swap'); void side.offsetWidth; side.classList.add('is-swap');
  }
  updateSide(null);

  /* ---------- 마커 ---------- */
  function renderMarker(m) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `mk mk--${m.type} mk--${m.side}`;
    let name, sub;
    if (m.type === 'region') { const r = regionById(m.id); name = r.name; sub = `${r.en.toUpperCase()} · ${r.dir}`; }
    else if (m.type === 'faction') { const f = factionById(m.id); name = f.name; sub = f.en.toUpperCase(); }
    else { const c = ch(m.id); name = c.name; sub = `${c.en.toUpperCase()} · ${c.weapon}`; }
    el.setAttribute('aria-label', `${name} 기록 열기`);
    el.innerHTML = `<span class="mk-anchor"><span class="mk-hit"></span><span class="mk-glyph"></span><span class="mk-lead"></span>
      <span class="mk-label"><b>${esc(name)}</b><small>${esc(sub)}</small></span></span>`;
    return el;
  }

  /* ---------- 구체 ---------- */
  let globe = null;
  const sectorName = id => id ? `${regionById(id).name} / ${regionById(id).en.toUpperCase()}` : 'OPEN SEA';
  function initGlobe() {
    if (!window.THREE) {
      $('[data-globe-loading]').textContent = 'PLANETARY MODEL OFFLINE — THREE.JS 로드 실패';
      return;
    }
    try {
      globe = window.Globe.create({
        host: $('[data-globe]'),
        frame: $('[data-globe-frame]'),
        markerLayer: $('[data-markers]'),
        renderMarker,
        onHot: updateSide,
        onSelect(s) {
          if (s.type === 'origin') openProfile(s.id);
          else openWindow(s.type, s.id);
        },
        onCursor(p) {
          if (!p) { $('[data-cursor]').textContent = 'LAT —— / LON ——'; $('[data-sector]').textContent = 'SECTOR: ——'; return; }
          $('[data-cursor]').textContent = `LAT ${Math.abs(p.lat).toFixed(2)} ${p.lat >= 0 ? 'N' : 'S'} / LON ${Math.abs(p.lon).toFixed(2)} ${p.lon >= 0 ? 'E' : 'W'}`;
          $('[data-sector]').textContent = 'SECTOR: ' + sectorName(p.region);
        }
      });
      $('[data-globe-loading]').classList.add('is-hidden');
      findImg('assets/img/map/vertum').then(url => { if (url) globe.setMap(url); });
    } catch (err) {
      console.error(err);
      $('[data-globe-loading]').textContent = 'PLANETARY MODEL OFFLINE — WebGL 미지원';
    }
  }
  $$('[data-zoom]').forEach(b => b.addEventListener('click', () => globe && globe.zoom(parseFloat(b.dataset.zoom))));
  $('[data-reset]').addEventListener('click', () => globe && globe.reset());
  $$('[data-filter]').forEach(cb => cb.addEventListener('change', () => globe && globe.setFilter(cb.dataset.filter, cb.checked)));

  // 사운드 토글
  const soundBtn = $('[data-sound]');
  const paintSound = on => { soundBtn.classList.toggle('is-off', !on); soundBtn.setAttribute('aria-pressed', on); $('b', soundBtn).textContent = on ? 'ON' : 'OFF'; };
  paintSound(S.enabled);
  soundBtn.addEventListener('click', () => paintSound(S.toggle()));

  // 클릭음 — 화면의 모든 버튼·체크박스·마커
  document.addEventListener('click', e => {
    if (e.target.closest('button, label, a[href], .mk')) S.sfx('click');
  }, true);

  // 커서를 올릴 때 (메뉴 · 마커)
  document.addEventListener('mouseover', e => {
    const t = e.target.closest('.menu button, .mk');
    if (t && !t.contains(e.relatedTarget)) S.sfx('hover');
  });

  /* =========================================================
     BOOT — 비밀기관 접속 화면
     ========================================================= */
  const boot = $('#boot');
  const app = $('#app');
  let booted = false;

  function finishBoot() {
    if (booted) return;
    booted = true;
    S.start();
    try { sessionStorage.setItem('res-booted', '1'); } catch (e) { /* 저장소 없음 */ }
    boot.classList.add('is-done');
    app.classList.add('is-on');
    app.removeAttribute('aria-hidden');
    setTimeout(() => boot.remove(), 700);
  }

  async function typeInto(el, text, speed) {
    el.classList.add('is-typing');
    for (let i = 1; i <= text.length; i++) {
      if (booted) return;
      el.textContent = text.slice(0, i);
      if (i % 2) S.sfx('type');
      await sleep(speed + Math.random() * speed);
    }
    el.classList.remove('is-typing');
  }

  async function runBoot() {
    const log = $('[data-log]', boot);
    const line = (txt, cls) => { const li = document.createElement('li'); li.className = cls || ''; li.textContent = txt; log.appendChild(li); };
    let quick = false;
    try { quick = sessionStorage.getItem('res-booted') === '1'; } catch (e) { /* 저장소 없음 */ }
    const w = quick ? 0.35 : 1;

    const lines = [
      ['RESONANCE ARCHIVE SYSTEM v3.026 — COLD BOOT', 'dim'],
      ['LINK → EIRENE CENTRAL / THE SPIRE ……… OK', 'ok'],
      ['RELAY → TREMOLO LINE BARRIER CHANNEL ……… OK', 'ok'],
      ['SILENT ZONE INTERFERENCE: 12.4 dB — FILTERED', ''],
      ['LOADING CONDUCTOR CREDENTIAL MODULE ……… OK', 'ok']
    ];
    for (const [t, c] of lines) { if (booted) return; line(t, c); await sleep(260 * w); }

    $('[data-form]', boot).classList.add('is-on');
    await sleep(200 * w);
    await typeInto($('[data-id]', boot), 'CND-3026-0000', 45 * w);
    await typeInto($('[data-pw]', boot), '••••••••••', 40 * w);
    if (booted) return;
    line('AUTHENTICATING ……', 'dim'); await sleep(420 * w);
    line('CONTRACT SLOTS: MULTIPLE — ANOMALY FLAGGED', ''); await sleep(260 * w);
    line('CLEARANCE GRANTED: ARCHIVE LEVEL 3', 'ok');

    const prog = $('[data-progress]', boot);
    prog.classList.add('is-on');
    const bar = $('[data-pbar]', boot), num = $('[data-pnum]', boot), ptx = $('[data-ptext]', boot);
    const labels = [[0, '공명 파장 동기화'], [38, '행성 모델 렌더링'], [72, '기록 복호화']];
    for (let p = 0; p <= 100; p += 2 + Math.round(Math.random() * 3)) {
      if (booted) return;
      bar.style.width = p + '%'; num.textContent = p + '%';
      const l = labels.filter(x => p >= x[0]).pop(); ptx.textContent = l[1];
      await sleep((24 + Math.random() * 30) * w);
    }
    bar.style.width = '100%'; num.textContent = '100%';
    await sleep(160 * w);
    $('[data-granted]', boot).classList.add('is-on');
    S.sfx('granted');
    await sleep(1000 * w);
    finishBoot();
  }

  $('[data-skip]', boot).addEventListener('click', finishBoot);
  document.addEventListener('keydown', e => { if (!booted && (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ')) finishBoot(); });

  initGlobe();
  runBoot();
})();
