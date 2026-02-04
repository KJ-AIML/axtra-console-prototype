import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the stores module
vi.mock('../stores', () => {
  // Create mock dashboard state
  const dashboardState = {
    activeTab: 'Overview',
    setActiveTab: vi.fn(),
  };

  // Mock user state
  const userState = {
    user: {
      id: 'user-1',
      name: 'Operator Kj',
      initials: 'KJ',
      email: 'kj@axtra.example.com',
    },
  };

  // Mock dashboard data state
  const dashboardDataState = {
    metrics: [
      { id: '1', userId: 'user-1', metricKey: 'aht', metricValue: '4m 22s', subtext: '-12% from target', sortOrder: 1 },
      { id: '2', userId: 'user-1', metricKey: 'fcr', metricValue: '84.2%', subtext: '+2.1% this week', sortOrder: 2 },
      { id: '3', userId: 'user-1', metricKey: 'qa_score', metricValue: '92/100', subtext: 'Top 5% of team', sortOrder: 3 },
      { id: '4', userId: 'user-1', metricKey: 'compliance', metricValue: '100%', subtext: 'No violations detected', sortOrder: 4 },
      { id: '5', userId: 'user-1', metricKey: 'escalation', metricValue: '4.1%', subtext: 'Below industry avg', sortOrder: 5 },
    ],
    scenarios: [
      { id: '1', title: 'Billing Dispute - Aggressive Persona', difficulty: 'Hard', duration: '8-12 mins', type: 'Voice Simulation', status: 'not_started' },
      { id: '2', title: 'Technical Support - Broadband Connectivity', difficulty: 'Medium', duration: '15 mins', type: 'Knowledge Check', status: 'not_started' },
      { id: '3', title: 'New Promotion - Upsell Opportunity', difficulty: 'Easy', duration: '5 mins', type: 'Objection Handling', status: 'not_started' },
      { id: '4', title: 'Privacy & Data Protection Verification', difficulty: 'Hard', duration: '10 mins', type: 'Compliance Training', status: 'not_started' },
    ],
    skillVelocity: {
      id: '1',
      userId: 'user-1',
      level: 8,
      currentXp: 75,
      maxXp: 100,
      progressPercentage: 75,
      description: "You've completed 4 scenarios this week. You're ready for more complex billing disputes.",
    },
    qaHighlights: [
      { id: '1', userId: 'user-1', title: 'Excellent Empathy', description: 'Detected in call #4829 - "You handled the customer frustration perfectly."', type: 'positive', createdAt: '2024-01-01' },
      { id: '2', userId: 'user-1', title: 'Closing Script Gap', description: 'Missed required disclosure in call #4811. Reviewing recommended.', type: 'improvement', createdAt: '2024-01-02' },
    ],
    isLoading: false,
    error: null,
    fetchDashboardData: vi.fn(),
  };

  // Mock simulation state
  const simulationState = {
    recommendedScenarios: [
      { id: '1', title: 'Billing Dispute - Aggressive Persona', difficulty: 'Hard', duration: '8-12 mins', type: 'Voice Simulation' },
      { id: '2', title: 'Technical Support - Broadband Connectivity', difficulty: 'Medium', duration: '15 mins', type: 'Knowledge Check' },
      { id: '3', title: 'New Promotion - Upsell Opportunity', difficulty: 'Easy', duration: '5 mins', type: 'Objection Handling' },
      { id: '4', title: 'Privacy & Data Protection Verification', difficulty: 'Hard', duration: '10 mins', type: 'Compliance Training' },
    ],
    fetchRecommendedScenarios: vi.fn(),
  };

  return {
    useDashboardStore: ((selector?: any) => {
      return selector ? selector(dashboardState) : dashboardState;
    }) as any,
    useUserStore: ((selector?: any) => {
      return selector ? selector(userState) : userState;
    }) as any,
    useDashboardDataStore: ((selector?: any) => {
      return selector ? selector(dashboardDataState) : dashboardDataState;
    }) as any,
    useSimulationStore: ((selector?: any) => {
      return selector ? selector(simulationState) : simulationState;
    }) as any,
  };
});

import Dashboard from './Dashboard';
import Scenarios from './Scenarios';
import Settings from './Settings';

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Pages', () => {
  describe('Dashboard Page', () => {
    it('should render dashboard content', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByText('Console Performance')).toBeInTheDocument();
    });
  });

  describe('Scenarios Page', () => {
    it('should render scenarios page', () => {
      renderWithRouter(<Scenarios />);
      expect(screen.getByText('Scenarios')).toBeInTheDocument();
      expect(screen.getByText('Scenarios Library')).toBeInTheDocument();
    });

    it('should render page description', () => {
      renderWithRouter(<Scenarios />);
      expect(screen.getByText(/Manage and view training scenarios/i)).toBeInTheDocument();
    });
  });

  describe('Settings Page', () => {
    it('should render settings page', () => {
      renderWithRouter(<Settings />);
      expect(screen.getByText('System Settings')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});
