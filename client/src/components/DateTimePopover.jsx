import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
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
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function TimeSpinner({ value, onChange }) {
  const [hours, minutes] = value.split(':').map(Number);

  const adjust = (type, delta) => {
    let h = hours;
    let m = minutes;
    if (type === 'hours') h = (h + delta + 24) % 24;
    else m = (m + delta + 60) % 60;
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => adjust('hours', 1)} className="rounded-lg p-1 hover:bg-accent transition-colors active:scale-95">
          <ChevronUp className="h-4 w-4" />
        </button>
        <span className="text-xl font-bold tabular-nums w-8 text-center">{String(hours).padStart(2, '0')}</span>
        <button onClick={() => adjust('hours', -1)} className="rounded-lg p-1 hover:bg-accent transition-colors active:scale-95">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <span className="text-xl font-bold text-muted-foreground/40">:</span>
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => adjust('minutes', 5)} className="rounded-lg p-1 hover:bg-accent transition-colors active:scale-95">
          <ChevronUp className="h-4 w-4" />
        </button>
        <span className="text-xl font-bold tabular-nums w-8 text-center">{String(minutes).padStart(2, '0')}</span>
        <button onClick={() => adjust('minutes', -5)} className="rounded-lg p-1 hover:bg-accent transition-colors active:scale-95">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function parseValue(val) {
  if (!val) return { date: formatDate(new Date()), time: '09:00' };
  const d = new Date(val);
  if (isNaN(d.getTime())) return { date: formatDate(new Date()), time: '09:00' };
  return {
    date: formatDate(d),
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

function formatDisplay(dateStr, timeStr) {
  if (!dateStr) return 'Select date & time';
  const d = new Date(`${dateStr}T${timeStr}`);
  if (isNaN(d.getTime())) return 'Select date & time';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function DateTimePopover({ value, onChange, label = 'Select date & time', align = 'start' }) {
  const [open, setOpen] = useState(false);
  const parsed = parseValue(value);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(parsed.date);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(parsed.date);
  const [selectedTime, setSelectedTime] = useState(parsed.time);
  const [tab, setTab] = useState('date');

  const today = new Date();
  const todayInfo = { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };

  const calendarDays = buildCalendarDays(viewDate.year, viewDate.month);

  const prevMonth = () => setViewDate(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 });
  const nextMonth = () => setViewDate(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 });

  const handleDayClick = (day) => {
    const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setTab('time');
  };

  const handleApply = () => {
    const d = new Date(`${selectedDate}T${selectedTime}`);
    onChange(d.toISOString());
    setOpen(false);
  };

  const goToToday = () => {
    const now = new Date();
    const todayStr = formatDate(now);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setSelectedDate(todayStr);
    setSelectedTime(timeStr);
    setViewDate({ year: now.getFullYear(), month: now.getMonth() });
  };

  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) { const p = parseValue(value); setSelectedDate(p.date); setSelectedTime(p.time); setTab('date'); } }}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3.5 py-2.5 text-sm",
            "hover:bg-accent hover:border-primary/30 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
            "shadow-sm hover:shadow-md w-full",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-primary/70" />
          <span className="truncate font-medium">{formatDisplay(selectedDate, selectedTime)}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 ml-auto" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={8}
          className="z-50 w-[320px] rounded-2xl border border-border/50 bg-card p-4 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
        >
          {/* Tab switcher */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl bg-muted/50">
            <button onClick={() => setTab('date')}
              className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all", tab === 'date' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <CalendarIcon className="h-3.5 w-3.5" /> Date
            </button>
            <button onClick={() => setTab('time')}
              className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all", tab === 'time' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Clock className="h-3.5 w-3.5" /> Time
            </button>
          </div>

          {tab === 'date' ? (
            <>
              {/* Month/Year navigation */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="rounded-xl p-2 hover:bg-accent transition-all duration-200 active:scale-95">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-bold tracking-tight">{MONTHS[viewDate.month]} {viewDate.year}</span>
                <button onClick={nextMonth} className="rounded-xl p-2 hover:bg-accent transition-all duration-200 active:scale-95">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {calendarDays.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} />;
                  const isToday = day === todayInfo.day && viewDate.month === todayInfo.month && viewDate.year === todayInfo.year;
                  const isSelected = selectedDateObj && day === selectedDateObj.getDate() && viewDate.month === selectedDateObj.getMonth() && viewDate.year === selectedDateObj.getFullYear();
                  return (
                    <button key={`day-${day}`} onClick={() => handleDayClick(day)}
                      className={cn(
                        "h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-150",
                        "hover:bg-primary/10 active:scale-95",
                        isToday && !isSelected && "ring-2 ring-primary/30 font-bold text-primary",
                        isSelected && "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                        !isToday && !isSelected && "text-foreground hover:text-foreground"
                      )}>
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Quick select */}
              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/30">
                <button onClick={goToToday} className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200">
                  Now
                </button>
                <button onClick={() => { const d = new Date(); d.setHours(9, 0); setSelectedTime('09:00'); setTab('time'); }}
                  className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent transition-all duration-200">
                  Set Time
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Time spinner */}
              <div className="flex justify-center py-6">
                <TimeSpinner value={selectedTime} onChange={setSelectedTime} />
              </div>

              {/* Quick times */}
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30">
                {[{ label: '8:00 AM', value: '08:00' }, { label: '9:00 AM', value: '09:00' }, { label: '12:00 PM', value: '12:00' }, { label: '1:00 PM', value: '13:00' }, { label: '5:00 PM', value: '17:00' }].map(qt => (
                  <button key={qt.value} onClick={() => setSelectedTime(qt.value)}
                    className={cn("rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200", selectedTime === qt.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent")}>
                    {qt.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Apply */}
          <button onClick={handleApply}
            className="w-full mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all duration-200">
            Confirm
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
