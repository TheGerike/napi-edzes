/* 3D edző: profi, csontvázas Mixamo-modell (Xbot), kiberandroiddá stilizálva.
   A gyakorlatok 2D oldalnézeti ízületpontjaiból (FIG.place) irányokat számolunk,
   és azokra forgatjuk a modell csontjait (retargeting). Perspektivikus, háromnegyedes nézet. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const S = 0.01;                                    // 2D egység (cm) → m
const Yv = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer = null, scene, camera, model = null, bones = {}, rest = new Map(), loading = false, failed = false;
let props = {}, lastEx = null, camT = new THREE.Vector3(), camDist = 3, modelScale = 1, legLen = 1;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();
const V = (p, z = 0) => new THREE.Vector3(p[0] * S, -p[1] * S, z);
const MODEL_URL = (document.currentScript && document.currentScript.dataset.model) || 'models/xbot.glb';

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

/* ---------- modell betöltése és stilizálása ---------- */
function loadModel() {
  if (loading || model) return; loading = true;
  new GLTFLoader().load(MODEL_URL, g => {
    model = g.scene;
    const armor = new THREE.MeshStandardMaterial({ color: 0x7c7aa6, roughness: .22, metalness: .92 });
    const joints = new THREE.MeshStandardMaterial({ color: 0x15121f, emissive: 0x00c8e0, emissiveIntensity: .12, roughness: .4, metalness: .5 });
    model.traverse(o => {
      if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
      if (o.isMesh) {
        o.castShadow = true; o.frustumCulled = false;
        o.material = /joint/i.test(o.material.name || '') ? joints : armor;
      }
    });
    Object.values(bones).forEach(b => rest.set(b, b.quaternion.clone()));
    // a modell +Z felé néz → forgassuk +X (a 2D „előre”) felé; a jobb oldala így +Z (a kamera felé)
    model.rotation.y = Math.PI / 2;
    scene.add(model); model.updateMatrixWorld(true);
    // méretezés: a modell lábhossza = a 2D csontváz lábhossza (92 cm)
    const p = n => bones[n].getWorldPosition(new THREE.Vector3());
    const raw = p('RightUpLeg').distanceTo(p('RightLeg')) + p('RightLeg').distanceTo(p('RightFoot'));
    modelScale = .92 / raw; model.scale.setScalar(modelScale); model.updateMatrixWorld(true);
    legLen = .92;
    // vizor: neon csík a fej elején (a Head csonthoz kötve)
    const head = bones.Head;
    if (head) {
      model.updateMatrixWorld(true);
      const ws = head.getWorldScale(new THREE.Vector3()).x, k = 1 / ws;
      const glow = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
      const vis = new THREE.Mesh(new THREE.BoxGeometry(.185, .034, .075), glow(0x00e5ff));
      vis.scale.setScalar(k); vis.position.set(0, .075 * k, .075 * k); head.add(vis);
    }
    loading = false;
  }, undefined, () => { loading = false; failed = true; });
}

/* ---------- csontforgatás (retargeting) ---------- */
// a csont világ-irányát (csont → gyerek csont) a célirányba forgatja; opcionálisan előbb lefelé (T-póz → lógó kar)
function aim(boneName, childName, dir, viaDown) {
  const b = bones[boneName], c = bones[childName]; if (!b || !c || !dir) return;
  b.updateWorldMatrix(true, false); c.updateWorldMatrix(false, false);
  const bp = b.getWorldPosition(v1), cp = c.getWorldPosition(v2);
  const cur = v3.subVectors(cp, bp).normalize();
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
  aim('Hips', 'Spine', dirOf(B(0), B(.25)));
  aim('Spine', 'Spine1', dirOf(B(.2), B(.5)));
  aim('Spine1', 'Spine2', dirOf(B(.45), B(.75)));
  aim('Spine2', 'Neck', dirOf(B(.7), B(1)));
  aim('Neck', 'Head', dirOf(T.neck, T.head));
  aim('Head', 'HeadTop_End', dirOf(T.neck, T.head));
  // lábak: közeli (2D 'n') = jobb oldal, távoli = bal
  [['Right', 'n'], ['Left', 'f']].forEach(([s, k]) => {
    aim(s + 'UpLeg', s + 'Leg', dirOf(T.hip, T['k' + k]));
    aim(s + 'Leg', s + 'Foot', dirOf(T['k' + k], T['a' + k]));
    aim(s + 'Foot', s + 'ToeBase', dirOf(T['a' + k], T['t' + k]));
    aim(s + 'Arm', s + 'ForeArm', dirOf(T.sho, T['e' + k]), true);
    aim(s + 'ForeArm', s + 'Hand', dirOf(T['e' + k], T['w' + k]));
  });
  model.updateMatrixWorld(true);
  // talajra ejtés: a legalacsonyabb pont (testvastagsággal) érintse a padlót
  const pad = { Hips: .12, Spine: .12, Spine1: .12, Spine2: .13, Head: .12, HeadTop_End: .02, Neck: .07,
    RightLeg: .06, LeftLeg: .06, RightFoot: .045, LeftFoot: .045, RightToeBase: .03, LeftToeBase: .03, RightToe_End: .02, LeftToe_End: .02,
    RightHand: .04, LeftHand: .04, RightForeArm: .045, LeftForeArm: .045, RightUpLeg: .09, LeftUpLeg: .09, RightArm: .06, LeftArm: .06 };
  let minY = 1e9;
  Object.entries(pad).forEach(([n, p]) => { const b = bones[n]; if (b) minY = Math.min(minY, b.getWorldPosition(v1).y - p); });
  // vízszintes horgony: a 2D-ben rögzített ízület maradjon a helyén
  const anch = T.__anch || 'an', map = { an: 'RightFoot', af: 'LeftFoot', hip: 'Hips', kn: 'RightLeg', kf: 'LeftLeg', wn: 'RightHand', wf: 'LeftHand' };
  const ab = bones[map[anch] || 'RightFoot'];
  const ax = ab ? ab.getWorldPosition(v1).x : 0, tx = (T[anch] ? T[anch][0] : T.an[0]) * S;
  model.position.set(tx - ax, -minY, 0); model.updateMatrixWorld(true);
}

function placeProps(ex) {
  props.kb.visible = props.dbR.visible = props.dbL.visible = false;
  const pr = ex.prop; if (!pr) return;
  const hand = n => bones[n].getWorldPosition(new THREE.Vector3());
  if (pr.kb) {
    const p = pr.kb === 'both' ? hand('RightHand').add(hand('LeftHand')).multiplyScalar(.5) : hand(pr.kb === 'n' ? 'RightHand' : 'LeftHand');
    props.kb.position.copy(p).add(new THREE.Vector3(0, -.02, 0)); props.kb.visible = true;
  }
  if (pr.db) {
    if (pr.db === 'both' || pr.db === 'n') { props.dbR.position.copy(hand('RightHand')); props.dbR.visible = true; }
    if (pr.db === 'both' || pr.db === 'f') { props.dbL.position.copy(hand('LeftHand')); props.dbL.visible = true; }
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
window.FIG3D = { ok, draw, ready: () => !!model };
