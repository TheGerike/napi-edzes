/* 3D „neon edző”: Three.js-szel, perspektivikus nézetből mutatja a gyakorlatokat.
   A 2D csontváz (FIG.place) oldalnézeti ízületpontjaiból épít 3D testet:
   x = előre, y = fel, z = oldalra (közeli oldal +z, a kamera felé). 1 egység = 1 cm. */
(() => {
  'use strict';
  if (typeof THREE === 'undefined') return;
  const S = 0.01;                        // cm → m
  const HIP_Z = 0.095, SHO_Z = 0.185;    // csípő- és vállszélesség fele
  const Y = new THREE.Vector3(0, 1, 0), Zax = new THREE.Vector3(0, 0, 1);
  let renderer = null, scene, camera, rig, failed = false, lastEx = null, camT = new THREE.Vector3(), camDist = 3;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpD = new THREE.Vector3();

  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V = (p, z = 0) => new THREE.Vector3(p[0] * S, -p[1] * S, z);

  function mats() {
    const std = (c, r = .55, m = .25) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const glow = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    return {
      suit: std(0x463c78, .45, .35), suitDark: std(0x2c2650, .5, .3), panel: std(0x6a5ab0, .35, .55),
      skin: std(0xc08468, .7, 0), shave: std(0x3a2e40, .8, 0), beard: std(0x2a2030, .9, 0),
      boot: std(0x121018, .45, .4), glove: std(0x15121f, .5, .3), iron: std(0x2e3440, .35, .85), ironHi: std(0x8a97a6, .3, .9),
      gold: std(0xffc21a, .3, .9), box: std(0x2a1f4a, .7, .1),
      cyan: glow(0x00e5ff), pink: glow(0xff2e88), white: glow(0xe9feff)
    };
  }

  // Egy „csont”: kúpos henger, két végpont közé feszítve (a forgatás a z tengely körül történik,
  // így a lokális z mindig a világ z marad → a szélesség és a mélység külön skálázható).
  function bone(r1, r2, mat, seg = 14) {
    const g = new THREE.CylinderGeometry(r2, r1, 1, seg, 1);
    const m = new THREE.Mesh(g, mat); m.castShadow = true;
    const grp = new THREE.Group(); grp.add(m); grp.userData.mesh = m;
    return grp;
  }
  function place(grp, a, b) {
    tmpD.subVectors(b, a); const len = tmpD.length() || 1e-4;
    grp.position.copy(a).addScaledVector(tmpD, .5);
    grp.quaternion.setFromUnitVectors(Y, tmpD.normalize());
    grp.userData.mesh.scale.y = len;
    if (grp.userData.strip) { grp.userData.strip.scale.y = len * .78; }
  }
  function ball(r, mat) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat); m.castShadow = true; return m; }
  // világító csík a csont külső oldalán
  function addStrip(grp, r, mat, side) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(.011, 1, .011), mat);
    st.position.z = side * r * .98; grp.add(st); grp.userData.strip = st;
  }

  function build() {
    const M = mats(), R = new THREE.Group();
    const parts = {};
    const limb = (name, r1, r2, mat, strip) => { const b = bone(r1, r2, mat); if (strip) addStrip(b, Math.max(r1, r2), strip.m, strip.side); R.add(b); parts[name] = b; return b; };
    ['n', 'f'].forEach(k => {
      const side = k === 'n' ? 1 : -1;
      limb('th' + k, .085, .065, M.suit);
      limb('sh' + k, .062, .048, M.suit, { m: M.cyan, side });
      limb('bt' + k, .055, .055, M.boot);
      limb('ua' + k, .058, .05, M.suit, { m: M.cyan, side });
      limb('fa' + k, .05, .042, M.suitDark, { m: M.pink, side });
      parts['knee' + k] = ball(.07, M.panel); R.add(parts['knee' + k]);
      parts['kneeL' + k] = ball(.02, M.pink); R.add(parts['kneeL' + k]);
      parts['elb' + k] = ball(.052, M.panel); R.add(parts['elb' + k]);
      parts['hand' + k] = ball(.05, M.glove); R.add(parts['hand' + k]);
      const foot = new THREE.Group();
      const fm = new THREE.Mesh(new THREE.BoxGeometry(.24, .075, .1), M.boot); fm.castShadow = true; fm.position.y = 0;
      const sole = new THREE.Mesh(new THREE.BoxGeometry(.25, .012, .105), M.cyan); sole.position.y = -.04;
      foot.add(fm, sole); R.add(foot); parts['foot' + k] = foot;
      parts['sho' + k] = ball(.075, M.panel); R.add(parts['sho' + k]);
    });
    // törzs: két kúpos szakasz (has, mellkas), laposra skálázva; váll- és csípőhíd
    limb('waist', .135, .125, M.suit); parts.waist.userData.mesh.scale.set(.78, 1, 1.12);
    limb('chest', .125, .165, M.suit); parts.chest.userData.mesh.scale.set(.82, 1, 1.18);
    const chestStrip = new THREE.Mesh(new THREE.BoxGeometry(.012, .5, .012), M.pink); chestStrip.position.set(.13, .05, .05); parts.chest.add(chestStrip);
    const chestStrip2 = chestStrip.clone(); chestStrip2.position.z = -.05; parts.chest.add(chestStrip2);
    const core = new THREE.Mesh(new THREE.CircleGeometry(.03, 20), M.cyan); core.position.set(.137, .12, 0); core.rotation.y = Math.PI / 2; parts.chest.add(core);
    parts.shoBar = bone(.065, .065, M.suit); R.add(parts.shoBar);
    parts.hipBar = bone(.1, .1, M.suitDark); R.add(parts.hipBar);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(.125, .022, 8, 28), M.suitDark); belt.scale.set(.82, 1.12, 1);
    const beltGlow = new THREE.Mesh(new THREE.TorusGeometry(.128, .006, 6, 28), M.pink); beltGlow.scale.set(.82, 1.12, 1);
    parts.belt = new THREE.Group(); parts.belt.add(belt, beltGlow); R.add(parts.belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(.02, .035, .05), M.gold); buckle.position.set(.104, 0, 0); parts.belt.add(buckle);
    parts.neck = bone(.045, .045, M.skin); R.add(parts.neck);
    parts.collar = bone(.07, .06, M.suitDark); R.add(parts.collar);
    // fej: bőr, borotvált tetőrész, szakáll, vizor, neon taraj
    const head = new THREE.Group();
    const skull = ball(.105, M.skin);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.108, 20, 10, 0, Math.PI * 2, 0, Math.PI * .45), M.shave); cap.rotation.z = .35;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(.075, .05, .15), M.beard); jaw.position.set(.055, -.07, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.03, .032, .19), M.cyan); visor.position.set(.088, .02, 0);
    const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(.036, .044, .215), M.suitDark); visorFrame.position.set(.08, .02, 0);
    head.add(skull, cap, jaw, visorFrame, visor);
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(.024, .085 - i * .006, 6), i % 2 ? M.pink : new THREE.MeshBasicMaterial({ color: 0xff6fb0, toneMapped: false }));
      const a = .9 - i * .32; sp.position.set(Math.cos(a) * .1 - .01, Math.sin(a) * .1 + .015, 0);
      sp.rotation.z = a - Math.PI / 2 + .25; head.add(sp);
    }
    const implant = new THREE.Mesh(new THREE.BoxGeometry(.03, .012, .01), M.ironHi); implant.position.set(-.01, .03, .104); head.add(implant);
    R.add(head); parts.head = head;
    // eszközök
    const kb = new THREE.Group();
    const bell = ball(.1, M.iron); bell.position.y = -.14;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.06, .016, 8, 18, Math.PI), M.iron); handle.position.y = -.06;
    handle.rotation.y = Math.PI / 2;
    kb.add(bell, handle); kb.visible = false; R.add(kb); parts.kb = kb;
    const mkDb = () => {
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .22, 8), M.ironHi); bar.rotation.x = Math.PI / 2;
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .035, 16), M.iron); p1.rotation.x = Math.PI / 2; p1.position.z = .085;
      const p2 = p1.clone(); p2.position.z = -.085;
      [bar, p1, p2].forEach(m => { m.castShadow = true; }); g.add(bar, p1, p2); g.visible = false; R.add(g); return g;
    };
    parts.dbn = mkDb(); parts.dbf = mkDb();
    parts.box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .4), M.box); parts.box.visible = false; parts.box.castShadow = true; parts.box.receiveShadow = true; R.add(parts.box);
    R.userData.parts = parts;
    return R;
  }

  function groundTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    rg.addColorStop(0, 'rgba(40,24,80,0.95)'); rg.addColorStop(.6, 'rgba(20,12,40,0.6)'); rg.addColorStop(1, 'rgba(10,6,20,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 512, 512);
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i <= 16; i++) {
      const p = i * 32;
      g.strokeStyle = i % 4 === 0 ? 'rgba(255,46,136,0.55)' : 'rgba(0,229,255,0.22)'; g.lineWidth = i % 4 === 0 ? 2 : 1;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 512); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(512, p); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  function init() {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) { failed = true; return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'fig3d';
    renderer.domElement.setAttribute('role', 'img');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 1, .05, 50);
    scene.add(new THREE.HemisphereLight(0xa99cff, 0x22143e, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1.6, 3.2, 2.4); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -1, near: .5, far: 10 });
    key.shadow.bias = -.0005; scene.add(key);
    const rimC = new THREE.PointLight(0x00e5ff, 6, 6, 1.6); rimC.position.set(-1.4, 1.6, -1.2); scene.add(rimC);
    const rimP = new THREE.PointLight(0xff2e88, 6, 6, 1.6); rimP.position.set(1.6, 1.2, -1.4); scene.add(rimP);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: groundTexture(), transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = .001; scene.add(floor);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.ShadowMaterial({ opacity: .55 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .002; shadow.receiveShadow = true; scene.add(shadow);
    rig = build(); scene.add(rig);
    renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); failed = true; }, false);
    return true;
  }

  function attach(el) {
    const host = el.parentNode; if (!host) return false;
    const cv = renderer.domElement;
    if (cv.parentNode !== host) { host.appendChild(cv); }
    if (el.style.display !== 'none') el.style.display = 'none';
    if (el._cv) el._cv.style.display = 'none';
    cv.setAttribute('aria-label', el.getAttribute('aria-label') || 'A gyakorlat 3D ábrája');
    const w = host.clientWidth || 320, h = Math.max(140, host.clientHeight || 240);
    const sz = renderer.getSize(new THREE.Vector2());
    if (Math.abs(sz.x - w) > 1 || Math.abs(sz.y - h) > 1) { renderer.setSize(w, h, true); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    return true;
  }

  function frameCamera(bb) {
    // a mozgás teljes befoglaló dobozára illesztve, így gyakorlaton belül nem ugrál a kép
    const w = bb.w * S, h = bb.h * S;
    camT.set((bb.x + bb.w / 2) * S, -(bb.y + bb.h / 2) * S * 0.9, 0);
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
    camDist = Math.max((h * .44) / Math.tan(vf), (w * .42) / (Math.tan(vf) * camera.aspect)) + .15;
  }

  function draw(el, ex, T, bb) {
    if (failed) return false;
    if (!renderer && !init()) return false;
    if (!attach(el)) return false;
    const P = rig.userData.parts;
    if (lastEx !== ex || P._aspect !== camera.aspect) { frameCamera(bb); lastEx = ex; P._aspect = camera.aspect; }
    // ízületek 3D-ben
    const hip = V(T.hip), neck = V(T.neck), sho = V(T.sho), head = V(T.head);
    const side = { n: 1, f: -1 };
    ['n', 'f'].forEach(k => {
      const zH = side[k] * HIP_Z, zS = side[k] * SHO_Z;
      const H = V(T.hip, zH), K = V(T['k' + k], zH), A = V(T['a' + k], zH), Tt = V(T['t' + k], zH);
      const Sh = V(T.sho, zS), E = V(T['e' + k], zS), W = V(T['w' + k], zS);
      place(P['th' + k], H, K); place(P['sh' + k], K, A);
      tmpA.subVectors(A, K).normalize(); tmpB.copy(A).addScaledVector(tmpA, -.13);
      place(P['bt' + k], tmpB, A);
      place(P['ua' + k], Sh, E); place(P['fa' + k], E, W);
      P['knee' + k].position.copy(K); P['kneeL' + k].position.copy(K).add(new THREE.Vector3(0, 0, side[k] * .07));
      P['elb' + k].position.copy(E); P['sho' + k].position.copy(Sh);
      tmpA.subVectors(W, E).normalize(); P['hand' + k].position.copy(W).addScaledVector(tmpA, .03);
      // lábfej: a boka és a lábujj közé, a talp a földön
      const f = P['foot' + k]; tmpD.subVectors(Tt, A); const fl = tmpD.length();
      f.position.copy(A).addScaledVector(tmpD, .55);
      f.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tmpD.normalize());
      f.scale.x = Math.max(.6, (fl + .08) / .24);
    });
    // törzs a gerincív mentén (két szakasz)
    const ctl = V(T.ctl); const mid = new THREE.Vector3().copy(hip).multiplyScalar(.25).addScaledVector(ctl, .5).addScaledVector(neck, .25);
    place(P.waist, hip, mid); place(P.chest, mid, sho);
    place(P.shoBar, V(T.sho, -SHO_Z), V(T.sho, SHO_Z)); place(P.hipBar, V(T.hip, -HIP_Z), V(T.hip, HIP_Z));
    P.shoBar.userData.mesh.scale.x = P.hipBar.userData.mesh.scale.x = 1;
    tmpD.subVectors(mid, hip).normalize(); P.belt.position.copy(hip).addScaledVector(tmpD, .03); P.belt.quaternion.setFromUnitVectors(Zax, tmpD);
    // a torust z körül el kell fordítani, hogy a gyűrű síkja merőleges legyen a törzsre
    P.belt.quaternion.setFromUnitVectors(Y, tmpD).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    place(P.neck, sho, head.clone().lerp(neck, .55));
    tmpA.subVectors(neck, sho).normalize(); tmpB.copy(sho).addScaledVector(tmpA, .07); place(P.collar, sho, tmpB);
    // fej: a nyak→fej irányba „felfelé”, arccal előre
    tmpD.subVectors(head, neck).normalize(); P.head.position.copy(head).addScaledVector(tmpD, .02);
    P.head.quaternion.setFromUnitVectors(Y, tmpD);
    // eszközök
    P.kb.visible = P.dbn.visible = P.dbf.visible = false;
    (T.props || []).forEach(pp => {
      if (pp.k === 'kb') { const ref = ex.prop && ex.prop.kb === 'both' ? 0 : (pp.far ? -SHO_Z : SHO_Z); P.kb.visible = true; P.kb.position.copy(V(pp.at, ref)); }
      else { const g = pp.far ? P.dbf : P.dbn; g.visible = true; g.position.copy(V(pp.at, (pp.far ? -1 : 1) * SHO_Z)); }
    });
    if (ex.box) { P.box.visible = true; const bw = ex._boxW * S, bh = (0 - ex._boxTop) * S; P.box.scale.set(bw, bh, 1); P.box.position.set((ex._boxX + ex._boxW / 2) * S, bh / 2, -HIP_Z); }
    else P.box.visible = false;
    // kamera: háromnegyedes nézet, lassú „lebegő” mozgással
    const t = reduce ? 0 : performance.now() / 1000;
    const az = THREE.MathUtils.degToRad(34 + Math.sin(t * .35) * 7), el2 = THREE.MathUtils.degToRad(13 + Math.sin(t * .23) * 2);
    camera.position.set(camT.x + Math.sin(az) * Math.cos(el2) * camDist, camT.y + Math.sin(el2) * camDist, camT.z + Math.cos(az) * Math.cos(el2) * camDist);
    camera.lookAt(camT);
    renderer.render(scene, camera);
    return true;
  }

  // WebGL-támogatás előzetes ellenőrzése (enélkül marad a pixeles figura)
  let okCache = null;
  function ok() {
    if (failed) return false;
    if (okCache !== null) return okCache;
    try { const c = document.createElement('canvas'); okCache = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { okCache = false; }
    if (document.documentElement.dataset.fig === 'sprite') okCache = false;
    return okCache;
  }
  window.FIG3D = { ok, draw };
})();
