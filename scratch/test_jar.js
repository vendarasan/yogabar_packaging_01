const { convertTextToSpecSheet } = require('../server/utils/specPdfParser.js');

const jarSpec = `
YOGA BAR - PACKAGING SPECIFICATION SHEET
Item Description: 350ml Square PET Peanut Butter Jar
Item Code: PM-JAR-350-01
Artwork Code: AW-JAR-350-01
Revision: 2.0
Material: 100% Virgin Food Grade PET Resin
Neck Diameter: 63 mm Special Deep Neck
Brimful Capacity: 385 ml +/- 5 ml
Overflow Volume: 385 ml
Total Height: 112.5 mm +/- 1.0 mm
Body Width: 72 mm x 72 mm +/- 1.0 mm
Tare Weight: 28.5 g +/- 1.0 g
Color: High Clarity Transparent Amber Tint
Closure Compatibility: 63mm Continuous Thread Cap with Induction Heat Seal Liner

SPECIFICATION PARAMETERS
1. Neck Finish: 63mm Neck dia +/- 0.5 mm, Test: Optical Comparator
2. Overall Height: 112.5 mm +/- 1 mm, Test: Digital Height Gauge
3. Jar Weight: 28.5 g +/- 1 g, Test: Precision Balance (0.01g)
4. Wall Thickness: 0.45 mm min, Test: Magna-Mike Hall Effect Gauge
5. Drop Impact: 1.5m drop on concrete without rupture, IS 2798

STORAGE & HANDLING
Store in ambient warehouse away from direct heat sources. Max stacking 4 boxes per pallet.
`;

const res2 = convertTextToSpecSheet(jarSpec, '350ml_pet_jar_spec.pdf');
console.log('--- PET JAR TEST ---');
console.log('Category:', res2.category);
console.log('DocName:', res2.docHeader?.docName);
console.log('ItemCode:', res2.docHeader?.itemCode);
console.log('ArtworkCode:', res2.docHeader?.artworkCode);
console.log('Revision:', res2.docHeader?.revision);
console.log('Parameters Count:', res2.parameters.length);
console.table(res2.parameters);
console.log('Performance Tests Count:', res2.performanceTests.length);
console.table(res2.performanceTests);
