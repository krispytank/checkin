import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recordsAPI, usersAPI } from '../../lib/api.js';
import { formatDate, cn } from '../../lib/utils.js';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Loader2, Clock, Users, BarChart3, TrendingUp } from 'lucide-react';
import CalendarPopover from '../../components/CalendarPopover.jsx';

const COLORS = {
  present: '#22c55e',
  late: '#eab308',
  'half-day': '#f97316',
  overtime: '#3b82f6',
};

function MetricCard({ icon: Icon, label, value, sub, color = 'text-primary' }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('rounded-xl p-2.5', color)}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    end: formatDate(new Date()),
  });
  const [selectedUser, setSelectedUser] = useState('');

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', dateRange, selectedUser],
    queryFn: async () => {
      const params = { startDate: dateRange.start, endDate: dateRange.end };
      if (selectedUser) params.userId = selectedUser;
      const response = await recordsAPI.getAnalytics(params);
      return response.data;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await usersAPI.list({ limit: 100 });
      return response.data;
    },
  });

  const analytics = analyticsData?.data;
  const users = usersData?.data || [];

  const donutData = analytics
    ? [
        { name: 'Present', value: analytics.summary.totalPresent, color: COLORS.present },
        { name: 'Late', value: analytics.summary.totalLate, color: COLORS.late },
        { name: 'Half Day', value: analytics.summary.totalHalfDay, color: COLORS['half-day'] },
        { name: 'Overtime', value: analytics.summary.totalOvertime, color: COLORS.overtime },
      ].filter(d => d.value > 0)
    : [];

  const employeeRows = analytics?.userAnalytics || [];
  const trendData = analytics?.dailyTrend || [];

  const avgHours = analytics?.summary?.totalRecords > 0
    ? (analytics.summary.totalHours / analytics.summary.totalRecords).toFixed(1)
    : '0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Analytics</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Attendance insights from recorded data</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <CalendarPopover
            value={dateRange.start}
            onChange={(v) => setDateRange(prev => ({ ...prev, start: v }))}
            label="From"
          />
          <span className="text-muted-foreground text-xs sm:text-sm">to</span>
          <CalendarPopover
            value={dateRange.end}
            onChange={(v) => setDateRange(prev => ({ ...prev, end: v }))}
            label="To"
          />
        </div>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Employees</option>
          {users.map(user => (
            <option key={user._id} value={user._id}>{user.name}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          icon={BarChart3}
          label="Check-ins"
          value={analytics?.summary?.totalRecords || 0}
          sub="Recorded entries"
          color="text-green-600"
        />
        <MetricCard
          icon={Clock}
          label="Total Hours"
          value={`${analytics?.summary?.totalHours || 0}h`}
          sub={`${avgHours}h avg/entry`}
          color="text-blue-600"
        />
        <MetricCard
          icon={Users}
          label="Employees"
          value={employeeRows.length}
          sub="With records"
          color="text-violet-600"
        />
        <MetricCard
          icon={BarChart3}
          label="Overtime"
          value={analytics?.summary?.totalOvertime || 0}
          sub="Over 8 hours"
          color="text-amber-600"
        />
      </div>

      {!analytics ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No data available for the selected period
        </div>
      ) : (
        <>
          {/* Charts — stacked on mobile, side-by-side on desktop */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {/* Donut */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 shadow-sm">
              <h3 className="text-sm font-bold tracking-tight mb-1">Status Breakdown</h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-4">From actual check-ins</p>
              {donutData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                        padding: '8px 12px',
                        color: 'hsl(var(--popover-foreground))',
                      }}
                      formatter={(v) => [`${v} entries`, undefined]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span className="text-[11px] font-medium">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No records</p>
                </div>
              )}
            </div>

            {/* Trend */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold tracking-tight mb-1">Daily Attendance</h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-4">Only days with records</p>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradLate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#eab308" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                      interval="preserveStartEnd"
                      axisLine={{ stroke: 'rgba(128,128,128,0.1)' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      width={30}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                        padding: '8px 12px',
                        color: 'hsl(var(--popover-foreground))',
                      }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    />
                    <Area
                      type="monotone"
                      dataKey="present"
                      stroke="#22c55e"
                      fill="url(#gradPresent)"
                      strokeWidth={2.5}
                      name="Present"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#22c55e', fill: '#fff' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      stroke="#eab308"
                      fill="url(#gradLate)"
                      strokeWidth={2}
                      name="Late"
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: '#eab308', fill: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                  <TrendingUp className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No daily data</p>
                </div>
              )}
            </div>
          </div>

          {/* Employee Summary */}
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/30">
              <h3 className="text-sm font-bold tracking-tight">Employee Summary</h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Per-employee recorded attendance</p>
            </div>
            {employeeRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No employee data
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 bg-muted/30">
                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Employee</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Days</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Present</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Late</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">OT</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Half</th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Hours</th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeRows.map((emp) => (
                        <tr key={emp.userId} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5 font-medium">
                            {emp.name}
                            {emp.department && (
                              <span className="ml-2 text-xs text-muted-foreground">{emp.department}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium">{emp.totalLogged}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              {emp.present}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              {emp.late}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {emp.overtime}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                              {emp.halfDay}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold">{emp.totalHours}h</td>
                          <td className="px-5 py-3.5 text-right text-muted-foreground font-medium">{emp.avgHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="sm:hidden divide-y divide-border/20">
                  {employeeRows.map((emp) => (
                    <div key={emp.userId} className="p-3.5">
                      <div className="flex items-center justify-between mb-2.5">
                        <div>
                          <p className="text-sm font-semibold">{emp.name}</p>
                          {emp.department && (
                            <p className="text-[11px] text-muted-foreground">{emp.department}</p>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{emp.totalLogged} days</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <p className="text-sm font-bold text-green-600">{emp.present}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Present</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-yellow-600">{emp.late}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Late</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-blue-600">{emp.overtime}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">OT</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold">{emp.avgHours}h</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Avg</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
