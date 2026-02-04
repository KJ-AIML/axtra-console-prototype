
import { useCallback, memo } from 'react';
import {
  Home,
  Users,
  BookOpen,
  Mic,
  MessageSquare,
  Settings,
  ChevronDown,
  Code2,
  Zap,
  Target,
  ShieldCheck,
  TrendingUp,
  BrainCircuit,
  Headphones,
  ChevronLeft,
  ChevronRight,
  Puzzle,
  type LucideIcon
} from 'lucide-react';
import { cn } from '../utils/classnames';
import { useNavigationStore, useSidebarStore, ROUTE_PATHS } from '../stores';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  className?: string;
}

// Navigation items configuration - moved outside component
type NavItemConfig = {
  id: string;
  label: string;
  icon: LucideIcon;
  isAlpha?: boolean;
};

type NavSectionConfig = {
  title?: string;
  items: NavItemConfig[];
};

const NAV_SECTIONS: NavSectionConfig[] = [
  {
    items: [{ id: 'home', label: 'Dashboard', icon: Home }],
  },
  {
    title: 'Training',
    items: [
      { id: 'scenarios', label: 'Scenarios', icon: BookOpen },
      { id: 'personas', label: 'Personas', icon: Users },
      { id: 'simulations', label: 'Simulations', icon: Mic },
    ],
  },
  {
    title: 'Assist',
    items: [
      { id: 'copilot', label: 'Realtime Copilot', icon: BrainCircuit },
      { id: 'active-calls', label: 'Active Calls', icon: Headphones },
    ],
  },
  {
    title: 'Quality',
    items: [
      { id: 'recordings', label: 'Recordings', icon: MessageSquare },
      { id: 'qa-scoring', label: 'QA Scoring', icon: ShieldCheck },
      { id: 'trends', label: 'Insights', icon: TrendingUp, isAlpha: true },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'kb', label: 'Knowledge Base', icon: Puzzle },
      { id: 'offers', label: 'Offers & Rules', icon: Zap },
    ],
  },
  {
    items: [{ id: 'settings', label: 'System Settings', icon: Settings }],
  },
];

const FOOTER_ITEMS: NavItemConfig[] = [
  { id: 'devs', label: 'Developer API', icon: Code2 },
];

// Memoized NavSection component
const NavSection = memo<{ title?: string; isCollapsed: boolean; children: React.ReactNode }>(
  ({ title, isCollapsed, children }) => (
    <div className="mb-6">
      {title && !isCollapsed && (
        <h3 className="px-4 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider truncate">
          {title}
        </h3>
      )}
      {isCollapsed && title && <div className="h-px bg-gray-100 mx-4 mb-4" />}
      <div className="space-y-[2px]">{children}</div>
    </div>
  )
);
NavSection.displayName = 'NavSection';

// Memoized NavItem component with memoization
const NavItem = memo<{
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  isAlpha?: boolean;
  isCollapsed: boolean;
}>(({ id, label, icon: Icon, active, onClick, isAlpha, isCollapsed }) => (
  <div className="relative group">
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200',
        active ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
        isCollapsed ? 'justify-center' : 'justify-between'
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn(active ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600')}>
          <Icon size={18} />
        </span>
        {!isCollapsed && <span className="truncate">{label}</span>}
      </div>
      {!isCollapsed && isAlpha && (
        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 uppercase tracking-tighter">
          Alpha
        </span>
      )}
    </button>

    {/* Tooltip for collapsed state */}
    {isCollapsed && (
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-[11px] font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg pointer-events-none">
        {label} {isAlpha && '(Alpha)'}
      </div>
    )}
  </div>
));
NavItem.displayName = 'NavItem';

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const activeNav = useNavigationStore((state) => state.activeNav);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const toggle = useSidebarStore((state) => state.toggle);
  const navigate = useNavigate();

  // Memoized navigation handler
  const handleNavClick = useCallback((id: string) => {
    const path = ROUTE_PATHS[id];
    if (path) {
      navigate(path);
    }
  }, [navigate]);

  const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-[240px]';

  return (
    <aside className={cn(sidebarWidth, 'h-full border-r border-gray-200 bg-[#FCFCFD] flex flex-col shrink-0 transition-all duration-300 ease-in-out relative', className)}>
      {/* Brand & Toggle */}
      <div className="p-4 mb-2 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">AX</span>
            </div>
            {!isCollapsed && <span className="font-bold text-xl tracking-tight truncate">Axtra Console</span>}
          </div>
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Workspace Switcher */}
        <button className={cn(
          'w-full flex items-center border border-gray-200 rounded-lg bg-white shadow-sm hover:border-gray-300 transition-all overflow-hidden',
          isCollapsed ? 'p-2 justify-center' : 'px-3 py-2 justify-between'
        )}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
              <Target size={12} className="text-white" />
            </div>
            {!isCollapsed && <span className="font-medium text-sm truncate">Operations Console</span>}
          </div>
          {!isCollapsed && <ChevronDown size={14} className="text-gray-400" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 scroll-smooth">
        {NAV_SECTIONS.map((section, index) => (
          <NavSection key={section.title || `section-${index}`} title={section.title} isCollapsed={isCollapsed}>
            {section.items.map((item) => (
              <NavItem
                key={item.id}
                {...item}
                active={activeNav === item.id}
                onClick={() => handleNavClick(item.id)}
                isCollapsed={isCollapsed}
              />
            ))}
          </NavSection>
        ))}
      </div>

      {/* Footer Nav */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        {FOOTER_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            {...item}
            active={activeNav === item.id}
            onClick={() => handleNavClick(item.id)}
            isCollapsed={isCollapsed}
          />
        ))}
        <button className={cn(
          'w-full flex items-center rounded-lg upgrade-button border border-gray-200 shadow-sm hover:shadow transition-all group overflow-hidden',
          isCollapsed ? 'p-2 justify-center' : 'px-3 py-2.5 gap-3'
        )}>
          <Zap size={18} className="text-gray-900 fill-yellow-400 shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Explore Pro</span>}
        </button>
      </div>
    </aside>
  );
};
