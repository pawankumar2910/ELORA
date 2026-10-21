/* elora loader — the logo draws itself.
   The outline of the speech bubble is drawn in one line, the blue fills in, the megaphone settles
   and a single soft light crosses the mark (all CSS, see .ld-* in style.css). A hairline under
   it shows the real progress. Pure DOM/SVG (no WebGL), so it costs nothing and shows up on the
   very first paint. When loading is done the mark lifts away and the page is revealed. */
(function () {
  const root = document.getElementById('loader');
  const bar = root.querySelector('.ld-bar'), fill = bar.querySelector('i');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const API = window.ELORA_LOADER = { target: 0, shown: 0 };
  let resolveHand, resolveGone;
  API.handed = new Promise(r => { resolveHand = r; });
  API.gone = new Promise(r => { resolveGone = r; });
  API.set = p => { API.target = Math.max(API.target, Math.min(1, p)); };
  let finishing = false;
  API.finish = () => { API.target = 1; finishing = true; return API.handed; };

  const MIN = reduced ? .15 : 1.75;      /* seconds: the mark needs this long to draw itself */
  let last = performance.now(), el = 0, state = 'load', holdT = 0, lastPct = -1;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; el += dt;
    const gap = API.target - API.shown;
    if (gap > 0) API.shown += Math.min(gap, Math.max(gap * (1 - Math.exp(-dt * (finishing ? 8 : 3.2))), .02 * dt));
    const pct = Math.min(100, Math.floor(API.shown * 100));
    if (pct !== lastPct) { lastPct = pct; fill.style.transform = 'scaleX(' + Math.min(1, API.shown).toFixed(3) + ')'; bar.setAttribute('aria-valuenow', pct); }
    if (state === 'load' && finishing && API.shown >= .995 && el >= MIN) { state = 'hold'; holdT = 0; }
    if (state === 'hold') {
      holdT += dt;
      if (holdT > (reduced ? .05 : .18)) {
        state = 'open';
        root.classList.add('lit'); resolveHand();                        /* the mark lifts away */
        setTimeout(() => root.classList.add('out'), reduced ? 0 : 140);   /* then the paper fades */
        setTimeout(() => { root.classList.add('gone'); resolveGone(); }, reduced ? 200 : 900);
      }
    }
    if (state !== 'open') requestAnimationFrame(frame);
  }
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
