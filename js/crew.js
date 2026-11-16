/* The crew: one card per person with Call, Write (opens Gmail, pre-filled via js/links.js)
   and, where there is one, a Portfolio link. Edit the CREW list to change the team.
   first = given name (bold), last = family name (light), ini = monogram,
   short = name used in the email greeting (defaults to the first word of "first"),
   badge = small label on the card ("md" gets the blue Managing Director badge). */
(function () {
  const list = document.getElementById('crewList'); if (!list) return;

  const CREW = [
    { first: 'Srikar', last: 'Dittakavi', ini: 'SD', badge: 'Founder', role: 'Founder / Marketing Lead', phone: '+91 99399 82228', email: 'dittakavisrikar@gmail.com' },
    { first: 'Pavan Kumar', last: 'Cheekati', ini: 'PC', short: 'Pavan', badge: 'CEO', role: 'CEO / Design Manager', phone: '+91 88853 06442', email: 'pawankch2910@gmail.com', portfolio: 'https://renderedbypk.vercel.app/' },
    { first: 'Sazid Vali', last: 'Shaik', ini: 'SS', short: 'Sazid', badge: 'MD', md: true, role: 'Managing Director / Creative Design & Customer Relationship Management', phone: '+91 73962 79327', email: 'sazidvali1025.ai@gmail.com' },
    { first: 'Harshadeep', last: 'Pulicherla', ini: 'HP', badge: 'Co-Founder', role: 'Co-Founder / Customer Relationship Management', phone: '+91 96188 44591', email: 'pulicherlaharsha123@gmail.com' },
    { first: 'Karthik', last: 'Davuluri', ini: 'KD', badge: 'CTO', role: 'CTO / Performance Marketing Manager', phone: '+91 70138 97429', email: 'davulurikarthik16@gmail.com' }
  ];

  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    phone: svg('<path d="M5 4h3.6l1.7 4.4-2.2 1.4a11 11 0 0 0 5.1 5.1l1.4-2.2 4.4 1.7V18a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2.6"/><path d="m4 7.6 8 5.8 8-5.8"/>'),
    web: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>')
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tel = p => 'tel:' + p.replace(/[^\d+]/g, '');

  list.innerHTML = CREW.map(m => {
    const short = m.short || m.first.split(' ')[0];
    const body = esc(`Hi ${short},\n\nI found you on the elora website and would like to talk about a project.\n\nThanks!`);
    return `<li class="mate rv">
      <div class="mate-top">
        <span class="av" aria-hidden="true">${esc(m.ini)}</span>
        <div><h3><b>${esc(m.first)}</b> <span>${esc(m.last)}</span></h3><span class="badge${m.md ? ' md' : ''}">${esc(m.badge)}</span></div>
      </div>
      <p class="role">${esc(m.role)}</p>
      <div class="acts">
        <a class="act" href="${tel(m.phone)}" aria-label="Call ${esc(m.first)} on ${esc(m.phone)}">${ICON.phone}Call</a>
        <a class="act" href="mailto:${esc(m.email)}" data-gm data-to="${esc(m.email)}" data-subject="Hello from the elora website" data-body="${body}" aria-label="Write to ${esc(m.first)}">${ICON.mail}Write</a>
        ${m.portfolio ? `<a class="act" href="${esc(m.portfolio)}" target="_blank" rel="noopener">${ICON.web}Portfolio</a>` : ''}
      </div>
    </li>`;
  }).join('');
})();
