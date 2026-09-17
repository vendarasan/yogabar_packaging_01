const { convertTextToSpecSheet } = require('../server/utils/specPdfParser.js');

const sampleSpec = `
PACKAGING MATERIAL SPECIFICATION
Document Title: 5 Ply Corrugated Master Shipper
Item Code: PM-SHP-2024-008
Artwork Code: AW-SHP-2024-008
Revision: 1.2
Effective Date: 12-Jan-2025
Supersedes: 1.0
Material Type: 5-Ply Corrugated Board (180 Kraft / 120 Flute / 150 Kraft / 120 Flute / 180 Kraft)
Flute Type: Narrow Flute B/C
Dimensions: 450 x 320 x 280 mm
Grammage: 750 gsm
Print Colors: 2 Color Flexo (Navy Blue & Green)
Approved Supplier: PackTech Industries Ltd

TECHNICAL PARAMETERS & TOLERANCES
1. Length: 450 mm +/- 3 mm, Test Standard: Vernier Caliper, Defect: Critical
2. Width: 320 mm +/- 3 mm, Test Standard: Vernier Caliper, Defect: Critical
3. Height: 280 mm +/- 3 mm, Test Standard: Steel Scale, Defect: Critical
4. Bursting Strength: 14.5 kg/cm2 min, Test Standard: IS 1060, Defect: Major
5. Moisture Content: 7.5% to 9.5%, Test Standard: Moisture Meter, Defect: Major
6. Box Compression Test (BCT): 380 kgf min, Test Standard: ASTM D642, Defect: Critical
7. Cobb 60 (Outer): 35 gsm max, Test Standard: IS 1060 Part 1, Defect: Major

PERFORMANCE & COMPLIANCE TESTS
- Drop Test: 1.2m drop height as per IS 7028 Part 4 (Pass/Fail)
- Vibration Test: 1 hour at 200 rpm ASTM D999
- Ink Adhesion: Tape test with 3M Scotch 610 tape

STORAGE AND HANDLING
Store in dry, covered warehouse on wooden pallets. Stack height max 5 boxes.
`;

const res = convertTextToSpecSheet(sampleSpec, '5_ply_shipper_spec.pdf');
console.log('--- SPEC CONVERTER PARSER TEST ---');
console.log('Category:', res.category);
console.log('DocName:', res.docHeader?.docName);
console.log('ItemCode:', res.docHeader?.itemCode);
console.log('ArtworkCode:', res.docHeader?.artworkCode);
console.log('Revision:', res.docHeader?.revision);
console.log('Parameters Count:', res.parameters.length);
console.log('Parameters Sample:');
console.table(res.parameters);
console.log('Performance Tests Count:', res.performanceTests.length);
console.table(res.performanceTests);
console.log('Storage:', res.storageAndPacking?.storage);
console.log('----------------------------------');
