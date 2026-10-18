/* =========================================================
   중앙 행성 — Three.js 구체 + 베르툼 지도 텍스처 + HTML 마커
   ========================================================= */
window.Globe = (function () {
  const G = window.MapGeo;
  const RES = window.RES;

  // 지도 공간 → 위경도
  const LON_K = 0.11, LAT_K = 0.1125;
  const toLonLat = (x, y) => [(x - 500) * LON_K, (400 - y) * LAT_K];
  const toMap = (lon, lat) => [lon / LON_K + 500, 400 - lat / LAT_K];

  function lonLatToVec3(lon, lat, r) {
    const phi = ((lon + 180) / 360) * Math.PI * 2;
    const theta = ((90 - lat) / 180) * Math.PI;
    return new THREE.Vector3(
      -Math.cos(phi) * Math.sin(theta) * r,
      Math.cos(theta) * r,
      Math.sin(phi) * Math.sin(theta) * r
    );
  }

  // 지도 공간 좌표계를 등장방형 텍스처 좌표계로 변환
  function mapTransform(ctx, W, H) {
    ctx.setTransform(LON_K / 360 * W, 0, 0, LAT_K / 180 * H, (180 - 55) / 360 * W, 45 / 180 * H);
  }

  /* ---------- 기본 지도 텍스처 ---------- */
  function buildBaseTexture() {
    const W = 4096, H = 2048;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const rand = G.rng(77);

    // 바다
    ctx.fillStyle = '#040506';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(120,150,190,${rand() * 0.05})`;
      ctx.fillRect(rand() * W, rand() * H, 2, 2);
    }

    // 경위선
    for (let lon = -180; lon <= 180; lon += 10) {
      const x = (lon + 180) / 360 * W;
      ctx.strokeStyle = lon % 30 === 0 ? 'rgba(90,150,255,0.16)' : 'rgba(90,150,255,0.06)';
      ctx.lineWidth = lon % 30 === 0 ? 2 : 1.2;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let lat = -80; lat <= 80; lat += 10) {
      const y = (90 - lat) / 180 * H;
      ctx.strokeStyle = lat === 0 ? 'rgba(90,150,255,0.22)' : lat % 30 === 0 ? 'rgba(90,150,255,0.14)' : 'rgba(90,150,255,0.06)';
      ctx.lineWidth = lat === 0 ? 2.4 : 1.2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // 미확인 대륙 (기록 없음)
    const unknown = [[3300, 700, 260], [3650, 1350, 200], [400, 520, 220], [700, 1500, 180], [2050, 1820, 160], [2100, 230, 150]];
    unknown.forEach((u, i) => {
      const poly = (function () {
        const r = G.rng(300 + i), n = 12, base = [];
        for (let k = 0; k < n; k++) {
          const a = k / n * Math.PI * 2, rr = u[2] * (0.6 + r() * 0.5);
          base.push([u[0] + Math.cos(a) * rr * 1.3, u[1] + Math.sin(a) * rr * 0.8]);
        }
        return base;
      })();
      ctx.beginPath();
      poly.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.closePath();
      ctx.fillStyle = 'rgba(30,32,34,0.55)';
      ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(200,200,200,0.06)'; ctx.lineWidth = 2;
      for (let k = -600; k < 600; k += 14) {
        ctx.beginPath(); ctx.moveTo(u[0] + k, u[1] - 400); ctx.lineTo(u[0] + k + 400, u[1] + 400); ctx.stroke();
      }
      ctx.restore();
      ctx.setLineDash([8, 10]);
      ctx.strokeStyle = 'rgba(200,200,200,0.14)'; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(200,200,200,0.22)';
      ctx.font = '600 26px "Share Tech Mono", monospace';
      ctx.fillText('NO DATA // UNCHARTED', u[0] - 120, u[1] + 8);
    });

    // ===== 베르툼 =====
    mapTransform(ctx, W, H);
    const P = G.paths;

    // 루미나 근해 발광
    const sea = ctx.createRadialGradient(532, 730, 10, 532, 730, 220);
    sea.addColorStop(0, 'rgba(110,190,255,0.32)');
    sea.addColorStop(1, 'rgba(110,190,255,0)');
    ctx.fillStyle = sea; ctx.fillRect(250, 520, 600, 320);
    const sea2 = ctx.createRadialGradient(724, 790, 2, 724, 790, 60);
    sea2.addColorStop(0, 'rgba(140,210,255,0.5)');
    sea2.addColorStop(1, 'rgba(140,210,255,0)');
    ctx.fillStyle = sea2; ctx.fillRect(640, 720, 170, 140);

    // 해안 글로우
    ctx.strokeStyle = 'rgba(80,150,255,0.10)'; ctx.lineWidth = 9;
    ctx.stroke(P.continent); ctx.stroke(P.ironIslands); ctx.stroke(P.luminaIslands);

    // 육지 바탕
    ctx.fillStyle = '#0b0c0e';
    ctx.fill(P.continent); ctx.fill(P.ironIslands); ctx.fill(P.luminaIslands);

    // 도트 매트릭스
    const step = 5.2;
    for (let y = 60; y < 800; y += step) {
      for (let x = 30; x < 940; x += step) {
        const reg = G.regionAt(x, y);
        if (!reg) continue;
        const onLand = G.inside(P.continent, x, y) || G.inside(P.ironIslands, x, y) || G.inside(P.luminaIslands, x, y);
        if (!onLand) continue;
        if (reg === 'silent-zone') ctx.fillStyle = 'rgba(170,170,170,0.22)';
        else if (reg === 'eirene') ctx.fillStyle = 'rgba(150,200,255,0.85)';
        else ctx.fillStyle = 'rgba(90,160,255,0.7)';
        const s = reg === 'silent-zone' ? 1.3 : 1.7;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }

    // 사일런트 존 해칭
    ctx.save();
    ctx.clip(P.continent);
    ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
    for (let k = -800; k < 1000; k += 9) {
      ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + 800, 800); ctx.stroke();
    }
    ctx.restore();

    // 해안선
    ctx.strokeStyle = 'rgba(140,195,255,0.95)'; ctx.lineWidth = 1.5;
    ctx.stroke(P.continent); ctx.stroke(P.ironIslands); ctx.stroke(P.luminaIslands);

    // 도시 결계 경계
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(120,180,255,0.75)'; ctx.lineWidth = 1.2;
    ctx.stroke(P.safe.eirene);
    ctx.save(); ctx.clip(P.continent); ctx.stroke(P.safe['iron-valley']); ctx.stroke(P.safe.lumina); ctx.restore();
    ctx.setLineDash([]);

    // 에이레네 — 원형 기계 도시
    const E = RES.map.safe.eirene;
    ctx.strokeStyle = 'rgba(200,225,255,0.8)';
    [22, 40, 58].forEach((r, i) => {
      ctx.lineWidth = i === 0 ? 1.6 : 0.9;
      ctx.beginPath(); ctx.arc(E.x, E.y, r, 0, Math.PI * 2); ctx.stroke();
    });
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      ctx.lineWidth = i % 6 === 0 ? 1.4 : 0.6;
      ctx.beginPath();
      ctx.moveTo(E.x + Math.cos(a) * 22, E.y + Math.sin(a) * 22);
      ctx.lineTo(E.x + Math.cos(a) * 58, E.y + Math.sin(a) * 58);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(220,235,255,0.95)';
    ctx.beginPath(); ctx.arc(E.x, E.y, 5, 0, Math.PI * 2); ctx.fill();

    // 오리진 본체 (축)
    const axis = (x, y) => {
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fillRect(x - 2.2, y - 2.2, 4.4, 4.4);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x - 8, y); ctx.moveTo(x + 8, y); ctx.lineTo(x + 12, y);
      ctx.moveTo(x, y - 12); ctx.lineTo(x, y - 8); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 12); ctx.stroke();
    };
    RES.markers.filter(m => m.type === 'origin').forEach(m => axis(m.x, m.y));

    // 아이언 밸리 — 사슬
    const isl = RES.map.ironIslands;
    ctx.strokeStyle = 'rgba(160,190,230,0.55)'; ctx.lineWidth = 0.9;
    ctx.setLineDash([2, 2]);
    [[0, 1], [0, 2], [0, 3], [3, 4], [1, 5], [0, 5], [2, 6], [2, 7], [4, 7], [5, 5]].forEach(([a, b]) => {
      if (a === b) return;
      ctx.beginPath(); ctx.moveTo(isl[a][0], isl[a][1]); ctx.lineTo(isl[b][0], isl[b][1]); ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(isl[0][0], isl[0][1]); ctx.lineTo(258, 420); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(isl[5][0], isl[5][1]); ctx.lineTo(250, 330); ctx.stroke();
    ctx.setLineDash([]);

    // 루미나 — 산호초 링
    RES.map.luminaIslands.forEach(s => {
      ctx.strokeStyle = 'rgba(160,215,255,0.35)'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.arc(s[0], s[1], s[2] * 1.35, 0, Math.PI * 2); ctx.stroke();
    });

    // 트레몰로 라인
    ctx.strokeStyle = 'rgba(235,242,255,0.9)'; ctx.lineWidth = 1.3;
    ctx.setLineDash([6, 4]);
    RES.map.rail.forEach(seg => {
      ctx.beginPath();
      seg.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // 특수 지점
    RES.map.sites.forEach(s => {
      if (s.kind === 'ruin') {
        const r = G.rng(9);
        ctx.strokeStyle = 'rgba(230,230,230,0.7)'; ctx.lineWidth = 0.8;
        for (let i = 0; i < 14; i++) {
          const a = r() * Math.PI * 2, d = r() * 22;
          const x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
          ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + 2.4, y + 2); ctx.lineTo(x - 2.4, y + 2); ctx.closePath(); ctx.stroke();
        }
      } else if (s.kind === 'vacuum') {
        const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 26);
        g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, 26, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(220,220,220,0.5)'; ctx.setLineDash([2, 3]); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(s.x, s.y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(220,220,220,0.35)'; ctx.lineWidth = 0.7;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath(); ctx.ellipse(s.x, s.y, 20 + i * 14, 10 + i * 7, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.save();
      ctx.translate(s.x + 14, s.y + 30); ctx.scale(1, LON_K / LAT_K);
      ctx.fillStyle = 'rgba(210,210,210,0.75)';
      ctx.font = '500 11px "Pretendard", sans-serif';
      ctx.fillText(s.label, 0, 0);
      ctx.restore();
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return c;
  }

  /* ---------- 지역 하이라이트 텍스처 ---------- */
  function buildRegionOverlay(id) {
    const W = 2048, H = 1024;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    mapTransform(ctx, W, H);
    ctx.fillStyle = id === 'silent-zone' ? 'rgba(235,235,235,0.55)' : 'rgba(110,185,255,0.7)';
    G.fillRegion(ctx, id);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 스캔라인
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    return c;
  }

  /* ---------- 생성 ---------- */
  function create(opts) {
    const host = opts.host;
    const markerLayer = opts.markerLayer;
    const cb = opts;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    let camDist = 4.15, camTarget = 4.15;
    camera.position.set(0, 0, camDist);

    const root = new THREE.Group();
    scene.add(root);

    // 구체
    const baseCanvas = buildBaseTexture();
    const tex = new THREE.CanvasTexture(baseCanvas);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const globeMat = new THREE.MeshPhongMaterial({
      map: tex, emissiveMap: tex, emissive: new THREE.Color(0x8a8a8a),
      specular: new THREE.Color(0x1a2a44), shininess: 12
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), globeMat);
    root.add(globe);

    // 실제 지도 이미지로 교체 (assets/img/map/vertum.* — 등장방형 2:1)
    function setMap(url) {
      new THREE.TextureLoader().load(url, t => {
        t.anisotropy = tex.anisotropy;
        globeMat.map = t; globeMat.emissiveMap = t; globeMat.needsUpdate = true;
      });
    }

    // 지역 오버레이
    const overlays = {};
    RES.regions.forEach((r, i) => {
      const t = new THREE.CanvasTexture(buildRegionOverlay(r.id));
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1.002 + i * 0.0005, 128, 96),
        new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      m.userData = { target: 0 };
      m.visible = false;
      overlays[r.id] = m;
      root.add(m);
    });

    // 대기 (가장자리 발광)
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.12, 64, 48),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.2); gl_FragColor = vec4(0.25,0.55,1.0,1.0) * i; }'
      })
    );
    scene.add(atmo);
    const rim = new THREE.Mesh(
      new THREE.SphereGeometry(1.004, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'varying vec3 vN; void main(){ float i = pow(1.0 - abs(dot(vN, vec3(0.0,0.0,1.0))), 2.6); gl_FragColor = vec4(0.35,0.6,1.0,1.0) * i * 0.55; }'
      })
    );
    scene.add(rim);

    // 궤도 링
    function ring(r, tiltX, tiltZ, dashed, opacity) {
      const pts = [];
      for (let i = 0; i <= 256; i++) {
        const a = i / 256 * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = dashed
        ? new THREE.LineDashedMaterial({ color: 0x6aa8ff, dashSize: 0.03, gapSize: 0.03, transparent: true, opacity })
        : new THREE.LineBasicMaterial({ color: 0x6aa8ff, transparent: true, opacity });
      const l = new THREE.Line(geo, mat);
      if (dashed) l.computeLineDistances();
      l.rotation.x = tiltX; l.rotation.z = tiltZ;
      scene.add(l);
      return l;
    }
    const ring1 = ring(1.38, 1.25, 0.32, true, 0.45);
    const ring2 = ring(1.55, 1.42, -0.5, false, 0.14);

    // 위성
    const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.018), new THREE.MeshBasicMaterial({ color: 0xcfe3ff }));
    scene.add(sat);

    // 별
    const starGeo = new THREE.BufferGeometry();
    const sp = [], sr = G.rng(5);
    for (let i = 0; i < 900; i++) {
      const v = new THREE.Vector3(sr() - 0.5, sr() - 0.5, sr() - 0.5).normalize().multiplyScalar(14 + sr() * 10);
      sp.push(v.x, v.y, v.z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9a9a9a, size: 0.035, transparent: true, opacity: 0.7 })));

    // 조명
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sun = new THREE.DirectionalLight(0xdfe9ff, 0.85);
    sun.position.set(-3, 2, 4);
    scene.add(sun);

    /* ---------- 회전 ---------- */
    function anglesFor(x, y) {
      const [lon, lat] = toLonLat(x, y);
      const v = lonLatToVec3(lon, lat, 1);
      return { y: Math.atan2(-v.x, v.z), x: lat * Math.PI / 180 };
    }
    const home = anglesFor(500, 430);
    const rot = { x: home.x, y: home.y, vx: 0, vy: 0 };
    let tween = null;
    function focusOn(x, y, dur) {
      const a = anglesFor(x, y);
      // 최단 경로
      let dy = a.y - rot.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      tween = { fx: rot.x, fy: rot.y, tx: Math.max(-0.9, Math.min(0.9, a.x)), ty: rot.y + dy, t: 0, d: dur || 900 };
      rot.vx = rot.vy = 0;
    }

    /* ---------- 마커 ---------- */
    const markers = RES.markers.map(m => {
      const [lon, lat] = toLonLat(m.x, m.y);
      const el = opts.renderMarker(m);
      markerLayer.appendChild(el);
      return { def: m, el, local: lonLatToVec3(lon, lat, 1.005) };
    });

    let hot = null;
    function setHot(h) {
      const key = h ? h.type + ':' + h.id : null;
      const prev = hot ? hot.type + ':' + hot.id : null;
      if (key === prev) return;
      hot = h;
      Object.keys(overlays).forEach(id => { overlays[id].userData.target = 0; });
      if (h) {
        if (h.type === 'region') overlays[h.id].userData.target = 1;
        else if (h.type === 'faction') {
          const f = RES.factions.find(f => f.id === h.id);
          if (f) overlays[f.region].userData.target = 0.45;
        }
      }
      markerLayer.classList.toggle('has-hot', !!h);
      markers.forEach(mk => mk.el.classList.toggle('is-hot', !!h && mk.def.type === h.type && mk.def.id === h.id));
      if (cb.onHot) cb.onHot(h);
    }

    /* ---------- 입력 ---------- */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let drag = null, idleAt = 0, pointerOnGlobe = false, lastMove = null;
    const cvs = renderer.domElement;

    function pick(clientX, clientY) {
      const r = cvs.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(globe)[0];
      if (!hit) return null;
      const lon = hit.uv.x * 360 - 180, lat = hit.uv.y * 180 - 90;
      const [mx, my] = toMap(lon, lat);
      return { lon, lat, region: G.regionAt(mx, my) };
    }

    cvs.addEventListener('pointerdown', e => {
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: 0 };
      tween = null;
      cvs.setPointerCapture(e.pointerId);
      host.classList.add('is-dragging');
    });
    cvs.addEventListener('pointermove', e => {
      idleAt = performance.now();
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY;
        drag.moved += Math.abs(dx) + Math.abs(dy);
        const k = 0.0042 * (camDist / 4.15);
        rot.y += dx * k; rot.x += dy * k;
        rot.x = Math.max(-0.9, Math.min(0.9, rot.x));
        rot.vy = dx * k; rot.vx = dy * k;
      }
      lastMove = { x: e.clientX, y: e.clientY };
    });
    function endDrag(e) {
      if (!drag) return;
      const wasClick = drag.moved < 6;
      drag = null;
      host.classList.remove('is-dragging');
      if (wasClick && e.type === 'pointerup') {
        const p = pick(e.clientX, e.clientY);
        if (p && p.region && cb.onSelect) cb.onSelect({ type: 'region', id: p.region });
      }
    }
    cvs.addEventListener('pointerup', endDrag);
    cvs.addEventListener('pointercancel', endDrag);
    cvs.addEventListener('pointerleave', () => {
      lastMove = null;
      if (pointerOnGlobe) { pointerOnGlobe = false; if (hot && hot.src === 'globe') setHot(null); }
      if (cb.onCursor) cb.onCursor(null);
    });
    host.addEventListener('wheel', e => {
      e.preventDefault();
      camTarget = Math.max(2.4, Math.min(5.6, camTarget + e.deltaY * 0.0018));
    }, { passive: false });

    function zoom(d) { camTarget = Math.max(2.4, Math.min(5.6, camTarget + d)); }

    // 마커 hover/click
    markers.forEach(mk => {
      mk.el.addEventListener('pointerenter', () => { idleAt = performance.now(); setHot({ type: mk.def.type, id: mk.def.id, src: 'marker' }); });
      mk.el.addEventListener('pointerleave', () => { if (hot && hot.src === 'marker') setHot(null); });
      mk.el.addEventListener('focus', () => setHot({ type: mk.def.type, id: mk.def.id, src: 'marker' }));
      mk.el.addEventListener('blur', () => { if (hot && hot.src === 'marker') setHot(null); });
      mk.el.addEventListener('click', () => {
        focusOn(mk.def.x, mk.def.y, 700);
        if (cb.onSelect) cb.onSelect({ type: mk.def.type, id: mk.def.id });
      });
    });

    /* ---------- 크기 ---------- */
    let W = 1, H = 1;
    function resize() {
      const r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      // 좁은 화면에서 구체가 잘리지 않게
      camera.fov = W < H ? 32 * Math.min(1.7, H / W * 0.85) : 32;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    /* ---------- 루프 ---------- */
    const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
    let last = performance.now(), running = true, paused = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      const dt = Math.min(50, now - last); last = now;
      if (paused) return;

      if (tween) {
        tween.t += dt;
        const p = Math.min(1, tween.t / tween.d);
        const e = 1 - Math.pow(1 - p, 3);
        rot.x = tween.fx + (tween.tx - tween.fx) * e;
        rot.y = tween.fy + (tween.ty - tween.fy) * e;
        if (p >= 1) tween = null;
      } else if (!drag) {
        rot.y += rot.vy; rot.x += rot.vx;
        rot.vy *= 0.94; rot.vx *= 0.94;
        rot.x = Math.max(-0.9, Math.min(0.9, rot.x));
        if (!reduce && !hot && now - idleAt > 2500) rot.y += 0.00006 * dt;
      }
      root.rotation.set(rot.x, rot.y, 0);

      camDist += (camTarget - camDist) * 0.12;
      camera.position.set(0, 0, camDist);

      ring1.rotation.y += 0.0002 * dt;
      ring2.rotation.y -= 0.00012 * dt;
      const sa = now * 0.00028;
      sat.position.set(Math.cos(sa) * 1.38, 0, Math.sin(sa) * 1.38).applyEuler(ring1.rotation);
      sat.rotation.y += 0.02;

      Object.values(overlays).forEach(o => {
        const m = o.material;
        m.opacity += (o.userData.target - m.opacity) * 0.14;
        if (o.userData.target > 0) m.opacity = Math.min(1, m.opacity) * (0.92 + Math.sin(now * 0.006) * 0.08);
        o.visible = m.opacity > 0.004;
      });

      // 구체 위 hover (드래그 중이 아닐 때)
      if (lastMove && !drag && (!hot || hot.src !== 'marker')) {
        const p = pick(lastMove.x, lastMove.y);
        pointerOnGlobe = !!p;
        if (cb.onCursor) cb.onCursor(p);
        if (p && p.region) setHot({ type: 'region', id: p.region, src: 'globe' });
        else if (hot && hot.src === 'globe') setHot(null);
        host.style.cursor = p && p.region ? 'pointer' : '';
      }

      // 마커 투영
      root.updateMatrixWorld();
      markers.forEach(mk => {
        tmp.copy(mk.local).applyMatrix4(root.matrixWorld);
        camDir.copy(camera.position).sub(tmp).normalize();
        const facing = tmp.clone().normalize().dot(camDir);
        tmp.project(camera);
        const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
        const vis = Math.max(0, Math.min(1, (facing - 0.12) / 0.2));
        mk.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        mk.el.style.opacity = vis.toFixed(3);
        const hidden = vis < 0.05;
        if (mk.hidden !== hidden) {
          mk.hidden = hidden;
          mk.el.style.visibility = hidden ? 'hidden' : 'visible';
          mk.el.tabIndex = hidden ? -1 : 0;
        }
      });

      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    return {
      focusOn, setHot, zoom, setMap,
      reset() { focusOn(500, 430, 900); camTarget = 4.15; },
      pause(v) { paused = v; },
      setFilter(type, on) { markers.forEach(mk => { if (mk.def.type === type) mk.el.classList.toggle('is-filtered', !on); }); }
    };
  }

  return { create };
})();
