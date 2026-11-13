/* Gyakorlattár + program. Szögek: 0 le, 90 előre, 180 fel, -90 hátra. */
const S = (o = {}) => Object.assign({ t: 180, l: [[2, 0], [-2, 0]], a: [[0, 0], [0, 0]] }, o);

const EX = {
  // ---------- BEMELEGÍTÉS / MOBILITÁS ----------
  karkorzes: {
    name: 'Karkörzés', mode: 'loop', linear: true, spin: true, dur: 2.2, anch: 'an',
    frames: [S({ a: [[0, 0], [10, 10]] }), S({ a: [[90, 90], [100, 100]] }), S({ a: [[180, 180], [190, 190]] }), S({ a: [[270, 270], [280, 280]] })],
    cues: ['Nyújtott karral, nagy körökkel', 'Félidőben válts irányt', 'Hasat enyhén feszítsd'],
    easy: 'Kisebb körök, behajlított könyök'
  },
  csipozsaner: {
    name: 'Csípőzsanér', dur: 2.6,
    frames: [S({ ar: 1, a: [[25, 165], [22, 162]] }), S({ t: 128, ar: 1, l: [[16, -8], [14, -10]], a: [[25, 165], [22, 162]] })],
    cues: ['Csípőt told hátra, mintha ajtót csuknál be a fenekeddel', 'Hát egyenes, enyhén hajlított térd', 'Combhátsón érezd a nyújtást'],
    easy: 'Kisebb mozgástartomány, kézzel a combodon csúszva'
  },
  terdemeles: {
    name: 'Váltott térdemelés', dur: 1.4, anch: 'hip', hold: 0.05,
    frames: [S({ l: [[85, 0], [0, 0]], a: [[-30, -15], [40, 110]] }), S({ l: [[0, 0], [85, 0]], a: [[40, 110], [-30, -15]] })],
    cues: ['Térd csípőmagasságig', 'Ellentétes kar lendül', 'Egyenes törzs'],
    easy: 'Helyben járás alacsonyabb térddel'
  },
  guggolas: {
    name: 'Testsúlyos guggolás', dur: 2.6,
    frames: [S({ a: [[88, 88], [86, 86]] }), S({ t: 145, l: [[82, -28], [80, -30]], a: [[88, 88], [86, 86]] })],
    cues: ['Térd a lábujjak irányába', 'Sarok végig a talajon', 'Lassan le, lendületesen fel'],
    easy: 'Guggolás székre (érintsd, állj fel)'
  },
  wgs: {
    name: 'Kitörés + törzsforgatás', sided: true, dur: 3.2,
    frames: [
      { t: 118, l: [[78, 0], [-48, -62]], a: [[2, 2], [4, 4]] },
      { t: 118, l: [[78, 0], [-48, -62]], a: [[2, 2], [178, 178]] }
    ],
    cues: ['Mély kitörés, hátsó láb nyújtva', 'Belső kéz a talajon, a másik kart nyújtsd az ég felé', 'Kövesd a kezed a tekinteteddel'],
    easy: 'Hátsó térd a talajon'
  },
  macskateve: {
    name: 'Macska–teve', dur: 4, hold: 0.25, anch: 'kn',
    frames: [
      { t: 107, c: 11, hd: 30, l: [[0, -90], [-2, -90]], a: [[0, 0], [2, 2]] },
      { t: 107, c: -8, hd: 145, l: [[0, -90], [-2, -90]], a: [[0, 0], [2, 2]] }
    ],
    cues: ['Négykézláb, kéz a váll alatt, térd a csípő alatt', 'Kilégzésre domború hát, belégzésre homorú', 'Lassan, csigolyáról csigolyára'],
    easy: 'Kisebb mozgás, csak a fájdalommentes tartományban'
  },
  bokamobil: {
    name: 'Bokamobilizálás térdelve', sided: true, dur: 2.6,
    frames: [
      { t: 180, l: [[90, 0], [0, -90]], a: [[60, 90], [55, 85]] },
      { t: 180, l: [[86, 24], [-12, -90]], a: [[60, 90], [55, 85]] }
    ],
    cues: ['Féltérdelés, első talp a földön', 'Told a térdet előre a lábujjak fölé', 'Sarok nem emelkedhet el'],
    easy: 'Kisebb előretolás'
  },
  mellforgatas: {
    name: 'Négykézláb mellkasforgatás', sided: true, dur: 3.2, anch: 'kn', hold: 0.2,
    frames: [
      { t: 107, hd: 60, l: [[0, -90], [-2, -90]], a: [[30, -164], [2, 2]] },
      { t: 107, hd: 150, l: [[0, -90], [-2, -90]], a: [[170, 1], [2, 2]] }
    ],
    cues: ['Négykézláb, egyik kéz a tarkón', 'Könyököt forgasd az ég felé, majd a másik kar felé', 'A csípő maradjon a helyén'],
    easy: 'Kisebb forgatás'
  },

  // ---------- ERŐ ----------
  goblet: {
    kg: '20 kg kettlebell', name: 'Goblet guggolás (kettlebell)', dur: 3, prop: { kb: 'both' },
    frames: [S({ t: 178, ar: 1, a: [[22, 168], [20, 166]] }), S({ t: 152, ar: 1, l: [[86, -30], [84, -32]], a: [[22, 168], [20, 166]] })],
    cues: ['A kettlebellt a fülénél fogd a mellkasod előtt', 'Könyök a térdek között, mellkas fent', 'Legalább combközépig, sarok a földön'],
    easy: 'Testsúlyos guggolás vagy egy kézisúlyzó'
  },
  fekvo: {
    name: 'Fekvőtámasz', dur: 2.6,
    frames: [
      { t: 113, l: [[-67, -67], [-66, -66]], a: [[-8, -8], [-6, -6]] },
      { t: 101, l: [[-79, -79], [-78, -78]], a: [[-78, 6], [-76, 8]] }
    ],
    cues: ['Fejtől sarokig egy vonal', 'Könyök 45°-ban a törzs mellett', 'Mellkas közel a talajhoz'],
    easy: 'Térdelő fekvőtámasz vagy kéz megemelt felületen'
  },
  terdfekvo: {
    name: 'Térdelő fekvőtámasz', dur: 2.6, anch: 'kn',
    frames: [
      { t: 127, l: [[-53, -128], [-52, -126]], a: [[-6, -6], [-4, -4]] },
      { t: 110, l: [[-70, -120], [-69, -118]], a: [[-78, 6], [-76, 8]] }
    ],
    cues: ['Térdtől fejig egy vonal, ne törjön a csípő', 'Kéz kicsit vállszélességnél szélesebben', 'Lassan le, erővel fel'],
    easy: 'Falnál végzett fekvőtámasz'
  },
  evezes: {
    kg: '12–15 kg', name: 'Egykezes evezés (kézisúlyzó)', sided: true, dur: 2.4, prop: { db: 'n' },
    frames: [
      { t: 124, l: [[-14, -4], [26, -6]], a: [[2, 2], [40, -20]] },
      { t: 124, l: [[-14, -4], [26, -6]], a: [[-102, 2], [40, -20]] }
    ],
    cues: ['Szabad kéz az első combon, hát egyenes', 'Könyököt húzd a csípőd felé', 'Fent 1 mp tartás, lassan le'],
    easy: 'Könnyebb súly vagy két kézzel egy súlyzó'
  },
  plank: {
    name: 'Alkar plank', dur: 4, hold: 0.3,
    frames: [
      { t: 100, l: [[-80, -80], [-79, -79]], a: [[0, 90], [2, 92]] },
      { t: 101, l: [[-79, -79], [-78, -78]], a: [[0, 90], [2, 92]] }
    ],
    cues: ['Könyök a váll alatt', 'Fenék és has feszes, a derék ne süllyedjen', 'Nyugodt, egyenletes légzés'],
    easy: 'Plank térdelve'
  },
  kbdl: {
    kg: '20 kg kettlebell', name: 'Kettlebell felhúzás', dur: 2.8, prop: { kb: 'both' },
    frames: [S({ a: [[3, 3], [1, 1]] }), { t: 112, l: [[45, -15], [43, -17]], a: [[3, 3], [1, 1]] }],
    cues: ['Kettlebell a talpak között', 'Csípő hátra, hát egyenes, váll a súly fölött', 'Sarokkal told el a talajt, fent feszítsd a fenekedet'],
    easy: 'Kettlebell megemelve (pl. könyvön)'
  },
  swing: {
    kg: '20 kg kettlebell', name: 'Kettlebell swing', dur: 1.6, hold: 0.06, prop: { kb: 'both' },
    frames: [
      { t: 128, l: [[28, -12], [26, -14]], a: [[-26, -26], [-24, -24]] },
      S({ t: 184, a: [[94, 94], [92, 92]] })
    ],
    cues: ['Csípőből lendíts, nem karból: a kar csak tart', 'Lent a súly a combok között, fent egyenes test', 'Fent szorítsd a fenekedet, ne dőlj hátra'],
    easy: 'Kettlebell felhúzás (lendítés nélkül)'
  },
  swing1: {
    kg: '20 kg kettlebell', name: 'Egykezes swing', sided: true, dur: 1.6, hold: 0.06, prop: { kb: 'n' },
    frames: [
      { t: 128, l: [[28, -12], [26, -14]], a: [[-26, -26], [-60, -40]] },
      S({ t: 184, a: [[94, 94], [40, 40]] })
    ],
    cues: ['Mint a kétkezes, de egy kézzel', 'Váll lent és hátra, ne csavarodjon a törzs', 'Félidőben kézcsere'],
    easy: 'Kétkezes swing'
  },
  halottbogar: {
    name: 'Halott bogár', dur: 3, anch: 'hip', hold: 0.2,
    frames: [
      { t: -90, hd: -90, l: [[178, 90], [182, 92]], a: [[178, 178], [182, 182]] },
      { t: -90, hd: -90, l: [[102, 96], [182, 92]], a: [[258, 258], [182, 182]] }
    ],
    cues: ['Hanyatt, derék a talajhoz nyomva', 'Ellentétes kart és lábat nyújts lassan', 'Kilégzés nyújtáskor, váltott oldal'],
    easy: 'Csak a lábat mozgasd'
  },
  hegymaszo: {
    name: 'Hegymászó', dur: 1.1, hold: 0.04, anch: 'wn',
    frames: [
      { t: 113, l: [[22, -62], [-67, -67]], a: [[-6, -6], [-4, -4]] },
      { t: 113, l: [[-67, -67], [22, -62]], a: [[-6, -6], [-4, -4]] }
    ],
    cues: ['Magas plank, váll a csukló fölött', 'Térdet húzd a mellkas felé, váltva', 'A csípő ne ugráljon fel-le'],
    easy: 'Lassú, lépő változat'
  },
  oldalplank: {
    name: 'Oldalsó plank', sided: true, dur: 3.6, hold: 0.3, anch: 'an',
    frames: [
      { t: -104, hd: -104, l: [[86, 86], [84, 84]], a: [[0, 90], [178, 178]], fo: [0, 0] },
      { t: -99, hd: -99, l: [[81, 81], [79, 79]], a: [[0, 90], [178, 178]], fo: [0, 0] }
    ],
    cues: ['Könyök a váll alatt', 'Csípőt emeld egy vonalba', 'Félidőben oldalcsere'],
    easy: 'Térdre támaszkodva'
  },
  csipoemeles: {
    name: 'Csípőemelés', dur: 2.6, anch: 'an',
    frames: [
      { t: -90, hd: -90, l: [[134, 30], [136, 32]], a: [[90, 90], [92, 92]] },
      { t: -66, hd: -90, l: [[114, 18], [116, 20]], a: [[80, 90], [82, 92]] }
    ],
    cues: ['Hanyatt, talpak a földön', 'Sarokkal told fel a csípőt', 'Fent 1–2 mp, feszítsd a fenekedet'],
    easy: 'Kisebb mozgástartomány'
  },
  kitores: {
    kg: '1. szint: súly nélkül · 2.: 6–8 kg / kéz', name: 'Hátralépő kitörés', dur: 2.8, prop: { db: 'both' },
    frames: [S({ a: [[2, 2], [0, 0]] }), { t: 180, l: [[86, 0], [-24, -86]], a: [[2, 2], [0, 0]], fo: [null, 4] }],
    cues: ['1. szinten súly nélkül, 2. szinttől kézisúlyzóval', 'Lépj hátra, hátsó térd a talaj közelébe, első sarokkal told vissza magad', 'Váltott lábbal, egyenes törzs'],
    easy: 'Súly nélkül, kapaszkodva'
  },
  vallnyomas: {
    kg: '6–8 kg / kéz', name: 'Vállból nyomás (kézisúlyzó)', dur: 2.4, prop: { db: 'both' },
    frames: [S({ a: [[16, 168], [14, 166]] }), S({ a: [[178, 178], [176, 176]] })],
    cues: ['Állva, has és fenék feszes, ne homoríts', 'Kezdj könnyebben, mint gondolnád: a vállnyomás a leggyengébb mozgás', 'Lassan engedd vissza a vállhoz'],
    easy: 'Kevesebb tárcsa, vagy váltott karral nyomj'
  },
  rdl: {
    kg: '10–12 kg / kéz', name: 'Román felhúzás (kézisúlyzó)', dur: 3, prop: { db: 'both' },
    frames: [S({ a: [[2, 2], [0, 0]] }), { t: 120, l: [[18, -6], [16, -8]], a: [[2, 2], [0, 0]] }],
    cues: ['Enyhén hajlított térd végig', 'Csípő hátra, súly a comb előtt csúszik le', 'Lábszár közepéig, hát egyenes'],
    easy: 'Kisebb mélység, könnyebb súly'
  },
  bolgar: {
    kg: '6–10 kg / kéz', name: 'Bolgár guggolás', sided: true, dur: 3, prop: { db: 'both' }, box: true,
    frames: [
      { t: 178, l: [[24, 4], [-30, -48]], a: [[2, 2], [0, 0]], fo: [null, -60] },
      { t: 172, l: [[82, -8], [-6, -112]], a: [[2, 2], [0, 0]], fo: [null, -60] }
    ],
    cues: ['Hátsó lábfej széken vagy kanapén', 'Engedd le egyenesen, első térd a lábfej fölött', 'Az első sarokkal told fel magad'],
    easy: 'Hátralépő kitörés'
  },
  terdelonyomas: {
    kg: '8–10 kg', name: 'Féltérdelő egykezes nyomás', sided: true, dur: 2.6, prop: { db: 'n' },
    frames: [
      { t: 180, l: [[88, 0], [0, -90]], a: [[16, 168], [0, 0]] },
      { t: 180, l: [[88, 0], [0, -90]], a: [[178, 178], [0, 0]] }
    ],
    cues: ['Féltérdelés, a nyomó kéz oldalán a hátsó térd', 'Fenék feszes, törzs egyenes', 'Nyomd a fej fölé, ne dőlj oldalra'],
    easy: 'Állva, két kézzel'
  },
  egylabasrdl: {
    kg: '8–12 kg', name: 'Egylábas román felhúzás', sided: true, dur: 3.2, prop: { db: 'n' },
    frames: [
      S({ l: [[2, 0], [-8, -4]], a: [[2, 2], [10, 10]] }),
      { t: 100, l: [[10, -4], [-80, -80]], a: [[2, 2], [4, 4]] }
    ],
    cues: ['Állóláb térde enyhén hajlít', 'Törzs és hátsó láb egy vonalban dől', 'Csípő maradjon vízszintes'],
    easy: 'Hátsó lábujj a talajon (támasz)'
  },
  hollow: {
    name: 'Csónak tartás', dur: 4, hold: 0.3, anch: 'hip',
    frames: [
      { t: -97, hd: -110, l: [[97, 97], [96, 96]], a: [[-100, -100], [-99, -99]] },
      { t: -95, hd: -108, l: [[95, 95], [94, 94]], a: [[-102, -102], [-101, -101]] }
    ],
    cues: ['Hanyatt, derék a talajhoz nyomva', 'Váll és lábak kicsit a talaj fölött', 'Ha ív képződik a derékban, emeld a lábat'],
    easy: 'Behajlított térd, kar a test mellett'
  },
  vallerintes: {
    name: 'Plank vállérintéssel', dur: 1.8, hold: 0.15, anch: 'wf',
    frames: [
      { t: 113, l: [[-67, -67], [-66, -66]], a: [[-6, -6], [-4, -4]] },
      { t: 113, l: [[-67, -67], [-66, -66]], a: [[60, -150], [-4, -4]] }
    ],
    cues: ['Magas plank, lábak kicsit terpeszben', 'Váltva érintsd a szemközti vállad', 'A csípő ne billegjen'],
    easy: 'Térdelő helyzetből'
  },

  // ---------- NYÚJTÁS ----------
  csipohajlito: {
    name: 'Csípőhajlító nyújtás', sided: true, dur: 4, hold: 0.3,
    frames: [
      { t: 180, l: [[96, -6], [-24, -90]], a: [[2, 2], [0, 0]] },
      { t: 186, l: [[96, -6], [-24, -90]], a: [[176, 176], [174, 174]] }
    ],
    cues: ['Féltérdelés, hátsó térd párnán', 'Feszítsd a fenekedet, told előre a csípőt', 'Nyújtózz fel a hátsó láb oldali karral'],
    easy: 'Kisebb lépés, kapaszkodás'
  },
  combhajlito: {
    name: 'Combhajlító nyújtás fekve', sided: true, dur: 4, hold: 0.3, anch: 'hip',
    frames: [
      { t: -90, hd: -90, l: [[140, 140], [90, 90]], a: [[150, 140], [148, 138]] },
      { t: -90, hd: -90, l: [[170, 172], [90, 90]], a: [[160, 168], [158, 166]] }
    ],
    cues: ['Hanyatt, törölközőt akassz a talpadra', 'Nyújtott lábat húzd fel, a derék a talajon marad', 'Ahol érzed, ott tarts, rugózás nélkül'],
    easy: 'Enyhén hajlított térd'
  },
  madarkutya: {
    name: 'Madár-kutya', sided: true, dur: 3.4, hold: 0.3, anch: 'kn',
    frames: [
      { t: 107, l: [[0, -90], [-2, -90]], a: [[0, 0], [2, 2]] },
      { t: 107, l: [[0, -90], [-94, -94]], a: [[100, 100], [2, 2]], fo: [null, -4] }
    ],
    cues: ['Négykézláb, has enyhén feszes', 'Nyújtsd az egyik kart és a szemközti lábat', 'A derék ne homorodjon, 2 mp tartás fent'],
    easy: 'Csak a lábat vagy csak a kart nyújtsd'
  },
  gyermekpoz: {
    name: 'Gyermekpóz nyújtózással', dur: 4.5, hold: 0.3, anch: 'kn',
    frames: [
      { t: 78, hd: 70, l: [[56, -90], [54, -90]], a: [[93, 93], [95, 95]], fo: [-90, -90] },
      { t: 74, hd: 66, l: [[56, -90], [54, -90]], a: [[96, 96], [98, 98]], fo: [-90, -90] }
    ],
    cues: ['Ülj a sarkadra, homlok a talaj felé', 'Karokat nyújtsd előre', 'Lassú, mély légzés a hát felé'],
    easy: 'Párna a combok és a has közé'
  },
  mellkas: {
    name: 'Mellkasnyitás', dur: 3.6, hold: 0.3,
    frames: [S({ a: [[-20, -20], [-18, -18]] }), S({ t: 184, hd: 192, a: [[-46, -46], [-44, -44]] })],
    cues: ['Kulcsold össze a kezed a hátad mögött', 'Lapockák össze, mellkas előre-fel', 'Ne homoríts a derékban'],
    easy: 'Törölközőt fogj a két kezedben'
  },
  melyguggolas: {
    name: 'Mély guggolás tartás', dur: 4, hold: 0.3,
    frames: [
      { t: 150, l: [[100, -32], [98, -34]], a: [[55, 160], [53, 158]] },
      { t: 154, l: [[100, -32], [98, -34]], a: [[55, 160], [53, 158]] }
    ],
    cues: ['Terpesz, lábujjak kicsit kifelé', 'Könyökkel told szét a térdeket', 'Sarok a földön; ha nem megy, tegyél alá könyvet'],
    easy: 'Kapaszkodj egy ajtókilincsbe'
  },
  kobra: {
    name: 'Kobra', dur: 4, hold: 0.25, anch: 'an',
    frames: [
      { t: 100, hd: 100, l: [[-90, -90], [-89, -89]], a: [[-70, 80], [-68, 82]], fo: [-90, -90] },
      { t: 126, hd: 135, l: [[-90, -90], [-89, -89]], a: [[-36, 62], [-34, 64]], fo: [-90, -90] }
    ],
    cues: ['Hason, kéz a váll mellett', 'Tolj fel lassan, a csípő a talajon marad', 'Csak fájdalommentes magasságig'],
    easy: 'Alkaron támaszkodva (szfinx)'
  }
};

/* ---------- ÚJ GYAKORLATOK (1.1: eszköz nélküli alap + pulzusemelő blokk) ---------- */
EX.hasony = {
  name: 'Hason Y-emelés', dur: 3.2, hold: 0.3, anch: 'an',
  frames: [
    { t: 91, hd: 92, l: [[-90, -90], [-89, -89]], a: [[92, 92], [94, 94]], fo: [-90, -90] },
    { t: 100, hd: 106, l: [[-90, -90], [-89, -89]], a: [[126, 126], [124, 124]], fo: [-90, -90] }
  ],
  cues: ['Hason, karok előre Y alakban, hüvelykujj felfelé', 'Emeld meg a karokat és a mellkast pár centire, lapockák hátra és le', 'Tekintet a talajon, nyak hosszú; fent 2 mp tartás'],
  easy: 'Csak a karokat emeld, a mellkas maradjon a talajon'
};
EX.egylabascsipo = {
  name: 'Egylábas csípőemelés', sided: true, dur: 2.8, anch: 'an',
  frames: [
    { t: -90, hd: -90, l: [[134, 30], [134, 134]], a: [[90, 90], [92, 92]] },
    { t: -66, hd: -90, l: [[114, 18], [114, 114]], a: [[80, 90], [82, 92]] }
  ],
  cues: ['Hanyatt, egyik talp a földön, a másik láb nyújtva', 'A talajon lévő sarokkal told fel a csípőt', 'A csípő maradjon vízszintes; félidőben lábcsere'],
  easy: 'Kétlábas csípőemelés'
};
EX.lepoburpee = {
  name: 'Lépő burpee (ugrás nélkül)', mode: 'loop', dur: 4.4, anch: 'wn',
  frames: [
    S({ a: [[2, 2], [0, 0]] }),
    { t: 128, l: [[104, -36], [102, -38]], a: [[12, 12], [14, 14]] },
    { t: 113, l: [[-67, -67], [-66, -66]], a: [[-6, -6], [-4, -4]] },
    { t: 128, l: [[104, -36], [102, -38]], a: [[12, 12], [14, 14]] }
  ],
  cues: ['Guggolj le, tedd le a kezed a talajra', 'Lépj hátra egyenként plankbe, majd lépj vissza előre', 'Állj fel teljesen; egyenletes tempó, ne kapkodj'],
  easy: 'Kezek egy padon vagy széken'
};
EX.burpee = {
  name: 'Burpee (kis felugrással)', mode: 'loop', dur: 3.4, anch: 'wn',
  frames: [
    S({ a: [[176, 176], [174, 174]], air: 10 }),
    { t: 128, l: [[104, -36], [102, -38]], a: [[12, 12], [14, 14]] },
    { t: 113, l: [[-67, -67], [-66, -66]], a: [[-6, -6], [-4, -4]] },
    { t: 128, l: [[104, -36], [102, -38]], a: [[12, 12], [14, 14]] }
  ],
  cues: ['Kezek le, ugrás vagy lépés hátra plankbe', 'Vissza előre, majd kis felugrás nyújtott karral', 'Puha érkezés, térd a lábujjak irányába'],
  easy: 'Lépő burpee, ugrás nélkül'
};
EX.guggnyujto = {
  name: 'Guggolás + nyújtózás', dur: 2.2, hold: 0.08,
  frames: [S({ a: [[176, 176], [174, 174]] }), { t: 145, l: [[82, -28], [80, -30]], a: [[40, 40], [38, 38]] }],
  cues: ['Guggolj le, kezek a térdek elé', 'Felálláskor nyújtózz fel a fejed fölé', 'Tempós, folyamatos ritmus, sarok lent a földön'],
  easy: 'Kisebb guggolás, lassabban'
};
EX.arnyekbox = {
  name: 'Árnyékbox', dur: 1.1, hold: 0.06,
  frames: [
    { t: 178, l: [[14, -2], [-14, 0]], a: [[90, 90], [32, 160]] },
    { t: 178, l: [[14, -2], [-14, 0]], a: [[32, 160], [90, 90]] }
  ],
  cues: ['Kis terpesz, enyhén hajlított térd, könnyű talp', 'Váltott kézzel üss előre, a csípő is fordul', 'Ütés után a kéz visszatér az áll elé; laza vállak'],
  easy: 'Lassabb tempó, helyben járással'
};

/* Kényelmi aliasok */
EX.goblet_tempo = Object.assign({}, EX.goblet, { name: 'Goblet guggolás, 3 mp-es leengedés', dur: 4.2,
  cues: ['3 mp alatt engedd le, lent 1 mp szünet', 'Könyök a térdek között, mellkas fent', 'Erővel fel'] });
EX.fekvo_lassu = Object.assign({}, EX.fekvo, { name: 'Fekvőtámasz, lassú leengedés', dur: 3.6,
  cues: ['3 mp alatt engedd le', 'Fejtől sarokig egy vonal', 'Ha elfogy az erő: térdelő változat'] });
EX.menetel = Object.assign({}, EX.terdemeles, { name: 'Gyors térdemelés helyben', dur: 0.9,
  cues: ['Gyors tempó, könnyű talp', 'Ellentétes kar lendül', 'Ízületi panasznál: gyors járás'] });
EX.guggolas_tempo = Object.assign({}, EX.guggolas, { name: 'Guggolás, 3 mp-es leengedés', dur: 4.2,
  cues: ['3 mp alatt engedd le, lent 1 mp szünet', 'Térd a lábujjak irányába, sarok a talajon', 'Erővel fel'] });
EX.kitores_ts = Object.assign({}, EX.kitores, { kg: undefined, prop: undefined, name: 'Hátralépő kitörés',
  cues: ['Lépj hátra, a hátsó térd a talaj közelébe', 'Az első sarokkal told vissza magad', 'Váltott lábbal, egyenes törzs'],
  easy: 'Kapaszkodj egy szék támlájába' });
EX.bolgar_ts = Object.assign({}, EX.bolgar, { kg: undefined, prop: undefined, name: 'Bolgár guggolás (testsúllyal)',
  cues: ['Hátsó lábfej széken vagy kanapén', 'Engedd le egyenesen, első térd a lábfej fölött', 'Az első sarokkal told fel magad; félidőben lábcsere'] });
EX.egylabasrdl_ts = Object.assign({}, EX.egylabasrdl, { kg: undefined, prop: undefined, name: 'Egylábas román felhúzás (testsúllyal)',
  cues: ['Állóláb térde enyhén hajlít, kezek a csípőn vagy előre', 'Törzs és hátsó láb egy vonalban dől', 'Csípő maradjon vízszintes; félidőben lábcsere'] });

/* ---------- PROGRAM ----------
   Kötelező alap (~16 perc, eszköz nélkül, bárhol): bemelegítés → alap kör → nyújtás.
   Az alap A és B változata váltja egymást. Az alap kör után választható ~5 perces plusz blokk. */
const WARMUP = [['karkorzes', 30], ['macskateve', 30], ['madarkutya', 40], ['csipozsaner', 30], ['terdemeles', 30], ['wgs', 50], ['guggolas', 30]];
const COOLDOWN = [['csipohajlito', 60], ['combhajlito', 50], ['kobra', 30], ['gyermekpoz', 40], ['mellkas', 30]];

const BASE = {
  A: {
    title: 'Alap A · guggolás, nyomás, hát', short: 'Alap A',
    levels: {
      1: { work: 35, rest: 20, rounds: 2, st: ['guggolas', 'terdfekvo', 'hasony', 'plank'] },
      2: { work: 40, rest: 15, rounds: 2, st: ['guggolas_tempo', 'fekvo', 'hasony', 'plank'] },
      3: { work: 45, rest: 10, rounds: 2, st: ['bolgar_ts', 'fekvo_lassu', 'hasony', 'vallerintes'] }
    }
  },
  B: {
    title: 'Alap B · kitörés, csípő, has', short: 'Alap B',
    levels: {
      1: { work: 35, rest: 20, rounds: 2, st: ['kitores_ts', 'csipoemeles', 'halottbogar', 'menetel'] },
      2: { work: 40, rest: 15, rounds: 2, st: ['kitores_ts', 'egylabascsipo', 'oldalplank', 'hegymaszo'] },
      3: { work: 45, rest: 10, rounds: 2, st: ['egylabasrdl_ts', 'egylabascsipo', 'hollow', 'hegymaszo'] }
    }
  }
};
const BASE_CYCLE = ['A', 'B'];

const PLUS = {
  ero: { name: 'Súlyzós erő', short: 'Erő', gear: 'kézisúlyzó + kettlebell',
    levels: {
      1: { work: 30, rest: 20, rounds: 2, st: ['goblet', 'evezes', 'rdl'] },
      2: { work: 35, rest: 15, rounds: 2, st: ['goblet', 'evezes', 'vallnyomas'] },
      3: { work: 40, rest: 15, rounds: 2, st: ['goblet_tempo', 'evezes', 'terdelonyomas'] }
    } },
  kondi: { name: 'Kettlebell kondi', short: 'Kondi', gear: '20 kg kettlebell',
    levels: {
      1: { work: 30, rest: 20, rounds: 2, st: ['kbdl', 'menetel', 'kbdl'] },
      2: { work: 30, rest: 20, rounds: 2, st: ['swing', 'hegymaszo', 'swing'] },
      3: { work: 35, rest: 15, rounds: 2, st: ['swing', 'hegymaszo', 'swing1'] }
    } },
  pulzus: { name: 'Pulzusemelő (burpee és társai)', short: 'Pulzus', gear: 'eszköz nélkül',
    levels: {
      1: { work: 30, rest: 20, rounds: 2, st: ['menetel', 'lepoburpee', 'arnyekbox'] },
      2: { work: 35, rest: 15, rounds: 2, st: ['lepoburpee', 'arnyekbox', 'guggnyujto'] },
      3: { work: 35, rest: 15, rounds: 2, st: ['burpee', 'hegymaszo', 'guggnyujto'] }
    } },
  core: { name: 'Has / core', short: 'Core', gear: 'eszköz nélkül',
    levels: {
      1: { work: 30, rest: 20, rounds: 2, st: ['plank', 'halottbogar', 'oldalplank'] },
      2: { work: 35, rest: 15, rounds: 2, st: ['vallerintes', 'halottbogar', 'oldalplank'] },
      3: { work: 35, rest: 15, rounds: 2, st: ['hollow', 'oldalplank', 'vallerintes'] }
    } },
  mob: { name: 'Derék és mobilitás', short: 'Mobilitás', gear: 'eszköz nélkül',
    list: [['macskateve', 45], ['mellforgatas', 60], ['bokamobil', 60], ['melyguggolas', 45]] }
};
const PLUS_ORDER = ['ero', 'kondi', 'pulzus', 'core', 'mob'];
// Ajánlási sorrend: hetente kb. 2× erő, a többi felváltva
const PLUS_CYCLE = ['ero', 'pulzus', 'core', 'kondi', 'ero', 'mob'];

const LEVELS = {
  1: { name: 'Alapozás', note: 'Technika és szokás. Az alap mindig kb. 16 perc; a szintekkel a gyakorlatok nehezednek, nem az idő nő.' },
  2: { name: 'Építés', note: 'Normál fekvőtámasz, egylábas csípőemelés, rövidebb pihenők.' },
  3: { name: 'Erősödés', note: 'Bolgár guggolás, lassú fekvőtámasz, egylábas változatok, 45 mp munka.' }
};
const LEVEL_UP = { good: 12, days: 21 };   // 12 jó érzetű, teljes alap edzés és legalább 3 hét a szinten

/* Lépéslista: {kind, ex, dur, sec, sided, round, rounds, part: 'warm'|'base'|'plus'|'cool', brief, plusStart} */
function circuit(push, P, sec, part, briefText) {
  push({ kind: 'trans', ex: P.st[0], dur: part === 'plus' ? 10 : 15, sec, part, brief: briefText, plusStart: part === 'plus' });
  for (let r = 1; r <= P.rounds; r++) {
    P.st.forEach((id, i) => {
      const last = r === P.rounds && i === P.st.length - 1;
      push({ kind: 'work', ex: id, dur: P.work, sec, part, round: r, rounds: P.rounds, sided: !!EX[id].sided });
      if (!last) {
        const nx = i < P.st.length - 1 ? P.st[i + 1] : P.st[0];
        push({ kind: 'rest', ex: nx, dur: P.rest, sec, part, round: i < P.st.length - 1 ? r : r + 1, rounds: P.rounds });
      }
    });
  }
}
function plusSpec(plus, level) {
  const B = PLUS[plus];
  return B ? (B.levels ? B.levels[level] : null) : null;
}
function buildSteps(type, level, plus) {
  const steps = [];
  const push = s => steps.push(s);
  push({ kind: 'prep', ex: WARMUP[0][0], dur: 10, sec: 'Bemelegítés', part: 'warm' });
  WARMUP.forEach(([id, d], i) => {
    if (i > 0) push({ kind: 'trans', ex: id, dur: 5, sec: 'Bemelegítés', part: 'warm' });
    push({ kind: 'work', ex: id, dur: d, sec: 'Bemelegítés', part: 'warm', sided: !!EX[id].sided });
  });
  const P = BASE[type].levels[level];
  circuit(push, P, 'Alap kör', 'base',
    `Alap kör: ${P.rounds} kör, ${P.work} mp munka, ${P.rest} mp pihenő. Eszköz nélkül, bárhol megy. Egyenletes tempó, tiszta technika.`);
  if (plus && PLUS[plus]) pushPlus(push, plus, level);
  COOLDOWN.forEach(([id, d], i) => {
    push({ kind: 'trans', ex: id, dur: i === 0 ? 10 : 5, sec: 'Nyújtás', part: 'cool' });
    push({ kind: 'work', ex: id, dur: d, sec: 'Nyújtás', part: 'cool', sided: !!EX[id].sided });
  });
  return steps;
}

/* A plusz blokk lépései (az alap után, vagy önállóan indítva) */
function pushPlus(push, plus, level, solo) {
  const B = PLUS[plus], sec = 'Plusz: ' + B.short;
  if (B.list) {
    B.list.forEach(([id, d], i) => {
      push({ kind: 'trans', ex: id, dur: i === 0 ? 10 : 8, sec, part: 'plus', plusStart: i === 0 && !solo,
        brief: i === 0 ? `Plusz blokk: ${B.name}. Lassan, a fájdalommentes tartományban.` : undefined });
      push({ kind: 'work', ex: id, dur: d, sec, part: 'plus', sided: !!EX[id].sided });
    });
  } else {
    const Q = B.levels[level];
    circuit(push, Q, sec, 'plus', `Plusz blokk: ${B.name}, ${Q.rounds} kör, ${Q.work} mp munka, ${Q.rest} mp pihenő.` +
      (plus === 'ero' ? ' Akkor jó a súly, ha a munkaidő végén még kb. 2 ismétlés maradna benned.' : ''));
  }
}
/* Csak a plusz blokk: rövid bemelegítés + blokk + rövid nyújtás (kb. 8–10 perc) */
const MINI_WARM = [['karkorzes', 30], ['macskateve', 30], ['csipozsaner', 30], ['guggolas', 30]];
const MINI_COOL = [['csipohajlito', 60], ['kobra', 30], ['gyermekpoz', 40]];
function buildPlusOnly(plus, level) {
  const steps = [];
  const push = s => steps.push(s);
  push({ kind: 'prep', ex: MINI_WARM[0][0], dur: 10, sec: 'Bemelegítés', part: 'warm' });
  MINI_WARM.forEach(([id, d], i) => {
    if (i > 0) push({ kind: 'trans', ex: id, dur: 5, sec: 'Bemelegítés', part: 'warm' });
    push({ kind: 'work', ex: id, dur: d, sec: 'Bemelegítés', part: 'warm', sided: !!EX[id].sided });
  });
  pushPlus(push, plus, level, true);
  steps.forEach(s => { s.plusStart = false; });
  MINI_COOL.forEach(([id, d], i) => {
    push({ kind: 'trans', ex: id, dur: i === 0 ? 10 : 5, sec: 'Nyújtás', part: 'cool' });
    push({ kind: 'work', ex: id, dur: d, sec: 'Nyújtás', part: 'cool', sided: !!EX[id].sided });
  });
  return steps;
}
const totalSec = steps => steps.reduce((a, s) => a + s.dur, 0);
Object.keys(EX).forEach(k => { EX[k].__id = k; });   // azonosító a 3D mozgásrögzítéshez
