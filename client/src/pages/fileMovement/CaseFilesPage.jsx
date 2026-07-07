import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileMovementAPI, registriesAPI, stationsAPI } from '../../lib/api.js';
import { FolderOpen, Plus, Search, Loader2, X, Eye, Trash2 } from 'lucide-react';

const FILE_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'issued', label: 'Issued' },
  { value: 'in_court', label: 'In Court' },
  { value: 'at_registry', label: 'At Registry' },
  { value: 'at_chambers', label: 'At Chambers' },
  { value: 'strong_room', label: 'Strong Room' },
  { value: 'archived', label: 'Archived' },
  { value: 'closed', label: 'Closed' },
];

const FILE_CATEGORIES = [
  { value: 'mention', label: 'Mention' },
  { value: 'hearing', label: 'Hearing' },
  { value: 'judgment', label: 'Judgment' },
  { value: 'appeal', label: 'Appeal' },
  { value: 'perusal', label: 'Perusal' },
  { value: 'files_for_mention', label: 'Files for Mention' },
  { value: 'files_for_hearing', label: 'Files for Hearing' },
  { value: 'files_for_ruling', label: 'Files for Ruling' },
  { value: 'files_for_judgment', label: 'Files for Judgment' },
  { value: 'files_for_typing', label: 'Files for Typing' },
  { value: 'files_pending_signature', label: 'Files Pending Signature' },
  { value: 'archived', label: 'Archived' },
];

export default function CaseFilesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showMoveForm, setShowMoveForm] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [filters, setFilters] = useState({ search: '', fileStatus: '', registryId: '' });

  const { data: filesData, isLoading } = useQuery({
    queryKey: ['case-files', filters],
    queryFn: async () => {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.fileStatus) params.fileStatus = filters.fileStatus;
      if (filters.registryId) params.registryId = filters.registryId;
      const response = await fileMovementAPI.listCaseFiles(params);
      return response.data;
    },
  });

  const { data: registriesData } = useQuery({
    queryKey: ['registries'],
    queryFn: async () => { const r = await registriesAPI.list(); return r.data; },
  });

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => { const r = await stationsAPI.list(); return r.data; },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => fileMovementAPI.deleteCaseFile(id),
    onSuccess: () => queryClient.invalidateQueries(['case-files']),
  });

  const files = filesData?.data || [];
  const registries = registriesData?.data || [];
  const stations = stationsData?.data || [];

  const getRegistryName = (id) => registries.find(r => r._id === id)?.name || '-';
  const getStationName = (id) => stations.find(s => s._id === id)?.name || '-';

  const statusColor = {
    available: 'bg-green-50 text-green-700',
    issued: 'bg-amber-50 text-amber-700',
    in_court: 'bg-purple-50 text-purple-700',
    at_registry: 'bg-blue-50 text-blue-700',
    at_chambers: 'bg-indigo-50 text-indigo-700',
    strong_room: 'bg-red-50 text-red-700',
    archived: 'bg-gray-50 text-gray-700',
    closed: 'bg-gray-50 text-gray-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Case Files</h1>
          <p className="text-muted-foreground">Manage and track case files across registries</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Case File
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-lg border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filters.fileStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, fileStatus: e.target.value }))}
            className="rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            {FILE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={filters.registryId}
            onChange={(e) => setFilters(prev => ({ ...prev, registryId: e.target.value }))}
            className="rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Registries</option>
            {registries.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {/* Files list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No case files found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">File Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Registry</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Station</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">File Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file._id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{file.caseFileNumber}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{file.caseTitle}</td>
                    <td className="px-4 py-3 text-xs">{getRegistryName(file.registryId)}</td>
                    <td className="px-4 py-3 text-xs">{getStationName(file.courtStationId)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[file.fileStatus] || ''}`}>
                        {file.fileStatus?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{file.fileCategory?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowDetail(file)} className="p-1.5 rounded hover:bg-muted">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => setShowMoveForm(file)} className="p-1.5 rounded hover:bg-muted">
                          <FolderOpen className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <CaseFileFormModal
          registries={registries}
          stations={stations}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); queryClient.invalidateQueries(['case-files']); }}
        />
      )}

      {/* Move Form Modal */}
      {showMoveForm && (
        <MoveFileModal
          file={showMoveForm}
          onClose={() => setShowMoveForm(null)}
          onSuccess={() => { setShowMoveForm(null); queryClient.invalidateQueries(['case-files']); }}
        />
      )}

      {/* Detail Modal */}
      {showDetail && (
        <CaseFileDetailModal
          file={showDetail}
          onClose={() => setShowDetail(null)}
        />
      )}
    </div>
  );
}

function CaseFileFormModal({ registries, stations, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    caseFileNumber: '', caseTitle: '', caseType: '', registryId: '', courtStationId: '',
    courtRoom: '', fileCategory: 'mention', parties: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => fileMovementAPI.createCaseFile(data),
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create Case File</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Case File Number *</label>
            <input type="text" value={formData.caseFileNumber} onChange={(e) => setFormData(p => ({ ...p, caseFileNumber: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Case Title *</label>
            <input type="text" value={formData.caseTitle} onChange={(e) => setFormData(p => ({ ...p, caseTitle: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Court Station *</label>
              <select value={formData.courtStationId} onChange={(e) => setFormData(p => ({ ...p, courtStationId: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required>
                <option value="">Select station</option>
                {stations.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Registry *</label>
              <select value={formData.registryId} onChange={(e) => setFormData(p => ({ ...p, registryId: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required>
                <option value="">Select registry</option>
                {registries.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Case Type</label>
              <input type="text" value={formData.caseType} onChange={(e) => setFormData(p => ({ ...p, caseType: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Court Room</label>
              <input type="text" value={formData.courtRoom} onChange={(e) => setFormData(p => ({ ...p, courtRoom: e.target.value }))}
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">File Category</label>
            <select value={formData.fileCategory} onChange={(e) => setFormData(p => ({ ...p, fileCategory: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {FILE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoveFileModal({ file, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    toDestination: '', movementType: 'issued_to_user', reason: '', expectedReturnDate: '',
  });

  const moveMutation = useMutation({
    mutationFn: (data) => fileMovementAPI.createMovement({ ...data, caseFileId: file._id }),
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    moveMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Move File: {file.caseFileNumber}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Movement Type *</label>
            <select value={formData.movementType} onChange={(e) => setFormData(p => ({ ...p, movementType: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required>
              <option value="issued_to_user">Issued to User</option>
              <option value="sent_to_court">Sent to Court</option>
              <option value="sent_to_chambers">Sent to Chambers</option>
              <option value="sent_to_strong_room">Sent to Strong Room</option>
              <option value="transferred">Transferred</option>
              <option value="internal">Internal Movement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Destination *</label>
            <input type="text" value={formData.toDestination} onChange={(e) => setFormData(p => ({ ...p, toDestination: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Court Room 3, Judge's Chambers" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason *</label>
            <textarea value={formData.reason} onChange={(e) => setFormData(p => ({ ...p, reason: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={2} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expected Return Date</label>
            <input type="date" value={formData.expectedReturnDate} onChange={(e) => setFormData(p => ({ ...p, expectedReturnDate: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={moveMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {moveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Move File
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CaseFileDetailModal({ file, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['case-file-detail', file._id],
    queryFn: async () => {
      const response = await fileMovementAPI.getCaseFile(file._id);
      return response.data;
    },
  });

  const detail = data?.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{file.caseFileNumber}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{detail.caseTitle}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="font-medium capitalize">{detail.fileStatus?.replace(/_/g, ' ')}</span></div>
              <div><span className="text-muted-foreground">Registry:</span> <span className="font-medium">{detail.registryDetails?.name || '-'}</span></div>
              <div><span className="text-muted-foreground">Station:</span> <span className="font-medium">{detail.stationDetails?.name || '-'}</span></div>
              <div><span className="text-muted-foreground">Category:</span> <span className="font-medium capitalize">{detail.fileCategory?.replace(/_/g, ' ')}</span></div>
              <div><span className="text-muted-foreground">Court Room:</span> <span className="font-medium">{detail.courtRoom || '-'}</span></div>
            </div>

            {detail.movements && detail.movements.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Movement History</h4>
                <div className="space-y-2">
                  {detail.movements.map((m, i) => (
                    <div key={i} className="rounded-lg border p-3 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{m.movementType?.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground">{new Date(m.dateIssued).toLocaleString()}</span>
                      </div>
                      <p className="text-muted-foreground mt-1">To: {m.toDestination}</p>
                      <p className="text-muted-foreground">Reason: {m.reason}</p>
                      {m.status === 'active' && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 mt-1">
                          Active
                        </span>
                      )}
                      {m.status === 'returned' && (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 mt-1">
                          Returned
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
