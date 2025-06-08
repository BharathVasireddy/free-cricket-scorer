import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isLoading, logout, isGuest } = useAuth();

  useEffect(() => {
    // Redirect to auth page if not authenticated
    if (!isLoading && !currentUser) {
      navigate('/auth');
    }
  }, [currentUser, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cricket-green to-cricket-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🏏</div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cricket-green via-green-600 to-green-800 flex flex-col">
      {/* Header with user info */}
      <div className="flex justify-between items-center p-6">
        <div className="text-white">
          <div className="text-sm opacity-75">Welcome back</div>
          <div className="font-semibold">
            {currentUser.isAnonymous ? '👥 Guest User' : `👤 ${currentUser.displayName || currentUser.email}`}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-white/75 hover:text-white text-sm font-medium"
        >
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="text-center mb-12">
          <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <span className="text-4xl">🏏</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
            Cricket Scorer
          </h1>
          <p className="text-green-100 text-xl font-medium">
            Professional scoring made simple
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => navigate('/setup')}
            className="w-full bg-white text-cricket-green font-bold py-5 px-6 rounded-2xl shadow-2xl hover:bg-gray-50 hover:shadow-3xl transition-all duration-200 transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="text-xl">🏏</span>
              <span className="text-lg">Start New Match</span>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/matches')}
            className="w-full bg-transparent text-white font-semibold py-5 px-6 rounded-2xl border-2 border-white/30 hover:bg-white/10 hover:border-white/50 transition-all duration-200"
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="text-xl">📊</span>
                              <span className="text-lg">{isGuest ? 'Explore Community' : 'My Dashboard'}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Features Footer */}
      <div className="pb-8 px-6">
        <div className="max-w-sm mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="text-white space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">⚡</span>
                <span className="text-sm font-medium">Live ball-by-ball scoring</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">📱</span>
                <span className="text-sm font-medium">Mobile-first design</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">🎯</span>
                <span className="text-sm font-medium">Custom rules & formats</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage; 