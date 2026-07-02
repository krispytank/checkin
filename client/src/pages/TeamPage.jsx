import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersAPI, recordsAPI } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatDate, getStatusColor, cn } from '../lib/utils.js';
import { Users, Search, Filter, Loader2, MapPin, Clock } from 'lucide-react';

export default function TeamPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  // Get team members
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const response = await usersAPI.list({ search, limit: 50 });
      return response.data;
    },
  });

  // Get attendance records for selected date
  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['records', selectedDate],
    queryFn: async () => {
      const response = await recordsAPI.list({ 
        startDate: selectedDate, 
        endDate: selectedDate 
      });
      return response.data;
    },
  });

  const users = usersData?.data || [];
  const records = recordsData?.data || [];

  // Merge users with their attendance records
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Attendance</h1>
          <p className="text-muted-foreground">View your team's attendance status</p>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{statusCounts.present}</p>
          <p className="text-sm text-muted-foreground">Present</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{statusCounts.late}</p>
          <p className="text-sm text-muted-foreground">Late</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{statusCounts.absent}</p>
          <p className="text-sm text-muted-foreground">Absent</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{statusCounts.halfDay}</p>
          <p className="text-sm text-muted-foreground">Half Day</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{statusCounts.overtime}</p>
          <p className="text-sm text-muted-foreground">Overtime</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Team list */}
      <div className="rounded-xl border bg-card shadow-sm">
        {usersLoading || recordsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : teamWithAttendance.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No team members found</p>
          </div>
        ) : (
          <div className="divide-y">
            {teamWithAttendance.map((member) => (
              <div key={member._id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                    {member.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.employeeId} • {member.department || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="font-medium">
                      {member.checkInTime 
                        ? new Date(member.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-muted-foreground">Check-out</p>
                    <p className="font-medium">
                      {member.checkOutTime 
                        ? new Date(member.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </p>
                  </div>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
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
