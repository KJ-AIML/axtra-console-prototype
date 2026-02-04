
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  Scenarios,
  Personas,
  Simulations,
  Copilot,
  ActiveCalls,
  Recordings,
  QAScoring,
  Insights,
  KnowledgeBase,
  Offers,
  Settings,
  DeveloperAPI,
} from './pages';
import { cn } from './utils/classnames';
import { useNavigationStore } from './stores';

interface AppProps {
  className?: string;
}

// Inner app component that uses router hooks
const AppContent: React.FC<{ className?: string }> = ({ className }) => {
  const location = useLocation();
  const syncWithPath = useNavigationStore((state) => state.syncWithPath);

  // Sync navigation state with route changes
  useEffect(() => {
    syncWithPath(location.pathname);
  }, [location.pathname, syncWithPath]);

  return (
    <div className={cn('flex h-screen w-full bg-[#FCFCFD]', className)}>
      {/* Sidebar with collapse state management */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
        {/* Top Navigation / Breadcrumb */}
        <Header />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scenarios" element={<Scenarios />} />
            <Route path="/personas" element={<Personas />} />
            <Route path="/simulations" element={<Simulations />} />
            <Route path="/copilot" element={<Copilot />} />
            <Route path="/active-calls" element={<ActiveCalls />} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="/qa-scoring" element={<QAScoring />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/developer-api" element={<DeveloperAPI />} />
            {/* Catch-all route - redirect to home */}
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC<AppProps> = (props) => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent {...props} />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
