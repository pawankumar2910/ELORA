/* The crew: a list of names. Point at a name (or tap it) and the details slide down:
   role, phone (tap to call), email (opens Gmail, filled in), Instagram (opens the app)
   and, where there is one, a PORTFOLIO button. Click or tap a name to keep it open. */
(function () {
  const list = document.getElementById('crewList'); if (!list) return;

  /* ----- the team: edit here ----- */
  const CREW = [
    { name: 'Srikar Dittakavi', role: 'Founder / Marketing Lead', ig: 'srikar_dittakavi', phone: '+91 99399 82228', email: 'dittakavisrikar@gmail.com' },
    { name: 'Cheekati Pavan Kumar', role: 'CEO / Design Manager', ig: 'pawan.m4', phone: '+91 88853 06442', email: 'pawankch2910@gmail.com', portfolio: 'https://renderedbypk.vercel.app/' },
    { name: 'Harshadeep', role: 'Co-Founder / Customer Relationship Management', ig: 'snizzle_king_418', phone: '+91 96188 44591', email: 'pulicherlaharsha123@gmail.com' },
    { name: 'Davuluri Karthik', role: 'CTO / Performance Marketing Manager', ig: 'erajenda07_', phone: '+91 70138 97429', email: 'davulurikarthik16@gmail.com' },
    { name: 'Samayam Ravi Kiran', role: 'MD / Digital Marketing Strategy', ig: 'samayam_ravi_kiran', phone: '+91 81848 29692', email: 'ravikiransamayam6@gmail.com' },
    { name: 'Shaik Sazid Vali', role: 'Creative Designer / Customer Relationship Management', ig: '_shannu_1025', phone: '+91 73962 79327', email: 'sazidvali1025.ai@gmail.com' }
  ];

  const IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>';
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tel = p => 'tel:' + p.replace(/[^\d+]/g, '');

  const rows = CREW.map((m, i) => {
    const first = m.name.split(' ')[0];
    const li = el('li', 'cr'), id = 'crd' + i;
    const btn = el('button', 'cr-h', `<u>${String(i + 1).padStart(2, '0')}</u><span class="cr-n">${esc(m.name)}</span><i class="cr-p" aria-hidden="true"></i>`);
    btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id);
    const body = esc(`Hi ${first},\n\nI found you on the elora website and would like to talk about a project.\n\nThanks!`);
    const d = el('div', 'cr-d'); d.id = id; d.setAttribute('role', 'region'); d.setAttribute('aria-label', m.name + ' — details');
    d.innerHTML =
      `<div class="cr-in"><p class="cr-role">${esc(m.role)}</p>` +
      `<dl class="cr-c"><div><dt>Phone</dt><dd><a href="${tel(m.phone)}">${esc(m.phone)}</a></dd></div>` +
      `<div><dt>Email</dt><dd><a href="mailto:${esc(m.email)}" data-gm data-to="${esc(m.email)}" data-subject="Hello from the elora website" data-body="${body}">${esc(m.email)}</a></dd></div></dl>` +
      `<div class="cr-act"><a class="cr-ig" href="https://www.instagram.com/${esc(m.ig)}/" target="_blank" rel="noopener" data-app="ig:${esc(m.ig)}" aria-label="${esc(first)} on Instagram" title="Instagram">${IG}</a>` +
      (m.portfolio ? `<a class="cr-pf" href="${esc(m.portfolio)}" target="_blank" rel="noopener">Portfolio<span aria-hidden="true">&nearr;</span></a>` : '') +
      `</div></div>`;
    li.append(btn, d); list.appendChild(li);
    return { li, btn, pinned: false, hover: false };
  });

  const sync = r => {
    const open = r.pinned || r.hover;
    r.li.classList.toggle('open', open); r.li.classList.toggle('pin', r.pinned);
    r.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  rows.forEach(r => {
    /* a mouse hovering opens it; touch has no hover, so only a tap does */
    /* (a short hover-intent delay: rows below a collapsing row slide under the pointer, and this keeps them from flickering) */
    r.li.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { clearTimeout(r.t); r.t = setTimeout(() => { r.hover = true; sync(r); }, 110); } });
    r.li.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { clearTimeout(r.t); r.hover = false; sync(r); } });
    r.btn.addEventListener('click', () => {
      const keep = !r.pinned;
      rows.forEach(o => { if (o.pinned) { o.pinned = false; sync(o); } });
      r.pinned = keep; sync(r);
    });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') rows.forEach(r => { r.pinned = false; r.hover = false; sync(r); }); });
})();
