// CASCADE review model: constant cohort, year-end annual service costs,
// mutually exclusive endpoint routes, and one terminal achievement valuation.
export const VERSION = '0.7.0-review';
export const DEFAULTS = Object.freeze({
  route:'mechanistic', riskModel:'lowDose', pupils:25, occupants:26, years:5,
  discount:3, baselineFlow:4, addedFlow:500, dose:0.1, episodes:4,
  addressable:7.5, baselineDays:8, rr:1, capital:900, life:5, operating:250,
  medicalProbability:20, medicalCost:70, caregiverCost:220, daysPerEpisode:2,
  qalyLoss:0.002, qalyValue:45000, valueHealth:false, absenceValue:0,
  includeLearning:false, terminalGain:0, valuePerSD:200000
});
export const LIMITS = Object.freeze({
  pupils:[1,10000,1], occupants:[1,12000,1], years:[1,30,1], discount:[0,20,0.1],
  baselineFlow:[0.01,100,0.01], addedFlow:[0,100000,10], dose:[0,20,0.01],
  episodes:[0,50,0.1], addressable:[0,100,0.5], baselineDays:[0,365,0.1], rr:[0,5,0.01],
  capital:[0,10000000,50], life:[1,100,1], operating:[0,1000000,10],
  medicalProbability:[0,100,1], medicalCost:[0,1000000,10], caregiverCost:[0,1000000,10],
  daysPerEpisode:[0,365,0.1], qalyLoss:[0,1,0.001], qalyValue:[0,10000000,1000],
  absenceValue:[0,1000000,10], terminalGain:[-1,1,0.001], valuePerSD:[0,10000000,10000]
});
export const PRESETS = Object.freeze({
  hepa:{capital:900,life:5,operating:250,addedFlow:500},
  ventilation:{capital:30000,life:20,operating:500,addedFlow:650},
  custom:{capital:0,life:5,operating:0,addedFlow:0}
});
export function validate(v) {
  const errors=[];
  for(const [key,[min,max]] of Object.entries(LIMITS)) {
    if(typeof v[key]!=='number'||!Number.isFinite(v[key])||v[key]<min||v[key]>max)
      errors.push({key,message:`Enter a number from ${min} to ${max}.`});
  }
  for(const key of ['pupils','occupants','years','life'])
    if(Number.isFinite(v[key])&&!Number.isInteger(v[key])) errors.push({key,message:'Use a whole number.'});
  if(v.occupants<v.pupils) errors.push({key:'occupants',message:'Include all pupils and adults; occupants cannot be fewer than pupils.'});
  if(!['mechanistic','infection','absence'].includes(v.route)) errors.push({key:'route',message:'Choose an outcome route.'});
  if(!['lowDose','exact'].includes(v.riskModel)) errors.push({key:'riskModel',message:'Choose a risk model.'});
  for(const key of ['valueHealth','includeLearning']) if(typeof v[key]!=='boolean') errors.push({key,message:'Use a true/false choice.'});
  return errors;
}
export function capitalRecovery(r,life) {
  return r===0 ? 1/life : r/-Math.expm1(-life*Math.log1p(r));
}
export function annuityFactor(r,years) {
  return r===0 ? years : -Math.expm1(-years*Math.log1p(r))/r;
}
export function reduction(q0,added,dose,kind) {
  const ratio=q0/(q0+added);
  // Zero-dose limit: no infections occur in this modelled exposure.
  if(kind==='exact') return dose===0 ? 0 : 1-(-Math.expm1(-dose*ratio)) / (-Math.expm1(-dose));
  return 1-ratio;
}
export function threshold(residual,slope) {
  if(residual< -1e-9) return {status:'already',value:0};
  if(Math.abs(residual)<=1e-9) return {status:'atZero',value:0};
  if(slope<=0) return {status:'unavailable',value:null};
  const value=residual/slope;
  return {status:value>1?'unattainable':'required',value};
}
export function compute(v) {
  const errors=validate(v);
  if(errors.length) throw new RangeError(errors.map(e=>`${e.key}: ${e.message}`).join(' '));
  const rate=v.discount/100, af=annuityFactor(rate,v.years), terminalDiscount=(1+rate)**(-v.years);
  const q0=3.6*v.occupants*v.baselineFlow;
  const theta=v.route==='mechanistic'?reduction(q0,v.addedFlow,v.dose,v.riskModel):1-v.rr;
  const baseline=v.pupils*(v.route==='absence'?v.baselineDays:v.episodes);
  const zeroExposure=v.route==='mechanistic'&&v.riskModel==='exact'&&v.dose===0;
  const addressed=zeroExposure?0:baseline*(v.route==='mechanistic'?v.addressable/100:1);
  const annualChange=addressed*theta;
  const annualDays=v.route==='absence'?annualChange:annualChange*v.daysPerEpisode;
  const annualQaly=v.route==='absence'?null:annualChange*v.qalyLoss;
  const annualMedical=v.route==='absence'?0:annualChange*v.medicalProbability/100*v.medicalCost;
  const annualCaregiver=v.route==='absence'?0:annualChange*v.caregiverCost;
  const annualHealth=v.route!=='absence'&&v.valueHealth?annualQaly*v.qalyValue:0;
  const annualAbsence=v.route==='absence'?annualChange*v.absenceValue:0;
  const unitValue=v.route==='absence'?v.absenceValue:v.medicalProbability/100*v.medicalCost+v.caregiverCost+(v.valueHealth?v.qalyLoss*v.qalyValue:0);
  const annualCost=v.capital*capitalRecovery(rate,v.life)+v.operating;
  const costPV=annualCost*af;
  const components={medical:annualMedical*af,caregiver:annualCaregiver*af,health:annualHealth*af,absence:annualAbsence*af,
    learning:v.includeLearning?v.pupils*v.terminalGain*v.valuePerSD*terminalDiscount:0};
  const otherPV=components.medical+components.caregiver+components.health+components.absence;
  const benefitPV=otherPV+components.learning, netPV=benefitPV-costPV;
  const residual=costPV-otherPV;
  const learningThreshold=v.valuePerSD>0 ? Math.max(0,residual)/(v.pupils*v.valuePerSD*terminalDiscount):null;
  const effectThreshold=threshold(costPV-components.learning,addressed*unitValue*af);
  return {q0,theta,annualChange,annualDays,annualQaly,annualCost,costPV,benefitPV,otherPV,netPV,components,
    bcr:costPV>0?benefitPV/costPV:null,learningThreshold,learningStatus:residual<=0?'already':learningThreshold===null?'unavailable':'required',
    effectThreshold,af,terminalDiscount,totalChange:annualChange*v.years,totalDays:annualDays*v.years,
    totalQaly:annualQaly===null?null:annualQaly*v.years,
    annualRows:Array.from({length:v.years},(_,i)=>({year:i+1,
      physicalChange:annualChange,costPV:annualCost/(1+rate)**(i+1),
      benefitPV:(annualMedical+annualCaregiver+annualHealth+annualAbsence)/(1+rate)**(i+1)+(i===v.years-1?components.learning:0)}))};
}
export function encodeScenario(v) { return '#v=0.7&'+new URLSearchParams(Object.entries(v).map(([k,x])=>[k,String(x)])).toString(); }
export function decodeScenario(hash) {
  if(!hash||['#','#workspace','#evidence','#method','#comparison','#results'].includes(hash)) return {inputs:{...DEFAULTS},notice:''};
  const params=new URLSearchParams(hash.replace(/^#/,''));
  if(params.get('v')!=='0.7') return {inputs:{...DEFAULTS},notice:'This link uses an older or unknown model. The review example is shown; legacy assumptions have not been silently converted.'};
  const inputs={...DEFAULTS};
  for(const key of Object.keys(DEFAULTS)) if(params.has(key)) {
    const x=params.get(key);
    if(typeof DEFAULTS[key]==='boolean') inputs[key]=x==='true'?true:x==='false'?false:null;
    else if(typeof DEFAULTS[key]==='number') inputs[key]=x.trim()===''?NaN:Number(x);
    else inputs[key]=x;
  }
  if(validate(inputs).length) return {inputs:{...DEFAULTS},notice:'This link contains invalid inputs. The review example is shown; check your saved scenario.'};
  return {inputs,notice:'Loaded a versioned scenario. Its numbers are user assumptions, not verified evidence.'};
}
