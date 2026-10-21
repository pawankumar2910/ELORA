/* Part 01 — Poster Design.
   One poster, printed in three layers (paper, type, seal) that ease apart in depth
   as you scroll and settle back together. */
ELORA.part('poster', {
  cam: { fitW: 4.2, p: [.3, 2.2, 12.8], t: [0, 1.95, 0], fov: 28, lens: [.2, .04, 0, .2], dolly: 1.4, drift: .5 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06, PW = 2.1, PH = 2.94;
    g.add(K.plinth(2.4));

    const draws = [
      (c, w, h) => {                                        /* 0: paper + a blue disc */
        c.fillStyle = '#f8f6f0'; c.fillRect(0, 0, w, h);
        const gr = c.createLinearGradient(w * .35, h * .08, w * .9, h * .6); gr.addColorStop(0, '#2d66f2'); gr.addColorStop(1, '#1238b4');
        c.fillStyle = gr; c.beginPath(); c.arc(w * .62, h * .33, 205, 0, 7); c.fill();
        c.strokeStyle = 'rgba(12,18,38,.3)'; c.lineWidth = 2; c.strokeRect(34, 34, w - 68, h - 68);
        c.fillStyle = 'rgba(12,18,38,.7)'; c.font = '500 21px Inter, sans-serif'; c.fillText('ELORA  ·  POSTER SERIES', 64, 92); c.textAlign = 'right'; c.fillText('NO. 01', w - 64, 92); c.textAlign = 'left';
      },
      (c, w, h) => {                                        /* 1: the type */
        c.fillStyle = '#0c1226'; let fs = 270; c.font = `400 ${fs}px "Instrument Serif", Georgia, serif`;
        const mw = c.measureText('Grow.').width; fs = Math.floor(fs * Math.min(1, (w - 120) / mw)); c.font = `400 ${fs}px "Instrument Serif", Georgia, serif`;
        c.fillText('Grow.', 58, h - 150);
        c.font = 'italic 400 40px "Instrument Serif", Georgia, serif'; c.fillStyle = 'rgba(12,18,38,.72)'; c.fillText('One idea. One hook.', 64, h - 86);
      },
      (c, w, h) => {                                        /* 2: the seal */
        c.save(); c.shadowColor = 'rgba(12,18,38,.3)'; c.shadowBlur = 22; c.shadowOffsetY = 8; c.fillStyle = '#fff'; c.beginPath(); c.arc(w - 128, h * .63, 58, 0, 7); c.fill(); c.restore();
        K.drawLogoMark(c, w - 128 - 31, h * .63 - 31, 62);
      }
    ];
    const stack = new THREE.Group(); stack.position.y = FLOOR + 2.1; stack.scale.setScalar(1.18); rig.add(stack);
    const frame = new THREE.Mesh(K.rbox(PW + .12, PH + .12, .07, .025, 3), K.m.navy()); stack.add(frame);
    const layers = draws.map((d, i) => {
      const sc = K.screen(640, 896, d), m = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: sc.tex, transparent: i > 0, depthWrite: i === 0 }));
      m.renderOrder = i; stack.add(m); return m;
    });
    const shadow = K.blob(3.6, .28); shadow.position.y = FLOOR + .01; g.add(shadow);

    return {
      group: g,
      update(u) {
        const t = u.t, dw = u.dw, ent = K.eo(K.ramp(u.enter, .2, 1)), lv = K.ramp(u.leave, 0, .6);
        rig.rotation.y += ((u.S.mx * .1 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        const ex = K.sm(K.ramp(dw, .12, .42)) * (1 - K.sm(K.ramp(dw, .7, .92)));
        stack.rotation.y = -.1 - .5 * ex + Math.sin(t * .4) * .03;
        stack.position.y = FLOOR + 2.1 + Math.sin(t * .8) * .05 + lv * .3;
        const gap = .05 + .5 * ex;
        frame.position.z = -gap - .06;
        layers.forEach((m, i) => { m.position.z = (i - 1) * gap + (i === 0 ? -gap * 0 : 0); m.visible = ent > .02; });
        layers[0].position.z = -gap; layers[1].position.z = 0; layers[2].position.z = gap;
        g.scale.setScalar(.88 + .12 * ent);
      }
    };
  }
});
