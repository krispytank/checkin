import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils.js';

function TimeSpinner({ value, onChange }) {
  const [hours, minutes] = value ? value.split(':').map(Number) : [9, 0];

  const adjust = (type, delta) => {
    let h = hours;
    let m = minutes;
    if (type === 'hours') {
      h = (h + delta + 24) % 24;
    } else {
      m = (m + delta + 60) % 60;
    }
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Hours */}
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => adjust('hours', 1)}
          className="rounded-lg p-1 hover:bg-accent transition-colors active:scale-95">
          <ChevronUp className="h-4 w-4" />
        </button>
        <span className="text-2xl font-bold tabular-nums w-10 text-center">{String(hours).padStart(2, '0')}</span>
        <button onClick={() => adjust('hours', -1)}
          className="rounded-lg p-1 hover:bg-accent transition-colors active:scale-95">
          <ChevronDown className="h-4 w-4" />
        </button>
        <span className="text-[10px] text-muted-foreground font-medium">Hours</span>
      </div>

      <span className="text-2xl font-bold text-muted-foreground/40">:</span>

      {/* Minutes */}
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => adjust('minutes', 5)}
          className="rounded-lg p-1 hover:bg-accent transition-colors active:scale-95">
          <ChevronUp className="h-4 w-4" />
        </button>
        <span className="text-2xl font-bold tabular-nums w-10 text-center">{String(minutes).padStart(2, '0')}</span>
        <button onClick={() => adjust('minutes', -5)}
          className="rounded-lg p-1 hover:bg-accent transition-colors active:scale-95">
          <ChevronDown className="h-4 w-4" />
        </button>
        <span className="text-[10px] text-muted-foreground font-medium">Minutes</span>
      </div>
    </div>
  );
}

const QUICK_TIMES = [
  { label: '8:00 AM', value: '08:00' },
  { label: '9:00 AM', value: '09:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '1:00 PM', value: '13:00' },
  { label: '5:00 PM', value: '17:00' },
];

export default function TimePopover({ value, onChange, label = 'Select time', align = 'start' }) {
  const [open, setOpen] = useState(false);
  const [tempTime, setTempTime] = useState(value || '09:00');

  const displayText = value
    ? (() => {
        const [h, m] = value.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
      })()
    : label;

  const handleApply = () => {
    onChange(tempTime);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) setTempTime(value || '09:00'); }}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3.5 py-2.5 text-sm",
            "hover:bg-accent hover:border-primary/30 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
            "shadow-sm hover:shadow-md",
            !value && "text-muted-foreground"
          )}
        >
          <Clock className="h-4 w-4 shrink-0 text-primary/70" />
          <span className="truncate font-medium">{displayText}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align={align}
          sideOffset={8}
          className="z-50 min-w-[var(--radix-popover-trigger-width)] rounded-2xl border border-border/50 bg-card p-4 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
        >
          {/* Time spinner */}
          <div className="flex justify-center py-4">
            <TimeSpinner value={tempTime} onChange={setTempTime} />
          </div>

          {/* Quick select */}
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30">
            {QUICK_TIMES.map(qt => (
              <button
                key={qt.value}
                onClick={() => { onChange(qt.value); setOpen(false); }}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                  tempTime === qt.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                {qt.label}
              </button>
            ))}
          </div>

          {/* Apply */}
          <button onClick={handleApply}
            className="w-full mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all duration-200">
            Apply
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
