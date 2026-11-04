// Tests for the probabilistic sensitivity analysis module.
import test from 'node:test';
import assert from 'node:assert/strict';
import {rng, normalSampler, fromMoments, draw, defaultSpecs, simulate, runPSA, evpi, evppi, evppiBinned, evsi, seLogRateRatio,
  summarise, quantile, ceac, populationValue} from '../psa.mjs';
import {DEFAULTS, compute} from '../model.mjs';
import {EXAMPLES} from '../examples.mjs';

const sample = (spec, n = 60000, seed = 7) => {
  const u = rng(seed), z = normalSampler(u);
  return Float64Array.from({length: n}, () => draw(spec, u, z));
};
const moments = a => { const s = summarise(a); return [s.mean, s.sd]; };

test('PRNG is deterministic and in (0,1)', () => {
  const a = rng(1), b = rng(1);
  for (let i = 0; i < 1000; i++) { const x = a(); assert.equal(x, b()); assert.ok(x >= 0 && x < 1); }
});

for (const [type, m, sd] of [['beta', 0.2, 0.05], ['gamma', 250, 75], ['lognormal', 0.8, 0.2], ['normal', -0.01, 0.02], ['uniform', 5, 1]]) {
  test(`${type} distribution reproduces its moments`, () => {
    const [em, esd] = moments(sample(fromMoments(type, m, sd)));
    assert.ok(Math.abs(em - m) < 0.02 * Math.abs(m) + 0.002, `mean ${em} vs ${m}`);
    assert.ok(Math.abs(esd - sd) < 0.03 * sd, `sd ${esd} vs ${sd}`);
  });
}

test('gamma with shape < 1 keeps its mean', () => {
  const [em] = moments(sample(fromMoments('gamma', 2, 4)));
  assert.ok(Math.abs(em - 2) < 0.1, String(em));
});

test('boundary means become fixed distributions', () => {
  assert.equal(fromMoments('beta', 1, 0.1).type, 'fixed');
  assert.equal(fromMoments('gamma', 0, 1).type, 'fixed');
  assert.equal(fromMoments('lognormal', 1, 0).type, 'fixed');
});

test('beta variance is capped so shapes stay positive', () => {
  const s = fromMoments('beta', 0.5, 10);
  assert.ok(s.alpha > 0 && s.beta > 0);
});

test('default specs follow route relevance', () => {
  const mech = defaultSpecs(DEFAULTS);
  assert.ok('addressable' in mech && !('rr' in mech) && !('dose' in mech));
  const inf = defaultSpecs({...DEFAULTS, route: 'infection'});
  assert.ok('rr' in inf && !('addressable' in inf));
  const abs = defaultSpecs({...DEFAULTS, route: 'absence'});
  assert.ok('baselineDays' in abs && !('qalyLoss' in abs));
  assert.ok('terminalGain' in defaultSpecs({...DEFAULTS, includeLearning: true}));
});

test('zero envelope reproduces the deterministic result exactly', () => {
  const v = EXAMPLES.S2.inputs, r = runPSA(v, {envelope: 0, n: 50});
  assert.ok(r.npv.sd < 1e-9);
  assert.ok(Math.abs(r.npv.mean - compute(v).netPV) < 1e-9);
  assert.equal(r.evpi, 0);
});

test('simulation is reproducible for a seed and differs across seeds', () => {
  const a = simulate(DEFAULTS, defaultSpecs(DEFAULTS), {n: 200, seed: 3});
  const b = simulate(DEFAULTS, defaultSpecs(DEFAULTS), {n: 200, seed: 3});
  const c = simulate(DEFAULTS, defaultSpecs(DEFAULTS), {n: 200, seed: 4});
  assert.deepEqual(a.netPV, b.netPV);
  assert.notDeepEqual(a.netPV, c.netPV);
});

test('every draw stays within input limits (compute would throw otherwise)', () => {
  const v = {...EXAMPLES.S5.inputs};
  const r = runPSA(v, {envelope: 'high', n: 3000});
  assert.equal(r.n, 3000);
  assert.ok(Number.isFinite(r.npv.mean));
});

test('EVPI matches the closed form for normal net benefit', () => {
  // INB ~ N(mu, s): EVPI = s·φ(mu/s) − |mu|·Φ(−|mu|/s)
  const mu = 100, s = 400, n = 200000, u = rng(11), z = normalSampler(u);
  const nb = Float64Array.from({length: n}, () => mu + s * z());
  const phi = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  // Φ via erf approximation (Abramowitz–Stegun 7.1.26)
  const Phi = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    const e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? (1 + e) / 2 : (1 - e) / 2; };
  const exact = s * phi(mu / s) - mu * Phi(-mu / s);
  assert.ok(Math.abs(evpi(nb) - exact) < 0.02 * exact, `${evpi(nb)} vs ${exact}`);
});

test('EVPPI of the sole uncertain driver approaches EVPI; noise has ~0', () => {
  const n = 40000, u = rng(5), z = normalSampler(u);
  const theta = Float64Array.from({length: n}, () => z());
  const noise = Float64Array.from({length: n}, () => z());
  const nb = theta.map(t => 50 + 300 * t);
  const total = evpi(nb);
  assert.ok(evppi(theta, nb) > 0.97 * total);
  assert.ok(evppi(noise, nb) < 0.1 * total);
});

test('EVPPI never exceeds EVPI in a full run', () => {
  const r = runPSA(EXAMPLES.S1.inputs, {n: 4000});
  for (const p of r.evppi) assert.ok(p.evppi >= 0 && p.evppi <= r.evpi + 1e-9, p.key);
});

test('CEAC is monotone in lambda when QALY gains are non-negative', () => {
  const r = runPSA(EXAMPLES.S1.inputs, {n: 3000});
  for (let i = 1; i < r.ceac.length; i++) assert.ok(r.ceac[i].p >= r.ceac[i - 1].p - 1e-12);
});

test('CEAC at the scenario lambda reproduces P(NPV > 0)', () => {
  const v = EXAMPLES.S1.inputs, sim = simulate(v, defaultSpecs(v), {n: 3000});
  const [pt] = ceac(sim, [v.qalyValue]);
  let pos = 0; for (const x of sim.netPV) if (x > 0) pos++;
  assert.equal(pt.p, pos / sim.n);
});

test('absence route has no CEAC', () => {
  assert.equal(runPSA({...DEFAULTS, route: 'absence', rr: 0.9, absenceValue: 50}, {n: 200}).ceac, null);
});

test('quantile and population value helpers', () => {
  assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(quantile([0, 10], 0.25), 2.5);
  assert.equal(populationValue(10, 100, 5, 0), 5000);
});

test('regression EVPPI resists the upward bias of binning for weak parameters', () => {
  // NB = 300·θ_strong + 5·θ_weak + large noise, decision near indifference.
  const n = 10000, u = rng(9), z = normalSampler(u);
  const strong = Float64Array.from({length: n}, () => z());
  const weak = Float64Array.from({length: n}, () => z());
  const nb = Float64Array.from({length: n}, (_, i) => 10 + 300 * strong[i] + 5 * weak[i] + 3000 * z());
  assert.ok(evppi(weak, nb) < evppiBinned(weak, nb));
  assert.ok(evppi(weak, nb) < 20, String(evppi(weak, nb)));
});

test('regression EVPPI captures nonlinear dependence', () => {
  const n = 20000, u = rng(13), z = normalSampler(u);
  const theta = Float64Array.from({length: n}, () => z());
  const nb = theta.map(t => 400 * t * t - 400); // E[NB] = 0, sign depends on |θ|
  assert.ok(evppi(theta, nb) > 0.95 * evpi(nb));
});

test('median-centred ratio keeps a null ratio neutral', () => {
  const spec = fromMoments('logratio', 1, 0.3);
  assert.equal(spec.mu, 0);
  const a = sample(spec, 60000, 21);
  let below = 0; for (const x of a) if (x < 1) below++;
  assert.ok(Math.abs(below / a.length - 0.5) < 0.01);
});

test('EVSI matches the normal–normal preposterior closed form', () => {
  // θ ~ N(0, 1), INB = 100 + 400θ, study SE τ: posterior-mean SD = σ²/√(σ²+τ²).
  const n = 60000, u = rng(17), z = normalSampler(u);
  const theta = Float64Array.from({length: n}, () => z()), nb = theta.map(t => 100 + 400 * t);
  const closed = sd => { const m = 100, s = 400 * sd;
    const phi = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
    const Phi = x => 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI)));
    return s * phi(m / s) - m * Phi(-m / s); };
  for (const tau of [0.5, 1, 2]) {
    const sdPre = 1 / Math.sqrt(1 + tau * tau), est = evsi(theta, nb, tau, {seed: 3});
    assert.ok(Math.abs(est - closed(sdPre)) < 0.05 * closed(sdPre) + 2, `tau ${tau}: ${est} vs ${closed(sdPre)}`);
  }
});

test('EVSI rises with sample size towards EVPPI', () => {
  const v = {...EXAMPLES.S5.inputs}, r = runPSA(v, {n: 5000});
  const th = r.sim.draws.rr, nb = r.sim.netPV, full = evppi(Float64Array.from(th, Math.log), nb);
  const vals = [50, 500, 5000, 50000].map(k => evsi(th, nb, seLogRateRatio(k, 4), {transform: Math.log}));
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i] >= vals[i - 1] - 0.02 * full);
  assert.ok(vals.at(-1) > 0.9 * full && vals.at(-1) <= full + 1e-9);
});

test('standard error of a log rate ratio', () => {
  assert.ok(Math.abs(seLogRateRatio(100, 4, 1, 1) - Math.sqrt(2 / 400)) < 1e-12);
  assert.equal(seLogRateRatio(0, 4), Infinity);
});
