# AttendTrack Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for AttendTrack, a GPS-verified time and attendance system built with the MERN stack (MongoDB, Express, React 19, Node.js).

**Key Decisions:**
- Authentication: JWT (stateless)
- Testing: Full test suite (Unit + Integration + E2E)
- Deployment: Heroku/Railway with MongoDB Atlas
- Documentation: Complete with README and deployment guides

---

## Phase 1: Project Setup & Configuration

### 1.1 Initialize Monorepo Structure

```
attendtrack/
├── client/                  # React frontend (Vite)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── server/                  # Express backend
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── shared/                  # Shared types & constants
│   ├── types.ts
│   ├── constants.ts
│   └── package.json
├── package.json             # Root package.json (workspaces)
├── .gitignore
├── .env.example
└── README.md
```

### 1.2 Root Configuration Files

**package.json** (root):
- Configure npm/yarn workspaces
- Add scripts: `dev`, `build`, `start`, `test`, `lint`

**.gitignore**:
- node_modules, dist, .env, .DS_Store, coverage

**.env.example**:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=attendtrack

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# Default Admin (seeded on first run)
DEFAULT_ADMIN_ID=001
DEFAULT_ADMIN_NAME=Alex Johnson
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=changeme

# Frontend
VITE_API_URL=http://localhost:3000/api
```

### 1.3 Client Configuration (Vite + React)

**package.json dependencies**:
- react, react-dom, react-router-dom (or wouter)
- @tanstack/react-query (data fetching)
- tailwindcss, @tailwindcss/vite
- shadcn/ui components
- leaflet, react-leaflet (maps)
- recharts (charts)
- react-hook-form, zod (forms)
- framer-motion (animations)
- axios or fetch wrapper

**vite.config.ts**:
- Configure API proxy to backend
- Set up path aliases (@/ → src/)
- Enable Tailwind CSS plugin

### 1.4 Server Configuration (Express + TypeScript)

**package.json dependencies**:
- express, cors, helmet
- mongodb (official driver)
- jsonwebtoken, bcryptjs
- dotenv, morgan
- express-rate-limit

**tsconfig.json**:
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Path aliases

### 1.5 Shared Package

**types.ts**:
```typescript
// Core types used by both client and server
export interface User {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'user';
  department?: string;
  jobTitle?: string;
  stationId?: string;
  supervisorId?: string;
  createdAt: Date;
}

export interface AttendanceRecord {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  events: AttendanceEvent[];
  status: 'present' | 'absent' | 'late' | 'half-day' | 'overtime';
  totalHours: number;
  checkInTime?: Date;
  checkOutTime?: Date;
}

export interface AttendanceEvent {
  type: 'check-in' | 'check-out';
  timestamp: Date;
  location: GeoLocation;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

export interface CourtStation {
  _id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface Shift {
  _id: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string;
  applicableDays: number[]; // 0-6 (Sun-Sat)
}

export interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  type: 'alert' | 'message' | 'notification';
  subject: string;
  content: string;
  read: boolean;
  createdAt: Date;
}
```

**constants.ts**:
```typescript
export const STANDARD_WORK_HOURS = 8;
export const WORK_START_TIME = '08:00';
export const WORK_END_TIME = '17:00';
export const MAX_ACCURACY_METERS = 50;
export const GPS_TIMEOUT_MS = 15000;
export const POLLING_INTERVAL_MS = 30000;
```

---

## Phase 2: Database & Data Models

### 2.1 MongoDB Connection Setup

**server/src/db.ts**:
- Connect to MongoDB using official driver
- Create indexes for performance
- Seed default admin user on first run

### 2.2 Collection Schemas

**users collection**:
```javascript
{
  _id: ObjectId,
  employeeId: String (unique),
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: 'admin', 'supervisor', 'user'),
  department: String,
  jobTitle: String,
  stationId: ObjectId (ref: stations),
  supervisorId: ObjectId (ref: users),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**records collection**:
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  date: String (YYYY-MM-DD),
  events: [{
    type: String (enum: 'check-in', 'check-out'),
    timestamp: Date,
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      address: String
    }
  }],
  status: String (enum: 'present', 'absent', 'late', 'half-day', 'overtime'),
  totalHours: Number,
  createdAt: Date
}
```

**stations collection**:
```javascript
{
  _id: ObjectId,
  name: String,
  latitude: Number,
  longitude: Number,
  radiusMeters: Number,
  createdAt: Date
}
```

**shifts collection**:
```javascript
{
  _id: ObjectId,
  name: String,
  startTime: String,
  endTime: String,
  applicableDays: [Number],
  createdAt: Date
}
```

**shift_assignments collection**:
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: users),
  shiftId: ObjectId (ref: shifts),
  createdAt: Date
}
```

**messages collection**:
```javascript
{
  _id: ObjectId,
  senderId: ObjectId (ref: users),
  receiverId: ObjectId (ref: users),
  type: String (enum: 'alert', 'message', 'notification'),
  subject: String,
  content: String,
  read: Boolean,
  createdAt: Date
}
```

**job_titles collection**:
```javascript
{
  _id: ObjectId,
  name: String (unique),
  createdAt: Date
}
```

**departments collection**:
```javascript
{
  _id: ObjectId,
  name: String (unique),
  createdAt: Date
}
```

### 2.3 Database Indexes

```javascript
// Performance indexes
db.users.createIndex({ employeeId: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ stationId: 1 });

db.records.createIndex({ userId: 1, date: 1 }, { unique: true });
db.records.createIndex({ date: 1 });

db.messages.createIndex({ receiverId: 1, read: 1 });
db.messages.createIndex({ senderId: 1 });

db.stations.createIndex({ latitude: 1, longitude: 1 });
```

---

## Phase 3: Authentication System

### 3.1 JWT Implementation

**server/src/auth.ts**:
```typescript
// JWT token generation and verification
export function generateToken(userId: string, role: string): string
export function verifyToken(token: string): { userId: string; role: string }
export function hashPassword(password: string): Promise<string>
export function comparePassword(password: string, hash: string): Promise<boolean>
```

### 3.2 Auth Middleware

**server/src/middleware/auth.ts**:
```typescript
// Middleware to protect routes
export function authenticate(req, res, next)
export function authorize(...roles: string[])
```

### 3.3 Auth Routes

**POST /api/auth/login**:
- Validate email/password
- Generate JWT token
- Return user data (excluding password)

**POST /api/auth/register**:
- Create new user (admin only)
- Hash password
- Return user data

**GET /api/auth/me**:
- Validate JWT token
- Return current user data

**POST /api/auth/logout**:
- Client-side token removal
- Optional: Token blacklisting

**POST /api/auth/forgot-password**:
- Generate reset token
- Send email (console.log in dev)

**POST /api/auth/reset-password**:
- Validate reset token
- Update password

### 3.4 Password Security

- bcrypt with salt rounds = 12
- Minimum password length: 8 characters
- Password complexity requirements

---

## Phase 4: Core API Routes

### 4.1 Users API

**GET /api/users**:
- List all users (filtered by role)
- Pagination support
- Search by name/employeeId

**POST /api/users**:
- Create new user
- Validate unique employeeId/email
- Hash password

**PUT /api/users/:id**:
- Update user details
- Admin can change roles
- Users can update own profile

**DELETE /api/users/:id**:
- Soft delete (set isActive: false)
- Admin only

### 4.2 Attendance API

**GET /api/records**:
- Get attendance records
- Filter by userId, date range
- Pagination support

**POST /api/records/check-in**:
- Validate GPS location against station
- Haversine distance calculation
- GPS accuracy check (≤50m)
- Create/update attendance record
- Auto-detect late check-in
- Generate system alert if late

**POST /api/records/check-out**:
- Same GPS validation as check-in
- Calculate total hours
- Update attendance status

**Helper: Haversine Formula**:
```typescript
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  // Returns distance in meters
}
```

**Helper: Attendance Status**:
```typescript
function calculateStatus(
  checkInTime: Date,
  checkOutTime?: Date
): 'present' | 'late' | 'half-day' | 'overtime' {
  // Based on 8:00 AM - 5:00 PM standard
}
```

### 4.3 Stations API

**GET /api/stations**: List all stations
**POST /api/stations**: Create station (admin)
**PUT /api/stations/:id**: Update station (admin)
**DELETE /api/stations/:id**: Delete station (admin)

### 4.4 Shifts API

**GET /api/shifts**: List all shifts
**POST /api/shifts**: Create shift (admin/supervisor)
**PUT /api/shifts/:id**: Update shift
**DELETE /api/shifts/:id**: Delete shift
**POST /api/shifts/assign**: Assign shift to user

### 4.5 Messages API

**GET /api/messages**: List messages (inbox/sent)
**POST /api/messages**: Send message
**PUT /api/messages/:id/read**: Mark as read
**DELETE /api/messages/:id**: Delete message

**System Alerts Auto-Generation**:
- Late check-in
- Missed check-in (no check-in by 9:00 AM)
- Missed check-out (no check-out by 6:00 PM)

### 4.6 Job Titles & Departments API

**GET /api/job-titles**: List job titles
**POST /api/job-titles**: Create job title
**DELETE /api/job-titles/:id**: Delete job title

**GET /api/departments**: List departments
**POST /api/departments**: Create department
**DELETE /api/departments/:id**: Delete department

---

## Phase 5: Frontend - Authentication & Layout

### 5.1 Authentication Pages

**Login Page** (`/login`):
- Email/password form
- Remember me checkbox
- Forgot password link
- Error handling

**Forgot Password Page** (`/forgot-password`):
- Email input
- OTP verification
- New password form

### 5.2 Auth Context

**client/src/contexts/AuthContext.tsx**:
```typescript
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (...roles: string[]) => boolean;
}
```

### 5.3 Protected Routes

**client/src/components/ProtectedRoute.tsx**:
- Check authentication
- Role-based access control
- Redirect to login if unauthorized

### 5.4 Layout Components

**Main Layout**:
- Sidebar navigation
- Header with user info & notifications
- Main content area
- Theme toggle (light/dark)

**Sidebar**:
- Dashboard link
- Team (supervisor/admin)
- Reports
- Shifts (admin/supervisor)
- Messages
- Admin panel (admin only)
- Profile
- Logout button

**Header**:
- Page title
- Notification bell with unread count
- User avatar/name
- Theme toggle

### 5.5 Theme Support

**client/src/contexts/ThemeContext.tsx**:
- Light/dark mode toggle
- Persist preference in localStorage
- Tailwind CSS dark mode

---

## Phase 6: Frontend - Dashboard & Attendance

### 6.1 Dashboard Page

**Stats Cards**:
- Hours worked today
- Attendance status
- Weekly summary
- Team status (for supervisors)

**Today's Attendance**:
- Check-in time
- Check-out time
- Duration (live timer)
- Status badge

**Quick Actions**:
- Check In button (when not checked in)
- Check Out button (when checked in)

### 6.2 Check-In/Out Modal

**client/src/components/CheckInModal.tsx**:

**Flow**:
1. Request GPS permission
2. Acquire position (watchPosition)
3. Select best accuracy reading
4. Reverse geocode coordinates
5. Display location on mini-map
6. Show distance from station
7. Validate geo-fence
8. Confirm check-in/out

**GPS Acquisition**:
```typescript
function acquireGPSPosition(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    const readings: GeolocationPosition[] = [];
    
    navigator.geolocation.watchPosition(
      (position) => {
        readings.push(position);
        // Select best accuracy after timeout
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}
```

**Location Picker Component**:
- Leaflet map showing current position
- Station boundary circle
- Distance indicator
- Accuracy meter
- Address display

### 6.3 Live Duration Timer

**client/src/hooks/useDurationTimer.ts**:
```typescript
function useDurationTimer(startTime: Date | null): string {
  // Returns HH:MM:SS format
  // Updates every second
}
```

### 6.4 Attendance History

**Recent Activity**:
- Last 7 days attendance
- Status badges
- Hours worked

**Attendance Table**:
- Date
- Check-in/out times
- Hours worked
- Status
- Actions (view details)

---

## Phase 7: Frontend - Admin Panel

### 7.1 User Management

**Users List** (`/admin/users`):
- Searchable table
- Filter by role, department, station
- Bulk actions
- Add user button

**Create/Edit User Form**:
- Employee ID
- Name, Email, Password
- Role selector
- Department, Job Title
- Station assignment
- Supervisor assignment

**Bulk User Import**:
- CSV upload
- Validation
- Preview before import

### 7.2 Court Stations Management

**Stations List** (`/admin/stations`):
- Table with name, coordinates, radius
- Map preview
- Add/Edit/Delete actions

**Station Form**:
- Name input
- Latitude/Longitude inputs
- Radius (meters) input
- Map picker for coordinates
- Preview geo-fence on map

### 7.3 Shifts Management

**Shifts List** (`/admin/shifts`):
- Table with name, times, days
- Assigned users count
- Add/Edit/Delete actions

**Shift Form**:
- Name input
- Start time picker
- End time picker
- Day checkboxes (Sun-Sat)
- Assign to users

### 7.4 Departments & Job Titles

**Simple CRUD lists**:
- Add new item
- Edit inline
- Delete with confirmation

### 7.5 Settings

**System Settings**:
- Standard work hours
- Late threshold
- Geo-fence accuracy limit
- Notification preferences

---

## Phase 8: Frontend - Reports & Analytics

### 8.1 Reports Page

**Date Range Picker**:
- Start date
- End date
- Quick presets (Today, This Week, This Month)

**Employee Filter**:
- Single/multi-select
- Department filter
- Station filter

### 8.2 Charts

**Bar Chart - Attendance by Day**:
- X-axis: dates
- Y-axis: count of present/absent/late

**Pie Chart - Status Distribution**:
- Present/absent/late/half-day/overtime percentages

**Line Chart - Hours Worked**:
- X-axis: dates
- Y-axis: hours worked per day

### 8.3 Weekly Summary

**Stats Cards**:
- Total present days
- Total absent days
- Total late days
- Total hours worked
- Average check-in time

### 8.4 Map View

**Leaflet Map**:
- Show check-in/out locations
- Color-coded pins
- Popup with details
- Station boundaries overlay

---

## Phase 9: Frontend - Messaging

### 9.1 Inbox Page

**Message List**:
- Sender name
- Subject
- Preview
- Timestamp
- Read/unread indicator
- Unread count badge

**Message Detail**:
- Full message content
- Mark as read
- Reply button
- Delete button

### 9.2 Sent Messages

- Similar to inbox
- Read status indicator

### 9.3 Compose Message

**Message Form**:
- To (user selector)
- Type (alert/message/notification)
- Subject
- Content
- Send button

### 9.4 System Alerts

Auto-generated alerts for:
- Late check-in
- Missed check-in
- Missed check-out
- Overtime

---

## Phase 10: Testing

### 10.1 Unit Tests

**Server Tests** (Jest/Vitest):
- Auth functions (token generation, password hashing)
- Haversine distance calculation
- Attendance status calculation
- Validation helpers

**Client Tests** (Vitest + React Testing Library):
- Utility functions
- Custom hooks
- Form validation
- Component rendering

### 10.2 Integration Tests

**API Tests** (Supertest):
- Auth endpoints
- CRUD operations
- Attendance check-in/out flow
- Permission checks

**Database Tests**:
- MongoDB operations
- Index performance
- Data integrity

### 10.3 E2E Tests

**Cypress/Playwright Tests**:
- Login/logout flow
- Check-in/out with GPS mock
- Admin user management
- Shift assignment
- Message sending
- Report generation

### 10.4 Test Configuration

**jest.config.js / vitest.config.ts**:
- Setup files
- Mock configurations
- Coverage settings

**cypress.config.ts**:
- Base URL
- Viewport settings
- API interceptors

---

## Phase 11: Deployment

### 11.1 MongoDB Atlas Setup

1. Create MongoDB Atlas account
2. Create cluster
3. Create database user
4. Whitelist IP addresses
5. Get connection string

### 11.2 Heroku/Railway Configuration

**Procfile** (Heroku):
```
web: node dist/server/index.js
```

**railway.json** (Railway):
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/api/health"
  }
}
```

### 11.3 Environment Variables

Set in Heroku/Railway dashboard:
- MONGODB_URI (Atlas connection string)
- JWT_SECRET (strong random string)
- NODE_ENV=production
- All other .env variables

### 11.4 Build Scripts

**package.json scripts**:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "npm run build:server && npm run build:client",
    "build:server": "cd server && npm run build",
    "build:client": "cd client && npm run build",
    "start": "cd server && npm start",
    "test": "npm run test:server && npm run test:client",
    "test:server": "cd server && npm test",
    "test:client": "cd client && npm test"
  }
}
```

### 11.5 Documentation

**README.md**:
- Project overview
- Features list
- Tech stack
- Getting started
- Environment setup
- Running locally
- Deployment guide
- API documentation
- Contributing guidelines

**DEPLOYMENT.md**:
- MongoDB Atlas setup
- Heroku/Railway deployment
- Environment variables
- Troubleshooting

---

## Implementation Order

1. **Week 1**: Phase 1-2 (Setup + Database)
2. **Week 2**: Phase 3-4 (Auth + API)
3. **Week 3**: Phase 5-6 (Frontend Auth + Dashboard)
4. **Week 4**: Phase 7 (Admin Panel)
5. **Week 5**: Phase 8-9 (Reports + Messaging)
6. **Week 6**: Phase 10-11 (Testing + Deployment)

---

## Estimated Time

- **Total**: ~6 weeks (full-time)
- **MVP (Core features)**: ~3 weeks
- **Full implementation**: ~6 weeks
- **With testing**: ~8 weeks

---

## Key Technical Decisions

1. **JWT over Sessions**: Stateless, works well for APIs, easy to implement
2. **MongoDB Official Driver over Mongoose**: More control, better performance
3. **shadcn/ui over Material UI**: Modern, customizable, Radix-based
4. **Leaflet over Mapbox**: Free, OpenStreetMap-based, no API key required
5. **Recharts over Chart.js**: Better React integration, declarative

---

## Risk Mitigation

1. **GPS Accuracy**: Implement retry logic, fallback to manual entry
2. **Offline Support**: Consider service workers for offline check-in
3. **Performance**: Index all frequently queried fields
4. **Security**: Rate limiting, input validation, CORS configuration
5. **Scalability**: Pagination, lazy loading, caching strategies

---

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Start with Phase 1: Project Setup
4. Begin implementation

---

*Last updated: [Current Date]*
