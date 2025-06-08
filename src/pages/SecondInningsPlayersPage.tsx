import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';

const SecondInningsPlayersPage: React.FC = () => {
  const navigate = useNavigate();
  const { match, startMatchWithPlayers } = useMatchStore();
  
  const [selectedBatsmen, setSelectedBatsmen] = useState<string[]>([]);
  const [selectedBowler, setSelectedBowler] = useState<string>('');

  if (!match || match.innings.length === 0) {
    navigate('/setup');
    return null;
  }

  const firstInnings = match.innings[0];
  
  // For second innings, teams switch roles
  const battingTeam = match.teams.find(team => team.id !== firstInnings.battingTeamId);
  const bowlingTeam = match.teams.find(team => team.id === firstInnings.battingTeamId);

  const target = firstInnings.totalRuns + 1;

  const handleBatsmanToggle = (playerId: string) => {
    if (selectedBatsmen.includes(playerId)) {
      setSelectedBatsmen(selectedBatsmen.filter(id => id !== playerId));
    } else {
      if (match.isSingleSide) {
        setSelectedBatsmen([playerId]);
      } else {
        if (selectedBatsmen.length < 2) {
          setSelectedBatsmen([...selectedBatsmen, playerId]);
        }
      }
    }
  };

  const isSelectionValid = () => {
    const requiredBatsmen = match.isSingleSide ? 1 : 2;
    return selectedBatsmen.length === requiredBatsmen && selectedBowler !== '';
  };

  const handleStartSecondInnings = () => {
    if (isSelectionValid()) {
      // Start the second innings with selected players
      startMatchWithPlayers(selectedBatsmen, selectedBowler);
      navigate('/live');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex flex-col pb-safe">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/innings-break')}
          className="text-white/80 hover:text-white text-sm font-medium"
        >
          ← Back to Innings Break
        </button>
        <h1 className="text-white text-lg font-bold">Select Players</h1>
        <div className="w-16"></div>
      </div>

      {/* Target Display */}
      <div className="px-4 pb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
          <div className="text-white/80 text-sm font-medium mb-1">Second Innings</div>
          <div className="text-white text-lg font-bold">
            {battingTeam?.name} needs {target} runs to win
          </div>
          <div className="text-white/70 text-sm mt-1">
            {match.overs} overs • Required rate: {(target / match.overs).toFixed(1)} per over
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Choose Starting Players
          </h2>
          <p className="text-sm text-gray-600 text-center">
            Select the players who will start the chase
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Batting Team Selection */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                🏏 {battingTeam?.name} - BATTING
              </h3>
              <div className="text-sm text-gray-500">
                Select {match.isSingleSide ? 1 : 2} {match.isSingleSide ? 'batsman' : 'batsmen'}
              </div>
            </div>

            <div className="grid gap-3">
              {battingTeam?.players.map((player) => {
                const isSelected = selectedBatsmen.includes(player.id);
                const isJoker = match.hasJoker && player.name === match.jokerName;
                const canSelect = isSelected || selectedBatsmen.length < (match.isSingleSide ? 1 : 2);
                
                return (
                  <button
                    key={player.id}
                    onClick={() => canSelect && handleBatsmanToggle(player.id)}
                    disabled={!canSelect}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : !canSelect
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
                    } ${isJoker ? 'ring-2 ring-yellow-400' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {player.name}
                          {isJoker && <span className="ml-2">🃏</span>}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {player.role}
                        </div>
                      </div>
                      <div className="text-2xl">
                        {isSelected ? '✓' : '○'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedBatsmen.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">
                  Selected {match.isSingleSide ? 'Batsman' : 'Batsmen'}:
                </div>
                <div className="text-green-700 mt-1">
                  {selectedBatsmen.map(id => 
                    battingTeam?.players.find(p => p.id === id)?.name
                  ).join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* Bowling Team Selection */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                ⚾ {bowlingTeam?.name} - BOWLING
              </h3>
              <div className="text-sm text-gray-500">
                Select 1 bowler
              </div>
            </div>

            <div className="grid gap-3">
              {bowlingTeam?.players.map((player) => {
                const isSelected = selectedBowler === player.id;
                const isJoker = match.hasJoker && player.name === match.jokerName;
                
                return (
                  <button
                    key={player.id}
                    onClick={() => setSelectedBowler(player.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    } ${isJoker ? 'ring-2 ring-yellow-400' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {player.name}
                          {isJoker && <span className="ml-2">🃏</span>}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {player.role}
                        </div>
                      </div>
                      <div className="text-2xl">
                        {isSelected ? '✓' : '○'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedBowler && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">
                  Selected Bowler:
                </div>
                <div className="text-blue-700 mt-1">
                  {bowlingTeam?.players.find(p => p.id === selectedBowler)?.name}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Start Button */}
        <div className="p-6 bg-gray-50 border-t">
          <button
            onClick={handleStartSecondInnings}
            disabled={!isSelectionValid()}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
              isSelectionValid()
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🏏 Start Chase ({target} runs needed)
          </button>
          
          {!isSelectionValid() && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Please select {match.isSingleSide ? 1 : 2} {match.isSingleSide ? 'batsman' : 'batsmen'} and 1 bowler
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecondInningsPlayersPage; 