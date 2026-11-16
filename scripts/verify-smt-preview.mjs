/**
 * Source-level deployment contract checks. Does not install dependencies,
 * access a database, run servers, or inspect personal data.
 * Usage: node scripts/verify-smt-preview.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const config = JSON.parse(read('vercel.json'));
const app = read('artifacts/fiche-medicale/src/App.tsx');
const layout = read('artifacts/fiche-medicale/src/components/Layout.tsx');
const dashboard = read('artifacts/fiche-medicale/src/pages/Dashboard.tsx');
const vite = read('artifacts/fiche-medicale/vite.config.ts');
const pkg = JSON.parse(read('artifacts/fiche-medicale/package.json'));
let passed = 0;
function check(label, fn) {
  try { fn(); passed++; process.stdout.write(`PASS ${label}\n`); }
  catch (error) { process.stderr.write(`FAIL ${label}: ${error.message}\n`); process.exitCode = 1; }
}
const routes = [
  '/employees', '/employees/new', '/employees/:matricule', '/import', '/import/multi-feuilles', '/generer',
  '/registre', '/hygiene/new', '/hygiene/historique', '/expertises',
  '/pointage', '/evaluation',
];

check('Vercel selects the premium React app rather than workspace root', () => {
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, 'artifacts/fiche-medicale/dist/public');
  assert.match(config.buildCommand, /@workspace\/fiche-medicale/);
  assert.ok(!config.buildCommand.includes('mockup-sandbox'));
});
check('Vercel supplies Vite build-time port and base path', () => {
  assert.match(config.buildCommand, /PORT=18971/);
  assert.match(config.buildCommand, /BASE_PATH=\//);
  assert.match(vite, /process\.env\.PORT/);
  assert.match(vite, /process\.env\.BASE_PATH/);
});
check('Build output agrees with Vite config', () => {
  assert.match(vite, /dist\/public/);
  assert.equal(pkg.name, '@workspace/fiche-medicale');
});
check('All first-class SPA routes have safe rewrite entries', () => {
  const rewrites = new Map(config.rewrites.map(({source, destination}) => [source, destination]));
  for (const route of routes) {
    assert.ok(app.includes(`path="${route}"`), `SPA no longer declares ${route}`);
    assert.equal(rewrites.get(route), '/index.html', `Rewrite missing for ${route}`);
  }
});
check('API and asset endpoints are never rewritten into HTML', () => {
  for (const rule of config.rewrites) {
    assert.ok(!rule.source.startsWith('/api'), 'API rewrite forbidden');
    assert.ok(!rule.source.startsWith('/assets'), 'Asset rewrite forbidden');
    assert.ok(!['/(.*)', '/:path*', '/*'].includes(rule.source), 'Catch-all rewrite forbidden');
  }
});
check('Original premium UI layout and navigation remain present', () => {
  for (const value of ['Tableau de bord', 'Personnel', 'Générer Fiches', 'Import Excel', 'Éval. Objectifs']) {
    assert.ok(layout.includes(value), `Missing original nav label: ${value}`);
  }
});
check('Original Dashboard source remains present', () => {
  assert.ok(dashboard.length > 1000);
  assert.match(dashboard, /Recharts|recharts|PieChart|BarChart|Bar\b/);
});
check('No Vercel API backend is falsely implied by static config', () => {
  assert.ok(config.rewrites.every(x => !x.source.includes('/api')));
  assert.equal(config.functions, undefined);
});
console.log(`${passed}/8 checks passed`);
