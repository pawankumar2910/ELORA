/* ELORA lite page.
   A light, CSS-only version of the site for devices that cannot (or should not) run
   the 3D scene: no WebGL2, a software renderer, or a phone so slow that even the
   lowest 3D setting drops frames. It is built from the same copy as the 3D page. */
(function () {
  const E = window.ELORA = window.ELORA || {};
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let built = false;

  E.enterLite = function (reason) {
    const root = document.documentElement;
    root.classList.add('lite'); if (!root.dataset.lite) root.dataset.lite = reason || '';      /* keep the first reason */
    try { if (E.onLite) E.onLite(); } catch (e) { /* the 3D side is already gone */ }
    if (built) return; built = true;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  };

  function build() {
    const lk = $('#lockup'), line = lk && $('.lk-line', lk), tags = lk && $('.lk-tags', lk);
    const main = document.createElement('main'); main.id = 'lite';

    const head = document.createElement('header'); head.className = 'lt-bar';
    head.innerHTML = '<a class="lt-brand" href="#top" aria-label="elora Marketing Media"><svg class="b-mark" viewBox="0 0 424 420"><use href="#logo-mark"/></svg><svg class="b-word" viewBox="0 0 761 230"><use href="#logo-word"/></svg></a><a class="lt-pill" href="#contact" data-lite="contact"><i></i>Start a project</a>';
    main.appendChild(head);

    const hero = document.createElement('section'); hero.className = 'lt-hero'; hero.id = 'top';
    hero.innerHTML = '<svg class="lt-word" viewBox="0 0 761 230" role="img" aria-label="elora"><use href="#logo-word"/></svg><p class="lt-sub"><s></s>Marketing Media<s></s></p>';
    if (line) hero.appendChild(line.cloneNode(true));
    const cta = document.createElement('div'); cta.className = 'lt-cta';
    cta.innerHTML = '<a class="btn solid" href="#departments" data-lite="deps">Explore the departments<span aria-hidden="true">&darr;</span></a><a class="btn line" href="#contact" data-lite="contact">Start a project</a>';
    hero.appendChild(cta);
    if (tags) hero.appendChild(tags.cloneNode(true));
    main.appendChild(hero);

    const deps = document.createElement('section'); deps.className = 'lt-deps'; deps.id = 'departments';
    deps.innerHTML = '<h2 class="lt-h">Eight departments, one studio</h2>';
    const grid = document.createElement('div'); grid.className = 'lt-grid';
    $$('.chapter').forEach(c => {
      const no = $('.num span:first-child', c), nm = $('.num span:last-child', c), lede = $('.lede', c), meta = $('.meta', c);
      const card = document.createElement('article'); card.className = 'lt-card'; card.id = 'dep' + c.dataset.i;
      card.innerHTML = '<p class="lt-no">' + (no ? no.textContent : '') + '</p><h3>' + (nm ? nm.textContent : '') + '</h3><p class="lt-lede">' + (lede ? lede.textContent : '') + '</p>';
      if (meta) { const m = meta.cloneNode(true); m.className = 'lt-meta'; card.appendChild(m); }
      grid.appendChild(card);
    });
    deps.appendChild(grid); main.appendChild(deps);

    const cs = document.createElement('section'); cs.className = 'lt-contact'; cs.id = 'contact-lite';
    const panel = $('#contact'); if (panel) { panel.removeAttribute('aria-hidden'); cs.appendChild(panel); }
    main.appendChild(cs);

    document.body.appendChild(main);

    /* links: scroll, nothing fancy */
    main.addEventListener('click', e => {
      const a = e.target.closest('[data-lite]'); if (!a) return;
      e.preventDefault();
      const to = a.dataset.lite === 'contact' ? cs : a.dataset.lite === 'deps' ? deps : hero;
      to.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
    /* a quiet fade-in as sections arrive */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
      $$('.lt-card, .lt-contact, .lt-h').forEach(n => { n.classList.add('rv'); io.observe(n); });
    }
    /* the loader has nothing left to wait for */
    if (window.ELORA_LOADER && !window.ELORA_LOADER._lite) { window.ELORA_LOADER._lite = true; window.ELORA_LOADER.set(1); window.ELORA_LOADER.finish(); }
  }
})();
