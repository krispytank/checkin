import { Route, Switch, Redirect } from 'wouter';
import { useAuth } from '../contexts/AuthContext.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import TeamPage from '../pages/TeamPage.jsx';
import ReportsPage from '../pages/ReportsPage.jsx';
import ShiftsPage from '../pages/ShiftsPage.jsx';
import MessagesPage from '../pages/MessagesPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx';
import AdminStationsPage from '../pages/admin/AdminStationsPage.jsx';
import AdminShiftsPage from '../pages/admin/AdminShiftsPage.jsx';
import AdminDepartmentsPage from '../pages/admin/AdminDepartmentsPage.jsx';
import AdminJobTitlesPage from '../pages/admin/AdminJobTitlesPage.jsx';
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
    return <Redirect to="/dashboard" />;
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
    return <Redirect to="/dashboard" />;
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
      <Route path="/dashboard">
        <ProtectedRoute>
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/team">
        <ProtectedRoute requiredRoles={['admin', 'supervisor']}>
          <MainLayout>
            <TeamPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <MainLayout>
            <ReportsPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/shifts">
        <ProtectedRoute requiredRoles={['admin', 'supervisor']}>
          <MainLayout>
            <ShiftsPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/messages">
        <ProtectedRoute>
          <MainLayout>
            <MessagesPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <MainLayout>
            <ProfilePage />
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

      {/* Default redirect */}
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      {/* 404 */}
      <Route>
        <NotFoundPage />
      </Route>
    </Switch>
  );
}
