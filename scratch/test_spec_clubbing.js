const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('🚀 TESTING SPECIFICATION LAYOUT, PARAMETERS & CODE CLUBBING API\n');

  // 1. Login as admin
  const loginRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'balaji.sathishkumar@company.com', password: 'Admin@2024' });

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.body);
    process.exit(1);
  }
  const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
  console.log('✅ Superadmin authenticated successfully');

  // 2. Create a project with authentic Yoga Bar Clubbed PM Codes
  const createProjRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/projects',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  }, {
    projectName: 'Dry Fruits 40g (Multi-variant Film Roll)',
    fgCode: 'FG-DF-40G',
    skuSize: '40g',
    briefDate: '2026-09-15',
    projectType: 'Regular',
    projectCategory: 'NPD',
    materials: [
      {
        name: 'Film Roll – Dry fruits 40g (Cashew, California Almond, Pistachio, Black Raisin, Green Raisin, Trail mix)',
        pmCode: 'PM/PR/FLM/12691',
        clubbedCodes: 'PM/PR/FLM/12691,87,86,88,89,12838',
        type: 'Flexible Film',
        printType: 'Gravure Print',
        supplier: 'Shree Pack',
        specSheet: {
          category: 'film_roll',
          docHeader: {
            companyName: 'SPROUTLIFE FOODS PVT. LTD',
            docName: 'Film roll – Dry fruits 40g (Cashew, California Almond, Pistachio, Black Raisin, Green Raisin, Trail mix)',
            itemCode: 'PM/PR/FLM/12691',
            clubbedCodes: 'PM/PR/FLM/12691,87,86,88,89,12838',
            artworkCode: 'AW/PR/FLM/12691',
            revision: '0',
            dateOfIssue: '28/08/2024',
            dataSource: 'Packaging Development team'
          },
          general: {
            productName: 'Film roll – Dry fruits 40g (Cashew, California Almond, Pistachio, Black Raisin, Green Raisin, Trail mix)',
            packSize: '40g',
            materialDescription: 'Reverse Printed Laminate – 3 ply',
            structure: '18 µ Matt Bopp + 12 µ METPET + 40 µ PE',
            printColors: 'As per approved AW'
          },
          sectionTitle: 'Laminate Details',
          parameters: [
            { sNo: 1, parameter: 'Total GSM', units: 'g/m2', standard: '75.2-83.1', testStandard: 'ASTM D3776', defectType: 'CR', factoryCheck: 'Yes' },
            { sNo: 2, parameter: 'Thickness', units: 'µ', standard: '73.1-80.8', testStandard: 'ASTM D882', defectType: 'CR', factoryCheck: 'Yes' },
            { sNo: 3, parameter: 'Roll Width', units: 'mm', standard: '240±1mm', testStandard: 'NA', defectType: 'CR', factoryCheck: 'Yes' },
            { sNo: 4, parameter: 'Repeat Length', units: 'mm', standard: '115±1mm', testStandard: 'NA', defectType: 'CR', factoryCheck: 'Yes' },
            { sNo: 5, parameter: 'Winding Direction', units: 'Na', standard: 'Foot First / Eye mark on both sides', testStandard: 'NA', defectType: 'CR', factoryCheck: 'Yes' }
          ],
          performanceTests: [
            { test: 'Bond strength', unit: 'gf/15mm', standard: 'BOPP to Metpet- 150 - 200gmf/15mm', defectType: 'CR', testStandard: 'ASTM F904' },
            { test: 'Seal strength', unit: 'kgf/15mm', standard: '1.2 kgf/15mm', defectType: 'CR', testStandard: 'ASTM F88' }
          ],
          variants: [
            { name: 'Trail Mix', code: 'PM/PR/FLM/12691', pantoneColors: 'Pantone 2346 C, Pantone 1955 C, Gold', barcode: '8 904335 602590' },
            { name: 'California Almonds', code: 'PM/PR/FLM/12687', pantoneColors: 'Pantone 7-8 C, Gold', barcode: '8 904335 603160' },
            { name: 'Roasted & Salted Pistachio', code: 'PM/PR/FLM/12686', pantoneColors: 'Pantone 358 C, Pantone 4210 C, Gold', barcode: '8 904335 603191' },
            { name: 'Whole Cashew', code: 'PM/PR/FLM/12688', pantoneColors: 'Pantone P 136-8 C 2, Pantone P 7-8 C, Gold', barcode: '8 904335 603177' },
            { name: 'Seedless Green Raisins', code: 'PM/PR/FLM/12689', pantoneColors: 'Pantone P 68-7 C, Pantone P 7-8 C, Gold', barcode: '8 904335 603184' },
            { name: 'Seedless Afghani Black Raisins', code: 'PM/PR/FLM/12838', pantoneColors: 'Pantone P 127-5 C, Pantone P 7-8 C, Gold', barcode: '8 904335 603139' }
          ],
          governance: {
            preparedBy: { name: 'Packaging Dev', date: '28/08/2024', signed: true },
            checkedBy: { name: 'Packaging Lead', date: '28/08/2024', signed: true },
            approvedBy: { name: 'Head of QA', date: '28/08/2024', signed: true }
          }
        }
      }
    ]
  });

  const createdProject = createProjRes.body.project || createProjRes.body;
  if (!createdProject?.id) {
    console.error('Failed to create project:', createProjRes.body);
    process.exit(1);
  }
  console.log(`✅ Project created successfully: ${createdProject.projectName} (${createdProject.id})`);

  // 3. Verify material stored clubbedCodes and specSheet
  const m = createdProject.materials[0];
  console.log(`\n📦 Material Inspection:`);
  console.log(`   - Name: ${m.name}`);
  console.log(`   - Primary PM Code: ${m.pmCode}`);
  console.log(`   - Clubbed Codes: ${m.clubbedCodes}`);
  console.log(`   - Spec Doc Name: ${m.specSheet?.docHeader?.docName}`);
  console.log(`   - Parameters Count: ${m.specSheet?.parameters?.length}`);
  console.log(`   - Variants Clubbed: ${m.specSheet?.variants?.length} variants`);

  if (m.clubbedCodes === 'PM/PR/FLM/12691,87,86,88,89,12838' && m.specSheet?.variants?.length === 6) {
    console.log('✅ PASS: Clubbed codes and 6 multi-variant SKUs correctly persisted in project creation!');
  } else {
    console.error('❌ FAIL: Clubbed codes or variants mismatch');
    process.exit(1);
  }

  // 4. Test Updating SpecSheet endpoint
  const updatedSpec = JSON.parse(JSON.stringify(m.specSheet));
  updatedSpec.parameters[0].standard = '78.5 ± 2.0';
  updatedSpec.docHeader.revision = '0.1';

  const updateSpecRes = await request({
    hostname: 'localhost',
    port: 5001,
    path: `/api/projects/${createdProject.id}/materials/0/specsheet`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  }, {
    specSheet: updatedSpec
  });

  if (updateSpecRes.status !== 200) {
    console.error('Failed to update specsheet:', updateSpecRes.body);
    process.exit(1);
  }
  const updatedProject = updateSpecRes.body.project;
  const updatedMat = updatedProject.materials[0];
  console.log(`\n✅ SpecSheet Update Verification:`);
  console.log(`   - Revision: ${updatedMat.specSheet.docHeader.revision}`);
  console.log(`   - Total GSM standard: ${updatedMat.specSheet.parameters[0].standard}`);
  console.log(`   - Clubbed Codes preserved: ${updatedMat.specSheet.docHeader.clubbedCodes}`);

  if (updatedMat.specSheet.parameters[0].standard === '78.5 ± 2.0' && updatedMat.specSheet.docHeader.revision === '0.1') {
    console.log('✅ PASS: PUT /api/projects/:id/materials/:mIdx/specsheet properly updated parameter values and revision!');
  } else {
    console.error('❌ FAIL: SpecSheet update failed');
    process.exit(1);
  }

  console.log('\n🎉 ALL SPECIFICATION LAYOUT, PARAMETERS & CODE CLUBBING TESTS PASSED!');
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
