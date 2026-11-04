// CASCADE probabilistic sensitivity analysis (PSA).
//
// Propagates parameter uncertainty through the deterministic model in
// model.mjs by Monte Carlo simulation. The functions return:
//   - summaries of the net present value (NPV) distribution,
//   - a cost-effectiveness acceptability curve (CEAC) over the monetary value
//     of a QALY,
//   - the expected value of perfect information (EVPI), and
//   - single-parameter expected value of partial perfect information (EVPPI),
//     estimated by the nonparametric binning ("single-loop") method of
//     Strong & Oakley (2013) and Sadatsafavi et al. (2013).
//
// The decision is between the specified intervention and no added
// intervention, whose incremental net benefit is zero by definition.
// Distribution conventions follow Briggs, Claxton & Sculpher (2006):
// beta for probabilities and proportions, gamma for costs and positive
// burdens, lognormal for ratios, normal for effects that can take either
// sign. Parameters are matched by the method of moments to a mean (the
// current deterministic input) and a standard deviation.
//
// Default distributions are generic uncertainty envelopes. They are not
// calibrated evidence, and the PSA results inherit that status.

import {LIMITS, compute} from './model.mjs';

export const PSA_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Random number generation
// ---------------------------------------------------------------------------

/** Seeded 32-bit PRNG (mulberry32). Returns a function producing U(0,1). */
export function rng(seed = 20261104) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal deviate via the Box–Muller transform (cached pair). */
export function normalSampler(u) {
  let spare = null;
  return function () {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u1 = 0;
    while (u1 <= Number.EPSILON) u1 = u();
    const u2 = u(), r = Math.sqrt(-2 * Math.log(u1)), th = 2 * Math.PI * u2;
    spare = r * Math.sin(th);
    return r * Math.cos(th);
  };
}

/** Gamma(shape k, scale 1) via Marsaglia & Tsang (2000); boosting for k < 1. */
export function gammaDraw(k, u, z) {
  if (k <= 0) return 0;
  if (k < 1) return gammaDraw(k + 1, u, z) * Math.pow(Math.max(u(), Number.MIN_VALUE), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = z(); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const w = u();
    if (w < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(w) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

// ---------------------------------------------------------------------------
// Distributions (method of moments)
// ---------------------------------------------------------------------------

/**
 * Build a distribution specification from a mean and standard deviation.
 * Returns {type, mean, sd, ...parameters}. A non-positive sd, or a mean on
 * a support boundary, yields a fixed (degenerate) distribution.
 */
export function fromMoments(type, mean, sd) {
  if (!(sd > 0) || !Number.isFinite(mean)) return {type: 'fixed', mean, sd: 0};
  switch (type) {
    case 'beta': {
      if (mean <= 0 || mean >= 1) return {type: 'fixed', mean, sd: 0};
      // Variance must be below m(1-m); cap at 95% of the maximum to keep
      // both shape parameters positive.
      const maxVar = mean * (1 - mean);
      const v = Math.min(sd * sd, 0.95 * maxVar);
      const common = maxVar / v - 1;
      return {type, mean, sd: Math.sqrt(v), alpha: mean * common, beta: (1 - mean) * common};
    }
    case 'gamma': {
      if (mean <= 0) return {type: 'fixed', mean, sd: 0};
      const shape = (mean / sd) ** 2;
      return {type, mean, sd, shape, scale: mean / shape};
    }
    case 'lognormal': {
      if (mean <= 0) return {type: 'fixed', mean, sd: 0};
      const s2 = Math.log(1 + (sd / mean) ** 2);
      return {type, mean, sd, mu: Math.log(mean) - s2 / 2, sigma: Math.sqrt(s2)};
    }
    case 'normal':
      return {type, mean, sd};
    case 'uniform': {
      const h = sd * Math.sqrt(3);
      return {type, mean, sd, min: mean - h, max: mean + h};
    }
    default:
      throw new RangeError(`Unknown distribution type: ${type}`);
  }
}

/** Draw one value from a specification. */
export function draw(spec, u, z) {
  switch (spec.type) {
    case 'fixed': return spec.mean;
    case 'beta': {
      const x = gammaDraw(spec.alpha, u, z), y = gammaDraw(spec.beta, u, z);
      return x + y > 0 ? x / (x + y) : spec.mean;
    }
    case 'gamma': return gammaDraw(spec.shape, u, z) * spec.scale;
    case 'lognormal': return Math.exp(spec.mu + spec.sigma * z());
    case 'normal': return spec.mean + spec.sd * z();
    case 'uniform': return spec.min + (spec.max - spec.min) * u();
    default: throw new RangeError(`Unknown distribution type: ${spec.type}`);
  }
}

/** Human-readable parameter summary for tables and exports. */
export function describe(spec, scale = 1) {
  const f = x => Number(x.toPrecision(4));
  switch (spec.type) {
    case 'fixed': return `Fixed at ${f(spec.mean * scale)}`;
    case 'beta': return `Beta(α = ${f(spec.alpha)}, β = ${f(spec.beta)})${scale !== 1 ? ` × ${scale}` : ''}`;
    case 'gamma': return `Gamma(k = ${f(spec.shape)}, θ = ${f(spec.scale)})`;
    case 'lognormal': return `Lognormal(μ = ${f(spec.mu)}, σ = ${f(spec.sigma)})`;
    case 'normal': return `Normal(μ = ${f(spec.mean)}, σ = ${f(spec.sd)})`;
    case 'uniform': return `Uniform(${f(spec.min)}, ${f(spec.max)})`;
    default: return spec.type;
  }
}

// ---------------------------------------------------------------------------
// Parameter catalogue
// ---------------------------------------------------------------------------

// Uncertain parameters and their default distribution families. `scale`
// converts the model's input unit to the distribution's support (e.g., a
// percentage to a proportion for the beta family). `routes` lists the
// outcome routes in which the parameter affects results. Decision and
// valuation parameters (cohort size, horizon, discount rate, the monetary
// value of a QALY and the per-SD earnings value) are not sampled: they are
// analyst choices, explored instead through the CEAC and scenario analysis.
export const PARAMETERS = Object.freeze({
  baselineFlow:       {label: 'Baseline clean-air flow', family: 'lognormal', scale: 1, routes: ['mechanistic']},
  addedFlow:          {label: 'Added delivered clean air', family: 'gamma', scale: 1, routes: ['mechanistic']},
  dose:               {label: 'Baseline exposure dose', family: 'gamma', scale: 1, routes: ['mechanistic'], when: v => v.riskModel === 'exact'},
  episodes:           {label: 'Baseline infection burden', family: 'gamma', scale: 1, routes: ['mechanistic', 'infection']},
  addressable:        {label: 'Addressable infection fraction', family: 'beta', scale: 100, routes: ['mechanistic']},
  baselineDays:       {label: 'Baseline absence burden', family: 'gamma', scale: 1, routes: ['absence']},
  rr:                 {label: 'Matched endpoint ratio', family: 'lognormal', scale: 1, routes: ['infection', 'absence']},
  capital:            {label: 'Up-front capital', family: 'gamma', scale: 1, routes: ['mechanistic', 'infection', 'absence']},
  operating:          {label: 'Annual operation & maintenance', family: 'gamma', scale: 1, routes: ['mechanistic', 'infection', 'absence']},
  medicalProbability: {label: 'Medically attended episodes', family: 'beta', scale: 100, routes: ['mechanistic', 'infection']},
  medicalCost:        {label: 'Healthcare resources', family: 'gamma', scale: 1, routes: ['mechanistic', 'infection']},
  caregiverCost:      {label: 'Caregiver time/resources', family: 'gamma', scale: 1, routes: ['mechanistic', 'infection']},
  daysPerEpisode:     {label: 'School absence per infection', family: 'gamma', scale: 1, routes: ['mechanistic', 'infection']},
  qalyLoss:           {label: 'Child health loss', family: 'gamma', scale: 1, routes: ['mechanistic', 'infection']},
  absenceValue:       {label: 'Non-overlapping absence value', family: 'gamma', scale: 1, routes: ['absence']},
  terminalGain:       {label: 'Terminal achievement difference', family: 'normal', scale: 1, routes: ['mechanistic', 'infection', 'absence'], when: v => v.includeLearning}
});

// Coefficients of variation for the three preset uncertainty envelopes.
export const ENVELOPES = Object.freeze({low: 0.1, moderate: 0.3, high: 0.6});

/**
 * Default PSA specification for a scenario: each relevant parameter receives
 * its family's distribution with mean equal to the current input and
 * SD = cv × |mean|. The terminal learning gain, which may be zero, uses an
 * absolute SD of max(cv × |mean|, 0.01 SD) when learning is included. A
 * matched endpoint ratio of exactly 1 keeps its uncertainty (lognormal with
 * mean 1), so the null case is not artificially certain.
 */
export function defaultSpecs(v, envelope = 'moderate') {
  const cv = typeof envelope === 'number' ? envelope : ENVELOPES[envelope];
  if (!(cv >= 0)) throw new RangeError('Unknown uncertainty envelope.');
  const specs = {};
  for (const [key, p] of Object.entries(PARAMETERS)) {
    if (!p.routes.includes(v.route) || (p.when && !p.when(v))) continue;
    const mean = v[key] / p.scale;
    const sd = key === 'terminalGain' ? Math.max(cv * Math.abs(mean), cv > 0 ? 0.01 : 0) : cv * Math.abs(mean);
    specs[key] = fromMoments(p.family, mean, sd);
  }
  return specs;
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

const clamp = (key, x) => {
  const [lo, hi] = LIMITS[key];
  return Math.min(hi, Math.max(lo, x));
};

/**
 * Run the Monte Carlo simulation.
 * @param {object} v       deterministic scenario inputs (validated by compute)
 * @param {object} specs   {key: distribution spec}, as from defaultSpecs
 * @param {object} opts    {n = 5000, seed}
 * @returns {object} draws per parameter and per-iteration outputs
 */
export function simulate(v, specs, {n = 5000, seed = 20261104} = {}) {
  if (!Number.isInteger(n) || n < 2 || n > 200000) throw new RangeError('Use between 2 and 200,000 iterations.');
  compute(v); // Fail early on invalid deterministic inputs.
  const u = rng(seed), z = normalSampler(u);
  const keys = Object.keys(specs);
  const draws = Object.fromEntries(keys.map(k => [k, new Float64Array(n)]));
  const out = {
    netPV: new Float64Array(n), costPV: new Float64Array(n), benefitPV: new Float64Array(n),
    healthPV: new Float64Array(n), qalyPV: new Float64Array(n), clamped: 0
  };
  for (let i = 0; i < n; i++) {
    const x = {...v};
    for (const k of keys) {
      const raw = draw(specs[k], u, z) * (PARAMETERS[k]?.scale ?? 1);
      const c = clamp(k, raw);
      if (c !== raw) out.clamped++;
      x[k] = c;
      draws[k][i] = c;
    }
    const r = compute(x);
    out.netPV[i] = r.netPV;
    out.costPV[i] = r.costPV;
    out.benefitPV[i] = r.benefitPV;
    out.healthPV[i] = r.components.health;
    // Discounted QALYs; zero on the absence route, which infers none.
    out.qalyPV[i] = r.annualQaly === null ? 0 : r.annualQaly * r.af;
  }
  return {n, seed, keys, specs, draws, ...out};
}

// ---------------------------------------------------------------------------
// Summaries and value of information
// ---------------------------------------------------------------------------

const mean = a => { let s = 0; for (const x of a) s += x; return s / a.length; };

/** Empirical quantile (type 7, linear interpolation). */
export function quantile(a, p) {
  const s = Float64Array.from(a).sort();
  const h = (s.length - 1) * p, lo = Math.floor(h), hi = Math.ceil(h);
  return s[lo] + (h - lo) * (s[hi] - s[lo]);
}

/** Summary of a sample: mean, SD, median, 95% interval, P(> 0). */
export function summarise(a) {
  const m = mean(a);
  let ss = 0, pos = 0;
  for (const x of a) { ss += (x - m) ** 2; if (x > 0) pos++; }
  return {mean: m, sd: Math.sqrt(ss / (a.length - 1)), median: quantile(a, 0.5),
    lo: quantile(a, 0.025), hi: quantile(a, 0.975), pPositive: pos / a.length,
    mcse: Math.sqrt(ss / (a.length - 1) / a.length)};
}

/**
 * Incremental net monetary benefit at a monetary value of health lambda
 * (MU/QALY). Removes whatever health valuation the scenario applied and
 * substitutes lambda × discounted QALYs, so the CEAC is defined whether or
 * not the deterministic scenario values health.
 */
export function netBenefitAt(sim, lambda) {
  const nb = new Float64Array(sim.n);
  for (let i = 0; i < sim.n; i++) nb[i] = sim.netPV[i] - sim.healthPV[i] + lambda * sim.qalyPV[i];
  return nb;
}

/** Cost-effectiveness acceptability curve: P(INB(λ) > 0) over a λ grid. */
export function ceac(sim, lambdas) {
  return lambdas.map(lambda => {
    const nb = netBenefitAt(sim, lambda);
    let pos = 0; for (const x of nb) if (x > 0) pos++;
    return {lambda, p: pos / sim.n, enb: mean(nb)};
  });
}

/**
 * EVPI per decision for an adopt/do-not-adopt choice against a zero
 * comparator: E[max(INB, 0)] − max(E[INB], 0).
 */
export function evpi(nb) {
  let s = 0; for (const x of nb) s += Math.max(x, 0);
  return s / nb.length - Math.max(mean(nb), 0);
}

/**
 * Single-parameter EVPPI by nonparametric binning. Iterations are sorted by
 * the parameter and divided into `bins` groups of near-equal size. The
 * conditional expected INB in each bin approximates E[INB | θ]. Then
 * EVPPI ≈ mean_b max(E[INB | bin b], 0) − max(E[INB], 0).
 * The default bin count, ⌊√n⌋, balances bias and variance for moderate n.
 * Estimates are truncated to [0, EVPI], which bounds them in theory.
 */
export function evppi(theta, nb, bins = Math.floor(Math.sqrt(nb.length))) {
  const n = nb.length;
  if (theta.length !== n) throw new RangeError('Parameter and net-benefit samples differ in length.');
  const idx = Array.from({length: n}, (_, i) => i).sort((a, b) => theta[a] - theta[b]);
  let total = 0;
  for (let b = 0; b < bins; b++) {
    const start = Math.floor(b * n / bins), end = Math.floor((b + 1) * n / bins);
    let s = 0; for (let j = start; j < end; j++) s += nb[idx[j]];
    total += Math.max(s / (end - start), 0) * (end - start);
  }
  const value = total / n - Math.max(mean(nb), 0);
  return Math.min(Math.max(value, 0), evpi(nb));
}

/**
 * Full PSA run returning everything the interface and exports need.
 * @param {object} v     scenario
 * @param {object} opts  {envelope, specs, n, seed, lambdas}
 */
export function runPSA(v, opts = {}) {
  const specs = opts.specs ?? defaultSpecs(v, opts.envelope ?? 'moderate');
  const sim = simulate(v, specs, {n: opts.n ?? 5000, seed: opts.seed ?? 20261104});
  const lambdas = opts.lambdas ?? Array.from({length: 41}, (_, i) => i * 5000);
  const nb = sim.netPV;
  const info = evpi(nb);
  const partial = sim.keys
    .filter(k => specs[k].type !== 'fixed')
    .map(k => ({key: k, label: PARAMETERS[k]?.label ?? k, evppi: evppi(sim.draws[k], nb)}))
    .sort((a, b) => b.evppi - a.evppi);
  return {
    version: PSA_VERSION, n: sim.n, seed: sim.seed, specs,
    npv: summarise(nb), cost: summarise(sim.costPV), benefit: summarise(sim.benefitPV),
    ceac: v.route === 'absence' ? null : ceac(sim, lambdas),
    evpi: info, evppi: partial, clampedDraws: sim.clamped, sim
  };
}

/** Population EVPI: per-decision EVPI × decisions per year × annuity factor. */
export function populationValue(perDecision, decisionsPerYear, years, ratePct) {
  const r = ratePct / 100;
  const af = r === 0 ? years : (1 - (1 + r) ** -years) / r;
  return perDecision * decisionsPerYear * af;
}
