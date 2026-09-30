// Generates a unique owner password without putting credentials in terminal/chat output.
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const environmentFile = new URL('../.env.admin.local', import.meta.url);
const accessFile = new URL('../admin-access.local.txt', import.meta.url);
if (existsSync(environmentFile) || existsSync(accessFile)) {
  throw new Error('Admin credential files already exist. Keep them safe; rotate credentials deliberately rather than overwriting them.');
}
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
writeFileSync(environmentFile, `ADMIN_PASSWORD_HASH=${hash}\nADMIN_SESSION_SECRET=${randomBytes(48).toString('base64url')}\n`, { mode: 0o600, flag: 'wx' });
writeFileSync(accessFile, `Born From Water — private preview admin\n\nSign in at your preview website's /admin page.\n\nOwner password: ${password}\n\nKeep this password in your password manager. Do not commit or share this file.\nThe two deployment variables are in .env.admin.local; the plaintext password is not deployed.\n`, { mode: 0o600, flag: 'wx' });
console.log(`Created private local credential files:\n${fileURLToPath(environmentFile)}\n${fileURLToPath(accessFile)}\nNo credentials were printed.`);
