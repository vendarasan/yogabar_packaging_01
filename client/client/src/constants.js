export const STAGE_ORDER = ['Brief','Sample','Trial','KLD','Artwork','VPDF','Printing','Dispatch','Connectivity','Launch'];
export const STAGE_COLORS = {
  Brief: '#8B5CF6',
  Sample: '#4F8CFF',
  Trial: '#00C8D7',
  KLD: '#EAB308',
  Artwork: '#F97316',
  VPDF: '#A855F7',
  Printing: '#10B981',
  Dispatch: '#06B6D4',
  Connectivity: '#00C8D7',
  Launch: '#38C98A'
};
export const STAGE_PCT = {Brief:10,Sample:20,Trial:30,KLD:40,Artwork:50,VPDF:60,Printing:70,Dispatch:80,Connectivity:90,Launch:100};
export const PRINT_LEAD = {'Digital Print':15,'Flexo Print':21,'Gravure Print':35,'Not Applicable':0};
export const PRINT_LBL = {'Digital Print':'15d','Flexo Print':'21d','Gravure Print':'35d','Not Applicable':'N/A'};
export const MAT_TYPES = [
  'PET Bottle',
  'HDPE Bottle',
  'Glass Bottle',
  'Flexible Pouch',
  'Stand-up Pouch',
  'Sachet / Stick Pack',
  'Monocarton',
  'Eflute',
  'Rigid Carton Box',
  'Corrugated Shipper',
  'Paper Label',
  'PP Label',
  'Shrink Sleeve',
  'In-Mould Label',
  'Cap / Closure',
  'Pump Dispenser',
  'Liner / Foil Seal',
  'Laminated Tube',
  'Aluminium/Tin Can',
  'Aerosol Can',
  'Thermoform Tray',
  'Blister Pack',
  'Insert / Leaflet',
  'Other'
];
export const PRINT_TYPES = ['Digital Print','Flexo Print','Gravure Print','Not Applicable'];

export const POUCH_MAT_TYPES = ['Flexible Pouch', 'Stand-up Pouch', 'Sachet / Stick Pack'];
export const POUCH_PRINT_LEAD = {
  'Digital Print': 15,
  'Flexo Print': 21,
  'Gravure Print': 35
};
export const POUCH_PRINT_LBL = {
  'Digital Print': '15d',
  'Flexo Print': '21d',
  'Gravure Print': '35d'
};

export const SHADOW_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'%3E%3Ccircle cx='50' cy='50' r='48' fill='%231e293b' stroke='%23334155' stroke-width='2'/%3E%3Cdefs%3E%3Cfilter id='s' x='10' y='14' width='80' height='80' filterUnits='userSpaceOnUse'%3E%3CfeDropShadow dx='0' dy='3' stdDeviation='3' flood-color='%23000' flood-opacity='0.6'/%3E%3C/filter%3E%3C/defs%3E%3Cg filter='url(%23s)'%3E%3Ccircle cx='50' cy='36' r='15' fill='%2364748b'/%3E%3Cpath d='M22 80 C22 64 34 54 50 54 C66 54 78 64 78 80 Z' fill='%23475569'/%3E%3C/g%3E%3C/svg%3E";

export const MAT_LEAD_DAYS = {
  'PET Bottle': 30,
  'HDPE Bottle': 30,
  'Glass Bottle': 30,
  'Glass Jar': 30,
  'Laminated Tube': 45,
  'Aluminium/Tin Can': 30,
  'Aluminium Can': 30,
  'Aerosol Can': 45,
  'Flexible Pouch': 21,
  'Stand-up Pouch': 21,
  'Sachet / Stick Pack': 21,
  'Monocarton': 15,
  'Eflute': 15,
  'Rigid Carton Box': 30,
  'Rigid Caarton Box': 30,
  'Corrugated Shipper': 10,
  'Paper Label': 20,
  'PP Label': 20,
  'Shrink Sleeve': 20,
  'In-Mould Label': 30,
  'Thermoform Tray': 25,
  'Blister Pack': 25,
  'Cap / Closure': 30,
  'Pump Dispenser': 30,
  'Liner / Foil Seal': 20,
  'Insert / Leaflet': 10,
  'Other': 15
};

export function isPouch(type) {
  return POUCH_MAT_TYPES.includes(type);
}

export function getMaterialLeadTime(m) {
  if (!m) return 15;
  const type = typeof m === 'string' ? m : (m.type || m.materialType);
  const printType = typeof m === 'object' ? m.printType : null;
  const customLead = typeof m === 'object' ? m.customLeadTime : null;

  if (isPouch(type)) {
    if (printType && POUCH_PRINT_LEAD[printType]) {
      return POUCH_PRINT_LEAD[printType];
    }
    return 21;
  }
  if (customLead !== undefined && customLead !== null && customLead !== '') {
    const val = parseInt(customLead, 10);
    if (!isNaN(val)) return val;
  }
  if (MAT_LEAD_DAYS[type] !== undefined) {
    return MAT_LEAD_DAYS[type];
  }
  return 15;
}

export const PKG_HIERARCHY_TIERS = {
  // Tier 1: Primary Packaging Containers (Highest Priority: Rank 1)
  'Flexible Pouch': 1,
  'Stand-up Pouch': 1,
  'Sachet / Stick Pack': 1,
  'PET Bottle': 1,
  'HDPE Bottle': 1,
  'Glass Bottle': 1,
  'Glass Jar': 1,
  'Laminated Tube': 1,
  'Aluminium/Tin Can': 1,
  'Aluminium Can': 1,
  'Aerosol Can': 1,
  'Blister Pack': 1,
  'Thermoform Tray': 1,

  // Tier 2: Primary Closures & Dispensing (Rank 2)
  'Cap / Closure': 2,
  'Pump Dispenser': 2,
  'Liner / Foil Seal': 2,

  // Tier 3: Primary Decoration & Labels (Rank 3)
  'Shrink Sleeve': 3,
  'In-Mould Label': 3,
  'PP Label': 3,
  'Paper Label': 3,

  // Tier 4: Secondary Packaging (Unit Boxes / Outer Retail) (Rank 4)
  'Monocarton': 4,
  'Eflute': 4,
  'Rigid Carton Box': 4,
  'Rigid Caarton Box': 4,
  'Carton Box': 4,
  'Insert / Leaflet': 4,

  // Tier 5: Tertiary & Outer Transport (Rank 5 - Lowest Priority)
  'Corrugated Shipper': 5,
  'Other': 6
};

export function getMaterialHierarchyTier(matType) {
  return PKG_HIERARCHY_TIERS[matType] || 5;
}

export function getTierName(tier) {
  switch (tier) {
    case 1: return 'Primary Container';
    case 2: return 'Primary Closure';
    case 3: return 'Primary Label';
    case 4: return 'Secondary Box';
    case 5: return 'Tertiary Shipper';
    default: return 'Ancillary Pack';
  }
}

/**
 * Formats material subtitle and hierarchy tier so that "Primary", "Secondary",
 * and "Tertiary" only appear ONCE (never duplicated).
 * 
 * If m.name already contains "Primary", "Secondary", or "Tertiary" (e.g. "Primary", "Secondary", "Tertiary", "Primary Pouch"):
 * - Omits the redundant tier prefix so the word is not shown twice.
 */
export function getMaterialDisplaySubtitle(m) {
  if (!m) return { typeText: '', tierText: '' };
  const name = (m.name || '').trim();
  const type = (m.type || '').trim();
  const tier = getTierName(getMaterialHierarchyTier(type));

  const nameLower = name.toLowerCase();
  const tierWords = ['primary', 'secondary', 'tertiary'];
  const hasTierInName = tierWords.some(w => nameLower.includes(w));

  if (hasTierInName) {
    // Name already explicitly declares Primary / Secondary / Tertiary.
    // Omit the tier text so Primary / Secondary / Tertiary only appears 1 time.
    return {
      typeText: nameLower === type.toLowerCase() ? '' : type,
      tierText: ''
    };
  }

  if (nameLower === type.toLowerCase()) {
    // Name is identical to type (e.g. "Monocarton"), show the tier to avoid repeating type name
    return {
      typeText: '',
      tierText: tier
    };
  }

  // Standard case: name is custom (e.g. "Dark Choco Film"), show type and tier
  return {
    typeText: type,
    tierText: tier
  };
}

/**
 * Determines the single definitive Critical Path Material (CPM) index based on:
 * 1. Latest Connectivity date (bottleneck duration)
 * 2. Hierarchy Tier (Primary Container > Closure > Label > Secondary Box > Shipper)
 * 3. Inherent Lead Time (Longer production lead time takes precedence)
 * 4. Original component sequence (Index 0 before Index 1)
 */
export function determineCPMIndex(mats) {
  if (!mats || !mats.length) return -1;
  let maxConnDate = '';
  mats.forEach(m => {
    const c = m.milestones?.Connectivity || '';
    if (c > maxConnDate) maxConnDate = c;
  });

  const tiedCandidates = mats
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => (m.milestones?.Connectivity || '') === maxConnDate);

  if (tiedCandidates.length === 1) {
    return tiedCandidates[0].idx;
  }

  // Tie-breaker using Packaging Hierarchy
  tiedCandidates.sort((a, b) => {
    const tierA = getMaterialHierarchyTier(a.m.type);
    const tierB = getMaterialHierarchyTier(b.m.type);
    if (tierA !== tierB) return tierA - tierB;

    const ltA = getMaterialLeadTime(a.m);
    const ltB = getMaterialLeadTime(b.m);
    if (ltA !== ltB) return ltB - ltA;

    return a.idx - b.idx;
  });

  return tiedCandidates[0].idx;
}

export const FUNCTIONS = ['Brand Mgmt','Packaging','Supply Chain','Factory','Procurement','Quality / Reg','Network Planner'];
export const RACI_DATA = {Brief:['A','R','C','I','C','C','I'],Sample:['C','R','I','I','C','C','I'],Trial:['I','C','R','R','I','C','I'],KLD:['C','R','I','I','C','C','I'],Artwork:['A','R','I','I','I','C','I'],VPDF:['A','R','I','I','I','C','I'],Printing:['I','C','I','I','R','A','I'],Dispatch:['I','I','R','C','A','I','C'],Connectivity:['I','C','A','C','C','I','R'],Launch:['A','C','R','R','C','C','R']};
export const STD_RISKS = [{id:'R-001',stage:'Brief',desc:'Brief incomplete — missing regulatory requirements',impact:'High',prob:'Medium',level:'High',mitigation:'Mandatory checklist sign-off before brief issue',owner:'Packaging',status:'Open'},{id:'R-002',stage:'Sample',desc:'T1 samples out of tolerance — dimensional deviation',impact:'Medium',prob:'High',level:'High',mitigation:'Pre-sample DFM review with supplier tooling team',owner:'Packaging',status:'Open'},{id:'R-003',stage:'Trial',desc:'Machine incompatibility — pack not running on line',impact:'High',prob:'Low',level:'Medium',mitigation:'Pre-trial machine audit with supplier 2 weeks prior',owner:'Factory',status:'Open'},{id:'R-004',stage:'Artwork',desc:'Multiple artwork rounds causing delay (>3 rounds)',impact:'Medium',prob:'High',level:'High',mitigation:'Pre-artwork KLD briefing; strict 3-round limit enforced',owner:'Brand Mgmt',status:'Open'},{id:'R-005',stage:'Artwork',desc:'Regulatory text not approved in time',impact:'High',prob:'Medium',level:'High',mitigation:'Regulatory review initiated at KLD stage',owner:'Regulatory',status:'Mitigated'},{id:'R-006',stage:'VPDF',desc:'Colour delta > ΔE 2 — substrate mismatch',impact:'Medium',prob:'Medium',level:'Medium',mitigation:'Substrate confirmed at brief; press proof on actual substrate',owner:'Packaging',status:'Open'},{id:'R-007',stage:'Printing',desc:'Gravure supplier capacity crunch — Q4 booking conflict',impact:'High',prob:'High',level:'High',mitigation:'Book slots 8 weeks ahead; PO raised on VPDF sign-off',owner:'Procurement',status:'Open'},{id:'R-008',stage:'Dispatch',desc:'Transit damage — poor palletisation',impact:'Medium',prob:'Low',level:'Low',mitigation:'Supplier SOP: stretch wrap + top cap mandatory',owner:'Supply Chain',status:'Open'},{id:'R-009',stage:'Connectivity',desc:'SAP BOM not updated before production date',impact:'High',prob:'Medium',level:'High',mitigation:'Master data form raised 6 weeks before launch',owner:'Ntwk Planner',status:'Open'},{id:'R-010',stage:'Launch',desc:'Commercial stock not in DC on launch date',impact:'High',prob:'Medium',level:'High',mitigation:'Safety stock of 4 weeks built before launch week',owner:'Supply Chain',status:'Open'}];
export const STAGE_DEFS = [{id:'Brief',num:'01',color:'#7c4dff',full:'Packaging Development Brief',lead:'Day 0 — Start',owner:'Brand Management + Packaging',desc:'Formal kick-off. All functional requirements frozen and signed off.',inputs:['Marketing brief','Consumer insight','Benchmark samples','Regulatory requirements','Cost target'],outputs:['Signed Packaging Brief','Project ID raised','Supplier RFQ list'],checks:['Brief signed by Brand, Packaging & SC','Cost target aligned','Regulatory sign-off checklist','Pack format confirmed']},{id:'Sample',num:'02',color:'#00b0ff',full:'Prototype / T1 Sample',lead:'+5 days from Brief',owner:'Packaging + Supplier',desc:'First physical prototype by supplier against approved brief specifications.',inputs:['Signed brief','Material spec','Tooling instructions','Benchmark reference'],outputs:['T1 prototype samples','Sample evaluation report','Deviation log'],checks:['Dimensions within ±0.5mm','Material grade confirmed','Colour Pantone matching','Drop test 1.2m 6 faces','Stackability OK']},{id:'Trial',num:'03',color:'#00bfa5',full:'Factory Line Trial',lead:'+7 days from Sample',owner:'Factory + Packaging + SC',desc:'Pack run on actual production line to validate machine compatibility.',inputs:['Approved T1 sample','Machine speed target','SOP draft'],outputs:['Trial report','Machine speed sign-off','SOP v1.0'],checks:['Line speed ≥ OEE target','Seal integrity passed','Label placement ±1mm','Fill weight ±2g','Defect rate <0.5%']},{id:'KLD',num:'04',color:'#ffd740',full:'Key Line Data — Spec Lock',lead:'+3 days from Trial',owner:'Packaging + Quality + Procurement',desc:'All technical specs FROZEN. KLD sheet issued to artwork studio.',inputs:['Trial-approved dimensions','Barcode zone','Legal text','Nutrition panel'],outputs:['Signed KLD sheet','Final dieline','GS1 barcode registration'],checks:['All dimensions locked','GS1 barcode confirmed','Legal text approved','Dieline approved','Colour locked (CMYK + Pantone)']},{id:'Artwork',num:'05',color:'#ff6d00',full:'Artwork Development & Approval',lead:'+5 days from KLD',owner:'Brand + Packaging + Regulatory',desc:'Creative artwork developed, proofed and approved through structured rounds.',inputs:['Approved KLD','Brand guidelines','Legal claims','Nutritional data'],outputs:['Print-ready artwork (PDF/AI)','Signed approval form','Colour swatch sign-off'],checks:['Round 1 — layout & hierarchy','Round 2 — legal & regulatory','Round 3 — colour & typography','Brand sign-off','Regulatory & QA sign-off']},{id:'VPDF',num:'06',color:'#e040fb',full:'Virtual PDF / Digital Proof Sign-off',lead:'+2 days from Artwork',owner:'Packaging + Brand + Quality',desc:'Digital soft-proof reviewed against physical colour target before print job released.',inputs:['Print-ready artwork','Colour target swatch','Substrate sample'],outputs:['Signed VPDF approval form','Press release instruction'],checks:['Colour delta ΔE < 2 vs Pantone','Barcode grade ≥ C (ISO 15415)','All text legible','VPDF signed by Brand + Packaging + QA']},{id:'Printing',num:'07',color:'#76ff03',full:'Print Production / Bulk Manufacture',lead:'Digital: 10d · Flexo: 20d · Gravure: 35d',owner:'Supplier + Procurement + Quality',desc:'Commercial bulk print run. Lead time depends on print process.',inputs:['Signed VPDF','PO from Procurement','Supplier schedule'],outputs:['Bulk packaging material','COA','QC inspection report'],checks:['First-off press check signed','Colour check vs swatch','Barcode scan 100% units','Quantity verified vs PO','Incoming QC passed']},{id:'Dispatch',num:'08',color:'#ff4081',full:'Dispatch to Factory / DC',lead:'+4 days from Printing',owner:'Supply Chain + Logistics + Procurement',desc:'Packaging material dispatched from supplier to factory or DC.',inputs:['Delivery schedule','Truck booking','Factory goods-in slot'],outputs:['GRN (Goods Receipt Note)','Stock in WMS','QA release in SAP'],checks:['Quantity matches PO','No transit damage','Conditions met','Scanned into WMS','QA release updated']},{id:'Connectivity',num:'09',color:'#40c4ff',full:'Connectivity / System Setup',lead:'+4 days from Dispatch',owner:'Supply Chain + IT + Factory + Network Planner',desc:'All system masters live — SAP codes, BOM, DRP parameters, replenishment rules.',inputs:['GRN confirmation','Final approved material','Master data form'],outputs:['SAP material code active','BOM updated','DRP live','Distribution confirmed'],checks:['Material code in SAP','BOM updated for all SKUs','Min/max set in DRP','Distribution network confirmed','Forecast updated in S&OP']},{id:'Launch',num:'10',color:'#00e676',full:'Market Launch',lead:'Manual — mark actual date',owner:'Brand + Supply Chain + Factory',desc:'First commercial unit produced and sold. Launch date manually confirmed.',inputs:['Production schedule','Commercial stock','Trade plan','QA release'],outputs:['First sale confirmation','Post-launch dashboard','PLR report'],checks:['First commercial run complete','Stock in DC','Sales team briefed','Customer notifications sent','30-day PLR scheduled']}];
export const MAT_SPEC_FIELDS = {'PET Bottle':[{k:'dims',l:'Dimensions (L×W×H mm)',p:'e.g., 60×60×180 mm'},{k:'capacity',l:'Capacity (ml)',p:'e.g., 500 ml'},{k:'neck',l:'Neck Finish & Size',p:'e.g., 28mm PCO 1810'},{k:'weight',l:'Bottle Weight (g)',p:'e.g., 18 g'},{k:'colour',l:'Colour / Transparency',p:'e.g., Clear, Blue tint'},{k:'grade',l:'Resin Grade',p:'e.g., PET IV 0.80'},{k:'special',l:'Special Requirements',p:'e.g., Hot fill, UV block'}],'HDPE Bottle':[{k:'dims',l:'Dimensions (L×W×H mm)',p:'e.g., 70×50×200 mm'},{k:'capacity',l:'Capacity (ml)',p:'e.g., 1000 ml'},{k:'neck',l:'Neck Finish & Size',p:'e.g., 38mm TE Band'},{k:'weight',l:'Bottle Weight (g)',p:'e.g., 35 g'},{k:'colour',l:'Colour / Opacity',p:'e.g., White opaque, Natural'},{k:'grade',l:'Resin Grade',p:'e.g., HDPE Blow Grade'},{k:'special',l:'Special Requirements',p:'e.g., Light barrier, grip handle'}],'Aluminium/Tin Can':[{k:'dims',l:'Dimensions (Dia × H mm)',p:'e.g., 53×130 mm'},{k:'capacity',l:'Can Capacity (ml)',p:'e.g., 250 / 330 ml'},{k:'neck',l:'Neck / Seam Spec',p:'e.g., 202 Dia Necked-in'},{k:'coating',l:'Internal Lacquer',p:'e.g., Epoxy / BPA-NI'},{k:'print',l:'External Print & Finish',p:'e.g., 6C Dry offset + Matte'},{k:'special',l:'Special Features',p:'e.g., Tactile, Embossed'}],'Aluminium Can':[{k:'dims',l:'Dimensions (Dia × H mm)',p:'e.g., 53×130 mm'},{k:'capacity',l:'Can Capacity (ml)',p:'e.g., 250 / 330 ml'},{k:'neck',l:'Neck / Seam Spec',p:'e.g., 202 Dia Necked-in'},{k:'coating',l:'Internal Lacquer',p:'e.g., Epoxy / BPA-NI'},{k:'print',l:'External Print & Finish',p:'e.g., 6C Dry offset + Matte'},{k:'special',l:'Special Features',p:'e.g., Tactile, Embossed'}],'Monocarton':[{k:'dims',l:'Dimensions (L×W×D mm)',p:'e.g., 200×120×80 mm'},{k:'board',l:'Board Grade & GSM',p:'e.g., 300 / 350 GSM FBB / SBS'},{k:'style',l:'Carton Style',p:'e.g., Tuck-end, Reverse-tuck, Crash-lock'},{k:'colours',l:'No. of Colours',p:'e.g., 4C CMYK + 2 Pantone'},{k:'coating',l:'Surface Coating',p:'e.g., Matte / Gloss OPP lamination, Drip-off'},{k:'special',l:'Special Features',p:'e.g., Spot UV, Hot stamp, Emboss, Window'}],'Eflute':[{k:'dims',l:'Dimensions (L×W×D mm)',p:'e.g., 250×180×90 mm'},{k:'flute',l:'Flute Profile & GSM',p:'e.g., E-Flute 3-ply / 350+120+120 GSM'},{k:'style',l:'Box Style',p:'e.g., Tuck-top mailer, Die-cut self lock'},{k:'print',l:'Print / Lamination',p:'e.g., Litho-laminated, Flexo print'},{k:'strength',l:'Bursting Strength / ECT',p:'e.g., 12-14 kg/cm² / 32 ECT'},{k:'special',l:'Special Features',p:'e.g., Matte OPP, Spot UV, Tear strip'}],'Rigid Carton Box':[{k:'dims',l:'Dimensions (L×W×H mm)',p:'e.g., 220×150×60 mm'},{k:'board',l:'Board Spec & Thickness',p:'e.g., 1.5mm / 2.0mm Kappa board'},{k:'outerWrap',l:'Outer Wrap Material & GSM',p:'e.g., 157 GSM Art Paper / Specialty Paper'},{k:'style',l:'Box Construction Style',p:'e.g., Lid & Base, Book-style magnetic, Drawer'},{k:'innerTray',l:'Inner Fitment / Tray',p:'e.g., EVA foam with velvet, Thermoformed tray'},{k:'special',l:'Special Finishes',p:'e.g., Soft touch matte, Gold foil, Ribbon pull'}],'Rigid Caarton Box':[{k:'dims',l:'Dimensions (L×W×H mm)',p:'e.g., 220×150×60 mm'},{k:'board',l:'Board Spec & Thickness',p:'e.g., 1.5mm / 2.0mm Kappa board'},{k:'outerWrap',l:'Outer Wrap Material & GSM',p:'e.g., 157 GSM Art Paper / Specialty Paper'},{k:'style',l:'Box Construction Style',p:'e.g., Lid & Base, Book-style magnetic, Drawer'},{k:'innerTray',l:'Inner Fitment / Tray',p:'e.g., EVA foam with velvet, Thermoformed tray'},{k:'special',l:'Special Finishes',p:'e.g., Soft touch matte, Gold foil, Ribbon pull'}],'Carton Box':[{k:'dims',l:'Dimensions (L×W×D mm)',p:'e.g., 200×120×80 mm'},{k:'board',l:'Board Grade & GSM',p:'e.g., 350 GSM SBS / FBB'},{k:'style',l:'Carton Style',p:'e.g., Tuck-end, Straight-tuck'},{k:'colours',l:'No. of Colours',p:'e.g., 4C CMYK + 2 Pantone'},{k:'coating',l:'Surface Coating',p:'e.g., Matte OPP lamination'},{k:'special',l:'Special Features',p:'e.g., Spot UV, Hot stamp, Emboss, Window'}],'Paper Label':[{k:'dims',l:'Label Size (W×H mm)',p:'e.g., 80×120 mm'},{k:'substrate',l:'Label Substrate',p:'e.g., 80 GSM BOPP gloss'},{k:'adhesive',l:'Adhesive Type',p:'e.g., Permanent acrylic'},{k:'colours',l:'No. of Colours',p:'e.g., 4C CMYK + 1 Pantone'},{k:'finish',l:'Surface Finish',p:'e.g., Matte OPP, Glossy'},{k:'special',l:'Special Features',p:'e.g., Tamper evident, RFID'}],'PP Label':[{k:'dims',l:'Label Size (W×H mm)',p:'e.g., 80×120 mm'},{k:'substrate',l:'Label Substrate',p:'e.g., 50µ BOPP white opaque'},{k:'adhesive',l:'Adhesive Type',p:'e.g., Permanent acrylic'},{k:'colours',l:'No. of Colours',p:'e.g., 4C CMYK + 2 Pantone'},{k:'finish',l:'Surface Finish',p:'e.g., Matte, Glossy, Soft touch'},{k:'special',l:'Special Features',p:'e.g., Booklet label'}],'Flexible Pouch':[{k:'dims',l:'Pouch Size (W×H mm)',p:'e.g., 120×180 mm'},{k:'capacity',l:'Fill Volume / Weight',p:'e.g., 200 ml or 100 g'},{k:'structure',l:'Film Structure',p:'e.g., PET12/AL9/CPP70'},{k:'seal',l:'Seal Width (mm)',p:'e.g., 10 mm 3-side seal'},{k:'spout',l:'Spout / Fitment',p:'e.g., None, 8mm Doypak spout'},{k:'special',l:'Special Features',p:'e.g., Notch, TearEasy, Valve'}],'Stand-up Pouch':[{k:'dims',l:'Pouch Size (W×H×Gusset mm)',p:'e.g., 130×200×40 mm'},{k:'capacity',l:'Fill Volume / Weight',p:'e.g., 500 g'},{k:'structure',l:'Film Structure',p:'e.g., BOPP20/MET-BOPP18/CPP50'},{k:'seal',l:'Seal Width (mm)',p:'e.g., 10 mm'},{k:'closure',l:'Closure Type',p:'e.g., Zipper, Press-lock, Spout'},{k:'special',l:'Special Features',p:'e.g., Window, Valve, Notch'}],'Shrink Sleeve':[{k:'dims',l:'Sleeve Size (W×H mm flat)',p:'e.g., 100×120 mm flat width'},{k:'film',l:'Film Material & Thickness',p:'e.g., PETG 45µ'},{k:'shrink',l:'Shrink % (MD×TD)',p:'e.g., 5%×75% (PETG)'},{k:'colours',l:'No. of Colours',p:'e.g., 8C Gravure'},{k:'perf',l:'Perforation / Tear Tape',p:'e.g., Vertical perf 3mm from seam'}],'Cap / Closure':[{k:'dims',l:'Cap Diameter (mm)',p:'e.g., 38mm'},{k:'height',l:'Cap Height (mm)',p:'e.g., 20 mm'},{k:'material',l:'Cap Material',p:'e.g., PP, HDPE, Aluminium'},{k:'type',l:'Closure Type',p:'e.g., Screw, Snap, Flip-top'},{k:'liner',l:'Liner / Seal Type',p:'e.g., Foam liner, Induction seal'},{k:'colour',l:'Cap Colour',p:'e.g., White, Black, Custom Pantone'}]};
export const DEFAULT_SPEC_FIELDS = [{k:'dims',l:'Dimensions / Size',p:'L × W × H mm'},{k:'capacity',l:'Capacity / Content Weight',p:'e.g., 500 ml or 50 g'},{k:'substrate',l:'Material / Substrate',p:'e.g., material grade, GSM'},{k:'colour',l:'Colour / Finish',p:'e.g., Glossy white'},{k:'colours',l:'No. of Colours / Print',p:'e.g., 4C CMYK + 1 Pantone'},{k:'special',l:'Special Requirements',p:'e.g., certifications'},{k:'supplier_code',l:'Drawing / Item Code',p:'e.g., YB-PKG-2024-001'}];
export function getSpecFields(type) { return MAT_SPEC_FIELDS[type] || DEFAULT_SPEC_FIELDS; }

export const PO_ACTIONS = ['Raised', 'Under approval', 'RFQ in progress'];
export const PO_CONFIG = {
  'Raised': { label: 'Raised', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', icon: '✅' },
  'Under approval': { label: 'Under approval', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', icon: '⏳' },
  'RFQ in progress': { label: 'RFQ in progress', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)', border: '#0ea5e9', icon: '📑' }
};

export const PRESET_USERS = [
  // ── PACKAGING HEAD (Super Admin) ──
  {
    category: 'Packaging Leadership',
    label: 'Alexsander (Packaging Head)',
    name: 'Alexsander',
    title: 'Packaging Head',
    team: 'Packaging Leadership',
    username: 'admin',
    email: 'alexsander@company.com',
    password: 'Admin@PKG#2024',
    role: 'superadmin',
    department: 'Global Packaging Leadership',
    mobile: '+91 98765 43210',
    avatar: '',
    badge: '👑 Super Admin',
    badgeColor: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    authority: 'Packaging Head & Super Admin. Full system control, team governance, delete privileges, and audit log oversight.'
  },

  // ── REGULAR VERTICAL ──
  {
    category: 'Regular Vertical',
    label: 'Balaji Sathishkumar (Project Manager)',
    name: 'Balaji Sathishkumar',
    title: 'Project Manager',
    team: 'Regular Vertical',
    username: 'balaji.sathishkumar@company.com',
    email: 'balaji.sathishkumar@company.com',
    password: 'Admin@2024',
    role: 'admin',
    department: 'Regular Vertical Packaging',
    mobile: '+91 98765 43211',
    avatar: '',
    badge: '🛡 Admin (PM)',
    badgeColor: '#7c3aed',
    badgeBg: 'rgba(124, 58, 237, 0.15)',
    authority: 'Project Manager (Regular Vertical). Project creation, timeline governance, stage review, movement revocation, and launch sign-off.'
  },
  {
    category: 'Regular Vertical',
    label: 'Akshra Ojha (Executive)',
    name: 'Akshra Ojha',
    title: 'Executive',
    team: 'Regular Vertical',
    username: 'akshra.ojha@company.com',
    email: 'akshra.ojha@company.com',
    password: 'Updater@2024',
    role: 'updater',
    department: 'Regular Vertical Packaging Execution',
    mobile: '+91 98765 43212',
    avatar: '',
    badge: '⚡ Executive',
    badgeColor: '#00bfa5',
    badgeBg: 'rgba(0, 191, 165, 0.15)',
    authority: 'Executive (Regular Vertical). Stage advances, technical specifications feeding, PM code & PO tracking.'
  },
  {
    category: 'Regular Vertical',
    label: 'Intern 1 (Regular Vertical)',
    name: 'Intern 1',
    title: 'Intern',
    team: 'Regular Vertical',
    username: 'intern1.regular@company.com',
    email: 'intern1.regular@company.com',
    password: 'Intern@2024',
    role: 'updater',
    department: 'Regular Vertical Packaging Execution',
    mobile: '+91 98765 43215',
    avatar: '',
    badge: '⚡ Intern 1',
    badgeColor: '#14b8a6',
    badgeBg: 'rgba(20, 184, 166, 0.15)',
    authority: 'Intern 1 (Regular Vertical). Assists Executive with stage tracking, specs entry, and supplier follow-ups.'
  },
  {
    category: 'Regular Vertical',
    label: 'Intern 2 (Regular Vertical)',
    name: 'Intern 2',
    title: 'Intern',
    team: 'Regular Vertical',
    username: 'intern2.regular@company.com',
    email: 'intern2.regular@company.com',
    password: 'Intern@2024',
    role: 'updater',
    department: 'Regular Vertical Packaging Execution',
    mobile: '+91 98765 43216',
    avatar: '',
    badge: '⚡ Intern 2',
    badgeColor: '#06b6d4',
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    authority: 'Intern 2 (Regular Vertical). Assists Executive with stage tracking, specs entry, and supplier follow-ups.'
  },
  {
    category: 'Regular Vertical',
    label: 'Intern 3 (Regular Vertical)',
    name: 'Intern 3',
    title: 'Intern',
    team: 'Regular Vertical',
    username: 'intern3.regular@company.com',
    email: 'intern3.regular@company.com',
    password: 'Intern@2024',
    role: 'updater',
    department: 'Regular Vertical Packaging Execution',
    mobile: '+91 98765 43217',
    avatar: '',
    badge: '⚡ Intern 3',
    badgeColor: '#0284c7',
    badgeBg: 'rgba(2, 132, 199, 0.15)',
    authority: 'Intern 3 (Regular Vertical). Assists Executive with stage tracking, specs entry, and supplier follow-ups.'
  },

  // ── GROWTH VERTICAL ──
  {
    category: 'Growth Vertical',
    label: '[Unassigned] (Project Manager)',
    name: '[Unassigned]',
    title: 'Project Manager',
    team: 'Growth Vertical',
    username: 'growth.pm@company.com',
    email: 'growth.pm@company.com',
    password: 'Admin@2024',
    role: 'admin',
    department: 'Growth Vertical Packaging',
    mobile: '',
    avatar: '',
    badge: '🛡 Admin (PM)',
    badgeColor: '#0284c7',
    badgeBg: 'rgba(2, 132, 199, 0.15)',
    authority: 'Project Manager (Growth Vertical). Agile project onboarding, Stage 1 crunch review, timeline governance, and quality gates.'
  },
  {
    category: 'Growth Vertical',
    label: 'Manideep (Executive)',
    name: 'Manideep',
    title: 'Executive',
    team: 'Growth Vertical',
    username: 'manideep@company.com',
    email: 'manideep@company.com',
    password: 'Updater@2024',
    role: 'updater',
    department: 'Growth Vertical Packaging Execution',
    mobile: '+91 98765 43214',
    avatar: '',
    badge: '⚡ Executive',
    badgeColor: '#ff6d00',
    badgeBg: 'rgba(255, 109, 0, 0.15)',
    authority: 'Executive (Growth Vertical). Rapid sprint progress, material timelines, specifications, and converter coordination.'
  },
  {
    category: 'Growth Vertical',
    label: 'Intern 1 (Growth Vertical)',
    name: 'Intern 1',
    title: 'Intern',
    team: 'Growth Vertical',
    username: 'intern1.growth@company.com',
    email: 'intern1.growth@company.com',
    password: 'Intern@2024',
    role: 'updater',
    department: 'Growth Vertical Packaging Execution',
    mobile: '+91 98765 43218',
    avatar: '',
    badge: '⚡ Intern 1',
    badgeColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    authority: 'Intern 1 (Growth Vertical). Rapid sprint material tracking, converter updates, and specifications assistance.'
  },
  {
    category: 'Growth Vertical',
    label: 'Intern 2 (Growth Vertical)',
    name: 'Intern 2',
    title: 'Intern',
    team: 'Growth Vertical',
    username: 'intern2.growth@company.com',
    email: 'intern2.growth@company.com',
    password: 'Intern@2024',
    role: 'updater',
    department: 'Growth Vertical Packaging Execution',
    mobile: '+91 98765 43219',
    avatar: '',
    badge: '⚡ Intern 2',
    badgeColor: '#eab308',
    badgeBg: 'rgba(234, 179, 8, 0.15)',
    authority: 'Intern 2 (Growth Vertical). Rapid sprint material tracking, converter updates, and specifications assistance.'
  },
  {
    category: 'Growth Vertical',
    label: 'Intern 3 (Growth Vertical)',
    name: 'Intern 3',
    title: 'Intern',
    team: 'Growth Vertical',
    username: 'intern3.growth@company.com',
    email: 'intern3.growth@company.com',
    password: 'Intern@2024',
    role: 'updater',
    department: 'Growth Vertical Packaging Execution',
    mobile: '+91 98765 43220',
    avatar: '',
    badge: '⚡ Intern 3',
    badgeColor: '#84cc16',
    badgeBg: 'rgba(132, 204, 22, 0.15)',
    authority: 'Intern 3 (Growth Vertical). Rapid sprint material tracking, converter updates, and specifications assistance.'
  }
];

export const ROLE_CONFIG = {
  superadmin: { label: 'Super Admin', badge: '👑 Super Admin', color: '#ef4444' },
  admin:      { label: 'Admin',       badge: '🛡 Admin',       color: '#7c3aed' },
  updater:    { label: 'Updater',     badge: '⚡ Updater',     color: '#00bfa5' },
  editor:     { label: 'Updater',     badge: '⚡ Updater',     color: '#00bfa5' }
};
