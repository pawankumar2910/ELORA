/* Scene 03 — Meta & Google Ads.
   A bullseye on a slim stand and a single arrow that lands in it as you scroll. */
ELORA.add({
  id: 'ads',
  cam: { fitW: 4.4, p: [.3, 2.2, 12.6], t: [.2, 2.0, 0], fov: 28, lens: [.2, .04, 0, .2], dolly: 1.4, drift: .5 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06;
    g.add(K.plinth(2.4));

    const TX = .2, TY = FLOOR + 2.15;
    const target = new THREE.Group(); target.position.set(TX, TY, 0); rig.add(target);
    const paper = () => K.m.porcelain(0xf7f5ef, .45);
    [[1.6, K.m.navy()], [1.28, paper()], [.96, K.m.blue()], [.64, paper()], [.32, K.m.navy()]].forEach(([r, m], i) => {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .1, K.seg(72)), m); d.rotation.x = Math.PI / 2; d.position.z = i * .02; target.add(d);
    });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.62, .04, 10, K.seg(96)), K.m.steel()); target.add(rim);
    const legMat = K.m.steel(0xaab1be, .4);
    [[-.55, 0], [.55, 0], [0, -.5]].forEach(([x, z], i) => {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, 2.3, 10), legMat); l.position.set(x * .6, -1.45, -.3 + z); l.rotation.z = -x * .2; l.rotation.x = i === 2 ? -.28 : 0; target.add(l);
    });

    /* the arrow, flying in from the right */
    const arrow = new THREE.Group(); rig.add(arrow);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 1.9, 8), K.m.steel(0xdfe3ea, .25)); sh.rotation.x = Math.PI / 2; sh.position.z = -.95; arrow.add(sh);
    const tp = new THREE.Mesh(new THREE.ConeGeometry(.065, .24, 14), K.m.navy()); tp.rotation.x = Math.PI / 2; tp.position.z = .1; arrow.add(tp);
    const nock = new THREE.Mesh(new THREE.CylinderGeometry(.055, .045, .42, 14), K.m.blue()); nock.rotation.x = Math.PI / 2; nock.position.z = -1.72; arrow.add(nock);
    const hit = new THREE.Vector3(TX + .42, TY + .3, .14), dir = new THREE.Vector3(7, 1.8, 3.2).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().negate()); arrow.quaternion.copy(q);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.3, .012, 8, 64), new THREE.MeshBasicMaterial({ color: K.C.ink, transparent: true, opacity: 0, depthWrite: false })); ring.position.copy(hit); ring.position.z += .08; rig.add(ring);
    const shadow = K.blob(3.4, .26); shadow.position.y = FLOOR + .01; g.add(shadow);

    return {
      group: g,
      update(u) {
        const t = u.t, dw = u.dw, ent = K.eo(K.ramp(u.enter, .2, 1)), lv = K.ramp(u.leave, 0, .6);
        rig.rotation.y += ((u.S.mx * .1 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        target.rotation.y = -.3 + dw * .22 + Math.sin(t * .5) * .03;
        target.scale.setScalar(.9 + .1 * ent); target.visible = ent > .02;
        /* the arrow: in flight from dw .12 to .36, then it stays */
        const f = K.clamp01((dw - .12) / .24) * ent, e = 1 - Math.pow(1 - f, 2.4);
        arrow.position.copy(hit).addScaledVector(dir, (1 - e) * 9); arrow.visible = f > .001;
        const ip = K.clamp01((dw - .36) / .16) * ent; ring.visible = ip > 0 && ip < 1; ring.scale.setScalar(.6 + ip * 2.6); ring.material.opacity = (1 - ip) * (1 - ip) * .45;
        g.scale.setScalar(.88 + .12 * ent);
      }
    };
  }
});
