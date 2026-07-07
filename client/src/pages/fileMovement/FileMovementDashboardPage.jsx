import { useQuery } from '@tanstack/react-query';
import { fileMovementAPI } from '../../lib/api.js';
import { FolderOpen, FileText, AlertTriangle, Clock, CheckCircle, Archive, Loader2 } from 'lucide-react';

export default function FileMovementDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['file-movement-dashboard'],
    queryFn: async () => {
      const response = await fileMovementAPI.getDashboard();
      return response.data;
    },
  });

  const stats = data?.data || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">File Movement Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Overview of case file tracking and registry operations</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <StatCard icon={FolderOpen} label="Total Files" value={stats.totalFiles || 0} color="text-blue-600 bg-blue-50" />
        <StatCard icon={FileText} label="Issued" value={stats.filesIssued || 0} color="text-amber-600 bg-amber-50" />
        <StatCard icon={CheckCircle} label="In Registry" value={stats.filesInRegistry || 0} color="text-green-600 bg-green-50" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdueMovements || 0} color="text-red-600 bg-red-50" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <StatCard icon={FileText} label="In Court" value={stats.filesInCourt || 0} color="text-purple-600 bg-purple-50" />
        <StatCard icon={Archive} label="Strong Room" value={stats.filesInStrongRoom || 0} color="text-slate-600 bg-slate-50" />
        <StatCard icon={CheckCircle} label="Returned Today" value={stats.filesReturnedToday || 0} color="text-green-600 bg-green-50" />
        <StatCard icon={Clock} label="Pending" value={stats.activeRequests || 0} color="text-orange-600 bg-orange-50" />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <a href="/file-movement/case-files"
          className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]">
          <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2 sm:mb-3" />
          <h3 className="font-semibold text-sm sm:text-base">Case Files</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">View and manage all case files</p>
        </a>
        <a href="/file-movement/requests"
          className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]">
          <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2 sm:mb-3" />
          <h3 className="font-semibold text-sm sm:text-base">File Requests</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Approve or manage file requests</p>
        </a>
        <a href="/file-movement/strong-room"
          className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]">
          <Archive className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2 sm:mb-3" />
          <h3 className="font-semibold text-sm sm:text-base">Strong Room</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage strong room file releases</p>
        </a>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border bg-card p-2.5 sm:p-3 md:p-4 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`rounded-lg p-1.5 sm:p-2 ${color}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div>
          <p className="text-base sm:text-lg md:text-2xl font-bold">{value}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
