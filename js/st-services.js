/* The three departments: Editing, Technical and Marketing.
   Each one is a short tour. Its stages (the "parts" in st-poster.js … st-analytics.js) stand in a
   row, and the camera flies from stage to stage as you scroll, so one department is one
   continuous move instead of a separate page per service. Only the stage the camera is at (and
   the one it is flying to) is drawn. */
(function () {
  const E = window.ELORA, SP = 9;                      /* distance between stages */

  function tour(id, partIds, dwell) {
    const n = partIds.length;
    /* one camera position per stage, taken from the part's own framing */
    const camBeats = partIds.map((pid, j) => {
      const c = E.parts[pid].cam, x = (j - (n - 1) / 2) * SP;
      return { p: [x + c.p[0], c.p[1], c.p[2]], t: [x + c.t[0], c.t[1], c.t[2]], lens: c.lens, fitW: c.fitW, fov: c.fov || 28 };
    });
    E.add({
      id, dwell, camBeats,
      cam: Object.assign({}, E.parts[partIds[0]].cam, { p: camBeats[0].p, t: camBeats[0].t }),
      build(ctx) {
        const { THREE, K } = ctx, g = new THREE.Group();
        const parts = partIds.map((pid, j) => {
          const b = E.parts[pid].build(ctx); b.group.position.x = (j - (n - 1) / 2) * SP; g.add(b.group);
          b.pk = { S: ctx.S, cam: ctx.camera, reveal: 1 };          /* this stage's own update packet */
          return b;
        });
        return {
          group: g,
          update(u) {
            const beta = u.dw * n;                                    /* 0 … n across the department */
            for (let j = 0; j < n; j++) {
              const b = parts[j], first = j === 0, last = j === n - 1;
              const enter = first ? u.enter : K.ramp(beta, j - .5, j + .1);
              const leave = last ? u.leave : K.ramp(beta, j + .55, j + 1);
              const vis = enter > .004 && leave < .996;
              if (b.group.visible !== vis) b.group.visible = vis;
              if (!vis) continue;
              const p = b.pk;
              p.dw = K.ramp(beta, j - .15, j + .95); p.enter = enter; p.leave = leave; p.active = enter * (1 - leave);
              p.t = u.t; p.dt = u.dt; p.vel = u.vel; p.drag = u.drag;
              b.update(p);
            }
          }
        };
      }
    });
  }

  tour('editing', ['poster', 'reels', 'brand'], 2.7);
  tour('technical', ['web', 'automations', 'crm'], 2.7);
  tour('marketing', ['ads', 'analytics'], 1.8);
})();
