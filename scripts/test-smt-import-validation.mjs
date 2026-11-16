import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalVisitDate, validateSheetRows } from '../artifacts/fiche-medicale/src/lib/importValidation.ts';

test('strict French/ISO calendar dates with leap-year validation', () => {
  assert.equal(canonicalVisitDate('29/02/2024'),'2024-02-29');
  assert.equal(canonicalVisitDate('2026-11-16'),'2026-11-16');
  assert.equal(canonicalVisitDate('31/02/2026'),null);
  assert.equal(canonicalVisitDate('02/29/2024'),null);
  assert.equal(canonicalVisitDate(''),null);
  assert.equal(canonicalVisitDate('2026-13-01'),null);
});

test('visits warn about missing IDs, invalid dates and repeat visit keys', () => {
  const s = validateSheetRows('visites', [
    {MLE:'81888',Dates:'01/10/2025'},
    {Matricule:'81888','Date VM':'2025-10-01'},
    {MLE:'',Dates:'02/10/2025'},
    {MLE:'11111',Dates:'31/02/2026'},
    {MLE:'22222',Dates:''},
  ]);
  assert.deepEqual(s,{ totalRows:5, missingMatricule:1, missingVisitDate:1, invalidVisitDate:1, duplicateVisits:1,duplicateMatricules:0});
});

test('personnel warns about duplicate matricule, no names required', () => {
  const s=validateSheetRows('personnel',[{Mle:'1'},{MLE:'1'},{Mle:''}]);
  assert.equal(s.duplicateMatricules,1);
  assert.equal(s.missingMatricule,1);
});

test('restrictions and campaigns detect missing matricules', () => {
  assert.equal(validateSheetRows('restrictions',[{Mle:''},{Mle:'42'}]).missingMatricule,1);
  assert.equal(validateSheetRows('campagne',[{Matricule:'42'}]).missingMatricule,0);
});
