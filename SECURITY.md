# Enterprise Security Policy & Architecture

This document establishes the security standards, threat model mitigations, and compliance architecture implemented across the Packaging Development Platform (Pass 6 Enterprise Hardening).

---

## 1. Authentication Security

- **Password Storage**: Passwords are never stored in plaintext. Passwords are cryptographically salted and hashed using cryptographic one-way hashing (`crypto.pbkdf2Sync` with 10,000 iterations and 64-byte keys).
- **Session Management**: 
  - Sessions are managed via random UUID v4 cryptographically generated session tokens stored server-side.
  - Session tokens are transmitted via HTTP-only, SameSite cookies (`pkg_session`).
  - Cookie security flags:
    - `httpOnly: true` (prevents malicious client-side scripts and XSS from reading the session token)
    - `sameSite: 'lax'` (prevents Cross-Site Request Forgery / CSRF in cross-site navigations)
    - `secure: true` in production (enforced over HTTPS)
    - Expiration: 7 days with sliding refresh.
- **Brute Force & Rate Limiting**:
  - Sliding-window rate limiter implemented in `server/middleware/rateLimiter.js`.
  - Authentication endpoints (`/api/auth/login`, `/api/auth/signup`, `/api/auth/forgot-password`) are strictly rate-limited to **15 requests per minute** per client IP.
  - Exceeding limits results in standard HTTP `429 Too Many Requests` with a `Retry-After` header.

---

## 2. Server-Side Authorization (RBAC)

The platform enforces strict, authoritative server-side role-based access control. Frontend UI hiding is treated purely as user convenience; every single API endpoint executes server-side validation.

| Role | Permissions |
|---|---|
| **`superadmin`** | Full system control: Project hard delete, Head of Packaging final spec approvals, user management, system settings. |
| **`admin`** | Project creation, project full update, project manager check & sign-off, crunched timeline stage 1 approval, project restore, user approvals. |
| **`updater`** | Material status advancement, specification sheet updates, artwork uploads, PM code assignment, supplier assignment. |
| **`viewer` / Unauthenticated** | Read-only access to approved projects and materials; all mutating actions (`POST`, `PUT`, `PATCH`, `DELETE`) are rejected with `403 Forbidden`. |

---

## 3. Input Validation & Injection Protection

- **SQL Injection**: All database queries through PostgreSQL use parameterized SQL statements (`$1, $2, ...`), completely eliminating raw query string interpolation risks.
- **Cross-Site Scripting (XSS)**: Input payloads are sanitized before insertion and rendered securely via React DOM escaping.
- **Path Traversal**: Filenames in upload routes are passed through `sanitizeFilename()` which strips directory navigation sequences (`../`, `..\`, null bytes, control characters).

---

## 4. File Upload Security

Packaging artworks, die-lines, and technical specifications are subject to multi-stage upload auditing:

1. **Size Enforcement**: Strict 50MB payload limit on all uploaded files.
2. **Extension Whitelist**: Only approved packaging and design extensions are accepted:
   - Packaging Assets: `.pdf`, `.ai`, `.psd`, `.cdr`, `.eps`, `.tiff`, `.tif`, `.png`, `.jpg`, `.jpeg`, `.webp`
   - Technical Documents: `.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`, `.txt`
3. **Blacklist of Executable & Dangerous Formats**: Explicit rejection of `.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.js`, `.vbs`, `.php`, `.jsp`, `.asp`, `.py`, `.html`, `.svg`, `.jar`.
4. **Magic Byte Verification**: For PDF uploads (`/api/specs/convert-pdf`), server inspects raw buffer headers for standard PDF magic bytes (`%PDF-` / `0x25 0x50 0x44 0x46 0x2D`). Files spoofing extensions are rejected with HTTP 400 `INVALID_PDF_SIGNATURE`.

---

## 5. Secrets & Environment Configuration

- Secrets (database credentials, JWT secrets, session keys) are strictly managed via environment variables (`.env`).
- Never commit production credentials, `.env` files, or SSL private keys to source control.
- An `.env.example` template is provided for onboarding without exposing secrets.
- AWS RDS PostgreSQL connects using TLS/SSL with Amazon's verified Certificate Authority bundle (`global-bundle.pem`) with `sslmode: verify-full`.

---

## 6. Audit Logging & Data Integrity

- **Immutable Audit Trails**: All state-changing actions (stage advances, approvals, sign-offs, launch date adjustments, spec revisions) are appended to the project's audit trail with timestamp, user ID, role, and before/after diffs.
- **Soft Deletes**: Deletions are implemented as soft-deletes (`is_deleted: true`), ensuring business data is never silently destroyed and can be audited or restored by administrators.

---

## 7. Security Vulnerability Reporting

If you discover a potential security vulnerability within this platform:
1. Do NOT disclose it publicly or open a public issue.
2. Contact the Packaging Platform Security Team immediately at `security@packaging-platform.internal`.
3. Provide full steps to reproduce, impact assessment, and sample payloads.
