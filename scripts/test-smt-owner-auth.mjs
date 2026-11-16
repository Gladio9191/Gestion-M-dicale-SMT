import assert from 'node:assert/strict';
import test from 'node:test';
import { createPasswordHash, verifyPasswordHash, OwnerSessionStore, LoginAttemptLimiter, safeCsrfMatch } from '../artifacts/api-server/src/security/owner-core.ts';

test('scrypt creates salt-backed hash; invalid credentials fail', () => {
  const a = createPasswordHash('AN-EXAMPLE-private-passphrase-2026');
  const b = createPasswordHash('AN-EXAMPLE-private-passphrase-2026');
  assert.notEqual(a,b);
  assert.ok(verifyPasswordHash('AN-EXAMPLE-private-passphrase-2026', a));
  assert.equal(verifyPasswordHash('incorrect passphrase',a),false);
  assert.equal(verifyPasswordHash('',a),false);
  assert.equal(verifyPasswordHash('x', 'malformed hash'),false);
  assert.throws(()=>createPasswordHash('short'));
});

test('session expires; rotating login invalidates prior session; logout revokes', () => {
  const store = new OwnerSessionStore();
  const first = store.create(1000);
  assert.deepEqual(store.get(first.token,1001),first.session);
  assert.equal(store.get(first.token, 1000 + 9*60*60*1000),null);
  const second = store.create(2000);
  assert.equal(store.get(first.token,2001),null);
  assert.ok(store.get(second.token,2001));
  store.revoke(second.token);
  assert.equal(store.get(second.token, 2002),null);
  assert.equal(store.get('bad',2002),null);
});

test('CSRF exact comparison and random session secret', () => {
  const store = new OwnerSessionStore();
  const {session}=store.create();
  assert.ok(safeCsrfMatch(session.csrfToken,session.csrfToken));
  assert.equal(safeCsrfMatch(session.csrfToken,'0'.repeat(64)),false);
  assert.equal(safeCsrfMatch(session.csrfToken,'junk'),false);
});

test('rate limiter rejects sixth failed login and resets on expiry/success', () => {
  const limiter = new LoginAttemptLimiter();
  for(let i=0;i<5;i++){assert.ok(limiter.canAttempt('127.0.0.1',100));limiter.failed('127.0.0.1',100)}
  assert.equal(limiter.canAttempt('127.0.0.1',101),false);
  assert.equal(limiter.canAttempt('127.0.0.1',100 + 16*60*1000),true);
  limiter.failed('127.0.0.1',2000000);
  limiter.success('127.0.0.1');
  assert.equal(limiter.canAttempt('127.0.0.1',2000001),true);
});
