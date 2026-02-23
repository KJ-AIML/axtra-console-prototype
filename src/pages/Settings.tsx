import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/classnames';
import { Settings, ClipboardCheck, ChevronRight } from 'lucide-react';

interface SettingsPageProps {
  className?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ className }) => {
  const navigate = useNavigate();

  return (
    <div className={cn('max-w-[1200px] mx-auto', className)}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500 mt-2">Configure application settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* QA Criteria Config */}
        <button
          onClick={() => navigate('/qa-criteria-config')}
          className="flex items-center p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all text-left"
        >
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mr-4">
            <ClipboardCheck size={24} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">QA Criteria</h3>
            <p className="text-sm text-gray-500">Configure QA scoring criteria</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Placeholder for future settings */}
        <div className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-xl opacity-60">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
            <Settings size={24} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-700">More Settings</h3>
            <p className="text-sm text-gray-500">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(SettingsPage);
