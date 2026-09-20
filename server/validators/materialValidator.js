'use strict';
/**
 * materialValidator.js — Pure input validation for material operations.
 *
 * All validators return { valid: boolean, errors: string[] }.
 * They are pure functions with no side effects — easily unit-testable.
 */

const VALID_PO_STATUSES = [
  'RFQ in progress',
  'RFQ Shared',
  'RFQ Approved',
  'PO Pending',
  'Raised'
];

/**
 * Validate a single material object for creation/update.
 * @param {object} material
 * @param {number} [index] - Optional index for error messages
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateMaterial(material, index) {
  const errors = [];
  const prefix = index !== undefined ? `materials[${index}]` : 'material';

  if (!material || typeof material !== 'object') {
    return { valid: false, errors: [`${prefix} must be an object`] };
  }

  if (!material.name || typeof material.name !== 'string' || !material.name.trim()) {
    errors.push(`${prefix}.name is required and must be a non-empty string`);
  }

  if (!material.type) {
    errors.push(`${prefix}.type is required`);
  }

  if (material.poStatus !== undefined && !VALID_PO_STATUSES.includes(material.poStatus)) {
    errors.push(`${prefix}.poStatus must be one of: ${VALID_PO_STATUSES.join(', ')}`);
  }

  if (material.briefDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(material.briefDate)) {
    errors.push(`${prefix}.briefDate must be in YYYY-MM-DD format`);
  }

  if (material.customLeadTime !== undefined && material.customLeadTime !== null &&
      material.customLeadTime !== '') {
    const val = parseInt(material.customLeadTime, 10);
    if (isNaN(val) || val < 1 || val > 365) {
      errors.push(`${prefix}.customLeadTime must be an integer between 1 and 365`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate artwork file data for upload.
 * @param {object} fileData - { fileName, fileUrl, fileType, fileSize? }
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateArtwork(fileData) {
  const errors = [];

  if (!fileData || typeof fileData !== 'object') {
    return { valid: false, errors: ['fileData must be an object'] };
  }

  if (!fileData.fileName && !fileData.fileUrl && !fileData.data) {
    errors.push('Artwork must have at least one of: fileName, fileUrl, or data');
  }

  if (fileData.fileSize && fileData.fileSize > 50 * 1024 * 1024) {
    errors.push('Artwork file size must not exceed 50MB');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a PO status value.
 * @param {string} poStatus
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePoStatus(poStatus) {
  const errors = [];
  if (!poStatus) {
    errors.push('poStatus is required');
  } else if (!VALID_PO_STATUSES.includes(poStatus)) {
    errors.push(`poStatus must be one of: ${VALID_PO_STATUSES.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateMaterial,
  validateArtwork,
  validatePoStatus,
  VALID_PO_STATUSES
};
