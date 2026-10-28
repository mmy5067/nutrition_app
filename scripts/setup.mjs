import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const target = new URL('.env.local', root);
if (['.env', '.env.local'].some((name) => existsSync(new URL(name, root)))) {
  console.error('Existing .env or .env.local found; configuration was left untouched. Edit it manually.');
  process.exitCode = 1;
} else {
  const template = readFileSync(new URL('.env.example', root), 'utf8');
  const configured = template
    .replace(/^SECRET_KEY=.*$/m, `SECRET_KEY=${randomBytes(32).toString('hex')}`)
    .replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}`);
  writeFileSync(target, configured, { flag: 'wx', mode: 0o600 });
  console.log(`Created ${fileURLToPath(target)}. Open this file to read the generated admin password and configure the AI / SMTP services.`);
}
