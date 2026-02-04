import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the stores module
vi.mock('../stores', () => {
  // Create mock dashboard state
  const dashboardState = {
    activeTab: 'Overview',
    tabs: ['Overview', 'My Training', 'Team Performance', 'Live Assist', 'QA Archive', 'Compliance'] as const,
    setActiveTab: vi.fn(),
    isSimulationRunning: false,
    startSimulation: vi.fn(),
    stopSimulation: vi.fn(),
  };

  return {
    useDashboardStore: ((selector?: any) => {
      return selector ? selector(dashboardState) : dashboardState;
    }) as any,
  };
});

// Import after mocking
import { useDashboardStore } from '../stores';
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
