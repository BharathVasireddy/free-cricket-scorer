import React, { useState, useEffect } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useNavigate } from 'react-router-dom';

const LiveScoringPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    match,
    currentInnings,
    currentBatsmen,
    currentBowler,
    addBall,
    changeBowler,
    changeBatsman,
    switchToSingleBatting,
    endInningsEarly,
    isLastManStanding,
  } = useMatchStore();

  const [selectedBatsmanIndex, setSelectedBatsmanIndex] = useState(0);
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isBowlerModalOpen, setIsBowlerModalOpen] = useState(false);
  const [isWideModalOpen, setIsWideModalOpen] = useState(false);
  const [isNoBallModalOpen, setIsNoBallModalOpen] = useState(false);
  const [isBatsmanModalOpen, setIsBatsmanModalOpen] = useState(false);
  const [isLastManModalOpen, setIsLastManModalOpen] = useState(false);
  const [lastManBatsmanId, setLastManBatsmanId] = useState<string>('');
  
  // Animation states
  const [animationType, setAnimationType] = useState<'four' | 'six' | 'wicket' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check for innings completion and navigate appropriately
  useEffect(() => {
    if (currentInnings?.isCompleted) {
      console.log('Innings completed, navigating based on innings number:', currentInnings.number);
      if (currentInnings.number === 1) {
        // First innings completed - go to innings break
        navigate('/innings-break');
      } else {
        // Second innings completed - go to winner page  
        navigate('/winner');
      }
    }
  }, [currentInnings?.isCompleted, currentInnings?.number, navigate]);

  if (!match || !currentInnings || !currentBatsmen || !currentBowler) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🏏</div>
          <p className="text-gray-600 mb-4">No active match found</p>
          <button
            onClick={() => navigate('/setup')}
            className="bg-cricket-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Start New Match
          </button>
        </div>
      </div>
    );
  }

  const battingTeam = match.teams.find(t => t.id === currentInnings.battingTeamId);
  const bowlingTeam = match.teams.find(t => t.id === currentInnings.bowlingTeamId);
  const currentBowlerPlayer = bowlingTeam?.players.find(p => p.id === currentBowler.playerId);

  // Handle both single batsman and pair of batsmen
  // Check if we're in single batting mode (either from start or switched during match)
  const isCurrentlySingleBatting = match.isSingleSide || !Array.isArray(currentBatsmen);
  const batsmen = isCurrentlySingleBatting 
    ? [currentBatsmen as any] 
    : currentBatsmen as [any, any];

  // Animation trigger function
  const triggerAnimation = (type: 'four' | 'six' | 'wicket') => {
    setAnimationType(type);
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setAnimationType(null);
      }, 800); // Extra delay for score entrance animation
    }, 1500); // Shorter celebration time
  };

  const handleScoreButton = (runs: number) => {
    const currentBatsman = batsmen[selectedBatsmanIndex];

    // CRITICAL: Prevent scoring if batsman is out
    if (currentBatsman.isOut) {
      alert('This batsman is out and cannot continue batting! Select a new batsman.');
      setIsBatsmanModalOpen(true);
      return;
    }

    addBall({
      runs: runs,
      extras: null,
      wicket: false,
      batsmanId: currentBatsman.playerId,
      bowlerId: currentBowler.playerId,
    });

    // Trigger animations for boundaries
    if (runs === 4) {
      triggerAnimation('four');
    } else if (runs === 6) {
      triggerAnimation('six');
    }

    // Auto-switch strike after odd runs (only for standard batting, not single-side)
    if (!isCurrentlySingleBatting && runs % 2 === 1) {
      setSelectedBatsmanIndex(selectedBatsmanIndex === 0 ? 1 : 0);
    }
  };

  const handleExtra = (type: 'wide' | 'noball' | 'bye' | 'legbye', runs: number = 1) => {
    // For bye/legbye, check if batsman is out
    if ((type === 'bye' || type === 'legbye') && batsmen[selectedBatsmanIndex].isOut) {
      alert('This batsman is out and cannot continue batting! Select a new batsman.');
      setIsBatsmanModalOpen(true);
      return;
    }

    addBall({
      runs: 0,
      extras: { type, runs },
      wicket: false,
      batsmanId: type === 'bye' || type === 'legbye' ? batsmen[selectedBatsmanIndex].playerId : undefined,
      bowlerId: currentBowler.playerId,
    });
  };

  const handleWicket = () => {
    // Check if current batsman is already out
    if (batsmen[selectedBatsmanIndex].isOut) {
      alert('This batsman is already out! Select a new batsman first.');
      setIsBatsmanModalOpen(true);
      return;
    }
    
    setIsWicketModalOpen(true);
  };

  const confirmWicket = (wicketType: string = 'out') => {
    addBall({
      runs: 0,
      extras: null,
      wicket: true,
      wicketType: wicketType as any,
      batsmanId: batsmen[selectedBatsmanIndex].playerId,
      bowlerId: currentBowler.playerId,
    });
    setIsWicketModalOpen(false);
    
    // Trigger wicket animation
    triggerAnimation('wicket');
    
    // ALWAYS check for new batsman after wicket - critical fix
    setTimeout(() => {
      const availableBatsmen = getAvailableBatsmen();
      console.log('Wicket confirmed - available batsmen check:', {
        available: availableBatsmen.length,
        names: availableBatsmen.map(b => b.name),
        totalWickets: currentInnings.totalWickets + 1, // +1 because wicket just added
        isCompleted: currentInnings.isCompleted,
        isSingleSide: match.isSingleSide
      });
      
      // For both single-side and standard batting, check if new batsman needed
      if (availableBatsmen.length > 0 && !currentInnings.isCompleted) {
        console.log('Opening batsman selection modal');
        setIsBatsmanModalOpen(true);
      } else {
        console.log('No new batsman needed - match/innings ending conditions met');
      }
    }, 1200); // Delay to ensure state update
  };

  const handleBowlerChange = (newBowlerId: string) => {
    changeBowler(newBowlerId);
    setIsBowlerModalOpen(false);
  };

  const handleBatsmanChange = (newBatsmanId: string) => {
    const currentBatsman = batsmen[selectedBatsmanIndex];
    changeBatsman(currentBatsman.playerId, newBatsmanId);
    setIsBatsmanModalOpen(false);
  };

  // Get available batsmen (excluding current batsmen and out batsmen)
  const getAvailableBatsmen = () => {
    const currentBatsmanIds = isCurrentlySingleBatting 
      ? [batsmen[0].playerId]
      : [batsmen[0].playerId, batsmen[1].playerId];
    
    // Get all batsmen who are currently out from current innings
    const outBatsmenIds = new Set<string>();
    
    currentInnings.overs.forEach(over => {
      over.balls.forEach(ball => {
        if (ball.wicket && ball.batsmanId) {
          outBatsmenIds.add(ball.batsmanId);
        }
      });
    });
    
    return battingTeam?.players.filter(player => 
      !currentBatsmanIds.includes(player.id) && 
      !outBatsmenIds.has(player.id)
    ) || [];
  };

  // Get available bowlers (excluding current bowler)
  const getAvailableBowlers = () => {
    return bowlingTeam?.players.filter(player => 
      player.id !== currentBowler.playerId
    ) || [];
  };

  // Get current over balls with formatting
  const getCurrentOver = () => {
    if (!currentInnings.overs.length) return [];
    
    const currentOver = currentInnings.overs[currentInnings.overs.length - 1];
    if (!currentOver) return [];
    
    return currentOver.balls.map((ball, index) => {
      let value = '';
      let colorClass = '';
      
      if (ball.wicket) {
        value = 'W';
        colorClass = 'bg-red-500 text-white';
      } else if (ball.extras) {
        switch (ball.extras.type) {
          case 'wide': 
            value = `Wd${ball.extras.runs > 1 ? ball.extras.runs : ''}`;
            colorClass = 'bg-orange-500 text-white';
            break;
          case 'noball': 
            value = `Nb${ball.extras.runs > 1 ? ball.extras.runs : ''}`;
            colorClass = 'bg-red-500 text-white';
            break;
          case 'bye': 
            value = `B${ball.extras.runs}`;
            colorClass = 'bg-gray-400 text-white';
            break;
          case 'legbye': 
            value = `Lb${ball.extras.runs}`;
            colorClass = 'bg-gray-400 text-white';
            break;
        }
      } else {
        value = ball.runs.toString();
        if (ball.runs === 4) colorClass = 'bg-green-500 text-white';
        else if (ball.runs === 6) colorClass = 'bg-purple-500 text-white';
        else if (ball.runs === 0) colorClass = 'bg-gray-200 text-gray-600';
        else colorClass = 'bg-blue-100 text-blue-800';
      }
      
      return { value, colorClass, key: index };
    });
  };

  const currentOver = currentInnings.overs[currentInnings.overs.length - 1];
  const ballsThisOver = currentOver?.balls.filter(
    b => !b.extras || (b.extras.type !== 'wide' && b.extras.type !== 'noball')
  ).length || 0;

  // Over is complete if we have 6 valid balls AND there's a current over AND the current bowler matches
  const isOverComplete = ballsThisOver >= 6 && currentOver && currentOver.bowlerId === currentBowler.playerId;
  
  // Check if match overs are complete
  const totalOversCompleted = Math.floor(currentInnings.totalBalls / 6);
  const isMatchComplete = totalOversCompleted >= match.overs;
  
  // Disable scoring if over is complete OR match is complete
  const shouldDisableScoring = isOverComplete || isMatchComplete;

  // Auto-open bowler modal when over is complete (but not match complete)
  useEffect(() => {
    if (isOverComplete && !isMatchComplete && !isBowlerModalOpen) {
      // Small delay to show over complete message first
      const timer = setTimeout(() => {
        setIsBowlerModalOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOverComplete, isMatchComplete, isBowlerModalOpen]);

  // Handle innings completion automatically
  useEffect(() => {
    if (!currentInnings || !match) return;

    // Check if innings is completed (set by the store)
    if (currentInnings.isCompleted) {
      const isFirstInnings = currentInnings.number === 1;
      
      // Navigate based on which innings just completed
      const timer = setTimeout(() => {
        if (isFirstInnings) {
          navigate('/innings-break');
        } else {
          navigate('/winner');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentInnings?.isCompleted, currentInnings?.number, navigate]);

  // Handle match completion and navigate to winner page
  useEffect(() => {
    if (match?.status === 'completed') {
      // Navigate to winner page after match completion
      const timer = setTimeout(() => {
        navigate('/winner');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [match?.status, navigate]);

  // Check for last man standing situation
  useEffect(() => {
    if (!match || match.isSingleSide || !currentInnings || !currentBatsmen) return;

    const lastManCheck = isLastManStanding();
    if (lastManCheck?.isLastMan && lastManCheck.remainingBatsmanId && !isLastManModalOpen) {
      setLastManBatsmanId(lastManCheck.remainingBatsmanId);
      setIsLastManModalOpen(true);
    }
  }, [currentBatsmen, match, currentInnings, isLastManStanding, isLastManModalOpen]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Mobile-Optimized Header */}
      <div className="bg-white border-b px-3 py-2 flex-shrink-0 shadow-sm">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-cricket-blue font-medium text-sm flex items-center touch-target"
          >
            <span className="text-lg mr-1">←</span>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="text-center flex-1">
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Live Match</h1>
            <div className="text-xs text-gray-600">
              {isCurrentlySingleBatting ? (
                match.isSingleSide ? 'Single Side' : 'Last Man'
              ) : (
                'Standard Format'
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/scorecard')}
              className="text-cricket-blue font-medium text-sm touch-target"
            >
              <span className="text-lg">📊</span>
              <span className="hidden sm:inline ml-1">Score</span>
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Score Display */}
      <div className={`relative overflow-hidden px-3 py-4 flex-shrink-0 transition-all duration-700 ${
        animationType === 'four' ? 'bg-gradient-to-r from-green-500 to-green-600' :
        animationType === 'six' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
        animationType === 'wicket' ? 'bg-gradient-to-r from-red-500 to-red-600' :
        'bg-gradient-to-r from-cricket-blue to-blue-600'
      }`}>
        
        {/* Animation Effects */}
        {isAnimating && (
          <>
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full border-4 border-white/30 animate-ping"
                  style={{
                    width: `${150 + i * 75}px`,
                    height: `${150 + i * 75}px`,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    animationDelay: `${i * 200}ms`,
                    animationDuration: '1.5s'
                  }}
                />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-30">
              <div className={`font-black text-white text-2xl sm:text-4xl transform transition-all duration-700 text-center ${
                animationType === 'four' ? 'animate-bounce' :
                animationType === 'six' ? 'animate-pulse' :
                animationType === 'wicket' ? 'animate-pulse' : ''
              }`}>
                {animationType === 'four' && '🏏 FOUR!'}
                {animationType === 'six' && '⚡ SIX!'}
                {animationType === 'wicket' && '💥 WICKET!'}
              </div>
            </div>
          </>
        )}

        {/* Score Content */}
        <div className={`transition-all duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          
          {/* Team and Score */}
          <div className="flex items-center justify-center space-x-4 mb-3">
            <div className="text-lg sm:text-xl font-bold text-white text-center">
              {battingTeam?.name}
            </div>
            <div className="text-4xl sm:text-5xl font-black text-white">
              {currentInnings.totalRuns}/{currentInnings.totalWickets}
            </div>
          </div>

          {/* Overs and Stats */}
          <div className="flex justify-center items-center space-x-4 sm:space-x-6 mb-2">
            <div className="text-center">
              <span className="text-lg font-semibold text-white/90">
                {Math.floor(currentInnings.totalBalls / 6)}.{currentInnings.totalBalls % 6}
              </span>
              <span className="text-sm text-white/70 ml-1">/{match.overs}</span>
            </div>
            
            <div className="w-1 h-1 bg-white/50 rounded-full"></div>
            
            <div className="text-center">
              <span className="text-lg font-semibold text-white/90">
                {currentInnings.totalBalls > 0 ? ((currentInnings.totalRuns / currentInnings.totalBalls) * 6).toFixed(1) : '0.0'}
              </span>
              <span className="text-sm text-white/70 ml-1">RR</span>
            </div>
          </div>

          {/* Target Info */}
          {currentInnings.target && (
            <div className="text-center">
              <div className="text-sm sm:text-base text-white/90">
                Need <span className="font-bold">{currentInnings.target - currentInnings.totalRuns}</span> from <span className="font-bold">{(match.overs * 6) - currentInnings.totalBalls}</span> balls
                <span className="ml-2 text-white/80">
                  (RRR: {
                    ((match.overs * 6) - currentInnings.totalBalls) > 0 ? 
                    (((currentInnings.target - currentInnings.totalRuns) / (((match.overs * 6) - currentInnings.totalBalls) / 6)).toFixed(1)) : 
                    '0.0'
                  })
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Players Section - Compact and Touch-Friendly */}
      <div className="bg-white border-b px-3 py-3 flex-shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {/* Batsmen */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2 flex justify-between items-center">
              <span>{isCurrentlySingleBatting ? 'BATSMAN' : 'BATTING'}</span>
              <button
                onClick={() => setIsBatsmanModalOpen(true)}
                className="text-xs text-cricket-blue hover:underline touch-target"
              >
                Change
              </button>
            </div>
            <div className="space-y-2">
              {batsmen.map((batsman, index) => {
                const player = battingTeam?.players.find(p => p.id === batsman.playerId);
                const isJoker = match.hasJoker && player?.name === match.jokerName;
                const isOnStrike = selectedBatsmanIndex === index;
                
                return (
                  <div 
                    key={index}
                    className={`p-2 rounded-lg cursor-pointer transition-all touch-target ${
                      isOnStrike 
                        ? 'bg-green-100 border-2 border-green-500' 
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedBatsmanIndex(index)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-sm text-gray-900">
                        {player?.name}{isJoker && ' 🃏'}
                        {isOnStrike && <span className="text-green-600 ml-1">*</span>}
                      </div>
                      <div className="text-xs text-gray-600">
                        {batsman.runs}({batsman.balls})
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      SR: {batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(0) : '0'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bowler */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2 flex justify-between items-center">
              <span>BOWLING</span>
              <button
                onClick={() => setIsBowlerModalOpen(true)}
                className="text-xs text-cricket-blue hover:underline touch-target"
              >
                Change
              </button>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm text-gray-900 mb-1">
                {currentBowlerPlayer?.name}
                {match.hasJoker && currentBowlerPlayer?.name === match.jokerName && ' 🃏'}
              </div>
              <div className="text-xs text-gray-600 flex justify-between">
                <span>{currentBowler.wickets}-{currentBowler.runs}</span>
                <span>{Math.floor(currentBowler.balls / 6)}.{currentBowler.balls % 6}</span>
                <span>Eco: {currentBowler.balls > 0 ? ((currentBowler.runs / currentBowler.balls) * 6).toFixed(1) : '0.0'}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* This Over */}
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-2">THIS OVER</div>
          <div className="bg-gray-50 p-2 rounded-lg min-h-[40px] flex items-center justify-center">
            {getCurrentOver().length > 0 ? (
              <div className="flex flex-wrap gap-1 justify-center">
                {getCurrentOver().map((ball) => (
                  <span
                    key={ball.key}
                    className={`${ball.colorClass} px-2 py-1 rounded-full text-xs font-bold min-w-[24px] text-center`}
                  >
                    {ball.value}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 text-lg">•</span>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {(() => {
        const isFirstInnings = currentInnings.number === 1;
        const isMatchCompleted = match.status === 'completed';

        if (isMatchCompleted) {
          return (
            <div className="bg-green-600 text-white px-3 py-4 text-center flex-shrink-0">
              <div className="text-lg font-bold mb-1">🏆 Match Completed!</div>
              <div className="text-sm">Redirecting to results...</div>
            </div>
          );
        }

        if (currentInnings.isCompleted) {
          let message = '';
          if (currentInnings.totalWickets >= match.playersPerTeam - 1) {
            message = `${battingTeam?.name} All Out!`;
          } else if (currentInnings.totalBalls >= match.overs * 6) {
            message = `${match.overs} Overs Completed!`;
          } else if (currentInnings.target && currentInnings.totalRuns >= currentInnings.target) {
            message = `Target Achieved!`;
          }

          return (
            <div className="bg-blue-600 text-white px-3 py-4 text-center flex-shrink-0">
              <div className="text-lg font-bold mb-1">{message}</div>
              <div className="text-sm">
                {isFirstInnings ? 'Moving to innings break...' : 'Moving to results...'}
              </div>
            </div>
          );
        }

        if (isOverComplete && !isMatchComplete) {
          return (
            <div className="bg-amber-500 text-white px-3 py-3 text-center flex-shrink-0">
              <div className="text-sm font-medium">Over Complete! Select new bowler</div>
            </div>
          );
        }

        return null;
      })()}

      {/* Mobile-Optimized Scoring Interface */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {/* Run Buttons - Larger Touch Targets */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[0, 1, 2, 3, 4, 6].map(runs => {
              const currentBatsman = batsmen[selectedBatsmanIndex];
              const isJoker = match.hasJoker && battingTeam?.players.find(p => p.id === currentBatsman.playerId)?.name === match.jokerName;
              
              return (
                <button
                  key={runs}
                  onClick={() => handleScoreButton(runs)}
                  disabled={shouldDisableScoring}
                  className={`h-16 sm:h-20 rounded-xl font-bold text-xl sm:text-2xl transition-all touch-target ${
                    runs === 4 || runs === 6 
                      ? 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700' 
                      : 'bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                  } ${shouldDisableScoring ? 'opacity-50 cursor-not-allowed' : ''} ${
                    isJoker ? 'ring-2 ring-yellow-400' : ''
                  }`}
                >
                  {runs}
                </button>
              );
            })}
          </div>

          {/* Extras - Touch-Friendly */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => setIsWideModalOpen(true)}
              disabled={shouldDisableScoring}
              className="py-3 text-sm font-medium bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 active:bg-orange-300 transition-colors disabled:opacity-50 touch-target"
            >
              Wide
            </button>
            <button
              onClick={() => setIsNoBallModalOpen(true)}
              disabled={shouldDisableScoring}
              className="py-3 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 active:bg-red-300 transition-colors disabled:opacity-50 touch-target"
            >
              No Ball
            </button>
            <button
              onClick={() => handleExtra('bye')}
              disabled={shouldDisableScoring}
              className="py-3 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50 touch-target"
            >
              Bye
            </button>
            <button
              onClick={() => handleExtra('legbye')}
              disabled={shouldDisableScoring}
              className="py-3 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50 touch-target"
            >
              Leg Bye
            </button>
          </div>

          {/* Wicket Button - Prominent */}
          <button
            onClick={handleWicket}
            disabled={shouldDisableScoring}
            className={`w-full py-4 text-lg font-bold rounded-xl transition-all touch-target mb-4 ${
              shouldDisableScoring 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700'
            }`}
          >
            🏏 WICKET
          </button>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setIsBowlerModalOpen(true)}
              className="py-3 text-sm font-medium bg-cricket-blue text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-target"
            >
              🔄 Change Bowler
            </button>
            <button
              onClick={() => {/* TODO: Implement undo */}}
              disabled
              className="py-3 text-sm font-medium bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed touch-target"
            >
              ↶ Undo Ball
            </button>
          </div>

          {/* Over/Match Status */}
          {isOverComplete && !isMatchComplete && (
            <div className="text-center py-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium mt-3">
              Over Complete! 
              <button 
                onClick={() => setIsBowlerModalOpen(true)}
                className="ml-2 underline font-semibold touch-target"
              >
                Change Bowler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals remain the same but with better touch targets */}
      {/* Wicket Modal */}
      {isWicketModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-center">How was the batsman out?</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                'Bowled', 'Caught', 'LBW', 'Stumped', 
                'Run Out', 'Hit Wicket', 'Retired', 'Other'
              ].map(type => (
                <button
                  key={type}
                  onClick={() => confirmWicket(type.toLowerCase().replace(' ', ''))}
                  className="py-3 text-sm font-medium bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-colors touch-target"
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsWicketModalOpen(false)}
              className="w-full py-3 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 active:bg-gray-500 transition-colors touch-target"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bowler Selection Modal */}
      {isBowlerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-center">Select New Bowler</h3>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {getAvailableBowlers().map(player => {
                const isJoker = match.hasJoker && player.name === match.jokerName;
                return (
                  <button
                    key={player.id}
                    onClick={() => handleBowlerChange(player.id)}
                    className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-target"
                  >
                    <div className="font-medium">
                      {player.name}
                      {isJoker && <span className="ml-2">🃏</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setIsBowlerModalOpen(false)}
              className="w-full py-3 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 active:bg-gray-500 transition-colors touch-target"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Batsman Selection Modal */}
      {isBatsmanModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-center">Select New Batsman</h3>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {getAvailableBatsmen().map(player => {
                const isJoker = match.hasJoker && player.name === match.jokerName;
                return (
                  <button
                    key={player.id}
                    onClick={() => handleBatsmanChange(player.id)}
                    className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-target"
                  >
                    <div className="font-medium">
                      {player.name}
                      {isJoker && <span className="ml-2">🃏</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setIsBatsmanModalOpen(false)}
              className="w-full py-3 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 active:bg-gray-500 transition-colors touch-target"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Wide Modal */}
      {isWideModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-center">Wide Ball</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5].map(runs => (
                <button
                  key={runs}
                  onClick={() => {
                    handleExtra('wide', runs);
                    setIsWideModalOpen(false);
                  }}
                  className="py-3 text-sm font-medium bg-orange-100 hover:bg-orange-200 active:bg-orange-300 rounded-lg transition-colors touch-target"
                >
                  Wd {runs}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsWideModalOpen(false)}
              className="w-full py-3 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 active:bg-gray-500 transition-colors touch-target"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* No Ball Modal */}
      {isNoBallModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-center">No Ball</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7].map(runs => (
                <button
                  key={runs}
                  onClick={() => {
                    handleExtra('noball', runs);
                    setIsNoBallModalOpen(false);
                  }}
                  className="py-3 text-sm font-medium bg-red-100 hover:bg-red-200 active:bg-red-300 rounded-lg transition-colors touch-target"
                >
                  Nb {runs}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsNoBallModalOpen(false)}
              className="w-full py-3 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 active:bg-gray-500 transition-colors touch-target"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Last Man Modal */}
      {isLastManModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-center">Last Man Standing!</h3>
            <p className="text-gray-600 mb-4 text-center">
              Only one batsman left. Switch to single-side batting?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  switchToSingleBatting(lastManBatsmanId);
                  setIsLastManModalOpen(false);
                }}
                className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 font-medium transition-colors touch-target"
              >
                Continue with Last Man
              </button>
              <button
                onClick={() => {
                  endInningsEarly();
                  setIsLastManModalOpen(false);
                }}
                className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 active:bg-red-700 font-medium transition-colors touch-target"
              >
                End Innings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScoringPage; 