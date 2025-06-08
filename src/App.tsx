import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import WelcomePage from './pages/WelcomePage';
import MatchSetupPage from './pages/MatchSetupPage';
import TossPage from './pages/TossPage';
import PlayerSelectionPage from './pages/PlayerSelectionPage';
import InningsBreakPage from './pages/InningsBreakPage';
import SecondInningsPlayersPage from './pages/SecondInningsPlayersPage';
import LiveScoringPage from './pages/LiveScoringPage';
import WinnerPage from './pages/WinnerPage';
import ScorecardPage from './pages/ScorecardPage';
import MatchHistoryPage from './pages/MatchHistoryPage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/navigation/BottomNav';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cricket-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cricket-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cricket-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Free Cricket Scorer...</p>
        </div>
      </div>
    );
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
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
