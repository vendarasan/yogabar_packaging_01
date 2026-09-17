// Quick parser test for monocarton spec
const { convertTextToSpecSheet } = require('./utils/specPdfParser');

const testText = [
  'SPROUTLIFE FOODS PVT. LTD',
  'Document Name: Panchmeva 375g Monocarton – Ortho & Gynae',
  'Item Code: PM/PR/MNC/50670',
  'Revision: 0',
  'Date of Issue: 14/02/2026',
  '',
  'Product Name: Panchmeva',
  'Pack size: 375g',
  'Material Description: Monocarton with die Cut & Pasted',
  'Material Construct: Cyber XL (ITC) - 300 GSM Board',
  'Style: Die Punched with Auto lock bottom & Top tuck in',
  'Adhesive: High Performance Adhesives - Starch Base / PVA',
  '',
  'Monocarton Details',
  'S.No.  Parameter  Units  Standard  Test Standard  Defect Type  Factory Check',
  '1  Dimensions (LxWxH)  mm  86 x 86 x 175 plus 1mm  NA  CR  Yes',
  '2  Total GSM  g/m2  300 +/- 5%  TAPPI T410  CR  Yes',
  '3  Moisture Content  %  6-8%  TAPPI T412  CR  Yes',
  '4  Grain Direction  NA  Perpendicular to Crease  NA  MJ  NA',
  '5  Printing colours  NA  As per approved AW  NA  CR  Yes',
  '6  Text matter  NA  As per approved AW  NA  CR  Yes',
  '7  Surface Finish  NA  Drip off + Spot UV  NA  MJ  Yes',
].join('\n');

const spec = convertTextToSpecSheet(testText, 'monocarton_spec.pdf', null);
const params = spec.parameters;

console.log('Category: ' + spec.category);
console.log('Parameters found: ' + params.length);
console.log('');
params.forEach(function(p) {
  console.log('[' + p.sNo + '] ' + p.parameter.padEnd(26) + ' | ' + (p.units||'-').padEnd(8) + ' | ' + p.standard.padEnd(35) + ' | ' + p.testStandard.padEnd(15) + ' | ' + p.defectType);
});

// Checks
var checks = [
  ['Dimensions shows 86 x 86 x 175', params.some(function(p){ return /dimension/i.test(p.parameter) && /86/.test(p.standard); })],
  ['NOT 375g for dimensions', !params.some(function(p){ return /dimension/i.test(p.parameter) && p.standard === '375g'; })],
  ['Total GSM shows 300', params.some(function(p){ return /gsm|total/i.test(p.parameter) && /300/.test(p.standard); })],
  ['NOT 2 for GSM', !params.some(function(p){ return /gsm/i.test(p.parameter) && p.standard === '2'; })],
  ['Moisture shows 6-8%', params.some(function(p){ return /moisture/i.test(p.parameter) && /6/.test(p.standard); })],
  ['NOT 3 for moisture', !params.some(function(p){ return /moisture/i.test(p.parameter) && p.standard === '3'; })],
  ['Grain Direction found', params.some(function(p){ return /grain/i.test(p.parameter); })],
  ['Printing Colours found', params.some(function(p){ return /print.*col/i.test(p.parameter); })],
  ['Surface Finish found', params.some(function(p){ return /surface/i.test(p.parameter); })],
  ['TAPPI T410 on GSM row', params.some(function(p){ return /gsm|total/i.test(p.parameter) && /TAPPI.*T410/i.test(p.testStandard); })],
  ['TAPPI T412 on Moisture row', params.some(function(p){ return /moisture/i.test(p.parameter) && /TAPPI.*T412/i.test(p.testStandard); })],
  ['Moisture defect = CR', params.some(function(p){ return /moisture/i.test(p.parameter) && p.defectType === 'CR'; })],
  ['Grain Direction defect = MJ', params.some(function(p){ return /grain/i.test(p.parameter) && p.defectType === 'MJ'; })],
  ['Surface Finish defect = MJ', params.some(function(p){ return /surface/i.test(p.parameter) && p.defectType === 'MJ'; })],
];

console.log('');
var pass = 0, fail = 0;
checks.forEach(function(c) {
  var label = c[0], result = c[1];
  console.log((result ? 'PASS' : 'FAIL') + ': ' + label);
  if(result) pass++; else fail++;
});
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
