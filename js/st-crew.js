/* Scene 09 — the crew.
   One slim ring with six beads, one for each of us, turning slowly. The list of names
   (js/crew.js) sits beside it. */
ELORA.add({
  id: 'crew', dwell: 1.5,
  cam: { fitW: 4.4, p: [-.3, 2.2, 12.8], t: [0, 2.0, 0], fov: 28, lens: [-.2, .04, 0, .3], dolly: 1.4, drift: -.5 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06, R = 1.55, N = 6;
    g.add(K.plinth(2.4));

    const ring = new THREE.Group(); rig.add(ring);
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(R, .022, 12, K.seg(160)), K.m.steel(0xd5dae3, .3)));
    const beadGeo = new THREE.SphereGeometry(.2, K.seg(32), K.seg(20)), blue = K.m.blue(), ink = K.m.navy();
    const beads = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, m = new THREE.Mesh(beadGeo, i % 2 ? ink : blue);
      m.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); ring.add(m); beads.push(m);
    }
    const shadow = K.blob(3.2, .26); shadow.position.y = FLOOR + .01; g.add(shadow);

    return {
      group: g,
      update(u) {
        const t = u.t, dw = u.dw, ent = K.eo(K.ramp(u.enter, .2, 1)), lv = K.ramp(u.leave, 0, .6);
        rig.rotation.y += ((u.S.mx * .1 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        ring.rotation.y = t * .22 + dw * .9; ring.rotation.z = t * .12;
        ring.position.y = FLOOR + 2.0 + Math.sin(t * .8) * .06 + lv * .3;
        ring.scale.setScalar(.88 + .12 * ent); ring.visible = ent > .02;
        shadow.scale.setScalar(1 - Math.sin(t * .8) * .03);
        g.scale.setScalar(.9 + .1 * ent);
      }
    };
  }
});
