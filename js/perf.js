/* elora performance profile.
   Decides, before anything heavy is built, how much of the show a device can
   carry — and whether it should get the 3D page at all. Quality can still
   step down while the page runs (main.js watches the frame time).

   Levels
     3  desktop / strong GPU : up to 2.5x rendering, full-size textures
     2  laptop / integrated   : 2x rendering
     1  phone / tablet        : 2x rendering, plain materials, 60 fps cap
     0  low-end phone         : 1.5x rendering, 3/4-size textures (drops to 30 fps by itself if it must)
   lite : a light CSS-only page for devices without WebGL2, with a software renderer,
          or that cannot hold frame rate even at level 0.

   Overrides for testing:  ?q=0..3   ?lite=1   ?lite=0                                    */
(function () {
  const E = window.ELORA = window.ELORA || {};
  const qs = new URLSearchParams(location.search), nav = navigator;
  const ua = nav.userAgent || '';
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);   /* iPadOS reports a Mac */
  const touch = matchMedia('(pointer:coarse)').matches || mobileUA;                  /* a touch-screen laptop (fine pointer) still counts as a laptop */
  const mem = nav.deviceMemory || 0, cores = nav.hardwareConcurrency || 4;
  const conn = nav.connection || {};
  const saveData = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = window.devicePixelRatio || 1;

  /* what the GPU is, from a throwaway context */
  let webgl2 = false, gpu = '';
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2');
    if (gl) {
      webgl2 = true;
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = d ? String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL) || '') : '';
      const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext();
    }
  } catch (e) { webgl2 = false; }

  const software = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i.test(gpu);
  const weakGpu = /Mali-(4|T[0-7])|Mali-G(31|51|52)\b|Adreno \(TM\) ?[2-5]\d\d\b|PowerVR (SGX|Rogue G6)|Vivante|Tegra [234]|Apple A(7|8|9)\b/i.test(gpu);
  const integrated = /Intel\(R\) (UHD|HD|Iris)|Intel.*(UHD|HD Graphics)|Radeon(\(TM\))? (Vega \d|Graphics)\b|AMD Radeon\(TM\) Graphics/i.test(gpu);

  let level = 3;
  if (touch) level = 1;
  if (touch && ((mem && mem <= 3) || cores <= 4 || weakGpu)) level = 0;
  if (!touch && (integrated || cores <= 4 || (mem && mem <= 4))) level = 2;
  if (saveData || (reducedMotion && touch)) level = Math.min(level, 0);

  const q = qs.get('q');
  if (q !== null && /^[0-3]$/.test(q)) level = +q;

  let lite = !webgl2 || software;
  if (qs.get('lite') === '1') lite = true;
  if (qs.get('lite') === '0') lite = !webgl2;

  /* per-level settings; main.js reads these live.
     dpr is the sharpness ceiling (never above the screen's own ratio); every level keeps
     anti-aliasing on, because jagged edges are the first thing the eye catches. */
  const QL = [
    { dpr: 1.5, aa: true, anim: 8, cap: 16 },
    { dpr: 2.0, aa: true, anim: 12, cap: 16 },
    { dpr: 2.0, aa: true, anim: 16, cap: 16 },
    { dpr: 2.5, aa: true, anim: 20, cap: 0 }
  ];

  E.perf = { level, startLevel: level, lite, webgl2, gpu, touch, mem, cores, dpr, saveData, reducedMotion, software, QL };
  document.documentElement.dataset.q = String(level);
  if (lite) document.documentElement.classList.add('lite');
})();
