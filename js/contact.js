/* Contact: the filled-in form opens a Gmail compose window addressed to the studio.
     Android  -> the Gmail app, through an intent (falls back to Gmail on the web)
     iOS      -> the Gmail app, through its googlegmail:// link
     desktop  -> Gmail on the web, in a new tab
   Some in-app browsers (Instagram, Facebook, WhatsApp) block app launches, so a row of
   tap-through buttons appears whenever the automatic hand-off did not take. */
(function () {
  const E = window.ELORA = window.ELORA || {};
  const TO = 'growwithelora@gmail.com';
  const enc = encodeURIComponent;
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const $ = (s, r = document) => r.querySelector(s);

  const form = $('#cform'); if (!form) return;
  const status = $('#cstatus'), alt = $('#calt');
  const aApp = $('#aApp'), aWeb = $('#aWeb'), aMail = $('#aMail'), aCopy = $('#aCopy');

  /* the same address everywhere on the page */
  document.querySelectorAll('[data-mail]').forEach(a => { a.href = 'mailto:' + TO; a.textContent = TO; });

  function compose() {
    const d = new FormData(form), g = k => String(d.get(k) || '').trim();
    const name = g('name'), who = g('contact'), need = g('need'), msg = g('msg');
    const subject = `New project enquiry — ${name} (${need})`;
    const body = [
      'Hi elora team,', '',
      `I'd like to start a project.`, '',
      `Name: ${name}`, `Email / WhatsApp: ${who}`, `Looking for: ${need}`, '',
      'About the project:', msg || '(to discuss)', '',
      '— sent from the elora website'
    ].join('\n');
    return { name, who, subject, body };
  }

  function links(subject, body) {
    const q = `subject=${enc(subject)}&body=${enc(body)}`;
    const web = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${enc(TO)}&su=${enc(subject)}&body=${enc(body)}`;
    return {
      web,
      mailto: `mailto:${TO}?${q}`,
      ios: `googlegmail:///co?to=${enc(TO)}&${q}`,
      /* explicit Gmail package; Chrome falls back to Gmail on the web if the app is missing */
      android: `intent:${TO}?${q}#Intent;scheme=mailto;action=android.intent.action.SENDTO;package=com.google.android.gm;S.browser_fallback_url=${enc(web)};end`
    };
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise((res, rej) => {
      const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } t.remove();
    });
  }

  let left = false, timer = 0;
  const gone = () => { left = true; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) gone(); });
  addEventListener('pagehide', gone); addEventListener('blur', gone);

  form.addEventListener('submit', e => {
    e.preventDefault();
    form.querySelectorAll('input').forEach(i => i.classList.remove('bad'));
    const c = compose();
    if (!c.name || !c.who) {
      if (!c.name) form.name.classList.add('bad'); if (!c.who) form.contact.classList.add('bad');
      status.textContent = 'Add your name and a way to reach you.'; return;
    }
    const l = links(c.subject, c.body);
    /* the tap-through buttons are ready before anything opens */
    aApp.href = isIOS ? l.ios : isAndroid ? l.android : l.web;
    aApp.textContent = (isIOS || isAndroid) ? 'Open Gmail app' : 'Open Gmail';
    aWeb.href = l.web; aMail.href = l.mailto;
    aWeb.hidden = !(isIOS || isAndroid);
    aCopy.onclick = () => { copy(`To: ${TO}\nSubject: ${c.subject}\n\n${c.body}`).then(() => { aCopy.textContent = 'Copied'; }, () => { aCopy.textContent = 'Copy failed'; }); };
    aCopy.textContent = 'Copy brief';
    alt.hidden = true; left = false; clearTimeout(timer);
    status.textContent = 'Opening Gmail with your brief…';

    if (isAndroid) {
      location.href = l.android;
    } else if (isIOS) {
      const f = document.createElement('iframe'); f.style.display = 'none'; f.src = l.ios; document.body.appendChild(f);
      setTimeout(() => f.remove(), 4000);
    } else {
      const w = window.open(l.web, '_blank');                /* (a 'noopener' open always returns null, so detach by hand) */
      if (w) { try { w.opener = null; } catch (err) { /* cross-origin already */ } }
      left = !!w;
    }

    timer = setTimeout(() => {
      status.textContent = left ? 'Gmail is open with your brief — just press send.' : 'Tap below if Gmail did not open.';
      alt.hidden = left;
    }, (isIOS || isAndroid) ? 1600 : 700);
  });
})();
