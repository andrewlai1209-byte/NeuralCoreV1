/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chess } from 'chess.js';

/**
 * Advanced Evaluation Techniques
 * Phase 3: Phase-Aware Evaluation, Pawn Structure, Open Files, Outposts
 */

/**
 * Game Phase Detection
 * Categorizes the position as Opening, Middlegame, or Endgame
 * Based on piece count and type
 */
export class GamePhase {
  static readonly OPENING_THRESHOLD = 35;  // Material in 1/1000ths of a pawn
  static readonly MIDDLEGAME_THRESHOLD = 15;
  static readonly ENDGAME_THRESHOLD = 5;
  
  /**
   * Calculate total material on board (excluding kings)
   * Used to determine game phase
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
 * Pawn Structure Evaluation
 * Analyzes pawn configurations for structural weaknesses and strengths
 */
export class PawnStructure {
  private board: any[][];
  
  constructor(board: any[][]) {
    this.board = board;
  }
  
  /**
   * Evaluate pawn structure for both sides
   * Returns score from White's perspective
   */
  evaluateStructure(): number {
    let score = 0;
    
    // Count pawns per file for both sides
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
    
    // Evaluate doubled pawns (penalty: -15 cp each)
    for (let c = 0; c < 8; c++) {
      if (whitePawnsInFile[c] > 1) {
        score -= 15 * (whitePawnsInFile[c] - 1);
      }
      if (blackPawnsInFile[c] > 1) {
        score += 15 * (blackPawnsInFile[c] - 1);
      }
    }
    
    // Evaluate isolated pawns (penalty: -10 cp each)
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
    
    // Evaluate backward pawns (penalty: -5 cp each)
    score += this.evaluateBackwardPawns(whitePawnsInFile, blackPawnsInFile);
    
    return score;
  }
  
  /**
   * Evaluate backward pawns
   * A pawn that cannot advance because opponent controls its advance square
   */
  private evaluateBackwardPawns(wpFile: number[], bpFile: number[]): number {
    let score = 0;
    
    // Simplified: check if no supporting pawns
    for (let c = 0; c < 8; c++) {
      // White backward pawns
      if (wpFile[c] > 0) {
        const leftSupport = c > 0 && wpFile[c - 1] > 0;
        const rightSupport = c < 7 && wpFile[c + 1] > 0;
        if (!leftSupport && !rightSupport && c !== 0 && c !== 7) {
          score -= 5;
        }
      }
      
      // Black backward pawns
      if (bpFile[c] > 0) {
        const leftSupport = c > 0 && bpFile[c - 1] > 0;
        const rightSupport = c < 7 && bpFile[c + 1] > 0;
        if (!leftSupport && !rightSupport && c !== 0 && c !== 7) {
          score += 5;
        }
      }
    }
    
    return score;
  }
}

/**
 * Open File Evaluation
 * Rooks and queens are powerful on open and semi-open files
 */
export class OpenFileEvaluation {
  private board: any[][];
  
  constructor(board: any[][]) {
    this.board = board;
  }
  
  /**
   * Evaluate pieces on open/semi-open files
   */
  evaluateOpenFiles(): number {
    let score = 0;
    
    // Count pawns per file
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
            // Fully open file: bonus of 35 cp (doubled for queen)
            score += isWhite ? 35 : -35;
            if (piece.type === 'q') score += isWhite ? 20 : -20;
          } else if (friendlyPawns === 0) {
            // Semi-open file: bonus of 20 cp
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
 * Knight Outpost Evaluation
 * Knights are extremely powerful on protected outposts deep in enemy territory
 */
export class OutpostEvaluation {
  private board: any[][];
  
  constructor(board: any[][]) {
    this.board = board;
  }
  
  /**
   * Evaluate knights on outposts
   */
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
   * Calculate outpost bonus for a knight
   */
  private getOutpostBonus(color: 'w' | 'b', r: number, c: number): number {
    const isWhite = color === 'w';
    
    // White outposts are on ranks 5-6 (r=3-4)
    // Black outposts are on ranks 3-2 (r=4-5)
    const isOutpostRank = isWhite ? (r >= 3 && r <= 4) : (r >= 3 && r <= 4);
    const isCentralFile = c >= 2 && c <= 5;
    
    if (!isOutpostRank || !isCentralFile) return 0;
    
    // Check if protected by a pawn
    let isProtected = false;
    if (isWhite) {
      // Check for White pawn on (r+1, c-1) or (r+1, c+1)
      if (c > 0 && this.board[r + 1]?.[c - 1]?.type === 'p' && 
          this.board[r + 1][c - 1].color === 'w') isProtected = true;
      if (c < 7 && this.board[r + 1]?.[c + 1]?.type === 'p' && 
          this.board[r + 1][c + 1].color === 'w') isProtected = true;
    } else {
      // Check for Black pawn on (r-1, c-1) or (r-1, c+1)
      if (c > 0 && this.board[r - 1]?.[c - 1]?.type === 'p' && 
          this.board[r - 1][c - 1].color === 'b') isProtected = true;
      if (c < 7 && this.board[r - 1]?.[c + 1]?.type === 'p' && 
          this.board[r - 1][c + 1].color === 'b') isProtected = true;
    }
    
    // Bonus: 30-60 cp for protected outpost, 10-20 for unprotected
    return isProtected ? 50 : 15;
  }
}

/**
 * Passed Pawn Evaluation
 * Passed pawns have strategic value and are critical in endgames
 */
export class PassedPawnEvaluation {
  private board: any[][];
  
  constructor(board: any[][]) {
    this.board = board;
  }
  
  /**
   * Evaluate passed pawns
   */
  evaluatePassedPawns(): number {
    let score = 0;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.type === 'p') {
          if (this.isPassed(piece.color, r, c)) {
            const advancement = piece.color === 'w' ? (7 - r) : r;
            // More valuable as pawn advances (quadratic): 5 * (advancement ^ 2)
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
   * A pawn is passed if no enemy pawns can stop it
   */
  private isPassed(color: 'w' | 'b', r: number, c: number): boolean {
    const isWhite = color === 'w';
    
    if (isWhite) {
      // Check ranks above (lower rank numbers)
      for (let checkR = r - 1; checkR >= 0; checkR--) {
        // Check file c and adjacent files
        for (let checkC = Math.max(0, c - 1); checkC <= Math.min(7, c + 1); checkC++) {
          if (this.board[checkR][checkC]?.type === 'p' && 
              this.board[checkR][checkC].color === 'b') {
            return false;
          }
        }
      }
    } else {
      // Check ranks below (higher rank numbers)
      for (let checkR = r + 1; checkR < 8; checkR++) {
        for (let checkC = Math.max(0, c - 1); checkC <= Math.min(7, c + 1); checkC++) {
          if (this.board[checkR][checkC]?.type === 'p' && 
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
 * Combined Advanced Evaluation
 * Integrates all Phase 3 evaluation techniques
 */
export class AdvancedEvaluator {
  /**
   * Evaluate position using advanced techniques
   */
  static evaluate(chess: Chess, phase: 'opening' | 'middlegame' | 'endgame'): number {
    const board = chess.board();
    let score = 0;
    
    // Weight adjustments by phase
    const phaseWeights = {
      opening: { pawn: 0.3, open: 0.5, outpost: 0.6, passed: 0.2 },
      middlegame: { pawn: 0.6, open: 0.7, outpost: 1.0, passed: 0.5 },
      endgame: { pawn: 0.8, open: 0.4, outpost: 0.5, passed: 2.0 }
    };
    
    const weights = phaseWeights[phase];
    
    // Pawn structure evaluation
    const pawnScore = new PawnStructure(board).evaluateStructure();
    score += pawnScore * weights.pawn;
    
    // Open file evaluation
    const openFileScore = new OpenFileEvaluation(board).evaluateOpenFiles();
    score += openFileScore * weights.open;
    
    // Knight outpost evaluation
    const outpostScore = new OutpostEvaluation(board).evaluateOutposts();
    score += outpostScore * weights.outpost;
    
    // Passed pawn evaluation (critical in endgame)
    const passedScore = new PassedPawnEvaluation(board).evaluatePassedPawns();
    score += passedScore * weights.passed;
    
    return Math.round(score);
  }
}
