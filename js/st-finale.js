/* Scene 09 — the finale.
   The logo, larger, alone on the stage. The contact panel sits over the right half. */
ELORA.add({
  id: 'finale', dwell: 1.3,
  cam: { fitW: 4.8, p: [-.2, 2.4, 13.6], t: [0, 2.3, 0], fov: 28, lens: [-.18, .04, 0, .2], dolly: 1.1, drift: -.4, lean: 1.3 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06;
    g.add(K.plinth(2.6));

    const mark = K.logo3D(3.3); rig.add(mark);
    const shadow = K.blob(3.6, .3); shadow.position.y = FLOOR + .01; g.add(shadow);

    return {
      group: g,
      update(u) {
        const t = u.t, dw = u.dw, ent = K.eo(K.ramp(u.enter, .15, 1));
        rig.rotation.y += ((u.S.mx * .1 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        const ma = K.back(K.ramp(u.enter, .1, .9)), bob = Math.sin(t * .8) * .07;
        mark.position.y = FLOOR + 2.45 + bob; mark.rotation.y = Math.sin(t * .4) * .42 + (dw - .5) * .5 + u.S.mx * .2; mark.rotation.x = Math.sin(t * .5) * .03 - u.S.my * .06;
        mark.scale.setScalar(Math.max(.001, .85 + .15 * ma)); mark.visible = ma > .01;
        shadow.scale.setScalar(1 - bob * .5);
        g.scale.setScalar(.92 + .08 * ent);
      }
    };
  }
});
