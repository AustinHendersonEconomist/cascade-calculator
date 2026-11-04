// Regression and manuscript-parity tests for the deterministic model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS, compute, validate, capitalRecovery, annuityFactor, reduction, threshold,
  encodeScenario, decodeScenario} from '../model.mjs';
import {EXAMPLES} from '../examples.mjs';

const close = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('defaults validate', () => assert.deepEqual(validate(DEFAULTS), []));

test('manuscript S1/S2/S5 parity (research.html table)', () => {
  const s1 = compute(EXAMPLES.S1.inputs), s2 = compute(EXAMPLES.S2.inputs), s5 = compute(EXAMPLES.S5.inputs);
  close(s1.annualChange, 4.31, 0.005);
  close(s1.costPV, 1916); close(s2.costPV, 1916); close(s5.costPV, 1916);
  close(s1.netPV, -337); close(s2.netPV, 2622); close(s5.netPV, -1916);
  assert.equal(s5.annualChange, 0);
});

test('capital recovery and annuity factor are reciprocal over equal lives', () => {
  for (const r of [0, 0.03, 0.08]) close(capitalRecovery(r, 7) * annuityFactor(r, 7), 1, 1e-12);
  assert.equal(capitalRecovery(0, 5), 0.2);
  assert.equal(annuityFactor(0, 5), 5);
});

test('low-dose reduction and exact model limits', () => {
  close(reduction(100, 100, 0, 'lowDose'), 0.5, 1e-12);
  assert.equal(reduction(100, 100, 0, 'exact'), 0);
  // Exact model converges to the low-dose model as dose → 0.
  close(reduction(100, 100, 1e-6, 'exact'), 0.5, 1e-6);
  assert.ok(reduction(100, 100, 2, 'exact') < 0.5);
});

test('threshold statuses', () => {
  assert.equal(threshold(-1, 1).status, 'already');
  assert.equal(threshold(0, 1).status, 'atZero');
  assert.equal(threshold(1, 0).status, 'unavailable');
  assert.equal(threshold(2, 1).status, 'unattainable');
  assert.deepEqual(threshold(0.5, 1), {status: 'required', value: 0.5});
});

test('break-even effect threshold reproduces zero NPV', () => {
  const v = {...DEFAULTS, route: 'infection', rr: 1};
  const t = compute(v).effectThreshold;
  assert.equal(t.status, 'required');
  close(compute({...v, rr: 1 - t.value}).netPV, 0, 1e-6);
});

test('learning threshold reproduces zero NPV', () => {
  const v = {...DEFAULTS, caregiverCost: 0};
  const r = compute(v);
  assert.equal(r.learningStatus, 'required');
  close(compute({...v, includeLearning: true, terminalGain: r.learningThreshold}).netPV, 0, 1e-6);
});

test('scenario links round-trip', () => {
  const v = {...EXAMPLES.S2.inputs};
  assert.deepEqual(decodeScenario(encodeScenario(v)).inputs, v);
  assert.match(decodeScenario('#v=0.6&pupils=3').notice, /older or unknown/);
});

test('invalid inputs throw', () => {
  assert.throws(() => compute({...DEFAULTS, pupils: 0}), RangeError);
  assert.throws(() => compute({...DEFAULTS, occupants: 10, pupils: 25}), RangeError);
});
