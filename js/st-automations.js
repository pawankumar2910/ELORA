/* Part 05 — Automations.
   Four steps in a row — trigger, filter, action, done — and one blue point that
   runs along them. Each step's outline lights up as it passes. */
ELORA.part('automations', {
  cam: { fitW: 7.4, p: [.2, 2.1, 13.8], t: [0, 1.75, 0], fov: 35, lens: [.23, .04, 0, .2], dolly: 1.3, drift: .5 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06, Y = FLOOR + 1.65;
    g.add(K.plinth(3.5));

    const icon = kind => K.ctexture((() => {
      const c = K.canvas(128, 128), q = c.getContext('2d'); q.strokeStyle = '#0c1226'; q.lineWidth = 7; q.lineJoin = q.lineCap = 'round';
      const poly = pts => { q.beginPath(); pts.forEach((p, i) => i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1])); q.closePath(); q.stroke(); };
      if (kind === 'bolt') poly([[74, 16], [38, 70], [62, 70], [52, 112], [90, 56], [66, 56]]);
      if (kind === 'filter') poly([[20, 28], [108, 28], [72, 68], [72, 104], [56, 96], [56, 68]]);
      if (kind === 'mail') { K.rrect(q, 18, 30, 92, 68, 10); q.stroke(); q.beginPath(); q.moveTo(22, 38); q.lineTo(64, 70); q.lineTo(106, 38); q.stroke(); }
      if (kind === 'check') { q.beginPath(); q.arc(64, 64, 42, 0, 7); q.stroke(); q.beginPath(); q.moveTo(44, 66); q.lineTo(60, 82); q.lineTo(88, 48); q.stroke(); }
      return c;
    })());
    const defs = [['bolt', 'TRIGGER', -2.7], ['filter', 'FILTER', -.9], ['mail', 'ACTION', .9], ['check', 'DONE', 2.7]];
    const baseMat = K.m.phys({ color: 0xfdfcfa, metalness: 0, roughness: .42, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: .8 });
    const edgeTex = K.ctexture((() => { const c = K.canvas(256, 256), q = c.getContext('2d'); q.strokeStyle = '#1d4fe0'; q.lineWidth = 9; K.rrect(q, 14, 14, 228, 228, 50); q.stroke(); return c; })());
    const nodes = defs.map(d => {
      const grp = new THREE.Group(); grp.position.set(d[2], Y, 0); rig.add(grp);
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: edgeTex, transparent: true, opacity: 0, depthWrite: false })); edge.position.z = .17; grp.add(edge);
      grp.add(new THREE.Mesh(K.rbox(1.12, 1.12, .3, .22, 5), baseMat));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(.58, .58), K.m.decal(icon(d[0]))); face.position.z = .16; grp.add(face);
      const lab = K.label(d[1], { size: 30, weight: 500, color: 'rgba(12,18,38,.5)' }); lab.position.set(0, -.88, .02); grp.add(lab);
      return { grp, edge, act: 0, x: d[2] };
    });
    const pipeMat = K.m.steel(0xaeb5c2, .4);
    for (let i = 0; i < 3; i++) {
      const x0 = defs[i][2] + .6, x1 = defs[i + 1][2] - .6, p = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, x1 - x0, 8), pipeMat);
      p.rotation.z = Math.PI / 2; p.position.set((x0 + x1) / 2, Y, 0); rig.add(p);
    }
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.11, 20, 14), K.m.blue()); dot.position.y = Y; rig.add(dot);
    const shadow = K.blob(8.4, .2); shadow.position.y = FLOOR + .01; g.add(shadow);

    return {
      group: g,
      update(u) {
        const t = u.t, dw = u.dw, ent = K.eo(K.ramp(u.enter, .2, 1)), lv = K.ramp(u.leave, 0, .6);
        rig.rotation.y += ((u.S.mx * .06 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        const p = (t * .16 + dw * .6) % 1, x = K.lerp(-2.7, 2.7, p);
        dot.position.x = x; dot.position.y = Y + Math.sin(p * Math.PI) * .04; dot.scale.setScalar(Math.max(.001, ent));
        nodes.forEach((n, i) => {
          const a = K.back(K.ramp(u.enter, .15 + i * .08, .7 + i * .06));
          n.act = Math.max(n.act * Math.exp(-u.dt * 1.8), 1 - K.clamp01(Math.abs(x - n.x) / .55));
          n.edge.material.opacity = n.act; n.grp.scale.setScalar(Math.max(.001, a) * (1 + .035 * n.act));
          n.grp.position.y = Y + Math.sin(t * .8 + i) * .03 + lv * .25;
        });
        g.scale.setScalar((.9 + .1 * ent) * .92);
      }
    };
  }
});
