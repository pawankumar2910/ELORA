/* Page behaviour: reveal-on-scroll, frosted nav border, active nav link, mobile menu. */
(function () {
  document.documentElement.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* reveal elements as they enter the viewport (a small stagger inside each group) */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = $$('.rv');
  if (reduce || !('IntersectionObserver' in window)) items.forEach(el => el.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const sibs = [...e.target.parentElement.children].filter(n => n.classList.contains('rv'));
      e.target.style.transitionDelay = Math.min(sibs.indexOf(e.target), 5) * 70 + 'ms';
      e.target.classList.add('in'); io.unobserve(e.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    items.forEach(el => io.observe(el));
  }

  /* nav: hairline once the page scrolls, and highlight the section in view */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const links = $$('#links a');
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'work', 'reels', 'clients', 'process', 'crew', 'contact'].forEach(id => { const s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* mobile menu */
  const btn = $('#menu'), menu = $('#links');
  const setMenu = open => { btn.setAttribute('aria-expanded', open); btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); menu.classList.toggle('open', open); };
  btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  links.forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
