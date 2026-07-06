import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { 
  Users, FileText, Calendar, MessageSquare,
  User, Settings, LogOut, Menu, X, Sun, Moon, ChevronDown,
  Shield, Home, Clock, MapPin, Briefcase, Building, Car, Truck, Package, MonitorCog
} from 'lucide-react';
import { getInitials, cn } from '../lib/utils.js';

const timeAttendanceChildren = [
  { name: 'Dashboard', href: '/attendance/dashboard', icon: Clock },
  { name: 'Team', href: '/attendance/team', icon: Users, roles: ['admin', 'supervisor'] },
  { name: 'Shifts', href: '/attendance/shifts', icon: Calendar, roles: ['admin', 'supervisor'] },
  { name: 'Reports', href: '/attendance/reports', icon: FileText },
  { name: 'Messages', href: '/attendance/messages', icon: MessageSquare },
];

const fleetNavigation = [
  { name: 'Dashboard', href: '/fleet/dashboard', icon: Clock },
  { name: 'Vehicles', href: '/fleet/vehicles', icon: Car },
  { name: 'Trips', href: '/fleet/trips', icon: Truck },
  { name: 'Parking', href: '/fleet/parking', icon: MapPin },
];

const equipmentNavigation = [
  { name: 'Dashboard', href: '/equipment/dashboard', icon: Clock },
  { name: 'Book Equipment', href: '/equipment/book', icon: Package },
  { name: 'Manage Bookings', href: '/equipment/manage', icon: FileText },
];

const adminNavigation = [
  {
    name: 'Attendance',
    icon: Clock,
    children: [
      { name: 'User Management', href: '/admin/users', icon: Users },
      { name: 'Court Stations', href: '/admin/stations', icon: MapPin },
      { name: 'Shift Templates', href: '/admin/shifts', icon: Calendar },
      { name: 'Departments', href: '/admin/departments', icon: Building },
      { name: 'Job Titles', href: '/admin/job-titles', icon: Briefcase },
    ],
  },
  {
    name: 'Equipment',
    icon: Settings,
    children: [
      { name: 'Equipment Items', href: '/admin/equipment/items', icon: MonitorCog },
      { name: 'Designated Bookers', href: '/admin/equipment/bookers', icon: Users },
    ],
  },
  {
    name: 'Fleet',
    icon: Car,
    children: [
      { name: 'Vehicles', href: '/admin/fleet/vehicles', icon: Car },
      { name: 'Parking Spaces', href: '/admin/fleet/parking', icon: MapPin },
    ],
  },
];

const mobileNavItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Attend', href: '/attendance/dashboard', icon: Clock },
  { name: 'Reports', href: '/attendance/reports', icon: FileText },
  { name: 'More', href: '__more__', icon: Settings },
];

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [fleetOpen, setFleetOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [adminAttendanceOpen, setAdminAttendanceOpen] = useState(false);
  const [adminEquipmentOpen, setAdminEquipmentOpen] = useState(false);
  const [adminFleetOpen, setAdminFleetOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Auto-expand sections that contain the active route
  const isAttendanceChild = timeAttendanceChildren.some(
    c => location === c.href && (!c.roles || c.roles.includes(user?.role))
  );

  const isEquipmentChild = equipmentNavigation.some(c => location === c.href);

  const isFleetChild = fleetNavigation.some(c => location === c.href);

  const isAdminAttendanceChild = adminNavigation[0].children.some(c => location === c.href);
  const isAdminEquipmentChild = adminNavigation[1].children.some(c => location === c.href);
  const isAdminFleetChild = adminNavigation[2].children.some(c => location === c.href);

  const filteredAttendance = timeAttendanceChildren.filter(
    c => !c.roles || c.roles.includes(user?.role)
  );

  const handleLogout = async () => {
    await logout();
  };

  const renderCollapsibleSection = (label, Icon, isOpen, toggle, children, isActive) => (
    <div className="pt-2">
      <button
        onClick={toggle}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          {label}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>
      {isOpen && (
        <div className="mt-1 space-y-1">
          {children.map((item) => {
            const ChildIcon = item.icon;
            const active = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 pl-11 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <ChildIcon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">Mahakama Access</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {/* Home */}
            <Link
              href="/"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location === '/'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Home className="h-5 w-5" />
              Home
            </Link>

            {/* Time Attendance section */}
            {filteredAttendance.length > 0 && renderCollapsibleSection(
              'Time Attendance',
              Clock,
              attendanceOpen || isAttendanceChild,
              () => setAttendanceOpen(!attendanceOpen),
              filteredAttendance,
              isAttendanceChild
            )}

            {/* Equipment Booking section */}
            {renderCollapsibleSection(
              'Equipment Booking',
              Package,
              equipmentOpen || isEquipmentChild,
              () => setEquipmentOpen(!equipmentOpen),
              equipmentNavigation,
              isEquipmentChild
            )}

            {/* Fleet Management section */}
            {renderCollapsibleSection(
              'Fleet Management',
              Car,
              fleetOpen || isFleetChild,
              () => setFleetOpen(!fleetOpen),
              fleetNavigation,
              isFleetChild
            )}

            {/* Admin section */}
            {hasRole('admin') && (
              <div className="pt-2">
                <button
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    adminNavigation.some(group => group.children.some(c => location === c.href))
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Settings className="h-5 w-5" />
                    Admin
                  </span>
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", adminMenuOpen && "rotate-180")}
                  />
                </button>
                {adminMenuOpen && (
                  <div className="mt-1 space-y-1">
                    {/* Attendance Admin Group */}
                    <button
                      onClick={() => setAdminAttendanceOpen(!adminAttendanceOpen)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 pl-11 text-sm font-medium transition-colors",
                        isAdminAttendanceChild
                          ? "text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Clock className="h-4 w-4" />
                        Attendance
                      </span>
                      <ChevronDown
                        className={cn("h-3 w-3 transition-transform", (adminAttendanceOpen || isAdminAttendanceChild) && "rotate-180")}
                      />
                    </button>
                    {(adminAttendanceOpen || isAdminAttendanceChild) && (
                      <div className="space-y-1">
                        {adminNavigation[0].children.map((item) => {
                          const ChildIcon = item.icon;
                          const active = location === item.href;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 pl-16 text-sm font-medium transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <ChildIcon className="h-4 w-4" />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* Equipment Admin Group */}
                    <button
                      onClick={() => setAdminEquipmentOpen(!adminEquipmentOpen)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 pl-11 text-sm font-medium transition-colors",
                        isAdminEquipmentChild
                          ? "text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Package className="h-4 w-4" />
                        Equipment
                      </span>
                      <ChevronDown
                        className={cn("h-3 w-3 transition-transform", (adminEquipmentOpen || isAdminEquipmentChild) && "rotate-180")}
                      />
                    </button>
                    {(adminEquipmentOpen || isAdminEquipmentChild) && (
                      <div className="space-y-1">
                        {adminNavigation[1].children.map((item) => {
                          const ChildIcon = item.icon;
                          const active = location === item.href;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 pl-16 text-sm font-medium transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <ChildIcon className="h-4 w-4" />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* Fleet Admin Group */}
                    <button
                      onClick={() => setAdminFleetOpen(!adminFleetOpen)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 pl-11 text-sm font-medium transition-colors",
                        isAdminFleetChild
                          ? "text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Car className="h-4 w-4" />
                        Fleet
                      </span>
                      <ChevronDown
                        className={cn("h-3 w-3 transition-transform", (adminFleetOpen || isAdminFleetChild) && "rotate-180")}
                      />
                    </button>
                    {(adminFleetOpen || isAdminFleetChild) && (
                      <div className="space-y-1">
                        {adminNavigation[2].children.map((item) => {
                          const ChildIcon = item.icon;
                          const active = location === item.href;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 pl-16 text-sm font-medium transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <ChildIcon className="h-4 w-4" />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                {getInitials(user?.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:h-16 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted -ml-1"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="lg:hidden flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <span className="text-base font-bold">Mahakama Access</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted">
              {theme === 'dark' ? <Sun className="h-4 w-4 lg:h-5 lg:w-5" /> : <Moon className="h-4 w-4 lg:h-5 lg:w-5" />}
            </button>
            <Link href="/profile" className="p-2 rounded-lg hover:bg-muted">
              <User className="h-4 w-4 lg:h-5 lg:w-5" />
            </Link>
            {hasRole('admin') && (
              <Link href="/admin/users" className="p-2 rounded-lg hover:bg-muted">
                <Settings className="h-4 w-4 lg:h-5 lg:w-5" />
              </Link>
            )}
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4 lg:h-5 lg:w-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      {/* ===== MOBILE BOTTOM NAV BAR ===== */}
      <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-card/95 backdrop-blur-lg border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isMore = item.href === '__more__';
            const isActive = !isMore && location === item.href;

            if (isMore) {
              return (
                <div key="more" className="relative">
                  <button
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[56px]",
                      moreMenuOpen ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">More</span>
                  </button>

                  {moreMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />
                      <div className="absolute bottom-full right-0 mb-2 w-60 rounded-xl border bg-card shadow-xl z-50 py-2 overflow-y-auto max-h-[70vh]">
                        {/* Time Attendance group */}
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Time Attendance
                        </div>
                        {filteredAttendance.map((item) => {
                          const NavIcon = item.icon;
                          const active = location === item.href;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                              )}
                              onClick={() => setMoreMenuOpen(false)}
                            >
                              <NavIcon className="h-4 w-4" />
                              {item.name}
                            </Link>
                          );
                        })}

                        {/* Equipment Booking group */}
                        <div className="border-t mt-1 pt-1">
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Equipment Booking
                          </div>
                          {equipmentNavigation.map((item) => {
                            const NavIcon = item.icon;
                            const active = location === item.href;
                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                                )}
                                onClick={() => setMoreMenuOpen(false)}
                              >
                                <NavIcon className="h-4 w-4" />
                                {item.name}
                              </Link>
                            );
                          })}
                        </div>

                        {/* Fleet Management group */}
                        <div className="border-t mt-1 pt-1">
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Fleet Management
                          </div>
                          {fleetNavigation.map((item) => {
                            const NavIcon = item.icon;
                            const active = location === item.href;
                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                                )}
                                onClick={() => setMoreMenuOpen(false)}
                              >
                                <NavIcon className="h-4 w-4" />
                                {item.name}
                              </Link>
                            );
                          })}
                        </div>

                        {/* Admin group */}
                        {hasRole('admin') && (
                          <div className="border-t mt-1 pt-1">
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Admin
                            </div>
                            {adminNavigation.map((group) => {
                              const GroupIcon = group.icon;
                              return (
                                <div key={group.name}>
                                  <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <GroupIcon className="h-3 w-3" />
                                    {group.name}
                                  </div>
                                  {group.children.map((item) => {
                                    const NavIcon = item.icon;
                                    const active = location === item.href;
                                    return (
                                      <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                          "flex items-center gap-3 px-3 py-2 pl-8 text-sm font-medium transition-colors",
                                          active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                                        )}
                                        onClick={() => setMoreMenuOpen(false)}
                                      >
                                        <NavIcon className="h-4 w-4" />
                                        {item.name}
                                      </Link>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="border-t mt-1 pt-1">
                          <button
                            onClick={() => { handleLogout(); setMoreMenuOpen(false); }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[56px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {isActive && <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />}
                </div>
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
