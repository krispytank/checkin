import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI, usersAPI } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatDateTime, cn } from '../lib/utils.js';
import { 
  Mail, Send, Inbox, Trash2, Eye, Loader2, 
  AlertCircle, Bell, MessageSquare, Plus, X 
} from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showCompose, setShowCompose] = useState(false);

  // Get messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages', folder],
    queryFn: async () => {
      const response = await messagesAPI.list({ folder });
      return response.data;
    },
  });

  // Get users for compose
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await usersAPI.list({ limit: 100 });
      return response.data;
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id) => messagesAPI.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => messagesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      setSelectedMessage(null);
    },
  });

  const messages = messagesData?.data || [];
  const unreadCount = messagesData?.unreadCount || 0;
  const users = usersData?.data || [];

  const getMessageIcon = (type) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'notification':
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-green-500" />;
    }
  };

  const handleSelectMessage = (message) => {
    setSelectedMessage(message);
    if (!message.read && message.receiverId === user._id) {
      markReadMutation.mutate(message._id);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Internal messaging system</p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Compose
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Folder tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFolder('inbox')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium flex-1",
                folder === 'inbox' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Inbox className="h-4 w-4" />
              Inbox
              {unreadCount > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFolder('sent')}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium flex-1",
                folder === 'sent' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Send className="h-4 w-4" />
              Sent
            </button>
          </div>

          {/* Message list */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages</p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {messages.map((message) => (
                  <button
                    key={message._id}
                    onClick={() => handleSelectMessage(message)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                      selectedMessage?._id === message._id && "bg-muted",
                      !message.read && folder === 'inbox' && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getMessageIcon(message.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            !message.read && folder === 'inbox' && "font-bold"
                          )}>
                            {folder === 'inbox' 
                              ? (users.find(u => u._id === message.senderId)?.name || 'System')
                              : (users.find(u => u._id === message.receiverId)?.name || 'Unknown')
                            }
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{message.subject}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message detail */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    From: {users.find(u => u._id === selectedMessage.senderId)?.name || 'System'}
                    {' • '}
                    {formatDateTime(selectedMessage.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(selectedMessage._id)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm py-12 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a message to view</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          users={users}
          onClose={() => setShowCompose(false)}
          onSuccess={() => {
            setShowCompose(false);
            queryClient.invalidateQueries(['messages']);
          }}
        />
      )}
    </div>
  );
}

function ComposeModal({ users, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    receiverId: '',
    type: 'message',
    subject: '',
    content: '',
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => messagesAPI.send(data),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessageMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Compose Message</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <select
              value={formData.receiverId}
              onChange={(e) => setFormData(prev => ({ ...prev, receiverId: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select recipient</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>{user.name} ({user.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="message">Message</option>
              <option value="alert">Alert</option>
              <option value="notification">Notification</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter subject"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={5}
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Type your message..."
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendMessageMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
