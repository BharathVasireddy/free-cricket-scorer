import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserMatches, getCommunityMatches } from '../lib/matchService';
import type { FirebaseMatch } from '../types';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [privateMatches, setPrivateMatches] = useState<(FirebaseMatch & { id: string })[]>([]);
  const [communityMatches, setCommunityMatches] = useState<(FirebaseMatch & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadMatches();
    loadCommunityMatches();
  }, [currentUser]);

  const loadMatches = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('⚡ Loading matches with optimized service...');

      // Use Promise.allSettled to handle partial failures gracefully
      const [privateResult] = await Promise.allSettled([
        currentUser ? getUserMatches(currentUser.uid) : Promise.resolve([])
      ]);

      // Handle private matches result
      const privateData = privateResult.status === 'fulfilled' ? privateResult.value : [];
      if (privateResult.status === 'rejected') {
        console.warn('Failed to load private matches:', privateResult.reason);
        setError(`Failed to load matches: ${privateResult.reason.message || 'Unknown error'}`);
      }

      setPrivateMatches(privateData);
      console.log('📊 Loaded:', privateData.length, 'private matches');

    } catch (error: any) {
      console.error('❌ Error loading matches:', error);
      setError(`Failed to load matches: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommunityMatches = async (showLoader = true) => {
    if (showLoader) {
      setIsLoadingCommunity(true);
    }
    setCommunityError(null);

    try {
      console.log('🌍 Loading community matches...');

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        if (isLoadingCommunity) {
          setCommunityError('Loading is taking longer than expected. Please check your connection.');
        }
      }, 10000);

      const matches = await getCommunityMatches();
      clearTimeout(timeout);

      setCommunityMatches(matches);
      setRetryCount(0); // Reset on success
      console.log('✅ Loaded', matches.length, 'community matches');
    } catch (error: any) {
      console.error('❌ Failed to load community matches:', error);

      const errorMessage = error.code === 'permission-denied'
        ? 'Access denied to community matches.'
        : error.code === 'unavailable'
          ? 'Community matches temporarily unavailable.'
          : error.message || 'Failed to load community matches.';

      setCommunityError(errorMessage);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  const handleRetryCommunity = () => {
    setRetryCount(prev => prev + 1);
    loadCommunityMatches();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';

    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMatchResult = (match: FirebaseMatch) => {
    if (match.status !== 'completed') return 'In Progress';
    if (match.winner === 'Match Tied') return 'Tied';
    return `${match.winner} won${match.winMargin ? ` by ${match.winMargin}` : ''}`;
  };

  const getMatchScore = (match: FirebaseMatch) => {
    if (!match.innings || match.innings.length === 0) return 'No score';

    const firstInnings = match.innings[0];
    const secondInnings = match.innings[1];

    if (!secondInnings) {
      return `${firstInnings.totalRuns}/${firstInnings.totalWickets} (${Math.floor(firstInnings.totalBalls / 6)}.${firstInnings.totalBalls % 6})`;
    }

    return `${firstInnings.totalRuns}/${firstInnings.totalWickets} vs ${secondInnings.totalRuns}/${secondInnings.totalWickets}`;
  };

  const getPlayerStats = () => {
    const completedMatches = privateMatches.filter(m => m.status === 'completed');
    const totalMatches = privateMatches.length;
    const wins = completedMatches.filter(m => {
      // Simple win detection - this could be enhanced
      return m.winner && m.winner !== 'Match Tied';
    }).length;

    return { totalMatches, completedMatches: completedMatches.length, wins };
  };

  const MatchCard = ({ match, compact = false }: { match: FirebaseMatch & { id: string }, compact?: boolean }) => (
    <div className={`bg-white rounded-lg border border-gray-200 ${compact ? 'p-3' : 'p-4'} hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className={`font-bold text-gray-900 ${compact ? 'text-base' : 'text-lg'}`}>
            {match.teams[0]?.name} vs {match.teams[1]?.name}
          </h3>
          <p className="text-xs text-gray-600">
            {match.overs} overs • {match.playersPerTeam} players
            {match.hasJoker && ' • Joker'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">{formatDate(match.createdAt)}</div>
          {(match as any).matchCode && (
            <div className="text-xs text-blue-600 font-mono">{(match as any).matchCode}</div>
          )}
        </div>
      </div>

      <div className={compact ? 'mb-2' : 'mb-3'}>
        <div className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>
          {getMatchScore(match)}
        </div>
        <div className={`text-xs font-medium ${match.status === 'completed' ? 'text-green-600' : 'text-orange-600'
          }`}>
          {getMatchResult(match)}
        </div>
      </div>
    </div>
  );

  const renderCommunitySection = () => {
    if (isLoadingCommunity) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Community Matches</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading community matches...</p>
            {retryCount > 0 && (
              <p className="text-sm text-gray-400">Attempt {retryCount + 1}</p>
            )}
          </div>
        </div>
      );
    }

    if (communityError) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Community Matches</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="text-4xl text-red-500">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Unable to Load</h3>
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm max-w-md">{communityError}</p>
            <button
              onClick={handleRetryCommunity}
              disabled={isLoadingCommunity}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <span className={isLoadingCommunity ? 'animate-spin' : ''}>🔄</span>
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Community Matches</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadCommunityMatches(false)}
              className="flex items-center space-x-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
            >
              View All →
            </button>
          </div>
        </div>

        {communityMatches.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-gray-600 dark:text-gray-300">No community matches available</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Check back later for new matches</p>
          </div>
        ) : (
          <div className="space-y-3">
            {communityMatches.slice(0, 5).map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                onClick={() => navigate(`/match/${match.matchCode || match.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-500">🏆</span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {match.teams?.[0]?.name || 'Team 1'} vs {match.teams?.[1]?.name || 'Team 2'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatDate(match.createdAt)}</span>
                    <span>{match.format || `${match.overs} overs`}</span>
                    <span className="text-green-600 dark:text-green-400">{getMatchResult(match)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {getMatchScore(match)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Loading dashboard...</p>
          <div className="text-sm text-blue-600">Getting your matches ready</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-safe">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cricket Scorer Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your cricket scoring overview.</p>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-600 mr-2">⚠️</span>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={loadMatches}
                  className="ml-auto bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <button
                onClick={() => navigate('/setup')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-6 text-left hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-3xl mb-3">🏏</div>
                <h3 className="text-xl font-bold mb-2">New Match</h3>
                <p className="text-blue-100">Start scoring a new cricket match</p>
              </button>

              <button
                onClick={() => navigate('/join')}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl p-6 text-left hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-3xl mb-3">👥</div>
                <h3 className="text-xl font-bold mb-2">Join Match</h3>
                <p className="text-green-100">Enter code to join existing match</p>
              </button>
            </div>

            {/* Recent Matches */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Your Recent Matches</h2>
                <button
                  onClick={() => navigate('/history')}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  View All →
                </button>
              </div>

              {privateMatches.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches yet</h3>
                  <p className="text-gray-600 mb-4">Start your first match to see it here</p>
                  <button
                    onClick={() => navigate('/setup')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Match
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {privateMatches.slice(0, 3).map((match) => (
                    <MatchCard key={match.id} match={match} compact />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* User Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4">📊 Your Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Matches</span>
                  <span className="font-bold text-2xl text-blue-600">
                    {getPlayerStats().totalMatches}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-bold text-2xl text-green-600">
                    {getPlayerStats().completedMatches}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Wins</span>
                  <span className="font-bold text-2xl text-yellow-600">
                    {getPlayerStats().wins}
                  </span>
                </div>
              </div>
            </div>

            {/* Community Matches Section */}
            {renderCommunitySection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 