import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserMatches } from '../lib/matchService';
import type { FirebaseMatch } from '../types';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isLoading, logout, isGuest } = useAuth();
  const [recentMatches, setRecentMatches] = useState<(FirebaseMatch & { id: string })[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  useEffect(() => {
    // Only redirect if not authenticated after loading is complete
    if (!isLoading && !currentUser) {
      navigate('/landing');
    }
  }, [currentUser, isLoading, navigate]);

  useEffect(() => {
    loadRecentMatches();
  }, [currentUser]);

  const loadRecentMatches = async () => {
    if (!currentUser || isGuest) {
      setMatchesLoading(false);
      return;
    }

    try {
      const matches = await getUserMatches(currentUser.uid);
      setRecentMatches(matches.slice(0, 3)); // Show only 3 most recent
    } catch (error) {
      console.error('Failed to load recent matches:', error);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/landing');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const formatMatchScore = (match: FirebaseMatch) => {
    if (!match.innings || match.innings.length === 0) return 'No score';
    
    const firstInnings = match.innings[0];
    const secondInnings = match.innings[1];
    
    if (!secondInnings) {
      return `${firstInnings.totalRuns}/${firstInnings.totalWickets}`;
    }
    
    return `${firstInnings.totalRuns}/${firstInnings.totalWickets} vs ${secondInnings.totalRuns}/${secondInnings.totalWickets}`;
  };

  const getMatchStatus = (match: FirebaseMatch) => {
    if (match.status === 'completed') {
      return match.winner === 'Match Tied' ? 'Tied' : `${match.winner} won`;
    }
    return 'In Progress';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cricket-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to landing
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile App Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🏏</div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Cricket Scorer</h1>
                <p className="text-xs text-gray-600">
                  {isGuest ? 'Guest Mode' : `Welcome, ${currentUser?.displayName || 'Player'}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 pb-20">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/setup')}
              className="bg-cricket-blue text-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">🆕</div>
                <div className="font-semibold text-base">New Match</div>
                <div className="text-xs text-blue-100 mt-1">Start scoring</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/matches')}
              className="bg-white text-gray-700 rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all active:scale-95"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📋</div>
                <div className="font-semibold text-base">My Matches</div>
                <div className="text-xs text-gray-500 mt-1">View history</div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Matches */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Matches</h2>
            {!isGuest && recentMatches.length > 0 && (
              <button 
                onClick={() => navigate('/matches')}
                className="text-cricket-blue text-sm font-medium"
              >
                View All
              </button>
            )}
          </div>

          {isGuest ? (
            <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
              <div className="text-4xl mb-3">👤</div>
              <h3 className="font-semibold text-gray-900 mb-2">Guest Mode</h3>
              <p className="text-gray-600 text-sm mb-4">
                Your matches are public and not saved to your profile
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="bg-cricket-blue text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Create Account
              </button>
            </div>
          ) : matchesLoading ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <div className="w-6 h-6 border-2 border-cricket-blue border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Loading matches...</p>
            </div>
          ) : recentMatches.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-semibold text-gray-900 mb-2">No matches yet</h3>
              <p className="text-gray-600 text-sm mb-4">
                Start your first match to see it here
              </p>
              <button
                onClick={() => navigate('/setup')}
                className="bg-cricket-blue text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Create Match
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((match) => (
                <div 
                  key={match.id}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {match.teams[0]?.name} vs {match.teams[1]?.name}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          match.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {match.status === 'completed' ? 'Completed' : 'Live'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {formatMatchScore(match)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getMatchStatus(match)}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/scorecard')}
                      className="text-cricket-blue text-sm font-medium"
                    >
                      View →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* App Features */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center space-x-4">
              <div className="text-2xl">⚡</div>
              <div>
                <div className="font-medium text-gray-900">Real-time Scoring</div>
                <div className="text-sm text-gray-600">Live ball-by-ball updates</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center space-x-4">
              <div className="text-2xl">📊</div>
              <div>
                <div className="font-medium text-gray-900">Detailed Statistics</div>
                <div className="text-sm text-gray-600">Complete batting & bowling figures</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center space-x-4">
              <div className="text-2xl">☁️</div>
              <div>
                <div className="font-medium text-gray-900">Cloud Backup</div>
                <div className="text-sm text-gray-600">Your matches are safely stored</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center space-y-1 text-cricket-blue">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
            </svg>
            <span className="text-xs font-medium">Home</span>
          </button>
          
          <button 
            onClick={() => navigate('/setup')}
            className="flex flex-col items-center space-y-1 text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium">New Match</span>
          </button>
          
          <button 
            onClick={() => navigate('/matches')}
            className="flex flex-col items-center space-y-1 text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs font-medium">Matches</span>
          </button>
          
          <button 
            onClick={() => navigate('/scorecard')}
            className="flex flex-col items-center space-y-1 text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Stats</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;