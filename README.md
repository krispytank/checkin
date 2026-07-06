# Mahakama Access

> Court Management System
> Version: 2.0.0

A modular court management system with three independent modules: Time Attendance, Equipment Booking, and Fleet Management. Each module shares common user/auth infrastructure with dynamic per-module access control.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Security Measures](#security-measures)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Versioning & Releases](#versioning--releases)
- [Deployment](#deployment)
- [Remote Updates](#remote-updates)
- [Changelog](#changelog)
- [License](#license)

---

## Overview

Mahakama Access is a modular court management system designed for judicial institutions. It provides three independent modules that share a common user and authentication infrastructure:

**Key Capabilities:**
- **Time Attendance**: GPS-validated check-in/out with geo-fence enforcement, shift management, real-time tracking
- **Equipment Booking**: AV equipment management for court sessions, case-based booking with PDF upload, state-machine workflow
- **Fleet Management**: Vehicle tracking, trip scheduling with approval workflow, parking space management
- **Dynamic Module Access**: Per-user, per-module role and permission control
- **Role-based access control** (Admin, Supervisor, User) with module-specific roles
- **Mobile-first design** with responsive layouts and bottom navigation
- **Dark/light theme support**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Radix UI (shadcn/ui) |
| Routing | wouter |
| State / Data Fetching | TanStack React Query v5, React Context |
| Forms | react-hook-form + Zod validation |
| Charts | Recharts |
| Maps | Leaflet + OpenStreetMap |
| Icons | Lucide React |
| Backend | Express.js 4 (Node.js, ES Modules) |
| Database | MongoDB (native driver v6) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Security | Helmet, express-mongo-sanitize, express-rate-limit, CORS |
| Process Manager | pm2 (production), nodemon (development) |
| CI/CD | GitHub Actions |
| Deployment | Pull-based via deploy.sh, pm2, GitHub Releases |

---

## Architecture

```
mahakama-access/
├── .github/
│   └── workflows/
│       └── release.yml         # CI/CD: test → build → release
├── client/                     # React frontend (Vite)
│   ├── public/
│   │   ├── favicon.svg         # App favicon
│   │   ├── robots.txt          # SEO directives
│   │   └── leaflet.css         # Bundled Leaflet CSS (no CDN dependency)
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ErrorBoundary.jsx  # Top-level error handler
│   │   │   └── ModuleAccessManager.jsx  # Module access management UI
│   │   ├── contexts/           # Auth, Theme, Config providers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── layouts/            # MainLayout with module-aware sidebar
│   │   ├── lib/                # Axios API client, utilities
│   │   ├── pages/
│   │   │   ├── attendance/     # Time Attendance module pages
│   │   │   ├── equipment/      # Equipment Booking module pages
│   │   │   ├── fleet/          # Fleet Management module pages
│   │   │   ├── admin/          # Admin pages (grouped by module)
│   │   │   └── shared/         # Login, Profile, Landing, etc.
│   │   └── router/             # AppRouter with module-prefixed routes
│   ├── .eslintrc.json          # Client ESLint config
│   └── vite.config.js          # Dev server (port 5173) + API proxy
├── server/                     # Express backend
│   ├── src/
│   │   ├── config.js           # App constants + module definitions
│   │   ├── db.js               # MongoDB connection + seeding
│   │   ├── index.js            # Express app setup + route mounting
│   │   ├── middleware/          # Auth (module-aware), validation
│   │   ├── routes/             # API routes per module
│   │   │   ├── auth.js         # Authentication
│   │   │   ├── users.js        # User management + module access
│   │   │   ├── records.js      # Attendance records
│   │   │   ├── stations.js     # Geo-fence stations
│   │   │   ├── shifts.js       # Shift management
│   │   │   ├── messages.js     # Internal messaging
│   │   │   ├── equipment.js    # Equipment CRUD
│   │   │   ├── cases.js        # Case management
│   │   │   ├── bookings.js     # Equipment bookings
│   │   │   ├── bookers.js      # Designated bookers
│   │   │   ├── vehicles.js     # Fleet vehicles
│   │   │   ├── trips.js        # Trip management
│   │   │   └── parking.js      # Parking spaces
│   │   └── utils/
│   │       ├── geo.js          # Haversine distance calculation
│   │       └── mail.js         # Email sending (nodemailer)
│   ├── .eslintrc.json          # Server ESLint config
│   └── .env                    # Environment variables (not tracked)
├── CHANGELOG.md                # Version history
├── deploy.sh                   # Production deploy script
├── ecosystem.config.js         # pm2 config
├── VERSION                     # Single source of truth for version
├── package.json                # Root workspace config
├── Procfile                    # Deployment entry point
├── .env.example                # Environment variable template
└── README.md                   # This file
```

### Client-Server Communication

- **Development:** Vite dev server (port 5173) proxies `/api/*` requests to Express (port 3000). Same-origin from the browser's perspective — no CORS issues.
- **Production:** Express serves the built React client from `client/dist/` as static files. API routes handled by Express. SPA fallback serves `index.html` for all non-API routes.
- **API Client:** Centralized Axios instance (`client/src/lib/api.js`) with request interceptor (auto-attaches JWT) and response interceptor (auto-logout on 401).

---

## Features

### Module System

| Feature | Description |
|---------|-------------|
| Dynamic Module Access | Per-user, per-module enabled flag, role, and permissions |
| Module-Aware JWT | JWT tokens include moduleAccess claims |
| Module Middleware | `authorizeModule()`, `hasModuleAccess()`, `hasPermission()` helpers |
| Base Admin Bypass | `role: 'admin'` grants access to all modules automatically |
| Module-Specific Roles | Each module has its own role hierarchy (admin, manager, user) |

### Time Attendance Module

| Feature | Description |
|---------|-------------|
| GPS-validated Check-in/out | Dual validation: distance <= station radius AND accuracy <= 50m |
| Geo-fence Stations | Configurable radius (10-1000m) with interactive map picker |
| Shift Management | Create templates, assign to users, day-of-week configuration |
| Real-time Dashboard | Duration timer, weekly summary, attendance status |
| Team View | Supervisor can view team attendance with filtering |
| Reports & Analytics | Date range filtering, charts (pie, bar), summary statistics |
| Internal Messaging | Compose, inbox/sent, read/unread, notification preferences |
| Bulk User Import | CSV upload with validation and row-level error reporting |

### Equipment Booking Module

| Feature | Description |
|---------|-------------|
| Equipment Inventory | CRUD for AV equipment with categories (evidence-display, virtual-court, event-facilitation) |
| CSV Import | Bulk equipment import via CSV upload |
| Case Management | Searchable case database with inline creation |
| Booking Workflow | State machine: pending → approved → dispatched → in-use → returned |
| Double-Booking Prevention | Equipment cannot be booked for overlapping dates |
| PDF Upload | Attach request documents to bookings |
| Designated Bookers | Admin-managed list of users who can book equipment |
| Equipment Status Sync | Status auto-updates based on booking state |

### Fleet Management Module

| Feature | Description |
|---------|-------------|
| Vehicle Management | CRUD for fleet vehicles with categories (sedan, SUV, van, truck, bus) |
| Trip Scheduling | Create trips with destination, purpose, dates, passengers |
| Trip Workflow | State machine: pending → approved → in-progress → completed |
| Vehicle Double-Booking | Prevents overlapping trip assignments |
| Parking Management | Parking spaces per station with zones and types |
| Vehicle Status Sync | Status auto-updates based on trip state (available, booked, in-use) |

### Authentication & Session Management

| Feature | Description |
|---------|-------------|
| Email/Password Login | Credentials validated against bcrypt-hashed passwords |
| JWT Tokens | Signed with `JWT_SECRET`, 1-hour expiry, type-prefixed |
| Token Versioning | Incremented on password/role change to revoke old tokens |
| Password Reset | Secure token-based flow with 1-hour expiry |
| Password Complexity | Min 8 chars, requires uppercase, lowercase, digit, and special character |
| Auto-Logout | Client detects 401 responses, clears token, redirects to `/login` |

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all modules. Manage users, stations, shifts, departments, job titles. |
| **Supervisor** | View team attendance, create/edit shifts, message team members. |
| **User** | Check in/out, view own attendance, view own profile, send messages. |

**Module-Specific Roles:**

| Module | Roles |
|--------|-------|
| Attendance | admin, supervisor, user |
| Equipment | admin, booker, user |
| Fleet | admin, manager, user |

### Admin Section (Grouped by Module)

| Group | Pages |
|-------|-------|
| **Attendance** | User Management, Court Stations, Shift Templates, Departments, Job Titles |
| **Equipment** | Equipment Items, Designated Bookers |
| **Fleet** | Vehicles, Parking Spaces |

### UI/UX

| Feature | Description |
|---------|-------------|
| Dark/Light Theme | localStorage persistence and system preference detection |
| Mobile-First Design | Bottom navigation bar, 44px touch targets, safe-area support |
| Module-Aware Sidebar | Collapsible sections per module, auto-expand active route |
| Landing Page | 3 module cards with hover effects and feature lists |
| Responsive Layout | Desktop sidebar + mobile bottom nav |
| Toast Notifications | Success/error/warning feedback |
| Form Validation | Zod schemas |
| Framer Motion Animations | Page transitions, card hover effects |
| Kente Brand Colors | Green #009A44, Gold #8A704C, Emerald for Fleet |

---

## Security Measures

### Authentication Security

| Measure | Implementation |
|---------|---------------|
| Password Hashing | bcrypt with 12 salt rounds |
| JWT Secret | Required at startup; 64-char hex random value; no fallback |
| Token Expiry | 1-hour default (configurable via `JWT_EXPIRES_IN`) |
| Token Type Claim | `type: 'auth'` for login tokens, `type: 'reset'` for password reset tokens |
| Token Versioning | `tokenVersion` on user documents; incremented on password/role change; verified on each request |
| Password Reset | Separate token type with 1-hour expiry; single-use (deleted after use) |
| Email Enumeration Prevention | Forgot-password always returns success regardless of email existence |

### Authorization Security

| Measure | Implementation |
|---------|---------------|
| RBAC Middleware | `authorize('admin')` blocks non-admin API calls |
| Route Protection | `ProtectedRoute` component checks auth + roles before rendering |
| Self-Update Restriction | Non-admins can only update their own profile |
| Supervisor Scoping | Supervisors can only see/manage their assigned team |
| Soft Delete | Users deactivated (`isActive: false`) rather than removed |

### Input Validation & Injection Prevention

| Measure | Implementation |
|---------|---------------|
| NoSQL Injection Protection | `express-mongo-sanitize` strips `$`-prefixed keys from request bodies |
| Regex Injection Prevention | `escapeRegex()` utility escapes special characters in search terms |
| Email Validation | Server-side regex validation |
| Password Complexity | Min 8 chars + uppercase + lowercase + digit + special character |
| Role Validation | Whitelist check against `['admin', 'supervisor', 'user']` |
| Geo Location Validation | Latitude (-90 to 90), Longitude (-180 to 180), finite number checks |
| Body Size Limit | 50KB JSON body limit via `express.json({ limit: '50kb' })` |

### Rate Limiting

| Measure | Configuration |
|---------|--------------|
| General Rate Limit | 100 requests per 15 minutes per IP |
| Auth Rate Limit | 5 requests per 15 minutes per IP on `/login`, `/forgot-password`, `/reset-password` |

### HTTP Security

| Measure | Implementation |
|---------|---------------|
| Helmet.js | HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, CSP, COOP, CORP, Referrer-Policy |
| CORS | Configurable origin; production requires `CLIENT_URL` env var |
| Morgan Logging | `combined` format in production, `dev` in development |

### Secret Management

- All secrets in `.env` file (gitignored)
- Server fails to start if `JWT_SECRET` is missing
- Server fails to start if `CLIENT_URL` is missing in production
- No hardcoded secrets anywhere in source code

### Error Handling

- Production: Only `'Something went wrong!'` returned (no stack traces)
- Development: `err.message` included for debugging
- MongoDB errors return generic `'Invalid ID'` messages
- All user queries exclude password field

### Database Security

- Parameterized queries via MongoDB native driver (no string interpolation)
- Unique indexes on employeeId, email
- TTL index on `password_resets.expires` auto-deletes expired tokens

---

## API Reference

### Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/register` | Admin | Create new user |
| GET | `/api/auth/me` | Yes | Get current user profile |
| POST | `/api/auth/change-password` | Yes | Change password |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/reset-password` | No | Reset password with token |

### User Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Yes | List users (with search, filter, pagination) |
| GET | `/api/users/:id` | Yes | Get user by ID |
| POST | `/api/users` | Admin | Create user |
| POST | `/api/users/bulk` | Admin | Bulk import users (up to 500) |
| PUT | `/api/users/:id` | Yes* | Update user (*admins can update any; others only self) |
| DELETE | `/api/users/:id` | Admin | Soft-delete user |
| PUT | `/api/users/:id/module-access` | Admin | Update user's module access |
| PUT | `/api/users/:id/module-access/bulk` | Admin | Bulk update module access |

### Record Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/records` | Yes | List attendance records |
| GET | `/api/records/today` | Yes | Get today's record for current user |
| POST | `/api/records/check-in` | Yes | Check in with GPS location |
| POST | `/api/records/check-out` | Yes | Check out with GPS location |
| GET | `/api/records/weekly-summary` | Yes | Get weekly attendance summary |

### Station Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/stations` | Yes | List all stations |
| GET | `/api/stations/:id` | Yes | Get station by ID |
| POST | `/api/stations` | Admin | Create station |
| PUT | `/api/stations/:id` | Admin | Update station |
| DELETE | `/api/stations/:id` | Admin | Delete station |

### Shift Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/shifts` | Yes | List shifts (with assignment counts) |
| GET | `/api/shifts/:id` | Yes | Get shift with assigned users |
| POST | `/api/shifts` | Admin/Supervisor | Create shift |
| PUT | `/api/shifts/:id` | Admin/Supervisor | Update shift |
| DELETE | `/api/shifts/:id` | Admin | Delete shift |
| POST | `/api/shifts/assign` | Admin/Supervisor | Assign shift to user |
| DELETE | `/api/shifts/assign/:userId` | Admin/Supervisor | Unassign shift from user |

### Message Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/messages` | Yes | List messages (inbox/sent, paginated) |
| GET | `/api/messages/:id` | Yes | Get message (sender/receiver only) |
| POST | `/api/messages` | Yes | Send message |
| PUT | `/api/messages/read-all` | Yes | Mark all as read |
| PUT | `/api/messages/:id/read` | Yes | Mark one as read |
| DELETE | `/api/messages/:id` | Yes | Delete message (sender/receiver only) |

### Equipment Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/equipment` | Yes | List equipment (with search, filter) |
| GET | `/api/equipment/available` | Yes | List available equipment |
| GET | `/api/equipment/:id` | Yes | Get equipment by ID |
| POST | `/api/equipment` | Equipment Admin | Create equipment |
| POST | `/api/equipment/csv` | Equipment Admin | Bulk import via CSV |
| PUT | `/api/equipment/:id` | Equipment Admin | Update equipment |
| DELETE | `/api/equipment/:id` | Equipment Admin | Delete equipment |

### Case Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cases` | Yes | List cases (with search) |
| GET | `/api/cases/:id` | Yes | Get case by ID |
| POST | `/api/cases` | Yes | Create case |
| PUT | `/api/cases/:id` | Yes | Update case |
| DELETE | `/api/cases/:id` | Yes | Delete case |

### Booking Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bookings` | Yes | List bookings (with filter) |
| GET | `/api/bookings/:id` | Yes | Get booking by ID |
| POST | `/api/bookings` | Bookers | Create booking |
| POST | `/api/bookings/:id/pdf` | Bookers | Upload PDF for booking |
| PUT | `/api/bookings/:id/status` | Bookers/Admin | Update booking status |

### Booker Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bookers` | Equipment Admin | List designated bookers |
| GET | `/api/bookers/check` | Yes | Check if current user is a booker |
| POST | `/api/bookers` | Equipment Admin | Add designated booker |
| DELETE | `/api/bookers/:userId` | Equipment Admin | Remove designated booker |

### Vehicle Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vehicles` | Yes | List vehicles (with search, filter) |
| GET | `/api/vehicles/available` | Yes | List available vehicles |
| GET | `/api/vehicles/:id` | Yes | Get vehicle by ID |
| POST | `/api/vehicles` | Fleet Admin | Create vehicle |
| PUT | `/api/vehicles/:id` | Fleet Admin | Update vehicle |
| DELETE | `/api/vehicles/:id` | Fleet Admin | Delete vehicle |

### Trip Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/trips` | Yes | List trips (with filter) |
| GET | `/api/trips/:id` | Yes | Get trip by ID |
| POST | `/api/trips` | Fleet Users | Create trip |
| PUT | `/api/trips/:id/status` | Fleet Admin/Manager | Update trip status |

### Parking Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/parking` | Yes | List parking spaces (with search, filter) |
| GET | `/api/parking/available` | Yes | List available parking spaces |
| GET | `/api/parking/stats` | Yes | Get parking statistics |
| GET | `/api/parking/:id` | Yes | Get parking space by ID |
| POST | `/api/parking` | Fleet Admin | Create parking space |
| PUT | `/api/parking/:id` | Fleet Admin | Update parking space |
| DELETE | `/api/parking/:id` | Fleet Admin | Delete parking space |

### Other Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/job-titles` | Yes | List job titles |
| POST | `/api/job-titles` | Admin | Create job title |
| PUT | `/api/job-titles/:id` | Admin | Update job title |
| DELETE | `/api/job-titles/:id` | Admin | Delete job title |
| GET | `/api/departments` | Yes | List departments |
| POST | `/api/departments` | Admin | Create department |
| PUT | `/api/departments/:id` | Admin | Update department |
| DELETE | `/api/departments/:id` | Admin | Delete department |
| GET | `/api/notifications/preferences` | Yes | Get notification preferences |
| PUT | `/api/notifications/preferences` | Yes | Update notification preferences |
| GET | `/api/notifications/unread-count` | Yes | Get unread message count |
| GET | `/api/config` | No | Get public app configuration |
| GET | `/api/health` | No | Health check |
| GET | `/api/version` | No | Get app version |

**Total: 78 API endpoints**

---

## Database Schema

### `users`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| employeeId | String | Unique employee identifier |
| name | String | Full name |
| email | String | Unique email address |
| password | String | bcrypt-hashed password |
| role | String | `admin`, `supervisor`, or `user` |
| department | String | Department name |
| jobTitle | String | Job title |
| stationId | String | Assigned station ID |
| supervisorId | String | Assigned supervisor's user ID |
| isActive | Boolean | Account active flag |
| tokenVersion | Number | Incremented to revoke tokens |
| moduleAccess | Object | Per-module access: `{ attendance, equipment, fleet }` |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

**Indexes:** employeeId (unique), email (unique), role, stationId, supervisorId

### `records`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| userId | String | User ID |
| date | String | `YYYY-MM-DD` |
| status | String | `present`, `absent`, `late`, `half-day`, `overtime` |
| events | Array | Timestamped check-in/out events with GPS data |
| totalHours | Number | Total hours worked |
| createdAt | Date | Creation timestamp |

**Indexes:** userId+date (unique), date, status

### `stations`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | String | Station name |
| latitude | Number | Station center latitude |
| longitude | Number | Station center longitude |
| radiusMeters | Number | Geo-fence radius (10-1000) |
| createdAt | Date | Creation timestamp |

**Indexes:** latitude+longitude

### `shifts`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | String | Unique shift name |
| startTime | String | `HH:MM` format |
| endTime | String | `HH:MM` format |
| applicableDays | Array | Day indices (0=Sun through 6=Sat) |
| createdAt | Date | Creation timestamp |

**Indexes:** name (unique)

### `shift_assignments`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| userId | String | User ID (unique) |
| shiftId | String | Shift ID |
| createdAt | Date | Creation timestamp |

**Indexes:** userId (unique), shiftId

### `messages`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| senderId | String | Sender user ID (or `'system'`) |
| receiverId | String | Receiver user ID |
| type | String | `message`, `alert`, or `notification` |
| subject | String | Message subject |
| content | String | Message body |
| read | Boolean | Read status |
| createdAt | Date | Creation timestamp |

**Indexes:** receiverId+read, senderId, createdAt

### `departments`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | String | Department name |
| createdAt | Date | Creation timestamp |

### `job_titles`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | String | Job title name |
| createdAt | Date | Creation timestamp |

### `password_resets`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| userId | String | User ID |
| token | String | Reset token |
| expires | Date | Expiration time |
| createdAt | Date | Creation timestamp |

**Indexes:** token, expires (TTL — auto-deletes expired entries)

### `notification_preferences`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| userId | String | User ID (unique) |
| lateCheckIn | Boolean | Enable late check-in alerts |
| lateCheckOut | Boolean | Enable late check-out alerts |
| overtime | Boolean | Enable overtime alerts |
| shiftReminder | Boolean | Enable shift reminders |
| shiftChange | Boolean | Enable shift change notifications |
| shiftAssignment | Boolean | Enable shift assignment notifications |
| mutedUntil | Date | Temporary mute expiry |

**Indexes:** userId (unique)

### `equipment`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | String | Equipment name |
| category | String | `evidence-display`, `virtual-court`, `event-facilitation` |
| serialNumber | String | Serial number |
| description | String | Description |
| status | String | `available`, `booked`, `in-use`, `maintenance` |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

**Indexes:** category, status

### `cases`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| caseNumber | String | Unique case number |
| title | String | Case title |
| description | String | Case description |
| court | String | Court name |
| judge | String | Judge name |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

**Indexes:** caseNumber (unique), title

### `bookings`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| bookingId | String | Unique booking ID |
| caseId | String | Associated case ID |
| userId | String | User who created the booking |
| equipmentIds | Array | Array of equipment IDs |
| startDate | Date | Booking start date |
| endDate | Date | Booking end date |
| status | String | `pending`, `approved`, `dispatched`, `in-use`, `returned`, `rejected` |
| pdfPath | String | Path to uploaded PDF |
| history | Array | Status change history |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

**Indexes:** bookingId (unique), userId, status, caseId

### `vehicles`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | String | Vehicle name |
| plateNumber | String | Unique plate number |
| category | String | `sedan`, `suv`, `van`, `truck`, `bus` |
| capacity | Number | Passenger capacity |
| description | String | Description |
| status | String | `available`, `booked`, `in-use`, `maintenance` |
| mileage | Number | Current mileage |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

**Indexes:** plateNumber (unique), status, category

### `trips`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| tripId | String | Unique trip ID |
| vehicleId | String | Assigned vehicle ID |
| userId | String | User who requested the trip |
| driverId | String | Assigned driver ID |
| destination | String | Trip destination |
| purpose | String | Trip purpose |
| departureDate | Date | Scheduled departure |
| returnDate | Date | Scheduled return |
| passengers | Number | Number of passengers |
| status | String | `pending`, `approved`, `in-progress`, `completed`, `rejected` |
| history | Array | Status change history |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

**Indexes:** tripId (unique), vehicleId, userId, status

### `parking_spaces`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | String | Space name |
| zone | String | Parking zone |
| stationId | String | Station ID |
| type | String | `standard`, `handicap`, `reserved`, `ev` |
| description | String | Description |
| status | String | `available`, `occupied`, `reserved` |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

**Indexes:** stationId, status

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB` | No | `mahakama_access` | Database name |
| `JWT_SECRET` | Yes | — | Secret key for JWT signing (64-char hex recommended) |
| `JWT_EXPIRES_IN` | No | `1h` | Token expiry duration |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `CLIENT_URL` | Production | — | Frontend URL for CORS (required in production) |
| `DEFAULT_ADMIN_ID` | No | `001` | Default admin employee ID |
| `DEFAULT_ADMIN_NAME` | No | `Alex Johnson` | Default admin name |
| `DEFAULT_ADMIN_EMAIL` | No | `admin@example.com` | Default admin email |
| `DEFAULT_ADMIN_PASSWORD` | No | — | Default admin password (strong, required on first run) |
| `VITE_API_URL` | No | `/api` | API base URL (client-side) |
| `SMTP_HOST` | No | `smtp.gmail.com` | Email SMTP host |
| `SMTP_PORT` | No | `587` | Email SMTP port |
| `SMTP_USER` | No | — | Email SMTP username |
| `SMTP_PASS` | No | — | Email SMTP password |
| `EMAIL_FROM` | No | `noreply@mahakama-access.com` | Sender email address |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
git clone https://github.com/krispytank/Attendance.git
cd Attendance
npm install
cp .env.example server/.env
# Edit server/.env with your values
npm run dev
```

### How Frontend-Backend Communication Works

**Development (two servers):**
- Vite dev server runs on `:5173`, Express on `:3000`
- Frontend Axios client uses `baseURL: '/api'` (relative)
- Vite proxy forwards `/api/*` to Express — no CORS issues

**Production (single server):**
- Express serves the built React client from `client/dist/`
- Express handles `/api/*` routes
- Everything is same-origin — no proxy needed

The frontend does not need its own `.env` file. It works via the Vite proxy in development and static serving in production.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both client and server in development mode |
| `npm run dev:server` | Start only the Express server |
| `npm run dev:client` | Start only the Vite dev server |
| `npm run build` | Build the client for production |
| `npm start` | Start the server in production mode |
| `npm run start:pm2` | Start server with pm2 |
| `npm run stop:pm2` | Stop server with pm2 |
| `npm run restart:pm2` | Restart server with pm2 |
| `npm run deploy` | Run deploy script (check for updates + deploy) |
| `npm run deploy:force` | Force deploy latest version |
| `npm run deploy:status` | Show current version and server status |

---

## Versioning & Releases

### Semantic Versioning

The project follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

| Bump | When | Example |
|------|------|---------|
| **MAJOR** | Breaking changes (DB schema, API breaking changes) | 1.0.0 → 2.0.0 |
| **MINOR** | New features (backward-compatible) | 1.0.0 → 1.1.0 |
| **PATCH** | Bug fixes, security patches | 1.0.0 → 1.0.1 |

### Version Sources

- **`VERSION` file** — Plain text file (e.g., `1.0.0`)
- **Git tags** — Prefixed with `v` (e.g., `v1.0.0`)
- **`package.json`** — Root package version

### How to Release

```bash
# Patch release (bug fixes)
npm run release:patch

# Minor release (new features)
npm run release:minor

# Major release (breaking changes)
npm run release:major
```

These commands:
1. Bump the version in `package.json`
2. Commit the change
3. Create a git tag (`v1.0.1`)
4. Push to GitHub
5. Trigger the GitHub Actions CI/CD pipeline

### CI/CD Pipeline

Triggered automatically when a version tag (`v*`) is pushed:

```
Push tag v1.1.0
    ↓
GitHub Actions
    ├── Run tests (server + client)
    ├── Build client (vite build)
    ├── Create GitHub Release
    │   ├── Release notes (auto-generated from commits)
    │   └── Client build artifact (client-dist-v1.1.0.zip)
    └── Update VERSION file on main
```

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/) for auto-generated release notes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat:` | New feature | `feat: add overtime alerts` |
| `fix:` | Bug fix | `fix: correct GPS validation` |
| `security:` | Security patch | `security: patch NoSQL injection` |
| `chore:` | Maintenance | `chore: update dependencies` |
| `docs:` | Documentation | `docs: update API reference` |

---

## Deployment

### Production Architecture

```
GitHub Release (tagged)
    ↓
Production Server (/opt/attendtrack)
    ├── deploy.sh          ← Checks GitHub for updates
    ├── server/            ← Express API + static client serving
    ├── client/dist/       ← Built React app
    ├── server/.env        ← Production environment variables
    ├── VERSION            ← Current deployed version
    ├── ecosystem.config.js ← pm2 config
    └── logs/              ← Deploy and server logs
```

### First-Time Server Setup

```bash
# 1. Clone the repo
git clone https://github.com/krispytank/Attendance.git /opt/attendtrack
cd /opt/attendtrack

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example server/.env
# Edit server/.env with production values:
#   - Strong JWT_SECRET (openssl rand -hex 32)
#   - Strong DEFAULT_ADMIN_PASSWORD
#   - MONGODB_URI with auth credentials
#   - CLIENT_URL=https://your-domain.com
#   - NODE_ENV=production

# 4. Install pm2 globally
npm install -g pm2

# 5. Build client
npm run build

# 6. Start with pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Enables auto-start on server reboot

# 7. Set up deploy script as cron (optional)
crontab -e
# Add: */5 * * * * /opt/attendtrack/deploy.sh >> /opt/attendtrack/logs/cron.log 2>&1
```

### Process Management (pm2)

| Command | Description |
|---------|-------------|
| `pm2 list` | Show all running processes |
| `pm2 logs attendtrack-server` | View server logs |
| `pm2 restart attendtrack-server` | Restart the server |
| `pm2 stop attendtrack-server` | Stop the server |
| `pm2 monit` | Real-time monitoring dashboard |

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set strong `JWT_SECRET` (64-char hex)
- [ ] Set strong `DEFAULT_ADMIN_PASSWORD`
- [ ] Set `CLIENT_URL` to your frontend domain
- [ ] Configure `MONGODB_URI` with auth credentials
- [ ] Configure SMTP for password reset emails
- [ ] Enable MongoDB TLS
- [ ] Set up SSL/TLS termination (reverse proxy or load balancer)
- [ ] Install pm2 and enable startup (`pm2 startup`)
- [ ] Configure deploy script cron (optional)
- [ ] Set up GitHub deploy token for automated pulls

---

## Remote Updates

### How It Works

The production server pulls updates from GitHub using the `deploy.sh` script:

```
./deploy.sh
    ↓
1. Fetch latest release from GitHub API
2. Compare with current VERSION
3. If newer version exists:
   ├── git fetch --tags
   ├── git checkout v<new-version>
   ├── npm install
   ├── Build client (vite build)
   ├── Restart server (pm2)
   └── Health check
4. Log result
```

### Deploy Script Usage

```bash
# Check for updates and deploy if available
./deploy.sh

# Force deploy (even if same version)
./deploy.sh --force

# Rollback to a specific version
./deploy.sh --rollback 1.0.0

# Check status (current version, server health)
./deploy.sh --status

# Print current version
./deploy.sh --version
```

### Automated Updates (Cron)

Check for updates every 5 minutes:

```bash
crontab -e
# Add:
*/5 * * * * /opt/attendtrack/deploy.sh >> /opt/attendtrack/logs/cron.log 2>&1
```

### Manual Update Workflow

```bash
# On your development machine:
# 1. Make changes
git checkout -b feature/new-thing
# ... code ...
git commit -m "feat: add new thing"

# 2. Merge to main
git checkout main
git merge feature/new-thing

# 3. Bump version (creates tag, pushes)
npm run release:minor

# 4. On production server (automatic or manual):
./deploy.sh
```

### Rollback

```bash
# Rollback to a specific version
./deploy.sh --rollback 1.0.0

# Check what version was running before
cat logs/previous-version
```

### Security Measures for Remote Updates

| Concern | Mitigation |
|---------|-----------|
| Unauthorized code | Only pulls from tagged releases on your GitHub repo |
| MITM attacks | All GitHub API calls use HTTPS |
| Failed deploy | Automatic rollback if health check fails after restart |
| Secret exposure | `.env` is never overwritten during updates |
| DB schema changes | Only backward-compatible migrations; manual review required |
| Integrity | Git tags are immutable; same commit hash every time |

### Health Check

After every deploy or rollback, `deploy.sh` runs:

```
GET /api/health → {"status":"ok","timestamp":"..."}
```

Retries up to 5 times with 2-second delays. If health check fails, automatic rollback is triggered.

### GitHub Setup

For automated deployment, create a **deploy token**:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Create token with read-only access to the repository
3. On production server, configure git:
   ```bash
   git remote set-url origin https://<token>@github.com/krispytank/Attendance.git
   ```

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full version history.

### v1.0.0 — 2026-07-02

**Core Features:**
- GPS-validated check-in/out with geo-fence enforcement
- Role-based access control (Admin, Supervisor, User)
- Shift scheduling and assignment
- Real-time attendance dashboard with duration timer
- Internal messaging with notification preferences
- Reports and analytics with charts
- Bulk CSV user import
- Password reset with email support

**Security:**
- JWT with type claim and token versioning
- NoSQL injection protection (express-mongo-sanitize)
- Regex escape for search queries
- Rate limiting (general + auth-specific)
- Helmet.js security headers
- Password complexity enforcement

**Infrastructure:**
- Semantic versioning with git tags
- CI/CD via GitHub Actions
- Pull-based deployment with rollback
- pm2 process management
- ESLint configured for client and server
- React Error Boundary

---

## License

MIT
