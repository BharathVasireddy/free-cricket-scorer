import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';

const InningsBreakPage: React.FC = () => {
  const navigate = useNavigate();
  const { match } = useMatchStore();

  if (!match || match.innings.length === 0) {
    navigate('/setup');
    return null;
  }

  const firstInnings = match.innings[0];
  const battingTeam = match.teams.find(t => t.id === firstInnings.battingTeamId);
  const bowlingTeam = match.teams.find(t => t.id === firstInnings.bowlingTeamId);

  // Calculate batting stats from first innings
  const getBattingStats = () => {
    const teamPlayers = battingTeam?.players || [];
    
    // Track all batsmen who played
    const batsmenStats = new Map();
    
    firstInnings.overs.forEach(over => {
      over.balls.forEach(ball => {
        if (ball.batsmanId) {
          const current = batsmenStats.get(ball.batsmanId) || {
            playerId: ball.batsmanId,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            isOut: false,
            dismissalType: ''
          };
          
          current.runs += ball.runs;
          if (!ball.extras || (ball.extras.type !== 'wide' && ball.extras.type !== 'noball')) {
            current.balls += 1;
          }
          if (ball.runs === 4) current.fours += 1;
          if (ball.runs === 6) current.sixes += 1;
          if (ball.wicket && ball.batsmanId === current.playerId) {
            current.isOut = true;
            current.dismissalType = ball.wicketType || 'out';
          }
          
          batsmenStats.set(ball.batsmanId, current);
        }
      });
    });

    return Array.from(batsmenStats.values()).map(stat => {
      const player = teamPlayers.find(p => p.id === stat.playerId);
      
      // Check if this is a joker player
      let playerName = player?.name || 'Unknown';
      if (match.hasJoker && stat.playerId.includes('joker') && match.jokerName) {
        playerName = match.jokerName;
      }
      
      return {
        ...stat,
        name: playerName,
        strikeRate: stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0'
      };
    }).sort((a, b) => b.runs - a.runs);
  };

  // Calculate bowling stats from first innings
  const getBowlingStats = () => {
    const teamPlayers = bowlingTeam?.players || [];
    
    const bowlerStats = new Map();
    
    firstInnings.overs.forEach(over => {
      const current = bowlerStats.get(over.bowlerId) || {
        playerId: over.bowlerId,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0
      };
      
      let overRuns = 0;
      let overBalls = 0;
      let overWickets = 0;
      
      over.balls.forEach(ball => {
        overRuns += ball.runs + (ball.extras?.runs || 0);
        if (!ball.extras || (ball.extras.type !== 'wide' && ball.extras.type !== 'noball')) {
          overBalls += 1;
        }
        if (ball.wicket) overWickets += 1;
      });
      
      current.runs += overRuns;
      current.balls += overBalls;
      current.wickets += overWickets;
      if (overBalls === 6) {
        current.overs += 1;
        if (overRuns === 0) current.maidens += 1;
      }
      
      bowlerStats.set(over.bowlerId, current);
    });

    return Array.from(bowlerStats.values()).map(stat => {
      const player = teamPlayers.find(p => p.id === stat.playerId);
      const economy = stat.balls > 0 ? ((stat.runs / stat.balls) * 6).toFixed(2) : '0.00';
      const oversDisplay = `${stat.overs}.${stat.balls % 6}`;
      
      // Check if this is a joker player
      let playerName = player?.name || 'Unknown';
      if (match.hasJoker && stat.playerId.includes('joker') && match.jokerName) {
        playerName = match.jokerName;
      }
      
      return {
        ...stat,
        name: playerName,
        economy,
        oversDisplay
      };
    }).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
  };

  const battingStats = getBattingStats();
  const bowlingStats = getBowlingStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">First Innings Complete</h1>
            <p className="text-sm text-gray-600">Review performance before second innings</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">{match.overs} Overs Match</div>
          </div>
        </div>
      </div>

      {/* First Innings Summary */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-cricket-blue to-blue-700 rounded-lg p-6 text-white mb-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">{battingTeam?.name}</h2>
            <div className="text-4xl font-bold mb-2">
              {firstInnings.totalRuns}/{firstInnings.totalWickets}
            </div>
            <div className="text-blue-100">
              ({Math.floor(firstInnings.totalBalls / 6)}.{firstInnings.totalBalls % 6}/{match.overs} overs)
            </div>
            <div className="mt-4 text-lg font-medium">
              Target for {bowlingTeam?.name}: {firstInnings.totalRuns + 1} runs
            </div>
          </div>
        </div>

        {/* Batting Performance */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Batting Performance</h3>
          <div className="space-y-3">
            {battingStats.map((batsman, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {batsman.name}
                    {match.hasJoker && batsman.name === match.jokerName && (
                      <span className="ml-1">🃏</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {batsman.isOut ? batsman.dismissalType : 'not out'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    {batsman.runs} ({batsman.balls})
                  </div>
                  <div className="text-sm text-gray-600">
                    SR: {batsman.strikeRate} • 4s: {batsman.fours} • 6s: {batsman.sixes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bowling Performance */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Bowling Performance</h3>
          <div className="space-y-3">
            {bowlingStats.map((bowler, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {bowler.name}
                    {match.hasJoker && bowler.name === match.jokerName && (
                      <span className="ml-1">🃏</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    {bowler.wickets}-{bowler.runs}
                  </div>
                  <div className="text-sm text-gray-600">
                    {bowler.oversDisplay} ov • Eco: {bowler.economy}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Second Innings Button */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/players-second')}
            className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-green-700 transition-colors"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">🏏</span>
              <span>Start Second Innings</span>
            </div>
          </button>
          
          <div className="text-center text-sm text-gray-600">
            {bowlingTeam?.name} needs {firstInnings.totalRuns + 1} runs to win
          </div>
        </div>
      </div>
    </div>
  );
};

export default InningsBreakPage; 