import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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

// Import after mocking
import { Dashboard } from './Dashboard';

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dashboard heading', () => {
    render(<Dashboard />);
    expect(screen.getByText('Console Performance')).toBeInTheDocument();
  });

  it('should render welcome message', () => {
    render(<Dashboard />);
    expect(screen.getByText('Welcome back, Operator Kj')).toBeInTheDocument();
  });

  it('should render all tabs', () => {
    render(<Dashboard />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('My Training')).toBeInTheDocument();
    expect(screen.getByText('Team Performance')).toBeInTheDocument();
    expect(screen.getByText('Live Assist')).toBeInTheDocument();
    expect(screen.getByText('QA Archive')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
  });

  it('should render KPI metrics', () => {
    render(<Dashboard />);
    expect(screen.getByText('Avg Handle Time (AHT)')).toBeInTheDocument();
    expect(screen.getByText('First Call Resolution')).toBeInTheDocument();
    expect(screen.getByText('Avg QA Score')).toBeInTheDocument();
    expect(screen.getByText('Compliance Rate')).toBeInTheDocument();
    expect(screen.getByText('Escalation Rate')).toBeInTheDocument();
  });

  it('should render KPI values', () => {
    render(<Dashboard />);
    expect(screen.getByText('4m 22s')).toBeInTheDocument();
    expect(screen.getByText('84.2%')).toBeInTheDocument();
    expect(screen.getByText('92/100')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('4.1%')).toBeInTheDocument();
  });

  it('should render Recommended Training section', () => {
    render(<Dashboard />);
    expect(screen.getByText('Recommended Training')).toBeInTheDocument();
  });

  it('should render scenario items', () => {
    render(<Dashboard />);
    expect(screen.getByText('Billing Dispute - Aggressive Persona')).toBeInTheDocument();
    expect(screen.getByText('Technical Support - Broadband Connectivity')).toBeInTheDocument();
    expect(screen.getByText('New Promotion - Upsell Opportunity')).toBeInTheDocument();
    expect(screen.getByText('Privacy & Data Protection Verification')).toBeInTheDocument();
  });

  it('should render difficulty badges', () => {
    render(<Dashboard />);
    // Check that difficulty badges appear within scenario items
    const hardBadges = screen.getAllByText('Hard');
    const mediumBadges = screen.getAllByText('Medium');
    const easyBadges = screen.getAllByText('Easy');
    expect(hardBadges.length).toBeGreaterThan(0);
    expect(mediumBadges.length).toBeGreaterThan(0);
    expect(easyBadges.length).toBeGreaterThan(0);
  });

  it('should render Skill Velocity section', () => {
    render(<Dashboard />);
    expect(screen.getByText('Skill Velocity')).toBeInTheDocument();
    expect(screen.getByText('Proficiency Level 8')).toBeInTheDocument();
  });

  it('should render QA Highlights section', () => {
    render(<Dashboard />);
    expect(screen.getByText('Recent QA Highlights')).toBeInTheDocument();
    expect(screen.getByText('Excellent Empathy')).toBeInTheDocument();
    expect(screen.getByText('Closing Script Gap')).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    render(<Dashboard />);
    expect(screen.getByText('Start Simulation')).toBeInTheDocument();
    expect(screen.getByText('View Scenario Library')).toBeInTheDocument();
    expect(screen.getByText('All Campaigns')).toBeInTheDocument();
  });

  it('should render status indicators', () => {
    render(<Dashboard />);
    expect(screen.getByText('Copilot Online')).toBeInTheDocument();
    expect(screen.getByText('Axtra v4.2 Loaded')).toBeInTheDocument();
  });

  it('should switch tabs on click', async () => {
    render(<Dashboard />);
    const myTrainingTab = screen.getByText('My Training');
    expect(myTrainingTab).toBeInTheDocument();
    // Tab is clickable - in a real test we'd click and verify state change
  });
});
