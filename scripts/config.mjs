// Site settings, read from settings.yml in the project root. Run `npm run build` after a change.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// settings.yml only holds flat `key: value` lines, so this small reader is enough.
// A # starts a comment unless the value is in quotes.
function readSettings() {
  const file = join(ROOT, 'settings.yml');
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([a-z0-9_]+):(.*)$/i);
    if (!m) continue;
    let value = m[2].trim();
    const quoted = value.match(/^(["'])(.*)\1$/);
    value = quoted ? quoted[2] : value.replace(/\s+#.*$/, '').trim();
    out[m[1]] = value;
  }
  return out;
}

const settings = readSettings();
const get = (key, fallback = '') => settings[key] || fallback;

export const SITE = {
  name: get('site_name', 'UX Scale Labs'),
  shortName: get('short_name', 'UX Scales'),
  url: get('site_url', 'https://uxscalelabs.online').replace(/\/+$/, ''),
  repo: get('github_repo'),
  kofi: get('kofi_url'),
  logo: get('logo'),
  adsClient: get('adsense_client'),
  gaId: get('ga_id'),
  contactEmail: get('contact_email'),
  privacyUpdated: get('privacy_updated'),
};

if (SITE.logo && !existsSync(join(ROOT, SITE.logo))) {
  throw new Error(`logo is set to "${SITE.logo}" in settings.yml, but that file does not exist.`);
}
