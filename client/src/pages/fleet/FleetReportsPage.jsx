import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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

export default function FleetReportsPage() {
  const [reportType, setReportType] = useState('utilization');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['fleet-reports', reportType, startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      if (reportType === 'utilization') {
        const res = await api.get('/fleet/reports/utilization', { params });
        return res.data;
      } else if (reportType === 'maintenance') {
        const res = await api.get('/fleet/reports/maintenance');
        return res.data;
      } else if (reportType === 'parking') {
        const res = await api.get('/fleet/reports/parking');
        return res.data;
      }
    },
  });

  const reportData = data?.data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleet Reports</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Vehicle utilization, maintenance, and parking reports</p>
        </div>
      </div>

      {/* Report Type Tabs + Filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {['utilization', 'maintenance', 'parking'].map(type => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                reportType === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        {reportType === 'utilization' && (
          <div className="flex gap-3">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Start date" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="End date" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Utilization Report */}
          {reportType === 'utilization' && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="font-semibold text-sm mb-4">Trips by Vehicle</h3>
                  {reportData.byVehicle?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.byVehicle.map(v => ({ name: v.plateNumber, trips: v.tripCount, distance: v.totalDistance }))}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="trips" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  )}
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="font-semibold text-sm mb-4">Trips by Driver</h3>
                  {reportData.byDriver?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.byDriver.map(d => ({ name: d.driverName, trips: d.tripCount, distance: d.totalDistance }))}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Report */}
          {reportType === 'maintenance' && (
            <div className="space-y-6">
              {reportData.byType && Object.keys(reportData.byType).length > 0 && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="font-semibold text-sm mb-4">By Maintenance Type</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(reportData.byType).map(([key, val]) => ({ name: key.replace(/_/g, ' '), value: val.count }))}
                          cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {Object.entries(reportData.byType).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <h3 className="font-semibold text-sm mb-4">Cost by Type</h3>
                    <div className="space-y-3">
                      {Object.entries(reportData.byType).map(([type, data]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-medium">{data.count} records | KES {(data.totalCost || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold text-sm mb-4">Maintenance Records ({reportData.totalRecords || 0})</h3>
                {reportData.records?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Vehicle</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Scheduled</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.records.slice(0, 20).map((r, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2 text-xs">{r.vehicle?.plateNumber || r.vehicleId}</td>
                            <td className="px-4 py-2 text-xs capitalize">{r.type?.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-2 text-xs">{r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString() : '-'}</td>
                            <td className="px-4 py-2 text-xs capitalize">{r.status}</td>
                            <td className="px-4 py-2 text-xs">{r.cost ? `KES ${r.cost.toLocaleString()}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No records</p>
                )}
              </div>
            </div>
          )}

          {/* Parking Report */}
          {reportType === 'parking' && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="font-semibold text-sm mb-4">Parking by Station</h3>
                  {reportData.byStation?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.byStation.map(s => ({
                        name: s.stationName, total: s.totalBays, occupied: s.occupiedBays, reserved: s.reservedBays,
                      }))}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="total" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Total" />
                        <Bar dataKey="occupied" fill="#ef4444" radius={[4, 4, 0, 0]} name="Occupied" />
                        <Bar dataKey="reserved" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Reserved" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No parking lots</p>
                  )}
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="font-semibold text-sm mb-4">Public Parking by Category</h3>
                  {reportData.visitorByCategory?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.visitorByCategory.map(c => ({ name: c._id.replace(/_/g, ' '), value: c.count }))}
                          cx="50%" cy="50%" outerRadius={100} label
                        >
                          {reportData.visitorByCategory.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No visitor data</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
