
import { useState, useRef, useEffect } from 'react';
import { LayoutGrid, ChevronRight, Bell, MessageCircle, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { cn } from '../utils/classnames';
import { useUserStore } from '../stores';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const accounts = useUserStore((state) => state.accounts);
  const activeAccount = useUserStore((state) => state.activeAccount);
  
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 overflow-hidden flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-700">{user?.initials || 'U'}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-gray-900 leading-tight">{user?.name || 'User'}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{activeAccount?.accountName || 'Default Account'}</p>
            </div>
            <ChevronDown size={14} className={cn("text-gray-400 transition-transform", isUserMenuOpen && "rotate-180")} />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <span className="inline-flex items-center px-2 py-0.5 mt-2 text-[10px] font-medium bg-indigo-50 text-indigo-700 rounded-full capitalize">
                  {user?.role}
                </span>
              </div>

              {/* Accounts */}
              {accounts.length > 0 && (
                <div className="py-2 border-b border-gray-100">
                  <p className="px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Accounts</p>
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2',
                        activeAccount?.id === account.id ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-700'
                      )}
                    >
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        activeAccount?.id === account.id ? 'bg-indigo-600' : 'bg-gray-300'
                      )} />
                      {account.accountName}
                    </button>
                  ))}
                </div>
              )}

              {/* Menu Items */}
              <div className="py-2">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  Profile
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Settings size={16} className="text-gray-400" />
                  Settings
                </button>
              </div>

              {/* Logout */}
              <div className="pt-2 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
