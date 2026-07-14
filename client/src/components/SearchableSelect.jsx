import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, X, Search } from 'lucide-react';
import { cn } from '../lib/utils.js';

export default function SearchableSelect({ options, value, onChange, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center justify-between w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm',
            'hover:bg-accent hover:border-primary/30 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'shadow-sm hover:shadow-md',
            disabled && 'opacity-50 cursor-not-allowed',
            !value && 'text-muted-foreground'
          )}
        >
          <span className="truncate">{value || placeholder || 'Select...'}</span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onChange(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(''); } }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
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
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground text-center">No results found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 text-sm rounded-lg font-medium transition-colors',
                    'hover:bg-accent focus:bg-accent focus:outline-none',
                    opt === value ? 'bg-primary/10 text-primary' : 'text-foreground'
                  )}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
