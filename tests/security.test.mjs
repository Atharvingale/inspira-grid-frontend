import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Firebase Admin has no hard-coded private key fallback', async () => {
  const source = await read('lib/firebase-admin.ts');
  assert.match(source, /FIREBASE_PRIVATE_KEY/);
  assert.doesNotMatch(source, /BEGIN PRIVATE KEY/);
  assert.match(source, /credentials are not configured/);
});

test('Pusher private channels require the authenticated user channel', async () => {
  const source = await read('app/api/pusher/auth/route.ts');
  assert.match(source, /validateFirebaseToken/);
  assert.match(source, /private-user-\$\{user\.uid\}/);
  assert.match(source, /Channel access denied/);
});

test('production builds do not ignore static checks', async () => {
  const source = await read('next.config.js');
  assert.doesNotMatch(source, /ignoreBuildErrors/);
  assert.doesNotMatch(source, /ignoreDuringBuilds/);
});
