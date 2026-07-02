import { useToast } from '../lib/useToast.js';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils.js';

const variantStyles = {
  default: 'border bg-background text-foreground',
  success: 'border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
  destructive: 'border-red-500/50 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
  warning: 'border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100',
};

const iconMap = {
  success: CheckCircle,
  destructive: AlertCircle,
  warning: AlertTriangle,
};

export default function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.variant];
        return (
          <div
            key={toast.id}
            className={cn(
              'rounded-lg border p-4 shadow-lg animate-in slide-in-from-bottom-5 fade-in-0',
              variantStyles[toast.variant]
            )}
          >
            <div className="flex items-start gap-3">
              {Icon && <Icon className="h-5 w-5 mt-0.5 shrink-0" />}
              <div className="flex-1">
                {toast.title && (
                  <p className="font-semibold text-sm">{toast.title}</p>
                )}
                {toast.description && (
                  <p className="text-sm opacity-90 mt-1">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
