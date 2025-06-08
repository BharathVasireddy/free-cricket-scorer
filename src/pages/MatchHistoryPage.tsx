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
    <div key={match.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cricket-blue to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-bold text-gray-900">
              {match.teams[0].name} vs {match.teams[1].name}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mb-1">{formatDate(match.createdAt)}</p>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
              match.status === 'completed' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-orange-100 text-orange-700'
            }`}>
              {match.status === 'completed' ? 'Completed' : 'Live'}
            </span>
            {match.matchCode && (
              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-lg">
                {match.matchCode}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/scorecard')}
          className="ml-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          View
        </button>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-3 mb-3">
        <p className="text-lg font-bold text-gray-900 mb-1">{getMatchScore(match)}</p>
        <p className="text-sm text-gray-600">{getMatchResult(match)}</p>
      </div>
      
      <div className="flex items-center text-xs text-gray-500 space-x-4">
        <div className="flex items-center space-x-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{match.format || `${match.overs} overs`}</span>
        </div>
        <div className="flex items-center space-x-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <span>{match.playersPerTeam} players</span>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-gray-900">Match History</h1>
              <div className="w-10 h-10"></div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-64 space-y-4 p-6">
          <div className="w-12 h-12 border-4 border-cricket-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading matches...</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500">Attempt {retryCount + 1}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-gray-900">Match History</h1>
              <div className="w-10 h-10"></div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-64 space-y-4 p-6">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Unable to Load Matches</h3>
          <p className="text-gray-600 text-center max-w-md text-sm">{error}</p>
          <button
            onClick={handleRetry}
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cricket-blue to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">Match History</h1>
            <button
              onClick={() => navigate('/setup')}
              className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-md transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 pb-24">
        {/* Tab Selector */}
        {!isGuest && (
          <div className="bg-white rounded-2xl p-2 mb-6 shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab('private')}
                className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                  activeTab === 'private'
                    ? 'bg-gradient-to-r from-cricket-blue to-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>My Matches</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('community')}
                className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                  activeTab === 'community'
                    ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Community</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'private' && !isGuest ? (
          <div>
            {privateMatches.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No matches yet</h3>
                <p className="text-gray-600 mb-6">
                  Your private matches will appear here once you start playing.
                </p>
                <button
                  onClick={() => navigate('/setup')}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Start Your First Match
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {privateMatches.map(renderMatchCard)}
              </div>
            )}
          </div>
        ) : (
          <div>
            {communityMatches.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No community matches</h3>
                <p className="text-gray-600 mb-6">
                  Community matches from other players will appear here.
                </p>
                <button
                  onClick={handleRetry}
                  className="bg-gradient-to-r from-cricket-blue to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {communityMatches.map(renderMatchCard)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 bottom-nav">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-cricket-blue transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </button>
          
          <button 
            onClick={() => navigate('/setup')}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-green-500 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium">New</span>
          </button>
          
          <button className="flex flex-col items-center space-y-1 text-purple-500">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium">Matches</span>
          </button>
          
          <button 
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-indigo-500 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchHistoryPage; 