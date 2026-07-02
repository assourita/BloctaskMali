/**
 * Démarre Expo en mode tunnel avec NGROK_AUTH_TOKEN chargé depuis .env
 * (Expo n'exporte pas automatiquement NGROK_AUTH_TOKEN depuis .env)
 */
const { spawn } = require('child_process');
const path = require('path');
const { loadNgrokToken } = require('./load-env');

const token = loadNgrokToken();
if (!token) {
  console.error(`
❌ NGROK_AUTH_TOKEN manquant — le tunnel Expo ne peut pas démarrer.

1. Compte gratuit : https://dashboard.ngrok.com/signup
2. Token : https://dashboard.ngrok.com/get-started/your-authtoken
3. Dans mobile/.env :
     NGROK_AUTH_TOKEN=votre_token

── Alternative (même Wi‑Fi, recommandé) ──
  npm run start:lan
`);
  process.exit(1);
}

process.env.NGROK_AUTH_TOKEN = token;

const args = ['start', '--tunnel', ...process.argv.slice(2)];
const child = spawn('npx', ['expo', ...args], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 0));
