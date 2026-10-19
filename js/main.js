/* elora — engine.
   One fixed WebGL stage on a quiet paper-coloured set. The page's scroll position is a
   single number (SP, in "screens") that drives everything: the camera glides between
   stations, each station animates by its own dwell progress, and the DOM chapters
   assemble and leave in step. Stations are registered by js/st-*.js.

   Built to stay smooth on any device (see js/perf.js):
     - a quality level (0-3) is chosen up front and can step down while running
     - one light, no post-processing, no shadow maps: soft contact shadows are painted planes
     - the frame rate is capped on phones / high-refresh screens
     - if even level 0 cannot keep up, the page switches to the light CSS-only version (js/lite.js) */
(async function () {
  const E = window.ELORA, P = E.perf, L = window.ELORA_LOADER;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = P.reducedMotion;
  const frameWait = () => new Promise(r => requestAnimationFrame(() => r()));

  /* devices that cannot run the 3D page get the light one straight away */
  if (P.lite) { E.enterLite(P.software ? 'software-renderer' : 'no-webgl2'); return; }

  const QL = P.QL;
  let lv = P.level;

  /* ---------------------------------------------------------------- load */
  let prog = 0; const bump = (to) => { prog = Math.max(prog, to); L && L.set(prog); };
  let THREE, X = {};
  try {
    THREE = await import('three'); bump(.1);
    const m = await import('three/addons/geometries/RoundedBoxGeometry.js');
    X.RoundedBoxGeometry = m.RoundedBoxGeometry;
    try { X.toCreasedNormals = (await import('three/addons/utils/BufferGeometryUtils.js')).toCreasedNormals; } catch (e) { /* flat-shaded logo sides: still fine */ }
    window.THREE = THREE;
    bump(.3);
  } catch (e) {
    console.warn('elora: 3D engine unavailable, showing the light page', e);
    E.enterLite('engine-load'); return;
  }

  /* fonts are drawn into canvases, so wait for them (but never for long) */
  try {
    await Promise.race([
      Promise.all(['400 64px "Instrument Serif"', 'italic 400 32px "Instrument Serif"', '500 32px Inter', '600 32px Inter'].map(f => document.fonts.load(f))),
      new Promise(r => setTimeout(r, 2600))
    ]);
  } catch (e) { /* system fonts will do */ }
  bump(.36);

  const { Vector3, Color } = THREE;
  const K = E.initKit(THREE, X);
  const ST = E.stations, N = ST.length;

  /* ---------------------------------------------------------------- state */
  const S = { sp: 0, target: 0, vel: 0, t: 0, mx: 0, my: 0, tmx: 0, tmy: 0, reveal: 0, i0: null, drag: 0, dragV: 0, reduced, introPull: 1 };
  let glideRaf = 0;
  let VW = innerWidth, VH = innerHeight, PORT = VW <= 820, DPR = 1, res = 1, dead = false;
  const devDPR = Math.min(window.devicePixelRatio || 1, 3);
  const prFor = (l, r) => Math.max(.5, Math.min(devDPR, QL[l].dpr) * r);

  /* ------------------------------------------------------------ timeline */
  const MOVE = .78, DW = ST.map((s, i) => s.dwell || (i === N - 1 ? 1.3 : 1.0));
  const home = []; { let a = 0; for (let k = 0; k < N; k++) { home[k] = a; a += DW[k] + MOVE; } }
  const TOTAL = home[N - 1] + DW[N - 1];
  const quint = q => q * q * q * (q * (q * 6 - 15) + 10);
  function travel(sp) {
    sp = Math.max(0, Math.min(sp, TOTAL));
    let k = 0; while (k < N - 1 && sp >= home[k + 1]) k++;
    const local = sp - home[k];
    if (local <= DW[k] || k === N - 1) return { i: k, dw: Math.min(1, local / DW[k]), f: 0, fe: 0 };
    const f = Math.min(1, (local - DW[k]) / MOVE);
    return { i: k, dw: 1, f, fe: quint(f) };
  }

  /* ------------------------------------------------------------ renderer */
  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !!QL[lv].aa, powerPreference: lv >= 3 ? 'high-performance' : 'default', alpha: false, stencil: false });
  renderer.setPixelRatio(prFor(lv, 1));
  renderer.setSize(VW, VH, false);
  /* no tone mapping: the fog, the paper and the page all have to be exactly the same colour */
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  K.maxAniso = Math.min(K.q.aniso, renderer.capabilities.getMaxAnisotropy());
  E.onLite = () => {
    if (dead) return; dead = true;
    try { renderer.dispose(); const x = renderer.getContext().getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { /* already gone */ }
    canvas.remove(); cancelAnimationFrame(glideRaf);
  };
  /* a lost context (low memory on a phone) cannot be rebuilt cheaply: hand over to the light page */
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); E.enterLite('context-lost'); });

  const PAPER = 0xf5f3ee;
  const scene = new THREE.Scene();
  scene.background = new Color(PAPER);
  scene.fog = new THREE.FogExp2(PAPER, .034);       /* distant scenes dissolve into the paper */
  const camera = new THREE.PerspectiveCamera(32, VW / VH, .1, 300);
  scene.add(camera);

  /* image-based light: a bright, soft studio (this is what the lacquer and steel reflect) */
  {
    const es = new THREE.Scene();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 v;void main(){float h=normalize(v).y;vec3 c=mix(vec3(.62,.63,.68),vec3(.93,.94,.97),smoothstep(-.5,.9,h));gl_FragColor=vec4(c,1.);}'
    }));
    es.add(dome);
    const box = (w, h, x, y, z, c, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m);
    };
    box(30, 14, 0, 32, 6, 0xffffff, 5);       /* big overhead softbox */
    box(5, 24, -28, 8, 6, 0xfff4e6, 3.2);     /* warm strip, left */
    box(5, 24, 28, 8, -2, 0xe3ecff, 3.2);     /* cool strip, right */
    box(34, 6, 0, 6, -30, 0xffffff, 1.6);     /* back wall */
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(es, .03).texture;
    scene.environmentIntensity = .6;
    pm.dispose(); es.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  bump(.4);

  /* two lights only: a soft sky/ground fill and one key that rides with the camera target */
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8d3c6, .5); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.0); scene.add(key, key.target);

  /* -------------------------------------------------------------- stations */
  const ZS = [0, -1.5, 1.2, -1.8, .8, -1.5, 1.2, -1.8, .6, -1.2, 0];
  const R = [], buildMs = [];
  const ctx = { THREE, K, S, renderer, scene, camera, reduced, get PORT() { return PORT; } };
  for (let k = 0; k < N; k++) {
    const def = ST[k];
    const o = [k * 18, 0, ZS[k % ZS.length]];
    const root = new THREE.Group(); root.position.set(o[0], 0, o[2]); scene.add(root);
    let built; const tb = performance.now();
    try { built = def.build(ctx); } catch (e) { console.error('elora: scene failed', def.id, e); built = { group: new THREE.Group(), update() { } }; }
    root.add(built.group); buildMs.push(Math.round(performance.now() - tb));
    root.visible = false;
    const cam = def.cam;
    R.push({
      def, k, o, root, built,
      P: [o[0] + cam.p[0], cam.p[1], o[2] + cam.p[2]], T: [o[0] + cam.t[0], cam.t[1], o[2] + cam.t[2]],
      lens: cam.lens || [0, 0, 0, 0], fitW: cam.fitW || 8.5, fov: cam.fov || 32, dolly: (cam.dolly ?? 1.4) * .7, drift: cam.drift ?? .5, orbit: cam.orbit ?? 1, lean: cam.lean ?? 1
    });
    bump(.4 + .5 * (k + 1) / N);
    await frameWait();
  }

  /* ------------------------------------------------------------------ UI */
  function splitLetters(el) {
    const txt = el.textContent; el.setAttribute('aria-label', txt); el.textContent = '';
    const out = [];
    txt.split(' ').forEach((word, wi, arr) => {
      const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
      [...word].forEach(ch => { const s = document.createElement('span'); s.className = 'l'; s.textContent = ch; w.appendChild(s); out.push(s); });
      el.appendChild(w); if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return out;
  }
  const chapters = $$('.chapter').map(el => {
    const big = $('.big', el), letters = splitLetters(big);
    return { el, big, k: +el.dataset.i, side: el.classList.contains('right') ? 'right' : 'left', letters, parts: [$('.num', el), $('.lede', el), $('.meta', el)] };
  });
  const lockup = $('#lockup'), lkLetters = $$('#lkword .l');
  const bar = $('#bar'), indexEl = $('#index'), vol = $('#vol'), cue = $('#cue'), scrim = $('#scrim'), contact = $('#contact'), crew = $('#crew');
  const CREW_I = ST.findIndex(s => s.id === 'crew');
  const idxLinks = $$('a', indexEl), idxNums = $$('u', indexEl);
  const volNo = $('#volNo'), volName = $('#volName');
  const NAMES = ['Marketing Media', 'Poster Design', 'Reel Editing', 'Meta & Google Ads', 'Web Development', 'Automations', 'CRM Setup', 'Analytics', 'Brand & Social', 'The Crew', 'Start a project'];

  function fit() {
    chapters.forEach(c => {
      c.big.style.fontSize = '';
      const max = PORT ? VW - 40 : VW * .44;
      const w = c.big.scrollWidth; if (w > max) c.big.style.fontSize = (parseFloat(getComputedStyle(c.big).fontSize) * max / w) + 'px';
    });
  }

  /* cache writes so a frame costs only what changed */
  const setO = (el, v) => { const s = v.toFixed(3); if (el._o !== s) { el.style.opacity = s; el._o = s; } };
  const setT = (el, v) => { if (el._t !== v) { el.style.transform = v; el._t = v; } };
  const setF = (el, v) => { if (el._f !== v) { el.style.filter = v; el._f = v; } };
  const setVis = (el, v) => { if (el._v !== v) { el.style.visibility = v; el._v = v; } };

  function titleLetters(list, inn, out, dir, svg) {
    const n = list.length, blur = lv >= 2 && !svg;
    for (let j = 0; j < n; j++) {
      const l = list[j];
      const a = K.clamp01(inn * 1.9 - (j / n) * .9);
      const b = K.clamp01(out * 1.7 - ((dir > 0 ? j : n - 1 - j) / n) * .7);
      setO(l, a * (1 - b));
      if (a < 1 || b > 0) {
        const e = 1 - K.eo(a), rise = e * .3 - b * .14;
        setT(l, svg ? `translate3d(${(b * 18 * dir).toFixed(1)}px,${(rise * 40).toFixed(1)}%,0)`
          : `translate3d(${(b * 22 * dir).toFixed(1)}px,${rise.toFixed(3)}em,0)`);
        if (blur) { const bl = e * 8 + b * 6; setF(l, bl > .2 ? `blur(${bl.toFixed(1)}px)` : 'none'); }
      } else { setT(l, 'none'); if (blur) setF(l, 'none'); }
    }
  }

  let finaleA = 0, crewA = 0;
  function updateUI(T) {
    const rev = S.reveal;
    const chromeA = K.ramp(rev, .45, 1);
    setO(bar, chromeA); setO(indexEl, chromeA * (1 - Math.max(finaleA, crewA)));
    setO(vol, chromeA); setO(cue, chromeA * (T.i === 0 ? 1 - K.ramp(T.f, 0, .3) : 0) * (S.sp < .35 ? 1 : 0));
    /* hero lockup */
    {
      const inn = K.ramp(rev, .2, .95), out = T.i === 0 ? K.ramp(T.f, 0, .45) : 1;
      const o = inn * (1 - out);
      setVis(lockup, o > .002 ? 'visible' : 'hidden');
      if (o > .002) {
        setO(lockup, 1);
        titleLetters(lkLetters, inn, out, -1, true);
        for (let i = 0, n = lockup.children.length, ix = 0; i < n; i++) {
          const el = lockup.children[i]; if (el.classList.contains('lk-h1')) continue;
          const a = K.ramp(inn, .35 + ix * .08, .9 + ix * .02) * (1 - out); ix++;
          setO(el, a); setT(el, `translate3d(0,${((1 - K.eo(K.ramp(inn, .35 + (ix - 1) * .08, .9))) * 18).toFixed(1)}px,0)`);
        }
      }
    }
    /* department chapters */
    let scr = 0, side = 'left';
    chapters.forEach(c => {
      const k = c.k;
      const arr = T.i === k - 1 ? K.ramp(T.f, .55, 1) : (T.i >= k ? 1 : 0);
      const ext = T.i === k ? K.ramp(T.f, 0, .42) : (T.i > k ? 1 : 0);
      const on = arr > .001 && ext < .999;
      setVis(c.el, on ? 'visible' : 'hidden');
      if (!on) return;
      setO(c.el, 1);
      const dir = c.side === 'right' ? 1 : -1;
      titleLetters(c.letters, arr, ext, dir, false);
      c.parts.forEach((p, i) => {
        const a = K.ramp(arr, .25 + i * .14, .75 + i * .12) * (1 - K.ramp(ext, 0, .55));
        setO(p, a); setT(p, `translate3d(${(dir * (1 - a) * -14).toFixed(1)}px,${((1 - K.eo(a)) * 16).toFixed(1)}px,0)`);
      });
      const v = arr * (1 - ext); if (v > scr) { scr = v; side = c.side; }
    });
    setO(scrim, scr); setVis(scrim, scr > .003 ? 'visible' : 'hidden'); if (scrim.dataset.side !== side) scrim.dataset.side = side;
    /* index + volume line */
    const cur = T.f > .5 ? T.i + 1 : T.i;
    if (cur !== updateUI.cur) {
      updateUI.cur = cur;
      idxLinks.forEach((a, n) => { const on = n + 1 === cur; a.classList.toggle('on', on); idxNums[n].classList.toggle('on', on); a.style.opacity = on ? 1 : .45; idxNums[n].style.opacity = on ? 1 : ''; });
      volName.textContent = NAMES[Math.min(cur, NAMES.length - 1)]; volNo.textContent = String(Math.min(cur, 9)).padStart(2, '0');
    }
    /* crew panel */
    if (crew) {
      const a = crewA;
      setVis(crew, a > .01 ? 'visible' : 'hidden'); setO(crew, K.ramp(a, .2, 1));
      setT(crew, PORT ? `translate3d(0,${((1 - a) * 24).toFixed(1)}px,0)` : `translate3d(${((1 - a) * 40).toFixed(1)}px,-48%,0)`);
      const on = a > .75; if (crew.classList.contains('on') !== on) { crew.classList.toggle('on', on); crew.setAttribute('aria-hidden', on ? 'false' : 'true'); }
    }
    /* contact panel */
    const ca = finaleA;
    setVis(contact, ca > .01 ? 'visible' : 'hidden'); setO(contact, K.ramp(ca, .2, 1));
    setT(contact, PORT ? `translate3d(0,${((1 - ca) * 24).toFixed(1)}px,0)` : `translate3d(${((1 - ca) * 40).toFixed(1)}px,-46%,0)`);
    const onC = ca > .75; if (contact.classList.contains('on') !== onC) { contact.classList.toggle('on', onC); contact.setAttribute('aria-hidden', onC ? 'false' : 'true'); }
  }

  /* --------------------------------------------------------------- camera */
  const _p = new Vector3(), _t = new Vector3(), _push = new Vector3(), _orb = new Vector3();
  const approachOf = (k, sp) => {
    const a = k === 0 ? 0 : home[k] - MOVE * .98, x = K.clamp01((sp - a) / (home[k] + DW[k] - a));
    return 2 * x * x - x * x * x;
  };
  function applyApproach(r, a, w) {
    if (w <= 0) return;
    const side = Math.sign(r.drift) || 1;
    const yaw = side * .18 * r.orbit * (a - .4) * w;
    _orb.subVectors(_p, _t); const c = Math.cos(yaw), s = Math.sin(yaw);
    _p.set(_t.x + _orb.x * c - _orb.z * s, _p.y, _t.z + _orb.x * s + _orb.z * c);
    _push.set(r.T[0] - r.P[0], r.T[1] - r.P[1], r.T[2] - r.P[2]).normalize();
    _p.addScaledVector(_push, r.dolly * a * w);
    _p.y += .05 * (1 - a) * w; _p.x += r.drift * .8 * a * w; _t.x += r.drift * .3 * a * w;
  }
  function aimCamera(T) {
    const A = R[T.i], B = R[Math.min(N - 1, T.i + 1)], fe = T.fe;
    _p.set(A.P[0] + (B.P[0] - A.P[0]) * fe, A.P[1] + (B.P[1] - A.P[1]) * fe, A.P[2] + (B.P[2] - A.P[2]) * fe);
    _t.set(A.T[0] + (B.T[0] - A.T[0]) * fe, A.T[1] + (B.T[1] - A.T[1]) * fe, A.T[2] + (B.T[2] - A.T[2]) * fe);
    const arc = Math.sin(Math.PI * fe);
    _p.z += 1.6 * arc; _p.y += .3 * arc;
    const aA = approachOf(A.k, S.sp), aB = approachOf(B.k, S.sp);
    applyApproach(A, aA, 1 - fe);
    if (B !== A) applyApproach(B, aB, fe);
    if (S.introPull > 0) { _push.set(A.T[0] - A.P[0], A.T[1] - A.P[1], A.T[2] - A.P[2]).normalize(); _p.addScaledVector(_push, -2.2 * S.introPull); _p.y += .2 * S.introPull; }
    /* a portrait screen sees a narrow slice of the scene: stand back until the subject fits */
    { const asp = VW / VH; let k = 1;
      if (asp < 1.15) {                                              /* back off just far enough for this scene's width (fitW) to fit */
        const vw = 2 * _p.distanceTo(_t) * Math.tan(K.lerp(A.fov, B.fov, fe) * Math.PI / 360) * asp;
        k = Math.min(2.5, Math.max(1.3, K.lerp(A.fitW, B.fitW, fe) / vw));      /* never closer than 1.3x: the type sits under the scene */
        if (k > 1) { _orb.subVectors(_p, _t); _p.copy(_t).addScaledVector(_orb, k); }
      }
      scene.fog.density = .034 / k; }                                /* the fog thins as the camera backs off */
    const sw = reduced ? 0 : S.t;
    const lean = Math.max(.4, Math.min(1, _p.distanceTo(_t) / 7.2)) * (A.lean * (1 - fe) + B.lean * fe);
    _p.x += S.mx * .4 * lean + Math.sin(sw * .47) * .008;
    _p.y += -S.my * .18 * lean + Math.sin(sw * .61 + 1.3) * .01;
    _t.x += S.mx * .1 * lean;
    camera.position.copy(_p); camera.lookAt(_t);
    camera.rotation.z = S.mx * .004;
    camera.fov = K.lerp(A.fov, B.fov, fe);
    const o = PORT ? 2 : 0;
    const lx = K.lerp(A.lens[o] * (1 + .1 * aA), B.lens[o] * (1 + .1 * aB), fe);
    const ly = K.lerp(A.lens[o + 1], B.lens[o + 1], fe);
    camera.setViewOffset(VW, VH, -lx * VW, ly * VH, VW, VH);
    camera.updateProjectionMatrix();
  }

  /* ------------------------------------------------------------- scrolling */
  const track = $('#track');
  function sizeTrack() { track.style.height = Math.round(TOTAL * VH + VH) + 'px'; }
  function glideTo(k, dwAt = .55) {
    const kk = Math.max(0, Math.min(N - 1, k));
    const y = Math.round((home[kk] + DW[kk] * (kk === 0 ? 0 : dwAt)) * VH);
    cancelAnimationFrame(glideRaf);
    const y0 = scrollY, dist = y - y0; if (Math.abs(dist) < 4) return;
    const dur = reduced ? 1 : Math.min(3000, 900 + Math.abs(dist) / VH * 150), t0 = performance.now();
    const step = now => {
      const u = Math.min(1, (now - t0) / dur), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      scrollTo(0, y0 + dist * e);
      if (u < 1) glideRaf = requestAnimationFrame(step);
    };
    glideRaf = requestAnimationFrame(step);
  }
  const stopGlide = () => cancelAnimationFrame(glideRaf);
  addEventListener('wheel', stopGlide, { passive: true }); addEventListener('touchstart', stopGlide, { passive: true });
  addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) stopGlide(); });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-go]'); if (!a || dead) return;
    e.preventDefault(); glideTo(+a.dataset.go);
  });

  /* pointer: a lean for the camera, and a drag that turns the object on stage */
  addEventListener('pointermove', e => { S.tmx = (e.clientX / VW) * 2 - 1; S.tmy = (e.clientY / VH) * 2 - 1; }, { passive: true });
  document.addEventListener('pointerleave', () => { S.tmx = 0; S.tmy = 0; });
  const stage = $('#stage');
  let dragging = false, dragX = 0, dragStartX = 0, dragStartY = 0, dragMode = '';
  canvas.addEventListener('pointerdown', e => { dragging = true; dragMode = ''; dragX = dragStartX = e.clientX; dragStartY = e.clientY; });
  addEventListener('pointermove', e => {
    if (!dragging) return;
    if (!dragMode) { const dx = Math.abs(e.clientX - dragStartX), dy = Math.abs(e.clientY - dragStartY); if (dx + dy > 6) dragMode = dx > dy ? 'x' : 'y'; }
    if (dragMode === 'x') { S.drag += (e.clientX - dragX) * .008; S.dragV = (e.clientX - dragX) * .008; stage.classList.add('grabbing'); }
    dragX = e.clientX;
  }, { passive: true });
  const endDrag = () => { dragging = false; stage.classList.remove('grabbing'); };
  addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerenter', () => stage.classList.add('grab')); canvas.addEventListener('pointerleave', () => stage.classList.remove('grab'));

  /* --------------------------------------------------- quality level, applied live */
  let minMs = 0, capMs = 0;                        /* capMs: a 30 fps cap the governor chose for this device */
  function applyLevel(nl, nr) {
    lv = nl; res = nr; P.level = lv; const q = QL[lv];
    document.documentElement.dataset.q = String(lv);
    DPR = prFor(lv, res);
    renderer.setPixelRatio(DPR); renderer.setSize(VW, VH, false);
    K.q.animStep = 1 / q.anim;
    minMs = Math.max(capMs, q.cap || (P.touch ? 16 : 0));
  }
  function resize() {
    /* a phone's address bar sliding away changes the height a little: not a real resize */
    if (S.i0 !== null && Math.abs(innerWidth - VW) < 2 && Math.abs(innerHeight - VH) < 140 && innerWidth <= 820) return;
    const prevVH = VH, keep = scrollY / Math.max(1, prevVH);
    VW = innerWidth; VH = innerHeight; PORT = VW <= 820;
    camera.aspect = VW / VH;
    renderer.setPixelRatio(DPR); renderer.setSize(VW, VH, false);
    sizeTrack(); fit();
    if (S.i0 !== null && prevVH !== VH && S.lockSp === undefined) scrollTo(0, keep * VH);   /* keep the same moment of the story */
  }
  addEventListener('resize', resize);
  applyLevel(lv, 1);
  sizeTrack(); fit();
  document.fonts && document.fonts.ready.then(fit);

  /* Watch the frame time and keep the page feeling smooth, in this order of preference:
       1. a phone that cannot hold 60 fps settles at a steady 30 (a wobbling 45 looks worse than a calm 30)
       2. fewer pixels (the edges stay anti-aliased)
       3. a lighter quality level, and in the end the light page
     After a long calm stretch the resolution is given back, but never above a ceiling that already failed once. */
  let ema = 16, slow = 0, cool = 0, calm = 0, resMax = 1, upAt = -1e9;
  function adapt(ms, now) {
    if (S.reveal < 1 || S.t < 2.5 || ms > 120) return;
    if (cool > 0) { cool -= ms; return; }
    ema += (ms - ema) * .1;
    const budget = minMs >= 30 ? 40 : 21;
    if (ema > budget) slow += ms; else slow = Math.max(0, slow - ms * .6);
    calm = ema < budget * .66 && minMs < 30 ? calm + ms : 0;
    if (slow > 1200) {
      slow = 0; calm = 0; ema = 16; cool = 2000;
      const bumped = now - upAt < 14000;
      if (P.touch && minMs < 30) { capMs = 32; minMs = Math.max(minMs, 32); }
      else if (res > .76) applyLevel(lv, Math.max(.7, res - .15));       /* first just fewer pixels */
      else if (lv > 0) applyLevel(lv - 1, 1);                            /* then a lighter level */
      else if (res > .6) applyLevel(0, .6);
      else E.enterLite('performance');                                   /* nothing left to give */
      if (bumped) resMax = res;
    } else if (calm > 9000 && res < resMax) {
      calm = 0; upAt = now; cool = 1500;
      applyLevel(lv, Math.min(resMax, +(res + .1).toFixed(2)));
    }
  }

  /* ------------------------------------------------------------ first frame */
  scrollTo(0, 0);
  R.forEach(r => r.root.visible = true);
  aimCamera(travel(0));
  try { await renderer.compileAsync(scene, camera); } catch (e) { /* older drivers: compile on first draw */ }
  renderer.render(scene, camera);
  R.forEach((r, i) => r.root.visible = i === 0);
  bump(.97);
  await frameWait();

  /* ------------------------------------------------------------ frame loop */
  let last = performance.now(), lastRender = last, spPrev = 0;
  const U = { S, cam: camera };      /* one update packet, reused every frame (no garbage for the collector) */
  const frame = now => {
    if (dead) return;
    requestAnimationFrame(frame);
    if (minMs && now - lastRender < minMs - 1.5) return;          /* frame cap: phones, 120 Hz screens */
    const ms = now - lastRender; lastRender = now;
    const dt = Math.min(.05, Math.max(.0005, (now - last) / 1000)); last = now; S.t += dt;
    adapt(ms, now);

    /* scroll -> progress */
    S.target = S.lockSp ?? Math.max(0, Math.min(TOTAL, scrollY / VH));
    S.sp += (S.target - S.sp) * (1 - Math.exp(-dt * (reduced ? 14 : 6.2)));
    if (Math.abs(S.target - S.sp) < .0004) S.sp = S.target;
    const T = travel(S.sp);
    const vNow = Math.abs(S.sp - spPrev) / dt; spPrev = S.sp;
    S.vel += (Math.min(1, vNow / 5.5) - S.vel) * (1 - Math.exp(-dt * 8));

    /* intro */
    if (S.i0 !== null) S.reveal = Math.min(1, (now - S.i0) / 1000 / (reduced ? .8 : 2.6));
    S.introPull = reduced ? 0 : 1 - K.eo(K.ramp(S.reveal, 0, .9));

    /* pointer + drag */
    S.mx += (S.tmx - S.mx) * (1 - Math.exp(-dt * 4.5)); S.my += (S.tmy - S.my) * (1 - Math.exp(-dt * 4.5));
    if (!dragging) { S.drag += S.dragV; S.dragV *= Math.exp(-dt * 5); S.drag *= Math.exp(-dt * 1.6); }

    finaleA = N < 2 ? 0 : (T.i === N - 1 ? 1 : (T.i === N - 2 ? K.ramp(T.f, .6, 1) : 0));
    crewA = CREW_I < 0 ? 0 : (T.i === CREW_I ? 1 - K.ramp(T.f, 0, .4) : (T.i === CREW_I - 1 ? K.ramp(T.f, .55, 1) : 0));

    aimCamera(T);

    /* which scenes draw, and how far along each is */
    for (let k = 0; k < N; k++) {
      const r = R[k];
      const vis = k === T.i || (k === T.i + 1 && T.f > 0);
      if (r.root.visible !== vis) r.root.visible = vis;
      if (!vis) continue;
      const mine = k === T.i, dw = mine ? T.dw : 0;
      U.dw = dw; U.enter = mine ? 1 : T.fe; U.leave = mine ? T.fe : 0; U.t = S.t; U.dt = dt; U.vel = S.vel; U.reveal = k === 0 ? S.reveal : 1; U.active = mine ? 1 - T.fe : T.fe; U.drag = S.drag;
      r.built.update(U);
    }

    /* the key light follows the camera target, so every scene is lit the same way */
    key.position.set(_t.x + 4.5, 8, _t.z + 6); key.target.position.set(_t.x, 1.2, _t.z);

    updateUI(T);
    renderer.render(scene, camera);
  };

  /* ------------------------------------------------------------- hand-off */
  window.__elora = {
    S, R, THREE, camera, scene, renderer, home, TOTAL, DW, MOVE, travel, P, buildMs,
    /* dev helpers: jump to a scene and hold there (unlock() hands scrolling back); setLevel(n) tries a quality level */
    goto(k, dw = .55) { const kk = Math.max(0, Math.min(N - 1, k)); S.lockSp = home[kk] + DW[kk] * dw; scrollTo(0, S.lockSp * VH); S.sp = S.target = S.lockSp; },
    unlock() { S.lockSp = undefined; },
    setLevel(n, r = 1) { cool = 99999; applyLevel(n, r); },
    state() { const T = travel(S.sp); return { sp: +S.sp.toFixed(3), i: T.i, dw: +T.dw.toFixed(3), f: +T.f.toFixed(3), level: lv, res: +res.toFixed(2), dpr: +DPR.toFixed(2), ema: +ema.toFixed(1), vw: VW, vh: VH, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; }
  };
  requestAnimationFrame(frame);
  L.finish().then(() => { S.i0 = performance.now(); });
  L.gone.then(() => { document.body.classList.add('ready'); });
})();
