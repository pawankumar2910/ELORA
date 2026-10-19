/* elora kit — shared helpers for every scene: easing, a small material library
   (porcelain, navy and blue lacquer, steel, glass), canvas screens, soft contact
   shadows and the 3D logo. Built once main.js has three.js in hand. */
(function () {
  const ELORA = window.ELORA = window.ELORA || {};
  ELORA.stations = ELORA.stations || [];
  ELORA.add = def => ELORA.stations.push(def);

  ELORA.initKit = function (THREE, X) {
    const K = { THREE, X };
    /* what this device can afford (see js/perf.js); scenes read K.q while building */
    const PF = ELORA.perf || { level: 3, QL: [{ anim: 7 }, { anim: 10 }, { anim: 14 }, { anim: 20 }] };
    const LV = PF.level;
    K.q = { level: LV, tex: [.5, .75, 1, 1][LV], simple: LV <= 1, maps: LV >= 2, seg: [.5, .7, 1, 1][LV], animStep: 1 / PF.QL[LV].anim, aniso: [1, 2, 4, 8][LV] };
    K.seg = n => Math.max(8, Math.round(n * K.q.seg));

    /* the whole palette: paper, ink, one blue */
    K.C = { ink: 0x0c1226, navy: 0x0e1a44, blue: 0x1d4fe0, sky: 0x8fb0ff, paper: 0xf5f3ee, porcelain: 0xf3f1eb, steel: 0xc7cdd8, graphite: 0x2a3042 };

    /* ------------------------------------------------------------ maths */
    K.clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
    K.ramp = (x, a, b) => K.clamp01((x - a) / (b - a));
    K.sm = x => x * x * (3 - 2 * x);
    K.smooth = (a, b, x) => K.sm(K.ramp(x, a, b));
    K.lerp = (a, b, t) => a + (b - a) * t;
    K.eo = t => 1 - Math.pow(1 - K.clamp01(t), 3);
    K.eio = t => { t = K.clamp01(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    K.back = t => { t = K.clamp01(t); const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };   /* a gentle overshoot */
    K.rng = seed => { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

    /* --------------------------------------------------------- textures */
    K.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    K.maxAniso = 8;
    K.ctexture = (c, o = {}) => {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      t.anisotropy = K.maxAniso;
      if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
      return t;
    };
    K.rrect = (g, x, y, w, h, r) => {
      r = Math.min(r, w / 2, h / 2);
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    };
    K.tx = {};
    (function build() {
      /* a soft round shadow: white with a fading alpha, tinted by the material */
      let c = K.canvas(128, 128), g = c.getContext('2d');
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.55)'); gr.addColorStop(.7, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      K.tx.shadow = K.ctexture(c);
      /* fine brushing for steel (strong devices only) */
      if (K.q.maps) {
        const n = 512; c = K.canvas(n, n); g = c.getContext('2d');
        g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, n, n);
        const r = K.rng(11);
        for (let i = 0; i < 2600; i++) {
          const y = r() * n, x = r() * n, len = 30 + r() * 300, a = .03 + r() * .08;
          g.fillStyle = r() < .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(x, y, len, .8 + r() * 1.2); if (x + len > n) g.fillRect(x - n, y, len, 1);
        }
        K.tx.brush = K.ctexture(c, { srgb: false, repeat: [2, 2] });
      }
    })();

    /* --------------------------------------------------------- materials */
    const MS = THREE.MeshStandardMaterial, MP = THREE.MeshPhysicalMaterial;
    /* a clear-coated lacquer on strong devices, a plain standard material on weak ones */
    const phys = p => { if (K.q.simple) { delete p.clearcoat; delete p.clearcoatRoughness; return new MS(p); } return new MP(p); };
    K.m = {
      phys,
      /* matte white ceramic */
      porcelain: (color = K.C.porcelain, rough = .5) => new MS({ color, roughness: rough, metalness: 0, envMapIntensity: .75 }),
      /* deep navy lacquer */
      navy: (color = K.C.ink, rough = .5) => K.q.simple ? new THREE.MeshLambertMaterial({ color }) : new MP({ color, metalness: 0, roughness: rough, specularIntensity: .3, clearcoat: .3, clearcoatRoughness: .25, envMapIntensity: .2 }),
      /* the logo blue, as lacquer */
      blue: (color = K.C.blue, rough = .45) => K.q.simple ? new THREE.MeshLambertMaterial({ color }) : new MP({ color, metalness: 0, roughness: rough, specularIntensity: .35, clearcoat: .35, clearcoatRoughness: .25, envMapIntensity: .25 }),
      /* satin steel */
      steel: (color = K.C.steel, rough = .34) => new MS({ color, metalness: 1, roughness: rough, roughnessMap: K.q.maps ? K.tx.brush : null, envMapIntensity: 1.1 }),
      glass: (color = 0xdbe6ff, op = .22) => phys({ color, metalness: 0, roughness: .08, transparent: true, opacity: op, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.5, depthWrite: false }),
      flat: (color) => new THREE.MeshBasicMaterial({ color }),
      screen: (tex) => new THREE.MeshBasicMaterial({ map: tex }),
      decal: (tex, opacity = 1) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false })
    };

    /* --------------------------------------------------------- geometry */
    K.rbox = (w, h, d, r, seg = 4) => new X.RoundedBoxGeometry(w, h, d, seg, r === undefined ? Math.min(w, h, d) * .12 : r);
    K.tube = (pts, r = .03, seg = 120, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg, r, 10, closed);

    /* --------------------------------------------------------- objects */
    /* a plane carrying text; world width w, the height follows the text */
    K.label = (text, o = {}) => {
      const size = o.size || 56, font = `${o.weight || 500} ${size}px ${o.family || 'Inter'}`;
      const m = K.canvas(8, 8).getContext('2d'); m.font = font;
      const tw = Math.ceil(m.measureText(text).width) + (o.pad ?? 24), th = Math.ceil(size * 1.5);
      const c = K.canvas(tw, th), g = c.getContext('2d');
      g.font = font; g.textBaseline = 'middle'; g.textAlign = o.align || 'center';
      g.fillStyle = o.color || '#0c1226';
      g.fillText(text, (o.align === 'left') ? 12 : tw / 2, th / 2 + size * .04);
      const t = K.ctexture(c);
      const w = o.w || tw / 100, mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * th / tw), K.m.decal(t, o.opacity ?? 1));
      mesh.userData.tex = t; return mesh;
    };

    /* a canvas that is redrawn — a screen, a chart, a poster layer.
       Drawn in logical w x h units; the canvas itself is scaled down on weak devices. */
    K.screen = (w, h, draw) => {
      const sc = K.q.tex, cw = Math.max(16, Math.round(w * sc)), ch = Math.max(16, Math.round(h * sc));
      const c = K.canvas(cw, ch), g = c.getContext('2d'), tex = K.ctexture(c);
      const s = { canvas: c, ctx: g, tex, w, h, draw };
      s.redraw = (t, st) => { g.setTransform(sc, 0, 0, sc, 0, 0); g.clearRect(0, 0, w, h); draw(g, w, h, t, st || {}); tex.needsUpdate = true; };
      s.redraw(0, {});
      return s;
    };
    /* an animated screen: no mipmaps, so each re-upload stays cheap */
    K.cheap = (s) => { s.tex.generateMipmaps = false; s.tex.minFilter = THREE.LinearFilter; s.tex.anisotropy = 1; return s; };

    /* a soft contact shadow lying on the floor (w = diameter) */
    K.blob = (w, op = .3) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({ map: K.tx.shadow, color: K.C.ink, transparent: true, opacity: op, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; return m;
    };

    /* the low round stage every scene stands on */
    K.plinth = (r = 2.3) => {
      const g = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .06, K.seg(96)), new THREE.MeshBasicMaterial({ color: 0xeceae3 }));
      disc.position.y = .03; g.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * .985, .005, 6, K.seg(128)), new THREE.MeshBasicMaterial({ color: K.C.ink, transparent: true, opacity: .1 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = .062; g.add(ring);
      const sh = K.blob(r * 3.2, .15); sh.position.y = .004; g.add(sh);
      g.userData = { top: .06 };
      return g;
    };

    /* a scene's tilt toward the pointer, eased */
    K.follow = (obj, S, k = .12, kx = .06, damp = 6, dt = .016) => {
      const ty = S.mx * k, tx = -S.my * kx;
      obj.rotation.y += (ty - obj.rotation.y) * Math.min(1, dt * damp);
      obj.rotation.x += (tx - obj.rotation.x) * Math.min(1, dt * damp);
    };

    /* ---------------------------------------------------------- the logo */
    const flat2d = (flat) => { let d = ''; for (let i = 0; i < flat.length; i += 2) d += (i ? 'L' : 'M') + flat[i] + ' ' + flat[i + 1]; return d + 'Z'; };
    const flatShape = (flat, w, h, s) => {
      const sh = new THREE.Shape();
      for (let i = 0; i < flat.length; i += 2) { const x = (flat[i] - w / 2) * s, y = (h / 2 - flat[i + 1]) * s; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
      sh.closePath(); return sh;
    };
    /* the speech-bubble mark, extruded: blue lacquer with the white megaphone raised on its face */
    K.logo3D = (size = 2) => {
      const M = ELORA.LOGO.mark, s = size / M.h, g = new THREE.Group();
      const depth = size * .17, bev = size * .03, segs = K.q.simple ? 1 : 3;
      const bg = new THREE.ExtrudeGeometry(flatShape(M.bubble, M.w, M.h, s), { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: segs, curveSegments: 1 });
      bg.translate(0, 0, -depth / 2);
      const pos = bg.attributes.position, col = new Float32Array(pos.count * 3), c0 = new THREE.Color(M.c0), c1 = new THREE.Color(M.c1), tc = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / s + M.w / 2, y = M.h / 2 - pos.getY(i) / s;
        tc.lerpColors(c0, c1, K.clamp01((x / M.w + y / M.h) * .5 * 1.06 - .02)); col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b;
      }
      bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const bm = K.m.phys({ color: 0xffffff, vertexColors: true, metalness: .05, roughness: .36, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: .7 });
      /* the brand gradient must read true: add the vertex colour back in as a soft self-light */
      const SELF_LIGHT = ['#include <emissivemap_fragment>', '#ifdef USE_COLOR', 'totalEmissiveRadiance += vColor.rgb * 0.62;', '#endif'].join('\n');
      bm.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', SELF_LIGHT); };
      const bubble = new THREE.Mesh(bg, bm);
      g.add(bubble);
      const gm = K.m.phys({ color: 0xffffff, metalness: 0, roughness: .34, clearcoat: .8, clearcoatRoughness: .16, envMapIntensity: .55, emissive: 0xffffff, emissiveIntensity: .5 });
      const glyphs = M.glyph.map(f => {
        const gd = size * .09, geo = new THREE.ExtrudeGeometry(flatShape(f, M.w, M.h, s), { depth: gd, bevelEnabled: true, bevelThickness: bev * .6, bevelSize: bev * .5, bevelSegments: segs, curveSegments: 1 });
        const m = new THREE.Mesh(geo, gm); m.position.z = depth / 2 + bev * .4; g.add(m); return m;
      });
      g.userData = { bubble, glyphs, depth }; return g;
    };
    /* the "elora" wordmark, extruded letter by letter */
    K.word3D = (height = 1, material) => {
      const W = ELORA.LOGO.word, s = height / W.h, g = new THREE.Group(), depth = height * .22, bev = height * .02;
      const mat = material || K.m.navy();
      g.userData.letters = W.letters.map(L => {
        const sh = flatShape(L[0], W.w, W.h, s);
        for (let k = 1; k < L.length; k++) {
          const p = new THREE.Path(), f = L[k];
          for (let i = 0; i < f.length; i += 2) { const x = (f[i] - W.w / 2) * s, y = (W.h / 2 - f[i + 1]) * s; i ? p.lineTo(x, y) : p.moveTo(x, y); }
          p.closePath(); sh.holes.push(p);
        }
        const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: K.q.simple ? 1 : 2, curveSegments: 1 });
        geo.translate(0, 0, -depth / 2);
        const m = new THREE.Mesh(geo, mat); g.add(m); return m;
      });
      g.userData.w = W.w * s; return g;
    };
    /* the mark on a 2D canvas: (x, y) top-left, h tall */
    let logoP = null;
    K.drawLogoMark = (ctx, x, y, h) => {
      const M = ELORA.LOGO.mark;
      if (!logoP) logoP = { b: new Path2D(flat2d(M.bubble)), g: M.glyph.map(f => new Path2D(flat2d(f))) };
      ctx.save(); ctx.translate(x, y); const s = h / M.h; ctx.scale(s, s);
      const gr = ctx.createLinearGradient(0, 0, M.w, M.h); gr.addColorStop(0, M.c0); gr.addColorStop(1, M.c1);
      ctx.fillStyle = gr; ctx.fill(logoP.b); ctx.fillStyle = '#fff'; logoP.g.forEach(p => ctx.fill(p)); ctx.restore();
    };

    ELORA.K = K;
    return K;
  };
})();
