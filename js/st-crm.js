/* Scene 06 — CRM.
   A glass funnel and a small flock of leads working their way down it, thinning
   out stage by stage. Labels sit quietly to one side. */
ELORA.add({
  id: 'crm',
  cam: { fitW: 5.6, p: [-.2, 2.5, 13.4], t: [.3, 2.3, 0], fov: 28, lens: [-.2, .04, 0, .2], dolly: 1.4, drift: -.5 },
  build({ THREE, K }) {
    const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
    const FLOOR = .06, YT = 4.3, YB = .55, RT = 1.7, RB = .3;
    g.add(K.plinth(2.5));

    const rAt = y => K.lerp(RB, RT, Math.pow(K.clamp01((y - YB) / (YT - YB)), .85));
    const fun = new THREE.Group(); fun.position.y = FLOOR; rig.add(fun);
    const prof = []; for (let i = 0; i <= 36; i++) { const y = K.lerp(YB, YT, i / 36); prof.push(new THREE.Vector2(rAt(y), y)); }
    const shell = K.m.glass(0xdbe6ff, .26); shell.side = THREE.DoubleSide;
    fun.add(new THREE.Mesh(new THREE.LatheGeometry(prof, K.seg(64)), shell));
    [YT, 2.7, 1.45, YB].forEach(y => { const r = new THREE.Mesh(new THREE.TorusGeometry(rAt(y) + .015, .035, 12, K.seg(72)), K.m.steel()); r.rotation.x = Math.PI / 2; r.position.y = y; fun.add(r); });

    /* leads: a few spheres, positions a function of time */
    const NL = 34, rr = K.rng(71), leads = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3, metalness: .1, envMapIntensity: .9 }), NL);
    leads.frustumCulled = false; fun.add(leads);
    const L = Array.from({ length: NL }, () => ({ ph: rr(), th: rr() * 6.283, rad: .25 + .7 * Math.sqrt(rr()), surv: Math.pow(rr(), 1.7) + .04, sp: .8 + rr() * .4 }));
    const cTop = new THREE.Color(0x9db8ff), cMid = new THREE.Color(K.C.blue), cEnd = new THREE.Color(K.C.ink), col = new THREE.Color(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), Sc = new THREE.Vector3();

    /* labels + leader lines */
    [['LEAD', 3.75], ['QUALIFIED', 2.3], ['WON', .95]].forEach(([txt, y]) => {
      const l = K.label(txt, { size: 30, weight: 500, color: 'rgba(12,18,38,.55)', align: 'left' }); l.position.set(rAt(y) + 1.05 + l.geometry.parameters.width / 2, y, 0); fun.add(l);
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(.55, .008), new THREE.MeshBasicMaterial({ color: K.C.ink, transparent: true, opacity: .3 })); ln.position.set(rAt(y) + .55, y, 0); fun.add(ln);
    });
    const shadow = K.blob(3.6, .26); shadow.position.y = FLOOR + .01; g.add(shadow);

    return {
      group: g,
      update(u) {
        const t = u.t, dw = u.dw, ent = K.eo(K.ramp(u.enter, .2, 1)), lv = K.ramp(u.leave, 0, .6);
        rig.rotation.y += ((u.S.mx * .06 + u.drag) - rig.rotation.y) * Math.min(1, u.dt * 5);
        fun.scale.setScalar(Math.max(.001, .9 + .1 * ent)); fun.position.y = FLOOR + lv * .25;
        const flow = t * .06 + dw * .4, show = K.eo(K.ramp(dw + ent * .2, 0, .35)) * ent;
        for (let i = 0; i < NL; i++) {
          const l = L[i], s = (flow * l.sp + l.ph) % 1, y = K.lerp(YT + .1, YB - .2, s), rad = rAt(Math.max(YB, y)) * .78 * l.rad, a = l.th + s * 8 + t * .3;
          const alive = 1 - K.sm(K.ramp(s, l.surv * .94, l.surv + .05)), k = Math.max(.001, alive * show);
          P.set(Math.cos(a) * rad, y, Math.sin(a) * rad); Sc.setScalar(k); M.compose(P, Q, Sc); leads.setMatrixAt(i, M);
          if (s < .55) col.copy(cTop).lerp(cMid, s / .55); else col.copy(cMid).lerp(cEnd, (s - .55) / .45);
          leads.setColorAt(i, col);
        }
        leads.instanceMatrix.needsUpdate = true; leads.instanceColor.needsUpdate = true;
        g.scale.setScalar(.88 + .12 * ent);
      }
    };
  }
});
