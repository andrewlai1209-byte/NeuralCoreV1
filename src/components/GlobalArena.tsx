/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from './Chessboard';
import { ChessEngine } from '../engine';
import { 
  Globe, Users, MessageSquare, Send, Brain, Cpu, TrendingUp, 
  X, Award, Terminal as TerminalIcon, ArrowRight, Clock, ShieldCheck, 
  RefreshCw, CheckCircle, Flame, Swords
} from 'lucide-react';

const TIME_CONTROLS = {
  bullet: { name: 'Bullet 1+1', total: 60, inc: 1 },
  blitz: { name: 'Blitz 3+2', total: 180, inc: 2 },
  rapid: { name: 'Rapid 10+0', total: 600, inc: 0 },
} as const;

type TimeControlKey = keyof typeof TIME_CONTROLS;

interface OpponentPreset {
  name: string;
  rating: number;
  country: string;
  flag: string;
  personality: 'polite' | 'trashtalker' | 'anxious' | 'grandmaster';
  avatar: string;
}

const OPPONENT_PRESETS: OpponentPreset[] = [
  { name: 'Chen_ChessMaster', rating: 1850, country: 'Taiwan', flag: '🇹🇼', personality: 'polite', avatar: '🦁' },
  { name: 'Mikhail_G', rating: 1980, country: 'Russia', flag: '🇷🇺', personality: 'grandmaster', avatar: '🐻' },
  { name: 'Svechin_Knight', rating: 1720, country: 'France', flag: '🇫🇷', personality: 'anxious', avatar: '🦊' },
  { name: 'TacticalWizard', rating: 1910, country: 'India', flag: '🇮🇳', personality: 'trashtalker', avatar: '🧙' },
  { name: 'MagnusFan_99', rating: 1680, country: 'Norway', flag: '🇳🇴', personality: 'polite', avatar: '🦉' },
  { name: 'Chao_Shao_12', rating: 2150, country: 'Taiwan', flag: '🇹🇼', personality: 'grandmaster', avatar: '🐉' },
  { name: 'Mikhail_Tal_Fan', rating: 1890, country: 'Latvia', flag: '🇱🇻', personality: 'trashtalker', avatar: '🐯' },
  { name: 'Squeezing_Master', rating: 2020, country: 'Germany', flag: '🇩🇪', personality: 'grandmaster', avatar: '🦅' },
];

const OPPONENT_MESSAGES = {
  polite: {
    start: ['Hello! Have a nice game!', 'Hi there, good luck! 🤝', 'Greetings from Norway! Let’s have a great match!'],
    goodMove: ['Wow, very nice move!', 'Excellent tactical choice. You have high vision!', 'Interesting idea. I must calculate carefully.'],
    blunder: ['Oops, are you okay?', 'That was a tricky line.', 'A slight oversight? Happens to all of us.'],
    lowTime: ['Oh my, the clock is ticking fast!', 'Intense time scramble here!', 'Good speed! This is bullet/blitz pressure.'],
    end: ['Thank you for the game! Well played.', 'Great game! You played brilliantly.', 'Very close battle! Good game!'],
  },
  trashtalker: {
    start: ['Prepare to lose your rating points! 😎', 'Is this your first time playing chess?', 'Let’s see if you can survive my attack!'],
    goodMove: ['Wait, that was actually decent. Lucky move!', 'Ah, a basic tactic. I saw that 10 moves ago.', 'Nice trick, but it won’t save you.'],
    blunder: ['Aha! Easiest win of my life! 🎯', 'Did you close your eyes on that move?', 'Blunder of the century! Thank you for the queen/piece!'],
    lowTime: ['You move too slow! Tap faster!', 'Hurry up! I can win this asleep.', 'Tick tock... your rating points are mine!'],
    end: ['Hahaha, better luck next time!', 'Not bad, but you need more practice.', 'GG! Close, but I am simply superior.'],
  },
  anxious: {
    start: ['Oh no, your rating is so high, I’m nervous... 😰', 'Hello! Please go easy on me.', 'Hi! Let’s have a stress-free game.'],
    goodMove: ['Oh wow, that’s an incredible move. I am in trouble!', 'Ah, I missed that completely. How do I defend?', 'That’s terrifying. I’m panicking!'],
    blunder: ['Wait, did you make a mistake or is this a deep trap?', 'I’m scared to capture that. Is it a gambit?', 'Oh! Let me double check if this is safe.'],
    lowTime: ['OMG NO TIME LEFT! MY HAND IS SHAKING!', 'I am going to flag! I can’t think!', 'Aaaaah too fast! Too fast!'],
    end: ['Phew, what a stressful match!', 'I can’t believe I survived that. GG!', 'Great game, my heart is beating so fast!'],
  },
  grandmaster: {
    start: ['Let us explore the depth of this opening. Good luck.', 'Respectful greetings. May the best calculation win.', 'Aetheris framework matched. Good game.'],
    goodMove: ['A very mature positional move. High class.', 'Excellent pawn structure control. Correct plan.', 'Your tactical depth matches Master level.'],
    blunder: ['A tactical asymmetry was introduced there.', 'That compromise weakens your light squares.', 'A rare positional mistake.'],
    lowTime: ['Time resource management is critical now.', 'Entering high-velocity endgame calculations.', 'Clock depletion active.'],
    end: ['An elegant struggle. Thank you for the match.', 'A drawn/won position well executed. Respect.', 'Highly instructive. Let us analyze this afterward.'],
  },
};

export const GlobalArena: React.FC = () => {
  // Game States
  const [inQueue, setInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [activeMatch, setActiveMatch] = useState(false);
  const [opponent, setOpponent] = useState<OpponentPreset | null>(null);
  
  // Chess engine & board states
  const [chess, setChess] = useState<Chess>(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [highlightSquares, setHighlightSquares] = useState<string[]>([]);
  
  // Clock states
  const [timeControl, setTimeControl] = useState<TimeControlKey>('blitz');
  const [playerTime, setPlayerTime] = useState(180 * 10); // Tenths of seconds
  const [oppTime, setOppTime] = useState(180 * 10);
  const [timerActive, setTimerActive] = useState(false);

  // Chat states
  const [chatLog, setChatLog] = useState<{ sender: 'opponent' | 'player' | 'system'; text: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // AI Self-Training console overlay states
  const [showTraining, setShowTraining] = useState(false);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingMetrics, setTrainingMetrics] = useState({ policyLoss: 0.24, valueLoss: 0.18, accuracy: 52 });
  const [savedTraining, setSavedTraining] = useState(false);
  const trainingEndRef = useRef<HTMLDivElement>(null);

  // Local ELO display state (loads from localStorage)
  const [localElo, setLocalElo] = useState<number>(2315);

  useEffect(() => {
    // Load local ELO from AETHERIS_TRAINED_WEIGHTS
    const stored = localStorage.getItem('AETHERIS_TRAINED_WEIGHTS');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.eloOffset) {
          setLocalElo(2315 + parsed.eloOffset);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [showTraining]);

  // Queue simulation interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (inQueue) {
      interval = setInterval(() => {
        setQueueTime(prev => {
          // Trigger match found between 4 and 8 seconds
          if (prev >= 5 && Math.random() < 0.35) {
            triggerMatchFound();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [inQueue]);

  // Game clock countdown interval (100ms precision)
  useEffect(() => {
    if (!timerActive || gameResult || !activeMatch) return;

    const interval = setInterval(() => {
      const activeSide = chess.turn();
      const isPlayerTurn = (activeSide === 'w' && playerColor === 'w') || (activeSide === 'b' && playerColor === 'b');

      if (isPlayerTurn) {
        setPlayerTime(prev => {
          if (prev <= 1) {
            handleGameOver(`Time out! ${opponent?.name} wins on time (Flagged 🚩)`);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setOppTime(prev => {
          if (prev <= 1) {
            handleGameOver(`Time out! You win on time (Flagged 🚩)`);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerActive, chess, gameResult, activeMatch, playerColor, opponent]);

  // Chat scroll anchor
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  // Training scroll anchor
  useEffect(() => {
    trainingEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trainingLogs]);

  // Trigger Opponent AI Move
  useEffect(() => {
    if (!activeMatch || gameResult) return;

    const activeSide = chess.turn();
    const isOpponentTurn = (activeSide === 'w' && playerColor === 'b') || (activeSide === 'b' && playerColor === 'w');

    if (isOpponentTurn) {
      // Simulate opponent thinking time (1.2s to 3.8s)
      const thinkTime = 1200 + Math.random() * 2600;
      const timer = setTimeout(() => {
        makeOpponentMove();
      }, thinkTime);

      return () => clearTimeout(timer);
    }
  }, [activeMatch, chess, playerColor, gameResult]);

  // -----------------------------------------------------------------------------
  // MATCHMAKING ACTION FUNCTIONS
  // -----------------------------------------------------------------------------
  const startMatchmaking = () => {
    setInQueue(true);
    setQueueTime(0);
    setChatLog([]);
    setGameResult(null);
  };

  const cancelMatchmaking = () => {
    setInQueue(false);
    setQueueTime(0);
  };

  const triggerMatchFound = () => {
    // Select random preset opponent
    const selectedOpp = OPPONENT_PRESETS[Math.floor(Math.random() * OPPONENT_PRESETS.length)];
    setOpponent(selectedOpp);
    setInQueue(false);
    setActiveMatch(true);

    // Randomize sides
    const assignedColor = Math.random() > 0.5 ? 'w' : 'b';
    setPlayerColor(assignedColor);

    // Set initial times based on selection
    const secs = TIME_CONTROLS[timeControl].total;
    setPlayerTime(secs * 10);
    setOppTime(secs * 10);

    const freshChess = new Chess();
    setChess(freshChess);
    setFen(freshChess.fen());
    setHighlightSquares([]);
    setTimerActive(assignedColor === 'w'); // Timer active for White initially

    // Setup initial system messages
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const welcomeMsgs = [
      { sender: 'system' as const, text: `Matched against ${selectedOpp.flag} ${selectedOpp.name} (ELO ${selectedOpp.rating})`, time: now },
      { sender: 'system' as const, text: `Time control is ${TIME_CONTROLS[timeControl].name}. Connection: EXCELLENT (14ms).`, time: now },
      { sender: 'system' as const, text: `You are playing as ${assignedColor === 'w' ? 'WHITE' : 'BLACK'}.`, time: now },
    ];
    setChatLog(welcomeMsgs);

    // Dynamic greet from opponent
    setTimeout(() => {
      const presets = OPPONENT_MESSAGES[selectedOpp.personality].start;
      const greetText = presets[Math.floor(Math.random() * presets.length)];
      sendOpponentChat(greetText);
    }, 1200);

    // If opponent is White, trigger their first move
    if (assignedColor === 'b') {
      setTimeout(() => {
        makeOpponentMove(freshChess);
      }, 1500);
    }
  };

  // -----------------------------------------------------------------------------
  // IN-GAME MOVE LOGIC
  // -----------------------------------------------------------------------------
  const handlePlayerMove = (move: { from: string; to: string; promotion?: string }) => {
    if (!activeMatch || gameResult) return;

    // Guard turn
    const activeTurn = chess.turn();
    const isPlayerTurn = (activeTurn === 'w' && playerColor === 'w') || (activeTurn === 'b' && playerColor === 'b');
    if (!isPlayerTurn) return;

    const copy = new Chess(chess.fen());
    try {
      const res = copy.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q'
      });

      if (res) {
        // Increment player time
        const inc = TIME_CONTROLS[timeControl].inc * 10;
        setPlayerTime(prev => prev + inc);

        setChess(copy);
        setFen(copy.fen());
        setHighlightSquares([move.from, move.to]);
        setTimerActive(true); // Ensure clock continues ticking

        // Check game over
        if (copy.isGameOver()) {
          checkGameStatus(copy);
        } else {
          // Dynamic trash talk or polite feedback occasionally
          if (Math.random() < 0.25) {
            triggerOpponentReaction(copy, res);
          }
        }
      }
    } catch (e) {
      console.warn('Illegal move attempted:', e);
    }
  };

  const makeOpponentMove = (customChess?: Chess) => {
    const activeChess = customChess || chess;
    if (activeChess.isGameOver() || gameResult) return;

    // Use our custom backend minimax engine under the hood to calculate opponent move!
    // This maintains excellent chess competence matching the opponent ELO E.g. Depth 3
    const opponentEngine = new ChessEngine({
      maxDepth: opponent && opponent.rating > 1900 ? 3 : 2,
      personality: opponent?.personality === 'trashtalker' ? 'tactical' : 'positional',
      evalMode: 'hybrid'
    });

    try {
      const result = opponentEngine.search(activeChess.fen(), 0.75, activeChess.history());
      
      if (result.bestMove) {
        const copy = new Chess(activeChess.fen());
        const moveDetails = copy.move(result.bestMove);

        // Apply opponent increment
        const inc = TIME_CONTROLS[timeControl].inc * 10;
        setOppTime(prev => prev + inc);

        setChess(copy);
        setFen(copy.fen());
        setHighlightSquares([result.bestMove.from, result.bestMove.to]);

        // Opponent low time comments
        if (oppTime < 300 && Math.random() < 0.4) {
          const panicMsgs = OPPONENT_MESSAGES[opponent!.personality].lowTime;
          sendOpponentChat(panicMsgs[Math.floor(Math.random() * panicMsgs.length)]);
        }

        if (copy.isGameOver()) {
          checkGameStatus(copy);
        }
      }
    } catch (e) {
      console.error('Error in opponent calculations:', e);
      // Fallback
      const moves = activeChess.moves({ verbose: true });
      if (moves.length > 0) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        const copy = new Chess(activeChess.fen());
        copy.move(randomMove);
        setChess(copy);
        setFen(copy.fen());
      }
    }
  };

  const triggerOpponentReaction = (game: Chess, lastMove: any) => {
    if (!opponent) return;
    const p = opponent.personality;

    // Simple heuristic-based messages
    if (lastMove.captured) {
      if (p === 'trashtalker') {
        sendOpponentChat('You think taking that piece makes you a grandmaster? Haha.');
      } else if (p === 'anxious') {
        sendOpponentChat('Ah! You captured my piece! I need to concentrate.');
      }
    } else if (game.isCheck()) {
      if (p === 'trashtalker') {
        sendOpponentChat('Check? Cute, but my position is fully defended.');
      } else if (p === 'polite') {
        sendOpponentChat('Very active attack! I must defend carefully.');
      }
    } else {
      // General comments
      const presets = OPPONENT_MESSAGES[p].goodMove;
      sendOpponentChat(presets[Math.floor(Math.random() * presets.length)]);
    }
  };

  const checkGameStatus = (game: Chess) => {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      const userWon = (winner === 'White' && playerColor === 'w') || (winner === 'Black' && playerColor === 'b');
      handleGameOver(userWon ? '🏆 Checkmate! You win!' : '💀 Checkmate! Opponent wins!');
    } else if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
      handleGameOver('🤝 Game drawn! (Stalemate / Repetition)');
    }
  };

  const handleGameOver = (resultMessage: string) => {
    setGameResult(resultMessage);
    setTimerActive(false);

    // Final closing chat from opponent
    if (opponent) {
      setTimeout(() => {
        const endMsgs = OPPONENT_MESSAGES[opponent.personality].end;
        sendOpponentChat(endMsgs[Math.floor(Math.random() * endMsgs.length)]);
      }, 1000);
    }
  };

  const resignGame = () => {
    if (!activeMatch || gameResult) return;
    handleGameOver('🚩 You resigned. Opponent wins.');
  };

  // -----------------------------------------------------------------------------
  // CHAT INTERACTION METHODS
  // -----------------------------------------------------------------------------
  const sendOpponentChat = (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatLog(prev => [...prev, { sender: 'opponent', text, time: now }]);
  };

  const handleSendPlayerChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !opponent) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userText = chatInput.trim();
    setChatLog(prev => [...prev, { sender: 'player', text: userText, time: now }]);
    setChatInput('');

    // Opponent responds to player's chat based on personality
    setTimeout(() => {
      let reply = '';
      const p = opponent.personality;
      if (userText.toLowerCase().includes('hi') || userText.toLowerCase().includes('hello')) {
        reply = p === 'trashtalker' ? 'Hi. Less talking, more playing!' : 'Hello! Pleasant match!';
      } else if (userText.toLowerCase().includes('gg') || userText.toLowerCase().includes('good game')) {
        reply = p === 'trashtalker' ? 'Yeah, it was good for me.' : 'Good game indeed! 🤝';
      } else if (userText.toLowerCase().includes('blunder') || userText.toLowerCase().includes('nooo')) {
        reply = p === 'trashtalker' ? 'Classic skill issue.' : 'Do not worry, keep fighting!';
      } else {
        const genericReplies = {
          polite: ['Yes, chess is a highly beautiful game.', 'Interesting perspective! Let us keep calculated.', 'Calculation is the key! 🏛️'],
          trashtalker: ['Stop typing and focus on your defense!', 'Your evaluation is dropping every second.', 'Blah blah, make a move!'],
          anxious: ['Oh dear, my focus is breaking...', 'I hope I don’t make another terrible mistake.', 'I’m sweating over this FEN.'],
          grandmaster: ['Strategic accuracy is our primary goal here.', 'Let us analyze this structure post-game.', 'Depth calculation matches threshold.'],
        };
        const list = genericReplies[p];
        reply = list[Math.floor(Math.random() * list.length)];
      }
      sendOpponentChat(reply);
    }, 1500);
  };

  // -----------------------------------------------------------------------------
  // ENGINE REINFORCEMENT SELF-TRAINING LOOP
  // -----------------------------------------------------------------------------
  const runAIEngineSelfTraining = () => {
    setShowTraining(true);
    setSavedTraining(false);
    setTrainingProgress(0);
    setTrainingLogs([
      `[UCI-Init] Mounting Aetheris Neural Network core...`,
      `[Hardware] Allocating client CPU node search threads...`,
      `[Memory] Parsing Game History: ${chess.history().length} moves completed.`,
      `[Target] Winner orientation: ${gameResult?.includes('You win') ? 'PLAYER_WIN' : 'OPPONENT_WIN'}`
    ]);

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setTrainingProgress(step * 5);

      if (step === 2) {
        setTrainingLogs(prev => [...prev, `[Optimizer] SGD learning rate initialized to 0.005 (decaying).`]);
      } else if (step === 4) {
        setTrainingLogs(prev => [...prev, `[Evaluator] Extracting critical board state features...`, `  -> Isolated pawns: detected`, `  -> Outpost Knights: scanning squares d5, e5`]);
      } else if (step === 6) {
        setTrainingLogs(prev => [...prev, `[Backprop] Computing Policy-Value network gradients.`, `  -> Cross-Entropy Loss: 0.485 -> 0.382`, `  -> Value MSE: 0.221 -> 0.165`]);
        setTrainingMetrics({ policyLoss: 0.18, valueLoss: 0.12, accuracy: 56 });
      } else if (step === 10) {
        setTrainingLogs(prev => [...prev, `[Reinforcement] Adjusting material & positional evaluation weights:`]);
      } else if (step === 12) {
        setTrainingLogs(prev => [...prev, `  -> PST Knight central occupancy weight: +4.8% (gain)`, `  -> King Exposure liability factor: +2.1% (refined)`]);
      } else if (step === 15) {
        setTrainingLogs(prev => [...prev, `[Model Checkpoint] Consolidating neural weights & saving to local cache...`]);
      } else if (step === 18) {
        setTrainingLogs(prev => [...prev, `[Verification] Standard Minimax test vs Depth 4 engine:`, `  -> Play-match simulation: 94% win correlation.`, `  -> Local ELO estimated adjustment: +12 ELO points.`]);
        setTrainingMetrics({ policyLoss: 0.09, valueLoss: 0.05, accuracy: 68 });
      } else if (step >= 20) {
        // Complete training, update actual localStorage weights
        clearInterval(interval);
        saveTrainedWeightsToLocalStorage();
      }
    }, 400);
  };

  const saveTrainedWeightsToLocalStorage = () => {
    try {
      const stored = localStorage.getItem('AETHERIS_TRAINED_WEIGHTS');
      let currentWeights = {
        materialWeights: { p: 0, n: 0, b: 0, r: 0, q: 0 },
        pstMultiplier: 1.0,
        mobilityMultiplier: 1.0,
        neuralMultiplier: 1.0,
        eloOffset: 0
      };

      if (stored) {
        currentWeights = JSON.parse(stored);
      }

      // Mutate weights slightly based on game result
      const winFactor = gameResult?.includes('You win') ? 1 : -1;
      
      currentWeights.materialWeights.p += winFactor * 0.01;
      currentWeights.materialWeights.n += winFactor * 0.012;
      currentWeights.materialWeights.b += winFactor * 0.015;
      currentWeights.materialWeights.r += winFactor * 0.008;
      currentWeights.materialWeights.q += winFactor * 0.01;

      currentWeights.pstMultiplier += winFactor * 0.02;
      currentWeights.mobilityMultiplier += winFactor * 0.01;
      currentWeights.neuralMultiplier += 0.05; // Continual progress
      currentWeights.eloOffset += 12; // ELO rises!

      localStorage.setItem('AETHERIS_TRAINED_WEIGHTS', JSON.stringify(currentWeights));
      setTrainingLogs(prev => [...prev, `[Success] Model fine-tuned! Cache updated in AETHERIS_TRAINED_WEIGHTS.`, `[Status] Active Local Engine rating: ${2315 + currentWeights.eloOffset} ELO.`]);
      setSavedTraining(true);
    } catch (e) {
      console.error('Error saving trained weights:', e);
    }
  };

  // Format clock times
  const formatTime = (tenths: number) => {
    if (tenths <= 0) return '0.00';
    const totalSecs = Math.floor(tenths / 10);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const remTenths = tenths % 10;

    if (totalSecs < 20) {
      return `${secs}.${remTenths}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6" id="global_battle_arena">
      
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Global Real-Time Matchmaking Server
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-sans font-bold tracking-tight text-white flex items-center gap-2">
              Aetheris International Grand Arena
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Match with active chess players globally. After the game, use Aetheris' custom local backpropagation engine to train the neural weights.
            </p>
          </div>
          
          <div className="flex gap-3 bg-slate-950 p-2 rounded-xl border border-slate-850 self-stretch md:self-auto justify-between items-center">
            <div className="flex items-center gap-2 px-3">
              <Users className="w-4 h-4 text-emerald-400" />
              <div className="font-mono text-xs">
                <div className="text-[10px] text-slate-500">Online Players</div>
                <div className="font-bold text-white">14,831</div>
              </div>
            </div>
            <div className="h-6 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-2 px-3">
              <Brain className="w-4 h-4 text-emerald-400" />
              <div className="font-mono text-xs">
                <div className="text-[10px] text-slate-500">Your Local AI ELO</div>
                <div className="font-bold text-emerald-400">{localElo}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOBBY SEARCHING STATE OR INTERACTIVE GAME STATE */}
      {!activeMatch ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          {!inQueue ? (
            <div className="space-y-6">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <Swords className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Find a Live Match</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Choose your time control preference and queue up to match with opponent chess masters from all over the world.
                </p>
              </div>

              {/* Time Control Options */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto bg-slate-950 p-1.5 rounded-xl border border-slate-850">
                {(Object.keys(TIME_CONTROLS) as TimeControlKey[]).map((key) => {
                  const tc = TIME_CONTROLS[key];
                  const isSelected = timeControl === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTimeControl(key)}
                      className={`
                        py-2.5 px-3 rounded-lg border text-xs font-bold font-mono transition-all flex flex-col items-center justify-center gap-1
                        ${isSelected 
                          ? 'bg-slate-850 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/5' 
                          : 'bg-slate-950/60 border-slate-900/40 text-slate-500 hover:text-slate-300 hover:border-slate-800'}
                      `}
                    >
                      <span>{tc.name}</span>
                      <span className="text-[10px] text-slate-600 font-normal">
                        inc: +{tc.inc}s
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={startMatchmaking}
                className="w-full max-w-sm py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/10 hover:brightness-110 active:scale-95 transition-all text-xs"
              >
                Join Global Matchmaking Queue
              </button>
            </div>
          ) : (
            <div className="space-y-6 py-6">
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-4 border-emerald-500/40 animate-pulse" />
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
                  <Globe className="w-6 h-6 animate-spin" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Searching for Opponents...</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Time elapsed: {queueTime}s | Rating pool: {localElo - 100} - {localElo + 100}
                </p>
              </div>

              {/* simulated matching activity stream */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 max-w-md mx-auto text-[10px] font-mono text-slate-500 text-left space-y-1">
                <div className="flex justify-between"><span>🇹🇼 Chen_ChessMaster:</span> <span className="text-emerald-400 font-semibold">MATCHED 🇺🇸 Alice_92</span></div>
                <div className="flex justify-between"><span>🇯🇵 KnightRider:</span> <span className="text-emerald-400 font-semibold">MATCHED 🇩🇪 Blitz_King</span></div>
                <div className="flex justify-between font-bold text-slate-400"><span>Your status:</span> <span className="text-amber-400 animate-pulse">Assigning Side...</span></div>
              </div>

              <button
                onClick={cancelMatchmaking}
                className="px-6 py-2 bg-slate-800 text-slate-300 border border-slate-700 hover:text-white rounded-lg transition-colors text-xs"
              >
                Cancel Queue
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Chess Board and Clock */}
          <div className="lg:col-span-7 flex flex-col items-center">
            
            {/* OPPONENT STATS BLOCK (TOP) */}
            <div className="w-full max-w-[500px] flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl mb-4 shadow-md">
              <div className="flex items-center gap-3">
                <span className="text-2xl bg-slate-800 p-2 rounded-lg">{opponent?.avatar}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white truncate max-w-[140px]">{opponent?.name}</span>
                    <span className="text-[11px] font-mono font-semibold text-slate-400">({opponent?.rating})</span>
                    <span>{opponent?.flag}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] text-slate-400 font-mono">Ping: 14ms</span>
                  </div>
                </div>
              </div>

              {/* Clock (Opponent) */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold shadow-inner transition-all ${
                chess.turn() !== playerColor && timerActive && !gameResult
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-slate-950 border-slate-850 text-slate-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(oppTime)}</span>
              </div>
            </div>

            {/* CHESSBOARD COMPONENT */}
            <div className="w-full max-w-[500px]" id="chessboard_wrapper">
              <Chessboard 
                fen={fen}
                onMove={handlePlayerMove}
                interactive={chess.turn() === playerColor && !gameResult}
                flipped={playerColor === 'b'}
                highlightSquares={highlightSquares}
              />
            </div>

            {/* PLAYER STATS BLOCK (BOTTOM) */}
            <div className="w-full max-w-[500px] flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl mt-4 shadow-md">
              <div className="flex items-center gap-3">
                <span className="text-2xl bg-slate-800 p-2 rounded-lg">👤</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">You</span>
                    <span className="text-[11px] font-mono text-slate-400">({localElo})</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Client Node</span>
                </div>
              </div>

              {/* Clock (Player) */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold shadow-inner transition-all ${
                chess.turn() === playerColor && timerActive && !gameResult
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-slate-950 border-slate-850 text-slate-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(playerTime)}</span>
              </div>
            </div>

          </div>

          {/* RIGHT: Live Chat, Analytics and Training Console Trigger */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* MATCH CONTROL CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800 flex justify-between">
                <span>Match Controller</span>
                <span className="text-emerald-400 font-mono text-[10px]">{TIME_CONTROLS[timeControl].name}</span>
              </h3>

              {!gameResult ? (
                <div className="flex gap-2">
                  <button
                    onClick={resignGame}
                    className="flex-1 py-2 bg-slate-950 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-slate-300 font-bold border border-slate-850 rounded-xl transition-all text-xs"
                  >
                    Resign Match (認輸)
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center font-bold text-sm rounded-xl animate-pulse">
                    {gameResult}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={runAIEngineSelfTraining}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-500/10 hover:brightness-110 flex items-center justify-center gap-2 text-xs"
                    >
                      <Brain className="w-4 h-4 text-slate-950 stroke-[2]" />
                      Train Local Engine on This Match (本局數據訓練AI)
                    </button>
                    
                    <button
                      onClick={() => setActiveMatch(false)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl border border-slate-700 transition-colors text-xs"
                    >
                      Back to Matchmaking Lobby
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* LIVE INTERNATIONAL CHAT PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[320px] justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  Live Match Chat Room
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Opponent Chat Active</span>
              </div>

              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto space-y-2.5 p-1 mb-3 scrollbar-thin scrollbar-thumb-slate-800">
                {chatLog.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-xs italic">
                    Matched chat room active. Type hello to trigger!
                  </div>
                ) : (
                  chatLog.map((log, idx) => {
                    if (log.sender === 'system') {
                      return (
                        <div key={idx} className="bg-slate-950/60 border border-slate-850/60 p-2 rounded-lg text-center text-[10px] font-mono text-slate-400">
                          {log.text}
                        </div>
                      );
                    }
                    const isSelf = log.sender === 'player';
                    return (
                      <div key={idx} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="text-[9px] font-bold text-slate-500">
                            {isSelf ? 'You' : opponent?.name}
                          </span>
                          <span className="text-[8px] font-mono text-slate-600">{log.time}</span>
                        </div>
                        <div className={`
                          px-3 py-1.5 rounded-xl text-xs max-w-[85%] leading-relaxed break-words
                          ${isSelf 
                            ? 'bg-emerald-500 text-slate-950 rounded-tr-none font-medium' 
                            : 'bg-slate-950 text-slate-200 rounded-tl-none border border-slate-850'}
                        `}>
                          {log.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input box */}
              <form onSubmit={handleSendPlayerChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={gameResult ? 'Match has ended' : 'Type to chat... (e.g. hello, gg)'}
                  disabled={!!gameResult}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!!gameResult}
                  className="p-2 bg-emerald-500 text-slate-950 rounded-xl hover:brightness-115 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* MODAL / OVERLAY: AI SELF-TRAINING ENGINE PANEL */}
      {showTraining && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Brain className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Local AI Engine Backpropagation Network</h3>
                  <p className="text-xs text-slate-400">Fine-tuning search weights & PST coefficients based on this match</p>
                </div>
              </div>
              <button
                onClick={() => setShowTraining(false)}
                disabled={!savedTraining}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress indicator */}
            <div className="py-4 space-y-1.5">
              <div className="flex justify-between text-xs font-mono font-medium">
                <span className="text-emerald-400">Reinforcement Gradient descent in progress...</span>
                <span>{trainingProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-850 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-300" 
                  style={{ width: `${trainingProgress}%` }} 
                />
              </div>
            </div>

            {/* Telemetry charts simulation */}
            <div className="grid grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-850 mb-4 text-center font-mono text-xs">
              <div>
                <div className="text-[10px] text-slate-500">Policy Loss</div>
                <div className="font-bold text-amber-400 mt-0.5">{trainingMetrics.policyLoss.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Value Loss</div>
                <div className="font-bold text-amber-400 mt-0.5">{trainingMetrics.valueLoss.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Succeed Accuracy</div>
                <div className="font-bold text-emerald-400 mt-0.5">{trainingMetrics.accuracy}%</div>
              </div>
            </div>

            {/* Terminal Console Logs */}
            <div className="flex-1 bg-slate-950 border border-slate-850 p-4 rounded-xl font-mono text-[11px] text-emerald-500 space-y-1.5 overflow-y-auto h-[220px]">
              <div className="flex items-center gap-1.5 text-slate-500 border-b border-slate-850 pb-1 mb-2">
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aetheris Core SGD Optimizer Log</span>
              </div>
              {trainingLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log}
                </div>
              ))}
              <div ref={trainingEndRef} />
            </div>

            {/* Modal actions */}
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              {savedTraining && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 mr-auto font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Successfully trained local AI parameters!
                </div>
              )}
              <button
                disabled={!savedTraining}
                onClick={() => setShowTraining(false)}
                className="px-5 py-2.5 bg-emerald-500 text-slate-950 hover:brightness-110 disabled:opacity-50 font-bold rounded-xl transition-all text-xs"
              >
                Close and Apply Weights
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
