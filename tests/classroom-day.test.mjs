// Tests for the time-resolved classroom air model.
import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate, comparePresets, conditions, periodAt, DEFAULTS, WINDOWS, TIMETABLE} from '../classroom-day.mjs';

test('no infector means zero dose and zero risk', () => {
  const s = simulate({infector: false}).summary;
  assert.equal(s.dose, 0); assert.equal(s.expectedInfections, 0);
});

test('CO₂ approaches the analytic steady state under high ventilation', () => {
  const r = simulate({windowsLesson: 'wide'});
  const end = r.series.find(x => x.minute === 10 * 60 + 29);
  const Q = WINDOWS.wide.lps * 26 / 1000; // m³/s
  const G = (25 * DEFAULTS.co2Child + DEFAULTS.co2Adult) / 1000; // m³/s
  const ss = DEFAULTS.outdoorCO2 + 1e6 * G / Q;
  assert.ok(Math.abs(end.co2 - ss) / ss < 0.01, `${end.co2} vs ${ss}`);
});

test('exact stepping matches fine Euler integration', () => {
  // Single lesson block with the default ajar windows.
  const r = simulate({});
  const v = DEFAULTS, V = v.volume, Q = WINDOWS.ajar.lps * 3.6 * 26, G = (25 * v.co2Child + v.co2Adult) * 3.6;
  let c = v.outdoorCO2; const h = 1 / 6000; // 0.01 minute
  for (let m = 8 * 60 + 30; m < 10 * 60 + 30; m++) {
    const occ = m >= 8 * 60 + 55;
    for (let i = 0; i < 100; i++) c += h * ((occ ? G : 0) / V * 1e6 - Q / V * (c - v.outdoorCO2));
  }
  const end = r.series.find(x => x.minute === 10 * 60 + 29);
  assert.ok(Math.abs(end.co2 - c) < 0.5, `${end.co2} vs ${c}`);
});

test('filtration lowers infection risk and PM but not CO₂', () => {
  const off = simulate({hepaMode: 'off'}), on = simulate({hepaMode: 'allday'});
  assert.ok(on.summary.risk < off.summary.risk);
  assert.ok(on.summary.meanLessonPM < off.summary.meanLessonPM);
  assert.ok(Math.abs(on.summary.peakCO2 - off.summary.peakCO2) < 1e-9);
});

test('more outdoor air lowers CO₂ and risk but costs more heating', () => {
  const ajar = simulate({windowsLesson: 'ajar'}).summary, open = simulate({windowsLesson: 'open'}).summary;
  assert.ok(open.peakCO2 < ajar.peakCO2 && open.risk < ajar.risk && open.heatKwh > ajar.heatKwh);
});

test('operating times matter: HEPA running before lessons beats lessons-only', () => {
  const lessons = simulate({hepaMode: 'lessons'}).summary.dose;
  const allday = simulate({hepaMode: 'allday'}).summary.dose;
  assert.ok(allday < lessons);
});

test('breaks empty the room unless it is a rainy day', () => {
  const lunch = TIMETABLE.find(p => p.label === 'Lunch');
  assert.equal(conditions(DEFAULTS, lunch).pupils, 0);
  assert.equal(conditions({...DEFAULTS, rainyDay: true}, lunch).pupils, 25);
  assert.equal(periodAt(12 * 60 + 45).label, 'Lunch');
});

test('no heating energy when it is warm outside', () => {
  assert.equal(simulate({outdoorTemp: 22}).summary.heatKwh, 0);
});

test('presets run and summaries are finite', () => {
  for (const p of comparePresets()) for (const k of ['peakCO2', 'risk', 'energyCost']) assert.ok(Number.isFinite(p[k]), `${p.key}.${k}`);
});
