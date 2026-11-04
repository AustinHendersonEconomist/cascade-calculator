// Reproduces every number reported in the manuscript.
// Usage: node manuscript/analysis/run-analyses.mjs  (writes results.json and draws-*.csv)
import {writeFileSync} from 'node:fs';
import {compute} from '../../model.mjs';
import {EXAMPLES} from '../../examples.mjs';
import {runPSA, defaultSpecs, describe, PARAMETERS, evpi, evppiBinned, populationValue} from '../../psa.mjs';

const out = {generated: new Date().toISOString().slice(0, 10), seed: 20261104, n: 10000, scenarios: {}};
const dir = new URL('.', import.meta.url).pathname;

for (const [id, ex] of Object.entries(EXAMPLES)) {
  const v = ex.inputs, det = compute(v);
  const rec = {name: ex.name, deterministic: {costPV: det.costPV, benefitPV: det.benefitPV, netPV: det.netPV,
    annualChange: det.annualChange, totalQaly: det.totalQaly, effectThreshold: det.effectThreshold, learningThreshold: det.learningThreshold}, envelopes: {}};
  for (const env of ['low', 'moderate', 'high']) {
    const r = runPSA(v, {envelope: env, n: out.n, seed: out.seed});
    const evppiRows = r.evppi.map(p => ({...p, binned: evppiBinned(r.sim.draws[p.key], r.sim.netPV)}));
    rec.envelopes[env] = {npv: r.npv, cost: r.cost, benefit: r.benefit, evpi: r.evpi, evppi: evppiRows,
      ceac: r.ceac, clamped: r.clampedDraws};
    if (env === 'moderate') {
      rec.specs = Object.fromEntries(Object.entries(r.specs).map(([k, s]) => [k, {label: PARAMETERS[k].label, family: PARAMETERS[k].family,
        mean: s.mean * PARAMETERS[k].scale, sd: (s.sd ?? 0) * PARAMETERS[k].scale, text: describe(s, PARAMETERS[k].scale)}]));
      const {sim} = r, keys = sim.keys;
      const lines = [['iteration', ...keys, 'costPV', 'benefitPV', 'netPV', 'healthPV', 'qalyPV'].join(',')];
      for (let i = 0; i < sim.n; i++) lines.push([i + 1, ...keys.map(k => sim.draws[k][i]), sim.costPV[i], sim.benefitPV[i], sim.netPV[i], sim.healthPV[i], sim.qalyPV[i]].join(','));
      writeFileSync(`${dir}draws-${id}.csv`, lines.join('\n'));
    }
  }
  // Convergence of EVPI and P(NPV>0) with iteration count, moderate envelope.
  rec.convergence = [500, 1000, 2000, 5000, 10000, 20000, 50000].map(n => {
    const reps = [1, 2, 3, 4, 5].map(s => runPSA(v, {n, seed: s}));
    const m = a => a.reduce((x, y) => x + y, 0) / a.length;
    const sd = a => Math.sqrt(m(a.map(x => (x - m(a)) ** 2)) * a.length / (a.length - 1));
    const e = reps.map(r => r.evpi), p = reps.map(r => r.npv.pPositive);
    return {n, evpiMean: m(e), evpiSD: sd(e), pMean: m(p), pSD: sd(p)};
  });
  out.scenarios[id] = rec;
}

// S5 variant: null ratio with an evidence-like lognormal SD on log scale from
// a hypothetical trial (95% CI 0.70 to 1.43, i.e. SE(log RR) = 0.182).
{
  const v = EXAMPLES.S5.inputs, specs = defaultSpecs(v, 'moderate');
  const sdLog = Math.log(1.43) / 1.96;
  specs.rr = {type: 'lognormal', mean: Math.exp(sdLog ** 2 / 2), sd: null, mu: 0, sigma: sdLog};
  specs.rr.sd = specs.rr.mean * Math.sqrt(Math.exp(sdLog ** 2) - 1);
  const r = runPSA(v, {specs, n: out.n, seed: out.seed});
  out.s5Trial = {sdLog, npv: r.npv, evpi: r.evpi, evppi: r.evppi.slice(0, 4)};
}

// Population EVPI for S1 and S5 across decision populations (10 years, 3%).
out.population = [100, 1000, 10000, 100000].map(k => ({cohorts: k,
  S1: populationValue(out.scenarios.S1.envelopes.moderate.evpi, k, 10, 3),
  S5: populationValue(out.scenarios.S5.envelopes.moderate.evpi, k, 10, 3)}));

writeFileSync(`${dir}results.json`, JSON.stringify(out, null, 1));
for (const [id, s] of Object.entries(out.scenarios)) {
  const m = s.envelopes.moderate;
  console.log(id, 'det', s.deterministic.netPV.toFixed(1), 'mean', m.npv.mean.toFixed(1), `[${m.npv.lo.toFixed(0)}, ${m.npv.hi.toFixed(0)}]`,
    'P', m.npv.pPositive.toFixed(3), 'EVPI', m.evpi.toFixed(1), m.evppi.slice(0, 3).map(x => `${x.key}=${x.evppi.toFixed(1)}(bin ${x.binned.toFixed(1)})`).join(' '));
  for (const env of ['low', 'high']) console.log('   ', env, s.envelopes[env].npv.pPositive.toFixed(3), s.envelopes[env].evpi.toFixed(1));
  console.log('    conv', s.convergence.map(c => `${c.n}:${c.evpiMean.toFixed(1)}±${c.evpiSD.toFixed(1)}`).join(' '));
}
console.log('S5 trial', JSON.stringify(out.s5Trial.npv), out.s5Trial.evpi);
console.log(out.population);
