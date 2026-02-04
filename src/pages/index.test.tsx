import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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
