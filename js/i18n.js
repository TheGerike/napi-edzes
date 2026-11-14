/* Nyelv (magyar / angol).
   A felület magyarul készül; angol módban ez a réteg fordít:
   1) az adatokat (gyakorlatok, blokkok, szintek) betöltéskor angolra cseréli,
   2) a megjelenő szövegeket (szövegcsomópontok, aria-label, title) egy szótár és mintaszabályok alapján fordítja,
   3) a felolvasást angol hangra állítja.
   Bővíthető: új nyelvhez új szótár kell ugyanebben a szerkezetben. */
(function () {
  'use strict';
  const LS_LANG = 'napiEdzes.lang';
  let lang = null;
  try { lang = localStorage.getItem(LS_LANG); } catch (e) {}
  if (lang !== 'hu' && lang !== 'en') lang = /^hu\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || 'hu') ? 'hu' : 'en';

  /* ---------- gyakorlatok: [név, könnyítés, ...tippek] ---------- */
  const EXN = {
    karkorzes: ['Arm circles', 'Smaller circles, elbows bent', 'Straight arms, big circles', 'Switch direction halfway', 'Brace your abs lightly'],
    csipozsaner: ['Hip hinge', 'Smaller range, hands sliding down your thighs', 'Push your hips back, like closing a door with your butt', 'Flat back, soft knees', 'Feel the stretch in your hamstrings'],
    terdemeles: ['Alternating knee raises', 'March in place with lower knees', 'Knee to hip height', 'Opposite arm swings', 'Tall torso'],
    guggolas: ['Bodyweight squat', 'Squat to a chair (touch, stand up)', 'Knees track over your toes', 'Heels down the whole time', 'Slow down, drive up'],
    wgs: ['Lunge + thoracic twist', 'Back knee on the floor', 'Deep lunge, back leg straight', 'Inside hand on the floor, reach the other arm to the sky', 'Follow your hand with your eyes'],
    macskateve: ['Cat–cow', 'Smaller movement, pain-free range only', 'On all fours, hands under shoulders, knees under hips', 'Round your back as you exhale, arch as you inhale', 'Slowly, one vertebra at a time'],
    bokamobil: ['Kneeling ankle mobility', 'Smaller forward push', 'Half kneeling, front foot flat', 'Drive the knee forward over the toes', 'Keep the heel down'],
    mellforgatas: ['Quadruped thoracic rotation', 'Smaller rotation', 'On all fours, one hand behind your head', 'Rotate the elbow to the sky, then toward the other arm', 'Keep your hips still'],
    goblet: ['Goblet squat (kettlebell)', 'Bodyweight squat or a single dumbbell', 'Hold the kettlebell by the horns at your chest', 'Elbows inside the knees, chest up', 'At least to mid-thigh, heels down'],
    fekvo: ['Push-up', 'Knee push-up or hands on a raised surface', 'One line from head to heels', 'Elbows at 45° to your body', 'Chest close to the floor'],
    terdfekvo: ['Knee push-up', 'Wall push-up', 'One line from knees to head, don’t break at the hips', 'Hands slightly wider than shoulders', 'Slow down, push up strong'],
    evezes: ['One-arm row (dumbbell)', 'Lighter weight, or two hands on one dumbbell', 'Free hand on your front thigh, flat back', 'Pull your elbow toward your hip', 'Hold 1 s at the top, lower slowly'],
    plank: ['Forearm plank', 'Plank on your knees', 'Elbows under your shoulders', 'Glutes and abs tight, don’t let your lower back sag', 'Calm, steady breathing'],
    kbdl: ['Kettlebell deadlift', 'Kettlebell raised (e.g. on a book)', 'Kettlebell between your feet', 'Hips back, flat back, shoulders over the bell', 'Drive through your heels, squeeze your glutes at the top'],
    swing: ['Kettlebell swing', 'Kettlebell deadlift (no swing)', 'Swing from the hips, not the arms: arms just hold on', 'Bell between your thighs at the bottom, tall body at the top', 'Squeeze your glutes at the top, don’t lean back'],
    swing1: ['One-arm swing', 'Two-hand swing', 'Like the two-hand swing, with one hand', 'Shoulder down and back, no torso twist', 'Switch hands halfway'],
    halottbogar: ['Dead bug', 'Move only your legs', 'On your back, lower back pressed to the floor', 'Slowly extend the opposite arm and leg', 'Exhale as you extend, alternate sides'],
    hegymaszo: ['Mountain climbers', 'Slow, stepping version', 'High plank, shoulders over wrists', 'Drive your knees toward your chest, alternating', 'Keep your hips from bouncing'],
    oldalplank: ['Side plank', 'From your knees', 'Elbow under your shoulder', 'Lift your hips into one line', 'Switch sides halfway'],
    csipoemeles: ['Glute bridge', 'Smaller range of motion', 'On your back, feet flat', 'Drive your hips up through your heels', 'Hold 1–2 s at the top, squeeze your glutes'],
    kitores: ['Reverse lunge', 'No weight, hold on to something', 'Level 1 without weight, dumbbells from level 2', 'Step back, back knee close to the floor, push back up through the front heel', 'Alternate legs, tall torso'],
    vallnyomas: ['Overhead press (dumbbells)', 'Fewer plates, or press one arm at a time', 'Standing, abs and glutes tight, don’t arch', 'Start lighter than you think: the press is the weakest lift', 'Lower slowly back to your shoulders'],
    rdl: ['Romanian deadlift (dumbbells)', 'Less depth, lighter weight', 'Slight knee bend throughout', 'Hips back, weights slide down the front of your thighs', 'To mid-shin, flat back'],
    bolgar: ['Bulgarian split squat', 'Reverse lunge', 'Back foot on a chair or sofa', 'Lower straight down, front knee over the foot', 'Drive up through the front heel'],
    terdelonyomas: ['Half-kneeling one-arm press', 'Standing, two hands', 'Half kneeling, back knee on the pressing side', 'Glutes tight, tall torso', 'Press overhead, don’t lean sideways'],
    egylabasrdl: ['Single-leg Romanian deadlift', 'Back toes on the floor (kickstand)', 'Slight bend in the standing knee', 'Torso and back leg tilt as one line', 'Keep your hips level'],
    hollow: ['Hollow hold', 'Knees bent, arms by your sides', 'On your back, lower back pressed to the floor', 'Shoulders and legs just off the floor', 'If your lower back arches, raise your legs'],
    vallerintes: ['Plank shoulder taps', 'From your knees', 'High plank, feet slightly apart', 'Tap the opposite shoulder, alternating', 'Keep your hips from rocking'],
    csipohajlito: ['Hip flexor stretch', 'Shorter step, hold on to something', 'Half kneeling, back knee on a cushion', 'Squeeze your glutes, push your hips forward', 'Reach up with the arm on the back-leg side'],
    combhajlito: ['Lying hamstring stretch', 'Slight knee bend', 'On your back, loop a towel around your foot', 'Pull the straight leg up, lower back stays down', 'Hold where you feel it, no bouncing'],
    madarkutya: ['Bird dog', 'Extend only the leg or only the arm', 'On all fours, abs lightly braced', 'Extend one arm and the opposite leg', 'Don’t arch your lower back, hold 2 s at the top'],
    gyermekpoz: ['Child’s pose with reach', 'Cushion between thighs and belly', 'Sit back on your heels, forehead toward the floor', 'Reach your arms forward', 'Slow, deep breaths into your back'],
    mellkas: ['Chest opener', 'Hold a towel in both hands', 'Clasp your hands behind your back', 'Shoulder blades together, chest forward and up', 'Don’t arch your lower back'],
    melyguggolas: ['Deep squat hold', 'Hold on to a door handle', 'Wide stance, toes slightly out', 'Push your knees apart with your elbows', 'Heels down; if you can’t, put a book under them'],
    kobra: ['Cobra', 'On your forearms (sphinx)', 'Face down, hands next to your shoulders', 'Push up slowly, hips stay on the floor', 'Only as high as is pain-free'],
    lehuzas: ['Prone pulldown', 'Chest stays down, only the arms work', 'Face down, arms forward, pull a towel taut (or make fists)', 'Lift chest a few cm, pull elbows down toward your waist into a W, like a pull-up', 'Squeeze shoulder blades 2 s at the bottom, return slowly'],
    hasony: ['Prone Y raise', 'Lift only your arms, chest stays down', 'Face down, arms forward in a Y, thumbs up', 'Lift arms and chest a few cm, shoulder blades back and down', 'Eyes on the floor, long neck; hold 2 s at the top'],
    egylabascsipo: ['Single-leg glute bridge', 'Two-leg glute bridge', 'On your back, one foot down, the other leg straight', 'Drive your hips up through the planted heel', 'Keep your hips level; switch legs halfway'],
    lepoburpee: ['Step-back burpee (no jump)', 'Hands on a bench or chair', 'Squat down, hands on the floor', 'Step back to a plank one foot at a time, then step back in', 'Stand all the way up; steady pace, don’t rush'],
    burpee: ['Burpee (small jump)', 'Step-back burpee, no jump', 'Hands down, jump or step back to a plank', 'Back in, then a small jump with arms up', 'Soft landing, knees over toes'],
    guggnyujto: ['Squat + reach', 'Smaller squat, slower', 'Squat down, hands in front of your knees', 'Reach overhead as you stand up', 'Brisk, continuous rhythm, heels down'],
    terpesz: ['Jumping jacks', 'Step-out version: no jump, step out to the side alternately', 'Land softly on the balls of your feet', 'Arms up and feet apart at the same time', 'Brace your abs, straight back'],
    arnyekbox: ['Shadow boxing', 'Slower pace, marching in place', 'Narrow stance, soft knees, light feet', 'Punch forward with alternating hands, hips turn too', 'Hands back to your chin after each punch; loose shoulders'],
    goblet_tempo: ['Goblet squat, 3 s lowering', 'Bodyweight squat or a single dumbbell', 'Lower over 3 s, pause 1 s at the bottom', 'Elbows inside the knees, chest up', 'Drive up strong'],
    fekvo_lassu: ['Push-up, slow lowering', 'Knee push-up or hands on a raised surface', 'Lower over 3 s', 'One line from head to heels', 'When you run out of strength: knee version'],
    menetel: ['High knees in place', 'March in place with lower knees', 'Fast pace, light feet', 'Opposite arm swings', 'With joint pain: brisk walk instead'],
    guggolas_tempo: ['Squat, 3 s lowering', 'Squat to a chair (touch, stand up)', 'Lower over 3 s, pause 1 s at the bottom', 'Knees over toes, heels down', 'Drive up strong'],
    kitores_ts: ['Reverse lunge', 'Hold on to the back of a chair', 'Step back, back knee close to the floor', 'Push back up through the front heel', 'Alternate legs, tall torso'],
    bolgar_ts: ['Bulgarian split squat (bodyweight)', 'Reverse lunge', 'Back foot on a chair or sofa', 'Lower straight down, front knee over the foot', 'Drive up through the front heel; switch legs halfway'],
    egylabasrdl_ts: ['Single-leg Romanian deadlift (bodyweight)', 'Back toes on the floor (kickstand)', 'Slight bend in the standing knee, hands on hips or forward', 'Torso and back leg tilt as one line', 'Keep your hips level; switch legs halfway']
  };
  const BASEN = { A: ['Base A · squat, push, back', 'Base A'], B: ['Base B · lunge, hips, core', 'Base B'] };
  const PLUSN = {
    ero: ['Dumbbell strength', 'Strength', 'dumbbells + kettlebell'], kondi: ['Kettlebell conditioning', 'Swing', 'kettlebell'],
    pulzus: ['Cardio burst (burpees & co.)', 'Cardio', 'no equipment'], core: ['Abs / core', 'Core', 'no equipment'],
    mob: ['Lower back & mobility', 'Mobility', 'no equipment']
  };
  const LEVN = {
    1: ['Foundation', 'Technique and habit. The base is always about 16 min; levels make the exercises harder, not longer.'],
    2: ['Build', 'Full push-ups, single-leg bridges, shorter rests.'],
    3: ['Strength', 'Bulgarian split squats, slow push-ups, single-leg variations, 45 s work.']
  };

  /* ---------- felület: pontos szövegek ---------- */
  const EN = {
    'Napi edzés': '16BX', 'NeonRep': '16BX', '16BX': '16BX',
    'Az edződ': 'Your trainer', 'Edző karakter': 'Trainer',
    'kiberpunk lány': 'cyberpunk girl', 'szamurájsisakos': 'samurai helmet', 'kiborg, kard a hátán': 'cyborg, sword on back', 'kiborg műkarral': 'cyborg arm',
    'Mai alap': 'Today’s base', 'Kiválasztott alap': 'Selected base', 'ma már edzettél': 'you already trained today',
    'Csak az alap': 'Base only', 'csak alap': 'base only', 'Nincs': 'None', 'nincs': 'none',
    'Alap változat': 'Base variant', 'Plusz blokk': 'Extra block', 'plusz blokk': 'extra block', 'Plusz blokk önállóan': 'Extra block on its own',
    'Plusz blokk az alap kör után': 'Extra block after the base circuit', 'Csak egy plusz blokk': 'Just an extra block',
    'Önállóan indítható, rövid bemelegítéssel és nyújtással, kb. 9–10 perc. Jó például délután egy második, rövid edzésnek.': 'Runs on its own with a short warm-up and stretch, about 9–10 min. Great as a quick second session in the afternoon.',
    'A pötty az ajánlott blokkot jelöli. Az alap kör végén még meggondolhatod.': 'The dot marks the recommended block. You can still change your mind after the base circuit.',
    'Az alap a kötelező rész: eszköz nélkül, bárhol megy. Az A és a B felváltva jön (a pötty jelöli a következőt).': 'The base is the must-do part: no equipment, works anywhere. A and B alternate (the dot marks the next one).',
    'Az edzés tartalma': 'Workout content', 'Koppints egy gyakorlatra, és onnan indul.': 'Tap an exercise to start from there.',
    'Bemelegítés': 'Warm-up', 'Nyújtás': 'Stretch', 'Alap kör': 'Base circuit',
    'Beállítások': 'Settings', 'Hangjelzés': 'Sounds', 'Felolvasás': 'Voice', 'Automatikus továbblépés': 'Auto-advance', 'Kijelző ébren tartása': 'Keep screen awake',
    'Bemondja a következő gyakorlatot és az oldalcserét.': 'Announces the next exercise and side switches.',
    'Ha kikapcsolod, minden gyakorlat végén megáll, és te lépsz tovább.': 'If off, it stops after each exercise and you move on yourself.',
    'Edzés közben nem alszik el a telefon.': 'Your phone won’t sleep during a workout.',
    'Az adataid csak ezen a telefonon tárolódnak. Készíts rendszeresen mentést.': 'Your data is stored only on this phone. Make backups regularly.',
    'Eszközeim': 'My equipment', 'Ami otthon van. Ehhez igazodnak a plusz blokkok és a súlyjavaslatok.': 'What you have at home. Extra blocks and weight suggestions adapt to it.',
    'Kettlebell': 'Kettlebell', 'Kézisúlyzó (max / kéz)': 'Dumbbells (max / hand)',
    'Nyelv': 'Language', 'A felület és a felolvasás nyelve.': 'Language of the app and the voice.',
    'Zene: Spotify lejátszási lista': 'Music: Spotify playlist',
    'A „Zene” gomb ezt nyitja meg a Spotify appban. Bármelyik lista linkjét beillesztheted (Spotify: Megosztás → Link másolása).': 'The Music button opens this in the Spotify app. Paste any playlist link (Spotify: Share → Copy link).',
    'Mentés': 'Save', '♫ Zene indítása (Spotify)': '♫ Play music (Spotify)', 'Zene a Spotifyban': 'Music on Spotify',
    'Mentés és visszaállítás': 'Backup & restore',
    'A mentés tartalmazza a naplót, a szintet és a beállításokat. iPhone-on a fájl a Fájlok appba kerül. Új telefonon innen töltheted vissza.': 'A backup contains your log, level and settings. On iPhone the file goes to the Files app. On a new phone, restore it from here.',
    'Mentés fájlba': 'Save to file', 'Visszaállítás fájlból': 'Restore from file', 'Másolás vágólapra': 'Copy to clipboard', 'Beillesztés szövegből': 'Paste from text',
    'Összes adat törlése': 'Delete all data', 'Napló': 'Log', 'Törlés': 'Delete', 'Edzés törlése': 'Delete workout',
    'Még nincs elvégzett edzés. Az első után itt látod a naplót.': 'No workouts yet. Your log will show up here after the first one.',
    'Ez a hét': 'This week', 'nap egymás után': 'days in a row', 'edzés összesen': 'workouts total', 'perc összesen': 'minutes total',
    'Tudnivalók': 'Good to know', 'Hogyan működik?': 'How does it work?', 'Derékkímélés': 'Protecting your lower back',
    'Kardió, séta, fogyás': 'Cardio, walking, weight loss', 'Mikor legyen könnyebb nap?': 'When to take it easier?', 'Mikor emelj?': 'When to go heavier?',
    'A karakterek forrása': 'Character credits',
    'Szint fel': 'Level up', 'Szint le': 'Level down',
    'Folytatás': 'Resume', 'Elvetés': 'Discard',
    // lejátszó
    'KÉSZÜLJ': 'GET READY', 'Készülj': 'Get ready', 'MUNKA': 'WORK', 'PIHENŐ': 'REST', 'Pihenő': 'Rest', 'Lista': 'List', 'Kilépés': 'Exit',
    'Újra': 'Restart', 'Előző': 'Back', 'Szünet': 'Pause', 'Tovább': 'Next', 'Következő': 'Next', 'Szüneteltetve': 'Paused', 'Indítás': 'Start',
    'Ez a következő gyakorlat': 'Up next', 'Könnyítés:': 'Easier:', 'Gyakorlat újrakezdése': 'Restart exercise', 'Előző gyakorlat': 'Previous exercise',
    'Következő gyakorlat': 'Next exercise', 'A gyakorlat ábrája': 'Exercise animation', 'A gyakorlat 3D ábrája': 'Exercise 3D animation',
    'Ugrás gyakorlatra': 'Jump to exercise', 'Bezárás': 'Close', 'Mégse': 'Cancel', 'Kész': 'Done', 'Kész?': 'Done?',
    'Kilépsz az edzésből?': 'Leave the workout?', 'Kilépés mentés nélkül': 'Exit without saving',
    'Az alap kész ✓': 'Base done ✓', 'Ez volt a kötelező rész, ez már teljes edzésnek számít. Jöhet a plusz blokk, vagy mehetsz a nyújtásra.': 'That was the must-do part, it already counts as a full workout. Go for the extra block, or move on to the stretch.',
    'Kihagyom, jöhet a nyújtás': 'Skip it, go to the stretch', 'Vagy válassz másikat': 'Or pick another one', 'Váltok': 'Switch',
    'Jöhet:': 'Next up:', 'Lépés:': 'Step:', 'Váltás:': 'Switch:',
    // befejezés
    'Kész! Szép munka.': 'Done! Great work.', 'Ne mentsd, csak kipróbáltam': 'Don’t save, I was just trying it',
    'Könnyű': 'Easy', 'Pont jó': 'Just right', 'Nehéz': 'Hard', 'Fájt valami': 'Something hurt',
    'Maradt bőven erőm': 'Plenty left in the tank', 'Kihívás, de tiszta technika': 'Challenging, but clean technique', 'A végén szétesett a forma': 'Form broke down at the end',
    'Derék, térd, váll…': 'Lower back, knee, shoulder…', 'Kész, vissza a kezdőlapra': 'Done, back to home', 'Kész, tovább': 'Done, continue',
    'Pont ez a cél. Így haladsz a legbiztosabban.': 'That’s exactly the goal. This is the surest way to progress.',
    'Remek. Ha többször is könnyű, lassítsd a leengedést, vagy lépj szintet, amikor a feltétel teljesül.': 'Great. If it keeps feeling easy, slow down the lowering, or level up once you qualify.',
    'Rendben. Maradj ezen a szinten, és ahol szétesik a forma, használd a könnyítést.': 'OK. Stay at this level, and use the easier option where your form breaks down.',
    'A következő 2 alkalommal használd a könnyítéseket; plusz blokknak a Derék és mobilitást ajánlom. Éles, lábba sugárzó vagy egy hétnél tovább tartó fájdalomnál fordulj orvoshoz.': 'Use the easier options for the next 2 sessions; for the extra block I recommend Lower back & mobility. For sharp pain, pain radiating into the leg, or pain lasting over a week, see a doctor.',
    'Megvan a feltétel a következő szinthez.': 'You qualify for the next level.', 'Ez a legfelső szint. Innen súlyemeléssel haladunk tovább: szólj, és összerakjuk a következő blokkot.': 'This is the top level. From here you progress by adding weight.',
    'A szintlépés számlálója újraindul.': 'The level-up counter restarts.',
    // mentés, sheet
    'Törlöd ezt az edzést?': 'Delete this workout?', 'Igen, törlöm': 'Yes, delete', 'Minden adat törlése?': 'Delete all data?',
    'A napló, a szint és a beállítások visszaállnak alapra. Ez nem vonható vissza.': 'Your log, level and settings will be reset. This can’t be undone.',
    'Visszaállítod a mentést?': 'Restore the backup?', 'Igen, visszaállítom': 'Yes, restore', 'Visszaállítás': 'Restore', 'Visszaállítás szövegből': 'Restore from text',
    'Illeszd be ide a korábban kimásolt mentést.': 'Paste the backup you copied earlier here.',
    'Kimásoltad a mentést. Illeszd be egy jegyzetbe vagy üzenetbe, és őrizd meg.': 'Backup copied. Paste it into a note or message and keep it safe.',
    'Kész a mentés. Tedd biztos helyre, például a Fájlok appba vagy a felhőbe.': 'Backup ready. Keep it somewhere safe, e.g. the Files app or the cloud.',
    'A fájlmentés nem sikerült. Próbáld a Másolás vágólapra gombot.': 'Saving the file failed. Try Copy to clipboard.',
    'Nem sikerült beolvasni a fájlt.': 'Couldn’t read the file.', 'Mentés szövegként': 'Backup as text', 'Mentés ideje': 'Backup time',
    'Jelöld ki és másold ki az egészet, majd tedd el egy jegyzetbe.': 'Select and copy all of it, then keep it in a note.',
    'Ez nem érvényes 16BX mentés. Ellenőrizd, hogy a jó fájlt választottad.': 'This isn’t a valid backup. Check that you picked the right file.',
    'Ez nem érvényes 16BX mentés. Ellenőrizd, hogy a teljes mentést illesztetted be.': 'This isn’t a valid backup. Check that you pasted the whole thing.',
    'Ez nem Spotify-link': 'That’s not a Spotify link', 'Rendben': 'OK',
    'A link így kezdődjön: https://open.spotify.com/ (Spotify appban: Megosztás → Link másolása).': 'The link should start with https://open.spotify.com/ (in Spotify: Share → Copy link).',
    'Új verzió érhető el': 'New version available', 'Frissítés': 'Update', 'Frissítés…': 'Updating…',
    'Ikon a kezdőképernyőre': 'Add to Home Screen', 'Rendben, elrejtem': 'OK, hide this',
    'Telepítsd az alkalmazást: Safariban koppints a Megosztás gombra, majd a „Főképernyőhöz adás” pontra. Így teljes képernyőn, internet nélkül is fut.': 'Install the app: in Safari tap Share, then “Add to Home Screen”. It then runs full screen, even offline.',
    'MENTVE': 'SAVED', 'KÉSZ': 'DONE', 'Milyen volt?': 'How was it?', 'Ismétlés': 'Again', 'A kezdőlapon tudsz váltani.': 'You can switch on the home screen.',
    'Folytatom': 'Keep going', 'Befejezem és mentem': 'Finish and save', 'Edzések': 'Workouts', 'Szint': 'Level', 'még nincs': 'none yet',
    'Félbehagyott edzés:': 'Unfinished workout:', 'eleje': 'start', 'Szintlépés:': 'Level up:', 'Elvetés': 'Discard',
    'Utolsó edzés': 'Last workout', 'Következik': 'Up next', 'Edzés': 'Workout', 'Korábbi edzés': 'Earlier workout', 'részleges': 'partial',
    // Tudnivalók
    'Az alap a kötelező rész:': 'The base is the must-do part:',
    'kb. 16 perc, eszköz nélkül, bárhol (otthon, szállodában, nyaralás alatt is): bemelegítés, alap kör, nyújtás. Az': 'about 16 min, no equipment, anywhere (home, hotel, on holiday): warm-up, base circuit, stretch.',
    '(guggolás, nyomás, hát) és a': '(squat, push, back) and',
    '(kitörés, csípő, has) felváltva jön.': '(lunge, hips, core) alternate.',
    'Az alap kör után jöhet egy kb. 5 perces': 'After the base circuit you can add an approx. 5-minute',
    ': súlyzós erő, kettlebell kondi, pulzusemelő, has/core vagy derék és mobilitás. Az app ajánl egyet (hetente kb. kétszer erőt), de átírhatod, vagy kihagyhatod. A nyújtás mindig a végén van.': ': dumbbell strength, kettlebell conditioning, cardio burst, abs/core, or lower back & mobility. The app recommends one (strength about twice a week), but you can change or skip it. The stretch always comes last.',
    'Heti 6–7 alkalom a cél. Egy nehéz napon is megvan az alap: ez építi a rutint.': 'Aim for 6–7 sessions a week. Even on a hard day, do the base: that’s what builds the habit.',
    'Edzés közben bármikor visszaléphetsz, újrakezdheted a gyakorlatot, vagy a Lista gombbal bárhová ugorhatsz.': 'During a workout you can go back, restart an exercise, or jump anywhere with the List button.',
    'Minden súlyzós gyakorlatnál ott a javasolt kezdősúly. Az első héten inkább a könnyebb végét válaszd, és a technikára figyelj.': 'Every weighted exercise shows a suggested starting weight. In the first week pick the lighter end and focus on technique.',
    'Akkor jó a terhelés, ha a munkaidő végén még kb. 2 tiszta ismétlés maradna benned.': 'The load is right if you’d have about 2 clean reps left at the end of the work time.',
    'Ha két egymás utáni alkalommal 3-nál több ismétlés maradna, tegyél fel 1–2 kg-ot. Ha szétesik a forma, vegyél le.': 'If you’d have more than 3 reps left two sessions in a row, add 1–2 kg. If your form breaks down, go lighter.',
    'A szintek a gyakorlatokat nehezítik, a tárcsák a terhelést. A kettő együtt adja a fejlődést.': 'Levels make the exercises harder, plates make the load heavier. Together they drive progress.',
    'Minden emelésnél előbb feszítsd meg a hasad, mintha ütést várnál, és csípőből hajolj, ne a derekadból.': 'Before every lift, brace your abs as if bracing for a punch, and hinge from the hips, not your lower back.',
    'A swing csak akkor jön, ha a kettlebell felhúzás már magabiztos (2. szinttől). A pulzusemelő blokkban az ugrós burpee csak 3. szinten van; ha a térd vagy a derék jelez, maradj a lépő változatnál.': 'Swings come only once the kettlebell deadlift is solid (from level 2). Jumping burpees appear only at level 3 of the cardio block; if your knees or back complain, stick to the step-back version.',
    'Éles, szúró vagy lábba sugárzó fájdalomnál állj le. Ha egy hétnél tovább tart, vagy zsibbadás is van, menj orvoshoz.': 'Stop for sharp, stabbing pain or pain radiating into the leg. If it lasts over a week, or there’s numbness, see a doctor.',
    'Ülőmunka mellett 45–60 percenként állj fel 2 percre: csípőhajlító-nyújtás és kobra.': 'With a desk job, stand up for 2 min every 45–60 min: hip flexor stretch and cobra.',
    'A napi 16 perces alap és a plusz blokk főleg erőt, mozgékonyságot és szokást épít. A fogyást a séta és az étkezés viszi, fehérjével minden főétkezésnél.': 'The daily 16-minute base and the extra block mainly build strength, mobility and habit. Weight loss comes from walking and eating, with protein at every main meal.',
    'Tempós séta heti 3×30–45 perc': 'Brisk walks 3×30–45 min a week',
    ', emelkedővel. Pulzus kb. 120–135, még beszélni tudsz, de énekelni már nem. Ez emeli leginkább a VO2max-ot.': ', with some incline. Heart rate about 120–135: you can still talk, but not sing. This raises your VO2max the most.',
    'napi minimum 8 ezer. Ha egy nap ülős (iroda, autó), ebéd vagy vacsora után 15 perc séta.': 'at least 8,000 a day. On a sitting day (office, car), a 15-minute walk after lunch or dinner.',
    'Lépés:': 'Steps:',
    'Napi 3× egy perc lendület:': '3× one minute of vigour a day:',
    'lépcsőzz vagy sietve menj valahová, hogy kifulladj egy kicsit. Akár ennyi is mérhetően csökkenti a halálozási kockázatot azoknál, akik nem sportolnak.': 'take the stairs or hurry somewhere until you’re a little out of breath. Even this measurably lowers mortality risk in people who don’t exercise.',
    'Miért 16BX?': 'Why 16BX?',
    'Az 1950-es évek kanadai légierős programjainak örököse: az 5BX (5 gyakorlat, férfiaknak) és az XBX (10 gyakorlat, nőknek) napi pár percben edzette a szolgálatot. A 16BX ugyanez mai tudással: 16 gyakorlat, eszköz nélkül, kb. 16 perc.': 'Heir to the Royal Canadian Air Force plans of the late 1950s: 5BX (5 exercises, for men) and XBX (10 exercises, for women) kept personnel fit in a few minutes a day. 16BX is the same idea with today’s science: 16 exercises, no equipment, about 16 minutes.',
    'Lefedi az alap mozgásmintákat: guggolás, csípőzsanér, kitörés, nyomás, húzás, törzs és mobilitás.': 'It covers the basic movement patterns: squat, hip hinge, lunge, push, pull, core and mobility.',
    'Apple Watch-on indíts „Funkcionális erőnléti edzés”-t az app mellett, sétánál „Szabadtéri séta”-t.': 'On Apple Watch, start “Functional Strength Training” alongside the app, and “Outdoor Walk” for walks.',
    'Ha 2–3 egymás utáni reggel a nyugalmi pulzus 5+ ütéssel a szokásos fölött van, és a HRV is jóval alacsonyabb, csak az alapot csináld a Derék és mobilitás blokkal, és sétálj.': 'If your resting heart rate is 5+ beats above normal for 2–3 mornings in a row and HRV is clearly lower, do only the base with the Lower back & mobility block, and walk.',
    'Egyetlen alacsony HRV-érték önmagában nem jelent semmit, a több napos trend számít.': 'A single low HRV reading means nothing on its own; the multi-day trend is what counts.',
    'Mozgások:': 'Movements:',
    'Neon:': 'Neon:', 'Shade:': 'Shade:', 'Katana:': 'Katana:', 'Ronin:': 'Ronin:',
    '„Character Cyberpunk FREE 3d”, készítette OSCAR CREATIVO (sketchfab.com/oscar_creativo), CC BY-NC 4.0 licenc. Átalakítva: fegyverek nélkül, telefonra optimalizálva.': '“Character Cyberpunk FREE 3d” by OSCAR CREATIVO (sketchfab.com/oscar_creativo), CC BY-NC 4.0. Modified: weapons removed, optimized for phones.',
    '„Cyberpunk character”, készítette 4d_Bob (sketchfab.com/3d_Bob), CC BY 4.0 licenc. Telefonra optimalizálva.': '“Cyberpunk character” by 4d_Bob (sketchfab.com/3d_Bob), CC BY 4.0. Optimized for phones.',
    '„Cyborg with Thermal Katana”, készítette SpatialNeglect (sketchfab.com/jeandiz), Sketchfab Free Standard licenc. Pisztoly nélkül, a kard a hátára került.': '“Cyborg with Thermal Katana” by SpatialNeglect (sketchfab.com/jeandiz), Sketchfab Free Standard license. Pistol removed, sword moved to the back.',
    '„Shade of Neo-Tokyo”, készítette Moon dong hwa (sketchfab.com/moondonghwa), CC BY 4.0 licenc. Felirat nélkül, telefonra optimalizálva.': '“Shade of Neo-Tokyo” by Moon dong hwa (sketchfab.com/moondonghwa), CC BY 4.0. Text bubble removed, optimized for phones.',
    'a guggolás, a goblet guggolás, a fekvőtámasz, a burpee, a terpeszugrás és az árnyékbox valódi emberről rögzített mozgás (Mixamo, Adobe); a kettlebell swing animációja „Kettlebell full Swing”, készítette hanfletchie (sketchfab.com/hanfletchie), CC BY 4.0 licenc; a többi gyakorlat a saját mozgásvázlatunkból készül.': 'squats, goblet squats, push-ups, burpees, jumping jacks and shadow boxing use motion captured from real people (Mixamo, Adobe); the kettlebell swing is “Kettlebell full Swing” by hanfletchie (sketchfab.com/hanfletchie), CC BY 4.0; the other exercises use our own motion sketches.',
    'alap nélkül': 'without base', 'kézisúlyzó': 'dumbbells', 'eszköz nélkül': 'no equipment',
    // hét napjai
    'H': 'M', 'K': 'T', 'Sze': 'W', 'Cs': 'T', 'P': 'F', 'Szo': 'S', 'V': 'S'
  };

  /* ---------- mintaszabályok (számokkal, változó részekkel) ---------- */
  const R = [
    [/^~(\d+) perc$/, '~$1 min'], [/^(\d+) perc$/, '$1 min'], [/^(\d+) mp$/, '$1 s'], [/^\+(\d+) mp pihenő$/, '+$1 s rest'],
    [/^Alap ~(\d+) perc$/, 'Base ~$1 min'], [/^\+ (.+) ~(\d+) perc$/, (m, a, b) => '+ ' + tr(a) + ' ~' + b + ' min'],
    [/^Indítás · ~(\d+) perc$/, 'Start · ~$1 min'],
    [/^(\d+)\. szint · (.+)$/, (m, a, b) => 'Level ' + a + ' · ' + tr(b)], [/^(\d+)\. szint$/, 'Level $1'],
    [/^(\d+)\/(\d+)\. gyakorlat · (.+)$/, (m, a, b, c) => a + '/' + b + ' · ' + trParts(c)],
    [/^Alap kör · (\d+) kör · (\d+) mp munka \/ (\d+) mp pihenő$/, 'Base circuit · $1 rounds · $2 s work / $3 s rest'],
    [/^Plusz: (.+?) · (\d+) kör · (\d+) \/ (\d+) mp$/, (m, a, b, c, d) => 'Extra: ' + tr(a) + ' · ' + b + ' rounds · ' + c + ' / ' + d + ' s'],
    [/^Plusz: (.+)$/, (m, a) => 'Extra: ' + tr(a)],
    [/^(.+?) · (.+?)\. A pötty az ajánlott blokkot jelöli\. Az alap kör végén még meggondolhatod\.$/, (m, a, b) => tr(a) + ' · ' + tr(b) + '. The dot marks the recommended block. You can still change your mind after the base circuit.'],
    [/^(\d+) kg kettlebell$/, '$1 kg kettlebell'], [/^(\d+) kg kézisúlyzó \(két kézzel\)$/, '$1 kg dumbbell (both hands)'],
    [/^(\d+(?:–\d+)?) kg \/ kéz$/, '$1 kg / hand'], [/^(\d+(?:–\d+)?) kg$/, '$1 kg'],
    [/^1\. szint: súly nélkül · 2\.: (.+)$/, (m, a) => 'Level 1: no weight · 2: ' + tr(a)],
    [/^kézisúlyzó \+ kettlebell$/, 'dumbbells + kettlebell'],
    [/^\((\d+) oldal\)$/, '($1 sides)'], [/^Verzió: (.+)$/, 'Version: $1'],
    [/^Súlyválasztás \((.+)\)$/, (m, a) => 'Choosing weights (' + a.replace(/kézisúlyzó max\. /, 'dumbbells up to ').replace(/eszköz nélkül/, 'no equipment') + ')'],
    [/^(\d+)\/(\d+) nap$/, '$1/$2 days'], [/^Napok a szinten: (\d+)\/(\d+)$/, 'Days at level: $1/$2'], [/^Jó érzetű alap edzés: (\d+)\/(\d+)$/, 'Good base workouts: $1/$2'],
    [/^A szintek a gyakorlatokat nehezítik, az alap ideje marad kb\. (\d+) perc\. Szintlépés: (\d+) „könnyű” vagy „pont jó” értékelésű, teljes alap edzés és legalább (\d+) hét az adott szinten\. Kézzel is válthatsz\.$/,
      'Levels make the exercises harder; the base stays about $1 min. Level up: $2 full base workouts rated “easy” or “just right”, and at least $3 weeks at the level. You can also switch manually.'],
    [/^Sípszó a váltásoknál és az utolsó (\d+) mp-ben\. iPhone-on a némítókapcsoló elnémítja\.$/, 'Beeps at transitions and in the last $1 s. On iPhone the silent switch mutes it.'],
    [/^Bemondja a következő gyakorlatot és az oldalcserét\. Ezen az eszközön nincs magyar hang\.$/, 'Announces the next exercise and side switches. This device has no English voice.'],
    [/^Alap kör: (\d+) kör, (\d+) mp munka, (\d+) mp pihenő\. Eszköz nélkül, bárhol megy\. Egyenletes tempó, tiszta technika\.$/, 'Base circuit: $1 rounds, $2 s work, $3 s rest. No equipment, works anywhere. Steady pace, clean technique.'],
    [/^Plusz blokk: (.+?), (\d+) kör, (\d+) mp munka, (\d+) mp pihenő\.( Akkor jó a súly, ha a munkaidő végén még kb\. 2 ismétlés maradna benned\.)?$/,
      (m, a, b, c, d, e) => 'Extra block: ' + tr(a) + ', ' + b + ' rounds, ' + c + ' s work, ' + d + ' s rest.' + (e ? ' The weight is right if you’d have about 2 reps left at the end of the work time.' : '')],
    [/^Plusz blokk: (.+?)\. Lassan, a fájdalommentes tartományban\.$/, (m, a) => 'Extra block: ' + tr(a) + '. Slowly, within your pain-free range.'],
    [/^(\d+) edzés, (.+)$/, (m, a, b) => a + ' workouts, ' + tr(b)],
    [/^(\d+) nap egymás után$/, '$1 days in a row'],
    [/^(Neon|Shade|Katana|Ronin): (.+)$/, (m, a, b) => a + ': ' + tr(b)],
    [/^(.+) · mindkét oldalra$/, (m, a) => tr(a) + ' · both sides'],
    [/^Plusz blokk: (.+)$/, (m, a) => 'Extra block: ' + tr(a)],
    [/^(\d+) nap egymás után · (\d+)\. edzés összesen$/, '$1 days in a row · workout #$2 total'],
    [/^Elérted a (\d+)\. szint feltételét\.$/, 'You qualify for level $1.'],
    [/^Jöhet: (.+?) · ~(\d+) perc$/, (m, a, b) => 'Next up: ' + tr(a) + ' · ~' + b + ' min'],
    [/^· ~(\d+) perc · (.+)$/, (m, a, b) => '· ~' + a + ' min · ' + tr(b)],
    [/^Eddig (\d+) gyakorlat kész a (\d+)-(?:ból|ből)\.( Az alap kész, ez teljes edzésnek számít\.)?$/, (m, a, b, c) => a + ' of ' + b + ' exercises done so far.' + (c ? ' The base is done, this counts as a full workout.' : '')],
    [/^, itt tartottál: (.+)\.$/, (m, a) => ', you were at: ' + tr(a) + '.'],
    [/^Váltás: (\d+)\. szint · (.+)$/, (m, a, b) => 'Switch: level ' + a + ' · ' + tr(b)],
    [/^Szintlépés: (\d+)\. szint$/, 'Level up: level $1'],
    [/^(.+) · (.+) · (\d+) perc\. A statisztika, a hét és a szintlépés számlálója is frissül\.$/, (m, a, b, c) => a + ' · ' + tr(b) + ' · ' + c + ' min. Stats, the week and the level-up counter will update too.'],
    [/^(.+)\. A szintlépés számlálója újraindul\.$/, (m, a) => a + '. The level-up counter restarts.'],
    [/^Kész! Szép munka\.$/, 'Done! Great work.'],
    [/^(\d+)\/(\d+)\. kör$/, 'round $1/$2'], [/^(\d+)\. kör$/, 'round $1'],
    // felolvasás
    [/^Pihenő\. Következik: (.+)$/, 'Rest. Next: $1'], [/^Készülj\. Első gyakorlat: (.+)$/, 'Get ready. First exercise: $1'], [/^Következik: (.+)$/, 'Next: $1'],
    [/^(.+)\. Félidőben oldalcsere\.$/, '$1. Switch sides halfway.'], [/^Oldalcsere$/, 'Switch sides'],
    [/^Az alap kész\. Jöhet a plusz blokk\?$/, 'Base done. Ready for the extra block?'], [/^Kész\. Lépj tovább, ha jöhet\.$/, 'Done. Move on when you’re ready.']
  ];
  // „Alap A + Erő · 1. szint” típusú összetett címkék
  function trParts(s) { return s.split(' · ').map(p => p.split(' + ').map(x => tr(x.trim())).join(' + ')).join(' · '); }

  function tr(s) {
    if (lang !== 'en' || !s) return s;
    const t = s.replace(/\s+/g, ' ').trim();
    if (EN[t] !== undefined) return EN[t];
    for (const [re, rep] of R) { if (re.test(t)) return t.replace(re, rep); }
    if (t.indexOf(' · ') > 0) { const x = trParts(t); if (x !== t) return x; }
    if (/[A-ZÁÉÍÓÖŐÚÜŰ]{3}/.test(t) && t === t.toUpperCase()) {          // csupa nagybetűs címke
      const c = t.charAt(0) + t.slice(1).toLowerCase(), x = tr(c);
      if (x !== c) return x.toUpperCase();
    }
    return s;
  }

  /* ---------- adatok cseréje betöltéskor ---------- */
  function applyData() {
    if (lang !== 'en') return;
    if (typeof EX !== 'undefined') Object.entries(EXN).forEach(([k, v]) => { const e = EX[k]; if (!e) return; e.name = v[0]; e.easy = v[1]; e.cues = v.slice(2); });
    if (typeof BASE !== 'undefined') Object.entries(BASEN).forEach(([k, v]) => { if (BASE[k]) { BASE[k].title = v[0]; BASE[k].short = v[1]; } });
    if (typeof PLUS !== 'undefined') Object.entries(PLUSN).forEach(([k, v]) => { if (PLUS[k]) { PLUS[k].name = v[0]; PLUS[k].short = v[1]; PLUS[k].gear = v[2]; } });
    if (typeof LEVELS !== 'undefined') Object.entries(LEVN).forEach(([k, v]) => { if (LEVELS[k]) { LEVELS[k].name = v[0]; LEVELS[k].note = v[1]; } });
  }

  /* ---------- megjelenő szövegek fordítása (automatikusan, minden változáskor) ---------- */
  const ATTRS = ['aria-label', 'title', 'placeholder'];
  function translateNode(root) {
    if (lang !== 'en' || !root) return;
    if (root.nodeType === 3) { const v = root.nodeValue, n = tr(v); if (n !== v) root.nodeValue = v.replace(v.trim(), n); return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(root.tagName)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; const list = [];
    while ((n = w.nextNode())) if (!/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.tagName)) list.push(n);
    list.forEach(x => { const v = x.nodeValue; if (!/\S/.test(v)) return; const t = tr(v); if (t !== v) x.nodeValue = v.replace(v.trim(), t); });
    [root, ...root.querySelectorAll('[aria-label],[title],[placeholder]')].forEach(el => ATTRS.forEach(a => {
      if (!el.hasAttribute || !el.hasAttribute(a)) return; const v = el.getAttribute(a), t = tr(v); if (t !== v) el.setAttribute(a, t);
    }));
  }
  function start() {
    if (lang !== 'en') return;
    document.documentElement.lang = 'en';
    translateNode(document.body);
    new MutationObserver(ms => ms.forEach(m => {
      if (m.type === 'characterData') translateNode(m.target);
      else m.addedNodes.forEach(translateNode);
      if (m.type === 'attributes') translateNode(m.target);
    })).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  window.I18N = {
    lang, tr, applyData,
    locale: lang === 'en' ? 'en-GB' : 'hu-HU',
    speechLang: lang === 'en' ? 'en-US' : 'hu-HU',
    set(l) { try { localStorage.setItem(LS_LANG, l); } catch (e) {} location.reload(); }
  };
  applyData();
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
