/* Scene 09 — the crew.
   The elora mark at the centre, six people on a ring around it, each a ball with a monogram.
   Point at a name in the list (js/crew.js) and the ring turns that person to the top, the ball
   swells and turns blue, and a thin spoke lights up between them and the mark. */
ELORA.add({
  id: 'crew', dwell: 1.5,
  cam: { fitW: 5.2, p: [-.3, 2.2, 12.8], t: [0, 2.0, 0], fov: 31, lens: [-.25, .04, 0, .26], dolly: 1.4, drift: -.5 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06, R = 1.5, N = 6, TAU = Math.PI * 2, CY = FLOOR + 2.0;
    const crew = ELORA.crew || { focus: -1 };
    const ini = crew.ini || ['SD', 'PK', 'PH', 'DK', 'RK', 'SV'];
    g.add(K.plinth(2.4));

    /* the mark, small, in the middle */
    const hub = K.logo3D(1.05); hub.position.y = CY; rig.add(hub);

    /* the ring, its spokes and the six balls */
    const ring = new THREE.Group(); ring.position.y = CY; rig.add(ring);
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(R, .014, 10, K.seg(160)), K.m.steel(0xd5dae3, .3)));
    const r0 = .78, r1 = R - .3, rc = (r0 + r1) / 2, spokeGeo = new THREE.CylinderGeometry(.006, .006, r1 - r0, 6);
    const ballGeo = new THREE.SphereGeometry(.27, K.seg(36), K.seg(24));
    const INK = new THREE.Color(K.C.ink), BLUE = new THREE.Color(K.C.blue);
    const people = [];
    for (let i = 0; i < N; i++) {
      const a = Math.PI / 2 + i / N * TAU;
      const spokeMat = new THREE.MeshBasicMaterial({ color: K.C.ink, transparent: true, opacity: .16, depthWrite: false });
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.position.set(Math.cos(a) * rc, Math.sin(a) * rc, 0); spoke.rotation.z = a - Math.PI / 2; ring.add(spoke);
      const grp = new THREE.Group(); grp.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); ring.add(grp);
      const mat = K.m.navy(K.C.ink, .45), ball = new THREE.Mesh(ballGeo, mat); grp.add(ball);
      const tag = K.label(ini[i] || '', { size: 78, weight: 400, family: '"Instrument Serif", Georgia, serif', color: '#ffffff', w: .3, pad: 8 });
      tag.position.z = .275; grp.add(tag);
      people.push({ grp, mat, spokeMat, tag, k: 0 });
    }
    const shadow = K.blob(3.4, .26); shadow.position.y = FLOOR + .01; g.add(shadow);

    let rot = 0;
    return {
      group: g,
      update(u) {
        const t = u.t, dt = u.dt, dw = u.dw, ent = K.eo(K.ramp(u.enter, .2, 1)), lv = K.ramp(u.leave, 0, .6);
        rig.rotation.y += ((u.S.mx * .1 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        const f = crew.focus;
        if (f >= 0) { let d = -f / N * TAU - rot; d -= Math.round(d / TAU) * TAU; rot += d * (1 - Math.exp(-dt * 6)); }   /* the chosen one comes to the top */
        else rot += dt * .1;                                                                                              /* otherwise a slow drift */
        ring.rotation.z = rot;
        ring.rotation.y = Math.sin(t * .35) * .28 + (dw - .5) * .4 + u.S.mx * .2;
        const bob = Math.sin(t * .8) * .05;
        ring.position.y = CY + bob + lv * .3; hub.position.y = CY + bob + lv * .3;
        hub.rotation.y = Math.sin(t * .5) * .45 + (dw - .5) * .5;
        const s = .88 + .12 * ent, on = ent > .02;
        ring.scale.setScalar(s); hub.scale.setScalar(s); ring.visible = hub.visible = on;
        for (let i = 0; i < N; i++) {
          const p = people[i]; p.k += ((i === f ? 1 : 0) - p.k) * (1 - Math.exp(-dt * 8));
          p.grp.scale.setScalar(1 + .45 * p.k); p.grp.position.z = p.k * .4;
          p.mat.color.lerpColors(INK, BLUE, p.k);
          p.spokeMat.opacity = .16 + .5 * p.k; p.spokeMat.color.lerpColors(INK, BLUE, p.k);
          p.tag.rotation.z = -rot;                                           /* the monogram stays upright as the ring turns */
        }
        shadow.scale.setScalar(1 - bob * .6);
        g.scale.setScalar(.9 + .1 * ent);
      }
    };
  }
});
