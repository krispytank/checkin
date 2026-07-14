import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind classes
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date to YYYY-MM-DD
export function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Format time to HH:MM
export function formatTime(date) {
  const d = new Date(date);
  return d.toTimeString().slice(0, 5);
}

// Format datetime to readable string
export function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format duration from milliseconds to HH:MM:SS
export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}

// Calculate hours worked between two dates
export function calculateHoursWorked(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
}

// Get attendance status color
export function getStatusColor(status) {
  const colors = {
    present: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    absent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'half-day': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    overtime: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
}

// Get message type icon
export function getMessageTypeIcon(type) {
  const icons = {
    alert: 'AlertCircle',
    message: 'Mail',
    notification: 'Bell',
  };
  return icons[type] || 'MessageSquare';
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Truncate text
export function truncate(str, length = 50) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

// Capitalize first letter
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Message popup dismissal tracking (localStorage) ---
const MSG_READ_KEY = 'msg-read-times';

function _loadReadTimes() {
  try {
    return JSON.parse(localStorage.getItem(MSG_READ_KEY) || '{}');
  } catch {
    return {};
  }
}

function _saveReadTimes(obj) {
  try {
    localStorage.setItem(MSG_READ_KEY, JSON.stringify(obj));
  } catch { /* ignore */ }
}

// Record the moment a message was read (called when user opens a message)
export function markMessageRead(messageId) {
  const times = _loadReadTimes();
  if (!times[messageId]) {
    times[messageId] = Date.now();
    _saveReadTimes(times);
  }
}

// Returns the timestamp when the message was read, or null
export function getMessageReadTime(messageId) {
  const times = _loadReadTimes();
  return times[messageId] || null;
}

// Returns true if the message was read more than `delayMs` ago (default 5 min)
export function isMessageExpiredInPopup(messageId, delayMs = 5 * 60 * 1000) {
  const readAt = getMessageReadTime(messageId);
  if (!readAt) return false;
  return Date.now() - readAt > delayMs;
}

// Filter messages for the popup dropdown: remove read messages older than 5 min
export function filterMessagesForPopup(messages) {
  return messages.filter(msg => {
    if (!msg.read) return true; // unread → always show
    return !isMessageExpiredInPopup(msg._id); // read but not yet expired → show
  });
}

// Periodically clean up old entries from localStorage (keep last 500)
export function cleanupReadTimes() {
  const times = _loadReadTimes();
  const entries = Object.entries(times);
  if (entries.length <= 500) return;
  // Sort by read time ascending and keep newest 500
  entries.sort((a, b) => a[1] - b[1]);
  const kept = Object.fromEntries(entries.slice(-500));
  _saveReadTimes(kept);
}

// Get initials from name
export function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
