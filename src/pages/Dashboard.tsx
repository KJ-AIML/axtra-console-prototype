import { memo } from 'react';
import { cn } from '../utils/classnames';
import { Dashboard as DashboardContent } from '../components/Dashboard';

interface DashboardPageProps {
  className?: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ className }) => {
  return (
    <div className={cn('w-full', className)}>
      <DashboardContent />
    </div>
  );
};

export default memo(DashboardPage);
