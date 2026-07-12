import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsAPI, authAPI } from '../../lib/api.js';
import { cn } from '../../lib/utils.js';
import {
  Loader2, Check, X, Truck, RotateCcw, FileText, Calendar, Clock,
  Monitor, Video, Presentation, ChevronDown, ChevronUp, PackageCheck,
  Gavel, GraduationCap, Users, Tag
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: Check },
  dispatched: { label: 'Dispatched', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', icon: Truck },
  'in-use': { label: 'In Use', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: Monitor },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: RotateCcw },
  received: { label: 'Received', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300', icon: PackageCheck },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: X },
};

const TYPE_ICONS = {
  'Screen': Monitor,
  'Sound System': Video,
  'Camera': Presentation,
};

const PURPOSE_TYPE_CONFIG = {
  virtual_court: { label: 'Virtual Court', icon: Gavel, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  staff_training: { label: 'Staff Training', icon: GraduationCap, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  administrative_meeting: { label: 'Admin Meeting', icon: Users, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
};

function PdfViewerModal({ open, onClose, url, title }) {
  if (!open || !url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl h-[85vh] bg-card rounded-xl overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b">
          <p className="text-sm font-medium truncate pr-4">{title || 'Document'}</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <iframe src={url} className="w-full h-[calc(100%-52px)]" title="PDF Viewer" />
      </div>
    </div>
  );
}

function BookingCard({ booking, onAction, onViewPdf, role }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  const canApproveReject = (role === 'admin' || booking.isEquipmentAdmin) && booking.status === 'pending';
  const canDispatch = (role === 'admin' || booking.isEquipmentAdmin) && booking.status === 'approved';
  const canReturn = (role === 'admin' || booking.isEquipmentAdmin || booking.isBooker) && booking.status === 'in-use';
  const canReceive = (role === 'admin' || booking.isEquipmentAdmin) && booking.status === 'returned';

  const equipment = booking.equipmentDetails || [];
  const caseInfo = booking.caseDetails || {};
  const user = booking.userDetails || {};
  const purposeCfg = PURPOSE_TYPE_CONFIG[booking.purposeType];
  const PurposeIcon = purposeCfg?.icon;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="p-4">
          <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {purposeCfg ? (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", purposeCfg.color)}>
                  <PurposeIcon className="h-3 w-3" /> {purposeCfg.label}
                </span>
              ) : booking.purposeType ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  <Tag className="h-3 w-3" /> {booking.purposeType}
                </span>
              ) : (
                <p className="text-sm font-semibold">{caseInfo.caseNumber || 'N/A'}</p>
              )}
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", statusCfg.color)}>
                <StatusIcon className="h-3 w-3" /> {statusCfg.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {booking.purposeType === 'virtual_court' ? caseInfo.title : (booking.purpose || 'No details provided')}
            </p>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg hover:bg-muted shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {equipment.map(eq => {
            const Icon = TYPE_ICONS[eq.type] || Monitor;
            return (
              <span key={eq._id || eq} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                <Icon className="h-3 w-3" /> {eq.name || eq}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : 'N/A'}
            {booking.endDate ? ` - ${new Date(booking.endDate).toLocaleDateString()}` : ''}
          </span>
          <span>{user.name || 'Unknown'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t p-4 space-y-3 text-sm">
          {booking.startDate && booking.endDate && (
            <div>
              <p className="text-xs text-muted-foreground">Time Period</p>
              <p className="text-xs">
                {new Date(booking.startDate).toLocaleString()} — {new Date(booking.endDate).toLocaleString()}
              </p>
            </div>
          )}
          {booking.purposeType === 'virtual_court' && caseInfo.caseNumber && (
            <div>
              <p className="text-xs text-muted-foreground">Case</p>
              <p className="text-xs">{caseInfo.caseNumber} — {caseInfo.title}</p>
            </div>
          )}
          {booking.purpose && (
            <div>
              <p className="text-xs text-muted-foreground">{booking.purposeType === 'virtual_court' ? 'Notes' : 'Reason'}</p>
              <p>{booking.purpose}</p>
            </div>
          )}
          {!booking.requireDocument && (
            <p className="text-xs text-muted-foreground italic">No document uploaded</p>
          )}
          {booking.pdfFilePath && (
            <button onClick={() => onViewPdf(booking.pdfFilePath, `Request - ${caseInfo.caseNumber}`)}
              className="flex items-center gap-2 text-primary hover:underline text-xs">
              <FileText className="h-3.5 w-3.5" /> View Request PDF
            </button>
          )}
          {booking.history?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">History</p>
              <div className="space-y-1">
                {booking.history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-medium capitalize">{h.status}</span>
                    <span className="text-muted-foreground">by {h.changedBy?.name || 'System'}</span>
                    <span className="text-muted-foreground ml-auto">{new Date(h.changedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(canApproveReject || canDispatch || canReturn || canReceive) && (
        <div className="border-t p-3 flex gap-2">
          {canApproveReject && (
            <>
              <button onClick={() => onAction(booking._id, 'approved')}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700">
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button onClick={() => onAction(booking._id, 'rejected')}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90">
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}
          {canDispatch && (
            <button onClick={() => onAction(booking._id, 'dispatched')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700">
              <Truck className="h-3.5 w-3.5" /> Mark Dispatched
            </button>
          )}
          {canReturn && (
            <button onClick={() => onAction(booking._id, 'returned')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">
              <RotateCcw className="h-3.5 w-3.5" /> Mark Returned
            </button>
          )}
          {canReceive && (
            <button onClick={() => onAction(booking._id, 'received')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700">
              <PackageCheck className="h-3.5 w-3.5" /> Mark Received
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManageBookingsPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [pdfModal, setPdfModal] = useState({ open: false, url: '', title: '' });

  const { data: roleData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await authAPI.me();
      return res.data;
    },
  });
  const role = roleData?.data?.role;

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', filterStatus],
    queryFn: async () => {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await bookingsAPI.list(params);
      return res.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, status }) => bookingsAPI.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries(['bookings']),
  });

  const bookings = data?.data || [];

  const handleAction = (id, status) => {
    if (!confirm(`Mark booking as ${status}?`)) return;
    actionMutation.mutate({ id, status });
  };

  const viewPdf = (filePath, title) => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const url = baseUrl.replace('/api', '') + filePath;
    setPdfModal({ open: true, url, title });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Booking Management</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Track and manage equipment bookings</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['', 'pending', 'approved', 'dispatched', 'in-use', 'returned', 'received', 'rejected'].map(s => {
          const cfg = s ? STATUS_CONFIG[s] : null;
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border transition-colors",
                filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"
              )}>
              {cfg ? <><cfg.icon className="h-3 w-3" /> {cfg.label}</> : 'All'}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : bookings.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <BookingCard key={b._id} booking={b} onAction={handleAction} onViewPdf={viewPdf} role={role} />
          ))}
        </div>
      )}

      <PdfViewerModal open={pdfModal.open} onClose={() => setPdfModal({ open: false, url: '', title: '' })}
        url={pdfModal.url} title={pdfModal.title} />
    </div>
  );
}
