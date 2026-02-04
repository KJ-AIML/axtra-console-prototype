
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  Login,
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
import { useNavigationStore, useUserStore } from './stores';
import { Loader2 } from 'lucide-react';

interface AppProps {
  className?: string;
}

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useUserStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={24} />
          <span className="font-medium">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public Route wrapper (redirects to home if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useUserStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={24} />
          <span className="font-medium">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Main app layout for authenticated users
const MainLayout: React.FC<{ className?: string }> = ({ className }) => {
  const location = useLocation();
  const syncWithPath = useNavigationStore((state) => state.syncWithPath);

  // Sync navigation state with route changes
  useEffect(() => {
    syncWithPath(location.pathname);
  }, [location.pathname, syncWithPath]);

  return (
    <div className={cn('flex h-screen w-full bg-[#FCFCFD]', className)}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
        <Header />
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
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// App content with auth routing
const AppContent: React.FC<AppProps> = (props) => {
  const init = useUserStore((state) => state.init);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize auth state on app load
  useEffect(() => {
    init().finally(() => setIsInitializing(false));
  }, [init]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={24} />
          <span className="font-medium">Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      
      {/* Protected Routes */}
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <MainLayout {...props} />
          </ProtectedRoute>
        } 
      />
    </Routes>
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
