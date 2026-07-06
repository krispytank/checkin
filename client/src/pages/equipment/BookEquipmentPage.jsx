import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { casesAPI, equipmentAPI, bookingsAPI } from '../../lib/api.js';
import { cn } from '../../lib/utils.js';
import {
  Search, Plus, FileText, Monitor, Video, Presentation, Loader2, X, Check
} from 'lucide-react';
import DateTimePopover from '../../components/DateTimePopover.jsx';

const TYPE_ICONS = {
  'Screen': Monitor,
  'Sound System': Video,
  'Camera': Presentation,
};

function CaseSearchModal({ open, onClose, onSelect }) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ caseNumber: '', title: '', type: 'criminal', parties: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cases', search],
    queryFn: async () => {
      if (!search || search.length < 2) return { data: [] };
      const res = await casesAPI.list({ search, limit: 20 });
      return res.data;
    },
    enabled: search.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: (data) => casesAPI.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['cases']);
      onSelect(res.data.data);
      onClose();
    },
  });

  if (!open) return null;

  const cases = data?.data || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl bg-card p-5 sm:p-6 shadow-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Select Case</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search by case number, title, or party..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
        </div>

        {isLoading && <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

        {!isLoading && search.length >= 2 && cases.length === 0 && (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">No cases found for &quot;{search}&quot;</p>
            <button onClick={() => { setCreateForm(f => ({ ...f, caseNumber: search.toUpperCase() })); setShowCreate(true); }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Create New Case
            </button>
          </div>
        )}

        {!isLoading && cases.length > 0 && (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {cases.map(c => (
              <button key={c._id} onClick={() => { onSelect(c); onClose(); }}
                className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors">
                <p className="text-sm font-medium">{c.caseNumber}</p>
                <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{c.type} • {c.parties}</p>
              </button>
            ))}
          </div>
        )}

        {showCreate && (
          <div className="mt-4 border-t pt-4 space-y-2.5">
            <p className="text-sm font-medium">Create Case</p>
            <input placeholder="Case Number *" value={createForm.caseNumber} onChange={e => setCreateForm(f => ({ ...f, caseNumber: e.target.value.toUpperCase() }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input placeholder="Case Type *" value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="criminal">Criminal</option>
              <option value="civil">Civil</option>
              <option value="family">Family</option>
              <option value="commercial">Commercial</option>
              <option value="constitutional">Constitutional</option>
              <option value="other">Other</option>
            </select>
            <input placeholder="Parties (e.g. State vs Smith)" value={createForm.parties} onChange={e => setCreateForm(f => ({ ...f, parties: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => createMutation.mutate({ ...createForm, caseNumber: createForm.caseNumber.toUpperCase() })} disabled={!createForm.caseNumber || !createForm.title || createMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookEquipmentPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const { data: equipData, isLoading: equipLoading } = useQuery({
    queryKey: ['equipment', 'available'],
    queryFn: async () => {
      const res = await equipmentAPI.getAvailable();
      return res.data;
    },
  });

  const equipment = equipData?.data || [];

  const toggleEquipment = (eq) => {
    setSelectedEquipment(prev => {
      const exists = prev.find(e => e._id === eq._id);
      if (exists) return prev.filter(e => e._id !== eq._id);
      return [...prev, eq];
    });
  };

  const handleSubmit = async () => {
    if (!selectedCase || selectedEquipment.length === 0 || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      const res = await bookingsAPI.create({
        caseId: selectedCase._id,
        equipmentIds: selectedEquipment.map(e => e._id),
        startDate,
        endDate,
        purpose,
      });
      const bookingId = res.data.data._id;

      if (pdfFile) {
        const fd = new FormData();
        fd.append('file', pdfFile);
        await bookingsAPI.uploadPdf(bookingId, fd);
      }

      setSubmitResult(res.data.data);
      queryClient.invalidateQueries(['bookings']);
    } catch (err) {
      setSubmitResult({ error: err?.response?.data?.message || 'Failed to create booking' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitResult && submitResult.error) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <X className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Booking Failed</h2>
          <p className="text-sm text-muted-foreground mt-1">{submitResult.error}</p>
        </div>
        <button onClick={() => setSubmitResult(null)}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Try Again
        </button>
      </div>
    );
  }

  if (submitResult && !submitResult.error) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold">Booking Confirmed</h2>
          <p className="text-sm text-muted-foreground mt-1">Your equipment request has been submitted for approval</p>
          <p className="text-xs text-muted-foreground mt-1">Booking ID: {submitResult.bookingId}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/equipment/manage')}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted">View Bookings</button>
          <button onClick={() => {
            setSelectedCase(null); setSelectedEquipment([]); setStartDate(''); setEndDate('');
            setPurpose(''); setPdfFile(null); setSubmitResult(null);
          }}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">New Booking</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">New Equipment Booking</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Select equipment and schedule for your case</p>
      </div>

      {/* Case Selection */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <label className="text-sm font-medium">Linked Case *</label>
        <button onClick={() => setCaseModalOpen(true)}
          className={cn(
            "w-full mt-2 flex items-center gap-3 rounded-lg border-2 border-dashed p-3 text-left hover:bg-muted transition-colors",
            selectedCase ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25"
          )}>
          {selectedCase ? (
            <>
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selectedCase.caseNumber}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedCase.title}</p>
              </div>
            </>
          ) : (
            <>
              <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Search or create a case...</span>
            </>
          )}
        </button>
      </div>

      {/* Equipment Selection */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <label className="text-sm font-medium">
          Select Equipment * <span className="text-muted-foreground font-normal">({selectedEquipment.length} selected)</span>
        </label>
        {equipLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : equipment.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No equipment currently available</p>
        ) : (
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {equipment.map(eq => {
              const Icon = TYPE_ICONS[eq.type] || Monitor;
              const selected = selectedEquipment.some(e => e._id === eq._id);
              return (
                <button key={eq._id} onClick={() => toggleEquipment(eq)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-colors",
                    selected ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"
                  )}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{eq.name}</p>
                    <p className="text-[10px] text-muted-foreground">{eq.serialNumber} • {eq.type}</p>
                  </div>
                  {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div>
          <label className="text-sm font-medium">Usage Period *</label>
          <p className="text-[10px] text-muted-foreground mb-2">When will the equipment be needed</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <div className="mt-1">
                <DateTimePopover value={startDate} onChange={setStartDate} label="Start" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <div className="mt-1">
                <DateTimePopover value={endDate} onChange={setEndDate} label="End" />
              </div>
            </div>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Notes</label>
          <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={2} placeholder="Any additional details..."
            className="w-full mt-1 rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>
      </div>

      {/* PDF Upload */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <label className="text-sm font-medium">Request Document (PDF)</label>
        <p className="text-[10px] text-muted-foreground mt-0.5">Upload the booking request form as PDF</p>
        <div className="mt-2">
          <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0])}
            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
        </div>
        {pdfFile && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
            <button onClick={() => setPdfFile(null)} className="text-destructive hover:underline">Remove</button>
          </div>
        )}
      </div>

      {/* Submit */}
      <button onClick={handleSubmit}
        disabled={!selectedCase || selectedEquipment.length === 0 || !startDate || !endDate || submitting}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Submit Booking
      </button>

      <CaseSearchModal open={caseModalOpen} onClose={() => setCaseModalOpen(false)} onSelect={setSelectedCase} />
    </div>
  );
}
