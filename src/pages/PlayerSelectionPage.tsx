import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';

const PlayerSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { match, startMatchWithPlayers } = useMatchStore();
  
  const [selectedBatsmen, setSelectedBatsmen] = useState<string[]>([]);
  const [selectedBowler, setSelectedBowler] = useState<string>('');

  if (!match) {
    navigate('/setup');
    return null;
  }

  // Determine which team bats first and which bowls first based on toss
  const battingTeam = match.teams.find(team => 
    (match.tossChoice === 'bat' && team.id === match.tossWinnerId) ||
    (match.tossChoice === 'bowl' && team.id !== match.tossWinnerId)
  );
  
  const bowlingTeam = match.teams.find(team => 
    (match.tossChoice === 'bowl' && team.id === match.tossWinnerId) ||
    (match.tossChoice === 'bat' && team.id !== match.tossWinnerId)
  );

  if (!battingTeam || !bowlingTeam) {
    navigate('/toss');
    return null;
  }

  const requiredBatsmen = match.isSingleSide ? 1 : 2;


  const handleBatsmanToggle = (playerId: string) => {
    setSelectedBatsmen(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else if (prev.length < requiredBatsmen) {
        return [...prev, playerId];
      }
      return prev;
    });
  };

  const handleBowlerSelect = (playerId: string) => {
    setSelectedBowler(playerId);
  };

  const isSelectionValid = () => {
    return selectedBatsmen.length === requiredBatsmen && selectedBowler !== '';
  };

  const handleStartMatch = () => {
    if (isSelectionValid()) {
      // Start the match with the selected players
      startMatchWithPlayers(selectedBatsmen, selectedBowler);
      navigate('/live');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-white/80 hover:text-white text-sm font-medium touch-target"
        >
          ← Back
        </button>
        <h1 className="text-white text-lg font-bold">Select Players</h1>
        <div className="w-16"></div>
      </div>

      {/* Toss Result Summary */}
      <div className="px-4 pb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
          <div className="text-white/80 text-sm font-medium mb-1">Toss Result</div>
          <div className="text-white text-lg font-bold">
            {match.tossWinner} won the toss and chose to {match.tossChoice === 'bat' ? 'BAT FIRST' : 'BOWL FIRST'}
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
            Select the players who will start the match
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Batting Team Selection */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                🏏 {battingTeam.name} - BATTING
              </h3>
              <div className="text-sm text-gray-500">
                Select {requiredBatsmen} {match.isSingleSide ? 'batsman' : 'batsmen'}
              </div>
            </div>

            <div className="grid gap-3">
              {battingTeam.players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleBatsmanToggle(player.id)}
                  disabled={!selectedBatsmen.includes(player.id) && selectedBatsmen.length >= requiredBatsmen}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedBatsmen.includes(player.id)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : selectedBatsmen.length >= requiredBatsmen
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{player.name}</div>
                    <div className="text-2xl">
                      {selectedBatsmen.includes(player.id) ? '✓' : '○'}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedBatsmen.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">
                  Selected {match.isSingleSide ? 'Batsman' : 'Batsmen'}:
                </div>
                <div className="text-green-700 mt-1">
                  {selectedBatsmen.map(id => 
                    battingTeam.players.find(p => p.id === id)?.name
                  ).join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* Bowling Team Selection */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                ⚾ {bowlingTeam.name} - BOWLING
              </h3>
              <div className="text-sm text-gray-500">
                Select 1 bowler
              </div>
            </div>

            <div className="grid gap-3">
              {bowlingTeam.players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleBowlerSelect(player.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedBowler === player.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{player.name}</div>
                    <div className="text-2xl">
                      {selectedBowler === player.id ? '✓' : '○'}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedBowler && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">
                  Selected Bowler:
                </div>
                <div className="text-blue-700 mt-1">
                  {bowlingTeam.players.find(p => p.id === selectedBowler)?.name}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Start Match Button */}
        <div className="p-6 bg-gray-50 border-t">
          <button
            onClick={handleStartMatch}
            disabled={!isSelectionValid()}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
              isSelectionValid()
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🏏 Start Live Scoring
          </button>
          
          {!isSelectionValid() && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Please select {requiredBatsmen} {match.isSingleSide ? 'batsman' : 'batsmen'} and 1 bowler
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerSelectionPage; 