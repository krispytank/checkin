import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext.jsx';
import { messagesAPI } from '../lib/api.js';
import {
  User, Settings, LogOut, Menu,
  Home, Clock, FileText, MessageSquare,
  Users, MapPin, Calendar, Package, Car, FolderOpen,
} from 'lucide-react';
import { cn } from '../lib/utils.js';
import Sidebar from '../components/Sidebar.jsx';

const COLLAPSED_KEY = 'sidebar-collapsed';

const mobileNavItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Attend', href: '/attendance/dashboard', icon: Clock },
  { name: 'Fleet', href: '/fleet/dashboard', icon: Car },
  { name: 'Files', href: '/file-movement/dashboard', icon: FolderOpen },
  { name: 'More', href: '__more__', icon: Settings },
];

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const messagesRef = useRef(null);
  const [location] = useLocation();
  const { logout, hasRole } = useAuth();

  const handleToggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleMobileOpen = useCallback(() => setMobileOpen(true), []);
  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (messagesRef.current && !messagesRef.current.contains(e.target)) {
        setMessagesOpen(false);
      }
    };
    if (messagesOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [messagesOpen]);

  const handleLogout = async () => {
    await logout();
  };

  const [isLg, setIsLg] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  useEffect(() => {
    const onResize = () => setIsLg(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { data: unreadData } = useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: async () => {
      const res = await messagesAPI.unreadCount();
      return res.data;
    },
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.data?.count || 0;

  const sidebarWidth = collapsed ? 72 : 260;
  const effectiveMargin = isLg ? sidebarWidth : 0;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      {/* Main content */}
      <div
        className="flex flex-1 flex-col overflow-hidden transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: `${effectiveMargin}px` }}
      >
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:h-16 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleMobileOpen}
              className="lg:hidden p-2 rounded-lg hover:bg-muted -ml-1"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="lg:hidden flex items-center gap-2">
              <img src="/jud-logo.png" alt="Mahakama" className="h-7 w-7 rounded-lg object-contain" />
              <span className="text-sm sm:text-base font-bold truncate hidden sm:inline">Mahakama Access</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Messages */}
            <div className="relative" ref={messagesRef}>
              <button
                onClick={() => setMessagesOpen(!messagesOpen)}
                className="relative p-2 rounded-lg hover:bg-muted"
              >
                <MessageSquare className="h-4 w-4 lg:h-5 lg:w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {messagesOpen && (
                <MessagesDropdown onClose={() => setMessagesOpen(false)} />
              )}
            </div>

            <Link href="/profile" className="p-2 rounded-lg hover:bg-muted">
              <User className="h-4 w-4 lg:h-5 lg:w-5" />
            </Link>
            {hasRole('admin') && (
              <Link href="/admin/users" className="p-2 rounded-lg hover:bg-muted">
                <Settings className="h-4 w-4 lg:h-5 lg:w-5" />
              </Link>
            )}
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
                        <MoreMenuContent
                          location={location}
                          hasRole={hasRole}
                          onClose={() => setMoreMenuOpen(false)}
                          onLogout={handleLogout}
                        />
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

function MessagesDropdown({ onClose }) {
  const [tab, setTab] = useState('inbox');
  const { data, isLoading } = useQuery({
    queryKey: ['messages', 'dropdown', tab],
    queryFn: async () => {
      const res = await messagesAPI.list({ type: tab, limit: 8 });
      return res.data;
    },
  });

  const messages = data?.data?.messages || [];

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <h3 className="font-semibold text-sm">Messages</h3>
        <Link href="/attendance/messages" onClick={onClose}
          className="text-xs text-primary hover:underline">
          View All
        </Link>
      </div>
      <div className="flex border-b">
        {['inbox', 'sent'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 text-xs font-medium capitalize transition-colors',
              tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/50'
            )}>
            {t}
          </button>
        ))}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : messages.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">No messages</div>
        ) : (
          messages.map(msg => (
            <Link key={msg._id} href={msg.link || '/attendance/messages'} onClick={onClose}
              className={cn(
                'block px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-0',
                !msg.read && 'bg-primary/5'
              )}>
              <div className="flex items-start gap-2">
                <div className={cn(
                  'mt-0.5 h-2 w-2 rounded-full shrink-0',
                  !msg.read ? 'bg-primary' : 'bg-transparent'
                )} />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-xs truncate', !msg.read ? 'font-semibold' : 'font-medium')}>
                    {msg.subject || 'No subject'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {msg.type === 'notification' ? 'System' : msg.senderName || 'Unknown'}
                  </p>
                </div>
                <span className="text-[9px] text-muted-foreground shrink-0">
                  {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function MoreMenuContent({ location, hasRole, onClose, onLogout }) {
  return (
    <>
      {/* Time Attendance */}
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Time Attendance
      </div>
      {[
        { name: 'Dashboard', href: '/attendance/dashboard', icon: Clock },
        { name: 'Team', href: '/attendance/team', icon: Users },
        { name: 'Shifts', href: '/attendance/shifts', icon: Calendar },
        { name: 'Reports', href: '/attendance/reports', icon: FileText },
      ].map((item) => {
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
            onClick={onClose}
          >
            <NavIcon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}

      {/* Equipment */}
      <div className="border-t mt-1 pt-1">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Equipment Booking
        </div>
        {[
          { name: 'Dashboard', href: '/equipment/dashboard', icon: Clock },
          { name: 'Book Equipment', href: '/equipment/book', icon: Package },
          { name: 'Manage Bookings', href: '/equipment/manage', icon: FileText },
        ].map((item) => {
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
              onClick={onClose}
            >
              <NavIcon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Fleet */}
      <div className="border-t mt-1 pt-1">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Fleet Management
        </div>
        {[
          { name: 'Dashboard', href: '/fleet/dashboard', icon: Clock },
          { name: 'Vehicles', href: '/fleet/vehicles', icon: Car },
          { name: 'Trips', href: '/fleet/trips', icon: Car },
          { name: 'Parking', href: '/fleet/parking', icon: MapPin },
          { name: 'Check In/Out', href: '/fleet/checkin', icon: FileText },
          { name: 'Reports', href: '/fleet/reports', icon: FileText },
        ].map((item) => {
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
              onClick={onClose}
            >
              <NavIcon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* File Movement */}
      <div className="border-t mt-1 pt-1">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          File Movement
        </div>
        {[
          { name: 'Dashboard', href: '/file-movement/dashboard', icon: Clock },
          { name: 'Case Files', href: '/file-movement/case-files', icon: FolderOpen },
          { name: 'File Requests', href: '/file-movement/requests', icon: FileText },
          { name: 'Strong Room', href: '/file-movement/strong-room', icon: FolderOpen },
        ].map((item) => {
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
              onClick={onClose}
            >
              <NavIcon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Admin */}
      {hasRole('admin') && (
        <div className="border-t mt-1 pt-1">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Admin
          </div>
          {[
            { name: 'User Management', href: '/admin/users', icon: Users },
            { name: 'Court Stations', href: '/admin/stations', icon: MapPin },
            { name: 'Shift Templates', href: '/admin/shifts', icon: Calendar },
            { name: 'Departments', href: '/admin/departments', icon: FileText },
            { name: 'Job Titles', href: '/admin/job-titles', icon: FileText },
            { name: 'Equipment Items', href: '/admin/equipment/items', icon: Package },
            { name: 'Designated Bookers', href: '/admin/equipment/bookers', icon: Users },
            { name: 'Vehicles', href: '/admin/fleet/vehicles', icon: Car },
            { name: 'Parking Spaces', href: '/admin/fleet/parking', icon: MapPin },
          ].map((item) => {
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
                onClick={onClose}
              >
                <NavIcon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}

      <div className="border-t mt-1 pt-1">
        <button
          onClick={() => { onLogout(); onClose(); }}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}
