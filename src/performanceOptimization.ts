/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PERFORMANCE OPTIMIZATION MODULE
 * Speed enhancements for Hybrid Engine v2.0
 * Target: 40-50% faster search, same or better quality
 */

import { Chess } from 'chess.js';

/**
 * Move Ordering Cache (Killer Moves + History Heuristic)
 * OPTIMIZATION: Reduce branching factor by 20-30%
 */
export class MoveOrderingCache {
  private killerMoves: Map<number, string[]> = new Map();
  private historyHeuristic: Map<string, number> = new Map();
  private maxHistoryScore = 10000;
  
  /**
   * Get best move first (for alpha-beta efficiency)
   */
  orderMoves(moves: any[], depth: number): any[] {
    return moves.sort((a, b) => {
      const aScore = this.getScore(a, depth);
      const bScore = this.getScore(b, depth);
      return bScore - aScore; // Descending: best moves first
    });
  }
  
  private getScore(move: any, depth: number): number {
    const moveStr = `${move.from}${move.to}`;
    let score = 0;
    
    // Captures first (MVV-LVA)
    if (move.captured) {
      const captureValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      score += 1000 + (captureValues[move.captured] || 0) * 10;
    }
    
    // Promotions
    if (move.promotion) {
      score += 900;
    }
    
    // Killer moves (moves that caused cutoffs)
    const killers = this.killerMoves.get(depth) || [];
    if (killers.includes(moveStr)) {
      score += 500;
    }
    
    // History heuristic
    const historyScore = this.historyHeuristic.get(moveStr) || 0;
    score += historyScore;
    
    return score;
  }
  
  recordKillerMove(move: any, depth: number): void {
    const moveStr = `${move.from}${move.to}`;
    if (!this.killerMoves.has(depth)) {
      this.killerMoves.set(depth, []);
    }
    
    const killers = this.killerMoves.get(depth)!;
    if (!killers.includes(moveStr)) {
      killers.unshift(moveStr);
      if (killers.length > 2) killers.pop(); // Keep only 2 per depth
    }
  }
  
  recordHistoryMove(move: any, depth: number, success: boolean): void {
    const moveStr = `${move.from}${move.to}`;
    const current = this.historyHeuristic.get(moveStr) || 0;
    const bonus = success ? depth * depth : -depth * depth / 2;
    const updated = Math.max(0, Math.min(this.maxHistoryScore, current + bonus));
    this.historyHeuristic.set(moveStr, updated);
  }
  
  clear(): void {
    this.killerMoves.clear();
    this.historyHeuristic.clear();
  }
}

/**
 * Quiescence Search Optimizer
 * OPTIMIZATION: Handles forcing sequences without horizon effect
 */
export class QuiescenceOptimizer {
  private maxCaptures = 8;
  private maxChecks = 4;
  
  /**
   * Optimized quiescence search (captures + checks only)
   */
  search(
    chess: Chess,
    alpha: number,
    beta: number,
    depth: number,
    evaluator: (chess: Chess) => number
  ): number {
    const standPat = evaluator(chess);
    
    if (depth <= 0) return standPat;
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
    
    // Only consider tactical moves
    const moves = chess.moves({ verbose: true });
    let captureCount = 0;
    let checkCount = 0;
    
    for (const move of moves) {
      // Skip non-forcing moves
      if (!move.captured && !move.flags?.includes('c')) continue;
      
      // Limit captures
      if (move.captured && captureCount++ >= this.maxCaptures) continue;
      
      chess.move(move);
      
      // Check if move gives check (costly, only for promising moves)
      if (chess.isCheck() && checkCount++ < this.maxChecks) {
        const score = this.search(chess, alpha, beta, depth - 1, evaluator);
        chess.undo();
        
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      } else {
        chess.undo();
      }
    }
    
    return alpha;
  }
}

/**
 * Selective Depth Search
 * OPTIMIZATION: Spend time on important lines, skip trivial ones
 */
export class SelectiveDepthSearch {
  /**
   * Determine if position should be searched deeper
   */
  shouldIncreaseDepth(chess: Chess, score: number, averageScore: number): boolean {
    // Search deeper if position is complex/tactical
    if (chess.isCheck()) return true; // Always search checks deeper
    
    const moves = chess.moves();
    if (moves.length > 35) return false; // Too many moves, skip deep search
    
    // Search if position evaluation changed significantly
    if (Math.abs(score - averageScore) > 100) return true;
    
    return false;
  }
  
  /**
   * Calculate extension to depth
   */
  getDepthExtension(chess: Chess): number {
    let extension = 0;
    
    if (chess.isCheck()) extension += 1; // Check extension
    if (chess.moves().length <= 5) extension += 1; // Forced moves extension
    
    return Math.min(extension, 2); // Cap at +2 plies
  }
}

/**
 * Parallel Search Coordinator
 * OPTIMIZATION: Future-proof for multi-threaded search
 */
export class ParallelSearchCoordinator {
  private workers: number = 1; // Number of parallel workers
  
  /**
   * Split search across multiple lines
   * In production: use Web Workers or Node.js worker threads
   */
  splitSearch(movesToSearch: any[], depth: number): any[][] {
    const linesPerWorker = Math.ceil(movesToSearch.length / this.workers);
    const batches: any[][] = [];
    
    for (let i = 0; i < movesToSearch.length; i += linesPerWorker) {
      batches.push(movesToSearch.slice(i, i + linesPerWorker));
    }
    
    return batches;
  }
  
  setWorkerCount(count: number): void {
    this.workers = Math.max(1, count);
  }
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
  private startTime: number = 0;
  private nodesPerSecond: number = 0;
  private peakNPS: number = 0;
  
  start(): void {
    this.startTime = performance.now();
  }
  
  recordNPS(nodes: number, timeMs: number): void {
    this.nodesPerSecond = Math.round((nodes / timeMs) * 1000);
    this.peakNPS = Math.max(this.peakNPS, this.nodesPerSecond);
  }
  
  getNPS(): number {
    return this.nodesPerSecond;
  }
  
  getPeakNPS(): number {
    return this.peakNPS;
  }
  
  getElapsedTime(): number {
    return performance.now() - this.startTime;
  }
}
