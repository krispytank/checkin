import { Route, Switch, Redirect } from 'wouter';
import { useAuth } from '../contexts/AuthContext.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import UnifiedDashboardPage from '../pages/dashboard/UnifiedDashboardPage.jsx';
import DashboardPage from '../pages/attendance/DashboardPage.jsx';
import TeamPage from '../pages/attendance/TeamPage.jsx';
import ReportsPage from '../pages/attendance/ReportsPage.jsx';
import ShiftsPage from '../pages/attendance/ShiftsPage.jsx';
import MessagesPage from '../pages/attendance/MessagesPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx';
import AdminStationsPage from '../pages/admin/AdminStationsPage.jsx';
import AdminShiftsPage from '../pages/admin/AdminShiftsPage.jsx';
import AdminDepartmentsPage from '../pages/admin/AdminDepartmentsPage.jsx';
import AdminJobTitlesPage from '../pages/admin/AdminJobTitlesPage.jsx';
import AdminEquipmentItemsPage from '../pages/admin/AdminEquipmentItemsPage.jsx';
import AdminBookersPage from '../pages/admin/AdminBookersPage.jsx';
import AdminFleetVehiclesPage from '../pages/admin/AdminFleetVehiclesPage.jsx';
import AdminFleetParkingPage from '../pages/admin/AdminFleetParkingPage.jsx';
import EquipmentDashboardPage from '../pages/equipment/EquipmentDashboardPage.jsx';
import BookEquipmentPage from '../pages/equipment/BookEquipmentPage.jsx';
import ManageBookingsPage from '../pages/equipment/ManageBookingsPage.jsx';
import FleetDashboardPage from '../pages/fleet/FleetDashboardPage.jsx';
import VehiclesPage from '../pages/fleet/VehiclesPage.jsx';
import TripsPage from '../pages/fleet/TripsPage.jsx';
import ParkingPage from '../pages/fleet/ParkingPage.jsx';
import CheckInOutPage from '../pages/fleet/CheckInOutPage.jsx';
import AdminAuditLogsPage from '../pages/admin/AdminAuditLogsPage.jsx';
import AdminRegistriesPage from '../pages/admin/AdminRegistriesPage.jsx';
import FileMovementDashboardPage from '../pages/fileMovement/FileMovementDashboardPage.jsx';
import CaseFilesPage from '../pages/fileMovement/CaseFilesPage.jsx';
import FileRequestsPage from '../pages/fileMovement/FileRequestsPage.jsx';
import StrongRoomPage from '../pages/fileMovement/StrongRoomPage.jsx';
import FleetReportsPage from '../pages/fleet/FleetReportsPage.jsx';
import FileReportsPage from '../pages/fileMovement/FileReportsPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

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
            <DashboardPage />
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

      {/* File Movement Module Routes */}
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

      {/* Equipment Admin Routes */}
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

      {/* Fleet Admin Routes */}
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

      {/* File Movement Admin Routes */}
      <Route path="/admin/file-movement/registries">
        <ProtectedRoute requiredRoles={['admin']}>
          <MainLayout>
            <AdminRegistriesPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>

      {/* Audit Logs Admin Route */}
      <Route path="/admin/audit-logs">
        <ProtectedRoute requiredRoles={['admin']}>
          <MainLayout>
            <AdminAuditLogsPage />
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
  );
}
