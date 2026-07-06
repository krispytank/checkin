import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookersAPI, usersAPI } from '../../lib/api.js';
import { Loader2, UserPlus, X, Shield } from 'lucide-react';

export default function AdminBookersPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data: bookersData, isLoading } = useQuery({
    queryKey: ['bookers'],
    queryFn: async () => {
      const res = await bookersAPI.list();
      return res.data;
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersAPI.list({ limit: 200 });
      return res.data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await bookersAPI.add(userId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookers'] });
      setShowAddModal(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await bookersAPI.remove(userId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookers'] });
    },
  });

  const bookers = bookersData?.data || [];
  const users = usersData?.data || [];

  // Filter users not already bookers
  const bookerIds = new Set(bookers.map(b => b._id));
  const availableUsers = users.filter(u => !bookerIds.has(u._id));

  const filteredBookers = bookers.filter(b =>
    !search || b.name?.toLowerCase().includes(search.toLowerCase()) || b.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Designated Bookers</h1>
          <p className="text-muted-foreground">Manage users who can book equipment</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <UserPlus className="h-4 w-4" /> Add Booker
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search bookers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-background px-4 py-2 text-sm"
        />
      </div>

      {/* Bookers List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredBookers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No designated bookers found</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Role</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBookers.map(booker => (
                  <tr key={booker._id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{booker.name}</td>
                    <td className="p-3 text-muted-foreground">{booker.email}</td>
                    <td className="p-3 capitalize">{booker.moduleAccess?.equipment?.role || 'user'}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => removeMutation.mutate(booker._id)}
                        disabled={removeMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Booker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Designated Booker</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select a user to grant equipment booking permissions.
            </p>
            {availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No available users to add.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {availableUsers.map(user => (
                  <div key={user._id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <button onClick={() => addMutation.mutate(user._id)}
                      disabled={addMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
