import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserMatches, getCommunityMatches } from '../lib/matchService';
import type { FirebaseMatch } from '../types';

const MatchHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState<'private' | 'community'>('private');
  const [privateMatches, setPrivateMatches] = useState<(FirebaseMatch & { id: string })[]>([]);
  const [communityMatches, setCommunityMatches] = useState<(FirebaseMatch & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadMatches();
  }, [currentUser]);

  useEffect(() => {
    // For guest users, default to community tab
    if (isGuest) {
      setActiveTab('community');
    }
  }, [isGuest]);

  const loadMatches = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('⚡ Loading matches with optimized service...');
      
      // Use Promise.allSettled to handle partial failures gracefully
      const [privateResult, communityResult] = await Promise.allSettled([
        currentUser && !isGuest ? getUserMatches(currentUser.uid) : Promise.resolve([]),
        getCommunityMatches()
      ]);
      
      // Handle private matches result
      const privateData = privateResult.status === 'fulfilled' ? privateResult.value : [];
      if (privateResult.status === 'rejected') {
        console.warn('Failed to load private matches:', privateResult.reason);
      }
      
      // Handle community matches result
      const communityData = communityResult.status === 'fulfilled' ? communityResult.value : [];
      if (communityResult.status === 'rejected') {
        console.warn('Failed to load community matches:', communityResult.reason);
      }
      
      setPrivateMatches(privateData);
      setCommunityMatches(communityData);
      
      console.log('📊 Loaded:', privateData.length, 'private matches,', communityData.length, 'community matches');
      
      // Only show error if both failed
      if (privateResult.status === 'rejected' && communityResult.status === 'rejected') {
        setError('Unable to load matches. Please check your connection and try again.');
      }
      
    } catch (error: any) {
      console.error('❌ Error loading matches:', error);
      setError(`Failed to load matches: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date';
    
    let date;
    if (timestamp.seconds) {
      // Firestore Timestamp
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

  const renderMatchCard = (match: FirebaseMatch & { id: string }) => (
    <div key={match.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">
            {match.teams[0].name} vs {match.teams[1].name}
          </h3>
          <p className="text-sm text-gray-600">{formatDate(match.createdAt)}</p>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            match.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {match.status === 'completed' ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>
      
      <div className="mb-2">
        <p className="text-lg font-medium text-gray-900">{getMatchScore(match)}</p>
        <p className="text-sm text-gray-600">{getMatchResult(match)}</p>
      </div>
      
              <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{match.format || `${match.overs} overs`} • {match.playersPerTeam} players</span>
          {match.matchCode && (
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
              Code: {match.matchCode}
            </span>
          )}
        </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin text-4xl mb-4">⚡</div>
          <p className="text-gray-600 mb-2">Loading matches...</p>
          <div className="text-sm text-blue-600">Using optimized loading</div>
        </div>
      </div>
    );
  }

  const currentMatches = activeTab === 'private' ? privateMatches : communityMatches;
  const hasMatches = currentMatches.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Match History</h1>
          <p className="text-gray-600">View and manage your cricket matches</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
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

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('private')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'private'
                    ? 'border-cricket-blue text-cricket-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Matches ({privateMatches.length})
              </button>
              <button
                onClick={() => setActiveTab('community')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'community'
                    ? 'border-cricket-blue text-cricket-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Community Matches ({communityMatches.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Matches Grid */}
        {hasMatches ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentMatches.map(renderMatchCard)}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏏</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {activeTab === 'private' ? 'No matches yet' : 'No community matches'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'private' 
                ? 'Start scoring your first cricket match!'
                : 'No community matches available at the moment.'
              }
            </p>
            {activeTab === 'private' && (
              <button
                onClick={() => navigate('/setup')}
                className="bg-cricket-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start New Match
              </button>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => navigate('/setup')}
            className="bg-cricket-blue text-white w-14 h-14 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            title="Start New Match"
          >
            <span className="text-2xl">+</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchHistoryPage; 