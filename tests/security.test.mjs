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

test('example environment configuration contains no Firebase web API key', async () => {
  const source = await read('.env.example');
  assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{35}/);
  assert.match(source, /^NEXT_PUBLIC_FIREBASE_API_KEY=$/m);
});

test('Pusher client authenticates with Firebase against the local authorization endpoint', async () => {
  const source = await read('lib/pusher.ts');
  assert.match(source, /channelAuthorization/);
  assert.match(source, /endpoint:\s*'\/api\/pusher\/auth'/);
  assert.match(source, /Authorization:\s*`Bearer \$\{idToken\}`/);
  assert.doesNotMatch(source, /authEndpoint:/);
});

test('production builds do not ignore static checks', async () => {
  const source = await read('next.config.js');
  assert.doesNotMatch(source, /ignoreBuildErrors/);
  assert.doesNotMatch(source, /ignoreDuringBuilds/);
});
