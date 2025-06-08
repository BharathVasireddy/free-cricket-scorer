import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserMatches, getCommunityMatches } from '../lib/matchService';
import type { Match } from '../types';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();
  const [privateMatches, setPrivateMatches] = useState<(Match & { id: string })[]>([]);
  const [communityMatches, setCommunityMatches] = useState<(Match & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadMatches();
  }, [currentUser]);

  const loadMatches = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('⚡ Loading dashboard matches with optimized service...');
      
      // Use Promise.allSettled for better error handling
      const [privateResult, communityResult] = await Promise.allSettled([
        currentUser && !isGuest ? getUserMatches(currentUser.uid) : Promise.resolve([]),
        getCommunityMatches()
      ]);
      
      // Handle results gracefully
      const privateData = privateResult.status === 'fulfilled' ? privateResult.value : [];
      const communityData = communityResult.status === 'fulfilled' ? communityResult.value : [];
      
      setPrivateMatches(privateData);
      setCommunityMatches(communityData);
      
      console.log('📊 Dashboard loaded:', privateData.length, 'private,', communityData.length, 'community');
      
      // Only show error if both failed
      if (privateResult.status === 'rejected' && communityResult.status === 'rejected') {
        setError('Unable to load matches. Please check your connection.');
      }
    } catch (error: any) {
      console.error('❌ Error loading dashboard matches:', error);
      setError('Failed to load matches');
    } finally {
      setIsLoading(false);
    }
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

  const getMatchResult = (match: Match) => {
    if (match.status !== 'completed') return 'In Progress';
    if (match.winner === 'Match Tied') return 'Tied';
    return `${match.winner} won${match.winMargin ? ` by ${match.winMargin}` : ''}`;
  };

  const getMatchScore = (match: Match) => {
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

  const MatchCard = ({ match, compact = false }: { match: Match & { id: string }, compact?: boolean }) => (
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
        <div className={`text-xs font-medium ${
          match.status === 'completed' ? 'text-green-600' : 'text-orange-600'
        }`}>
          {getMatchResult(match)}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🏏</div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // GUEST USER DASHBOARD
  if (isGuest) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
          <div className="p-4 flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-white/80 hover:text-white text-sm font-medium"
            >
              ← Back
            </button>
            <h1 className="text-lg font-bold">Community Explorer</h1>
            <div className="w-12"></div>
          </div>
          
          <div className="px-4 pb-6 text-center">
            <div className="text-3xl mb-2">👥</div>
            <h2 className="text-xl font-bold mb-1">Discover Cricket Matches</h2>
            <p className="text-white/90 text-sm">
              Explore matches from the cricket community
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => navigate('/setup')}
              className="bg-cricket-blue text-white p-4 rounded-lg text-center hover:bg-blue-700 transition-colors"
            >
              <div className="text-2xl mb-1">🏏</div>
              <div className="text-sm font-medium">Start New Match</div>
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="bg-green-600 text-white p-4 rounded-lg text-center hover:bg-green-700 transition-colors"
            >
              <div className="text-2xl mb-1">🔒</div>
              <div className="text-sm font-medium">Create Account</div>
            </button>
          </div>

          {/* Community Stats */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3">🌟 Community Stats</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-cricket-blue">{communityMatches.length}</div>
                <div className="text-xs text-gray-600">Total Matches</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-600">
                  {communityMatches.filter(m => m.status === 'completed').length}
                </div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div>
                <div className="text-xl font-bold text-orange-600">
                  {communityMatches.filter(m => m.status !== 'completed').length}
                </div>
                <div className="text-xs text-gray-600">In Progress</div>
              </div>
            </div>
          </div>

          {/* Recent Community Matches */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900">🏏 Recent Matches</h3>
              {communityMatches.length > 3 && (
                <button className="text-cricket-blue text-sm font-medium">
                  View All
                </button>
              )}
            </div>
            
            {communityMatches.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                <div className="text-3xl mb-2">🎯</div>
                <h4 className="font-semibold text-gray-900 mb-1">No matches yet!</h4>
                <p className="text-gray-600 text-sm mb-3">Be the first to contribute</p>
                <button
                  onClick={() => navigate('/setup')}
                  className="bg-cricket-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Start First Match
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {communityMatches.slice(0, 5).map((match) => (
                  <MatchCard key={match.id} match={match} compact />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LOGGED-IN USER DASHBOARD
  const stats = getPlayerStats();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-cricket-blue to-blue-700 text-white">
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-white/80 hover:text-white text-sm font-medium"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold">My Dashboard</h1>
          <div className="w-12"></div>
        </div>
        
        <div className="px-4 pb-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🏆</div>
            <h2 className="text-xl font-bold mb-1">
              Welcome, {currentUser.displayName || currentUser.email?.split('@')[0]}
            </h2>
            <p className="text-white/90 text-sm">Your cricket scoring dashboard</p>
          </div>
          
          {/* Personal Stats */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold">{stats.totalMatches}</div>
                <div className="text-xs text-white/80">Total Matches</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.completedMatches}</div>
                <div className="text-xs text-white/80">Completed</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.wins}</div>
                <div className="text-xs text-white/80">Wins</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => navigate('/setup')}
            className="bg-cricket-green text-white p-4 rounded-lg text-center hover:bg-green-700 transition-colors"
          >
            <div className="text-2xl mb-1">🏏</div>
            <div className="text-sm font-medium">New Match</div>
          </button>
          <button
            onClick={() => {
              // TODO: Add continue in-progress match functionality
              alert('Continue match functionality coming soon!');
            }}
            className="bg-orange-600 text-white p-4 rounded-lg text-center hover:bg-orange-700 transition-colors"
          >
            <div className="text-2xl mb-1">⏱️</div>
            <div className="text-sm font-medium">Continue Match</div>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadMatches}
              className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Recent Private Matches */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900">🔒 My Recent Matches</h3>
            {privateMatches.length > 3 && (
              <button
                onClick={() => navigate('/matches')}
                className="text-cricket-blue text-sm font-medium"
              >
                View All
              </button>
            )}
          </div>
          
          {privateMatches.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
              <div className="text-3xl mb-2">🏏</div>
              <h4 className="font-semibold text-gray-900 mb-1">No matches yet</h4>
              <p className="text-gray-600 text-sm mb-3">Start your first private match</p>
              <button
                onClick={() => navigate('/setup')}
                className="bg-cricket-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Start First Match
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {privateMatches.slice(0, 3).map((match) => (
                <MatchCard key={match.id} match={match} compact />
              ))}
            </div>
          )}
        </div>

        {/* Community Preview */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900">👥 Community Activity</h3>
            <button
              onClick={() => navigate('/matches')}
              className="text-cricket-blue text-sm font-medium"
            >
              Explore All
            </button>
          </div>
          
          {communityMatches.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
              <div className="text-2xl mb-2">👥</div>
              <p className="text-gray-600 text-sm">No community matches yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {communityMatches.slice(0, 2).map((match) => (
                <MatchCard key={match.id} match={match} compact />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 