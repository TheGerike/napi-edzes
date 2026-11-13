/* Pálcikaember-renderer. Szögkonvenció: 0 = lefelé, 90 = előre (jobbra), 180 = fel, -90 = hátra.
   Póz: {t: törzs (csípő→nyak), c: gerincív, hd: fej iránya,
         l: [[comb, lábszár] közeli, [..] távoli], a: [[felkar, alkar] közeli, [..] távoli],
         ar: 1 → karszögek a törzshöz képest, fo: [közeli, távoli] lábfej abszolút szög} */
const FIG = (() => {
  const L = { th: 46, sh: 46, tr: 58, sp: 53, ua: 32, fa: 30, hr: 11, hd: 15, ft: 12 };
  const R = Math.PI / 180;
  const v = (a, len) => [Math.sin(a * R) * len, Math.cos(a * R) * len];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const GROUND = 0;

  function footAng(p, i, sh) {
    if (p.fo && p.fo[i] != null) return p.fo[i];
    if (Math.abs(sh) < 55) return 90;          // álló lábszár → talp a talajon
    return sh + 90;
  }

  function solve(p) {
    const P = { hip: [0, 0] };
    P.neck = v(p.t, L.tr);
    P.sho = v(p.t, L.sp);
    P.head = add(P.neck, v(p.hd != null ? p.hd : p.t, L.hd));
    ['n', 'f'].forEach((s, i) => {
      const [th, sh] = p.l[i];
      P['k' + s] = add(P.hip, v(th, L.th));
      P['a' + s] = add(P['k' + s], v(sh, L.sh));
      P['t' + s] = add(P['a' + s], v(footAng(p, i, sh), L.ft));
      let [ua, fa] = p.a[i];
      if (p.ar) { ua += p.t - 180; fa += p.t - 180; }
      P['e' + s] = add(P.sho, v(ua, L.ua));
      P['w' + s] = add(P['e' + s], v(fa, L.fa));
    });
    // gerinc kontrollpont
    const d = v(p.t, 1), n = [d[1], -d[0]], c = p.c || 0;
    P.ctl = [P.sho[0] / 2 + n[0] * c * 2, P.sho[1] / 2 + n[1] * c * 2];
    return P;
  }

  function propPts(P, prop) {
    const out = [];
    if (!prop) return out;
    if (prop.kb) {
      const h = prop.kb === 'both' ? [(P.wn[0] + P.wf[0]) / 2, (P.wn[1] + P.wf[1]) / 2] : P['w' + prop.kb];
      out.push({ k: 'kb', at: h, bottom: h[1] + 24 });
    }
    if (prop.db) {
      const sides = prop.db === 'both' ? ['n', 'f'] : [prop.db];
      sides.forEach(s => out.push({ k: 'db', at: P['w' + s], bottom: P['w' + s][1] + 7, far: s === 'f' }));
    }
    return out;
  }

  // Talajra ejtés + vízszintes horgony
  function place(ex, pose) {
    const P = solve(pose);
    const keys = ['hip', 'sho', 'neck', 'kn', 'kf', 'an', 'af', 'tn', 'tf', 'en', 'ef', 'wn', 'wf'];
    let maxY = -1e9;
    keys.forEach(k => { if (P[k][1] > maxY) maxY = P[k][1]; });
    maxY = Math.max(maxY, P.head[1] + L.hr);
    const props = propPts(P, ex.prop);
    props.forEach(pp => { if (!pp.far || ex.prop.db !== 'both') maxY = Math.max(maxY, pp.bottom); });
    if (ex.boxAt) {/* a doboz alátámaszt: nem számít */}
    const anchor = ex.anch || 'an';
    const dx = -P[anchor][0], dy = GROUND - maxY - (pose.air || 0);
    const T = {};
    Object.keys(P).forEach(k => { T[k] = [P[k][0] + dx, P[k][1] + dy]; });
    T.props = props.map(pp => ({ ...pp, at: [pp.at[0] + dx, pp.at[1] + dy] }));
    return T;
  }

  function lerpPose(a, b, u) {
    const L2 = (x, y) => x + (y - x) * u;
    const o = {
      t: L2(a.t, b.t), c: L2(a.c || 0, b.c || 0),
      l: [0, 1].map(i => [L2(a.l[i][0], b.l[i][0]), L2(a.l[i][1], b.l[i][1])]),
      a: [0, 1].map(i => [L2(a.a[i][0], b.a[i][0]), L2(a.a[i][1], b.a[i][1])]),
      ar: a.ar, air: L2(a.air || 0, b.air || 0)
    };
    const ha = a.hd != null ? a.hd : a.t, hb = b.hd != null ? b.hd : b.t;
    if (a.hd != null || b.hd != null) o.hd = L2(ha, hb);
    if (a.fo || b.fo) {
      o.fo = [0, 1].map(i => {
        const fa = a.fo && a.fo[i] != null ? a.fo[i] : null, fb = b.fo && b.fo[i] != null ? b.fo[i] : null;
        if (fa == null && fb == null) return null;
        return L2(fa != null ? fa : fb, fb != null ? fb : fa);
      });
    }
    return o;
  }

  // u: 0..1 a teljes cikluson belül
  function poseAt(ex, u) {
    const F = ex.frames;
    if (F.length === 1) return F[0];
    if (ex.mode === 'loop') {
      u = Math.min(Math.max(u, 0), 0.99999);
      const seg = u * F.length, i = Math.floor(seg) % F.length, w = seg - Math.floor(seg);
      const nxt = F[(i + 1) % F.length];
      return lerpPose(F[i], nxt, ex.linear ? w : (1 - Math.cos(w * Math.PI)) / 2);
    }
    // pingpong, végpontokon kis tartással
    const hold = ex.hold != null ? ex.hold : 0.12;
    let w = u < 0.5 ? u * 2 : 2 - u * 2;           // 0→1→0
    w = Math.min(1, Math.max(0, (w - hold / 2) / (1 - hold)));
    w = (1 - Math.cos(w * Math.PI)) / 2;
    return lerpPose(F[0], F[1], w);
  }

  // A teljes mozgás befoglaló doboza (viewBox), hogy minden gyakorlat kiférjen
  function bounds(ex) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9;
    for (let i = 0; i <= 24; i++) {
      const T = place(ex, poseAt(ex, i / 24));
      Object.keys(T).forEach(k => {
        if (k === 'props' || k === 'ctl') return;
        const r = k === 'head' ? L.hr : 2;
        x0 = Math.min(x0, T[k][0] - r); x1 = Math.max(x1, T[k][0] + r); y0 = Math.min(y0, T[k][1] - r);
      });
      T.props.forEach(pp => { x0 = Math.min(x0, pp.at[0] - 12); x1 = Math.max(x1, pp.at[0] + 12); y0 = Math.min(y0, pp.at[1] - 6); });
    }
    if (ex.box) { x0 = Math.min(x0, ex._boxX - 4); x1 = Math.max(x1, ex._boxX + ex._boxW + 4); }
    const W = Math.max(210, x1 - x0 + 30), H = Math.max(170, -y0 + 28);
    const cx = (x0 + x1) / 2;
    return { x: cx - W / 2, y: -H + 14, w: W, h: H };
  }

  function prepBox(ex) {
    if (!ex.box || ex._boxW) return;
    const T = place(ex, ex.frames[0]);
    const a = T.af;
    ex._boxW = 44; ex._boxX = a[0] - 30; ex._boxTop = a[1] + 3;
  }

  const seg = (p, q, cls) => `<line class="${cls}" x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}"/>`;
  const poly = (pts, cls) => `<polyline class="${cls}" points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}"/>`;

  function draw(ex, T) {
    let s = '';
    const bb = ex._bb;
    s += `<line class="fg-ground" x1="${bb.x}" y1="${GROUND + 1.5}" x2="${bb.x + bb.w}" y2="${GROUND + 1.5}"/>`;
    if (ex.box) s += `<rect class="fg-box" x="${ex._boxX}" y="${ex._boxTop}" width="${ex._boxW}" height="${GROUND - ex._boxTop}" rx="3"/>`;
    const limb = (s1, cls) => poly([T.sho, T['e' + s1], T['w' + s1]], cls);
    const leg = s1 => poly([T.hip, T['k' + s1], T['a' + s1], T['t' + s1]], s1 === 'n' ? 'fg-near' : 'fg-far');
    const props = T.props;
    const drawProp = pp => {
      const [x, y] = pp.at;
      if (pp.k === 'kb') return `<g class="fg-kb"><path d="M${x - 7},${y + 9} C${x - 8},${y - 3} ${x + 8},${y - 3} ${x + 7},${y + 9}" fill="none"/><circle cx="${x}" cy="${y + 14}" r="10"/></g>`;
      return `<g class="fg-db${pp.far ? ' far' : ''}"><circle cx="${x}" cy="${y}" r="7"/><circle class="hole" cx="${x}" cy="${y}" r="2.4"/></g>`;
    };
    // távoli végtagok
    s += leg('f');
    s += limb('f', 'fg-far');
    props.filter(p => p.far).forEach(p => { s += drawProp(p); });
    // törzs + fej
    s += `<path class="fg-near fg-trunk" d="M${T.hip[0].toFixed(1)},${T.hip[1].toFixed(1)} Q${T.ctl[0].toFixed(1)},${T.ctl[1].toFixed(1)} ${T.neck[0].toFixed(1)},${T.neck[1].toFixed(1)}"/>`;
    s += `<circle class="fg-head" cx="${T.head[0].toFixed(1)}" cy="${T.head[1].toFixed(1)}" r="${L.hr}"/>`;
    s += leg('n');
    s += limb('n', 'fg-near');
    props.filter(p => !p.far).forEach(p => { s += drawProp(p); });
    return s;
  }

  function setup(ex) {
    prepBox(ex);
    if (!ex._bb) ex._bb = bounds(ex);
    return ex._bb;
  }

  function render(svg, ex, u) {
    const bb = setup(ex);
    svg.setAttribute('viewBox', `${bb.x.toFixed(1)} ${bb.y.toFixed(1)} ${bb.w.toFixed(1)} ${bb.h.toFixed(1)}`);
    // 8 bites hatás: SVG-szűrő mintavételez és kockákra nagyít (kb. 64 „pixel” széles kép)
    const P = +(bb.w / 64).toFixed(2), x = bb.x.toFixed(1), y = bb.y.toFixed(1);
    const pix = (typeof document !== 'undefined' && document.documentElement.dataset.pixel === 'off') ? '' :
      `<defs><filter id="pxf" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${bb.w.toFixed(1)}" height="${bb.h.toFixed(1)}">` +
      `<feFlood x="${(+x + P / 2).toFixed(2)}" y="${(+y + P / 2).toFixed(2)}" width="1" height="1" flood-color="#fff"/>` +
      `<feComposite x="${x}" y="${y}" width="${P}" height="${P}"/><feTile result="grid"/>` +
      `<feComposite in="SourceGraphic" in2="grid" operator="in"/><feMorphology operator="dilate" radius="${(P / 2).toFixed(2)}"/></filter></defs>`;
    svg.innerHTML = pix ? pix + '<g filter="url(#pxf)">' + draw(ex, place(ex, poseAt(ex, u))) + '</g>' : draw(ex, place(ex, poseAt(ex, u)));
  }

  // A ctl pont a csípőhöz relatív: place() eltolja, ezért itt korrigálunk
  const _place = place;

  function animate(svg, ex, opts = {}) {
    let raf = 0, start = performance.now(), stopped = false;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = (ex.dur || 2.4) * 1000 * (opts.slow ? 1.6 : 1);
    if (reduce) { render(svg, ex, 0.5); return () => {}; }
    const tick = now => {
      if (stopped) return;
      render(svg, ex, ((((now - start) % dur) + dur) % dur) / dur);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }

  return { render, animate, place: _place, poseAt, bounds, setup };
})();

