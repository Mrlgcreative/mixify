import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeTail } from './tail.ts';

const RATE = 1000; // suffisant pour les fenêtres de 100 ms

function signal(seconds: number, level: number): Float32Array {
  return new Float32Array(Math.round(seconds * RATE)).fill(level);
}

test('analyzeTail : un morceau qui finit fort est classé « cold »', () => {
  const tail = analyzeTail(signal(20, 0.2), RATE);
  assert.ok(tail);
  assert.equal(tail.kind, 'cold');
  assert.equal(tail.silence, 0);
  assert.ok(tail.ratio > 0.98);
});

test('analyzeTail : un long silence final est détecté', () => {
  const samples = signal(20, 0.2);
  samples.fill(0, samples.length - Math.round(1.5 * RATE));
  const tail = analyzeTail(samples, RATE);
  assert.ok(tail);
  assert.equal(tail.kind, 'silent');
  assert.ok(tail.silence >= 1.4, `silence détecté : ${tail.silence}s`);
});

test('analyzeTail : un fade-out final est classé « quiet »', () => {
  const samples = signal(20, 0.2);
  samples.fill(0.02, samples.length - Math.round(1.5 * RATE));
  const tail = analyzeTail(samples, RATE);
  assert.ok(tail);
  assert.equal(tail.kind, 'quiet');
  assert.ok(tail.ratio < 0.2);
});

test('analyzeTail : signal vide ou invalide', () => {
  assert.equal(analyzeTail(new Float32Array(0), RATE), null);
  assert.equal(analyzeTail(signal(1, 0), RATE)?.kind, 'silent');
  assert.equal(analyzeTail(signal(1, 0.1), 0), null);
});
