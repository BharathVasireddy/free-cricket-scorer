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
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadMatches();
  }, [currentUser]);

  useEffect(() => {
    // For guest users, default to community tab
    if (isGuest) {
      setActiveTab('community');
    }
  }, [isGuest]);

  const loadMatches = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }
    setError(null);
    
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
      
    } catch (err: any) {
      console.error('❌ Failed to load matches:', err);
      
      const errorMessage = err.code === 'permission-denied' 
        ? 'Access denied. Please check your permissions.'
        : err.code === 'unavailable'
        ? 'Service temporarily unavailable. Please try again.'
        : err.message || 'Failed to load matches. Please try again.';
        
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    loadMatches();
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
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Match History</h1>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading matches...</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500">Attempt {retryCount + 1}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Match History</h1>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
          <div className="text-4xl text-red-500">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Unable to Load Matches</h3>
          <p className="text-gray-600 dark:text-gray-300 text-center max-w-md">{error}</p>
          <button
            onClick={handleRetry}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            <span>Try Again</span>
          </button>
          {retryCount > 2 && (
            <p className="text-sm text-gray-500 text-center">
              If the problem persists, please check your internet connection or try again later.
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentMatches = activeTab === 'private' ? privateMatches : communityMatches;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Match History</h1>
              <p className="text-gray-600">View and manage your cricket matches</p>
            </div>
            <button
              onClick={() => loadMatches(false)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-6">
            <button
              onClick={() => setActiveTab('private')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'private'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              disabled={isGuest}
            >
              🔒 My Matches ({privateMatches.length})
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'community'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              👥 Community ({communityMatches.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {currentMatches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">
              {activeTab === 'private' ? '🏏' : '👥'}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'private' ? 'No personal matches yet' : 'No community matches available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'private' 
                ? 'Start scoring your first cricket match to see it here'
                : 'Check back later for community matches'
              }
            </p>
            {activeTab === 'private' && (
              <button
                onClick={() => navigate('/setup')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Match
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentMatches.map(renderMatchCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchHistoryPage; 