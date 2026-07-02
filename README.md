# AttendTrack — GPS-Verified Time & Attendance

A full-stack time and attendance system for court/institutional workers with GPS geo-fencing, shift management, internal messaging, and role-based access control.

## Features

### Core Attendance
- **GPS-verified check-in/out** — device location validated against a geo-fence before recording attendance
- **Haversine distance calculation** — verifies the employee is within the station boundary
- **GPS accuracy gating** — rejects check-ins with accuracy worse than 50m
- **Live duration timer** — real-time HH:MM:SS counter showing hours worked
- **Automatic status** — determines present, absent, late, half-day, or overtime based on 8:00 AM – 5:00 PM standard hours
- **Shift timing analysis** — calculates lateness, early checkout, overtime, and hours remaining

### Geo-Fencing
- **CourtStation model** — each station has a name, coordinates, and radius in meters
- **Dual validation** — both distance (within station radius) AND GPS accuracy (within 50m) must pass
- **Reverse geocoding** — converts coordinates to human-readable addresses via Nominatim
- **Location picker** — preview and confirm GPS location before check-in

### Shifts Management
- Create, edit, and delete shift templates (name, start/end times, applicable days)
- Assign shifts to team members (one shift per user enforced)
- Late check-in detection with automatic system alerts

### Internal Messaging
- Inbox and sent folders with message types: alert, message, notification
- System alerts auto-generated for late check-ins, missed check-ins, and missed check-outs
- Unread count badge with mark-as-read functionality
- Compose messages from admin/supervisor to any user

### Notifications
- Browser push notifications for missed check-in/out reminders
- 30-second polling timer that triggers alerts
- Email notifications (console-logged in development)

### Reports & Analytics
- Bar charts — attendance by day
- Pie charts — attendance status distribution
- Line charts — hours worked over time
- Weekly summary stats (present, absent, late days, total hours, average check-in)
- Date range and employee filtering
- Map view showing check-in/out GPS pins

### Admin Panel
- **User Management** — create single/bulk users, edit roles, departments, and station assignments
- **Court Stations** — CRUD for geo-fence stations with coordinates and radius
- **Job Titles & Departments** — admin-managed lists with custom entries
- **Settings** — system configuration

### Role-Based Access Control
| Role | Capabilities |
|------|-------------|
| **Admin** | Full access — user management, stations, shifts, reports, settings |
| **Supervisor** | Team attendance, shift management, messaging to assigned team |
| **User** | Check in/out, view own history and reports, profile management |

## Tech Stack

### Frontend
- **React 18** with JavaScript (JSX)
- **Vite 5** build tool
- **wouter** for client-side routing
- **Tailwind CSS v3** + **shadcn/ui** (Radix-based components)
- **Leaflet** + **react-leaflet** for OpenStreetMap integration
- **Recharts** for analytics charts
- **react-hook-form** + **zod** for form validation
- **Framer Motion** for animations
- **@tanstack/react-query** for data fetching

### Backend
- **Express** (Node.js)
- **MongoDB** (via official driver)
- **bcryptjs** for password hashing
- **jsonwebtoken** for JWT authentication
- Custom API with role-based middleware

### Architecture
- **Monorepo layout**: `client/` (SPA), `server/` (Express API), `shared/` (constants)
- **Hybrid storage**: MongoDB for all data, localStorage for auth token
- **Geo-fencing**: Haversine formula for distance, no external map API dependencies for validation

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) instance (local or remote)

### Installation

```bash
git clone <repo-url> attendtrack
cd attendtrack
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DB` | Database name | `attendtrack` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret | (required) |
| `DEFAULT_ADMIN_ID` | Seed admin employee ID | `001` |
| `DEFAULT_ADMIN_NAME` | Seed admin display name | `Alex Johnson` |
| `DEFAULT_ADMIN_EMAIL` | Seed admin email | `admin@example.com` |
| `DEFAULT_ADMIN_PASSWORD` | Seed admin password | `changeme123` |

### Running

```bash
# Development (Vite + API on port 3000)
npm run dev

# Production build
npm run build
npm run start

# Type check
npm run check

# Format code
npm run format
```

## Project Structure

```
attendtrack/
├── client/
│   └── src/
│       ├── components/       # UI components
│       │   └── ui/           # shadcn/ui components
│       ├── contexts/         # AttendanceContext, AuthContext, ThemeContext
│       ├── hooks/            # Custom React hooks
│       ├── layouts/          # MainLayout
│       ├── lib/              # Utilities (api.js, utils.js, constants.js)
│       ├── pages/            # Dashboard, Reports, Admin, Team, Shifts, Messages, Profile
│       │   └── admin/        # Admin-specific pages
│       └── router/           # AppRouter
├── server/
│   ├── src/
│   │   ├── index.js          # Express server entry
│   │   ├── db.js             # MongoDB connection + default admin seeding
│   │   ├── middleware/       # Auth, validation middleware
│   │   ├── routes/           # All API routes
│   │   └── utils/            # Utility functions (geo.js)
├── shared/
│   ├── constants.js          # Shared constants
│   └── index.js              # Module exports
└── package.json
```

## Data Model

### MongoDB Collections
| Collection | Purpose |
|-----------|---------|
| `users` | Employee accounts with auth fields, roles, supervisor assignments |
| `records` | Daily attendance records with events array |
| `stations` | Court station geo-fence definitions (name, lat, lng, radius) |
| `shifts` | Shift templates (name, times, days) |
| `shift_assignments` | User-to-shift mappings |
| `messages` | Internal messaging (inbox, sent, system alerts) |
| `job_titles` | Admin-managed job title list |
| `departments` | Admin-managed department list |
| `password_resets` | Password reset tokens and OTPs |

### Core Types
- **AttendanceEvent** — single check-in or check-out with timestamp and GPS location
- **AttendanceRecord** — one day's attendance (employee, events, status, total hours)
- **CourtStation** — geo-fence definition (name, coordinates, radius)
- **GeoLocation** — captured GPS position with accuracy and optional address
- **GeoFenceResult** — validation result (allowed, distance, accuracy status)

## API Routes

All routes are prefixed with `/api`:

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Login (returns JWT token) |
| GET | `/api/auth/me` | Validate current session |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| GET | `/api/records` | Get attendance records |
| GET | `/api/records/today` | Get today's record |
| POST | `/api/records/check-in` | Check in (with GPS validation) |
| POST | `/api/records/check-out` | Check out (with GPS validation) |
| GET | `/api/records/summary/weekly` | Get weekly summary |
| GET | `/api/users` | List users (filtered by role) |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/stations` | List court stations |
| POST | `/api/stations` | Create station |
| PUT | `/api/stations/:id` | Update station |
| DELETE | `/api/stations/:id` | Delete station |
| GET | `/api/shifts` | List shifts |
| POST | `/api/shifts` | Create shift |
| PUT | `/api/shifts/:id` | Update shift |
| DELETE | `/api/shifts/:id` | Delete shift |
| POST | `/api/shifts/assign` | Assign shift to user |
| GET | `/api/messages` | List messages |
| POST | `/api/messages` | Send message |
| PUT | `/api/messages/:id/read` | Mark as read |
| DELETE | `/api/messages/:id` | Delete message |
| GET | `/api/job-titles` | List job titles |
| POST | `/api/job-titles` | Create job title |
| PUT | `/api/job-titles/:id` | Update job title |
| DELETE | `/api/job-titles/:id` | Delete job title |
| GET | `/api/departments` | List departments |
| POST | `/api/departments` | Create department |
| PUT | `/api/departments/:id` | Update department |
| DELETE | `/api/departments/:id` | Delete department |

## How It Works

### Check-In Flow
1. Employee clicks "Check In" on the dashboard
2. GPS is acquired via `getCurrentPosition` (high accuracy, up to 15s timeout)
3. Reverse geocoding converts coordinates to an address
4. Geo-fence is validated (distance within station radius AND accuracy within 50m)
5. If valid: attendance event is created and saved to MongoDB
6. If late (past shift start): system alert message is auto-generated

### Session Management
- JWT-based authentication
- Single session per user — new login invalidates any previous session
- Session validated on every page load via `/api/auth/me`
- Token stored in localStorage

### Geo-Fence Validation
```
1. Calculate Haversine distance between GPS coordinates and station center
2. Check if distance <= station.radiusMeters
3. Check if GPS accuracy <= 50m (MAX_ACCURACY_METERS)
4. Both conditions must pass for check-in/out to be accepted
```

## Deployment

### MongoDB Atlas Setup
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Create a database user with read/write access
4. Whitelist your IP address (or allow access from anywhere for development)
5. Get the connection string and add it to your environment variables

### Heroku/Railway Deployment
1. Push your code to GitHub
2. Connect your repository to Heroku/Railway
3. Set environment variables in the dashboard
4. Deploy!

### Environment Variables for Production
```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/attendtrack
JWT_SECRET=<your-strong-random-secret>
NODE_ENV=production
CLIENT_URL=<your-frontend-url>
```

## License

MIT
# checkin
