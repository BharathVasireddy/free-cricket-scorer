import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isLoading, logout, isGuest } = useAuth();

  useEffect(() => {
    // Redirect to landing page if not authenticated (instead of auth page)
    if (!isLoading && !currentUser) {
      navigate('/landing');
    }
  }, [currentUser, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cricket-green to-cricket-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🏏</div>
          <p className="text-white text-xl">Loading Free Cricket Scorer...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to landing
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/landing');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cricket-green to-cricket-blue">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Branding */}
        <div className="text-center mb-12">
          <div className="text-8xl mb-4">🏏</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Free Cricket Scorer
          </h1>
          <p className="text-xl text-green-100 mb-6">
            Professional cricket scoring made simple and free
          </p>
          <div className="flex items-center justify-center space-x-4 text-green-100">
            <span className="flex items-center space-x-1">
              <span>⚡</span>
              <span>Real-time Scoring</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>📊</span>
              <span>Live Statistics</span>
            </span>
            <span className="flex items-center space-x-1">
              <span>☁️</span>
              <span>Cloud Sync</span>
            </span>
          </div>
        </div>

        {/* User Welcome */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome back{isGuest ? ', Guest!' : '!'}
          </h2>
          {!isGuest && currentUser?.displayName && (
            <p className="text-green-100 text-lg mb-4">
              {currentUser.displayName}
            </p>
          )}
          {isGuest && (
            <p className="text-yellow-200 text-sm mb-4">
              🔓 You're in guest mode - matches will be shared publicly
            </p>
          )}
          <div className="flex justify-center space-x-4">
            {!isGuest && (
              <button
                onClick={handleLogout}
                className="text-white/80 hover:text-white text-sm underline"
              >
                Switch Account
              </button>
            )}
            {isGuest && (
              <button
                onClick={() => navigate('/auth')}
                className="bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-colors"
              >
                Create Account
              </button>
            )}
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Start New Match */}
          <div className="bg-white rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="text-6xl mb-4">🆕</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Start New Match</h3>
            <p className="text-gray-600 mb-6">
              Set up teams, players, and format to begin live scoring
            </p>
            <button
              onClick={() => navigate('/setup')}
              className="bg-cricket-green text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors w-full"
            >
              Create Match
            </button>
          </div>

          {/* Match History */}
          <div className="bg-white rounded-2xl p-8 text-center hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Match History</h3>
            <p className="text-gray-600 mb-6">
              View your past matches and detailed scorecards
            </p>
            <button
              onClick={() => navigate('/matches')}
              className="bg-cricket-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors w-full"
            >
              View Matches
            </button>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            Quick Tips
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">💡</div>
              <h4 className="text-lg font-semibold text-white mb-2">Pro Tip</h4>
              <p className="text-green-100 text-sm">
                Use keyboard shortcuts during live scoring for faster input
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">📱</div>
              <h4 className="text-lg font-semibold text-white mb-2">Mobile Ready</h4>
              <p className="text-green-100 text-sm">
                Works perfectly on your phone - score matches on the go
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🔄</div>
              <h4 className="text-lg font-semibold text-white mb-2">Auto Save</h4>
              <p className="text-green-100 text-sm">
                Your matches are automatically saved as you score
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage; 