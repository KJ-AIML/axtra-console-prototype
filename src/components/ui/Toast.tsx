import { memo, useCallback } from 'react';
import { cn } from '../../utils/classnames';
import { useToastStore, Toast } from '../../stores/useToastStore';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';

const toastStyles = {
  success: {
    container: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-500',
    title: 'text-emerald-800',
    message: 'text-emerald-600',
    close: 'text-emerald-400 hover:text-emerald-600',
    Icon: CheckCircle2,
  },
  error: {
    container: 'bg-rose-50 border-rose-200',
    icon: 'text-rose-500',
    title: 'text-rose-800',
    message: 'text-rose-600',
    close: 'text-rose-400 hover:text-rose-600',
    Icon: XCircle,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-500',
    title: 'text-amber-800',
    message: 'text-amber-600',
    close: 'text-amber-400 hover:text-amber-600',
    Icon: AlertTriangle,
  },
  info: {
    container: 'bg-indigo-50 border-indigo-200',
    icon: 'text-indigo-500',
    title: 'text-indigo-800',
    message: 'text-indigo-600',
    close: 'text-indigo-400 hover:text-indigo-600',
    Icon: Info,
  },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem = memo<ToastItemProps>(({ toast, onRemove }) => {
  const styles = toastStyles[toast.type];
  const Icon = styles.Icon;
  
  const handleRemove = useCallback(() => {
    onRemove(toast.id);
  }, [toast.id, onRemove]);

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-xl border shadow-lg',
        'transform transition-all duration-300 ease-out',
        'animate-in slide-in-from-right-full fade-in',
        styles.container
      )}
      role="alert"
    >
      <Icon className={cn('shrink-0 mt-0.5', styles.icon)} size={20} />
      
      <div className="flex-1 min-w-0">
        <h4 className={cn('font-semibold text-sm', styles.title)}>
          {toast.title}
        </h4>
        {toast.message && (
          <p className={cn('text-sm mt-1', styles.message)}>
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleRemove();
            }}
            className={cn(
              'mt-2 text-sm font-medium underline underline-offset-2',
              styles.message
            )}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={handleRemove}
        className={cn(
          'shrink-0 p-1 rounded-lg transition-colors',
          styles.close
        )}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
});

ToastItem.displayName = 'ToastItem';

export const ToastContainer = memo(() => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
});

ToastContainer.displayName = 'ToastContainer';

export default ToastContainer;
