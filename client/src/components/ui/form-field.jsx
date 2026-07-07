import { cn } from '../../lib/utils.js';
import { Label } from './label.jsx';
import { AlertCircle } from 'lucide-react';

function FormField({ label, required, error, hint, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label required={required}>{label}</Label>
      )}
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
