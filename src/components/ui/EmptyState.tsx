import { ReactNode } from 'react';
import { cn } from '../../utils/classnames';
import { 
  Search, 
  FileX, 
  Inbox, 
  ClipboardList, 
  Users,
  PhoneOff,
  History,
  AlertCircle,
  LucideIcon
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  search: Search,
  file: FileX,
  inbox: Inbox,
  list: ClipboardList,
  users: Users,
  phone: PhoneOff,
  history: History,
  alert: AlertCircle,
};

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: keyof typeof icons | ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: {
    container: 'py-8',
    icon: 'w-12 h-12',
    iconSize: 24,
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-16',
    icon: 'w-16 h-16',
    iconSize: 32,
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-20',
    icon: 'w-20 h-20',
    iconSize: 40,
    title: 'text-xl',
    description: 'text-base',
  },
};

export const EmptyState = ({
  title,
  description,
  icon = 'inbox',
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) => {
  const styles = sizeStyles[size];
  const IconComponent = typeof icon === 'string' ? icons[icon] : null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        styles.container,
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'bg-gray-100 rounded-2xl flex items-center justify-center mb-4',
          styles.icon
        )}
      >
        {typeof icon === 'string' && IconComponent ? (
          <IconComponent className="text-gray-400" size={styles.iconSize} />
        ) : (
          icon
        )}
      </div>

      {/* Title */}
      <h3 className={cn('font-semibold text-gray-900 mb-2', styles.title)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-gray-500 max-w-md mb-6', styles.description)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Pre-configured empty states for common scenarios

export const NoResultsEmptyState = ({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm?: string;
  onClear: () => void;
  className?: string;
}) => (
  <EmptyState
    icon="search"
    title={searchTerm ? `No results for "${searchTerm}"` : 'No results found'}
    description="Try adjusting your search or filters to find what you're looking for."
    action={{ label: 'Clear filters', onClick: onClear }}
    className={className}
  />
);

export const NoScenariosEmptyState = ({
  onBrowse,
  className,
}: {
  onBrowse: () => void;
  className?: string;
}) => (
  <EmptyState
    icon="list"
    title="No training scenarios"
    description="Get started by exploring our available training scenarios to improve your skills."
    action={{ label: 'Browse scenarios', onClick: onBrowse }}
    className={className}
  />
);

export const NoCallHistoryEmptyState = ({
  className,
}: {
  className?: string;
}) => (
  <EmptyState
    icon="history"
    title="No call history"
    description="Your past calls and simulations will appear here once you start practicing."
    className={className}
    size="sm"
  />
);

export const NoDataEmptyState = ({
  title = 'No data available',
  description = 'There is no data to display at the moment.',
  onRefresh,
  className,
}: {
  title?: string;
  description?: string;
  onRefresh?: () => void;
  className?: string;
}) => (
  <EmptyState
    icon="inbox"
    title={title}
    description={description}
    action={onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined}
    className={className}
  />
);

export const ErrorEmptyState = ({
  title = 'Something went wrong',
  description = 'We encountered an error while loading the data. Please try again.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
  className?: string;
}) => (
  <EmptyState
    icon="alert"
    title={title}
    description={description}
    action={{ label: 'Try again', onClick: onRetry }}
    className={className}
  />
);

export default EmptyState;
