import {DEFAULTS} from './model.mjs';

// Manuscript demonstration inputs (13 September 2026), retained in draft v3.
// Healthcare is an expected cost per episode: 100% × 20 MU, not an
// empirical assertion that every episode requires medical attendance.
const common = {...DEFAULTS, capital:1000, life:5, operating:200,
  addedFlow:3.6*26*5.4, medicalProbability:100, medicalCost:20,
  caregiverCost:0, valueHealth:true, qalyValue:30000, valuePerSD:25000};
export const EXAMPLES = {
  S1:{name:'S1 · Child health only', inputs:{...common}},
  S2:{name:'S2 · Health and caregiver time', inputs:{...common,caregiverCost:150}},
  S5:{name:'S5 · Null infection effect', inputs:{...common,caregiverCost:150,route:'infection',rr:1}}
};
