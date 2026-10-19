/* Scene 08 — Brand & Social.
   The logo, and the three colours it is made of, set out like a page from a brand guide. */
ELORA.add({
  id: 'brand',
  cam: { fitW: 4.6, p: [-.3, 2.5, 13.2], t: [0, 2.2, 0], fov: 28, lens: [-.2, .04, 0, .2], dolly: 1.4, drift: -.5 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06;
    g.add(K.plinth(2.5));

    const mark = K.logo3D(2.5); rig.add(mark);
    const chips = [[K.C.ink, 'INK', -1.15], [K.C.blue, 'BLUE', 0], [0xf5f3ee, 'PAPER', 1.15]].map(([c, name, x], i) => {
      const grp = new THREE.Group(); grp.position.set(x, FLOOR + .95, 1.45); rig.add(grp);
      const d = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .1, K.seg(48)), i === 2 ? K.m.porcelain(c, .5) : K.m.navy(c, .3)); d.rotation.x = Math.PI / 2; grp.add(d);
      if (i === 2) { const r = new THREE.Mesh(new THREE.TorusGeometry(.42, .008, 6, K.seg(64)), new THREE.MeshBasicMaterial({ color: K.C.ink, transparent: true, opacity: .35 })); r.position.z = .052; grp.add(r); }
      const lab = K.label(name, { size: 28, weight: 500, color: 'rgba(12,18,38,.5)' }); lab.position.set(0, -.68, 0); grp.add(lab);
      return grp;
    });
    const shadow = K.blob(3.4, .26); shadow.position.y = FLOOR + .01; g.add(shadow);

    return {
      group: g,
      update(u) {
        const t = u.t, dw = u.dw, ent = K.eo(K.ramp(u.enter, .2, 1)), lv = K.ramp(u.leave, 0, .6);
        rig.rotation.y += ((u.S.mx * .08 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        const ma = K.back(K.ramp(u.enter, .2, .9));
        mark.position.y = FLOOR + 2.85 + Math.sin(t * .8) * .07 + lv * .4;
        mark.rotation.y = Math.sin(t * .5) * .38 + (dw - .5) * .5 + u.S.mx * .25;
        mark.scale.setScalar(Math.max(.001, .85 + .15 * ma)); mark.visible = ma > .01;
        chips.forEach((c, i) => { const a = K.back(K.ramp(dw + ent * .15, .06 + i * .07, .32 + i * .07)) * ent; c.scale.setScalar(Math.max(.001, K.clamp01(a))); c.position.y = FLOOR + .95 + Math.sin(t * 1.0 + i) * .035; c.rotation.y = Math.sin(t * .6 + i) * .18; });
        g.scale.setScalar(.9 + .1 * ent);
      }
    };
  }
});
