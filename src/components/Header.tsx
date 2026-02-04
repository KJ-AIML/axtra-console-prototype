
import { LayoutGrid, ChevronRight, Bell, MessageCircle } from 'lucide-react';
import { cn } from '../utils/classnames';
import { useUserStore } from '../stores';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const user = useUserStore((state) => state.user);

  return (
    <header className={cn('h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0', className)}>
      <div className="flex items-center gap-2 text-sm">
        <div className="p-1 rounded hover:bg-gray-100 cursor-pointer text-gray-500">
          <LayoutGrid size={18} />
        </div>
        <span className="text-gray-500 font-medium">Axtra Console</span>
        <ChevronRight size={14} className="text-gray-300" />
        <span className="text-gray-900 font-medium">Global Ops</span>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          2 Escalations
        </button>
        <button className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          Manual
        </button>
        <button className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          Support
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-black transition-colors">
          <MessageCircle size={14} />
          Copilot Help
        </button>

        <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>

        <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
        </button>

        <button className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 overflow-hidden flex items-center justify-center">
          <span className="text-xs font-bold text-indigo-700">{user?.initials || 'U'}</span>
        </button>
      </div>
    </header>
  );
};
