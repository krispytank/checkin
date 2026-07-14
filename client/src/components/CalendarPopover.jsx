import { useState, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { cn, formatDate } from '../lib/utils.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function buildCalendarDays(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }
  return days;
}

export default function CalendarPopover({ value, onChange, label = 'Select date', align = 'start' }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = new Date(value);
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const today = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }, []);

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  const calendarDays = useMemo(
    () => buildCalendarDays(viewDate.year, viewDate.month),
    [viewDate.year, viewDate.month]
  );

  const prevMonth = () => {
    setViewDate(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setViewDate(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleDayClick = (day) => {
    const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setOpen(false);
  };

  const goToToday = () => {
    const now = new Date();
    setViewDate({ year: now.getFullYear(), month: now.getMonth() });
    onChange(formatDate(now));
    setOpen(false);
  };

  const displayText = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : label;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
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
          <CalendarIcon className="h-4 w-4 shrink-0 text-primary/70" />
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
          {/* Month/Year navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="rounded-xl p-2 hover:bg-accent transition-all duration-200 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold tracking-tight">
              {MONTHS[viewDate.month]} {viewDate.year}
            </span>
            <button
              onClick={nextMonth}
              className="rounded-xl p-2 hover:bg-accent transition-all duration-200 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }

              const isToday =
                day === today.day &&
                viewDate.month === today.month &&
                viewDate.year === today.year;

              const isSelected =
                selectedDate &&
                day === selectedDate.getDate() &&
                viewDate.month === selectedDate.getMonth() &&
                viewDate.year === selectedDate.getFullYear();

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-150",
                    "hover:bg-primary/10 active:scale-95",
                    isToday && !isSelected && "ring-2 ring-primary/30 font-bold text-primary",
                    isSelected && "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                    !isToday && !isSelected && "text-foreground hover:text-foreground"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick select shortcuts */}
          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/30">
            <button
              onClick={goToToday}
              className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200"
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                onChange(formatDate(d));
                setOpen(false);
              }}
              className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent transition-all duration-200"
            >
              7d ago
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                onChange(formatDate(d));
                setOpen(false);
              }}
              className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent transition-all duration-200"
            >
              30d ago
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
