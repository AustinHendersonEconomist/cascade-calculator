export const BASE = Object.freeze({pupils:25, occupants:26, area:75, height:3, flow:3, units:2, cadr:240, watts:9, hours:6, days:190, unitPrice:489.99, setup:150, hepa:85.99, carbon:74.99, filterMonths:12, tariff:0.30, staff:60, discount:2, years:5, dayValue:100});
export function calculate(v) {
  const errors=[];
  for (const key of Object.keys(BASE)) if(!Number.isFinite(v[key]) || v[key]<0) errors.push(key);
  for(const key of ['pupils','occupants','area','height','filterMonths','years']) if(v[key]<=0) errors.push(key);
  if(v.occupants<v.pupils) errors.push('occupants');
  if(errors.length) throw new RangeError('Check '+[...new Set(errors)].join(', '));
  const r=v.discount/100, af=r===0?v.years:(1-(1+r)**-v.years)/r;
  const volume=v.area*v.height, outdoor=v.occupants*v.flow*3.6, added=v.units*v.cadr;
  const powerKwh=v.units*v.watts/1000*v.hours*v.days;
  const capital=v.units*v.unitPrice+v.setup;
  const filters=v.units*(v.hepa+v.carbon)*12/v.filterMonths;
  const operating=filters+powerKwh*v.tariff+v.staff;
  const pv=capital+operating*af, annual=pv/af;
  return {volume,outdoor,added,outdoorACH:outdoor/volume,addedACH:added/volume,totalACH:(outdoor+added)/volume,powerKwh,capital,filters,energy:powerKwh*v.tariff,operating,af,pv,annual,perPupil:annual/v.pupils,breakEvenDays:v.dayValue>0?annual/v.dayValue:null};
}
