import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<WelcomePage />} />
            <Route path="/setup" element={<MatchSetupPage />} />
            <Route path="/toss" element={<TossPage />} />
            <Route path="/players" element={<PlayerSelectionPage />} />
            <Route path="/innings-break" element={<InningsBreakPage />} />
            <Route path="/players-second" element={<SecondInningsPlayersPage />} />
            <Route path="/live" element={<LiveScoringPage />} />
            <Route path="/winner" element={<WinnerPage />} />
            <Route path="/scorecard" element={<ScorecardPage />} />
            <Route path="/matches" element={<MatchHistoryPage />} />
          </Routes>
      </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
