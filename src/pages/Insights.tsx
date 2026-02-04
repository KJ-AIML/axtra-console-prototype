import { memo } from 'react';
import { cn } from '../utils/classnames';
import { TrendingUp } from 'lucide-react';

interface InsightsPageProps {
  className?: string;
}

const InsightsPage: React.FC<InsightsPageProps> = ({ className }) => {
  return (
    <div className={cn('max-w-[1200px] mx-auto', className)}>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Insights</h1>
          <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 uppercase tracking-tighter">Alpha</span>
        </div>
        <p className="text-sm text-gray-500">AI-powered analytics and insights</p>
      </div>

      <div className="flex items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={32} className="text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Performance Insights</h2>
          <p className="text-gray-500">AI-generated insights coming soon</p>
        </div>
      </div>
    </div>
  );
};

export default memo(InsightsPage);
