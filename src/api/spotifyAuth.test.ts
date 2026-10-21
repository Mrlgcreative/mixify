import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { codeChallenge, randomCodeVerifier } from './spotifyAuth.ts';

// Les fonctions testées sont pures : aucun accès à localStorage/location
// (l'échange de jeton lui-même n'est testable qu'en navigateur).

test('randomCodeVerifier : base64url, 64 octets d\'entropie, jamais deux fois pareil', () => {
  const verifier = randomCodeVerifier();
  // 64 octets → 88 caractères base64, sans padding → 86.
  assert.equal(verifier.length, 86);
  assert.match(verifier, /^[A-Za-z0-9_-]+$/, 'base64url uniquement (+ / = exclus)');
  assert.notEqual(verifier, randomCodeVerifier());
});

test('codeChallenge : SHA-256 base64url (S256), conforme à node:crypto', async () => {
  const verifier = 'un-verifier-de-test-sans-characters-speciaux_1234567890';
  const expected = createHash('sha256').update(verifier).digest('base64url');
  assert.equal(await codeChallenge(verifier), expected);
  // Le défi doit être déterministe (le même verifier redonne le même défi).
  assert.equal(await codeChallenge(verifier), expected);
});
