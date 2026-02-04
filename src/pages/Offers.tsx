import { memo } from 'react';
import { cn } from '../utils/classnames';
import { Zap } from 'lucide-react';

interface OffersPageProps {
  className?: string;
}

const OffersPage: React.FC<OffersPageProps> = ({ className }) => {
  return (
    <div className={cn('max-w-[1200px] mx-auto', className)}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Offers & Rules</h1>
        <p className="text-sm text-gray-500 mt-2">Manage promotional offers and business rules</p>
      </div>

      <div className="flex items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={32} className="text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Offers Configuration</h2>
          <p className="text-gray-500">Active offers and rules will be displayed here</p>
        </div>
      </div>
    </div>
  );
};

export default memo(OffersPage);
