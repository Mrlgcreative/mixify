import { test } from 'node:test';
import assert from 'node:assert/strict';

import { codeChallenge, parseMobileAuthUrl, randomVerifier } from './pkce.ts';

test('PKCE S256 suit le vecteur de test RFC 7636', async () => {
  assert.equal(
    await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
  assert.match(randomVerifier(), /^[A-Za-z0-9_-]{43}$/);
});

test('le deep link Google est reconnu, les autres URL ignorées', () => {
  assert.deepEqual(parseMobileAuthUrl('com.imasomo.mixify://auth?code=c&nonce=n'), {
    code: 'c',
    nonce: 'n',
  });
  assert.deepEqual(parseMobileAuthUrl('com.imasomo.mixify://auth?error=refus'), {
    error: 'refus',
  });
  assert.equal(parseMobileAuthUrl('https://localhost/?code=c'), null);
  assert.equal(parseMobileAuthUrl('com.imasomo.mixify://autre?code=c'), null);
  assert.equal(parseMobileAuthUrl('pas une url'), null);
});
