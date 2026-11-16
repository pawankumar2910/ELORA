/* Work reels: each plays muted while it is on screen and pauses when it leaves.
   Tap a reel to hear it (every other reel goes quiet); tap again to mute.
   With reduced motion nothing autoplays — a tap starts the reel with sound. */
(function () {
  const cards = [...document.querySelectorAll('.reel-btn')]; if (!cards.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const auto = !reduce && !saveData;

  const play = v => { const p = v.play(); if (p && p.catch) p.catch(() => { }); };
  const setSound = (btn, on) => {
    const v = btn.querySelector('video'), title = btn.querySelector('b').textContent;
    v.muted = !on; btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('loud', on);
    btn.setAttribute('aria-label', (on ? 'Mute ' : 'Play ') + title + (on ? '' : ' with sound'));
  };

  cards.forEach(btn => {
    const v = btn.querySelector('video');
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      cards.forEach(o => { if (o !== btn) { setSound(o, false); if (!auto) o.querySelector('video').pause(); } });
      setSound(btn, on);
      if (on) { if (v.ended || v.currentTime > v.duration - .3) v.currentTime = 0; play(v); }
      else if (!auto) v.pause();
    });
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      const btn = e.target, v = btn.querySelector('video');
      if (e.isIntersecting && e.intersectionRatio >= .5) { if (auto || !v.muted) play(v); }
      else { v.pause(); if (!v.muted) setSound(btn, false); }
    }), { threshold: [0, .5] });
    cards.forEach(c => io.observe(c));
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cards.forEach(c => c.querySelector('video').pause()); });
})();
