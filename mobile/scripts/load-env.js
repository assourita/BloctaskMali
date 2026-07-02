/** Charge NGROK_AUTH_TOKEN depuis mobile/.env (sans dépendance dotenv). */
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const vars = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    vars[key] = value;
  }
  return vars;
}

function loadNgrokToken() {
  if (process.env.NGROK_AUTH_TOKEN) return process.env.NGROK_AUTH_TOKEN;
  return loadEnvFile().NGROK_AUTH_TOKEN || null;
}

module.exports = { loadEnvFile, loadNgrokToken };
