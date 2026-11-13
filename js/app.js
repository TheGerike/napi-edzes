(() => {
'use strict';
const $ = s => document.querySelector(s);
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fmt = s => { s = Math.max(0, Math.ceil(s - 1e-6)); return Math.floor(s / 60) + ':' + pad(s % 60); };
const minsTxt = s => Math.round(s / 60) + ' perc';
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DOW = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
const RATE = { konnyu: 'Könnyű', jo: 'Pont jó', nehez: 'Nehéz', faj: 'Fájt valami' };

/* ================= ÁLLAPOT ================= */
const APP_VERSION = '2.0.0';
const LS = 'napiEdzes.v1', LS_RUN = 'napiEdzes.run', LS_HIDE_INSTALL = 'napiEdzes.hideInstall';
const defSet = () => ({ beep: true, voice: true, auto: true, wake: true });
const def = () => ({ v: 1, level: 1, levelSince: dayKey(), log: [], set: defSet(), plusPtr: 0, updatedAt: 0 });
const norm = r => Object.assign(def(), r, { set: Object.assign(defSet(), r.set || {}), log: Array.isArray(r.log) ? r.log : [],
  plusPtr: Number.isInteger(r.plusPtr) && r.plusPtr >= 0 ? r.plusPtr : 0 });
let ST = (() => { try { const r = JSON.parse(localStorage.getItem(LS)); if (r && r.v === 1) return norm(r); } catch (e) {} return def(); })();
function save() {
  ST.updatedAt = Date.now();
  try { localStorage.setItem(LS, JSON.stringify(ST)); } catch (e) {}
}

/* ================= SZÁMÍTÁSOK ================= */
const nextType = () => {
  for (let i = ST.log.length - 1; i >= 0; i--) { const t = ST.log[i].type; if (BASE[t]) return t === 'A' ? 'B' : 'A'; }
  return 'A';
};
const lastPain = () => { const l = ST.log[ST.log.length - 1]; return !!(l && l.r === 'faj'); };
const recPlus = () => lastPain() ? 'mob' : PLUS_CYCLE[ST.plusPtr % PLUS_CYCLE.length];
const plusMins = (type, level, plus) => totalSec(buildSteps(type, level, plus)) - totalSec(buildSteps(type, level, null));
const logLabel = e => e.type === 'P' ? 'Csak plusz: ' + (PLUS[e.plus] ? PLUS[e.plus].short : 'blokk')
  : (BASE[e.type] ? BASE[e.type].short : 'Korábbi edzés') + (e.plus && PLUS[e.plus] ? ' + ' + PLUS[e.plus].short : '');
const sessLabel = (type, plus) => type === 'P' ? 'Csak plusz: ' + PLUS[plus].short : BASE[type].short + (plus ? ' + ' + PLUS[plus].short : '');
const stepsFor = (type, level, plus) => type === 'P' ? buildPlusOnly(plus, level) : buildSteps(type, level, plus);
const daySet = () => new Set(ST.log.map(e => e.d.slice(0, 10)));
function streak() {
  const ds = daySet(); const d = new Date();
  if (!ds.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0; while (ds.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function weekDays() {
  const ds = daySet(); const d = new Date(); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off);
  return DOW.map((l, i) => { const x = new Date(d); x.setDate(d.getDate() + i); const k = dayKey(x); return { l, done: ds.has(k), today: k === dayKey() }; });
}
function levelProg() {
  const good = ST.log.filter(e => e.lvl === ST.level && BASE[e.type] && !e.part && (e.r === 'konnyu' || e.r === 'jo') && e.d.slice(0, 10) >= ST.levelSince).length;
  const days = Math.max(0, Math.round((new Date(dayKey()) - new Date(ST.levelSince)) / DAY));
  return { good, days, ready: ST.level < 3 && good >= LEVEL_UP.good && days >= LEVEL_UP.days };
}

/* ================= ZENE, ÖSSZECSUKHATÓ KÁRTYÁK ================= */
const DEFAULT_MUSIC = 'https://open.spotify.com/playlist/0kEq8LvNkrX7YANrI60Mcp';
const musicUrl = () => (ST.set.music && /^https:\/\/open\.spotify\.com\//.test(ST.set.music)) ? ST.set.music : DEFAULT_MUSIC;
const LS_FOLD = 'napiEdzes.fold';
let folds = (() => { try { return JSON.parse(localStorage.getItem(LS_FOLD)) || {}; } catch (e) { return {}; } })();
const foldOpen = k => folds[k] ? 'open' : '';

/* ================= KEZDŐLAP ================= */
let pick = null, pickPlus = null;   // pickPlus: null = ajánlott, 'none' = csak alap
function renderHome() {
  const type = pick || nextType(), nt = nextType();
  const rec = recPlus();
  const plus = pickPlus === null ? rec : (pickPlus === 'none' ? null : pickPlus);
  const steps = buildSteps(type, ST.level, plus), tot = totalSec(steps);
  const baseTot = totalSec(buildSteps(type, ST.level, null));
  const S0 = BASE[type], lp = levelProg(), wk = weekDays();
  const doneToday = daySet().has(dayKey());
  const weekCount = wk.filter(w => w.done).length;
  let run = null; try { run = JSON.parse(localStorage.getItem(LS_RUN)); } catch (e) {}
  if (run && (run.pv !== 2 || Date.now() - run.savedAt > 6 * 3600e3 || (run.type === 'P' ? !PLUS[run.plus] : !BASE[run.type]) || (run.plus && !PLUS[run.plus]))) run = null;
  const P = S0.levels[ST.level];
  const now = new Date();
  const dateTxt = now.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' });

  let plan = '', cur = null;
  steps.forEach((s, i) => {
    if (s.kind !== 'work') return;
    if (s.sec !== cur) {
      cur = s.sec;
      let h = esc(s.sec);
      if (s.part === 'base') h = `Alap kör · ${P.rounds} kör · ${P.work} mp munka / ${P.rest} mp pihenő`;
      else if (s.part === 'plus') {
        const Q = plusSpec(plus, ST.level);
        h = `Plusz: ${esc(PLUS[plus].name)}${Q ? ` · ${Q.rounds} kör · ${Q.work} / ${Q.rest} mp` : ''}`;
      }
      plan += `<h3>${h}</h3>`;
    }
    if (s.round > 1) return;
    plan += `<button data-jump="${i}"><span>${esc(EX[s.ex].name)}${s.sided ? ' <span class="muted">(2 oldal)</span>' : ''}${EX[s.ex].kg ? `<br><span class="muted">${esc(EX[s.ex].kg)}</span>` : ''}</span><span class="num">${s.dur} mp</span></button>`;
  });

  const log = ST.log.map((e, i) => [e, i]).slice(-15).reverse().map(([e, i]) => {
    const d = new Date(e.d);
    return `<div><span>${d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })} · ${esc(logLabel(e))}${e.lvl ? ' · ' + e.lvl + '. szint' : ''}${e.part ? ' · részleges' : ''}<br><span class="muted">${minsTxt(e.sec)}${e.r ? ' · ' + RATE[e.r] : ''}</span></span><button class="btn small logdel" data-del="${i}" aria-label="Edzés törlése">Törlés</button></div>`;
  }).join('') || '<p class="muted">Még nincs elvégzett edzés. Az első után itt látod a naplót.</p>';

  const runName = run ? (EX[(stepsFor(run.type, run.level || ST.level, run.plus || null)[run.idx] || {}).ex] || {}).name : '';
  $('#home').innerHTML = `
  <div class="top"><h1>Napi edzés</h1><span class="date">${esc(dateTxt)}</span></div>
  ${showInstallHint() ? `<section class="card install" id="iosHint">
    <h2 style="font-size:22px">Ikon a kezdőképernyőre</h2>
    <p style="margin:0">Telepítsd az alkalmazást: Safariban koppints a Megosztás gombra, majd a „Főképernyőhöz adás” pontra. Így teljes képernyőn, internet nélkül is fut.</p>
    <button class="btn small" id="hideHint" style="justify-self:start">Rendben, elrejtem</button>
  </section>` : ''}
  ${run ? `<div class="notice">Félbehagyott edzés: <b>${esc(sessLabel(run.type, run.plus))}</b>, itt tartottál: ${esc(runName || 'eleje')}.
     <div class="row" style="margin-top:8px"><button class="btn small" id="resume">Folytatás</button><button class="btn small" id="drop">Elvetés</button></div></div>` : ''}
  <section class="card today">
    <div class="eyebrow">${type === nt ? 'Mai alap' : 'Kiválasztott alap'}${doneToday ? ' · ma már edzettél' : ''}</div>
    <h2>${esc(S0.title)}</h2>
    <div class="meta">
      <span class="pill accent num">Alap ~${minsTxt(baseTot)}</span>
      <span class="pill num">${plus ? `+ ${esc(PLUS[plus].short)} ~${minsTxt(tot - baseTot)}` : 'Csak az alap'}</span>
      <span class="pill">${ST.level}. szint · ${LEVELS[ST.level].name}</span>
    </div>
    <button class="btn primary" id="go">Indítás · ~${minsTxt(tot)}</button>
    <a class="btn music-btn" href="${esc(musicUrl())}" target="_blank" rel="noopener">♫ Zene indítása (Spotify)</a>
    <div class="chips two" role="group" aria-label="Alap változat">
      ${BASE_CYCLE.map(k => `<button class="chip${k === nt ? ' next' : ''}" data-pick="${k}" aria-pressed="${k === type}"><b>${k}</b><span>${esc(BASE[k].title.split(' · ')[1])}</span></button>`).join('')}
    </div>
    <p class="muted" style="margin:0">Az alap a kötelező rész: eszköz nélkül, bárhol megy. Az A és a B felváltva jön (a pötty jelöli a következőt).</p>
    <h3 class="subhead">Plusz blokk az alap kör után</h3>
    <div class="chips three" role="group" aria-label="Plusz blokk">
      ${PLUS_ORDER.map(k => `<button class="chip${k === rec ? ' next' : ''}" data-plus="${k}" aria-pressed="${k === plus}"><b>${esc(PLUS[k].short)}</b><span>~${Math.round(plusMins(type, ST.level, k) / 60)} perc</span></button>`).join('')}
      <button class="chip" data-plus="none" aria-pressed="${plus === null}"><b>Nincs</b><span>csak alap</span></button>
    </div>
    <p class="muted" style="margin:0">${plus ? `${esc(PLUS[plus].name)} · ${esc(PLUS[plus].gear)}. ` : ''}${lastPain() && rec === 'mob' ? 'Legutóbb fájt valami, ezért ma a mobilitást ajánlom. ' : 'A pötty az ajánlott blokkot jelöli. '}Az alap kör végén még meggondolhatod.</p>
  </section>

  <section class="card">
    <div class="row"><h2 style="font-size:22px">Csak egy plusz blokk</h2><span class="muted">alap nélkül</span></div>
    <p class="muted" style="margin:0">Önállóan indítható, rövid bemelegítéssel és nyújtással, kb. 9–10 perc. Jó például délután egy második, rövid edzésnek.</p>
    <div class="chips three" role="group" aria-label="Plusz blokk önállóan">
      ${PLUS_ORDER.map(k => `<button class="chip" data-solo="${k}"><b>${esc(PLUS[k].short)}</b><span>~${Math.round(totalSec(buildPlusOnly(k, ST.level)) / 60)} perc</span></button>`).join('')}
    </div>
  </section>

  <section class="card">
    <div class="row"><h2 style="font-size:22px">Ez a hét</h2><span class="muted num">${weekCount}/7 nap</span></div>
    <div class="week">${wk.map(w => `<div><i class="${w.done ? 'done' : ''}${w.today ? ' today' : ''}">${w.done ? '✓' : ''}</i>${w.l}</div>`).join('')}</div>
    <div class="stats">
      <div class="stat"><b class="num">${ST.log.length}</b><span>edzés összesen</span></div>
      <div class="stat"><b class="num">${streak()}</b><span>nap egymás után</span></div>
      <div class="stat"><b class="num">${Math.round(ST.log.reduce((a, e) => a + e.sec, 0) / 60)}</b><span>perc összesen</span></div>
    </div>
  </section>

  <section class="card">
    <div class="row"><h2 style="font-size:22px">${ST.level}. szint · ${LEVELS[ST.level].name}</h2>
      <div class="row" style="gap:6px"><button class="btn small" id="lvDown" ${ST.level <= 1 ? 'disabled' : ''} aria-label="Szint le">−</button><button class="btn small" id="lvUp" ${ST.level >= 3 ? 'disabled' : ''} aria-label="Szint fel">+</button></div></div>
    <p class="muted" style="margin:0">${esc(LEVELS[ST.level].note)}</p>
    ${ST.level < 3 ? `
    <div class="bar" role="progressbar" aria-valuenow="${lp.good}" aria-valuemax="${LEVEL_UP.good}"><div style="width:${Math.min(100, lp.good / LEVEL_UP.good * 100)}%"></div></div>
    <div class="row muted"><span class="num">Jó érzetű alap edzés: ${Math.min(lp.good, LEVEL_UP.good)}/${LEVEL_UP.good}</span><span class="num">Napok a szinten: ${Math.min(lp.days, LEVEL_UP.days)}/${LEVEL_UP.days}</span></div>
    ${lp.ready ? `<div class="notice ok">Megvan a feltétel a következő szinthez. <button class="btn small" id="lvGo" style="margin-top:6px">Szintlépés: ${ST.level + 1}. szint</button></div>` : ''}`
    : '<p class="muted" style="margin:0">Ez a legfelső szint. Innen súlyemeléssel haladunk tovább: szólj, és összerakjuk a következő blokkot.</p>'}
  </section>

<details class="card fold" data-fold="plan" ${foldOpen("plan")}><summary><h2>Az edzés tartalma</h2></summary><div class="foldbody">
    <p class="muted" style="margin:0">Koppints egy gyakorlatra, és onnan indul.</p>
    <div class="plan">${plan}</div>
  </div></details>

<details class="card fold" data-fold="set" ${foldOpen("set")}><summary><h2>Beállítások</h2></summary><div class="foldbody">
    ${[['beep', 'Hangjelzés', 'Sípszó a váltásoknál és az utolsó 3 mp-ben. iPhone-on a némítókapcsoló elnémítja.'],
       ['voice', 'Felolvasás', 'Bemondja a következő gyakorlatot és az oldalcserét.' + (voiceMissing ? ' Ezen az eszközön nincs magyar hang.' : '')],
       ['auto', 'Automatikus továbblépés', 'Ha kikapcsolod, minden gyakorlat végén megáll, és te lépsz tovább.'],
       ['wake', 'Kijelző ébren tartása', 'Edzés közben nem alszik el a telefon.']]
      .map(([k, l, d]) => `<div class="set"><label for="set-${k}">${l}<small>${d}</small></label><input type="checkbox" class="switch" id="set-${k}" data-set="${k}" ${ST.set[k] ? 'checked' : ''}></div>`).join('')}
    <p class="muted" style="margin:0">Az adataid csak ezen a telefonon tárolódnak. Készíts rendszeresen mentést.</p>
    <div class="set music"><label for="musicUrl">Zene: Spotify lejátszási lista<small>A „Zene” gomb ezt nyitja meg a Spotify appban. Bármelyik lista linkjét beillesztheted (Spotify: Megosztás → Link másolása).</small></label></div>
    <div class="row" style="gap:8px;flex-wrap:nowrap"><input id="musicUrl" class="bktext" style="min-height:0;height:44px;resize:none;flex:1" value="${esc(musicUrl())}" inputmode="url" autocomplete="off"><button class="btn small" id="musicSave">Mentés</button></div>
    <p class="muted version" style="margin:0">Verzió: ${APP_VERSION}</p>
  </div></details>

<details class="card fold" id="backup" data-fold="backup" ${foldOpen("backup")}><summary><h2>Mentés és visszaállítás</h2></summary><div class="foldbody">
    <p class="muted" style="margin:0">A mentés tartalmazza a naplót, a szintet és a beállításokat. iPhone-on a fájl a Fájlok appba kerül. Új telefonon innen töltheted vissza.</p>
    <div class="bkbtns">
      <button class="btn small" id="bkExport">Mentés fájlba</button>
      <button class="btn small" id="bkImport">Visszaállítás fájlból</button>
      <button class="btn small" id="bkCopy">Másolás vágólapra</button>
      <button class="btn small" id="bkPaste">Beillesztés szövegből</button>
    </div>
    <input type="file" id="bkFile" class="visually-hidden" accept="application/json,.json" tabindex="-1" aria-hidden="true">
    <div id="bkMsg" aria-live="polite">${bkMsg ? `<div class="notice ${bkMsg.kind}">${esc(bkMsg.text)}</div>` : ''}</div>
  </div></details>

<details class="card fold" data-fold="info" ${foldOpen("info")}><summary><h2>Tudnivalók</h2></summary><div class="foldbody">
    <details><summary>Hogyan működik?</summary>
      <ul>
        <li><b>Az alap a kötelező rész:</b> kb. 16 perc, eszköz nélkül, bárhol (otthon, szállodában, nyaralás alatt is): bemelegítés, alap kör, nyújtás. Az <b>A</b> (guggolás, nyomás, hát) és a <b>B</b> (kitörés, csípő, has) felváltva jön.</li>
        <li>Az alap kör után jöhet egy kb. 5 perces <b>plusz blokk</b>: súlyzós erő, kettlebell kondi, pulzusemelő, has/core vagy derék és mobilitás. Az app ajánl egyet (hetente kb. kétszer erőt), de átírhatod, vagy kihagyhatod. A nyújtás mindig a végén van.</li>
        <li>Heti 6–7 alkalom a cél. Egy nehéz napon is megvan az alap: ez építi a rutint.</li>
        <li>A szintek a gyakorlatokat nehezítik, az alap ideje marad kb. 16 perc. Szintlépés: ${LEVEL_UP.good} „könnyű” vagy „pont jó” értékelésű, teljes alap edzés és legalább ${LEVEL_UP.days / 7} hét az adott szinten. Kézzel is válthatsz.</li>
        <li>Edzés közben bármikor visszaléphetsz, újrakezdheted a gyakorlatot, vagy a Lista gombbal bárhová ugorhatsz.</li>
      </ul></details>
    <details><summary>Súlyválasztás (állítható kézisúlyzó, 20 kg kettlebell)</summary>
      <ul>
        <li>Minden súlyzós gyakorlatnál ott a javasolt kezdősúly. Az első héten inkább a könnyebb végét válaszd, és a technikára figyelj.</li>
        <li>Akkor jó a terhelés, ha a munkaidő végén még kb. 2 tiszta ismétlés maradna benned.</li>
        <li><b>Mikor emelj?</b> Ha két egymás utáni alkalommal 3-nál több ismétlés maradna, tegyél fel 1–2 kg-ot. Ha szétesik a forma, vegyél le.</li>
        <li>A szintek a gyakorlatokat nehezítik, a tárcsák a terhelést. A kettő együtt adja a fejlődést.</li>
      </ul></details>
    <details><summary>Derékkímélés</summary>
      <ul>
        <li>Minden emelésnél előbb feszítsd meg a hasad, mintha ütést várnál, és csípőből hajolj, ne a derekadból.</li>
        <li>A swing csak akkor jön, ha a kettlebell felhúzás már magabiztos (2. szinttől). A pulzusemelő blokkban az ugrós burpee csak 3. szinten van; ha a térd vagy a derék jelez, maradj a lépő változatnál.</li>
        <li>Éles, szúró vagy lábba sugárzó fájdalomnál állj le. Ha egy hétnél tovább tart, vagy zsibbadás is van, menj orvoshoz.</li>
        <li>Ülőmunka mellett 45–60 percenként állj fel 2 percre: csípőhajlító-nyújtás és kobra.</li>
      </ul></details>
    <details><summary>Kardió, séta, fogyás</summary>
      <ul>
        <li><b>Lépés:</b> napi minimum 8 ezer. Ha egy nap ülős (iroda, autó), ebéd vagy vacsora után 15 perc séta.</li>
        <li><b>Tempós séta heti 3×30–45 perc</b>, emelkedővel. Pulzus kb. 120–135, még beszélni tudsz, de énekelni már nem. Ez emeli leginkább a VO2max-ot.</li>
        <li>A napi 16 perces alap és a plusz blokk főleg erőt, mozgékonyságot és szokást épít. A fogyást a séta és az étkezés viszi, fehérjével minden főétkezésnél.</li>
        <li>Apple Watch-on indíts „Funkcionális erőnléti edzés”-t az app mellett, sétánál „Szabadtéri séta”-t.</li>
      </ul></details>
    <details><summary>Mikor legyen könnyebb nap?</summary>
      <ul>
        <li>Ha 2–3 egymás utáni reggel a nyugalmi pulzus 5+ ütéssel a szokásos fölött van, és a HRV is jóval alacsonyabb, csak az alapot csináld a Derék és mobilitás blokkal, és sétálj.</li>
        <li>Egyetlen alacsony HRV-érték önmagában nem jelent semmit, a több napos trend számít.</li>
      </ul></details>
  </div></details>

<details class="card fold" data-fold="log" ${foldOpen("log")}><summary><h2>Napló</h2></summary><div class="foldbody">
    <div class="log">${log}</div>
    <button class="btn small" id="reset" style="justify-self:start">Összes adat törlése</button>
  </div></details>`;

  $('#go').onclick = () => start(type, 0, ST.level, plus);
  document.querySelectorAll('details.fold').forEach(d => d.addEventListener('toggle', () => {
    folds[d.dataset.fold] = d.open; try { localStorage.setItem(LS_FOLD, JSON.stringify(folds)); } catch (e) {}
  }));
  $('#musicSave').onclick = () => {
    const v = $('#musicUrl').value.trim();
    if (v && !/^https:\/\/open\.spotify\.com\//.test(v)) { $('#musicUrl').value = musicUrl(); sheet('<h2>Ez nem Spotify-link</h2><p class="muted">A link így kezdődjön: https://open.spotify.com/ (Spotify appban: Megosztás → Link másolása).</p><div class="btns"><button class="btn primary" id="shNo">Rendben</button></div>', { shNo: closeSheet }); return; }
    ST.set.music = v.replace(/[?#].*$/, ''); save(); renderHome();
  };
  document.querySelectorAll('[data-solo]').forEach(b => b.onclick = () => start('P', 0, ST.level, b.dataset.solo));
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => askDelete(+b.dataset.del));
  document.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { pick = b.dataset.pick === nt ? null : b.dataset.pick; renderHome(); });
  document.querySelectorAll('[data-plus]').forEach(b => b.onclick = () => { const v = b.dataset.plus; pickPlus = v === rec ? null : v; renderHome(); });
  document.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => start(type, +b.dataset.jump, ST.level, plus));
  document.querySelectorAll('[data-set]').forEach(c => c.onchange = () => { ST.set[c.dataset.set] = c.checked; save(); });
  if ($('#resume')) { $('#resume').onclick = () => start(run.type, run.idx, run.level || ST.level, run.plus || null, run.vis); $('#drop').onclick = () => { clearRun(); renderHome(); }; }
  $('#lvDown').onclick = () => askLevel(ST.level - 1);
  $('#lvUp').onclick = () => askLevel(ST.level + 1);
  if ($('#lvGo')) $('#lvGo').onclick = () => askLevel(ST.level + 1);
  $('#reset').onclick = () => sheet(`<h2>Minden adat törlése?</h2><p class="muted">A napló, a szint és a beállítások visszaállnak alapra. Ez nem vonható vissza.</p>
    <div class="btns"><button class="btn" id="shYes">Igen, törlöm</button><button class="btn primary" id="shNo">Mégse</button></div>`, {
      shYes: () => { ST = def(); save(); closeSheet(); renderHome(); }, shNo: closeSheet });
  if ($('#hideHint')) $('#hideHint').onclick = () => {
    try { localStorage.setItem(LS_HIDE_INSTALL, '1'); } catch (e) {}
    hintHidden = true; const h = $('#iosHint'); if (h) h.remove();
  };
  $('#bkExport').onclick = exportFile;
  $('#bkImport').onclick = () => { const f = $('#bkFile'); f.value = ''; f.click(); };
  $('#bkFile').onchange = importFile;
  $('#bkCopy').onclick = copyBackup;
  $('#bkPaste').onclick = pasteSheet;
  showPendingUpdate();
}

function deleteEntry(i) {
  const e = ST.log[i]; if (!e) return;
  if (e.ptr) ST.plusPtr = Math.max(0, (ST.plusPtr || 0) - 1);   // az ajánlási sorrend is visszaáll
  ST.log.splice(i, 1); save();
}
function askDelete(i) {
  const e = ST.log[i]; if (!e) return;
  const d = new Date(e.d);
  sheet(`<h2>Törlöd ezt az edzést?</h2><p class="muted" style="margin:0">${esc(d.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' }))} · ${esc(logLabel(e))} · ${minsTxt(e.sec)}. A statisztika, a hét és a szintlépés számlálója is frissül.</p>
    <div class="btns"><button class="btn primary" id="shYes">Igen, törlöm</button><button class="btn" id="shNo">Mégse</button></div>`, {
    shYes: () => { deleteEntry(i); closeSheet(); renderHome(); }, shNo: closeSheet });
}

/* ================= MENTÉS ÉS VISSZAÁLLÍTÁS ================= */
let bkMsg = null, bkT = 0;
function setBkMsg(text, kind = 'ok') {
  bkMsg = { text, kind };
  const el = $('#bkMsg'); if (el) el.innerHTML = `<div class="notice ${kind}">${esc(text)}</div>`;
  clearTimeout(bkT);
  bkT = setTimeout(() => { bkMsg = null; const e = $('#bkMsg'); if (e) e.innerHTML = ''; }, 8000);
}
const backupText = () => JSON.stringify({ app: 'napi-edzes', format: 1, exportedAt: new Date().toISOString(), version: APP_VERSION, data: ST }, null, 2);

function exportFile() {
  try {
    const blob = new Blob([backupText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `napi-edzes-mentes-${dayKey()}.json`; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    setBkMsg('Kész a mentés. Tedd biztos helyre, például a Fájlok appba vagy a felhőbe.');
  } catch (e) {
    setBkMsg('A fájlmentés nem sikerült. Próbáld a Másolás vágólapra gombot.', 'err');
  }
}

async function copyBackup() {
  const txt = backupText();
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no clipboard');
    await navigator.clipboard.writeText(txt);
    setBkMsg('Kimásoltad a mentést. Illeszd be egy jegyzetbe vagy üzenetbe, és őrizd meg.');
  } catch (e) {
    sheet(`<h2>Mentés szövegként</h2><p class="muted">Jelöld ki és másold ki az egészet, majd tedd el egy jegyzetbe.</p>
      <textarea class="bktext" id="bkTa" readonly rows="10"></textarea>
      <button class="btn" id="shNo">Bezárás</button>`, { shNo: closeSheet });
    const ta = $('#bkTa'); ta.value = txt;
    try { ta.focus(); ta.select(); ta.setSelectionRange(0, txt.length); } catch (e2) {}
  }
}

function pasteSheet() {
  sheet(`<h2>Visszaállítás szövegből</h2><p class="muted">Illeszd be ide a korábban kimásolt mentést.</p>
    <textarea class="bktext" id="bkIn" rows="8" placeholder="{ &quot;app&quot;: &quot;napi-edzes&quot;, … }" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
    <div id="bkInMsg"></div>
    <div class="btns"><button class="btn primary" id="shGo">Visszaállítás</button><button class="btn" id="shNo">Mégse</button></div>`, {
    shGo: () => {
      const res = parseBackup($('#bkIn').value, true);
      if (res.error) { $('#bkInMsg').innerHTML = `<div class="notice err">${esc(res.error)}</div>`; return; }
      confirmRestore(res);
    },
    shNo: closeSheet
  });
  const ta = $('#bkIn'); if (ta) ta.focus();
}

async function importFile(ev) {
  const input = ev.target, file = input.files && input.files[0];
  if (!file) return;
  let text = '';
  try {
    text = file.text ? await file.text() : await new Promise((ok, bad) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => bad(fr.error); fr.readAsText(file); });
  } catch (e) { input.value = ''; setBkMsg('Nem sikerült beolvasni a fájlt.', 'err'); return; }
  input.value = '';
  const res = parseBackup(text);
  if (res.error) { setBkMsg(res.error, 'err'); return; }
  confirmRestore(res);
}

function parseBackup(text, fromPaste) {
  const bad = { error: fromPaste ? 'Ez nem érvényes Napi edzés mentés. Ellenőrizd, hogy a teljes mentést illesztetted be.' : 'Ez nem érvényes Napi edzés mentés. Ellenőrizd, hogy a jó fájlt választottad.' };
  let o;
  try { o = JSON.parse(String(text || '').trim()); } catch (e) { return bad; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return bad;
  let data = o, exportedAt = null;
  if (o.app === 'napi-edzes' && o.data && typeof o.data === 'object') { data = o.data; exportedAt = o.exportedAt || null; }
  else if (o.app !== undefined) return bad;
  if (!data || data.v !== 1 || !Array.isArray(data.log)) return bad;
  if (![1, 2, 3].includes(data.level)) return bad;
  const okEntry = e => e && typeof e === 'object' && typeof e.d === 'string' && !isNaN(Date.parse(e.d))
    && ['A', 'B', 'C', 'M'].includes(e.type) && typeof e.sec === 'number' && isFinite(e.sec);
  if (!data.log.every(okEntry)) return bad;
  // Hiányzó/ismeretlen mezők javítása, hogy a naplóban ne jelenjen meg „undefined”
  data = Object.assign({}, data, { log: data.log.map(e => Object.assign({}, e, {
    lvl: [1, 2, 3].includes(e.lvl) ? e.lvl : (e.type === 'M' ? undefined : 1),
    r: e.r && RATE[e.r] ? e.r : null, plus: e.plus && PLUS[e.plus] ? e.plus : null })) });
  if (data.set !== undefined && (typeof data.set !== 'object' || data.set === null || Array.isArray(data.set))) return bad;
  return { data, exportedAt };
}

function confirmRestore({ data, exportedAt }) {
  const n = data.log.length, last = n ? new Date(data.log[n - 1].d) : null;
  const dt = d => d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  const exp = exportedAt && !isNaN(Date.parse(exportedAt)) ? dt(new Date(exportedAt)) : 'ismeretlen';
  sheet(`<h2>Visszaállítod a mentést?</h2>
    <div class="bksum">
      <div><span>Edzések</span><b class="num">${n}</b></div>
      <div><span>Szint</span><b>${data.level}. szint · ${esc(LEVELS[data.level].name)}</b></div>
      <div><span>Utolsó edzés</span><b>${last ? esc(dt(last)) : 'még nincs'}</b></div>
      <div><span>Mentés ideje</span><b>${esc(exp)}</b></div>
    </div>
    <p class="muted" style="margin:0">A mentés felülírja a mostani adataidat ezen a telefonon (${ST.log.length} edzés). Ez nem vonható vissza.</p>
    <div class="btns"><button class="btn primary" id="shYes">Igen, visszaállítom</button><button class="btn" id="shNo">Mégse</button></div>`, {
    shYes: () => {
      ST = norm(data); save(); clearRun(); closeSheet(); pick = null; pickPlus = null; renderHome();
      setBkMsg(`Visszaállítva: ${n} edzés, ${ST.level}. szint.`);
    },
    shNo: closeSheet
  });
  try { const b = document.getElementById('shNo'); if (b) b.focus(); } catch (e) {}
}

/* ================= TELEPÍTÉSI TIPP (iOS) ================= */
let hintHidden = (() => { try { return localStorage.getItem(LS_HIDE_INSTALL) === '1'; } catch (e) { return false; } })();
const forceHint = /[?&]ioshint=1\b/.test(location.search);
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const showInstallHint = () => !hintHidden && (forceHint || (isIOS && !isStandalone()));

function askLevel(n) {
  if (n < 1 || n > 3) return;
  sheet(`<h2>Váltás: ${n}. szint · ${LEVELS[n].name}</h2><p class="muted">${esc(LEVELS[n].note)} A szintlépés számlálója újraindul.</p>
    <div class="btns"><button class="btn primary" id="shYes">Váltok</button><button class="btn" id="shNo">Mégse</button></div>`, {
    shYes: () => { ST.level = n; ST.levelSince = dayKey(); save(); closeSheet(); renderHome(); }, shNo: closeSheet });
}

/* ================= LAP (modál) ================= */
function sheet(html, handlers = {}) {
  const sh = $('#sheet');
  sh.innerHTML = `<div role="dialog" aria-modal="true">${html}</div>`;
  sh.classList.remove('hidden');
  Object.entries(handlers).forEach(([id, fn]) => { const b = document.getElementById(id); if (b) b.onclick = fn; });
  sh.onclick = e => { if (e.target === sh && handlers.shNo) handlers.shNo(); };
  const f = sh.querySelector('button'); if (f) f.focus();
}
function closeSheet() { $('#sheet').classList.add('hidden'); $('#sheet').innerHTML = ''; }

/* ================= HANG, REZGÉS, ÉBREN TARTÁS ================= */
let AC = null, huVoice = null, voiceMissing = false;
function unlockAudio() {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state !== 'running') AC.resume(); } catch (e) { AC = null; }
  try { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) {}
}
function tone(f, d, when = 0, vol = 0.3) {
  if (!AC || !ST.set.beep) return;
  try {
    const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.03);
  } catch (e) {}
}
function beep(k) {
  if (k === 'tick') tone(880, 0.12);
  else if (k === 'go') tone(1320, 0.35);
  else if (k === 'rest') tone(620, 0.35);
  else if (k === 'side') { tone(1050, 0.12); tone(1050, 0.12, 0.18); }
  else if (k === 'end') { tone(1320, 0.18); tone(1760, 0.3, 0.2); }
  else if (k === 'done') { tone(880, 0.18); tone(1100, 0.18, 0.2); tone(1320, 0.45, 0.4); }
}
const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    huVoice = vs.find(v => /^hu/i.test(v.lang)) || null;
    voiceMissing = vs.length > 0 && !huVoice;
  } catch (e) {}
}
if ('speechSynthesis' in window) { pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {} }
function speak(t) {
  if (!ST.set.voice || !('speechSynthesis' in window) || voiceMissing) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'hu-HU'; if (huVoice) u.voice = huVoice; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) {}
}
let WL = null;
function keepAwake(on) {
  const v = $('#nosleep');
  if (!on || !ST.set.wake) {
    try { v.pause(); } catch (e) {}
    try { WL && WL.release(); } catch (e) {} WL = null; return;
  }
  try { const p = v.play(); p && p.catch(() => {}); } catch (e) {}
  try { if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(l => { WL = l; }).catch(() => {}); } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && R && !R.done) keepAwake(true); });

/* ================= LEJÁTSZÓ ================= */
let R = null, loop = 0, stopAnim = () => {};
const ICON = {
  re: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>'
};
const now = () => performance.now();
const elapsed = () => R.base + (R.running && !R.waiting ? now() - R.t0 : 0);
const saveRun = () => { try { localStorage.setItem(LS_RUN, JSON.stringify({ pv: 2, type: R.type, level: R.level, plus: R.plus, idx: R.idx, vis: [...R.vis], savedAt: Date.now() })); } catch (e) {} };
const clearRun = () => { try { localStorage.removeItem(LS_RUN); } catch (e) {} };

function start(type, from = 0, level = ST.level, plus = null, vis = null) {
  unlockAudio(); keepAwake(true); closeSheet(); hideUpdate();
  if (plus && !PLUS[plus]) plus = null;
  if (type === 'P' && !plus) type = 'A';
  if (type !== 'P' && !BASE[type]) type = 'A';
  const steps = stepsFor(type, level, plus);
  const idx = Math.min(from, steps.length - 1), ps = steps.findIndex(s => s.plusStart);
  R = { type, level, plus, steps, idx, base: 0, t0: now(), running: true, waiting: false,
    startedAt: Date.now(), pausedTotal: 0, pauseAt: 0, lastBeep: null, sideDone: false, done: false,
    offerDone: ps < 0 || idx > ps, offering: false, vis: new Set(Array.isArray(vis) ? vis.filter(Number.isInteger) : []),
    workTotal: steps.filter(s => s.kind === 'work').length };
  $('#home').classList.add('hidden');
  const p = $('#player'); p.classList.remove('hidden');
  p.innerHTML = `
  <div class="ptop"><button class="x" id="pExit" aria-label="Kilépés">✕</button>
    <div class="where"><b id="pSec"></b><div id="pWhere"></div></div>
    <a class="btn small listbtn" href="${esc(musicUrl())}" target="_blank" rel="noopener" aria-label="Zene a Spotifyban">♫</a>
    <button class="btn small listbtn" id="pList">Lista</button></div>
  <div class="prog"><div id="pProg"></div></div>
  <div class="stage">
    <div class="phase" id="pPhase"></div>
    <h2 class="exname" id="pName"></h2>
    <div class="fig"><svg id="pFig" role="img" aria-label="A gyakorlat ábrája"></svg></div>
    <div><div class="timer num" id="pTime" aria-live="off"></div><div class="side" id="pSide"></div><div class="stepbar"><div id="pStep"></div></div></div>
  </div>
  <div>
    <div class="info-scroll" id="pInfo"></div>
    <div class="subctrls" id="pSub"></div>
    <div class="ctrls">
      <button id="bRe" aria-label="Gyakorlat újrakezdése">${ICON.re}Újra</button>
      <button id="bPrev" aria-label="Előző gyakorlat">${ICON.prev}Előző</button>
      <button class="play" id="bPlay"></button>
      <button id="bNext" aria-label="Következő">${ICON.next}Tovább</button>
    </div>
  </div>`;
  $('#bPlay').onclick = togglePlay;
  $('#bRe').onclick = () => { unlockAudio(); R.base = 0; R.t0 = now(); R.waiting = false; enterStep(); };
  $('#bPrev').onclick = () => { unlockAudio(); let j = R.idx - 1; while (j > 0 && R.steps[j].kind !== 'work') j--; goto(Math.max(0, j)); };
  $('#bNext').onclick = () => { unlockAudio(); advance(0); };
  $('#pList').onclick = openList;
  $('#pExit').onclick = askExit;
  enterStep();
  clearInterval(loop); loop = setInterval(tick, 100);
  window.scrollTo(0, 0);
}

function goto(i) {
  R.idx = i; R.base = 0; R.t0 = now(); R.waiting = false;
  if (!R.running) { R.running = true; R.pausedTotal += Date.now() - R.pauseAt; }
  enterStep();
}
function advance(carryMs, quiet) {
  if (R.idx >= R.steps.length - 1) { finish(false); return false; }
  R.idx++; R.waiting = false;
  R.base = Math.max(0, carryMs); R.t0 = now();
  enterStep(quiet);
  return true;
}
function togglePlay() {
  unlockAudio();
  if (R.waiting) { advance(0); return; }
  if (R.running) { R.base = elapsed(); R.running = false; R.pauseAt = Date.now(); try { speechSynthesis.cancel(); } catch (e) {} }
  else { R.t0 = now(); R.running = true; R.pausedTotal += Date.now() - R.pauseAt; keepAwake(true); }
  paint();
}

function enterStep(quiet) {
  const s = R.steps[R.idx], ex = EX[s.ex];
  if (s.kind === 'work') R.vis.add(R.idx);
  R.lastBeep = null; R.sideDone = elapsed() >= s.dur * 500;
  stopAnim();
  stopAnim = FIG.animate($('#pFig'), ex, { slow: s.kind !== 'work' });
  $('#player').classList.toggle('rest-mode', s.kind !== 'work');
  const phase = { work: s.part === 'base' || s.part === 'plus' ? 'MUNKA' : s.sec.toUpperCase(), rest: 'PIHENŐ', trans: 'KÖVETKEZIK', prep: 'KÉSZÜLJ' }[s.kind];
  const ph = $('#pPhase'); ph.textContent = phase; ph.className = 'phase' + (s.kind === 'rest' ? ' rest' : s.kind === 'work' ? '' : ' trans');
  $('#pName').innerHTML = esc(ex.name) + (ex.kg ? `<div class="kg">${esc(ex.kg)}</div>` : '');
  const workNo = R.steps.slice(0, R.idx + 1).filter(x => x.kind === 'work').length + (s.kind === 'work' ? 0 : 1);
  $('#pSec').textContent = s.sec + (s.round ? ` · ${s.round}/${s.rounds}. kör` : '');
  $('#pWhere').textContent = `${Math.min(workNo, R.workTotal)}/${R.workTotal}. gyakorlat · ${sessLabel(R.type, R.plus)} · ${R.level}. szint`;
  let info = '';
  if (s.brief) info += `<div class="notice">${esc(s.brief)}</div>`;
  info += `<ul class="cues">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul><div class="easy"><b>Könnyítés:</b> ${esc(ex.easy)}</div>`;
  $('#pInfo').innerHTML = info;
  saveRun();
  if (s.plusStart && !R.offerDone) { R.offerDone = true; offerPlus(); return; }
  paint();
  if (!quiet) announce();
}

/* Döntési pont az alap kör után: jöhet-e a plusz blokk */
function offerPlus() {
  R.offering = true;
  if (R.running && !R.waiting) { R.running = false; R.pauseAt = Date.now(); }
  R.base = 0;   // a plusz blokk mindig elölről indul (pl. lezárt telefon utáni behozás ne ugorja át)
  paint();
  beep('end'); vib([150, 80, 150]); speak('Az alap kész. Jöhet a plusz blokk?');
  const cur = R.plus, mins = k => Math.round(plusMins(R.type, R.level, k) / 60);
  const others = PLUS_ORDER.filter(k => k !== cur);
  sheet(`<h2>Az alap kész ✓</h2>
    <p class="muted" style="margin:0">Ez volt a kötelező rész, ez már teljes edzésnek számít. Jöhet a plusz blokk, vagy mehetsz a nyújtásra.</p>
    <div class="btns">
      <button class="btn primary" id="shYes">Jöhet: ${esc(PLUS[cur].short)} · ~${mins(cur)} perc</button>
      <button class="btn" id="shSkip">Kihagyom, jöhet a nyújtás</button>
    </div>
    <h3 class="subhead">Vagy válassz másikat</h3>
    <div class="btns altlist">${others.map(k => `<button class="btn small" data-alt="${k}">${esc(PLUS[k].name)} <span class="muted">· ~${mins(k)} perc · ${esc(PLUS[k].gear)}</span></button>`).join('')}</div>`, {
    shYes: () => { closeSheet(); resumeAfterOffer(); },
    shSkip: () => { closeSheet(); setPlus(null); resumeAfterOffer(); }
  });
  document.querySelectorAll('[data-alt]').forEach(b => b.onclick = () => { closeSheet(); setPlus(b.dataset.alt); resumeAfterOffer(); });
}
function setPlus(plus) {
  R.plus = plus;
  R.steps = buildSteps(R.type, R.level, plus);
  R.workTotal = R.steps.filter(s => s.kind === 'work').length;
  R.idx = Math.min(R.idx, R.steps.length - 1);
  R.base = Math.min(R.base, R.steps[R.idx].dur * 1000 - 1);
  enterStep(true);
}
function resumeAfterOffer() {
  R.offering = false;
  R.t0 = now(); R.running = true; R.pausedTotal += Date.now() - R.pauseAt; keepAwake(true);
  R.lastBeep = null;
  paint(); announce();
}
function announce() {
  const s = R.steps[R.idx], ex = EX[s.ex];
  if (s.kind === 'work') { beep('go'); vib(200); speak(ex.name + (s.sided ? '. Félidőben oldalcsere.' : '')); }
  else if (s.kind === 'rest') { beep('rest'); vib([60, 60, 60]); speak('Pihenő. Következik: ' + ex.name); }
  else if (s.kind === 'prep') speak('Készülj. Első gyakorlat: ' + ex.name);
  else speak('Következik: ' + ex.name);
}

function tick() {
  if (!R || R.done || R.offering) return;
  let s = R.steps[R.idx], el = elapsed() / 1000, guard = 0, moved = false;
  while (el >= s.dur && !R.waiting && R.running && guard++ < 300) {
    if (s.kind === 'work' && !ST.set.auto) {
      R.waiting = true; R.base = s.dur * 1000; R.waitAt = now() - (el - s.dur) * 1000;
      beep('end'); vib([150, 80, 150]); speak('Kész. Lépj tovább, ha jöhet.');
      break;
    }
    if (!advance((el - s.dur) * 1000, true)) return;
    moved = true; R.sideDone = false;
    s = R.steps[R.idx]; el = elapsed() / 1000;
    R.sideDone = s.sided && el >= s.dur / 2;
    R.lastBeep = Math.ceil(s.dur - el);
  }
  if (moved && !R.waiting && !R.offering) { announce(); R.lastBeep = null; }
  if (R.running && !R.waiting) {
    const sec = Math.ceil(s.dur - el);
    if (sec >= 1 && sec <= 3 && R.lastBeep !== sec) { R.lastBeep = sec; beep('tick'); }
    if (s.sided && !R.sideDone && el >= s.dur / 2) { R.sideDone = true; beep('side'); vib([100, 60, 100]); speak('Oldalcsere'); }
  }
  paint();
}

function paint() {
  if (!R || R.done) return;
  const s = R.steps[R.idx], el = elapsed() / 1000;
  const t = $('#pTime');
  if (R.waiting) { t.textContent = '+' + fmt((now() - R.waitAt) / 1000); t.classList.add('over'); }
  else { t.textContent = fmt(s.dur - el); t.classList.remove('over'); }
  $('#pStep').style.width = Math.min(100, el / s.dur * 100) + '%';
  const done = R.steps.slice(0, R.idx).reduce((a, x) => a + x.dur, 0) + Math.min(el, s.dur);
  $('#pProg').style.width = (done / totalSec(R.steps) * 100) + '%';
  $('#pSide').innerHTML = R.waiting ? '<b>Kész?</b> Koppints a Kész gombra.'
    : s.sided && s.kind === 'work' ? (el < s.dur / 2 ? '<b>1. oldal</b> · csere ' + fmt(s.dur / 2 - el) + ' múlva' : '<b>2. oldal</b>')
    : s.kind !== 'work' ? 'Ez a következő gyakorlat' + (s.sided ? ' · mindkét oldalra' : '') : '';
  $('#bPlay').innerHTML = R.waiting ? `${ICON.next}Kész` : R.running ? `${ICON.pause}Szünet` : `${ICON.play}Folytatás`;
  $('#bPlay').setAttribute('aria-label', R.waiting ? 'Kész, tovább' : R.running ? 'Szünet' : 'Folytatás');
  const sub = $('#pSub');
  const want = (s.kind !== 'work') ? 'add' : '';
  if (sub.dataset.mode !== want + R.running) {
    sub.dataset.mode = want + R.running;
    sub.innerHTML = (want ? '<button class="btn small" id="bAdd">+15 mp pihenő</button>' : '') + (!R.running ? '<span class="muted" style="align-self:center">Szüneteltetve</span>' : '');
    const a = $('#bAdd'); if (a) a.onclick = () => { R.base = elapsed() - 15000; R.t0 = now(); R.lastBeep = null; paint(); };
  }
}

function openList() {
  let html = '<h2>Ugrás gyakorlatra</h2><div class="steplist">', cur = null;
  R.steps.forEach((s, i) => {
    if (s.kind !== 'work') return;
    const head = s.sec + (s.round ? ` · ${s.round}. kör` : '');
    if (head !== cur) { cur = head; html += `<h3>${esc(head)}</h3>`; }
    html += `<button data-go="${i}" class="${i === R.idx ? 'cur' : i < R.idx ? 'past' : ''}"><span>${esc(EX[s.ex].name)}</span><span class="num">${s.dur} mp</span></button>`;
  });
  html += '</div><button class="btn" id="shNo">Bezárás</button>';
  sheet(html, { shNo: closeSheet });
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { closeSheet(); goto(+b.dataset.go); });
  const c = $('.steplist .cur'); if (c) c.scrollIntoView({ block: 'center' });
}

function askExit() {
  const wasRunning = R.running && !R.waiting;
  if (wasRunning) { R.base = elapsed(); R.running = false; R.pauseAt = Date.now(); try { speechSynthesis.cancel(); } catch (e) {} paint(); }
  const doneWork = R.steps.slice(0, R.idx).filter(s => s.kind === 'work').length;
  const frac = doneWork / R.workTotal, bd = baseDone(), canSave = bd || frac >= 0.5;
  sheet(`<h2>Kilépsz az edzésből?</h2><p class="muted">Eddig ${doneWork} gyakorlat kész a ${R.workTotal}-ból.${bd ? ' Az alap kész, ez teljes edzésnek számít.' : ''}</p>
    <div class="btns">
      <button class="btn primary" id="shNo">Folytatom</button>
      ${canSave ? '<button class="btn" id="shSave">Befejezem és mentem</button>' : ''}
      <button class="btn" id="shQuit">Kilépés mentés nélkül</button>
    </div>${!canSave ? '<p class="muted">Mentés a gyakorlatok felétől lehetséges.</p>' : ''}`, {
    shNo: () => { closeSheet(); if (wasRunning && !R.running) togglePlay(); },
    shSave: () => { closeSheet(); finish(true); },
    shQuit: () => { closeSheet(); quit(); }
  });
}
const baseDone = () => ['plus', 'cool'].includes(R.steps[R.idx].part);
function quit() {
  clearInterval(loop); stopAnim(); keepAwake(false); clearRun();
  try { speechSynthesis.cancel(); } catch (e) {}
  R = null; pick = null; pickPlus = null;
  $('#player').classList.add('hidden'); $('#player').innerHTML = '';
  $('#home').classList.remove('hidden'); renderHome(); window.scrollTo(0, 0);
}

function finish(partial) {
  if (!R.running) R.pausedTotal += Date.now() - R.pauseAt;
  R.done = true; clearInterval(loop); stopAnim(); keepAwake(false); clearRun();
  const sec = Math.max(60, Math.round((Date.now() - R.startedAt - R.pausedTotal) / 1000));
  // Csak a ténylegesen elvégzett (megnyitott) gyakorlatok számítanak; Lista-ugrással nem lehet „letudni” egy részt
  const doneShare = part => { const ix = R.steps.map((x, i) => x.kind === 'work' && x.part === part ? i : -1).filter(i => i >= 0);
    return ix.length ? ix.filter(i => R.vis.has(i)).length / ix.length : 0; };
  const full = R.type === 'P' ? doneShare('plus') >= 0.75 : (!partial || baseDone()) && doneShare('base') >= 0.75;
  const plusDone = R.plus && doneShare('plus') >= 0.75 ? R.plus : null;
  const entry = { d: new Date().toISOString(), type: R.type, lvl: R.level, sec, r: null, plus: plusDone };
  if (!full) entry.part = true;
  if (plusDone && plusDone === PLUS_CYCLE[(ST.plusPtr || 0) % PLUS_CYCLE.length]) { ST.plusPtr = (ST.plusPtr || 0) + 1; entry.ptr = true; }
  ST.log.push(entry); save();
  if (!partial) { beep('done'); vib([200, 100, 200]); speak('Kész! Szép munka.'); }
  const p = $('#player'); p.classList.remove('rest-mode');
  p.innerHTML = `<div></div><div></div>
  <div class="stage" style="grid-template-rows:auto;align-content:center;gap:14px">
    <div class="phase" style="background:var(--ok)">${partial ? 'MENTVE' : 'KÉSZ'}</div>
    <h2 class="exname">${R.type === 'P' ? esc('Plusz blokk: ' + PLUS[R.plus].name) : esc(BASE[R.type].title)}${plusDone && R.type !== 'P' ? `<div class="kg">+ ${esc(PLUS[plusDone].name)}</div>` : ''}</h2>
    <div class="big num">${fmt(sec)}</div>
    <p class="muted" style="margin:0">${streak()} nap egymás után · ${ST.log.length}. edzés összesen</p>
    <h3 style="font-size:20px;margin-top:10px">Milyen volt?</h3>
    <div class="rate">
      <button data-r="konnyu">Könnyű<small>Maradt bőven erőm</small></button>
      <button data-r="jo">Pont jó<small>Kihívás, de tiszta technika</small></button>
      <button data-r="nehez">Nehéz<small>A végén szétesett a forma</small></button>
      <button data-r="faj">Fájt valami<small>Derék, térd, váll…</small></button>
    </div>
    <div id="fb"></div>
  </div>
  <div class="btns"><button class="btn primary" id="fHome">Kész, vissza a kezdőlapra</button><button class="btn" id="fAgain">Ismétlés</button><button class="btn small" id="fDiscard">Ne mentsd, csak kipróbáltam</button></div>`;
  const type = R.type, level = R.level, plusAgain = R.plus;
  p.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
    entry.r = b.dataset.r; save();
    p.querySelectorAll('[data-r]').forEach(x => x.setAttribute('aria-pressed', x === b));
    const lp = levelProg();
    const msg = {
      konnyu: 'Remek. Ha többször is könnyű, lassítsd a leengedést, vagy lépj szintet, amikor a feltétel teljesül.',
      jo: 'Pont ez a cél. Így haladsz a legbiztosabban.',
      nehez: 'Rendben. Maradj ezen a szinten, és ahol szétesik a forma, használd a könnyítést.',
      faj: 'A következő 2 alkalommal használd a könnyítéseket; plusz blokknak a Derék és mobilitást ajánlom. Éles, lábba sugárzó vagy egy hétnél tovább tartó fájdalomnál fordulj orvoshoz.'
    }[entry.r];
    $('#fb').innerHTML = `<div class="notice${entry.r === 'faj' || entry.r === 'nehez' ? '' : ' ok'}">${msg}${lp.ready ? `<br><b>Elérted a ${ST.level + 1}. szint feltételét.</b> A kezdőlapon tudsz váltani.` : ''}</div>`;
  });
  $('#fHome').onclick = quit;
  $('#fDiscard').onclick = () => { const i = ST.log.indexOf(entry); if (i >= 0) deleteEntry(i); quit(); };
  $('#fAgain').onclick = () => start(type, 0, level, plusAgain);
}

/* ================= FRISSÍTÉS (service worker) ================= */
let swReg = null, updatePending = false, userUpdate = false, reloading = false, lastUpdCheck = Date.now();
const homeVisible = () => $('#player').classList.contains('hidden');
function showUpdate() {
  updatePending = true;
  if (!homeVisible()) return;           // edzés közben nem zavarunk; a kezdőlapon jelenik meg
  let b = $('#updBar');
  if (!b) {
    b = document.createElement('div');
    b.id = 'updBar'; b.className = 'updbar'; b.setAttribute('role', 'status');
    b.innerHTML = '<span>Új verzió érhető el</span><button class="btn small" id="updGo">Frissítés</button>';
    document.body.appendChild(b);
    b.querySelector('#updGo').onclick = applyUpdate;
  }
}
function showPendingUpdate() { if (updatePending) showUpdate(); }
function hideUpdate() { const b = $('#updBar'); if (b) b.remove(); }
function applyUpdate() {
  userUpdate = true;
  const w = swReg && swReg.waiting;
  if (w) { const btn = $('#updGo'); if (btn) { btn.disabled = true; btn.textContent = 'Frissítés…'; } w.postMessage({ type: 'SKIP_WAITING' }); }
  else { reloading = true; location.reload(); }
}
function initSW() {
  if (window.NO_SW || !('serviceWorker' in navigator)) return;
  const h = location.hostname;
  if (!(location.protocol === 'https:' || h === 'localhost' || h === '127.0.0.1')) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !userUpdate) return;  // csak a felhasználó kérésére töltünk újra, egyszer
    reloading = true; location.reload();
  });
  const watch = w => { if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(); }); };
  navigator.serviceWorker.register('sw.js').then(reg => {
    swReg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate();
    watch(reg.installing);
    reg.addEventListener('updatefound', () => watch(reg.installing));
  }).catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !swReg) return;
    if (Date.now() - lastUpdCheck < 30 * 60e3) return;
    lastUpdCheck = Date.now();
    try { swReg.update().catch(() => {}); } catch (e) {}
  });
}

/* ================= INDULÁS ================= */
renderHome();
try {
  if (navigator.storage && navigator.storage.persist) {
    (navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false))
      .then(p => p ? null : navigator.storage.persist()).catch(() => {});
  }
} catch (e) {}
if (document.readyState === 'complete') initSW(); else window.addEventListener('load', initSW);
window.__APP = { get R() { return R; }, get ST() { return ST; }, tick, start, advance: c => advance(c),
  version: APP_VERSION, sw: { showUpdate, hideUpdate, get reg() { return swReg; } } };
})();
