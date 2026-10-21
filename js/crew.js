/* The crew: a list of names, each with a monogram. Point at a name (or tap it) and the details
   slide down: role, phone (tap to call), email (opens Gmail, filled in) and, where there is one,
   a Portfolio link. Click or tap a name to keep it open. The ring on the stage (js/st-crew.js)
   turns to whoever is open, and a soft sound plays as a name opens and closes
   (made in the browser; no audio files). */
(function () {
  const E = window.ELORA = window.ELORA || {};
  const list = document.getElementById('crewList'); if (!list) return;

  /* ----- the team: edit here (first = given name, shown bold; last = family name, shown light;
     "ini" = monogram, "short" = name used in the email greeting, defaults to the first word of "first") ----- */
  const CREW = [
    { first: 'Srikar', last: 'Dittakavi', ini: 'SD', role: 'Founder / Marketing Lead', phone: '+91 99399 82228', email: 'dittakavisrikar@gmail.com' },
    { first: 'Pavan Kumar', last: 'Cheekati', ini: 'PC', short: 'Pavan', role: 'CEO / Design Manager', phone: '+91 88853 06442', email: 'pawankch2910@gmail.com', portfolio: 'https://renderedbypk.vercel.app/' },
    { first: 'Harshadeep', last: 'Pulicherla', ini: 'HP', role: 'Co-Founder / Customer Relationship Management', phone: '+91 96188 44591', email: 'pulicherlaharsha123@gmail.com' },
    { first: 'Karthik', last: 'Davuluri', ini: 'KD', role: 'CTO / Performance Marketing Manager', phone: '+91 70138 97429', email: 'davulurikarthik16@gmail.com' },
    { first: 'Ravi Kiran', last: 'Samayam', ini: 'RS', short: 'Ravi', role: 'MD / Digital Marketing Strategy', phone: '+91 81848 29692', email: 'ravikiransamayam6@gmail.com' },
    { first: 'Sazid Vali', last: 'Shaik', ini: 'SS', short: 'Sazid', role: 'Creative Designer / Customer Relationship Management', phone: '+91 73962 79327', email: 'sazidvali1025.ai@gmail.com' }
  ];
  /* what the 3D ring reads: the monograms, and who is open right now (-1 = nobody) */
  E.crew = { ini: CREW.map(m => m.ini), focus: -1 };

  /* ----- sound: a few short tones made with Web Audio ----- */
  const SFX = (function () {
    const AC = window.AudioContext || window.webkitAudioContext;
    let ctx = null, last = 0, enabled = true;
    try { enabled = localStorage.getItem('elora-sound') !== 'off'; } catch (e) { /* private mode: stay on */ }
    /* browsers only allow sound after a tap / key press, so the audio context is made on the first one */
    const wake = () => {
      if (!AC) return;
      if (!ctx) { try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = null; return; } }
      if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    };
    ['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, wake, { passive: true }));
    /* one soft note, gliding from f0 to f1 */
    const note = (f0, f1, dur, vol, type, at) => {
      const t = ctx.currentTime + (at || 0), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + .03);
    };
    const play = kind => {
      if (!enabled || !ctx || ctx.state !== 'running') return;
      const now = performance.now(); if (now - last < 70) return; last = now;
      if (kind === 'open') { note(420, 640, .13, .05, 'sine'); note(1320, 1320, .05, .018, 'triangle', .02); }
      else if (kind === 'close') { note(600, 380, .11, .04, 'sine'); }
      else { note(784, 784, .07, .045, 'triangle'); note(1175, 1175, .16, .03, 'sine', .045); }      /* kept open */
    };
    return { play, get on() { return enabled; }, set(v) { enabled = !!v; try { localStorage.setItem('elora-sound', enabled ? 'on' : 'off'); } catch (e) { /* ignore */ } if (enabled) wake(); } };
  })();

  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    phone: svg('<path d="M5 4h3.6l1.7 4.4-2.2 1.4a11 11 0 0 0 5.1 5.1l1.4-2.2 4.4 1.7V18a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2.6"/><path d="m4 7.6 8 5.8 8-5.8"/>'),
    web: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>')
  };
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tel = p => 'tel:' + p.replace(/[^\d+]/g, '');

  const rows = CREW.map((m, i) => {
    const li = el('li', 'cr'), id = 'crd' + i;
    li.style.setProperty('--i', i);
    const full = m.first + ' ' + m.last, short = m.short || m.first.split(' ')[0];
    const btn = el('button', 'cr-h', `<span class="cr-av" aria-hidden="true">${esc(m.ini)}</span><span class="cr-n"><b>${esc(m.first)}</b> <span>${esc(m.last)}</span></span><i class="cr-p" aria-hidden="true"></i>`);
    btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id);
    const body = esc(`Hi ${short},\n\nI found you on the elora website and would like to talk about a project.\n\nThanks!`);
    const d = el('div', 'cr-d'); d.id = id; d.setAttribute('role', 'region'); d.setAttribute('aria-label', full + ' — details');
    d.innerHTML =
      `<div class="cr-in"><p class="cr-role">${esc(m.role)}</p><div class="cr-links">` +
      `<a class="cr-l" href="${tel(m.phone)}">${ICON.phone}<span>${esc(m.phone)}</span><b>Call</b></a>` +
      `<a class="cr-l" href="mailto:${esc(m.email)}" data-gm data-to="${esc(m.email)}" data-subject="Hello from the elora website" data-body="${body}">${ICON.mail}<span>${esc(m.email)}</span><b>Write</b></a>` +
      (m.portfolio ? `<a class="cr-l pf" href="${esc(m.portfolio)}" target="_blank" rel="noopener">${ICON.web}<span>Portfolio</span><b>Visit</b></a>` : '') +
      `</div></div>`;
    li.append(btn, d); list.appendChild(li);
    return { li, btn, pinned: false, hover: false, open: false };
  });

  const sync = r => {
    const open = r.pinned || r.hover;
    r.li.classList.toggle('open', open); r.li.classList.toggle('pin', r.pinned);
    r.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open !== r.open) { r.open = open; SFX.play(open ? (r.pinned ? 'pin' : 'open') : 'close'); }
    /* the ring turns to the name under the pointer, else to the one kept open */
    const h = rows.findIndex(o => o.hover), p = rows.findIndex(o => o.pinned);
    E.crew.focus = h >= 0 ? h : p;
  };
  rows.forEach(r => {
    /* a mouse hovering opens it; touch has no hover, so only a tap does */
    /* (a short hover-intent delay: rows below a collapsing row slide under the pointer, and this keeps them from flickering) */
    r.li.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { clearTimeout(r.t); r.t = setTimeout(() => { r.hover = true; sync(r); }, 110); } });
    r.li.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { clearTimeout(r.t); r.hover = false; sync(r); } });
    r.btn.addEventListener('click', () => {
      const keep = !r.pinned, wasOpen = r.open;
      rows.forEach(o => { if (o.pinned) { o.pinned = false; sync(o); } });
      r.pinned = keep; sync(r);
      if (keep && wasOpen) SFX.play('pin');                    /* it was already open from hovering: still confirm the click */
    });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') rows.forEach(r => { r.pinned = false; r.hover = false; sync(r); }); });

  /* the little sound switch under the list */
  const sw = document.getElementById('crewSnd');
  if (sw) {
    const paint = () => { sw.setAttribute('aria-pressed', SFX.on ? 'true' : 'false'); sw.querySelector('b').textContent = SFX.on ? 'on' : 'off'; };
    paint();
    sw.addEventListener('click', () => { SFX.set(!SFX.on); paint(); if (SFX.on) SFX.play('pin'); });
  }
})();
