/* Figura-renderer („neon ronin” karakter). Szögkonvenció: 0 = lefelé, 90 = előre (jobbra), 180 = fel, -90 = hátra.
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
      let nxt = F[(i + 1) % F.length];
      // forgó mozgás (pl. karkörzés): az utolsó→első szakaszon +360°-kal folytatjuk, hogy ne forduljon vissza
      if (ex.spin && i === F.length - 1) nxt = Object.assign({}, nxt, { a: nxt.a.map(([x, y]) => [x + 360, y + 360]) });
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
    x0 -= 26; x1 += 26; y0 -= 32;  // hely a sisaktaréjnak, kardmarkolatnak, páncélnak
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


  // ===== „Neon ronin” karakter: térfogatos végtagok, árnyékolt páncél, sisak, katana, lobogó szalagok =====
  const F = n => n.toFixed(1);
  const mul = (p, k) => [p[0] * k, p[1] * k];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const norm = p => { const l = Math.hypot(p[0], p[1]) || 1; return [p[0] / l, p[1] / l]; };
  const perp = p => [-p[1], p[0]];
  const pts = a => a.map(p => F(p[0]) + ',' + F(p[1])).join(' ');
  const poly = (a, cls) => `<polygon class="${cls}" points="${pts(a)}"/>`;
  const circ = (p, r, cls) => `<circle class="${cls}" cx="${F(p[0])}" cy="${F(p[1])}" r="${r}"/>`;
  const ln = (p, q, cls) => `<line class="${cls}" x1="${F(p[0])}" y1="${F(p[1])}" x2="${F(q[0])}" y2="${F(q[1])}"/>`;
  const pl = (a, cls) => `<polyline class="${cls}" points="${pts(a)}"/>`;
  const LIGHT = norm([-0.45, -1]);                 // fény balról-felülről
  let clock = 0;

  // kúpos „kapszula” végtag: két végén eltérő szélesség, kerek ízületekkel, felül fénycsíkkal
  function capsule(p, q, w1, w2, base, hi) {
    const dir = norm(sub(q, p)), nn = perp(dir);
    const quad = [add(p, mul(nn, w1 / 2)), add(q, mul(nn, w2 / 2)), add(q, mul(nn, -w2 / 2)), add(p, mul(nn, -w1 / 2))];
    let o = poly(quad, base) + circ(p, w1 / 2, base) + circ(q, w2 / 2, base);
    if (hi) {
      const side = (nn[0] * LIGHT[0] + nn[1] * LIGHT[1]) >= 0 ? 1 : -1;
      const a1 = add(p, mul(nn, side * w1 * 0.18)), b1 = add(q, mul(nn, side * w2 * 0.18));
      o += poly([add(a1, mul(nn, side * w1 * 0.22)), add(b1, mul(nn, side * w2 * 0.22)), add(b1, mul(nn, -side * w2 * 0.06)), add(a1, mul(nn, -side * w1 * 0.06))], hi);
    }
    return o;
  }

  function draw(ex, T, ghost) {
    let s = '';
    const bb = ex._bb;
    clock = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
    // talaj + árnyék
    if (!ghost) s += `<line class="fg-ground" x1="${bb.x}" y1="${GROUND + 1.5}" x2="${bb.x + bb.w}" y2="${GROUND + 1.5}"/>`;
    const cx = (T.an[0] + T.af[0] + T.hip[0]) / 3, lift = Math.max(0, -Math.max(T.an[1], T.af[1]));
    if (!ghost) s += `<ellipse class="r-shadow" cx="${F(cx)}" cy="${GROUND}" rx="${F(Math.max(18, 30 - lift * .2))}" ry="3.5"/>`;
    if (ex.box && !ghost) s += `<rect class="fg-box" x="${ex._boxX}" y="${ex._boxTop}" width="${ex._boxW}" height="${GROUND - ex._boxTop}" rx="2"/>`;

    const d = norm(sub(T.neck, T.hip)), back = [d[1], -d[0]], front = mul(back, -1);
    const up = norm(sub(T.head, T.neck));
    let fc = perp(up); if (fc[0] * front[0] + fc[1] * front[1] < 0) fc = mul(fc, -1);   // arc iránya
    const props = T.props;
    const drawProp = pp => {
      const [x, y] = pp.at;
      if (pp.k === 'kb') return `<g class="fg-kb"><path d="M${x - 7},${y + 9} C${x - 8},${y - 3} ${x + 8},${y - 3} ${x + 7},${y + 9}" fill="none"/><circle cx="${x}" cy="${y + 14}" r="10"/><circle class="kb-hi" cx="${x - 3.5}" cy="${y + 10.5}" r="3"/></g>`;
      return `<g class="fg-db${pp.far ? ' far' : ''}"><rect x="${x - 9}" y="${y - 2.5}" width="18" height="5"/><rect class="plate" x="${x - 9}" y="${y - 7}" width="5" height="14"/><rect class="plate" x="${x + 4}" y="${y - 7}" width="5" height="14"/></g>`;
    };

    const boot = (k, far) => {
      const a = T['a' + k], t = T['t' + k], dir = norm(sub(t, a)), nn = perp(dir);
      const toe = add(t, mul(dir, 3)), heel = add(a, mul(dir, -4));
      return poly([add(heel, mul(nn, 4)), add(toe, mul(nn, 2.5)), add(toe, mul(nn, -3.5)), add(heel, mul(nn, -4.5))], far ? 'r-boot far' : 'r-boot') +
        (far ? '' : ln(add(heel, mul(nn, -4.5)), add(toe, mul(nn, -3.5)), 'r-sole'));
    };
    const leg = (k, far) => {
      const H = T.hip, K = T['k' + k], A = T['a' + k];
      const b = far ? 'r-armor far' : 'r-armor', h = far ? null : 'r-hi';
      let o = capsule(H, K, 19, 13, b, h) + capsule(K, A, 13, 9.5, b, h) + boot(k, far);
      // neon szegély a sípcsonton, térdvédő
      const kd = norm(sub(A, K));
      o += ln(add(K, mul(kd, 8)), add(A, mul(kd, -6)), far ? 'r-trim far' : 'r-trim');
      if (!far) o += circ(K, 5.2, 'r-pad') + circ(K, 2, 'r-led');
      return o;
    };
    const arm = (k, far) => {
      const S = T.sho, E = T['e' + k], W = T['w' + k];
      const b = far ? 'r-armor far' : 'r-armor', h = far ? null : 'r-hi';
      let o = capsule(S, E, 13.5, 10.5, b, h) + capsule(E, W, 10.5, 9, b, h);
      const wd = norm(sub(W, E));
      o += ln(add(E, mul(wd, 5)), add(W, mul(wd, -3)), far ? 'r-trim far' : 'r-trim');   // alkarvért fénycsík
      o += circ(add(W, mul(wd, 3)), far ? 4.5 : 5.2, far ? 'r-glove far' : 'r-glove');
      if (!far) o += circ(E, 2, 'r-led');
      return o;
    };

    // --- távoli oldal ---
    s += leg('f', true) + arm('f', true);
    props.filter(p => p.far).forEach(p => { s += drawProp(p); });

    // --- övről lógó szalag (gravitáció + lebegés) ---
    const sashA = add(T.hip, mul(back, 9));
    const sash = [sashA];
    for (let i = 1; i <= 4; i++) {
      const prev = sash[i - 1], sw = Math.sin(clock * 3.2 + i * 0.9) * 1.6 * i / 4;
      sash.push(add(prev, [mul(back, 2.2)[0] + sw, 5.2 + mul(back, 2.2)[1] * 0.3]));
    }
    s += pl(sash, 'r-sash');

    // --- katana a háton ---
    const sa = add(add(T.hip, mul(back, 15)), mul(d, -12)), sb = add(add(T.sho, mul(back, 15)), mul(d, 12));
    const hilt = add(sb, mul(d, 18));
    s += ln(sa, sb, 'r-scab') + ln(add(sa, mul(front, 2.2)), add(sb, mul(front, 2.2)), 'r-scab-edge');
    s += ln(sb, hilt, 'r-hilt');
    for (let i = 1; i <= 3; i++) s += ln(add(add(sb, mul(d, i * 4.5)), mul(back, 2.8)), add(add(sb, mul(d, i * 4.5 + 2)), mul(back, -2.8)), 'r-wrap');
    s += ln(add(sb, mul(back, 6)), add(sb, mul(back, -6)), 'r-guard');

    // --- törzs: alakos páncél a gerincív mentén ---
    const B = t => { const a = (1 - t) * (1 - t), b2 = 2 * (1 - t) * t, c = t * t;
      return [a * T.hip[0] + b2 * T.ctl[0] + c * T.neck[0], a * T.hip[1] + b2 * T.ctl[1] + c * T.neck[1]]; };
    const BT = t => norm([2 * (1 - t) * (T.ctl[0] - T.hip[0]) + 2 * t * (T.neck[0] - T.ctl[0]), 2 * (1 - t) * (T.ctl[1] - T.hip[1]) + 2 * t * (T.neck[1] - T.ctl[1])]);
    const prof = [[0, 13, 13], [.3, 11.5, 11], [.55, 14.5, 12], [.8, 17.5, 14], [.93, 15, 13], [1, 7, 7]];
    const fr = [], bk = [];
    prof.forEach(([t, wf, wb]) => { const c = B(t), tg = BT(t), bn = [tg[1], -tg[0]];
      fr.push(add(c, mul(bn, -wf))); bk.push(add(c, mul(bn, wb))); });
    s += poly(fr.concat(bk.reverse()), 'r-torso');
    // mellvért (felső, elülső rész), fénycsík a gerinc mentén
    const chest = [.5, .62, .78, .9].map((t, i) => { const c = B(t), tg = BT(t), bn = [tg[1], -tg[0]]; return [add(c, mul(bn, -[12, 13.5, 15, 13][i] + 1.5)), add(c, mul(bn, 2))]; });
    s += poly(chest.map(p => p[0]).concat(chest.map(p => p[1]).reverse()), 'r-plate');
    s += pl([.55, .8, .92].map((t, i) => { const c = B(t), tg = BT(t), bn = [tg[1], -tg[0]]; return add(c, mul(bn, [-13.5, -16.5, -14][i])); }), 'r-edge');
    // reaktor-mag a mellkason
    { const c = B(.72), tg = BT(.72), bn = [tg[1], -tg[0]], core = add(c, mul(bn, -6));
      s += circ(core, 4.2, 'r-core-ring') + circ(core, 2.2 + Math.sin(clock * 4) * .4, 'r-core'); }
    // öv (obi)
    { const c = B(.08), tg = BT(.08), bn = [tg[1], -tg[0]];
      s += poly([add(add(c, mul(bn, -14)), mul(tg, 4.5)), add(add(c, mul(bn, 14)), mul(tg, 4.5)), add(add(c, mul(bn, 14)), mul(tg, -4)), add(add(c, mul(bn, -14)), mul(tg, -4))], 'r-belt');
      s += circ(add(c, mul(bn, -6)), 2.4, 'r-buckle'); }

    // --- fej: sisak, maszk, vizor, nyakvédő, taréj, lobogó fejpánt ---
    const Hc = T.head, R = 12;
    const bw = mul(fc, -1);
    // nyakvédő lemezek (shikoro)
    s += poly([add(Hc, add(mul(bw, 6), mul(up, 2))), add(Hc, add(mul(bw, 15), mul(up, -6))), add(Hc, add(mul(bw, 12), mul(up, -11))), add(Hc, add(mul(bw, 2), mul(up, -9)))], 'r-shikoro');
    // fejpánt szalagok
    for (let j = 0; j < 2; j++) {
      const base = add(Hc, add(mul(bw, 11), mul(up, 3 - j * 3)));
      const tail = [base];
      for (let i = 1; i <= 4; i++) {
        const pv = tail[i - 1], wv = Math.sin(clock * 5 + i * 1.1 + j * 1.7) * 1.8;
        tail.push(add(pv, [mul(bw, 4.5)[0] + perp(bw)[0] * wv, mul(bw, 4.5)[1] + 1.6 + perp(bw)[1] * wv]));
      }
      s += pl(tail, j ? 'r-band thin' : 'r-band');
    }
    s += circ(Hc, R, 'r-helm');
    // sisak felső fénye
    s += `<path class="r-helm-hi" d="M${F(Hc[0] + LIGHT[0] * 3 - 6)},${F(Hc[1] + LIGHT[1] * 6)} a9,9 0 0 1 ${F(9)},${F(-5)}"/>`;
    // arcmaszk (elöl-lent) és vizor
    s += poly([add(Hc, add(mul(fc, 3), mul(up, 2))), add(Hc, add(mul(fc, 13.5), mul(up, 2))), add(Hc, add(mul(fc, 11), mul(up, -8))), add(Hc, add(mul(fc, 2), mul(up, -11)))], 'r-mask');
    s += poly([add(Hc, add(mul(fc, 3), mul(up, 2.2))), add(Hc, add(mul(fc, 14), mul(up, 2.2))), add(Hc, add(mul(fc, 13.5), mul(up, -1.4))), add(Hc, add(mul(fc, 3), mul(up, -1.4)))], 'r-visor');
    // taréj (maedate) + ékkő
    const fh = add(Hc, add(mul(up, 10), mul(fc, 3)));
    s += pl([add(fh, add(mul(up, 9), mul(fc, 11))), fh, add(fh, add(mul(up, 9), mul(fc, -7)))], 'r-crest');
    s += circ(fh, 2.6, 'r-jewel');

    // --- közeli oldal ---
    s += leg('n', false);
    s += arm('n', false);
    // vállvért (sode) a váll körül, a felkar irányába dőlve
    { const ad = norm(sub(T.en, T.sho)), an = perp(ad), c = add(T.sho, mul(ad, 4));
      s += poly([add(c, add(mul(an, 10), mul(ad, -7))), add(c, add(mul(an, 11), mul(ad, 9))), add(c, add(mul(an, -11), mul(ad, 9))), add(c, add(mul(an, -10), mul(ad, -7)))], 'r-sode');
      s += ln(add(c, add(mul(an, 11), mul(ad, 9))), add(c, add(mul(an, -11), mul(ad, 9))), 'r-sode-edge'); }
    props.filter(p => !p.far).forEach(p => { s += drawProp(p); });
    return s;
  }

  function setup(ex) {
    prepBox(ex);
    if (!ex._bb) ex._bb = bounds(ex);
    return ex._bb;
  }

  // ================= PIXEL ART SPRITE: „utcai kiberharcos” =================
  // Kis felbontású vásznon rajzol (1 px = 1 sprite-pixel), majd palettára kvantál,
  // sötét kontúrt húz, és a CSS kockásan nagyítja fel (image-rendering: pixelated).
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const dim = (h, f) => { const [r, g, b] = hex(h); return '#' + [r, g, b].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join(''); };
  const C = {
    skin: ['#8E5844', '#C08468', '#E2A98C'],
    jacket: ['#17132A', '#2E2849', '#544A80'],
    pants: ['#141224', '#27233D', '#47416A'],
    boot: ['#0B0A12', '#1F1C2C', '#403C55'],
    glove: ['#08070C', '#17151F', '#33303F'],
    hair: ['#8A1550', '#FF2E88', '#FF9CC8'], shaved: '#3A2E40',
    seam: '#00E5FF', hot: '#FF2E88', visor: '#00E5FF', visorHi: '#E9FEFF', gold: '#FFC21A',
    beard: '#2C2230', implant: '#8A97A6',
    iron: ['#1C2028', '#323946', '#6B7686'], ground: '#3B2770', shadow: '#05020C', box: '#2A1F4A'
  };
  const FAR = 0.62;
  const farOf = a => Array.isArray(a) ? a.map(h => dim(h, FAR)) : dim(a, FAR);
  const OUTLINE = '#0E0A16';
  const PALETTE = (() => {
    const out = new Set([OUTLINE]);
    const addc = v => { if (Array.isArray(v)) v.forEach(addc); else out.add(v); };
    Object.values(C).forEach(v => { addc(v); addc(farOf(v)); });
    return [...out].map(hex);
  })();
  const SK = 0.36;                                   // sprite-pixel / egység
  const LV = norm2([-0.5, -0.85]);
  function norm2(p) { const l = Math.hypot(p[0], p[1]) || 1; return [p[0] / l, p[1] / l]; }

  function spriteRender(cv, ex, u) {
    const bb = setup(ex);
    const W = Math.ceil(bb.w * SK), H = Math.ceil(bb.h * SK);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, W, H);
    const T = place(ex, poseAt(ex, u));
    const X = p => [(p[0] - bb.x) * SK, (p[1] - bb.y) * SK];
    const S = v => v * SK;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const stroke = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); };
    const fillPoly = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); };
    const disc = (p, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], r, 0, Math.PI * 2); c.fill(); };
    const px = (p, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(Math.round(p[0] - w / 2), Math.round(p[1] - h / 2), w, h); };
    // 3 tónusú „henger”: árnyék, alap a fény felé tolva, keskeny csúcsfény
    const limb = (a, b, w, col) => {
      const A = X(a), B = X(b), dir = norm2([B[0] - A[0], B[1] - A[1]]), nn = [-dir[1], dir[0]];
      const sd = (nn[0] * LV[0] + nn[1] * LV[1]) >= 0 ? 1 : -1, o = (k) => [nn[0] * sd * k, nn[1] * sd * k];
      stroke([A, B], w, col[0]);
      const o1 = o(w * 0.14); stroke([[A[0] + o1[0], A[1] + o1[1]], [B[0] + o1[0], B[1] + o1[1]]], w * 0.62, col[1]);
      const o2 = o(w * 0.3); stroke([[A[0] + o2[0], A[1] + o2[1]], [B[0] + o2[0], B[1] + o2[1]]], Math.max(1, w * 0.2), col[2]);
    };
    const sub2 = (p, q) => [p[0] - q[0], p[1] - q[1]], add2 = (p, q) => [p[0] + q[0], p[1] + q[1]], mul2 = (p, k) => [p[0] * k, p[1] * k];
    const d = norm2(sub2(T.neck, T.hip)), back = [d[1], -d[0]], front = mul2(back, -1);
    const up = norm2(sub2(T.head, T.neck));
    let fc = [-up[1], up[0]]; if (fc[0] * front[0] + fc[1] * front[1] < 0) fc = mul2(fc, -1);

    const leg = (k, far) => {
      const P = far ? farOf(C.pants) : C.pants, Bt = far ? farOf(C.boot) : C.boot;
      const Hp = T.hip, K = T['k' + k], A = T['a' + k], Tt = T['t' + k];
      limb(Hp, K, S(19), P); limb(K, A, S(15), P);
      const sd = norm2(sub2(A, K)), fd = norm2(sub2(Tt, A)), fn = [-fd[1], fd[0]];
      limb(add2(A, mul2(sd, -12)), A, S(16), Bt);                 // magas szárú bakancs
      limb(add2(A, mul2(fd, -3)), add2(Tt, mul2(fd, 3)), S(12), Bt);
      // neon talp: a lábfej alsó éle
      const s1 = add2(add2(A, mul2(fd, -4)), mul2(fn, fn[1] > 0 ? 6 : -6)), s2 = add2(add2(Tt, mul2(fd, 4)), mul2(fn, fn[1] > 0 ? 6 : -6));
      stroke([X(s1), X(s2)], 1, far ? farOf(C.seam) : C.seam);
      // fénylő térdcsík + combszíj
      const kn = X(add2(K, mul2(sd, 4))), kd = [-sd[1] * 1, sd[0]];
      stroke([[kn[0] - kd[0] * 2.5, kn[1] - kd[1] * 2.5], [kn[0] + kd[0] * 2.5, kn[1] + kd[1] * 2.5]], 1, far ? farOf(C.hot) : C.hot);
      if (!far) { const th = X(add2(Hp, mul2(norm2(sub2(K, Hp)), 26))); px(th, C.gold, 2, 1); }
    };
    const arm = (k, far) => {
      const J = far ? farOf(C.jacket) : C.jacket, G = far ? farOf(C.glove) : C.glove;
      const Sh = T.sho, E = T['e' + k], Wr = T['w' + k];
      limb(Sh, E, S(17), J); limb(E, Wr, S(14), J);
      const ud = norm2(sub2(E, Sh)), wd = norm2(sub2(Wr, E));
      // fénylő varrat a felkaron, áramköri minta az alkaron
      stroke([X(add2(Sh, mul2(ud, 6))), X(add2(E, mul2(ud, -3)))], 1, far ? farOf(C.seam) : C.seam);
      if (!far) {
        const a1 = X(add2(E, mul2(wd, 6))), a2 = X(add2(E, mul2(wd, 20)));
        px(a1, C.seam); px(a2, C.seam); px([(a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2], C.hot);
      }
      limb(add2(Wr, mul2(wd, -2)), add2(Wr, mul2(wd, 4)), S(12.5), G);   // kesztyű
    };
    const prop = pp => {
      const [x, y] = X(pp.at), iron = pp.far ? farOf(C.iron) : C.iron;
      if (pp.k === 'kb') {
        c.strokeStyle = iron[1]; c.lineWidth = S(4.5); c.beginPath(); c.arc(x, y + S(6), S(7), Math.PI * 1.05, Math.PI * 1.95); c.stroke();
        disc([x, y + S(14)], S(10), iron[0]); disc([x - S(1.2), y + S(13)], S(8), iron[1]); px([x - S(4), y + S(10)], iron[2], 2, 2);
      } else {
        c.fillStyle = iron[0]; c.fillRect(x - S(9), y - S(2.5), S(18), S(5));
        c.fillStyle = iron[1]; c.fillRect(x - S(10), y - S(7), S(5), S(14)); c.fillRect(x + S(5), y - S(7), S(5), S(14));
        px([x - S(8), y - S(5)], iron[2]); px([x + S(7), y - S(5)], iron[2]);
      }
    };
    // távoli végtagok
    leg('f', true); arm('f', true);
    T.props.filter(p => p.far).forEach(prop);
    // törzs: atléta (a gerincív mentén)
    const Bz = t => { const a = (1 - t) * (1 - t), b2 = 2 * (1 - t) * t, cc = t * t;
      return [a * T.hip[0] + b2 * T.ctl[0] + cc * T.neck[0], a * T.hip[1] + b2 * T.ctl[1] + cc * T.neck[1]]; };
    const BT = t => norm2([2 * (1 - t) * (T.ctl[0] - T.hip[0]) + 2 * t * (T.neck[0] - T.ctl[0]), 2 * (1 - t) * (T.ctl[1] - T.hip[1]) + 2 * t * (T.neck[1] - T.ctl[1])]);
    const prof = [[0, 13, 13], [.3, 12, 11.5], [.55, 14.5, 12.5], [.78, 16.5, 14], [.9, 15, 13]];
    const fr = [], bk = [];
    prof.forEach(([t, wf, wb]) => { const p = Bz(t), tg = BT(t), bn = [tg[1], -tg[0]]; fr.push(X(add2(p, mul2(bn, -wf)))); bk.push(X(add2(p, mul2(bn, wb)))); });
    // nyak (bőr), dzseki-törzs, magas gallér
    limb(Bz(.84), T.neck, S(11), C.skin);
    limb(add2(T.sho, mul2(d, -3)), add2(T.sho, mul2(d, 2)), S(19), C.jacket);       // vállak
    fillPoly(fr.concat([...bk].reverse()), C.jacket[1]);
    const awayFront = (back[0] * LV[0] + back[1] * LV[1]) > 0;
    stroke(awayFront ? fr : bk, Math.max(1.5, S(5)), C.jacket[0]);
    stroke(awayFront ? bk.slice(1) : fr.slice(1), 1, C.jacket[2]);
    // nyitott dzseki: neon belső felső a mellkas elején + cipzár-varrat
    { const pts2 = [.38, .55, .72, .86].map(t => { const p = Bz(t), tg = BT(t), bn = [tg[1], -tg[0]]; return X(add2(p, mul2(bn, -[11, 12.5, 14, 13][[.38, .55, .72, .86].indexOf(t)] + 1))); });
      stroke(pts2, Math.max(1.5, S(5)), C.hot); stroke(pts2.map(p => [p[0] + 0, p[1]]), 1, '#FF9CC8'); }
    stroke([.1, .3, .5, .7, .88].map(t => { const p = Bz(t), tg = BT(t), bn = [tg[1], -tg[0]]; return X(add2(p, mul2(bn, 4))); }), 1, C.seam);
    { const p = Bz(.97), tg = BT(.97), bn = [tg[1], -tg[0]];                           // magas gallér
      stroke([X(add2(p, mul2(bn, 10))), X(add2(add2(p, mul2(bn, 8)), mul2(tg, 9)))], S(9), C.jacket[1]);
      stroke([X(add2(add2(p, mul2(bn, 12)), mul2(tg, 2))), X(add2(add2(p, mul2(bn, 10)), mul2(tg, 11)))], 1, C.seam); }
    // öv csattal
    { const p = Bz(.06), tg = BT(.06), bn = [tg[1], -tg[0]];
      stroke([X(add2(p, mul2(bn, -13.5))), X(add2(p, mul2(bn, 13.5)))], S(6), '#0B0912');
      px(X(add2(p, mul2(bn, -9))), C.gold, 2, 2); }
    // fej: kopasz, borosta, kiberszem, halánték-implantátum
    const Hc = X(add2(T.head, mul2(up, 1.5))), R = S(15.5);
    const fcX = fc, upX = up;
    disc(Hc, R, C.skin[0]);
    disc([Hc[0] + LV[0] * 0.9, Hc[1] + LV[1] * 0.9], R - 0.9, C.skin[1]);
    disc([Hc[0] + LV[0] * R * 0.45, Hc[1] + LV[1] * R * 0.45], Math.max(1, R * 0.28), C.skin[2]);
    const at = (f, uu) => [Hc[0] + fcX[0] * f * R + upX[0] * uu * R, Hc[1] + fcX[1] * f * R + upX[1] * uu * R];
    // borotvált oldal (undercut) a fej hátsó-felső részén
    fillPoly([at(-1.02, 0.1), at(-0.9, 0.62), at(-0.35, 0.98), at(0.3, 0.98), at(0.2, 0.55), at(-0.55, 0.15)], C.shaved);
    // neon taraj: három tüske, hátrafelé söpörve
    const sp = [[-0.55, 0.85, -1.15, 1.75], [-0.05, 0.98, -0.55, 2.05], [0.42, 0.9, 0.1, 1.95]];
    sp.forEach(([f0, u0, f1, u1], i) => {
      fillPoly([at(f0 - 0.28, u0 - 0.05), at(f1, u1), at(f0 + 0.3, u0 - 0.05)], C.hair[0]);
      fillPoly([at(f0 - 0.08, u0), at(f1 + 0.08, u1 - 0.25), at(f0 + 0.22, u0)], C.hair[1]);
      px(at(f1 + 0.05, u1 - 0.15), C.hair[2]);
    });
    fillPoly([at(0.15, -0.2), at(1.05, -0.2), at(0.92, -0.75), at(0.45, -1.0), at(0.0, -0.78)], C.beard);  // szakáll
    fillPoly([at(0.78, -0.15), at(1.16, -0.08), at(1.08, -0.38), at(0.8, -0.38)], C.skin[1]);            // száj/orr
    px(at(-0.1, 0.0), C.skin[0], 2, 2);                                                                    // fül
    // világító vizor a szem vonalában + LED-pontok az arcon
    stroke([at(0.3, 0.22), at(1.12, 0.2)], Math.max(2, S(4.5)), C.visor);
    px(at(0.95, 0.24), C.visorHi, 1, 1);
    px(at(0.55, -0.05), C.seam); px(at(0.45, -0.25), C.hot);
    px(at(-0.45, 0.35), C.implant, 2, 1);
    // közeli végtagok
    leg('n', false); arm('n', false);
    T.props.filter(p => !p.far).forEach(prop);

    // --- kvantálás a palettára + kontúr ---
    const img = c.getImageData(0, 0, W, H), D = img.data, N = W * H, solid = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      if (D[o + 3] < 110) { D[o + 3] = 0; continue; }
      let best = 0, bd = 1e9; const r = D[o], g = D[o + 1], b = D[o + 2];
      for (let j = 0; j < PALETTE.length; j++) { const q = PALETTE[j], dd = (q[0] - r) ** 2 + (q[1] - g) ** 2 + (q[2] - b) ** 2; if (dd < bd) { bd = dd; best = j; } }
      const q = PALETTE[best]; D[o] = q[0]; D[o + 1] = q[1]; D[o + 2] = q[2]; D[o + 3] = 255; solid[i] = 1;
    }
    const ol = hex(OUTLINE);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) {
        const o = i * 4; D[o] = ol[0]; D[o + 1] = ol[1]; D[o + 2] = ol[2]; D[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    // háttérelemek a figura MÖGÉ: talaj, árnyék, doboz
    c.globalCompositeOperation = 'destination-over';
    const gy = Math.round((0 - bb.y) * SK);
    const cx = Math.round(((T.an[0] + T.af[0] + T.hip[0]) / 3 - bb.x) * SK);
    c.fillStyle = C.shadow; c.fillRect(cx - 9, gy - 1, 18, 2); c.fillRect(cx - 6, gy + 1, 12, 1);
    if (ex.box) { c.fillStyle = C.box; c.fillRect(Math.round((ex._boxX - bb.x) * SK), Math.round((ex._boxTop - bb.y) * SK), Math.round(ex._boxW * SK), gy - Math.round((ex._boxTop - bb.y) * SK)); }
    c.fillStyle = C.ground; c.fillRect(0, gy, W, 1);
    for (let x = 0; x < W; x += 6) { c.fillStyle = '#FF2E88'; c.fillRect(x, gy + 2, 3, 1); }
    c.globalCompositeOperation = 'source-over';
  }

  function canvasFor(el) {
    if (el.tagName === 'CANVAS') return el;
    if (el._cv && el._cv.isConnected) return el._cv;
    const cv = document.createElement('canvas');
    cv.className = 'sprite';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', el.getAttribute('aria-label') || 'A gyakorlat ábrája');
    el.after(cv); el.style.display = 'none'; el._cv = cv;
    return cv;
  }

  let fidSeq = 0;
  function render(svg, ex, u) {
    if (typeof window !== 'undefined' && window.FIG3D && window.FIG3D.ok()) {
      const bb3 = setup(ex);
      if (window.FIG3D.draw(svg, ex, place(ex, poseAt(ex, u)), bb3, u)) return;
    }
    if (typeof document !== 'undefined' && svg.ownerDocument && document.documentElement.dataset.fig !== 'vector') {
      spriteRender(canvasFor(svg), ex, u); return;
    }
    const bb = setup(ex);
    svg.setAttribute('viewBox', `${bb.x.toFixed(1)} ${bb.y.toFixed(1)} ${bb.w.toFixed(1)} ${bb.h.toFixed(1)}`);
    // 8 bites hatás: SVG-szűrő mintavételez és kockákra nagyít (kb. 64 „pixel” széles kép)
    if (!svg.dataset.fid) svg.dataset.fid = 'pxf' + (++fidSeq);
    const fid = svg.dataset.fid;
    const P = +(bb.w / 104).toFixed(2), x = bb.x.toFixed(1), y = bb.y.toFixed(1);
    const pix = (typeof document !== 'undefined' && document.documentElement.dataset.pixel === 'off') ? '' :
      `<defs><filter id="${fid}" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${bb.w.toFixed(1)}" height="${bb.h.toFixed(1)}">` +
      `<feFlood x="${(+x + P / 2).toFixed(2)}" y="${(+y + P / 2).toFixed(2)}" width="1" height="1" flood-color="#fff"/>` +
      `<feComposite x="${x}" y="${y}" width="${P}" height="${P}"/><feTile result="grid"/>` +
      `<feComposite in="SourceGraphic" in2="grid" operator="in"/><feMorphology operator="dilate" radius="${(P / 2).toFixed(2)}"/></filter></defs>`;
    const fast = (ex.dur || 2.4) <= 1.8 && !(svg.closest && svg.closest('.rest-mode'));
    const body = (fast ? `<g class="r-ghost">${draw(ex, place(ex, poseAt(ex, (u + 0.93) % 1)), true)}</g><g class="r-ghost g2">${draw(ex, place(ex, poseAt(ex, (u + 0.965) % 1)), true)}</g>` : '') +
      draw(ex, place(ex, poseAt(ex, u)));
    svg.innerHTML = pix ? pix + `<g filter="url(#${fid})">` + body + '</g>' : body;
  }

  // A ctl pont a csípőhöz relatív: place() eltolja, ezért itt korrigálunk
  const _place = place;

  function animate(svg, ex, opts = {}) {
    let raf = 0, start = performance.now(), stopped = false;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = (ex.dur || 2.4) * 1000 * (opts.slow ? 1.6 : 1);
    if (reduce) { render(svg, ex, 0.5); return () => {}; }
    let lastStep = -1;
    const tick = now => {
      if (stopped) return;
      const step = (window.FIG3D && window.FIG3D.ok()) ? now : Math.floor(now / 83);   // 3D: minden képkocka; sprite: ~12 kép/mp
      if (step !== lastStep) { lastStep = step; render(svg, ex, ((((now - start) % dur) + dur) % dur) / dur); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }

  return { render, animate, place: _place, poseAt, bounds, setup };
})();

