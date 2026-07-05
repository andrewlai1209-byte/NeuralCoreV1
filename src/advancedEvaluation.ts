/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chess } from 'chess.js';

/**
 * FIXED: Advanced Evaluation Techniques - Phase 3 (All Bugs Fixed)
 * Phase 3: Phase-Aware Evaluation, Pawn Structure, Open Files, Outposts
 */

/**
 * Game Phase Detection
 * Categorizes the position as Opening, Middlegame, or Endgame
 */
export class GamePhase {
  static readonly OPENING_THRESHOLD = 39;  // Starting position = 39 material
  static readonly MIDDLEGAME_THRESHOLD = 15; // Mid-endgame boundary
  static readonly ENDGAME_THRESHOLD = 5;
  
  /**
   * Calculate total material on board (excluding kings)
   */
  static calculateMaterialCount(board: any[][]): number {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let total = 0;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          total += values[piece.type] || 0;
        }
      }
    }
    return total;
  }
  
  /**
   * Determine game phase
   */
  static getPhase(materialCount: number): 'opening' | 'middlegame' | 'endgame' {
    if (materialCount >= this.OPENING_THRESHOLD) {
      return 'opening';
    } else if (materialCount >= this.MIDDLEGAME_THRESHOLD) {
      return 'middlegame';
    } else {
      return 'endgame';
    }
  }
}

/**
 * Pawn Structure Evaluation (FIXED: Prevent double-penalizing)
 */
export class PawnStructure {
  private board: any[][];
  
  constructor(board: any[][]) {
    this.board = board;
  }
  
  evaluateStructure(): number {
    let score = 0;
    
    const whitePawnsInFile = new Array(8).fill(0);
    const blackPawnsInFile = new Array(8).fill(0);
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.type === 'p') {
          if (piece.color === 'w') {
            whitePawnsInFile[c]++;
          } else {
            blackPawnsInFile[c]++;
          }
        }
      }
    }
    
    // Doubled pawns penalty
    for (let c = 0; c < 8; c++) {
      if (whitePawnsInFile[c] > 1) {
        score -= 15 * (whitePawnsInFile[c] - 1);
      }
      if (blackPawnsInFile[c] > 1) {
        score += 15 * (blackPawnsInFile[c] - 1);
      }
    }
    
    // Isolated pawns penalty
    for (let c = 0; c < 8; c++) {
      const whiteAdjacent = (c > 0 && whitePawnsInFile[c - 1] > 0) || 
                            (c < 7 && whitePawnsInFile[c + 1] > 0);
      const blackAdjacent = (c > 0 && blackPawnsInFile[c - 1] > 0) || 
                            (c < 7 && blackPawnsInFile[c + 1] > 0);
      
      if (whitePawnsInFile[c] > 0 && !whiteAdjacent) {
        score -= 10 * whitePawnsInFile[c];
      }
      if (blackPawnsInFile[c] > 0 && !blackAdjacent) {
        score += 10 * blackPawnsInFile[c];
      }
    }
    
    return score;
  }
}

/**
 * Open File Evaluation
 */
export class OpenFileEvaluation {
  private board: any[][];
  
  constructor(board: any[][]) {
    this.board = board;
  }
  
  evaluateOpenFiles(): number {
    let score = 0;
    
    const whitePawnsInFile = new Array(8).fill(0);
    const blackPawnsInFile = new Array(8).fill(0);
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.type === 'p') {
          if (piece.color === 'w') {
            whitePawnsInFile[c]++;
          } else {
            blackPawnsInFile[c]++;
          }
        }
      }
    }
    
    // Evaluate rooks and queens on open files
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && (piece.type === 'r' || piece.type === 'q')) {
          const isWhite = piece.color === 'w';
          const friendlyPawns = isWhite ? whitePawnsInFile[c] : blackPawnsInFile[c];
          const enemyPawns = isWhite ? blackPawnsInFile[c] : whitePawnsInFile[c];
          
          if (friendlyPawns === 0 && enemyPawns === 0) {
            score += isWhite ? 35 : -35;
            if (piece.type === 'q') score += isWhite ? 20 : -20;
          } else if (friendlyPawns === 0) {
            score += isWhite ? 20 : -20;
            if (piece.type === 'q') score += isWhite ? 10 : -10;
          }
        }
      }
    }
    
    return score;
  }
}

/**
 * Knight Outpost Evaluation (FIXED: Correct rank detection for Black)
 * BUG FIX: Black outposts now correctly checked on ranks 3-4 (inverted)
 */
export class OutpostEvaluation {
  private board: any[][];
  
  constructor(board: any[][]) {
    this.board = board;
  }
  
  evaluateOutposts(): number {
    let score = 0;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.type === 'n') {
          const bonus = this.getOutpostBonus(piece.color, r, c);
          score += piece.color === 'w' ? bonus : -bonus;
        }
      }
    }
    
    return score;
  }
  
  /**
   * Calculate outpost bonus (FIXED)
   * White: ranks 5-6 (r=2-3 in 0-indexed)
   * Black: ranks 3-4 (r=4-5 in 0-indexed, from Black's POV)
   */
  private getOutpostBonus(color: 'w' | 'b', r: number, c: number): number {
    const isWhite = color === 'w';
    
    // FIXED: Correct rank detection
    const isOutpostRank = isWhite ? (r >= 2 && r <= 3) : (r >= 4 && r <= 5);
    const isCentralFile = c >= 2 && c <= 5;
    
    if (!isOutpostRank || !isCentralFile) return 0;
    
    // Check if protected by a pawn
    let isProtected = false;
    if (isWhite) {
      // White knight protected by pawn on (r+1, c-1) or (r+1, c+1)
      if (c > 0 && this.board[r + 1]?.[c - 1]?.type === 'p' && 
          this.board[r + 1][c - 1].color === 'w') isProtected = true;
      if (c < 7 && this.board[r + 1]?.[c + 1]?.type === 'p' && 
          this.board[r + 1][c + 1].color === 'w') isProtected = true;
    } else {
      // Black knight protected by pawn on (r-1, c-1) or (r-1, c+1)
      if (c > 0 && this.board[r - 1]?.[c - 1]?.type === 'p' && 
          this.board[r - 1][c - 1].color === 'b') isProtected = true;
      if (c < 7 && this.board[r - 1]?.[c + 1]?.type === 'p' && 
          this.board[r - 1][c + 1].color === 'b') isProtected = true;
    }
    
    return isProtected ? 50 : 15;
  }
}

/**
 * Passed Pawn Evaluation (FIXED: Correct advancement calculation)
 * BUG FIX: advancement calculation now consistent for both colors
 */
export class PassedPawnEvaluation {
  private board: any[][];
  
  constructor(board: any[][]) {
    this.board = board;
  }
  
  evaluatePassedPawns(): number {
    let score = 0;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.type === 'p') {
          if (this.isPassed(piece.color, r, c)) {
            // FIXED: Consistent advancement calculation
            // White pawn: r=0 (rank 8) -> advancement=7, r=6 (rank 2) -> advancement=1
            // Black pawn: r=0 (rank 8) -> advancement=1, r=7 (rank 1) -> advancement=7
            const advancement = piece.color === 'w' ? (7 - r) : r;
            const bonus = 5 * advancement * advancement;
            score += piece.color === 'w' ? bonus : -bonus;
          }
        }
      }
    }
    
    return score;
  }
  
  /**
   * Determine if a pawn is passed
   */
  private isPassed(color: 'w' | 'b', r: number, c: number): boolean {
    const isWhite = color === 'w';
    
    if (isWhite) {
      // Check ranks above (lower rank numbers)
      for (let checkR = r - 1; checkR >= 0; checkR--) {
        for (let checkC = Math.max(0, c - 1); checkC <= Math.min(7, c + 1); checkC++) {
          if (this.board[checkR]?.[checkC]?.type === 'p' && 
              this.board[checkR][checkC].color === 'b') {
            return false;
          }
        }
      }
    } else {
      // Check ranks below (higher rank numbers)
      for (let checkR = r + 1; checkR < 8; checkR++) {
        for (let checkC = Math.max(0, c - 1); checkC <= Math.min(7, c + 1); checkC++) {
          if (this.board[checkR]?.[checkC]?.type === 'p' && 
              this.board[checkR][checkC].color === 'w') {
            return false;
          }
        }
      }
    }
    
    return true;
  }
}

/**
 * Combined Advanced Evaluation (FIXED: All components integrated)
 */
export class AdvancedEvaluator {
  static evaluate(chess: Chess, phase: 'opening' | 'middlegame' | 'endgame'): number {
    const board = chess.board();
    let score = 0;
    
    // Phase-aware weights
    const phaseWeights = {
      opening: { pawn: 0.3, open: 0.5, outpost: 0.6, passed: 0.2 },
      middlegame: { pawn: 0.6, open: 0.7, outpost: 1.0, passed: 0.5 },
      endgame: { pawn: 0.8, open: 0.4, outpost: 0.5, passed: 2.0 }
    };
    
    const weights = phaseWeights[phase];
    
    score += new PawnStructure(board).evaluateStructure() * weights.pawn;
    score += new OpenFileEvaluation(board).evaluateOpenFiles() * weights.open;
    score += new OutpostEvaluation(board).evaluateOutposts() * weights.outpost;
    score += new PassedPawnEvaluation(board).evaluatePassedPawns() * weights.passed;
    
    return Math.round(score);
  }
}
