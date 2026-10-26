import assert from 'node:assert/strict';
import test from 'node:test';

import { camelot, detectKey, harmonicCost, harmonicFadeCap } from './harmony.ts';

const RATE = 44100;

/** Accord de 3 notes (fréquences MIDI) tenu `seconds` secondes. */
function chord(chords: number[][], secondsPerChord: number): Float32Array {
  const samples = new Float32Array(Math.floor(RATE * secondsPerChord * chords.length));
  const perChord = Math.floor(RATE * secondsPerChord);
  chords.forEach((notes, index) => {
    for (let i = 0; i < perChord; i++) {
      const t = i / RATE;
      let value = 0;
      for (const midi of notes) {
        value += Math.sin(2 * Math.PI * 440 * 2 ** ((midi - 69) / 12) * t);
      }
      samples[index * perChord + i] = value * 0.12;
    }
  });
  return samples;
}

test('détecte une progression en do majeur', () => {
  // C (48 52 55) - F (53 57 60) - G (55 59 62) - C
  const signal = chord([[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]], 2.5);
  const key = detectKey(signal, RATE);
  assert.ok(key, 'la tonalité doit être détectée');
  assert.equal(key.pitchClass, 0);
  assert.equal(key.mode, 'major');
  assert.equal(key.confidence, 1);
});

test("détecte une progression en la mineur", () => {
  // Am (45 48 52) - Dm (50 53 57) - Em (52 55 59) - Am
  const signal = chord([[45, 48, 52], [50, 53, 57], [52, 55, 59], [45, 48, 52]], 2.5);
  const key = detectKey(signal, RATE);
  assert.ok(key, 'la tonalité doit être détectée');
  assert.equal(key.pitchClass, 9);
  assert.equal(key.mode, 'minor');
});

test('signaux trop courts ou bruités : pas de tonalité', () => {
  assert.equal(detectKey(new Float32Array(RATE), RATE), null, 'trop court');
  for (let i = 0; i < 5; i++) {
    const noise = new Float32Array(RATE * 8).map(() => (Math.random() - 0.5) * 0.4);
    assert.equal(detectKey(noise, RATE), null, 'bruit blanc non concluant');
  }
});

test('Camelot : même clé, voisins, relatifs, triton', () => {
  assert.deepEqual(camelot({ pitchClass: 0, mode: 'major' }), { number: 8, letter: 'B' });
  assert.deepEqual(camelot({ pitchClass: 9, mode: 'minor' }), { number: 8, letter: 'A' });
  // Do majeur (8B) vs sol majeur (9B) : voisin.
  assert.equal(harmonicCost({ pitchClass: 0, mode: 'major' }, { pitchClass: 7, mode: 'major' }), 1);
  // Do majeur (8B) vs la mineur (8A) : relatif.
  assert.equal(harmonicCost({ pitchClass: 0, mode: 'major' }, { pitchClass: 9, mode: 'minor' }), 1);
  // Do majeur (8B) vs fa dièse majeur (2B) : triton.
  assert.equal(harmonicCost({ pitchClass: 0, mode: 'major' }, { pitchClass: 6, mode: 'major' }), 3);
  // Même tonalité.
  assert.equal(harmonicCost({ pitchClass: 0, mode: 'major' }, { pitchClass: 0, mode: 'major' }), 0);
});

test('harmonicFadeCap : un écart harmonique raccourcit le fondu', () => {
  const doMajeur = { pitchClass: 0, mode: 'major' as const };
  const solMajeur = { pitchClass: 7, mode: 'major' as const };
  const faDieseMajeur = { pitchClass: 6, mode: 'major' as const };
  // Voisin : le fondu demandé est conservé.
  assert.equal(harmonicFadeCap(8, doMajeur, solMajeur), 8);
  // Triton : ramené à 1,2 s, un cut reste un cut, l'inconnu ne change rien.
  assert.equal(harmonicFadeCap(8, doMajeur, faDieseMajeur), 1.2);
  assert.equal(harmonicFadeCap(0.08, doMajeur, faDieseMajeur), 0.08);
  assert.equal(harmonicFadeCap(8, doMajeur, null), 8);
});
