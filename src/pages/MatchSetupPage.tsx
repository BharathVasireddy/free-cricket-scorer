import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';
import { useAuth } from '../contexts/AuthContext';
import type { Team, Player } from '../types';

const MatchSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { createMatch } = useMatchStore();
  const { currentUser, isGuest } = useAuth();

  // Form state
  const [teams, setTeams] = useState<Team[]>([
    {
      id: 'team1',
      name: '',
      players: []
    },
    {
      id: 'team2', 
      name: '',
      players: []
    }
  ]);
  
  const [overs, setOvers] = useState<number | ''>('');
  const [playersPerTeam, setPlayersPerTeam] = useState<number | ''>('');
  const [hasJoker, setHasJoker] = useState<boolean>(false);
  const [jokerName, setJokerName] = useState<string>('');
  const [isSingleSide, setIsSingleSide] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<'basic' | 'teams'>('basic');

  // Form validation
  const isBasicValid = () => {
    return typeof overs === 'number' && overs >= 1 && overs <= 50 && 
           typeof playersPerTeam === 'number' && playersPerTeam >= 3 && playersPerTeam <= 11 &&
           (!hasJoker || (hasJoker && jokerName.trim() !== ''));
  };

  const isTeamsValid = () => {
    return typeof playersPerTeam === 'number' && teams.every(team => 
      team.name.trim() !== '' && 
      team.players.length === playersPerTeam &&
      team.players.every(player => player.name.trim() !== '')
    );
  };

  const handlePlayerNameChange = (teamIndex: number, playerIndex: number, name: string) => {
    // Convert player names to ALL UPPERCASE
    const uppercaseName = name.toUpperCase();
    
    setTeams(prev => prev.map((team, tIndex) => {
      if (tIndex === teamIndex) {
        const updatedPlayers = [...team.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          name: uppercaseName,
        };
        return { ...team, players: updatedPlayers };
      }
      return team;
    }));
  };

  const handleTeamNameChange = (teamIndex: number, name: string) => {
    // Convert team names to ALL UPPERCASE
    const uppercaseName = name.toUpperCase();
    
    setTeams(prev => prev.map((team, tIndex) => 
      tIndex === teamIndex ? { ...team, name: uppercaseName } : team
    ));
  };

  const generatePlayers = (teamId: string) => {
    const players: Player[] = [];
    const playerCount = typeof playersPerTeam === 'number' ? playersPerTeam : 0;
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: `${teamId}_player_${i + 1}`,
        name: '',
        role: 'allrounder',
      });
    }
    return players;
  };

  const handlePlayersPerTeamChange = (value: string) => {
    const count = value === '' ? '' : Number(value);
    setPlayersPerTeam(count);
    if (typeof count === 'number' && count >= 11) {
      setHasJoker(false);
      setJokerName('');
    }
    if (typeof count === 'number' && count >= 3 && count <= 11) {
      setTeams(prev => prev.map(team => ({
        ...team,
        players: generatePlayers(team.id)
      })));
    }
  };

  const proceedToTeams = () => {
    if (isBasicValid()) {
      // Initialize players when moving to teams step
      setTeams(prev => prev.map(team => ({
        ...team,
        players: generatePlayers(team.id)
      })));
      setCurrentStep('teams');
    }
  };

  const handleStartMatch = async () => {
    if (isTeamsValid() && typeof overs === 'number' && typeof playersPerTeam === 'number') {
      try {
        await createMatch({
          teams,
          overs,
          playersPerTeam,
          hasJoker,
          jokerName: hasJoker ? jokerName : undefined,
          isSingleSide,
          currentInning: 1,
          innings: [],
          status: 'active',
        }, currentUser?.uid, isGuest);
        navigate('/toss');
      } catch (error) {
        console.error('Failed to create match:', error);
        // Handle error - maybe show a toast or alert
      }
    }
  };

  if (currentStep === 'basic') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cricket-blue to-blue-700 flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-white/80 hover:text-white text-sm font-medium"
          >
            ← Back
          </button>
          <h1 className="text-white text-lg font-bold">Match Setup</h1>
          <div className="w-12"></div>
        </div>

        {/* Progress */}
        <div className="px-4 pb-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-cricket-blue font-bold text-sm">1</span>
            </div>
            <div className="w-8 h-0.5 bg-white/30"></div>
            <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">2</span>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="text-white/80 text-sm">Match Settings</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-t-3xl p-6 overflow-y-auto">
          <div className="max-w-md mx-auto space-y-6">
            
            {/* Match Format */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">🏏 Match Format</h2>
              
              {/* Overs */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Overs
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={overs}
                  onChange={(e) => setOvers(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-cricket-blue focus:outline-none text-center text-xl font-bold"
                  placeholder="Enter overs (1-50)"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">1-50 overs per innings</p>
              </div>

              {/* Players per team */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Players per Team
                </label>
                <input
                  type="number"
                  min="3"
                  max="11"
                  value={playersPerTeam}
                  onChange={(e) => handlePlayersPerTeamChange(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-cricket-blue focus:outline-none text-center text-xl font-bold"
                  placeholder="Enter players (3-11)"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">3-11 players (standard: 11)</p>
              </div>
            </div>

            {/* Special Rules */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">⚡ Special Rules</h2>
              
              {/* Batting Format */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Batting Format
                </label>
                <div className="space-y-3">
                  <button
                    onClick={() => setIsSingleSide(false)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${
                      !isSingleSide 
                        ? 'border-cricket-blue bg-blue-50 text-cricket-blue' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="font-bold text-sm">👥 Standard (Pair)</div>
                        <div className="text-xs mt-1">Two batsmen, strike rotation</div>
                      </div>
                      <div className="text-xl">
                        {!isSingleSide ? '✓' : '○'}
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setIsSingleSide(true)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${
                      isSingleSide 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="font-bold text-sm">👤 Single Batsman</div>
                        <div className="text-xs mt-1">One batsman only, no non-striker</div>
                      </div>
                      <div className="text-xl">
                        {isSingleSide ? '✓' : '○'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

                             {/* Joker Rule */}
               <div className={(typeof playersPerTeam === 'number' && playersPerTeam >= 11) ? 'opacity-50 pointer-events-none' : ''}>
                 <div className="flex items-center justify-between mb-3">
                   <label className="text-sm font-semibold text-gray-700">
                     🃏 Joker Player (Plays Both Sides)
                   </label>
                   <button
                     onClick={() => (typeof playersPerTeam !== 'number' || playersPerTeam < 11) && setHasJoker(!hasJoker)}
                     disabled={typeof playersPerTeam === 'number' && playersPerTeam >= 11}
                     className={`w-12 h-6 rounded-full transition-all ${
                       hasJoker ? 'bg-yellow-500' : 'bg-gray-300'
                     }`}
                   >
                     <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                       hasJoker ? 'translate-x-6' : 'translate-x-0.5'
                     }`}></div>
                   </button>
                 </div>
                 {(typeof playersPerTeam === 'number' && playersPerTeam >= 11) && (
                   <p className="text-xs text-gray-500 mt-1">
                     Joker disabled with 11+ players per team
                   </p>
                 )}
                
                {hasJoker && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={jokerName}
                      onChange={(e) => {
                        // Convert joker name to ALL UPPERCASE
                        const uppercaseName = e.target.value.toUpperCase();
                        setJokerName(uppercaseName);
                      }}
                      className="w-full p-3 border-2 border-yellow-300 rounded-lg focus:border-yellow-500 focus:outline-none"
                      placeholder="Enter joker player name"
                    />
                                         <p className="text-xs text-yellow-700 mt-1">
                       Extra player who can bat and bowl for both teams when needed!
                     </p>
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={proceedToTeams}
              disabled={!isBasicValid()}
              className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
                isBasicValid()
                  ? 'bg-cricket-blue text-white hover:bg-blue-700 shadow-lg' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to Teams →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Teams Setup Step
  return (
    <div className="min-h-screen bg-gradient-to-br from-cricket-blue to-blue-700 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => setCurrentStep('basic')}
          className="text-white/80 hover:text-white text-sm font-medium"
        >
          ← Back
        </button>
        <h1 className="text-white text-lg font-bold">Team Setup</h1>
        <div className="w-12"></div>
      </div>

      {/* Progress */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">1</span>
          </div>
          <div className="w-8 h-0.5 bg-white"></div>
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-cricket-blue font-bold text-sm">2</span>
          </div>
        </div>
        <div className="text-center mt-2">
          <span className="text-white/80 text-sm">Team Details</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl overflow-hidden flex flex-col">
        {/* Match Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
          <div className="flex justify-center items-center space-x-4 text-sm">
            <span className="font-semibold text-gray-700">{typeof overs === 'number' ? overs : '?'} overs</span>
            <span className="text-gray-400">•</span>
            <span className="font-semibold text-gray-700">{typeof playersPerTeam === 'number' ? playersPerTeam : '?'} players</span>
            <span className="text-gray-400">•</span>
            <span className="font-semibold text-gray-700">
              {isSingleSide ? 'Single Batsman' : 'Pair Batting'}
            </span>
            {hasJoker && (
              <>
                <span className="text-gray-400">•</span>
                <span className="font-semibold text-yellow-600">🃏 {jokerName} (Extra)</span>
              </>
            )}
          </div>

        </div>

        {/* Teams Input */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Setup Your Teams</h2>
            <p className="text-sm text-gray-600">Enter team names and player details</p>
          </div>
          <div className="space-y-8">
            {teams.map((team, teamIndex) => (
              <div key={team.id} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
                {/* Team Name Section - Much More Prominent */}
                <div className={`p-6 ${teamIndex === 0 ? 'bg-cricket-blue' : 'bg-green-600'}`}>
                  <div className="text-center mb-4">
                    <h3 className="text-white text-sm font-medium opacity-90">
                      {teamIndex === 0 ? '🏏 TEAM A' : '🏏 TEAM B'}
                    </h3>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => handleTeamNameChange(teamIndex, e.target.value)}
                      className="w-full bg-white/20 backdrop-blur-sm text-white placeholder-white/60 text-xl font-bold text-center py-4 px-6 rounded-xl border-2 border-white/30 focus:border-white focus:bg-white/30 focus:outline-none transition-all"
                      placeholder={`Enter team name...`}
                    />
                  </div>
                </div>
                
                <div className="p-4 pt-8">
                  <div className="grid gap-3">
                    {team.players.map((player, playerIndex) => (
                      <div key={player.id} className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          teamIndex === 0 ? 'bg-cricket-blue' : 'bg-green-600'
                        }`}>
                          {playerIndex + 1}
                        </div>
                        <input
                          type="text"
                          value={player.name}
                          onChange={(e) => handlePlayerNameChange(teamIndex, playerIndex, e.target.value)}
                          className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:border-cricket-blue focus:outline-none"
                          placeholder={`Player ${playerIndex + 1} name`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Match Button */}
        <div className="p-4 bg-gray-50 border-t">
          <button
            onClick={handleStartMatch}
            disabled={!isTeamsValid()}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
              isTeamsValid()
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            🏏 Start Match
          </button>
          
          {!isTeamsValid() && (
            <p className="text-center text-sm text-gray-500 mt-2">
              Please fill all team names and player names
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchSetupPage; 