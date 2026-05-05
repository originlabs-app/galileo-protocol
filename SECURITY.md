# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |
| < 1.0   | No        |

## Security Measures

### Authentication & Session Management
- httpOnly cookies with SameSite=Lax (no localStorage tokens)
- SHA-256 hashed refresh tokens in database
- Timing-safe password comparison (bcrypt + dummy hash on unknown user)
- Atomic token rotation (old token invalidated in same transaction)
- Password max length: 128 characters (bcrypt DoS prevention)

### CSRF Protection
- Custom header `X-Galileo-Client` required on POST, PATCH, DELETE, PUT
- GET requests exempt by design
- Dashboard sends header automatically via centralized API helper

### Input Validation
- Zod schema validation on all endpoints
- Bounds enforced: name ≤255, serial ≤100, description ≤2000, brandName ≤255
- Category enum validation (8 values, strict match)
- GTIN check digit validation (GS1 mod-10 algorithm)

### Authorization
- Role-based access control (ADMIN, BRAND_ADMIN, OPERATOR, VIEWER)
- Brand scoping: all product routes filter by user's brandId
- Null-brandId guard returns 403 on product routes
- ADMIN role can access cross-brand resources with explicit brandId

### Concurrency
- Mint endpoint uses optimistic concurrency control (updateMany WHERE status=DRAFT)
- Concurrent mint attempts: exactly one succeeds, others get 409 Conflict

### Frontend Security
- AuthProvider React Context (single /auth/me, no duplicate fetches)
- SSR-safe AuthGuard (useSyncExternalStore, no hydration mismatch)
- No sensitive data in client-side state or localStorage

### CI/CD Security
- pnpm install --frozen-lockfile (deterministic installs)
- Exact semver pinning on all dependencies
- E2E tests run in CI with production API build
- Test database isolation (galileo_test)

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

If you discover a security vulnerability in the Galileo Luxury Standard specifications, website, or reference implementations, please report it responsibly.

### How to Report

Send an email to **security@galileoprotocol.io** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested mitigation or fix

### What to Expect

| Step | Timeline |
|------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 7 days |
| Resolution target | Within 90 days |

We will keep you informed of progress and may ask for additional information.

### Scope

This security policy covers:

- **Specification vulnerabilities** — Cryptographic weaknesses, privacy leaks, compliance gaps
- **Smart contract interfaces** — Solidity interface design flaws
- **Website** — XSS, injection, authentication bypass
- **Infrastructure** — CI/CD pipeline, dependency vulnerabilities

### Out of Scope

- Third-party implementations of the standard
- Social engineering attacks
- Denial of service attacks
- Issues already publicly disclosed

## Responsible Disclosure

We follow a 90-day responsible disclosure policy:

1. Reporter submits vulnerability privately
2. We acknowledge and begin investigation
3. We develop and test a fix
4. We release the fix and publish an advisory
5. Reporter may publish details after the fix is released

We credit reporters in security advisories unless they prefer to remain anonymous.

## Security Best Practices for Implementers

If you are implementing the Galileo Luxury Standard:

- Keep dependencies up to date
- Follow the [GDPR compliance guide](specifications/compliance/guides/gdpr-compliance.md) for data handling
- Use the recommended cryptographic algorithms from the [hybrid architecture specification](specifications/architecture/hybrid-architecture.md)
- Enable GitHub Dependabot and secret scanning on your repositories
