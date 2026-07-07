import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileMovementAPI } from '../../lib/api.js';
import { Textarea, FormField } from '../../components/ui/index.js';
import { Archive, Loader2, X, LogOut, LogIn, AlertCircle } from 'lucide-react';

export default function StrongRoomPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['strong-room'],
    queryFn: async () => {
      const response = await fileMovementAPI.listStrongRoom();
      return response.data;
    },
  });

  const { data: filesData } = useQuery({
    queryKey: ['case-files-for-strong-room'],
    queryFn: async () => {
      const response = await fileMovementAPI.listCaseFiles({ fileStatus: 'strong_room' });
      return response.data;
    },
  });

  const records = data?.data || [];
  const strongRoomFiles = filesData?.data || [];

  const statusColor = {
    released: 'bg-amber-50 text-amber-700',
    returned: 'bg-green-50 text-green-700',
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Strong Room Management</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Track files released from and returned to the strong room</p>
      </div>

      {/* Currently in Strong Room */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold text-sm mb-3">Files in Strong Room ({strongRoomFiles.length})</h3>
        {strongRoomFiles.length === 0 ? (
          <p className="text-xs sm:text-sm text-muted-foreground">No files currently in strong room</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {strongRoomFiles.map(f => (
              <FileCard key={f._id} file={f} queryClient={queryClient} />
            ))}
          </div>
        )}
      </div>

      {/* Strong Room Log */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/50">
          <h3 className="font-semibold text-sm">Release/Return Log</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No strong room records</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Case File</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Released</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Returned</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record._id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{record.caseFileId?.slice(-8) || '-'}</td>
                    <td className="px-4 py-3 text-xs">{new Date(record.releaseTime).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">{record.returnTime ? new Date(record.returnTime).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate">{record.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[record.status] || ''}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {record.status === 'released' && (
                        <ReturnButton recordId={record._id} queryClient={queryClient} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FileCard({ file, queryClient }) {
  const [showRelease, setShowRelease] = useState(false);
  const [reason, setReason] = useState('');

  const releaseMutation = useMutation({
    mutationFn: (data) => fileMovementAPI.releaseFromStrongRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['strong-room']);
      queryClient.invalidateQueries(['case-files-for-strong-room']);
      setShowRelease(false);
      setReason('');
    },
  });

  return (
    <>
      <div className="rounded-lg border p-3 text-sm flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs">{file.caseFileNumber}</p>
          <p className="text-muted-foreground text-xs truncate">{file.caseTitle}</p>
        </div>
        <button
          onClick={() => setShowRelease(true)}
          className="shrink-0 p-1.5 rounded hover:bg-orange-50 text-muted-foreground hover:text-orange-600 transition-colors"
          title="Release from strong room"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {showRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Release File</h3>
              <button onClick={() => setShowRelease(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Release <strong>{file.caseFileNumber}</strong> from the strong room.
            </p>
            {releaseMutation.error && (
              <div className="mb-3 p-2 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {releaseMutation.error.response?.data?.message || 'Failed to release'}
              </div>
            )}
            <form onSubmit={(e) => {
              e.preventDefault();
              releaseMutation.mutate({ caseFileId: file._id, reason });
            }} className="space-y-3">
              <FormField label="Reason" required>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for release..."
                  rows={3}
                  required
                />
              </FormField>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowRelease(false)}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={releaseMutation.isPending || !reason}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">
                  {releaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function ReturnButton({ recordId, queryClient }) {
  const returnMutation = useMutation({
    mutationFn: () => fileMovementAPI.returnToStrongRoom(recordId, {}),
    onSuccess: () => queryClient.invalidateQueries(['strong-room']),
  });

  return (
    <button
      onClick={() => returnMutation.mutate()}
      disabled={returnMutation.isPending}
      className="p-1.5 rounded hover:bg-green-50 text-green-600"
      title="Return to Strong Room"
    >
      {returnMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
    </button>
  );
}
