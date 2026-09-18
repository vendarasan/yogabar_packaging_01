import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  resolveVariantArtworkFiles,
  normalizeVariants,
  getArtworkCode,
  getSpecStatus
} from '../src/utils.js';

describe('Specification & Variant Artwork Resolver Engine', () => {
  test('getArtworkCode — Converts various PM code formats to standard AW codes', () => {
    assert.strictEqual(getArtworkCode('PM-50670'), 'AW-50670');
    assert.strictEqual(getArtworkCode('pm_90210'), 'AW-90210');
    assert.strictEqual(getArtworkCode('PM/PR/FLM/12838'), 'AW/PR/FLM/12838');
    assert.strictEqual(getArtworkCode('PM12345'), 'AW-12345');
    assert.strictEqual(getArtworkCode('50670'), 'AW-50670');
    assert.strictEqual(getArtworkCode(''), 'AW-00000');
    assert.strictEqual(getArtworkCode(null), 'AW-00000');
    assert.strictEqual(getArtworkCode(undefined), 'AW-00000');
  });

  test('resolveVariantArtworkFiles — Variant with its own artworkFiles returns them directly', () => {
    const variant = {
      variantName: 'Dark Chocolate 725g',
      artworkFiles: [
        { name: 'Dark_Choc_AW.pdf', url: 'data:pdf;base64,abc', type: 'application/pdf' }
      ]
    };

    const resolved = resolveVariantArtworkFiles(variant, [{ name: 'Parent.pdf' }]);
    assert.strictEqual(resolved.length, 1);
    assert.strictEqual(resolved[0].name, 'Dark_Choc_AW.pdf');
  });

  test('resolveVariantArtworkFiles — Respects hasRemovedArtwork flag and prevents fallback resurrection', () => {
    const variant = {
      variantName: 'Sugar Free 725g',
      artworkFiles: [],
      hasRemovedArtwork: true // Explicitly removed by user
    };
    const parentFiles = [{ name: 'Parent_Fallback_Art.pdf', url: 'https://example.com/art.pdf' }];
    const material = { artworkFiles: [{ name: 'Material_Art.pdf' }] };

    const resolved = resolveVariantArtworkFiles(variant, parentFiles, material);
    assert.strictEqual(resolved.length, 0, 'Must not inherit parent/material files if hasRemovedArtwork is true');
  });

  test('resolveVariantArtworkFiles — Falls back along hierarchy: variantUrl -> parentFiles -> specSheet -> material', () => {
    // Level 1: variant artworkUrl fallback
    const variantWithUrl = { variantName: 'Almond', artworkUrl: 'https://example.com/almond.png' };
    const res1 = resolveVariantArtworkFiles(variantWithUrl);
    assert.strictEqual(res1.length, 1);
    assert.strictEqual(res1[0].url, 'https://example.com/almond.png');

    // Level 2: parent artworkFiles fallback
    const variantEmpty = { variantName: 'Plain' };
    const parentFiles = [{ name: 'Parent.pdf', url: 'https://example.com/parent.pdf' }];
    const res2 = resolveVariantArtworkFiles(variantEmpty, parentFiles);
    assert.strictEqual(res2.length, 1);
    assert.strictEqual(res2[0].name, 'Parent.pdf');

    // Level 3: specSheet artworkFiles fallback
    const specSheet = { artworkFiles: [{ name: 'SpecSheetArt.pdf', url: 'https://example.com/spec.pdf' }] };
    const res3 = resolveVariantArtworkFiles(variantEmpty, [], {}, specSheet);
    assert.strictEqual(res3.length, 1);
    assert.strictEqual(res3[0].name, 'SpecSheetArt.pdf');

    // Level 4: material artworkFiles fallback
    const material = { artworkFiles: [{ name: 'MatArt.pdf', url: 'https://example.com/mat.pdf' }] };
    const res4 = resolveVariantArtworkFiles(variantEmpty, [], material, {});
    assert.strictEqual(res4.length, 1);
    assert.strictEqual(res4[0].name, 'MatArt.pdf');
  });

  test('normalizeVariants — Generates default standard variant if rawVariants is empty', () => {
    const normalized = normalizeVariants([], 'PM-90210', 'Granola Pouch', 'AW-90210', '400g');
    assert.strictEqual(normalized.length, 1);
    assert.strictEqual(normalized[0].itemCode, 'PM-90210');
    assert.strictEqual(normalized[0].artworkCode, 'AW-90210');
    assert.strictEqual(normalized[0].netWeight, '400g');
    assert.strictEqual(normalized[0].variantName, 'Granola Pouch');
  });

  test('normalizeVariants — Preserves variant attributes and correctly normalizes artwork codes', () => {
    const raw = [
      { name: 'Vanilla', itemCode: 'PM-101', barcode: '8901234567890' },
      { name: 'Chocolate', code: 'PM-102', pantoneColors: ['Pantone 469 C'] }
    ];

    const normalized = normalizeVariants(raw, 'PM-DEFAULT', 'Master SKU', 'AW-DEFAULT', '50g');
    assert.strictEqual(normalized.length, 2);
    assert.strictEqual(normalized[0].variantName, 'Vanilla');
    assert.strictEqual(normalized[0].artworkCode, 'AW-101');
    assert.strictEqual(normalized[0].barcode, '8901234567890');

    assert.strictEqual(normalized[1].variantName, 'Chocolate');
    assert.strictEqual(normalized[1].artworkCode, 'AW-102');
    assert.deepStrictEqual(normalized[1].pantoneColors, ['Pantone 469 C']);
  });

  test('getSpecStatus — Accurately returns governance status for spec sheets', () => {
    assert.strictEqual(getSpecStatus(null), 'NO_SPEC');
    assert.strictEqual(getSpecStatus({}), 'NO_SPEC');
    assert.strictEqual(getSpecStatus({ specSheet: {} }), 'NO_SPEC');

    const draftMat = {
      specSheet: {
        docHeader: { itemCode: 'PM-101' },
        governance: { status: 'DRAFT' }
      }
    };
    assert.strictEqual(getSpecStatus(draftMat), 'DRAFT');

    const approvedMat = {
      specSheet: {
        docHeader: { itemCode: 'PM-101' },
        governance: { status: 'APPROVED' }
      }
    };
    assert.strictEqual(getSpecStatus(approvedMat), 'APPROVED');

    const pendingCheckMat = {
      specSheet: {
        docHeader: { itemCode: 'PM-101' },
        governance: { status: 'CHECKED_PENDING_APPROVAL' }
      }
    };
    assert.strictEqual(getSpecStatus(pendingCheckMat), 'CHECKED_PENDING_APPROVAL');
  });
});
