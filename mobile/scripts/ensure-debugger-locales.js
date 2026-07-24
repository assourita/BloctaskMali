/**
 * Expo/Metro sometimes requests debugger-frontend locale fr.json which is
 * missing from @react-native/debugger-frontend. Copy en-US as fallback.
 */
const fs = require('fs');
const path = require('path');

const locales = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'debugger-frontend',
  'dist',
  'third-party',
  'front_end',
  'core',
  'i18n',
  'locales',
);

const fr = path.join(locales, 'fr.json');
const en = path.join(locales, 'en-US.json');

if (!fs.existsSync(locales) || !fs.existsSync(en)) {
  process.exit(0);
}
if (!fs.existsSync(fr)) {
  fs.copyFileSync(en, fr);
  console.log('[ensure-debugger-locales] created fr.json from en-US.json');
}
