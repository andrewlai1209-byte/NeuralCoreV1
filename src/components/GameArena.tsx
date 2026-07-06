/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from './Chessboard';
import { ChessEngine, PERSONALITIES } from '../engine';
import { EngineConfig, EnginePersonalityId } from '../types';
import { RotateCcw, ArrowLeftRight, HelpCircle, User, Cpu, AlertTriangle, Play, RefreshCw, Volume2, Shield, Clock, BookOpen, Timer, Brain, Zap, Scale, Sliders, Settings2, CheckCircle2, Download, Award, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Undo2 } from 'lucide-react';
import { findBookMove } from '../openingBook';
import { saveGame } from '../lib/storage';
import { motion, AnimatePresence } from 'motion/react';

const TIME_CONTROLS = {
  bullet: { name: 'Bullet 1+1', total: 60, inc: 1 },
  blitz: { name: 'Blitz (3+2)', total: 180, inc: 2 },
  rapid: { name: 'Rapid (15+10)', total: 900, inc: 10 },
  classic: { name: 'Classical (90+30)', total: 5400, inc: 30 },
} as const;

type TimeControlKey = keyof typeof TIME_CONTROLS;

export const SPEED_IQ_PROFILES = {
  turbo: {
    id: 'turbo',
    name: 'Turbo Speed (超速)',
    desc: 'Ultra-fast bullet thinking',
    maxDepth: 3,
    timeLimitMs: 400,
    quiescenceLimit: 2,
    maxCapturesToCheck: 4,
    color: 'border-amber-500 text-amber-400 hover:bg-amber-500/5',
    activeColor: 'bg-amber-500/10 border-amber-500 text-amber-300 ring-2 ring-amber-500/20'
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced (均衡)',
    desc: 'Optimal depth 4 tactics',
    maxDepth: 4,
    timeLimitMs: 1200,
    quiescenceLimit: 3,
    maxCapturesToCheck: 8,
    color: 'border-emerald-500 text-emerald-400 hover:bg-emerald-500/5',
    activeColor: 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
  },
  deep: {
    id: 'deep',
    name: 'Deep Mind (深度)',
    desc: 'Heavy lookahead search',
    maxDepth: 5,
    timeLimitMs: 3500,
    quiescenceLimit: 4,
    maxCapturesToCheck: 12,
    color: 'border-blue-500 text-blue-400 hover:bg-blue-500/5',
    activeColor: 'bg-blue-500/10 border-blue-500 text-blue-300 ring-2 ring-blue-500/20'
  },
  mastermind: {
    id: 'mastermind',
    name: 'Mastermind (大師)',
    desc: 'Max IQ depth 7 analysis',
    maxDepth: 7,
    timeLimitMs: 7500,
    quiescenceLimit: 5,
    maxCapturesToCheck: 20,
    color: 'border-purple-500 text-purple-400 hover:bg-purple-500/5',
    activeColor: 'bg-purple-500/10 border-purple-500 text-purple-300 ring-2 ring-purple-500/20'
  },
  neuralcore: {
    id: 'neuralcore',
    name: 'NeuralCore CH',
    desc: 'Deepest super-quality quick search (最強)',
    maxDepth: 8,
    timeLimitMs: 2500,
    quiescenceLimit: 6,
    maxCapturesToCheck: 24,
    color: 'border-red-500 text-red-400 hover:bg-red-500/5',
    activeColor: 'bg-red-500/10 border-red-500 text-red-300 ring-2 ring-red-500/20'
  }
} as const;

export const ENDGAMES = [
  {
    id: 'normal',
    name: 'Standard Board (標準開局)',
    nameZh: '標準開局對弈',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    description: 'Play a standard game of chess starting from the default opening position.',
    descriptionZh: '從標準的初始棋盤位置開始，進行常規的開局對弈。'
  },
  {
    id: 'two_rooks',
    name: 'Two Rooks Mate (雙車殘局)',
    nameZh: '雙車殘局殺王練習',
    fen: 'k7/8/8/8/8/8/R6R/4K3 w - - 0 1',
    description: 'Learn the ladder checkmate method with two rooks. White has two rooks; Black has only a king. White to move.',
    descriptionZh: '學習並熟練運用「雙車階梯殺法」。白棋擁有雙車，黑棋僅剩單王，白先（難度：⭐）。'
  },
  {
    id: 'two_bishops',
    name: 'Two Bishops Mate (雙象殘局)',
    nameZh: '雙象殘局殺王練習',
    fen: 'k7/8/8/8/8/8/1B6/3B1K2 w - - 0 1',
    description: 'Drive the lone Black king to a corner of the board to deliver checkmate using your two Bishops. White to move.',
    descriptionZh: '將孤立的黑王驅趕到棋盤角落，並利用雙象配合白王完成絕殺。白先（難度：⭐⭐⭐）。'
  },
  {
    id: 'bishop_knight',
    name: 'Bishop & Knight Mate (象馬殘局)',
    nameZh: '象馬殘局殺王練習',
    fen: 'k7/8/8/8/8/8/1B6/1N3K2 w - - 0 1',
    description: 'The hardest standard checkmate. Herd the Black king to a corner of the same color as your Bishop to mate. White to move.',
    descriptionZh: '最難的古典殺法。必須配合馬和王，將黑王逼入與己方象相同顏色的角落才能取勝。白先（難度：⭐⭐⭐⭐⭐）。'
  },
  {
    id: 'queen_pawn',
    name: 'Queen vs Pawn (后殘局練習)',
    nameZh: '后兵殘局對抗練習',
    fen: '8/4k3/8/8/8/6p1/5P1p/4K2Q w - - 0 1',
    description: 'White has a Queen and Pawn against Black\'s dangerous promoting pawn on the 7th rank. Stop the pawn and win! White to move.',
    descriptionZh: '白棋擁有皇后與一個未升級兵，對抗黑棋即將升變的 h2 高威脅兵。阻止升變並獲勝。白先（難度：⭐⭐⭐⭐）。'
  },
  {
    id: 'pawn_endgame',
    name: 'King & Pawn Opposition (兵殘局)',
    nameZh: '王兵對立與突破練習',
    fen: 'k7/8/p7/8/1P6/8/8/4K3 w - - 0 1',
    description: 'Practice the concept of King Opposition and pawn promotion in a classic endgame. White to move.',
    descriptionZh: '在經典的兵殘局中，練習「王之對立」以及如何引導白兵成功升變為后。白先（難度：⭐⭐）。'
  }
];

export const GameArena: React.FC = () => {
  const [chess, setChess] = useState<Chess>(new Chess());
  const [fen, setFen] = useState<string>(chess.fen());
  const [config, setConfig] = useState<EngineConfig>({
    maxDepth: 4,
    personality: 'positional',
    evalMode: 'hybrid',
    timeLimitMs: 1200,
    quiescenceLimit: 3,
    maxCapturesToCheck: 8,
    difficulty: 'intermediate'
  });
  const [speedProfile, setSpeedProfile] = useState<'turbo' | 'balanced' | 'deep' | 'mastermind' | 'neuralcore' | 'custom'>('balanced');
  const [currentTurnTime, setCurrentTurnTime] = useState<number>(0);
  const [engineThinkingTime, setEngineThinkingTime] = useState<number>(0);
  
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [timeControl, setTimeControl] = useState<TimeControlKey>('blitz');
  const [whiteTime, setWhiteTime] = useState<number>(180 * 10); // Tenths of seconds (3m)
  const [blackTime, setBlackTime] = useState<number>(180 * 10);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  // UX Enhancements & Navigation States
  const [startingFen, setStartingFen] = useState<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [viewIndex, setViewIndex] = useState<number>(-1); // -1 = live, -2 = starting FEN, >=0 = index in chess.history()
  const [illegalMoveAttempt, setIllegalMoveAttempt] = useState<boolean>(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState<boolean>(false);

  const downloadPGN = () => {
    try {
      const clone = new Chess();
      const moves = chess.history();
      for (const m of moves) {
        clone.move(m);
      }
      clone.header(
        'Event', 'Aetheris Chess Arena Match',
        'Site', 'Aetheris Chess AI Studio',
        'Date', new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
        'Round', '1',
        'White', flipped ? `Aetheris Engine (${config.personality})` : 'Player',
        'Black', flipped ? 'Player' : `Aetheris Engine (${config.personality})`,
        'Result', gameResult ? (gameResult.includes('White wins') ? '1-0' : gameResult.includes('Black wins') ? '0-1' : '1/2-1/2') : '*'
      );
      const pgn = clone.pgn();
      const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aetheris_match_${new Date().toISOString().slice(0, 10)}.pgn`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate/download PGN:', err);
    }
  };

  const [lastEngineStats, setLastEngineStats] = useState<{
    nodes: number;
    depth: number;
    score: number;
    nps: number;
    pv: string[];
    bookOpeningName?: string;
  } | null>(null);

  const [flipped, setFlipped] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [highlightSquares, setHighlightSquares] = useState<string[]>([]);
  const [selectedEndgameId, setSelectedEndgameId] = useState<string>('normal');
  const [isSaved, setIsSaved] = useState(false);
  const [engineLastMoveSquares, setEngineLastMoveSquares] = useState<string[]>([]);

  // Derived state for historical chess board view navigation
  const displayFen = (() => {
    const history = chess.history();
    if (viewIndex === -1 || history.length === 0) {
      return chess.fen();
    }
    if (viewIndex === -2) {
      return startingFen;
    }
    const tempChess = new Chess(startingFen);
    for (let i = 0; i <= viewIndex; i++) {
      try {
        tempChess.move(history[i]);
      } catch (e) {
        console.error('Error rebuilding history:', e);
      }
    }
    return tempChess.fen();
  })();

  const isViewingHistory = viewIndex !== -1 && chess.history().length > 0;

  const navigateHistory = (direction: 'prev' | 'next' | 'first' | 'last' | 'live') => {
    const history = chess.history();
    const len = history.length;
    if (len === 0) return;

    if (direction === 'first') {
      setViewIndex(-2);
    } else if (direction === 'last' || direction === 'live') {
      setViewIndex(-1);
    } else if (direction === 'prev') {
      if (viewIndex === -1) {
        setViewIndex(len - 1);
      } else if (viewIndex === -2) {
        // Do nothing
      } else if (viewIndex === 0) {
        setViewIndex(-2);
      } else {
        setViewIndex(viewIndex - 1);
      }
    } else if (direction === 'next') {
      if (viewIndex === -1) {
        // Do nothing
      } else if (viewIndex === -2) {
        setViewIndex(0);
      } else if (viewIndex === len - 1) {
        setViewIndex(-1);
      } else {
        setViewIndex(viewIndex + 1);
      }
    }
  };

  // Keyboard Shortcuts for Game History Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateHistory('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateHistory('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewIndex, chess]);

  // Move stopwatch interval
  useEffect(() => {
    if (!timerActive || gameResult) return;
    const interval = setInterval(() => {
      setCurrentTurnTime(prev => prev + 1);
    }, 100);
    return () => clearInterval(interval);
  }, [timerActive, fen, gameResult]);

  // Reset current turn timer on FEN change
  useEffect(() => {
    setCurrentTurnTime(0);
  }, [fen]);

  // Engine thinking timer
  useEffect(() => {
    let interval: any = null;
    if (isEngineThinking) {
      setEngineThinkingTime(0);
      interval = setInterval(() => {
        setEngineThinkingTime(prev => prev + 1);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isEngineThinking]);

  const formatTurnTime = (tenths: number) => {
    const totalSecs = tenths / 10;
    return `${totalSecs.toFixed(1)}s`;
  };

  // Instantiating the core search engine
  const engine = new ChessEngine(config);

  // Synchronize clocks when timeControl changes
  useEffect(() => {
    const secs = TIME_CONTROLS[timeControl].total;
    setWhiteTime(secs * 10);
    setBlackTime(secs * 10);
    setTimerActive(false);
  }, [timeControl]);

  // Game clock countdown interval (100ms precision)
  useEffect(() => {
    if (!timerActive || gameResult) return;

    const interval = setInterval(() => {
      const activeSide = chess.turn();
      if (activeSide === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            setGameResult('Time out! Black wins on time (Flagged 🚩)');
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            setGameResult('Time out! White wins on time (Flagged 🚩)');
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerActive, chess, gameResult]);

  // Format time in tenths of seconds
  const formatTime = (tenths: number) => {
    if (tenths <= 0) return '0.0';
    const totalSecs = Math.floor(tenths / 10);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const remTenths = tenths % 10;

    if (totalSecs < 20) {
      return `${secs}.${remTenths}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sync chess game state with FEN
  const updateBoard = (newChess: Chess) => {
    setChess(newChess);
    setFen(newChess.fen());
    
    // Check for checkmate/stalemate/draw
    if (newChess.isCheckmate()) {
      const winner = newChess.turn() === 'w' ? 'Black' : 'White';
      setGameResult(`Checkmate! Winner: ${winner}`);
    } else if (newChess.isDraw()) {
      setGameResult('Draw by Agreement, 50-move Rule or Repetition');
    } else if (newChess.isStalemate()) {
      setGameResult('Stalemate! Game is drawn');
    } else {
      setGameResult(null);
    }

    // Highlight king if in check
    if (newChess.inCheck()) {
      const turn = newChess.turn();
      const board = newChess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sq = board[r][c];
          if (sq && sq.type === 'k' && sq.color === turn) {
            setHighlightSquares([`${String.fromCharCode(97 + c)}${8 - r}`]);
            return;
          }
        }
      }
    } else {
      setHighlightSquares([]);
    }
  };

  // Trigger engine calculation
  const triggerEngineMove = (currentChess: Chess) => {
    if (currentChess.isGameOver()) return;
    
    setIsEngineThinking(true);
    
    // Run engine in a brief timeout to let player move render and prevent frame blocks
    setTimeout(() => {
      try {
        const engineInstance = new ChessEngine(config);
        // Pass search history to activate the Opening Book database
        const searchResult = engineInstance.search(currentChess.fen(), 0.7, currentChess.history());
        
        if (searchResult.bestMove) {
          currentChess.move(searchResult.bestMove);
          
          // Apply engine increment (ths of seconds)
          const inc = TIME_CONTROLS[timeControl].inc * 10;
          if (flipped) {
            // Engine is White
            setWhiteTime(prev => prev + inc);
          } else {
            // Engine is Black
            setBlackTime(prev => prev + inc);
          }
          
          setLastEngineStats({
            nodes: searchResult.nodes,
            depth: searchResult.depth,
            score: searchResult.score,
            nps: searchResult.nps,
            pv: searchResult.pv,
            bookOpeningName: searchResult.bookOpeningName
          });
          
          // Highlights of the destination square and origin of last engine move
          setHighlightSquares([searchResult.bestMove.from, searchResult.bestMove.to]);
          setEngineLastMoveSquares([searchResult.bestMove.from, searchResult.bestMove.to]);
        }
        
        updateBoard(currentChess);
      } catch (e) {
        console.error('Error calculating engine move:', e);
      } finally {
        setIsEngineThinking(false);
      }
    }, 350);
  };

  // Handle player move
  const handlePlayerMove = (move: { from: string; to: string; promotion?: string }) => {
    if (isEngineThinking || gameResult) return;

    try {
      const copy = new Chess(startingFen);
      for (const m of chess.history()) {
        copy.move(m);
      }
      const res = copy.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      });

      if (res) {
        // Reset history review back to live play
        setViewIndex(-1);

        // Apply player increment
        const inc = TIME_CONTROLS[timeControl].inc * 10;
        if (flipped) {
          // Player is Black
          setBlackTime(prev => prev + inc);
        } else {
          // Player is White
          setWhiteTime(prev => prev + inc);
        }

        // Start countdown immediately on first move
        if (!timerActive) {
          setTimerActive(true);
        }

        updateBoard(copy);
        // Let the engine calculate its response
        triggerEngineMove(copy);
      } else {
        setIllegalMoveAttempt(true);
        setTimeout(() => setIllegalMoveAttempt(false), 500);
      }
    } catch (e) {
      console.error('Invalid player move attempted:', e);
      setIllegalMoveAttempt(true);
      setTimeout(() => setIllegalMoveAttempt(false), 500);
    }
  };

  const handleUndo = () => {
    if (isEngineThinking) return;
    
    const copy = new Chess(startingFen);
    const history = chess.history();
    const targetLength = Math.max(0, history.length - 2);
    for (let i = 0; i < targetLength; i++) {
      copy.move(history[i]);
    }
    
    updateBoard(copy);
    setLastEngineStats(null);
    setHighlightSquares([]);
    setEngineLastMoveSquares([]);
    
    // Pause timer on undo
    setTimerActive(false);
  };

  const loadEndgame = (endgameId: string) => {
    setSelectedEndgameId(endgameId);
    setIsSaved(false);
    setViewIndex(-1); // Reset history view
    const endgame = ENDGAMES.find(e => e.id === endgameId);
    if (endgame) {
      const fresh = new Chess(endgame.fen);
      setStartingFen(endgame.fen); // Track starting FEN
      updateBoard(fresh);
      setLastEngineStats(null);
      setHighlightSquares([]);
      setEngineLastMoveSquares([]);
      
      // Reset timer state
      const secs = TIME_CONTROLS[timeControl].total;
      setWhiteTime(secs * 10);
      setBlackTime(secs * 10);
      setTimerActive(false);
      
      // If user is playing Black (flipped) and it is White's turn, trigger engine
      if (flipped && fresh.turn() === 'w') {
        triggerEngineMove(fresh);
      }
    }
  };

  const handleSaveToVault = () => {
    if (isSaved) return;

    let pgnResult: '1-0' | '0-1' | '1/2-1/2' = '1/2-1/2';
    if (chess.isCheckmate()) {
      pgnResult = chess.turn() === 'w' ? '0-1' : '1-0';
    } else if (gameResult?.includes('White wins') || gameResult?.toLowerCase().includes('white wins')) {
      pgnResult = '1-0';
    } else if (gameResult?.includes('Black wins') || gameResult?.toLowerCase().includes('black wins')) {
      pgnResult = '0-1';
    }

    const historyMoves = chess.history();
    const cTemp = new Chess();
    const fens = [cTemp.fen()];
    for (const mv of historyMoves) {
      try {
        cTemp.move(mv);
        fens.push(cTemp.fen());
      } catch (e) {}
    }

    saveGame({
      date: new Date().toLocaleDateString(),
      opponent: `${currentPersonality.name} (Depth ${config.maxDepth})`,
      opponentType: 'ai',
      timeControl: TIME_CONTROLS[timeControl].name,
      result: pgnResult,
      moves: ['Start', ...historyMoves],
      fenHistory: fens
    });
    setIsSaved(true);
  };

  const handleRestart = () => {
    setIsSaved(false);
    setViewIndex(-1); // Reset history view
    const endgame = ENDGAMES.find(e => e.id === selectedEndgameId);
    const startFen = endgame ? endgame.fen : undefined;
    const fresh = startFen ? new Chess(startFen) : new Chess();
    setStartingFen(startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); // Track starting FEN
    updateBoard(fresh);
    setLastEngineStats(null);
    setHighlightSquares([]);
    setEngineLastMoveSquares([]);
    
    // Reset timer state
    const secs = TIME_CONTROLS[timeControl].total;
    setWhiteTime(secs * 10);
    setBlackTime(secs * 10);
    setTimerActive(false);
    
    // If user is playing Black, trigger engine's first move as White
    if (flipped && fresh.turn() === 'w') {
      triggerEngineMove(fresh);
    }
  };

  const handleFlip = () => {
    const nextFlipped = !flipped;
    setFlipped(nextFlipped);
    
    // If flipped and it is now White's turn (which is the engine's turn if user is Black)
    if (nextFlipped && chess.turn() === 'w') {
      triggerEngineMove(chess);
    }
  };

  const currentPersonality = PERSONALITIES[config.personality];
  const matchedBook = findBookMove(chess.history());

  // Estimated Chess ELO calculation based on config
  const getEstimatedElo = () => {
    const baseElo = 1500;
    const depthBonus = (config.maxDepth - 1) * 200;
    const modeBonus = config.evalMode === 'hybrid' ? 100 : config.evalMode === 'neural' ? 50 : 0;
    return baseElo + depthBonus + modeBonus;
  };

  const applySpeedProfile = (profileKey: 'turbo' | 'balanced' | 'deep' | 'mastermind' | 'neuralcore') => {
    setSpeedProfile(profileKey);
    const p = SPEED_IQ_PROFILES[profileKey];
    setConfig(prev => ({
      ...prev,
      maxDepth: p.maxDepth,
      timeLimitMs: p.timeLimitMs,
      quiescenceLimit: p.quiescenceLimit,
      maxCapturesToCheck: p.maxCapturesToCheck
    }));
  };

  const handleCustomDepth = (depthVal: number) => {
    setSpeedProfile('custom');
    setConfig(prev => ({ ...prev, maxDepth: depthVal }));
  };

  const handleCustomTime = (timeVal: number) => {
    setSpeedProfile('custom');
    setConfig(prev => ({ ...prev, timeLimitMs: timeVal }));
  };

  const handleCustomCaptures = (capturesVal: number) => {
    setSpeedProfile('custom');
    setConfig(prev => ({ ...prev, maxCapturesToCheck: capturesVal }));
  };

  const handleDifficultyChange = (level: 'beginner' | 'intermediate' | 'expert' | 'grandmaster') => {
    let depth = 4;
    let timeMs = 1200;
    if (level === 'beginner') {
      depth = 1;
      timeMs = 150;
    } else if (level === 'intermediate') {
      depth = 3;
      timeMs = 800;
    } else if (level === 'expert') {
      depth = 5;
      timeMs = 2500;
    } else if (level === 'grandmaster') {
      depth = 7;
      timeMs = 5000;
    }
    setConfig(prev => ({
      ...prev,
      difficulty: level,
      maxDepth: depth,
      timeLimitMs: timeMs
    }));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6" id="game_arena_panel">
      
      {/* Split layout: Board on left, controls/config on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Chessboard and Player details */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* Opponent Identity Frame (Top) */}
          <div className="w-full max-w-[500px] flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl mb-4 shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl bg-slate-800 p-2 rounded-lg">{flipped ? '👤' : currentPersonality.avatar}</span>
              <div>
                <div className="text-sm font-bold text-white leading-tight">
                  {flipped ? 'User (Player)' : currentPersonality.name}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {flipped ? 'Grandmaster Rank' : `Engine Level ${config.maxDepth} | ELO ${getEstimatedElo()}`}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isEngineThinking && !flipped && (
                <span className="text-xs text-amber-400 font-mono animate-pulse flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Thinking
                </span>
              )}
              {/* Top Clock (Black) */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold shadow-inner transition-all ${
                chess.turn() === 'b' && timerActive && !gameResult
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-slate-950 border-slate-850 text-slate-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(blackTime)}</span>
              </div>
            </div>
          </div>

          {/* Core Board */}
          <motion.div
            animate={illegalMoveAttempt ? { x: [-8, 8, -6, 6, -4, 4, -2, 2, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
              illegalMoveAttempt 
                ? 'ring-4 ring-rose-500/85 shadow-rose-500/20 shadow-lg' 
                : isViewingHistory 
                  ? 'ring-2 ring-amber-500/60 shadow-amber-500/15 shadow-md' 
                  : 'ring-1 ring-slate-800'
            }`}
          >
            {isViewingHistory && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-500/90 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md backdrop-blur-sm z-20 flex items-center gap-1">
                <span>👁️ Reviewing History</span>
                <button 
                  onClick={() => setViewIndex(-1)} 
                  className="bg-slate-950 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded ml-1 hover:bg-slate-900 cursor-pointer"
                >
                  Back to Live
                </button>
              </div>
            )}
            
            <Chessboard
              fen={displayFen}
              onMove={handlePlayerMove}
              interactive={!isEngineThinking && !gameResult && viewIndex === -1}
              flipped={flipped}
              highlightSquares={highlightSquares}
              engineLastMoveSquares={engineLastMoveSquares}
            />
            {gameResult && (
              <div className="absolute inset-0 bg-slate-950/80 rounded-xl backdrop-blur-sm flex flex-col items-center justify-center p-6 z-30 border border-slate-700/50 shadow-2xl">
                <AlertTriangle className="w-12 h-12 text-amber-400 mb-3 animate-pulse" />
                <h3 className="text-lg font-bold text-white mb-1">Game Concluded</h3>
                <p className="text-sm text-slate-300 mb-5 text-center px-4 max-w-sm leading-relaxed">{gameResult}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleRestart}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-lg transition-all border border-slate-700"
                  >
                    New Battle Match
                  </button>
                  <button
                    onClick={handleSaveToVault}
                    disabled={isSaved}
                    className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer ${
                      isSaved 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium' 
                        : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:shadow-emerald-500/20 font-extrabold'
                    }`}
                  >
                    {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    {isSaved ? 'Saved to Vault!' : 'Save Match to Vault'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Move Timer & Turn Dashboard */}
          <div className="w-full max-w-[500px] mt-4 bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-4 shadow-lg backdrop-blur-sm relative overflow-hidden" id="move_timer_ui">
            {/* Active turn side highlight line */}
            <div className={`absolute top-0 left-0 h-[3px] transition-all duration-500 ${
              chess.turn() === 'w' ? 'w-1/2 bg-emerald-500' : 'w-1/2 translate-x-full bg-amber-500'
            }`} />

            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full transition-all duration-300 ${
                chess.turn() === 'w' 
                  ? 'bg-emerald-400 ring-4 ring-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse' 
                  : 'bg-amber-400 ring-4 ring-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse'
              }`} />
              <div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Current Turn</div>
                <div className="text-xs font-bold text-white transition-all">
                  {chess.turn() === 'w' 
                    ? (flipped ? 'AI (White)' : 'Player (White)') 
                    : (flipped ? 'Player (Black)' : 'AI (Black)')
                  }
                </div>
              </div>
            </div>

            {/* Move Stopwatch */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-850 px-3 py-1.5 rounded-lg font-mono">
              <Timer className={`w-3.5 h-3.5 ${chess.turn() === 'w' ? 'text-emerald-400 animate-spin' : 'text-amber-400'}`} style={{ animationDuration: '4s' }} />
              <span className="text-[11px] text-slate-300">
                Move clock: <span className="text-white font-extrabold font-mono text-xs">{formatTurnTime(currentTurnTime)}</span>
              </span>
            </div>

            {/* Speed configuration info */}
            <div className="text-right">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">AI Time Budget</div>
              <div className="text-[11px] font-bold text-emerald-400 font-mono">
                {config.timeLimitMs || 1000}ms
              </div>
            </div>
          </div>

          {/* Engine Real-time Search Progress Bar */}
          {isEngineThinking && (
            <div className="w-full max-w-[500px] mt-2 bg-slate-950 border border-emerald-500/10 p-2.5 rounded-xl flex items-center justify-between gap-3 shadow-md animate-fade-in">
              <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
                <Brain className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span className="font-bold">AI Calculating...</span>
                <span className="text-slate-400">({(engineThinkingTime / 10).toFixed(1)}s)</span>
              </div>
              <div className="flex-1 max-w-[150px] bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-100 ease-out"
                  style={{ width: `${Math.min(100, (engineThinkingTime * 100) / ((config.timeLimitMs || 1200) / 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* User/Opponent Identity Frame (Bottom) */}
          <div className="w-full max-w-[500px] flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl mt-4 shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl bg-slate-800 p-2 rounded-lg">{flipped ? currentPersonality.avatar : '👤'}</span>
              <div>
                <div className="text-sm font-bold text-white leading-tight">
                  {flipped ? currentPersonality.name : 'User (Player)'}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {flipped ? `Engine Level ${config.maxDepth} | ELO ${getEstimatedElo()}` : 'Grandmaster Rank'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isEngineThinking && flipped && (
                <span className="text-xs text-amber-400 font-mono animate-pulse flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Thinking
                </span>
              )}
              {/* Bottom Clock (White) */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold shadow-inner transition-all ${
                chess.turn() === 'w' && timerActive && !gameResult
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-slate-950 border-slate-850 text-slate-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(whiteTime)}</span>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Side: Configuration & Move Log */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Personality Quote Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md relative overflow-hidden">
            <div className="absolute right-3 top-3 text-3xl opacity-15">{currentPersonality.avatar}</div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Opponent Quote</h4>
            <p className="text-xs text-emerald-400 italic font-mono leading-relaxed">
              "{currentPersonality.quote}"
            </p>
          </div>

          {/* Active Opening Book Line */}
          {matchedBook && (
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4 shadow-md flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                <BookOpen className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-emerald-400 font-bold font-mono uppercase tracking-wider flex items-center gap-1">
                  <span>Opening Book Active</span>
                  {matchedBook.priority <= 2 && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.1 rounded">
                      PRIORITY {matchedBook.priority}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white truncate">{matchedBook.name}</h4>
                <p className="text-[10px] text-slate-400 italic truncate">{matchedBook.nameZh}</p>
              </div>
            </div>
          )}

          {/* Endgame Practice Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4" id="endgame_practice_panel">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                Endgame Practice (特殊殘局特訓庫)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              選擇一個殘局進行對抗特訓。在有限時間內，與高智能 AI 對決，磨煉你的王兵配合、階梯殺王與升變突破技巧！
            </p>
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
              {ENDGAMES.map((e) => {
                const isSelected = selectedEndgameId === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => loadEndgame(e.id)}
                    className={`
                      w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer
                      ${isSelected 
                        ? 'bg-slate-850 border-emerald-500 text-white shadow-md' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-750 hover:text-slate-200'}
                    `}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold text-white">{e.nameZh}</span>
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                        {e.id === 'normal' ? 'Default' : 'Endgame'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-normal">
                      {e.descriptionZh}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Match Settings Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Match Configuration</h3>

            {/* Engine Difficulty Level selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-emerald-400" />
                Engine Difficulty Level (棋局難度)
              </label>
              <div className="grid grid-cols-4 gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-850">
                {(['beginner', 'intermediate', 'expert', 'grandmaster'] as const).map((level) => {
                  const isSelected = config.difficulty === level;
                  const labelMap = {
                    beginner: 'Beginner',
                    intermediate: 'Intermediate',
                    expert: 'Expert',
                    grandmaster: 'Grandmaster'
                  };
                  const labelZhMap = {
                    beginner: '初學',
                    intermediate: '中等',
                    expert: '專家',
                    grandmaster: '大師'
                  };
                  return (
                    <button
                      key={level}
                      onClick={() => handleDifficultyChange(level)}
                      className={`
                        py-1.5 px-1 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer
                        ${isSelected 
                          ? 'bg-slate-850 border-emerald-500 text-emerald-400 shadow-md font-bold' 
                          : 'bg-slate-950/60 border-slate-900/40 text-slate-500 hover:text-slate-300 hover:border-slate-800'}
                      `}
                    >
                      <span className="text-[10px] font-bold leading-tight">{labelMap[level]}</span>
                      <span className="text-[8px] text-slate-500 font-normal leading-none">{labelZhMap[level]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Control selection buttons */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Time Control (計時模式)
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-850">
                {(Object.keys(TIME_CONTROLS) as TimeControlKey[]).map((key) => {
                  const tc = TIME_CONTROLS[key];
                  const isSelected = timeControl === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTimeControl(key)}
                      className={`
                        py-1.5 px-2.5 rounded-lg border text-[11px] font-bold font-mono transition-all flex flex-col items-center justify-center gap-0.5
                        ${isSelected 
                          ? 'bg-slate-850 border-emerald-500 text-emerald-400 shadow-sm' 
                          : 'bg-slate-950/60 border-slate-900/40 text-slate-500 hover:text-slate-300 hover:border-slate-800'}
                      `}
                    >
                      <span>{tc.name}</span>
                      <span className="text-[9px] text-slate-600 font-normal">
                        inc: +{tc.inc}s
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Speed & Intelligence Control Board (速度與智力控制板) */}
            <div className="space-y-3 bg-slate-950/30 p-3 rounded-xl border border-slate-850" id="speed_intelligence_control_board">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                AI Speed & Intelligence (速度與智力控制板)
              </label>
              
              {/* Profile Selection Grid */}
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(SPEED_IQ_PROFILES) as Array<keyof typeof SPEED_IQ_PROFILES>).map((key) => {
                  const p = SPEED_IQ_PROFILES[key];
                  const isSelected = speedProfile === key;
                  return (
                    <button
                      key={key}
                      onClick={() => applySpeedProfile(key)}
                      className={`
                        p-2 rounded-xl border text-left transition-all flex flex-col gap-0.5 cursor-pointer
                        ${isSelected ? p.activeColor : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200'}
                      `}
                    >
                      <span className="text-[11px] font-extrabold flex items-center gap-1">
                        {key === 'turbo' && <Zap className="w-3 h-3 text-amber-400 animate-pulse" />}
                        {key === 'balanced' && <Scale className="w-3 h-3 text-emerald-400" />}
                        {key === 'deep' && <Cpu className="w-3 h-3 text-blue-400" />}
                        {key === 'mastermind' && <Brain className="w-3 h-3 text-purple-400 animate-pulse" />}
                        {key === 'neuralcore' && <Award className="w-3 h-3 text-red-500 animate-pulse" />}
                        <span>{p.name}</span>
                      </span>
                      <span className="text-[9px] text-slate-500 leading-tight">
                        {p.desc}
                      </span>
                    </button>
                  );
                })}
                <button
                  onClick={() => setSpeedProfile('custom')}
                  className={`
                    p-2 rounded-xl border text-left transition-all flex flex-col gap-0.5 cursor-pointer col-span-2
                    ${speedProfile === 'custom' 
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20' 
                      : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200'}
                  `}
                >
                  <span className="text-[11px] font-extrabold flex items-center gap-1">
                    <Settings2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Custom Sliders (進階手動調校)</span>
                  </span>
                  <span className="text-[9px] text-slate-500 leading-tight">
                    Finely tune search depth and thinking times manually
                  </span>
                </button>
              </div>

              {/* Mode Specifications Box */}
              {speedProfile !== 'custom' && (
                <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-900 text-[10px] space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Target Search Depth:</span>
                    <strong className="text-white">{SPEED_IQ_PROFILES[speedProfile].maxDepth} Plies</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Thinking Budget Limit:</span>
                    <strong className="text-white">~{SPEED_IQ_PROFILES[speedProfile].timeLimitMs} ms</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tactical Extension Breadth:</span>
                    <strong className="text-white">{SPEED_IQ_PROFILES[speedProfile].maxCapturesToCheck} captures</strong>
                  </div>
                </div>
              )}

              {/* Custom Sliders Panel */}
              {speedProfile === 'custom' && (
                <div className="space-y-3 pt-1 border-t border-slate-900/60 animate-fade-in">
                  
                  {/* Slider 1: Depth */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1"><Cpu className="w-3 h-3" /> Max Search Depth</span>
                      <span className="font-extrabold text-emerald-400 font-mono">{config.maxDepth} Plies</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={config.maxDepth}
                      onChange={(e) => handleCustomDepth(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                      <span>Plies 1 (Pawn)</span>
                      <span>Plies 4 (Standard)</span>
                      <span>Plies 8 (Mastermind IQ)</span>
                    </div>
                  </div>

                  {/* Slider 2: Time limit */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Thinking Time Limit</span>
                      <span className="font-extrabold text-emerald-400 font-mono">{config.timeLimitMs || 1000}ms</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="10000"
                      step="100"
                      value={config.timeLimitMs || 1200}
                      onChange={(e) => handleCustomTime(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                      <span>100ms (Instant)</span>
                      <span>1500ms (Rapid)</span>
                      <span>10000ms (Deep Search)</span>
                    </div>
                  </div>

                  {/* Slider 3: Captures breadths */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1"><Timer className="w-3 h-3" /> Tactical Quiescence Width</span>
                      <span className="font-extrabold text-emerald-400 font-mono">
                        {config.maxCapturesToCheck === 0 ? 'Unlimited' : `${config.maxCapturesToCheck} captures`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      step="1"
                      value={config.maxCapturesToCheck !== undefined ? config.maxCapturesToCheck : 8}
                      onChange={(e) => handleCustomCaptures(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                      <span>2 (Pruned fast)</span>
                      <span>10 (Standard)</span>
                      <span>20 (Full Search)</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Personality Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">Select Engine Personality</label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(PERSONALITIES) as EnginePersonalityId[]).map((pId) => {
                  const p = PERSONALITIES[pId];
                  const isSelected = config.personality === pId;
                  return (
                    <button
                      key={pId}
                      onClick={() => setConfig({ ...config, personality: pId })}
                      className={`
                        text-left p-2.5 rounded-xl border text-xs transition-all flex flex-col gap-1 shadow-sm
                        ${isSelected 
                          ? 'bg-slate-850 border-emerald-500 text-white' 
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'}
                      `}
                    >
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>{p.avatar}</span>
                        <span>{p.name}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                        {p.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Evaluation Mode */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">Evaluation Mode</label>
              <select
                value={config.evalMode}
                onChange={(e) => setConfig({ ...config, evalMode: e.target.value as any })}
                className="w-full bg-slate-950 text-indigo-400 font-mono text-xs rounded-lg border border-slate-800 px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="pantheon_fusion">🔥 NeuralCore Grand Fusion (5-in-1 Ensemble)</option>
                <option value="neuralcore_rl_selfplay">🤖 NeuralCore RL Self-Play (Self-Learning Engine)</option>
                <option value="leeza_mcts">🧠 NeuralCore MCTS (Leeza MCTS)</option>
                <option value="stockfish_nnue">🐟 NeuralCore + Stockfish Distilled (Ultra Deep)</option>
                <option value="komodo_mcts">🦎 NeuralCore + Komodo Distilled (Positional MCTS)</option>
                <option value="patricia_neural">🦅 NeuralCore + Patricia Distilled (Sharp Neural)</option>
                <option value="nova_chess">🌟 NeuralCore + Nova Chess Distilled (Elegant Tactical)</option>
                <option value="hybrid">✨ NeuralCore Hybrid (Core + Minimax)</option>
                <option value="neural">🦾 NeuralCore Neural (Standard Policy Head)</option>
                <option value="traditional">📟 NeuralCore Traditional (Legacy Minimax)</option>
              </select>
            </div>

            {/* Control Actions */}
            <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={handleRestart}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 transition-all gap-1 text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[10px] font-medium">Restart</span>
              </button>
              <button
                onClick={handleFlip}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 transition-all gap-1 text-slate-400 hover:text-white"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span className="text-[10px] font-medium">Flip Board</span>
              </button>
              <button
                onClick={handleUndo}
                disabled={chess.history().length === 0 || isEngineThinking}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 transition-all gap-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <Undo2 className="w-4 h-4" />
                <span className="text-[10px] font-medium">Undo Move</span>
              </button>
            </div>
          </div>

          {/* Engine Real-time search Stats */}
          {lastEngineStats && (
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 shadow-xl space-y-3 font-mono">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Engine Calculation Log</h4>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">Nodes Explored</span>
                  <span className="text-slate-300 font-bold">{lastEngineStats.nodes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">Search Speed</span>
                  <span className="text-emerald-400 font-bold">{(lastEngineStats.nps / 1000).toFixed(1)}k nps</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5 col-span-2">
                  <span className="text-slate-500">Best PV Line</span>
                  <span className="text-amber-400 font-bold text-right truncate max-w-[200px]">{lastEngineStats.pv.join(' → ')}</span>
                </div>
                <div className="flex justify-between col-span-2 border-b border-slate-900 pb-1.5">
                  <span className="text-slate-500">Centipawn Eval</span>
                  <span className={`font-bold ${lastEngineStats.score >= 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {lastEngineStats.score > 0 ? '+' : ''}{(lastEngineStats.score / 100).toFixed(2)}
                  </span>
                </div>
                {lastEngineStats.bookOpeningName && (
                  <div className="flex justify-between col-span-2 text-emerald-400 font-bold">
                    <span>Opening Book</span>
                    <span className="truncate max-w-[180px]">📖 {lastEngineStats.bookOpeningName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Move Log Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5 focus:outline-none cursor-pointer"
              >
                <span className="text-[10px] transition-transform duration-200 inline-block" style={{ transform: isHistoryCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
                Battle History (PGN)
              </button>
              
              <button
                onClick={downloadPGN}
                disabled={chess.history().length === 0}
                className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer ${
                  chess.history().length === 0 
                    ? 'opacity-40 cursor-not-allowed text-slate-500' 
                    : 'text-emerald-400 border-emerald-500/10 hover:border-emerald-500/35'
                }`}
                title="Download current game moves as PGN"
              >
                <Download className="w-3 h-3" />
                <span>Download</span>
              </button>
            </div>

            {!isHistoryCollapsed && (
              <div className="space-y-3">
                {/* History Navigation Toolbar */}
                {chess.history().length > 0 && (
                  <div className="flex items-center justify-between bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-850/80">
                    <div className="text-[10px] text-slate-400 font-mono font-medium">
                      {viewIndex === -1 ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          Live Match
                        </span>
                      ) : viewIndex === -2 ? (
                        <span className="text-slate-400">Initial Board</span>
                      ) : (
                        <span className="text-amber-400">
                          Move {Math.floor(viewIndex / 2) + 1} ({viewIndex % 2 === 0 ? 'White' : 'Black'})
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigateHistory('first')} 
                        disabled={viewIndex === -2}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
                        title="First Position"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => navigateHistory('prev')} 
                        disabled={viewIndex === -2}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
                        title="Previous Move (Arrow Left)"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => navigateHistory('next')} 
                        disabled={viewIndex === -1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
                        title="Next Move (Arrow Right)"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => navigateHistory('last')} 
                        disabled={viewIndex === -1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
                        title="Last / Live Position"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1.5 pr-2 max-h-[120px]">
                  {chess.history().length === 0 ? (
                    <div className="text-slate-500 italic py-4 text-center">No moves played yet. Pick a square to begin!</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      {chess.history().reduce((acc: string[][], m: string, i: number) => {
                        if (i % 2 === 0) {
                          acc.push([m]);
                        } else {
                          acc[acc.length - 1].push(m);
                        }
                        return acc;
                      }, []).map((pair, idx) => {
                        const whiteMoveIdx = idx * 2;
                        const blackMoveIdx = idx * 2 + 1;
                        const isWhiteSelected = viewIndex === whiteMoveIdx;
                        const isBlackSelected = viewIndex === blackMoveIdx;

                        return (
                          <div key={idx} className="flex items-center justify-between border-b border-slate-800/30 pb-0.5">
                            <span className="text-slate-500 text-[10px]">{idx + 1}.</span>
                            <div className="flex gap-2 text-right">
                              <button
                                onClick={() => setViewIndex(whiteMoveIdx)}
                                className={`px-1 rounded font-bold cursor-pointer transition-all ${
                                  isWhiteSelected 
                                    ? 'bg-emerald-500 text-slate-950' 
                                    : 'text-white hover:bg-slate-800'
                                }`}
                              >
                                {pair[0]}
                              </button>
                              {pair[1] && (
                                <button
                                  onClick={() => setViewIndex(blackMoveIdx)}
                                  className={`px-1 rounded font-bold cursor-pointer transition-all ${
                                    isBlackSelected 
                                      ? 'bg-emerald-500 text-slate-950' 
                                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                  }`}
                                >
                                  {pair[1]}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
