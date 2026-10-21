/* Part 02 — Reel Editing.
   One phone playing a quiet reel: a serif caption that changes on the beat,
   a hairline progress bar, a soft blue light drifting behind. */
ELORA.part('reels', {
  cam: { fitW: 3.8, p: [-.3, 2.2, 12.8], t: [0, 2.0, 0], fov: 28, lens: [-.2, .04, 0, .2], dolly: 1.4, drift: -.5 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06;
    g.add(K.plinth(2.4));

    const phone = new THREE.Group(); rig.add(phone);
    phone.add(new THREE.Mesh(K.rbox(1.66, 3.4, .17, .26, 6), K.m.steel(0xc9ced8, .3)));
    const bezel = new THREE.Mesh(K.rbox(1.58, 3.32, .17, .22, 5), K.m.navy(K.C.ink, .2)); bezel.position.z = .012; phone.add(bezel);
    const caps = ['Hook them.', 'Hold them.', 'Cut on the beat.', 'Loop it.'];
    const reel = K.cheap(K.screen(540, 1140, (c, w, h, t) => {
      const k = .5 + .5 * Math.sin(t * .4), gr = c.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#f8f6f0'); gr.addColorStop(1, `rgb(${Math.round(222 - 20 * k)},${Math.round(232 - 14 * k)},255)`); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      const bx = w * (.5 + .22 * Math.sin(t * .5)), by = h * (.66 + .05 * Math.cos(t * .4)), rg = c.createRadialGradient(bx, by, 0, bx, by, 300);
      rg.addColorStop(0, 'rgba(29,79,224,.30)'); rg.addColorStop(1, 'rgba(29,79,224,0)'); c.fillStyle = rg; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(12,18,38,.55)'; c.font = '500 24px Inter, sans-serif'; c.fillText('Reels', 38, 84);
      const sp = t * .5, i = Math.floor(sp) % caps.length, ph = sp % 1, a = Math.min(1, ph * 5) * (1 - Math.max(0, (ph - .82) * 5.5));
      let fs = 118; c.font = `400 ${fs}px "Instrument Serif", Georgia, serif`; const mw = c.measureText(caps[i]).width; if (mw > w - 90) { fs = Math.floor(fs * (w - 90) / mw); c.font = `400 ${fs}px "Instrument Serif", Georgia, serif`; }
      c.save(); c.globalAlpha = a; c.fillStyle = '#0c1226'; c.textAlign = 'center'; c.fillText(caps[i], w / 2, h * .44 + (1 - Math.min(1, ph * 4)) * 22); c.restore();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(58, h - 170, 30, 0, 7); c.fill(); K.drawLogoMark(c, 40, h - 188, 36);
      c.fillStyle = '#0c1226'; c.font = '600 26px Inter, sans-serif'; c.fillText('@yourbrand', 102, h - 160);
      c.fillStyle = 'rgba(12,18,38,.55)'; c.font = '400 22px Inter, sans-serif'; c.fillText('Original audio', 38, h - 112);
      c.fillStyle = 'rgba(12,18,38,.14)'; c.fillRect(36, h - 60, w - 72, 4); c.fillStyle = '#0c1226'; c.fillRect(36, h - 60, (w - 72) * ((t * .12) % 1), 4);
    }, { scale: K.q.simple ? .75 : 1 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 3.04), K.m.screen(reel.tex)); screen.position.z = .1; phone.add(screen);
    const shadow = K.blob(3.2, .3); shadow.position.y = FLOOR + .01; g.add(shadow);

    let lastDraw = -1;
    return {
      group: g,
      update(u) {
        const t = u.t, dw = u.dw, ent = K.eo(K.ramp(u.enter, .2, 1)), lv = K.ramp(u.leave, 0, .6);
        rig.rotation.y += ((u.S.mx * .08 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        phone.rotation.y = -.5 + dw * .75 + Math.sin(t * .5) * .03;
        phone.position.y = FLOOR + 2.0 + Math.sin(t * .8) * .06 + lv * .3;
        phone.scale.setScalar(.9 + .1 * ent); phone.visible = ent > .02;
        shadow.scale.setScalar(1 - (phone.position.y - FLOOR - 2) * .3);
        if (t - lastDraw > K.q.animStep) { lastDraw = t; reel.redraw(t); }
        g.scale.setScalar(.88 + .12 * ent);
      }
    };
  }
});
