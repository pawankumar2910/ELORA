/* Scene 00 — the landing hero.
   Just the logo, in 3D: blue lacquer with the white megaphone raised on its face,
   turning gently on a quiet stage. It answers the pointer and the scroll. */
ELORA.add({
  id: 'hero', dwell: 1.0,
  cam: { fitW: 4.6, p: [0, 2.3, 13.4], t: [0, 2.15, 0], fov: 28, lens: [.2, .03, 0, .2], dolly: 1.1, drift: .3 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06;
    g.add(K.plinth(2.5));

    const logo = K.logo3D(3.0); rig.add(logo);
    const shadow = K.blob(3.4, .3); shadow.position.y = FLOOR + .01; g.add(shadow);

    return {
      group: g,
      update(u) {
        const t = u.t, rv = K.back(K.ramp(u.reveal, .25, .95)), lv = K.ramp(u.leave, 0, .7);
        rig.rotation.y += ((u.S.mx * .12 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        const bob = Math.sin(t * .8) * .08;
        logo.position.y = FLOOR + 2.15 + bob + (1 - rv) * -.8 + lv * .5;
        logo.rotation.y = Math.sin(t * .5) * .38 + u.S.mx * .25 - lv * .5;
        logo.rotation.x = Math.sin(t * .6) * .03 - u.S.my * .08;
        logo.scale.setScalar(Math.max(.001, .85 + .15 * rv));
        logo.visible = rv > .01;
        shadow.scale.setScalar(1 - bob * .5 + lv * .15); shadow.material.opacity = .3 * K.clamp01(rv);
      }
    };
  }
});
