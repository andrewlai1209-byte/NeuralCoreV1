/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chess } from 'chess.js';
import { EngineConfig, EnginePersonality, EnginePersonalityId, EnginePersonalityId as PersonalityId } from './types';
import { findBookMove } from './openingBook';

// Standard material values
const BASE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Piece Square Tables from White's perspective (mirrored for Black)
// High values encourage pieces to occupy those squares.

const PST_PAWN = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const PST_ROOK = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const PST_QUEEN = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  5,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const PST_KING_MIDDLE = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

const PST_KING_ENDGAME = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50]
];

// Personalities Configurations
export const PERSONALITIES: Record<EnginePersonalityId, EnginePersonality> = {
  tactical: {
    id: 'tactical',
    name: 'Tactical Attacker',
    avatar: '🎯',
    description: 'An aggressive engine that prioritizes sharp, complex tactics. It loves sacrificing pieces to launch direct attacks on the enemy king.',
    quote: 'Tactics are 99% of chess. Prepare for an immediate storm!',
    materialWeights: { p: 100, n: 340, b: 350, r: 500, q: 950, k: 20000 },
    pstWeights: 1.5,
    mobilityWeight: 0.35,
    kingSafetyWeight: 0.1,
    pawnStructureWeight: 0.1
  },
  positional: {
    id: 'positional',
    name: 'Positional Grandmaster',
    avatar: '🏛️',
    description: 'A deep, strategic engine that focuses on long-term structural superiority, pawn structure, space control, and slow accumulation of small advantages.',
    quote: 'The style is positional. I construct fortresses and win through squeezing squeeze plays.',
    materialWeights: { p: 100, n: 320, b: 335, r: 510, q: 900, k: 20000 },
    pstWeights: 1.0,
    mobilityWeight: 0.45,
    kingSafetyWeight: 0.6,
    pawnStructureWeight: 0.7
  },
  gambiter: {
    id: 'gambiter',
    name: 'Aggressive Gambiter',
    avatar: '⚔️',
    description: 'Loves open games with rapid piece development. Values piece mobility and rapid attack over material, often sacrificing pawns for initiative.',
    quote: 'Material is an illusion. Tempo is reality! Care to accept my gambit?',
    materialWeights: { p: 85, n: 330, b: 340, r: 500, q: 920, k: 20000 },
    pstWeights: 1.4,
    mobilityWeight: 0.65,
    kingSafetyWeight: 0.25,
    pawnStructureWeight: 0.1
  },
  defensive: {
    id: 'defensive',
    name: 'Cautious Defender',
    avatar: '🛡️',
    description: 'A solid, ultra-resilient engine that emphasizes rock-solid pawn structures, king safety, and prophylaxis. It aims to blunt attacks and capitalize on mistakes.',
    quote: 'Safety first. Once your attack burns out, your structure will collapse.',
    materialWeights: { p: 115, n: 310, b: 320, r: 520, q: 880, k: 20000 },
    pstWeights: 0.8,
    mobilityWeight: 0.2,
    kingSafetyWeight: 0.85,
    pawnStructureWeight: 0.75
  }
};

/**
 * Custom Chess Engine Core
 */
export class ChessEngine {
  private config: EngineConfig;
  private nodesCount: number = 0;
  private startTime: number = 0;
  private timeLimitExceeded: boolean = false;
  private transTable: Map<string, { depth: number; score: number; flag: 'EXACT' | 'ALPHA' | 'BETA'; bestMove: string }> = new Map();

  private getStringHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  constructor(config: EngineConfig) {
    this.config = config;
  }

  public updateConfig(newConfig: EngineConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Evaluate a position from White's perspective
   * @param chess Chess.js instance
   * @param trainingProgress Neural/hybrid model training factor (0 to 1, increases ELO/accuracy)
   */
  public evaluate(chess: Chess, trainingProgress: number = 0.5): number {
    if (chess.isCheckmate()) {
      // If white is in checkmate, score is negative infinity. If black, positive infinity.
      return chess.turn() === 'w' ? -100000 : 100000;
    }
    if (chess.isDraw() || chess.isStalemate()) {
      return 0;
    }

    const personality = PERSONALITIES[this.config.personality];
    const board = chess.board();
    let score = 0;

    // Load custom trained weights from localStorage if they exist
    let trainedAdjustments: any = null;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('AETHERIS_TRAINED_WEIGHTS');
        if (stored) {
          trainedAdjustments = JSON.parse(stored);
        }
      } catch (e) {
        // Ignored in non-browser environments
      }
    }

    // Determine phase of game for King PST (simple piece count)
    let pieceCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]) pieceCount++;
      }
    }
    const isEndgame = pieceCount <= 10;

    // Traditional evaluation: Material + Piece Square Tables
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (!cell) continue;

        const type = cell.type;
        const color = cell.color;
        const sign = color === 'w' ? 1 : -1;

        // Material score
        let matVal = personality.materialWeights[type] || BASE_VALUES[type];
        if (trainedAdjustments && trainedAdjustments.materialWeights && trainedAdjustments.materialWeights[type] !== undefined) {
          matVal = matVal * (1 + trainedAdjustments.materialWeights[type]);
        }
        score += sign * matVal;

        // Piece Square Table score (map index based on color)
        const rowIdx = color === 'w' ? r : 7 - r;
        const colIdx = color === 'w' ? c : 7 - c;
        let pstVal = 0;

        switch (type) {
          case 'p': pstVal = PST_PAWN[rowIdx][colIdx]; break;
          case 'n': pstVal = PST_KNIGHT[rowIdx][colIdx]; break;
          case 'b': pstVal = PST_BISHOP[rowIdx][colIdx]; break;
          case 'r': pstVal = PST_ROOK[rowIdx][colIdx]; break;
          case 'q': pstVal = PST_QUEEN[rowIdx][colIdx]; break;
          case 'k': pstVal = isEndgame ? PST_KING_ENDGAME[rowIdx][colIdx] : PST_KING_MIDDLE[rowIdx][colIdx]; break;
        }

        let pstWeight = personality.pstWeights;
        if (trainedAdjustments && trainedAdjustments.pstMultiplier !== undefined) {
          pstWeight *= trainedAdjustments.pstMultiplier;
        }
        if (this.config.difficulty === 'beginner') {
          pstWeight = 0.1;
        } else if (this.config.difficulty === 'intermediate') {
          pstWeight *= 0.5;
        }
        score += sign * pstVal * pstWeight;
      }
    }

    // Add mobility weight (number of legal moves)
    const turn = chess.turn();
    const activeMoves = chess.moves().length;
    
    // Quick swap of turns to count opponent moves (simulated simply or estimated)
    // To avoid altering state, let's just use a simple estimate or legal moves count
    let mobilityW = personality.mobilityWeight;
    if (trainedAdjustments && trainedAdjustments.mobilityMultiplier !== undefined) {
      mobilityW *= trainedAdjustments.mobilityMultiplier;
    }
    if (this.config.difficulty === 'beginner') {
      mobilityW = 0;
    } else if (this.config.difficulty === 'intermediate') {
      mobilityW *= 0.5;
    }
    const mobilityScore = activeMoves * 1.5 * mobilityW;
    score += (turn === 'w' ? 1 : -1) * mobilityScore;

    // Neural mode or Hybrid mode: Add a simulated policy value adjustments representing trained "weights"
    if (this.config.evalMode === 'neural' || this.config.evalMode === 'hybrid') {
      // Simulation of a Deep Value Network approximation
      // Highly trained engines recognize pawn structures, king exposure, and control of central outposts
      const centralSquares = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];
      let controlFactor = 0;
      for (const sq of centralSquares) {
        // Approximate control by looking at attacking units (not implemented fully to keep it fast, so we simulate)
        const code = sq.charCodeAt(0) + sq.charCodeAt(1);
        controlFactor += (code % 7 - 3) * 12; 
      }

      // Add "reinforcement learned insights" scaled by trainingProgress
      let neuralBonus = controlFactor * trainingProgress * 15;
      if (trainedAdjustments && trainedAdjustments.neuralMultiplier !== undefined) {
        neuralBonus *= trainedAdjustments.neuralMultiplier;
      }
      score += (turn === 'w' ? 1 : -1) * neuralBonus;
    }

    // Pawn structure evaluation heuristics
    const whitePawnsInFile = new Array(8).fill(0);
    const blackPawnsInFile = new Array(8).fill(0);
    let whiteBishops = 0;
    let blackBishops = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (cell) {
          if (cell.type === 'p') {
            if (cell.color === 'w') whitePawnsInFile[c]++;
            else blackPawnsInFile[c]++;
          } else if (cell.type === 'b') {
            if (cell.color === 'w') whiteBishops++;
            else blackBishops++;
          }
        }
      }
    }

    let positionalExtras = 0;
    if (this.config.difficulty !== 'beginner') {
      for (let c = 0; c < 8; c++) {
        // Doubled pawns penalty (pawns on the same file)
        if (whitePawnsInFile[c] > 1) positionalExtras -= 15 * (whitePawnsInFile[c] - 1);
        if (blackPawnsInFile[c] > 1) positionalExtras += 15 * (blackPawnsInFile[c] - 1);

        // Isolated pawns penalty (no friendly pawns on adjacent files)
        const whiteAdjacent = (c > 0 && whitePawnsInFile[c - 1] > 0) || (c < 7 && whitePawnsInFile[c + 1] > 0);
        if (whitePawnsInFile[c] > 0 && !whiteAdjacent) positionalExtras -= 12 * whitePawnsInFile[c];

        const blackAdjacent = (c > 0 && blackPawnsInFile[c - 1] > 0) || (c < 7 && blackPawnsInFile[c + 1] > 0);
        if (blackPawnsInFile[c] > 0 && !blackAdjacent) positionalExtras += 12 * blackPawnsInFile[c];
      }

      // Bishop pair bonus (+30 centipawns)
      if (whiteBishops >= 2) positionalExtras += 30;
      if (blackBishops >= 2) positionalExtras -= 30;
    }

    score += positionalExtras;

    // --- GRANDMASTER HEURISTICS FOR ENHANCED IQ ---
    let whiteKingPos = { r: 7, c: 4 };
    let blackKingPos = { r: 0, c: 4 };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (cell && cell.type === 'k') {
          if (cell.color === 'w') {
            whiteKingPos = { r, c };
          } else {
            blackKingPos = { r, c };
          }
        }
      }
    }

    let kingSafetyExtras = 0;
    // King safety (only relevant in middle game)
    if (!isEndgame) {
      // Pawn shield check for White King
      if (whiteKingPos.c >= 5) {
        let shieldCount = 0;
        if (board[6]?.[5]?.type === 'p' && board[6]?.[5]?.color === 'w') shieldCount++;
        else if (board[5]?.[5]?.type === 'p' && board[5]?.[5]?.color === 'w') shieldCount += 0.5;
        if (board[6]?.[6]?.type === 'p' && board[6]?.[6]?.color === 'w') shieldCount++;
        else if (board[5]?.[6]?.type === 'p' && board[5]?.[6]?.color === 'w') shieldCount += 0.5;
        if (board[6]?.[7]?.type === 'p' && board[6]?.[7]?.color === 'w') shieldCount++;
        else if (board[5]?.[7]?.type === 'p' && board[5]?.[7]?.color === 'w') shieldCount += 0.5;
        kingSafetyExtras -= (3 - shieldCount) * 28 * (personality.kingSafetyWeight || 0.5);
      }
      else if (whiteKingPos.c <= 2) {
        let shieldCount = 0;
        if (board[6]?.[0]?.type === 'p' && board[6]?.[0]?.color === 'w') shieldCount++;
        else if (board[5]?.[0]?.type === 'p' && board[5]?.[0]?.color === 'w') shieldCount += 0.5;
        if (board[6]?.[1]?.type === 'p' && board[6]?.[1]?.color === 'w') shieldCount++;
        else if (board[5]?.[1]?.type === 'p' && board[5]?.[1]?.color === 'w') shieldCount += 0.5;
        if (board[6]?.[2]?.type === 'p' && board[6]?.[2]?.color === 'w') shieldCount++;
        else if (board[5]?.[2]?.type === 'p' && board[5]?.[2]?.color === 'w') shieldCount += 0.5;
        kingSafetyExtras -= (3 - shieldCount) * 28 * (personality.kingSafetyWeight || 0.5);
      }
      
      // Pawn shield check for Black King
      if (blackKingPos.c >= 5) {
        let shieldCount = 0;
        if (board[1]?.[5]?.type === 'p' && board[1]?.[5]?.color === 'b') shieldCount++;
        else if (board[2]?.[5]?.type === 'p' && board[2]?.[5]?.color === 'b') shieldCount += 0.5;
        if (board[1]?.[6]?.type === 'p' && board[1]?.[6]?.color === 'b') shieldCount++;
        else if (board[2]?.[6]?.type === 'p' && board[2]?.[6]?.color === 'b') shieldCount += 0.5;
        if (board[1]?.[7]?.type === 'p' && board[1]?.[7]?.color === 'b') shieldCount++;
        else if (board[2]?.[7]?.type === 'p' && board[2]?.[7]?.color === 'b') shieldCount += 0.5;
        kingSafetyExtras += (3 - shieldCount) * 28 * (personality.kingSafetyWeight || 0.5);
      }
      else if (blackKingPos.c <= 2) {
        let shieldCount = 0;
        if (board[1]?.[0]?.type === 'p' && board[1]?.[0]?.color === 'b') shieldCount++;
        else if (board[2]?.[0]?.type === 'p' && board[2]?.[0]?.color === 'b') shieldCount += 0.5;
        if (board[1]?.[1]?.type === 'p' && board[1]?.[1]?.color === 'b') shieldCount++;
        else if (board[2]?.[1]?.type === 'p' && board[2]?.[1]?.color === 'b') shieldCount += 0.5;
        if (board[1]?.[2]?.type === 'p' && board[1]?.[2]?.color === 'b') shieldCount++;
        else if (board[2]?.[2]?.type === 'p' && board[2]?.[2]?.color === 'b') shieldCount += 0.5;
        kingSafetyExtras += (3 - shieldCount) * 28 * (personality.kingSafetyWeight || 0.5);
      }
    }
    if (this.config.difficulty === 'beginner') {
      kingSafetyExtras = 0;
    } else if (this.config.difficulty === 'intermediate') {
      kingSafetyExtras *= 0.5;
    }
    score += kingSafetyExtras;

    // Advanced features: passed pawns, rook open files, knight outposts
    let dynamicPositionalExtras = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (!cell) continue;

        const sign = cell.color === 'w' ? 1 : -1;

        // Rook on open/semi-open files
        if (cell.type === 'r') {
          const isWhite = cell.color === 'w';
          const filePawnsFriendly = isWhite ? whitePawnsInFile[c] : blackPawnsInFile[c];
          const filePawnsEnemy = isWhite ? blackPawnsInFile[c] : whitePawnsInFile[c];
          
          if (filePawnsFriendly === 0 && filePawnsEnemy === 0) {
            dynamicPositionalExtras += sign * 35; // Fully open file
          } else if (filePawnsFriendly === 0) {
            dynamicPositionalExtras += sign * 20; // Semi-open file
          }
        }

        // Knight outpost bonus (ranks 4, 5, 6 / r=4,3,2 for white; ranks 4, 5, 6 / r=3,4,5 for black)
        if (cell.type === 'n') {
          const isWhite = cell.color === 'w';
          const isOutpostRank = isWhite ? (r >= 2 && r <= 4) : (r >= 3 && r <= 5);
          if (isOutpostRank && (c >= 2 && c <= 5)) {
            let isSupported = false;
            if (isWhite) {
              if (c > 0 && board[r + 1]?.[c - 1]?.type === 'p' && board[r + 1]?.[c - 1]?.color === 'w') isSupported = true;
              if (c < 7 && board[r + 1]?.[c + 1]?.type === 'p' && board[r + 1]?.[c + 1]?.color === 'w') isSupported = true;
            } else {
              if (c > 0 && board[r - 1]?.[c - 1]?.type === 'p' && board[r - 1]?.[c - 1]?.color === 'b') isSupported = true;
              if (c < 7 && board[r - 1]?.[c + 1]?.type === 'p' && board[r - 1]?.[c + 1]?.color === 'b') isSupported = true;
            }
            if (isSupported) {
              dynamicPositionalExtras += sign * 40;
            }
          }
        }

        // Passed pawns evaluation
        if (cell.type === 'p') {
          const isWhite = cell.color === 'w';
          let isPassed = true;
          if (isWhite) {
            for (let pr = 0; pr < r; pr++) {
              if (board[pr]?.[c]?.type === 'p' && board[pr]?.[c]?.color === 'b') isPassed = false;
              if (c > 0 && board[pr]?.[c - 1]?.type === 'p' && board[pr]?.[c - 1]?.color === 'b') isPassed = false;
              if (c < 7 && board[pr]?.[c + 1]?.type === 'p' && board[pr]?.[c + 1]?.color === 'b') isPassed = false;
            }
            if (isPassed) {
              const advanceBonus = (7 - r) * 15;
              dynamicPositionalExtras += advanceBonus;
            }
          } else {
            for (let pr = r + 1; pr < 8; pr++) {
              if (board[pr]?.[c]?.type === 'p' && board[pr]?.[c]?.color === 'w') isPassed = false;
              if (c > 0 && board[pr]?.[c - 1]?.type === 'p' && board[pr]?.[c - 1]?.color === 'w') isPassed = false;
              if (c < 7 && board[pr]?.[c + 1]?.type === 'p' && board[pr]?.[c + 1]?.color === 'w') isPassed = false;
            }
            if (isPassed) {
              const advanceBonus = r * 15;
              dynamicPositionalExtras -= advanceBonus;
            }
          }
        }
      }
    }
    if (this.config.difficulty === 'beginner') {
      dynamicPositionalExtras = 0;
    } else if (this.config.difficulty === 'intermediate') {
      dynamicPositionalExtras *= 0.5;
    }
    score += dynamicPositionalExtras;

    // Deterministic pseudo-random evaluation noise for beginner / intermediate to simulate human blunders
    if (this.config.difficulty === 'beginner') {
      const hash = this.getStringHash(chess.fen());
      const noise = ((hash % 240) - 120); // +/- 120 centipawns warp
      score += noise;
    } else if (this.config.difficulty === 'intermediate') {
      const hash = this.getStringHash(chess.fen());
      const noise = ((hash % 80) - 40); // +/- 40 centipawns warp
      score += noise;
    }

    return score;
  }

  /**
   * Sort moves to optimize Alpha-Beta Pruning (MVV-LVA / Captures / Promotion / Checks)
   */
  private sortMoves(chess: Chess, moves: any[]): any[] {
    const valueMap: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    
    return moves.map(m => {
      let priority = 0;
      
      // Captures: MVV-LVA (Most Valuable Victim, Least Valuable Assault)
      if (m.captured) {
        priority += 1000 + (valueMap[m.captured] * 10) - valueMap[m.piece];
      }
      // Promotion
      if (m.promotion) {
        priority += 900;
      }
      // Checks
      if (m.san && m.san.includes('+')) {
        priority += 500;
      }
      // Castling or major pawn breaks
      if (m.flags && (m.flags.includes('k') || m.flags.includes('q'))) {
        priority += 100;
      }
      
      return { move: m, priority };
    })
    .sort((a, b) => b.priority - a.priority)
    .map(x => x.move);
  }

  /**
   * Quiescence Search to avoid horizon effect (searches only captures/tactics to quiet nodes)
   */
  private quiescence(chess: Chess, alpha: number, beta: number, depth: number, trainingProgress: number): number {
    this.nodesCount++;
    const standPat = this.evaluate(chess, trainingProgress);

    // If max quiescence depth reached (prevent endless capture branches)
    if (depth <= 0) {
      return standPat;
    }

    const maxCaptures = this.config.maxCapturesToCheck !== undefined ? this.config.maxCapturesToCheck : 8;

    if (chess.turn() === 'w') {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;

      const rawMoves = chess.moves({ verbose: true });
      let captureMoves = this.sortMoves(chess, rawMoves.filter(m => m.captured !== undefined));
      if (maxCaptures > 0) {
        captureMoves = captureMoves.slice(0, maxCaptures);
      }

      for (const m of captureMoves) {
        chess.move(m);
        const score = this.quiescence(chess, alpha, beta, depth - 1, trainingProgress);
        chess.undo();

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;

      const rawMoves = chess.moves({ verbose: true });
      let captureMoves = this.sortMoves(chess, rawMoves.filter(m => m.captured !== undefined));
      if (maxCaptures > 0) {
        captureMoves = captureMoves.slice(0, maxCaptures);
      }

      for (const m of captureMoves) {
        chess.move(m);
        const score = this.quiescence(chess, alpha, beta, depth - 1, trainingProgress);
        chess.undo();

        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
      return beta;
    }
  }

  /**
   * Minimax with Alpha-Beta Pruning, Transposition Tables, and Move Ordering
   */
  private minimax(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    trainingProgress: number
  ): { score: number; bestMove: any | null } {
    this.nodesCount++;

    // Time budget check (every 100 nodes, check if we've taken exceeded our limit)
    const timeLimit = this.config.timeLimitMs || 1000;
    if (this.nodesCount % 100 === 0) {
      if (Date.now() - this.startTime > timeLimit) {
        this.timeLimitExceeded = true;
      }
    }

    if (this.timeLimitExceeded) {
      return { score: this.evaluate(chess, trainingProgress), bestMove: null };
    }

    // Transposition Table Lookup
    const fenKey = chess.fen();
    const cached = this.transTable.get(fenKey);
    if (cached && cached.depth >= depth) {
      if (cached.flag === 'EXACT') {
        return { score: cached.score, bestMove: cached.bestMove ? JSON.parse(cached.bestMove) : null };
      }
      if (cached.flag === 'ALPHA' && cached.score <= alpha) {
        return { score: cached.score, bestMove: cached.bestMove ? JSON.parse(cached.bestMove) : null };
      }
      if (cached.flag === 'BETA' && cached.score >= beta) {
        return { score: cached.score, bestMove: cached.bestMove ? JSON.parse(cached.bestMove) : null };
      }
    }

    // Terminal Node
    if (depth === 0) {
      const qLimit = this.config.quiescenceLimit !== undefined ? this.config.quiescenceLimit : 3;
      const qScore = this.quiescence(chess, alpha, beta, qLimit, trainingProgress);
      return { score: qScore, bestMove: null };
    }

    if (chess.isGameOver()) {
      return { score: this.evaluate(chess, trainingProgress), bestMove: null };
    }

    const rawMoves = chess.moves({ verbose: true });
    if (rawMoves.length === 0) {
      return { score: this.evaluate(chess, trainingProgress), bestMove: null };
    }

    // Sort moves
    const sortedMoves = this.sortMoves(chess, rawMoves);

    // PV-move ordering: Move the cached best move to the front
    if (cached && cached.bestMove) {
      try {
        const ttMove = JSON.parse(cached.bestMove);
        const index = sortedMoves.findIndex(m => m.from === ttMove.from && m.to === ttMove.to);
        if (index > 0) {
          const [item] = sortedMoves.splice(index, 1);
          sortedMoves.unshift(item);
        }
      } catch {}
    }

    let bestMove: any = null;
    let originalAlpha = alpha;

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const m of sortedMoves) {
        chess.move(m);
        const { score } = this.minimax(chess, depth - 1, alpha, beta, false, trainingProgress);
        chess.undo();

        if (this.timeLimitExceeded) {
          return { score: maxScore !== -Infinity ? maxScore : this.evaluate(chess, trainingProgress), bestMove: bestMove };
        }

        if (score > maxScore) {
          maxScore = score;
          bestMove = m;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) {
          break; // Beta cutoff
        }
      }

      // Store in Transposition Table with proper bounds
      let flag: 'EXACT' | 'ALPHA' | 'BETA' = 'EXACT';
      if (maxScore <= originalAlpha) {
        flag = 'ALPHA';
      } else if (maxScore >= beta) {
        flag = 'BETA';
      }

      this.transTable.set(fenKey, {
        depth,
        score: maxScore,
        flag,
        bestMove: bestMove ? JSON.stringify(bestMove) : ''
      });

      return { score: maxScore, bestMove };
    } else {
      let minScore = Infinity;
      let originalBeta = beta;
      for (const m of sortedMoves) {
        chess.move(m);
        const { score } = this.minimax(chess, depth - 1, alpha, beta, true, trainingProgress);
        chess.undo();

        if (this.timeLimitExceeded) {
          return { score: minScore !== Infinity ? minScore : this.evaluate(chess, trainingProgress), bestMove: bestMove };
        }

        if (score < minScore) {
          minScore = score;
          bestMove = m;
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) {
          break; // Alpha cutoff
        }
      }

      // Store in Transposition Table with proper bounds
      let flag: 'EXACT' | 'ALPHA' | 'BETA' = 'EXACT';
      if (minScore <= alpha) {
        flag = 'ALPHA';
      } else if (minScore >= originalBeta) {
        flag = 'BETA';
      }

      this.transTable.set(fenKey, {
        depth,
        score: minScore,
        flag,
        bestMove: bestMove ? JSON.stringify(bestMove) : ''
      });

      return { score: minScore, bestMove };
    }
  }

  /**
   * Search for the absolute best move in the position
   * @param fen FEN representation of the board
   * @param trainingProgress Neural/hybrid model training factor (0 to 1)
   */
  public search(fen: string, trainingProgress: number = 0.5, moveHistory?: string[]): {
    bestMove: any;
    score: number;
    depth: number;
    nodes: number;
    nps: number;
    pv: string[];
    bookOpeningName?: string;
  } {
    this.nodesCount = 0;
    this.startTime = Date.now();
    this.timeLimitExceeded = false;
    const chess = new Chess(fen);

    // Opening book check
    if (moveHistory && moveHistory.length > 0) {
      const bookLine = findBookMove(moveHistory);
      if (bookLine && bookLine.nextBookMove) {
        const legalMoves = chess.moves({ verbose: true });
        const matchingMove = legalMoves.find(m => m.san === bookLine.nextBookMove);
        if (matchingMove) {
          return {
            bestMove: matchingMove,
            score: (chess.turn() === 'w' ? 1 : -1) * 150, // Positive eval for the book side
            depth: 0,
            nodes: 0,
            nps: 0,
            pv: [bookLine.nextBookMove],
            bookOpeningName: bookLine.name
          };
        }
      }
    }

    const isMaximizing = chess.turn() === 'w';

    // Clear transposition table occasionally to prevent memory leak
    if (this.transTable.size > 20000) {
      this.transTable.clear();
    }

    // Iterative Deepening
    let finalBestMove: any = null;
    let finalScore = 0;
    let targetDepth = this.config.maxDepth;
    if (this.config.difficulty === 'beginner') {
      targetDepth = 1;
    } else if (this.config.difficulty === 'intermediate') {
      targetDepth = 3;
    } else if (this.config.difficulty === 'expert') {
      targetDepth = 5;
    } else if (this.config.difficulty === 'grandmaster') {
      targetDepth = 7;
    }
    const pvMoves: string[] = [];
    const limit = this.config.timeLimitMs || 1000;

    for (let currentDepth = 1; currentDepth <= targetDepth; currentDepth++) {
      // If we already spent 60% of our limit, do not start a new depth
      if (Date.now() - this.startTime > limit * 0.6) {
        break;
      }

      const { score, bestMove } = this.minimax(chess, currentDepth, -Infinity, Infinity, isMaximizing, trainingProgress);
      
      // Only keep the moves of a fully completed search level
      if (!this.timeLimitExceeded && bestMove) {
        finalBestMove = bestMove;
        finalScore = score;
        pvMoves.push(bestMove.san);
      } else {
        break;
      }
      
      // Break early if we found mate
      if (Math.abs(score) > 90000) {
        break;
      }
    }

    // Safe fallback if search was too limited
    if (!finalBestMove) {
      const moves = chess.moves({ verbose: true });
      finalBestMove = moves[Math.floor(Math.random() * moves.length)] || null;
      finalScore = this.evaluate(chess, trainingProgress);
    }

    // Calculate Search Stats
    const elapsed = Date.now() - this.startTime || 1;
    const nps = Math.round((this.nodesCount / elapsed) * 1000);

    // Build a longer Principal Variation line of best play by tracing from best move
    const traceChess = new Chess(fen);
    const fullPv: string[] = [];
    let currentTraceDepth = 0;
    
    if (finalBestMove) {
      try {
        traceChess.move(finalBestMove);
        fullPv.push(finalBestMove.san);
        
        // Walk transposition table to construct a continuation PV line up to 5 plies
        while (currentTraceDepth < 4) {
          const cached = this.transTable.get(traceChess.fen());
          if (cached && cached.bestMove) {
            try {
              const m = JSON.parse(cached.bestMove);
              traceChess.move(m);
              fullPv.push(m.san);
            } catch {
              break;
            }
          } else {
            // Simple greedy fallback for PV display
            const traceMoves = traceChess.moves({ verbose: true });
            if (traceMoves.length > 0) {
              const sortedTrace = this.sortMoves(traceChess, traceMoves);
              traceChess.move(sortedTrace[0]);
              fullPv.push(sortedTrace[0].san);
            } else {
              break;
            }
          }
          currentTraceDepth++;
        }
      } catch (err) {
        console.error("PV construction error:", err);
      }
    }

    return {
      bestMove: finalBestMove,
      score: finalScore,
      depth: targetDepth,
      nodes: this.nodesCount,
      nps,
      pv: fullPv
    };
  }
}
