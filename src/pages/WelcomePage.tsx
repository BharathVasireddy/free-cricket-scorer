import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserMatches } from '../lib/matchService';
import type { FirebaseMatch } from '../types';
import { useMatchStore } from '../store/matchStore';
import { Home, PlusSquare, ClipboardList, LogOut, Zap, BarChart3, Settings, Trophy } from 'lucide-react';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isLoading, logout } = useAuth();
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
    if (!currentUser) {
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserName = () => {
    return currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Player';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cricket-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to landing
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-safe">
      {/* Mobile App Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-r from-cricket-blue to-blue-600 rounded-xl flex items-center justify-center">
                <Trophy size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Cricket Scorer</h1>
                <p className="text-xs text-gray-500">
                  {getGreeting()}, {getUserName()}!
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut size={18} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 pb-24">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-cricket-blue to-blue-600 rounded-3xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">{getGreeting()}!</h2>
              <p className="text-blue-100">Ready to score some cricket?</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Zap size={24} className="text-white" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/setup')}
              className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <div className="text-center">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <PlusSquare size={18} className="text-white" />
                </div>
                <div className="font-bold text-sm">New Match</div>
                <div className="text-[10px] text-green-100 mt-0.5">Start scoring</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/matches')}
              className="bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <div className="text-center">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <ClipboardList size={18} className="text-white" />
                </div>
                <div className="font-bold text-sm">My Matches</div>
                <div className="text-[10px] text-purple-100 mt-0.5">View history</div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Matches */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Matches</h2>
            {recentMatches.length > 0 && (
              <button
                onClick={() => navigate('/matches')}
                className="text-cricket-blue text-sm font-semibold"
              >
                View All →
              </button>
            )}
          </div>

          {matchesLoading ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-8 h-8 border-3 border-cricket-blue border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Loading matches...</p>
            </div>
          ) : recentMatches.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">No matches yet</h3>
              <p className="text-gray-600 text-sm mb-4">
                Start your first match to see it here
              </p>
              <button
                onClick={() => navigate('/setup')}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg"
              >
                Create Match
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-bold text-gray-900">
                          {match.teams[0]?.name} vs {match.teams[1]?.name}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${match.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                          }`}>
                          {match.status === 'completed' ? 'Completed' : 'Live'}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-700 mb-1">
                        {formatMatchScore(match)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getMatchStatus(match)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        useMatchStore.getState().loadMatch(match);
                        navigate('/scorecard');
                      }}
                      className="ml-4 bg-cricket-blue text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Features</h2>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Real-time Scoring</div>
                <div className="text-sm text-gray-600">Live ball-by-ball updates</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                <BarChart3 size={18} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Detailed Statistics</div>
                <div className="text-sm text-gray-600">Complete batting & bowling figures</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 bottom-nav">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center space-y-1 text-cricket-blue">
            <Home size={18} className="text-cricket-blue" />
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => navigate('/setup')}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-green-500 transition-colors"
          >
            <PlusSquare size={18} className="text-gray-400" />
            <span className="text-xs font-medium">New</span>
          </button>

          <button
            onClick={() => navigate('/matches')}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-purple-500 transition-colors"
          >
            <ClipboardList size={18} className="text-gray-400" />
            <span className="text-xs font-medium">Matches</span>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-indigo-500 transition-colors"
          >
            <Settings size={18} className="text-gray-400" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;