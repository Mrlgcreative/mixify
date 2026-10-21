import assert from 'node:assert/strict';
import test from 'node:test';

import { estimateTempo, MIN_CONFIDENCE } from './tempo.ts';

const SAMPLE_RATE = 44100;

/** Bruit déterministe (LCG) : reproductible d'un test à l'autre. */
function deterministicNoise(length: number, seed = 42): Float32Array {
  const out = new Float32Array(length);
  let state = seed;
  for (let i = 0; i < length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    out[i] = state / 2147483648 - 1;
  }
  return out;
}

/** Piste synthétique de clics à BPM connu, plus un plancher de bruit très faible. */
function clickTrack(bpm: number, offsetSeconds: number, seconds: number): Float32Array {
  const samples = Math.floor(seconds * SAMPLE_RATE);
  const out = deterministicNoise(samples, 7).map((v) => v * 0.002);
  const period = (60 / bpm) * SAMPLE_RATE;
  const decay = 300; // queue exponentielle ~6 ms : franchement dans une frame
  for (let pos = offsetSeconds * SAMPLE_RATE; pos < samples - decay; pos += period) {
    const start = Math.floor(pos);
    for (let j = 0; j < decay; j++) {
      out[start + j] += Math.exp(-j / 60);
    }
  }
  return out;
}

test('estimateTempo : grille de clics 128 BPM → BPM, phase et confiance', () => {
  const estimate = estimateTempo(clickTrack(128, 0.35, 16), SAMPLE_RATE);
  assert.ok(estimate, 'la grille de clics doit être détectée');
  assert.ok(Math.abs(estimate.bpm - 128) <= 0.5, `bpm = ${estimate.bpm}`);
  assert.ok(Math.abs(estimate.phase - 0.35) <= 0.03, `phase = ${estimate.phase}`);
  assert.ok(estimate.confidence >= MIN_CONFIDENCE, `confiance = ${estimate.confidence}`);
});

test('estimateTempo : pas d’erreur d’octave sur un tempo lent (75 ≠ 150)', () => {
  const estimate = estimateTempo(clickTrack(75, 0.1, 16), SAMPLE_RATE);
  assert.ok(estimate, 'la grille 75 BPM doit être détectée');
  assert.ok(Math.abs(estimate.bpm - 75) <= 0.5, `bpm = ${estimate.bpm} (octave ?)`);
});

test('estimateTempo : les deux moitiés d’un tempo changeant ne s’accordent pas', () => {
  // 8 s à 120 BPM puis 8 s à 140 BPM : l’accord des moitiés doit rejeter.
  const first = clickTrack(120, 0.2, 8);
  const second = clickTrack(140, 0.3, 8);
  const mixed = new Float32Array(first.length + second.length);
  mixed.set(first, 0);
  mixed.set(second, first.length);
  assert.equal(estimateTempo(mixed, SAMPLE_RATE), null);
});

test('estimateTempo : bruit blanc et silence → null (jamais de BPM inventé)', () => {
  const tenSeconds = 10 * SAMPLE_RATE;
  assert.equal(estimateTempo(deterministicNoise(tenSeconds), SAMPLE_RATE), null);
  assert.equal(estimateTempo(new Float32Array(tenSeconds), SAMPLE_RATE), null);
});

test('estimateTempo : signal trop court → null', () => {
  assert.equal(estimateTempo(clickTrack(120, 0.1, 2), SAMPLE_RATE), null);
});
