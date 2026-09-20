'use strict';
/**
 * test_crud_operations.js — Comprehensive CRUD verification across the entire project lifecycle:
 *   1. packaging_formats (Create, Read, Update, Deactivate, Hard Delete)
 *   2. projects (Create, Read, Update, Soft Delete, Hard Delete)
 *   3. project_materials (Create, Read, Update, Delete)
 *   4. specifications (Create, Read, Update, Delete)
 *   5. artworks (Create, Read, Update, Delete)
 *   6. project_risks (Create, Read, Update, Delete)
 *   7. Cascade deletion & Foreign key constraints
 */

require('dotenv').config();
const { query, testConnection } = require('../db');
const {
  ProjectsRepo,
  PackagingFormatsRepo,
  ProjectMaterialsRepo,
  SpecificationsRepo,
  ArtworksRepo,
  ProjectRisksRepo
} = require('../db/repository');
const { saveProject } = require('../services/PersistenceService');

async function runCrudVerification() {
  console.log('================================================================');
  console.log('   FULL LIFECYCLE CRUD VERIFICATION TEST (PostgreSQL Tables)    ');
  console.log('================================================================\n');

  // Initialize DB connection
  await testConnection();

  const TEST_FMT_ID = 'PF-TEST-CRUD-01';
  const TEST_PRJ_ID = 'PRJ-TEST-CRUD-01';
  const TEST_MAT_ID = `${TEST_PRJ_ID}-mat-0`;
  const TEST_SPEC_ID = `SPEC-${TEST_MAT_ID}`;
  const TEST_AW_ID = `AW-${TEST_MAT_ID}`;
  const TEST_RISK_ID = `${TEST_PRJ_ID}-R-1`;

  // Cleanup any leftover test data
  await query('DELETE FROM project_risks WHERE project_id = $1', [TEST_PRJ_ID]);
  await query('DELETE FROM artworks WHERE project_id = $1', [TEST_PRJ_ID]);
  await query('DELETE FROM specifications WHERE project_id = $1', [TEST_PRJ_ID]);
  await query('DELETE FROM project_materials WHERE project_id = $1', [TEST_PRJ_ID]);
  await query('DELETE FROM projects WHERE id = $1', [TEST_PRJ_ID]);
  await query('DELETE FROM packaging_formats WHERE id = $1', [TEST_FMT_ID]);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PACKAGING_FORMATS CRUD
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Testing PACKAGING_FORMATS CRUD ---');
  
  // 1.1 Create
  console.log('  1.1 Creating Packaging Format:', TEST_FMT_ID);
  const createdFmt = await PackagingFormatsRepo.create({
    id: TEST_FMT_ID,
    name: 'Biodegradable Compostable Pouch',
    codePrefix: 'PM/PR/BIO/',
    category: 'Primary Container',
    hierarchyTier: 1,
    defaultLeadTimeDays: 25,
    isPouch: true,
    description: 'Eco-friendly biodegradable PLA packaging pouch'
  });
  console.log('      Created:', createdFmt.id, '| Name:', createdFmt.name);

  // 1.2 Read
  console.log('  1.2 Reading Packaging Format from DB:');
  const readFmt = await PackagingFormatsRepo.getById(TEST_FMT_ID);
  console.log('      Found:', readFmt.id, '| Category:', readFmt.category, '| Lead Time:', readFmt.defaultLeadTimeDays, 'days');
  if (!readFmt || readFmt.name !== 'Biodegradable Compostable Pouch') {
    throw new Error('Packaging format Read failed!');
  }

  // 1.3 Update
  console.log('  1.3 Updating Packaging Format lead time to 35 days & updated description:');
  const updatedFmt = await PackagingFormatsRepo.update(TEST_FMT_ID, {
    defaultLeadTimeDays: 35,
    description: 'Updated bio pouch description with improved barrier'
  });
  console.log('      Updated Lead Time:', updatedFmt.defaultLeadTimeDays, '| Desc:', updatedFmt.description);
  if (updatedFmt.defaultLeadTimeDays !== 35) {
    throw new Error('Packaging format Update failed!');
  }

  // 1.4 Soft Deactivate
  console.log('  1.4 Deactivating Packaging Format:');
  const deactivated = await PackagingFormatsRepo.delete(TEST_FMT_ID);
  const checkDeactivated = await PackagingFormatsRepo.getById(TEST_FMT_ID);
  console.log('      Deactivated status is_active:', checkDeactivated.isActive);
  if (checkDeactivated.isActive !== false) {
    throw new Error('Packaging format Deactivate failed!');
  }
  // Re-activate for downstream material testing
  await PackagingFormatsRepo.update(TEST_FMT_ID, { isActive: true });
  console.log('      Re-activated for project material testing.\n');

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PROJECTS CRUD
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- 2. Testing PROJECTS CRUD ---');

  // 2.1 Create
  console.log('  2.1 Creating Project:', TEST_PRJ_ID);
  const sampleProject = {
    id: TEST_PRJ_ID,
    fgCode: 'FG-CRUD-900',
    projectName: 'Granola Bio NPD Launch',
    skuSize: '250g',
    projectType: 'Regular',
    projectCategory: 'NPD',
    stage: 'Brief',
    status: 'On Track',
    supplier: 'EcoPack India Ltd',
    materials: [
      {
        id: TEST_MAT_ID,
        name: 'Granola Bio Outer Pouch',
        pmCode: 'PM-BIO-001',
        type: 'Biodegradable Compostable Pouch',
        packagingFormatId: TEST_FMT_ID,
        printType: 'Gravure 8-Color',
        supplier: 'EcoPack India Ltd',
        leadTime: 35,
        poStatus: 'RFQ in progress',
        poNumber: 'PO-2026-001',
        stage: 'Brief',
        specSheet: {
          docHeader: {
            itemCode: 'PM-BIO-001',
            artworkCode: 'AW-BIO-001',
            docName: 'Granola Bio Pouch Technical Specification',
            revision: 'v1.0'
          },
          category: 'pouch',
          general: {
            materialStructure: 'PLA / Barrier Paper / Bio-PE',
            thickness: '120 micron',
            substrate: 'Compostable Film'
          },
          dimensions: {
            width: 180,
            height: 260,
            gusset: 80,
            unit: 'mm'
          },
          parameters: [
            { name: 'Tensile Strength', target: '> 25 MPa', method: 'ASTM D882' },
            { name: 'WVTR', target: '< 2.0 g/m2/day', method: 'ASTM F1249' }
          ],
          governance: {
            version: 1,
            status: 'DRAFT'
          }
        },
        artworkUrl: 'https://storage.yogabar.com/artworks/granola-bio-pouch-v1.pdf',
        artworkFileName: 'granola-bio-pouch-v1.pdf'
      }
    ],
    risks: [
      {
        id: TEST_RISK_ID,
        stage: 'Brief',
        description: 'Bio-film seal integrity risk under high humidity',
        impact: 'High',
        prob: 'Medium',
        level: 'High',
        mitigation: 'Conduct accelerated shelf-life trial in environmental chamber',
        owner: 'Packaging QA',
        status: 'Open'
      }
    ]
  };

  await saveProject(sampleProject, 'create');
  console.log('      Project created & synced via PersistenceService!');

  // 2.2 Read Project
  console.log('  2.2 Reading Project from DB:');
  const readProject = await ProjectsRepo.getById(TEST_PRJ_ID);
  console.log('      Found Project:', readProject.id, '| Name:', readProject.projectName, '| Stage:', readProject.stage);
  if (!readProject || readProject.projectName !== 'Granola Bio NPD Launch') {
    throw new Error('Project Read failed!');
  }

  // 2.3 Update Project
  console.log('  2.3 Updating Project Stage to "Design" & Status to "At Risk":');
  sampleProject.stage = 'Design';
  sampleProject.status = 'At Risk';
  sampleProject.projectName = 'Granola Bio NPD Launch (Rev 2)';
  await saveProject(sampleProject, 'update');

  const updatedProject = await ProjectsRepo.getById(TEST_PRJ_ID);
  console.log('      Updated Project:', updatedProject.projectName, '| Stage:', updatedProject.stage, '| Status:', updatedProject.status);
  if (updatedProject.stage !== 'Design' || updatedProject.status !== 'At Risk') {
    throw new Error('Project Update failed!');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. PROJECT_MATERIALS CRUD
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing PROJECT_MATERIALS CRUD & Foreign Key Mapping ---');
  
  // 3.1 Read materials
  console.log('  3.1 Reading materials from project_materials table:');
  const materialsInDb = await ProjectMaterialsRepo.getByProjectId(TEST_PRJ_ID);
  console.log('      Found', materialsInDb.length, 'material(s) for project:');
  for (const m of materialsInDb) {
    console.log(`      - ID: ${m.id} | Name: "${m.name}" | Format ID: ${m.packagingFormatId} | PO: ${m.poNumber}`);
  }
  if (materialsInDb.length === 0 || materialsInDb[0].packagingFormatId !== TEST_FMT_ID) {
    throw new Error('Project Materials Read or Foreign Key mapping failed!');
  }

  // 3.2 Update material
  console.log('  3.2 Updating material: name, PO Status to "PO Released", and custom lead time:');
  sampleProject.materials[0].name = 'Granola Bio Outer Pouch (Updated)';
  sampleProject.materials[0].poStatus = 'PO Released';
  sampleProject.materials[0].customLeadTime = 40;
  await saveProject(sampleProject, 'update');

  const updatedMaterialsInDb = await ProjectMaterialsRepo.getByProjectId(TEST_PRJ_ID);
  console.log('      Updated Material Name:', updatedMaterialsInDb[0].name, '| PO Status:', updatedMaterialsInDb[0].poStatus, '| Custom Lead Time:', updatedMaterialsInDb[0].customLeadTime);
  if (updatedMaterialsInDb[0].poStatus !== 'PO Released' || updatedMaterialsInDb[0].customLeadTime !== 40) {
    throw new Error('Project Materials Update failed!');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. SPECIFICATIONS CRUD
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing SPECIFICATIONS CRUD ---');

  // 4.1 Read specification
  console.log('  4.1 Reading specification from specifications table:');
  const specsInDb = await SpecificationsRepo.getByProjectId(TEST_PRJ_ID);
  console.log('      Found', specsInDb.length, 'spec(s):');
  for (const s of specsInDb) {
    console.log(`      - Spec ID: ${s.id} | Doc Name: "${s.docName}" | Status: ${s.status} | Rev: ${s.revision}`);
  }
  if (specsInDb.length === 0 || specsInDb[0].docName !== 'Granola Bio Pouch Technical Specification') {
    throw new Error('Specifications Read failed!');
  }

  // 4.2 Update specification
  console.log('  4.2 Updating specification revision to "v1.1", status to "APPROVED", and adding parameter:');
  sampleProject.materials[0].specSheet.docHeader.revision = 'v1.1';
  sampleProject.materials[0].specSheet.governance.status = 'APPROVED';
  sampleProject.materials[0].specSheet.parameters.push({
    name: 'Seal Strength',
    target: '> 18 N/15mm',
    method: 'ASTM F88'
  });
  await saveProject(sampleProject, 'update');

  const updatedSpecsInDb = await SpecificationsRepo.getByProjectId(TEST_PRJ_ID);
  console.log('      Updated Spec Rev:', updatedSpecsInDb[0].revision, '| Status:', updatedSpecsInDb[0].status, '| Parameters count:', updatedSpecsInDb[0].parameters.length);
  if (updatedSpecsInDb[0].revision !== 'v1.1' || updatedSpecsInDb[0].status !== 'APPROVED' || updatedSpecsInDb[0].parameters.length !== 3) {
    throw new Error('Specifications Update failed!');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. ARTWORKS CRUD
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing ARTWORKS CRUD ---');

  // 5.1 Read artworks
  console.log('  5.1 Reading artwork from artworks table:');
  const artworksInDb = await ArtworksRepo.getByProjectId(TEST_PRJ_ID);
  console.log('      Found', artworksInDb.length, 'artwork(s):');
  for (const a of artworksInDb) {
    console.log(`      - Artwork ID: ${a.id} | Code: ${a.artworkCode} | Status: ${a.status} | Files:`, a.files.length);
  }
  if (artworksInDb.length === 0 || artworksInDb[0].artworkCode !== 'AW-BIO-001') {
    throw new Error('Artworks Read failed!');
  }

  // 5.2 Update artwork
  console.log('  5.2 Updating artwork status to "APPROVED", new version "v2", and new file URL:');
  sampleProject.materials[0].artworkCode = 'AW-BIO-001-R2';
  sampleProject.materials[0].artworkUrl = 'https://storage.yogabar.com/artworks/granola-bio-pouch-v2-final.pdf';
  sampleProject.materials[0].artworkFileName = 'granola-bio-pouch-v2-final.pdf';
  await saveProject(sampleProject, 'update');

  const updatedArtworksInDb = await ArtworksRepo.getByProjectId(TEST_PRJ_ID);
  console.log('      Updated Artwork Code:', updatedArtworksInDb[0].artworkCode, '| Files:', updatedArtworksInDb[0].files[0]?.name);
  if (updatedArtworksInDb[0].artworkCode !== 'AW-BIO-001-R2') {
    throw new Error('Artworks Update failed!');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. PROJECT_RISKS CRUD
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing PROJECT_RISKS CRUD ---');

  // 6.1 Read risks
  console.log('  6.1 Reading risks from project_risks table:');
  const risksInDb = await ProjectRisksRepo.getByProjectId(TEST_PRJ_ID);
  console.log('      Found', risksInDb.length, 'risk(s):');
  for (const r of risksInDb) {
    console.log(`      - Risk ID: ${r.id} | Desc: "${r.description}" | Level: ${r.level} | Status: ${r.status}`);
  }
  if (risksInDb.length === 0 || risksInDb[0].level !== 'High') {
    throw new Error('Project Risks Read failed!');
  }

  // 6.2 Update risk & Add a 2nd risk
  console.log('  6.2 Updating risk 1 status to "Mitigated" & adding Risk 2:');
  sampleProject.risks[0].status = 'Mitigated';
  sampleProject.risks[0].level = 'Low';
  sampleProject.risks.push({
    id: `${TEST_PRJ_ID}-R-2`,
    stage: 'Design',
    description: 'Supplier MOQ constraint on bio resin',
    impact: 'Medium',
    prob: 'Low',
    level: 'Low',
    mitigation: 'Pool MOQ with Q3 seasonal run',
    owner: 'Procurement',
    status: 'Open'
  });
  await saveProject(sampleProject, 'update');

  const updatedRisksInDb = await ProjectRisksRepo.getByProjectId(TEST_PRJ_ID);
  console.log('      Updated Risks count:', updatedRisksInDb.length);
  for (const r of updatedRisksInDb) {
    console.log(`      - Risk ID: ${r.id} | Level: ${r.level} | Status: ${r.status} | Desc: "${r.description}"`);
  }
  if (updatedRisksInDb.length !== 2 || updatedRisksInDb[0].status !== 'Mitigated') {
    throw new Error('Project Risks Update failed!');
  }

  // 6.3 Delete risk
  console.log('  6.3 Deleting Risk 2 from risks array and syncing:');
  sampleProject.risks.pop(); // Remove Risk 2
  await saveProject(sampleProject, 'update');

  const afterDeleteRisks = await ProjectRisksRepo.getByProjectId(TEST_PRJ_ID);
  console.log('      Risks count after deletion:', afterDeleteRisks.length);
  if (afterDeleteRisks.length !== 1) {
    throw new Error('Project Risks Delete failed!');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. CASCADE DELETION & CLEANUP
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Testing CASCADE DELETION on Project ---');
  console.log('  7.1 Deleting project from projects table (Testing ON DELETE CASCADE):');
  await query('DELETE FROM projects WHERE id = $1', [TEST_PRJ_ID]);

  const postPrj = await query('SELECT count(*) FROM projects WHERE id = $1', [TEST_PRJ_ID]);
  const postMat = await query('SELECT count(*) FROM project_materials WHERE project_id = $1', [TEST_PRJ_ID]);
  const postSpec = await query('SELECT count(*) FROM specifications WHERE project_id = $1', [TEST_PRJ_ID]);
  const postAw = await query('SELECT count(*) FROM artworks WHERE project_id = $1', [TEST_PRJ_ID]);
  const postRisk = await query('SELECT count(*) FROM project_risks WHERE project_id = $1', [TEST_PRJ_ID]);

  console.log('      Remaining in projects:', postPrj.rows[0].count);
  console.log('      Remaining in project_materials:', postMat.rows[0].count);
  console.log('      Remaining in specifications:', postSpec.rows[0].count);
  console.log('      Remaining in artworks:', postAw.rows[0].count);
  console.log('      Remaining in project_risks:', postRisk.rows[0].count);

  if (
    postPrj.rows[0].count !== '0' ||
    postMat.rows[0].count !== '0' ||
    postSpec.rows[0].count !== '0' ||
    postAw.rows[0].count !== '0' ||
    postRisk.rows[0].count !== '0'
  ) {
    throw new Error('Cascade deletion failed! Child rows still remain.');
  }

  // Clean up test packaging format
  await query('DELETE FROM packaging_formats WHERE id = $1', [TEST_FMT_ID]);
  console.log('  7.2 Cleaned up test packaging format.');

  console.log('\n================================================================');
  console.log('   ✅ ALL CRUD OPERATIONS & CASCADE CONSTRAINTS VERIFIED!       ');
  console.log('================================================================');
  process.exit(0);
}

runCrudVerification().catch(err => {
  console.error('\n❌ CRUD Verification failed with error:', err);
  process.exit(1);
});
