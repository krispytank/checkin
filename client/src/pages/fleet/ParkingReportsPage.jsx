import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { visitorParkingAPI, stationsAPI } from '../../lib/api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loader2, TrendingUp, Clock, Users, Car, MapPin, Calendar, Repeat } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const tooltipStyle = {
  contentStyle: {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontSize: '12px',
    padding: '8px 12px',
    color: 'hsl(var(--popover-foreground))',
  },
};

const CATEGORY_LABELS = {
  advocate: 'Advocates',
  litigant: 'Litigants',
  witness: 'Witnesses',
  government_officer: 'Gov Officers',
  other: 'Other',
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary bg-primary/10' }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function ParkingReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stationFilter, setStationFilter] = useState('');

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await stationsAPI.list();
      return res.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['parking-reports', startDate, endDate, stationFilter],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (stationFilter) params.courtStationId = stationFilter;
      const res = await visitorParkingAPI.reports(params);
      return res.data;
    },
  });

  const report = data?.data || {};
  const stations = stationsData?.data || [];
  const dailyTrend = (report.dailyTrend || []).filter(d => d.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Parking Reports</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Comprehensive parking insights for institutional oversight</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Station</label>
            <select value={stationFilter} onChange={e => setStationFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="">All Stations</option>
              {stations.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !report.totalVisits && !report.currentlyParked ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Car className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No records found for this period</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {report.currentlyParked > 0 && (
              <StatCard icon={Car} label="Currently Parked" value={report.currentlyParked} color="text-blue-600 bg-blue-50" />
            )}
            <StatCard icon={Users} label="Total Visits" value={report.totalVisits || 0} color="text-emerald-600 bg-emerald-50" />
            <StatCard icon={Clock} label="Avg Duration" value={`${report.avgDurationMinutes || 0} min`} color="text-amber-600 bg-amber-50" />
            {report.repeatVisitors?.length > 0 && (
              <StatCard icon={Repeat} label="Repeat Visitors" value={report.repeatVisitors.length} sub="visitors with 2+ visits" color="text-purple-600 bg-purple-50" />
            )}
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Daily Trend */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Daily Visitor Trend
              </h3>
              {dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyTrend}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data</p>
              )}
            </div>

            {/* By Category */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Users className="h-4 w-4" /> Visits by Category
              </h3>
              {report.byCategory?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={report.byCategory.map(c => ({
                        name: CATEGORY_LABELS[c._id] || c._id?.replace(/_/g, ' ') || 'Unknown',
                        value: c.count,
                      }))}
                      cx="50%" cy="50%" outerRadius={90} label
                    >
                      {report.byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data</p>
              )}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* By Station */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Visits by Station
              </h3>
              {report.byStation?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={report.byStation}>
                    <XAxis dataKey="stationName" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data</p>
              )}
            </div>

            {/* Peak Hours */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Peak Hours
              </h3>
              {report.byHour?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={report.byHour.map(h => ({
                    hour: `${String(h.hour).padStart(2, '0')}:00`,
                    count: h.count,
                  }))}>
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data</p>
              )}
            </div>
          </div>

          {/* Charts Row 3 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* By Day of Week */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Visits by Day of Week
              </h3>
              {report.byDayOfWeek?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={report.byDayOfWeek}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data</p>
              )}
            </div>

            {/* Repeat Visitors */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Repeat className="h-4 w-4" /> Most Frequent Visitors
              </h3>
              {report.repeatVisitors?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Visits</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vehicles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.repeatVisitors.map((v, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{v.name}</td>
                          <td className="px-3 py-2">{v.visits}</td>
                          <td className="px-3 py-2 text-muted-foreground">{v.vehicles?.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No repeat visitors</p>
              )}
            </div>
          </div>

          {/* Recent Visitors Log */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold text-sm mb-4">Recent Visitor Log</h3>
            {report.recentVisitors?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vehicle</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Phone</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Time In</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Time Out</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.recentVisitors.map((v, i) => (
                      <tr key={v._id || i} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{v.ownerName}</td>
                        <td className="px-3 py-2">{v.vehicleRegNumber}</td>
                        <td className="px-3 py-2 capitalize">{CATEGORY_LABELS[v.category] || v.category?.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2 text-muted-foreground">{v.phoneNumber || '—'}</td>
                        <td className="px-3 py-2">{new Date(v.timeIn).toLocaleString()}</td>
                        <td className="px-3 py-2">{v.timeOut ? new Date(v.timeOut).toLocaleString() : '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            v.status === 'parked' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {v.status === 'parked' ? 'Parked' : 'Checked Out'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No visitors</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
