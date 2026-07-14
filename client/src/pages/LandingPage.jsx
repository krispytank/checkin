import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Package, Clock, Car, ArrowRight, LogOut, Sun, Moon } from 'lucide-react';
import { getInitials, cn } from '../lib/utils.js';

export default function LandingPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img src="/jud-logo.png" alt="Mahakama" className="h-9 w-9 rounded-xl object-contain" />
          <span className="text-lg font-bold tracking-tight">Mahakama Access</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-colors">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {getInitials(user?.name)}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
            Choose what you would like to do today
          </p>
        </motion.div>

        {/* Module cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full">
          {/* Attendance Card */}
          <Link href="/attendance/dashboard">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "group relative cursor-pointer rounded-2xl border p-8 shadow-sm transition-all duration-300",
                "bg-card hover:shadow-lg hover:border-primary/30",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              )}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                {/* Icon */}
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Clock className="h-7 w-7" />
                </div>

                {/* Text */}
                <h2 className="text-xl font-bold mb-2">Time Attendance</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Check in and out for your court session. Track your daily attendance, hours worked, and location verification.
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {['GPS-verified check-in/out', 'Real-time duration tracking', 'Weekly summary'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                  Open Time Attendance
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Equipment Booking Card */}
          <Link href="/equipment/dashboard">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "group relative cursor-pointer rounded-2xl border p-8 shadow-sm transition-all duration-300",
                "bg-card hover:shadow-lg hover:border-amber-500/30",
                "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              )}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                {/* Icon */}
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                  <Package className="h-7 w-7" />
                </div>

                {/* Text */}
                <h2 className="text-xl font-bold mb-2">Equipment Booking</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Book AV equipment for court events, virtual sessions, and evidence display. Upload request documents and track bookings.
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {['Evidence display & virtual court', 'PDF request upload', 'Booking state tracking'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 group-hover:gap-3 transition-all">
                  Book Equipment
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Fleet Management Card */}
          <Link href="/fleet/dashboard">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "group relative cursor-pointer rounded-2xl border p-8 shadow-sm transition-all duration-300",
                "bg-card hover:shadow-lg hover:border-emerald-500/30",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              )}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                {/* Icon */}
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                  <Car className="h-7 w-7" />
                </div>

                {/* Text */}
                <h2 className="text-xl font-bold mb-2">Fleet Management</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Manage court vehicles, schedule trips, and track parking spaces across all stations.
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {['Vehicle availability tracking', 'Trip scheduling & approval', 'Parking management'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 group-hover:gap-3 transition-all">
                  Open Fleet Management
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Role badge */}
        {user?.role && user.role !== 'user' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground capitalize">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              {user.role}
            </span>
          </motion.div>
        )}
      </main>
    </div>
  );
}
