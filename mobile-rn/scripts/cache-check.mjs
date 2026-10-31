import assert from 'node:assert/strict';

import { canPrefetch, selectEvictions } from '../src/lib/cachePolicy.ts';

// Préchargement : jamais hors ligne, toujours sur Wi-Fi, cellulaire sous condition.
assert.equal(canPrefetch({ online: false, cellular: false, battery: 1 }), false);
assert.equal(canPrefetch({ online: true, cellular: false, battery: 0.05 }), true);
assert.equal(canPrefetch({ online: true, cellular: true, battery: 0.2 }), false);
assert.equal(canPrefetch({ online: true, cellular: true, battery: 0.31 }), true);
assert.equal(canPrefetch({ online: true, cellular: true, battery: null }), true);

// Éviction LRU : rien à faire sous la limite, sinon du plus ancien au plus récent.
assert.deepEqual(selectEvictions([{ id: 'a', bytes: 10, usedAt: 1 }], 10), []);
const entries = [
  { id: 'recent', bytes: 40, usedAt: 30 },
  { id: 'old', bytes: 40, usedAt: 10 },
  { id: 'middle', bytes: 40, usedAt: 20 },
];
assert.deepEqual(
  selectEvictions(entries, 90).map((entry) => entry.id),
  ['old'],
);
assert.deepEqual(
  selectEvictions(entries, 0).map((entry) => entry.id),
  ['old', 'middle', 'recent'],
);

console.log('cachePolicy: ok');
