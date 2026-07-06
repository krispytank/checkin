import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '../lib/api.js';
import { Search, ChevronDown, X, Loader2, User } from 'lucide-react';

export default function UserEmployeeSelect({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1">PJ/Employee No</label>
      <div
        className="w-full flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm cursor-pointer"
        onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
      >
        <User className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : (selectedUser ? `${selectedUser.employeeId} - ${selectedUser.name}` : value || '')}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={isOpen ? 'Search by name or PJ number...' : 'Select or type PJ number'}
          className="flex-1 bg-transparent outline-none text-sm truncate"
          readOnly={!isOpen && !!selectedUser}
        />
        {value && !isOpen && (
          <button type="button" onClick={handleClear} className="p-0.5 rounded hover:bg-muted">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-card shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {search ? 'No users found' : 'No users available'}
            </div>
          ) : (
            filtered.map((user, i) => (
              <div
                key={user._id}
                className={`px-3 py-2 cursor-pointer text-sm hover:bg-muted ${i === highlightedIndex ? 'bg-muted' : ''}`}
                onClick={() => handleSelect(user)}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                <div className="font-medium">{user.employeeId}</div>
                <div className="text-muted-foreground text-xs">{user.name}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
