import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loader2, AlertTriangle } from 'lucide-react';

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

export default function FileReportsPage() {
  const [reportType, setReportType] = useState('movement');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: movementData, isLoading: movementLoading } = useQuery({
    queryKey: ['file-report-movement', startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get('/file-reports/movement-summary', { params });
      return res.data;
    },
    enabled: reportType === 'movement',
  });

  const { data: registryData, isLoading: registryLoading } = useQuery({
    queryKey: ['file-report-registry'],
    queryFn: async () => {
      const res = await api.get('/file-reports/registry-activity');
      return res.data;
    },
    enabled: reportType === 'registry',
  });

  const { data: custodyData, isLoading: custodyLoading } = useQuery({
    queryKey: ['file-report-custody'],
    queryFn: async () => {
      const res = await api.get('/file-reports/custody');
      return res.data;
    },
    enabled: reportType === 'custody',
  });

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['file-report-user'],
    queryFn: async () => {
      const res = await api.get('/file-reports/user-activity');
      return res.data;
    },
    enabled: reportType === 'user',
  });

  const isLoading = movementLoading || registryLoading || custodyLoading || userLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">File Movement Reports</h1>
        <p className="text-muted-foreground">Track file movement, custody, and registry activity</p>
      </div>

      {/* Report Type Tabs + Filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {[
            { value: 'movement', label: 'Movement Summary' },
            { value: 'registry', label: 'Registry Activity' },
            { value: 'custody', label: 'Custody Report' },
            { value: 'user', label: 'User Activity' },
          ].map(type => (
            <button
              key={type.value}
              onClick={() => setReportType(type.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                reportType === type.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        {reportType === 'movement' && (
          <div className="flex gap-3">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Movement Summary */}
          {reportType === 'movement' && movementData?.data && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Overdue Files</p>
                  <p className="text-2xl font-bold text-red-600">{movementData.data.overdueFiles || 0}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Avg Time Outside Registry</p>
                  <p className="text-2xl font-bold">{movementData.data.avgTimeOutsideHours || 0}h</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="font-semibold text-sm mb-4">Movements by Type</h3>
                  {movementData.data.byType?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={movementData.data.byType.map(t => ({ name: t._id?.replace(/_/g, ' ') || 'unknown', value: t.count }))}
                          cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {movementData.data.byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  )}
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="font-semibold text-sm mb-4">Movements by Day</h3>
                  {movementData.data.byDay?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={movementData.data.byDay.map(d => ({ date: d._id, count: d.count }))}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip {...tooltipStyle} />
                        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Registry Activity */}
          {reportType === 'registry' && registryData?.data && (
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold text-sm mb-4">Files by Registry</h3>
                {registryData.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={registryData.data.map(r => ({
                      name: r.registryName, total: r.totalFiles, issued: r.issued, inCourt: r.inCourt, atRegistry: r.atRegistry, strongRoom: r.strongRoom,
                    }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="atRegistry" fill="#10b981" stackId="a" name="At Registry" />
                      <Bar dataKey="issued" fill="#f59e0b" stackId="a" name="Issued" />
                      <Bar dataKey="inCourt" fill="#8b5cf6" stackId="a" name="In Court" />
                      <Bar dataKey="strongRoom" fill="#ef4444" stackId="a" name="Strong Room" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                )}
              </div>
            </div>
          )}

          {/* Custody Report */}
          {reportType === 'custody' && custodyData?.data && (
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold text-sm mb-4">Files Outside Registry</h3>
                {custodyData.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">File Number</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Title</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Current Location</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Days Out</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Overdue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custodyData.data.map((f, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2 font-mono text-xs">{f.caseFileNumber}</td>
                            <td className="px-4 py-2 text-xs max-w-[200px] truncate">{f.caseTitle}</td>
                            <td className="px-4 py-2 text-xs">{f.currentLocation}</td>
                            <td className="px-4 py-2 text-xs">{f.daysOutsideRegistry}</td>
                            <td className="px-4 py-2">
                              {f.isOverdue && (
                                <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                  <AlertTriangle className="h-3 w-3" /> Overdue
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">All files are in registry</p>
                )}
              </div>
            </div>
          )}

          {/* User Activity */}
          {reportType === 'user' && userData?.data && (
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold text-sm mb-4">Active File Holders</h3>
                {userData.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={userData.data.map(u => ({ name: u.userName, files: u.fileCount }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="files" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No files currently held</p>
                )}

                {userData.data.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">User</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Employee ID</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Files Held</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">File Numbers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userData.data.map((u, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2 text-xs font-medium">{u.userName}</td>
                            <td className="px-4 py-2 font-mono text-xs">{u.employeeId}</td>
                            <td className="px-4 py-2 text-xs">{u.fileCount}</td>
                            <td className="px-4 py-2 text-xs text-muted-foreground max-w-[300px] truncate">{u.files?.join(', ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
