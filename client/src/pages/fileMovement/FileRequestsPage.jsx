import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileMovementAPI } from '../../lib/api.js';
import { FileText, Loader2, X, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function FileRequestsPage() {
  const queryClient = useQueryClient();
  const [showDetail, setShowDetail] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['file-requests'],
    queryFn: async () => {
      const response = await fileMovementAPI.listRequests();
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }) => fileMovementAPI.approveRequest(id, data),
    onSuccess: () => queryClient.invalidateQueries(['file-requests']),
  });

  const requests = data?.data || [];

  const statusColor = {
    pending: 'bg-yellow-50 text-yellow-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">File Requests</h1>
        <p className="text-muted-foreground">Manage file request approvals</p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No file requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Requester</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Case File</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Urgency</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req._id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs">{req.requesterId?.slice(-6) || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{req.caseFileDetails?.caseFileNumber || '-'}</td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate">{req.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        req.urgency === 'urgent' ? 'bg-red-50 text-red-700' :
                        req.urgency === 'high' ? 'bg-orange-50 text-orange-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                        {req.urgency}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[req.status] || ''}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {req.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => approveMutation.mutate({ id: req._id, data: {} })}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Rejection reason:');
                              if (reason) approveMutation.mutate({ id: req._id, data: { rejectionReason: reason } });
                            }}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
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
