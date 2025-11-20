import React, { useState, useEffect } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useNavigate } from 'react-router-dom';
import type { Ball } from '../types';

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
    checkAndAbandonMatch,
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

  // Check for match abandonment (every 30 seconds)
  useEffect(() => {
    const checkAbandonment = () => {
      const wasAbandoned = checkAndAbandonMatch();
      if (wasAbandoned) {
        navigate('/winner'); // Show abandoned result
      }
    };

    // Check immediately and then every 30 seconds
    checkAbandonment();
    const interval = setInterval(checkAbandonment, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [checkAndAbandonMatch, navigate]);

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
          <p className="text-gray-600 mb-4">No active match found</p>
          <button
            onClick={() => navigate('/setup')}
            className="btn-primary"
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
    if (!match || !currentBatsmen || !currentBowler) return;

    // For bye/legbye, check if batsman is out
    if ((type === 'bye' || type === 'legbye') && batsmen[selectedBatsmanIndex].isOut) {
      alert('This batsman is out and cannot continue batting! Select a new batsman.');
      setIsBatsmanModalOpen(true);
      return;
    }

    // Calculate total runs based on penalty settings
    let totalRuns = runs;

    // Add penalty run if enabled in match settings
    if (type === 'wide' && match.wideRunPenalty) {
      totalRuns += 1; // +1 for the wide itself
    } else if (type === 'noball' && match.noBallRunPenalty) {
      totalRuns += 1; // +1 for the no-ball itself
    }

    const ball: Omit<Ball, 'overNumber' | 'ballNumber'> = {
      runs: 0,
      extras: { type, runs: totalRuns },
      wicket: false,
      bowlerId: currentBowler.playerId,
      batsmanId: type === 'bye' || type === 'legbye' ? batsmen[selectedBatsmanIndex].playerId : undefined,
    };

    addBall(ball);
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

    // Check each over for wickets to find out batsmen
    currentInnings.overs.forEach(over => {
      over.balls.forEach(ball => {
        if (ball.wicket && ball.batsmanId) {
          outBatsmenIds.add(ball.batsmanId);
        }
      });
    });

    console.log('🏏 Available Batsmen Check:', {
      totalWickets: currentInnings.totalWickets,
      outBatsmenIds: Array.from(outBatsmenIds),
      currentBatsmanIds,
      hasJoker: match.hasJoker,
      jokerName: match.jokerName
    });

    // Get team players
    let availablePlayers = battingTeam?.players.filter(player =>
      !currentBatsmanIds.includes(player.id) && !outBatsmenIds.has(player.id)
    ) || [];

    // Add joker if available for both teams
    if (match.hasJoker && match.jokerName) {
      // Check if joker is already out
      const jokerOutInTeamA = outBatsmenIds.has('joker-teamA');
      const jokerOutInTeamB = outBatsmenIds.has('joker-teamB');

      // Check if joker is currently batting
      const jokerCurrentlyBatting = currentBatsmanIds.includes('joker-teamA') || currentBatsmanIds.includes('joker-teamB');

      // If joker not out and not currently batting, add to available
      if (!jokerOutInTeamA && !jokerOutInTeamB && !jokerCurrentlyBatting) {
        // Add virtual joker player
        availablePlayers.push({
          id: `joker-${battingTeam?.name.toLowerCase().replace(/\s+/g, '')}`,
          name: match.jokerName,
          role: 'allrounder' as const
        });
        console.log('🃏 Joker added to available batsmen');
      } else {
        console.log('🃏 Joker not available:', { jokerOutInTeamA, jokerOutInTeamB, jokerCurrentlyBatting });
      }
    }

    console.log('Available batsmen:', availablePlayers.map(p => p.name));
    return availablePlayers;
  };

  // Get all bowlers with their status
  const getAllBowlersWithStatus = () => {
    // Check if we're mid-over (current over exists and has balls but isn't completed)
    const currentOver = currentInnings.overs[currentInnings.overs.length - 1];
    const isMidOver = currentOver && !currentOver.completed;

    // Get the last COMPLETED over's bowler
    let lastCompletedOverBowlerId = null;
    if (isMidOver && currentInnings.overs.length > 1) {
      // If mid-over, get the second-to-last over (last completed)
      lastCompletedOverBowlerId = currentInnings.overs[currentInnings.overs.length - 2]?.bowlerId;
    } else if (!isMidOver && currentInnings.overs.length > 0) {
      // If over just completed, get the last over
      lastCompletedOverBowlerId = currentInnings.overs[currentInnings.overs.length - 1]?.bowlerId;
    }

    return bowlingTeam?.players.map(player => {
      let status = '';
      let isDisabled = false;

      // Only disable the bowler who bowled the last COMPLETED over
      if (player.id === lastCompletedOverBowlerId) {
        status = 'Bowled Last Over';
        isDisabled = true;
      }

      return { player, status, isDisabled };
    }) || [];
  };

  const getCurrentOver = () => {
    const currentOver = currentInnings.overs[currentInnings.overs.length - 1];
    if (!currentOver || currentOver.balls.length === 0) return [];

    return currentOver.balls.map((ball, index) => {
      let value = '';
      let colorClass = 'bg-gray-100 text-gray-700';

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
      {/* Compact Header - Mobile Optimized */}
      <div className="bg-white border-b px-3 py-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-cricket-blue font-medium"
          >
            ← Back
          </button>
          <div className="text-center">
            <h1 className="text-base font-bold text-gray-900">Live Match</h1>
            <div className="text-xs text-gray-600">
              {isCurrentlySingleBatting ? (
                match.isSingleSide ? 'Single Side' : 'Last Man'
              ) : (
                'Standard'
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/scorecard')}
            className="text-sm text-cricket-blue font-medium"
          >
            📊
          </button>
        </div>
      </div>

      {/* Score Display - Mobile Compact */}
      <div className={`relative overflow-hidden px-3 py-3 flex-shrink-0 transition-all duration-700 ${animationType === 'four' ? 'bg-gradient-to-r from-green-500 to-green-600' :
        animationType === 'six' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
          animationType === 'wicket' ? 'bg-gradient-to-r from-red-500 to-red-600' :
            'bg-gradient-to-r from-cricket-blue to-blue-600'
        }`}>

        {/* Ripple Effect Background */}
        {isAnimating && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full border-4 border-white/30 animate-ping"
                style={{
                  width: `${200 + i * 100}px`,
                  height: `${200 + i * 100}px`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${i * 200}ms`,
                  animationDuration: '1.5s'
                }}
              />
            ))}
          </div>
        )}

        {/* Sliding Celebration Text */}
        {isAnimating && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className={`font-black text-white text-4xl transform transition-all duration-700 ${animationType === 'four' ? 'animate-bounce translate-x-0' :
              animationType === 'six' ? 'animate-spin translate-x-0' :
                animationType === 'wicket' ? 'animate-pulse translate-x-0' : 'translate-x-full'
              }`}>
              {animationType === 'four' && '🏏 BOUNDARY FOUR!'}
              {animationType === 'six' && '⚡ MAXIMUM SIX!'}
              {animationType === 'wicket' && '💥 WICKET FALLS!'}
            </div>
          </div>
        )}

        {/* Score Content - Card Flip Style */}
        <div className={`transition-all duration-500 transform ${isAnimating ? 'rotateY-180 opacity-0' : 'rotateY-0 opacity-100'
          }`} style={{
            transform: isAnimating ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d'
          }}>

          {/* Team Name and Score - Mobile Compact */}
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="text-lg font-bold text-white">
              {battingTeam?.name}
            </div>
            <div className={`text-4xl font-black text-white transition-all duration-300 ${!isAnimating && animationType ? 'animate-pulse' : ''
              }`}>
              {currentInnings.totalRuns}/{currentInnings.totalWickets}
            </div>
          </div>

          {/* Overs and Run Rate - Mobile Compact */}
          <div className="flex justify-center items-center space-x-4 mb-2">
            <div className="text-center">
              <span className="text-lg font-semibold text-white/90">
                {Math.floor(currentInnings.totalBalls / 6)}.{currentInnings.totalBalls % 6}
              </span>
              <span className="text-sm text-white/70 ml-1">
                /{match.overs}
              </span>
            </div>

            <div className="w-1 h-1 bg-white/50 rounded-full"></div>

            <div className="text-center">
              <span className="text-lg font-semibold text-white/90">
                {currentInnings.totalBalls > 0 ? ((currentInnings.totalRuns / currentInnings.totalBalls) * 6).toFixed(2) : '0.00'}
              </span>
              <span className="text-sm text-white/70 ml-1">RR</span>
            </div>
          </div>

          {/* Target Info - Mobile Compact */}
          {currentInnings.target && (
            <div className="text-center">
              <div className="text-sm text-white/90">
                Need <span className="font-bold">{currentInnings.target - currentInnings.totalRuns}</span> from <span className="font-bold">{(match.overs * 6) - currentInnings.totalBalls}</span> balls
                <br className="block sm:hidden" />
                <span className="ml-2 text-white/80">
                  RRR: {
                    ((match.overs * 6) - currentInnings.totalBalls) > 0 ?
                      (((currentInnings.target - currentInnings.totalRuns) / (((match.overs * 6) - currentInnings.totalBalls) / 6)).toFixed(1)) :
                      '0.0'
                  }
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Players - Side by Side */}
      <div className="bg-white border-b px-3 py-2 flex-shrink-0">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Batsmen */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide flex justify-between items-center">
              <span>{isCurrentlySingleBatting ? 'Batsman' : 'Batting'}</span>
              <button
                onClick={() => setIsBatsmanModalOpen(true)}
                className="text-xs text-cricket-blue hover:underline normal-case"
              >
                Change
              </button>
            </div>
            <div className="space-y-2">
              {batsmen.map((batsman, index) => {
                const player = battingTeam?.players.find(p => p.id === batsman.playerId);
                const isJoker = match.hasJoker && player?.name === match.jokerName;
                const isOnStrike = selectedBatsmanIndex === index;
                const showStrike = !isCurrentlySingleBatting;
                const strikeRate = batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0';

                return (
                  <div
                    key={batsman.playerId}
                    className={`border-l-4 pl-3 py-2 ${isOnStrike ? 'border-cricket-blue bg-blue-50' : 'border-gray-200'
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">
                          {player?.name}
                          {showStrike && isOnStrike && <span className="ml-1 text-cricket-blue">*</span>}
                          {isJoker && <span className="ml-1">🃏</span>}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 space-x-4">
                          <span>{batsman.runs} ({batsman.balls})</span>
                          <span>SR: {strikeRate}</span>
                        </div>
                      </div>
                      {!isCurrentlySingleBatting && (
                        <button
                          onClick={() => setSelectedBatsmanIndex(index === 0 ? 1 : 0)}
                          className="text-xs text-cricket-blue hover:underline"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bowler */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide flex justify-between items-center">
              <span>Bowling</span>
              <button
                onClick={() => setIsBowlerModalOpen(true)}
                className="text-xs text-cricket-blue hover:underline normal-case"
              >
                Change
              </button>
            </div>
            <div className="border-l-4 border-green-500 pl-3 py-2 bg-green-50">
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {currentBowlerPlayer?.name}
                  {match.hasJoker && currentBowlerPlayer?.name === match.jokerName && (
                    <span className="ml-1">🃏</span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-1 space-x-4">
                  <span>
                    {currentBowler.wickets}-{currentBowler.runs}
                  </span>
                  <span>
                    {Math.floor(currentBowler.balls / 6)}.{currentBowler.balls % 6}
                  </span>
                  <span>Eco: {currentBowler.balls > 0 ? ((currentBowler.runs / currentBowler.balls) * 6).toFixed(2) : '0.00'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* This Over - Mobile Compact */}
        <div>
          <div className="mb-1">
            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">This Over</div>
          </div>
          <div className="bg-gray-50 p-2 rounded min-h-[40px] flex items-center justify-center">
            {getCurrentOver().length > 0 ? (
              <div className="flex space-x-2">
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

      {/* Status Messages for Completion */}
      {(() => {
        const isFirstInnings = currentInnings.number === 1;
        const isMatchCompleted = match.status === 'completed';

        if (isMatchCompleted) {
          return (
            <div className="bg-green-600 text-white px-4 py-6 text-center flex-shrink-0">
              <div className="text-xl font-bold mb-2">🏆 Match Completed!</div>
              <div className="text-sm">Redirecting to winner page...</div>
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
            <div className="bg-blue-600 text-white px-4 py-6 text-center flex-shrink-0">
              <div className="text-lg font-bold mb-2">{message}</div>
              <div className="text-sm">
                {isFirstInnings ? 'Moving to innings break...' : 'Moving to results...'}
              </div>
            </div>
          );
        }

        if (isOverComplete && !isMatchComplete) {
          return (
            <div className="bg-amber-500 text-white px-4 py-4 text-center flex-shrink-0">
              <div className="text-sm font-medium">Over Complete! Select new bowler</div>
            </div>
          );
        }

        return null;
      })()}

      {/* Main Scoring Area - Mobile Compact */}
      <div className="flex-1 p-3 overflow-hidden">
        <div className="h-full flex flex-col justify-between">
          {/* Run Buttons */}
          <div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[0, 1, 2, 3, 4, 6].map(runs => {
                const currentBatsman = batsmen[selectedBatsmanIndex];
                const isJoker = match.hasJoker && battingTeam?.players.find(p => p.id === currentBatsman.playerId)?.name === match.jokerName;

                return (
                  <button
                    key={runs}
                    onClick={() => handleScoreButton(runs)}
                    disabled={shouldDisableScoring}
                    className={`h-14 rounded-lg font-bold text-lg transition-all ${runs === 4 || runs === 6
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50'
                      } ${shouldDisableScoring ? 'opacity-50 cursor-not-allowed' : ''} ${isJoker ? 'ring-2 ring-yellow-400' : ''
                      }`}
                  >
                    {runs}
                  </button>
                );
              })}
            </div>

            {/* Extras */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => setIsWideModalOpen(true)}
                disabled={shouldDisableScoring}
                className="py-3 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Wd
              </button>
              <button
                onClick={() => setIsNoBallModalOpen(true)}
                disabled={shouldDisableScoring}
                className="py-3 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Nb
              </button>
              <button
                onClick={() => handleExtra('bye')}
                disabled={shouldDisableScoring}
                className="py-3 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Bye
              </button>
              <button
                onClick={() => handleExtra('legbye')}
                disabled={shouldDisableScoring}
                className="py-3 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Lb
              </button>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="space-y-3">
            {/* Wicket Button */}
            <button
              onClick={handleWicket}
              disabled={shouldDisableScoring}
              className={`w-full py-3 text-lg font-bold rounded-lg transition-all ${shouldDisableScoring
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600'
                }`}
            >
              🏏 WICKET
            </button>

            {/* Over/Match Complete Messages */}
            {isMatchComplete && (
              <div className="text-center py-3 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                🏆 Match Complete! All {match.overs} overs bowled.
              </div>
            )}
            {isOverComplete && !isMatchComplete && (
              <div className="text-center py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                Over Complete!
                <button
                  onClick={() => setIsBowlerModalOpen(true)}
                  className="ml-2 underline font-semibold"
                >
                  Change Bowler
                </button>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => useMatchStore.getState().undoLastBall()}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                ↶ Undo
              </button>
              <button
                onClick={() => setIsBowlerModalOpen(true)}
                className="py-3 text-sm font-medium bg-cricket-blue text-white rounded-lg hover:bg-blue-700"
              >
                🔄 Bowler
              </button>
            </div>
          </div>
        </div>
      </div>

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
                  className="py-3 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsWicketModalOpen(false)}
              className="w-full py-3 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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
              {getAllBowlersWithStatus().map(({ player, status, isDisabled }) => {
                const isJoker = match.hasJoker && player.name === match.jokerName;
                return (
                  <button
                    key={player.id}
                    onClick={() => !isDisabled && handleBowlerChange(player.id)}
                    disabled={isDisabled}
                    className={`w-full p-3 text-left rounded-lg transition-colors ${isDisabled
                      ? 'bg-gray-200 cursor-not-allowed opacity-60'
                      : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {player.name}
                        {isJoker && <span className="ml-2">🃏</span>}
                      </div>
                      {status && (
                        <span className="text-xs text-gray-500 italic">{status}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setIsBowlerModalOpen(false)}
              className="w-full py-3 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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
                    className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-medium">
                      {player.name}
                      {isJoker && <span className="ml-2">🃏</span>}
                    </div>
                  </button>
                );
              })}
              {match.hasJoker && match.jokerName && !battingTeam?.players.some(p => p.name === match.jokerName) && (
                <button
                  onClick={() => handleBatsmanChange('joker')}
                  className="w-full p-3 text-left bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors border-2 border-yellow-200"
                >
                  <div className="font-medium text-yellow-800">
                    🃏 {match.jokerName} (Joker)
                  </div>
                </button>
              )}
            </div>
            <button
              onClick={() => setIsBatsmanModalOpen(false)}
              className="w-full py-3 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Wide Extra Modal */}
      {isWideModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-center">Wide + Extra Runs</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[0, 1, 2, 3, 4, 5, 6].map(runs => (
                <button
                  key={runs}
                  onClick={() => {
                    handleExtra('wide', runs); // Penalty handled in handleExtra
                    setIsWideModalOpen(false);
                  }}
                  className="py-4 text-lg font-bold bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors"
                >
                  Wd+{runs}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsWideModalOpen(false)}
              className="w-full py-3 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* No Ball Extra Modal */}
      {isNoBallModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-center">No Ball + Runs Scored</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[0, 1, 2, 3, 4, 5, 6].map(runs => (
                <button
                  key={runs}
                  onClick={() => {
                    handleExtra('noball', runs); // Penalty handled in handleExtra
                    setIsNoBallModalOpen(false);
                  }}
                  className="py-4 text-lg font-bold bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
                >
                  Nb+{runs}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsNoBallModalOpen(false)}
              className="w-full py-3 text-sm font-medium bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Last Man Standing Modal */}
      {isLastManModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">⚠️</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Last Man Standing!</h3>
              <p className="text-gray-600 text-sm">
                Only one batsman remains. How would you like to continue?
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => {
                  switchToSingleBatting(lastManBatsmanId);
                  setIsLastManModalOpen(false);
                }}
                className="w-full py-4 px-6 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
              >
                <div className="text-center">
                  <div className="text-lg">🏏 Continue Batting Alone</div>
                  <div className="text-sm text-green-100">Last batsman continues scoring</div>
                </div>
              </button>

              <button
                onClick={() => {
                  endInningsEarly();
                  setIsLastManModalOpen(false);
                }}
                className="w-full py-4 px-6 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                <div className="text-center">
                  <div className="text-lg">🚫 End Innings</div>
                  <div className="text-sm text-red-100">All out - innings complete</div>
                </div>
              </button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Choose wisely - this decision cannot be undone!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScoringPage; 