import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserMatches, getCommunityMatches } from '../lib/matchService';
import type { Match } from '../types';

const MatchHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState<'private' | 'community'>('private');
  const [privateMatches, setPrivateMatches] = useState<(Match & { id: string })[]>([]);
  const [communityMatches, setCommunityMatches] = useState<(Match & { id: string })[]>([]);
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
      const [privateData, communityData] = await Promise.all([
        currentUser && !isGuest ? getUserMatches(currentUser.uid) : Promise.resolve([]),
        getCommunityMatches()
      ]);
      
      setPrivateMatches(privateData);
      setCommunityMatches(communityData);
    } catch (error: any) {
      console.error('Error loading matches:', error);
      setError('Failed to load matches');
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

  const MatchCard = ({ match }: { match: Match & { id: string } }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg">
            {match.teams[0]?.name} vs {match.teams[1]?.name}
          </h3>
          <p className="text-sm text-gray-600">
            {match.overs} overs • {match.playersPerTeam} players • {match.isSingleSide ? 'Single Side' : 'Standard'}
            {match.hasJoker && ' • Joker'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">{formatDate(match.createdAt)}</div>
          {(match as any).matchCode && (
            <div className="text-xs text-blue-600 font-mono mt-1">{(match as any).matchCode}</div>
          )}
        </div>
      </div>
      
      <div className="mb-3">
        <div className="text-lg font-semibold text-gray-900">{getMatchScore(match)}</div>
        <div className={`text-sm font-medium ${
          match.status === 'completed' ? 'text-green-600' : 'text-orange-600'
        }`}>
          {getMatchResult(match)}
        </div>
      </div>
      
      {match.status === 'completed' && (
        <button
          onClick={() => {
            // Set match in store and navigate to scorecard
            // For now, just show alert with match code
            alert(`Match Code: ${(match as any).matchCode || 'N/A'}\nView full scorecard functionality coming soon!`);
          }}
          className="w-full bg-cricket-blue text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          View Scorecard
        </button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🏏</div>
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">Match History</h1>
          <div className="w-12"></div>
        </div>
        
        {/* Tabs */}
        <div className="px-4">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {!isGuest && (
              <button
                onClick={() => setActiveTab('private')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'private'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🔒 My Matches ({privateMatches.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'community'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👥 Community ({communityMatches.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
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

        {activeTab === 'private' && !isGuest && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">🔒 Your Private Matches</h2>
              <p className="text-sm text-gray-600">
                Matches saved to your private account • Only you can see these
              </p>
            </div>
            
            {privateMatches.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🏏</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No private matches yet</h3>
                <p className="text-gray-600 mb-4">Start a new match while logged in to save it privately</p>
                <button
                  onClick={() => navigate('/setup')}
                  className="bg-cricket-blue text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start New Match
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {privateMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'community' && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">👥 Community Matches</h2>
              <p className="text-sm text-gray-600">
                Public matches from guest users • Anyone can view these
              </p>
            </div>
            
            {communityMatches.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No community matches yet</h3>
                <p className="text-gray-600 mb-4">Guest users' matches will appear here</p>
                <button
                  onClick={() => navigate('/auth')}
                  className="bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Play as Guest to Contribute
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {communityMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchHistoryPage; 