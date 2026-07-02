# Changelog

All notable changes to AttendTrack will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] — 2026-07-02

### Added
- GPS-validated check-in/out with geo-fence enforcement
- Role-based access control (Admin, Supervisor, User)
- Shift scheduling and assignment
- Real-time attendance dashboard with duration timer
- Internal messaging system with notification preferences
- Reports and analytics with charts (Recharts)
- Dark/light theme with system preference detection
- Mobile-responsive design
- Bulk CSV user import (up to 500 users)
- Station management with interactive map picker (Leaflet)
- Department and job title management
- Password reset flow with email support (nodemailer)
- React Error Boundary for crash recovery
- Semantic versioning with git tags
- CI/CD pipeline (GitHub Actions)
- Pull-based deployment script with rollback and health checks
- pm2 process management in production
- API version endpoint (`/api/version`)

### Security
- JWT tokens with type claim (`auth` vs `reset`) to prevent cross-use
- Token versioning for revocation on password/role change
- 1-hour JWT expiry (configurable)
- Password complexity: min 8 chars, uppercase, lowercase, digit, special character
- `express-mongo-sanitize` for NoSQL injection protection
- Regex escape utility to prevent ReDoS in search queries
- Rate limiting: 100 req/15min general, 5 req/15min on auth endpoints
- Helmet.js security headers (HSTS, CSP, X-Frame-Options, etc.)
- CORS with configurable origin
- Production error masking (no stack traces leaked)
- 50KB JSON body limit
- Morgan logging (combined in production, dev in development)

### Infrastructure
- npm workspaces monorepo (client + server)
- Vite dev server with API proxy
- Express serves built client in production (single origin)
- ESLint configured for both client and server
- Prettier for code formatting
- `.env.example` with documented variables
- `VERSION` file as single source of truth
- `deploy.sh` with status, force deploy, and rollback
- `ecosystem.config.js` with configurable `APP_DIR`
