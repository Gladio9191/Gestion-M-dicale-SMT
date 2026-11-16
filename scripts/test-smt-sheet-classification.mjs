import assert from 'node:assert/strict';
import { detectSheetType, SHEET_TYPE_LABELS } from '../artifacts/fiche-medicale/src/lib/sheetClassification.ts';

const cases = [
  ['VMS 2026', 'visites'], ['VM', 'visites'], ['Visites périodiques', 'visites'],
  ['Personnel Global', 'personnel'], ['LISTE PERSONNEL', 'personnel'],
  ['RM hauteur', 'restrictions'], ['Etat RM', 'restrictions'], ['Restrictions', 'restrictions'],
  ['PSA 2026', 'campagne'], ['Métabo', 'campagne'], ['check up', 'campagne'],
  ['HC campagne', 'campagne'], ['Bilan Annexe', 'campagne'],
  ['Divers', 'inconnu'], ['', 'inconnu'], ['global RM', 'restrictions']
];
for (const [name, expected] of cases) {
  assert.equal(detectSheetType(name), expected, `Classification for ${JSON.stringify(name)}`);
}
assert.deepEqual(Object.keys(SHEET_TYPE_LABELS).sort(), ['visites','personnel','restrictions','campagne','inconnu'].sort());
console.log(`PASS ${cases.length + 1}/${cases.length + 1} multi-sheet classification checks`);
