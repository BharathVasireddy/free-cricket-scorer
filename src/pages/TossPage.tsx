import React, { useState } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useNavigate } from 'react-router-dom';

const TossPage: React.FC = () => {
  const navigate = useNavigate();
  const { match, setTossWinner } = useMatchStore();
  const [tossResult, setTossResult] = useState<'heads' | 'tails' | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [tossChoice, setTossChoice] = useState<'bat' | 'bowl' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [coinSide, setCoinSide] = useState<'heads' | 'tails'>('heads');

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No match found</p>
          <button
            onClick={() => navigate('/setup')}
            className="btn-primary"
          >
            Setup Match
          </button>
        </div>
      </div>
    );
  }

  const handleCoinFlip = () => {
    setIsFlipping(true);
    
    // Animate coin sides during flip
    const flipInterval = setInterval(() => {
      setCoinSide(prev => prev === 'heads' ? 'tails' : 'heads');
    }, 100);
    
    // Stop after 3 seconds with final result
    setTimeout(() => {
      clearInterval(flipInterval);
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      setCoinSide(result);
      setTossResult(result);
      setIsFlipping(false);
      
      // Show result after a brief pause
      setTimeout(() => {
        setShowResult(true);
      }, 500);
    }, 3000);
  };

  const handleTeamSelection = (teamId: string) => {
    setSelectedTeam(teamId);
  };

  const handleChoiceSelection = (choice: 'bat' | 'bowl') => {
    setTossChoice(choice);
  };

  const handleContinue = () => {
    if (selectedTeam && tossChoice) {
      // Set the toss winner and their choice in the store
      setTossWinner(selectedTeam, tossChoice);
      navigate('/players');
    }
  };

  const selectedTeamData = match.teams.find(t => t.id === selectedTeam);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cricket-blue to-blue-700">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Match Toss</h1>
          <p className="text-blue-100">
            {match.teams[0].name} vs {match.teams[1].name}
          </p>
          {match.hasJoker && match.jokerName && (
            <p className="text-yellow-200 text-sm mt-2">
              🃏 Joker: {match.jokerName}
            </p>
          )}
        </div>

        <div className="max-w-md mx-auto">
          {/* Step 1: Coin Flip */}
          {!showResult && (
            <div className="bg-white rounded-xl p-6 text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Ready for the toss?
              </h2>
              
              <div className="mb-6">
                <div className="coin-container perspective-1000">
                  <div className={`coin w-32 h-32 mx-auto relative transition-all duration-500 ${isFlipping ? 'flipping' : ''}`}
                       style={{ 
                         transform: !isFlipping && tossResult ? 
                           (tossResult === 'heads' ? 'rotateY(0deg)' : 'rotateY(180deg)') : 
                           '' 
                       }}>
                    <div className="coin-side coin-heads">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-4 border-yellow-600 flex items-center justify-center text-4xl font-bold shadow-2xl">
                        🏏
                      </div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
                    </div>
                    <div className="coin-side coin-tails">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-300 to-gray-500 border-4 border-gray-600 flex items-center justify-center text-4xl font-bold shadow-2xl">
                        ⚪
                      </div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                </div>
                
                {/* Flip indicator */}
                <div className="text-center">
                  <div className={`text-sm font-medium transition-opacity duration-300 ${
                    isFlipping ? 'opacity-100 text-cricket-blue' : 'opacity-0'
                  }`}>
                    Flipping... {coinSide === 'heads' ? '🏏' : '⚪'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCoinFlip}
                disabled={isFlipping}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 ${
                  isFlipping 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed scale-100' 
                    : 'bg-gradient-to-r from-cricket-blue to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg'
                }`}
              >
                {isFlipping ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-pulse">🪙</span>
                    <span className="ml-2">Flipping Coin...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <span>🎯</span>
                    <span className="ml-2">Flip the Coin!</span>
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Toss Result & Team Selection */}
          {showResult && !selectedTeam && (
            <div className="bg-white rounded-xl p-6 mb-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Coin landed on: <span className="text-cricket-blue capitalize">{tossResult}</span>
                </h2>
                <p className="text-gray-600">Which team called it correctly?</p>
              </div>

              <div className="space-y-3">
                {match.teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamSelection(team.id)}
                    className="w-full p-4 text-left bg-gray-50 hover:bg-cricket-blue hover:text-white rounded-lg transition-colors border-2 border-transparent hover:border-cricket-blue"
                  >
                    <div className="font-semibold">{team.name}</div>
                    <div className="text-sm opacity-75">
                      {team.players.length} players
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Choice Selection */}
          {selectedTeam && !tossChoice && (
            <div className="bg-white rounded-xl p-6 mb-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {selectedTeamData?.name} won the toss!
                </h2>
                <p className="text-gray-600">What do they choose to do?</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleChoiceSelection('bat')}
                  className="p-6 text-center bg-green-50 hover:bg-green-100 rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors"
                >
                  <div className="text-3xl mb-2">🏏</div>
                  <div className="font-semibold text-green-800">Bat First</div>
                </button>
                <button
                  onClick={() => handleChoiceSelection('bowl')}
                  className="p-6 text-center bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors"
                >
                  <div className="text-3xl mb-2">🥎</div>
                  <div className="font-semibold text-blue-800">Bowl First</div>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Summary & Continue */}
          {selectedTeam && tossChoice && (
            <div className="bg-white rounded-xl p-6 mb-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Toss Complete! 🎉
                </h2>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-600 mb-2">Toss Result:</div>
                  <div className="font-semibold text-cricket-blue mb-3">
                    {selectedTeamData?.name} won and chose to {tossChoice} first
                  </div>
                  
                  <div className="text-sm text-gray-700">
                    <div className="mb-1">
                      <span className="font-medium">
                        {tossChoice === 'bat' ? 'Batting:' : 'Bowling:'}
                      </span> {selectedTeamData?.name}
                    </div>
                    <div>
                      <span className="font-medium">
                        {tossChoice === 'bat' ? 'Bowling:' : 'Batting:'}
                      </span> {match.teams.find(t => t.id !== selectedTeam)?.name}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleContinue}
                className="w-full py-3 bg-cricket-blue text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Match 🏏
              </button>
            </div>
          )}

          {/* Back Button */}
          <div className="text-center">
            <button
              onClick={() => navigate(-1)}
              className="text-blue-100 hover:text-white text-sm underline touch-target"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TossPage; 