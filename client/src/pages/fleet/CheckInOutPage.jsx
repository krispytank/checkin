import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleAPI, parkingAPI, checkinsAPI } from '../../lib/api.js';
import QRScanner from '../../components/QRScanner.jsx';
import { QrCode, Search, Loader2, LogIn, LogOut, MapPin, Car, Clock, CheckCircle2, XCircle, AlertCircle, AlertTriangle, Ban } from 'lucide-react';

const STATUS_CONFIG = {
  'check-in': { label: 'Checked In', color: 'text-green-600', bg: 'bg-green-100', icon: LogIn },
  'check-out': { label: 'Checked Out', color: 'text-red-600', bg: 'bg-red-100', icon: LogOut },
};

const ERROR_CONFIG = {
  VEHICLE_DEACTIVATED: { icon: Ban, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  QR_NOT_GENERATED: { icon: QrCode, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  QR_EXPIRED: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
};

function ScanConfirmModal({ scanData, stations, onConfirm, onCancel, isSubmitting }) {
  const [stationId, setStationId] = useState('');
  const [parkingSpaceId, setParkingSpaceId] = useState('');
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState('check-in');

  const { data: parkingSpaces } = useQuery({
    queryKey: ['parking', 'available', stationId],
    queryFn: async () => {
      if (!stationId) return { data: [] };
      const res = await parkingAPI.available({ stationId });
      return res.data;
    },
    enabled: !!stationId,
  });

  const { data: vehicleStatus } = useQuery({
    queryKey: ['checkins', 'vehicle', scanData?.vehicleId],
    queryFn: async () => {
      if (!scanData?.vehicleId) return { data: { isCheckedIn: false } };
      const res = await checkinsAPI.getVehicleStatus(scanData.vehicleId);
      return res.data;
    },
    enabled: !!scanData?.vehicleId,
  });

  useEffect(() => {
    if (vehicleStatus) {
      setActionType(vehicleStatus.isCheckedIn ? 'check-out' : 'check-in');
    }
  }, [vehicleStatus]);

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm({
      vehicleId: scanData.vehicleId,
      stationId: stationId || undefined,
      parkingSpaceId: parkingSpaceId || undefined,
      type: actionType,
      notes,
    });
  }

  if (!scanData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {actionType === 'check-in' ? 'Check In Vehicle' : 'Check Out Vehicle'}
          </h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{scanData.vehicleName || 'Unknown Vehicle'}</span>
          </div>
          <div className="text-xs text-muted-foreground ml-6">
            Plate: {scanData.plateNumber || scanData.plate || 'N/A'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Action</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActionType('check-in')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  actionType === 'check-in'
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'hover:bg-muted'
                }`}
              >
                <LogIn className="h-4 w-4" />
                Check In
              </button>
              <button
                type="button"
                onClick={() => setActionType('check-out')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  actionType === 'check-out'
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : 'hover:bg-muted'
                }`}
              >
                <LogOut className="h-4 w-4" />
                Check Out
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Station</label>
            <select
              value={stationId}
              onChange={(e) => {
                setStationId(e.target.value);
                setParkingSpaceId('');
              }}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select station (optional)</option>
              {stations?.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {stationId && (
            <div>
              <label className="block text-sm font-medium mb-1">Parking Space</label>
              <select
                value={parkingSpaceId}
                onChange={(e) => setParkingSpaceId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select parking space (optional)</option>
                {parkingSpaces?.data?.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.zone || 'No zone'})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : actionType === 'check-in' ? (
                'Confirm Check In'
              ) : (
                'Confirm Check Out'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CheckInOutPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('scanner');
  const [scanData, setScanData] = useState(null);
  const [manualVehicleId, setManualVehicleId] = useState('');
  const [search, setSearch] = useState('');
  const [scanError, setScanError] = useState(null);

  const { data: stations } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await fetch('/api/stations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      return data.data || [];
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ['fleet', 'vehicles'],
    queryFn: async () => {
      const res = await vehicleAPI.list({ limit: 200 });
      return res.data;
    },
  });

  const { data: activeCheckins, isLoading: loadingActive } = useQuery({
    queryKey: ['checkins', 'active'],
    queryFn: async () => {
      const res = await checkinsAPI.getActive();
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: recentCheckins, isLoading: loadingRecent } = useQuery({
    queryKey: ['checkins', { search }],
    queryFn: async () => {
      const res = await checkinsAPI.list({ limit: 20 });
      return res.data;
    },
  });

  const checkinMutation = useMutation({
    mutationFn: (data) => checkinsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      setScanData(null);
      setScanError(null);
    },
    onError: (error) => {
      const errorData = error.response?.data;
      if (errorData?.errorCode) {
        setScanError({
          code: errorData.errorCode,
          message: errorData.message,
        });
      } else {
        setScanError({
          code: 'UNKNOWN',
          message: errorData?.message || 'An error occurred. Please try again.',
        });
      }
    },
  });

  function handleScan(decodedData) {
    const vehicle = vehicles?.data?.find((v) => v._id === decodedData.vehicleId);
    setScanData({
      ...decodedData,
      vehicleName: vehicle?.name || 'Unknown',
      plateNumber: decodedData.plateNumber || vehicle?.plateNumber || 'N/A',
    });
    setScanError(null);
  }

  function handleManualSelect(vehicleId) {
    const vehicle = vehicles?.data?.find((v) => v._id === vehicleId);
    if (vehicle) {
      setScanData({
        vehicleId: vehicle._id,
        plateNumber: vehicle.plateNumber,
        vehicleName: vehicle.name,
      });
      setScanError(null);
    }
  }

  function handleConfirmCheckin(data) {
    checkinMutation.mutate(data);
  }

  const filteredVehicles = vehicles?.data?.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.plateNumber.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Check In / Out</h1>
          <p className="text-sm text-muted-foreground">Scan QR or select vehicle</p>
        </div>
        <QrCode className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
      </div>

      {/* Tabs - scrollable on mobile */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            activeTab === 'scanner' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
          }`}
        >
          <QrCode className="h-4 w-4 inline mr-1" />
          Scanner
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            activeTab === 'manual' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
          }`}
        >
          <Search className="h-4 w-4 inline mr-1" />
          Manual
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            activeTab === 'active' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
          }`}
        >
          <MapPin className="h-4 w-4 inline mr-1" />
          Active ({activeCheckins?.data?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            activeTab === 'history' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-1" />
          History
        </button>
      </div>

      {/* Error Alert */}
      {scanError && (
        <div className={`rounded-lg border p-4 ${ERROR_CONFIG[scanError.code]?.bg || 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-3">
            {(() => {
              const ErrorIcon = ERROR_CONFIG[scanError.code]?.icon || AlertCircle;
              return <ErrorIcon className={`h-5 w-5 mt-0.5 ${ERROR_CONFIG[scanError.code]?.color || 'text-red-600'}`} />;
            })()}
            <div className="flex-1">
              <p className={`text-sm font-medium ${ERROR_CONFIG[scanError.code]?.color || 'text-red-600'}`}>
                {scanError.message}
              </p>
            </div>
            <button onClick={() => setScanError(null)} className="text-muted-foreground hover:text-foreground">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Scanner Tab */}
      {activeTab === 'scanner' && (
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">QR Code Scanner</h2>
          <QRScanner onScan={handleScan} />
        </div>
      )}

      {/* Manual Select Tab */}
      {activeTab === 'manual' && (
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Manual Vehicle Selection</h2>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or plate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border bg-background pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
            {filteredVehicles.map((vehicle) => (
              <button
                key={vehicle._id}
                onClick={() => handleManualSelect(vehicle._id)}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{vehicle.name}</div>
                    <div className="text-xs text-muted-foreground">{vehicle.plateNumber}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  vehicle.status === 'available' ? 'bg-green-100 text-green-700' :
                  vehicle.status === 'in-use' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {vehicle.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Check-ins Tab */}
      {activeTab === 'active' && (
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Currently Checked In</h2>
          {loadingActive ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeCheckins?.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No vehicles currently checked in</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeCheckins?.data?.map((record) => (
                <div key={record._id} className="flex items-center justify-between p-3 rounded-lg border gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <LogIn className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{record.vehicleName}</div>
                      <div className="text-xs text-muted-foreground truncate">{record.vehiclePlate}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground truncate max-w-[100px]">{record.stationName || 'No station'}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(record.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-card rounded-xl border p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {loadingRecent ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentCheckins?.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No check-in/out history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCheckins?.data?.map((record) => {
                const config = STATUS_CONFIG[record.type];
                const Icon = config?.icon || AlertCircle;
                return (
                  <div key={record._id} className="flex items-center justify-between p-3 rounded-lg border gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-full ${config?.bg || 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${config?.color || 'text-gray-600'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{record.vehicleName}</div>
                        <div className="text-xs text-muted-foreground truncate">{record.plateNumber}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full ${config?.bg || 'bg-gray-100'} ${config?.color || 'text-gray-600'}`}>
                        {config?.label || record.type}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1 truncate max-w-[100px]">
                        {record.stationName || 'No station'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(record.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Scan Confirm Modal */}
      {scanData && (
        <ScanConfirmModal
          scanData={scanData}
          stations={stations || []}
          onConfirm={handleConfirmCheckin}
          onCancel={() => setScanData(null)}
          isSubmitting={checkinMutation.isPending}
        />
      )}
    </div>
  );
}
