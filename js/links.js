/* Links that hand over to apps.
     Instagram / Facebook   Android -> the app, through an intent (the web page if it is missing)
                            iPhone  -> the https link, which iOS gives to the installed app
                            desktop -> the web page in a new tab
     Gmail                  Android -> the Gmail app (intent), iPhone -> googlegmail://, desktop -> Gmail on the web
     Phone                  plain tel: links (every phone opens the dialler)
   Mark a link up and this file does the rest:
     <a href="https://www.instagram.com/name/" data-app="ig:name">
     <a href="https://www.facebook.com/profile.php?id=123" data-app="fb:123">
     <a href="mailto:a@b.c" data-gm data-to="a@b.c" data-subject="Hello" data-body="Hi,">                  */
(function () {
  const E = window.ELORA = window.ELORA || {};
  const ua = navigator.userAgent || '', enc = encodeURIComponent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const L = E.links = { isAndroid, isIOS, mobile: isAndroid || isIOS };

  L.gmail = (to, subject, body) => {
    const q = `subject=${enc(subject)}&body=${enc(body)}`;
    const web = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${enc(to)}&su=${enc(subject)}&body=${enc(body)}`;
    return {
      web, mailto: `mailto:${to}?${q}`, ios: `googlegmail:///co?to=${enc(to)}&${q}`,
      android: `intent:${to}?${q}#Intent;scheme=mailto;action=android.intent.action.SENDTO;package=com.google.android.gm;S.browser_fallback_url=${enc(web)};end`
    };
  };
  L.ig = user => {
    const web = `https://www.instagram.com/${user}/`;
    return { web, android: `intent://instagram.com/_u/${user}/#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${enc(web)};end` };
  };
  L.fb = id => {
    const web = `https://www.facebook.com/profile.php?id=${id}`;
    return { web, android: `intent://profile/${id}#Intent;package=com.facebook.katana;scheme=fb;S.browser_fallback_url=${enc(web)};end` };
  };

  /* did the page lose the screen? (then an app took over) */
  let left = false;
  const gone = () => { left = true; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) gone(); });
  addEventListener('pagehide', gone); addEventListener('blur', gone);

  /* a small bar with ways out, for when an app did not open */
  let toastEl = null, toastT = 0;
  L.toast = (msg, actions) => {
    if (!toastEl) {
      toastEl = document.createElement('div'); toastEl.id = 'toast'; toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = '';
    const p = document.createElement('p'); p.textContent = msg; toastEl.appendChild(p);
    const row = document.createElement('div'); toastEl.appendChild(row);
    (actions || []).forEach(a => {
      const el = document.createElement(a.href ? 'a' : 'button');
      el.textContent = a.label;
      if (a.href) { el.href = a.href; if (a.blank) { el.target = '_blank'; el.rel = 'noopener'; } }
      else { el.type = 'button'; el.addEventListener('click', a.click); }
      row.appendChild(el);
    });
    const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.setAttribute('aria-label', 'Dismiss'); x.textContent = '×';
    x.addEventListener('click', () => toastEl.classList.remove('show')); toastEl.appendChild(x);
    toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 12000);
  };

  L.copy = text => {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise((res, rej) => {
      const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0;top:0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } t.remove();
    });
  };

  /* open Gmail with a filled-in message */
  L.openGmail = (to, subject, body) => {
    const l = L.gmail(to, subject, body);
    left = false;
    if (isAndroid) location.href = l.android;
    else if (isIOS) { const f = document.createElement('iframe'); f.style.display = 'none'; f.src = l.ios; document.body.appendChild(f); setTimeout(() => f.remove(), 4000); }
    else { const w = window.open(l.web, '_blank'); if (w) { try { w.opener = null; } catch (e) { /* cross-origin already */ } left = true; } }
    setTimeout(() => {
      if (left) return;
      L.toast('Gmail did not open by itself.', [
        { label: 'Gmail on the web', href: l.web, blank: true },
        { label: 'Mail app', href: l.mailto },
        { label: 'Copy address', click: () => L.copy(to).then(() => L.toast('Address copied: ' + to), () => { }) }
      ]);
    }, L.mobile ? 1700 : 800);
  };

  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a'); if (!a) return;
    if (a.hasAttribute('data-gm')) {
      e.preventDefault();
      L.openGmail(a.dataset.to, a.dataset.subject || '', a.dataset.body || '');
      return;
    }
    const app = a.dataset.app; if (!app) return;
    const i = app.indexOf(':'), kind = app.slice(0, i), val = app.slice(i + 1);
    const l = kind === 'ig' ? L.ig(val) : kind === 'fb' ? L.fb(val) : null; if (!l) return;
    if (isAndroid) { e.preventDefault(); location.href = l.android; }
    else if (isIOS) a.removeAttribute('target');          /* same tab: iOS hands the https link to the app */
  });
})();
