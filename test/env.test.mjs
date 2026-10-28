import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

function load(overrides = {}) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./lib/server/env.ts')"], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, SECRET_KEY: randomBytes(32).toString('hex'), ADMIN_PASSWORD: randomBytes(24).toString('hex'), ...overrides },
    encoding: 'utf8',
  });
}

test('unique secrets allow startup', () => assert.equal(load().status, 0));
test('missing session secret prevents startup', () => {
  const result = load({ SECRET_KEY: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SECRET_KEY must be/);
});
test('old public defaults prevent startup', () => {
  for (const overrides of [{ SECRET_KEY: 'dev-secret-change-me' }, { ADMIN_PASSWORD: 'admin123456' }]) {
    assert.notEqual(load(overrides).status, 0);
  }
});
