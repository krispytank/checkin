import { useState, useRef, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '../lib/api.js';
import { Search, ChevronDown, X, Loader2, User } from 'lucide-react';
import { cn } from '../lib/utils.js';

export default function UserEmployeeSelect({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const res = await usersAPI.list({ limit: 500 });
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  const users = data || [];

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.employeeId?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  function handleSelect(user) {
    onChange(user.employeeId || '');
    setIsOpen(false);
    setSearch('');
  }

  function handleClear() {
    onChange('');
    setSearch('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlightedIndex]) {
      e.preventDefault();
      handleSelect(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  }

  const selectedUser = users.find(u => u.employeeId === value);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">PJ/Employee No</label>
      <Popover.Root open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setSearch(''); }}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-left',
              'hover:bg-accent hover:border-primary/30 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
              'shadow-sm hover:shadow-md'
            )}
          >
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className={cn('flex-1 truncate', !selectedUser && !value && 'text-muted-foreground')}>
              {selectedUser ? `${selectedUser.employeeId} - ${selectedUser.name}` : value || 'Select or type PJ number'}
            </span>
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleClear(); } }}
                className="p-0.5 rounded hover:bg-muted cursor-pointer shrink-0"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="end"
            sideOffset={8}
            className="z-50 min-w-[var(--radix-popover-trigger-width)] rounded-xl border border-border/50 bg-card p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="p-2 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by name or PJ number..."
                  className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {search ? 'No users found' : 'No users available'}
                </div>
              ) : (
                filtered.map((user, i) => (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => handleSelect(user)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className={cn(
                      'w-full px-3 py-2.5 cursor-pointer text-sm rounded-lg transition-colors text-left',
                      'hover:bg-accent focus:bg-accent focus:outline-none',
                      i === highlightedIndex && 'bg-accent'
                    )}
                  >
                    <div className="font-medium">{user.employeeId}</div>
                    <div className="text-muted-foreground text-xs">{user.name}</div>
                  </button>
                ))
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
