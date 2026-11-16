/* The one 3D moment on the page: the elora mark (speech bubble + megaphone) in glossy
   blue, with three small marketing objects floating around it — a like (heart),
   a reel (play tile) and growth (bar chart). It leans with the pointer, renders only
   while the hero is on screen, and falls back to the flat SVG logo if WebGL is missing. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('hero3d');
const LOGO = window.ELORA && window.ELORA.LOGO;
if (host && LOGO) init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }                       /* no WebGL: the SVG fallback stays */

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 6); scene.add(key);

  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  const root = new THREE.Group(); scene.add(root);

  /* ---------- the logo mark ---------- */
  const M = LOGO.mark, S = 2.5 / M.w;
  const shape = flat => {
    const sh = new THREE.Shape();
    for (let i = 0; i < flat.length; i += 2) {
      const x = (flat[i] - M.w / 2) * S, y = -(flat[i + 1] - M.h / 2) * S;
      i ? sh.lineTo(x, y) : sh.moveTo(x, y);
    }
    sh.closePath(); return sh;
  };
  const DEPTH = .3, BEV = .06;
  const bubbleGeo = new THREE.ExtrudeGeometry(shape(M.bubble), { depth: DEPTH, bevelEnabled: true, bevelThickness: BEV, bevelSize: .05, bevelSegments: 5, curveSegments: 1 });
  bubbleGeo.computeBoundingBox();
  /* the logo's diagonal gradient, baked into vertex colours */
  {
    const bb = bubbleGeo.boundingBox, p = bubbleGeo.attributes.position, col = new Float32Array(p.count * 3);
    /* mix in sRGB (like the flat logo), then convert to linear for rendering */
    const L = THREE.LinearSRGBColorSpace, c0 = new THREE.Color().setStyle(M.c0, L), c1 = new THREE.Color().setStyle(M.c1, L), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const tx = (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), ty = (bb.max.y - p.getY(i)) / (bb.max.y - bb.min.y);
      c.copy(c0).lerp(c1, Math.min(1, Math.max(0, (tx + ty) / 2))).convertSRGBToLinear(); col.set([c.r, c.g, c.b], i * 3);
    }
    bubbleGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const bubble = new THREE.Mesh(bubbleGeo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .24, metalness: 0, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: .55 }));
  bubble.position.z = -DEPTH / 2;

  const glyphMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .35, clearcoat: .6, clearcoatRoughness: .2 });
  const glyph = new THREE.Mesh(new THREE.ExtrudeGeometry(shape(M.glyph[0]), { depth: .06, bevelEnabled: true, bevelThickness: .02, bevelSize: .012, bevelSegments: 3, curveSegments: 1 }), glyphMat);
  glyph.position.z = DEPTH / 2 + BEV - .01;

  const logo = new THREE.Group(); logo.add(bubble, glyph); root.add(logo);

  /* ---------- three small marketing objects ---------- */
  // like — a coral heart
  const hs = new THREE.Shape();
  hs.moveTo(5, 5); hs.bezierCurveTo(5, 5, 4, 0, 0, 0); hs.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  hs.bezierCurveTo(-6, 11, -3, 15.4, 5, 19); hs.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
  hs.bezierCurveTo(16, 7, 16, 0, 10, 0); hs.bezierCurveTo(7, 0, 5, 5, 5, 5);
  const heartGeo = new THREE.ExtrudeGeometry(hs, { depth: 3, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.6, bevelSegments: 6, curveSegments: 18 });
  heartGeo.center(); heartGeo.rotateZ(Math.PI); heartGeo.scale(.034, .034, .034);
  const heart = new THREE.Mesh(heartGeo, new THREE.MeshPhysicalMaterial({ color: 0xff5470, roughness: .3, clearcoat: 1, clearcoatRoughness: .15 }));

  // reel — a white play tile
  const play = new THREE.Group();
  play.add(new THREE.Mesh(new RoundedBoxGeometry(.78, .78, .2, 5, .16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .4, clearcoat: .8, clearcoatRoughness: .2 })));
  const tri = new THREE.Shape(); tri.moveTo(-.1, .15); tri.lineTo(.17, 0); tri.lineTo(-.1, -.15); tri.closePath();
  const triM = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: .04, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 2 }), new THREE.MeshPhysicalMaterial({ color: 0x1a4fe6, roughness: .3, clearcoat: 1 }));
  triM.position.z = .1; play.add(triM);

  // growth — three rising bars
  const bars = new THREE.Group();
  [[.32, 0x9ad7ff], [.56, 0x3d8bff], [.84, 0x1a4fe6]].forEach(([h, c], i) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(.18, h, .18, 3, .05), new THREE.MeshPhysicalMaterial({ color: c, roughness: .3, clearcoat: 1, clearcoatRoughness: .15 }));
    b.position.set((i - 1) * .25, h / 2 - .42, 0); bars.add(b);
  });

  const floaters = [
    { o: heart, p: [1.55, 1.2, .5], r: [.2, -.4, -.25], sp: .9, ph: 0 },
    { o: play, p: [-1.7, -.55, .45], r: [.15, .5, .12], sp: .75, ph: 2 },
    { o: bars, p: [1.5, -1.05, .65], r: [.1, -.5, 0], sp: .65, ph: 4 }
  ];
  floaters.forEach(f => { f.o.position.set(...f.p); f.o.rotation.set(...f.r); root.add(f.o); });

  /* ---------- soft contact shadow ---------- */
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const g = sc.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(3,13,80,.32)'); grd.addColorStop(1, 'rgba(3,13,80,0)'); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.75; root.add(shadow);

  /* ---------- sizing ---------- */
  const T = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 2;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, .15, Math.max(4.4 / (T * camera.aspect), 4.4 / T));    /* keep ~4.4 units in view both ways */
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    draw(performance.now());
  }
  new ResizeObserver(resize).observe(host);

  /* ---------- pointer + scroll ---------- */
  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  const t0 = performance.now(), intro = reduce ? 0 : 1400;
  function draw(now) {
    const t = (now - t0) / 1000, k = Math.min(1, (now - t0) / intro || 1), e = 1 - Math.pow(1 - k, 3);
    mx += (tx - mx) * .06; my += (ty - my) * .06;
    const sc = Math.min(1, Math.max(0, scrollY / (host.offsetTop + host.offsetHeight)));
    const m = reduce ? 0 : 1;

    root.rotation.y = mx * .35 + sc * .6;
    root.rotation.x = my * .12 + sc * .15;
    root.position.y = sc * .6;

    logo.rotation.y = (1 - e) * -2.4 + Math.sin(t * .6) * .22 * m;
    logo.rotation.x = Math.sin(t * .5) * .04 * m;
    logo.position.y = Math.sin(t * .9) * .06 * m + (1 - e) * -.4;
    logo.scale.setScalar(.7 + .3 * e);

    floaters.forEach((f, i) => {
      const d = Math.min(1, Math.max(0, (now - t0 - 500 - i * 160) / 900)), de = reduce ? 1 : 1 - Math.pow(1 - d, 3);
      f.o.scale.setScalar(Math.max(.001, de));
      f.o.position.y = f.p[1] + Math.sin(t * f.sp + f.ph) * .09 * m;
      f.o.rotation.y = f.r[1] + Math.sin(t * f.sp * .7 + f.ph) * .3 * m;
    });
    shadow.material.opacity = .9 * e;
    renderer.render(scene, camera);
  }

  /* only animate while the hero is visible and the tab is in front */
  let on = true, raf = 0;
  const loop = now => { draw(now); raf = (on && !reduce) ? requestAnimationFrame(loop) : 0; };
  new IntersectionObserver(([en]) => { on = en.isIntersecting; if (on && !raf && !reduce) raf = requestAnimationFrame(loop); }).observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (on && !reduce) raf = requestAnimationFrame(loop); });
  if (reduce) addEventListener('pointermove', () => requestAnimationFrame(draw), { passive: true });

  resize();
  host.classList.add('live');
  raf = requestAnimationFrame(loop);
}
