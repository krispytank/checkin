import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import {
  Users, FileText, Calendar,
  Settings, LogOut, X, Sun, Moon, ChevronDown,
  Home, Clock, MapPin, Briefcase, Building, Car, Truck,
  Package, MonitorCog, QrCode, PanelLeftClose, PanelLeft,
  Shield, FolderOpen,
} from 'lucide-react';
import { getInitials, cn } from '../lib/utils.js';
import SidebarTooltip from './SidebarTooltip.jsx';

const timeAttendanceChildren = [
  { name: 'Dashboard', href: '/attendance/dashboard', icon: Clock },
  { name: 'Team', href: '/attendance/team', icon: Users, roles: ['admin', 'supervisor'] },
  { name: 'Shifts', href: '/attendance/shifts', icon: Calendar, roles: ['admin', 'supervisor'] },
  { name: 'Reports', href: '/attendance/reports', icon: FileText },
];

const fleetNavigation = [
  { name: 'Dashboard', href: '/fleet/dashboard', icon: Clock },
  { name: 'Vehicles', href: '/fleet/vehicles', icon: Car },
  { name: 'Trips', href: '/fleet/trips', icon: Truck },
  { name: 'Parking', href: '/fleet/parking', icon: MapPin },
  { name: 'Check In/Out', href: '/fleet/checkin', icon: QrCode },
  { name: 'Reports', href: '/fleet/reports', icon: FileText },
];

const equipmentNavigation = [
  { name: 'Dashboard', href: '/equipment/dashboard', icon: Clock },
  { name: 'Book Equipment', href: '/equipment/book', icon: Package },
  { name: 'Manage Bookings', href: '/equipment/manage', icon: FileText },
];

const fileMovementNavigation = [
  { name: 'Dashboard', href: '/file-movement/dashboard', icon: Clock },
  { name: 'Case Files', href: '/file-movement/case-files', icon: FolderOpen },
  { name: 'File Requests', href: '/file-movement/requests', icon: FileText },
  { name: 'Strong Room', href: '/file-movement/strong-room', icon: Shield },
  { name: 'Reports', href: '/file-movement/reports', icon: FileText },
];

const adminNavigation = [
  {
    name: 'Users', icon: Users,
    children: [
      { name: 'User Management', href: '/admin/users', icon: Users },
    ],
  },
  {
    name: 'Attendance', icon: Clock,
    children: [
      { name: 'Court Stations', href: '/admin/stations', icon: MapPin },
      { name: 'Shift Templates', href: '/admin/shifts', icon: Calendar },
      { name: 'Departments', href: '/admin/departments', icon: Building },
      { name: 'Job Titles', href: '/admin/job-titles', icon: Briefcase },
    ],
  },
  {
    name: 'Equipment', icon: Settings,
    children: [
      { name: 'Equipment Items', href: '/admin/equipment/items', icon: MonitorCog },
      { name: 'Designated Bookers', href: '/admin/equipment/bookers', icon: Users },
    ],
  },
  {
    name: 'Fleet', icon: Car,
    children: [
      { name: 'Vehicles', href: '/admin/fleet/vehicles', icon: Car },
      { name: 'Parking Spaces', href: '/admin/fleet/parking', icon: MapPin },
    ],
  },
  {
    name: 'File Movement', icon: FolderOpen,
    children: [
      { name: 'Registries', href: '/admin/file-movement/registries', icon: FolderOpen },
    ],
  },
  {
    name: 'Audit', icon: Shield,
    children: [
      { name: 'Audit Logs', href: '/admin/audit-logs', icon: Shield },
    ],
  },
];

function NavLink({ href, icon: Icon, label, active, collapsed, onClick, indent }) {
  const content = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center rounded-xl transition-all duration-200",
        collapsed ? "justify-center h-10 mx-2" : "gap-3 px-3 py-2.5",
        indent && !collapsed && "pl-11",
        indent && collapsed && "pl-0",
        active
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full transition-all duration-200" />
      )}
      <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105")} />
      {!collapsed && (
        <span className="text-sm font-medium truncate">{label}</span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <SidebarTooltip label={label} disabled={!collapsed}>
        {content}
      </SidebarTooltip>
    );
  }
  return content;
}

function CollapsibleSection({ label, icon: Icon, isOpen, onToggle, children, active, collapsed }) {
  if (collapsed) {
    return (
      <SidebarTooltip label={label}>
        <div className="relative">
          <button
            onClick={onToggle}
            className={cn(
              "group flex w-full items-center justify-center h-10 mx-2 rounded-xl transition-all duration-200",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {active && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
            )}
            <Icon className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
          </button>
        </div>
      </SidebarTooltip>
    );
  }

  return (
    <div className="pt-1">
      <button
        onClick={onToggle}
        className={cn(
          "group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="mt-1 space-y-0.5">
          {children}
        </div>
      </div>
    </div>
  );
}

function AdminGroup({ group, isOpen, onToggle, location, collapsed, onClick }) {
  const hasActiveChild = group.children.some(c => location === c.href);

  if (collapsed) {
    return (
      <SidebarTooltip label={group.name}>
        <div className="relative">
          <button
            onClick={onToggle}
            className={cn(
              "group flex w-full items-center justify-center h-10 mx-2 rounded-xl transition-all duration-200",
              hasActiveChild
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {hasActiveChild && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
            )}
            <group.icon className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
          </button>
        </div>
      </SidebarTooltip>
    );
  }

  return (
    <div className="ml-1">
      {/* Group header */}
      <button
        onClick={onToggle}
        className={cn(
          "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          hasActiveChild
            ? "text-foreground bg-muted/50"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span className="flex items-center gap-2.5">
          <group.icon className="h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate">{group.name}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200 opacity-50",
            (isOpen || hasActiveChild) && "rotate-180",
          )}
        />
      </button>

      {/* Group children */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          (isOpen || hasActiveChild) ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="ml-2 pl-3 border-l border-border/50 space-y-0.5 py-1">
          {group.children.map((item) => (
            <NavLink
              key={item.name}
              href={item.href}
              icon={item.icon}
              label={item.name}
              active={location === item.href}
              collapsed={collapsed}
              onClick={onClick}
              indent
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }) {
  const [location] = useLocation();
  const { user, logout, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const drawerRef = useRef(null);

  const [openSections, setOpenSections] = useState({
    attendance: false,
    equipment: false,
    fleet: false,
    fileMovement: false,
    admin: false,
    adminUsers: false,
    adminAttendance: false,
    adminEquipment: false,
    adminFleet: false,
    adminFileMovement: false,
    adminAudit: false,
  });

  const toggleSection = useCallback((key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isAttendanceChild = timeAttendanceChildren.some(
    c => location === c.href && (!c.roles || c.roles.includes(user?.role))
  );
  const isEquipmentChild = equipmentNavigation.some(c => location === c.href);
  const isFleetChild = fleetNavigation.some(c => location === c.href);
  const isFileMovementChild = fileMovementNavigation.some(c => location === c.href);
  const isAdminChild = adminNavigation.some(g => g.children.some(c => location === c.href));

  const filteredAttendance = timeAttendanceChildren.filter(
    c => !c.roles || c.roles.includes(user?.role)
  );

  // Auto-expand sections containing the active route
  useEffect(() => {
    setOpenSections(prev => {
      const next = { ...prev };

      if (isAttendanceChild) next.attendance = true;
      else if (isEquipmentChild) next.equipment = true;
      else if (isFleetChild) next.fleet = true;
      else if (isFileMovementChild) next.fileMovement = true;
      else if (isAdminChild) {
        next.admin = true;
        // Also auto-expand the relevant admin sub-group
        for (let i = 0; i < adminNavigation.length; i++) {
          const isActive = adminNavigation[i].children.some(c => location === c.href);
          if (isActive) {
            next[`admin${adminNavigation[i].name}`] = true;
          }
        }
      }

      return next;
    });
  }, [isAttendanceChild, isEquipmentChild, isFleetChild, isFileMovementChild, isAdminChild, location]);

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose();
  }, [location, onMobileClose]);

  // Escape key closes mobile drawer
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && mobileOpen) onMobileClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileOpen, onMobileClose]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleNavClick = useCallback(() => {
    onMobileClose();
  }, [onMobileClose]);

  const handleLogout = async () => {
    onMobileClose();
    await logout();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        "flex h-16 shrink-0 items-center border-b",
        collapsed ? "justify-center px-2" : "justify-between px-4",
      )}>
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <img
            src="/jud-logo.png"
            alt="Mahakama"
            className="h-8 w-8 shrink-0 rounded-lg object-contain"
          />
          {!collapsed && (
            <span className="text-lg font-bold truncate whitespace-nowrap">
              Mahakama Access
            </span>
          )}
        </Link>
        {/* Collapse/Expand toggle — always visible at top */}
        <SidebarTooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} disabled={!collapsed}>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </SidebarTooltip>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-3 space-y-0.5 scrollbar-thin",
        collapsed ? "px-2" : "px-3",
      )}>
        {/* Home */}
        <NavLink
          href="/"
          icon={Home}
          label="Home"
          active={location === '/'}
          collapsed={collapsed}
          onClick={handleNavClick}
        />

        {/* Divider */}
        <div className={cn("my-2", collapsed ? "mx-2" : "")}>
          <div className="h-px bg-border" />
        </div>

        {/* Time Attendance */}
        {filteredAttendance.length > 0 && (
          <CollapsibleSection
            label="Time Attendance"
            icon={Clock}
            isOpen={openSections.attendance}
            onToggle={() => toggleSection('attendance')}
            active={isAttendanceChild}
            collapsed={collapsed}
          >
            {filteredAttendance.map((item) => (
              <NavLink
                key={item.name}
                href={item.href}
                icon={item.icon}
                label={item.name}
                active={location === item.href}
                collapsed={collapsed}
                onClick={handleNavClick}
                indent
              />
            ))}
          </CollapsibleSection>
        )}

        {/* Equipment Booking */}
        <CollapsibleSection
          label="Equipment Booking"
          icon={Package}
          isOpen={openSections.equipment}
          onToggle={() => toggleSection('equipment')}
          active={isEquipmentChild}
          collapsed={collapsed}
        >
          {equipmentNavigation.map((item) => (
            <NavLink
              key={item.name}
              href={item.href}
              icon={item.icon}
              label={item.name}
              active={location === item.href}
              collapsed={collapsed}
              onClick={handleNavClick}
              indent
            />
          ))}
        </CollapsibleSection>

        {/* Fleet Management */}
        <CollapsibleSection
          label="Fleet Management"
          icon={Car}
          isOpen={openSections.fleet}
          onToggle={() => toggleSection('fleet')}
          active={isFleetChild}
          collapsed={collapsed}
        >
          {fleetNavigation.map((item) => (
            <NavLink
              key={item.name}
              href={item.href}
              icon={item.icon}
              label={item.name}
              active={location === item.href}
              collapsed={collapsed}
              onClick={handleNavClick}
              indent
            />
          ))}
        </CollapsibleSection>

        {/* File Movement */}
        <CollapsibleSection
          label="File Movement"
          icon={FolderOpen}
          isOpen={openSections.fileMovement}
          onToggle={() => toggleSection('fileMovement')}
          active={isFileMovementChild}
          collapsed={collapsed}
        >
          {fileMovementNavigation.map((item) => (
            <NavLink
              key={item.name}
              href={item.href}
              icon={item.icon}
              label={item.name}
              active={location === item.href}
              collapsed={collapsed}
              onClick={handleNavClick}
              indent
            />
          ))}
        </CollapsibleSection>

        {/* Admin */}
        {hasRole('admin') && (
          <>
            <div className={cn("my-2", collapsed ? "mx-2" : "")}>
              <div className="h-px bg-border" />
            </div>

            <CollapsibleSection
              label="Admin"
              icon={Settings}
              isOpen={openSections.admin}
              onToggle={() => toggleSection('admin')}
              active={isAdminChild}
              collapsed={collapsed}
            >
              <div className="space-y-1">
                {adminNavigation.map((group) => (
                  <AdminGroup
                    key={group.name}
                    group={group}
                    isOpen={openSections[`admin${group.name}`] || false}
                    onToggle={() => toggleSection(`admin${group.name}`)}
                    location={location}
                    collapsed={collapsed}
                    onClick={handleNavClick}
                  />
                ))}
              </div>
            </CollapsibleSection>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className={cn("shrink-0 border-t", collapsed ? "px-2 py-3" : "px-3 py-3")}>
        {/* Theme toggle */}
        {!collapsed ? (
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 shrink-0" />
            ) : (
              <Moon className="h-5 w-5 shrink-0" />
            )}
            <span className="truncate">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        ) : (
          <SidebarTooltip label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            <button
              onClick={toggleTheme}
              className="flex w-full items-center justify-center h-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 shrink-0" />
              ) : (
                <Moon className="h-5 w-5 shrink-0" />
              )}
            </button>
          </SidebarTooltip>
        )}

        {/* User profile */}
        <div className={cn(
          "mt-2 flex items-center rounded-xl transition-all duration-200",
          collapsed ? "justify-center py-2" : "gap-3 px-3 py-2.5",
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {getInitials(user?.name)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          )}
        </div>

        {/* Logout */}
        {!collapsed ? (
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="truncate">Sign Out</span>
          </button>
        ) : (
          <SidebarTooltip label="Sign Out">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center h-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 mt-1"
            >
              <LogOut className="h-5 w-5 shrink-0" />
            </button>
          </SidebarTooltip>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 left-0 z-50 bg-card border-r",
          "transition-[width] duration-300 ease-in-out overflow-hidden",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        {sidebarContent}
      </aside>

      {/* ===== MOBILE BACKDROP ===== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* ===== MOBILE DRAWER ===== */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-[80%] max-w-[320px] bg-card border-r",
          "flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Mobile close button */}
        <div className="flex h-16 items-center justify-between px-4 border-b shrink-0">
          <Link href="/" className="flex items-center gap-2.5" onClick={onMobileClose}>
            <img
              src="/jud-logo.png"
              alt="Mahakama"
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="text-lg font-bold">Mahakama Access</span>
          </Link>
          <button
            onClick={onMobileClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-thin">
          <NavLink
            href="/"
            icon={Home}
            label="Home"
            active={location === '/'}
            collapsed={false}
            onClick={handleNavClick}
          />

          <div className="my-2"><div className="h-px bg-border" /></div>

          {filteredAttendance.length > 0 && (
            <CollapsibleSection
              label="Time Attendance"
              icon={Clock}
              isOpen={openSections.attendance}
              onToggle={() => toggleSection('attendance')}
              active={isAttendanceChild}
              collapsed={false}
            >
              {filteredAttendance.map((item) => (
                <NavLink
                  key={item.name}
                  href={item.href}
                  icon={item.icon}
                  label={item.name}
                  active={location === item.href}
                  collapsed={false}
                  onClick={handleNavClick}
                  indent
                />
              ))}
            </CollapsibleSection>
          )}

          <CollapsibleSection
            label="Equipment Booking"
            icon={Package}
            isOpen={openSections.equipment}
            onToggle={() => toggleSection('equipment')}
            active={isEquipmentChild}
            collapsed={false}
          >
            {equipmentNavigation.map((item) => (
              <NavLink
                key={item.name}
                href={item.href}
                icon={item.icon}
                label={item.name}
                active={location === item.href}
                collapsed={false}
                onClick={handleNavClick}
                indent
              />
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            label="Fleet Management"
            icon={Car}
            isOpen={openSections.fleet}
            onToggle={() => toggleSection('fleet')}
            active={isFleetChild}
            collapsed={false}
          >
            {fleetNavigation.map((item) => (
              <NavLink
                key={item.name}
                href={item.href}
                icon={item.icon}
                label={item.name}
                active={location === item.href}
                collapsed={false}
                onClick={handleNavClick}
                indent
              />
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            label="File Movement"
            icon={FolderOpen}
            isOpen={openSections.fileMovement}
            onToggle={() => toggleSection('fileMovement')}
            active={isFileMovementChild}
            collapsed={false}
          >
            {fileMovementNavigation.map((item) => (
              <NavLink
                key={item.name}
                href={item.href}
                icon={item.icon}
                label={item.name}
                active={location === item.href}
                collapsed={false}
                onClick={handleNavClick}
                indent
              />
            ))}
          </CollapsibleSection>

          {hasRole('admin') && (
            <>
              <div className="my-2"><div className="h-px bg-border" /></div>
              <CollapsibleSection
                label="Admin"
                icon={Settings}
                isOpen={openSections.admin}
                onToggle={() => toggleSection('admin')}
                active={isAdminChild}
                collapsed={false}
              >
                <div className="space-y-1">
                  {adminNavigation.map((group) => (
                    <AdminGroup
                      key={group.name}
                      group={group}
                      isOpen={openSections[`admin${group.name}`] || false}
                      onToggle={() => toggleSection(`admin${group.name}`)}
                      location={location}
                      collapsed={false}
                      onClick={handleNavClick}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            </>
          )}
        </nav>

        {/* Mobile bottom section */}
        <div className="shrink-0 border-t px-3 py-3">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
