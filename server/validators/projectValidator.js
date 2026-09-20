'use strict';
/**
 * projectValidator.js — Pure input validation for project operations.
 *
 * All validators return { valid: boolean, errors: string[] }.
 * They are pure functions with no side effects — easily unit-testable.
 */

/**
 * Validate the body for POST /api/projects (create).
 * @param {object} body - req.body
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCreateProject(body) {
  const errors = [];
  const { projectName, briefDate, materials } = body || {};

  if (!projectName || !briefDate || !materials || !Array.isArray(materials) || materials.length === 0) {
    errors.push('projectName, briefDate, and at least 1 material required');
  } else {
    if (typeof projectName !== 'string' || !projectName.trim()) {
      errors.push('projectName is required and must be a non-empty string');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(briefDate)) {
      errors.push('briefDate must be in YYYY-MM-DD format');
    }
    materials.forEach((m, i) => {
      if (!m.name || typeof m.name !== 'string' || !m.name.trim()) {
        errors.push(`materials[${i}].name is required`);
      }
      if (!m.type) {
        errors.push(`materials[${i}].type is required`);
      }
    });
  }

  if (body.targetLaunchDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.targetLaunchDate)) {
    errors.push('targetLaunchDate must be in YYYY-MM-DD format');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate the body for PUT /api/projects/:id (update).
 * All fields are optional on update — only validate what is present.
 * @param {object} body - req.body
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateUpdateProject(body) {
  const errors = [];
  const { projectName, briefDate, targetLaunchDate, materials } = body || {};

  if (projectName !== undefined && (typeof projectName !== 'string' || !projectName.trim())) {
    errors.push('projectName must be a non-empty string if provided');
  }

  if (briefDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(briefDate)) {
    errors.push('briefDate must be in YYYY-MM-DD format');
  }

  if (targetLaunchDate !== undefined && targetLaunchDate !== null &&
      !/^\d{4}-\d{2}-\d{2}$/.test(targetLaunchDate)) {
    errors.push('targetLaunchDate must be in YYYY-MM-DD format');
  }

  if (materials !== undefined) {
    if (!Array.isArray(materials) || materials.length === 0) {
      errors.push('materials must be a non-empty array if provided');
    } else {
      materials.forEach((m, i) => {
        if (!m.name || typeof m.name !== 'string' || !m.name.trim()) {
          errors.push(`materials[${i}].name is required`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a date string for endpoint bodies that accept a single date.
 * @param {string} date - Date string to validate
 * @param {string} [fieldName='date'] - Field name for error messages
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDate(date, fieldName = 'date') {
  const errors = [];
  if (!date) {
    errors.push(`${fieldName} is required`);
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push(`${fieldName} must be in YYYY-MM-DD format`);
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateProject, validateUpdateProject, validateDate };
