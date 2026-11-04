// Interface for the probabilistic sensitivity analysis panel.
import {runPSA, defaultSpecs, fromMoments, describe, populationValue, evsi, seLogRateRatio, PARAMETERS, ENVELOPES} from './psa.mjs';

const $ = id => document.getElementById(id);
const fmt = (n, d = 0) => Number.isFinite(n) ? n.toLocaleString('en', {minimumFractionDigits: d, maximumFractionDigits: d}) : '—';
const money = n => `${n < 0 ? '−' : ''}${fmt(Math.abs(n))} MU`;
const abbrev = x => Math.abs(x) >= 1e6 ? `${fmt(x / 1e6, 1)}m` : Math.abs(x) >= 1e3 ? `${fmt(x / 1e3, 1)}k` : fmt(x);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

let getState, last = null, overrides = {}, stale = false;

function specsFor(v) {
  const specs = defaultSpecs(v, $('psa-envelope').value);
  for (const [k, sd] of Object.entries(overrides)) {
    if (!(k in specs)) continue;
    const p = PARAMETERS[k];
    specs[k] = fromMoments(p.family, v[k] / p.scale, sd / p.scale);
    if (p.family === 'logratio') specs[k].sdInput = sd / p.scale;
  }
  return specs;
}

function renderSpecTable(v) {
  let specs;
  try { specs = specsFor(v); } catch { return; }
  $('psa-spec-table').innerHTML = Object.entries(specs).map(([k, s]) => {
    const p = PARAMETERS[k], sd = (p.family === 'logratio' ? (s.sdInput ?? (s.median ?? s.mean) * Math.sqrt(Math.expm1((s.sigma ?? 0) ** 2))) : (s.sd ?? 0)) * p.scale;
    return `<tr><th scope="row">${esc(p.label)}</th><td>${esc(p.family === 'logratio' ? 'lognormal (median-centred)' : p.family)}</td><td>${fmt(v[k], 4)}</td>
      <td><input type="number" min="0" step="any" data-psa-sd="${k}" value="${Number(sd.toPrecision(4))}" aria-label="Standard deviation for ${esc(p.label)}"></td>
      <td>${esc(describe(s, p.scale))}</td></tr>`;
  }).join('') || '<tr><td colspan="5">No uncertain parameters apply to this route.</td></tr>';
}

function histogram(a, bins = 40) {
  let lo = Infinity, hi = -Infinity;
  for (const x of a) { if (x < lo) lo = x; if (x > hi) hi = x; }
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const w = (hi - lo) / bins, counts = new Array(bins).fill(0);
  for (const x of a) counts[Math.min(bins - 1, Math.floor((x - lo) / w))]++;
  return {lo, hi, w, counts};
}

function drawHistogram(r) {
  const W = 660, H = 250, L = 52, R = 18, T = 20, B = 46;
  const h = histogram(r.sim.netPV), max = Math.max(...h.counts);
  const X = x => L + (x - h.lo) / (h.hi - h.lo) * (W - L - R), Y = c => T + (1 - c / max) * (H - T - B);
  const bars = h.counts.map((c, i) => {
    const x0 = h.lo + i * h.w, mid = x0 + h.w / 2;
    return `<rect class="${mid > 0 ? 'pos' : 'neg'}" x="${X(x0) + 0.5}" y="${Y(c)}" width="${Math.max(0.5, X(x0 + h.w) - X(x0) - 1)}" height="${H - B - Y(c)}"/>`;
  }).join('');
  const zero = h.lo < 0 && h.hi > 0 ? `<path class="zero-line" d="M${X(0)} ${T - 6}V${H - B}"/><text x="${X(0) + 5}" y="${T}">Break-even</text>` : '';
  const ticks = [0, .25, .5, .75, 1].map(f => { const x = h.lo + (h.hi - h.lo) * f; return `<text x="${X(x)}" y="${H - B + 17}" text-anchor="middle">${abbrev(x)}</text>`; }).join('');
  const mean = `<path class="mean-line" d="M${X(r.npv.mean)} ${T}V${H - B}"/>`;
  const desc = `Histogram of ${fmt(r.n)} simulated net present values. Mean ${money(r.npv.mean)}; 95% simulation interval ${money(r.npv.lo)} to ${money(r.npv.hi)}; ${fmt(100 * r.npv.pPositive, 1)}% of draws are above break-even.`;
  $('psa-hist').innerHTML = `<svg class="psa-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="psa-hist-t psa-hist-d"><title id="psa-hist-t">Distribution of net present value</title><desc id="psa-hist-d">${esc(desc)}</desc>${bars}${zero}${mean}<path class="axis" d="M${L} ${H - B}H${W - R}"/>${ticks}<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">Net present value (MU)</text></svg>`;
  $('psa-hist-desc').textContent = desc;
}

function drawCEAC(r, v) {
  if (!r.ceac) {
    $('psa-ceac').innerHTML = '<p class="hint">The absence route infers no QALYs, so an acceptability curve over the value of health is not defined. The probability above break-even is reported instead.</p>';
    return;
  }
  const W = 520, H = 300, L = 48, R = 34, T = 16, B = 46, pts = r.ceac, lmax = pts.at(-1).lambda;
  const X = l => L + l / lmax * (W - L - R), Y = p => T + (1 - p) * (H - T - B);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.lambda).toFixed(1)},${Y(p.p).toFixed(1)}`).join(' ');
  const grid = [0, .25, .5, .75, 1].map(p => `<path class="gridline" d="M${L} ${Y(p)}H${W - R}"/><text x="${L - 7}" y="${Y(p) + 4}" text-anchor="end">${p * 100}%</text>`).join('');
  const xt = [0, .25, .5, .75, 1].map(f => `<text x="${X(lmax * f)}" y="${H - B + 16}" text-anchor="middle">${abbrev(lmax * f)}</text>`).join('');
  const marker = v.valueHealth && v.qalyValue <= lmax ? `<path class="mean-line" d="M${X(v.qalyValue)} ${T}V${H - B}"/>` : '';
  const desc = `Probability that the intervention has positive incremental net benefit, as the monetary value of a QALY rises from 0 to ${fmt(lmax)} MU. At 0: ${fmt(100 * pts[0].p, 1)}%; at ${fmt(lmax)}: ${fmt(100 * pts.at(-1).p, 1)}%.`;
  $('psa-ceac').innerHTML = `<svg class="psa-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="psa-ceac-t psa-ceac-d"><title id="psa-ceac-t">Cost-benefit acceptability curve</title><desc id="psa-ceac-d">${esc(desc)}</desc>${grid}${marker}<path class="curve" d="${d}"/>${xt}<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">Value of a QALY (MU)</text></svg><p class="hint">${esc(desc)}${marker ? ' The vertical line marks the scenario value.' : ''}</p>`;
}

function drawEVPPI(r) {
  const rows = r.evppi.slice(0, 8), max = Math.max(r.evpi, 1e-9);
  $('psa-evppi').innerHTML = rows.length ? `<p class="hint">Per-cohort value of resolving each parameter alone (EVPPI), compared with all uncertainty (EVPI = ${money(r.evpi)}).</p>` +
    rows.map(p => `<div class="breakdown-row"><span>${esc(p.label)}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${100 * p.evppi / max}%"></div></div><strong>${fmt(p.evppi, 1)}</strong></div>`).join('')
    : '<p class="hint">No uncertain parameters.</p>';
}

function renderTrial() {
  const v = getState(), box = $('psa-trial');
  const on = !!last && v.route !== 'mechanistic' && last.sim.draws.rr && last.specs.rr?.type !== 'fixed';
  box.hidden = !on; if (!on) return;
  const n = Number($('psa-trial-n').value), de = Number($('psa-trial-de').value);
  const rate = v.route === 'absence' ? v.baselineDays : v.episodes;
  if (!(n >= 1) || !(de >= 1) || !(rate > 0)) { $('psa-trial-evsi').textContent = 'Check inputs'; return; }
  const se = seLogRateRatio(n, rate, 1, de), nb = last.sim.netPV, th = last.sim.draws.rr;
  const value = evsi(th, nb, se, {transform: Math.log}), full = evsi(th, nb, 0, {transform: Math.log});
  $('psa-trial-evsi').textContent = `${money(value)} · ${full > 0 ? fmt(100 * value / full) : '—'}%`;
  const k = Number($('psa-cohorts').value), yrs = Number($('psa-years').value);
  $('psa-trial-note').textContent = `Standard error of ln(ratio) ${fmt(se, 3)} (95% CI roughly ×/÷ ${fmt(Math.exp(1.96 * se), 2)}). Population EVSI for ${fmt(k)} cohorts a year over ${fmt(yrs)} years: ${money(populationValue(value, k, yrs, v.discount))}. Compare this with the trial's cost.`;
}

function renderPopulation() {
  if (!last) return;
  const v = getState(), per = last.evpi;
  const k = Number($('psa-cohorts').value), yrs = Number($('psa-years').value);
  const ok = Number.isFinite(k) && k >= 0 && Number.isInteger(yrs) && yrs >= 1 && yrs <= 50;
  $('psa-pop').textContent = ok ? money(populationValue(per, k, yrs, v.discount)) : 'Check inputs';
  renderTrial();
}

function run() {
  const v = getState();
  $('psa-status').textContent = 'Running…';
  const n = Number($('psa-n').value), seed = Math.trunc(Number($('psa-seed').value)) || 1;
  // Yield so that the status text paints before the synchronous simulation.
  setTimeout(() => {
    try {
      const t0 = performance.now();
      last = runPSA(v, {specs: specsFor(v), n, seed});
      stale = false;
      $('psa-results').hidden = false;
      $('psa-mean').textContent = money(last.npv.mean);
      $('psa-interval').textContent = `${money(last.npv.lo)} to ${money(last.npv.hi)}`;
      $('psa-prob').textContent = `${fmt(100 * last.npv.pPositive, 1)}%`;
      $('psa-evpi').textContent = money(last.evpi);
      $('psa-mcse').textContent = `Monte Carlo standard error of the mean: ${money(last.npv.mcse)}. ${last.clampedDraws ? `${fmt(last.clampedDraws)} draws were truncated to input limits.` : 'No draws were truncated.'}`;
      drawHistogram(last); drawCEAC(last, v); drawEVPPI(last); renderPopulation();
      $('psa-status').textContent = `${fmt(n)} iterations, seed ${seed}, ${fmt(performance.now() - t0)} ms.`;
    } catch (e) {
      $('psa-status').textContent = `Could not run: ${e.message}`;
    }
  }, 20);
}

function downloadDraws() {
  if (!last) return;
  const {sim} = last, keys = sim.keys;
  const head = ['iteration', ...keys, 'costPV', 'benefitPV', 'netPV', 'qalyPV'];
  const lines = [head.join(',')];
  for (let i = 0; i < sim.n; i++) lines.push([i + 1, ...keys.map(k => sim.draws[k][i]), sim.costPV[i], sim.benefitPV[i], sim.netPV[i], sim.qalyPV[i]].join(','));
  const url = URL.createObjectURL(new Blob([lines.join('\n')], {type: 'text/csv'}));
  const a = document.createElement('a'); a.href = url; a.download = `cascade-psa-seed${sim.seed}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initPSA(stateGetter) {
  getState = stateGetter;
  $('psa-run').addEventListener('click', run);
  $('psa-envelope').addEventListener('change', () => { overrides = {}; renderSpecTable(getState()); });
  $('psa-spec-table').addEventListener('input', e => {
    const k = e.target.dataset.psaSd; if (!k) return;
    const x = Number(e.target.value);
    if (Number.isFinite(x) && x >= 0) overrides[k] = x;
  });
  $('psa-spec-table').addEventListener('change', () => renderSpecTable(getState()));
  $('psa-reset-sd').addEventListener('click', () => { overrides = {}; renderSpecTable(getState()); });
  $('psa-download').addEventListener('click', downloadDraws);
  for (const id of ['psa-cohorts', 'psa-years']) $(id).addEventListener('input', renderPopulation);
  for (const id of ['psa-trial-n', 'psa-trial-de']) $(id).addEventListener('input', renderTrial);
  renderSpecTable(getState());
  return {
    update(valid) {
      if (valid) renderSpecTable(getState());
      if (last && !stale) { stale = true; $('psa-status').textContent = 'Inputs changed since the last run. Run again to update.'; }
      $('psa-run').disabled = !valid;
    }
  };
}

export {ENVELOPES};
