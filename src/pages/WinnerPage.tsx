import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';

const WinnerPage: React.FC = () => {
  const navigate = useNavigate();
  const { match } = useMatchStore();

  if (!match || match.status !== 'completed') {
    navigate('/setup');
    return null;
  }

  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];
  
  const isMatchTied = match.winner === 'Match Tied';
  
  const handleShareScorecard = async () => {
    const matchSummary = `🏏 ${match.teams[0].name} vs ${match.teams[1].name}
${firstInnings.totalRuns}/${firstInnings.totalWickets} (${Math.floor(firstInnings.totalBalls / 6)}.${firstInnings.totalBalls % 6}) vs ${secondInnings.totalRuns}/${secondInnings.totalWickets} (${Math.floor(secondInnings.totalBalls / 6)}.${secondInnings.totalBalls % 6})
🏆 ${match.winner}${match.winMargin ? ` by ${match.winMargin}` : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cricket Match Result',
          text: matchSummary,
        });
      } catch (error) {
        // Fall back to clipboard if sharing fails
        await navigator.clipboard.writeText(matchSummary);
        alert('Match result copied to clipboard!');
      }
    } else {
      // Fall back to clipboard for browsers without Web Share API
      await navigator.clipboard.writeText(matchSummary);
      alert('Match result copied to clipboard!');
    }
  };



  const getWinnerColor = () => {
    if (isMatchTied) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-green-600';
  };

  const getWinnerIcon = () => {
    if (isMatchTied) return '🤝';
    return '🏆';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Winner Announcement */}
      <div className={`bg-gradient-to-r ${getWinnerColor()} px-4 py-12 text-white text-center`}>
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">{getWinnerIcon()}</div>
          <h1 className="text-3xl font-bold mb-4">
            {isMatchTied ? 'Match Tied!' : 'Match Won!'}
          </h1>
          <div className="text-2xl font-bold mb-2">
            🏆 {match.winner}
          </div>
          {match.winMargin && (
            <div className="text-xl text-white/90 font-semibold">
              won by {match.winMargin}
            </div>
          )}
          {isMatchTied && (
            <div className="text-lg text-white/90 mt-2">
              What an incredible finish!
            </div>
          )}
        </div>
      </div>

      {/* Match Summary */}
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Match Summary</h2>
          
          {/* First Innings */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-gray-900">
                  {match.teams.find(t => t.id === firstInnings.battingTeamId)?.name}
                </div>
                <div className="text-sm text-gray-600">First Innings</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">
                  {firstInnings.totalRuns}/{firstInnings.totalWickets}
                </div>
                <div className="text-sm text-gray-600">
                  ({Math.floor(firstInnings.totalBalls / 6)}.{firstInnings.totalBalls % 6}/{match.overs} overs)
                </div>
              </div>
            </div>
          </div>

          {/* Second Innings */}
          <div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-gray-900">
                  {match.teams.find(t => t.id === secondInnings.battingTeamId)?.name}
                </div>
                <div className="text-sm text-gray-600">Second Innings</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">
                  {secondInnings.totalRuns}/{secondInnings.totalWickets}
                </div>
                <div className="text-sm text-gray-600">
                  ({Math.floor(secondInnings.totalBalls / 6)}.{secondInnings.totalBalls % 6}/{match.overs} overs)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Match Info */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Match Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Format:</span>
              <span className="font-medium">{match.overs} overs • {match.isSingleSide ? 'Single Side' : 'Standard'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Players per team:</span>
              <span className="font-medium">{match.playersPerTeam}</span>
            </div>
            {match.hasJoker && (
              <div className="flex justify-between">
                <span className="text-gray-600">Joker:</span>
                <span className="font-medium">{match.jokerName} 🃏</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Toss:</span>
              <span className="font-medium">{match.tossWinner} (chose to {match.tossChoice})</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/scorecard')}
            className="w-full bg-cricket-blue text-white font-bold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">📊</span>
              <span>View Full Scorecard</span>
            </div>
          </button>

          <button
            onClick={handleShareScorecard}
            className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-green-700 transition-colors"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">📤</span>
              <span>Share Match Result</span>
            </div>
          </button>



          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">🏠</span>
              <span>Back to Home</span>
            </div>
          </button>
        </div>

        {/* Fun Facts */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">📈 Match Highlights</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Total runs scored:</span>
              <span className="font-medium ml-2">{firstInnings.totalRuns + secondInnings.totalRuns}</span>
            </div>
            <div>
              <span className="text-gray-600">Total wickets taken:</span>
              <span className="font-medium ml-2">{firstInnings.totalWickets + secondInnings.totalWickets}</span>
            </div>
            <div>
              <span className="text-gray-600">Total balls bowled:</span>
              <span className="font-medium ml-2">{firstInnings.totalBalls + secondInnings.totalBalls}</span>
            </div>
            <div>
              <span className="text-gray-600">Run rate:</span>
              <span className="font-medium ml-2">
                {((firstInnings.totalRuns + secondInnings.totalRuns) / 
                  ((firstInnings.totalBalls + secondInnings.totalBalls) / 6)).toFixed(2)} per over
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WinnerPage; 