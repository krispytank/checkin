import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Shield, Search, Loader2, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

const MODULES = ['attendance', 'equipment', 'fleet', 'fileMovement', 'audit'];
const ACTIONS = ['created', 'updated', 'deleted', 'approved', 'rejected', 'issued', 'returned', 'released', 'moved'];

export default function AdminAuditLogsPage() {
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    entityType: '',
    search: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const response = await api.get('/audit-logs', { params });
      return response.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['audit-logs-stats'],
    queryFn: async () => {
      const response = await api.get('/audit-logs/stats');
      return response.data;
    },
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const stats = statsData?.data || { totalToday: 0, byModule: [], byAction: [] };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      module: '', action: '', entityType: '', search: '',
      startDate: '', endDate: '', page: 1, limit: 20,
    });
  };

  const hasActiveFilters = filters.module || filters.action || filters.entityType ||
    filters.search || filters.startDate || filters.endDate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Track all system activity</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border bg-card px-4 py-2 text-sm">
            <span className="text-muted-foreground">Today: </span>
            <span className="font-semibold">{stats.totalToday}</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {stats.byModule.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.byModule.map(m => (
            <div key={m._id} className="rounded-lg border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground capitalize">{m._id}</p>
              <p className="text-lg font-bold">{m.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full rounded-lg border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filters.module}
            onChange={(e) => updateFilter('module', e.target.value)}
            className="rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Modules</option>
            {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={filters.action}
            onChange={(e) => updateFilter('action', e.target.value)}
            className="rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Actions</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => updateFilter('startDate', e.target.value)}
            className="rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Start date"
          />
        </div>
      </div>

      {/* Logs table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Module</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <LogRow key={log._id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);

  const actionColor = {
    created: 'text-green-600 bg-green-50',
    updated: 'text-blue-600 bg-blue-50',
    deleted: 'text-red-600 bg-red-50',
    approved: 'text-green-600 bg-green-50',
    rejected: 'text-red-600 bg-red-50',
    issued: 'text-amber-600 bg-amber-50',
    returned: 'text-green-600 bg-green-50',
    released: 'text-amber-600 bg-amber-50',
    moved: 'text-blue-600 bg-blue-50',
  };

  return (
    <>
      <tr className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3 whitespace-nowrap">
          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
        </td>
        <td className="px-4 py-3 font-mono text-xs">{log.userId || '-'}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium capitalize">
            {log.module}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${actionColor[log.action] || 'text-muted-foreground bg-muted'}`}>
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-muted-foreground">{log.entityType}</span>
          {log.entityId && <span className="ml-1 text-xs font-mono text-muted-foreground">#{log.entityId.slice(-6)}</span>}
        </td>
        <td className="px-4 py-3 text-xs max-w-[200px] truncate">{log.description || '-'}</td>
        <td className="px-4 py-3">
          {(log.previousValue || log.newValue) && (
            <button className="text-xs text-primary hover:underline">
              {expanded ? 'Hide' : 'View'}
            </button>
          )}
        </td>
      </tr>
      {expanded && (log.previousValue || log.newValue) && (
        <tr>
          <td colSpan={7} className="px-4 py-3 bg-muted/20">
            <div className="grid gap-4 sm:grid-cols-2">
              {log.previousValue && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Previous Value</p>
                  <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                    {JSON.stringify(log.previousValue, null, 2)}
                  </pre>
                </div>
              )}
              {log.newValue && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">New Value</p>
                  <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                    {JSON.stringify(log.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
