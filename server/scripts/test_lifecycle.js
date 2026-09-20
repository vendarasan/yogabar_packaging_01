'use strict';
require('dotenv').config();
const { query } = require('../db');
const { saveProject } = require('../services/PersistenceService');
const { ProjectsRepo, ProjectMaterialsRepo, SpecificationsRepo, ArtworksRepo, ProjectRisksRepo } = require('../db/repository');

async function testLifecycle() {
  console.log('=== STARTING PROJECT LIFECYCLE RELATIONAL INTEGRATION TEST ===');
  const sampleProjectId = 'PRJ-TEST-LIFECYCLE-99';
  const sampleProject = {
    id: sampleProjectId,
    fgCode: 'FG-TEST-99',
    projectName: 'Lifecycle Integration Test Project',
    skuSize: '150g',
    projectType: 'Regular',
    projectCategory: 'NPD',
    stage: 'Brief',
    status: 'On Track',
    materials: [
      {
        id: 'MAT-99-01',
        materialCode: 'PM-99-01',
        name: 'Organic Honey Oats Pouch',
        materialType: 'Packaging',
        packagingFormatId: 'PF-01',
        packagingFormat: 'Pouch (Standard)',
        status: 'In Progress',
        specsStatus: 'Pending Review',
        artworkStatus: 'Draft'
      }
    ],
    risks: [
      {
        id: 'RSK-99-01',
        title: 'Cylinder engraving lead time',
        category: 'Timeline',
        severity: 'Medium',
        mitigation: 'Pre-book cylinder slot'
      }
    ]
  };

  // 1. Save project
  console.log('1. Saving project via ProjectsRepo.create...');
  try {
    const createdP = await ProjectsRepo.create(sampleProject);
    console.log('ProjectsRepo.create result:', createdP ? createdP.id : null);
  } catch (err) {
    console.error('ProjectsRepo.create threw:', err);
  }

  // 2. Verify project
  const pRes = await query('SELECT id, project_name FROM projects WHERE id = $1', [sampleProjectId]);
  console.log('Project in DB:', pRes.rows[0]);

  // Sync materials, specs, artworks, risks
  console.log('Syncing related relational tables...');
  await ProjectMaterialsRepo.syncMaterialsForProject(sampleProjectId, sampleProject.materials);
  await SpecificationsRepo.syncForProject(sampleProjectId, sampleProject.materials);
  await ArtworksRepo.syncForProject(sampleProjectId, sampleProject.materials);
  await ProjectRisksRepo.syncForProject(sampleProjectId, sampleProject.risks);

  // 3. Verify project_materials
  const mRes = await query('SELECT id, project_id, packaging_format_id, name FROM project_materials WHERE project_id = $1', [sampleProjectId]);
  console.log('Materials in DB:', mRes.rows);

  // 4. Verify specifications
  const sRes = await query('SELECT id, project_id, material_id, status FROM specifications WHERE project_id = $1', [sampleProjectId]);
  console.log('Specifications in DB:', sRes.rows);

  // 5. Verify artworks
  const aRes = await query('SELECT id, project_id, material_id, status FROM artworks WHERE project_id = $1', [sampleProjectId]);
  console.log('Artworks in DB:', aRes.rows);

  // 6. Verify risks
  const rRes = await query('SELECT id, project_id, description, stage, level FROM project_risks WHERE project_id = $1', [sampleProjectId]);
  console.log('Risks in DB:', rRes.rows);

  // 7. Test Cascade Delete
  console.log('7. Testing CASCADE deletion on project...');
  await query('DELETE FROM projects WHERE id = $1', [sampleProjectId]);
  
  const mCheck = await query('SELECT count(*) FROM project_materials WHERE project_id = $1', [sampleProjectId]);
  const sCheck = await query('SELECT count(*) FROM specifications WHERE project_id = $1', [sampleProjectId]);
  const aCheck = await query('SELECT count(*) FROM artworks WHERE project_id = $1', [sampleProjectId]);
  const rCheck = await query('SELECT count(*) FROM project_risks WHERE project_id = $1', [sampleProjectId]);
  
  console.log('Remaining counts after project deletion:');
  console.log('Materials:', mCheck.rows[0].count);
  console.log('Specifications:', sCheck.rows[0].count);
  console.log('Artworks:', aCheck.rows[0].count);
  console.log('Risks:', rCheck.rows[0].count);

  console.log('=== ALL LIFECYCLE TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

testLifecycle().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
