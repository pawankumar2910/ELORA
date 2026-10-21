/* Part 07 — Analytics & Reporting.
   Seven bars rise one after another on a plain slab, and a single blue line
   draws itself across their tops. */
ELORA.part('analytics', {
  cam: { fitW: 7.6, p: [.3, 2.4, 13.2], t: [0, 1.75, 0], fov: 34, lens: [.25, .04, 0, .2], dolly: 1.3, drift: .5 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06, BASE = FLOOR + .15;
    g.add(K.plinth(3.4));

    const slab = new THREE.Mesh(K.rbox(6.1, .16, 2.1, .07, 3), K.m.porcelain(0xdedbd3, .7)); slab.position.y = FLOOR + .08; rig.add(slab);
    const NB = 7, H = [.7, 1.0, .88, 1.45, 1.8, 1.68, 2.7];
    const cA = new THREE.Color(K.C.ink), cB = new THREE.Color(K.C.blue);
    const bars = H.map((h, i) => {
      const m = new THREE.Mesh(K.rbox(.54, h, .54, .07, 4), K.m.navy(cA.clone().lerp(cB, i / (NB - 1)))); m.position.x = (i - (NB - 1) / 2) * .84; rig.add(m); return { m, h };
    });
    /* the trend line along the tops */
    const pts = H.map((h, i) => new THREE.Vector3((i - (NB - 1) / 2) * .84, BASE + h + .32, 0)), curve = new THREE.CatmullRomCurve3(pts);
    const lineGeo = new THREE.TubeGeometry(curve, 140, .028, 8, false), idx = lineGeo.index.count;
    const line = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: K.C.blue })); rig.add(line);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(.09, 18, 14), K.m.blue()); rig.add(tip);
    const shadow = K.blob(7.4, .22); shadow.position.y = FLOOR + .01; g.add(shadow);
    const tmp = new THREE.Vector3();

    return {
      group: g,
      update(u) {
        const t = u.t, dw = u.dw, ent = K.eo(K.ramp(u.enter, .2, 1)), lv = K.ramp(u.leave, 0, .6);
        rig.rotation.y += ((u.S.mx * .07 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        slab.scale.setScalar(Math.max(.001, .9 + .1 * ent));
        const grow = K.ramp(dw + ent * .12, 0, .62);
        bars.forEach((b, i) => {
          const a = K.back(K.ramp(grow, i / NB * .6, i / NB * .6 + .34)) * ent, s = Math.max(.001, a);
          b.m.scale.y = s; b.m.position.y = BASE + b.h * s / 2; b.m.visible = a > .01;
        });
        const lr = K.eio(K.ramp(dw + ent * .1, .12, .74)) * ent;
        lineGeo.setDrawRange(0, Math.floor(lr * idx / 6) * 6); line.visible = lr > .004;
        curve.getPoint(Math.min(.999, lr), tmp); tip.position.copy(tmp); tip.visible = lr > .004; tip.scale.setScalar(1 + .12 * Math.sin(t * 4));
        rig.position.y = lv * .25;
        g.scale.setScalar((.9 + .1 * ent) * .88);
      }
    };
  }
});
