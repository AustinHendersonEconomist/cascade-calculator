// "A Day in Room 12": time-resolved, well-mixed classroom air model.
//
// Simulates one school day minute by minute for a single classroom:
//   - CO₂ (ppm) from occupants, diluted by outdoor air;
//   - infectious quanta (quanta/m³) from one infectious pupil, removed by
//     outdoor air, filtration, deposition and inactivation;
//   - PM2.5 (µg/m³) of outdoor origin entering with outdoor air;
//   - heating energy lost with outdoor air and fan electricity.
// Every state equation is linear with piecewise-constant coefficients, so
// each one-minute step is integrated exactly:
//   x(t + Δt) = x* + (x − x*)·e^(−kΔt),  x* = source / k.
// The exposure dose for each susceptible pupil is the exact integral of
// inhalation × quanta concentration, and the infection probability is the
// Wells–Riley form P = 1 − e^(−dose).
//
// The model is illustrative. Quanta emission, removal rates, window flows and
// device performance are stated assumptions, not measurements of any room.

export const MODEL_VERSION = '1.0.0';

/** School-day timetable (minutes after midnight), New Zealand primary pattern. */
export const TIMETABLE = Object.freeze([
  {start: 8 * 60 + 30, end: 8 * 60 + 55, kind: 'arrival', label: 'Before school'},
  {start: 8 * 60 + 55, end: 10 * 60 + 30, kind: 'lesson', label: 'Block 1'},
  {start: 10 * 60 + 30, end: 10 * 60 + 50, kind: 'break', label: 'Morning tea'},
  {start: 10 * 60 + 50, end: 12 * 60 + 30, kind: 'lesson', label: 'Block 2'},
  {start: 12 * 60 + 30, end: 13 * 60 + 30, kind: 'break', label: 'Lunch'},
  {start: 13 * 60 + 30, end: 15 * 60, kind: 'lesson', label: 'Block 3'},
  {start: 15 * 60, end: 15 * 60 + 30, kind: 'after', label: 'After school'}
]);
export const DAY_START = TIMETABLE[0].start, DAY_END = TIMETABLE.at(-1).end;

/** Window settings: outdoor air in L/s per lesson-time occupant (26 people). */
export const WINDOWS = Object.freeze({
  closed: {label: 'Closed', lps: 0.8},        // infiltration only (≈ 0.33 ACH)
  ajar: {label: 'Ajar', lps: 3},              // the NZ case's assumed winter rate
  open: {label: 'Open', lps: 8},
  wide: {label: 'Wide open, both sides', lps: 15}
});

/** Benchmark portable HEPA unit: seller-listed CADR (m³/h) and power (W) by speed. */
export const HEPA_SPEEDS = Object.freeze([
  {cadr: 125, watts: 3}, {cadr: 180, watts: 5}, {cadr: 240, watts: 9}, {cadr: 320, watts: 14}, {cadr: 508, watts: 60}
]);

export const DEFAULTS = Object.freeze({
  pupils: 25, adults: 1, volume: 225,
  windowsLesson: 'ajar', windowsBreak: 'ajar',
  hepaUnits: 2, hepaSpeed: 2, hepaMode: 'lessons', // off | lessons | occupied | allday
  rainyDay: false,            // pupils stay inside at breaks
  infector: true,             // one infectious pupil attends
  quanta: 5,                  // quanta/h emitted by the infectious pupil (illustrative)
  inhalation: 0.32,           // m³/h per pupil (sedentary 10-year-old, approximate)
  deposition: 0.3,            // 1/h, aerosol deposition (illustrative)
  inactivation: 0.3,          // 1/h, biological decay (illustrative)
  outdoorCO2: 420,            // ppm
  co2Child: 0.0037,           // L/s per pupil (approximate, Persily & de Jonge 2017)
  co2Adult: 0.0052,           // L/s per adult (approximate)
  outdoorPM: 6,               // µg/m³
  pmPenetration: 0.8, pmDeposition: 0.2,
  outdoorTemp: 7, indoorTemp: 20,
  heatingCOP: 1,              // 1 = resistive heating; ~3 = heat pump
  tariff: 0.30                // NZ$/kWh (assumed, as in the NZ case)
});

export const PRESETS = Object.freeze({
  shut: {name: 'Shut tight', windowsLesson: 'closed', windowsBreak: 'closed', hepaMode: 'off'},
  usual: {name: 'Typical winter', windowsLesson: 'ajar', windowsBreak: 'ajar', hepaMode: 'off'},
  purge: {name: 'Purge at breaks', windowsLesson: 'ajar', windowsBreak: 'wide', hepaMode: 'off'},
  hepa: {name: 'HEPA in lessons', windowsLesson: 'ajar', windowsBreak: 'ajar', hepaMode: 'lessons'},
  both: {name: 'Purge + HEPA all day', windowsLesson: 'ajar', windowsBreak: 'wide', hepaMode: 'allday'},
  open: {name: 'Windows open', windowsLesson: 'open', windowsBreak: 'wide', hepaMode: 'off'}
});

export function periodAt(minute) {
  return TIMETABLE.find(p => minute >= p.start && minute < p.end) ?? TIMETABLE.at(-1);
}

/** Occupancy and controls in force during a period. */
export function conditions(v, period) {
  const inside = period.kind === 'lesson' || (period.kind === 'break' && v.rainyDay);
  const pupils = inside ? v.pupils : 0, adults = inside ? v.adults : 0;
  const occupied = pupils + adults > 0;
  const windowKey = period.kind === 'lesson' ? v.windowsLesson : v.windowsBreak;
  // Window flow is specified per person at full occupancy; it is a property
  // of the opening, so it does not fall when the room empties.
  const outdoorM3h = WINDOWS[windowKey].lps * 3.6 * (v.pupils + v.adults);
  const hepaOn = v.hepaMode === 'allday' ||
    (v.hepaMode === 'occupied' && occupied) ||
    (v.hepaMode === 'lessons' && period.kind === 'lesson');
  const speed = HEPA_SPEEDS[v.hepaSpeed];
  const cadr = hepaOn ? v.hepaUnits * speed.cadr : 0;
  const watts = hepaOn ? v.hepaUnits * speed.watts : 0;
  return {pupils, adults, occupied, windowKey, outdoorM3h, cadr, watts,
    infectorPresent: v.infector && pupils > 0};
}

const step = (x, source, k, dt) => {
  if (k <= 0) return {x: x + source * dt, integral: x * dt + source * dt * dt / 2};
  const xs = source / k, e = Math.exp(-k * dt);
  return {x: xs + (x - xs) * e, integral: xs * dt + (x - xs) * (1 - e) / k};
};

/**
 * Simulate the day. Returns per-minute series and day summaries.
 * Time unit is hours inside the equations; the step is one minute.
 */
export function simulate(input = {}) {
  const v = {...DEFAULTS, ...input};
  const dt = 1 / 60, V = v.volume, series = [];
  let co2 = v.outdoorCO2, quanta = 0, pm = v.outdoorPM * v.pmPenetration, dose = 0;
  let heatKwh = 0, fanKwh = 0, lessonMinutes = 0, co2LessonSum = 0, minutesAbove1000 = 0, peakCO2 = co2;
  for (let m = DAY_START; m < DAY_END; m++) {
    const period = periodAt(m), c = conditions(v, period);
    const ach = c.outdoorM3h / V, filt = c.cadr / V;
    // CO₂: generation in m³/h → ppm/h.
    const gen = (c.pupils * v.co2Child + c.adults * v.co2Adult) * 3.6; // m³/h
    const co2Step = step(co2 - v.outdoorCO2, gen / V * 1e6, ach, dt);
    co2 = v.outdoorCO2 + co2Step.x;
    // Quanta: one infector emitting v.quanta q/h.
    const kq = ach + filt + v.deposition + v.inactivation;
    const q = step(quanta, c.infectorPresent ? v.quanta / V : 0, kq, dt);
    quanta = q.x;
    if (c.pupils > 0) dose += v.inhalation * q.integral; // inhaled by a susceptible pupil
    // PM2.5 of outdoor origin.
    const kp = ach + filt + v.pmDeposition;
    pm = step(pm, ach * v.pmPenetration * v.outdoorPM, kp, dt).x;
    // Energy: sensible heat carried by outdoor air while heating is needed.
    const dT = Math.max(0, v.indoorTemp - v.outdoorTemp);
    heatKwh += 1.2 * 1.005 / 3600 * c.outdoorM3h * dT * dt / v.heatingCOP; // kWh
    fanKwh += c.watts / 1000 * dt;
    if (period.kind === 'lesson') {
      lessonMinutes++; co2LessonSum += co2;
      if (co2 > 1000) minutesAbove1000++;
    }
    peakCO2 = Math.max(peakCO2, co2);
    series.push({minute: m, period: period.label, kind: period.kind, co2, quanta, pm, dose,
      risk: -Math.expm1(-dose), occupants: c.pupils + c.adults, windows: c.windowKey, hepaOn: c.cadr > 0});
  }
  const risk = -Math.expm1(-dose), susceptibles = v.infector ? v.pupils - 1 : v.pupils;
  const energyCost = (heatKwh + fanKwh) * v.tariff;
  // Equivalent clean-air delivery in lessons, for the CASCADE calculator:
  // mean outdoor air (L/s/person) and mean HEPA CADR (m³/h).
  const lessons = TIMETABLE.filter(p => p.kind === 'lesson');
  const lessonCond = lessons.map(p => [p.end - p.start, conditions(v, p)]);
  const wsum = lessonCond.reduce((s, [w]) => s + w, 0);
  const meanOutdoor = lessonCond.reduce((s, [w, c]) => s + w * c.outdoorM3h, 0) / wsum;
  const meanCadr = lessonCond.reduce((s, [w, c]) => s + w * c.cadr, 0) / wsum;
  return {
    inputs: v, series,
    summary: {
      peakCO2, meanLessonCO2: co2LessonSum / lessonMinutes, minutesAbove1000,
      dose, risk, expectedInfections: v.infector ? susceptibles * risk : 0,
      heatKwh, fanKwh, energyCost,
      meanOutdoorLps: meanOutdoor / 3.6 / (v.pupils + v.adults), meanCadr,
      meanLessonPM: series.filter(s => s.kind === 'lesson').reduce((a, s) => a + s.pm, 0) / lessonMinutes
    }
  };
}

/** Run every preset with otherwise identical inputs. */
export function comparePresets(input = {}) {
  return Object.entries(PRESETS).map(([key, p]) => ({key, name: p.name, ...simulate({...input, ...p}).summary}));
}
