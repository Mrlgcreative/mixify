import assert from 'node:assert/strict';

import {
  fadeSecondsFor,
  fadeVolumes,
  nextIndexFor,
  tempoMatchRate,
} from '../src/lib/mix.ts';

// Fondu : désactivé, AutoMix fixe, fondu réglable, plafonné à 30 % du titre.
assert.equal(fadeSecondsFor('off', 8, 200), 0);
assert.equal(fadeSecondsFor('automix', 8, 200), 10);
assert.equal(fadeSecondsFor('crossfade', 8, 200), 8);
assert.equal(fadeSecondsFor('crossfade', 20, 200), 12);
assert.equal(fadeSecondsFor('automix', 8, 20), 6);
assert.equal(fadeSecondsFor('crossfade', 8, 0), 8);

// Courbes equal-power : plein sortant au début, plein entrant à la fin.
let v = fadeVolumes(0);
assert.ok(Math.abs(v.out - 1) < 1e-9);
assert.ok(Math.abs(v.in) < 1e-9);
v = fadeVolumes(1);
assert.ok(Math.abs(v.out) < 1e-9);
assert.ok(Math.abs(v.in - 1) < 1e-9);
v = fadeVolumes(0.5);
assert.ok(Math.abs(v.out - Math.SQRT1_2) < 1e-9);
assert.ok(Math.abs(v.in - Math.SQRT1_2) < 1e-9);

// File : avance, s'arrête, boucle, ou tire un autre titre.
assert.equal(nextIndexFor({ index: 0, length: 3, shuffle: false, repeat: 'off' }), 1);
assert.equal(nextIndexFor({ index: 2, length: 3, shuffle: false, repeat: 'off' }), null);
assert.equal(nextIndexFor({ index: 2, length: 3, shuffle: false, repeat: 'all' }), 0);
assert.equal(nextIndexFor({ index: 0, length: 1, shuffle: false, repeat: 'all' }), 0);
assert.equal(nextIndexFor({ index: 1, length: 1, shuffle: true, repeat: 'off' }), 0);
assert.equal(nextIndexFor({ index: 1, length: 4, shuffle: true, repeat: 'off' }, () => 0), 2);
assert.equal(nextIndexFor({ index: 3, length: 4, shuffle: true, repeat: 'off' }, () => 0.99), 2);

// Tempo : octave corrigée, plafond ±8 %, données manquantes neutres.
assert.equal(tempoMatchRate(), 1);
assert.equal(tempoMatchRate(0, 128), 1);
assert.ok(Math.abs(tempoMatchRate(120, 120) - 1) < 1e-9);
assert.ok(Math.abs(tempoMatchRate(120, 128) - 1.0666666667) < 1e-6);
assert.equal(tempoMatchRate(120, 200), 0.92);
assert.ok(Math.abs(tempoMatchRate(87, 174) - 1) < 1e-9);
assert.ok(Math.abs(tempoMatchRate(174, 87) - 1) < 1e-9);

console.log('mix: ok');
