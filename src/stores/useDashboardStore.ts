import { create } from 'zustand';

export type DashboardTab = 'Overview' | 'My Training' | 'Team Performance' | 'Live Assist' | 'QA Archive' | 'Compliance';

const DASHBOARD_TABS: DashboardTab[] = [
  'Overview',
  'My Training',
  'Team Performance',
  'Live Assist',
  'QA Archive',
  'Compliance',
] as const;

interface DashboardState {
  activeTab: DashboardTab;
  tabs: readonly DashboardTab[];
  setActiveTab: (tab: DashboardTab) => void;
  isSimulationRunning: boolean;
  startSimulation: () => void;
  stopSimulation: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeTab: 'Overview',
  tabs: DASHBOARD_TABS,

  setActiveTab: (tab) => set({ activeTab: tab }),

  isSimulationRunning: false,

  startSimulation: () => set({ isSimulationRunning: true }),

  stopSimulation: () => set({ isSimulationRunning: false }),
}));
