'use strict';
/**
 * uploadSecurity.js — Enterprise File Upload Security Validator.
 *
 * Implements Pass 6 File Upload Security Standards:
 *  - File extension whitelist (packaging artwork, engineering specs, docs)
 *  - Executable / script extension blacklist
 *  - Filename sanitization (mitigates path traversal attacks)
 *  - File size limits (max 50MB)
 *  - Magic byte validation for PDFs (%PDF-)
 */

const path = require('path');
const { AppError } = require('./errorHandler');

// Allowed packaging document and artwork extensions
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.ai', '.psd', '.png', '.jpg', '.jpeg', '.tiff', '.tif',
  '.cdr', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt'
]);

// Dangerous executable and script extensions that must always be blocked
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.sh', '.bat', '.cmd', '.vbs', '.vbe', '.js', '.mjs',
  '.php', '.jsp', '.asp', '.aspx', '.py', '.rb', '.pl',
  '.html', '.htm', '.xhtml', '.svg', '.jar', '.war', '.msi',
  '.scr', '.pif', '.hta', '.cpl', '.reg', '.wsf', '.ps1'
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Sanitize a filename, stripping directory traversal sequences, path separators,
 * control characters, and null bytes.
 *
 * @param {string} rawName - User-provided filename
 * @returns {string} Safe filename
 */
function sanitizeFilename(rawName) {
  if (typeof rawName !== 'string' || !rawName.trim()) {
    return 'unnamed_file';
  }

  // 1. Extract base name to remove any path prefixes
  let safe = path.basename(rawName.trim());

  // 2. Remove null bytes and control characters
  safe = safe.replace(/[\x00-\x1F\x7F]/g, '');

  // 3. Remove traversal attempts (../, ..\, etc.)
  safe = safe.replace(/\.\.+/g, '.');

  // 4. Replace path separators if any remain
  safe = safe.replace(/[\\/:\*\?"<>\|]/g, '_');

  // 5. Trim leading/trailing dots or spaces
  safe = safe.replace(/^[\.\s]+|[\.\s]+$/g, '');

  return safe || 'unnamed_file';
}

/**
 * Validate an uploaded file object or payload.
 *
 * @param {object} file - File metadata { name, size, data, ... }
 * @returns {{ valid: boolean, file?: object, error?: string, code?: string }}
 */
function validateFileSecurity(file) {
  if (!file || typeof file !== 'object') {
    return { valid: false, error: 'File object is required', code: 'INVALID_FILE_OBJECT' };
  }

  const rawName = file.name || file.fileName || '';
  if (!rawName) {
    return { valid: false, error: 'Filename is required', code: 'MISSING_FILENAME' };
  }

  const cleanName = sanitizeFilename(rawName);
  const ext = path.extname(cleanName).toLowerCase();

  // 1. Blacklist check
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File upload rejected: '${ext}' is an unsafe executable or script file extension.`,
      code: 'UNSAFE_FILE_TYPE'
    };
  }

  // 2. Whitelist check (if extension present)
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File format '${ext}' is not supported. Allowed formats: PDF, AI, PSD, PNG, JPG, TIFF, CDR, DOCX, XLSX.`,
      code: 'UNSUPPORTED_FILE_TYPE'
    };
  }

  // 3. Size check
  const size = Number(file.size || 0);
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File exceeds the maximum allowable size of 50MB (received: ${(size / 1024 / 1024).toFixed(1)}MB).`,
      code: 'FILE_TOO_LARGE'
    };
  }

  return {
    valid: true,
    file: {
      ...file,
      name: cleanName,
      fileName: cleanName,
      extension: ext,
      sanitized: true
    }
  };
}

/**
 * Verify that a buffer begins with PDF magic bytes (%PDF-).
 *
 * @param {Buffer} buffer - Buffer to check
 * @returns {boolean} True if buffer contains valid PDF magic bytes
 */
function validatePdfMagicBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) {
    return false;
  }

  // Check %PDF- (0x25 0x50 0x44 0x46 0x2D)
  const header = buffer.subarray(0, 5).toString('ascii');
  return header.startsWith('%PDF-');
}

/**
 * Validate an array of artwork or specification files.
 *
 * @param {Array} files - Array of file objects
 * @returns {{ valid: boolean, files?: Array, error?: string, code?: string }}
 */
function validateFileList(files) {
  if (!Array.isArray(files)) return { valid: true, files: [] };
  const validated = [];
  for (const f of files) {
    const check = validateFileSecurity(f);
    if (!check.valid) {
      return check;
    }
    validated.push(check.file);
  }
  return { valid: true, files: validated };
}

module.exports = {
  sanitizeFilename,
  validateFileSecurity,
  validatePdfMagicBytes,
  validateFileList,
  ALLOWED_EXTENSIONS,
  DANGEROUS_EXTENSIONS,
  MAX_FILE_SIZE_BYTES
};
