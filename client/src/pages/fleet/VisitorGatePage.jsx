import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitorParkingAPI, stationsAPI } from '../../lib/api.js';
import { cn } from '../../lib/utils.js';
import PhoneInput from '../../components/PhoneInput.jsx';
import {
  Loader2, Plus, X, Clock, Car, Phone, LogOut, Search,
  AlertCircle, CheckCircle
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'advocate', label: 'Advocate' },
  { value: 'litigant', label: 'Litigant' },
  { value: 'witness', label: 'Witness' },
  { value: 'government_officer', label: 'Government Officer' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS = {
  advocate: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  litigant: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  witness: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  government_officer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

function CheckInForm({ onClose, onSuccess, stations }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    ownerName: '',
    phoneNumber: '',
    vehicleRegNumber: '',
    category: 'advocate',
    purposeOfVisit: '',
    courtStationId: '',
  });

  const checkInMutation = useMutation({
    mutationFn: (data) => visitorParkingAPI.checkIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-parking'] });
      onSuccess();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    checkInMutation.mutate({
      ownerName: formData.ownerName.trim(),
      phoneNumber: formData.phoneNumber.trim() || undefined,
      vehicleRegNumber: formData.vehicleRegNumber.trim(),
      category: formData.category,
      purposeOfVisit: formData.purposeOfVisit.trim() || undefined,
      courtStationId: formData.courtStationId,
    });
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Check In Public
        </h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>

      {checkInMutation.isError && (
        <div className="mb-3 p-2 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {checkInMutation.error.response?.data?.message || 'Failed to check in visitor'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Full Name *</label>
            <input type="text" value={formData.ownerName} onChange={e => setFormData(p => ({ ...p, ownerName: e.target.value }))}
              placeholder="Owner name" required
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Phone Number</label>
            <PhoneInput value={formData.phoneNumber} onChange={v => setFormData(p => ({ ...p, phoneNumber: v }))} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Vehicle Plate *</label>
            <div className="relative">
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="text" value={formData.vehicleRegNumber} onChange={e => setFormData(p => ({ ...p, vehicleRegNumber: e.target.value.toUpperCase() }))}
                placeholder="KAA 123A" required
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Category *</label>
            <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Station *</label>
          <select value={formData.courtStationId} onChange={e => setFormData(p => ({ ...p, courtStationId: e.target.value }))}
            required className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select station</option>
            {stations.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Purpose of Visit</label>
          <input type="text" value={formData.purposeOfVisit} onChange={e => setFormData(p => ({ ...p, purposeOfVisit: e.target.value }))}
            placeholder="Optional"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        <button type="submit" disabled={checkInMutation.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {checkInMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Check In
        </button>
      </form>
    </div>
  );
}

export default function VisitorGatePage() {
  const queryClient = useQueryClient();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [search, setSearch] = useState('');

  const { data: visitorsData, isLoading } = useQuery({
    queryKey: ['visitor-parking', { status: 'parked' }],
    queryFn: async () => {
      const res = await visitorParkingAPI.list({ status: 'parked', limit: 200 });
      return res.data;
    },
  });

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await stationsAPI.list();
      return res.data;
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id) => visitorParkingAPI.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-parking'] });
    },
  });

  const visitors = (visitorsData?.data || []).filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.ownerName?.toLowerCase().includes(q) ||
      v.vehicleRegNumber?.toLowerCase().includes(q) ||
      v.phoneNumber?.includes(q);
  });

  const stations = stationsData?.data || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Public Gate</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Check in and out visitor vehicles</p>
        </div>
        <button onClick={() => setShowCheckIn(!showCheckIn)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            showCheckIn
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          )}>
          {showCheckIn ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCheckIn ? 'Cancel' : 'Check In'}
        </button>
      </div>

      {/* Check In Form */}
      {showCheckIn && (
        <CheckInForm
          onClose={() => setShowCheckIn(false)}
          onSuccess={() => setShowCheckIn(false)}
          stations={stations}
        />
      )}

      {/* Currently Parked */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Car className="h-4 w-4" /> Currently Parked
            <span className="text-muted-foreground font-normal">({visitors.length})</span>
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." className="rounded-lg border bg-background pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary w-40" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : visitors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No visitors currently parked</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visitors.map(visitor => (
              <div key={visitor._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{visitor.ownerName}</p>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", CATEGORY_COLORS[visitor.category])}>
                      {CATEGORY_OPTIONS.find(c => c.value === visitor.category)?.label || visitor.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {visitor.vehicleRegNumber}</span>
                    {visitor.phoneNumber && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {visitor.phoneNumber}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(visitor.timeIn).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button onClick={() => checkOutMutation.mutate(visitor._id)}
                  disabled={checkOutMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 shrink-0 ml-3">
                  {checkOutMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                  Check Out
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
