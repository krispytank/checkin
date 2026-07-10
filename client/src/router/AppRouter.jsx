import { lazy, Suspense } from 'react';
import { Route, Switch, Redirect } from 'wouter';
import { useAuth } from '../contexts/AuthContext.jsx';
import MainLayout from '../layouts/MainLayout.jsx';

// Loading spinner for lazy-loaded routes
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Lazy-loaded page components (code-split into separate chunks)
const LoginPage = lazy(() => import('../pages/LoginPage.jsx'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage.jsx'));
const LandingPage = lazy(() => import('../pages/LandingPage.jsx'));
const ProfilePage = lazy(() => import('../pages/ProfilePage.jsx'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));

// Dashboard
const UnifiedDashboardPage = lazy(() => import('../pages/dashboard/UnifiedDashboardPage.jsx'));

// Attendance module
const AttendanceDashboardPage = lazy(() => import('../pages/attendance/DashboardPage.jsx'));
const TeamPage = lazy(() => import('../pages/attendance/TeamPage.jsx'));
const ReportsPage = lazy(() => import('../pages/attendance/ReportsPage.jsx'));
const ShiftsPage = lazy(() => import('../pages/attendance/ShiftsPage.jsx'));
const MessagesPage = lazy(() => import('../pages/attendance/MessagesPage.jsx'));

// Equipment module
const EquipmentDashboardPage = lazy(() => import('../pages/equipment/EquipmentDashboardPage.jsx'));
const BookEquipmentPage = lazy(() => import('../pages/equipment/BookEquipmentPage.jsx'));
const ManageBookingsPage = lazy(() => import('../pages/equipment/ManageBookingsPage.jsx'));

// Fleet module
const FleetDashboardPage = lazy(() => import('../pages/fleet/FleetDashboardPage.jsx'));
const VehiclesPage = lazy(() => import('../pages/fleet/VehiclesPage.jsx'));
const TripsPage = lazy(() => import('../pages/fleet/TripsPage.jsx'));
const ParkingPage = lazy(() => import('../pages/fleet/ParkingPage.jsx'));
const CheckInOutPage = lazy(() => import('../pages/fleet/CheckInOutPage.jsx'));
const FleetReportsPage = lazy(() => import('../pages/fleet/FleetReportsPage.jsx'));

// File movement module
const FileMovementDashboardPage = lazy(() => import('../pages/fileMovement/FileMovementDashboardPage.jsx'));
const CaseFilesPage = lazy(() => import('../pages/fileMovement/CaseFilesPage.jsx'));
const FileRequestsPage = lazy(() => import('../pages/fileMovement/FileRequestsPage.jsx'));
const StrongRoomPage = lazy(() => import('../pages/fileMovement/StrongRoomPage.jsx'));
const FileReportsPage = lazy(() => import('../pages/fileMovement/FileReportsPage.jsx'));

// Admin pages
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage.jsx'));
const AdminStationsPage = lazy(() => import('../pages/admin/AdminStationsPage.jsx'));
const AdminShiftsPage = lazy(() => import('../pages/admin/AdminShiftsPage.jsx'));
const AdminDepartmentsPage = lazy(() => import('../pages/admin/AdminDepartmentsPage.jsx'));
const AdminJobTitlesPage = lazy(() => import('../pages/admin/AdminJobTitlesPage.jsx'));
const AdminEquipmentItemsPage = lazy(() => import('../pages/admin/AdminEquipmentItemsPage.jsx'));
const AdminBookersPage = lazy(() => import('../pages/admin/AdminBookersPage.jsx'));
const AdminFleetVehiclesPage = lazy(() => import('../pages/admin/AdminFleetVehiclesPage.jsx'));
const AdminFleetParkingPage = lazy(() => import('../pages/admin/AdminFleetParkingPage.jsx'));
const AdminRegistriesPage = lazy(() => import('../pages/admin/AdminRegistriesPage.jsx'));
const AdminAuditLogsPage = lazy(() => import('../pages/admin/AdminAuditLogsPage.jsx'));

function ProtectedRoute({ children, requiredRoles = [] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  return children;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public Routes */}
        <Route path="/login">
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        </Route>
        <Route path="/forgot-password">
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        </Route>

        {/* Protected Routes */}
        <Route path="/">
          <ProtectedRoute>
            <LandingPage />
          </ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute>
            <MainLayout>
              <ProfilePage />
            </MainLayout>
          </ProtectedRoute>
        </Route>

        {/* Unified Dashboard */}
        <Route path="/dashboard">
          <ProtectedRoute>
            <MainLayout>
              <UnifiedDashboardPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>

        {/* Time Attendance Module */}
        <Route path="/attendance/dashboard">
          <ProtectedRoute>
            <MainLayout module="attendance">
              <AttendanceDashboardPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/attendance/team">
          <ProtectedRoute requiredRoles={['admin', 'supervisor']}>
            <MainLayout module="attendance">
              <TeamPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/attendance/reports">
          <ProtectedRoute>
            <MainLayout module="attendance">
              <ReportsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/attendance/shifts">
          <ProtectedRoute requiredRoles={['admin', 'supervisor']}>
            <MainLayout module="attendance">
              <ShiftsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/attendance/messages">
          <ProtectedRoute>
            <MainLayout module="attendance">
              <MessagesPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>

        {/* Equipment Booking Module */}
        <Route path="/equipment/dashboard">
          <ProtectedRoute>
            <MainLayout module="equipment">
              <EquipmentDashboardPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/equipment/book">
          <ProtectedRoute>
            <MainLayout module="equipment">
              <BookEquipmentPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/equipment/manage">
          <ProtectedRoute>
            <MainLayout module="equipment">
              <ManageBookingsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>

        {/* Fleet Management Module */}
        <Route path="/fleet/dashboard">
          <ProtectedRoute>
            <MainLayout module="fleet">
              <FleetDashboardPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/fleet/vehicles">
          <ProtectedRoute>
            <MainLayout module="fleet">
              <VehiclesPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/fleet/trips">
          <ProtectedRoute>
            <MainLayout module="fleet">
              <TripsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/fleet/parking">
          <ProtectedRoute>
            <MainLayout module="fleet">
              <ParkingPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/fleet/checkin">
          <ProtectedRoute>
            <MainLayout module="fleet">
              <CheckInOutPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/fleet/reports">
          <ProtectedRoute>
            <MainLayout module="fleet">
              <FleetReportsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/users">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminUsersPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin/stations">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminStationsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin/shifts">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminShiftsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin/departments">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminDepartmentsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin/job-titles">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminJobTitlesPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin/equipment/items">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminEquipmentItemsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin/equipment/bookers">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminBookersPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin/fleet/vehicles">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminFleetVehiclesPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin/fleet/parking">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminFleetParkingPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin/file-movement/registries">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminRegistriesPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin/audit-logs">
          <ProtectedRoute requiredRoles={['admin']}>
            <MainLayout>
              <AdminAuditLogsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>

        {/* File Movement Module Routes */}
        <Route path="/file-movement/dashboard">
          <ProtectedRoute>
            <MainLayout module="fileMovement">
              <FileMovementDashboardPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/file-movement/case-files">
          <ProtectedRoute>
            <MainLayout module="fileMovement">
              <CaseFilesPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/file-movement/requests">
          <ProtectedRoute>
            <MainLayout module="fileMovement">
              <FileRequestsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/file-movement/strong-room">
          <ProtectedRoute>
            <MainLayout module="fileMovement">
              <StrongRoomPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/file-movement/reports">
          <ProtectedRoute>
            <MainLayout module="fileMovement">
              <FileReportsPage />
            </MainLayout>
          </ProtectedRoute>
        </Route>

        {/* Default redirect */}
        <Route path="/">
          <Redirect to="/" />
        </Route>

        {/* 404 */}
        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
    </Suspense>
  );
}
