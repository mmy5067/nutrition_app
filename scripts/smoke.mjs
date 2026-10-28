import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), 'nutrition-smoke-'));
const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const password = randomBytes(24).toString('hex');
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root,
  windowsHide: true,
  env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: `sqlite:${path.join(temporary, 'test.sqlite')}`, SECRET_KEY: randomBytes(32).toString('hex'), ADMIN_EMAIL: 'smoke@example.com', ADMIN_PASSWORD: password, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk; });
child.stderr.on('data', (chunk) => { logs += chunk; });
let cookie = '';
async function api(route, method = 'GET', body) {
  const response = await fetch(base + route, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(response.ok, true, `${method} ${route}: ${response.status}`);
  return { response, data: await response.json() };
}

try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(base + '/healthz')).ok; } catch {}
    if (ready || child.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready, 'production server failed to start');
  assert.equal((await fetch(base + '/api/admin/users')).status, 401);
  const login = await api('/api/auth/login', 'POST', { email: 'smoke@example.com', password });
  cookie = login.response.headers.get('set-cookie').split(';')[0];
  assert.match(login.response.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(login.response.headers.get('set-cookie'), /Secure/i);
  const current = await api('/api/auth/me');
  assert.equal(current.data.authenticated, true);
  const created = await api('/api/meals', 'POST', { eaten_at: '2026-01-02T12:00:00Z', meal_type: '午餐', items: [{ name: '测试食物', quantity: 100, unit: 'g', calories: 120, protein: 3, fat: 2, carbs: 20 }] });
  assert.ok(created.data.meal_id);
  const day = await api('/api/meals/day?date=2026-01-02');
  assert.equal(day.data.meals.length, 1);
  const summary = await api('/api/meals/summary?date=2026-01-02');
  assert.equal(summary.data.total_calories, 120);
  await api('/api/admin/users');
  await api(`/api/meals/${created.data.meal_id}`, 'DELETE');
  assert.equal((await api('/api/meals/day?date=2026-01-02')).data.meals.length, 0);
  console.log('Production SQLite smoke passed: health, access control, login, admin, meal creation, daily totals, deletion. No model or SMTP calls.');
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  child.kill();
  await new Promise((resolve) => child.exitCode !== null ? resolve() : child.once('exit', resolve));
  await rm(temporary, { recursive: true, force: true });
}
