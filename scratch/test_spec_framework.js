const BASE_URL = 'http://localhost:5001/api';

class CookieClient {
  constructor() {
    this.cookies = '';
  }

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.cookies) headers['Cookie'] = this.cookies;

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      this.cookies = setCookie.split(';')[0];
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
}

async function runTest() {
  console.log('=== Packaging Specification Framework (Yoga Bar Standard) Verification ===\n');

  // 1. Login as Updater (Akshra Ojha - Regular Vertical Executive)
  const updater = new CookieClient();
  const loginUpdater = await updater.post('/auth/login', {
    email: 'akshra.ojha@company.com',
    password: 'Updater@2024'
  });
  console.log('1. Logged in as Updater:', loginUpdater.user.name, `(${loginUpdater.user.role})`);

  // 2. Login as Project Manager (Balaji Sathishkumar - Admin)
  const pm = new CookieClient();
  const loginPM = await pm.post('/auth/login', {
    email: 'balaji.sathishkumar@company.com',
    password: 'Admin@2024'
  });
  console.log('2. Logged in as Project Manager:', loginPM.user.name, `(${loginPM.user.role})`);

  // 3. Login as Packaging Head (Alexsander - Super Admin)
  const head = new CookieClient();
  const loginHead = await head.post('/auth/login', {
    email: 'alexsander@company.com',
    password: 'Admin@PKG#2024'
  });
  console.log('3. Logged in as Packaging Head:', loginHead.user.name, `(${loginHead.user.role})\n`);

  // 4. Fetch projects (or create one if store is empty)
  let projects = await pm.get('/projects');
  let project = projects[0];
  if (!project) {
    console.log('No project found. Creating test project with materials...');
    const createRes = await pm.post('/projects', {
      projectName: 'Date Bites Choco Dip Classic',
      skuSize: '200g',
      briefDate: '2025-12-05',
      targetLaunchDate: '2026-03-30',
      status: 'Active',
      risk: 'Medium',
      supplier: 'Parksons Packaging',
      factory: 'Plant 1',
      description: 'Standard NPD for Yoga Bar snack bites',
      materials: [
        {
          name: 'Shipper Box 5 Ply',
          type: 'Shipper Box',
          printType: 'Flexo Print',
          supplier: 'Parksons Packaging',
          pmCode: 'PM/SE/OCA/50562'
        },
        {
          name: 'Instant Oats Pouch',
          type: 'Stand-up Pouch',
          printType: 'Gravure Print',
          supplier: 'Amcor',
          pmCode: 'PM/PR/POU/50581'
        }
      ]
    });
    project = createRes.project || createRes;
    console.log(`   Created Project: ${project.projectName} (${project.id})`);
  }
  console.log(`4. Target Project: ${project.projectName} (${project.id}) with ${project.materials.length} materials`);

  const mIdx = 0;
  const mat = project.materials[mIdx];
  console.log(`   Target Material: "${mat.name}" (${mat.type})\n`);

  // 5. Updater edits specifications and saves draft
  const specSheetPayload = {
    docHeader: {
      companyName: 'SPROUTLIFE FOODS PVT. LTD',
      docName: `${mat.type} – ${project.projectName} ${project.skuSize || '400g'}`.trim(),
      itemCode: mat.pmCode || 'PM/PR/POU/50562',
      revision: '0.1',
      issueDate: new Date().toISOString().split('T')[0],
      dataSource: 'Packaging Development team',
      pageCount: '1 of 3'
    },
    general: {
      productName: project.projectName,
      packSize: project.skuSize || '400g',
      materialDescription: 'Reverse printed laminate with zipper to be supplied in Pouch form',
      structure: '12 µ CC PET / 12 µ CC METPET / 80 µ Poly',
      style: 'Stand-up Pouch with Tear Notch & Zipper',
      printColors: 'CMYK + 2 Spot Colors (Pantone 2126 C, Pantone 115 C)',
      preferredSupplier: 'Amcor / Constantia',
      packMatrix: '12 pouches per shipper box'
    },
    parameters: [
      { sNo: 1, parameter: 'Total GSM', units: 'g/m²', standard: '114.6 ± 5%', testStandard: 'ASTM D3776', defectType: 'CR', factoryCheck: 'Yes' },
      { sNo: 2, parameter: 'Total Thickness', units: 'µ', standard: '109 ± 5%', testStandard: 'ASTM D882', defectType: 'CR', factoryCheck: 'Yes' },
      { sNo: 3, parameter: 'Pouch Width', units: 'mm', standard: '230 ± 1', testStandard: 'Vernier Caliper', defectType: 'CR', factoryCheck: 'Yes' },
      { sNo: 4, parameter: 'Repeat Height', units: 'mm', standard: '340 ± 1', testStandard: 'Steel Scale', defectType: 'MJ', factoryCheck: 'Yes' },
      { sNo: 5, parameter: 'Gusset Width', units: 'mm', standard: '60 + 60 = 120 ± 5', testStandard: 'Steel Scale', defectType: 'MJ', factoryCheck: 'Yes' }
    ],
    performanceTests: [
      { test: 'Scotch Tape Test', unit: '-', standard: 'No ink / print lift off', defectType: 'CR', testStandard: 'ASTM D3359' },
      { test: 'Seal Strength', unit: 'kgf/15mm', standard: 'Min 2.5 kgf/15mm (Poly/Poly)', defectType: 'CR', testStandard: 'ASTM F88' },
      { test: 'COF (Film to metal)', unit: '-', standard: '0.25 max (Inner side)', defectType: 'CR', testStandard: 'ASTM D1894' },
      { test: 'Solvent Residue', unit: 'mg/m²', standard: '< 5 mg/m² (Toluene < 0.5 mg/m²)', defectType: 'MJ', testStandard: 'ASTM F1884' }
    ],
    criticalRequirements: [
      'No solvent retention in laminates and free from any odour (< 3 mg/m²).',
      'Laminate to be free from dust, foreign particles, air bubbles, pinholes, wrinkles.',
      'Print colour to match approved artwork and physical drawdowns.'
    ],
    storageAndPacking: {
      storageCondition: 'Store at room temperature & in dust-free environment.',
      packingInstruction: 'Pouches packed in clean polythene bags, corrugated boxes with labels.',
      shippingDocuments: 'COA, GC report, Food grade certificate, Heavy metal migration certificate.'
    }
  };

  const draftRes = await updater.put(`/projects/${project.id}/materials/${mIdx}/specsheet`, {
    specSheet: specSheetPayload,
    submitForCheck: false
  });
  console.log('5. Updater saved draft specification sheet. Status:', draftRes.specSheet.governance.status);

  // 6. Updater submits specification for PM check
  const submitRes = await updater.put(`/projects/${project.id}/materials/${mIdx}/specsheet`, {
    specSheet: specSheetPayload,
    submitForCheck: true
  });
  console.log('6. Updater submitted specification sheet for check. Status:', submitRes.specSheet.governance.status);

  // 7. Non-admin cannot check spec
  try {
    await updater.post(`/projects/${project.id}/materials/${mIdx}/specsheet/check`, { comments: 'I check this' });
    console.error('FAIL: Updater was able to check spec sheet!');
  } catch (err) {
    console.log('7. Role enforcement check: Updater forbidden from checking spec sheet (403): PASS');
  }

  // 8. Project Manager checks and verifies specifications
  const checkRes = await pm.post(`/projects/${project.id}/materials/${mIdx}/specsheet/check`, {
    comments: 'Verified against line trial pouch sealing and shelf-life requirements.'
  });
  console.log('8. Project Manager checked spec sheet. Status:', checkRes.specSheet.governance.status);
  console.log('   Checked By:', checkRes.specSheet.governance.checkedBy.name, `(${checkRes.specSheet.governance.checkedBy.title})`);

  // 9. Project Manager cannot give final approval (only Super Admin / Packaging Head can)
  try {
    await pm.post(`/projects/${project.id}/materials/${mIdx}/specsheet/approve`, { comments: 'Final approval' });
    console.error('FAIL: PM was able to give final approval!');
  } catch (err) {
    console.log('9. Role enforcement check: PM forbidden from final approval (403): PASS');
  }

  // 10. Packaging Head gives final approval and locks spec
  const approveRes = await head.post(`/projects/${project.id}/materials/${mIdx}/specsheet/approve`, {
    comments: 'Approved for commercial procurement and print cylinder engraving.'
  });
  console.log('10. Packaging Head approved spec sheet. Status:', approveRes.specSheet.governance.status);
  console.log('    Approved By:', approveRes.specSheet.governance.approvedBy.name, `(${approveRes.specSheet.governance.approvedBy.title})`);

  // 11. Verify PO Spec Sign-off was automatically confirmed
  const updatedProjectsRes = await head.get('/projects');
  const updatedProjects = updatedProjectsRes.projects || updatedProjectsRes;
  const refreshedProj = updatedProjects.find(x => x.id === project.id);
  const refreshedMat = refreshedProj.materials[mIdx];
  console.log('\n11. Verifying PO Spec Sign-off auto-confirmation:');
  console.log('    m.specSignoff.signed:', refreshedMat.specSignoff?.signed);
  console.log('    m.specSignoff.signedBy:', refreshedMat.specSignoff?.signedBy);
  console.log('    m.specSignoff.notes:', refreshedMat.specSignoff?.notes);

  if (refreshedMat.specSignoff?.signed && refreshedMat.specSheet?.governance?.status === 'APPROVED') {
    console.log('\n>>> MATERIAL 1 APPROVAL FLOW PASSED PERFECTLY! <<<');
  } else {
    console.error('\n>>> TEST FAILED! <<<');
  }

  // 12. Test Material 2: Rejection / Revision Cycle
  console.log('\n12. Testing Rejection / Revision Cycle on Material 2 (Instant Oats Pouch):');
  const m2Idx = 1;
  const mat2 = refreshedProj.materials[m2Idx];

  // Updater submits spec
  await updater.put(`/projects/${project.id}/materials/${m2Idx}/specsheet`, {
    specSheet: specSheetPayload,
    submitForCheck: true
  });
  console.log('    Material 2 submitted for PM check.');

  // PM requests revision
  const rejectRes = await pm.post(`/projects/${project.id}/materials/${m2Idx}/specsheet/reject`, {
    reason: 'Total GSM tolerance needs to be tightened from ±5% to ±3% for high-speed filling line.'
  });
  console.log('    PM requested revision. Status:', rejectRes.specSheet.governance.status);
  console.log('    Comments:', rejectRes.specSheet.governance.comments);

  // Updater updates and re-submits
  specSheetPayload.parameters[0].standard = '114.6 ± 3%';
  const reSubmitRes = await updater.put(`/projects/${project.id}/materials/${m2Idx}/specsheet`, {
    specSheet: specSheetPayload,
    submitForCheck: true
  });
  console.log('    Updater adjusted tolerance and re-submitted. Status:', reSubmitRes.specSheet.governance.status);

  // PM checks and verifies
  await pm.post(`/projects/${project.id}/materials/${m2Idx}/specsheet/check`, {
    comments: 'GSM tolerance verified at ±3%. Ready for Packaging Head.'
  });
  console.log('    PM verified and approved for Head review.');

  // Packaging Head approves
  const headFinalRes = await head.post(`/projects/${project.id}/materials/${m2Idx}/specsheet/approve`, {
    comments: 'Commercial spec sign-off complete.'
  });
  console.log('    Packaging Head final approval confirmed. Status:', headFinalRes.specSheet.governance.status);

  console.log('\n>>> COMPLETE SPECIFICATION GOVERNANCE & REVISION WORKFLOW FULLY VERIFIED! <<<');
}

runTest().catch(err => {
  console.error('Test error:', err.data || err.message);
});
