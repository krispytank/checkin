import { useState, useCallback } from 'react';

let toastCount = 0;
let toasts = [];
let listeners = [];

function notifyListeners() {
  listeners.forEach(listener => listener([...toasts]));
}

export function toast({ title, description, variant = 'default', duration = 3000 }) {
  const id = ++toastCount;
  const newToast = { id, title, description, variant, duration };
  toasts = [...toasts, newToast];
  notifyListeners();

  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  }, duration);

  return id;
}

toast.success = (title, description) => toast({ title, description, variant: 'success' });
toast.error = (title, description) => toast({ title, description, variant: 'destructive' });
toast.warning = (title, description) => toast({ title, description, variant: 'warning' });

export function useToast() {
  const [state, setState] = useState(toasts);

  const subscribe = useCallback(() => {
    const listener = (newToasts) => setState(newToasts);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  // Subscribe on mount
  useState(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  });

  return {
    toasts: state,
    toast,
    dismiss: (id) => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    },
  };
}
