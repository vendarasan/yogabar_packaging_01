const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const { apiRequest, stopTestServer } = require('./testHelper');

describe('Uploads & Spec Conversion Endpoints', () => {
  after(async () => {
    await stopTestServer();
  });

  test('POST /api/specs/convert-pdf — Fails with 400 when neither fileData nor rawText is provided', async () => {
    const res = await apiRequest('POST', '/api/specs/convert-pdf', {
      token: '__superadmin__',
      body: { fileName: 'test.pdf' }
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /PDF file data or extracted raw text required/);
  });

  test('POST /api/specs/convert-pdf — Fails with 400 when fileData payload is empty', async () => {
    const res = await apiRequest('POST', '/api/specs/convert-pdf', {
      token: '__superadmin__',
      body: { fileData: '' }
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /PDF file data or extracted raw text required/);
  });

  test('POST /api/specs/convert-pdf — Converts raw text for Monocarton and extracts schema', async () => {
    const rawCartonText = `
      PACKAGING MATERIAL SPECIFICATION
      Document No: SPEC-MC-90210
      Item Description: Printed Monocarton for Energy Bar 50g
      Item Code: PM-100234
      Revision: 02
      Category: Monocarton Folding Box FBB
      
      TECHNICAL PARAMETERS:
      1. Board Grade: 350 GSM FBB Food Grade
      2. Dimensions: 140 x 35 x 25 mm (+/- 1.0mm)
      3. Caliper / Thickness: 450 micron (+/- 20um)
      4. Printing Process: 6 Color Offset CMYK + 2 Pantone
      5. Surface Finish: Drip off + Spot UV + Matte OPP Lamination
      
      PERFORMANCE TESTS & STANDARDS:
      - Bursting Strength: Min 8.5 kg/cm2 (IS: 1060 Part 1)
      - Cobb 60s (Top): Max 35 g/m2 (TAPPI T441)
      - Scuff Resistance: Pass 500 rubs @ 2 psi without ink rub-off
      
      DEFECT CLASSIFICATION:
      - Critical: Wrong barcode, incorrect statutory text, missing batch coding window
      - Major: Color deviation Delta E > 2.0, delamination, out of squareness > 1mm
      - Minor: Slight dust on non-print area, minor scuff on glue flap
    `;

    const res = await apiRequest('POST', '/api/specs/convert-pdf', {
      token: '__superadmin__',
      body: {
        rawText: rawCartonText,
        fileName: 'monocarton_spec.txt'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.specSheet, 'specSheet object should be returned');
    assert.strictEqual(res.body.specSheet.category, 'carton');
    assert.ok(res.body.specSheet.docHeader, 'docHeader should be populated');
    assert.strictEqual(res.body.specSheet.docHeader.itemCode, 'PM-100234');
    assert.strictEqual(res.body.specSheet.docHeader.artworkCode, 'AW-100234');
    assert.strictEqual(res.body.specSheet.docHeader.revision, '02');

    // Verify parameter extraction
    const params = res.body.specSheet.parameters;
    assert.ok(Array.isArray(params) && params.length >= 2, 'Should extract multiple parameters');

    // Verify defect classification on parameters & critical requirements
    const paramsWithCr = params.filter(p => p.defectType === 'CR');
    assert.ok(paramsWithCr.length > 0, 'Should have parameters classified with Critical (CR) defect type');
    assert.ok(Array.isArray(res.body.specSheet.criticalRequirements), 'Should extract critical requirements array');
    assert.ok(res.body.specSheet.criticalRequirements.length >= 3, 'Should have multiple critical requirements');
  });

  test('POST /api/specs/convert-pdf — Converts raw text for Stand-up Pouch and detects category', async () => {
    const rawPouchText = `
      MATERIAL SPECIFICATION: Stand up pouch with zipper
      Item Code: PM-50670
      Structure: PET12 / MET-PET12 / POLY70
      Width: 160 mm
      Height: 240 mm
      Bottom Gusset: 40 mm
      Seal Width: 8 mm
      Oxygen Transmission Rate (OTR): < 1.5 cc/m2/day
      Water Vapor Transmission Rate (WVTR): < 1.0 g/m2/day
    `;

    const res = await apiRequest('POST', '/api/specs/convert-pdf', {
      token: '__superadmin__',
      body: {
        rawText: rawPouchText,
        fileName: 'pouch_spec.txt'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.specSheet.category, 'pouch');
    assert.strictEqual(res.body.specSheet.docHeader.itemCode, 'PM-50670');
    assert.strictEqual(res.body.specSheet.docHeader.artworkCode, 'AW-50670');
  });

  test('Artwork File Upload & Material Synchronization: Upload, Read, and Cascade', async () => {
    // 1. Create a project to test artwork upload against
    const projRes = await apiRequest('POST', '/api/projects', {
      token: '__superadmin__',
      body: {
        projectName: 'Artwork Upload Test Project ' + Date.now(),
        briefDate: '2026-10-01',
        materials: [
          {
            name: 'Primary Printed Pouch',
            type: 'Stand-up Pouch',
            printType: 'Flexo Print',
            variants: [
              { variantName: 'Almond 50g', skuCode: 'ALM-50' },
              { variantName: 'Berry 50g', skuCode: 'BER-50' }
            ]
          }
        ]
      }
    });
    assert.strictEqual(projRes.status, 201);
    const projId = projRes.body.project.id;

    // 2. Upload artwork file to material 0
    const mockArtworkFile = {
      name: 'Pouch_Master_Art_v2.pdf',
      url: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...',
      type: 'application/pdf',
      size: 1048576,
      uploadedAt: new Date().toISOString()
    };

    const artRes = await apiRequest('PUT', `/api/projects/${projId}/materials/0/artwork`, {
      token: '__superadmin__',
      body: {
        artworkFiles: [mockArtworkFile]
      }
    });

    assert.strictEqual(artRes.status, 200);
    const updatedMat = artRes.body.project.materials[0];
    assert.ok(Array.isArray(updatedMat.artworkFiles));
    assert.strictEqual(updatedMat.artworkFiles.length, 1);
    assert.strictEqual(updatedMat.artworkFiles[0].name, 'Pouch_Master_Art_v2.pdf');

    // 3. Verify that GET /api/projects/:id returns the artwork file
    const getProjRes = await apiRequest('GET', `/api/projects/${projId}`, { token: '__superadmin__' });
    assert.strictEqual(getProjRes.status, 200);
    assert.strictEqual(getProjRes.body.project.materials[0].artworkFiles[0].name, 'Pouch_Master_Art_v2.pdf');

    // 4. Cleanup: Delete test project
    await apiRequest('DELETE', `/api/projects/${projId}`, { token: '__superadmin__' });
  });
});
