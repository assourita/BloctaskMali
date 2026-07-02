/**
 * Tunnel ngrok pour le backend Django (port 8000).
 *
 * Prérequis : compte gratuit sur https://dashboard.ngrok.com/get-started/your-authtoken
 * Puis dans mobile/.env :
 *   NGROK_AUTH_TOKEN=votre_token
 *
 * Usage : npm run tunnel:backend
 */
const ngrok = require('@expo/ngrok');
const { loadNgrokToken } = require('./load-env');

const PORT = process.env.BACKEND_PORT || 8000;

function printSetupHelp() {
  console.error(`
❌ Tunnel ngrok impossible sans token d'authentification.

Étapes (une seule fois) :
  1. Créez un compte : https://dashboard.ngrok.com/signup
  2. Copiez votre authtoken : https://dashboard.ngrok.com/get-started/your-authtoken
  3. Ajoutez dans mobile/.env :
       NGROK_AUTH_TOKEN=votre_token_ici

Puis relancez : npm run tunnel:backend

── Alternative (même Wi‑Fi, sans ngrok API) ──
  Gardez le backend sur 0.0.0.0:8000 et dans mobile/.env :
    EXPO_PUBLIC_API_URL=http://VOTRE_IP_LAN:8000/api
  Puis : npm run start:lan
`);
}

(async () => {
  const authtoken = loadNgrokToken();
  if (!authtoken) {
    printSetupHelp();
    process.exit(1);
  }

  try {
    console.log(`\n🔌 Ouverture du tunnel ngrok vers localhost:${PORT}...\n`);
    const url = await ngrok.connect({
      addr: Number(PORT),
      authtoken,
    });
    console.log('✅ Backend accessible publiquement :');
    console.log(`   ${url}`);
    console.log('\n📝 Mettez à jour mobile/.env :');
    console.log(`   EXPO_PUBLIC_API_URL=${url}/api`);
    console.log('\n⚠️  Redémarrez Expo (npm run start:tunnel) après modification du .env');
    console.log('⚠️  Laissez ce terminal ouvert. Ctrl+C pour arrêter.\n');
  } catch (err) {
    console.error('Erreur tunnel :', err.message || err);
    if (/authtoken|auth token|401|403/i.test(String(err.message || err))) {
      console.error('\n→ Vérifiez que NGROK_AUTH_TOKEN dans mobile/.env est correct.\n');
    } else if (/failed to start tunnel|ECONNREFUSED/i.test(String(err.message || err))) {
      console.error('\n→ Vérifiez que Django tourne : python manage.py runserver 0.0.0.0:8000\n');
    } else {
      printSetupHelp();
    }
    process.exit(1);
  }
})();
