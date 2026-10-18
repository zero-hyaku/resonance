/* =========================================================
   지도 형상 — 지도 공간(1000×800) 좌표의 해안선/섬 생성.
   구체 텍스처와 SVG 미니맵이 같은 형상을 공유한다.
   ========================================================= */
window.MapGeo = (function () {
  const M = window.RES.map;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 닫힌 다각형의 중점 변위로 자연스러운 해안선을 만든다
  function roughen(points, depth, amp, seed) {
    const rand = rng(seed);
    let pts = points.slice();
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const len = Math.hypot(dx, dy);
        const off = (rand() - 0.5) * len * amp;
        next.push(a, [(a[0] + b[0]) / 2 - (dy / len) * off, (a[1] + b[1]) / 2 + (dx / len) * off]);
      }
      pts = next;
    }
    return pts;
  }

  function blob(cx, cy, r, seed) {
    const rand = rng(seed);
    const n = 11, base = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.72 + rand() * 0.38);
      base.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.86]);
    }
    return roughen(base, 3, 0.42, seed * 7 + 3);
  }

  const continent = roughen(M.continent, 5, 0.34, 1207);
  const ironIslands = M.ironIslands.map((s, i) => blob(s[0], s[1], s[2], 50 + i));
  const luminaIslands = M.luminaIslands.map((s, i) => blob(s[0], s[1], s[2], 90 + i));

  function toPath2D(polys) {
    const p = new Path2D();
    polys.forEach(poly => {
      p.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) p.lineTo(poly[i][0], poly[i][1]);
      p.closePath();
    });
    return p;
  }

  function shapePath(s) {
    const p = new Path2D();
    if (s.type === 'circle') p.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    else p.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
    return p;
  }

  const paths = {
    continent: toPath2D([continent]),
    ironIslands: toPath2D(ironIslands),
    luminaIslands: toPath2D(luminaIslands),
    safe: {
      eirene: shapePath(M.safe.eirene),
      'iron-valley': shapePath(M.safe['iron-valley']),
      lumina: shapePath(M.safe.lumina)
    }
  };

  // 지역 판정용 (isPointInPath 전용 컨텍스트)
  const testCtx = document.createElement('canvas').getContext('2d');
  function inside(path, x, y) { return testCtx.isPointInPath(path, x, y); }

  function regionAt(x, y) {
    const land = inside(paths.continent, x, y);
    const iron = inside(paths.ironIslands, x, y) || (land && inside(paths.safe['iron-valley'], x, y));
    if (iron) return 'iron-valley';
    if (inside(paths.luminaIslands, x, y) || (land && inside(paths.safe.lumina, x, y))) return 'lumina';
    if (land && inside(paths.safe.eirene, x, y)) return 'eirene';
    if (land) return 'silent-zone';
    // 루미나 근해, 창끝 해역은 바다지만 루미나로 본다
    if (inside(paths.safe.lumina, x, y)) return 'lumina';
    return null;
  }

  // 지역 형상 그리기 (ctx는 지도 공간 좌표계로 변환되어 있어야 한다)
  function fillRegion(ctx, id) {
    if (id === 'eirene') {
      ctx.save(); ctx.clip(paths.continent); ctx.fill(paths.safe.eirene); ctx.restore();
    } else if (id === 'iron-valley') {
      ctx.fill(paths.ironIslands);
      ctx.save(); ctx.clip(paths.continent); ctx.fill(paths.safe['iron-valley']); ctx.restore();
    } else if (id === 'lumina') {
      ctx.fill(paths.luminaIslands);
      ctx.save(); ctx.clip(paths.continent); ctx.fill(paths.safe.lumina); ctx.restore();
    } else if (id === 'silent-zone') {
      // 대륙 − 세 도시
      const c = document.createElement('canvas');
      c.width = ctx.canvas.width; c.height = ctx.canvas.height;
      const k = c.getContext('2d');
      k.setTransform(ctx.getTransform());
      k.fillStyle = ctx.fillStyle;
      k.fill(paths.continent);
      k.globalCompositeOperation = 'destination-out';
      k.fill(paths.safe.eirene); k.fill(paths.safe['iron-valley']); k.fill(paths.safe.lumina);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, 0, 0); ctx.restore();
    }
  }

  function svgPath(poly) {
    return 'M' + poly.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
  }

  // 미니맵 SVG — highlight: 지역 id, pins: [{x,y,label}]
  function minimap(opts) {
    opts = opts || {};
    const hl = opts.highlight;
    const pins = opts.pins || [];
    const s = M.safe;
    const safeSvg = id => {
      const o = s[id];
      return o.type === 'circle'
        ? `<circle cx="${o.x}" cy="${o.y}" r="${o.r}"/>`
        : `<ellipse cx="${o.x}" cy="${o.y}" rx="${o.rx}" ry="${o.ry}"/>`;
    };
    const uid = 'mm' + Math.random().toString(36).slice(2, 8);
    const hlShape = !hl ? '' :
      hl === 'silent-zone'
        ? `<path class="mm-hl" d="${svgPath(continent)}" mask="url(#${uid}-sz)"/>`
        : hl === 'eirene'
          ? `<g class="mm-hl" clip-path="url(#${uid}-land)">${safeSvg('eirene')}</g>`
          : `<g class="mm-hl">${(hl === 'iron-valley' ? ironIslands : luminaIslands).map(p => `<path d="${svgPath(p)}"/>`).join('')}<g clip-path="url(#${uid}-land)">${safeSvg(hl)}</g></g>`;

    const pinSvg = pins.map(p => `
      <g class="mm-pin" transform="translate(${p.x} ${p.y})">
        <circle r="26" class="mm-pin-pulse"/>
        <circle r="9" class="mm-pin-ring"/>
        <circle r="3.5" class="mm-pin-dot"/>
        ${p.label ? `<text x="18" y="-14">${p.label}</text>` : ''}
      </g>`).join('');

    const rail = M.rail.map(seg => `<polyline points="${seg.map(p => p.join(',')).join(' ')}"/>`).join('');

    return `
<svg class="minimap" viewBox="0 0 1000 800" role="img" aria-label="베르툼 미니맵">
  <defs>
    <clipPath id="${uid}-land"><path d="${svgPath(continent)}"/></clipPath>
    <mask id="${uid}-sz"><rect width="1000" height="800" fill="#fff"/><g fill="#000">${safeSvg('eirene')}${safeSvg('iron-valley')}${safeSvg('lumina')}</g></mask>
    <pattern id="${uid}-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" class="mm-gridline"/></pattern>
  </defs>
  <rect width="1000" height="800" fill="url(#${uid}-grid)"/>
  <path class="mm-land" d="${svgPath(continent)}"/>
  <path class="mm-sz" d="${svgPath(continent)}" mask="url(#${uid}-sz)"/>
  ${ironIslands.map(p => `<path class="mm-land" d="${svgPath(p)}"/>`).join('')}
  ${luminaIslands.map(p => `<path class="mm-land" d="${svgPath(p)}"/>`).join('')}
  ${hlShape}
  <g class="mm-rail">${rail}</g>
  ${pinSvg}
</svg>`;
  }

  return { continent, ironIslands, luminaIslands, paths, regionAt, fillRegion, minimap, rng, inside };
})();
