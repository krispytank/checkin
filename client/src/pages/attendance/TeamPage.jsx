import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersAPI, recordsAPI } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { formatDate, getStatusColor, cn } from '../../lib/utils.js';
import { Users, Search, Loader2 } from 'lucide-react';
import CalendarPopover from '../../components/CalendarPopover.jsx';

export default function TeamPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const response = await usersAPI.list({ search, limit: 50 });
      return response.data;
    },
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['records', selectedDate],
    queryFn: async () => {
      const response = await recordsAPI.list({ startDate: selectedDate, endDate: selectedDate });
      return response.data;
    },
  });

  const users = usersData?.data || [];
  const records = recordsData?.data || [];

  const teamWithAttendance = users.map(u => {
    const record = records.find(r => r.userId === u._id);
    return {
      ...u,
      record,
      status: record?.status || 'absent',
      checkInTime: record?.checkInTime,
      checkOutTime: record?.checkOutTime,
    };
  });

  const statusCounts = {
    present: teamWithAttendance.filter(t => t.status === 'present').length,
    late: teamWithAttendance.filter(t => t.status === 'late').length,
    absent: teamWithAttendance.filter(t => t.status === 'absent').length,
    halfDay: teamWithAttendance.filter(t => t.status === 'half-day').length,
    overtime: teamWithAttendance.filter(t => t.status === 'overtime').length,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Team Attendance</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">View your team's attendance status</p>
      </div>

      {/* Status summary — scrollable row on mobile, grid on desktop */}
      <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible">
        {[
          { value: statusCounts.present, color: 'text-[#009A44]', label: 'Present' },
          { value: statusCounts.late, color: 'text-yellow-600', label: 'Late' },
          { value: statusCounts.absent, color: 'text-destructive', label: 'Absent' },
          { value: statusCounts.halfDay, color: 'text-[#8A704C]', label: 'Half' },
          { value: statusCounts.overtime, color: 'text-primary', label: 'OT' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-3 text-center min-w-[72px] shrink-0 sm:min-w-0 sm:p-4">
            <p className={cn("text-xl sm:text-2xl font-bold", item.color)}>{item.value}</p>
            <p className="text-[10px] sm:text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <CalendarPopover value={selectedDate} onChange={setSelectedDate} label="Pick a date" />
      </div>

      {/* Team list */}
      <div className="rounded-xl border bg-card shadow-sm">
        {usersLoading || recordsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : teamWithAttendance.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No team members found</p>
          </div>
        ) : (
          <div className="divide-y">
            {teamWithAttendance.map((member) => (
              <div key={member._id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-medium">
                    {member.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground truncate">{member.employeeId} · {member.department || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">In</p>
                    <p className="text-sm font-medium">
                      {member.checkInTime ? new Date(member.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Out</p>
                    <p className="text-sm font-medium">
                      {member.checkOutTime ? new Date(member.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </p>
                  </div>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium",
                    getStatusColor(member.status)
                  )}>
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
