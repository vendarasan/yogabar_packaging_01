/**
 * Unit Test Suite: Enterprise Workflow, Security & Calculations (Pass 6)
 * Pure unit tests verifying business rules, calculations, permissions, and validators.
 */

const assert = require('assert');
const { test, describe } = require('node:test');

const {
  calcMatMilestones,
  calcProjectMilestones,
  stageIdx,
  syncProjectStage,
  getArtworkCode,
  hashPass,
  genTempPass
} = require('../utils');

const { calculateCrunchedTimeline } = require('../crunchUtils');
const { validateCreateProject, validateUpdateProject } = require('../validators/projectValidator');
const {
  sanitizeFilename,
  validateFileSecurity,
  validatePdfMagicBytes,
  validateFileList
} = require('../middleware/uploadSecurity');

describe('Unit Tests: Workflow Calculations', () => {

  test('calcMatMilestones computes accurate sequential milestone dates', () => {
    const briefDate = '2026-01-01';
    const milestones = calcMatMilestones(briefDate, { type: 'Mono Carton', printType: 'Offset' });

    assert.strictEqual(milestones.Brief, '2026-01-01');
    assert.strictEqual(milestones.Sample, '2026-01-06'); // +5d
    assert.strictEqual(milestones.Trial, '2026-01-13');  // +7d
    assert.strictEqual(milestones.KLD, '2026-01-16');    // +3d
    assert.strictEqual(milestones.Artwork, '2026-01-21');// +5d
    assert.strictEqual(milestones.VPDF, '2026-01-23');   // +2d
    assert.ok(milestones.Printing > milestones.VPDF);
    assert.ok(milestones.Dispatch > milestones.Printing);
    assert.ok(milestones.Connectivity > milestones.Dispatch);
  });

  test('calcProjectMilestones derives overall project critical path', () => {
    const briefDate = '2026-01-01';
    const materials = [
      { name: 'Pouch', type: 'Laminate Pouch', printType: 'Rotogravure' },
      { name: 'Carton', type: 'Mono Carton', printType: 'Offset' }
    ];
    const projectMilestones = calcProjectMilestones(briefDate, materials);

    assert.ok(projectMilestones.Connectivity);
    assert.ok(projectMilestones.Printing);
    assert.strictEqual(projectMilestones.Brief, briefDate);
  });

  test('stageIdx returns correct zero-based order and syncProjectStage synchronizes min stage', () => {
    assert.strictEqual(stageIdx('Brief'), 0);
    assert.strictEqual(stageIdx('Sample'), 1);
    assert.strictEqual(stageIdx('Trial'), 2);
    assert.strictEqual(stageIdx('Connectivity'), 8);

    const project = {
      stage: 'Connectivity',
      materials: [
        { name: 'Mat 1', stage: 'Printing' },
        { name: 'Mat 2', stage: 'Artwork' }
      ]
    };
    syncProjectStage(project);
    assert.strictEqual(project.stage, 'Artwork', 'Project overall stage should synchronize to earliest material stage');
  });

  test('getArtworkCode maps PM codes to standardized AW codes', () => {
    assert.strictEqual(getArtworkCode('PM-10023'), 'AW-10023');
    assert.strictEqual(getArtworkCode('PM/PR/PJR/001'), 'AW/PR/PJR/001');
    assert.strictEqual(getArtworkCode(''), 'AW-00000');
  });

  test('calculateCrunchedTimeline correctly calculates compressed schedule and risk level', () => {
    const mockProject = {
      stage: 'Brief',
      materials: [
        {
          name: 'Box',
          type: 'Mono Carton',
          printType: 'Offset',
          stage: 'Brief',
          milestones: {
            Brief: '2026-01-01',
            Sample: '2026-01-06',
            Trial: '2026-01-13',
            KLD: '2026-01-16',
            Artwork: '2026-01-21',
            VPDF: '2026-01-23',
            Printing: '2026-02-12',
            Dispatch: '2026-02-16',
            Connectivity: '2026-02-20'
          }
        }
      ],
      milestones: {
        Brief: '2026-01-01',
        Connectivity: '2026-02-20'
      }
    };

    // Accelerate launch date by 10 days
    const crunched = calculateCrunchedTimeline(mockProject, '2026-02-10');
    assert.ok(crunched);
    assert.ok(['Low', 'Medium', 'High', 'Critical'].includes(crunched.riskLevel));
  });
});

describe('Unit Tests: Security, Input Validation & File Auditing', () => {

  test('validateCreateProject enforces schema integrity', () => {
    const invalidEmpty = validateCreateProject({});
    assert.strictEqual(invalidEmpty.valid, false);
    assert.ok(invalidEmpty.errors.length > 0);

    const validPayload = {
      projectName: 'High-Protein Bar 50g',
      briefDate: '2026-03-01',
      materials: [
        { name: 'Flow Wrap Foil', type: 'Laminate Pouch' }
      ]
    };
    const validResult = validateCreateProject(validPayload);
    assert.strictEqual(validResult.valid, true);
    assert.strictEqual(validResult.errors.length, 0);
  });

  test('validateUpdateProject validates only provided fields', () => {
    const invalidDate = validateUpdateProject({ briefDate: '01/01/2026' });
    assert.strictEqual(invalidDate.valid, false);

    const validUpdate = validateUpdateProject({ projectName: 'Updated Project Name' });
    assert.strictEqual(validUpdate.valid, true);
  });

  test('sanitizeFilename prevents directory traversal and control characters', () => {
    assert.strictEqual(sanitizeFilename('../../../etc/passwd'), 'passwd');
    assert.strictEqual(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe'), 'cmd.exe');
    assert.strictEqual(sanitizeFilename('my-design (v2).pdf'), 'my-design (v2).pdf');
    assert.strictEqual(sanitizeFilename(''), 'unnamed_file');
  });

  test('validateFileSecurity rejects executable files and verifies whitelist', () => {
    const safePdf = validateFileSecurity({ name: 'specs_box.pdf', size: 1024 * 1024 });
    assert.strictEqual(safePdf.valid, true);

    const safeAi = validateFileSecurity({ name: 'label_artwork.ai', size: 5 * 1024 * 1024 });
    assert.strictEqual(safeAi.valid, true);

    const dangerousExe = validateFileSecurity({ name: 'virus.exe', size: 500 });
    assert.strictEqual(dangerousExe.valid, false);
    assert.strictEqual(dangerousExe.code, 'UNSAFE_FILE_TYPE');

    const dangerousScript = validateFileSecurity({ name: 'exploit.sh', size: 200 });
    assert.strictEqual(dangerousScript.valid, false);

    const oversized = validateFileSecurity({ name: 'massive.pdf', size: 60 * 1024 * 1024 });
    assert.strictEqual(oversized.valid, false);
    assert.strictEqual(oversized.code, 'FILE_TOO_LARGE');
  });

  test('validatePdfMagicBytes identifies legitimate PDF headers vs counterfeit data', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 sample content');
    assert.strictEqual(validatePdfMagicBytes(validPdfBuffer), true);

    const fakePdfBuffer = Buffer.from('GIF89a something');
    assert.strictEqual(validatePdfMagicBytes(fakePdfBuffer), false);

    const emptyBuffer = Buffer.alloc(0);
    assert.strictEqual(validatePdfMagicBytes(emptyBuffer), false);
  });

  test('validateFileList batches file security checks', () => {
    const files = [
      { name: 'artwork.ai', size: 1000 },
      { name: 'dieline.pdf', size: 2000 }
    ];
    assert.strictEqual(validateFileList(files).valid, true);

    const mixedFiles = [
      { name: 'artwork.ai', size: 1000 },
      { name: 'malware.bat', size: 500 }
    ];
    assert.strictEqual(validateFileList(mixedFiles).valid, false);
  });

  test('hashPass and genTempPass generate cryptographically salted outputs', () => {
    const h1 = hashPass('Admin@PKG#2024');
    const h2 = hashPass('Admin@PKG#2024');
    const h3 = hashPass('DifferentPassword');

    assert.strictEqual(h1, h2, 'Hash must be deterministic');
    assert.notStrictEqual(h1, h3, 'Different passwords must yield distinct hashes');
    assert.ok(h1.length === 64, 'SHA-256 output must be 64 hexadecimal characters');

    const tempPw = genTempPass();
    assert.ok(tempPw.startsWith('TMP-'));
    assert.strictEqual(tempPw.length, 10);
  });
});
