
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<WelcomePage />} />
            <Route path="/setup" element={<MatchSetupPage />} />
            <Route path="/toss" element={<TossPage />} />
            <Route path="/players" element={<PlayerSelectionPage />} />
            <Route path="/innings-break" element={<InningsBreakPage />} />
            <Route path="/players-second" element={<SecondInningsPlayersPage />} />
            <Route path="/live" element={<LiveScoringPage />} />
            <Route path="/winner" element={<WinnerPage />} />
            <Route path="/scorecard" element={<ScorecardPage />} />
            <Route path="/matches" element={
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Match History</h1>
                  <p className="text-gray-600 mb-4">Coming soon in Phase 5!</p>
                  <button
                    onClick={() => window.history.back()}
                    className="btn-primary"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
