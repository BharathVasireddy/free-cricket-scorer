import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { lazy, Suspense } from 'react';
import BottomNav from './components/navigation/BottomNav';

// Lazy load page components
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const MatchSetupPage = lazy(() => import('./pages/MatchSetupPage'));
const TossPage = lazy(() => import('./pages/TossPage'));
const PlayerSelectionPage = lazy(() => import('./pages/PlayerSelectionPage'));
const InningsBreakPage = lazy(() => import('./pages/InningsBreakPage'));
const SecondInningsPlayersPage = lazy(() => import('./pages/SecondInningsPlayersPage'));
const LiveScoringPage = lazy(() => import('./pages/LiveScoringPage'));
const WinnerPage = lazy(() => import('./pages/WinnerPage'));
const ScorecardPage = lazy(() => import('./pages/ScorecardPage'));
const MatchHistoryPage = lazy(() => import('./pages/MatchHistoryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-cricket-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg">Loading...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
};

// Public Route (redirect to dashboard if already authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Root Route - Smart redirect based on auth status
const RootRoute = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/landing" replace />;
};

// Layout component to handle bottom navigation visibility
const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const hideBottomNavPaths = ['/landing', '/auth', '/toss', '/live', '/winner', '/scorecard'];
  const shouldShowBottomNav = !hideBottomNavPaths.includes(location.pathname);

  return (
    <>
      {children}
      {shouldShowBottomNav && <BottomNav />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Root route - smart redirect */}
              <Route path="/" element={<RootRoute />} />
              
              {/* Public routes */}
              <Route path="/landing" element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              } />
              <Route path="/auth" element={
                <PublicRoute>
                  <AuthPage />
                </PublicRoute>
              } />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <WelcomePage />
                </ProtectedRoute>
              } />
              <Route path="/setup" element={
                <ProtectedRoute>
                  <MatchSetupPage />
                </ProtectedRoute>
              } />
              <Route path="/toss" element={
                <ProtectedRoute>
                  <TossPage />
                </ProtectedRoute>
              } />
              <Route path="/players" element={
                <ProtectedRoute>
                  <PlayerSelectionPage />
                </ProtectedRoute>
              } />
              <Route path="/innings-break" element={
                <ProtectedRoute>
                  <InningsBreakPage />
                </ProtectedRoute>
              } />
              <Route path="/players-second" element={
                <ProtectedRoute>
                  <SecondInningsPlayersPage />
                </ProtectedRoute>
              } />
              <Route path="/live" element={
                <ProtectedRoute>
                  <LiveScoringPage />
                </ProtectedRoute>
              } />
              <Route path="/winner" element={
                <ProtectedRoute>
                  <WinnerPage />
                </ProtectedRoute>
              } />
              <Route path="/scorecard" element={
                <ProtectedRoute>
                  <ScorecardPage />
                </ProtectedRoute>
              } />
              <Route path="/matches" element={
                <ProtectedRoute>
                  <MatchHistoryPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
