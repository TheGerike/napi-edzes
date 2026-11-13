/* 3D edző: profi, csontvázas Mixamo-modell (Xbot), kiberandroiddá stilizálva.
   A gyakorlatok 2D oldalnézeti ízületpontjaiból (FIG.place) irányokat számolunk,
   és azokra forgatjuk a modell csontjait (retargeting). Perspektivikus, háromnegyedes nézet. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const S = 0.01;                                    // 2D egység (cm) → m
const Yv = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer = null, scene, camera, model = null, bones = {}, rest = new Map(), loading = false, failed = false;
let props = {}, lastEx = null, lastPose = null, camT = new THREE.Vector3(), camDist = 3, modelScale = 1, legLen = 1;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();
const V = (p, z = 0) => new THREE.Vector3(p[0] * S, -p[1] * S, z);

/* ---------- jelenet ---------- */
function groundTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(256, 256, 20, 256, 256, 256);
  rg.addColorStop(0, 'rgba(40,24,80,0.95)'); rg.addColorStop(.6, 'rgba(20,12,40,0.55)'); rg.addColorStop(1, 'rgba(10,6,20,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 512, 512);
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i <= 16; i++) {
    const p = i * 32;
    g.strokeStyle = i % 4 === 0 ? 'rgba(255,46,136,0.6)' : 'rgba(0,229,255,0.22)'; g.lineWidth = i % 4 === 0 ? 2 : 1;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 512); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(512, p); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function initScene() {
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch (e) { failed = true; return false; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'fig3d';
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); failed = true; }, false);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, .05, 50);
  scene.add(new THREE.HemisphereLight(0x9d90ff, 0x1a0f30, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(1.8, 3.4, 2.6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -1, near: .5, far: 10 });
  key.shadow.bias = -.0004; key.shadow.normalBias = .02; scene.add(key);
  const rimC = new THREE.PointLight(0x00e5ff, 9, 7, 1.5); rimC.position.set(-1.5, 1.7, -1.3); scene.add(rimC);
  const rimP = new THREE.PointLight(0xff2e88, 9, 7, 1.5); rimP.position.set(1.7, 1.3, -1.5); scene.add(rimP);
  const fill = new THREE.PointLight(0x7a6cff, 3, 6, 1.5); fill.position.set(.5, .6, 2.4); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: groundTexture(), transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = .001; scene.add(floor);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.ShadowMaterial({ opacity: .6 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = .002; sh.receiveShadow = true; scene.add(sh);
  buildProps();
  loadModel();
  return true;
}

function buildProps() {
  const iron = new THREE.MeshStandardMaterial({ color: 0x2b313c, roughness: .35, metalness: .85 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa6b4, roughness: .25, metalness: .95 });
  const kb = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.SphereGeometry(.1, 28, 20), iron); bell.position.y = -.13; bell.castShadow = true;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.058, .015, 10, 24, Math.PI), iron); handle.position.y = -.07; handle.rotation.y = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.1, .004, 6, 32), new THREE.MeshBasicMaterial({ color: 0xff2e88, toneMapped: false }));
  ring.position.y = -.13; ring.rotation.x = Math.PI / 2;
  kb.add(bell, handle, ring); kb.visible = false; scene.add(kb); props.kb = kb;
  const mkDb = () => {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .2, 10), steel); bar.rotation.x = Math.PI / 2;
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, .035, 20), iron); p1.rotation.x = Math.PI / 2; p1.position.z = .075;
    const p2 = p1.clone(); p2.position.z = -.075;
    [bar, p1, p2].forEach(m => { m.castShadow = true; }); g.add(bar, p1, p2); g.visible = false; scene.add(g); return g;
  };
  props.dbR = mkDb(); props.dbL = mkDb();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .45), new THREE.MeshStandardMaterial({ color: 0x2a1f4a, roughness: .6, metalness: .2 }));
  box.castShadow = box.receiveShadow = true; box.visible = false; scene.add(box); props.box = box;
}

/* ---------- karakterek ---------- */
// Választható karakterek. A csontnevek normalizálva (kisbetű, sorszám-végződés és mixamorig: előtag nélkül).
const SIDE = (r, l) => ({ R: r, L: l });
const RIGS = {
  mixamo: { Hips: 'hips', Spine: 'spine', Spine1: 'spine1', Spine2: 'spine2', Neck: 'neck', Head: 'head', HeadEnd: 'headtop_end',
    UpLeg: SIDE('rightupleg', 'leftupleg'), Leg: SIDE('rightleg', 'leftleg'), Foot: SIDE('rightfoot', 'leftfoot'), Toe: SIDE('righttoebase', 'lefttoebase'), ToeEnd: SIDE('righttoe_end', 'lefttoe_end'),
    Arm: SIDE('rightarm', 'leftarm'), Fore: SIDE('rightforearm', 'leftforearm'), Hand: SIDE('righthand', 'lefthand') },
  cc: { Hips: 'cc_base_hip', Spine: 'cc_base_waist', Spine1: 'cc_base_spine01', Spine2: 'cc_base_spine02', Neck: 'cc_base_necktwist01', Head: 'cc_base_head',
    UpLeg: SIDE('cc_base_r_thigh', 'cc_base_l_thigh'), Leg: SIDE('cc_base_r_calf', 'cc_base_l_calf'), Foot: SIDE('cc_base_r_foot', 'cc_base_l_foot'), Toe: SIDE('cc_base_r_toebase', 'cc_base_l_toebase'),
    Arm: SIDE('cc_base_r_upperarm', 'cc_base_l_upperarm'), Fore: SIDE('cc_base_r_forearm', 'cc_base_l_forearm'), Hand: SIDE('cc_base_r_hand', 'cc_base_l_hand') },
  simple: { Hips: 'hips', Spine: 'spine1', Spine1: 'spine2', Spine2: 'spine3', Neck: 'neck', Head: 'head',
    UpLeg: SIDE('r_leg', 'l_leg'), Leg: SIDE('r_knee', 'l_knee'), Foot: SIDE('r_foot', 'l_foot'), Toe: SIDE('r_toes', 'l_toes'),
    Arm: SIDE('r_arm', 'l_arm'), Fore: SIDE('r_forearm', 'l_forearm'), Hand: SIDE('r_hand', 'l_hand') }
};
const CHARS = {
  neon: { file: 'models/neon.glb', rig: 'cc' },
  ronin: { file: 'models/ronin.glb', rig: 'simple' },
  katana: { file: 'models/katana.glb', rig: 'mixamo', back: /katana/i },
  shade: { file: 'models/shade.glb', rig: 'mixamo' }
};
const MODEL_DIR = (() => { const u = document.currentScript && document.currentScript.dataset.model; return u ? u.replace(/[^/]*$/, '') : 'models/'; })();
let charId = 'neon', holder = null, loadSeq = 0;
const norm = n => n.toLowerCase().replace(/^mixamorig:?/, '').replace(/_\d+$/, '').replace(/[\s_]+/g, '_');

function stylizeAndroid(root) {
  const armor = new THREE.MeshStandardMaterial({ color: 0x7c7aa6, roughness: .22, metalness: .92 });
  const joints = new THREE.MeshStandardMaterial({ color: 0x15121f, emissive: 0x00c8e0, emissiveIntensity: .12, roughness: .4, metalness: .5 });
  root.traverse(o => { if (o.isMesh) o.material = /joint/i.test(o.material.name || '') ? joints : armor; });
  const head = bones.Head;
  if (head) {
    const k = 1 / head.getWorldScale(new THREE.Vector3()).x;
    const vis = new THREE.Mesh(new THREE.BoxGeometry(.185, .034, .075), new THREE.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false }));
    vis.scale.setScalar(k); vis.position.set(0, .075 * k, .075 * k); head.add(vis);
  }
}
function tuneMaterials(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(m => {
      if (m.transparent && m.map) { m.transparent = false; m.alphaTest = .4; m.depthWrite = true; }  // haj: nincs rendezési villogás
      if (m.envMapIntensity !== undefined) m.envMapIntensity = 1;
    });
  });
}

// a kézben lógó kardot a hátára tesszük (átlósan, szamurájosan), a felsőtest csontjához kötve
function swordOnBack(sc, re) {
  let node = null; sc.traverse(o => { if (!node && re.test(o.name || '')) node = o; });
  const sp = bones.Spine2 || bones.Spine1; if (!node || !sp) return;
  const meshes = []; node.traverse(o => { if (o.isMesh) meshes.push(o); });
  meshes.forEach(m => {
    m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox, sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    const ax = sz.x >= sz.y && sz.x >= sz.z ? new THREE.Vector3(1, 0, 0) : sz.y >= sz.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const len = Math.max(sz.x, sz.y, sz.z), k = .95 / len;
    const D = new THREE.Vector3(-.12, .8, .58).normalize();                     // bal csípőtől a jobb váll fölé (a markolat látszik)
    const q = new THREE.Quaternion().setFromUnitVectors(ax, D);
    const P = sp.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(-.2, -.02, 0));  // a hát mögött
    m.parent.remove(m); scene.add(m);
    m.scale.setScalar(k); m.quaternion.copy(q); m.position.copy(P).sub(c.clone().multiplyScalar(k).applyQuaternion(q));
    m.updateMatrixWorld(true); sp.attach(m);
    const ms = Array.isArray(m.material) ? m.material : [m.material];
    ms.forEach(mt => { if (mt.emissive) { mt.emissive.set(0xff2040); mt.emissiveIntensity = 2.2; mt.toneMapped = false; } });
  });
}

function setupModel(gltf, cfg, seq) {
  if (seq !== loadSeq) return;
  const sc = gltf.scene;
  holder = new THREE.Group(); holder.add(sc);
  bones = {}; rest = new Map();
  const R = RIGS[cfg.rig], byName = {};
  sc.traverse(o => { if (o.isBone || o.type === 'Object3D' || o.isObject3D) { const k = norm(o.name || ''); if (k && !byName[k]) byName[k] = o; } if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  Object.entries(R).forEach(([k, v]) => {
    if (typeof v === 'string') { if (byName[v]) bones[k] = byName[v]; }
    else { if (byName[v.R]) bones['R' + k] = byName[v.R]; if (byName[v.L]) bones['L' + k] = byName[v.L]; }
  });
  sc.traverse(o => { if (o.isBone) rest.set(o, o.quaternion.clone()); });
  Object.values(bones).forEach(b => rest.set(b, b.quaternion.clone()));
  scene.add(holder); holder.updateMatrixWorld(true);
  const p = k => bones[k].getWorldPosition(new THREE.Vector3());
  // forgatás: a modell jobb oldala nézzen a kamera felé (+Z), arca előre (+X)
  const r = p('RUpLeg').sub(p('LUpLeg')); r.y = 0; r.normalize();
  holder.rotation.y = Math.atan2(-r.x, r.z); holder.updateMatrixWorld(true);
  // méretezés: lábhossz = 92 cm
  const raw = p('RUpLeg').distanceTo(p('RLeg')) + p('RLeg').distanceTo(p('RFoot'));
  holder.scale.setScalar(.92 / raw); holder.updateMatrixWorld(true);
  if (cfg.style === 'android') stylizeAndroid(sc); else tuneMaterials(sc);
  if (cfg.back) swordOnBack(sc, cfg.back);
  model = holder; loading = false; lastPose = null;
}

function disposeModel() {
  if (!holder) return;
  scene.remove(holder);
  holder.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { Object.values(m).forEach(v => { if (v && v.isTexture) v.dispose(); }); m.dispose(); });
  });
  holder = null; model = null;
}

function loadModel() {
  const cfg = CHARS[charId] || CHARS.neon, seq = ++loadSeq;
  loading = true; failed = false;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const onErr = () => { if (seq !== loadSeq) return; loading = false; if (charId !== 'neon') { charId = 'neon'; loadModel(); } else failed = true; };
  const parseB64 = b64 => { try { const bin = atob(b64), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    loader.parse(buf.buffer, '', g => setupModel(g, cfg, seq), onErr); } catch (e) { onErr(); } };
  const emb = window.MODELS_B64;
  if (emb) {   // beágyazott modellek (artifact): js/model-<id>.js tölti be
    if (emb[charId]) return parseB64(emb[charId]);
    const s = document.createElement('script'); s.src = 'js/model-' + charId + '.js';
    s.onload = () => emb[charId] ? parseB64(emb[charId]) : onErr(); s.onerror = onErr; document.head.appendChild(s);
    return;
  }
  loader.load(MODEL_DIR + cfg.file.replace(/^models\//, ''), g => setupModel(g, cfg, seq), undefined, onErr);
}

function setChar(id) {
  if (!CHARS[id]) id = 'neon';
  if (id === charId && (model || loading)) return;
  charId = id;
  if (!renderer) return;           // a jelenet még nem jött létre: az első rajzoláskor töltődik
  disposeModel(); loadModel();
}

/* ---------- csontforgatás (retargeting) ---------- */
// a csont világ-irányát (csont → gyerek csont) a célirányba forgatja; opcionálisan előbb lefelé (T-póz → lógó kar)
function aim(boneName, childName, dir, viaDown) {
  const b = bones[boneName], c = bones[childName]; if (!b || !c || !dir) return;
  b.updateWorldMatrix(true, false); c.updateWorldMatrix(false, false);
  const bp = b.getWorldPosition(v1), cp = c.getWorldPosition(v2);
  const cur = v3.subVectors(cp, bp); if (cur.lengthSq() < 1e-10) return; cur.normalize();
  if (viaDown) { q1.setFromUnitVectors(cur, DOWN); q2.setFromUnitVectors(DOWN, dir); q1.premultiply(q2); }
  else q1.setFromUnitVectors(cur, dir);
  b.getWorldQuaternion(q2);
  q3.copy(q1).multiply(q2);                                      // új világ-forgatás
  b.parent.getWorldQuaternion(q2).invert();
  b.quaternion.copy(q2.multiply(q3));
  b.updateWorldMatrix(false, true);
}
const dirOf = (a, b) => new THREE.Vector3((b[0] - a[0]) * S, -(b[1] - a[1]) * S, 0).normalize();

function pose(T) {
  rest.forEach((q, b) => b.quaternion.copy(q));
  model.position.set(0, 0, 0); model.updateMatrixWorld(true);
  // törzs a gerincív mentén (alsó, középső, felső szakasz)
  const B = t => { const a = (1 - t) * (1 - t), b2 = 2 * (1 - t) * t, c = t * t;
    return [a * T.hip[0] + b2 * T.ctl[0] + c * T.neck[0], a * T.hip[1] + b2 * T.ctl[1] + c * T.neck[1]]; };
  aim('Hips', 'Spine1', dirOf(B(0), B(.3)));
  aim('Spine', 'Spine1', dirOf(B(.15), B(.45)));
  aim('Spine1', 'Spine2', dirOf(B(.4), B(.72)));
  aim('Spine2', 'Neck', dirOf(B(.68), B(1)));
  // fej: a nyugalmi tartást megőrizzük, csak a törzshöz képesti 2D eltérést forgatjuk rá (különben felszegi az állát)
  const ang = (a, b) => Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
  let dh = ang(T.neck, T.head) - ang(B(.68), B(1)); dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  if (bones.Neck && Math.abs(dh) > 1e-3) {
    const b = bones.Neck; q1.setFromAxisAngle(new THREE.Vector3(0, 0, 1), dh);
    b.getWorldQuaternion(q2); q3.copy(q1).multiply(q2); b.parent.getWorldQuaternion(q2).invert(); b.quaternion.copy(q2.multiply(q3)); b.updateWorldMatrix(false, true);
  }
  // lábak, karok: közeli (2D 'n') = jobb oldal, távoli = bal
  [['R', 'n'], ['L', 'f']].forEach(([s, k]) => {
    aim(s + 'UpLeg', s + 'Leg', dirOf(T.hip, T['k' + k]));
    aim(s + 'Leg', s + 'Foot', dirOf(T['k' + k], T['a' + k]));
    aim(s + 'Foot', s + 'Toe', dirOf(T['a' + k], T['t' + k]));
    aim(s + 'Arm', s + 'Fore', dirOf(T.sho, T['e' + k]), true);
    aim(s + 'Fore', s + 'Hand', dirOf(T['e' + k], T['w' + k]));
  });
  model.updateMatrixWorld(true);
  // talajra ejtés: a legalacsonyabb pont (testvastagsággal) érintse a padlót
  const pad = { Hips: .12, Spine: .12, Spine1: .12, Spine2: .13, Head: .12, HeadEnd: .02, Neck: .07,
    RLeg: .06, LLeg: .06, RFoot: .045, LFoot: .045, RToe: .03, LToe: .03, RToeEnd: .02, LToeEnd: .02,
    RHand: .04, LHand: .04, RFore: .045, LFore: .045, RUpLeg: .09, LUpLeg: .09, RArm: .06, LArm: .06 };
  let minY = 1e9;
  Object.entries(pad).forEach(([n, p]) => { const b = bones[n]; if (b) minY = Math.min(minY, b.getWorldPosition(v1).y - p); });
  if (!bones.HeadEnd && bones.Head) {   // fejtető becslése: nyak→fej irányban
    const h = bones.Head.getWorldPosition(new THREE.Vector3()), n = bones.Neck.getWorldPosition(v2);
    minY = Math.min(minY, h.clone().add(h.clone().sub(n).normalize().multiplyScalar(.2)).y - .02);
  }
  // vízszintes horgony: a 2D-ben rögzített ízület maradjon a helyén
  const anch = T.__anch || 'an', map = { an: 'RFoot', af: 'LFoot', hip: 'Hips', kn: 'RLeg', kf: 'LLeg', wn: 'RHand', wf: 'LHand' };
  const ab = bones[map[anch] || 'RFoot'];
  const ax = ab ? ab.getWorldPosition(v1).x : 0, tx = (T[anch] ? T[anch][0] : T.an[0]) * S;
  model.position.set(tx - ax, -minY, 0); model.updateMatrixWorld(true);
}

function placeProps(ex) {
  props.kb.visible = props.dbR.visible = props.dbL.visible = false;
  const pr = ex.prop; if (!pr) return;
  const hand = n => bones[n].getWorldPosition(new THREE.Vector3());
  if (pr.kb) {
    const p = pr.kb === 'both' ? hand('RHand').add(hand('LHand')).multiplyScalar(.5) : hand(pr.kb === 'n' ? 'RHand' : 'LHand');
    props.kb.position.copy(p).add(new THREE.Vector3(0, -.02, 0)); props.kb.visible = true;
  }
  if (pr.db) {
    if (pr.db === 'both' || pr.db === 'n') { props.dbR.position.copy(hand('RHand')); props.dbR.visible = true; }
    if (pr.db === 'both' || pr.db === 'f') { props.dbL.position.copy(hand('LHand')); props.dbL.visible = true; }
  }
}

/* ---------- kamera és rajzolás ---------- */
function attach(el) {
  const host = el.parentNode; if (!host) return false;
  const cv = renderer.domElement;
  if (cv.parentNode !== host) host.appendChild(cv);
  if (el.style.display !== 'none') el.style.display = 'none';
  if (el._cv) el._cv.style.display = 'none';
  cv.setAttribute('aria-label', el.getAttribute('aria-label') || 'A gyakorlat 3D ábrája');
  const w = host.clientWidth || 320, h = Math.max(140, host.clientHeight || 240);
  const sz = renderer.getSize(new THREE.Vector2());
  if (Math.abs(sz.x - w) > 1 || Math.abs(sz.y - h) > 1) { renderer.setSize(w, h, true); camera.aspect = w / h; camera.updateProjectionMatrix(); lastEx = null; }
  return true;
}
function frameCamera(bb) {
  const w = bb.w * S, h = bb.h * S;
  camT.set((bb.x + bb.w / 2) * S, -(bb.y + bb.h / 2) * S * .9, 0);
  const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
  camDist = Math.max((h * .44) / Math.tan(vf), (w * .42) / (Math.tan(vf) * camera.aspect)) + .2;
}

function draw(el, ex, T, bb) {
  if (failed) return false;
  if (!renderer && !initScene()) return false;
  if (!attach(el)) return false;
  if (lastEx !== ex) { frameCamera(bb); lastEx = ex; }
  if (model) {
    T.__anch = ex.anch || 'an';
    pose(T); placeProps(ex);
    if (ex.box) { const bw = ex._boxW * S, bh = (0 - ex._boxTop) * S; props.box.scale.set(bw, bh, 1); props.box.position.set((ex._boxX + ex._boxW / 2) * S, bh / 2, -.1); props.box.visible = true; }
    else props.box.visible = false;
  }
  const t = reduce ? 0 : performance.now() / 1000;
  const az = THREE.MathUtils.degToRad(36 + Math.sin(t * .35) * 7), el2 = THREE.MathUtils.degToRad(12 + Math.sin(t * .23) * 2);
  camera.position.set(camT.x + Math.sin(az) * Math.cos(el2) * camDist, camT.y + Math.sin(el2) * camDist, camT.z + Math.cos(az) * Math.cos(el2) * camDist);
  camera.lookAt(camT);
  renderer.render(scene, camera);
  return true;
}

let okCache = null;
function ok() {
  if (failed) return false;
  if (okCache !== null) return okCache;
  try { const c = document.createElement('canvas'); okCache = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { okCache = false; }
  if (document.documentElement.dataset.fig === 'sprite') okCache = false;
  return okCache;
}
window.FIG3D = { ok, draw, setChar, char: () => charId, ready: () => !!model };
