/* Scene 04 — Web Development.
   One website, lifted apart into three layers — the window, the page, and what floats
   above it — that settle back together as you read. */
ELORA.add({
  id: 'web',
  cam: { fitW: 4.8, p: [-.3, 2.3, 13.2], t: [0, 2.0, 0], fov: 28, lens: [-.2, .04, 0, .2], dolly: 1.4, drift: -.5 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06, LW = 3.1, LH = LW * 706 / 1024;
    g.add(K.plinth(2.5));

    const SERIF = '"Instrument Serif", Georgia, serif';
    const draws = [
      (c, w, h) => {                                        /* 0: the browser window */
        c.save(); c.shadowColor = 'rgba(12,18,38,.26)'; c.shadowBlur = 44; c.shadowOffsetY = 20; c.fillStyle = '#fff'; K.rrect(c, 46, 34, w - 92, h - 96, 26); c.fill(); c.restore();
        c.save(); K.rrect(c, 46, 34, w - 92, h - 96, 26); c.clip(); c.fillStyle = '#f3f1ea'; c.fillRect(46, 34, w - 92, 66); c.restore();
        [0, 1, 2].forEach(i => { c.fillStyle = '#d6d2c8'; c.beginPath(); c.arc(86 + i * 26, 67, 8, 0, 7); c.fill(); });
        c.fillStyle = '#fff'; K.rrect(c, 210, 50, w - 420, 34, 17); c.fill(); c.strokeStyle = 'rgba(12,18,38,.12)'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = 'rgba(12,18,38,.5)'; c.font = '500 19px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('yourbrand.com', w / 2, 73); c.textAlign = 'left';
        c.fillStyle = '#0c1226'; K.rrect(c, 96, 134, 84, 14, 7); c.fill(); c.fillStyle = 'rgba(12,18,38,.14)'; [0, 1, 2].forEach(i => { K.rrect(c, w - 380 + i * 100, 134, 70, 12, 6); c.fill(); });
      },
      (c, w, h) => {                                        /* 1: the page */
        let fs = 112; c.font = `400 ${fs}px ${SERIF}`; const mw = c.measureText('Built to convert.').width; fs = Math.floor(fs * Math.min(1, (w - 230) / mw)); c.font = `400 ${fs}px ${SERIF}`;
        c.fillStyle = '#0c1226'; c.fillText('Built to convert.', 100, 330);
        c.font = `italic 400 33px ${SERIF}`; c.fillStyle = 'rgba(12,18,38,.65)'; c.fillText('A calm, fast site that turns visitors into enquiries.', 102, 392);
        c.fillStyle = '#1d4fe0'; K.rrect(c, 100, 440, 232, 58, 29); c.fill(); c.fillStyle = '#fff'; c.font = '600 20px Inter, sans-serif'; c.fillText('Start a project', 134, 476);
        c.strokeStyle = 'rgba(12,18,38,.5)'; c.lineWidth = 1.5; K.rrect(c, 350, 440, 150, 58, 29); c.stroke(); c.fillStyle = '#0c1226'; c.fillText('See work', 386, 476);
      },
      (c, w, h) => {                                        /* 2: what floats above it */
        c.save(); c.shadowColor = 'rgba(12,18,38,.3)'; c.shadowBlur = 28; c.shadowOffsetY = 12; c.fillStyle = '#fff'; K.rrect(c, w - 410, h - 270, 300, 104, 22); c.fill(); c.restore();
        c.fillStyle = '#1d4fe0'; c.beginPath(); c.arc(w - 366, h - 218, 9, 0, 7); c.fill();
        c.fillStyle = '#0c1226'; c.font = '600 23px Inter, sans-serif'; c.fillText('New enquiry', w - 340, h - 210); c.fillStyle = 'rgba(12,18,38,.5)'; c.font = '400 19px Inter, sans-serif'; c.fillText('just now', w - 340, h - 182);
        c.save(); c.translate(262, 512); c.fillStyle = '#0c1226'; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); [[0, 0], [0, 40], [11, 31], [19, 48], [27, 44], [19, 28], [33, 28]].forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke(); c.fill(); c.restore();
      }
    ];
    const stack = new THREE.Group(); stack.scale.setScalar(1.2); rig.add(stack);
    const layers = draws.map((d, i) => {
      const sc = K.screen(1024, 706, d), m = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), new THREE.MeshBasicMaterial({ map: sc.tex, transparent: true, depthWrite: false }));
      m.renderOrder = i; stack.add(m); return m;
    });
    const shadow = K.blob(3.8, .26); shadow.position.y = FLOOR + .01; g.add(shadow);

    return {
      group: g,
      update(u) {
        const t = u.t, dw = u.dw, ent = K.eo(K.ramp(u.enter, .2, 1)), lv = K.ramp(u.leave, 0, .6);
        rig.rotation.y += ((u.S.mx * .08 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        const ex = K.sm(K.ramp(dw, .1, .42)) * (1 - K.sm(K.ramp(dw, .72, .92)));
        stack.rotation.set(.1 + ex * .1, -.18 - .5 * ex + Math.sin(t * .4) * .025, 0);
        stack.position.set(0, FLOOR + 2.1 + Math.sin(t * .8) * .05 + lv * .3, 0);
        const gap = .06 + .55 * ex;
        layers.forEach((m, i) => { m.position.z = (i - 1) * gap; m.visible = ent > .02; });
        g.scale.setScalar(.88 + .12 * ent);
      }
    };
  }
});
