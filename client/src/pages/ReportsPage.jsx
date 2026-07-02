import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recordsAPI, usersAPI } from '../lib/api.js';
import { formatDate, getStatusColor, cn } from '../lib/utils.js';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';
import { Calendar, Download, Filter, Loader2, FileText } from 'lucide-react';

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#f97316', '#3b82f6'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    end: formatDate(new Date()),
  });
  const [selectedUser, setSelectedUser] = useState('');

  // Get records
  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['records', dateRange, selectedUser],
    queryFn: async () => {
      const params = {
        startDate: dateRange.start,
        endDate: dateRange.end,
      };
      if (selectedUser) params.userId = selectedUser;
      const response = await recordsAPI.list(params);
      return response.data;
    },
  });

  // Get users for filter
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await usersAPI.list({ limit: 100 });
      return response.data;
    },
  });

  const records = recordsData?.data || [];
  const users = usersData?.data || [];

  // Prepare chart data
  const prepareChartData = () => {
    const statusCount = { present: 0, late: 0, absent: 0, 'half-day': 0, overtime: 0 };
    
    records.forEach(record => {
      if (statusCount[record.status] !== undefined) {
        statusCount[record.status]++;
      }
    });

    return Object.entries(statusCount).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
      value,
    }));
  };

  const prepareDailyData = () => {
    const dailyData = {};
    
    records.forEach(record => {
      if (!dailyData[record.date]) {
        dailyData[record.date] = { date: record.date, hours: 0, count: 0 };
      }
      dailyData[record.date].hours += record.totalHours || 0;
      dailyData[record.date].count++;
    });

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  };

  const prepareHoursData = () => {
    const hoursData = {};
    
    records.forEach(record => {
      if (!hoursData[record.userId]) {
        hoursData[record.userId] = { userId: record.userId, totalHours: 0, days: 0 };
      }
      hoursData[record.userId].totalHours += record.totalHours || 0;
      hoursData[record.userId].days++;
    });

    return Object.values(hoursData).map(data => {
      const user = users.find(u => u._id === data.userId);
      return {
        name: user?.name || 'Unknown',
        hours: Math.round(data.totalHours * 10) / 10,
        average: data.days > 0 ? Math.round((data.totalHours / data.days) * 10) / 10 : 0,
      };
    });
  };

  const pieData = prepareChartData();
  const dailyData = prepareDailyData();
  const hoursData = prepareHoursData();

  // Calculate summary stats
  const totalRecords = records.length;
  const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
  const averageHours = totalRecords > 0 ? (totalHours / totalRecords).toFixed(1) : 0;
  const attendanceRate = totalRecords > 0 
    ? ((records.filter(r => r.status !== 'absent').length / totalRecords) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">View attendance statistics and reports</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Employees</option>
          {users.map(user => (
            <option key={user._id} value={user._id}>{user.name}</option>
          ))}
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Records</p>
          <p className="text-3xl font-bold">{totalRecords}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Hours</p>
          <p className="text-3xl font-bold">{totalHours.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Average Hours</p>
          <p className="text-3xl font-bold">{averageHours}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Attendance Rate</p>
          <p className="text-3xl font-bold">{attendanceRate}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution Pie Chart */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Attendance Status Distribution</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily Hours Bar Chart */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Daily Hours Worked</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#3b82f6" name="Hours" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Employee Hours Line Chart */}
        <div className="rounded-xl border bg-card p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Employee Hours Comparison</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hoursData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="#22c55e" name="Total Hours" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Records Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Recent Records</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Employee</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Check In</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Check Out</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Hours</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 10).map((record) => {
                  const user = users.find(u => u._id === record.userId);
                  return (
                    <tr key={record._id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">{record.date}</td>
                      <td className="px-4 py-3 text-sm font-medium">{user?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm">
                        {record.checkInTime 
                          ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.checkOutTime 
                          ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">{record.totalHours?.toFixed(1) || 0}h</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          getStatusColor(record.status)
                        )}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
