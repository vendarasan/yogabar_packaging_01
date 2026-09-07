// ── STAGE PIPELINE ──────────────────────────────────────────────
const STAGE_ORDER = ['Brief','Sample','Trial','KLD','Artwork','VPDF','Printing','Dispatch','Connectivity','Launch'];
const STAGE_COLORS = {Brief:'#7c4dff',Sample:'#00b0ff',Trial:'#00bfa5',KLD:'#ffd740',Artwork:'#ff6d00',VPDF:'#e040fb',Printing:'#76ff03',Dispatch:'#ff4081',Connectivity:'#40c4ff',Launch:'#00e676'};
const STAGE_PCT = {Brief:10,Sample:20,Trial:30,KLD:40,Artwork:50,VPDF:60,Printing:70,Dispatch:80,Connectivity:90,Launch:100};
const PRINT_LEAD = {'Digital Print':10,'Flexo Print':20,'Gravure Print':35,'Not Applicable':0};
const STAGE_LEAD = {Sample:5,Trial:7,KLD:3,Artwork:5,VPDF:2,Dispatch:4,Connectivity:4};

const MAT_TYPES = [
  'PET Bottle','HDPE Bottle','Glass Bottle','Glass Jar','Laminated Tube','Aluminium Can',
  'Aerosol Can','Flexible Pouch','Stand-up Pouch','Sachet / Stick Pack','Carton Box',
  'Corrugated Shipper','Paper Label','PP Label','Shrink Sleeve','In-Mould Label',
  'Thermoform Tray','Blister Pack','Cap / Closure','Pump Dispenser','Liner / Foil Seal',
  'Insert / Leaflet','Other'
];
const PRINT_TYPES = ['Digital Print','Flexo Print','Gravure Print','Not Applicable'];
const FUNCTIONS = ['Brand Mgmt','Packaging','Supply Chain','Factory','Procurement','Quality / Reg','Network Planner'];

const RACI_DATA = {
  Brief:        ['A','R','C','I','C','C','I'],
  Sample:       ['C','R','I','I','C','C','I'],
  Trial:        ['I','C','R','R','I','C','I'],
  KLD:          ['C','R','I','I','C','C','I'],
  Artwork:      ['A','R','I','I','I','C','I'],
  VPDF:         ['A','R','I','I','I','C','I'],
  Printing:     ['I','C','I','I','R','A','I'],
  Dispatch:     ['I','I','R','C','A','I','C'],
  Connectivity: ['I','C','A','C','C','I','R'],
  Launch:       ['A','C','R','R','C','C','R']
};

const STD_RISKS = [
  {id:'R-001',stage:'Brief',desc:'Brief incomplete — missing regulatory requirements',impact:'High',prob:'Medium',level:'High',mitigation:'Mandatory checklist sign-off before brief issue',owner:'Packaging',status:'Open'},
  {id:'R-002',stage:'Sample',desc:'T1 samples out of tolerance — dimensional deviation',impact:'Medium',prob:'High',level:'High',mitigation:'Pre-sample DFM review with supplier tooling team',owner:'Packaging',status:'Open'},
  {id:'R-003',stage:'Trial',desc:'Machine incompatibility — pack not running on line',impact:'High',prob:'Low',level:'Medium',mitigation:'Pre-trial machine audit with supplier 2 weeks prior',owner:'Factory',status:'Open'},
  {id:'R-004',stage:'Artwork',desc:'Multiple artwork rounds causing delay (>3 rounds)',impact:'Medium',prob:'High',level:'High',mitigation:'Pre-artwork KLD briefing; strict 3-round limit enforced',owner:'Brand Mgmt',status:'Open'},
  {id:'R-005',stage:'Artwork',desc:'Regulatory text not approved in time',impact:'High',prob:'Medium',level:'High',mitigation:'Regulatory review initiated at KLD stage',owner:'Regulatory',status:'Mitigated'},
  {id:'R-006',stage:'VPDF',desc:'Colour delta > ΔE 2 — substrate mismatch',impact:'Medium',prob:'Medium',level:'Medium',mitigation:'Substrate confirmed at brief; press proof on actual substrate',owner:'Packaging',status:'Open'},
  {id:'R-007',stage:'Printing',desc:'Gravure supplier capacity crunch — Q4 booking conflict',impact:'High',prob:'High',level:'High',mitigation:'Book slots 8 weeks ahead; PO raised on VPDF sign-off',owner:'Procurement',status:'Open'},
  {id:'R-008',stage:'Dispatch',desc:'Transit damage — poor palletisation',impact:'Medium',prob:'Low',level:'Low',mitigation:'Supplier SOP: stretch wrap + top cap mandatory',owner:'Supply Chain',status:'Open'},
  {id:'R-009',stage:'Connectivity',desc:'SAP BOM not updated before production date',impact:'High',prob:'Medium',level:'High',mitigation:'Master data form raised 6 weeks before launch',owner:'Ntwk Planner',status:'Open'},
  {id:'R-010',stage:'Launch',desc:'Commercial stock not in DC on launch date',impact:'High',prob:'Medium',level:'High',mitigation:'Safety stock of 4 weeks built before launch week',owner:'Supply Chain',status:'Open'}
];

const STAGE_DEFS = [
  {id:'Brief',num:'01',color:'#7c4dff',full:'Packaging Development Brief',lead:'Day 0 — Start',owner:'Brand Management + Packaging',desc:'Formal kick-off. All functional requirements frozen and signed off.',inputs:['Marketing brief','Consumer insight','Benchmark samples','Regulatory requirements','Cost target'],outputs:['Signed Packaging Brief','Project ID raised','Supplier RFQ list'],checks:['Brief signed by Brand, Packaging & SC','Cost target aligned','Regulatory sign-off checklist','Pack format confirmed']},
  {id:'Sample',num:'02',color:'#00b0ff',full:'Prototype / T1 Sample',lead:'+5 days from Brief',owner:'Packaging + Supplier',desc:'First physical prototype by supplier against approved brief specifications.',inputs:['Signed brief','Material spec','Tooling instructions','Benchmark reference'],outputs:['T1 prototype samples','Sample evaluation report','Deviation log'],checks:['Dimensions within ±0.5mm','Material grade confirmed','Colour Pantone matching','Drop test 1.2m 6 faces','Stackability OK']},
  {id:'Trial',num:'03',color:'#00bfa5',full:'Factory Line Trial',lead:'+7 days from Sample',owner:'Factory + Packaging + SC',desc:'Pack run on actual production line to validate machine compatibility.',inputs:['Approved T1 sample','Machine speed target','SOP draft'],outputs:['Trial report','Machine speed sign-off','SOP v1.0'],checks:['Line speed ≥ OEE target','Seal integrity passed','Label placement ±1mm','Fill weight ±2g','Defect rate <0.5%']},
  {id:'KLD',num:'04',color:'#ffd740',full:'Key Line Data — Spec Lock',lead:'+3 days from Trial',owner:'Packaging + Quality + Procurement',desc:'All technical specs FROZEN. KLD sheet issued to artwork studio.',inputs:['Trial-approved dimensions','Barcode zone','Legal text','Nutrition panel'],outputs:['Signed KLD sheet','Final dieline','GS1 barcode registration'],checks:['All dimensions locked','GS1 barcode confirmed','Legal text approved','Dieline approved','Colour locked (CMYK + Pantone)']},
  {id:'Artwork',num:'05',color:'#ff6d00',full:'Artwork Development & Approval',lead:'+5 days from KLD',owner:'Brand + Packaging + Regulatory',desc:'Creative artwork developed, proofed and approved through structured rounds.',inputs:['Approved KLD','Brand guidelines','Legal claims','Nutritional data'],outputs:['Print-ready artwork (PDF/AI)','Signed approval form','Colour swatch sign-off'],checks:['Round 1 — layout & hierarchy','Round 2 — legal & regulatory','Round 3 — colour & typography','Brand sign-off','Regulatory & QA sign-off']},
  {id:'VPDF',num:'06',color:'#e040fb',full:'Virtual PDF / Digital Proof Sign-off',lead:'+2 days from Artwork',owner:'Packaging + Brand + Quality',desc:'Digital soft-proof reviewed against physical colour target before print job released.',inputs:['Print-ready artwork','Colour target swatch','Substrate sample'],outputs:['Signed VPDF approval form','Press release instruction'],checks:['Colour delta ΔE < 2 vs Pantone','Barcode grade ≥ C (ISO 15415)','All text legible','VPDF signed by Brand + Packaging + QA']},
  {id:'Printing',num:'07',color:'#76ff03',full:'Print Production / Bulk Manufacture',lead:'Digital: 10d · Flexo: 20d · Gravure: 35d',owner:'Supplier + Procurement + Quality',desc:'Commercial bulk print run. Lead time depends on print process.',inputs:['Signed VPDF','PO from Procurement','Supplier schedule'],outputs:['Bulk packaging material','COA','QC inspection report'],checks:['First-off press check signed','Colour check vs swatch','Barcode scan 100% units','Quantity verified vs PO','Incoming QC passed']},
  {id:'Dispatch',num:'08',color:'#ff4081',full:'Dispatch to Factory / DC',lead:'+4 days from Printing',owner:'Supply Chain + Logistics + Procurement',desc:'Packaging material dispatched from supplier to factory or DC.',inputs:['Delivery schedule','Truck booking','Factory goods-in slot'],outputs:['GRN (Goods Receipt Note)','Stock in WMS','QA release in SAP'],checks:['Quantity matches PO','No transit damage','Conditions met','Scanned into WMS','QA release updated']},
  {id:'Connectivity',num:'09',color:'#40c4ff',full:'Connectivity / System Setup',lead:'+4 days from Dispatch',owner:'Supply Chain + IT + Factory + Network Planner',desc:'All system masters live — SAP codes, BOM, DRP parameters, replenishment rules.',inputs:['GRN confirmation','Final approved material','Master data form'],outputs:['SAP material code active','BOM updated','DRP live','Distribution confirmed'],checks:['Material code in SAP','BOM updated for all SKUs','Min/max set in DRP','Distribution network confirmed','Forecast updated in S&OP']},
  {id:'Launch',num:'10',color:'#00e676',full:'Market Launch',lead:'Manual — mark actual date',owner:'Brand + Supply Chain + Factory',desc:'First commercial unit produced and sold. Launch date manually confirmed.',inputs:['Production schedule','Commercial stock','Trade plan','QA release'],outputs:['First sale confirmation','Post-launch dashboard','PLR report'],checks:['First commercial run complete','Stock in DC','Sales team briefed','Customer notifications sent','30-day PLR scheduled']}
];

const SEED_USERS = [
  {email:'admin@company.com',name:'Admin',role:'admin',color:'#7c4dff',defaultPw:'Admin@2024'},
  {email:'editor@company.com',name:'Editor',role:'editor',color:'#00d4c8',defaultPw:'Editor@2024'}
];

const SUPERADMIN = {user:'admin',pass:'Admin@PKG#2024',name:'Super Admin',color:'#ff5252',role:'superadmin'};

module.exports = {
  STAGE_ORDER, STAGE_COLORS, STAGE_PCT, PRINT_LEAD, STAGE_LEAD,
  MAT_TYPES, PRINT_TYPES, FUNCTIONS, RACI_DATA, STD_RISKS,
  STAGE_DEFS, SEED_USERS, SUPERADMIN
};
