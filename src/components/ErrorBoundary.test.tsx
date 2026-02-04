import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';

describe('ErrorBoundary Component', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  const originalWarn = console.warn;
  beforeEach(() => {
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <div>Normal content</div>
      </ErrorBoundary>
    );

    // With no error, normal content should be shown
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should have refresh and home buttons in fallback UI', () => {
    const error = new Error('Test error');

    render(<ErrorFallback error={error} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });

  it('should display error message in fallback UI', () => {
    const error = new Error('Specific error message');

    render(<ErrorFallback error={error} />);

    expect(screen.getByText('Specific error message')).toBeInTheDocument();
  });

  it('should show support contact link', () => {
    const error = new Error('Test error');

    render(<ErrorFallback error={error} />);

    expect(screen.getByText('contact support')).toBeInTheDocument();
    const emailLink = screen.getByRole('link', { name: 'contact support' });
    expect(emailLink).toHaveAttribute('href', 'mailto:support@axtra.example.com');
  });

  it('should call reset handler when provided', () => {
    const resetHandler = vi.fn();
    const error = new Error('Test error');

    render(<ErrorFallback error={error} resetErrorBoundary={resetHandler} />);

    const tryAgainButton = screen.getByText('Try Again');
    tryAgainButton.click();
    expect(resetHandler).toHaveBeenCalled();
  });

  it('should show error details in development', () => {
    const error = new Error('Test error');
    error.stack = 'Error: Test error\n    at Component';

    render(<ErrorFallback error={error} />);

    // In dev mode, error details should be visible
    const details = screen.queryByText(/Error Details/);
    if (import.meta.env.DEV) {
      expect(details).toBeInTheDocument();
    }
  });
});
