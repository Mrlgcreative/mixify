
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  equalPowerCurves,
  planBeatSync,
  tempoRatio,
  barInterval,
  autoMixDuration,
  autoMixAction,
  genresCompatible,
  phraseAlignedDuration,
  splitGenres,
  matchOctave,
  normalizeBpm,
  tempoCompatible,
  MIN_CROSSFADE_SECONDS,
  MAX_CROSSFADE_SECONDS,
  transitionProfile,
  AUTOMIX_MIN_SECONDS,
} from './crossfade.ts';

test('equalPowerCurves : puissance constante aux extrémités', () => {
  const { fadeIn, fadeOut } = equalPowerCurves(8);
  assert.ok(Math.abs(fadeIn[0] - 0) < 1e-6, 'le fondu entrant part de 0');
  assert.ok(Math.abs(fadeIn[fadeIn.length - 1] - 1) < 1e-6, 'le fondu entrant finit à 1');
  assert.ok(Math.abs(fadeOut[0] - 1) < 1e-6, 'le fondu sortant part de 1');
  assert.ok(Math.abs(fadeOut[fadeOut.length - 1] - 0) < 1e-6, 'le fondu sortant finit à 0');
  // L'énergie perçue ne doit pas creuser au milieu du fondu.
  const mid = Math.floor(fadeIn.length / 2);
  assert.ok(Math.abs(fadeIn[mid] ** 2 + fadeOut[mid] ** 2 - 1) < 1e-3);
});

test('tempoRatio : alignement borné à ±8 %', () => {
  assert.equal(tempoRatio(120, 120), 1);
  assert.equal(tempoRatio(120, 240), 0.92);
  assert.equal(tempoRatio(120, 60), 1.08);
  assert.equal(tempoRatio(0, 120), 1, 'BPM inconnu => pas de pitch shift');
  assert.equal(tempoRatio(120, 0), 1);
});

test('planBeatSync : le fondu se termine avec la fin du titre', () => {
  const plan = planBeatSync({
    position: 30,
    duration: 40,
    crossfade: 8,
    outBpm: 120,
    inBpm: 120,
    outRate: 1,
    leadIn: 0.2,
    inDuration: 200,
  });
  assert.equal(plan.fadeStart, 2, 'le fondu démarre 8s avant la fin');
  assert.ok(Math.abs(plan.fadeStart + 8 - (40 - 30)) < 1e-9);
});

test('planBeatSync : le titre sortant prend le tempo du suivant', () => {
  const outBpm = 120;
  const inBpm = 128;
  const leadIn = 0.2;
  const plan = planBeatSync({
    position: 0,
    duration: 60,
    crossfade: 8,
    outBpm,
    inBpm,
    outRate: 1,
    leadIn,
    inDuration: 240,
  });

  // Le suivant est plus rapide : le sortant accélère (nécessairement ±8 %).
  assert.ok(Math.abs(plan.outgoingRate - 128 / 120) < 1e-9, `sortant ×${plan.outgoingRate}`);

  // L'espacement réel des pulsations coïncide des deux côtés.
  const beatIn = 60 / inBpm;
  const beatOutReel = 60 / outBpm / plan.outgoingRate;
  assert.ok(Math.abs(beatOutReel - beatIn) < 1e-9, 'espacement des pulsations divergent');

  // La grille sortante (à son nouveau tempo) reste respectée...
  const startAt = plan.fadeStart - leadIn;
  const mediaAtStart = startAt; // position 0, outRate 1
  const mediaAtDownbeat = mediaAtStart + (plan.downbeatAt - startAt) * plan.outgoingRate;
  const k = mediaAtDownbeat / barInterval(outBpm);
  assert.ok(Math.abs(k - Math.round(k)) < 1e-6, `downbeat média ${mediaAtDownbeat} non aligné`);

  // ... et une pulsation entrante (vitesse naturelle) tombe pile dessus.
  const beatIndex = (plan.inOffset + (plan.downbeatAt - startAt)) / beatIn;
  assert.ok(
    Math.abs(beatIndex - Math.round(beatIndex)) < 1e-6,
    `le battement entrant (${beatIndex}) ne tombe pas sur le downbeat`,
  );
});

test('planBeatSync : suivant rapide → sortant accéléré, suivant lent → ralenti (±8 %)', () => {
  const base = { position: 0, duration: 60, crossfade: 8, outRate: 1, leadIn: 0.2, inDuration: 240 };
  const rapide = planBeatSync({ ...base, outBpm: 90, inBpm: 120 });
  assert.ok(rapide.outgoingRate > 1, 'un suivant plus rapide doit accélérer le sortant');
  assert.equal(rapide.outgoingRate, 1.08, 'accélération bornée à +8 %');
  const lent = planBeatSync({ ...base, outBpm: 130, inBpm: 100 });
  assert.ok(lent.outgoingRate < 1, 'un suivant plus lent doit ralentir le sortant');
  assert.equal(lent.outgoingRate, 0.92, 'ralentissement borné à −8 %');
  const meme = planBeatSync({ ...base, outBpm: 122, inBpm: 122 });
  assert.equal(meme.outgoingRate, 1, 'tempo identique : vitesse naturelle');
});

test('planBeatSync : durée restante convertie par le ratio de lecture sortant', () => {
  const plan = planBeatSync({
    position: 20,
    duration: 60,
    crossfade: 8,
    outBpm: 120,
    inBpm: 0,
    outRate: 2,
    leadIn: 0.2,
    inDuration: 120,
  });
  // 40 s média à ×2 = 20 s réelles ; le fondu démarre 8 s avant la fin.
  assert.equal(plan.fadeStart, 12);
});

test('planBeatSync : dégradation propre sans BPM', () => {
  const plan = planBeatSync({
    position: 5,
    duration: 60,
    crossfade: 6,
    outBpm: 0,
    inBpm: 0,
    outRate: 1,
    leadIn: 0.2,
    inDuration: 120,
  });
  assert.equal(plan.outgoingRate, 1);
  assert.equal(plan.inOffset, 0);
  assert.equal(plan.fadeStart, 49);
});

test('planBeatSync : phases estimées — le battement entrant reste sur la grille', () => {
  const outBpm = 120;
  const inBpm = 128;
  const leadIn = 0.25;
  const outPhase = 0.37;
  const inPhase = 1.13;
  const position = 10;
  const plan = planBeatSync({
    position,
    duration: 60,
    crossfade: 8,
    outBpm,
    inBpm,
    outPhase,
    inPhase,
    outRate: 1,
    leadIn,
    inDuration: 240,
  });

  // Le downbeat visé est bien sur la grille sortante décalée (temps média),
  // en tenant compte de son changement de tempo à startAt.
  const startAt = plan.fadeStart - leadIn;
  const mediaAtStart = position + startAt;
  const downbeatMedia = mediaAtStart + (plan.downbeatAt - startAt) * plan.outgoingRate;
  const gridOut = (downbeatMedia - outPhase) / barInterval(outBpm);
  assert.ok(
    Math.abs(gridOut - Math.round(gridOut)) < 1e-6,
    `downbeat média ${downbeatMedia} hors grille sortante`,
  );

  // Une pulsation entrante (grille décalée par inPhase) tombe sur ce downbeat.
  const inMedia = plan.inOffset + (plan.downbeatAt - startAt);
  const gridIn = (inMedia - inPhase) / (60 / inBpm);
  assert.ok(Math.abs(gridIn - Math.round(gridIn)) < 1e-6, `battement entrant ${inMedia} hors grille`);
});

test('planBeatSync : seul le BPM entrant connu — sa pulsation tombe au début du fondu', () => {
  const inBpm = 96;
  const beatIn = 60 / inBpm;
  const leadIn = 0.25;
  for (const inPhase of [0, 0.1, 0.42, 1.9, 7.3]) {
    const plan = planBeatSync({
      position: 40,
      duration: 60,
      crossfade: 8,
      outBpm: 0,
      inBpm,
      inPhase,
      outRate: 1,
      leadIn,
      inDuration: 30,
    });
    assert.equal(plan.outgoingRate, 1, 'pas de BPM sortant : pas de pitch shift');
    assert.ok(plan.inOffset >= 0, `inOffset négatif (${plan.inOffset}) pour inPhase=${inPhase}`);
    assert.ok(plan.inOffset <= 30, 'offset dans le média');

    // La position média au début du fondu tombe pile sur la grille entrante.
    const startAt = plan.fadeStart - leadIn;
    const inMediaAtFade = plan.inOffset + (plan.fadeStart - startAt);
    const grid = (inMediaAtFade - inPhase) / beatIn;
    assert.ok(
      Math.abs(grid - Math.round(grid)) < 1e-6,
      `inPhase=${inPhase} : pulsation hors grille (${inMediaAtFade})`,
    );
  }
});

test('planBeatSync : dégradation propre sans BPM entrant (sortant seul connu)', () => {
  const plan = planBeatSync({
    position: 5,
    duration: 60,
    crossfade: 6,
    outBpm: 120,
    inBpm: 0,
    outRate: 1,
    leadIn: 0.2,
    inDuration: 120,
  });
  assert.equal(plan.outgoingRate, 1);
  assert.equal(plan.inOffset, 0);
  assert.equal(plan.downbeatAt, plan.fadeStart, 'pas de cible rythmique sans BPM entrant');
});

test('bornes du réglage crossfade', () => {
  assert.equal(MIN_CROSSFADE_SECONDS, 1);
  assert.equal(MAX_CROSSFADE_SECONDS, 12);
});

test('autoMixDuration : 10 s quelle que soit la valeur de tempo', () => {
  assert.equal(AUTOMIX_MIN_SECONDS, 10);
  assert.equal(autoMixDuration(120), 10);
  assert.equal(autoMixDuration(60), 10);
  assert.equal(autoMixDuration(180), 10);
  assert.equal(autoMixDuration(300), 10);
  assert.equal(autoMixDuration(0), AUTOMIX_MIN_SECONDS);
});

test('matchOctave : double/moitié de tempo repliés sur la même grille', () => {
  assert.equal(matchOctave(120, 120), 120);
  assert.equal(matchOctave(120, 240), 120);
  assert.equal(matchOctave(120, 60), 120);
  assert.equal(matchOctave(87, 174), 87);
  assert.equal(matchOctave(0, 128), 128);
  assert.equal(matchOctave(120, 0), 0);
});

test('normalizeBpm : ramène les BPM de l’API dans 70–180', () => {
  assert.equal(normalizeBpm(128), 128);
  assert.equal(normalizeBpm(256), 128);
  assert.equal(normalizeBpm(45), 90);
  assert.equal(normalizeBpm(0), 0);
  assert.equal(normalizeBpm(undefined), 0);
});

test('tempoCompatible : tolérance de 8 % après correction d’octave', () => {
  assert.equal(tempoCompatible(120, 124), true);
  assert.equal(tempoCompatible(120, 240), true, 'octave différente mais même tempo ressenti');
  assert.equal(tempoCompatible(100, 145), false);
  assert.equal(tempoCompatible(0, 120), false);
});

test('transitionProfile : AutoMix échange les basses par défaut', () => {
  const blend = transitionProfile('blend', 120, 8);
  assert.deepEqual(blend, transitionProfile(null, 120, 8), 'style inconnu = AutoMix');
  assert.ok(blend.outBassGain < 0 && blend.inBassGain < 0, 'échange de basses par défaut');

  const bass = transitionProfile('bass_swap', 120, 8);
  assert.deepEqual(bass, blend);

  const sweep = transitionProfile('filter_sweep', 120, 8);
  assert.ok(sweep.outLowpassEnd !== null && sweep.outLowpassEnd < 1000, 'le passe-bas se referme');

  const echo = transitionProfile('echo_out', 120, 8);
  assert.ok(echo.echoWet > 0);
  assert.ok(Math.abs(echo.echoDelay - 0.375) < 1e-6, 'triolet à 120 BPM');
  assert.equal(transitionProfile('echo_out', 0, 8).echoDelay, 0.3, 'BPM inconnu : retard par défaut');

  // Le crossfade et les fondus trop courts restent des fondus simples.
  assert.equal(transitionProfile('crossfade', 120, 8).outBassGain, 0);
  assert.equal(transitionProfile('bass_swap', 120, 0.3).outBassGain, 0);
  assert.equal(transitionProfile('cut', 120, 8).outBassGain, 0);
});

test('autoMixAction : on ne mixe que si la paire s’y prête', () => {
  const base = {
    sameAlbum: false,
    outBpm: 120,
    inBpm: 124,
    genreCompatible: true as boolean | null,
    harmonic: 0 as number | null,
    style: 'blend' as const,
  };

  assert.equal(autoMixAction(base), 'mix');
  assert.equal(autoMixAction({ ...base, sameAlbum: true }), 'album');
  assert.equal(autoMixAction({ ...base, outBpm: 0 }), 'handoff', 'tempo inconnu');
  assert.equal(autoMixAction({ ...base, inBpm: 150 }), 'handoff', 'tempo incompatible');
  assert.equal(autoMixAction({ ...base, genreCompatible: false }), 'handoff', 'genre incompatible');
  assert.equal(autoMixAction({ ...base, style: 'cut' }), 'handoff', 'cut adouci');
  assert.equal(autoMixAction({ ...base, harmonic: 3 }), 'handoff', 'dissonance');
  assert.equal(autoMixAction({ ...base, harmonic: 2 }), 'mix', 'voisin harmonique accepté');
  assert.equal(autoMixAction({ ...base, genreCompatible: null }), 'mix', 'genre inconnu');
});

test('splitGenres / genresCompatible : normalisation et familles proches', () => {
  assert.deepEqual(splitGenres('Rap, Hip-Hop / R&B'), ['rap', 'hiphop', 'rnb']);
  assert.deepEqual(splitGenres('Chant chrétien'), ['chant chretien']);
  assert.equal(genresCompatible(['Rap'], ['rap']), true);
  assert.equal(genresCompatible(['pop'], ['pop rock']), true, 'sous-chaîne');
  assert.equal(genresCompatible(['romance'], ['romantique']), true, 'préfixe significatif');
  assert.equal(genresCompatible(['Rap'], ['romance']), false);
  assert.equal(genresCompatible(['rap'], []), null, 'genre manquant');
});

test('phraseAlignedDuration : le fondu démarre sur une phrase de 4 mesures', () => {
  // 120 BPM : phrase de 8 s. À 12 s de la fin, la grille ne propose que 7 s
  // ou 15 s ; aucune ne tient dans 10–12 s, on garde la cible de 10 s.
  assert.equal(
    phraseAlignedDuration({ position: 179, duration: 191, outBpm: 120, outRate: 1, desired: 10 }),
    10,
  );

  // La phase de la grille décale la frontière.
  assert.equal(
    phraseAlignedDuration({
      position: 179,
      duration: 191,
      outBpm: 120,
      outPhase: 0.5,
      outRate: 1,
      desired: 10,
    }),
    10,
  );

  // Frontière à 176 s : 11 s de fondu, dans la plage 10–12 s.
  assert.equal(
    phraseAlignedDuration({ position: 175, duration: 187, outBpm: 120, outRate: 1, desired: 10 }),
    11,
  );
  assert.equal(
    phraseAlignedDuration({
      position: 175,
      duration: 187,
      outBpm: 120,
      outPhase: 0.5,
      outRate: 1,
      desired: 10,
    }),
    10.5,
  );

  // 128 BPM (phrase de 7,5 s) : la frontière à 180 s laisse 11 s.
  assert.equal(
    phraseAlignedDuration({
      position: 170,
      duration: 191,
      outBpm: 128,
      outRate: 1,
      desired: autoMixDuration(128),
    }),
    11,
  );

  // Sans tempo fiable ou quand aucune frontière ne tient dans les bornes,
  // on garde la durée cible.
  assert.equal(
    phraseAlignedDuration({ position: 175, duration: 187, outBpm: 0, outRate: 1, desired: 10 }),
    10,
  );
  assert.equal(
    phraseAlignedDuration({ position: 175, duration: 191, outBpm: 60, outRate: 1, desired: 12 }),
    12,
  );
});
