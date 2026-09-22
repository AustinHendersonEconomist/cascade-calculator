import {EXAMPLES} from './examples.mjs';
import {VERSION,DEFAULTS,LIMITS,PRESETS,validate,compute,encodeScenario,decodeScenario} from './model.mjs';
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('en',{minimumFractionDigits:d,maximumFractionDigits:d}):'Not defined';
const money=n=>`${n<0?'−':''}${fmt(Math.abs(n))} MU`;
const signed=n=>`${n>0?'+':n<0?'−':''}${fmt(Math.abs(n))}`;
const parsed=decodeScenario(location.hash);
let state=parsed.inputs, lastResult=null, saved=[], activePreset=location.hash?null:'hepa', announceTimer;
const fields={
 pupils:['Pupils in the cohort','pupils','The same cohort is followed across the chosen horizon.'],
 occupants:['Total room occupants','people','Pupils plus adults; used for whole-room flow conversion.'],
 years:['Analysis horizon','years','Annual burdens stay constant. No new cohort is added each year.'],
 discount:['Discount rate','% / year','Hypothetical rate for year-end costs and values. Zero is allowed.'],
 baselineFlow:['Baseline clean-air flow','L/s/person','Measure effective clean air. CO₂ estimates outdoor air, not filtration.'],
 addedFlow:['Added delivered clean air','m³/hour','Whole-room effective flow at the actual operating setting. Constant operation assumed.'],
 dose:['Baseline exposure dose','quanta inhaled','Hypothetical dose for one well-mixed, steady-state exposure. Not inferred from annual illness.'],
 episodes:['Baseline infection burden','episodes/pupil/year','Illustrative 4; replace with age-, setting- and endpoint-matched data.'],
 addressable:['Addressable infection fraction','% of baseline episodes','Unmeasured scenario assumption. Includes the setting and route actually addressed.'],
 baselineDays:['Baseline absence burden','days/pupil/year','Use the same absence definition as your study effect.'],
 rr:['Matched endpoint ratio','ratio','Null = 1. For recurrent episodes use a compatible episode-rate ratio; for absence use a ratio of expected days. A risk of any infection is not an episode-count ratio.'],
 capital:['Up-front capital','MU','Example only. Enter the full incremental installed cost.'],
 life:['Asset service life','years','Used to calculate an equivalent annual service cost.'],
 operating:['Annual operation & maintenance','MU/year','Include electricity, servicing and replacements not already annualised.'],
 medicalProbability:['Medically attended episodes','%','Probability per infection episode. A 100% weight can alternatively encode an expected resource cost per episode; it is not an attendance estimate.'],
 medicalCost:['Healthcare resources','MU/attended episode','Illustrative 70; resource cost, not reimbursement plus the same cost.'],
 caregiverCost:['Caregiver time/resources','MU/infection episode','Illustrative 220. Exclude costs counted in another outcome.'],
 daysPerEpisode:['School absence per infection','days/episode','Illustrative 2; reported as an assumed physical outcome, not earnings.'],
 qalyLoss:['Child health loss','QALYs/episode','Illustrative 0.002; requires compatible health-utility evidence.'],
 qalyValue:['Monetary value of health','MU/QALY','Illustrative 45,000. Applied only when explicitly enabled.'],
 absenceValue:['Non-overlapping absence value','MU/absent day','Default zero. If changed, enter justified incremental resource value; exclude earnings already in terminal learning.'],
 terminalGain:['Terminal achievement difference','SD/pupil','User-specified total at the end of the horizon. Negative effects are allowed.'],
 valuePerSD:['Terminal earnings valuation','MU/SD/pupil','Illustrative 200,000; endpoint-date value. Used for the break-even threshold even when learning is excluded.']
};
function field(key){const [label,unit,help]=fields[key], [min,max,step]=LIMITS[key];return `<div class="field" id="field-${key}"><div class="field-label-row"><label for="${key}">${label}</label><span class="unit">${unit}</span></div><div class="input-wrap"><input id="${key}" name="${key}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${state[key]}" aria-describedby="help-${key} error-${key}"></div><p class="field-help" id="help-${key}">${help}</p><div class="field-error" id="error-${key}" hidden></div></div>`;}
function buildFields(){
 const groups={'cohort-fields':['pupils','occupants','years'],'air-fields':['baselineFlow','addedFlow'],'dose-fields':['dose'],
 'burden-fields':['episodes','addressable','baselineDays'],'empirical-fields':['rr'],'cost-fields':['capital','life','operating','discount'],
 'illness-fields':['medicalProbability','medicalCost','caregiverCost','daysPerEpisode'],'health-fields':['qalyLoss','qalyValue'],
 'absence-values':['absenceValue'],'learning-fields':['terminalGain','valuePerSD']};
 for(const [id,keys] of Object.entries(groups)) $(id).innerHTML=keys.map(field).join('');
}
function notice(text){$('notice').textContent=text;$('notice').hidden=!text;}
function syncInputs(){
 for(const key of Object.keys(DEFAULTS)){const el=$(key);if(!el)continue;if(el.type==='checkbox')el.checked=state[key];else el.value=state[key];}
 document.querySelectorAll('[data-preset]').forEach(b=>{const on=b.dataset.preset===activePreset;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
}
function syncRoute(){
 const mech=state.route==='mechanistic', absence=state.route==='absence';
 $('mechanistic-fields').hidden=!mech;$('empirical-fields').hidden=mech;
 $('field-addressable').hidden=!mech;$('field-episodes').hidden=absence;$('field-baselineDays').hidden=!absence;
 $('dose-fields').hidden=!mech||state.riskModel!=='exact';$('infection-values').hidden=absence;$('absence-values').hidden=!absence;
 $('qalyValue').disabled=!state.valueHealth;$('terminalGain').disabled=!state.includeLearning;
 $('route-note').textContent=mech?'Assumption-based route. Airflow estimates a hypothetical reduction in addressed exposure risk; the addressable fraction links this to annual burden. It is not a clinical efficacy estimate.':absence?'Absent days stay absent days. Apply a matched total absence effect directly; no infection, QALY or automatic learning conversion.':'Apply an endpoint-compatible infection episode-rate ratio directly to baseline episodes. No extra airflow, setting or adherence multiplier is applied.';
 const prior=$('sensitivity').value;
 $('sensitivity').innerHTML=`<option value="${mech?'addressable':'rr'}">${mech?'Addressable infection fraction':'Matched endpoint ratio'}</option><option value="capital">Capital cost</option><option value="terminalGain">Terminal learning gain</option>`;
 if([...$('sensitivity').options].some(o=>o.value===prior)) $('sensitivity').value=prior;
}
function renderErrors(){
 const errors=validate(state);
 for(const key of Object.keys(LIMITS)){$(key).removeAttribute('aria-invalid');$(`error-${key}`).hidden=true;}
 for(const error of errors){if($(error.key))$(error.key).setAttribute('aria-invalid','true');const msg=$(`error-${error.key}`);if(msg){msg.textContent=error.message;msg.hidden=false;}}
 $('validation').hidden=!errors.length;
 document.querySelector('.results-column').classList.toggle('invalid-results',!!errors.length);
 if(errors.length){$('mobile-net').textContent='Check inputs';$('validation').innerHTML=`<strong>Check your inputs to calculate a result.</strong><ul>${errors.map(e=>`<li>${escapeHTML(fields[e.key]?.[0]||e.key)}: ${escapeHTML(e.message)}</li>`).join('')}</ul>`;lastResult=null;
  $('sensitivity-chart').textContent='Correct the highlighted inputs to explore sensitivity.';$('sensitivity-description').textContent='';$('sensitivity-note').textContent='';
 }
 return !!errors.length;
}
function render(){
 $("example-status").textContent="";
 syncRoute();if(renderErrors())return;
 const r=compute(state);lastResult=r;
 $('included-scope').textContent='Included: '+(state.route==='absence'?'absence resources':('healthcare resources'+(state.caregiverCost!==0?' · caregiver time':'')+(state.valueHealth?' · monetary health value':'')))+(state.includeLearning?' · terminal learning.':' · no learning value.');
 $('horizon-label').textContent=`· ${state.years}-year horizon`;
 $('mobile-horizon').textContent=`${state.years}-year net value`;$('mobile-net').textContent=money(r.netPV);
 $('net-result').innerHTML=`${signed(r.netPV)}<small>MU</small>`;
 const beneficial=r.netPV>1e-7, zero=Math.abs(r.netPV)<=1e-7;
 $('verdict').textContent=zero?'At break-even under these inputs':beneficial?'Above break-even under these inputs':'Below break-even under these inputs';
 $('verdict').classList.toggle('negative',!beneficial&&!zero);
 $('interpretation').textContent=`${beneficial?'Included outcome values exceed':zero?'Included outcome values equal':'Included outcome values fall short of'} the equivalent service costs for this ${state.pupils}-pupil cohort. This is a conditional scenario, not an established return or a school budget saving.`;
 $('benefit-result').textContent=money(r.benefitPV);$('cost-result').textContent=money(r.costPV);
 $('bcr-result').textContent=r.bcr===null?'Benefit–cost ratio: not defined at zero cost':`Benefit–cost ratio: ${fmt(r.bcr,2)}×`;
 $('effect-threshold-label').textContent=state.route==='absence'?'Absence reduction needed':state.route==='mechanistic'?'Addressed-risk reduction needed':'Infection reduction needed';
 const t=r.effectThreshold;
 $('effect-threshold').textContent=t.status==='already'||t.status==='atZero'?'0%':t.status==='unavailable'?'Not attainable':t.value>1?'>100%':`${fmt(100*t.value,1)}%`;
 $('effect-explanation').textContent=t.status==='already'?'Other included values already cover costs.':t.status==='atZero'?'Exactly break-even at zero reduction.':t.status==='unavailable'?'No positive valued burden to offset the remaining cost.':t.value>1?'Even a 100% reduction would not cover the remaining cost.':`Current assumption: ${fmt(100*r.theta,1)}% ${state.route==='mechanistic'?'in addressed exposure risk':'in the matched endpoint'}.`;
 $('learning-threshold').textContent=r.learningStatus==='already'?'0 SD':r.learningThreshold===null?'Not defined':`${fmt(r.learningThreshold,4)} SD`;
 $('learning-explanation').textContent=r.learningStatus==='already'?'Non-learning outcome values already cover costs.':r.learningThreshold===null?'A positive per-SD valuation is required to calculate a threshold.':`Per pupil at year ${state.years}, valued at ${money(state.valuePerSD)}/SD. ${r.learningThreshold>1?'Exceeds the explored 1-SD bound.':'No such durable gain is established here.'}`;
 $('physical-result').textContent=fmt(state.route==='absence'?r.annualChange:r.totalChange,1);$('physical-label').textContent=state.route==='absence'?'absent days averted / year':'infection episodes averted';
 $('days-result').textContent=fmt(r.totalDays,1);$('qaly-result').textContent=r.totalQaly===null?'—':fmt(r.totalQaly,4);
 $('physical-note').textContent=`Across ${state.years} years, holding annual burden constant. ${state.route==='absence'?'Annual and cumulative days describe the same endpoint; do not add them. No infections or QALYs are inferred.':'Days and QALYs use the per-episode assumptions, not observed treatment effects.'} Negative changes mean more burden. ${state.route==='mechanistic'&&state.riskModel==='exact'&&state.dose===0?'Zero modelled exposure dose implies zero addressed infections.':''}`;
 breakdown(r);
 $('annual-table').innerHTML=r.annualRows.map(row=>`<tr><th scope="row">${row.year}</th><td>${fmt(row.physicalChange,2)}</td><td>${fmt(row.benefitPV,2)}</td><td>${fmt(row.costPV,2)}</td></tr>`).join('');
 drawSensitivity();renderComparison();
 clearTimeout(announceTimer);announceTimer=setTimeout(()=>{$('live-summary').textContent=`Updated scenario. Net present value ${money(r.netPV)} over ${state.years} years. ${$('verdict').textContent}.`;},650);
}
function breakdown(r){
 const list=state.route==='absence'?[['Absence resources',r.components.absence,'']]:[['Healthcare',r.components.medical,''],['Caregiver time',r.components.caregiver,''],['Health valuation',r.components.health,'']];
 list.push(['Terminal learning',r.components.learning,'learning'],['Service costs',-r.costPV,'cost']);
 const max=Math.max(1,...list.map(x=>Math.abs(x[1])));
 $('breakdown').innerHTML=`<p class="hint">Present-value composition · MU</p>`+list.map(([label,value,cls])=>`<div class="breakdown-row"><span>${label}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill ${cls} ${value<0&&cls!=='cost'?'negative':''}" style="width:${100*Math.abs(value)/max}%"></div></div><strong>${value===0?'0':signed(value)}</strong></div>`).join('');
}
function sensitivitySpec(){
 const key=$('sensitivity').value;
 if(key==='addressable')return {key,lo:0,hi:100,label:'Addressable fraction (%)',suffix:'%',note:'At 0%, none of the baseline infections are assumed to arise through the addressed exposure pathway.'};
 if(key==='rr')return {key,lo:0,hi:Math.max(2,state.rr),label:'Matched endpoint ratio',suffix:'',note:'RR = 1 is the null. Values above 1 represent more infections or absent days, not an invalid scenario.'};
 if(key==='capital')return {key,lo:0,hi:Math.min(LIMITS.capital[1],Math.max(5000,state.capital*2)),label:'Capital cost (MU)',suffix:'',note:'Capital is converted to an annual service cost, then discounted across the chosen horizon.'};
 return {key:'terminalGain',lo:Math.min(-.02,state.terminalGain),hi:Math.max(.05,state.terminalGain),label:'Terminal achievement difference (SD/pupil)',suffix:'',note:'This sensitivity curve explicitly enables terminal learning. It values the gain once at the endpoint, even when learning is excluded from your headline scenario.'};
}
function drawSensitivity(){
 if(!lastResult)return;
 const s=sensitivitySpec(), W=660,H=260,left=77,right=22,top=24,bottom=50;
 const samples=Array.from({length:61},(_,i)=>{const x=s.lo+(s.hi-s.lo)*i/60;const v={...state,[s.key]:x};if(s.key==='terminalGain')v.includeLearning=true;return [x,compute(v).netPV];});
 const ys=samples.map(x=>x[1]);let min=Math.min(0,...ys),max=Math.max(0,...ys);const pad=Math.max(1,(max-min)*.12);min-=pad;max+=pad;
 const X=x=>left+(x-s.lo)/(s.hi-s.lo)*(W-left-right),Y=y=>top+(max-y)/(max-min)*(H-top-bottom);
 const ticks=Array.from({length:5},(_,i)=>min+(max-min)*i/4);
 const abbrev=x=>Math.abs(x)>=1000000?`${fmt(x/1000000,1)}m`:Math.abs(x)>=1000?`${fmt(x/1000,1)}k`:fmt(x);
 const d=samples.map(([x,y],i)=>`${i?'L':'M'}${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(' ');
 const currentX=s.key==='terminalGain'&&!state.includeLearning?0:state[s.key];
 const currentState={...state,[s.key]:currentX};if(s.key==='terminalGain')currentState.includeLearning=true;
 const currentY=compute(currentState).netPV;
 const desc=`Net present value as ${s.label} varies from ${s.lo} to ${s.hi}. At the left endpoint: ${money(samples[0][1])}; at the right endpoint: ${money(samples.at(-1)[1])}. Other assumptions held fixed.`;
 $('sensitivity-chart').innerHTML=`<svg class="sensitivity-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="curve-title curve-desc"><title id="curve-title">Sensitivity of net present value</title><desc id="curve-desc">${escapeHTML(desc)}</desc>${ticks.map(y=>`<path class="gridline" d="M${left} ${Y(y)}H${W-right}"/><text x="${left-12}" y="${Y(y)+4}" text-anchor="end">${abbrev(y)}</text>`).join('')}<text x="${left}" y="12">Net present value (MU)</text><path class="zero-line" d="M${left} ${Y(0)}H${W-right}"/><path class="curve" d="${d}"/><circle class="current" cx="${X(currentX)}" cy="${Y(currentY)}" r="6"/>${[0,.25,.5,.75,1].map(f=>{const x=s.lo+(s.hi-s.lo)*f;return `<text x="${X(x)}" y="${H-28}" text-anchor="middle">${s.key==='terminalGain'?fmt(x,3):s.key==='rr'?fmt(x,2):abbrev(x)}${s.suffix}</text>`;}).join('')}<text x="${(left+W-right)/2}" y="${H-5}" text-anchor="middle">${s.label}</text></svg>`;
 $('sensitivity-description').textContent=`${desc} The dot marks ${s.key==='terminalGain'&&!state.includeLearning?'zero included learning':'your current input'}.`;
 $('sensitivity-note').textContent=s.note;
}
const commonKeys=['route','pupils','occupants','years','discount','baselineFlow','riskModel','dose','episodes','addressable','baselineDays','medicalProbability','medicalCost','caregiverCost','daysPerEpisode','qalyLoss','valueHealth','qalyValue','absenceValue','valuePerSD'];
const contextKey=v=>JSON.stringify(commonKeys.map(k=>v[k]));
function renderComparison(){
 $('comparison-table').innerHTML=`<tr><th scope="row">No added intervention</th><td>0 MU</td><td>0 MU</td><td class="net">0 MU</td><td class="status">Incremental reference</td></tr>`+saved.map((s,i)=>{const same=contextKey(s.inputs)===contextKey(state);return `<tr><th scope="row">${escapeHTML(s.name)}<button type="button" data-remove="${i}" aria-label="Remove ${escapeHTML(s.name)}">×</button></th><td>${money(s.result.costPV)}</td><td>${money(s.result.benefitPV)}</td><td class="net">${money(s.result.netPV)}</td><td class="status ${same?'':'mismatch'}">${same?'Same decision context':'Different context — do not rank directly'}</td></tr>`;}).join('')+(!saved.length?'<tr><td colspan="5" class="empty">Your saved alternatives will appear here. Set up a scenario above, then select “Save for comparison”.</td></tr>':'');
}
function exportData(){return {modelVersion:VERSION,scientificStatus:'Illustrative scenario; not empirically calibrated or human-approved',currency:'MU',costConvention:'Equivalent annual service costs, year-end discounting',cohortConvention:'Same stable cohort; constant annual burden; terminal learning once',name:$('scenario-name').value||'Untitled scenario',inputs:{...state},outputs:lastResult,savedComparisons:saved,excluded:['automatic CO2-to-learning','attendance earnings','onward transmission','fiscal transfers']};}
function download(name,type,text){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('action-status').textContent='Download requested.';}
function csvCell(value){return '"'+String(value??'').replace(/"/g,'""')+'"';}
async function copyLink(){
 const url=location.origin+location.pathname+encodeScenario(state);
 try{await navigator.clipboard.writeText(url);$('action-status').textContent='Versioned scenario link copied. Inputs are included in the link.';}
 catch{notice('Automatic copying was unavailable. Select and copy the scenario link below.');let box=$('manual-link');if(!box){box=document.createElement('textarea');box.id='manual-link';box.readOnly=true;box.setAttribute('aria-label','Scenario link to copy');box.style.width='100%';$('notice').append(box);}box.value=url;box.focus();box.select();$('action-status').textContent='Copy the displayed link manually.';}
}
buildFields();syncInputs();notice(parsed.notice);render();
document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{
 const example=EXAMPLES[button.dataset.example];
 state={...example.inputs};activePreset=null;$('scenario-name').value=example.name;
 syncInputs();notice('');render();
 $('example-status').textContent=example.name+' loaded. All inputs were replaced. Net present value: '+money(lastResult.netPV)+'.';
 $('action-status').textContent='Manuscript example loaded. Save it before loading another if you want to compare.';
}));
$('scenario-form').addEventListener('submit',e=>e.preventDefault());
$('scenario-form').addEventListener('input',e=>{
 const key=e.target.id;if(!(key in DEFAULTS))return;
 state[key]=e.target.type==='checkbox'?e.target.checked:typeof DEFAULTS[key]==='number'?e.target.value===''?NaN:Number(e.target.value):e.target.value;
 if(['capital','life','operating','addedFlow'].includes(key)){activePreset=null;document.querySelectorAll('[data-preset]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});}
 render();
});
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{
 activePreset=b.dataset.preset;state={...state,...PRESETS[activePreset]};$('scenario-name').value=activePreset==='hepa'?'Portable filtration example':activePreset==='ventilation'?'Ventilation example':'Custom scenario';syncInputs();render();
 $('action-status').textContent='Example costs and airflow loaded. Outcome assumptions were retained.';
}));
$('reset').addEventListener('click',()=>{state={...DEFAULTS};activePreset='hepa';$('scenario-name').value='Portable filtration example';syncInputs();notice('');history.replaceState(null,'',location.pathname+location.search);render();$('action-status').textContent='Inputs reset. Saved comparisons are retained.';});
$('sensitivity').addEventListener('change',drawSensitivity);
$('save-scenario').addEventListener('click',()=>{if(!lastResult)return;if(saved.length>=6){$('action-status').textContent='Six scenarios are already saved. Remove one before adding another.';return;}saved.push({name:$('scenario-name').value.trim()||`Scenario ${saved.length+1}`,inputs:{...state},result:structuredClone(lastResult)});renderComparison();$('action-status').textContent='Scenario saved until this page is reloaded. Export JSON to keep the comparison.';});
$('comparison-table').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){saved.splice(Number(b.dataset.remove),1);renderComparison();}});
$('clear-comparison').addEventListener('click',()=>{saved=[];renderComparison();$('action-status').textContent='Saved comparisons cleared.';});
$('copy-link').addEventListener('click',()=>{if(lastResult)copyLink();});
$('export-json').addEventListener('click',()=>{if(lastResult)download('cascade-review-scenario.json','application/json',JSON.stringify(exportData(),null,2));});
$('export-csv').addEventListener('click',()=>{if(!lastResult)return;const r=lastResult;const rows=[['section','key','value'],['metadata','version',VERSION],['metadata','currency','MU'],['metadata','status','Illustrative scenario; not calibrated'],...Object.entries(state).map(([k,v])=>['input',k,v]),...Object.entries(r).filter(([,v])=>typeof v==='number'||v===null).map(([k,v])=>['output',k,v]),...Object.entries(r.components).map(([k,v])=>['component_PV',k,v])];download('cascade-review-scenario.csv','text/csv',rows.map(row=>row.map(csvCell).join(',')).join('\r\n'));});
$('print').addEventListener('click',()=>window.print());
window.addEventListener('hashchange',()=>{if(['','#','#workspace','#evidence','#method','#comparison','#results'].includes(location.hash))return;const p=decodeScenario(location.hash);state=p.inputs;activePreset=null;syncInputs();notice(p.notice);render();});
