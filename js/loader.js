/* elora loader — the logo inside a thin progress ring, on paper.
   Pure DOM/SVG (no WebGL), so it costs nothing and shows up on the very first paint.
   When loading is done the ring lets go and the page is revealed through a soft fade. */
(function () {
  const root = document.getElementById('loader');
  const arc = root.querySelector('.ld-arc');
  const label = root.querySelector('.loader-label');
  const num = label.querySelector('b');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const API = window.ELORA_LOADER = { target: 0, shown: 0 };
  let resolveHand, resolveGone;
  API.handed = new Promise(r => { resolveHand = r; });
  API.gone = new Promise(r => { resolveGone = r; });
  API.set = p => { API.target = Math.max(API.target, Math.min(1, p)); };
  let finishing = false;
  API.finish = () => { API.target = 1; finishing = true; return API.handed; };

  const C = 2 * Math.PI * 54;           /* ring circumference (r = 54 in a 120 box) */
  arc.style.strokeDasharray = C.toFixed(1);
  arc.style.strokeDashoffset = C.toFixed(1);

  let last = performance.now(), state = 'load', holdT = 0, lastPct = -1;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const gap = API.target - API.shown;
    if (gap > 0) API.shown += Math.min(gap, Math.max(gap * (1 - Math.exp(-dt * (finishing ? 4 : 2.2))), .012 * dt));
    const pct = finishing && API.shown >= .995 ? 100 : Math.min(99, Math.floor(API.shown * 100));
    if (pct !== lastPct) {
      lastPct = pct; num.textContent = pct; label.setAttribute('aria-valuenow', pct);
      arc.style.strokeDashoffset = (C * (1 - Math.min(1, API.shown))).toFixed(1);
    }
    if (state === 'load' && finishing && API.shown >= .995) { state = 'hold'; holdT = 0; }
    if (state === 'hold') {
      holdT += dt;
      if (holdT > (reduced ? .05 : .4)) {
        state = 'open';
        root.classList.add('lit'); resolveHand();                        /* the ring lets go */
        setTimeout(() => root.classList.add('out'), reduced ? 0 : 250);   /* then the paper fades */
        setTimeout(() => { root.classList.add('gone'); resolveGone(); }, reduced ? 200 : 1300);
      }
    }
    if (state !== 'open') requestAnimationFrame(frame);
  }
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
