import { Chess } from 'chess.js';
import { EngineConfig } from '../types';
import { TranspositionTable, TTEntry } from './tt';
import { sortMoves } from './moveOrdering';

export class ChessEngineSearch {
  private config: EngineConfig;
  private transTable: TranspositionTable;
  private nodes: number = 0;
  private stopSearch: boolean = false;
  private killerMoves: { from: string; to: string; promotion?: string }[][] = new Array(100).fill(0).map(() => []);
  private historyMoves: Record<string, number> = {};

  constructor(config: EngineConfig, transTable: TranspositionTable) {
    this.config = config;
    this.transTable = transTable;
  }

  public updateConfig(config: EngineConfig) {
    this.config = config;
  }

  public searchDeepThemed(
    chess: Chess,
    trainingProgress: number,
    depth: number,
    maxNodes: number,
    timeLimitMs: number,
    evalFunc: (c: Chess) => number,
    themeName: string
  ) {
    this.nodes = 0;
    this.stopSearch = false;
    const startTime = performance.now();
    let bestMove: any = null;
    let bestScore = -Infinity;
    let currentDepth = 1;

    // Iterative Deepening
    while (currentDepth <= depth) {
      if (this.nodes >= maxNodes || (performance.now() - startTime) > timeLimitMs) {
        break;
      }
      const isWhite = chess.turn() === 'w';
      const alpha = -100000;
      const beta = 100000;

      const result = this.alphaBeta(chess, currentDepth, alpha, beta, isWhite, evalFunc);

      if (result.move && !this.stopSearch) {
        bestMove = result.move;
        bestScore = result.score;
      }
      currentDepth++;
    }

    const duration = performance.now() - startTime;
    return {
      bestMove: bestMove ? { san: bestMove } : null,
      score: bestScore,
      depth: currentDepth - 1,
      nodes: this.nodes,
      nps: Math.round(this.nodes / (duration / 1000)),
      pv: bestMove ? [bestMove] : []
    };
  }

  private alphaBeta(chess: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean, evalFunc: (c: Chess) => number): { score: number, move: string | null } {
    this.nodes++;
    
    // Check TT
    const fen = chess.fen();
    const ttEntry = this.transTable.get(fen);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === 'EXACT') return { score: ttEntry.score, move: ttEntry.bestMove };
      if (ttEntry.flag === 'ALPHA' && ttEntry.score <= alpha) return { score: alpha, move: ttEntry.bestMove };
      if (ttEntry.flag === 'BETA' && ttEntry.score >= beta) return { score: beta, move: ttEntry.bestMove };
    }

    if (depth === 0 || chess.isGameOver()) {
      const score = this.quiesce(chess, alpha, beta, isMaximizing, evalFunc);
      return { score, move: null };
    }

    const rawMoves = chess.moves({ verbose: true });
    if (rawMoves.length === 0) {
      return { score: chess.inCheck() ? (isMaximizing ? -99999 + this.nodes : 99999 - this.nodes) : 0, move: null };
    }

    const ttMoveStr = ttEntry ? ttEntry.bestMove : null;
    const ttMove = ttMoveStr ? rawMoves.find(m => m.san === ttMoveStr) : null;
    const moves = sortMoves(chess, rawMoves, depth, ttMove, this.killerMoves, this.historyMoves);
    let bestMove = moves[0].san;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        chess.move(m.san);
        const ev = this.alphaBeta(chess, depth - 1, alpha, beta, false, evalFunc).score;
        chess.undo();

        if (ev > maxEval) {
          maxEval = ev;
          bestMove = m.san;
        }
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) {
          this.transTable.set(fen, { depth, score: maxEval, flag: 'BETA', bestMove });
          break;
        }
      }
      this.transTable.set(fen, { depth, score: maxEval, flag: 'EXACT', bestMove });
      return { score: maxEval, move: bestMove };
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        chess.move(m.san);
        const ev = this.alphaBeta(chess, depth - 1, alpha, beta, true, evalFunc).score;
        chess.undo();

        if (ev < minEval) {
          minEval = ev;
          bestMove = m.san;
        }
        beta = Math.min(beta, ev);
        if (beta <= alpha) {
          this.transTable.set(fen, { depth, score: minEval, flag: 'ALPHA', bestMove });
          break;
        }
      }
      this.transTable.set(fen, { depth, score: minEval, flag: 'EXACT', bestMove });
      return { score: minEval, move: bestMove };
    }
  }

  // Quiescence search limits horizon effect
  private quiesce(chess: Chess, alpha: number, beta: number, isMaximizing: boolean, evalFunc: (c: Chess) => number): number {
    this.nodes++;
    const standPat = evalFunc(chess);

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      if (alpha < standPat) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (beta > standPat) beta = standPat;
    }

    const rawMoves = chess.moves({ verbose: true });
    const captures = rawMoves.filter(m => m.captured);
    
    // Sort captures by MVV-LVA logic internally inside Quiescence
    captures.sort((a, b) => {
      const pVals: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
      const valA = (pVals[a.captured!] || 0) - (pVals[a.piece] || 0);
      const valB = (pVals[b.captured!] || 0) - (pVals[b.piece] || 0);
      return valB - valA;
    });

    if (isMaximizing) {
      for (const m of captures) {
        chess.move(m.san);
        const ev = this.quiesce(chess, alpha, beta, false, evalFunc);
        chess.undo();

        if (ev >= beta) return beta;
        if (ev > alpha) alpha = ev;
      }
      return alpha;
    } else {
      for (const m of captures) {
        chess.move(m.san);
        const ev = this.quiesce(chess, alpha, beta, true, evalFunc);
        chess.undo();

        if (ev <= alpha) return alpha;
        if (ev < beta) beta = ev;
      }
      return beta;
    }
  }

  // Define other fallback stubs to maintain interface compatibility
  public searchLEEZAMCTS(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "LEEZAMCTS"); }
  public searchStockfishNNUE(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "StockfishNNUE"); }
  public searchKomodoDragonMCTS(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "KomodoDragonMCTS"); }
  public searchPatriciaNeural(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "PatriciaNeural"); }
  public searchNovaChess(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "NovaChess"); }
  public searchLc0Neural(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "Lc0Neural"); }
  public searchTorchHybrid(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "TorchHybrid"); }
  public searchPantheonFusion(chess: Chess, trainingProgress: number) { return this.searchDeepThemed(chess, trainingProgress, this.config.maxDepth || 3, 200000, 3000, (c) => evalFuncNNUEFallback(c), "PantheonFusion"); }
}

import { evaluateNNUE } from './evaluation';
function evalFuncNNUEFallback(chess: Chess): number {
  return evaluateNNUE(chess);
}
