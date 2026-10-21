/* elora — engine.
   One fixed WebGL stage on a quiet paper-coloured set. The page's scroll position is a
   single number (SP, in "screens") that drives everything: the camera glides between
   stations, a department station is a tour with one stage per beat, each stage animates by
   its own progress, and the DOM chapters assemble and leave in step. Stations are registered
   by js/st-*.js.

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
    const pRB = import('three/addons/geometries/RoundedBoxGeometry.js'), pBU = import('three/addons/utils/BufferGeometryUtils.js').catch(() => null);
    THREE = await import('three'); bump(.1);
    X.RoundedBoxGeometry = (await pRB).RoundedBoxGeometry;
    { const bu = await pBU; if (bu) X.toCreasedNormals = bu.toCreasedNormals; }       /* (without it the logo sides are flat-shaded: still fine) */
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
      new Promise(r => setTimeout(r, 1500))
    ]);
  } catch (e) { /* system fonts will do */ }
  bump(.36);

  const { Vector3, Color } = THREE;
  const K = E.initKit(THREE, X);
  const ST = E.stations, N = ST.length;

  /* ---------------------------------------------------------------- state */
  const S = { sp: 0, sp1: 0, target: 0, vel: 0, t: 0, mx: 0, my: 0, tmx: 0, tmy: 0, reveal: 0, i0: null, drag: 0, dragV: 0, reduced, introPull: 1 };
  let glideRaf = 0;
  let VW = innerWidth, VH = innerHeight, PORT = VW <= 820, DPR = 1, res = 1, dead = false;
  const devDPR = Math.min(window.devicePixelRatio || 1, 3);
  const prFor = (l, r) => Math.max(.5, Math.min(devDPR, QL[l].dpr) * r);

  /* ------------------------------------------------------------ timeline
     Screens of scrolling: pause on a station (a department pauses once per beat), then glide to
     the next. A beat is held for HOLD of its length, then the camera flies on to the next stage. */
  const MOVE = .5, DWS = .76, HOLD = .55, STAGE = 9;
  const NB = ST.map(s => s.camBeats ? s.camBeats.length : 1);
  const DW = ST.map((s, i) => (s.dwell || (i === N - 1 ? 1.3 : 1.0)) * DWS);
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
  const ZS = [0, -1.5, 1.2, -1.8, -1.2, 0];
  /* where each station stands: departments are wider (their stages stand in a row), so they get more room */
  const OX = []; { let x = 0; for (let k = 0; k < N; k++) { if (k) x += (NB[k - 1] - 1) / 2 * STAGE + 18 + (NB[k] - 1) / 2 * STAGE; OX[k] = x; } }
  const R = [], buildMs = [];
  const ctx = { THREE, K, S, renderer, scene, camera, reduced, get PORT() { return PORT; } };
  for (let k = 0; k < N; k++) {
    const def = ST[k];
    const o = [OX[k], 0, ZS[k % ZS.length]];
    const root = new THREE.Group(); root.position.set(o[0], 0, o[2]); scene.add(root);
    let built; const tb = performance.now();
    try { built = def.build(ctx); } catch (e) { console.error('elora: scene failed', def.id, e); built = { group: new THREE.Group(), update() { } }; }
    root.add(built.group); buildMs.push(Math.round(performance.now() - tb));
    root.visible = false;
    const cam = def.cam;
    const beats = (def.camBeats || [cam]).map(b => ({
      P: [o[0] + b.p[0], b.p[1], o[2] + b.p[2]], T: [o[0] + b.t[0], b.t[1], o[2] + b.t[2]],
      lens: (b.lens || [0, 0, 0, 0]).slice(), fitW: b.fitW || 8.5, fov: b.fov || cam.fov || 32
    }));
    R.push({
      def, k, o, root, built, beats, P: beats[0].P, T: beats[0].T, fov: beats[0].fov,
      dolly: (cam.dolly ?? 1.4) * .7, drift: cam.drift ?? .5, orbit: cam.orbit ?? 1, lean: cam.lean ?? 1
    });
    bump(.4 + .5 * (k + 1) / N);
    if (k === 0 || k % 2 === 0) await frameWait();
  }

  /* ------------------------------------------------------------------ UI */
  /* a headline becomes words, each in a mask, so it can rise out of a line (the classic reveal) */
  function splitWords(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const out = [], frag = document.createDocumentFragment();
    const wrap = (txt, tag) => {
      txt.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const m = document.createElement('span'), w = document.createElement('span'); m.className = 'wm'; w.className = 'wi'; m.setAttribute('aria-hidden', 'true');
        if (tag) { const i = document.createElement(tag); i.textContent = part; w.appendChild(i); } else w.textContent = part;
        m.appendChild(w); frag.appendChild(m); out.push(w);
      });
    };
    [...el.childNodes].forEach(n => { if (n.nodeType === 3) wrap(n.textContent, null); else if (n.nodeType === 1) wrap(n.textContent, n.tagName.toLowerCase()); });
    el.textContent = ''; el.appendChild(frag); return out;
  }
  const chapters = $$('.chapter').map(el => {
    const words = splitWords($('.big', el));
    return { el, k: +el.dataset.k, b: +el.dataset.b, side: el.classList.contains('right') ? 'right' : 'left', words, parts: [$('.num', el), $('.lede', el), $('.meta', el)].filter(Boolean) };
  });
  /* each chapter owns a window of scroll: it rises in as the camera arrives and lifts away as it leaves */
  chapters.forEach(c => {
    const n = NB[c.k], seg = DW[c.k] / n, base = home[c.k] + c.b * seg, last = c.b === n - 1;
    c.in0 = c.b === 0 ? home[c.k] - MOVE * .5 : base - .24 * seg;
    c.in1 = c.b === 0 ? home[c.k] + .12 * seg : base + .12 * seg;
    c.out0 = last ? home[c.k] + DW[c.k] : base + .58 * seg;
    c.out1 = last ? home[c.k] + DW[c.k] + MOVE * .5 : base + .86 * seg;
    /* the stage sits on the side opposite the words */
    const bt = R[c.k] && R[c.k].beats[c.b];
    if (bt) { const m = Math.abs(bt.lens[0]); bt.lens[0] = c.side === 'left' ? m : -m; }
  });
  const lockup = $('#lockup'), lkLetters = $$('#lkword .l'), lkH1 = $('.lk-h1', lockup), lkSub = $('.lk-sub', lockup), lkSubLines = $$('s', lkSub);
  const barItems = [$('.brand', $('#bar')), ...$$('.nav a', $('#bar')), $('.right', $('#bar'))].filter(Boolean);
  const bar = $('#bar'), rail = $('#rail'), cue = $('#cue'), scrim = $('#scrim'), contact = $('#contact'), crew = $('#crew');
  const CREW_I = ST.findIndex(s => s.id === 'crew');

  /* the slider on the right: where you are in the story, and a way to jump */
  const LABEL = { hero: 'Intro', editing: 'Editing', technical: 'Technical', marketing: 'Marketing', crew: 'The crew', finale: 'Contact' };
  const railLine = $('.rl-line', rail), railFill = $('.rl-fill', rail), railKnob = $('.rl-knob', rail), railList = $('.rl-list', rail);
  const railItems = ST.map((def, k) => {
    const li = document.createElement('li'), a = document.createElement('a');
    li.style.top = (home[k] / TOTAL * 100).toFixed(2) + '%';
    a.href = '#' + def.id; a.dataset.go = k; a.setAttribute('aria-label', LABEL[def.id] || def.id);
    a.innerHTML = '<span>' + (LABEL[def.id] || def.id) + '</span><i></i>';
    li.appendChild(a); railList.appendChild(li);
    for (let j = 1; j < NB[k]; j++) {                          /* a small tick for every stage inside a department */
      const t = document.createElement('li'); t.className = 'tick'; t.style.top = ((home[k] + DW[k] * j / NB[k]) / TOTAL * 100).toFixed(2) + '%'; railList.appendChild(t);
    }
    return a;
  });
  let railH = 1;
  /* The crew list is pinned by its top edge, so opening a name only ever pushes the names below it
     down; nothing above moves. Its top is where a fully closed list would sit centred. */
  const measureRail = () => {
    railH = railLine.offsetHeight || 1;
    if (crew) {
      let h = crew.offsetHeight; crew.querySelectorAll('.cr.open .cr-d').forEach(d => { h -= d.offsetHeight; });
      const top = PORT ? Math.max(72, VH - 160 - h) : Math.max(84, Math.round((VH - h) / 2));
      crew.style.setProperty('--crew-top', top + 'px');
    }
  };

  /* cache writes so a frame costs only what changed */
  const setO = (el, v) => { const s = v.toFixed(3); if (el._o !== s) { el.style.opacity = s; el._o = s; } };
  const setT = (el, v) => { if (el._t !== v) { el.style.transform = v; el._t = v; } };
  const setVis = (el, v) => { if (el._v !== v) { el.style.visibility = v; el._v = v; } };
  const rise = q => 1 - Math.pow(1 - q, 4);                    /* ease-out quart: quick start, long soft landing */

  let finaleA = 0, crewA = 0;
  function updateUI(T) {
    const rev = S.reveal;
    const chromeA = K.ramp(rev, .2, .7);
    setO(bar, chromeA); setO(rail, chromeA * (1 - (PORT ? Math.max(finaleA, crewA) : 0)));
    setO(cue, chromeA * (T.i === 0 ? 1 - K.ramp(T.f, 0, .3) : 0) * (S.sp < .35 ? 1 : 0));
    /* the top bar settles in piece by piece: brand, each link, then the button */
    for (let i = 0; i < barItems.length; i++) {
      const a = K.ramp(rev, .04 + i * .05, .5 + i * .05), it = barItems[i];
      setO(it, a); setT(it, a >= 1 ? 'none' : `translate3d(0,${((1 - rise(a)) * -16).toFixed(1)}px,0)`);
    }
    /* the landing page. Opening: the wordmark rises out of its own baseline, the line under it
       draws out, the small caps open up, the paragraph and buttons float up. Scrolling away: the
       parts drift up at different speeds (depth) and fade, while the 3D logo keeps turning. */
    {
      const hs = T.i === 0 ? T.dw * .35 + T.f * .65 : 1;                  /* how far the landing page has been scrolled, 0 … 1 */
      const inn = K.ramp(rev, .1, .95), out = T.i === 0 ? K.ramp(hs, .3, .8) : 1;
      const o = inn * (1 - out);
      setVis(lockup, o > .002 ? 'visible' : 'hidden');
      if (o > .002) {
        setO(lockup, 1);
        setT(lkH1, `translate3d(0,${(-hs * 46).toFixed(1)}px,0)`);
        for (let j = 0, n = lkLetters.length; j < n; j++) {
          const a = K.ramp(inn, j * .09, j * .09 + .62), l = lkLetters[j];
          setO(l, 1 - out);
          setT(l, a >= 1 && out <= 0 ? 'none' : `translate3d(0,${((1 - rise(a)) * 112 - out * 22).toFixed(1)}%,0)`);
        }
        for (let i = 0, n = lockup.children.length, ix = 0; i < n; i++) {
          const el = lockup.children[i]; if (el.classList.contains('lk-h1')) continue;
          const a0 = K.ramp(inn, .42 + ix * .08, .96), a = a0 * (1 - out);
          setO(el, a); setT(el, `translate3d(0,${((1 - rise(a0)) * 24 - hs * (60 + ix * 22)).toFixed(1)}px,0)`);
          if (el === lkSub) {
            const ls = (.86 - .44 * rise(a0)).toFixed(3) + 'em'; if (el._ls !== ls) { el.style.letterSpacing = ls; el._ls = ls; }
            for (let q = 0; q < lkSubLines.length; q++) setT(lkSubLines[q], `scaleX(${rise(K.ramp(a0, .1, 1)).toFixed(3)})`);
          }
          ix++;
        }
      }
    }
    /* department chapters */
    let scr = 0, side = 'left';
    const sp = S.sp;
    for (let ci = 0; ci < chapters.length; ci++) {
      const c = chapters[ci];
      const arr = K.ramp(sp, c.in0, c.in1), ext = K.ramp(sp, c.out0, c.out1);
      const on = arr > .001 && ext < .999;
      setVis(c.el, on ? 'visible' : 'hidden');
      if (!on) continue;
      const drift = K.clamp01((sp - c.in1) / Math.max(.01, c.out0 - c.in1));       /* a slow upward drift while the chapter is on screen: nothing ever sits dead still */
      setO(c.el, 1 - ext); setT(c.el, `translate3d(0,${(-ext * 26 - drift * 14).toFixed(1)}px,0)`);
      for (let j = 0, n = c.words.length; j < n; j++) {
        const a = K.ramp(arr, j * .1, j * .1 + .62);
        setT(c.words[j], a >= 1 ? 'none' : `translate3d(0,${((1 - rise(a)) * 110).toFixed(1)}%,0)`);
      }
      for (let i = 0; i < c.parts.length; i++) {
        const p = c.parts[i], a = K.ramp(arr, .12 + i * .2, .62 + i * .22);
        setO(p, a); setT(p, a >= 1 ? 'none' : `translate3d(0,${((1 - rise(a)) * 20).toFixed(1)}px,0)`);
      }
      const v = arr * (1 - ext); if (v > scr) { scr = v; side = c.side; }
    }
    setO(scrim, scr); setVis(scrim, scr > .003 ? 'visible' : 'hidden'); if (scrim.dataset.side !== side) scrim.dataset.side = side;
    /* the slider */
    const prog = TOTAL > 0 ? sp / TOTAL : 0;
    setT(railFill, `scaleY(${prog.toFixed(4)})`); setT(railKnob, `translate3d(0,${(prog * railH).toFixed(1)}px,0)`);
    const cur = T.f > .5 ? T.i + 1 : T.i;
    if (cur !== updateUI.cur) { updateUI.cur = cur; railItems.forEach((a, n) => a.parentNode.classList.toggle('on', n === cur)); }
    /* crew panel */
    if (crew) {
      const a = crewA;
      setVis(crew, a > .01 ? 'visible' : 'hidden'); setO(crew, K.ramp(a, .2, 1));
      setT(crew, PORT ? `translate3d(0,${((1 - a) * 24).toFixed(1)}px,0)` : `translate3d(${((1 - a) * 40).toFixed(1)}px,0,0)`);
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
  const mkKf = () => ({ P: [0, 0, 0], T: [0, 0, 0], lens: [0, 0, 0, 0], fitW: 0, fov: 0 });
  const _kfA = mkKf(), _kfB = mkKf();
  /* where the camera stands inside a station at dwell progress dw (a department flies stage to stage) */
  function kfAt(r, dw, o) {
    const bs = r.beats, n = bs.length; let j = 0, m = 0;
    if (n > 1) { const b = Math.min(n - 1e-6, dw * n); j = b | 0; m = j < n - 1 ? K.sm(K.ramp(b - j, HOLD, 1)) : 0; }
    const a = bs[j], c = bs[j + 1 < n ? j + 1 : j];
    for (let i = 0; i < 3; i++) { o.P[i] = a.P[i] + (c.P[i] - a.P[i]) * m; o.T[i] = a.T[i] + (c.T[i] - a.T[i]) * m; }
    for (let i = 0; i < 4; i++) o.lens[i] = a.lens[i] + (c.lens[i] - a.lens[i]) * m;
    o.fitW = a.fitW + (c.fitW - a.fitW) * m; o.fov = a.fov + (c.fov - a.fov) * m;
    return o;
  }
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
    const a = kfAt(A, T.dw, _kfA), b = fe > 0 && B !== A ? kfAt(B, 0, _kfB) : a;
    _p.set(a.P[0] + (b.P[0] - a.P[0]) * fe, a.P[1] + (b.P[1] - a.P[1]) * fe, a.P[2] + (b.P[2] - a.P[2]) * fe);
    _t.set(a.T[0] + (b.T[0] - a.T[0]) * fe, a.T[1] + (b.T[1] - a.T[1]) * fe, a.T[2] + (b.T[2] - a.T[2]) * fe);
    const arc = Math.sin(Math.PI * fe);
    _p.z += 1.6 * arc; _p.y += .3 * arc;
    const aA = approachOf(A.k, S.sp), aB = approachOf(B.k, S.sp);
    applyApproach(A, aA * (A.beats.length > 1 ? .4 : 1), 1 - fe);
    if (B !== A) applyApproach(B, aB, fe);
    if (S.introPull > 0) { _push.set(A.T[0] - A.P[0], A.T[1] - A.P[1], A.T[2] - A.P[2]).normalize(); _p.addScaledVector(_push, -2.2 * S.introPull); _p.y += .2 * S.introPull; }
    const fov = a.fov + (b.fov - a.fov) * fe;
    /* a portrait screen sees a narrow slice of the scene: stand back until the subject fits */
    { const asp = VW / VH; let k = 1;
      if (asp < 1.15) {                                              /* back off just far enough for this scene's width (fitW) to fit */
        const vw = 2 * _p.distanceTo(_t) * Math.tan(fov * Math.PI / 360) * asp;
        k = Math.min(2.5, Math.max(1.3, (a.fitW + (b.fitW - a.fitW) * fe) / vw));      /* never closer than 1.3x: the type sits under the scene */
      } else if (asp < 1.7) k = Math.min(1.35, 1.7 / asp);           /* a squarer window: ease back so the stage never runs into the words */
      if (k > 1) { _orb.subVectors(_p, _t); _p.copy(_t).addScaledVector(_orb, k); }
      scene.fog.density = .034 / k; }                                /* the fog thins as the camera backs off */
    const sw = reduced ? 0 : S.t;
    const lean = Math.max(.4, Math.min(1, _p.distanceTo(_t) / 7.2)) * (A.lean * (1 - fe) + B.lean * fe);
    _p.x += S.mx * .4 * lean + Math.sin(sw * .47) * .008;
    _p.y += -S.my * .18 * lean + Math.sin(sw * .61 + 1.3) * .01;
    _t.x += S.mx * .1 * lean;
    camera.position.copy(_p); camera.lookAt(_t);
    camera.rotation.z = S.mx * .004;
    camera.fov = fov;
    const o = PORT ? 2 : 0;
    const lx = (a.lens[o] * (1 + .1 * aA)) * (1 - fe) + (b.lens[o] * (1 + .1 * aB)) * fe;
    const ly = a.lens[o + 1] + (b.lens[o + 1] - a.lens[o + 1]) * fe;
    camera.setViewOffset(VW, VH, -lx * VW, ly * VH, VW, VH);
    camera.updateProjectionMatrix();
  }

  /* ------------------------------------------------------------- scrolling */
  const track = $('#track');
  function sizeTrack() { track.style.height = Math.round(TOTAL * VH + VH) + 'px'; }
  /* a click on the slider or the menu lands on the first stage of that station */
  const landing = k => NB[k] > 1 ? .26 / NB[k] : (k === 0 ? 0 : .55);
  function glideTo(k, dwAt) {
    const kk = Math.max(0, Math.min(N - 1, k));
    const y = Math.round((home[kk] + DW[kk] * (dwAt ?? landing(kk))) * VH);
    cancelAnimationFrame(glideRaf);
    const y0 = scrollY, dist = y - y0; if (Math.abs(dist) < 4) return;
    const dur = reduced ? 1 : Math.min(2000, 700 + Math.abs(dist) / VH * 95), t0 = performance.now();
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
    sizeTrack(); measureRail();
    if (S.i0 !== null && prevVH !== VH && S.lockSp === undefined) scrollTo(0, keep * VH);   /* keep the same moment of the story */
  }
  addEventListener('resize', resize);
  applyLevel(lv, 1);
  sizeTrack(); measureRail();
  document.fonts && document.fonts.ready.then(measureRail);

  /* Watch the frame time and keep the page feeling smooth, in this order of preference:
       1. fewer pixels (the edges stay anti-aliased)
       2. a phone that cannot hold 60 fps settles at a steady 30 (a wobbling 45 looks worse than a calm 30)
       3. a lighter quality level, and in the end the light page
     After a long calm stretch the resolution is given back, but never above a ceiling that already failed once. */
  let ema = 16, slow = 0, cool = 0, calm = 0, resMax = 1, upAt = -1e9;
  let wasIdle = false;
  function adapt(ms, now, idle) {
    if (S.t < 1.2 || ms > 120) return;
    if (idle) { wasIdle = true; return; }                                /* (idle frames are slow on purpose) */
    if (wasIdle) { wasIdle = false; ema = 16; slow = 0; }
    if (cool > 0) { cool -= ms; return; }
    ema += (ms - ema) * .1;
    const budget = minMs >= 30 ? 40 : 21;
    if (ema > budget) slow += ms; else slow = Math.max(0, slow - ms * .6);
    calm = ema < budget * .86 && minMs < 30 ? calm + ms : 0;
    if (slow > 800) {
      slow = 0; calm = 0; ema = 16; cool = 1200;
      const bumped = now - upAt < 14000;
      if (res > .76) applyLevel(lv, Math.max(.72, +(res - .14).toFixed(2)));        /* first just fewer pixels */
      else if (P.touch && minMs < 30) { capMs = 32; minMs = Math.max(minMs, 32); }  /* then a steady 30 fps */
      else if (lv > 0) applyLevel(lv - 1, 1);                                       /* then a lighter level */
      else if (res > .6) applyLevel(0, .6);
      else E.enterLite('performance');                                              /* nothing left to give */
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
  /* A short speed test while the loader is still up: ~10 frames of the hero at the chosen quality.
     A device that cannot hold 60 fps starts at fewer pixels instead of stuttering first. */
  if (!document.hidden) {
    const ts = []; let pv = performance.now();
    for (let i = 0; i < 10; i++) { renderer.render(scene, camera); await frameWait(); const n = performance.now(); ts.push(n - pv); pv = n; }
    const run = ts.slice(3).sort((a, b) => a - b), med = run[run.length >> 1], fast = run[0];
    if (med < 100) {
      if (fast > 28) { if (P.touch) { capMs = 32; applyLevel(lv, res); } }                       /* the screen itself runs at 30 Hz (power saving) */
      else if (med > 19) applyLevel(lv, Math.max(.6, Math.min(1, +Math.sqrt(17 / med).toFixed(2))));
    }
  }

  /* ------------------------------------------------------------ frame loop */
  let last = performance.now(), lastRender = last, spPrev = 0;
  const U = { S, cam: camera };      /* one update packet, reused every frame (no garbage for the collector) */
  const REVEAL_S = reduced ? .8 : 2.3;
  const frame = now => {
    if (dead) return;
    requestAnimationFrame(frame);
    const idle = P.touch && lv === 0 && !dragging && S.vel < .004 && Math.abs(S.target - S.sp) < .0015 && S.reveal >= 1;
    const gate = idle ? Math.max(minMs, 32) : minMs;
    if (gate && now - lastRender < gate - 1.5) return;            /* frame cap: phones, 120 Hz screens */
    const ms = now - lastRender; lastRender = now;
    const dt = Math.min(.05, Math.max(.0005, (now - last) / 1000)); last = now; S.t += dt;
    adapt(ms, now, idle);

    /* scroll -> progress. Two soft stages in a row: the story eases into motion and eases to a stop
       (momentum), instead of snapping to the finger */
    S.target = S.lockSp ?? Math.max(0, Math.min(TOTAL, scrollY / VH));
    const kf = 1 - Math.exp(-dt * (reduced ? 14 : 10));
    S.sp1 += (S.target - S.sp1) * kf; S.sp += (S.sp1 - S.sp) * kf;
    if (Math.abs(S.target - S.sp) < .0004 && Math.abs(S.target - S.sp1) < .0004) S.sp = S.sp1 = S.target;
    const T = travel(S.sp);
    const vNow = Math.abs(S.sp - spPrev) / dt; spPrev = S.sp;
    S.vel += (Math.min(1, vNow / 5.5) - S.vel) * (1 - Math.exp(-dt * 8));

    /* intro */
    if (S.i0 !== null) S.reveal = Math.min(1, (now - S.i0) / 1000 / REVEAL_S);
    S.introPull = reduced ? 0 : 1 - K.eo(K.ramp(S.reveal, 0, .9));

    /* pointer + drag */
    S.mx += (S.tmx - S.mx) * (1 - Math.exp(-dt * 4.5)); S.my += (S.tmy - S.my) * (1 - Math.exp(-dt * 4.5));
    if (!dragging) { S.drag += S.dragV; S.dragV *= Math.exp(-dt * 5); S.drag *= Math.exp(-dt * 1.6); }

    finaleA = N < 2 ? 0 : (T.i === N - 1 ? 1 : (T.i === N - 2 ? K.ramp(T.f, .6, 1) : 0));
    crewA = CREW_I < 0 ? 0 : (T.i === CREW_I ? 1 - K.ramp(T.f, 0, .4) : (T.i === CREW_I - 1 ? K.ramp(T.f, .55, 1) : 0));

    aimCamera(T);
    /* the studio light drifts as you scroll, so the reflections slide across the lacquer like a turning product */
    if (scene.environmentRotation) scene.environmentRotation.y = (reduced ? 0 : S.t * .03) - S.sp * .32 + (1 - S.reveal) * .8;

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
    S, R, THREE, camera, scene, renderer, home, TOTAL, DW, NB, MOVE, travel, P, buildMs,
    /* dev helpers: jump to a scene and hold there (unlock() hands scrolling back); setLevel(n) tries a quality level */
    goto(k, dw) { const kk = Math.max(0, Math.min(N - 1, k)); S.lockSp = home[kk] + DW[kk] * (dw ?? landing(kk)); scrollTo(0, S.lockSp * VH); S.sp = S.sp1 = S.target = S.lockSp; },
    unlock() { S.lockSp = undefined; },
    setLevel(n, r = 1) { cool = 99999; applyLevel(n, r); },
    state() { const T = travel(S.sp); return { sp: +S.sp.toFixed(3), i: T.i, dw: +T.dw.toFixed(3), f: +T.f.toFixed(3), level: lv, res: +res.toFixed(2), dpr: +DPR.toFixed(2), ema: +ema.toFixed(1), vw: VW, vh: VH, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; }
  };
  requestAnimationFrame(frame);
  L.finish().then(() => { S.i0 = performance.now(); });
  L.gone.then(() => { document.body.classList.add('ready'); });
})();
