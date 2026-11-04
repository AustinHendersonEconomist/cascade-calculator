// Interface for "A Day in Room 12".
import {simulate, comparePresets, PRESETS, WINDOWS, HEPA_SPEEDS, DEFAULTS, DAY_START, DAY_END, TIMETABLE} from './classroom-day.mjs';
import {DEFAULTS as CALC_DEFAULTS, encodeScenario} from './model.mjs';

const $ = id => document.getElementById(id);
const fmt = (n, d = 0) => Number.isFinite(n) ? n.toLocaleString('en', {minimumFractionDigits: d, maximumFractionDigits: d}) : '—';
const clockText = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ----------------------------------------------------------------- settings
const settings = {...DEFAULTS};
const CONTROL_KEYS = ['windowsLesson', 'windowsBreak', 'hepaUnits', 'hepaSpeed', 'hepaMode', 'outdoorTemp', 'heatingCOP', 'outdoorPM'];
const NUMERIC = new Set(['hepaUnits', 'hepaSpeed', 'outdoorTemp', 'heatingCOP', 'outdoorPM']);
for (const id of ['windowsLesson', 'windowsBreak'])
  $(id).innerHTML = Object.entries(WINDOWS).map(([k, w]) => `<option value="${k}">${w.label} · ${w.lps} L/s/person</option>`).join('');
$('hepaSpeed').innerHTML = HEPA_SPEEDS.map((s, i) => `<option value="${i}">Speed ${i + 1} · ${s.cadr} m³/h · ${s.watts} W</option>`).join('');
$('presets').innerHTML = Object.entries(PRESETS).map(([k, p]) => `<button type="button" data-preset="${k}" aria-pressed="false">${p.name}</button>`).join('');

let sim, ghost, minute = 0, playing = false, lastTs = null, acc = 0;

function syncControls() {
  for (const k of CONTROL_KEYS) $(k).value = String(settings[k]);
  $('infector').checked = settings.infector; $('rainyDay').checked = settings.rainyDay;
  document.querySelectorAll('[data-preset]').forEach(b => {
    const p = PRESETS[b.dataset.preset];
    const on = p.windowsLesson === settings.windowsLesson && p.windowsBreak === settings.windowsBreak && p.hepaMode === settings.hepaMode;
    b.setAttribute('aria-pressed', String(on));
  });
}

function recompute() {
  sim = simulate(settings);
  ghost = simulate({...settings, ...PRESETS.shut});
  drawChart(); renderCompare(); renderHandoff(); syncControls(); update();
}

// ------------------------------------------------------------------- canvas
const cv = $('room'), ctx = cv.getContext('2d');
const S = 80, OX = 50, OY = 40, RW = 10, RH = 7.5; // px per metre, origin, room (m)
const P = (x, y) => [OX + x * S, OY + y * S];
const groups = [[2.1, 2.5], [5.0, 2.5], [2.1, 5.3], [5.0, 5.3], [7.9, 5.1]];
const seatOffsets = [[-0.95, -0.25], [-0.95, 0.35], [0.95, -0.25], [0.95, 0.35], [0, 0.85]];
const DOOR = [10.5, 6.6];
const pupils = groups.flatMap(([gx, gy]) => seatOffsets.map(([dx, dy]) => ({seat: [gx + dx, gy + dy], pos: [...DOOR], phase: Math.random() * 6.28})));
const INFECTOR = 7;
const teacher = {seat: [8.3, 1.5], pos: [...DOOR], phase: 1};
const hepaSpots = [[0.35, 3.9], [9.65, 2.6], [5.0, 7.15]];
const windowsTop = [[1.2, 3.2], [3.8, 5.8], [6.4, 8.4]], windowsBottom = [[1.2, 3.2], [6.4, 8.4]];
const angles = {closed: 0, ajar: 12, open: 32, wide: 60};
let particles = [];

function co2Colour(c) {
  const stops = [[600, [223, 238, 221]], [1000, [238, 238, 206]], [1500, [246, 223, 184]], [2500, [242, 195, 180]]];
  if (c <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (c <= stops[i][0]) {
    const [a, ca] = stops[i - 1], [b, cb] = stops[i], f = (c - a) / (b - a);
    return ca.map((x, j) => Math.round(x + f * (cb[j] - x)));
  }
  return stops.at(-1)[1];
}

function drawRoom(dtReal) {
  const row = sim.series[minute], inside = row.occupants > 0;
  ctx.clearRect(0, 0, cv.width, cv.height);
  // Outside strip
  ctx.fillStyle = '#eef2ea'; ctx.fillRect(0, 0, cv.width, cv.height);
  // Room haze by CO₂
  const [r, g, b] = co2Colour(row.co2);
  ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(OX, OY, RW * S, RH * S);
  // Desks
  ctx.fillStyle = '#ffffffd0'; ctx.strokeStyle = '#b8c7bd'; ctx.lineWidth = 1.5;
  for (const [gx, gy] of groups) { const [x, y] = P(gx - 0.6, gy - 0.4); ctx.beginPath(); ctx.roundRect(x, y, 1.2 * S, 0.9 * S, 8); ctx.fill(); ctx.stroke(); }
  { const [x, y] = P(7.6, 0.6); ctx.beginPath(); ctx.roundRect(x, y, 1.4 * S, 0.6 * S, 6); ctx.fill(); ctx.stroke(); }
  // Walls
  ctx.strokeStyle = '#18343a'; ctx.lineWidth = 5; ctx.strokeRect(OX, OY, RW * S, RH * S);
  // Door
  ctx.strokeStyle = '#eef2ea'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(...P(10, 6.1)); ctx.lineTo(...P(10, 7.0)); ctx.stroke();
  ctx.fillStyle = '#53696b'; ctx.font = '600 13px Inter, sans-serif'; ctx.fillText('Door', ...P(10.12, 6.05));
  // Windows: gap in wall plus sash rotated by opening angle
  const ang = angles[row.windows] * Math.PI / 180;
  for (const [wall, list] of [[0, windowsTop], [RH, windowsBottom]]) for (const [a, bx] of list) {
    ctx.strokeStyle = '#9fc6d6'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(...P(a, wall)); ctx.lineTo(...P(bx, wall)); ctx.stroke();
    const dir = wall === 0 ? -1 : 1, [sx, sy] = P(a, wall), len = (bx - a) * S;
    ctx.strokeStyle = '#18343a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + len * Math.cos(ang), sy + dir * len * Math.sin(ang)); ctx.stroke();
    if (ang > 0 && !reduceMotion) { // incoming air streaks
      ctx.strokeStyle = '#7fb3c855'; ctx.lineWidth = 2;
      const t = performance.now() / 600;
      for (let k = 0; k < 3; k++) {
        const fx = a + (bx - a) * (k + 1) / 4, off = ((t + k * 0.33) % 1) * 1.1 * Math.sin(ang) * 2;
        const [x0, y0] = P(fx, wall - dir * 0.05 + (-dir) * off); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 - dir * 18); ctx.stroke();
      }
    }
  }
  // Air cleaners
  const spin = performance.now() / 120;
  hepaSpots.slice(0, settings.hepaUnits).forEach(([hx, hy]) => {
    const [x, y] = P(hx, hy), on = row.hepaOn;
    if (on) { ctx.fillStyle = '#d7e9b680'; ctx.beginPath(); ctx.arc(x, y, 46, 0, 6.29); ctx.fill(); }
    ctx.fillStyle = on ? '#276a60' : '#8a9a95'; ctx.beginPath(); ctx.roundRect(x - 22, y - 22, 44, 44, 9); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    for (let k = 0; k < 3; k++) { const a2 = (on && !reduceMotion ? spin : 0) + k * 2.094; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 13 * Math.cos(a2), y + 13 * Math.sin(a2)); ctx.stroke(); }
  });
  // People
  const moveTo = (p, target, speed) => {
    const dx = target[0] - p.pos[0], dy = target[1] - p.pos[1], d = Math.hypot(dx, dy), stepLen = speed * dtReal;
    if (d <= stepLen || reduceMotion) p.pos = [...target]; else p.pos = [p.pos[0] + dx / d * stepLen, p.pos[1] + dy / d * stepLen];
  };
  const people = [...pupils.map((p, i) => [p, i]), [teacher, -1]];
  for (const [p, i] of people) {
    moveTo(p, inside ? p.seat : DOOR, 6 + (i % 5));
    if (Math.hypot(p.pos[0] - DOOR[0], p.pos[1] - DOOR[1]) < 0.05 && !inside) continue;
    const wob = reduceMotion ? 0 : 0.03 * Math.sin(performance.now() / 500 + p.phase);
    const [x, y] = P(p.pos[0] + wob, p.pos[1]);
    ctx.fillStyle = i === -1 ? '#18343a' : '#4f7d72'; ctx.beginPath(); ctx.arc(x, y, i === -1 ? 11 : 9, 0, 6.29); ctx.fill();
    if (i === INFECTOR && settings.infector) { ctx.strokeStyle = '#b4552c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 14, 0, 6.29); ctx.stroke(); }
  }
  // Airborne infectious particles (visual density ∝ quanta concentration)
  const target = Math.min(450, Math.round(row.quanta * 14000));
  const src = pupils[INFECTOR].pos, present = settings.infector && inside;
  while (particles.length < target) {
    const fromSrc = present && Math.random() < 0.5;
    particles.push(fromSrc ? {x: src[0], y: src[1], vx: 0, vy: 0} : {x: 0.2 + Math.random() * 9.6, y: 0.2 + Math.random() * 7.1, vx: 0, vy: 0});
  }
  if (particles.length > target) particles.splice(0, particles.length - target);
  ctx.fillStyle = '#b4552caa';
  for (const q of particles) {
    if (!reduceMotion) {
      q.vx = 0.92 * q.vx + (Math.random() - 0.5) * 0.9 * dtReal * 10; q.vy = 0.92 * q.vy + (Math.random() - 0.5) * 0.9 * dtReal * 10;
      q.x = Math.min(9.9, Math.max(0.1, q.x + q.vx * dtReal)); q.y = Math.min(7.4, Math.max(0.1, q.y + q.vy * dtReal));
    }
    const [x, y] = P(q.x, q.y); ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
  }
  // Labels
  ctx.fillStyle = '#53696b'; ctx.font = '600 13px Inter, sans-serif';
  ctx.fillText(inside ? (row.kind === 'break' ? 'Rainy-day break: everyone inside' : row.period) : (row.kind === 'break' ? `${row.period}: pupils outside` : row.period), OX, OY + RH * S + 44);
  ctx.textAlign = 'right'; ctx.fillText(`Windows: ${WINDOWS[row.windows].label.toLowerCase()} · Air cleaners: ${row.hepaOn ? 'on' : 'off'}`, OX + RW * S, OY + RH * S + 44); ctx.textAlign = 'left';
}

// -------------------------------------------------------------------- gauges
function meter(id, frac, warn, bad) {
  const el = $(id); el.querySelector('i').style.width = `${Math.min(100, 100 * frac)}%`;
  el.classList.toggle('warn', frac >= warn && frac < bad); el.classList.toggle('bad', frac >= bad);
}
let lastAnnounced = -1;
function update(dtReal = 0) {
  const row = sim.series[minute], m = DAY_START + minute;
  $('clock').textContent = clockText(m); $('period').textContent = row.period;
  $('g-co2').textContent = fmt(row.co2);
  $('g-co2-note').textContent = row.co2 > 2000 ? 'ppm · well above guidance' : row.co2 > 800 ? 'ppm · above 800' : 'ppm';
  meter('m-co2', row.co2 / 3000, 800 / 3000, 1500 / 3000);
  $('g-risk').textContent = `${fmt(100 * row.risk, 2)}%`;
  meter('m-risk', row.risk / 0.03, 0.4, 0.75);
  $('g-pm').textContent = fmt(row.pm, 1);
  const frac = (minute + 1) / sim.series.length;
  $('g-cost').textContent = `NZ$${fmt(sim.summary.energyCost * frac, 2)}`;
  $('scrub').value = String(minute);
  $('playhead')?.setAttribute('transform', `translate(${X(m)},0)`);
  drawRoom(dtReal);
  if (Math.floor(minute / 30) !== lastAnnounced && playing) {
    lastAnnounced = Math.floor(minute / 30);
    $('live').textContent = `${clockText(m)}, ${row.period}. CO₂ ${fmt(row.co2)} ppm. Infection risk so far ${fmt(100 * row.risk, 2)} percent.`;
  }
}

// --------------------------------------------------------------------- chart
const CW = 860, CH = 300, CL = 54, CR = 54, CT = 14, CB = 34, split = 0.62;
const X = m => CL + (m - DAY_START) / (DAY_END - DAY_START) * (CW - CL - CR);
function drawChart() {
  const top = CT, mid = CT + (CH - CT - CB) * split, gap = 26, bottom = CH - CB;
  const maxC = Math.max(1200, ...sim.series.map(s => s.co2), ...ghost.series.map(s => s.co2)) * 1.05;
  const maxR = Math.max(0.005, ghost.summary.risk, sim.summary.risk) * 1.1;
  const Yc = c => mid - (c - 400) / (maxC - 400) * (mid - top);
  const Yr = r => bottom - r / maxR * (bottom - mid - gap);
  const line = (series, f) => series.map((s, i) => `${i ? 'L' : 'M'}${X(s.minute).toFixed(1)},${f(s).toFixed(1)}`).join('');
  const breaks = TIMETABLE.filter(p => p.kind !== 'lesson').map(p => `<rect x="${X(p.start)}" y="${top}" width="${X(p.end) - X(p.start)}" height="${bottom - top}" fill="#eef2ea"/><text x="${(X(p.start) + X(p.end)) / 2}" y="${bottom + 26}" text-anchor="middle">${p.label === 'Morning tea' ? 'Tea' : p.label.replace('Before school', 'Arrive').replace('After school', 'Home')}</text>`).join('');
  const hours = [9, 10, 11, 12, 13, 14, 15].map(h => `<text x="${X(h * 60)}" y="${bottom + 13}" text-anchor="middle">${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}</text>`).join('');
  const ref = [800, 1000].filter(c => c < maxC).map(c => `<path d="M${CL} ${Yc(c)}H${CW - CR}" stroke="#aa582a" stroke-dasharray="4 4" stroke-width="1"/><text x="${CW - CR + 4}" y="${Yc(c) + 4}">${c}</text>`).join('');
  const cTicks = [400, Math.round(maxC / 1000) * 500 || 1000, Math.floor(maxC / 500) * 500].filter((x, i, a) => a.indexOf(x) === i && x < maxC).map(c => `<text x="${CL - 6}" y="${Yc(c) + 4}" text-anchor="end">${fmt(c)}</text>`).join('');
  const rTicks = [0, maxR / 2, maxR].map(r => `<text x="${CL - 6}" y="${Yr(r) + 4}" text-anchor="end">${fmt(100 * r, 1)}%</text>`).join('');
  const desc = `CO₂ peaks at ${fmt(sim.summary.peakCO2)} ppm with your settings (${fmt(ghost.summary.peakCO2)} ppm shut tight). Risk to one pupil by home time: ${fmt(100 * sim.summary.risk, 2)}% (${fmt(100 * ghost.summary.risk, 2)}% shut tight).`;
  $('chart').innerHTML = `<svg viewBox="0 0 ${CW} ${CH}" role="img" aria-labelledby="ct cd"><title id="ct">CO₂ and cumulative infection risk across the day</title><desc id="cd">${desc}</desc>
    ${breaks}${ref}
    <text x="${CL}" y="${top - 2}" font-weight="600">CO₂ (ppm)</text>
    <path d="${line(ghost.series, s => Yc(s.co2))}" fill="none" stroke="#b9c5bf" stroke-width="2"/>
    <path d="${line(sim.series, s => Yc(s.co2))}" fill="none" stroke="#276a60" stroke-width="2.6"/>${cTicks}
    <text x="${CL}" y="${mid + gap - 6}" font-weight="600">Risk to one pupil, cumulative</text>
    <path d="${line(ghost.series, s => Yr(s.risk))}" fill="none" stroke="#b9c5bf" stroke-width="2"/>
    <path d="${line(sim.series, s => Yr(s.risk))}" fill="none" stroke="#b4552c" stroke-width="2.6"/>${rTicks}
    <path d="M${CL} ${bottom}H${CW - CR}" stroke="#d9e1db"/>${hours}
    <g id="playhead"><path d="M0 ${top}V${bottom}" stroke="#18343a" stroke-width="1.5"/></g></svg>`;
}

// --------------------------------------------------------------- comparison
function renderCompare() {
  const rows = comparePresets(settings);
  const current = Object.entries(PRESETS).find(([, p]) => p.windowsLesson === settings.windowsLesson && p.windowsBreak === settings.windowsBreak && p.hepaMode === settings.hepaMode)?.[0];
  $('compare').innerHTML = rows.map(r => `<tr class="${r.key === current ? 'current' : ''}"><th scope="row">${r.name}${r.key === current ? ' · <em>current</em>' : ''}</th><td>${fmt(r.peakCO2)} ppm</td><td>${fmt(r.minutesAbove1000)}</td><td>${fmt(100 * r.risk, 2)}%</td><td>${settings.infector ? fmt(r.expectedInfections, 2) : '—'}</td><td>${fmt(r.meanLessonPM, 1)} µg/m³</td><td>NZ$${fmt(r.energyCost, 2)}</td></tr>`).join('');
}

function renderHandoff() {
  const s = sim.summary;
  const baselineFlow = Math.max(0.01, Math.round(s.meanOutdoorLps * 100) / 100), addedFlow = Math.round(s.meanCadr / 10) * 10;
  const v = {...CALC_DEFAULTS, pupils: 25, occupants: 26, baselineFlow, addedFlow};
  $('handoff').href = 'index.html' + encodeScenario(v);
  $('handoff-text').textContent = `Today's lessons averaged ${fmt(baselineFlow, 1)} L/s/person of outdoor air and ${fmt(addedFlow)} m³/h of filtered air. Take these to the calculator's airflow route, which assumes constant steady-state delivery, and compare costs and valued outcomes over several years.`;
}

// ------------------------------------------------------------------ playback
function frame(ts) {
  const dt = lastTs === null ? 0 : Math.min(0.1, (ts - lastTs) / 1000); lastTs = ts;
  if (playing) {
    acc += dt * 6 * Number($('speed').value); // sim minutes per real second
    while (acc >= 1) { acc -= 1; minute++; }
    if (minute >= sim.series.length - 1) { minute = sim.series.length - 1; setPlaying(false); }
  }
  update(dt);
  requestAnimationFrame(frame);
}
function setPlaying(on) {
  playing = on; $('play').setAttribute('aria-pressed', String(on));
  $('play').textContent = on ? '❚❚ Pause' : minute >= sim.series.length - 1 ? '↺ Replay the day' : '▶ Play the day';
}
$('play').addEventListener('click', () => { if (!playing && minute >= sim.series.length - 1) { minute = 0; particles = []; } setPlaying(!playing); });
$('scrub').addEventListener('input', e => { minute = Number(e.target.value); if (!playing) setPlaying(false); });
for (const k of CONTROL_KEYS) $(k).addEventListener('change', e => { settings[k] = NUMERIC.has(k) ? Number(e.target.value) : e.target.value; recompute(); });
for (const k of ['infector', 'rainyDay']) $(k).addEventListener('change', e => { settings[k] = e.target.checked; recompute(); });
$('presets').addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (!b) return; Object.assign(settings, PRESETS[b.dataset.preset]); delete settings.name; recompute(); });

recompute();
requestAnimationFrame(frame);
