import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserMatches, deleteMatch } from '../lib/matchService';
import type { FirebaseMatch } from '../types';
import { useMatchStore } from '../store/matchStore';
import { Trophy, Search, Filter, Trash2 } from 'lucide-react';

const MatchHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState<(FirebaseMatch & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [deleteConfirmMatch, setDeleteConfirmMatch] = useState<(FirebaseMatch & { id: string }) | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadMatches();
  }, [currentUser]);


  const loadMatches = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }
    setError(null);

    try {
      if (!currentUser) {
        setMatches([]);
        setIsLoading(false);
        return;
      }      const userMatches = await getUserMatches(currentUser.uid);

      // Deduplicate matches by ID to prevent React key warnings
      const uniqueMatches = userMatches.filter((match, index, self) =>
        index === self.findIndex((m) => m.id === match.id)
      );

      setMatches(uniqueMatches);
    } catch (err: any) {
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

  const handleDeleteMatch = async () => {
    if (!deleteConfirmMatch) return;

    setIsDeleting(true);
    try {
      await deleteMatch(deleteConfirmMatch.id);
      // Close modal
      setDeleteConfirmMatch(null);

      // Reload matches
      await loadMatches(false);
    } catch (err: any) {      setError('Failed to delete match. Please try again.');
    } finally {
      setIsDeleting(false);
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

  // Extract unique months from matches for filter dropdown
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    matches.forEach(match => {
      if (match.createdAt) {
        let date;
        if ((match.createdAt as any).seconds) {
          date = new Date((match.createdAt as any).seconds * 1000);
        } else if (match.createdAt instanceof Date) {
          date = match.createdAt;
        } else {
          date = new Date(match.createdAt);
        }
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(monthKey);
      }
    });
    return Array.from(monthSet).sort().reverse(); // Most recent first
  }, [matches]);

  // Format month key for display
  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    let filtered = [...matches];

    // Sort by createdAt descending (most recent first)
    filtered.sort((a, b) => {
      const dateA = (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds : new Date(a.createdAt).getTime() / 1000;
      const dateB = (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds : new Date(b.createdAt).getTime() / 1000;
      return dateB - dateA;
    });

    // Filter by month
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(match => {
        if (!match.createdAt) return false;
        let date;
        if ((match.createdAt as any).seconds) {
          date = new Date((match.createdAt as any).seconds * 1000);
        } else if (match.createdAt instanceof Date) {
          date = match.createdAt;
        } else {
          date = new Date(match.createdAt);
        }
        const matchMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return matchMonth === selectedMonth;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(match =>
        match.teams[0].name.toLowerCase().includes(query) ||
        match.teams[1].name.toLowerCase().includes(query) ||
        match.matchCode?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [matches, selectedMonth, searchQuery]);

  const getMatchResult = (match: FirebaseMatch) => {
    if (match.status !== 'completed') return 'In Progress';
    if (match.winner === 'Match Tied') return 'Draw';

    // Fallback: Calculate result if winner is missing but innings data exists
    if (!match.winner && match.innings && match.innings.length >= 2) {
      const score1 = match.innings[0].totalRuns;
      const score2 = match.innings[1].totalRuns;

      if (score1 === score2) return 'Draw';

      if (score1 > score2) {
        return `${match.teams[0].name} won`;
      } else {
        return `${match.teams[1].name} won`;
      }
    }

    if (!match.winner) return 'Result not available';
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
              <Trophy size={16} className="text-white" />
            </div>
            <h3 className="font-bold text-gray-900">
              {match.teams[0].name} vs {match.teams[1].name}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mb-1">{formatDate(match.createdAt)}</p>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${match.status === 'completed'
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
        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={() => setDeleteConfirmMatch(match)}
            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            title="Delete match"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={() => {
              useMatchStore.getState().loadMatch(match);
              navigate('/scorecard');
            }}
            className="bg-gradient-to-r from-purple-500 to-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            View
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-3 mb-3">
        <div className="font-semibold text-gray-900 mb-1">{getMatchScore(match)}</div>
        <div className={`text-xs font-medium ${match.status === 'completed' ? 'text-green-600' : 'text-orange-600'
          }`}>
          {getMatchResult(match)}
        </div>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-safe">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-safe">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-safe">
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
        {/* Search and Filter Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 mb-6 rounded-xl shadow-sm">
          <div className="px-4 py-3">
            <div className="flex gap-2">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search matches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cricket-blue/20 focus:border-cricket-blue"
                />
              </div>
              {/* Month Filter */}
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cricket-blue/20 focus:border-cricket-blue appearance-none cursor-pointer"
                >
                  <option value="all">All Time</option>
                  {availableMonths.map(month => (
                    <option key={month} value={month}>
                      {formatMonthDisplay(month)}
                    </option>
                  ))}
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          {filteredMatches.length === 0 && matches.length > 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or filter criteria.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMonth('all');
                }}
                className="bg-gradient-to-r from-cricket-blue to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Clear Filters
              </button>
            </div>
          ) : matches.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No matches yet</h3>
              <p className="text-gray-600 mb-6">
                Your matches will appear here once you start playing.
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
              {filteredMatches.map(renderMatchCard)}
            </div>
          )}
        </div>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Match?</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="font-semibold text-gray-900 mb-1">
                {deleteConfirmMatch.teams[0].name} vs {deleteConfirmMatch.teams[1].name}
              </div>
              <div className="text-sm text-gray-600">
                {formatDate(deleteConfirmMatch.createdAt)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {getMatchScore(deleteConfirmMatch)}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirmMatch(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMatch}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchHistoryPage; 