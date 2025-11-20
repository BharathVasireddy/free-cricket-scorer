import React, { useState } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useNavigate } from 'react-router-dom';
import type { Innings } from '../types';

const ScorecardPage: React.FC = () => {
  const navigate = useNavigate();
  const { match } = useMatchStore();
  const [activeTab, setActiveTab] = useState<'first' | 'second'>('first');

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No match data available</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];
  const hasSecondInnings = secondInnings && secondInnings.overs.length > 0;

  // Function to get batting stats for an innings
  const getBattingStats = (innings: Innings) => {
    const battingTeam = match.teams.find(t => t.id === innings.battingTeamId);
    let allBatsmen = [...(battingTeam?.players || [])];

    // Check if joker has batted and add them if they're not in the team
    const jokerBatted = match.hasJoker && match.jokerName &&
      innings.overs.some(over =>
        over.balls.some(ball => ball.batsmanId?.includes('joker'))
      );

    if (jokerBatted && !allBatsmen.some(p => p.name === match.jokerName)) {
      allBatsmen.push({
        id: 'joker',
        name: match.jokerName!,
        role: 'allrounder' as const
      });
    }

    return allBatsmen.map(player => {
      let runs = 0, balls = 0, fours = 0, sixes = 0, isOut = false, dismissalType = '';

      innings.overs.forEach(over => {
        over.balls.forEach(ball => {
          const isJokerBall = player.id === 'joker' && ball.batsmanId?.includes('joker');
          const isPlayerBall = ball.batsmanId === player.id;

          if (isPlayerBall || isJokerBall) {
            runs += ball.runs;
            balls += (ball.extras?.type === 'wide' || ball.extras?.type === 'noball') ? 0 : 1;
            if (ball.runs === 4) fours++;
            if (ball.runs === 6) sixes++;
            if (ball.wicket && (ball.batsmanId === player.id || isJokerBall)) {
              isOut = true;
              dismissalType = ball.wicketType || 'out';
            }
          }
        });
      });

      return {
        player,
        runs,
        balls,
        fours,
        sixes,
        strikeRate: balls > 0 ? (runs / balls) * 100 : 0,
        isOut,
        dismissalType,
      };
    }).filter(stat => stat.runs > 0 || stat.balls > 0) || [];
  };

  // Function to get bowling stats for an innings
  const getBowlingStats = (innings: Innings) => {
    const bowlingTeam = match.teams.find(t => t.id === innings.bowlingTeamId);
    const allBowlers = [...(bowlingTeam?.players || [])];

    // Add joker if they have bowled
    const jokerBowled = match.hasJoker && match.jokerName &&
      innings.overs.some(over =>
        over.balls.some(ball =>
          ball.bowlerId.includes('joker') ||
          (bowlingTeam?.players.find(p => p.id === ball.bowlerId)?.name === match.jokerName)
        )
      );

    if (jokerBowled && !allBowlers.some(p => p.name === match.jokerName)) {
      allBowlers.push({
        id: 'joker',
        name: match.jokerName!,
        role: 'allrounder' as const
      });
    }

    return allBowlers.map(player => {
      let balls = 0, runs = 0, wickets = 0;

      // Iterate through each ball to correctly attribute to the bowler who bowled it
      innings.overs.forEach(over => {
        over.balls.forEach(ball => {
          const isJokerBall = player.id === 'joker' &&
            (ball.bowlerId.includes('joker') ||
              (bowlingTeam?.players.find(p => p.id === ball.bowlerId)?.name === match.jokerName));

          if (ball.bowlerId === player.id || isJokerBall) {
            // Count legal balls (not wides or no-balls)
            const isLegalBall = !ball.extras || (ball.extras.type !== 'wide' && ball.extras.type !== 'noball');
            if (isLegalBall) {
              balls++;
            }

            // Add runs (including extras)
            runs += ball.runs + (ball.extras?.runs || 0);

            // Count wickets
            if (ball.wicket) {
              wickets++;
            }
          }
        });
      });

      return {
        player,
        overs: `${Math.floor(balls / 6)}.${balls % 6}`,
        runs,
        wickets,
        economy: balls > 0 ? (runs / balls) * 6 : 0,
        maidens: 0, // Maidens calculation removed as it requires over-level tracking
        isJoker: player.id === 'joker',
      };
    }).filter(stat => stat.runs > 0 || stat.wickets > 0) || [];
  };

  const InningsScorecard = ({ innings }: { innings: Innings }) => {
    const battingTeam = match.teams.find(t => t.id === innings.battingTeamId);
    const bowlingTeam = match.teams.find(t => t.id === innings.bowlingTeamId);
    const battingStats = getBattingStats(innings);
    const bowlingStats = getBowlingStats(innings);

    const getRunRate = () => {
      const balls = innings.totalBalls;
      if (balls === 0) return '0.00';
      return ((innings.totalRuns / balls) * 6).toFixed(2);
    };

    return (
      <div className="space-y-6">
        {/* Innings Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {battingTeam?.name}: {innings.totalRuns}/{innings.totalWickets}
            </div>
            <div className="text-sm text-gray-600 mb-2">
              ({Math.floor(innings.totalBalls / 6)}.{innings.totalBalls % 6} overs) • Run Rate: {getRunRate()}
            </div>
            {innings.target && (
              <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full inline-block">
                Target: {innings.target} runs
              </div>
            )}
          </div>
        </div>

        {/* Batting Performance */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-cricket-blue text-white">
            <h2 className="text-lg font-semibold">{battingTeam?.name} - Batting</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">Batsman</th>
                  <th className="text-center p-3 font-medium text-gray-700">R</th>
                  <th className="text-center p-3 font-medium text-gray-700">B</th>
                  <th className="text-center p-3 font-medium text-gray-700">4s</th>
                  <th className="text-center p-3 font-medium text-gray-700">6s</th>
                  <th className="text-center p-3 font-medium text-gray-700">SR</th>
                </tr>
              </thead>
              <tbody>
                {battingStats.map((stat) => {
                  const isJoker = match.hasJoker && stat.player.name === match.jokerName;

                  return (
                    <tr key={stat.player.id} className="border-b">
                      <td className="p-3">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">
                            {stat.player.name}
                            {isJoker && <span className="ml-1">🃏</span>}
                          </span>
                        </div>
                        {stat.isOut && (
                          <div className="text-xs text-red-600 mt-1 capitalize">
                            {stat.dismissalType}
                          </div>
                        )}
                        {!stat.isOut && stat.balls > 0 && (
                          <div className="text-xs text-green-600 mt-1">
                            not out
                          </div>
                        )}
                      </td>
                      <td className="text-center p-3 font-semibold text-gray-900">{stat.runs}</td>
                      <td className="text-center p-3 text-gray-600">{stat.balls}</td>
                      <td className="text-center p-3 text-gray-600">{stat.fours}</td>
                      <td className="text-center p-3 text-gray-600">{stat.sixes}</td>
                      <td className="text-center p-3 text-gray-600">{stat.strikeRate.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bowling Performance */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-green-600 text-white">
            <h2 className="text-lg font-semibold">{bowlingTeam?.name} - Bowling</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">Bowler</th>
                  <th className="text-center p-3 font-medium text-gray-700">O</th>
                  <th className="text-center p-3 font-medium text-gray-700">R</th>
                  <th className="text-center p-3 font-medium text-gray-700">W</th>
                  <th className="text-center p-3 font-medium text-gray-700">Eco</th>
                </tr>
              </thead>
              <tbody>
                {bowlingStats.map((stat) => (
                  <tr key={stat.player.id} className="border-b">
                    <td className="p-3 font-medium text-gray-900">
                      {stat.player.name}
                      {stat.isJoker && <span className="ml-1">🃏</span>}
                    </td>
                    <td className="text-center p-3 text-gray-600">{stat.overs}</td>
                    <td className="text-center p-3 text-gray-600">{stat.runs}</td>
                    <td className="text-center p-3 font-semibold text-gray-900">{stat.wickets}</td>
                    <td className="text-center p-3 text-gray-600">{stat.economy.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Over-by-Over Breakdown */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 bg-gray-700 text-white">
            <h2 className="text-lg font-semibold">Over-by-Over</h2>
          </div>

          <div className="p-4">
            <div className="space-y-3">
              {innings.overs.map((over) => {
                // Get unique bowlers in this over (for mid-over changes)
                const bowlersInOver = new Set(over.balls.map(b => b.bowlerId));
                const bowlerNames = Array.from(bowlersInOver).map(bowlerId => {
                  let bowlerName = bowlingTeam?.players.find(p => p.id === bowlerId)?.name;
                  let isJoker = false;

                  if (!bowlerName && bowlerId.includes('joker') && match.hasJoker && match.jokerName) {
                    bowlerName = match.jokerName;
                    isJoker = true;
                  } else if (bowlerName === match.jokerName && match.hasJoker) {
                    isJoker = true;
                  }

                  return { name: bowlerName || 'Unknown', isJoker };
                });

                // Display bowler names (show multiple if mid-over change)
                const bowlerDisplay = bowlerNames.length > 1
                  ? bowlerNames.map(b => b.name).join(' → ')
                  : bowlerNames[0]?.name || 'Unknown';
                const hasJoker = bowlerNames.some(b => b.isJoker);

                return (
                  <div key={over.number} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-gray-700 w-8">
                        {over.number}
                      </span>
                      <span className="text-sm text-gray-600">
                        {bowlerDisplay}
                        {hasJoker && <span className="ml-1">🃏</span>}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="font-mono text-sm bg-gray-50 px-2 py-1 rounded min-w-[80px] text-center">
                        {over.balls.map(ball => {
                          if (ball.wicket) return 'W';
                          if (ball.extras) {
                            switch (ball.extras.type) {
                              case 'wide': return 'Wd';
                              case 'noball': return 'Nb';
                              case 'bye': return `B${ball.extras.runs}`;
                              case 'legbye': return `Lb${ball.extras.runs}`;
                            }
                          }
                          return ball.runs.toString();
                        }).join(' ')}
                      </div>
                      <span className="font-semibold text-gray-900 w-8 text-right">
                        {over.runs}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="text-cricket-blue font-semibold text-sm flex items-center"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">Full Scorecard</h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 text-sm font-medium"
          >
            Home
          </button>
        </div>

        {/* Match Summary */}
        <div className="text-center mb-4">
          <div className="text-xl font-bold text-gray-900 mb-2">
            {match.teams[0].name} vs {match.teams[1].name}
          </div>
          <div className="text-sm text-gray-600">
            {match.overs} overs • {match.isSingleSide ? 'Single Side' : 'Standard'} Match
          </div>
          {match.status === 'completed' && match.winner && (
            <div className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full inline-block mt-2">
              🏆 {match.winner} {match.winMargin && `won by ${match.winMargin}`}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('first')}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 ${activeTab === 'first'
              ? 'border-cricket-blue text-cricket-blue'
              : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            1st Innings ({firstInnings.totalRuns}/{firstInnings.totalWickets})
          </button>
          {hasSecondInnings && (
            <button
              onClick={() => setActiveTab('second')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 ${activeTab === 'second'
                ? 'border-cricket-blue text-cricket-blue'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              2nd Innings ({secondInnings.totalRuns}/{secondInnings.totalWickets})
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'first' && <InningsScorecard innings={firstInnings} />}
        {activeTab === 'second' && hasSecondInnings && <InningsScorecard innings={secondInnings} />}
      </div>

      {/* Action Buttons */}
      {match.status !== 'completed' && (
        <div className="p-4 pb-6">
          <button
            onClick={() => navigate('/live')}
            className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center space-x-2"
          >
            <span>🏏</span>
            <span>Resume Match</span>
          </button>
          <p className="text-center text-sm text-gray-500 mt-2">
            Note: Matches are automatically abandoned after 1 hour of inactivity
          </p>
        </div>
      )}
    </div>
  );
};

export default ScorecardPage; 