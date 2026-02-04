import { cn } from '../../utils/classnames';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) => {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-gray-200',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: width,
        height: height,
      }}
    />
  );
};

// Pre-built skeleton layouts for common patterns

export const CardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn('bg-white border border-gray-200 rounded-xl p-5', className)}>
    <div className="flex items-start justify-between mb-3">
      <Skeleton variant="rounded" width={60} height={20} />
      <Skeleton variant="rounded" width={40} height={20} />
    </div>
    <Skeleton className="mb-2" width="80%" height={20} />
    <Skeleton className="mb-4" width="100%" height={16} />
    <Skeleton className="mb-4" width="60%" height={14} />
    <div className="flex gap-4 mb-4">
      <Skeleton width={80} height={14} />
      <Skeleton width={80} height={14} />
    </div>
    <Skeleton variant="rounded" width="100%" height={40} />
  </div>
);

export const StatCardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn('bg-white border border-gray-200 rounded-xl p-4', className)}>
    <Skeleton width={80} height={14} className="mb-2" />
    <Skeleton width={60} height={32} />
  </div>
);

export const ScenarioCardSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    {/* Header */}
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <Skeleton variant="rounded" width={50} height={18} />
        <Skeleton width={60} height={12} />
      </div>
      <Skeleton variant="rounded" width={30} height={18} />
    </div>

    {/* Title & Description */}
    <Skeleton className="mb-2" width="85%" height={18} />
    <Skeleton className="mb-2" width="100%" height={14} />
    <Skeleton className="mb-4" width="70%" height={14} />

    {/* Persona */}
    <div className="flex items-center gap-2 mb-4">
      <Skeleton variant="circular" width={14} height={14} />
      <Skeleton width={120} height={14} />
    </div>

    {/* Stats */}
    <div className="flex items-center gap-4 mb-4">
      <Skeleton width={70} height={12} />
      <Skeleton width={80} height={12} />
    </div>

    {/* Button */}
    <Skeleton variant="rounded" width="100%" height={40} />
  </div>
);

export const DashboardMetricsSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
);

export const ScenariosGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {[...Array(count)].map((_, i) => (
      <ScenarioCardSkeleton key={i} />
    ))}
  </div>
);

export const SkillVelocitySkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <Skeleton width={120} height={14} className="mb-1" />
        <Skeleton width={80} height={12} />
      </div>
      <Skeleton variant="rounded" width={50} height={24} />
    </div>
    <Skeleton className="mb-3" width="100%" height={8} />
    <div className="flex justify-between">
      <Skeleton width={100} height={12} />
      <Skeleton width={80} height={12} />
    </div>
  </div>
);

export const QAHighlightSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <div className="flex items-start gap-3">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton width="70%" height={16} className="mb-2" />
        <Skeleton width="90%" height={14} className="mb-2" />
        <Skeleton width={100} height={12} />
      </div>
    </div>
  </div>
);

export const SidebarSkeleton = () => (
  <div className="w-[220px] h-full bg-white border-r border-gray-200 p-4">
    {/* Logo */}
    <div className="flex items-center gap-3 mb-8">
      <Skeleton variant="rounded" width={32} height={32} />
      <Skeleton width={100} height={20} />
    </div>

    {/* Nav items */}
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} variant="rounded" width="100%" height={40} />
      ))}
    </div>

    {/* Bottom section */}
    <div className="absolute bottom-4 left-4 right-4">
      <Skeleton variant="rounded" width="100%" height={60} />
    </div>
  </div>
);

export const ActiveCallSkeleton = () => (
  <div className="h-screen flex flex-col bg-gray-100">
    {/* Header */}
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton width={200} height={16} />
      </div>
      <Skeleton variant="rounded" width={60} height={24} />
    </div>

    {/* 3-Column Layout */}
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel */}
      <div className="w-[280px] shrink-0 bg-white border-r border-gray-200 p-4">
        <Skeleton variant="circular" width={48} height={48} className="mb-4" />
        <Skeleton width="60%" height={20} className="mb-2" />
        <Skeleton width="40%" height={16} className="mb-6" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <Skeleton width="40%" height={12} className="mb-2" />
              <Skeleton width="100%" height={16} />
            </div>
          ))}
        </div>
      </div>

      {/* Center Panel */}
      <div className="flex-1 bg-white p-4">
        <Skeleton variant="rounded" width="100%" height={80} className="mb-4" />
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton width={`${60 + (i % 3) * 15}%`} height={60} variant="rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-[320px] shrink-0 bg-gray-50 border-l border-gray-200 p-4">
        <Skeleton width="60%" height={20} className="mb-4" />
        <Skeleton variant="rounded" width="100%" height={80} className="mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={100} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Skeleton;
